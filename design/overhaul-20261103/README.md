# Portfolio overhaul review — 3 November 2026

This is a review branch, not a production release. The existing custom domain remains on the accepted main branch. The ivory/teal palette, Spectral/Aspekta typography, design tokens, React/Three.js stack and optional ocean remain.

## What changed

- Home opens directly into the portfolio. Anticipy leads, followed by Stellar Learning, MoleculeAI and research, compact additional projects, About, an optional ocean poster and contact. The ocean's JavaScript and models wait for an explicit visit.
- Copy names the current COO role at Anticipation Labs and the past CTO role at Stellar. Team outcomes remain team outcomes. Unverified reach, dates, solo ownership and unsupported implementation details are omitted. Case studies use a compact problem/contribution/challenge/result/lesson structure with public artifacts.
- Resume HTML and the one-page Jake-style PDF now come from one content source. The PDF has selectable text and working links; the HTML is the accessible alternative.
- Metadata, social cards, favicon, domain redirects and font preloads agree with current public content. Analytics strips queries and fragments and only allows named public routes on the canonical production host.
- The yacht has deliberate engine acceleration, reverse braking, damped hull motion and interpolated rendering around a fixed simulation clock. Light vessel assets load first; detailed assets upgrade only on High without Save-Data.
- Returning from a reading-page case keeps the ocean closed. Returning from the ocean or scenic descent restores the relevant position and focus. Pause releases engine commands while preserving velocity; fresh input is required to resume acceleration.
- Unused source components, media and dependencies are removed. Generated `docs/` output and old root-level QA JSON are untracked; builds and the GitHub Pages script still use the on-disk output.

## Visual evidence

The images below are real browser captures. The ocean poster is exported from the rendered canvas, not concept art. Full-page reading captures are made after visiting lazy-image sections.

| Surface | Desktop | Phone |
| --- | --- | --- |
| Home | [1440 × 900 capture](after-home-desktop.png) | [390 × 844 capture](after-home-mobile.png) |
| Stellar case | [Desktop](after-case-desktop.png) | [Phone](after-case-mobile.png) |
| Open Water section | [Desktop](after-world-desktop.png) | [Phone](after-world-mobile.png) |

[Short sailing-entry capture](sailing-entry.webm) · [Original chooser](before-home-desktop.png) · [Original reading page](before-reading-desktop.png)

## Loading and rendering measurements

Chrome 156, desktop 1440 × 900/DPR 1, unthrottled localhost, identical Vite preview servers, a fresh context then a warm reload, sampled four seconds after navigation. The old chooser is marked seen so both versions measure the reading path. Totals below include HTML and resource transfer bytes; they are not Core Web Vitals or mobile-network claims. Baseline: `f8c93e4`.

| Cold reading route | Before | After | Less transfer |
| --- | ---: | ---: | ---: |
| / | 459,360 B | 333,741 B | 27.3% |
| case-studies/anticipy | 569,237 B | 270,204 B | 52.5% |
| case-studies/docubridge | 1,017,902 B | 234,471 B | 77.0% |

[Before resource sample](performance-before/load-sample.json) · [After resource sample](performance-after/load-sample.json)

All four local fonts fall from 362,896 to 98,204 raw bytes. The three converted project images fall from 778,001 to 90,624 bytes. The actual ocean poster is 40,056 bytes at 1600 × 900. The optional scene still has a roughly 982 kB raw lazy JavaScript chunk; it is not part of the initial reading route.

High-quality superyacht loading now starts with 681,160 bytes rather than 3,399,304 bytes, an 80% smaller first model. The high-detail upgrade is deferred, not eliminated: a complete cold High session downloads both versions, 4,080,464 bytes, about 20% more than the old single High model. Low and Save-Data do not fetch the High model. The browser resource trace confirms this ordering.

[World diagnostic summary](world-performance-summary.json): ten isolated 15-second views, five per tier, plus three complete region-disposal cycles per tier. Low stayed at or below 54 draws/108,204 triangles; High surface used 62/247,973 and High underwater peaked at 40/230,634. All geometry budgets passed and live graphics-handle growth was zero across the last warm cycle. All four loading/recovery checks passed. No >50 ms main-thread long task was recorded in the 33 measured transitions.

