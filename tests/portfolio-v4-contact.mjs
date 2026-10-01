/** Verify actual prerendered public contact destinations, including structured
 * metadata and both hosting variants. Set PORTFOLIO_OUT_DIR for another build. */
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = path.resolve(root, process.env.PORTFOLIO_OUT_DIR ?? "docs");
const email = "tejas.kaushik@outlook.com";
const slugs = ["anticipy", "stellar-learning", "global-health-research", "docubridge", "soma-ai"];
const mailtoAddresses = html => [...html.matchAll(/href="mailto:([^"?#]+)(?:[^"<>]*)"/g)].map(match => decodeURIComponent(match[1]));
const allMailsAreCanonical = (html, surface) => {
  const addresses = mailtoAddresses(html);
  assert.ok(addresses.length >= 2, `${surface} needs a direct contact route and visible email`);
  assert.deepEqual([...new Set(addresses)], [email], `${surface} sends visitors to the canonical owner address`);
  assert.match(html, new RegExp(`class="pv-email" href="mailto:${email.replaceAll(".", "\\.")}">${email.replaceAll(".", "\\.")}</a>`));
};

test("homepage and its contact section use the exact canonical address", async () => {
  const home = await readFile(path.join(output, "index.html"), "utf8");
  allMailsAreCanonical(home, "Home");
  const contact = home.match(/<section[^>]*id="contact"[^>]*>([\s\S]*?)<\/section>/)?.[1];
  assert.ok(contact, "Contact section must be present in no-JavaScript HTML");
  allMailsAreCanonical(contact, "Home contact");
});

test("all five case studies and both static route forms have canonical contact links", async () => {
  for (const slug of slugs) for (const suffix of [`${slug}/index.html`, `${slug}.html`]) allMailsAreCanonical(await readFile(path.join(output, "case-studies", suffix), "utf8"), suffix);
});

test("public Person metadata agrees with the visible contact address", async () => {
  for (const route of ["index.html", ...slugs.map(slug => `case-studies/${slug}/index.html`)]) {
    const html = await readFile(path.join(output, route), "utf8");
    const scripts = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]));
    const person = scripts.flatMap(script => script["@graph"] ?? [script]).find(item => item["@type"] === "Person");
    assert.ok(person, `${route} requires Person metadata`);
    assert.equal(person.email, `mailto:${email}`);
  }
});
