import assert from "node:assert/strict";
import test from "node:test";
import {
  BOAT_STEP,
  contactSpeedRetention,
  createBoat,
  distance,
  isBoatPoseSafe,
  steerTo,
  stepBoat,
  waveHeight,
  type BoatState,
  type Input,
} from "../client/src/features/open-water/systems/boatController.ts";
import {
  blendPose,
  createHullMotion,
  hullTarget,
  landHull,
  resetHullMotion,
  samplePose,
  stepAlpha,
  stepHullMotion,
  TELEPORT_DISTANCE,
} from "../client/src/features/open-water/systems/hullMotion.ts";
import { VESSELS } from "../client/src/features/open-water/data/vessels.ts";
import { destinations, obstacles, ramps } from "../client/src/features/open-water/data/world.ts";
import { afterInteractive, vesselDetailPlan } from "../client/src/features/open-water/scene/vesselDetail.ts";

/** Open water south of the anchorage, far from every structure. */
const OPEN = { x: 0, z: 150 };
const atSea = (id: "superyacht" | "tender", heading = 0) => ({ ...createBoat(id), ...OPEN, heading });
/** Steps while pinning the hull to open water, so long runs measure kinematics, not islands. */
function cruise(boat: BoatState, input: Input, seconds: number, dt = BOAT_STEP) {
  for (let t = 0; t < seconds - 1e-9; t += dt) {
    const x = boat.x, z = boat.z;
    boat.x = OPEN.x; boat.z = OPEN.z;
    stepBoat(boat, input, dt);
    boat.x = x + (boat.x - OPEN.x); boat.z = z + (boat.z - OPEN.z);
  }
  return boat;
}

test("a long frame is split into fixed steps, so frame rate cannot change the voyage", () => {
  const once = atSea("superyacht"), twice = atSea("superyacht");
  stepBoat(once, { forward: true, right: true }, 2 * BOAT_STEP);
  stepBoat(twice, { forward: true, right: true }, BOAT_STEP);
  stepBoat(twice, { forward: true, right: true }, BOAT_STEP);
  assert.deepEqual(once, twice);
  const at60 = cruise(atSea("superyacht"), { forward: true, right: true }, 4);
  const at45 = cruise(atSea("superyacht"), { forward: true, right: true }, 4, 1 / 45);
  const at30 = cruise(atSea("superyacht"), { forward: true, right: true }, 4, 1 / 30);
  assert.ok(distance(at60, at30) < 1e-9, "30 fps is an exact pair of 60 Hz steps");
  const travelled = distance(at60, atSea("superyacht"));
  assert.ok(distance(at60, at45) < travelled * 0.005, `45 fps drifted ${distance(at60, at45)} of ${travelled}`);
  assert.ok(Math.abs(at60.heading - at45.heading) < 0.005);
});

test("the superyacht's engine spools up and eases off; the race tender stays instant", () => {
  const yacht = atSea("superyacht"), tender = atSea("tender");
  stepBoat(yacht, { forward: true }, BOAT_STEP);
  stepBoat(tender, { forward: true }, BOAT_STEP);
  assert.ok(yacht.speed / BOAT_STEP < 0.5, `yacht first-step acceleration ${yacht.speed / BOAT_STEP}`);
  assert.ok(Math.abs(tender.speed / BOAT_STEP - VESSELS.tender.acceleration) < 1e-9);
  assert.equal(tender.throttle, 1);
  // Bounded jerk through onset and release; the old step change was 288 units/s³.
  const boat = atSea("superyacht");
  let speed = 0, acceleration = 0, jerk = 0;
  for (let i = 0; i < 600; i++) {
    cruise(boat, { forward: i < 360 }, BOAT_STEP);
    const nextAcceleration = (boat.speed - speed) / BOAT_STEP;
    if (i) jerk = Math.max(jerk, Math.abs(nextAcceleration - acceleration) / BOAT_STEP);
    speed = boat.speed; acceleration = nextAcceleration;
  }
  assert.ok(jerk < 60, `peak jerk ${jerk}`);
  const full = cruise(atSea("superyacht"), { forward: true }, 8);
  assert.ok(full.speed > 12.5 && full.speed <= VESSELS.superyacht.maxSpeed, `8 s speed ${full.speed}`);
});

