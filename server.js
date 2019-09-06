const express = require('express')
const app = express()
var path = require('path'); 
var mysql      = require('mysql');
var request = require('request');
const bodyParser= require('body-parser')
const multer = require('multer');
var fs = require("fs");
var jwt = require('jsonwebtoken');
var auth = require('./auth');
var connection = mysql.createConnection({
    host     : 'localhost',
    user     : 'root',
    password : '@wldnjs0216',
    database : 'test'
});

connection.connect();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}))
app.use(express.json());
app.use(express.urlencoded({extended : false}));
app.use(express.static(path.join(__dirname, 'public')));

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'public/uploads')
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname)
    }
})
   
var upload = multer({ storage: storage })
var userId = '';

app.get('/', function (req, res) {
    res.render('login')
})


app.post('/login', function (req, res) {
    console.log('로그인 시도중');
    var userEmail = req.body.userEmail;
    var userPass = req.body.userPass;
    var sql = "SELECT * FROM test.account WHERE email = ?";
    connection.query(sql, userEmail, function (err, result) {
        if (err) {
            throw err;
        }
        else {
            if (result.length > 0) {
                var tokenKey = "f$i1nt#ec1hT@oke1n!Key";  //auth.js에 있는 token key와 동일
                if (result[0].password == userPass) {
                    jwt.sign(
                        {
                        userName: result[0].name,
                        userId: result[0].id
                        },
                        tokenKey,
                        {
                        expiresIn: '1d',
                        issuer: 'fintech.admin',
                        subject: 'user.login.info'
                        },
                        function (err, token) {
                        res.json(token)
                        }
                    )
                }
                else{
                    res.json(2)
                }
            }
            else{
                res.json(3)
            }
        }
    })
})

app.get('/main', function (req, res) {
    res.render('main');    
})

// app.post('/news',auth, function(req, res){
//     var userId = req.decoded.userId;
//     console.log(req.decoded)
//     console.log(userId);
//     connection.query("SELECT `preference` FROM test.account where id='"+userId+"'", function(err, sender){
//         if(err){
//             console.error(err);
//             throw err;
//         }
//         else {
//             var dataSend = sender[0].preference;
//             console.log(dataSend);
//             res.json(dataSend);
//         }
//     })

// })

app.post('/uploadfile', auth, upload.single('myFile'), (req, res, next) => {
    var userId = req.decoded.userId;
    var ip = require("ip");
    console.log(ip)
    console.log ( ip.address() );
    
    console.log(req.decoded);
    //console.log(req)
    const file = req.file;
    console.log(file)
    var result = {
        isFace:true,
        isUser:true,
        receiver:'',
        sender:'',
        senderUrl:'',
        url:''
    }
    if (!file) {
      const error = new Error('Please upload a file')
      error.httpStatusCode = 400
      res.redirect('/main?isFile=false');
      return next(error)
    }
    //result.url=file.filename
    //result.isSuccess = 1
    
    var option = {
        method : "POST",
        url : "http://"+ip.address()+":5000/sendImg",
        form : {
            ImgPath : "http://"+ip.address()+":3000/uploads/"+ file.originalname,
            originalname : file.originalname,
            userId : userId
        }   
    }
    console.log('여기까지는왔네')
    request(option, function(err, response, body){
        console.log(JSON.parse(body)[0])
        if(err) throw err;
        else {
            console.log('리퀘')
            if(JSON.parse(body)[0] == 'none'){
                console.log('리퀘논')
                //res.redirect('/main?isFace=false');
                result.isFace = false;
                res.send(result)
                console.log('야야야야야야야야')
            }
            else{
                console.log('리퀘앨즈')
                console.log(JSON.parse(body)[0]);
                connection.query("SELECT * FROM test.account where id='"+JSON.parse(body)[0]+"'", function(err, receiver, fields){
                    console.log(receiver);
                
                    if (err) throw err;
                    else if(receiver.length == 0){
                        console.log('리퀘엘즈다시엘리프');
                        //res.redirect('/main?isUser=false');
                        result.isUser = false;
                        res.send(result)
                    }
                    else{
                        console.log('리퀘엘즈다시엘즈')
                        console.log("유저아이디"+userId);
                        connection.query("SELECT * FROM test.account where id='"+userId+"'", function(err, sender, fields){
                            console.log(sender);
                            console.log(receiver);
                            console.log(JSON.parse(body));
                            result.receiver = receiver[0];
                            result.sender = sender[0];
                            result.senderUrl = JSON.parse(body)[2];
                            result.url = JSON.parse(body)[1];
                            res.send(result)
                            //res.render('remit', {receiver: receiver[0], sender: sender[0], senderUrl: JSON.parse(body)[2], url: JSON.parse(body)[1]});
                        })
                    }
                })
            }
        }
    })        
    return(res)
})

