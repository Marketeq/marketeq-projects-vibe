import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AuthServiceModule } from './auth-service.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AuthServiceModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Create Swagger config using DocumentBuilder
  const config = new DocumentBuilder()
    .setTitle('Auth Service API')
    .setDescription('API documentation for Auth Service')
    .setVersion('1.0')
    .addTag('Authentication')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'access_token',
    )
    .build();

  // Create Swagger document
  const document = SwaggerModule.createDocument(app, config);

  // Setup Swagger UI endpoint
  SwaggerModule.setup('api-docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  Logger.log(`Authentication Service running on port ${port}`);
}
bootstrap();
