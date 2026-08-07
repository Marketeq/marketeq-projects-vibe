import { Module }             from '@nestjs/common';
import { ConfigModule }       from '@nestjs/config';
import { EarningsPublisher }  from './earnings.publisher';
import { EarningsEventsPublisher } from './earnings-events.publisher';
import { AblyService }        from './ably.service';

@Module({
  imports:  [ConfigModule],
  providers:[EarningsPublisher, EarningsEventsPublisher, AblyService],
  exports:  [EarningsPublisher, AblyService],
})
export class PublishersModule {}
