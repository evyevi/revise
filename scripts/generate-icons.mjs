// One-off icon generator. The generated PNGs are committed to git.
// To regenerate: npm install canvas && node scripts/generate-icons.mjs
// canvas is intentionally NOT in package.json (native addon, run locally only).
//
// Generates placeholder pink square PNGs for PWA icons.
// Replace outputs with real artwork before production.
import { createCanvas } from 'canvas';
import { writeFileSync, mkdirSync } from 'fs';

mkdirSync('public/icons', { recursive: true });

function writePng(path, size, color) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size, size);
  // "R" letter in centre
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${Math.round(size * 0.5)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('R', size / 2, size / 2);
  writeFileSync(path, canvas.toBuffer('image/png'));
  console.log(`Wrote ${path}`);
}

writePng('public/icons/icon-192.png', 192, '#FF69B4');
writePng('public/icons/icon-512.png', 512, '#FF69B4');
writePng('public/icons/icon-maskable-512.png', 512, '#FF69B4');
