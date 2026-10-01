/** Read-only rendered companion regression. Public controls own all movement.
 * QA_URL=http://127.0.0.1:4175/ node tests/open-water-v4-swimming-browser.mjs
 * SWIM_CASE=phone-nemo narrows the run. Do not run beside performance sampling.
 * Root translation, camera motion and water pixels cannot satisfy deformation.
 */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const url = process.env.QA_URL || process.env.BASE_URL || "http://127.0.0.1:4175/";
const output = path.resolve(process.env.QA_OUTPUT || "design/open-water-v4/implementation-qa/swimming");
const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
await mkdir(output, { recursive: true });
const report = { at: new Date().toISOString(), url, scope: "Public input; actual rendered CPU vertex positions, root-relative deformation, camera-projected displacement, collision bounds and pause/Quiet/resume. Desktop Chrome with phone viewport emulation, not a physical device or performance benchmark.", checks: [], screenshots: [], videos: [] };

// Observe the existing React renderer through its developer-tools protocol.
// We never invoke the model animation, renderer, clock, navigation or store setters.
function installReadOnlyInspector() {
  const roots = new Set();
  const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
  if (hook) {
    const previous = hook.onCommitFiberRoot;
    hook.onCommitFiberRoot = function (id, root, ...rest) { roots.add(root); return previous?.call(this, id, root, ...rest); };
  } else {
    let next = 0;
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = { supportsFiber: true, renderers: new Map(), inject(renderer) { const id = ++next; this.renderers.set(id, renderer); return id; }, onCommitFiberRoot(_id, root) { roots.add(root); }, onCommitFiberUnmount() {}, onPostCommitFiberRoot() {} };
  }
  const references = new Map();
  function store() {
    const seen = new Set(), queue = [...roots].map(root => root.current);
    while (queue.length && seen.size < 25000) {
      const fiber = queue.pop();
      if (!fiber || seen.has(fiber)) continue;
      seen.add(fiber); queue.push(fiber.child, fiber.sibling);
      const candidates = [fiber.memoizedProps?.value, fiber.memoizedProps?.store, fiber.memoizedState?.memoizedState];
      for (const candidate of candidates) {
        if (typeof candidate?.getState !== "function") continue;
        const value = candidate.getState();
        if (value?.scene?.isScene && value?.camera?.isCamera && value?.gl?.domElement?.tagName === "CANVAS") return value;
      }
    }
    throw new Error("Read-only Three store not found through mounted React providers. Update this test adapter; do not replace the deformation gate with whole-canvas difference.");
  }
  window.__owSwimmingProbe = {
    reset(actor) { references.delete(actor); },
    sample(actor) {
      const state = store(), model = state.scene.getObjectByName(`companion-${actor}`);
      if (!model) throw new Error(`Rendered companion-${actor} not found`);
      const camera = state.camera, canvas = state.gl.domElement, rect = canvas.getBoundingClientRect();
      const inverse = model.matrixWorld.clone().invert();
      const project = point => {
        const p = point.clone().project(camera);
        return [(p.x + 1) * rect.width / 2 + rect.x, (1 - p.y) * rect.height / 2 + rect.y, p.z];
      };
      const visible = object => { for (let current = object; current; current = current.parent) if (!current.visible) return false; return true; };
      const points = [], allLocal = [], screen = [];
      let clock = null, population = 0, triangles = 0;
      state.scene.traverse(object => {
        if (object.name === `companion-${actor}`) population++;
        const material = Array.isArray(object.material) ? object.material[0] : object.material;
        if (clock === null && Number.isFinite(material?.uniforms?.uTime?.value)) clock = material.uniforms.uTime.value;
      });
      model.traverse(mesh => {
        if (!mesh.isMesh || !mesh.geometry?.attributes?.position) return;
        const attribute = mesh.geometry.attributes.position;
        triangles += (mesh.geometry.index?.count ?? attribute.count) / 3;
        const kind = mesh.name === `${actor}-tail-fin` ? "tail" : mesh.name === `${actor}-rear-skin` ? "body" : null;
        const stride = Math.max(1, Math.floor(attribute.count / 64));
        for (let i = 0; i < attribute.count; i++) {
          const world = camera.position.clone().set(attribute.getX(i), attribute.getY(i), attribute.getZ(i));
          if (mesh.isSkinnedMesh) mesh.applyBoneTransform(i, world);
          world.applyMatrix4(mesh.matrixWorld);
          const local = world.clone().applyMatrix4(inverse);
          allLocal.push(local.toArray()); screen.push(project(world));
          if (kind && i % stride === 0) points.push({ id: `${mesh.name}:${i}`, kind, local: local.toArray(), screen: project(world) });
        }
      });
      if (!points.some(point => point.kind === "tail") || !points.some(point => point.kind === "body")) throw new Error("Authored tail and rear-body position attributes are required");
      if (!references.has(actor)) references.set(actor, new Map(points.map(point => [point.id, point.local])));
      const reference = references.get(actor), displacement = { tail: 0, body: 0, tailPixels: 0, bodyPixels: 0 };
      for (const point of points) {
        const old = reference.get(point.id);
        if (!old) throw new Error("Companion topology changed during one measurement");
        const delta = Math.hypot(...point.local.map((value, axis) => value - old[axis]));
        // Project the undeformed reference through the CURRENT root transform and
        // camera. Subtracting this counterfactual removes navigation and follow-camera movement.
        const rigid = project(camera.position.clone().fromArray(old).applyMatrix4(model.matrixWorld));
        const pixels = Math.hypot(point.screen[0] - rigid[0], point.screen[1] - rigid[1]);
        displacement[point.kind] = Math.max(displacement[point.kind], delta);
        displacement[`${point.kind}Pixels`] = Math.max(displacement[`${point.kind}Pixels`], pixels);
      }
      const xs = screen.map(p => p[0]), ys = screen.map(p => p[1]);
      const z = allLocal.map(p => p[2]);
      return {
        actor, population, visible: visible(model), controlled: model.userData.controlled,
        frame: state.gl.info.render.frame, clock, triangles,
        root: model.getWorldPosition(camera.position.clone()).toArray(),
        geometry: points.map(point => point.local), displacement,
        envelope: model.userData.collisionEnvelope,
        radial: Math.max(...allLocal.map(p => Math.hypot(p[0], p[2]))), vertical: Math.max(...allLocal.map(p => Math.abs(p[1]))),
        length: Math.max(...z) - Math.min(...z),
        screen: { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys), inClip: screen.every(p => p[2] > -1 && p[2] < 1), viewport: [innerWidth, innerHeight] },
      };
    },
  };
}

