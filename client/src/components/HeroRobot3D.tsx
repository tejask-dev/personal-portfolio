import { Suspense, useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { MODEL_READY_EVENT, PRELOADER_DONE_EVENT } from './Preloader';

const typingBoneNames = [
  'thighL',
  'thighR',
  'shinL',
  'shinR',
  'forearmL',
  'forearmR',
  'handL',
  'handR',
  'f_pinky03R',
  'f_pinky02L',
  'f_pinky02R',
  'f_pinky01L',
  'f_pinky01R',
  'palm04L',
  'palm04R',
  'f_ring01L',
  'thumb01L',
  'thumb01R',
  'thumb03L',
  'thumb03R',
  'palm02L',
  'palm02R',
  'palm01L',
  'palm01R',
  'f_index01L',
  'f_index01R',
  'palm03L',
  'palm03R',
  'f_ring02L',
  'f_ring02R',
  'f_ring01R',
  'f_ring03L',
  'f_ring03R',
  'f_middle01L',
  'f_middle02L',
  'f_middle03L',
  'f_middle01R',
  'f_middle02R',
  'f_middle03R',
  'f_index02L',
  'f_index03L',
  'f_index02R',
  'f_index03R',
  'thumb02L',
  'f_pinky03L',
  'upper_armL',
  'upper_armR',
  'thumb02R',
  'toeL',
  'heel02L',
  'toeR',
  'heel02R',
];

const eyebrowBoneNames = ['eyebrow_L', 'eyebrow_R'];

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function filteredClip(clip: THREE.AnimationClip | undefined, boneNames: string[]) {
  if (!clip) return null;
  const tracks = clip.tracks.filter((track) => boneNames.some((boneName) => track.name.includes(boneName)));
  return new THREE.AnimationClip(`${clip.name}_filtered`, clip.duration, tracks);
}

type CharacterProps = {
  /** Scroll storytelling progress, 0 at top of page → 1 at the about section. */
  progressRef?: MutableRefObject<number>;
};

function Character({ progressRef }: CharacterProps) {
  const gltf = useGLTF('/models/character.glb') as unknown as {
    scene: THREE.Group;
    animations: THREE.AnimationClip[];
  };
  // Use the scene directly — a plain clone() breaks SkinnedMesh skeleton
  // bindings, leaving the character frozen in bind pose.
  const model = gltf.scene;
  const mixer = useMemo(() => new THREE.AnimationMixer(model), [model]);
  const headBone = useRef<THREE.Object3D | null>(null);
  const eyebrowAction = useRef<THREE.AnimationAction | null>(null);
  const pointerTarget = useRef({ x: 0, y: 0 });
  const mouse = useRef({ x: 0, y: 0 });
  const { gl, scene, camera } = useThree();

  useEffect(() => {
    // Track the cursor across the whole page like the reference scene, not
    // just over this canvas.
    const onMouseMove = (event: MouseEvent) => {
      mouse.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };
    document.addEventListener('mousemove', onMouseMove);
    return () => document.removeEventListener('mousemove', onMouseMove);
  }, []);

  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1;

    model.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        mesh.frustumCulled = true;
      }
    });

    headBone.current = model.getObjectByName('spine006') ?? null;

    // The monitor and its glow start invisible in the reference scene so the
    // landing view shows the full character at the desk.
    model.children.forEach((object) => {
      if (object.name === 'Plane004') {
        object.children.forEach((child) => {
          const material = (child as THREE.Mesh).material as THREE.Material;
          material.transparent = true;
          material.opacity = 0;
        });
      }
      if (object.name === 'screenlight') {
        const material = (object as THREE.Mesh).material as THREE.Material;
        material.transparent = true;
        material.opacity = 0;
      }
    });
    model.getObjectByName('footR')?.position.setY(3.36);
    model.getObjectByName('footL')?.position.setY(3.36);

    // Hold the first intro frame while the preloader is up, then play the
    // entrance once it clears so the robot never pops in mid-animation.
    const intro = THREE.AnimationClip.findByName(gltf.animations, 'introAnimation');
    let introAction: THREE.AnimationAction | null = null;
    if (intro) {
      introAction = mixer.clipAction(intro);
      introAction.setLoop(THREE.LoopOnce, 1);
      introAction.clampWhenFinished = true;
      introAction.reset().play();
      introAction.paused = true;
    }

    let started = false;
    const startIntro = () => {
      if (started) return;
      started = true;
      if (introAction) introAction.paused = false;
    };

    window.dispatchEvent(new Event(MODEL_READY_EVENT));
    if (window.__tkPreloaderDone) startIntro();
    window.addEventListener(PRELOADER_DONE_EVENT, startIntro);
    const introFallback = window.setTimeout(startIntro, 4500);

    if (!prefersReducedMotion()) {
      ['key1', 'key2', 'key5', 'key6'].forEach((name) => {
        const clip = THREE.AnimationClip.findByName(gltf.animations, name);
        if (!clip) return;
        const action = mixer.clipAction(clip);
        action.timeScale = 1.2;
        action.play();
      });

      const typingClip = filteredClip(THREE.AnimationClip.findByName(gltf.animations, 'typing'), typingBoneNames);
      if (typingClip) {
        const action = mixer.clipAction(typingClip);
        action.timeScale = 1.2;
        action.play();
      }
    }

    const browClip = filteredClip(THREE.AnimationClip.findByName(gltf.animations, 'browup'), eyebrowBoneNames);
    if (browClip) {
      eyebrowAction.current = mixer.clipAction(browClip);
      eyebrowAction.current.setLoop(THREE.LoopOnce, 1);
      eyebrowAction.current.clampWhenFinished = true;
    }

    const blink = THREE.AnimationClip.findByName(gltf.animations, 'Blink');
    const blinkTimer = window.setTimeout(() => {
      if (blink && !prefersReducedMotion()) mixer.clipAction(blink).fadeIn(0.5).play();
    }, 1700);

    return () => {
      window.clearTimeout(blinkTimer);
      window.clearTimeout(introFallback);
      window.removeEventListener(PRELOADER_DONE_EVENT, startIntro);
      mixer.stopAllAction();
      scene.environment = null;
    };
  }, [camera, gl, gltf.animations, mixer, model, scene]);

  useFrame((_state, delta) => {
    pointerTarget.current.x = THREE.MathUtils.lerp(pointerTarget.current.x, mouse.current.x, 0.08);
    pointerTarget.current.y = THREE.MathUtils.lerp(pointerTarget.current.y, mouse.current.y, 0.08);

    // Scroll storytelling, mirroring the reference timelines: the character
    // turns through the hero (y 0→0.7) and settles further (y→0.92, x→0.12)
    // as the about section takes over.
    if (progressRef && !prefersReducedMotion()) {
      const progress = THREE.MathUtils.clamp(progressRef.current, 0, 1);
      const targetY = progress < 0.5 ? progress * 2 * 0.7 : 0.7 + (progress - 0.5) * 2 * 0.22;
      const targetX = Math.max(0, progress - 0.5) * 2 * 0.12;
      model.rotation.y = THREE.MathUtils.lerp(model.rotation.y, targetY, 0.1);
      model.rotation.x = THREE.MathUtils.lerp(model.rotation.x, targetX, 0.1);
    }

    if (headBone.current && !prefersReducedMotion()) {
      const maxRotation = Math.PI / 6;
      headBone.current.rotation.y = THREE.MathUtils.lerp(
        headBone.current.rotation.y,
        pointerTarget.current.x * maxRotation,
        0.14,
      );
      headBone.current.rotation.x = THREE.MathUtils.lerp(
        headBone.current.rotation.x,
        -pointerTarget.current.y * 0.35 - 0.08,
        0.12,
      );
    }

    mixer.update(delta);
  });

  return (
    <group
      onPointerEnter={() => eyebrowAction.current?.reset().setEffectiveWeight(4).fadeIn(0.25).play()}
      onPointerLeave={() => eyebrowAction.current?.fadeOut(0.45)}
    >
      <primitive object={model} />
    </group>
  );
}

