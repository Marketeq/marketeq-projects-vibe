import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { AdminServiceModuleModule } from './admin-service.module';

async function bootstrap() {
  const app = await NestFactory.create(AdminServiceModuleModule);
  const logger = new Logger('AdminService');

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({
    origin: process.env.FE_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  // boot-all.js sets RABBITMQ_INBOX_ENABLED=false: nothing publishes to this
  // queue, and the consumer would hold one of the broker's 40 connections.
  const inboxDisabled = process.env.RABBITMQ_INBOX_ENABLED === 'false';
  const rabbitmqUrl = inboxDisabled ? undefined : process.env.RABBITMQ_URI || process.env.RABBITMQ_URL;
  if (rabbitmqUrl) {
    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.RMQ,
      options: {
        urls: [rabbitmqUrl],
        queue: 'admin_service_queue',
        queueOptions: { durable: true },
      },
    });
  } else {
    logger.warn(`${inboxDisabled ? 'RABBITMQ_INBOX_ENABLED=false' : 'RABBITMQ_URI not set'}; RMQ consumer disabled`);
  }

  const port = process.env.PORT || 3018;
  await app.listen(port);
  logger.log(`admin-service running on port ${port}`);

  if (rabbitmqUrl) {
    app.startAllMicroservices().catch((err) => {
      logger.error('Failed to start RMQ microservice', err);
    });
  }
}
bootstrap();
