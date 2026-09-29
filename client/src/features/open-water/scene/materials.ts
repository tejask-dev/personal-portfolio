import { BackSide, Color, ShaderMaterial, Vector3 } from "three";
import { destinations } from "../data/world";

// These compact analytic shaders are adapted from the owner-supplied Open Water
// prototype. The surface and the controller use the same three wave terms.
export type SeaEnvironment = {
  uTime: { value: number };
  uDay: { value: number };
  uBoat: { value: Vector3 };
};
export function createEnvironment(): SeaEnvironment {
  return {
    uTime: { value: 14 },
    uDay: { value: 0 },
    uBoat: { value: new Vector3(34, 27, 0.22) },
  };
}
const noise = `
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);}
`;
const fog = `float fog=1.-exp(-pow(length(cameraPosition-vWorld)*.003,1.9));
col=mix(col,mix(vec3(.58,.64,.62),vec3(.70,.79,.76),uDay),fog);`;
export function oceanMaterial(environment: SeaEnvironment) {
  return new ShaderMaterial({
    uniforms: {
      ...environment,
      uStations: { value: destinations.map((s) => new Vector3(s.x, s.z, s.r)) },
    },
    vertexShader: `
      uniform float uTime; varying vec3 vWorld;
      void main(){vec3 p=position;
      p.y=.22*sin(p.x*.13+p.z*.19+uTime*.72)+.12*sin(p.x*.33-p.z*.21-uTime*.93)+.045*sin(p.x*.73+p.z*.6+uTime*1.1);
      vWorld=(modelMatrix*vec4(p,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}`,
    fragmentShader: `
      uniform float uTime;uniform float uDay;uniform vec3 uBoat;uniform vec3 uStations[4];varying vec3 vWorld;
      ${noise}
      void main(){vec2 p=vWorld.xz;float t=uTime;
      float a=cos(p.x*.13+p.y*.19+t*.72),b=cos(p.x*.33-p.y*.21-t*.93),c=cos(p.x*.73+p.y*.6+t*1.1);
      vec2 d=vec2(.22*.13*a+.12*.33*b+.045*.73*c,.22*.19*a-.12*.21*b+.045*.6*c);
      d+=vec2(sin(p.x*.92+p.y*.72+t*1.2+sin(p.y*.4+p.x*.22)),cos(p.x*.62-p.y*1.15-t*.85+sin(p.x*.35-p.y*.28)))*.048;
      d+=vec2(sin(p.x*3.1+p.y*2.4+sin(p.y*.8)-t*2.),cos(p.x*2.2-p.y*3.1+sin(p.x*.7)+t*1.4))*.008;
      d+=vec2(noise(p*.85+vec2(t*.18,0.))-.5,noise(p*.91+vec2(21.,t*-.13))-.5)*.19;
      vec3 N=normalize(vec3(-d.x,1.,-d.y)),V=normalize(cameraPosition-vWorld);
      float fres=pow(1.-max(dot(N,V),0.),4.);float nearLand=0.,foam=0.;
      for(int i=0;i<4;i++){float r=length(p-uStations[i].xy);nearLand=max(nearLand,exp(-pow(max(0.,r-uStations[i].z)*.064,2.))*.74);foam=max(foam,exp(-pow((r-uStations[i].z-.6)*2.5,2.))*.23);}
      vec3 deep=mix(vec3(.025,.19,.29),vec3(.025,.29,.40),uDay),shallow=mix(vec3(.055,.39,.43),vec3(.06,.51,.52),uDay);
      vec3 col=mix(deep,shallow,nearLand);
      float pattern=sin(p.x*.3+sin(p.y*.36+t*.17))*sin(p.y*.33+sin(p.x*.29-t*.13));
      col+=vec3(.10,.24,.19)*smoothstep(.70,.93,pattern)*nearLand*.22;
      vec3 R=reflect(-V,N);vec3 reflected=mix(vec3(.52,.62,.63),vec3(.13,.28,.38),pow(max(R.y,0.),.6));
      col=mix(col,reflected,.16+fres*.54);
      vec3 H=normalize(V+normalize(vec3(-.55,.72,-.8)));
      col+=vec3(.83,.85,.71)*pow(max(dot(N,H),0.),160.)*.38+vec3(.20,.31,.34)*pow(max(dot(N,H),0.),16.)*.12;
      vec2 bp=p-uBoat.xy;float co=cos(uBoat.z),si=sin(uBoat.z);vec2 local=vec2(co*bp.x+si*bp.y,-si*bp.x+co*bp.y);
      col*=1.-exp(-dot(local/vec2(3.2,7.9),local/vec2(3.2,7.9))*1.7)*.52;
      col=mix(col,vec3(.55,.72,.69),foam*(.6+.4*sin(t+p.x)));
      ${fog}
      gl_FragColor=vec4(col,1.);}`,
    toneMapped: false,
  });
}
export function architectureMaterial(
  color: string,
  environment: SeaEnvironment,
  gloss = 0.15,
  emission = 0,
) {
  // Color values deliberately stay in the prototype's display-referred palette;
  // this authored shader owns its lighting and does not use renderer tone mapping.
  const palette = new Color(color).convertLinearToSRGB();
  return new ShaderMaterial({
    uniforms: {
      ...environment,
      uColor: { value: palette },
      uGloss: { value: gloss },
      uEmission: { value: emission },
    },
    vertexShader: `varying vec3 vWorld;varying vec3 vNormal;
      void main(){vWorld=(modelMatrix*vec4(position,1.)).xyz;vNormal=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}`,
    fragmentShader: `varying vec3 vWorld;varying vec3 vNormal;uniform vec3 uColor;uniform float uGloss;uniform float uEmission;uniform float uDay;
      void main(){vec3 n=normalize(vNormal);if(!gl_FrontFacing)n=-n;
      vec3 L=normalize(vec3(-.45,.8,.1)),V=normalize(cameraPosition-vWorld),H=normalize(L+V);
      float diffuse=max(dot(n,L),0.),hemi=n.y*.5+.5;
      vec3 light=mix(vec3(.19,.32,.39),vec3(.75,.85,.83),hemi);
      vec3 col=uColor*(light*.69+diffuse*mix(.62,.93,uDay));
      col+=vec3(1.,.93,.8)*pow(max(dot(n,H),0.),mix(16.,130.,uGloss))*(.07+uGloss*.75);
      col+=vec3(.38,.60,.64)*pow(1.-max(dot(n,V),0.),4.)*uGloss*.20;
      col=mix(col,uColor*1.35,uEmission);${fog}gl_FragColor=vec4(col,1.);}`,
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
    fragmentShader: `varying vec3 vWorld;uniform float uDay;uniform float uTime;${noise}
      void main(){vec3 ray=normalize(vWorld-cameraPosition);float elevation=max(ray.y,0.);
      vec3 low=mix(vec3(.58,.64,.62),vec3(.70,.79,.76),uDay),high=mix(vec3(.13,.29,.39),vec3(.31,.53,.68),uDay);
      vec3 col=mix(low,high,pow(elevation,.5));
      col+=vec3(.7,.49,.27)*pow(max(dot(ray,normalize(vec3(-.45,.24,-.7))),0.),240.)*.65;
      vec2 cp=ray.xz/max(ray.y,.08)*1.7+vec2(uTime*.001,0.);
      float cloud=noise(cp)*.55+noise(cp*2.1)*.25+noise(cp*4.3)*.12;
      col=mix(col,vec3(.9,.91,.82),smoothstep(.56,.75,cloud)*smoothstep(0.,.2,ray.y)*.24);
      gl_FragColor=vec4(col,1.);}`,
  });
}
