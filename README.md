# Tejass Kaushik / Open Water

A sunlit, explorable portfolio built around real engineering and research work. Sail the archipelago, meet Dakota (a dolphin who identifies as a shark), captain a superyacht or its tender, explore two reefs and two limestone cave systems, swim as Nemo or Dory, and discover twelve optional encounters. Fishing, docking and a six-ring fish course are optional; Anticipy is the professional centerpiece. The complete work index, five case studies, About and Contact remain directly accessible.

## Run locally

Requires Node 22.6+ and npm.

```sh
npm ci
npm run dev
```

## Verify and preview

```sh
npm run check
npm test
npm run test:v4
npm run build
npm run test:v4:content
npm run preview -- --host 127.0.0.1 --port 4173
```

Against that production preview:

```sh
QA_URL=http://127.0.0.1:4173 QA_BUILD_LABEL=production npm run test:v4:browser
QA_URL=http://127.0.0.1:4173 npm run test:static
QA_URL=http://127.0.0.1:4173 npm run test:touch
QA_URL=http://127.0.0.1:4173 npm run test:touch-layout
QA_URL=http://127.0.0.1:4173 npm run test:gameplay
QA_URL=http://127.0.0.1:4173 npm run test:cross-browser
QA_URL=http://127.0.0.1:4173 npm run test:v4:performance
npm run test:v4:assets
npm run test:swimming
QA_URL=http://127.0.0.1:4173 npm run test:swimming:browser
```

Tests use the pinned Playwright development dependency and installed Chrome. Cross-engine tests also need the Playwright Firefox/WebKit installations. Viewport, touch and WebKit emulation are not physical-phone or Safari-app evidence. Performance tests must run without competing graphics tests. V2/V3 harnesses remain for historical regression checks; the V4 suite is the current integration gate.

## Implementation

- Existing React 18, TypeScript, Vite, Wouter, Three.js and React Three Fiber retained.
- `client/src/features/open-water/`: the experience, one scene clock, boat/race/reef controllers, canonical terrain, wildlife and twelve encounters.
- `systems/expeditionController.ts`: mode ownership, race/dive exclusion, cancelable loading and saved boat restoration.
- `scene/CharacterAsset.ts`: a separate skinned-character loader that preserves bones and clips. The static yacht pipeline stays separate.
- `data/regions.ts`, `systems/regionLifecycle.ts`, `scene/RegionEnvironment.ts`: four habitats, shared 3D navigation volumes, cancellation-safe loading, and GPU cleanup.
- `data/vessels.ts`, `scene/V4Assets.ts`: vessel-specific dynamics and original repeatable Low/High models.
- `systems/gameController.ts`: catch-and-release fishing, full-hull docking, and spatial fish-course scoring.
- `scene/V4Companions.ts`: one model per named fish, controlled-actor transfer and collision-safe following.
- `scene/FishSwimming.ts`: shared tail-weighted traveling wave, adapted from the MIT-licensed 0s0ka/sea repository. Named fish deform their body/tail and paddle their fins; schools use instanced vertex deformation.
- `ui/EncounterCard.tsx`: nonmodal animal controls beside their rendered subjects. The illustrated field guide remains available in Quiet view and without graphics.
- `client/src/data/caseStudyContent.ts`: shared factual case content, personal/team attribution, stage, source links and limitations.
- `scripts/prerender.ts`: complete initial HTML, metadata and both extensionless/directory entry points for all five case routes, plus the editorial homepage.
- `docs/`: generated, tracked build. Local research records and large QA captures are kept outside the release.

Focus the water for WASD or arrows; Q/E change reef depth. Escape stops travel. Tab leaves the controls. Tap buttons provide movement without dragging or holding; Quiet view supports arbitrary safe reef positions and depths. Return to boat restores the saved position and heading at rest. Opening a reading panel preserves a race and pauses its clock; Resume is explicit. Manual steering cancels an escort/current/course.

The Playground contains five tender circuits: Reef slalom, Jump circuit, Lighthouse loop, Atoll grand tour, and Harbor sprint. Each starts with a countdown; gates must be crossed in order, and elevated gates require a real ramp jump. Times are simulated and session-only. Photography creates a local PNG preview, keeps at most six fieldbook images, includes credits, and only downloads after a visitor chooses Save image.

Motion starts in Quiet view when reduced motion is requested. Offscreen, hidden and paused views stop submitting frames. Sound starts off; an optional synthesized sea ambience requires an explicit action. No microphone, location permission, analytics, authentication, database or online leaderboard is used.

The normal build uses `/`; `npm run build:github` supports `/personal-portfolio/`. Neither build command publishes. Hosted routing and physical-device performance require separate validation after an authorized release.

## Evidence and sources

The source includes controller, rendering, gameplay, static-route, public-content, contact, and browser checks under `tests/`. Run the commands above against a fresh production build. Local automated results do not establish physical-device performance or human usability.

Public asset provenance ships with the site: [V4 art](client/public/assets/open-water-v4/ART-CREDITS.md), [fish-swimming license](client/public/assets/open-water-v4/THIRD-PARTY-SWIMMING.txt), [wildlife](client/public/assets/open-water-v3/WILDLIFE-CREDITS.md), [scroll descent](client/public/assets/open-water-v5/CREDITS.md), and [Anticipy website screenshots](client/public/portfolio/ARTIFACTS.md). The main Anticipy destination is https://anticipy.ai/. Fellowship coming soon; the Fellowship experience is not fully published.

V4 vessels and named companions are original editable geometry, authored with Claude Desktop and integrated by Codex. The V3 yacht adapted **motoryacht 35** by **angelo raffaele catalano**, CC BY 4.0; its historical attribution remains. Wildlife adapts **Quaternius Animated Fish**, CC0, with a rebuilt Dakota rig/loop. The architecture, habitats, octopus, instruments and fallback illustrations are authored for this implementation. Source notices and adaptation details ship beside the assets and are linked in the website credits. Anticipy remains described as being built; its diagram is illustrative. Organization-reported reach and team outcomes remain attributed, and historical/closed projects retain their status.

## Scrolling below the surface

The homepage now contains a native-scroll descent between the playable ocean and
Anticipy feature: four editorial depth chapters, a reversible camera crossing the
waterline, an original diver, reef terraces, animated fish, bubbles and light
shafts. `client/src/features/scroll-dive/` owns the decorative scene and shared
static copy. It never drives the playable vessel or reef controller. The hero
and descent coordinate continuous rendering; pausing the scenery also freezes
its camera and depth instrument while the document keeps scrolling.

Reduced motion (including live preference changes), graphics failure and the
prerendered no-JavaScript page show compact readable chapters. Work and contact
links remain ordinary HTML links. No scrolling library intercepts wheel or touch
input, and no new dependency was added. Public source research and credits are in
`client/public/assets/open-water-v5/CREDITS.md`.

```sh
QA_URL=http://127.0.0.1:4175 npm run test:scroll
```
