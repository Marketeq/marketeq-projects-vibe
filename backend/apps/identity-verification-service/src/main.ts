import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { requestIdMiddleware } from './common/middleware/request-id.middleware';
import { assertRequiredConfig } from './common/config/required-config';

async function bootstrap() {
  // Fails fast (variable names only) if Free KYC configuration is missing.
  assertRequiredConfig();

  const app = await NestFactory.create(AppModule, { rawBody: true });

  // Dev-only: the Sandbox Didit test harness page
  // (frontend/app/identity-verification-preview) calls this service
  // directly from the browser rather than through the API Gateway (which
  // sets CORS in every other environment) — see
  // identity-verification-sandbox.controller.ts. Never enabled outside
  // development.
  if (process.env.NODE_ENV === 'development') {
    app.enableCors();
  }

  app.use(requestIdMiddleware);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  await app.listen(process.env.PORT ?? 3019);
}
bootstrap();
