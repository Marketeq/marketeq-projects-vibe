import { NestFactory } from '@nestjs/core'
import { AppModule } from './app/app.module'
import { Logger, ValidationPipe } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'

async function bootstrap() {
  const logger = new Logger('CategoryService')
  const app = await NestFactory.create(AppModule)

  const globalPrefix = 'api'
  app.setGlobalPrefix(globalPrefix)

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  )

  const corsOrigins = (process.env.FE_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map(o => o.trim())
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'x-preview-token'],
  })

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('Category Service API')
    .setDescription('Category Pages and Category Management API')
    .setVersion('1.0')
    .addTag('Category Pages', 'Category page content assembly')
    .addTag('Categories', 'Category CRUD operations')
    .addTag('Tags', 'Tag management')
    .build()

  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('api/docs', app, document)

  const port = process.env.PORT || 3023
  await app.listen(port)

  logger.log(`category-service running on port ${port}`)
}

bootstrap()