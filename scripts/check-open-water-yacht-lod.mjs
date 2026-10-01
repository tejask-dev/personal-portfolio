// Compare source/LOD through the real static yacht pipeline, without changing that loader.
import {createServer} from 'vite';
import {chromium} from 'playwright';
import fs from 'node:fs';
const out='/tmp/open-water-v3-wildlife';fs.mkdirSync(out,{recursive:true});
const server=await createServer({server:{host:'127.0.0.1',port:8797,strictPort:true},mode:'test'});await server.listen();
const browser=await chromium.launch({headless:true,channel:'chrome'});
try{
 const page=await browser.newPage({viewport:{width:1200,height:800}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.route('**/yacht-inspection',route=>route.fulfill({contentType:'text/html',body:'<html><head><link rel="icon" href="data:,"></head><body style="margin:0"></body></html>'}));await page.goto('http://127.0.0.1:8797/yacht-inspection');
 const result=await page.evaluate(async()=>{
  const text=await(await fetch('/src/features/open-water/scene/YachtAsset.ts')).text(),url=text.match(/from ["']([^"']*three\.js[^"']*)["']/)[1];const T=await import(url);
  const{loadYachtAsset,disposeYachtAsset}=await import('/src/features/open-water/scene/YachtAsset.ts');const{createEnvironment}=await import('/src/features/open-water/scene/materials.ts');const env=createEnvironment();
  const high=await loadYachtAsset(env),originalFetch=window.fetch;window.fetch=(url,init)=>originalFetch(String(url).endsWith('open-water/yacht.glb')?'/assets/open-water-v3/yacht-low.glb':url,init);const low=await loadYachtAsset(env);window.fetch=originalFetch;
  const scene=new T.Scene();scene.background=new T.Color('#d6e4df');scene.add(high,low);const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(1200,800);document.body.appendChild(renderer.domElement);const camera=new T.PerspectiveCamera(42,.75,.1,500);
  const bounds=h=>{const b=new T.Box3().setFromObject(h);return{min:b.min.toArray(),max:b.max.toArray()}};
  const count=h=>{let n=0;h.traverse(o=>{if(o.isMesh)n+=(o.geometry.index?.count??o.geometry.getAttribute('position').count)/3});return n};
  window.drawYacht=view=>{if(view==='side')camera.position.set(35,6,0);else if(view==='front')camera.position.set(16,15,-31);else if(view==='small')camera.position.set(80,62,-133);else camera.position.set(-22,22,32);camera.lookAt(0,2,0);renderer.setScissorTest(true);for(let i=0;i<2;i++){high.visible=i===0;low.visible=i===1;renderer.setViewport(i*600,0,600,800);renderer.setScissor(i*600,0,600,800);renderer.render(scene,camera)}};
  window.cleanYacht=()=>{disposeYachtAsset(high);disposeYachtAsset(low);renderer.dispose()};
  return{highTriangles:count(high),lowTriangles:count(low),highBounds:bounds(high),lowBounds:bounds(low),highBatches:high.children.length,lowBatches:low.children.length};
 });
 for(const view of ['side','front','rear','small']){await page.evaluate(v=>window.drawYacht(v),view);await page.screenshot({path:`${out}/yacht-lod-${view}.png`})}
 await page.evaluate(()=>window.cleanYacht());console.log(JSON.stringify({errors,...result,output:out},null,2));if(errors.length||result.lowTriangles>60000||result.lowTriangles<40000)process.exitCode=1;
}finally{await browser.close();await server.close()}
