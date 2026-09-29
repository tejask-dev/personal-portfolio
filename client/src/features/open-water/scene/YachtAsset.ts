import {
  Box3,
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Material,
  Matrix4,
  Mesh,
  ShaderMaterial,
  Texture,
  Vector3,
  type Object3D,
} from "three";
import {
  GLTFLoader,
  type GLTF,
} from "three/examples/jsm/loaders/GLTFLoader.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  architectureMaterial,
  type SeaEnvironment,
  type SurfaceFinish,
} from "./materials";

const ASSET_URL = `${import.meta.env.BASE_URL}open-water/yacht.glb`;
const LENGTH = 21.6;
// Source-native Y-up coordinates: the keel/hull material boundary is at .45.
// This sinks the underwater hull and propellers while retaining the freeboard.
const WATERLINE = 0.45;

type Finish = {
  color: string;
  gloss: number;
  finish: SurfaceFinish;
  emission?: number;
};
const IVORY: Finish = { color: "#eeeede", gloss: 0.72, finish: 4 };
const CHROME: Finish = { color: "#c8d9dc", gloss: 0.86, finish: 3 };
const GLASS: Finish = { color: "#173c4f", gloss: 0.95, finish: 2 };
const TEAK: Finish = { color: "#b28a58", gloss: 0.18, finish: 1 };
// Names are stable source material slots, retained by the offline simplifier.
// See design/SOURCES.md and the distributed CC-BY attribution for provenance.
const FINISHES: Record<string, Finish> = {
  fiancate: IVORY,
  coperta1: { ...IVORY, color: "#f5efdc", gloss: 0.35 },
  blinn1: TEAK,
  lambert2: TEAK,
  blinn2: CHROME,
  blinn8: CHROME,
  phongE4: CHROME,
  phongE2: { color: "#f2eedb", gloss: 0.08, finish: 4 },
  blinn5: { color: "#244656", gloss: 0.55, finish: 4 },
  nero1: { color: "#112b36", gloss: 0.3, finish: 0 },
  chiglia1: { color: "#193944", gloss: 0.45, finish: 4 },
  lambert3: IVORY,
  blinn6: GLASS,
  blinn7: GLASS,
  blinn13: GLASS,
  blinn9: { color: "#90b9a1", gloss: 0.4, finish: 0, emission: 0.16 },
  blinn10: { color: "#c97962", gloss: 0.4, finish: 0, emission: 0.16 },
  blinn11: CHROME,
  blinn12: { ...IVORY, emission: 0.15 },
  lambert1: { color: "#1d3540", gloss: 0.45, finish: 0 },
};

function abortError() {
  return new DOMException("Yacht loading was cancelled", "AbortError");
}

/** Release shared GLB resources once, including texture image bitmaps. */
export function disposeYachtAsset(root: Object3D) {
  const geometries = new Set<BufferGeometry>();
  const materials = new Set<Material>();
  const textures = new Set<Texture>();
  const images = new Set<{ close?: () => void }>();
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material)
      ? object.material
      : [object.material]) {
      materials.add(material);
      for (const value of Object.values(material)) {
        if (value instanceof Texture) {
          textures.add(value);
          if (value.image) images.add(value.image);
        }
      }
    }
  });
  geometries.forEach((geometry) => geometry.dispose());
  textures.forEach((texture) => texture.dispose());
  images.forEach((image) => image.close?.());
  materials.forEach((material) => material.dispose());
}

function disposeSource(gltf: GLTF) {
  // Multiple glTF scenes may share geometries/materials. One traversal avoids
  // duplicate disposal, including scenes other than the default scene.
  const holder = new Group();
  for (const scene of new Set([gltf.scene, ...gltf.scenes])) holder.add(scene);
  disposeYachtAsset(holder);
  holder.clear();
}

