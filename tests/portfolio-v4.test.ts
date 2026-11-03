import assert from "node:assert/strict";
import test from "node:test";
import { alsoWork, anticipyNarrative, anticipyStatus, careerJourney, leadStories } from "../client/src/components/portfolio-v4/content.ts";
import { anticipyStaticHtml, careerStaticHtml, flagshipStaticHtml } from "../client/src/components/portfolio-v4/staticHtml.ts";
import { caseStudyContent } from "../client/src/data/caseStudyContent.ts";

const readable = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
const banned = /\[CONFIRM|—|\bI required\b|\bmy account\b|\bhonestly\b|\bbounded\b|\bevidence\b|\bfixtures?\b|validated within|\bharness(?:es)?\b|\bqualification\b|not claiming|does not imply|checked on \d|partly shipped|remained unfinished|much remained|I went\. That was great\./i;
const bodyCopy = (study: typeof caseStudyContent[number]) => [study.title, study.role, study.status, study.thesis, study.summary, ...study.contributions, ...study.decision.body, ...study.sections.flatMap(section => [section.heading, ...section.body]), study.lesson ?? "", study.imageCaption, ...study.metrics.flatMap(metric => [metric.value, metric.label])].join(" ");

test("case copy uses confirmed roles, periods and numeric platform metrics", () => {
  const bySlug = Object.fromEntries(caseStudyContent.map(study => [study.slug, study]));
  assert.equal(bySlug.anticipy.role, "COO at Anticipation Labs");
  assert.equal(bySlug["stellar-learning"].role, "CTO");
  assert.equal(bySlug["stellar-learning"].period, "Aug 2025–Jul 2026");
  assert.deepEqual(bySlug["stellar-learning"].metrics.map(metric => metric.value), ["40,000+", "80+", "130+"]);
  assert.ok(bySlug["stellar-learning"].metrics.every(metric => metric.label.startsWith("platform")));
  for (const study of caseStudyContent) {
    assert.ok(["Live", "Shipped", "Published", "Prototype", "In development", "Paused prototype", "Sunset 2026"].includes(study.status));
    assert.ok(study.metrics.every(metric => /\d/.test(metric.value)), `${study.slug} has a word-only metric`);
    assert.doesNotMatch(bodyCopy(study), /daily active|\bDAU\b/i);
  }
});

test("concise cases preserve the limitations that change the meaning of their results", () => {
  const bySlug = Object.fromEntries(caseStudyContent.map(study => [study.slug, bodyCopy(study)]));
  assert.match(bySlug["stellar-learning"], /Some of the IB work shipped/);
  assert.match(bySlug["stellar-learning"], /did not have a before-and-after accuracy benchmark/);
  assert.match(bySlug["global-health-research"], /r = −0\.3464/);
  assert.match(bySlug["global-health-research"], /association, not proof of causation/);
  assert.match(bySlug["global-health-research"], /national first-place team/);
  assert.match(bySlug.docubridge, /production adoption and answer accuracy were not measured/);
  assert.match(bySlug["soma-ai"], /300 people tried/);
  assert.match(bySlug["soma-ai"], /not continued use or a measured health benefit/);
  assert.equal(leadStories[0].status, "Deployed");
  assert.equal(leadStories[1].status, "Local prototype");
  assert.match(leadStories[1].outcome, /AI processing disabled/);
  assert.match(leadStories[2].outcome, /tested cases/);
});

test("public case prose stays concise and omits audit language and placeholders", () => {
  for (const study of caseStudyContent) {
    const copy = bodyCopy(study);
    assert.doesNotMatch(copy, banned, study.slug);
    assert.ok(copy.split(/\s+/).length < (study.slug === "docubridge" || study.slug === "soma-ai" ? 350 : 600), `${study.slug} is too long`);
    assert.ok(study.summary.split(/\s+/).length >= 50 && study.summary.split(/\s+/).length <= 80, `${study.slug} summary must be 50–80 words`);
  }
  assert.doesNotMatch(readable(anticipyStaticHtml()), banned);
  assert.doesNotMatch(readable(flagshipStaticHtml("/")), banned);
});

test("static Anticipy keeps three illustrations and five concise additional contributions", () => {
  const html = anticipyStaticHtml();
  const text = readable(html);
  for (const story of leadStories) {
    assert.ok(html.includes(`id="${story.id}"`));
    for (const field of ["intro", "role", "decision", "outcome"] as const) assert.ok(text.includes(story[field]));
    assert.ok([story.intro, story.role, story.decision, story.outcome].join(" ").split(/\s+/).length < 120);
  }
  assert.equal((html.match(/class="pv4-demo-label">Illustration</g) ?? []).length, 3);
  assert.equal(alsoWork.length, 5);
  for (const item of alsoWork) assert.ok(text.includes(item));
  for (const item of anticipyStatus) assert.ok(text.includes(item.result));
  for (const id of ["context", "contribution", "decision", "outcome", "lesson", "sources"]) assert.ok(html.includes(`id="${id}"`));
  assert.match(html, /No launch decision has been made/);
  assert.match(html, /\[value withheld\]/);
  assert.doesNotMatch(html, /<button|<details|contribution-c\d/);
  assert.doesNotMatch(text, /Claude|Codex|AI-assisted engineering/);
  assert.match(text, /team’s existing workflow engine/);
  assert.ok(anticipyNarrative.assistance.includes("Claude and Codex"), "About may reuse the one attribution statement");
});

test("home feature leads with the product and all case links support subpath hosting", () => {
  const slugs = caseStudyContent.map(item => item.slug);
  assert.deepEqual(new Set(careerJourney.map(item => item.slug)), new Set(slugs));
  for (const base of ["/", "/personal-portfolio/"]) {
    const html = careerStaticHtml(base);
    for (const slug of slugs) assert.ok(html.includes(`href="${base}case-studies/${slug}"`));
    const feature = flagshipStaticHtml(base);
    assert.ok(feature.includes(`href="${base}case-studies/anticipy"`));
    assert.match(readable(feature), /Current work \/ Anticipation Labs Elda\. Help within reach\./);
    assert.ok(feature.indexOf(`href="${base}case-studies/elda"`) < feature.indexOf(`href="${base}case-studies/anticipy"`));
    assert.doesNotMatch(feature, /Claude|Codex|pv4-attribution|A browser journey/);
    for (const match of feature.matchAll(/<a\b[^>]*href="https:[^>]*>/g)) {
      assert.match(match[0], /target="_blank"/);
      assert.match(match[0], /rel="noreferrer"/);
    }
  }
});

test("Elda leads Anticipation Labs while Anticipy retains its own history", () => {
  const [elda, anticipy] = caseStudyContent;
  assert.equal(elda.slug, "elda");
  assert.equal(elda.status, "In development");
  assert.equal(elda.role, "COO at Anticipation Labs");
  assert.equal(elda.artifactSource?.href, "https://tryelda.com/");
  assert.match(elda.summary, /customer discovery/);
  assert.match(elda.teamContext, /team/);
  assert.equal(elda.metrics.length, 0);
  assert.equal(elda.lesson, undefined);
  assert.equal(anticipy.slug, "anticipy");
  assert.equal(anticipy.status, "Paused prototype");
  assert.equal(anticipy.period, "Earlier product");
  assert.match(anticipy.summary, /current focus.*Elda/);
  assert.equal(leadStories[0].status, "Deployed");
  assert.equal(caseStudyContent.length, 6);
});
