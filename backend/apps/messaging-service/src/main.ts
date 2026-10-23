import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { MessagingServiceModule } from './messaging-service.module';
import { getRabbitMqUrl, isRabbitMqReachable, redactRabbitMqUrl, shouldRequireRabbitMq } from '../../../shared/utils';

async function bootstrap() {
  const logger = new Logger('MessagingServiceBootstrap');
  const app = await NestFactory.create(MessagingServiceModule);
  const rabbitMqUrl = getRabbitMqUrl();
  const rabbitMqRequired = shouldRequireRabbitMq();
  // Logs never carry the broker's credentials; the connection itself uses rabbitMqUrl.
  const rabbitMqLogUrl = redactRabbitMqUrl(rabbitMqUrl);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  const rabbitMqReachable = await isRabbitMqReachable(rabbitMqUrl);
  if (rabbitMqReachable) {
    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.RMQ,
      options: {
        urls: [rabbitMqUrl],
        queue: 'messaging_service_queue',
        queueOptions: { durable: true },
      },
    });
  } else if (rabbitMqRequired) {
    throw new Error(`RabbitMQ is required but unreachable at ${rabbitMqLogUrl}`);
  } else {
    logger.warn(`RabbitMQ is unavailable at ${rabbitMqLogUrl}; starting HTTP API without RMQ consumers in local/dev mode.`);
  }

  await app.listen(process.env.PORT || 3005);
  logger.log(`messaging-service running on port ${process.env.PORT || 3005}`);

  if (rabbitMqReachable) {
    await app.startAllMicroservices();
    logger.log(`RabbitMQ transport connected at ${rabbitMqLogUrl}`);
  }
}
bootstrap();
