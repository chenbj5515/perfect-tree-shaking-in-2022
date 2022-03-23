const purgecss = require('@fullhuman/postcss-purgecss');
const glob = require("glob-all");

module.exports = {
    plugins: [
      purgecss({
        content: [
          './**/*.html',
          ...glob.sync(`./src/**/*.js`, {nodir: true}),
          ...glob.sync(`./node_modules/antd/**/*.css`, {nodir: true})
        ],
        extractors: [
          {
            extractor: (content) => content.match(/([a-zA-Z-]+)(?= {)/g) || [],
            extensions: ["css"],
          },
        ],
      })
    ]
}