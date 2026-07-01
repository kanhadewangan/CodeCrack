import amqplib from "amqplib";
import dotenv from "dotenv";

dotenv.config({
    path:'.env'
})


console.log("RABBITMQQ_ENV", process.env.RABBITMQQ_ENV)
 async function createBroker(){
    const connection = await amqplib.connect(process.env.RABBITMQQ_ENV as string);
    const channel = await connection.createChannel();
    return channel;
}

 export async function publishToQueue(queueName: string, message: string) {
    const channel = await createBroker();
    await channel.assertQueue(queueName, { durable: true });
    channel.sendToQueue(queueName, Buffer.from(message));
    console.log(`Message sent to queue ${queueName}: ${message}`);
    return true;
}


export async function consumeFromQueue(queueName: string, callback: (message: string) => void) {
    const channel = await createBroker();
    await channel.assertQueue(queueName, { durable: true });
    channel.consume(queueName, (msg) => {
        if (msg) {
            const message = msg.content.toString();
            callback(message);
            channel.ack(msg);
        }
    });
}
createBroker().then((channel) => {
    console.log("RabbitMQ broker created successfully");
}).catch((error) => {
    console.error("Error creating RabbitMQ broker:", error);
});