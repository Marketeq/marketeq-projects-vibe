import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { BillingServiceModule } from './billing-service.module';

async function bootstrap() {
  const app = await NestFactory.create(BillingServiceModule, { rawBody: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000'];
  app.enableCors({ origin: allowedOrigins, credentials: true });

  const rabbitmqUrl = process.env.RABBITMQ_URI || process.env.RABBITMQ_URL;
  if (rabbitmqUrl) {
    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.RMQ,
      options: {
        urls: [rabbitmqUrl],
        queue: 'billing_service_queue',
        queueOptions: { durable: true },
      },
    });
  } else {
    const { Logger } = require('@nestjs/common');
    new Logger('BillingService').warn('RABBITMQ_URI not set; RMQ consumer disabled');
  }

  const port = process.env.PORT || 3027;
  await app.listen(port);
  console.log(`billing-service running on port ${port}`);

  if (rabbitmqUrl) {
    app.startAllMicroservices().catch((err) => {
      console.error('Failed to start RMQ microservice', err);
    });
  }
}
bootstrap();
