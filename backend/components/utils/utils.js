const { RedisOP } = require('../redis/redis-operation')
const { signTask } = require('../cpDaily/cpDailySign')
const { passTask } = require('../cpDaily/cpDailyPass')
const { formTask } = require('../cpDaily/cpDailySubmit')
const { notificationSend } = require('../notification/notification')
const { logTaskMsg } = require('./common')



/**
 * 判断当前时刻是否处于打卡的时间段内
 *  考虑弃用了...
 * @return bool
 */
function judgeTimeRange() {
    // const timeRangeList = [[500, 2230]]
    // let now = new Date()
    // let val = now.getHours() * 100 + now.getMinutes()

    // for (const e of timeRangeList) {
    //     if (e[0] <= val && val <= e[1]) {
    //         return true
    //     }
    // }

    // return false
    return true
}




async function takeLongTime() {
    return new Promise(resolve => {
        setTimeout(() => resolve(''), 8000)
    })
}



/**
 *
 * @param {object} redisClient
 * @param {string} userID 形如'user:9876543210'
 */
async function getUserSignLog(redisClient, userID) {
    let client = new RedisOP(redisClient)
    let data = await client.getListFromRange(userID, 0, 99)
    return data
}


/**
 * 获取当前需要进行的任务情况
 *
 * @param {string} userID 形如'user:9876543210'
 * @param {class RedisOP} userClient
 * @param {class RedisOP} logClient
 *
 * @returns {object} 需要进行的任务情况
 */
async function getTaskStatus(userID, userClient, logClient) {
    let [formTaskEnable, signTaskEnable, passTaskEnable] = await userClient.getValue(
        userID, ['formTaskEnable', 'signTaskEnable', 'passTaskEnable'],
        true)
    let formTaskResult = await logClient.isMemberOfSet(
        'successSubmit', userID)
    let signTaskResult = await logClient.isMemberOfSet(
        'successSign', userID)
    let passTaskResult = await logClient.isMemberOfSet(
        'successPass', userID)
    return {
        formTaskEnable: formTaskEnable && !formTaskResult,
        signTaskEnable: signTaskEnable && !signTaskResult,
        passTaskEnable: passTaskEnable && !passTaskResult
    }
}

/**
 * 主要的任务
 *
 * @param {string} userID 形如'user:9876543210'
 * @param {class RedisOP} userClient
 * @param {class RedisOP} logClient
 * @param {object} task 任务列表,形如{signTaskEnable: true}的值
 * @param {bool=false} isFirstTime
 *
 * @return {object} 执行结果,形如{code: 0, msg: 'OK'}的值
 */
async function mainCpDailyTask(userID, userClient, logClient, task, isFirstTime = false) {
    // step1: 获取用户信息
    let userInfo = await userClient.getValue(
        userID, ['loginData', 'notification'],
        true)
    let [loginData, notification] = userInfo

    if (loginData == null) {
        if (userID == '0') { // 忽略无用项
            return { code: -1, msg: '未找到有效用户' }
        }
        await logTaskMsg(logClient, userID, '未验证手机号', 'warning')
        return { code: -1, msg: '未找到有效用户' }
    }

    let taskSum = task.formTaskEnable + task.signTaskEnable
    let successSum = 0
    let errorMsgArr = []

    if (task.signTaskEnable) {
        // 获取位置信息
        let [address, lon, lat] = await userClient.getValue(
            userID, ['address', 'lon', 'lat'],
            true)
        const signLocation = {
            address: address,
            lon: lon,
            lat: lat,
        }
        let signResult = await signTask(userID, userClient, loginData, signLocation)
        if (signResult.code == 0) {
            successSum++
            await logClient.addSetMember('successSign', userID)
        } else {
            errorMsgArr.push(signResult.msg)
        }
    }

    if (task.formTaskEnable) {
        let [address, locationInfo] = await userClient.getValue(
            userID, ['address', 'locationInfo'],
            true)
        const formLocation = {
            address: address,
            locationInfo: locationInfo,
        }
        let formResult = await formTask(userID, userClient, loginData, formLocation)
        if (formResult.code == 0) {
            successSum++
            await logClient.addSetMember('successSubmit', userID)
        } else {
            errorMsgArr.push(formResult.msg)
        }
    }

    // 通行码任务自行处理
    if (task.passTaskEnable)
        passTask(userID, logClient, loginData)


    if (!taskSum)
        return { code: 0, msg: '无任务', waitTime: false }

    let msg = ''
    let logType = 'success'
    if (taskSum == successSum) {
        msg = `成功完成${taskSum}项任务`
    } else {
        logType = 'error'
        msg = `成功:${successSum},失败:${taskSum - successSum}\n`
        msg += errorMsgArr.join('\n')
    }

    // 始终记录历史
    logTaskMsg(logClient, userID, msg, logType)
    // 推送通知
    if (notification && (isFirstTime || logType == 'success')) {
        let noticeData = {
            userID: userID,
            type: notification.type,
            apiKey: notification.apiKey,
            isTest: false,
            title: logType == 'success' ? '任务成功' : '任务失败',
            content: msg
        }
        notificationSend(logClient, noticeData)
    }

    return {
        code: taskSum - successSum, // 失败个数
        msg: msg,
        waitTime: successSum > 0
    }

}


