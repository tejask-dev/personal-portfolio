import { BackSide, Color, ShaderMaterial, Vector3, Vector4 } from "three";
import { destinations, islands } from "../data/world";
const coastlines = [...destinations, ...islands];

/** A shared analytic sea keeps the hull, ribbons, and visible waves in agreement. */
export type SeaEnvironment = {
  uTime: { value: number };
  uDay: { value: number };
  uBoat: { value: Vector3 };
  uBoatLift: { value: number };
};
export function createEnvironment(): SeaEnvironment {
  return {
    uTime: { value: 14 },
    uDay: { value: 1 },
    uBoat: { value: new Vector3(0, 35, 0.12) },
    uBoatLift: { value: 0 },
  };
}
const noise = `
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);}
float fbm(vec2 p){return noise(p)*.57+noise(p*2.03)*.28+noise(p*4.09)*.15;}
`;
const atmosphere = `
vec3 skyColor(vec3 direction,float daylight){
  float up=max(direction.y,0.);
  vec3 horizon=mix(vec3(.43,.58,.63),vec3(.76,.85,.86),daylight);
  vec3 zenith=mix(vec3(.055,.17,.30),vec3(.24,.51,.72),daylight);
  return mix(horizon,zenith,pow(up,.46));
}
`;
const fog = `
float haze=1.-exp(-pow(length(cameraPosition-vWorld)*.0015,1.75));
col=mix(col,skyColor(normalize(vWorld-cameraPosition),uDay),haze);
`;
/** Surface IDs are deliberately simple: matte limestone, teak, tinted glazing,
 * brushed metal, and lacquer. Geometry shares one material per finish. */
