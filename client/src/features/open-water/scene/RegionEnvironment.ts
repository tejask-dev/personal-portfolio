import {
  BoxGeometry, BufferGeometry, Color, CylinderGeometry, DoubleSide,
  Float32BufferAttribute, Group, IcosahedronGeometry, InstancedMesh, Matrix4,
  Mesh, MeshStandardMaterial, Object3D, SphereGeometry, Vector3, CircleGeometry, Raycaster, ShaderMaterial, Material, FrontSide, AdditiveBlending,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { getRegion, portalsFrom, sampleRegionFloor, type RegionBox, type RegionId, type RegionPose } from "../data/regions";
import { applySeaMedium, type SeaEnvironment } from "./materials";

export type RegionEnvironment = {
  group: Group;
  tick(delta:number,time:number,quiet:boolean):void;
  setVisibilityAssist(enabled:boolean):void;
  setFocus(point:Pick<RegionPose,"x"|"y"|"z">|null):void;
  dispose():void;
};
const noise=(a:number,b:number=0)=>.5+.5*Math.sin(a*12.9898+b*78.233);
const cathedralLightWells=[{x:-5,z:25,dx:3,dz:3,radius:1.6},{x:6,z:13,dx:2,dz:3,radius:1.85},{x:-6,z:-2,dx:3,dz:3,radius:1.45}] as const;

/** Deterministic CPU construction. No WebGL upload, renderer, RAF or timers are
 * owned here. Mount only after regionLifecycle.commit has released old detail. */
export function createRegionEnvironment(environment:SeaEnvironment,id:RegionId,quality:"low"|"high"="high"):RegionEnvironment {
  const region=getRegion(id),low=quality==="low",group=new Group();
  group.name=`region-${id}`;
  group.userData={regionId:id,coordinateSpace:"region-local",quality};
  const geometries=new Set<BufferGeometry>(),materials=new Set<Material>();
  const instances:InstancedMesh[]=[];
  let disposed=false,assist=false,focus:Pick<RegionPose,"x"|"y"|"z">|null=null;
  const own=<T extends BufferGeometry>(g:T):T=>{geometries.add(g);return g;};
  const material=(color:string,emission=0,finish:HabitatFinish="coral")=>{
    const m=applySeaMedium(new MeshStandardMaterial({color,roughness:.87,metalness:.02,side:DoubleSide,emissive:color,emissiveIntensity:emission}),environment);
    applyHabitatFinish(m,environment,finish,region.cave,id==="lantern",id==="cathedral");
    m.name=`${id}-${finish}-${color}`;
    materials.add(m);
    return m;
  };
  const rock=material(region.palette.rock,region.cave?.04:0,"stone"),
    floorMaterial=material(region.palette.floor,region.cave?.035:0,"sand"),
    coralMaterial=material("#ffffff",0,"coral"),
    glowMaterial=material(region.palette.accent,id==="lantern"?1.7:.35,"glow"),
    grassMaterial=material(id==="lantern"?"#6a999a":"#477b62",id==="lantern"?.25:0,"grass");
  function mesh(g:BufferGeometry,m:Material,name:string){
    const object=new Mesh(own(g),m);object.name=name;group.add(object);return object;
  }

  if(region.cave) {
    const shell=createCaveShell(region.chambers,low);
    mesh(shell.floor,floorMaterial,"canonical-cave-floor");
    mesh(shell.stone,rock,"canonical-cave-walls-and-roof");
  } else mesh(createReefFloor(id,low),floorMaterial,"canonical-reef-floor");

  // Authored columns and arch blocks stay inside their collision boxes. Their
  // lower portions intersect the floor, so no ornamental support floats.
  const rocks:BufferGeometry[]=[];
  for(const solid of region.solids){
    const size=solid.max.map((n,i)=>n-solid.min[i]);
    const geometry=new BoxGeometry(size[0],size[1],size[2],low?4:7,low?8:13,low?4:7);
    const p=geometry.getAttribute("position");
    for(let i=0;i<p.count;i++){
      const nx=p.getX(i)/(size[0]/2),ny=p.getY(i)/(size[1]/2),nz=p.getZ(i)/(size[2]/2);
      // A rounded superellipsoid and shallow strata only remove stone from the
      // canonical solid. No ornament projects into the navigable channel.
      const rounding=Math.pow(Math.abs(nx)**5+Math.abs(ny)**5+Math.abs(nz)**5,1/5);
      const strata=.965+.028*Math.sin(ny*13+nx*.7+nz*.8+size[0]);
      p.setXYZ(i,nx/rounding*size[0]/2*strata,ny/rounding*size[1]/2,nz/rounding*size[2]/2*strata);
    }
    geometry.computeVertexNormals();
    geometry.translate(...solid.min.map((n,i)=>n+size[i]/2) as [number,number,number]);
    rocks.push(geometry);
  }
  if(rocks.length){
    const merged=mergeGeometries(rocks,false);
    rocks.forEach(g=>g.dispose());
    if(merged)mesh(merged,rock,"authored-stone-landmarks");
  }

  const transform=new Object3D(),colors=region.palette.coral.map(c=>new Color(c));
  const place=(geometry:BufferGeometry,m:MeshStandardMaterial,placements:Array<{x:number;y:number;z:number;sx:number;sy:number;sz:number;turn:number;color?:Color}>,name:string)=>{
    if(!placements.length){geometry.dispose();return null;}
    own(geometry);
    const inst=new InstancedMesh(geometry,m,placements.length);
    inst.name=name;
    placements.forEach((p,i)=>{
      transform.position.set(p.x,p.y,p.z);transform.scale.set(p.sx,p.sy,p.sz);transform.rotation.set(0,p.turn,0);transform.updateMatrix();
      inst.setMatrixAt(i,transform.matrix);if(p.color)inst.setColorAt(i,p.color);
    });
    inst.instanceMatrix.needsUpdate=true;
    if(inst.instanceColor)inst.instanceColor.needsUpdate=true;
    inst.computeBoundingBox();inst.computeBoundingSphere();group.add(inst);instances.push(inst);return inst;
  };
  type Placement=Parameters<typeof place>[2][number];
  const colonies:Placement[]=[],plates:Placement[]=[],fans:Placement[]=[],anemones:Placement[]=[],stones:Placement[]=[],grasses:Placement[]=[],lights:Placement[]=[];
  for(const garden of region.gardens){
    const count=low?18:23;
    const base=sampleRegionFloor(id,garden.x,garden.z),top=base+garden.height;
    for(let i=0;i<count;i++){
      const a=i*2.399963+garden.seed*.8,r=Math.sqrt((i+.4)/count)*garden.radius*.71;
      const x=garden.x+Math.cos(a)*r,z=garden.z+Math.sin(a)*r;
      const floor=sampleRegionFloor(id,x,z),available=top-floor;
      if(available<.2||floor<base-.8)continue;
      const edge=Math.min(garden.radius-Math.abs(x-garden.x),garden.radius-Math.abs(z-garden.z));
      const size=Math.min(edge*.90,.62+.53*noise(i+8,garden.seed));
      const family=(i+garden.seed)%4;
      const height=Math.min(available*.96,(.45+garden.height*(.28+.53*noise(i,garden.seed)))*(family===1?.75:1));
      const point={x,y:floor,z,sx:size,sy:height,sz:size,turn:a,color:colors[(i+garden.seed)%colors.length]};
      if(family===0)colonies.push(point);
      else if(family===1)plates.push({...point,sx:size*1.06,sz:size*1.06});
      else if(family===2)fans.push({...point,sx:size*1.08,sz:size*.78,sy:Math.min(available*.98,height*(id==="driftwall"?1.45:.9))});
      else anemones.push({...point,sy:Math.min(height,.75+garden.height*.22)});
      if(i%2===0)stones.push({x,y:floor+.03,z,sx:size*.78,sy:Math.min(.38,available*.3),sz:size*.7,turn:a});
      if(i%3===0)grasses.push({x:x+.12,y:floor,z:z+.12,sx:size*.55,sy:Math.min(.6,height),sz:size*.55,turn:a});
      if(id==="lantern")lights.push({...point,y:Math.min(top-.08,floor+height),sx:.07,sy:.09,sz:.07});
    }
  }
  place(createBranches(low),coralMaterial,colonies,"instanced-branching-colonies");
  place(createPlates(low),coralMaterial,plates,"instanced-table-corals");
  place(createFan(low),coralMaterial,fans,"instanced-fan-corals");
  place(createAnemone(low),coralMaterial,anemones,"instanced-anemone-gardens");
  const substrate=new IcosahedronGeometry(1,low?0:1);substrate.translate(0,.7,0);substrate.scale(1,.58,1);
  place(substrate,rock,stones,"instanced-garden-substrate");
  place(createGrass(),grassMaterial,grasses,"instanced-seagrass");

  // Opaque emissive organisms avoid stacked transparent glow planes. Cave roof
  // points attach to authored chamber ceilings, never an unsupported black void.
  if(region.cave){
    region.chambers.filter(c=>c.id!=="fish-shortcut").forEach((chamber,index)=>{
      const n=low?8:15;
      for(let i=0;i<n;i++){
        const x=chamber.min[0]+1+(chamber.max[0]-chamber.min[0]-2)*noise(i+3,index),
          z=chamber.min[2]+1+(chamber.max[2]-chamber.min[2]-2)*noise(i+19,index);
        // Skip an overlapped ceiling when a taller chamber continues above it.
        const top=Math.max(...region.chambers.filter(c=>x>=c.min[0]&&x<=c.max[0]&&z>=c.min[2]&&z<=c.max[2]).map(c=>c.max[1]));
        if(Math.abs(top-chamber.max[1])>.01)continue;
        lights.push({x,y:top-.11,z,sx:.08+.08*noise(i,index),sy:.08,sz:.08,turn:0});
      }
    });
  }
  const organisms=place(new SphereGeometry(1,low?6:8,low?4:6),glowMaterial,lights,"living-light-colonies");

  if(id==="cathedral"){
    const shell=group.getObjectByName("canonical-cave-walls-and-roof") as Mesh;
    shell.updateMatrixWorld(true);
    const ray=new Raycaster(),origin=new Vector3(),down=new Vector3(0,-1,0);
    const roofAt=(x:number,z:number)=>{
      ray.set(origin.set(x,2,z),down);
      return ray.intersectObject(shell,false)[0]?.point.y??-3;
    };
    const apertures:BufferGeometry[]=[],shafts:BufferGeometry[]=[];
    for(const well of cathedralLightWells){
      // Drape the small daylight opening over the actual carved ceiling, not
      // its simpler navigation proxy. It never floats below the rock.
      const aperture=new CircleGeometry(.47,low?12:20);aperture.rotateX(Math.PI/2);
      const ap=aperture.getAttribute("position");
      for(let i=0;i<ap.count;i++){const x=well.x+ap.getX(i),z=well.z+ap.getZ(i);ap.setXYZ(i,x,roofAt(x,z)-.025,z);}
      aperture.computeVertexNormals();apertures.push(aperture);
      const roof=roofAt(well.x,well.z)-.04,base=sampleRegionFloor(id,well.x+well.dx,well.z+well.dz)+.035;
      const shaft=new CylinderGeometry(.33,well.radius,1,low?10:16,1,true);
      const sp=shaft.getAttribute("position");
      for(let i=0;i<sp.count;i++){
        const t=sp.getY(i)+.5;
        sp.setXYZ(i,sp.getX(i)+well.x+well.dx*(1-t),base+(roof-base)*t,sp.getZ(i)+well.z+well.dz*(1-t));
      }
      shaft.computeVertexNormals();shafts.push(shaft);
    }
    const apertureMaterial=material("#fff2c8",1.2,"glow");
    const apertureMesh=mergeGeometries(apertures,false);apertures.forEach(g=>g.dispose());
    if(apertureMesh)mesh(apertureMesh,apertureMaterial,"cathedral-daylight-apertures");
    const shaftMaterial=new ShaderMaterial({side:FrontSide,transparent:true,depthWrite:false,blending:AdditiveBlending,forceSinglePass:true,
      uniforms:{uTime:environment.uTime},
      vertexShader:`varying vec2 vLightUv;varying vec3 vLightWorld;varying vec3 vLightNormal;void main(){vLightUv=uv;vLightNormal=mat3(modelMatrix)*normal;vec4 p=modelMatrix*vec4(position,1.);vLightWorld=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}`,
      fragmentShader:`varying vec2 vLightUv;varying vec3 vLightWorld;varying vec3 vLightNormal;uniform float uTime;
        void main(){
          float ends=smoothstep(0.,.12,vLightUv.y)*(1.-smoothstep(.9,1.,vLightUv.y));
          float shafts=.65+.35*pow(.5+.5*sin(vLightUv.x*41.+sin(vLightUv.y*7.+uTime*.07)),4.);
          float edge=smoothstep(.03,.72,abs(dot(normalize(vLightNormal),normalize(cameraPosition-vLightWorld))));
          float coverage=ends*shafts*.18*edge*smoothstep(.6,2.2,length(cameraPosition-vLightWorld));
          gl_FragColor=vec4(.60,.66,.45,coverage);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`});
    shaftMaterial.name="cathedral-single-batch-additive-daylight";materials.add(shaftMaterial);
    const shaftMesh=mergeGeometries(shafts,false);shafts.forEach(g=>g.dispose());
    if(shaftMesh){const beams=mesh(shaftMesh,shaftMaterial,"cathedral-daylight-shafts");beams.renderOrder=2;}
  }

  // Portal presentation is owned by V4ActivityObjects. Keeping a second post
  // here would put an opaque pole directly through arrival cameras.
  group.userData.portalIds=portalsFrom(id).map(p=>p.id);
  group.userData.triangleBudget=low?65000:140000;
  return {
    group,
    setVisibilityAssist(enabled){assist=enabled;},
    setFocus(point){focus=point?{...point}:null;},
    tick(_delta,time,quiet){
      if(disposed)return;
      const response=focus&&id==="lantern"?Math.max(0,1-Math.hypot(focus.x,focus.z)/45):0;
      const pulse=quiet?1:1+Math.sin(time*.42)*.09;
      glowMaterial.emissiveIntensity=(id==="lantern"?1.6+response*.65:.35)*pulse;
      rock.emissiveIntensity=assist?.28:region.cave?.04:0;
      floorMaterial.emissiveIntensity=assist?.28:region.cave?.035:0;
      if(organisms)organisms.visible=true;
    },
    dispose(){
      if(disposed)return;
      disposed=true;group.removeFromParent();
      instances.forEach(i=>i.dispose());
      geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
      group.clear();
    },
  };
}

function createReefFloor(id:RegionId,low:boolean):BufferGeometry {
  const {bounds}=getRegion(id),segments=low?64:96,rings=low?24:36;
  const p:number[]=[],indices:number[]=[];
  for(let ring=0;ring<=rings;ring++)for(let i=0;i<=segments;i++){
    const a=i/segments*Math.PI*2,t=ring/rings,x=Math.cos(a)*bounds.x*t,z=Math.sin(a)*bounds.z*t;
    p.push(x,sampleRegionFloor(id,x,z),z);
  }
  for(let r=0;r<rings;r++)for(let i=0;i<segments;i++){
    const a=r*(segments+1)+i,b=a+1,c=a+segments+1,d=c+1;
    indices.push(a,c,b,b,c,d);
  }
  const g=new BufferGeometry();g.setAttribute("position",new Float32BufferAttribute(p,3));g.setIndex(indices);g.computeVertexNormals();return g;
}

/** Boundary faces of the exact union of authored empty chambers. Internal
 * overlaps are removed, so connected rooms contain openings instead of walls. */
function createCaveShell(cells:readonly RegionBox[],low:boolean){
  const axes=[0,1,2].map(axis=>[...new Set(cells.flatMap(c=>[c.min[axis],c.max[axis]]))].sort((a,b)=>a-b));
  const dims=axes.map(a=>a.length-1),occupied=new Set<string>();
  const key=(x:number,y:number,z:number)=>`${x}/${y}/${z}`;
  for(let x=0;x<dims[0];x++)for(let y=0;y<dims[1];y++)for(let z=0;z<dims[2];z++){
    const p=[(axes[0][x]+axes[0][x+1])/2,(axes[1][y]+axes[1][y+1])/2,(axes[2][z]+axes[2][z+1])/2];
    if(cells.some(c=>p.every((v,a)=>v>c.min[a]&&v<c.max[a])))occupied.add(key(x,y,z));
  }
  const stone:number[]=[],floor:number[]=[];
  function face(out:number[],base:number[],axis:number,side:number,uAxis:number,vAxis:number,du:number,dv:number){
    const nu=Math.max(1,Math.ceil(du/(low?3:1.5))),nv=Math.max(1,Math.ceil(dv/(low?3:1.5)));
    const point=(u:number,v:number)=>{
      const p=[...base];p[uAxis]+=u*du;p[vAxis]+=v*dv;
      // Relief recedes into stone. Navigable chamber clearances are conservative.
      const isFloor=axis===1&&side===-1;
      const breadth=Math.min(2.6,Math.min(du,dv)*.38);
      const vault=Math.sin(Math.PI*u)*Math.sin(Math.PI*v);
      const fractured=.58+.22*Math.sin(p[uAxis]*.91+p[vAxis]*.53)+.20*Math.cos(p[uAxis]*1.77-p[vAxis]*.83);
      p[axis]+=side*(isFloor?.12:breadth)*vault*fractured;
      return p;
    };
    for(let u=0;u<nu;u++)for(let v=0;v<nv;v++){
      const a=point(u/nu,v/nv),b=point((u+1)/nu,v/nv),c=point(u/nu,(v+1)/nv),d=point((u+1)/nu,(v+1)/nv);
      const cross=new Vector3().crossVectors(new Vector3(...b as [number,number,number]).sub(new Vector3(...a as [number,number,number])),new Vector3(...c as [number,number,number]).sub(new Vector3(...a as [number,number,number])));
      if(cross.getComponent(axis)*side<0)out.push(...a,...b,...c,...b,...d,...c);else out.push(...a,...c,...b,...b,...c,...d);
    }
  }
  for(let x=0;x<dims[0];x++)for(let y=0;y<dims[1];y++)for(let z=0;z<dims[2];z++){
    if(!occupied.has(key(x,y,z)))continue;
    const cell=[x,y,z];
    for(let axis=0;axis<3;axis++)for(const side of [-1,1]){
      const neighbor=[...cell];neighbor[axis]+=side;
      if(occupied.has(key(...neighbor as [number,number,number])))continue;
      const uv=[0,1,2].filter(a=>a!==axis),base=axes.map((values,a)=>values[cell[a]+(a===axis&&side===1?1:0)]);
      face(axis===1&&side===-1?floor:stone,base,axis,side,uv[0],uv[1],axes[uv[0]][cell[uv[0]]+1]-base[uv[0]],axes[uv[1]][cell[uv[1]]+1]-base[uv[1]]);
    }
  }
  const geometry=(p:number[])=>{const g=new BufferGeometry();g.setAttribute("position",new Float32BufferAttribute(p,3));g.computeVertexNormals();return g;};
  return {floor:geometry(floor),stone:geometry(stone)};
}
/** A single branching colony has mass and blunt living tips, not a wireframe.
 * All coral templates fit inside a unit horizontal envelope and Y 0..1. */
function createBranches(low:boolean):BufferGeometry {
  const parts:BufferGeometry[]=[];
  const branch=(a:Vector3,b:Vector3,r:number)=>{
    const direction=b.clone().sub(a),g=new CylinderGeometry(r*.72,r,direction.length(),low?5:6,1,false);
    const o=new Object3D();o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new Vector3(0,1,0),direction.normalize());o.updateMatrix();g.applyMatrix4(o.matrix);parts.push(g);
  };
  branch(new Vector3(0,.01,0),new Vector3(0,.68,0),.115);
  const count=low?5:6;
  for(let i=0;i<count;i++){
    const angle=i*2.399,base=new Vector3(0,.13+i*.052,0),tip=new Vector3(Math.cos(angle)*.46,.5+i*.055,Math.sin(angle)*.46);
    branch(base,tip,.075);branch(tip,tip.clone().add(new Vector3(Math.cos(angle+.5)*.1,.2,Math.sin(angle+.5)*.1)),.049);
    if(i%2===0)branch(tip.clone().lerp(base,.24),tip.clone().add(new Vector3(Math.cos(angle-1)*.19,.12,Math.sin(angle-1)*.19)),.039);
  }
  return mergeCoral(parts);
}
function createPlates(low:boolean):BufferGeometry {
  const parts:BufferGeometry[]=[];
  const layers=low?3:4;
  for(let i=0;i<layers;i++){
    const scale=1-i*.18,g=new CylinderGeometry(scale*.96,scale*.68,.075,low?9:13,1);
    const p=g.getAttribute("position");
    for(let j=0;j<p.count;j++){
      const x=p.getX(j),z=p.getZ(j),a=Math.atan2(z,x);
      p.setXYZ(j,x,p.getY(j)+Math.sin(a*5+i)*.022+Math.hypot(x,z)*.07,z);
    }
    g.computeVertexNormals();g.translate(Math.sin(i*2.4)*.14,.15+i*.21,Math.cos(i*2.4)*.14);parts.push(g);
  }
  const stem=new CylinderGeometry(.13,.19,.55,low?5:7,1);stem.translate(0,.275,0);parts.push(stem);
  return mergeCoral(parts);
}
function createFan(low:boolean):BufferGeometry {
  const p:number[]=[],count=low?11:17,levels=low?4:6;
  const ribbon=(ax:number,ay:number,bx:number,by:number,w:number)=>{
    const az=Math.sin(ax*4+ay*2)*.09,bz=Math.sin(bx*4+by*2)*.09;
    p.push(ax-w,ay,az,ax+w,ay,az,bx-w,by,bz,ax+w,ay,az,bx+w,by,bz,bx-w,by,bz);
  };
  for(let i=0;i<count;i++){
    const a=-1.23+(i/(count-1))*2.46,x=Math.sin(a)*.91,y=.22+Math.cos(a)*.78;
    ribbon(0,0,x,y,.021);
    if(i){const pa=-1.23+((i-1)/(count-1))*2.46,px=Math.sin(pa)*.91,py=.22+Math.cos(pa)*.78;
      for(let j=1;j<=levels;j++){const t=.23+j/(levels+1)*.71;ribbon(px*t,py*t,x*t,y*t,.015);}
    }
  }
  const g=new BufferGeometry();g.setAttribute("position",new Float32BufferAttribute(p,3));g.computeVertexNormals();return g;
}
function createAnemone(low:boolean):BufferGeometry {
  const parts:BufferGeometry[]=[];
  // A lobed mound plus open fleshy fingers gives close foreground scale.
  const dome=new SphereGeometry(.55,low?7:10,low?4:6,0,Math.PI*2,0,Math.PI/2);
  dome.scale(1,.42,1);parts.push(dome);
  const count=low?7:10;
  for(let i=0;i<count;i++){
    const a=i*2.399,r=.15+Math.sqrt(i/count)*.3,h=.46+.3*noise(i,4);
    const stem=new CylinderGeometry(.045,.063,h,low?4:5,1);
    stem.rotateZ(Math.sin(a)*.2);stem.rotateX(Math.cos(a)*.2);stem.translate(Math.cos(a)*r,h/2+.09,Math.sin(a)*r);parts.push(stem);
    const tip=new IcosahedronGeometry(.082,0);tip.setIndex(Array.from({length:tip.getAttribute("position").count},(_,j)=>j));tip.translate(Math.cos(a)*r-Math.sin(a)*h*.1,h+.075,Math.sin(a)*r+Math.cos(a)*h*.1);parts.push(tip);
  }
  return mergeCoral(parts);
}
function mergeCoral(parts:BufferGeometry[]):BufferGeometry {
  const merged=mergeGeometries(parts,false)!;parts.forEach(p=>p.dispose());merged.computeBoundingBox();
  const box=merged.boundingBox!,bottom=box.min.y,height=box.max.y-bottom;
  const radius=Math.max(Math.abs(box.min.x),Math.abs(box.max.x),Math.abs(box.min.z),Math.abs(box.max.z));
  merged.applyMatrix4(new Matrix4().makeTranslation(0,-bottom,0));merged.scale(radius>1?1/radius:1,1/height,radius>1?1/radius:1);
  merged.computeVertexNormals();return merged;
}
function createGrass():BufferGeometry{
  const p:number[]=[];
  for(let i=0;i<7;i++){const a=i*2.4,x=Math.cos(a)*.16,z=Math.sin(a)*.16;p.push(x-.025,0,z,x+.025,0,z,x+.13,.75,z+.03);}
  const g=new BufferGeometry();g.setAttribute("position",new Float32BufferAttribute(p,3));g.computeVertexNormals();return g;
}

