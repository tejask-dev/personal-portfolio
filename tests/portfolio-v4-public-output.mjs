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
import { anticipyNarrative, contributions, leadStories, anticipyArtifact } from "../client/src/components/portfolio-v4/content.ts";
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
assert.deepEqual(contributions.map(item => item.id), Array.from({ length: 12 }, (_, index) => `C${index + 1}`));
assert.equal(leadStories.length, 3);
assert.equal(caseStudyContent.length, 5);
assert.match(anticipyNarrative.assistance, /Claude and Codex did a lot of the implementation/);
assert.match(anticipyNarrative.assistance, /I worked with Codex on the selected work-email prototype/);
assert.match(anticipyNarrative.team, /team had already built the product foundations/);
assert.match(anticipyNarrative.team, /I didn't build Anticipy on my own/);
const byId = Object.fromEntries(contributions.map(item => [item.id, item]));
for (const [id, field, boundary] of [
  ["C1", "result", /deployed.*personally reported/i],
  ["C2", "result", /bounded.*universal protection is not claimed/i],
  ["C3", "result", /Local integration.*not every repair was traced to a release/i],
  ["C4", "result", /bounded.*acceptance remained incomplete/i],
  ["C5", "result", /individual prototypes.*qualification remained incomplete/i],
  ["C6", "result", /validated locally.*separate preview/i],
  ["C7", "result", /local flow.*hosted AI processing remained off/i],
  ["C8", "result", /locally.*No measured production savings/i],
  ["C9", "result", /Offline integration.*Live work-email activation remained blocked/i],
  ["C10", "result", /disabled runtime.*not measured financial results/i],
  ["C11", "result", /Fellowship coming soon.*not fully published.*team work/i],
  ["C12", "result", /unresolved findings.*does not imply sole architecture authorship/i],
]) assert.match(byId[id][field], boundary, `${id} must retain its evidence boundary`);
assert.match(profile.proof[0].label, /reported by Stellar Learning/);
assert.equal(profile.proof.length, 2);
assert.match(profile.proof[1].label, /research team/);

const sourceFiles = [...await filesIn(path.join(root, "client/src")), ...await filesIn(path.join(root, "client/public")), path.join(root, "client/index.html"), path.join(root, "scripts/prerender.ts")];
const source = await scan(sourceFiles, "source");
const report = { scope: sourceOnly ? "source-only; generated site not audited" : "source and generated public output", source, contributions: 12, leadStories: 3, routes: 5, generated: null };
if (!sourceOnly) {
  const generatedFiles = await filesIn(output);
  report.generated = await scan(generatedFiles, "generated output");
  const home = await readFile(path.join(output, "index.html"), "utf8");
  assert.match(home, /id="current-work"/, "Output must include the V4 flagship, not an older homepage");
  const sectionOrder = ["hero-title", "current-work", "work", "voyage", "about", "engineering-notes", "contact"].map(id => home.indexOf(`id="${id}"`));
  assert.ok(sectionOrder.every((position, index) => position >= 0 && (index === 0 || position > sectionOrder[index - 1])), "Generated homepage must preserve the editorial reading order with optional world after the work");
  assert.match(home, /original Open Water art, created with Codex and Claude assistance/);
  assert.match(home, /Earlier edition \/ V3 vessel attribution/);
  for (const study of caseStudyContent) {
    const html = await readFile(path.join(output, "case-studies", study.slug, "index.html"), "utf8");
    const flat = await readFile(path.join(output, "case-studies", `${study.slug}.html`), "utf8");
    assert.equal(html, flat, `${study.slug} hosting variants must agree`);
    assert.ok(home.includes(`case-studies/${study.slug}"`), `${study.slug} must be directly reachable from the homepage`);
    const text = normalize(html);
    for (const value of [study.title, study.role, study.status, study.summary]) assert.ok(text.includes(normalize(value)), `${study.slug} missing role/status/summary`);
    if (study.slug !== "anticipy") continue;
    for (const story of leadStories) {
      assert.ok(html.includes(`id="${story.id}"`));
      for (const field of ["role", "status", "outcome", "limit"]) assert.ok(html.includes(esc(story[field])), `${story.id} missing ${field}`);
    }
    for (const item of contributions) {
      const id = `contribution-${item.id.toLowerCase()}`;
      const section = html.match(new RegExp(`<details id="${id}">([\\s\\S]*?)<\\/details>`))?.[1];
      assert.ok(section, `${item.id} not rendered`);
      for (const field of ["title", "part", "decision", "result", "status"]) assert.ok(section.includes(esc(item[field])), `${item.id} missing ${field}`);
    }
    for (const text of [anticipyNarrative.assistance, anticipyNarrative.team, anticipyNarrative.statusSummary, anticipyNarrative.evidence]) assert.ok(html.includes(esc(text)), "Generated Anticipy must retain attribution and outcome qualifications");
    for (const source of anticipyNarrative.sources) assert.ok(html.includes(`href="${source.href}"`));
    for (const asset of [anticipyArtifact.desktop, anticipyArtifact.mobile]) {
      assert.ok(html.includes(asset));
      assert.ok((await readFile(path.join(output, asset))).length > 10000, `Missing public screenshot: ${asset}`);
    }
    assert.match(html, /invented source \/ no AI calls/);
    assert.match(html, /Synthetic illustration \/ no real credentials or live capture/);
  }
}
console.log(JSON.stringify({ passed: true, ...report }, null, 2));
