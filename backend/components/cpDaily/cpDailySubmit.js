const { fzuAuth } = require('./cpDailyCommon')
const { getNewCookie } = require('../cpDaily/cpDailyLogin')
const { doSignRes, getCryptForm } = require('./cpDailyRequest')

const Parameter = require('parameter')
const fs = require("fs")

const formFile = fs.readFileSync('config/formQA.json')
const formQA = JSON.parse(formFile)


const queryTaskCommonHeader = {
    'Accept': 'application/json, text/plain, */*',
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 (4437776896)cpdaily/9.0.19  wisedu/9.0.19',
    'Accept-Encoding': 'gzip,deflate',
    'Accept-Language': 'zh-CN,en-US;q=0.8',
    'Content-Type': 'application/json;charset=UTF-8',

    'Cookie': ''
}


async function querySubmitFormTask(cookie) {
    let data = {
        pageSize: 20,
        pageNumber: 1
    }

    let config = {
        method: 'post',
        url: `https://${fzuAuth.host}/wec-counselor-collector-apps/stu/collector/queryCollectorProcessingList`,
        headers: queryTaskCommonHeader,
        data: data
    }
    config.headers.Cookie = cookie

    return doSignRes(config)
}

// 获取schoolTaskWid
async function getDetailCollector(cookie, collectorWid, instanceWid) {
    let data = {
        collectorWid: collectorWid,
        instanceWid: instanceWid
    }
    let config = {
        method: 'post',
        url: `https://${fzuAuth.host}/wec-counselor-collector-apps/stu/collector/detailCollector`,
        headers: queryTaskCommonHeader,
        data: data
    }
    config.headers.Cookie = cookie

    return doSignRes(config)
}

// 获取具体的填写表格
async function getDetailForm(cookie, formWid, collectorWid, instanceWid) {
    let data = {
        pageSize: 20,
        pageNumber: 1,
        formWid: formWid,
        collectorWid: collectorWid,
        instanceWid: instanceWid,
    }
    let config = {
        method: 'post',
        url: `https://${fzuAuth.host}/wec-counselor-collector-apps/stu/collector/getFormFields`,
        headers: queryTaskCommonHeader,
        data: data
    }
    config.headers.Cookie = cookie

    return doSignRes(config)

}

// 填充表的辅助函数
function fillForm(rawForm, widInfo, locationInfo, address) {
    let form = {
        formWid: widInfo.formWid,
        collectWid: widInfo.collectorWid, // 这里命名比较奇怪
        schoolTaskWid: widInfo.schoolTaskWid,
        instanceWid: widInfo.instanceWid,

        form: rawForm,

        address: '',
        latitude: '',
        longitude: '',

        uaIsCpadaily: true,
    }


    //// FIXME: 特殊行政区的处理
    let [area1, area2, area3] = locationInfo.split('/')
    // 实际上这里的for of用法不太好, 因为迭代的为引用才这样做
    for (let item of form.form) {
        if (item.fieldType == 1) { // 位置类型
            item.value = locationInfo
            item.area1 = area1
            item.area2 = area2
            item.area3 = area3
        }
        else if (item.fieldType == 2) { // 单选类型
            let question = item.title

            let answerSet = null // 备选答案集
            let haveAnswer = false
            let answerObject = null

            // 找到相应的关键词
            for (const [keyWord, value] of Object.entries(formQA.question)) {
                if (question.includes(keyWord)) {
                    answerSet = value
                    break
                }
            }
            if (answerSet == null) {
                console.log(item)
                return { code: 1, msg: '表单项可能已经改变!' }
            }
            // 找出对应的答案
            for (let options of item.fieldItems) {
                let content = options.content
                // 看看这个备选项是不是符合条件了
                for (let QAanswer of formQA.answer[answerSet]) {
                    if (content.includes(QAanswer)) {
                        haveAnswer = true
                        answerObject = options
                        break
                    }
                }
                // 看看是不是匹配的答案
                if (haveAnswer)
                    break
            }

            if (!haveAnswer) {
                console.log(item)
                return { code: 1, msg: '表单项可能已经改变!' }
            }
            // 选择正确选项
            item.fieldItems = [answerObject]
            item.value = answerObject.itemWid
        }
        else if (item.fieldType == 7) { // 完整地址类型
            item.value = locationInfo + '/' + address
        }
        else {
            //// TODO:其他的表单类型暂时不写了
            console.log(item)
            return { code: 1, msg: '表单项可能已经改变!' }
        }
    }

    return { code: 0, msg: 'OK', data: form }
}


