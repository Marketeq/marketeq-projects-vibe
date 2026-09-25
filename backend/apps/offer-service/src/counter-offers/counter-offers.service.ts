// apps/offer-service/src/counter-offers/counter-offers.service.ts
// OS-25: Full state machine implementation for counter offers.
// OS-27: create() now returns { counterOffer, rateWarning } for API response.
// All transitions include parent offer side effects in the same transaction.
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, DataSource } from 'typeorm';
import { CounterOffer } from './entities/counter-offer.entity';
import { CounterOfferStatus } from './enums/counter-offer-status.enum';
import { OfferStatus } from '../offers/enums/offer-status.enum';
import { Offer } from '../offers/entities/offer.entity';
import {
  OfferStateMachine,
  InvalidOfferTransitionException,
  OfferConcurrentModificationException,
} from '../offers/offer-state-machine';
import { OffersService } from '../offers/offers.service';
import { OutboxService } from '../outbox/outbox.service';
import { AblyService } from '../realtime/ably.service';
import { OFFER_EVENTS } from '../messaging/events/offer-events';
import { OFFER_EXCHANGE } from '../messaging/constants/rabbitmq.constants';
import {
  buildOfferCounteredPayload,
  buildOfferCounterEditedPayload,
  buildOfferCounterAcceptedPayload,
  buildOfferCounterDeclinedPayload,
  buildOfferCounterWithdrawnPayload,
  buildOfferCounterExpiredPayload,
} from '../messaging/events/offer-payload-builders';
import { OfferHistoryService } from '../offer-history/offer-history.service';
import { OfferTermsSnapshot } from '../offer-history/entities/offer-history-event.entity';
import { normalizeDateOnly } from '../common/utils/normalize-date-only';
import { calculateExpiresAt } from '../scheduler/ttl.helper';
import {
  CounterOfferNotActionableException,
  CounterOfferWithdrawnException,
  CounterOfferExpiredException,
} from '../common/exceptions/offer.exceptions';

@Injectable()
export class CounterOffersService {
  private readonly logger = new Logger(CounterOffersService.name);

  constructor(
    @InjectRepository(CounterOffer)
    private readonly coRepo: Repository<CounterOffer>,
    private readonly dataSource: DataSource,
    private readonly offersService: OffersService,
    private readonly outboxService: OutboxService,
    private readonly ablyService: AblyService,
    private readonly offerHistoryService: OfferHistoryService,
  ) {}

  // ============================================================
  // create() — Talent or Client submits counter offer
  // PENDING/COUNTERED -> COUNTERED (offer), PENDING (new CO)
  // ============================================================

  async create(
    offerId: string,
    requesterId: string,
    role: string,
    dto: any,
  ): Promise<{ counterOffer: CounterOffer; rateWarning: boolean }> {
    const offer = await this.offersService.findByIdOrThrow(offerId);

    // Guard: requester must be a party.
    OfferStateMachine.assertIsParty(offer, requesterId);

    // Guard: offer must be PENDING or COUNTERED.
    if (offer.status !== OfferStatus.PENDING && offer.status !== OfferStatus.COUNTERED) {
      throw new InvalidOfferTransitionException('offer', offer.status, 'COUNTERED');
    }

    const submittedBy = (role as 'CLIENT' | 'TALENT');
    const rateWarning = OfferStateMachine.computeRateWarning(
      offer.rate, dto.rate, submittedBy,
    );

    const { newCO, updatedOffer } = await this.dataSource.transaction(async (em) => {
      // Step A: Supersede any existing PENDING CO.
      await em.query(`
        UPDATE offer_service.counter_offers
          SET status = 'SUPERSEDED', superseded_at = NOW(), updated_at = NOW()
        WHERE offer_id = $1 AND status = 'PENDING'
      `, [offerId]);

      // Step B: Create the new counter offer.
      const expiresAt = calculateExpiresAt();

      const insertResult = await em.query(`
        INSERT INTO offer_service.counter_offers (
          offer_id, submitted_by, submitted_by_id, status,
          rate, currency_code, duration_months, work_schedule,
          start_date, message, expires_at, created_at, updated_at
        ) VALUES ($1, $2, $3, 'PENDING', $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        RETURNING *
      `, [
        offerId, submittedBy, requesterId,
        dto.rate, dto.currencyCode, dto.durationMonths,
        JSON.stringify(dto.workSchedule), dto.startDate,
        dto.message ?? null, expiresAt.toISOString(),
      ]);

      const savedCO = this.mapRawToCO(Array.isArray(insertResult[0]) ? insertResult[0][0] : insertResult[0]);

      // Step C: Set offer status to COUNTERED.
      const offerResult = await em.query(`
        UPDATE offer_service.offers
          SET status = 'COUNTERED', updated_at = NOW()
        WHERE id = $1 AND status IN ('PENDING', 'COUNTERED')
        RETURNING *
      `, [offerId]);

      const offerRows = Array.isArray(offerResult[0]) ? offerResult[0] : offerResult;
      const offerCount = typeof offerResult[1] === 'number' ? offerResult[1] : offerRows.length;
      if (offerCount === 0) throw new OfferConcurrentModificationException(offerId);

      const updatedOffer = this.mapRawToOffer(offerRows[0]);

      // Step D: Write outbox event.
      await this.outboxService.write({
        aggregateId: offerId,
        eventType: OFFER_EVENTS.COUNTERED,
        routingKey: OFFER_EVENTS.COUNTERED,
        exchange: OFFER_EXCHANGE,
        payload: buildOfferCounteredPayload(updatedOffer, savedCO, rateWarning) as any,
      }, em);

      return { newCO: savedCO, updatedOffer };
    });

    // Step E: Ably publish (outside transaction).
    this.ablyService.publish(offerId, updatedOffer as any, newCO, rateWarning);

    // OS-27: Return { counterOffer, rateWarning } so the API response includes the advisory flag.
    return { counterOffer: newCO, rateWarning };
  }

