// apps/offer-service/src/offers/offers.service.ts
// OS-25: Full state machine implementation — CAS helper + all transitions.
// OS-28: Added checkActiveOfferConstraint(), improved create() and resend().
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, DataSource } from 'typeorm';
import { Offer } from './entities/offer.entity';
import { OfferStatus } from './enums/offer-status.enum';
import { OfferStateMachine, OfferConcurrentModificationException } from './offer-state-machine';
import { ActiveOfferAlreadyExistsException, OfferNotResendableException } from '../common/exceptions/offer.exceptions';
import { OutboxService } from '../outbox/outbox.service';
import { AblyService } from '../realtime/ably.service';
import { ListingsClient } from '../integrations/listings.client';
import { calculateExpiresAt } from '../scheduler/ttl.helper';
import { OFFER_EVENTS } from '../messaging/events/offer-events';
import { OFFER_EXCHANGE } from '../messaging/constants/rabbitmq.constants';
import {
  buildOfferCreatedPayload,
  buildOfferAcceptedPayload,
  buildOfferDeclinedPayload,
  buildOfferWithdrawnPayload,
  buildOfferExpiredPayload,
  buildOfferResentPayload,
} from '../messaging/events/offer-payload-builders';

// Re-export for counter-offers service
export { OfferConcurrentModificationException };

@Injectable()
export class OffersService {
  private readonly logger = new Logger(OffersService.name);

  constructor(
    @InjectRepository(Offer)
    private readonly offerRepo: Repository<Offer>,
    private readonly dataSource: DataSource,
    private readonly outboxService: OutboxService,
    private readonly ablyService: AblyService,
    private readonly listingsClient: ListingsClient,
  ) {}

  // ============================================================
  // findByIdOrThrow — used before every CAS operation
  // ============================================================

  async findByIdOrThrow(id: string): Promise<Offer> {
    const offer = await this.offerRepo.findOne({ where: { id } });
    if (!offer) throw new NotFoundException(`Offer ${id} not found`);
    return offer;
  }

  // Backward-compat alias used by controller GET :id
  async findById(id: string): Promise<Offer> {
    return this.findByIdOrThrow(id);
  }

  // ============================================================
  // CAS helper — the atomic state transition primitive
  // ============================================================

  /**
   * performCAS — Atomic Compare-And-Swap state transition.
   *
   * UPDATE offers SET status=$newStatus, <fields>
   * WHERE id=$id AND status=$expectedStatus
   *
   * 0 rows affected → 409 Conflict.
   * 1 row affected → returns the updated offer.
   */
  async performCAS(
    em: EntityManager,
    offerId: string,
    expectedStatus: OfferStatus,
    newStatus: OfferStatus,
    extraFields: Record<string, unknown> = {},
  ): Promise<Offer> {
    const setParts: string[] = ['status = $3', 'updated_at = NOW()'];
    const values: unknown[] = [offerId, expectedStatus, newStatus];
    let paramIdx = 4;

    for (const [col, val] of Object.entries(extraFields)) {
      if (val === 'NOW()') {
        setParts.push(`${col} = NOW()`);
      } else {
        setParts.push(`${col} = $${paramIdx}`);
        values.push(val);
        paramIdx++;
      }
    }

    const sql = `
      UPDATE offer_service.offers
      SET    ${setParts.join(', ')}
      WHERE  id = $1 AND status = $2
      RETURNING *
    `;

    const result = await em.query(sql, values);
    const rows = Array.isArray(result[0]) ? result[0] : result;
    const count = typeof result[1] === 'number' ? result[1] : rows.length;

    if (count === 0) {
      throw new OfferConcurrentModificationException(offerId);
    }

    return this.mapRawToOffer(rows[0]);
  }

  // ============================================================
  // accept() — PENDING -> ACCEPTED (TALENT only)
  // ============================================================

  async accept(offerId: string, requesterId: string, _dto?: any): Promise<Offer> {
    const offer = await this.findByIdOrThrow(offerId);

    OfferStateMachine.assertIsTalent(offer, requesterId);
    OfferStateMachine.assertNotBlockedByCO(offer, 'accept');
    OfferStateMachine.assertCanTransition(offer.status, OfferStatus.ACCEPTED);

    const updatedOffer = await this.dataSource.transaction(async (em) => {
      const accepted = await this.performCAS(
        em, offerId, OfferStatus.PENDING, OfferStatus.ACCEPTED,
        { accepted_at: 'NOW()' },
      );

      await this.outboxService.write({
        aggregateId: offerId,
        eventType: OFFER_EVENTS.ACCEPTED,
        routingKey: OFFER_EVENTS.ACCEPTED,
        exchange: OFFER_EXCHANGE,
        payload: buildOfferAcceptedPayload(accepted) as any,
      }, em);

      return accepted;
    });

    this.ablyService.publish(offerId, updatedOffer, null, false);
    return updatedOffer;
  }

  // ============================================================
  // decline() — PENDING -> DECLINED (TALENT only)
  // ============================================================

