/**
 * Production-preview route checks using repository dependencies (optional QA_RUNTIME override).
 * QA_URL=http://127.0.0.1:4173 node --experimental-strip-types tests/open-water-static.mjs
 * Desktop Chrome with a 390px viewport; not real-device or field performance evidence.
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { caseStudyContent } from "../client/src/data/caseStudyContent.ts";
import { anticipyNarrative, leadStories, alsoWork, anticipyStatus } from "../client/src/components/portfolio-v4/content.ts";

const repository = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const runtime = path.resolve(process.env.QA_RUNTIME || repository);
const requireRuntime = createRequire(path.join(runtime, "package.json"));
const { chromium } = requireRuntime("playwright");
const baseURL = (process.env.QA_URL || "http://127.0.0.1:4173").replace(
  /\/$/,
  "",
);
const browser = await chromium.launch({ channel: "chrome", headless: true });
const versionSuffix = "-v4";
const screenshotDirectory = path.join(
  repository,
  `design/previews${versionSuffix}`,
);
await mkdir(screenshotDirectory, { recursive: true });
const report = {
  at: new Date().toISOString(),
  url: baseURL,
  browser: `Google Chrome ${browser.version()}`,
  scope:
    "Built production files served by local Vite preview, desktop Chrome at 390 × 844. No field metrics or real-device claims.",
  checks: [],
  screenshots: [],
  errors: [],
};

async function check(name, operation) {
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

try {
  await check("homepage initial document without JavaScript", async () => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    try {
      const response = await page.goto(`${baseURL}/`, { waitUntil: "load" });
      assert.equal(response.status(), 200);
      await page.locator(".static-portfolio").waitFor({ state: "visible" });
      assert.equal(await page.title(), "Tejass Kaushik, Software Engineer");
      const text = await page.locator("main").innerText();
      for (const expected of [
        "Tejass Kaushik",
        "COO at Anticipation Labs",
        "Western",
        "Ivey AEO",
        "tejas.kaushik@outlook.com",
      ])
        assert.ok(text.includes(expected));
      for (const study of caseStudyContent)
        assert.ok(
          (await page
            .locator(`a[href$="/case-studies/${study.slug}"]`)
            .count()) > 0,
        );
      await page.screenshot({
        path: path.join(screenshotDirectory, "static-home-390.png"),
        fullPage: false,
      });
      report.screenshots.push(
        `design/previews${versionSuffix}/static-home-390.png`,
      );
      return await reflow(page);
    } finally {
      await context.close();
    }
  });

  for (const study of caseStudyContent) {
    await check(`no JavaScript direct route: ${study.slug}`, async () => {
      const context = await browser.newContext({
        javaScriptEnabled: false,
        viewport: { width: 390, height: 844 },
      });
      const page = await context.newPage();
      try {
        const response = await page.goto(
          `${baseURL}/case-studies/${study.slug}`,
          { waitUntil: "load" },
        );
        assert.equal(response.status(), 200);
        assert.equal(
          await page.title(),
          `${study.title} | Tejass Kaushik`,
        );
        assert.equal(
          await page.locator('link[rel="canonical"]').getAttribute("href"),
          `https://tejasskaushik.com/case-studies/${study.slug}`,
        );
        assert.equal(
          await page.getByRole("heading", { level: 1 }).innerText(),
          study.title,
        );
        const text = await page.locator("main").innerText();
        assert.ok(
          text.includes(study.summary),
          "Shared study summary is missing from initial HTML",
        );
        if (study.slug === "anticipy") {
          assert.match(await page.locator("#context h2").innerText(), /^From intention\s+to action\.$/);
          assert.equal(await page.locator("#outcome h2").innerText(), "Where it stands.");
          for (const value of [anticipyNarrative.context, anticipyNarrative.team, anticipyNarrative.personal, anticipyNarrative.personalLesson, ...alsoWork]) assert.ok(text.includes(value), "Anticipy shared prose missing");
          for (const story of leadStories) for (const key of ["title", "intro", "role", "decision", "outcome"]) assert.ok(text.includes(story[key]), `${story.id}: missing ${key}`);
          for (const item of anticipyStatus) assert.ok(text.includes(item.result), "Device/status boundary missing");
        } else {
          for (const section of study.sections) {
            assert.ok(text.includes(section.heading));
            for (const paragraph of section.body) assert.ok(text.includes(paragraph), `Missing prose: ${section.heading}`);
          }
          for (const value of [...study.contributions, ...study.decision.body, study.lesson]) if (value) assert.ok(text.includes(value), `${study.slug}: missing shared content`);
        }
        const sections = ["context", "contribution", "decision", "outcome", ...(study.lesson ? ["lesson"] : []), "sources"];
        for (const id of sections) assert.equal(await page.locator(`#${id}`).count(), 1, `${study.slug}: ${id} section`);
        assert.equal(await page.getByRole("link", { name: /Back to Open Water|Return to water/ }).count(), 0, "Static cases never force world entry");
        const json = JSON.parse(
          await page
            .locator('script[type="application/ld+json"]')
            .textContent(),
        );
        assert.ok(
          json["@graph"].some(
            (entry) =>
              entry["@type"] === "WebPage" &&
              entry.url.endsWith(`/case-studies/${study.slug}`),
          ),
        );
        assert.equal(await page.locator(".static-portfolio").count(), 1);
        if (study.slug === "anticipy") {
          await page.screenshot({
            path: path.join(screenshotDirectory, "static-anticipy-390.png"),
            fullPage: false,
          });
          report.screenshots.push(
            `design/previews${versionSuffix}/static-anticipy-390.png`,
          );
        }
        return {
          ...(await reflow(page)),
          summaryLength: study.summary.length,
          sections: study.sections.length,
        };
      } finally {
        await context.close();
      }
    });

    await check(
      `JavaScript direct route and return: ${study.slug}`,
      async () => {
        const context = await browser.newContext({
          viewport: { width: 390, height: 844 },
          reducedMotion: "reduce",
        });
        const page = await context.newPage();
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        try {
          const response = await page.goto(
            `${baseURL}/case-studies/${study.slug}`,
            { waitUntil: "networkidle" },
          );
          assert.equal(response.status(), 200);
          await page.locator(".case-page h1").waitFor({ state: "visible" });
          assert.equal(
            await page.title(),
            `${study.title} | Tejass Kaushik`,
          );
          assert.equal(
            await page.getByRole("heading", { level: 1 }).innerText(),
            study.title,
          );
          assert.equal(
            await page.locator(".static-portfolio").count(),
            0,
            "Static initial shell was not replaced",
          );
          const widths = await reflow(page);
          assert.equal(await page.getByRole("link", { name: /Back to Open Water|Return to water/ }).count(), 0);
          await page.getByRole("navigation", { name: "Case study navigation" }).locator('a[href="/#work"]').click();
          await page.locator("#work-title").waitFor({ state: "visible" });
          assert.equal(new URL(page.url()).hash, "#work");
          await page.waitForFunction(() => document.activeElement?.id === "work-title");
          assert.equal(await page.locator("#voyage").count(), 0, "Reading return leaves the world unloaded");
          assert.equal(await page.title(), "Tejass Kaushik, Software Engineer");
          await reflow(page);
          assert.deepEqual(errors, [], "Unhandled browser errors");
          return {
            ...widths,
            returnURL: page.url(),
            focus: await page.evaluate(() => document.activeElement?.id),
          };
        } finally {
          report.errors.push(
            ...errors.map((message) => ({ study: study.slug, message })),
          );
          await context.close();
        }
      },
    );
  }
} finally {
  await browser.close();
  report.summary = {
    passed: report.checks.filter((check) => check.status === "pass").length,
    failed: report.checks.filter((check) => check.status === "fail").length,
  };
  await writeFile(
    path.join(repository, `design/static-results${versionSuffix}.json`),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  console.log(JSON.stringify(report.summary));
  if (report.summary.failed) process.exitCode = 1;
}
