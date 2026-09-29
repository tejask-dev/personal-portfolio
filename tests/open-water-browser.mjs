/**
 * Local Chrome integration checks with the repository's development dependencies:
 * Start the production preview after npm run build, then npm run test:browser.
 * QA_URL=http://127.0.0.1:4173 npm run test:browser
 * Development error overlays can intercept the deliberate graphics-failure checks.
 * QA_RUNTIME optionally points to a separate runtime containing Playwright and axe.
 * These are desktop Chrome and viewport-emulation checks, not real mobile/Safari/Firefox tests.
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repository = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const runtime = path.resolve(process.env.QA_RUNTIME || repository);
const requireRuntime = createRequire(path.join(runtime, "package.json"));
const { chromium } = requireRuntime("playwright");
const AxeBuilder = requireRuntime("@axe-core/playwright").default;
const baseURL = process.env.QA_URL || "http://127.0.0.1:4173";
const artifactDirectory = path.join(repository, "design", "previews");
const faultInjectionChecks = new Set([
  "context-loss",
  "webgl-unavailable",
  "unavailable-media",
  "scene-chunk-unavailable",
]);
await mkdir(artifactDirectory, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const report = {
  at: new Date().toISOString(),
  run: process.env.QA_RUN_LABEL || "local-check",
  url: baseURL,
  browser: `Google Chrome ${browser.version()}`,
  scope:
    "Local automated desktop Chrome with emulated viewport sizes; not device, Safari, Firefox, screen-reader, or real-user performance evidence.",
  visualBaseline:
    "Screenshots captured for human inspection. No production visual regression baseline exists.",
  checks: [],
  consoleErrors: [],
  failedRequests: [],
  accessibility: [],
  screenshots: [],
};

async function check(name, operation) {
  const start = performance.now();
  try {
    const details = await operation();
    report.checks.push({
      name,
      status: "pass",
      durationMs: Math.round(performance.now() - start),
      ...(details ? { details } : {}),
    });
    console.log(`PASS ${name}`);
  } catch (error) {
    report.checks.push({
      name,
      status: "fail",
      durationMs: Math.round(performance.now() - start),
      error: String(error.stack || error),
    });
    console.error(`FAIL ${name}: ${error.message}`);
  }
}

async function makePage(name, options = {}) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    deviceScaleFactor: 1,
    ...options,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  await page.addInitScript(() => {
    window.__openWaterQaDrawCalls = 0;
    for (const Context of [
      window.WebGLRenderingContext,
      window.WebGL2RenderingContext,
    ]) {
      if (!Context) continue;
      for (const name of [
        "drawArrays",
        "drawElements",
        "drawArraysInstanced",
        "drawElementsInstanced",
      ]) {
        const original = Context.prototype[name];
        if (!original) continue;
        Context.prototype[name] = function (...args) {
          window.__openWaterQaDrawCalls++;
          return original.apply(this, args);
        };
      }
    }
  });
  page.on("pageerror", (error) =>
    report.consoleErrors.push({
      check: name,
      kind: "pageerror",
      message: error.message,
    }),
  );
  page.on("console", (message) => {
    if (message.type() === "error")
      report.consoleErrors.push({
        check: name,
        kind: "console",
        message: message.text(),
      });
  });
  page.on("requestfailed", (request) =>
    report.failedRequests.push({
      check: name,
      url: request.url(),
      error: request.failure()?.errorText,
    }),
  );
  page.on("response", (response) => {
    if (response.status() >= 400)
      report.failedRequests.push({
        check: name,
        url: response.url(),
        status: response.status(),
      });
  });
  return { context, page };
}

async function ready(page) {
  await page.goto(baseURL, { waitUntil: "networkidle" });
  await page.waitForFunction(() => {
    const experience = document.querySelector(".ow-experience");
    return (
      experience?.classList.contains("is-ready") ||
      experience?.getAttribute("data-state") === "FALLBACK"
    );
  });
  assert.notEqual(
    await page.locator(".ow-experience").getAttribute("data-state"),
    "FALLBACK",
    "normal Chrome run unexpectedly entered graphics fallback",
  );
  await page.evaluate(() => document.fonts.ready);
}

async function assertReflow(page) {
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    body: document.body.scrollWidth,
    document: document.documentElement.scrollWidth,
  }));
  assert.ok(
    Math.max(dimensions.body, dimensions.document) <= dimensions.viewport + 1,
    `horizontal overflow: ${JSON.stringify(dimensions)}`,
  );
  return dimensions;
}

async function screenshot(page, filename) {
  await page.screenshot({
    path: path.join(artifactDirectory, filename),
    fullPage: false,
  });
  report.screenshots.push(`design/previews/${filename}`);
}

async function audit(page, label) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  const violations = result.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    description: violation.description,
    help: violation.helpUrl,
    nodes: violation.nodes.map((node) => ({
      target: node.target,
      html: node.html,
      summary: node.failureSummary,
    })),
  }));
  report.accessibility.push({
    label,
    violations,
    incomplete: result.incomplete.map((item) => item.id),
  });
  assert.equal(
    violations.length,
    0,
    `${label}: ${violations.map((item) => `${item.id} (${item.nodes.length} nodes)`).join(", ")}`,
  );
}

try {
  for (const [width, height] of [
    [320, 740],
    [390, 844],
    [768, 1024],
    [1440, 960],
    [1920, 1080],
  ]) {
    await check(`responsive ${width}×${height}`, async () => {
      const { context, page } = await makePage(`viewport-${width}`, {
        viewport: { width, height },
      });
      try {
        await ready(page);
        await page
          .getByRole("button", { name: "Take the helm", exact: true })
          .waitFor({ state: "visible" });
        await page
          .getByRole("button", { name: "Work index", exact: true })
          .waitFor({ state: "visible" });
        const dimensions = await assertReflow(page);
        if (width === 390 || width === 1440) {
          await page
            .getByRole("button", { name: "Motion on", exact: true })
            .click();
          await page.waitForTimeout(250);
          await screenshot(
            page,
            width === 390
              ? "open-water-mobile-390.png"
              : "open-water-desktop-1440.png",
          );
        }
        return dimensions;
      } finally {
        await context.close();
      }
    });
  }

  await check(
    "200% equivalent reflow at 720×480 CSS pixels (not actual browser zoom)",
    async () => {
      const { context, page } = await makePage("zoom-equivalent", {
        viewport: { width: 720, height: 480 },
        deviceScaleFactor: 2,
      });
      try {
        await ready(page);
        await page
          .getByRole("button", { name: "Work index", exact: true })
          .waitFor({ state: "visible" });
        await assertReflow(page);
        await page
          .getByRole("button", { name: "Work index", exact: true })
          .click();
        await page.getByRole("dialog").waitFor({ state: "visible" });
        await assertReflow(page);
        await page.locator("#index-stellar").click();
        await page.waitForURL("**/case-studies/stellar-learning");
        await assertReflow(page);
        return "Reflow emulation for a 1440×960 display at 200%; actual browser zoom controls were not exercised.";
      } finally {
        await context.close();
      }
    },
  );

  await check(
    "scrolling the experience offscreen stops GPU draws and returning resumes them",
    async () => {
      const { context, page } = await makePage("offscreen-rendering");
      try {
        await ready(page);
        await page.locator(".ow-experience").evaluate((element) =>
          window.scrollTo({
            top: window.scrollY + element.getBoundingClientRect().bottom + 10,
            behavior: "instant",
          }),
        );
        await page.waitForTimeout(400);
        assert.ok(await page.locator(".ow-experience").evaluate(element => element.getBoundingClientRect().bottom <= 0), "test did not move the whole experience out of view");
        const draws = await page.evaluate(() => window.__openWaterQaDrawCalls);
        assert.ok(draws > 0);
        await page.waitForTimeout(500);
        assert.equal(
          await page.evaluate(() => window.__openWaterQaDrawCalls),
          draws,
          "offscreen experience continued rendering",
        );
        await page.evaluate(() =>
          window.scrollTo({ top: 0, behavior: "instant" }),
        );
        await page.waitForTimeout(400);
        assert.ok(
          (await page.evaluate(() => window.__openWaterQaDrawCalls)) > draws,
          "visible experience did not resume rendering",
        );
      } finally {
        await context.close();
      }
    },
  );

  await check(
    "index dialog focus containment, Escape, and focus restoration",
    async () => {
      const { context, page } = await makePage("dialog");
      try {
        await ready(page);
        const trigger = page.getByRole("button", {
          name: "Work index",
          exact: true,
        });
        await trigger.click();
        const dialog = page.getByRole("dialog");
        await dialog.waitFor({ state: "visible" });
        assert.equal(
          await page.locator(".ow-experience").getAttribute("data-state"),
          "READING",
        );
        for (let index = 0; index < 14; index++) {
          await page.keyboard.press(index < 7 ? "Tab" : "Shift+Tab");
          assert.ok(
            await dialog.evaluate((element) =>
              element.contains(document.activeElement),
            ),
            "focus escaped the native dialog",
          );
        }
        await page.keyboard.press("Escape");
        await dialog.waitFor({ state: "hidden" });
        assert.ok(
          await trigger.evaluate(
            (element) => element === document.activeElement,
          ),
          "focus did not return to Work index",
        );
      } finally {
        await context.close();
      }
    },
  );

  await check(
    "steering, manual takeover, paused pixels, and resumed motion",
    async () => {
      const { context, page } = await makePage("movement");
      try {
        await ready(page);
        await page
          .getByRole("button", { name: "Take the helm", exact: true })
          .click();
        await page.locator(".ow-helm-focus").focus();
        const marker = page.locator(".ow-map g[transform]");
        const initial = await marker.getAttribute("transform");
        await page.keyboard.down("w");
        await page.waitForTimeout(800);
        await page.keyboard.up("w");
        assert.notEqual(
          await marker.getAttribute("transform"),
          initial,
          "keyboard steering did not move the chart marker",
        );
        await page
          .getByRole("button", {
            name: "Sail to Signal Station: Anticipy",
            exact: true,
          })
          .click();
        await page.waitForFunction(
          () =>
            document
              .querySelector(".ow-experience")
              ?.getAttribute("data-state") === "AUTOPILOT",
        );
        await page.locator(".ow-helm-focus").focus();
        await page.keyboard.down("w");
        await page.waitForTimeout(250);
        await page.keyboard.up("w");
        assert.equal(
          await page.locator(".ow-experience").getAttribute("data-state"),
          "SAILING",
          "manual input did not cancel autopilot",
        );
        await page
          .getByRole("button", { name: "Motion on", exact: true })
          .click();
        await page.waitForTimeout(350);
        assert.equal(
          await page.locator(".ow-experience").getAttribute("data-state"),
          "PAUSED",
        );
        const paused = await page.locator(".ow-experience").screenshot();
        const pausedMarker = await marker.getAttribute("transform");
        const pausedDrawCalls = await page.evaluate(
          () => window.__openWaterQaDrawCalls,
        );
        assert.ok(
          pausedDrawCalls > 0,
          "WebGL draw instrumentation did not observe the running scene",
        );
        await page.waitForTimeout(850);
        assert.ok(
          paused.equals(await page.locator(".ow-experience").screenshot()),
          "pixels changed while motion was paused",
        );
        assert.equal(await marker.getAttribute("transform"), pausedMarker);
        assert.equal(
          await page.evaluate(() => window.__openWaterQaDrawCalls),
          pausedDrawCalls,
          "WebGL kept drawing while paused",
        );
        await page
          .getByRole("button", { name: "Motion paused", exact: true })
          .click();
        await page.waitForTimeout(500);
        assert.notEqual(
          await marker.getAttribute("transform"),
          pausedMarker,
          "resume did not restore movement",
        );
        await page.locator(".ow-helm-focus").focus();
        await page.keyboard.press("Escape");
        assert.equal(
          await page.locator(".ow-experience").getAttribute("data-state"),
          "PAUSED",
          "Escape did not release steering",
        );
        assert.equal(
          await page.evaluate(() => document.activeElement?.id),
          "back-opening",
          "Escape did not move focus to a visible control",
        );
        await page.locator("#back-opening").waitFor({ state: "visible" });
      } finally {
        await context.close();
      }
    },
  );

  await check(
    "About from the index closes reading and focuses the biography",
    async () => {
      const { context, page } = await makePage("about-focus");
      try {
        await ready(page);
        await page
          .getByRole("button", { name: "Work index", exact: true })
          .click();
        await page.locator("#index-about").click();
        await page.getByRole("dialog").waitFor({ state: "hidden" });
        await page.waitForFunction(
          () => document.activeElement?.id === "about-title",
        );
        const position = await page.locator("#about-title").boundingBox();
        assert.ok(
          position && position.y >= 0 && position.y < 960,
          "focused biography heading is outside the viewport",
        );
      } finally {
        await context.close();
      }
    },
  );

  await check(
    "mobile first touch accelerates and a vertical gesture scrolls the page",
    async () => {
      const { context, page } = await makePage("mobile-touch", {
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
      });
      try {
        await ready(page);
        await page
          .getByRole("button", { name: "Take the helm", exact: true })
          .tap();
        const marker = page.locator(".ow-map g[transform]");
        const before = await marker.getAttribute("transform");
        const box = await page
          .getByRole("button", { name: "Accelerate", exact: true })
          .boundingBox();
        assert.ok(box, "mobile accelerate control is missing");
        const session = await context.newCDPSession(page);
        await session.send("Input.dispatchTouchEvent", {
          type: "touchStart",
          touchPoints: [
            { x: box.x + box.width / 2, y: box.y + box.height / 2, id: 0 },
          ],
        });
        await page.waitForTimeout(700);
        await session.send("Input.dispatchTouchEvent", {
          type: "touchEnd",
          touchPoints: [],
        });
        assert.notEqual(
          await marker.getAttribute("transform"),
          before,
          "the first touch press failed to move the boat",
        );
        await session.send("Input.dispatchTouchEvent", {
          type: "touchStart",
          touchPoints: [{ x: 100, y: 550, id: 0 }],
        });
        for (const y of [500, 450, 400, 350, 300, 250]) {
          await session.send("Input.dispatchTouchEvent", {
            type: "touchMove",
            touchPoints: [{ x: 100, y, id: 0 }],
          });
          await page.waitForTimeout(20);
        }
        await session.send("Input.dispatchTouchEvent", {
          type: "touchEnd",
          touchPoints: [],
        });
        await page.waitForTimeout(250);
        assert.ok(
          await page.evaluate(() => window.scrollY > 100),
          "the ocean prevented ordinary vertical touch scrolling",
        );
      } finally {
        await context.close();
      }
    },
  );

  await check(
    "destination arrival opens a real route and returns to the voyage",
    async () => {
      const { context, page } = await makePage("arrival");
      try {
        await ready(page);
        await page
          .getByRole("button", {
            name: "Sail to Signal Station: Anticipy",
            exact: true,
          })
          .click();
        await page
          .locator("#arrival-read")
          .waitFor({ state: "visible", timeout: 45000 });
        await page.locator("#arrival-read").click();
        await page.waitForURL("**/case-studies/anticipy");
        await page
          .getByRole("heading", { level: 1, name: "Anticipy", exact: true })
          .waitFor();
        await page.goBack();
        await page.locator(".ow-experience").waitFor();
        assert.ok(
          await page
            .locator(".ow-experience")
            .evaluate((element) => element.classList.contains("is-sailing")),
          "return lost the existing voyage",
        );
      } finally {
        await context.close();
      }
    },
  );

  await check(
    "reduced motion starts static and opens work without sailing",
    async () => {
      const { context, page } = await makePage("reduced-motion", {
        reducedMotion: "reduce",
      });
      try {
        await ready(page);
        assert.equal(
          await page.locator(".ow-experience").getAttribute("data-state"),
          "PAUSED",
        );
        await page.waitForTimeout(400);
        const before = await page.locator(".ow-experience").screenshot();
        const draws = await page.evaluate(() => window.__openWaterQaDrawCalls);
        await page.waitForTimeout(900);
        assert.ok(
          before.equals(await page.locator(".ow-experience").screenshot()),
          "reduced-motion scene changed pixels without interaction",
        );
        assert.equal(
          await page.evaluate(() => window.__openWaterQaDrawCalls),
          draws,
          "reduced-motion scene kept drawing",
        );
        await page
          .getByRole("button", { name: "Explore the work", exact: true })
          .click();
        await page.getByRole("dialog").waitFor({ state: "visible" });
        await page.locator("#index-stellar").click();
        await page.waitForURL("**/case-studies/stellar-learning");
        await page
          .getByRole("heading", {
            level: 1,
            name: "Stellar Learning",
            exact: true,
          })
          .waitFor();
      } finally {
        await context.close();
      }
    },
  );

  await check(
    "WebGL context loss exposes a usable reading fallback",
    async () => {
      const { context, page } = await makePage("context-loss");
      try {
        await ready(page);
        const supported = await page
          .locator(".ow-scene canvas")
          .evaluate((canvas) => {
            const gl =
              canvas.getContext("webgl2") || canvas.getContext("webgl");
            const extension = gl?.getExtension("WEBGL_lose_context");
            if (!extension) return false;
            extension.loseContext();
            return true;
          });
        assert.ok(
          supported,
          "WEBGL_lose_context extension unavailable in this Chrome run",
        );
        await page.waitForFunction(
          () =>
            document
              .querySelector(".ow-experience")
              ?.getAttribute("data-state") === "FALLBACK",
        );
        await page
          .getByRole("button", { name: "Explore the work", exact: true })
          .click();
        await page.getByRole("dialog").waitFor({ state: "visible" });
        await page.locator("#index-anticipy").click();
        await page.waitForURL("**/case-studies/anticipy");
      } finally {
        await context.close();
      }
    },
  );

  await check(
    "WebGL initialization failure keeps the index and direct links",
    async () => {
      const { context, page } = await makePage("webgl-unavailable");
      try {
        await page.addInitScript(() => {
          const original = HTMLCanvasElement.prototype.getContext;
          HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
            return /^(webgl2?|experimental-webgl)$/.test(kind)
              ? null
              : original.call(this, kind, ...args);
          };
        });
        await page.goto(baseURL, { waitUntil: "networkidle" });
        await page.waitForFunction(
          () =>
            document
              .querySelector(".ow-experience")
              ?.getAttribute("data-state") === "FALLBACK",
        );
        await page
          .getByRole("button", { name: "Work index", exact: true })
          .click();
        await page.getByRole("dialog").waitFor({ state: "visible" });
        await page.locator("#index-research").click();
        await page.waitForURL("**/case-studies/global-health-research");
        await assertReflow(page);
      } finally {
        await context.close();
      }
    },
  );

  await check(
    "unavailable scene JavaScript falls back to usable portfolio content",
    async () => {
      const { context, page } = await makePage("scene-chunk-unavailable");
      try {
        await page.route(/OpenWaterScene[^/]*\.(tsx?|js)(\?.*)?$/, (route) =>
          route.abort("failed"),
        );
        await page.goto(baseURL, { waitUntil: "networkidle" });
        await page.waitForFunction(
          () =>
            document
              .querySelector(".ow-experience")
              ?.getAttribute("data-state") === "FALLBACK",
        );
        await page
          .getByRole("button", { name: "Work index", exact: true })
          .click();
        await page.getByRole("dialog").waitFor({ state: "visible" });
        await page.locator("#index-anticipy").click();
        await page.waitForURL("**/case-studies/anticipy");
        await page
          .getByRole("heading", { level: 1, name: "Anticipy", exact: true })
          .waitFor();
      } finally {
        await context.close();
      }
    },
  );

  for (const [slug, title] of [
    ["anticipy", "Anticipy"],
    ["stellar-learning", "Stellar Learning"],
    ["global-health-research", "Global health research"],
    ["soma-ai", "Soma AI"],
  ]) {
    await check(`direct route /case-studies/${slug}`, async () => {
      const { context, page } = await makePage(`route-${slug}`, {
        viewport: { width: 390, height: 844 },
      });
      try {
        const response = await page.goto(`${baseURL}/case-studies/${slug}`, {
          waitUntil: "networkidle",
        });
        assert.equal(response.status(), 200);
        await page
          .getByRole("heading", { level: 1, name: title, exact: true })
          .waitFor();
        await assertReflow(page);
        assert.ok((await page.title()).includes(title));
        assert.ok(
          await page
            .locator('link[rel="canonical"]')
            .getAttribute("href")
            .then((value) => value.endsWith(`/case-studies/${slug}`)),
        );
      } finally {
        await context.close();
      }
    });
  }

  await check(
    "no JavaScript exposes profile and project links in initial HTML",
    async () => {
      const { context, page } = await makePage("no-javascript", {
        javaScriptEnabled: false,
      });
      try {
        const response = await page.goto(baseURL, { waitUntil: "load" });
        const source = await response.text();
        const text = await page.locator("body").innerText();
        assert.match(text, /Tejass Kaushik/);
        assert.match(text, /Anticipy/);
        assert.match(text, /Stellar Learning/);
        assert.match(source, /Founding Software Engineer/);
        assert.ok(
          (await page
            .locator('a[href="/case-studies/stellar-learning"]')
            .count()) > 0,
        );
        assert.ok(
          (await page
            .locator('a[href="mailto:tejas.kaushik@outlook.com"]')
            .count()) > 0,
        );
      } finally {
        await context.close();
      }
    },
  );

  await check(
    "unavailable project media keeps content and links usable",
    async () => {
      const { context, page } = await makePage("unavailable-media");
      try {
        await page.route(/\.(png|jpg|jpeg|webp)(\?.*)?$/i, (route) =>
          route.request().resourceType() === "image"
            ? route.abort("failed")
            : route.continue(),
        );
        await page.goto(`${baseURL}/case-studies/stellar-learning`, {
          waitUntil: "networkidle",
        });
        await page
          .getByRole("heading", {
            level: 1,
            name: "Stellar Learning",
            exact: true,
          })
          .waitFor();
        assert.ok((await page.locator("main").innerText()).length > 400);
        assert.ok((await page.locator("main a").count()) > 0);
        await assertReflow(page);
      } finally {
        await context.close();
      }
    },
  );

  await check(
    "WCAG AA automated audit: opening, index, and case study",
    async () => {
      const { context, page } = await makePage("axe", {
        reducedMotion: "reduce",
      });
      try {
        await ready(page);
        const failures = [];
        for (const [label, prepare] of [
          ["opening", async () => {}],
          [
            "index",
            async () =>
              page
                .getByRole("button", { name: "Work index", exact: true })
                .click(),
          ],
          [
            "stellar-case-study",
            async () =>
              page.goto(`${baseURL}/case-studies/stellar-learning`, {
                waitUntil: "networkidle",
              }),
          ],
        ]) {
          await prepare();
          if (label === "index") await screenshot(page, "open-water-index-1440.png");
          if (label === "stellar-case-study") await screenshot(page, "stellar-case-study-1440.png");
          try {
            await audit(page, label);
          } catch (error) {
            failures.push(error.message);
          }
        }
        assert.equal(failures.length, 0, failures.join("; "));
      } finally {
        await context.close();
      }
    },
  );

  await check("no unexpected runtime or network errors", async () => {
    const errors = report.consoleErrors.filter(
      (error) => !faultInjectionChecks.has(error.check),
    );
    const requests = report.failedRequests.filter(
      (request) =>
        !faultInjectionChecks.has(request.check) && !request.error?.includes("ERR_ABORTED"),
    );
    assert.deepEqual(errors, [], "unexpected browser runtime errors");
    assert.deepEqual(requests, [], "unexpected failed network requests");
  });
} finally {
  await browser.close();
  report.expectedFaultInjection = {
    consoleErrors: report.consoleErrors.filter(item => faultInjectionChecks.has(item.check)),
    failedRequests: report.failedRequests.filter(item => faultInjectionChecks.has(item.check)),
  };
  report.consoleErrors = report.consoleErrors.filter(item => !faultInjectionChecks.has(item.check));
  report.failedRequests = report.failedRequests.filter(item => !faultInjectionChecks.has(item.check));
  report.summary = {
    passed: report.checks.filter((check) => check.status === "pass").length,
    failed: report.checks.filter((check) => check.status === "fail").length,
  };
  await writeFile(
    path.join(repository, "design", "browser-results.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  console.log(JSON.stringify(report.summary));
  if (report.summary.failed) process.exitCode = 1;
}
