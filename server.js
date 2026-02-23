// Load environment variables FIRST (before any config reads process.env)
require('dotenv').config();

const { connectDB, disconnectDB } = require('./src/config/database');
const { connectRedis } = require('./src/config/redis');
const { connectRabbitMQ } = require('./src/config/rabbitmq');
const { startOtpWorker, startPasswordResetWorker } = require('./src/workers/otpWorker');
const { startNotificationWorker } = require('./src/workers/notificationWorker');
const { initSocket } = require('./src/config/socket');

const bootstrap = async () => {
  // Connect MongoDB
  await connectDB();

  // Connect Redis
  await connectRedis();

  // Load app after Redis is ready
  const app = require('./src/app');

  // Connect RabbitMQ and start workers
  try {
    await connectRabbitMQ();
    await startOtpWorker();
    await startPasswordResetWorker();
    await startNotificationWorker();
  } catch (err) {
    console.error('⚠️  RabbitMQ bootstrap failed:', err.message);
  }

  // Start HTTP server
  const PORT = process.env.PORT || 5000;
  const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });

  // Initialize Socket.io
  initSocket(server);

  // Graceful shutdown logic
  const shutdown = async (signal) => {
    console.log(`\n🛑 ${signal} received. Shutting down...`);
    server.close(async () => {
      await disconnectDB();
      console.log('✅ Shutdown complete.');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (err) => {
    console.error('❌ UNHANDLED REJECTION:', err.message);
    server.close(() => process.exit(1));
  });

  process.on('uncaughtException', (err) => {
    console.error('❌ UNCAUGHT EXCEPTION:', err.message);
    process.exit(1);
  });

  return server;
};

bootstrap();
