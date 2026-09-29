import { raceCourses, type Point, type RaceGate } from "../data/world.ts";
import { createBoat, type BoatState } from "./boatController.ts";

export function formatRaceTime(seconds: number) {
  const hundredths = Math.round(Math.max(0, seconds) * 100);
  const minutes = Math.floor(hundredths / 6000);
  const remainder = ((hundredths % 6000) / 100).toFixed(2);
  return `${String(minutes).padStart(2, "0")}:${remainder.padStart(5, "0")}`;
}

export type RaceState = {
  phase: "idle" | "countdown" | "racing" | "finished";
  courseId: string | null;
  countdown: number;
  elapsed: number;
  checkpoint: number;
  splitTimes: number[];
  finishTime: number | null;
  previous: (Point & { lift: number }) | null;
};
export function createRace(): RaceState {
  return {
    phase: "idle",
    courseId: null,
    countdown: 0,
    elapsed: 0,
    checkpoint: 0,
    splitTimes: [],
    finishTime: null,
    previous: null,
  };
}
/** Explicit course selection resets only this in-memory session, never a persistent leaderboard. */
export function startRace(
  state: RaceState,
  courseId: string,
  boat: BoatState,
): boolean {
  const course = raceCourses.find((course) => course.id === courseId);
  if (!course) return false;
  Object.assign(boat, createBoat(), course.start);
  Object.assign(state, createRace(), {
    phase: "countdown",
    courseId,
    countdown: 3,
    previous: { x: boat.x, z: boat.z, lift: 0 },
  });
  return true;
}
export function restartRace(state: RaceState, boat: BoatState): boolean {
  return state.courseId ? startRace(state, state.courseId, boat) : false;
}
export function cancelRace(state: RaceState): void {
  Object.assign(state, createRace());
}

/** Return crossing fraction only for forward travel through the width of the gate. */
export function gateCrossing(
  previous: Point & { lift: number },
  current: Point & { lift: number },
  gate: RaceGate,
): number | null {
  const fx = Math.sin(gate.heading),
    fz = -Math.cos(gate.heading);
  const before = (previous.x - gate.x) * fx + (previous.z - gate.z) * fz;
  const after = (current.x - gate.x) * fx + (current.z - gate.z) * fz;
  if (before >= 0 || after < 0 || after - before < 1e-8) return null;
  const fraction = -before / (after - before);
  const x = previous.x + (current.x - previous.x) * fraction;
  const z = previous.z + (current.z - previous.z) * fraction;
  const across =
    (x - gate.x) * Math.cos(gate.heading) +
    (z - gate.z) * Math.sin(gate.heading);
  const lift = previous.lift + (current.lift - previous.lift) * fraction;
  return Math.abs(across) <= gate.halfWidth && lift >= (gate.minLift ?? 0)
    ? fraction
    : null;
}

/** Call after each fixed physics step; skip boat physics throughout the countdown. */
export function updateRace(
  state: RaceState,
  boat: BoatState,
  delta: number,
  paused = false,
): RaceState {
  const dt = Number.isFinite(delta) ? Math.max(0, Math.min(delta, 1 / 30)) : 0;
  if (
    paused ||
    dt === 0 ||
    state.phase === "idle" ||
    state.phase === "finished"
  )
    return state;
  const course = raceCourses.find((course) => course.id === state.courseId);
  if (!course) {
    cancelRace(state);
    return state;
  }
  const current = { x: boat.x, z: boat.z, lift: boat.lift };
  if (state.phase === "countdown") {
    state.countdown = Math.max(0, state.countdown - dt);
    state.previous = current;
    if (state.countdown < 1e-8) {
      state.countdown = 0;
      state.phase = "racing";
    }
    return state;
  }
  state.elapsed += dt;
  const previous = state.previous;
  state.previous = current;
  if (
    !previous ||
    Math.hypot(current.x - previous.x, current.z - previous.z) >
      Math.max(6, Math.abs(boat.speed) * dt * 2 + 1)
  )
    return state;
  const gate = course.gates[state.checkpoint];
  if (!gate) return state;
  const crossed = gateCrossing(previous, current, gate);
  if (crossed === null || (gate.minLift && !boat.airborne)) return state;
  const split = state.elapsed - dt * (1 - crossed);
  state.splitTimes.push(split);
  state.checkpoint++;
  if (state.checkpoint === course.gates.length) {
    state.phase = "finished";
    state.finishTime = split;
  }
  return state;
}
