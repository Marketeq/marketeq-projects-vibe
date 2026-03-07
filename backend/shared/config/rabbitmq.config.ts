import { Transport, MicroserviceOptions } from '@nestjs/microservices';

export function getRabbitMQConfig(queue: string): MicroserviceOptions {
  return {
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URI || 'amqp://localhost:5672'],
      queue,
      queueOptions: { durable: true },
      noAck: false,
    },
  };
}

export function getRabbitMQClientConfig(queue: string) {
  return {
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URI || 'amqp://localhost:5672'],
      queue,
      queueOptions: { durable: true },
    },
  };
}
