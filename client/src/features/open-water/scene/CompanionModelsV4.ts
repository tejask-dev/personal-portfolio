import {
  Box3,
  BufferGeometry,
  Color,
  DoubleSide,
  DynamicDrawUsage,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  Vector3,
  type Material,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { QualityV4, V3 } from "./VesselModelsV4";
import { swimEnvelope, SWIM_WAVENUMBER } from "./FishSwimming";

/** Original stylised reef companions: a clownfish ("nemo") and a palette
 * surgeonfish ("dory"). Shapes follow the real species, not any film design:
 * healthy symmetric fins, natural eye size, species-true markings.
 * Forward is -Z, up is +Y, the body centre sits near the origin. */
export type CompanionKindV4 = "nemo" | "dory";
export type CompanionMaterialsV4 = { skin: Material; fin: Material; eye: Material };
export type CompanionAnimateV4 = (time: number, moving?: number, turning?: number) => void;

type RGB = [number, number, number];
type Paint = (t: number, sy: number) => RGB;
type FinPaint = (u: number, v: number) => RGB;
type Species = {
  noseZ: number;
  bodyLength: number;
  joint: number;
  rx: number[];
  ry: number[];
  cy: number[];
  /** Forward bow of the paint rows at mid-height, so bands read as crescents. */
  crescent: (t: number) => number;
  boundaries: number[];
  paint: Paint;
  eye: { t: number; radius: number; height: number; iris: RGB; ring: RGB };
  pectoral: { t: number; length: number; root: number; spread: number; paint: FinPaint };
  medianFins: { t0: number; t1: number; top: boolean; height: (u: number) => number; sweep: number; paint: FinPaint }[];
  pelvic: { t: number; length: number; paint: FinPaint };
  caudal: { radius: (phi: number) => number; spread: number; paint: FinPaint };
  roughness: number;
};

const c = (hex: string): RGB => {
  const color = new Color(hex);
  return [color.r, color.g, color.b];
};
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
function catmull(values: number[], t: number) {
  const n = values.length - 1;
  const x = clamp(t, 0, 1) * n;
  const i = Math.min(Math.floor(x), n - 1);
  const f = x - i;
  const p0 = values[Math.max(i - 1, 0)];
  const p1 = values[i];
  const p2 = values[i + 1];
  const p3 = values[Math.min(i + 2, n)];
  return 0.5 * (2 * p1 + (-p0 + p2) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (-p0 + 3 * p1 - 3 * p2 + p3) * f * f * f);
}

/* ------------------------------------------------------------------ species */

const ORANGE = c("#f0611a");
const ORANGE_TOP = c("#d24a10");
const ORANGE_BELLY = c("#f89a4c");
const WHITE = c("#fbf7ee");
const INK = c("#15100d");
const nemoBands: [number, number][] = [[0.2, 0.29], [0.47, 0.57], [0.86, 0.925]];
const NEMO_EDGE = 0.016;
const fringe = (base: RGB, v: number, black = 0.8, white = 0.93): RGB =>
  v > white ? WHITE : v > black ? INK : base;

const NEMO: Species = {
  noseZ: -0.205,
  bodyLength: 0.315,
  joint: 0.6,
  rx: [0.006, 0.03, 0.041, 0.046, 0.047, 0.045, 0.04, 0.032, 0.024, 0.017, 0.014],
  ry: [0.008, 0.05, 0.068, 0.078, 0.082, 0.08, 0.072, 0.06, 0.046, 0.036, 0.032],
  cy: [-0.01, -0.005, 0, 0.003, 0.004, 0.004, 0.003, 0.002, 0.001, 0, 0],
  crescent: (t) =>
    -0.011 * Math.exp(-(((t - 0.245) / 0.07) ** 2)) - 0.008 * Math.exp(-(((t - 0.52) / 0.07) ** 2)),
  boundaries: nemoBands.flatMap(([a, b]) => [a - NEMO_EDGE, a, b, b + NEMO_EDGE]),
  paint(t, sy) {
    for (const [a, b] of nemoBands) {
      if (t >= a && t <= b) return WHITE;
      if (t >= a - NEMO_EDGE && t <= b + NEMO_EDGE) return INK;
    }
    const body = mix(ORANGE_BELLY, ORANGE, smooth(-0.75, 0.2, sy));
    return mix(body, ORANGE_TOP, smooth(0.45, 1, sy));
  },
  eye: { t: 0.115, radius: 0.0165, height: 0.3, iris: c("#c4561c"), ring: INK },
  pectoral: { t: 0.27, length: 0.052, root: 0.024, spread: 0.55, paint: (_u, v) => fringe(ORANGE, v, 0.86, 2) },
  medianFins: [
    { t0: 0.3, t1: 0.6, top: true, height: (u) => 0.022 + 0.01 * Math.sin(u * Math.PI), sweep: 0.012, paint: (_u, v) => fringe(ORANGE, v) },
    { t0: 0.6, t1: 0.86, top: true, height: (u) => 0.044 * Math.sin(Math.min(1, u * 1.15 + 0.12) * Math.PI) + 0.004, sweep: 0.016, paint: (_u, v) => fringe(ORANGE, v) },
    { t0: 0.6, t1: 0.84, top: false, height: (u) => 0.038 * Math.sin(Math.min(1, u * 1.1 + 0.1) * Math.PI) + 0.004, sweep: 0.014, paint: (_u, v) => fringe(ORANGE, v) },
  ],
  pelvic: { t: 0.3, length: 0.034, paint: (_u, v) => fringe(ORANGE, v, 0.74, 0.9) },
  caudal: {
    radius: (phi) => 0.085 * (1 - 0.16 * phi * phi),
    spread: 0.88,
    paint: (_u, v) => fringe(ORANGE, v, 0.78, 0.91),
  },
  roughness: 0.48,
};

const ROYAL = c("#1f56cf");
const SKY = c("#4a90ea");
const NAVY_INK = c("#0b1022");
const YELLOW = c("#f4c21c");
const PALE = c("#9cc6f2");
/** Palette surgeonfish pattern as soft coverage 0..1: a dark sweep from the
 * eye along the back to the tail, enclosing a blue oval, with a lower arm
 * returning to the peduncle. Soft edges keep it clean at low vertex density. */
function doryPalette(t: number, sy: number) {
  const span = (x: number, a: number, b: number, e: number) => smooth(a - e, a + e, x) * (1 - smooth(b - e, b + e, x));
  const mask = span(t, 0.085, 0.16, 0.02) * span(sy, 0.06, 0.7, 0.07);
  const upper = span(t, 0.13, 0.88, 0.035) * span(sy, 0.3 + 0.1 * (t - 0.5), 0.8 - 0.1 * t, 0.06);
  const d = Math.hypot((t - 0.5) / 0.15, (sy - 0.53) / 0.12);
  const hole = 1 - smooth(0.8, 1.15, d);
  const lower = span(t, 0.56, 0.88, 0.035) * span(sy, 0.04 + 0.55 * (t - 0.56), 0.26 + 0.25 * (t - 0.56), 0.05);
  return Math.max(mask, upper * (1 - hole), lower);
}
const DORY: Species = {
  noseZ: -0.23,
  bodyLength: 0.35,
  joint: 0.6,
  rx: [0.005, 0.022, 0.032, 0.037, 0.038, 0.037, 0.034, 0.028, 0.02, 0.013, 0.01],
  ry: [0.008, 0.045, 0.082, 0.106, 0.117, 0.117, 0.108, 0.09, 0.064, 0.04, 0.026],
  cy: [-0.016, -0.012, -0.005, 0.002, 0.004, 0.004, 0.003, 0.002, 0.001, 0, 0],
  crescent: () => 0,
  boundaries: [0.08, 0.13, 0.165, 0.35, 0.5, 0.65, 0.9, 0.93],
  paint(t, sy) {
    if (t > 0.93) return YELLOW;
    return mix(mix(SKY, ROYAL, smooth(-0.7, 0.15, sy)), NAVY_INK, doryPalette(t, sy));
  },
  eye: { t: 0.13, radius: 0.0152, height: 0.26, iris: c("#1c2440"), ring: NAVY_INK },
  pectoral: {
    t: 0.3,
    length: 0.06,
    root: 0.026,
    spread: 0.5,
    paint: (_u, v) => mix(ROYAL, YELLOW, smooth(0.25, 0.75, v)),
  },
  medianFins: [
    { t0: 0.2, t1: 0.6, top: true, height: (u) => 0.03 + 0.016 * u, sweep: 0.016, paint: (_u, v) => (v > 0.9 ? PALE : v > 0.74 ? NAVY_INK : ROYAL) },
    { t0: 0.6, t1: 0.92, top: true, height: (u) => 0.042 * Math.cos(u * 1.25) + 0.004, sweep: 0.016, paint: (_u, v) => (v > 0.9 ? PALE : v > 0.74 ? NAVY_INK : ROYAL) },
    { t0: 0.42, t1: 0.6, top: false, height: (u) => 0.02 + 0.02 * u, sweep: 0.016, paint: (_u, v) => (v > 0.9 ? PALE : v > 0.74 ? NAVY_INK : ROYAL) },
    { t0: 0.6, t1: 0.9, top: false, height: (u) => 0.036 * Math.cos(u * 1.3) + 0.004, sweep: 0.016, paint: (_u, v) => (v > 0.9 ? PALE : v > 0.74 ? NAVY_INK : ROYAL) },
  ],
  pelvic: { t: 0.33, length: 0.03, paint: (_u, v) => mix(ROYAL, NAVY_INK, smooth(0.6, 0.9, v)) },
  caudal: {
    radius: (phi) => 0.122 * (0.5 + 0.5 * Math.abs(phi / 0.95) ** 1.6),
    spread: 0.95,
    paint: (u, v) => {
      const edge = Math.abs(u - 0.5) * 2;
      if (edge > 0.82 && v > 0.18) return NAVY_INK;
      return v < 0.08 ? mix(ROYAL, YELLOW, v / 0.08) : YELLOW;
    },
  },
  roughness: 0.4,
};
const SPECIES: Record<CompanionKindV4, Species> = { nemo: NEMO, dory: DORY };

/* ----------------------------------------------------------------- geometry */

class Parts {
  readonly lists = { skin: [] as BufferGeometry[], fin: [] as BufferGeometry[], eye: [] as BufferGeometry[] };
  push(kind: keyof Parts["lists"], geometry: BufferGeometry, offset: V3) {
    geometry.translate(-offset[0], -offset[1], -offset[2]);
    this.lists[kind].push(geometry);
  }
  meshes(parent: Group, materials: CompanionMaterialsV4, prefix: string) {
    for (const kind of ["skin", "fin", "eye"] as const) {
      const list = this.lists[kind];
      if (!list.length) continue;
      const geometry = mergeGeometries(list, false);
      list.forEach((g) => g.dispose());
      if (!geometry) continue;
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      const mesh = new Mesh(geometry, materials[kind]);
      mesh.name = `${prefix}-${kind}`;
      parent.add(mesh);
    }
  }
}

function build(positions: number[], colors: number[], indices: number[]) {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function frameOf(s: Species, t: number) {
  return { rx: catmull(s.rx, t), ry: catmull(s.ry, t), cy: catmull(s.cy, t), z: s.noseZ + s.bodyLength * t };
}

/** Closed, welded loft (no seam). Rows carry exact paint boundaries so bands stay crisp. */
function loftBody(s: Species, rows: number[], columns: number, scale: (t: number) => number, capStart: boolean) {
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  for (const t of rows) {
    const f = frameOf(s, Math.min(t, 1));
    const k = scale(t);
    for (let i = 0; i < columns; i++) {
      const theta = -Math.PI / 2 + (2 * Math.PI * i) / columns;
      const sx = Math.cos(theta);
      const sy = Math.sin(theta);
      positions.push(
        f.rx * k * sx * (1 - 0.16 * Math.max(0, sy)),
        f.cy + f.ry * k * sy,
        f.z + s.crescent(t) * sx * sx,
      );
      colors.push(...s.paint(t, sy));
    }
  }
  for (let r = 0; r < rows.length - 1; r++)
    for (let i = 0; i < columns; i++) {
      const a = r * columns + i;
      const b = r * columns + ((i + 1) % columns);
      indices.push(a, b, a + columns, b, b + columns, a + columns);
    }
  const cap = (row: number, t: number, flip: boolean) => {
    const f = frameOf(s, Math.min(t, 1));
    const center = positions.length / 3;
    positions.push(0, f.cy, f.z + (flip ? -0.002 : 0.002));
    colors.push(...s.paint(t, 0));
    for (let i = 0; i < columns; i++) {
      const a = row * columns + i;
      const b = row * columns + ((i + 1) % columns);
      if (flip) indices.push(center, b, a);
      else indices.push(center, a, b);
    }
  };
  if (capStart) cap(0, rows[0], true);
  cap(rows.length - 1, rows[rows.length - 1], false);
  return build(positions, colors, indices);
}

function sheet(columns: number, rows: number, at: (u: number, v: number) => V3, paint: FinPaint) {
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  for (let r = 0; r <= rows; r++)
    for (let i = 0; i <= columns; i++) {
      const u = i / columns;
      const v = r / rows;
      positions.push(...at(u, v));
      colors.push(...paint(u, v));
    }
  for (let r = 0; r < rows; r++)
    for (let i = 0; i < columns; i++) {
      const a = r * (columns + 1) + i;
      const b = a + columns + 1;
      indices.push(a, a + 1, b, b, a + 1, b + 1);
    }
  return build(positions, colors, indices);
}

function rowsFor(s: Species, from: number, to: number, count: number) {
  const set = new Set<number>();
  for (let i = 0; i <= count; i++) set.add(+(from + ((to - from) * i) / count).toFixed(5));
  for (const b of s.boundaries) if (b > from && b < to) set.add(b);
  return [...set].sort((a, b) => a - b);
}

function eye(s: Species, side: number, quality: QualityV4) {
  const g = new SphereGeometry(1, quality === "high" ? 20 : 10, quality === "high" ? 14 : 8);
  const f = frameOf(s, s.eye.t);
  const sy = s.eye.height;
  const surface = f.rx * Math.sqrt(1 - sy * sy) * (1 - 0.16 * sy);
  const out = new Vector3(side, 0.18, -0.25).normalize();
  const light = new Vector3(side * 0.6, 0.75, -0.3).normalize();
  const p = g.getAttribute("position");
  const colors: number[] = [];
  const d = new Vector3();
  for (let i = 0; i < p.count; i++) {
    d.fromBufferAttribute(p, i);
    const facing = d.dot(out);
    const color = d.dot(light) > 0.93 ? WHITE : facing > 0.72 ? INK : facing > 0.4 ? s.eye.iris : s.eye.ring;
    colors.push(...color);
  }
  g.setAttribute("color", new Float32BufferAttribute(colors, 3));
  g.scale(s.eye.radius * 0.72, s.eye.radius, s.eye.radius);
  g.translate(side * (surface - s.eye.radius * 0.3), f.cy + f.ry * sy, f.z);
  return g;
}

function medianFin(s: Species, fin: Species["medianFins"][number], columns: number, rows: number) {
  return sheet(columns, rows, (u, v) => {
    const t = fin.t0 + (fin.t1 - fin.t0) * u;
    const f = frameOf(s, t);
    const sign = fin.top ? 1 : -1;
    const rootY = f.cy + sign * f.ry * 0.95;
    const h = fin.height(u);
    return [0, rootY + sign * h * v, f.z + fin.sweep * v * v + 0.004 * u * v];
  }, fin.paint);
}

/** Paired fin built at the origin pointing aft; its pivot hinges on Y. */
function pairedFin(side: number, length: number, root: number, spread: number, droop: number, paint: FinPaint, columns: number, rows: number) {
  return sheet(columns, rows, (u, v) => {
    const y = (u - 0.5) * root * (1 - 0.45 * v);
    const reach = length * v * (1 - 0.35 * (2 * u - 1) ** 2 * v);
    return [side * Math.sin(spread) * reach, y - droop * reach, Math.cos(spread) * reach];
  }, paint);
}

/** Build the articulated companion with the given materials. No animation state. */
export function buildCompanionV4(kind: CompanionKindV4, quality: QualityV4, materials: CompanionMaterialsV4): Group {
  const s = SPECIES[kind];
  const high = quality === "high";
  const columns = high ? 30 : 14;
  const bodyRows = high ? 56 : 24;
  const finColumns = high ? 18 : 8;
  const finRows = high ? 6 : 3;

  const root = new Group();
  root.name = `open-water-v4-${kind}-${quality}`;
  const swim = new Group();
  swim.name = `${kind}-swim`;
  root.add(swim);

  const joint = frameOf(s, s.joint);
  const end = frameOf(s, 1);
  const rearPivot: V3 = [0, joint.cy, joint.z];
  const tailPivot: V3 = [0, end.cy, end.z];

  const front = new Parts();
  const frontRows = [...rowsFor(s, 0, s.joint, Math.round(bodyRows * s.joint)), s.joint + 0.018, s.joint + 0.04];
  front.push("skin", loftBody(s, frontRows, columns, (t) => (t > s.joint ? 0.94 : 1), true), [0, 0, 0]);
  for (const side of [-1, 1]) front.push("eye", eye(s, side, quality), [0, 0, 0]);
  for (const fin of s.medianFins.filter((f) => f.t1 <= s.joint + 1e-6))
    front.push("fin", medianFin(s, fin, finColumns, finRows), [0, 0, 0]);
  {
    const f = frameOf(s, s.pelvic.t);
    for (const side of [-1, 1]) {
      const g = pairedFin(side, s.pelvic.length, 0.012, 0.32, 1.1, s.pelvic.paint, Math.ceil(finColumns / 3), finRows);
      g.translate(side * f.rx * 0.35, f.cy - f.ry * 0.9, f.z);
      front.push("fin", g, [0, 0, 0]);
    }
  }
  front.meshes(swim, materials, `${kind}-front`);

  for (const side of [-1, 1]) {
    const f = frameOf(s, s.pectoral.t);
    const pivot = new Group();
    pivot.name = `${kind}-pectoral-${side < 0 ? "left" : "right"}`;
    const at: V3 = [side * f.rx * 0.92, f.cy - f.ry * 0.18, f.z];
    pivot.position.set(...at);
    const parts = new Parts();
    parts.push("fin", pairedFin(side, s.pectoral.length, s.pectoral.root, s.pectoral.spread, 0.18, s.pectoral.paint, Math.ceil(finColumns / 2), finRows + 1), [0, 0, 0]);
    parts.meshes(pivot, materials, pivot.name);
    swim.add(pivot);
  }

  const rear = new Group();
  rear.name = `${kind}-rear`;
  rear.position.set(...rearPivot);
  swim.add(rear);
  const rearParts = new Parts();
  rearParts.push("skin", loftBody(s, rowsFor(s, s.joint, 1, Math.round(bodyRows * (1 - s.joint))), columns, () => 1, false), rearPivot);
  for (const fin of s.medianFins.filter((f) => f.t0 >= s.joint - 1e-6))
    rearParts.push("fin", medianFin(s, fin, finColumns, finRows), rearPivot);
  rearParts.meshes(rear, materials, `${kind}-rear`);

  const tail = new Group();
  tail.name = `${kind}-tail`;
  tail.position.set(tailPivot[0] - rearPivot[0], tailPivot[1] - rearPivot[1], tailPivot[2] - rearPivot[2]);
  rear.add(tail);
  const tailParts = new Parts();
  const caudal = s.caudal;
  tailParts.push(
    "fin",
    sheet(high ? 22 : 10, high ? 8 : 4, (u, v) => {
      const phi = (u * 2 - 1) * caudal.spread;
      const r = caudal.radius(phi);
      const rootY = (u * 2 - 1) * end.ry * 0.9;
      return [0, rootY + (Math.sin(phi) * r - rootY) * v, -0.006 + Math.cos(phi) * r * v];
    }, caudal.paint),
    [0, 0, 0],
  );
  tailParts.meshes(tail, materials, `${kind}-tail`);

  root.updateMatrixWorld(true);
  const bounds = new Box3().setFromObject(root);
  const size = bounds.getSize(new Vector3());
  let triangles = 0;
  root.traverse((o) => {
    if (o instanceof Mesh) triangles += (o.geometry.index?.count ?? 0) / 3;
  });
  root.userData = {
    model: "v4-original",
    kind,
    species: kind === "nemo" ? "clownfish (Amphiprion-inspired)" : "palette surgeonfish (Paracanthurus-inspired)",
    quality,
    forward: "-Z",
    up: "+Y",
    length: +size.z.toFixed(4),
    height: +size.y.toFixed(4),
    width: +size.x.toFixed(4),
    bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() },
    triangles,
    rig: [swim.name, rear.name, tail.name, `${kind}-pectoral-left`, `${kind}-pectoral-right`],
  };
  return root;
}

/** Plain material set, used for export and wrapped with the sea medium at runtime. */
export function companionMaterialsV4(kind: CompanionKindV4): CompanionMaterialsV4 {
  const s = SPECIES[kind];
  const skin = new MeshStandardMaterial({ color: "#ffffff", vertexColors: true, roughness: s.roughness, side: DoubleSide });
  const fin = new MeshStandardMaterial({ color: "#ffffff", vertexColors: true, roughness: 0.62, side: DoubleSide });
  const eyeMaterial = new MeshStandardMaterial({ color: "#ffffff", vertexColors: true, roughness: 0.12, side: DoubleSide });
  skin.name = `v4-${kind}-skin`;
  fin.name = `v4-${kind}-fin`;
  eyeMaterial.name = `v4-${kind}-eye`;
  return { skin, fin, eye: eyeMaterial };
}

/** Continuous CPU body deformation adapted from the MIT Sea traveling wave.
 * Preserve real vertex positions for picking, collision inspection and export
 * tests. All articulated parts use the same fish-local phase at their seam.
 * The caller owns time. Repeated timestamps are exactly still, even if input
 * changes; no bobbing/whole-model rotation substitutes for a tail stroke. */
export function attachCompanionAnimationV4(root: Group): CompanionAnimateV4 {
  const kind = root.userData.kind as CompanionKindV4;
  const species = SPECIES[kind];
  const swim = root.getObjectByName(`${kind}-swim`)!;
  const left = root.getObjectByName(`${kind}-pectoral-left`)!;
  const right = root.getObjectByName(`${kind}-pectoral-right`)!;
  const tempo = kind === "nemo" ? 1.08 : 0.9;
  const length = Number(root.userData.length);
  root.updateMatrixWorld(true);
  const origin = root.getWorldPosition(new Vector3());
  const parts: {
    mesh: Mesh; rest: Float32Array; normals: Float32Array;
    weight: Float32Array; slope: Float32Array; phaseSin: Float32Array; phaseCos: Float32Array;
  }[] = [];
  root.traverse(object => {
    if (!(object instanceof Mesh)) return;
    const position = object.geometry.getAttribute("position"), normal = object.geometry.getAttribute("normal");
    const offset = object.getWorldPosition(new Vector3()).sub(origin);
    const rest = Float32Array.from(position.array), normals = Float32Array.from(normal.array);
    const weight = new Float32Array(position.count), slope = new Float32Array(position.count);
    const phaseSin = new Float32Array(position.count), phaseCos = new Float32Array(position.count);
    for (let i = 0; i < position.count; i++) {
      const along = (rest[i * 3 + 2] + offset.z - species.noseZ) / length;
      const envelope = swimEnvelope(along);
      weight[i] = envelope.weight; slope[i] = envelope.slope / length;
      phaseSin[i] = Math.sin(along * SWIM_WAVENUMBER); phaseCos[i] = Math.cos(along * SWIM_WAVENUMBER);
    }
    position.setUsage(DynamicDrawUsage); normal.setUsage(DynamicDrawUsage);
    parts.push({ mesh: object, rest, normals, weight, slope, phaseSin, phaseCos });
  });
  let last: number | undefined, beat = 0, scull = 0, activity = 0, steering = 0;
  const animate: CompanionAnimateV4 = (time, moving = 0, turning = 0) => {
    if (!Number.isFinite(time)) return;
    const first = last === undefined;
    if (!first && time === last) return;
    const dt = first ? 0 : clamp(time - last!, 0, 0.1);
    last = time;
    const target = clamp(Number.isFinite(moving) ? moving : 0, 0, 1);
    const turn = clamp(Number.isFinite(turning) ? turning : 0, -1, 1);
    activity = first ? target : activity + (target - activity) * (1 - Math.exp(-dt * 7));
    steering += (turn - steering) * (1 - Math.exp(-dt * 6));
    beat += dt * Math.PI * 2 * tempo * (0.9 + 1.65 * activity);
    scull += dt * Math.PI * 2 * tempo * (1.6 + 0.55 * activity);
    const amplitude = length * (0.038 + 0.098 * activity);
    const curve = -steering * length * 0.085;
    const sin = Math.sin(beat), cos = Math.cos(beat);
    for (const part of parts) {
      const geometry = part.mesh.geometry, position = geometry.getAttribute("position"), normal = geometry.getAttribute("normal");
      for (let i = 0; i < position.count; i++) {
        const wave = part.phaseSin[i] * cos - part.phaseCos[i] * sin;
        const waveCos = part.phaseCos[i] * cos + part.phaseSin[i] * sin;
        const offset = part.weight[i] * (wave * amplitude + curve);
        const gradient = part.slope[i] * (wave * amplitude + curve) + part.weight[i] * waveCos * SWIM_WAVENUMBER / length * amplitude;
        position.setXYZ(i, part.rest[i * 3] + offset, part.rest[i * 3 + 1], part.rest[i * 3 + 2]);
        const nx = part.normals[i * 3], ny = part.normals[i * 3 + 1], nz = part.normals[i * 3 + 2] - nx * gradient;
        const inverse = 1 / Math.max(0.00001, Math.hypot(nx, ny, nz));
        normal.setXYZ(i, nx * inverse, ny * inverse, nz * inverse);
      }
      position.needsUpdate = true; normal.needsUpdate = true;
      geometry.computeBoundingBox(); geometry.computeBoundingSphere();
    }
    // Tail is a flexible sheet, no longer a rigid hinged plate. Pectoral fins
    // paddle about their shoulders; an actual turn produces a restrained bank.
    swim.rotation.set(0, 0, -steering * 0.12);
    const flap = Math.sin(scull) * (0.52 - 0.14 * activity);
    left.rotation.y = -flap + 0.18 * activity;
    right.rotation.y = flap - 0.18 * activity;
    left.rotation.z = Math.cos(scull) * 0.12;
    right.rotation.z = -Math.cos(scull) * 0.12;
    root.userData.swimEffort = activity;
    root.userData.swimPhase = beat;
  };
  return animate;
}
