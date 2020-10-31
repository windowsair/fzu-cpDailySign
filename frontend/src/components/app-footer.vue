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
      const cors = 'https://d-proxy.zme.ink/'
      const url = 'https://api.github.com/repos/windowsair/fzu-cpDailySign/commits/master'
      this.$axios.get(cors + url, {withCredentials: false}).then((res) => {
          let data = res.data;

          let commitTime = data.commit.committer.date
          commitTime = commitTime.replace('T', ' ')
          commitTime = commitTime.replace('Z', ' ')
          this.lastUpdateText = `最后更新于${commitTime}`
      })
    },
    updateAnnouncement(){
      const cors = 'https://d-proxy.zme.ink/'
      const url = 'https://gist.githubusercontent.com/windowsair/30c6f0a0a5fe8dfecff3a914e245745f/raw/2e049e3be33d0f1f2f090b4f19591d0adbda0c7f/announcements.json'
      this.$axios.get(cors + url, {withCredentials: false}).then((res) => {
          let deadline = res.data[0].deadline
          let content = res.data[0].content
          if(Math.round(new Date()) > Date.parse(deadline)){
            return
          }

          Message.info({
            showClose: true,
            duration: 4000,
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