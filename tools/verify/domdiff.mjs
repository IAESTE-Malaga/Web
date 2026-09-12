#!/usr/bin/env node
// Compares normalized DOM structure of every page between two sources.
// Each source is either a live server base URL (http://...) or a directory
// of pre-dumped JSON (as produced by domdump.mjs) — mix and match freely,
// since the frozen pre-migration baseline can no longer be served live once
// the legacy pages are deleted.
// Usage: node tools/verify/domdiff.mjs <oldSource> <newSource>
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { diffLines } from "diff";
import { canonicalJson } from "./lib/normalize.mjs";
import { slugify } from "./lib/slug.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pages = JSON.parse(readFileSync(path.join(__dirname, "pages.json"), "utf8"));

const [oldSource, newSource] = process.argv.slice(2);
if (!oldSource || !newSource) {
  console.error("Usage: node tools/verify/domdiff.mjs <oldSource> <newSource>");
  console.error("  each <source> is a base URL (http://...) or a dump directory");
  process.exit(2);
}

function isUrl(source) {
  return /^https?:\/\//i.test(source);
}

async function getJson(source, urlPath) {
  if (isUrl(source)) {
    const res = await fetch(new URL(urlPath, source));
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${urlPath}`);
    const html = await res.text();
    return canonicalJson(html, urlPath);
  }
  const file = path.join(source, `${slugify(urlPath)}.json`);
  if (!existsSync(file)) throw new Error(`dump missing: ${file}`);
  return readFileSync(file, "utf8");
}

let failures = 0;
for (const urlPath of pages) {
  try {
    const [oldJson, newJson] = await Promise.all([
      getJson(oldSource, urlPath),
      getJson(newSource, urlPath),
    ]);

    if (oldJson === newJson) {
      console.log(`OK   ${urlPath}`);
    } else {
      failures++;
      console.log(`DIFF ${urlPath}`);
      const diff = diffLines(oldJson, newJson);
      let shown = 0;
      for (const part of diff) {
        if (!part.added && !part.removed) continue;
        const prefix = part.added ? "+" : "-";
        for (const line of part.value.split("\n")) {
          if (line === "") continue;
          if (shown >= 20) break;
          console.log(`  ${prefix} ${line}`);
          shown++;
        }
        if (shown >= 20) {
          console.log("  ... (truncated)");
          break;
        }
      }
    }
  } catch (err) {
    failures++;
    console.log(`ERROR ${urlPath}: ${err.message}`);
  }
}

console.log(`\n${pages.length - failures}/${pages.length} pages match.`);
process.exit(failures > 0 ? 1 : 0);
