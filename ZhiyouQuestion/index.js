const exp=require('express');
const bodyParser=require('body-parser');
const multer=require('multer');
const cookie=require('cookie-parser');
const fs=require('fs');

const app=exp();
// 解析cookie对象
app.use(cookie());

app.use(bodyParser.urlencoded({extended:true}));

// express请求处理管线
// 每次请求的多个回调函数构成一个请求处理管线
// 管线中的每个请求都可以得到该请求的数据
function isLogin(req,res,next){
    if(req.cookies.username){
        next();
    }else{
        // 跳转页面  将页面重定向
        res.redirect('login.html');
    }
}

app.get('/answer.html',isLogin,(req,res,next)=>{
    next();
})
app.get('/ask.html',isLogin,(req,res,next)=>{
    next();
})

// ---------------注册-----------------
app.post('/user/register',(req,res)=>{
    var filename=`user/${req.body.username}.txt`;

    function writeFile(){
        fs.exists(filename,(exists)=>{
            if(exists){
                // 该用户已经被注册
                res.status(200).json({
                    code:1,
                    msg:'该用户已被注册'
                })
            }else{
                req.body.ip=req.ip;
                req.body.time=Date.now();
                fs.appendFile(filename,JSON.stringify(req.body),function(error){
                    if(error){
                        res.status(200).json({
                            code:0,
                            msg:'注册失败'
                        })
                    }else{
                        res.status(200).json({
                            code:2,
                            msg:'注册成功'
                        })
                    }
                })
            }
        })
    }

    fs.exists('user',(exists)=>{
        if(exists){
            // 写入
            writeFile();
        }else{
            fs.mkdir('user',(error)=>{
                if(error){
                    res.status(200).json({
                        code:0,
                        msg:'用户文件创建失败'
                    })
                }else{
                    // 写入
                    writeFile();
                }
            })
        }
    })
})

// -------------------登录---------------------------
app.post('/user/login',(req,res)=>{
    // 根据用户名去匹配user文件夹中的文件
    var filename=`user/${req.body.username}.txt`;
    // 判断文件是否存在
    fs.exists(filename,(exists)=>{
        if(exists){
            // 该用户是注册过,开始对比密码
            fs.readFile(filename,(error,data)=>{
                if(!error){
                    var user=JSON.parse(data);
                    if(user.psw==req.body.psw){
                        // 密码相同登录成功 将用户名存入cookie中
                        var expires=new Date();
                        expires.setMonth(expires.getMonth()+1);
                        res.cookie('username',req.body.username,{expires});

                        // 登录成功
                        res.status(200).json({
                            code:1,
                            msg:'登陆成功'
                        })
                    }else{
                        res.status(200).json({
                            code:2,
                            msg:'密码错误'
                        })
                    }
                }else{
                    res.status(200).json({
                        code:3,
                        msg:'文件读取失败'
                    })
                }
            })
        }else{
            res.status(200).json({
                code:0,
                msg:'您还未注册'
            })
        }
    })
})

// ----------------------提问-----------------------
app.post('/user/ask',(req,res)=>{
     // 将xss攻击阻止   从内容发起
     var content=req.body.content;
     content=content.replace(/</g,'&lt;');
     content=content.replace(/>/g,'&gt;');

    if(req.cookies.username){

        // 封装一个写入的函数
        function writerFile(){
            var data=Date.now();
            // 文件的名字
            var filename=`question/${data}.txt`;
            req.body.username=req.cookies.username;
            req.body.time=data;
            req.body.ip=req.ip;
            fs.writeFile(filename,JSON.stringify(req.body),(error)=>{
                if(error){
                    res.status(200).json({
                        code:2,
                        msg:'提问失败'
                    })
                }else{
                    res.status(200).json({
                        code:1,
                        msg:'提问成功'
                    })
                }
            })
        }

        // 将获取到的问题存入到question文件夹中
        fs.exists('question',(exists)=>{
            if(exists){
                // 写入
                writerFile();
            }else{
                fs.mkdir('question',(error)=>{
                    if(!error){
                        // 写入
                        writerFile();
                    }
                })
            }
        })

    }else{
        res.status(200).json({
            code:0,
            msg:'登录异常'
        })
        return;
    }
})

// -----------------------退出登录-----------------------
app.get('/user/out',(req,res)=>{
    res.clearCookie('username');
    res.status(200).json({
        code:1,
        msg:'退出成功'
    })
})

// -------------------个人资料--------------------
// 配置信息
var storage = multer.diskStorage({
    destination:'./wwwroot/upload',
    filename:function(req,file,callback){
        var filename=file.originalname.split('.');
        callback(null,req.cookies.username+'.'+filename[filename.length-1]);
    }
})
// 根据配置信息,创建multer对象
var upload=multer({storage});

app.post('/user/upload',upload.single('file'),(req,res)=>{
    res.status(200).json({
        msg:'图片上传成功'
    })
})

// ----------------------头像----------------------
app.post('/user/all',(req,res)=>{
    fs.readdir('question',(error,files)=>{
        // console.log(file);
        if(!error){
            // 反序
            files=files.reverse();
            // 创建一个数组,将每个读取到的内容转为一个对象存到这个数组中
            var questions=[];
            // 第一种方法
            // for(var i=0;i<files.length;i++){
            //     var file=files[i];
            //     var filename='question/'+file;
            //     // readFile 是异步读取文件,不会影响for循环,for循环完了
            //     // 文件还没有读取完,导致数组没有数据
            //     // readFileSync 是同步读取数据,没有回调函数
            //     var data=fs.readFileSync(filename)
            //     var obj=JSON.parse(data);
            //     questions.push(obj);
            //     // console.log(questions);
            // }
            // res.status(200).json(questions);

            // 第二种:使用递归的方式
            var i=0;
            function readFile(){
                if(i<files.length){
                    var file=files[i];
                    var filename='question/'+file;
                    fs.readFile(filename,(err,data)=>{
                        if(!err){
                            var obj=JSON.parse(data);
                            questions.push(obj);
                            // console.log(questions);
                            i++;
                            readFile();
                        }
                    })
                }else{
                    // 代表文件已经读取完毕
                    res.status(200).json(questions);
                }
            }
            readFile();
        }

    })
})

// -----------------------回复-------------------------
app.post('/user/answer',(req,res)=>{
    // 取出question
    var question=req.cookies.question;

    // 将xss攻击阻止   从内容发起
    var content=req.body.content;
    content=content.replace(/</g,'&lt;');
    content=content.replace(/>/g,'&gt;');

    // 根据question找到要回复的是哪个问题
    var filename='question/'+question+'.txt';
    // 读取内容
    fs.readFile(filename,(error,data)=>{
        if(!error){
            var obj=JSON.parse(data);
            if(!obj.answer){
                obj.answer=[];
            }
            // 存在,将回复内容存入
            req.body.ip=req.ip;
            req.body.time=Date.now();
            req.body.username=req.cookies.username;
            
            obj.answer.push(req.body);
        }
        // 修改后要重新写入
        fs.writeFile(filename,JSON.stringify(obj),(error)=>{
            if(!error){
                res.status(200).json({
                    code:1,
                    msg:'回答成功'
                })
            }else{
                res.status(200).json({
                    code:2,
                    msg:'回答失败'
                })
            }
        })
    })
})

app.use(exp.static('wwwroot'));

app.listen(3000,()=>{
    console.log('开启问答系统服务器......')
})