# Open Water implementation

An editorial portfolio set in a compact fictional archipelago. Real identity and projects are available immediately; sailing is an optional way to discover the same work.

## Decisions
- Preserve React 18, Vite, TypeScript, Wouter and the locked Three / Fiber versions. Lazy-load the scene.
- Keep existing case-study routes, add Anticipy, and preserve Soma as an archived experiment.
- Original procedural yacht and architectural models; shared analytic water sampling; bounded controller, safe moorings, and a finite wake.
- Native document scrolling and real links. Focus-scoped steering. Quiet the entire scene while reading, offscreen, paused or hidden.
- Blue hour and daylight are art direction. The geography and instrument readings are explicitly simulated.
- Source assets stay intact. No remote publication is part of this local build.

## Baseline, 2026-09-29
- Clean clone of `tejask-dev/personal-portfolio`, branch `feat/open-water`.
- `npm ci`: installed from unchanged lockfile. Existing npm audit reports three vulnerabilities (one low, one moderate, one high); no automatic dependency upgrade applied.
- `npm run check`: passed.
- `npm run build`: passed. Main entry 170.09 kB / 55.49 kB gzip; case-study chunk 12.14 kB / 4.63 kB gzip.
- No existing test script. `docs/` is generated build output and tracked; working notes belong here.

## Acceptance checklist
- [x] Cinematic desktop and mobile composition, direct work index, original portrait.
- [x] Sailing, course plotting, safe autopilot, manual override and arrival to real routes.
- [x] Return restores boat and focus; normal browser history works.
- [x] Global pause, reduced motion, visibility pause and WebGL failure preserve work access.
- [x] Current factual content, existing routes, initial HTML and route metadata.
- [x] Controller tests, type check, build and browser checks; actual screenshots reviewed after two refinement passes.

The implemented arrival transition carries a real artifact thumbnail into its case study using native view transitions, with direct navigation elsewhere. Camera-aligned architecture-to-artifact choreography remains a creative refinement. Physical-device performance, full Safari/Firefox graphics validation, actual desktop browser zoom, screen-reader use, and hosted deployment verification remain outside the completed evidence.

See `content-audit.md`, `SOURCES.md`, and `TEST-REPORT.md` for evidence and limits.
