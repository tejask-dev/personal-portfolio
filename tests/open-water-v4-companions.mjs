import assert from "node:assert/strict";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";

// Exercise the actual authored models and collision contract entirely on CPU.
const result = await build({ stdin: { contents: `
  export { createV4Companions } from './client/src/features/open-water/scene/V4Companions.ts';
  export { createEnvironment } from './client/src/features/open-water/scene/materials.ts';
  export { getRegion, regionIds, regionClearance, isRegionPoseSafe } from './client/src/features/open-water/data/regions.ts';
  export { Box3, Vector3 } from 'three';
`, resolveDir: fileURLToPath(new URL("../", import.meta.url)), loader: "ts" }, bundle: true, platform: "node", format: "esm", write: false, logLevel: "silent", define: { "import.meta.env.BASE_URL": '"/"' } });
const api = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].contents).toString("base64")}`);
const measurements = [];
for (const quality of ["low", "high"]) {
  const companions = api.createV4Companions(api.createEnvironment(), quality);
  assert.equal(companions.group.children.length, 2, "Allocate only one model per named character");
  const clearance = api.regionClearance("fish");
  for (const actor of ["nemo", "dory"]) {
    const controlled = companions.group.children.find(child => child.userData.companion === actor);
    let maxRadius = 0, maxHeight = 0;
    for (let frame = 0; frame < 1800; frame++) {
      const spawn = api.getRegion("crown").spawn;
      const pose = { ...spawn, heading: Math.PI / 2, x: spawn.x + Math.sin(frame * 0.01) };
      assert.ok(api.isRegionPoseSafe(pose, { regionId: "crown", actor: "fish" }), "Heading fixture must describe navigable water");
      companions.update({ region: "crown", actor, pose, time: frame / 30, delta: 1 / 30, quiet: false });
      companions.group.updateMatrixWorld(true);
      assert.equal(controlled.userData.controlled, true);
      const forward = new api.Vector3(0, 0, -1).applyQuaternion(controlled.quaternion);
      assert.ok(forward.x > 0.999, "Rightward controller heading must face +X for a model authored along -Z");
      const bounds = new api.Box3().setFromObject(controlled), origin = controlled.getWorldPosition(new api.Vector3());
      const radius = Math.hypot(Math.max(Math.abs(bounds.min.x - origin.x), Math.abs(bounds.max.x - origin.x)), Math.max(Math.abs(bounds.min.z - origin.z), Math.abs(bounds.max.z - origin.z)));
      const height = Math.max(Math.abs(bounds.min.y - origin.y), Math.abs(bounds.max.y - origin.y));
      maxRadius = Math.max(maxRadius, radius); maxHeight = Math.max(maxHeight, height);
      assert.ok(radius <= clearance.horizontal, `${quality}/${actor} animated horizontal bound ${radius}`);
      assert.ok(height <= clearance.vertical, `${quality}/${actor} animated vertical bound ${height}`);
    }
    measurements.push({ quality, actor, horizontalRadius: maxRadius, verticalHalfHeight: maxHeight });
  }
  for (const region of api.regionIds) {
    for (const actor of ["diver", "nemo", "dory"]) {
      for (let frame = 0; frame < 30; frame++) companions.update({ region, actor, pose: api.getRegion(region).spawn, time: 7 + frame / 60, delta: 1 / 60, quiet: frame > 15 });
      assert.equal(companions.group.children.length, 2, "Region and actor changes cannot duplicate residents");
      for (const resident of companions.group.children) {
        if (resident.visible) assert.ok(api.isRegionPoseSafe({ x: resident.position.x, y: resident.position.y, z: resident.position.z, heading: -resident.rotation.y }, { regionId: region, actor: "fish" }), "A visible companion must remain in navigable water");
      }
    }
  }
  companions.dispose(); companions.dispose(); assert.equal(companions.group.children.length, 0);
}
console.log(JSON.stringify({ passed: true, actualAuthoredModelBounds: measurements }, null, 2));
