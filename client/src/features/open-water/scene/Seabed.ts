import { BufferGeometry, Float32BufferAttribute, Group, Mesh } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { REEF_CENTER, reefTerrainDefinition } from "../data/reefTerrain";
import { sampleSeaFloor } from "../data/bathymetry";
import { architectureMaterial, type SeaEnvironment } from "./materials";
export type EnvironmentQuality = "low" | "high";

/** For each bilinear cell, triangular interpolation error is bounded by
 * abs(d00-d10-d01+d11)/(4*nx*nz). Refine shared X/Z interval subdivisions until
 * every cell is below0.04, keeping the canonical0.05 collision reserve in Low. */
function adaptiveReefAxes():[number[],number[]] {
  const {xCoordinates:xs,zCoordinates:zs,depthRows:rows}=reefTerrainDefinition.floor;
  const nx=xs.slice(1).map((x,i)=>Math.ceil((x-xs[i])/3));
  const nz=zs.slice(1).map((z,i)=>Math.ceil((z-zs[i])/3));
  for(let j=0;j<nz.length;j++)for(let i=0;i<nx.length;i++){
    const cross=Math.abs(rows[j][i]-rows[j][i+1]-rows[j+1][i]+rows[j+1][i+1]);
    while(cross/(4*nx[i]*nz[j])>.04){
      if((xs[i+1]-xs[i])/nx[i]>(zs[j+1]-zs[j])/nz[j])nx[i]++;else nz[j]++;
    }
  }
  const expand=(axis:readonly number[],counts:number[])=>{
    const result=[axis[0]];counts.forEach((n,i)=>{for(let k=1;k<=n;k++)result.push(axis[i]+(axis[i+1]-axis[i])*k/n);});return result;
  };
  return [expand(xs,nx),expand(zs,nz)];
}

function subdivide(axis:readonly number[],maxStep:number){
  const result:number[]=[axis[0]];
  for(let i=1;i<axis.length;i++){
    const n=Math.ceil((axis[i]-axis[i-1])/maxStep);
    for(let j=1;j<=n;j++)result.push(axis[i-1]+(axis[i]-axis[i-1])*j/n);
  }
  return result;
}
/** An actual opaque floor, including the detailed reef. One contiguous mesh;
 * surrounding rings share its boundary vertices and cannot z-fight with it. */
function createSeabedGeometry(quality:EnvironmentQuality):BufferGeometry {
  const { floor }=reefTerrainDefinition;
  const axis=(a:number,b:number,step:number)=>Array.from({length:Math.ceil((b-a)/step)+1},(_,i)=>a+(b-a)*i/Math.ceil((b-a)/step));
  const unique=(values:number[])=>[...new Set(values.map(v=>Math.round(v*1e7)/1e7))].sort((a,b)=>a-b);
  const coarse=unique([...axis(-700,-400,50),...axis(-400,-250,15),...axis(-250,250,quality==="low"?8:6),...axis(250,400,15),...axis(400,700,50)]);
  const xmin=REEF_CENTER.x-24,xmax=REEF_CENTER.x+24,zmin=REEF_CENTER.z-18,zmax=REEF_CENTER.z+18;
  const cx=unique([...coarse,xmin,xmax]),cz=unique([...coarse,zmin,zmax]);
  const refined=quality==="low"?adaptiveReefAxes():[subdivide(floor.xCoordinates,.45),subdivide(floor.zCoordinates,.45)];
  const xs=unique([...refined[0].map(x=>x+REEF_CENTER.x),...cx.filter(x=>x>xmin&&x<xmax)]);
  const zs=unique([...refined[1].map(z=>z+REEF_CENTER.z),...cz.filter(z=>z>zmin&&z<zmax)]);
  const vertices:number[]=[],indices:number[]=[],registry=new Map<string,number>();
  const push=(x:number,z:number)=>{const key=`${x.toFixed(7)}/${z.toFixed(7)}`;const existing=registry.get(key);if(existing!==undefined)return existing;
    const i=vertices.length/3;vertices.push(x,sampleSeaFloor(x,z),z);registry.set(key,i);return i;};
  const core=zs.map(z=>xs.map(x=>push(x,z)));
  for(let j=0;j<zs.length-1;j++)for(let i=0;i<xs.length-1;i++){
    const a=core[j][i],b=core[j][i+1],c=core[j+1][i],d=core[j+1][i+1];indices.push(a,c,b,b,c,d);
  }
  // Uniformly resolved harbor cells replace the old stretched annuli: channel
  // bends and coastal shelves no longer appear as enormous triangular wedges.
  // At the reef boundary fan cells share every refined perimeter vertex.
  for(let j=0;j<cz.length-1;j++)for(let i=0;i<cx.length-1;i++){
    const x0=cx[i],x1=cx[i+1],z0=cz[j],z1=cz[j+1];
    if(x0>=xmin&&x1<=xmax&&z0>=zmin&&z1<=zmax)continue;
    const perimeter:number[]=[];
    const horizontal=(z:number,from:number,to:number)=>{
      const values=(z===zmin||z===zmax)?xs.filter(x=>x>Math.min(from,to)&&x<Math.max(from,to)):[];
      if(from>to)values.reverse();perimeter.push(push(from,z),...values.map(x=>push(x,z)));
    };
    const vertical=(x:number,from:number,to:number)=>{
      const values=(x===xmin||x===xmax)?zs.filter(z=>z>Math.min(from,to)&&z<Math.max(from,to)):[];
      if(from>to)values.reverse();perimeter.push(push(x,from),...values.map(z=>push(x,z)));
    };
    horizontal(z0,x0,x1);vertical(x1,z0,z1);horizontal(z1,x1,x0);vertical(x0,z1,z0);
    if(perimeter.length===4)indices.push(perimeter[0],perimeter[3],perimeter[1],perimeter[1],perimeter[3],perimeter[2]);
    else {const center=push((x0+x1)/2,(z0+z1)/2);for(let k=0;k<perimeter.length;k++)indices.push(center,perimeter[(k+1)%perimeter.length],perimeter[k]);}
  }
  const geometry=new BufferGeometry();
  geometry.setAttribute("position",new Float32BufferAttribute(vertices,3));geometry.setIndex(indices);
  geometry.computeVertexNormals();geometry.computeBoundingSphere();
  return geometry;
}

/** Both index ranges share one disposable geometry allocation. Changing quality
 * does not recreate the scene, reset navigation or strand a WebGL index buffer. */
export function createSeabed(environment:SeaEnvironment,quality:EnvironmentQuality="high"):Group {
  const high=createSeabedGeometry("high"),low=createSeabedGeometry("low");
  const highCount=high.index!.count,lowCount=low.index!.count;
  const geometry=mergeGeometries([high,low])!;high.dispose();low.dispose();
  const material=architectureMaterial("#d9ceaa",environment,.02,0,5);
  const mesh=new Mesh(geometry,material);mesh.name="continuous-sand-bathymetry";
  const group=new Group();group.name="open-water-seabed";group.add(mesh);
  group.userData.setQuality=(next:EnvironmentQuality)=>{
    geometry.setDrawRange(next==="low"?highCount:0,next==="low"?lowCount:highCount);
    group.userData.terrainTriangles=(next==="low"?lowCount:highCount)/3;
  };
  group.userData.setQuality(quality);
  return group;
}
