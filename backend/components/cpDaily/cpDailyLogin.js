const UUID = require('uuid')
const axios = require('axios')
const to = require('await-to-js').default

const crypto = require('../crypto/crypto')
const { cryptoInfo, fzuAuth, headerCommon,  } = require('./cpDailyCommon')
const { doLoginRes, doLoginResWithDecrypt } = require('./cpDailyRequest')


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
        const des = new crypto.DESCrypto
        return des.encrypt(JSON.stringify(this.#extension),
            cryptoInfo.verDESKey[0x00])
    }
    /**
     * 获取Cpdaily-Extesion
     * @param {string} cpDailyInfoEncrypted 已经加密后的cpDailyInfo, Base64表示
     */
    static getCpdailyExtension(cpDailyInfoEncrypted) {
        const des = new crypto.DESCrypto

        let originalInfo = des.decrypt(cpDailyInfoEncrypted, cryptoInfo.verDESKey[0x00])
        return des.encrypt(originalInfo, cryptoInfo.verDESKey[0x03])
    }
}

function getCpdailyExtension(cpDailyInfoEncrypted) {
    return FillExtension.getCpdailyExtension(cpDailyInfoEncrypted)
}

// 获取动态Key
function getDynamicKey() {
    const rsa = crypto.RSACrypto
    const md5 = crypto.HashMD5

    let newUUID = UUID.v1()
    let userInfo = `${newUUID}|${cryptoInfo.dynamicKeyVersion}`

    let rawEncryptUserInfo = rsa.encrypt(userInfo, cryptoInfo.publicDynamicKey)

    // Base64需要每64Bytes分割
    // RSA定长, 这里就用硬编码了
    let tmp = rawEncryptUserInfo
    let encryptUserInfo = tmp.slice(0, 64) + '\r\n'
        + tmp.slice(64, 128) + '\r\n'
        + tmp.slice(128)

    const dataToMD5 = `p=${encryptUserInfo}&${cryptoInfo.md5Salt}`
    const encryptUserInfoMD5 = md5.getMD5String(dataToMD5)

    // 这里直接构造待发送的json字符串
    const re1 = new RegExp('\r\n', 'g')
    const re2 = new RegExp('/', 'g')
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
    const des = new crypto.DESCrypto
    let data = {
        a: des.encrypt(String(phone), cryptoInfo.campushoySecret),
        b: cryptoInfo.dynamicKeyVersion
    }

    let config = {
        method: 'post',
        url: 'https://mobile.campushoy.com/app/auth/authentication/mobile/messageCode/v-8213',
        headers: headerCommon,
        data: data
    }
    config.headers.CpdailyInfo = cpDailyInfo

    return doLoginRes(config)
}


async function verifyMessageCode(cpDailyInfo, phone, msgCode) {
    const des = new crypto.DESCrypto
    let rawData = {
        c: String(phone),
        d: String(msgCode)
    }

    let encryptedData = des.encrypt(JSON.stringify(rawData), cryptoInfo.campushoySecret)

    let data = {
        a: encryptedData,
        b: cryptoInfo.dynamicKeyVersion
    }

    let config = {
        method: 'post',
        url: 'https://mobile.campushoy.com/app/auth/authentication/mobileLogin/v-8213',
        headers: headerCommon,
        data: data
    }
    config.headers.CpdailyInfo = cpDailyInfo

    return doLoginResWithDecrypt(config, cryptoInfo.campushoySecret)
}

