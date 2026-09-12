#!/usr/bin/env node
// Captures full-page screenshots of every page at three viewports.
// Usage: node tools/verify/screenshot.mjs <baseUrl> <outDir>
import { readFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { chromium } from "playwright";
import { slugify } from "./lib/slug.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pages = JSON.parse(readFileSync(path.join(__dirname, "pages.json"), "utf8"));

const [baseUrl, outDir] = process.argv.slice(2);
if (!baseUrl || !outDir) {
  console.error("Usage: node tools/verify/screenshot.mjs <baseUrl> <outDir>");
  process.exit(2);
}

const VIEWPORTS = [
  { name: "1440", width: 1440, height: 900 },
  { name: "800", width: 800, height: 900 },
  { name: "480", width: 480, height: 900 },
];

// Fixed settle delay after 'load' so auto-advancing sliders (6000ms/4200ms
// period) and preloader fade (200-600ms) stay in a consistent state without
// scrolling (which would trigger scroll-based counter/WOW animations).
const SETTLE_MS = 1500;

const browser = await chromium.launch();
let count = 0;

for (const viewport of VIEWPORTS) {
  const dir = path.join(outDir, viewport.name);
  mkdirSync(dir, { recursive: true });
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
  });
  const page = await context.newPage();

  for (const urlPath of pages) {
    const url = new URL(urlPath, baseUrl).toString();
    try {
      await page.goto(url, { waitUntil: "load", timeout: 30000 });
      await page.waitForTimeout(SETTLE_MS);
      const file = path.join(dir, `${slugify(urlPath)}.png`);
      await page.screenshot({ path: file, fullPage: true });
      count++;
    } catch (err) {
      console.log(`FAILED ${viewport.name}px ${urlPath}: ${err.message}`);
    }
  }
  await context.close();
}

await browser.close();
console.log(`\nCaptured ${count} screenshots into ${outDir}`);