async function tryToSubmit(cookie, cpdailyExtension, form) {
    let data = form

    let config = {
        method: 'post',
        url: `https://${fzuAuth.host}/wec-counselor-collector-apps/stu/collector/submitForm`,
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



//// TODO: 相似部分合并

/**
 *
 * @param {string} userID 形如'user:9876543210'
 * @param {class RedisOP} userClient
 * @param {string} loginData 登录数据
 * @param {object} locationInfo 所在地信息 {locationInfo: 'xxx省市区', address:'完整的地址'}
 */
async function formTask(userID, userClient, loginData, locationInfo) {
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
        locationInfo: 'string',
    }

    let validateError1 = parameter.validate(loginRule, loginData)
    let validateError2 = parameter.validate(locationRule, locationInfo)

    if (validateError1 != undefined) {
        return { code: -1, msg: '参数不正确, 请尝试重新验证手机' }
    }
    if (validateError2 != undefined) {
        return { code: -1, msg: '请在详细设置中完善位置信息' }
    }

    const cpDailyInfo = loginData.cpDailyInfo // 可用于重新获取Cookie
    const cpDailyExtension = loginData.cpDailyExtension // 填表
    let loginCookie = loginData.cookie // cookie可按需更新


    // step1: 获取系统中存在的填表任务
    // 如果cookie已经过期,重新获取
    let formSubmitTask = null
    for (let i = 0; i < 2; i++) {
        formSubmitTask = await querySubmitFormTask(loginCookie)
        if (!formSubmitTask || formSubmitTask.datas['WEC-HASLOGIN'] == false) {
            // 在填表任务中似乎不会有`WEC-HASLOGIN`字段

            // 仍然是未登录

            if (i == 1) {
                return { code: -1, msg: '填表失败,原因是登录状态过期' }
            }

            // 可能cookie已经失效,尝试重新获取下
            if (!loginData.tgc) {
                return { code: -1, msg: '系统已更新,请重新登录' }
            }
            let result = await getNewCookie(userID, userClient, cpDailyInfo, loginData)
            if (result.code != 0) {
                return { code: -1, msg: '填表失败,原因是登录状态过期' }
            }
            loginCookie = result.data
            continue
        }
        if (formSubmitTask.datas.rows.length == 0) {
            return { code: 1, msg: '辅导员暂时未发布填表任务' }
        }
        break
    }


    // 获取第一项填表任务
    const { wid, formWid, instanceWid } = formSubmitTask.datas.rows[0]
    const collectorWid = wid


    // step2: 获取schoolTaskWid
    let getSchoolTaskWidResult = await getDetailCollector(loginCookie, collectorWid, instanceWid)
    if (!getSchoolTaskWidResult) {
        return { code: -1, msg: '系统出错' }
    }

    const schoolTaskWid = getSchoolTaskWidResult.datas.collector.schoolTaskWid

    // step3: 获取填表任务的待填写选项

    let detailFormResult = await getDetailForm(loginCookie, formWid, collectorWid, instanceWid)
    if (!detailFormResult) {
        return { code: -1, msg: '系统出错' }
    }
    if (detailFormResult.code != 0) {
        return { code: -2, msg: detailFormResult.message }
    }
    if (!detailFormResult.datas.existData) {
        return { code: -3, msg: '获取不到填表的表单' }
    }

    // step4: 填充选项
    let rawForm = detailFormResult.datas.rows

    const widInfo = {
        collectorWid: collectorWid,
        formWid: formWid,
        schoolTaskWid: schoolTaskWid,
        instanceWid: instanceWid,
    }

    let formFillResult = fillForm(rawForm, widInfo, locationInfo.locationInfo, locationInfo.address)

    if (formFillResult.code != 0) {
        return { code: formFillResult.code, msg: formFillResult.msg }
    }

    const formData = getCryptForm(formFillResult.data, loginData.cpDailyInfo, { lat: 0.0, lon: 0.0 })

    let submitResult = await tryToSubmit(loginCookie, cpDailyExtension, formData)
    if (!submitResult) {
        return { code: -1, msg: '填表失败,系统出错' }
    }

    if (submitResult.message != 'SUCCESS') {
        return { code: 3, msg: `填表失败,${submitResult.message}` }
    }

    return { code: 0, msg: 'OK' }

}

exports.formTask = formTask
