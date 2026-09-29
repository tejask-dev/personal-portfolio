# Open Water V2

2026-09-29. An expanded sailing portfolio built in response to the owner's request for a more refined yacht, clearer water, a larger free map, ramps, and races. Local implementation only; no push or deployment.

## Experience

- Daylight opens onto turquoise shallows and deeper blue channels. Limestone outcrops, a stone arch, and five scenic islands give the four work destinations a larger setting. World radius increased from 180 to 360 scene units, giving four times the circular world area.
- The locally hosted, licensed **motoryacht 35** model adds a curved hull, glazing, rail details, and a teak stern terrace. It loads asynchronously over a custom procedural yacht that remains usable if fetching or parsing fails.
- **Reef slalom** offers seven ordered gates; **Jump circuit** offers nine with two elevated gates requiring real ramp takeoff. Two slipways support free-sailing jumps outside races too. Landing creates a short, bounded splash ring.
- Time trials are optional. Start places the boat at the course's line, counts down, then tracks ordered directional gate crossings. Restart and Free sail remain explicit actions. Chart course controls are disabled during a live run; the work index remains available and pauses the run. Completion announces the time and session best.
- Session times are local in-memory simulation times. They are not real-world nautical measurements, online competition, or persisted records.
- Opening labels use projected destination coordinates. A separate chart control row prevents neighboring world coordinates from creating overlapping touch targets. Mobile racing uses a compact panel and a wider follow-camera view.
- Touch steering is available on wide touch screens as well as narrow phones. A short landscape sailing view fits the race panel, chart, and steering within the viewport; entering the helm returns the scene to view.

## Rendering and runtime

One animation owner advances the fixed-step boat/race simulation, bounded wake, water, camera, and presentation. Pause, reduced motion, reading, background tabs, and offscreen state stop continuous rendering. Race countdown holds the yacht at its start. Steering is focus-scoped and supports keyboard and touch controls; free sailing also accepts click/tap courses.

The water uses analytic waves, depth-dependent color absorption, a synthetic seabed/caustic layer, and sky reflections. It does not render a physically refracted underwater scene. Distant displacement fades to prevent sparse-grid wave aliasing. Ocean picking uses a constant-time ray/plane intersection rather than walking the 80,000 rendered triangles.

The yacht was reduced from 17,444,708 bytes / 772,782 triangles to **3,294,156 bytes / 160,180 triangles**. It is a self-contained GLB using standard quantized geometry and the existing Three.js loader, with no runtime compression decoder, textures, or third-party asset requests. Source and optimized assets passed the official Khronos glTF validator without errors or warnings. The renderer decodes positions before baking normalization, remaps the original material slots, aborts pending fetches on unmount, and disposes late parse results.

Asset provenance, license, modification notices, optimization recipe, and validation evidence are recorded in `SOURCES.md` and `asset-pipeline/`. The public footer and `yacht-attribution.txt` retain author, source, license, and changes.

## Independent work and review

Three Codex agents handled graphics, boat/race mechanics, and independent design/quality review. The primary agent integrated scene state, camera/UI composition, accessibility, assets, and release checks. The installed Claude CLI performed two actual read-only reviews: design direction and code defects. Both reports retain the CLI-reported usage in `CLAUDE-DESIGN-REVIEW.md` and `CLAUDE-CODE-REVIEW-V2.md`; cost fields are the CLI's API-equivalent estimates, not a billing receipt. No global Claude configuration or hooks were changed.

Claude's ramp collision, finish announcement, landmark placement, ocean picking, and accidental race cancellation findings were assigned and checked independently. See the quality review for resolutions and browser evidence. A code review alone is not a runtime test.

## Verification and limits

`QUALITY-REVIEW-V2.md` and machine-readable result files record the final checks. Tests use visible controls and real browser input, with read-only telemetry to verify movement, airborne/landing state, gate progress, and finish. No browser test mutates the simulation to manufacture a completed course.

Installed Chrome and Playwright Firefox/WebKit provide local desktop-engine evidence. Native Safari remote automation was disabled and was left unchanged. Mobile checks use emulation; physical iPhone/Android performance, manual screen-reader use, real-user Core Web Vitals, and hosted deployment remain unverified. No frame-rate guarantee is made.
