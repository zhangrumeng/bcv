
const mongodb=require("mongodb");
const express=require("express");
const app=express();
const bodyparser=require("body-parser");
const db=require("./module/mydb")
const tools=require("./module/tools")
app.use(bodyparser.json());
app.use(express.static(__dirname+"/upload"))
app.post("/sendCode",async (req,res)=>{
    try{
        const phoneNum = req.body.phoneNum;
        const codeInfo = await db.findOne("userCodeList",{
            phoneNum
        });
        // 判断是否有值
        if(codeInfo){
            // 判断验证码是否过期.  time  当前时间减去发送时间
            const time = Date.now()-codeInfo.sendTime;
            if(time > 60*1000 ){
                // 过期 ，重新发送
                const code = tools.getRandom(10000,99999);
                // 更新，发送的验证码，以及发送时间
                await db.updateOne("userCodeList",{phoneNum},{
                    $set:{
                        code,
                        sendTime:Date.now()
                    }
                });
                res.json({
                    ok:1,
                    code,
                    msg:"发送验证码成功"
                })
            }else{
                // 提示，发送不要太频繁
                tools.json(res,-1,"请不要发送太频繁。请在"+(60-Number.parseInt(time/1000))+"秒以后再次发送")
            }
        }else{
            // 发送验证码
            const code = tools.getRandom(10000,99999);
            await db.insertOne("userCodeList",{
                code,
                phoneNum,
                sendTime:Date.now()
            });
            res.json({
                ok:1,
                code,
                msg:"发送验证码成功"
            })
        }

    }catch (msg) {
        res.json({
            ok:-1,
            msg
        })
    }
})
app.post("/login",async (req,res)=>{
    const {phoneNum,code}=req.body;
    const phoneLogin=await db.findOne("userCodeList",{
        phoneNum,
        code:code/1
    })
    if (phoneLogin){
        const times=Date.now()-phoneLogin.sendTime;
        if (times>5*1000){
            tools.json(res,-1,"验证码已过期")
        }else {
            const userdata=await db.findOne("userList",{
                phoneNum
            })
            if (userdata){
                await db.updateOne("userList",{phoneNum},{$set:{lastTime:Date.now()}})
            }else{
                await db.insertOne("userList",{
                    phoneNum,
                    regTime:Date.now(),
                    lastTime:Date.now()

                })
            }
            res.json({
                ok:1,
                token:tools.encode({phoneNum}),
                msg:"登录成功",
                phoneNum
            })
        }
    }else {
        tools.json(res,-1,"验证码错误")
    }
})
app.get("/search",async (req,res)=>{
    const keyword=req.query.keyword;
    if (keyword.length>0){
        const shopList=await db.find("shopList",{
            whereObj:{
                shopName:new RegExp(keyword)
            }
        })
        res.json({
            ok:1,
            shopList
        })
    }else {
        res.json({
            ok:1,
            shopList: []
        })
    }

})
//根据店铺ID获得店铺信息
app.get("/shopInfo/:id",async (req,res)=>{
    const id=req.params.id;
    const shopInfo=await db.findOneById("shopList",id);
    res.json({
        ok:1,
        shopInfo
    })
})
//根据店铺ID获得商品类别
app.get("/goodsTypeList/:shopId",async (req,res)=>{
    const shopId=req.params.shopId;
    const goodsTypeList=await db.find("goodsTypeList",{
        whereObj: {
            shopId:mongodb.ObjectId(shopId)
        }
    })
    res.json({
        ok:1,
        msg:"找到啦",
        goodsTypeList
    })

})
//店铺类别列表
app.get("/shopTypeList",async (req,res)=>{
    const shopTypeList=await db.find("shopTypeList",{
        sort:{
            addTime:-1
        },
        limit:30
    })
    res.json({
        ok:1,
        shopTypeList:tools.changeArr(shopTypeList,10)
    })
})
//根据店铺类别ID获得店铺
app.get("/shopListOne/:shopTypeId",async (req,res)=>{
    const shopTypeId=req.params.shopTypeId;
    const shopList=await db.find("shopList",{
        whereObj:{
            shopTypeId:mongodb.ObjectId(shopTypeId)
        }
    })
    res.json({
        ok:1,
        shopList
    })
})
//店铺列表分页
app.get("/shopList",async (req,res)=>{
    let pageIndex = req.query.pageIndex;
    console.log(pageIndex)
    const response = await db.page("shopList",{
        sort:{
            addTime:-1,
        },
        limit:5,
        pageIndex
    })
    res.json(response);
})

app.listen(8084,()=>{
    console.log("Success")
})