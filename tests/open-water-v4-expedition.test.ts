import assert from "node:assert/strict";
import test from "node:test";
import { createBoat } from "../client/src/features/open-water/systems/boatController.ts";
import { expeditionReducer as reduce, initialExpedition, returnedBoat, type Expedition } from "../client/src/features/open-water/systems/expeditionController.ts";

const ready=(state:Expedition)=>reduce(state,{type:"REEF_READY",id:state.transitionId});
const underwater=()=>ready(reduce(initialExpedition(),{type:"REGION",region:"crown",boat:createBoat("superyacht"),racing:false}));

test("a multi-region voyage preserves the original vessel and exact independent anchor snapshot",()=>{
  const boat={...createBoat("superyacht"),x:32,z:52,heading:.721,speed:6};
  let state=reduce(initialExpedition(),{type:"REGION",region:"crown",boat,racing:false});
  const snapshot=structuredClone(state.returnBoat);
  assert.ok(snapshot);
  state=ready(state);
  boat.x=95;boat.z=180;
  for(const region of ["driftwall","cathedral","lantern"] as const){
    state=ready(reduce(state,{type:"REGION",region,boat:createBoat("tender"),racing:false}));
    assert.equal(state.region,region);assert.deepEqual(state.returnBoat,snapshot);
  }
  const restored=returnedBoat(state.returnBoat);
  assert.equal(restored.recovered,false);assert.equal(restored.boat.vesselId,"superyacht");
  assert.equal(restored.boat.x,snapshot.x);assert.equal(restored.boat.z,snapshot.z);assert.equal(restored.boat.heading,snapshot.heading);
  assert.equal(restored.boat.speed,0);assert.equal(restored.boat.turn,0);
});

test("canceling underwater travel restores the source region and retains anchor and actor",()=>{
  let source=reduce(underwater(),{type:"ACTOR",actor:"dory"});
  source=ready(reduce(source,{type:"REGION",region:"cathedral",boat:createBoat(),racing:false}));
  const traveling=reduce(source,{type:"REGION",region:"lantern",boat:createBoat(),racing:false});
  assert.equal(traveling.mode,"entering");assert.equal(traveling.previousRegion,"cathedral");
  const canceled=reduce(traveling,{type:"CANCEL_DIVE"});
  assert.equal(canceled.mode,"reef");assert.equal(canceled.region,"cathedral");assert.equal(canceled.actor,"dory");
  assert.deepEqual(canceled.returnBoat,source.returnBoat);assert.equal(canceled.userPaused,true);
  assert.equal(reduce(canceled,{type:"REEF_READY",id:traveling.transitionId}),canceled);
});

test("canceling first entry restores surface and stale readiness cannot complete a newer transition",()=>{
  const entering=reduce(initialExpedition(),{type:"REGION",region:"driftwall",boat:createBoat(),racing:false});
  const canceled=reduce(entering,{type:"CANCEL_DIVE"});
  assert.equal(canceled.mode,"surface");assert.equal(canceled.returnBoat,null);
  const next=reduce(canceled,{type:"REGION",region:"lantern",boat:createBoat(),racing:false});
  assert.equal(reduce(next,{type:"REEF_READY",id:entering.transitionId}),next);
  assert.equal(ready(next).region,"lantern");
  assert.equal(reduce(next,{type:"REGION",region:"cathedral",boat:createBoat(),racing:false}),next,"An entering transition cannot replace its own pending target");
});

test("actor selection only changes an active reef and pauses safely",()=>{
  const surface=initialExpedition();assert.equal(reduce(surface,{type:"ACTOR",actor:"nemo"}),surface);
  const entering=reduce(surface,{type:"DIVE",boat:createBoat(),racing:false});assert.equal(reduce(entering,{type:"ACTOR",actor:"dory"}),entering);
  const reef=ready(entering),nemo=reduce(reef,{type:"ACTOR",actor:"nemo"});
  assert.equal(nemo.actor,"nemo");assert.equal(nemo.userPaused,true);assert.equal(nemo.activity,"none");
  assert.deepEqual(nemo.returnBoat,reef.returnBoat);
});

