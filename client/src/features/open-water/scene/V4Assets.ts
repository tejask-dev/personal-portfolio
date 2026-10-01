import {
  Box3,
  BufferGeometry,
  DoubleSide,
  Group,
  Matrix4,
  Mesh,
  Texture,
  Vector3,
  type Material,
  type Object3D,
} from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { applySeaMedium, architectureMaterial, type SeaEnvironment } from "./materials";
import {
  FINISH_BY_NAME_V4,
  FINISHES_V4,
  VESSEL_DIMENSIONS_V4,
  buildVesselV4,
  type FinishV4,
  type QualityV4,
  type VesselKindV4,
} from "./VesselModelsV4";
import {
  attachCompanionAnimationV4,
  buildCompanionV4,
  companionMaterialsV4,
  type CompanionKindV4,
} from "./CompanionModelsV4";

export type { QualityV4, VesselKindV4, CompanionKindV4 };

const ASSET_ROOT = `${import.meta.env.BASE_URL}assets/open-water-v4/`;
export const vesselAssetUrlV4 = (vessel: VesselKindV4, quality: QualityV4) => `${ASSET_ROOT}${vessel}-${quality}.glb`;

function vesselMaterial(finish: FinishV4, environment: SeaEnvironment) {
  const material = architectureMaterial(finish.color, environment, finish.gloss, finish.emission, finish.finish);
  material.side = DoubleSide;
  material.name = finish.name;
  return material;
}

function describe(group: Group, vessel: VesselKindV4, quality: QualityV4, source: "procedural" | "glb") {
  let triangles = 0;
  let draws = 0;
  group.traverse((o) => {
    if (!(o instanceof Mesh)) return;
    draws++;
    triangles += (o.geometry.index?.count ?? o.geometry.getAttribute("position").count) / 3;
  });
  const dims = VESSEL_DIMENSIONS_V4[vessel];
  group.userData = {
    model: "v4-original",
    source,
    vessel,
    quality,
    length: dims.length,
    beam: dims.beam,
    waterline: 0,
    forward: "-Z",
    triangles,
    draws,
    license: "Original work for Open Water (Tejass Kaushik portfolio)",
  };
}

/** Immediate, original vessel built from the editable source. Y-up, bow -Z,
 * waterline y=0, superyacht 28 x 7.6, tender 10 x 3.4. Static and material-batched. */
export function createVesselModel(
  environment: SeaEnvironment,
  vessel: "superyacht" | "tender",
  quality: "low" | "high",
): Group {
  const group = buildVesselV4(vessel, quality, (finish) => vesselMaterial(finish, environment));
  describe(group, vessel, quality, "procedural");
  return group;
}

const abortError = () => new DOMException("V4 vessel loading was cancelled", "AbortError");

/** Release every geometry/material/texture under root exactly once. */
export function disposeV4Asset(root: Object3D) {
  const geometries = new Set<BufferGeometry>();
  const materials = new Set<Material>();
  const textures = new Set<Texture>();
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material);
      for (const value of Object.values(material)) if (value instanceof Texture) textures.add(value);
    }
  });
  geometries.forEach((g) => g.dispose());
  textures.forEach((t) => t.dispose());
  materials.forEach((m) => m.dispose());
}

function disposeGltf(gltf: GLTF) {
  const holder = new Group();
  for (const scene of new Set([gltf.scene, ...gltf.scenes])) holder.add(scene);
  disposeV4Asset(holder);
  holder.clear();
}

/** Fetch the offline-exported GLB for the same vessel and rebind its named
 * material slots to architectureMaterial. Rejects with AbortError when the
 * signal fires at any stage; anything parsed after an abort is disposed here. */
export async function loadVesselAsset(
  environment: SeaEnvironment,
  vessel: "superyacht" | "tender",
  quality: "low" | "high",
  signal?: AbortSignal,
): Promise<Group> {
  if (signal?.aborted) throw abortError();
  const response = await fetch(vesselAssetUrlV4(vessel, quality), { signal });
  if (!response.ok) throw new Error(`V4 ${vessel} asset returned ${response.status}`);
  const bytes = await response.arrayBuffer();
  if (signal?.aborted) throw abortError();
  const gltf = await new GLTFLoader().parseAsync(bytes, "");
  const result = new Group();
  result.name = `open-water-v4-${vessel}-${quality}`;
  const materials = new Map<string, Material>();
  try {
    if (signal?.aborted) throw abortError();
    gltf.scene.updateMatrixWorld(true);
    const identity = new Matrix4();
    gltf.scene.traverse((object) => {
      if (!(object instanceof Mesh) || Array.isArray(object.material)) return;
      const finish = FINISH_BY_NAME_V4.get(object.material.name) ?? FINISHES_V4.ivory;
      let material = materials.get(finish.name);
      if (!material) {
        material = vesselMaterial(finish, environment);
        materials.set(finish.name, material);
      }
      const geometry = object.geometry.clone();
      if (!object.matrixWorld.equals(identity)) geometry.applyMatrix4(object.matrixWorld);
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      const mesh = new Mesh(geometry, material);
      mesh.name = finish.name;
      result.add(mesh);
    });
    if (!result.children.length) throw new Error(`V4 ${vessel} asset is empty`);
    const size = new Box3().setFromObject(result).getSize(new Vector3());
    const expected = VESSEL_DIMENSIONS_V4[vessel];
    if (Math.abs(size.z - expected.length) > expected.length * 0.02 || Math.abs(size.x - expected.beam) > expected.beam * 0.02)
      throw new Error(`V4 ${vessel} asset has unexpected dimensions ${size.x.toFixed(2)} x ${size.z.toFixed(2)}`);
    describe(result, vessel, quality, "glb");
    return result;
  } catch (error) {
    const geometries = new Set<BufferGeometry>();
    result.traverse((object) => { if (object instanceof Mesh) geometries.add(object.geometry); });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    throw error;
  } finally {
    disposeGltf(gltf);
  }
}

/** Articulated original companion. The scene owns the group's transform and
 * clock; call group.userData.animate(time, moving) once per scene tick, where
 * moving is normalised swim effort 0 (hover) .. 1 (cruise). Forward is -Z. */
export function createCompanionModel(
  environment: SeaEnvironment,
  kind: "nemo" | "dory",
  quality: "low" | "high",
): Group {
  const materials = companionMaterialsV4(kind);
  applySeaMedium(materials.skin, environment);
  applySeaMedium(materials.fin, environment);
  applySeaMedium(materials.eye, environment);
  const group = buildCompanionV4(kind, quality, materials);
  group.userData.animate = attachCompanionAnimationV4(group);
  return group;
}
