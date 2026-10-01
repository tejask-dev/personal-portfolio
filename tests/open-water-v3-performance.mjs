/**
 * Isolated desktop Chrome performance/delivery evidence; no production setters.
 * Build separately to avoid changing docs/ while other agents review it:
 * npx vite build --outDir /tmp/open-water-v3-performance --emptyOutDir
 * node --experimental-strip-types scripts/prerender.ts --out-dir /tmp/open-water-v3-performance
 * npx vite preview --port 4176 --strictPort --outDir /tmp/open-water-v3-performance
 * QA_URL=http://127.0.0.1:4176 node tests/open-water-v3-performance.mjs
 * QA_SAMPLE_MS defaults to the spec's 120000ms per scene. Short probes are
 * explicitly labelled and do not establish its sustained-performance target.
 */
import assert from "node:assert/strict";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import path from "node:path";
import os from "node:os";
import { createServer } from "vite";
import { Box3, Group, Mesh, MeshStandardMaterial, SphereGeometry } from "three";

const url = process.env.QA_URL || "http://127.0.0.1:4176";
const sampleMs = Number(process.env.QA_SAMPLE_MS || 120000);
const buildDirectory = path.resolve(process.env.QA_BUILD_DIR || "/tmp/open-water-v3-performance");
const output = path.resolve("design/open-water-v3/implementation-qa");
const label = process.env.QA_BUILD_LABEL || "isolated production snapshot";
const reportPath = path.join(output, path.basename(process.env.QA_REPORT_NAME || "performance-results.json"));
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const percentile = (values, p) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length ? sorted[Math.max(0, Math.ceil(sorted.length * p) - 1)] : null;
};
const rounded = n => n == null ? n : Math.round(n * 100) / 100;
const report = {
  at: new Date().toISOString(), url, label, buildDirectory, sampleMs,
  completed: false,
  scope: "One physical Mac host, automated desktop Chrome. Phone is 390px viewport/touch/DPR emulation on the same desktop GPU, not a physical mobile-device or thermal result. No CPU or network throttling. Render submission intervals are observed, not GPU timer queries or user-comprehension evidence.",
  host: { platform: process.platform, architecture: process.arch, cpu: os.cpus()[0]?.model, logicalCpus: os.cpus().length },
  measurements: [], checks: [], screenshots: [], artifacts: [], findings: [],
};
await mkdir(output, { recursive: true });
const flush = () => writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
const browser = await chromium.launch({ channel: "chrome", headless: true });
report.browser = browser.version();

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? files(path.join(directory, entry.name)) : path.join(directory, entry.name)))).flat();
}
async function inventory() {
  const entries = await files(buildDirectory);
  for (const filename of entries.filter(name => /\.(?:js|css|glb|gltf|png|jpe?g|webp|woff2?|ttf|svg)$/i.test(name))) {
    const bytes = await readFile(filename);
    const item = { path: path.relative(buildDirectory, filename), bytes: bytes.length, gzipBytes: gzipSync(bytes).length, sha256: createHash("sha256").update(bytes).digest("hex") };
    // GLB structural evidence does not execute embedded code or external assets.
    if (filename.endsWith(".glb")) {
      const jsonLength = bytes.readUInt32LE(12);
      const gltf = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString("utf8"));
      item.geometryTriangles = (gltf.meshes || []).flatMap(mesh => mesh.primitives || []).reduce((total, primitive) => total + ((primitive.mode ?? 4) === 4 ? (gltf.accessors[primitive.indices ?? primitive.attributes.POSITION]?.count || 0) / 3 : 0), 0);
      item.meshTriangles = (gltf.meshes || []).map(mesh => ({ name: mesh.name, triangles: (mesh.primitives || []).reduce((total, primitive) => total + ((primitive.mode ?? 4) === 4 ? (gltf.accessors[primitive.indices ?? primitive.attributes.POSITION]?.count || 0) / 3 : 0), 0) }));
      item.meshes = gltf.meshes?.length || 0;
      item.materials = gltf.materials?.length || 0;
      item.textures = gltf.textures?.length || 0;
      item.bones = Math.max(0, ...(gltf.skins || []).map(skin => skin.joints.length));
      item.externalUris = [...(gltf.buffers || []), ...(gltf.images || [])].flatMap(asset => asset.uri ? [asset.uri] : []);
    }
    report.artifacts.push(item);
  }
  report.artifacts.sort((a, b) => b.bytes - a.bytes);
  const index = await readFile(path.join(buildDirectory, "index.html"));
  report.build = { indexSha256: createHash("sha256").update(index).digest("hex"), indexModified: (await stat(path.join(buildDirectory, "index.html"))).mtime.toISOString(), entryScripts: index.toString().match(/<script[^>]+src="[^"]+"[^>]*>/g) };
}
async function pageFor(options = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, ...options });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const errors = [], failedRequests = [], responses = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("requestfailed", request => failedRequests.push({ url: request.url(), error: request.failure()?.errorText }));
  page.on("response", response => responses.push({ url: response.url(), status: response.status(), encoding: response.headers()["content-encoding"] || "identity" }));
  await page.addInitScript(() => {
    const qa = window.__owPerf = { enabled: false, frames: [], longTasks: [], totalDraws: 0, totalTriangles: 0, stamp: 0, renderer: null };
    const nativeRaf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = callback => nativeRaf(timestamp => { qa.stamp = timestamp; callback(timestamp); });
    const countTriangles = (gl, mode, count, instances = 1) => mode === gl.TRIANGLES ? count / 3 * instances : mode === gl.TRIANGLE_STRIP || mode === gl.TRIANGLE_FAN ? Math.max(0, count - 2) * instances : 0;
    for (const Constructor of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
      if (!Constructor) continue;
      for (const method of ["drawArrays", "drawElements", "drawArraysInstanced", "drawElementsInstanced"]) {
        const native = Constructor.prototype[method];
        if (!native) continue;
        Constructor.prototype[method] = function(...args) {
          const result = Reflect.apply(native, this, args);
          const count = method.startsWith("drawArrays") ? args[2] : args[1];
          const instances = method.endsWith("Instanced") ? args[method.startsWith("drawArrays") ? 3 : 4] : 1;
          const triangles = countTriangles(this, args[0], count, instances);
          qa.totalDraws++; qa.totalTriangles += triangles;
          if (!qa.renderer) {
            const extension = this.getExtension("WEBGL_debug_renderer_info");
            qa.renderer = { vendor: extension ? this.getParameter(extension.UNMASKED_VENDOR_WEBGL) : this.getParameter(this.VENDOR), renderer: extension ? this.getParameter(extension.UNMASKED_RENDERER_WEBGL) : this.getParameter(this.RENDERER), webgl: this.getParameter(this.VERSION) };
          }
          if (qa.enabled) {
            let frame = qa.frames[qa.frames.length - 1];
            if (!frame || frame.stamp !== qa.stamp) {
              frame = { stamp: qa.stamp, firstAt: performance.now(), draws: 0, triangles: 0 };
              qa.frames.push(frame);
            }
            frame.draws++; frame.triangles += triangles;
          }
          return result;
        };
      }
    }
    try { new PerformanceObserver(list => { if (qa.enabled) qa.longTasks.push(...list.getEntries().map(entry => ({ start: entry.startTime, duration: entry.duration }))); }).observe({ type: "longtask", buffered: false }); } catch {}
  });
  return { page, context, errors, failedRequests, responses };
}
const scene = page => page.locator("#voyage");
const state = page => scene(page).evaluate(element => ({ ...element.dataset }));
async function boot(page) { await page.goto(url); await page.locator("#take-helm").waitFor(); await page.locator("#voyage.is-ready").waitFor({ timeout: 45000 }); }
async function screenshot(page, name) { const filename = path.join(output, `performance-${name}.png`); await page.screenshot({ path: filename }); report.screenshots.push(filename); }
async function resources(page) {
  return page.evaluate(() => ({
    navigation: performance.getEntriesByType("navigation").map(entry => ({ duration: entry.duration, domContentLoaded: entry.domContentLoadedEventEnd, transferSize: entry.transferSize, encodedBodySize: entry.encodedBodySize, decodedBodySize: entry.decodedBodySize })),
    resources: performance.getEntriesByType("resource").map(entry => ({ name: entry.name, type: entry.initiatorType, transferSize: entry.transferSize, encodedBodySize: entry.encodedBodySize, decodedBodySize: entry.decodedBodySize, duration: entry.duration, startTime: entry.startTime })),
    paint: performance.getEntriesByType("paint").map(entry => ({ name: entry.name, time: entry.startTime })),
    images: [...document.images].map(image => ({ src: image.currentSrc || image.src, loading: image.loading, complete: image.complete, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight, decodedRGBAEstimate: image.naturalWidth * image.naturalHeight * 4 })),
  }));
}
async function measure(page, name, tier, mode) {
  await wait(8000); // Exclude asset/entry warm-up from the sustained sample.
  const before = await state(page);
  await page.evaluate(() => { window.__owPerf.frames = []; window.__owPerf.longTasks = []; window.__owPerf.sampleStart = performance.now(); window.__owPerf.enabled = true; });
  const start = Date.now();
  const telemetry = [];
  let browserElapsed = 0;
  while (browserElapsed < sampleMs) {
    await wait(Math.min(10000, Math.max(1, sampleMs - browserElapsed)));
    telemetry.push(await state(page));
    browserElapsed = await page.evaluate(() => performance.now() - window.__owPerf.sampleStart);
    console.log(`SAMPLE ${name} ${Math.round(browserElapsed / 1000)}s browser/${Math.round((Date.now() - start) / 1000)}s wall ${telemetry.at(-1).quality} ${telemetry.at(-1).renderFps}fps ${telemetry.at(-1).renderDraws}draws ${telemetry.at(-1).renderTriangles}tri`);
  }
  const observed = await page.evaluate(() => { const qa = window.__owPerf; qa.enabled = false; return { sampleMs: performance.now() - qa.sampleStart, frames: qa.frames, longTasks: qa.longTasks, renderer: qa.renderer, canvas: [...document.querySelectorAll("canvas")].map(canvas => ({ width: canvas.width, height: canvas.height, cssWidth: canvas.clientWidth, cssHeight: canvas.clientHeight })) }; });
  const frames = observed.frames;
  const intervals = frames.slice(1).map((frame, i) => frame.stamp - frames[i].stamp).filter(value => value > 0);
  const triangleTarget = tier === "low" ? 180000 : mode === "surface" ? 400000 : 350000;
  const drawTarget = tier === "low" ? 80 : 130;
  const intervalTarget = tier === "low" ? 33.3 : 16.7;
  const measurement = {
    name, tier, mode, sampleMs: rounded(observed.sampleMs), wallSampleMs: Date.now() - start, sustainedSpecDuration: observed.sampleMs >= 120000, initialQuality: before.quality, finalQuality: (await state(page)).quality,
    renderedFrames: frames.length, fps: rounded(frames.length * 1000 / observed.sampleMs), interFrameFps: rounded(intervals.length * 1000 / intervals.reduce((a, b) => a + b, 0)),
    frameIntervalMs: { median: rounded(percentile(intervals, .5)), p95: rounded(percentile(intervals, .95)), p99: rounded(percentile(intervals, .99)), max: rounded(Math.max(...intervals)) },
    drawCalls: { median: percentile(frames.map(frame => frame.draws), .5), p95: percentile(frames.map(frame => frame.draws), .95), max: Math.max(...frames.map(frame => frame.draws)) },
    triangles: { median: percentile(frames.map(frame => frame.triangles), .5), p95: percentile(frames.map(frame => frame.triangles), .95), max: Math.max(...frames.map(frame => frame.triangles)) },
    longTasks: { count: observed.longTasks.length, totalMs: rounded(observed.longTasks.reduce((sum, task) => sum + task.duration, 0)), maxMs: rounded(Math.max(0, ...observed.longTasks.map(task => task.duration))) },
    targets: { triangles: triangleTarget, drawCalls: drawTarget, p95FrameIntervalMs: intervalTarget, requestedQuality: tier },
    targetResults: { triangles: Math.max(...frames.map(frame => frame.triangles)) <= triangleTarget, drawCalls: Math.max(...frames.map(frame => frame.draws)) <= drawTarget, frameInterval: rounded(percentile(intervals, .95)) <= intervalTarget, requestedQuality: before.quality === tier && telemetry.every(entry => entry.quality === tier) },
    renderer: observed.renderer, canvas: observed.canvas, telemetry,
  };
  assert.ok(frames.length > 20, "Active rendering sample must contain real WebGL submissions");
  report.measurements.push(measurement);
  for (const [budget, passes] of Object.entries(measurement.targetResults)) {
    if (!passes) report.findings.push({ name, budget, status: "target-missed", sustainedSpecDuration: measurement.sustainedSpecDuration });
  }
  console.log(`MEASURED ${name} ${measurement.fps}fps p95=${measurement.frameIntervalMs.p95}ms draws=${measurement.drawCalls.max} triangles=${measurement.triangles.max}`);
  await flush();
  return measurement;
}
async function check(name, action) {
  if (process.env.QA_ONLY && !new RegExp(process.env.QA_ONLY, "i").test(name)) return;
  const started = Date.now();
  try { const details = await action(); report.checks.push({ name, status: "pass", durationMs: Date.now() - started, ...details }); console.log(`PASS ${name}`); }
  catch (error) { report.checks.push({ name, status: "fail", durationMs: Date.now() - started, error: error.stack }); console.error(`FAIL ${name}: ${error.message}`); }
  await flush();
}
async function quietCount(page, settleMs = 1200, windowMs = 1500) {
  await wait(settleMs);
  const before = await page.evaluate(() => window.__owPerf.totalDraws);
  await wait(windowMs);
  const after = await page.evaluate(() => window.__owPerf.totalDraws);
  return { draws: after - before, settleMs, windowMs };
}
async function access(page) {
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  return result.violations.map(violation => ({ id: violation.id, impact: violation.impact, targets: violation.nodes.map(node => node.target) }));
}

