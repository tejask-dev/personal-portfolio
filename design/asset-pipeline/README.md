# Licensed yacht asset pipeline

This directory preserves the offline recipe and measured evidence for the locally hosted yacht. These development tools are separate from the application's dependencies and do not ship in its bundle.

Source: **motoryacht 35** by **angelo raffaele catalano**, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), [original model](https://sketchfab.com/3d-models/motoryacht-35-0bdd7a0de7254426890bb5745bb7da6d). See `../SOURCES.md` and `../../client/public/open-water/yacht-attribution.txt` for the complete provenance and modification notice. `source-license.json` preserves the primary Sketchfab API response retrieved on 2026-09-29.

The source was an existing glTF conversion distributed at this pinned mirror revision:

`https://raw.githubusercontent.com/bob6664569/open-water/bc8e763b47602d90e9a69cc2ea3a93d3a1d41c81/site/assets/boats/motoryacht_10.7r.glb`

Its SHA-256 must be `f3272a5c660705b0c4c1a0dca4195a7f60822f0d09d290a1a37ff6fa0677985b`. The processing script refuses a different input. Download the source to a temporary working directory; the 17 MB original is deliberately not duplicated in this repository.

Run from this directory, using Node 22 or newer:

```sh
npm ci --ignore-scripts
node optimize.mjs /absolute/path/to/motoryacht_10.7r.glb /absolute/path/to/yacht.glb
```

The ordered pipeline removes the separate flag fabric, welds vertices, simplifies with ratio `0.2` / error `0.001`, prunes unused resources, optimizes the vertex cache, and quantizes position/normal/UV attributes to 16/12/14 bits. It preserves the creator's metadata and original material names, appends the modification notice, then runs Khronos glTF Validator. It needs no runtime compression decoder.

Reviewed output: **3,294,156 bytes, 160,180 triangles, 32 meshes, 20 source materials, no textures, no external buffers**. SHA-256: `a830f17af48c90fb0a830a1f0a8b50858199726647450948043c8e7887daca0a`. The original has 772,782 triangles and 35 meshes. Recorded validator evidence reports zero errors, warnings, or infos. Source and result were rendered at two identical camera angles using Three.js r167 and visually inspected for hull, rail, deck, window, and seating silhouette preservation.

The portable script in this directory was rerun against the reviewed source on 2026-09-29. It reproduced the distributed GLB byte for byte (matching SHA-256 above), and its fresh validator run again reported zero errors, warnings, infos, or hints.

Inspect a rebuilt result before copying it to `client/public/open-water/yacht.glb`. The runtime adaptation in `scene/YachtAsset.ts` decodes quantized geometry, bakes transforms, sets length/waterline placement, and replaces source materials with 13 shared scene materials. Single-material static geometry is then merged by material, reducing 32 source meshes to 13 runtime meshes. Multi-material meshes, if encountered, retain their groups. This does not alter the source asset file or triangles. `runtime-batching-check.json` records the standalone CPU loader comparison, including exact per-material expanded-triangle position/normal hashes and disposal checks; it is not a browser GPU performance measurement.
