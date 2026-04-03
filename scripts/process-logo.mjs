import sharp from "sharp";
import { mkdir, unlink } from "fs/promises";

const SRC = "logo.png";

const dirs = ["apps/agency/public", "apps/portal/public"];
for (const dir of dirs) await mkdir(dir, { recursive: true });

const meta = await sharp(SRC).metadata();
const W = meta.width;
const H = meta.height;
console.log(`Source: ${W}x${H}`);

// ── Find the actual dividing lines by scanning for near-grey separator ───────
const { data: rawPixels } = await sharp(SRC)
  .raw()
  .toBuffer({ resolveWithObject: true });

const px = (x, y, ch) => rawPixels[((y * W) + x) * 3 + ch];

// Find vertical divider: scan a horizontal row near the middle for a grey column
function findVerticalDivider() {
  const midY = Math.floor(H / 2);
  for (let x = Math.floor(W * 0.3); x < Math.floor(W * 0.7); x++) {
    const r = px(x, midY, 0), g = px(x, midY, 1), b = px(x, midY, 2);
    // Grey separator: all channels similar and mid-range (150-220)
    if (Math.abs(r - g) < 15 && Math.abs(g - b) < 15 && r > 150 && r < 230) {
      return x;
    }
  }
  return Math.floor(W / 2); // fallback
}

// Find horizontal divider: scan a vertical column near the middle for a grey row
function findHorizontalDivider() {
  const midX = Math.floor(W / 2);
  for (let y = Math.floor(H * 0.3); y < Math.floor(H * 0.7); y++) {
    const r = px(midX, y, 0), g = px(midX, y, 1), b = px(midX, y, 2);
    if (Math.abs(r - g) < 15 && Math.abs(g - b) < 15 && r > 150 && r < 230) {
      return y;
    }
  }
  return Math.floor(H / 2); // fallback
}

const vDiv = findVerticalDivider();
const hDiv = findHorizontalDivider();
console.log(`Dividers found at x=${vDiv}, y=${hDiv}`);

// ── Remove near-white background → transparent ───────────────────────────────
async function removeWhiteBg(inputBuffer) {
  const { data, info } = await sharp(inputBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = new Uint8Array(data);
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i] >= 238 && pixels[i+1] >= 238 && pixels[i+2] >= 238) {
      pixels[i+3] = 0;
    }
  }
  return sharp(Buffer.from(pixels), {
    raw: { width: info.width, height: info.height, channels: 4 },
  }).png().toBuffer();
}

// ── 1. Icon only (top-left quadrant) ─────────────────────────────────────────
const iconRaw = await sharp(SRC)
  .extract({ left: 0, top: 0, width: vDiv, height: hDiv })
  .removeAlpha()
  .toBuffer();

const iconTransparent = await removeWhiteBg(iconRaw);
await sharp(iconTransparent).trim({ threshold: 20 }).toFile("_tmp_icon.png");

for (const dir of dirs) {
  await sharp("_tmp_icon.png")
    .resize(64, 64, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toFile(`${dir}/logo-icon.png`);
}
await sharp("_tmp_icon.png")
  .resize(32, 32, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .toFile("apps/agency/public/favicon.png");
await sharp("_tmp_icon.png")
  .resize(32, 32, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .toFile("apps/portal/public/favicon.png");
console.log("✓ logo-icon.png (64x64) + favicon.png (32x32)");

// ── 2. Wordmark only (top-right quadrant) ────────────────────────────────────
const wordmarkRaw = await sharp(SRC)
  .extract({ left: vDiv, top: 0, width: W - vDiv, height: hDiv })
  .removeAlpha()
  .toBuffer();

const wordmarkTransparent = await removeWhiteBg(wordmarkRaw);
await sharp(wordmarkTransparent).trim({ threshold: 20 }).toFile("_tmp_wordmark.png");

for (const dir of dirs) {
  await sharp("_tmp_wordmark.png")
    .resize(null, 40, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toFile(`${dir}/logo-wordmark.png`);
}
console.log("✓ logo-wordmark.png (height: 40px)");

// ── 3. Full logo (bottom-right: icon + wordmark) ──────────────────────────────
const fullRaw = await sharp(SRC)
  .extract({ left: vDiv, top: hDiv, width: W - vDiv, height: H - hDiv })
  .removeAlpha()
  .toBuffer();

const fullTransparent = await removeWhiteBg(fullRaw);
await sharp(fullTransparent).trim({ threshold: 20 }).toFile("_tmp_full.png");

for (const dir of dirs) {
  await sharp("_tmp_full.png")
    .resize(null, 40, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toFile(`${dir}/logo-full.png`);
}
await sharp("_tmp_full.png")
  .resize(null, 80, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .toFile("apps/agency/public/logo-full@2x.png");
console.log("✓ logo-full.png (40px height) + logo-full@2x.png (80px)");

// ── Cleanup ───────────────────────────────────────────────────────────────────
for (const f of ["_tmp_icon.png", "_tmp_wordmark.png", "_tmp_full.png"]) {
  await unlink(f).catch(() => {});
}

console.log("\nDone. Assets in:");
console.log("  apps/agency/public/  → logo-icon, logo-wordmark, logo-full, logo-full@2x, favicon");
console.log("  apps/portal/public/  → logo-icon, logo-wordmark, logo-full, favicon");
