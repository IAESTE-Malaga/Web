#!/usr/bin/env node
// One-off migration: converts the 50 hand-authored WordPress-export pages
// at the repo root into Eleventy templates under src/pages/, plus a shared
// nav model under src/_data/nav.json.
//
// This script does NOT reformat any extracted content — the per-page markup
// slice is copied verbatim so the rendered output can be verified byte-for-
// byte (modulo whitespace-only text nodes and root-absolute path form)
// against the pre-migration baseline in tools/baseline/.
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import path from "node:path";
import * as cheerio from "cheerio";

const ROOT = process.cwd();
const pages = JSON.parse(readFileSync(path.join(ROOT, "tools/verify/pages.json"), "utf8"));

function urlToFile(urlPath) {
  return urlPath === "/" ? "index.html" : urlPath.slice(1) + "index.html";
}

function resolveHref(href, urlPath) {
  if (href == null) return href;
  const trimmed = href.trim();
  if (trimmed === "" || /^[a-z][a-z0-9+.-]*:/i.test(trimmed) || trimmed.startsWith("//") || trimmed.startsWith("#")) {
    return trimmed;
  }
  const base = "https://x.invalid" + urlPath;
  return new URL(trimmed, base).pathname;
}

function resolveSrcset(srcset, urlPath) {
  if (srcset == null) return srcset;
  return srcset
    .split(",")
    .map((part) => {
      const trimmed = part.trim();
      if (!trimmed) return trimmed;
      const spaceIdx = trimmed.indexOf(" ");
      if (spaceIdx === -1) return resolveHref(trimmed, urlPath);
      return resolveHref(trimmed.slice(0, spaceIdx), urlPath) + trimmed.slice(spaceIdx);
    })
    .join(", ");
}

// Rewrite every relative href/src/srcset/action/poster in a cheerio-loaded
// fragment to root-absolute, in place.
function rewritePathsInPlace($, root, urlPath) {
  const URL_ATTRS = ["href", "src", "poster", "action"];
  $(root)
    .find("*")
    .addBack()
    .each((_, el) => {
      if (!el.attribs) return;
      for (const attr of URL_ATTRS) {
        if (el.attribs[attr] != null) el.attribs[attr] = resolveHref(el.attribs[attr], urlPath);
      }
      if (el.attribs.srcset != null) el.attribs.srcset = resolveSrcset(el.attribs.srcset, urlPath);
    });
}

// ---------------------------------------------------------------------------
// Pass 1: load every page, classify content vs. redirect stub.
// ---------------------------------------------------------------------------
const pageData = [];
for (const urlPath of pages) {
  const filePath = urlToFile(urlPath);
  const html = readFileSync(path.join(ROOT, filePath), "utf8");
  const $ = cheerio.load(html, { xmlMode: false });
  const isStub = $("#content").length === 0;
  pageData.push({ urlPath, filePath, html, $, isStub });
}

console.log(`Loaded ${pageData.length} pages (${pageData.filter((p) => p.isStub).length} redirect stubs).`);

// ---------------------------------------------------------------------------
// Pass 2: build the nav model (primary + footer menus) from non-stub pages.
// WordPress nav class algorithm, reverse-engineered and verified against the
// source: base type/object classes, then (if this node is an ancestor of the
// current page) six ancestor-state classes, then (if this node IS the current
// page) current-menu-item [+ page_item + page-item-N] + current_page_item,
// then a marker class (menu-item-has-children, or menu-item-home for the
// custom "Inicio" link), then the menu-item-N id class.
// ---------------------------------------------------------------------------
const navNodes = new Map();