export type SurfaceFinish = 0 | 1 | 2 | 3 | 4;
export function architectureMaterial(
  color: string,
  environment: SeaEnvironment,
  gloss = 0.15,
  emission = 0,
  finish: SurfaceFinish = 0,
) {
  const palette = new Color(color).convertLinearToSRGB();
  return new ShaderMaterial({
    uniforms: {
      ...environment,
      uColor: { value: palette },
      uGloss: { value: gloss },
      uEmission: { value: emission },
      uFinish: { value: finish },
    },
    vertexShader: `varying vec3 vWorld;varying vec3 vNormal;varying vec3 vLocal;
      void main(){vLocal=position;vWorld=(modelMatrix*vec4(position,1.)).xyz;vNormal=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}`,
    fragmentShader: `varying vec3 vWorld;varying vec3 vNormal;varying vec3 vLocal;
      uniform vec3 uColor;uniform float uGloss;uniform float uEmission;uniform float uDay;uniform float uFinish;
      ${noise}${atmosphere}
      void main(){vec3 N=normalize(vNormal);if(!gl_FrontFacing)N=-N;
        vec3 L=normalize(vec3(-.35,.82,-.45)),V=normalize(cameraPosition-vWorld),H=normalize(L+V);
        float diffuse=max(dot(N,L),0.),up=N.y*.5+.5;
        float fres=pow(1.-max(dot(N,V),0.),5.);
        vec3 pigment=uColor;
        if(uFinish<.5){
          float pores=fbm(vWorld.xz*2.7+vWorld.y*vec2(.71,.39));
          pigment*=.96+pores*.07;
        }else if(uFinish<1.5){
          float board=fract(vLocal.x*4.8);
          float seam=1.-smoothstep(.015,.042,min(board,1.-board));
          float grain=noise(vec2(vLocal.x*12.,vLocal.z*.10));
          pigment*=.95+grain*.06;
          pigment=mix(pigment,vec3(.30,.23,.16),seam*.38);
        }
        vec3 ambient=mix(vec3(.28,.41,.52),vec3(.61,.71,.76),up);
        vec3 sun=mix(vec3(.61,.69,.72),vec3(.84,.80,.69),uDay);
        vec3 col=pigment*(ambient*.64+sun*diffuse*.72);
        vec3 reflection=skyColor(reflect(-V,N),uDay);
        float spec=pow(max(dot(N,H),0.),mix(22.,220.,uGloss));
        col+=mix(vec3(.62,.79,.89),vec3(1.,.93,.78),uDay)*spec*(.035+uGloss*.56);
        if(uFinish>1.5&&uFinish<2.5){
          col=mix(pigment*.35,reflection,.30+fres*.60);
          float reflectedBand=smoothstep(.30,.65,reflect(-V,N).y);
          col+=vec3(.40,.62,.70)*reflectedBand*.13+vec3(.70,.89,.95)*spec*.6;
        }else if(uFinish>2.5&&uFinish<3.5){
          col=mix(col,reflection,.44+fres*.40)+vec3(.95)*spec*.68;
        }else if(uFinish>3.5){
          col+=pigment*mix(.075,.20,uDay)*(1.-diffuse*.5);
          col=mix(col,reflection,fres*.19);
        }
        col=mix(col,uColor*1.12,uEmission);
        ${fog}gl_FragColor=vec4(col,1.);
      }`,
    toneMapped: false,
  });
}
export function oceanMaterial(environment: SeaEnvironment) {
  return new ShaderMaterial({
    uniforms: {
      ...environment,
      uIslands: {
        value: coastlines.map((s, i) => new Vector4(s.x, s.z, s.r, i * 0.83)),
      },
    },
    vertexShader: `uniform float uTime;varying vec3 vWorld;
      void main(){vec3 p=position;
      float displacement=1.-smoothstep(100.,290.,length(cameraPosition.xz-p.xz));
      p.y=(.22*sin(p.x*.13+p.z*.19+uTime*.72)+.12*sin(p.x*.33-p.z*.21-uTime*.93)+.045*sin(p.x*.73+p.z*.6+uTime*1.1))*displacement;
      vWorld=(modelMatrix*vec4(p,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}`,
    fragmentShader: `uniform float uTime;uniform float uDay;uniform vec3 uBoat;uniform float uBoatLift;uniform vec4 uIslands[${coastlines.length}];varying vec3 vWorld;
      ${noise}${atmosphere}
      void main(){vec2 p=vWorld.xz;float t=uTime;vec3 V=normalize(cameraPosition-vWorld);
        float a=cos(p.x*.13+p.y*.19+t*.72),b=cos(p.x*.33-p.y*.21-t*.93),c=cos(p.x*.73+p.y*.6+t*1.1);
        vec2 d=vec2(.22*.13*a+.12*.33*b+.045*.73*c,.22*.19*a-.12*.21*b+.045*.6*c);
        float detail=1.-smoothstep(90.,380.,length(cameraPosition-vWorld));
        d+=vec2(sin(p.x*.92+p.y*.61+t*.73),cos(p.x*.64-p.y*.94-t*.62))*.024*detail;
        d+=vec2(sin(p.x*2.7+p.y*1.9-t*1.8),cos(p.x*1.7-p.y*2.3+t*1.3))*.006*detail;
        vec2 bend=vec2(sin(p.y*.017)+cos(p.x*.012),cos(p.x*.022)+sin(p.y*.019));
        d+=vec2(sin(p.x*.074+p.y*.065+bend.x*1.3+t*.31),cos(p.x*.051-p.y*.080+bend.y*1.2-t*.24))*.026;
        d*=mix(.10,1.,1.-smoothstep(110.,480.,length(cameraPosition-vWorld)));
        vec3 N=normalize(vec3(-d.x,1.,-d.y));
        float basin=length((p-vec2(10.,10.))/vec2(150.,130.));
        float depth=10.+14.*smoothstep(.3,1.8,basin),shore=1000.;
        for(int i=0;i<${coastlines.length};i++){
          vec2 relative=p-uIslands[i].xy;float angle=atan(relative.y,relative.x);
          float coast=uIslands[i].z*(.91+.035*sin(angle*3.+uIslands[i].w)+.035*cos(angle*7.-uIslands[i].w));
          float edge=length(relative)-coast;
          shore=min(shore,abs(edge));
          float shelf=max(0.,edge)/(uIslands[i].z*1.9);
          depth=min(depth,1.2+19.*smoothstep(0.,1.,shelf));
        }
        // The seabed is an analytic optical layer, not a transparent flat blue
        // plane: shallow sand transmits light; deeper channels absorb warm light.
        vec2 bottom=p+N.xz*depth*.75;
        float reef=fbm(bottom*.065);
        float sandRipple=.5+.5*sin(bottom.x*1.6+sin(bottom.y*.28)*2.);
        vec3 sand=mix(vec3(.56,.64,.51),vec3(.86,.83,.64),reef);
        sand*=.94+sandRipple*.06;
        vec2 q=bottom*.65+vec2(t*.075,-t*.045);
        float caustic=pow(1.-abs(sin(q.x+sin(q.y*.93+t*.2)*.72)*cos(q.y+sin(q.x*.89-t*.17)*.72)),16.);
        sand+=vec3(.72,.96,.77)*caustic*.22*exp(-depth*.13);
        vec3 absorption=exp(-vec3(.31,.10,.066)*depth);
        vec3 deep=mix(vec3(.015,.105,.205),vec3(.008,.20,.37),uDay);
        vec3 waterColor=mix(vec3(.015,.36,.40),deep,smoothstep(2.,24.,depth));
        vec3 col=sand*absorption+waterColor*(1.-absorption);
        col*=mix(.64,1.0,uDay);
        float fres=.025+.975*pow(1.-max(dot(N,V),0.),5.);
        col=mix(col,skyColor(reflect(-V,N),uDay),fres*.84);
        vec3 L=normalize(vec3(-.35,.82,-.45)),H=normalize(V+L);
        float sparkle=pow(max(dot(N,H),0.),210.);
        col+=mix(vec3(.36,.61,.79),vec3(1.,.94,.76),uDay)*sparkle*.85;
        float shoreline=exp(-shore*shore*1.4)*( .60+.40*sin(t*.65+p.x*.32+p.y*.27));
        col=mix(col,vec3(.78,.91,.83),shoreline*.46);
        vec2 bp=p-uBoat.xy;float co=cos(uBoat.z),si=sin(uBoat.z);vec2 local=vec2(co*bp.x+si*bp.y,-si*bp.x+co*bp.y);
        float shadow=exp(-dot(local/vec2(3.1,11.4),local/vec2(3.1,11.4))*1.8);
        col*=1.-shadow*.25*exp(-max(uBoatLift,0.)*.25);
        ${fog}gl_FragColor=vec4(col,1.);
      }`,
    toneMapped: false,
  });
}
export function skyMaterial(environment: SeaEnvironment) {
  return new ShaderMaterial({
    uniforms: { ...environment },
    side: BackSide,
    depthWrite: false,
    toneMapped: false,
    vertexShader:
      "varying vec3 vWorld;void main(){vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}",
    fragmentShader: `varying vec3 vWorld;uniform float uDay;uniform float uTime;${noise}${atmosphere}
      void main(){vec3 ray=normalize(vWorld-cameraPosition);vec3 col=skyColor(ray,uDay);
        float sun=pow(max(dot(ray,normalize(vec3(-.35,.82,-.45))),0.),900.);
        col+=vec3(1.,.84,.55)*sun*.7;
        vec2 cloudPoint=ray.xz/max(ray.y,.07)*.72+vec2(uTime*.001,0.);
        float cloud=fbm(cloudPoint);
        float veil=smoothstep(.58,.83,cloud)*smoothstep(.01,.25,ray.y)*.18;
        col=mix(col,vec3(.93,.94,.87),veil);gl_FragColor=vec4(col,1.);
      }`,
  });
}
