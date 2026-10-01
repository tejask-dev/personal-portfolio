import {
  BoxGeometry,
  BufferGeometry,
  CatmullRomCurve3,
  CylinderGeometry,
  Euler,
  Float32BufferAttribute,
  Group,
  Matrix4,
  Mesh,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector3,
  type Material,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { SurfaceFinish } from "./materials";

/** Original Open Water V4 vessels. Every surface is authored here; no external
 * mesh, drawing or branded geometry is used. Units are scene metres, Y-up,
 * bow toward -Z and the mean waterline at y=0. */
export type QualityV4 = "low" | "high";
export type VesselKindV4 = "superyacht" | "tender";
export type V3 = [number, number, number];
type V2 = [number, number];

export type FinishV4 = {
  name: string;
  color: string;
  gloss: number;
  finish: SurfaceFinish;
  emission: number;
};

/** Stable material slots. Names are written to the GLBs and resolved back to
 * architectureMaterial by the loader, as the V3 yacht loader does. Eight slots
 * keep each vessel at or below eight draw calls after batching. */
export const FINISHES_V4 = {
  ivory: { name: "v4-ivory-gelcoat", color: "#f0ede3", gloss: 0.74, finish: 4, emission: 0 },
  teak: { name: "v4-teak", color: "#a98150", gloss: 0.16, finish: 1, emission: 0 },
  glass: { name: "v4-dark-glazing", color: "#0e222c", gloss: 0.95, finish: 2, emission: 0 },
  chrome: { name: "v4-stainless", color: "#c9d6d9", gloss: 0.88, finish: 3, emission: 0 },
  dark: { name: "v4-navy-boot", color: "#15252e", gloss: 0.42, finish: 0, emission: 0 },
  lamp: { name: "v4-lamp-white", color: "#fff3d2", gloss: 0.3, finish: 0, emission: 0.85 },
  port: { name: "v4-lamp-port", color: "#e0412f", gloss: 0.3, finish: 0, emission: 0.8 },
  starboard: { name: "v4-lamp-starboard", color: "#3cc46a", gloss: 0.3, finish: 0, emission: 0.8 },
} as const satisfies Record<string, FinishV4>;
export const FINISH_BY_NAME_V4: ReadonlyMap<string, FinishV4> = new Map(
  Object.values(FINISHES_V4).map((finish) => [finish.name, finish]),
);
const F = FINISHES_V4;

export const VESSEL_DIMENSIONS_V4 = {
  superyacht: { length: 28, beam: 7.6, waterline: 0 },
  tender: { length: 10, beam: 3.4, waterline: 0 },
} as const;

const PI = Math.PI;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Reduce any source to position/normal/index so batches merge and export alike. */
function clean(source: BufferGeometry): BufferGeometry {
  if (!source.getAttribute("normal")) source.computeVertexNormals();
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", source.getAttribute("position").clone());
  geometry.setAttribute("normal", source.getAttribute("normal").clone());
  const count = source.getAttribute("position").count;
  geometry.setIndex(
    source.index
      ? Array.from(source.index.array as ArrayLike<number>)
      : Array.from({ length: count }, (_, i) => i),
  );
  source.dispose();
  return geometry;
}

/** Indexed (u,v) patch with continuous normals. */
export function gridSurfaceV4(
  columns: number,
  rows: number,
  at: (u: number, v: number) => V3,
  flip = false,
): BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  for (let row = 0; row <= rows; row++)
    for (let column = 0; column <= columns; column++)
      positions.push(...at(column / columns, row / rows));
  for (let row = 0; row < rows; row++)
    for (let column = 0; column < columns; column++) {
      const a = row * (columns + 1) + column;
      const b = a + columns + 1;
      // Front face normal is d(u) x d(v); flip reverses it for surfaces whose
      // parameterisation runs the other way round.
      if (flip) indices.push(a, b, a + 1, b, b + 1, a + 1);
      else indices.push(a, a + 1, b, b, a + 1, b + 1);
    }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** Upward-facing cap: ring is ordered port-nose → bow → starboard → aft. */
function fan(center: V3, ring: V3[], down = false): BufferGeometry {
  const positions = [...center, ...ring.flat()];
  const indices: number[] = [];
  for (let i = 0; i < ring.length; i++)
    if (down) indices.push(0, 1 + i, 1 + ((i + 1) % ring.length));
    else indices.push(0, 1 + ((i + 1) % ring.length), 1 + i);
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** Material-batching builder. Geometry is baked in place; finish() emits one
 * mesh per finish slot using the supplied runtime or export material. */
export class VesselBuilderV4 {
  readonly batches = new Map<string, { finish: FinishV4; parts: BufferGeometry[] }>();
  constructor(readonly quality: QualityV4) {}
  n(low: number, high: number) {
    return this.quality === "high" ? high : low;
  }
  add(
    geometry: BufferGeometry,
    finish: FinishV4,
    p: V3 = [0, 0, 0],
    s: V3 = [1, 1, 1],
    r: V3 = [0, 0, 0],
  ) {
    const g = clean(geometry);
    g.applyMatrix4(
      new Matrix4().compose(
        new Vector3(...p),
        new Quaternion().setFromEuler(new Euler(...r, "YXZ")),
        new Vector3(...s),
      ),
    );
    const batch = this.batches.get(finish.name) ?? { finish, parts: [] };
    batch.parts.push(g);
    this.batches.set(finish.name, batch);
  }
  box(p: V3, size: V3, finish: FinishV4, r: V3 = [0, 0, 0]) {
    this.add(new BoxGeometry(), finish, p, size, r);
  }
  rounded(p: V3, size: V3, finish: FinishV4, radius = 0.08, r: V3 = [0, 0, 0]) {
    const safe = Math.min(radius, Math.min(...size) * 0.49);
    this.add(
      new RoundedBoxGeometry(size[0], size[1], size[2], this.n(1, 3), safe),
      finish,
      p,
      [1, 1, 1],
      r,
    );
  }
  cylinder(p: V3, radius: number, height: number, finish: FinishV4, r: V3 = [0, 0, 0], segments?: number) {
    this.add(
      new CylinderGeometry(radius, radius, height, segments ?? this.n(10, 20)),
      finish,
      p,
      [1, 1, 1],
      r,
    );
  }
  sphere(p: V3, scale: V3, finish: FinishV4) {
    this.add(new SphereGeometry(1, this.n(10, 18), this.n(6, 12)), finish, p, scale);
  }
  torus(p: V3, radius: number, tube: number, finish: FinishV4, r: V3 = [0, 0, 0]) {
    this.add(new TorusGeometry(radius, tube, this.n(5, 8), this.n(20, 40)), finish, p, [1, 1, 1], r);
  }
  tube(points: V3[], radius: number, finish: FinishV4, closed = false) {
    if (points.length < 2) return;
    this.add(
      new TubeGeometry(
        new CatmullRomCurve3(points.map((p) => new Vector3(...p)), closed, "centripetal"),
        Math.max(6, points.length * this.n(2, 4)),
        radius,
        this.n(5, 8),
        closed,
      ),
      finish,
    );
  }
  rod(a: V3, b: V3, radius: number, finish: FinishV4) {
    const direction = new Vector3(...b).sub(new Vector3(...a));
    const g = new CylinderGeometry(radius, radius, direction.length(), this.n(5, 8), 1, true);
    g.applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction.normalize()));
    this.add(g, finish, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]);
  }
  surface(columns: number, rows: number, at: (u: number, v: number) => V3, finish: FinishV4, flip = false) {
    this.add(gridSurfaceV4(columns, rows, at, flip), finish);
  }
  finish(material: (finish: FinishV4) => Material): Group {
    const group = new Group();
    for (const { finish, parts } of this.batches.values()) {
      const geometry = mergeGeometries(parts, false);
      parts.forEach((part) => part.dispose());
      if (!geometry) continue;
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      const mesh = new Mesh(geometry, material(finish));
      mesh.name = finish.name;
      group.add(mesh);
    }
    this.batches.clear();
    return group;
  }
}

