import { config as loadEnv } from 'dotenv';
loadEnv(); // Load .env before anything reads process.env

import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { json } from 'express';
import { AppModule } from './app.module';
import { loadConfig } from './config/config.schema';
import { ParseException } from './common/errors/parse.exception';

async function bootstrap() {
  const logger = new Logger('ResumeParsingService');

  // Validate config before anything else
  let config;
  try {
    config = loadConfig();
  } catch (err) {
    logger.error(`Configuration error: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }

  const app = await NestFactory.create(AppModule);

  // 6MB body limit to let our file validator handle the error message
  app.use(json({ limit: '6mb' }));

  // Global exception filter
  app.useGlobalFilters({
    catch(exception: any, host: any) {
      const ctx = host.switchToHttp();
      const response = ctx.getResponse();

      if (exception instanceof ParseException) {
        const body = exception.getResponse() as any;
        response.status(exception.getStatus()).json(body);
        return;
      }

      const status = exception?.getStatus?.() || 500;
      const message = exception?.message || 'Internal server error';

      // Never leak stack traces
      logger.error(`Unhandled exception: ${message}`, exception?.stack);
      response.status(status).json({
        errorCode: 'INTERNAL_ERROR',
        message: status >= 500 ? 'An unexpected error occurred' : message,
      });
    },
  });

  app.enableShutdownHooks();

  const host = '0.0.0.0';
  await app.listen(config.port, host);
  logger.log(`Resume Parsing Service running on ${host}:${config.port}`);
  logger.log(`Model: ${config.modelId}, Confidence threshold: ${config.confidenceThreshold}`);
}

bootstrap();