  async decline(
    offerId: string,
    requesterId: string,
    dto?: any,
  ): Promise<Offer> {
    const offer = await this.findByIdOrThrow(offerId);

    OfferStateMachine.assertIsTalent(offer, requesterId);
    OfferStateMachine.assertNotBlockedByCO(offer, 'decline');
    OfferStateMachine.assertCanTransition(offer.status, OfferStatus.DECLINED);

    const reason = dto?.reason ?? dto?.declineReason ?? '';
    const chip = dto?.chip ?? dto?.declineChip ?? null;

    const updatedOffer = await this.dataSource.transaction(async (em) => {
      const declined = await this.performCAS(
        em, offerId, OfferStatus.PENDING, OfferStatus.DECLINED,
        {
          declined_at: 'NOW()',
          declined_reason: reason,
          declined_chip: chip,
        },
      );

      await this.outboxService.write({
        aggregateId: offerId,
        eventType: OFFER_EVENTS.DECLINED,
        routingKey: OFFER_EVENTS.DECLINED,
        exchange: OFFER_EXCHANGE,
        payload: buildOfferDeclinedPayload(declined) as any,
      }, em);

      return declined;
    });

    this.ablyService.publish(offerId, updatedOffer, null, false);
    return updatedOffer;
  }

  // ============================================================
  // withdraw() — PENDING|COUNTERED -> WITHDRAWN (CLIENT only)
  // Client can withdraw even when offer is COUNTERED.
  // ============================================================

  async withdraw(
    offerId: string,
    requesterId: string,
    dto?: any,
  ): Promise<Offer> {
    const offer = await this.findByIdOrThrow(offerId);

    OfferStateMachine.assertIsClient(offer, requesterId);

    // Withdrawal is allowed from PENDING or COUNTERED.
    if (offer.status !== OfferStatus.PENDING && offer.status !== OfferStatus.COUNTERED) {
      OfferStateMachine.assertCanTransition(offer.status, OfferStatus.WITHDRAWN);
    }

    const withdrawalMessage = dto?.withdrawalMessage ?? dto?.message ?? null;

    const updatedOffer = await this.dataSource.transaction(async (em) => {
      // CAS: accept PENDING or COUNTERED as expected status.
      const result = await em.query(`
        UPDATE offer_service.offers
          SET status = 'WITHDRAWN', withdrawn_at = NOW(), withdrawal_message = $2, updated_at = NOW()
        WHERE id = $1 AND status IN ('PENDING', 'COUNTERED')
        RETURNING *
      `, [offerId, withdrawalMessage]);

      const rows = Array.isArray(result[0]) ? result[0] : result;
      const count = typeof result[1] === 'number' ? result[1] : rows.length;
      if (count === 0) throw new OfferConcurrentModificationException(offerId);

      const withdrawn = this.mapRawToOffer(rows[0]);

      await this.outboxService.write({
        aggregateId: offerId,
        eventType: OFFER_EVENTS.WITHDRAWN,
        routingKey: OFFER_EVENTS.WITHDRAWN,
        exchange: OFFER_EXCHANGE,
        payload: buildOfferWithdrawnPayload(withdrawn) as any,
      }, em);

      return withdrawn;
    });

    this.ablyService.publish(offerId, updatedOffer, null, false);
    return updatedOffer;
  }

  // ============================================================
  // expire() — PENDING -> EXPIRED (SYSTEM / scheduler only)
  // Called by ExpiryProcessor. Never callable via API.
  // ============================================================

  async expire(offerId: string, em: EntityManager): Promise<Offer | null> {
    const result = await em.query(`
      UPDATE offer_service.offers
        SET status = 'EXPIRED', expired_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND status = 'PENDING'
      RETURNING *
    `, [offerId]);

    const rows = Array.isArray(result[0]) ? result[0] : result;
    const count = typeof result[1] === 'number' ? result[1] : rows.length;

    if (count === 0) {
      this.logger.debug(`Offer ${offerId} already transitioned before expiry ran.`);
      return null;
    }

    const expired = this.mapRawToOffer(rows[0]);

    await this.outboxService.write({
      aggregateId: offerId,
      eventType: OFFER_EVENTS.EXPIRED,
      routingKey: OFFER_EVENTS.EXPIRED,
      exchange: OFFER_EXCHANGE,
      payload: buildOfferExpiredPayload(expired) as any,
    }, em);

    // Ably publish is called by ExpiryProcessor after the transaction commits.
    return expired;
  }

  // ============================================================
  // checkActiveOfferConstraint() — One active offer per client-talent pair
  // ============================================================

  private async checkActiveOfferConstraint(
    clientId: string,
    talentId: string,
  ): Promise<void> {
    const existing = await this.offerRepo.findOne({
      where: [
        { clientId, talentId, status: OfferStatus.PENDING },
        { clientId, talentId, status: OfferStatus.COUNTERED },
      ],
      select: ['id', 'status', 'contractTitle'],
    });

    if (existing) {
      throw new ActiveOfferAlreadyExistsException(existing.id, existing.status);
    }
  }

  // ============================================================
  // create() — CLIENT creates a new offer
  // ============================================================

