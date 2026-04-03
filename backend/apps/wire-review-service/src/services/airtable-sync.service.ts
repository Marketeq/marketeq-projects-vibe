import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { WireMatchCandidate } from '../entities/wire-match-candidate.entity';
import axios from 'axios';

@Injectable()
export class AirtableSyncService {
  private readonly logger = new Logger(AirtableSyncService.name);

  constructor(
    @InjectRepository(WireMatchCandidate)
    private readonly wireMatchRepo: Repository<WireMatchCandidate>
  ) {}

  async pushPendingReviewsToAirtable() {
    this.logger.debug('Starting Airtable sync...');

    const pending = await this.wireMatchRepo.find({
      where: {
        status: 'pending_review',
        syncedToAirtable: false,
        syncAttempts: LessThan(5),
      },
    });

    this.logger.debug(`Found ${pending.length} pending review candidates`);

    if (!pending.length) return;

    for (const entry of pending) {
      try {
        const airtableRes = await axios.post(
          `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_TABLE_NAME}`,
          {
            fields: {
              TransactionID: entry.transactionId,
              ProjectID: entry.resolvedProjectId || 'Unresolved',
              Amount: entry.amount,
              Memo: entry.memo || '',
              MatchScore: entry.matchScore,
              ReceivedAt: entry.receivedAt.toISOString(),
              Status: entry.status,
            },
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
          }
        );

        this.logger.log(
          `Pushed tx ${entry.transactionId} to Airtable (ID: ${airtableRes?.data?.id})`
        );

        entry.syncedToAirtable = true;
        entry.syncAttempts = (entry.syncAttempts || 0) + 1;
        entry.lastSyncError = '' as any;
        await this.wireMatchRepo.save(entry);

      } catch (err: any) {
        entry.syncAttempts = (entry.syncAttempts || 0) + 1;
        entry.lastSyncError =
          err?.response?.data?.error?.message || err.message;
        await this.wireMatchRepo.save(entry);

        this.logger.error(
          `Failed to sync tx ${entry.transactionId}: ${entry.lastSyncError}`
        );
      }
    }
  }
}
