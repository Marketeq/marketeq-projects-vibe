import { NestFactory } from '@nestjs/core'
import { Logger } from '@nestjs/common'
import { WireReviewModule } from './modules/wire-review.module'

async function bootstrap() {
  const logger = new Logger('WireReviewService')
  const app = await NestFactory.create(WireReviewModule)
  const port = process.env.PORT || 3025
  await app.listen(port)
  logger.log(`wire-review-service running on port ${port}`)
}
bootstrap()