function walkMenu($, ul, urlPath, parentChildren) {
  $(ul)
    .children("li")
    .each((_, liEl) => {
      const $li = $(liEl);
      const id = $li.attr("id");
      const classes = ($li.attr("class") || "").split(/\s+/).filter(Boolean);
      const $a = $li.children("a").first();
      const href = resolveHref($a.attr("href") || "", urlPath);
      const label = $a.text().trim();
      const hasChildren = classes.includes("menu-item-has-children");
      const typeClass = classes.find((c) => c.startsWith("menu-item-type-"));
      const objectClass = classes.find((c) => c.startsWith("menu-item-object-"));
      const isCurrent = classes.includes("current-menu-item");
      const pageItemClass = classes.find((c) => /^page-item-\d+$/.test(c));
      const isHomeMarker = classes.includes("menu-item-home");

      if (!navNodes.has(id)) {
        const node = {
          id,
          label,
          url: href,
          hasChildren,
          typeClass,
          objectClass,
          isHomeMarker,
          pageItemId: null,
          children: [],
        };
        navNodes.set(id, node);
        if (parentChildren) parentChildren.push(node);
      }
      const node = navNodes.get(id);
      if (isCurrent && pageItemClass) node.pageItemId = pageItemClass.replace("page-item-", "");

      if (hasChildren) {
        const $sub = $li.children("ul.sub-menu, ul.children").first();
        walkMenu($, $sub, urlPath, node.children);
      }
    });
}

const primaryTree = [];
const footerTree = [];
for (const p of pageData) {
  if (p.isStub) continue;
  const $primary = p.$("#primary-menu");
  if ($primary.length) walkMenu(p.$, $primary, p.urlPath, primaryTree);
  const $footer = p.$("#footer-menu");
  if ($footer.length) walkMenu(p.$, $footer, p.urlPath, footerTree);
}

mkdirSync(path.join(ROOT, "src/_data"), { recursive: true });
writeFileSync(
  path.join(ROOT, "src/_data/nav.json"),
  JSON.stringify({ primary: primaryTree, footer: footerTree }, null, 2) + "\n"
);
console.log(`Nav model: ${navNodes.size} unique menu items (primary top-level: ${primaryTree.length}).`);

// ---------------------------------------------------------------------------
// Pass 3: emit an Eleventy template per page, mirroring the site's URL
// structure directly under src/ (NOT src/pages/ -- Eleventy maps a page's
// output URL from its path relative to the configured input dir, so nesting
// under an extra "pages" folder would build everything to /pages/... URLs).
// _includes/ and _data/ are Eleventy's own reserved dirs and are untouched
// by this cleanup since every page's own output dir is removed individually.
// ---------------------------------------------------------------------------
const OUT_DIR = path.join(ROOT, "src");
for (const urlPath of pages) {
  const dir = path.join(OUT_DIR, urlPath === "/" ? "" : urlPath.slice(1, -1));
  if (dir !== OUT_DIR && existsSync(dir)) rmSync(dir, { recursive: true });
}

function yamlString(s) {
  // Minimal, safe YAML scalar quoting for front matter values.
  return JSON.stringify(s ?? "");
}

let migrated = 0;
let stubs = 0;

