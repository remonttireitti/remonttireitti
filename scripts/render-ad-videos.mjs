/**
 * Render 30s ad demo MP4s from local dev server. Requires: npm run dev + playwright chromium.
 * Usage: node scripts/render-ad-videos.mjs
 */
import { chromium } from "playwright";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.AD_DEMO_BASE_URL ?? "http://localhost:3000";
const OUT_DIR =
  process.env.AD_DEMO_OUT_DIR ?? "/opt/cursor/artifacts/mainos-videot";
const DURATION_MS = 31_000;

const DEMOS = [
  {
    file: "remonttireitti-mainos-asiakas-9x16.mp4",
    path: "/mainos/asiakas?formaatti=pysty&chrome=0",
    width: 1080,
    height: 1920,
  },
  {
    file: "remonttireitti-mainos-asiakas-16x9.mp4",
    path: "/mainos/asiakas?formaatti=vaaka&chrome=0",
    width: 1920,
    height: 1080,
  },
  {
    file: "remonttireitti-mainos-urakoitsija-9x16.mp4",
    path: "/mainos/urakoitsija?formaatti=pysty&chrome=0",
    width: 1080,
    height: 1920,
  },
  {
    file: "remonttireitti-mainos-urakoitsija-16x9.mp4",
    path: "/mainos/urakoitsija?formaatti=vaaka&chrome=0",
    width: 1920,
    height: 1080,
  },
];

function convertWebmToMp4(webmPath, mp4Path) {
  execSync(
    `ffmpeg -y -i "${webmPath}" -c:v libx264 -pix_fmt yuv420p -movflags +faststart -an "${mp4Path}"`,
    { stdio: "inherit" },
  );
}

async function renderOne(browser, demo, tmpDir) {
  const context = await browser.newContext({
    viewport: { width: demo.width, height: demo.height },
    deviceScaleFactor: 1,
    recordVideo: {
      dir: tmpDir,
      size: { width: demo.width, height: demo.height },
    },
  });

  const page = await context.newPage();
  const url = `${BASE}${demo.path}`;
  console.log(`Recording ${demo.file} ← ${url}`);
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(DURATION_MS);

  const video = page.video();
  await context.close();

  if (!video) throw new Error(`No video for ${demo.file}`);
  const webmPath = await video.path();
  const mp4Path = path.join(OUT_DIR, demo.file);
  convertWebmToMp4(webmPath, mp4Path);
  fs.unlinkSync(webmPath);
  console.log(`Saved ${mp4Path}`);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const tmpDir = fs.mkdtempSync(path.join("/tmp", "ad-demo-"));
  const browser = await chromium.launch({ headless: true });

  try {
    for (const demo of DEMOS) {
      await renderOne(browser, demo, tmpDir);
    }
    console.log(`\nDone. ${DEMOS.length} videos in ${OUT_DIR}`);
  } finally {
    await browser.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
