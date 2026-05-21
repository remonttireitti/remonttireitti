import sharp from "sharp";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const svg = readFileSync(join(root, "public/brand/remonttireitti-mark.svg"));

const sizes = [
  { name: "logo-facebook-400.png", size: 400 },
  { name: "logo-facebook-512.png", size: 512 },
  { name: "logo-facebook-1024.png", size: 1024 },
];

for (const { name, size } of sizes) {
  await sharp(svg, { density: 300 })
    .resize(size, size)
    .png()
    .toFile(join(root, "public/brand", name));
  console.log("Wrote", name);
}

// Kansikuva 820×312 (logo + teksti)
const coverW = 820;
const coverH = 312;
const logoSize = 200;
const logoPng = await sharp(svg, { density: 300 })
  .resize(logoSize, logoSize)
  .png()
  .toBuffer();

const coverSvg = Buffer.from(`<svg width="${coverW}" height="${coverH}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f0f9ff"/>
      <stop offset="55%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#fff7ed"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <text x="260" y="130" font-family="Segoe UI, Arial, sans-serif" font-size="42" font-weight="700" fill="#0c4a6e">Remonttireitti</text>
  <text x="260" y="185" font-family="Segoe UI, Arial, sans-serif" font-size="24" font-weight="600" fill="#0369a1">Kilpailuta lämpöpumppu ilmaiseksi</text>
  <text x="260" y="230" font-family="Segoe UI, Arial, sans-serif" font-size="20" fill="#57534e">remonttireitti.fi</text>
</svg>`);

const coverBase = await sharp(coverSvg).png().toBuffer();

await sharp(coverBase)
  .composite([
    {
      input: logoPng,
      top: Math.round((coverH - logoSize) / 2),
      left: 36,
    },
  ])
  .png()
  .toFile(join(root, "public/brand/facebook-cover-820x312.png"));

console.log("Wrote facebook-cover-820x312.png");

// Sivuston favicon / PWA-ikonit (src/app → Next metadata)
const appIconSizes = [
  { path: "src/app/icon.png", size: 32 },
  { path: "src/app/apple-icon.png", size: 180 },
  { path: "public/icon.png", size: 32 },
  { path: "public/apple-icon.png", size: 180 },
];

for (const { path, size } of appIconSizes) {
  await sharp(svg, { density: 300 })
    .resize(size, size)
    .png()
    .toFile(join(root, path));
  console.log("Wrote", path);
}
