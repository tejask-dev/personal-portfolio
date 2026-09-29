# Tejass Kaushik / Open Water

A portfolio you can sail through. A compact fictional archipelago connects real engineering and research work, with a full editorial work index available without sailing, WebGL, or JavaScript.

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
```

Browser dependencies are development-only and pinned in the lockfile. The browser suite uses installed Chrome, with headless viewport and touch emulation. It does not establish physical-phone, Safari, Firefox, screen-reader, or field performance results. Fault injection is tested against the production preview because the inherited Replit development error overlay can intercept deliberately failed graphics initialization.

## Implementation

- React 18, TypeScript, Vite and Wouter; existing Three.js / React Three Fiber versions retained.
- `client/src/features/open-water/`: lazy-loaded scene, shared wave model, pure boat controller, chart and interaction state.
- `client/src/data/caseStudyContent.ts`: single source for case-study prose. `projects.ts` attaches owned imagery.
- `client/src/data/profile.ts` and `selectedWork.ts`: identity and homepage content.
- `scripts/prerender.ts`: complete initial HTML and metadata for all six case studies. `client/index.html` contains a useful static homepage.
- `docs/`: generated, tracked production build. Keep design notes in `design/`.

Take the helm with WASD or arrows. Click or tap water to plot a course; choose a numbered chart destination for autopilot. Any manual input takes over. Escape pauses and releases keyboard steering. Reading a case study returns to the same boat position. Motion stops while paused, offscreen, hidden, or reading. Reduced motion starts with a still scene and direct reading.

The normal build uses `/`. `npm run build:github` supports `/personal-portfolio/`. Both generate extensionless and directory case-study entry points. Vercel configuration uses clean URLs and a fallback route. Hosted routing still needs verification after an authorized deployment.

## Evidence and boundaries

See [design/OPEN-WATER.md](design/OPEN-WATER.md), [design/TEST-REPORT.md](design/TEST-REPORT.md), [design/content-audit.md](design/content-audit.md), and [design/SOURCES.md](design/SOURCES.md).

The geography and instruments are simulated. The yacht and architecture are original procedural models adapted from the owner-supplied prototype. Anticipy is being built; its diagram is explicitly illustrative. Existing learner and experiment figures remain attributed. No analytics, audio, authentication, database, microphone access, or external actions were added.
