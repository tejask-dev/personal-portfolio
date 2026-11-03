/** Read-only publication audit. This scans source, then the actual built output.
 * node --experimental-strip-types tests/portfolio-v4-public-output.mjs --source-only
 * node --experimental-strip-types tests/portfolio-v4-public-output.mjs --out-dir docs
 * A passing source-only run never establishes that deployment output is current.
 */
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { anticipyNarrative, alsoWork, anticipyStatus, leadStories, anticipyArtifact } from "../client/src/components/portfolio-v4/content.ts";
import { caseStudyContent } from "../client/src/data/caseStudyContent.ts";
import { profile } from "../client/src/data/profile.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const args = process.argv.slice(2), sourceOnly = args.includes("--source-only");
const outAt = args.indexOf("--out-dir");
const output = path.resolve(root, outAt < 0 ? "docs" : args[outAt + 1] ?? "docs");
const textExtensions = new Set([".ts", ".tsx", ".js", ".mjs", ".html", ".css", ".md", ".json", ".svg", ".txt", ".map", ".xml"]);
const esc = text => text.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
const normalize = text => text.replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
const removedArtifactName = /web-solutions-venture|MortgageWebsite|fellowship-(?:desktop|mobile)/i;
const privatePatterns = [
  ["unpublished Fellowship destination", /anticipyfellowship\.com|Public experience shipped|Public Fellowship experience/i],
  ["removed client-work content", /web-solutions-venture|Client\s+web\s+venture|Independent\s+client\s+work|web[-\s]+services\s+venture|Summer\s+Company|client\s+projects\s+delivered|MortgageWebsite/i],
  ["raw handoff filename", /Portfolio-Handoff|Codex_Master_Prompt/i],
  ["local filesystem path", /(?:file:\/\/\/|\/Users\/[^/\s"']+\/|[A-Za-z]:\\Users\\)/],
  ["operational repository evidence", /github\.com\/[^/\s]+\/[^/\s]+\/(?:pull\/\d+|actions\/runs\/\d+)/i],
  ["infrastructure identifier", /(?:database_id|account_id)\s*["']?\s*[:=]\s*["']?[a-f0-9-]{20,}/i],
  ["internal credential identifier", /\b[A-Z][A-Z0-9_]+_(?:SERVICE_TOKEN|SERVICE_SECRET|API_KEY|PASSWORD)\b/],
  ["unverified investor identity", /Dormside\s+Fund|Dorm\s+Room\s+Fund/i],
];

async function filesIn(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    assert.doesNotMatch(entry.name, removedArtifactName, `Removed public route or asset remains: ${path.relative(root, target)}`);
    if (entry.isDirectory()) result.push(...await filesIn(target));
    else if (entry.isFile() && textExtensions.has(path.extname(entry.name))) result.push(target);
  }
  return result;
}
async function scan(files, label) {
  const digest = createHash("sha256");
  let bytes = 0;
  for (const file of files.sort()) {
    const contents = await readFile(file, "utf8");
    for (const [name, pattern] of privatePatterns) assert.ok(!pattern.test(contents), `${label}: ${name} in ${path.relative(root, file)}. Matched content is deliberately not echoed.`);
    digest.update(path.relative(root, file)).update(contents); bytes += Buffer.byteLength(contents);
  }
  return { files: files.length, textBytes: bytes, sha256: digest.digest("hex") };
}

assert.equal(profile.email, "tejas.kaushik@outlook.com");
assert.equal(leadStories.length, 3);
assert.equal(alsoWork.length, 5);
assert.equal(caseStudyContent.length, 6);
assert.equal(caseStudyContent.find(study => study.slug === "anticipy").role, "COO at Anticipation Labs");
assert.equal(caseStudyContent.find(study => study.slug === "stellar-learning").role, "CTO");
const bannedCopy = /\[CONFIRM|—|\bI required\b|\bmy account\b|\bhonestly\b|\bbounded\b|\bevidence\b|\bfixtures?\b|validated within|\bharness(?:es)?\b|\bqualification\b|not claiming|does not imply|checked on \d|partly shipped|remained unfinished|much remained|I went\. That was great\./i;
const visibleCopy = html => normalize(html.replace(/<head[\s\S]*?<\/head>/gi, "").replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ""));

const sourceFiles = [...await filesIn(path.join(root, "client/src")), ...await filesIn(path.join(root, "client/public")), path.join(root, "client/index.html"), path.join(root, "scripts/prerender.ts")];
const source = await scan(sourceFiles, "source");
const report = { scope: sourceOnly ? "source-only; generated site not audited" : "source and generated public output", source, additionalContributions: 5, leadStories: 3, routes: caseStudyContent.length, generated: null };
if (!sourceOnly) {
  const generatedFiles = await filesIn(output);
  report.generated = await scan(generatedFiles, "generated output");
  const home = await readFile(path.join(output, "index.html"), "utf8");
  assert.match(home, /id="current-work"/, "Output must include the V4 flagship, not an older homepage");
  const sectionOrder = ["hero-title", "current-work", "work", "about", "ocean", "contact"].map(id => home.indexOf(`id="${id}"`));
  assert.ok(sectionOrder.every((position, index) => position >= 0 && (index === 0 || position > sectionOrder[index - 1])), "Generated homepage must preserve the editorial reading order with optional world after the work");
  assert.doesNotMatch(visibleCopy(home), bannedCopy, "Homepage contains retired editorial copy or an unconfirmed marker");
  assert.match(home, /original Open Water art, created with Codex and Claude assistance/);
  assert.match(home, /Earlier edition \/ V3 vessel attribution/);
  for (const study of caseStudyContent) {
    const html = await readFile(path.join(output, "case-studies", study.slug, "index.html"), "utf8");
    const flat = await readFile(path.join(output, "case-studies", `${study.slug}.html`), "utf8");
    assert.equal(html, flat, `${study.slug} hosting variants must agree`);
    assert.ok(home.includes(`case-studies/${study.slug}"`), `${study.slug} must be directly reachable from the homepage`);
    const text = visibleCopy(html);
    assert.doesNotMatch(text, bannedCopy, `${study.slug} contains retired copy or an unconfirmed marker`);
    assert.doesNotMatch(html, /Return to water|Back to Open Water/, "Static direct-entry cases must keep visitors on the reading path");
    for (const id of ["context", "contribution", "decision", "outcome", ...(study.lesson ? ["lesson"] : []), "sources"]) assert.ok(html.includes(`id="${id}"`), `${study.slug} missing ${id}`);
    for (const value of [study.title, study.role, study.status, study.summary]) assert.ok(text.includes(normalize(value)), `${study.slug} missing role/status/summary`);
    if (study.slug !== "anticipy") continue;
    for (const story of leadStories) {
      assert.ok(html.includes(`id="${story.id}"`));
      for (const field of ["intro", "role", "decision", "status", "outcome"]) assert.ok(html.includes(esc(story[field])), `${story.id} missing ${field}`);
    }
    for (const item of alsoWork) assert.ok(text.includes(item), "Missing additional contribution");
    for (const item of anticipyStatus) assert.ok(text.includes(item.result), "Missing current project stage");
    assert.doesNotMatch(html, /<details id="contribution-/);
    assert.ok(text.includes(anticipyNarrative.team));
    for (const source of anticipyNarrative.sources) assert.ok(html.includes(`href="${source.href}"`));
    for (const asset of [anticipyArtifact.desktop, anticipyArtifact.mobile]) {
      assert.ok(html.includes(asset));
      assert.ok((await readFile(path.join(output, asset))).length > 10000, `Missing public screenshot: ${asset}`);
    }
    assert.equal((html.match(/class="pv4-demo-label">Illustration</g) ?? []).length, 3);
  }
}
console.log(JSON.stringify({ passed: true, ...report }, null, 2));
