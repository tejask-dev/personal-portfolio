/** V4 authored habitat authority. Geometry, movement and chart positions share
 * these fictional scene units; no dimensions are presented as marine data. */
export type RegionId = "crown" | "driftwall" | "cathedral" | "lantern";
export type ActorKind = "diver" | "fish";
export type RegionNavigation = { regionId: RegionId; actor?: ActorKind };
export type RegionPose = { x: number; y: number; z: number; heading: number };
export type RegionBox = { id: string; min: [number, number, number]; max: [number, number, number] };
export type Garden = { x: number; z: number; radius: number; height: number; seed: number };
export type RegionLandmark = RegionPose & { id: string; name: string; description: string };
export type RegionDefinition = {
  id: RegionId;
  name: string;
  subtitle: string;
  description: string;
  worldOrigin: { x: number; z: number };
  surfaceEntrance: { x: number; z: number };
  bounds: { x: number; z: number };
  spawn: RegionPose;
  cave: boolean;
  palette: { water: string; floor: string; rock: string; accent: string; coral: readonly string[] };
  /** The union of these open chambers is the navigable cave, including roofs. */
  chambers: readonly RegionBox[];
  solids: readonly RegionBox[];
  gardens: readonly Garden[];
  landmarks: readonly RegionLandmark[];
  currentPath: readonly RegionPose[];
};

const pose = (x: number, y: number, z: number, heading = 0): RegionPose => ({ x, y, z, heading });
const box = (id: string, min: RegionBox["min"], max: RegionBox["max"]): RegionBox => ({ id, min, max });
const gardens = (points: readonly [number, number, number, number][]): Garden[] =>
  points.map(([x, z, radius, height], seed) => ({ x, z, radius, height, seed }));