test("the yacht stops under reverse within a hull length and never creeps at rest", () => {
  const boat = cruise(atSea("superyacht"), { forward: true }, 20);
  const from = { x: boat.x, z: boat.z };
  let seconds = 0;
  while (boat.speed > 0.05 && seconds < 10) { cruise(boat, { backward: true }, BOAT_STEP); seconds += BOAT_STEP; }
  assert.ok(distance(boat, from) < VESSELS.superyacht.length, `stopping distance ${distance(boat, from)}`);
  const still = atSea("superyacht"), before = { ...still };
  cruise(still, {}, 10);
  assert.deepEqual(still, before);
});

test("astern steering blends through zero instead of flipping within one step", () => {
  const turnAt = (speed: number) => {
    const boat = { ...atSea("superyacht"), speed };
    stepBoat(boat, { right: true }, BOAT_STEP);
    return boat.turn;
  };
  assert.ok(Math.abs(turnAt(-0.49) - turnAt(-0.51)) < 0.001);
  assert.ok(turnAt(0) > 0 && turnAt(-2) < 0, "ahead and astern steer opposite ways");
  let previous = turnAt(0);
  for (let speed = -0.02; speed >= -2; speed -= 0.02) {
    const next = turnAt(speed);
    assert.ok(Math.abs(next - previous) < 0.0005, `turn jumps near speed ${speed}`);
    previous = next;
  }
});

test("autopilot arrival leaves the yacht's engine idle, so a moored hull stays put", () => {
  const yacht = createBoat("superyacht");
  steerTo(yacht, destinations[0].dock, destinations[0].id);
  for (let i = 0; i < 90 * 60 && yacht.target; i++) stepBoat(yacht, {}, BOAT_STEP);
  assert.equal(yacht.arrived, destinations[0].id);
  assert.equal(yacht.throttle, 0);
  const moored = { x: yacht.x, z: yacht.z };
  for (let i = 0; i < 300; i++) stepBoat(yacht, {}, BOAT_STEP);
  assert.equal(distance(yacht, moored), 0);
});

test("a glancing scrape keeps the yacht moving while a head-on contact stops it", () => {
  const retention = VESSELS.superyacht.impactRetention;
  // Heading 0 travels toward -z. A push of +z opposes it (head-on); a push along x is a scrape.
  assert.ok(Math.abs(contactSpeedRetention(0, 10, { x: 0, z: 1 }, retention) - 0.985 * retention) < 1e-12);
  assert.equal(contactSpeedRetention(0, 10, { x: 1, z: 0 }, retention), 0.985);
  assert.equal(contactSpeedRetention(0, 10, { x: 0, z: -1 }, retention), 0.985, "moving away is not an impact");
  assert.ok(Math.abs(contactSpeedRetention(0, -3, { x: 0, z: -1 }, retention) - 0.985 * retention) < 1e-12, "astern into stone");
  assert.equal(contactSpeedRetention(0, 10, { x: 0, z: 0 }, retention), 1);
  const island = obstacles.find((item) => item.id === "south-reef")!;
  const run = (heading: number, offset: number) => {
    const yacht = {
      ...createBoat("superyacht"), heading, speed: 10, throttle: 1,
      x: island.x + offset, z: island.z + island.r + 16,
    };
    let touched = false;
    for (let i = 0; i < 90; i++) {
      stepBoat(yacht, { forward: true }, BOAT_STEP);
      assert.ok(isBoatPoseSafe(yacht), "the hull never enters the reef");
      touched ||= distance(yacht, island) < island.r + 16;
    }
    return { speed: yacht.speed, touched };
  };
  const headOn = run(0, 0);
  const glancing = run(-Math.PI / 2 + 0.18, 6);
  assert.ok(headOn.speed < 2, `head-on speed ${headOn.speed}`);
  assert.ok(glancing.speed > headOn.speed * 2, `glancing ${glancing.speed} vs head-on ${headOn.speed}`);
});

