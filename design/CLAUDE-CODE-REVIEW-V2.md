# Independent Claude code review

2026-09-29. Read-only review requested by the owner. Findings are independently checked and may refer to an intermediate working-tree state; see the resolution notes in QUALITY-REVIEW-V2.md.

## Confirmed defects

**1. Lateral ramp intrusion teleports the yacht forward past the lip** — `client/src/features/open-water/systems/boatController.ts:314-317`

The solid-ramp resolver picks the "push out the front" branch whenever `old.along > length/2 || local.along > 0`. The second clause fires for *any* intrusion into the ramp's front half, including a sideways approach the `else` branch was written for.

Evidence: `harbor-jump` (x105, z90, heading 0, length 22, width 15). A boat approaching from +x at z=85 first enters the footprint at `across≈7.4, along=5`. `local.along > 0` → `correction = 11 + 0.6 − 5 = 6.6`, so `boat.z` jumps 85 → 78.4 — through the raised deck and out past the lip (z=79) in one step. Entering near `along≈0.1` gives an ~11.5 unit jump.

Impact: a visible teleport through solid geometry; the displacement also exceeds the race anti-teleport guard (`raceController.ts:60`, threshold 6), silently dropping gate detection for that step. The existing test (`tests/open-water-controller.test.ts:237`) approaches at exactly `along≈0` and asserts only `jumpCount/airborne/lift`, so it passes either way.

Fix: resolve on the minimum-penetration axis — compare `length/2 + .6 − |along|` against `width/2 + .6 − |across|` and push along the smaller, reserving the front exit for `old.along > length/2`.

**2. The race finish time is never announced** — `client/src/features/open-water/ui/RacePanel.tsx:34`, `OpenWaterExperience.tsx:117`

`<div className="ow-race-clock" aria-label={...}>` carries a name on an element with the implicit `generic` role, where ARIA prohibits naming; browsers drop it. The only live region that fires at the finish is the footer `role="status"`, whose text is `"Course complete / Nicely done"` — no time. `.ow-race-best` and the clock are not live regions.

Impact: a screen-reader user completes a course and is never told their time or session best. axe will not flag this (naming-prohibited is not an axe violation here), so the passing a11y audit in `tests/open-water-gameplay.mjs:80` does not cover it.

Fix: put the time in the announced string (`"Course complete / ${raceTime(finishTime)}"`), and give the clock `role="timer"` so the label is exposed to a user browsing the panel.

**3. Intro landmark labels collapse onto one x and stop pointing at their islands** — `OpenWaterExperience.tsx:465-471`

`left: clamp(48%, calc(${projected.x}% − 88px), …)`. At 1440 px, 48% = 691 px, and `projected.x% − 88px` only exceeds that above `projected.x ≈ 54`. Every landmark left of ~54% is pinned to the identical clamp floor. The visibility filter uses a different threshold (`projected.x < 43`), so landmarks in 43–54% render at a position decoupled from their projection. There is no de-overlap between the three labels.

Evidence: in `/tmp/open-water-scene.png`, "02 Learning Atoll" and "01 Signal Station" both begin at x≈691 and stack vertically with almost no gap, with the farther island's label above the nearer one. (Per your note I'm not assuming current CSS matches that capture; the clamp arithmetic above is from current source and is sufficient on its own.)

Fix: raise the filter floor to the value at which the clamp stops binding (~54), or skip any label whose clamped `left` differs from `projected.x% − 88px` by more than a small tolerance, and offset the second of any pair whose boxes overlap.

**4. The 80k-triangle ocean mesh is the pointer-picking target** — `scene/Ocean.ts:6-27`, `scene/OpenWaterScene.tsx:371-378`

`createOcean` builds a 200×200 grid (80,000 triangles) with no BVH, and it is the only object carrying r3f pointer handlers, so it sits in the interaction list. r3f raycasts that list on every `pointermove` to maintain hover state, so ordinary mouse movement over the canvas runs a full-mesh triangle walk per event.

