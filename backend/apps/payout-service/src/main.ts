// Must run before anything else is imported. app.module.ts reads
// process.env.RABBITMQ_URL at module-file top-level scope (needed to build
// the RabbitMQModule.forRoot() import list before Nest's own module
// resolution starts) — ConfigModule.forRoot() inside that same file only
// populates process.env once Nest actually processes it as an import,
// which is too late for a statement that runs at file-load time. Confirmed
// live: without this, RABBITMQ_URL reads as undefined, RabbitMQ is silently
// treated as "not configured", and no exchange is ever declared — no error,
// just quiet no-op.
import 'dotenv/config';

import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as express from 'express';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './filters/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('PayoutService');

  // Raw body middleware — required for Stripe webhook signature validation
  app.use('/v1/webhooks/stripe', express.raw({ type: 'application/json' }));
  // PS-36 §10: same reasoning — Wise Platform's HMAC-SHA256 signature check
  // needs the exact raw bytes Wise signed, not Nest's parsed JSON body.
  app.use('/v1/webhooks/wise-platform', express.raw({ type: 'application/json' }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());

  app.enableCors({
    origin: process.env.FE_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Payout Service')
    .setDescription('Marketeq payout-service')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3022;
  await app.listen(port);
  logger.log(`payout-service running on port ${port}`);
}
bootstrap();
