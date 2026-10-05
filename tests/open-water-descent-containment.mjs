/** Regression: prove the scene stays in its own region and real links take input. */
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const url=process.env.QA_URL || 'http://127.0.0.1:4175/';
const browser=await chromium.launch({channel:'chrome',headless:true});
const cases=[['motion',1440,900,false,false],['paused',1440,900,false,true],['phone',375,812,false,false],['tablet',768,1024,false,false],['short-landscape',844,390,false,false],['reduced',1440,900,true,false]];
try{
 for(const [name,width,height,reduced,pause] of cases){
  const ctx=await browser.newContext({viewport:{width,height},reducedMotion:reduced?'reduce':'no-preference'});
  const page=await ctx.newPage();
  for(const exit of reduced?['.sd-masthead a[href="#current-work"]']:['.sd-bottom a','.sd-masthead a[href="#work"]']){
   await page.goto(url);
   // The current edition may disclose the optional world before mounting it.
   const opener=page.locator('#open-ocean');
   if(await opener.count())await opener.click();
   await page.locator('#descent').waitFor({state:'attached'});
   await page.evaluate(()=>{
    const el=document.querySelector('#descent');window.scrollTo({top:el.getBoundingClientRect().top+scrollY+200,behavior:'instant'});
   });
   if(pause)await page.getByRole('button',{name:'Pause scenery',exact:false}).click();
   await page.locator(exit).click();
   await page.waitForTimeout(1100);
   const target=exit.includes('#work')?'.pv-work a[href*="/case-studies/"]':'#read-anticipy-feature';
   const link=page.locator(target).first();
   await link.scrollIntoViewIfNeeded();
   const hit=await link.evaluate(el=>{const r=el.getBoundingClientRect();const p=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return {receivesInput:el===p||el.contains(p),hit:p?.tagName+' '+p?.className};});
   assert.equal(hit.receivesInput,true,`${name} ${exit}: ${JSON.stringify(hit)}`);
   const expected=await link.getAttribute('href');
   await link.click({timeout:5000});
   await page.waitForURL(`**${expected}`);
   await page.goBack();
   await page.locator('#current-work').waitFor();
   console.log(`PASS ${name}: ${exit} → actual case click → back`);
  }
  if(!reduced){
   await page.goto(url+'#descent');
   await page.locator('#descent').waitFor({state:'attached'});
   await page.evaluate(()=>{const el=document.querySelector('#descent');window.scrollTo({top:el.getBoundingClientRect().top+scrollY+el.getBoundingClientRect().height-80,behavior:'instant'});});
   await page.waitForTimeout(100);
   const b=await page.evaluate(()=>{const s=document.querySelector('.sd-sticky').getBoundingClientRect(),e=document.querySelector('#descent').getBoundingClientRect();return {stickyBottom:s.bottom,sectionBottom:e.bottom};});
   assert.ok(b.stickyBottom<=b.sectionBottom+1,`${name} sticky stays within section ${JSON.stringify(b)}`);
   await page.setViewportSize({width:width===1440?768:1440,height:900});
   await page.locator('#read-anticipy-feature').scrollIntoViewIfNeeded();
   await page.locator('#read-anticipy-feature').click({timeout:5000});
   await page.waitForURL('**/case-studies/anticipy');
  }
  await ctx.close();
 }
}finally{await browser.close();}