export const regionDefinitions: Record<RegionId, RegionDefinition> = {
  crown: {
    id: "crown", name: "Crown Reef", subtitle: "A sunlit garden, just below the surface",
    description: "Wide coral terraces, an open sand channel and a limestone arch. Meet the reef at your own pace.",
    worldOrigin: { x: -65, z: -15 }, surfaceEntrance: { x: -20, z: 12 },
    bounds: { x: 62, z: 43 }, spawn: pose(24, -6, 16, -.3), cave: false,
    palette: { water: "#218fa1", floor: "#d5c69e", rock: "#a69b83", accent: "#ffb071", coral: ["#ec8359", "#d06582", "#e4ac59", "#977bbb", "#c36c49", "#b6cc83"] },
    chambers: [],
    solids: [
      box("crown-arch-west", [-9, -14, -12], [-5, -3.5, -5]),
      box("crown-arch-east", [5, -14, -12], [9, -3.5, -5]),
      box("crown-arch-roof", [-9, -4.8, -12], [9, -2.8, -5]),
      box("crown-lookout", [-40, -14, 13], [-34, -4.2, 21]),
      box("cleaner-ledge", [10.5, -4.4, -9.5], [13, -4.05, -6.5]),
      box("cleaner-support", [12.65, -14, -9.5], [13, -4.1, -6.5]),
      box("camouflage-ledge", [-18, -14, 6.5], [-16.5, -4.2, 9]),
    ],
    gardens: gardens([[-43,-19,5,2.3],[-27,-27,5,2.6],[-11,-29,4,1.7],[14,-28,5,2.1],[33,-22,5,2.4],[46,-8,4,1.6],[40,12,4,1.8],[24,25,5,2.2],[5,30,5,2],[-17,28,5,2.4],[-38,8,4,1.8],[-48,-4,4,2.3],[-23,-6,4,1.7],[20,3,5,2.5]]),
    landmarks: [
      { ...pose(24,-6,16,-.3), id:"arrival", name:"The sunlit shallows", description:"Your yacht waits above. Follow the open sand toward the arch." },
      { ...pose(0,-7.5,-17), id:"arch", name:"Crown Arch", description:"A real opening through the limestone. Swim beneath it or circle around." },
      { ...pose(24,-6,16,-2.4), id:"garden", name:"The coral gardens", description:"Branching colonies frame an open corridor through the reef." },
      { ...pose(-38,-3.0,17,1.7), id:"lookout", name:"Dakota's lookout", description:"An elevated still view over the garden and its sandy channels." },
    ],
    currentPath: [pose(-43,-3,20),pose(-22,-3,15),pose(0,-3,18),pose(24,-3,17),pose(42,-3,24)],
  },
  driftwall: {
    id:"driftwall", name:"Driftwall", subtitle:"An outer reef with room to wander",
    description:"Fan corals follow a broad reef wall into deeper blue water. Ride the current or trace the terraces yourself.",
    worldOrigin:{ x:185,z:165 }, surfaceEntrance:{ x:166,z:192 }, bounds:{ x:68,z:46 },
    spawn:pose(-43,-5,27,0.4), cave:false,
    palette:{water:"#176e8e",floor:"#b3b598",rock:"#6f8e8a",accent:"#f2bc94",coral:["#a569b5","#de8b8d","#d8b575","#6a9e9f","#cd725c"]},
    chambers:[],
    solids:[box("driftwall-spire",[-8,-25,-24],[-2,-4,-16]),box("driftwall-shelf",[21,-25,7],[31,-12,15])],
    gardens:gardens([[-50,-20,5,2.8],[-33,-30,5,3],[-16,-29,4,2.4],[4,-30,5,3.4],[27,-29,5,2.5],[47,-22,5,3.3],[51,0,5,2.6],[42,25,5,3.2],[18,29,5,3.3],[-7,27,5,2.2],[-28,18,4,2.3],[-48,1,5,2.4],[15,-10,4,2.3],[32,-4,4,2.5]]),
    landmarks:[
      {...pose(-43,-5,27,0.4),id:"arrival",name:"The outer mooring",description:"A broad, shallow terrace gives way to deeper blue water."},
      {...pose(0,-9,5,1.57),id:"wall",name:"The fan-coral wall",description:"Move independently along and above the wall. Depth is part of the route."},
      {...pose(38,-16,-10,2.8),id:"blue",name:"The blue edge",description:"A quiet view of the outer reef; the marked boundary keeps the route readable."},
    ],
    currentPath:[pose(-44,-4,25),pose(-25,-4,8),pose(-10,-6,4),pose(9,-12,5),pose(30,-14,22)],
  },
  cathedral: {
    id:"cathedral",name:"Blue Cathedral",subtitle:"Limestone chambers beneath the island",
    description:"A connected cave with high chambers, low passages and a small fish-only shortcut. The chart and yacht return are always available.",
    worldOrigin:{x:-200,z:-150},surfaceEntrance:{x:-170,z:-126},bounds:{x:52,z:39},
    spawn:pose(0,-7,29,0),cave:true,
    palette:{water:"#18536d",floor:"#8faaa8",rock:"#819799",accent:"#9ad8d5",coral:["#8faaa8","#718f9d","#9ba8b1","#b0a493"]},
    chambers:[
      box("entry",[-10,-14,18],[10,-2.8,36]),
      box("nave",[-13,-16,-14],[13,-3,24]),
      box("west-passage",[-35,-15,-9],[-9,-5,5]),
      box("west-chamber",[-48,-17,-18],[-29,-3.5,15]),
      box("east-passage",[9,-15,-11],[34,-4,0]),
      box("apse",[28,-17,-20],[46,-2.8,16]),
      box("fish-shortcut",[11,-8.72,9],[31,-7.92,11]),
    ],
    solids:[box("nave-pillar",[-3,-16,-6],[2,-7,-2]),box("west-pillar",[-41,-17,-3],[-37,-5,1])],
    gardens:gardens([[-7,27,1.6,.8],[7,10,1.8,1.2],[-8,-8,1.5,.9],[-43,8,1.5,1.2],[38,-14,1.8,1.3]]),
    landmarks:[
      {...pose(0,-7,29,0),id:"arrival",name:"The blue entrance",description:"Daylight defines the way back. Enter the central chamber along the open passage."},
      {...pose(4,-8,3,-.3),id:"nave",name:"The cathedral nave",description:"Swim beside the limestone pillar and look up at the high stone roof."},
      {...pose(-34,-9,7,-1.6),id:"west",name:"The west chamber",description:"An open side chamber with layered limestone and quiet blue light."},
      {...pose(10,-8.32,10,1.57),id:"shortcut",name:"The little fish passage",description:"Fish fit through this low opening. Divers can reach the same chamber by the broad eastern passage."},
      {...pose(37,-8,6,0),id:"apse",name:"The lantern threshold",description:"A sheltered chamber holds the marked passage toward Lantern Grotto."},
    ],
    currentPath:[],
  },
  lantern: {
    id:"lantern",name:"Lantern Grotto",subtitle:"A quiet chamber of living light",
    description:"An imagined luminous grotto, with responsive light colonies and enclosed passages. Its glow is stylized, not a claim about a real ecosystem.",
    worldOrigin:{x:-225,z:120},surfaceEntrance:{x:-200,z:142},bounds:{x:48,z:43},
    spawn:pose(0,-8,32,0),cave:true,
    palette:{water:"#132e4c",floor:"#53677b",rock:"#3c506d",accent:"#83f2db",coral:["#7cdfd3","#9b9be3","#6cb6df","#cea1d8"]},
    chambers:[
      box("entry",[-9,-15,17],[9,-4,39]),
      box("heart",[-26,-19,-18],[26,-3.5,23]),
      box("west-neck",[-37,-16,-8],[-21,-5,6]),
      box("west-pool",[-45,-18,-16],[-31,-6,18]),
      box("east-neck",[21,-16,-5],[39,-5,9]),
      box("east-pool",[32,-18,-16],[46,-5,19]),
      box("north-room",[-14,-17,-37],[15,-5,-12]),
    ],
    solids:[box("lantern-column",[-5,-19,-8],[1,-6,-2]),box("lantern-shelf",[12,-19,9],[18,-11,15])],
    gardens:gardens([[-16,-11,3,1.5],[15,-12,3,2.1],[-16,13,3,1.7],[15,1,2.7,1.6],[-38,10,2,1.6],[38,-9,2,1.4],[-7,-28,2,1.8],[7,-29,2,1.5]]),
    landmarks:[
      {...pose(0,-8,32,0),id:"arrival",name:"The last blue light",description:"The entrance stays marked; return to your yacht at any time."},
      {...pose(7,-10,4,-.7),id:"heart",name:"The lantern garden",description:"Luminous colonies gather around the stone column. A still view keeps every detail available."},
      {...pose(-37,-10,7,-1.6),id:"pool",name:"The quiet pool",description:"A sheltered side pool, framed by a complete roof and limestone walls."},
      {...pose(0,-10,-27,0),id:"north",name:"The little observatory",description:"A deep-blue alcove where the grotto's light gathers overhead."},
    ],
    currentPath:[],
  },
};

