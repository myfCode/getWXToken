var fs = require('fs');
var path = require('path');


var logger = function(info){
    var today = new Date();
    var loggerPath = path.resolve(__dirname, '../logger') ;
    var filename = loggerPath + '/' + today.format('yyyy-MM-dd') + '.log';
    console.log(filename+'-----------')
    fs.appendFile(filename, today.format('yyyy-MM-dd hh:mm:ss') 
        + '\n' + info + '\n\n')
}

module.exports = logger;