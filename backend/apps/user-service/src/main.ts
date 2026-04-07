import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('UserService');
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT || 3002;

  app.enableCors({
    origin: process.env.FE_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(port);
  logger.log(`User Service is running on port ${port}`);
}
bootstrap();
