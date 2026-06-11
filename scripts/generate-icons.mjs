/**
 * Generates flat placeholder PWA icons (peacock sky, marigold sun, pistachio
 * hill) without native deps — plain RGBA buffers encoded as PNG via zlib.
 * Replace with real artwork anytime; just keep the filenames.
 *
 *   node scripts/generate-icons.mjs
 */
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const PEACOCK = [0x15, 0x5e, 0x75];
const MARIGOLD = [0xf5, 0x9e, 0x1d];
const PISTACHIO = [0x84, 0xb0, 0x67];
const CREAM = [0xff, 0xf8, 0xe7];

function crc32(buf) {
  let c, table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size, pixelFn) {
  // raw image: each row prefixed with filter byte 0
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixelFn(x, y, size);
      const i = rowStart + 1 + x * 4;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
      raw[i + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function design(x, y, size) {
  const u = x / size;
  const v = y / size;

  // rounded corners (12% radius) → transparent outside
  const r = 0.12;
  const cx = u < r ? r : u > 1 - r ? 1 - r : u;
  const cy = v < r ? r : v > 1 - r ? 1 - r : v;
  if ((u - cx) ** 2 + (v - cy) ** 2 > r * r) return [0, 0, 0, 0];

  // marigold sun
  if ((u - 0.5) ** 2 + (v - 0.42) ** 2 < 0.22 ** 2) {
    // cream inner glow
    if ((u - 0.5) ** 2 + (v - 0.42) ** 2 < 0.09 ** 2) return [...CREAM, 255];
    return [...MARIGOLD, 255];
  }

  // pistachio hill (big circle poking from the bottom)
  if ((u - 0.5) ** 2 + (v - 1.45) ** 2 < 0.78 ** 2) return [...PISTACHIO, 255];

  return [...PEACOCK, 255];
}

const outDir = path.join(import.meta.dirname, "..", "public", "icons");
mkdirSync(outDir, { recursive: true });
for (const size of [192, 512]) {
  writeFileSync(path.join(outDir, `icon-${size}.png`), png(size, design));
}
writeFileSync(path.join(outDir, "apple-touch-icon.png"), png(180, design));
console.log("icons written to public/icons/");
