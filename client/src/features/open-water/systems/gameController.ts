import type { BoatState } from "./boatController.ts";
import { vesselProfile } from "../data/vessels.ts";

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));
const stepTime = (dt: number) => Number.isFinite(dt) ? clamp(dt, 0, 1 / 30) : 0;
const angleError = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

export const FISHING_CATCHES = [
  { id: "mackerel", name: "Atlantic mackerel", color: "#5a9ea8", description: "A quick silver dart. Recorded and released." },
  { id: "sea-bass", name: "Sea bass", color: "#9ba99b", description: "A patient pull from the blue. Recorded and released." },
  { id: "dorado", name: "Dorado", color: "#c6bf58", description: "One last flash of gold. Recorded and released." },
] as const;

export type FishingPhase = "idle" | "casting" | "waiting" | "bite" | "reeling" | "landed" | "releasing" | "finished";
export type FishingState = {
  phase: FishingPhase;
  round: number;
  released: string[];
  assisted: boolean;
  elapsed: number;
  phaseTime: number;
  schoolPosition: number;
  castAim: number;
  castQuality: number;
  biteDelay: number;
  tension: number;
  progress: number;
  escapes: number;
  notice: string;
};
export type FishingInput = { reel?: boolean; ease?: boolean };
export const createFishing = (assisted = false): FishingState => ({
  phase: "idle", round: 0, released: [], assisted,
  elapsed: 0, phaseTime: 0, schoolPosition: 0.5, castAim: 0.5, castQuality: 0,
  biteDelay: 3, tension: 0.25, progress: 0, escapes: 0, notice: "",
});
export function startFishing(state: FishingState, assisted = state.assisted): void {
  Object.assign(state, createFishing(assisted), { phase: "casting", notice: "Aim toward the moving school, then cast. Three fish, all released." });
}
export function castFishing(state: FishingState, aim = state.schoolPosition): boolean {
  if (state.phase !== "casting" || !Number.isFinite(aim)) return false;
  state.castAim = clamp(aim, 0, 1);
  state.castQuality = clamp(1 - Math.abs(state.castAim - state.schoolPosition) / 0.35, 0, 1);
  state.biteDelay = 2 + (1 - state.castQuality) * 3 + state.round * 0.4;
  state.phase = "waiting"; state.phaseTime = 0;
  state.notice = state.castQuality > 0.65 ? "A good cast. Watch the float." : "The school is farther away. Give the float a moment.";
  return true;
}
export function hookFishing(state: FishingState): boolean {
  if (state.phase !== "bite") return false;
  state.phase = "reeling"; state.phaseTime = 0; state.tension = 0.3; state.progress = 0;
  state.notice = state.assisted ? "Reel at your pace. Assisted tension keeps the line steady." : "Reel to bring it close. Ease the line before tension reaches the top.";
  return true;
}
export function releaseFishing(state: FishingState): boolean {
  if (state.phase !== "landed") return false;
  state.phase = "releasing"; state.phaseTime = 0;
  state.notice = `${FISHING_CATCHES[state.round].name}, back in open water.`;
  return true;
}
/** Caller owns the scene clock and pause state. These inputs never award a catch;
 * progress comes from time spent reeling within the line's tension envelope. */
export function stepFishing(state: FishingState, input: FishingInput, delta: number, paused = false): FishingState {
  const dt = stepTime(delta);
  if (!dt || paused || state.phase === "idle" || state.phase === "finished") return state;
  state.elapsed += dt; state.phaseTime += dt;
  state.schoolPosition = 0.5 + Math.sin(state.elapsed * 0.72 + state.round * 1.7) * 0.32;
  if (state.phase === "waiting" && state.phaseTime >= state.biteDelay) {
    state.phase = "bite"; state.phaseTime = 0;
    state.notice = "A bite. Set the hook when you are ready.";
  } else if (state.phase === "bite" && !state.assisted && state.phaseTime > 2.5) {
    state.phase = "casting"; state.phaseTime = 0; state.escapes++;
    state.notice = "That fish moved on. Cast again; your released catches are kept.";
  } else if (state.phase === "reeling") {
    const reel = Boolean(input.reel) && !input.ease;
    const pull = 0.5 + 0.5 * Math.sin(state.phaseTime * (1.6 + state.round * 0.17) + state.round);
    if (state.assisted) {
      const target = reel ? 0.46 : 0.3;
      state.tension += (target - state.tension) * Math.min(1, dt * 3);
    } else {
      state.tension = clamp(state.tension + dt * (reel ? 0.18 + pull * 0.22 : input.ease ? -0.5 : -0.16 + pull * 0.05), 0, 1);
    }
    const workingLine = state.tension >= 0.12 && state.tension <= 0.86;
    state.progress = clamp(state.progress + dt * (reel && workingLine ? 0.18 - state.round * 0.016 : -0.018), 0, 1);
    if (state.tension >= 1) {
      state.phase = "casting"; state.phaseTime = 0; state.escapes++;
      state.progress = 0; state.tension = 0.25;
      state.notice = "Too much tension; the fish slipped free. Ease sooner on the next cast.";
    } else if (state.progress >= 1) {
      state.phase = "landed"; state.phaseTime = 0;
      state.notice = `${FISHING_CATCHES[state.round].name}. Take a look, then release it.`;
    }
  } else if (state.phase === "releasing" && state.phaseTime >= 0.75) {
    state.released.push(FISHING_CATCHES[state.round].id);
    state.round++;
    state.phase = state.round === FISHING_CATCHES.length ? "finished" : "casting";
    state.phaseTime = 0; state.progress = 0; state.tension = 0.25;
    state.notice = state.phase === "finished" ? "Three fish met, three fish released. The sea keeps its residents." : "Back to the cove. Choose your next cast.";
  }
  return state;
}