/* ------------------------------------------------------------------ hull loft */

type HullForm = {
  z0: number;
  z1: number;
  /** Uniform stations bow→stern: [half-beam at sheer, sheer height, keel height]. */
  stations: [number, number, number][];
  /** Aftward sweep of the forefoot, giving a raked stem. */
  rake: number;
  /** Section fullness: <1 soft round bilge, >1 firmer V. */
  fullness: number;
};
type Frame = { z: number; w: number; s: number; k: number };

function catmull(values: number[], t: number) {
  const n = values.length - 1;
  const x = clamp01(t) * n;
  const i = Math.min(Math.floor(x), n - 1);
  const f = x - i;
  const p0 = values[Math.max(i - 1, 0)];
  const p1 = values[i];
  const p2 = values[i + 1];
  const p3 = values[Math.min(i + 2, n)];
  return (
    0.5 *
    (2 * p1 + (-p0 + p2) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (-p0 + 3 * p1 - 3 * p2 + p3) * f * f * f)
  );
}
function frame(form: HullForm, t: number): Frame {
  return {
    z: lerp(form.z0, form.z1, t),
    // Clamp the spline to the widest station so the contract beam is exact.
    w: Math.min(Math.max(...form.stations.map((s) => s[0])), Math.max(0.005, catmull(form.stations.map((s) => s[0]), t))),
    s: catmull(form.stations.map((s) => s[1]), t),
    k: catmull(form.stations.map((s) => s[2]), t),
  };
}
/** Girth angle (0 sheer → π/2 keel) where the section reaches height y. */
function girth(form: HullForm, f: Frame, y: number) {
  return Math.asin(Math.pow(clamp01((f.s - y) / Math.max(f.s - f.k, 1e-4)), 1 / form.fullness));
}
function hullPoint(form: HullForm, t: number, a: number, side: number, offset = 0): V3 {
  const f = frame(form, t);
  const c = Math.cos(a);
  const sn = Math.sin(a);
  return [
    side * (f.w * c + offset * c),
    f.s - Math.pow(sn, form.fullness) * (f.s - f.k) - offset * sn,
    f.z + sn * form.rake * (1 - t) ** 3,
  ];
}
function hullBand(
  b: VesselBuilderV4,
  form: HullForm,
  side: number,
  t0: number,
  t1: number,
  yTop: number,
  yBottom: number,
  finish: FinishV4,
  columns: number,
  rows: number,
  offset = 0,
) {
  b.surface(columns, rows, (u, v) => {
    const t = lerp(t0, t1, v);
    const f = frame(form, t);
    return hullPoint(form, t, lerp(girth(form, f, yTop), girth(form, f, yBottom), u), side, offset);
  }, finish, side > 0);
}
function transom(b: VesselBuilderV4, form: HullForm, yTop: number, yBottom: number, finish: FinishV4, rows: number) {
  const f = frame(form, 1);
  const a0 = girth(form, f, yTop);
  const a1 = girth(form, f, yBottom);
  b.surface(8, rows, (u, v) => {
    const p = hullPoint(form, 1, lerp(a0, a1, v), 1);
    return [lerp(-p[0], p[0], u), p[1], f.z];
  }, finish, true);
}
function deck(
  b: VesselBuilderV4,
  form: HullForm,
  t0: number,
  t1: number,
  inset: number,
  lift: number,
  finish: FinishV4,
  columns: number,
  rows: number,
) {
  b.surface(columns, rows, (u, v) => {
    const f = frame(form, lerp(t0, t1, v));
    const x = 2 * u - 1;
    return [x * f.w * inset, f.s + lift + 0.05 * (1 - x * x), f.z];
  }, finish, true);
}
function sheerAt(form: HullForm, z: number) {
  return frame(form, clamp01((z - form.z0) / (form.z1 - form.z0)));
}

