const Redis = require('ioredis');

let redisClient;

// Initialize and connect to Redis
const connectRedis = () => {
  return new Promise((resolve, reject) => {
    redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      lazyConnect: false,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    });

    redisClient.once('ready', () => {
      console.log('✅ Redis connected successfully');
      resolve(redisClient);
    });

    redisClient.once('error', (err) => {
      // Only reject on the FIRST error (before ready fires)
      // Subsequent errors are handled by on('error') below
      console.error('❌ Redis connection error:', err.message);
      reject(err);
    });

    // After the first error/ready, keep logging but don't reject/resolve
    redisClient.on('error', (err) => {
      console.error('❌ Redis error:', err.message);
    });

    redisClient.on('reconnecting', () => {
      console.log('🔄 Redis reconnecting...');
    });
  });
};

const getRedisClient = () => {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call connectRedis() first.');
  }
  return redisClient;
};

module.exports = { connectRedis, getRedisClient };
