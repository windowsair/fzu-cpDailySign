const { getNewCookie } = require('../cpDaily/cpDailyLogin')
const { logTaskMsg, date2str } = require('../utils/common')

const Parameter = require('parameter')
const qs = require('qs')
const axios = require('axios')
const to = require('await-to-js').default


async function getWEU(cookieModCas) {
    let config = {
        method: 'post',
        url: 'http://ehall.fzu.edu.cn/qljapp/sys/itpub/MobileCommon/getMenuInfo.do',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 (5236115968)cpdaily/9.0.19  wisedu/9.0.19',
            'Referer': 'http://ehall.fzu.edu.cn/qljapp/sys/lwWiseduElectronicPass/*default/index.do',
            'Cookie': cookieModCas
        },
        data: qs.stringify({
            'data': '{"APPID":"5824595920058328", "APPNAME":"lwWiseduElectronicPass"}'
        }),
    }

    let res, err
    ;[err, res] = await to(axios(config))
    if (err) {
        console.log(err)
        return { code: -1, msg: '请求失败', data: null }
    }
    if (!res.headers['set-cookie']) {
        return { code: -1, msg: '系统可能已经改变', data: null }
    }
    // 取最长的WEU
    let longest = res.headers['set-cookie'].reduce(
        (a, b) => {
            return a.length > b.length ? a : b
        }
    )

    let cookieWEU = longest.split(';')[0] + ';'

    return { code: 0, msg: 'OK', data: cookieWEU }
}

async function getHistoryPass(cookie) {
    let config = {
        method: 'post',
        url: 'http://ehall.fzu.edu.cn/qljapp/sys/lwWiseduElectronicPass/mobile/application/getMyPass.do',
        headers: {
            'Accept': 'application/json, text/plain, */*',
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 (5236115968)cpdaily/9.0.19  wisedu/9.0.19',
            'Cookie': cookie
        },
        data: qs.stringify({
            'pageNumber': '1',
            'pageSize': '10'
        })
    }

    let res, err
    ;[err, res] = await to(axios(config))
    if (err || res.data.code != '0') {
        console.log(err)
        return { code: -1, msg: '历史通行证请求失败', data: null }
    }

    if (res.data.datas.getMyPass.totalSize < 1) {
        return { code: -1, msg: '暂无历史通行证信息', data: null }
    }

    let arr = res.data.datas.getMyPass.rows
    let item = res.data.datas.getMyPass.rows[0]
    let infoCount = Number.MAX_VALUE

    for (const e of arr) {
        let count = !e.ID_NO + !e.PHONE_NUMBER + !e.OFF_AREA
        if (count < infoCount) {
            infoCount = count
            item = e
        }
    }
    return { code: 0, msg: 'OK', data: item }

}

async function doPassRequest(info, cookie) {
    const formExtraText = '&commandType=start&defKey=lwWiseduElectronicPass.MainFlow'

    let formData = {
        'USER_ID': info.USER_ID,
        'USER_NAME': info.USER_NAME,
        'DEPT_CODE': info.DEPT_CODE,
        'DEPT_NAME': info.DEPT_NAME,
        'PHONE_NUMBER': info.PHONE_NUMBER,
        'ID_NO': info.ID_NO,
        'ID_TYPE': info.ID_TYPE,
        'PERSON_TYPE': info.PERSON_TYPE,
        'CAMPUS': info.CAMPUS,
        'OFF_AREA': '1', // 固定值->校区所在城市
        'IN_SCHOOL_TIME': date2str(new Date(), 'yyyy-MM-dd hh:mm'),
        'OFF_SCHOOL_TIME': `${date2str(new Date(), 'yyyy-MM-dd')} 23:59`, // 当天有效
        'RESSON': '出行'
    }


    let config = {
        method: 'post',
        url: 'http://ehall.fzu.edu.cn/qljapp/sys/emapflow/tasks/startFlow.do',
        headers: {
            'Accept': 'application/json, text/plain, */*',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Origin': 'http://ehall.fzu.edu.cn',
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 (4462986240)cpdaily/9.0.19  wisedu/9.0.19',
            'Referer': 'http://ehall.fzu.edu.cn/qljapp/sys/lwWiseduElectronicPass/*default/index.do',
            'Cookie': cookie,
        },
        data: qs.stringify({
            'formData': JSON.stringify(formData)
        }) + formExtraText,
    }

    let res, err
    ;[err, res] = await to(axios(config))
    if (err) {
        console.log(err)
        return { code: -1, msg: '申请通行码时发生错误' }
    }

    try {
        if (res.data.succeed) {
            return { code: 0, msg: 'OK' }
        } else {
            return { code: 0, msg: '申请通行码失败' }
        }
    } catch (error) {
        return { code: -1, msg: '申请通行码失败' }
    }
}


/**
 *
 * @param {string} userID 形如'user:9876543210'
 * @param {class RedisOP} logClient
 * @param {obejct} loginData 登录数据
 */
async function passTask(userID, logClient, loginData) {

    let parameter = new Parameter({
        validateRoot: true,
    })
    const loginRule = {
        cpDailyInfo: 'string',
        sessionToken: 'string',
        tgc: 'string',
    }


    let validateError1 = parameter.validate(loginRule, loginData)

    if (validateError1 != undefined) {
        return { code: -1, msg: '参数不正确, 请尝试重新验证手机' }
    }


    const cpDailyInfo = loginData.cpDailyInfo

    // 获取MOD_CAS

    // 不更新用户数据库
    let result = await getNewCookie(userID, null, cpDailyInfo, loginData, 'ehall')
    if (result.code != 0) {
        return { code: -1, msg: '登录状态过期' }
    }
    let cookieModCas = result.data

    // 获取WEU
    result = await getWEU(cookieModCas)
    if (result.code != 0) {
        logTaskMsg(logClient, userID, result.msg, 'warning')
        return result
    }
    let cookieWEU = result.data

    // 获取过往通行证记录
    const cookie = cookieModCas + cookieWEU
    result = await getHistoryPass(cookie)
    if (result.code != 0) {
        logTaskMsg(logClient, userID, result.msg, 'warning')
        return result
    }
    let historyPass = result.data

    // 申请新的通行证
    result = await doPassRequest(historyPass, cookie)
    if (result.code != 0) {
        logTaskMsg(logClient, userID, result.msg, 'warning')
        return result
    }

    logClient.addSetMember('successPass', userID)
    logTaskMsg(logClient, userID, '成功申请通行码', 'success')
    return { code: 0, msg: 'OK' }
}


exports.passTask = passTask
