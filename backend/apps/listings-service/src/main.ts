import 'reflect-metadata'; // <-- must be first
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import { resolveOwnerTargetProtoPath } from '@libs/owner-target-grpc';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('ListingsService');
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, errorHttpStatusCode: 422 }));

  const grpcPort = Number(process.env.LISTINGS_SERVICE_GRPC_PORT ?? 50052);
  // Default gRPC to loopback; set GRPC_HOST=0.0.0.0 only when exposing externally.
  const grpcHost = process.env.GRPC_HOST || '127.0.0.1';

  app.enableCors({
    origin: process.env.FE_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  app.connectMicroservice({
    transport: Transport.GRPC,
    options: {
      package: 'owner_target',
      protoPath: resolveOwnerTargetProtoPath(),
      url: `${grpcHost}:${grpcPort}`,
    },
  });
  await app.startAllMicroservices();

  const httpPort = Number(process.env.PORT ?? 3004);
  await app.listen(httpPort, '0.0.0.0');
  logger.log(
    `Listings Service HTTP on ${httpPort}, gRPC (owner-target) on ${grpcHost}:${grpcPort}`,
  );
}
bootstrap();
