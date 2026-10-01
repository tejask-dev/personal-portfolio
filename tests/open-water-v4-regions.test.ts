import assert from "node:assert/strict";
import test from "node:test";
import { getRegion, isRegionPoseSafe, regionIds, regionPortals, safeRegionRestore, toRegionLocal, toRegionWorld, type RegionId, type RegionNavigation } from "../client/src/features/open-water/data/regions.ts";
import { createReef, moveReef, reefCamera, resolveReefPose, safeReefSegment, stepReef } from "../client/src/features/open-water/systems/reefController.ts";
import { createRegionLifecycle } from "../client/src/features/open-water/systems/regionLifecycle.ts";
import { FISH_COURSE_GATES, FISH_COURSE_START } from "../client/src/features/open-water/systems/gameController.ts";
const at=(x:number,y:number,z:number,heading=0)=>({x,y,z,heading});

test("all four habitats have safe actor spawns, landmarks, portal exits and invertible coordinates",()=>{
  for(const regionId of regionIds)for(const actor of ["diver","fish"] as const){
    const context={regionId,actor},r=getRegion(regionId);
    assert.ok(isRegionPoseSafe(createReef(context),context),`${regionId}/${actor} spawn`);
    for(const landmark of r.landmarks)assert.ok(isRegionPoseSafe(landmark,context),`${regionId}/${actor}/${landmark.id}`);
    assert.deepEqual(toRegionLocal(toRegionWorld(r.spawn,regionId),regionId),r.spawn);
    for(const portal of regionPortals.filter(p=>p.from===regionId)){
      assert.ok(isRegionPoseSafe(portal.position,context),portal.id);
      assert.ok(isRegionPoseSafe(portal.arrival,{regionId:portal.to,actor}),`${portal.id} arrival`);
    }
  }
});

test("portal graph is reciprocal and all habitats can reach the sunlit reef",()=>{
  for(const portal of regionPortals)assert.ok(regionPortals.some(p=>p.from===portal.to&&p.to===portal.from));
  for(const start of regionIds){
    const seen=new Set<RegionId>(),queue:RegionId[]=[start];
    while(queue.length){const id=queue.shift()!;if(seen.has(id))continue;seen.add(id);queue.push(...regionPortals.filter(p=>p.from===id).map(p=>p.to));}
    assert.equal(seen.size,4);
  }
});

test("the cathedral shortcut fits a fish and rejects a diver without tunneling through its roof",()=>{
  const start=at(12,-8.32,10),end=at(30,-8.32,10);
  assert.equal(safeReefSegment(start,end,false,{regionId:"cathedral",actor:"fish"}),true);
  assert.equal(safeReefSegment(start,end,false,{regionId:"cathedral",actor:"diver"}),false);
  const fish={...createReef({regionId:"cathedral",actor:"fish"}),...start};
  assert.equal(moveReef(fish,end,{regionId:"cathedral",actor:"fish"}),true);
  const camera=reefCamera(at(22,-8.32,10,Math.PI/2),0,1,{regionId:"cathedral",actor:"fish"});
  assert.ok(isRegionPoseSafe(camera,{regionId:"cathedral",actor:"fish"},true));
  assert.equal(safeReefSegment(at(22,-8.32,10),at(22,-6,10),false,{regionId:"cathedral",actor:"fish"}),false);
});

test("cave travel follows connected chambers and cannot cross rock between rooms",()=>{
  const context:RegionNavigation={regionId:"cathedral",actor:"diver"};
  assert.equal(safeReefSegment(at(5,-8,25),at(5,-8,0),false,context),true);
  assert.equal(safeReefSegment(at(10,-8,-5),at(35,-8,-5),false,context),true);
  assert.equal(safeReefSegment(at(5,-8,20),at(35,-8,12),false,context),false);
  assert.equal(safeReefSegment(at(0,-8,15),at(0,-1,15),false,context),false);
});

test("both caves have complete navigable routes from entry to their side chambers and exit",()=>{
  const routes={
    cathedral:[
      [at(0,-7,29),at(5,-8,10),at(5,-8,-5),at(37,-8,-5),at(37,-8,6)],
      [at(0,-7,29),at(-6,-8,14),at(-6,-8,0),at(-33,-9,0),at(-34,-9,7)],
    ],
    lantern:[
      [at(0,-8,32),at(7,-10,17),at(7,-10,4),at(7,-10,-13),at(0,-10,-27)],
      [at(0,-8,32),at(7,-10,17),at(7,-10,4),at(-15,-10,8),at(-24,-10,2),at(-37,-10,2),at(-37,-10,7)],
    ],
  };
  for(const [id,paths] of Object.entries(routes))for(const path of paths)for(let i=1;i<path.length;i++)
    assert.ok(safeReefSegment(path[i-1],path[i],false,{regionId:id as RegionId,actor:"diver"}),`${id} route ${i}`);
});

test("pose restoration accepts exact safe coordinates and recovers invalid state honestly",()=>{
  for(const regionId of regionIds){
    const ctx={regionId,actor:"diver" as const},spawn=createReef(ctx);
    const saved={x:spawn.x,y:spawn.y,z:spawn.z,heading:1.234567};
    assert.deepEqual(safeRegionRestore(saved,ctx),{pose:saved,recovered:false});
    for(const bad of [null,at(NaN,0,0),at(999,-5,999)]){
      const result=safeRegionRestore(bad,ctx);assert.equal(result.recovered,true);assert.ok(isRegionPoseSafe(result.pose,ctx));
    }
    const invalid=resolveReefPose(at(NaN,0,0),undefined,ctx);
    assert.ok(isRegionPoseSafe(invalid.pose,ctx));
  }
});

