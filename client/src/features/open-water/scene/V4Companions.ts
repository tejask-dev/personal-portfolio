import { Box3, Group, Vector3 } from "three";
import { getRegion, isRegionPoseSafe, regionClearance, type RegionId, type RegionNavigation } from "../data/regions";
import { createReef, moveReef, resolveReefPose, safeReefSegment, type ReefPose, type ReefState } from "../systems/reefController";
import type { SeaEnvironment } from "./materials";
import { disposeCreature } from "./CharacterAsset";
import { createCompanionModel } from "./V4Assets";

export type CompanionName = "nemo" | "dory";
export type CompanionFrame = {
  region: RegionId;
  actor: "diver" | CompanionName;
  /** Local coordinates of the controlled diver or fish within this habitat. */
  pose: ReefPose;
  time: number;
  delta: number;
  quiet: boolean;
};
type Resident = { name: CompanionName; model: Group; pose: ReefState; initialized: boolean; lastPlayerPose: ReefPose | null };
const wrap = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));
const separation = (a: ReefPose, b: ReefPose) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

/** Pick a clear social distance. A resident never needs to cross a wall to reach
 * this point: its actual movement below still uses the swept fish controller. */
function followPose(player: ReefPose, name: CompanionName, region: RegionId, previous: ReefPose): ReefPose {
  const side = name === "nemo" ? -1 : 1;
  const forward = { x: Math.sin(player.heading), z: -Math.cos(player.heading) };
  const right = { x: Math.cos(player.heading), z: Math.sin(player.heading) };
  const context: RegionNavigation = { regionId: region, actor: "fish" };
  for (const [behind, across, rise] of [[1.8, 2.2 * side, 0.35], [2.5, 0.9 * side, 0.1], [1.2, 0, 0.5], [0, 0.8 * side, 0]] as const) {
    const desired = {
      x: player.x - forward.x * behind + right.x * across,
      y: player.y + rise,
      z: player.z - forward.z * behind + right.z * across,
      heading: player.heading,
    };
    if (isRegionPoseSafe(desired, context)) return desired;
  }
  return resolveReefPose(previous, getRegion(region).spawn, context).pose;
}

/** One model per named animal for the whole scene lifetime. Player control is a
 * pose authority switch on that same object, not a second avatar allocation. */
