/** Verify the V4 art through the real runtime API in headless Chrome:
 * budgets, dimensions, axes, material slots, GLB parity with source, loader
 * abort safety, animation continuity, surface winding (FrontSide vs DoubleSide
 * render diff with the actual architectureMaterial) and review screenshots.
 *   node scripts/check-open-water-v4-assets.mjs [screenshotDir]
 * Exits non-zero on any failed check. */
import fs from 'node:fs';
import {createServer} from 'vite';
import {chromium} from 'playwright';

const shots = process.argv[2] ?? '/tmp/open-water-v4-art';
fs.mkdirSync(shots, {recursive: true});
const W = 1400, H = 900;
// Prebundle before imports so an optimizer restart cannot create two loader prototypes.
const server = await createServer({optimizeDeps: {noDiscovery: true, include: ['three', 'three/examples/jsm/loaders/GLTFLoader.js', 'three/examples/jsm/exporters/GLTFExporter.js', 'three/examples/jsm/utils/BufferGeometryUtils.js']}, server: {host: '127.0.0.1', port: 8812, strictPort: true}, mode: 'test', logLevel: 'error'});
await server.listen();
const browser = await chromium.launch({headless: true, channel: 'chrome'}).catch(() => chromium.launch({headless: true}));
let failed = false;
try {
  const page = await browser.newPage({viewport: {width: W, height: H}});
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.route('**/v4-check', r => r.fulfill({contentType: 'text/html', body: '<html><head><link rel="icon" href="data:,"></head><body style="margin:0"></body></html>'}));
  await page.goto('http://127.0.0.1:8812/v4-check');
  const report = await page.evaluate(async ([W, H]) => {
    const {THREE: T, GLTFLoader} = await import('/src/features/open-water/scene/AssetExportV4.ts');
    const api = await import('/src/features/open-water/scene/V4Assets.ts');
    const {createEnvironment} = await import('/src/features/open-water/scene/materials.ts');
    const env = createEnvironment();
    const checks = [];
    const check = (name, ok, detail) => checks.push({name, ok: !!ok, detail});
    const round = v => +v.toFixed(3);
    const stats = g => {
      g.updateMatrixWorld(true);
      let triangles = 0, draws = 0;
      const materials = new Set();
      g.traverse(o => { if (o.isMesh) { draws++; triangles += (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3; materials.add(o.material.name); } });
      const b = new T.Box3().setFromObject(g), s = b.getSize(new T.Vector3());
      return {triangles, draws, materials: [...materials].sort(), size: s.toArray().map(round), min: b.min.toArray().map(round), max: b.max.toArray().map(round)};
    };
    const budgets = {superyacht: {low: 55000, high: 150000}, tender: {low: 8000, high: 30000}, nemo: {low: 4000, high: 10000}, dory: {low: 4000, high: 10000}};
    const dims = {superyacht: [28, 7.6], tender: [10, 3.4]};
    const result = {vessels: {}, fish: {}, winding: {}};
    const models = {};

    for (const vessel of ['superyacht', 'tender']) for (const quality of ['low', 'high']) {
      const made = api.createVesselModel(env, vessel, quality), p = stats(made);
      const loaded = await api.loadVesselAsset(env, vessel, quality), l = stats(loaded);
      const [L, B] = dims[vessel], key = `${vessel}-${quality}`;
      result.vessels[key] = {procedural: p, glb: l};
      check(`${key} triangles <= ${budgets[vessel][quality]}`, l.triangles <= budgets[vessel][quality], l.triangles);
      check(`${key} draws <= 8`, l.draws <= 8, l.draws);
      check(`${key} length ${L}`, Math.abs(l.size[2] - L) < 0.03, l.size[2]);
      check(`${key} beam ${B}`, Math.abs(l.size[0] - B) < 0.03, l.size[0]);
      check(`${key} bow at -Z, stern at +Z`, Math.abs(l.min[2] + L / 2) < 0.03 && Math.abs(l.max[2] - L / 2) < 0.03, [l.min[2], l.max[2]]);
      check(`${key} keel below / freeboard above y=0`, l.min[1] < -0.3 && l.max[1] > 1, [l.min[1], l.max[1]]);
      check(`${key} GLB identical to source`, l.triangles === p.triangles && JSON.stringify(l.size) === JSON.stringify(p.size) && JSON.stringify(l.materials) === JSON.stringify(p.materials), {source: p.triangles, glb: l.triangles});
      let shader = true;
      loaded.traverse(o => { if (o.isMesh && !(o.material.isShaderMaterial && o.material.uniforms.uTime === env.uTime)) shader = false; });
      check(`${key} rebound to architectureMaterial`, shader);
      models[key] = loaded;
      api.disposeV4Asset(made);
    }

    const outcome = async run => { try { await run(); return 'resolved'; } catch (e) { return e.name; } };
    const pre = new AbortController(); pre.abort();
    check('pre-aborted load rejects AbortError', await outcome(() => api.loadVesselAsset(env, 'tender', 'low', pre.signal)) === 'AbortError');
    const mid = new AbortController(); const midLoad = api.loadVesselAsset(env, 'superyacht', 'high', mid.signal); mid.abort();
    check('abort during fetch rejects AbortError', await outcome(() => midLoad) === 'AbortError');
    // Abort after bytes arrive but before parse completes: the parsed result must be released.
    const late = new AbortController();
    const realParse = GLTFLoader.prototype.parseAsync;
    let parsedMeshes = 0, releasedMeshes = 0;
    GLTFLoader.prototype.parseAsync = async function (...args) {
      late.abort();
      const gltf = await realParse.apply(this, args);
      gltf.scene.traverse(o => { if (o.isMesh) { parsedMeshes++; o.geometry.addEventListener('dispose', () => releasedMeshes++); } });
      return gltf;
    };
    const lateResult = await outcome(() => api.loadVesselAsset(env, 'tender', 'low', late.signal));
    GLTFLoader.prototype.parseAsync = realParse;
    check('abort during parse rejects AbortError and disposes late GLB', lateResult === 'AbortError' && parsedMeshes > 0 && releasedMeshes === parsedMeshes, {lateResult, parsedMeshes, releasedMeshes});
    const realFetch = window.fetch;
    window.fetch = () => Promise.resolve(new Response('', {status: 404}));
    check('missing asset rejects with Error', await outcome(() => api.loadVesselAsset(env, 'tender', 'low')) === 'Error');
    window.fetch = realFetch;

    for (const kind of ['nemo', 'dory']) for (const quality of ['low', 'high']) {
      const key = `${kind}-${quality}`;
      const fish = api.createCompanionModel(env, kind, quality), s = stats(fish);
      const glb = await new GLTFLoader().loadAsync(`/assets/open-water-v4/${key}.glb`), g = stats(glb.scene);
      const eyes = new T.Box3().setFromObject(fish.getObjectByName(`${kind}-front-eye`)).getCenter(new T.Vector3());
      const tail = fish.getObjectByName(`${kind}-tail`), tailAt = tail.getWorldPosition(new T.Vector3());
      check(`${key} triangles <= ${budgets[kind][quality]}`, s.triangles <= budgets[kind][quality], s.triangles);
      check(`${key} forward -Z (eyes ahead of tail)`, eyes.z < tailAt.z && s.min[2] < -0.15, {eyes: round(eyes.z), tail: round(tailAt.z)});
      check(`${key} GLB identical to source`, g.triangles === s.triangles && JSON.stringify(g.size) === JSON.stringify(s.size) && JSON.stringify(g.materials) === JSON.stringify(s.materials), {source: s.triangles, glb: g.triangles});
      check(`${key} exposes userData.animate`, typeof fish.userData.animate === 'function');
      const anim = fish.userData.animate;
      const tailMesh = fish.getObjectByName(`${kind}-tail-fin`);
      const bodyMesh = fish.getObjectByName(`${kind}-rear-skin`);
      const positions = mesh => Array.from(mesh.geometry.attributes.position.array);
      const restTail = positions(tailMesh), restBody = positions(bodyMesh);
      const displacement = (a, b) => {
        let maximum = 0;
        for (let j = 0; j < a.length; j += 3)
          maximum = Math.max(maximum, Math.hypot(a[j] - b[j], a[j + 1] - b[j + 1], a[j + 2] - b[j + 2]));
        return maximum;
      };
      const length = s.size[2];
      let maxStep = 0, previousVertices, idle = 0, swim = 0, bodyFlex = 0;
      // Observe actual vertex deformation, not a pivot angle or whole-fish translation.
      // Normalize by body length so Low and High meshes have the same visual contract.
      for (let i = 0; i <= 3600; i++) {
        const t = 10 + i / 240, moving = i < 1200 ? 0 : i < 2000 ? (i - 1200) / 800 : 1;
        anim(t, moving);
        const vertices = positions(tailMesh);
        if (previousVertices) maxStep = Math.max(maxStep, displacement(vertices, previousVertices) / length);
        previousVertices = vertices;
        const excursion = displacement(vertices, restTail) / length;
        if (i < 1200) idle = Math.max(idle, excursion);
        else if (i > 2400) {
          swim = Math.max(swim, excursion);
          bodyFlex = Math.max(bodyFlex, displacement(positions(bodyMesh), restBody) / length);
        }
      }
      check(`${key} deformation continuous (max step at 240 Hz < 3.5% length)`, maxStep < 0.035, round(maxStep));
      check(`${key} visible tail deformation reaches 4% length`, swim >= 0.04, round(swim));
      check(`${key} body flex reaches 1% length`, bodyFlex >= 0.01, round(bodyFlex));
      check(`${key} swim deformation stronger than idle`, swim > idle * 1.3, {idle: round(idle), swim: round(swim)});
      anim(25, 1);
      const frozenGeometry = [];
      const frozenTransforms = [];
      fish.traverse(object => frozenTransforms.push([object, [...object.position.toArray(), ...object.quaternion.toArray(), ...object.scale.toArray()]]));
      fish.traverse(object => { if (object.isMesh) frozenGeometry.push([object, positions(object), Array.from(object.geometry.attributes.normal.array)]); });
      anim(25, 0, 1); anim(25, 1, -1);
      const held = frozenGeometry.every(([object, heldPositions, heldNormals]) => displacement(positions(object), heldPositions) === 0 && displacement(Array.from(object.geometry.attributes.normal.array), heldNormals) === 0)
        && frozenTransforms.every(([object, values]) => JSON.stringify([...object.position.toArray(), ...object.quaternion.toArray(), ...object.scale.toArray()]) === JSON.stringify(values));
      check(`${key} frozen clock holds geometry, normals and fins despite changed input`, held);
      check(`${key} root transform left to the scene`, fish.position.lengthSq() === 0 && fish.quaternion.equals(new T.Quaternion()));
      result.fish[key] = {...s, length: fish.userData.length, height: fish.userData.height, width: fish.userData.width, rig: fish.userData.rig, deformation: {normalizedIdle: idle, normalizedSwim: swim, normalizedBodyFlex: bodyFlex, maximumStep: maxStep}};
      models[key] = fish;
      api.disposeV4Asset(glb.scene);
    }

    const renderer = new T.WebGLRenderer({antialias: true, preserveDrawingBuffer: true});
    renderer.setPixelRatio(1); renderer.setSize(W, H); document.body.appendChild(renderer.domElement);
    const scene = new T.Scene(); scene.background = new T.Color('#c8dde0');
    scene.add(new T.HemisphereLight('#e2f0ff', '#4c6a66', 1.6));
    const sun = new T.DirectionalLight('#fff3dc', 2.4); sun.position.set(-6, 9, -5); scene.add(sun);
    const camera = new T.PerspectiveCamera(32, W / H, 0.15, 3000);
    const fishCamera = {near: 0.01, far: 50};
    const show = (keys, layout = []) => {
      for (const m of Object.values(models)) m.removeFromParent();
      keys.forEach((k, i) => { models[k].position.set(layout[i] ?? 0, 0, 0); scene.add(models[k]); });
    };
    const look = (eye, at) => { camera.position.set(...eye); camera.lookAt(...at); };
    const setSide = (key, side) => models[key].traverse(o => { if (o.isMesh) { o.material.side = side; o.material.needsUpdate = true; } });
    // Winding: anything visible only because DoubleSide renders a back face shows up as a pixel difference.
    const target = new T.WebGLRenderTarget(700, 450);
    const pixels = () => { renderer.setRenderTarget(target); renderer.render(scene, camera); const a = new Uint8Array(700 * 450 * 4); renderer.readRenderTargetPixels(target, 0, 0, 700, 450, a); renderer.setRenderTarget(null); return a; };
    const bg = [200, 221, 224];
    const views = {bow: [0, 4, -60], stern: [0, 6, 60], port: [-60, 5, 0], starboard: [60, 5, 0], 'bow-port-high': [-40, 30, -40], 'stern-starboard-high': [40, 30, 40], 'below-quarter': [30, -14, 35]};
    for (const key of ['superyacht-low', 'superyacht-high', 'tender-low', 'tender-high']) {
      show([key]);
      const scale = key.startsWith('tender') ? 0.38 : 1;
      result.winding[key] = {};
      for (const [name, eye] of Object.entries(views)) {
        look(eye.map(v => v * scale), [0, key.startsWith('tender') ? 0.7 : 3, 0]);
        setSide(key, T.DoubleSide); const both = pixels();
        setSide(key, T.FrontSide); const front = pixels();
        let covered = 0, diff = 0;
        for (let i = 0; i < both.length; i += 4) {
          const isModel = Math.abs(both[i] - bg[0]) + Math.abs(both[i + 1] - bg[1]) + Math.abs(both[i + 2] - bg[2]) > 12;
          if (!isModel) continue;
          covered++;
          if (Math.abs(both[i] - front[i]) + Math.abs(both[i + 1] - front[i + 1]) + Math.abs(both[i + 2] - front[i + 2]) > 30) diff++;
        }
        const ratio = diff / Math.max(1, covered);
        result.winding[key][name] = round(ratio);
        check(`${key} ${name}: back faces visible <= 2%`, ratio <= 0.02, `${(ratio * 100).toFixed(2)}%`);
        setSide(key, T.DoubleSide);
      }
    }
    window.drawV4 = (keys, eye, at, layout, frontOnly, pose) => {
      show(keys, layout);
      for (const k of keys) {
        setSide(k, frontOnly ? T.FrontSide : T.DoubleSide);
        if (models[k].userData.animate) models[k].userData.animate(pose ?? 12.3, 0.6);
      }
      // Vessels use the runtime near/far (0.15/3000) so depth precision matches the scene.
      const fish = !!models[keys[0]].userData.animate;
      camera.near = fish ? fishCamera.near : 0.15; camera.far = fish ? fishCamera.far : 3000; camera.updateProjectionMatrix();
      look(eye, at); renderer.render(scene, camera);
    };
    return {checks, ...result};
  }, [W, H]);

  const shotsList = [
    ['superyacht-bow-port', ['superyacht-high'], [-32, 12, -34], [0, 3, 0], [], true],
    ['superyacht-profile-starboard', ['superyacht-high'], [46, 4, 0], [0, 3.5, 0], [], true],
    ['superyacht-stern-starboard', ['superyacht-high'], [20, 11, 32], [0, 3, 3], [], true],
    ['superyacht-port-stern', ['superyacht-high'], [-34, 9, 26], [0, 3, 0], [], true],
    ['superyacht-low-vs-high', ['superyacht-low', 'superyacht-high'], [-30, 34, -66], [0, 3, 0], [-5, 5], true],
    ['superyacht-distant-180m', ['superyacht-high'], [-110, 60, -130], [0, 3, 0], [], true],
    ['tender-quarter', ['tender-high'], [-11, 6, -12], [0, 0.8, 0], [], true],
    ['tender-low-vs-high-stern', ['tender-low', 'tender-high'], [10, 8, 17], [0, 0.8, 0], [-2.2, 2.2], true],
    ['fish-nemo-side', ['nemo-high'], [0.95, 0.03, 0.0], [0, 0, 0], [], false],
    ['fish-dory-side', ['dory-high'], [1.1, 0.03, 0.0], [0, 0, 0], [], false],
    ['fish-nemo-quarter', ['nemo-high'], [0.45, 0.2, -0.55], [0, 0, 0], [], false],
    ['fish-dory-quarter', ['dory-high'], [0.55, 0.22, -0.62], [0, 0, 0], [], false],
    ['fish-low-vs-high', ['nemo-low', 'nemo-high', 'dory-low', 'dory-high'], [0, 0.9, -1.9], [0, 0, 0], [-0.75, -0.25, 0.25, 0.8], false],
  ];
  for (const [name, keys, eye, at, layout, front] of shotsList) {
    await page.evaluate(([keys, eye, at, layout, front]) => window.drawV4(keys, eye, at, layout, front), [keys, eye, at, layout, front]);
    await page.screenshot({path: `${shots}/${name}.png`});
  }
  const {checks, ...data} = report;
  for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name}${c.detail !== undefined ? ' ' + JSON.stringify(c.detail) : ''}`);
  fs.writeFileSync(`${shots}/v4-check-report.json`, JSON.stringify({checks, ...data, errors}, null, 2));
  console.log(JSON.stringify({...data, errors, screenshots: shots}, null, 2));
  failed = errors.length > 0 || checks.some(c => !c.ok);
} finally {
  await browser.close();
  await server.close();
}
process.exitCode = failed ? 1 : 0;
