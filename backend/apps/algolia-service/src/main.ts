import { NestFactory } from '@nestjs/core'
import { Logger, ValidationPipe } from '@nestjs/common'
import { Transport, MicroserviceOptions } from '@nestjs/microservices'
import { AlgoliaServiceModule } from './algolia-service.module'

async function bootstrap() {
  const app = await NestFactory.create(AlgoliaServiceModule)
  const logger = new Logger('AlgoliaService')
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))

  const rabbitmqUrl = process.env.RABBITMQ_URI || process.env.RABBITMQ_URL
  if (rabbitmqUrl) {
    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.RMQ,
      options: {
        urls: [rabbitmqUrl],
        queue: 'algolia_service_queue',
        queueOptions: { durable: true },
      },
    })
  } else {
    logger.warn('RABBITMQ_URI not set; RMQ consumer disabled')
  }

  const port = process.env.PORT || 3008
  await app.listen(port)
  logger.log(`algolia-service running on port ${port}`)

  if (rabbitmqUrl) {
    app.startAllMicroservices().catch((err) => {
      logger.error('Failed to start RMQ microservice', err)
    })
  }
}
bootstrap()
