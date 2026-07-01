import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OfferHistoryEvent } from './entities/offer-history-event.entity';

@Injectable()
export class OfferHistoryService {
  constructor(
    @InjectRepository(OfferHistoryEvent)
    private readonly historyRepo: Repository<OfferHistoryEvent>,
  ) {}

  async append(data: Partial<OfferHistoryEvent>): Promise<OfferHistoryEvent> {
    const event = this.historyRepo.create(data);
    return this.historyRepo.save(event);
  }
}