test("drawn poses advance every frame at 120 and 144 Hz instead of repeating physics steps", () => {
  for (const hz of [75, 120, 144]) {
    const boat = { ...atSea("superyacht"), speed: 12, throttle: 1 };
    const previous = samplePose(boat), current = samplePose(boat), view = samplePose(boat);
    let accumulator = 0, last = 0;
    const steps: number[] = [];
    for (let frame = 0; frame < hz * 3; frame++) {
      accumulator += 1 / hz;
      while (accumulator >= BOAT_STEP - 1e-12) {
        samplePose(boat, previous);
        cruise(boat, { forward: true }, BOAT_STEP);
        samplePose(boat, current);
        accumulator -= BOAT_STEP;
      }
      blendPose(previous, current, stepAlpha(accumulator), view);
      if (frame > hz / 10) steps.push(Math.abs(view.z - last));
      last = view.z;
    }
    const mean = steps.reduce((sum, value) => sum + value, 0) / steps.length;
    const spread = Math.sqrt(steps.reduce((sum, value) => sum + (value - mean) ** 2, 0) / steps.length) / mean;
    assert.equal(steps.filter((value) => value < 1e-9).length, 0, `${hz} Hz repeated a pose`);
    assert.ok(spread < 0.05, `${hz} Hz frame-to-frame variation ${spread}`);
  }
});

test("blending takes the short way round, clamps, and snaps a placement", () => {
  const out = samplePose(createBoat());
  const a = { x: 0, z: 0, heading: Math.PI - 0.1, lift: 0, speed: 1 };
  const b = { x: 0.2, z: 0, heading: -Math.PI + 0.1, lift: 0, speed: 1 };
  blendPose(a, b, 0.5, out);
  assert.ok(Math.abs(Math.abs(out.heading) - Math.PI) < 1e-9, `heading ${out.heading}`);
  assert.equal(blendPose(a, b, 7, out).x, 0.2);
  assert.equal(blendPose(a, b, NaN, out).x, 0.2);
  const placed = { ...b, x: TELEPORT_DISTANCE + 1 };
  assert.equal(blendPose(a, placed, 0, out).x, placed.x);
  assert.equal(stepAlpha(BOAT_STEP / 2), 0.5);
  assert.equal(stepAlpha(Infinity), 1);
});

function rideSwell(id: "superyacht" | "tender", fps: number, seconds: number) {
  const boat = atSea(id, 0.4), profile = VESSELS[id], motion = createHullMotion();
  const frame = 1 / fps;
  let heave = { min: Infinity, max: -Infinity };
  for (let time = 14; time < 14 + seconds - 1e-9; time += frame) {
    stepHullMotion(motion, hullTarget(boat, time), profile, frame);
    if (time > 20) heave = { min: Math.min(heave.min, motion.heave), max: Math.max(heave.max, motion.heave) };
  }
  return { motion, swing: heave.max - heave.min };
}

test("hull buoyancy converges across refresh rates and stays bounded at the slowest frame", () => {
  const reference = rideSwell("superyacht", 144, 12).motion;
  for (const fps of [30, 60, 1 / 0.06]) {
    const motion = rideSwell("superyacht", fps, 12).motion;
    assert.ok(Math.abs(motion.heave - reference.heave) < 0.02, `${fps} fps heave ${motion.heave} vs ${reference.heave}`);
    assert.ok(Math.abs(motion.pitch - reference.pitch) < 0.004, `${fps} fps pitch`);
    assert.ok(Math.abs(motion.roll - reference.roll) < 0.004, `${fps} fps roll`);
  }
  const tender = rideSwell("tender", 1 / 0.1, 30).motion;
  for (const value of [tender.heave, tender.pitch, tender.roll]) assert.ok(Number.isFinite(value) && Math.abs(value) < 1);
});

test("the long hull bridges the swell instead of bobbing like a buoy", () => {
  let point = { min: Infinity, max: -Infinity };
  for (let time = 20; time < 44; time += 1 / 60) {
    const height = waveHeight(OPEN.x, OPEN.z, time);
    point = { min: Math.min(point.min, height), max: Math.max(point.max, height) };
  }
  const yacht = rideSwell("superyacht", 60, 30).swing, tender = rideSwell("tender", 60, 30).swing;
  assert.ok(yacht < (point.max - point.min) * 0.8, `yacht heave swing ${yacht} vs water ${point.max - point.min}`);
  assert.ok(yacht < tender, `yacht ${yacht} should move less than tender ${tender}`);
});

