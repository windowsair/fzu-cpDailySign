const axios = require('axios')
const to = require('await-to-js').default

const cryptoInfo = {
    'publicDynamicKey':
        '-----BEGIN RSA PUBLIC KEY-----\n' +
        'MIGJAoGBALkvQQORe9z0Okh8OvKFbdd4bad1MiYlKdcxuXkjQWD2AvX8mRxAtpKd\n' +
        'EIC0K2WB07q7Hm1hXB8/NFhVFNJPA30Ox8IlehzMTHSqQRz3Y/8mQGo0l/ucc02d\n' +
        '+M0XICosCnX6gC2M9Pwq/yQurZBaO8/XUAHg3hoN8D9mIQUoCRHJAgMBAAE=\n' +
        '-----END RSA PUBLIC KEY-----',

    'publicDynamicKeyVersion': 'firstv',
    'md5Salt': '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824', // 'hello'
}

const fzuAuth = {
    'tenantId': 'fzu',
    'login-url':
        'http://id.fzu.edu.cn/authserver/login?service=https%3A%2F%2Ffzu.cpdaily.com%2Fportal%2Flogin',
    'host': 'fzu.campusphere.net'
}

const headerCommon = {
    'SessionToken': 'szFn6zAbjjU=',
    'clientType': 'cpdaily_student',
    'User-Agent': 'CampusNext/8.2.14 (iPhone; iOS 13.3.1; Scale/2.00)',
    'deviceType': '1',
    'CpdailyStandAlone': '0',
    // 'RetrofitHeader': '8.0.8',
    'Cache-Control': 'max-age=0',
    'Content-Type': 'application/json; charset=UTF-8',
    //'Host': 'www.cpdaily.com',
    'Connection': 'Keep-Alive',
    'Accept-Encoding': 'gzip',

    'CpdailyInfo': '',
    'tenantId': 'fzu',

}

async function doLoginRes(axiosConfig) {
    let res, err
    ;[err, res] = await to(axios(axiosConfig))
    if (err) {
        console.log(err)
        return null
    }
    return res.data
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



exports.fzuAuth = fzuAuth
exports.headerCommon = headerCommon
exports.doLoginRes = doLoginRes
exports.doSignRes = doSignRes
exports.cryptoInfo = cryptoInfo