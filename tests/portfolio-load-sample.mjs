/** Bounded resource sample, not field vitals or physical-device performance. */
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.QA_URL||'http://127.0.0.1:4175/';
const out=process.env.QA_OUTPUT||'/tmp/portfolio-editorial-qa';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const report={conditions:'Chrome headless, desktop1440x900 DPR1, unthrottled localhost, fresh context then same-context reload, snapshot4s after navigation; resource comparison, not field vitals or device performance.',browser:browser.version(),samples:[]};
try{
 for(const route of ['', 'case-studies/anticipy','case-studies/docubridge']){
  const context=await browser.newContext({viewport:{width:1440,height:900}});const page=await context.newPage();
  for(const phase of ['cold','warm']){
   if(phase==='cold')await page.goto(new URL(route,base).href);else await page.reload();
   await page.waitForTimeout(4000);
   const sample=await page.evaluate(()=>({nav:performance.getEntriesByType('navigation')[0].toJSON(),resources:performance.getEntriesByType('resource').map(r=>({name:new URL(r.name).pathname,transfer:r.transferSize,encoded:r.encodedBodySize,duration:r.duration}))}));
   sample.totals={requests:sample.resources.length,transfer:sample.resources.reduce((n,r)=>n+r.transfer,0),encoded:sample.resources.reduce((n,r)=>n+r.encoded,0)};
   report.samples.push({route:route||'/',phase,...sample});console.log(route||'/',phase,JSON.stringify(sample.totals));
  }
  await context.close();
 }
 await writeFile(`${out}/load-sample.json`,JSON.stringify(report,null,2));
}finally{await browser.close();}
