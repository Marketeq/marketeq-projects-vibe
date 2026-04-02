import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';

// Load .env from service dir first, then root
const envPaths = [
  resolve(process.cwd(), 'apps/favorites-service/.env'),
  resolve(__dirname, '..', '.env'),
  resolve(process.cwd(), '.env'),
];
for (const p of envPaths) {
  if (existsSync(p)) loadEnv({ path: p });
}

import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { FavoritesServiceModule } from './favorites-service.module';
import { AllExceptionsFilter } from './utils/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(FavoritesServiceModule);
  const logger = new Logger('Main');

  // Global DTO validation (Doc 03.1: forbidNonWhitelisted)
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  // Global exception filter (Doc 03.1)
  const httpAdapterHost = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapterHost));

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URI || 'amqp://localhost:5672'],
      queue: 'favorites_service_queue',
      queueOptions: { durable: true },
    },
  });

  await app.startAllMicroservices();
  const port = process.env.PORT || 3012;
  await app.listen(port);
  logger.log(`favorites-service running on port ${port}`);
}
bootstrap();
