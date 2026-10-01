import type { MeshStandardMaterial } from "three";

/** Adapted from 0s0ka/sea's tail-weighted traveling swim wave (MIT).
 * https://github.com/0s0ka/sea/blob/d773646bfe5e66d8ab312429591b4dbf12e3d389/src/fishMaterial.js
 * Copyright (c) 2026 0s0ka. Full notice: assets/open-water-v4/THIRD-PARTY-SWIMMING.txt
 * Changes: defined ascending envelope, corrected normals, local clocks,
 * per-instance phase, CPU deformation for companions and steering curvature.
 */
export const SWIM_WAVENUMBER = Math.PI * 1.5;
export const SWIM_REACH_START = 0.18;

/** A stable head and a broad, visible stroke behind the shoulders. The derivative
 * is with respect to normalized nose-to-tail distance, not world coordinates. */
export function swimEnvelope(along: number) {
  const t = Math.min(1, Math.max(0, (along - SWIM_REACH_START) / (1 - SWIM_REACH_START)));
  return { weight: t * t * (3 - 2 * t), slope: along > SWIM_REACH_START && along < 1 ? 6 * t * (1 - t) / (1 - SWIM_REACH_START) : 0 };
}

export function swimWave(along: number, phase: number, amplitude: number, turn = 0) {
  const { weight, slope } = swimEnvelope(along);
  const angle = along * SWIM_WAVENUMBER - phase;
  return {
    offset: weight * (Math.sin(angle) * amplitude + turn),
    slope: slope * (Math.sin(angle) * amplitude + turn) + weight * Math.cos(angle) * SWIM_WAVENUMBER * amplitude,
  };
}

/** Same deformation as the CPU companion rig, batched on the GPU for schools.
 * x'=x+wave(z) is a shear, so its normal uses the inverse-transpose Jacobian.
 * No scene timer, material replacement, per-fish draw, or per-frame allocation. */
export function applyFishSwimming(material: MeshStandardMaterial, clock: { value: number }, options: {
  headZ: number; length: number; direction?: 1 | -1; phaseAttribute?: string; amplitude?: number; frequency?: number;
}) {
  const previous = material.onBeforeCompile, cacheKey = material.customProgramCacheKey();
  const head = { value: options.headZ }, length = { value: options.length };
  const direction = options.direction ?? 1, amplitude = options.amplitude ?? 0.13, frequency = options.frequency ?? 2.2;
  const phase = options.phaseAttribute ?? "0.0";
  material.userData.swimDimensions = { head, length };
  material.onBeforeCompile = (shader, renderer) => {
    previous.call(material, shader, renderer);
    shader.uniforms.uSwimClock = clock; shader.uniforms.uSwimHead = head; shader.uniforms.uSwimLength = length;
    shader.vertexShader = `uniform float uSwimClock;\nuniform float uSwimHead;\nuniform float uSwimLength;\n${options.phaseAttribute ? `attribute float ${options.phaseAttribute};` : ""}\n${shader.vertexShader}`;
    shader.vertexShader = shader.vertexShader.replace("#include <beginnormal_vertex>", `#include <beginnormal_vertex>
      float swimAlong = (position.z - uSwimHead) * ${direction.toFixed(1)} / uSwimLength;
      float swimT = clamp((swimAlong - 0.18) / 0.82, 0.0, 1.0);
      float swimWeight = swimT * swimT * (3.0 - 2.0 * swimT);
      float swimSlope = (swimAlong > 0.18 && swimAlong < 1.0) ? 6.0 * swimT * (1.0 - swimT) / 0.82 : 0.0;
      float swimAngle = swimAlong * ${SWIM_WAVENUMBER.toFixed(9)} - uSwimClock * ${(Math.PI * 2 * frequency).toFixed(9)} + ${phase};
      float swimBend = sin(swimAngle) * ${amplitude.toFixed(5)} * uSwimLength * swimWeight;
      float swimGradient = ${direction.toFixed(1)} * ${amplitude.toFixed(5)} * (swimSlope * sin(swimAngle) + swimWeight * cos(swimAngle) * ${SWIM_WAVENUMBER.toFixed(9)});
      objectNormal.z -= objectNormal.x * swimGradient;
      objectNormal = normalize(objectNormal);`);
    shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\ntransformed.x += swimBend;");
  };
  material.customProgramCacheKey = () => `${cacheKey}/swim-wave-v1/${direction}/${amplitude}/${frequency}/${phase}`;
  return material;
}
