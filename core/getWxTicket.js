var Promise = require('promise');
var getWxToken = require('./getWxToken.js');
var httpRequest = require('./httpRequest.js');
var util = require('./util.js');
var Redis = require('ioredis');
var client = new Redis.Cluster(eval(process.env.REDIS_URL));

var reGetWxTicket = function(expiresIn, options) {
    //设置提前缓冲时间
    var buff = 180;
    setTimeout(function() {
        getWxTicket(options);
    }, expiresIn * 1000 - buff * 1000);
}

var sendRequestForTicket = function(access_token, options) {
    var postData = {
        access_token: access_token,
        type: 'jsapi'
    }
    httpRequest(postData).then(
        function(result) {
            //打印日志
            util.loggerInTerminal(result);
            //存储数据
            client.set(options.ticket, result.ticket);

            //重新获取ticket
            reGetWxTicket(result.expires_in, options);
        }
    ).catch(
        function(err) {
            console.log(err);
            setTimeout(function() {
                getWxTicket(options);
            }, 1000)
        }
    );
}

var getWxTicket = function(options) {
    client.get(options.accessToken, function(err, reply) {
        if (err) {
            console.log(err);
            return;
        }

        if (!reply) {
            getWxToken(options).then(
                function(result) {
                    sendRequestForTicket(result, options);
                }
            ).catch(function(err) {
                console.log(err);
                setTimeout(function() {
                    getWxTicket(options);
                }, 1000)
            })
            return;
        }

        sendRequestForTicket(reply, options);
    })
}

module.exports = getWxTicket;