type HabitatFinish="sand"|"stone"|"coral"|"grass"|"glow";
/** Distance-filtered procedural albedo and shallow relief: no downloaded texture
 * payload, no transparent caustic planes, and the same frozen expedition clock. */
function applyHabitatFinish(material:MeshStandardMaterial,environment:SeaEnvironment,finish:HabitatFinish,cave:boolean,luminous=false,daylight=false){
  const previous=material.onBeforeCompile,previousKey=material.customProgramCacheKey();
  material.onBeforeCompile=(shader,renderer)=>{
    previous.call(material,shader,renderer);shader.uniforms.uHabitatTime=environment.uTime;
    // Clear reef water retains warm nearby pigments. Caves have a blue scatter
    // field rather than importing the sunlit surface's green veil.
    shader.fragmentShader=shader.fragmentShader.replace("exp(-vec3(.085,.026,.020)*lengthInWater)","exp(-vec3(.045,.021,.018)*lengthInWater)");
    if(cave)shader.fragmentShader=shader.fragmentShader.replace("vec3(.008,.255,.295),vec3(.005,.10,.18)","vec3(.012,.075,.14),vec3(.008,.035,.085)");
    shader.fragmentShader=`uniform float uHabitatTime;
      float habitatHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float habitatNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(habitatHash(i),habitatHash(i+vec2(1.,0.)),f.x),mix(habitatHash(i+vec2(0.,1.)),habitatHash(i+vec2(1.)),f.x),f.y);}
      ${shader.fragmentShader}`;
    const surface=finish==="sand"?`
      float warp=habitatNoise(vSeaWorld.xz*.16)*2.7;
      float ripple=sin(vSeaWorld.x*4.2+sin(vSeaWorld.z*.42)*1.8+warp);
      float patches=habitatNoise(vSeaWorld.xz*.24);
      float fine=habitatNoise(vSeaWorld.xz*27.);
      float detail=1.-smoothstep(15.,48.,length(cameraPosition-vSeaWorld));
      diffuseColor.rgb*=mix(.76,1.06,patches)*(1.+ripple*.095*detail)+(fine-.5)*.11*detail;
      float habitatRelief=ripple*.025*detail;`:
      finish==="stone"?`
      float strata=sin(vSeaWorld.y*8.1+habitatNoise(vSeaWorld.xz*.42)*2.2);
      float pores=habitatNoise(vSeaWorld.xz*3.1+vSeaWorld.y*.82);
      float mineral=habitatNoise(vSeaWorld.xz*.37+vSeaWorld.y*vec2(.31,.19));
      float crevice=smoothstep(.38,.47,habitatNoise(vSeaWorld.xz*1.9+vSeaWorld.y*.58));
      diffuseColor.rgb*=mix(.65,1.10,pores)*(.91+strata*.13)*mix(.81,1.11,mineral)*mix(.77,1.,crevice);
      float habitatRelief=strata*.018+(pores-.5)*.055+(mineral-.5)*.11;`:
      finish==="coral"?`
      float polyps=habitatNoise(vSeaWorld.xz*24.+vSeaWorld.y*7.);
      diffuseColor.rgb*=.82+polyps*.28;
      float habitatRelief=polyps*.007;`:`float habitatRelief=0.;`;
    shader.fragmentShader=shader.fragmentShader.replace("#include <color_fragment>",`#include <color_fragment>
${surface}`);
    shader.fragmentShader=shader.fragmentShader.replace("#include <normal_fragment_maps>",`#include <normal_fragment_maps>
      vec3 hx=dFdx(-vViewPosition),hy=dFdy(-vViewPosition);
      vec3 hr1=cross(hy,normal),hr2=cross(normal,hx);float hd=dot(hx,hr1);
      normal=normalize(max(abs(hd),.00000001)*normal-sign(hd)*(dFdx(habitatRelief)*hr1+dFdy(habitatRelief)*hr2));`);
    // Preserve a little pigment in shaded living surfaces; the shared water
    // absorption still applies afterwards, so distant habitats recede naturally.
    const pigment=finish==="coral"?`totalEmissiveRadiance+=diffuseColor.rgb*${cave?".24":".13"};`:"";
    const life=luminous&&finish==="stone"?`
      vec3 livingNormal=inverseTransformDirection(normal,viewMatrix);
      vec2 livingUV=abs(livingNormal.y)>.6?vSeaWorld.xz:vec2(vSeaWorld.x+vSeaWorld.z,vSeaWorld.y);
      vec2 livingCells=livingUV*1.45,livingCell=floor(livingCells);
      vec2 livingCenter=vec2(.2)+vec2(habitatHash(livingCell),habitatHash(livingCell+vec2(19.,7.)))*.6;
      float livingDistance=length(fract(livingCells)-livingCenter);
      float livingPatch=smoothstep(.48,.66,habitatNoise(livingUV*.17));
      float livingPolyp=1.-smoothstep(.025,.085,livingDistance);
      float livingHalo=(1.-smoothstep(.065,.29,livingDistance))*.10;
      float livingBreath=.93+.07*sin(uHabitatTime*.4+livingCell.x);
      totalEmissiveRadiance+=vec3(.13,.82,.65)*(livingPolyp+livingHalo)*livingPatch*livingBreath;
      `:"";
    const pools=daylight&&finish==="sand"?cathedralLightWells.map(well=>{
      const origin=getRegion("cathedral").worldOrigin;
      return `totalEmissiveRadiance+=vec3(.62,.57,.32)*(1.-smoothstep(.48,1.,length((vSeaWorld.xz-vec2(${(well.x+well.dx+origin.x).toFixed(3)},${(well.z+well.dz+origin.z).toFixed(3)}))/vec2(${well.radius.toFixed(3)},${(well.radius*1.18).toFixed(3)}))));`;
    }).join("\n"):"";
    const caustic=cave?"":`
      vec2 hq=vSeaWorld.xz*.95+vec2(uHabitatTime*.063,-uHabitatTime*.045);
      float hc=pow(1.-abs(sin(hq.x+sin(hq.y*.83+uHabitatTime*.12)*.8)*cos(hq.y+sin(hq.x*.92-uHabitatTime*.1)*.8)),17.);
      float hu=clamp(inverseTransformDirection(normal,viewMatrix).y,0.,1.);
      totalEmissiveRadiance+=vec3(.43,.48,.29)*hc*.36*exp(min(vSeaWorld.y,0.)*.065)*hu;`;
    shader.fragmentShader=shader.fragmentShader.replace("#include <emissivemap_fragment>",`#include <emissivemap_fragment>
${pigment}${life}${pools}${caustic}`);
  };
  material.customProgramCacheKey=()=>`${previousKey}/habitat-v4-${finish}-${cave}-${luminous}-${daylight}`;material.needsUpdate=true;
}
