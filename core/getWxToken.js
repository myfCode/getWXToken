var Promise = require('promise');
var httpRequest = require('./httpRequest.js');

var getWxToken = function(options) {
    var promise = new Promise(function(resolve, reject) {
        var postData = {
            grant_type: 'client_credential',
            appid: options.appId,
            secret: options.appSecret
        };

        httpRequest(postData).then(
            function(result) {
                resolve(result);
            },
            function(err) {
                reject(err);
            }
        )
    })
    return promise;
}

module.exports = getWxToken;