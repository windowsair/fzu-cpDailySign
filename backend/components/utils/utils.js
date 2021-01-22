const { RedisOP } = require('../redis/redis-operation')
const { signTask } = require('../cpDaily/cpDailySign')
const { notificationSend } = require('../notification/notification')
/**
 * 判断当前时刻是否处于打卡的时间段内
 *
 * @return bool
 */
function judgeTimeRange() {
    const timeRangeList = [[500, 2230]]
    let now = new Date()
    let val = now.getHours() * 100 + now.getMinutes()

    for (const e of timeRangeList) {
        if (e[0] <= val && val <= e[1]) {
            return true
        }
    }

    return false
}

// function judgeTimeRange() {

//     return true
// }


async function takeLongTime() {
    return new Promise(resolve => {
        setTimeout(() => resolve(''), 8000)
    })
}


// TODO: 定时删除过时的数据
/**
 * 将签到过程中的结果记录到数据库中
 *
 * @param {object} redisClient
 * @param {string} userID 形如'user:9876543210'
 * @param {string} msg 消息
 * @param {string} type 操作类型
 */
async function logSignMsg(redisClient, userID, msg, type) {
    const timeStamp = Math.round(new Date() / 1000)
    let client = new RedisOP(redisClient)

    let data = {
        timeStamp: timeStamp,
        msg: msg,
        type: type
    }
    data = JSON.stringify(data)

    await client.pushToList(userID, data)

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
 * 所有用户的定时签到任务
 *
 * @param {object} redisUserClient
 * @param {object} redisLogClient
 * @param {bool} isFirstTime 采取多次签到的形式,第二次之后会在失败的用户中进行.
 */
function cronSignTask(redisUserClient, redisLogClient) {
    if (process.env.NODE_APP_INSTANCE === '10') {
        console.log('start cron!')
    } else{
        return
    }


    let userClient = new RedisOP(redisUserClient)
    let logClient = new RedisOP(redisLogClient)


    async function mainTask(userID, isFirstTime) {
        // step1: 获取用户信息
        let userInfo = await userClient.getValue(userID, ['loginData', 'notification'])
        let loginData = JSON.parse(userInfo[0])
        let notification = JSON.parse(userInfo[1])

        if (loginData == null) {
            if(userID == '0'){ // 忽略无用项
                return {code: -1, msg: '未找到有效用户'}
            }
            await logSignMsg(redisLogClient, userID, '未验证手机号', 'warning')
            return {code: -1, msg: '未找到有效用户'}
        }

        let signResult = await signTask(userID, loginData)

        if (signResult.code == 0) {
            // 成功签到
            if (notification == null) {
                await logSignMsg(redisLogClient, userID, '签到成功,未设置通知方式', 'success')
            }
            else {
                let noticeData = {
                    userID: userID,
                    type: notification.type,
                    apiKey: notification.apiKey,
                    isTest: false,
                    title: '签到成功',
                    content: '签到成功'
                }
                await logSignMsg(redisLogClient, userID, '签到成功', 'success')
                await notificationSend(redisLogClient, noticeData)
            }

            if (!isFirstTime) {
                // 不是在第一次成功的,这时候移除log数据库中Set的指定成员
                await logClient.removeSetMember('failSign', userID)
            }
        } else {
            // 签到失败
            if (isFirstTime) {
                await logClient.addSetMember('failSign', userID)

                // 只推送一次通知
                if (notification != null) {
                    let noticeData = {
                        userID: userID,
                        type: notification.type,
                        apiKey: notification.apiKey,
                        isTest: false,
                        title: '签到失败',
                        content: signResult.msg
                    }
                    await notificationSend(redisLogClient, noticeData)
                }
            }

            // 记录错误消息
            let msg = signResult.msg
            await logSignMsg(redisLogClient, userID, msg, 'error')
            return {code: 0, msg: msg}
        }

        return {code: 0, msg: 'done'}

    }

    async function mainLoop() {
        // 前置任务
        let startTime = new Date().toLocaleString()
        let isFirstTime = await logClient.isKeyExists('failSign')
        isFirstTime = !isFirstTime


        if (isFirstTime) {
            // 创建一个失败的表
            logClient.addSetMember('failSign', 0)
            logClient.setKeyExpire('failSign', 60 * 60 * 12)
        }

        // 获取用户
        let userList = []
        if (isFirstTime) {
            userList = await userClient.scanKey(0)
        } else {
            userList = await logClient.scanSet('failSign', 0)
        }

        if (userList[1].length == 0) { // 没有任何用户
            return
        }

        do {
            let cursor = userList[0]
            let userData = userList[1]
            console.log('当前共有：' + userData.length)
            for (let index = 0; index < userData.length; index++) {
                const userID = userData[index]
                let taskResult  = await mainTask(userID, isFirstTime) // 顺序执行
                console.log(taskResult + ` 用户:${userID}`)
                if(taskResult.code == 0){
                    await takeLongTime() // 限制并发
                }
                // doSomething
            }

            // 开始下一轮
            if (cursor == 0) {
                break
            }
            if (isFirstTime) {
                userList = await userClient.scanKey(cursor)
            } else {
                userList = await logClient.scanSet('failSign', cursor)
            }
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
 * 系统通知推送
 *
 * @param {object} redisUserClient
 * @param {object} redisLogClient
 */
function systemNotice(redisUserClient, redisLogClient) {

    let userClient = new RedisOP(redisUserClient)
    let logClient = new RedisOP(redisLogClient)


    async function mainTask(userID, isFirstTime) {
        // step1: 获取用户信息
        let userInfo = await userClient.getValue(userID, ['loginData', 'notification'])
        let loginData = JSON.parse(userInfo[0])
        let notification = JSON.parse(userInfo[1])

        if (loginData == null) {
            if(userID == '0'){ // 忽略无用项
                return {code: -1, msg: '未找到有效用户'}
            }
            logSignMsg(redisLogClient, userID, '未验证手机号', 'warning')
            return {code: -1, msg: '未找到有效用户'}
        }
        if (notification == null){
            return {code: -2, msg: '未设置通知方式'}
        }

        let noticeData = {
            userID: userID,
            type: notification.type,
            apiKey: notification.apiKey,
            isTest: false,
            title: '站点通知 ',
            content: '内容'
        }
        await notificationSend(redisLogClient, noticeData)

        return {code: 0, msg: 'done'}

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
                let taskResult  = await mainTask(userID, isFirstTime) // 顺序执行
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
exports.logSignMsg = logSignMsg
exports.getUserSignLog = getUserSignLog
exports.cronSignTask = cronSignTask
exports.systemNotice = systemNotice