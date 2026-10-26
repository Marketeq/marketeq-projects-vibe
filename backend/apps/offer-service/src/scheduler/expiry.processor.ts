// apps/offer-service/src/scheduler/expiry.processor.ts
// OS-26: Expires PENDING offers and counter offers every 60 seconds.
// Uses SELECT FOR UPDATE SKIP LOCKED for multi-instance safety.
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { OutboxService } from '../outbox/outbox.service';
import { AblyService } from '../realtime/ably.service';
import { OFFER_EXCHANGE } from '../messaging/constants/rabbitmq.constants';
import { OFFER_EVENTS } from '../messaging/events/offer-events';
import {
  buildOfferExpiredPayload,
  buildOfferCounterExpiredPayload,
} from '../messaging/events/offer-payload-builders';
import { Offer } from '../offers/entities/offer.entity';
import { CounterOffer } from '../counter-offers/entities/counter-offer.entity';

const EXPIRY_BATCH_SIZE = 100;

@Injectable()
export class ExpiryProcessor {
  private readonly logger = new Logger(ExpiryProcessor.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly outboxService: OutboxService,
    private readonly ablyService: AblyService,
  ) {}

  @Cron('0 * * * * *', { name: 'offer-expiry' })
  async expireOffers(): Promise<void> {
    await this.expirePrimaryOffers();
    await this.expireCounterOffers();
  }

  // ============================================================
  // Primary offer expiry
  // ============================================================

  private async expirePrimaryOffers(): Promise<void> {
    const expiredOffers = await this.dataSource.transaction(async (em) => {
      const result = await em.query(`
        UPDATE offer_service.offers
          SET status = 'EXPIRED', expired_at = NOW(), updated_at = NOW()
        WHERE id IN (
          SELECT id FROM offer_service.offers
          WHERE  status     = 'PENDING'
            AND  expires_at <= NOW()
          ORDER  BY expires_at ASC
          LIMIT  $1
          FOR UPDATE SKIP LOCKED
        )
        RETURNING *
      `, [EXPIRY_BATCH_SIZE]);

      // TypeORM raw query returns [rows[], count] or rows[] depending on driver
      const rows = this.extractRows(result);
      const offers = rows.filter((r: any) => r && r.id);

      if (offers.length === 0) return [];

      this.logger.log(`Expiring ${offers.length} primary offer(s).`);

      for (const raw of offers) {
        const offer = this.mapRawToOffer(raw);
        await this.outboxService.write({
          aggregateId: offer.id,
          eventType: OFFER_EVENTS.EXPIRED,
          routingKey: OFFER_EVENTS.EXPIRED,
          exchange: OFFER_EXCHANGE,
          payload: buildOfferExpiredPayload(offer) as any,
        }, em);
      }

      return offers.map((r: any) => this.mapRawToOffer(r));
    });

    for (const offer of expiredOffers) {
      this.ablyService.publish(offer.id, offer as any, null, false);
    }
  }

  // ============================================================
  // Counter offer expiry
  // ============================================================

