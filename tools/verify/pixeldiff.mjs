#!/usr/bin/env node
// Compares two screenshot directory trees (as produced by screenshot.mjs)
// pixel-by-pixel and reports the percentage of differing pixels per image.
// Usage: node tools/verify/pixeldiff.mjs <oldDir> <newDir> [diffOutDir]
import { readdirSync, readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

const [oldDir, newDir, diffOutDir] = process.argv.slice(2);
if (!oldDir || !newDir) {
  console.error("Usage: node tools/verify/pixeldiff.mjs <oldDir> <newDir> [diffOutDir]");
  process.exit(2);
}

const THRESHOLD_PCT = 0.1; // acceptable % of differing pixels

function listPngs(dir) {
  const out = [];
  for (const viewport of readdirSync(dir)) {
    const vDir = path.join(dir, viewport);
    for (const file of readdirSync(vDir)) {
      if (file.endsWith(".png")) out.push(path.join(viewport, file));
    }
  }
  return out;
}

const oldFiles = new Set(listPngs(oldDir));
const newFiles = new Set(listPngs(newDir));
const allFiles = new Set([...oldFiles, ...newFiles]);

let worst = 0;
let failures = 0;

for (const rel of [...allFiles].sort()) {
  if (!oldFiles.has(rel)) {
    console.log(`ONLY-NEW  ${rel}`);
    continue;
  }
  if (!newFiles.has(rel)) {
    console.log(`ONLY-OLD  ${rel}`);
    continue;
  }
  const img1 = PNG.sync.read(readFileSync(path.join(oldDir, rel)));
  const img2 = PNG.sync.read(readFileSync(path.join(newDir, rel)));

  const width = Math.max(img1.width, img2.width);
  const height = Math.max(img1.height, img2.height);

  if (img1.width !== img2.width || img1.height !== img2.height) {
    console.log(
      `SIZE-DIFF ${rel} old=${img1.width}x${img1.height} new=${img2.width}x${img2.height}`
    );
  }

  // Pad both images to the same canvas so pixelmatch can compare them.
  function pad(img) {
    if (img.width === width && img.height === height) return img;
    const padded = new PNG({ width, height });
    PNG.bitblt(img, padded, 0, 0, img.width, img.height, 0, 0);
    return padded;
  }
  const a = pad(img1);
  const b = pad(img2);
  const diff = new PNG({ width, height });
  const diffPixels = pixelmatch(a.data, b.data, diff.data, width, height, {
    threshold: 0.1,
  });
  const pct = (100 * diffPixels) / (width * height);
  const status = pct > THRESHOLD_PCT ? "DIFF" : "ok  ";
  if (pct > THRESHOLD_PCT) failures++;
  worst = Math.max(worst, pct);
  console.log(`${status} ${pct.toFixed(3)}%  ${rel}`);

  if (pct > THRESHOLD_PCT && diffOutDir) {
    const outPath = path.join(diffOutDir, rel);
    mkdirSync(path.dirname(outPath), { recursive: true });
    writeFileSync(outPath, PNG.sync.write(diff));
  }
}

console.log(`\nWorst diff: ${worst.toFixed(3)}%. ${failures} image(s) over ${THRESHOLD_PCT}% threshold.`);
process.exit(failures > 0 ? 1 : 0);
