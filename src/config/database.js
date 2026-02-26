const mongoose = require('mongoose');

// Industry-grade MongoDB connection setup with pool and monitoring
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // ─── Connection Pool ──────────────────────────────────────────────────
      maxPoolSize: parseInt(process.env.MONGO_POOL_MAX) || 10,  // Max concurrent connections
      minPoolSize: parseInt(process.env.MONGO_POOL_MIN) || 2,   // Keep at least 2 alive

      // ─── Timeouts ─────────────────────────────────────────────────────────
      serverSelectionTimeoutMS: 5000,  // Fail fast if no server found in 5s
      socketTimeoutMS: 45000,          // Drop idle socket connections after 45s
      connectTimeoutMS: 10000,         // Fail initial connect attempt after 10s

      // ─── Reliability ──────────────────────────────────────────────────────
      heartbeatFrequencyMS: 10000,     // Probe server health every 10s
      retryWrites: true,               // Auto-retry failed write operations
      retryReads: true                 // Auto-retry failed read operations
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host} (pool: ${process.env.MONGO_POOL_MIN || 2}–${process.env.MONGO_POOL_MAX || 10})`);

    // ─── Connection Event Handlers ────────────────────────────────────────
    mongoose.connection.on('error', (err) => {
      console.error(`❌ MongoDB error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected — driver will attempt automatic reconnect');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected successfully');
    });

    mongoose.connection.on('close', () => {
      console.log('🔌 MongoDB connection closed');
    });

  } catch (error) {
    console.error(`❌ MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
};

// Gracefully close MongoDB connection
const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed gracefully.');
  } catch (err) {
    console.error('❌ Error closing MongoDB connection:', err.message);
  }
};

module.exports = { connectDB, disconnectDB };
