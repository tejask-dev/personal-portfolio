import { BackSide, Color, DoubleSide, Material, ShaderMaterial, Vector3, Vector4 } from "three";
import { destinations, islands, LIGHTHOUSE } from "../data/world";
const coastlines = [...destinations, ...islands, LIGHTHOUSE];

/** Shared clock, sun and sea state. Stop the clock to freeze every procedural detail. */
export type SeaEnvironment = {
  uTime: { value: number };
  uDay: { value: number };
  uBoat: { value: Vector3 };
  uBoatLift: { value: number };
};
export const SEA_LIGHTING = {
  sunDirection: new Vector3(-0.63, 0.56, -0.54).normalize(),
  sunColor: "#fff0cf", sunIntensity: 2.15,
  skyColor: "#c4e2ee", groundColor: "#648c83", hemisphereIntensity: 1.45,
} as const;
export function createEnvironment(): SeaEnvironment {
  return { uTime: { value: 14 }, uDay: { value: 1 }, uBoat: { value: new Vector3(0, 35, 0.12) }, uBoatLift: { value: 0 } };
}
const noise = `
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);}
float fbm(vec2 p){return noise(p)*.57+noise(p*2.03)*.28+noise(p*4.09)*.15;}
`;
const atmosphere = `
vec3 skyColor(vec3 direction,float daylight){
  float up=max(direction.y,0.);
  vec3 horizon=mix(vec3(.15,.27,.34),vec3(.64,.78,.79),daylight);
  vec3 zenith=mix(vec3(.018,.065,.14),vec3(.10,.34,.57),daylight);
  return mix(horizon,zenith,pow(up,.46));
}
`;
/** Attenuate the part of the camera-to-fragment segment below mean sea level.
 * Object depth, not seabed depth, controls visibility of swimmers and fish. */