for (const p of pageData) {
  const { urlPath, $ } = p;
  const outDir = path.join(OUT_DIR, urlPath === "/" ? "" : urlPath.slice(1, -1));
  mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, "index.njk");

  if (p.isStub) {
    // WordPress attachment-redirect stub. The automatic redirect is already
    // broken today (malformed meta-refresh seconds value, and the JS target
    // points at the empty wp-content/ dir at the wrong relative depth) --
    // both die on a 404. The one thing that works today is the fallback link
    // text, which already points at the correct /media/... asset. Repoint
    // the redirect there too: a genuine bug fix, not a style change.
    const linkHref = $("a").first().attr("href");
    const mediaTarget = resolveHref(linkHref, urlPath);
    const front = [
      "---",
      "layout: redirect.njk",
      `target: ${yamlString(mediaTarget)}`,
      "---",
      "",
    ].join("\n");
    writeFileSync(outFile, front);
    stubs++;
    continue;
  }

  // --- metadata ---
  const bodyClass = $("body").attr("class") || "";
  const isHome = /(^|\s)home(\s|$)/.test(bodyClass);

  // The entire Yoast SEO block (title, description, canonical, og:*, twitter:*,
  // JSON-LD, google-site-verification) varies per page in ways that don't
  // reduce to a handful of named fields -- some pages carry extra og:image /
  // twitter:label1 / twitter:data1 that others don't. Rather than enumerate
  // every possible field, lift the whole block verbatim (paths untouched --
  // Phase 7 makes canonical/og:url absolute; Phase 2 must not change them).
  const yoastStart = "<!-- This site is optimized with the Yoast SEO plugin";
  const yoastEnd = "<!-- / Yoast SEO plugin. -->";
  const startIdx = p.html.indexOf(yoastStart);
  const endIdx = p.html.indexOf(yoastEnd, startIdx);
  if (startIdx === -1 || endIdx === -1) {
    throw new Error(`Yoast block not found in ${p.filePath}`);
  }
  const yoastHead = p.html.slice(startIdx, endIdx + yoastEnd.length);

  // Two rare WP-conditional inline <style> blocks (verified by corpus-wide
  // grep, not sampling): wp-block-image-inline-css appears only on pages
  // using a Gutenberg Image block (1/38 pages); the anonymous
  // "hide featured image" style appears only on the 4 attachment/gallery
  // "experience" posts. Both are copied verbatim -- no path rewriting --
  // since they contain non-path url()/data: content that must not be touched.
  const $blockImageStyle = $("style#wp-block-image-inline-css");
  const extraBlockStyle = $blockImageStyle.length ? $.html($blockImageStyle) : "";

  let attachmentHideStyle = "";
  $("head style").each((_, el) => {
    if (!el.attribs.id && $(el).html().includes("has-post-thumbnail")) {
      attachmentHideStyle = $.html(el);
    }
  });

  const needsMediaElement = $("#mediaelement-css").length > 0;

  // WordPress's nav-ancestor classes are actually two independent pairs:
  // current-menu-ancestor/current-menu-parent (from the menu structure,
  // always present) and current-page-ancestor/current-page-parent (from the
  // page's real "Parent" attribute in wp-admin, only present when that
  // matches the menu placement). Verified by corpus grep: 4 of 21 pages with
  // an active ancestor (area-de-trabajo, area-interna, bases-legales,
  // eventos -- all under Estudiantes) only ever show the menu-based pair,
  // meaning those pages were placed in the menu without a matching page
  // parent. Detect it directly so nav-macro.njk reproduces it exactly.
  let menuOnlyAncestor = false;
  $(".menu-item-has-children").each((_, el) => {
    const classes = $(el).attr("class") || "";
    if (classes.includes("current-menu-ancestor") && !classes.includes("current-page-ancestor")) {
      menuOnlyAncestor = true;
    }
  });

  // --- unique content: innerHTML of #content, paths rewritten to root-absolute ---
  const $content = $("#content");
  rewritePathsInPlace($, $content, urlPath);
  const contentHtml = $content.html();

  const front = [
    "---",
    "layout: base.njk",
    `bodyClass: ${yamlString(bodyClass)}`,
    `isHome: ${isHome}`,
    `needsMediaElement: ${needsMediaElement}`,
    `menuOnlyAncestor: ${menuOnlyAncestor}`,
    "yoastHead: |-",
    ...yoastHead.split("\n").map((l) => "  " + l),
    ...(extraBlockStyle
      ? ["extraBlockStyle: |-", ...extraBlockStyle.split("\n").map((l) => "  " + l)]
      : []),
    ...(attachmentHideStyle
      ? ["attachmentHideStyle: |-", ...attachmentHideStyle.split("\n").map((l) => "  " + l)]
      : []),
    "---",
    "",
  ].join("\n");

  writeFileSync(outFile, front + contentHtml + "\n");
  migrated++;
}

console.log(`Wrote ${migrated} content pages and ${stubs} redirect stubs into ${path.relative(ROOT, OUT_DIR)}/`);
