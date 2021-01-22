<template>
  <div class="tos-dialog">
    <el-dialog
      title="服务条款"
      :visible="this.$store.state.tosDialogVisible"
      :show-close="false"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      custom-class="custom-dialog"
    >
      <ul>本项目仅供研究学习用途</ul>
      <ul>本项目不提供任何形式的明示或暗示担保，包括但不限于对其本身的内在保证(例如可用性保证)和特殊目的的适用</ul>
      <ul>在任何情况下，不承担任何原因和责任依据，也不追究合同责任、后果责任或侵权行为(包括疏忽或其他)</ul>
      <ul>在使用本项目的任何环节造成的任何直接、间接、偶然、特殊、典型或重大的损坏(包括但不限于使用替代品的后果：使用、数据或利益的损失或业务干扰)，版权持有人、其他责任者或作者概不承担任何责任</ul>
      <ul>您继续使用本项目即表示您已经知晓并同意本服务条款</ul>
      <el-button type="warning" round @click="closeDialog">同意并继续</el-button>
    </el-dialog>
  </div>
</template>

<script>
export default {
  data() {
    return {
      test: true,
    }
  },
  methods:{
    closeDialog(){
      this.$store.commit('SET_TOS_DIALOG', false)
      this.$store.commit('LOGGED_IN')
    },
  },
  computed: {
    tosDialogVisible: function(){
      return this.$store.state.tosDialogVisible
    }
  }

}
</script>


<style>
.tos-dialog ul{
  padding: 0;
}
</style>