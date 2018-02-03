var getWxToken = require('./getWxToken.js');
var httpRequest = require('./httpRequest.js');
var util = require('./util.js');
var client = require('./client.js');


var GetWxTicket = function(options) {
    var self = this;

    this.options = options;

    this.tokenTimer = null;
    this.ticketTimer = null;

    //初始方法
    this.init = function() {
        self.client.get(self.options.accessToken, function(err, reply) {
            if (err) {
                console.log(err);
                return;
            }

            if (!reply) {
                self._getWxToken();
                return;
            }

            self.sendRequestForTicket(reply);
        })
    }

    //获取微信accessToken
    this._getWxToken = function() {
        self.getWxToken(self.options).then(
            function(result) {
                //在终端打印日志
                self.util.loggerInTerminal(result);

                //过期时间，毫秒数
                var expiresTime = self.calculateTime(result.expires_in, self.util.tokenBufferTime);

                //缓存accessToken
                self.client.set(self.options.accessToken, result.access_token, function() {
                    //设置到期刷新时间
                    self.client.set(self.options.expiresTime, self.util.addSeconds(expiresTime).format('yyyy-MM-dd hh:mm:ss'));
                });

                //设置重新accessToken定时
                self.reGetWxToken(expiresTime);

                //根据accessToken获取ticket
                self.sendRequestForTicket(result.access_token);
            },
            function(err) {
                console.log(err);
                //从新获取accessToken
                self.reGetWxToken();
            }
        )
    }


    //重新获取accessToken
    this.reGetWxToken = function(time) {
        if (self.tokenTimer) clearTimeout(self.tokenTimer);
        self.tokenTimer = setTimeout(function() {
            self._getWxToken()
        }, time || 1000)
    }

    //获取ticket
    this.sendRequestForTicket = function(access_token) {
        var postData = {
            access_token: access_token,
            type: 'jsapi'
        }
        self.httpRequest(postData).then(
            function(result) {
                //打印日志
                self.util.loggerInTerminal(result);

                //存储数据
                self.client.set(self.options.ticket, result.ticket);

                //重新获取ticket
                self.reGetWxTicket(self.calculateTime(result.expires_in, self.util.ticketBufferTime));

            },
            function(err) {
                console.log(err);

                if (Object.prototype.toString.call(err) === "[object Object]" && err.errmsg !== 'ok') self.clearToken(self.options.accessToken);

                self.reGetWxTicket();
            }
        )
    }

    //重新获取ticket
    this.reGetWxTicket = function(time) {
        if (self.ticketTimer) clearTimeout(self.ticketTimer);
        self.ticketTimer = setTimeout(function() {
            self.init();
        }, time || 1000)
    }
}

GetWxTicket.prototype = {
    client: client,
    httpRequest: httpRequest,
    getWxToken: getWxToken,
    util: util,
    calculateTime: function(expiresTime, bufferTime) {
        return expiresTime * 1000 - bufferTime;
    },
    clearToken: function(accessToken) {
        this.client.set(accessToken, null);
    }
}

module.exports = GetWxTicket;