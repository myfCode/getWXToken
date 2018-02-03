var Redis = require('ioredis');
var client;

if (eval(process.env.REDIS_URL) instanceof Array) {
    client = new Redis.Cluster(eval(process.env.REDIS_URL));
} else {
    client = new Redis(6379, eval(process.env.REDIS_URL));
}

module.exports = client;