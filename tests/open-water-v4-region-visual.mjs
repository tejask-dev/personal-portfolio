/** Actual public-UI habitat capture. No gameplay state mutation. */
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const output='design/previews-v4/region-polish';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:960},deviceScaleFactor:1});
const page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error'&&/THREE|WebGL|shader|GLSL/.test(m.text()))errors.push(m.text());});
try{
 await page.goto(process.env.QA_URL||'http://127.0.0.1:4185');
 await page.locator('#voyage.is-ready').waitFor({timeout:45000});
 await page.waitForTimeout(1200);
 await page.screenshot({path:`${output}/opening-polish.png`});
 await page.locator('#take-helm').click();
 for(const region of (process.env.QA_REGIONS||'crown,driftwall,cathedral,lantern').split(',')){
  const chart=page.getByTestId('voyage-chart');if(await chart.getAttribute('aria-expanded')!=='true')await chart.click();
  await page.getByTestId(`region-${region}`).click();
  await page.waitForFunction(id=>document.querySelector('#voyage')?.dataset.region===id&&document.querySelector('#voyage')?.dataset.mode==='reef',region,{timeout:30000});
  await page.locator('.exp-dive-curtain').waitFor({state:'hidden',timeout:20000});
  if(region==='crown'||process.env.QA_FISH){
   await page.getByTestId('voyage-fish').click();await page.getByTestId('swim-nemo').click();
  }
  const close=page.getByRole('button',{name:'Close expedition panel',exact:true});if(await close.isVisible())await close.click();
  await page.waitForTimeout(2500);
  await page.screenshot({path:`${output}/desktop-${region}.png`});
 }
 await context.close();
 if(!process.env.QA_SKIP_EXTRAS){
 const mobile=await browser.newContext({viewport:{width:320,height:740},deviceScaleFactor:1,isMobile:true,hasTouch:true});
 const phone=await mobile.newPage();phone.on('pageerror',e=>errors.push(e.message));
 await phone.goto(process.env.QA_URL||'http://127.0.0.1:4185');
 await phone.locator('#voyage.is-ready').waitFor({timeout:45000});await phone.locator('#take-helm').click();
 await phone.getByTestId('voyage-chart').click();await phone.getByTestId('region-crown').click();
 await phone.waitForFunction(()=>document.querySelector('#voyage')?.dataset.mode==='reef');
 await phone.locator('.exp-dive-curtain').waitFor({state:'hidden',timeout:20000});
 await phone.getByTestId('voyage-fish').click();await phone.getByTestId('swim-dory').click();
 const close=phone.getByRole('button',{name:'Close expedition panel',exact:true});if(await close.isVisible())await close.click();
 await phone.waitForTimeout(2000);await phone.screenshot({path:`${output}/mobile-dory-polish.png`});
 await mobile.close();
 }
 console.log(JSON.stringify({screenshots:output,errors},null,2));
 await writeFile(`${output}/shader-check${process.env.QA_REGIONS?`-${process.env.QA_REGIONS}`:""}.json`,JSON.stringify({at:new Date().toISOString(),url:process.env.QA_URL||"http://127.0.0.1:4185",regions:process.env.QA_REGIONS||"crown,driftwall,cathedral,lantern",errors},null,2));
}finally{await browser.close();}
if(errors.length)process.exitCode=1;
