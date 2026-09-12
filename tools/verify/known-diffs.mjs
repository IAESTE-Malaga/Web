#!/usr/bin/env node
// Confirms every content page's diff against the pre-migration source is
// fully explained by the deliberate, documented Phase 2 fixes (see
// tools/known-fixes.mjs) -- and flags anything left over as a real,
// unexplained regression. The 12 redirect stubs are excluded here since
// their "old" HTML has no comparable structure; they're checked separately
// (see tools/verify/README or the migration commit message).
// Usage: node tools/verify/known-diffs.mjs [newBaseUrl]
import { readFileSync } from "node:fs";
import { canonicalJson } from "./lib/normalize.mjs";
import { applyKnownFixes } from "../known-fixes.mjs";

const newBase = process.argv[2] || "http://localhost:8081";
const pages = JSON.parse(readFileSync("tools/verify/pages.json", "utf8"));

function urlToFile(u) {
  return u === "/" ? "index.html" : u.slice(1) + "index.html";
}

let unexplained = 0;
for (const urlPath of pages) {
  const file = urlToFile(urlPath);
  const rawHtml = readFileSync(file, "utf8");
  const isStub = !rawHtml.includes('id="content"');
  if (isStub) continue;

  const fixedHtml = applyKnownFixes(rawHtml, urlPath);
  const oldJson = canonicalJson(fixedHtml, urlPath);

  const newRes = await fetch(new URL(urlPath, newBase));
  const newHtml = await newRes.text();
  const newJson = canonicalJson(newHtml, urlPath);

  if (oldJson === newJson) {
    console.log(`EXPLAINED  ${urlPath}`);
  } else {
    unexplained++;
    console.log(`RESIDUAL   ${urlPath}`);
  }
}

console.log(`\n${unexplained} page(s) with unexplained residual differences (stubs excluded, checked separately).`);
process.exit(unexplained > 0 ? 1 : 0);
