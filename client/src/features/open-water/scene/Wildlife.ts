import { applyFishSwimming } from "./FishSwimming";
import {
  BackSide,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  DynamicDrawUsage,
  Float32BufferAttribute,
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  SphereGeometry,
  TubeGeometry,
  Vector3,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { REEF_CENTER, reefSolids, sampleReefFloor } from "../data/reefTerrain";
import { obstacles } from "../data/world";
import { applySeaMedium, type SeaEnvironment } from "./materials";
import {
  createFallbackCharacter,
  disposeCreature,
  loadCharacterAsset,
  type CharacterAsset,
  type DakotaPose,
} from "./CharacterAsset";

export type WildlifeFrame = {
  mode: "surface" | "reef";
  boat: { x: number; z: number; heading: number };
  diver?: { x: number; y: number; z: number; heading?: number };
  dakotaState?: DakotaPose;
  escortTarget?: { x: number; y?: number; z: number };
  encounter?: string | null;
  camouflageRevealed?: boolean;
  camouflageOutline?: boolean;
  cleanerMoment?: 0 | 1 | 2;
  paused?: boolean;
  quiet?: boolean;
};
export type WildlifeAssetState = "idle" | "loading" | "ready" | "fallback";
export type WildlifeOptions = {
  quality?: "low" | "high";
  onAssetState?: (state: WildlifeAssetState, error?: string) => void;
  onInvalidate?: () => void;
};
export type Wildlife = {
  group: Group;
  dakota: Group;
  reef: Group;
  readonly assetState: WildlifeAssetState;
  readonly assetError: string | undefined;
  loadCharacter: (signal?: AbortSignal) => Promise<void>;
  setQuality: (quality: "low" | "high") => void;
  update: (time: number, dt: number, frame: WildlifeFrame) => void;
  dispose: () => void;
};

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const FISH_ASSET = `${import.meta.env.BASE_URL}assets/open-water-v3/reef-fish.glb`;
const abortError = () =>
  new DOMException("Wildlife loading canceled", "AbortError");
const seed = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const angleDelta = (a: number, b: number) =>
  Math.atan2(Math.sin(b - a), Math.cos(b - a));

function colorGeometry(geometry: BufferGeometry, color: Color) {
  const attribute = geometry.getAttribute("position"),
    colors = new Float32Array(attribute.count * 3);
  for (let i = 0; i < attribute.count; i++) color.toArray(colors, i * 3);
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  return geometry;
}

/** Original rounded rest geometry; source fish replace it when the optional bundle arrives. */
function fallbackFishGeometry() {
  const parts: BufferGeometry[] = [];
  const body = new SphereGeometry(1, 14, 10);
  body.scale(0.11, 0.17, 0.36);
  body.translate(0, 0, 0.12);
  parts.push(colorGeometry(body, new Color("#b5c9ae")));
  for (const side of [-1, 1]) {
    const fin = new SphereGeometry(1, 8, 6);
    fin.scale(0.025, 0.12, 0.12);
    fin.rotateX(side * 0.65);
    fin.translate(0, side * 0.08, -0.34);
    parts.push(colorGeometry(fin, new Color("#e0b45f")));
    const eye = new SphereGeometry(0.016, 6, 4);
    eye.translate(side * 0.098, 0.048, 0.29);
    parts.push(colorGeometry(eye, new Color("#183a3e")));
  }
  const merged = mergeGeometries(parts, false)!;
  parts.forEach((g) => g.dispose());
  merged.computeVertexNormals();
  return merged;
}

function fishMaterial(
  environment: SeaEnvironment,
  clock: { value: number },
  instanced: boolean,
) {
  const material = applySeaMedium(
    new MeshStandardMaterial({
      color: "#ffffff",
      vertexColors: true,
      roughness: 0.6,
    }),
    environment,
  );
  applyFishSwimming(material, clock, { headZ: 0.45, length: 0.87, direction: -1, phaseAttribute: instanced ? "aFishPhase" : undefined, amplitude: 0.115, frequency: 1.9 });
  return material;
}

/** Floor and solid clearance for an animal, without changing the visitor's controller. */
function clearHabitat(point: Vector3, radius: number) {
  const rho = Math.hypot(point.x / (24 - radius), point.z / (18 - radius));
  if (rho > 1) {
    point.x /= rho;
    point.z /= rho;
  }
  point.y = clamp(
    point.y,
    sampleReefFloor(point.x, point.z) + radius + 0.25,
    -radius - 0.3,
  );
  for (const box of reefSolids) {
    if (
      point.x < box.min[0] - radius ||
      point.x > box.max[0] + radius ||
      point.z < box.min[2] - radius ||
      point.z > box.max[2] + radius
    )
      continue;
    if (point.y > box.min[1] - radius && point.y < box.max[1] + radius)
      point.y = Math.min(-radius - 0.3, box.max[1] + radius + 0.08);
  }
}

function createOctopus(environment: SeaEnvironment) {
  const group = new Group();
  group.name = "Camouflage-octopus";
  group.position.set(-17.25, -4.02, 7.7);
  const parts: BufferGeometry[] = [];
  const mantle = new SphereGeometry(1, 22, 16);
  mantle.scale(0.32, 0.36, 0.4);
  mantle.translate(0, 0.26, -0.03);
  parts.push(mantle);
  for (let arm = 0; arm < 8; arm++) {
    const angle = (arm / 8) * Math.PI * 2;
    const points = [0, 0.24, 0.52, 0.73, 0.9].map((length, i) => {
      const curl = angle + (i / 4) ** 2 * 0.75;
      return new Vector3(
        Math.sin(curl) * length,
        0.06 + Math.sin((i / 4) * Math.PI) * 0.075,
        Math.cos(curl) * length,
      );
    });
    const geometry = new TubeGeometry(
      new CatmullRomCurve3(points),
      16,
      0.064,
      7,
      false,
    );
    // Taper the final arm rings; the centerline remains identical to the authored curve.
    const position = geometry.getAttribute("position"),
      curve = new CatmullRomCurve3(points);
    for (let ring = 0; ring <= 16; ring++) {
      const center = curve.getPointAt(ring / 16),
        taper = 1 - 0.8 * (ring / 16) ** 1.2;
      for (let radial = 0; radial <= 7; radial++) {
        const i = ring * 8 + radial;
        position.setXYZ(
          i,
          center.x + (position.getX(i) - center.x) * taper,
          center.y + (position.getY(i) - center.y) * taper,
          center.z + (position.getZ(i) - center.z) * taper,
        );
      }
    }
    geometry.computeVertexNormals();
    parts.push(geometry);
  }
  const geometry = mergeGeometries(parts, false)!;
  parts.forEach((g) => g.dispose());
  const position = geometry.getAttribute("position"),
    colors = new Float32Array(position.count * 3);
  for (let i = 0; i < position.count; i++) {
    const mottle =
      0.85 +
      0.15 *
        Math.sin(position.getX(i) * 21 + Math.sin(position.getZ(i) * 17) * 2);
    colors.set([mottle, mottle, mottle], i * 3);
  }
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  const material = applySeaMedium(
    new MeshStandardMaterial({
      color: "#b4ad8e",
      vertexColors: true,
      roughness: 0.87,
    }),
    environment,
  );
  const body = new Mesh(geometry, material);
  group.add(body);
  const outlineMaterial = applySeaMedium(
    new MeshStandardMaterial({
      color: "#fff2bb",
      emissive: "#fff2bb",
      emissiveIntensity: 0.5,
      side: BackSide,
      roughness: 1,
    }),
    environment,
  );
  const outline = new Mesh(geometry, outlineMaterial);
  outline.scale.setScalar(1.06);
  outline.visible = false;
  group.add(outline);
  const eyes = applySeaMedium(
    new MeshStandardMaterial({ color: "#153835", roughness: 0.5 }),
    environment,
  );
  for (const side of [-1, 1]) {
    const socket = new Mesh(new SphereGeometry(0.068, 12, 8), material);
    socket.position.set(side * 0.22, 0.36, 0.23);
    group.add(socket);
    const pupil = new Mesh(new SphereGeometry(0.027, 10, 6), eyes);
    pupil.scale.set(1, 0.65, 0.55);
    pupil.position.set(side * 0.245, 0.37, 0.279);
    group.add(pupil);
  }
  return { group, material, outline };
}

/** Lightweight residents driven only by the scene's single animation loop. */
export function createWildlife(
  environment: SeaEnvironment,
  options: WildlifeOptions = {},
): Wildlife {
  const group = new Group();
  group.name = "Open-water-wildlife";
  const reef = new Group();
  reef.name = "Reef-wildlife";
  reef.position.set(REEF_CENTER.x, 0, REEF_CENTER.z);
  group.add(reef);
  const dakota = new Group();
  dakota.name = "Dakota-world-anchor";
  dakota.userData.encounter = "dakota";
  group.add(dakota);
  let character: CharacterAsset = createFallbackCharacter(environment);
  dakota.add(character.group);
  let disposed = false,
    assetState: WildlifeAssetState = "idle",
    assetError: string | undefined;
  let loading: Promise<void> | undefined,
    loadController: AbortController | undefined;
  const clock = { value: 0 },
    transform = new Object3D(),
    position = new Vector3(),
    next = new Vector3();
  const diverLocal = new Vector3(),
    desired = new Vector3(),
    currentLocal = new Vector3();
  let elapsed = 0,
    initialized = false,
    lastMode: WildlifeFrame["mode"] | undefined;
  let lastPose: DakotaPose | undefined,
    lastCleanerMoment: number | undefined,
    lastRevealed: boolean | undefined;
  const count = 117; // Allocate once; draw45/117 plus two cleaners and one client:48/120.
  let quality = options.quality ?? "high";
  const schools: { mesh: InstancedMesh; offsets: Vector3[]; start: number }[] =
    [];
  const centers = [
    new Vector3(-4, -3.4, 7),
    new Vector3(5, -2.8, 1),
    new Vector3(-9, -3.1, -7),
  ];
  let first = 0;
  for (let species = 0; species < 3; species++) {
    const n = Math.floor(count / 3) + (species < count % 3 ? 1 : 0),
      geometry = fallbackFishGeometry();
    geometry.setAttribute(
      "aFishPhase",
      new InstancedBufferAttribute(
        new Float32Array(
          Array.from(
            { length: n },
            (_, i) => seed(first + i + 5) * Math.PI * 2,
          ),
        ),
        1,
      ),
    );
    const mesh = new InstancedMesh(
      geometry,
      fishMaterial(environment, clock, true),
      n,
    );
    mesh.name = `Responsive-school-${species + 1}`;
    mesh.count = quality === "low" ? 15 : n;
    mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    mesh.frustumCulled = false;
    mesh.userData = {
      encounter: "fish",
      fishCount: mesh.count,
      source: "authored-fallback",
    };
    reef.add(mesh);
    schools.push({
      mesh,
      offsets: Array.from({ length: n }, () => new Vector3()),
      start: first,
    });
    first += n;
  }
  const octopus = createOctopus(environment);
  octopus.group.userData.encounter = "camouflage";
  reef.add(octopus.group);
  const octopusHidden = new Color("#b4ad8e"),
    octopusRevealed = new Color("#bd7753");
  const cleanerStation = new Group();
  cleanerStation.name = "Cleaner-fish-station";
  cleanerStation.userData.encounter = "cleaner";
  cleanerStation.position.set(11.6, -5.15, -8);
  reef.add(cleanerStation);
  const client = new Mesh(
    fallbackFishGeometry(),
    fishMaterial(environment, clock, false),
  );
  client.name = "Cleaner-client";
  client.scale.set(1.7, 1.7, 1.7);
  client.rotation.y = -Math.PI / 2;
  cleanerStation.add(client);
  const cleanerFish: Group[] = [];
  const cleanerBlue = applySeaMedium(
    new MeshStandardMaterial({ color: "#86c8db", roughness: 0.6 }),
    environment,
  );
  const cleanerStripe = applySeaMedium(
    new MeshStandardMaterial({ color: "#234752", roughness: 0.6 }),
    environment,
  );
  for (let i = 0; i < 2; i++) {
    const fish = new Group();
    fish.name = `Cleaner-wrasse-${i + 1}`;
    const body = new Mesh(new SphereGeometry(1, 12, 8), cleanerBlue);
    body.scale.set(0.05, 0.06, 0.28);
    fish.add(body);
    const stripe = new Mesh(new SphereGeometry(1, 12, 8), cleanerStripe);
    stripe.scale.set(0.051, 0.022, 0.255);
    fish.add(stripe);
    const tail = new Mesh(new SphereGeometry(1, 8, 6), cleanerBlue);
    tail.scale.set(0.018, 0.075, 0.095);
    tail.position.z = -0.27;
    const tailPivot = new Group();
    tailPivot.position.z = -0.22;
    tail.position.z += 0.22;
    tailPivot.add(tail); fish.add(tailPivot); fish.userData.tailPivot = tailPivot;
    cleanerStation.add(fish);
    cleanerFish.push(fish);
  }
  group.userData.fishCount = quality === "low" ? 48 : 120;

  function schoolDensity(mode: WildlifeFrame["mode"]) {
    // Above the water, keep a readable school silhouette without submitting
    // every close-up fish. Diving restores the complete population immediately.
    const count =
      mode === "reef"
        ? quality === "low"
          ? 15
          : 39
        : quality === "low"
          ? 5
          : 13;
    schools.forEach((school) => {
      school.mesh.count = count;
      school.mesh.userData.fishCount = count;
    });
    group.userData.fishCount = count * schools.length + 3;
  }

  function state(value: WildlifeAssetState, error?: string) {
    assetState = value;
    assetError = error;
    if (!disposed) options.onAssetState?.(value, error);
  }
  async function loadFish(signal: AbortSignal) {
    const response = await fetch(FISH_ASSET, { signal });
    if (!response.ok) throw new Error(`Fish asset returned ${response.status}`);
    const bytes = await response.arrayBuffer();
    if (signal.aborted) throw abortError();
    const gltf = await new GLTFLoader().parseAsync(bytes, "");
    try {
      if (signal.aborted || disposed) throw abortError();
      // Prepare every replacement before mutating a live school, so a bad asset keeps the fallback intact.
      const sources = schools.map((_, i) => {
        const source = gltf.scene.getObjectByName(`Fish${i + 1}`);
        if (!(source instanceof Mesh))
          throw new Error(`Fish${i + 1} is missing from the fish asset`);
        return source;
      });
      const replacements = sources.map((source) => source.geometry.clone());
      schools.forEach((school, i) => {
        const geometry = replacements[i];
        geometry.setAttribute(
          "aFishPhase",
          school.mesh.geometry.getAttribute("aFishPhase").clone(),
        );
        school.mesh.geometry.dispose();
        school.mesh.geometry = geometry;
        school.mesh.userData.source = "Quaternius CC0 adaptation";
      });
      const clientGeometry = replacements[0].clone();
      clientGeometry.deleteAttribute("aFishPhase");
      client.geometry.dispose();
      client.geometry = clientGeometry;
    } finally {
      disposeCreature(gltf.scene);
    }
  }

  return {
    group,
    dakota,
    reef,
    get assetState() {
      return assetState;
    },
    get assetError() {
      return assetError;
    },
    setQuality(value) {
      if (disposed || value === quality) return;
      quality = value;
      schoolDensity(lastMode ?? "reef");
      options.onInvalidate?.();
    },
    loadCharacter: function loadCharacter(signal?: AbortSignal): Promise<void> {
      if (disposed || signal?.aborted) return Promise.resolve();
      if (assetState === "ready") return Promise.resolve();
      if (loading) {
        // GLTF parsing may finish after a dive aborts. A new visit must wait for
        // that request's cleanup, then own a fresh signal instead of joining a
        // canceled promise and remaining on the fallback for the whole visit.
        return loadController?.signal.aborted
          ? loading.then(() => loadCharacter(signal))
          : loading;
      }
      loadController = new AbortController();
      const controller = loadController;
      const abort = () => controller.abort();
      signal?.addEventListener("abort", abort, { once: true });
      state("loading");
      loading = (async () => {
        const results = await Promise.allSettled([
          loadCharacterAsset(environment, controller.signal),
          loadFish(controller.signal),
        ]);
        if (disposed || controller.signal.aborted) {
          if (results[0].status === "fulfilled") results[0].value.dispose();
          if (!disposed) state("idle");
          return;
        }
        const result = results[0];
        if (result.status === "fulfilled") {
          dakota.remove(character.group);
          character.dispose();
          character = result.value;
          dakota.add(character.group);
        }
        const failures = results.filter(
          (r): r is PromiseRejectedResult => r.status === "rejected",
        );
        if (failures.length)
          state(
            "fallback",
            failures
              .map((r) =>
                r.reason instanceof Error ? r.reason.message : String(r.reason),
              )
              .join("; "),
          );
        else state("ready");
        options.onInvalidate?.();
      })().finally(() => {
        signal?.removeEventListener("abort", abort);
        loading = undefined;
        if (loadController === controller) loadController = undefined;
      });
      return loading;
    },
    update(_time, dt, frame) {
      if (disposed) return;
      if (frame.mode !== lastMode) schoolDensity(frame.mode);
      const quiet = !!frame.quiet,
        step = frame.paused ? 0 : clamp(dt, 0, 0.05);
      if (!quiet) elapsed += step;
      const animationTime = quiet ? 0 : elapsed;
      clock.value = animationTime;
      const immediate = quiet || !initialized || lastMode !== frame.mode;
      const blend = immediate ? 1 : 1 - Math.exp(-step * 2.8);
      const visitor =
        frame.mode === "reef" && frame.diver
          ? frame.diver
          : {
              x: frame.boat.x,
              y: 0,
              z: frame.boat.z,
              heading: frame.boat.heading,
            };
      const heading = visitor.heading ?? frame.boat.heading,
        fx = Math.sin(heading),
        fz = -Math.cos(heading);
      let pose = frame.dakotaState ?? "idle";
      desired.set(
        visitor.x +
          Math.cos(heading) * (frame.mode === "reef" ? 3.2 : 6.5) +
          fx * 2.8,
        frame.mode === "reef" ? visitor.y + 0.15 : -0.34,
        visitor.z +
          Math.sin(heading) * (frame.mode === "reef" ? 3.2 : 6.5) +
          fz * 2.8,
      );
      if (pose === "escort" && frame.escortTarget) {
        const target = frame.escortTarget,
          dx = target.x - visitor.x,
          dz = target.z - visitor.z,
          distance = Math.hypot(dx, dz);
        const lead = Math.min(frame.mode === "reef" ? 4.5 : 8, distance);
        desired.set(
          visitor.x + (dx / Math.max(distance, 0.001)) * lead,
          frame.mode === "reef" ? (target.y ?? visitor.y) + 0.25 : -0.34,
          visitor.z + (dz / Math.max(distance, 0.001)) * lead,
        );
        if (distance < 2.5) pose = "arrived";
        else if (
          initialized &&
          Math.hypot(
            dakota.position.x - visitor.x,
            dakota.position.y - visitor.y,
            dakota.position.z - visitor.z,
          ) > (frame.mode === "reef" ? 8 : 16)
        ) {
          desired.copy(dakota.position);
          pose = "waiting";
        }
      }
      if (frame.mode === "reef") {
        desired.x -= REEF_CENTER.x;
        desired.z -= REEF_CENTER.z;
        clearHabitat(desired, 0.85);
        desired.x += REEF_CENTER.x;
        desired.z += REEF_CENTER.z;
      } else {
        for (const obstacle of obstacles) {
          const dx = desired.x - obstacle.x,
            dz = desired.z - obstacle.z,
            distance = Math.hypot(dx, dz),
            radius = obstacle.r + 3;
          if (distance < radius) {
            desired.x =
              obstacle.x + ((dx || 1) / Math.max(distance, 1)) * radius;
            desired.z = obstacle.z + (dz / Math.max(distance, 1)) * radius;
          }
        }
      }
      next.copy(desired).sub(dakota.position);
      const facing =
        pose === "greeting" || pose === "arrived" || pose === "observing"
          ? Math.atan2(visitor.x - desired.x, visitor.z - desired.z)
          : next.lengthSq() > 0.03
            ? Math.atan2(next.x, next.z)
            : heading + Math.PI;
      dakota.position.lerp(desired, blend);
      dakota.rotation.y +=
        angleDelta(dakota.rotation.y, facing) *
        (immediate ? 1 : 1 - Math.exp(-step * 3.8));
      if (frame.mode === "reef") {
        currentLocal.copy(dakota.position);
        currentLocal.x -= REEF_CENTER.x;
        currentLocal.z -= REEF_CENTER.z;
        clearHabitat(currentLocal, 0.85);
        dakota.position.set(
          currentLocal.x + REEF_CENTER.x,
          currentLocal.y,
          currentLocal.z + REEF_CENTER.z,
        );
      }
      dakota.visible = pose !== "hidden";
      character.update(
        quiet ? 0 : step,
        pose,
        quiet || (!!frame.paused && pose !== lastPose),
      );
      if (frame.diver)
        diverLocal.set(
          frame.diver.x - REEF_CENTER.x,
          frame.diver.y,
          frame.diver.z - REEF_CENTER.z,
        );
      else diverLocal.set(1e4, 1e4, 1e4);
      const parted = frame.encounter === "fish-apart";
      schools.forEach((school, species) => {
        const center = centers[species];
        for (let i = 0; i < school.mesh.count; i++) {
          const n = school.start + i,
            phase = seed(n + 4) * Math.PI * 2,
            orbit = animationTime * 0.13 + phase;
          const rx = 2 + seed(n + 19) * 3.2,
            rz = 1.4 + seed(n + 41) * 1.5;
          position.set(
            center.x + Math.cos(orbit) * rx,
            center.y +
              (seed(n + 8) - 0.5) * 1.25 +
              Math.sin(animationTime * 0.5 + phase) * 0.13,
            center.z + Math.sin(orbit) * rz,
          );
          next.copy(position).sub(diverLocal);
          const distance = next.length();
          if (frame.mode === "reef" && distance < 3.7) {
            next.y *= 0.5;
            next.normalize().multiplyScalar((3.7 - distance) * 0.95);
          } else next.set(0, 0, 0);
          school.offsets[i].lerp(
            next,
            immediate ? 1 : 1 - Math.exp(-step * 3.2),
          );
          position.add(school.offsets[i]);
          if (parted) position.x += (position.x < center.x ? -1 : 1) * 1.6;
          clearHabitat(position, 0.27);
          const yaw = Math.atan2(-Math.sin(orbit) * rx, Math.cos(orbit) * rz);
          transform.position.copy(position);
          transform.rotation.set(
            0,
            yaw,
            Math.sin(animationTime * 0.9 + phase) * 0.035,
          );
          transform.scale.setScalar(0.42 + seed(n + 67) * 0.27);
          transform.updateMatrix();
          school.mesh.setMatrixAt(i, transform.matrix);
        }
        school.mesh.instanceMatrix.needsUpdate = true;
      });
      // Explicit comparison controls still change their still frame while a reading panel pauses ambient motion.
      const revealed = !!frame.camouflageRevealed;
      octopus.material.color.lerp(
        revealed ? octopusRevealed : octopusHidden,
        immediate || (frame.paused && revealed !== lastRevealed)
          ? 1
          : 1 - Math.exp(-step * 3),
      );
      octopus.outline.visible = !!frame.camouflageOutline;
      const moment = frame.cleanerMoment ?? 1,
        clientX = moment === 0 ? 2.2 : moment === 2 ? -2.6 : 0;
      client.position.x +=
        (clientX - client.position.x) *
        (immediate || (frame.paused && moment !== lastCleanerMoment)
          ? 1
          : 1 - Math.exp(-step * 2));
      client.position.y = quiet ? 0 : Math.sin(animationTime * 0.65) * 0.06;
      cleanerFish.forEach((fish, i) => {
        (fish.userData.tailPivot as Group).rotation.y = Math.sin(animationTime * 11 + i * 2.4) * 0.48;
        const phase = animationTime * (moment === 1 ? 1.3 : 0.5) + i * Math.PI;
        fish.position.set(
          (moment === 1 ? client.position.x - 0.5 : 0) + Math.cos(phase) * 0.24,
          Math.sin(phase) * 0.22,
          0.24 * (i ? 1 : -1),
        );
        fish.rotation.set(
          Math.cos(phase) * 0.16,
          -Math.PI / 2 + Math.sin(phase) * 0.4,
          0,
        );
      });
      initialized = true;
      lastMode = frame.mode;
      lastPose = pose;
      lastCleanerMoment = moment;
      lastRevealed = revealed;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      loadController?.abort();
      dakota.remove(character.group);
      character.dispose();
      disposeCreature(reef);
      reef.clear();
      group.clear();
    },
  };
}
