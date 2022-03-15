const { fzuAuth, cryptoInfo } = require('./cpDailyCommon')
const { doSignRes, getCryptForm } = require('./cpDailyRequest')
const { getNewCookie } = require('../cpDaily/cpDailyLogin')
const { RedisOP } = require('../redis/redis-operation')
const crypto = require('../crypto/crypto')

const Parameter = require('parameter')


async function getUnsignedTasks(cookie) {
    let data = {}

    let config = {
        method: 'post',
        url: `https://${fzuAuth.host}/wec-counselor-sign-apps/stu/sign/getStuSignInfosInOneDay`, //  queryDailySginTasks  getStuSignInfosInOneDay
        headers: {
            'Connection': 'keep-alive',
            'Accept': 'application/json, text/plain, */*',
            'X-Requested-With': 'XMLHttpRequest',
            'User-Agent': 'CampusNext/9.0.19 (iPhone; iOS 13.3.1; Scale/2.00)',
            'Content-Type': 'application/json',
            'Accept-Encoding': 'gzip,deflate',
            'Accept-Language': 'zh-CN,en-US;q=0.8',

            'Host': fzuAuth.host,
            'Origin': `https://${fzuAuth.host}`,
            'Cookie': cookie
        },
        data: data
    }


    return doSignRes(config)
}

async function getDetailTask(cookie, task) {
    let data = task

    let config = {
        method: 'post',
        url: `https://${fzuAuth.host}/wec-counselor-sign-apps/stu/sign/detailSignInstance`, // detailSignInstance detailSignTaskInst
        headers: {
            'Accept': 'application/json, text/plain, */*',
            'User-Agent': 'CampusNext/9.0.19 (iPhone; iOS 13.3.1; Scale/2.00)',
            'content-type': 'application/json',
            'Accept-Encoding': 'gzip,deflate',
            'Accept-Language': 'zh-CN,en-US;q=0.8',
            'Content-Type': 'application/json;charset=UTF-8',

            'Cookie': cookie
        },
        data: data
    }

    return doSignRes(config)
}

function signFormFill(task, address='福州大学第二田径场', lon=119.204299, lat=26.064609) {
    let form = {
        signPhotoUrl: '', // 福大不需要默认的照片
        signInstanceWid: task.signInstanceWid,
        isMalposition: task.isMalposition,

        longitude: lon, // 当前所在位置的经纬度
        latitude: lat,

        abnormalReason: ' ', // 不在签到范围的反馈原因,可以不填
        position: address, // 注意位置的填写
        uaIsCpadaily: true,
        // signVersion: '1.0.0', // 9.0.14废弃
    }

    let extraData = []
    //// FIXME: 下面包含一些硬编码
    if (task.isNeedExtra == 1) {
        form.isNeedExtra = 1
        const extraField = task.extraField

        let resultCount = 0

        for (let val of extraField) {
            let title = val.title
            let fieldItmArray = val.extraFieldItems



            if (title.indexOf('体温') != -1 || title.indexOf('温度') != -1) {
                for (let value of fieldItmArray) {
                    if (value.content.indexOf('小于') != -1) {
                        resultCount++
                        let tmpData = {
                            extraFieldItemValue: value.content, // 表单项内容
                            extraFieldItemWid: value.wid // 对应的值
                        }
                        extraData.push(tmpData)
                    }
                }
            }
            else if (title.indexOf('症状') != -1 || title.indexOf('发热') != -1) {
                for (let value of fieldItmArray) {
                    if (value.content.indexOf('否') != -1 || value.content.indexOf('无') != -1) {
                        resultCount++
                        let tmpData = {
                            extraFieldItemValue: value.content, // 表单项内容
                            extraFieldItemWid: value.wid // 对应的值
                        }
                        extraData.push(tmpData)
                    }
                }
            }
        }
        if (resultCount != 2) {
            return { code: 1, msg: '表单项可能已经改变!' }
        }


        // 添加额外字段
        form.extraFieldItems = extraData
    }

    return { code: 0, msg: 'OK', data: form }
}




