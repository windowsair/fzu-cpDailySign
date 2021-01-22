<template>
  <el-form
    :model="registerForm"
    :rules="rules"
    ref="registerForm"
    label-width="100px"
    class="registerForm"
    @submit.native.prevent
  >
    <el-form-item label="学号" prop="studentID">
      <el-input v-model="registerForm.studentID"></el-input>
    </el-form-item>

    <el-form-item label="手机号" prop="phone">
      <el-input v-model="registerForm.phone" placeholder="请输入今日校园绑定的手机号码"></el-input>
    </el-form-item>

    <el-form-item label="验证码" prop="cap">
      <el-col :span="11" class="register-cap-input">
        <el-input v-model="registerForm.cap" placeholder="请输入验证码" @keyup.enter.native="submitForm('registerForm')"></el-input>
      </el-col>

      <el-col :span="11" class="register-cap-img">
        <el-tooltip
          class="item"
          effect="dark"
          content="点击刷新"
          placement="bottom-end"
          :open-delay="500"
        >
          <el-image :src="capUrl" :fit="capFit" @click="updateCap">
            <div slot="error" class="image-slot">
              <i class="el-icon-picture-outline" @click="updateCap"></i>
            </div>
          </el-image>
        </el-tooltip>
      </el-col>
    </el-form-item>

    <el-form-item label-width="0px">
      <el-button type="primary" @click="submitForm('registerForm')">提交</el-button>
    </el-form-item>
  </el-form>
</template>



<script>
//import {login} from '@/util/request-api'
import { Message } from 'element-ui'

export default {
  data() {
    return {
      registerForm: {
        studentID: '',
        phone: '',
        cap: '',
      },
      rules: {
        studentID: [
          { required: true, message: '请输入学号', trigger: 'blur' },
          {
            min: 8,
            max: 11,
            message: '长度在 8 到 11 个字符',
            trigger: 'blur',
          },
        ],
        phone: [
          {
            required: true,
            message: '请输入今日校园绑定的手机号',
            trigger: 'blur',
          },
          {
            min: 8,
            max: 12,
            message: '长度在 8 到 12 个字符',
            trigger: 'blur',
          },
        ],
        cap: [{ required: true, message: '请输入验证码', trigger: 'blur' }],
      },

      capFit: 'contain',
      capUrl: '/api/captcha.jpg',
      forceCapReload: 0,
      testData: this.$store.state.loggedIn,
      ///fullscreenLoading: false,
    }
  },
  methods: {
    submitForm(formName) {
      this.$refs[formName].validate((valid) => {
        if (valid) {
          this.$axios
            .post('/api/login', this.$qs.stringify(this.registerForm))
            .then((res) => {
              let data = res.data
              if (data.code != 0) {
                this.updateCap()
                Message({
                  message: data.msg,
                  type: 'error',
                  duration: 0,
                  showClose: true,
                })
              } else {
                Message({
                  message: '成功登陆',
                  type: 'success',
                  duration: 1500,
                })

                this.$store.commit('SET_STUDENTID',
                  this.registerForm.studentID
                )
                this.$store.commit('SET_PHONE', this.registerForm.phone)
                this.$store.commit('SET_TOS_DIALOG', true)
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
    updateCap() {
      const rawCapUrl = this.capUrl
      let num = Math.ceil(Math.random() * 10000)
      this.capUrl = `${rawCapUrl}?${num}`
    },
  },
}
</script>

<style>
.registerForm {
  padding-right: 5%;
}
.register-cap-img {
  width: 130px;
  height: 45px;
}
.image-slot {
  font-size: 3em;
}
</style>