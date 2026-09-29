# Open Water: sources and material provenance

Verified against the local installation on 2026-09-29. The scene now includes one locally hosted CC-BY yacht model, documented below. It introduces no HDRI, texture, font, audio file, third-party runtime graphics service, or new rendering dependency.

## Owner-supplied reference

Source bundle: `Tejass_Open_Water_Codex_Master_Prompt.md`, `Tejass_Open_Water_Creative_Direction.md`, `Tejass_Open_Water_Prototype.html`, `Tejass_Open_Water_Test_Report.md`, and the desktop/mobile previews supplied from the owner's Downloads folder. The HTML and supplied images were inspected directly. The HTML is an implementation reference; it is not embedded as an iframe or shipped as the application.

| Source                                                  | Adapted implementation                                                    | Changes                                                                                                                                                                                                   |
| ------------------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prototype analytic water, sky and mesh shader structure | `client/src/features/open-water/scene/materials.ts`                       | V2 replaces the original surface shading with depth-based water absorption, analytic seabed/caustics, shared sky reflections, Fresnel response, and distinct stone/teak/glass/metal/lacquer finishes      |
| Prototype platform and landmark ideas                   | `client/src/features/open-water/scene/models.ts`                          | Retains the signal station, circular learning pavilion, observatory, and archive concepts; V2 replaces discs with irregular limestone shelves and builds a new continuous yacht hull and detailed cockpit |
| Prototype analytic wave equation                        | `client/src/features/open-water/systems/boatController.ts`, scene shaders | Same three wave terms on CPU and GPU; bow/stern and port/starboard surface samples now determine yacht pitch and roll                                                                                     |
| Prototype wake concept                                  | `client/src/features/open-water/scene/Wake.ts`                            | Fixed-capacity GPU buffers, 120 path samples, 7.5-second fading lifetime; grounded bow wash and one bounded landing ring; no trail emission while airborne or on ramps                                    |
| Prototype camera composition and control mathematics    | `scene/OpenWaterScene.tsx`, `systems/boatController.ts`                   | React Three Fiber integration; one bounded fixed-step update owner; smooth camera; responsive opening; low-rate HTML telemetry; pause/visibility demand rendering; failure recovery                       |

The immediate-loading and failure-fallback V2 express yacht is newly authored, unbranded procedural geometry: a smoothly lofted flared hull, raked bow, curved gunwales, tinted wraparound windshield, hardtop, rounded seating, teak cockpit and swim platform. The limestone stacks, stone arch, slipway ramps, and race buoys are also original geometry. The enhanced yacht loaded asynchronously is the licensed model credited below. Geography and telemetry are explicitly fictional/simulated.

## V2 rendering references and asset decision