/* -------------------------------------------------------- deckhouse geometry */

/** Closed plan outline [x,z]: elliptical nose at zf, straight sides, rounded aft corners. */
function outline(hw: number, zf: number, za: number, nose: number, radius: number, n: number): V2[] {
  const points: V2[] = [];
  for (let i = 0; i <= n; i++) {
    const phi = -PI / 2 + (PI * i) / n;
    points.push([hw * Math.sin(phi), zf + nose * (1 - Math.cos(phi))]);
  }
  const sides = Math.max(2, Math.round(n / 3));
  const corner = Math.max(2, Math.round(n / 4));
  const zs = zf + nose;
  const ze = za - radius;
  for (let i = 1; i < sides; i++) points.push([hw, lerp(zs, ze, i / sides)]);
  for (let i = 0; i <= corner; i++) {
    const a = ((PI / 2) * i) / corner;
    points.push([hw - radius + radius * Math.cos(a), ze + radius * Math.sin(a)]);
  }
  for (let i = 0; i <= corner; i++) {
    const a = PI / 2 + ((PI / 2) * i) / corner;
    points.push([-hw + radius + radius * Math.cos(a), ze + radius * Math.sin(a)]);
  }
  for (let i = 1; i < sides; i++) points.push([-hw, lerp(ze, zs, i / sides)]);
  return points;
}
function normals2(points: V2[]): V2[] {
  const cx = points.reduce((s, p) => s + p[0], 0) / points.length;
  const cz = points.reduce((s, p) => s + p[1], 0) / points.length;
  return points.map((p, i) => {
    const prev = points[(i - 1 + points.length) % points.length];
    const next = points[(i + 1) % points.length];
    let nx = next[1] - prev[1];
    let nz = -(next[0] - prev[0]);
    const l = Math.hypot(nx, nz) || 1;
    nx /= l;
    nz /= l;
    if (nx * (p[0] - cx) + nz * (p[1] - cz) < 0) return [-nx, -nz];
    return [nx, nz];
  });
}
/** Raked, tumblehome deckhouse tier: walls between two outlines plus a roof cap. */
function tier(b: VesselBuilderV4, bottom: V2[], top: V2[], y0: number, y1: number, finish: FinishV4, cap = true, soffit = false) {
  const n = bottom.length;
  b.surface(n, 1, (u, v) => {
    const i = Math.round(u * n) % n;
    return [lerp(bottom[i][0], top[i][0], v), lerp(y0, y1, v), lerp(bottom[i][1], top[i][1], v)];
  }, finish, true);
  if (cap) {
    const cx = top.reduce((s, p) => s + p[0], 0) / n;
    const cz = top.reduce((s, p) => s + p[1], 0) / n;
    b.add(fan([cx, y1, cz], top.map((p) => [p[0], y1, p[1]] as V3)), finish);
  }
  if (soffit) {
    const cx = bottom.reduce((s, p) => s + p[0], 0) / n;
    const cz = bottom.reduce((s, p) => s + p[1], 0) / n;
    b.add(fan([cx, y0, cz], bottom.map((p) => [p[0], y0, p[1]] as V3), true), finish);
  }
}
/** Continuous glazing band laid just proud of a tier wall. */
function glazing(b: VesselBuilderV4, bottom: V2[], top: V2[], y0: number, y1: number, f0: number, f1: number, finish: FinishV4) {
  const n = bottom.length;
  const nb = normals2(bottom);
  b.surface(n, 1, (u, v) => {
    const i = Math.round(u * n) % n;
    const f = lerp(f0, f1, v);
    return [
      lerp(bottom[i][0], top[i][0], f) + nb[i][0] * 0.045,
      lerp(y0, y1, f),
      lerp(bottom[i][1], top[i][1], f) + nb[i][1] * 0.045,
    ];
  }, finish, true);
}
function railLoop(b: VesselBuilderV4, plan: V2[], base: number, height: number, every: number) {
  b.tube(plan.map((p) => [p[0], base + height, p[1]] as V3), 0.028, F.chrome, true);
  b.tube(plan.map((p) => [p[0], base + height * 0.5, p[1]] as V3), 0.012, F.chrome, true);
  for (let i = 0; i < plan.length; i += every)
    b.rod([plan[i][0], base, plan[i][1]], [plan[i][0], base + height, plan[i][1]], 0.02, F.chrome);
}

