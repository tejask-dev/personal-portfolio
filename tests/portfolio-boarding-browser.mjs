import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const url = process.env.QA_URL || 'http://127.0.0.1:4186';
const output = process.env.QA_OUTPUT || '/tmp/portfolio-boarding-qa';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
async function scenario(name, options, test) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...options });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.setDefaultTimeout(20000);
  try {
    await test(page, context);
    assert.deepEqual(errors, [], 'no uncaught browser errors');
    results.push({ name, passed: true });
    console.log('PASS', name);
  } catch (error) {
    await page.screenshot({ path: `${output}/${name}-failure.png` }).catch(() => {});
    results.push({ name, passed: false, error: String(error) });
    throw error;
  } finally {
    const video = page.video();
    await context.close();
    if (video) await video.saveAs(`${output}/${name}.webm`);
  }
}
async function board(page, touch = false) {
  await page.goto(url);
  const take = page.getByRole('button', { name: /Take to the water/ });
  if (touch) await take.tap(); else await take.click();
  await page.getByRole('heading', { name: 'Taking you to the water.' }).waitFor({ timeout: 3000 });
}
async function landed(page, quiet = false) {
  await page.locator('.pathway-entry').waitFor({ state: 'detached' });
  await page.locator('#voyage.exp-active').waitFor();
  assert.equal(await page.locator('#take-helm').count(), 0, 'no second invitation');
  await page.waitForFunction(() => document.activeElement?.id === 'yacht-controls');
  await page.waitForFunction(expected => document.querySelector('#voyage').dataset.state === expected, quiet ? 'PAUSED' : 'SAILING');
  assert.equal(await page.locator('#voyage').getAttribute('data-state'), quiet ? 'PAUSED' : 'SAILING');
}
async function drive(page) {
  const before = await page.locator('#voyage').getAttribute('data-boat-z');
  await page.keyboard.down('w');
  try { await page.waitForFunction(z => document.querySelector('#voyage').dataset.boatZ !== z, before); }
  finally { await page.keyboard.up('w'); }
}
try {
  await scenario('desktop-direct-sailing', { recordVideo: { dir: `${output}/video`, size: { width: 1440, height: 900 } } }, async page => {
    await board(page);
    await page.waitForTimeout(900);
    const zoom = await page.locator('.pe-seascape').evaluate(el => new DOMMatrix(getComputedStyle(el).transform).a);
    assert.ok(zoom > 1.2, 'illustrated yacht visibly zooms');
    await page.screenshot({ path: `${output}/departing.png` });
    await landed(page);
    await page.screenshot({ path: `${output}/at-the-helm.png` });
    await drive(page);
  });
  await scenario('reduced-motion', { reducedMotion: 'reduce' }, async page => {
    await board(page);
    assert.equal(await page.locator('.pe-seascape').evaluate(el => getComputedStyle(el).animationName), 'none');
    await landed(page, true);
    const z = await page.locator('#voyage').getAttribute('data-boat-z');
    await page.getByRole('button', { name: 'Accelerate', exact: true }).click();
    await page.locator('.exp-active-status').filter({ hasText: 'Enable motion to sail' }).waitFor();
    assert.equal(await page.locator('#voyage').getAttribute('data-boat-z'), z, 'Quiet view remains still');
    await page.locator('#open-work-index').click();
    await page.locator('dialog[open] a[href*="/case-studies/anticipy"]').first().click();
    await page.waitForURL('**/case-studies/anticipy');
  });
  await scenario('phone-touch', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, async page => {
    await board(page, true);
    await landed(page);
    await page.screenshot({ path: `${output}/phone-helm.png` });
    const z = await page.locator('#voyage').getAttribute('data-boat-z');
    await page.getByRole('button', { name: 'Accelerate', exact: true }).tap();
    await page.waitForFunction(z => document.querySelector('#voyage').dataset.boatZ !== z, z);
  });
  await scenario('short-landscape', { viewport: { width: 844, height: 390 } }, async page => {
    await board(page);
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${output}/landscape-departure.png` });
    await landed(page);
    await drive(page);
  });
  await scenario('resize-and-motion-change', {}, async page => {
    await page.route(/\/OpenWaterScene(?:-[^/]+\.js|\.tsx)(?:\?.*)?$/, async route => {
      await new Promise(resolve => setTimeout(resolve, 2500));
      await route.continue().catch(() => {});
    });
    await board(page);
    await page.setViewportSize({ width: 844, height: 390 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await landed(page, true);
    assert.equal(await page.evaluate(() => document.body.style.overflow), '');
  });
  await scenario('slow-scene-cancel-and-reenter', {}, async page => {
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    await page.route(/\/OpenWaterScene(?:-[^/]+\.js|\.tsx)(?:\?.*)?$/, async route => {
      await gate;
      await route.continue().catch(() => {});
    });
    await board(page);
    await page.waitForTimeout(2200);
    assert.equal(await page.locator('.pathway-entry[open]').count(), 1, 'wait for actual scene readiness');
    await page.keyboard.press('w');
    assert.equal(await page.locator('#voyage').getAttribute('data-boat-speed'), '0.000', 'modal owns input');
    await page.keyboard.press('Escape');
    release();
    await page.waitForFunction(() => document.activeElement?.id === 'hero-title');
    await page.waitForTimeout(800);
    assert.equal(await page.locator('#voyage').count(), 0, 'late load cannot remount a canceled voyage');
    assert.equal(new URL(page.url()).hash, '#top');
    assert.equal(await page.evaluate(() => document.body.style.overflow), '');
    await page.getByRole('button', { name: 'Choose interactions', exact: true }).click();
    await page.getByRole('button', { name: /Take to the water/ }).dblclick();
    await landed(page);
    await drive(page);
  });
  await scenario('webgl-fallback', {}, async (page, context) => {
    await context.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(type, ...args) {
        return /webgl/i.test(type) ? null : Reflect.apply(original, this, [type, ...args]);
      };
    });
    await board(page);
    await page.locator('.pathway-entry').waitFor({ state: 'detached' });
    await page.locator('#voyage[data-state="FALLBACK"]').waitFor();
    await page.getByRole('button', { name: /Project guide/ }).click();
    const link = page.locator('dialog[open] a[href*="/case-studies/anticipy"]').first();
    await link.click();
    await page.waitForURL('**/case-studies/anticipy');
  });
  await scenario('lazy-chunk-failure', {}, async page => {
    await page.route(/\/OpenWaterExperience(?:-[^/]+\.js|\.tsx)(?:\?.*)?$/, route => route.abort());
    await board(page);
    await page.locator('.pathway-entry').waitFor({ state: 'detached' });
    await page.locator('#ocean-load-error').waitFor();
    await page.getByRole('button', { name: 'Choose interactions', exact: true }).click();
    await page.getByRole('button', { name: /Take to the water/ }).click();
    await page.locator('.pathway-entry').waitFor({ state: 'detached' });
    await page.waitForFunction(() => document.activeElement?.id === 'ocean-load-error');
    await page.locator('#ocean-load-error a[href="#work"]').click();
    await page.locator('#read-stellar-learning').click();
    await page.waitForURL('**/case-studies/stellar-learning');
  });
  await scenario('preserve-reef-on-reentry', { reducedMotion: 'reduce' }, async page => {
    await board(page);
    await landed(page, true);
    await page.getByTestId('voyage-chart').click();
    await page.getByTestId('region-crown').click();
    await page.locator('#voyage[data-mode="reef"]').waitFor();
    // The chooser lives above the full viewport world; use its normal visible control.
    await page.getByRole('button', { name: 'Choose interactions', exact: true }).click();
    await page.getByRole('button', { name: /Take to the water/ }).click();
    await page.locator('.pathway-entry').waitFor({ state: 'detached' });
    assert.equal(await page.locator('#voyage').getAttribute('data-mode'), 'reef');
    await page.waitForFunction(() => document.activeElement?.id === 'yacht-controls');
  });
} finally {
  await writeFile(`${output}/results.json`, JSON.stringify({ url, browser: browser.version(), results }, null, 2));
  await browser.close();
}
