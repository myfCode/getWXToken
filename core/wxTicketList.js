var wxTicketList = [];

wxTicketList.push({
    appId: process.env.ALLWIN_APPID,
    appSecret: process.env.ALLWIN_APPSECRET,
    accessToken: process.env.ALLWIN_WX_ACCESSTOKEN,
    ticket: process.env.ALLWIN_WX_TICKET,
    expiresTime: process.env.ALLWIN_WX_EXPIRES_TIME
});

wxTicketList.push({
    appId: process.env.APPID,
    appSecret: process.env.APPSECRET,
    accessToken: process.env.WX_ACCESSTOKEN,
    ticket: process.env.WX_TICKET,
    expiresTime: process.env.WX_EXPIRES_TIME
});

module.exports = wxTicketList;