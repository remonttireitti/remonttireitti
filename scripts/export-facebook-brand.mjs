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
  <text x="260" y="118" font-family="Segoe UI, Arial, sans-serif" font-size="40" font-weight="700" fill="#0c4a6e">Remonttireitti</text>
  <text x="260" y="162" font-family="Segoe UI, Arial, sans-serif" font-size="22" font-weight="600" fill="#0369a1">Kilpailuta remontti ja palvelut</text>
  <text x="260" y="196" font-family="Segoe UI, Arial, sans-serif" font-size="20" font-weight="600" fill="#0369a1">ilmaiseksi</text>
  <text x="260" y="234" font-family="Segoe UI, Arial, sans-serif" font-size="18" fill="#57534e">Remontit · palvelut · huolto · tori</text>
  <text x="260" y="268" font-family="Segoe UI, Arial, sans-serif" font-size="18" font-weight="600" fill="#ea580c">remonttireitti.fi</text>
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

// Jaettava somekuva 1200×630 (FB/IG postaus)
const postW = 1200;
const postH = 630;
const postLogoSize = 120;
const postLogoPng = await sharp(svg, { density: 300 })
  .resize(postLogoSize, postLogoSize)
  .png()
  .toBuffer();

const postSvg = Buffer.from(`<svg width="${postW}" height="${postH}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f0f9ff"/>
      <stop offset="50%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#fff7ed"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <text x="80" y="200" font-family="Segoe UI, Arial, sans-serif" font-size="64" font-weight="800" fill="#0c4a6e">Remonttireitti</text>
  <text x="80" y="290" font-family="Segoe UI, Arial, sans-serif" font-size="38" font-weight="700" fill="#1c1917">Kilpailuta remontti ja palvelut</text>
  <text x="80" y="350" font-family="Segoe UI, Arial, sans-serif" font-size="38" font-weight="700" fill="#0369a1">ilmaiseksi</text>
  <text x="80" y="430" font-family="Segoe UI, Arial, sans-serif" font-size="26" fill="#44403c">Keittiö · lämmitys · siivous · piha · muutto</text>
  <text x="80" y="475" font-family="Segoe UI, Arial, sans-serif" font-size="26" fill="#44403c">Vertaa tarjouksia · asiakkaalle maksuton</text>
  <rect x="80" y="520" width="420" height="52" rx="26" fill="#ea580c"/>
  <text x="290" y="555" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="24" font-weight="700" fill="#ffffff">remonttireitti.fi</text>
</svg>`);

const postBase = await sharp(postSvg).png().toBuffer();

await sharp(postBase)
  .composite([
    {
      input: postLogoPng,
      top: 80,
      left: postW - postLogoSize - 80,
    },
  ])
  .png()
  .toFile(join(root, "public/brand/facebook-post-1200x630.png"));

console.log("Wrote facebook-post-1200x630.png");

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

for (const path of ["src/app/favicon.ico", "public/favicon.ico"]) {
  await sharp(svg, { density: 300 })
    .resize(32, 32)
    .png()
    .toFile(join(root, path));
  console.log("Wrote", path);
}
