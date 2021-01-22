<template>
  <div id="root">
    <div id="wrapper">
      <div id="content">
        <div class="index-background"></div>
        <div class="index-text-wrapper">
          <div class="index-text">
            <h3>福大今日校园</h3>
            <p>自动打卡测试工具</p>
          </div>
        </div>
      </div>
    </div>
    <div id="app">
      <div class="register-content" id="main-content">
        <div class="register-guide">
          <h3>{{welcomMsg()}}</h3>
        </div>

        <components :is="tabset"></components>

        <tos />
      </div>
    </div>

    <appFooter />

  </div>
</template>

<script>
import registerForm from "@/components/register.vue";
import tos from "@/components/tos.vue";
import systemMenu from "@/components/systemMenu.vue";
import appFooter from "@/components/app-footer.vue";

export default {
  name: "app",
  components: {
    registerForm,
    tos,
    systemMenu,
    appFooter
  },
  data() {
    return {
      test: 1,
    };
  },
  mounted() {
    if (localStorage.studentID && localStorage.phone) {
      this.$store.commit("SET_STUDENTID", localStorage.studentID);
      this.$store.commit("SET_PHONE", localStorage.phone);
      this.$store.commit("LOGGED_IN");
    }
  },
  computed: {
    tabset: function () {
      return this.$store.state.loggedIn ? "systemMenu" : "registerForm";
    },
  },
  methods: {
    welcomMsg: function () {
      return this.$store.state.loggedIn == true
        ? "欢迎, " + this.$store.state.studentID
        : "欢迎注册/登录";
    },
  },
};
</script>

<style>
body,
h1,
h2,
h3,
h4,
h5,
h6,
p {
  margin: 0;
  padding: 0;
}

body {
  font-family: PingFang-SC-Regular, Helvetica, "Microsoft Yahei", "微软雅黑";
}

#wrapper {
  width: 100%;
}

.index-background {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background: url("./assets/background.jpg") no-repeat;
  background-size: cover;
}

#content {
  width: 980px;
  margin-left: auto;
  margin-right: auto;
}

#app {
  font-family: "Avenir", Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}

.register-content {
  position: absolute;
  left: 139px;
  top: 50%;
  margin-top: -340px;
  width: 480px;
  height: 680px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  overflow: hidden;
  zoom: 1;
}


@media screen and (max-height: 752px) {
  .register-content {
    height: 554px;
    margin-top: 0px;
    top: 8vh;
  }

}

@media screen and (max-width: 650px) {
  .register-content{
    height: 98vh;
    margin-top: 0px;
    top: 1vh;
  }
  .register-content .register-guide {
    margin: 2% 0 !important;
  }

}

.register-content .register-guide {
  margin: 50px 0 22px 0px;
  font-size: 36px;
  color: #000;
  padding-bottom: 4px;
}

@media screen and (max-width: 752px) {
  .register-content {
    left: 0px;
    width: 96%;
    margin-left: 2%;
    margin-right: 2%;
  }
}

.index-text {
  position: fixed;
  right: 100px;
  top: 50px;
  color: #fff;
}

@media screen and (max-width: 1100px) {
  .index-text {
    right: 50px;
  }
}

@media screen and (max-width: 1000px) {
  .index-text {
    right: 10px;
  }
}

@media screen and (max-width: 1000px) {
  .index-text {
    display: none;
  }
}

.index-text h3 {
  font-size: 54px;
  letter-spacing: 0;
  font-weight: 700;
}

.index-text p {
  font-size: 32px;
  letter-spacing: 3.81px;
  font-weight: 300;
  margin: 0;
}

.el-dialog.custom-dialog {
  width: 50%;
}

.el-dialog.custom-dialog-big {
  width: 60%;
}

.el-dialog.custom-dialog-big .el-dialog__body {
  padding: 30px 20px 0px 20px;
}


@media screen and (max-width: 780px) {
  .el-dialog.custom-dialog {
    width: 70%;
  }
  .el-dialog.custom-dialog-big {
    width: 80%;
  }
}

@media screen and (max-width: 500px) {
  .el-dialog.custom-dialog {
    width: 80%;
  }
  .el-dialog.custom-dialog-big {
    width: 90%;
  }
}

@media screen and (max-width: 400px) {
  .el-dialog.custom-dialog {
    width: 85%;
  }
  .el-dialog.custom-dialog-big {
    width: 95%;
  }

  .el-message {
    min-width: 90% !important;
    width: 90% !important;
  }

}

@media screen and (max-height: 700px) {
  .el-dialog.custom-dialog-big {
    margin-top: 10vh !important;
  }
}

@media screen and (max-height: 650px) {
  .el-dialog.custom-dialog-big {
    margin-top: 5vh !important;
  }
}

@media screen and (max-height: 620px) {
  .el-dialog.custom-dialog-big {
    margin-top: 1vh !important;
  }
}

.el-notification.right {
  right: 1vh !important;
}

@media screen and (max-width: 340px) {
  .el-notification {
    width: 310px !important;
  }
}

@media screen and (min-width: 768px) {
  .el-input--large {
    width: 50% !important;
  }
}

@media screen and (min-width: 1200px) {
  .el-input--large {
    width: 40% !important;
  }
}

</style>
