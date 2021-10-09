<template>
  <div class="system-menu">
    <el-row class="menu-btn">
      <el-button type="primary" round @click="showDialogPhone" style="margin-right: 10px">
        验证手机
        <i class="el-icon-phone el-icon--right"></i>
      </el-button>

      <el-button type="info" round @click="showDialogNotification" style="margin-left: 10px">
        通知方式
        <i class="el-icon-message el-icon--right"></i>
      </el-button>
    </el-row>

    <el-row class="menu-btn">
      <el-button type="success" round style="margin-right: 10px" @click="testSign">
        测试打卡
        <i class="el-icon-check el-icon--right"></i>
      </el-button>

      <el-button type="info" round style="margin-left: 10px" @click="getTaskSetting">
        打卡设置
        <i class="el-icon-setting el-icon--right"></i>
      </el-button>
    </el-row>

    <el-row class="menu-btn">

      <el-button type="warning" round style="margin-right: 10px" @click="getHistoryLog">
        历史记录
        <i class="el-icon-s-promotion el-icon--right"></i>
      </el-button>

      <el-popconfirm
        confirmButtonText="是的"
        cancelButtonText="取消"
        icon="el-icon-info"
        iconColor="red"
        title="确定要退出登录吗?"
        @onConfirm="logOut()"
      >
        <el-button type="danger" slot="reference" round style="margin-left: 10px">
          退出登录
          <i class="el-icon-switch-button el-icon--right"></i>
        </el-button>
      </el-popconfirm>
    </el-row>

    <verifyPhone ref="verifyPhone" />
    <notification ref="notification" />
    <historyLog ref="historyLog" :gridData="gridData" />
    <signTaskSetting ref="signTaskSetting" :autoTaskStatus.sync="autoTaskStatus" />
  </div>
</template>

<script>
import { Message } from 'element-ui'

import verifyPhone from './verifyPhone.vue'
import notification from './notification.vue'
import historyLog from './historyLog.vue'
import signTaskSetting from './signTaskSetting.vue'

import { judgeTimeRange, fillLogData } from '@/util/util'

export default {
  components: {
    verifyPhone,
    notification,
    historyLog,
    signTaskSetting,
  },
  mounted() {
    if (localStorage.phone && localStorage.studentID) {
      this.apiKeyForm = {
        phone: localStorage.phone,
        studentID: localStorage.studentID,
      }
    }
  },
  data() {
    return {
      userInfoForm: {
        phone: '',
        studentID: '',
      },
      gridData: [],
      autoTaskStatus: {
        formTask: false,
        signTask: false,
        passTask: false,
      }
    }
  },
  methods: {
    showDialogPhone() {
      this.$refs.verifyPhone.showDialog() // 应该有更好的方法
    },
    showDialogNotification() {
      this.$refs.notification.showDialog()
    },
    logOut() {
      this.$store.commit('LOGOUT')
    },
    getHistoryLog() {
      this.$axios
        .post('/api/getSignLog', this.$qs.stringify(this.apiKeyForm))
        .then((res) => {
          let data = res.data
          if (data.code == 1025) {
            // 无数据
            this.gridData = [
              { time: '暂无数据', type: '暂无数据', msg: '暂无数据' },
            ]
            this.$refs.historyLog.showDialog()
          } else if (data.code != 0) {
            Message({
              message: data.msg,
              type: 'error',
              duration: 0,
              showClose: true,
            })
          } else {
            this.gridData = fillLogData(data.data)
            this.$refs.historyLog.showDialog()
          }
        })
        .catch((err) => {
          console.log(err)
        })
    },
    getTaskSetting() {
      this.$axios
        .post('/api/getRemoteSetting', this.$qs.stringify(this.apiKeyForm))
        .then((res) => {
          const result = res.data
          if (result.code != 0) {
            Message({
              message: result.msg,
              type: 'error',
              duration: 0,
              showClose: true,
            })
            return
          }
          const data = result.data
          this.autoTaskStatus.formTask =
            (data.formTaskEnable == null) ? false : JSON.parse(data.formTaskEnable)
          this.autoTaskStatus.signTask =
            (data.signTaskEnable == null) ? false : JSON.parse(data.signTaskEnable)
          this.autoTaskStatus.passTask =
            (data.passTaskEnable == null) ? false : JSON.parse(data.passTaskEnable)
          this.$refs.signTaskSetting.showDialog()
        })
        .catch((err) => {
          console.log(err)
        })
    },
    testSign() {
      if (judgeTimeRange()) {
        this.$axios
          .post('/api/testSign', this.$qs.stringify(this.apiKeyForm))
          .then((res) => {
            let data = res.data
            if (data.code == 1024) {
              Message({
                message: data.msg,
                type: 'warning',
                duration: 0,
                showClose: true,
              })
            } else if (data.code != 0) {
              Message({
                message: data.msg,
                type: 'error',
                duration: 0,
                showClose: true,
              })
            } else {
              Message({
                message: '打卡成功',
                type: 'success',
                duration: 1500,
              })
            }
          })
          .catch((err) => {
            console.log(err)
          })
      } else {
        Message({
          message: '当前不在打卡的时间范围内!',
          type: 'warning',
          duration: 1500,
        })
      }
    },
  },
}


</script>


<style>
.menu-btn {
  margin-top: 12%;
}
.dialog-form {
  padding-right: 5%;
}
</style>