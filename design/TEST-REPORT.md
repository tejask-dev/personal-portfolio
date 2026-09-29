# Open Water implementation and validation

2026-09-29. Local branch `feat/open-water`, based on `origin/main` at `a7d32d0`. No push, deployment, DNS change, or external publication was performed.

## Implemented

The supplied Open Water reference is now a React portfolio using the existing compatible Three.js and React Three Fiber installation. It has an original procedural yacht and four architectural destinations, shared analytic water and hull motion, a bounded wake, inertial steering, pointer courses, safe autopilot, a chart, two light modes, and aerial/follow cameras. All work remains directly accessible through ordinary links and an editorial index.

The reading path includes Anticipy, Stellar Learning, the actual Youreka research, About/contact, and the preserved project archive. Public copy distinguishes individual contributions from team outcomes. The original portrait and project imagery remain unchanged. The new Anticipy diagram is explicitly illustrative. Full case-study prose and metadata are present in initial HTML, including when JavaScript is disabled.

The arrival link carries the real project thumbnail into the case-study artifact with a brief native view transition where supported. Direct links, reduced motion, and unsupported browsers use ordinary navigation. The more elaborate camera-aligned architecture-to-artifact match cut described in the creative direction is not implemented.

## Commands and results

| Check | Result | Evidence |
| --- | --- | --- |
| Baseline `npm ci`, `npm run check`, `npm run build` | Passed before changes | `OPEN-WATER.md` |
| Final `npm run check` | Passed | TypeScript 5.6.3 |
| `npm test` | 13/13 passed | `tests/open-water-controller.test.ts` |
| `npm run build` | Passed | Root-path production files in `docs/`; six static case studies |
| `QA_URL=http://127.0.0.1:4173 npm run test:browser` | 24/24 passed | `browser-results.json` |
| `QA_URL=http://127.0.0.1:4173 npm run test:static` | 13/13 passed | `static-results.json` |
| `QA_URL=http://127.0.0.1:4173 npm run test:touch` | 2/2 passed | `previews/touch-qa.json` |
| `npm run build:github`, local preview at `/personal-portfolio/` | Passed; two route smoke checks passed | `base-results.json` |
| `git diff --check` | Passed | No whitespace errors |

The final checked-in build uses the root path. Browser and static suites ran on the integrated production build; a subsequent one-line `touch-action` correction was rebuilt, type-checked, and verified with the targeted native pinch/scroll regression. Controller checks were repeated after integration. No visual-regression baseline or hosted acceptance result is implied by these checks.

## Functional and accessibility coverage

Controller checks cover acceleration, coasting, reverse steering, immediate manual takeover, every home/destination-to-destination approach across four starting headings, obstacle detours, exact obstacle overlap, 120 seeded moving approaches, world bounds, unsafe course projection, invalid deltas, and deterministic continuous waves. They validate a simplified navigation model, not physical buoyancy.

Production browser checks used Google Chrome 154.0.8037.58 on this Mac with Playwright. Tested viewports: 320 × 740, 390 × 844, 768 × 1024, 1440 × 960, and 1920 × 1080. None had horizontal document overflow. A 720 × 480 CSS-pixel viewport tested reflow equivalent to a 1440 × 960 display at 200%; actual desktop browser zoom was not successfully exercised.

The suite verifies keyboard steering, manual override, destination arrival, case navigation and return focus, dialog focus containment/Escape/focus restoration, About heading focus, the first mobile steering press, and page scrolling. Separate Chromium compositor gestures verified native canvas pinch zoom from 1× to 2× and a vertical scroll of 301 CSS pixels without starting a voyage. These are emulated touch checks, not physical-phone tests.

Pause and reduced motion were checked using unchanged canvas pixels and zero continuing WebGL draws after settling. Scrolling the experience offscreen stops drawing; returning resumes it. WebGL context loss, unavailable WebGL, an unavailable scene chunk, and unavailable project imagery all preserve reading access. Intentionally injected errors are listed separately from ordinary operation: zero unexpected console errors or failed requests occurred in the final browser suite.

Axe reported zero violations on the opening, index, and Stellar case study. It also reported checks needing human review, including canvas/background contrast and an ARIA check; see the JSON report. This is automated coverage and visual review, not a WCAG conformance certification or screen-reader pass.

All six direct case-study routes were checked with and without JavaScript. Static pages have the correct title, canonical, heading, complete prose, and route-specific WebPage structured data. JavaScript routes return to the voyage with focus restored. The GitHub base-path smoke checks cover the scene, a native destination link, its case route, return link, and a no-JavaScript extensionless route.

## Visual review and defects corrected

The first visual/integration pass corrected conflicting stylesheet order, Canvas fallback handling, label placement, and viewport composition. The second pass reviewed desktop/mobile screenshots and reading layouts, then corrected the first-touch focus race, low-contrast editorial text, pause behavior during camera/light settling, and return focus. A final gesture review found that `pan-y` alone blocked pinch zoom; `pan-y pinch-zoom` now preserves both native gestures.

The static-route pass found extensionless case-study paths falling through to the homepage. The build now emits both sibling `.html` files and directory indexes, and Vercel uses documented clean-URL routing. All route checks passed after the fix.

Final screenshots were inspected directly:

- [Desktop opening](previews/open-water-desktop-1440.png)
- [Mobile opening](previews/open-water-mobile-390.png)
- [Work index](previews/open-water-index-1440.png)
- [Stellar case study](previews/stellar-case-study-1440.png)
- [Static homepage](previews/static-home-390.png)
- [Static Anticipy](previews/static-anticipy-390.png)

Manual Chrome review also checked daylight and follow-camera rendering. A native Safari smoke pass confirmed reading/navigation, opening the index, selecting Stellar, and returning to water. Its automated background screenshot did not establish an updating graphics surface, so Safari animation/rendering is **inconclusive**, not passed. The temporary Safari test tab was closed.

## Performance and remaining evidence

The scene is lazy-loaded, with bounded simulation work and wake storage, material batching, capped pixel ratio, and demand rendering during quiet states. Final Vite output is approximately 181 kB for the application entry (59 kB gzip) and 840 kB for the lazy scene (228 kB gzip). Vite reports the scene chunk above its 500 kB advisory threshold. This is a known bundle cost; field loading and target-device frame timing remain unmeasured.

The inherited installation reported three npm audit findings before changes (one low, one moderate, one high). No automatic production-dependency upgrades were applied; new browser-test packages are pinned development dependencies. This is not a dependency-security audit.

Still unverified: physical iPhone/Android behavior and GPU performance, full Safari and Firefox graphics, screen-reader operation, actual desktop 200% zoom, field Core Web Vitals, and deployed route/cache/social-preview behavior. No 60 fps, Lighthouse score, battery improvement, or hosted production-readiness claim is made.

Reproduce with the README commands. Content evidence and third-party notices are in `content-audit.md` and `SOURCES.md`.
