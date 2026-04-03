import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: process.env.FE_ORIGIN || true,
    credentials: true,
  });
  const port = process.env.PORT || 3002; // Fallback to port 3002 if PORT is not defined
  await app.listen(port);
  console.log(`API Gateway running on port ${port}`);
}
bootstrap();
