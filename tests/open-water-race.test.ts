import assert from "node:assert/strict";
import test from "node:test";
import {
  raceCourses,
  ramps,
  obstacles,
  COURSE_RADIUS,
  type RaceGate,
} from "../client/src/features/open-water/data/world.ts";
import {
  createBoat,
  distance,
  stepBoat,
  HULL_RADIUS,
  type BoatState,
} from "../client/src/features/open-water/systems/boatController.ts";
import {
  createRace,
  startRace,
  restartRace,
  cancelRace,
  updateRace,
  gateCrossing,
  formatRaceTime,
  type RaceState,
} from "../client/src/features/open-water/systems/raceController.ts";

test("race clock rounds across minute boundaries without displaying sixty seconds", () => {
  for (const [seconds, expected] of [
    [0, "00:00.00"],
    [28.1, "00:28.10"],
    [59.994, "00:59.99"],
    [59.999, "01:00.00"],
    [60, "01:00.00"],
    [119.999, "02:00.00"],
    [601.234, "10:01.23"],
  ] as const) {
    assert.equal(formatRaceTime(seconds), expected);
  }
});

function readyRace(id = "reef-slalom") {
  const boat = createBoat(),
    race = createRace();
  assert.equal(startRace(race, id, boat), true);
  for (let i = 0; i < 180; i++) updateRace(race, boat, 1 / 60);
  assert.equal(race.phase, "racing");
  return { boat, race };
}
function gatePoint(gate: RaceGate, along: number, across = 0, lift = 0) {
  return {
    x:
      gate.x + Math.sin(gate.heading) * along + Math.cos(gate.heading) * across,
    z:
      gate.z - Math.cos(gate.heading) * along + Math.sin(gate.heading) * across,
    lift,
  };
}
function cross(race: RaceState, boat: BoatState, gate: RaceGate, lift = 0) {
  Object.assign(boat, gatePoint(gate, -1, 0, lift), { airborne: lift > 0 });
  updateRace(race, boat, 1 / 60); // A reposition establishes a sample, never awards a gate.
  Object.assign(boat, gatePoint(gate, 1, 0, lift));
  updateRace(race, boat, 1 / 60);
}

test("race selection is explicit, countdown lasts three seconds, and invalid selection leaves state untouched", () => {
  const race = createRace(),
    boat = createBoat();
  updateRace(race, boat, 1 / 60);
  assert.equal(race.phase, "idle");
  assert.equal(startRace(race, "missing", boat), false);
  assert.equal(race.phase, "idle");
  startRace(race, "reef-slalom", boat);
  assert.equal(race.phase, "countdown");
  assert.equal(boat.speed, 0);
  assert.deepEqual(
    { x: boat.x, z: boat.z, heading: boat.heading },
    raceCourses[0].start,
  );
  for (let i = 0; i < 179; i++) updateRace(race, boat, 1 / 60);
  assert.equal(race.phase, "countdown");
  assert.equal(race.elapsed, 0);
  updateRace(race, boat, 1 / 60);
  assert.equal(race.phase, "racing");
  assert.equal(race.elapsed, 0);
});

test("ordered gates require crossing the plane forward and inside its width", () => {
  const gate = raceCourses[0].gates[0];
  assert.equal(
    gateCrossing(gatePoint(gate, -1), gatePoint(gate, 1), gate),
    0.5,
  );
  assert.equal(
    gateCrossing(gatePoint(gate, 1), gatePoint(gate, -1), gate),
    null,
  );
  assert.equal(
    gateCrossing(
      gatePoint(gate, -1, gate.halfWidth + 1),
      gatePoint(gate, 1, gate.halfWidth + 1),
      gate,
    ),
    null,
  );
  assert.equal(
    gateCrossing(gatePoint(gate, -5), gatePoint(gate, -1), gate),
    null,
  );
  const { boat, race } = readyRace();
  cross(race, boat, raceCourses[0].gates[1]);
  assert.equal(race.checkpoint, 0, "later gates must not advance a race");
  cross(race, boat, gate);
  assert.equal(race.checkpoint, 1);
  cross(race, boat, gate);
  assert.equal(race.checkpoint, 1, "a cleared gate must not count twice");
});

