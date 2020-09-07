import Vue from 'vue'
import Vuex from 'vuex'
Vue.use(Vuex)


export const store = new Vuex.Store({
    state:{
        loggedIn: false,
        tosDialogVisible: false,
        studentID: '',
        phone: '',
        showValidPhoneDialog: false,

    },
    mutations:{
        LOGGED_IN(state) {
            state.loggedIn = true
        },
        LOGOUT(state) {
            state.loggedIn = false
            state.studentID = ''
            state.phone = ''

            localStorage.clear()
            //localStorage.setItem('access_token', '');
        },
        SET_STUDENTID(state, studentID){
            localStorage.setItem('studentID', studentID)
            state.studentID = studentID
        },
        SET_PHONE(state, phone){
            localStorage.setItem('phone', phone)
            state.phone = phone
        },
        SET_TOS_DIALOG(state, enable){
            state.tosDialogVisible = enable
        },
        SET_DIALOG(state){
            state.showValidPhoneDialog = true
        }

    },
    getters:{
        loggedIn: state => state.loggedIn
        // {
        //     (state)
        //     // 不单独存储
        //     // let studentID = localStorage.getItem('studentID')
        //     // if(studentID == null){
        //     //     console.log(false)
        //     //     return false
        //     // }
        //     // else{
        //     //     console.log(true)
        //     //     return true
        //     // }
        // }
        ,
        studentID: state => state.studentID
        // {
        //     (state)
        //     console.log('test')
        //     let studentID = localStorage.getItem('studentID')
        //     if(studentID == null){
        //         return ''
        //     }
        //     else{
        //         state.studentID = studentID
        //         console.log('dothis')
        //         return studentID
        //     }
        // }
        ,
        phone: state => state.phone,
        tosDialogVisible: state => state.tosDialogVisible,
        showValidPhoneDialog: state => state.showValidPhoneDialog
    }
})