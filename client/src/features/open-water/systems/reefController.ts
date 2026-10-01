import {
  constrainReefPoint,
  getReefDepthIntervals,
  getReefCameraIntervals,
  REEF_BOUNDS,
  reefSolids,
  sampleReefDepth,
} from "../data/reefTerrain.ts";
import {
  constrainRegionXZ, getRegion, getRegionSolids, isCaveSegmentContained, isRegionPoseSafe,
  regionClearance, regionYIntervals, sampleRegionFloor, safeRegionRestore,
  type RegionNavigation,
} from "../data/regions.ts";
export type { RegionNavigation } from "../data/regions.ts";

export type ReefPose = { x: number; y: number; z: number; heading: number };
export type ReefInput = {
  forward?: boolean;
  backward?: boolean;
  left?: boolean;
  right?: boolean;
  rise?: boolean;
  descend?: boolean;
};
export type ReefState = ReefPose & {
  target: ReefPose | null;
  current: boolean;
  currentNode: number;
  notice: string;
};
export const createReef = (context?: RegionNavigation): ReefState => ({
  x: 20,
  y: -1.5,
  z: 0,
  heading: -Math.PI / 2,
  target: null,
  current: false,
  currentNode: 0,
  notice: "",
  ...(context ? getRegion(context.regionId).spawn : {}),
});
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const distance = (a: ReefPose, b: ReefPose) =>
  Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
function nearest(value: number, intervals: [number, number][]): number | null {
  if (!intervals.length) return null;
  return intervals
    .map(([a, b]) => clamp(value, a, b))
    .sort((a, b) => Math.abs(a - value) - Math.abs(b - value))[0];
}
export function resolveReefPose(
  requested: ReefPose,
  previous: ReefPose = createReef(),
  context?: RegionNavigation,
): { pose: ReefPose; notice: string } {
  if (
    ![requested.x, requested.y, requested.z, requested.heading].every(
      Number.isFinite,
    )
  )
    return {
      pose: context ? safeRegionRestore(previous, context).pose : { ...previous },
      notice: "That position is unavailable. Your last safe view is preserved.",
    };
  if (context) {
    const point = constrainRegionXZ(requested, context.regionId);
    const y = nearest(requested.y, regionYIntervals(context.regionId, point.x, point.z, context.actor));
    if (y === null) {
      const restored = safeRegionRestore(previous, context);
      return { pose: restored.pose, notice: "Stone occupies that position. Your last safe view is preserved." };
    }
    return {
      pose: { ...point, y },
      notice: point.x !== requested.x || point.z !== requested.z
        ? "Habitat boundary. Follow the marked channel or choose a passage on the chart."
        : Math.abs(y-requested.y)>.01 ? "Depth adjusted to stay clear of the seabed or overhead stone." : "",
    };
  }
  const point = constrainReefPoint(requested);
  const depth = nearest(-requested.y, getReefDepthIntervals(point.x, point.z));
  if (depth === null)
    return {
      pose: { ...previous },
      notice: "Rock occupies that position. Choose the open sand beside it.",
    };
  return {
    pose: { ...point, y: -depth },
    notice:
      point.x !== requested.x || point.z !== requested.z
        ? "Reef boundary. You can travel along the edge."
        : Math.abs(depth + requested.y) > 0.01
          ? `Depth adjusted to ${depth.toFixed(1)} to keep clear of sand or overhead rock.`
          : "",
  };
}
function pointSafe(p: ReefPose, camera = false, context?: RegionNavigation) {
  if(context) return isRegionPoseSafe(p, context, camera);
  if (![p.x, p.y, p.z].every(Number.isFinite)) return false;
  if (Math.hypot(p.x / REEF_BOUNDS.x, p.z / REEF_BOUNDS.z) > 1.000001)
    return false;
  const intervals = camera
    ? getReefCameraIntervals(p.x, p.z)
    : getReefDepthIntervals(p.x, p.z);
  const value = camera ? p.y : -p.y;
  return intervals.some(([a, b]) => value >= a - 1e-7 && value <= b + 1e-7);
}
/** Slab intersection supplements substeps so even a long instantaneous request
 * cannot tunnel through a thin arch roof. Diver and camera use distinct margins. */
