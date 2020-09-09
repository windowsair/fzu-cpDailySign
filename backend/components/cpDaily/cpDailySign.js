const { fzuAuth } = require('./cpDailyCommon')
const axios = require('axios')


async function getUnsignedTasks(cookie) {
    let data = {}

    let config = {
        method: 'post',
        url: `https://${fzuAuth.host}/wec-counselor-sign-apps/stu/sign/getStuSignInfosInOneDay`,
        headers: {
            'Connection': 'keep-alive',
            'Accept': 'application/json, text/plain, */*',
            'X-Requested-With': 'XMLHttpRequest',
            'User-Agent': 'Mozilla/5.0 (Linux; Android 4.4.4; PCRT00 Build/KTU84P) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/33.0.0.0 Safari/537.36 cpdaily/8.0.8 wisedu/8.0.8',
            'Content-Type': 'application/json',
            'Accept-Encoding': 'gzip,deflate',
            'Accept-Language': 'zh-CN,en-US;q=0.8',

            'Host': fzuAuth.host,
            'Origin': `https://${fzuAuth.host}`,
            'Cookie': cookie
        },
        data: data
    }


    return new Promise(resolve => {
        axios(config)
            .then(response => {
                if (typeof response.data != 'object') {
                    resolve(null)
                }
                else {
                    resolve(response.data)
                }
            })
            .catch(error => {
                console.log(error)
                resolve(null)
            })
    })
}

async function getDetailTask(cookie, task) {
    let data = task

    let config = {
        method: 'post',
        url: `https://${fzuAuth.host}/wec-counselor-sign-apps/stu/sign/detailSignInstance`,
        headers: {
            'Accept': 'application/json, text/plain, */*',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.97 Safari/537.36',
            'content-type': 'application/json',
            'Accept-Encoding': 'gzip,deflate',
            'Accept-Language': 'zh-CN,en-US;q=0.8',
            'Content-Type': 'application/json;charset=UTF-8',

            'Cookie': cookie
        },
        data: data
    }


    return new Promise(resolve => {
        axios(config)
            .then(response => {
                if (typeof response.data != 'object') {
                    resolve(null)
                }
                else {
                    resolve(response.data)
                }
            })
            .catch(error => {
                console.log(error)
                resolve(null)
            })
    })
}

function signFormFill(task) {
    let form = {
        signPhotoUrl: '', // 福大不需要默认的照片
        signInstanceWid: task.signInstanceWid,
        isMalposition: task.isMalposition,

        longitude: 119.204299, // 福大的经纬度
        latitude: 26.064609,


        abnormalReason: '', // 不在签到范围的反馈原因,可以不填
        position: '中国福建省福州市闽侯县源江路' // 注意位置的填写
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
        url: `https://${fzuAuth.host}/wec-counselor-sign-apps/stu/sign/submitSign`,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 4.4.4; OPPO R11 Plus Build/KTU84P) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/33.0.0.0 Safari/537.36 okhttp/3.12.4',
            'CpdailyStandAlone': '0',
            'extension': '1',
            'Content-Type': 'application/json; charset=utf-8',
            'Accept-Encoding': 'gzip',
            'Connection': 'Keep-Alive',

            'Cpdaily-Extension': cpDailyInfo,
            'Cookie': cookie
        },
        data: data
    }


    return new Promise(resolve => {
        axios(config)
            .then(response => {
                if (typeof response.data != 'object') {
                    resolve(null)
                }
                else {
                    resolve(response.data)
                }
            })
            .catch(error => {
                console.log(error)
                resolve(null)
            })
    })
}


async function signTask(cookie, cpDailyInfo) {
    // step1: 获取系统中存在的签到任务
    let unsignedTaskResult = await getUnsignedTasks(cookie)
    if (!unsignedTaskResult) {
        return { code: -1, msg: '签到失败,原因是系统出错' }
    }
    if(unsignedTaskResult.datas['WEC-HASLOGIN'] == false){
        return { code: -1, msg: '签到失败,原因是登录状态过期'}
    }
    else if (unsignedTaskResult.datas.unSignedTasks.length < 1) {
        return { code: 1, msg: '暂未发布签到任务' }
    }

    // step2: 获取具体的签到任务
    // 最新一次的, 时间还没开始的也可以获取到
    const lastTask = unsignedTaskResult.datas.unSignedTasks[0] 
    const lastTaskField = {
        signInstanceWid: lastTask.signInstanceWid,
        signWid: lastTask.signWid
    }

    let detailTaskResult = await getDetailTask(cookie, lastTaskField)
    if (!detailTaskResult) {
        return { code: -1, msg: '签到失败,原因是系统出错' }
    }

    const detailTask = detailTaskResult.datas

    let form = signFormFill(detailTask)
    if (form.code != 0) {
        return { code: 2, msg: form.msg }
    }


    let signResult = await tryToSign(cookie, cpDailyInfo, form.data)
    if (!signResult) {
        return { code: -1, msg: '签到失败,原因是系统出错' }
    }

    if (signResult.message != 'SUCCESS') {
        return { code: 3, msg: `签到失败,原因是${signResult.message}` }
    }
    
    return { code: 0, msg: 'OK' }


}


exports.signTask = signTask