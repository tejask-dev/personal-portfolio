# Independent Claude design review

2026-09-29. Read-only Claude Code review requested by the owner and managed by Codex. Claude inspected source and the existing screenshots. This is advisory critique, not verified test evidence; proposed numeric targets and subjective statements remain recommendations. The team verifies implementations independently.

Reported review model: `claude-opus-5[1m]`. 15 turns; 9,647 output tokens, including 4,699 thinking tokens; 46,154 cache-creation and 188,854 cache-read input tokens. CLI estimated API-equivalent cost: $0.80, not an assertion of a separately billed charge under the signed-in plan. Session-only safe mode kept unrelated hooks and plugins out of this review; user settings were not changed.

---

# Open Water — independent creative direction review

Inspected: both preview PNGs (desktop 1440, mobile 390), `materials.ts`, `models.ts`, `OpenWaterScene.tsx`, `Ocean.ts`, `Wake.ts`, `boatController.ts`, `world.ts`, `OpenWaterExperience.tsx`, label CSS, and `TEST-REPORT.md`.

**The honest read of the current frame.** The desktop preview is a competent grey-teal lake, not the Mediterranean. Every island sits in the upper-right quadrant; the left-center half of the frame is ~400×500 px of undifferentiated water with a diffuse noise band through it, and the fourth destination is a cropped sliver at the left edge. All three visible islets use the identical disc + skirt + ring + pier prologue (`models.ts:298-318`), so they read as one kit of parts rather than a place. The yacht at that camera distance is a tan blob — the teak deck out-areas the ivory hull, so it reads khaki. On mobile the atoll and observatory crowd the headline and the boat collides with the chart. The foundation is real; the art direction is not yet doing any work.

## The five changes that matter

**1. Give the water a bottom.** This is the single largest visual gain and it is entirely inside `oceanMaterial`. Today colour is `mix(deep, shallow, nearLand)` where `nearLand` is a proximity gaussian (`materials.ts:46-48`) — proximity is not depth, which is why nothing reads as clear. Add `float seabed(vec2 p)` (smooth-min of per-islet cones plus a low reef ridge field), take `depth = max(0., -seabed(p))`, and drive colour by per-channel extinction: `transmit = exp(-depth * vec3(0.16, 0.055, 0.032))`. Composite `sand (0.80,0.84,0.66)` → `turquoise (0.10,0.62,0.58)` → `cobalt (0.016,0.13,0.27)` through that. Refract the sample point by `N.xz * 0.38 * min(depth,4.)` for the wobble. Replace the weak sine lattice at lines 49-50 with real caustics: `pow(1.-abs(sin(...)), 6.)` over two octaves in *seabed space*, amplitude `exp(-depth*0.34)`, tinted `(0.55,0.72,0.52)`. Keep foam, but gate it on `depth < 1.2` rather than radius so it hugs actual shoreline.

**2. Re-material, don't re-render.** A licensed GLB is the right call for the yacht, but the scene uses `NoToneMapping`, zero lights, and display-referred colours (`OpenWaterScene.tsx:364`, `materials.ts:70-71`). Any downloaded PBR asset will land dark and flat. Import geometry only, discard its materials, and bucket meshes by original material name into five `architectureMaterial` variants. Before that lands, upgrade the material itself — the current specular is a single Blinn lobe (`materials.ts:87`), which is why chrome and glass look like painted plastic. Factor the sky fragment expression into a shared `vec3 skyColor(vec3 ray)` function and let architecture sample it on the reflection vector. That one refactor buys you chrome, glazing and lacquered hull for almost nothing. Targets: hull ivory `gloss 0.72` + fresnel 0.30; glazing base `#16323e`, `gloss 1.0`, sky mix `0.25 + fres*0.6`; chrome `gloss 0.95`, albedo `#cfd8d6`, sky mix `0.8`; teak `gloss 0.22`. Asset budget: ≤120k tris, ≤800 kB after `gltf-transform` prune/weld/dedup/quantize, fetched lazily *after* first paint with the current procedural hull as placeholder — the scene chunk is already 228 kB gzip (TEST-REPORT line 62).

**3. Kill the kit-of-parts islets.** Replace the shared cylinder prologue with three limestone archetypes built from your existing `Surface` class: a **stack** (sheer prism, wave-cut notch, flat top), an **arch** (two piers, spanning lintel — you can sail through it), and a **terraced shelf** (stepped, pines). Vary radius 6→26 and height 4→34. Add two or three silhouette-only islets at 400-600 units outside the play bounds purely for horizon depth, and one near islet at ~35 units for foreground occlusion in the opening frame. Warning: the fog constant `0.003` with exponent `1.9` (`materials.ts:22`) already erases ~58% of an object at 300 units — spread destinations out without retuning to ~`0.0016` and you will ship grey mush.