test("race and game ownership prevent an implicit dive or region switch",()=>{
  const surface=initialExpedition();
  for(const action of [
    {type:"DIVE" as const,boat:createBoat(),racing:true},
    {type:"REGION" as const,region:"lantern" as const,boat:createBoat(),racing:true},
  ]){const result=reduce(surface,action);assert.equal(result.mode,"surface");assert.equal(result.returnBoat,null);assert.equal(result.userPaused,true);}
  for(const activity of ["fishing","docking","fish-course"] as const){
    const playing:Expedition={...(activity==="fish-course"?underwater():surface),actor:activity==="fish-course"?"nemo":"diver",activity,sailing:true};
    const before=structuredClone(playing);
    for(const action of [
      {type:"DIVE" as const,boat:createBoat(),racing:false},
      {type:"REGION" as const,region:"cathedral" as const,boat:createBoat(),racing:false},
    ]){
      const result=reduce(playing,action);assert.equal(result.mode,before.mode);assert.equal(result.region,before.region);assert.equal(result.activity,activity);assert.equal(result.userPaused,true);assert.equal(result.transitionId,before.transitionId);
    }
  }
});

test("opening and closing reading or pausing preserves every current game's ownership",()=>{
  for(const activity of ["fishing","docking","fish-course"] as const){
    const playing:Expedition={...(activity==="fish-course"?underwater():initialExpedition()),activity,sailing:true,userPaused:false};
    const paused=reduce(playing,{type:"PAUSE",value:true});assert.equal(paused.activity,activity);
    const resumed=reduce(paused,{type:"PAUSE",value:false});assert.equal(resumed.activity,activity);assert.equal(resumed.userPaused,false);
    const reading=reduce(playing,{type:"PANEL",panel:"work"});assert.equal(reading.activity,activity);assert.equal(reading.userPaused,true);
    const closed=reduce(reading,{type:"PANEL",panel:null});assert.equal(closed.activity,activity);assert.equal(closed.userPaused,true);
    assert.equal(closed.transitionId,playing.transitionId);assert.deepEqual(closed.returnBoat,playing.returnBoat);
  }
});

test("challenges cannot replace each other or run in an incompatible mode",()=>{
  const surface=initialExpedition(),reef=underwater();
  for(const [state,activity] of [[surface,"fish-course"],[reef,"fishing"],[reef,"docking"],[reef,"fish-course"]] as const){
    const result=reduce(state,{type:"ACTIVITY",activity,racing:false});
    assert.equal(result.activity,"none",`${activity} cannot own this mode/actor`);
  }
  const fishing=reduce(surface,{type:"ACTIVITY",activity:"fishing"});
  assert.equal(fishing.activity,"fishing");
  const docking=reduce(fishing,{type:"ACTIVITY",activity:"docking"});assert.equal(docking.activity,"fishing");assert.equal(docking.userPaused,true);
  const fish=reduce(reef,{type:"ACTOR",actor:"nemo"});
  const course=reduce(fish,{type:"ACTIVITY",activity:"fish-course"});assert.equal(course.activity,"fish-course");
  const swap=reduce(course,{type:"ACTOR",actor:"dory"});assert.equal(swap.actor,"nemo");assert.equal(swap.activity,"fish-course");assert.equal(swap.userPaused,true);
});

test("Quiet and free-sail actions cannot silently discard a challenge",()=>{
  for(const activity of ["fishing","docking","fish-course"] as const){
    const state:Expedition={...(activity==="fish-course"?underwater():initialExpedition()),activity,sailing:true};
    const quiet=reduce(state,{type:"QUIET",value:true});
    assert.equal(quiet.activity,activity);assert.equal(quiet.quiet,true);assert.equal(quiet.userPaused,true);
    const motion=reduce(quiet,{type:"QUIET",value:false});assert.equal(motion.activity,activity);assert.equal(motion.userPaused,true);
    const sail=reduce(state,{type:"SAIL"});assert.equal(sail.activity,activity);assert.equal(sail.userPaused,true);
  }
  const transition=reduce(initialExpedition(),{type:"DIVE",boat:createBoat(),racing:false});
  assert.equal(reduce(transition,{type:"SAIL"}),transition);
  assert.equal(reduce(transition,{type:"ACTIVITY",activity:"lighthouse"}),transition);
});
