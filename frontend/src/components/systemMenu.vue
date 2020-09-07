<template>
  <div class="system-menu">
    <el-row class="menu-btn">

      <el-button type="primary" round @click="showDialogPhone" style="margin-right: 10px">
        验证手机
        <i class="el-icon-phone el-icon--right"></i>
      </el-button>

      <el-button type="info" round style="margin-left: 10px">
        通知方式
        <i class="el-icon-message el-icon--right"></i>
      </el-button>
    </el-row>

    <el-row class="menu-btn">
      <el-button type="success" round style="margin-right: 10px">
        测试打卡
        <i class="el-icon-check el-icon--right"></i>
      </el-button>

      <el-button type="warning" round style="margin-left: 10px">
        历史记录
        <i class="el-icon-s-promotion el-icon--right"></i>
      </el-button>
    </el-row>

    <el-row class="menu-btn">
        
      

<el-popconfirm
  confirmButtonText='是的'
  cancelButtonText='取消'
  icon="el-icon-info"
  iconColor="red"
  title="确定要退出登录吗?"
  @onConfirm="logOut()"
>
  <el-button type="danger" slot="reference" round>
        退 出
        <i class="el-icon-switch-button el-icon--right"></i>
      </el-button>
</el-popconfirm>


      
    </el-row>


    <verifyPhone ref="verifyPhone"/>


    
  </div>
</template>

<script>
import verifyPhone from "./verifyPhone.vue";

export default {
  components: {
    verifyPhone,
  },
  data() {
    return {
      test: 123,
    }
  },
  methods: {
    showDialogPhone() {
      this.$refs.verifyPhone.showDialog() // 应该有更好的方法
    },
    logOut(){
        this.$store.commit('LOGOUT')
    }
  },
};


</script>


<style>
.menu-btn {
  margin-top: 12%;
}
.dialog-form {
  padding-right: 5%;
}
</style>