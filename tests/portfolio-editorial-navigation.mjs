import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const base = process.env.QA_URL || 'http://127.0.0.1:4175/';
const browser = await chromium.launch({channel:'chrome',headless:true});
try {
  const context = await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  const page = await context.newPage(); page.setDefaultTimeout(15000);
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/OpenWaterExperience-*.js', async route => { await new Promise(r=>setTimeout(r,500)); await route.continue(); });
  await page.goto(base);
  const headerAnticipy=page.locator('.eh-header').getByRole('link',{name:'Anticipy',exact:true});
  await headerAnticipy.click();await page.waitForURL('**/case-studies/anticipy');await page.goBack();
  await page.waitForFunction(()=>document.activeElement?.id==='nav-anticipy');
  assert.ok(await page.evaluate(()=>scrollY<8),'Header case return stays at the top');
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('href')),'#about','Tab continues through the header after Back');
  await page.goto(base+'#work');
  const read=page.locator('#read-docubridge'); await read.scrollIntoViewIfNeeded();
  const before=await page.evaluate(()=>scrollY); await read.click(); await page.waitForURL('**/case-studies/docubridge');
  await page.goBack(); await page.waitForFunction(()=>document.activeElement?.id==='read-docubridge');
  assert.ok(Math.abs(await page.evaluate(()=>scrollY)-before)<8,'Back restores the actual reading position');
  assert.equal(await page.locator('#voyage').count(),0,'Ordinary case return does not open the world');
  for(const [label,id] of [['About','about-title'],['Selected work','work-title']]) {
    await page.locator('#read-anticipy-feature').click(); await page.waitForURL('**/case-studies/anticipy');
    await page.locator('.pv-case-nav').getByRole('link',{name:label,exact:true}).click();
    await page.waitForFunction(expected=>document.activeElement?.id===expected,id);
    const r=await page.locator('#'+id).boundingBox(); assert.ok(r.y>=0&&r.y<900,`${label} heading visible and focused`);
  }
  await page.locator('#open-ocean').click();
  await page.waitForFunction(()=>document.activeElement?.id==='take-helm');
  assert.ok(await page.locator('#open-work-index').isVisible());
  const close=page.getByRole('button',{name:'Close Open Water',exact:true});await close.click();
  await page.waitForFunction(()=>document.activeElement?.id==='open-ocean');assert.equal(await page.locator('#voyage').count(),0);
  await page.locator('#read-anticipy-feature').click();await page.waitForURL('**/case-studies/anticipy');await page.goBack();
  await page.locator('#open-ocean').waitFor();assert.equal(await page.locator('#voyage').count(),0,'Closed world stays closed after case navigation');
  // Wait for Back restoration, not just the first Home render, before starting another navigation.
  await page.waitForFunction(()=>document.activeElement?.id==='read-anticipy-feature');
  await page.goto(base+'#descent');await page.locator('#descent').waitFor();
  await page.waitForFunction(()=>{const r=document.querySelector('#descent')?.getBoundingClientRect();return r&&r.top>=0&&r.top<150;});
  const target=await page.locator('#descent').boundingBox();assert.ok(target.y>=0&&target.y<150,'Delayed direct hash settles at descent');
  assert.deepEqual(errors,[]);await context.close();
  const failure=await browser.newContext();const broken=await failure.newPage();
  await broken.route('**/OpenWaterExperience-*.js',route=>route.abort('failed'));
  await broken.goto(base);await broken.locator('#open-ocean').click();
  await broken.getByText('Open Water couldn’t load.').waitFor();
  await broken.locator('.eh-ocean-fallback a[href="#work"]').click();
  assert.ok(await broken.locator('#read-docubridge').count());
  const failureLink=broken.locator('#read-docubridge');await failureLink.scrollIntoViewIfNeeded();
  const failureScroll=await broken.evaluate(()=>scrollY);
  await failureLink.click();await broken.waitForURL('**/case-studies/docubridge');await broken.goBack();
  await broken.waitForFunction(()=>document.activeElement?.id==='read-docubridge');
  assert.ok(Math.abs(await broken.evaluate(()=>scrollY)-failureScroll)<8,'Failed world still restores reading position');
  for(const [hash,id] of [['about','about-title'],['contact','contact-title']]) {
    await broken.locator(`.eh-header a[href="#${hash}"]`).click();
    await broken.waitForFunction(expected=>document.activeElement?.id===expected,id);
  }
  for(const hash of ['voyage','descent']) {
    // A same-page hash change would not exercise initial lazy-load failure.
    await broken.goto('about:blank');
    const response=await broken.goto(base+'#'+hash);
    assert.equal(response?.status(),200,'Direct ocean hash starts a fresh document');
    await broken.waitForFunction(()=>document.activeElement?.id==='ocean-load-error');
    const fallback=await broken.locator('#ocean-load-error').boundingBox();
    assert.ok(fallback.y>=0&&fallback.y<720,'Direct ocean hash reaches the visible failure message');
  }
  await failure.close();
  console.log('PASS header return/Tab order, reading-position return, explicit anchor focus, delayed ocean entry, close/reopen choice, direct descent, failed-world case return/section focus, and direct failure hashes');
} finally { await browser.close(); }