function RobotScene({ progressRef }: CharacterProps) {
  return (
    <>
      <ambientLight intensity={0.25} />
      <directionalLight position={[-0.47, -0.32, -1]} intensity={1.2} color="#c7a9ff" />
      <pointLight position={[3, 12, 4]} intensity={4.5} color="#c2a4ff" distance={100} decay={3} />
      <Environment files="/models/char_enviorment.hdr" environmentIntensity={0.64} />
      <Character progressRef={progressRef} />
    </>
  );
}

type HeroRobot3DProps = CharacterProps & {
  /** Vertical camera offset so narrow viewports can frame more of the body. */
  cameraY?: number;
  /** Camera zoom — lower shows more of the scene (full-viewport stage uses less). */
  zoom?: number;
};

export default function HeroRobot3D({ progressRef, cameraY = 12.1, zoom = 1.1 }: HeroRobot3DProps) {
  return (
    <Canvas
      camera={{ position: [0, cameraY, 24.7], fov: 14.5, zoom }}
      onCreated={({ camera }) => {
        // R3F aims the default camera at the origin; the reference scene
        // looks straight ahead so the seated character fills the frame.
        camera.lookAt(0, cameraY, 0);
      }}
      dpr={[1, 2]}
      gl={{ antialias: window.devicePixelRatio < 2, alpha: true, powerPreference: 'high-performance' }}
      style={{ background: 'transparent' }}
      performance={{ min: 0.5 }}
    >
      <Suspense fallback={null}>
        <RobotScene progressRef={progressRef} />
      </Suspense>
    </Canvas>
  );
}

useGLTF.preload('/models/character.glb');
