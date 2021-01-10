// 缓存DNS请求
var dns = require('dns'),
    dnscache = require('dnscache')({
        "enable": true,
        "ttl": 300,
        "cachesize": 1000
    })
dnscache.lookup('fzu.cpdaily.com', (err, result) => { })
dnscache.lookup('fzu.campusphere.net', (err, result) => { })
dnscache.lookup('id.fzu.edu.cn', (err, result) => { })
dnscache.lookup('www.cpdaily.com', (err, result) => { })
dnscache.lookup('sc.ftqq.com', (err, result) => { })
dnscache.lookup('qmsg.zendee.cn', (err, result) => { })
dnscache.lookup('api.day.app', (err, result) => { })


const express = require('express')
const cors = require('cors')
const session = require('express-session')


const redis = require('redis')
const redisStore = require('connect-redis')(session)
const { RedisOP } = require('./components/redis/redis-operation')


const bodyParser = require('body-parser')
const Parameter = require('parameter')


const { getCpDailyInfo, getMessageCode, verifyMessageCode, verifyUserLogin, loginGetCookie, getCpdailyExtension } = require('./components/cpDaily/cpDailyLogin')
const { signTask } = require('./components/cpDaily/cpDailySign')

const { notificationSend, getUserNoticeType } = require('./components/notification/notification')
const { judgeTimeRange, logSignMsg, getUserSignLog, cronSignTask, systemNotice } = require('./components/utils/utils')
const {querySubmitFormTask} = require('./components/cpDaily/cpDailySubmit')


const fs = require("fs")

const redisFile = fs.readFileSync('./config/redis.json')
const redisSetting = JSON.parse(redisFile)


const CronJob = require('cron').CronJob;
require('console-stamp')(console, { pattern: 'yyyy/mm/dd HH:MM:ss' })

const app = express()


// step2: 配置应用

let redisSessionClient = redis.createClient(redisSetting["redis-session-setting"])
global.redisUserClient = redis.createClient(redisSetting["redis-user-setting"])
let redisUserClient = global.redisUserClient
let redisLogClient = redis.createClient(redisSetting["redis-log-setting"])

app.use(
    session({
        name: "sid",
        secret: redisSetting["session-secrect"],
        cookie: {
            maxAge: 14 * 24 * 60 * 60 * 1000,
            signed: true
        },
        resave: true,
        saveUninitialized: false,
        store: new redisStore({
            client: redisSessionClient
        })
    })
)

app.use(bodyParser.urlencoded({ extended: false }))


const captcha = require('svg-captcha-express').create({
    cookie: 'captcha',
    background: 'rgb(255,200,150)',
    fontSize: 60,
    width: 130,
    height: 45,
    charPreset: 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz123456789',
    size: 5,
    noise: 5,
    size: 4,
    color: true
})


const corsConfig = {
    origin: true,
    credentials: true
}
app.use(cors(corsConfig))
app.options('*', cors(corsConfig))


// 监听端口
let runningPort = 23340
app.listen(runningPort, () => {
    console.log(`server running at port ${runningPort}`)
})

app.post('/api/logout', (req, res) => {
    let response = { code: 0, msg: 'ok' }
    try {
        if (req.session.login === true) {
            req.session = null
        }
        else {
            response = { code: -1, msg: '您还未登录!' }
        }
    } catch (error) {
        response = { code: -1, msg: '您还未登录!' }
    }

    res.send(response)
})

