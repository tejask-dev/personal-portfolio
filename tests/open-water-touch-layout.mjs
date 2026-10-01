/** Actual compositor taps at phone/tablet/landscape sizes. V3 intentionally uses
 * short throttle impulses and ten-degree steering steps instead of hold pads.
 * Viewport emulation does not establish physical-device usability/performance. */
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const url = process.env.QA_URL || "http://127.0.0.1:4173";
const output = path.join(root, "design/open-water-v3/implementation-qa/touch");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const report = {
  at: new Date().toISOString(),
  url,
  browser: `Google Chrome ${browser.version()}`,
  scope: "Desktop Chrome with mobile/coarse-pointer emulation and real browser touch events; no physical-phone claim.",
  entryAssets: [...(await (await fetch(url)).text()).matchAll(/(?:src|href)="([^"?]*\/assets\/[^"?]+\.(?:js|css))"/g)].map(match => match[1]),
  checks: [],
  errors: [],
  screenshots: [],
};
const observe = page => page.locator("#voyage").evaluate(element => ({
  x: +element.dataset.boatX,
  z: +element.dataset.boatZ,
  heading: +element.dataset.boatHeading,
  phase: element.dataset.racePhase,
  elapsed: +element.dataset.raceElapsed,
}));
const intersects = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width &&
  a.y < b.y + b.height && b.y < a.y + a.height;

try {
  for (const [width, height] of [[390, 844], [768, 1024], [844, 390]]) {
    const name = `${width}×${height} actual steering, racing, and map pause`;
    if (process.env.QA_ONLY && !new RegExp(process.env.QA_ONLY, "i").test(name)) continue;
    const context = await browser.newContext({
      viewport: { width, height }, isMobile: true, hasTouch: true,
    });
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    page.on("pageerror", error => report.errors.push({ width, height, message: error.message }));
    async function bounded(control, scroll = false) {
      if (scroll) await control.scrollIntoViewIfNeeded();
      const box = await control.boundingBox();
      assert.ok(box && box.x >= -.5 && box.y >= -.5 &&
        box.x + box.width <= width + .5 && box.y + box.height <= height + .5,
      `Clipped touch control ${JSON.stringify(box)}`);
      assert.ok(box.width >= 43.5 && box.height >= 43.5,
        `Touch target below 44px ${JSON.stringify(box)}`);
      assert.ok(await control.evaluate(element => {
        const bounds = element.getBoundingClientRect();
        const hit = document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
        return hit === element || element.contains(hit);
      }), "Control center intercepted");
      return box;
    }
    async function tapForward() {
      const button = page.getByRole("button", { name: "Accelerate", exact: true });
      await bounded(button);
      const before = await observe(page);
      await button.tap();
      await page.waitForTimeout(850);
      const after = await observe(page);
      const distance = Math.hypot(after.x - before.x, after.z - before.z);
      assert.ok(distance > .2, "Actual throttle tap did not move boat");
      return distance;
    }
    try {
      await page.goto(url, { waitUntil: "networkidle" });
      await page.waitForFunction(() => document.querySelector("#voyage")?.dataset.yachtModel === "licensed");
      await page.locator("#take-helm").tap();
      // Entering changes the editorial document into a viewport scene and
      // scrolls to its start in rAF. Observe that committed layout before
      // measuring; the harness must never scroll a hidden control into place.
      await page.waitForFunction(() => {
        const top = document.querySelector("#voyage")?.getBoundingClientRect().top;
        return top !== undefined && Math.abs(top) <= 1;
      }, undefined, { timeout: 1500 });
      for (const control of ["Turn left", "Accelerate", "Reverse", "Turn right"])
        await bounded(page.getByRole("button", { name: control, exact: true }));
      const initial = await observe(page);
      await page.getByRole("button", { name: "Turn right", exact: true }).tap();
      const turn = await observe(page);
      assert.ok(Math.abs(turn.heading - initial.heading) > .1, "Actual touch steering did not turn yacht");
      const freeDistance = await tapForward();

      await page.locator(".exp-discovery-rail").getByRole("button", { name: /Playground/ }).tap();
      const beginRace = page.locator("dialog[open]").getByRole("button", { name: "Start Jump circuit", exact: true });
      await bounded(beginRace, true);
      await beginRace.tap();
      await page.waitForFunction(() => document.querySelector("#voyage")?.dataset.racePhase === "racing");
      await bounded(page.getByRole("button", { name: "Free sail", exact: true }));
      await bounded(page.getByRole("button", { name: "Restart race", exact: true }));
      const panel = await page.locator(".ow-race-panel").boundingBox();
      const pad = await page.locator(".exp-movement-pad").boundingBox();
      assert.ok(!intersects(panel, pad), "Race HUD overlaps touch steering");
      const raceDistance = await tapForward();

      await page.locator(".exp-nav").getByRole("button", { name: /^Map/ }).tap();
      await page.waitForFunction(() => document.querySelector("#voyage")?.dataset.state === "READING");
      // The paused frame flushes the last physics sample into low-rate DOM
      // telemetry. Start the stability interval after that render has committed.
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const mapState = await observe(page);
      await page.waitForTimeout(500);
      assert.equal((await observe(page)).elapsed, mapState.elapsed, "Map reading did not pause race");
      const routes = page.locator("dialog[open] .exp-map-destinations")
        .getByRole("button", { name: "Sail there", exact: true });
      assert.equal(await routes.count(), 4);
      for (const route of await routes.all())
        assert.equal(await route.isDisabled(), true, "Map route can silently cancel race");
      await page.locator("dialog[open]").getByRole("button", { name: /^Close / }).tap();
      assert.equal(await page.locator("#voyage").getAttribute("data-state"), "PAUSED");
      await page.getByRole("button", { name: "Free sail", exact: true }).tap();
      assert.equal((await observe(page)).phase, "idle");
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), "Horizontal overflow");
      const image = path.join(output, `touch-${width}x${height}.png`);
      await page.screenshot({ path: image });
      report.screenshots.push(path.relative(root, image));
      report.checks.push({ name, status: "pass", freeDistance, raceDistance, turn: turn.heading - initial.heading, panel, pad });
      console.log(`PASS ${width}×${height} touch controls`);
    } catch (error) {
      report.checks.push({ name, status: "fail", error: String(error.stack || error) });
      await page.screenshot({ path: path.join(output, `failure-${width}.png`) }).catch(() => {});
      console.error(`FAIL ${width}×${height}: ${error.message}`);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
  report.summary = {
    passed: report.checks.filter(check => check.status === "pass").length,
    failed: report.checks.filter(check => check.status === "fail").length,
  };
  await writeFile(path.join(output, "../touch-layout-results.json"), `${JSON.stringify(report, null, 2)}\n`);
  if (report.summary.failed || report.errors.length) process.exitCode = 1;
}
