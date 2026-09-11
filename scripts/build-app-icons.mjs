#!/usr/bin/env node
/**
 * Renders the PWA app icons in public/icons/ from public/logo.svg.
 *
 * Run by hand after the logo changes, NOT as part of the build:
 *
 *   node scripts/build-app-icons.mjs
 *
 * The PNGs are committed, so a clean checkout installs and builds without
 * needing `sharp` — which arrives here only as a transitive dependency and is
 * not something the app should take a direct build-time bet on.
 *
 * Why these four, and why they differ:
 *   - `icon-192` / `icon-512` are `purpose: "any"` — the logo as drawn, on the
 *     app's own background, with a small margin so it does not touch the edge.
 *   - `icon-maskable-512` is `purpose: "maskable"` — Android crops icons to a
 *     platform-chosen shape (circle, squircle, rounded square), and anything
 *     outside the inner 80% "safe zone" can be cut away. So this one is drawn
 *     at 55% of the canvas: the same logo, deliberately smaller, bleeding
 *     background to every edge. Shipping ONE file for both purposes is the
 *     usual mistake — it either crops the wordmark or floats tiny in a circle.
 *   - `apple-touch-icon` is 180×180 and OPAQUE. iOS ignores the manifest's
 *     icons and composites transparency onto black, so the background is
 *     painted here rather than left to chance.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const SOURCE = resolve(ROOT, 'public/logo.svg');
const OUT_DIR = resolve(ROOT, 'public/icons');

/** `--bg-dark` in style.css. Kept in sync by hand; it is the brand ground. */
const BACKGROUND = { r: 0x0a, g: 0x0a, b: 0x0f, alpha: 1 };

/** @type {{ file: string, size: number, scale: number }[]} */
const TARGETS = [
  { file: 'icon-192.png', size: 192, scale: 0.82 },
  { file: 'icon-512.png', size: 512, scale: 0.82 },
  { file: 'icon-maskable-512.png', size: 512, scale: 0.55 },
  { file: 'apple-touch-icon.png', size: 180, scale: 0.78 },
];

/**
 * Render the logo centred on a square, fully opaque brand-coloured canvas.
 * @param {Buffer} svg - the raw SVG bytes
 * @param {number} size - output edge length in px
 * @param {number} scale - logo width as a fraction of the canvas edge
 * @returns {Promise<Buffer>} PNG bytes
 */
async function renderIcon(svg, size, scale) {
  // Rasterise the logo to its own bounding box first. The source viewBox is
  // wider than it is tall, so fitting by WIDTH and letting height follow keeps
  // the aspect ratio; `fit: 'inside'` then guarantees neither axis overflows.
  const logo = await sharp(svg, { density: 600 })
    .resize({
      width: Math.round(size * scale),
      height: Math.round(size * scale),
      fit: 'inside',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: size, height: size, channels: 4, background: BACKGROUND,
    },
  })
    .composite([{ input: logo, gravity: 'centre' }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

const svg = readFileSync(SOURCE);
mkdirSync(OUT_DIR, { recursive: true });

for (const { file, size, scale } of TARGETS) {
  const png = await renderIcon(svg, size, scale);
  writeFileSync(resolve(OUT_DIR, file), png);
  console.log(`  ${file.padEnd(24)} ${size}×${size}  ${(png.length / 1024).toFixed(1)} KB`);
}

console.log(`\nWrote ${TARGETS.length} icons -> public/icons/`);
