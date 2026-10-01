import assert from "node:assert/strict";
import test from "node:test";
import { createBoat, stepBoat, steerTo, isBoatPoseSafe, boatHullCapsule, distance } from "../client/src/features/open-water/systems/boatController.ts";
import { VESSELS } from "../client/src/features/open-water/data/vessels.ts";
import { destinations, obstacles, ramps, WORLD_RADIUS } from "../client/src/features/open-water/data/world.ts";
import {
  createFishing, startFishing, castFishing, hookFishing, releaseFishing, stepFishing,
  createDocking, startDocking, stepDocking, dockingFit, DOCKING_BERTH,
  createFishCourse, startFishCourse, stepFishCourse, FISH_COURSE_GATES, FISH_COURSE_START,
  type FishingState, type FishingInput, type FishCourseState, type FishGate,
} from "../client/src/features/open-water/systems/gameController.ts";

function fishTicks(state: FishingState, seconds: number, input: FishingInput = {}, paused = false) {
  for (let i = 0; i < seconds * 60; i++) stepFishing(state, input, 1 / 60, paused);
}
function readyLine(assisted = false) {
  const state = createFishing(assisted);
  startFishing(state);
  assert.equal(castFishing(state, state.schoolPosition), true);
  for (let i = 0; i < 360 && state.phase === "waiting"; i++) stepFishing(state, {}, 1 / 60);
  assert.equal(state.phase, "bite");
  assert.equal(hookFishing(state), true);
  return state;
}

test("the default tender retains original speed and ramp capabilities while the yacht is slower and deliberate", () => {
  const tender = createBoat(), yacht = createBoat("superyacht");
  assert.equal(tender.vesselId, "tender");
  assert.equal(VESSELS.superyacht.canJump, false);
  for (let i = 0; i < 120; i++) {
    stepBoat(tender, { forward: true, right: true }, 1 / 60);
    stepBoat(yacht, { forward: true, right: true }, 1 / 60);
  }
  assert.ok(tender.speed > yacht.speed * 1.5);
  assert.ok(tender.turn > yacht.turn * 2);
  assert.ok(isBoatPoseSafe(createBoat("superyacht")));
});

test("the yacht's oriented hull catches its bow near an island even when its center is clear", () => {
  const island = obstacles[0];
  const yacht = { ...createBoat("superyacht"), x: island.x, z: island.z + island.r + 8, heading: 0 };
  assert.equal(isBoatPoseSafe(yacht), false);
  stepBoat(yacht, {}, 1 / 60);
  assert.equal(isBoatPoseSafe(yacht), true);
  const hull = boatHullCapsule(yacht);
  assert.ok(distance(hull.b, island) >= island.r + hull.radius - 1e-6);
});

test("superyacht cannot board or jump a ramp, including bow and side approaches", () => {
  for (const ramp of ramps) for (const side of [false, true]) {
    const heading = ramp.heading + (side ? Math.PI / 2 : 0);
    const yacht = {
      ...createBoat("superyacht"), heading,
      x: ramp.x - Math.sin(heading) * 45,
      z: ramp.z + Math.cos(heading) * 45,
    };
    for (let i = 0; i < 900; i++) {
      stepBoat(yacht, { forward: true }, 1 / 60);
      assert.equal(yacht.airborne, false);
      assert.equal(yacht.rampId, null);
      assert.equal(yacht.lift, 0);
    }
    assert.equal(yacht.jumpCount, 0);
    assert.equal(isBoatPoseSafe(yacht), true);
  }
});

test("superyacht navigation reaches every work approach with its own safe clearance", () => {
  for (const destination of destinations) {
    const yacht = createBoat("superyacht");
    steerTo(yacht, destination.dock, destination.id);
    assert.ok(yacht.target);
    const target = { ...yacht.target };
    for (let i = 0; i < 90 * 60 && yacht.target; i++) {
      stepBoat(yacht, {}, 1 / 60);
      assert.equal(isBoatPoseSafe(yacht), true, `${destination.id}: unsafe hull at ${yacht.x},${yacht.z}`);
    }
    assert.equal(yacht.arrived, destination.id);
    assert.ok(distance(yacht, target) < VESSELS.superyacht.arrivalRadius);
  }
});

test("the yacht's full hull stays within the world and invalid anchors are rejected", () => {
  const yacht = { ...createBoat("superyacht"), x: WORLD_RADIUS, z: 0 };
  stepBoat(yacht, {}, 1 / 60);
  assert.ok(Math.hypot(yacht.x, yacht.z) <= WORLD_RADIUS - VESSELS.superyacht.hullRadius);
  for (const patch of [{ x: NaN }, { heading: Infinity }, { airborne: true }, { rampId: "harbor-jump" }])
    assert.equal(isBoatPoseSafe({ ...createBoat("superyacht"), ...patch }), false);
});

