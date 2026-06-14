// One-off generator for social preview + favicon (no runtime deps).
// og-image.png: 1200x630 deep-space gradient + purple glow + "TK" mark.
// favicon.png: 256x256 square version of the same mark.
import zlib from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const lerp = (a, b, t) => a + (b - a) * t;

function render(W, H, withGlows) {
  const buf = Buffer.alloc(W * H * 4);
  const set = (x, y, r, g, b, a = 1) => {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 4;
    const ba = buf[i + 3] / 255;
    const na = a + ba * (1 - a);
    if (na <= 0) return;
    buf[i] = (r * a + buf[i] * ba * (1 - a)) / na;
    buf[i + 1] = (g * a + buf[i + 1] * ba * (1 - a)) / na;
    buf[i + 2] = (b * a + buf[i + 2] * ba * (1 - a)) / na;
    buf[i + 3] = na * 255;
  };
  // base gradient
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const t = (x / W + y / H) / 2;
      set(x, y, lerp(7, 10, t), lerp(3, 4, t), lerp(18, 32, t), 1);
    }
  const glow = (cx, cy, rad, r, g, b, max) => {
    for (let y = Math.max(0, cy - rad); y < Math.min(H, cy + rad); y++)
      for (let x = Math.max(0, cx - rad); x < Math.min(W, cx + rad); x++) {
        const d = Math.hypot(x - cx, y - cy) / rad;
        if (d < 1) set(x, y, r, g, b, max * (1 - d) * (1 - d));
      }
  };
  if (withGlows) {
    glow(W * 0.75, H * 0.24, W * 0.47, 168, 85, 247, 0.42);
    glow(W * 0.12, H * 0.89, W * 0.38, 56, 189, 248, 0.18);
  }
  // drawing helpers in a 1200x630 design space, scaled to canvas
  const sx = W / 1200, sy = H / 630;
  const rect = (x, y, w, h, r, g, b, a = 1) => {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) set(xx * sx, yy * sy, r, g, b, a);
  };
  const line = (x1, y1, x2, y2, t, r, g, b) => {
    const minx = Math.min(x1, x2) - t, maxx = Math.max(x1, x2) + t;
    const miny = Math.min(y1, y2) - t, maxy = Math.max(y1, y2) + t;
    const dx = x2 - x1, dy = y2 - y1, len2 = dx * dx + dy * dy;
    for (let y = miny; y <= maxy; y += 0.5)
      for (let x = minx; x <= maxx; x += 0.5) {
        let s = len2 ? ((x - x1) * dx + (y - y1) * dy) / len2 : 0;
        s = Math.max(0, Math.min(1, s));
        const d = Math.hypot(x - (x1 + s * dx), y - (y1 + s * dy));
        if (d <= t) set(x * sx, y * sy, r, g, b, Math.min(1, (t - d) / 1.5 + 0.6));
      }
  };
  // "TK" monogram (favicon: no underline, glyphs only)
  rect(430, 215, 150, 34, 244, 244, 255);
  rect(489, 215, 32, 210, 244, 244, 255);
  rect(632, 215, 32, 210, 232, 230, 255);
  line(664, 320, 762, 215, 17, 232, 224, 255);
  line(664, 320, 762, 425, 17, 232, 224, 255);
  if (withGlows) {
    rect(489, 452, 110, 7, 168, 85, 247);
    rect(489, 452, 36, 7, 192, 132, 252);
  }
  return buf;
}

function encodePng(W, H, buf) {
  const raw = Buffer.alloc((W * 4 + 1) * H);
  for (let y = 0; y < H; y++) {
    raw[y * (W * 4 + 1)] = 0;
    buf.copy(raw, y * (W * 4 + 1) + 1, y * W * 4, (y + 1) * W * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  const crcTable = (() => {
    const t = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();
  const crc32 = (b) => {
    let c = 0xffffffff;
    for (let i = 0; i < b.length; i++) c = crcTable[(c ^ b[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const t = Buffer.from(type, 'ascii');
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
    return Buffer.concat([len, t, data, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync('client/public', { recursive: true });
writeFileSync('client/public/og-image.png', encodePng(1200, 630, render(1200, 630, true)));
writeFileSync('client/public/favicon.png', encodePng(256, 256, render(256, 256, false)));
console.log('Wrote og-image.png (1200x630) and favicon.png (256x256)');
