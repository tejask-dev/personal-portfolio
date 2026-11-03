import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { portfolioLinkEvent, redactAnalyticsEvent } from "../client/src/lib/analytics.ts";
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE, SITE_URL } from "../client/src/lib/siteMetadata.ts";
import { socialCards, socialMetadata } from "../client/src/lib/socialMetadata.ts";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const html = read("client/index.html");

test("home metadata and structured identity match the current role without an inferred graduation or city", () => {
  assert.ok(html.includes(`<title>${DEFAULT_TITLE}</title>`));
  assert.equal((html.match(new RegExp(DEFAULT_DESCRIPTION.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) ?? []).length, 3);
  assert.equal((html.match(new RegExp(socialMetadata("/").alt.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) ?? []).length, 2);
  const graph = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)![1])["@graph"];
  const person = graph.find((entry: Record<string, unknown>) => entry["@type"] === "Person");
  assert.equal(person.jobTitle, "Chief Operating Officer");
  assert.equal(person.worksFor.name, "Anticipation Labs");
  assert.equal(person.email, "mailto:tejas.kaushik@outlook.com");
  assert.equal(person.address.addressRegion, "Ontario");
  assert.equal(person.address.addressCountry, "CA");
  assert.equal(person.address.addressLocality, undefined);
  assert.equal(person.alumniOf, undefined);
  assert.equal(person.affiliation.name, "Western University");
  for (const font of ["Spectral-Light.woff2", "PortfolioSans-400.woff2"]) {
    assert.ok(html.includes(`href="%BASE_URL%fonts/${font}" as="font"`));
    assert.ok(readFileSync(new URL(`../client/public/fonts/${font}`, import.meta.url)).length > 0);
  }
  assert.match(html, /type="image\/svg\+xml" href="%BASE_URL%favicon\.svg"/);
});

test("all seven social images have the expected dimensions and alternate text describes their content", () => {
  assert.equal(Object.keys(socialCards).length, 7);
  for (const [slug, card] of Object.entries(socialCards)) {
    const png = readFileSync(new URL(`../client/public/social/${slug}.png`, import.meta.url));
    assert.equal(png.toString("hex", 0, 8), "89504e470d0a1a0a");
    assert.equal(png.readUInt32BE(16), 1200);
    assert.equal(png.readUInt32BE(20), 630);
    const metadata = socialMetadata(slug === "home" ? "/" : `/case-studies/${slug}`);
    for (const text of [card.label, card.title.replace(/\n/g, " "), card.note, ...card.proof]) assert.ok(metadata.alt.includes(text));
    assert.equal(metadata.image, `${SITE_URL}/social/${slug}.png`);
    assert.doesNotMatch(metadata.description, /Founding Software Engineer|Interim|Deputy|graduate|Open Water/);
  }
});

test("pageview redaction excludes query, hash, unknown paths, credentials and noncanonical hosts", () => {
  for (const type of ["pageview", "event"] as const) {
    for (const path of ["/", "/resume", "/case-studies/elda", "/case-studies/anticipy"]) {
      assert.deepEqual(redactAnalyticsEvent({ type, url: `${SITE_URL}${path}?email=private@example.org#secret` }), { type, url: `${SITE_URL}${path}` });
    }
  }
  for (const url of ["https://example.org/", "http://localhost:4175/", `${SITE_URL}/private-person-name`, `${SITE_URL}/case-studies/private-name`, "invalid"]) {
    assert.equal(redactAnalyticsEvent({ type: "pageview", url }), null);
  }
  assert.deepEqual(redactAnalyticsEvent({ type: "pageview", url: "https://private:secret@tejasskaushik.com/" }), { type: "pageview", url: `${SITE_URL}/` });
});

test("link events contain fixed categories and project slugs, never emails, destinations or input values", () => {
  assert.deepEqual(portfolioLinkEvent("mailto:private@example.org?body=secret", SITE_URL), { name: "Email click", data: {} });
  for (const href of ["/resume", "/resume.html?secret=true"]) assert.deepEqual(portfolioLinkEvent(href, SITE_URL), { name: "Resume view", data: {} });
  assert.deepEqual(portfolioLinkEvent("/Tejass-Kaushik-Resume.pdf", SITE_URL), { name: "Resume download", data: {} });
  for (const href of ["/case-studies/anticipy?secret#detail", "https://anticipy.ai/?email=private@example.org"]) {
    assert.deepEqual(portfolioLinkEvent(href, SITE_URL), { name: "Project open", data: { project: "anticipy" } });
  }
  assert.deepEqual(portfolioLinkEvent("https://github.com/tejask-dev/PromMatch/blob/main/README.md?secret", SITE_URL), { name: "Project open", data: { project: "prom-match" } });
  assert.deepEqual(portfolioLinkEvent("https://example.org/private@example.org?secret", SITE_URL), { name: "Outbound link", data: {} });
  for (const href of ["#contact", "/unknown-private-route", "javascript:alert(1)", "tel:+15555555555"]) assert.equal(portfolioLinkEvent(href, SITE_URL), null);
});

test("analytics is production-only and gated for paid custom events; redirects cannot loop on the canonical host", () => {
  assert.match(read("client/src/main.tsx"), /import\.meta\.env\.PROD && location\.hostname === "tejasskaushik\.com"/);
  assert.match(read("client/src/lib/analytics.ts"), /VITE_ANALYTICS_CUSTOM_EVENTS !== "true"\) return/);
  const config = JSON.parse(read("vercel.json"));
  assert.equal(config.cleanUrls, true);
  assert.equal(config.redirects.length, 1);
  assert.deepEqual(config.redirects[0], { source: "/:path*", has: [{ type: "host", value: "tejass-kaushik.vercel.app" }], destination: `${SITE_URL}/:path*`, permanent: true });
  assert.ok(!config.redirects.some((rule: { source: string }) => rule.source.includes(".html")));
  const csp = config.headers[0].headers.find((header: { key: string }) => header.key === "Content-Security-Policy").value;
  assert.ok(csp.includes("script-src 'self'"));
  assert.ok(csp.includes("connect-src 'self' blob:"));
  assert.doesNotMatch(csp, /vercel-insights\.com|unsafe-eval|https:\/\/\*/);
});

test("Elda is public in search metadata and privacy-safe analytics", () => {
  assert.match(DEFAULT_DESCRIPTION, /Elda/);
  assert.equal(socialMetadata('/case-studies/elda').image, SITE_URL + '/social/elda.png');
  assert.ok(read('client/public/sitemap.xml').includes(SITE_URL + '/case-studies/elda'));
  for (const href of ['/case-studies/elda?private=value#detail', 'https://tryelda.com/?email=private@example.org']) {
    assert.deepEqual(portfolioLinkEvent(href, SITE_URL), { name: 'Project open', data: { project: 'elda' } });
  }
});
