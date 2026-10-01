# Open Water V3 wildlife

Dakota and the three school-fish rest meshes are adaptations of **Animated Fish Pack**, created by **Quaternius**, released under **CC0 1.0 Universal**.

- Creator: https://quaternius.com/packs/animatedfish.html
- Source distribution: https://opengameart.org/content/animated-fish
- License: https://creativecommons.org/publicdomain/zero/1.0/
- Source files are preserved in `design/open-water-v3/research-assets/quaternius-animated-fish/` in this repository.

`dakota.glb` adapts the actual Dolphin FBX, with welded and subdivided geometry, a refined swept dorsal, smooth normals, a new blue-gray/cream vertex-color finish, small embedded eyes, a rebuilt 13-bone skeleton using the source landmarks, and newly assigned normalized skin weights (at most four per vertex). The original imported animation is not used. The complete 1.6-second vertical swim loop is newly authored, including matching first and last keys. Source authorship does not imply creator endorsement of this adaptation or of Dakota's fictional characterization.

`reef-fish.glb` contains the actual Fish1, Fish2 and Fish3 rest meshes. Their source materials are baked into restrained vertex colors and their transforms are normalized. The runtime instances these meshes and supplies its own tail motion and responsive school paths.

The immediate fallback dolphin, octopus, cleaner wrasse, and fallback school fish are original procedural geometry authored for this portfolio. Dakota remains an anatomically dolphin-shaped character who identifies as a shark; no costume fin or transformation is used.

Rebuild assets with `node scripts/build-open-water-wildlife.mjs`. `wildlife-manifest.json` records source hashes, output sizes and rig/geometry data. This rebuild uses Three.js tools already present in the project; it does not require an external service or Blender installation.
