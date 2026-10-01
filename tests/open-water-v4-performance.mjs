/** Public-input, isolated Chrome render/resource probe.
 * QA_URL=http://127.0.0.1:4185 QA_SAMPLE_MS=15000 node tests/open-water-v4-performance.mjs
 * Set QA_SAMPLE_MS=120000 for two browser-clock minutes per view. This does not
 * establish physical-phone, native Safari, thermal or field-network performance.
 * Run alone: other WebGL browser sessions must be paused/closed first.
 */
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const url=process.env.QA_URL||"http://127.0.0.1:4185";
const duration=Math.max(2000,Number(process.env.QA_SAMPLE_MS||15000));
const output=path.resolve(process.env.QA_OUTPUT||"design/open-water-v4/implementation-qa");
const reportFile=path.join(output,path.basename(process.env.QA_REPORT_NAME||"performance.json"));
const regions=["crown","driftwall","cathedral","lantern"];
const report={at:new Date().toISOString(),url,duration,completed:false,
  evidence:"Isolated headless Chrome on one Mac. Low uses phone viewport/touch/DPR emulation on the same GPU. No throttling. Frame intervals measure CPU-side rendered submissions, not GPU completion. Resource counts observe live GL handles, not byte-accurate VRAM. A sample shorter than120000 browser milliseconds is a diagnostic probe, not sustained acceptance.",
  host:{platform:process.platform,architecture:process.arch,cpu:os.cpus()[0]?.model},
  measurements:[],transitions:[],boots:[],cycles:[],checks:[],findings:[],screenshots:[]};
try{
  const html=await (await fetch(url)).text();
  report.entryAssets=[...html.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css))["']/g)].map(m=>m[1]);
}catch(error){report.buildMetadataError=error.message;}
report.sampleActivity="Animated stationary views; interactive races and challenge completion are separate functional checks. Transition long tasks are recorded independently of steady-state frame samples.";
await mkdir(output,{recursive:true});
const flush=()=>writeFile(reportFile,`${JSON.stringify(report,null,2)}\n`);
const percentile=(values,p)=>{const sorted=[...values].sort((a,b)=>a-b);return sorted.length?sorted[Math.max(0,Math.ceil(sorted.length*p)-1)]:null;};
const round=n=>n===null?null:Math.round(n*100)/100;
const browser=await chromium.launch({channel:"chrome",headless:true});
report.browser=browser.version();

async function instrument(page){
  await page.addInitScript(()=>{
    performance.setResourceTimingBufferSize(5000);
    const qa=window.__owV4Perf={enabled:false,frames:[],longTasks:[],resources:{},stamp:0,totalDraws:0,firstDrawAt:null,renderer:null};
    const raf=window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame=callback=>raf(timestamp=>{qa.stamp=timestamp;callback(timestamp);});
    const wrapped=Symbol("open-water-v4-observer");
    const kinds=["Buffer","Texture","Program","Shader","Framebuffer","Renderbuffer","VertexArray","Sampler","TransformFeedback","Query"];
    const live=Object.fromEntries(kinds.map(kind=>[kind,new Set()]));
    for(const kind of kinds)qa.resources[kind]={created:0,deleted:0,live:0,peak:0};
    for(const Constructor of [window.WebGLRenderingContext,window.WebGL2RenderingContext]){
      if(!Constructor)continue;
      for(const kind of kinds)for(const verb of ["create","delete"]){
        const method=`${verb}${kind}`,native=Constructor.prototype[method];
        if(!native||native[wrapped])continue;
        const fn=function(...args){
          const result=Reflect.apply(native,this,args),counter=qa.resources[kind];
          if(verb==="create"&&result&&!live[kind].has(result)){live[kind].add(result);counter.created++;}
          if(verb==="delete"&&args[0]&&live[kind].delete(args[0]))counter.deleted++;
          counter.live=live[kind].size;counter.peak=Math.max(counter.peak,counter.live);return result;
        };
        fn[wrapped]=true;Constructor.prototype[method]=fn;
      }
      for(const method of ["drawArrays","drawElements","drawArraysInstanced","drawElementsInstanced"]){
        const native=Constructor.prototype[method];if(!native||native[wrapped])continue;
        const fn=function(...args){
          const result=Reflect.apply(native,this,args);
          const count=method.startsWith("drawArrays")?args[2]:args[1],instances=method.endsWith("Instanced")?args[method.startsWith("drawArrays")?3:4]:1;
          const triangles=args[0]===this.TRIANGLES?count/3*instances:args[0]===this.TRIANGLE_STRIP||args[0]===this.TRIANGLE_FAN?Math.max(0,count-2)*instances:0;
          qa.totalDraws++;if(qa.firstDrawAt===null)qa.firstDrawAt=performance.now();
          if(!qa.renderer){const ext=this.getExtension("WEBGL_debug_renderer_info");qa.renderer={name:this.getParameter(ext?ext.UNMASKED_RENDERER_WEBGL:this.RENDERER),vendor:this.getParameter(ext?ext.UNMASKED_VENDOR_WEBGL:this.VENDOR),version:this.getParameter(this.VERSION)};}
          if(qa.enabled){let frame=qa.frames.at(-1);if(!frame||frame.stamp!==qa.stamp){frame={stamp:qa.stamp,draws:0,triangles:0};qa.frames.push(frame);}frame.draws++;frame.triangles+=triangles;}
          return result;
        };
        fn[wrapped]=true;Constructor.prototype[method]=fn;
      }
    }
    try{new PerformanceObserver(list=>qa.longTasks.push(...list.getEntries().map(e=>({at:e.startTime,duration:e.duration})))).observe({type:"longtask",buffered:false});}catch{}
  });
}
const readState=page=>page.locator("#voyage").evaluate(el=>({...el.dataset}));
const resources=page=>page.evaluate(()=>({resources:window.__owV4Perf.resources,renderer:window.__owV4Perf.renderer,
  modelLoads:performance.getEntriesByType("resource").filter(e=>/\.(?:glb|gltf)(?:\?|$)/.test(e.name)).map(e=>({url:e.name,initiatorType:e.initiatorType,durationMs:e.duration,transferSize:e.transferSize,encodedBodySize:e.encodedBodySize,decodedBodySize:e.decodedBodySize,responseStart:e.responseStart,responseEnd:e.responseEnd})),
  scriptLoads:performance.getEntriesByType("resource").filter(e=>/\.js(?:\?|$)/.test(e.name)).map(e=>({url:e.name,durationMs:e.duration,transferSize:e.transferSize,encodedBodySize:e.encodedBodySize,decodedBodySize:e.decodedBodySize})),
  jsHeap:performance.memory?{used:performance.memory.usedJSHeapSize,total:performance.memory.totalJSHeapSize,limit:performance.memory.jsHeapSizeLimit}:null}));
