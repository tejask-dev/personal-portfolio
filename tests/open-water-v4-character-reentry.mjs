import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
// Hold the asset decoder at its noncancelable parse boundary. The real Wildlife
// request orchestration and scene graph run unchanged; no browser or GL context
// is needed to reproduce rapid dive → cancel → dive reentry.
const bundle = await build({
  stdin: { contents: `export {createWildlife} from './client/src/features/open-water/scene/Wildlife.ts'; export {createEnvironment} from './client/src/features/open-water/scene/materials.ts';`, resolveDir: root, loader: "ts" },
  bundle: true, platform: "node", format: "esm", write: false, logLevel: "silent",
  define: { "import.meta.env.BASE_URL": '"/"' },
  plugins: [{ name: "deferred-character-decoder", setup(api) {
    api.onResolve({ filter: /^\.\/CharacterAsset$/ }, () => ({ path: "character-decoder", namespace: "test-decoder" }));
    api.onLoad({ filter: /.*/, namespace: "test-decoder" }, () => ({ resolveDir: root, contents: `
      import {Group} from 'three';
      export function disposeCreature(root) {
        const geometries=new Set(),materials=new Set();
        root.traverse(object=>{if(!object.isMesh)return;geometries.add(object.geometry);for(const material of Array.isArray(object.material)?object.material:[object.material])materials.add(material);if(object.isInstancedMesh)object.dispose();});
        geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
      }
      export function createFallbackCharacter(){return {group:new Group(),source:'fallback',update(){},dispose(){this.group.clear();}};}
      export function loadCharacterAsset(_environment,signal){
        return new Promise(resolve=>globalThis.__v4CharacterRequests.push({signal,complete(name){
          const group=new Group();group.name=name;
          const asset={group,source:'rigged',disposals:0,update(){},dispose(){this.disposals++;group.clear();}};
          resolve(asset);return asset;
        }}));
      }
    ` }));
  } }],
});
const { createWildlife, createEnvironment } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].contents).toString("base64")}`);

async function fixture(run) {
  const originalFetch = globalThis.fetch;
  globalThis.__v4CharacterRequests = [];
  // Fish schools retain their procedural geometry, isolating the character's
  // canceled decode from independent network success or asset fixture changes.
  globalThis.fetch = async () => new Response(null, { status: 503 });
  const world = createWildlife(createEnvironment(), { quality: "low" });
  try { await run(world, globalThis.__v4CharacterRequests); }
  finally { world.dispose(); globalThis.fetch = originalFetch; delete globalThis.__v4CharacterRequests; }
}

test("a new dive retries an aborted decode and concurrent callers share that replacement", async () => fixture(async (world, requests) => {
  const firstSignal = new AbortController(), secondSignal = new AbortController();
  const first = world.loadCharacter(firstSignal.signal);
  firstSignal.abort();
  const second = world.loadCharacter(secondSignal.signal), joined = world.loadCharacter(secondSignal.signal);
  assert.equal(requests.length, 1, "Do not allocate another decoder before the canceled request settles");
  const stale = requests[0].complete("stale-dakota");
  await first;
  await Promise.resolve();
  assert.equal(stale.disposals, 1, "Late character must be released rather than installed");
  assert.equal(world.dakota.getObjectByName("stale-dakota"), undefined);
  assert.equal(requests.length, 2, "The fresh visit must own a nonaborted request");
  assert.equal(requests[1].signal.aborted, false);
  const fresh = requests[1].complete("fresh-dakota");
  await Promise.all([second, joined]);
  assert.equal(world.dakota.getObjectByName("fresh-dakota"), fresh.group);
  assert.equal(fresh.disposals, 0);
  world.dispose();
  assert.equal(fresh.disposals, 1);
}));

test("canceling the queued visit prevents its decoder from starting", async () => fixture(async (world, requests) => {
  const firstSignal = new AbortController(), nextSignal = new AbortController();
  const first = world.loadCharacter(firstSignal.signal);
  firstSignal.abort();
  const next = world.loadCharacter(nextSignal.signal);
  nextSignal.abort();
  const stale = requests[0].complete("canceled-character");
  await Promise.all([first, next]);
  assert.equal(requests.length, 1);
  assert.equal(stale.disposals, 1);
  assert.equal(world.assetState, "idle");
}));

test("unmount while reentry waits disposes the late character without restarting work", async () => fixture(async (world, requests) => {
  const signal = new AbortController();
  const first = world.loadCharacter(signal.signal);
  signal.abort();
  const next = world.loadCharacter(new AbortController().signal);
  world.dispose();
  const stale = requests[0].complete("unmounted-character");
  await Promise.all([first, next]);
  assert.equal(requests.length, 1);
  assert.equal(stale.disposals, 1);
  assert.equal(world.group.children.length, 0);
}));
