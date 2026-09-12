#!/usr/bin/env node
// Fetches every page from a running server and writes its normalized DOM
// (see lib/normalize.mjs) as JSON to disk, so it survives after the source
// HTML that produced it is gone (e.g. once Phase 2 removes the legacy pages).
// Usage: node tools/verify/domdump.mjs <baseUrl> <outDir>
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { canonicalJson } from "./lib/normalize.mjs";
import { slugify } from "./lib/slug.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pages = JSON.parse(readFileSync(path.join(__dirname, "pages.json"), "utf8"));

const [baseUrl, outDir] = process.argv.slice(2);
if (!baseUrl || !outDir) {
  console.error("Usage: node tools/verify/domdump.mjs <baseUrl> <outDir>");
  process.exit(2);
}

mkdirSync(outDir, { recursive: true });
let ok = 0;

for (const urlPath of pages) {
  try {
    const res = await fetch(new URL(urlPath, baseUrl));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const json = canonicalJson(html, urlPath);
    writeFileSync(path.join(outDir, `${slugify(urlPath)}.json`), json);
    ok++;
  } catch (err) {
    console.log(`FAILED ${urlPath}: ${err.message}`);
  }
}

console.log(`Dumped ${ok}/${pages.length} pages into ${outDir}`);
