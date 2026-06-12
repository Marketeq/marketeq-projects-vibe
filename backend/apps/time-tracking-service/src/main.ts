import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { PgExceptionFilter } from './infra/pg-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const { json, urlencoded } = await import('express');
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ limit: '10mb', extended: true }));

  app.use(helmet());
  app.useGlobalFilters(new PgExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );

  const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:3000,http://localhost:5173')
    .split(',')
    .map((o) => o.trim());

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  });

  app.setGlobalPrefix('api');
  // Serve uploaded screenshots locally (dev only)
  const path = await import('path');
  const express = await import('express');


  if (process.env.NODE_ENV !== 'production') {
    app.use('/api/screenshot-files', (req: any, res: any, next: any) => {
      const allowed = process.env.ALLOWED_ORIGINS ?? 'http://localhost:3000,http://localhost:5173';
      res.setHeader('Access-Control-Allow-Origin', allowed);
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      next();
    }, express.static(path.join(process.cwd(), 'screenshot-uploads')));
  }

  const rabbitmqUrl = process.env.RABBITMQ_URI ?? process.env.RABBITMQ_URL;
  if (rabbitmqUrl) {
    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.RMQ,
      options: {
        urls: [rabbitmqUrl],
        queue: 'time_tracking_service_queue',
        queueOptions: { durable: true },
      },
    });
  } else {
    Logger.warn('RABBITMQ_URI not set; RMQ consumer disabled', 'Bootstrap');
  }

  const port = process.env.PORT ?? 3017;
  const host = process.env.HOST || '0.0.0.0';
  await app.listen(port, host);
  Logger.log(`time-tracking-service listening on http://${host}:${port}`, 'Bootstrap');

  if (rabbitmqUrl) {
    app.startAllMicroservices().catch((err) => {
      Logger.error('Failed to start RMQ microservice', err, 'Bootstrap');
    });
  }
}

bootstrap();
