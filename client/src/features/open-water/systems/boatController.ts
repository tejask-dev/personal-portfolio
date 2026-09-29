import { COURSE_RADIUS, WORLD_RADIUS, destinations } from "../data/world.ts";
import type { Point } from "../data/world.ts";

export type BoatState = Point & {
  heading: number;
  speed: number;
  turn: number;
  target: (Point & { id?: string | null }) | null;
  route: Point[];
  arrived: string | null;
};

export type Input = {
  forward?: boolean;
  backward?: boolean;
  left?: boolean;
  right?: boolean;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
const wrap = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));
export const distance = (a: Point, b: Point) =>
  Math.hypot(a.x - b.x, a.z - b.z);

/** Shared by hull presentation and the ocean shader. This is an analytic sea, not buoyancy physics. */
export function waveHeight(x: number, z: number, time: number): number {
  return (
    0.22 * Math.sin(x * 0.13 + z * 0.19 + time * 0.72) +
    0.12 * Math.sin(x * 0.33 - z * 0.21 - time * 0.93) +
    0.045 * Math.sin(x * 0.73 + z * 0.6 + time * 1.1)
  );
}

export function createBoat(): BoatState {
  return {
    x: 34,
    z: 27,
    heading: -0.22,
    speed: 0,
    turn: 0,
    target: null,
    route: [],
    arrived: null,
  };
}

function clearCourse(boat: BoatState) {
  boat.target = null;
  boat.route = [];
  boat.arrived = null;
}

function keepOutsideStructures(point: Point, margin: number): boolean {
  let collided = false;
  for (const station of destinations) {
    const dx = point.x - station.x;
    const dz = point.z - station.z;
    const separation = Math.hypot(dx, dz);
    const radius = station.r + margin;
    if (separation < radius) {
      // An exact overlap needs a deterministic normal rather than division by zero.
      point.x = station.x + (separation > 1e-6 ? dx / separation : 1) * radius;
      point.z = station.z + (separation > 1e-6 ? dz / separation : 0) * radius;
      collided = true;
    }
  }
  return collided;
}

function boundPoint(point: Point, radius: number): boolean {
  const length = Math.hypot(point.x, point.z);
  if (length <= radius) return false;
  point.x *= radius / length;
  point.z *= radius / length;
  return true;
}

/** The navigation clearance includes space for a curved turn around each structure. */
function clearSegment(a: Point, b: Point): boolean {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const lengthSquared = dx * dx + dz * dz;
  return destinations.every((station) => {
    const t = clamp(
      ((station.x - a.x) * dx + (station.z - a.z) * dz) / (lengthSquared || 1),
      0,
      1,
    );
    return (
      Math.hypot(a.x + dx * t - station.x, a.z + dz * t - station.z) >=
      station.r + 7
    );
  });
}

/** Small visibility graph avoids the repeated-obstacle trap of a greedy single detour. */
export function routeTo(start: Point, target: Point): Point[] {
  if (clearSegment(start, target)) return [{ ...target }];
  const nodes: Point[] = [{ ...start }, { ...target }];
  for (const station of destinations) {
    for (let i = 0; i < 16; i++) {
      const angle = (i * Math.PI) / 8;
      const point = {
        x: station.x + Math.cos(angle) * (station.r + 12),
        z: station.z + Math.sin(angle) * (station.r + 12),
      };
      if (destinations.every((other) => distance(point, other) >= other.r + 7))
        nodes.push(point);
    }
  }
  const costs = nodes.map(() => Infinity);
  const previous = nodes.map(() => -1);
  const visited = new Set<number>();
  costs[0] = 0;
  while (visited.size < nodes.length) {
    let nearest = -1;
    for (let i = 0; i < nodes.length; i++) {
      if (
        !visited.has(i) &&
        Number.isFinite(costs[i]) &&
        (nearest < 0 || costs[i] < costs[nearest])
      )
        nearest = i;
    }
    if (nearest < 0) return [];
    if (nearest === 1) break;
    visited.add(nearest);
    for (let i = 0; i < nodes.length; i++) {
      if (
        visited.has(i) ||
        i === nearest ||
        !clearSegment(nodes[nearest], nodes[i])
      )
        continue;
      const cost = costs[nearest] + distance(nodes[nearest], nodes[i]);
      if (cost < costs[i]) {
        costs[i] = cost;
        previous[i] = nearest;
      }
    }
  }
  const route: Point[] = [];
  for (let node = 1; node > 0; node = previous[node])
    route.unshift(nodes[node]);
  return route;
}