  // ============================================================
  // acceptCO() — NON-SUBMITTER accepts CO
  // CO: PENDING -> ACCEPTED, Offer: COUNTERED -> ACCEPTED
  // ============================================================

  async accept(
    offerId: string,
    coId: string,
    requesterId: string,
  ): Promise<CounterOffer> {
    const offer = await this.offersService.findByIdOrThrow(offerId);
    const co = await this.findCOByIdOrThrow(coId, offerId);

    OfferStateMachine.assertIsNonSubmitter(co, offer, requesterId);

    if (co.status === CounterOfferStatus.WITHDRAWN) {
      throw new CounterOfferWithdrawnException();
    }
    if (
      co.status === CounterOfferStatus.EXPIRED ||
      (co.status === CounterOfferStatus.PENDING && co.expiresAt <= new Date())
    ) {
      throw new CounterOfferExpiredException();
    }

    OfferStateMachine.assertCanTransitionCO(co.status, CounterOfferStatus.ACCEPTED);

    const { acceptedCO, acceptedOffer } = await this.dataSource.transaction(async (em) => {
      // CAS on counter offer. expires_at > NOW() closes the race where the
      // counter offer has passed its expiry but the TTL sweeper hasn't
      // flipped its status yet — the pre-transaction check above can't
      // fully close that on its own. Only ever evaluated when status is
      // already 'PENDING', so no other status is affected by this.
      const coResult = await em.query(`
        UPDATE offer_service.counter_offers
          SET status = 'ACCEPTED', accepted_at = NOW(), updated_at = NOW()
        WHERE id = $1 AND status = 'PENDING' AND expires_at > NOW()
        RETURNING *
      `, [coId]);

      const coRows = Array.isArray(coResult[0]) ? coResult[0] : coResult;
      const coCount = typeof coResult[1] === 'number' ? coResult[1] : coRows.length;
      if (coCount === 0) throw new OfferConcurrentModificationException(coId);

      // CAS on parent offer: COUNTERED -> ACCEPTED.
      const offerResult = await em.query(`
        UPDATE offer_service.offers
          SET status = 'ACCEPTED', accepted_at = NOW(), updated_at = NOW()
        WHERE id = $1 AND status = 'COUNTERED'
        RETURNING *
      `, [offerId]);

      const offerRows = Array.isArray(offerResult[0]) ? offerResult[0] : offerResult;
      const offerCount = typeof offerResult[1] === 'number' ? offerResult[1] : offerRows.length;
      if (offerCount === 0) throw new OfferConcurrentModificationException(offerId);

      const acceptedCO = this.mapRawToCO(coRows[0]);
      const acceptedOffer = this.mapRawToOffer(offerRows[0]);

      await this.outboxService.write({
        aggregateId: offerId,
        eventType: OFFER_EVENTS.COUNTER_ACCEPTED,
        routingKey: OFFER_EVENTS.COUNTER_ACCEPTED,
        exchange: OFFER_EXCHANGE,
        payload: buildOfferCounterAcceptedPayload(acceptedOffer, acceptedCO, requesterId) as any,
      }, em);

      return { acceptedCO, acceptedOffer };
    });

    this.ablyService.publish(offerId, acceptedOffer as any, null, false);
    return acceptedCO;
  }