**4. Delete the plank geometry.** `models.ts:222-230` builds caulking as 0.018-unit boxes. At the aerial camera (39-48 units up) with `dpr` capped at 1.5 those are sub-pixel and will crawl regardless of MSAA. Procedural stripes in object space (`fract(vLocal.x * 3.4)`) give cleaner teak, remove hundreds of merged boxes, and cost nothing. Note `Builder.add` deletes UVs (`models.ts:64`) — object-space is your only option unless you change that.

**5. Fix contact.** Nothing casts anything. The only grounding cue is a hard-coded `3.2 × 7.9` ellipse darkening in the ocean shader (`materials.ts:55-56`) that will not match a new hull and does not exist for buoys, gates or ramps. Promote it to a small uniform array of `(x, z, radiusX, radiusZ, rotation)` contact discs, or add a single directional shadow pass. Without it every new prop will look pasted on.

## Course and ramp art direction

No neon, no floating chevrons. Call it **regatta furniture** — objects that plausibly belong in this water:

- **Gates:** two ivory spars, one blue pennant (`colors.blue`), a chain swag between them. Passed state signalled by the pennant snapping taut and the swag dipping — motion, not glow.
- **Slalom:** teak-and-canvas inflatable floats in a chain, tethered; they roll and bob when you pass close.
- **Arches:** the limestone arch archetype doubles as a course feature. Free art, free gameplay.
- **Ramps:** moored slipway pontoons — canvas-over-timber, 11-14°, reading as a beach-club diving platform. Two per circuit, never more.
- **Finish:** the only `colors.gold` object in the world. Scarcity makes it legible.

Course lines belong in the water shader as a faint sand-scour trail on the seabed, not as a painted overlay.

## Camera and arrival

The aerial rig is world-axis-locked (`OpenWaterScene.tsx:284`) — it never rotates with heading, which makes any race unplayable. Make it heading-relative with a yaw that lags at ~1.4/s. Replace the raw `lerp(blend)` follow with a critically-damped spring at ω≈6.5, add an FOV kick 45→52 above 12 kn over 0.8 s, and drop the eye to y≈7 during a jump.

Arrival is currently a panel that pops when `distance(dock) < 11`. Make it three beats: at 40 units the rig eases into an approach orbit; at the dock a scripted 1.6 s move places the architecture on the left third with the right third clean for the card; then the match cut. TEST-REPORT line 11 says the camera-aligned match cut was skipped — it is the highest-leverage unfinished piece of the whole experience. Finish it.

## Implementation risks visible in source

- **`uniform vec3 uStations[4]` with `for(int i=0;i<4;i++)`** (`materials.ts:36,46`) is fed by `destinations.map(...)`. Add a fifth destination or any reef and this silently mismatches or breaks. Templatize the count into the shader string *before* anyone touches `world.ts`. This will bite first.
- **Destination labels are hardcoded CSS percentages** (`open-water.css:363-374`). Spreading destinations desyncs them instantly. Project world→screen per frame.
- **`material.side = DoubleSide` on every batch** (`models.ts:153`) doubles fragment cost scene-wide and will sort badly once glazing multiplies.
- **`gl.compile(scene, camera)`** (`OpenWaterScene.tsx:140`) is a synchronous main-thread hitch that grows with every new material family.
- **`frameloop="demand"` when `isQuiet`** — and `isQuiet` includes `indexOpen` and `arriving`. A race timer will freeze mid-lap. Decide the pause contract before gameplay lands.
- **`WORLD_RADIUS` 180 / `COURSE_RADIUS` 165** cannot hold spread-out destinations plus a circuit.
- **Wake gap-skip `hypot > 5`** (`Wake.ts:101`) will punch holes in the wake if top speed rises above ~18.

## Review criteria (measurable, run per PR)

1. **Water:** luminance ratio shallow:deep ≥ 2.5:1 and hue delta ≥ 45° in a 1440 screenshot; caustics visible at ≤6 units depth, absent by 18.
2. **Silhouette:** three islets correctly distinguished at 128 px thumbnails by 3 people unfamiliar with the build.
3. **Yacht:** hull / glazing / teak / chrome each identifiable at 10% screen height; no channel > 0.96 in daylight.
4. **Composition:** no quadrant of the 1440 frame >35% empty water; all four destinations on-screen or deliberately off; mobile 390 hero text with zero object overlap.
5. **Performance:** ≥55 fps median and p95 frame ≤22 ms at 1440 on the dev Mac; ≥30 fps on a mid iPhone; ≤40 draw calls; ≤400k triangles; scene chunk ≤300 kB gzip; GLB ≤800 kB.
6. **Gameplay:** ≥80% first-try ramp success with no instruction; course completable without the HUD.
7. **Non-negotiable:** Work index reachable in ≤2 actions from every state; axe zero violations held; reduced motion still stops all draws.
