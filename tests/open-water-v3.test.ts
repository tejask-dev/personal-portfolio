import assert from "node:assert/strict";
import test from "node:test";
import { createBoat, steerTo } from "../client/src/features/open-water/systems/boatController.ts";
import { HOME, WORLD_RADIUS, obstacles, destinations } from "../client/src/features/open-water/data/world.ts";
import { cloneBoat, expeditionReducer, initialExpedition, returnedBoat, safeBoatPose } from "../client/src/features/open-water/systems/expeditionController.ts";
import { createReef, currentPath, moveReef, reefCamera, resolveReefPose, safeReefSegment, stepReef, type ReefPose, type ReefState } from "../client/src/features/open-water/systems/reefController.ts";
import { getReefCameraIntervals, getReefDepthIntervals, reefTerrainDefinition, sampleReefDepth } from "../client/src/features/open-water/data/reefTerrain.ts";

const at = (x: number, y: number, z: number, heading = 0): ReefPose => ({ x, y, z, heading });
const reefAt = (pose: ReefPose): ReefState => ({ ...createReef(), ...pose });
const dive = () => expeditionReducer(initialExpedition(), { type: "DIVE", boat: createBoat(), racing: false });

function assertSafeDiver(p: ReefPose) {
  assert.ok([p.x, p.y, p.z, p.heading].every(Number.isFinite), `Non-finite pose ${JSON.stringify(p)}`);
  assert.ok(Math.hypot(p.x / 24, p.z / 18) <= 1 + 1e-8, "Diver escaped the reef ellipse");
  assert.ok(getReefDepthIntervals(p.x, p.z).some(([low, high]) => -p.y >= low - 1e-7 && -p.y <= high + 1e-7), `Diver intersects floor/solid at ${JSON.stringify(p)}`);
}

test("safe dive rejects airborne, ramp, obstacle, invalid and out-of-world anchors", () => {
  const variants = [
    { airborne: true }, { rampId: "ramp" }, { x: NaN }, { heading: Infinity },
    { x: WORLD_RADIUS, z: 0 }, { x: obstacles[0].x, z: obstacles[0].z },
  ];
  for (const patch of variants) {
    const boat = { ...createBoat(), ...patch };
    assert.equal(safeBoatPose(boat), false);
    const result = expeditionReducer(initialExpedition(), { type: "DIVE", boat, racing: false });
    assert.equal(result.mode, "surface");
    assert.equal(result.returnBoat, null);
    assert.match(result.notice, /safe|clear water/i);
  }
});

test("race guard refuses a dive without changing the boat, course or transition", () => {
  const boat = createBoat();
  steerTo(boat, destinations[0].dock, destinations[0].id);
  const before = structuredClone(boat);
  const result = expeditionReducer(initialExpedition(), { type: "DIVE", boat, racing: true });
  assert.equal(result.mode, "surface");
  assert.equal(result.transitionId, 0);
  assert.equal(result.returnBoat, null);
  assert.equal(result.userPaused, true);
  assert.deepEqual(boat, before);
  assert.match(result.notice, /Free sail/);
});

test("dive snapshot owns its route and target independently of the live boat", () => {
  const boat = createBoat();
  steerTo(boat, destinations[0].dock, destinations[0].id);
  const expected = structuredClone(boat);
  const state = expeditionReducer(initialExpedition(), { type: "DIVE", boat, racing: false });
  assert.equal(state.mode, "entering");
  assert.deepEqual(state.returnBoat, expected);
  boat.x += 10;
  boat.target!.x += 15;
  boat.route[0].z += 20;
  assert.deepEqual(state.returnBoat, expected);
  assert.notEqual(cloneBoat(boat).route, boat.route);
});

test("cancel and a new dive reject completion from the previous transition", () => {
  const first = dive();
  const canceled = expeditionReducer(first, { type: "CANCEL_DIVE" });
  assert.equal(canceled.mode, "surface");
  assert.equal(canceled.userPaused, true);
  assert.equal(canceled.returnBoat, null);
  assert.equal(expeditionReducer(canceled, { type: "REEF_READY", id: first.transitionId }), canceled);
  const second = expeditionReducer(canceled, { type: "DIVE", boat: createBoat(), racing: false });
  assert.equal(expeditionReducer(second, { type: "REEF_READY", id: first.transitionId }), second);
  assert.equal(expeditionReducer(second, { type: "REEF_READY", id: second.transitionId }).mode, "reef");
});