test("movement and chase cameras remain safe throughout deterministic free exploration",()=>{
  for(const regionId of regionIds)for(const actor of ["diver","fish"] as const){
    const ctx={regionId,actor},state=createReef(ctx);
    for(let i=0;i<1000;i++){
      stepReef(state,{forward:true,right:i%137<53,left:i%181<29,rise:i%91<15,descend:i%113<19},1/30,ctx);
      assert.ok(isRegionPoseSafe(state,ctx),`${regionId}/${actor}/${i}`);
      const camera=reefCamera(state,.3,1,ctx);
      assert.ok(isRegionPoseSafe(camera,ctx,true),`${regionId}/${actor} camera ${i}`);
    }
  }
});

test("invalid or suspended frame deltas cannot poison regional actor coordinates",()=>{
  for(const regionId of regionIds){
    const context={regionId,actor:"fish" as const},state=createReef(context),before=structuredClone(state);
    for(const dt of [NaN,Infinity,-Infinity,0,-1])stepReef(state,{forward:true,right:true},dt,context);
    assert.deepEqual(state,before);
    stepReef(state,{forward:true},3600,context);
    assert.ok(isRegionPoseSafe(state,context));
    assert.ok(Math.hypot(state.x-before.x,state.y-before.y,state.z-before.z)<.4);
  }
});

test("both authored reef currents complete their entire route without hitting hidden scenery",()=>{
  for(const regionId of ["crown","driftwall"] as const){
    const context={regionId,actor:"diver" as const},path=getRegion(regionId).currentPath;
    const state={...createReef(context),...path[0],current:true,currentNode:1};
    for(let i=0;i<7000&&state.current;i++)stepReef(state,{},1/60,context);
    assert.equal(state.current,false,`${regionId} current did not finish`);
    assert.ok(state.currentNode>=path.length,`${regionId} current struck scenery at ${JSON.stringify(state)}`);
    assert.ok(isRegionPoseSafe(state,context));
  }
});

test("the entire Shoal Run route has genuine fish clearance through Crown Reef",()=>{
  const ctx={regionId:"crown" as const,actor:"fish" as const};
  const route=[FISH_COURSE_START,...FISH_COURSE_GATES.map(g=>({...g,heading:0}))];
  for(let i=0;i<route.length;i++){
    assert.ok(isRegionPoseSafe(route[i],ctx),`Shoal gate ${i} overlaps terrain`);
    if(i)assert.ok(safeReefSegment(route[i-1],route[i],false,ctx),`Shoal segment ${i} intersects terrain`);
  }
});

test("region preparation leaves active habitat intact; commit disposes once, cancel rejects late completion",async()=>{
  type Resource={id:RegionId;disposed:number;dispose():void};
  const created:Resource[]=[],pending=new Map<RegionId,(r:Resource)=>void>();
  const lifecycle=createRegionLifecycle<Resource>((id)=>new Promise(resolve=>pending.set(id,resolve)));
  const finish=(id:RegionId)=>{const r={id,disposed:0,dispose(){this.disposed++;}};created.push(r);pending.get(id)!(r);return r;};
  const a=lifecycle.prepare("crown");const crown=finish("crown");const first=await a;assert.ok(first);lifecycle.commit(first);
  const b=lifecycle.prepare("cathedral");assert.equal(lifecycle.current?.resource,crown);assert.equal(crown.disposed,0);
  lifecycle.cancel();const canceled=finish("cathedral");assert.equal(await b,null);assert.equal(canceled.disposed,1);assert.equal(crown.disposed,0);
  const c=lifecycle.prepare("lantern");const lantern=finish("lantern");const third=await c;assert.ok(third);assert.equal(crown.disposed,0);
  assert.equal(lifecycle.commit(third),lantern);assert.equal(crown.disposed,1);assert.equal(lifecycle.commit(first),null);
  lifecycle.dispose();lifecycle.dispose();assert.ok(created.every(r=>r.disposed===1));
});

test("load failures preserve current region and disposal rejects unfinished preparation",async()=>{
  let rejectNext=false,release:(()=>void)|null=null,disposed=0;
  const lifecycle=createRegionLifecycle(async(id)=>{
    if(rejectNext)throw new Error("asset unavailable");
    if(id==="lantern")await new Promise<void>(resolve=>{release=resolve;});
    return {dispose(){disposed++;}};
  });
  const first=await lifecycle.prepare("crown");assert.ok(first);lifecycle.commit(first);
  rejectNext=true;await assert.rejects(lifecycle.prepare("cathedral"),/unavailable/);assert.equal(lifecycle.current?.regionId,"crown");assert.equal(disposed,0);
  rejectNext=false;const pending=lifecycle.prepare("lantern");lifecycle.dispose();(release as unknown as ()=>void)();assert.equal(await pending,null);assert.equal(disposed,2);
});

test("quality reload prepares a replacement of the same region and releases the old variant at commit",async()=>{
  let generation=0;
  const loader=createRegionLifecycle(async()=>({generation:generation++,disposed:0,dispose(){this.disposed++;}}));
  const first=await loader.prepare("crown");assert.ok(first);loader.commit(first);
  const reused=await loader.prepare("crown");assert.ok(reused);assert.equal(reused.resource,first.resource);loader.commit(reused);
  const low=await loader.prepare("crown",{reload:true});assert.ok(low);assert.notEqual(low.resource,first.resource);assert.equal(first.resource.disposed,0);
  loader.commit(low);assert.equal(first.resource.disposed,1);loader.dispose();assert.equal(low.resource.disposed,1);
});