const medium = `
vec3 seaMedium(vec3 color,vec3 point,vec3 eye){
  float lengthInWater=0.;float rayLength=length(point-eye);
  if(point.y<0.&&eye.y<0.)lengthInWater=rayLength;
  else if((point.y<0.)!=(eye.y<0.)){
    float crossing=clamp(-eye.y/(point.y-eye.y),0.,1.);
    lengthInWater=rayLength*(eye.y<0.?crossing:1.-crossing);
  }
  vec3 transmittance=exp(-vec3(.085,.026,.020)*lengthInWater);
  vec3 scattered=mix(vec3(.008,.255,.295),vec3(.005,.10,.18),smoothstep(18.,75.,lengthInWater));
  return color*transmittance+scattered*(1.-transmittance);
}
`;
const fog = `
float haze=(1.-exp(-pow(length(cameraPosition-vWorld)*.0012,1.75)))*step(0.,cameraPosition.y);
col=mix(col,skyColor(normalize(vWorld-cameraPosition),uDay),haze);
col=seaMedium(col,vWorld,cameraPosition);
`;
const output = `gl_FragColor=vec4(col,1.);\n#include <colorspace_fragment>\n`;
export type SurfaceFinish = 0 | 1 | 2 | 3 | 4 | 5;
export function architectureMaterial(color:string,environment:SeaEnvironment,gloss=0.15,emission=0,finish:SurfaceFinish=0,opacity=1){
  return new ShaderMaterial({
    uniforms:{...environment,uColor:{value:new Color(color)},uGloss:{value:gloss},uEmission:{value:emission},uFinish:{value:finish},uOpacity:{value:opacity}},
    transparent:opacity<1,depthWrite:opacity>=1,
    vertexShader:`#include <common>
      varying vec3 vWorld;varying vec3 vNormal;varying vec3 vLocal;
      void main(){vLocal=position;vWorld=(modelMatrix*vec4(position,1.)).xyz;
      vNormal=inverseTransformDirection(normalMatrix*normal,viewMatrix);
      gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}`,
    fragmentShader:`varying vec3 vWorld;varying vec3 vNormal;varying vec3 vLocal;
      uniform vec3 uColor;uniform float uGloss;uniform float uEmission;uniform float uDay;uniform float uTime;uniform float uFinish;uniform float uOpacity;
      ${noise}${atmosphere}${medium}
      void main(){vec3 N=normalize(vNormal);if(!gl_FrontFacing)N=-N;
        vec3 L=normalize(vec3(-.63,.56,-.54)),V=normalize(cameraPosition-vWorld),H=normalize(L+V);
        float diffuse=max(dot(N,L),0.),up=N.y*.5+.5;
        float fres=pow(1.-max(dot(N,V),0.),5.);vec3 pigment=uColor;
        if(uFinish<.5){pigment*=.94+fbm(vWorld.xz*2.1+vWorld.y*vec2(.71,.39))*.09;}
        else if(uFinish<1.5){float board=fract(vLocal.x*4.8);
          float seam=1.-smoothstep(.015,.042,min(board,1.-board));
          pigment*=.95+noise(vec2(vLocal.x*12.,vLocal.z*.10))*.06;
          pigment=mix(pigment,vec3(.055,.035,.018),seam*.30);
        }else if(uFinish>4.5){
          float patches=fbm(vWorld.xz*.15);
          pigment=mix(pigment*.86,pigment*1.07,patches);
          float ripples=sin(vWorld.x*.98+sin(vWorld.z*.25)*2.2);
          pigment*=.965+.035*ripples;
        }
        vec3 ambient=mix(vec3(.33,.40,.38),vec3(.65,.76,.79),up);
        vec3 sun=mix(vec3(.38,.49,.57),vec3(1.,.88,.69),uDay);
        vec3 col=pigment*(ambient*.44+sun*diffuse*1.02);
        vec3 reflection=skyColor(reflect(-V,N),uDay);
        float spec=pow(max(dot(N,H),0.),mix(22.,240.,uGloss));
        col+=mix(vec3(.25,.43,.57),vec3(1.,.87,.62),uDay)*spec*(.022+uGloss*.42);
        if(uFinish>1.5&&uFinish<2.5){col=mix(pigment*.4,reflection,.19+fres*.62)+vec3(.40,.64,.76)*spec*.45;}
        else if(uFinish>2.5&&uFinish<3.5){col=mix(col,reflection,.48+fres*.36)+vec3(.8)*spec*.55;}
        else if(uFinish>3.5&&uFinish<4.5){col+=pigment*.12;col=mix(col,reflection,fres*.17);}
        if(vWorld.y<-.4&&N.y>0.){
          vec2 q=vWorld.xz*.72+vec2(uTime*.065,-uTime*.047);
          float caustic=pow(1.-abs(sin(q.x+sin(q.y*.83+uTime*.13)*.8)*cos(q.y+sin(q.x*.92-uTime*.11)*.8)),14.);
          float roof=step(-71.,vWorld.x)*step(vWorld.x,-65.)*step(-20.6,vWorld.z)*step(vWorld.z,-17.4)*step(vWorld.y,-4.9);
          float ledge=step(-54.5,vWorld.x)*step(vWorld.x,-52.)*step(-24.5,vWorld.z)*step(vWorld.z,-21.5)*step(vWorld.y,-4.4);
          roof=max(roof,ledge);
          col+=vec3(.40,.50,.31)*caustic*.19*exp(vWorld.y*.085)*N.y*(1.-roof);
        }
        col=mix(col,uColor*1.12,uEmission);
        ${fog}${output.replace("vec4(col,1.)","vec4(col,uOpacity)")}
      }`,toneMapped:false,
  });
}

/** Patch Standard/Physical wildlife after skinning + instancing, before output
 * conversion. One patch per material; uniforms are shared and do not own a loop. */
