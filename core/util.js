var fs = require('fs');
var path = require('path');

//日期格式化
Date.prototype.format = function(format) { //日期格式化
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
    addSeconds: function(s) {
        var d = new Date();
        d.setSeconds(d.getSeconds() + s);
        return d;
    },
    testParamsExist: function(postData) {
        var _testResult = true;
        for (var n in postData) {
            if (postData[n] === undefined) {
                _testResult = n;
            }
        }
        return _testResult;
    },
    loggerInTerminal: function(info) {
        //打印日志
        var now = new Date();
        console.log(now.format('yyyy-MM-dd hh:mm:ss'));
        console.log(info);
    },
    tokenBufferTime: 5 * 60 * 1000,
    ticketBufferTime: 4 * 60 * 1000 ,
    logger: function(info){
        var today = new Date();
        var filename =  path.resolve(__dirname, '../logger') +'/' + today.format('yyyy-MM-dd') + '.log';
        fs.appendFile(filename, today.format('yyyy-MM-dd hh:mm:ss') 
            + '\n' + info.process
            + '\npostData:   ' + info.postData 
            + '\nresult:   ' + JSON.stringify(info.result)
            + '\n\n')
        }
}

module.exports = util;