function normalizedGeometry(source: BufferGeometry, matrix: Matrix4) {
  const geometry = new BufferGeometry();
  // Quantized attributes must be decoded before transforming. Applying a matrix
  // directly to normalized Uint16 positions would silently clamp the hull.
  for (const name of ["position", "normal"] as const) {
    const attribute = source.getAttribute(name);
    if (!attribute) continue;
    const values = new Float32Array(attribute.count * 3);
    for (let i = 0; i < attribute.count; i++) {
      values[i * 3] = attribute.getX(i);
      values[i * 3 + 1] = attribute.getY(i);
      values[i * 3 + 2] = attribute.getZ(i);
    }
    geometry.setAttribute(name, new Float32BufferAttribute(values, 3));
  }
  if (source.index) geometry.setIndex(source.index.clone());
  for (const group of source.groups)
    geometry.addGroup(group.start, group.count, group.materialIndex);
  geometry.applyMatrix4(matrix);
  if (!geometry.hasAttribute("normal")) geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function batchStaticMeshes(group: Group) {
  const batches = new Map<Material, Mesh[]>();
  for (const child of group.children) {
    // Multi-material meshes retain their original groups and draw behavior.
    if (!(child instanceof Mesh) || Array.isArray(child.material)) continue;
    const batch = batches.get(child.material) ?? [];
    batch.push(child);
    batches.set(child.material, batch);
  }
  for (const [material, meshes] of batches) {
    if (meshes.length < 2) continue;
    const indexed = meshes[0].geometry.index !== null;
    if (meshes.some((mesh) => (mesh.geometry.index !== null) !== indexed))
      continue;
    // Coordinates/normals are already baked, so concatenation preserves every
    // triangle and procedural material coordinate without a new transform.
    const geometry = mergeGeometries(
      meshes.map((mesh) => mesh.geometry),
      false,
    );
    if (!geometry) continue;
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    const merged = new Mesh(geometry, material);
    merged.name = `${material.name}-batch`;
    merged.userData.sourceMeshes = meshes.map((mesh) => mesh.name);
    group.add(merged);
    for (const mesh of meshes) {
      group.remove(mesh);
      mesh.geometry.dispose();
    }
  }
}

/**
 * Fetch the self-contained, optimized CC-BY yacht. The caller keeps its immediate
 * procedural yacht until this resolves; failures never remove that fallback.
 * Returned geometry is baked into an identity-scale, Y-up group with bow -Z and
 * its mean waterline at y=0. Own/dispose this group after attaching it.
 */
export async function loadYachtAsset(
  environment: SeaEnvironment,
  signal?: AbortSignal,
): Promise<Group> {
  if (signal?.aborted) throw abortError();
  const response = await fetch(ASSET_URL, { signal });
  if (!response.ok) throw new Error(`Yacht asset returned ${response.status}`);
  const bytes = await response.arrayBuffer();
  if (signal?.aborted) throw abortError();
  // No external buffers/textures or compression decoder are required. GLTFLoader
  // parses asynchronously but cannot cancel parsing; release a late result below.
  const gltf = await new GLTFLoader().parseAsync(bytes, "");
  const result = new Group();
  result.name = "licensed-motoryacht-35";
  const replacements = new Map<string, ShaderMaterial>();
  try {
    if (signal?.aborted) throw abortError();
    gltf.scene.updateMatrixWorld(true);
    const bounds = new Box3().setFromObject(gltf.scene);
    const size = bounds.getSize(new Vector3());
    const center = bounds.getCenter(new Vector3());
    if (!Number.isFinite(size.z) || size.z <= 0)
      throw new Error("Yacht asset has no usable geometry");
    const scale = LENGTH / size.z;
    const normalize = new Matrix4().makeScale(scale, scale, scale);
    normalize.setPosition(
      -center.x * scale,
      -WATERLINE * scale,
      -center.z * scale,
    );

    const materialFor = (source: Material) => {
      const finish = FINISHES[source.name] ?? IVORY;
      const key = `${finish.color}/${finish.gloss}/${finish.finish}/${finish.emission ?? 0}`;
      let material = replacements.get(key);
      if (!material) {
        material = architectureMaterial(
          finish.color,
          environment,
          finish.gloss,
          finish.emission ?? 0,
          finish.finish,
        );
        material.side = DoubleSide;
        material.name = `yacht-${source.name}`;
        replacements.set(key, material);
      }
      return material;
    };
    gltf.scene.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      const geometry = normalizedGeometry(
        object.geometry,
        new Matrix4().multiplyMatrices(normalize, object.matrixWorld),
      );
      const materials = Array.isArray(object.material)
        ? object.material.map(materialFor)
        : materialFor(object.material);
      const mesh = new Mesh(geometry, materials);
      mesh.name = object.name;
      result.add(mesh);
    });
    if (!result.children.length) throw new Error("Yacht asset is empty");
    batchStaticMeshes(result);
    result.userData = {
      model: "licensed",
      title: "motoryacht 35",
      author: "angelo raffaele catalano",
      license: "CC-BY-4.0",
      source:
        "https://sketchfab.com/3d-models/motoryacht-35-0bdd7a0de7254426890bb5745bb7da6d",
      length: LENGTH,
    };
    return result;
  } catch (error) {
    disposeYachtAsset(result);
    throw error;
  } finally {
    disposeSource(gltf);
  }
}
