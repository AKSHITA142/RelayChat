const redis = require('redis');
require('dotenv').config({ override: true });


const redisUrl = process.env.REDIS_URI || 'redis://127.0.0.1:6379';

const realClient = redis.createClient({
    url: redisUrl
});

let isConnected = false;
const fallbackStore = new Map();


const redisClient = {
    on: (event, callback) => realClient.on(event, callback),
    connect: async () => {
        try {
            await realClient.connect();
            isConnected = true;
            console.log('Connected to Redis server!');
        } catch (err) {
            console.error('Redis connection failed, using in-memory fallback.');
            isConnected = false;
        }
    },
    set: async (key, value, options) => {
        if (isConnected) return realClient.set(key, value, options);
        fallbackStore.set(key, value);
        if (options?.EX) {
            setTimeout(() => fallbackStore.delete(key), options.EX * 1000);
        }
        return 'OK';
    },
    get: async (key) => {
        if (isConnected) return realClient.get(key);
        return fallbackStore.get(key) || null;
    },
    del: async (key) => {
        if (isConnected) return realClient.del(key);
        return fallbackStore.delete(key);
    },
    quit: async () => isConnected ? realClient.quit() : null
};

realClient.on('error', (err) => {
    if (isConnected) {
        console.error('Redis Error:', err.message);
    }
});

// Connect immediately
(async () => {
    await redisClient.connect();
})();

module.exports = redisClient;
