import {
  Component,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react";
import {
  Canvas,
  useFrame,
  useThree,
  type ThreeEvent,
} from "@react-three/fiber";
import {
  Color,
  Mesh,
  Object3D,
  Group,
  MeshBasicMaterial,
  NoToneMapping,
  PerspectiveCamera,
  ShaderMaterial,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from "three";
import { lensStops } from "../data/encounters";
import { destinations } from "../data/world";
import { updateRace, type RaceState } from "../systems/raceController";
import {
  stepBoat,
  waveHeight,
  type BoatState,
  type Input,
} from "../systems/boatController";
import { createEnvironment, skyMaterial, SEA_LIGHTING } from "./materials";
import { createSeabed } from "./Seabed";
import { createWildlife } from "./Wildlife";
import {
  reefCamera,
  resolveReefPose,
  stepReef,
  type ReefState,
  type ReefInput,
} from "../systems/reefController";
import type { Expedition, Panel } from "../systems/expeditionController";
import type { EncounterId } from "../data/encounters";
import type { SceneBridge } from "../ui/ExpeditionPanels";
import {
  createArchitecture,
  createBuoy,
  createPlayground,
  disposeModel,
} from "./models";
import { createOcean } from "./Ocean";
import { Wake } from "./Wake";
import { createVesselModel, loadVesselAsset } from "./V4Assets";
import { createV4Fauna } from "./V4Fauna";
import { createV4Companions } from "./V4Companions";
import { createV4ActivityObjects } from "./V4ActivityObjects";
import { getRegion, regionIds, regionPortals, type RegionId } from "../data/regions";
import { vesselProfile } from "../data/vessels";
import { createRegionLifecycle } from "../systems/regionLifecycle";
import type { RegionEnvironment } from "./RegionEnvironment";
import type { V4Games } from "../systems/v4Games";

export type LandmarkProjection = {
  id: string;
  x: number;
  y: number;
  visible: boolean;
};
export type OpenWaterSceneProps = {
  boat: MutableRefObject<BoatState>;
  reef: MutableRefObject<ReefState>;
  reefInput: MutableRefObject<ReefInput>;
  mode: Expedition["mode"];
  region: RegionId;
  actor: Expedition["actor"];
  visibilityAssist: boolean;
  anchoredYacht: BoatState | null;
  games: MutableRefObject<V4Games>;
  onGameTick: (delta: number) => void;
  onGameTelemetry: () => void;
  diving: boolean;
  onDiveEnd: () => void;
  transitionId: number;
  activity: Expedition["activity"];
  panel: Panel;
  inspection: "dakota" | "fish" | "camouflage" | "cleaner" | null;
  quiet: boolean;
  quality: "low" | "high";
  guideHidden: boolean;
  characterRequested: boolean;
  fishApart: boolean;
  camouflageRevealed: boolean;
  camouflageOutline: boolean;
  cleanerMoment: 0 | 1 | 2;
  lensBearing: number;
  photoCamera: { yaw: number; zoom: number };
  bridge: MutableRefObject<SceneBridge | null>;
  cruise: boolean;
  gestureEpoch: MutableRefObject<number>;
  onReefTelemetry: (reef: ReefState) => void;
  onAnimalModel: (state: string) => void;
  onReefReady: (id: number) => void;
  onReefError: () => void;
  onEncounter: (id: EncounterId) => void;
  onCompanion: (name: "nemo" | "dory") => void;
  onRegion: (id: RegionId, portalId?: string) => void;
  onPerformance: (data: {
    fps: number;
    draws: number;
    triangles: number;
  }) => void;
  race: MutableRefObject<RaceState>;
  input: MutableRefObject<Input>;
  resetKey: number;
  sailing: boolean;
  paused: boolean;
  daylight: boolean;
  cameraMode: "aerial" | "follow";
  onTelemetry: (boat: BoatState) => void;
  onLandmarks: (points: LandmarkProjection[]) => void;
  onYachtModel: (state: "loading" | "licensed" | "procedural") => void;
  onReady: () => void;
  onError: () => void;
  onCourse: (point: { x: number; z: number }) => void;
};

class GraphicsBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    if (import.meta.env.DEV)
      console.warn("Open Water graphics boundary:", error);
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
function World(props: OpenWaterSceneProps) {
  const { camera, gl, invalidate, size, scene } = useThree();
  const [habitat, setHabitat] = useState<Group | null>(null);
  const habitatRef = useRef<RegionEnvironment | null>(null);
  const habitatQuality = useRef(props.quality);
  const modeRef = useRef(props.mode);
  const photoRef = useRef(props.panel);
  const sample = useRef({ time: 0, frames: 0 });
  const latest = useRef(props);
  latest.current = props;
  const runtime = useRef({
    time: 14,
    diveProgress: 0,
    diveTransition: props.transitionId,
    diveFromSurface: props.mode !== "reef",
    accumulator: 0,
    telemetry: 0,
    initialized: false,
    resume: true,
    failed: false,
    cameraChanged: true,
    lightChanged: true,
    cameraHeading: props.boat.current.heading,
  });
  const pointer = useRef<{
    x: number;
    y: number;
    time: number;
    epoch: number;
    target: EncounterId | null;
  } | null>(null);
  const objects = useMemo(() => {
    const environment = createEnvironment();
    const ocean = createOcean(environment, props.quality),
      architecture = createArchitecture(environment),
      playground = createPlayground(environment),
      fallbackYacht = new Group();
    const yacht = new Group();
    yacht.add(fallbackYacht);
    const sky = new Mesh(
      new SphereGeometry(1600, 32, 16),
      skyMaterial(environment),
    );
    sky.renderOrder = -100;
    const buoys = destinations.map((st) => {
      const buoy = createBuoy(environment);
      buoy.position.set(st.dock.x, 0, st.dock.z);
      return buoy;
    });
    const target = new Mesh(
      new TorusGeometry(2.4, 0.04, 6, 64),
      new MeshBasicMaterial({ color: "#dfdfb8", toneMapped: false }),
    );
    target.rotation.x = -Math.PI / 2;
    target.visible = false;
    return {
      environment,
      ocean,
      seabed: createSeabed(environment, props.quality),
      wildlife: createWildlife(environment, {
        quality: props.quality,
        onAssetState: (state) => latest.current.onAnimalModel(state),
        onInvalidate: invalidate,
      }),
      architecture,
      playground,
      yacht,
      anchoredYacht: new Group(),
      fauna: createV4Fauna(environment, "low"),
      activities: createV4ActivityObjects(environment, "low"),
      fallbackYacht,
      sky,
      buoys,
      diveMarkers: regionIds.filter(id => id !== "crown").map(id => {
        const marker = createBuoy(environment), entry = getRegion(id).surfaceEntrance;
        marker.position.set(entry.x, 0, entry.z); marker.userData.diveRegion = id;
        marker.name = `dive-marker-${id}`; return marker;
      }),
      target,
      wake: new Wake(environment),
      eye: new Vector3(),
      aim: new Vector3(),
      currentAim: new Vector3(),
      projection: new Vector3(),
    };
  }, []);
  const companions = useMemo(() => createV4Companions(objects.environment, props.quality), [objects, props.quality]);
  useEffect(() => () => companions.dispose(), [companions]);
  const regions = useMemo(() => createRegionLifecycle<RegionEnvironment>(async (id, signal) => {
    const module = await import("./RegionEnvironment");
    if (signal.aborted) throw new DOMException("Canceled", "AbortError");
    const result = module.createRegionEnvironment(objects.environment, id, latest.current.quality);
    const origin = getRegion(id).worldOrigin;
    result.group.position.set(origin.x, 0, origin.z);
    return result;
  }), [objects]);
  useEffect(() => () => regions.dispose(), [regions]);
  useEffect(() => {
    objects.wake.mesh.renderOrder = 30;
    if (!props.characterRequested) return;
    const controller = new AbortController();
    objects.wildlife.loadCharacter(controller.signal).catch(() => {});
    return () => controller.abort();
  }, [props.characterRequested, objects]);
  useEffect(() => {
    if (props.mode === "surface") {
      if (habitatRef.current) habitatRef.current.group.visible = false;
      regions.clear(); habitatRef.current = null; setHabitat(null);
      invalidate(); return;
    }
    const id = props.transitionId;
    let canceled = false;
    regions.prepare(props.region, {reload: habitatQuality.current !== props.quality})
      .then(ticket => {
        if (!ticket || canceled) return;
        const old = habitatRef.current;
        if (old && old !== ticket.resource) old.group.visible = false;
        const resource = regions.commit(ticket);
        if (!resource) return;
        habitatRef.current = resource;
        habitatQuality.current = props.quality;
        resource.group.visible = true;
        setHabitat(resource.group);
        runtime.current.cameraChanged = true;
        runtime.current.initialized = false;
        invalidate();
        // Commit is behind the loading curtain. The layout effect below validates
        // the mounted destination before handing control back to the visitor.
      }).catch(() => { if (!canceled) latest.current.onReefError(); });
    return () => { canceled = true; regions.cancel(); };
  }, [props.mode, props.region, props.transitionId, props.quality, objects, regions, invalidate]);
  useEffect(() => {
    if (!habitat || props.mode !== "entering" || regions.current?.regionId !== props.region) return;
    try {
      gl.compile(scene, camera);
      if (!runtime.current.failed) latest.current.onReefReady(props.transitionId);
    } catch { latest.current.onReefError(); }
  }, [habitat, props.mode, props.region, props.transitionId, camera, gl, scene, regions]);
  useEffect(() => {
    objects.wildlife.setQuality(props.quality);
    objects.ocean.userData.setQuality(props.quality);
    objects.seabed.userData.setQuality(props.quality);
    invalidate();
  }, [objects, props.quality, invalidate]);
  useEffect(() => {
    runtime.current.cameraChanged = true;
    invalidate();
  }, [
    props.region,
    props.actor,
    props.visibilityAssist,
    props.inspection,
    props.diving,
    props.lensBearing,
    props.activity,
    props.photoCamera,
    props.mode,
    props.panel,
    props.fishApart,
    props.camouflageRevealed,
    props.camouflageOutline,
    props.cleanerMoment,
    props.guideHidden,
    props.quality,
    invalidate,
  ]);
  useEffect(() => {
    props.bridge.current = {
      preview: (output) => {
        gl.render(scene, camera);
        const scale = Math.min(1, 1000 / gl.domElement.width);
        output.width = Math.round(gl.domElement.width * scale);
        output.height = Math.round(gl.domElement.height * scale);
        output
          .getContext("2d")
          ?.drawImage(gl.domElement, 0, 0, output.width, output.height);
      },
      capture: async () => {
        gl.render(scene, camera);
        const canvas = gl.domElement;
        const max = 1600,
          scale = Math.min(1, max / canvas.width);
        const output = document.createElement("canvas");
        output.width = Math.round(canvas.width * scale);
        output.height = Math.round(canvas.height * scale) + 56;
        const ctx = output.getContext("2d");
        if (!ctx) throw new Error("Photo canvas unavailable");
        ctx.drawImage(canvas, 0, 0, output.width, output.height - 56);
        ctx.fillStyle = "#f6f1e7";
        ctx.fillRect(0, output.height - 56, output.width, 56);
        ctx.fillStyle = "#143b43";
        ctx.font = `${Math.max(10, Math.min(14, output.width / 65))}px sans-serif`;
        ctx.fillText(
          "OPEN WATER / TEJASS KAUSHIK · A fictional field expedition",
          16,
          output.height - 34,
        );
        ctx.font = `${Math.max(7, Math.min(10, output.width / 90))}px sans-serif`;
        ctx.fillText(
          "Dakota: Quaternius (CC0), adapted · Vessels, reefs and fish: original Open Water art",
          16,
          output.height - 15,
        );
        return new Promise<Blob>((resolve, reject) =>
          output.toBlob(
            (blob) =>
              blob
                ? resolve(blob)
                : reject(new Error("Photo encoding unavailable")),
            "image/png",
          ),
        );
      },
    };
    return () => {
      props.bridge.current = null;
    };
  }, [gl, scene, camera, props.bridge]);
  const vesselId = props.boat.current.vesselId;
  useEffect(() => {
    const controller = new AbortController();
    let loaded: Group | null = null;
    const fallback = createVesselModel(objects.environment, vesselId, props.quality);
    let hasFallback = true;
    const releaseFallback = () => { if(hasFallback) { hasFallback = false; objects.fallbackYacht.remove(fallback); disposeModel(fallback); } };
    objects.fallbackYacht.add(fallback);
    objects.fallbackYacht.visible = true;
    latest.current.onYachtModel("loading");
    loadVesselAsset(objects.environment, vesselId, props.quality, controller.signal)
      .then(model => {
        if (controller.signal.aborted) { disposeModel(model); return; }
        loaded = model; objects.yacht.add(model);
        objects.fallbackYacht.visible = false;
        releaseFallback();
        latest.current.onYachtModel("licensed"); invalidate();
      }).catch(() => {
        if (!controller.signal.aborted) { latest.current.onYachtModel("procedural"); invalidate(); }
      });
    return () => {
      controller.abort();
      if (loaded) { objects.yacht.remove(loaded); disposeModel(loaded); }
      releaseFallback();
    };
  }, [objects, invalidate, props.quality, vesselId]);
  useEffect(() => {
    if (!props.anchoredYacht) return;
    const model = createVesselModel(objects.environment, "superyacht", "low");
    objects.anchoredYacht.add(model); invalidate();
    return () => { objects.anchoredYacht.remove(model); disposeModel(model); };
  }, [objects, Boolean(props.anchoredYacht), invalidate]);
  useEffect(() => {
    runtime.current.initialized = false;
    runtime.current.cameraHeading = props.boat.current.heading;
    runtime.current.accumulator = 0;
    objects.wake.clear();
    invalidate();
  }, [props.resetKey, props.boat, objects, invalidate]);
  useEffect(() => {
    const fail = (event?: Event) => {
      event?.preventDefault();
      runtime.current.failed = true;
      latest.current.onError();
    };
    const canvas = gl.domElement;
    canvas.addEventListener("webglcontextlost", fail);
    const previousShaderError = gl.debug.onShaderError;
    gl.debug.onShaderError = (context, program, vertex, fragment) => {
      if (import.meta.env.DEV)
        console.warn(
          "Open Water shader:",
          context.getProgramInfoLog(program),
          context.getShaderInfoLog(vertex),
          context.getShaderInfoLog(fragment),
        );
      fail();
    };
    try {
      gl.compile(scene, camera);
      if (!runtime.current.failed) latest.current.onReady();
    } catch (error) {
      if (import.meta.env.DEV)
        console.warn("Open Water initialization:", error);
      fail();
    }
    return () => {
      canvas.removeEventListener("webglcontextlost", fail);
      gl.debug.onShaderError = previousShaderError;
    };
  }, [camera, gl, scene]);
  useEffect(() => {
    runtime.current.resume = true;
    runtime.current.accumulator = 0;
    if (props.paused) {
      latest.current.onTelemetry({ ...props.boat.current });
      if (props.mode === "reef")
        latest.current.onReefTelemetry({ ...props.reef.current });
    }
    invalidate();
  }, [
    props.paused,
    props.sailing,
    props.daylight,
    props.cameraMode,
    size.width,
    size.height,
    invalidate,
  ]);
  useEffect(() => {
    runtime.current.cameraChanged = true;
    invalidate();
  }, [props.cameraMode, props.sailing, size.width, size.height, invalidate]);
  useEffect(() => {
    runtime.current.lightChanged = true;
    invalidate();
  }, [props.daylight, invalidate]);
  useEffect(
    () => () => {
      disposeModel(objects.seabed);
      objects.wildlife.dispose();
      objects.fauna.dispose();
      objects.activities.dispose();
      disposeModel(objects.architecture);
      disposeModel(objects.playground);
      disposeModel(objects.fallbackYacht);
      objects.buoys.forEach(disposeModel);
      objects.diveMarkers.forEach(disposeModel);
      objects.ocean.geometry.dispose();
      objects.ocean.material.dispose();
      objects.sky.geometry.dispose();
      objects.sky.material.dispose();
      objects.target.geometry.dispose();
      objects.target.material.dispose();
      objects.wake.dispose();
    },
    [objects],
  );

  // One loop owns physics, presentation, camera and water time. In demand mode a
  // prop change draws one intentional still; no callback schedules another frame.
  useFrame((_, rawDelta) => {
    const state = runtime.current,
      p = latest.current,
      boat = p.boat.current;
    if (state.diveTransition !== p.transitionId) {
      state.diveTransition = p.transitionId;
      state.diveProgress = 0;
      state.diveFromSurface = modeRef.current === "surface";
      state.initialized = false;
      state.cameraChanged = true;
    }
    if (state.failed || p.mode === "entering") return;
    const region = getRegion(p.region), origin = region.worldOrigin;
    const nav = {regionId:p.region, actor:p.actor === "diver" ? "diver" as const : "fish" as const};
    const hull = vesselProfile(boat.vesselId);
    const delta = state.resume ? 1 / 60 : Math.min(rawDelta, 0.06);
    state.resume = false;
    if (!p.paused) {
      state.time += delta;
      state.accumulator += delta;
      let steps = 0;
      while (state.accumulator >= 1 / 60 && steps < 4) {
        if (!p.inspection && p.sailing && p.mode === "surface" && p.activity !== "lighthouse" && p.activity !== "fishing") {
          if (p.race.current.phase !== "countdown")
            stepBoat(boat, p.cruise ? {...p.input.current, forward:true} : p.input.current, 1 / 60);
          updateRace(p.race.current, boat, 1 / 60);
        }
        if (!p.diving && !p.inspection && p.mode === "reef")
          stepReef(p.reef.current, p.reefInput.current, 1 / 60, nav);
        if (!p.diving && !p.inspection) p.onGameTick(1 / 60);
        state.accumulator -= 1 / 60;
        steps++;
      }
    }
    const changedMode = modeRef.current !== p.mode;
    if (changedMode) {
      runtime.current.diveProgress = 0;
      runtime.current.initialized = false;
      runtime.current.cameraChanged = true;
      objects.wake.clear();
      modeRef.current = p.mode;
    }
    const { environment, yacht, buoys, eye, aim, currentAim } = objects;
    const diver = p.reef.current;
    objects.wildlife.group.visible = true;
    objects.wildlife.update(state.time, p.paused ? 0 : delta, {
      mode: p.mode === "reef" ? "reef" : "surface",
      boat,
      diver: {
        x: diver.x + origin.x,
        y: diver.y,
        z: diver.z + origin.z,
        heading: diver.heading,
      },
      dakotaState: p.guideHidden
        ? "hidden"
        : p.panel === "dakota" || p.inspection === "dakota"
          ? "greeting"
          : p.activity === "escort"
            ? boat.target || diver.target
              ? "escort"
              : "arrived"
            : p.mode === "reef"
              ? "observing"
              : "idle",
      escortTarget:
        p.mode === "reef" && diver.target
          ? {
              x: diver.target.x + origin.x,
              y: diver.target.y,
              z: diver.target.z + origin.z,
            }
          : (boat.target ?? undefined),
      encounter: p.fishApart ? "fish-apart" : (p.inspection ?? p.panel),
      camouflageRevealed: p.camouflageRevealed,
      camouflageOutline: p.camouflageOutline,
      cleanerMoment: p.cleanerMoment,
      paused: p.paused,
      quiet: p.quiet,
    });
    const lens = objects.architecture.userData.lighthouseLens as
      Group | undefined;
    if (lens) lens.rotation.y = (-p.lensBearing * Math.PI) / 180;
    objects.architecture.visible =
      p.mode !== "reef" || p.activity === "lighthouse";
    objects.playground.visible = p.mode !== "reef";
    objects.yacht.visible = p.mode !== "reef";
    objects.wake.mesh.visible = p.mode !== "reef";
    objects.wildlife.group.visible = p.activity !== "lighthouse" && (p.mode !== "reef" || p.region === "crown");
    objects.seabed.visible = p.mode !== "reef";
    objects.sky.visible = p.mode !== "reef";
    objects.ocean.visible = p.mode !== "reef";
    objects.anchoredYacht.visible = p.mode === "surface" && Boolean(p.anchoredYacht);
    if (p.anchoredYacht) {
      const anchor = p.anchoredYacht;
      objects.anchoredYacht.position.set(anchor.x, waveHeight(anchor.x, anchor.z, state.time) + .12, anchor.z);
      objects.anchoredYacht.rotation.y = -anchor.heading;
    }
    companions.group.visible = p.mode === "reef";
    objects.fauna.group.visible = p.mode === "reef";
    if(p.mode === "reef") objects.fauna.update(p.region,state.time,p.quiet);
    if (p.mode === "reef") companions.update({region:p.region,actor:p.actor,pose:diver,time:state.time,delta:p.paused?0:delta,quiet:p.quiet});
    objects.activities.update({boat,reef:diver,region:p.region,actor:p.actor,mode:p.mode,activity:p.activity,games:p.games.current,time:state.time,quiet:p.quiet});
    if (habitatRef.current) {
      habitatRef.current.setVisibilityAssist(p.visibilityAssist);
      habitatRef.current.setFocus(diver);
      habitatRef.current.tick(p.paused?0:delta,state.time,p.quiet);
    }
    if (p.mode === "reef") {
      const water = region.cave ? (p.visibilityAssist ? "#1b4951" : region.palette.water) : "#145976";
      if (!(scene.background instanceof Color)) scene.background = new Color(water);
      else scene.background.set(water);
    } else scene.background = null;
    environment.uTime.value = state.time;
    if (!state.initialized || (p.paused && state.lightChanged))
      environment.uDay.value = Number(p.daylight);
    else if (!p.paused)
      environment.uDay.value +=
        (Number(p.daylight) - environment.uDay.value) *
        (1 - Math.exp(-delta * 1.8));
    state.lightChanged = false;
    environment.uBoat.value.set(boat.x, boat.z, -boat.heading);
    environment.uBoatLift.value = boat.lift;
    // Sample the analytic surface at bow, stern, port and starboard. The visible
    // water, hull height, pitch and roll agree instead of using unrelated sines.
    const forwardX = Math.sin(boat.heading),
      forwardZ = -Math.cos(boat.heading);
    const starboardX = Math.cos(boat.heading),
      starboardZ = Math.sin(boat.heading);
    const bow = waveHeight(
      boat.x + forwardX * hull.length * .35,
      boat.z + forwardZ * hull.length * .35,
      state.time,
    );
    const stern = waveHeight(
      boat.x - forwardX * hull.length * .35,
      boat.z - forwardZ * hull.length * .35,
      state.time,
    );
    const port = waveHeight(
      boat.x - starboardX * hull.beam * .4,
      boat.z - starboardZ * hull.beam * .4,
      state.time,
    );
    const starboard = waveHeight(
      boat.x + starboardX * hull.beam * .4,
      boat.z + starboardZ * hull.beam * .4,
      state.time,
    );
    yacht.position.set(
      boat.x,
      (boat.airborne || boat.rampId
        ? boat.lift
        : waveHeight(boat.x, boat.z, state.time)) + 0.12,
      boat.z,
    );
    yacht.rotation.set(
      boat.airborne
        ? Math.atan2(boat.verticalSpeed, Math.max(Math.abs(boat.speed), 8)) *
            0.72
        : boat.rampId
          ? boat.rampPitch
          : Math.atan2(bow - stern, hull.length * .7),
      -boat.heading,
      (boat.airborne ? 0 : Math.atan2(starboard - port, hull.beam * .8)) -
        boat.turn * boat.speed * 0.004,
      "YXZ",
    );
    buoys.forEach((buoy, i) => {
      const dock = destinations[i].dock;
      buoy.position.y = waveHeight(dock.x, dock.z, state.time);
    });
    objects.diveMarkers.forEach(marker => {
      marker.visible = p.mode === "surface" && camera.position.distanceTo(marker.position) < 145;
      marker.position.y = waveHeight(marker.position.x,marker.position.z,state.time);
    });
    const race = p.race.current;
    for (const gate of objects.playground.userData.gates as Mesh[]) {
      const material = gate.material as ShaderMaterial;
      const relevant =
        race.phase !== "idle" && gate.userData.courseId === race.courseId;
      // Show the selected circuit while racing; one start buoy pair per course
      // in free exploration. More routes must not multiply every frame's draws.
      gate.visible = race.phase === "idle" ? gate.userData.gateIndex === 0 : relevant;
      if (!gate.visible || gate.userData.frame) continue;
      const next =
        relevant &&
        race.phase !== "finished" &&
        gate.userData.gateIndex === race.checkpoint;
      const passed = relevant && gate.userData.gateIndex < race.checkpoint;
      material.uniforms.uColor.value.setRGB(
        ...(next
          ? [0.92, 0.46, 0.28]
          : passed
            ? [0.6, 0.75, 0.63]
            : relevant
              ? [0.82, 0.77, 0.63]
              : [0.67, 0.53, 0.4]),
      );
      material.uniforms.uEmission.value = next ? 0.2 : 0.02;
    }
    objects.target.visible = p.mode === "surface" && Boolean(boat.target);
    if (boat.target) {
      objects.target.position.set(
        boat.target.x,
        waveHeight(boat.target.x, boat.target.z, state.time) + 0.16,
        boat.target.z,
      );
      objects.target.scale.setScalar(1 + 0.05 * Math.sin(state.time * 2));
    }
    if (!p.paused || !state.initialized || !p.sailing)
      objects.wake.update(boat, state.time, p.sailing);
    if (p.activity === "lighthouse") {
      const angle = (p.lensBearing * Math.PI) / 180,
        fx = Math.sin(angle),
        fz = -Math.cos(angle);
      eye.set(-75 + fx * 3.05, 30.15, -135 + fz * 3.05);
      const nearest = lensStops.reduce((a, b) =>
        Math.abs(a.bearing - p.lensBearing) <
        Math.abs(b.bearing - p.lensBearing)
          ? a
          : b,
      );
      const target = destinations.find((d) => d.href.endsWith(nearest.slug));
      const range = target ? Math.hypot(target.x + 75, target.z + 135) : 180;
      aim.set(-75 + fx * range, 5, -135 + fz * range);
    } else if (p.mode === "reef") {
      const photo = p.panel === "photo",
        pose = reefCamera(
          diver,
          photo ? p.photoCamera.yaw : 0,
          photo ? p.photoCamera.zoom : p.actor === "diver" ? 1 : .64,
          nav,
        );
      eye.set(pose.x + origin.x, pose.y, pose.z + origin.z);
      aim.set(
        diver.x + origin.x + Math.sin(diver.heading) * 2,
        diver.y - 0.15,
        diver.z + origin.z - Math.cos(diver.heading) * 2,
      );
    } else if (p.activity === "fishing") {
      const fx = Math.sin(boat.heading), fz = -Math.cos(boat.heading);
      eye.set(boat.x - fx * (hull.length*.6+9) + Math.cos(boat.heading)*9, 7, boat.z - fz*(hull.length*.6+9)+Math.sin(boat.heading)*9);
      aim.set(boat.x-fx*(hull.length*.5+5),.1,boat.z-fz*(hull.length*.5+5));
    } else if (!p.sailing) {
      if (size.width < 700) {
        eye.set(48, 24, 64);
        aim.set(-63, 0, -37);
      } else {
        eye.set(76, 37, 89);
        aim.set(-133, 0, -54);
      }
    } else if (p.cameraMode === "follow") {
      if (!p.paused || state.cameraChanged) {
        const change = Math.atan2(
          Math.sin(boat.heading - state.cameraHeading),
          Math.cos(boat.heading - state.cameraHeading),
        );
        state.cameraHeading +=
          change * (!state.initialized ? 1 : 1 - Math.exp(-delta * 2.3));
      }
      const fx = Math.sin(state.cameraHeading),
        fz = -Math.cos(state.cameraHeading),
        speed = Math.max(0, boat.speed);
      const portrait = size.width < 700,
        trailingDistance =
          (portrait ? 41 : 27) + (boat.vesselId === "superyacht" ? 12 : 0) + speed * (portrait ? 0.16 : 0.1);
      eye.set(
        boat.x - fx * trailingDistance,
        (portrait ? 17 : 11.5) + boat.lift * 0.35,
        boat.z - fz * trailingDistance,
      );
      aim.set(
        boat.x + fx * (17 + speed * 0.18),
        1.4 + boat.lift * 0.22,
        boat.z + fz * (17 + speed * 0.18),
      );
    } else {
      eye.set(boat.x + 42, 51 + boat.lift * 0.16, boat.z + 62);
      aim.set(boat.x, 0, boat.z - 12);
    }
    const portraitInspection = size.width < 700 && size.width < size.height;
    if (p.inspection && (p.mode !== "reef" || p.region === "crown")) {
      const positions = {
        fish: { x: -4, y: -3.4, z: 7 },
        camouflage: { x: -17.25, y: -3.8, z: 7.7 },
        cleaner: { x: 11.6, y: -4.9, z: -8 },
      };
      if (p.inspection === "dakota") {
        const at = objects.wildlife.dakota.position;
        if (p.mode === "reef") {
          const subject = resolveReefPose({
              x: at.x - origin.x,
              y: at.y,
              z: at.z - origin.z,
              heading: -0.9,
            }, diver, nav).pose,
            cam = reefCamera(subject, 0, 1.1, nav);
          eye.set(cam.x + origin.x, cam.y, cam.z + origin.z);
        } else eye.set(at.x + 9, 6, at.z + 10);
        aim.copy(at);
      } else if (p.mode === "reef") {
        const at = positions[p.inspection],
          subject = resolveReefPose({
            ...at,
            heading:
              p.inspection === "fish"
                ? 0
                : p.inspection === "camouflage"
                  ? 0.7
                  : -0.8,
          }, diver, nav).pose;
        const cam = reefCamera(
          subject,
          0,
          p.inspection === "fish" ? (portraitInspection ? 2.2 : 1.9) : 0.68,
          nav,
        );
        eye.set(cam.x + origin.x, cam.y, cam.z + origin.z);
        aim.set(at.x + origin.x, at.y, at.z + origin.z);
      }
    }
    if (p.diving && p.mode === "reef") {
      if (!p.paused)
        state.diveProgress = Math.min(1, state.diveProgress + delta / 1.7);
      const t =
        state.diveProgress * state.diveProgress * (3 - 2 * state.diveProgress);
      const startX = origin.x + diver.x + 2,
        startZ = origin.z + diver.z + 2;
      if (state.diveFromSurface && !region.cave) {
      eye.set(
        startX + (eye.x - startX) * t,
        3.6 + (eye.y - 3.6) * t,
        startZ + (eye.z - startZ) * t,
      );
      aim.set(origin.x + diver.x, -1 + (aim.y + 1) * t, origin.z + diver.z);
      }
      if (state.diveProgress >= 1) p.onDiveEnd();
    }
    if (p.panel === "photo" && p.mode !== "reef") {
      const dx = eye.x - boat.x,
        dz = eye.z - boat.z,
        a = p.photoCamera.yaw,
        z = p.photoCamera.zoom;
      eye.set(
        boat.x + (dx * Math.cos(a) - dz * Math.sin(a)) * z,
        Math.max(4, eye.y * z),
        boat.z + (dx * Math.sin(a) + dz * Math.cos(a)) * z,
      );
      aim.set(boat.x, 1, boat.z);
    }
    if (!p.paused || !state.initialized || state.cameraChanged) {
      const blend =
        p.mode === "reef" ||
        p.activity === "lighthouse" ||
        !state.initialized ||
        p.paused
          ? 1
          : 1 - Math.exp(-delta * 2.3);
      camera.position.lerp(eye, blend);
      currentAim.lerp(aim, blend);
      camera.lookAt(currentAim);
      if (camera instanceof PerspectiveCamera) {
        const desiredFov = !p.sailing
          ? size.width < 700
            ? 42
            : 43.703996
          : p.activity === "lighthouse"
            ? 28
            : p.inspection === "fish" && portraitInspection
              ? 78
              : p.mode === "reef"
                ? 58
                : p.sailing && p.cameraMode === "follow"
                  ? 48 + Math.min(Math.max(boat.speed - 12, 0) / 14, 1) * 6
                  : 48;
        camera.fov +=
          (desiredFov - camera.fov) *
          (!state.initialized || p.paused ? 1 : 1 - Math.exp(-delta * 3));
        if (p.activity === "lighthouse")
          camera.setViewOffset(
            size.width,
            size.height,
            size.width < 700 ? 0 : -size.width * 0.18,
            size.width < 700 ? size.height * 0.23 : 0,
            size.width,
            size.height,
          );
        else if (p.inspection)
          camera.setViewOffset(
            size.width,
            size.height,
            portraitInspection ? 0 : -size.width * 0.17,
            portraitInspection
              ? size.height * (size.height < 700 ? 0.27 : 0.15)
              : 0,
            size.width,
            size.height,
          );
        else if (!p.sailing && size.width >= 700)
          camera.setViewOffset(size.width,size.height,-size.width*.114,0,size.width,size.height);
        else if (p.mode === "reef" && p.actor !== "diver" && size.width < 700)
          camera.setViewOffset(size.width,size.height,0,size.height*.18,size.width,size.height);
        else camera.clearViewOffset();
        camera.updateProjectionMatrix();
      }
    }
    // When a narrow fish passage brings the eye inside its avatar, use the
    // same actor in a first-person view rather than rendering through its body.
    for (const resident of companions.group.children) {
      if (resident.userData.controlled) {
        resident.getWorldPosition(objects.projection);
        resident.visible = camera.position.distanceTo(objects.projection) > .55;
      }
    }
    // Evaluate detail after the camera is placed, including one-off Quiet
    // renders. A previous dive must not add distant reef work to the opening.
    // Continuous bathymetry and Dakota remain available at every distance.
    const reefDetailVisible =
      p.activity !== "lighthouse" &&
      (p.mode === "reef" ||
        Math.hypot(
          camera.position.x - origin.x,
          camera.position.z - origin.z,
        ) < 110);
    objects.wildlife.reef.visible = reefDetailVisible && (p.mode !== "reef" || p.region === "crown");
    for (const buoy of objects.buoys)
      buoy.visible =
        p.mode !== "reef" &&
        (p.quality === "high" ||
          camera.position.distanceTo(buoy.position) < 130);
    state.cameraChanged = false;
    state.telemetry += delta;
    if (state.telemetry > 0.1 || !state.initialized) {
      state.telemetry = 0;
      p.onTelemetry({ ...boat });
      p.onGameTelemetry();
      if (p.mode === "reef") p.onReefTelemetry({ ...p.reef.current });
      const anchors =
        p.mode === "reef"
          ? p.region === "crown" ? [
              { id: "dakota", point: objects.wildlife.dakota.position },
              { id: "fish", point: new Vector3(-69, -3.2, -8) },
              { id: "camouflage", point: new Vector3(-82.25, -3.7, -7.3) },
              { id: "cleaner", point: new Vector3(-53.4, -4.5, -23) },
              { id: "current", point: new Vector3(-81, -3.8, -21) },
            ] : []
          : [
              { id: "dakota", point: objects.wildlife.dakota.position },
              { id: "lighthouse", point: new Vector3(-75, 24, -135) },
              { id: "reef", point: new Vector3(-35, 1, -15) },
              ...regionIds.filter(id => id !== "crown").map(id => ({id:`region-${id}`,point:new Vector3(getRegion(id).surfaceEntrance.x,3,getRegion(id).surfaceEntrance.z)})),
              ...destinations.map((d) => ({
                id: d.id,
                point: new Vector3(d.x, 7, d.z),
              })),
            ];
      p.onLandmarks(
        p.sailing
          ? anchors
              .filter(
                (a) =>
                  a.id !== "dakota" || (!p.guideHidden && p.characterRequested),
              )
              .map((anchor) => {
                const projected = objects.projection
                  .copy(anchor.point)
                  .project(camera);
                const distance = camera.position.distanceTo(anchor.point);
                return {
                  id: anchor.id,
                  x: Math.round((projected.x + 1) * 500) / 10,
                  y: Math.round((1 - projected.y) * 500) / 10,
                  visible:
                    projected.z < 1 &&
                    projected.z > -1 &&
                    Math.abs(projected.x) < 1 &&
                    distance < (p.mode === "reef" ? 34 : 190),
                };
              })
          : [],
      );
    }
    if (!p.paused) {
      sample.current.time += Math.max(rawDelta, 0);
      sample.current.frames++;
      if (sample.current.time > 3) {
        p.onPerformance({
          fps: sample.current.frames / sample.current.time,
          draws: gl.info.render.calls,
          triangles: gl.info.render.triangles,
        });
        sample.current = { time: 0, frames: 0 };
      }
    }
    state.initialized = true;
  });
  useEffect(() => {
    pointer.current = null;
  }, [props.mode, props.panel, props.paused, props.activity]);
  const encounterOf = (event: ThreeEvent<PointerEvent>): EncounterId | null => {
    let object: Object3D | null = event.object;
    while (object && !object.userData.encounter) object = object.parent;
    return object?.userData.encounter ?? null;
  };
  const isVisibleHit = (event: ThreeEvent<PointerEvent>) => {
    // Three raycasts hidden hierarchies too. Ignore those hits without stopping
    // propagation, so the visible water or resident behind them can respond.
    for (
      let object: Object3D | null = event.object;
      object;
      object = object.parent
    )
      if (!object.visible) return false;
    return true;
  };
  const pointerDown = (event: ThreeEvent<PointerEvent>) => {
    if (!isVisibleHit(event)) return;
    event.stopPropagation();
    pointer.current = {
      x: event.clientX,
      y: event.clientY,
      time: performance.now(),
      epoch: latest.current.gestureEpoch.current,
      target: encounterOf(event),
    };
  };
  const pointerUp = (event: ThreeEvent<PointerEvent>) => {
    if (!isVisibleHit(event)) return;
    const down = pointer.current,
      p = latest.current;
    pointer.current = null;
    if (
      !down ||
      down.epoch !== p.gestureEpoch.current ||
      p.panel ||
      p.diving ||
      p.mode === "entering" ||
      event.button !== 0 ||
      performance.now() - down.time > 650 ||
      Math.hypot(event.clientX - down.x, event.clientY - down.y) > 7
    )
      return;
    event.stopPropagation();
    if (event.instanceId !== undefined && event.object.userData.portalIds) {
      const id = event.object.userData.portalIds[event.instanceId];
      const portal = regionPortals.find(portal => portal.id === id);
      if (portal) { p.onRegion(portal.to, portal.id); return; }
    }
    let marker: Object3D | null = event.object;
    while(marker && !marker.userData.diveRegion) marker = marker.parent;
    if(marker && p.mode === "surface") { p.onRegion(marker.userData.diveRegion); return; }
    let resident: Object3D | null = event.object;
    while (resident && !resident.userData.companion) resident = resident.parent;
    if (resident && p.mode === "reef") { p.onCompanion(resident.userData.companion); return; }
    const encounter = encounterOf(event);
    if (encounter && encounter === down.target) {
      p.onEncounter(encounter);
      return;
    }
    if (!p.paused && !down.target)
      p.onCourse({ x: event.point.x, z: event.point.z });
  };
  return (
    <>
      <hemisphereLight
        args={[
          SEA_LIGHTING.skyColor,
          SEA_LIGHTING.groundColor,
          SEA_LIGHTING.hemisphereIntensity * (props.mode === "reef" && getRegion(props.region).cave ? (props.visibilityAssist ? .75 : .33) : 1),
        ]}
      />
      <directionalLight
        color={SEA_LIGHTING.sunColor}
        intensity={SEA_LIGHTING.sunIntensity * (props.mode === "reef" && getRegion(props.region).cave ? .18 : 1)}
        position={SEA_LIGHTING.sunDirection.clone().multiplyScalar(200)}
      />
      <primitive object={objects.sky} />
      <primitive
        object={objects.seabed}
        onPointerDown={pointerDown}
        onPointerUp={pointerUp}
      />
      {habitat && <primitive object={habitat} onPointerDown={pointerDown} onPointerUp={pointerUp} />}
      <primitive object={companions.group} onPointerDown={pointerDown} onPointerUp={pointerUp} />
      <primitive object={objects.fauna.group} />
      <primitive object={objects.activities.group} onPointerDown={pointerDown} onPointerUp={pointerUp} />
      <primitive object={objects.anchoredYacht} />
      <primitive
        object={objects.wildlife.group}
        onPointerDown={pointerDown}
        onPointerUp={pointerUp}
      />
      <primitive
        object={objects.ocean}
        onPointerDown={pointerDown}
        onPointerUp={pointerUp}
        onPointerCancel={() => {
          pointer.current = null;
        }}
      />
      <primitive
        object={objects.architecture}
        onPointerDown={pointerDown}
        onPointerUp={pointerUp}
      />
      <primitive object={objects.playground} />
      {objects.buoys.map((buoy, i) => (
        <primitive key={destinations[i].id} object={buoy} />
      ))}
      {objects.diveMarkers.map(marker => <primitive key={marker.name} object={marker} onPointerDown={pointerDown} onPointerUp={pointerUp} />)}
      <primitive object={objects.yacht} />
      <primitive object={objects.target} />
      <primitive object={objects.wake.mesh} />
    </>
  );
}
export default function OpenWaterScene(props: OpenWaterSceneProps) {
  return (
    <GraphicsBoundary onError={props.onError}>
      <Canvas
        aria-hidden="true"
        className="ow-canvas"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          touchAction: "pan-y pinch-zoom",
        }}
        dpr={
          props.quality === "low"
            ? 1
            : Math.min(window.devicePixelRatio || 1, 1.5)
        }
        frameloop={props.paused ? "demand" : "always"}
        camera={{ position: [-55, 28, 105], fov: 48, near: 0.15, far: 3000 }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
          toneMapping: NoToneMapping,
        }}
        fallback={
          <span>
            Your browser can explore the portfolio through the work index.
          </span>
        }
      >
        <World {...props} />
      </Canvas>
    </GraphicsBoundary>
  );
}
