new Vue({
    el:"#root",
    data:{
        str:""
    },
    methods:{
        add(){
            console.log(this.$refs.username.value);
        }
    }
})