import {
  BoxGeometry,
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  Mesh,
  SphereGeometry,
  Vector3,
} from "three";
import {
  REEF_CENTER,
  reefTerrainDefinition,
  sampleReefFloor,
} from "../data/reefTerrain";
import { type SeaEnvironment } from "./materials";
import { Builder } from "./models";

export { sampleSeaFloor } from "../data/bathymetry";
export {
  sampleReefDepth,
  sampleReefFloor,
  getReefDepthIntervals,
  getReefCameraIntervals,
} from "../data/reefTerrain";

function wornRock(
  b: Builder,
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
  seed: number,
  color = "#b7b59b",
  surface = false,
) {
  const geometry = new SphereGeometry(1, surface ? 8 : 14, surface ? 4 : 8),
    p = geometry.getAttribute("position");
  for (let i = 0; i < p.count; i++) {
    const px = p.getX(i),
      py = p.getY(i),
      pz = p.getZ(i);
    const f =
      0.96 +
      0.035 * Math.sin(px * 8 + seed) * Math.cos(pz * 6 - seed) +
      0.025 * Math.cos(py * 9 + seed);
    const floorDelta =
      sampleReefFloor(x + px * f * sx, z + pz * f * sz) - sampleReefFloor(x, z);
    p.setXYZ(i, px * f, py * f + floorDelta / sy, pz * f);
  }
  geometry.computeVertexNormals();
  b.add(geometry, [x, y, z], [sx, sy, sz], color);
}
function coral(
  b: Builder,
  x: number,
  z: number,
  scale: number,
  seed: number,
  surface: boolean,
) {
  const floor = sampleReefFloor(x, z),
    h = 0.42 * scale;
  // Low encrusting colonies stay inside the one-unit floor clearance; tall
  // visitor-obstructing decorations need a declared solid, never hidden walls.
  wornRock(
    b,
    x,
    floor + 0.13 * scale,
    z,
    0.64 * scale,
    0.22 * scale,
    0.49 * scale,
    seed,
    "#9d9e7b",
    surface,
  );
  for (let i = 0; i < 5; i++) {
    const a = i * 2.399 + seed,
      r = 0.26 * scale;
    b.add(
      new SphereGeometry(1, surface ? 6 : 12, surface ? 4 : 8),
      [x + Math.cos(a) * r, floor + h * 0.63, z + Math.sin(a) * r],
      [0.17 * scale, 0.2 * scale, 0.13 * scale],
      i % 2 ? "#ad8068" : "#c29878",
      [0, 0, 0],
      0.015,
    );
  }
}
function grassPatch(b: Builder, x: number, z: number, seed: number) {
  const positions: number[] = [],
    normals: number[] = [];
  for (let i = 0; i < 11; i++) {
    const a = i * 2.399 + seed,
      r = 0.15 + Math.sqrt(i / 11) * 0.43;
    const px = x + Math.cos(a) * r,
      pz = z + Math.sin(a) * r,
      fy = sampleReefFloor(px, pz) + 0.02;
    const height = 0.32 + 0.24 * (0.5 + 0.5 * Math.sin(i * 3.1 + seed)),
      w = 0.035;
    const dx = Math.cos(a) * w,
      dz = Math.sin(a) * w;
    const top = new Vector3(
      px + 0.13 * Math.sin(a),
      fy + height,
      pz + 0.1 * Math.cos(a),
    );
    positions.push(
      px - dx,
      fy,
      pz - dz,
      px + dx,
      fy,
      pz + dz,
      top.x,
      top.y,
      top.z,
    );
    normals.push(0, 1, 0, 0, 1, 0, 0, 1, 0);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new Float32BufferAttribute(normals, 3));
  geometry.computeVertexNormals();
  b.add(geometry, [0, 0, 0], [1, 1, 1], "#7a9672");
}

/** Reef solids are reef-local, then translated once. Roof and piers remain
 * separate geometry: the arch is a genuine traversable opening, not a decal. */
