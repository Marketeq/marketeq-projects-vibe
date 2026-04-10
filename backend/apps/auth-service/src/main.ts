import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AuthServiceModule } from './auth-service.module';
// import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AuthServiceModule);
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
