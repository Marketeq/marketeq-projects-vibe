import { NestFactory } from '@nestjs/core'
import { Logger, ValidationPipe } from '@nestjs/common'
import { Transport, MicroserviceOptions } from '@nestjs/microservices'
import { SearchServiceModule } from './search-service.module'

async function bootstrap() {
  const app = await NestFactory.create(SearchServiceModule)
  const logger = new Logger('SearchService')
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
  app.enableCors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true })

  // boot-all.js sets RABBITMQ_INBOX_ENABLED=false: nothing publishes to this
  // queue, and the consumer would hold one of the broker's 40 connections.
  const inboxDisabled = process.env.RABBITMQ_INBOX_ENABLED === 'false'
  const rabbitmqUrl = inboxDisabled ? undefined : process.env.RABBITMQ_URI || process.env.RABBITMQ_URL
  if (rabbitmqUrl) {
    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.RMQ,
      options: {
        urls: [rabbitmqUrl],
        queue: 'search_service_queue',
        queueOptions: { durable: true },
      },
    })
  } else {
    logger.warn(`${inboxDisabled ? 'RABBITMQ_INBOX_ENABLED=false' : 'RABBITMQ_URI not set'}; RMQ consumer disabled`)
  }

  const port = process.env.PORT || 3007
  await app.listen(port)
  logger.log(`search-service running on port ${port}`)

  if (rabbitmqUrl) {
    app.startAllMicroservices().catch((err) => {
      logger.error('Failed to start RMQ microservice', err)
    })
  }
}
bootstrap()
