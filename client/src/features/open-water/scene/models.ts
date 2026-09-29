import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  DoubleSide,
  Euler,
  Float32BufferAttribute,
  Group,
  Matrix4,
  Mesh,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { destinations } from "../data/world";
import { architectureMaterial, type SeaEnvironment } from "./materials";

type V3 = [number, number, number];
const colors = {
  ivory: "#e5e5ce",
  white: "#f4f0da",
  navy: "#173947",
  teak: "#b69c73",
  steel: "#9cbbc0",
  glass: "#254f61",
  sage: "#9dad9c",
  blue: "#29697b",
  gold: "#c9b687",
};
const PI = Math.PI;

/** All architecture and yacht details are authored geometry. Bake static parts
 * into material batches so rails and deck planks do not each cost a draw call. */
class Builder {
  parts = new Map<
    string,
    {
      geometries: BufferGeometry[];
      color: string;
      gloss: number;
      emission: number;
    }
  >();
  offset: V3 = [0, 0, 0];
  add(
    geometry: BufferGeometry,
    p: V3 = [0, 0, 0],
    scale: V3 = [1, 1, 1],
    color = colors.ivory,
    rotation: V3 = [0, 0, 0],
    gloss = 0.15,
    emission = 0,
  ) {
    const key = `${color}/${gloss}/${emission}`;
    const batch = this.parts.get(key) ?? {
      geometries: [],
      color,
      gloss,
      emission,
    };
    const g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    g.deleteAttribute("uv");
    g.applyMatrix4(
      new Matrix4().compose(
        new Vector3(
          p[0] + this.offset[0],
          p[1] + this.offset[1],
          p[2] + this.offset[2],
        ),
        new Quaternion().setFromEuler(new Euler(...rotation, "YXZ")),
        new Vector3(...scale),
      ),
    );
    batch.geometries.push(g);
    this.parts.set(key, batch);
    geometry.dispose();
  }
  box(
    p: V3,
    scale: V3,
    color = colors.ivory,
    rotation: V3 = [0, 0, 0],
    gloss = 0.15,
  ) {
    this.add(new BoxGeometry(), p, scale, color, rotation, gloss);
  }
  cylinder(
    p: V3,
    scale: V3,
    color = colors.ivory,
    top = 1,
    bottom = 1,
    segments = 48,
  ) {
    this.add(new CylinderGeometry(top, bottom, 1, segments), p, scale, color);
  }
  sphere(p: V3, scale: V3, color: string, gloss = 0.3, emission = 0) {
    this.add(
      new SphereGeometry(1, 28, 14),
      p,
      scale,
      color,
      [0, 0, 0],
      gloss,
      emission,
    );
  }
  ring(
    radius: number,
    tube: number,
    p: V3,
    color = colors.steel,
    rotation: V3 = [0, 0, 0],
    scale: V3 = [1, 1, 1],
    gloss = 0.6,
  ) {
    const g = new TorusGeometry(radius, tube, 6, 72);
    g.rotateX(-PI / 2);
    this.add(g, p, scale, color, rotation, gloss);
  }
  rod(a: V3, b: V3, radius: number, color = colors.steel) {
    const direction = new Vector3(...b).sub(new Vector3(...a));
    const g = new CylinderGeometry(radius, radius, direction.length(), 8);
    g.applyQuaternion(
      new Quaternion().setFromUnitVectors(
        new Vector3(0, 1, 0),
        direction.normalize(),
      ),
    );
    this.add(
      g,
      [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2],
      [1, 1, 1],
      color,
      [0, 0, 0],
      0.55,
    );
  }
  finish(environment: SeaEnvironment) {
    const group = new Group();
    for (const batch of this.parts.values()) {
      const geometry = mergeGeometries(batch.geometries);
      batch.geometries.forEach((g) => g.dispose());
      if (!geometry) continue;
      const material = architectureMaterial(
        batch.color,
        environment,
        batch.gloss,
        batch.emission,
      );
      material.side = DoubleSide;
      group.add(new Mesh(geometry, material));
    }
    return group;
  }
}
class Surface {
  positions: number[] = [];
  triangle(a: V3, b: V3, c: V3) {
    this.positions.push(...a, ...b, ...c);
  }
  quad(a: V3, b: V3, c: V3, d: V3) {
    this.triangle(a, b, c);
    this.triangle(a, c, d);
  }
  geometry() {
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(this.positions, 3));
    g.computeVertexNormals();
    return g;
  }
}
export function createYacht(environment: SeaEnvironment) {
  const b = new Builder(),
    hull = new Surface(),
    deck = new Surface(),
    trim = new Surface();
  const sections: V3[] = [
    [-7.5, 0.045, 0.72],
    [-6.4, 0.82, 0.84],
    [-4.7, 1.45, 0.83],
    [-2.3, 1.9, 0.8],
    [0.5, 2.05, 0.78],
    [3.7, 1.94, 0.74],
    [5.8, 1.65, 0.68],
    [6.3, 1.58, 0.65],
  ];
  const ring = ([z, w, top]: V3): V3[] => [
    [-w, top, z],
    [-w * 0.98, 0.05, z],
    [-w * 0.53, -0.63, z],
    [0, -0.88, z],
    [w * 0.53, -0.63, z],
    [w * 0.98, 0.05, z],
    [w, top, z],
  ];
  for (let i = 0; i < sections.length - 1; i++) {
    const a = ring(sections[i]),
      c = ring(sections[i + 1]);
    for (let j = 0; j < 6; j++) hull.quad(a[j], c[j], c[j + 1], a[j + 1]);
    deck.quad(a[0], a[6], c[6], c[0]);
    for (const side of [-1, 1]) {
      const s = sections[i],
        n = sections[i + 1];
      trim.quad(
        [side * s[1], s[2] + 0.035, s[0]],
        [side * n[1], n[2] + 0.035, n[0]],
        [side * n[1], n[2] - 0.12, n[0]],
        [side * s[1], s[2] - 0.12, s[0]],
      );
    }
  }
  const end = ring(sections[sections.length - 1]);
  for (let i = 1; i < end.length - 1; i++)
    hull.triangle(end[0], end[i], end[i + 1]);
  b.add(hull.geometry(), [0, 0, 0], [1, 1, 1], colors.ivory, [0, 0, 0], 0.6);
  b.add(deck.geometry(), [0, 0, 0], [1, 1, 1], colors.teak);
  b.add(trim.geometry(), [0, 0, 0], [1, 1, 1], colors.navy, [0, 0, 0], 0.5);
  // Fine caulking, cushioned foredeck, recessed cockpit and rear swim platform.
  for (let x = -1.2; x <= 1.2; x += 0.23)
    b.box([x, 0.849, -3.85], [0.018, 0.008, 2.55], "#806f53");
  b.box([0, 0.88, -3], [2.35, 0.14, 2.8], colors.white);
  for (const x of [-0.39, 0.39])
    b.box([x, 0.957, -3], [0.012, 0.012, 2.6], "#c5c2ac");
  b.box([0, 0.81, 2.1], [3.45, 0.12, 5.8], colors.navy);
  b.box([0, 0.86, 2.1], [2.95, 0.1, 5.4], colors.teak);
  for (let x = -1.3; x < 1.4; x += 0.25)
    b.box([x, 0.921, 2.2], [0.013, 0.008, 5], "#85704f");
  const windshield = new Surface();
  for (let i = 0; i < 8; i++) {
    const a = (-0.48 + (i / 8) * 0.96) * PI,
      c = (-0.48 + ((i + 1) / 8) * 0.96) * PI;
    const p: V3 = [Math.sin(a) * 1.75, 1.02, -1 - Math.cos(a) * 0.45],
      q: V3 = [Math.sin(c) * 1.75, 1.02, -1 - Math.cos(c) * 0.45];
    const r: V3 = [Math.sin(c) * 1.6, 2.05, -0.58 - Math.cos(c) * 0.28],
      s: V3 = [Math.sin(a) * 1.6, 2.05, -0.58 - Math.cos(a) * 0.28];
    windshield.quad(p, q, r, s);
    b.rod(s, r, 0.035);
  }
  b.add(
    windshield.geometry(),
    [0, 0, 0],
    [1, 1, 1],
    colors.glass,
    [0, 0, 0],
    1,
  );
  b.box([0, 2.38, 0.13], [3.25, 0.14, 2.05], colors.white, [0.03, 0, 0], 0.35);
  for (const x of [-1.45, 1.45]) b.rod([x, 0.92, 1.02], [x, 2.35, 1.02], 0.05);
  for (const x of [-0.78, 0.78]) {
    b.box([x, 1.17, 0.6], [0.81, 0.24, 1.08], colors.white);
    b.box([x, 1.56, 1.02], [0.81, 0.74, 0.21], colors.white, [-0.16, 0, 0]);
    b.box([x, 1.43, -0.18], [0.57, 0.13, 0.32], colors.navy, [-0.3, 0, 0], 0.4);
  }
  b.ring(0.26, 0.014, [0.74, 1.52, -0.38], colors.steel, [1.02, 0, 0]);
  b.box([0, 1.05, 4.15], [2.92, 0.28, 1.08], colors.white);
  b.box([0, 1.36, 4.66], [2.9, 0.6, 0.19], colors.white);
  for (const x of [-1.34, 1.34])
    b.box([x, 1.09, 3.34], [0.27, 0.45, 2.35], colors.white);
  b.cylinder([0, 1.13, 2.86], [0.08, 0.65, 0.08], colors.steel);
  b.box([0, 1.48, 2.86], [1.3, 0.1, 0.9], colors.teak);
  b.box([0, 0.61, 6.8], [3.12, 0.15, 1], colors.teak);
  for (const side of [-1, 1]) {
    const points: V3[] = sections
      .slice(0, 5)
      .map(([z, w, y]) => [side * w * 0.97, y + 0.5, z]);
    for (let i = 0; i < points.length - 1; i++)
      b.rod(points[i], points[i + 1], 0.022);
    for (let i = 1; i < points.length; i++)
      b.rod(
        [points[i][0], points[i][1] - 0.48, points[i][2]],
        points[i],
        0.023,
      );
    b.box(
      [side * 1.982, 0.42, 0.8],
      [0.022, 0.17, 2.1],
      colors.glass,
      [0, 0, 0],
      0.8,
    );
  }
  b.rod([0, 0.85, 5.6], [0, 2.2, 5.6], 0.025);
  const flag = new Surface();
  flag.triangle([0, 2.19, 5.6], [0, 1.89, 5.6], [0.63, 2.02, 5.6]);
  b.add(flag.geometry(), [0, 0, 0], [1, 1, 1], colors.blue);
  const yacht = b.finish(environment);
  yacht.scale.setScalar(1.2);
  return yacht;
}
export function createArchitecture(environment: SeaEnvironment) {
  const b = new Builder();
  for (const st of destinations) {
    b.offset = [st.x, 0, st.z];
    const r = st.r;
    b.cylinder([0, 0.15, 0], [r, 1, r], colors.navy, 1, 1.02, 64);
    b.cylinder([0, 0.8, 0], [r, 0.35, r], colors.ivory, 1, 1, 64);
    b.ring(r - 0.14, 0.07, [0, 1.01, 0]);
    b.ring(r + 0.5, 0.12, [0, -0.1, 0], colors.blue);
    for (let a = 0; a < PI * 2; a += PI / 6)
      b.cylinder(
        [Math.sin(a) * (r - 1), -0.5, Math.cos(a) * (r - 1)],
        [0.25, 1.9, 0.25],
        colors.navy,
        1,
        1,
        12,
      );
    b.box([r + 2.5, 0.7, r * 0.48], [7, 0.36, 2.4], colors.teak, [0, -0.25, 0]);
    for (let i = 0; i < 12; i++)
      b.box(
        [r + 0.1 + i * 0.5, 0.897, r * 0.48],
        [0.022, 0.015, 2.35],
        "#716c58",
        [0, -0.25, 0],
      );
    if (st.id === "anticipy") {
      b.cylinder([0, 1.21, 0], [6.2, 0.45, 6.2], colors.white);
      b.box([-3.1, 4.7, 0], [0.52, 7.3, 3.8], colors.white, [0, 0, -0.06]);
      b.box([3.1, 4.7, 0], [0.52, 7.3, 3.8], colors.white, [0, 0, 0.06]);
      b.box([0, 8.3, 0], [6.7, 0.4, 3.8], colors.white);
      b.ring(3, 0.14, [0, 5.25, -0.3], colors.steel, [PI / 2, 0, 0]);
      b.ring(2.1, 0.1, [0, 5.25, -0.25], "#9ebdb4", [PI / 2, 0, 0]);
      b.sphere([0, 5.25, -0.25], [0.38, 0.38, 0.38], "#d7e8cd", 0.4, 0.5);
      b.box([0, 2.2, 3.7], [4.3, 1.3, 1.2], colors.navy);
      for (let i = 0; i < 5; i++)
        b.box([-1.5 + i * 0.75, 2.9, 3.7], [0.48, 0.06, 0.67], "#a5ccbb");
      b.rod([0, 8.4, 0], [0, 13.7, 0], 0.06);
      b.sphere([0, 13.7, 0], [0.16, 0.16, 0.16], "#e7d5a1", 0.3, 0.7);
      b.ring(1.6, 0.04, [0, 10.5, 0]);
      for (const x of [-6, 6]) {
        b.cylinder([x, 2, 2], [0.1, 2, 0.1], colors.steel);
        b.sphere([x, 3, 2], [0.22, 0.22, 0.22], "#d0dbc6", 0.4, 0.6);
      }
    } else if (st.id === "stellar") {
      b.cylinder([0, 1.34, 0], [8.65, 0.6, 8.65], colors.white);
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * PI * 2;
        b.cylinder(
          [Math.cos(a) * 7.25, 3.87, Math.sin(a) * 7.25],
          [0.2, 5, 0.2],
          colors.white,
          1,
          1,
          16,
        );
      }
      b.ring(6.4, 1.22, [0, 6.4, 0], colors.white, [0, 0, 0], [1, 0.35, 1]);
      b.ring(8.05, 0.16, [0, 6.36, 0], colors.white);
      b.sphere([0, 4, 0], [2.05, 2.05, 2.05], colors.blue, 0.65);
      b.ring(3.6, 0.095, [0, 4, 0], colors.gold, [0.35, 0, 0.4]);
      b.ring(2.7, 0.07, [0, 4, 0], colors.steel, [PI / 2.4, 0, -0.3]);
      for (const x of [-5.2, 5.2])
        b.box([x, 1.8, 4.6], [2.4, 0.35, 1], colors.teak);
    } else if (st.id === "research") {
      b.cylinder([0, 2.4, 0], [5, 2.85, 5], colors.ivory);
      b.sphere([0, 3.75, 0], [4.75, 2.7, 4.75], colors.glass, 0.75);
      b.ring(4.8, 0.16, [0, 3.7, 0], colors.white);
      b.ring(3.6, 0.13, [0, 7, 0], colors.gold, [PI / 2, 0.35, 0.3]);
      b.ring(3.5, 0.085, [0, 7, 0], colors.steel, [0.35, 0, -0.38]);
      b.rod([-2, 4, 1.4], [2.1, 10, -2], 0.45, colors.white);
      b.rod([1.5, 9.1, -1.5], [2.35, 10.4, -2.25], 0.58, colors.navy);
      for (const x of [-6.7, 6.7]) {
        b.box([x, 1.7, 3.9], [3.2, 0.12, 3.4], colors.glass, [-0.2, 0, 0], 0.6);
        for (let j = 0; j < 4; j++)
          b.box(
            [x - 1.2 + j * 0.8, 1.79, 3.9],
            [0.02, 0.02, 3.25],
            colors.steel,
            [-0.2, 0, 0],
          );
      }
    } else {
      b.cylinder([-2, 6.5, -1], [1.6, 11.3, 1.6], colors.white, 0.88, 1.22, 32);
      b.cylinder([-2, 12.2, -1], [1.7, 0.4, 1.7], colors.navy);
      b.cylinder([-2, 13.1, -1], [1.2, 1.7, 1.2], colors.glass);
      b.cylinder([-2, 14.35, -1], [1.9, 1.1, 1.9], colors.navy, 0, 1, 32);
      b.ring(1.55, 0.035, [-2, 12.7, -1]);
      b.sphere([-2, 13.1, -1], [0.5, 0.6, 0.5], "#e3d39d", 0.25, 0.8);
      b.box([3.4, 2.2, 1.5], [5, 2.6, 4.1], colors.white);
      b.box([3.4, 3.6, 1.5], [5.8, 0.25, 4.8], colors.teak);
      b.box([3.4, 2.4, 3.57], [4.25, 1.8, 0.04], colors.glass, [0, 0, 0], 0.7);
      for (const z of [-4, 4]) {
        b.cylinder([6.2, 1.5, z], [0.8, 1, 0.8], colors.ivory);
        b.sphere([6.2, 2.5, z], [1, 1.4, 0.9], colors.sage);
      }
    }
  }
  return b.finish(environment);
}
export function createBuoy(environment: SeaEnvironment) {
  const b = new Builder();
  b.cylinder([0, 0.42, 0], [0.45, 1.15, 0.45], "#c5b98f", 0.65, 1, 16);
  b.ring(2.1, 0.03, [0, 0.07, 0], "#a5c9bf");
  return b.finish(environment);
}
export function disposeModel(group: Group) {
  group.traverse((object) => {
    if (object instanceof Mesh) {
      object.geometry.dispose();
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      materials.forEach((material) => material.dispose());
    }
  });
}
