import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';

// Load .env from service dir first, then root
const envPaths = [
  resolve(process.cwd(), 'apps/browsing-history-service/.env'),
  resolve(__dirname, '..', '.env'),
  resolve(process.cwd(), '.env'),
];
for (const p of envPaths) {
  if (existsSync(p)) loadEnv({ path: p });
}

import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { BrowsingHistoryServiceModule } from './browsing-history-service.module';
import { AllExceptionsFilter } from './utils/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(BrowsingHistoryServiceModule);
  const logger = new Logger('Main');

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  const httpAdapterHost = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapterHost));

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  const port = process.env.PORT || 3034;
  await app.listen(port);
  logger.log(`browsing-history-service running on port ${port}`);
}
bootstrap();