const browser = await chromium.launch({ channel: "chrome", headless: true });
report.browser = browser.version();
const state = page => page.locator("#voyage").evaluate(element => ({ actor: element.dataset.actor, mode: element.dataset.mode, status: element.dataset.state }));
const sample = (page, actor) => page.evaluate(actor => window.__owSwimmingProbe.sample(actor), actor);
async function deck(page, name) {
  const button = page.getByTestId(`voyage-${name}`);
  if (await button.getAttribute("aria-expanded") !== "true") await button.click();
}
async function closeDeck(page) {
  const button = page.getByRole("button", { name: "Close expedition panel", exact: true });
  if (await button.isVisible()) await button.click();
}
async function screenshot(page, name) {
  const file = path.join(output, `${name}.png`);
  await page.screenshot({ path: file }); report.screenshots.push(file);
}
function assertBounds(samples) {
  for (const s of samples) {
    assert.equal(s.population, 1, "Exactly one model owns the named actor");
    assert.equal(s.controlled, true); assert.equal(s.visible, true, "Controlled fish must actually be visible in open water");
    assert.ok(s.radial <= s.envelope.horizontal + 0.001 && s.vertical <= s.envelope.vertical + 0.001, "Every actual animated vertex fits the navigation envelope");
    assert.ok(s.screen.inClip, "Animated fish geometry must remain in the camera clip range");
    assert.ok(s.screen.left >= 0 && s.screen.right <= s.screen.viewport[0] && s.screen.top >= 0 && s.screen.bottom <= s.screen.viewport[1], "Whole controlled fish fits the viewport");
    assert.ok(Math.max(s.screen.right - s.screen.left, s.screen.bottom - s.screen.top) >= 24, "Fish must occupy at least 24 CSS pixels to read its swimming");
  }
}
async function collectMovement(page, actor, mobile) {
  await page.evaluate(actor => window.__owSwimmingProbe.reset(actor), actor);
  const samples = [await sample(page, actor)];
  if (!mobile) { await page.locator("#yacht-controls").focus(); await page.keyboard.down("w"); }
  try {
    for (let i = 0; i < 24; i++) {
      if (mobile && i % 2 === 0) {
        await page.getByRole("button", { name: "Swim forward", exact: true }).tap();
        assert.notEqual((await state(page)).status, "PAUSED", "Motion-mode touch swimming must not silently switch to paused still steps");
      }
      await wait(65); samples.push(await sample(page, actor));
    }
  } finally { if (!mobile) await page.keyboard.up("w"); }
  assertBounds(samples);
  const peak = field => Math.max(...samples.map(s => s.displacement[field]));
  assert.ok(samples.at(-1).frame > samples[0].frame, "Real scene frames must have rendered");
  assert.ok(samples[0].clock !== null && samples.at(-1).clock > samples[0].clock, "The shared scene clock must advance during swimming");
  assert.ok(Math.hypot(...samples.at(-1).root.map((value, i) => value - samples[0].root[i])) > 0.25, "Public input must move the actual actor, not only animate a stationary display");
  assert.ok(peak("tail") / samples[0].length >= 0.025, "Tail must deform at least 2.5% of visible body length after removing root travel");
  assert.ok(peak("body") / samples[0].length >= 0.005, "The body must flex as well as the tail");
  assert.ok(peak("tailPixels") >= 3, "Tail deformation must produce at least 3 CSS pixels of visible projected movement");
  assert.ok(peak("bodyPixels") >= 1, "Body deformation must produce at least 1 CSS pixel of projected movement");
  return { frames: samples.at(-1).frame - samples[0].frame, sceneSeconds: samples.at(-1).clock - samples[0].clock, peakTailCssPixels: peak("tailPixels"), peakBodyCssPixels: peak("bodyPixels"), peakTailLengthRatio: peak("tail") / samples[0].length, peakBodyLengthRatio: peak("body") / samples[0].length, maximumRadial: Math.max(...samples.map(s => s.radial)), maximumVertical: Math.max(...samples.map(s => s.vertical)), first: samples[0], last: samples.at(-1) };
}
async function assertStill(page, actor, label) {
  await wait(500);
  const before = await sample(page, actor), pixels = await page.locator(".exp-scene canvas").screenshot();
  await wait(450);
  const after = await sample(page, actor);
  assert.deepEqual(after.geometry, before.geometry, `${label}: CPU deformation cannot run on a second clock`);
  assert.deepEqual(after.root, before.root, `${label}: actor cannot drift`);
  assert.equal(after.clock, before.clock, `${label}: scene time must stay frozen`);
  assert.ok(pixels.equals(await page.locator(".exp-scene canvas").screenshot()), `${label}: actual rendered canvas must remain still`);
  return { clock: after.clock, frame: after.frame, geometryAndPixelsHeld: true };
}

