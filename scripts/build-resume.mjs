import assert from "node:assert/strict";
import { copyFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { renderHtml, renderTex, resumeText } from "../resume/render.mjs";

// Generate both formats from shared content, then check the real PDF before replacing either.
const source = fileURLToPath(new URL("../resume/Tejass-Kaushik-Resume.tex", import.meta.url));
const destination = fileURLToPath(new URL("../client/public/Tejass-Kaushik-Resume.pdf", import.meta.url));
const htmlDestination = fileURLToPath(new URL("../client/public/resume.html", import.meta.url));
const latex = renderTex(await readFile(new URL("../resume/template.tex", import.meta.url), "utf8"));
const html = renderHtml(await readFile(new URL("../resume/style.css", import.meta.url), "utf8"));
const work = await mkdtemp(join(tmpdir(), "open-water-resume-"));
try {
  const temporarySource = join(work, "Tejass-Kaushik-Resume.tex");
  await writeFile(temporarySource, latex);
  execFileSync(process.env.TECTONIC_BIN || "tectonic", ["--untrusted", "--outdir", work, temporarySource], { stdio: "inherit" });
  const compiled = join(work, "Tejass-Kaushik-Resume.pdf");
  const info = execFileSync(process.env.PDFINFO_BIN || "pdfinfo", [compiled], { encoding: "utf8" });
  assert.match(info, /^Pages:\s+1\s*$/m, "Resume must fit on one page.");
  assert.match(info, /^Page size:\s+612 x 792 pts/m, "Resume must use US Letter.");
  assert.match(info, /^Encrypted:\s+no\s*$/m, "Resume must allow text extraction.");
  const pdf = await readFile(compiled);
  assert.ok(pdf.length > 1000 && pdf.length < 2_000_000, "Unexpected resume PDF size.");
  const extracted = execFileSync(process.env.PDFTOTEXT_BIN || "pdftotext", ["-layout", compiled, "-"], { encoding: "utf8" });
  const normalize = text => text.normalize("NFKC").replace(/\s+/g, " ").trim();
  for (const text of resumeText) assert.ok(normalize(extracted).includes(normalize(text)), `Missing or broken PDF text: ${text}`);
  // A failed compilation/check leaves the previous public files intact.
  await writeFile(source, latex);
  await writeFile(htmlDestination, html);
  await copyFile(compiled, destination);
  console.log(`Generated matching HTML and one-page Jake-format PDF: ${destination}`);
} finally {
  await rm(work, { recursive: true, force: true });
}
