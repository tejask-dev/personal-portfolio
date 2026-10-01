import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const bundle = await build({ stdin: { contents: `
  export {swimEnvelope,swimWave,SWIM_REACH_START,SWIM_WAVENUMBER,applyFishSwimming} from './client/src/features/open-water/scene/FishSwimming.ts';
  export {createV4Companions} from './client/src/features/open-water/scene/V4Companions.ts';
  export {createCompanionModel} from './client/src/features/open-water/scene/V4Assets.ts';
  export {disposeCreature} from './client/src/features/open-water/scene/CharacterAsset.ts';
  export {createEnvironment} from './client/src/features/open-water/scene/materials.ts';
  export {getRegion,regionClearance,isRegionPoseSafe} from './client/src/features/open-water/data/regions.ts';
  export {Vector3,MeshStandardMaterial,ShaderLib} from 'three';
`, resolveDir: root, loader: "ts" }, bundle: true, platform: "node", format: "esm", write: false, logLevel: "silent", define: { "import.meta.env.BASE_URL": '"/"' } });
const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].contents).toString("base64")}`);
const near = (a, b, tolerance, message) => assert.ok(Math.abs(a - b) <= tolerance, `${message}: ${a} vs ${b}`);

test("swim envelope has stable head, monotonic bounded reach and continuous boundary slopes", () => {
  let previous = 0;
  for (let i = -100; i <= 200; i++) {
    const s = i / 100, value = api.swimEnvelope(s);
    assert.ok(value.weight >= 0 && value.weight <= 1 && value.slope >= 0);
    assert.ok(value.weight >= previous); previous = value.weight;
    if (s <= api.SWIM_REACH_START) assert.deepEqual(value, { weight: 0, slope: 0 });
    if (s >= 1) assert.deepEqual(value, { weight: 1, slope: 0 });
  }
  for (const boundary of [api.SWIM_REACH_START, 1]) {
    const left = api.swimEnvelope(boundary - 1e-7), right = api.swimEnvelope(boundary + 1e-7);
    near(left.weight, right.weight, 1e-10, "envelope cannot open a seam");
    near(left.slope, right.slope, 1e-5, "slope cannot introduce a hard crease");
  }
});

test("analytic wave slope agrees with independent finite differences, including steering and envelope edges", () => {
  for (const s of [-0.1, 0.05, 0.18, 0.18001, 0.3, 0.6, 0.98, 1, 1.1])
    for (const phase of [0, 0.7, 2.1, 4.6]) for (const amplitude of [0, 0.04, 0.14]) for (const turn of [-0.085, 0, 0.085]) {
      const h = 1e-6, value = api.swimWave(s, phase, amplitude, turn);
      const derivative = (api.swimWave(s + h, phase, amplitude, turn).offset - api.swimWave(s - h, phase, amplitude, turn).offset) / (2 * h);
      near(value.slope, derivative, 4e-6, `wave gradient at ${s}/${phase}/${turn}`);
      assert.ok(Math.abs(value.offset) <= Math.abs(amplitude) + Math.abs(turn) + 1e-12);
    }
});

test("normal correction is perpendicular to the numerically deformed tangent for both body axes", () => {
  for (const direction of [-1, 1]) for (const length of [0.43, 0.87]) for (const s of [0.2, 0.6, 0.95]) {
    const phase = 1.13, amplitude = length * 0.14, h = 1e-6;
    const z = s * length / direction;
    const displacement = zValue => api.swimWave(zValue * direction / length, phase, amplitude).offset;
    const numericalGradient = (displacement(z + h) - displacement(z - h)) / (2 * h);
    const gradient = api.swimWave(s, phase, amplitude).slope * direction / length;
    const tangent = new api.Vector3(numericalGradient, 0, 1).normalize();
    const normal = new api.Vector3(1, 0, -gradient).normalize();
    near(normal.dot(tangent), 0, 1e-8, "inverse-transpose normal must remain perpendicular");
    near(normal.length(), 1, 1e-12, "unit normal");
  }
});

test("phase advances the deformation crest toward the tail and stays continuous across mesh-coordinate seams", () => {
  const s = 0.45, phase = s * api.SWIM_WAVENUMBER - Math.PI / 2, advance = 0.25;
  // Remove the envelope to isolate spatial phase, rather than confusing changing
  // posterior amplitude with the direction in which the wave itself travels.
  const crest = (x, p) => api.swimWave(x, p, 0.1).offset / api.swimEnvelope(x).weight;
  near(crest(s, phase), 0.1, 1e-12, "initial crest");
  near(crest(s + advance / api.SWIM_WAVENUMBER, phase + advance), 0.1, 1e-12, "tailward crest");
  for (const seam of [0.18, 0.6, 1]) for (const p of [0, 1, 3, 5]) {
    const a = api.swimWave(seam - 1e-7, p, 0.12, 0.04), b = api.swimWave(seam + 1e-7, p, 0.12, 0.04);
    near(a.offset, b.offset, 2e-7, "displacement seam");
    near(a.slope, b.slope, 2e-6, "normal seam");
  }
});

test("actual companion front/rear coincident rings stay joined while the continuous body bends", () => {
  for (const kind of ["nemo", "dory"]) {
    const model = api.createCompanionModel(api.createEnvironment(), kind, "low");
    try {
      const front = model.getObjectByName(`${kind}-front-skin`), rear = model.getObjectByName(`${kind}-rear-skin`);
      const point = (mesh, i) => mesh.localToWorld(new api.Vector3().fromBufferAttribute(mesh.geometry.attributes.position, i));
      model.updateMatrixWorld(true);
      const frontPoints = Array.from({ length: front.geometry.attributes.position.count }, (_, i) => point(front, i));
      const pairs = [];
      for (let i = 0; i < rear.geometry.attributes.position.count; i++) {
        const at = point(rear, i), match = frontPoints.findIndex(p => p.distanceTo(at) < 2e-7);
        if (match !== -1) pairs.push([match, i]);
      }
      assert.ok(pairs.length >= 10, `${kind}: fixture must find the actual shared body ring`);
      for (let frame = 0; frame < 90; frame++) {
        model.userData.animate(frame / 30, 1, Math.sin(frame / 12)); model.updateMatrixWorld(true);
        for (const [a, b] of pairs) near(point(front, a).distanceTo(point(rear, b)), 0, 2e-7, `${kind}: joint separation`);
      }
    } finally { api.disposeCreature(model); }
  }
});

test("actual controlled companions derive swim effort from speed at 15, 30, 60 and 144 Hz", () => {
  const results = [];
  for (const fps of [15, 30, 60, 144]) {
    const companions = api.createV4Companions(api.createEnvironment(), "low");
    try {
      const start = api.getRegion("crown").spawn, controlled = companions.group.children.find(o => o.userData.companion === "nemo");
      for (let frame = 0; frame <= fps * 2; frame++) {
        const time = frame / fps, pose = { ...start, x: start.x + time * 0.6, heading: 0 };
        assert.ok(api.isRegionPoseSafe(pose, { regionId: "crown", actor: "fish" }));
        companions.update({ region: "crown", actor: "nemo", pose, time, delta: frame ? 1 / fps : 0, quiet: false });
      }
      const authored = controlled.getObjectByName("open-water-v4-nemo-low");
      assert.ok(Number.isFinite(authored.userData.swimEffort), "Inspect the actual animation's accumulated effort");
      results.push({ fps, effort: authored.userData.swimEffort });
    } finally { companions.dispose(); }
  }
  for (const row of results) near(row.effort, 0.6 / 3.6, 0.001, `velocity effort at ${row.fps}Hz`);
});

test("maximal steering remains inside the shared fish passage envelope", () => {
  const companions = api.createV4Companions(api.createEnvironment(), "low"), clearance = api.regionClearance("fish");
  try {
    for (const model of companions.group.children) for (let frame = 0; frame < 144; frame++) {
      model.userData.animate(20 + frame / 36, 1, frame < 72 ? -1 : 1); companions.group.updateMatrixWorld(true);
      const origin = model.getWorldPosition(new api.Vector3()), vertex = new api.Vector3();
      model.traverse(object => {
        if (!object.isMesh) return;
        const positions = object.geometry.attributes.position;
        for (let i = 0; i < positions.count; i++) {
          vertex.fromBufferAttribute(positions, i).applyMatrix4(object.matrixWorld).sub(origin);
          assert.ok(Math.hypot(vertex.x, vertex.z) <= clearance.horizontal, `${model.name}: steering exceeded horizontal envelope`);
          assert.ok(Math.abs(vertex.y) <= clearance.vertical, `${model.name}: steering exceeded passage roof clearance`);
        }
      });
    }
  } finally { companions.dispose(); }
});

test("shader extension preserves the existing sea patch, uses stable per-material clocks, and has source attribution", async () => {
  const material = new api.MeshStandardMaterial(), clock = { value: 1 };
  let previousCalls = 0;
  material.onBeforeCompile = shader => { previousCalls++; shader.vertexShader = `// existing patch\n${shader.vertexShader}`; };
  material.customProgramCacheKey = () => "fixture-base-key";
  api.applyFishSwimming(material, clock, { headZ: -0.18, length: 0.43, phaseAttribute: "aSwimPhase" });
  const shader = { uniforms: {}, vertexShader: api.ShaderLib.standard.vertexShader, fragmentShader: api.ShaderLib.standard.fragmentShader };
  material.onBeforeCompile(shader, {});
  assert.equal(previousCalls, 1); assert.ok(shader.vertexShader.includes("// existing patch"));
  assert.equal(shader.uniforms.uSwimClock, clock); assert.ok(material.customProgramCacheKey().startsWith("fixture-base-key/"));
  assert.match(shader.vertexShader, /attribute float aSwimPhase/); material.dispose();
  const source = await readFile(new URL("../client/src/features/open-water/scene/FishSwimming.ts", import.meta.url), "utf8");
  const notice = await readFile(new URL("../client/public/assets/open-water-v4/THIRD-PARTY-SWIMMING.txt", import.meta.url), "utf8");
  for (const text of [source, notice]) assert.match(text, /d773646bfe5e66d8ab312429591b4dbf12e3d389/);
  for (const phrase of ["MIT License", "Copyright (c) 2026 0s0ka", "Permission is hereby granted", "THE SOFTWARE IS PROVIDED", "IN NO EVENT SHALL THE"]) assert.ok(notice.includes(phrase), `Preserve MIT notice: ${phrase}`);
});
