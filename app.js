var express = require('express');
var Redis = require('ioredis');
var https = require('https');
var promise = require('promise');

var app = express();
var client = new Redis.Cluster(eval(process.env.REDIS_URL));

//日期格式化
Date.prototype.format = function (format) { //日期格式化
    var o = {
        "M+": this.getMonth() + 1, //month
        "d+": this.getDate(), //day
        "h+": this.getHours(), //hour
        "m+": this.getMinutes(), //minute
        "s+": this.getSeconds(), //second
        "q+": Math.floor((this.getMonth() + 3) / 3), //quarter
        "S": this.getMilliseconds() //millisecond
    };

    if (/(y+)/.test(format)) {
        format = format.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    }

    for (var k in o) {
        if (new RegExp("(" + k + ")").test(format)) {
            format = format.replace(RegExp.$1, RegExp.$1.length === 1 ? o[k] : ("00" + o[k]).substr(("" + o[k]).length));
        }
    }
    return format;
};

var util = {
    getTokenBuff: 300,
    addSeconds: function (s) {
        var d = new Date();
        d.setSeconds(d.getSeconds() + s);
        return d;
    },
    testParamsExist: function (postData) {
        var _testResult = true;
        for (var n in postData) {
            if (postData[n] === undefined) {
                _testResult = n;
            }
        }
        return _testResult;
    },
    runschedule_token: function (expiresIn, config) {
        var timer = setTimeout(function () {
            getWxAccessToken(config);
            clearTimeout(timer);
        }, expiresIn * 1000 - util.getTokenBuff * 1000);
    },
    runschedule_ticket: function (expiresIn, config) {
        //设置提前缓冲时间
        var buff = 180;
        var timer = setTimeout(function () {
            getWxTicket(config);
            clearTimeout(timer)
        }, expiresIn * 1000 - buff * 1000);
    },
    loggerInTerminal: function (info) {
        //打印日志
        var now = new Date();
        console.log(now.format('yyyy-MM-dd hh:mm:ss'));
        console.log(info);
    }
}

function WxAccesTokenAndTicket(options) {
    this.appId = options.appId;
    this.appSecret = options.appSecret;
    this.accessToken = options.accessToken;
    this.ticket = options.ticket;
    this.expiresTime = options.expiresTime;

    this.getWxAccessTokenAndTicket(this);
}

