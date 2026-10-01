import {
  COURSE_RADIUS,
  WORLD_RADIUS,
  HOME,
  obstacles,
  ramps,
} from "../data/world.ts";
import type { Point, Ramp } from "../data/world.ts";
import { vesselProfile, type VesselId, type VesselProfile } from "../data/vessels.ts";

export type BoatState = Point & {
  vesselId: VesselId;
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

export function createBoat(vesselId: VesselId = "tender"): BoatState {
  return {
    ...HOME,
    vesselId,
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
const navigationObstacles = [
  ...obstacles,
  ...ramps.map((ramp) => ({
    ...ramp,
    r: Math.hypot(ramp.length / 2, ramp.width / 2),
  })),
];

/** The long yacht uses a capsule rather than the tender's legacy circle. */
export function boatHullCapsule(boat: Pick<BoatState, "x" | "z" | "heading" | "vesselId">) {
  const profile = vesselProfile(boat.vesselId);
  const radius = profile.id === "tender" ? profile.hullRadius : profile.beam / 2;
  const halfSegment = profile.id === "tender" ? 0 : profile.length / 2 - radius;
  const forward = { x: Math.sin(boat.heading), z: -Math.cos(boat.heading) };
  return {
    a: { x: boat.x - forward.x * halfSegment, z: boat.z - forward.z * halfSegment },
    b: { x: boat.x + forward.x * halfSegment, z: boat.z + forward.z * halfSegment },
    radius, halfSegment, forward,
  };
}

function nearestOnSegment(point: Point, a: Point, b: Point): Point {
  const x = b.x - a.x, z = b.z - a.z;
  const t = clamp(((point.x - a.x) * x + (point.z - a.z) * z) / (x * x + z * z || 1), 0, 1);
  return { x: a.x + x * t, z: a.z + z * t };
}

function rampHullCorrection(boat: BoatState, ramp: Ramp): Point | null {
  const hull = boatHullCapsule(boat);
  const a = rampLocal(hull.a, ramp), b = rampLocal(hull.b, ramp);
  const length = ramp.length / 2, width = ramp.width / 2;
  // Test whether the hull's center segment crosses the solid ramp rectangle.
  let enter = 0, leave = 1;
  for (const [axis, extent] of [["along", length], ["across", width]] as const) {
    const delta = b[axis] - a[axis];
    if (Math.abs(delta) < 1e-9) {
      if (Math.abs(a[axis]) > extent) { enter = 2; break; }
    } else {
      const t1 = (-extent - a[axis]) / delta, t2 = (extent - a[axis]) / delta;
      enter = Math.max(enter, Math.min(t1, t2));
      leave = Math.min(leave, Math.max(t1, t2));
    }
  }
  const toWorld = (along: number, across: number): Point => ({
    x: ramp.x + Math.sin(ramp.heading) * along + Math.cos(ramp.heading) * across,
    z: ramp.z - Math.cos(ramp.heading) * along + Math.sin(ramp.heading) * across,
  });
  if (enter <= leave && enter <= 1 && leave >= 0) {
    // A centerline overlap needs a separating translation, not a zero normal.
    const axes = [
      { x: Math.sin(ramp.heading), z: -Math.cos(ramp.heading) },
      { x: Math.cos(ramp.heading), z: Math.sin(ramp.heading) },
      { x: Math.cos(boat.heading), z: Math.sin(boat.heading) },
    ];
    let best = { x: 0, z: 0 }, minimum = Infinity;
    for (const axis of axes) {
      const center = (boat.x - ramp.x) * axis.x + (boat.z - ramp.z) * axis.z;
      const reach = hull.halfSegment * Math.abs(hull.forward.x * axis.x + hull.forward.z * axis.z) + hull.radius;
      const rampReach = length * Math.abs(Math.sin(ramp.heading) * axis.x - Math.cos(ramp.heading) * axis.z) + width * Math.abs(Math.cos(ramp.heading) * axis.x + Math.sin(ramp.heading) * axis.z);
      const push = reach + rampReach - Math.abs(center) + 1e-5;
      if (push < minimum) { minimum = push; best = { x: axis.x * push * (center < 0 ? -1 : 1), z: axis.z * push * (center < 0 ? -1 : 1) }; }
    }
    return best;
  }
  // Otherwise the nearest pair is an endpoint-to-edge or corner-to-segment.
  const pairs: [Point, Point][] = [
    [hull.a, toWorld(clamp(a.along, -length, length), clamp(a.across, -width, width))],
    [hull.b, toWorld(clamp(b.along, -length, length), clamp(b.across, -width, width))],
  ];
  for (const along of [-length, length]) for (const across of [-width, width]) {
    const corner = toWorld(along, across);
    pairs.push([nearestOnSegment(corner, hull.a, hull.b), corner]);
  }
  pairs.sort((left, right) => distance(...left) - distance(...right));
  const [hullPoint, rampPoint] = pairs[0];
  const gap = distance(hullPoint, rampPoint);
  if (gap >= hull.radius || gap < 1e-9) return null;
  const ratio = (hull.radius - gap + 1e-5) / gap;
  return { x: (hullPoint.x - rampPoint.x) * ratio, z: (hullPoint.z - rampPoint.z) * ratio };
}

function keepHullClear(boat: BoatState, _profile: Readonly<VesselProfile>): boolean {
  let collided = false;
  for (let pass = 0; pass < 4; pass++) {
    let moved = false;
    for (const structure of obstacles) {
      const hull = boatHullCapsule(boat);
      const point = nearestOnSegment(structure, hull.a, hull.b);
      const x = point.x - structure.x, z = point.z - structure.z;
      const gap = Math.hypot(x, z), limit = structure.r + hull.radius;
      if (gap >= limit) continue;
      const normal = gap > 1e-9 ? { x: x / gap, z: z / gap } : { x: Math.cos(boat.heading), z: Math.sin(boat.heading) };
      boat.x += normal.x * (limit - gap + 1e-5);
      boat.z += normal.z * (limit - gap + 1e-5);
      moved = collided = true;
    }
    for (const ramp of ramps) {
      const correction = rampHullCorrection(boat, ramp);
      if (!correction) continue;
      boat.x += correction.x; boat.z += correction.z;
      moved = collided = true;
    }
    if (!moved) break;
  }
  return collided;
}

/** Used by dive/return and vessel switching before accepting a saved anchor. */
export function isBoatPoseSafe(boat: BoatState): boolean {
  if (![boat.x, boat.z, boat.heading].every(Number.isFinite) || boat.airborne || boat.rampId) return false;
  const profile = vesselProfile(boat.vesselId);
  if (Math.hypot(boat.x, boat.z) > WORLD_RADIUS - profile.hullRadius) return false;
  const hull = boatHullCapsule(boat);
  if (obstacles.some((item) => distance(nearestOnSegment(item, hull.a, hull.b), item) < item.r + hull.radius - 1e-7)) return false;
  return ramps.every((ramp) => rampHullCorrection(boat, ramp) === null);
}

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
function clearSegment(a: Point, b: Point, margin: number): boolean {
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
      station.r + margin
    );
  });
}