export type RegionPortal = { id:string; from:RegionId; to:RegionId; position:RegionPose; arrival:RegionPose; label:string; radius:number };
export const regionPortals: readonly RegionPortal[] = [
  {id:"crown-driftwall",from:"crown",to:"driftwall",position:pose(48,-4,17),arrival:pose(-43,-5,27,.4),label:"Cross to Driftwall",radius:5},
  {id:"driftwall-crown",from:"driftwall",to:"crown",position:pose(-45,-5,27),arrival:pose(42,-3,24,-1.57),label:"Return to Crown Reef",radius:5},
  {id:"crown-cathedral",from:"crown",to:"cathedral",position:pose(-45,-4,-12),arrival:pose(0,-7,29,0),label:"Enter Blue Cathedral",radius:5},
  {id:"cathedral-crown",from:"cathedral",to:"crown",position:pose(0,-7,31),arrival:pose(-44,-4,-12,1.57),label:"Return to sunlit water",radius:4},
  {id:"cathedral-lantern",from:"cathedral",to:"lantern",position:pose(38,-8,7),arrival:pose(0,-8,32,0),label:"Travel to Lantern Grotto",radius:4},
  {id:"lantern-cathedral",from:"lantern",to:"cathedral",position:pose(0,-8,33),arrival:pose(37,-8,6,Math.PI),label:"Return to Blue Cathedral",radius:4},
];

