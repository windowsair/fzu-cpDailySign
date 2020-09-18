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

// 更新acw_tc 字段
async function updateAcwTc(cpDailyInfo, loginData) {
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
        },
        maxRedirects: 0 // 不进行重定向
    }


    return new Promise(resolve => {
        axios(config)
            .then(response => {
                // 一般不会成功,直接302了
                resolve(response.headers)
            })
            .catch(error => {
                if (error.response.status == 302) {
                    resolve(error.response.headers)
                } else {
                    console.log(error)
                    resolve(null)
                }

            })
    })
}


// 获取 MOD_AUTH_CAS 字段
/**
 * 总共有3次请求
 * 第一次请求 url: 带timestamp的url header: header1
 * -> 302跳转 -> 获取location -> 记为location1
 * ||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||
 * 
 * 第二次请求 url: location1        header: head2 
 * -> 302跳转 -> 获取location -> 记为location2
 * ||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||
 * 
 * 第三次请求 url: location2        header: head1 
 * -> 获取mod_auth_cas
 *  
 */
async function getModAuthCAS_sign(loginData) {
    // 相关数据的加密
    let rawSessionToken = loginData.sessionToken

    const header0 = {
        'Connection': 'keep-alive',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 4.4.4; PCRT00 Build/KTU84P) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/33.0.0.0 Safari/537.36 cpdaily/8.0.8 wisedu/8.0.8',
        'Accept-Encoding': 'gzip,deflate',
        'Accept-Language': 'zh-CN,en-US;q=0.8',
        'X-Requested-With': 'com.wisedu.cpdaily',
        'Host': 'api.campushoy.com'
    }

    const header1 = {
        'Connection': 'keep-alive',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 4.4.4; PCRT00 Build/KTU84P) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/33.0.0.0 Safari/537.36 cpdaily/8.0.8 wisedu/8.0.8',
        'Accept-Encoding': 'gzip,deflate',
        'Accept-Language': 'zh-CN,en-US;q=0.8',
        'X-Requested-With': 'com.wisedu.cpdaily',

        'Host': fzuAuth.host,
    }

    const header2 = {
        'Host': 'www.cpdaily.com',
        'Connection': 'keep-alive',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 4.4.4; PCRT00 Build/KTU84P) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/33.0.0.0 Safari/537.36 cpdaily/8.0.8 wisedu/8.0.8',
        'Accept-Encoding': 'gzip,deflate',
        'Accept-Language': 'zh-CN,en-US;q=0.8',

        'Cookie':
            `clientType=cpdaily_student; tenantId=${fzuAuth.tenantId}; sessionToken=${rawSessionToken}`,
    }

    let config = {
        method: 'get',
        url: `https://${fzuAuth.host}/wec-counselor-collector-apps/stu/mobile/index.html?timestamp=`
            + Math.round(new Date()),
        headers: header1,
        maxRedirects: 0 // 下面我们手动进行重定向
    }

    let configRedirect = {
        method: 'get',
        url: '', // 之后用重定向的地址填充
        headers: header2,
        maxRedirects: 0
    }

    // 这里偷懒下直接嵌套
    // 第一次fzu.cpdaily.com
    return new Promise(resolve => {
        axios(config)
            .then(response => {
                resolve(null)
            })
            .catch(error => {
                urlRedirect = error.response.headers['location']
                configRedirect.url = urlRedirect
                configRedirect.headers = header0

                // 进行第二次重定向请求  api.ccmpushoy.com
                axios(configRedirect).then(response => {
                    // 有可能在这里提示未登录
                    resolve(null)
                }).catch(error => {
                    urlRedirect = error.response.headers['location']
                    config.url = urlRedirect
                    config.headers = header2

                    // 进行第三次请求
                    axios(config).then(response => {
                        resolve(null)
                    }).catch(error => {
                        urlRedirect = error.response.headers['location']
                        config.url = urlRedirect
                        config.headers = header1
                        
                        axios(config).then(response => {
                            resolve(null)
                        }).catch(error => {
                            resolve(error.response.headers)
                        })
                    })
                })
            })
    })
}





async function getModAuthCAS(loginData) {
    // 相关数据的加密
    let rawSessionToken = loginData.sessionToken

    const header1 = {
        'Connection': 'keep-alive',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 4.4.4; PCRT00 Build/KTU84P) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/33.0.0.0 Safari/537.36 cpdaily/8.0.8 wisedu/8.0.8',
        'Accept-Encoding': 'gzip,deflate',
        'Accept-Language': 'zh-CN,en-US;q=0.8',
        'X-Requested-With': 'com.wisedu.cpdaily',

        'Host': fzuAuth.host,
    }

    const header2 = {
        'Host': 'www.cpdaily.com',
        'Connection': 'keep-alive',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 4.4.4; PCRT00 Build/KTU84P) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/33.0.0.0 Safari/537.36 cpdaily/8.0.8 wisedu/8.0.8',
        'Accept-Encoding': 'gzip,deflate',
        'Accept-Language': 'zh-CN,en-US;q=0.8',

        'Cookie':
            `clientType=cpdaily_student; tenantId=${fzuAuth.tenantId}; sessionToken=${rawSessionToken}`,
    }

    let config = {
        method: 'get',
        url: `https://${fzuAuth.host}/wec-counselor-collector-apps/stu/mobile/index.html?timestamp=`
            + Math.round(new Date()),
        headers: header1,
        maxRedirects: 0 // 下面我们手动进行重定向
    }

    let configRedirect = {
        method: 'get',
        url: '', // 之后用重定向的地址填充
        headers: header2,
        maxRedirects: 0
    }

    // 这里偷懒下直接嵌套
    return new Promise(resolve => {
        axios(config)
            .then(response => {
                resolve(null)
            })
            .catch(error => {
                urlRedirect = error.response.headers['location']
                configRedirect.url = urlRedirect

                // 进行第二次重定向请求
                axios(configRedirect).then(response => {
                    // 有可能在这里提示未登录
                    resolve(null)
                }).catch(error => {
                    urlRedirect = error.response.headers['location']
                    config.url = urlRedirect

                    // 进行第三次请求
                    axios(config).then(response => {
                        resolve(null)
                    }).catch(error => {
                        resolve(error.response.headers)
                    })
                })
            })
    })
}


exports.getCpDailyInfo = getCpDailyInfo
exports.getMessageCode = getMessageCode
exports.verifyMessageCode = verifyMessageCode
exports.verifyUserLogin = verifyUserLogin
exports.updateAcwTc = updateAcwTc
exports.getModAuthCAS = getModAuthCAS
exports.getModAuthCAS_sign = getModAuthCAS_sign