/** Small visibility graph avoids the repeated-obstacle trap of a greedy single detour. */
export function routeTo(start: Point, target: Point, vesselId: VesselId = "tender"): Point[] {
  const profile = vesselProfile(vesselId);
  const margin = profile.navigationMargin;
  if (clearSegment(start, target, margin)) return [{ ...target }];
  const nodes: Point[] = [{ ...start }, { ...target }];
  for (const station of navigationObstacles) {
    for (let i = 0; i < 16; i++) {
      const angle = (i * Math.PI) / 8;
      const point = {
        x: station.x + Math.cos(angle) * (station.r + margin + 11),
        z: station.z + Math.sin(angle) * (station.r + margin + 11),
      };
      if (
        Math.hypot(point.x, point.z) < COURSE_RADIUS &&
        navigationObstacles.every(
          (other) => distance(point, other) >= other.r + margin,
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
        !clearSegment(nodes[nearest], nodes[i], margin)
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
  const profile = vesselProfile(boat.vesselId);
  if (keepOutsideStructures(boat, profile.hullRadius)) boat.speed = 0;
  const safeTarget = { ...target };
  boundPoint(safeTarget, COURSE_RADIUS);
  keepOutsideStructures(safeTarget, profile.navigationMargin + 1, true);
  // A manual approach may start inside the navigation clearance, though never the hull bounds.
  // Add an outward recovery waypoint so the visibility graph can leave that region.
  const start = { x: boat.x, z: boat.z };
  const recover = keepOutsideStructures(start, profile.navigationMargin + 1, true);
  const route = routeTo(start, safeTarget, boat.vesselId);
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
  const profile = vesselProfile(boat.vesselId);
  const manual = Boolean(
    input.forward || input.backward || input.left || input.right,
  );
  let throttle = 0;
  let steer = 0;
  if (manual) clearCourse(boat);
  const previous = { x: boat.x, z: boat.z };
  boat.landingImpact *= Math.exp(-dt * 6);
  if (boat.target && boat.route.length) {
    if (distance(boat, boat.route[0]) < profile.arrivalRadius) {
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
        Math.min(profile.cruiseSpeed, Math.max(2.2, distance(boat, next) * 0.9)) *
        Math.max(0.12, 1 - Math.abs(angle) / 1.65);
      throttle = clamp((desiredSpeed - boat.speed) * 0.55, -0.9, 1);
    }
  } else if (manual) {
    throttle = Number(Boolean(input.forward)) - Number(Boolean(input.backward));
    steer = Number(Boolean(input.right)) - Number(Boolean(input.left));
  }
  const intendedTurn =
    steer *
    profile.turnRate *
    (0.32 + Math.min(Math.abs(boat.speed) / profile.turnSpeed, 1)) *
    (boat.speed < -0.5 ? -1 : 1);
  boat.turn += (intendedTurn - boat.turn) * (1 - Math.exp(-dt * profile.turnResponse));
  boat.heading = wrap(
    boat.heading + boat.turn * dt * (boat.airborne ? 0.23 : 1),
  );
  if (boat.airborne) boat.speed *= Math.exp(-dt * 0.025);
  else {
    boat.speed +=
      (throttle * profile.acceleration -
        boat.speed * profile.linearDrag -
        boat.speed * Math.abs(boat.speed) * profile.quadraticDrag) *
      dt;
    if (!boat.target && !manual) boat.speed *= Math.exp(-dt * profile.coastDrag);
  }
  boat.speed = clamp(boat.speed, -profile.reverseSpeed, profile.maxSpeed);
  boat.x += Math.sin(boat.heading) * boat.speed * dt;
  boat.z -= Math.cos(boat.heading) * boat.speed * dt;
  if (profile.canJump) stepJump(boat, previous, dt);
  else {
    boat.lift = boat.verticalSpeed = boat.rampPitch = 0;
    boat.airborne = false;
    boat.rampId = null;
  }
  // Islands remain solid during a jump; a leap is never a way through an island.
  if (profile.id === "tender" ? keepOutsideStructures(boat, HULL_RADIUS) : keepHullClear(boat, profile)) {
    boat.speed *= 0.65;
    if (boat.airborne) boat.verticalSpeed = Math.min(boat.verticalSpeed, 0);
    boat.rampId = null;
  }
  if (boundPoint(boat, WORLD_RADIUS - (profile.canJump ? 0 : profile.hullRadius))) {
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
