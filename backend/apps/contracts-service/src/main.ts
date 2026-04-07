import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('ContractsService');
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT || 3010;

  app.enableCors({
    origin: process.env.FE_ORIGIN || 'http://localhost:3000',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(port);
  logger.log(`Contracts Service is running on port ${port}`);
}

bootstrap();
