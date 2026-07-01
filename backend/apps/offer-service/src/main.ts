// apps/offer-service/src/main.ts
// OS-08 + OS-13: Entry point — global prefix, exception filter, validation pipe
// OS-35: Structured JSON logger, request logger interceptor
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { OfferExceptionFilter } from './filters/offer-exception.filter';
import { OfferLoggerService } from './common/logger/offer-logger.service';
import { RequestLoggerInterceptor } from './common/interceptors/request-logger.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // OS-35: Attach structured JSON logger
  app.useLogger(app.get(OfferLoggerService));

  // OS-35: Global request/response logger
  app.useGlobalInterceptors(new RequestLoggerInterceptor());

  app.setGlobalPrefix('v1');
  app.useGlobalFilters(new OfferExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.enableCors();

  const port = process.env.PORT || 3025;
  await app.listen(port);

  app.get(OfferLoggerService).logWithData(
    'info',
    `offer-service listening on port ${port}`,
    'Bootstrap',
    { port, version: process.env.APP_VERSION ?? 'dev', nodeEnv: process.env.NODE_ENV },
  );
}

bootstrap().catch((err) => {
  process.stderr.write(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      service: 'offer-service',
      message: 'Bootstrap failed',
      error: String(err),
    }) + '\n',
  );
  process.exit(1);
});