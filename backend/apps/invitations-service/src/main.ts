import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { InvitationsServiceModule } from './invitations-service.module';

async function bootstrap() {
  const app = await NestFactory.create(InvitationsServiceModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true });

  const port = process.env.PORT || 3013;
  const host = process.env.HOST || '0.0.0.0';
  await app.listen(port, host);
  console.log(`invitations-service running on ${host}:${port}`);
}
bootstrap();
