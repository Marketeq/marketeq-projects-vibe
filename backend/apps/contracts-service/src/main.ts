import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions } from '@nestjs/microservices';
import { ContractsServiceModule } from './contracts-service.module';
import { getRabbitMQConfig } from '../../../shared/config/rabbitmq.config';
import { QUEUE_NAMES } from '../../../shared/types/events.types';

async function bootstrap() {
  const app = await NestFactory.create(ContractsServiceModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000'];
  app.enableCors({ origin: allowedOrigins, credentials: true });

  app.connectMicroservice<MicroserviceOptions>(
    getRabbitMQConfig(QUEUE_NAMES.CONTRACTS),
  );

  await app.startAllMicroservices();
  const port = process.env.PORT || 3010;
  await app.listen(port);
  console.log(`contracts-service running on port ${port}`);
}
bootstrap();
