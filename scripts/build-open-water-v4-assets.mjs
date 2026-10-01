/** Reproducible export of the original Open Water V4 art.
 * Runs the real TypeScript source (VesselModelsV4 / CompanionModelsV4) through
 * Vite in headless Chrome and writes Low/High GLBs plus a manifest.
 *   node scripts/build-open-water-v4-assets.mjs
 * No Blender, no external meshes, no network assets. */
import fs from 'node:fs';
import crypto from 'node:crypto';
import {createServer} from 'vite';
import {chromium} from 'playwright';

const out = 'client/public/assets/open-water-v4/';
fs.mkdirSync(out, {recursive: true});
const kinds = ['superyacht', 'tender', 'nemo', 'dory'];
const server = await createServer({server: {host: '127.0.0.1', port: 8811, strictPort: true}, mode: 'test', logLevel: 'error'});
await server.listen();
const browser = await chromium.launch({headless: true, channel: 'chrome'}).catch(() => chromium.launch({headless: true}));
const manifest = {version: 1, generator: 'scripts/build-open-water-v4-assets.mjs', source: ['client/src/features/open-water/scene/VesselModelsV4.ts', 'client/src/features/open-water/scene/CompanionModelsV4.ts'], license: 'Original work; no third-party geometry, textures or audio', axes: 'Y-up, forward -Z, metres, waterline y=0', assets: []};
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.route('**/v4-export', r => r.fulfill({contentType: 'text/html', body: '<html><head><link rel="icon" href="data:,"></head><body></body></html>'}));
  await page.goto('http://127.0.0.1:8811/v4-export');
  for (const kind of kinds) for (const quality of ['low', 'high']) {
    const base64 = await page.evaluate(async ([kind, quality]) => {
      const {exportGlbV4} = await import('/src/features/open-water/scene/AssetExportV4.ts');
      const bytes = new Uint8Array(await exportGlbV4(kind, quality));
      let s = '';
      for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      return btoa(s);
    }, [kind, quality]);
    const buffer = Buffer.from(base64, 'base64');
    const file = `${kind}-${quality}.glb`;
    fs.writeFileSync(out + file, buffer);
    manifest.assets.push({file, kind, quality, bytes: buffer.length, sha256: crypto.createHash('sha256').update(buffer).digest('hex')});
    console.log(`wrote ${out}${file} (${buffer.length} bytes)`);
  }
  if (errors.length) throw new Error(errors.join('\n'));
} finally {
  await browser.close();
  await server.close();
}
fs.writeFileSync(out + 'v4-asset-manifest.json', JSON.stringify(manifest, null, 2) + '\n');
