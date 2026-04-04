import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { AffiliateReferralServiceModuleModule } from './affiliate-referral-service.module';

async function bootstrap() {
  const app = await NestFactory.create(AffiliateReferralServiceModuleModule);
  const logger = new Logger('AffiliateReferralService');

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({
    origin: process.env.FE_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URI || 'amqp://localhost:5672'],
      queue: 'affiliate_referral_service_queue',
      queueOptions: { durable: true },
    },
  });

  await app.startAllMicroservices();
  const port = process.env.PORT || 3021;
  await app.listen(port);
  logger.log(`affiliate-referral-service running on port ${port}`);
}
bootstrap();
