import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { UtimeUtrackingUserviceModule } from './time-tracking-service.module';

async function bootstrap() {
  const app = await NestFactory.create(UtimeUtrackingUserviceModule);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URI || 'amqp://localhost:5672'],
      queue: 'time_tracking_service_queue',
      queueOptions: { durable: true },
    },
  });

  await app.startAllMicroservices();
  await app.listen(process.env.PORT || 3017);
  console.log(`UtimeUtrackingUservice running on port ${process.env.PORT || 3017}`);
}
bootstrap();
