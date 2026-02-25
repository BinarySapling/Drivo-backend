const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { getRedisClient } = require('../config/redis');

/**
 * Build a rate limiter backed by Redis.
 *
 * The limiter instance is created at module load time (required by express-rate-limit v7+).
 * The RedisStore uses a lazy `sendCommand` — getRedisClient() is only called when an
 * actual request comes in, by which point connectRedis() has already run in server.js.
 *
 * @param {object} opts
 * @param {number}  opts.windowMs
 * @param {number}  opts.max
 * @param {string}  opts.prefix
 * @param {string}  opts.message
 * @param {boolean} [opts.skipSuccessfulRequests]
 */
const createRedisLimiter = ({ windowMs, max, prefix, message, skipSuccessfulRequests = false }) => {
    const store = new RedisStore({
        // sendCommand is called per-request — Redis is connected by then
        sendCommand: (...args) => getRedisClient().call(...args),
        prefix
    });

    return rateLimit({
        windowMs,
        max,
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests,
        message: { success: false, message },
        store
    });
};

// ─── Tiered Limiters ──────────────────────────────────────────────────────────
// All created at module load time (satisfies express-rate-limit ERR_ERL_CREATED_IN_REQUEST_HANDLER)

const globalLimiter = createRedisLimiter({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    prefix: 'rl:global:',
    message: 'Too many requests from this IP, please try again later.'
});

const authLimiter = createRedisLimiter({
    windowMs: 15 * 60 * 1000,
    max: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 10,
    prefix: 'rl:auth:',
    message: 'Too many authentication attempts. Please try again in 15 minutes.'
});

const otpLimiter = createRedisLimiter({
    windowMs: 10 * 60 * 1000,
    max: parseInt(process.env.OTP_RATE_LIMIT_MAX) || 3,
    prefix: 'rl:otp:',
    message: 'Too many OTP requests. Please wait 10 minutes before requesting another.'
});

module.exports = { globalLimiter, authLimiter, otpLimiter };
