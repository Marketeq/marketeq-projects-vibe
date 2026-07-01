import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { OfferHistoryEvent } from './entities/offer-history-event.entity';

@Injectable()
export class OfferHistoryService {
  constructor(
    @InjectRepository(OfferHistoryEvent)
    private readonly historyRepo: Repository<OfferHistoryEvent>,
  ) {}

  async append(data: Partial<OfferHistoryEvent>, em?: EntityManager): Promise<OfferHistoryEvent> {
    const repo = em ? em.getRepository(OfferHistoryEvent) : this.historyRepo;
    const event = repo.create(data);
    return repo.save(event);
  }
}