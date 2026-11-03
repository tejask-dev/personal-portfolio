import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  caseStudyContent,
  type CaseStudyContent,
} from "../client/src/data/caseStudyContent.ts";
import { anticipyArtifact } from "../client/src/components/portfolio-v4/content.ts";
import { socialMetadata } from "../client/src/lib/socialMetadata.ts";
import { workbenchStatic } from "../client/src/components/editorial/workbenchStatic.ts";
import { moreProjectsHtml } from "../client/src/components/editorial/notesContent.ts";
import { profile, moleculeProject } from "../client/src/data/profile.ts";
import { anticipyStaticHtml, flagshipStaticHtml } from "../client/src/components/portfolio-v4/staticHtml.ts";
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
  const social = socialMetadata(route);
  const values: Record<string, string> = {
    description,
    "og:title": title,
    "og:description": description,
    "og:url": canonical,
    "twitter:title": title,
    "twitter:description": description,
    "og:type": social.type,
    "og:image": social.image,
    "og:image:alt": social.alt,
    "twitter:image": social.image,
    "twitter:image:alt": social.alt,
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
  if (study.imageAsset === "research") return `${base}portfolio/research-evidence.svg`;
  return study.imageAsset === "anticipy"
    ? `${base}${anticipyArtifact.desktop}`
    : asset(artifactPrefixes[study.imageAsset]);
}
const external = (href: string, label: string, className = "") =>
  `<a${className ? ` class="${className}"` : ""} href="${escape(href)}"${href.startsWith("https:") ? ' target="_blank" rel="noreferrer"' : ""}>${escape(label)} <span aria-hidden="true">↗</span></a>`;
const paragraphs = (body: string[]) =>
  body.map((p) => `<p>${escape(p)}</p>`).join("");
const emailButton = () =>
  `<a class="pv-button" href="mailto:${profile.email}">Email me <span aria-hidden="true">↗</span></a>`;
const emailAddress = () =>
  `<a class="pv-email" href="mailto:${profile.email}">${profile.email}</a>`;