/* -------------------------------------------------------------- superyacht */

/** Original ~50 m-proportioned tri-deck motor yacht at 28 m runtime length:
 * raked stem, flared bow, long sheer, panoramic dark glazing on two stepped
 * tiers, flybridge with arch, teak decks, fine rails, navigation lights and
 * a stern bathing platform. Proportions follow 50–55 m Dutch fast-displacement
 * yachts (beam ≈ 0.27 L, three tiers), without copying any builder's lines. */
export function buildSuperyachtV4(b: VesselBuilderV4) {
  const form: HullForm = {
    z0: -14,
    z1: 12.4,
    rake: 2.6,
    fullness: 0.78,
    stations: [
      [0.03, 3.85, 2.2],
      [1.55, 3.55, -0.9],
      [2.75, 3.3, -1.75],
      [3.45, 3.12, -2.0],
      [3.78, 3.0, -2.0],
      [3.8, 2.92, -1.9],
      [3.74, 2.86, -1.6],
      [3.62, 2.8, -1.15],
      [3.5, 2.76, -0.55],
    ],
  };
  const rows = b.n(56, 150);
  const boot = 0.34;
  for (const side of [-1, 1]) {
    hullBand(b, form, side, 0, 1, 99, boot, F.ivory, b.n(10, 20), rows);
    hullBand(b, form, side, 0, 1, boot, -99, F.dark, b.n(7, 14), rows);
    // Long lower-deck guest windows and the forward anchor pockets.
    for (const [t0, t1] of [[0.34, 0.46], [0.49, 0.6], [0.63, 0.7]] as const)
      hullBand(b, form, side, t0, t1, 1.66, 1.24, F.glass, 2, b.n(4, 10), 0.045);
    hullBand(b, form, side, 0.055, 0.1, 2.95, 2.35, F.dark, 2, 3, 0.045);
    // Stowed anchor seated in its pocket.
    const anchor = hullPoint(form, 0.078, girth(form, frame(form, 0.078), 2.62), side, 0.06);
    b.rounded(anchor, [0.08, 0.42, 0.34], F.chrome, 0.04);
    // A slim chrome cove line under the sheer.
    b.tube(
      Array.from({ length: b.n(14, 36) + 1 }, (_, i) => {
        const t = 0.03 + (0.95 * i) / b.n(14, 36);
        const f = frame(form, t);
        return hullPoint(form, t, girth(form, f, f.s - 0.42), side, -0.008);
      }),
      0.016,
      F.chrome,
    );
  }
  transom(b, form, 99, boot, F.ivory, 6);
  transom(b, form, boot, -99, F.dark, 3);
  // Transom garage door frame and stern light.
  const zt = form.z1 + 0.015;
  b.box([0, 0.86, zt], [3.1, 0.06, 0.03], F.dark);
  b.box([0, 2.06, zt], [3.1, 0.06, 0.03], F.dark);
  for (const x of [-1.52, 1.52]) b.box([x, 1.46, zt], [0.06, 1.26, 0.03], F.dark);
  b.sphere([0, 2.5, zt + 0.03], [0.07, 0.07, 0.05], F.lamp);

  // Decks: ivory covering board under a teak field.
  deck(b, form, 0, 1, 0.999, 0, F.ivory, b.n(8, 14), b.n(40, 100));
  deck(b, form, 0.035, 0.985, 0.9, 0.022, F.teak, b.n(6, 10), b.n(30, 80));

  // Bulwarks forward and around the aft deck; side decks remain open-railed.
  for (const side of [-1, 1]) {
    for (const [t0, t1, h] of [[0, 0.31, 0.82], [0.66, 0.995, 0.95]] as const) {
      const r = b.n(10, 30);
      b.surface(1, r, (u, v) => {
        const f = frame(form, lerp(t0, t1, v));
        return [side * f.w, f.s + u * h, f.z];
      }, F.ivory, side < 0);
      b.surface(1, r, (u, v) => {
        const f = frame(form, lerp(t0, t1, v));
        return [side * Math.max(0, f.w - 0.1), f.s + u * h, f.z];
      }, F.ivory, side > 0);
      b.surface(1, r, (u, v) => {
        const f = frame(form, lerp(t0, t1, v));
        return [side * lerp(f.w, Math.max(0, f.w - 0.12), u), f.s + h, f.z];
      }, F.teak, side < 0);
    }
    // Fine stainless rail from bow to aft stairs.
    const count = b.n(18, 46);
    const rail: V3[] = [];
    for (let i = 0; i <= count; i++) {
      const t = 0.015 + (0.955 * i) / count;
      const f = frame(form, t);
      rail.push([side * f.w * 0.975, f.s + 1.08, f.z]);
    }
    b.tube(rail, 0.026, F.chrome);
    const wire: V3[] = [];
    for (let i = 0; i <= 10; i++) {
      const t = 0.31 + (0.35 * i) / 10;
      const f = frame(form, t);
      wire.push([side * f.w * 0.975, f.s + 0.55, f.z]);
    }
    b.tube(wire, 0.011, F.chrome);
    for (let i = 1; i < count; i += b.n(2, 2)) {
      const t = 0.015 + (0.955 * i) / count;
      const f = frame(form, t);
      const onBulwark = t < 0.31 || t > 0.66;
      b.rod(
        [side * f.w * 0.975, f.s + (onBulwark ? 0.82 : 0.02), f.z],
        [side * f.w * 0.975, f.s + 1.08, f.z],
        0.016,
        F.chrome,
      );
    }
    // Mooring cleats.
    for (const z of [-11.2, -6.0, 5.5, 11.6]) {
      const f = sheerAt(form, z);
      b.rounded([side * (f.w - 0.32), f.s + 0.1, z], [0.1, 0.07, 0.34], F.chrome, 0.03);
    }
  }

  // Main deck tier: raked, wraparound glazing.
  const q = b.n(14, 28);
  const main0 = outline(3.02, -7.4, 6.0, 3.4, 0.9, q);
  const main1 = outline(2.84, -6.0, 5.85, 2.8, 0.82, q);
  tier(b, main0, main1, 2.7, 5.3, F.ivory, false);
  glazing(b, main0, main1, 2.7, 5.3, 0.4, 0.88, F.glass);
  // Main roof with aft overhang shading the cockpit.
  const roof0 = outline(3.14, -6.35, 8.9, 2.9, 0.9, q);
  const roof1 = outline(3.06, -6.22, 8.82, 2.8, 0.85, q);
  tier(b, roof0, roof1, 5.3, 5.46, F.ivory, true, true);
  for (const x of [-2.72, 2.72]) b.rod([x, 2.84, 8.45], [x, 5.31, 8.45], 0.055, F.chrome);

  // Bridge tier, stepped aft of the forward terrace.
  const bridge0 = outline(2.5, -4.3, 3.4, 2.6, 0.7, q);
  const bridge1 = outline(2.32, -3.2, 3.25, 2.15, 0.62, q);
  tier(b, bridge0, bridge1, 5.4, 7.42, F.ivory, false);
  glazing(b, bridge0, bridge1, 5.4, 7.42, 0.27, 0.84, F.glass);
  const top0 = outline(2.7, -3.45, 6.3, 2.4, 0.8, q);
  const top1 = outline(2.63, -3.33, 6.22, 2.3, 0.75, q);
  tier(b, top0, top1, 7.42, 7.58, F.ivory, true, true);
  if (b.quality === "high") {
    // Slender mullions break the bridge glazing into wheelhouse panes.
    const nb = normals2(bridge0);
    for (const i of [Math.round(q * 0.3), Math.round(q * 0.7), q + 3, bridge0.length - 3]) {
      const p0 = bridge0[i];
      const p1 = bridge1[i];
      b.rod(
        [p0[0] + nb[i][0] * 0.03, lerp(5.4, 7.42, 0.25), p0[1] + nb[i][1] * 0.03],
        [lerp(p0[0], p1[0], 0.86) + nb[i][0] * 0.03, lerp(5.4, 7.42, 0.86), lerp(p0[1], p1[1], 0.86) + nb[i][1] * 0.03],
        0.03,
        F.ivory,
      );
    }
  }

  // Upper aft deck and its rail.
  b.rounded([0, 5.475, 6.12], [5.7, 0.03, 5.1], F.teak, 0.012);
  railLoop(b, outline(2.98, -6.12, 8.72, 2.8, 0.8, q), 5.46, 0.95, b.n(4, 3));
  for (const x of [-1, 1]) b.rounded([x * 2.1, 5.72, 6.6], [0.75, 0.42, 3.2], F.ivory, 0.12);
  b.rounded([0, 5.72, 8.3], [3.6, 0.42, 0.7], F.ivory, 0.12);
  b.rounded([0, 5.86, 6.4], [1.4, 0.06, 1.6], F.teak, 0.03);
  b.cylinder([0, 5.65, 6.4], 0.06, 0.38, F.chrome);

  // Flybridge: teak sole, helm, sunpads, windbreak, radar arch.
  b.rounded([0, 7.595, 2.2], [4.5, 0.03, 7.0], F.teak, 0.012);
  railLoop(b, outline(2.55, -3.24, 6.14, 2.25, 0.7, q), 7.58, 0.9, b.n(4, 3));
  b.surface(b.n(10, 20), 1, (u, v) => {
    const a = -PI * 0.42 + u * PI * 0.84;
    return [Math.sin(a) * (2.0 - v * 0.12), 7.6 + v * 0.55, -1.0 - Math.cos(a) * (1.3 - v * 0.2)];
  }, F.glass, true);
  b.rounded([0, 8.05, -0.45], [1.5, 0.9, 0.62], F.dark, 0.1);
  b.rounded([0, 8.52, -0.62], [1.2, 0.06, 0.38], F.glass, 0.02, [0.45, 0, 0]);
  b.torus([0, 8.55, -0.18], 0.17, 0.018, F.chrome, [-0.9, 0, 0]);
  for (const x of [-0.55, 0.55]) {
    b.cylinder([x, 7.9, 0.55], 0.05, 0.6, F.chrome);
    b.rounded([x, 8.24, 0.55], [0.55, 0.14, 0.5], F.ivory, 0.06);
    b.rounded([x, 8.5, 0.82], [0.55, 0.5, 0.1], F.ivory, 0.05, [0.12, 0, 0]);
  }
  b.rounded([0, 7.74, 4.6], [3.4, 0.26, 2.2], F.ivory, 0.12);
  for (const x of [-1, 1]) {
    b.tube([[x * 2.05, 7.58, 1.25], [x * 1.85, 8.5, 1.95], [x * 1.3, 9.36, 2.75]], 0.11, F.ivory);
  }
  b.rounded([0, 9.42, 2.85], [2.9, 0.14, 1.25], F.ivory, 0.06);
  b.sphere([0, 9.78, 3.08], [0.48, 0.36, 0.48], F.ivory);
  b.cylinder([0, 9.62, 2.4], 0.07, 0.2, F.chrome);
  b.rounded([0, 9.75, 2.4], [1.9, 0.08, 0.16], F.dark, 0.03);
  b.rod([0, 9.49, 2.28], [0, 10.18, 2.28], 0.025, F.chrome);
  b.sphere([0, 10.24, 2.28], [0.07, 0.09, 0.07], F.lamp);
  if (b.quality === "high")
    for (const x of [-1.05, 1.05]) b.rod([x, 9.49, 3.25], [x, 10.55, 3.25], 0.018, F.chrome);

  // Sidelights on the main-roof wings: port red (-X), starboard green (+X).
  for (const side of [-1, 1]) {
    b.box([side * 2.93, 5.66, -3.1], [0.1, 0.22, 0.36], F.dark);
    b.sphere([side * 3.0, 5.66, -3.12], [0.04, 0.08, 0.12], side < 0 ? F.port : F.starboard);
  }

  // Foredeck: lounge, skylight, windlasses.
  {
    const f = sheerAt(form, -9.5);
    b.rounded([0, f.s + 0.2, -9.5], [2.5, 0.28, 2.0], F.ivory, 0.12);
    b.rounded([0, f.s + 0.42, -8.45], [2.5, 0.42, 0.2], F.ivory, 0.08, [-0.22, 0, 0]);
    b.rounded([0, sheerAt(form, -7.9).s + 0.1, -7.95], [1.25, 0.08, 0.7], F.glass, 0.03);
    const a = sheerAt(form, -11.8);
    for (const x of [-0.42, 0.42]) {
      b.cylinder([x, a.s + 0.16, -11.8], 0.15, 0.3, F.dark);
      b.cylinder([x, a.s + 0.34, -11.8], 0.1, 0.08, F.chrome);
      b.rod([x, a.s + 0.05, -11.95], [x * 0.4, a.s + 0.05, -13.1], 0.03, F.chrome);
    }
  }

  // Aft deck: sofa, table, stairs to the bathing platform.
  {
    const s = sheerAt(form, 10.5).s;
    b.rounded([0, s + 0.24, 11.55], [4.6, 0.44, 0.85], F.ivory, 0.14);
    b.rounded([0, s + 0.66, 11.95], [4.6, 0.5, 0.18], F.ivory, 0.08);
    for (const x of [-2.05, 2.05]) b.rounded([x, s + 0.24, 10.3], [0.75, 0.44, 1.9], F.ivory, 0.14);
    b.cylinder([0, s + 0.32, 10.1], 0.07, 0.6, F.chrome);
    b.rounded([0, s + 0.64, 10.1], [1.7, 0.06, 1.05], F.teak, 0.03);
    for (const side of [-1, 1]) {
      const steps = 6;
      for (let i = 0; i < steps; i++) {
        const y = s - ((i + 1) * (s - 0.56)) / (steps + 1);
        const z = form.z1 - 0.05 + i * 0.2;
        b.rounded([side * 2.85, y, z + 0.1], [0.78, 0.07, 0.24], F.teak, 0.02);
      }
      b.surface(1, 1, (u, v) => [side * 3.27, lerp(s, 0.56, v) - u * 0.3, form.z1 - 0.05 + v * 1.25], F.ivory, side > 0);
      b.tube([[side * 3.2, s + 0.9, form.z1 - 0.3], [side * 3.2, s + 0.5, form.z1 + 0.3], [side * 3.2, 1.4, form.z1 + 1.25]], 0.024, F.chrome);
    }
  }
  // Bathing platform: aft edge lands exactly at z=+14.
  b.rounded([0, 0.43, 13.025], [6.8, 0.22, 1.95], F.ivory, 0.08);
  b.rounded([0, 0.555, 13.04], [6.6, 0.04, 1.8], F.teak, 0.015);
  for (const x of [-0.24, 0.24]) b.rod([x, 0.58, 13.9], [x, -0.7, 13.9], 0.022, F.chrome);
  for (const y of [-0.55, -0.15, 0.25]) b.rod([-0.24, y, 13.9], [0.24, y, 13.9], 0.018, F.chrome);
}