test("late reef readiness cannot clear a pause requested while preparing", () => {
  const entering = dive();
  const paused = expeditionReducer(entering, { type: "PAUSE", value: true });
  const ready = expeditionReducer(paused, { type: "REEF_READY", id: entering.transitionId });
  assert.equal(ready.mode, "reef");
  assert.equal(ready.userPaused, true, "Asset readiness is not an explicit Resume action");
});

test("closing ordinary reading requires explicit Resume before an existing course continues", () => {
  const sailing = expeditionReducer(initialExpedition(), { type: "SAIL" });
  const reading = expeditionReducer(sailing, { type: "PANEL", panel: "work", racing: false });
  const closed = expeditionReducer(reading, { type: "PANEL", panel: null });
  assert.equal(closed.userPaused, true, "Closing a panel must not resume autopilot");
  const resumed = expeditionReducer(closed, { type: "PAUSE", value: false });
  assert.equal(resumed.userPaused, false);
});

test("reading preserves a race pause after the last panel closes", () => {
  const sailing = expeditionReducer(initialExpedition(), { type: "SAIL" });
  const reading = expeditionReducer(sailing, { type: "PANEL", panel: "work", racing: true });
  const contact = expeditionReducer(reading, { type: "PANEL", panel: "radio", racing: true });
  const closed = expeditionReducer(contact, { type: "PANEL", panel: null });
  assert.equal(closed.userPaused, true);
  assert.equal(closed.mode, "surface");
});

test("Free sail ownership clears a prior instrument camera", () => {
  const optics = expeditionReducer(initialExpedition(), { type: "ACTIVITY", activity: "lighthouse" });
  const sailing = expeditionReducer(optics, { type: "SAIL" });
  assert.equal(sailing.activity, "none", "SAIL must not retain a camera activity that prevents its simulation loop");
});

test("completing an activity releases its owner without clearing an independent pause", () => {
  const activity = expeditionReducer(dive(), { type: "ACTIVITY", activity: "current" });
  const completed = expeditionReducer(activity, { type: "ACTIVITY_DONE", pause: true });
  assert.equal(completed.activity, "none");
  assert.equal(completed.userPaused, true);
  const manual = expeditionReducer(activity, { type: "ACTIVITY_DONE", pause: false });
  assert.equal(manual.activity, "none");
  assert.equal(manual.userPaused, false);
  const alreadyPaused = expeditionReducer({ ...activity, userPaused: true }, { type: "ACTIVITY_DONE", pause: false });
  assert.equal(alreadyPaused.userPaused, true);
});

test("return restores exact valid coordinates and heading with every motion field at rest", () => {
  const snapshot = { ...createBoat(), x: 13.375, z: 44.125, heading: 1.23456789, speed: 9, turn: 0.6 };
  steerTo(snapshot, destinations[0].dock, destinations[0].id);
  const before = structuredClone(snapshot);
  assert.equal(safeBoatPose(snapshot), true);
  const { boat, recovered } = returnedBoat(snapshot);
  assert.equal(recovered, false);
  assert.equal(boat.x, snapshot.x);
  assert.equal(boat.z, snapshot.z);
  assert.equal(boat.heading, snapshot.heading);
  assert.deepEqual({ ...boat, x: HOME.x, z: HOME.z, heading: HOME.heading }, createBoat());
  assert.deepEqual(snapshot, before, "Restoring cannot mutate the saved source snapshot");
});

test("invalid return snapshots recover to an honestly flagged safe home pose", () => {
  for (const snapshot of [null, { ...createBoat(), x: NaN }, { ...createBoat(), airborne: true }]) {
    const result = returnedBoat(snapshot);
    assert.equal(result.recovered, true);
    assert.deepEqual(result.boat, createBoat());
  }
});

test("canonical entry and arch retain distinct above-roof and below-roof intervals", () => {
  assert.equal(sampleReefDepth(20, 0), 4.5);
  assert.deepEqual(getReefDepthIntervals(20, 0), [[1, 3.45]]);
  const arch = getReefDepthIntervals(-3, -4);
  assert.equal(arch.length, 2);
  assert.ok(Math.abs(arch[0][1] - 3.1) < 1e-9);
  assert.ok(Math.abs(arch[1][0] - 5.9) < 1e-9);
  assert.ok(Math.abs(arch[1][1] - 7.55) < 1e-9);
});