export function safeReefSegment(
  from: ReefPose,
  to: ReefPose,
  camera = false,
  context?: RegionNavigation,
): boolean {
  if (!pointSafe(from, camera, context) || !pointSafe(to, camera, context)) return false;
  if (context && !isCaveSegmentContained(from,to,context,camera)) return false;
  const clearance = context ? regionClearance(context.actor, camera) : null;
  const horizontal = clearance?.horizontal ?? (camera ? 0.3 : 0.45),
    vertical = clearance?.vertical ?? (camera ? 0.35 : 1);
  for (const box of context ? getRegionSolids(context.regionId) : reefSolids) {
    let entry = 0,
      exit = 1;
    for (let axis = 0; axis < 3; axis++) {
      const key = (["x", "y", "z"] as const)[axis],
        margin = axis === 1 ? vertical : horizontal;
      const low = box.min[axis] - margin + 1e-6,
        high = box.max[axis] + margin - 1e-6;
      const delta = to[key] - from[key];
      if (Math.abs(delta) < 1e-9) {
        if (from[key] < low || from[key] > high) {
          entry = 2;
          break;
        }
      } else {
        const a = (low - from[key]) / delta,
          b = (high - from[key]) / delta;
        entry = Math.max(entry, Math.min(a, b));
        exit = Math.min(exit, Math.max(a, b));
      }
    }
    if (entry <= exit && entry <= 1 && exit >= 0) return false;
  }
  const samples = Math.max(1, Math.ceil(distance(from, to) / (context?.actor === "fish" ? .08 : .18)));
  for (let i = 1; i <= samples; i++) {
    const t = i / samples;
    if (
      !pointSafe(
        {
          ...from,
          x: from.x + (to.x - from.x) * t,
          y: from.y + (to.y - from.y) * t,
          z: from.z + (to.z - from.z) * t,
        },
        camera,
        context,
      )
    )
      return false;
  }
  return true;
}
export function moveReef(state: ReefState, requested: ReefPose, context?: RegionNavigation): boolean {
  const resolved = resolveReefPose(requested, state, context);
  const from = { ...state };
  let destination = resolved.pose;
  if (!safeReefSegment(from, destination, false, context)) {
    // Slide along the open face instead of popping through it or pushing back.
    const candidates = [
      { ...from, x: destination.x },
      { ...from, z: destination.z },
      { ...from, y: destination.y },
    ];
    const candidate = candidates.find(
      (p) => distance(p, from) > 0.00001 && safeReefSegment(from, p, false, context),
    );
    if (!candidate) {
      state.notice = "Rock ahead. Swim around it or choose a different depth.";
      return false;
    }
    destination = candidate;
  }
  Object.assign(state, {
    x: destination.x,
    y: destination.y,
    z: destination.z,
    heading: resolved.pose.heading,
  });
  state.notice = resolved.notice;
  return true;
}
export const currentPath = [
  { x: -16, z: -6 },
  { x: -8, z: -9 },
  { x: 2, z: -8 },
  { x: 10, z: -4 },
];
export function stepReef(state: ReefState, input: ReefInput, dt: number, context?: RegionNavigation) {
  if (!Number.isFinite(dt) || dt <= 0) return;
  dt = Math.min(Math.max(dt, 0), 0.06);
  const manual = Object.values(input).some(Boolean);
  if (manual) {
    state.target = null;
    state.current = false;
  }
  if (state.current) {
    const point = context ? getRegion(context.regionId).currentPath[state.currentNode] : currentPath[state.currentNode];
    if (!point) {
      state.current = false;
      state.target = null;
      state.notice = "The current opens into clear water. Keep exploring.";
      return;
    }
    state.target = { ...point, y: "y" in point && typeof point.y === "number" ? point.y : -3.8, heading: state.heading };
    if (Math.hypot(state.x - point.x, state.z - point.z) < 0.35)
      state.currentNode++;
  }
  if (state.target) {
    const target = resolveReefPose(state.target, state, context).pose;
    const length = distance(state, target);
    if (length < 0.15) {
      state.target = null;
      return;
    }
    const ratio = Math.min(1, ((state.current ? 2.8 : 3.2) * dt) / length);
    const next = {
      x: state.x + (target.x - state.x) * ratio,
      y: state.y + (target.y - state.y) * ratio,
      z: state.z + (target.z - state.z) * ratio,
      heading: Math.atan2(target.x - state.x, -(target.z - state.z)),
    };
    if (!moveReef(state, next, context)) {
      state.target = null;
      state.current = false;
    }
    return;
  }
  const fish = context?.actor === "fish";
  state.heading +=
    (Number(input.right || false) - Number(input.left || false)) * (fish ? 1.8 : 1.1) * dt;
  const travel =
    (Number(input.forward || false) - Number(input.backward || false)) *
    (fish ? 5.2 : 3.2) *
    dt;
  moveReef(state, {
    ...state,
    x: state.x + Math.sin(state.heading) * travel,
    z: state.z - Math.cos(state.heading) * travel,
    y:
      state.y +
      (Number(input.rise || false) - Number(input.descend || false)) * (fish ? 3.2 : 2) * dt,
  }, context);
}
export function reefCamera(pose: ReefPose, orbit = 0, zoom = 1, context?: RegionNavigation): ReefPose {
  const heading = pose.heading + orbit;
  const requested = {
    x: pose.x - Math.sin(heading) * 5 * zoom,
    z: pose.z + Math.cos(heading) * 5 * zoom,
    y: pose.y + 1.8,
    heading,
  };
  const desired = context ? constrainRegionXZ(requested, context.regionId) : constrainReefPoint(requested);
  const y = nearest(desired.y, context ? regionYIntervals(context.regionId, desired.x, desired.z, context.actor, true) : getReefCameraIntervals(desired.x, desired.z));
  // The diver is already clear of solids and supplies a safe short-eye fallback.
  const origin = { ...pose, y: Math.min(-0.75, pose.y + (context?.actor === "fish" ? 0 : 0.15)) };
  if (y === null) return origin;
  const end = { ...desired, y };
  if (safeReefSegment(origin, end, true, context)) return end;
  for (let scale = 0.9; scale >= 0.1; scale -= 0.1) {
    const p = {
      ...end,
      x: origin.x + (end.x - origin.x) * scale,
      y: origin.y + (end.y - origin.y) * scale,
      z: origin.z + (end.z - origin.z) * scale,
    };
    if (safeReefSegment(origin, p, true, context)) return p;
  }
  return origin;
}
export const reefDepthHere = (state: ReefPose, context?: RegionNavigation) =>
  context ? -sampleRegionFloor(context.regionId,state.x,state.z) : sampleReefDepth(state.x, state.z);
