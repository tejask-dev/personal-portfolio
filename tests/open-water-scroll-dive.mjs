/** Scroll descent browser regressions, using native inputs and read-only telemetry.
 * BASE_URL=http://127.0.0.1:4186/ node tests/open-water-scroll-dive.mjs
 * QA_ONLY selects named checks; QA_OUTPUT/QA_REPORT_NAME keep separate receipts.
 * Run alone with the team's GPU slot. Phone sizes are emulation, not devices.
 */
import assert from "node:assert/strict";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

const url = process.env.BASE_URL || process.env.QA_URL || "http://127.0.0.1:4186/";
const output = path.resolve(process.env.QA_OUTPUT || "design/open-water-v5-scroll/implementation-qa");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const report = {
  at: new Date().toISOString(), url, browser: browser.version(),
  build: process.env.QA_BUILD_LABEL || "Build recorded from served entry assets below",
  scope: "Isolated Chrome; native wheel/keyboard/touch-emulated input, actual film screenshots and decoded-frame counts, passive voyage WebGL submission observation and read-only DOM progress. Failure injection is limited to named cases. No GPU completion-time, physical-device, thermal or screen-reader-user claim.",
  checks: [], screenshots: [], completed: false,
};
const flush = () => writeFile(path.join(output, path.basename(process.env.QA_REPORT_NAME || "scroll-dive-browser.json")), `${JSON.stringify(report, null, 2)}\n`);
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const digest = bytes => createHash("sha256").update(bytes).digest("hex");
const section = page => page.locator("#descent");
const film = page => page.locator("#descent video");
// Locator screenshots include overlapping DOM. Hide only decorative/story overlays
// for the capture itself so changing text cannot impersonate decoded film pixels.
const isolatedFilm = page => film(page).screenshot({ style: ".sd-stories,.sd-masthead,.sd-depth,.sd-bottom,.sd-shade,.sd-grain{visibility:hidden!important}" });
const storyIds = ["surface", "connections", "fieldwork", "depth"];
const headings = ["There's more beneath the surface.", "Interfaces connect. Systems deliver.", "Follow the curiosity. Check the evidence.", "The depth is in the details."];

