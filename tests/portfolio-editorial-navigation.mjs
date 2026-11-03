import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const base = `${(process.env.QA_URL || 'http://127.0.0.1:4173').replace(/\/$/, '')}/`;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const page = await context.newPage(); page.setDefaultTimeout(15000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.route('**/OpenWaterExperience-*.js', async route => { await new Promise(resolve => setTimeout(resolve, 500)); await route.continue(); });
  await page.goto(base); await page.locator('.static-portfolio').waitFor({ state: 'detached' });
  assert.equal(await page.locator('.pathway-entry').count(), 0);
  const feature = page.locator('#read-anticipy-feature'); await feature.scrollIntoViewIfNeeded();
  const featureScroll = await page.evaluate(() => scrollY);
  await feature.click(); await page.waitForURL('**/case-studies/anticipy'); await page.goBack();
  await page.waitForFunction(() => document.activeElement?.id === 'read-anticipy-feature');
  assert.ok(Math.abs(await page.evaluate(() => scrollY) - featureScroll) < 8, 'Feature return restores the reading position');
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('href')), 'https://anticipy.ai/', 'Tab continues through feature links after Back');
  const read = page.locator('#read-docubridge'); await read.scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => scrollY); await read.click(); await page.waitForURL('**/case-studies/docubridge');
  await page.goBack(); await page.waitForFunction(() => document.activeElement?.id === 'read-docubridge');
  assert.ok(Math.abs(await page.evaluate(() => scrollY) - before) < 8, 'More-project return restores the reading position');
  assert.equal(await page.locator('#voyage').count(), 0, 'Ordinary case return does not open the world');
  for (const [hash, id] of [['about','about-title'], ['work','work-title']]) {
    await feature.click(); await page.waitForURL('**/case-studies/anticipy');
    await page.locator(`.pv-case-nav a[href="/#${hash}"]`).click();
    await page.waitForFunction(expected => document.activeElement?.id === expected, id);
    const bounds = await page.locator('#' + id).boundingBox(); assert.ok(bounds.y >= 0 && bounds.y < 900, `${hash} heading is visible and focused`);
  }
  await page.locator('.eh-header a[href="#ocean"]').click();
  await page.waitForFunction(() => document.activeElement?.id === 'ocean-title');
  assert.equal(await page.locator('#voyage').count(), 0, 'Ocean navigation reaches the poster without loading a scene');
  await page.locator('#open-ocean').click();
  await page.waitForFunction(() => document.activeElement?.id === 'take-helm');
  await page.locator('#take-helm').click();
  await page.waitForFunction(() => document.activeElement?.id === 'yacht-controls');
  await page.locator('#open-work-index').click();
  await page.locator('dialog[open] a[href*="/case-studies/anticipy"]').first().click();
  await page.waitForURL('**/case-studies/anticipy');
  await page.locator('.pv-case-nav').getByRole('link', { name: 'Back to Open Water', exact: true }).click();
  await page.waitForFunction(() => document.activeElement?.id === 'open-work-index');
  assert.equal(await page.locator('#voyage').getAttribute('data-state'), 'PAUSED', 'World-origin return keeps the voyage paused');
  await page.locator('#open-work-index').click();
  await page.locator('dialog[open] a[href*="/case-studies/anticipy"]').first().click();
  await page.waitForURL('**/case-studies/anticipy');
  await page.locator('.pv-case-nav a[href="/#work"]').click();
  await page.waitForFunction(() => document.activeElement?.id === 'work-title');
  assert.equal(await page.locator('#voyage').count(), 0, 'Explicit reading destination overrides previous world history');
  await page.locator('#open-ocean').click(); await page.locator('#voyage').waitFor();
  await page.getByRole('button', { name: 'Close Open Water', exact: true }).click();
  await page.waitForFunction(() => document.activeElement?.id === 'open-ocean');
  assert.equal(await page.locator('#voyage').count(), 0);
  await feature.click(); await page.waitForURL('**/case-studies/anticipy');
  assert.equal(await page.getByRole('link', { name: 'Back to Open Water', exact: true }).count(), 0, 'An earlier voyage does not turn a reading case into a world return');
  await page.goBack(); await page.waitForFunction(() => document.activeElement?.id === 'read-anticipy-feature');
  assert.equal(await page.locator('#voyage').count(), 0, 'Closed world stays closed after reading navigation');
  await page.goto(base + '#descent'); await page.locator('#descent').waitFor();
  await page.waitForFunction(() => { const r = document.querySelector('#descent')?.getBoundingClientRect(); return r && r.top >= 0 && r.top < 150; });
  assert.deepEqual(errors, []); await context.close();

  const failure = await browser.newContext(), broken = await failure.newPage();
  await broken.route('**/OpenWaterExperience-*.js', route => route.abort('failed'));
  await broken.goto(base + '#work'); await broken.locator('#open-ocean').click();
  await broken.locator('#ocean-load-error').waitFor();
  await broken.locator('.eh-ocean-fallback a[href="#work"]').click();
  const failureLink = broken.locator('#read-docubridge'); await failureLink.scrollIntoViewIfNeeded();
  const failureScroll = await broken.evaluate(() => scrollY);
  await failureLink.click(); await broken.waitForURL('**/case-studies/docubridge'); await broken.goBack();
  await broken.waitForFunction(() => document.activeElement?.id === 'read-docubridge');
  assert.ok(Math.abs(await broken.evaluate(() => scrollY) - failureScroll) < 8, 'Failed world still restores reading position');
  for (const [hash, id] of [['about','about-title'], ['contact','contact-title']]) {
    await broken.locator(`.eh-header a[href="#${hash}"]`).click();
    await broken.waitForFunction(expected => document.activeElement?.id === expected, id);
  }
  for (const hash of ['voyage', 'descent']) {
    await broken.goto('about:blank');
    const response = await broken.goto(base + '#' + hash); assert.equal(response?.status(), 200);
    await broken.waitForFunction(() => document.activeElement?.id === 'ocean-load-error');
    const fallback = await broken.locator('#ocean-load-error').boundingBox();
    assert.ok(fallback.y >= 0 && fallback.y < 720, 'Direct ocean hash reaches the visible failure message');
  }
  await failure.close();
  console.log('PASS reading return and Tab order, anchor focus, lazy ocean entry, world-origin return, explicit reading override, close/reopen, direct descent, failed-world return and direct failure hashes');
} finally { await browser.close(); }
