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
  MeshBasicMaterial,
  Quaternion,
  SphereGeometry,
  ShaderMaterial,
  TorusGeometry,
  Vector3,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { destinations, islands, ramps, raceCourses, LIGHTHOUSE, DIVE_BUOY } from "../data/world";
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
export class Builder {
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
      new SphereGeometry(1, 18, 10),
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
    const r=st.r,phase=destinations.indexOf(st)*.83;
    limestoneShelf(b,r,phase);
    const dockDirection=Math.atan2(st.dock.x-st.x,st.dock.z-st.z),dx=Math.sin(dockDirection),dz=Math.cos(dockDirection);
    const dockCenter=r+3.2;
    b.roundedBox([dx*dockCenter,.78,dz*dockCenter],[3.4,.42,9.1],"#e6e0cf",.08,[0,dockDirection,0],.05);
    b.box([dx*dockCenter,1.005,dz*dockCenter],[3.1,.035,8.8],colors.teak,[0,dockDirection,0]);
    for(const side of [-1,1])b.cylinder([dx*(r+6.6)+Math.cos(dockDirection)*side*1.2,1.3,dz*(r+6.6)-Math.sin(dockDirection)*side*1.2],[.08,.58,.08],colors.steel,1,1,12);
    if(st.id==="anticipy"){
      // A low marine workshop: deep open frontage, a precise overhanging roof,
      // and one slim radio spar. The lighthouse owns the vertical skyline.
      b.roundedBox([0,1.35,0],[16,.5,11],"#e4deca",.17,[0,0,0],.03);
      b.box([-6,3.15,-1],[.45,3.6,7.6],"#ece6d5");
      b.box([6,3.15,-1],[.45,3.6,7.6],"#ece6d5");
      b.box([0,3.15,-4.6],[12,3.6,.4],"#ded8c2");
      b.box([0,3.2,-4.35],[10.8,2.2,.045],colors.glass,[0,0,0],.65);
      b.roundedBox([0,5.02,-.8],[14,.33,9.3],colors.white,.12,[0,0,0],.1);
      b.box([0,4.83,-.5],[11.7,.08,8.4],colors.teak);
      for(const x of [-4.3,0,4.3])b.cylinder([x,3.12,3.25],[.08,3.45,.08],colors.steel,1,1,12);
      b.roundedBox([0,2.55,1.2],[7.8,.22,1.7],colors.teak,.08);
      for(const x of [-3.1,3.1])b.box([x,2,1.2],[.2,1,.95],colors.navy);
      // Inspectable workbench and a human-scale marine radio, not a screen wall.
      b.roundedBox([-1.5,2.85,1.2],[1.65,.42,1.05],"#ebe4d2",.06);
      b.box([-1.5,3.09,1.2],[1.38,.025,.77],colors.glass);
      b.roundedBox([2.1,2.96,1.16],[.72,.62,.44],colors.navy,.06);
      b.box([2.1,3.02,1.395],[.47,.25,.015],"#a7bdb0");
      b.rod([2.3,3.2,1.15],[2.3,4.4,1.15],.018,colors.steel);
      b.rod([5.8,1.2,-4.1],[5.8,8.8,-4.1],.055,colors.steel);
      b.rod([5.0,7.1,-4.1],[6.6,7.1,-4.1],.027,colors.steel);
      b.box([5.81,7.9,-4.08],[.045,1.1,.045],"#be745d");
    }else if(st.id==="stellar"){
      b.cylinder([0,1.4,0],[11,.5,11],"#e9e1cd");
      for(let i=0;i<12;i++){
        const a=i/12*PI*2;
        b.cylinder([Math.cos(a)*8.5,4.0,Math.sin(a)*8.5],[.18,5,.18],colors.white,1,1,16);
      }
      b.ring(7.35,1.55,[0,6.55,0],"#eee7d8",[0,0,0],[1,.24,1],.06);
      b.ring(9.05,.11,[0,6.6,0],colors.white);
      b.ring(5.87,.10,[0,6.6,0],colors.teak);
      b.cylinder([0,1.8,0],[2.65,.45,2.65],"#c9c6aa");
      b.sphere([0,3.3,0],[1.65,1.65,1.65],colors.blue,.65);
      b.ring(2.7,.065,[0,3.3,0],colors.gold,[.45,0,.37]);
      for(let i=0;i<5;i++){
        const a=i/5*PI*2;
        b.roundedBox([Math.cos(a)*6.3,1.92,Math.sin(a)*6.3],[3,.3,1.15],colors.teak,.1,[0,-a+PI/2,0]);
      }
    }else if(st.id==="research"){
      // Asymmetric low observatory; warm roof and a shaded glazed instrument bay.
      b.roundedBox([-1,2.2,0],[14,2.1,8.5],"#e3ddcb",.25);
      b.box([-1,2.9,4.28],[12.4,1.8,.035],colors.glass,[0,0,0],.7);
      b.roundedBox([-1,3.38,-.6],[15.5,.35,9.4],colors.white,.16,[0,0,-.07]);
      b.sphere([2.5,3.7,-1.7],[3.7,2.65,3.7],"#e8e4d7",.25);
      b.ring(3.7,.10,[2.5,3.71,-1.7],colors.teak);
      b.rod([2.5,4.2,-1.7],[4.65,7.05,-3.4],.34,colors.ivory);
      b.rod([4.2,6.45,-3.05],[4.9,7.38,-3.62],.43,colors.navy);
      for(const x of [-7,-3]){
        b.box([x,1.55,-7],[3.15,.12,2.1],colors.glass,[-.24,0,0],.65);
        b.rod([x,1.2,-7],[x,1.6,-7],.06,colors.steel);
      }
      b.roundedBox([3.3,1.75,6.8],[6,.4,1.3],colors.teak,.1);
    }else{
      // Anchorage is a low timber quay and open pergola. No second tower.
      b.roundedBox([0,1.32,1],[18,.38,11.5],colors.teak,.13);
      b.roundedBox([-3,2.15,-2.5],[7.8,1.5,4],"#e5dfcc",.12);
      b.box([-3,3.04,-2.5],[8.7,.28,4.9],colors.white);
      b.box([-3,2.25,-.48],[6.7,1.2,.025],colors.glass);
      for(const x of [1.5,7.5])for(const z of [-3.2,3.3])b.box([x,3.03,z],[.18,3.4,.18],colors.teak);
      for(let i=0;i<9;i++)b.box([1.4+i*.79,4.8,.05],[.17,.17,7.1],colors.teak);
      for(const x of [2.7,5.7])b.roundedBox([x,1.87,2],[2,.43,2.5],"#e8dfc6",.14);
      b.roundedBox([-4.8,1.85,4.7],[5.2,.36,1.5],colors.teak,.12);
    }
    for(let i=0;i<3;i++){
      const a=2.6+i*.45,x=Math.cos(a)*r*.70,z=Math.sin(a)*r*.70;
      b.cylinder([x,1.4,z],[.54,.55,.54],"#c5b496",1,1.15,14);
      b.sphere([x,1.99,z],[.72,.84,.72],"#78876b",.02);
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
  const architecture=b.finish(environment);
  const lighthouse=createLighthouse(environment);
  architecture.add(lighthouse);
  architecture.userData.lighthouseLens=lighthouse.userData.lens;
  const buoy=createDiveBuoy(environment);
  architecture.add(buoy);
  architecture.name="sunlit-archipelago";
  const workshop=destinations.find(d=>d.id==="anticipy")!;
  for(const item of [{id:"artifact",p:[workshop.x-1.5,2.95,workshop.z+1.2],size:[3.2,1.5,1.6]},{id:"radio",p:[workshop.x+2.1,3.45,workshop.z+1.16],size:[1.25,1.7,1.05]}]){
    const material=new MeshBasicMaterial();material.visible=false;
    const proxy=new Mesh(new BoxGeometry(...item.size as [number,number,number]),material);
    proxy.position.set(...item.p as [number,number,number]);proxy.name=`encounter-${item.id}`;
    proxy.userData.encounter=item.id;architecture.add(proxy);
  }
  batchStaticArchitecture(architecture);
  return architecture;
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
        frame = new Builder(),
        rightX = Math.cos(gate.heading),
        rightZ = Math.sin(gate.heading),
        height = gate.minLift ? 6.2 : 3.5;
      for (const side of [-1, 1]) {
        const x = gate.x + rightX * gate.halfWidth * side,
          z = gate.z + rightZ * gate.halfWidth * side;
        frame.cylinder([x, 0.32, z], [0.9, 0.65, 0.9], colors.ivory, 1, 0.86, 20);
        frame.cylinder(
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
      // Course frames remain separate so inactive circuits can actually leave
      // the scene, including their poles, rather than accumulating pale clutter.
      const frameGroup = frame.finish(environment);
      for (const child of [...frameGroup.children]) {
        if (child instanceof Mesh) {
          child.name = `${course.id}/${gate.id}/frame`;
          child.userData = { courseId: course.id, gateIndex: i, id: gate.id, frame: true };
          gateMeshes.push(child); group.add(child);
        }
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

/** Sole vertical landmark. Dimensions deliberately match the approved 34.5
 * scene-unit tower; the optical assembly is separately addressable. */
export function createLighthouse(environment:SeaEnvironment):Group {
  const b=new Builder();
  limestoneShelf(b,LIGHTHOUSE.r,(destinations.length+islands.length)*.83);
  b.cylinder([0,1.37,0],[6.2,.48,6.2],"#dbd5c2",1,1.04,64);
  b.cylinder([0,1.89,0],[4.5,.56,4.5],"#eee7d7",1,1.02,64);
  b.cylinder([0,8.9,0],[1,13.4,1],"#ece7d9",2.90,3.70,64);
  b.cylinder([0,18.2,0],[1,5.2,1],"#b76f55",2.60,2.90,64);
  b.cylinder([0,24.1,0],[1,6.6,1],"#ece7d9",2.20,2.60,64);
  // A recessed door and thin reveal establish a human scale at the base.
  b.roundedBox([0,3.2,3.47],[1.35,2.15,.10],colors.navy,.13);
  b.roundedBox([0,3.2,3.535],[.95,1.78,.035],colors.teak,.08);
  for(const y of [8.7,13.0,23.6])b.roundedBox([0,y,3.7-(y-2.2)*.0607],[.55,1.26,.06],colors.glass,.12);
  b.cylinder([0,27.52,0],[4.1,.28,4.1],"#e4e0d4",1,1,64);
  b.cylinder([0,27.79,0],[2.83,.26,2.83],colors.navy,1,1,48);
  for(let i=0;i<24;i++){
    const a=i/24*PI*2,x=Math.cos(a)*3.83,z=Math.sin(a)*3.83;
    b.rod([x,27.66,z],[x,28.8,z],.035,colors.navy);
  }
  b.ring(3.83,.045,[0,28.8,0],colors.navy);
  b.ring(3.83,.028,[0,28.19,0],colors.navy);
  for(let i=0;i<12;i++){
    const a=i/12*PI*2;
    b.rod([Math.cos(a)*2.57,27.9,Math.sin(a)*2.57],[Math.cos(a)*2.57,31.55,Math.sin(a)*2.57],.055,colors.navy);
  }
  b.cylinder([0,31.64,0],[2.88,.22,2.88],colors.navy,1,1,48);
  b.cylinder([0,32.68,0],[1,1.86,1],colors.navy,.34,3.12,48);
  b.cylinder([0,33.75,0],[.28,.42,.28],colors.gold,.6,1,20);
  b.rod([0,33.96,0],[0,34.5,0],.055,colors.navy);
  // Low storehouse sits at the tower foot, with a short quay rather than tower2.
  b.roundedBox([-4.2,2.15,-2.0],[3.0,1.65,3.5],"#dbd6c1",.15);
  b.box([-4.2,3.03,-2.0],[3.65,.2,4.1],colors.teak);
  b.box([4.8,.93,2.3],[5.5,.22,2.6],colors.teak,[0,.48,0]);
  const group=b.finish(environment);group.name="lighthouse";
  group.position.set(LIGHTHOUSE.x,0,LIGHTHOUSE.z);
  group.userData.encounter="lighthouse";
  const lensBuilder=new Builder();
  lensBuilder.cylinder([0,-1.35,0],[.7,.20,.7],colors.gold,1,1,24);
  lensBuilder.rod([0,-1.25,0],[0,.25,0],.075,colors.gold);
  lensBuilder.sphere([0,0,0],[.40,.58,.40],"#fff0c5",.3,.80);
  for(let i=0;i<8;i++)lensBuilder.ring(.40+Math.sin(i/7*PI)*.42,.045,[0,-.62+i*.177,0],colors.gold);
  lensBuilder.box([0,0,.72],[1.8,1.7,.08],colors.navy);
  const lens=lensBuilder.finish(environment);lens.name="lighthouse-lens";lens.position.y=29.62;
  group.add(lens);group.userData.lens=lens;
  const panes=new Surface();
  for(let i=0;i<12;i++){
    const a=i/12*PI*2+.013,c=(i+1)/12*PI*2-.013,r=2.55;
    panes.quad([Math.cos(a)*r,27.96,Math.sin(a)*r],[Math.cos(c)*r,27.96,Math.sin(c)*r],[Math.cos(c)*r,31.50,Math.sin(c)*r],[Math.cos(a)*r,31.50,Math.sin(a)*r]);
  }
  const glazing=new Mesh(panes.geometry(),architectureMaterial("#568587",environment,.7,0,2,.17));
  glazing.material.side=DoubleSide;glazing.material.forceSinglePass=true;group.add(glazing);
  return group;
}

export function createDiveBuoy(environment:SeaEnvironment):Group {
  const b=new Builder();
  b.cylinder([0,.19,0],[.95,.6,.95],"#ece5d5",.72,1,24);
  b.cylinder([0,.59,0],[.63,.24,.63],"#be785d",1,1,24);
  b.rod([0,.6,0],[0,3.3,0],.045,colors.navy);
  const pennant=new Surface();
  pennant.quad([0,3.2,0],[1.2,3.2,0],[1.2,2.45,0],[0,2.45,0]);
  b.add(pennant.geometry(),[0,0,0],[1,1,1],"#be785d");
  b.box([.6,2.83,.018],[1.18,.13,.02],colors.white,[0,0,-.47]);
  const group=b.finish(environment);group.name="reef-dive-buoy";
  group.position.set(DIVE_BUOY.x,0,DIVE_BUOY.z);
  group.userData.encounter="reef";
  return group;
}

/** Consolidate static surfaces by finish across the whole harbor. The animated
 * optical assembly and transparent panes retain their own objects. Colors stay
 * exact; near-identical matte/teak roughness values use one authored finish. */
function batchStaticArchitecture(root:Group):void {
  const lens=root.userData.lighthouseLens as Group;
  const batches=new Map<string,{meshes:Mesh[];material:ShaderMaterial}>();
  root.updateMatrixWorld(true);
  root.traverse(object=>{
    if(!(object instanceof Mesh)||!(object.material instanceof ShaderMaterial)||object.material.transparent)return;
    for(let p=object.parent;p;p=p.parent)if(p===lens)return;
    const material=object.material,u=material.uniforms;
    if(!u.uColor||!u.uFinish)return;
    const finish=u.uFinish.value,gloss=u.uGloss.value;
    if(finish===0&&gloss<.3)u.uGloss.value=.08;
    if(finish===1&&gloss<.4)u.uGloss.value=.18;
    if(finish===4&&gloss<.4)u.uGloss.value=.20;
    const key=JSON.stringify([u.uColor.value.getHexString(),u.uGloss.value,u.uEmission.value,finish,u.uOpacity.value]);
    const batch=batches.get(key)??{meshes:[],material};batch.meshes.push(object);batches.set(key,batch);
  });
  for(const [key,batch]of batches){
    if(batch.meshes.length<2)continue;
    const geometries=batch.meshes.map(mesh=>mesh.geometry.clone().applyMatrix4(mesh.matrixWorld));
    const geometry=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());
    if(!geometry)continue;
    const discarded=new Set<ShaderMaterial>();
    for(const mesh of batch.meshes){mesh.removeFromParent();mesh.geometry.dispose();if(mesh.material!==batch.material)discarded.add(mesh.material as ShaderMaterial);}
    discarded.forEach(material=>material.dispose());
    const mesh=new Mesh(geometry,batch.material);mesh.name=`harbor-finish-${key}`;root.add(mesh);
  }
  // Merged geometry no longer carries its old encounter ancestry. These cheap
  // pick proxies preserve interactions and semantic landmark bounds, but their
  // invisible materials do not add a submitted draw call.
  const lighthouse=root.getObjectByName("lighthouse");
  if(lighthouse){
    const material=new MeshBasicMaterial();material.visible=false;
    const proxy=new Mesh(new CylinderGeometry(2.8,3.8,34.5,12),material);
    proxy.position.y=17.25;proxy.name="encounter-lighthouse";proxy.userData.encounter="lighthouse";lighthouse.add(proxy);
  }
  const buoy=root.getObjectByName("reef-dive-buoy");
  if(buoy){
    const material=new MeshBasicMaterial();material.visible=false;
    const proxy=new Mesh(new BoxGeometry(2.6,3.6,1.8),material);
    proxy.position.y=1.5;proxy.name="encounter-reef";proxy.userData.encounter="reef";buoy.add(proxy);
  }
}