app.get('/remit', function(req,res){
    var receiverName = req.query.receiverName;
    var receiverAccount = req.query.receiverAccount;
    var receiverBank = req.query.receiverBank;
    var senderName = req.query.senderName;
    var senderAccount = req.query.senderAccount;
    var senderBank = req.query.senderBank;
    var senderUrl = req.query.senderUrl;
    var url = req.query.url;
    
    res.render('remit', 
        {   receiverName : receiverName, 
            receiverAccount : receiverAccount,
            receiverBank : receiverBank,
            senderName : senderName,
            senderAccount : senderAccount,
            senderBank : senderBank,
            senderUrl: senderUrl, 
            url: url});

})

app.post('/remitMoney', auth, function(req,res){
    var userId = req.decoded.userId;
    var remitMoney = req.body.remitMoney;
    remitMoney = parseInt(remitMoney);
    console.log(remitMoney);
    console.log(typeof(remitMoney));
    var receiverName = req.body.receiverName;
    console.log(receiverName);
    var senderName = req.body.senderName;

    connection.query("SELECT amount FROM test.account where id = "+userId+";", function(err, senderAmount, fields){
        var senderMoney = senderAmount[0].amount;
        console.log(senderMoney);
        console.log(typeof(senderMoney));
        if (senderMoney >= remitMoney){
            // 송금
            var senderUpdateMoney = senderMoney-remitMoney;
            connection.query("UPDATE test.account SET amount = ? WHERE (id = ?);",[senderUpdateMoney,userId] ,function(err, result, fields){
                console.log(senderUpdateMoney)
                connection.query("select amount from test.account where name = ?;",receiverName, function(err, receiverAmount, fields){
                    console.log(receiverAmount);
                    var receiverUpdateMoney = remitMoney + receiverAmount[0].amount;
                    connection.query("update test.account SET amount =? where (name = ?);",[receiverUpdateMoney,receiverName] ,function(err, result, fields){
                        res.json(true);
                    })
                })
            })
        }
        else{
            // 잔액 부족
            res.json(false);
        }
    })
})

app.get('/friends', function (req, res) {
    res.render('friends')
})

app.post('/changePre', auth, function (req, res) {
    var userId = req.decoded.userId;
    console.log("pre", req.body.pre);
    connection.query("UPDATE `test`.`account` SET `preference` = '"+req.body.pre+"' WHERE (`id` = '"+userId+"');", function(err, sender, fields){
    })
    connection.query("SELECT `preference` FROM test.account where id='"+userId+"'", function(err, sender, fields){
        res.render('main', {preference: sender[0].preference});
    })
})

app.get('/mypage', function (req, res) {
    res.render('mypage')
})

app.get('/account', function (req, res) {
    res.render('account')
})

app.get('/getBalance', auth, function (req, res) {
    //jwt에서 userId값을 가져옴
    var userId = req.decoded.userId;
    //핀테크이용번호
    var finusernum = req.query.finusernum;
    //현재날짜
    var d = new Date();
    var yyyy = d.getFullYear(); var mm = d.getMonth() + 1; var dd = d.getDate();
    var hh = d.getHours(); var mi = d.getMinutes(); var sec = d.getSeconds();
    if (dd < 10) dd = '0' + dd; if (mm < 10) mm = '0' + mm; if (hh < 10) hh = '0' + hh;
    if (mi < 10) mi = '0' + mi; if (sec < 10) sec = '0' + sec;
    var tran_dtime = yyyy + mm + dd + hh + mi + sec;

    var getTokenUrl = "https://testapi.open-platform.or.kr/v1.0/account/balance?fintech_use_num="
        + finusernum
        + "&tran_dtime="
        + tran_dtime;

    var sql = "SELECT * FROM test.account WHERE id = ?"
    connection.query(sql, [userId], function (err, result) {    
        var accessToken = result[0].accessToken;
        var option = {
            method: "GET",
            url: getTokenUrl,
            headers: {
                Authorization: "Bearer " + accessToken
            }
        }
        request(option, function (err, response, body) {
            console.log(JSON.parse(body));
            if (err) throw err;
            else {
                console.log(JSON.parse(body).balance_amt);
                res.json(JSON.parse(body).balance_amt);
            }
        })
    });
})

//본인 계좌 연동 정보 가져와서 출력
app.post("/getUser", auth, function (req, res) {
    //jwt에서 userId값을 가져옴
    var userId = req.decoded.userId;
    var sql = "SELECT * FROM test.account WHERE id = ?"
    connection.query(sql, [userId], function (err, result) {
        var userseqnum = result[0].userseqnum;
        var accessToken = result[0].accessToken;
        var getTokenUrl = "https://testapi.open-platform.or.kr/user/me?user_seq_no=" + userseqnum;
        var option = {
            method: "GET",
            url: getTokenUrl,
            headers: {
            Authorization: "Bearer " + accessToken
            }
        };
        request(option, function (err, response, body) {
            if (err) throw err;
            else {
                res.json(JSON.parse(body));
            }
        })
    });
})

app.listen(3000)