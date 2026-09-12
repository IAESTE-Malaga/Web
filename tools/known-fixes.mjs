export function applyKnownFixes(html, urlPath) {
  let fixed = html;
  // Fix 1: speculationrules depth-relative pattern -> absolute (every content page)
  fixed = fixed.replace(
    /"href_matches":"\.{1,2}(?:\/\.\.)*\/?\*"/g,
    '"href_matches":"/*"'
  );
  fixed = fixed
    .replace(/"\.{1,2}(?:\/\.\.)*\/wp-\*\.php"/g, '"/wp-*.php"')
    .replace(/"\.{1,2}(?:\/\.\.)*\/wp-admin\/\*"/g, '"/wp-admin/*"')
    .replace(/"\.{1,2}(?:\/\.\.)*\/wp-content\/uploads\/\*"/g, '"/wp-content/uploads/*"')
    .replace(/"\.{1,2}(?:\/\.\.)*\/wp-content\/plugins\/\*"/g, '"/wp-content/plugins/*"')
    .replace(/"\.{1,2}(?:\/\.\.)*\/wp-content\/themes\/scholarship-pro\/\*"/g, '"/wp-content/themes/scholarship-pro/*"')
    .replace(/"\.{1,2}(?:\/\.\.)*\/wp-content\/\*"/g, '"/wp-content/*"')
    .replace(/"\.{1,2}(?:\/\.\.)*\/\*\\\\\?\(\.\+\)"/g, '"/*\\\\?(.+)"');

  // Fix 2: on a handful of 2-levels-deep pages, the logo link, site-title
  // link, AND the nav "Inicio" item all point one directory short of site
  // root (e.g. /legal/ or /estudiantes/ instead of /) -- the original
  // relative-path conversion miscounted directory depth for these specific
  // pages, so every root-pointing link on them was one level short.
  // Full list verified by corpus scan (tools/_scan-depth-bug.mjs), comparing
  // every page's actual logo-link href against its correct "../"-per-depth
  // value -- not by sampling.
  const DEPTH_BUG_PAGES = new Set([
    "/estudiantes/area-de-trabajo/",
    "/estudiantes/area-interna/",
    "/estudiantes/bases-legales/",
    "/estudiantes/eventos/",
    "/estudiantes/experiencias/aga-malaga-2019/",
    "/estudiantes/experiencias/aga-malaga-2021/",
    "/estudiantes/experiencias/calendario-de-adviento/",
    "/estudiantes/experiencias/diana-en-tunez-2018/",
    "/estudiantes/experiencias/juan-en-bosnia-y-herzegovina-2019/",
    "/estudiantes/experiencias/maria-australia-2018/",
    "/estudiantes/experiencias/pedro-diaz-en-panama-2019/",
    "/legal/aviso-legal/",
    "/legal/politica-de-cookies/",
    "/legal/politica-privacidad/",
  ]);
  if (DEPTH_BUG_PAGES.has(urlPath)) {
    const depth = urlPath.split("/").filter(Boolean).length;
    const correctRoot = "../".repeat(depth);
    fixed = fixed
      .replace('<a href="../" class="custom-logo-link" rel="home">', `<a href="${correctRoot}" class="custom-logo-link" rel="home">`)
      .replace('<p class="site-title"><a href="../" rel="home">', `<p class="site-title"><a href="${correctRoot}" rel="home">`)
      .replace('menu-item-home menu-item-2518"><a href="../">Inicio</a>', `menu-item-home menu-item-2518"><a href="${correctRoot}">Inicio</a>`);
  }

  // Fix 4: annual-review's dns-prefetch hint is corrupted to a garbage local
  // path ("../../fonts.googleapis.com") by the same historical relative-path
  // conversion bug -- a dead, invisible resource hint on every other page.
  if (urlPath === "/conoce-iaeste/annual-review/") {
    fixed = fixed.replace(
      '<link rel="dns-prefetch" href="../../fonts.googleapis.com">',
      '<link rel="dns-prefetch" href="//fonts.googleapis.com">'
    );
  }

  return fixed;
}
