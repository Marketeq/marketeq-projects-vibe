import { NestFactory } from '@nestjs/core'
import { MicroserviceOptions, Transport } from '@nestjs/microservices'
import { AppModule } from './app/app.module'
import { Logger, ValidationPipe } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'

async function bootstrap() {
  const logger = new Logger('CategoryService')
  const app = await NestFactory.create(AppModule)

  // Connect RabbitMQ microservice if RABBITMQ_URL is set
  const rabbitmqUrl = process.env.RABBITMQ_URL
  if (rabbitmqUrl) {
    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.RMQ,
      options: {
        urls: [rabbitmqUrl],
        queue: 'cms.category.category',
        queueOptions: {
          durable: true,
          arguments: {
            'x-dead-letter-exchange': 'cms.events.dlx',
            'x-message-ttl': 30000,
          },
        },
        noAck: false,
        prefetchCount: 1,
        // cms-service publishes raw payloads via amqp-connection-manager —
        // `{ event: 'category.saved', ...fields }` — straight to the
        // `cms.events` topic exchange. NestJS's default RMQ deserializer
        // expects its own `{ pattern, data }` envelope and nacks anything
        // else with "Pattern: undefined". This deserializer lifts the
        // publisher's `event` field into the `pattern` slot so
        // @EventPattern handlers fire correctly.
        deserializer: {
          deserialize: (value: unknown) => {
            const v = (value ?? {}) as { event?: string };
            return { pattern: v.event, data: value };
          },
        },
      },
    })
    logger.log('RabbitMQ microservice connected (queue: cms.category.category)')
  } else {
    logger.warn('RABBITMQ_URL not set — category event consumer disabled')
  }

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
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'x-preview-token', 'x-service-token'],
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

  if (rabbitmqUrl) {
    app.startAllMicroservices().catch((error) => {
      logger.error('Failed to start category RMQ microservice', error)
    })
  }
}

bootstrap()
