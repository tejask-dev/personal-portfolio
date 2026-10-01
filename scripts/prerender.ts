import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  caseStudyContent,
  type CaseStudyContent,
} from "../client/src/data/caseStudyContent.ts";
import { anticipyArtifact } from "../client/src/components/portfolio-v4/content.ts";
import { profile } from "../client/src/data/profile.ts";
import { scrollDiveStaticHtml } from "../client/src/features/scroll-dive/content.ts";
import { anticipyStaticHtml, careerStaticHtml, flagshipStaticHtml } from "../client/src/components/portfolio-v4/staticHtml.ts";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  SITE_URL,
} from "../client/src/lib/siteMetadata.ts";

/**
 * Small static shell for Vite's existing routes. Uses the same content as React;
 * no headless browser, network requests, or duplicated case-study copy.
 * The React app takes over #root when JavaScript is available.
 */
const outputArgument = process.argv.indexOf("--out-dir");
const outputDirectory =
  outputArgument >= 0
    ? path.resolve(
        process.argv[outputArgument + 1] ||
          (() => {
            throw new Error("--out-dir needs a directory");
          })(),
      )
    : path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../docs");
const indexPath = path.join(outputDirectory, "index.html");
// Built CSS contains the complete reading layer. Remove the legacy inline
// fallback rules, which otherwise override its typography after the CSS link.
const template = (await readFile(indexPath, "utf8")).replace(
  /<style>\s*\.static-portfolio[\s\S]*?<\/style>/,
  "",
);
const base = template.match(/<script[^>]+src="([^"?]*?)assets\//)?.[1] ?? "/";
const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character]!,
  );
const homeLink = (hash = "") => `${base}${hash}`;
const caseLink = (slug: string) => `${base}case-studies/${slug}`;

