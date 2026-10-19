import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('UserService');
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT || 3002;

  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ limit: '1mb', extended: true }));

  app.enableCors({
    origin: process.env.FE_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // RMQ consumer for cms.talent-profile.sync (per CS-05 / TalentProfile spec).
  // cms-service publishes raw payloads via amqp-connection-manager — the
  // deserializer lifts the publisher's `event` field into NestJS's `pattern`
  // slot so @EventPattern handlers fire (same trick as category-service).
  const rabbitmqUrl = process.env.RABBITMQ_URI || process.env.RABBITMQ_URL;
  if (rabbitmqUrl) {
    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.RMQ,
      options: {
        urls: [rabbitmqUrl],
        queue: 'cms.talent-profile.sync',
        queueOptions: {
          durable: true,
          arguments: {
            'x-dead-letter-exchange': 'cms.events.dlx',
            'x-message-ttl': 30000,
          },
        },
        noAck: false,
        prefetchCount: 1,
        deserializer: {
          deserialize: (value: unknown) => {
            const v = (value ?? {}) as { event?: string };
            return { pattern: v.event, data: value };
          },
        },
      },
    });
    logger.log('RabbitMQ microservice connected (queue: cms.talent-profile.sync)');

    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.RMQ,
      options: {
        urls: [rabbitmqUrl],
        queue: 'user_service_queue',
        queueOptions: { durable: true },
      },
    });
    logger.log('RabbitMQ microservice connected (queue: user_service_queue)');

    // G1: identity-verification-service's identity.gate_changed event, on this service's own
    // durable queue (the declaration must match the publisher's: durable, no arguments).
    // Manual ack: a decision is acknowledged only after it was written.
    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.RMQ,
      options: {
        urls: [rabbitmqUrl],
        queue: 'user_service_gate_queue',
        queueOptions: { durable: true },
        noAck: false,
        prefetchCount: 20,
      },
    });
    logger.log('RabbitMQ microservice connected (queue: user_service_gate_queue)');
  } else {
    logger.warn('RABBITMQ_URL not set — talent-profile sync consumer disabled');
  }

  await app.startAllMicroservices();
  const host = process.env.HOST || '0.0.0.0';
  await app.listen(port, host);
  logger.log(`User Service is running on ${host}:${port}`);
}
bootstrap();
