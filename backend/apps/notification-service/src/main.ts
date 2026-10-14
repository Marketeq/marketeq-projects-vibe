import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions } from '@nestjs/microservices';
import { NotificationServiceModule } from './notification-service.module';
import { AckingServerRMQ } from './delivery/acking-server-rmq';
import { NotificationDeliveryService } from './delivery/notification-delivery.service';
import { NOTIFICATION_QUEUE } from './delivery/delivery.constants';
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
    // Manual acknowledgment: a message is acknowledged only once it has been handled (see
    // delivery/). The queue declaration is unchanged - durable, no arguments - so producers and
    // existing deployments are unaffected; retry and dead-letter queues are separate, new queues.
    const delivery = app.get(NotificationDeliveryService);
    app.connectMicroservice<MicroserviceOptions>({
      strategy: new AckingServerRMQ(
        {
          urls: [rabbitMqUrl],
          queue: NOTIFICATION_QUEUE,
          queueOptions: { durable: true },
          noAck: false,
          prefetchCount: 10,
        },
        (channel) => delivery.ensureTopology(channel),
      ),
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
