import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { requestIdMiddleware } from './common/middleware/request-id.middleware';
import { assertRequiredConfig } from './common/config/required-config';
import { IDENTITY_VERIFICATION_RPC_QUEUE } from './common/gate/account-gate-decision';

async function bootstrap() {
  // Fails fast (variable names only) if Free KYC configuration is missing.
  assertRequiredConfig();

  const app = await NestFactory.create(AppModule, { rawBody: true });
  const logger = new Logger('IdentityVerificationService');

  // Dev-only: the Sandbox Didit test harness page
  // (frontend/app/identity-verification-preview) calls this service
  // directly from the browser rather than through the API Gateway (which
  // sets CORS in every other environment) — see
  // identity-verification-sandbox.controller.ts. Never enabled outside
  // development.
  if (process.env.NODE_ENV === 'development') {
    app.enableCors();
  }

  app.use(requestIdMiddleware);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  // Request/reply queue for the verification-gate check that consuming
  // services (e.g. invitations-service) send over RabbitMQ. Same broker
  // variable resolution as the other RMQ services (RABBITMQ_URI, falling back
  // to RABBITMQ_URL, which this service's event publisher already uses).
  // A separate queue from any event traffic, default deserializer, auto-ack:
  // a dropped request just times out on the caller, which fails closed.
  const rabbitmqUrl = process.env.RABBITMQ_URI || process.env.RABBITMQ_URL;
  if (rabbitmqUrl) {
    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.RMQ,
      options: {
        urls: [rabbitmqUrl],
        queue: IDENTITY_VERIFICATION_RPC_QUEUE,
        queueOptions: { durable: true },
        noAck: true,
      },
    });
  } else {
    logger.warn(
      'RABBITMQ_URI/RABBITMQ_URL not set; verification-gate RPC listener disabled - consuming services will fail closed',
    );
  }

  await app.listen(process.env.PORT ?? 3019);

  // After listen(), and non-fatal, so a broker problem never takes the HTTP
  // API down with it.
  if (rabbitmqUrl) {
    app.startAllMicroservices().catch((err) => {
      logger.error('Failed to start verification-gate RPC listener', err);
    });
  }
}
bootstrap();
