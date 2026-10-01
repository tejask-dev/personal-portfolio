import { destinations, islands, LIGHTHOUSE } from "./world";
import { REEF_CENTER, sampleReefDepth } from "./reefTerrain";

export type SeaChannel = { id: string; points: readonly (readonly [number, number])[]; halfWidth: number; depth: number; feather: number };
/** Visible sand lanes, not additional walls or compulsory navigation tracks. */
export const seaChannels: readonly SeaChannel[] = [
  { id: "north-channel", points: [[0,35],[-30,-15],[-50,-65],[-50,-115],[10,-155],[65,-175],[112,-182]], halfWidth:12,depth:8,feather:6 },
  { id: "signal-spur", points:[[-50,-65],[-19,-43]],halfWidth:9,depth:6,feather:4 },
  { id: "east-channel",points:[[0,35],[55,15],[105,-5],[170,-7]],halfWidth:14,depth:9,feather:6 },
  { id: "anchorage-channel",points:[[0,35],[-65,45],[-120,47]],halfWidth:11,depth:7,feather:5 },
];
const coastlines = [...destinations,...islands,LIGHTHOUSE];
const clamp = (n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const smooth = (n:number)=>{n=clamp(n,0,1);return n*n*(3-2*n);};
function segmentDistance(x:number,z:number,a:readonly[number,number],b:readonly[number,number]){
  const dx=b[0]-a[0],dz=b[1]-a[1];
  const t=clamp(((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz),0,1);
  return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz);
}
/** One world floor authority; all decorative height detail stays in the material.
 * The reef's full rectangular terrain patch is exact; its outside rim blends
 * to the regional seabed. The hard swimming boundary remains the inner ellipse. */
export function sampleSeaFloor(x:number,z:number):number {
  let depth=17+17*smooth((Math.hypot(x*.85,z)-70)/390);
  for(const coast of coastlines) {
    const edge=Math.max(0,Math.hypot(x-coast.x,z-coast.z)-coast.r*.89);
    depth=Math.min(depth,1.35+19*smooth(edge/(coast.r*1.8)));
  }
  for(const channel of seaChannels) {
    let distance=Infinity;
    for(let i=1;i<channel.points.length;i++) distance=Math.min(distance,segmentDistance(x,z,channel.points[i-1],channel.points[i]));
    const influence=1-smooth((distance-channel.halfWidth)/channel.feather);
    // Carve a readable sandy shelf without flattening the island shoreline.
    depth=Math.min(depth,depth*(1-influence)+channel.depth*influence);
  }
  const rx=x-REEF_CENTER.x,rz=z-REEF_CENTER.z;
  const outside=Math.hypot(Math.max(0,Math.abs(rx)-24),Math.max(0,Math.abs(rz)-18));
  const reefBlend=1-smooth(outside/14);
  depth=depth*(1-reefBlend)+sampleReefDepth(rx,rz)*reefBlend;
  return -depth;
}
