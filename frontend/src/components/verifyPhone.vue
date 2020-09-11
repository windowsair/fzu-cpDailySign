<template>
  <el-dialog
    title="验证绑定手机"
    :visible.sync="dialogEnable"
    custom-class="custom-dialog"
    :close-on-click-modal="false"

    v-loading="dialogLoading"
    element-loading-text="请耐心等待"
  >
    <div class="mod-phone-form-wrapper">
      <el-form :model="phoneForm" ref="phoneForm" :rules="phoneRule" :inline="true">
        <el-form-item label="手机号" prop="phone" label-position="left" label-width="auto">
          <el-input v-model="phoneForm.phone" class="mod-phone-input-wrapper"></el-input>
        </el-form-item>
      </el-form>

      <el-form :model="phoneForm" ref="capForm" :inline="true" :rules="capRule">
        <el-form-item label="验证码" prop="cap" label-position="left" label-width="auto">
          <el-input
            v-model="phoneForm.cap"
            :disabled="capInputDisable"
            :placeholder="capPlaceholder"
            class="mod-phone-input-wrapper"
          ></el-input>
        </el-form-item>

        <div class="mod-phone-send-wrapper">
          <el-form-item>
            <el-button type="primary" @click="sendPhone" :disabled="sendBtnDisable">{{sendBtnMsg}}</el-button>
          </el-form-item>
        </div>
      </el-form>
    </div>

    <div slot="footer" class="dialog-footer">
      <el-button type="primary" @click="verifyCap()">确 定</el-button>
    </div>
  </el-dialog>
</template>

<script>
import { Message } from 'element-ui'

export default {
  data() {
    return {
      dialogEnable: false,
      dialogLoading: false,

      // 主要表单项
      phoneForm: {
        phone: '',
        cap: '',
        studentID: '',
      },
      phoneRule: {
        phone: [
          {
            required: true,
            message: '请输入今日校园绑定的手机',
            trigger: 'blur',
          },
          {
            min: 8,
            max: 12,
            message: '长度在 8 到 12 个字符',
            trigger: 'blur',
          },
        ],
      },
      capRule: {
        cap: [
          {
            required: true,
            message: '请输入验证码',
            trigger: 'blur',
          },
          {
            min: 4,
            max: 6,
            message: '长度在 4 到 6 个字符',
            trigger: 'blur',
          },
        ],
      },
      capInputDisable: true,
      lastPhone: '',
      sendStatus: 0, // 0 => 未发送  1 => 已发送
      sendBtnDisable: false, // 发送验证码的按钮
      countTime: 60, // 倒计时时间
    }
  },
  mounted() {
    if (localStorage.phone && localStorage.studentID) {
      this.phoneForm = {
        phone: localStorage.phone,
        cap: '',
        studentID: localStorage.studentID,
      }
    }
  },
  methods: {
    showDialog() {
      this.dialogEnable = true
    },
    closeDialog() {
      this.dialogEnable = false
    },
    sendPhone() {
      this.$refs['phoneForm'].validate((valid) => {
        if (valid) {
          // 相关组件状态设置
          this.sendBtnDisable = true
          this.countDown()
          this.capInputDisable = false

          // 请求开始
          this.phoneForm.studentID = this.$store.state.studentID
          this.$axios
            .post('/api/verifyPhone', this.$qs.stringify(this.phoneForm))
            .then(res => {
              let data = res.data
              if (data.code != 0) {
                Message({
                  message: data.msg,
                  type: 'error',
                  duration: 0,
                  showClose: true,
                })
              } else {
                Message({
                  message: '成功发送验证码',
                  type: 'success',
                  duration: 1500,
                })
              }
            })
            .catch((err) => {
              console.log(err)
            })
        } else {
          this.capInputDisable = true
        }
      })
    },
    verifyCap() {
      this.$refs['capForm'].validate((valid) => {
        if (valid) {
          this.dialogLoading = true

          // 请求开始
          this.phoneForm.studentID = this.$store.state.studentID
          this.$axios
            .post('/api/verifyMsgCode', this.$qs.stringify(this.phoneForm))
            .then((res) => {
              this.dialogLoading = false
              let data = res.data
              if (data.code != 0) {
                Message({
                  message: data.msg,
                  type: 'error',
                  duration: 0,
                  showClose: true,
                })
              } else {
                this.dialogLoading = false
                Message({
                  message: '成功认证',
                  type: 'success',
                  duration: 1500,
                })

                this.closeDialog()
              }
            })
            .catch((error) => {
              console.log(error)
            })
        } else {
          return false
        }
      })
    },
    countDown() {
      let clock = window.setInterval(() => {
        this.countTime--
        if (this.countTime < 0) {
          // 当倒计时小于0时清除定时器
          window.clearInterval(clock)
          this.sendBtnDisable = false
          this.countTime = 60
        }
      }, 1000)
    },
  },
  computed: {
    capPlaceholder: function () {
      return this.capInputDisable ? '请先填写手机号码' : '输入收到的验证码'
    },
    sendBtnMsg: function () {
      return this.sendBtnDisable ? `${this.countTime}秒后发送` : '发送'
    },
  },
}
</script>

<style>
.mod-phone-form-wrapper {
  display: flex;
  flex-direction: column;
  text-align: left;
  margin-left: 25%;
}

.mod-phone-send-wrapper {
  display: unset;
  justify-content: unset;
}

.mod-phone-input-wrapper {
  max-width: 1000px;
}

@media screen and (max-width: 830px) {
  .mod-phone-send-wrapper {
    display: flex;
    justify-content: center;
  }
  .mod-phone-form-wrapper {
    margin-left: 0;
    margin-right: 0;
    align-items: center;
  }
}

@media screen and (max-width: 1200px) {
  .mod-phone-form-wrapper {
    margin-left: 0;
    margin-right: 0;
  }
  .mod-phone-input-wrapper {
    max-width: 150px;
  }
}
</style>