export function createV4Companions(environment: SeaEnvironment, quality: "low" | "high") {
  const group = new Group();
  group.name = "open-water-companions";
  const residents: Resident[] = (["nemo", "dory"] as const).map(name => {
    const asset = createCompanionModel(environment, name, quality);
    const model = new Group();
    const fitted = new Group();
    fitted.add(asset);
    model.add(fitted);
    // Rendering and collision share one physical envelope. Sample the authored
    // tail/fin animation as well as the neutral mesh before fitting it, so an
    // expressive fin cannot visually pass through a fish-only cave passage.
    const bounds = new Box3();
    const animate = asset.userData.animate;
    for (let sample = 0; sample < 96; sample++) {
      if (typeof animate === "function") animate(sample / 24, 1, sample < 32 ? -1 : sample < 64 ? 1 : 0);
      asset.updateMatrixWorld(true);
      bounds.union(new Box3().setFromObject(asset));
    }
    if (typeof animate === "function") animate(0, 0);
    const size = bounds.getSize(new Vector3());
    const center = bounds.getCenter(new Vector3());
    const clearance = regionClearance("fish");
    const fitScale = Math.min(clearance.horizontal * 0.9 / Math.max(0.001, Math.hypot(size.x, size.z) / 2), clearance.vertical * 0.9 / Math.max(0.001, size.y / 2));
    fitted.scale.setScalar(fitScale);
    fitted.position.copy(center).multiplyScalar(-fitScale);
    model.userData.animate = animate;
    model.userData.collisionEnvelope = { horizontal: clearance.horizontal, vertical: clearance.vertical };
    model.name = `companion-${name}`;
    model.userData.companion = name;
    // Picking a mesh and picking its parent identify the same individual.
    model.traverse(child => { child.userData.companion = name; });
    group.add(model);
    return { name, model, pose: createReef({ regionId: "crown", actor: "fish" }), initialized: false, lastPlayerPose: null };
  });
  let previousRegion: RegionId | null = null;
  let previousActor: CompanionFrame["actor"] = "diver";
  let disposed = false;
  group.userData.companionCount = 2;

  return {
    group,
    update(frame: CompanionFrame) {
      if (disposed) return;
      const habitat = getRegion(frame.region);
      const changedRegion = previousRegion !== frame.region;
      group.position.set(habitat.worldOrigin.x, 0, habitat.worldOrigin.z);
      const context: RegionNavigation = { regionId: frame.region, actor: "fish" };
      const elapsed = Number.isFinite(frame.delta) ? Math.max(0, frame.delta) : 0;
      const step = Math.min(1 / 30, elapsed);
      const time = Number.isFinite(frame.time) ? frame.time : 0;
      for (const resident of residents) {
        const controlled = frame.actor === resident.name;
        const playerMoved = !resident.lastPlayerPose || separation(frame.pose, resident.lastPlayerPose) > 0.015 || Math.abs(wrap(frame.pose.heading - resident.lastPlayerPose.heading)) > 0.01;
        if (changedRegion || !resident.initialized) {
          const start = isRegionPoseSafe(frame.pose, context) ? frame.pose : habitat.spawn;
          Object.assign(resident.pose, createReef(context), followPose(start, resident.name, frame.region, start));
          resident.initialized = true;
        }
        const before = { ...resident.pose };
        if (controlled) {
          // The shared navigation controller already resolved this player's pose.
          // Reject malformed snapshots rather than displaying an animal in stone.
          if (isRegionPoseSafe(frame.pose, context)) Object.assign(resident.pose, frame.pose);
        } else {
          const desired = followPose(frame.pose, resident.name, frame.region, resident.pose);
          const distance = separation(resident.pose, desired);
          if (frame.quiet) {
            // A still viewpoint may move the whole composition once. Refrain from
            // silently placing a resident across an enclosed chamber wall.
            if ((playerMoved || previousActor !== frame.actor) && safeReefSegment(resident.pose, desired, false, context))
              Object.assign(resident.pose, desired);
          } else if (step > 0 && distance > 0.22) {
            const speed = Math.min(resident.name === "nemo" ? 3.9 : 4.3, 0.8 + distance * 1.15);
            const t = Math.min(1, speed * step / distance);
            const next = {
              x: resident.pose.x + (desired.x - resident.pose.x) * t,
              y: resident.pose.y + (desired.y - resident.pose.y) * t,
              z: resident.pose.z + (desired.z - resident.pose.z) * t,
              heading: resident.pose.heading,
            };
            const heading = Math.atan2(desired.x - resident.pose.x, -(desired.z - resident.pose.z));
            next.heading += wrap(heading - next.heading) * (1 - Math.exp(-step * 5));
            moveReef(resident.pose, next, context);
          }
        }
        resident.pose.target = null;
        resident.pose.current = false;
        resident.model.visible = isRegionPoseSafe(resident.pose, context);
        resident.model.userData.controlled = controlled;
        resident.model.position.set(resident.pose.x, resident.pose.y, resident.pose.z);
        // The controller's rightward heading increases clockwise; Three's
        // rotation around +Y turns a model authored along -Z the other way.
        resident.model.rotation.y = -resident.pose.heading;
        const animate = resident.model.userData.animate;
        // Effort comes from velocity, not a per-frame displacement threshold.
        // At 120/144Hz a genuinely moving fish must not fall back to its idle beat.
        // Controlled poses cover the actual frame interval. Followers cover only
        // their bounded integration step; using one denominator exaggerates the
        // player's stroke whenever rendering falls below 30Hz.
        const movementTime = controlled ? elapsed : step;
        const speed = movementTime > 0 && !changedRegion ? separation(resident.pose, before) / movementTime : 0;
        const turnRate = movementTime > 0 && !changedRegion ? wrap(resident.pose.heading - before.heading) / movementTime : 0;
        const effort = Math.min(1, speed / 3.6 + Math.abs(turnRate) * 0.12);
        if (typeof animate === "function") animate(frame.quiet ? 0 : time + (resident.name === "dory" ? 0.85 : 0), effort, Math.max(-1, Math.min(1, turnRate / 1.8)));
        resident.lastPlayerPose = { ...frame.pose };
      }
      previousRegion = frame.region;
      previousActor = frame.actor;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      disposeCreature(group);
      group.removeFromParent();
      group.clear();
    },
  };
}
