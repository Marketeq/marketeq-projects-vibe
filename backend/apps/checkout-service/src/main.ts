import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { CheckoutServiceModule } from './checkout-service.module';

async function bootstrap() {
  const app = await NestFactory.create(CheckoutServiceModule, { rawBody: true });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  const rabbitmqUrl = process.env.RABBITMQ_URI || process.env.RABBITMQ_URL;
  if (rabbitmqUrl) {
    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.RMQ,
      options: {
        urls: [rabbitmqUrl],
        queue: 'checkout_service_queue',
        queueOptions: { durable: true },
      },
    });
  } else {
    console.warn('[CheckoutService] RABBITMQ_URI not set; RMQ consumer disabled');
  }

  const port = process.env.PORT || 3009;
  await app.listen(port);
  console.log(`checkout-service running on port ${port}`);

  if (rabbitmqUrl) {
    app.startAllMicroservices().catch((err) => {
      console.error('Failed to start RMQ microservice', err);
    });
  }
}
bootstrap();
