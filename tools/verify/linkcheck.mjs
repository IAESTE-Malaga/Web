#!/usr/bin/env node
// Walks a built site directory and verifies every internal href/src/srcset
// target resolves to a real file on disk.
// Usage: node tools/verify/linkcheck.mjs _site
import { readdirSync, statSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import * as cheerio from "cheerio";

const root = path.resolve(process.argv[2] || "_site");
if (!existsSync(root)) {
  console.error(`Directory not found: ${root}`);
  process.exit(2);
}

const URL_ATTRS = ["href", "src", "poster", "action"];

function isExternalOrSpecial(url) {
  return (
    /^[a-z][a-z0-9+.-]*:/i.test(url) ||
    url.startsWith("//") ||
    url.startsWith("#") ||
    url === ""
  );
}

function resolveTarget(urlPath) {
  const [withoutQuery] = urlPath.split("?");
  const [withoutHash] = withoutQuery.split("#");
  if (!withoutHash.startsWith("/")) return null; // relative paths are already a bug at this stage
  let rel = withoutHash.slice(1);
  if (rel === "" || rel.endsWith("/")) rel = path.join(rel, "index.html");
  return path.join(root, rel);
}

function walkHtmlFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkHtmlFiles(full));
    else if (entry.name.endsWith(".html")) out.push(full);
  }
  return out;
}

const htmlFiles = walkHtmlFiles(root);
let checked = 0;
let broken = 0;

for (const file of htmlFiles) {
  const html = readFileSync(file, "utf8");
  const $ = cheerio.load(html);
  const urls = [];

  $("*").each((_, el) => {
    for (const attr of URL_ATTRS) {
      const val = $(el).attr(attr);
      if (val) urls.push(val);
    }
    const srcset = $(el).attr("srcset");
    if (srcset) {
      for (const part of srcset.split(",")) {
        const url = part.trim().split(" ")[0];
        if (url) urls.push(url);
      }
    }
  });

  for (const url of urls) {
    if (isExternalOrSpecial(url)) continue;
    if (!url.startsWith("/")) {
      broken++;
      console.log(`RELATIVE ${path.relative(root, file)} -> ${url} (should be root-absolute)`);
      continue;
    }
    checked++;
    const target = resolveTarget(url);
    if (!existsSync(target)) {
      broken++;
      console.log(`MISSING  ${path.relative(root, file)} -> ${url}`);
    }
  }
}

console.log(`\nChecked ${checked} internal links across ${htmlFiles.length} pages. ${broken} broken.`);
process.exit(broken > 0 ? 1 : 0);
