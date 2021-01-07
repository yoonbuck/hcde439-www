const pluginSass = require("eleventy-plugin-sass");
const inclusiveLangPlugin = require("@11ty/eleventy-plugin-inclusive-language");

module.exports = function (eleventyConfig) {
  eleventyConfig.setBrowserSyncConfig({
    ghostMode: false,
    open: false,
  });
  eleventyConfig.addWatchTarget("./src/_styles/*.scss");
  eleventyConfig.addPlugin(pluginSass, {
    watch: ["src/_styles/*.scss", "!node_modules/**"],
    sourcemaps: true,
    outputDir: "_build/styles",
    // remap: true,
  });
  eleventyConfig.addPlugin(inclusiveLangPlugin, {
    templateFormates: ["md", "njk", "html"],
  });

  eleventyConfig.addFilter(
    "formatDate",
    (date) =>
      `${
        [
          "January",
          "February",
          "March",
          "April",
          "May",
          "June",
          "July",
          "August",
          "September",
          "October",
          "November",
          "December",
        ][date.getUTCMonth()]
      } ${date.getUTCDate()}`
  );
  eleventyConfig.addFilter(
    "mins",
    (wordCount) => `${Math.ceil((wordCount || 0) / 200)} minute read`
  );

  return {
    dir: {
      input: "src",
      layouts: "_layouts",
      output: "_build",
    },
  };
};
