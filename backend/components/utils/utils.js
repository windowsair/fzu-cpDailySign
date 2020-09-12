const { RedisOP } = require('../redis/redis-operation')
const { signTask } = require('../cpDaily/cpDailySign')
const { notificationSend } = require('../notification/notification')
/**
 * 判断当前时刻是否处于打卡的时间段内
 * 
 * @return bool
 */
function judgeTimeRange() {
    const timeRangeList = [[500, 820], [1100, 1400], [2100, 2230]]
    let now = new Date()
    let val = now.getHours() * 100 + now.getMinutes()

    for (const e of timeRangeList) {
        if (e[0] <= val && val <= e[1]) {
            return true
        }
    }

    return false
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
function logSignMsg(redisClient, userID, msg, type) {
    const timeStamp = Math.round(new Date() / 1000)
    let client = new RedisOP(redisClient)

    let data = {
        timeStamp: timeStamp,
        msg: msg,
        type: type
    }
    data = JSON.stringify(data)

    client.pushToList(userID, data)

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
    let userClient = new RedisOP(redisUserClient)
    let logClient = new RedisOP(redisLogClient)


    async function mainTask(userID, isFirstTime) {
        // step1: 获取用户信息
        let userInfo = await userClient.getValue(userID, ['loginData', 'notification'])
        let loginData = JSON.parse(userInfo[0])
        let notification = JSON.parse(userInfo[1])

        if (loginData == null) {
            if(userID == '0'){ // 忽略无用项
                return
            }
            logSignMsg(redisLogClient, userID, '未验证手机号', 'warning')
            return
        }

        let signResult = await signTask(loginData.cpDailyInfo, loginData.sessionToken)

        if (signResult.code == 0) {
            // 成功签到
            if (notification == null) {
                logSignMsg(redisLogClient, userID, '签到成功,未设置通知方式', 'success')
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
                logSignMsg(redisLogClient, userID, '签到成功', 'success')
                notificationSend(redisLogClient, noticeData)
            }

            if (!isFirstTime) {
                // 不是在第一次成功的,这时候移除log数据库中Set的指定成员
                logClient.removeSetMember('failSign', userID)
            }
        } else {
            // 签到失败
            if (isFirstTime) {
                logClient.addSetMember('failSign', userID)

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
                    notificationSend(redisLogClient, noticeData)
                }
            }

            // 记录错误消息
            let msg = signResult.msg
            logSignMsg(redisLogClient, userID, msg, 'error')
        }

    }

    async function mainLoop() {
        // 前置任务
        let startTime = new Date().toLocaleString()
        let isFirstTime = await logClient.isKeyExists('failSign')
        isFirstTime = !isFirstTime
        

        if (isFirstTime) {
            // 创建一个失败的表
            logClient.addSetMember('failSign', 0)
            logClient.setKeyExpire('failSign', 60 * 60 * 4) // 四小时过期
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
            for (let index = 0; index < userData.length; index++) {
                const userID = userData[index]
                await mainTask(userID, isFirstTime) // 顺序执行
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



exports.judgeTimeRange = judgeTimeRange
exports.logSignMsg = logSignMsg
exports.getUserSignLog = getUserSignLog
exports.cronSignTask = cronSignTask