var Promise = require('promise');
var util = require('./util.js');
var httpRequest = require('./httpRequest.js');
var Redis = require('ioredis');
var client = new Redis.Cluster(eval(process.env.REDIS_URL));


var _tokenBuff = 300;

var reGetWxToken = function(expiresIn, options) {
    setTimeout(function() {
        getWxToken(options);
    }, expiresIn * 1000 - _tokenBuff * 1000);
}

var getWxToken = function(options) {
    var promise = new Promise(function(resolve, reject) {
        var postData = {
            grant_type: 'client_credential',
            appid: options.appId,
            secret: options.appSecret
        };

        httpRequest(postData).then(
            function(result) {
                //在终端打印日志
                util.loggerInTerminal(result);

                //存储数据
                var expiresIn = result.expires_in;
                client.set(options.accessToken, result.access_token, function(a) {
                    //设置到期刷新时间
                    var expiresTime = util.addSeconds(expiresIn - _tokenBuff);
                    expiresTime = expiresTime.format('yyyy-MM-dd hh:mm:ss');
                    client.set(options.expiresTime, expiresTime);
                });

                //设置重新获取token的定时
                reGetWxToken(expiresIn, options);

                resolve(result.access_token);
            },
            function(err) {
                reject(err);
                setTimeout(function() {
                    getWxToken(options);
                }, 800)
            }
        )
    })
    return promise;
}

module.exports = getWxToken;