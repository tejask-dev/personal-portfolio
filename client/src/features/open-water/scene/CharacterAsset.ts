import {
  AnimationMixer,
  Bone,
  BufferGeometry,
  ExtrudeGeometry,
  Group,
  InstancedMesh,
  Material,
  Mesh,
  MeshStandardMaterial,
  Shape,
  Skeleton,
  SkinnedMesh,
  SphereGeometry,
  Texture,
  type Object3D,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { applySeaMedium, type SeaEnvironment } from "./materials";

export type DakotaPose =
  | "idle"
  | "greeting"
  | "escort"
  | "waiting"
  | "arrived"
  | "observing"
  | "hidden";
export type CharacterAsset = {
  group: Group;
  source: "rigged" | "fallback";
  update: (dt: number, pose: DakotaPose, quiet?: boolean) => void;
  dispose: () => void;
};
const ASSET = `${import.meta.env.BASE_URL}assets/open-water-v3/dakota.glb`;
const abortError = () =>
  new DOMException("Character loading canceled", "AbortError");

/** Owns only this hierarchy. Deduplicate shared materials, textures and skeletons. */
export function disposeCreature(root: Object3D) {
  const geometries = new Set<BufferGeometry>(),
    materials = new Set<Material>();
  const textures = new Set<Texture>(),
    skeletons = new Set<Skeleton>();
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    geometries.add(object.geometry);
    if (object instanceof InstancedMesh) object.dispose();
    if (object instanceof SkinnedMesh) skeletons.add(object.skeleton);
    for (const material of Array.isArray(object.material)
      ? object.material
      : [object.material]) {
      materials.add(material);
      for (const value of Object.values(material))
        if (value instanceof Texture) textures.add(value);
    }
  });
  skeletons.forEach((s) => s.dispose());
  geometries.forEach((g) => g.dispose());
  const images = new Set<{ close?: () => void }>();
  textures.forEach((t) => {
    if (t.image) images.add(t.image);
    t.dispose();
  });
  images.forEach((i) => i.close?.());
  materials.forEach((m) => m.dispose());
}

