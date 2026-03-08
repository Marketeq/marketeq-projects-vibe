import { NestFactory } from '@nestjs/core'
import { ValidationPipe, Logger } from '@nestjs/common'
import * as cookieParser from 'cookie-parser'
import { ApiGatewayModule } from './api-gateway.module'

async function bootstrap() {
  const app = await NestFactory.create(ApiGatewayModule)
  const logger = new Logger('ApiGateway')

  app.use(cookieParser())
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })

  const port = process.env.PORT || 4000
  await app.listen(port)
  logger.log(`api-gateway running on port ${port}`)
}
bootstrap()
