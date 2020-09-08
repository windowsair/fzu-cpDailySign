<template>
  <el-dialog
    title="选择通知方式"
    :visible.sync="dialogEnable"
    custom-class="custom-dialog"
    :close-on-click-modal="false"
    :v-loading="dialogLoading"
  >
      <el-row>
        <el-radio v-model="radio" label="serverChan">Server酱(微信,安卓客户端)</el-radio>
      </el-row>

      <el-row>
        <el-radio v-model="radio" label="qmsg">Qmsg酱(QQ)</el-radio>
      </el-row>

      <el-row>
        <el-radio v-model="radio" label="bark">iOS Bark</el-radio>
      </el-row>

    <div slot="footer" class="dialog-footer">
      <el-button type="primary">确 定</el-button>
    </div>
  </el-dialog>
</template>

<script>
export default {
  data() {
    return {
      dialogEnable: false,
      dialogLoading: false,
      radio: "",
    };
  },
  methods: {
    showDialog() {
      this.dialogEnable = true;
    },
    closeDialog() {
      this.dialogEnable = false;
    },
  },
};
</script>


<style>
  .el-row {
    margin-bottom: 20px;
  }
  .el-row:last-child{
      margin-bottom: 0;
  }
</style>