function applyMetadata(
  html: string,
  title: string,
  description: string,
  route: string,
) {
  const canonical = `${SITE_URL}${route}`;
  const values: Record<string, string> = {
    description,
    "og:title": title,
    "og:description": description,
    "og:url": canonical,
    "twitter:title": title,
    "twitter:description": description,
  };
  let result = html.replace(
    /<title>[\s\S]*?<\/title>/,
    `<title>${escape(title)}</title>`,
  );
  for (const [key, value] of Object.entries(values)) {
    const pattern = new RegExp(
      `(<meta\\s+(?:name|property)="${key}"\\s+content=")[^"]*("\\s*\\/?>)`,
      "g",
    );
    result = result.replace(
      pattern,
      (_match, prefix, suffix) => `${prefix}${escape(value)}${suffix}`,
    );
  }
  result = result.replace(
    /(<link rel="canonical" href=")[^"]*("\s*\/?>)/,
    (_match, prefix, suffix) => `${prefix}${canonical}${suffix}`,
  );
  if (route !== "/") {
    result = result.replace(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
      (_match, json) => {
        const data = JSON.parse(json);
        const page = data["@graph"].find(
          (entry: Record<string, unknown>) => entry["@type"] === "ProfilePage",
        );
        Object.assign(page, {
          "@type": "WebPage",
          "@id": canonical,
          url: canonical,
          name: title,
          description,
        });
        return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`;
      },
    );
  }
  return result;
}

const assets = await readdir(path.join(outputDirectory, "assets"));
const artifactPrefixes: Record<CaseStudyContent["imageAsset"], string> = {
  anticipy: "",
  stellar: "stellar-current-",
  research: "Research Paper-",
  docubridge: "Docubridge-",
  soma: "SomaAI-",
};
function asset(prefix: string) {
  const file = assets.find(
    (name) => name.startsWith(prefix) && /\.(png|jpe?g|webp)$/i.test(name),
  );
  if (!file) throw new Error(`Missing built portfolio artifact: ${prefix}`);
  return `${base}assets/${encodeURIComponent(file)}`;
}
function studyImage(study: CaseStudyContent) {
  return study.imageAsset === "anticipy"
    ? `${base}${anticipyArtifact.desktop}`
    : asset(artifactPrefixes[study.imageAsset]);
}
const external = (href: string, label: string, className = "") =>
  `<a${className ? ` class="${className}"` : ""} href="${escape(href)}">${escape(label)} <span aria-hidden="true">↗</span></a>`;
const paragraphs = (body: string[]) =>
  body.map((p) => `<p>${escape(p)}</p>`).join("");
const emailButton = () =>
  `<a class="pv-button" href="mailto:${profile.email}">Contact about opportunities <span aria-hidden="true">↗</span></a>`;
const emailAddress = () =>
  `<a class="pv-email" href="mailto:${profile.email}">${profile.email}</a>`;
function projectIndexHtml(study: CaseStudyContent, index: number) {
  const sourceHref = (study.slug === "anticipy" ? study.artifactSource?.href : study.decision.source) ?? study.links.find((link) =>
    /^https:\/\/github\.com\/[^/]+\/[^/]+\/blob\/[a-f0-9]{7,40}\//i.test(link.href),
  )?.href;
  const sourceLabel = sourceHref?.startsWith("https://github.com/")
    ? "Inspect the source"
    : study.artifactSource?.label ?? "Read source context";
  return `<article class="pv-project">
    <a class="pv-project-image pv-project-image--${study.imageTreatment === "paper" ? "research" : "product"}" href="${caseLink(study.slug)}" aria-label="${escape(`Read the ${study.title} case study · ${study.artifactLabel}`)}"><noscript><img src="${studyImage(study)}" alt="" width="900" height="580" loading="lazy" /></noscript><span>${escape(study.artifactLabel)}</span></a>
    <div class="pv-project-heading"><span class="pv-project-number" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span><h3><a href="${caseLink(study.slug)}">${escape(study.title)} <span aria-hidden="true">↗</span></a></h3></div>
    <p class="pv-project-description">${escape(study.shortDescription)}</p>
    <dl class="pv-project-meta"><div><dt>My role</dt><dd>${escape(study.role)}</dd></div><div><dt>Stage</dt><dd>${escape(study.status)}</dd></div><div><dt>Period</dt><dd>${escape(study.period)}</dd></div></dl>
    <p class="pv-project-proof">${escape(study.proof)}</p>
    ${sourceHref ? `<p class="pv-project-proof">${external(sourceHref, sourceLabel, "pv-text-link")}</p>` : ""}
  </article>`;
}
function nav(casePage = false) {
  return `<nav class="pv-case-nav" aria-label="${casePage ? "Case study navigation" : "Portfolio"}"><a class="pv-wordmark" href="${homeLink()}">Tejass Kaushik<span> / Open Water</span></a><div>${casePage ? `<a href="${homeLink("#voyage")}">Return to water</a>` : ""}<a href="${homeLink("#work")}">Work index</a><a href="${homeLink("#about")}">About</a><a href="mailto:${profile.email}">Contact ↗</a></div></nav>`;
}
function artifact(study: CaseStudyContent) {
  return `<figure class="pv-case-artifact pv-shell" id="artifact"><div class="pv-artifact-label"><span>${escape(study.artifactLabel)}</span><span>Field note / ${escape(study.kicker.split(" / ")[0])}</span></div><div class="pv-case-image pv-case-image--${study.imageTreatment ?? "cover"}"><img src="${studyImage(study)}" alt="${escape(study.imageAlt)}" loading="eager" /></div><figcaption><p>${escape(study.imageCaption)}</p>${study.artifactSource ? external(study.artifactSource.href, study.artifactSource.label) : ""}</figcaption></figure>`;
}
function studyHtml(study: CaseStudyContent) {
  const next =
    caseStudyContent[
      (caseStudyContent.indexOf(study) + 1) % caseStudyContent.length
    ];
  return `<div class="static-portfolio portfolio-v3 pv-case"><a class="skip-link" href="#main">Skip to case study</a>${nav(true)}<main id="main">
    <header class="pv-case-hero pv-shell"><div class="pv-case-breadcrumb"><a href="${homeLink("#work")}">← All projects</a><span>${escape(study.kicker)}</span></div><p class="pv-stage">${escape(study.status)}</p><h1>${escape(study.title)}</h1><p class="pv-case-thesis">${escape(study.thesis)}</p><dl class="pv-case-facts"><div><dt>My role</dt><dd>${escape(study.role)}</dd></div><div><dt>Period</dt><dd>${escape(study.period)}</dd></div><div><dt>Focus</dt><dd>${escape(study.stack.slice(0, 3).join(" · "))}</dd></div></dl><p class="pv-case-summary">${escape(study.summary)}</p></header>
    ${study.slug === "anticipy" ? anticipyStaticHtml(base) : `${artifact(study)}
    <article class="pv-case-reading pv-shell"><aside class="pv-reading-index" aria-label="On this page"><p class="pv-eyebrow">In this case</p><nav><a href="#context">Context</a><a href="#contribution">My contribution</a><a href="#decision">${escape(study.decision.label.split(" / ")[0])}</a><a href="#outcome">Outcome &amp; limits</a><a href="#sources">Sources</a></nav><p>${escape(study.stack.join(" / "))}</p></aside><div class="pv-case-prose">
    <section id="context"><p class="pv-eyebrow">01 / Context</p><h2>${escape(study.sections[0].heading)}</h2>${paragraphs(study.sections[0].body)}</section>
    <section id="contribution"><p class="pv-eyebrow">02 / Scope</p><h2>My part in the work.</h2><ul class="pv-contributions">${study.contributions.map((p) => `<li>${escape(p)}</li>`).join("")}</ul><div class="pv-team-context"><h3>Team &amp; project context</h3><p>${escape(study.teamContext)}</p></div></section>
    <section class="pv-decision" id="decision"><p class="pv-eyebrow">03 / ${escape(study.decision.label)}</p><h2>${escape(study.decision.title)}</h2>${study.decision.label.includes("team context") ? "<p>This section describes the team’s product context; my own scope is listed under My contribution.</p>" : ""}${paragraphs(study.decision.body)}${study.decision.source ? external(study.decision.source, "Inspect the source", "pv-text-link") : ""}</section>
    <section id="outcome"><p class="pv-eyebrow">04 / Outcome &amp; limits</p>${study.sections
      .slice(1)
      .map(
        (section) =>
          `<h2>${escape(section.heading)}</h2>${paragraphs(section.body)}`,
      )
      .join(
        "",
      )}<dl class="pv-context-facts">${study.metrics.map((metric) => `<div><dt>${escape(metric.label)}</dt><dd>${escape(metric.value)}</dd></div>`).join("")}</dl></section>
    <div class="pv-takeaway"><span class="pv-eyebrow">What I carry forward</span><p>${escape(study.lesson)}</p></div>
    <section id="sources"><p class="pv-eyebrow">05 / Follow the evidence</p><h2>Sources &amp; context.</h2><p class="pv-evidence-note">${escape(study.evidenceNote)}</p><ul class="pv-source-list" aria-label="Project sources and links">${study.links.map((link) => `<li>${external(link.href, link.label)}${link.note ? `<p>${escape(link.note)}</p>` : ""}</li>`).join("")}</ul></section></div></article>
    `}
    <section class="pv-case-contact"><div class="pv-shell"><p class="pv-eyebrow">A next conversation</p><h2>Have something<br /><em>in mind?</em></h2><p>I’d like to hear what you’re building and where I could contribute.</p>${emailButton()}${emailAddress()}</div></section>
    <footer class="pv-case-end pv-shell"><a href="${homeLink("#voyage")}">← Return to water</a><a href="${caseLink(next.slug)}"><span>Next case</span><strong>${escape(next.title)}</strong><span aria-hidden="true">↗</span></a></footer>
  </main></div>`;
}
function homeHtml() {
  return `<div class="static-portfolio portfolio-v3"><a class="skip-link" href="#work">Skip to work</a>${nav()}<main id="main">
    <header class="pv-static-intro" id="voyage"><div class="pv-shell"><p class="pv-eyebrow">Software engineer / Open Water</p><h1>Tejass Kaushik.</h1><p class="pv-lead">${escape(profile.headline)}</p><p>${escape(profile.intro)}</p>${emailButton()}<a class="pv-text-link" href="#work">View the work ↗</a></div></header>
    ${scrollDiveStaticHtml(base)}
    ${flagshipStaticHtml(base)}
    ${careerStaticHtml(base)}
    <section class="pv-work pv-shell" id="work"><header class="pv-section-heading"><p class="pv-eyebrow">01 / The work</p><h2>The work,<br /><em>in context.</em></h2><p>Product engineering, platform leadership, and questions worth investigating. Five projects, with my role and the evidence behind each.</p><dl class="pv-context-facts" aria-label="Attributed project evidence">${profile.proof.map(proof => `<div><dt>${escape(proof.label)}</dt><dd>${escape(proof.value)}</dd></div>`).join("")}</dl></header><div class="pv-work-grid">${caseStudyContent.map(projectIndexHtml).join("")}</div></section>
    <section class="pv-about" id="about"><div class="pv-shell pv-about-grid"><figure><noscript><img src="${asset("Professional photo shoot seteve jobs kinda photo must use-")}" alt="Tejass Kaushik behind his sticker-covered laptop, photographed in black and white." width="420" height="336" loading="lazy" /></noscript><figcaption>Tejass Kaushik / At the keyboard.</figcaption></figure><div class="pv-about-copy"><p class="pv-eyebrow">02 / A little about me</p><h2>Curiosity,<br /><em>put to work.</em></h2><p class="pv-lead">I like the stretch between an idea and something people can actually use—and the work it takes to close it.</p><p>I’m Tejass, a Founding Software Engineer at Anticipation Labs, building Anticipy. Previously, I was CTO at Stellar Learning.</p><p>I study Computer Science at Western University and hold Ivey AEO status. My work has taken me from application flows and backend systems to collaborative research.</p><p>I work with AI tools as part of the engineering process: set the problem, make the acceptance criteria concrete, review the result, and test what a person will actually experience. Sometimes that means a browser. Sometimes it means a phone and a prototype pendant on the bench.</p><p>I also love water, boats, and yachts. Open Water gives that curiosity a place in the portfolio. The setting is imagined; the work is real.</p>${external(profile.socials.linkedin, "More on LinkedIn", "pv-text-link")}</div></div></section>
    <section class="pv-contact pv-shell" id="contact"><p class="pv-eyebrow">03 / Start a conversation</p><div class="pv-contact-grid"><h2>What are<br /><em>you building?</em></h2><div class="pv-contact-copy"><p>Have an engineering opportunity in mind? I’d like to hear what you’re building and where I could contribute.</p>${emailButton()}${emailAddress()}<div class="pv-socials">${external(profile.socials.linkedin, "LinkedIn")}${external(profile.socials.github, "GitHub")}</div></div></div></section>
    </main><footer class="pv-footer"><span>Tejass Kaushik</span><p>Open Water / An independent portfolio</p><a href="#voyage">Return to the top ↑</a></footer>
    <details class="pv-world-credits"><summary>World credits</summary><p>The scrolling descent, diver, reef, fish and fallback illustration are original Open Water artwork created with Codex assistance. Native scroll animation uses Motion. <a href="${base}assets/open-water-v5/CREDITS.md">Descent sources and license</a>.</p><p>The V4 superyacht, tender, Nemo and Dory models, regional reefs, caves, and activity objects are original Open Water art, created with Codex and Claude assistance.</p><p>Dakota and the Crown Reef school-fish meshes: ${external("https://quaternius.com/packs/animatedfish.html", "Quaternius Animated Fish")}, ${external("https://creativecommons.org/publicdomain/zero/1.0/", "CC0")}. Dakota’s rig, animation and materials were adapted for this world. <a href="${base}assets/open-water-v3/WILDLIFE-CREDITS.md">Adaptation notes</a>.</p><p>The surface architecture grew from the original Open Water prototype. This world, its instruments, and its challenges are fictional.</p><details><summary>Earlier edition / V3 vessel attribution</summary><p>Earlier Open Water editions used ${external("https://sketchfab.com/3d-models/motoryacht-35-0bdd7a0de7254426890bb5745bb7da6d", "motoryacht 35")} by ${external("https://sketchfab.com/angeloraffaelecatalano", "angelo raffaele catalano")}, licensed under ${external("https://creativecommons.org/licenses/by/4.0/", "CC BY 4.0")}. The retained V3 asset was adapted from a converted GLB: flag removed, geometry simplified and quantized, materials and scale changed for Open Water. <a href="${base}assets/open-water-v3/YACHT-LOD-CREDITS.md">V3 adaptation notes</a>.</p></details></details></div>`;
}
function replaceRoot(html: string, content: string) {
  // The root may contain nested divs. Match its final closing tag before body,
  // rather than stopping at the first inner div of the initial document.
  return html
    .replace(
      /<div id="root">[\s\S]*<\/div>/,
      `<div id="root">${content}</div>`,
    )
    .replace(/[\t ]+$/gm, "");
}

const index = replaceRoot(
  applyMetadata(template, DEFAULT_TITLE, DEFAULT_DESCRIPTION, "/"),
  homeHtml(),
);
await writeFile(indexPath, index);
for (const study of caseStudyContent) {
  const route = `/case-studies/${study.slug}`;
  const html = replaceRoot(
    applyMetadata(
      template,
      `${study.title} | Work by Tejass Kaushik`,
      study.summary,
      route,
    ),
    studyHtml(study),
  );
  const directory = path.join(outputDirectory, "case-studies", study.slug);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, "index.html"), html);
  // Both forms keep extensionless routes useful on Vite, Vercel and GitHub Pages.
  await writeFile(
    path.join(outputDirectory, "case-studies", `${study.slug}.html`),
    html,
  );
}
console.log(
  `Prerendered homepage and ${caseStudyContent.length} case-study routes with shared content, artifacts and metadata.`,
);
