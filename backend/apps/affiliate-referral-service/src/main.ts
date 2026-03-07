import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { UaffiliateUreferralUserviceModule } from './affiliate-referral-service.module';

async function bootstrap() {
  const app = await NestFactory.create(UaffiliateUreferralUserviceModule);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URI || 'amqp://localhost:5672'],
      queue: 'affiliate_referral_service_queue',
      queueOptions: { durable: true },
    },
  });

  await app.startAllMicroservices();
  await app.listen(process.env.PORT || 3021);
  console.log(`UaffiliateUreferralUservice running on port ${process.env.PORT || 3021}`);
}
bootstrap();
