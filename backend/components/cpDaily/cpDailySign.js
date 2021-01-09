const { fzuAuth, doSignRes } = require('./cpDailyCommon')
const axios = require('axios')
const { relogin } = require('../cpDaily/cpDailyLogin')
const { RedisOP } = require('../redis/redis-operation')

async function getUnsignedTasks(cookie) {
    let data = {}

    let config = {
        method: 'post',
        url: `https://${fzuAuth.host}/wec-counselor-sign-apps/stu/sign/getStuSignInfosInOneDay`, //  queryDailySginTasks  getStuSignInfosInOneDay
        headers: {
            'Connection': 'keep-alive',
            'Accept': 'application/json, text/plain, */*',
            'X-Requested-With': 'XMLHttpRequest',
            'User-Agent': 'CampusNext/8.2.14 (iPhone; iOS 13.3.1; Scale/2.00)',
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
            'User-Agent': 'CampusNext/8.2.14 (iPhone; iOS 13.3.1; Scale/2.00)',
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

function signFormFill(task) {
    let form = {
        signPhotoUrl: '', // 福大不需要默认的照片
        signInstanceWid: task.signInstanceWid,
        isMalposition: task.isMalposition,

        longitude: 119.204299, // 福大的经纬度
        latitude: 26.064609,


        abnormalReason: '', // 不在签到范围的反馈原因,可以不填
        position: '福州大学第二田径场', // 注意位置的填写
        uaIsCpadaily: true
    }

    extraData = []
    //// FIXME: 下面包含一些硬编码
    if (task.isNeedExtra == 1) {
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


async function tryToSign(cookie, cpDailyInfo, form) {
    let data = form

    let config = {
        method: 'post',
        url: `https://${fzuAuth.host}/wec-counselor-sign-apps/stu/sign/submitSign`, // completeSignIn submitSign
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Accept-Encoding': 'gzip',
            'Cpdaily-Extension': cpDailyInfo, // 和这个关系很大
            'Cookie': cookie
        },
        data: data
    }


    return doSignRes(config)
}


async function signTask(userID, loginData) {
    const cpDailyInfo = loginData.cpDailyInfo
    let loginCookie = loginData.cookie

    async function getNewCookie() {
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
                result['set-cookie'].forEach(e => {
                    tmp += e.split(';')[0] + ';'
                })
                result = tmp
            }

            // 更新最新Cookie
            loginData.cookie = result
            const redisUserLoginData = {
                loginData: JSON.stringify(loginData)
            }
            let client = new RedisOP(global.redisUserClient)
            await client.setValue(userID, redisUserLoginData)

            return { code: 0, msg: 'OK', data: result }
        } catch (error) {
            return { code: -1, msg: 'Cookie获取失败!' }
        }
    }
    // step1: 更新登录状态(先尝试能不能登录系统)



    // step2: 获取系统中存在的签到任务
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
            let result = await getNewCookie()
            if (result.code != 0) {
                return { code: -1, msg: '签到失败,原因是登录状态过期' }
            }
            loginCookie = result.data
            continue
        }
        else if (unsignedTaskResult.datas.unSignedTasks.length < 1) {
            return { code: 1, msg: '暂未发布签到任务或您已经签到' }
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

    let form = signFormFill(detailTask)
    if (form.code != 0) {
        return { code: 2, msg: form.msg }
    }


    let signResult = await tryToSign(loginCookie, cpDailyInfo, form.data)
    if (!signResult) {
        return { code: -1, msg: '签到失败,原因是系统出错' }
    }

    if (signResult.message != 'SUCCESS') {
        return { code: 3, msg: `签到失败,原因是${signResult.message}` + '(如果提示版本过低，请重新验证手机号码)' }
    }

    return { code: 0, msg: 'OK' }


}


exports.signTask = signTask