export function applySeaMedium<T extends Material>(material:T,environment:SeaEnvironment):T {
  if(material.userData.openWaterMedium) return material;
  material.userData.openWaterMedium=true;
  const previous=material.onBeforeCompile;
  const previousKey=material.customProgramCacheKey.bind(material);
  material.onBeforeCompile=(shader,renderer)=>{
    previous.call(material,shader,renderer);
    shader.uniforms.uSeaTime=environment.uTime;
    shader.vertexShader="varying vec3 vSeaWorld;\n"+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace("#include <project_vertex>",`#include <project_vertex>
      vec4 seaPosition=vec4(transformed,1.);
      #ifdef USE_BATCHING
        seaPosition=batchingMatrix*seaPosition;
      #endif
      #ifdef USE_INSTANCING
        seaPosition=instanceMatrix*seaPosition;
      #endif
      vSeaWorld=(modelMatrix*seaPosition).xyz;`);
    shader.fragmentShader="varying vec3 vSeaWorld;\n"+medium+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace("#include <tonemapping_fragment>",`gl_FragColor.rgb=seaMedium(gl_FragColor.rgb,vSeaWorld,cameraPosition);
      #include <tonemapping_fragment>`);
  };
  const baseKey=previousKey();
  material.customProgramCacheKey=()=>`${baseKey}/open-water-medium-v3`;
  material.needsUpdate=true;
  return material;
}

