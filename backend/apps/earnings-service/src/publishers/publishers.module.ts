import { Module }             from '@nestjs/common';
import { ConfigModule }       from '@nestjs/config';
import { EarningsPublisher }  from './earnings.publisher';

@Module({
  imports:  [ConfigModule],
  providers:[EarningsPublisher],
  exports:  [EarningsPublisher],
})
export class PublishersModule {}