/**
 * 所有用户的定时任务
 *
 * @param {class RedisOP} redisUserClient
 * @param {class RedisOP} redisLogClient
 * @param {number} expireTime 任务重置时间
 * @param {bool} debug debug模式,直接执行
 */
function cronCpDailyTask(userClient, logClient, expireTime, debug = false) {
    if (process.env.NODE_APP_INSTANCE === '0' || debug) {
        console.log('start cron!')
    } else {
        return
    }

    async function mainLoop() {
        // 前置任务
        let startTime = new Date().toLocaleString()
        let isFirstTime = await logClient.isKeyExists('successSign')
        isFirstTime = !isFirstTime


        if (isFirstTime) {
            // 创建一个失败的表
            await logClient.addSetMember('successSign', 0)
            await logClient.addSetMember('successSubmit', 0)
            await logClient.addSetMember('successPass', 0)
            await logClient.setKeyExpire('successSign', expireTime)
            await logClient.setKeyExpire('successSubmit', expireTime)
            await logClient.addSetMember('successPass', expireTime)
        }

        // 获取用户
        let userList = await userClient.scanKey(0)

        if (userList[1].length == 0) { // 没有任何用户
            return
        }

        do {
            let [cursor, userData] = userList
            console.log('当前共有：' + userData.length)

            for (let index = 0; index < userData.length; index++) {
                const userID = userData[index]
                const allTask = await getTaskStatus(userID, userClient, logClient)
                let taskResult = await mainCpDailyTask(userID, userClient, logClient, allTask, isFirstTime)
                console.log(taskResult + ` 用户:${userID}`)
                if (taskResult.waitTime) {
                    await takeLongTime() // 限制并发
                }
                // doSomething
            }

            // 开始下一轮
            if (cursor == 0) {
                break
            }
            userList = await userClient.scanKey(cursor)
        } while (true)


        // 后续任务
        let endTime = new Date().toLocaleString()

        let timeLog = {
            startTime: startTime,
            endTime: endTime
        }
        timeLog = JSON.stringify(timeLog)
        logClient.pushToList('userTimeLog', timeLog)
    }
    try {
        mainLoop()

    } catch (err) {
        console.log(err)
    }
}


/**
 * 删除successSign和successSubmit记录
 *
 * @param {class redisOP} logClient
 */
async function deleteSuccessLog(logClient) {
    if (process.env.NODE_APP_INSTANCE === '0') {
        console.log('start cron!')
    } else {
        return
    }
    logClient.deleteKey(['successSign', 'successSubmit', 'successPass'])
        .then((opSuccessNum) => {
            if (opSuccessNum != 2) {
                console.log('无法删除success字段')
            }
        }).catch(err => {
            console.log('删除success字段发生错误')
            console.log(err)
            return
        })
}


/**
 * 系统通知推送
 *
 * @param {class RedisOP} userClient
 * @param {class RedisOP} logClient
 */
function systemNotice(userClient, logClient) {

    async function mainTask(userID, isFirstTime) {
        // step1: 获取用户信息
        let [loginData, notification] = await userClient.getValue(
            userID, ['loginData', 'notification'], true)

        if (loginData == null) {
            if (userID == '0') { // 忽略无用项
                return { code: -1, msg: '未找到有效用户' }
            }
            await logTaskMsg(logClient, userID, '未验证手机号', 'warning')
            return { code: -1, msg: '未找到有效用户' }
        }
        if (notification == null) {
            return { code: -2, msg: '未设置通知方式' }
        }

        let noticeData = {
            userID: userID,
            type: notification.type,
            apiKey: notification.apiKey,
            isTest: false,
            title: '站点通知 ',
            content: '内容'
        }
        await notificationSend(logClient, noticeData)

        return { code: 0, msg: 'done' }

    }

    async function mainLoop() {
        // 前置任务
        let startTime = new Date().toLocaleString()

        isFirstTime = true;

        // 获取用户
        let userList = []
        userList = await userClient.scanKey(0)

        if (userList[1].length == 0) { // 没有任何用户
            return
        }

        do {
            let cursor = userList[0]
            let userData = userList[1]
            for (let index = 0; index < userData.length; index++) {
                const userID = userData[index]
                let taskResult = await mainTask(userID, isFirstTime) // 顺序执行
                console.log(taskResult)
                // doSomething
            }

            // 开始下一轮
            if (cursor == 0) {
                break
            }
            userList = await userClient.scanKey(cursor)

        } while (true)


        // 后续任务
        let endTime = new Date().toLocaleString()

        let timeLog = {
            startTime: startTime,
            endTime: endTime
        }
        timeLog = JSON.stringify(timeLog)
        logClient.pushToList('userTimeLog', timeLog)
    }
    try {
        mainLoop()

    } catch (err) {
        console.log(err)
    }
}



exports.judgeTimeRange = judgeTimeRange
exports.getUserSignLog = getUserSignLog
exports.deleteSuccessLog = deleteSuccessLog
exports.cronCpDailyTask = cronCpDailyTask
exports.mainCpDailyTask = mainCpDailyTask
exports.systemNotice = systemNotice


exports.getTaskStatus = getTaskStatus