  // ============================================================
  // declineCO() — NON-SUBMITTER declines CO
  // CO: PENDING -> DECLINED, Offer: COUNTERED -> PENDING (restored)
  // ============================================================

  async decline(
    offerId: string,
    coId: string,
    requesterId: string,
  ): Promise<CounterOffer> {
    const offer = await this.offersService.findByIdOrThrow(offerId);
    const co = await this.findCOByIdOrThrow(coId, offerId);

    OfferStateMachine.assertIsNonSubmitter(co, offer, requesterId);
    OfferStateMachine.assertCanTransitionCO(co.status, CounterOfferStatus.DECLINED);

    const { declinedCO, restoredOffer } = await this.dataSource.transaction(async (em) => {
      const coResult = await em.query(`
        UPDATE offer_service.counter_offers
          SET status = 'DECLINED', declined_at = NOW(), updated_at = NOW()
        WHERE id = $1 AND status = 'PENDING'
        RETURNING *
      `, [coId]);

      const coRows = Array.isArray(coResult[0]) ? coResult[0] : coResult;
      const coCount = typeof coResult[1] === 'number' ? coResult[1] : coRows.length;
      if (coCount === 0) throw new OfferConcurrentModificationException(coId);

      // AC-28.03: the primary offer only restores to PENDING if it hasn't
      // independently expired while sitting COUNTERED. The TTL sweeper only
      // ever targets status = 'PENDING' — a COUNTERED row's expires_at can
      // drift into the past with no one ever flipping it to EXPIRED, so
      // decline() has to make that determination itself, from the offer
      // already fetched before this transaction opened. When it has expired,
      // write the exact shape the sweeper would have written (status +
      // expired_at only — expires_at stays as the historical expiry,
      // warning_sent_at is untouched, since it's only meaningful for PENDING
      // offers). Otherwise, restore to PENDING exactly as before.
      const hasIndependentlyExpired = offer.expiresAt <= new Date();

      const offerResult = hasIndependentlyExpired
        ? await em.query(`
            UPDATE offer_service.offers
              SET status = 'EXPIRED', expired_at = NOW(), updated_at = NOW()
            WHERE id = $1 AND status = 'COUNTERED'
            RETURNING *
          `, [offerId])
        : await em.query(`
            UPDATE offer_service.offers
              SET status = 'PENDING', updated_at = NOW(), expires_at = $2, warning_sent_at = NULL
            WHERE id = $1 AND status = 'COUNTERED'
            RETURNING *
          `, [offerId, calculateExpiresAt().toISOString()]);

      const offerRows = Array.isArray(offerResult[0]) ? offerResult[0] : offerResult;
      const restoredOffer = offerRows.length > 0 ? this.mapRawToOffer(offerRows[0]) : offer;

      await this.outboxService.write({
        aggregateId: offerId,
        eventType: OFFER_EVENTS.COUNTER_DECLINED,
        routingKey: OFFER_EVENTS.COUNTER_DECLINED,
        exchange: OFFER_EXCHANGE,
        payload: buildOfferCounterDeclinedPayload(restoredOffer as any, this.mapRawToCO(coRows[0]), requesterId) as any,
      }, em);

      return { declinedCO: this.mapRawToCO(coRows[0]), restoredOffer };
    });

    this.ablyService.publish(offerId, restoredOffer as any, null, false);
    return declinedCO;
  }

  // ============================================================
  // withdrawCO() — SUBMITTER withdraws their own CO
  // CO: PENDING -> WITHDRAWN, Offer: COUNTERED -> PENDING (restored)
  // ============================================================

