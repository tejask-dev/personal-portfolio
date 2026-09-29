# Open Water content and source audit

Checked 2026-09-29. No remote publishing is part of this implementation.

| Claim or material | Source and treatment |
| --- | --- |
| Tejass Kaushik; Founding Software Engineer at Anticipation Labs; Anticipy being built; Fellowship website/application flows, deployment infrastructure, early operations | Owner-provided Open Water master brief, section 4. No promotion to founder, CTO, or hardware/AI owner. No general-availability claim. |
| Anticipy conversation → proposal → approval → connected software action | Approved concept in supplied brief. `client/public/open-water/anticipy-sequence.svg` is an original diagram explicitly marked illustrative, not product UI or footage. No microphone or external execution. |
| Former Stellar CTO; 40,000+ learners, 80+ courses, 130+ volunteers | Role from owner brief and existing portfolio. [Stellar's public homepage](https://stellarlearning.app/) retrieved 2026-09-29 confirms all three figures. Every metric is attributed to Stellar; no monthly-active, paid-user, or individually-acquired interpretation. Existing owned `stellar-current.png` retained. |
| Western University Computer Science and Ivey AEO | Owner brief. Removed “incoming” and graduation-year inference from active profile. No completed HBA degree or current HBA enrollment asserted. |
| 34-country study, co-authorship, 2025 journal inclusion and first place | [Youreka's research page](https://yourekacanada.org/research-1) links [the 2025 journal](https://drive.google.com/file/d/1lTrTsLfvYSEkUlYoGWTSYcoekdeiJqu4/view). Retrieved actual 64-page PDF, inspected text of first paper (PDF pages 3–12). Opening paper is marked the 2025 first-place winner. Actual journal author line reads “Tejas Kaushik, Liyona Wang, Shikai Jin, Elijah Murtagh”; portfolio name remains owner-correct “Tejass.” Older owned manuscript excerpt says “YoYo Wang”; caption identifies it as original manuscript, and body uses final journal's author name. |
| Research findings and limits | Actual journal reports r = -0.3464; described as weak negative association, not causation. Country-level aggregated/estimated data, missing-country exclusions, fertility years 2016–2022 versus treatment year 2022 are explicitly acknowledged. No new chart or synthetic data produced. No claim of peer review. |
| Soma AI | Existing portfolio content retained: team-built experiment, developer/backend contribution, 300+ tried it attributed to team, closed in 2026. Historical owned image labelled accordingly; no current company success claim. |
| DocuBridge and client-web archive | Existing routes and scoped contribution retained. Internship project labelled prototype. Removed financial engagement value to follow brief's exclusion of financial metrics. No client names added. |
| Portrait | Existing `client/src/assets/Professional photo shoot seteve jobs kinda photo must use.jpeg` confirmed. Original file unmodified. |
| Contacts | Only brief-approved Outlook email, LinkedIn, GitHub, Instagram. Removed school email from active profile and structured metadata. |
| Geography/instrumentation | Fictional navigation world. Public content makes no yacht ownership, travel, sailing-credential, weather, or real measured-telemetry claim. |

## Source assets and rendering

Original portfolio images remain project artifacts. The supplied research image is a manuscript excerpt, not fabricated UI. New Anticipy SVG is an authored explanatory diagram and contains no third-party assets, logos, fonts, or product screenshots. No private product material was consulted for public claims.

`caseStudyContent.ts` contains the single source for case-study prose. React imports it with bundled imagery; `scripts/prerender.ts` uses it to write static, complete text and metadata for all existing `/case-studies/:slug` routes plus Anticipy. It emits both `<slug>.html` for extensionless static routes and `<slug>/index.html` for directory-index hosts. Homepage HTML includes identity, direct work links, and contact before JavaScript. No-JavaScript readers receive the same case-study prose after production build. Local build evidence does not establish deployed hosting behavior; production routing must still be checked when deployment is separately authorized.

Unused legacy components remain outside the active route tree. Their stale copy is not surfaced by Open Water; this change avoids expanding into unrelated component deletion.

## Implementation verification

- `node --experimental-strip-types scripts/prerender.ts`: passed; six case-study HTML documents generated.
- Static output checks: all six titles, canonical URLs, case-study headings, section headings, and valid route-specific WebPage JSON-LD present.
- Final `npm run check` and `npm run build`: passed after integration. Six case studies and their route-specific initial documents are generated successfully.
- [Vercel filesystem precedence](https://vercel.com/docs/project-configuration/vercel-json) supports serving generated route files before the existing catch-all rewrite. Hosted responses still require deployment verification.

## Production-preview route verification

`tests/open-water-static.mjs` passed 13/13 checks against built output served by Vite preview at `http://127.0.0.1:4173`, using desktop Google Chrome with a 390 × 844 viewport. Homepage and all six direct case routes exposed identity/prose without JavaScript. Each route had its own title, canonical, h1, section prose, and valid WebPage structured data. All six JavaScript routes returned to `/#voyage` with focus on `take-helm`; no overflow or unhandled browser errors appeared. Initial paper-style screenshots were inspected and remained readable. They are a deliberate static reading presentation; the homepage changes to the voyage interface when the application mounts.

The first run caught extensionless paths falling through to the homepage; emitting sibling `<slug>.html` files fixed the issue, and the repeated suite passed. Vercel configuration now sets `cleanUrls: true` and uses an extensionless `/` SPA rewrite destination, following [Vercel's documented HTML resolution and rewrite rules](https://vercel.com/docs/project-configuration/vercel-json#cleanurls). Filesystem routes take precedence. Hosted behavior remains unverified until a separately authorized deployment.
