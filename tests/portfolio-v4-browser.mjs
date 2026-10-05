import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const origin = process.env.PORTFOLIO_URL ?? "http://127.0.0.1:4173/";
const output = process.env.PORTFOLIO_QA_DIR ?? "/tmp/portfolio-v4-qa";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(new URL("case-studies/anticipy", origin).href);
  await page.getByRole("heading", { name: "My part, and the collaboration." }).waitFor();
  const assertContact = async surface => {
    const addresses = await page.locator('a[href^="mailto:"]').evaluateAll(links => links.map(link => decodeURIComponent(link.getAttribute("href").slice(7).split("?")[0])));
    assert.ok(addresses.length >= 2, `${surface} has visible direct contact links`);
    assert.deepEqual([...new Set(addresses)], ["tejas.kaushik@outlook.com"], `${surface} canonical owner address`);
    assert.equal(await page.locator(".pv-email").innerText(), "tejas.kaushik@outlook.com");
  };
  await assertContact("Anticipy case study");
  assert.equal(await page.locator(".pv4-contribution-list details").count(), 12);
  const publicArtifact = page.locator(".pv4-product-artifact");
  assert.equal(await publicArtifact.getByRole("link").getAttribute("href"), "https://anticipy.ai/");
  await publicArtifact.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector(".pv4-product-artifact img")?.naturalWidth === 1440);
  await page.getByRole("button", { name: "Browser journey", exact: true }).click();
  await page.getByRole("heading", { name: "Follow the path a person actually takes." }).waitFor();
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await page.getByRole("heading", { name: "Resume the attempt. Keep its boundaries." }).waitFor();
  const prepare = page.getByRole("button", { name: "Prepare example" });
  assert.equal(await prepare.isDisabled(), true);
  await page.getByRole("checkbox").check();
  await prepare.click();
  await page.getByRole("button", { name: "Inspect source for: Mira owns the draft." }).click();
  assert.match(await page.locator(".pv4-citation").innerText(), /Mira owns the draft/);
  await page.getByRole("button", { name: "Cancel and clear this result" }).click();
  assert.equal(await page.locator(".pv4-brief-output li").count(), 0);
  assert.match(await page.locator(".pv4-brief-output").innerText(), /Cancelled/);
  await prepare.click();
  await page.getByRole("checkbox").uncheck();
  assert.equal(await page.locator(".pv4-brief-output li").count(), 0);
  assert.equal(await prepare.isDisabled(), true);
  await page.getByRole("button", { name: "The outgoing information" }).click();
  assert.equal(await page.locator(".pv4-protected-value").innerText(), "[value withheld]");
  await page.locator("#contribution-c5 summary").click();
  assert.equal(await page.locator("#contribution-c5").getAttribute("open"), "");
  const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  assert.deepEqual(accessibility.violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => node.target) })), []);
  for (const [name, width, height] of [["desktop", 1440, 1000], ["phone", 390, 844], ["phone-landscape", 844, 390]]) {
    await page.setViewportSize({ width, height });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `${name} horizontal overflow`);
    await publicArtifact.scrollIntoViewIfNeeded();
    await page.waitForFunction(expected => document.querySelector(".pv4-product-artifact img")?.naturalWidth === expected, width <= 600 ? 390 : 1440);
    await page.locator("#private-preparation").scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${output}/${name}-anticipy.png` });
  }
  if (process.env.PORTFOLIO_QA_CASE_ONLY !== "1") {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(origin);
    await page.locator("#current-work").scrollIntoViewIfNeeded();
    for (const slug of ["anticipy", "stellar-learning", "docubridge", "global-health-research", "soma-ai"]) assert.ok(await page.locator(`a[href="/case-studies/${slug}"]`).count(), `Direct reading link: ${slug}`);
    await assertContact("Home");
    assert.equal(await page.locator('#contact a[href="mailto:tejas.kaushik@outlook.com"]').count(), 2);
    for (const [name, width, height] of [["desktop", 1440, 1000], ["phone", 390, 844], ["phone-landscape", 844, 390]]) {
      await page.setViewportSize({ width, height });
      await page.locator("#current-work").scrollIntoViewIfNeeded();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `${name} homepage overflow`);
      const homeAccessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      assert.deepEqual(homeAccessibility.violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => node.target) })), [], `${name} homepage accessibility`);
      await page.screenshot({ path: `${output}/${name}-feature.png` });
    }
  }
  assert.deepEqual(errors, []);
  await context.close();
  console.log(`V4 portfolio: 12 notes, 3 interactive stories, consent/revocation/cancel, sources, 3 viewports, and accessibility passed.${process.env.PORTFOLIO_QA_CASE_ONLY === "1" ? " Home graphics and career UI excluded in case-only mode." : " All five direct project links passed."}`);
} finally { await browser.close(); }
