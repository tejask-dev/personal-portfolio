import assert from "node:assert/strict";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";

// Bundle only in memory so the CPU geometry audit neither requires a browser
// nor rewrites the project's tracked deployment output.
const result=await build({stdin:{contents:`
  export {createRegionEnvironment} from './client/src/features/open-water/scene/RegionEnvironment.ts';
  export {createEnvironment} from './client/src/features/open-water/scene/materials.ts';
  export {regionIds,getRegionSolids,getRegion} from './client/src/features/open-water/data/regions.ts';
  export {Matrix4,Vector3} from 'three';
`,resolveDir:fileURLToPath(new URL("../",import.meta.url)),loader:"ts"},bundle:true,platform:"node",format:"esm",write:false,logLevel:"silent"});
const api=await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].contents).toString("base64")}`);
process.on("uncaughtException",error=>{console.error(error.message);process.exit(1);});
const rows=[];
for(const id of api.regionIds)for(const quality of ["low","high"]){
  const habitat=api.createRegionEnvironment(api.createEnvironment(),id,quality);
  let triangles=0,draws=0;
  const geometries=new Map(),materials=new Map(),instances=new Map();
  habitat.group.traverse(object=>{
    if(!object.isMesh)return;
    draws++;
    const geometry=object.geometry,position=geometry.getAttribute("position");
    assert.ok(position.count>0,`${id}/${quality}/${object.name} empty mesh`);
    for(let i=0;i<position.array.length;i++)assert.ok(Number.isFinite(position.array[i]),`${id}/${quality} nonfinite geometry`);
    if(object.name.startsWith("canonical-cave-")){
      const cells=api.getRegion(id).chambers;
      for(let v=0;v<position.count;v++){
        const p=[position.getX(v),position.getY(v),position.getZ(v)];
        assert.ok(!cells.some(c=>p.every((n,a)=>n>c.min[a]+.001&&n<c.max[a]-.001)),`${id}/${quality} shell relief intrudes into a navigable chamber ${p}`);
      }
    }
    const copies=object.isInstancedMesh?object.count:1;
    triangles+=(geometry.index?.count??position.count)/3*copies;
    if(object.isInstancedMesh){
      assert.ok(object.boundingBox&&object.boundingSphere,`${id} instance bounds`);
      for(const n of object.instanceMatrix.array)assert.ok(Number.isFinite(n));
      if(object.name.startsWith("instanced-")){
        const gardens=api.getRegionSolids(id).filter(s=>s.id.startsWith("garden-"));
        const matrix=new api.Matrix4(),vertex=new api.Vector3();
        for(let instance=0;instance<object.count;instance++){
          object.getMatrixAt(instance,matrix);
          const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
          for(let v=0;v<position.count;v++){
            vertex.fromBufferAttribute(position,v).applyMatrix4(matrix);
            for(let a=0;a<3;a++){min[a]=Math.min(min[a],vertex.getComponent(a));max[a]=Math.max(max[a],vertex.getComponent(a));}
          }
          assert.ok(gardens.some(s=>min.every((n,a)=>n>=s.min[a]-.001)&&max.every((n,a)=>n<=s.max[a]+.001)),`${id}/${quality}/${object.name}/${instance} exceeds collision garden: ${JSON.stringify({min,max})}`);
        }
      }
      instances.set(object,0);object.addEventListener("dispose",()=>instances.set(object,instances.get(object)+1));
    }
    if(!geometries.has(geometry)){geometries.set(geometry,0);geometry.addEventListener("dispose",()=>geometries.set(geometry,geometries.get(geometry)+1));}
    for(const material of Array.isArray(object.material)?object.material:[object.material])if(!materials.has(material)){
      materials.set(material,0);material.addEventListener("dispose",()=>materials.set(material,materials.get(material)+1));
      if(object.name==="cathedral-daylight-shafts"){
        assert.equal(material.transparent,true);assert.equal(material.depthWrite,false);assert.equal(material.forceSinglePass,true);
      }else assert.equal(material.transparent,false,"Only the single daylight batch may use transparency");
    }
  });
  assert.ok(triangles<= (quality==="low"?65000:140000),`${id}/${quality} geometry ${triangles}`);
  assert.ok(draws<=(id==="cathedral"?12:10),`${id}/${quality} draws ${draws}`);
  if(id==="cathedral"||id==="lantern"){
    assert.ok(habitat.group.getObjectByName("canonical-cave-walls-and-roof"));
    assert.ok(habitat.group.getObjectByName("canonical-cave-floor"));
  }
  if(id==="cathedral"){
    assert.ok(habitat.group.getObjectByName("cathedral-daylight-apertures"));
    const shafts=habitat.group.getObjectByName("cathedral-daylight-shafts");
    assert.ok(shafts);assert.equal(shafts.material.depthWrite,false);assert.equal(shafts.material.transparent,true);
  }
  habitat.setFocus({x:0,y:-8,z:2});habitat.setVisibilityAssist(true);habitat.tick(1/60,3,false);habitat.tick(0,3,true);
  habitat.dispose();habitat.dispose();
  assert.equal(habitat.group.children.length,0);
  assert.ok([...geometries.values(),...materials.values(),...instances.values()].every(count=>count===1),`${id}/${quality} once-only resource disposal`);
  rows.push({region:id,quality,draws,triangles});
}
console.log(JSON.stringify({passed:true,views:rows},null,2));