export function oceanMaterial(environment:SeaEnvironment){
  return new ShaderMaterial({
    uniforms:{...environment,uIslands:{value:coastlines.map((s,i)=>new Vector4(s.x,s.z,s.r,i*.83))}},
    transparent:true,depthTest:true,depthWrite:false,side:DoubleSide,forceSinglePass:true,toneMapped:false,
    vertexShader:`uniform float uTime;varying vec3 vWorld;
      void main(){vec3 p=position;float displacement=1.-smoothstep(100.,290.,length(cameraPosition.xz-p.xz));
      p.y=(.22*sin(p.x*.13+p.z*.19+uTime*.72)+.12*sin(p.x*.33-p.z*.21-uTime*.93)+.045*sin(p.x*.73+p.z*.6+uTime*1.1))*displacement;
      vWorld=(modelMatrix*vec4(p,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}`,
    fragmentShader:`uniform float uTime;uniform float uDay;uniform vec3 uBoat;uniform float uBoatLift;
      uniform vec4 uIslands[${coastlines.length}];varying vec3 vWorld;${noise}${atmosphere}
      void main(){vec2 p=vWorld.xz;float t=uTime;vec3 V=normalize(cameraPosition-vWorld);
        float dist=length(cameraPosition-vWorld),detail=1.-smoothstep(90.,430.,dist);
        // Broad, incommensurate phases prevent the horizon becoming a comb of
        // parallel sine bands. The shared physical waves still move the mesh.
        vec2 warp=vec2(noise(p*.035+vec2(t*.011,0.)),noise(p*.039+vec2(7.,-t*.009)))*3.;
        vec2 q=p+warp;
        vec2 d=vec2(sin(q.x*.24+q.y*.13+t*.21),cos(q.x*.11-q.y*.27-t*.17))*.021;
        d+=vec2(sin(q.x*.39-q.y*.43-t*.37),cos(q.x*.46+q.y*.34+t*.31))*.010*detail;
        d+=vec2(sin(q.x*.081-q.y*.117+t*.12),cos(q.x*.107+q.y*.062-t*.09))*.014;
        d*=mix(.33,1.,detail);
        vec3 N=normalize(vec3(-d.x,1.,-d.y));
        float footprint=max(length(dFdx(p)),length(dFdy(p)));
        float microFade=1.-smoothstep(.25,1.4,footprint);
        float micro=(noise(p*.90+vec2(t*.06,-t*.04))*.72+noise(p*1.83+vec2(-t*.045,t*.07))*.28)*.055*microFade;
        vec3 dpdx=dFdx(vWorld),dpdy=dFdy(vWorld),r1=cross(dpdy,N),r2=cross(N,dpdx);
        float determinant=dot(dpdx,r1);
        vec3 gradient=sign(determinant)*(dFdx(micro)*r1+dFdy(micro)*r2);
        N=normalize(max(abs(determinant),.000001)*N-gradient);
        if(cameraPosition.y<0.)N=-N;
        float fres=.025+.975*pow(1.-max(dot(N,V),0.),5.);
        vec3 col=skyColor(reflect(-V,N),uDay);
        vec3 L=normalize(vec3(-.63,.56,-.54)),H=normalize(V+L);
        float sparkle=pow(max(dot(N,H),0.),260.);
        col+=vec3(1.,.90,.69)*sparkle*.6;
        float shore=1000.;for(int i=0;i<${coastlines.length};i++){
          vec2 relative=p-uIslands[i].xy;float angle=atan(relative.y,relative.x);
          float coast=uIslands[i].z*(.91+.035*sin(angle*3.+uIslands[i].w)+.035*cos(angle*7.-uIslands[i].w));
          shore=min(shore,abs(length(relative)-coast));
        }
        float foam=exp(-shore*shore*2.4)*(.65+.35*sin(t*.65+p.x*.32+p.y*.27));
        float alpha=clamp(.035+fres*.82+sparkle*.25+foam*.28,.035,.94);
        col=mix(col,vec3(.78,.87,.76),foam*.7);
        vec2 bp=p-uBoat.xy;float co=cos(uBoat.z),si=sin(uBoat.z);vec2 local=vec2(co*bp.x+si*bp.y,-si*bp.x+co*bp.y);
        float shadow=exp(-dot(local/vec2(3.1,11.4),local/vec2(3.1,11.4))*1.8)*exp(-max(uBoatLift,0.)*.25);
        col*=1.-shadow*.22;
        if(cameraPosition.y<0.){
          float window=pow(max(-V.y,0.),5.);
          col=mix(vec3(.025,.19,.25),vec3(.47,.74,.67),window);
          col+=vec3(.22,.27,.18)*pow(max(dot(-V,L),0.),140.);
          alpha=.92;
        }
        // Only the unplayable distant horizon closes to opaque. Nearby fish
        // remain visible regardless of the sand depth underneath them.
        float horizon=smoothstep(410.,610.,length(p));
        vec3 deep=mix(vec3(.006,.04,.09),vec3(.007,.095,.19),uDay);
        col=mix(col,mix(deep,col,fres),horizon);alpha=mix(alpha,1.,horizon);
        float haze=(1.-exp(-pow(dist*.0008,1.75)))*step(0.,cameraPosition.y);col=mix(col,skyColor(normalize(vWorld-cameraPosition),uDay),haze);
        gl_FragColor=vec4(col,alpha);
        #include <colorspace_fragment>
      }`,
  });
}
export function skyMaterial(environment:SeaEnvironment){
  return new ShaderMaterial({uniforms:{...environment},side:BackSide,depthWrite:false,toneMapped:false,
    vertexShader:"varying vec3 vWorld;void main(){vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}",
    fragmentShader:`varying vec3 vWorld;uniform float uDay;uniform float uTime;${noise}${atmosphere}
      void main(){vec3 ray=normalize(vWorld-cameraPosition);vec3 col=skyColor(ray,uDay);
        if(cameraPosition.y<0.){
          col=mix(vec3(.018,.13,.19),vec3(.045,.31,.34),clamp(ray.y*.5+.5,0.,1.));
          ${output}return;
        }
        float sun=pow(max(dot(ray,normalize(vec3(-.63,.56,-.54))),0.),1100.);col+=vec3(1.,.84,.55)*sun*.7;
        vec2 cp=ray.xz/max(ray.y,.07)*.72+vec2(uTime*.001,0.);
        float veil=smoothstep(.60,.84,fbm(cp))*smoothstep(.01,.25,ray.y)*.12;
        col=mix(col,vec3(.87,.90,.84),veil);${output}}
    `});
}
