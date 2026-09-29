import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  DynamicDrawUsage,
  Mesh,
  ShaderMaterial,
} from "three";
import { waveHeight, type BoatState } from "../systems/boatController";
import type { SeaEnvironment } from "./materials";

type Sample = {
  x: number;
  z: number;
  heading: number;
  time: number;
  speed: number;
};
const MAX_SAMPLES = 100;
/** A bounded pair of wake ribbons remembers actual positions along the course.
 * No emitter or particle loop runs while the yacht is at anchor. */
export class Wake {
  samples: Sample[] = [];
  lastSample = 0;
  positions = new Float32Array(MAX_SAMPLES * 18 * 3);
  alphas = new Float32Array(MAX_SAMPLES * 18);
  geometry = new BufferGeometry();
  mesh: Mesh;
  constructor(environment: SeaEnvironment) {
    this.geometry.setAttribute(
      "position",
      new BufferAttribute(this.positions, 3).setUsage(DynamicDrawUsage),
    );
    this.geometry.setAttribute(
      "alpha",
      new BufferAttribute(this.alphas, 1).setUsage(DynamicDrawUsage),
    );
    this.geometry.setDrawRange(0, 0);
    this.mesh = new Mesh(
      this.geometry,
      new ShaderMaterial({
        uniforms: { ...environment },
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
        toneMapped: false,
        vertexShader:
          "attribute float alpha;varying float vAlpha;varying vec3 vPosition;void main(){vAlpha=alpha;vPosition=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
        fragmentShader:
          "varying float vAlpha;varying vec3 vPosition;uniform float uTime;void main(){float texture=sin(vPosition.x*3.8+vPosition.z*4.7+uTime)*sin(vPosition.z*6.-vPosition.x*2.7-uTime*1.3);gl_FragColor=vec4(.71,.85,.79,vAlpha*(.55+.32*texture));}",
      }),
    );
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1;
  }
  update(boat: BoatState, time: number, sailing: boolean) {
    if (!sailing && this.samples.length) this.samples.length = 0;
    if (
      sailing &&
      Math.abs(boat.speed) > 0.55 &&
      time - this.lastSample > 0.075
    ) {
      this.lastSample = time;
      this.samples.unshift({
        x: boat.x - Math.sin(boat.heading) * 8.7,
        z: boat.z + Math.cos(boat.heading) * 8.7,
        heading: boat.heading,
        time,
        speed: Math.abs(boat.speed),
      });
      if (this.samples.length > MAX_SAMPLES) this.samples.pop();
    }
    while (
      this.samples.length &&
      time - this.samples[this.samples.length - 1].time > 8
    )
      this.samples.pop();
    let cursor = 0;
    const vertex = (
      sample: Sample,
      side: number,
      width: number,
      opacity: number,
    ) => {
      const age = time - sample.time,
        spread = width + age * 0.59;
      const x = sample.x + Math.cos(sample.heading) * side * spread,
        z = sample.z + Math.sin(sample.heading) * side * spread;
      this.positions[cursor * 3] = x;
      this.positions[cursor * 3 + 1] = waveHeight(x, z, time) + 0.075;
      this.positions[cursor * 3 + 2] = z;
      this.alphas[cursor] =
        Math.max(0, 1 - age / 8) ** 1.8 *
        Math.min(sample.speed / 9, 1) *
        opacity;
      cursor++;
    };
    for (let i = 0; i < this.samples.length - 1; i++) {
      const a = this.samples[i],
        b = this.samples[i + 1];
      if (Math.hypot(a.x - b.x, a.z - b.z) > 5) continue;
      for (const side of [-1, 1]) {
        vertex(a, side, 1.2, 0.46);
        vertex(a, side, 1.9, 0.25);
        vertex(b, side, 1.9, 0.25);
        vertex(a, side, 1.2, 0.46);
        vertex(b, side, 1.9, 0.25);
        vertex(b, side, 1.2, 0.46);
      }
      vertex(a, -0.2, 1, 0.2);
      vertex(a, 0.2, 1, 0.2);
      vertex(b, 0.2, 1, 0.2);
      vertex(a, -0.2, 1, 0.2);
      vertex(b, 0.2, 1, 0.2);
      vertex(b, -0.2, 1, 0.2);
    }
    this.geometry.setDrawRange(0, cursor);
    if (cursor) {
      this.geometry.attributes.position.needsUpdate = true;
      this.geometry.attributes.alpha.needsUpdate = true;
    }
  }
  dispose() {
    this.geometry.dispose();
    (this.mesh.material as ShaderMaterial).dispose();
  }
}
