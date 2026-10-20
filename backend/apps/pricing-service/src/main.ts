import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const rabbitmqUrl = process.env.RABBITMQ_URI || process.env.RABBITMQ_URL;
  if (rabbitmqUrl) {
    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.RMQ,
      options: {
        urls: [rabbitmqUrl],
        queue: 'pricing_service_queue',
        queueOptions: { durable: true },
      },
    });
    await app.startAllMicroservices();
    console.log('pricing-service RabbitMQ consumer on pricing_service_queue');
  } else {
    console.warn('RABBITMQ_URL not set, pricing RPC consumer disabled');
  }

  const port = process.env.PORT ?? '3029';
  await app.listen(port);
  console.log(`pricing-service running on port ${port}`);
}

bootstrap();
