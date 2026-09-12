export default function(eleventyConfig) {
  // Nunjucks' built-in filter set has no map()/selectattr(); do the "is this
  // URL one of this node's direct children" check in real JS instead of
  // fighting the template language for it.
  eleventyConfig.addFilter("hasChildWithUrl", (children, url) => {
    return (children || []).some((child) => child.url === url);
  });

  // Passthrough copy: preserve media, assets, docs, and GitHub Pages config
  eleventyConfig.addPassthroughCopy("assets");
  eleventyConfig.addPassthroughCopy("media");
  eleventyConfig.addPassthroughCopy("docs");
  eleventyConfig.addPassthroughCopy("CNAME");
  eleventyConfig.addPassthroughCopy("robots.txt");
  eleventyConfig.addPassthroughCopy("sitemap");

  // Set up directory structure
  return {
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
      output: "_site"
    },
    templateFormats: ["njk", "md", "html"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk"
  };
}
