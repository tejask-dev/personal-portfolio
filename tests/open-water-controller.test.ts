import assert from "node:assert/strict";
import test from "node:test";
import {
  destinations,
  obstacles,
  HOME,
  ramps,
  WORLD_RADIUS,
} from "../client/src/features/open-water/data/world.ts";
import {
  createBoat,
  HULL_RADIUS,
  distance,
  routeTo,
  steerTo,
  stepBoat,
  waveHeight,
} from "../client/src/features/open-water/systems/boatController.ts";
import type {
  BoatState,
  Input,
} from "../client/src/features/open-water/systems/boatController.ts";

function advance(boat: BoatState, seconds: number, input: Input = {}) {
  for (let tick = 0; tick < seconds * 60; tick++) stepBoat(boat, input, 1 / 60);
}

function assertFinite(boat: BoatState) {
  for (const value of [boat.x, boat.z, boat.heading, boat.speed, boat.turn])
    assert.ok(Number.isFinite(value));
}

test("independent boats begin at anchor without motion", () => {
  const boat = createBoat();
  const before = { ...boat };
  advance(boat, 10);
  assert.deepEqual(boat, before);
  assert.notEqual(boat.route, createBoat().route);
});

test("forward motion accelerates gradually, coasts, and settles", () => {
  const boat = createBoat();
  stepBoat(boat, { forward: true }, 1 / 60);
  assert.ok(boat.speed > 0 && boat.speed <= 0.25);
  advance(boat, 3, { forward: true });
  const poweredSpeed = boat.speed;
  const releasedAt = { x: boat.x, z: boat.z };
  advance(boat, 0.5);
  assert.ok(boat.speed > 0 && boat.speed < poweredSpeed);
  assert.ok(distance(boat, releasedAt) > 0);
  advance(boat, 15);
  assert.ok(boat.speed < 0.001);
});

test("steering curves underway and reverses its turn direction while reversing", () => {
  const forward = createBoat();
  const reverse = createBoat();
  forward.speed = 4;
  reverse.speed = -4;
  advance(forward, 0.5, { forward: true, right: true });
  advance(reverse, 0.5, { backward: true, right: true });
  assert.ok(forward.heading > HOME.heading);
  assert.ok(reverse.heading < HOME.heading);
  assert.ok(reverse.speed >= -5);
});

test("each manual input immediately takes over an autopilot course", () => {
  for (const key of ["forward", "backward", "left", "right"] as const) {
    const boat = createBoat();
    steerTo(boat, destinations[0].dock, destinations[0].id);
    stepBoat(boat, { [key]: true }, 1 / 60);
    assert.equal(boat.target, null);
    assert.deepEqual(boat.route, []);
    assert.equal(boat.arrived, null);
  }
});

test("all destination pairs arrive outside structures, across four initial headings", () => {
  const sources = [{ id: "home", dock: createBoat() }, ...destinations];
  for (const from of sources)
    for (const to of destinations)
      for (const heading of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
        const boat = { ...createBoat(), ...from.dock, heading };
        steerTo(boat, to.dock, to.id);
        let ticks = 0;
        while (boat.target && ticks++ < 60 * 35) {
          stepBoat(boat, {}, 1 / 60);
          assertFinite(boat);
          for (const obstacle of obstacles)
            assert.ok(
              distance(boat, obstacle) >= obstacle.r + HULL_RADIUS - 1e-8,
              `${from.id} -> ${to.id} entered ${obstacle.id}`,
            );
        }
        assert.equal(
          boat.arrived,
          to.id,
          `${from.id} -> ${to.id} at heading ${heading} failed after 35 s`,
        );
        assert.ok(distance(boat, to.dock) < 2.8);
        assert.equal(boat.speed, 0);
        const moored = { x: boat.x, z: boat.z };
        advance(boat, 5);
        assert.equal(distance(boat, moored), 0);
      }
});

test("routing detours around an obstacle instead of repeatedly selecting it", () => {
  const station = destinations[0];
  const route = routeTo(
    { x: station.x - 35, z: station.z },
    { x: station.x + 35, z: station.z },
  );
  assert.ok(route.length > 1 && route.length < 10);
  assert.ok(route.some((point) => Math.abs(point.z - station.z) > station.r));
});

test("exact obstacle overlap resolves to finite safe coordinates", () => {
  for (const station of obstacles) {
    const boat = { ...createBoat(), x: station.x, z: station.z };
    stepBoat(boat, {}, 1 / 60);
    assertFinite(boat);
    assert.ok(distance(boat, station) >= station.r + 3 - 1e-8);
  }
});

test("autopilot recovers from an exact overlap and can leave for another destination", () => {
  for (const station of obstacles) {
    const boat = { ...createBoat(), x: station.x, z: station.z };
    const target = destinations.find(
      (candidate) => candidate.id !== station.id,
    )!;
    steerTo(boat, target.dock, target.id);
    advance(boat, 65);
    assertFinite(boat);
    assert.equal(boat.arrived, target.id);
  }
});

