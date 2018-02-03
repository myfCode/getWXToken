# getWXToken
#本服务是用来获取微信服务的access_token,ticket
# 流程如图： http ------> access_token ------> ticket ------> signature ------> 分享功能
#1、启动
node app.js

#备注：
#1、可以同时获取多个公众号的token、ticket, 在wxTicketList中push即可；
#2、token、ticket存在redis中