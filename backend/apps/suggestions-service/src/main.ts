import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { SuggestionsServiceModule } from './suggestions-service.module';

async function bootstrap() {
  const app = await NestFactory.create(SuggestionsServiceModule);
  const logger = new Logger('SuggestionsService');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true });

  const rabbitmqUrl = process.env.RABBITMQ_URI || process.env.RABBITMQ_URL;
  if (rabbitmqUrl) {
    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.RMQ,
      options: {
        urls: [rabbitmqUrl],
        queue: 'suggestions_service_queue',
        queueOptions: { durable: true },
      },
    });
  } else {
    logger.warn('RABBITMQ_URI not set; RMQ consumer disabled');
  }

  const port = process.env.PORT || 3020;
  await app.listen(port);
  logger.log(`suggestions-service running on port ${port}`);

  if (rabbitmqUrl) {
    app.startAllMicroservices().catch((err) => {
      logger.error('Failed to start RMQ microservice', err);
    });
  }
}
bootstrap();