/** Preserve the exported skin, hierarchy, inverse bind matrices and full loop. */
export async function loadCharacterAsset(
  environment: SeaEnvironment,
  signal?: AbortSignal,
): Promise<CharacterAsset> {
  if (signal?.aborted) throw abortError();
  const response = await fetch(ASSET, { signal });
  if (!response.ok) throw new Error(`Dakota asset returned ${response.status}`);
  const bytes = await response.arrayBuffer();
  if (signal?.aborted) throw abortError();
  const gltf = await new GLTFLoader().parseAsync(bytes, "");
  const root = gltf.scene;
  try {
    if (signal?.aborted) throw abortError();
    let skin: SkinnedMesh | undefined;
    const patched = new Set<Material>();
    root.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      if (object instanceof SkinnedMesh) {
        skin = object;
        object.frustumCulled = false;
      }
      for (const material of Array.isArray(object.material)
        ? object.material
        : [object.material]) {
        if (
          !(material instanceof MeshStandardMaterial) ||
          patched.has(material)
        )
          continue;
        applySeaMedium(material, environment);
        patched.add(material);
      }
    });
    const clip = gltf.animations.find((c) => c.name === "Swim");
    if (!skin || !clip || !Number.isFinite(clip.duration) || clip.duration <= 0)
      throw new Error("Dakota asset is missing its rig or complete swim clip");
    const mixer = new AnimationMixer(root),
      action = mixer.clipAction(clip).play();
    const head = root.getObjectByName("Dakota_Head") as Bone | undefined;
    const spine = root.getObjectByName("Dakota_Spine2") as Bone | undefined;
    const leftFin = root.getObjectByName("Dakota_TopFlipperL") as
      Bone | undefined;
    const rightFin = root.getObjectByName("Dakota_TopFlipperR") as
      Bone | undefined;
    let poseCurve = 0,
      finOpen = 0;
    const group = new Group();
    group.name = "Dakota-rigged-character";
    group.add(root);
    group.userData = { source: "rigged", license: "CC0-1.0", length: 3.35 };
    let disposed = false;
    return {
      group,
      source: "rigged",
      update(dt, pose, quiet = false) {
        if (disposed) return;
        group.visible = pose !== "hidden";
        const moving = pose === "escort",
          resting = pose === "waiting" || pose === "arrived";
        // Remove last frame's authored offsets before advancing the underlying swim.
        if (spine) spine.rotation.y -= poseCurve;
        if (leftFin) leftFin.rotation.z -= finOpen;
        if (rightFin) rightFin.rotation.z += finOpen;
        action.timeScale = moving ? 1.12 : resting ? 0.45 : 0.7;
        if (quiet) mixer.setTime(0);
        else if (dt > 0) mixer.update(Math.min(dt, 0.05));
        const blend = quiet ? 1 : 1 - Math.exp(-Math.max(0, dt) * 6);
        poseCurve +=
          ((pose === "waiting" ? 0.19 : pose === "greeting" ? 0.055 : 0) -
            poseCurve) *
          blend;
        finOpen +=
          ((pose === "waiting"
            ? 0.11
            : pose === "arrived"
              ? 0.06
              : pose === "escort"
                ? -0.035
                : 0) -
            finOpen) *
          blend;
        if (spine) spine.rotation.y += poseCurve;
        if (leftFin) leftFin.rotation.z += finOpen;
        if (rightFin) rightFin.rotation.z -= finOpen;
        group.rotation.x +=
          ((pose === "observing" ? 0.14 : 0) - group.rotation.x) * blend;
        if (head) {
          head.rotation.x +=
            ((pose === "observing" ? 0.14 : pose === "greeting" ? -0.04 : 0) -
              head.rotation.x) *
            blend;
          head.rotation.y +=
            ((pose === "greeting" || pose === "arrived" ? 0.07 : 0) -
              head.rotation.y) *
            blend;
        }
      },
      dispose() {
        if (disposed) return;
        disposed = true;
        mixer.stopAllAction();
        mixer.uncacheRoot(root);
        disposeCreature(group);
        group.clear();
      },
    };
  } catch (error) {
    disposeCreature(root);
    throw error;
  }
}

/** Merge only rigid siblings, leaving independently animated groups intact. */
function batchFallbackParts(parent: Group) {
  const batches = new Map<Material, Mesh[]>();
  for (const child of parent.children) {
    if (!(child instanceof Mesh) || Array.isArray(child.material)) continue;
    const meshes = batches.get(child.material) ?? [];
    meshes.push(child);
    batches.set(child.material, meshes);
  }
  for (const [material, meshes] of batches) {
    if (meshes.length < 2) continue;
    const indexed = meshes.every((mesh) => mesh.geometry.index !== null);
    const parts = meshes.map((mesh) => {
      mesh.updateMatrix();
      const copy =
        !indexed && mesh.geometry.index
          ? mesh.geometry.toNonIndexed()
          : mesh.geometry.clone();
      return copy.applyMatrix4(mesh.matrix);
    });
    let merged: BufferGeometry | null;
    try {
      merged = mergeGeometries(parts, false);
    } finally {
      parts.forEach((part) => part.dispose());
    }
    if (!merged) continue;
    merged.computeBoundingBox();
    merged.computeBoundingSphere();
    const batch = new Mesh(merged, material);
    batch.name = `${parent.name}-${material.name}-batch`;
    parent.add(batch);
    const originals = new Set<BufferGeometry>();
    for (const mesh of meshes) {
      parent.remove(mesh);
      originals.add(mesh.geometry);
    }
    // Materials can be shared with the tail. Their lifetime belongs to the
    // complete creature; only replaced source geometry is released here.
    originals.forEach((geometry) => geometry.dispose());
  }
}

