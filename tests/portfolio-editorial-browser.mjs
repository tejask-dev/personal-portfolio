import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const url=(process.env.QA_URL||'http://127.0.0.1:4175').replace(/\/$/,'');
const out=process.env.QA_OUTPUT||'/tmp/portfolio-editorial-qa';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const report=[];
try{
 for(const [width,height,name] of [[375,812,'phone'],[768,1024,'tablet'],[1440,900,'desktop'],[844,390,'landscape']]){
  const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce',permissions:['clipboard-read','clipboard-write']});const page=await context.newPage();page.setDefaultTimeout(12000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);await page.locator('.static-portfolio').waitFor({state:'detached'});
  assert.equal(await page.locator('h1').count(),1);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  const proof=await page.locator('#current-work').evaluate(el=>el.getBoundingClientRect().top+scrollY);
  assert.ok(proof<height*2,`${name} meaningful proof begins at ${proof}, limit ${height*2}`);
  const initial=await page.evaluate(()=>performance.getEntriesByType('resource').map(r=>r.name));
  assert.equal(initial.some(n=>/\.glb|OpenWaterScene|ScubaScene|BufferGeometryUtils/.test(n)),false,`${name} optional scene is not fetched initially`);
  await page.screenshot({path:`${out}/home-${name}.png`});
  await page.keyboard.press('Tab');assert.match(await page.locator(':focus').innerText(),/Skip to/i);await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(()=>document.activeElement?.id==='work-title'||document.activeElement?.id==='work'||document.activeElement?.closest('#work')!==null),true,`${name} skip-link focus`);
  const read=page.locator('#read-anticipy-feature');await read.scrollIntoViewIfNeeded();
  assert.ok(await read.evaluate(el=>{const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return hit===el||el.contains(hit);}));
  await read.click();await page.waitForURL('**/case-studies/anticipy');await page.goBack();await read.waitFor();
  await page.goto(url+'/#contact');await page.locator('#contact').getByRole('button',{name:/Copy email/}).click();
  assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),'tejas.kaushik@outlook.com');
  const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.deepEqual(axe.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[],`${name} axe scan`);
  await page.goto(url+'/#voyage');await page.locator('#open-work-index').waitFor();
  const work=page.locator('#open-work-index');await work.click();const dialog=page.locator('dialog[open]');await dialog.waitFor();
  for(let i=0;i<30;i++){await page.keyboard.press('Tab');assert.ok(await dialog.evaluate(el=>el.contains(document.activeElement)),`${name} dialog contains keyboard focus`);}
  await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});assert.equal(await work.evaluate(el=>el===document.activeElement),true,`${name} dialog restores trigger focus`);
  await work.click();await page.locator('.exp-dialog-bar').getByRole('button',{name:/Map|Explore the map/,exact:false}).click();
  assert.ok(await page.locator('.exp-map-legend').isVisible());
  const overlaps=await page.locator('.exp-world-map text').evaluateAll(ns=>{const a=ns.map(n=>({text:n.textContent,r:n.getBoundingClientRect()}));return a.flatMap((x,i)=>a.slice(i+1).filter(y=>x.r.left<y.r.right&&x.r.right>y.r.left&&x.r.top<y.r.bottom&&x.r.bottom>y.r.top).map(y=>[x.text,y.text]));});assert.deepEqual(overlaps,[],`${name} map label collisions`);
  if(name==='phone'||name==='desktop')await page.screenshot({path:`${out}/map-${name}.png`});
  await page.locator('.exp-dialog-bar').getByRole('button',{name:'Contact',exact:true}).click();
  assert.ok(await dialog.locator('a[href="mailto:tejas.kaushik@outlook.com"]').count());await page.keyboard.press('Escape');
  assert.deepEqual(errors,[]);report.push({name,width,height,proofStartsAt:proof,initialRequests:initial.length,checks:'reading, anchor input, route/back, copy email, axe, focus trap/restoration, map labels, contact'});await context.close();console.log('PASS',name);
 }
 const fallback=await browser.newContext({viewport:{width:375,height:812}});await fallback.addInitScript(()=>{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>Promise.reject(new Error('denied'))}});const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:Reflect.apply(original,this,[type,...args]);};});
 const page=await fallback.newPage();await page.goto(url+'/#contact');await page.locator('#contact').getByRole('button',{name:/Copy email/}).click();assert.match(await page.locator('#contact').innerText(),/Select the email address above to copy/);await page.goto(url+'/#voyage');await page.locator('#voyage[data-state="FALLBACK"]').waitFor({timeout:20000});await page.locator('#open-work-index').click();assert.ok(await page.locator('dialog[open] a[href*="/case-studies/anticipy"]').count());report.push({name:'fault injection',checks:'clipboard denial retains selectable email; unavailable WebGL retains direct work guide'});await fallback.close();
 await writeFile(`${out}/browser-results.json`,JSON.stringify(report,null,2));
}finally{await browser.close();}
