# Portfolio design pass — 27 October 2026

## Direction and evidence

Retain the editorial, type-led reading route and the optional ocean. Five local
[structural studies](variants/index.html) were rendered at 1440×900 and 390×844.
Type-led preserves the common left edge and lets the Anticipy band supply contrast.
Split repeats the portrait/about treatment; centered breaks the grid; dark repeats
the next band; overlap reduces text legibility. The prototypes are not shipped UI.

The baseline references are eight real viewport captures of production a276d70,
not invented brand measurements. The original full-page chooser capture included
its background document; it was replaced with viewport captures before comparison.
Final selected captures are in `screenshots/final-*.png`.

## Design loop

Scores are subjective visual judgments, not accessibility or performance metrics.
Baseline scores came from Claude Fable 5.1 high; subsequent rows are the foreground
review of actual screenshots. All factual content, routes, boat and film logic stay.

| Round | Type | Rhythm | Density | Restraint | Alignment | Focus | Change / evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Baseline | 3 | 3 | 3 | 4 | 4 | 3 | Chooser Georgia/Arial differs from Spectral/Aspekta; reading 300 resolves to a thin 200 font file. |
| 1 | 4 | 3 | 3 | 4 | 4 | 3 | Shared font families and regular 400 body; phone prose and choice descriptions have clearer strokes. |
| 2 | 4 | 4 | 4 | 4 | 3 | 4 | 96px desktop headline, 96px hero rhythm, 68ch intro and 56px primary action; color-only hover. Larger phone labels expose awkward header wrapping. |
| 3 | 4 | 4 | 4 | 4 | 4 | 4 | Nonwrapping exit control; responsive 48–64px chooser title and 26–32px choice headings keep 320px useful without horizontal overflow. |

The final desktop hero holds the same two-line claim across a wider part of the
grid. Its primary action remains visible at 1440×900. Phone body stays 16px;
choice descriptions rise to 15px, small labels to 11px. Reading lead measure at
1440 falls from 767px to 696px. Shared surfaces remain ivory, teal and hairlines.
No hover elevation, new ornament, new runtime dependency or animation was added.

Final Fable screenshot review scored Type/Rhythm/Density/Alignment/Focus 4 and
Restraint 5. It caught a blank landscape-contact capture: the test had raced React
back-navigation restoration. Actual header-link navigation plus a visible-heading
wait produces the correct contact screen. It also found an inherited figure reset
winning over the case artifact's auto margins. A three-line shared CSS correction
centers both React and static case artifacts. A grid-alignment assertion failed
before that fix; the corrected build passes all four viewport profiles.

## Verification

Evidence directories (local, not web assets):

- `/tmp/portfolio-design-baseline-verified`: production baseline, five design/navigation scenarios.
- `/tmp/portfolio-design-grid-fixed`: final desktop, phone, 320px and short landscape,
  actual link hit-testing/case navigation, keyboard primary action, no-JavaScript
  navigation and desktop/phone axe WCAG A/AA checks.
- `/tmp/portfolio-design-final-entry`, `-boarding`, `-scroll`, `-security`: existing
  browser regressions, preserving motion, touch, resize, direct hashes, fallback,
  paused scenery, containment and normal link navigation.
- `/tmp/portfolio-design-audit.json`: dependency audit, zero vulnerabilities.
- `/tmp/portfolio-design-unit.log`: 54 logic tests passing.

Commands: `npm run check`; `npm test`; `vite build --outDir
/tmp/portfolio-water-entry-build`; prerender with `--out-dir` to that same folder;
public-output/contact tests; `QA_URL=http://127.0.0.1:4186 QA_OUTPUT=… node
tests/portfolio-{design,entry,boarding}-browser.mjs`,
`tests/open-water-scroll-dive.mjs`, `tests/portfolio-cinematic-security.mjs`.
Final release suites run serially. No generated `docs/` changes are committed.

Local results: **57 browser scenarios passed** (5 design, 16 entry, 9 boarding,
11 descent, 8 Chrome security/lifecycle, 8 WebKit security/lifecycle), plus
54 logic tests, 3 contact tests, typecheck, public-output and build checks.
Only the case-grid correction landed after the broad suites; its focused test was
rerun and passed at all four sizes with actual navigation and axe.

## Boundaries

Read-only Fable review task: `4f038896-7c7b-4368-8a15-cad73216d265`, job
`84f79ffb-fc16-4d7c-b00a-5e63ade608c2`, effective model `claude-fable-5-1`, high.
No private-company sources or old transcripts were read. No purchases or global
configuration changes. Skills used as source guidance are listed in references.
Figma has no supplied frame; img2threejs has no object to rebuild in this pass.
The previous licensed film and direct boarding transition remain intact.

Automated viewport/touch tests are not physical-device or thermal-performance
measurements. The optional yacht retains its pre-existing large lazy JS chunk.
A zero dependency audit is not a penetration-test guarantee.
