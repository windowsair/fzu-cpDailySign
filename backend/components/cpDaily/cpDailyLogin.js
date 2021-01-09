const UUID = require('uuid')
const crypto = require('../crypto/crypto')
const axios = require('axios')
const to = require('await-to-js').default
const { cryptoInfo, fzuAuth, headerCommon, doLoginRes } = require('./cpDailyCommon')


class FillExtension {
    #extension = {
        'lon': 119.204299, // 福大的经纬度
        'lat': 26.064609,
        'model': 'iPhone10,1',
        'appVersion': '8.2.14',
        'systemVersion': '13.3.1',
        'systemName': 'iOS',
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
        return des.encryptWithKey(JSON.stringify(this.#extension), 'ST83=@XV')
    }
}

function getDynamicKey() {
    const rsa = crypto.RSACrypto
    const md5 = crypto.HashMD5

    let newUUID = UUID.v1();
    let userInfo = `${newUUID}|${cryptoInfo.publicDynamicKeyVersion}`

    let rawEncryptUserInfo = rsa.encrypt(userInfo, cryptoInfo.publicDynamicKey)

    // Base64需要每64Bytes分割
    // RSA定长, 这里就用硬编码了
    let tmp = rawEncryptUserInfo
    let encryptUserInfo = tmp.slice(0,64) + '\r\n' + tmp.slice(64, 128) + '\r\n' + tmp.slice(128)

    const dataToMD5 = `p=${encryptUserInfo}&${cryptoInfo.md5Salt}`
    const encryptUserInfoMD5 = md5.getMD5String(dataToMD5)

    // 这里直接构造json
    re1 = new RegExp('\r\n', 'g')
    re2 = new RegExp('/', 'g')
    encryptUserInfo = encryptUserInfo.replace(re2, '\\/')
    encryptUserInfo = encryptUserInfo.replace(re1, '\\r\\n')

    let jsonData = `{\"p\":\"${encryptUserInfo}\",\"s\":\"${encryptUserInfoMD5}\"}`


    let config = {
        method: 'post',
        url: 'https://mobile.campushoy.com/app/auth/dynamic/secret/getSecretKey/v-8213',
        headers: headerCommon,
        data: jsonData
    }

    return doLoginRes(config)
}



function getCpDailyInfo(username) {
    let extensionHelper = new FillExtension(username)
    return extensionHelper.getInfo()
}

// 获取绑定的手机验证码
function getMessageCode(cpDailyInfo, phone) {
    let des = new crypto.DESCrypto
    let data = {
        mobile: des.encryptWithKey(String(phone), 'ST83=@XV'),
    }

    let config = {
        method: 'post',
        url: 'https://mobile.campushoy.com/v6/auth/authentication/mobile/messageCode',
        headers: headerCommon,
        data: data
    }
    config.headers.CpdailyInfo = cpDailyInfo

    return doLoginRes(config)
}


async function verifyMessageCode(cpDailyInfo, phone, msgCode) {

    let data = {
        loginToken: String(msgCode),
        loginId: String(phone)
    }

    let config = {
        method: 'post',
        url: 'https://mobile.campushoy.com/v6/auth/authentication/mobileLogin',
        headers: headerCommon,
        data: data
    }
    config.headers.CpdailyInfo = cpDailyInfo

    return doLoginRes(config)
}

// 在提交完验证码之后验证用户是否登录
async function verifyUserLogin(cpDailyInfo, sessionData) {
    // 相关数据的加密
    let des = new crypto.DESCrypto
    let rawSessionToken = sessionData.sessionToken
    let encryptSessionToken = des.encryptWithKey(sessionData.sessionToken, 'XCE927==')
    let encrypTgc = des.encryptWithKey(sessionData.tgc, 'XCE927==')

    let data = {
        tgc: encrypTgc,
    }

    let config = {
        method: 'post',
        url: 'https://mobile.campushoy.com/v6/auth/authentication/validation',
        headers: headerCommon,
        data: data
    }
    config.headers.CpdailyInfo = cpDailyInfo
    config.headers.SessionToken = encryptSessionToken // 这里的SessionToken 需要用到刚才短信验证到的Token
    config.headers.Cookie = `sessionToken=${rawSessionToken}`

    return doLoginRes(config)
}

// 在登录过程中获取cookie


//// TODO:下个版本解决回调地狱
async function loginGetCookie(cpDailyInfo, loginData) {
    // 相关数据的加密
    let des = new crypto.DESCrypto
    let rawSessionToken = loginData.sessionToken
    let encryptSessionToken = des.encryptWithKey(rawSessionToken, 'XCE927==')
    let encryptTgc = des.encryptWithKey(loginData.tgc, 'XCE927==')

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
    encryptAmp = des.encryptWithKey(amp, 'XCE927==')

    let config = {
        method: 'get',
        url: `https://${fzuAuth.host}/wec-portal-mobile/client/userStoreAppList`,
        headers: {
            'clientType': 'cpdaily_student',
            'User-Agent': 'CampusNext/8.2.14 (iPhone; iOS 13.3.1; Scale/2.00)',
            'deviceType': '1',
            'CpdailyStandAlone': '0',
            //'RetrofitHeader': '8.0.8',
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

    let resSomething, redirect

    ;[redirect, resSomething] = await to(axios(config))
    if (resSomething) { // 失败
        console.log(resSomething)
        return null
    }

    // step2: 重定向
    //// TODO: fzu only
    config.headers.Host = 'id.fzu.edu.cn'
    urlRedirect = redirect.response.headers['location']
    config.url = urlRedirect


    ;[redirect, resSomething] = await to(axios(config))
    if (resSomething) {
        console.log(resSomething)
        return null
    }

    // step3: 重定向
    config.headers.Host = fzuAuth.host
    urlRedirect = redirect.response.headers['location']
    config.url = urlRedirect


    ;[redirect, resSomething] = await to(axios(config))
    if (resSomething) {
        console.log(resSomething)
        return null
    }

    return redirect.response.headers
}


// 重新获取新的Cookie
async function relogin(cpDailyInfo, loginData) {
    // 相关数据的加密
    let des = new crypto.DESCrypto
    let rawSessionToken = loginData.sessionToken
    let encryptSessionToken = des.encryptWithKey(rawSessionToken, 'XCE927==')
    let encryptTgc = des.encryptWithKey(loginData.tgc, 'XCE927==')

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
    encryptAmp = des.encryptWithKey(amp, 'XCE927==')

    let config = {
        method: 'get',
        url: `https://${fzuAuth.host}/wec-portal-mobile/client/userStoreAppList`,
        headers: {
            'clientType': 'cpdaily_student',
            'User-Agent': 'CampusNext/8.2.14 (iPhone; iOS 13.3.1; Scale/2.00)',
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

    let res, err, resSomething, redirect
    ;[redirect, resSomething] = await to(axios(config))
    if (resSomething) {
        try {
            if (resSomething.data.code == 0) {
                return 0 // 仍然存活,不需要登录
            }
            else {
                console.log('未存活')
                console.log(resSomething.data)
                return -1
            }
        } catch (error) {
            console.log('未存活')
            console.log(error)
            return -1
        }
    }

    // 开始获取新的Cookie
    config.headers.Host = 'id.fzu.edu.cn'
    config.headers.Cookie = `CASTGC=${loginData.tgc}; AUTHTGC=${encryptTgc}`
    urlRedirect = redirect.response.headers['location']
    config.url = urlRedirect


    ;[redirect, resSomething] = await to(axios(config))
    if(resSomething) {
        console.log(resSomething)
        return null
    }

    // 继续进行重定向
    config.headers.Host = fzuAuth.host
    urlRedirect = redirect.response.headers['location']
    config.url = urlRedirect


    ;[redirect, resSomething] = await to(axios(config))
    if (resSomething) {
        console.log(resSomething)
        return null
    }

    return redirect.response.headers
}

exports.getCpDailyInfo = getCpDailyInfo
exports.getMessageCode = getMessageCode
exports.verifyMessageCode = verifyMessageCode
exports.verifyUserLogin = verifyUserLogin

exports.loginGetCookie = loginGetCookie
exports.relogin = relogin
exports.getDynamicKey = getDynamicKey