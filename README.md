<p align="center"><img src="https://user-images.githubusercontent.com/17078589/92328392-069c8080-f093-11ea-82f5-445dad02c1bb.png"/></p>
<h1 align="center">fzu-cpDailySign</h1>

[![node (tag)](https://img.shields.io/node/v/egg.svg?style=flat-square)](https://nodejs.org) [![](https://img.shields.io/badge/license-MIT-green.svg?style=flat-square)](https://github.com/windowsair/fzu-cpDailySign/LICENSE) [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-blue.svg?style=flat-square)](https://github.com/windowsair/fzu-cpDailySign/pulls) [![%e2%9d%a4](https://img.shields.io/badge/made%20with-%e2%9d%a4-ff69b4.svg?style=flat-square)](https://github.com/windowsair/fzu-cpDailySign)

# 介绍
fzu-cpDailySign 是带有基本前后端的今日校园签到测试工具:wink:

> 仅需两步，快速开始签到测试👇

1. 注册后验证手机

![step1](https://user-images.githubusercontent.com/17078589/92498365-1d76da80-f22d-11ea-9ed6-12ba624ebffd.png)


2. 修改通知方式:

![step2](https://user-images.githubusercontent.com/17078589/92497907-890c7800-f22c-11ea-92fa-cb55dfb2c567.png)

# 功能

1. 已经实现的功能
    - [x] 用户注册/登录
    - [x] 手机验证码登录/验证
    - [x] 手动签到
    - [x] 签到测试
    - [x] 可选的签到结果推送 iOS Bark / Server酱 / Qmsg酱
    - [x] 历史打卡结果记录
    - [ ] ...
2. 正在测试中的功能
    - [x] 自动签到


----


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
$ cd frontend
$ npm run serve
```

2. express

```bash
$ cd backend
$ npm run app.js
```

> 相关配置说明

[redis.json](backend/config/redis.json) : 用于配置Redis相关的连接设置，按照文件内的说明进行配置

[vue.config.js](frontend/vue.config.js) : Vue CLI相关配置，待完善


# 部署

## 前端部署

参考Vue-CLI的相关内容: https://cli.vuejs.org/zh/guide/deployment.html

----

## 后端部署

下面给出一种可能的通过pm2进行部署的方法:

```bash
$ pm2 start app.js -i max
```

更多相关的配置，参考:https://pm2.keymetrics.io/docs/usage/pm2-doc-single-page/

----

> 使用其他方式部署时，需要修改定时签到中的相关内容.

# Credits

> Credit to: 
> - https://github.com/ZimoLoveShuang/auto-sign 本项目基于此进行模拟签到测试:grin:


# TODO

1. 检查账户有效性
2. 账户安全性增强
3. 相关信息提示
4. ...

# 许可协议

[MIT](https://github.com/windowsair/fzu-cpDailySign/blob/master/LICENSE)