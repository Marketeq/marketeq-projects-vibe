import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { Transport, MicroserviceOptions } from '@nestjs/microservices'
import { TransactionServiceModule } from './transaction-service.module'
import { GlobalExceptionFilter } from './filters/http-exception.filter'

async function bootstrap() {
  const app = await NestFactory.create(TransactionServiceModule)
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
  app.useGlobalFilters(new GlobalExceptionFilter())

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URI || 'amqp://localhost:5672'],
      queue: 'transaction_service_queue',
      queueOptions: { durable: true },
    },
  })

  await app.startAllMicroservices()
  await app.listen(process.env.PORT || 3016)
  console.log(`transaction-service running on port ${process.env.PORT || 3016}`)
}
bootstrap()