try {
  await inventory();
  await flush();
  await check("Fallback character batching, independent animation and resource ownership", async () => {
    const server = await createServer({ mode: "test", optimizeDeps: { noDiscovery: true, include: [], entries: [] }, server: { middlewareMode: true, watch: null }, appType: "custom", logLevel: "error" });
    let first, second;
    try {
      const { createFallbackCharacter, disposeCreature } = await server.ssrLoadModule("/src/features/open-water/scene/CharacterAsset.ts");
      const { createEnvironment } = await server.ssrLoadModule("/src/features/open-water/scene/materials.ts");
      first = createFallbackCharacter(createEnvironment());
      second = createFallbackCharacter(createEnvironment());
      const meshes = [], secondMeshes = [];
      first.group.traverse(object => { if (object.isMesh) meshes.push(object); });
      second.group.traverse(object => { if (object.isMesh) secondMeshes.push(object); });
      assert.equal(meshes.length, 4, "Rigid parts batch by material, with one separately animated tail batch");
      const geometries = new Set(meshes.map(mesh => mesh.geometry));
      const materials = new Set(meshes.map(mesh => mesh.material));
      assert.equal(geometries.size, 4); assert.equal(materials.size, 3);
      const triangles = meshes.reduce((sum, mesh) => sum + (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) / 3, 0);
      for (const geometry of geometries) {
        for (const attribute of [geometry.attributes.position, geometry.attributes.normal])
          assert.ok([...attribute.array].every(Number.isFinite), "Merged positions and normals stay finite");
      }
      assert.ok(secondMeshes.every(mesh => !geometries.has(mesh.geometry) && !materials.has(mesh.material)), "Separate creatures own separate GPU resources");
      const body = first.group.getObjectByName("Dakota-fallback-body");
      const tail = first.group.getObjectByName("Dakota-fallback-tail");
      assert.equal(tail.parent, body); assert.equal(tail.children.length, 1);
      const bounds = new Box3().setFromObject(first.group);
      first.update(.05, "escort");
      assert.ok(Math.abs(tail.rotation.x) > .001); assert.equal(body.rotation.x, 0);
      first.update(.05, "observing", true);
      assert.equal(tail.rotation.x, 0); assert.equal(body.rotation.x, .1);
      first.update(.05, "hidden"); assert.equal(first.group.visible, false);
      first.update(.05, "idle", true); assert.equal(first.group.visible, true);
      const disposals = new Map();
      for (const resource of [...geometries, ...materials]) resource.addEventListener("dispose", () => disposals.set(resource, (disposals.get(resource) || 0) + 1));
      first.dispose(); first.dispose(); first.update(.05, "escort");
      assert.equal(first.group.children.length, 0);
      assert.equal(disposals.size, 7); assert.ok([...disposals.values()].every(count => count === 1));
      second.update(.05, "escort"); assert.ok(second.group.children.length > 0);
      const sharedGeometry = new SphereGeometry(1, 8, 6), sharedMaterial = new MeshStandardMaterial();
      const owner = new Group(), original = new Mesh(sharedGeometry, sharedMaterial); owner.add(original, original.clone());
      let geometryDisposals = 0, materialDisposals = 0;
      sharedGeometry.addEventListener("dispose", () => geometryDisposals++);
      sharedMaterial.addEventListener("dispose", () => materialDisposals++);
      disposeCreature(owner);
      assert.equal(geometryDisposals, 1); assert.equal(materialDisposals, 1);
      return { meshes: meshes.length, triangles, materials: materials.size, independentlyAnimatedTail: true, idempotentAssetDisposal: true, sharedCloneResourcesDisposedOnce: true, bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() } };
    } finally { first?.dispose(); second?.dispose(); await server.close(); }
  });
  for (const device of [{ name: "desktop", tier: "high", options: { deviceScaleFactor: 2 } }, { name: "phone", tier: "low", options: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 } }]) {
    await check(`${device.name} opening and reef measurement`, async () => {
      const { page, context, errors, failedRequests, responses } = await pageFor(device.options);
      try {
        await boot(page);
        await page.waitForFunction(() => document.querySelector("#voyage")?.dataset.yachtModel === "licensed");
        await measure(page, `${device.name}-opening`, device.tier, "surface");
        await screenshot(page, `${device.name}-opening`);
        const opening = await resources(page);
        await page.getByRole("button", { name: /Or explore below/ }).click();
        await page.waitForFunction(() => document.querySelector("#voyage")?.dataset.mode === "reef");
        await page.waitForFunction(() => document.querySelector("#voyage")?.dataset.characterModel === "ready");
        await measure(page, `${device.name}-reef`, device.tier, "reef");
        await screenshot(page, `${device.name}-reef`);
        const underwater = await resources(page);
        const openingUrls = new Set(opening.resources.map(resource => resource.name));
        const deferred = underwater.resources.filter(resource => !openingUrls.has(resource.name));
        const encounterPeeks = [];
        for (const [button, id] of [["Fish school", "fish"], ["Camouflage", "camouflage"], ["Cleaner station", "cleaner"]]) {
          await page.locator(".exp-discovery-rail").getByRole("button", { name: new RegExp(button) }).click();
          const card = page.locator(`.exp-encounter-${id}`); await card.waitFor();
          if (id === "camouflage") await card.getByRole("button", { name: "Revealed", exact: true }).click();
          await wait(2000);
          await page.evaluate(() => { window.__owPerf.frames = []; window.__owPerf.enabled = true; });
          await wait(750);
          const frames = await page.evaluate(() => { window.__owPerf.enabled = false; return window.__owPerf.frames; });
          assert.ok(frames.length, "Full-motion encounter card should keep its scene observable");
          encounterPeeks.push({ id, quality: (await state(page)).quality, draws: Math.max(...frames.map(frame => frame.draws)), triangles: Math.max(...frames.map(frame => frame.triangles)), sampleMs: 750, sustainedPerformance: false });
          if (id === "camouflage") await screenshot(page, `${device.name}-octopus-card`);
          await card.getByRole("button", { name: /^Close / }).click();
        }
        const peekLimits = device.tier === "low" ? { draws: 80, triangles: 180000 } : { draws: 130, triangles: 350000 };
        const exceededPeeks = encounterPeeks.filter(peek => peek.draws > peekLimits.draws || peek.triangles > peekLimits.triangles);
        if (exceededPeeks.length) report.findings.push({ name: `${device.name} encounter cost peeks`, status: "target-missed", views: exceededPeeks });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        assert.deepEqual(errors, []);
        return { opening, deferred, deferredTransferBytes: deferred.reduce((sum, resource) => sum + resource.transferSize, 0), deferredEncodedBytes: deferred.reduce((sum, resource) => sum + resource.encodedBodySize, 0), encounterPeeks, failedRequests, responses };
      } finally { await context.close(); }
    });
  }
  for (const device of [
    { tier: "Low", name: "phone", width: 390, height: 844, options: { reducedMotion: "reduce", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 } },
    { tier: "High", name: "desktop", width: 1440, height: 900, options: { reducedMotion: "reduce", deviceScaleFactor: 2 } },
  ]) await check(`${device.tier} returned surface and opening cost`, async () => {
    const { page, context, errors } = await pageFor(device.options);
    const views = [];
    const capture = async (name, action) => {
      await page.evaluate(() => { window.__owPerf.frames = []; window.__owPerf.enabled = true; });
      await action(); await wait(1200);
      const frames = await page.evaluate(() => { window.__owPerf.enabled = false; return window.__owPerf.frames; });
      assert.ok(frames.length, "Returning to a saved mode must draw its final static view");
      const last = frames.at(-1);
      views.push({ name, draws: last.draws, triangles: last.triangles, state: await state(page) });
    };
    const redraw = async () => {
      await page.setViewportSize({ width: device.width + 1, height: device.height }); await wait(100);
      await page.setViewportSize({ width: device.width, height: device.height });
    };
    try {
      await boot(page);
      await page.waitForFunction(() => document.querySelector("#voyage")?.dataset.yachtModel === "licensed");
      await capture(`fresh ${device.tier} opening`, redraw);
      await screenshot(page, `${device.name}-opening`);
      const opening = await resources(page);
      await page.getByRole("button", { name: /Or explore below/ }).click();
      await page.waitForFunction(() => document.querySelector("#voyage")?.dataset.mode === "reef" && document.querySelector("#voyage")?.dataset.characterModel === "ready");
      await capture("reef with loaded wildlife and habitat", redraw);
      await screenshot(page, `${device.name}-reef`);
      const underwater = await resources(page);
      const openingUrls = new Set(opening.resources.map(resource => resource.name));
      const deferred = underwater.resources.filter(resource => !openingUrls.has(resource.name));
      await capture("surface after reef and rig load", () => page.locator("#back-opening").click());
      await capture("opening after reef and rig load", () => page.locator("#back-opening").click());
      assert.equal((await state(page)).mode, "surface");
      assert.ok(await page.locator("#take-helm").isVisible(), "Return to opening restores its public invitation even in Quiet mode");
      await screenshot(page, `${device.name}-returned-opening`);
      await page.locator("#take-helm").click();
      await page.getByRole("button", { name: /Quiet view \/ settings/ }).click();
      await page.getByRole("button", { name: "Enable motion", exact: true }).click();
      await page.getByRole("button", { name: /^Close settings/ }).click();
      if ((await state(page)).state === "PAUSED") await page.locator("#exp-resume").click();
      await page.locator("#yacht-controls").focus();
      const held = new Set();
      const keys = async wanted => {
        for (const key of held) if (!wanted.has(key)) { await page.keyboard.up(key); held.delete(key); }
        for (const key of wanted) if (!held.has(key)) { await page.keyboard.down(key); held.add(key); }
      };
      const approach = [], routeStart = await page.evaluate(() => performance.now());
      let arrived = false;
      await page.evaluate(() => { window.__owPerf.frames = []; window.__owPerf.enabled = true; });
      try {
        while (await page.evaluate(start => performance.now() - start < 45000, routeStart)) {
          const data = await state(page), x = Number(data.boatX), z = Number(data.boatZ);
          const distance = Math.hypot(x + 65, z + 15);
          approach.push({ x, z, distance, reportedDraws: Number(data.renderDraws), reportedTriangles: Number(data.renderTriangles) });
          if (distance < 7) { arrived = true; break; }
          const error = Math.atan2(Math.sin(Math.atan2(-65 - x, z + 15) - Number(data.boatHeading)), Math.cos(Math.atan2(-65 - x, z + 15) - Number(data.boatHeading)));
          const wanted = new Set(["w"]);
          if (error > .09) wanted.add("d"); else if (error < -.09) wanted.add("a");
          await keys(wanted); await wait(150);
        }
      } finally { await keys(new Set()); }
      assert.ok(arrived, "Real keyboard input reaches the reef surface vicinity");
      const frames = await page.evaluate(() => { window.__owPerf.enabled = false; return window.__owPerf.frames; });
      const approachCost = { draws: Math.max(...frames.map(frame => frame.draws)), triangles: Math.max(...frames.map(frame => frame.triangles)), route: approach };
      await capture("near reef surface paused", () => page.locator("#exp-resume").click());
      await screenshot(page, `${device.name}-near-reef-surface`);
      const limits = { draws: device.tier === "Low" ? 80 : 130, surfaceTriangles: device.tier === "Low" ? 180000 : 400000, reefTriangles: device.tier === "Low" ? 180000 : 350000 };
      const overBudget = views.filter(view => view.draws > limits.draws || view.triangles > (view.state.mode === "reef" ? limits.reefTriangles : limits.surfaceTriangles));
      if (approachCost.draws > limits.draws || approachCost.triangles > limits.surfaceTriangles) overBudget.push({ name: "real keyboard surface approach", draws: approachCost.draws, triangles: approachCost.triangles });
      if (overBudget.length) report.findings.push({ name: `${device.tier} returned surface and opening cost`, status: "target-missed", views: overBudget });
      assert.deepEqual(errors, []);
      assert.ok(views.every(view => view.state.quality === device.tier.toLowerCase()), "The requested quality tier must be retained for this budget comparison");
      assert.equal(overBudget.length, 0, "Fresh, loaded and approached public views must remain inside the declared draw/triangle budget");
      return { views, approachCost, overBudget, limits, opening, deferred, deferredTransferBytes: deferred.reduce((sum, resource) => sum + resource.transferSize, 0) };
    } finally { await context.close(); }
  });
  await check("Low public camera-view cost sweep", async () => {
    const { page, context, errors } = await pageFor({ reducedMotion: "reduce", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
    const views = [];
    const capture = async (name, action) => {
      await page.evaluate(() => { window.__owPerf.frames = []; window.__owPerf.enabled = true; });
      await action(); await wait(500);
      const frames = await page.evaluate(() => { window.__owPerf.enabled = false; return window.__owPerf.frames; });
      assert.ok(frames.length, `Static choice ${name} should draw its new view`);
      const last = frames.at(-1);
      views.push({ name, draws: last.draws, triangles: last.triangles, state: await state(page) });
    };
    try {
      await boot(page); await page.waitForFunction(() => document.querySelector("#voyage")?.dataset.yachtModel === "licensed"); await wait(500);
      await capture("surface aerial at home", () => page.locator("#take-helm").click());
      await capture("surface follow at home", () => page.locator(".exp-bottom-controls").getByRole("button", { name: /^Aerial/ }).click());
      await page.locator(".exp-discovery-rail").getByRole("button", { name: /Explore reef/ }).click();
      await page.waitForFunction(() => document.querySelector("#voyage")?.dataset.characterModel === "ready");
      await page.locator(".exp-position summary").click();
      const names = await page.locator(".exp-viewpoints button").allTextContents();
      for (const name of names) await capture(`reef ${name}`, () => page.locator(".exp-viewpoints").getByRole("button", { name, exact: true }).click());
      const overBudget = views.filter(view => view.draws > 80 || view.triangles > 180000);
      if (overBudget.length) report.findings.push({ name: "Low public camera-view cost sweep", status: "target-missed", views: overBudget });
      assert.deepEqual(errors, []);
      return { views, overBudget, limits: "Representative public camera choices only; not an exhaustive maximum over every navigable position." };
    } finally { await context.close(); }
  });
  await check("Quiet, pause, offscreen and visibility-handler render suspension", async () => {
    const { page, context, errors } = await pageFor({ reducedMotion: "reduce" });
    try {
      await boot(page); await wait(3000);
      const quiet = await quietCount(page);
      assert.equal(quiet.draws, 0, "Initial reduced-motion view must not keep drawing");
      await page.getByRole("button", { name: /Or explore below/ }).click();
      await page.waitForFunction(() => document.querySelector("#voyage")?.dataset.characterModel === "ready");
      const reefQuiet = await quietCount(page);
      assert.equal(reefQuiet.draws, 0);
      await page.getByRole("button", { name: /Quiet view \/ settings/ }).click();
      await page.getByRole("button", { name: "Enable motion", exact: true }).click();
      await page.getByRole("button", { name: /^Close settings/ }).click();
      if ((await state(page)).state === "PAUSED") await page.locator("#exp-resume").click();
      await wait(1000);
      const activeBefore = await page.evaluate(() => window.__owPerf.totalDraws); await wait(500);
      assert.ok(await page.evaluate(before => window.__owPerf.totalDraws > before, activeBefore));
      await page.locator("#exp-resume").click();
      const paused = await quietCount(page);
      assert.equal(paused.draws, 0);
      await page.locator("#exp-resume").click();
      await page.locator("#contact").scrollIntoViewIfNeeded();
      const offscreen = await quietCount(page);
      assert.equal(offscreen.draws, 0);
      await page.evaluate(() => window.scrollTo(0, 0)); await wait(500);
      // Headless Chrome reports all pages visible even after bringToFront.
      // Exercise the real application listener via a synthetic visibility event;
      // this is explicitly not native background-tab scheduling evidence.
      await page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, get: () => true }); document.dispatchEvent(new Event("visibilitychange")); });
      const hiddenHandler = await quietCount(page);
      assert.equal(hiddenHandler.draws, 0);
      await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event("visibilitychange")); });
      assert.deepEqual(errors, []);
      return { quiet, reefQuiet, paused, offscreen, hiddenHandler, hiddenEvidence: "Synthetic document.hidden + visibilitychange exercises application listener. Headless tab focus did not create native visibility changes, so real background-tab scheduling is unverified." };
    } finally { await context.close(); }
  });
  await check("Initial HTML, five static cases and opening accessibility", async () => {
    const { page, context, errors } = await pageFor({ javaScriptEnabled: false, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    try {
      await page.goto(url);
      assert.ok(await page.locator('a[href^="mailto:"]').count() > 0);
      const routes = [...new Set(await page.locator('a[href*="/case-studies/"]').evaluateAll(links => links.map(link => link.getAttribute("href"))))];
      assert.equal(routes.length, 5);
      assert.equal(await page.locator("canvas").count(), 0);
      const missingImages = [];
      for (const route of routes) {
        await page.goto(new URL(route, url).href); await page.locator("h1").waitFor();
        assert.ok(await page.locator('a[href^="mailto:"]').count() > 0);
        const failures = await page.locator("img").evaluateAll(images => images.filter(image => image.complete && !image.naturalWidth).map(image => image.src));
        missingImages.push(...failures);
      }
      assert.deepEqual(missingImages, []); assert.deepEqual(errors, []);
      await context.close();
      const live = await pageFor({ reducedMotion: "reduce", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
      try { await boot(live.page); const violations = await access(live.page); assert.deepEqual(violations.filter(violation => ["serious", "critical"].includes(violation.impact)), []); return { routes, violations, limitation: "Automated axe scan, not screen-reader/manual accessibility acceptance." }; }
      finally { await live.context.close(); }
    } finally { await context.close(); }
  });
  await check("Blocked yacht and wildlife retain reading, reef and return", async () => {
    const { page, context, errors, failedRequests } = await pageFor({ reducedMotion: "reduce" });
    try {
      await page.route(/\.(?:glb|gltf)(?:\?|$)/, route => route.abort("failed"));
      await boot(page); await page.waitForFunction(() => document.querySelector("#voyage")?.dataset.yachtModel === "procedural");
      await page.getByRole("button", { name: /Or explore below/ }).click();
      await page.waitForFunction(() => document.querySelector("#voyage")?.dataset.mode === "reef" && document.querySelector("#voyage")?.dataset.characterModel === "fallback");
      await page.locator(".exp-nav").getByRole("button", { name: /^Work/ }).click();
      assert.equal(new Set(await page.locator('dialog[open] .exp-work-list a[href*="/case-studies/"]').evaluateAll(links => links.map(link => link.getAttribute("href")))).size, 5);
      await page.getByRole("button", { name: /^Close work/ }).click();
      await page.locator(".exp-nav").getByRole("button", { name: /^Return to boat/ }).click();
      assert.equal((await state(page)).mode, "surface");
      assert.deepEqual(errors, []);
      return { expectedFaults: failedRequests, state: await state(page) };
    } finally { await context.close(); }
  });
  await check("Unavailable scene chunk retains immediate work and contact", async () => {
    const { page, context, errors, failedRequests } = await pageFor({ reducedMotion: "reduce" });
    try {
      await page.route(/OpenWaterScene-[^/]+\.js(?:\?|$)/, route => route.abort("failed"));
      await page.goto(url); await page.locator("#take-helm").waitFor();
      await page.waitForFunction(() => document.querySelector("#voyage")?.dataset.state === "FALLBACK");
      await page.locator(".exp-nav").getByRole("button", { name: /^Work/ }).click();
      assert.equal(new Set(await page.locator('dialog[open] .exp-work-list a[href*="/case-studies/"]').evaluateAll(links => links.map(link => link.getAttribute("href")))).size, 5);
      await page.getByRole("button", { name: /^Close work/ }).click();
      await page.locator(".exp-nav").getByRole("button", { name: /^Contact/ }).click();
      assert.ok(await page.locator('dialog[open] a[href^="mailto:"]').count() > 0);
      return { expectedFaults: failedRequests, pageErrors: errors };
    } finally { await context.close(); }
  });
} finally {
  await browser.close();
  report.completed = true;
  await flush();
  console.log(`Report: ${reportPath}`);
}
if (report.checks.some(check => check.status === "fail")) process.exitCode = 1;
