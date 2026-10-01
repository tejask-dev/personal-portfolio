/** Focused cross-engine smoke for native scroll, shaders, pause and live motion
 * preferences. These engine builds are not physical Safari/phone evidence. */
import assert from "node:assert/strict";
import { firefox, webkit } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
const url = process.env.QA_URL || "http://127.0.0.1:4175/";
const output = "design/open-water-v5-scroll/implementation-qa/engines";
await mkdir(output, { recursive: true });
const report = { at: new Date().toISOString(), url, scope: "Desktop Playwright Firefox/WebKit; native wheel, keyboard and DOM links. No physical-device claim.", entryAssets: [...(await (await fetch(url)).text()).matchAll(/(?:src|href)=["']([^"']+\.(?:js|css))["']/g)].map(match => match[1]), engines: [] };
for (const [name, engine] of [["firefox", firefox], ["webkit", webkit]]) {
  if (process.env.QA_ENGINES && !process.env.QA_ENGINES.split(",").includes(name)) continue;
  let browser;
  const result = { name, status: "fail", errors: [], consoleErrors: [] };
  try {
    browser = await engine.launch({ headless: true });
    result.version = browser.version();
    const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, reducedMotion: "no-preference" });
    page.on("pageerror", error => result.errors.push(error.message));
    page.on("console", message => { if (message.type() === "error") result.consoleErrors.push(message.text()); });
    const response = await page.goto(url);
    assert.equal(response.status(), 200);
    await page.locator("#voyage.is-ready").waitFor({ timeout: 45000 });
    await page.getByRole("link", { name: "Scroll below the surface", exact: false }).click();
    await page.waitForFunction(() => location.hash === "#descent");
    const settleScroll = () => page.waitForFunction(async () => {
      const before = scrollY;
      await new Promise(resolve => setTimeout(resolve, 200));
      return Math.abs(scrollY - before) < .5;
    });
    await settleScroll();
    // Native PageDown must remain document input, never a scenery controller.
    await page.keyboard.press("PageDown");
    await page.waitForFunction(() => +document.querySelector("#descent").dataset.progress > .12);
    await settleScroll();
    await page.waitForFunction(() => document.querySelector("#descent").dataset.sceneReady === "true", null, { timeout: 45000 });
    const initial = await page.locator("#descent").evaluate(el => {
      const r = el.getBoundingClientRect();
      return { top: r.top + scrollY, travel: r.height - innerHeight, y: scrollY };
    });
    await page.mouse.move(1400, 500);
    result.wheelSteps = [];
    // Use successive human-sized gestures rather than assuming every engine
    // applies an oversized synthetic wheel delta as a single page jump.
    const target = initial.top + initial.travel * .66;
    for (let step = 0; step < 12; step++) {
      const y = await page.evaluate(() => scrollY), delta = target - y;
      if (Math.abs(delta) < 8) break;
      await page.mouse.wheel(0, Math.max(-480, Math.min(480, delta)));
      await page.waitForFunction(before => Math.abs(scrollY - before) > 1, y);
      await settleScroll();
      result.wheelSteps.push(await page.evaluate(() => ({ y: scrollY, progress: document.querySelector("#descent").dataset.progress })));
    }
    await page.waitForFunction(() => +document.querySelector(".scuba-scene-canvas canvas").dataset.scubaProgress > .60);
    await page.waitForTimeout(900);
    result.scene = await page.locator(".scuba-scene-canvas canvas").evaluate(el => ({ ...el.dataset }));
    assert.ok(+result.scene.scubaCameraY < -10);
    assert.ok(+result.scene.drawCalls > 1);
    await page.screenshot({ path: `${output}/${name}-reef.png` });
    await page.getByRole("button", { name: "Pause scenery", exact: true }).click();
    await page.waitForTimeout(300);
    const before = await page.locator(".scuba-scene-canvas canvas").getAttribute("data-scuba-frame");
    await page.waitForTimeout(550);
    assert.equal(await page.locator(".scuba-scene-canvas canvas").getAttribute("data-scuba-frame"), before);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.locator("#descent.sd-reduced").waitFor();
    assert.equal(await page.locator("#descent canvas").count(), 0);
    assert.equal(await page.locator("#descent .sd-chapter").count(), 4);
    await page.locator("#dive-link-depth").click();
    await page.waitForFunction(() => location.hash === "#current-work");
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.consoleErrors, []);
    result.status = "pass";
  } catch (error) { result.failure = String(error.stack || error); }
  finally { await browser?.close(); }
  report.engines.push(result);
  console.log(`${result.status.toUpperCase()} ${name}${result.failure ? `: ${result.failure}` : ""}`);
}
await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2) + "\n");
if (report.engines.some(engine => engine.status !== "pass")) process.exitCode = 1;
