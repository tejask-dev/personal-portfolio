# Open Water — V4 art credits

Original superyacht, tender, clownfish, blue tang, reefs, caves and activity objects were created for Tejass Kaushik's portfolio, with Claude and Codex assistance. Editable model source and repeatable Low/High glTF exports are maintained in the portfolio repository. No third-party yacht or fish mesh, texture or dialogue was used for these V4 assets.

Dakota and the inherited wildlife use adapted Quaternius assets under CC0; the preceding wildlife credits remain available in the V3 asset directory.

Design research: [Heesen Project Gemini](https://www.heesenyachts.com/fleet/yn19755-project-gemini/) informed deck organization; [Giant Squid](https://giantsquidstudios.com/Camera-Control-in-ABZU) informed camera principles; [NOAA](https://oceanexplorer.noaa.gov/education/bioluminescence/) informed biological-light direction. These references supplied principles, not geometry. The vessels and habitats are fictional.


## Procedural swimming

The continuous head-to-tail swimming wave is adapted from [0s0ka/sea](https://github.com/0s0ka/sea), commit `d773646bfe5e66d8ab312429591b4dbf12e3d389`, `src/fishMaterial.js`, under MIT (Copyright 2026 0s0ka). See [the complete license and adaptation notice](THIRD-PARTY-SWIMMING.txt). Open Water adds an ascending envelope, corrected deformed normals, CPU deformation for its original companions, GPU instance phases for schools, steering response and pause-aware timing. The fish geometry remains original; no external models were imported.
