/** Installed Chrome plus Playwright Firefox/WebKit checks, local preview only.
 * WebKit is not a claim about native Safari or an iPhone. No simulation mutation.
 * QA_URL=http://127.0.0.1:4173 node tests/open-water-cross-browser.mjs
 */
import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repository = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const baseURL = (process.env.QA_URL || "http://127.0.0.1:4173").replace(
  /\/$/,
  "",
);
const run = process.env.QA_RUN_LABEL || "v4";
const artifactDirectory = path.join(repository, "design/open-water-v4/implementation-qa/cross-browser");
await mkdir(artifactDirectory, { recursive: true });
const report = {
  at: new Date().toISOString(),
  run,
  url: baseURL,
  scope:
    "Local production-preview desktop browser engines with emulated viewport sizes. No native Safari, physical mobile device, or field performance claim.",
  entryAssets:[...(await (await fetch(baseURL)).text()).matchAll(/(?:src|href)="([^"?]*\/assets\/[^"?]+\.(?:js|css))"/g)].map(match=>match[1]),
  engines: [],
  checks: [],
  errors: [],
  screenshots: [],
};
const filter = process.env.QA_ENGINES?.split(",");
const loadedAssets = page => page.evaluate(() => performance.getEntriesByType("resource")
  .map(entry => new URL(entry.name).pathname)
  .filter(name => /\/assets\/(?:index|OpenWaterScene|ReefEnvironment|RegionEnvironment)-.*\.(?:js|css)$/.test(name)));

