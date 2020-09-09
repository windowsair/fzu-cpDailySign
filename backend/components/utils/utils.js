const { RedisOP } = require('../redis/redis-operation')

/**
 * 判断当前时刻是否处于打卡的时间段内
 * 
 * @return bool
 */
function judgeTimeRange() {
    const timeRangeList = [[500, 820], [1100, 1400], [1900, 2230]]
    let now = new Date()
    let val = now.getHours() * 100 + now.getMinutes()

    for (const e of timeRangeList) {
        if(e[0] <= val && val <= e[1]){
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
function logSignMsg(redisClient, userID, msg, type){
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
async function getUserSignLog(redisClient, userID){
    let client = new RedisOP(redisClient)
    let data = await client.getListFromRange(userID, 0, 99)
    return data
}



exports.judgeTimeRange = judgeTimeRange
exports.logSignMsg = logSignMsg
exports.getUserSignLog = getUserSignLog