export const regionIds = Object.keys(regionDefinitions) as RegionId[];
export const getRegion = (id:RegionId) => regionDefinitions[id];
export const portalsFrom = (id:RegionId) => regionPortals.filter(p=>p.from===id);
export const toRegionWorld = <T extends {x:number;z:number}>(p:T,id:RegionId):T => ({...p,x:p.x+getRegion(id).worldOrigin.x,z:p.z+getRegion(id).worldOrigin.z});
export const toRegionLocal = <T extends {x:number;z:number}>(p:T,id:RegionId):T => ({...p,x:p.x-getRegion(id).worldOrigin.x,z:p.z-getRegion(id).worldOrigin.z});

const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
export function sampleRegionFloor(id:RegionId,x:number,z:number):number {
  const r=getRegion(id);
  if(r.cave){
    const cells=r.chambers.filter(c=>x>=c.min[0]&&x<=c.max[0]&&z>=c.min[2]&&z<=c.max[2]);
    return cells.length?Math.min(...cells.map(c=>c.min[1])):-18;
  }
  if(id==="driftwall")return -7.2-11.5*(.5+.5*Math.tanh((x-2)/13))-.8*Math.sin(z*.075);
  const basin=4.5*Math.exp(-((x/42)**2+(z/32)**2));
  return -5.4-basin-.35*Math.sin(x*.09)*Math.cos(z*.11);
}

/** Garden footprints also participate in collisions; tall decoration cannot be
 * a render-only obstacle. Colonies fit strictly inside these proxy volumes. */
