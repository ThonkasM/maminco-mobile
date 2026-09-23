/**
 * Generates every derived logo asset for Maminco (Expo app + Next.js web)
 * from the single source file `development/maminco-logo.png`.
 *
 * Usage (from `maminco-mobile`):
 *   node scripts/generate-logo-assets.cjs
 *
 * See `docs/logo.md` for the rationale and the crop/colour decisions.
 */
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const Jimp = require('jimp-compact');

const ROOT = path.resolve(__dirname, '..');
const DEVELOPMENT = path.resolve(ROOT, '..');
const SRC = path.join(DEVELOPMENT, 'maminco-logo.png');
const FRONTEND = path.join(DEVELOPMENT, 'maminco-frontend');

const MOBILE_ASSETS = path.join(ROOT, 'assets');
const MOBILE_ICONS = path.join(MOBILE_ASSETS, 'icons');
const FRONTEND_APP = path.join(FRONTEND, 'app');
const FRONTEND_PUBLIC = path.join(FRONTEND, 'public');

/** Near-black interior of the source squircle (sampled). Used to flatten alpha. */
const BG = { r: 0x0a, g: 0x0d, b: 0x12 };

/** Squircle artwork inside the 1254x1254 source (drops transparent margin + drop shadow). */
const SQUIRCLE = { x: 46, y: 41, w: 1150, h: 1150 };

/** Duck + swoosh only: excludes the green frame and the "Maminco" wordmark below. */
const MARK = { x: 280, y: 245, w: 710, h: 540 };

const TRANSPARENT = Jimp.rgbaToInt(0, 0, 0, 0);
const BLACK = { r: 0, g: 0, b: 0 };

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

/** Composite the image alpha over a solid background (makes it opaque). */
function flattenOver(img, bg) {
  const d = img.bitmap.data;
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3] / 255;
    d[i] = Math.round(d[i] * a + bg.r * (1 - a));
    d[i + 1] = Math.round(d[i + 1] * a + bg.g * (1 - a));
    d[i + 2] = Math.round(d[i + 2] * a + bg.b * (1 - a));
    d[i + 3] = 255;
  }
  return img;
}

/** Full squircle logo (with the baked wordmark), optionally opaque. */
function fullLogo(src, size, { opaque = true } = {}) {
  const img = src.clone().crop(SQUIRCLE.x, SQUIRCLE.y, SQUIRCLE.w, SQUIRCLE.h).resize(size, size);
  return opaque ? flattenOver(img, BG) : img;
}

/** Duck + swoosh on transparent, background luminance removed and autocropped. */
function markImage(src) {
  const img = src.clone().crop(MARK.x, MARK.y, MARK.w, MARK.h);
  const d = img.bitmap.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const a = Math.max(0, Math.min(1, (lum - 28) / 40)); // bg (~15) -> 0, duck/gold -> 1
    d[i + 3] = Math.round(d[i + 3] * a);
  }
  img.autocrop();
  return img;
}

/** Center a mark inside a square transparent canvas, optionally recolouring it. */
function centerOn(mark, size, scale, fill) {
  const targetW = Math.max(1, Math.round(size * scale));
  const scaled = mark.clone().resize(targetW, Jimp.AUTO);
  if (fill) {
    const d = scaled.bitmap.data;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = fill.r;
      d[i + 1] = fill.g;
      d[i + 2] = fill.b;
    }
  }
  const canvas = new Jimp(size, size, TRANSPARENT);
  canvas.composite(
    scaled,
    Math.round((size - scaled.bitmap.width) / 2),
    Math.round((size - scaled.bitmap.height) / 2),
  );
  return canvas;
}

/** Build a multi-size .ico file whose entries embed PNG payloads. */
function buildIco(entries) {
  const count = entries.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);

  const dir = Buffer.alloc(16 * count);
  let offset = 6 + 16 * count;
  const blobs = [];

  entries.forEach((entry, idx) => {
    const b = idx * 16;
    dir.writeUInt8(entry.size >= 256 ? 0 : entry.size, b);
    dir.writeUInt8(entry.size >= 256 ? 0 : entry.size, b + 1);
    dir.writeUInt8(0, b + 2);
    dir.writeUInt8(0, b + 3);
    dir.writeUInt16LE(1, b + 4);
    dir.writeUInt16LE(32, b + 6);
    dir.writeUInt32LE(entry.png.length, b + 8);
    dir.writeUInt32LE(offset, b + 12);
    offset += entry.png.length;
    blobs.push(entry.png);
  });

  return Buffer.concat([header, dir, ...blobs]);
}

