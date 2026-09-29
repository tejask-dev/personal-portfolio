/** Tablet/phone-landscape touch emulation; not physical-device evidence. */
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const url = process.env.QA_URL || "http://127.0.0.1:4173";
const images = path.join(root, "design/previews-v2");
await mkdir(images, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const report = {
  at: new Date().toISOString(),
  url,
  browser: `Google Chrome ${browser.version()}`,
  scope:
    "Tablet and phone-landscape viewport/coarse-pointer emulation with actual Chromium compositor touch events. Not physical devices.",
  checks: [],
  errors: [],
  screenshots: [],
};
const intersects = (a, b) =>
  a.x < b.x + b.width &&
  b.x < a.x + a.width &&
  a.y < b.y + b.height &&
  b.y < a.y + a.height;
try {
  for (const [width, height] of [
    [768, 1024],
    [844, 390],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height },
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    page.on("pageerror", (error) =>
      report.errors.push({ width, height, message: error.message }),
    );
    const cdp = await context.newCDPSession(page);
    const name = `${width}×${height} touch steering, racing, and expanded chart`;
    async function bounded(control, minimum = true) {
      const box = await control.boundingBox();
      assert.ok(
        box && box.width > 0 && box.height > 0,
        "Required control is hidden",
      );
      assert.ok(
        box.x >= -0.5 &&
          box.y >= -0.5 &&
          box.x + box.width <= width + 0.5 &&
          box.y + box.height <= height + 0.5,
        `Control outside viewport: ${JSON.stringify(box)}`,
      );
      if (minimum)
        assert.ok(
          box.width >= 43.5 && box.height >= 43.5,
          `Target smaller than 44px: ${JSON.stringify(box)}`,
        );
      assert.ok(
        await control.evaluate((element) => {
          const r = element.getBoundingClientRect();
          const hit = document.elementFromPoint(
            r.x + r.width / 2,
            r.y + r.height / 2,
          );
          return hit === element || element.contains(hit);
        }),
        "Control center intercepted by another element",
      );
      return box;
    }
    async function holdForward() {
      const box = await bounded(
        page.getByRole("button", { name: "Accelerate", exact: true }),
      );
      const before = await page
        .locator(".ow-experience")
        .evaluate((element) => ({
          x: Number(element.dataset.boatX),
          z: Number(element.dataset.boatZ),
        }));
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [
          { x: box.x + box.width / 2, y: box.y + box.height / 2, id: 0 },
        ],
      });
      await page.waitForTimeout(800);
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      const after = await page
        .locator(".ow-experience")
        .evaluate((element) => ({
          x: Number(element.dataset.boatX),
          z: Number(element.dataset.boatZ),
        }));
      const distance = Math.hypot(after.x - before.x, after.z - before.z);
      assert.ok(distance > 0.2, "Actual touch hold did not move yacht");
      return distance;
    }
    try {
      await page.goto(url, { waitUntil: "networkidle" });
      await page.waitForFunction(
        () =>
          document.querySelector(".ow-experience")?.dataset.yachtModel ===
          "licensed",
      );
      await page
        .getByRole("button", { name: "Take the helm", exact: true })
        .tap();
      await page.waitForTimeout(700);
      for (const name of ["Steer left", "Accelerate", "Reverse", "Steer right"])
        await bounded(page.getByRole("button", { name, exact: true }));
      const freeDistance = await holdForward();
      await page.getByRole("button", { name: /^Time trials/ }).tap();
      await bounded(
        page.getByRole("button", { name: "Start Jump circuit", exact: true }),
        false,
      );
      await page
        .getByRole("button", { name: "Start Jump circuit", exact: true })
        .tap();
      await page.waitForFunction(
        () =>
          document.querySelector(".ow-experience")?.dataset.racePhase ===
          "racing",
      );
      await bounded(
        page.getByRole("button", { name: "Free sail", exact: true }),
        false,
      );
      await bounded(
        page.getByRole("button", { name: "Restart race", exact: true }),
        false,
      );
      const panel = await page.locator(".ow-race-panel").boundingBox();
      assert.ok(
        panel &&
          panel.x >= 0 &&
          panel.y >= 0 &&
          panel.x + panel.width <= width &&
          panel.y + panel.height <= height,
        "Race HUD extends below viewport",
      );
      const chart = page.getByRole("button", { name: /^The archipelago/ });
      if ((await chart.getAttribute("aria-expanded")) === "false")
        await chart.tap();
      const chartBox = await page.locator(".ow-chart").boundingBox();
      const steering = await page.locator(".ow-touch-controls").boundingBox();
      assert.ok(
        !intersects(chartBox, steering),
        "Expanded chart overlaps steering",
      );
      assert.ok(
        !intersects(chartBox, panel),
        "Expanded chart overlaps race HUD",
      );
      const raceDistance = await holdForward();
      assert.ok(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth + 1,
        ),
        "Horizontal overflow",
      );
      const file = `touch-race-${width}x${height}.png`;
      await page.screenshot({ path: path.join(images, file) });
      report.screenshots.push(`design/previews-v2/${file}`);
      report.checks.push({
        name,
        status: "pass",
        freeDistance,
        raceDistance,
        racePanel: panel,
        chart: chartBox,
        steering,
      });
      console.log(`PASS ${name}`);
    } catch (error) {
      report.checks.push({
        name,
        status: "fail",
        error: String(error.stack || error),
      });
      await page
        .screenshot({
          path: path.join(images, `touch-layout-failure-${width}.png`),
        })
        .catch(() => {});
      console.error(`FAIL ${name}: ${error.message}`);
    } finally {
      await cdp
        .send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] })
        .catch(() => {});
      await context.close();
    }
  }
} finally {
  await browser.close();
  report.summary = {
    passed: report.checks.filter((check) => check.status === "pass").length,
    failed: report.checks.filter((check) => check.status === "fail").length,
  };
  await writeFile(
    path.join(root, "design/touch-layout-results-v2.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  if (report.summary.failed || report.errors.length) process.exitCode = 1;
}