test("a fishing cast aims at a moving school and poor placement takes longer to attract a bite", () => {
  const near = createFishing(), far = createFishing();
  startFishing(near); startFishing(far);
  fishTicks(near, 1); fishTicks(far, 1);
  assert.notEqual(near.schoolPosition, 0.5);
  castFishing(near, near.schoolPosition);
  castFishing(far, near.schoolPosition > 0.5 ? 0 : 1);
  assert.ok(near.biteDelay < far.biteDelay);
  assert.equal(castFishing(near, 0.5), false);
  assert.equal(hookFishing(near), false);
});

test("premature actions cannot award catches and missing a bite permits a fresh cast", () => {
  const state = createFishing();
  assert.equal(castFishing(state), false);
  assert.equal(hookFishing(state), false);
  assert.equal(releaseFishing(state), false);
  startFishing(state); castFishing(state, 0.5);
  fishTicks(state, 5);
  assert.equal(state.phase, "casting");
  assert.equal(state.escapes, 1);
  assert.equal(state.round, 0);
  assert.deepEqual(state.released, []);
});

test("constant force slips the line while alternating reel and ease can land a fish", () => {
  const force = readyLine();
  fishTicks(force, 6, { reel: true });
  assert.equal(force.phase, "casting");
  assert.equal(force.escapes, 1);
  const controlled = readyLine();
  let easing = false;
  for (let i = 0; i < 1800 && controlled.phase === "reeling"; i++) {
    if (controlled.tension > 0.7) easing = true;
    if (controlled.tension < 0.32) easing = false;
    stepFishing(controlled, { reel: !easing, ease: easing }, 1 / 60);
  }
  assert.equal(controlled.phase, "landed");
  assert.equal(controlled.released.length, 0, "landing alone must not record a release");
});

test("assisted fishing gives untimed bites and still needs actual reeling and three explicit releases", () => {
  const state = createFishing(true);
  startFishing(state);
  for (let round = 0; round < 3; round++) {
    castFishing(state);
    for (let i = 0; i < 360 && state.phase === "waiting"; i++) stepFishing(state, {}, 1 / 60);
    fishTicks(state, 10);
    assert.equal(state.phase, "bite");
    hookFishing(state);
    fishTicks(state, 2);
    assert.equal(state.progress, 0);
    for (let i = 0; i < 900 && state.phase === "reeling"; i++) stepFishing(state, { reel: true }, 1 / 60);
    assert.equal(state.phase, "landed");
    assert.equal(state.round, round);
    assert.equal(releaseFishing(state), true);
    assert.equal(releaseFishing(state), false);
    fishTicks(state, 1);
    assert.equal(state.released.length, round + 1);
  }
  assert.equal(state.phase, "finished");
  assert.equal(new Set(state.released).size, 3);
  const completed = structuredClone(state);
  fishTicks(state, 5, { reel: true });
  assert.deepEqual(state, completed);
});

test("fishing pause and suspension do not advance time or silently lose a fish", () => {
  const state = readyLine();
  const before = structuredClone(state);
  fishTicks(state, 10, { reel: true }, true);
  for (const dt of [NaN, Infinity, -1, 0]) stepFishing(state, {}, dt);
  assert.deepEqual(state, before);
  stepFishing(state, { reel: true }, 10000);
  assert.ok(state.elapsed - before.elapsed <= 1 / 30 + 1e-9);
});

test("docking requires the entire superyacht, correct heading, low speed and a three-second continuous settle", () => {
  const yacht = { ...createBoat("superyacht"), x: DOCKING_BERTH.x, z: DOCKING_BERTH.z, heading: DOCKING_BERTH.heading };
  assert.equal(isBoatPoseSafe(yacht), true);
  const state = createDocking(); startDocking(state);
  for (let i = 0; i < 179; i++) stepDocking(state, yacht, 1 / 60);
  assert.equal(state.phase, "docking");
  stepDocking(state, yacht, 1 / 60);
  assert.equal(state.phase, "finished");
  assert.equal(state.settled, 3);
  const before = structuredClone(state); stepDocking(state, yacht, 30);
  assert.deepEqual(state, before);
});

