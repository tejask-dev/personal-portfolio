import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
const base=process.env.QA_URL||'http://127.0.0.1:4175';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const context=await browser.newContext({viewport:{width:375,height:812},reducedMotion:'reduce'});
 const page=await context.newPage();
 const errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(['fetch','xhr'].includes(r.resourceType()))requests.push(r.url());});
 await page.goto(base+'/case-studies/docubridge');
 const demo=page.getByRole('region',{name:'DocuBridge illustrative walkthrough'});
 await demo.getByRole('button',{name:/Questions/}).click();
 await demo.getByRole('button',{name:'Which month has the highest revenue?'}).click();
 assert.match(await demo.getByRole('status').innerText(),/February: 150/);
 await demo.getByLabel('Invented workbook').selectOption('Operations');
 assert.doesNotMatch(await demo.getByRole('status').innerText(),/February: 150/);
 await demo.getByRole('button',{name:'Which month has the most resolved tickets?'}).click();
 assert.match(await demo.getByRole('status').innerText(),/March: 36/);
 await demo.getByRole('button',{name:'Reset walkthrough'}).click();
 assert.equal(await demo.getByLabel('Invented workbook').inputValue(),'Revenue');
 assert.equal(await demo.getByRole('status').count(),0);
 assert.deepEqual(requests,[],'Illustration never calls a backend');
 assert.deepEqual(errors,[]);
 for(const [w,h] of [[375,812],[768,1024],[1440,900],[844,390]]){
  await page.setViewportSize({width:w,height:h});await demo.scrollIntoViewIfNeeded();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  assert.deepEqual(axe.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[],`${w} accessibility scan`);
 }
 console.log('PASS DocuBridge: worksheet selection, prepared answers, reset, no service calls, four viewports, axe checks');
}finally{await browser.close();}
