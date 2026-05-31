// Generates the PWA app icons (pure Node, no dependencies).
// A white tooth on the blue brand gradient. Run: node scripts/make-icons.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "assets");
mkdirSync(outDir, { recursive: true });

// --- tiny PNG encoder (RGBA) ---
const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
function crc32(buf) { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const t = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}
function encodePNG(w, h, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

// --- tooth silhouette test, coords in [0,1] ---
function isTooth(x, y) {
  const d = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
  const c1 = d(x, y, 0.33, 0.37) < 0.225;
  const c2 = d(x, y, 0.67, 0.37) < 0.225;
  const body = ((x - 0.5) / 0.355) ** 2 + ((y - 0.48) / 0.33) ** 2 < 1;
  const legL = Math.abs(x - 0.37) < 0.125 && y > 0.5 && y < 0.93;
  const legR = Math.abs(x - 0.63) < 0.125 && y > 0.5 && y < 0.93;
  const shape = c1 || c2 || body || legL || legR;
  const notchW = 0.135 * Math.max(0, (y - 0.58) / 0.35);
  const notch = Math.abs(x - 0.5) < notchW && y > 0.58;
  return shape && !notch;
}
const lerp = (a, b, t) => Math.round(a + (b - a) * t);

function render(size) {
  const buf = Buffer.alloc(size * size * 4);
  const pad = 0.19, scale = 1 - pad * 2; // tooth occupies central ~62% (maskable-safe)
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const u = (px + 0.5) / size, v = (py + 0.5) / size;
      // blue brand gradient background (top lighter -> bottom navy)
      let r = lerp(63, 27, v), g = lerp(106, 37, v), b = lerp(230, 89, v);
      const tx = (u - pad) / scale, ty = (v - pad) / scale;
      if (tx >= 0 && tx <= 1 && ty >= 0 && ty <= 1 && isTooth(tx, ty)) { r = 255; g = 255; b = 255; }
      const i = (py * size + px) * 4;
      buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = 255;
    }
  }
  return encodePNG(size, size, buf);
}

for (const s of [180, 192, 512]) {
  writeFileSync(join(outDir, `icon-${s}.png`), render(s));
  console.log(`wrote assets/icon-${s}.png`);
}