export type Berth = {
  x: number; z: number; heading: number;
  halfLength: number; halfWidth: number;
  headingTolerance: number; maxSpeed: number; maxTurn: number; settleSeconds: number;
};
export const DOCKING_BERTH: Readonly<Berth> = {
  x: -113, z: 72, heading: -Math.PI / 2,
  halfLength: 18, halfWidth: 6,
  headingTolerance: Math.PI / 18, maxSpeed: 0.6, maxTurn: 0.06, settleSeconds: 3,
};
export type DockingFit = { fits: boolean; aligned: boolean; slow: boolean; stable: boolean; eligible: boolean; distance: number; headingError: number };
export function dockingFit(boat: BoatState, berth: Readonly<Berth> = DOCKING_BERTH): DockingFit {
  const profile = vesselProfile(boat.vesselId);
  const dx = boat.x - berth.x, dz = boat.z - berth.z;
  const along = dx * Math.sin(berth.heading) - dz * Math.cos(berth.heading);
  const across = dx * Math.cos(berth.heading) + dz * Math.sin(berth.heading);
  const headingError = angleError(boat.heading, berth.heading);
  const relative = boat.heading - berth.heading;
  // Project the entire capsule onto the berth axes, not just its center.
  const radius = profile.beam / 2, segment = profile.length / 2 - radius;
  const lengthReach = segment * Math.abs(Math.cos(relative)) + radius;
  const widthReach = segment * Math.abs(Math.sin(relative)) + radius;
  const finite = [boat.x, boat.z, boat.heading, boat.speed, boat.turn].every(Number.isFinite);
  return {
    fits: finite && Math.abs(along) + lengthReach <= berth.halfLength && Math.abs(across) + widthReach <= berth.halfWidth,
    aligned: finite && headingError <= berth.headingTolerance,
    slow: finite && Math.abs(boat.speed) <= berth.maxSpeed,
    stable: finite && Math.abs(boat.turn) <= berth.maxTurn,
    eligible: boat.vesselId === "superyacht" && !boat.airborne && !boat.rampId,
    distance: Math.hypot(dx, dz), headingError,
  };
}
export type DockingState = { phase: "idle" | "docking" | "finished"; elapsed: number; settled: number; finishTime: number | null; notice: string };
export const createDocking = (): DockingState => ({ phase: "idle", elapsed: 0, settled: 0, finishTime: null, notice: "" });
export function startDocking(state: DockingState): void {
  Object.assign(state, createDocking(), { phase: "docking", notice: "Bring the superyacht inside the berth, align the bow and settle for three seconds." });
}
export function stepDocking(state: DockingState, boat: BoatState, delta: number, paused = false, berth: Readonly<Berth> = DOCKING_BERTH): DockingState {
  const dt = stepTime(delta);
  if (!dt || paused || state.phase !== "docking") return state;
  state.elapsed += dt;
  const fit = dockingFit(boat, berth);
  const settled = fit.eligible && fit.fits && fit.aligned && fit.slow && fit.stable;
  state.settled = settled ? Math.min(berth.settleSeconds, state.settled + dt) : 0;
  state.notice = !fit.eligible ? "This berth is for the superyacht. Return aboard to try." : !fit.fits ? "Bring the whole hull inside the berth." : !fit.aligned ? "Align the bow with the berth arrow." : !fit.slow ? "Ease off. Arrive below 0.6 scene units per second." : !fit.stable ? "Let the turn settle." : "Hold this gentle arrival.";
  if (state.settled >= berth.settleSeconds - 1e-7) {
    state.phase = "finished"; state.settled = berth.settleSeconds; state.finishTime = state.elapsed;
    state.notice = "Alongside, steady and settled. Nicely captained.";
  }
  return state;
}

