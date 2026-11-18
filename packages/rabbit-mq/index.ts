import amqplib, { type Channel } from "amqplib";
import dotenv from "dotenv";

dotenv.config({
    path:'.env'
})

let channel: Promise<Channel> | undefined;

// One connection per process, reused by every publish; dropped on close so the next call reconnects.
function getChannel(): Promise<Channel> {
    if (!channel) {
        channel = amqplib.connect(process.env.RABBITMQQ_ENV as string).then((connection) => {
            connection.on("error", (error) => console.error("RabbitMQ connection error:", error.message));
            connection.on("close", () => { channel = undefined; });
            return connection.createChannel();
        });
        channel.catch(() => { channel = undefined; });
    }
    return channel;
}

export async function publishToQueue(queueName: string, message: string) {
    const ch = await getChannel();
    await ch.assertQueue(queueName, { durable: true });
    ch.sendToQueue(queueName, Buffer.from(message), { persistent: true });
    return true;
}

// Acks only after the callback finishes, so a crash mid-job redelivers it. At most `concurrency` jobs run at once.
export async function consumeFromQueue(
    queueName: string,
    callback: (message: string) => Promise<void> | void,
    concurrency = 1,
) {
    const ch = await getChannel();
    // A consumer whose channel died is silently idle: exit so the process supervisor restarts it.
    ch.on("close", () => {
        console.error("RabbitMQ consumer channel closed, exiting");
        process.exit(1);
    });
    await ch.assertQueue(queueName, { durable: true });
    await ch.prefetch(concurrency);
    await ch.consume(queueName, async (msg) => {
        if (!msg) return;
        try {
            await callback(msg.content.toString());
            ch.ack(msg);
        } catch (error) {
            console.error("Queue job failed:", error);
            // Retry once, then drop, so a poison message cannot loop forever.
            ch.nack(msg, false, !msg.fields.redelivered);
        }
    });
}
