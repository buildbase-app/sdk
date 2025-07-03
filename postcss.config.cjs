const prefixwrap = require('postcss-prefixwrap')

module.exports = {
  plugins: [
    require('tailwindcss'),
    require('autoprefixer'),
    prefixwrap('.saas-os-ui')
  ]
}
