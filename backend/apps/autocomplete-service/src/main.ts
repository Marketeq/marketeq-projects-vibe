import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { AutocompleteServiceModule } from './autocomplete-service.module';

async function bootstrap() {
  const logger = new Logger('AutocompleteService');
  const app = await NestFactory.create(AutocompleteServiceModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true });

  const rabbitmqUrl = process.env.RABBITMQ_URI;
  if (rabbitmqUrl) {
    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.RMQ,
      options: {
        urls: [rabbitmqUrl],
        queue: 'autocomplete_service_queue',
        queueOptions: { durable: true },
      },
    });
  } else {
    logger.warn('RABBITMQ_URI not set; autocomplete RMQ consumer disabled');
  }

  const port = process.env.PORT || 3016;
  await app.listen(port);
  logger.log(`autocomplete-service running on port ${port}`);

  if (rabbitmqUrl) {
    app.startAllMicroservices().catch((error) => {
      logger.error('Failed to start autocomplete RMQ microservice', error);
    });
  }
}
bootstrap();
