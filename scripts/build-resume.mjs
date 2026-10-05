import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

// The standalone HTML is the single source for the screen and print editions.
// Run from any directory: node /path/to/repository/scripts/build-resume.mjs
const source = new URL("../client/public/resume.html", import.meta.url);
const destination = new URL("../client/public/Tejass-Kaushik-Resume.pdf", import.meta.url);
const browser = await chromium.launch({ channel: "chrome", headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 1024, height: 1200 } });
  // Self-contained styles and system fonts keep generation offline and repeatable.
  await page.route(/^https?:\/\//, route => route.abort());
  await page.goto(source.href, { waitUntil: "load" });
  await page.emulateMedia({ media: "print" });
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.title(), "Tejass Kaushik — Resume");
  assert.equal(await page.locator("main h1").count(), 1);
  const pdf = await page.pdf({
    format: "Letter",
    preferCSSPageSize: true,
    printBackground: true,
    tagged: true,
    outline: true,
    displayHeaderFooter: false,
  });
  // Chromium emits a separate /Type /Page dictionary for each physical page.
  const pages = [...pdf.toString("latin1").matchAll(/\/Type\s*\/Page\b/g)].length;
  assert.equal(pages, 1, `Resume must fit on one page; generated ${pages}.`);
  await writeFile(destination, pdf);
  console.log(`Generated one-page resume: ${fileURLToPath(destination)}`);
} finally {
  await browser.close();
}
