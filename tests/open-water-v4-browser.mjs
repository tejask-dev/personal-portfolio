/** V4 public-input integration checks. No scene state is written by this test.
 * BASE_URL=http://127.0.0.1:4185/ node tests/open-water-v4-browser.mjs
 * QA_ONLY can select a check. Run against a built preview for release evidence.
 * Phone viewports are emulation, not physical-device acceptance.
 */
import assert from "node:assert/strict";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const url = process.env.BASE_URL || process.env.QA_URL || "http://127.0.0.1:4185/";
const output = path.resolve(process.env.QA_OUTPUT || "design/previews-v4");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const report = {
  at: new Date().toISOString(), url, browser: browser.version(),
  build: process.env.QA_BUILD_LABEL || "Development/HMR — provisional",
  scope: "Public buttons, keyboard and touch-emulated input in separate Chrome. Read-only DOM telemetry. Capability/chunk failure injection only in explicitly named checks. No physical-phone, thermal or screen-reader-user claim.",
  checks: [], screenshots: [], videos: [],
};
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const dialog = page => page.locator("dialog[open]");
const nav = page => page.locator(".exp-nav");
const wrap = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
const anchor = s => ({ vessel: s.vessel, x: s.x, z: s.z, heading: s.heading });
const state = page => page.locator("#voyage").evaluate(el => {
  const d = el.dataset;
  return {
    status: d.state, mode: d.mode, vessel: d.vessel, region: d.region, actor: d.actor, activity: d.activity,
    x: +d.boatX, z: +d.boatZ, heading: +d.boatHeading, speed: +d.boatSpeed,
    rx: +d.reefX, ry: +d.reefY, rz: +d.reefZ, rh: +d.reefHeading,
    race: d.racePhase, raceElapsed: +d.raceElapsed, raceGate: +d.raceCheckpoint,
    fishing: d.fishingPhase, released: +d.fishingReleased, docking: d.dockingPhase,
    fishCourse: d.fishCoursePhase, fishGate: +d.fishCourseCheckpoint,
  };
});
async function until(page, predicate, description, timeout = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const value = await state(page);
    if (predicate(value)) return value;
    await delay(80);
  }
  throw new Error(`${description}; last telemetry ${JSON.stringify(await state(page))}`);
}
async function screenshot(page, name) {
  const file = path.join(output, `${name}.png`);
  await page.screenshot({ path: file });
  report.screenshots.push(file);
}
async function makePage(options = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, ...options });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  return { context, page, errors };
}
async function boot(page, scene = true) {
  await page.goto(url);
  await page.locator("#take-helm").waitFor();
  if (scene) await page.locator("#voyage.is-ready").waitFor({ timeout: 45000 });
  await page.locator("#take-helm").click();
  await page.getByTestId("voyage-deck").waitFor();
}
async function deck(page, panel) {
  const button = page.getByTestId(`voyage-${panel}`);
  if (await button.getAttribute("aria-expanded") !== "true") await button.click();
  await page.locator(".vd-drawer").waitFor();
}
async function closeDeck(page) {
  const close = page.getByRole("button", { name: "Close expedition panel", exact: true });
  if (await close.isVisible()) await close.click();
}
async function closeDialog(page) { await dialog(page).getByRole("button", { name: /^Close / }).click(); }
async function travel(page, region) {
  await deck(page, "chart");
  await page.getByTestId(`region-${region}`).click();
  await until(page, s => s.mode === "reef" && s.region === region, `${region} failed to load`, 30000);
  await page.locator(".exp-dive-curtain").waitFor({ state: "hidden", timeout: 20000 });
}
async function swimAs(page, actor) {
  await deck(page, "fish"); await page.getByTestId(`swim-${actor}`).click();
  await until(page, s => s.actor === actor, `Control did not transfer to ${actor}`);
}
async function check(name, body) {
  if (process.env.QA_ONLY && !new RegExp(process.env.QA_ONLY, "i").test(name)) return;
  const started = Date.now();
  try {
    const evidence = await body();
    report.checks.push({ name, status: "pass", durationMs: Date.now() - started, ...evidence });
    console.log(`PASS ${name}`);
  } catch (error) {
    report.checks.push({ name, status: "fail", durationMs: Date.now() - started, error: error.stack });
    console.error(`FAIL ${name}: ${error.message}`);
  }
}

