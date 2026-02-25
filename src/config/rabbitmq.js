const amqplib = require('amqplib');

let connection = null;
let channel = null;

const RECONNECT_DELAY_MS = 5000;

// Connect to RabbitMQ with retry logic
const connectRabbitMQ = async () => {
    const url = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
    try {
        connection = await amqplib.connect(url);
        channel = await connection.createChannel();

        console.log('✅ RabbitMQ connected successfully');

        // Handle unexpected connection close
        connection.on('close', () => {
            console.warn('⚠️  RabbitMQ connection closed. Reconnecting...');
            channel = null;
            connection = null;
            setTimeout(connectRabbitMQ, RECONNECT_DELAY_MS);
        });

        connection.on('error', (err) => {
            console.error('❌ RabbitMQ connection error:', err.message);
        });
    } catch (err) {
        console.error('❌ Failed to connect to RabbitMQ:', err.message);
        console.log(`🔄 Retrying RabbitMQ connection in ${RECONNECT_DELAY_MS / 1000}s...`);
        setTimeout(connectRabbitMQ, RECONNECT_DELAY_MS);
    }
};

// Get active RabbitMQ channel
const getChannel = () => {
    if (!channel) {
        throw new Error('RabbitMQ channel not initialized. Call connectRabbitMQ() first.');
    }
    return channel;
};

// Publish JSON payload to queue
const publishToQueue = async (queue, payload) => {
    const ch = getChannel();
    await ch.assertQueue(queue, { durable: true });
    ch.sendToQueue(queue, Buffer.from(JSON.stringify(payload)), {
        persistent: true // messages survive broker restart
    });
};

// Register queue consumer
const consumeQueue = async (queue, handler) => {
    const ch = getChannel();
    await ch.assertQueue(queue, { durable: true });
    ch.prefetch(1); // process one message at a time

    ch.consume(queue, async (msg) => {
        if (!msg) return;
        let payload;
        try {
            payload = JSON.parse(msg.content.toString());
            await handler(payload);
            ch.ack(msg);
        } catch (err) {
            console.error(`❌ RabbitMQ consumer error on queue "${queue}":`, err.message);
            ch.nack(msg, false, false); // discard — no requeue on permanent failure
        }
    });

    console.log(`📥 RabbitMQ consumer listening on queue: "${queue}"`);
};

module.exports = { connectRabbitMQ, getChannel, publishToQueue, consumeQueue };
