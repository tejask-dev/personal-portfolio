import { useEffect, useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ACESFilmicToneMapping, Color, PerspectiveCamera, SRGBColorSpace, Vector3 } from "three";
import { createScubaWorld, scubaCameraFrame, smooth } from "./scubaGeometry";

export type ScubaSceneProps = {
  progress: number;
  active: boolean;
  progressRef?: Readonly<{ current: number }>;
  onReady?: () => void;
  onFailure?: () => void;
};
const clamp = (n: number) => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));

function Descent({ progress, progressRef, active, onReady, onFailure, telemetry }: ScubaSceneProps & { telemetry: RefObject<HTMLDivElement> }) {
  const world = useMemo(createScubaWorld, []);
  const { camera, gl, scene, size } = useThree();
  const clock = useRef(0), current = useRef(clamp(progressRef?.current ?? progress)), ready = useRef(false), lastTelemetry = useRef(-1);
  const target = useMemo(() => new Vector3(), []);
  const sky = useMemo(() => new Color("#a9c5bd"), []);
  const shallow = useMemo(() => new Color("#237b80"), []);
  const deep = useMemo(() => new Color("#061e35"), []);
  const background = useMemo(() => new Color(), []);

  useEffect(() => {
    const lost = (event: Event) => { event.preventDefault(); onFailure?.(); };
    gl.domElement.addEventListener("webglcontextlost", lost);
    return () => gl.domElement.removeEventListener("webglcontextlost", lost);
  }, [gl, onFailure]);
  useEffect(() => () => world.dispose(), [world]);

  // This is the sole animation clock. Parent scrolling only supplies a target;
  // all camera, fish, fins, water, bubbles and caustics share the paused time.
  useFrame((_, delta) => {
    if (!active) return;
    const dt = Math.min(Math.max(delta, 0), .05);
    clock.current += dt;
    current.current += (clamp(progressRef?.current ?? progress) - current.current) * (1 - Math.exp(-dt * 9));
    const p = current.current, aspect = size.width / Math.max(1, size.height), view = scubaCameraFrame(p, aspect);
    camera.position.set(view.x, view.y, view.z);
    if (camera instanceof PerspectiveCamera) {
      if (camera.fov !== view.fov) { camera.fov = view.fov; camera.updateProjectionMatrix(); }
    }
    target.set(camera.position.x, view.y - view.lookDown, -12);
    camera.lookAt(target);
    background.copy(sky).lerp(shallow, smooth(.16, .31, p)).lerp(deep, smooth(.50, 1, p));
    scene.background = background;
    world.update(clock.current, p, aspect);
    gl.domElement.dataset.scubaProgress = p.toFixed(4);
    gl.domElement.dataset.scubaCameraY = camera.position.y.toFixed(4);
    gl.domElement.dataset.scubaCameraZ = camera.position.z.toFixed(4);
    gl.domElement.dataset.scubaFrame = String(gl.info.render.frame);
    gl.domElement.dataset.triangles = String(gl.info.render.triangles);
    gl.domElement.dataset.drawCalls = String(gl.info.render.calls);
    if (clock.current - lastTelemetry.current > .5 && telemetry.current) {
      const element = telemetry.current;
      element.dataset.progress = p.toFixed(3);
      element.dataset.depth = (p * 24).toFixed(1);
      element.dataset.cameraY = camera.position.y.toFixed(3);
      element.dataset.cameraZ = camera.position.z.toFixed(3);
      element.dataset.underwater = String(camera.position.y < 0);
      element.dataset.draws = String(gl.info.render.calls);
      element.dataset.triangles = String(gl.info.render.triangles);
      lastTelemetry.current = clock.current;
    }
    if (!ready.current) { ready.current = true; onReady?.(); }
  });
  return <primitive object={world.group} dispose={null} />;
}

/** Decorative, noninteractive background. The parent retains all reading,
 * scrolling, accessibility, reduced-motion and static-poster behavior. */
export default function ScubaScene(props: ScubaSceneProps) {
  const telemetry = useRef<HTMLDivElement>(null);
  return <div ref={telemetry} className="scuba-scene-canvas" data-testid="scuba-scene-canvas" data-active={props.active} aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
    <Canvas
      aria-hidden="true"
      fallback={null}
      frameloop={props.active ? "always" : "demand"}
      dpr={[1, 1.4]}
      camera={{ position: [0, 2.8, 17.8], fov: 43, near: .08, far: 90 }}
      gl={{ alpha: false, antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => { gl.outputColorSpace = SRGBColorSpace; gl.toneMapping = ACESFilmicToneMapping; gl.toneMappingExposure = 1.08; }}
      style={{ width: "100%", height: "100%" }}
    >
      <Descent {...props} telemetry={telemetry} />
    </Canvas>
  </div>;
}
