import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('LegalService');
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT || 3015;

  app.enableCors({
    origin: process.env.FE_ORIGIN || 'http://localhost:3000',
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-user-id',
      'x-user-email',
      'x-user-role',
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      errorHttpStatusCode: 422, // LS-07: all DTO validation errors return 422 (not 400)
    }),
  );

  await app.listen(port);
  logger.log(`legal-service running on port ${port}`);
}

bootstrap();