async function instrument(page) {
  await page.addInitScript(() => {
    const qa = window.__scrollDiveQA = { frames: [], stamp: 0, contexts: 0, resources: {} };
    const live = Object.fromEntries(["Buffer", "Texture", "Program", "Shader", "Framebuffer", "Renderbuffer", "VertexArray"].map(kind => [kind, new Set()]));
    for (const kind of Object.keys(live)) qa.resources[kind] = { created: 0, deleted: 0, live: 0 };
    const originalRAF = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = callback => originalRAF(stamp => { qa.stamp = stamp; callback(stamp); });
    const wrapped = Symbol("passive-scroll-render-observer"), seen = new WeakSet();
    for (const Constructor of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
      if (!Constructor) continue;
      for (const kind of Object.keys(live)) for (const verb of ["create", "delete"]) {
        const method = `${verb}${kind}`, native = Constructor.prototype[method];
        if (!native || native[wrapped]) continue;
        const observe = function (...args) {
          const result = Reflect.apply(native, this, args), counter = qa.resources[kind];
          if (verb === "create" && result && !live[kind].has(result)) { live[kind].add(result); counter.created++; }
          if (verb === "delete" && args[0] && live[kind].delete(args[0])) counter.deleted++;
          counter.live = live[kind].size; return result;
        };
        observe[wrapped] = true; Constructor.prototype[method] = observe;
      }
      for (const method of ["drawArrays", "drawElements", "drawArraysInstanced", "drawElementsInstanced"]) {
        const native = Constructor.prototype[method];
        if (!native || native[wrapped]) continue;
        const observe = function (...args) {
          const result = Reflect.apply(native, this, args);
          if (!seen.has(this)) { seen.add(this); qa.contexts++; }
          const owner = this.canvas.closest?.("#descent") ? "descent" : this.canvas.closest?.("#voyage") ? "voyage" : "other";
          let frame = qa.frames.at(-1);
          if (!frame || frame.stamp !== qa.stamp) { frame = { stamp: qa.stamp, at: performance.now(), voyage: 0, descent: 0, other: 0 }; qa.frames.push(frame); }
          frame[owner]++;
          return result;
        };
        observe[wrapped] = true;
        Constructor.prototype[method] = observe;
      }
    }
  });
}
async function makePage(options = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, reducedMotion: "no-preference", ...options });
  const page = await context.newPage(); page.setDefaultTimeout(20000);
  const errors = [], requests = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("requestfailed", request => requests.push({ url: request.url(), error: request.failure()?.errorText }));
  await instrument(page);
  return { context, page, errors, requests };
}
async function boot(page, { hero = true, hash = "#voyage" } = {}) {
  const response = await page.goto(`${url.replace(/#.*$/, "")}${hash}`);
  assert.equal(response.status(), 200);
  await section(page).waitFor();
  if (hero) await page.locator("#voyage.is-ready").waitFor({ timeout: 45000 });
}
async function snapshot(page, name, filmOnly = false) {
  const file = path.join(output, `${name}.png`);
  const bytes = filmOnly ? await isolatedFilm(page) : await page.screenshot({ path: file });
  if (filmOnly) await writeFile(file, bytes);
  report.screenshots.push(file); return bytes;
}
async function dimensions(page) {
  return section(page).evaluate(el => { const r = el.getBoundingClientRect(); return { top: r.top + scrollY, height: r.height, viewport: innerHeight, current: scrollY }; });
}
async function wheelTo(page, progress) {
  const d = await dimensions(page), target = d.top + progress * (d.height - d.viewport);
  await page.mouse.move(Math.max(20, (await page.viewportSize()).width - 20), Math.round(d.viewport * .5));
  await page.mouse.wheel(0, target - d.current);
  try {
    await page.waitForFunction(p => Math.abs(Number(document.querySelector("#descent")?.dataset.progress) - p) < .035, progress);
  } catch (error) {
    const actual = await section(page).evaluate(el => ({ y: scrollY, data: { ...el.dataset }, height: el.getBoundingClientRect().height, top: el.getBoundingClientRect().top, viewport: innerHeight, hash: location.hash, focused: document.activeElement?.outerHTML.slice(0, 300), wheelTarget: document.elementFromPoint(innerWidth - 20, innerHeight * .5)?.outerHTML.slice(0, 300) }));
    throw new Error(`Native wheel target ${progress}; before ${JSON.stringify(d)}; requestedY ${target}; after ${JSON.stringify(actual)}; ${error.message}`);
  }
  await page.waitForTimeout(950); // native scroll and heading reveal settle
}
async function filmState(page) {
  return film(page).evaluate(video => ({
    time: video.currentTime, paused: video.paused, width: video.videoWidth, height: video.videoHeight,
    frames: video.getVideoPlaybackQuality().totalVideoFrames,
    progress: +document.querySelector("#descent").style.getPropertyValue("--dive-progress"),
  }));
}
async function frameWindow(page, milliseconds = 700) {
  const start = await page.evaluate(() => performance.now()); await delay(milliseconds);
  return page.evaluate(since => {
    const frames = window.__scrollDiveQA.frames.filter(frame => frame.at >= since);
    const intervalSummary = owner => {
      const stamps = frames.filter(f => f[owner] > 0).map(f => f.stamp);
      const values = stamps.slice(1).map((stamp, i) => stamp - stamps[i]).filter(delta => delta > 0).sort((a, b) => a - b);
      const at = p => values.length ? +values[Math.max(0, Math.ceil(values.length * p) - 1)].toFixed(2) : null;
      return { count: values.length, p50: at(.5), p95: at(.95), max: at(1) };
    };
    return { elapsedMs: performance.now() - since, frames: frames.length, voyage: frames.filter(f => f.voyage > 0).length, descent: frames.filter(f => f.descent > 0).length, both: frames.filter(f => f.voyage > 0 && f.descent > 0).length, contexts: window.__scrollDiveQA.contexts, submissionIntervalMs: { voyage: intervalSummary("voyage"), descent: intervalSummary("descent") } };
  }, start);
}
async function overflow(page) {
  const widths = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
  assert.ok(Math.max(widths.document, widths.body) <= widths.viewport + 1, `Horizontal overflow ${JSON.stringify(widths)}`); return widths;
}
async function hitControls(page, stage) {
  const controls = await page.locator(".sd-masthead a, .sd-bottom a, .sd-bottom button").evaluateAll(nodes => {
    const copies = [...document.querySelectorAll(".sd-copy")].map(copy => copy.getBoundingClientRect());
    return nodes.filter(node => node.getClientRects().length && getComputedStyle(node).visibility !== "hidden").map(node => {
      const r = node.getBoundingClientRect(), x = r.x + r.width / 2, y = r.y + r.height / 2;
      const top = document.elementFromPoint(x, y), hit = top?.closest("a,button");
      return { text: node.textContent.trim(), href: node.getAttribute("href"), tag: node.tagName, center: { x, y }, width: r.width, height: r.height,
        centerInsideViewport: x >= 0 && x < innerWidth && y >= 0 && y < innerHeight,
        intendedControlReceivesPointer: hit === node,
        actualTarget: top ? `${top.tagName}.${top.className?.baseVal ?? top.className}` : null,
        copyBehindCenter: copies.some(c => x >= c.left && x <= c.right && y >= c.top && y <= c.bottom) };
    });
  });
  assert.ok(controls.length >= 4, "Expected visible header and footer controls");
  for (const control of controls) {
    assert.ok(control.centerInsideViewport, `${stage}: control center is clipped ${JSON.stringify(control)}`);
    assert.ok(control.intendedControlReceivesPointer, `${stage}: moving copy intercepts the control ${JSON.stringify(control)}`);
  }
  return { stage, controls };
}
async function overlapCopyWithControl(page, selector, stage) {
  const progress = await page.evaluate(controlSelector => {
    const section = document.querySelector("#descent").getBoundingClientRect();
    const copy = document.querySelector("#dive-connections .sd-copy").getBoundingClientRect();
    const control = document.querySelector(controlSelector).getBoundingClientRect();
    const targetY = copy.top + scrollY + copy.height / 2 - (control.top + control.height / 2);
    return Math.max(.02, Math.min(.95, (targetY - (section.top + scrollY)) / (section.height - innerHeight)));
  }, selector);
  await wheelTo(page, progress);
  const evidence = await hitControls(page, stage);
  const targetCovered = await page.locator(selector).evaluate(node => {
    const r = node.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    const copy = document.querySelector("#dive-connections .sd-copy").getBoundingClientRect();
    return x >= copy.left && x <= copy.right && y >= copy.top && y <= copy.bottom;
  });
  assert.ok(targetCovered, `${stage}: probe did not actually place the moving copy beneath the control`);
  return { progress, deliberatelyOverlappedControl: selector, ...evidence };
}
async function readAllCopy(page) {
  assert.equal(await section(page).locator(".sd-chapter").count(), 4);
  for (let i = 0; i < storyIds.length; i++) {
    const chapter = page.locator(`#dive-${storyIds[i]}`);
    assert.ok((await chapter.locator(".sd-description").innerText()).length > 45);
    const heading = chapter.getByRole("heading", { name: headings[i] });
    assert.equal(await heading.count(), 1, `Missing intact accessible heading: ${headings[i]}`);
    assert.ok(await chapter.locator("a.sd-story-link").getAttribute("href"));
  }
}
async function compactLayout(page) {
  await readAllCopy(page);
  const layout = await section(page).evaluate(el => ({
    height: el.getBoundingClientRect().height, viewport: innerHeight, classes: el.className, reducedPreference: matchMedia("(prefers-reduced-motion: reduce)").matches,
    chapters: [...el.querySelectorAll(".sd-chapter")].map(chapter => {
      const copy = chapter.querySelector(".sd-copy"), r = chapter.getBoundingClientRect(), c = copy.getBoundingClientRect(), style = getComputedStyle(chapter);
      return { height: r.height, copyHeight: c.height, minHeight: style.minHeight, emptySpace: r.height - c.height };
    }),
    sticky: getComputedStyle(el.querySelector(".sd-sticky") || el).position,
  }));
  assert.notEqual(layout.sticky, "sticky", "Fallback/reduced-motion still pins the scene");
  for (const chapter of layout.chapters) {
    assert.ok(chapter.minHeight === "0px" || chapter.minHeight === "auto", `Fixed-height spacer remains ${JSON.stringify(chapter)}`);
    assert.ok(chapter.emptySpace < 180, `Excess empty viewport spacer ${JSON.stringify(chapter)}`);
  }
  return layout;
}
async function check(name, run) {
  if (process.env.QA_ONLY && !new RegExp(process.env.QA_ONLY, "i").test(name)) return;
  const started = Date.now();
  try { const evidence = await run(); report.checks.push({ name, status: "pass", durationMs: Date.now() - started, ...evidence }); console.log(`PASS ${name}`); }
  catch (error) { report.checks.push({ name, status: "fail", durationMs: Date.now() - started, error: error.stack }); console.error(`FAIL ${name}: ${error.message}`); }
  await flush();
}