try {
  const html = await (await fetch(url)).text();
  report.entryAssets = [...html.matchAll(/(?:src|href)="([^"]*\/assets\/[^"?#]+\.(?:js|css))"/g)].map(match => match[1]);

  await check("yacht, tender race, named fish, four habitats, case study and exact original mooring", async () => {
    const { page, context, errors } = await makePage({ recordVideo: { dir: path.join(output, "movement"), size: { width: 1280, height: 854 } } });
    try {
      await boot(page); const original = anchor(await state(page));
      assert.equal(original.vessel, "superyacht");
      await screenshot(page, "desktop-superyacht");
      await deck(page, "fleet"); await page.getByTestId("vessel-tender").click();
      await until(page, s => s.vessel === "tender", "Tender did not launch");
      assert.notDeepEqual(anchor(await state(page)), original);
      await nav(page).getByRole("button", { name: /^Map/ }).click();
      await dialog(page).locator(".exp-encounter-grid").getByRole("button", { name: /Take the long way/ }).click();
      await dialog(page).getByRole("button", { name: "Start Reef slalom", exact: true }).click();
      await until(page, s => s.race === "racing", "Race countdown did not finish", 20000);
      const start = await state(page);
      await page.locator("#yacht-controls").focus(); await page.keyboard.down("w"); await delay(1400); await page.keyboard.up("w");
      const sailed = await until(page, s => Math.hypot(s.x - start.x, s.z - start.z) > 0.5, "Tender input did not move the actual hull");
      assert.notEqual(sailed.race, "finished", "Starting or accelerating must not silently finish a race");
      await nav(page).getByRole("button", { name: /^Work/ }).click();
      await delay(150); const reading = await state(page); await delay(450);
      assert.equal((await state(page)).raceElapsed, reading.raceElapsed, "Reading must pause the race clock");
      await closeDialog(page); await delay(250);
      assert.equal((await state(page)).raceElapsed, reading.raceElapsed, "Closing reading cannot silently resume a challenge");
      await page.locator(".ow-race-panel").getByRole("button", { name: /^Free sail/ }).click();
      assert.equal((await state(page)).race, "idle");
      await deck(page, "fleet"); await page.getByTestId("vessel-superyacht").click();
      await until(page, s => s.vessel === "superyacht", "Could not return from tender");
      assert.deepEqual(anchor(await state(page)), original, "Tender return must preserve the original yacht anchor");
      await travel(page, "crown"); await swimAs(page, "nemo"); await closeDeck(page);
      const fishStart = await state(page);
      await page.locator(".exp-movement-pad").getByRole("button", { name: "Swim forward", exact: true }).click();
      await until(page, s => Math.hypot(s.rx - fishStart.rx, s.rz - fishStart.rz) > 0.1, "Nemo input must move the controlled fish");
      await screenshot(page, "desktop-crown-nemo");
      for (const region of ["driftwall", "cathedral", "lantern"]) {
        await travel(page, region); assert.equal((await state(page)).actor, "nemo"); await closeDeck(page);
        await screenshot(page, `desktop-${region}`);
      }
      const reefBefore = await state(page);
      await nav(page).getByRole("button", { name: /^Work/ }).click();
      await dialog(page).locator('a[href$="/case-studies/anticipy"]').click();
      await page.waitForURL(/\/case-studies\/anticipy/);
      await page.getByRole("heading", { name: "My part, and the collaboration." }).waitFor();
      assert.equal(await page.locator(".pv4-contribution-list details").count(), 12);
      await screenshot(page, "desktop-anticipy-case");
      // The OS preference can change while the ocean is unmounted on a case.
      // Returning must combine that current preference with the saved voyage.
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.getByRole("link", { name: "Return to water", exact: true }).first().click();
      const restored = await until(page, s => s.mode === "reef" && s.status === "PAUSED", "Case return must restore a paused habitat");
      assert.deepEqual({ region: restored.region, actor: restored.actor, x: restored.rx, y: restored.ry, z: restored.rz }, { region: reefBefore.region, actor: reefBefore.actor, x: reefBefore.rx, y: reefBefore.ry, z: reefBefore.rz });
      await page.getByRole("button", { name: "Quiet view / settings", exact: true }).waitFor();
      await delay(900);
      const still = await page.locator(".exp-scene canvas").screenshot();
      await delay(400);
      assert.ok(still.equals(await page.locator(".exp-scene canvas").screenshot()), "Newly requested reduced motion must preserve a stable rendered frame after case return");
      await page.getByTestId("voyage-return").click();
      const returned = await until(page, s => s.mode === "surface", "Return aboard failed");
      assert.deepEqual(anchor(returned), original);
      assert.equal(returned.speed, 0); await delay(400); assert.deepEqual(anchor(await state(page)), original);
      assert.deepEqual(errors, []);
      return { original, returned: anchor(returned), raceAbandonedExplicitly: true, reducedMotionChangedWhileReading: true, quietPixelStability: true, habitatOrder: ["crown", "driftwall", "cathedral", "lantern"] };
    } finally {
      const video = page.video(); await context.close();
      if (video) report.videos.push(await video.path());
    }
  });

  await check("held key from another control cannot acquire the helm through key repeat", async () => {
    const { page, context, errors } = await makePage();
    try {
      await boot(page); await page.locator("#exp-resume").click();
      await until(page, s => s.status === "PAUSED", "Pause did not stop the helm");
      await nav(page).getByRole("button", { name: /^Work/ }).focus();
      await page.keyboard.down("w");
      await page.locator("#exp-resume").click();
      await page.waitForFunction(() => document.activeElement?.id === "yacht-controls");
      const before = await state(page);
      await page.keyboard.down("w"); // Playwright produces repeat:true for a key still held.
      await delay(600); const repeated = await state(page);
      assert.deepEqual(anchor(repeated), anchor(before), "A repeat whose initial press was outside the helm cannot move the vessel");
      assert.equal(repeated.speed, 0);
      await page.keyboard.up("w"); await page.keyboard.down("w"); await delay(700); await page.keyboard.up("w");
      const fresh = await until(page, s => Math.hypot(s.x - before.x, s.z - before.z) > 0.1, "A released and freshly pressed key should steer normally");
      assert.deepEqual(errors, []); return { repeatedSpeed: repeated.speed, freshSpeed: fresh.speed };
    } finally { await context.close(); }
  });

  await check("each reef-to-reef transition is fresh and its visible skip remains usable", async () => {
    const { page, context, errors } = await makePage();
    try {
      await boot(page); await travel(page, "crown");
      for (const region of ["cathedral", "lantern"]) {
        await deck(page, "chart"); await page.getByTestId(`region-${region}`).click();
        await until(page, s => s.mode === "reef" && s.region === region, "Cave destination did not commit");
        const curtain = page.locator(".exp-dive-curtain");
        await curtain.waitFor(); await delay(250);
        assert.equal(await curtain.isVisible(), true, "A later transition cannot inherit the previous completed progress");
        await curtain.getByRole("button", { name: /^Skip transition/ }).click();
        await curtain.waitFor({ state: "hidden", timeout: 2000 });
        assert.equal((await state(page)).region, region);
      }
      await screenshot(page, "cave-transition-skipped"); assert.deepEqual(errors, []);
      return { destinations: ["cathedral", "lantern"], visibleBeforeSkipMs: 250, geometryEvidence: "Canonical camera-clearance tests cover the cave envelope; this browser check covers fresh transition ownership and public skip." };
    } finally { await context.close(); }
  });

  await check("Dory photo excursion travels to Driftwall and keeps a photograph only on request", async () => {
    const { page, context, errors } = await makePage({ reducedMotion: "reduce" });
    let downloads = 0;
    page.on("download", () => downloads++);
    try {
      await boot(page); const original = anchor(await state(page));
      await deck(page, "fish"); await page.getByTestId("dory-photo-excursion").click();
      await until(page, s => s.mode === "reef" && s.region === "driftwall", "Dory excursion did not reach Driftwall");
      await swimAs(page, "dory"); await deck(page, "fish");
      await page.getByTestId("dory-photo-excursion").click();
      await dialog(page).getByRole("button", { name: "Capture view", exact: true }).waitFor();
      assert.equal((await state(page)).region, "driftwall");
      assert.equal(await dialog(page).locator(".exp-photo-grid figure").count(), 0, "Opening a view cannot silently keep a photo");
      await page.waitForFunction(() => {
        const preview = document.querySelector("dialog[open] .exp-photo-preview canvas");
        return preview instanceof HTMLCanvasElement && preview.width > 300 && preview.height > 150;
      });
      await dialog(page).getByRole("button", { name: "Capture view", exact: true }).click();
      await dialog(page).getByText("Preview ready. Nothing has been saved or uploaded.", { exact: true }).waitFor();
      assert.equal(await dialog(page).locator(".exp-photo-grid figure").count(), 0, "A preview cannot silently enter the fieldbook");
      await dialog(page).getByRole("button", { name: "Keep in fieldbook", exact: true }).click();
      assert.equal(await dialog(page).locator(".exp-photo-grid figure").count(), 1);
      assert.equal(downloads, 0, "The visitor must choose Save image before any download");
      await screenshot(page, "dory-driftwall-fieldbook");
      await closeDialog(page); await page.getByTestId("voyage-return").click();
      await until(page, s => s.mode === "surface", "Dory excursion return aboard failed");
      assert.deepEqual(anchor(await state(page)), original); assert.deepEqual(errors, []);
      return { region: "driftwall", keptOnRequest: 1, downloads, originalVesselRestored: true };
    } finally { await context.close(); }
  });

  await check("quiet catch-and-release requires three actual hooked, reeled and released fish", async () => {
    const { page, context, errors } = await makePage({ reducedMotion: "reduce" });
    try {
      await boot(page); await deck(page, "fishing"); await page.getByTestId("start-fishing").click();
      assert.equal((await state(page)).released, 0);
      for (let round = 0; round < 3; round++) {
        await until(page, s => s.fishing === "casting", "Next fishing round not ready");
        await page.getByTestId("cast-line").click();
        for (let step = 0; (await state(page)).fishing === "waiting" && step < 8; step++) await page.getByTestId("fishing-advance").click();
        assert.equal((await state(page)).fishing, "bite");
        await page.getByTestId("hook-fish").click();
        assert.equal((await state(page)).released, round, "Hooking must not award a release");
        await page.getByTestId("reel-fish").click();
        for (let step = 0; (await state(page)).fishing === "reeling" && step < 25; step++) await page.getByTestId("fishing-advance").click();
        assert.equal((await state(page)).fishing, "landed");
        assert.equal((await state(page)).released, round, "Landing must not silently release a fish");
        if (round === 0) {
          await deck(page, "chart");
          assert.equal(await page.getByTestId("region-cathedral").isDisabled(), true, "Travel must respect challenge ownership");
          const frozen = await state(page); await delay(350); assert.deepEqual(await state(page), frozen, "Quiet view cannot secretly advance a game");
          await nav(page).getByRole("button", { name: /^Work/ }).click(); await closeDialog(page);
          assert.equal((await state(page)).activity, "fishing");
          await deck(page, "fishing");
        }
        await page.getByTestId("release-fish").click();
        await until(page, s => s.released === round + 1, "Explicit release was not counted");
      }
      assert.equal((await state(page)).fishing, "finished");
      await screenshot(page, "quiet-three-releases");
      await page.getByTestId("leave-challenge").click();
      assert.equal((await state(page)).activity, "none"); assert.deepEqual(errors, []);
      return { releases: 3, method: "Visible cast, hook, reel, explicit two-second steps, and release controls" };
    } finally { await context.close(); }
  });

  await check("guided docking travels the actual hull before three seconds inside the berth", async () => {
    const { page, context, errors } = await makePage({ reducedMotion: "reduce" });
    try {
      await boot(page); await deck(page, "fishing"); await page.getByRole("button", { name: "Try docking →", exact: true }).click();
      await page.getByTestId("start-docking").click(); const before = await state(page);
      await page.getByTestId("dock-assist").click(); const first = await state(page);
      assert.ok(Math.hypot(first.x - before.x, first.z - before.z) > 0.1, "Guided approach must move the real hull");
      assert.notEqual(first.docking, "finished", "A distant click cannot award docking");
      await page.locator("#yacht-controls").focus(); await page.keyboard.press("Escape");
      const stopped = await state(page);
      assert.equal(stopped.activity, "docking", "Escape pauses without losing challenge ownership");
      await delay(200); assert.deepEqual(anchor(await state(page)), anchor(stopped), "Stopped guide must stay at rest");
      await page.getByTestId("dock-assist").click(); const retried = await state(page);
      assert.ok(Math.hypot(retried.x - stopped.x, retried.z - stopped.z) > 0.1, "Retry after Escape must create a fresh real approach, not retain a stale assisted flag");
      let steps = 2;
      while ((await state(page)).docking !== "finished" && steps < 65) { await page.getByTestId("dock-assist").click(); steps++; }
      const final = await state(page);
      assert.equal(final.docking, "finished", `Guided approach did not settle: ${JSON.stringify(final)}`);
      assert.ok(Math.hypot(final.x + 113, final.z - 72) < 5);
      assert.ok(Math.abs(wrap(final.heading + Math.PI / 2)) < Math.PI / 18);
      assert.ok(Math.abs(final.speed) <= 0.6);
      await screenshot(page, "quiet-docking-complete"); assert.deepEqual(errors, []);
      return { steps, before: anchor(before), after: anchor(final), speed: final.speed, escapedAndRetried: true };
    } finally { await context.close(); }
  });

  await check("shoal run completes through six swept gate crossings with visible direction controls", async () => {
    const { page, context, errors } = await makePage({ reducedMotion: "reduce" });
    try {
      await boot(page); await travel(page, "crown"); await swimAs(page, "nemo");
      await deck(page, "fish"); await page.getByRole("button", { name: "Start the shoal run", exact: true }).click();
      assert.equal((await state(page)).fishGate, 0); await closeDeck(page);
      // These are public course positions, not writes to the running simulation.
      // The driver reads telemetry, turns by the real 15-degree input and swims
      // using the same single-tap controls supplied to a phone user.
      const points = [[20, -2.3, 0], [15, -2.3, 5], [8, -2.6, 11], [-7, -2.8, 11], [-17, -2.3, 1], [-8, -2.4, -10], [8, -2.3, -9]];
      const pad = page.locator(".exp-movement-pad"); let taps = 0;
      for (let gate = 0; gate < 6; gate++) {
        const prior = points[gate], center = points[gate + 1];
        const length = Math.hypot(center[0] - prior[0], center[2] - prior[2]);
        const beyond = { x: center[0] + (center[0] - prior[0]) / length * 0.9, z: center[2] + (center[2] - prior[2]) / length * 0.9 };
        let attempts = 0;
        while ((await state(page)).fishGate <= gate && attempts++ < 120) {
          const s = await state(page), target = Math.atan2(beyond.x - s.rx, -(beyond.z - s.rz));
          const turn = wrap(target - s.rh);
          const control = Math.abs(turn) > Math.PI / 24 + 0.025 ? turn > 0 ? "Turn right" : "Turn left" : Math.abs(center[1] - s.ry) > 0.3 ? center[1] > s.ry ? "Rise" : "Descend" : "Swim forward";
          await pad.getByRole("button", { name: control, exact: true }).click(); taps++;
        }
        assert.equal((await state(page)).fishGate, gate + 1, `Gate ${gate + 1} not crossed by input`);
      }
      const final = await state(page); assert.equal(final.fishCourse, "finished");
      await deck(page, "fish"); await screenshot(page, "quiet-shoal-run-complete");
      assert.deepEqual(errors, []); return { gates: final.fishGate, taps, method: "Real public directional input and swept controller; no teleport, debug mutation or timer mutation" };
    } finally { await context.close(); }
  });

  await check("touch stroke releases its timer before fresh held keyboard input and pause cancels the next pulse", async () => {
    const { page, context, errors } = await makePage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    try {
      await boot(page); await travel(page, "crown"); await swimAs(page, "nemo"); await closeDeck(page);
      // Observe real timer scheduling/cancellation and native key events. This
      // wrapper does not change delay, invoke callbacks early, or write app state.
      await page.evaluate(() => {
        const originalSet = window.setTimeout.bind(window), originalClear = window.clearTimeout.bind(window);
        const entries = [], timers = new Map(), keys = [];
        window.__owPulseEvidence = { entries, keys };
        window.setTimeout = function (callback, milliseconds, ...args) {
          if (milliseconds !== 260 || typeof callback !== "function") return originalSet(callback, milliseconds, ...args);
          const entry = { scheduled: performance.now(), deadline: performance.now() + milliseconds, fired: null, canceled: null };
          const id = originalSet(function (...values) { entry.fired = performance.now(); timers.delete(id); return callback(...values); }, milliseconds, ...args);
          entries.push(entry); timers.set(id, entry); return id;
        };
        window.clearTimeout = function (id) { const entry = timers.get(id); if (entry) { entry.canceled = performance.now(); timers.delete(id); } return originalClear(id); };
        document.addEventListener("keydown", event => { if (event.target?.id === "yacht-controls" && event.key.toLowerCase() === "w") keys.push({ at: performance.now(), repeat: event.repeat }); }, true);
      });
      const forward = page.locator(".exp-movement-pad").getByRole("button", { name: "Swim forward", exact: true });
      await forward.focus(); await forward.tap();
      await page.locator("#yacht-controls").focus(); await page.keyboard.down("w");
      const handoff = await page.evaluate(() => ({ pulse: window.__owPulseEvidence.entries.at(-1), key: window.__owPulseEvidence.keys.at(-1), now: performance.now() }));
      assert.ok(handoff.pulse && handoff.key, "Must observe both a real touch pulse and fresh helm keydown");
      assert.ok(handoff.key.at < handoff.pulse.deadline, "Fresh held input must begin before the old 260ms pulse deadline; timing fixture was too slow");
      assert.equal(handoff.key.repeat, false);
      // Pass the old timer's deadline before measuring sustained movement. An
      // uncleared callback would erase the fresh held input during this interval.
      await delay(Math.max(0, handoff.pulse.deadline - handoff.now) + 160);
      const afterDeadline = await state(page); await delay(360); const held = await state(page);
      await page.keyboard.up("w");
      const traveled = Math.hypot(held.rx - afterDeadline.rx, held.ry - afterDeadline.ry, held.rz - afterDeadline.rz);
      assert.ok(traveled > 0.3, `Fresh held movement was lost at the old pulse deadline: ${traveled}`);
      const first = await page.evaluate(() => window.__owPulseEvidence.entries[0]);
      assert.ok(first.canceled !== null && first.canceled < first.deadline, "Leaving the movement button must cancel its pulse timer");
      assert.equal(first.fired, null, "Canceled pulse cannot later clear keyboard input");

      await forward.focus(); await forward.tap();
      await page.locator("#exp-resume").click();
      await until(page, s => s.status === "PAUSED", "Pause did not freeze the pulse");
      const pausedAt = await state(page); await delay(360); const pausedLater = await state(page);
      nearPosition(pausedAt, pausedLater, "Paused reef pulse changed position");
      const second = await page.evaluate(() => window.__owPulseEvidence.entries.at(-1));
      assert.ok(second.scheduled > first.scheduled, "A separate pulse must exercise pause cancellation");
      assert.ok(second.canceled !== null && second.canceled < second.deadline, "Pause must cancel the pending touch pulse before its deadline");
      assert.equal(second.fired, null);
      await page.locator("#exp-resume").click(); await delay(180); const resumedAt = await state(page);
      await delay(360); nearPosition(resumedAt, await state(page), "Resume inherited input from the canceled pulse");
      assert.deepEqual(errors, []);
      return { method: "Actual touch-emulated tap, focus transfer and fresh held W; passive native timer/key observation; no time or scene mutation", firstPulse: first, freshKey: handoff.key, distanceAfterCanceledDeadline: traveled, pausedPulse: second };
    } finally { await page.keyboard.up("w").catch(() => {}); await context.close(); }
    function nearPosition(a, b, message) { assert.ok(Math.hypot(a.rx - b.rx, a.ry - b.ry, a.rz - b.rz) < 0.015, message); }
  });

  for (const [name, width, height] of [["small-phone", 320, 740], ["phone", 390, 844], ["phone-landscape", 844, 390]]) {
    await check(`${name} touch layout, reachable chart, fish movement and quiet range focus`, async () => {
      const { page, context, errors } = await makePage({ viewport: { width, height }, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
      try {
        await boot(page); await deck(page, "chart");
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, "Horizontal overflow");
        const drawer = await page.locator(".vd-drawer").boundingBox();
        assert.ok(drawer.height <= height * 0.45 + 2, `Drawer occupies too much scene: ${drawer.height}/${height}`);
        assert.ok(drawer.x >= 0 && drawer.x + drawer.width <= width + 1);
        if (name === "phone-landscape") {
          const body = await page.locator(".vd-body").boundingBox();
          for (const region of ["crown", "driftwall", "cathedral", "lantern"]) {
            const target = await page.getByTestId(`region-${region}`).boundingBox();
            assert.ok(target.height >= 44 && target.width >= 44, "Landscape chart keeps 44px travel targets");
            assert.ok(target.y >= body.y && target.y + target.height <= body.y + body.height + 1, "All four landscape destinations must be visible before scrolling");
          }
        }
        await screenshot(page, `${name}-chart`);
        await page.getByTestId("region-crown").tap(); await until(page, s => s.mode === "reef", "Touch dive failed");
        await swimAs(page, "dory"); await closeDeck(page);
        const pad = page.locator(".exp-movement-pad");
        for (const button of await pad.getByRole("button").all()) {
          const rect = await button.boundingBox();
          assert.ok(rect && rect.width >= 44 && rect.height >= 44, "Every touch movement target must be at least 44px");
          assert.ok(rect.x >= 0 && rect.x + rect.width <= width + 1 && rect.y >= 0 && rect.y + rect.height <= height + 1, `Movement control outside ${name} viewport`);
        }
        const before = await state(page); await pad.getByRole("button", { name: "Swim forward", exact: true }).tap();
        await until(page, s => Math.hypot(s.rx - before.rx, s.rz - before.rz) > 0.1, "Touch control did not move Dory");
        await deck(page, "help"); await page.locator(".vd-quiet summary").click();
        const range = page.locator(".vd-position-grid input[type=range]").first();
        await range.focus(); await page.keyboard.press("ArrowRight"); await page.keyboard.press("ArrowRight");
        assert.equal(await range.evaluate(el => document.activeElement === el), true, "Still-position input must keep keyboard focus");
        const axe = await new AxeBuilder({ page }).include(".voyage-deck").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
        assert.deepEqual(axe.violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })), []);
        await closeDeck(page); await screenshot(page, `${name}-dory`);
        await page.getByTestId("voyage-return").tap(); await until(page, s => s.mode === "surface", "Touch return aboard failed");
        assert.deepEqual(errors, []); return { width, height, touchTargets: 6, drawerHeight: drawer.height };
      } finally { await context.close(); }
    });
  }

  await check("region chunk failure preserves the vessel and professional routes", async () => {
    const { page, context } = await makePage(); let blocked = 0;
    try {
      await page.route(/RegionEnvironment(?:[-.\/]|\?)/, route => { blocked++; return route.abort("failed"); });
      await boot(page); const before = anchor(await state(page));
      await deck(page, "chart"); await page.getByTestId("region-crown").click();
      await page.locator(".exp-active-status").filter({ hasText: "This destination could not load. Your previous view and vessel are preserved. Choose another region or try again." }).waitFor({ timeout: 30000 });
      assert.ok(blocked > 0, "The intended region module was not actually fault-injected");
      const after = await until(page, s => s.mode === "surface", "Region failure did not restore previous surface");
      assert.deepEqual(anchor(after), before);
      await nav(page).getByRole("button", { name: /^Work/ }).click();
      assert.equal(await dialog(page).locator('a[href$="/case-studies/anticipy"]').count(), 1);
      await closeDialog(page); await nav(page).getByRole("button", { name: /^Contact/ }).click();
      assert.ok(await dialog(page).locator('a[href^="mailto:"]').count() > 0);
      await screenshot(page, "region-failure-contact-available");
      await page.unroute(/RegionEnvironment(?:[-.\/]|\?)/); await page.reload();
      await page.locator("#voyage.is-ready").waitFor({ timeout: 45000 });
      if (await page.locator("#take-helm").isVisible()) await page.locator("#take-helm").click();
      await travel(page, "crown"); return { blocked, preservedAnchor: before, freshLoadRecovery: true };
    } finally { await context.close(); }
  });

  await check("unavailable WebGL keeps four-region field guide, return aboard, work and contact", async () => {
    const { page, context } = await makePage({ reducedMotion: "reduce" });
    try {
      await page.addInitScript(() => {
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function(kind, ...args) {
          return /^(webgl|webgl2|experimental-webgl)$/.test(String(kind)) ? null : original.call(this, kind, ...args);
        };
      });
      await boot(page, false); await page.locator(".exp-fallback").waitFor(); const before = anchor(await state(page));
      for (const region of ["crown", "driftwall", "cathedral", "lantern"]) {
        await travel(page, region); assert.equal((await state(page)).status, "FALLBACK");
      }
      await closeDeck(page); await screenshot(page, "no-webgl-lantern-field-guide");
      await page.getByTestId("voyage-return").click(); await until(page, s => s.mode === "surface", "Fallback return aboard failed");
      assert.deepEqual(anchor(await state(page)), before);
      await nav(page).getByRole("button", { name: /^Work/ }).click();
      assert.ok(await dialog(page).locator('a[href*="case-studies/"]').count() >= 5);
      await closeDialog(page); await nav(page).getByRole("button", { name: /^Contact/ }).click();
      assert.ok(await dialog(page).locator('a[href^="mailto:"]').count() > 0);
      return { regions: 4, originalVesselRestored: true, professionalRoutesAvailable: true };
    } finally { await context.close(); }
  });
} finally {
  await browser.close();
  report.passed = report.checks.length > 0 && report.checks.every(check => check.status === "pass");
  await writeFile(path.join(output, path.basename(process.env.QA_REPORT_NAME || "browser-v4-report.json")), `${JSON.stringify(report, null, 2)}\n`);
  if (!report.passed) process.exitCode = 1;
}
