import {
  COURSE_RADIUS,
  WORLD_RADIUS,
  HOME,
  obstacles,
  ramps,
} from "../data/world.ts";
import type { Point, Ramp } from "../data/world.ts";

export type BoatState = Point & {
  heading: number;
  speed: number;
  turn: number;
  target: (Point & { id?: string | null }) | null;
  route: Point[];
  arrived: string | null;
  /** Absolute elevation above mean sea when on a ramp or airborne. */
  lift: number;
  verticalSpeed: number;
  airborne: boolean;
  rampId: string | null;
  rampPitch: number;
  landingImpact: number;
  jumpCount: number;
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
    ...HOME,
    speed: 0,
    turn: 0,
    target: null,
    route: [],
    arrived: null,
    lift: 0,
    verticalSpeed: 0,
    airborne: false,
    rampId: null,
    rampPitch: 0,
    landingImpact: 0,
    jumpCount: 0,
  };
}

function clearCourse(boat: BoatState) {
  boat.target = null;
  boat.route = [];
  boat.arrived = null;
}

export const HULL_RADIUS = 7.5;
const NAVIGATION_MARGIN = 13;
const navigationObstacles = [
  ...obstacles,
  ...ramps.map((ramp) => ({
    ...ramp,
    r: Math.hypot(ramp.length / 2, ramp.width / 2),
  })),
];

