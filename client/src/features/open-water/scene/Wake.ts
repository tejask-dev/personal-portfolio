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
import { vesselProfile } from "../data/vessels";
type Sample = {
  x: number;
  z: number;
  heading: number;
  time: number;
  speed: number;
};
const MAX_SAMPLES = 120,
  MAX_VERTICES = MAX_SAMPLES * 18 + 210;
/** Bounded wake ribbons record the travelled path. Bow foam and a single landing
 * ring share this buffer and the root's clock; nothing has an independent loop. */
export class Wake {
  samples: Sample[] = [];
  lastSample = 0;
  lastLanding = -1;
  splash: { x: number; z: number; time: number; strength: number } | null =
    null;
  positions = new Float32Array(MAX_VERTICES * 3);
  alphas = new Float32Array(MAX_VERTICES);
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
          "varying float vAlpha;varying vec3 vPosition;uniform float uTime;void main(){float foam=sin(vPosition.x*3.8+vPosition.z*4.7+uTime)*sin(vPosition.z*6.-vPosition.x*2.7-uTime*1.3);gl_FragColor=vec4(.83,.95,.91,vAlpha*(.68+.23*foam));}",
      }),
    );
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1;
  }
  clear() {
    this.samples.length = 0;
    this.lastSample = 0;
    this.splash = null;
    this.lastLanding = -1;
    this.geometry.setDrawRange(0, 0);
  }
  update(boat: BoatState, time: number, sailing: boolean) {
    const hull = vesselProfile(boat.vesselId), spread = hull.beam / 3.4;
    const grounded = !boat.airborne && !boat.rampId && boat.lift < 0.45;
    const sternX = boat.x - Math.sin(boat.heading) * hull.length * .5,
      sternZ = boat.z + Math.cos(boat.heading) * hull.length * .5;
    if (
      !sailing ||
      (this.samples[0] &&
        Math.hypot(sternX - this.samples[0].x, sternZ - this.samples[0].z) > 36)
    )
      this.clear();
    if (
      sailing &&
      grounded &&
      Math.abs(boat.speed) > 0.65 &&
      time - this.lastSample > 0.065
    ) {
      this.lastSample = time;
      this.samples.unshift({
        x: sternX,
        z: sternZ,
        heading: boat.heading,
        time,
        speed: Math.abs(boat.speed),
      });
      if (this.samples.length > MAX_SAMPLES) this.samples.pop();
    }
    if (
      grounded &&
      boat.landingImpact > 0.06 &&
      boat.jumpCount !== this.lastLanding
    ) {
      this.lastLanding = boat.jumpCount;
      this.splash = {
        x: boat.x,
        z: boat.z,
        time,
        strength: Math.min(boat.landingImpact, 1),
      };
    }
    while (
      this.samples.length &&
      time - this.samples[this.samples.length - 1].time > 7.5
    )
      this.samples.pop();
    let cursor = 0;
    const raw = (x: number, z: number, alpha: number) => {
      this.positions[cursor * 3] = x;
      this.positions[cursor * 3 + 1] = waveHeight(x, z, time) + 0.085;
      this.positions[cursor * 3 + 2] = z;
      this.alphas[cursor] = alpha;
      cursor++;
    };
    const vertex = (
      sample: Sample,
      side: number,
      width: number,
      opacity: number,
    ) => {
      const age = time - sample.time,
        spread = width * hull.beam / 3.4 + age * 0.7;
      raw(
        sample.x + Math.cos(sample.heading) * side * spread,
        sample.z + Math.sin(sample.heading) * side * spread,
        Math.max(0, 1 - age / 7.5) ** 1.7 *
          Math.min(sample.speed / 14, 1) *
          opacity,
      );
    };
    for (let i = 0; i < this.samples.length - 1; i++) {
      const a = this.samples[i],
        b = this.samples[i + 1];
      if (Math.hypot(a.x - b.x, a.z - b.z) > 5) continue;
      for (const side of [-1, 1]) {
        vertex(a, side, 1.4, 0.55);
        vertex(a, side, 2.15, 0.06);
        vertex(b, side, 2.15, 0.06);
        vertex(a, side, 1.4, 0.55);
        vertex(b, side, 2.15, 0.06);
        vertex(b, side, 1.4, 0.55);
      }
      vertex(a, -0.3, 1, 0.3);
      vertex(a, 0.3, 1, 0.3);
      vertex(b, 0.3, 1, 0.3);
      vertex(a, -0.3, 1, 0.3);
      vertex(b, 0.3, 1, 0.3);
      vertex(b, -0.3, 1, 0.3);
    }
    // Sparse bow wash appears only where the moving hull meets the surface.
    if (sailing && grounded && boat.speed > 5) {
      const strength = Math.min((boat.speed - 5) / 18, 1) * 0.43;
      const bow = (x: number, z: number, alpha: number) =>
        raw(
          boat.x + Math.cos(boat.heading) * x * spread - Math.sin(boat.heading) * z * hull.length / 20,
          boat.z + Math.sin(boat.heading) * x * spread + Math.cos(boat.heading) * z * hull.length / 20,
          alpha,
        );
      for (const side of [-1, 1]) {
        bow(side * 0.9, -9.2, strength);
        bow(side * 2.5, -5.0, strength * 0.5);
        bow(side * 3.5, -3.5, 0);
        bow(side * 0.9, -9.2, strength);
        bow(side * 3.5, -3.5, 0);
        bow(side * 1.4, -8.0, 0);
      }
    }
    if (this.splash) {
      const age = time - this.splash.time;
      if (age > 1.2) this.splash = null;
      else {
        const radius = 2 + age * 7,
          opacity = (1 - age / 1.2) * this.splash.strength * 0.34,
          splash = this.splash;
        const point = (angle: number, r: number, alpha: number) =>
          raw(
            splash.x + Math.cos(angle) * r,
            splash.z + Math.sin(angle) * r,
            alpha,
          );
        for (let i = 0; i < 32; i++) {
          const a = (i / 32) * Math.PI * 2,
            b = ((i + 1) / 32) * Math.PI * 2;
          point(a, radius, opacity);
          point(a, radius + 1.2, 0);
          point(b, radius + 1.2, 0);
          point(a, radius, opacity);
          point(b, radius + 1.2, 0);
          point(b, radius, opacity);
        }
      }
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
