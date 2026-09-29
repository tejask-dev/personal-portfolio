import {
  Component,
  useEffect,
  useMemo,
  useRef,
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
  Mesh,
  Group,
  MeshBasicMaterial,
  NoToneMapping,
  PerspectiveCamera,
  ShaderMaterial,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from "three";
import { destinations } from "../data/world";
import { updateRace, type RaceState } from "../systems/raceController";
import {
  stepBoat,
  waveHeight,
  type BoatState,
  type Input,
} from "../systems/boatController";
import { createEnvironment, skyMaterial } from "./materials";
import {
  createArchitecture,
  createBuoy,
  createPlayground,
  createYacht,
  disposeModel,
} from "./models";
import { createOcean } from "./Ocean";
import { Wake } from "./Wake";
import { loadYachtAsset, disposeYachtAsset } from "./YachtAsset";

export type LandmarkProjection = {
  id: string;
  x: number;
  y: number;
  visible: boolean;
};
export type OpenWaterSceneProps = {
  boat: MutableRefObject<BoatState>;
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
  const latest = useRef(props);
  latest.current = props;
  const runtime = useRef({
    time: 14,
    accumulator: 0,
    telemetry: 0,
    initialized: false,
    resume: true,
    failed: false,
    cameraChanged: true,
    lightChanged: true,
    cameraHeading: props.boat.current.heading,
  });
  const pointer = useRef<{ x: number; y: number; time: number } | null>(null);
  const objects = useMemo(() => {
    const environment = createEnvironment();
    const ocean = createOcean(environment),
      architecture = createArchitecture(environment),
      playground = createPlayground(environment),
      fallbackYacht = createYacht(environment);
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
      architecture,
      playground,
      yacht,
      fallbackYacht,
      sky,
      buoys,
      target,
      wake: new Wake(environment),
      eye: new Vector3(),
      aim: new Vector3(),
      currentAim: new Vector3(),
      projection: new Vector3(),
    };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    let loaded: Group | null = null;
    latest.current.onYachtModel("loading");
    loadYachtAsset(objects.environment, controller.signal)
      .then((model) => {
        if (controller.signal.aborted) {
          disposeYachtAsset(model);
          return;
        }
        loaded = model;
        objects.yacht.add(model);
        objects.fallbackYacht.visible = false;
        latest.current.onYachtModel("licensed");
        invalidate();
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          latest.current.onYachtModel("procedural");
          invalidate();
        }
      });
    return () => {
      controller.abort();
      if (loaded) {
        objects.yacht.remove(loaded);
        disposeYachtAsset(loaded);
      }
    };
  }, [objects, invalidate]);
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
      disposeModel(objects.architecture);
      disposeModel(objects.playground);
      disposeModel(objects.fallbackYacht);
      objects.buoys.forEach(disposeModel);
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
    if (state.failed) return;
    const delta = state.resume ? 1 / 60 : Math.min(rawDelta, 0.06);
    state.resume = false;
    if (!p.paused) {
      state.time += delta;
      if (p.sailing) {
        state.accumulator += delta;
        let steps = 0;
        while (state.accumulator >= 1 / 60 && steps < 4) {
          if (p.race.current.phase !== "countdown")
            stepBoat(boat, p.input.current, 1 / 60);
          updateRace(p.race.current, boat, 1 / 60);
          state.accumulator -= 1 / 60;
          steps++;
        }
      }
    }
    const { environment, yacht, buoys, eye, aim, currentAim } = objects;
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
      boat.x + forwardX * 5,
      boat.z + forwardZ * 5,
      state.time,
    );
    const stern = waveHeight(
      boat.x - forwardX * 5,
      boat.z - forwardZ * 5,
      state.time,
    );
    const port = waveHeight(
      boat.x - starboardX * 1.6,
      boat.z - starboardZ * 1.6,
      state.time,
    );
    const starboard = waveHeight(
      boat.x + starboardX * 1.6,
      boat.z + starboardZ * 1.6,
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
          : Math.atan2(bow - stern, 10),
      -boat.heading,
      (boat.airborne ? 0 : Math.atan2(starboard - port, 3.2)) -
        boat.turn * boat.speed * 0.004,
      "YXZ",
    );
    buoys.forEach((buoy, i) => {
      const dock = destinations[i].dock;
      buoy.position.y = waveHeight(dock.x, dock.z, state.time);
    });
    const race = p.race.current;
    for (const gate of objects.playground.userData.gates as Mesh[]) {
      const material = gate.material as ShaderMaterial;
      const relevant =
        race.phase !== "idle" && gate.userData.courseId === race.courseId;
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
    objects.target.visible = Boolean(boat.target);
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
    if (!p.sailing) {
      if (size.width < 700) {
        eye.set(-52, 40, 125);
        aim.set(8, 18, 25);
      } else {
        eye.set(-55, 34, 105);
        aim.set(5, 0, -25);
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
          (portrait ? 41 : 27) + speed * (portrait ? 0.16 : 0.1);
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
    if (!p.paused || !state.initialized || state.cameraChanged) {
      const blend =
        !state.initialized || p.paused ? 1 : 1 - Math.exp(-delta * 2.3);
      camera.position.lerp(eye, blend);
      currentAim.lerp(aim, blend);
      camera.lookAt(currentAim);
      if (camera instanceof PerspectiveCamera) {
        const desiredFov =
          p.sailing && p.cameraMode === "follow"
            ? 48 + Math.min(Math.max(boat.speed - 12, 0) / 14, 1) * 6
            : 48;
        camera.fov +=
          (desiredFov - camera.fov) *
          (!state.initialized || p.paused ? 1 : 1 - Math.exp(-delta * 3));
        camera.updateProjectionMatrix();
      }
    }
    state.cameraChanged = false;
    state.telemetry += delta;
    if (state.telemetry > 0.1 || !state.initialized) {
      state.telemetry = 0;
      p.onTelemetry({ ...boat });
      if (!p.sailing)
        p.onLandmarks(
          destinations.map((destination) => {
            const projected = objects.projection
              .set(destination.x, 7, destination.z)
              .project(camera);
            return {
              id: destination.id,
              x: Math.round((projected.x + 1) * 500) / 10,
              y: Math.round((1 - projected.y) * 500) / 10,
              visible:
                projected.z < 1 &&
                projected.z > -1 &&
                Math.abs(projected.x) < 1.08,
            };
          }),
        );
    }
    state.initialized = true;
  });
  const pointerDown = (event: ThreeEvent<PointerEvent>) => {
    pointer.current = {
      x: event.clientX,
      y: event.clientY,
      time: performance.now(),
    };
  };
  const pointerUp = (event: ThreeEvent<PointerEvent>) => {
    const down = pointer.current;
    pointer.current = null;
    if (
      !down ||
      props.paused ||
      event.button !== 0 ||
      performance.now() - down.time > 650 ||
      Math.hypot(event.clientX - down.x, event.clientY - down.y) > 7
    )
      return;
    event.stopPropagation();
    props.onCourse({ x: event.point.x, z: event.point.z });
  };
  return (
    <>
      <primitive object={objects.sky} />
      <primitive
        object={objects.ocean}
        onPointerDown={pointerDown}
        onPointerUp={pointerUp}
        onPointerCancel={() => {
          pointer.current = null;
        }}
      />
      <primitive object={objects.architecture} />
      <primitive object={objects.playground} />
      {objects.buoys.map((buoy, i) => (
        <primitive key={destinations[i].id} object={buoy} />
      ))}
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
        dpr={[1, 1.5]}
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
