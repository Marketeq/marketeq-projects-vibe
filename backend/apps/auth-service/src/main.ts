import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AuthServiceModule } from './auth-service.module';
// import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AuthServiceModule);
  const configuredOrigins = (process.env.FRONTEND_URL || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  app.enableCors({
    origin:
      configuredOrigins.length === 0
        ? 'http://localhost:3000'
        : configuredOrigins.length === 1
          ? configuredOrigins[0]
          : configuredOrigins,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger disabled — express/path-to-regexp incompatibility
  // Re-enable after upgrading @nestjs/swagger or express

  const port = process.env.PORT || 3001;
  await app.listen(port);
  Logger.log(`Authentication Service running on port ${port}`);
}
bootstrap();
