import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { AdminServiceModuleModule } from './admin-service.module';

async function bootstrap() {
  const app = await NestFactory.create(AdminServiceModuleModule);
  const logger = new Logger('AdminService');

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  // Was `origin: FE_ORIGIN || 'http://localhost:3000'` with credentials, which
  // made a page on any developer's machine a trusted credentialed origin in
  // production — the same defect fixed at the gateway. This service is behind
  // the gateway and has no browser-facing routes left, so it needs no CORS at
  // all; the localhost default is gone rather than merely narrowed.
  if (process.env.FE_ORIGIN) {
    app.enableCors({ origin: process.env.FE_ORIGIN, credentials: true });
  }

  const rabbitmqUrl = process.env.RABBITMQ_URI || process.env.RABBITMQ_URL;
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
    logger.warn('RABBITMQ_URI not set; RMQ consumer disabled');
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
