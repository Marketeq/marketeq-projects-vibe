// apps/offer-service/src/scheduler/warning.processor.ts
// OS-26: Sends 48h expiry warnings for PENDING offers every 5 minutes.
// Sets warning_sent_at = NOW() atomically. warning_sent_at is reset to NULL
// on every TTL reset (edit, CO submit, resend) so new warnings fire.
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { OutboxService } from '../outbox/outbox.service';
import { OFFER_EXCHANGE } from '../messaging/constants/rabbitmq.constants';
import { OFFER_EVENTS } from '../messaging/events/offer-events';
import { buildOfferExpiringSoonPayload } from '../messaging/events/offer-payload-builders';
import { Offer } from '../offers/entities/offer.entity';
import { getWarningThreshold } from './ttl.helper';

const WARNING_BATCH_SIZE = 50;

@Injectable()
export class WarningProcessor {
  private readonly logger = new Logger(WarningProcessor.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly outboxService: OutboxService,
  ) {}

  @Cron('0 */5 * * * *', { name: 'offer-expiry-warning' })
  async sendWarnings(): Promise<void> {
    const threshold = getWarningThreshold(); // NOW() + 48 hours

    await this.dataSource.transaction(async (em) => {
      const result = await em.query(`
        UPDATE offer_service.offers
          SET warning_sent_at = NOW(), updated_at = NOW()
        WHERE id IN (
          SELECT id FROM offer_service.offers
          WHERE  status            = 'PENDING'
            AND  expires_at       <= $1
            AND  warning_sent_at   IS NULL
          ORDER  BY expires_at ASC
          LIMIT  $2
          FOR UPDATE SKIP LOCKED
        )
        RETURNING *
      `, [threshold, WARNING_BATCH_SIZE]);

      const rows = this.extractRows(result);
      const offers = rows.filter((r: any) => r && r.id);

      if (offers.length === 0) return;

      this.logger.log(`Sending 48h warning for ${offers.length} offer(s).`);

      for (const raw of offers) {
        const offer = this.mapRawToOffer(raw);
        await this.outboxService.write({
          aggregateId: offer.id,
          eventType: OFFER_EVENTS.EXPIRING_SOON,
          routingKey: OFFER_EVENTS.EXPIRING_SOON,
          exchange: OFFER_EXCHANGE,
          payload: buildOfferExpiringSoonPayload(offer) as any,
        }, em);
      }
    });
  }

  private extractRows(result: any): any[] {
    if (Array.isArray(result) && result.length === 2 && Array.isArray(result[0])) {
      return result[0];
    }
    return Array.isArray(result) ? result : [];
  }

  private mapRawToOffer(raw: any): Offer {
    return {
      id: raw.id,
      clientId: raw.client_id ?? raw.clientId,
      talentId: raw.talent_id ?? raw.talentId,
      // BTB-364/D1: trailing `?? null` — see offers.service.ts's mapRawToOffer
      // for why `?? raw.jobListingId` alone silently drops a genuine null.
      jobListingId: raw.job_listing_id ?? raw.jobListingId ?? null,
      contractType: raw.contract_type ?? raw.contractType,
      contractTitle: raw.contract_title ?? raw.contractTitle,
      status: raw.status,
      rate: raw.rate,
      currencyCode: raw.currency_code ?? raw.currencyCode,
      durationMonths: raw.duration_months ?? raw.durationMonths,
      workSchedule: typeof raw.work_schedule === 'string'
        ? JSON.parse(raw.work_schedule) : (raw.work_schedule ?? raw.workSchedule),
      startDate: raw.start_date ?? raw.startDate,
      message: raw.message ?? null,
      expiresAt: raw.expires_at ? new Date(raw.expires_at) : (raw.expiresAt ?? null),
      warningSentAt: raw.warning_sent_at ? new Date(raw.warning_sent_at) : (raw.warningSentAt ?? null),
      acceptedAt: raw.accepted_at ? new Date(raw.accepted_at) : (raw.acceptedAt ?? null),
      declinedAt: raw.declined_at ? new Date(raw.declined_at) : (raw.declinedAt ?? null),
      declinedReason: raw.declined_reason ?? raw.declinedReason ?? null,
      declinedChip: raw.declined_chip ?? raw.declinedChip ?? null,
      withdrawnAt: raw.withdrawn_at ? new Date(raw.withdrawn_at) : (raw.withdrawnAt ?? null),
      withdrawalMessage: raw.withdrawal_message ?? raw.withdrawalMessage ?? null,
      expiredAt: raw.expired_at ? new Date(raw.expired_at) : (raw.expiredAt ?? null),
      originalOfferId: raw.original_offer_id ?? raw.originalOfferId ?? null,
      createdAt: raw.created_at ? new Date(raw.created_at) : (raw.createdAt ?? new Date()),
      updatedAt: raw.updated_at ? new Date(raw.updated_at) : (raw.updatedAt ?? new Date()),
    } as Offer;
  }
}