import assert from "node:assert/strict";
import test from "node:test";
import {
  raceCourses,
  ramps,
  obstacles,
  COURSE_RADIUS,
  type Point,
  type RaceCourse,
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

const segmentDistance = (point: Point, from: Point, to: Point) => {
  const dx = to.x - from.x, dz = to.z - from.z;
  const t = Math.max(0, Math.min(1, ((point.x - from.x) * dx + (point.z - from.z) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(point.x - from.x - dx * t, point.z - from.z - dz * t);
};

test("five distinct courses offer precision, endurance and both one- and two-ramp routes", () => {
  assert.equal(raceCourses.length, 5);
  assert.equal(new Set(raceCourses.map(course => course.id)).size, 5);
  assert.deepEqual(raceCourses.slice(0, 2).map(course => [course.id, course.gates.length]), [["reef-slalom", 7], ["jump-circuit", 9]]);
  const lighthouse = raceCourses.find(course => course.id === "lighthouse-loop")!;
  const atoll = raceCourses.find(course => course.id === "atoll-grand-tour")!;
  const sprint = raceCourses.find(course => course.id === "harbor-sprint")!;
  const length = (course: RaceCourse) => course.gates.reduce((total, gate, index) => total + distance(index ? course.gates[index - 1] : course.start, gate), 0);
  assert.ok(length(atoll) > length(sprint) * 2.5, "The tour must be meaningfully longer than the sprint");
  assert.ok(lighthouse.gates.every(gate => gate.halfWidth < atoll.gates[0].halfWidth));
  assert.equal(lighthouse.difficulty, "Advanced");
  assert.equal(sprint.gates.filter(gate => gate.minLift).length, 1);
  assert.equal(raceCourses[1].gates.filter(gate => gate.minLift).length, 2);
});

test("every route segment has hull clearance and every visible gate pole stays off land", () => {
  for (const course of raceCourses) {
    for (const [index, gate] of course.gates.entries()) {
      const from = index ? course.gates[index - 1] : course.start;
      for (const obstacle of obstacles) {
        assert.ok(segmentDistance(obstacle, from, gate) > obstacle.r + HULL_RADIUS + 2,
          `${course.id}/${gate.id} center line clips ${obstacle.id}`);
        for (const side of [-1, 1]) {
          const pole = { x: gate.x + Math.cos(gate.heading) * gate.halfWidth * side, z: gate.z + Math.sin(gate.heading) * gate.halfWidth * side };
          assert.ok(distance(pole, obstacle) > obstacle.r + 1, `${course.id}/${gate.id} buoy is on ${obstacle.id}`);
        }
      }
      // Ground-only courses must also avoid the solid sides and backs of ramps.
      if (!course.rampIds.length) for (const ramp of ramps) {
        assert.ok(segmentDistance(ramp, from, gate) > Math.hypot(ramp.length / 2, ramp.width / 2) + HULL_RADIUS,
          `${course.id}/${gate.id} crosses an unintended ramp`);
      }
    }
  }
});

/** Ten keyboard decisions per second; no coordinates, speeds, lift or gate state
 * are written after the same public Start operation used by the website.
 * This catches routes whose individual points are safe but whose turns or ramp
 * approaches cannot be driven with the actual tender controller.
 */
for (const course of raceCourses) test(`${course.name} can be completed with ordinary steering, clear hull and actual ramp launches`, t => {
  const { boat, race } = readyRace(course.id);
  const wrap = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));
  let input = {}, airborneSeen = false, landingSeen = false, minimumClearance = Infinity;
  const riddenRamps = new Set<string>(), awarded: number[] = [];
  let previousGate = 0;
  for (let frame = 0; frame < 240 * 60 && race.phase === "racing"; frame++) {
    if (frame % 6 === 0) {
      const gate = course.gates[race.checkpoint];
      const error = wrap(Math.atan2(gate.x - boat.x, -(gate.z - boat.z)) - boat.heading);
      const steering = error * 2.1 - boat.turn * 0.5;
      const desiredSpeed = 20 * Math.max(0.17, 1 - Math.abs(error) / 1.7);
      input = { right: steering > 0.09, left: steering < -0.09, forward: boat.speed < desiredSpeed - 0.3, backward: boat.speed > desiredSpeed + 1 };
    }
    stepBoat(boat, input, 1 / 60);
    updateRace(race, boat, 1 / 60);
    if (boat.rampId) riddenRamps.add(boat.rampId);
    if (boat.airborne) airborneSeen = true;
    else if (airborneSeen) landingSeen = true;
    minimumClearance = Math.min(minimumClearance, ...obstacles.map(obstacle => distance(boat, obstacle) - obstacle.r - HULL_RADIUS));
    assert.ok(Math.hypot(boat.x, boat.z) < COURSE_RADIUS, `${course.id} ran out of navigable world`);
    if (race.checkpoint > previousGate) {
      assert.equal(race.checkpoint, previousGate + 1);
      if (course.gates[previousGate].minLift) assert.ok(boat.airborne, `${course.id} awarded an airborne gate while grounded`);
      awarded.push(race.checkpoint); previousGate = race.checkpoint;
    }
  }
  assert.equal(race.phase, "finished", `${course.id} stuck at gate ${race.checkpoint + 1}, position ${boat.x.toFixed(1)},${boat.z.toFixed(1)}`);
  assert.equal(awarded.length, course.gates.length);
  assert.ok(minimumClearance > 0.5, `${course.id} hit an island or relied on hull correction (${minimumClearance})`);
  assert.ok(race.finishTime! > 5 && race.finishTime! < 120);
  assert.ok(race.splitTimes.every((split, index) => !index || split > race.splitTimes[index - 1]));
  for (const rampId of course.rampIds) assert.ok(riddenRamps.has(rampId), `${course.id} missed ${rampId}`);
  if (course.rampIds.length) {
    assert.ok(airborneSeen && landingSeen, `${course.id} must take off and land before finishing`);
    assert.equal(boat.jumpCount, course.gates.filter(gate => gate.minLift).length);
  } else assert.equal(boat.jumpCount, 0);
  t.diagnostic(`${course.gates.length} ordered gates; ${race.finishTime!.toFixed(2)}s simulated; ${minimumClearance.toFixed(2)} minimum hull-to-land clearance; ${boat.jumpCount} actual jumps`);
});
