/**
 * Drives real W/A/S/D inputs against visible racing controls. It observes public
 * simulation telemetry but never calls a state setter, advances time, or teleports
 * except via the user's explicit Start/Restart race controls.
 * QA_URL=http://127.0.0.1:4173 node tests/open-water-gameplay.mjs
 */
import assert from "node:assert/strict";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as world from "../client/src/features/open-water/data/world.ts";

const repository = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const baseURL = (process.env.QA_URL || "http://127.0.0.1:4173").replace(
  /\/$/,
  "",
);
const qaDirectory = path.resolve(repository, process.env.QA_OUTPUT || "design/open-water-v4/implementation-qa");
const artifactDirectory = path.join(qaDirectory, "gameplay");
await mkdir(artifactDirectory, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const report = {
  at: new Date().toISOString(),
  url: baseURL,
  browser: `Google Chrome ${browser.version()}`,
  scope:
    "Local preview with actual Playwright keyboard events and read-only DOM telemetry. No simulation setters, synthetic completion, real-device, or field-performance claim.",
  entryAssets:[...(await (await fetch(baseURL)).text()).matchAll(/(?:src|href)="([^"?]*\/assets\/[^"?]+\.(?:js|css))"/g)].map(match=>match[1]),
  checks: [],
  courses: [],
  screenshots: [],
  errors: [],
};
const wrap = (angle) => Math.atan2(Math.sin(angle), Math.cos(angle));
const racing = ["racing", "running"];
const finished = ["finished", "complete", "completed"];

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
async function observe(page) {
  return page.locator(".ow-experience").evaluate((element) => {
    const data = element.dataset;
    return {
      phase: data.racePhase,
      checkpoint: Number(data.raceCheckpoint),
      elapsed: Number(data.raceElapsed),
      x: Number(data.boatX),
      z: Number(data.boatZ),
      heading: Number(data.boatHeading),
      speed: Number(data.boatSpeed),
      airborne: data.airborne === "true",
      jumpCount: Number(data.jumpCount),
      state: data.state,
      vessel: data.vessel,
    };
  });
}
async function ready(width = 1440, height = 960) {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  page.on("pageerror", (error) => report.errors.push(error.message));
  await page.goto(baseURL, { waitUntil: "networkidle" });
  await page.waitForFunction(() =>
    document.querySelector(".ow-experience")?.classList.contains("is-ready"),
  );
  await page.waitForFunction(
    () =>
      document.querySelector(".ow-experience")?.dataset.yachtModel ===
      "licensed",
  );
  return page;
}
async function openPlayground(page) {
  const take=page.locator("#take-helm");
  if(await take.isVisible())await take.click();
  await page.locator(".exp-discovery-rail").getByRole("button",{name:/Playground/}).click();
  await page.locator("dialog[open]").waitFor();
}
async function start(page, course) {
  if(!(await page.locator("dialog[open]").getByRole("button",{name:`Start ${course.name}`,exact:true}).isVisible()))await openPlayground(page);
  await page.locator("dialog[open]").getByRole("button",{name:`Start ${course.name}`,exact:true}).click();
  await page.waitForFunction(()=>document.querySelector(".ow-experience")?.dataset.racePhase==="countdown");
  await page.waitForTimeout(150);
}
async function map(page){
  const button=page.locator(".exp-nav").getByRole("button",{name:/^Map/});
  // The phone opening prioritizes Work and Contact; Map appears after entering
  // the expedition. Follow that actual user path before checking its targets.
  if(!(await button.isVisible()))await page.locator("#take-helm").click();
  await button.click();
}
async function closePanel(page){await page.locator("dialog[open]").getByRole("button",{name:/^Close /}).click();}
async function bounded(control,width,height,minimum=44){
  await control.scrollIntoViewIfNeeded();const box=await control.boundingBox();
  assert.ok(box&&box.x>=-.5&&box.y>=-.5&&box.x+box.width<=width+.5&&box.y+box.height<=height+.5,`Clipped control ${JSON.stringify(box)}`);
  assert.ok(box.width>=minimum-.5&&box.height>=minimum-.5,`Target smaller than ${minimum}px ${JSON.stringify(box)}`);return box;
}

async function screenshot(page, filename) {
  await page.screenshot({
    path: path.join(artifactDirectory, filename),
    fullPage: false,
  });
  report.screenshots.push(path.relative(repository, path.join(artifactDirectory, filename)));
}

const courses = world.raceCourses || world.courses || [];
try {
  assert.equal(courses.length, 5, "The five public race courses must all be available");
  for (const [width, height] of [
    [320, 740],
    [390, 844],
    [768, 1024],
    [1440, 960],
    [1920, 1080],
  ])
    await check(`race controls reflow ${width}×${height}`, async () => {
      const page = await ready(width, height);
      try {
        await map(page);
        const targets=page.locator("dialog[open] .exp-map-destinations").getByRole("button",{name:"Sail there",exact:true});
        assert.equal(await targets.count(),4,"Four direct destination controls missing");
        for(const target of await targets.all())await bounded(target,width,height);
        await closePanel(page);
        await openPlayground(page);
        const dimensions=await page.evaluate(()=>({viewport:document.documentElement.clientWidth,document:document.documentElement.scrollWidth}));
        assert.ok(dimensions.document<=dimensions.viewport+1,"Course menu horizontal overflow");
        for(const course of courses)await bounded(page.locator("dialog[open]").getByRole("button",{name:`Start ${course.name}`,exact:true}),width,height);
        if(width===390||width===1440)await screenshot(page,`race-menu-${width}.png`);
        await start(page, courses[1]);
        const exit = await page
          .getByRole("button", { name: "Free sail", exact: true })
          .boundingBox();
        assert.ok(
          exit &&
            exit.x >= 0 &&
            exit.y >= 0 &&
            exit.x + exit.width <= width + 1 &&
            exit.y + exit.height <= height,
          "Free sail control clipped",
        );
        if (width === 390 || width === 1440) {
          await screenshot(page, `race-countdown-${width}.png`);
          const audit = await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze();
          assert.deepEqual(
            audit.violations.map((v) => ({ id: v.id, count: v.nodes.length })),
            [],
            "Race UI automated accessibility violations",
          );
        }
        return dimensions;
      } finally {
        await page.context().close();
      }
    });
  await check(
    "race countdown, pause, restart, index pause, and free-sail exit",
    async () => {
      const page = await ready();
      try {
        await start(page, courses[0]);
        const first = await observe(page);
        assert.equal(first.checkpoint, 0);
        assert.equal(
          await page.locator(".exp-discovery-rail button:disabled").count(),
          2,
          "Competing activity can cancel a countdown implicitly",
        );
        await page
          .getByRole("button", { name: "Pause", exact: true })
          .click();
        const paused = await observe(page);
        await page.waitForTimeout(1000);
        const still = await observe(page);
        assert.equal(
          still.phase,
          "countdown",
          "Countdown continued while paused",
        );
        assert.equal(
          still.elapsed,
          paused.elapsed,
          "Race clock continued while paused",
        );
        await page
          .getByRole("button", { name: "Resume", exact: true })
          .click();
        await page.waitForFunction(() =>
          ["racing", "running"].includes(
            document.querySelector(".ow-experience")?.dataset.racePhase,
          ),
        );
        assert.equal(
          await page.locator(".exp-discovery-rail button:disabled").count(),
          2,
          "Competing activity can cancel an active race implicitly",
        );
        assert.match(
          await page.getByRole("timer").getAttribute("aria-label"),
          /^Elapsed time [0-9]{2}:[0-9]{2}\.[0-9]{2}$/,
        );
        await page
          .locator(".exp-nav").getByRole("button", { name: /^Work/ })
          .click();
        await page.getByRole("dialog").waitFor({ state: "visible" });
        await page.waitForTimeout(200);
        const reading = await observe(page);
        await page.waitForTimeout(900);
        assert.equal(
          (await observe(page)).elapsed,
          reading.elapsed,
          "Race clock continued during index reading",
        );
        await page.keyboard.press("Escape");
        await page.getByRole("dialog").waitFor({ state: "hidden" });
        await page
          .getByRole("button", { name: "Restart race", exact: true })
          .click();
        const restarted = await observe(page);
        assert.equal(restarted.phase, "countdown");
        assert.equal(restarted.checkpoint, 0);
        assert.ok(restarted.elapsed < 0.1);
        await page
          .getByRole("button", { name: "Free sail", exact: true })
          .click();
        await page.waitForFunction(
          () =>
            document.querySelector(".ow-experience")?.dataset.racePhase ===
            "idle",
        );
        return {
          pausedCountdown: "pass",
          pausedIndex: "pass",
          restart: "pass",
          freeSail: "pass",
        };
      } finally {
        await page.context().close();
      }
    },
  );

  await check("Low-detail largest circuit stays within rendering budgets", async () => {
    const page = await ready(390, 844);
    try {
      const largest = courses.reduce((chosen, course) => course.gates.length > chosen.gates.length ? course : chosen);
      await start(page, largest);
      await page.waitForFunction(() => document.querySelector("#voyage")?.dataset.racePhase === "racing");
      const samples = [];
      // A short observation of published renderer statistics, not a frame-rate
      // or thermal benchmark. Waiting through countdown excludes old boot data.
      for (let index = 0; index < 4; index++) {
        await page.waitForTimeout(500);
        samples.push(await page.locator("#voyage").evaluate(element => ({
          quality: element.dataset.quality,
          draws: Number(element.dataset.renderDraws),
          triangles: Number(element.dataset.renderTriangles),
        })));
      }
      for (const sample of samples) {
        assert.equal(sample.quality, "low");
        assert.ok(sample.draws > 0 && sample.draws <= 80, `Low draw budget: ${JSON.stringify(sample)}`);
        assert.ok(sample.triangles > 0 && sample.triangles <= 180000, `Low triangle budget: ${JSON.stringify(sample)}`);
      }
      await screenshot(page, `${largest.id}-low-budget.png`);
      return { course: largest.id, gateCount: largest.gates.length, samples, limits: { draws: 80, triangles: 180000 } };
    } finally { await page.context().close(); }
  });

  for (const course of courses)
    await check(`manual keyboard completion: ${course.name}`, async () => {
      const page = await ready();
      const mooring = value => ({ vessel: value.vessel, x: value.x, z: value.z, heading: value.heading });
      const originalMooring = mooring(await observe(page));
      assert.equal(originalMooring.vessel, "superyacht");
      const trace = [];
      const keys = new Set();
      async function press(next) {
        for (const key of [...keys])
          if (!next.has(key)) {
            await page.keyboard.up(key);
            keys.delete(key);
          }
        for (const key of next)
          if (!keys.has(key)) {
            await page.keyboard.down(key);
            keys.add(key);
          }
      }
      const result = {
        id: course.id,
        name: course.name,
        trace,
        completed: false,
        airborneObserved: false,
        landingObserved: false,
      };
      report.courses.push(result);
      try {
        await start(page, course);
        await screenshot(page, `${course.id}-countdown.png`);
        await page.waitForFunction(() =>
          ["racing", "running"].includes(
            document.querySelector(".ow-experience")?.dataset.racePhase,
          ),
        );
        await page.locator("#yacht-controls").focus();
        const deadline = Date.now() + 240000;
        let previous,
          previousAt,
          lastGate = -1,
          lastLog = 0,
          flightShot = false;
        while (Date.now() < deadline) {
          const state = await observe(page);
          const now = Date.now();
          assert.ok(
            [
              state.x,
              state.z,
              state.heading,
              state.speed,
              state.checkpoint,
            ].every(Number.isFinite),
            "Observation telemetry is invalid",
          );
          if (state.airborne) result.airborneObserved = true;
          if (result.airborneObserved && !state.airborne)
            result.landingObserved = true;
          if (state.airborne && !flightShot) {
            await screenshot(page, `${course.id}-airborne.png`);
            flightShot = true;
          }
          if (
            state.checkpoint !== lastGate ||
            now - lastLog > 5000 ||
            state.airborne
          ) {
            trace.push({ t: now, ...state });
            if (state.checkpoint !== lastGate || now - lastLog > 10000)
              console.log(
                `${course.id}: ${state.phase}, gate ${state.checkpoint}, x=${state.x.toFixed(1)}, z=${state.z.toFixed(1)}, speed=${state.speed.toFixed(1)}`,
              );
            lastGate = state.checkpoint;
            lastLog = now;
          }
          if (finished.includes(state.phase)) {
            result.completed = true;
            result.final = state;
            break;
          }
          assert.ok(
            racing.includes(state.phase),
            `Race unexpectedly left active state: ${state.phase}`,
          );
          const gate = course.gates[state.checkpoint];
          assert.ok(gate, `Checkpoint ${state.checkpoint} absent from course`);
          const target = gate.position || gate;
          const separation = Math.hypot(target.x - state.x, target.z - state.z);
          const error = wrap(
            Math.atan2(target.x - state.x, -(target.z - state.z)) -
              state.heading,
          );
          const yawRate =
            previous && previousAt
              ? wrap(state.heading - previous.heading) /
                Math.max(0.05, (now - previousAt) / 1000)
              : 0;
          const steering = error * 2.1 - yawRate * 0.5;
          const desiredSpeed = 20 * Math.max(0.17, 1 - Math.abs(error) / 1.7);
          const next = new Set();
          if (steering > 0.09) next.add("d");
          else if (steering < -0.09) next.add("a");
          if (state.speed < desiredSpeed - 0.3) next.add("w");
          else if (state.speed > desiredSpeed + 1) next.add("s");
          await press(next);
          previous = state;
          previousAt = now;
          await page.waitForTimeout(90);
        }
        await press(new Set());
        await screenshot(page, `${course.id}-finish.png`);
        assert.ok(
          result.completed,
          "Manual driving did not finish within 240 seconds",
        );
        assert.equal(
          result.final.checkpoint,
          course.gates.length,
          "Finished without every ordered checkpoint",
        );
        if (course.gates.some(gate => gate.minLift)) {
          assert.ok(
            result.airborneObserved,
            "Jump course finished without observed airborne state",
          );
          assert.ok(
            result.landingObserved,
            "Jump course finished without an observed landing",
          );
          assert.equal(result.final.jumpCount, course.gates.filter(gate => gate.minLift).length, "The actual ramp launches must match the course's airborne gates");
        }
        const hud = await page.locator(".ow-experience").innerText();
        assert.match(
          hud,
          /finish|complete|your time/i,
          "No visible finish message",
        );
        const clock = (
          await page.locator(".ow-race-clock strong").innerText()
        ).trim();
        assert.match(clock, /^[0-9]{2}:[0-9]{2}\.[0-9]{2}$/);
        const [minutes, seconds] = clock.split(":").map(Number);
        // Finish is interpolated inside the last physics step; elapsed telemetry
        // is the end of that step. Include the bounded step and display rounding.
        assert.ok(
          Math.abs(minutes * 60 + seconds - result.final.elapsed) <
            1 / 30 + 0.006,
          "Visible finish clock differs by more than one bounded physics step plus display rounding",
        );
        assert.equal(
          await page.getByRole("timer").getAttribute("aria-label"),
          `Elapsed time ${clock}`,
        );
        const announcement = await page
          .locator('.sr-only[role="status"]')
          .innerText();
        result.finishAnnouncement = announcement;
        assert.ok(
          announcement.includes(clock) && announcement.includes(course.name) && /\bcomplete\b/i.test(announcement),
          "Live finish announcement omits the named course or actual time",
        );
        assert.match(
          announcement,
          /Session best/i,
          "Finish announcement omits session best",
        );
        await map(page);
        assert.equal(await page.locator("dialog[open] .exp-map-destinations button:not([disabled])").filter({hasText:"Sail there"}).count(),4,"Completed race did not restore destination controls");
        await closePanel(page);
        result.finishAnnouncement = announcement;
        result.timerAccessibleName = `Elapsed time ${clock}`;
        await page.getByTestId("voyage-fleet").click();
        await page.getByTestId("vessel-superyacht").click();
        await page.waitForFunction(() => document.querySelector("#voyage")?.dataset.vessel === "superyacht");
        const returned = await observe(page);
        assert.deepEqual(mooring(returned), originalMooring, "A completed circuit must retain the exact original superyacht mooring");
        assert.equal(returned.speed, 0);
        result.returnedMooring = mooring(returned);
        return {
          phase: result.final.phase,
          elapsed: result.final.elapsed,
          checkpoints: result.final.checkpoint,
          jumps: result.final.jumpCount,
          airborneObserved: result.airborneObserved,
          landingObserved: result.landingObserved,
          originalMooringRestored: true,
        };
      } finally {
        await press(new Set());
        await page.context().close();
      }
    });
} catch (error) {
  report.checks.push({
    name: "gameplay suite setup",
    status: "fail",
    error: String(error.stack || error),
  });
} finally {
  await browser.close();
  report.summary = {
    passed: report.checks.filter((item) => item.status === "pass").length,
    failed: report.checks.filter((item) => item.status === "fail").length,
  };
  await writeFile(
    path.join(qaDirectory, process.env.QA_REPORT_NAME || "gameplay-results.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  console.log(JSON.stringify(report.summary));
  if (report.summary.failed || report.errors.length) process.exitCode = 1;
}