function projectIndexHtml(study: CaseStudyContent, index: number) {
  const compact = study.slug === "soma-ai";
  const sourceHref = (study.artifactSource?.href ?? study.decision.source) ?? study.links.find((link) =>
    /^https:\/\/github\.com\/[^/]+\/[^/]+\/blob\/[a-f0-9]{7,40}\//i.test(link.href),
  )?.href;
  const sourceLabel = sourceHref?.startsWith("https://github.com/")
    ? "Inspect the source"
    : study.artifactSource?.label ?? "Read source context";
  return `<article class="pv-project${compact ? " eh-project-compact" : ""}">
    ${study.slug !== "soma-ai" ? `<a class="pv-project-image pv-project-image--${study.imageTreatment === "paper" ? "research" : "product"}" href="${caseLink(study.slug)}" aria-label="${escape(`Read the ${study.title} case study · ${study.artifactLabel}`)}"><img src="${studyImage(study)}" alt="${escape(study.imageAlt)}" width="900" height="580" loading="lazy" decoding="async" /><span>${escape(study.artifactLabel)}</span></a>` : ""}
    <div class="pv-project-heading"><span class="pv-project-number" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span><h3><a id="read-${escape(study.slug)}" href="${caseLink(study.slug)}">${escape(study.title)} <span aria-hidden="true">↗</span></a></h3></div>
    <p class="pv-project-description">${escape(study.shortDescription)}</p>
    ${compact ? "" : `<dl class="pv-project-meta"><div><dt>My role</dt><dd>${escape(study.role)}</dd></div><div><dt>Stage</dt><dd>${escape(study.status)}</dd></div><div><dt>Period</dt><dd>${escape(study.period)}</dd></div></dl>`}
    <p class="pv-project-proof">${escape(study.proof)}</p>
    ${sourceHref && study.slug !== "soma-ai" ? `<p class="pv-project-proof">${external(sourceHref, sourceLabel, "pv-text-link")}</p>` : ""}
  </article>`;
}
function nav(casePage = false) {
  return `<nav class="pv-case-nav" aria-label="${casePage ? "Case study navigation" : "Portfolio"}"><a class="pv-wordmark" href="${homeLink()}">Tejass Kaushik</a><div><a href="${homeLink("#work")}">Selected work</a><a href="${homeLink("#about")}">About</a><a href="mailto:${profile.email}">Contact ↗</a></div></nav>`;
}
function artifact(study: CaseStudyContent) {
  const dimensions: Record<string, [number, number]> = { stellar: [1440, 1000], docubridge: [1791, 805], soma: [1230, 564], research: [1200, 800] };
  const [width, height] = dimensions[study.imageAsset] ?? [1440, 960];
  return `<figure class="pv-case-artifact pv-shell" id="artifact"><div class="pv-artifact-label"><span>${escape(study.artifactLabel)}</span><span>Field note / ${escape(study.kicker.split(" / ")[0])}</span></div><div class="pv-case-image pv-case-image--${study.imageTreatment ?? "cover"}"><img src="${studyImage(study)}" alt="${escape(study.imageAlt)}" width="${width}" height="${height}" loading="eager" /></div><figcaption><p>${escape(study.imageCaption)}</p>${study.artifactSource ? external(study.artifactSource.href, study.artifactSource.label) : ""}</figcaption></figure>`;
}
function studyHtml(study: CaseStudyContent) {
  const next =
    caseStudyContent[
      (caseStudyContent.indexOf(study) + 1) % caseStudyContent.length
    ];
  return `<div class="static-portfolio portfolio-v3 pv-case"><a class="skip-link" href="#main">Skip to case study</a>${nav(true)}<main id="main">
    <header class="pv-case-hero pv-shell"><div class="pv-case-breadcrumb"><a href="${homeLink("#work")}">← All projects</a><span>${escape(study.kicker)}</span></div><p class="pv-stage">${escape(study.status)}</p><h1>${escape(study.title)}</h1><p class="pv-case-thesis">${escape(study.thesis)}</p><dl class="pv-case-facts"><div><dt>My role</dt><dd>${escape(study.role)}</dd></div><div><dt>Period</dt><dd>${escape(study.period)}</dd></div><div><dt>Focus</dt><dd>${escape(study.stack.slice(0, 3).join(" · "))}</dd></div></dl><p class="pv-case-summary">${escape(study.summary)}</p></header>
    ${study.slug === "anticipy" ? anticipyStaticHtml(base) : `${artifact(study)}
    <article class="pv-case-reading pv-shell"><aside class="pv-reading-index" aria-label="On this page"><p class="pv-eyebrow">In this case</p><nav><a href="#context">Context</a><a href="#contribution">What I built</a><a href="#decision">The hard part</a><a href="#outcome">Result</a><a href="#lesson">What I’d change</a><a href="#sources">Links</a></nav><p>${escape(study.stack.join(" / "))}</p></aside><div class="pv-case-prose">
    <section id="context"><p class="pv-eyebrow">01 / Context</p><h2>${escape(study.sections[0].heading)}</h2>${paragraphs(study.sections[0].body)}</section>
    <section id="contribution"><p class="pv-eyebrow">02 / What I built</p><h2>What I built.</h2><ul class="pv-contributions">${study.contributions.map((p) => `<li>${escape(p)}</li>`).join("")}</ul></section>
    <section class="pv-decision" id="decision"><p class="pv-eyebrow">03 / The hard part</p><h2>${escape(study.decision.title)}</h2>${paragraphs(study.decision.body)}${study.slug === "docubridge" ? workbenchStatic() : ""}${study.decision.source ? external(study.decision.source, study.decision.source.includes("stellarlearning.app") ? "Visit Stellar Learning" : "Explore this work", "pv-text-link") : ""}</section>
    <section id="outcome"><p class="pv-eyebrow">04 / Result</p>${study.sections
      .slice(1)
      .map(
        (section) =>
          `<h2>${escape(section.heading)}</h2>${paragraphs(section.body)}`,
      )
      .join(
        "",
      )}${study.metrics.filter(metric => /\d/.test(metric.value)).length >= 2 ? `<dl class="pv-context-facts">${study.metrics.filter(metric => /\d/.test(metric.value)).map(metric => `<div><dt>${escape(metric.label)}</dt><dd>${escape(metric.value)}</dd></div>`).join("")}</dl>` : ""}</section>
    ${study.lesson ? `<section class="pv-takeaway" id="lesson"><p class="pv-eyebrow">05 / What I’d change</p><h2>What I’d change.</h2><p>${escape(study.lesson)}</p></section>` : ""}
    <section id="sources"><p class="pv-eyebrow">06 / Links</p><h2>Explore the project.</h2><ul class="pv-source-list" aria-label="Project sources and links">${study.links.map((link) => `<li>${external(link.href, link.label)}${link.note ? `<p>${escape(link.note)}</p>` : ""}</li>`).join("")}</ul></section></div></article>
    `}
    <section class="pv-case-contact"><div class="pv-shell"><p class="pv-eyebrow">A next conversation</p><h2>Have something<br /><em>in mind?</em></h2><p>I’d like to hear what you’re building and where I could contribute.</p>${emailButton()}${emailAddress()}</div></section>
    <footer class="pv-case-end pv-shell"><a href="${homeLink("#work")}">← All projects</a><a href="${caseLink(next.slug)}"><span>Next case</span><strong>${escape(next.title)}</strong><span aria-hidden="true">↗</span></a></footer>
  </main></div>`;
}
function homeHtml() {
  const sailmark = `<svg viewBox="0 0 32 42" fill="none" aria-hidden="true"><path d="M16 4 6 25h10V4Zm2 0v21h8L18 4ZM5 29c4-4 6 4 11 0s7 4 11 0M3 34c5-4 8 4 13 0s8 4 13 0M7 39c4-3 6 3 9 0s6 3 9 0" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" /></svg>`;
  const stellar = caseStudyContent.find(study => study.slug === "stellar-learning")!;
  const research = caseStudyContent.find(study => study.slug === "global-health-research")!;
  const molecule = moleculeProject;
  const moleculeCard = `<article class="pv-project"><a class="pv-project-image pv-project-image--product" href="${molecule.href}" target="_blank" rel="noreferrer" aria-label="Visit MoleculeAI"><img src="${base}${molecule.image.replace(/^\//, '')}" alt="${escape(molecule.imageAlt)}" loading="lazy" decoding="async" width="900" height="580"/><span>${escape(molecule.artifactLabel)}</span></a><div class="pv-project-heading"><span class="pv-project-number" aria-hidden="true">02</span><h3>${external(molecule.href, molecule.title)}</h3></div><p class="pv-project-description">${escape(molecule.description)}</p><dl class="pv-project-meta"><div><dt>My role</dt><dd>${molecule.role}</dd></div><div><dt>Stage</dt><dd>${molecule.status}</dd></div><div><dt>Period</dt><dd>${molecule.period}</dd></div></dl><p class="pv-project-proof">${molecule.proof}</p><p class="pv-project-proof">${external(molecule.sourceHref, molecule.sourceLabel, "pv-text-link")}</p></article>`;
  return `<div class="static-portfolio open-water-page" id="top">
    <a class="skip-link" href="#work">Skip to work</a>
    <header class="portfolio-v3 eh-header"><a class="eh-brand" href="#top">${sailmark}Tejass Kaushik</a><nav aria-label="Primary"><a href="#work">Work</a><a href="#about">About</a><a href="#ocean">Open Water</a><a href="${base}resume">Resume</a><a href="#contact">Contact</a></nav></header>
    <main id="main">
      <section class="portfolio-v3 eh-hero pv-shell" aria-labelledby="hero-title"><p class="pv-eyebrow">Tejass Kaushik / Software engineer / ${escape(profile.location)}</p><h1 id="hero-title">${escape(profile.headline)}</h1><p class="eh-hero-role">${escape(profile.intro)}</p><div class="eh-hero-actions"><a class="pv-button" href="#work">See the work ↓</a><a class="pv-text-link" href="mailto:${profile.email}">Email me <span aria-hidden="true">↗</span></a></div><dl class="pv-context-facts eh-proof" aria-label="A few things I’ve been part of">${profile.proof.map(item => `<div><dt>${escape(item.label)}</dt><dd>${escape(item.value)}</dd></div>`).join('')}</dl></section>
      <div class="portfolio-v3">
        ${flagshipStaticHtml(base)}
        <section class="pv-work pv-shell" id="work" tabindex="-1" aria-labelledby="work-title"><header class="pv-section-heading"><p class="pv-eyebrow">01 / The work</p><h2 id="work-title" tabindex="-1">The work,<br /><em>in context.</em></h2><p>Three things I’m proudest of, then everything else.</p></header><div class="pv-work-grid">${projectIndexHtml(stellar, 0)}${moleculeCard}${projectIndexHtml(research, 2)}</div>${moreProjectsHtml(base)}</section>
        <section class="pv-about" id="about" aria-labelledby="about-title"><div class="pv-shell pv-about-grid"><figure><img src="${asset("portrait-tejass-")}" alt="Tejass Kaushik behind his sticker-covered laptop, photographed in black and white." width="420" height="336" loading="lazy" /><figcaption>Tejass Kaushik / At the keyboard.</figcaption></figure><div class="pv-about-copy"><p class="pv-eyebrow">02 / A little about me</p><h2 id="about-title" tabindex="-1">Curiosity,<br /><em>put to work.</em></h2>${profile.about.map((text, i) => `<p${i === 0 ? ' class="pv-lead"' : ''}>${escape(text)}</p>`).join('')}<p class="eh-about-links"><a class="pv-text-link" href="${base}resume">Resume ↗</a><a class="pv-text-link" href="${base}Tejass-Kaushik-Resume.pdf" download>Download PDF ↗</a>${external(profile.socials.linkedin, "LinkedIn", "pv-text-link")}${external(profile.socials.github, "GitHub", "pv-text-link")}</p></div></div></section>
        <section id="ocean" class="eh-ocean" aria-labelledby="ocean-title">
          <div class="pv-shell eh-ocean-intro"><p class="pv-eyebrow">Optional / Something I built for fun</p><h2 id="ocean-title" tabindex="-1">Open Water.</h2><p>${escape(profile.ocean)}</p><a class="eh-ocean-poster" href="#voyage" aria-label="Read the Open Water field guide"><img src="${base}portfolio/open-water-poster.webp" alt="A white superyacht on turquoise water, with islands and a lighthouse on the horizon." loading="lazy" decoding="async" width="1600" height="900"/><span>Take a different route ↗</span></a></div>
          <details class="pv-shell eh-ocean-guide" id="voyage"><summary class="pv-button eh-open-ocean">Open the field guide <span aria-hidden="true">↓</span></summary><div class="eh-ocean-intro">
            <section aria-labelledby="field-guide-title"><h3 id="field-guide-title">The world, at a glance.</h3><p>Open Water is a fictional expedition: a yacht, a lighthouse, Crown Reef, Driftwall, Blue Cathedral and Lantern Grotto. Dakota is a dolphin who is convinced she’s a shark.</p><p>The interactive world requires JavaScript and compatible graphics. Every project and contact link remains available without either.</p><nav aria-label="Field guide project routes"><ul>${caseStudyContent.map(study => `<li><a href="${caseLink(study.slug)}">${escape(study.title)}</a>: ${escape(study.role)} · ${escape(study.status)}</li>`).join('')}</ul></nav></section>
            <section id="descent" aria-labelledby="scenic-dive-title"><h3 id="scenic-dive-title">Scenic scroll dive.</h3><p>The cinematic descent is a separate, optional way through the portfolio. Animation requires JavaScript; the work and contact details remain available on this reading page.</p><p><a class="pv-text-link" href="#work">Back to the work ↑</a> <a class="pv-text-link" href="#contact">Contact Tejass ↗</a></p></section>
          </div></details>
        </section>
        <section class="pv-contact pv-shell" id="contact" aria-labelledby="contact-title"><p class="pv-eyebrow">03 / Start a conversation</p><div class="pv-contact-grid"><h2 id="contact-title" tabindex="-1">What are<br /><em>you building?</em></h2><div class="pv-contact-copy"><p>${escape(profile.contact)}</p><p class="eh-location">${escape(profile.location)}</p>${emailButton()}${emailAddress()}<div class="pv-socials">${external(profile.socials.linkedin, "LinkedIn")}${external(profile.socials.github, "GitHub")}</div></div></div></section>
      </div>
    </main>
    <footer class="portfolio-v3 pv-footer"><span>${sailmark}Tejass Kaushik</span><p>Built with React, Three.js and curiosity.</p><a href="#top">Back to top ↑</a></footer>
    <details class="portfolio-v3 pv-world-credits"><summary>World credits</summary><p>Underwater film by JUN HO LEE, via Pexels, edited for Open Water with Higgsfield Katana. Native scroll animation uses Motion. <a href="${base}assets/open-water-v5/CREDITS.md">Descent sources and license</a>.</p><p>The V4 superyacht, tender, Nemo and Dory models, regional reefs, caves, and activity objects are original Open Water art, created with Codex and Claude assistance.</p><p>Dakota and the Crown Reef school-fish meshes: ${external("https://quaternius.com/packs/animatedfish.html", "Quaternius Animated Fish")}, ${external("https://creativecommons.org/publicdomain/zero/1.0/", "CC0")}. Dakota’s rig, animation and materials were adapted for this world. <a href="${base}assets/open-water-v3/WILDLIFE-CREDITS.md">Adaptation notes</a>.</p><p>The surface architecture grew from the original Open Water prototype. This world, its instruments, and its challenges are fictional.</p><details><summary>Earlier edition / V3 vessel attribution</summary><p>Earlier Open Water editions used ${external("https://sketchfab.com/3d-models/motoryacht-35-0bdd7a0de7254426890bb5745bb7da6d", "motoryacht 35")} by ${external("https://sketchfab.com/angeloraffaelecatalano", "angelo raffaele catalano")}, licensed under ${external("https://creativecommons.org/licenses/by/4.0/", "CC BY 4.0")}. The retained V3 asset was adapted from a converted GLB: flag removed, geometry simplified and quantized, materials and scale changed for Open Water. <a href="${base}assets/open-water-v3/YACHT-LOD-CREDITS.md">V3 adaptation notes</a>.</p></details></details></div>`;
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
      `${study.title} | Tejass Kaushik`,
      socialMetadata(route).description,
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

// Vercel serves this document with HTTP 404 when no static route matches.
const notFound = replaceRoot(
  applyMetadata(template, "Page not found | Tejass Kaushik", "This page could not be found. Browse selected work or contact Tejass Kaushik.", "/404")
    .replace(/(<meta name="robots" content=")[^"]*/, '$1noindex, follow'),
  `<main class="portfolio-v3 pv-empty" id="main"><div class="pv-shell"><p class="pv-eyebrow">404 / Uncharted water</p><h1>This page could not be found.</h1><p>The work is still here. Start with a project or get in touch.</p><a class="pv-button" href="${homeLink("#work")}">See selected work ↗</a> <a class="pv-text-link" href="mailto:${profile.email}">Contact Tejass ↗</a></div></main>`,
);
await writeFile(path.join(outputDirectory, "404.html"), notFound);
