import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MercuryApiService } from '../services/mercury-api.service';
import { MatchingScoreService } from '../services/matching-score.service';
import { WireMatchCandidate } from '../entities/wire-match-candidate.entity';

@Injectable()
export class PollMercuryTransactionsJob {
  private readonly logger = new Logger(PollMercuryTransactionsJob.name);

  constructor(
    private readonly mercuryApi: MercuryApiService,
    private readonly matcher: MatchingScoreService,
    @InjectRepository(WireMatchCandidate)
    private readonly wireRepo: Repository<WireMatchCandidate>
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async handle() {
    try {
      this.logger.debug('Polling Mercury API for new wire transfers...');

      const txs = await this.mercuryApi.fetchTransactions();
      this.logger.debug(`Received ${txs.length} transactions from Mercury`);

      for (const tx of txs) {
        if (tx.kind !== 'incomingDomesticWire' && tx.kind !== 'incomingInternationalWire') {
          continue;
        }

        const existing = await this.wireRepo.findOne({ where: { transactionId: tx.id } });
        if (existing) continue;

        const match = await this.matcher.scoreTransaction(tx);

        const entry = new WireMatchCandidate();
        entry.transactionId = tx.id;
        entry.amount = tx.amount;
        entry.memo = tx.note || tx.externalMemo || tx.bankDescription || '';
        entry.receivedAt = new Date(tx.createdAt);
        entry.matchScore = match.score;
        entry.resolvedProjectId = match.projectId ?? undefined;
        entry.status = 'pending_review';

        await this.wireRepo.save(entry);
        this.logger.log(`Inserted wire from Mercury: ${tx.id} - ${tx.kind} - $${tx.amount}`);
      }
    } catch (err: any) {
      this.logger.warn(`Mercury poll skipped: ${err.message}`);
    }
  }
}

/* import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MercuryApiService } from '../services/mercury-api.service';
import { MatchingScoreService } from '../services/matching-score.service';
import { WireMatchCandidate } from '../entities/wire-match-candidate.entity';

@Injectable()
export class PollMercuryTransactionsJob {
  private readonly logger = new Logger(PollMercuryTransactionsJob.name);

  constructor(
    private readonly mercuryApi: MercuryApiService,
    private readonly matcher: MatchingScoreService,
    @InjectRepository(WireMatchCandidate)
    private readonly wireRepo: Repository<WireMatchCandidate>
  ) {}

  //@Cron(CronExpression.EVERY_10_MINUTES)
  @Cron(CronExpression.EVERY_5_SECONDS)
  async handle() {
    this.logger.debug('Polling Mercury API for new wire transfers...');

      // TEMPORARY: Call and log account IDs
  const accountIds = await this.mercuryApi.fetchAccountIds();
  this.logger.debug(`Found Mercury Account IDs: ${accountIds.join(', ')}`);
  // Check if your 4b9d... ID is in this list.

    const txs = await this.mercuryApi.fetchTransactions();
    this.logger.debug(`Received ${txs.length} transactions from Mercury`);

    for (const tx of txs) {

       // Check the type field to ensure it's a wire transfer
  // The exact field name (e.g., 'type', 'category', 'transactionType') and its values
  // (e.g., 'wire_transfer', 'WIRE') need to be confirmed from Mercury's actual API response.
  //if (tx.type !== 'wire_transfer' && tx.type !== 'international_wire_transfer') { // <-- Add this check
      //this.logger.debug(`Skipping non-wire tx ${tx.id} (Type: ${tx.type || 'N/A'})`);
    //  continue; // Skip to the next transaction if it's not a wire
  //} 

      const existing = await this.wireRepo.findOne({ where: { transactionId: tx.id } });
      if (existing) {
        this.logger.debug(`Skipping already-processed tx ${tx.id}`);
        continue;
      }

      const match = await this.matcher.scoreTransaction(tx);

      const entry = new WireMatchCandidate();
      entry.transactionId = tx.id;
      entry.amount = tx.amount;
      //entry.currency = tx.currency;
      entry.memo = tx.memo;
      entry.receivedAt = new Date(tx.created_at);
      entry.matchScore = match.score;
      entry.resolvedProjectId = match.projectId ?? undefined;
      entry.status = 'pending_review';

      await this.wireRepo.save(entry);
      this.logger.log(`✅ Inserted wire from Mercury: ${tx.id}`);
    }
  }
}
 */


/* 
// apps/wire-review-service/src/jobs/poll-mercury-transactions.job.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MercuryApiService } from '../services/mercury-api.service';
import { MatchingScoreService } from '../services/matching-score.service';
import { WireMatchCandidate } from '../entities/wire-match-candidate.entity';

interface WireTransaction {
  id: string;
  amount: number;
  currency: string;
  memo: string;
  created_at: string;
}

@Injectable()
export class PollMercuryTransactionsJob {
  private readonly logger = new Logger(PollMercuryTransactionsJob.name);

  constructor(
    private readonly mercuryApi: MercuryApiService,
    private readonly matcher: MatchingScoreService,
    @InjectRepository(WireMatchCandidate)
    private readonly wireRepo: Repository<WireMatchCandidate>
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async handle() {
    this.logger.debug('Polling Mercury API for new wire transfers...');

    const txs: WireTransaction[] = await this.mercuryApi.fetchTransactions();
    this.logger.debug(`Received ${txs.length} transactions from Mercury`);

    for (const tx of txs) {
      const existing = await this.wireRepo.findOne({ where: { transactionId: tx.id } });
      if (existing) {
        this.logger.debug(`Skipping already-processed tx ${tx.id}`);
        continue;
      }

      const match = await this.matcher.scoreTransaction(tx);

      const entry = new WireMatchCandidate();
      entry.transactionId = tx.id;
      entry.amount = tx.amount;
      entry.currency = tx.currency;
      entry.memo = tx.memo;
      entry.receivedAt = new Date(tx.created_at);
      entry.matchScore = match.score;
      entry.resolvedProjectId = match.projectId ?? undefined;
      entry.status = 'pending_review';

      await this.wireRepo.save(entry);
      this.logger.log(`✅ Inserted wire from Mercury: ${tx.id}`);
    }
  }
}
*/