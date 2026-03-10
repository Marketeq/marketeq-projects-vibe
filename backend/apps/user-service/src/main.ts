import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { UserServiceModule } from './user-service.module';

async function bootstrap() {
  const app = await NestFactory.create(UserServiceModule);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  // Only connect RabbitMQ if explicitly enabled
  if (process.env.ENABLE_RABBITMQ === 'true') {
    const { Transport } = await import('@nestjs/microservices');
    app.connectMicroservice({
      transport: Transport.RMQ,
      options: {
        urls: [process.env.RABBITMQ_URI || 'amqp://localhost:5672'],
        queue: 'user_service_queue',
        queueOptions: { durable: true },
      },
    });
    await app.startAllMicroservices();
    console.log('RabbitMQ microservice connected');
  }

  await app.listen(process.env.PORT || 3002);
  console.log(`user-service running on port ${process.env.PORT || 3002}`);
}
bootstrap();
