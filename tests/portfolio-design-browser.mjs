import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const base = process.env.QA_URL || 'http://127.0.0.1:4186';
const out = process.env.QA_OUTPUT || '/tmp/portfolio-design';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
async function settle(page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => document.getAnimations().every(a =>
    a.playState !== 'running' || a.effect.getComputedTiming().iterations === Infinity));
}
async function screenshot(page, name) {
  await settle(page);
  await page.screenshot({ path: path.join(out, `${name}.png`) });
}
async function hit(link) {
  await link.scrollIntoViewIfNeeded();
  assert(await link.evaluate(el => {
    const r = el.getBoundingClientRect();
    const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return el === top || el.contains(top);
  }), 'Visible link center must receive the pointer');
}
try {
  for (const [name, width, height] of [['desktop',1440,900], ['phone',390,844], ['small',320,740], ['landscape',844,390]]) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(base);
    await page.locator('.pe-choice-reading').waitFor();
    await screenshot(page, `${name}-chooser`);
    const chooser = await page.locator('.pathway-entry').evaluate(el => ({
      overflow: el.scrollWidth > el.clientWidth,
      serif: getComputedStyle(el.querySelector('h2')).fontFamily,
      sans: getComputedStyle(el.querySelector('#pathway-description')).fontFamily,
    }));
    assert(!chooser.overflow, `${name}: chooser overflow`);
    await hit(page.locator('.pe-choice-reading'));
    await page.locator('.pe-choice-reading').click();
    await page.locator('.pathway-entry').waitFor({ state: 'detached' });
    await screenshot(page, `${name}-home`);
    const reading = await page.locator('.eh-hero-role').evaluate(el => {
      const s = getComputedStyle(el);
      return { font: s.fontFamily, size: s.fontSize, weight: s.fontWeight, width: el.getBoundingClientRect().width };
    });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${name}: page overflow`);
    for (let tab = 0; tab < 12; tab++) {
      await page.keyboard.press('Tab');
      if (await page.locator('.eh-hero-actions .pv-button').evaluate(el => el === document.activeElement)) break;
    }
    assert(await page.locator('.eh-hero-actions .pv-button').evaluate(el => el === document.activeElement), 'Primary action must be keyboard reachable');
    assert(await page.locator('.eh-hero-actions .pv-button').evaluate(el => {
      const s = getComputedStyle(el); return s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2;
    }), 'Keyboard focus must be visible');
    await page.keyboard.press('Enter');
    await page.waitForURL('**/#work');
    for (const img of await page.locator('#work img').all()) {
      await img.scrollIntoViewIfNeeded();
      await page.waitForFunction(el => Boolean(el.getAttribute('src')), await img.elementHandle());
      await img.evaluate(el => el.decode());
    }
    await page.locator('#work').evaluate(el => el.scrollIntoView({ behavior: 'instant' }));
    await screenshot(page, `${name}-work`);
    const study = page.locator('#read-stellar-learning');
    await hit(study); await study.click();
    await page.waitForURL('**/case-studies/stellar-learning');
    await page.locator('h1').waitFor();
    assert(await page.locator('.pv-case-artifact').evaluate(el => {
      const image = el.getBoundingClientRect();
      const text = document.querySelector('.pv-case-hero').getBoundingClientRect();
      return Math.abs(image.left - text.left) < 1 && Math.abs(image.right - text.right) < 1;
    }), `${name}: case artifact must share the reading grid`);
    await screenshot(page, `${name}-case`);
    await page.goBack();
    await page.locator('.eh-header nav a[href="#contact"]').click();
    await page.waitForURL('**/#contact');
    await page.waitForFunction(() => {
      const r = document.querySelector('#contact-title')?.getBoundingClientRect();
      return r && r.top >= 0 && r.top < innerHeight - 40;
    });
    await screenshot(page, `${name}-contact`);
    await hit(page.locator('.pv-email').first());
    assert.match(await page.locator('.pv-email').first().getAttribute('href'), /^mailto:/);
    if (name === 'desktop' || name === 'phone') {
      const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      assert.deepEqual(axe.violations.map(v => ({ id: v.id, impact: v.impact })), [], `${name}: accessibility violations`);
    }
    assert.deepEqual(errors, [], `${name}: page errors`);
    results.push({ name, width, height, chooser, reading, status: 'passed' });
    await context.close();
  }
  const plain = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  await plain.goto(base);
  await plain.locator('h1').waitFor();
  const link = plain.locator('a[href*="/case-studies/anticipy"]').first();
  await hit(link); await link.click(); await plain.waitForURL('**/case-studies/anticipy');
  await plain.screenshot({ path: path.join(out, 'no-js-case.png') });
  results.push({ name: 'no-JavaScript navigation', status: 'passed' });
  console.log(JSON.stringify(results, null, 2));
} finally {
  await fs.writeFile(path.join(out, 'results.json'), JSON.stringify(results, null, 2));
  await browser.close();
}
