import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const origin = (process.env.QA_URL || 'http://127.0.0.1:4175').replace(/\/$/, '');
const output = process.env.QA_OUTPUT || '/tmp/portfolio-entry-qa';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
const failures = [];
const optionalWorld = /(?:OpenWaterExperience|OpenWaterScene|ScubaScene|ScrollDive|BufferGeometryUtils)|\.glb(?:[?#]|$)/i;

async function scenario(name, options, test) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', ...options });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.setDefaultNavigationTimeout(30000);
  const requests = [], pageErrors = [];
  page.on('request', request => requests.push(request.url()));
  page.on('pageerror', error => pageErrors.push(error.message));
  try {
    const evidence = await test({ context, page, requests });
    assert.deepEqual(pageErrors, [], `${name}: uncaught page errors`);
    results.push({ name, passed: true, ...evidence });
    console.log('PASS', name);
  } catch (error) {
    failures.push({ name, error: error.stack || String(error), pageErrors });
    results.push({ name, passed: false, error: error.message });
    await page.screenshot({ path: `${output}/failure-${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`, fullPage: false }).catch(() => {});
    console.error('FAIL', name, error.message);
  } finally { await context.close(); }
}

async function hydrated(page) {
  await page.locator('.static-portfolio').waitFor({ state: 'detached' });
}
async function choice(page) {
  const modal = page.locator('.pathway-entry[open]');
  await modal.waitFor();
  await modal.getByRole('button', { name: /Read the portfolio/ }).waitFor();
  return modal;
}
function assertNoWorld(requests, message) {
  assert.deepEqual(requests.filter(url => optionalWorld.test(url)), [], message);
}
async function noOverflow(page) {
  const sizes = await page.evaluate(() => {
    const dialog = document.querySelector('.pathway-entry');
    return {
      viewport: innerWidth, document: document.documentElement.scrollWidth,
      dialogClient: dialog?.clientWidth, dialogScroll: dialog?.scrollWidth,
    };
  });
  assert.ok(sizes.document <= sizes.viewport + 1, `document overflow: ${JSON.stringify(sizes)}`);
  if (sizes.dialogClient) assert.ok(sizes.dialogScroll <= sizes.dialogClient + 1, `dialog overflow: ${JSON.stringify(sizes)}`);
  return sizes;
}
async function axe(page) {
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  assert.deepEqual(result.violations.map(v => ({ id: v.id, impact: v.impact, targets: v.nodes.map(n => n.target) })), []);
  return { passes: result.passes.length, violations: result.violations.length };
}

try {
  await scenario('fresh animated intro and reading return', { reducedMotion: 'no-preference' }, async ({ context, page, requests }) => {
    await context.addInitScript(() => {
      window.__entryTimeline = { values: [], firstAt: null, completeAt: null };
      new MutationObserver(() => {
        const timeline = window.__entryTimeline;
        const progress = document.querySelector('.pathway-entry progress');
        if (progress) {
          timeline.firstAt ??= performance.now();
          if (timeline.values.at(-1) !== progress.value) timeline.values.push(progress.value);
        }
        if (timeline.firstAt !== null && document.querySelector('.pathway-entry .pe-choices')) {
          timeline.completeAt ??= performance.now();
          if (timeline.values.at(-1) !== 100) timeline.values.push(100);
        }
      }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['value', 'open'] });
    });
    await page.goto(origin, { waitUntil: 'domcontentloaded' });
    await page.getByRole('progressbar', { name: 'Introduction animation' }).waitFor();
    assert.equal(await page.locator('.pe-vessel svg').evaluate(el => getComputedStyle(el).animationName), 'pe-bob', 'normal motion animates the yacht itself');
    assertNoWorld(requests, 'intro must not request the optional world');
    await page.screenshot({ path: `${output}/intro-desktop.png` });
    const modal = await choice(page);
    const timeline = await page.evaluate(() => window.__entryTimeline);
    assert.equal(timeline.values[0], 0, 'intro begins at 0');
    assert.equal(timeline.values.at(-1), 100, 'choice is revealed when the introduction reaches 100');
    assert.ok(timeline.values.length > 15, 'progress has distinct intermediate values');
    assert.ok(timeline.values.every((n, i, a) => i === 0 || n >= a[i - 1]), 'progress is monotonic');
    const duration = timeline.completeAt - timeline.firstAt;
    assert.ok(duration >= 2450 && duration <= 4500, `intro duration is about 2.8s; observed ${duration}ms`);
    assertNoWorld(requests, 'choice must not request the optional world');
    await page.screenshot({ path: `${output}/choices-desktop.png` });
    await modal.getByRole('button', { name: /Read the portfolio/ }).click();
    await modal.waitFor({ state: 'detached' });
    await page.locator('#hero-title').waitFor();
    await page.waitForFunction(() => document.activeElement?.id === 'hero-title');
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'hero-title', 'reading choice focuses the hero');
    assertNoWorld(requests, 'reading choice must not request the optional world');
    await page.evaluate(() => history.replaceState(null, '', location.pathname));
    await page.reload({ waitUntil: 'domcontentloaded' }); await hydrated(page);
    assert.equal(await page.locator('.pathway-entry[open]').count(), 0, 'same-session reload bypasses intro');
    assertNoWorld(requests, 'reading reload must not request the optional world');
    const reopen = page.getByRole('button', { name: 'Choose interactions', exact: true });
    await reopen.click();
    const reopened = await choice(page);
    assert.equal(await reopened.locator('progress').count(), 0, 'reopening goes directly to choices');
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab');
      assert.ok(await reopened.evaluate(dialog => dialog.contains(document.activeElement)), 'native modal traps keyboard focus');
    }
    await page.keyboard.press('Escape');
    await reopened.waitFor({ state: 'detached' });
    assert.equal(await reopen.evaluate(button => button === document.activeElement), true, 'Escape restores chooser trigger focus');
    return { progressValues: timeline.values, durationMs: Math.round(duration), optionalWorldRequests: 0 };
  });

  await scenario('skip intro and switch back from water', { reducedMotion: 'no-preference' }, async ({ page }) => {
    await page.goto(origin + '/#top', { waitUntil: 'domcontentloaded' });
    await page.getByRole('progressbar', { name: 'Introduction animation' }).waitFor();
    const beforeHistory = await page.evaluate(() => history.length);
    await page.getByRole('button', { name: 'Skip to portfolio' }).click();
    await page.waitForFunction(() => document.activeElement?.id === 'hero-title');
    assert.equal(await page.evaluate(() => history.length), beforeHistory, 'intro choice replaces history');
    const reopen = page.getByRole('button', { name: 'Choose interactions', exact: true });
    await reopen.click();
    await (await choice(page)).getByRole('button', { name: /Take to the water/ }).click();
    await page.locator('#take-helm').waitFor({ timeout: 30000 });
    await page.waitForFunction(() => document.activeElement?.id === 'take-helm');
    const oceanScroll = await page.evaluate(() => scrollY);
    await reopen.evaluate(button => { button.focus({ preventScroll: true }); button.click(); });
    await choice(page); await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('.pathway-entry[open]'));
    assert.equal(await reopen.evaluate(button => button === document.activeElement), true);
    assert.ok(Math.abs(await page.evaluate(() => scrollY) - oceanScroll) < 2, 'closing chooser preserves voyage scroll');
    await reopen.evaluate(button => button.click());
    await (await choice(page)).getByRole('button', { name: /Read the portfolio/ }).click();
    await page.waitForFunction(() => document.activeElement?.id === 'hero-title');
    assert.equal(await page.locator('#voyage').count(), 0, 'plain pathway unmounts the world');
    assert.equal(await page.evaluate(() => history.length), beforeHistory, 'switching creates no history clutter');
    return { skipped: true, switching: true, preservedScroll: true, historyStable: true };
  });

  await scenario('motion preference changes during introduction', { reducedMotion: 'no-preference' }, async ({ page }) => {
    await page.addInitScript(() => {
      const request = window.requestAnimationFrame.bind(window);
      const cancel = window.cancelAnimationFrame.bind(window);
      const pending = new Map();
      window.__cancelledIntroFrames = [];
      window.requestAnimationFrame = callback => {
        const id = request(time => { pending.delete(id); callback(time); });
        pending.set(id, callback);
        return id;
      };
      window.cancelAnimationFrame = id => {
        if (pending.has(id)) window.__cancelledIntroFrames.push(pending.get(id));
        pending.delete(id); cancel(id);
      };
    });
    await page.goto(origin, { waitUntil: 'domcontentloaded' });
    await page.getByRole('progressbar', { name: 'Introduction animation' }).waitFor();
    await page.evaluate(() => { window.__cancelledIntroFrames.length = 0; });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const modal = await choice(page);
    assert.equal(await modal.locator('progress').count(), 0);
    const cancelled = await page.evaluate(() => {
      const frames = window.__cancelledIntroFrames;
      // Exercise a late callback as well as the actual cancellation path.
      frames.forEach(callback => callback(performance.now()));
      return frames.length;
    });
    assert.ok(cancelled > 0, 'switching to reduced motion cancels the pending frame');
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.equal(await modal.locator('.pe-seascape').evaluate(el => el.style.getPropertyValue('--journey')), '1', 'late frames cannot undo arrival');
    assert.equal(await modal.locator('.pe-vessel svg').evaluate(el => getComputedStyle(el).animationName), 'none');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.activeElement?.id === 'hero-title');
    return { immediateChoiceAfterReduction: true, cancelledFrames: cancelled, staleFrameIgnored: true, escapeToReading: true };
  });

  for (const [width, height, label] of [[320, 740, 'small-phone'], [375, 812, 'phone'], [768, 1024, 'tablet'], [1440, 900, 'desktop'], [844, 390, 'landscape']]) {
    await scenario(`chooser ${label}`, { viewport: { width, height } }, async ({ page, requests }) => {
      await page.goto(origin, { waitUntil: 'domcontentloaded' });
      const modal = await choice(page);
      assert.equal(await modal.locator('progress').count(), 0, 'reduced-motion starts with choices');
      assert.equal(await modal.locator('.pe-vessel svg').evaluate(el => getComputedStyle(el).animationName), 'none', 'reduced-motion disables the yacht bob animation');
      const sizes = await noOverflow(page);
      const accessibility = await axe(page);
      assertNoWorld(requests, `${label}: no optional scene fetched before interactive choice`);
      if (label === 'phone' || label === 'landscape' || label === 'small-phone') await page.screenshot({ path: `${output}/choices-${label}.png`, fullPage: false });
      await modal.getByRole('button', { name: /Read the portfolio/ }).click();
      await modal.waitFor({ state: 'detached' });
      await noOverflow(page);
      return { width, height, sizes, accessibility };
    });
  }

  await scenario('interactive choice opens voyage and work guide', {}, async ({ page, requests }) => {
    await page.goto(origin, { waitUntil: 'domcontentloaded' });
    const modal = await choice(page); assertNoWorld(requests, 'world stays unloaded before choice');
    await modal.getByRole('button', { name: /Take to the water/ }).click();
    await page.waitForURL('**/#voyage');
    await page.locator('#take-helm').waitFor({ timeout: 30000 });
    await page.waitForFunction(() => document.activeElement?.id === 'take-helm', undefined, { timeout: 30000 });
    assert.ok(requests.some(url => optionalWorld.test(url)), 'interactive choice loads the lazy world');
    await page.locator('#open-work-index').click();
    const guide = page.locator('dialog[open]'); await guide.waitFor();
    assert.ok(await guide.locator('a[href*="/case-studies/anticipy"]').count(), 'work guide retains direct Anticipy access');
    await page.keyboard.press('Escape'); await guide.waitFor({ state: 'hidden' });
    return { hash: new URL(page.url()).hash, loadedWorld: true, fieldGuide: true };
  });

  for (const suffix of ['/#work', '/#contact', '/case-studies/stellar-learning']) {
    await scenario(`deep link ${suffix}`, {}, async ({ page, requests }) => {
      if (!suffix.includes('#')) {
        await page.route('**/CaseStudy-*.js', async route => {
          await new Promise(resolve => setTimeout(resolve, 800));
          await route.continue();
        });
      }
      await page.goto(origin + suffix, { waitUntil: 'domcontentloaded' }); await hydrated(page);
      assert.equal(await page.locator('.pathway-entry[open]').count(), 0, 'deep links bypass intro');
      assertNoWorld(requests, 'professional deep links do not load the optional world');
      if (suffix.includes('#')) {
        const id = suffix.split('#')[1]; await page.locator(`#${id}`).waitFor();
        await page.waitForFunction(target => {
          const section = document.getElementById(target);
          const bounds = section?.getBoundingClientRect();
          return bounds && bounds.top < innerHeight && bounds.bottom > 0;
        }, id);
      } else {
        // Hydration removes static HTML before the lazy case-study chunk resolves.
        await page.locator('.pv-case h1').waitFor();
        assert.match(await page.locator('main').innerText(), /Stellar Learning/);
      }
      return { route: suffix };
    });
  }

  await scenario('denied sessionStorage remains usable', {}, async ({ context, page }) => {
    await context.addInitScript(() => Object.defineProperty(window, 'sessionStorage', { configurable: true, get() { throw new DOMException('Storage denied by acceptance fixture', 'SecurityError'); } }));
    await page.goto(origin, { waitUntil: 'domcontentloaded' });
    const modal = await choice(page);
    await modal.getByRole('button', { name: /Read the portfolio/ }).click(); await modal.waitFor({ state: 'detached' });
    const reopen = page.getByRole('button', { name: 'Choose interactions', exact: true });
    await reopen.click(); await choice(page); await page.keyboard.press('Escape');
    assert.equal(await reopen.evaluate(button => button === document.activeElement), true);
    await page.evaluate(() => history.replaceState(null, '', location.pathname));
    await page.reload({ waitUntil: 'domcontentloaded' });
    const afterReload = await choice(page);
    await afterReload.getByRole('button', { name: /Read the portfolio/ }).click();
    await page.locator('#hero-title').waitFor();
    return { storageDenied: true, readingAndReopening: true, reloadMayRepeat: true };
  });

  await scenario('unavailable WebGL retains field guide', {}, async ({ context, page }) => {
    await context.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(type, ...args) {
        return /webgl/i.test(type) ? null : Reflect.apply(original, this, [type, ...args]);
      };
    });
    await page.goto(origin, { waitUntil: 'domcontentloaded' });
    await (await choice(page)).getByRole('button', { name: /Take to the water/ }).click();
    await page.locator('#voyage[data-state="FALLBACK"]').waitFor({ timeout: 30000 });
    await page.locator('#open-work-index').click();
    assert.ok(await page.locator('dialog[open] a[href*="/case-studies/anticipy"]').count());
    return { fallback: true, directWorkAccess: true };
  });

  const cases = [
    ['stellar-learning', [/teammates/i, /AI tools/i, /AP/, /IB/, /unfinished/i, /help/i]],
    ['global-health-research', [/\bR\b/, /writing|wrote/i, /AI/i, /delegat/i, /team/i]],
    ['docubridge', [/learning|learn/i, /technical/i, /prototype/i]],
    ['anticipy', [/Stan Launchpad/, /Hard work pays off/i]],
    ['soma-ai', [/infrastructure/i, /Sub.Saharan Africa/i, /closed/i]],
  ];
  for (const javaScriptEnabled of [true, false]) {
    await scenario(`owner accounts ${javaScriptEnabled ? 'live' : 'static'}`, { javaScriptEnabled }, async ({ page }) => {
      const checked = [];
      for (const [slug, expected] of cases) {
        const response = await page.goto(`${origin}/case-studies/${slug}`, { waitUntil: 'domcontentloaded' });
        assert.equal(response?.status(), 200);
        if (javaScriptEnabled) {
          await hydrated(page);
          await page.locator('.pv-case h1').waitFor();
        }
        const text = await page.locator('main').innerText();
        for (const pattern of expected) assert.match(text, pattern, `${slug}: owner detail ${pattern}`);
        if (slug === 'soma-ai') assert.doesNotMatch(text, /repeat value|clear ownership|sustainable reason|satisfaction of building/i, 'invented prior closure rationale is removed');
        assert.equal(await page.locator('.pathway-entry[open]').count(), 0);
        checked.push(slug);
      }
      if (!javaScriptEnabled) {
        await page.goto(origin, { waitUntil: 'domcontentloaded' });
        assert.match(await page.locator('main').innerText(), /I build AI products across apps and devices/i);
        assert.ok(await page.locator('a[href*="/case-studies/anticipy"]').count());
        assert.equal(await page.locator('.pathway-entry[open]').count(), 0);
      }
      return { javaScriptEnabled, checked };
    });
  }
} finally {
  await writeFile(`${output}/entry-results.json`, JSON.stringify({ url: origin, checkedAt: new Date().toISOString(), browserEvidenceOnly: true, results, failures }, null, 2));
  await browser.close();
}
assert.equal(failures.length, 0, `${failures.length} acceptance scenarios failed; see ${output}/entry-results.json`);
console.log(`All ${results.length} entry and owner-content scenarios passed. Evidence: ${output}`);
