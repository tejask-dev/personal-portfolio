/** Focused final-build Cathedral shader check, after exclusive GPU handoff.
 * Uses public controls; GL instrumentation observes submissions and link status.
 * QA_URL=http://127.0.0.1:4175 node tests/open-water-v4-cave-cross-browser.mjs
 * Emulated phone viewports are not physical iPhone or native Safari acceptance.
 */
import assert from "node:assert/strict";
import { firefox, webkit } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const url = process.env.QA_URL || "http://127.0.0.1:4175/";
const output = path.resolve("design/open-water-v4/implementation-qa/final-cave-cross-browser");
await mkdir(output, { recursive: true });
const report = {
  at: new Date().toISOString(), url,
  scope: "Final production Cathedral daylight ShaderMaterial in Playwright Firefox and WebKit. Phone Low and desktop High through public controls; actual WebGL draw submissions and shader linking observed. This is viewport/touch emulation on one Mac, not physical-mobile or native Safari acceptance.",
  entryAssets: [...(await (await fetch(url)).text()).matchAll(/(?:src|href)="([^"?]*\/assets\/[^"?]+\.(?:js|css))"/g)].map(match => match[1]),
  engines: [], checks: [], screenshots: [],
};

async function observeGL(page) {
  await page.addInitScript(() => {
    const stats = window.__owCaveQA = { draws: 0, links: 0, failedLinks: [], contexts: [] };
    for (const api of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
      if (!api) continue;
      const proto = api.prototype;
      for (const key of ["drawArrays", "drawElements", "drawArraysInstanced", "drawElementsInstanced"]) {
        if (typeof proto[key] !== "function") continue;
        const original = proto[key];
        proto[key] = function(...args) { stats.draws++; return original.apply(this, args); };
      }
      const link = proto.linkProgram;
      proto.linkProgram = function(program) {
        const result = link.call(this, program);
        stats.links++;
        if (!this.getProgramParameter(program, this.LINK_STATUS)) stats.failedLinks.push(this.getProgramInfoLog(program));
        return result;
      };
    }
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(kind, ...args) {
      const result = getContext.call(this, kind, ...args);
      if (result && /^webgl|experimental-webgl/.test(kind)) stats.contexts.push({ kind, version: result.getParameter(result.VERSION), renderer: result.getParameter(result.RENDERER) });
      return result;
    };
  });
}

const state = page => page.locator("#voyage").evaluate(element => ({ ...element.dataset }));
const gl = page => page.evaluate(() => ({ ...window.__owCaveQA }));

for (const [engine, api] of [["firefox", firefox], ["webkit", webkit]]) {
  let browser;
  try {
    browser = await api.launch({ headless: true });
    report.engines.push({ engine, version: browser.version(), available: true });
    for (const tier of ["low", "high"]) {
      const viewport = tier === "low" ? { width: 390, height: 844 } : { width: 1440, height: 960 };
      const name = `${engine} Cathedral ${tier} ${viewport.width}px`;
      const context = await browser.newContext({ viewport, hasTouch: tier === "low", deviceScaleFactor: 1, reducedMotion: "no-preference" });
      const page = await context.newPage();
      page.setDefaultTimeout(20000);
      const errors = [], consoleErrors = [];
      page.on("pageerror", error => errors.push(error.message));
      page.on("console", message => {
        if (message.type() === "error" || /shader.*(?:error|fail)|VALIDATE_STATUS.*false/i.test(message.text())) consoleErrors.push(message.text());
      });
      const started = Date.now();
      try {
        await observeGL(page);
        const response = await page.goto(url, { waitUntil: "networkidle" });
        assert.equal(response.status(), 200);
        await page.locator("#voyage.is-ready").waitFor({ timeout: 45000 });
        assert.notEqual((await state(page)).state, "FALLBACK");
        await page.locator("#take-helm").click();
        await page.getByTestId("voyage-deck").waitFor();
        await page.getByRole("button", { name: "Motion / settings", exact: true }).click();
        const settings = page.locator("dialog[open]");
        await settings.getByRole("button", { name: tier === "low" ? "Low" : "High", exact: true }).click();
        await settings.getByRole("button", { name: /^Close / }).click();
        const surfacePixels = await page.locator(".exp-scene canvas").screenshot();
        await page.getByTestId("voyage-chart").click();
        await page.getByTestId("region-cathedral").click();
        await page.waitForFunction(() => {
          const data = document.querySelector("#voyage")?.dataset;
          return data?.mode === "reef" && data?.region === "cathedral";
        });
        await page.locator(".exp-dive-curtain").waitFor({ state: "hidden" });
        const closeDeck = page.getByRole("button", { name: "Close expedition panel", exact: true });
        if (await closeDeck.isVisible()) await closeDeck.click();
        const resume = page.locator("#exp-resume");
        if (await resume.isVisible() && /Resume/.test(await resume.textContent())) await resume.click();
        const before = await gl(page);
        await page.waitForTimeout(1400);
        const after = await gl(page), telemetry = await state(page);
        assert.equal(telemetry.mode, "reef");
        assert.equal(telemetry.region, "cathedral");
        assert.equal(telemetry.quality, tier);
        assert.notEqual(telemetry.state, "FALLBACK");
        assert.ok(after.contexts.length > 0, "No real WebGL context");
        assert.ok(after.draws - before.draws > 50, "Settled Cathedral did not issue real draw calls");
        assert.ok(after.links > 0, "No shaders linked");
        assert.deepEqual(after.failedLinks, [], "Shader linking failure");
        assert.deepEqual(errors, [], "Uncaught page errors");
        assert.deepEqual(consoleErrors, [], "Browser or shader errors");
        const cavePixels = await page.locator(".exp-scene canvas").screenshot();
        assert.ok(!surfacePixels.equals(cavePixels), "Cave did not visibly replace the surface");
        const screenshot = path.join(output, `${engine}-cathedral-${tier}-${viewport.width}.png`);
        await page.screenshot({ path: screenshot });
        report.screenshots.push(screenshot);
        const loadedAssets = await page.evaluate(() => performance.getEntriesByType("resource").map(entry => new URL(entry.name).pathname).filter(name => /\/assets\/.*\.(?:js|css)$/.test(name)));
        report.checks.push({ name, status: "pass", durationMs: Date.now() - started, viewport, quality: telemetry.quality, renderedDrawSubmissions: after.draws - before.draws, shaderLinks: after.links, contexts: after.contexts, visibleRegionChange: true, errors, consoleErrors, loadedAssets, screenshot });
        console.log(`PASS ${name}: ${after.draws - before.draws} settled draw submissions; ${after.links} linked shaders`);
      } catch (error) {
        report.checks.push({ name, status: "fail", durationMs: Date.now() - started, error: String(error.stack || error), errors, consoleErrors });
        console.error(`FAIL ${name}: ${error.message}`);
      } finally { await context.close(); }
    }
  } catch (error) {
    report.engines.push({ engine, available: false, error: String(error.stack || error) });
  } finally { await browser?.close(); }
}
report.passed = report.checks.length === 4 && report.checks.every(check => check.status === "pass") && report.engines.every(engine => engine.available);
await writeFile(path.join(output, "report.json"), JSON.stringify(report, null, 2) + "\n");
console.log(`${report.checks.filter(check => check.status === "pass").length}/4 focused final cave checks passed`);
if (!report.passed) process.exitCode = 1;
