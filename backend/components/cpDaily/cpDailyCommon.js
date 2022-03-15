const cryptoInfo = {
    'publicDynamicKey':
        '-----BEGIN RSA PUBLIC KEY-----\n' +
        'MIGJAoGBALkvQQORe9z0Okh8OvKFbdd4bad1MiYlKdcxuXkjQWD2AvX8mRxAtpKd\n' +
        'EIC0K2WB07q7Hm1hXB8/NFhVFNJPA30Ox8IlehzMTHSqQRz3Y/8mQGo0l/ucc02d\n' +
        '+M0XICosCnX6gC2M9Pwq/yQurZBaO8/XUAHg3hoN8D9mIQUoCRHJAgMBAAE=\n' +
        '-----END RSA PUBLIC KEY-----', // PKCS1 表示法

    'privateDynamicKey':
        '-----BEGIN PRIVATE KEY-----\n' +
        'MIICdgIBADANBgkqhkiG9w0BAQEFAASCAmAwggJcAgEAAoGBAM358ppVDBFK/0FT\n' +
        'weirKUuRquFlDxOPrEOdqEYWA3pxl4GStbyBHZrUZi3hZHaA9GVOFioHsxBZXyvG\n' +
        'nA6Tl6H1b0Dm0J6OlIsQ/UzSuuOeVtDFepnshm9zZKWNshmWhbVBLLHGYBA9lnzw\n' +
        'lWZRmzM8Q6cZR9V8vbC0iI4cnjGJAgMBAAECgYAuFmc6MR1qISXMMDmLHgE3b3iU\n' +
        'xlABSHx7BKPKStKsaw5DZ9hSPXGqWywhx/T6rxAAOuCqtt5SIi0xVldEy7F5nPYr\n' +
        'iCmw8h08RpT+e7kgKvGqeKD2h5ZqngXh2sVf0bRsAfWeWbBfbfSAGpxsyjgz5hbW\n' +
        'xB+4StGEW0+jmh1AAQJBAOX1ncR+tuI2udqpfsosKN5IXrc2sD7jHh4s65gI6rMD\n' +
        'Qwpqcz5W+gZ6cyfeyo91KU5XQTe6H+n/GhjXQOTXwQECQQDlTROXQ+tgs5kAZVBT\n' +
        'SI0mQb8b5GYbdyVmzmxvmVstdMyacuk1zAj6AjwT6XStQHe7vLBE4SZgJ8ScvXif\n' +
        'P+iJAkBpRNvZJKyxt52y5J5/DGIVB4ocUvOxhiS2aZfb/FD8a8TX0s04v3YrWwi2\n' +
        'Or39mAO1sinPyetsIfSfZIJ3f/EBAkEAgOZAMhNrONQdGVzat8acGjpxXROa1qu2\n' +
        'qcE2sdGKsNXswpIASU6maSxia2scPNx1smKS0FWlBf61Bst4CEWbyQJAZT69Xm1D\n' +
        '4ee8RXxhS3MjSqZ0L3+yg0J6m9C9dfCt6h6mmoL4u01hk1LPby0Nkfw+Ab6TY5x/\n' +
        'QbHI5l5ymh+btw==\n' +
        '-----END PRIVATE KEY-----', // PKCS8 表示法

    // 'dynamicKeyVersion': 'firstv',
    // 'campushoySecret': 'OXoTKvkq',
    // 'dynamicKeyVersion': 'first_v2',
    // 'campushoySecret': 'CCtO7fm4NygoC7yF',
    'dynamicKeyVersion': 'first_v3',
    'campushoySecret': 'PKe4OEPdd7Axs5os',

    // 'catSecret' : 'ytUQ7l2ZZu8mLvJZ', // v2(v1)
    'catSecret' : 'SASEoK4Pa5d4SssO', // v3

    'md5Salt': '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824', // 'hello'

    'verDESKey': [
        'XCE927==', // 0x00
        'ST83=@XV', // 0x01
        'QTZ&A@54', // 0x02
        'hYd6YS4V', // 0x03
        'b3L26XNL', // 0x04
    ]

}

const fzuAuth = {
    'tenantId': 'fzu',
    'login-url':
        'http://id.fzu.edu.cn/authserver/login?service=https%3A%2F%2Ffzu.cpdaily.com%2Fportal%2Flogin',
    'host': 'fzu.campusphere.net'
}

const headerCommon = {
    'SessionToken': '',
    'clientType': 'CPDAILY',
    'User-Agent': 'CampusNext/9.0.19 (iPhone; iOS 13.3.1; Scale/2.00)',
    'deviceType': '2',
    'CpdailyStandAlone': '0',
    'CacheTimeValue': '0',
    'Cache-Control': 'max-age=0',
    'Content-Type': 'application/json; charset=UTF-8',
    'Connection': 'Keep-Alive',
    'Accept-Encoding': 'gzip',

    'CpdailyInfo': '', // 稍后进行构造
    'tenantId': 'fzu',
}

const campusUA = {
    'client': 'CampusNext/9.0.19 (iPhone; iOS 13.3.1; Scale/2.00)',
    'web': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) cpdaily/9.0.19  wisedu/9.0.19'
}


exports.fzuAuth = fzuAuth
exports.headerCommon = headerCommon
exports.cryptoInfo = cryptoInfo
exports.campusUA = campusUA