// Cuts the beige background out of the Gemini logo, crops it, and produces:
//   assets/brand-logo.png   (transparent, for the navbar)
//   assets/icon-180/192/512.png (logo centered on white, for the app icon)
// Pure Node (zlib only). Run: node scripts/process-logo.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { inflateSync, deflateSync } from "node:zlib";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "assets");
const SRC = join(dir, "Gemini_Generated_Image_12zgoj12zgoj12zg.png");

/* ---------- PNG decode (8-bit, colortype 2/6, no interlace) ---------- */
function decodePNG(buf) {
  let pos = 8, ihdr, idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos), type = buf.toString("ascii", pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") ihdr = { w: data.readUInt32BE(0), h: data.readUInt32BE(4), bd: data[8], ct: data[9], il: data[12] };
    else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    pos += 12 + len;
  }
  const { w, h, bd, ct, il } = ihdr;
  if (bd !== 8 || il !== 0 || (ct !== 2 && ct !== 6)) throw new Error("unsupported PNG: " + JSON.stringify(ihdr));
  const ch = ct === 6 ? 4 : 3, stride = w * ch, raw = inflateSync(Buffer.concat(idat));
  const out = Buffer.alloc(w * h * 4), prev = Buffer.alloc(stride), cur = Buffer.alloc(stride);
  let p = 0;
  for (let y = 0; y < h; y++) {
    const ft = raw[p++];
    for (let i = 0; i < stride; i++) {
      const x = raw[p++], a = i >= ch ? cur[i - ch] : 0, b = prev[i], c = i >= ch ? prev[i - ch] : 0;
      let v;
      if (ft === 1) v = x + a; else if (ft === 2) v = x + b; else if (ft === 3) v = x + ((a + b) >> 1);
      else if (ft === 4) { const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c); v = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c); }
      else v = x;
      cur[i] = v & 0xff;
    }
    for (let xx = 0; xx < w; xx++) { const si = xx * ch, di = (y * w + xx) * 4; out[di] = cur[si]; out[di + 1] = cur[si + 1]; out[di + 2] = cur[si + 2]; out[di + 3] = ch === 4 ? cur[si + 3] : 255; }
    cur.copy(prev);
  }
  return { w, h, data: out };
}

/* ---------- PNG encode (RGBA) ---------- */
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = b => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) { const l = Buffer.alloc(4); l.writeUInt32BE(data.length); const t = Buffer.from(type, "ascii"); const cr = Buffer.alloc(4); cr.writeUInt32BE(crc32(Buffer.concat([t, data]))); return Buffer.concat([l, t, data, cr]); }
function encodePNG(w, h, rgba) {
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 6;
  const raw = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ih), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

/* ---------- background removal by flood fill from the borders ---------- */
const img = decodePNG(readFileSync(SRC));
const { w, h, data } = img;
const isBg = (i) => { const r = data[i], g = data[i + 1], b = data[i + 2]; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); return (r >= b - 12) && mx > 150 && (mx - mn) < 62; };
const bg = new Uint8Array(w * h);
const stack = [];
for (let x = 0; x < w; x++) { stack.push(x); stack.push((h - 1) * w + x); }
for (let y = 0; y < h; y++) { stack.push(y * w); stack.push(y * w + w - 1); }
while (stack.length) {
  const idx = stack.pop();
  if (bg[idx]) continue;
  if (!isBg(idx * 4)) continue;
  bg[idx] = 1;
  const x = idx % w, y = (idx / w) | 0;
  if (x > 0) stack.push(idx - 1); if (x < w - 1) stack.push(idx + 1);
  if (y > 0) stack.push(idx - w); if (y < h - 1) stack.push(idx + w);
}
let minX = w, minY = h, maxX = 0, maxY = 0;
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
  const idx = y * w + x;
  if (bg[idx]) data[idx * 4 + 3] = 0;
  else { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
}
// crop with small padding
const pad = 6;
minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad); maxX = Math.min(w - 1, maxX + pad); maxY = Math.min(h - 1, maxY + pad);
const cw = maxX - minX + 1, chh = maxY - minY + 1;
const crop = Buffer.alloc(cw * chh * 4);
for (let y = 0; y < chh; y++) for (let x = 0; x < cw; x++) {
  const s = ((y + minY) * w + (x + minX)) * 4, d = (y * cw + x) * 4;
  crop[d] = data[s]; crop[d + 1] = data[s + 1]; crop[d + 2] = data[s + 2]; crop[d + 3] = data[s + 3];
}
writeFileSync(join(dir, "brand-logo.png"), encodePNG(cw, chh, crop));
console.log(`brand-logo.png ${cw}x${chh}`);

/* ---------- app icons: logo centered on white ---------- */
function makeIcon(size) {
  const buf = Buffer.alloc(size * size * 4).fill(255); // white
  const box = size * 0.74, scale = Math.min(box / cw, box / chh);
  const dw = Math.round(cw * scale), dh = Math.round(chh * scale);
  const ox = ((size - dw) / 2) | 0, oy = ((size - dh) / 2) | 0;
  for (let y = 0; y < dh; y++) for (let x = 0; x < dw; x++) {
    const sx = Math.min(cw - 1, (x / scale) | 0), sy = Math.min(chh - 1, (y / scale) | 0);
    const s = (sy * cw + sx) * 4, a = crop[s + 3] / 255;
    if (a <= 0) continue;
    const d = ((oy + y) * size + (ox + x)) * 4;
    buf[d] = crop[s] * a + 255 * (1 - a); buf[d + 1] = crop[s + 1] * a + 255 * (1 - a); buf[d + 2] = crop[s + 2] * a + 255 * (1 - a); buf[d + 3] = 255;
  }
  return encodePNG(size, size, buf);
}
for (const s of [180, 192, 512]) { writeFileSync(join(dir, `icon-${s}.png`), makeIcon(s)); console.log(`icon-${s}.png`); }
