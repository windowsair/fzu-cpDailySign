const axios = require('axios')
const { RedisOP } = require('../redis/redis-operation')

/**
 * Server酱消息推送
 *
 * @param {string} sckey
 * @param {string} title
 * @param {string} msg
 *
 * @return {Promise} 仅resolve. resolve形如{code: 0, msg: 'OK'}的值
 */
async function severChanSend(sckey, title, msg) {
    let data = `text=${title}&desp=${msg}`

    let config = {
        method: 'post',
        url: `https://sc.ftqq.com/${sckey}.send`,
        data: data
    }

    return new Promise(resolve => {
        axios(config)
            .then(response => {
                let state = { code: 0, msg: 'OK' }
                try {
                    const errno = response.data.errno || response.data.code
                    switch (errno) {
                        case 0:
                            break
                        case 1024:
                            state = { code: -1, msg: 'Sever酱的KEY填写错误' }
                            break
                        default:
                            state = { code: -1, msg: response.data.errmsg }
                    }
                } catch (err) {
                    state = { code: -1, msg: '系统错误' }
                }
                resolve(state)
            })
            .catch(error => {
                console.log(error)
                resolve({ code: -1, msg: 'serverChan请求失败,检查KEY是否填写正确' })
            })
    })
}

/**
 * qmsg QQ消息推送
 *
 * @param {string} key
 * @param {string} msg
 * @return {Promise} 仅resolve. resolve形如{code: 0, msg: 'OK'}的值
 */
async function qmsgSend(key, msg) {
    let data = `msg=${msg}`

    let config = {
        method: 'post',
        url: `https://qmsg.zendee.cn/send/${key}`,
        data: data
    }

    return new Promise(resolve => {
        axios(config)
            .then(response => {
                let state = { code: 0, msg: 'OK' }
                try {
                    const errno = response.data.code
                    switch (errno) {
                        case 0:
                            break
                        case 500:
                            state = { code: -1, msg: 'Qmsg的KEY填写错误' }
                            break
                        default:
                            state = { code: -1, msg: response.data.reason }
                    }
                }
                catch (err) {
                    state = { code: -1, msg: '系统错误' }
                }

                resolve(state)
            })
            .catch(error => {
                console.log(error)
                resolve({ code: -1, msg: 'qmsg请求失败,检查KEY是否填写正确' })
            })
    })
}


/**
 * iOS Bark 消息推送
 *
 * @param {string} key
 * @param {string} title
 * @param {string} msg
 */
async function barkSend(key, title, msg) {
    let url = `https://api.day.app/${key}/${title}/${msg}`
    url = encodeURI(url)
    let config = {
        method: 'post',
        url: url,
    }

    return new Promise(resolve => {
        axios(config)
            .then(response => {
                let state = { code: 0, msg: 'OK' }
                try {
                    const errno = response.data.code
                    switch (errno) {
                        case 200:
                            break
                        case 400:
                            state = { code: -1, msg: 'Bark的KEY填写错误' }
                            break
                        default:
                            state = { code: -1, msg: response.data.message }
                    }
                }
                catch (err) {
                    state = { code: -1, msg: '系统错误' }
                }

                resolve(state)
            })
            .catch(error => {
                console.log(error)
                resolve({ code: -1, msg: 'Bark请求失败,检查KEY是否填写正确' })
            })
    })
}

// TODO: 可能需要在此记录操作结果
/**
 *
 * @param {class RedisOP} client
 * @param {object} data 包含userID, type, apiKey, title, content, isTest字段
 * @return {object} 返回形{code: 0, msg: 'OK'}的值
 */
async function notificationSend(client, data) {
    const userID = data.userID

    let noticeLockID = `noticeLock:${userID}`
    let noticeLock = await client.isKeyExists(noticeLockID)
    if (noticeLock) {
        return { code: -1, msg: '请求过于频繁,请一分钟后重试' }
    }

    client.createKeyWithSecTTL(noticeLockID, '0', 60)

    const apiKey = data.apiKey
    let title = ''
    let content = ''
    if (data.isTest === true) {
        title = '测试'
        content = '这是一条测试内容'
    } else {
        title = data.title
        content = data.content
    }


    let result = {}
    switch (data.type) {
        case 'serverChan':
            result = await severChanSend(apiKey, title, content)
            break
        case 'qmsg':
            result = await qmsgSend(apiKey, `${title}:  ${content}`)
            break
        case 'bark':
            result = await barkSend(apiKey, title, content)
            break
        default:
            result = { code: -1, msg: '通知的请求类型不正确' }
    }

    return result

}

/**
 * 获取用户保存的通知方式(考虑弃用)
 *
 * @param {class RedisOP} client
 * @param {string} userID
 */
async function getUserNoticeType(client, userID) {
    let response = { code: 0, msg: 'OK' }


    let result = await client.getValue(`user:${userID}`, 'notification')
    if (result[0] == null) {
        response = { code: 1, msg: '您还未指定通知方式!' }
        return response
    }
    result = JSON.parse(result[0])

    response = { code: 0, msg: 'OK', data: result }
    return response
}


exports.severChanSend = severChanSend
exports.qmsgSend = qmsgSend
exports.notificationSend = notificationSend
//exports.getUserNoticeType = getUserNoticeType
