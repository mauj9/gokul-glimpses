/**
 * Generates the PWA / app icons in public/icons/ from an inline SVG.
 * On-brand peacock-feather "eye" on a peacock-blue field.
 *
 *   node scripts/gen-icons.mjs
 *
 * Re-run whenever the mark changes. sharp ships with Next.js.
 */
import sharp from "sharp";
import path from "node:path";

const OUT = path.join(import.meta.dirname, "..", "public", "icons");

/** @param {{size:number, rounded:boolean, eyeScale:number}} o */
function iconSvg({ size, rounded, eyeScale }) {
  const bg = rounded
    ? `<rect x="0" y="0" width="512" height="512" rx="112" ry="112" fill="url(#bg)"/>`
    : `<rect x="0" y="0" width="512" height="512" fill="url(#bg)"/>`;
  return `<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#138aa7"/>
      <stop offset="1" stop-color="#0b4f62"/>
    </linearGradient>
  </defs>
  ${bg}
  <g transform="translate(256 256) scale(${eyeScale})">
    <ellipse cx="0" cy="0" rx="120" ry="152" fill="#7fb069"/>
    <ellipse cx="0" cy="8" rx="88" ry="114" fill="#f5a623"/>
    <ellipse cx="0" cy="14" rx="55" ry="74" fill="#0b3b49"/>
    <ellipse cx="-16" cy="-10" rx="15" ry="21" fill="#fff8e7" opacity="0.85"/>
  </g>
</svg>`;
}

const targets = [
  { file: "icon-192.png", size: 192, rounded: true, eyeScale: 0.92 },
  { file: "icon-512.png", size: 512, rounded: true, eyeScale: 0.92 },
  { file: "icon-maskable-512.png", size: 512, rounded: false, eyeScale: 0.66 },
  { file: "apple-touch-icon.png", size: 180, rounded: false, eyeScale: 0.9 },
];

for (const t of targets) {
  const svg = iconSvg(t);
  await sharp(Buffer.from(svg)).png().toFile(path.join(OUT, t.file));
  console.log(`✓ ${t.file} (${t.size}×${t.size})`);
}
console.log("Icons generated.");
