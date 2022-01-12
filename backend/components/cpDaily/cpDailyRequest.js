const axios = require('axios')
const https = require("https")
const to = require('await-to-js').default
const qs = require('qs')
const crypto = require('../crypto/crypto')
const { cryptoInfo } = require('./cpDailyCommon')


// 延长存活时间
axios.defaults.timeout = 30000
axios.defaults.httpsAgent = new https.Agent({ keepAlive: true })

async function doLoginRes(axiosConfig) {
    let res, err
    ;[err, res] = await to(axios(axiosConfig))
    if (err) {
        console.log(err)
        return null
    }
    return res.data
}

/**
 * 就地解密数据请求
 * @param {object} axiosConfig 请求配置
 * @param {string} key 相应的密钥
 */
async function doLoginResWithDecrypt(axiosConfig, key) {
    let res, err
    ;[err, res] = await to(axios(axiosConfig))
    if (err) {
        console.log(err)
        return null
    }

    let data = res.data
    if (!data) {
        return null
    }
    try {
        if (data.errMsg != null) {
            return data
        }
        // 就地解密
        const aes = new crypto.AESCrypto
        let result = aes.decrypt(data.data, key)
        result = JSON.parse(result)

        data.data = result
        return data
    } catch (error) {
        console.log(error)
        return null
    }
}


async function doSignRes(axiosConfig) {
    let res, err
    ;[err, res] = await to(axios(axiosConfig))
    if (err) {
        console.log(err)
        return null
    }
    return (typeof res.data == 'object') ? res.data : null;
}


/**
 * 将默认的表单项目转换为9.0.14接受的格式
 *
 * @param {Object} form 填充好的表格数据
 * @param {String} cpDailyInfo 加密过的cpDailyInfo
 * @param {Object} location 位置信息
 */
 function getCryptForm(form, cpDailyInfo, location) {
    // TODO: cpDailyInfo 需要解密
    const des = new crypto.DESCrypto
    const aes = new crypto.AESCrypto
    const md5 = crypto.HashMD5
    const catSecret = cryptoInfo.catSecret

    location.lat = location.lat.toString()
    location.lon = location.lon.toString()

    let cryptCommon = {
        'bodyString': '',
        'sign': '',
        'calVersion': 'fistv',
        'version': 'first_v3',
    }

    let originalInfo =  JSON.parse(des.decrypt(cpDailyInfo, cryptoInfo.verDESKey[0x00]))
    let bodyString = aes.encrypt(JSON.stringify(form), catSecret)

    let strToSign = { // 按照字母升序给出, 偷懒了
        'appVersion': '9.0.14',
        'bodyString': bodyString,
        'deviceId': originalInfo.deviceId,
        'lat': location.lat,
        'lon': location.lon,
        'model': 'iPhone10,1',
        'systemName': 'iOS',
        'systemVersion': '13.3.1',
        'userId': originalInfo.userId,
    }
    strToSign = qs.stringify(strToSign, { encode: false }) + `&${catSecret}`
    let sign = md5.getMD5String(strToSign)

    let data = { ...cryptCommon, ...originalInfo }
    data.lon = location.lon
    data.lat = location.lat
    data.bodyString = bodyString
    data.sign = sign

    return data
}


exports.doLoginRes = doLoginRes
exports.doLoginResWithDecrypt = doLoginResWithDecrypt
exports.doSignRes = doSignRes
exports.getCryptForm = getCryptForm