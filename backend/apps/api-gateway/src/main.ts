import { NestFactory } from '@nestjs/core'
import { ValidationPipe, Logger } from '@nestjs/common'
import * as cookieParser from 'cookie-parser'
import { ApiGatewayModule } from './api-gateway.module'
import { GlobalExceptionFilter } from './filters/global-exception.filter'

async function bootstrap() {
  const app = await NestFactory.create(ApiGatewayModule)
  const logger = new Logger('ApiGateway')

  app.use(cookieParser())
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
  app.useGlobalFilters(new GlobalExceptionFilter())
  const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
    .split(',')
    .map(o => o.trim())
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        logger.warn(`CORS blocked origin: ${origin}`)
        callback(null, false)
      }
    },
    credentials: true,
  })

  const port = process.env.PORT || 4000
  await app.listen(port)
  logger.log(`api-gateway running on port ${port}`)
}
bootstrap()
