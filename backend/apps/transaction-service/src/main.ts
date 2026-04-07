import { NestFactory, Reflector } from '@nestjs/core';
import {
  ValidationPipe,
  Logger,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('transaction-service');
  const app = await NestFactory.create(AppModule);

  // ── Global route prefix ──────────────────────────────────────────────
  // All routes are prefixed with /v1 except /health and /ready
  app.setGlobalPrefix('v1', {
    exclude: ['health', 'ready'],
  });

  // ── Global validation pipe ───────────────────────────────────────────
  // Automatically validates all incoming DTOs using class-validator
  // whitelist: strips properties not defined in the DTO
  // forbidNonWhitelisted: throws 400 if unknown properties are sent
  // transform: auto-converts query params and body to DTO types
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ── Global exception filter ──────────────────────────────────────────
  // Formats all errors into the standard API error response shape
  app.useGlobalFilters(new GlobalExceptionFilter());

  // ── Global serialization interceptor ────────────────────────────────
  // Enables @Expose, @Exclude, and @Transform in DTOs
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector)),
  );

  // ── CORS ─────────────────────────────────────────────────────────────
  // Restrict to Marketeq frontend origin in production
  // Origins are expanded in staging and local environments
  app.enableCors({
    origin: process.env.FE_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  });

  // ── Start listening ──────────────────────────────────────────────────
  const port = process.env.PORT ?? 3018;
  await app.listen(port);

  logger.log(`Transaction Service running on port ${port}`);
  logger.log(`Health check: http://localhost:${port}/health`);
}

bootstrap();