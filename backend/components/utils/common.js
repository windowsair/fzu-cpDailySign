/**
 *
 * @param {object} x Date对象
 * @param {string} y 日期格式
 * @returns 格式化后的字符串
 */
 function date2str(x, y) {
    let z = {
        M: x.getMonth() + 1,
        d: x.getDate(),
        h: x.getHours(),
        m: x.getMinutes(),
        s: x.getSeconds()
    }
    y = y.replace(/(M+|d+|h+|m+|s+)/g, function (v) {
        return ((v.length > 1 ? "0" : "") + z[v.slice(-1)]).slice(-2)
    })

    return y.replace(/(y+)/g, function (v) {
        return x.getFullYear().toString().slice(-v.length)
    })
}

/**
 * 将签到过程中的结果记录到数据库中
 *
 * @param {class RedisOP} logClient
 * @param {string} userID 形如'user:9876543210'
 * @param {string} msg 消息
 * @param {string} type 操作类型
 */
async function logTaskMsg(logClient, userID, msg, type) {
    let data = {
        timeStamp: Math.round(new Date() / 1000),
        msg: msg,
        type: type
    }
    data = JSON.stringify(data)

    await logClient.pushToList(userID, data)

}


exports.date2str = date2str
exports.logTaskMsg = logTaskMsg