test("Quiet resolves arbitrary fractional positions and depths, including boundary requests", () => {
  const arbitrary = at(4.375, -2.625, 3.125, 0.17);
  assert.deepEqual(resolveReefPose(arbitrary).pose, arbitrary);
  const boundary = resolveReefPose(at(24, -2, 18));
  assertSafeDiver(boundary.pose);
  assert.ok(Math.abs(Math.hypot(boundary.pose.x / 24, boundary.pose.z / 18) - 1) < 1e-10);
  assert.match(boundary.notice, /boundary/i);
  const deep = resolveReefPose(at(20, -9, 0));
  assert.equal(deep.pose.y, -3.45);
  assert.match(deep.notice, /Depth adjusted/);
});

test("a motion sweep cannot jump through the arch roof or piers", () => {
  const above = at(-3, -2, -4), below = at(-3, -6.4, -4);
  assertSafeDiver(above);
  assertSafeDiver(below);
  assert.equal(safeReefSegment(above, below), false);
  const swimmer = reefAt(above);
  assert.equal(moveReef(swimmer, below), false);
  assert.deepEqual({ x: swimmer.x, y: swimmer.y, z: swimmer.z }, { x: above.x, y: above.y, z: above.z });
  assert.equal(safeReefSegment(at(-8, -6, -4), at(2, -6, -4)), false);
});

test("the arch opening remains traversable at a safe depth", () => {
  const start = at(-3, -6, -7), end = at(-3, -6, -1);
  assertSafeDiver(start);
  assertSafeDiver(end);
  assert.equal(safeReefSegment(start, end), true);
  const swimmer = reefAt(start);
  assert.equal(moveReef(swimmer, end), true);
  assert.equal(swimmer.z, end.z);
});

test("long motion sweeps check the intervening floor rather than only safe endpoints", () => {
  const start = at(17, -6.3, 0), end = at(22, -3.5, 0);
  assertSafeDiver(start);
  assertSafeDiver(end);
  assert.equal(safeReefSegment(start, end), false, "The shallow entry shelf intersects this diagonal path");
});

test("invalid motion requests preserve a finite pose including heading", () => {
  const swimmer = createReef();
  const previous = { ...swimmer };
  moveReef(swimmer, { ...swimmer, heading: NaN });
  assertSafeDiver(swimmer);
  assert.equal(swimmer.heading, previous.heading);
});

test("each manual reef input cancels a current and a travel target immediately", () => {
  for (const key of ["forward", "backward", "left", "right", "rise", "descend"] as const) {
    const swimmer = { ...createReef(), current: true, target: at(0, -3, 0) };
    stepReef(swimmer, { [key]: true }, 1 / 60);
    assert.equal(swimmer.current, false, key);
    assert.equal(swimmer.target, null, key);
    assertSafeDiver(swimmer);
  }
});

test("the explicitly joined current completes within its bounded authored duration", () => {
  const swimmer = { ...createReef(), ...currentPath[0], y: -3.8, current: true, currentNode: 1 };
  let frames = 0;
  while (swimmer.current && frames < 60 * 15) {
    stepReef(swimmer, {}, 1 / 60);
    assertSafeDiver(swimmer);
    frames++;
  }
  assert.equal(swimmer.current, false);
  assert.ok(frames / 60 >= 8 && frames / 60 <= 12, `Current lasted ${frames / 60}s`);
  assert.ok(Math.hypot(swimmer.x - currentPath.at(-1)!.x, swimmer.z - currentPath.at(-1)!.z) < 0.5);
});

test("camera eyes remain submerged and outside floor/solid intervals around named habitats", () => {
  for (const sample of reefTerrainDefinition.namedSamples) {
    for (const depth of [1, 3, 5.9, 8]) {
      const pose = resolveReefPose(at(sample.x, -depth, sample.z)).pose;
      for (const heading of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
        for (const zoom of [0.6, 1, 1.5]) {
          const eye = reefCamera({ ...pose, heading }, 0.4, zoom);
          assert.ok([eye.x, eye.y, eye.z].every(Number.isFinite));
          assert.ok(eye.y <= -0.75 + 1e-8, `${sample.id}: eye crossed water ceiling`);
          assert.ok(getReefCameraIntervals(eye.x, eye.z).some(([a, b]) => eye.y >= a - 1e-7 && eye.y <= b + 1e-7), `${sample.id}: invalid eye ${JSON.stringify(eye)}`);
        }
      }
    }
  }
});
