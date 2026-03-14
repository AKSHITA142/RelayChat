const redis = require('redis');
require('dotenv').config({ override: true });

// Read Redis URI from env, defaults to localhost
const redisUrl = process.env.REDIS_URI || 'redis://127.0.0.1:6379';

const redisClient = redis.createClient({
    url: redisUrl
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));
redisClient.on('connect', () => console.log('Connected to Redis server!'));

// Connect immediately
(async () => {
    try {
        await redisClient.connect();
    } catch (err) {
        console.error('Failed to connect to Redis during startup:', err);
    }
})();

module.exports = redisClient;