async function check(name, operation) {
  if(process.env.QA_ONLY&&!new RegExp(process.env.QA_ONLY,"i").test(name))return;
  try {
    const details = await operation();
    report.checks.push({ name, status: "pass", details });
    console.log(`PASS ${name}`);
  } catch (error) {
    report.checks.push({
      name,
      status: "fail",
      error: String(error.stack || error),
    });
    console.error(`FAIL ${name}: ${error.message}`);
  }
}
async function reflow(page) {
  const widths = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  assert.ok(
    Math.max(widths.document, widths.body) <= widths.viewport + 1,
    `Horizontal overflow: ${JSON.stringify(widths)}`,
  );
  return widths;
}
for (const [name, api, options] of [
  ["chrome", chromium, { channel: "chrome" }],
  ["firefox", firefox, {}],
  ["webkit", webkit, {}],
]) {
  if (filter && !filter.includes(name)) continue;
  let browser;
  try {
    browser = await api.launch({ headless: true, ...options });
    report.engines.push({ name, version: browser.version(), available: true });
  } catch (error) {
    report.engines.push({ name, available: false, error: error.message });
    continue;
  }
  try {
    for (const [width, height] of [
      [390, 844],
      [1440, 960],
    ])
      await check(
        `${name} ${width}px opening, index, case, return`,
        async () => {
          const context = await browser.newContext({
            viewport: { width, height },
            reducedMotion: "reduce",
            deviceScaleFactor: 1,
          });
          const page = await context.newPage();
          const errors = [];
          page.on("pageerror", (error) => errors.push(error.message));
          page.setDefaultTimeout(20000);
          try {
            const response = await page.goto(baseURL, {
              waitUntil: "networkidle",
            });
            assert.equal(response.status(), 200);
            await page.waitForFunction(() => {
              const experience = document.querySelector(".ow-experience");
              return (
                experience?.classList.contains("is-ready") ||
                experience?.getAttribute("data-state") === "FALLBACK"
              );
            });
            const graphics = await page
              .locator(".ow-experience")
              .evaluate((element) =>
                element.getAttribute("data-state") !== "FALLBACK" &&
                element.classList.contains("is-ready")
                  ? "ready"
                  : "fallback",
              );
            if (graphics === "ready")
              await page.waitForFunction(
                () =>
                  document.querySelector(".ow-experience")?.dataset
                    .yachtModel === "licensed",
              );
            const widths = await reflow(page);
            const screenshot = `${name}-opening-${width}.png`;
            await page.screenshot({
              path: path.join(artifactDirectory, screenshot),
              fullPage: false,
            });
            report.screenshots.push(`design/open-water-v4/implementation-qa/cross-browser/${screenshot}`);
            const trigger=page.locator(".exp-nav").getByRole("button",{name:/^Work/});
            await trigger.click();
            const dialog = page.getByRole("dialog");
            await dialog.waitFor({ state: "visible" });
            for (let index = 0; index < 10; index++) {
              // WebKit on macOS uses Option+Tab to include links without changing
              // the user's global keyboard-navigation preference.
              await page.keyboard.press(name === "webkit" ? "Alt+Tab" : "Tab");
              assert.ok(
                await dialog.evaluate((element) =>
                  element.contains(document.activeElement),
                ),
                "Focus escaped modal",
              );
            }
            await page.keyboard.press("Escape");
            await dialog.waitFor({ state: "hidden" });
            await page.waitForFunction(
              (element) => document.activeElement === element,
              await trigger.elementHandle(),
            );
            assert.ok(
              await trigger.evaluate(
                (element) => document.activeElement === element,
              ),
              "Work index did not restore focus",
            );
            // Keyboard activation and a different modal page must retain the
            // same outside origin, not a now-hidden button inside the dialog.
            await trigger.focus();
            await page.keyboard.press("Enter");
            await dialog.waitFor({ state: "visible" });
            await dialog.getByRole("button", { name: "Map", exact: true }).click();
            await page.keyboard.press("Escape");
            await dialog.waitFor({ state: "hidden" });
            await page.waitForFunction(
              element => document.activeElement === element,
              await trigger.elementHandle(),
            );
            await trigger.click();
            await page.locator('dialog[open] a[href$="/case-studies/stellar-learning"]').click();
            await page.locator(".case-page h1").waitFor({ state: "visible" });
            assert.equal(
              await page.locator(".case-page h1").innerText(),
              "Stellar Learning",
            );
            assert.match(
              await page.locator("main").innerText(),
              /40,000\+ learners/,
            );
            await reflow(page);
            await page
              .getByRole("navigation", { name: "Case study navigation" })
              .getByRole("link", { name: "Return to water", exact: true })
              .click();
            await page.locator(".ow-experience").waitFor({ state: "visible" });
            assert.equal(new URL(page.url()).hash, "#voyage");
            await reflow(page);
            assert.deepEqual(errors, [], "Unhandled page errors");
            return {
              ...widths,
              graphics,
              readingNavigation: "pass",
              focusReturn: "pointer activation and keyboard activation with nested panel navigation",
              loadedAssets: await loadedAssets(page),
              keyboardNavigation:
                name === "webkit"
                  ? "Option+Tab (macOS link navigation)"
                  : "Tab",
            };
          } finally {
            report.errors.push(
              ...errors.map((message) => ({ name, width, message })),
            );
            await context.close();
          }
        },
      );
    await check(
      `${name} actual keyboard ramp takeoff and landing`,
      async () => {
        const context = await browser.newContext({
          viewport: { width: 1440, height: 960 },
        });
        const page = await context.newPage();
        const errors = [];
        page.on("pageerror", error => errors.push(error.message));
        page.setDefaultTimeout(20000);
        try {
          await page.goto(baseURL, { waitUntil: "networkidle" });
          await page.waitForFunction(() =>
            document
              .querySelector(".ow-experience")
              ?.classList.contains("is-ready"),
          );
          await page.waitForFunction(
            () =>
              document.querySelector(".ow-experience")?.dataset.yachtModel ===
              "licensed",
          );
          await page.locator("#take-helm").click();
          await page.locator(".exp-discovery-rail").getByRole("button",{name:/Playground/}).click();
          await page
            .getByRole("button", { name: "Start Jump circuit", exact: true })
            .click();
          await page.waitForFunction(
            () =>
              document.querySelector(".ow-experience")?.dataset.racePhase ===
              "racing",
          );
          await page.locator("#yacht-controls").focus();
          await page.keyboard.down("w");
          let airborne = false,
            landed = false,
            final;
          const deadline = Date.now() + 20000;
          while (Date.now() < deadline && !landed) {
            final = await page
              .locator(".ow-experience")
              .evaluate((element) => ({
                x: Number(element.dataset.boatX),
                z: Number(element.dataset.boatZ),
                airborne: element.dataset.airborne === "true",
                jumps: Number(element.dataset.jumpCount),
                checkpoint: Number(element.dataset.raceCheckpoint),
              }));
            if (final.airborne) airborne = true;
            if (airborne && !final.airborne) landed = true;
            await page.waitForTimeout(100);
          }
          await page.keyboard.up("w");
          assert.ok(
            airborne && landed && final.jumps >= 1,
            "No actual ramp takeoff and landing observed",
          );
          assert.ok(
            final.checkpoint >= 2,
            "First water and airborne gates did not register",
          );
          await page
            .getByRole("button", { name: "Free sail", exact: true })
            .click();
          await page.waitForFunction(
            () =>
              document.querySelector(".ow-experience")?.dataset.racePhase ===
              "idle",
          );
          assert.deepEqual(errors, [], "Unhandled page errors during actual ramp controls");
          return { ...final, airborneObserved: airborne, landingObserved: landed, loadedAssets: await loadedAssets(page) };
        } finally {
          report.errors.push(...errors.map(message => ({ name, test: "ramp", message })));
          await page.keyboard.up("w").catch(() => {});
          await context.close();
        }
      },
    );
    await check(`${name} global pause freezes canvas`, async () => {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 960 },
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      page.setDefaultTimeout(20000);
      try {
        await page.goto(baseURL, { waitUntil: "networkidle" });
        await page.waitForFunction(() =>
          document
            .querySelector(".ow-experience")
            ?.classList.contains("is-ready"),
        );
        await page.waitForFunction(
          () =>
            document.querySelector(".ow-experience")?.dataset.yachtModel ===
            "licensed",
        );
        await page.locator("#take-helm").click();
        await page.waitForTimeout(3500);
        await page.getByRole("button",{name:"Pause",exact:true}).click();
        await page.waitForTimeout(350);
        const canvas = page.locator(".exp-scene canvas");
        const before = await canvas.screenshot();
        await page.waitForTimeout(850);
        const after = await canvas.screenshot();
        assert.ok(before.equals(after), "Canvas pixels changed while paused");
        assert.deepEqual(errors, [], "Unhandled page errors while pausing");
        return { canvasBytes: before.length, unchangedIntervalMs: 850, loadedAssets: await loadedAssets(page) };
      } finally {
        report.errors.push(...errors.map(message => ({ name, test: "pause", message })));
        await context.close();
      }
    });
  } finally {
    await browser.close();
  }
}
report.summary = {
  passed: report.checks.filter((item) => item.status === "pass").length,
  failed: report.checks.filter((item) => item.status === "fail").length,
  unavailable: report.engines
    .filter((item) => !item.available)
    .map((item) => item.name),
  graphicsFallbacks: report.checks
    .filter((item) => item.details?.graphics === "fallback")
    .map((item) => item.name),
};
await writeFile(
  path.join(repository, "design/open-water-v4/implementation-qa/cross-browser-results.json"),
  `${JSON.stringify(report, null, 2)}\n`,
);
console.log(JSON.stringify(report.summary));
if (
  report.summary.failed ||
  report.summary.unavailable.length ||
  report.summary.graphicsFallbacks.length
)
  process.exitCode = 1;