  private async expireCounterOffers(): Promise<void> {
    type ExpiredCORow = { co: any; restoredOffer: any };

    const results: ExpiredCORow[] = await this.dataSource.transaction(async (em) => {
      const coResult = await em.query(`
        UPDATE offer_service.counter_offers
          SET status = 'EXPIRED', expired_at = NOW(), updated_at = NOW()
        WHERE id IN (
          SELECT id FROM offer_service.counter_offers
          WHERE  status     = 'PENDING'
            AND  expires_at <= NOW()
          ORDER  BY expires_at ASC
          LIMIT  $1
          FOR UPDATE SKIP LOCKED
        )
        RETURNING *
      `, [EXPIRY_BATCH_SIZE]);

      const coRows = this.extractRows(coResult);
      const expiredCOs = coRows.filter((r: any) => r && r.id);

      if (expiredCOs.length === 0) return [];

      this.logger.log(`Expiring ${expiredCOs.length} counter offer(s).`);

      const rows: ExpiredCORow[] = [];

      for (const rawCO of expiredCOs) {
        const co = this.mapRawToCO(rawCO);
        const offerId = co.offerId;

        // Attempt to restore parent offer to PENDING (CAS: must be COUNTERED).
        const offerResult = await em.query(`
          UPDATE offer_service.offers
            SET status = 'PENDING', updated_at = NOW()
          WHERE  id = $1 AND status = 'COUNTERED'
          RETURNING *
        `, [offerId]);

        const offerRows = this.extractRows(offerResult);
        const restoredOffer = offerRows[0]?.id ? this.mapRawToOffer(offerRows[0]) : null;

        // For the payload, get the parent offer's actual status.
        let parentOffer: any;
        if (restoredOffer) {
          parentOffer = restoredOffer;
        } else {
          const parentResult = await em.query(
            `SELECT * FROM offer_service.offers WHERE id = $1`, [offerId],
          );
          const parentRows = this.extractRows(parentResult);
          parentOffer = parentRows[0]?.id ? this.mapRawToOffer(parentRows[0]) : { id: offerId, status: 'EXPIRED' };
        }

        await this.outboxService.write({
          aggregateId: offerId,
          eventType: OFFER_EVENTS.COUNTER_EXPIRED,
          routingKey: OFFER_EVENTS.COUNTER_EXPIRED,
          exchange: OFFER_EXCHANGE,
          payload: buildOfferCounterExpiredPayload(parentOffer as any, co as any) as any,
        }, em);

        rows.push({ co, restoredOffer });
      }

      return rows;
    });

    for (const { co, restoredOffer } of results) {
      if (restoredOffer) {
        this.ablyService.publish(co.offerId, restoredOffer as any, null, false);
      }
    }
  }

  // ============================================================
  // Raw result helpers
  // ============================================================

  /** Extract rows from TypeORM raw query result (handles both [rows, count] and rows[] formats) */
  private extractRows(result: any): any[] {
    if (Array.isArray(result) && result.length === 2 && Array.isArray(result[0])) {
      return result[0];
    }
    return Array.isArray(result) ? result : [];
  }

  // ============================================================
  // Raw row mappers (same pattern as services)
  // ============================================================

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

  private mapRawToCO(raw: any): CounterOffer {
    return {
      id: raw.id,
      offerId: raw.offer_id ?? raw.offerId,
      submittedBy: raw.submitted_by ?? raw.submittedBy,
      submittedById: raw.submitted_by_id ?? raw.submittedById,
      status: raw.status,
      rate: raw.rate,
      currencyCode: raw.currency_code ?? raw.currencyCode,
      durationMonths: raw.duration_months ?? raw.durationMonths,
      workSchedule: typeof raw.work_schedule === 'string'
        ? JSON.parse(raw.work_schedule) : (raw.work_schedule ?? raw.workSchedule),
      startDate: raw.start_date ?? raw.startDate,
      message: raw.message ?? null,
      expiresAt: raw.expires_at ? new Date(raw.expires_at) : (raw.expiresAt ?? null),
      acceptedAt: raw.accepted_at ? new Date(raw.accepted_at) : (raw.acceptedAt ?? null),
      declinedAt: raw.declined_at ? new Date(raw.declined_at) : (raw.declinedAt ?? null),
      withdrawnAt: raw.withdrawn_at ? new Date(raw.withdrawn_at) : (raw.withdrawnAt ?? null),
      withdrawalMessage: raw.withdrawal_message ?? raw.withdrawalMessage ?? null,
      expiredAt: raw.expired_at ? new Date(raw.expired_at) : (raw.expiredAt ?? null),
      supersededAt: raw.superseded_at ? new Date(raw.superseded_at) : (raw.supersededAt ?? null),
      createdAt: raw.created_at ? new Date(raw.created_at) : (raw.createdAt ?? new Date()),
      updatedAt: raw.updated_at ? new Date(raw.updated_at) : (raw.updatedAt ?? new Date()),
    } as CounterOffer;
  }
}