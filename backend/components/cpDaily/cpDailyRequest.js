const axios = require('axios')
const https = require("https")
const to = require('await-to-js').default
const crypto = require('../crypto/crypto')

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
        console.log(data.data)
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


exports.doLoginRes = doLoginRes
exports.doLoginResWithDecrypt = doLoginResWithDecrypt
exports.doSignRes = doSignRes