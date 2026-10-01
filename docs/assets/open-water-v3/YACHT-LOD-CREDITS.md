# Open Water V3 yacht low-detail asset

**motoryacht 35**, by **angelo raffaele catalano**, licensed under **Creative Commons Attribution 4.0 International (CC BY 4.0)**.

- Model: https://sketchfab.com/3d-models/motoryacht-35-0bdd7a0de7254426890bb5745bb7da6d
- Creator: https://sketchfab.com/angeloraffaelecatalano
- License: https://creativecommons.org/licenses/by/4.0/
- Existing source adaptation and provenance: `design/SOURCES.md` and `client/public/open-water/yacht-attribution.txt`.

`yacht-low.glb` derives from the repository's existing `client/public/open-water/yacht.glb`. The existing adaptation removed the separable Italian flag, simplified and quantized the source geometry, and retained its original material names. This additional LOD uses the installed meshoptimizer 0.18.1 to simplify each material primitive while retaining existing attribute seams, then compacts unused vertices. Material names, material boundaries, node transforms and source-native coordinates remain intact. The original artist does not endorse this portfolio.

The output contains 59,109 triangles (source adaptation: 160,180), occupies 2,027,248 bytes, and batches to the same 13 materials through the current static yacht loader. It requires no runtime compression decoder. Maximum reported relative primitive simplification error is 0.01495; this is an algorithmic geometric error measure, not a perceptual quality guarantee.

`scripts/build-open-water-yacht-lod.mjs` rebuilds the artifact using existing local dependencies. `yacht-lod-manifest.json` records the source hash and per-primitive reductions. `scripts/check-open-water-yacht-lod.mjs` renders matching side, front-quarter, rear-quarter and small-scale views through the actual static loader. Inspection showed preserved principal silhouettes and small changes to deck/trim detail. Physical-device performance remains an integrated-scene test.
