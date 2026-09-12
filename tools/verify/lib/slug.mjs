export function slugify(urlPath) {
  return urlPath.replace(/^\/|\/$/g, "").replace(/\//g, "__") || "home";
}