app.post('/api/login', (req, res) => {

    let response = { code: 0, msg: 'ok' }

    let parameter = new Parameter({
        validateRoot: true,
    })

    const rule = {
        studentID: { type: 'string', min: 8, max: 11 },
        phone: { type: 'string', min: 8, max: 11 },
        cap: { type: 'string', min: 1, max: 5 },
    }

    let errors = parameter.validate(rule, req.body)

    if (errors != undefined) {
        response.code = 1
        response.msg = '参数不正确'
        res.send(response)
        return
    }

    let result = false
    try {
        result = captcha.check(req, req.body.cap, false)
    } catch (err) {
        if (err.name == 'TypeError' && req.body.cap == undefined) {
            response = { code: 2, msg: '表单项错误' }
        }
        else {
            response = { code: 3, msg: '验证码错误' }
        }
        res.send(response)
        return
    }
    if (result != true) {
        response = { code: 3, msg: '验证码错误' }
        res.send(response)
        return
    }




    if (response.code == 0) {
        req.session.login = true
        req.session.studentID = req.body.studentID
        req.session.phone = req.body.phone
    }


    // 数据库操作
    let client = new RedisOP(redisUserClient)
    let userInfo = { phone: req.body.phone, validate: '0' }
    // validate 0 => 未验证 1 => 已发送短信 2 => 已验证
    let userID = 'user:' + req.body.studentID

    //// 检查数据库中是否存在对应的值=> 不存在,先发送短信,再添加

    client.isKeyExists(userID)
        .then(isExists => {
            if (isExists) {
                client.getValue(userID, 'validate').then(validate => {
                    switch (Number(validate[0])) {
                        case 0: // 此时还未验证成功,可以随意修改(setValue即可)
                            client.setValue(userID, userInfo).then(value => {
                                res.send(response)
                            })
                            break
                        case 1: // 暂时保留用途
                            client.setValue(userID, userInfo).then(value => {
                                res.send(response)
                            })
                            break
                        case 2:
                            let phone = req.body.phone
                            // 已经验证成功, 需要验证手机号码是否匹配
                            client.getValue(userID, 'phone').then(value => {
                                if (value[0] != phone)
                                    response = { code: 4, msg: '手机号不正确!' }
                                res.send(response)
                            })
                            break
                        default:
                            break
                    }
                })
            }
            else {
                // 新建一个用户
                client.setValue(userID, userInfo).then(value => {
                    res.send(response)
                })
            }
        }).catch(err => {
            response = { code: 5, msg: '系统错误' }
            res.send(response)
        })

})


app.post('/api/userInfo', (req, res) => {
    let response = { code: -1, msg: '您还未登录!' }
    try {
        if (req.session.login === true) {
            response = { code: 0, msg: 'OK', studentID: req.session.studentID }
        }

    } catch (error) { }
    res.send(response)

})


app.post('/api/verifyPhone', (req, res) => {
    let response = { code: 0, msg: 'ok' }

    try {
        if (req.session.login != true) {
            response = { code: -1, msg: '您还未登录!' }
            res.send(response)
            return
        }
    } catch (error) {
        response = { code: -1, msg: '您还未登录!' }
        res.send(response)
        return
    }

    let parameter = new Parameter({
        validateRoot: true,
    })

    const rule = {
        studentID: { type: 'string', min: 8, max: 11 },
        phone: { type: 'string', min: 8, max: 11 },
    }

    let errors = parameter.validate(rule, req.body)

    if (errors != undefined) {
        response = { code: 1, msg: '参数不正确' }
        res.send(response)
        return
    }

    if (req.session.studentID != req.body.studentID) {
        response = { code: 2, msg: '账户不正确' }
        res.send(response)
        return
    }

    // 之后在session中读取
    req.session.phone = req.body.phone


    let username = req.body.studentID
    let phone = req.body.phone


    // 先获取今日校园的基本信息
    let cpDailyInfo = getCpDailyInfo(username)
    req.session.cpDailyInfo = cpDailyInfo // 暂时保存,等验证成功了再写入数据库

    getMessageCode(cpDailyInfo, phone)
        .then(value => {
            if (value == null) {
                response = { code: -1, msg: '系统出错' }
            }
            try {
                if (value.errMsg != null) {
                    response = { code: 2, msg: value.errMsg }
                }
            }
            catch {
                response = { code: -1, msg: '系统出错' }
            }

            res.send(response)
            return
        })
})