test("moving approaches from varied positions and headings retain a reachable course", () => {
  let seed = 77231;
  const random = () =>
    (seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296;
  for (let sample = 0; sample < 120; sample++) {
    const boat = createBoat();
    boat.x = (random() - 0.5) * 240;
    boat.z = (random() - 0.5) * 240;
    boat.heading = (random() - 0.5) * Math.PI * 2;
    boat.speed = random() * 18;
    stepBoat(boat, {}, 1 / 60);
    const target = destinations[sample % destinations.length];
    steerTo(boat, target.dock, target.id);
    advance(boat, 60);
    assertFinite(boat);
    assert.equal(
      boat.arrived,
      target.id,
      `moving approach ${sample} did not arrive`,
    );
  }
});

test("out of bounds movement cancels navigation and stays inside the world", () => {
  const boat = createBoat();
  boat.x = WORLD_RADIUS + 20;
  steerTo(boat, destinations[0].dock, "anticipy");
  stepBoat(boat, {}, 1 / 60);
  assert.ok(Math.hypot(boat.x, boat.z) <= WORLD_RADIUS + 1e-8);
  assert.equal(boat.target, null);
  assert.equal(boat.route.length, 0);
});

test("a click inside a structure becomes a reachable safe course", () => {
  for (const station of destinations) {
    const boat = createBoat();
    steerTo(boat, station, station.id);
    assert.ok(boat.target);
    assert.ok(distance(boat.target, station) >= station.r + 8 - 1e-8);
    advance(boat, 60);
    assert.equal(boat.arrived, station.id);
  }
});

test("large, negative, and invalid deltas cannot cause a simulation jump", () => {
  const large = createBoat();
  const bounded = createBoat();
  stepBoat(large, { forward: true }, 500);
  stepBoat(bounded, { forward: true }, 1 / 30);
  assert.deepEqual(large, bounded);
  for (const delta of [-1, NaN, Infinity, 0])
    stepBoat(large, { forward: true }, delta);
  assert.deepEqual(large, bounded);
});

test("wave samples are deterministic, finite, bounded, and continuous", () => {
  for (const time of [0, 1, 20, 10000])
    for (const x of [-180, 0, 180]) {
      const height = waveHeight(x, 25, time);
      assert.ok(Number.isFinite(height));
      assert.ok(Math.abs(height) <= 0.385 + 1e-8);
      assert.equal(height, waveHeight(x, 25, time));
      assert.ok(Math.abs(height - waveHeight(x + 0.001, 25, time)) < 0.001);
    }
});

test("both ramps produce an uphill climb, bounded ballistic flight, and a landing beyond the lip", () => {
  for (const ramp of ramps) {
    const boat = {
      ...createBoat(),
      x: ramp.x - Math.sin(ramp.heading) * (ramp.length / 2 + 35),
      z: ramp.z + Math.cos(ramp.heading) * (ramp.length / 2 + 35),
      heading: ramp.heading,
    };
    let climbed = false,
      flew = false,
      landed = false,
      maximum = 0,
      launchSpeed = 0;
    for (let tick = 0; tick < 9 * 60; tick++) {
      const wasAirborne = boat.airborne;
      const oldLift = boat.lift;
      stepBoat(boat, { forward: true }, 1 / 60);
      assertFinite(boat);
      assert.ok(
        Number.isFinite(boat.lift) && Number.isFinite(boat.verticalSpeed),
      );
      if (boat.rampId === ramp.id && boat.lift > 0.4) {
        climbed = true;
        assert.ok(boat.rampPitch > 0);
        assert.ok(boat.lift >= oldLift - 0.001);
      }
      if (!wasAirborne && boat.airborne) launchSpeed = boat.verticalSpeed;
      if (boat.airborne) {
        flew = true;
        maximum = Math.max(maximum, boat.lift);
      }
      if (wasAirborne && !boat.airborne) {
        landed = true;
        assert.equal(boat.lift, 0);
        assert.equal(boat.verticalSpeed, 0);
        assert.ok(boat.landingImpact > 0);
        const forwardDistance =
          (boat.x - ramp.x) * Math.sin(ramp.heading) -
          (boat.z - ramp.z) * Math.cos(ramp.heading);
        assert.ok(forwardDistance > ramp.length / 2 + 12);
        break;
      }
    }
    assert.ok(
      climbed && flew && landed,
      `${ramp.id} did not complete a natural jump`,
    );
    assert.ok(maximum > ramp.height + 1 && maximum < 12);
    assert.ok(launchSpeed > 4 && launchSpeed <= 8.5);
    assert.equal(boat.jumpCount, 1);
  }
});

test("a ramp cannot launch a boat approaching its raised back or its side", () => {
  for (const ramp of ramps) {
    for (const approach of ["back", "side"]) {
      const forward = { x: Math.sin(ramp.heading), z: -Math.cos(ramp.heading) };
      const right = { x: Math.cos(ramp.heading), z: Math.sin(ramp.heading) };
      const point =
        approach === "back"
          ? {
              x: ramp.x + forward.x * (ramp.length / 2 + 15),
              z: ramp.z + forward.z * (ramp.length / 2 + 15),
            }
          : {
              x: ramp.x - right.x * (ramp.width / 2 + 15),
              z: ramp.z - right.z * (ramp.width / 2 + 15),
            };
      const boat = {
        ...createBoat(),
        ...point,
        heading: ramp.heading + (approach === "back" ? Math.PI : Math.PI / 2),
        speed: 18,
      };
      advance(boat, 4, { forward: true });
      assert.equal(boat.jumpCount, 0);
      assert.equal(boat.airborne, false);
      assert.equal(boat.lift, 0);
    }
  }
});

test("ramp side impacts stay on the entry side without jumping or teleporting toward the lip", () => {
  for (const ramp of ramps) {
    const forward = { x: Math.sin(ramp.heading), z: -Math.cos(ramp.heading) };
    const right = { x: Math.cos(ramp.heading), z: Math.sin(ramp.heading) };
    for (const along of [0.1, 3, 5, 9]) {
      for (const side of [-1, 1]) {
        const across = side * (ramp.width / 2 + 0.05);
        const boat = {
          ...createBoat(),
          x: ramp.x + forward.x * along + right.x * across,
          z: ramp.z + forward.z * along + right.z * across,
          heading: ramp.heading - (side * Math.PI) / 2,
          speed: 18,
        };
        for (let tick = 0; tick < 90; tick++) {
          const previous = { x: boat.x, z: boat.z };
          stepBoat(boat, { forward: true }, 1 / 60);
          const nextAlong =
            (boat.x - ramp.x) * forward.x + (boat.z - ramp.z) * forward.z;
          const nextAcross =
            (boat.x - ramp.x) * right.x + (boat.z - ramp.z) * right.z;
          const context = `${ramp.id}, along ${along}, side ${side}, tick ${tick}`;
          assert.ok(
            distance(boat, previous) <= 28 / 60 + 0.6 + 1e-8,
            `${context}: unbounded impact displacement`,
          );
          assert.ok(
            Math.abs(nextAlong - along) < 1e-8,
            `${context}: impact changed position along the ramp`,
          );
          assert.ok(
            nextAcross * side >= ramp.width / 2,
            `${context}: crossed the side wall`,
          );
          assert.equal(boat.rampId, null, context);
          assert.equal(boat.airborne, false, context);
          assert.equal(boat.jumpCount, 0, context);
          assert.equal(boat.lift, 0, context);
        }
      }
    }
  }
});

test("an uphill-facing side approach beside the low edge cannot board a ramp", () => {
  for (const ramp of ramps) {
    const forward = { x: Math.sin(ramp.heading), z: -Math.cos(ramp.heading) };
    const right = { x: Math.cos(ramp.heading), z: Math.sin(ramp.heading) };
    for (const side of [-1, 1]) {
      const along = -ramp.length / 2 + 0.1;
      const across = side * (ramp.width / 2 + 0.01);
      const boat = {
        ...createBoat(),
        x: ramp.x + forward.x * along + right.x * across,
        z: ramp.z + forward.z * along + right.z * across,
        heading: ramp.heading - side * 0.6,
        speed: 18,
      };
      stepBoat(boat, { forward: true }, 1 / 60);
      const nextAcross =
        (boat.x - ramp.x) * right.x + (boat.z - ramp.z) * right.z;
      assert.ok(nextAcross * side >= ramp.width / 2);
      assert.equal(boat.rampId, null);
      assert.equal(boat.lift, 0);
      assert.equal(boat.airborne, false);
    }
  }
});

test("airborne height follows gravity while thrust cannot create a second jump", () => {
  const boat = {
    ...createBoat(),
    x: 0,
    z: 170,
    lift: 4,
    verticalSpeed: 3,
    airborne: true,
    speed: 20,
  };
  const initial = { ...boat };
  advance(boat, 0.5, { forward: true, right: true });
  assert.ok(boat.lift > 4 && boat.lift < 4.5);
  assert.ok(boat.verticalSpeed < 0);
  assert.ok(boat.speed < initial.speed);
  assert.ok(Math.abs(boat.heading - initial.heading) < 0.15);
  advance(boat, 2, { forward: true });
  assert.equal(boat.airborne, false);
  assert.equal(boat.lift, 0);
  assert.equal(boat.jumpCount, 0);
});
