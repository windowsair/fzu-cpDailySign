<template>
  <el-dialog
    title="历史任务记录"
    :visible.sync="dialogEnable"
    custom-class="custom-dialog"
    :close-on-click-modal="false"

  >
    <el-table :data="gridData" :row-class-name="tableRowClassName">
      <el-table-column property="time" label="时间" width="170"></el-table-column>
      <el-table-column property="type" label="事件类型" width="80"></el-table-column>
      <el-table-column property="msg" label="消息"></el-table-column>
    </el-table>
  </el-dialog>
</template>


<script>
export default {
  props: {
    gridData: {
      type: Array,
      default: null,
    },
  },
  data() {
    return {
      dialogEnable: false,
    }
  },
  methods: {
    showDialog() {
      this.dialogEnable = true
    },
    closeDialog() {
      this.dialogEnable = false
    },
    tableRowClassName({ row, rowIndex }) {
      rowIndex
      switch (row.type) {
        case 'success':
          return 'success-row'
        case 'warning':
          return 'warning-row'
        case 'error':
          return 'error-row'
        default:
          return ''
      }
    },
  },
}
</script>

<style>
.el-table .warning-row {
  background: #faecd8;
}

.el-table .success-row {
  background: #e1f3d8;
}

.el-table .error-row {
  background: #fde2e2;
}
</style>