// 验证验证码并进行登录
app.post('/api/verifyMsgCode', (req, res) => {
    let response = { code: 0, msg: 'ok' }

    try {
        if (req.session.login != true) {
            response = { code: -1, msg: '您还未登录!' }
            res.send(response)
            return
        }
    } catch (error) {
        response = { code: -1, msg: '您还未登录!' }
        res.send(response)
        return
    }


    const cpDailyInfo = req.session.cpDailyInfo

    async function mainTask(phone, msgCode) {

        let verifyHelper = (step, data) => {
            if (!data) {
                response = { code: -1, msg: step + '系统出错' }
                res.send(response)
                return false
            }
            try {
                if (data.errMsg != null) {
                    response = { code: 2, msg: step + data.errMsg }
                    res.send(response)
                    return false
                }
            } catch (error) {
                response = { code: -1, msg: step + '系统出错' }
                res.send(response)
                return fasle
            }
            return true
        }

        // step1: 进行验证码的验证
        let verifyResult = await verifyMessageCode(cpDailyInfo, phone, msgCode)

        let result = verifyHelper('在验证验证码阶段,', verifyResult)
        if (!result) {
            return
        }



        /////////////////////////////////////////////////////////
        // // step2: 进行登录验证
        // const sessionData = verifyResult.data
        // let loginResult = await verifyUserLogin(cpDailyInfo, sessionData)

        // result = verifyHelper('在登录验证阶段', loginResult)
        // if (!result) {
        //     return
        // }
        // const loginData = loginResult.data
        // const tgcData = loginData.tgc // 注意这里
        /////////////////////////////////////////////////////////


        const tgcData = verifyResult.data.tgc
        const loginData = {
            tgc: verifyResult.data.tgc,
            sessionToken: verifyResult.data.sessionToken
        }

        // step3: 获取Cookie
        let cookie = await loginGetCookie(cpDailyInfo, loginData)
        const maxAge = 2592000

        try {
            if (cookie['set-cookie'].length < 2) {
                response = { code: 3, msg: 'Cookie获取失败!' }
                res.send(response)
                return
            }
            else {
                let tmp = ''
                cookie['set-cookie'].forEach(e => {
                    tmp += e.split(';')[0] + ';'
                })
                cookie = tmp
            }
        } catch (error) {
            console.log('acw_tc 获取失败')
            response = { code: 3, msg: 'Cookie获取失败!' }
            res.send(response)
            return
        }

        let cpdailyExtension = getCpdailyExtension(cpDailyInfo)

        // step4: 记录登录数据
        const userLoginData = {
            sessionToken: loginData.sessionToken,
            cpDailyInfo: cpDailyInfo,
            tgc: tgcData,
            cookie: cookie,
            cpDailyExtension: cpdailyExtension
        }
        const redisUserLoginData = {
            loginData: JSON.stringify(userLoginData),
            expires: maxAge + Math.round(new Date() / 1000),
            validate: 2 // 修改验证状态
        }

        const userID = 'user:' + req.session.studentID

        let client = new RedisOP(redisUserClient)
        client.setValue(userID, redisUserLoginData).then((value) => {
            res.send(response)
        }).catch(err => {
            console.log(err)
            response = { code: 5, msg: '系统错误' }
            res.send(response)
            return
        })

    }

    mainTask(req.body.phone, req.body.cap)



})

// 测试用的,线上block掉
app.get('/good', (req, res) => {
    let response = { code: 0, msg: 'OK' }
    async function mainTask() {
    }

    mainTask()

})

app.post('/api/changeNotice', (req, res) => {
    let response = { code: 0, msg: 'ok' }
    try {
        if (req.session.login != true) {
            response = { code: -1, msg: '您还未登录!' }
            res.send(response)
            return
        }
    } catch (error) {
        response = { code: -1, msg: '您还未登录!' }
        res.send(response)
        return
    }

    let parameter = new Parameter({
        validateRoot: true,
    })

    const rule = {
        studentID: { type: 'string', min: 8, max: 11 },
        apiKey: { type: 'string', min: 8 },
        type: ['serverChan', 'qmsg', 'bark']
    }

    let errors = parameter.validate(rule, req.body)

    if (errors != undefined) {
        response.code = 1
        response.msg = '参数不正确'
        res.send(response)
        return
    }


    if (req.session.studentID != req.body.studentID) {
        response = { code: 2, msg: '账户不正确' }
        res.send(response)
        return
    }

    let userID = 'user:' + req.body.studentID

    async function mainTask() {
        const notification = {
            type: req.body.type,
            apiKey: req.body.apiKey
        }

        const notificationSetting = {
            notification: JSON.stringify(notification)
        }

        const data = {
            userID: userID,
            type: notification.type,
            apiKey: notification.apiKey,
            isTest: true
        }
        let testResult = await notificationSend(redisLogClient, data)

        if (testResult.code != 0) {
            res.send(testResult)
            return
        }

        let client = new RedisOP(redisUserClient)
        await client.setValue(userID, notificationSetting)

        res.send(response)

    }

    mainTask()


})