export function regionSolids(id:RegionId):readonly RegionBox[] {
  const r=getRegion(id);
  return [...r.solids,...r.gardens.map((g,i)=>box(`garden-${i}`,
    [g.x-g.radius,sampleRegionFloor(id,g.x,g.z)-1,g.z-g.radius],
    [g.x+g.radius,sampleRegionFloor(id,g.x,g.z)+g.height,g.z+g.radius]))];
}
const solidCache=new Map<RegionId,readonly RegionBox[]>();
export function getRegionSolids(id:RegionId) {
  if(!solidCache.has(id))solidCache.set(id,regionSolids(id));
  return solidCache.get(id)!;
}
export function regionClearance(actor:ActorKind="diver",camera=false) {
  return camera?{horizontal:.12,vertical:.16}:actor==="fish"?{horizontal:.45,vertical:.3}:{horizontal:.45,vertical:1};
}
type Interval=[number,number];
function union(intervals:Interval[]):Interval[]{
  const result:Interval[]=[];
  for(const p of intervals.sort((a,b)=>a[0]-b[0])){
    const last=result.at(-1);
    if(last&&p[0]<=last[1])last[1]=Math.max(last[1],p[1]);else result.push([...p]);
  }
  return result;
}
function subtract(intervals:Interval[],a:number,b:number):Interval[]{
  return intervals.flatMap(([lo,hi])=>b<=lo||a>=hi?[[lo,hi] as Interval]:[...(a>lo?[[lo,a] as Interval]:[]),...(b<hi?[[b,hi] as Interval]:[])]);
}
/** Legal center Y intervals. Chambers and solids use the same authority as the mesh. */
export function regionYIntervals(id:RegionId,x:number,z:number,actor:ActorKind="diver",camera=false):Interval[]{
  const r=getRegion(id),m=regionClearance(actor,camera);
  let intervals:Interval[];
  if(r.cave){
    intervals=union(r.chambers.filter(c=>x>=c.min[0]+m.horizontal&&x<=c.max[0]-m.horizontal&&z>=c.min[2]+m.horizontal&&z<=c.max[2]-m.horizontal&&c.max[1]-c.min[1]>=2*m.vertical)
      .map(c=>[c.min[1]+m.vertical,c.max[1]-m.vertical]));
  }else{
    if(Math.hypot(x/r.bounds.x,z/r.bounds.z)>1.000001)return [];
    const low=sampleRegionFloor(id,x,z)+m.vertical+.08,high=-(camera?.4:actor==="fish"?.35:1);
    intervals=low<=high?[[low,high]]:[];
  }
  for(const s of getRegionSolids(id))if(x>=s.min[0]-m.horizontal&&x<=s.max[0]+m.horizontal&&z>=s.min[2]-m.horizontal&&z<=s.max[2]+m.horizontal)
    intervals=subtract(intervals,s.min[1]-m.vertical,s.max[1]+m.vertical);
  return intervals.filter(([lo,hi])=>hi-lo>1e-6);
}
export function isRegionPoseSafe(p:RegionPose,context:RegionNavigation,camera=false):boolean{
  return [p.x,p.y,p.z,p.heading].every(Number.isFinite)&&regionYIntervals(context.regionId,p.x,p.z,context.actor,camera).some(([a,b])=>p.y>=a-1e-7&&p.y<=b+1e-7);
}
/** Exact line coverage by the union of clearance-eroded cave chambers. This
 * catches even a sub-sample stone gap, including roofs and narrow passages. */
export function isCaveSegmentContained(from:RegionPose,to:RegionPose,context:RegionNavigation,camera=false):boolean{
  const r=getRegion(context.regionId);
  if(!r.cave)return true;
  const m=regionClearance(context.actor,camera),spans:Interval[]=[];
  for(const cell of r.chambers){
    let entry=0,exit=1;
    for(let axis=0;axis<3;axis++){
      const margin=axis===1?m.vertical:m.horizontal,
        low=cell.min[axis]+margin,high=cell.max[axis]-margin;
      const key=(["x","y","z"] as const)[axis],delta=to[key]-from[key];
      if(low>high){entry=2;break;}
      if(Math.abs(delta)<1e-12){if(from[key]<low-1e-8||from[key]>high+1e-8){entry=2;break;}}
      else{const a=(low-from[key])/delta,b=(high-from[key])/delta;entry=Math.max(entry,Math.min(a,b));exit=Math.min(exit,Math.max(a,b));}
    }
    if(entry<=exit&&exit>=0&&entry<=1)spans.push([Math.max(0,entry),Math.min(1,exit)]);
  }
  const covered=union(spans);
  return covered.length===1&&covered[0][0]<=1e-8&&covered[0][1]>=1-1e-8;
}
export function constrainRegionXZ<T extends {x:number;z:number}>(p:T,id:RegionId):T{
  const r=getRegion(id);
  if(r.cave)return {...p,x:clamp(p.x,-r.bounds.x,r.bounds.x),z:clamp(p.z,-r.bounds.z,r.bounds.z)};
  const ratio=Math.hypot(p.x/r.bounds.x,p.z/r.bounds.z);
  return ratio>1?{...p,x:p.x/ratio,z:p.z/ratio}:{...p};
}
export function safeRegionRestore(saved:RegionPose|null|undefined,context:RegionNavigation):{pose:RegionPose;recovered:boolean}{
  if(saved&&isRegionPoseSafe(saved,context))return {pose:{...saved},recovered:false};
  return {pose:{...getRegion(context.regionId).spawn},recovered:true};
}