test("both ramp flights produce one touchdown impulse at 30, 60 and 144 Hz", () => {
  for (const ramp of ramps) for (const fps of [30, 60, 144]) {
    const boat = {
      ...createBoat("tender"),
      x: ramp.x - Math.sin(ramp.heading) * (ramp.length / 2 + 35),
      z: ramp.z + Math.cos(ramp.heading) * (ramp.length / 2 + 35),
      heading: ramp.heading,
    };
    const motion = createHullMotion();
    let accumulator = 0, wasAirborne = false, landings = 0, impulses = 0;
    for (let frame = 0; frame < fps * 9; frame++) {
      accumulator += 1 / fps;
      while (accumulator >= BOAT_STEP) {
        const flying = boat.airborne;
        stepBoat(boat, { forward: true }, BOAT_STEP);
        if (flying && !boat.airborne) landings++;
        accumulator -= BOAT_STEP;
      }
      const before = motion.heaveRate;
      landHull(motion, boat, wasAirborne);
      if (motion.heaveRate !== before) {
        impulses++;
        assert.ok(motion.heaveRate < before, "touchdown pushes the hull downward");
        assert.ok(boat.landingImpact > 0 && !boat.airborne && !boat.rampId);
      }
      wasAirborne = boat.airborne;
      if (boat.airborne || boat.rampId)
        resetHullMotion(motion, { heave: boat.lift, pitch: boat.rampPitch, roll: 0 });
      else stepHullMotion(motion, hullTarget(boat, frame / fps), VESSELS.tender, 1 / fps);
      assert.ok([motion.heave, motion.pitch, motion.roll].every(Number.isFinite));
    }
    assert.equal(landings, 1, `${ramp.id} at ${fps} Hz must actually land`);
    assert.equal(impulses, landings, `${ramp.id} at ${fps} Hz must settle exactly once`);
  }
});

test("trim, squat and heel lean the right way and respect each hull's limit", () => {
  const still = hullTarget(atSea("superyacht"), 14);
  const accelerating = hullTarget({ ...atSea("superyacht"), speed: 10 }, 14, 4);
  assert.ok(accelerating.pitch > still.pitch, "bow rises under power");
  const braking = hullTarget({ ...atSea("superyacht"), speed: 10 }, 14, -4);
  assert.ok(braking.pitch < accelerating.pitch, "bow settles when easing off");
  const turning = hullTarget({ ...atSea("superyacht"), speed: 14, turn: 0.6 }, 14);
  const level = hullTarget({ ...atSea("superyacht"), speed: 14, turn: 0 }, 14);
  assert.ok(turning.roll < level.roll, "a starboard turn banks to starboard");
  const extreme = hullTarget({ ...atSea("superyacht"), speed: 1e6, turn: 1e6 }, 14);
  assert.ok(level.roll - extreme.roll <= VESSELS.superyacht.maxHeel + 1e-12);
  const motion = resetHullMotion(createHullMotion(), level);
  assert.deepEqual([motion.heave, motion.pitch, motion.roll], [level.heave, level.pitch, level.roll]);
  stepHullMotion(motion, { heave: NaN, pitch: 0, roll: 0 }, VESSELS.superyacht, 1 / 60);
  assert.ok([motion.heave, motion.pitch, motion.roll].every(Number.isFinite));
});

test("the light vessel loads first and the detailed model waits for the helm to settle", async () => {
  assert.deepEqual(vesselDetailPlan("high"), ["low", "high"]);
  assert.deepEqual(vesselDetailPlan("low"), ["low"]);
  assert.deepEqual(vesselDetailPlan("high", true), ["low"], "Save-Data keeps the light model");
  const started = performance.now();
  await afterInteractive(new AbortController().signal, 20, 50);
  assert.ok(performance.now() - started >= 15);
  const controller = new AbortController();
  const waiting = afterInteractive(controller.signal, 10_000);
  controller.abort();
  await assert.rejects(waiting, { name: "AbortError" });
  await assert.rejects(afterInteractive(controller.signal), { name: "AbortError" });
});