Submission rates were approximately 60 fps. High Crown Reef and Lantern Grotto recorded p95 intervals of 16.8 ms, slightly above the strict 16.7 ms target. That target is therefore not claimed universally passed. These CPU-side submissions are not GPU completion timing, real phone performance, thermal stability or byte-accurate VRAM measurements.

## Verification receipt

All listed checks passed against the integrated branch unless explicitly qualified below.

| Check | Result |
| --- | --- |
| `npm run check` | TypeScript passed |
| `npm test` | 67 controller/race/encounter/physics tests |
| V4 expedition, failure, games, regions and portfolio unit files | 45 tests |
| Metadata/privacy and shared resume tests | 8 tests |
| `npm run build` | Homepage plus five case-study routes prerendered |
| `npm run test:v4:content` | Public-output scan plus 3 contact tests |
| `npm run test:static` | 11 JavaScript/no-JavaScript route scenarios |
| `tests/portfolio-entry-browser.mjs` | 16 direct-entry, responsive, accessibility and fallback scenarios |
| `npm run test:touch-layout` | 3 sizes: 390 × 844, 768 × 1024 and 844 × 390 |
| `npm run test:v4:browser` | 13 scenarios, including the complete expedition and pause/recovery |
| `npm run test:scroll` | 11 scenarios with real film frames, keyboard/touch and native scrolling |
| `tests/portfolio-boarding-browser.mjs` | 9 explicit-entry, cancellation and reentry scenarios |
| Additional editorial and scroll-return checks | Reading/world origin, restored focus, consent walkthroughs, 404/HTTP behavior checked |
| World performance/recovery probe | 10 views and 4 checks; geometry/resource checks passed, two strict frame targets qualified above |

[Final named browser results](browser-checks.json). GPU suites ran serially. One early opening-render sample failed; the focused repeat and final full isolated scroll run passed without reducing its frame-count assertion. Stale case headings and immediate-before-render assertions in older tests were updated to wait for the actual current UI. The held-input and same-hash regressions were strengthened, not relaxed.

The existing large optional scene chunk still triggers Vite's size advisory. Dependency cleanup leaves three moderate development-tool transitive advisories through sucrase/glob/minimatch; no broad toolchain upgrade was mixed into this change. The current work does not establish physical-device, long-duration thermal, screen-reader-user or unfamiliar-visitor comprehension results.

## Evidence boundaries

Local type, build, content and browser checks are separate from deployment evidence. Responsive Chrome viewports are not physical phones. Short stationary GPU samples are diagnostics, not thermal or sustained-performance certification. Source reviews do not prove live service behavior.

Vercel Web Analytics integration is installed, but dashboard activation and live collection are not verified. Custom click events remain off on Hobby; enabling them requires a supported plan. No account or plan settings were changed. Unlisted analytics paths, including non-canonical case URL variants, are deliberately dropped rather than transmitted.

The PDF is not tagged. No commercial ATS score or AI-authorship percentage is claimed. The new copy uses the owner's supplied experiences and supported public facts; it does not turn team or AI-assisted implementation into solo ownership.

## Facts intentionally omitted pending owner evidence

No confirmation marker is published. These details are unnecessary to the current copy:

- MoleculeAI's reach, visitors versus users, and whether ownership was solo.
- PromMatch's user count.
- ACS campaign year, exact technical stack and previous-record difference.
- A more precise current city or relocation preference than Ontario, Canada.
- Details of Stellar's algorithm beyond the owner's account of changing AP-derived question generation to fit IB.

## Peer contributions

The local Claude–Codex bridge task was `362f6cbe-6fba-4e09-84f0-34a5ad745104`. Claude Opus 5.5 implemented the bounded yacht dynamics/loading changes in an isolated workspace; the foreground inspected and integrated them, corrected a landing trigger and tested actual ramp trajectories at 30/60/144 Hz. A separate Claude review approved its inspected source scope, with no runtime claim. Its two small prerender consistency findings were addressed. Codex specialists supplied case, resume, asset and metadata work plus independent navigation/QA review. Foreground browser testing caught and fixed held throttle, stale pause telemetry, same-hash helm alignment and the incorrect preview image.

No private handoff, coordinator token, internal company link or raw evidence log is part of this review bundle. Raw test output remains local; measured summaries and selected screenshots are curated here.
