const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  chainWebpack: config => {
    config
    .plugin('html')
    .tap(args => {
      args[0].title = 'FEED BROWSER'
      return args
    })
  },
  transpileDependencies: true,
  devServer: {
    host: 'localhost',
    port: 8092,
    open: true,
    proxy: {
      '/api': {
        target: 'https://api.deriv.com',
        changeOrigin: true,
        pathRewrite: {
          '^/': '/'
        }
      }
    }
  },
  publicPath: '',
  lintOnSave: false
})
