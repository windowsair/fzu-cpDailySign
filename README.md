<p align="center"><img src="https://user-images.githubusercontent.com/17078589/92328392-069c8080-f093-11ea-82f5-445dad02c1bb.png"/></p>
<h1 align="center">fzu-cpDailySign</h1>

[![node (tag)](https://img.shields.io/node/v/egg.svg?style=flat-square)](https://nodejs.org) [![](https://img.shields.io/badge/license-MIT-green.svg?style=flat-square)](https://github.com/windowsair/fzu-cpDailySign/LICENSE) [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-blue.svg?style=flat-square)](https://github.com/windowsair/fzu-cpDailySign/pulls) [![%e2%9d%a4](https://img.shields.io/badge/made%20with-%e2%9d%a4-ff69b4.svg?style=flat-square)](https://github.com/windowsair/fzu-cpDailySign)

# 介绍
fzu-cpDailySign 是带有基本前后端的今日校园签到测试工具:wink:

# 功能

> 本项目仍在开发中，尚未用于生产.

1. 已经实现的功能
    - [x] 用户注册/登录
    - [x] 手机验证码登录/验证
    - [x] 手动的签到功能
    - [ ] 自动的签到功能
    - [ ] 可选的签到结果推送 iOS Bark / Server酱 / Qmsg酱
    - [ ] 历史打卡结果记录
    - [ ] ...
    
# 开发

## 安装

前端采用[Vue-Cli](https://cli.vuejs.org), 后端采用[Express](https://expressjs.com), 仍在完善中

```bash
# for backend, frontend...
$ git clone && npm install
```

此外,还需要一个[Redis](https://redis.io)进行相关数据的存储

## 开发环境运行


1. Vue

```bash
$ npm run serve
```

2. express

```bash
$ npm run app.js
```

> 相关配置说明

[redis.json](backend/config/redis.json) : 用于配置Redis相关的连接设置，按照文件内的说明进行配置

[vue.config.js](frontend/vue.config.js) : Vue Cli相关配置，待完善


# 部署



# Credits

> Credit to: 
> - https://github.com/ZimoLoveShuang/auto-sign 本项目基于此进行模拟签到测试:grin:


# TODO

开发中...

# 许可协议

[MIT](https://github.com/windowsair/fzu-cpDailySign/blob/master/LICENSE)