//// TODO:这个大概可以弃用了, 在8.2.14接口还是不变的
// 在提交完验证码之后验证用户是否登录
async function verifyUserLogin(cpDailyInfo, sessionData) {
    // 相关数据的加密
    const des = new crypto.DESCrypto
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


async function loginGetCookie(cpDailyInfo, loginData) {
    // 相关数据的加密
    const des = new crypto.DESCrypto
    let rawSessionToken = loginData.sessionToken
    let encryptSessionToken = des.encrypt(rawSessionToken, cryptoInfo.verDESKey[0x00])
    let encryptTgc = des.encrypt(loginData.tgc, cryptoInfo.verDESKey[0x00])

    let amp = {
        AMP1: [{
            value: rawSessionToken,
            name: 'sessionToken',
            // path: '/',
            // domain: '',
        }],
        AMP2: [{
            value: rawSessionToken,
            name: 'sessionToken',
            // path: '/',
            // domain: '',
        }]
    }
    amp = JSON.stringify(amp)
    let encryptAmp = des.encrypt(amp, cryptoInfo.verDESKey[0x00])

    let config = {
        method: 'get',
        url: `https://${fzuAuth.host}/wec-portal-mobile/client/userStoreAppList`,
        headers: {
            'clientType': 'cpdaily_student',
            'User-Agent': 'CampusNext/8.2.14 (iPhone; iOS 13.3.1; Scale/2.00)',
            'deviceType': '2',
            'CpdailyStandAlone': '0',
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
    config.url = redirect.response.headers['location']


    ;[redirect, resSomething] = await to(axios(config))
    if (resSomething) {
        console.log(resSomething)
        return null
    }

    // step3: 重定向
    config.headers.Host = fzuAuth.host
    config.url = redirect.response.headers['location']


    ;[redirect, resSomething] = await to(axios(config))
    if (resSomething) {
        console.log(resSomething)
        return null
    }

    return redirect.response.headers
}


/**
 * 重新获取新的Cookie
 *
 * @param {string} cpDailyInfo 加密后的字符串
 * @param {object} loginData 登录数据
 *
 * @returns null: 有错误发生 -1: 需要重新登录 0:无需操作 / 否则为获取到的header
 */
async function relogin(cpDailyInfo, loginData) {
    // 相关数据的加密
    const des = new crypto.DESCrypto
    let rawSessionToken = loginData.sessionToken
    let encryptSessionToken = des.encrypt(rawSessionToken, cryptoInfo.verDESKey[0x00])
    let encryptTgc = des.encrypt(loginData.tgc, cryptoInfo.verDESKey[0x00])

    let amp = {
        AMP1: [{
            value: rawSessionToken,
            name: 'sessionToken',
            // path: '/',
            // domain: '',
        }],
        AMP2: [{
            value: rawSessionToken,
            name: 'sessionToken',
            // path: '/',
            // domain: '',
        }]
    }
    amp = JSON.stringify(amp)
    let encryptAmp = des.encrypt(amp, cryptoInfo.verDESKey[0x00])

    let config = {
        method: 'get',
        url: `https://${fzuAuth.host}/wec-portal-mobile/client/userStoreAppList`,
        headers: {
            'clientType': 'cpdaily_student',
            'User-Agent': 'CampusNext/8.2.14 (iPhone; iOS 13.3.1; Scale/2.00)',
            'deviceType': '2',
            'CpdailyStandAlone': '0',

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
    config.url = redirect.response.headers['location']


    ;[redirect, resSomething] = await to(axios(config))
    if (resSomething) {
        console.log(resSomething)
        return null
    }

    // 继续进行重定向
    config.headers.Host = fzuAuth.host
    config.url = redirect.response.headers['location']


    ;[redirect, resSomething] = await to(axios(config))
    if (resSomething) {
        console.log(resSomething)
        return null
    }

    return redirect.response.headers
}

//// TODO: 重复合并

/**
 *
 * @param {string} userID 形如'user:9876543210'
 * @param {class RedisOP} userClient
 * @param {string} cpDailyInfo 加密后的字符串
 * @param {object} loginData 旧的登录数据
 */
async function getNewCookie(userID, userClient, cpDailyInfo, loginData) {
    let result = await relogin(cpDailyInfo, loginData)

    if (result == 0) {
        return { code: 0, msg: '无需获取', data: loginCookie }
    }
    else if (result == -1) {
        return { code: -1, msg: 'Cookie获取失败!' }
    }

    // 获取到新的cookie
    try {
        if (result['set-cookie'].length < 2) {
            return { code: -1, msg: 'Cookie获取失败!' }
        }
        else {
            let tmp = ''
            for (const item of result['set-cookie']) {
                tmp += item.split(';')[0] + ';'
            }
            result = tmp
        }

        // 更新最新Cookie
        loginData.cookie = result
        const newLoginData = {
            loginData: JSON.stringify(loginData)
        }
        await userClient.setValue(userID, newLoginData)
        return { code: 0, msg: 'OK', data: result }
    } catch (error) {
        console.log(error)
        return { code: -1, msg: 'Cookie获取失败!' }
    }
}


exports.getCpDailyInfo = getCpDailyInfo
exports.getMessageCode = getMessageCode
exports.verifyMessageCode = verifyMessageCode
exports.verifyUserLogin = verifyUserLogin

exports.loginGetCookie = loginGetCookie
// exports.relogin = relogin
exports.getNewCookie = getNewCookie

exports.getDynamicKey = getDynamicKey
exports.getCpdailyExtension = getCpdailyExtension