I have not profiled this, so I'm reporting the structural cost, not a measured frame time. Fix: `ocean.raycast = () => {}` and attach the handlers to an invisible large `PlaneGeometry` at y=0, or override `raycast` with an analytic ray/plane intersection — `onCourse` only consumes `event.point.x/z`.

**5. (Minor) A chart pin click destroys a run in progress with no confirmation and no way back** — `OpenWaterExperience.tsx:216-217`, `raceController.ts:28`

`selectDestination` calls `cancelRace`, which nulls `courseId`; `restartRace` then returns `false` (`raceController.ts:26`), so the panel's "Restart race" is gone and the user must reopen the trial menu. The panel already exposes an explicit exit ("Free sail ×"), so a second implicit destructive path is inconsistent. Fix: disable the map pins (or require a confirm) while `phase` is `countdown`/`racing`.

Not defects, for the record: race pause/resume, index-open freeze, restart/cancel numeric resets, autopilot lockout during a race (`plotCourse:225`, `startRace:21`), wake buffer bounds (2346 ≤ 2370 vertices), and the dispose path all read correctly. No StrictMode in `main.tsx:6`, so the `useMemo`/cleanup dispose pairing is safe.

## Three verification cases worth adding

1. **Ramp lateral-intrusion bound.** For each ramp and for `along ∈ {0.1, 3, 5, 9}`, drive in perpendicularly and assert per-step displacement ≤ `speed·dt + ε`, that the boat exits on the `across` axis rather than past the lip, and `jumpCount === 0`. Catches defect 1; the current side test probes only `along ≈ 0`.
2. **Landmark placement purity.** Extract the projection→style mapping into a pure function and assert, over several viewport widths and camera poses, that every *rendered* label's resolved `left` is within tolerance of `projected.x% − 88px` and that no two rendered label boxes intersect. Catches defect 3 without a screenshot diff.
3. **Finish announcement.** After the final gate, assert some element with `role="status"`/`aria-live` contains a `mm:ss.xx` string matching `finishTime`. Catches defect 2, which the existing axe pass and the `/finish|complete|your time/i` HUD regex (`open-water-gameplay.mjs:176`) both miss.

## Reported review usage

```json
{
  "num_turns": 27,
  "total_cost_usd": 2.135535,
  "usage": {
    "input_tokens": 36,
    "cache_creation_input_tokens": 100038,
    "cache_read_input_tokens": 1084670,
    "output_tokens": 23648,
    "output_tokens_details": {
      "thinking_tokens": 18411
    },
    "server_tool_use": {
      "web_search_requests": 0,
      "web_fetch_requests": 0
    },
    "service_tier": "standard",
    "cache_creation": {
      "ephemeral_1h_input_tokens": 100038,
      "ephemeral_5m_input_tokens": 0
    },
    "inference_geo": "not_available",
    "iterations": [
      {
        "input_tokens": 2,
        "output_tokens": 4034,
        "cache_read_input_tokens": 100289,
        "cache_creation_input_tokens": 2549,
        "cache_creation": {
          "ephemeral_5m_input_tokens": 0,
          "ephemeral_1h_input_tokens": 2549
        },
        "type": "message"
      }
    ],
    "speed": "standard"
  },
  "modelUsage": {
    "claude-haiku-4-5-20251001": {
      "inputTokens": 1370,
      "outputTokens": 14,
      "cacheReadInputTokens": 0,
      "cacheCreationInputTokens": 0,
      "webSearchRequests": 0,
      "costUSD": 0.0014399999999999999,
      "contextWindow": 200000,
      "maxOutputTokens": 32000,
      "canonicalModel": "claude-haiku-4-5",
      "provider": "firstParty"
    },
    "claude-opus-5[1m]": {
      "inputTokens": 36,
      "outputTokens": 23648,
      "cacheReadInputTokens": 1084670,
      "cacheCreationInputTokens": 100038,
      "webSearchRequests": 0,
      "costUSD": 2.1340950000000003,
      "contextWindow": 1000000,
      "maxOutputTokens": 64000,
      "canonicalModel": "claude-opus-5",
      "provider": "firstParty"
    }
  }
}
```

The CLI cost is an API-equivalent estimate, not an assertion of a separately billed charge.