/* -------------------------------------------------------------------- tender */

/** Original 10 m open centre-console tender with a firm-V hull. */
export function buildTenderV4(b: VesselBuilderV4) {
  const form: HullForm = {
    z0: -5,
    z1: 4.55,
    rake: 0.6,
    fullness: 1.35,
    stations: [
      [0.03, 1.55, 1.0],
      [0.95, 1.38, -0.22],
      [1.5, 1.25, -0.42],
      [1.7, 1.18, -0.45],
      [1.7, 1.12, -0.44],
      [1.66, 1.08, -0.42],
      [1.58, 1.05, -0.38],
    ],
  };
  const rows = b.n(26, 70);
  const floor = 0.5;
  const wall = 0.09;
  const t0 = 0.24;
  for (const side of [-1, 1]) {
    hullBand(b, form, side, 0, 1, 99, 0.18, F.ivory, b.n(6, 12), rows);
    hullBand(b, form, side, 0, 1, 0.18, -99, F.dark, b.n(5, 10), rows);
    // Inner liner of the open cockpit.
    b.surface(b.n(4, 8), b.n(18, 50), (u, v) => {
      const t = lerp(t0, 1, v);
      const f = frame(form, t);
      const a = u * girth(form, f, floor);
      const p = hullPoint(form, t, a, side);
      return [p[0] - side * wall * Math.cos(a), p[1], p[2]];
    }, F.ivory, side < 0);
    // Gunwale cap and rubbing strake.
    b.surface(1, b.n(18, 50), (u, v) => {
      const f = frame(form, lerp(t0, 1, v));
      return [side * (f.w - u * wall), f.s, f.z];
    }, F.ivory, side < 0);
    b.tube(
      Array.from({ length: b.n(12, 30) + 1 }, (_, i) => {
        const f = frame(form, 0.01 + (0.99 * i) / b.n(12, 30));
        return [side * (f.w - 0.045), f.s - 0.06, f.z] as V3;
      }),
      0.045,
      F.dark,
    );
    // Bow rail.
    const rail = Array.from({ length: 9 }, (_, i) => {
      const f = frame(form, 0.02 + (0.32 * i) / 8);
      return [side * (f.w - 0.07), f.s + 0.5, f.z] as V3;
    });
    b.tube(rail, 0.022, F.chrome);
    for (const p of rail.slice(1).filter((_, i) => i % 2 === 1))
      b.rod([p[0], p[1] - 0.5, p[2]], p, 0.016, F.chrome);
    for (const z of [-3.6, 4.1]) {
      const f = sheerAt(form, z);
      b.rounded([side * (f.w - 0.2), f.s + 0.05, z], [0.06, 0.05, 0.22], F.chrome, 0.02);
    }
    const bow = sheerAt(form, -3.4);
    b.sphere([side * (bow.w + 0.005), bow.s - 0.02, -3.4], [0.03, 0.05, 0.08], side < 0 ? F.port : F.starboard);
  }
  transom(b, form, 99, 0.18, F.ivory, 4);
  transom(b, form, 0.18, -99, F.dark, 2);
  // Bow casting deck, forward bulkhead and cockpit sole.
  deck(b, form, 0, t0, 1, 0, F.ivory, b.n(6, 10), b.n(6, 14));
  deck(b, form, 0.02, t0 - 0.01, 0.86, 0.02, F.teak, b.n(4, 8), b.n(5, 12));
  {
    const f = frame(form, t0);
    const af = girth(form, f, floor);
    b.surface(b.n(6, 10), 4, (u, v) => {
      const p = hullPoint(form, t0, lerp(0, af, v), 1);
      const x = Math.max(0, p[0] - wall * Math.cos(lerp(0, af, v)));
      return [lerp(-x, x, u), p[1], f.z];
    }, F.ivory, true);
  }
  b.surface(b.n(6, 10), b.n(14, 40), (u, v) => {
    const t = lerp(t0, 0.995, v);
    const f = frame(form, t);
    const a = girth(form, f, floor);
    const x = f.w * Math.cos(a) - wall * Math.cos(a);
    return [lerp(-x, x, u), floor + 0.01, f.z];
  }, F.teak, true);
  // Console with curved screen and wheel.
  b.rounded([0, floor + 0.53, 0.3], [1.0, 1.06, 0.78], F.ivory, 0.12);
  b.rounded([0, floor + 1.08, 0.38], [0.95, 0.07, 0.5], F.dark, 0.03, [0.3, 0, 0]);
  b.surface(b.n(8, 16), 1, (u, v) => {
    const a = -PI * 0.36 + u * PI * 0.72;
    return [Math.sin(a) * 0.62, floor + 1.08 + v * 0.42, 0.42 - Math.cos(a) * (0.42 - v * 0.08) - v * 0.12];
  }, F.glass, true);
  b.tube(
    Array.from({ length: 9 }, (_, i) => {
      const a = -PI * 0.36 + (i / 8) * PI * 0.72;
      return [Math.sin(a) * 0.62, floor + 1.5, 0.42 - Math.cos(a) * 0.34 - 0.12] as V3;
    }),
    0.018,
    F.chrome,
  );
  b.torus([0.2, floor + 1.15, 0.72], 0.17, 0.016, F.chrome, [-0.8, 0, 0]);
  // Leaning post, bow seating and stern bench.
  b.rounded([0, floor + 0.45, 1.45], [0.95, 0.9, 0.55], F.ivory, 0.1);
  b.rounded([0, floor + 1.0, 1.42], [0.95, 0.2, 0.55], F.ivory, 0.08);
  for (const x of [-0.72, 0.72]) b.rounded([x, floor + 0.2, -1.95], [0.42, 0.38, 1.1], F.ivory, 0.1);
  b.rounded([0, floor + 0.2, -2.42], [1.0, 0.38, 0.36], F.ivory, 0.1);
  b.rounded([0, floor + 0.22, 3.95], [2.5, 0.42, 0.55], F.ivory, 0.1);
  b.rounded([0, floor + 0.62, 4.27], [2.5, 0.42, 0.14], F.ivory, 0.06);
  // Twin outboards; cowls end exactly at z=+5.
  for (const x of [-0.55, 0.55]) {
    b.rounded([x, 1.28, 4.775], [0.5, 0.72, 0.45], F.dark, 0.14);
    b.rounded([x, 0.35, 4.8], [0.16, 1.2, 0.26], F.dark, 0.06);
    b.rounded([x, -0.12, 4.8], [0.36, 0.03, 0.34], F.dark, 0.012);
    b.cylinder([x, -0.24, 4.9], 0.07, 0.16, F.chrome, [PI / 2, 0, 0]);
    b.box([x, 0.92, 4.6], [0.3, 0.1, 0.1], F.chrome);
  }
  b.rod([1.25, 1.05, 4.35], [1.25, 1.95, 4.35], 0.018, F.chrome);
  b.sphere([1.25, 2.0, 4.35], [0.05, 0.06, 0.05], F.lamp);
}

export function buildVesselV4(kind: VesselKindV4, quality: QualityV4, material: (finish: FinishV4) => Material): Group {
  const b = new VesselBuilderV4(quality);
  (kind === "superyacht" ? buildSuperyachtV4 : buildTenderV4)(b);
  const group = b.finish(material);
  group.name = `open-water-v4-${kind}-${quality}`;
  return group;
}
