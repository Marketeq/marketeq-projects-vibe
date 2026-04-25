import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { NotificationServiceModule } from './notification-service.module';
import { getRabbitMqUrl, isRabbitMqReachable, shouldRequireRabbitMq } from '../../../shared/utils';

async function bootstrap() {
  const logger = new Logger('NotificationServiceBootstrap');
  const app = await NestFactory.create(NotificationServiceModule);
  const rabbitMqUrl = getRabbitMqUrl();
  const rabbitMqRequired = shouldRequireRabbitMq();

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
        queue: 'notification_service_queue',
        queueOptions: { durable: true },
      },
    });
  } else if (rabbitMqRequired) {
    throw new Error(`RabbitMQ is required but unreachable at ${rabbitMqUrl}`);
  } else {
    logger.warn(`RabbitMQ is unavailable at ${rabbitMqUrl}; starting HTTP API without RMQ consumers in local/dev mode.`);
  }

  await app.listen(process.env.PORT || 3006);
  logger.log(`notification-service running on port ${process.env.PORT || 3006}`);

  if (rabbitMqReachable) {
    await app.startAllMicroservices();
    logger.log(`RabbitMQ transport connected at ${rabbitMqUrl}`);
  }
}
bootstrap();
