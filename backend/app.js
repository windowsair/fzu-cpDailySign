// 缓存DNS请求
var dns = require('dns'),
    dnscache = require('dnscache')({
        "enable": true,
        "ttl": 300,
        "cachesize": 1000
    })
dnscache.lookup('fzu.cpdaily.com', (err, result) => { })
dnscache.lookup('fzu.campusphere.net', (err, result) => { })
dnscache.lookup('mobile.campushoy.com', (err, result) => { })
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

const { notificationSend } = require('./components/notification/notification')
const { judgeTimeRange, getUserSignLog, cronCpDailyTask, systemNotice, mainCpDailyTask, getTaskStatus, deleteSuccessLog } = require('./components/utils/utils')


const fs = require("fs")

const redisFile = fs.readFileSync('config/redis.json')
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

        // if (!tgcData.length) {
        //     response = { code: 4, msg: 'tgc获取失败!' }
        //     res.send(response)
        // }

        // step3: 获取Cookie
        let cookie = await loginGetCookie(cpDailyInfo, loginData)
        const maxAge = 2592000

        try {
            if (cookie['set-cookie'].length < 1) {
                response = { code: 3, msg: 'Cookie获取失败!' }
                res.send(response)
                return
            }
            else {
                let tmp = ''
                cookie['set-cookie'].forEach(e => {
                    tmp += e.split(';')[0] + ';'
                })
                if (tmp.indexOf('MOD') == -1) {
                    return { code: 3, msg: 'MOD_CAS获取失败!' }
                }
                cookie = tmp
            }
        } catch (error) {
            console.log('acw_tc 获取失败')
            response = { code: 3, msg: 'acw_tc 获取失败!' }
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
        apiKey: { type: 'string', max: 100, allowEmpty: true },
        type: ['serverChan', 'qmsg', 'bark', 'none']
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

    let client = new RedisOP(redisUserClient)

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

        let logClient = new RedisOP(redisLogClient)
        let testResult = await notificationSend(logClient, data)

        if (testResult.code != 0) {
            res.send(testResult)
            return
        }

        await client.setValue(userID, notificationSetting)

        res.send(response)

    }

    async function clearNotice() {
        await client.delValue(userID, 'notification')
        res.send(response)
    }

    if (req.body.type != 'none') {
        mainTask()
    } else {
        clearNotice()
    }


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

    let userClient = new RedisOP(redisUserClient)
    let logClient = new RedisOP(redisLogClient)

    async function mainTask() {
        let allTask = await getTaskStatus(userID, userClient, logClient)
        let taskResult = await mainCpDailyTask(userID, userClient, logClient, allTask)
        if (taskResult.code != 0) {
            response = {
                code: 4,
                msg: taskResult.msg
            }
        }
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


app.post('/api/getRemoteSetting', (req, res) => {
    let response = { code: 0, msg: 'ok', data: {} }
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


    const userID = 'user:' + req.session.studentID
    const userSetting = ['formTaskEnable', 'signTaskEnable', 'passTaskEnable']
    let client = new RedisOP(redisUserClient)

    client.getValue(userID, userSetting).then((result) => {
        response.data.formTaskEnable = result[0]
        response.data.signTaskEnable = result[1]
        response.data.passTaskEnable = result[2]
        res.send(response)
    }).catch(err => {
        console.log(err)
        response = { code: 5, msg: '系统错误' }
        res.send(response)
        return
    })
})

app.post('/api/taskSetting', (req, res) => {
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

    const convertToBoolean = (value) => {
        return JSON.parse(value)
    }

    const rule = {
        formTaskEnable: { type: 'bool', convertType: convertToBoolean },
        signTaskEnable: { type: 'bool', convertType: convertToBoolean },
        passTaskEnable: { type: 'bool', convertType: convertToBoolean },
        locationInfo: { type: 'string', allowEmpty: true },
        address: { type: 'string', allowEmpty: true },
        lat: { type: 'number', convertType: 'number' },
        lon: { type: 'number', convertType: 'number' },
    }

    let errors = parameter.validate(rule, req.body)

    if (errors != undefined) {
        response.code = 1
        response.msg = '参数不正确'
        res.send(response)
        return
    }

    // 实际上有更多的非正常情况
    // 正常从前端发起的请求不会出现这些情况,因此这里不管
    const { formTaskEnable, signTaskEnable, passTaskEnable, locationInfo, address, lat, lon } = req.body
    let userSetting = { formTaskEnable, signTaskEnable, passTaskEnable }

    if (locationInfo.length && locationInfo.split('/').length == 3) {
        userSetting.locationInfo = locationInfo // 位置由省市区构成
    }
    if (address.length) {
        userSetting.address = address
    }
    if (lat >= 0 && lon >= 0) {
        userSetting.lat = lat
        userSetting.lon = lon
    }

    // 数据库操作
    const userID = 'user:' + req.session.studentID
    let client = new RedisOP(redisUserClient)

    client.setValue(userID, userSetting).then((value) => {
        res.send(response)
    }).catch(err => {
        console.log(err)
        response = { code: 5, msg: '系统错误' }
        res.send(response)
        return
    })
})


/**
 * 简单验证码模块
 */
app.get('/api/captcha.jpg', captcha.image())



// 定时任务

// 5-7点每25分钟执行一次
var job1 = new CronJob('*/30 6-12 * * *', function () {
    let userClient = new RedisOP(redisUserClient)
    let logClient = new RedisOP(redisLogClient)
    cronCpDailyTask(userClient, logClient, 60 * 60 * 12) // 12小时过期
}, null, true, 'Asia/Shanghai')


// 0点1分 重置成功字段
var clearJob1 = new CronJob('1 0 * * *', function () {
    let logClient = new RedisOP(redisLogClient)
    deleteSuccessLog(logClient)
}, null, true, 'Asia/Shanghai')

