import { readFileSync } from "node:fs";

const pages = JSON.parse(readFileSync("tools/verify/pages.json", "utf8"));

function urlToFile(u) {
  return u === "/" ? "index.html" : u.slice(1) + "index.html";
}

for (const urlPath of pages) {
  const file = urlToFile(urlPath);
  const html = readFileSync(file, "utf8");
  if (!html.includes('id="content"')) continue; // skip stubs

  const depth = urlPath.split("/").filter(Boolean).length;
  if (depth === 0) continue; // homepage always uses "./" or "/", not "../"

  const m = html.match(/<a href="([^"]*)" class="custom-logo-link"/);
  if (!m) {
    console.log(`NO-MATCH  ${urlPath}`);
    continue;
  }
  const actualHref = m[1];
  const expectedHref = "../".repeat(depth);
  const status = actualHref === expectedHref ? "ok  " : "BUG ";
  console.log(`${status} depth=${depth} actual="${actualHref}" expected="${expectedHref}"  ${urlPath}`);
}
