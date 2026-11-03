# Tejass Kaushik

A portfolio of selected work, with an optional Open Water experience. The reading pages remain usable without JavaScript or WebGL. Built with React, TypeScript and Vite; the explorable world uses Three.js and React Three Fiber.

## Develop and check

Node 22.6+ and npm are required.

```sh
npm ci
npm run dev
npm run check
npm test
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
```

`npm run build` writes the generated site to `docs/`. `npm run build:github` supports the `/personal-portfolio/` base path. Neither command publishes. The canonical site is [tejasskaushik.com](https://tejasskaushik.com).

Controller and interaction checks live in `tests/`. For a production preview, run the relevant browser checks with `QA_URL=http://127.0.0.1:4173`; the package scripts include static routes, touch layouts, accessibility, optional graphics and performance coverage. Cross-engine checks require installed Playwright browsers. Emulation does not establish physical-device performance.

## Content and code

- `client/src/data/profile.ts`: identity and contact details.
- `client/src/data/selectedWork.ts`, `projects.ts`, `caseStudyContent.ts`: work selection, evidence, attribution and case-study content.
- `client/src/components/portfolio-v4/`: Anticipation Labs feature, Elda and Anticipy shared content, and Anticipy case-study presentation.
- `scripts/prerender.ts`: initial HTML and metadata for the homepage and case-study routes.
- `client/src/features/open-water/`: the optional world, navigation, controllers and rendering.
- `client/src/features/scroll-dive/`: the separate decorative descent.
- `design/tokens.css`: shared design tokens.

Keep individual contributions distinct from team outcomes, and historical claims distinct from current product behavior. Public artifacts and their provenance live in `client/public/portfolio/`.

## Credits

Asset notices ship with the site: [V4 art](client/public/assets/open-water-v4/ART-CREDITS.md), [fish-swimming license](client/public/assets/open-water-v4/THIRD-PARTY-SWIMMING.txt), [wildlife](client/public/assets/open-water-v3/WILDLIFE-CREDITS.md), [scroll descent](client/public/assets/open-water-v5/CREDITS.md), and [product imagery](client/public/portfolio/ARTIFACTS.md). Type uses [Aspekta](client/public/licenses/Aspekta-OFL.txt) and [Spectral](client/public/licenses/Spectral-OFL.txt), locally hosted as subset WOFF2 files. The modified Aspekta subset uses the internal family name “Portfolio Sans”; the original copyright and license remain included.

V4 vessels and named companions are original editable geometry authored with Claude Desktop and integrated by Codex. The historical V3 yacht adapts **motoryacht 35** by **angelo raffaele catalano**, CC BY 4.0. Wildlife adapts **Quaternius Animated Fish**, CC0, with a rebuilt Dakota rig and loop. Fish swimming adapts the MIT-licensed **0s0ka/sea** implementation. The architecture, habitats, octopus, instruments and fallback illustrations were authored for Open Water. Source notices and adaptation details remain beside the assets and in the website credits.
