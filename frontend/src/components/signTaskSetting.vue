<template>
  <el-dialog
    title="详细信息设置"
    :visible.sync="dialogEnable"
    custom-class="custom-dialog-big"
    :close-on-click-modal="false"
    :v-loading="dialogLoading"
  >
    <div class="task-setting-wrapper">

      <el-form
        label-width="auto"
        :model="settingForm"
        ref="settingForm"
        :rules="settingRule"
      >

        <el-form-item label="自动填表" prop="formTaskStatus">
          <el-switch v-model="autoTaskStatus.formTask"></el-switch>
        </el-form-item>

        <el-form-item label="自动签到" prop="signTaskStatus">
          <el-switch v-model="autoTaskStatus.signTask"></el-switch>
        </el-form-item>

        <el-form-item label="申请通行码" prop="passTaskStatus">
          <el-switch v-model="autoTaskStatus.passTask"></el-switch>
        </el-form-item>

        <el-form-item label="填表地址" prop="area">
          <v-distpicker
            type="mobile"
            @province="getLocation($event, 'province')"
            @city="getLocation($event, 'city')"
            @area="getLocation($event, 'area')"
          ></v-distpicker>
        </el-form-item>

        <el-form-item label="详细地址" prop="address">
          <el-input v-model="settingForm.address" size="large">
          </el-input>
        </el-form-item>

        <el-form-item label="签到坐标" prop="coordinate">
          <el-input v-model="settingForm.coordinate" size="large">
          </el-input>
        </el-form-item>



      </el-form>

      <el-row class="mod-notification-radio">
        <el-link
        href="https://lbs.qq.com/tool/getpoint/index.html"
        target="_blank"
        type="primary"
        >
        点此获取坐标
        <i class="el-icon-location-outline el-icon--right"></i>
        </el-link>
      </el-row>

      <el-row class="mod-notification-radio">
        <el-tooltip class="item" effect="dark" content="点击查看" placement="bottom-start">
          <el-image
            style="width: 100%; height: 60px"
            :src="imgUrl.getHelpUrl"
            :preview-src-list="settingHelperImgList"
          ></el-image>
        </el-tooltip>
      </el-row>


    </div>
    <div slot="footer" class="dialog-footer">
      <el-button type="primary" @click="submitForm">保 存</el-button>
    </div>
  </el-dialog>
</template>


<script>
import VDistpicker from 'v-distpicker'
import { Message } from 'element-ui'

import getHelpUrl from '../assets/getHelp.svg'
import settingHelperUrl1 from '../assets/settingHelper1.png'
import settingHelperUrl2 from '../assets/settingHelper2.png'


