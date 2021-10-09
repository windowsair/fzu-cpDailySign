<template>
  <div class="app-footer">
    <span class="github-link">
      <el-link
        type="warning"
        :underline="true"
        href="https://github.com/windowsair/fzu-cpDailySign"
        >Github链接</el-link
      >
    </span>
    <span>
      <el-link type="warning">{{ lastUpdateText }}</el-link>
    </span>
  </div>
</template>

<script>
import { Message } from 'element-ui'


export default {
  data() {
    return {
      lastUpdateText: '',
    }
  },
  methods: {
    updateText() {
      // const cors = 'https://api.allorigins.win/raw?url='
      // const url = 'https://api.github.com/repos/windowsair/fzu-cpDailySign/commits/master'
      this.$axios.get('/cors/github-commit', {withCredentials: false}).then((res) => {
          let data = res.data;

          let commitTime = data.commit.committer.date
          commitTime = commitTime.replace('T', ' ')
          commitTime = commitTime.replace('Z', ' ')
          this.lastUpdateText = `最后更新于${commitTime}`
      })
    },
    updateAnnouncement(){
      // const cors = 'https://api.allorigins.win/raw?url='
      // 使用Github gists 存储站点的公告
      // const gistID = '30c6f0a0a5fe8dfecff3a914e245745f'
      // const url = `https://api.github.com/gists/${gistID}`
      this.$axios.get('/cors/announcements', {withCredentials: false}).then((res) => {
          // 应该保证content内容不过大,否则将导致截断
          const data = JSON.parse(res.data.files['announcements.json'].content)
          let deadline = data[0].deadline
          let content = data[0].content
          let display = data[0].display
          if(Math.round(new Date()) > Date.parse(deadline) && !display){
            return
          }

          Message.info({
            showClose: true,
            duration: 2000,
            message: content
          })

      })
    }
  },
  mounted() {
    this.updateText()
    this.updateAnnouncement()
  },
}
</script>


<style>
.app-footer {
  position: fixed;
  left: 70px;
  bottom: 10px;
  font-size: 14px;
  color: #fff;
}

.github-link {
  margin-right: 5px;
}
</style>