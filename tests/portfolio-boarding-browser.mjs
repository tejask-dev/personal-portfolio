/** Explicit optional-world entry, cancellation and reentry; no mandatory boarding gate. */
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const url = (process.env.QA_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
const output = process.env.QA_OUTPUT || '/tmp/portfolio-boarding-qa';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
async function scenario(name, options, test) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...options });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.setDefaultTimeout(20000);
  try {
    await test(page, context);
    assert.deepEqual(errors, [], 'no uncaught browser errors');
    results.push({ name, passed: true }); console.log('PASS', name);
  } catch (error) {
    await page.screenshot({ path: `${output}/${name}-failure.png` }).catch(() => {});
    results.push({ name, passed: false, error: String(error) }); throw error;
  } finally {
    const video = page.video(); await context.close();
    if (video) await video.saveAs(`${output}/${name}.webm`);
  }
}
async function open(page, touch = false) {
  await page.goto(url);
  await page.locator('.static-portfolio').waitFor({ state: 'detached' });
  const explore = page.locator('#open-ocean');
  if (touch) await explore.tap(); else await explore.click();
  await page.waitForURL('**/#voyage');
}
async function helm(page, quiet = false) {
  await page.locator('#take-helm').click();
  await page.locator('#voyage.exp-active').waitFor();
  await page.waitForFunction(() => document.activeElement?.id === 'yacht-controls');
  await page.waitForFunction(expected => document.querySelector('#voyage')?.dataset.state === expected, quiet ? 'PAUSED' : 'SAILING');
}
async function drive(page) {
  const before = await page.locator('#voyage').getAttribute('data-boat-z');
  await page.keyboard.down('w');
  try { await page.waitForFunction(z => document.querySelector('#voyage')?.dataset.boatZ !== z, before); }
  finally { await page.keyboard.up('w'); }
}
const close = page => page.getByRole('button', { name: 'Close Open Water', exact: true }).click();
try {
  await scenario('desktop-explicit-sailing', { recordVideo: { dir: `${output}/video`, size: { width: 1440, height: 900 } } }, async page => {
    await open(page); await helm(page); await drive(page);
    await page.screenshot({ path: `${output}/at-the-helm.png` });
    await close(page); await page.waitForFunction(() => document.activeElement?.id === 'open-ocean');
    assert.equal(await page.locator('#voyage').count(), 0);
    assert.equal(await page.evaluate(() => document.body.style.overflow), '');
  });
  await scenario('reduced-motion', { reducedMotion: 'reduce' }, async page => {
    await open(page); await helm(page, true);
    const z = await page.locator('#voyage').getAttribute('data-boat-z');
    await page.getByRole('button', { name: 'Accelerate', exact: true }).click();
    await page.locator('.exp-active-status').filter({ hasText: 'Enable motion to sail' }).waitFor();
    assert.equal(await page.locator('#voyage').getAttribute('data-boat-z'), z);
    await page.locator('#open-work-index').click();
    await page.locator('dialog[open] a[href*="/case-studies/anticipy"]').first().click();
    await page.waitForURL('**/case-studies/anticipy');
    await page.getByRole('navigation', { name: 'Case study navigation' }).getByRole('link', { name: 'Back to Open Water', exact: true }).waitFor();
    assert.ok(await page.getByRole('link', { name: /Back to Open Water/ }).count(), 'World-origin case offers a return');
  });
  await scenario('phone-touch', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, async page => {
    await open(page, true); await helm(page);
    await page.screenshot({ path: `${output}/phone-helm.png` });
    const z = await page.locator('#voyage').getAttribute('data-boat-z');
    await page.getByRole('button', { name: 'Accelerate', exact: true }).tap();
    await page.waitForFunction(z => document.querySelector('#voyage')?.dataset.boatZ !== z, z);
  });
  await scenario('short-landscape', { viewport: { width: 844, height: 390 } }, async page => {
    await open(page); await helm(page); await drive(page);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  });
  await scenario('resize-and-motion-change', {}, async page => {
    await page.route('**/OpenWaterScene-*.js', async route => {
      await new Promise(resolve => setTimeout(resolve, 1500)); await route.continue();
    });
    await open(page); await page.setViewportSize({ width: 844, height: 390 });
    await page.emulateMedia({ reducedMotion: 'reduce' }); await helm(page, true);
    assert.equal(await page.evaluate(() => document.body.style.overflow), '');
  });
  await scenario('pending-load-cancel-and-reenter', {}, async page => {
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    let requested;
    const seen = new Promise(resolve => { requested = resolve; });
    await page.route('**/OpenWaterExperience-*.js', async route => {
      requested(); await gate; await route.continue().catch(() => {});
    });
    try {
      await open(page); await seen;
      await close(page); await page.waitForFunction(() => document.activeElement?.id === 'open-ocean');
      const loaded = page.waitForResponse('**/OpenWaterExperience-*.js'); release(); await loaded;
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      assert.equal(await page.locator('#voyage').count(), 0, 'Late import cannot reopen a canceled voyage');
      assert.equal(new URL(page.url()).hash, '#ocean');
      assert.equal(await page.evaluate(() => document.body.style.overflow), '');
      await page.locator('#open-ocean').click(); await helm(page); await drive(page);
    } finally { release(); }
  });
  await scenario('webgl-fallback', {}, async (page, context) => {
    await context.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(type, ...args) { return /webgl/i.test(type) ? null : Reflect.apply(original, this, [type, ...args]); };
    });
    await open(page); await page.locator('#voyage[data-state="FALLBACK"]').waitFor();
    await page.locator('#open-work-index').click();
    await page.locator('dialog[open] a[href*="/case-studies/anticipy"]').first().click();
    await page.waitForURL('**/case-studies/anticipy');
  });
  await scenario('lazy-chunk-failure', {}, async page => {
    await page.route('**/OpenWaterExperience-*.js', route => route.abort());
    await open(page); await page.locator('#ocean-load-error').waitFor();
    await page.waitForFunction(() => document.activeElement?.id === 'ocean-load-error');
    await close(page); await page.waitForFunction(() => document.activeElement?.id === 'open-ocean');
    assert.equal(await page.locator('#ocean-load-error').count(), 0);
    await page.locator('#read-stellar-learning').click(); await page.waitForURL('**/case-studies/stellar-learning');
    await page.goBack(); await page.waitForFunction(() => document.activeElement?.id === 'read-stellar-learning');
    assert.equal(await page.locator('#voyage').count(), 0, 'Failed world does not follow reading navigation');
  });
  await scenario('preserve-reef-on-reentry', { reducedMotion: 'reduce' }, async page => {
    await open(page); await helm(page, true);
    await page.getByTestId('voyage-chart').click(); await page.getByTestId('region-crown').click();
    await page.locator('#voyage[data-mode="reef"]').waitFor();
    const before = await page.locator('#voyage').getAttribute('data-region');
    await close(page); await page.waitForFunction(() => document.activeElement?.id === 'open-ocean');
    await page.locator('#open-ocean').click();
    await page.locator('#voyage[data-mode="reef"]').waitFor();
    assert.equal(await page.locator('#voyage').getAttribute('data-region'), before);
    await page.waitForFunction(() => document.activeElement?.id === 'yacht-controls');
  });
} finally {
  await writeFile(`${output}/results.json`, JSON.stringify({ url, browser: browser.version(), results }, null, 2));
  await browser.close();
}
