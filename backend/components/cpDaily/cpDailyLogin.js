const UUID = require('uuid')
const crypto = require('../crypto/crypto')
const axios = require('axios')
const { fzuAuth, headerCommon } = require('./cpDailyCommon')


class FillExtension {
    #extension = {
        'lon': 119.204299, // 福大的经纬度
        'lat': 26.064609,
        'model': 'PCRT00',
        'appVersion': '8.0.8',
        'systemVersion': '4.4.4',
        'systemName': 'android',
        'userId': '', // 稍后构造, 注意大小写
        'deviceId': ''
    }

    constructor(username) {
        this.#extension.userId = username
        this.#extension.deviceId = UUID.v1()
    }
    // 获取加密后的数据字符串
    getInfo() {
        let des = new crypto.DESCrypto
        return des.encrypt(JSON.stringify(this.#extension))
    }
}


function getCpDailyInfo(username) {
    let extensionHelper = new FillExtension(username)
    return extensionHelper.getInfo()
}

// 获取绑定的手机验证码
function getMessageCode(cpDailyInfo, phone) {
    let des = new crypto.DESCrypto
    let data = {
        mobile: des.encrypt(String(phone)),
    }

    let config = {
        method: 'post',
        url: 'https://www.cpdaily.com/v6/auth/authentication/mobile/messageCode',
        headers: headerCommon,
        data: data
    }
    config.headers.CpdailyInfo = cpDailyInfo

    return new Promise(resolve => {
        axios(config)
            .then(response => {
                resolve(response.data)
            })
            .catch(error => {
                console.log(error)
                resolve(null)
            })
    })
}


async function verifyMessageCode(cpDailyInfo, phone, msgCode) {

    let data = {
        loginToken: String(msgCode),
        loginId: String(phone)
    }

    let config = {
        method: 'post',
        url: 'https://www.cpdaily.com/v6/auth/authentication/mobileLogin',
        headers: headerCommon,
        data: data
    }
    config.headers.CpdailyInfo = cpDailyInfo

    return new Promise(resolve => {
        axios(config)
            .then(response => {
                resolve(response.data)
            })
            .catch(error => {
                console.log(error)
                resolve(null)
            })
    })
}

// 在提交完验证码之后验证用户是否登录
async function verifyUserLogin(cpDailyInfo, sessionData) {
    // 相关数据的加密
    let des = new crypto.DESCrypto
    let rawSessionToken = sessionData.sessionToken
    let encryptSessionToken = des.encrypt(sessionData.sessionToken)
    let encrypTgc = des.encrypt(sessionData.tgc)

    let data = {
        tgc: encrypTgc,
    }

    let config = {
        method: 'post',
        url: 'https://www.cpdaily.com/v6/auth/authentication/validation',
        headers: headerCommon,
        data: data
    }
    config.headers.CpdailyInfo = cpDailyInfo
    config.headers.SessionToken = encryptSessionToken // 这里的SessionToken 需要用到刚才短信验证到的Token
    config.headers.Cookie = `sessionToken=${rawSessionToken}`

    return new Promise(resolve => {
        axios(config)
            .then(response => {
                resolve(response.data)
                // 这里有个act_tw
            })
            .catch(error => {
                console.log(error)
                resolve(null)
            })
    })
}

// 在登录过程中获取cookie


//// TODO:下个版本解决回调地狱
async function loginGetCookie(cpDailyInfo, loginData) {
    // 相关数据的加密
    let des = new crypto.DESCrypto
    let rawSessionToken = loginData.sessionToken
    let encryptSessionToken = des.encrypt(rawSessionToken)
    let encryptTgc = des.encrypt(loginData.tgc)

    let amp = {
        AMP1: [{
            value: rawSessionToken,
            name: 'sessionToken'
        }],
        AMP2: [{
            value: rawSessionToken,
            name: 'sessionToken'
        }]
    }
    amp = JSON.stringify(amp)
    encryptAmp = des.encrypt(amp)

    let config = {
        method: 'get',
        url: `https://${fzuAuth.host}/wec-portal-mobile/client/userStoreAppList`,
        headers: {
            'clientType': 'cpdaily_student',
            'User-Agent': 'Mozilla/5.0 (Linux; Android 4.4.4; PCRT00 Build/KTU84P) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/33.0.0.0 Safari/537.36 okhttp/3.8.1',
            'deviceType': '1',
            'CpdailyStandAlone': '0',
            'RetrofitHeader': '8.0.8',
            'Cache-Control': 'max-age=0',
            'Connection': 'Keep-Alive',
            'Accept-Encoding': 'gzip',

            'TGC': encryptTgc,
            'AmpCookies': encryptAmp,
            'SessionToken': encryptSessionToken,
            'CpdailyInfo': cpDailyInfo,
            'Host': fzuAuth.host,
            'tenantId': 'fzu',
            'Cookie': `CASTGC=${loginData.tgc}; AUTHTGC=${encryptTgc}`
        },
        maxRedirects: 0 // 不进行重定向
    }


    return new Promise(resolve => {
        newUrl = ''
        axios(config).then(response => {
            console.log(response)
            resolve(null)
        }).catch(error => {
            //// TODO: fzu only
            config.headers.Host = 'id.fzu.edu.cn'
            urlRedirect = error.response.headers['location']
            config.url = urlRedirect

            // 第二次
            axios(config).then(response => {
                resolve(null)
            }).catch(error => {
                config.headers.Host = fzuAuth.host
                urlRedirect = error.response.headers['location']
                config.url = urlRedirect

                // 第三次
                axios(config).then(response => {
                    resolve(null)
                }).catch(error => {
                    resolve(error.response.headers)
                })

            })

        })
    })
}


// 重新获取新的Cookie
async function relogin(loginData) {
    // 相关数据的加密
    let des = new crypto.DESCrypto
    let rawSessionToken = loginData.sessionToken
    let encryptSessionToken = des.encrypt(rawSessionToken)
    let encryptTgc = des.encrypt(loginData.tgc)

    let amp = {
        AMP1: [{
            value: rawSessionToken,
            name: 'sessionToken'
        }],
        AMP2: [{
            value: rawSessionToken,
            name: 'sessionToken'
        }]
    }
    amp = JSON.stringify(amp)
    encryptAmp = des.encrypt(amp)

    let config = {
        method: 'get',
        url: `https://${fzuAuth.host}/wec-portal-mobile/client/userStoreAppList`,
        headers: {
            'clientType': 'cpdaily_student',
            'User-Agent': 'Mozilla/5.0 (Linux; Android 4.4.4; PCRT00 Build/KTU84P) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/33.0.0.0 Safari/537.36 okhttp/3.8.1',
            'deviceType': '1',
            'CpdailyStandAlone': '0',
            'RetrofitHeader': '8.0.8',
            'Cache-Control': 'max-age=0',
            'Connection': 'Keep-Alive',
            'Accept-Encoding': 'gzip',

            'TGC': encryptTgc,
            'AmpCookies': encryptAmp,
            'SessionToken': encryptSessionToken,
            'CpdailyInfo': cpDailyInfo,
            'Host': fzuAuth.host,
            'tenantId': 'fzu',
            'Cookie': loginData.cookie
        },
        maxRedirects: 0 // 不进行重定向
    }
    console.log(config)
    return new Promise(resolve => {
        newUrl = ''
        axios(config).then(response => {
            try {
                if (response.data.code == 0) {
                    resolve(0) // 仍然存活,不需要登录
                }
                else {
                    console.log(response.data)
                    resolve(-1)
                }
            } catch (error) {
                console.log(response)
                resolve(-1)
            }

        }).catch(error => {
            // TODO: fzu only
            config.headers.Host = 'id.fzu.edu.cn'
            config.headers.Cookie = `CASTGC=${loginData.tgc}; AUTHTGC=${encryptTgc}`
            urlRedirect = error.response.headers['location']
            config.url = urlRedirect


            // 第二次
            axios(config).then(response => {
                resolve(null)
            }).catch(error => {
                config.headers.Host = fzuAuth.host
                urlRedirect = error.response.headers['location']
                config.url = urlRedirect

                // 第三次
                axios(config).then(response => {
                    resolve(null)
                }).catch(error => {
                    resolve(error.response.headers)
                })

            })

        })
    })
}


// async function getModAuthCAS(loginData) {
//     // 相关数据的加密
//     let rawSessionToken = loginData.sessionToken


//     let config0 = {
//         method: 'get',
//         url: 'https://www.cpdaily.com/connect/oauth2/authorize?response_type=code&client_id=10000000000000001&scope=get_user_info&state=cpdaily-uag&redirect_uri=http%3A%2F%2Fopen.cpdaily.com%3A80%2Fwec-open-app%2Fapp%2FuserAppListGroupByCategory',
//         headers: {
//             'clientType': 'cpdaily_student',
//             'User-Agent': 'Mozilla/5.0 (Linux; Android 4.4.4; PCRT00 Build/KTU84P) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/33.0.0.0 Mobile Safari/537.36 okhttp/3.8.1',
//             'deviceType': '1',
//             'CpdailyStandAlone': '0',
//             'RetrofitHeader': '8.0.8',
//             'Cache-Control': 'max-age=0',
//             'Host': 'www.cpdaily.com',
//             'Connection': 'Keep-Alive',
//             'Accept-Encoding': 'gzip',
//             'Accept': '',

//             'tenantId': 'fzu',
//             'Cookie':
//                 `acw_tc=123; clientType=cpdaily_student; tenantId=${fzuAuth.tenantId}; sessionToken=${rawSessionToken}`,
//         },
//         maxRedirects: 0,
//     }

//     let config1 = {
//         method: 'get',
//         url: '',
//         headers: {},
//         maxRedirects: 0
//     }

//     return new Promise(resolve => {
//         axios(config0)
//             .then(response => {
//                 console.log(response)
//                 resolve(null)
//             })
//             .catch(error => {
//                 // 第一次
//                 urlRedirect = error.response.headers['location']
//                 // 转换为http
//                 urlRedirect = urlRedirect.replace(':80', '')
//                 urlRedirect = urlRedirect.replace('http', 'https')
//                 config1.url = urlRedirect

//                 // 进行第二次重定向请求
//                 axios(config1).then(response => {
//                     // 有可能在这里提示未登录
//                     console.log(response)
//                     resolve(null)
//                 }).catch(error => {
//                     resolve(error.response.headers)
//                 })
//             })
//     })
// }


exports.getCpDailyInfo = getCpDailyInfo
exports.getMessageCode = getMessageCode
exports.verifyMessageCode = verifyMessageCode
exports.verifyUserLogin = verifyUserLogin

exports.loginGetCookie = loginGetCookie
exports.relogin = relogin