  async create(userId: string, dto: any, clientJwt?: string): Promise<Offer> {
    // Validate listing exists, is published, and belongs to this client.
    await this.listingsClient.validateListing(dto.jobListingId, userId, clientJwt);

    // Enforce: one active offer per client-talent pair.
    await this.checkActiveOfferConstraint(userId, dto.talentId);

    const expiresAt = calculateExpiresAt();

    const updatedOffer = await this.dataSource.transaction(async (em) => {
      const result = await em.query(`
        INSERT INTO offer_service.offers (
          client_id, talent_id, job_listing_id,
          contract_type, contract_title, status,
          rate, currency_code, duration_months,
          work_schedule, start_date, message,
          expires_at, warning_sent_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, 'PENDING', $6, $7, $8, $9, $10, $11, $12, NULL, NOW(), NOW())
        RETURNING *
      `, [
        userId, dto.talentId, dto.jobListingId,
        dto.contractType, dto.contractTitle,
        dto.rate, dto.currencyCode, dto.durationMonths,
        JSON.stringify(dto.workSchedule), dto.startDate,
        dto.message ?? null, expiresAt.toISOString(),
      ]);

      const rows = Array.isArray(result[0]) && Array.isArray(result[0]) ? result[0] : result;
      const saved = this.mapRawToOffer(rows[0] ?? rows);

      await this.outboxService.write({
        aggregateId: saved.id,
        eventType: OFFER_EVENTS.CREATED,
        routingKey: OFFER_EVENTS.CREATED,
        exchange: OFFER_EXCHANGE,
        payload: buildOfferCreatedPayload(saved) as any,
      }, em);

      return saved;
    });

    this.ablyService.publish(updatedOffer.id, updatedOffer, null, false);
    return updatedOffer;
  }

  // ============================================================
  // edit() — CLIENT edits a PENDING offer (stub — future spec doc)
  // ============================================================

  async edit(id: string, userId: string, dto: any) {
    this.logger.log(`[STUB] edit offer ${id} by ${userId}`);
    return { stub: true, action: 'edit', id, userId, payload: dto };
  }

  // ============================================================
  // resend() — CLIENT resends a terminal offer as a new offer
  // ============================================================

  async resend(originalOfferId: string, userId: string, dto: any): Promise<Offer> {
    const originalOffer = await this.findByIdOrThrow(originalOfferId);

    OfferStateMachine.assertIsClient(originalOffer, userId);

    // Only terminal offers can be resent.
    const terminalStatuses = [OfferStatus.DECLINED, OfferStatus.WITHDRAWN, OfferStatus.EXPIRED];
    if (!terminalStatuses.includes(originalOffer.status)) {
      throw new OfferNotResendableException();
    }

    // Enforce: one active offer per client-talent pair.
    await this.checkActiveOfferConstraint(userId, originalOffer.talentId);

    const expiresAt = calculateExpiresAt();

    const newOffer = await this.dataSource.transaction(async (em) => {
      const result = await em.query(`
        INSERT INTO offer_service.offers (
          client_id, talent_id, job_listing_id,
          contract_type, contract_title, status,
          rate, currency_code, duration_months,
          work_schedule, start_date, message,
          expires_at, warning_sent_at, original_offer_id,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, 'PENDING', $6, $7, $8, $9, $10, $11, $12, NULL, $13, NOW(), NOW())
        RETURNING *
      `, [
        userId, originalOffer.talentId, originalOffer.jobListingId,
        dto?.contractType ?? originalOffer.contractType,
        dto?.contractTitle ?? originalOffer.contractTitle,
        dto?.rate ?? originalOffer.rate,
        dto?.currencyCode ?? originalOffer.currencyCode,
        dto?.durationMonths ?? originalOffer.durationMonths,
        JSON.stringify(dto?.workSchedule ?? originalOffer.workSchedule),
        dto?.startDate ?? originalOffer.startDate,
        dto?.message ?? null,
        expiresAt.toISOString(),
        originalOfferId,
      ]);

      const rows = Array.isArray(result[0]) && Array.isArray(result[0]) ? result[0] : result;
      const saved = this.mapRawToOffer(rows[0] ?? rows);

      await this.outboxService.write({
        aggregateId: saved.id,
        eventType: OFFER_EVENTS.RESENT,
        routingKey: OFFER_EVENTS.RESENT,
        exchange: OFFER_EXCHANGE,
        payload: buildOfferResentPayload(saved) as any,
      }, em);

      return saved;
    });

    this.ablyService.publish(newOffer.id, newOffer, null, false);
    return newOffer;
  }

  // ============================================================
  // getHistory() — stub for future spec doc
  // ============================================================

  async getHistory(id: string, query: any) {
    this.logger.log(`[STUB] getHistory for offer ${id}`);
    return { stub: true, action: 'getHistory', id, cursor: query?.cursor, limit: query?.limit, items: [] };
  }

  // ============================================================
  // Private: map raw SQL RETURNING * row to Offer-like shape
  // ============================================================

  private mapRawToOffer(raw: any): Offer {
    if (!raw) return raw;
    // Raw SQL returns snake_case. Map to entity camelCase.
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