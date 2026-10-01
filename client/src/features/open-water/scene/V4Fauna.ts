import { Color, ConeGeometry, Group, InstancedBufferAttribute, InstancedMesh, MeshStandardMaterial, Object3D, SphereGeometry } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { getRegion, isRegionPoseSafe, type RegionId, type RegionPose } from '../data/regions';
import { safeReefSegment } from '../systems/reefController';
import { applySeaMedium, type SeaEnvironment } from './materials';
import { applyFishSwimming } from './FishSwimming';

/** Small background residents share one instanced draw and the scene clock.
 * Their prevalidated local loops cannot cross cave walls or the visible floor. */
export function createV4Fauna(environment: SeaEnvironment, quality:'low'|'high') {
  const body = new SphereGeometry(1, 8, 5); body.scale(.055,.09,.18);
  const tail = new ConeGeometry(.1,.12,3); tail.rotateX(Math.PI/2); tail.translate(0,0,.19);
  const rawBody=body.toNonIndexed(), rawTail=tail.toNonIndexed();
  const geometry = mergeGeometries([rawBody,rawTail],false)!;
  rawBody.dispose();rawTail.dispose();
  body.dispose();tail.dispose();
  const clock = { value: 0 };
  const material = applyFishSwimming(applySeaMedium(new MeshStandardMaterial({color:'#bddfd7',roughness:.42,metalness:.12}),environment),clock,{headZ:-.18,length:.43,phaseAttribute:'aSwimPhase',amplitude:.14,frequency:2.1});
  const count=quality==='low'?48:96,mesh=new InstancedMesh(geometry,material,count),group=new Group();
  geometry.setAttribute('aSwimPhase',new InstancedBufferAttribute(Float32Array.from({length:count},(_,i)=>i*2.399963),1));
  group.name='regional-fish-schools';group.add(mesh);
  mesh.frustumCulled=false;
  const transform=new Object3D();
  let regionId:RegionId|null=null,loops:RegionPose[][]=[], disposed=false;
  function configure(id:RegionId) {
    regionId=id;loops=[];
    const region=getRegion(id),nav={regionId:id,actor:'fish' as const};
    const centers=[region.spawn,...region.landmarks];
    for(const center of centers) {
      for(const radius of [3.5,2,1,.5]) {
        const loop=Array.from({length:12},(_,i)=>({x:center.x+Math.cos(i*Math.PI/6)*radius,y:center.y+.1,z:center.z+Math.sin(i*Math.PI/6)*radius,heading:0}));
        if(loop.every((p,i)=>isRegionPoseSafe(p,nav)&&safeReefSegment(p,loop[(i+1)%12],false,nav))) { loops.push(loop);break; }
      }
    }
    group.position.set(region.worldOrigin.x,0,region.worldOrigin.z);
    mesh.count=loops.length?count:0;
    for(let i=0;i<count;i++)mesh.setColorAt(i,new Color(id==='lantern'?['#7acdd1','#bed7a7'][i%2]:['#4a839c','#e6bc60','#84c6bd','#cedfde'][i%4]));
    if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
    material.emissive.set(id==='lantern'?'#468888':'#000000');material.emissiveIntensity=id==='lantern'?.3:0;
  }
  return {group,update(id:RegionId,time:number,quiet:boolean) {
    if(disposed)return;if(regionId!==id)configure(id);
    clock.value=quiet?0:time;
    for(let i=0;i<mesh.count;i++) {
      const path=loops[i%loops.length],phase=((quiet?0:time*.14)+i*.63)%path.length,a=path[Math.floor(phase)],b=path[(Math.floor(phase)+1)%path.length],t=phase%1;
      transform.position.set(a.x+(b.x-a.x)*t,a.y,a.z+(b.z-a.z)*t);
      const c=path[(Math.floor(phase)+2)%path.length];
      const heading=Math.atan2(b.x-a.x,-(b.z-a.z)),nextHeading=Math.atan2(c.x-b.x,-(c.z-b.z));
      const u=Math.min(1,Math.max(0,(t-.65)/.35)),blend=u*u*(3-2*u);
      transform.rotation.set(0,-(heading+Math.atan2(Math.sin(nextHeading-heading),Math.cos(nextHeading-heading))*blend),0);
      transform.scale.setScalar(.75+(i%5)*.09);transform.updateMatrix();mesh.setMatrixAt(i,transform.matrix);
    }
    mesh.instanceMatrix.needsUpdate=true;
  },dispose(){if(disposed)return;disposed=true;geometry.dispose();material.dispose();mesh.dispose();group.clear();}};
}
