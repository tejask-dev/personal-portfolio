/** Material/transform-preserving lower-detail adaptation of the existing CC-BY yacht. */
import fs from 'node:fs';
import crypto from 'node:crypto';
import {BufferGeometry,Float32BufferAttribute} from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {GLTFExporter} from 'three/examples/jsm/exporters/GLTFExporter.js';
import {MeshoptSimplifier} from 'meshoptimizer';
const source='client/public/open-water/yacht.glb',target='client/public/assets/open-water-v3/yacht-low.glb';
const bytes=fs.readFileSync(source),metadata=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString()).asset;
const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
await MeshoptSimplifier.ready;
const rows=[];
gltf.scene.traverse(object=>{
 if(!object.isMesh)return;
 const source=object.geometry,position=source.getAttribute('position'),positions=new Float32Array(position.count*3);
 for(let i=0;i<position.count;i++)positions.set([position.getX(i),position.getY(i),position.getZ(i)],i*3);
 const indices=new Uint32Array(source.index?.array??Array.from({length:position.count},(_,i)=>i));
 const [reduced,error]=indices.length<=360?[indices,0]:MeshoptSimplifier.simplify(indices,positions,3,Math.floor(indices.length*.28/3)*3,.015);
 const [remap,count]=MeshoptSimplifier.compactMesh(reduced),geometry=new BufferGeometry();
 for(const[name,attribute]of Object.entries(source.attributes)){
  const values=new Float32Array(count*attribute.itemSize);
  for(let i=0;i<attribute.count;i++){const j=remap[i];if(j===0xffffffff)continue;for(let k=0;k<attribute.itemSize;k++)values[j*attribute.itemSize+k]=attribute.getComponent(i,k);}
  geometry.setAttribute(name,new Float32BufferAttribute(values,attribute.itemSize));
 }
 geometry.setIndex(Array.from(reduced));geometry.computeBoundingBox();geometry.computeBoundingSphere();object.geometry=geometry;
 rows.push({name:object.name,material:object.material.name,before:indices.length/3,after:reduced.length/3,relativeError:error});
});
globalThis.FileReader=class{readAsArrayBuffer(b){b.arrayBuffer().then(v=>{this.result=v;this.onloadend?.()})}readAsDataURL(b){b.arrayBuffer().then(v=>{this.result=`data:${b.type};base64,${Buffer.from(v).toString('base64')}`;this.onloadend?.()})}};
const exporter=new GLTFExporter();exporter.register(writer=>({writeTexture:()=>{},afterParse(){writer.json.asset.extras={...metadata.extras,modifications:`${metadata.extras.modifications} Further offline LOD: meshoptimizer0.18.1 simplification, existing attribute seams retained; unreferenced vertices compacted; original material names/transforms retained. Source native coordinates are unchanged.`};}}));
const output=await exporter.parseAsync(gltf.scene,{binary:true,onlyVisible:false});fs.writeFileSync(target,Buffer.from(output));
const result={source,sourceSha256:crypto.createHash('sha256').update(bytes).digest('hex'),target,bytes:output.byteLength,triangles:rows.reduce((n,r)=>n+r.after,0),originalTriangles:rows.reduce((n,r)=>n+r.before,0),maximumRelativePrimitiveError:Math.max(...rows.map(r=>r.relativeError)),meshes:rows};
fs.writeFileSync('client/public/assets/open-water-v3/yacht-lod-manifest.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