test("all courses finish only after every gate in order and preserve the final time", () => {
  for (const course of raceCourses) {
    const { boat, race } = readyRace(course.id);
    for (const [index, gate] of course.gates.entries()) {
      cross(race, boat, gate, gate.minLift ? 3 : 0);
      assert.equal(race.checkpoint, index + 1);
      if (index < course.gates.length - 1) assert.equal(race.phase, "racing");
    }
    assert.equal(race.phase, "finished");
    assert.ok(race.finishTime !== null && race.finishTime > 0);
    assert.equal(race.splitTimes.length, course.gates.length);
    const before = structuredClone(race);
    for (let i = 0; i < 600; i++) updateRace(race, boat, 1 / 60);
    assert.deepEqual(race, before);
  }
});

test("elevated gates require actual airborne elevation, not passing underneath", () => {
  const { boat, race } = readyRace("jump-circuit");
  const course = raceCourses[1];
  cross(race, boat, course.gates[0]);
  cross(race, boat, course.gates[1]);
  assert.equal(race.checkpoint, 1);
  cross(race, boat, course.gates[1], 2);
  assert.equal(race.checkpoint, 2);
});

test("paused countdown and race timing remain unchanged, and restart/cancel reset cleanly", () => {
  const boat = createBoat(),
    race = createRace();
  startRace(race, "jump-circuit", boat);
  let before = structuredClone(race);
  for (let i = 0; i < 240; i++) updateRace(race, boat, 1 / 60, true);
  assert.deepEqual(race, before);
  for (let i = 0; i < 180; i++) updateRace(race, boat, 1 / 60);
  cross(race, boat, raceCourses[1].gates[0]);
  before = structuredClone(race);
  for (let i = 0; i < 120; i++) updateRace(race, boat, 1 / 60, true);
  assert.deepEqual(race, before);
  Object.assign(boat, { airborne: true, lift: 8, verticalSpeed: 3, speed: 25 });
  assert.equal(restartRace(race, boat), true);
  assert.equal(race.phase, "countdown");
  assert.equal(race.checkpoint, 0);
  assert.equal(race.elapsed, 0);
  assert.deepEqual(race.splitTimes, []);
  assert.equal(boat.lift, 0);
  assert.equal(boat.airborne, false);
  assert.equal(boat.speed, 0);
  cancelRace(race);
  assert.deepEqual(race, createRace());
  assert.equal(restartRace(race, boat), false);
});

test("suspension deltas and teleporting do not skip gates or create impossible times", () => {
  const { boat, race } = readyRace();
  const gate = raceCourses[0].gates[0];
  Object.assign(boat, gatePoint(gate, -50));
  updateRace(race, boat, 1 / 60);
  Object.assign(boat, gatePoint(gate, 50));
  updateRace(race, boat, 10000);
  assert.equal(race.checkpoint, 0);
  assert.ok(race.elapsed <= 0.051);
  const before = structuredClone(race);
  for (const dt of [NaN, Infinity, -1, 0]) updateRace(race, boat, dt);
  assert.deepEqual(race, before);
});

test("the first jump-circuit ramp and airborne gate can be cleared with ordinary forward control", () => {
  const { boat, race } = readyRace("jump-circuit");
  let airborne = false,
    landed = false;
  for (let i = 0; i < 12 * 60 && race.checkpoint < 2; i++) {
    stepBoat(boat, { forward: true }, 1 / 60);
    updateRace(race, boat, 1 / 60);
    airborne ||= boat.airborne;
  }
  assert.equal(race.checkpoint, 2);
  assert.equal(boat.jumpCount, 1);
  assert.ok(airborne);
  for (let i = 0; i < 4 * 60; i++) {
    stepBoat(boat, { forward: true }, 1 / 60);
    if (!boat.airborne) {
      landed = true;
      break;
    }
  }
  assert.ok(landed);
});

test("course starts, checkpoints, ramp landings and work approaches stay in navigable water", () => {
  for (const course of raceCourses) {
    for (const point of [course.start, ...course.gates]) {
      assert.ok(Math.hypot(point.x, point.z) < COURSE_RADIUS);
      for (const island of obstacles)
        assert.ok(distance(point, island) > island.r + HULL_RADIUS);
    }
    for (const id of course.rampIds)
      assert.ok(ramps.some((ramp) => ramp.id === id));
  }
});