try {
  const html = await (await fetch(url)).text();
  report.entryAssets = [...html.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css))["']/g)].map(match => match[1]);

  await check("native wheel reverses reading progress while real film plays and voyage rendering stops", async () => {
    const { page, context, errors } = await makePage();
    try {
      await boot(page); await delay(900);
      assert.equal(await film(page).count(), 0, "Film loaded before reaching the descent");
      const opening = await frameWindow(page); assert.ok(opening.voyage > 5);
      await wheelTo(page, .02);
      await page.waitForFunction(() => document.querySelector("#descent video")?.readyState >= 2);
      assert.equal(await page.locator("#descent canvas").count(), 0, "Descent still creates a second 3D scene");
      const stages = [];
      for (const [name, p] of [["surface", .02], ["waterline", .27], ["reef", .57], ["deep", .93]]) {
        await wheelTo(page, p); const before = await filmState(page);
        const bytes = await snapshot(page, `desktop-${name}`), art = await snapshot(page, `film-${name}`, true);
        const frames = await frameWindow(page, 550), after = await filmState(page);
        assert.ok(before.width >= 960 && before.height >= 540 && !before.paused);
        assert.ok(after.frames > before.frames + 5, "Film is not decoding actual frames");
        assert.equal(frames.voyage, 0, "Offscreen game still renders");
        stages.push({ name, progress: before.progress, imageSHA256: digest(bytes), filmSHA256: digest(art), frames, controls: await hitControls(page, name) });
      }
      assert.equal(new Set(stages.map(s => s.filmSHA256)).size, 4, "Film checkpoints have identical pixels");
      for (let i = 1; i < stages.length; i++) assert.ok(stages[i].progress > stages[i-1].progress + .1);
      await wheelTo(page, .1); assert.ok((await filmState(page)).progress < .14);
      const cycles = [];
      for (let cycle = 0; cycle < 3; cycle++) {
        await page.locator(".sd-expedition-mark").click();
        await page.waitForFunction(() => document.querySelector("#descent video")?.paused);
        await delay(300); const paused = await filmState(page);
        const frames = await frameWindow(page); assert.ok(frames.voyage > 5);
        assert.equal((await filmState(page)).time, paused.time, "Offscreen film kept advancing");
        await wheelTo(page, .55);
        await page.waitForFunction(() => !document.querySelector("#descent video").paused);
        cycles.push(await page.evaluate(() => ({ contexts: window.__scrollDiveQA.contexts, resources: window.__scrollDiveQA.resources })));
      }
      assert.equal(cycles[2].contexts, cycles[0].contexts);
      for (const kind of Object.keys(cycles[0].resources)) assert.ok(cycles[2].resources[kind].live <= cycles[0].resources[kind].live, `GPU handles grew: ${kind}`);
      assert.deepEqual(errors, []); return { opening, stages, cycles };
    } finally { await context.close(); }
  });

  await check("pause scenery freezes actual pixels and depth while native scrolling keeps all copy readable", async () => {
    const { page, context, errors } = await makePage();
    try {
      await boot(page); await wheelTo(page, .35);
      await page.waitForFunction(() => document.querySelector("#descent")?.dataset.sceneReady === "true");
      await page.getByRole("button", { name: "Pause scenery", exact: true }).click(); await delay(700);
      const before = await filmState(page), depth = await page.locator(".sd-depth strong").innerText(), image = await isolatedFilm(page);
      await wheelTo(page, .64); const after = await filmState(page), next = await isolatedFilm(page);
      assert.equal(digest(image), digest(next), "Paused scenery changed pixels while scrolling");
      assert.equal(after.time, before.time); assert.equal(after.progress, before.progress);
      assert.equal(await page.locator(".sd-depth strong").innerText(), depth, "Depth instrument advanced while scenery was frozen");
      const frames = await frameWindow(page); assert.equal(frames.descent, 0); assert.equal(frames.voyage, 0);
      await readAllCopy(page);
      const translated = await section(page).locator(".sd-word-mask > span").evaluateAll(words => words.filter(word => !["none", "matrix(1, 0, 0, 1, 0, 0)"].includes(getComputedStyle(word).transform)).length);
      assert.equal(translated, 0, "Pause left masked headings hidden");
      await snapshot(page, "paused-copy-readable");
      await page.getByRole("button", { name: "Play scenery", exact: true }).click(); await delay(1000);
      const resumed = await filmState(page); assert.ok(!resumed.paused && resumed.frames > after.frames);
      assert.deepEqual(errors, []); return { before, after, resumed, frames, pausedFilmSHA256: digest(image) };
    } finally { await context.close(); }
  });

  await check("four chapter links, skip and case return preserve native destinations and source focus", async () => {
    const { page, context, errors } = await makePage({ reducedMotion: "reduce" });
    try {
      await boot(page); await readAllCopy(page); const destinations = [];
      for (const id of ["surface", "fieldwork", "depth"]) {
        const link = page.locator(`#dive-link-${id}`), href = await link.getAttribute("href");
        await link.click(); await page.waitForFunction(hash => location.hash === hash, href);
        await page.waitForFunction(selector => { const r = document.querySelector(selector).getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; }, href);
        const visible = true;
        assert.ok(visible, `${id} did not reveal its native destination`); destinations.push({ id, href, visible });
      }
      const caseLink = page.locator("#dive-link-connections"); await caseLink.scrollIntoViewIfNeeded(); const returnY = await page.evaluate(() => scrollY);
      await caseLink.click(); await page.waitForURL(/\/case-studies\/anticipy(?:#.*)?$/); await page.getByRole("heading", { name: "My part, and the collaboration." }).waitFor();
      assert.equal(await page.locator(".pv4-contribution-list details").count(), 12);
      await page.locator(".pv-case-wordmark, .pv-case-nav .pv-wordmark").first().click(); await section(page).waitFor();
      await page.waitForFunction(() => document.activeElement?.id === "dive-link-connections");
      const restoredY = await page.evaluate(() => scrollY); assert.ok(Math.abs(restoredY - returnY) < 8, `Case return moved from ${returnY} to ${restoredY}`);
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await page.waitForFunction(() => !document.querySelector("#descent").classList.contains("sd-reduced"));
      await wheelTo(page, .1);
      await page.locator(".sd-bottom").getByRole("link", { name: "Back to the work", exact: false }).click();
      await page.waitForFunction(() => location.hash === "#current-work");
      await page.locator('.sd-masthead a[href="#contact"]').click(); await page.waitForFunction(() => location.hash === "#contact");
      assert.ok(await page.locator('#contact a[href^="mailto:"]').count());
      assert.deepEqual(errors, []); return { destinations, caseDestination: "Anticipy, with 12 contribution notes", returnY, restoredY, contactAndSkip: true };
    } finally { await context.close(); }
  });

  await check("reduced motion is compact on entry and responds live after real scenery has loaded", async () => {
    const { page, context, errors } = await makePage({ reducedMotion: "reduce" });
    try {
      await boot(page); const initial = await compactLayout(page); assert.equal(await film(page).count(), 0);
      await snapshot(page, "reduced-motion-initial");
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await page.waitForFunction(() => !document.querySelector("#descent").classList.contains("sd-reduced"));
      await wheelTo(page, .55);
      await page.waitForFunction(() => document.querySelector("#descent")?.dataset.sceneReady === "true"); assert.equal(await film(page).count(), 1);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.waitForFunction(() => [...document.querySelectorAll("#descent .sd-chapter")].every(chapter => getComputedStyle(chapter).minHeight === "0px") && !document.querySelector("#descent video"), null, { timeout: 2000 });
      const live = await compactLayout(page); assert.equal(await film(page).count(), 0);
      assert.deepEqual(errors, []); return { initial, live, realSceneRemovedOnPreferenceChange: true };
    } finally { await context.close(); }
  });

  for (const failure of ["blocked film", "invalid film"]) await check(`${failure} retains compact readable narrative and professional links`, async () => {
    const { page, context, errors, requests } = await makePage(); let blocked = 0;
    try {
      await page.route(/descent-(?:film|mobile)\.mp4/, route => {
        blocked++;
        return failure === "blocked film" ? route.abort("failed") : route.fulfill({ status: 200, contentType: "video/mp4", body: "invalid media" });
      });
      await boot(page); const initial = await dimensions(page);
      await page.mouse.wheel(0, initial.top + .1 * (initial.height - initial.viewport) - initial.current);
      await page.waitForFunction(() => document.querySelector("#descent")?.dataset.sceneFailed === "true");
      assert.ok(blocked > 0);
      const layout = await compactLayout(page); await snapshot(page, failure.replaceAll(" ", "-"));
      await page.locator("#dive-link-depth").click(); await page.waitForFunction(() => location.hash === "#current-work");
      assert.deepEqual(errors, []); return { layout, interceptedRequests: blocked, requests };
    } finally { await context.close(); }
  });

  await check("JavaScript-disabled field guide stays optional and retains native project links", async () => {
    const { page, context } = await makePage({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    try {
      await page.goto(url);
      const guide = page.locator("#voyage.eh-ocean-guide");
      assert.equal(await guide.getAttribute("open"), null);
      await guide.locator("summary").click();
      await page.locator("#descent").waitFor();
      assert.equal(await page.locator("canvas").count(), 0);
      assert.ok(await guide.locator('a[href="/case-studies/anticipy"]').count());
      await page.locator('#descent a[href="#work"]').click();
      assert.equal(new URL(page.url()).hash, "#work");
      await snapshot(page, "static-guide-native-link");
      return { widths: await overflow(page), nativeLink: "#work", optionalGuide: true };
    } finally { await context.close(); }
  });

  await check("native hash returns to the existing vessel without carrying held helm input into reading", async () => {
    const { page, context, errors } = await makePage();
    const boatState = () => page.locator("#voyage").evaluate(el => ({ x: +el.dataset.boatX, z: +el.dataset.boatZ, speed: +el.dataset.boatSpeed, vessel: el.dataset.vessel, mode: el.dataset.mode }));
    try {
      await boot(page); await page.locator("#take-helm").click(); await page.locator("#yacht-controls").focus(); await page.keyboard.down("w"); await delay(800);
      const moving = await boatState(); assert.ok(moving.speed > 0);
      await wheelTo(page, .4); await page.keyboard.up("w"); const reading = await boatState(); await delay(700); assert.deepEqual(await boatState(), reading);
      await page.locator(".sd-expedition-mark").click(); await page.waitForFunction(() => location.hash === "#voyage"); await delay(700);
      const returned = await boatState(); assert.equal(returned.vessel, reading.vessel); assert.equal(returned.mode, reading.mode);
      assert.ok(returned.speed < reading.speed, "Released throttle should coast down instead of inheriting the held acceleration");
      assert.ok(Math.hypot(returned.x - reading.x, returned.z - reading.z) < Math.max(1, reading.speed), "Return moved farther than the saved coasting velocity permits");
      await page.locator("#yacht-controls").focus(); await page.keyboard.down("w"); await delay(600); await page.keyboard.up("w"); const resumed = await boatState();
      assert.ok(Math.hypot(resumed.x - returned.x, resumed.z - returned.z) > .1, "Fresh input cannot resume the existing vessel");
      assert.deepEqual(errors, []); return { moving, reading, returned, resumed };
    } finally { await context.close(); }
  });

  for (const [label, viewport] of [["phone-320", { width: 320, height: 740 }], ["phone-390", { width: 390, height: 844 }], ["phone-landscape", { width: 844, height: 390 }]]) await check(`${label} native touch, complete chapter copy, overflow and accessibility`, async () => {
    const { page, context, errors } = await makePage({ viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    try {
      await boot(page, { hash: "#descent" }); await wheelTo(page, .08);
      await page.waitForFunction(() => document.querySelector("#descent")?.dataset.sceneReady === "true", null, { timeout: 45000 });
      const cdp = await context.newCDPSession(page);
      const before = await page.evaluate(() => scrollY);
      const x = Math.round(viewport.width * .8), from = Math.round(viewport.height * .78), to = Math.round(viewport.height * .28);
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y: from }] });
      for (let i = 1; i <= 8; i++) { await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: from + (to - from) * i / 8 }] }); await delay(25); }
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await delay(600);
      const after = await page.evaluate(() => scrollY); assert.ok(after > before + 60, "Touch was intercepted instead of scrolling the document");
      await cdp.detach(); await readAllCopy(page);
      const widths = [], hitTests = [];
      for (const [name, p] of [["surface", .04], ["reef", .53], ["deep", .88]]) { await wheelTo(page, p); widths.push(await overflow(page)); hitTests.push(await hitControls(page, `${label}-${name}`)); await snapshot(page, `${label}-${name}`); }
      hitTests.push(await overlapCopyWithControl(page, ".sd-expedition-mark", `${label}-header-over-moving-copy`));
      await snapshot(page, `${label}-header-overlap`);
      hitTests.push(await overlapCopyWithControl(page, ".sd-bottom button", `${label}-footer-over-moving-copy`));
      await snapshot(page, `${label}-footer-overlap`);
      const controls = await page.locator(".sd-masthead a, .sd-bottom a, .sd-bottom button").evaluateAll(nodes => nodes.filter(n => n.getClientRects().length).map(n => { const r = n.getBoundingClientRect(); return { text: n.textContent.trim(), x: r.x, right: r.right, width: r.width, height: r.height }; }));
      for (const c of controls) assert.ok(c.x >= -1 && c.right <= viewport.width + 1, `Clipped control ${JSON.stringify(c)}`);
      const axe = await new AxeBuilder({ page }).include("#descent").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      assert.deepEqual(axe.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => n.target) })), []);
      await page.getByRole("button", { name: "Pause scenery", exact: true }).click();
      assert.equal(await page.getByRole("button", { name: "Play scenery", exact: true }).getAttribute("aria-pressed"), "true", "Overlapping copy prevented the pause control from activating");
      await delay(600); const frozen = await isolatedFilm(page); await delay(400); assert.ok(frozen.equals(await isolatedFilm(page)));
      await page.getByRole("button", { name: "Play scenery", exact: true }).click();
      assert.equal(await page.getByRole("button", { name: "Pause scenery", exact: true }).getAttribute("aria-pressed"), "false", "Overlapping copy prevented resume");
      assert.deepEqual(errors, []); return { viewport, touchScroll: { before, after }, widths, controls, hitTests, axeRulesPassed: axe.passes.length, pausedPixelsStable: true };
    } finally { await context.close(); }
  });
  report.completed = true;
} finally {
  await browser.close();
  report.passed = report.completed && report.checks.length > 0 && report.checks.every(check => check.status === "pass");
  await flush(); if (!report.passed) process.exitCode = 1;
}
