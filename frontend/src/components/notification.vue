<template>
  <el-dialog
    title="选择通知方式"
    :visible.sync="dialogEnable"
    top="1vh"
    custom-class="custom-dialog"
    :close-on-click-modal="false"
    :v-loading="dialogLoading"
  >
    <div class="notification-wrapper">
      <el-row class="mod-notification-radio">
        <el-radio-group v-model="apiKeyForm.type">
          <el-radio
            v-model="apiKeyForm.type"
            label="serverChan"
            style="color:#3090E4"
          >Server酱(微信/安卓APP)</el-radio>
        </el-radio-group>
        <el-image style="width: 100px; height: 100px" :src="imgUrl.serverChanUrl" fit="fit"></el-image>
      </el-row>

      <el-row class="mod-notification-radio">
        <el-radio-group v-model="apiKeyForm.type">
          <el-radio v-model="apiKeyForm.type" label="qmsg" style="color:#FA6E86">Qmsg酱(QQ)</el-radio>
        </el-radio-group>
        <el-image style="width: 100px; height: 100px" :src="imgUrl.qmsgUrl" fit="fit"></el-image>
      </el-row>

      <el-row class="mod-notification-radio">
        <el-radio-group v-model="apiKeyForm.type">
          <el-radio v-model="apiKeyForm.type" label="bark" style="color:#FF3B30">iOS Bark</el-radio>
        </el-radio-group>
        <el-image style="width: 100px; height: 100px" :src="imgUrl.barkUrl" fit="fit"></el-image>
      </el-row>

      <el-row class="mod-notification-radio">
        <el-radio-group v-model="apiKeyForm.type">
          <el-radio v-model="apiKeyForm.type" label="none" style="color:#FF3B30">清除通知</el-radio>
        </el-radio-group>
      </el-row>

      <el-row class="mod-notification-radio">
        <el-form :inline="true" :model="apiKeyForm" ref="apiKeyForm" :rules="apiKeyRule">
          <el-form-item label="APIKEY" prop="apiKey">
            <el-input
            v-model="apiKeyForm.apiKey"
            :disabled="apiKeyForm.type == '' || apiKeyForm.type == 'none'"
            :placeholder="apiPlaceholder"></el-input>
          </el-form-item>
        </el-form>
      </el-row>

      <el-row class="mod-notification-radio">
        <el-tooltip class="item" effect="dark" content="点击查看" placement="bottom-start">
          <el-image
            style="width: 100%; height: 60px"
            :src="imgUrl.getHelpUrl"
            :preview-src-list="noticeHelperImgList"
          ></el-image>
        </el-tooltip>
      </el-row>
    </div>

    <div slot="footer" class="dialog-footer">
      <el-button type="primary" @click="saveAndTestNotice">测 试</el-button>
    </div>
  </el-dialog>
</template>

<script>
// FIXME: 坏文明
import barkUrl from '../assets/bark.png'
import serverChanUrl from '../assets/serverchan.png'
import qmsgUrl from '../assets/qmsg.jpg'
import getHelpUrl from '../assets/getHelp.svg'
import noticeHelperUrl1 from '../assets/noticeHelper1.png'
import noticeHelperUrl2 from '../assets/noticeHelper2.png'
import noticeHelperUrl3 from '../assets/noticeHelper3.png'

import { Message } from 'element-ui'

export default {
  data() {
    const validateAPIKey = (rule, value, callback) => {
      if (this.apiKeyForm.type == 'none') {
        callback()
        return
      }
      if (value == '') {
        callback(new Error('请输入APIKey'))
      } else if (value.length < 8) {
        callback(new Error('请检查您的输入'))
      } else {
        callback()
      }
    }

    return {
      dialogEnable: false,
      dialogLoading: false,

      apiKeyForm: {
        type: '',
        apiKey: '',
        studentID: '',
      },

      apiKeyRule: {
        apiKey: [{ validator: validateAPIKey, trigger: 'blur' }],
      },

      imgUrl: {
        barkUrl: barkUrl,
        serverChanUrl: serverChanUrl,
        qmsgUrl: qmsgUrl,
        getHelpUrl: getHelpUrl,
      },

      noticeHelperImgList: [
        noticeHelperUrl1,
        noticeHelperUrl2,
        noticeHelperUrl3,
      ],
    }
  },
  mounted() {
    if (localStorage.phone && localStorage.studentID) {
      this.apiKeyForm = {
        type: '',
        apiKey: '',
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

    saveAndTestNotice() {
      this.$refs['apiKeyForm'].validate((valid) => {
        if (valid) {
          this.dialogLoading = true

          this.apiKeyForm.studentID = this.$store.state.studentID

          this.$axios
            .post('/api/changeNotice', this.$qs.stringify(this.apiKeyForm))
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
                  message: '操作成功完成!',
                  type: 'success',
                  duration: 1500,
                })

                this.closeDialog()
              }
            })
        } else {
          return false
        }
      })
    },
  },
  computed: {
    apiPlaceholder: function () {
      switch (this.apiKeyForm.type) {
        case 'serverChan':
          return '输入Server酱APIKEY'
        case 'qmsg':
          return '输入Qmsg酱APIKEY'
        case 'bark':
          return '输入Bark的APIKEY'
        default:
          return '请选择通知方式'
      }
    },
  },
}
</script>


<style>
.el-row {
  margin-bottom: 20px;
}
.el-row:last-child {
  margin-bottom: 0;
}

.notification-wrapper {
  text-align: left;
  margin-left: 10px;
}

.mod-notification-radio {
  display: block;
}

.mod-notification-radio > * {
  margin-bottom: 5px;
  margin-right: 30px;
}
.mod-notification-radio:nth-last-child(2) {
  margin-bottom: 0;
}
.mod-notification-radio:last-child {
  margin-bottom: 0;
}

@media screen and (max-width: 540px) {
  .mod-notification-radio {
    display: flex;
    flex-direction: column;
  }

  .mod-notification-radio > * {
    margin-bottom: 5px;
  }
}
</style>