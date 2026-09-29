# Open Water: sources and material provenance

Verified against the local installation on 2026-09-29. The scene introduces no external model, HDRI, texture, font, audio file, network graphics service, or new rendering dependency.

## Owner-supplied reference

Source bundle: `Tejass_Open_Water_Codex_Master_Prompt.md`, `Tejass_Open_Water_Creative_Direction.md`, `Tejass_Open_Water_Prototype.html`, `Tejass_Open_Water_Test_Report.md`, and the desktop/mobile previews supplied from the owner's Downloads folder. The HTML and supplied images were inspected directly. The HTML is an implementation reference; it is not embedded as an iframe or shipped as the application.

| Source | Adapted implementation | Changes |
| --- | --- | --- |
| Prototype analytic water, sky and mesh shaders | `client/src/features/open-water/scene/materials.ts` | Three ShaderMaterial uniforms/matrices; indexed adaptive ocean; shared visual environment; retained authored sea/sage palette |
| Prototype original procedural yacht, platform and architecture geometry | `client/src/features/open-water/scene/models.ts` | Typed BufferGeometry construction; material batching with Three's mergeGeometries utility; ivory hull; explicit GPU disposal |
| Prototype analytic wave equation | `client/src/features/open-water/systems/boatController.ts`, scene shaders | Same three wave terms on CPU and GPU; bow/stern and port/starboard surface samples now determine yacht pitch and roll |
| Prototype wake concept | `client/src/features/open-water/scene/Wake.ts` | Fixed-capacity GPU buffers and 100 path samples, eight-second fading lifetime, no particles at rest |
| Prototype camera composition and control mathematics | `scene/OpenWaterScene.tsx`, `systems/boatController.ts` | React Three Fiber integration; one bounded fixed-step update owner; smooth camera; responsive opening; low-rate HTML telemetry; pause/visibility demand rendering; failure recovery |

The models are original procedural interpretations from the supplied prototype, refined for this implementation. They are not third-party yacht models, branded designs, or photorealistic assets. Geography and telemetry are explicitly fictional/simulated.

## Existing rendering libraries

| Library | Installed revision | License evidence inspected | Use |
| --- | --- | --- | --- |
| [Three.js](https://github.com/mrdoob/three.js) | `three@0.167.1` / r167 | `node_modules/three/package.json` declares MIT; `node_modules/three/LICENSE` contains the full MIT notice, copyright 2010–2024 three.js authors | Renderer, geometry, material primitives; `examples/jsm/utils/BufferGeometryUtils.js` merges locally authored geometry |
| [React Three Fiber](https://github.com/pmndrs/react-three-fiber) | `@react-three/fiber@8.18.0` | Installed `node_modules/@react-three/fiber/package.json` declares MIT. This installed package does not contain a standalone LICENSE file. | React 18 Canvas, one useFrame update, demand rendering, event integration |
| [Drei](https://github.com/pmndrs/drei) | `@react-three/drei@9.122.0` | Installed manifest declares MIT and `node_modules/@react-three/drei/LICENSE` contains the MIT notice, copyright 2020 react-spring | Existing dependency; not imported by the Open Water scene |

All library code remains an installed dependency with its existing package notices. No code, graphics, models, UI, or identity was copied from Bruno Simon's or another creator's portfolio. No FFT ocean, physics engine, postprocessing stack, or audio dependency was installed.

## Existing personal/project imagery

The original Tejass portrait and existing project screenshots remain repository-owned source material. The portrait was not replaced or generated. Content claims and project-specific public sources are recorded separately in `design/content-audit.md`; this document covers scene implementation provenance rather than validating those claims.

## Visual validation scope

Local Chrome screenshots were inspected at 390 × 844, 1440 × 960, and 1920 × 1080. The opening scene renders at each size and reduced motion retains the same intentional still composition. These desktop browser/emulation checks do not establish physical-phone performance, real-user Core Web Vitals, or a frame-rate guarantee.

## Inherited local fonts

Read the actual font name tables: Spectral Light `2.005` embeds copyright 2017 The Spectral Project Authors and SIL OFL 1.1; Aspekta 200/600 `2.000` embed copyright 2022 Ivo Dolenc and SIL OFL 1.1. The original font binaries are unchanged. Their notices are now distributed in `client/public/licenses/Spectral-OFL.txt` and `Aspekta-OFL.txt`, retrieved from [Production Type](https://github.com/productiontype/Spectral/blob/master/ofl.txt) and [Ivo Dolenc](https://github.com/ivodolenc/aspekta/blob/v2.000/LICENSE.txt). No new font files were downloaded. The primary UI uses system Helvetica Neue/Arial; Spectral supplies editorial headings, and inherited case-study accents use Aspekta.
