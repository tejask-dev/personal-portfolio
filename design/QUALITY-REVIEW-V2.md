# Open Water V2 / Design and quality review

Independent direction and QA, 2026-09-29. **The V2 browser suites passed all 65 checks against the local production preview. No blocking defect remains in the exercised scope.** The final formatter-only patch additionally passed a focused UI smoke and a fresh static-route rerun. The implementation team recorded 27 passing controller/race tests, successful TypeScript checking, and a production build with six prerendered case-study routes. Nothing was pushed or deployed as part of this review.

## Direction and visual outcome

The direction was a sunlit architectural archipelago with an ivory-and-teak express yacht as the foreground subject, clear water with visible depth, a calm central work harbor, and optional outer-water racing. The five priorities were a convincing yacht silhouette, quieter depth-dependent water, recognizable geography, an explicit separation between free sailing and timing, and a usable composition at every viewport.

Final desktop, portrait, tablet, and landscape screenshots were inspected after the licensed yacht and material batching were integrated. The curved hull, foredeck rails, glazing, seating and stern terrace now read as a detailed yacht. Broad turquoise shelves and darker open water replace the earlier uniform noise. Anticipy's card is separated from Stellar's card, with a leader to the station. Numbered chart controls occupy a separate row instead of overlapping at the compressed central-harbor coordinates. Portrait racing uses a compact card and a more distant camera; tablet and landscape steering remain visible.

The independent review prompted fixes to an underlit hull, regular distant wave bands, an Anticipy station hidden by the title, mobile copy crossing the yacht, crowded chart buttons, and the first portrait race card covering the forward view. The final images confirm those changes. These are inspected screenshots, not an approved automated visual-regression baseline or a claim of photographic rendering.

Representative final views:

- [Desktop opening, Chrome](previews-v2/open-water-desktop-1440.png)
- [Portrait opening](previews-v2/open-water-mobile-390.png)
- [Portrait race countdown](previews-v2/race-countdown-390.png)
- [Tablet race, expanded chart](previews-v2/touch-race-768x1024.png)
- [Phone-landscape race, expanded chart](previews-v2/touch-race-844x390.png)
- [Desktop opening, Playwright WebKit](previews-v2/webkit-opening-1440.png)

## Final verification

All suites below ran sequentially against `http://127.0.0.1:4173`, avoiding competing graphics sessions. V2 reports and screenshots are separate from the first iteration's evidence.

| Suite                                                                | Result    | Evidence                                                       |
| -------------------------------------------------------------------- | --------- | -------------------------------------------------------------- |
| Chrome portfolio, responsiveness, accessibility and failure paths    | **28/28** | [browser-results-v2.json](browser-results-v2.json)             |
| Initial HTML and all six direct case-study routes, JavaScript off/on | **13/13** | [static-results-v2.json](static-results-v2.json)               |
| Native compositor pinch zoom and vertical scrolling, emulated touch  | **2/2**   | [touch-results-v2.json](touch-results-v2.json)                 |
| Race layouts, controls, pause, restart, exit and complete courses    | **8/8**   | [gameplay-results-v2.json](gameplay-results-v2.json)           |
| Tablet and phone-landscape touch steering, HUD and expanded chart    | **2/2**   | [touch-layout-results-v2.json](touch-layout-results-v2.json)   |
| Chrome, Firefox and Playwright WebKit engine matrix                  | **12/12** | [cross-browser-results-v2.json](cross-browser-results-v2.json) |

The browser suite covers 320, 390, 768, 1440 and 1920 px widths; a 720×480 CSS-pixel reflow check; keyboard steering and manual takeover; visible-water pointer navigation; dock arrival and return; modal focus containment/restoration; reduced motion; global pause; and stopping draws while offscreen. Direct case-study checks verify the initial title, canonical URL, heading, shared study prose, and usable return navigation. Normal runs recorded no unexpected runtime or network errors.

Automated WCAG-tagged axe audits passed for the opening, index, case study, and new race UI. The tests also verify keyboard focus, 44 px chart targets without overlap, disabled chart destinations during a race, timer naming, and live completion text. Axe and DOM assertions do not replace a manual assistive-technology audit.

The wide-touch checks use actual Chromium compositor touch events in emulation at **768×1024** and **844×390**. Holding Accelerate moves the yacht in both free sailing and a race. Steering targets are at least 44 px, the race controls remain inside the viewport, and an expanded chart does not overlap the steering controls or race card. Portrait pinch zoom and ordinary vertical scrolling continue to work.

## Gameplay evidence

The automated pilot observes public DOM telemetry and presses ordinary W/A/S/D keys. It never calls a simulation setter, advances time, or fabricates a finish. Moving to the starting line happens only through the visible Start/Restart race controls.

| Course       | Ordered gates | Recorded jumps | Final displayed time |
| ------------ | ------------: | -------------: | -------------------- |
| Reef slalom  |           7/7 |              0 | 00:28.46             |
| Jump circuit |           9/9 |              2 | 00:32.71             |

Both finishes exposed the time through a named `timer` and announced that same displayed time plus the session best in the status region. The Jump circuit run independently observed takeoff and landing. Each of Chrome, Firefox and WebKit also drove through the first water gate, ramp, elevated gate and landing. These are recorded simulation clocks, not performance benchmarks or suggested player targets.

Countdown pause, work-index pause, restart, Free sail exit and restoration of chart navigation after completion passed. A free-water course is reported as `SAILING` by the current generic state attribute; actual pointer-caused movement was verified independently of the named-destination `AUTOPILOT` label.