async function tryToSign(cookie, cpdailyExtension, form) {
    let data = form

    let config = {
        method: 'post',
        url: `https://${fzuAuth.host}/wec-counselor-sign-apps/stu/sign/submitSign`, // completeSignIn submitSign
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Accept-Encoding': 'gzip',
            'Cpdaily-Extension': cpdailyExtension,
            'Cookie': cookie
        },
        data: data
    }


    return doSignRes(config)
}


/**
 *
 * @param {string} userID 形如'user:9876543210'
 * @param {class RedisOP} userClient
 * @param {obejct} loginData 登录数据
 * @param {object} location 地址和坐标信息
 */
async function signTask(userID, userClient, loginData, location) {
    // step0 : 验证字段
    let parameter = new Parameter({
        validateRoot: true,
    })
    const loginRule = {
        cpDailyInfo: 'string',
        cpDailyExtension: 'string',
        cookie: 'string',
    }
    const locationRule = {
        address: 'string',
        lon: 'number',
        lat: 'number',
    }

    let validateError1 = parameter.validate(loginRule, loginData)
    let validateError2 = parameter.validate(locationRule, location)

    if (validateError1 != undefined) {
        return { code: -1, msg: '参数不正确, 请尝试重新验证手机' }
    }
    if (validateError2 != undefined) {
        return { code: -1, msg: '请在详细设置中完善位置信息' }
    }


    const cpDailyInfo = loginData.cpDailyInfo // 可用于重新获取Cookie
    const cpDailyExtension = loginData.cpDailyExtension // 签到用
    let loginCookie = loginData.cookie // cookie可按需更新


    // step1: 获取任务
    // 如果cookie已经过期,重新获取
    let unsignedTaskResult = null
    for (let i = 0; i < 2; i++) {
        unsignedTaskResult = await getUnsignedTasks(loginCookie)
        if (!unsignedTaskResult) {
            return { code: -1, msg: '签到失败,原因是系统出错' }
        }
        if (unsignedTaskResult.datas['WEC-HASLOGIN'] == false) {
            // 仍然是未登录
            if (i == 1) {
                return { code: -1, msg: '签到失败,原因是登录状态过期' }
            }

            // 可能cookie已经失效,尝试重新获取下
            if (!loginData.tgc) {
                return { code: -1, msg: '系统已更新,请重新登录' }
            }
            let result = await getNewCookie(userID, userClient, cpDailyInfo, loginData)
            if (result.code != 0) {
                return { code: -1, msg: '签到失败,原因是登录状态过期' }
            }
            loginCookie = result.data
            continue
        }

        if (unsignedTaskResult.code == 999) {
            return { code: -1, msg: '签到失败,原因是登录状态过期' }
        }

        try {
            if (unsignedTaskResult.datas.unSignedTasks.length < 1) {
                return { code: 1, msg: '暂未发布签到任务或您已经签到' }
            }
        } catch (err) {
            console.log("unsignedtask")
            console.log(JSON.stringify(unsignedTaskResult))
        }

        break
    }


    // step3: 获取具体的签到任务


    const lastTask = unsignedTaskResult.datas.unSignedTasks[0]
    //const lastTask = unsignedTaskResult.datas.signedTasks[0]

    const lastTaskField = {
        signInstanceWid: lastTask.signInstanceWid,
        signWid: lastTask.signWid
    }

    let detailTaskResult = await getDetailTask(loginCookie, lastTaskField)
    if (!detailTaskResult) {
        return { code: -1, msg: '签到失败,原因是系统出错' }
    }

    const detailTask = detailTaskResult.datas

    let form = signFormFill(detailTask,
        location.address, location.lon, location.lat)
    if (form.code != 0) {
        return { code: 2, msg: form.msg }
    }
    let signData = getCryptForm(form.data, cpDailyInfo, location)

    let signResult = await tryToSign(loginCookie, cpDailyExtension, signData)
    if (!signResult) {
        return { code: -1, msg: '签到失败,系统出错' }
    }

    if (signResult.message != 'SUCCESS') {
        return { code: 3, msg: `签到失败,${signResult.message}` }
    }

    return { code: 0, msg: 'OK' }
}


exports.signTask = signTask