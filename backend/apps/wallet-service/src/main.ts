import { NestFactory } from '@nestjs/core'
import { Logger, ValidationPipe } from '@nestjs/common'
import { WalletModule } from './modules/wallet.module'

async function bootstrap() {
  const logger = new Logger('WalletService')
  const app = await NestFactory.create(WalletModule)

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  const port = process.env.PORT || 3024
  await app.listen(port)
  logger.log(`wallet-service running on port ${port}`)
}
bootstrap()