function createReefVariant(
  environment: SeaEnvironment,
  surface: boolean,
): Group {
  const b = new Builder();
  const rock = "#c4bea3";
  const lowFloor = (x0: number, x1: number, z0: number, z1: number) =>
    Math.min(
      ...[x0, x1].flatMap((x) => [z0, z1].map((z) => sampleReefFloor(x, z))),
    ) - 0.1;
  const stone = (
    p: [number, number, number],
    size: [number, number, number],
    seed: number,
    color = rock,
  ) => {
    // Unlike a rounded box's broad flat faces, these evenly spaced sections
    // expose sloping strata all the way down the rock. Fewer triangles, with
    // every offset inscribed in the same authored collision volume.
    const g = new BoxGeometry(...size, 4, 10, 5);
    const vertices = g.getAttribute("position");
    for (let i = 0; i < vertices.count; i++) {
      const x = vertices.getX(i),
        y = vertices.getY(i),
        z = vertices.getZ(i);
      const nx = x / (size[0] * 0.5),
        nz = z / (size[2] * 0.5),
        t = y / size[1] + 0.5;
      const corner = Math.max(
        1,
        Math.pow(Math.abs(nx) ** 3 + Math.abs(nz) ** 3, 1 / 3),
      );
      const strata =
        0.89 +
        0.065 * Math.sin(t * 19 + seed) +
        0.035 * Math.cos(t * 31 + seed * 0.7);
      const taper = 0.88 + 0.12 * Math.sin(t * Math.PI);
      const sx =
        ((nx / corner) * strata * taper + 0.035 * Math.sin(t * 5 + seed) * t) *
        size[0] *
        0.5;
      const sz =
        ((nz / corner) *
          strata *
          (0.86 + 0.14 * Math.sin(t * 2.8 + seed) ** 2) +
          0.04 * Math.sin(t * 4 - seed) * t) *
        size[2] *
        0.5;
      // The base stays anchored in sand. Tops lose height only near their
      // edges; the central animal ledge retains its declared support height.
      const sy =
        y -
        Math.min(0.16, size[1] * 0.18) *
          t *
          (Math.abs(nx) * 0.45 + Math.abs(nz) * 0.35);
      vertices.setXYZ(i, sx, sy, sz);
    }
    g.computeVertexNormals();
    b.add(g, p, [1, 1, 1], color, [0, 0, 0], 0.02);
  };
  // Eroded limestone portal, bounded by the canonical three solid boxes.
  // Chamfered blocks overlap only inside each own collision proxy.
  // A continuous curved limestone lintel, with an eroded underside that rises
  // over the opening. Every vertex remains inside the canonical roof box.
  const archPositions: number[] = [],
    archIndices: number[] = [];
  const ax = 32,
    az = 12;
  for (let layer = 0; layer < 2; layer++)
    for (let iz = 0; iz <= az; iz++)
      for (let ix = 0; ix <= ax; ix++) {
        const u = ix / ax,
          v = iz / az,
          curve = Math.sin(u * Math.PI);
        const x = -6 + 6 * u,
          z =
            -4 +
            (v - 0.5) *
              3.2 *
              (0.84 + 0.075 * Math.sin(u * 17) + 0.035 * Math.cos(u * 29));
        const top =
          -4.12 - 0.3 * (1 - curve) - 0.045 * (1 + Math.sin(u * 18 + v * 13));
        const bottom =
          -4.89 + 0.24 * curve + 0.015 * (1 + Math.sin(u * 25 - v * 8));
        archPositions.push(x, layer ? top : bottom, z);
      }
  const stride = ax + 1,
    plane = (ax + 1) * (az + 1);
  for (let iz = 0; iz < az; iz++)
    for (let ix = 0; ix < ax; ix++) {
      const a = iz * stride + ix,
        b = a + 1,
        c = a + stride,
        d = c + 1;
      archIndices.push(
        a,
        b,
        c,
        b,
        d,
        c,
        a + plane,
        c + plane,
        b + plane,
        b + plane,
        c + plane,
        d + plane,
      );
    }
  const rim: number[] = [];
  for (let i = 0; i <= ax; i++) rim.push(i);
  for (let i = 1; i <= az; i++) rim.push(i * stride + ax);
  for (let i = ax - 1; i >= 0; i--) rim.push(az * stride + i);
  for (let i = az - 1; i > 0; i--) rim.push(i * stride);
  for (let i = 0; i < rim.length; i++) {
    const a = rim[i],
      b = rim[(i + 1) % rim.length];
    archIndices.push(a, a + plane, b, b, a + plane, b + plane);
  }
  const archGeometry = new BufferGeometry();
  archGeometry.setAttribute(
    "position",
    new Float32BufferAttribute(archPositions, 3),
  );
  archGeometry.setIndex(archIndices);
  archGeometry.computeVertexNormals();
  b.add(archGeometry, [0, 0, 0], [1, 1, 1], rock, [0, 0, 0], 0.02);
  for (const x of [-5.6, -0.4]) {
    const floor = lowFloor(x - 0.4, x + 0.4, -5.6, -2.4),
      height = -4.44 - floor;
    stone([x, floor + height / 2, -4], [0.8, height, 3.2], x);
  }
  stone([11.75, -4.225, -8], [2.5, 0.35, 3], 3);
  const supportFloor = lowFloor(12.65, 13, -9.5, -6.5);
  stone(
    [12.825, (supportFloor - 4.1) / 2, -8],
    [0.35, -4.1 - supportFloor, 3],
    4,
  );
  const shelfFloor = lowFloor(-18, -16.5, 6.5, 9);
  stone(
    [-17.25, (shelfFloor - 4.2) / 2, 7.75],
    [1.5, -4.2 - shelfFloor, 2.5],
    5,
    "#b7b098",
  );
  // Sparse habitat patches surround the open sandy loop, never its centerline.
  const patches: number[][] = [
    [-19, -4, 0.8, 1],
    [-13, -12, 1, 2],
    [-5, -13, 0.8, 3],
    [3, -13, 1, 4],
    [13, -8, 0.8, 5],
    [18, 5, 0.7, 6],
    [13, 13, 0.75, 7],
    [1, 13, 0.9, 8],
    [-9, 10, 0.85, 9],
    [-17, 9, 0.7, 10],
    [-9, -2, 0.7, 11],
    [1, 2, 0.8, 12],
    [6, 5, 0.6, 13],
  ];
  for (const [x, z, scale, seed] of patches) {
    coral(b, x, z, scale, seed, surface);
    grassPatch(b, x + 0.9, z - 0.6, seed);
  }
  for (let i = 0; i < 16; i++) {
    const a = i * 2.399,
      r = 12 + Math.sin(i * 1.4) * 2.5;
    grassPatch(b, Math.cos(a) * r, Math.sin(a) * r * 0.65, i * 0.7);
  }
  // Broad, low reef gardens frame the open sand loop. Their highest point is
  // under 0.8 above the bilinear floor, inside its one-unit swimmer clearance.
  // Overlapping skirts make colonies read as terrain rather than scattered toys.
  const gardens = [
    [-20, -8],
    [-13, -13],
    [-3, -14],
    [8, -13],
    [17, -10],
    [20, 6],
    [14, 14],
    [3, 14],
    [-10, 13],
    [-20, 6],
  ];
  for (let i = 0; i < gardens.length; i++) {
    const [x, z] = gardens[i];
    for (let j = 0; j < 3; j++) {
      const a = j * 2.399 + i * 0.37,
        px = x + Math.cos(a) * 0.8,
        pz = z + Math.sin(a) * 0.6;
      const y = sampleReefFloor(px, pz);
      wornRock(
        b,
        px,
        y + 0.18,
        pz,
        1.35 + 0.18 * (i % 3),
        0.38,
        1.05 + 0.15 * (j % 2),
        i + j,
        "#a4b39a",
        surface,
      );
      // Shallow plate coral: warm and mineral, without a saturated toy palette.
      const g = new SphereGeometry(1, surface ? 8 : 12, surface ? 4 : 6);
      b.add(
        g,
        [px + 0.2, y + 0.46, pz - 0.12],
        [0.83, 0.11, 0.66],
        j % 2 ? "#c6a184" : "#b99178",
        [0, 0.4 * i, 0.055],
        0.015,
      );
    }
    for (let k = 0; k < 3; k++)
      grassPatch(
        b,
        x + Math.cos(k * 2.1 + i) * 1.85,
        z + Math.sin(k * 2.1 + i) * 1.5,
        i + k,
      );
  }
  // Shell fragments and worn pebbles below floor clearance, with coherent sand.
  for (let i = 0; i < 28; i++) {
    const a = i * 2.399,
      r = 4 + Math.sqrt(i / 28) * 14,
      x = Math.cos(a) * r,
      z = Math.sin(a) * r * 0.7;
    wornRock(
      b,
      x,
      sampleReefFloor(x, z) + 0.08,
      z,
      0.16 + 0.08 * (i % 3),
      0.13,
      0.15,
      i,
      "#c2c2aa",
      surface,
    );
  }
  return b.finish(environment);
}

/** Both views remain modeled geometry with the same habitat placements. The
 * surface variant changes only small rounded forms' tessellation; arch, ledges,
 * supports and grass are identical. No allocations occur when switching views.
 * Each child owns its geometry/materials. disposeModel(group) traverses both
 * children, including the hidden one, and releases each resource exactly once.
 */
export function createReefEnvironment(environment: SeaEnvironment): Group {
  const underwater = createReefVariant(environment, false);
  underwater.name = "reef-habitat-full";
  const surface = createReefVariant(environment, true);
  surface.name = "reef-habitat-surface";
  const group = new Group();
  group.name = "bounded-reef-habitat";
  group.position.set(REEF_CENTER.x, 0, REEF_CENTER.z);
  group.userData.solids = reefTerrainDefinition.solidBoxes;
  group.add(underwater, surface);
  group.userData.setView = (mode: "surface" | "reef") => {
    underwater.visible = mode === "reef";
    surface.visible = mode === "surface";
    group.userData.view = mode;
  };
  group.userData.setView("reef");
  return group;
}