/** An intentional smooth silhouette remains immediately usable if fetch/parse fails. */
export function createFallbackCharacter(
  environment: SeaEnvironment,
): CharacterAsset {
  const group = new Group();
  group.name = "Dakota-authored-fallback";
  const body = new Group();
  body.name = "Dakota-fallback-body";
  group.add(body);
  const skin = new MeshStandardMaterial({ color: "#769ba4", roughness: 0.53 });
  const pale = new MeshStandardMaterial({ color: "#d0dccf", roughness: 0.62 });
  const eyeMaterial = new MeshStandardMaterial({
    color: "#19343d",
    roughness: 0.35,
  });
  skin.name = "skin";
  pale.name = "belly";
  eyeMaterial.name = "eyes";
  [skin, pale, eyeMaterial].forEach((m) => applySeaMedium(m, environment));
  function ellipsoid(
    parent: Group,
    material: MeshStandardMaterial,
    scale: [number, number, number],
    position: [number, number, number],
  ) {
    // A 0.06-unit eye does not need the body's tessellation. Sixteen sides
    // preserve its round outline even in the close fallback encounter.
    const geometry =
      material === eyeMaterial
        ? new SphereGeometry(1, 16, 12)
        : new SphereGeometry(1, 24, 16);
    const mesh = new Mesh(geometry, material);
    mesh.scale.set(...scale);
    mesh.position.set(...position);
    parent.add(mesh);
    return mesh;
  }
  ellipsoid(body, skin, [0.34, 0.33, 1.05], [0, 0.02, 0.2]);
  ellipsoid(body, pale, [0.285, 0.13, 0.82], [0, -0.18, 0.32]);
  ellipsoid(body, skin, [0.12, 0.085, 0.36], [0, -0.1, 1.12]);
  const dorsalShape = new Shape();
  dorsalShape.moveTo(-0.28, 0);
  dorsalShape.quadraticCurveTo(-0.24, 0.24, -0.14, 0.44);
  dorsalShape.quadraticCurveTo(0.03, 0.36, 0.32, 0);
  dorsalShape.closePath();
  const dorsal = new Mesh(
    new ExtrudeGeometry(dorsalShape, {
      depth: 0.055,
      bevelEnabled: true,
      bevelSize: 0.03,
      bevelThickness: 0.02,
      bevelSegments: 2,
      steps: 1,
      curveSegments: 12,
    }),
    skin,
  );
  dorsal.rotation.y = Math.PI / 2;
  dorsal.position.set(-0.028, 0.25, -0.06);
  body.add(dorsal);
  for (const side of [-1, 1]) {
    const fin = ellipsoid(
      body,
      skin,
      [0.32, 0.042, 0.14],
      [side * 0.34, -0.19, 0.4],
    );
    fin.rotation.z = -side * 0.3;
    fin.rotation.y = side * 0.3;
    ellipsoid(
      body,
      eyeMaterial,
      [0.028, 0.033, 0.032],
      [side * 0.27, 0.08, 0.87],
    );
  }
  const tail = new Group();
  tail.name = "Dakota-fallback-tail";
  tail.position.z = -0.63;
  body.add(tail);
  ellipsoid(tail, skin, [0.13, 0.12, 0.52], [0, -0.01, -0.26]);
  for (const side of [-1, 1]) {
    const fluke = ellipsoid(
      tail,
      skin,
      [0.36, 0.04, 0.17],
      [side * 0.23, -0.01, -0.69],
    );
    fluke.rotation.y = side * -0.28;
  }
  batchFallbackParts(body);
  batchFallbackParts(tail);
  group.userData = { source: "fallback", title: "Dakota", length: 3.2 };
  let phase = 0,
    disposed = false;
  return {
    group,
    source: "fallback",
    update(dt, pose, quiet = false) {
      if (disposed) return;
      group.visible = pose !== "hidden";
      if (!quiet && dt > 0)
        phase += Math.min(dt, 0.05) * (pose === "escort" ? 4.5 : 2.6);
      tail.rotation.x = quiet ? 0 : Math.sin(phase) * 0.12;
      body.rotation.x = pose === "observing" ? 0.1 : 0;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      disposeCreature(group);
      group.clear();
    },
  };
}
