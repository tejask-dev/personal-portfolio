import { DoubleSide, Group, MeshStandardMaterial } from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { buildVesselV4, type FinishV4, type QualityV4 } from "./VesselModelsV4";
import { buildCompanionV4, companionMaterialsV4 } from "./CompanionModelsV4";

/** Offline-only entry used by scripts/build-open-water-v4-assets.mjs; the app
 * never imports it. Exports the same editable source the runtime builds. */
export type ExportKindV4 = "superyacht" | "tender" | "nemo" | "dory";

function exportMaterial(finish: FinishV4) {
  const material = new MeshStandardMaterial({
    color: finish.color,
    roughness: 1 - finish.gloss * 0.8,
    metalness: finish.finish === 3 ? 0.85 : 0.02,
    emissive: finish.emission > 0 ? finish.color : "#000000",
    emissiveIntensity: finish.emission,
    side: DoubleSide,
  });
  material.name = finish.name;
  return material;
}

export function buildExportSceneV4(kind: ExportKindV4, quality: QualityV4): Group {
  const root =
    kind === "superyacht" || kind === "tender"
      ? buildVesselV4(kind, quality, exportMaterial)
      : buildCompanionV4(kind, quality, companionMaterialsV4(kind));
  root.userData = {
    ...root.userData,
    asset: `open-water-v4-${kind}-${quality}`,
    generator: "scripts/build-open-water-v4-assets.mjs",
    license: "Original work for Open Water (Tejass Kaushik portfolio); no third-party geometry",
    axes: "Y-up, forward -Z, metres",
  };
  return root;
}

export async function exportGlbV4(kind: ExportKindV4, quality: QualityV4): Promise<ArrayBuffer> {
  const scene = buildExportSceneV4(kind, quality);
  const bytes = (await new GLTFExporter().parseAsync(scene, { binary: true, onlyVisible: false })) as ArrayBuffer;
  scene.traverse((o) => {
    const mesh = o as { geometry?: { dispose(): void }; material?: { dispose(): void } };
    mesh.geometry?.dispose();
    mesh.material?.dispose();
  });
  return bytes;
}

/** Re-exported for the offline check script, which runs inside Vite. */
export * as THREE from "three";
export { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
