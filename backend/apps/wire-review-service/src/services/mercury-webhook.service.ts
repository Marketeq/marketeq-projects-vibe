// Not using this webhook now you can remove this file
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WireMatchCandidate } from '../entities/wire-match-candidate.entity';
import { MatchingScoreService } from './matching-score.service';

@Injectable()
export class MercuryWebhookService {
  private readonly logger = new Logger(MercuryWebhookService.name);

  constructor(
    @InjectRepository(WireMatchCandidate)
    private readonly wireMatchRepo: Repository<WireMatchCandidate>,
    private readonly scoreService: MatchingScoreService,
  ) {}

  async processWebhook(body: any, headers: any) {
    const transactionId = body?.id || 'unknown';
    const amount = Number(body?.amount?.value || 0);
    const memo = body?.description || '';
    const timestamp = new Date(body?.created_at || Date.now());

    const match = memo.match(/MARKETEQ-PROJ-(\w{6,})/i);
    const resolvedProjectId = match?.[1] || null;

    const candidate = this.wireMatchRepo.create({
      transactionId,
      amount,
      memo,
      resolvedProjectId,
      matchScore: 0,
      status: 'pending_review',
      receivedAt: timestamp,
      rawPayload: body,
    });

    const saved = await this.wireMatchRepo.save(candidate);
    const score = await this.scoreService.computeScore(saved);

    saved.matchScore = score;
    saved.status = score >= 75 ? 'confirmed' : 'pending_review';
    await this.wireMatchRepo.save(saved);

    this.logger.log(`Scored Mercury tx ${transactionId} → ${score} → ${saved.status}`);

    if (saved.status === 'pending_review') {
      // TODO: Integrate notification service to alert finance or admin team
      // e.g. await this.notificationService.send('wire_review_required', { transactionId, score, memo });
    }
  }
}