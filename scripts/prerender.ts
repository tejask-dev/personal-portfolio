import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  caseStudyContent,
  type CaseStudyContent,
} from "../client/src/data/caseStudyContent.ts";
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
const outputDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../docs",
);
const indexPath = path.join(outputDirectory, "index.html");
const template = await readFile(indexPath, "utf8");
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

function studyHtml(study: CaseStudyContent) {
  return `<main class="static-portfolio" id="main">
    <nav aria-label="Case study navigation"><a href="${homeLink("#voyage")}">Return to water</a> · <a href="${homeLink("#work")}">Work index</a></nav>
    <header><p>Tejass Kaushik / ${escape(study.kicker)}</p><h1>${escape(study.title)}</h1><p>${escape(study.thesis)}</p>${study.status ? `<p>Status: ${escape(study.status)}</p>` : ""}</header>
    <dl><dt>Role</dt><dd>${escape(study.role)}</dd><dt>Period</dt><dd>${escape(study.period)}</dd><dt>Focus</dt><dd>${escape(study.stack.join(", "))}</dd></dl>
    <p>${escape(study.summary)}</p>
    ${study.sections.map((section) => `<section><h2>${escape(section.heading)}</h2>${section.body.map((paragraph) => `<p>${escape(paragraph)}</p>`).join("")}</section>`).join("")}
    <section><h2>A working principle</h2><p>${escape(study.lesson)}</p></section>
    ${study.links.length ? `<section><h2>Project sources and links</h2><ul>${study.links.map((link) => `<li><a href="${escape(link.href)}">${escape(link.label)}</a></li>`).join("")}</ul></section>` : ""}
    <section><h2>Keep exploring</h2><ul>${caseStudyContent
      .filter((other) => other.slug !== study.slug)
      .map(
        (other) =>
          `<li><a href="${caseLink(other.slug)}">${escape(other.title)}</a></li>`,
      )
      .join("")}</ul></section>
    <footer><p><a href="mailto:tejas.kaushik@outlook.com">tejas.kaushik@outlook.com</a></p><a href="${homeLink("#work")}">Return to the work index</a></footer>
  </main>`;
}

// Preserve useful initial content at the homepage, including GitHub Pages' base.
const index = applyMetadata(
  template,
  DEFAULT_TITLE,
  DEFAULT_DESCRIPTION,
  "/",
).replaceAll('href="/case-studies/', `href="${base}case-studies/`);
await writeFile(indexPath, index);

for (const study of caseStudyContent) {
  const route = `/case-studies/${study.slug}`;
  const html = applyMetadata(
    template,
    `${study.title} | Work by Tejass Kaushik`,
    study.summary,
    route,
  ).replace(
    /<div id="root">[\s\S]*?<\/div>/,
    `<div id="root">${studyHtml(study)}</div>`,
  );
  const directory = path.join(outputDirectory, "case-studies", study.slug);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, "index.html"), html);
  // Vite preview and static hosts resolve extensionless paths through .html;
  // directory indexes also keep trailing-slash and GitHub Pages requests useful.
  await writeFile(
    path.join(outputDirectory, "case-studies", `${study.slug}.html`),
    html,
  );
}

console.log(
  `Prerendered ${caseStudyContent.length} case-study routes with shared content and metadata.`,
);
