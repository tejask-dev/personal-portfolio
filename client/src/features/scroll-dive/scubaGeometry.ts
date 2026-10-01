import {
  AdditiveBlending, BufferGeometry, CatmullRomCurve3, Color, CylinderGeometry,
  DoubleSide, DodecahedronGeometry, Float32BufferAttribute, Group, InstancedBufferAttribute,
  InstancedMesh, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry, Quaternion,
  ShaderMaterial, SphereGeometry, TorusGeometry, TubeGeometry, Vector3,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

type V3 = [number, number, number];
const ivory = "#e4dfc7", limestone = "#c2c6aa", coral = "#d9866c", ink = "#14383d";
const up = new Vector3(0, 1, 0);
const clamp = (n: number) => Math.max(0, Math.min(1, n));
export const smooth = (a: number, b: number, n: number) => { const t = clamp((n - a) / (b - a)); return t * t * (3 - 2 * t); };
export function scubaCameraFrame(progress: number, aspect: number) {
  const p = clamp(progress), phone = smooth(1.1, .65, aspect);
  return {
    phone,
    x: phone * 3.95,
    y: p <= .25 ? 2.8 * (1 - p / .25) : -(p - .25) / .75 * 24,
    z: 13.8 - p * 1.6 + 4 * (1 - smooth(0, .30, p)),
    fov: 43 + phone * 8,
    lookDown: (1 - phone) * .7 + phone * .12,
  };
}

/** Original geometry, vertex-painted and batched by moving part. No textures or
 * downloaded models. Local coordinates stay in metres-like fictional units. */
class Sculpt {
  pieces: BufferGeometry[] = [];
  add(source: BufferGeometry, position: V3, scale: V3, color: string, rotation?: V3) {
    const geometry = source.index ? source.toNonIndexed() : source.clone();
    source.dispose();
    geometry.deleteAttribute("uv");
    const transform = new Object3D(); transform.position.set(...position); transform.scale.set(...scale);
    if (rotation) transform.rotation.set(...rotation);
    transform.updateMatrix(); geometry.applyMatrix4(transform.matrix);
    const c = new Color(color), colors = new Float32Array(geometry.getAttribute("position").count * 3);
    for (let i = 0; i < colors.length; i += 3) { colors[i] = c.r; colors[i + 1] = c.g; colors[i + 2] = c.b; }
    geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
    this.pieces.push(geometry);
  }
  ellipsoid(position: V3, scale: V3, color: string, segments = 12, rings = 8) { this.add(new SphereGeometry(1, segments, rings), position, scale, color); }
  rod(a: V3, b: V3, radius: number, color: string, endRadius = radius, segments = 7) {
    const from = new Vector3(...a), to = new Vector3(...b), delta = to.clone().sub(from);
    const geometry = new CylinderGeometry(endRadius, radius, delta.length(), segments, 1);
    geometry.applyQuaternion(new Quaternion().setFromUnitVectors(up, delta.normalize()));
    this.add(geometry, from.add(to).multiplyScalar(0.5).toArray() as V3, [1, 1, 1], color);
  }
  tube(points: V3[], radius: number, color: string, segments = 14) {
    this.add(new TubeGeometry(new CatmullRomCurve3(points.map(p => new Vector3(...p))), segments, radius, 6, false), [0, 0, 0], [1, 1, 1], color);
  }
  finish() {
    const result = mergeGeometries(this.pieces, false)!;
    this.pieces.forEach(piece => piece.dispose()); this.pieces = [];
    result.computeBoundingSphere(); return result;
  }
}

const vertex = `
  attribute vec3 color;
  #ifdef USE_INSTANCING
    attribute float aPhase;
  #endif
  uniform float uTime; uniform float uSwim;
  varying vec3 vColor; varying vec3 vNormal; varying vec3 vWorld;
  void main(){
    vec3 p=position; vec3 n=normal;
    #ifdef USE_INSTANCING
      float envelope=1.-smoothstep(-.43,.06,p.x);
      float wave=sin(uTime*4.4+aPhase-p.x*8.0)*.075*envelope*envelope*uSwim;
      p.z+=wave;
      vec4 local=instanceMatrix*vec4(p,1.);
      vNormal=normalize(mat3(modelMatrix)*mat3(instanceMatrix)*n);
    #else
      vec4 local=vec4(p,1.);
      vNormal=normalize(mat3(modelMatrix)*n);
    #endif
    vWorld=(modelMatrix*local).xyz; vColor=color;
    gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);
  }`;
const fragment = `
  uniform float uTime; uniform float uProgress; uniform float uGlow; uniform float uGround;
  varying vec3 vColor; varying vec3 vNormal; varying vec3 vWorld;
  void main(){
    float underwater=smoothstep(.13,.29,uProgress);
    float evening=smoothstep(.65,1.,uProgress);
    vec3 N=normalize(vNormal); if(!gl_FrontFacing)N=-N;
    float sun=max(0.,dot(N,normalize(vec3(-.45,.82,.48))));
    vec3 light=mix(vec3(.61,.72,.68),vec3(.97,.91,.74),sun);
    vec3 col=vColor*light*(.60+sun*.58)*(1.-evening*.37);
    float a=sin(vWorld.x*2.3+sin(vWorld.z*1.6+uTime*.35));
    float b=sin(vWorld.z*2.8-vWorld.x*.6+uTime*.47);
    float caustic=pow(max(0.,1.-abs(a+b)*1.8),5.);
    col+=vec3(.28,.48,.37)*caustic*max(N.y,0.)*underwater*(1.-evening)*.22;
    col+=vColor*uGlow*(.45+evening*.65);
    vec3 water=mix(vec3(.025,.32,.35),vec3(.005,.07,.115),evening);
    float path=length(cameraPosition-vWorld);
    col=mix(col,water,(1.-exp(-path*.035))*underwater);
    vec2 groundEdge=vec2(vWorld.x/35.,(vWorld.z+11.)/32.5);
    float alpha=uGround>.5?1.-smoothstep(.60,.99,max(abs(groundEdge.x),abs(groundEdge.y))):1.;
    gl_FragColor=vec4(col,alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

export function createScubaWorld() {
  const group = new Group(); group.name = "Original Open Water scuba descent";
  const clock = { value: 0 }, progress = { value: 0 };
  const makeMaterial = (swim = 0, glow = 0) => new ShaderMaterial({
    uniforms: { uTime: clock, uProgress: progress, uSwim: { value: swim }, uGlow: { value: glow }, uGround: { value: 0 } },
    vertexShader: vertex, fragmentShader: fragment, side: DoubleSide,
  });
  const solid = makeMaterial(), fishMaterial = makeMaterial(1), luminous = makeMaterial(0, .9);
  const mesh = (shape: Sculpt, name: string, parent = group, material = solid) => {
    const result = new Mesh(shape.finish(), material); result.name = name; parent.add(result); return result;
  };

  // A reef wall built in depth, with shelves and a walk-through-sized arch.
  // Its left edge stays open water so the story has breathing room.
  const rock = new Sculpt();
  const boulder = (p: V3, s: V3, seed: number) => {
    const geometry = new DodecahedronGeometry(1, 1);
    const positions = geometry.getAttribute("position");
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
      const ripple = 1 + Math.sin(x * 8 + z * 4 + seed) * .06 + Math.cos(y * 11 + seed) * .04;
      positions.setXYZ(i, x * ripple, y * (1 + Math.sin(x * 6 + seed) * .04), z * ripple);
    }
    geometry.computeVertexNormals();
    rock.add(geometry, p, s, seed % 3 > 1 ? "#a6b49e" : limestone, [0, seed * .67, seed * .03]);
  };
  boulder([6.9, -8.1, -3.8], [4.8, 2.3, 3.7], 1);
  boulder([9.4, -15, -6.1], [4.2, 8.8, 4.5], 2);
  boulder([5.9, -17.7, -5], [4.3, 1.65, 3.8], 3);
  boulder([8.1, -24.5, -3], [5.4, 2.6, 4.8], 4);
  boulder([8.1, -28.7, -3.2], [5.3, 2.8, 4.8], 4.5);
  boulder([12.8, -15.5, 1.5], [3.6, 12.5, 5.2], 5);
  boulder([-4.8, -26.2, -10], [4.8, 3.5, 4.9], 6);
  // The opening is genuine negative space between columns, not a painted hole.
  for (const x of [3.7, 8.2]) boulder([x, -12.1, -8.4], [1.25, 3.6, 1.9], x);
  for (let i = 0; i < 5; i++) {
    const angle = Math.PI * i / 4;
    boulder([5.95 + Math.cos(angle) * 2.3, -10.2 + Math.sin(angle) * 1.5, -8.4], [1.3, 1, 1.8], i + 10);
  }
  // Distant buttresses establish parallax without adding foreground clutter.
  for (let i = 0; i < 7; i++) boulder([2.5 + i * 3.6, -19 - i % 3 * 1.4, -19 - i % 2 * 4], [2.1, 7.8 + i % 3, 2.7], i + 20);
  mesh(rock, "Sculpted limestone wall, terraces and arch");

  const garden = new Sculpt(), fans = new Sculpt();
  function branchCoral(x: number, y: number, z: number, size: number, seed: number, color: string) {
    for (let limb = 0; limb < 5; limb++) {
      const angle = limb * 2.4 + seed;
      const end: V3 = [x + Math.cos(angle) * size * .48, y + size * (.65 + limb % 3 * .18), z + Math.sin(angle) * size * .48];
      const bend: V3 = [x + Math.cos(angle) * size * .17, y + size * .4, z + Math.sin(angle) * size * .17];
      garden.rod([x, y, z], bend, size * .072, color, size * .053, 6);
      garden.rod(bend, end, size * .053, color, size * .018, 6);
      for (const side of [-1, 1]) {
        const tip: V3 = [end[0] + Math.cos(angle + side * .8) * size * .22, end[1] + size * .2, end[2] + Math.sin(angle + side * .8) * size * .22];
        garden.rod([end[0] * .55 + bend[0] * .45, end[1] * .55 + bend[1] * .45, end[2] * .55 + bend[2] * .45], tip, size * .026, color, size * .009, 5);
      }
    }
  }
  for (const [x, y, z, scale, seed] of [
    [4.8, -6.2, -2.6, 1.35, 1], [7.4, -6.6, -1.4, .9, 2], [8.5, -6.7, -4.5, 1.1, 3],
    [4, -16.4, -3.5, 1.4, 4], [7, -16.5, -2.3, 1.15, 5], [9, -16.9, -5, .8, 6],
    [5.1, -23, -.5, 1.65, 7], [8, -22.8, -1.6, 1.25, 8], [10, -23.1, 0, .9, 9],
  ]) branchCoral(x, y, z, scale, seed, seed % 3 === 0 ? "#d6ba7c" : seed % 2 ? coral : "#84b0a1");
  // Coral plates have a scalloped rim and an actual underside.
  for (let i = 0; i < 11; i++) {
    const depth = i < 4 ? -6.25 : i < 7 ? -16.3 : -22.8;
    const x = 4.1 + (i * 1.37 % 5), z = -4.6 + (i * .83 % 3.5);
    garden.add(new CylinderGeometry(.85, .7, .11, 13, 1), [x, depth + i % 2 * .3, z], [1 + i % 3 * .22, 1, .7], i % 2 ? "#c5ad83" : "#aebd95");
    garden.rod([x, depth - .3, z], [x, depth, z], .07, limestone, .05);
  }
  // Delicate sea fans are branching three-dimensional filigree, not billboards.
  for (const [x, y, z, s] of [[8.9, -5.8, -2.6, 1.6], [8, -15.7, -3.4, 1.9], [4.4, -22.8, -3, 1.6]]) {
    for (let branch = -4; branch <= 4; branch++) {
      const tip: V3 = [x + branch * .19 * s, y + (1.4 - Math.abs(branch) * .095) * s, z + Math.sin(branch) * .06];
      fans.rod([x, y, z], tip, .035 * s, "#b97272", .012 * s, 5);
      for (let fork = 1; fork < 5; fork++) {
        const f = fork / 5, a: V3 = [x + (tip[0] - x) * f, y + (tip[1] - y) * f, z];
        fans.rod(a, [a[0] + .2 * s * (branch < 0 ? -1 : 1), a[1] + .12 * s, z + .035], .018 * s, "#cc8f85", .006 * s, 4);
      }
    }
  }
  mesh(garden, "Staghorn branches and layered coral plates");
  mesh(fans, "Open sea fan filigree");

  const sand = new Sculpt();
  const sandGeometry = new PlaneGeometry(70, 65, 24, 24); sandGeometry.rotateX(-Math.PI / 2);
  const sp = sandGeometry.getAttribute("position");
  for (let i = 0; i < sp.count; i++) sp.setY(i, Math.sin(sp.getX(i) * .15) * .7 + Math.sin(sp.getZ(i) * .17) * .5);
  sandGeometry.computeVertexNormals(); sand.add(sandGeometry, [0, -29.8, -11], [1, 1, 1], "#dad9b8");
  const sandMaterial = makeMaterial();
  sandMaterial.uniforms.uGround.value = 1;
  sandMaterial.transparent = true; sandMaterial.depthWrite = false; sandMaterial.forceSinglePass = true;
  mesh(sand, "Rippling sand basin with an absorbed distant edge", group, sandMaterial);

  // Human anatomy and scuba equipment remain readable at phone scale.
  const diver = new Group(); diver.name = "Original human scuba diver"; group.add(diver);
  const body = new Sculpt();
  body.ellipsoid([0, 0, 0], [.39, .64, .23], ink, 16);
  body.ellipsoid([0, -.49, 0], [.31, .26, .22], ink);
  body.ellipsoid([0, .72, .02], [.125, .2, .12], "#be9175");
  body.ellipsoid([0, 1.03, .02], [.25, .3, .235], "#ba866b", 16);
  body.add(new SphereGeometry(.257, 14, 7, 0, Math.PI * 2, 0, Math.PI * .54), [0, 1.055, 0], [1, 1, .97], ink);
  for (const side of [-1, 1]) {
    body.rod([side * .3, .4, .01], [side * .62, .06, .06], .14, ink, .115, 10);
    body.rod([side * .62, .06, .06], [side * .63, .37, .39], .105, ink, .075, 9);
    body.ellipsoid([side * .63, .39, .41], [.09, .13, .07], "#be9175");
    body.ellipsoid([side * .31, .41, .05], [.15, .17, .16], coral);
    body.rod([side * .60, .27, .30], [side * .625, .34, .365], .09, ivory, .086, 10);
    body.tube([[side * .24, .5, -.08], [side * .25, .49, .21], [side * .2, .03, .255], [side * .22, -.29, .19]], .044, "#bcbf9e");
    // Mask has twin lenses and a broad seal; it reads without oversized eyes.
    body.ellipsoid([side * .125, 1.045, .227], [.176, .126, .056], ink);
    body.ellipsoid([side * .124, 1.048, .276], [.131, .083, .026], "#9dc5b7");
    body.ellipsoid([side * .121, 1.06, .295], [.081, .028, .008], "#e1e2c8");
  }
  body.tube([[-.24, 1.04, .10], [-.25, 1.04, -.14], [0, 1.04, -.24], [.25, 1.04, -.14], [.24, 1.04, .10]], .038, ink);
  body.ellipsoid([0, .88, .245], [.055, .079, .076], "#be9175");
  body.ellipsoid([0, .792, .283], [.11, .085, .09], ink);
  body.ellipsoid([0, .80, .367], [.064, .047, .011], ivory);
  // The tank, valve and hose are modeled independently of the body silhouette.
  body.rod([0, -.51, -.36], [0, .74, -.36], .21, "#b9c9b9", .21, 16);
  body.ellipsoid([0, -.51, -.36], [.21, .14, .21], "#b9c9b9");
  body.ellipsoid([0, .74, -.36], [.21, .14, .21], "#d7d5b9");
  body.rod([0, .82, -.36], [0, .98, -.36], .055, ink, .045, 8);
  body.rod([-.10, .93, -.36], [.10, .93, -.36], .03, coral, .03, 8);
  for (const y of [-.30, .48]) body.add(new TorusGeometry(.215, .034, 6, 16), [0, y, -.36], [1, 1, 1], ink, [Math.PI / 2, 0, 0]);
  body.tube([[0, .89, -.37], [.36, .88, -.24], [.48, .55, .2], [.26, .65, .39], [0, .8, .37]], .036, ink, 20);
  mesh(body, "Diver, mask, regulator, tank and harness", diver);
  const legs: Group[] = [];
  for (const side of [-1, 1]) {
    const leg = new Group(); leg.position.set(side * .19, -.58, 0); diver.add(leg); legs.push(leg);
    const limb = new Sculpt();
    limb.rod([0, 0, 0], [side * .05, -.57, .04], .16, ink, .12, 10);
    limb.ellipsoid([side * .05, -.57, .04], [.12, .13, .12], ink);
    limb.rod([side * .05, -.57, .04], [side * .08, -1.06, .28], .115, ink, .077, 10);
    limb.ellipsoid([side * .08, -1.09, .29], [.11, .14, .16], ink);
    const fx = side * .08;
    const fin = new BufferGeometry();
    const points = [
      [fx - .11, -1.13, .35], [fx + .11, -1.13, .35], [fx + .25, -1.80, .48], [fx - .25, -1.80, .48],
      [fx - .11, -1.13, .30], [fx + .11, -1.13, .30], [fx + .25, -1.80, .43], [fx - .25, -1.80, .43],
    ];
    fin.setAttribute("position", new Float32BufferAttribute(points.flat(), 3));
    fin.setIndex([0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6, 0, 4, 5, 0, 5, 1, 3, 2, 6, 3, 6, 7, 0, 3, 7, 0, 7, 4, 1, 5, 6, 1, 6, 2]);
    fin.computeVertexNormals(); limb.add(fin, [0, 0, 0], [1, 1, 1], coral);
    for (const rail of [-1, 1]) limb.rod([fx + rail * .075, -1.2, .36], [fx + rail * .18, -1.75, .475], .017, ivory, .014, 5);
    mesh(limb, `Articulated ${side < 0 ? "left" : "right"} leg and fin`, leg);
  }

  // One original fusilier-like school model, with flexible tails in the vertex
  // shader. Each school is a single instanced draw with individual phase.
  const fish = new Sculpt();
  fish.ellipsoid([0, 0, 0], [.28, .082, .061], "#bac9b0", 10, 6);
  fish.ellipsoid([.03, .025, 0], [.225, .059, .053], "#578b91", 10, 5);
  for (const side of [-1, 1]) fish.ellipsoid([.185, .019, side * .049], [.015, .015, .011], "#122e35", 6, 4);
  const tail = new BufferGeometry();
  tail.setAttribute("position", new Float32BufferAttribute([-.21, 0, 0, -.45, .15, 0, -.39, 0, 0, -.21, 0, 0, -.39, 0, 0, -.45, -.15, 0, -.08, .069, 0, -.12, .13, 0, .06, .069, 0], 3));
  tail.computeVertexNormals(); fish.add(tail, [0, 0, 0], [1, 1, 1], "#d7bc72");
  const fishGeometry = fish.finish();
  const schools = [
    { count: 27, center: [4.7, -4.5, -2.8] as V3, radius: 2.7, speed: .22 },
    { count: 31, center: [5.3, -12.8, -3.9] as V3, radius: 3.3, speed: -.17 },
    { count: 22, center: [4.4, -21.5, -2.7] as V3, radius: 3.5, speed: .14 },
  ].map((school, index) => {
    const geometry = fishGeometry.clone();
    geometry.setAttribute("aPhase", new InstancedBufferAttribute(Float32Array.from({ length: school.count }, (_, i) => i * 2.399), 1));
    const model = new InstancedMesh(geometry, fishMaterial, school.count); model.name = `Responsive silhouette school ${index + 1}`;
    model.frustumCulled = false; group.add(model); return { ...school, model };
  });
  fishGeometry.dispose();

  // Sparse deep-water lanterns close the chapter without suggesting a game UI.
  const deep = new Sculpt();
  for (let i = 0; i < 23; i++) {
    const x = 1.6 + Math.sin(i * 2.399) * 4, y = -23.8 + (i % 6) * .17, z = -3 + Math.cos(i * 2.399) * 3.1;
    deep.ellipsoid([x, y, z], [.042, .12 + i % 3 * .025, .042], i % 3 ? "#7fd6bb" : "#dcc590", 6);
  }
  const lanterns = mesh(deep, "Small living lights in the evening reef", group, luminous);

  const bubbleGeometry = new SphereGeometry(1, 7, 5);
  const bubbleMaterial = new MeshBasicMaterial({ color: "#d8eee5", transparent: true, opacity: .3, depthWrite: false });
  const bubbles = new InstancedMesh(bubbleGeometry, bubbleMaterial, 18); bubbles.name = "Regulator bubbles"; bubbles.frustumCulled = false; group.add(bubbles);

  const raysGeometry = new BufferGeometry(), rayPositions: number[] = [], rayUV: number[] = [];
  for (let i = 0; i < 5; i++) {
    const x = -2.5 + i * 4.1, z = -8 - i % 3 * 4, width = .19 + i % 2 * .16;
    const corners = [[x - width, -.05, z], [x + width, -.05, z], [x + 4 + width * 4, -29, z + 3], [x + 4 - width * 4, -29, z + 3]];
    const uv = [[0, 0], [1, 0], [1, 1], [0, 1]];
    for (const j of [0, 1, 2, 0, 2, 3]) { rayPositions.push(...corners[j]); rayUV.push(...uv[j]); }
  }
  raysGeometry.setAttribute("position", new Float32BufferAttribute(rayPositions, 3)); raysGeometry.setAttribute("uv", new Float32BufferAttribute(rayUV, 2));
  const rayMaterial = new ShaderMaterial({
    uniforms: { uProgress: progress }, transparent: true, depthWrite: false, side: DoubleSide, blending: AdditiveBlending,
    vertexShader: `varying vec2 vUV;void main(){vUV=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `uniform float uProgress;varying vec2 vUV;void main(){float feather=pow(max(0.,1.-abs(vUV.x*2.-1.)),2.);float alpha=feather*(1.-smoothstep(.60,1.,vUV.y))*.16*(1.-smoothstep(.6,1.,uProgress)*.88);gl_FragColor=vec4(.43,.71,.61,alpha);#include <colorspace_fragment>}`.replace(";#include", ";\n#include"),
  });
  const rays = new Mesh(raysGeometry, rayMaterial); rays.name = "Soft daylight shafts"; group.add(rays);
  rayMaterial.forceSinglePass = true;

  const seaMaterial = new ShaderMaterial({
    uniforms: { uTime: clock, uProgress: progress }, transparent: true, opacity: .8, side: DoubleSide, depthWrite: false,
    vertexShader: `uniform float uTime;varying vec3 vP;void main(){vec3 p=position;p.y+=sin(p.x*.52+uTime*.38)*.055+sin(p.z*.64-uTime*.31)*.065;vP=p;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
    fragmentShader: `uniform float uTime;uniform float uProgress;varying vec3 vP;void main(){float lines=pow(max(0.,sin(vP.x*1.12+sin(vP.z*.85+uTime*.3))*sin(vP.z*1.18-uTime*.26)),7.);vec3 col=mix(vec3(.10,.38,.38),vec3(.48,.72,.66),lines*.6);float below=smoothstep(.2,.29,uProgress);float edge=1.-smoothstep(29.,44.,max(abs(vP.x),abs(vP.z)));gl_FragColor=vec4(mix(col,vec3(.29,.57,.56),below),mix(.71,.24,below)*mix(1.,edge,below));#include <colorspace_fragment>}`.replace(";#include", ";\n#include"),
  });
  const surface = new PlaneGeometry(90, 90, 36, 36); surface.rotateX(-Math.PI / 2);
  const sea = new Mesh(surface, seaMaterial); sea.name = "Moving waterline and clear sea surface"; group.add(sea);
  seaMaterial.forceSinglePass = true;

  const dummy = new Object3D();
  let disposed = false;
  return {
    group, diver, clock, progress, legs, sea,
    update(time: number, p: number, aspect: number) {
      clock.value = time; progress.value = p;
      const view = scubaCameraFrame(p, aspect), scale = 1.02 - view.phone * .26;
      const distance = view.z - 1.3;
      const viewHeight = 2 * Math.tan(view.fov * Math.PI / 360) * distance;
      const opticalY = view.y - view.lookDown * distance / (view.z + 12);
      // Frame the figure's centre, not its torso origin: its fins extend farther
      // below the origin than its head extends above. The starting surface pose
      // stays physically half submerged, with a wider establishing camera.
      const figureCentre = .67 + view.phone * .065;
      const framedY = opticalY + (.5 - figureCentre) * viewHeight + .5 * scale;
      const y = -.35 + (framedY + .35) * smooth(0, .16, p);
      diver.position.set(4.05 + (1 - view.phone) * 1.2 * (1 - smooth(0, .30, p)) + Math.sin(time * .24) * .14, y, 1.3);
      diver.rotation.set(Math.sin(time * .65) * .025, -.38 + Math.sin(time * .29) * .055, -.10 - smooth(.10, .45, p) * .16);
      diver.scale.setScalar(scale);
      legs.forEach((leg, index) => { leg.rotation.x = .13 + Math.sin(time * 2.25 + index * Math.PI) * .22; leg.rotation.z = (index ? 1 : -1) * .07; });
      for (const school of schools) {
        for (let i = 0; i < school.count; i++) {
          const angle = time * school.speed + i * .195, lane = i % 4, radius = school.radius + lane * .28;
          dummy.position.set(school.center[0] + Math.cos(angle) * radius, school.center[1] + Math.sin(i * 1.73) * .62 + Math.sin(time * .7 + i) * .12, school.center[2] + Math.sin(angle) * radius * .42 + lane * .26);
          const dx = -Math.sin(angle) * school.speed, dz = Math.cos(angle) * school.speed * .42;
          dummy.rotation.set(0, -Math.atan2(dz, dx), Math.sin(time + i) * .018);
          dummy.scale.setScalar(.8 + i % 5 * .12); dummy.updateMatrix(); school.model.setMatrixAt(i, dummy.matrix);
        }
        school.model.instanceMatrix.needsUpdate = true;
      }
      for (let i = 0; i < bubbles.count; i++) {
        const cycle = (time * .22 + i / bubbles.count) % 1;
        dummy.position.set(diver.position.x + .10 + Math.sin(i * 2.2 + cycle * 7) * (.04 + cycle * .33), diver.position.y + .89 + cycle * 5.4, 1.73 + Math.cos(i * 1.7 + cycle * 8) * .11);
        dummy.rotation.set(0, 0, 0); dummy.scale.setScalar((.024 + i % 4 * .011) * (1 + cycle)); dummy.updateMatrix(); bubbles.setMatrixAt(i, dummy.matrix);
      }
      bubbles.instanceMatrix.needsUpdate = true;
      bubbles.visible = p > .09; rays.visible = p > .03; lanterns.visible = p > .65;
      sea.visible = p < .74;
    },
    dispose() {
      if (disposed) return; disposed = true;
      const geometries = new Set<BufferGeometry>(), materials = new Set<ShaderMaterial | MeshBasicMaterial>();
      group.traverse(object => {
        if (!(object instanceof Mesh)) return;
        geometries.add(object.geometry);
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material as ShaderMaterial | MeshBasicMaterial);
        if (object instanceof InstancedMesh) object.dispose();
      });
      geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose()); group.clear();
    },
  };
}
