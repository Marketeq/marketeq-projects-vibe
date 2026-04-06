import 'reflect-metadata'; // <-- must be first
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import { resolveOwnerTargetProtoPath } from '@libs/owner-target-grpc';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, errorHttpStatusCode: 422 }));
  const grpcPort = Number(process.env.LISTINGS_SERVICE_GRPC_PORT ?? 50052);
  app.enableCors({
    origin: 'http://localhost:3000',
    credentials: true,
  });
  
  app.connectMicroservice({
    transport: Transport.GRPC,
    options: {
      package: 'owner_target',
      protoPath: resolveOwnerTargetProtoPath(),
      url: `0.0.0.0:${grpcPort}`,
    },
  });
  await app.startAllMicroservices();

  const httpPort = Number(process.env.PORT ?? 3016);
  await app.listen(httpPort, '0.0.0.0');
  Logger.log(
    `Listings Service HTTP on ${httpPort}, gRPC (owner-target) on ${grpcPort}`,
  );
}
bootstrap();
