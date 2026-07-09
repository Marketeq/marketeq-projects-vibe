import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class EarningsEventsPublisher {
  private readonly logger = new Logger(EarningsEventsPublisher.name);
}
