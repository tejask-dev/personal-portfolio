import assert from "node:assert/strict";
import test from "node:test";
import { createBoat } from "../client/src/features/open-water/systems/boatController.ts";
import { expeditionReducer as reduce, initialExpedition, type Expedition } from "../client/src/features/open-water/systems/expeditionController.ts";

test("graphics failure preserves each challenge's HTML control ownership", () => {
  for (const activity of ["fishing", "docking", "fish-course"] as const) {
    const playing: Expedition = {
      ...initialExpedition(),
      mode: activity === "fish-course" ? "reef" : "surface",
      actor: activity === "fish-course" ? "dory" : "diver",
      activity,
      sailing: true,
      transitionId: 4,
      returnBoat: activity === "fish-course" ? createBoat("tender") : null,
    };
    const failed = reduce(playing, { type: "FAIL" });
    assert.equal(failed.activity, activity, "The existing game must remain reachable in the fallback controls");
    assert.equal(failed.userPaused, true);
    assert.equal(failed.mode, playing.mode);
    assert.equal(failed.actor, playing.actor);
    assert.equal(failed.transitionId, playing.transitionId);
    assert.deepEqual(failed.returnBoat, playing.returnBoat);
    const quiet = reduce(failed, { type: "QUIET", value: true });
    assert.equal(quiet.activity, activity);
    assert.equal(quiet.userPaused, true);
    assert.equal(reduce(quiet, { type: "PANEL", panel: "work" }).activity, activity);
  }
});

test("graphics failure during travel can complete the same destination in reading view", () => {
  const entering = reduce(initialExpedition(), { type: "REGION", region: "lantern", boat: createBoat("superyacht"), racing: false });
  const failed = reduce(entering, { type: "FAIL" });
  assert.equal(failed.mode, "entering");
  assert.equal(failed.transitionId, entering.transitionId);
  const reading = reduce(failed, { type: "REEF_READY", id: entering.transitionId });
  assert.equal(reading.mode, "reef");
  assert.equal(reading.region, "lantern");
  assert.equal(reading.userPaused, true);
  assert.deepEqual(reading.returnBoat, entering.returnBoat);
  const returned = reduce(reading, { type: "RETURN" });
  assert.equal(reduce(returned, { type: "REEF_READY", id: entering.transitionId }), returned);
});
