/**
 * Browser gesture regression: the decorative canvas must preserve native pinch
 * zoom and vertical scrolling. This exercises Chromium's compositor gestures,
 * not merely the computed CSS declaration. It is mobile emulation, not a phone.
 * Run after npm run build with a production preview listening on QA_URL:
 * QA_URL=http://127.0.0.1:4173 node tests/open-water-touch.mjs
 * QA_RUNTIME optionally points to an external Playwright runtime.
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runtime = path.resolve(process.env.QA_RUNTIME || repository);
const requireRuntime = createRequire(path.join(runtime, "package.json"));
const { chromium } = requireRuntime("playwright");
const baseURL = process.env.QA_URL || "http://127.0.0.1:4173";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const report = {
  at: new Date().toISOString(),
  url: baseURL,
  browser: `Google Chrome ${browser.version()}`,
  scope: "Chromium touch emulation using native compositor gestures; not physical-device evidence.",
  checks: [],
};
try {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
  });
  page.setDefaultTimeout(15000);
  const cdp = await page.context().newCDPSession(page);
  async function ready() {
    await page.goto(baseURL, { waitUntil: "networkidle" });
    await page.waitForFunction(() => document.querySelector(".ow-experience")?.classList.contains("is-ready"));
    assert.notEqual(await page.locator(".ow-experience").getAttribute("data-state"), "FALLBACK");
  }
  await ready();
  const beforeZoom = await page.evaluate(() => visualViewport.scale);
  await cdp.send("Input.synthesizePinchGesture", {
    x: 100,
    y: 600,
    scaleFactor: 2,
    relativeSpeed: 500,
    gestureSourceType: "touch",
  });
  await page.waitForFunction(() => visualViewport.scale > 1.5);
  const afterZoom = await page.evaluate(() => visualViewport.scale);
  assert.ok(afterZoom > beforeZoom * 1.5, `Native pinch zoom was blocked: ${beforeZoom} -> ${afterZoom}`);
  report.checks.push({ name: "canvas-preserves-native-pinch-zoom", status: "pass", beforeZoom, afterZoom });
  console.log("PASS canvas-preserves-native-pinch-zoom");

  await ready();
  await cdp.send("Input.synthesizeScrollGesture", {
    x: 100,
    y: 650,
    yDistance: -300,
    speed: 800,
    gestureSourceType: "touch",
  });
  await page.waitForFunction(() => window.scrollY > 100);
  const scrollY = await page.evaluate(() => window.scrollY);
  assert.equal(await page.locator(".ow-experience").getAttribute("data-state"), "PAUSED", "Scrolling should not start a voyage");
  report.checks.push({ name: "canvas-preserves-native-vertical-scroll", status: "pass", scrollY });
  console.log("PASS canvas-preserves-native-vertical-scroll");
} catch (error) {
  report.checks.push({ name: "touch-gesture-regression", status: "fail", error: String(error.stack || error) });
  process.exitCode = 1;
  console.error(error);
} finally {
  await browser.close();
  await mkdir(path.join(repository, "design", "previews"), { recursive: true });
  await writeFile(path.join(repository, "design", "previews", "touch-qa.json"), JSON.stringify(report, null, 2) + "\n");
}
