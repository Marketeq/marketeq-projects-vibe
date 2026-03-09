import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { PgExceptionFilter } from './infra/pg-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.useGlobalFilters(new PgExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );

  const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim());

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  });

  app.setGlobalPrefix('api');

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URI ?? 'amqp://localhost:5672'],
      queue: 'time_tracking_service_queue',
      queueOptions: { durable: true },
    },
  });

  await app.startAllMicroservices();
  const port = process.env.PORT ?? 3017;
  await app.listen(port, '0.0.0.0');
  Logger.log(`✅ time-tracking-service listening on http://localhost:${port}`, 'Bootstrap');
}

bootstrap();