/** Mutates the simulation ref; it never triggers a React render. */
export function steerTo(
  boat: BoatState,
  target: Point,
  id: string | null = null,
): void {
  if (!Number.isFinite(target.x) || !Number.isFinite(target.z)) return;
  const safeTarget = { ...target };
  boundPoint(safeTarget, COURSE_RADIUS);
  keepOutsideStructures(safeTarget, 8);
  // A manual approach may start inside the navigation clearance, though never the hull bounds.
  // Add an outward recovery waypoint so the visibility graph can leave that region.
  const start = { x: boat.x, z: boat.z };
  const recover = keepOutsideStructures(start, 8);
  const route = routeTo(start, safeTarget);
  if (!route.length) {
    clearCourse(boat);
    return;
  }
  boat.target = { ...safeTarget, id };
  boat.route = recover ? [start, ...route] : route;
  boat.arrived = null;
}

/** Call at a bounded fixed step (1/60 s). The clamp also protects callers after a suspended tab. */
export function stepBoat(
  boat: BoatState,
  input: Input,
  delta: number,
): BoatState {
  const dt = Number.isFinite(delta) ? clamp(delta, 0, 1 / 30) : 0;
  if (dt === 0) return boat;
  const manual = Boolean(
    input.forward || input.backward || input.left || input.right,
  );
  let throttle = 0;
  let steer = 0;
  if (manual) clearCourse(boat);
  if (boat.target && boat.route.length) {
    if (distance(boat, boat.route[0]) < 2.8) {
      boat.route.shift();
      if (!boat.route.length) {
        boat.arrived = boat.target.id ?? null;
        boat.target = null;
        boat.speed = 0;
        boat.turn = 0;
        return boat;
      }
    }
    if (boat.route.length) {
      const next = boat.route[0];
      const angle = wrap(
        Math.atan2(next.x - boat.x, -(next.z - boat.z)) - boat.heading,
      );
      steer = clamp(angle * 2.4, -1, 1);
      const desiredSpeed =
        Math.min(15, Math.max(2.2, distance(boat, next) * 0.9)) *
        Math.max(0.12, 1 - Math.abs(angle) / 1.65);
      throttle = clamp((desiredSpeed - boat.speed) * 0.55, -0.9, 1);
    }
  } else if (manual) {
    throttle = Number(Boolean(input.forward)) - Number(Boolean(input.backward));
    steer = Number(Boolean(input.right)) - Number(Boolean(input.left));
  }
  const intendedTurn =
    steer *
    (0.32 + Math.min(Math.abs(boat.speed) / 9, 1)) *
    (boat.speed < -0.5 ? -1 : 1);
  boat.turn += (intendedTurn - boat.turn) * (1 - Math.exp(-dt * 5));
  boat.heading = wrap(boat.heading + boat.turn * dt);
  boat.speed +=
    (throttle * 9 -
      boat.speed * 0.38 -
      boat.speed * Math.abs(boat.speed) * 0.012) *
    dt;
  if (!boat.target && !manual) boat.speed *= Math.exp(-dt * 0.48);
  boat.speed = clamp(boat.speed, -4.5, 18);
  boat.x += Math.sin(boat.heading) * boat.speed * dt;
  boat.z -= Math.cos(boat.heading) * boat.speed * dt;
  if (keepOutsideStructures(boat, 3)) boat.speed *= 0.75;
  if (boundPoint(boat, WORLD_RADIUS)) {
    boat.speed *= 0.5;
    clearCourse(boat);
  }
  return boat;
}
