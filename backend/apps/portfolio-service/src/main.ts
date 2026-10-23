import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import helmet from 'helmet';
import { PortfolioServiceModule } from './portfolio-service.module';

async function bootstrap() {
  const app = await NestFactory.create(PortfolioServiceModule);

  app.use(helmet());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000'];
  app.enableCors({ origin: allowedOrigins, credentials: true });

  // boot-all.js sets RABBITMQ_INBOX_ENABLED=false: nothing publishes to this
  // queue, and the consumer would hold one of the broker's 40 connections.
  const inboxDisabled = process.env.RABBITMQ_INBOX_ENABLED === 'false';
  const rabbitmqUrl = inboxDisabled ? undefined : process.env.RABBITMQ_URI || process.env.RABBITMQ_URL;
  if (rabbitmqUrl) {
    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.RMQ,
      options: {
        urls: [rabbitmqUrl],
        queue: 'portfolio_service_queue',
        queueOptions: { durable: true },
      },
    });
  } else {
    console.warn(`[PortfolioService] ${inboxDisabled ? 'RABBITMQ_INBOX_ENABLED=false' : 'RABBITMQ_URI not set'}; RMQ consumer disabled`);
  }

  const port = process.env.PORT || 3015;
  await app.listen(port);
  console.log(`portfolio-service running on port ${port}`);

  if (rabbitmqUrl) {
    app.startAllMicroservices().catch((err) => {
      console.error('Failed to start RMQ microservice', err);
    });
  }
}
bootstrap();
