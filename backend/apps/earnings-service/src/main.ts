import { NestFactory }                   from '@nestjs/core';
import { ValidationPipe, Logger }        from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService }                 from '@nestjs/config';
import { AppModule }                     from './app.module';

async function bootstrap() {
  const logger = new Logger('EarningsService');
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, transform: true,
    transformOptions: { enableImplicitConversion: true },
  }));

  const configService = app.get(ConfigService);

  app.setGlobalPrefix('v1');
  app.enableCors({
    origin: configService.get<string>('FE_ORIGIN') || 'http://localhost:3000',
  });
  const rabbitmqUrl = configService.get<string>('earnings.rabbitmqUrl');

  // Connect RabbitMQ microservice transport only if RABBITMQ_URL is set
  if (rabbitmqUrl) {
    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.RMQ,
      options: {
        urls:         [rabbitmqUrl],
        queue:        'earnings.events',
        prefetchCount: parseInt(configService.get<string>('RABBITMQ_PREFETCH') || '10', 10),
        noAck:        false,
        queueOptions: {
          durable:   true,
          arguments: {
            'x-dead-letter-exchange': 'marketeq.dlx',
            'x-message-ttl':          86400000,
          },
        },
      },
    });
    await app.startAllMicroservices();
    logger.log('RabbitMQ consumers connected');
  } else {
    logger.warn('RABBITMQ_URL not set — RabbitMQ consumers disabled');
  }

  const port = configService.get<number>('earnings.port') || 3026;
  await app.listen(port);
  logger.log(`earnings-service is running on port ${port}`);
  logger.log(`Environment: ${configService.get<string>('earnings.nodeEnv')}`);
}
bootstrap();
