var express = require('express');
var getWxTicket = require('./core/getWxTicket.js');
var wxTicketList = require('./core/wxTicketList.js');
var app = express();

wxTicketList.forEach(function (item, index) {
    getWxTicket(item);
})

//test server in  browser
app.use(function(req, res){
    res.write('hello world');
    res.end();
})

app.listen(process.env.WXC_PORT || '6000');

console.log('sever is listening on port: '+ process.env.WXC_PORT || '6000');