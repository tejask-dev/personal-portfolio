import {
  BoxGeometry, BufferGeometry, Color, ConeGeometry, CylinderGeometry, DoubleSide,
  Float32BufferAttribute, Group, InstancedMesh, Line, LineBasicMaterial,
  Mesh, MeshStandardMaterial, Object3D, SphereGeometry, TorusGeometry, Vector3,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { getRegion, portalsFrom, regionPortals, type RegionId } from "../data/regions";
import { vesselProfile } from "../data/vessels";
import { waveHeight, type BoatState } from "../systems/boatController";
import type { ReefState } from "../systems/reefController";
import type { ControlledActor, Expedition } from "../systems/expeditionController";
import { DOCKING_BERTH, FISH_COURSE_GATES, FISHING_CATCHES } from "../systems/gameController";
import type { V4Games } from "../systems/v4Games";
import { applySeaMedium, type SeaEnvironment } from "./materials";

export type V4ActivityFrame = {
  boat: BoatState;
  reef: ReefState;
  region: RegionId;
  actor: ControlledActor;
  mode: Expedition["mode"];
  activity: Expedition["activity"];
  games: V4Games;
  time: number;
  quiet: boolean;
};

/** Scene-owned presentation only: no timer, physics, score, input, or teleport.
 * At most six surface draws / four underwater draws; geometry is shared and
 * active habitat coordinates come from the navigation authority. */
export function createV4ActivityObjects(environment: SeaEnvironment, quality: "low" | "high") {
  const low = quality === "low", group = new Group();
  group.name = "v4-activity-objects";
  const geometries = new Set<BufferGeometry>();
  const materials = new Set<MeshStandardMaterial | LineBasicMaterial>();
  const instances: InstancedMesh[] = [];
  const own = <T extends BufferGeometry>(geometry: T): T => { geometries.add(geometry); return geometry; };
  const material = (color: string, emission = 0, vertexColors = false) => {
    const result = applySeaMedium(new MeshStandardMaterial({ color, emissive: color, emissiveIntensity: emission, roughness: .62, metalness: .12, vertexColors }), environment);
    materials.add(result); return result;
  };
  function tint(geometry: BufferGeometry, color: string) {
    const value = new Color(color), count = geometry.getAttribute("position").count;
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) { colors[i * 3] = value.r; colors[i * 3 + 1] = value.g; colors[i * 3 + 2] = value.b; }
    geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
    return geometry;
  }
  function merged(parts: BufferGeometry[]) {
    const result = mergeGeometries(parts, false);
    parts.forEach(part => part.dispose());
    if (!result) throw new Error("Activity geometry could not be combined");
    return own(result);
  }
  const align = new Object3D(), start = new Vector3(), end = new Vector3(), up = new Vector3(0, 1, 0);
  function bar(a: [number, number, number], b: [number, number, number], radius: number, color: string, taper = 1) {
    start.set(...a); end.set(...b);
    const direction = end.clone().sub(start);
    const geometry = new CylinderGeometry(radius * taper, radius, direction.length(), low ? 6 : 9, 1);
    align.position.copy(start).add(end).multiplyScalar(.5);
    align.quaternion.setFromUnitVectors(up, direction.normalize()); align.scale.set(1, 1, 1); align.updateMatrix();
    return tint(geometry.applyMatrix4(align.matrix), color);
  }
  function placedBox(x: number, y: number, z: number, width: number, height: number, depth: number, color: string) {
    return tint(new BoxGeometry(width, height, depth).translate(x, y, z), color);
  }
  const white = material("#ffffff", .02, true);

  // Berth markers outline the navigable water; no render-only solid dock is
  // placed inside the controller's accepted hull envelope.
  const dock = new Group(); dock.name = "superyacht-berth-marker";
  dock.position.set(DOCKING_BERTH.x, .16, DOCKING_BERTH.z); dock.rotation.y = -DOCKING_BERTH.heading;
  const berthParts: BufferGeometry[] = [];
  const halfWidth = DOCKING_BERTH.halfWidth, halfLength = DOCKING_BERTH.halfLength;
  for (const x of [-halfWidth - .5, halfWidth + .5]) for (const z of [-halfLength - .5, halfLength + .5]) {
    berthParts.push(tint(new CylinderGeometry(.25, .35, 1.5, 6, 1).translate(x, .35, z), "#e5e6cc"));
    berthParts.push(tint(new CylinderGeometry(.27, .27, .22, 6, 1).translate(x, .96, z), "#2d7878"));
  }
  for (const x of [-halfWidth, halfWidth]) for (let z = -halfLength + 1; z < halfLength; z += 3) berthParts.push(placedBox(x, 0, z, .09, .055, 1.5, "#b4d6b3"));
  for (const z of [-halfLength, halfLength]) for (let x = -halfWidth + 1; x < halfWidth; x += 2) berthParts.push(placedBox(x, 0, z, 1, .055, .09, "#b4d6b3"));
  dock.add(new Mesh(merged(berthParts), white));
  const dockArrowGeometry = new ConeGeometry(.6, 2.3, 3, 1); dockArrowGeometry.rotateX(-Math.PI / 2); dockArrowGeometry.translate(0, .1, -halfLength + 4);
  const dockGlow = material("#d1e4b4", .65);
  const dockArrow = new Mesh(own(dockArrowGeometry), dockGlow); dockArrow.name = "berth-bow-direction"; dock.add(dockArrow); group.add(dock);

  // One authored rod with grip, reel, taper and line guides. Root is attached
  // beside the stern of the active vessel, never to a swimming companion.
  const fishing = new Group(); fishing.name = "catch-and-release-rig"; fishing.visible = false;
  const rod = new Group(); rod.name = "fishing-rod";
  const rodPoints: [number, number, number][] = [[0, 0, 0], [.8, 1.4, -.15], [1.7, 2.5, -.35], [2.65, 3.12, -.65]];
  const rodParts: BufferGeometry[] = [bar([0, -.3, .03], [.35, .61, -.065], .12, "#a28c62")];
  for (let i = 0; i < rodPoints.length - 1; i++) rodParts.push(bar(rodPoints[i], rodPoints[i + 1], .047 - i * .011, "#30494c", .7));
  for (let i = 1; i <= 5; i++) {
    const t = i / 5, guide = new TorusGeometry(.07 - t * .025, .012, 4, 8);
    guide.rotateY(Math.PI / 2); guide.translate(2.65 * t, 3.12 * t + .05, -.65 * t);
    rodParts.push(tint(guide, "#d3dfdf"));
  }
  const reel = new CylinderGeometry(.21, .21, .28, 9); reel.rotateZ(Math.PI / 2); reel.translate(.3, .5, .1); rodParts.push(tint(reel, "#bac9c3"));
  rodParts.push(bar([.18, .5, .1], [.03, .36, .3], .027, "#475e5c"));
  rod.add(new Mesh(merged(rodParts), white)); fishing.add(rod);
  const lineGeometry = own(new BufferGeometry());
  const lineAttribute = new Float32BufferAttribute(new Float32Array(16 * 3), 3);
  const linePositions = lineAttribute.array;
  lineGeometry.setAttribute("position", lineAttribute);
  const lineMaterial = applySeaMedium(new LineBasicMaterial({ color: "#d9e5ce", transparent: false }), environment); materials.add(lineMaterial);
  const line = new Line(lineGeometry, lineMaterial); line.name = "cast-line"; line.frustumCulled = false; fishing.add(line);
  const floatParts = [tint(new SphereGeometry(.18, 8, 5), "#e2a065"), bar([0, -.18, 0], [0, .5, 0], .028, "#edf0d1")];
  const float = new Mesh(merged(floatParts), white); float.name = "fishing-float"; fishing.add(float);

  const catchBody = tint(new SphereGeometry(1, low ? 8 : 12, low ? 5 : 8).scale(.58, .23, .19), "#a7c6bf");
  const tail = new BufferGeometry();
  tail.setAttribute("position", new Float32BufferAttribute([-.48,0,0,-.89,.26,.02,-.89,-.26,.02,-.48,0,0,-.89,-.26,-.02,-.89,.26,-.02, -.05,.13,0,-.25,.38,0,-.37,.13,0, .03,-.12,0,-.2,-.34,.02,-.26,-.12,0], 3));
  tail.setAttribute("uv", new Float32BufferAttribute(new Float32Array(24), 2));
  tail.computeVertexNormals();
  // Expand the indexed body so its attributes can be merged with the fins.
  const body = catchBody.toNonIndexed(); catchBody.dispose();
  const catchMaterial = material("#98c2ba", .04, true); catchMaterial.side = DoubleSide;
  const caughtFish = new Mesh(merged([body, tint(tail, "#71999b")]), catchMaterial);
  caughtFish.name = "generic-catch-not-a-companion"; fishing.add(caughtFish); group.add(fishing);

  // Six rings share one mesh. Their planes use the exact scoring normals; the
  // small arrows below each ring indicate the accepted crossing direction.
  const crownOrigin = getRegion("crown").worldOrigin;
  const ringMaterial = material("#ffffff", .55);
  const rings = new InstancedMesh(own(new TorusGeometry(FISH_COURSE_GATES[0].radius, .07, low ? 4 : 6, low ? 28 : 42)), ringMaterial, FISH_COURSE_GATES.length);
  rings.name = "shoal-run-directional-rings"; instances.push(rings); group.add(rings);
  const arrowGeometry = new ConeGeometry(.17, .55, low ? 5 : 7); arrowGeometry.rotateX(Math.PI / 2); arrowGeometry.translate(0, -FISH_COURSE_GATES[0].radius - .3, 0);
  const arrows = new InstancedMesh(own(arrowGeometry), ringMaterial, FISH_COURSE_GATES.length); arrows.name = "shoal-run-crossing-directions"; instances.push(arrows); group.add(arrows);
  const marker = new Object3D(), normal = new Vector3(), forward = new Vector3(0, 0, 1);
  FISH_COURSE_GATES.forEach((gate, index) => {
    marker.position.set(crownOrigin.x + gate.x, gate.y, crownOrigin.z + gate.z); marker.scale.set(1, 1, 1);
    marker.quaternion.setFromUnitVectors(forward, normal.set(gate.normal.x, gate.normal.y, gate.normal.z).normalize()); marker.updateMatrix();
    rings.setMatrixAt(index, marker.matrix); arrows.setMatrixAt(index, marker.matrix);
  });
  rings.instanceMatrix.needsUpdate = arrows.instanceMatrix.needsUpdate = true;
  rings.computeBoundingSphere(); arrows.computeBoundingSphere();
  rings.visible = arrows.visible = false;

  // Route markers are a small shared allocation. Only the current region's
  // instances are submitted; the destination palette makes each passage distinct.
  const arch = new TorusGeometry(1.65, .065, low ? 4 : 6, low ? 20 : 32, Math.PI);
  const archPieces = [arch, new CylinderGeometry(.065, .065, 1.5, 6).translate(-1.65, -.75, 0), new CylinderGeometry(.065, .065, 1.5, 6).translate(1.65, -.75, 0)];
  const portalGeometry = merged(archPieces);
  const portalMaterial = material("#ffffff", .12);
  const softenNearCamera=(value:MeshStandardMaterial)=>{
    const previous=value.onBeforeCompile,cacheKey=value.customProgramCacheKey();
    value.onBeforeCompile=(shader,renderer)=>{
      previous.call(value,shader,renderer);
      // Opaque screen-door fading keeps arrival markers out of the chase view
      // without introducing transparent sorting or changing portal navigation.
      shader.fragmentShader=shader.fragmentShader.replace("#include <clipping_planes_fragment>",`#include <clipping_planes_fragment>
        float markerDistance=length(vSeaWorld-cameraPosition);
        float markerCoverage=smoothstep(5.5,9.,markerDistance);
        float markerDither=fract(sin(dot(floor(gl_FragCoord.xy),vec2(12.9898,78.233)))*43758.5453);
        if(markerCoverage<=markerDither)discard;`);
    };
    value.customProgramCacheKey=()=>`${cacheKey}/portal-proximity-v4`;
    value.needsUpdate=true;
  };
  softenNearCamera(portalMaterial);
  const portals = new InstancedMesh(portalGeometry, portalMaterial, regionPortals.length); portals.name = "regional-passage-arches"; instances.push(portals); group.add(portals);
  const beaconMaterial = material("#ffffff", .35);
  softenNearCamera(beaconMaterial);
  const beacons = new InstancedMesh(own(new SphereGeometry(.14, 6, 4)), beaconMaterial, regionPortals.length); beacons.name = "regional-passage-beacons"; instances.push(beacons); group.add(beacons);
  portals.count = beacons.count = 0;
  portals.visible = beacons.visible = false;
  let visibleRegion: RegionId | null = null, ringIndex = -1, disposed = false;
  const color = new Color(), floatWorld = new Vector3();
  function setRegion(id: RegionId) {
    visibleRegion = id;
    const origin = getRegion(id).worldOrigin, links = portalsFrom(id);
    portals.count = beacons.count = links.length;
    links.forEach((portal, index) => {
      marker.position.set(origin.x + portal.position.x, portal.position.y, origin.z + portal.position.z);
      marker.rotation.set(0, -portal.position.heading, 0); marker.scale.set(.55, .55, .55); marker.updateMatrix(); portals.setMatrixAt(index, marker.matrix);
      marker.position.y += 1.68*.55; marker.updateMatrix(); beacons.setMatrixAt(index, marker.matrix);
      color.set(getRegion(portal.to).palette.accent); portals.setColorAt(index, color); beacons.setColorAt(index, color);
    });
    portals.instanceMatrix.needsUpdate = beacons.instanceMatrix.needsUpdate = true;
    if (portals.instanceColor) portals.instanceColor.needsUpdate = true;
    if (beacons.instanceColor) beacons.instanceColor.needsUpdate = true;
    portals.computeBoundingSphere(); beacons.computeBoundingSphere();
    group.userData.portalIds = links.map(portal => portal.id);
    portals.userData.portalIds = group.userData.portalIds;
    beacons.userData.portalIds = group.userData.portalIds;
  }
  group.userData = { presentationOnly: true, quality, surfaceDrawBudget: 6, underwaterDrawBudget: 4 };
  return {
    group,
    update(frame: V4ActivityFrame) {
      if (disposed) return;
      const { boat, region, mode, activity, games, time, quiet } = frame;
      const underwater = mode === "reef";
      dock.visible = mode === "surface";
      dockGlow.emissiveIntensity = activity === "docking" ? .9 : .35;
      fishing.visible = mode === "surface" && activity === "fishing";
      rings.visible = arrows.visible = underwater && region === "crown" && activity === "fish-course";
      portals.visible = beacons.visible = underwater;
      if (underwater && visibleRegion !== region) setRegion(region);
      if (rings.visible && ringIndex !== games.fishCourse.gateIndex) {
        ringIndex = games.fishCourse.gateIndex;
        FISH_COURSE_GATES.forEach((_gate, index) => {
          color.set(index < ringIndex ? "#668e86" : index === ringIndex ? "#f3dda1" : "#76bbc0");
          rings.setColorAt(index, color); arrows.setColorAt(index, color);
        });
        if (rings.instanceColor) rings.instanceColor.needsUpdate = true;
        if (arrows.instanceColor) arrows.instanceColor.needsUpdate = true;
      }
      if (!fishing.visible) return;
      const profile = vesselProfile(boat.vesselId), state = games.fishing;
      const sea = quiet ? 0 : waveHeight(boat.x, boat.z, time);
      fishing.position.set(boat.x, sea + boat.lift, boat.z); fishing.rotation.y = -boat.heading;
      const baseX = profile.beam * .48, baseZ = profile.length * .29, baseY = boat.vesselId === "superyacht" ? 1.25 : 1.35;
      rod.position.set(baseX, baseY, baseZ);
      const cast = state.phase === "casting" || state.phase === "idle";
      const near = state.phase === "landed" || state.phase === "releasing";
      const reach = cast ? 1.3 : near ? 1.5 : 9 + state.castAim * 4 - state.progress * 9;
      const floatX = baseX + reach, floatZ = baseZ - 3 + (state.castAim - .5) * 6;
      floatWorld.set(floatX, 0, floatZ).applyAxisAngle(up, -boat.heading).add(fishing.position);
      const surface = quiet ? .12 : waveHeight(floatWorld.x, floatWorld.z, time) - sea + .14;
      const bite = !quiet && state.phase === "bite" ? -.13 + Math.sin(time * 8) * .1 : 0;
      float.position.set(floatX, cast ? baseY + 1 : surface + bite, floatZ);
      float.visible = state.phase !== "finished";
      const tipX = baseX + 2.65, tipY = baseY + 3.12, tipZ = baseZ - .65;
      const sag = cast ? .2 : .75 * (1 - state.tension);
      for (let i = 0; i < 16; i++) {
        const t = i / 15;
        linePositions[i * 3] = tipX + (float.position.x - tipX) * t;
        linePositions[i * 3 + 1] = tipY + (float.position.y - tipY) * t - Math.sin(Math.PI * t) * sag;
        linePositions[i * 3 + 2] = tipZ + (float.position.z - tipZ) * t;
      }
      lineGeometry.getAttribute("position").needsUpdate = true;
      line.visible = float.visible;
      caughtFish.visible = near || (state.phase === "reeling" && state.progress > .5);
      if (caughtFish.visible) {
        const released = state.phase === "releasing" ? Math.min(1, state.phaseTime / .75) : 0;
        caughtFish.position.set(floatX + released * 5, surface - .5 - released * 1.2, floatZ - released * 2);
        caughtFish.rotation.set(0, released ? -.4 : Math.PI / 2, quiet ? 0 : Math.sin(time * 6) * .14);
        catchMaterial.color.set(FISHING_CATCHES[Math.min(state.round, FISHING_CATCHES.length - 1)].color);
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true; group.removeFromParent();
      instances.forEach(instance => instance.dispose()); geometries.forEach(geometry => geometry.dispose()); materials.forEach(value => value.dispose());
      group.clear();
    },
  };
}