function keepOutsideStructures(
  point: Point,
  margin: number,
  navigation = false,
): boolean {
  let collided = false;
  for (const station of navigation ? navigationObstacles : obstacles) {
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
  return navigationObstacles.every((station) => {
    const t = clamp(
      ((station.x - a.x) * dx + (station.z - a.z) * dz) / (lengthSquared || 1),
      0,
      1,
    );
    return (
      Math.hypot(a.x + dx * t - station.x, a.z + dz * t - station.z) >=
      station.r + NAVIGATION_MARGIN
    );
  });
}

/** Small visibility graph avoids the repeated-obstacle trap of a greedy single detour. */
export function routeTo(start: Point, target: Point): Point[] {
  if (clearSegment(start, target)) return [{ ...target }];
  const nodes: Point[] = [{ ...start }, { ...target }];
  for (const station of navigationObstacles) {
    for (let i = 0; i < 16; i++) {
      const angle = (i * Math.PI) / 8;
      const point = {
        x: station.x + Math.cos(angle) * (station.r + 24),
        z: station.z + Math.sin(angle) * (station.r + 24),
      };
      if (
        Math.hypot(point.x, point.z) < COURSE_RADIUS &&
        navigationObstacles.every(
          (other) => distance(point, other) >= other.r + NAVIGATION_MARGIN,
        )
      )
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
  if (keepOutsideStructures(boat, HULL_RADIUS)) boat.speed = 0;
  const safeTarget = { ...target };
  boundPoint(safeTarget, COURSE_RADIUS);
  keepOutsideStructures(safeTarget, NAVIGATION_MARGIN + 1, true);
  // A manual approach may start inside the navigation clearance, though never the hull bounds.
  // Add an outward recovery waypoint so the visibility graph can leave that region.
  const start = { x: boat.x, z: boat.z };
  const recover = keepOutsideStructures(start, NAVIGATION_MARGIN + 1, true);
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
  const previous = { x: boat.x, z: boat.z };
  boat.landingImpact *= Math.exp(-dt * 6);
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
        Math.min(22, Math.max(2.2, distance(boat, next) * 0.9)) *
        Math.max(0.12, 1 - Math.abs(angle) / 1.65);
      throttle = clamp((desiredSpeed - boat.speed) * 0.55, -0.9, 1);
    }
  } else if (manual) {
    throttle = Number(Boolean(input.forward)) - Number(Boolean(input.backward));
    steer = Number(Boolean(input.right)) - Number(Boolean(input.left));
  }
  const intendedTurn =
    steer *
    (0.32 + Math.min(Math.abs(boat.speed) / 13, 1)) *
    (boat.speed < -0.5 ? -1 : 1);
  boat.turn += (intendedTurn - boat.turn) * (1 - Math.exp(-dt * 5));
  boat.heading = wrap(
    boat.heading + boat.turn * dt * (boat.airborne ? 0.23 : 1),
  );
  if (boat.airborne) boat.speed *= Math.exp(-dt * 0.025);
  else {
    boat.speed +=
      (throttle * 12 -
        boat.speed * 0.32 -
        boat.speed * Math.abs(boat.speed) * 0.006) *
      dt;
    if (!boat.target && !manual) boat.speed *= Math.exp(-dt * 0.48);
  }
  boat.speed = clamp(boat.speed, -5, 28);
  boat.x += Math.sin(boat.heading) * boat.speed * dt;
  boat.z -= Math.cos(boat.heading) * boat.speed * dt;
  stepJump(boat, previous, dt);
  // Islands remain solid during a jump; a leap is never a way through an island.
  if (keepOutsideStructures(boat, HULL_RADIUS)) {
    boat.speed *= 0.65;
    if (boat.airborne) boat.verticalSpeed = Math.min(boat.verticalSpeed, 0);
    boat.rampId = null;
  }
  if (boundPoint(boat, WORLD_RADIUS)) {
    boat.speed *= 0.5;
    clearCourse(boat);
  }
  return boat;
}

const GRAVITY = 9.81;
function rampLocal(point: Point, ramp: Ramp) {
  const dx = point.x - ramp.x,
    dz = point.z - ramp.z;
  return {
    along: dx * Math.sin(ramp.heading) - dz * Math.cos(ramp.heading),
    across: dx * Math.cos(ramp.heading) + dz * Math.sin(ramp.heading),
  };
}
function rampEntryFace(
  old: ReturnType<typeof rampLocal>,
  local: ReturnType<typeof rampLocal>,
  ramp: Ramp,
) {
  const extents = { along: ramp.length / 2, across: ramp.width / 2 };
  // A boat already inside the solid footprint recovers through the nearest face.
  let axis: "along" | "across" =
    extents.along - Math.abs(local.along) <
    extents.across - Math.abs(local.across)
      ? "along"
      : "across";
  let sign = local[axis] >= 0 ? 1 : -1;
  let entryTime = -Infinity;
  for (const candidate of ["along", "across"] as const) {
    if (Math.abs(old[candidate]) < extents[candidate]) continue;
    const movement = local[candidate] - old[candidate];
    if (Math.abs(movement) < 1e-10) continue;
    const side = old[candidate] >= 0 ? 1 : -1;
    const time = (side * extents[candidate] - old[candidate]) / movement;
    // At corners, the last crossed slab is the face that actually admits the boat.
    if (time >= 0 && time <= 1 && time > entryTime) {
      axis = candidate;
      sign = side;
      entryTime = time;
    }
  }
  return { axis, sign, crossed: Number.isFinite(entryTime) };
}
function launch(boat: BoatState, ramp: Ramp, clean: boolean) {
  boat.airborne = true;
  boat.rampId = null;
  boat.lift = ramp.height;
  boat.verticalSpeed = Math.min(
    8.5,
    (Math.max(0, boat.speed) * ramp.height) / ramp.length + (clean ? 3.4 : 0),
  );
  boat.speed *= 0.97;
  boat.jumpCount++;
}
function stepJump(boat: BoatState, previous: Point, dt: number) {
  if (boat.airborne) {
    boat.verticalSpeed -= GRAVITY * dt;
    boat.lift += boat.verticalSpeed * dt;
    boat.rampPitch = clamp(
      Math.atan2(boat.verticalSpeed, Math.max(8, Math.abs(boat.speed))),
      -0.35,
      0.35,
    );
    if (boat.lift <= 0) {
      boat.landingImpact = clamp(-boat.verticalSpeed / 11, 0, 1);
      boat.lift = 0;
      boat.verticalSpeed = 0;
      boat.airborne = false;
      boat.rampPitch = 0;
      boat.speed *= 0.88;
    }
    return;
  }
  const currentRamp = ramps.find((ramp) => ramp.id === boat.rampId);
  if (currentRamp) {
    const local = rampLocal(boat, currentRamp);
    const aligned = Math.cos(boat.heading - currentRamp.heading);
    if (
      Math.abs(local.across) > currentRamp.width / 2 ||
      local.along < -currentRamp.length / 2
    ) {
      // Driving off the side produces an ordinary drop, not a launch impulse.
      boat.rampId = null;
      if (boat.lift > 0.12) {
        boat.airborne = true;
        boat.verticalSpeed = 0;
      } else {
        boat.lift = 0;
        boat.rampPitch = 0;
      }
      return;
    }
    boat.rampPitch =
      Math.atan2(currentRamp.height, currentRamp.length) * aligned;
    boat.lift =
      clamp((local.along + currentRamp.length / 2) / currentRamp.length, 0, 1) *
      currentRamp.height;
    boat.speed -=
      GRAVITY *
      Math.sin(Math.atan2(currentRamp.height, currentRamp.length)) *
      aligned *
      dt;
    if (local.along >= currentRamp.length / 2)
      launch(
        boat,
        currentRamp,
        aligned > 0.65 && boat.speed >= currentRamp.launchSpeed,
      );
    return;
  }
  boat.lift = 0;
  boat.rampPitch = 0;
  for (const ramp of ramps) {
    const old = rampLocal(previous, ramp),
      local = rampLocal(boat, ramp);
    if (
      Math.abs(local.across) > ramp.width / 2 ||
      local.along < -ramp.length / 2 ||
      local.along > ramp.length / 2
    )
      continue;
    const aligned = Math.cos(boat.heading - ramp.heading);
    const entry = rampEntryFace(old, local, ramp);
    if (
      entry.crossed &&
      entry.axis === "along" &&
      entry.sign === -1 &&
      aligned > 0.55 &&
      boat.speed > 0
    ) {
      boat.rampId = ramp.id;
      boat.rampPitch = Math.atan2(ramp.height, ramp.length);
      boat.lift =
        Math.max(0, (local.along + ramp.length / 2) / ramp.length) *
        ramp.height;
      return;
    }
    // A ramp's back and sides are solid. Autopilot routes around their footprint.
    if (entry.axis === "along") {
      const correction = entry.sign * (ramp.length / 2 + 0.6) - local.along;
      boat.x += Math.sin(ramp.heading) * correction;
      boat.z -= Math.cos(ramp.heading) * correction;
    } else {
      const correction = entry.sign * (ramp.width / 2 + 0.6) - local.across;
      boat.x += Math.cos(ramp.heading) * correction;
      boat.z += Math.sin(ramp.heading) * correction;
    }
    boat.speed *= 0.35;
  }
}