The optical design was informed by [NVIDIA GPU Gems, chapter 1: Effective Water Simulation from Physical Models](https://developer.nvidia.com/gpugems/gpugems/part-i-natural-effects/chapter-1-effective-water-simulation-physical-models) and Three.js's official [Water documentation](https://threejs.org/docs/pages/Water.html) and [ocean example source](https://github.com/mrdoob/three.js/blob/dev/examples/webgl_shaders_ocean.html). These were conceptual references for analytic wave derivatives, reflection direction, and water-surface rendering; no code was copied from those pages. The ocean uses an analytic seabed color layer rather than actual underwater geometry, refracted scene rendering, or physically measured water depth.

The near-field surface retains the shared analytic wave equation; geometry displacement fades between 100 and 290 scene units from the camera to limit distant sparse-grid aliasing. Pointer picking uses a constant-time intersection with mean sea level instead of raycasting the 80,000 rendered triangles. This analytic picker respects the ocean's world transform, bounds, and raycaster near/far limits; an actual pointer-set course was checked in Chrome after the change.

Poly Pizza and BlenderKit yacht search catalogs were surveyed initially. A later review selected the following licensed model for its stronger hull, deck, and cockpit geometry. The procedural yacht remains visible immediately and survives download/parse failures. The GLB loads from this site's own origin after the scene mounts; no third-party asset request is made at runtime.

### Licensed enhanced yacht

- Work: [motoryacht 35](https://sketchfab.com/3d-models/motoryacht-35-0bdd7a0de7254426890bb5745bb7da6d).
- Creator: [angelo raffaele catalano](https://sketchfab.com/angeloraffaelecatalano).
- License: [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/). The source model's [primary Sketchfab API record](https://api.sketchfab.com/v3/models/0bdd7a0de7254426890bb5745bb7da6d) and embedded GLB `asset.extras` agree on author, title, source, and CC-BY-4.0 license. The API was retrieved on 2026-09-29.
- Obtained GLB: [public redistribution](https://raw.githubusercontent.com/bob6664569/open-water/main/site/assets/boats/motoryacht_10.7r.glb), already converted to glTF with glTF-Transform. Source SHA-256: `f3272a5c660705b0c4c1a0dca4195a7f60822f0d09d290a1a37ff6fa0677985b`.
- Local modifications: removed the separate Italian flag fabric; welded and simplified geometry; reordered geometry for the vertex cache; quantized positions and normals. The runtime loader retains the model's hull/deck shapes, decodes quantized coordinates, normalizes its length to 21.6 scene units, places its waterline at zero, and replaces materials with the scene's ivory, teak, slate glass, and chrome shaders.
- Distributed file: `client/public/open-water/yacht.glb`, 3,294,156 bytes, 160,180 triangles, 32 meshes. SHA-256: `a830f17af48c90fb0a830a1f0a8b50858199726647450948043c8e7887daca0a`. This replaces the 17,444,708-byte, 772,782-triangle source for runtime delivery.
- It is a self-contained GLB with no external textures/buffers and needs no Draco or Meshopt decoder. Existing Three.js r167 `GLTFLoader` handles it.
- Runtime adaptation batches the 32 static meshes into 13 meshes sharing 13 materials. A standalone CPU loader comparison verified unchanged bounds, 160,180 triangles, and identical per-material triangle position/normal hashes before and after batching. It also verified normal disposal and late parse cancellation; see `design/asset-pipeline/runtime-batching-check.json`.
- Attribution travels with the model metadata, visible site credits, and `client/public/open-water/yacht-attribution.txt`. The model is CC-BY-4.0; the repository's software license does not replace that license. The creator does not endorse this portfolio.

## Existing rendering libraries

| Library                                                          | Installed revision          | License evidence inspected                                                                                                                      | Use                                                                                                                                                                                                      |
| ---------------------------------------------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Three.js](https://github.com/mrdoob/three.js)                   | `three@0.167.1` / r167      | `node_modules/three/package.json` declares MIT; `node_modules/three/LICENSE` contains the full MIT notice, copyright 2010–2024 three.js authors | Renderer, geometry, material primitives; `examples/jsm/utils/BufferGeometryUtils.js` merges locally authored geometry and `examples/jsm/geometries/RoundedBoxGeometry.js` rounds upholstery and fittings |
| [React Three Fiber](https://github.com/pmndrs/react-three-fiber) | `@react-three/fiber@8.18.0` | Installed `node_modules/@react-three/fiber/package.json` declares MIT. This installed package does not contain a standalone LICENSE file.       | React 18 Canvas, one useFrame update, demand rendering, event integration                                                                                                                                |
| [Drei](https://github.com/pmndrs/drei)                           | `@react-three/drei@9.122.0` | Installed manifest declares MIT and `node_modules/@react-three/drei/LICENSE` contains the MIT notice, copyright 2020 react-spring               | Existing dependency; not imported by the Open Water scene                                                                                                                                                |

All library code remains an installed dependency with its existing package notices. No website or game code was copied from Bruno Simon's or another creator's portfolio. The separately licensed yacht model was obtained from the public redistribution documented above. No FFT ocean, physics engine, postprocessing stack, or audio dependency was installed.

## Existing personal/project imagery

The original Tejass portrait and existing project screenshots remain repository-owned source material. The portrait was not replaced or generated. Content claims and project-specific public sources are recorded separately in `design/content-audit.md`; this document covers scene implementation provenance rather than validating those claims.

## Visual validation scope

The first iteration's local Chrome screenshots were inspected at 390 × 844, 1440 × 960, and 1920 × 1080. V2's yacht, water, and composition were inspected in the live Chrome renderer at 1440 × 960 during development. The current release matrix and captured views are recorded in the separate quality reports and preview directories. Desktop browser/emulation checks do not establish physical-phone performance, real-user Core Web Vitals, or a frame-rate guarantee.

## Inherited local fonts

Read the actual font name tables: Spectral Light `2.005` embeds copyright 2017 The Spectral Project Authors and SIL OFL 1.1; Aspekta 200/600 `2.000` embed copyright 2022 Ivo Dolenc and SIL OFL 1.1. The original font binaries are unchanged. Their notices are now distributed in `client/public/licenses/Spectral-OFL.txt` and `Aspekta-OFL.txt`, retrieved from [Production Type](https://github.com/productiontype/Spectral/blob/master/ofl.txt) and [Ivo Dolenc](https://github.com/ivodolenc/aspekta/blob/v2.000/LICENSE.txt). No new font files were downloaded. The primary UI uses system Helvetica Neue/Arial; Spectral supplies editorial headings, and inherited case-study accents use Aspekta.
