# Tejass Kaushik / Open Water

A portfolio you can sail through. A fictional archipelago connects real engineering and research work, with open sailing, two optional time trials, and two jump ramps. A full editorial work index remains available without sailing, WebGL, or JavaScript.

## Run locally

Requires Node 22.6+ (validated with Node 24) and npm.

```sh
npm ci
npm run dev
```

## Verify and preview

```sh
npm run check
npm test
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
```

In a second terminal, with Google Chrome installed:

```sh
QA_URL=http://127.0.0.1:4173 npm run test:browser
QA_URL=http://127.0.0.1:4173 npm run test:static
QA_URL=http://127.0.0.1:4173 npm run test:touch
QA_URL=http://127.0.0.1:4173 npm run test:touch-layout
QA_URL=http://127.0.0.1:4173 npm run test:gameplay
QA_URL=http://127.0.0.1:4173 npm run test:cross-browser
```

Browser dependencies are development-only and pinned in the lockfile. The main browser suite uses installed Chrome with viewport and touch emulation. Cross-engine tests additionally need `npx playwright install firefox webkit`; the WebKit engine is not a physical iPhone or a Safari app test. Read the current quality report for the exact engines and checks that passed. Fault injection is tested against the production preview because the inherited Replit development error overlay can intercept deliberately failed graphics initialization.

## Implementation

- React 18, TypeScript, Vite and Wouter; existing Three.js / React Three Fiber versions retained.
- `client/src/features/open-water/`: lazy-loaded scene, shared wave model, pure boat controller, chart and interaction state.
- `client/src/data/caseStudyContent.ts`: single source for case-study prose. `projects.ts` attaches owned imagery.
- `client/src/data/profile.ts` and `selectedWork.ts`: identity and homepage content.
- `scripts/prerender.ts`: complete initial HTML and metadata for all six case studies. `client/index.html` contains a useful static homepage.
- `docs/`: generated, tracked production build. Keep design notes in `design/`.

Take the helm with WASD or arrows. Click or tap water to plot a course; choose a numbered chart destination for autopilot. Any manual input takes over. Open **Time trials** for Reef slalom or Jump circuit. Starting a race places the yacht at its line and begins a three-second countdown. Sail through each gate in order; the elevated gates require a ramp jump. **Free sail** exits at any time. Times are simulated and session-only; there is no online leaderboard.

Escape pauses and releases keyboard steering. Reading a case study returns to the same boat position. Motion and race timing stop while paused, offscreen, hidden, or reading. Reduced motion starts with a still scene and direct reading. Touch controls preserve ordinary page scrolling and pinch zoom.

The normal build uses `/`. `npm run build:github` supports `/personal-portfolio/`. Both generate extensionless and directory case-study entry points. Vercel configuration uses clean URLs and a fallback route. Hosted routing still needs verification after an authorized deployment.

## Evidence and boundaries

See the current [V2 implementation](design/OPEN-WATER-V2.md) and [quality review](design/QUALITY-REVIEW-V2.md), plus the [content audit](design/content-audit.md) and [asset sources](design/SOURCES.md). The original [implementation](design/OPEN-WATER.md) and [test report](design/TEST-REPORT.md) preserve the first iteration's evidence.

The geography and instruments are simulated. The enhanced yacht adapts **motoryacht 35** by **angelo raffaele catalano**, under CC BY 4.0; attribution and modifications are documented in the site credits, distributed model notice, and asset sources. The immediate fallback yacht and architecture are procedural geometry adapted from the owner-supplied prototype. Anticipy is being built; its diagram is explicitly illustrative. Existing learner and experiment figures remain attributed. No analytics, audio, authentication, database, microphone access, or external actions were added.
