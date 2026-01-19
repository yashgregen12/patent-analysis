import amqp from 'amqplib';

let connection;
let channel;
let useMemoryQueue = false;
const memoryQueue = [];
let memoryConsumer = null;

const QUEUE_NAME = 'patent_jobs';

export async function connectQueue() {
    try {
        const amqpUrl = process.env.RABBITMQ_URL || 'amqp://localhost';
        connection = await amqp.connect(amqpUrl);
        channel = await connection.createChannel();
        await channel.assertQueue(QUEUE_NAME, { durable: true });
        console.log('[QUEUE] Connected to RabbitMQ');
        useMemoryQueue = false;
    } catch (error) {
        console.warn('[QUEUE] RabbitMQ unavailable, using in-memory queue (dev mode)');
        console.warn('[QUEUE] To use RabbitMQ, set RABBITMQ_URL in .env or install locally');
        useMemoryQueue = true;
    }
}

export async function enqueue(data) {
    if (!channel && !useMemoryQueue) await connectQueue();

    if (useMemoryQueue) {
        console.log(`[QUEUE] Enqueuing job to memory: ${data.type}`);
        memoryQueue.push(data);
        // Process immediately if consumer is registered
        if (memoryConsumer) {
            processMemoryQueue();
        }
    } else if (channel) {
        channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(data)), {
            persistent: true
        });
    }
}

async function processMemoryQueue() {
    while (memoryQueue.length > 0 && memoryConsumer) {
        const job = memoryQueue.shift();
        try {
            await memoryConsumer(job);
        } catch (err) {
            console.error('[QUEUE] Memory job failed:', err.message);
        }
    }
}

export async function consume(callback) {
    if (!channel && !useMemoryQueue) await connectQueue();

    if (useMemoryQueue) {
        console.log('[QUEUE] Memory consumer registered, waiting for jobs...');
        memoryConsumer = callback;
        // Process any pending jobs
        processMemoryQueue();
    } else if (channel) {
        channel.consume(QUEUE_NAME, async (msg) => {
            if (msg !== null) {
                const job = JSON.parse(msg.content.toString());
                await callback(job);
                channel.ack(msg);
            }
        }, { noAck: false });
    }
}