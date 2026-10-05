import assert from "node:assert/strict";
import test from "node:test";
import { anticipyNarrative, careerJourney, contributions, leadStories } from "../client/src/components/portfolio-v4/content.ts";
import { anticipyStaticHtml, careerStaticHtml, flagshipStaticHtml } from "../client/src/components/portfolio-v4/staticHtml.ts";
import { caseStudyContent } from "../client/src/data/caseStudyContent.ts";
import { profile } from "../client/src/data/profile.ts";

test("all twelve distinct contributions retain attribution and outcome boundaries", () => {
  assert.deepEqual(contributions.map(item => item.id), Array.from({ length: 12 }, (_, i) => `C${i + 1}`));
  for (const item of contributions) for (const field of ["title", "problem", "part", "decision", "result", "status"] as const) assert.ok(item[field].length > 5, `${item.id} ${field}`);
  assert.match(anticipyNarrative.assistance, /Claude and Codex/);
  assert.match(anticipyNarrative.assistance, /work-email prototype was implemented with Codex/);
  assert.match(anticipyNarrative.team, /team foundations/);
});

test("the flagship separates deployed navigation from local AI and security evidence", () => {
  assert.equal(leadStories.length, 3);
  assert.match(leadStories[0].status, /deployed/);
  assert.match(leadStories[0].limit, /not completion of every connector/);
  assert.match(leadStories[1].outcome, /AI processing disabled/);
  assert.match(leadStories[1].limit, /Live work-email activation/);
  assert.match(leadStories[2].limit, /not universal credential safety/);
  assert.match(contributions.find(item => item.id === "C5")!.result, /remained incomplete/);
});

test("public copy contains no private evidence links, investor identity, account preview, or local paths", () => {
  const content = JSON.stringify({ anticipyNarrative, careerJourney, contributions, leadStories, caseStudyContent });
  for (const pattern of [/\/Users\//i, /github\.com\/[^/\s]+\/[^/\s]+\/(?:pull\/\d+|actions\/runs\/\d+)/i, /(?:database_id|account_id)\s*["']?\s*[:=]\s*["']?[a-f0-9-]{20,}/i, /Dorm(?:side| Room) Fund/i, /\b[A-Z][A-Z0-9_]+_(?:SERVICE_TOKEN|SERVICE_SECRET|API_KEY|PASSWORD)\b/]) assert.doesNotMatch(content, pattern);
  assert.equal(profile.email, "tejas.kaushik@outlook.com");
});

test("static flagship preserves all three stories, twelve notes, attribution, and explanatory equivalents", () => {
  const html = anticipyStaticHtml();
  for (const item of contributions) assert.ok(html.includes(`id="contribution-${item.id.toLowerCase()}"`));
  for (const story of leadStories) assert.ok(html.includes(`id="${story.id}"`));
  assert.match(html, /No launch decision has been made/);
  assert.match(html, /\[value withheld\]/);
  assert.match(html, /AI-assisted engineering/);
  assert.doesNotMatch(html, /<button/);
  assert.equal((html.match(/<details /g) ?? []).length, 12);
  const text = html.replace(/<[^>]+>/g, " ").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/\s+/g, " ");
  for (const section of caseStudyContent[0].sections) {
    assert.ok(text.includes(section.heading));
    for (const paragraph of section.body) assert.ok(text.includes(paragraph));
  }
});

test("the complete career journey preserves five deep links for root and subpath hosting", () => {
  const slugs = caseStudyContent.map(item => item.slug);
  assert.equal(slugs.length, 5);
  assert.deepEqual(new Set(careerJourney.map(item => item.slug)), new Set(slugs));
  for (const base of ["/", "/personal-portfolio/"]) {
    const html = careerStaticHtml(base);
    for (const slug of slugs) assert.ok(html.includes(`href="${base}case-studies/${slug}"`));
    assert.ok(flagshipStaticHtml(base).includes(`href="${base}case-studies/anticipy"`));
  }
});

// Homepage ordering is exercised by portfolio-editorial-browser.mjs against the actual rendered reading path.
