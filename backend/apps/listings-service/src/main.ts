import 'dotenv/config';
import 'reflect-metadata'; // <-- must be first
import { existsSync } from 'fs';
import { join } from 'path';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

// Inlined from libs/owner-target-grpc to avoid cross-project rootDir issues.
function resolveOwnerTargetProtoPath(): string {
  const fromEnv = process.env.OWNER_TARGET_PROTO_PATH;
  if (fromEnv && existsSync(fromEnv)) return fromEnv;
  const cwd = process.cwd();
  const candidates = [
    join(cwd, 'libs/owner-target-grpc/proto/owner_target.proto'),
    join(cwd, '..', 'libs/owner-target-grpc/proto/owner_target.proto'),
    join(cwd, '..', '..', 'libs/owner-target-grpc/proto/owner_target.proto'),
    join(__dirname, '../../../../libs/owner-target-grpc/proto/owner_target.proto'),
    join(__dirname, '../../../../../libs/owner-target-grpc/proto/owner_target.proto'),
  ];
  for (const p of candidates) if (existsSync(p)) return p;
  throw new Error(
    `owner_target.proto not found. Set OWNER_TARGET_PROTO_PATH. cwd=${cwd} __dirname=${__dirname}`,
  );
}

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

  try {
    app.connectMicroservice({
      transport: Transport.GRPC,
      options: {
        package: 'owner_target',
        protoPath: resolveOwnerTargetProtoPath(),
        url: `${grpcHost}:${grpcPort}`,
      },
    });
    await app.startAllMicroservices();
  } catch (err: any) {
    logger.warn(`gRPC server failed to start on ${grpcHost}:${grpcPort} (non-fatal): ${err.message}`);
  }

  const httpPort = Number(process.env.PORT ?? 3004);
  const httpHost = process.env.HOST || '0.0.0.0';
  await app.listen(httpPort, httpHost);
  logger.log(
    `Listings Service HTTP on ${httpHost}:${httpPort}, gRPC (owner-target) on ${grpcHost}:${grpcPort}`,
  );
}
bootstrap();
