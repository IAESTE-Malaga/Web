import * as cheerio from "cheerio";

// Attributes that carry a URL we should resolve to a canonical absolute
// path before comparing old (relative "./", "../") vs new (root-absolute "/") markup.
const URL_ATTRS = new Set(["href", "src", "poster", "action"]);

function isExternalOrSpecial(url) {
  return (
    /^[a-z][a-z0-9+.-]*:/i.test(url) || // any scheme (http:, mailto:, tel:, javascript:, data:...)
    url.startsWith("//") ||
    url.startsWith("#")
  );
}

/**
 * Resolve a URL found on a page at `pageDir` (e.g. "/estudiantes/experiencias/")
 * to a canonical absolute path, stripping cache-busting query strings.
 * Root-absolute URLs ("/foo") are returned as-is (already canonical).
 */
export function resolvePath(url, pageDir) {
  if (url == null) return url;
  const trimmed = String(url).trim();
  if (trimmed === "" || isExternalOrSpecial(trimmed)) return trimmed;

  const [pathPart] = trimmed.split("?");
  const [withoutHash] = pathPart.split("#");

  if (withoutHash.startsWith("/")) {
    // Already root-absolute; just collapse any "//" or "/./" noise.
    return new URL(withoutHash, "https://x.invalid/").pathname;
  }

  const base = "https://x.invalid" + (pageDir.endsWith("/") ? pageDir : pageDir + "/");
  return new URL(withoutHash, base).pathname;
}

function resolveSrcset(srcset, pageDir) {
  if (srcset == null) return srcset;
  return srcset
    .split(",")
    .map((part) => {
      const trimmed = part.trim();
      if (!trimmed) return trimmed;
      const spaceIdx = trimmed.indexOf(" ");
      if (spaceIdx === -1) return resolvePath(trimmed, pageDir);
      const url = trimmed.slice(0, spaceIdx);
      const descriptor = trimmed.slice(spaceIdx); // includes the leading space
      return resolvePath(url, pageDir) + descriptor;
    })
    .join(", ");
}

/**
 * Parse HTML into a canonical tree: tag name, path-normalized + sorted
 * attributes, and children (text/comment/element nodes), preserving text
 * content verbatim (no whitespace collapsing) so the comparison stays
 * maximally strict.
 */
export function normalizeHtml(html, pageDir) {
  const $ = cheerio.load(html, { xmlMode: false });

  function walk(el) {
    if (el.type === "text") {
      if (!el.data.length) return null;
      // Pure-whitespace text nodes (indentation/newlines introduced by the
      // template engine between tags) are visually insignificant in HTML;
      // collapse them to a canonical marker so template formatting can't
      // cause a false diff. Any text with real content is kept byte-exact.
      if (el.data.trim() === "") return { t: " " };
      return { t: el.data };
    }
    if (el.type === "comment") {
      return { c: el.data };
    }
    if (el.type === "tag" || el.type === "script" || el.type === "style") {
      const attrs = { ...el.attribs };
      // <meta name="msapplication-TileImage" content="..."> is the one meta
      // tag outside the (untouched) Yoast SEO block whose `content` holds a
      // real asset path rather than plain text -- normalize it too so a
      // relative-vs-root-absolute path form doesn't register as a false diff.
      for (const key of Object.keys(attrs)) {
        if (URL_ATTRS.has(key)) attrs[key] = resolvePath(attrs[key], pageDir);
        else if (key === "srcset") attrs[key] = resolveSrcset(attrs[key], pageDir);
        else if (
          key === "content" &&
          el.tagName === "meta" &&
          attrs.name === "msapplication-TileImage"
        ) {
          attrs[key] = resolvePath(attrs[key], pageDir);
        }
      }
      const sortedAttrs = Object.keys(attrs)
        .sort()
        .reduce((o, k) => ((o[k] = attrs[k]), o), {});
      const children = (el.children || []).map(walk).filter(Boolean);
      return { tag: el.tagName, attrs: sortedAttrs, children };
    }
    return null;
  }

  const root = $.root().get(0);
  return (root.children || []).map(walk).filter(Boolean);
}

export function canonicalJson(html, pageDir) {
  return JSON.stringify(normalizeHtml(html, pageDir), null, 2);
}
