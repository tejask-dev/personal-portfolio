import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { chromium, webkit } from 'playwright';

const url = process.env.QA_URL || 'http://127.0.0.1:4186';
const output = process.env.QA_OUTPUT || '/tmp/portfolio-cinematic-security';
const configured = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
const headers = Object.fromEntries(configured.headers[0].headers.map(({ key, value }) => [key.toLowerCase(), value]));
const local = new URL(url).hostname === '127.0.0.1';
await mkdir(output, { recursive: true });
const browserName = process.env.QA_BROWSER || 'chromium';
assert.ok(['chromium', 'webkit'].includes(browserName));
const browser = await (browserName === 'webkit' ? webkit.launch({ headless: true }) : chromium.launch({ channel: 'chrome', headless: true }));
const results = [];
async function scenario(name, options, run) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...options });
  // Vite preview does not apply Vercel headers. Exercise the exact production
  // policy locally, then require the actual response headers on hosted runs.
  if (local) await context.route('**/*', async route => {
    if (route.request().resourceType() !== 'document') return route.continue();
    const response = await route.fetch();
    await route.fulfill({ response, headers: { ...response.headers(), ...headers } });
  });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  const errors = [], violations = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.exposeFunction('recordViolation', value => violations.push(value));
  await page.addInitScript(() => document.addEventListener('securitypolicyviolation', event => window.recordViolation({ directive: event.effectiveDirective, uri: event.blockedURI })));
  try {
    await run(page, context, violations);
    assert.deepEqual(errors, []);
    results.push({ name, passed: true }); console.log('PASS', name);
  } catch (error) {
    results.push({ name, passed: false, error: String(error) });
    await page.screenshot({ path: `${output}/${name}-failure.png` }).catch(() => {});
    throw error;
  } finally { await context.close(); }
}
async function enter(page, mobile = false) {
  const response = await page.goto(`${url}/#descent`);
  for (const [key, value] of Object.entries(headers)) assert.equal(response.headers()[key], value, key);
  await settledDescentHash(page);
  // Scroll just inside the pin range using a real wheel, including scroll-padding.
  const top = await page.locator('#descent').evaluate(el => el.getBoundingClientRect().top);
  if (mobile && browserName === 'webkit') {
    // Playwright has no wheel dispatch on mobile WebKit. Native touch behavior
    // is covered separately in Chrome; here verify media and ordinary links.
    await page.locator('#dive-link-connections').scrollIntoViewIfNeeded();
  } else {
    const viewport = page.viewportSize();
    await page.mouse.move(Math.min(1200, viewport.width - 20), viewport.height / 2); await page.mouse.wheel(0, top + 140);
  }
  await page.waitForFunction(() => document.querySelector('#descent video')?.readyState >= 2 && !document.querySelector('#descent video').paused);
}
async function settledDescentHash(page) {
  await page.locator('#descent').waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => Math.abs(document.querySelector('#descent').getBoundingClientRect().top - parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop)) < 3);
}
async function clickActualLink(page, selector) {
  const link = page.locator(selector); await link.scrollIntoViewIfNeeded();
  const hit = await link.evaluate(el => {
    const r = el.getBoundingClientRect();
    return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest('a') === el;
  });
  assert.ok(hit, `${selector} center intercepted`);
  await link.click();
}
try {
  await scenario('film-security-and-both-exits', {}, async (page, context, violations) => {
    await enter(page);
    assert.equal(await page.locator('#descent canvas').count(), 0);
    await page.screenshot({ path: `${output}/cinematic-desktop.png` });
    await page.getByRole('button', { name: 'Pause scenery', exact: true }).click();
    await page.setViewportSize({ width: 844, height: 390 });
    await clickActualLink(page, '.sd-bottom a');
    await page.waitForFunction(() => location.hash === '#current-work');
    await clickActualLink(page, '#read-anticipy-feature');
    await page.waitForURL(/\/case-studies\/anticipy/);
    await page.goBack();
    await page.goto(`${url}/#descent`); await page.locator('#descent').waitFor();
    await clickActualLink(page, '.sd-masthead a[href="#contact"]');
    await page.waitForFunction(() => location.hash === '#contact');
    const mail = page.locator('#contact a[href^="mailto:"]').first();
    await mail.scrollIntoViewIfNeeded();
    assert.ok(await mail.evaluate(el => { const r = el.getBoundingClientRect(); return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)); }));
    assert.deepEqual(violations, [], 'real content triggered CSP violations');
    await page.evaluate(() => { const script = document.createElement('script'); script.textContent = 'window.__unexpectedInlineScript = true'; document.body.append(script); });
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => window.__unexpectedInlineScript), undefined);
    assert.ok(violations.some(v => v.directive === 'script-src-elem' && v.uri === 'inline'), 'CSP did not block injected script');
  });
  await scenario('film-without-webgl-and-hidden-tab', {}, async page => {
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (kind, ...args) { return /webgl/.test(String(kind)) ? null : Reflect.apply(original, this, [kind, ...args]); };
    });
    await enter(page);
    const before = await page.locator('#descent video').evaluate(v => v.getVideoPlaybackQuality().totalVideoFrames);
    await page.waitForTimeout(400);
    assert.ok(await page.locator('#descent video').evaluate((v, n) => v.getVideoPlaybackQuality().totalVideoFrames > n, before));
    // Explicit lifecycle failure injection; not a physical background-tab claim.
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
    await page.waitForFunction(() => document.querySelector('#descent video').paused);
    const time = await page.locator('#descent video').evaluate(v => v.currentTime);
    await page.waitForTimeout(400);
    assert.equal(await page.locator('#descent video').evaluate(v => v.currentTime), time);
    await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
    await page.waitForFunction(() => document.querySelector('#descent video')?.readyState >= 2 && !document.querySelector('#descent video').paused);
  });
  await scenario('phone-film-and-real-navigation', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, async page => {
    await enter(page, true);
    const media = await page.locator('#descent video').evaluate(v => ({ width: v.videoWidth, src: v.currentSrc, muted: v.muted, inline: v.playsInline }));
    assert.equal(media.width, 960); assert.ok(media.src.endsWith('descent-mobile.mp4') && media.muted && media.inline);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: `${output}/cinematic-phone.png` });
    await page.getByRole('button', { name: 'Pause scenery', exact: true }).click();
    await clickActualLink(page, '.sd-bottom a'); await clickActualLink(page, '#read-anticipy-feature');
    await page.waitForURL(/\/case-studies\/anticipy/);
  });
  for (const mode of ['reduced', 'save-data', 'work-hash']) await scenario(mode, mode === 'reduced' ? { reducedMotion: 'reduce' } : {}, async (page, context, violations) => {
    if (mode === 'save-data') await page.addInitScript(() => Object.defineProperty(navigator, 'connection', { value: { saveData: true } }));
    const media = []; page.on('request', request => { if (/descent-.*\.mp4/.test(request.url())) media.push(request.url()); });
    await page.goto(`${url}/#${mode === 'work-hash' ? 'current-work' : 'descent'}`);
    await page.locator(mode === 'work-hash' ? '#current-work' : '#descent').waitFor();
    await page.waitForTimeout(500);
    assert.deepEqual(media, [], 'static path downloaded a film');
    assert.equal(await page.locator('#descent video').count(), 0);
    if (mode !== 'work-hash') await clickActualLink(page, '#dive-link-surface');
    await clickActualLink(page, '#read-anticipy-feature');
    await page.waitForURL(/\/case-studies\/anticipy/);
    assert.deepEqual(violations, []);
  });
  await scenario('blocked-autoplay-readable-and-recoverable', {}, async page => {
    await page.addInitScript(() => {
      const play = HTMLMediaElement.prototype.play; let block = true;
      HTMLMediaElement.prototype.play = function () {
        if (block) { block = false; return Promise.reject(new DOMException('Injected autoplay refusal', 'NotAllowedError')); }
        return Reflect.apply(play, this, []);
      };
    });
    await page.goto(`${url}/#descent`);
    await settledDescentHash(page);
    await page.mouse.wheel(0, 150);
    await page.getByRole('button', { name: 'Play scenery', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Play scenery', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('#descent video')?.readyState >= 2 && !document.querySelector('#descent video').paused);
    await clickActualLink(page, '.sd-bottom a');
    await clickActualLink(page, '#read-anticipy-feature');
    await page.waitForURL(/\/case-studies\/anticipy/);
  });
  await scenario('pause-while-loading-does-not-expire-film', {}, async page => {
    let release;
    const pending = new Promise(resolve => { release = resolve; });
    await page.route(/descent-.*\.mp4/, async route => { await pending; await route.continue(); });
    try {
      await page.goto(`${url}/#descent`, { waitUntil: 'domcontentloaded' });
      await settledDescentHash(page); await page.mouse.wheel(0, 150);
      await page.locator('#descent video').waitFor({ state: 'attached' });
      await page.getByRole('button', { name: 'Pause scenery', exact: true }).click();
      await page.waitForTimeout(12500);
      assert.equal(await page.locator('#descent').getAttribute('data-scene-failed'), 'false');
      release();
      await page.waitForFunction(() => document.querySelector('#descent video')?.readyState >= 2);
      assert.ok(await page.locator('#descent video').evaluate(v => v.paused));
      await page.getByRole('button', { name: 'Play scenery', exact: true }).click();
      await page.waitForFunction(() => !document.querySelector('#descent video').paused);
    } finally { release(); }
  });
} finally {
  await browser.close();
  await writeFile(`${output}/results.json`, JSON.stringify({ url, browser: browserName, policySource: local ? 'injected exact vercel.json response headers' : 'actual hosted response headers', results }, null, 2));
}
