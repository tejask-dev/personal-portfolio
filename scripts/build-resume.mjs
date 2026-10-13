import assert from "node:assert/strict";
import { copyFile, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

// Compile the editable Jake-format source. Website builds use the checked-in PDF.
// Requires Tectonic and Poppler (pdfinfo); see resume/README.md.
const source = fileURLToPath(new URL("../resume/Tejass-Kaushik-Resume.tex", import.meta.url));
const destination = fileURLToPath(new URL("../client/public/Tejass-Kaushik-Resume.pdf", import.meta.url));
const work = await mkdtemp(join(tmpdir(), "open-water-resume-"));
try {
  execFileSync(process.env.TECTONIC_BIN || "tectonic", ["--untrusted", "--outdir", work, source], { stdio: "inherit" });
  const compiled = join(work, "Tejass-Kaushik-Resume.pdf");
  const info = execFileSync(process.env.PDFINFO_BIN || "pdfinfo", [compiled], { encoding: "utf8" });
  assert.match(info, /^Pages:\s+1\s*$/m, "Resume must fit on one page.");
  assert.match(info, /^Page size:\s+612 x 792 pts/m, "Resume must use US Letter.");
  assert.match(info, /^Encrypted:\s+no\s*$/m, "Resume must allow text extraction.");
  const pdf = await readFile(compiled);
  assert.ok(pdf.length > 1000 && pdf.length < 2_000_000, "Unexpected resume PDF size.");
  // A failed compilation/check leaves the previous download intact.
  await copyFile(compiled, destination);
  console.log(`Generated one-page Jake-format resume: ${destination}`);
} finally {
  await rm(work, { recursive: true, force: true });
}