## Licensed yacht and failure handling

The selected asset is **motoryacht 35** by **angelo raffaele catalano**. Independent QC re-fetched the [primary Sketchfab API metadata](https://api.sketchfab.com/v3/models/0bdd7a0de7254426890bb5745bb7da6d) and confirmed title, author, downloadable status and CC Attribution 4.0. The [CC BY 4.0 deed](https://creativecommons.org/licenses/by/4.0/) permits adaptation and redistribution with credit, a license link and an indication of changes. The [public model page](https://sketchfab.com/3d-models/motoryacht-35-0bdd7a0de7254426890bb5745bb7da6d) returned 403 to research tooling; API verification is distinguished from inspecting that page.

The self-contained optimized GLB is **3,294,156 bytes**, with **160,180 triangles**. Runtime batching merges its 32 parts into 13 material batches without changing the asset. Creator/source/license links and modification notices are present in the site credits, [distributed attribution](../client/public/open-water/yacht-attribution.txt), and [source record](SOURCES.md).

Normal rendering checks wait for the explicit `licensed` model state, so procedural fallback cannot be counted as successful asset loading. Separate tests passed for:

- A pending model request: the procedural yacht responds to keyboard input, the index opens, and case navigation succeeds before the download completes.
- An aborted request or malformed GLB: the procedural yacht remains usable for sailing and Anticipy remains readable, without an unhandled page error.
- WebGL initialization failure, context loss, or a missing scene chunk: the work index and real case-study content remain usable.
- Missing project media and disabled JavaScript: identity, work, contact and case-study prose remain available.

## Claude code review resolution

The independent [Claude code review](CLAUDE-CODE-REVIEW-V2.md) identified five issues in an intermediate working tree. All five were resolved and checked at the appropriate layer.

| Finding                                                     | Resolution and evidence                                                                                                                                                                                                                                                                           |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lateral ramp intrusion could push a yacht past the lip      | The mechanics owner replaced the resolver with crossed-entry-face handling and a minimum-penetration fallback. The 27-test controller/race run includes 16 lateral entry cases across both ramps and four diagonal low-edge cases. Valid launch/landing and browser course completion still pass. |
| Finish time lacked a valid timer role and live announcement | The clock has `role="timer"`; completion status includes finish and session-best time. Both real-input finishes passed accessible-name, displayed-time and live-status assertions. No actual screen-reader speech output was tested.                                                              |
| Landmark cards collapsed to the same horizontal clamp       | Anticipy's card is positioned separately with a leader. Final screenshots were inspected, and visible card bounds do not overlap at the five target viewport widths.                                                                                                                              |
| Water picking traversed the 80,000-triangle mesh            | Source now uses analytic plane intersection. A real pointer click on visible water produces course-following movement. This verifies behavior and a structural reduction in picking work, not a measured frame-rate improvement.                                                                  |
| Chart pins silently cancelled an active race                | Pins are disabled during countdown/racing and restored after completion. The index remains available; assertions cover the race phases and restored navigation.                                                                                                                                   |

Two harness assumptions were corrected during testing: macOS WebKit uses Option+Tab for link navigation, and CSS uppercase transformation changes the `innerText` casing of the finish status. Tests wait for intentional focus restoration. A free-water navigation check was also corrected to verify movement instead of requiring the named-destination status label. All final reruns passed.

## Final formatter boundary patch

After the full matrix, the root review caught a display-only edge case: `59.999` seconds could appear as `00:60.00`. The shared pure formatter now rounds total hundredths before splitting minutes and seconds. Seven boundary values were added to the unit suite, bringing it to 27 passing tests. Geometry, controls and layout did not change.

The [post-patch timer smoke](timer-smoke-v2.json) independently confirms `59.999 → 01:00.00`, starts a race through the visible UI, verifies the named timer against its visible time, and confirms pause stability with no page errors. All 13 static/direct-route checks were rerun after that rebuild. The broader browser/engine matrix above ran immediately before this formatter-only change; it was not redundantly repeated.

## Browser and deployment boundaries

The tested engines were installed **Google Chrome 154.0.8037.59**, **Playwright Firefox 155.0**, and **Playwright WebKit 26.6**. All rendered the licensed model, completed their navigation and jump checks, and froze canvas pixels when paused.

Native Safari 26.6.2 is installed, but Safari WebDriver rejected the session because “Allow remote automation” is disabled. No Safari/global security setting was changed. Playwright WebKit is not native Safari or a physical iPhone. Viewport and touch emulation do not establish physical phone/tablet behavior. There are no field Core Web Vitals, real-user performance, guaranteed frame-rate, or deployed-host claims in this report.

The separate [GitHub-base result](github-base-results-v2.json) records a local Vite build under `/personal-portfolio/`: the prefixed yacht request returned 200, Anticipy client navigation used the prefix, and no runtime errors were recorded. That result covers asset URLs and client navigation, not a new static-prerender test or a live GitHub Pages deployment.

## Reproduction

With the current build served by the local production preview:

```sh
QA_RUN_LABEL=v2 npm run test:browser
QA_RUN_LABEL=v2 npm run test:static
QA_RUN_LABEL=v2 npm run test:touch
QA_RUN_LABEL=v2 npm run test:gameplay
QA_RUN_LABEL=v2 npm run test:touch-layout
QA_RUN_LABEL=v2 npm run test:cross-browser
```

Playwright's Firefox/WebKit engines and installed Chrome are required for the engine matrix. The six QA scripts were formatted with pinned Prettier 3.6.2.
