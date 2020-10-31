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
      this.$axios
        .get(cors + url, {
          withCredentials: false,
        })
        .then((res) => {
          let data = res.data;

          let commitTime = data.commit.committer.date
          commitTime = commitTime.replace('T', ' ')
          commitTime = commitTime.replace('Z', ' ')
          this.lastUpdateText = `最后更新于${commitTime}`
        })
    },
  },
  mounted() {
    this.updateText()
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