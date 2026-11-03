import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = `${(process.env.QA_URL || 'http://127.0.0.1:4173').replace(/\/$/, '')}/`;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
    // This regression owns DOM routing, scroll and focus; keep GPU work out of it.
    await context.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) {
        return /^webgl/.test(type) ? null : original.call(this, type, ...args);
      };
      // Capture the actual click position: mobile click actionability can scroll
      // farther than scrollIntoViewIfNeeded before activating a link.
      document.addEventListener('click', event => {
        if (event.target.closest?.('a[href*="/case-studies/"]')) window.__caseClickScroll = scrollY;
      }, true);
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on('pageerror', error => {
      if (error.message !== 'Error creating WebGL context.') errors.push(error.message);
    });
    const visitDescent = async () => {
      await page.goto(base + '#descent');
      await page.locator('.static-portfolio').waitFor({ state: 'detached' });
      await page.locator('#descent').waitFor();
      await page.waitForFunction(() => document.activeElement?.id === 'descent');
      const link = page.locator('#dive-link-connections');
      await link.scrollIntoViewIfNeeded();
      return link;
    };
    const link = await visitDescent();
    await link.click();
    const initialScroll = await page.evaluate(() => window.__caseClickScroll);
    await page.waitForURL('**/case-studies/anticipy');
    await page.goBack();
    await page.locator('#hero-title').waitFor();
    await page.locator('#descent').waitFor();
    await page.waitForFunction(() => document.activeElement?.id === 'dive-link-connections');
    assert.ok(Math.abs(await page.evaluate(() => scrollY) - initialScroll) < 8, `Browser Back restores descent: ${await page.evaluate(() => scrollY)} vs ${initialScroll}`);
    assert.equal(await page.locator('#voyage').count(), 1, 'Descent return remounts the interactive section');

    await link.click();
    const returnScroll = await page.evaluate(() => window.__caseClickScroll);
    await page.waitForURL('**/case-studies/anticipy');
    await page.locator('.pv-case-nav').getByRole('link', { name: 'Back to Open Water', exact: true }).click();
    await page.waitForFunction(() => document.activeElement?.id === 'dive-link-connections');
    assert.ok(Math.abs(await page.evaluate(() => scrollY) - returnScroll) < 8, 'Contextual return restores descent even with no URL hash');

    await link.click();
    await page.waitForURL('**/case-studies/anticipy');
    await page.locator('.pv-case-nav .pv-wordmark').click();
    await page.locator('#hero-title').waitFor();
    await page.waitForFunction(() => scrollY < 8);
    assert.equal(await page.locator('#descent').count(), 0, 'Explicit Home clears the interactive return');
    assert.equal(await page.locator('#voyage').count(), 0);

    await (await visitDescent()).click();
    await page.waitForURL('**/case-studies/anticipy');
    await page.locator('.pv-case-nav a[href="/#work"]').click();
    await page.waitForFunction(() => document.activeElement?.id === 'work-title');
    assert.equal(await page.locator('#voyage').count(), 0, 'Explicit Work overrides the descent return');

    await visitDescent();
    const feature = page.locator('#read-anticipy-feature');
    await feature.scrollIntoViewIfNeeded();
    await feature.click();
    const readingScroll = await page.evaluate(() => window.__caseClickScroll);
    await page.waitForURL('**/case-studies/anticipy');
    assert.equal(await page.getByRole('link', { name: 'Back to Open Water', exact: true }).count(), 0, 'A reading link remains a reading origin with a stale descent hash');
    await page.goBack();
    await page.waitForFunction(() => document.activeElement?.id === 'read-anticipy-feature');
    assert.ok(Math.abs(await page.evaluate(() => scrollY) - readingScroll) < 8);
    assert.equal(await page.locator('#voyage').count(), 0, 'Reading Back does not reopen the old descent');
    assert.deepEqual(errors, []);
    await context.close();
    console.log(`PASS ${viewport.width}px: descent browser Back, contextual Back, Home/Work overrides, reading return and focus/scroll`);
  }
} finally {
  await browser.close();
}
