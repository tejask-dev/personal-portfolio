/** Offline asset processing only; none of these packages ship in the site. */
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import {
  weld,
  simplify,
  prune,
  quantize,
  reorder,
} from "@gltf-transform/functions";
import { MeshoptSimplifier, MeshoptEncoder } from "meshoptimizer";
import { validateBytes } from "gltf-validator";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error("Usage: node optimize.mjs source.glb output.glb");
  process.exit(1);
}
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const inputBytes = await readFile(input);
const sourceHash =
  "f3272a5c660705b0c4c1a0dca4195a7f60822f0d09d290a1a37ff6fa0677985b";
if (sha256(inputBytes) !== sourceHash) {
  throw new Error(
    "Source hash differs from the reviewed licensed GLB; inspect provenance first.",
  );
}
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
await Promise.all([MeshoptSimplifier.ready, MeshoptEncoder.ready]);
const document = await io.read(input);
const flagNodes = document
  .getRoot()
  .listNodes()
  .filter((node) => node.getName().startsWith("transform16"));
const removedNames = flagNodes.map((node) => node.getName());
for (const node of flagNodes.reverse()) node.dispose();
await document.transform(
  weld(),
  simplify({
    simplifier: MeshoptSimplifier,
    ratio: 0.2,
    error: 0.001,
    lockBorder: false,
  }),
  prune({ keepAttributes: true }),
  reorder({ encoder: MeshoptEncoder, target: "performance" }),
  quantize({ quantizePosition: 16, quantizeNormal: 12, quantizeTexcoord: 14 }),
);
document.getRoot().getAsset().extras = {
  ...document.getRoot().getAsset().extras,
  modifications:
    "Derived from the glTF-Transform 4.4.1 mirror conversion. Removed the separable Italian flag (transform16). Welded vertices; simplified geometry with meshoptimizer via glTF-Transform 4.5.1; reordered vertex cache; quantized positions to 16 bits, normals to 12 bits, texture coordinates to 14 bits. Original materials and their names retained, except unused flag materials.",
};
await io.write(output, document);
const bytes = await readFile(output);
const validation = await validateBytes(new Uint8Array(bytes), {
  uri: path.basename(output),
});
const report = {
  input: path.basename(input),
  output: path.basename(output),
  sourceSha256: sourceHash,
  outputSha256: sha256(bytes),
  bytes: bytes.byteLength,
  ratio: 0.2,
  error: 0.001,
  removedNames,
  triangles: document
    .getRoot()
    .listMeshes()
    .flatMap((mesh) => mesh.listPrimitives())
    .reduce(
      (sum, primitive) =>
        sum +
        (primitive.getIndices()?.getCount() ??
          primitive.getAttribute("POSITION").getCount()) /
          3,
      0,
    ),
  meshes: document.getRoot().listMeshes().length,
  materials: document
    .getRoot()
    .listMaterials()
    .map((material) => material.getName()),
  validation: validation.issues,
};
await writeFile(`${output}.metrics.json`, JSON.stringify(report, null, 2));
await writeFile(
  `${output}.validation.json`,
  JSON.stringify(validation, null, 2),
);
if (validation.issues.numErrors)
  throw new Error("Optimized GLB failed validation");
console.log(JSON.stringify(report, null, 2));