async function contextFor(tier,quiet=false){
  const low=tier==="low",context=await browser.newContext({viewport:low?{width:390,height:844}:{width:1440,height:900},deviceScaleFactor:low?3:2,isMobile:low,hasTouch:low,reducedMotion:quiet?"reduce":"no-preference"});
  const page=await context.newPage(),errors=[],requests=[];page.setDefaultTimeout(20000);
  page.on("pageerror",e=>errors.push(e.message));page.on("requestfailed",r=>requests.push({url:r.url(),error:r.failure()?.errorText}));
  await instrument(page);return {context,page,errors,requests};
}
async function boot(page){
  const wall=Date.now();
  await page.goto(url);await page.locator("#take-helm").waitFor();await page.locator("#voyage.is-ready").waitFor({timeout:45000});
  const sceneReadyMs=await page.evaluate(()=>performance.now());
  await page.waitForTimeout(1800);
  const startup=await page.evaluate(()=>({firstDrawSubmissionMs:window.__owV4Perf.firstDrawAt,longTasks:window.__owV4Perf.longTasks,settledBrowserMs:performance.now()}));
  report.boots.push({quality:(await readState(page)).quality,sceneReadyMs,wallMs:Date.now()-wall,...startup,...await resources(page)});
}
async function ensureMotion(page){
  const resume=page.locator("#exp-resume");
  if(await resume.isVisible()&&/Resume/.test(await resume.textContent()))await resume.click();
}
async function travel(page,id){
  const started=await page.evaluate(()=>performance.now());
  const initial=await readState(page);
  if(initial.mode==="surface"&&await page.locator("#take-helm").isVisible())await page.locator("#take-helm").click();
  const chart=page.getByTestId("voyage-chart");
  if(await chart.getAttribute("aria-expanded")!=="true")await chart.click();
  await page.getByTestId(`region-${id}`).click();
  await page.waitForFunction(region=>{const s=document.querySelector("#voyage")?.dataset;return s?.mode==="reef"&&s.region===region;},id,{timeout:30000});
  const skip=page.getByRole("button",{name:/Skip transition/});if(await skip.isVisible())await skip.click();
  await page.waitForTimeout(350);await ensureMotion(page);
  const transition=await page.evaluate(start=>({elapsedMs:performance.now()-start,longTasks:window.__owV4Perf.longTasks.filter(t=>t.at>=start)}),started);
  report.transitions.push({from:initial.mode==="reef"?initial.region:"surface",to:id,quality:(await readState(page)).quality,...transition});
}
async function measure(page,name,tier,mode){
  await page.waitForTimeout(2000);const initial=await readState(page);
  await page.evaluate(()=>{const q=window.__owV4Perf;q.frames=[];q.start=performance.now();q.enabled=true;});
  const wall=Date.now();let elapsed=0;const qualitySamples=[];
  while(elapsed<duration){
    await page.waitForTimeout(Math.min(1000,duration-elapsed));
    elapsed=await page.evaluate(()=>performance.now()-window.__owV4Perf.start);
    qualitySamples.push((await readState(page)).quality);
  }
  const captured=await page.evaluate(()=>{const q=window.__owV4Perf;q.enabled=false;return {duration:performance.now()-q.start,frames:q.frames,tasks:q.longTasks.filter(t=>t.at>=q.start),resources:q.resources,renderer:q.renderer};});
  const intervals=captured.frames.slice(1).map((f,i)=>f.stamp-captured.frames[i].stamp).filter(n=>n>0);
  const maxima={draws:Math.max(0,...captured.frames.map(f=>f.draws)),triangles:Math.max(0,...captured.frames.map(f=>f.triangles))};
  const limits={draws:tier==="low"?80:130,triangles:tier==="low"?180000:mode==="surface"?400000:350000,p95FrameMs:tier==="low"?33.3:16.7};
  const item={name,tier,mode,initialState:initial,finalState:await readState(page),browserSampleMs:round(captured.duration),wallSampleMs:Date.now()-wall,sustainedDuration:captured.duration>=120000,frames:captured.frames.length,
    fps:round(captured.frames.length*1000/captured.duration),frameMs:{p50:round(percentile(intervals,.5)),p95:round(percentile(intervals,.95)),p99:round(percentile(intervals,.99)),max:round(Math.max(0,...intervals))},
    drawCalls:{p50:percentile(captured.frames.map(f=>f.draws),.5),max:maxima.draws},triangles:{p50:percentile(captured.frames.map(f=>f.triangles),.5),max:maxima.triangles},
    longTasks:{count:captured.tasks.length,maxMs:round(Math.max(0,...captured.tasks.map(t=>t.duration))),totalMs:round(captured.tasks.reduce((n,t)=>n+t.duration,0))},resources:captured.resources,renderer:captured.renderer,limits,
    results:{realFrames:captured.frames.length>20,drawBudget:maxima.draws<=limits.draws,triangleBudget:maxima.triangles<=limits.triangles,requestedQuality:initial.quality===tier&&qualitySamples.every(q=>q===tier),frameTarget:percentile(intervals,.95)!==null&&round(percentile(intervals,.95))<=limits.p95FrameMs}};
  report.measurements.push(item);for(const [key,pass]of Object.entries(item.results))if(!pass)report.findings.push({view:name,criterion:key,value:key==="frameTarget"?item.frameMs:key==="drawBudget"?item.drawCalls:key==="triangleBudget"?item.triangles:key==="requestedQuality"?{initial:initial.quality,samples:[...new Set(qualitySamples)]}:item.frames});
  console.log(`${name}: ${item.fps}fps; p95 ${item.frameMs.p95}ms; ${maxima.draws}draws/${maxima.triangles}triangles`);
  const screenshot=path.join(output,`performance-${name}.png`);await page.screenshot({path:screenshot});report.screenshots.push(screenshot);await flush();
  assert.ok(item.results.realFrames,`${name} did not produce an active render sample`);
  return item;
}
async function check(name,work){
  const started=Date.now();try{const detail=await work();report.checks.push({name,status:"pass",wallMs:Date.now()-started,...detail});console.log(`PASS ${name}`);}catch(error){report.checks.push({name,status:"fail",wallMs:Date.now()-started,error:error.stack});console.error(`FAIL ${name}: ${error.message}`);}await flush();
}

