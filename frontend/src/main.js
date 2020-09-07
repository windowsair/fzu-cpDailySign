import Vue from 'vue'
import App from './App.vue'
import './plugins/element.js'

import axios from './util/http'
Vue.prototype.$axios = axios

import querystring from 'querystring'
Vue.prototype.$qs = querystring;

import {store} from './store/store'

Vue.config.productionTip = false

new Vue({
  render: h => h(App),
  axios,
  store
}).$mount('#app')
