var Promise = require('promise');
var util = require('./util.js');
var https = require('https');

module.exports = function(postData) {
    var promise = new Promise(function(resolve, reject) {
        var _postData = postData;

        var sub = _postData.grant_type ? "token" : "ticket/getticket";
        var errPlace = sub === 'token' ? 'get wxToken' : 'get wxTicket';

        //校验参数
        var params = util.testParamsExist(_postData);
        if (params !== true) {
            reject('Error: during ' + errPlace + ' ,' + params + ' is undefined');
            return;
        }

        _postData = require('querystring').stringify(_postData);

        var options = {
            hostname: 'api.weixin.qq.com',
            path: '/cgi-bin/' + sub + '?' + _postData,
            method: 'GET'
        };

        var req = https.request(options, function(res) {
            var size = 0;
            var chunks = [];
            res.on('data', function(chunk) {
                size += chunk.length;
                chunks.push(chunk);
            });
            res.on('end', function() {
                if (res.statusCode == 200) {
                    var data = Buffer.concat(chunks, size);
                    var info = JSON.parse(data.toString());

                    if (sub === 'ticket/getticket' && Object.prototype.toString.call(info) === "[object Object]" && info.errmsg !== 'ok') { //获取ticket失败
                        util.logger({
                            process: sub,
                            postData: _postData,
                            result: info
                        })
                        reject(info);
                    } else if (sub === 'token' && Object.prototype.toString.call(info) === "[object Object]" && !info.access_token && !info.expires_in) { //获取token失败
                        util.logger({
                            process: sub,
                            postData: _postData,
                            result: info
                        })
                        reject(info)
                    } else {
                        util.logger({
                            process: sub,
                            postData: _postData,
                            result: info
                        })
                        resolve(info);
                    }
                } else {
                    util.logger({
                        process: sub,
                        postData: _postData,
                        result: res.statusCode
                    })
                    reject('Error: during' + errPlace + ' ' + res.statusCode);
                }
            });
        });

        req.on('error', function(e) {
            util.logger({
                process: sub,
                postData: _postData,
                result: e.toString
            })
            reject('Error: during ' + errPlace + ' ' + e.toString());
        });

        req.end();
    })
    return promise;
}