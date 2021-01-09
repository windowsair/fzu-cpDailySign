/**
 * 暂时用不上,这个是填表的项目
 */


const { fzuAuth } = require('./cpDailyCommon')
const axios = require('axios')

const queryTaskCommonHeader = {
    'Accept': 'application/json, text/plain, */*',
    'User-Agent': 'Mozilla/5.0 (Linux; Android 4.4.4; OPPO R11 Plus Build/KTU84P) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/33.0.0.0 Safari/537.36 yiban/8.1.11 cpdaily/8.1.11 wisedu/8.1.11',
    'content-type': 'application/json',
    'Accept-Encoding': 'gzip,deflate',
    'Accept-Language': 'zh-CN,en-US;q=0.8',
    'Content-Type': 'application/json;charset=UTF-8',

    'Cookie': ''
}



async function querySubmitFormTask(cookie) {
    // let data = {
    //     sessionToken: 'a98f7a9d-4a28-46a6-8c2c-86ae33608a10'
    //
    let data = {
        pageSize: 6,
        pageNumber: 1
    }


    let config = {
        method: 'post',
        url: `https://${fzuAuth.host}/wec-counselor-collector-apps/stu/collector/queryCollectorProcessingList`,
        headers: queryTaskCommonHeader,
        data: data
    }
    config.headers.Cookie = cookie


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


async function getDetailCollector(cookie, collectorWid) {
    let data = {
        collectorWid: collectorWid,
    }
    let config = {
        method: 'post',
        url: `https://${host}/wec-counselor-collector-apps/stu/collector/detailCollector`,
        headers: {
            'Accept': 'application/json, text/plain, */*',
            'User-Agent': 'Mozilla/5.0 (Linux; Android 4.4.4; OPPO R11 Plus Build/KTU84P) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/33.0.0.0 Safari/537.36 yiban/8.1.11 cpdaily/8.1.11 wisedu/8.1.11',
            'content-type': 'application/json',
            'Accept-Encoding': 'gzip,deflate',
            'Accept-Language': 'zh-CN,en-US;q=0.8',
            'Content-Type': 'application/json;charset=UTF-8',
            //// TODO: 这里的cookie需要替换掉
            'Cookie': ''
        },
        data: data
    }
    config.headers.Cookie = cookie


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

// 获取具体的填写表格
async function getForm(cookie){

}

async function queryForm(cookie) {
    // step1: 获取总表

    let formSubmitTask = await querySubmitFormTask(cookie)
    if (!formSubmitTask) {
        return { code: -1, msg: '系统出错' }
    }
    if (formSubmitTask.datas.rows < 0) {
        return { code: 1, msg: '辅导员暂时未发布填表任务' }
    }

    // 获取第一项填表任务
    const collectWid = formSubmitTask.datas.rows[0].wid
    const formWid = formSubmitTask.datas.rows[0].formWid

    // step2: 获取schoolTaskWid
    let getSchoolTaskWidResult = await getDetailCollector(cookie, collectorWid)
    if (!getSchoolTaskWidResult) {
        return { code: -1, msg: '系统出错' }
    }

    const schoolTaskWid = getSchoolTaskWidResult.datas.collector.schoolTaskWid

    // step3: 获取具体的表单项目
}


exports.querySubmitFormTask = querySubmitFormTask // temp