export type CoursePose = { x: number; y: number; z: number };
export type FishGate = CoursePose & { id: string; radius: number; normal: CoursePose };
export const FISH_COURSE_START = { x: 20, y: -2.3, z: 0, heading: -Math.PI * 0.75 } as const;
const coursePoints = [
  { x: 15, y: -2.3, z: 5 }, { x: 8, y: -2.6, z: 11 },
  { x: -7, y: -2.8, z: 11 }, { x: -17, y: -2.3, z: 1 },
  { x: -8, y: -2.4, z: -10 }, { x: 8, y: -2.3, z: -9 },
];
export const FISH_COURSE_GATES: readonly FishGate[] = coursePoints.map((point, index) => {
  const from = index ? coursePoints[index - 1] : FISH_COURSE_START;
  const length = Math.hypot(point.x - from.x, point.y - from.y, point.z - from.z);
  return { ...point, id: `shoal-${index + 1}`, radius: 1.8, normal: { x: (point.x - from.x) / length, y: (point.y - from.y) / length, z: (point.z - from.z) / length } };
});
export const FISH_COURSE_SECONDS = 45;
export type FishCourseState = {
  phase: "idle" | "swimming" | "finished" | "timed-out";
  gateIndex: number; elapsed: number; finishTime: number | null; assisted: boolean;
  previous: CoursePose | null; notice: string;
};
export const createFishCourse = (): FishCourseState => ({ phase: "idle", gateIndex: 0, elapsed: 0, finishTime: null, assisted: false, previous: null, notice: "" });
export function startFishCourse(state: FishCourseState, pose: CoursePose = FISH_COURSE_START, assisted = false): void {
  Object.assign(state, createFishCourse(), { phase: "swimming", previous: { x: pose.x, y: pose.y, z: pose.z }, assisted, notice: assisted ? "Six open rings. Swim at your pace; the timer is off." : "Six rings, forty-five seconds. Follow the bright next ring." });
}
function gateCrossing(a: CoursePose, b: CoursePose, gate: FishGate): number | null {
  const signed = (point: CoursePose) => (point.x - gate.x) * gate.normal.x + (point.y - gate.y) * gate.normal.y + (point.z - gate.z) * gate.normal.z;
  const before = signed(a), after = signed(b);
  if (before >= 0 || after < 0) return null;
  const t = -before / (after - before);
  return Math.hypot(a.x + (b.x - a.x) * t - gate.x, a.y + (b.y - a.y) * t - gate.y, a.z + (b.z - a.z) * t - gate.z) <= gate.radius ? t : null;
}
export function stepFishCourse(state: FishCourseState, pose: CoursePose, delta: number, paused = false): FishCourseState {
  const dt = stepTime(delta);
  if (!dt || paused || state.phase !== "swimming") return state;
  if (![pose.x, pose.y, pose.z].every(Number.isFinite)) { state.previous = null; return state; }
  const previous = state.previous;
  state.previous = { x: pose.x, y: pose.y, z: pose.z };
  state.elapsed += dt;
  // A chart jump or recovery establishes a new sample and cannot award a ring.
  const crossing = previous && Math.hypot(pose.x - previous.x, pose.y - previous.y, pose.z - previous.z) <= Math.max(0.5, 16 * dt)
    ? gateCrossing(previous, pose, FISH_COURSE_GATES[state.gateIndex]) : null;
  const crossingTime = crossing === null ? Infinity : state.elapsed - dt + dt * crossing;
  if (crossing !== null && (state.assisted || crossingTime <= FISH_COURSE_SECONDS)) {
    state.gateIndex++;
    state.notice = `Ring ${state.gateIndex} of ${FISH_COURSE_GATES.length}.`;
    if (state.gateIndex === FISH_COURSE_GATES.length) {
      state.phase = "finished"; state.finishTime = crossingTime;
      state.notice = "Through the shoal. Six rings, one very small captain.";
    }
  }
  if (!state.assisted && state.elapsed >= FISH_COURSE_SECONDS && state.phase !== "finished") {
    state.phase = "timed-out"; state.notice = "Time is up. Keep swimming freely, or try another lap.";
  }
  return state;
}
