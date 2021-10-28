import axios from 'axios'
import {
	Loading,
	Message,
	Notification
} from 'element-ui'

axios.defaults.timeout = 100000
//axios.defaults.baseURL = 'http://127.0.0.1:8080'
axios.defaults.withCredentials = true;
// axios.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded';
// if (IS_PRODUCTION) {
// 	axios.defaults.baseURL = "http://localhost:12548/api";
// }

let loadingInstance
// 请求拦截器
axios.interceptors.request.use(
    config => {
        if(config.url.startsWith('http') || config.url.startsWith('/cors')){ // 外部域请求
            return config
        }
        loadingInstance = Loading.service({
            text: '请稍后...',
            target: '#main-content'
        })
        return config
    },
    error => {
        console.log(error)
        return Promise.reject(error)
    }
)
// 响应拦截器
axios.interceptors.response.use(
    response => {
        if(loadingInstance){
            loadingInstance.close()
        }

        return response
    },
    error => {
        try {
            if(loadingInstance){
                loadingInstance.close()
            }

            if (error.response) {
                let res = error.response
                let message = '处理请求时遇到了问题，请稍后再试'
                if (res.data && res.data.msg) {
                    message = res.data.msg
                }
                switch (res.status) {
                    case 500:
                        Notification({
                            title: '错误提示',
                            message: '服务器内部错误',
                            type: 'error',
                            duration: 0 // 不自动关闭
                        })
                        break
                    default:
                        Notification({
                            title: '错误提示',
                            message: message,
                            type: 'error',
                            duration: 0 // 不自动关闭
                        })
                        break
                }
            }
            let err = error + '';
            if (err.indexOf('Network Error') > -1) {
                Message({
                    message: '向服务器发起资源请求时出错',
                    type: 'error',
                })
            }
            return Promise.reject(error.response.data)

        } catch (error) {error}
    }

)




export default axios