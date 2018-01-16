var express = require('express');

var Redis = require('ioredis');
var https = require('https');

var app = express();

// app.use(function(req, res, next){
//     res.send(
//         'this is an test document.'
//         )
// })

app.listen(3000);

// console.log('app start')


var app = express();
var client = new Redis.Cluster(eval(process.env.REDIS_URL));

var hasGotToken = false;

//设置提前缓冲时间
var getTokenBuff = 300;

//日期格式化
Date.prototype.format = function(format){ //日期格式化
    var o = {
        "M+" : this.getMonth()+1, //month
        "d+" : this.getDate(), //day
        "h+" : this.getHours(), //hour
        "m+" : this.getMinutes(), //minute
        "s+" : this.getSeconds(), //second
        "q+" : Math.floor((this.getMonth()+3)/3), //quarter
        "S" : this.getMilliseconds() //millisecond
    };

    if(/(y+)/.test(format)) {
        format = format.replace(RegExp.$1, (this.getFullYear()+"").substr(4 - RegExp.$1.length));
    }

    for(var k in o) {
        if(new RegExp("("+ k +")").test(format)) {
            format = format.replace(RegExp.$1, RegExp.$1.length===1 ? o[k] : ("00"+ o[k]).substr((""+ o[k]).length));
        }
    }
    return format;
};

//时间减去秒
function addSeconds(s){
    var d = new Date();
    d.setSeconds(d.getSeconds()+s);
    return d;
}

/*获取accesstoken start*/
getAccessTokenFromWX();

function runschedule(expiresIn){
    setTimeout(function(){
        getAccessTokenFromWX();
    },expiresIn*1000-getTokenBuff*1000);
}

function getAccessTokenFromWX(){
    var postData = {
        grant_type: 'client_credential',
        appid: process.env.ALLWIN_APPID,
        secret: process.env.ALLWIN_APPSECRET
    };

    postData = require('querystring').stringify(postData);

    var options = {
        hostname: 'api.weixin.qq.com',
        path: '/cgi-bin/token?' + postData,
        method: 'GET'
    };

    var req = https.request(options, function(res) {
        var size = 0;
        var chunks = [];
        res.on('data', function(chunk){
            size += chunk.length;
            chunks.push(chunk);
        });
        res.on('end', function(){
            if (res.statusCode == 200) {
                var data = Buffer.concat(chunks, size);
                var info = JSON.parse(data.toString());
                var now = new Date();
                console.log(now);
                console.log(info);
                var expiresIn = info.expires_in;
                client.set(process.env.ALLWIN_WX_ACCESSTOKEN, info.access_token,function(a){
                    hasGotToken = true;
                    //设置到期刷新时间
                    var expiresTime = addSeconds(expiresIn-getTokenBuff);
                    expiresTime = expiresTime.format('yyyy-MM-dd hh:mm:ss');
                    client.set(process.env.ALLWIN_WX_EXPIRES_TIME, expiresTime);
                });
                runschedule(expiresIn);
            }else{
                console.log(res.statusCode);
            }
        });
    });

    req.on('error', function(e) {
        console.log('problem with request for wx_accessToken: ' + e.message);
        setTimeout(function(){
            getAccessTokenFromWX();
        },1000);
    });

    //req.write(postData);
    req.end();
}
/*获取accesstoken end*/

/*获取ticket start*/
checkTicket();

function checkTicket(){
    var buff = 1000;
    if (hasGotToken === false) {
        setTimeout(function(){
            checkTicket();
        },buff);
    } else {
        client.get(process.env.ALLWIN_WX_ACCESSTOKEN, function(err, reply) {
            getJsapiTicketFromWX(reply);
        });
    }
}

function runschedule_ticket(expiresIn){
    //设置提前缓冲时间
    var buff = 180;
    setTimeout(function(){
        client.get(process.env.ALLWIN_WX_ACCESSTOKEN, function(err, reply) {
            getJsapiTicketFromWX(reply);
        });
    },expiresIn*1000-buff*1000);
}

function getJsapiTicketFromWX(access_token){
    var postData = {
        access_token: access_token,
        type: 'jsapi'
    };

    postData = require('querystring').stringify(postData);

    var options = {
        hostname: 'api.weixin.qq.com',
        path: '/cgi-bin/ticket/getticket?' + postData,
        method: 'GET'
    };

    var req = https.request(options, function(res) {
        var size = 0;
        var chunks = [];
        res.on('data', function(chunk){
            size += chunk.length;
            chunks.push(chunk);
        });
        res.on('end', function(){
            if (res.statusCode == 200) {
                var data = Buffer.concat(chunks, size);
                var info = JSON.parse(data.toString());
                var now = new Date();
                console.log(now);
                console.log(info);
                var expiresIn = info.expires_in;
                if (expiresIn === undefined) {
                    setTimeout(function(){
                        checkTicket();
                    },10000);
                } else {
                    client.set(process.env.ALLWIN_WX_TICKET, info.ticket);
                    runschedule_ticket(expiresIn);
                }
            }else{
                console.log(res.statusCode);
            }
        });
    });

    req.on('error', function(e) {
        console.log('problem with request for wx_ticket: ' + e.message);
        setTimeout(function(){
            checkTicket();
        },1000);
    });

    //req.write(postData);
    req.end();
}