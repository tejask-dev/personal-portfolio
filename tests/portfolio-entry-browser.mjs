import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const origin = (process.env.QA_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
const output = process.env.QA_OUTPUT || '/tmp/portfolio-entry-qa';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [], failures = [];
const optionalWorld = /(?:OpenWaterExperience|OpenWaterScene|ScubaScene|ScrollDive|BufferGeometryUtils)|\.glb(?:[?#]|$)|descent-.*\.mp4/i;

async function scenario(name, options, test) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', ...options });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.setDefaultNavigationTimeout(30000);
  const requests = [], pageErrors = [];
  page.on('request', request => requests.push(request.url()));
  page.on('pageerror', error => pageErrors.push(error.message));
  try {
    const detail = await test({ context, page, requests });
    assert.deepEqual(pageErrors, [], `${name}: uncaught page errors`);
    results.push({ name, passed: true, ...detail });
    console.log('PASS', name);
  } catch (error) {
    failures.push({ name, error: error.stack || String(error), pageErrors });
    results.push({ name, passed: false, error: error.message });
    await page.screenshot({ path: `${output}/failure-${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png` }).catch(() => {});
    console.error('FAIL', name, error.message);
  } finally { await context.close(); }
}
async function hydrated(page) { await page.locator('.static-portfolio').waitFor({ state: 'detached' }); }
function assertNoWorld(requests, message) { assert.deepEqual(requests.filter(url => optionalWorld.test(url)), [], message); }
async function reading(page) {
  await hydrated(page);
  await page.locator('#hero-title').waitFor();
  assert.match(await page.locator('.eh-hero-role').innerText(), /Elda/);
  assert.match(await page.locator('#labs-feature-title').innerText(), /Elda/);
  assert.equal(await page.locator('#current-work a').first().getAttribute('href'), '/case-studies/elda');
  assert.ok(await page.locator('#current-work a[href="https://tryelda.com/"]').count());
  assert.ok(await page.locator('#current-work a[href="https://www.anticipationlabs.com/"]').count());
  assert.match(await page.locator('.pv4-related-product').innerText(), /Earlier product[\s\S]*Anticipy/i);
  assert.equal(await page.locator('.pathway-entry, .pe-departure').count(), 0, 'No entry gate or departure overlay');
  assert.equal(await page.getByRole('button', { name: 'Choose interactions', exact: true }).count(), 0);
}
async function noOverflow(page) {
  const sizes = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
  assert.ok(Math.max(sizes.document, sizes.body) <= sizes.viewport + 1, JSON.stringify(sizes));
  return sizes;
}

try {
  for (const reducedMotion of ['no-preference', 'reduce']) {
    await scenario(`immediate reading ${reducedMotion}`, { reducedMotion }, async ({ page, requests }) => {
      await page.goto(origin, { waitUntil: 'domcontentloaded' });
      await reading(page);
      assert.equal(await page.locator('h1').count(), 1);
      assert.match(await page.locator('.eh-hero-role').innerText(), /COO at Anticipation Labs/);
      assert.ok(await page.locator('.eh-hero-actions a[href="mailto:tejas.kaushik@outlook.com"]').isVisible(), 'Email is available on the first screen');
      assert.deepEqual(await page.locator('.eh-header nav a').allTextContents(), ['Work', 'About', 'Open Water', 'Resume', 'Contact']);
      assertNoWorld(requests, 'Reading never requests the optional world');
      await page.reload({ waitUntil: 'domcontentloaded' });
      await reading(page);
      assertNoWorld(requests, 'Reload remains a reading visit');
      return { immediateContent: true, optionalWorldRequests: 0 };
    });
  }
  for (const [width, height, label] of [[320,740,'small-phone'],[390,844,'phone'],[768,1024,'tablet'],[1440,900,'desktop'],[844,390,'landscape']]) {
    await scenario(`reading ${label}`, { viewport: { width, height } }, async ({ page, requests }) => {
      await page.goto(origin); await reading(page);
      const sizes = await noOverflow(page);
      const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
      assert.deepEqual(accessibility.violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })), []);
      await page.locator('.skip-link').focus(); await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.activeElement?.id === 'work-title');
      assert.equal(await page.locator('#work .pv-work-grid > article').count(), 3);
      for (const name of ['Stellar Learning', 'MoleculeAI', 'Global health research']) assert.ok(await page.locator('#work').getByRole('heading', { name, exact: true }).count());
      assertNoWorld(requests, 'Browsing projects does not load the world');
      await page.screenshot({ path: `${output}/reading-${label}.png`, fullPage: true });
      return { width, height, sizes, axeViolations: 0 };
    });
  }
  for (const suffix of ['/#work','/#about','/#contact','/#ocean','/case-studies/stellar-learning']) {
    await scenario(`professional deep link ${suffix}`, {}, async ({ page, requests }) => {
      if (!suffix.includes('#')) await page.route('**/CaseStudy-*.js', async route => {
        await new Promise(resolve => setTimeout(resolve, 800)); await route.continue();
      });
      await page.goto(origin + suffix, { waitUntil: 'domcontentloaded' }); await hydrated(page);
      assert.equal(await page.locator('.pathway-entry[open]').count(), 0);
      if (suffix.includes('#')) {
        const id = suffix.split('#')[1];
        await page.waitForFunction(target => {
          const bounds = document.getElementById(target)?.getBoundingClientRect();
          return bounds && bounds.top < innerHeight && bounds.bottom > 0;
        }, id);
        assert.equal(await page.locator('#voyage').count(), 0, `${id} remains a reading anchor`);
      } else {
        await page.locator('.pv-case h1').waitFor();
        assert.match(await page.locator('main').innerText(), /Stellar Learning/);
        assert.equal(await page.getByRole('link', { name: /Back to Open Water|Return to water/ }).count(), 0, 'Direct case arrival has no forced world return');
      }
      assertNoWorld(requests, 'Professional deep links do not load the optional world');
      return { route: suffix };
    });
  }
  await scenario('ocean poster is an explicit invitation', {}, async ({ page, requests }) => {
    await page.goto(origin + '/#ocean'); await reading(page);
    assertNoWorld(requests, 'Scrolling to the poster is not consent to load WebGL');
    const poster = page.locator('#ocean img');
    await poster.scrollIntoViewIfNeeded(); await poster.evaluate(img => img.decode());
    assert.ok(await poster.evaluate(img => img.naturalWidth > 0));
    const trigger = poster.locator('xpath=ancestor::*[self::button or self::a][1]');
    await trigger.click();
    await page.waitForURL('**/#voyage'); await page.locator('#take-helm').waitFor();
    assert.ok(requests.some(url => optionalWorld.test(url)));
    await page.locator('#open-work-index').click();
    const guide = page.locator('dialog[open]'); await guide.waitFor();
    assert.ok(await guide.locator('a[href*="/case-studies/anticipy"]').count());
    await page.keyboard.press('Escape'); await guide.waitFor({ state: 'hidden' });
    await page.getByRole('button', { name: 'Close Open Water', exact: true }).click();
    await page.waitForFunction(() => document.activeElement?.id === 'open-ocean');
    assert.equal(await page.locator('#voyage').count(), 0);
    return { posterOpenedWorld: true, fieldGuide: true, closedWithFocus: true };
  });
  await scenario('denied storage and live motion preference stay usable', {}, async ({ context, page, requests }) => {
    await context.addInitScript(() => Object.defineProperty(window, 'sessionStorage', { configurable: true, get() { throw new DOMException('Storage denied by test', 'SecurityError'); } }));
    await page.goto(origin); await reading(page);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.reload(); await reading(page);
    await page.locator('.eh-header a[href="#contact"]').click();
    await page.waitForFunction(() => document.activeElement?.id === 'contact-title');
    assertNoWorld(requests, 'Storage denial cannot force interactive entry');
    return { storageIndependent: true, reducedMotionUsable: true };
  });
  const cases = [
    ['stellar-learning', [/AP/, /IB/, /curriculum/i, /benchmark/i]],
    ['global-health-research', [/\bR\b/, /writing|wrote/i, /34/, /team/i, /association/i]],
    ['docubridge', [/learn/i, /worksheet/i, /prototype/i]],
    ['elda', [/COO/, /care homes/i, /In development/, /Apple Watch/]],
    ['anticipy', [/COO/, /consent/i, /prototype/i, /processing.*off|processing disabled/i]],
    ['soma-ai', [/infrastructure/i, /Sub.Saharan Africa/i, /2026/]],
  ];
  for (const javaScriptEnabled of [true, false]) {
    await scenario(`owner accounts ${javaScriptEnabled ? 'live' : 'static'}`, { javaScriptEnabled }, async ({ page, requests }) => {
      for (const [slug, expected] of cases) {
        const response = await page.goto(`${origin}/case-studies/${slug}`, { waitUntil: 'domcontentloaded' });
        assert.equal(response?.status(), 200);
        if (javaScriptEnabled) { await hydrated(page); await page.locator('.pv-case h1').waitFor(); }
        const text = await page.locator('main').innerText();
        for (const pattern of expected) assert.match(text, pattern, `${slug}: retained owner detail ${pattern}`);
        assert.doesNotMatch(text, /\[CONFIRM/i);
        if (slug === 'soma-ai') assert.doesNotMatch(text, /repeat value|clear ownership|sustainable reason|satisfaction of building/i);
        assert.equal(await page.getByRole('link', { name: /Back to Open Water|Return to water/ }).count(), 0);
      }
      await page.goto(origin); if (javaScriptEnabled) await reading(page);
      assert.match(await page.locator('main').innerText(), /COO at Anticipation Labs/);
      assertNoWorld(requests, 'Reading cases and home never require the world');
      return { javaScriptEnabled, checked: cases.map(([slug]) => slug) };
    });
  }
} finally {
  await writeFile(`${output}/entry-results.json`, JSON.stringify({ url: origin, checkedAt: new Date().toISOString(), browserEvidenceOnly: true, results, failures }, null, 2));
  await browser.close();
}
assert.equal(failures.length, 0, `${failures.length} acceptance scenarios failed; see ${output}/entry-results.json`);
console.log(`All ${results.length} direct-entry and owner-content scenarios passed. Evidence: ${output}`);