async function main() {
  [MOBILE_ASSETS, MOBILE_ICONS, FRONTEND_APP, FRONTEND_PUBLIC].forEach(ensureDir);

  const src = await Jimp.read(SRC);
  const mark = markImage(src);

  const write = (img, out) => img.writeAsync(out);
  const png = (img) => img.getBufferAsync(Jimp.MIME_PNG);

  // --- Expo (maminco-mobile) -------------------------------------------------
  await write(fullLogo(src, 1024, { opaque: true }), path.join(MOBILE_ASSETS, 'icon.png'));
  await write(
    centerOn(mark, 1024, 0.6),
    path.join(MOBILE_ASSETS, 'adaptive-icon.png'),
  );
  await write(
    centerOn(mark, 1024, 0.6, BLACK),
    path.join(MOBILE_ASSETS, 'monochrome-icon.png'),
  );
  await write(fullLogo(src, 512, { opaque: false }), path.join(MOBILE_ASSETS, 'splash-icon.png'));
  await write(fullLogo(src, 512, { opaque: false }), path.join(MOBILE_ASSETS, 'favicon.png'));
  await write(
    fullLogo(src, 512, { opaque: false }),
    path.join(MOBILE_ICONS, 'maminco-logo.png'),
  );
  await write(mark.clone().resize(512, Jimp.AUTO), path.join(MOBILE_ICONS, 'maminco-mark.png'));

  // --- Web (maminco-frontend) ------------------------------------------------
  await write(fullLogo(src, 512, { opaque: false }), path.join(FRONTEND_APP, 'icon.png'));
  await write(fullLogo(src, 180, { opaque: true }), path.join(FRONTEND_APP, 'apple-icon.png'));

  const icoSizes = [16, 32, 48];
  const icoEntries = [];
  for (const size of icoSizes) {
    icoEntries.push({ size, png: await png(fullLogo(src, size, { opaque: false })) });
  }
  fs.writeFileSync(path.join(FRONTEND_APP, 'favicon.ico'), buildIco(icoEntries));

  const og = new Jimp(1200, 630, Jimp.rgbaToInt(BG.r, BG.g, BG.b, 255));
  const ogLogo = fullLogo(src, 380, { opaque: false });
  og.composite(ogLogo, Math.round((1200 - ogLogo.bitmap.width) / 2), 100);
  await write(og, path.join(FRONTEND_APP, 'opengraph-image.png'));
  await write(og, path.join(FRONTEND_APP, 'twitter-image.png'));

  await write(
    fullLogo(src, 512, { opaque: false }),
    path.join(FRONTEND_PUBLIC, 'maminco-logo.png'),
  );
  await write(mark.clone().resize(512, Jimp.AUTO), path.join(FRONTEND_PUBLIC, 'maminco-mark.png'));
  await write(fullLogo(src, 192, { opaque: false }), path.join(FRONTEND_PUBLIC, 'icon-192.png'));
  await write(fullLogo(src, 512, { opaque: false }), path.join(FRONTEND_PUBLIC, 'icon-512.png'));
  // Maskable: keep the artwork inside the 80% safe zone on the brand background.
  const maskable = new Jimp(512, 512, Jimp.rgbaToInt(BG.r, BG.g, BG.b, 255));
  const maskLogo = fullLogo(src, Math.round(512 * 0.8), { opaque: false });
  maskable.composite(
    maskLogo,
    Math.round((512 - maskLogo.bitmap.width) / 2),
    Math.round((512 - maskLogo.bitmap.height) / 2),
  );
  await write(maskable, path.join(FRONTEND_PUBLIC, 'maskable-512.png'));

  console.log('Logo assets generated from', path.relative(DEVELOPMENT, SRC));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
