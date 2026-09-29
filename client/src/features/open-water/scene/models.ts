import {
  BoxGeometry,
  CatmullRomCurve3,
  ExtrudeGeometry,
  Shape,
  TubeGeometry,
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
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { destinations, islands, ramps, raceCourses } from "../data/world";
import {
  architectureMaterial,
  type SeaEnvironment,
  type SurfaceFinish,
} from "./materials";

type V3 = [number, number, number];
const colors = {
  ivory: "#eeeee5",
  white: "#fff9e9",
  navy: "#102935",
  teak: "#b28a58",
  steel: "#c8d9dc",
  glass: "#173c4f",
  sage: "#9dad9c",
  blue: "#29697b",
  gold: "#bea878",
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
      finish: SurfaceFinish;
    }
  >();
  offset: V3 = [0, 0, 0];
  localScale = 1;
  add(
    geometry: BufferGeometry,
    p: V3 = [0, 0, 0],
    scale: V3 = [1, 1, 1],
    color = colors.ivory,
    rotation: V3 = [0, 0, 0],
    gloss = 0.15,
    emission = 0,
  ) {
    const finish: SurfaceFinish =
      color === colors.teak
        ? 1
        : color === colors.glass
          ? 2
          : color === colors.steel || color === colors.gold
            ? 3
            : color === colors.ivory || color === colors.white
              ? 4
              : 0;
    const key = `${color}/${gloss}/${emission}/${finish}`;
    const batch = this.parts.get(key) ?? {
      geometries: [],
      color,
      gloss,
      emission,
      finish,
    };
    const g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    g.deleteAttribute("uv");
    g.applyMatrix4(
      new Matrix4().compose(
        new Vector3(
          p[0] * this.localScale + this.offset[0],
          p[1] * this.localScale + this.offset[1],
          p[2] * this.localScale + this.offset[2],
        ),
        new Quaternion().setFromEuler(new Euler(...rotation, "YXZ")),
        new Vector3(...scale).multiplyScalar(this.localScale),
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
  roundedBox(
    p: V3,
    scale: V3,
    color = colors.ivory,
    radius = 0.12,
    rotation: V3 = [0, 0, 0],
    gloss = 0.25,
  ) {
    this.add(
      new RoundedBoxGeometry(scale[0], scale[1], scale[2], 3, radius),
      p,
      [1, 1, 1],
      color,
      rotation,
      gloss,
    );
  }
  tube(points: V3[], radius: number, color = colors.steel) {
    this.add(
      new TubeGeometry(
        new CatmullRomCurve3(points.map((p) => new Vector3(...p))),
        Math.max(20, points.length * 3),
        radius,
        6,
        false,
      ),
      [0, 0, 0],
      [1, 1, 1],
      color,
      [0, 0, 0],
      0.8,
    );
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
        batch.finish,
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
/** Indexed surfaces retain continuous normals before they are baked into a batch. */
function gridSurface(
  columns: number,
  rows: number,
  at: (u: number, v: number) => V3,
) {
  const positions: number[] = [],
    indices: number[] = [];
  for (let row = 0; row <= rows; row++)
    for (let column = 0; column <= columns; column++)
      positions.push(...at(column / columns, row / rows));
  for (let row = 0; row < rows; row++)
    for (let column = 0; column < columns; column++) {
      const a = row * (columns + 1) + column,
        b = a + columns + 1;
      indices.push(a, a + 1, b, b, a + 1, b + 1);
    }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
function planGeometry(shape: Shape, depth: number, bevel = 0.04) {
  const geometry = new ExtrudeGeometry(shape, {
    depth,
    steps: 1,
    bevelEnabled: bevel > 0,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 3,
    curveSegments: 18,
  });
  geometry.rotateX(Math.PI / 2);
  return geometry;
}
function roundedPlan(width: number, length: number, radius: number) {
  const shape = new Shape(),
    x = width / 2,
    z = length / 2,
    r = radius;
  shape.moveTo(-x + r, -z);
  shape.lineTo(x - r, -z);
  shape.quadraticCurveTo(x, -z, x, -z + r);
  shape.lineTo(x, z - r);
  shape.quadraticCurveTo(x, z, x - r, z);
  shape.lineTo(-x + r, z);
  shape.quadraticCurveTo(-x, z, -x, z - r);
  shape.lineTo(-x, -z + r);
  shape.quadraticCurveTo(-x, -z, -x + r, -z);
  return shape;
}
export function createYacht(environment: SeaEnvironment) {
  const b = new Builder();
  // Width, sheer, longitudinal position. This original 18m express-yacht form
  // has a continuous flared hull, raised bow, low glazing, and an open aft deck.
  const curve = new CatmullRomCurve3(
    [
      new Vector3(0.018, 1.48, -9.4),
      new Vector3(0.77, 1.39, -8.1),
      new Vector3(1.64, 1.26, -5.8),
      new Vector3(2.3, 1.16, -2.8),
      new Vector3(2.55, 1.12, 0.7),
      new Vector3(2.52, 1.1, 4.4),
      new Vector3(2.16, 1.03, 7.4),
    ],
    false,
    "centripetal",
  );
  const hull = gridSurface(32, 80, (u, v) => {
    const p = curve.getPoint(v),
      angle = u * PI;
    return [
      -p.x * Math.cos(angle),
      p.y - Math.pow(Math.sin(angle), 0.68) * (p.y + 0.91),
      p.z + Math.sin(angle) * 0.8 * (1 - v) ** 3,
    ];
  });
  b.add(hull, [0, 0, 0], [1, 1, 1], colors.ivory, [0, 0, 0], 0.72);
  const transom = new Surface(),
    last = curve.getPoint(1);
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * PI,
      c = ((i + 1) / 32) * PI;
    transom.triangle(
      [0, last.y, last.z],
      [
        -last.x * Math.cos(c),
        last.y - Math.sin(c) ** 0.68 * (last.y + 0.91),
        last.z,
      ],
      [
        -last.x * Math.cos(a),
        last.y - Math.sin(a) ** 0.68 * (last.y + 0.91),
        last.z,
      ],
    );
  }
  b.add(
    transom.geometry(),
    [0, 0, 0],
    [1, 1, 1],
    colors.ivory,
    [0, 0, 0],
    0.72,
  );
  const outline = (inset: number) => {
    const shape = new Shape();
    const points = curve.getPoints(80);
    shape.moveTo(-points[0].x * inset, points[0].z);
    points.slice(1).forEach((p) => shape.lineTo(-p.x * inset, p.z));
    [...points].reverse().forEach((p) => shape.lineTo(p.x * inset, p.z));
    shape.closePath();
    return shape;
  };
  b.add(
    planGeometry(outline(0.985), 0.12, 0.025),
    [0, 1.11, 0],
    [1, 1, 1],
    colors.ivory,
    [0, 0, 0],
    0.55,
  );
  b.add(
    planGeometry(outline(0.89), 0.035, 0.012),
    [0, 1.145, 0],
    [1, 1, 1],
    colors.teak,
  );
  // The dark waterline is a narrow curved band, not a broad painted hull.
  for (const side of [-1, 1]) {
    b.add(
      gridSurface(1, 70, (u, v) => {
        const p = curve.getPoint(v);
        return [side * p.x * 0.963, 0.12 + u * 0.115, p.z];
      }),
      [0, 0, 0],
      [1, 1, 1],
      colors.navy,
      [0, 0, 0],
      0.55,
    );
    const rail = curve
      .getPoints(30)
      .slice(1, -1)
      .map((p) => [side * p.x * 0.987, p.y + 0.38, p.z] as V3);
    b.tube(rail, 0.024);
    const gunwale = curve
      .getPoints(45)
      .map((p) => [side * p.x, p.y + 0.025, p.z] as V3);
    b.tube(gunwale, 0.043, colors.ivory);
    for (let i = 2; i < 30; i += 4) {
      const p = curve.getPoint(i / 30);
      b.rod(
        [side * p.x * 0.987, p.y + 0.025, p.z],
        [side * p.x * 0.987, p.y + 0.38, p.z],
        0.021,
      );
    }
    const sideGlass = new Surface();
    const windows = [
      [-2.8, 2.29],
      [-1.7, 2.42],
      [0.8, 2.55],
      [3.7, 2.54],
      [5.3, 2.43],
    ];
    for (let i = 0; i < windows.length - 1; i++) {
      const [z, w] = windows[i],
        [zz, ww] = windows[i + 1];
      sideGlass.quad(
        [side * (w + 0.012), 0.7, z],
        [side * (ww + 0.012), 0.7, zz],
        [side * (ww + 0.012), 0.95, zz],
        [side * (w + 0.012), 0.95, z],
      );
    }
    b.add(
      sideGlass.geometry(),
      [0, 0, 0],
      [1, 1, 1],
      colors.glass,
      [0, 0, 0],
      0.93,
    );
    for (const z of [-7.1, 5.5])
      b.roundedBox(
        [side * (z < 0 ? 1.1 : 2.17), 1.23, z],
        [0.1, 0.07, 0.4],
        colors.steel,
        0.03,
      );
  }
  // Foredeck lounge and skylight, flush within the continuous teak deck.
  b.add(
    planGeometry(roundedPlan(2.85, 2.85, 0.34), 0.06, 0.02),
    [0, 1.18, -5.9],
    [1, 1, 1],
    colors.navy,
  );
  for (const x of [-0.72, 0.72])
    b.roundedBox([x, 1.3, -5.75], [1.37, 0.23, 2.8], colors.white, 0.115);
  for (const x of [-0.72, 0.72])
    b.roundedBox(
      [x, 1.38, -4.65],
      [1.36, 0.22, 0.43],
      "#dddcca",
      0.1,
      [-0.16, 0, 0],
    );
  b.add(
    planGeometry(roundedPlan(1.14, 0.83, 0.14), 0.035, 0.02),
    [0, 1.23, -7.85],
    [1, 1, 1],
    colors.glass,
    [0, 0, 0],
    1,
  );
  // Swept continuous windshield, with a much thinner upper frame.
  const glass = gridSurface(36, 1, (u, v) => {
    const a = -PI / 2 + u * PI;
    return [
      Math.sin(a) * (2.02 - v * 0.29),
      1.32 + v * 1.47,
      -0.48 - Math.cos(a) * (3.05 - v * 0.97),
    ];
  });
  b.add(glass, [0, 0, 0], [1, 1, 1], colors.glass, [0, 0, 0], 0.95);
  const upper: V3[] = [],
    lower: V3[] = [];
  for (let i = 0; i <= 32; i++) {
    const a = -PI / 2 + (i / 32) * PI;
    upper.push([Math.sin(a) * 1.73, 2.82, -0.48 - Math.cos(a) * 2.08]);
    lower.push([Math.sin(a) * 2.02, 1.31, -0.48 - Math.cos(a) * 3.05]);
  }
  b.tube(upper, 0.055, colors.ivory);
  b.tube(lower, 0.045, colors.navy);
  for (const side of [-1, 1]) {
    const a = side * PI * 0.34;
    b.rod(
      [Math.sin(a) * 2.02, 1.33, -0.48 - Math.cos(a) * 3.05],
      [Math.sin(a) * 1.73, 2.82, -0.48 - Math.cos(a) * 2.08],
      0.043,
      colors.ivory,
    );
  }
  for (const side of [-1, 1]) {
    const glazing = new Surface();
    glazing.quad(
      [side * 2.02, 1.32, -0.48],
      [side * 1.93, 1.32, 1.8],
      [side * 1.64, 2.78, 1.62],
      [side * 1.73, 2.79, -0.48],
    );
    b.add(
      glazing.geometry(),
      [0, 0, 0],
      [1, 1, 1],
      colors.glass,
      [0, 0, 0],
      0.95,
    );
    b.rod(
      [side * 1.91, 1.27, 1.92],
      [side * 1.64, 2.94, 1.61],
      0.073,
      colors.ivory,
    );
    b.rod(
      [side * 1.98, 1.32, 0.73],
      [side * 1.68, 2.79, 0.61],
      0.035,
      colors.ivory,
    );
    b.roundedBox(
      [side * 1.91, 1.38, 0.68],
      [0.12, 0.12, 2.3],
      colors.ivory,
      0.05,
    );
  }
  const roof = new Shape();
  roof.moveTo(-1.53, -2.76);
  roof.quadraticCurveTo(0, -3.2, 1.53, -2.76);
  roof.quadraticCurveTo(1.95, -2.62, 1.99, -1.8);
  roof.lineTo(1.87, 1.92);
  roof.quadraticCurveTo(1.82, 2.34, 1.41, 2.38);
  roof.lineTo(-1.41, 2.38);
  roof.quadraticCurveTo(-1.82, 2.34, -1.87, 1.92);
  roof.lineTo(-1.99, -1.8);
  roof.quadraticCurveTo(-1.95, -2.62, -1.53, -2.76);
  b.add(
    planGeometry(roof, 0.15, 0.075),
    [0, 3.03, 0],
    [1, 1, 1],
    colors.ivory,
    [0, 0, 0],
    0.7,
  );
  b.add(
    planGeometry(roundedPlan(2.16, 2.6, 0.28), 0.035, 0.025),
    [0, 3.11, -0.1],
    [1, 1, 1],
    colors.glass,
    [0, 0, 0],
    0.9,
  );
  b.roundedBox([0, 3.2, 1.12], [0.95, 0.13, 0.28], colors.ivory, 0.08);
  // Open rear cockpit: rounded cushions, teak table, helm and a stern terrace.
  for (const side of [-1, 1]) {
    b.roundedBox(
      [side * 1.59, 1.37, 4.17],
      [0.73, 0.37, 2.65],
      colors.white,
      0.14,
    );
    b.roundedBox(
      [side * 1.97, 1.65, 4.22],
      [0.23, 0.66, 2.75],
      colors.ivory,
      0.1,
    );
    b.roundedBox(
      [side * 0.8, 1.55, 2.26],
      [0.9, 0.25, 0.94],
      colors.white,
      0.12,
    );
    b.roundedBox(
      [side * 0.8, 1.94, 2.65],
      [0.9, 0.84, 0.19],
      colors.white,
      0.08,
      [-0.12, 0, 0],
    );
  }
  b.roundedBox([0, 1.38, 5.61], [3.79, 0.36, 0.91], colors.white, 0.17);
  b.roundedBox([0, 1.7, 6.02], [3.87, 0.58, 0.19], colors.ivory, 0.09);
  b.cylinder([0, 1.42, 4.27], [0.075, 0.56, 0.075], colors.steel, 1, 1, 12);
  b.add(
    planGeometry(roundedPlan(1.21, 1.54, 0.19), 0.1, 0.035),
    [0, 1.74, 4.27],
    [1, 1, 1],
    colors.teak,
  );
  b.roundedBox(
    [0.77, 1.91, 1.67],
    [0.68, 0.19, 0.39],
    colors.navy,
    0.06,
    [0.25, 0, 0],
  );
  b.ring(0.23, 0.024, [0.77, 2.02, 1.94], colors.steel, [PI * 0.35, 0, 0]);
  b.add(
    planGeometry(roundedPlan(3.92, 1.12, 0.24), 0.16, 0.05),
    [0, 0.66, 7.92],
    [1, 1, 1],
    colors.ivory,
    [0, 0, 0],
    0.55,
  );
  b.add(
    planGeometry(roundedPlan(3.66, 0.92, 0.18), 0.035, 0.02),
    [0, 0.7, 7.92],
    [1, 1, 1],
    colors.teak,
  );
  for (const x of [-0.7, 0.7])
    b.tube(
      [
        [x, 0.74, 8.25],
        [x, 0.5, 8.54],
        [x, -0.22, 8.54],
      ],
      0.034,
    );
  for (const y of [-0.18, 0.16, 0.48])
    b.rod([-0.7, y, 8.54], [0.7, y, 8.54], 0.038);
  b.rod([0, 1.06, 6.69], [0, 2.1, 6.69], 0.022);
  const pennant = new Surface();
  pennant.triangle([0, 2.1, 6.69], [0, 1.76, 6.69], [0.71, 1.94, 6.69]);
  b.add(pennant.geometry(), [0, 0, 0], [1, 1, 1], "#c06c52");
  const yacht = b.finish(environment);
  yacht.name = "open-water-express-yacht";
  yacht.scale.setScalar(1.2);
  return yacht;
}
function limestoneShelf(b: Builder, radius: number, phase: number) {
  const shelf = gridSurface(64, 4, (u, v) => {
    const angle = u * PI * 2;
    const coast =
      radius *
      (0.91 +
        0.035 * Math.sin(angle * 3 + phase) +
        0.035 * Math.cos(angle * 7 - phase));
    const layer = [0.88, 1, 0.98, 0.91, 0.87][Math.round(v * 4)];
    const height = [-2.8, -0.25, 0.42, 0.91, 1.15][Math.round(v * 4)];
    return [
      Math.cos(angle) * coast * layer,
      height + Math.sin(angle * 9 + phase) * 0.07,
      Math.sin(angle) * coast * layer,
    ];
  });
  b.add(shelf, [0, 0, 0], [1, 1, 1], "#d4d0ba");
  const cap = new Surface();
  for (let i = 0; i < 64; i++) {
    const point = (a: number): V3 => {
      const radiusAt =
        radius *
        0.87 *
        (0.91 +
          0.035 * Math.sin(a * 3 + phase) +
          0.035 * Math.cos(a * 7 - phase));
      return [Math.cos(a) * radiusAt, 1.1, Math.sin(a) * radiusAt];
    };
    cap.triangle(
      [0, 1.1, 0],
      point(((i + 1) / 64) * PI * 2),
      point((i / 64) * PI * 2),
    );
  }
  b.add(cap.geometry(), [0, 0, 0], [1, 1, 1], "#e3deca");
}
function rock(b: Builder, p: V3, radius: number, height: number, seed: number) {
  const geometry = gridSurface(32, 7, (u, v) => {
    const angle = u * PI * 2;
    const taper = Math.pow(1 - v, 0.38),
      fold =
        0.79 +
        0.11 * Math.sin(angle * 3 + seed) +
        0.08 * Math.sin(angle * 5.0 - seed * 0.6);
    const r =
      radius * taper * fold * (1 + 0.035 * Math.sin(v * 39 + angle * 2));
    return [
      Math.cos(angle) * r + v * radius * 0.12,
      1.05 +
        v * height +
        Math.sin(angle * 4 + seed) * v * (1 - v) * height * 0.17,
      Math.sin(angle) * r,
    ];
  });
  b.add(geometry, p, [1, 1, 1], "#d8d4c0");
}
export function createArchitecture(environment: SeaEnvironment) {
  const b = new Builder();
  for (const st of destinations) {
    b.offset = [st.x, 0, st.z];
    const r = st.r;
    const phase = destinations.indexOf(st) * 0.83;
    limestoneShelf(b, r, phase);
    // A restrained promenade rests on an irregular stone outcrop.
    const terrace = new Shape();
    for (let i = 0; i <= 64; i++) {
      const angle = (i / 64) * PI * 2,
        radius = r * (0.77 + 0.035 * Math.sin(angle * 3 + phase));
      const x = Math.cos(angle) * radius,
        z = Math.sin(angle) * radius;
      i ? terrace.lineTo(x, z) : terrace.moveTo(x, z);
    }
    b.add(
      planGeometry(terrace, 0.18, 0.08),
      [0, 1.23, 0],
      [1, 1, 1],
      "#e8e4d4",
    );
    const dockDirection = Math.atan2(st.dock.x - st.x, st.dock.z - st.z),
      dx = Math.sin(dockDirection),
      dz = Math.cos(dockDirection);
    const dockCenter = r + 3.2;
    b.roundedBox(
      [dx * dockCenter, 0.78, dz * dockCenter],
      [3.4, 0.42, 9.1],
      colors.ivory,
      0.08,
      [0, dockDirection, 0],
    );
    b.box(
      [dx * dockCenter, 1.005, dz * dockCenter],
      [3.1, 0.035, 8.8],
      colors.teak,
      [0, dockDirection, 0],
    );
    for (const side of [-1, 1]) {
      const rightX = Math.cos(dockDirection),
        rightZ = -Math.sin(dockDirection);
      b.cylinder(
        [
          dx * (r + 6.6) + rightX * side * 1.2,
          1.3,
          dz * (r + 6.6) + rightZ * side * 1.2,
        ],
        [0.08, 0.58, 0.08],
        colors.steel,
        1,
        1,
        12,
      );
    }
    b.localScale = st.id === "stellar" ? r / 12.5 : r / 11.8;
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
    b.localScale = 1;
    for (let i = 0; i < 3; i++) {
      const angle = 2.6 + i * 0.45,
        x = Math.cos(angle) * r * 0.69,
        z = Math.sin(angle) * r * 0.69;
      b.cylinder([x, 1.5, z], [0.54, 0.55, 0.54], "#c5b496", 1, 1.15, 14);
      b.sphere([x, 2.13, z], [0.72, 0.93, 0.72], "#77836a", 0.03);
    }
  }
  for (let index = 0; index < islands.length; index++) {
    const island = islands[index];
    b.offset = [island.x, 0, island.z];
    limestoneShelf(b, island.r, (destinations.length + index) * 0.83);
    if (index === 1) {
      const arch = new TorusGeometry(
        island.height * 0.75,
        island.height * 0.23,
        6,
        32,
        PI,
      );
      const positions = arch.getAttribute("position");
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i),
          y = positions.getY(i),
          z = positions.getZ(i);
        positions.setXYZ(
          i,
          x * (1 + 0.04 * Math.sin(y * 2.1 + z)),
          y + Math.sin(x * 1.2) * 0.18,
          z * 1.25,
        );
      }
      arch.computeVertexNormals();
      b.add(arch, [0, 1.5, 0], [1, 1, 1], "#dbd6bf", [0, 0.25, 0]);
      rock(b, [-6, 0, 0], 4, 3.1, 2);
      rock(b, [6, 0, 0], 4.2, 3.4, 3);
    } else {
      rock(b, [0, 0, 0], island.r * 0.65, island.height, index + 0.8);
      rock(
        b,
        [-island.r * 0.47, 0, island.r * 0.28],
        island.r * 0.31,
        island.height * 0.46,
        index + 2.9,
      );
      rock(
        b,
        [island.r * 0.38, 0, -island.r * 0.37],
        island.r * 0.32,
        island.height * 0.62,
        index + 4.2,
      );
      if (index === 2 || index === 4)
        b.sphere(
          [-1, island.height * 0.83, 1],
          [island.r * 0.28, 1.0, island.r * 0.23],
          "#76836a",
          0.02,
        );
    }
  }
  return b.finish(environment);
}
/** Static playground fittings plus one separately tintable accent mesh per gate.
 * gate.userData={courseId,gateIndex,id}; material uniforms.uColor can be changed
 * by the single root loop without allocating geometry or creating another loop. */
export function createPlayground(environment: SeaEnvironment) {
  const b = new Builder(),
    group = new Group(),
    gateMeshes: Mesh[] = [];
  group.name = "open-water-playground";
  for (const ramp of ramps) {
    const local = new Builder(),
      halfW = ramp.width / 2,
      halfL = ramp.length / 2,
      h = ramp.height;
    const shell = new Surface();
    shell.quad(
      [-halfW, 0.04, halfL],
      [halfW, 0.04, halfL],
      [halfW, h, -halfL],
      [-halfW, h, -halfL],
    );
    shell.quad(
      [-halfW, -0.55, halfL],
      [-halfW, 0.04, halfL],
      [-halfW, h, -halfL],
      [-halfW, -0.55, -halfL],
    );
    shell.quad(
      [halfW, 0.04, halfL],
      [halfW, -0.55, halfL],
      [halfW, -0.55, -halfL],
      [halfW, h, -halfL],
    );
    shell.quad(
      [-halfW, -0.55, -halfL],
      [-halfW, h, -halfL],
      [halfW, h, -halfL],
      [halfW, -0.55, -halfL],
    );
    local.add(shell.geometry(), [0, 0, 0], [1, 1, 1], "#e9e4d5");
    const top = new Surface(),
      y = (z: number) =>
        0.04 + ((halfL - z) / ramp.length) * (h - 0.04) + 0.035;
    top.quad(
      [-halfW + 0.65, y(halfL - 0.4), halfL - 0.4],
      [halfW - 0.65, y(halfL - 0.4), halfL - 0.4],
      [halfW - 0.65, y(-halfL + 0.3), -halfL + 0.3],
      [-halfW + 0.65, y(-halfL + 0.3), -halfL + 0.3],
    );
    local.add(top.geometry(), [0, 0, 0], [1, 1, 1], colors.teak);
    for (const side of [-1, 1])
      local.rod(
        [side * (halfW - 0.2), y(halfL), halfL],
        [side * (halfW - 0.2), y(-halfL), -halfL],
        0.14,
        colors.ivory,
      );
    for (const z of [4, 0, -4]) {
      const arrow = new Surface();
      arrow.quad(
        [-1.65, y(z) + 0.012, z + 0.55],
        [0, y(z - 1) + 0.012, z - 1],
        [0, y(z - 0.65) + 0.012, z - 0.65],
        [-1.65, y(z + 0.95) + 0.012, z + 0.95],
      );
      arrow.quad(
        [0, y(z - 1) + 0.012, z - 1],
        [1.65, y(z) + 0.012, z + 0.55],
        [1.65, y(z + 0.95) + 0.012, z + 0.95],
        [0, y(z - 0.65) + 0.012, z - 0.65],
      );
      local.add(arrow.geometry(), [0, 0, 0], [1, 1, 1], colors.white);
    }
    const lip = new Surface();
    lip.quad(
      [-halfW + 0.4, h + 0.045, -halfL + 0.13],
      [halfW - 0.4, h + 0.045, -halfL + 0.13],
      [halfW - 0.4, h + 0.045, -halfL + 0.58],
      [-halfW + 0.4, h + 0.045, -halfL + 0.58],
    );
    local.add(lip.geometry(), [0, 0, 0], [1, 1, 1], "#bb7359");
    const model = local.finish(environment);
    model.name = ramp.id;
    model.position.set(ramp.x, 0, ramp.z);
    model.rotation.y = -ramp.heading;
    group.add(model);
  }
  for (const course of raceCourses)
    for (let i = 0; i < course.gates.length; i++) {
      const gate = course.gates[i],
        accent = new Builder(),
        rightX = Math.cos(gate.heading),
        rightZ = Math.sin(gate.heading),
        height = gate.minLift ? 6.2 : 3.5;
      for (const side of [-1, 1]) {
        const x = gate.x + rightX * gate.halfWidth * side,
          z = gate.z + rightZ * gate.halfWidth * side;
        b.cylinder([x, 0.32, z], [0.9, 0.65, 0.9], colors.ivory, 1, 0.86, 20);
        b.cylinder(
          [x, height * 0.5 + 0.5, z],
          [0.066, height, 0.066],
          colors.steel,
          1,
          1,
          8,
        );
        accent.cylinder([x, 0.78, z], [0.71, 0.38, 0.71], "#b87960", 1, 1, 16);
        const flag = new Surface(),
          dx = rightX * side,
          dz = rightZ * side;
        flag.quad(
          [x, height + 0.3, z],
          [x + dx * 1.4, height + 0.3, z + dz * 1.4],
          [x + dx * 1.4, height - 0.34, z + dz * 1.4],
          [x, height - 0.34, z],
        );
        accent.add(flag.geometry(), [0, 0, 0], [1, 1, 1], "#b87960");
      }
      const accentGroup = accent.finish(environment);
      for (const child of [...accentGroup.children]) {
        if (child instanceof Mesh) {
          child.name = `${course.id}/${gate.id}`;
          child.userData = { courseId: course.id, gateIndex: i, id: gate.id };
          gateMeshes.push(child);
          group.add(child);
        }
      }
    }
  group.add(b.finish(environment));
  group.userData.gates = gateMeshes;
  return group;
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