  async withdraw(
    offerId: string,
    coId: string,
    requesterId: string,
    dto?: any,
  ): Promise<CounterOffer> {
    const offer = await this.offersService.findByIdOrThrow(offerId);
    const co = await this.findCOByIdOrThrow(coId, offerId);

    OfferStateMachine.assertIsSubmitter(co, requesterId);
    if (co.status !== CounterOfferStatus.PENDING) {
      throw new CounterOfferNotActionableException(co.status);
    }

    const withdrawalMessage = dto?.message ?? null;

    const { withdrawnCO, restoredOffer } = await this.dataSource.transaction(async (em) => {
      const coResult = await em.query(`
        UPDATE offer_service.counter_offers
          SET status = 'WITHDRAWN', withdrawn_at = NOW(), withdrawal_message = $2, updated_at = NOW()
        WHERE id = $1 AND status = 'PENDING'
        RETURNING *
      `, [coId, withdrawalMessage]);

      const coRows = Array.isArray(coResult[0]) ? coResult[0] : coResult;
      const coCount = typeof coResult[1] === 'number' ? coResult[1] : coRows.length;
      if (coCount === 0) throw new OfferConcurrentModificationException(coId);

      const offerResult = await em.query(`
        UPDATE offer_service.offers
          SET status = 'PENDING', updated_at = NOW(), expires_at = $2, warning_sent_at = NULL
        WHERE id = $1 AND status = 'COUNTERED'
        RETURNING *
      `, [offerId, calculateExpiresAt().toISOString()]);

      const offerRows = Array.isArray(offerResult[0]) ? offerResult[0] : offerResult;
      const restoredOffer = offerRows.length > 0 ? this.mapRawToOffer(offerRows[0]) : offer;

      await this.outboxService.write({
        aggregateId: offerId,
        eventType: OFFER_EVENTS.COUNTER_WITHDRAWN,
        routingKey: OFFER_EVENTS.COUNTER_WITHDRAWN,
        exchange: OFFER_EXCHANGE,
        payload: buildOfferCounterWithdrawnPayload(restoredOffer as any, this.mapRawToCO(coRows[0])) as any,
      }, em);

      return { withdrawnCO: this.mapRawToCO(coRows[0]), restoredOffer };
    });

    this.ablyService.publish(offerId, restoredOffer as any, null, false);
    return withdrawnCO;
  }

  // ============================================================
  // expireCO() — SYSTEM expires a PENDING CO
  // CO: PENDING -> EXPIRED, Offer: COUNTERED -> PENDING
  // Called by ExpiryProcessor, never via API.
  // ============================================================

  async expireCO(
    offerId: string,
    coId: string,
    em: EntityManager,
  ): Promise<CounterOffer | null> {
    const coResult = await em.query(`
      UPDATE offer_service.counter_offers
        SET status = 'EXPIRED', expired_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND status = 'PENDING'
      RETURNING *
    `, [coId]);

    const coRows = Array.isArray(coResult[0]) ? coResult[0] : coResult;
    const coCount = typeof coResult[1] === 'number' ? coResult[1] : coRows.length;

    if (coCount === 0) {
      this.logger.debug(`CO ${coId} already transitioned before CO expiry ran.`);
      return null;
    }

    // Restore parent offer IF still COUNTERED.
    const offerResult = await em.query(`
      UPDATE offer_service.offers
        SET status = 'PENDING', updated_at = NOW()
      WHERE id = $1 AND status = 'COUNTERED'
      RETURNING *
    `, [offerId]);

    const offerRows = Array.isArray(offerResult[0]) ? offerResult[0] : offerResult;
    const expiredCO = this.mapRawToCO(coRows[0]);
    const restoredOffer = offerRows.length > 0 ? this.mapRawToOffer(offerRows[0]) : null;

    // If no restored offer, the parent was independently expired/withdrawn.
    const parentForPayload = restoredOffer ?? { id: offerId, status: OfferStatus.EXPIRED } as any;

    await this.outboxService.write({
      aggregateId: offerId,
      eventType: OFFER_EVENTS.COUNTER_EXPIRED,
      routingKey: OFFER_EVENTS.COUNTER_EXPIRED,
      exchange: OFFER_EXCHANGE,
      payload: buildOfferCounterExpiredPayload(parentForPayload, expiredCO) as any,
    }, em);

    // ExpiryProcessor calls ablyService.publish after the transaction commits.
    return expiredCO;
  }

  // ============================================================
  // findById — used by controller GET
  // ============================================================

  async findById(offerId: string, coId: string): Promise<CounterOffer> {
    return this.findCOByIdOrThrow(coId, offerId);
  }

  // ============================================================
  // editCO() — SUBMITTER edits their own PENDING CO (in-place, resets TTL)
  // ============================================================

