const session = require('express-session');
const { RedisStore } = require('connect-redis');
const crypto = require('crypto');
const { getRedisClient } = require('./redis');

// Configure express-session with Redis backing store and security features
const createSessionMiddleware = () => {
    const redisClient = getRedisClient();

    const store = new RedisStore({
        client: redisClient,
        prefix: 'session:',
        ttl: 7 * 24 * 60 * 60 // 7 days in seconds
    });

    return session({
        store,
        secret: process.env.SESSION_SECRET || 'drivo-session-secret-change-in-prod',
        resave: false,
        saveUninitialized: false,
        rolling: true, // Reset TTL on every active request
        genid: () => crypto.randomUUID(), // Crypto-random session IDs
        name: 'drivo.sid', // Custom cookie name (not default 'connect.sid')
        cookie: {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict', // Strict in all environments for CSRF protection
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in ms
        }
    });
};

module.exports = { createSessionMiddleware };