test("a hull outside the berth, reversed bow, motion, or tender resets docking settlement", () => {
  const yacht = { ...createBoat("superyacht"), x: DOCKING_BERTH.x, z: DOCKING_BERTH.z, heading: DOCKING_BERTH.heading };
  for (const patch of [
    { z: yacht.z + 3 }, { heading: yacht.heading + Math.PI }, { speed: 0.7 },
    { turn: 0.1 }, { vesselId: "tender" as const }, { airborne: true }, { x: NaN },
  ]) {
    const state = createDocking(); startDocking(state);
    for (let i = 0; i < 60; i++) stepDocking(state, yacht, 1 / 60);
    assert.ok(state.settled > 0);
    stepDocking(state, { ...yacht, ...patch }, 1 / 60);
    assert.equal(state.settled, 0);
    assert.equal(state.phase, "docking");
  }
  assert.equal(dockingFit({ ...yacht, z: yacht.z + 3 }).fits, false);
});

test("paused docking preserves the settling interval and invalid dt does not advance it", () => {
  const state = createDocking(); startDocking(state);
  const yacht = { ...createBoat("superyacht"), x: DOCKING_BERTH.x, z: DOCKING_BERTH.z, heading: DOCKING_BERTH.heading };
  stepDocking(state, yacht, 1 / 60);
  const before = structuredClone(state);
  stepDocking(state, yacht, 100, true);
  for (const dt of [NaN, Infinity, -1, 0]) stepDocking(state, yacht, dt);
  assert.deepEqual(state, before);
});

const gatePoint = (gate: FishGate, along: number, above = 0) => ({
  x: gate.x + gate.normal.x * along,
  y: gate.y + gate.normal.y * along + above,
  z: gate.z + gate.normal.z * along,
});
function crossFishGate(state: FishCourseState, gate: FishGate, reverse = false, above = 0) {
  stepFishCourse(state, gatePoint(gate, reverse ? 0.15 : -0.15, above), 1 / 60);
  stepFishCourse(state, gatePoint(gate, reverse ? -0.15 : 0.15, above), 1 / 60);
}

test("fish course awards six spatial gates in order, never for backwards or out-of-ring crossings", () => {
  const state = createFishCourse(); startFishCourse(state);
  crossFishGate(state, FISH_COURSE_GATES[1]);
  assert.equal(state.gateIndex, 0);
  crossFishGate(state, FISH_COURSE_GATES[0], true);
  assert.equal(state.gateIndex, 0);
  crossFishGate(state, FISH_COURSE_GATES[0], false, 4);
  assert.equal(state.gateIndex, 0);
  for (const [index, gate] of FISH_COURSE_GATES.entries()) {
    crossFishGate(state, gate);
    assert.equal(state.gateIndex, index + 1);
  }
  assert.equal(state.phase, "finished");
  assert.ok(state.finishTime! > 0);
});

test("a chart jump cannot complete a fish ring and a paused course cannot count movement", () => {
  const state = createFishCourse(); startFishCourse(state);
  const gate = FISH_COURSE_GATES[0];
  stepFishCourse(state, gatePoint(gate, -20), 1 / 60);
  stepFishCourse(state, gatePoint(gate, 20), 500);
  assert.equal(state.gateIndex, 0);
  const before = structuredClone(state);
  stepFishCourse(state, gatePoint(gate, 0.15), 1 / 60, true);
  assert.deepEqual(state, before);
  stepFishCourse(state, { x: NaN, y: 0, z: 0 }, 1 / 60);
  assert.equal(state.previous, null);
});

test("fish course has a real 45-second deadline and assisted exploration removes it", () => {
  const timed = createFishCourse(), assisted = createFishCourse();
  startFishCourse(timed); startFishCourse(assisted, FISH_COURSE_START, true);
  for (let i = 0; i < 46 * 60; i++) {
    stepFishCourse(timed, FISH_COURSE_START, 1 / 60);
    stepFishCourse(assisted, FISH_COURSE_START, 1 / 60);
  }
  assert.equal(timed.phase, "timed-out");
  assert.equal(assisted.phase, "swimming");
  assert.equal(assisted.gateIndex, 0);
});

test("a last ring crossed after the deadline cannot override a timeout", () => {
  const state = createFishCourse(); startFishCourse(state);
  state.gateIndex = 5; state.elapsed = 44.999;
  const gate = FISH_COURSE_GATES[5];
  state.previous = gatePoint(gate, -0.15);
  stepFishCourse(state, gatePoint(gate, 0.15), 1 / 60);
  assert.equal(state.phase, "timed-out");
  assert.equal(state.gateIndex, 5);
});