try{
  if(process.env.QA_ACTORS==="1")for(const tier of ["low","high"])await check(`${tier} controlled companion diagnostic`,async()=>{
    const {context,page,errors,requests}=await contextFor(tier);
    try{
      await boot(page);
      for(const [actor,id] of [["nemo","crown"],["dory","lantern"]]){
        await travel(page,id);
        const fish=page.getByTestId("voyage-fish");if(await fish.getAttribute("aria-expanded")!=="true")await fish.click();
        await page.getByTestId(`swim-${actor}`).click();
        await page.waitForFunction(name=>document.querySelector("#voyage")?.dataset.actor===name,actor);
        const close=page.getByRole("button",{name:"Close expedition panel",exact:true});if(await close.isVisible())await close.click();
        await ensureMotion(page);
        const measured=await measure(page,`${tier}-${actor}-${id}`,tier,"reef");
        assert.equal(measured.initialState.actor,actor);assert.equal(measured.finalState.actor,actor);
      }
      assert.deepEqual(errors,[]);return {resources:await resources(page),requests,evidence:"15-second controlled-character diagnostic; not sustained and not gameplay timing."};
    }finally{await context.close();}
  });
  if(process.env.QA_ACTORS!=="1")for(const tier of (process.env.QA_TIER?[process.env.QA_TIER]:["low","high"]))await check(`${tier} five-view rendering and repeated region disposal`,async()=>{
    const {context,page,errors,requests}=await contextFor(tier);
    try{
      await boot(page);await measure(page,`${tier}-surface`,tier,"surface");
      for(const id of regions){await travel(page,id);await measure(page,`${tier}-${id}`,tier,"reef");}
      const cycles=[];
      for(let cycle=0;cycle<3;cycle++){
        const views=[];
        for(const id of regions){await travel(page,id);await page.waitForTimeout(1000);views.push({region:id,...await resources(page)});}
        cycles.push({cycle:cycle+1,views});
      }
      // Compare the same final region after warm caches, never unlike habitats.
      const a=cycles[1].views.at(-1).resources,b=cycles[2].views.at(-1).resources;
      const growth=Object.fromEntries(Object.keys(a).map(kind=>[kind,b[kind].live-a[kind].live]));
      const plateau=Object.values(growth).every(n=>n<=0);
      report.cycles.push({tier,cycles,liveHandleGrowthLastCycle:growth,plateau,evidence:"Live GL handles after full region cycles; not a byte-level VRAM or GC heap measurement."});
      assert.ok(plateau,`GL handles continue growing: ${JSON.stringify(growth)}`);
      await page.getByTestId("voyage-return").click();await page.waitForFunction(()=>document.querySelector("#voyage")?.dataset.mode==="surface");
      const afterReturn=await resources(page);
      const uniqueModels=[...new Map(afterReturn.modelLoads.map(item=>[item.url,item])).values()];
      const modelBytes={uniqueModelCount:uniqueModels.length,transferBytes:afterReturn.modelLoads.reduce((sum,item)=>sum+item.transferSize,0),uniqueEncodedBodyBytes:uniqueModels.reduce((sum,item)=>sum+item.encodedBodySize,0),uniqueDecodedBodyBytes:uniqueModels.reduce((sum,item)=>sum+item.decodedBodySize,0),evidence:"Resource Timing bytes for requested GLB/GLTF resources. Procedural models are part of the JavaScript module payload, listed separately. Cache transfer size can be zero; this is not decompressed geometry or VRAM."};
      assert.deepEqual(errors,[]);return {afterReturn,modelBytes,requests};
    }finally{await context.close();}
  });
  if(process.env.QA_FAILURES==="1"){
    await check("delayed first habitat load cannot resurrect a canceled dive",async()=>{
      const {context,page,errors}=await contextFor("low",true);
      let unblock;const barrier=new Promise(resolve=>{unblock=resolve;});let intercepted=false;
      try{
        await page.route(/\/RegionEnvironment[^/]*\.(?:js|ts)(?:\?|$)/,async route=>{intercepted=true;await barrier;await route.continue().catch(()=>{});});
        await boot(page);await page.locator("#take-helm").click();await page.getByTestId("voyage-chart").click();await page.getByTestId("region-crown").click();
        await page.waitForFunction(()=>document.querySelector("#voyage")?.dataset.mode==="entering");
        await page.getByRole("button",{name:/^Cancel dive$/}).click();
        assert.equal((await readState(page)).mode,"surface");unblock();await page.waitForTimeout(2200);
        assert.equal((await readState(page)).mode,"surface");assert.ok(intercepted,"The region chunk must actually be delayed");assert.deepEqual(errors,[]);
        return {state:await readState(page),resources:await resources(page)};
      }finally{unblock();await context.close();}
    });
    await check("blocked model loads retain reef travel and portfolio links",async()=>{
      const {context,page,errors,requests}=await contextFor("low",true);
      try{
        await page.route(/\.(?:glb|gltf)(?:\?|$)/,route=>route.abort("failed"));await boot(page);await travel(page,"crown");
        await page.locator(".exp-nav").getByRole("button",{name:/^Work/}).click();
        assert.equal(new Set(await page.locator('dialog[open] a[href*="/case-studies/"]').evaluateAll(a=>a.map(n=>n.getAttribute("href")))).size,5);
        assert.deepEqual(errors,[]);return {expectedNetworkFailures:requests};
      }finally{await context.close();}
    });
  }
}finally{
  await browser.close();report.completed=true;await flush();console.log(`Report: ${reportFile}`);
}
if(report.checks.some(c=>c.status==="fail")||report.measurements.some(m=>!m.results.drawBudget||!m.results.triangleBudget||!m.results.requestedQuality))process.exitCode=1;