app.post('/api/testSign', (req, res) => {
    let response = { code: 0, msg: 'ok' }
    try {
        if (req.session.login != true) {
            response = { code: -1, msg: '您还未登录!' }
            res.send(response)
            return
        }
    } catch (error) {
        response = { code: -1, msg: '您还未登录!' }
        res.send(response)
        return
    }

    let parameter = new Parameter({
        validateRoot: true,
    })

    const rule = {
        studentID: { type: 'string', min: 8, max: 11 },
        phone: { type: 'string', min: 8, max: 11 },
    }

    let errors = parameter.validate(rule, req.body)

    if (errors != undefined) {
        response.code = 1
        response.msg = '参数不正确'
        res.send(response)
        return
    }


    if (req.session.studentID != req.body.studentID || req.session.phone != req.body.phone) {
        response = { code: 2, msg: '学号/手机号不正确' }
        res.send(response)
        return
    }

    // 验证时间
    if (judgeTimeRange() == false) {
        response = { code: 3, msg: '当前不在打卡的时间范围内' }
        res.send(response)
        return
    }

    let userID = 'user:' + req.body.studentID

    async function mainTask() {
        // step1 : 查找登录信息
        let client = new RedisOP(redisUserClient)
        let loginData = await client.getValue(userID, 'loginData')
        if (loginData[0] == null) {
            response = { code: 4, msg: '您还未验证手机号!' }
            res.send(response)
            return
        } else {
            loginData = JSON.parse(loginData[0])
        }

        // step2: 进行打卡测试


        let signTaskResult = await signTask(userID, loginData)
        if (signTaskResult.code != 0) {
            logSignMsg(redisLogClient, userID, signTaskResult.msg, 'error')
            res.send(signTaskResult)
            return
        }

        // 失败了不发送通知

        // step3: 发送打卡通知
        let userNotice = await getUserNoticeType(redisUserClient, userID)
        if (userNotice.code != 0) {
            logSignMsg(redisLogClient, userID, '打卡成功,未设置通知方式', 'warning')
            response = { code: 1024, msg: '打卡成功,未设置通知方式' }
            res.send(response)
            return
        }


        const data = {
            userID: userID,
            type: userNotice.type,
            apiKey: userNotice.apiKey,
            isTest: false
        }
        let testResult = await notificationSend(redisLogClient, data)

        if (testResult.code != 0) {
            logSignMsg(redisLogClient, userID, '打卡成功,通知失败,原因是' + testResult.msg, 'warning')
            res.send(testResult)
            return
        }

        logSignMsg(redisLogClient, userID, '打卡成功', 'success')
        res.send(response)

    }

    mainTask()

})


app.post('/api/getSignLog', (req, res) => {
    let response = { code: 0, msg: 'ok' }
    try {
        if (req.session.login != true) {
            response = { code: -1, msg: '您还未登录!' }
            res.send(response)
            return
        }
    } catch (error) {
        response = { code: -1, msg: '您还未登录!' }
        res.send(response)
        return
    }

    let parameter = new Parameter({
        validateRoot: true,
    })

    const rule = {
        studentID: { type: 'string', min: 8, max: 11 },
    }

    let errors = parameter.validate(rule, req.body)

    if (errors != undefined) {
        response.code = 1
        response.msg = '参数不正确'
        res.send(response)
        return
    }


    if (req.session.studentID != req.body.studentID) {
        response = { code: 2, msg: '学号不正确' }
        res.send(response)
        return
    }

    let userID = 'user:' + req.body.studentID
    async function mainTask() {
        let logData = await getUserSignLog(redisLogClient, userID)
        if (logData.length == 0) {
            response = { code: 1025, msg: '暂无数据' }
        } else {
            response.data = logData
        }

        res.send(response)
    }

    mainTask()

})


/**
 * 简单验证码模块
 */
app.get('/api/captcha.jpg', captcha.image())



// 定时任务

// 5-7点每25分钟执行一次
var job1 = new CronJob('*/30 6-9 * * *', function () {
    cronSignTask(redisUserClient, redisLogClient)
}, null, true)