try {
  const html = await (await fetch(url)).text();
  report.entryAssets = [...html.matchAll(/(?:src|href)="([^"]*\/assets\/[^"?#]+\.(?:js|css))"/g)].map(match => match[1]);
  for (const viewport of [{ name: "desktop", width: 1440, height: 960, mobile: false }, { name: "phone", width: 390, height: 844, mobile: true }]) for (const actor of ["nemo", "dory"]) {
    const name = `${viewport.name}-${actor}`;
    if (process.env.SWIM_CASE && !name.includes(process.env.SWIM_CASE)) continue;
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, isMobile: viewport.mobile, hasTouch: viewport.mobile, reducedMotion: "no-preference", recordVideo: { dir: path.join(output, "video"), size: { width: viewport.width, height: viewport.height } } });
    await context.addInitScript(installReadOnlyInspector);
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
    page.setDefaultTimeout(25000);
    try {
      await page.goto(url); await page.locator("#voyage.is-ready").waitFor({ timeout: 45000 });
      await page.locator("#take-helm").click();
      await deck(page, "chart"); await page.getByTestId("region-crown").click();
      await page.waitForFunction(() => document.querySelector("#voyage")?.dataset.mode === "reef");
      await page.locator(".exp-dive-curtain").waitFor({ state: "hidden" });
      await deck(page, "fish"); await page.getByTestId(`swim-${actor}`).click(); await closeDeck(page);
      assert.equal((await state(page)).actor, actor);
      if ((await page.locator("#exp-resume").innerText()).trim() === "Resume") await page.locator("#exp-resume").click();
      await page.waitForFunction(actor => {
        try { const sample = window.__owSwimmingProbe.sample(actor); return sample.controlled && sample.visible; }
        catch { return false; }
      }, actor);
      const moving = await collectMovement(page, actor, viewport.mobile); await screenshot(page, `${name}-swimming`);
      await page.locator("#yacht-controls").focus(); await page.keyboard.press("Escape");
      const pause = await assertStill(page, actor, "Pause"); await screenshot(page, `${name}-paused`);
      assert.equal((await page.locator("#exp-resume").innerText()).trim(), "Resume", "Escape must expose an explicit Resume control");
      await page.locator("#exp-resume").click();
      const resumed = await collectMovement(page, actor, viewport.mobile);
      await page.getByRole("button", { name: "Motion / settings", exact: true }).click();
      await page.getByRole("button", { name: "Use Quiet view", exact: true }).click();
      await page.locator("dialog[open]").getByRole("button", { name: /^Close / }).click();
      const quiet = await assertStill(page, actor, "Quiet view");
      const beforeQuietStep = await sample(page, actor);
      const rise = page.getByRole("button", { name: "Rise", exact: true });
      if (viewport.mobile) await rise.tap(); else await rise.click();
      await page.waitForFunction(({ actor, previous }) => {
        const current = window.__owSwimmingProbe.sample(actor).root;
        return Math.hypot(...current.map((value, i) => value - previous[i])) > 0.1;
      }, { actor, previous: beforeQuietStep.root });
      const quietStep = await assertStill(page, actor, "Quiet deliberate step"); await screenshot(page, `${name}-quiet`);
      assert.deepEqual(errors, []);
      report.checks.push({ name, passed: true, moving, pause, resumed, quiet, quietStep });
      console.log(`PASS ${name}: tail ${moving.peakTailCssPixels.toFixed(2)}px, body ${moving.peakBodyCssPixels.toFixed(2)}px, pause/Quiet held`);
    } catch (error) {
      report.checks.push({ name, passed: false, error: error.stack, errors });
      await screenshot(page, `${name}-failure`).catch(() => {});
      console.error(`FAIL ${name}: ${error.message}`);
    } finally {
      const video = page.video(); await context.close();
      if (video) report.videos.push(await video.path());
    }
  }
} finally {
  await browser.close();
  report.passed = report.checks.length > 0 && report.checks.every(check => check.passed);
  await writeFile(path.join(output, "report.json"), JSON.stringify(report, null, 2));
}
if (!report.passed) process.exitCode = 1;
