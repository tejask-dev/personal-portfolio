/** Real local HTTP/static output checks. Hosted status is a separate release gate. */
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { socialMetadata } from '../client/src/lib/socialMetadata.ts';
const origin=(process.env.QA_URL || 'http://127.0.0.1:4175').replace(/\/$/,'');
const slugs=['anticipy','stellar-learning','global-health-research','docubridge','soma-ai'];
for(const route of ['/this-route-does-not-exist','/case-studies/missing-case','/missing/nested-route','/missing.png']){
  const response=await fetch(origin+route);
  assert.equal(response.status,404,`HTTP status ${route}`);
  const html=await response.text();
  assert.match(html,/<meta name="robots" content="noindex, follow"/);
  assert.match(html,/This page could not be found/);
  assert.doesNotMatch(html,/id="current-work"/);
  const head=await fetch(origin+route,{method:'HEAD'});
  assert.equal(head.status,404);
  assert.equal(await head.text(),'');
}
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
  const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:375,height:812}});
  const page=await context.newPage();
  for(const route of ['/',...slugs.map(s=>`/case-studies/${s}`)]){
    const response=await page.goto(origin+route);
    assert.equal(response.status(),200,route);
    assert.equal(await page.locator('h1').count(),1,`${route} one main heading`);
    assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'),`https://tejass-kaushik.vercel.app${route}`);
    const social=socialMetadata(route);
    for(const [key,expected] of [['og:type',social.type],['og:image',social.image],['og:image:alt',social.alt]])assert.equal(await page.locator(`meta[property="${key}"]`).getAttribute('content'),expected,`${route} ${key}`);
    const description=await page.locator('meta[name=description]').getAttribute('content');
    assert.ok(description.length>=60 && description.length<=180,`${route} concise description (${description.length})`);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,`${route} static overflow`);
    for(const image of await page.locator('img').all()){
      await image.scrollIntoViewIfNeeded();
      await image.evaluate(img=>img.decode());
      assert.ok(await image.evaluate(img=>img.naturalWidth>0),`${route} image loads`);
    }
    if(route==='/case-studies/docubridge')for(const stage of ['Input','Worksheet','Analysis','Questions','Output'])assert.ok((await page.locator('main').textContent()).includes(stage));
    if(route==='/')for(const slug of slugs)assert.ok(await page.locator(`a[href$="/case-studies/${slug}"]`).count(),`static homepage ${slug}`);
    console.log(`PASS no-JS ${route}: real route, metadata, content, images, width`);
  }
  await context.close();
}finally{await browser.close();}
console.log('PASS four unknown paths return HTTP 404/noindex for GET and HEAD. Local production preview only.');
