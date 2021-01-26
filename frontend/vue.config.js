module.exports = {
  devServer: {
    proxy: {
      '/api/login': {
        target: 'http://127.0.0.1:23340',
        ws: true,
        changeOrigin: true
      },
      '/api/captcha.jpg': {
        target: 'http://127.0.0.1:23340',
        ws: true,
        changeOrigin: true
      },
      '/api/verifyMsgCode': {
        target: 'http://127.0.0.1:23340',
        ws: true,
        changeOrigin: true
      },
      '/api/verifyPhone': {
        target: 'http://127.0.0.1:23340',
        ws: true,
        changeOrigin: true
      },
      '/api/changeNotice': {
        target: 'http://127.0.0.1:23340',
        ws: true,
        changeOrigin: true
      },
      '/api/testSign': {
        target: 'http://127.0.0.1:23340',
        ws: true,
        changeOrigin: true
      },
      '/api/getSignLog': {
        target: 'http://127.0.0.1:23340',
        ws: true,
        changeOrigin: true
      },
      '/api/getRemoteSetting': {
        target: 'http://127.0.0.1:23340',
        ws: true,
        changeOrigin: true
      },
      '/api/taskSetting': {
        target: 'http://127.0.0.1:23340',
        ws: true,
        changeOrigin: true
      }
    }
  }
}