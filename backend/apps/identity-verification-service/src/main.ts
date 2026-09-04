import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './utils/all-exceptions.filter';

const logger = new Logger('IdentityVerificationService');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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

  app.useGlobalFilters(new AllExceptionsFilter());

  const port = process.env.PORT || 3019;
  await app.listen(port);

  logger.log(`Identity Verification Service is running on port ${port}`);
}

bootstrap().catch((err) => {
  logger.error('Failed to start Identity Verification Service', err);
  process.exit(1);
});
