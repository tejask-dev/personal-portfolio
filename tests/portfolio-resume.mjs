import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { resume } from "../resume/content.mjs";
import { renderHtml, renderTex, resumeText } from "../resume/render.mjs";

test("HTML and downloadable LaTeX source stay synchronized with shared resume content", async () => {
  const css = await readFile(new URL("../resume/style.css", import.meta.url), "utf8");
  const template = await readFile(new URL("../resume/template.tex", import.meta.url), "utf8");
  const html = await readFile(new URL("../client/public/resume.html", import.meta.url), "utf8");
  assert.equal(html, renderHtml(css), "Run scripts/build-resume.mjs after editing resume content or layout");
  assert.equal(await readFile(new URL("../resume/Tejass-Kaushik-Resume.tex", import.meta.url), "utf8"), renderTex(template));
  assert.match(html, /<main id="resume" tabindex="-1">/);
  assert.match(html, /href="https:\/\/tejasskaushik.com\/resume"/);
  assert.match(html, /href="\/Tejass-Kaushik-Resume.pdf" download/);
  assert.equal((html.match(/<h1>/g) || []).length, 1);
  for (const href of [...resume.contacts.map(c => c.href), ...resume.experience.map(e => e.href), resume.research.href, ...resume.projects.map(p => p.href)]) {
    assert.ok(html.includes(`href="${href}"`), `Missing link: ${href}`);
  }
});

test("resume retains confirmed ownership, contacts and result limits", () => {
  const text = resumeText.join(" ");
  assert.ok(text.includes("COO (current); previously Founding Software Engineer"));
  assert.ok(text.includes("tejas.kaushik@outlook.com"));
  assert.ok(text.includes("40,000+ learners, 80+ courses and 130+ volunteers"));
  assert.ok(text.includes("school campaign that collected 27,000+ cans"));
  assert.equal(resume.experience[0].title, "Anticipation Labs");
  assert.equal(resume.experience[0].href, "https://www.anticipationlabs.com/");
  assert.equal(resume.experience[0].dates, "Aug. 2026 to present");
  assert.match(resume.experience[0].bullets[0], /Elda, a screenless bracelet in development/);
  assert.ok(text.includes("Visited care homes and spoke with older adults and caregivers"));
  assert.ok(text.includes("For Anticipy, directed AI-assisted connected-app repairs"));
  assert.ok(text.includes("national first-place team study"));
  assert.doesNotMatch(text, /\[CONFIRM|—|1,000\+|200\+|14,000|built solo|Deputy CTO|Expected 2030|Windsor|I required|my account|harness|qualification|partly shipped|remained unfinished/i);
});

test("a failed compiler leaves both public resume files intact", async () => {
  const files = ["../client/public/resume.html", "../client/public/Tejass-Kaushik-Resume.pdf"];
  const before = await Promise.all(files.map(path => readFile(new URL(path, import.meta.url))));
  // Node rejects Tectonic's arguments, giving a portable compiler-failure fixture.
  const failed = spawnSync(process.execPath, [new URL("../scripts/build-resume.mjs", import.meta.url).pathname], {
    env: { ...process.env, TECTONIC_BIN: process.execPath }, encoding: "utf8",
  });
  assert.notEqual(failed.status, 0);
  for (const [i, path] of files.entries()) assert.deepEqual(await readFile(new URL(path, import.meta.url)), before[i]);
});
