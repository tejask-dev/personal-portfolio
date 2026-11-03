/** Build-time authoring tool, not part of the deployed build. Needs local Chrome. */
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { readFile, mkdir } from "node:fs/promises";
import { socialCards } from "../client/src/lib/socialMetadata.ts";
const esc = value => value.replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const sans = await readFile(new URL("../client/public/fonts/PortfolioSans-400.woff2", import.meta.url));
const serif = await readFile(new URL("../client/public/fonts/Spectral-Light.woff2", import.meta.url));
const out = new URL("../client/public/social/", import.meta.url);
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  for (const [slug, card] of Object.entries(socialCards)) {
    await page.setContent(`<!doctype html><html><head><style>
      @font-face{font-family:Portfolio;src:url(data:font/woff2;base64,${sans.toString('base64')})}
      @font-face{font-family:Spectral;src:url(data:font/woff2;base64,${serif.toString('base64')});font-weight:300}
      *{box-sizing:border-box}body{margin:0;background:#f6f1e7;color:#143b43;font-family:Portfolio,Arial}
      main{height:630px;padding:42px 64px;position:relative;overflow:hidden}
      header{font-size:15px;letter-spacing:.07em;display:flex;justify-content:space-between;border-bottom:1px solid #143b432c;padding-bottom:22px}
      h1{font:300 78px/1.08 Spectral,Georgia,serif;letter-spacing:-.035em;margin:42px 0 22px;position:relative}
      .note{font-size:19px;margin:0;position:relative}
      .proof{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;list-style:none;margin:30px 0 0;padding:20px 0 0;border-top:1px solid #143b432c;position:relative}
      .proof li{font-size:16px;line-height:1.45}
      footer{position:absolute;bottom:32px;left:64px;right:64px;display:flex;justify-content:space-between;font-size:14px;border-top:1px solid #143b432c;padding-top:16px}
      svg{position:absolute;right:-20px;top:80px;width:390px;height:430px;opacity:.45}.mark{font-family:Spectral,Georgia,serif;font-style:italic}
    </style></head><body><main><svg viewBox="0 0 400 450" fill="none" stroke="#42636a"><ellipse cx="340" cy="205" rx="280" ry="190"/><ellipse cx="345" cy="210" rx="241" ry="150"/><ellipse cx="350" cy="215" rx="202" ry="110"/><ellipse cx="355" cy="220" rx="160" ry="68"/><path d="M205 350V55m-70 105h240" stroke-dasharray="3 9"/><circle cx="205" cy="160" r="10" fill="#143b43" stroke="none"/></svg>
      <header><span>${esc(card.label)}</span><span class="mark">Selected work ↗</span></header>
      <h1>${esc(card.title).replace(/\n/g, '<br>')}</h1><p class="note">${esc(card.note)}</p>
      <ul class="proof">${card.proof.map(p => `<li>${esc(p)}</li>`).join('')}</ul>
      <footer><span>Tejass Kaushik · Software engineer</span><span>tejasskaushik.com</span></footer>
    </main></body></html>`);
    await page.evaluate(() => document.fonts.ready);
    const fits = await page.evaluate(() => {
      const proof = document.querySelector('.proof').getBoundingClientRect();
      const footer = document.querySelector('footer').getBoundingClientRect();
      return proof.bottom < footer.top - 12 && document.documentElement.scrollWidth === 1200;
    });
    assert.ok(fits, `${slug} social artwork overflows`);
    await page.screenshot({ path: new URL(`${slug}.png`, out).pathname });
  }
  console.log('Generated six ivory/teal social cards, 1200 × 630.');
} finally { await browser.close(); }
