import { BOAT_STEP, waveHeight, type BoatState } from "./boatController.ts";
import { vesselProfile, type VesselProfile } from "../data/vessels.ts";

/** Presentation only. The simulation remains the fixed-step boat controller;
 * this module decides how its latest pose is drawn on any display refresh rate. */
export type PoseSample = {
  x: number;
  z: number;
  heading: number;
  lift: number;
  speed: number;
};
export type HullPose = { heave: number; pitch: number; roll: number };
export type HullMotion = HullPose & {
  heaveRate: number;
  pitchRate: number;
  rollRate: number;
  ready: boolean;
};

/** Spring sub-step: the result is independent of the caller's frame rate. */
export const HULL_MOTION_STEP = 1 / 120;
/** A pose change larger than any single step can produce is a placement, not motion. */
export const TELEPORT_DISTANCE = 4;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
const wrap = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));

export function samplePose(
  boat: Pick<BoatState, "x" | "z" | "heading" | "lift" | "speed">,
  out: PoseSample = { x: 0, z: 0, heading: 0, lift: 0, speed: 0 },
): PoseSample {
  out.x = boat.x;
  out.z = boat.z;
  out.heading = boat.heading;
  out.lift = boat.lift;
  out.speed = boat.speed;
  return out;
}

export function samePose(a: PoseSample, b: Pick<BoatState, "x" | "z" | "heading" | "lift" | "speed">) {
  return a.x === b.x && a.z === b.z && a.heading === b.heading && a.lift === b.lift && a.speed === b.speed;
}

/** Draws the pose `alpha` of the way from the previous fixed step to the latest.
 * Headings take the short way round; a placement (return, launch, reset) snaps. */
export function blendPose(
  previous: PoseSample,
  current: PoseSample,
  alpha: number,
  out: PoseSample,
): PoseSample {
  const t = Number.isFinite(alpha) ? clamp(alpha, 0, 1) : 1;
  if (Math.hypot(current.x - previous.x, current.z - previous.z) > TELEPORT_DISTANCE)
    return samplePose(current, out);
  out.x = previous.x + (current.x - previous.x) * t;
  out.z = previous.z + (current.z - previous.z) * t;
  out.heading = wrap(previous.heading + wrap(current.heading - previous.heading) * t);
  out.lift = previous.lift + (current.lift - previous.lift) * t;
  out.speed = previous.speed + (current.speed - previous.speed) * t;
  return out;
}

/** Fraction of a fixed step left in the accumulator, for blendPose. */
export const stepAlpha = (accumulator: number) =>
  Number.isFinite(accumulator) ? clamp(accumulator / BOAT_STEP, 0, 1) : 1;

export function createHullMotion(): HullMotion {
  return { heave: 0, pitch: 0, roll: 0, heaveRate: 0, pitchRate: 0, rollRate: 0, ready: false };
}

/** Where the water and the helm want the hull: heave averaged over the hull's
 * footprint (a long hull bridges short swells), fore/aft pitch and beam roll
 * from the same analytic sea the shader draws, plus speed trim, acceleration
 * squat and a bank into the turn. `surge` is acceleration in units/s². */
export function hullTarget(
  boat: Pick<BoatState, "x" | "z" | "heading" | "speed" | "turn" | "vesselId">,
  time: number,
  surge = 0,
): HullPose {
  const profile = vesselProfile(boat.vesselId);
  const fx = Math.sin(boat.heading), fz = -Math.cos(boat.heading);
  const sx = Math.cos(boat.heading), sz = Math.sin(boat.heading);
  const half = profile.length * 0.42, side = profile.beam * 0.45;
  const bow = waveHeight(boat.x + fx * half, boat.z + fz * half, time);
  const stern = waveHeight(boat.x - fx * half, boat.z - fz * half, time);
  const port = waveHeight(boat.x - sx * side, boat.z - sz * side, time);
  const starboard = waveHeight(boat.x + sx * side, boat.z + sz * side, time);
  const middle = waveHeight(boat.x, boat.z, time);
  const share = clamp(boat.speed / profile.maxSpeed, 0, 1);
  const trim =
    profile.speedTrim * share * share * (3 - 2 * share) +
    profile.surgeTrim * clamp((Number.isFinite(surge) ? surge : 0) / profile.acceleration, -1, 1);
  return {
    heave: (bow + stern + port + starboard + 2 * middle) / 6,
    pitch: Math.atan2(bow - stern, 2 * half) + trim,
    roll:
      Math.atan2(starboard - port, 2 * side) -
      clamp(boat.turn * boat.speed * profile.heel, -profile.maxHeel, profile.maxHeel),
  };
}

export function resetHullMotion(motion: HullMotion, pose: HullPose): HullMotion {
  motion.heave = pose.heave;
  motion.pitch = pose.pitch;
  motion.roll = pose.roll;
  motion.heaveRate = motion.pitchRate = motion.rollRate = 0;
  motion.ready = true;
  return motion;
}

/** Damped springs carry the hull toward its target, so the superyacht settles
 * with weight and the tender stays lively. Sub-stepped semi-implicit Euler is
 * stable at the slowest frame the scene admits and converges across refresh rates. */
export function stepHullMotion(
  motion: HullMotion,
  target: HullPose,
  profile: Pick<VesselProfile, "heaveFrequency" | "pitchFrequency" | "rollFrequency" | "motionDamping">,
  delta: number,
): HullMotion {
  if (!motion.ready || ![target.heave, target.pitch, target.roll].every(Number.isFinite))
    return resetHullMotion(motion, {
      heave: Number.isFinite(target.heave) ? target.heave : 0,
      pitch: Number.isFinite(target.pitch) ? target.pitch : 0,
      roll: Number.isFinite(target.roll) ? target.roll : 0,
    });
  const dt = Number.isFinite(delta) ? clamp(delta, 0, 0.1) : 0;
  if (dt === 0) return motion;
  const steps = Math.ceil(dt / HULL_MOTION_STEP - 1e-9), h = dt / steps;
  const zeta = profile.motionDamping;
  const axes = [
    ["heave", "heaveRate", profile.heaveFrequency],
    ["pitch", "pitchRate", profile.pitchFrequency],
    ["roll", "rollRate", profile.rollFrequency],
  ] as const;
  for (let i = 0; i < steps; i++)
    for (const [value, rate, omega] of axes) {
      motion[rate] += (omega * omega * (target[value] - motion[value]) - 2 * zeta * omega * motion[rate]) * h;
      motion[value] += motion[rate] * h;
    }
  return motion;
}

/** Apply one touchdown impulse, including ordinary drops off a ramp's side.
 * jumpCount records launches, so it cannot identify the later landing. */
export function landHull(
  motion: HullMotion,
  boat: Pick<BoatState, "airborne" | "rampId" | "landingImpact">,
  wasAirborne: boolean,
): HullMotion {
  if (motion.ready && wasAirborne && !boat.airborne && !boat.rampId && Number.isFinite(boat.landingImpact))
    motion.heaveRate -= clamp(boat.landingImpact, 0, 1) * 1.6;
  return motion;
}