export default {
  components: { VDistpicker },
  props: {
    autoTaskStatus: {
      type: Object,
      default: null,
    },
  },
  watch: {
    autoTaskStatus: {
      handler (newVal, oldVal) {
        (oldVal)

        this.taskSetting.formTaskEnable = newVal.formTask
        this.taskSetting.signTaskEnable = newVal.signTask
        this.taskSetting.passTaskEnable = newVal.passTask
      },
      deep: true,
      immediate: true,
    }
  },
  data() {
    //// FIXME: 特殊行政区域、海外的处理
    const validateArea = (rule, value, callback) => {
      // value-> 0: 什么都没有选中 1: 可能已经选择省市,但是还没有选择地区
      if (this.settingForm.province.length > 1) {
        if (value.length <= 1) {
          this.taskSetting.locationInfo = ''
          callback(new Error('请输入完整地址'))
        } else {
          let fullLocation = this.settingForm.province + '/'
          fullLocation +=
            this.settingForm.province == this.settingForm.city
              ? '/' // TODO: 需要观察一些直辖市的行为
              : this.settingForm.city + '/' // 区分直辖市等
          fullLocation += this.settingForm.area
          this.taskSetting.locationInfo = fullLocation
          callback()
        }
      } else {
        // 省的为未填写状态
        this.taskSetting.locationInfo = ''
        callback()
      }
    }

    // 两者相互依赖
    const validateAddress = (rule, value, callback) => {
      if (value.length == 0 && this.settingForm.coordinate.length) {
        callback(new Error('请输入地址'))
      } else {
        this.taskSetting.address = value
        callback()
      }
    }

    const validateCoordinate = (rule, value, callback) => {

      const qqMapToBMap = (lat, lon) => {
        if (lon == null || lon == '' || lat == null || lat == '')
            return [false, false]

        const PI = 3.14159265358979324
        let x = parseFloat(lon)
        let y = parseFloat(lat)
        let z = Math.sqrt(x * x + y * y) + 0.00002 * Math.sin(y * PI)
        let theta = Math.atan2(y, x) + 0.000003 * Math.cos(x * PI)
        let lonQQ = (z * Math.cos(theta) + 0.0065).toFixed(5)
        let latQQ = (z * Math.sin(theta) + 0.006).toFixed(5)
        return [latQQ, lonQQ]
      }


      if (value.length == 0 && this.settingForm.address.length) {
        callback(new Error('请输入地理坐标'))
      } else if (value.length == 0) {
        // 全部为空, 继续
        callback()
      } else {
        let [lat, lon] = value.split(',')
        ;[lat, lon] = qqMapToBMap(lat, lon)
        if (lon === false || lat === false) {
          callback(new Error('请输入正确的地理坐标'))
        } else {
          this.taskSetting.lat = lat
          this.taskSetting.lon = lon
          callback()
        }
      }
    }

    return {
      dialogEnable: false,
      dialogLoading: false,
      taskSetting: {
        formTaskEnable: false,
        signTaskEnable: false,
        passTaskEnable: false,
        locationInfo: '', // 填表的位置
        address: '',      // 签到的地址
        lat: -1,          // 签到的坐标
        lon: -1,          // -1表示不更改
      },
      settingForm: {
        province: '',
        city: '',
        area: '',
        address: '',
        coordinate: '',
      },
      settingRule: {
        area: [{ validator: validateArea, trigger: 'blur' }],
        address: [{ validator: validateAddress, trigger: 'blur'}],
        coordinate: [{ validator: validateCoordinate, trigger: 'blur'}],
      },
      validResult: true,

      // 一些静态资源
      settingHelperImgList: [
        settingHelperUrl1,
        settingHelperUrl2,
      ],

      imgUrl: {
        getHelpUrl,
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
    getLocation($event, id) {
      if (id == 'province') {
        this.settingForm.province = $event.value
      } else if (id == 'city') {
        this.settingForm.city = $event.value
      } else if (id == 'area') {
        this.settingForm.area = $event.value
      }
    },
    submitForm() {
      this.$refs['settingForm'].validate((valid) => {
        this.validResult = valid
      })
      if (!this.validResult) {
        return
      }
      this.$axios
        .post('/api/taskSetting', this.$qs.stringify(this.taskSetting))
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
              message: '成功修改设置',
              type: 'success',
              duration: 1500,
            })
            this.closeDialog()
          }
        })
    }

  },
}
</script>

<style>
.task-setting-wrapper {
  text-align: left;
}
.address-container {
  height: 200px;
  overflow-y: auto;
}

@media screen and (max-width: 650px) {
  .address-container {
    height: 150px;
  }

}

.address-header select option {
	font-weight: normal;
	display: block;
	white-space: pre;
	min-height: 1.2em;
	padding: 0px 2px 1px
}

.address-header ul {
	margin: 0;
  padding: 0;
  font-size: 10px;
}

.address-header ul li {
	list-style: none;
}

.address-header {
	background-color: #fff;
}

.address-header ul {
	display: flex;
	justify-content: space-around;
	align-items: stretch
}

.distpicker-address-wrapper .address-header ul li {
  display: inline-block;
  padding: 0;
}

</style>