  async edit(offerId: string, id: string, userId: string, dto: any): Promise<CounterOffer> {
    const offer = await this.offersService.findByIdOrThrow(offerId);
    const co = await this.findCOByIdOrThrow(id, offerId);

    OfferStateMachine.assertIsSubmitter(co, userId);
    if (co.status !== CounterOfferStatus.PENDING) {
      throw new CounterOfferNotActionableException(co.status);
    }

    const previousTerms = this.termsFromCO(co);

    const setParts: string[] = [
      'updated_at = NOW()',
      'expires_at = $2',
      'warning_sent_at = NULL',
    ];
    const values: unknown[] = [id, calculateExpiresAt().toISOString()];
    let paramIdx = 3;

    const editableFields: Record<string, string> = {
      rate: 'rate', currencyCode: 'currency_code', durationMonths: 'duration_months',
      message: 'message', startDate: 'start_date',
    };

    for (const [dtoKey, col] of Object.entries(editableFields)) {
      if (dto[dtoKey] !== undefined) {
        setParts.push(`${col} = $${paramIdx}`);
        values.push(dto[dtoKey]);
        paramIdx++;
      }
    }

    if (dto.workSchedule !== undefined) {
      setParts.push(`work_schedule = $${paramIdx}`);
      values.push(JSON.stringify(dto.workSchedule));
      paramIdx++;
    }

    const editedCO = await this.dataSource.transaction(async (em) => {
      const result = await em.query(`
        UPDATE offer_service.counter_offers
        SET    ${setParts.join(', ')}
        WHERE  id = $1 AND status = 'PENDING'
        RETURNING *
      `, values);

      const rows = Array.isArray(result[0]) ? result[0] : result;
      const count = typeof result[1] === 'number' ? result[1] : rows.length;
      if (count === 0) throw new OfferConcurrentModificationException(id);

      const edited = this.mapRawToCO(rows[0]);

      await this.outboxService.write({
        aggregateId: offerId,
        eventType: OFFER_EVENTS.COUNTER_EDITED,
        routingKey: OFFER_EVENTS.COUNTER_EDITED,
        exchange: OFFER_EXCHANGE,
        payload: buildOfferCounterEditedPayload(offer, edited, previousTerms as any) as any,
      }, em);

      await this.offerHistoryService.append({
        offerId, counterOfferId: id,
        eventType: OFFER_EVENTS.COUNTER_EDITED,
        actor: co.submittedBy, actorId: userId,
        terms: this.termsFromCO(edited),
      }, em);

      return edited;
    });

    this.ablyService.publish(offerId, offer as any, editedCO, false);
    return editedCO;
  }

  // ============================================================
  // Private helpers
  // ============================================================

  private termsFromCO(co: CounterOffer): OfferTermsSnapshot {
    return {
      rate: co.rate,
      currencyCode: co.currencyCode,
      durationMonths: co.durationMonths,
      workSchedule: co.workSchedule as { type: string; hoursPerWeek?: number },
      startDate: co.startDate,
      message: co.message ?? null,
    };
  }

  private async findCOByIdOrThrow(coId: string, offerId: string): Promise<CounterOffer> {
    const co = await this.coRepo.findOne({ where: { id: coId, offerId } });
    if (!co) throw new NotFoundException(`Counter offer ${coId} not found on offer ${offerId}`);
    return co;
  }

  private mapRawToCO(raw: any): CounterOffer {
    if (!raw) return raw;
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
        ? JSON.parse(raw.work_schedule)
        : (raw.work_schedule ?? raw.workSchedule),
      startDate: normalizeDateOnly(raw.start_date ?? raw.startDate),
      message: raw.message ?? null,
      expiresAt: raw.expires_at ? new Date(raw.expires_at) : (raw.expiresAt ?? null),
      warningSentAt: raw.warning_sent_at ? new Date(raw.warning_sent_at) : (raw.warningSentAt ?? null),
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

  private mapRawToOffer(raw: any): Offer {
    if (!raw) return raw;
    return {
      id: raw.id,
      clientId: raw.client_id ?? raw.clientId,
      talentId: raw.talent_id ?? raw.talentId,
      jobListingId: raw.job_listing_id ?? raw.jobListingId,
      contractType: raw.contract_type ?? raw.contractType,
      contractTitle: raw.contract_title ?? raw.contractTitle,
      status: raw.status,
      rate: raw.rate,
      currencyCode: raw.currency_code ?? raw.currencyCode,
      durationMonths: raw.duration_months ?? raw.durationMonths,
      workSchedule: typeof raw.work_schedule === 'string'
        ? JSON.parse(raw.work_schedule)
        : (raw.work_schedule ?? raw.workSchedule),
      startDate: normalizeDateOnly(raw.start_date ?? raw.startDate),
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