WxAccesTokenAndTicket.prototype = {
    getWxAccessTokenHttpRequest : function (config) {
        var promise = new Promise(function (resolve, reject) {
            var postData = {
                grant_type: 'client_credential',
                appid: config.appId,
                secret: config.appSecret
            };

            //校验参数
            var testResult = util.testParamsExist(postData);
            if (testResult !== true) {
                reject('problem with request for wx_accessToken: ' + testResult + ' is undefined');
                return;
            }

            postData = require('querystring').stringify(postData);

            var options = {
                hostname: 'api.weixin.qq.com',
                path: '/cgi-bin/token?' + postData,
                method: 'GET'
            };

            var req = https.request(options, function (res) {
                var size = 0;
                var chunks = [];
                res.on('data', function (chunk) {
                    size += chunk.length;
                    chunks.push(chunk);
                });
                res.on('end', function () {
                    if (res.statusCode == 200) {
                        var data = Buffer.concat(chunks, size);
                        var info = JSON.parse(data.toString());
                        resolve(info);
                    } else {
                        reject('problem with request for wx_accessToken: ' + res.statusCode);
                    }
                });
            });

            req.on('error', function (e) {
                reject('problem with request for wx_accessToken: ' + e.toString());
            });

            req.end();
        })
        return promise;
    },
    getWxTicketHttpRequest : function (config) {
        var promise = new Promise(function (resolve, reject) {
            var postData = {
                access_token: config.access_token,
                type: 'jsapi'
            };

            //校验参数
            var testResult = util.testParamsExist(postData);
            if (testResult !== true) {
                reject('problem with request for wx_ticket: ' + testResult + ' is undefined');
                return;
            }

            postData = require('querystring').stringify(postData);

            var options = {
                hostname: 'api.weixin.qq.com',
                path: '/cgi-bin/ticket/getticket?' + postData,
                method: 'GET'
            };

            var req = https.request(options, function (res) {
                var size = 0;
                var chunks = [];
                res.on('data', function (chunk) {
                    size += chunk.length;
                    chunks.push(chunk);
                });
                res.on('end', function () {
                    if (res.statusCode == 200) {
                        var data = Buffer.concat(chunks, size);
                        var info = JSON.parse(data.toString());
                        resolve(info);
                    } else {
                        reject('problem with request for wx_ticket: ' + res.statusCode);
                    }
                });
            });

            req.on('error', function (e) {
                reject('problem with request for wx_ticket: ' + e.toString());
            });

            req.end();
        })
        return promise;
    },
    getWxAccessToken : function (config) {
        var _this = this;
        _this.getWxAccessTokenHttpRequest(config).then(
            function (info) {
                //在终端打印日志
                util.loggerInTerminal(info);

                //存储数据
                var expiresIn = info.expires_in;
                client.set(config.accessToken, info.access_token, function (a) {
                    //设置到期刷新时间
                    var expiresTime = util.addSeconds(expiresIn - util.getTokenBuff);
                    expiresTime = expiresTime.format('yyyy-MM-dd hh:mm:ss');
                    client.set(config.expiresTime, expiresTime);
                });
                util.runschedule_token(expiresIn, config);
            },
            function (err) {
                console.log(err);
                var timer = setTimeout(function () {
                    _this.getWxAccessToken(config);
                }, 1000)
            }
        )
    },
    getWxTicket : function (config) {
        var _this = this;
        client.get(config.accessToken, function (err, reply) {
            if (err) {
                console.log(err)
                return;
            }
            if (!reply) {
                _this.getWxAccessTokenAndTicket(config);
                return;
            }
            config.access_token = reply;
            _this.getWxTicketHttpRequest(config).then(
                function (info) {
                    //打印日志
                    util.loggerInTerminal(info);
                    //存储数据
                    client.set(config.ticket, info.ticket);
                    util.runschedule_ticket(info.expires_in, config);
                },
                function (err) {
                    console.log(err);
                    var timer = setTimeout(function () {
                        _this.getWxTicket(config);
                        clearTimeout(timer);
                    }, 1000)

                }
            )
        })
    },
    getWxAccessTokenAndTicket : function (config) {
        var _this = this;
        _this.getWxAccessTokenHttpRequest(config).then(
            function (info) {
                //在终端打印日志
                util.loggerInTerminal(info);

                //存储数据
                var expiresIn = info.expires_in;
                client.set(config.accessToken, info.access_token, function (a) {
                    //设置到期刷新时间
                    var expiresTime = util.addSeconds(expiresIn - util.getTokenBuff);
                    expiresTime = expiresTime.format('yyyy-MM-dd hh:mm:ss');
                    client.set(config.expiresTime, expiresTime);
                });
                util.runschedule_token(info.expires_in, config);

                //把access_token存入config中
                config.access_token = info.access_token;

                //获取ticket
                return _this.getWxTicketHttpRequest(config)
            }
        ).then(
            function (info) {
                //打印日志
                util.loggerInTerminal(info)

                //存储数据
                client.set(config.ticket, info.ticket);
                util.runschedule_ticket(info.expires_in, config);
            }
        ).catch(
            function (err) {
                console.log(err);
                var timer = setTimeout(function () {
                    err.toLowerCase().indexOf('accesstoken') > 0 ? _this.getWxAccessTokenAndTicket(config) : _this.getWxTicket(config);
                    clearTimeout(timer);
                }, 1000)
            }
        )
    }
}

//获取共赢微信accessToken、ticket
var wxInfo_allwin = new WxAccesTokenAndTicket({
    appId: process.env.ALLWIN_APPID,
    appSecret: process.env.ALLWIN_APPSECRET,
    accessToken: process.env.ALLWIN_WX_ACCESSTOKEN,
    ticket: process.env.ALLWIN_WX_TICKET,
    expiresTime: process.env.ALLWIN_WX_EXPIRES_TIME
})

//二合一获取微信accessToken、ticket
var wxInfo_jingqbWeb = new WxAccesTokenAndTicket({
    appId: process.env.APPID,
    appSecret: process.env.APPSECRET,
    accessToken: process.env.WX_ACCESSTOKEN,
    ticket: process.env.WX_TICKET,
    expiresTime: process.env.WX_EXPIRES_TIME
})


// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.send('error');
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.send('error');
});


module.exports = app;
