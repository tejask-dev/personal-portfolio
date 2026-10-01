/** Independent V3 integration checks. Uses a separate headless browser, never
 * the user's Chrome session. Run against a built preview for release evidence:
 * QA_URL=http://127.0.0.1:4173 node tests/open-water-v3-browser.mjs
 * The preview must include scripts/prerender.ts output for no-JavaScript checks.
 * Dev-server/HMR runs are explicitly marked provisional in the report.
 */
import assert from "node:assert/strict";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const url = process.env.QA_URL || "http://127.0.0.1:4173";
const output = path.resolve(process.env.QA_OUTPUT || "design/open-water-v3/implementation-qa");
const reportName = path.basename(process.env.QA_REPORT_NAME || "browser-report.json");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const report = { at: new Date().toISOString(), url, build: process.env.QA_BUILD_LABEL || "development/HMR — provisional", browser: browser.version(), scope: "Separate automated desktop Chrome; viewport emulation, not physical phones, screen-reader users, or thermal/performance acceptance.", checks: [], screenshots: [] };
report.entryAssets = [...(await (await fetch(url)).text()).matchAll(/(?:src|href)="([^"]*\/assets\/[^"?#]+\.(?:js|css))"/g)].map(match => match[1]);
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const dialog = page => page.locator("dialog[open]");
const nav = page => page.locator(".exp-nav");
const state = page => page.locator("#voyage").evaluate(el => ({ mode: el.dataset.mode, status: el.dataset.state, x: +el.dataset.boatX, z: +el.dataset.boatZ, heading: +el.dataset.boatHeading, speed: +el.dataset.boatSpeed, rx: +el.dataset.reefX, rz: +el.dataset.reefZ, ry: +el.dataset.reefY, phase: el.dataset.racePhase, elapsed: +el.dataset.raceElapsed, checkpoint: +el.dataset.raceCheckpoint }));
async function waitForState(page, predicate, description, timeout = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const s = await state(page);
    if (predicate(s)) return s;
    await delay(100);
  }
  throw new Error(`${description}; last state ${JSON.stringify(await state(page))}`);
}
async function screenshot(page, name) {
  const file = path.join(output, `${name}.png`);
  await page.screenshot({ path: file });
  report.screenshots.push(file);
}
async function makePage(options = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...options });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.addInitScript(() => {
    const originalCreate = URL.createObjectURL.bind(URL), originalRevoke = URL.revokeObjectURL.bind(URL);
    window.__qaPhotoUrls = new Set();
    URL.createObjectURL = blob => { const result = originalCreate(blob); if (blob.type === "image/png") window.__qaPhotoUrls.add(result); return result; };
    URL.revokeObjectURL = value => { window.__qaPhotoUrls.delete(value); return originalRevoke(value); };
  });
  return { page, context, errors };
}
async function openMap(page) { await nav(page).getByRole("button", { name: /^Map/ }).click(); }
async function chooseEncounter(page, name) { await dialog(page).locator(".exp-encounter-grid").getByRole("button", { name }).click(); }
async function close(page) { await dialog(page).getByRole("button", { name: /^Close / }).click(); }
async function boot(page) { await page.goto(url); await page.locator("#take-helm").waitFor(); }
async function sceneReady(page) { await page.locator("#voyage.is-ready").waitFor({ timeout: 30000 }); }
// React and the R3F root commit separately. Wait for scheduled scroll/focus and
// final pause telemetry before assessing a settled state; never mutate either.
async function committedFrames(page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
async function photoPreviewReady(page) {
  await page.waitForFunction(() => {
    const canvas = document.querySelector("dialog[open] .exp-photo-preview canvas");
    return canvas instanceof HTMLCanvasElement && canvas.width > 300 && canvas.height > 150;
  });
}
async function check(name, body) {
  if (process.env.QA_ONLY && !new RegExp(process.env.QA_ONLY, "i").test(name)) return;
  const start = Date.now();
  try { const result = await body(); report.checks.push({ name, status: "pass", durationMs: Date.now() - start, ...result }); console.log(`PASS ${name}`); }
  catch (e) { report.checks.push({ name, status: "fail", durationMs: Date.now() - start, error: e.stack }); console.error(`FAIL ${name}: ${e.message}`); }
}

try {
  await check("surface course pauses across reading; reef/case/return preserves the boat", async () => {
    const { page, context, errors } = await makePage();
    try {
      await boot(page); await sceneReady(page); await page.locator("#take-helm").click();
      await openMap(page);
      await dialog(page).locator(".exp-map-destinations > div").filter({ hasText: "Anticipy" }).getByRole("button", { name: "Sail there", exact: true }).click();
      await waitForState(page, s => s.speed > 1, "Course never started");
      await nav(page).getByRole("button", { name: /^Work/ }).click();
      const reading = await state(page); await delay(450);
      assert.deepEqual(await state(page), reading, "Reading must freeze simulation telemetry");
      await close(page); const closed = await state(page); await delay(450);
      assert.equal((await state(page)).status, "PAUSED");
      assert.equal((await state(page)).x, closed.x); assert.equal((await state(page)).z, closed.z);
      await page.locator(".exp-discovery-rail").getByRole("button", { name: /Explore reef/ }).click();
      await waitForState(page, s => s.mode === "reef", "Dive did not commit");
      const saved = { x: closed.x, z: closed.z, heading: closed.heading };
      await nav(page).getByRole("button", { name: /^Work/ }).click();
      await dialog(page).locator('a[href$="/case-studies/docubridge"]').click();
      await page.waitForURL(/\/case-studies\/docubridge/);
      await page.getByRole("link", { name: "Return to water", exact: true }).first().click();
      await waitForState(page, s => s.mode === "reef" && s.status === "PAUSED", "Case return lost the paused reef");
      await nav(page).getByRole("button", { name: /^Return to boat/ }).click();
      const returned = await waitForState(page, s => s.mode === "surface", "Return did not restore surface");
      assert.deepEqual({ x: returned.x, z: returned.z, heading: returned.heading }, saved);
      assert.equal(returned.speed, 0); assert.equal(returned.status, "PAUSED");
      await delay(450); assert.deepEqual(await state(page), returned, "Return cannot replay old course or held input");
      await screenshot(page, "surface-restored-after-reef-case");
      assert.deepEqual(errors, []);
      return { saved, returned, evidence: "Public controls and route navigation; telemetry is read-only." };
    } finally { await context.close(); }
  });

  await check("race reading, refused dive and close preserve the attempt until explicit Resume", async () => {
    const { page, context, errors } = await makePage();
    try {
      await boot(page); await sceneReady(page); await page.locator("#take-helm").click(); await openMap(page);
      await chooseEncounter(page, /Take the long way/);
      await dialog(page).getByRole("button", { name: "Start Reef slalom", exact: true }).click();
      await waitForState(page, s => s.phase === "racing" && s.elapsed > 0.1, "Race did not start", 15000);
      await openMap(page); await committedFrames(page); const paused = await state(page); await delay(450);
      assert.equal((await state(page)).elapsed, paused.elapsed);
      await chooseEncounter(page, /Below the surface/);
      assert.equal((await state(page)).mode, "surface"); assert.equal((await state(page)).phase, "racing");
      await close(page); await delay(450); assert.equal((await state(page)).elapsed, paused.elapsed);
      await page.locator("#exp-resume").click();
      await waitForState(page, s => s.elapsed > paused.elapsed + 0.2, "Explicit Resume did not continue the attempt");
      await openMap(page); await dialog(page).getByRole("button", { name: "Free sail", exact: true }).click();
      assert.equal((await state(page)).phase, "idle"); assert.equal((await state(page)).mode, "surface");
      assert.deepEqual(errors, []);
      return { preservedElapsed: paused.elapsed };
    } finally { await context.close(); }
  });

  await check("all twelve encounters have usable controls, with bounded photo previews", async () => {
    const { page, context, errors } = await makePage();
    try {
      await boot(page); await sceneReady(page); await page.locator("#take-helm").click(); await openMap(page);
      assert.equal(await dialog(page).locator(".exp-encounter-grid button").count(), 12);
      await chooseEncounter(page, /Meet Dakota/);
      const card = page.locator(".exp-encounter-card");
      assert.match(await card.innerText(), /Reef guide. Shark/);
      assert.equal(await dialog(page).count(), 0);
      await card.getByRole("button", { name: "Follow Dakota", exact: true }).click();
      await page.locator(".exp-travel-note").getByText(/Following Dakota/).waitFor();
      await waitForState(page, s => s.speed > 1, "Following Dakota did not start the explicit guide course");
      await page.locator(".exp-travel-note").getByRole("button", { name: "Stop", exact: true }).click();
      assert.equal((await state(page)).status, "PAUSED");
      await openMap(page); await chooseEncounter(page, /Meet Dakota/);
      await card.getByRole("button", { name: /Explore reef/ }).click();
      await waitForState(page, s => s.mode === "reef", "Dakota dive failed");
      for (const [id, name, action, expected] of [
        ["fish", /A little room to swim/, "School parts", /space opens between the school/],
        ["camouflage", /Hiding in plain sight/, "Revealed", /There you are/],
        ["cleaner", /A useful arrangement/, "Cleaning", /cleaner gets a meal/],
      ]) {
        await openMap(page); await chooseEncounter(page, name); await card.getByRole("button", { name: action, exact: true }).click();
        assert.match(await card.innerText(), expected); assert.equal(await dialog(page).count(), 0);
        assert.equal(await page.locator("#voyage").getAttribute("data-observed"), id);
        const resume = card.getByRole("button", { name: "Resume motion", exact: true }); if (await resume.isVisible()) await resume.click();
        await waitForState(page, s => s.status === "REEF", "Encounter card blocked reef animation");
        await screenshot(page, `encounter-${id}-in-world`);
        await card.getByRole("button", { name: /^Close / }).click();
      }
      await openMap(page); await chooseEncounter(page, /Find your bearings/); await dialog(page).getByRole("button", { name: "Find my bearings", exact: true }).click();
      assert.match(await dialog(page).innerText(), /Your boat is/); await close(page);
      await openMap(page); await chooseEncounter(page, /From input to insight/); await dialog(page).getByRole("button", { name: /Output/ }).click();
      assert.match(await dialog(page).innerText(), /numeric_columns/); assert.equal(await dialog(page).locator('a[href*="a6c9d2b"]').count() >= 1, true); await close(page);
      await openMap(page); await chooseEncounter(page, /A channel to Tejass/); await dialog(page).getByRole("button", { name: "Opportunities", exact: true }).click();
      assert.ok(await dialog(page).locator('a[href^="mailto:"]').count() >= 1); await close(page);
      await openMap(page); await chooseEncounter(page, /A different lens/); await page.locator(".exp-bearing-stops").getByRole("button", { name: /Anticipy/ }).click();
      assert.match(await page.locator(".exp-lens-reading").innerText(), /Anticipy/); await screenshot(page, "lighthouse-from-reef");
      await page.getByRole("button", { name: /Close optics/ }).click(); assert.equal((await state(page)).mode, "reef");
      // V4 replaced the old Sand channel selector with regional navigation.
      // Its public Quiet current action chooses the canonical entry without
      // asking a visitor to steer through the reef merely to try the encounter.
      await page.getByRole("button", { name: "Motion / settings", exact: true }).click();
      await dialog(page).getByRole("button", { name: "Use Quiet view", exact: true }).click(); await close(page);
      await page.locator(".exp-discovery-rail").getByRole("button", { name: /Ride current/ }).click();
      await page.getByRole("button", { name: "Quiet view / settings", exact: true }).click();
      await dialog(page).getByRole("button", { name: "Enable motion", exact: true }).click(); await close(page);
      const currentEntry = await state(page);
      await page.locator(".exp-discovery-rail").getByRole("button", { name: /Ride current/ }).click();
      await page.locator(".exp-travel-note").getByText("Riding the current", { exact: true }).waitFor();
      await waitForState(page, s => Math.hypot(s.rx - currentEntry.rx, s.rz - currentEntry.rz) > 1, "Joining the current did not move the swimmer");
      await page.locator(".exp-travel-note").getByRole("button", { name: "Stop", exact: true }).click();
      await openMap(page); await chooseEncounter(page, /Keep a perspective/);
      for (let i = 0; i < 7; i++) {
        await dialog(page).getByRole("button", { name: i ? "Retake" : "Capture view", exact: true }).click();
        await dialog(page).getByText("Preview ready. Nothing has been saved or uploaded.", { exact: true }).waitFor();
        await dialog(page).getByRole("button", { name: "Keep in fieldbook", exact: true }).click();
      }
      assert.equal(await dialog(page).locator(".exp-photo-grid figure").count(), 6);
      assert.ok(await page.evaluate(() => window.__qaPhotoUrls.size) <= 7, "Only six kept plus one current preview may remain");
      await screenshot(page, "photo-fieldbook-cap");
      await dialog(page).getByRole("button", { name: "Remove 1", exact: true }).click();
      assert.equal(await dialog(page).locator(".exp-photo-grid figure").count(), 5);
      await dialog(page).getByRole("button", { name: "Work", exact: true }).click();
      await dialog(page).locator('a[href$="/case-studies/docubridge"]').click(); await page.waitForURL(/docubridge/);
      assert.equal(await page.evaluate(() => window.__qaPhotoUrls.size), 0, "Leaving the experience must revoke all preview URLs");
      assert.deepEqual(errors, []);
      return { encounterCoverage: "All 12 listed; E01 follow/stop, E02/E07/E08 nonmodal state changes, E03 dive, E04 lens, E05 join/stop, E06 photo cap, E09 bearings, E10 source, E11 contact, E12 exercised in separate race test. Visual scene response still needs human review." };
    } finally { await context.close(); }
  });

  await check("phone Quiet controls preserve independent position/depth and visible modal exits", async () => {
    const { page, context, errors } = await makePage({ viewport: { width: 320, height: 667 }, reducedMotion: "reduce", isMobile: true, hasTouch: true });
    try {
      await boot(page); await sceneReady(page);
      await page.getByRole("button", { name: /Or explore below/ }).click(); await waitForState(page, s => s.mode === "reef", "Quiet dive failed");
      await page.locator(".exp-position summary").click();
      const east = page.getByRole("slider", { name: "Reef east west position" });
      await east.focus(); await east.press("ArrowLeft");
      const beforeDepth = await state(page);
      const depth = page.getByRole("slider", { name: "Reef depth", exact: true });
      await depth.focus(); await depth.press("End");
      const afterDepth = await state(page); assert.equal(afterDepth.rx, beforeDepth.rx); assert.equal(afterDepth.rz, beforeDepth.rz); assert.notEqual(afterDepth.ry, beforeDepth.ry);
      await openMap(page); await chooseEncounter(page, /Keep a perspective/);
      await photoPreviewReady(page);
      const sizes = await dialog(page).locator(".exp-dialog-bar button").evaluateAll(elements => elements.map(el => ({ text: el.textContent, width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height, top: el.getBoundingClientRect().top, bottom: el.getBoundingClientRect().bottom })));
      assert.ok(sizes.every(s => s.width >= 44 && s.height >= 44 && s.top >= 0 && s.bottom <= 667), JSON.stringify(sizes));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await screenshot(page, "phone-320-quiet-photo-exit");
      const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      const serious = accessibility.violations.filter(v => ["critical", "serious"].includes(v.impact));
      assert.deepEqual(serious.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })), []);
      await dialog(page).getByRole("button", { name: /^Return to boat/ }).click();
      await waitForState(page, s => s.mode === "surface", "Modal boat exit failed");
      assert.deepEqual(errors, []);
      return { sizes, accessibilityViolations: accessibility.violations.map(v => ({ id: v.id, impact: v.impact })) };
    } finally { await context.close(); }
  });

  await check("no WebGL retains reef choices, work and contact", async () => {
    const { page, context } = await makePage({ reducedMotion: "reduce" });
    try {
      await page.addInitScript(() => { const original = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function(type, ...args) { return /webgl/i.test(type) ? null : original.call(this, type, ...args); }; });
      await boot(page); await nav(page).getByRole("button", { name: /^Work/ }).click(); assert.equal(await dialog(page).locator('.exp-work-list a[href*="/case-studies/"]').count(), 5); await close(page);
      await page.getByRole("button", { name: /Or explore below/ }).click(); await waitForState(page, s => s.mode === "reef", "No-WebGL dive must reach static reef choices", 8000);
      await page.locator(".exp-position summary").click(); await page.locator(".exp-viewpoints").getByRole("button", { name: "Western shelf", exact: true }).click();
      const s = await state(page); assert.equal(s.rx, -15); assert.equal(s.rz, 6);
      await screenshot(page, "no-webgl-reef-position");
      await nav(page).getByRole("button", { name: /^Contact/ }).click(); assert.ok(await dialog(page).locator('a[href^="mailto:"]').count() >= 1);
      await screenshot(page, "no-webgl-field-guide"); return { state: s, fault: "WebGL context creation deliberately unavailable; no scene-success claim." };
    } finally { await context.close(); }
  });

  await check("canceling a delayed scene preserves the selected course and rejects late entry", async () => {
    const { page, context, errors } = await makePage();
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    let delayed = 0;
    try {
      await page.route(/OpenWaterScene(?:-[^/]+\.js|\.tsx)(?:\?|$)/, async route => { delayed++; await gate; await route.continue(); });
      await boot(page); await page.locator("#take-helm").click(); await openMap(page);
      await dialog(page).locator(".exp-map-destinations > div").filter({ hasText: "Anticipy" }).getByRole("button", { name: "Sail there", exact: true }).click();
      const before = await state(page);
      await page.locator(".exp-discovery-rail").getByRole("button", { name: /Explore reef/ }).click();
      await waitForState(page, s => s.mode === "entering", "Delayed scene did not expose cancellable preparation");
      await page.getByRole("button", { name: "Cancel dive", exact: true }).click();
      assert.equal((await state(page)).mode, "surface");
      release(); await sceneReady(page); await delay(300);
      const canceled = await state(page);
      assert.equal(canceled.mode, "surface"); assert.equal(canceled.status, "PAUSED");
      assert.equal(canceled.x, before.x); assert.equal(canceled.z, before.z); assert.equal(canceled.heading, before.heading);
      await page.locator("#exp-resume").click();
      await waitForState(page, s => s.speed > 1 && (s.x !== before.x || s.z !== before.z), "Cancel discarded the selected course instead of preserving it");
      assert.ok(delayed > 0, "The test must actually delay a scene request"); assert.deepEqual(errors, []);
      return { delayedRequests: delayed, canceled, evidence: "Real scene request held, public Cancel used, then original response delivered." };
    } finally { release(); await context.close(); }
  });

  await check("failed model requests retain procedural exploration and all work", async () => {
    const { page, context, errors } = await makePage();
    const blocked = [];
    try {
      await page.route(/\.glb(?:\?|$)/, async route => { blocked.push(route.request().url()); await route.abort("failed"); });
      await boot(page); await sceneReady(page); await page.locator("#take-helm").click();
      await page.locator("#voyage[data-yacht-model='procedural']").waitFor();
      await page.locator(".exp-discovery-rail").getByRole("button", { name: /Explore reef/ }).click();
      await waitForState(page, s => s.mode === "reef", "Model failures prevented reef exploration");
      const skip = page.getByRole("button", { name: /Skip transition/ }); if (await skip.isVisible()) await skip.click();
      await page.locator(".exp-position summary").click(); await page.locator(".exp-viewpoints").getByRole("button", { name: "Western shelf", exact: true }).click();
      assert.equal((await state(page)).rx, -15);
      await screenshot(page, "model-failure-procedural-reef");
      await nav(page).getByRole("button", { name: /^Work/ }).click(); assert.equal(await dialog(page).locator('.exp-work-list a[href*="/case-studies/"]').count(), 5);
      assert.ok(blocked.some(u => /yacht/.test(u))); assert.ok(blocked.some(u => /dakota/.test(u)));
      assert.deepEqual(errors, []);
      return { blocked, state: await state(page), evidence: "All actual GLB requests aborted; procedural fallback is functional, not an asset-quality approval." };
    } finally { await context.close(); }
  });

  await check("released tap throttle is bounded and held keys cannot cross a reading boundary", async () => {
    const { page, context, errors } = await makePage();
    try {
      await boot(page); await sceneReady(page); await page.locator("#take-helm").click();
      await page.getByRole("button", { name: "Accelerate", exact: true }).click();
      const pulse = await waitForState(page, s => s.speed > .1, "A single tap did not move the boat");
      await delay(1400); const released = await state(page);
      assert.ok(released.speed < pulse.speed + .1, `Released tap continued accelerating: ${pulse.speed} -> ${released.speed}`);
      await page.locator("#yacht-controls").focus(); await page.keyboard.down("w");
      await waitForState(page, s => s.speed > 1.5, "Fresh key press did not accelerate");
      await nav(page).getByRole("button", { name: /^Work/ }).click(); await close(page); await page.locator("#exp-resume").click();
      const resumed = await state(page); await page.keyboard.down("w"); await delay(600); const stale = await state(page);
      assert.ok(stale.speed <= resumed.speed + .1, "A held/repeated key survived the reading boundary");
      await page.keyboard.up("w"); await page.keyboard.down("w");
      await waitForState(page, s => s.speed > stale.speed + .5, "A fresh press after release remained incorrectly blocked");
      await page.keyboard.up("w"); assert.deepEqual(errors, []);
      return { pulseSpeed: pulse.speed, releasedSpeed: released.speed, staleKeySpeed: stale.speed };
    } finally { await context.close(); }
  });

  await check("portrait and landscape modal controls remain on screen with keyboard exits", async () => {
    const results = [];
    for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
      const { page, context, errors } = await makePage({ viewport, reducedMotion: "reduce", isMobile: true, hasTouch: true });
      try {
        await boot(page); await sceneReady(page); await page.getByRole("button", { name: /Or explore below/ }).click();
        await waitForState(page, s => s.mode === "reef", "Quiet dive failed"); await openMap(page); await chooseEncounter(page, /Keep a perspective/);
        await photoPreviewReady(page);
        const boxes = await dialog(page).locator(".exp-dialog-bar button").evaluateAll(els => els.map(el => { const r = el.getBoundingClientRect(); return { text: el.textContent, x: r.x, y: r.y, width: r.width, height: r.height }; }));
        assert.ok(boxes.every(r => r.width >= 44 && r.height >= 44 && r.x >= 0 && r.x + r.width <= viewport.width && r.y >= 0 && r.y + r.height <= viewport.height), JSON.stringify({ viewport, boxes }));
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        await screenshot(page, `quiet-photo-${viewport.width}x${viewport.height}`);
        await page.keyboard.press("Escape"); assert.equal(await dialog(page).count(), 0);
        assert.equal((await state(page)).mode, "reef");
        await nav(page).getByRole("button", { name: /^Return to boat/ }).click(); await waitForState(page, s => s.mode === "surface", "Persistent exit failed");
        assert.deepEqual(errors, []); results.push({ viewport, boxes });
      } finally { await context.close(); }
    }
    return { viewports: results };
  });

  await check("a late photo callback cannot replace another panel or leak a preview", async () => {
    const { page, context, errors } = await makePage({ reducedMotion: "reduce" });
    try {
      await page.addInitScript(() => {
        const native = HTMLCanvasElement.prototype.toBlob;
        window.__qaDelayedPhotoCallbacks = 0;
        HTMLCanvasElement.prototype.toBlob = function(callback, ...args) {
          return native.call(this, blob => setTimeout(() => { window.__qaDelayedPhotoCallbacks++; callback(blob); }, 500), ...args);
        };
      });
      await boot(page); await sceneReady(page); await page.getByRole("button", { name: /Or explore below/ }).click();
      await waitForState(page, s => s.mode === "reef", "Quiet dive failed"); await openMap(page); await chooseEncounter(page, /Keep a perspective/);
      await dialog(page).getByRole("button", { name: "Capture view", exact: true }).click();
      await dialog(page).getByRole("button", { name: "Work", exact: true }).click();
      await page.waitForFunction(() => window.__qaDelayedPhotoCallbacks > 0);
      assert.equal(await dialog(page).locator('.exp-work-list a[href*="/case-studies/"]').count(), 5);
      assert.equal(await page.evaluate(() => window.__qaPhotoUrls.size), 0);
      await dialog(page).getByRole("button", { name: "Map", exact: true }).click(); await chooseEncounter(page, /Keep a perspective/);
      assert.equal(await dialog(page).locator('img[alt="Your captured Open Water view"]').count(), 0);
      assert.deepEqual(errors, []);
      return { callbacks: await page.evaluate(() => window.__qaDelayedPhotoCallbacks), activePhotoUrls: 0 };
    } finally { await context.close(); }
  });

  await check("Return during the optional dive camera transition clears its overlay", async () => {
    const { page, context, errors } = await makePage();
    try {
      await boot(page); await sceneReady(page); const before = await state(page);
      await page.getByRole("button", { name: /Or explore below/ }).click();
      await page.getByRole("button", { name: /Skip transition/ }).waitFor();
      await nav(page).getByRole("button", { name: /^Return to boat/ }).click();
      await waitForState(page, s => s.mode === "surface", "Early Return did not restore the boat");
      assert.equal(await page.locator(".exp-dive-curtain").count(), 0, "Transition overlay outlived its reef mode");
      const after = await state(page); assert.equal(after.x, before.x); assert.equal(after.z, before.z); assert.equal(after.heading, before.heading); assert.equal(after.speed, 0);
      await nav(page).getByRole("button", { name: /^Work/ }).click(); assert.equal(await dialog(page).locator('.exp-work-list a[href*="/case-studies/"]').count(), 5);
      assert.deepEqual(errors, []); return { before, after };
    } finally { await context.close(); }
  });

  await check("reopening Contact selects opportunities after visiting another radio channel", async () => {
    const { page, context } = await makePage({ reducedMotion: "reduce" });
    try {
      await boot(page); await nav(page).getByRole("button", { name: /^Contact/ }).click();
      await dialog(page).locator(".exp-radio-layout .exp-segmented").getByRole("button", { name: "Work", exact: true }).click();
      assert.equal(await dialog(page).locator('a[href^="mailto:"]').count(), 0); await close(page);
      await nav(page).getByRole("button", { name: /^Contact/ }).click();
      await dialog(page).locator('a[href^="mailto:"]').first().waitFor();
      assert.ok(await dialog(page).locator('a[href^="mailto:"]').count() > 0, "Global Contact must offer contact on entry");
      return { channel: "Opportunities" };
    } finally { await context.close(); }
  });

  await check("a completed current releases its activity and leaves the swimmer at rest", async () => {
    const { page, context, errors } = await makePage();
    try {
      await boot(page); await sceneReady(page); await page.getByRole("button", { name: /Or explore below/ }).click();
      await waitForState(page, s => s.mode === "reef", "Dive failed");
      const skip = page.getByRole("button", { name: /Skip transition/ }); if (await skip.isVisible()) await skip.click();
      await page.locator(".exp-position summary").click(); await page.locator(".exp-viewpoints").getByRole("button", { name: "Sand channel", exact: true }).click();
      await page.locator(".exp-discovery-rail").getByRole("button", { name: /Ride current/ }).click();
      await page.locator(".exp-travel-note").getByText("Riding the current", { exact: true }).waitFor();
      await waitForState(page, s => s.rx >= 9.5 && s.rz >= -4.5, "Current failed to reach its end", 25000);
      await page.locator(".exp-travel-note").waitFor({ state: "hidden", timeout: 2000 });
      const ended = await state(page); assert.equal(ended.status, "PAUSED");
      await delay(400); assert.equal((await state(page)).rx, ended.rx); assert.equal((await state(page)).rz, ended.rz);
      assert.deepEqual(errors, []); return { ended };
    } finally { await context.close(); }
  });

  await check("a pointer release cannot plot a course across Stop and Resume", async () => {
    const { page, context, errors } = await makePage();
    try {
      await boot(page); await sceneReady(page); await page.locator("#take-helm").click();
      await page.locator("#yacht-controls").focus();
      await page.mouse.move(730, 550); const start = Date.now(); await page.mouse.down();
      await page.locator("#yacht-controls").focus();
      await page.keyboard.press("Escape");
      await waitForState(page, s => s.status === "PAUSED", "Escape did not stop the focused water controls", 1000);
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await page.locator("#exp-resume").press("Space");
      await waitForState(page, s => s.status === "SAILING", "Keyboard Resume did not take effect", 1000);
      await page.mouse.up();
      const gestureMs = Date.now() - start;
      assert.ok(gestureMs < 650, `Test gesture exceeded the implementation tap window (${gestureMs}ms)`);
      await delay(500); const afterStaleRelease = await state(page);
      assert.equal(afterStaleRelease.speed, 0, "Release from before Stop plotted a new course after Resume");
      await page.mouse.click(730, 550);
      await waitForState(page, s => s.speed > 1, "The control click did not hit valid navigable water");
      assert.deepEqual(errors, []); return { gestureMs, afterStaleRelease };
    } finally { await context.close(); }
  });

  await check("five direct case routes remain readable and contactable", async () => {
    const { page, context, errors } = await makePage();
    try {
      const routes = ["anticipy", "stellar-learning", "global-health-research", "docubridge", "soma-ai"];
      const titles = [];
      for (const slug of routes) {
        await page.goto(`${url}/case-studies/${slug}`);
        const title = await page.locator("main h1").innerText(); assert.doesNotMatch(title, /not found/i); titles.push({ slug, title });
        assert.ok(await page.locator('a[href^="mailto:"]').count() >= 1);
        assert.ok(await page.getByRole("link", { name: "Return to water", exact: true }).count() >= 1);
      }
      assert.deepEqual(errors, []); return { routes: titles };
    } finally { await context.close(); }
  });

  await check("no-JavaScript home and five direct routes retain proof, contact and mobile reflow", async () => {
    const { page, context } = await makePage({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
    const routes = [
      ["anticipy", "Anticipy"], ["stellar-learning", "Stellar Learning"], ["global-health-research", "Global health research"],
      ["docubridge", "DocuBridge"], ["soma-ai", "Soma AI"],
    ];
    const evidence = [];
    try {
      const response = await page.goto(url); assert.equal(response.status(), 200);
      await page.locator(".static-portfolio").waitFor();
      assert.match(await page.locator("main h1").innerText(), /Tejass Kaushik/);
      for (const [slug] of routes) assert.ok(await page.locator(`a[href$='/case-studies/${slug}']`).count() > 0);
      assert.ok(await page.getByRole("link", { name: /Contact about opportunities/ }).count() > 0);
      assert.equal(await page.locator(".pv-project-image img").count(), 5, "No-script image wrappers must retain all five real thumbnails");
      assert.equal(await page.locator(".pv-project-meta dt").filter({ hasText: /^Period$/ }).count(), 5);
      assert.ok(await page.locator('#work a[href^="https://github.com/"][href*="/blob/"]').count() >= 2);
      assert.equal(await page.locator('dl[aria-label="Attributed project evidence"] dt').count(), 2);
      await screenshot(page, "no-javascript-home-390");
      await page.locator("#work").scrollIntoViewIfNeeded(); await screenshot(page, "no-javascript-work-proof-390");
      for (const [slug, title] of routes) {
        const routeResponse = await page.goto(`${url}/case-studies/${slug}`); assert.equal(routeResponse.status(), 200);
        assert.equal(await page.locator("main h1").innerText(), title);
        assert.equal(await page.title(), `${title} | Work by Tejass Kaushik`);
        assert.ok((await page.locator("main").innerText()).length > 1000, "Static route needs substantive case content, not just a title");
        for (const id of ["context", "contribution", "decision", "outcome", "sources"]) assert.equal(await page.locator(`main #${id}`).count(), 1);
        if (slug === "anticipy") {
          for (const story of ["connector-journey", "private-preparation", "privacy-boundary"]) {
            assert.equal(await page.locator(`.pv4-story-index a[href="#${story}"]`).count(), 1);
            assert.equal(await page.locator(`#${story}`).count(), 1);
          }
          assert.equal(await page.locator(".pv4-contribution-list details").count(), 12);
          assert.match(await page.locator("#contribution").innerText(), /AI-assisted engineering/);
        } else {
          const decisionHeading = (await page.locator("#decision .pv-eyebrow").innerText()).replace(/^03\s*\/\s*/, "").split(" / ")[0];
          assert.equal((await page.locator('.pv-reading-index a[href="#decision"]').innerText()).toLowerCase(), decisionHeading.toLowerCase());
        }
        assert.ok(await page.locator('#sources a[href^="https:"]').count() > 0);
        assert.ok(await page.getByRole("link", { name: /Contact about opportunities/ }).count() > 0);
        assert.ok(await page.getByRole("link", { name: /Return to water/ }).count() > 0);
        const canonical = await page.locator('link[rel="canonical"]').getAttribute("href"); assert.ok(canonical.endsWith(`/case-studies/${slug}`));
        const widths = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
        assert.ok(Math.max(widths.document, widths.body) <= widths.viewport + 1, JSON.stringify({ slug, widths }));
        evidence.push({ slug, title, canonical, widths });
        if (slug === "global-health-research") await screenshot(page, "no-javascript-research-390");
      }
      return { routes: evidence, evidence: "JavaScript disabled in browser context; direct HTTP routes served prerendered HTML." };
    } finally { await context.close(); }
  });

  await check("Quiet renders a stable frame and redraws for an explicit pose change", async () => {
    const { page, context, errors } = await makePage({ reducedMotion: "reduce" });
    try {
      await page.addInitScript(() => {
        window.__qaDrawCalls = 0;
        for (const constructor of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
          if (!constructor) continue;
          for (const name of ["drawArrays", "drawElements", "drawArraysInstanced", "drawElementsInstanced"]) {
            const original = constructor.prototype[name]; if (!original) continue;
            constructor.prototype[name] = function(...args) { window.__qaDrawCalls++; return original.apply(this, args); };
          }
        }
      });
      await boot(page); await sceneReady(page); await page.getByRole("button", { name: /Or explore below/ }).click();
      await waitForState(page, s => s.mode === "reef", "Quiet entry failed");
      await page.locator("#voyage[data-character-model='ready']").waitFor();
      await delay(1000);
      const first = await page.locator(".exp-scene canvas").screenshot();
      const before = await page.evaluate(() => window.__qaDrawCalls);
      await delay(800);
      assert.equal(await page.evaluate(() => window.__qaDrawCalls), before, "Quiet continued submitting WebGL draws without user action");
      assert.ok(first.equals(await page.locator(".exp-scene canvas").screenshot()), "Quiet scene changed pixels without user action");
      await page.locator(".exp-position summary").click(); await page.locator(".exp-viewpoints").getByRole("button", { name: "Western shelf", exact: true }).click();
      await page.waitForFunction(previous => window.__qaDrawCalls > previous, before);
      assert.equal((await state(page)).rx, -15);
      assert.ok(!first.equals(await page.locator(".exp-scene canvas").screenshot()), "Explicit new pose did not redraw its view");
      assert.deepEqual(errors, []); return { stableDrawCalls: before, evidence: "800ms after model readiness and one-second settlement; demand-render stability, not device performance." };
    } finally { await context.close(); }
  });

  await check("short phone exploration keeps movement and recovery controls inside the viewport", async () => {
    const evidence = [];
    for (const viewport of [{ width: 320, height: 667 }, { width: 360, height: 640 }, { width: 390, height: 664 }, { width: 664, height: 390 }]) {
      const { page, context, errors } = await makePage({ viewport, isMobile: true, hasTouch: true });
      try {
        await boot(page); await sceneReady(page); await page.locator("#take-helm").click(); await committedFrames(page);
        const measure = () => page.locator(".exp-nav-links button, .exp-movement-pad button, #exp-resume").evaluateAll(els => els.map(el => {
          const r = el.getBoundingClientRect(), center = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
          return { label: el.getAttribute("aria-label") || el.textContent, x: r.x, y: r.y, width: r.width, height: r.height, unobstructed: center === el || el.contains(center) };
        }));
        const assertBounds = boxes => assert.ok(boxes.every(r => r.width >= 44 && r.height >= 44 && r.x >= 0 && r.y >= 0 && r.x + r.width <= viewport.width + .5 && r.y + r.height <= viewport.height + .5 && r.unobstructed), JSON.stringify({ viewport, boxes }));
        const surface = await measure(); assertBounds(surface);
        await page.locator(".exp-discovery-rail").getByRole("button", { name: /Explore reef/ }).click();
        await waitForState(page, s => s.mode === "reef", "Phone dive failed");
        const skip = page.getByRole("button", { name: /Skip transition/ }); if (await skip.isVisible()) await skip.click();
        await committedFrames(page); const reef = await measure(); assertBounds(reef);
        assert.equal(await page.locator(".exp-movement-pad button").count(), 6);
        await screenshot(page, `active-reef-controls-${viewport.width}x${viewport.height}`);
        await page.locator(".exp-discovery-rail").getByRole("button", { name: /Camouflage/ }).click();
        const card = page.locator(".exp-encounter-card"); await card.getByRole("button", { name: "Revealed", exact: true }).click();
        await committedFrames(page);
        assert.equal(await dialog(page).count(), 0);
        const recovery = await page.locator(".exp-nav-links button, .exp-encounter-card header button").evaluateAll(els => els.map(el => {
          const r = el.getBoundingClientRect(), center = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
          return { label: el.getAttribute("aria-label") || el.textContent, x: r.x, y: r.y, width: r.width, height: r.height, unobstructed: center === el || el.contains(center) };
        }));
        assertBounds(recovery);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        await screenshot(page, `phone-camouflage-${viewport.width}x${viewport.height}`);
        await page.keyboard.press("Escape"); assert.equal(await card.count(), 0);
        assert.equal(await page.locator("#voyage").getAttribute("data-observed"), "none");
        assert.deepEqual(errors, []); evidence.push({ viewport, surface, reef, recovery });
      } finally { await context.close(); }
    }
    return { viewports: evidence, evidence: "Viewport and touch-capable emulation; hit testing checks center points, not physical-device ergonomics." };
  });

  await check("portrait wildlife cards retain visible Close after scrolling and keyboard activation", async () => {
    const evidence = [];
    for (const viewport of [{ width: 320, height: 667 }, { width: 390, height: 844 }]) {
      const { page, context, errors } = await makePage({ viewport, isMobile: true, hasTouch: true });
      try {
        await boot(page); await sceneReady(page); await page.locator("#take-helm").click(); await committedFrames(page);
        const inspectCard = async (id, imageName) => {
          const card = page.locator(".exp-encounter-card");
          await page.locator("#voyage[data-character-model='ready']").waitFor();
          await committedFrames(page);
          await delay(1600); // Surface inspection camera eases into its new view.
          await screenshot(page, `${imageName}-${viewport.width}x${viewport.height}`);
          // Focusing the last details action scrolls an overflowing card using
          // the browser's native focus behavior. Close must stay operable.
          await card.getByRole("button", { name: "About this encounter", exact: false }).focus();
          await committedFrames(page);
          const closeButton = card.getByRole("button", { name: /^Close / });
          const closeBounds = await closeButton.evaluate(el => {
            const r = el.getBoundingClientRect(), top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
            return { x: r.x, y: r.y, width: r.width, height: r.height, reachable: top === el || el.contains(top) };
          });
          assert.ok(closeBounds.width >= 44 && closeBounds.height >= 44 && closeBounds.y >= 0 && closeBounds.y + closeBounds.height <= viewport.height && closeBounds.reachable, JSON.stringify(closeBounds));
          assert.equal(await dialog(page).count(), 0);
          await closeButton.focus(); await closeButton.press("Space");
          await card.waitFor({ state: "hidden" });
          assert.equal(await page.locator("#voyage").getAttribute("data-observed"), "none");
          evidence.push({ viewport, id, closeBounds });
        };
        await openMap(page); await chooseEncounter(page, /Meet Dakota/);
        await inspectCard("dakota-surface", "portrait-dakota-surface");
        await page.locator(".exp-discovery-rail").getByRole("button", { name: /Explore reef/ }).click();
        await waitForState(page, s => s.mode === "reef", "Portrait dive failed");
        const skip = page.getByRole("button", { name: /Skip transition/ }); if (await skip.isVisible()) await skip.click();
        await committedFrames(page);
        for (const [id, label, action] of [["dakota-reef", /Meet Dakota/, null], ["fish", /A little room to swim/, "School parts"], ["camouflage", /Hiding in plain sight/, "Revealed"]]) {
          await openMap(page); await chooseEncounter(page, label);
          if (action) await page.locator(".exp-encounter-card").getByRole("button", { name: action, exact: true }).click();
          await inspectCard(id, `portrait-${id}`);
        }
        assert.deepEqual(errors, []);
      } finally { await context.close(); }
    }
    return { viewports: evidence, evidence: "Native focus scroll and Space activation test the sticky Close control. Saved animal framing screenshots require separate human inspection." };
  });

  await check("phone fish comparison redraws a reversible school state beside its card", async () => {
    const evidence = [];
    for (const viewport of [{ width: 320, height: 667 }, { width: 390, height: 844 }, { width: 664, height: 390 }]) {
      const { page, context, errors } = await makePage({ viewport, isMobile: true, hasTouch: true });
      try {
        await boot(page); await sceneReady(page); await page.getByRole("button", { name: /Or explore below/ }).click();
        await waitForState(page, s => s.mode === "reef", "Fish inspection dive failed");
        const skip = page.getByRole("button", { name: /Skip transition/ }); if (await skip.isVisible()) await skip.click();
        const headingStyle = await page.locator(".exp-heading .exp-kicker").evaluate(el => ({ color: getComputedStyle(el).color, background: getComputedStyle(el.closest(".exp-heading")).backgroundColor, textShadow: getComputedStyle(el).textShadow }));
        const rgb = value => value.match(/[\d.]+/g).map(Number);
        const luminance = channels => channels.slice(0, 3).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
        const ink = luminance(rgb(headingStyle.color)), paper = rgb(headingStyle.background), alpha = paper[3] ?? 1;
        const minimumContrast = Math.min(...[0, 255].map(backdrop => {
          const background = luminance(paper.slice(0, 3).map(v => v * alpha + backdrop * (1 - alpha)));
          return (Math.max(ink, background) + .05) / (Math.min(ink, background) + .05);
        }));
        assert.equal(headingStyle.textShadow, "none");
        assert.ok(minimumContrast >= 4.5, JSON.stringify({ headingStyle, minimumContrast }));
        await committedFrames(page); await openMap(page); await chooseEncounter(page, /A little room to swim/);
        await page.locator("#voyage[data-character-model='ready']").waitFor();
        const card = page.locator(".exp-encounter-card"), canvas = page.locator(".exp-scene canvas");
        await card.getByRole("button", { name: "School together", exact: true }).click();
        await committedFrames(page); await delay(500);
        assert.equal((await state(page)).status, "PAUSED", "Compare authored still states with the reading pause preserved");
        const together = await canvas.screenshot(); await screenshot(page, `fish-together-${viewport.width}x${viewport.height}`);
        await card.getByRole("button", { name: "School parts", exact: true }).click(); await committedFrames(page);
        const parted = await canvas.screenshot(); await screenshot(page, `fish-parted-${viewport.width}x${viewport.height}`);
        assert.ok(!together.equals(parted), "Parting the school must change the rendered still frame");
        assert.equal(await card.getByRole("button", { name: "School parts", exact: true }).getAttribute("aria-pressed"), "true");
        await card.getByRole("button", { name: "School together", exact: true }).click(); await committedFrames(page);
        const regrouped = await canvas.screenshot(); await screenshot(page, `fish-regrouped-${viewport.width}x${viewport.height}`);
        assert.ok(together.equals(regrouped), "Regrouping should restore the same paused school state");
        assert.equal(await card.getByRole("button", { name: "School together", exact: true }).getAttribute("aria-pressed"), "true");
        await card.getByRole("button", { name: /^Close / }).click(); assert.equal(await card.count(), 0);
        assert.deepEqual(errors, []); evidence.push({ viewport, changedWhenParted: true, restoredWhenRegrouped: true, headingStyle, minimumContrast });
      } finally { await context.close(); }
    }
    return { viewports: evidence, evidence: "Canvas bytes establish a reversible rendered response. Above-card visibility and legibility of the spread require independent screenshot inspection." };
  });
} finally {
  await browser.close();
  report.finishedAt = new Date().toISOString();
  await writeFile(path.join(output, reportName), JSON.stringify(report, null, 2));
}
if (report.checks.some(c => c.status === "fail")) process.exitCode = 1;
