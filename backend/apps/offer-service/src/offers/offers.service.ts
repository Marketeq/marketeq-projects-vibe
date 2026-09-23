// apps/offer-service/src/offers/offers.service.ts
// OS-25: Full state machine implementation — CAS helper + all transitions.
// OS-28: Added checkActiveOfferConstraint(), improved create() and resend().
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, DataSource } from 'typeorm';
import { Offer } from './entities/offer.entity';
import { OfferStatus } from './enums/offer-status.enum';
import { OfferStateMachine, OfferConcurrentModificationException } from './offer-state-machine';
import {
  ActiveOfferAlreadyExistsException,
  OfferNotResendableException,
  InternalOfferException,
  OfferAlreadyAcceptedException,
  OfferExpiredException,
} from '../common/exceptions/offer.exceptions';
import { OutboxService } from '../outbox/outbox.service';
import { AblyService } from '../realtime/ably.service';
import { ListingsClient } from '../integrations/listings.client';
import { calculateExpiresAt } from '../scheduler/ttl.helper';
import { OFFER_EVENTS } from '../messaging/events/offer-events';
import { OFFER_EXCHANGE } from '../messaging/constants/rabbitmq.constants';
import {
  buildOfferCreatedPayload,
  buildOfferEditedPayload,
  buildOfferAcceptedPayload,
  buildOfferDeclinedPayload,
  buildOfferWithdrawnPayload,
  buildOfferExpiredPayload,
  buildOfferResentPayload,
} from '../messaging/events/offer-payload-builders';
import { OfferHistoryService } from '../offer-history/offer-history.service';
import { OfferTermsSnapshot } from '../offer-history/entities/offer-history-event.entity';
import { OFFER_CONSTANTS } from '../common/constants/offer.constants';
import { normalizeDateOnly } from '../common/utils/normalize-date-only';
import { ListOffersQueryDto } from './dto/list-offers-query.dto';
import { OfferListQueryBuilder } from './offer-list-query.builder';
import { derivePartyRole } from '../guards/party-role.util';
import {
  LatestCounterOfferSummary,
  OfferListItem,
  PaginatedOfferListResponse,
} from './interfaces/offer-response.interface';

// Re-export for counter-offers service
export { OfferConcurrentModificationException };

// PMCM-393 AC-41.01/41.06: name of the partial unique index added in
// migrations/1789622400000-AddOfferOneActivePerPairIndex.ts. Kept as a
// literal here (not imported) — migrations are self-contained SQL, not
// coupled to application code — so this must be kept in sync by hand if
// the index is ever renamed.
const ACTIVE_OFFER_UNIQUE_INDEX = 'uq_offers_one_active_per_pair';

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
    private readonly offerHistoryService: OfferHistoryService,
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
  // PMCM-376: additive only — every Offer field stays exactly as it was;
  // latestCounterOffer is a new field, populated the same way list() does
  // (same helper, same DISTINCT ON latest-by-created_at semantics, same
  // null-when-absent behaviour). findByIdOrThrow's other callers (CAS
  // preconditions) are untouched — this extra query only runs on this
  // controller-facing read path.
  async findById(
    id: string,
  ): Promise<Offer & { latestCounterOffer: LatestCounterOfferSummary | null }> {
    const offer = await this.findByIdOrThrow(id);
    const latestCounterOffers = await this.fetchLatestCounterOffers([id]);
    return {
      ...offer,
      latestCounterOffer: latestCounterOffers.get(id) ?? null,
    };
  }

  // ============================================================
  // list() — GET /v1/offers — role-scoped, paginated offers inbox
  // ============================================================

  /**
   * userId comes from the JWT (CurrentUser), never from the query string —
   * OfferListQueryBuilder.resolvePartyFilter is the only thing that
   * decides the WHERE clause, so `as` can narrow to one side of userId's
   * own offers but can never widen the query to another user's.
   *
   * No role param: libs/auth's JwtStrategy.validate() never sets one (see
   * roles.guard.ts's comment), so the default scope is "offers where
   * userId is either party" rather than branching on a role that's always
   * undefined.
   */
  async list(
    userId: string,
    query: ListOffersQueryDto,
  ): Promise<PaginatedOfferListResponse> {
    const partyFilter = OfferListQueryBuilder.resolvePartyFilter(userId, query.as);
    const sortSpec = OfferListQueryBuilder.resolveSort(query.sort, query.order);
    const offset = OfferListQueryBuilder.resolveOffset(query.page, query.limit);

    const qb = this.offerRepo.createQueryBuilder('o');

    if (partyFilter.mode === 'either') {
      // BitmapOr over idx_offers_client_id + idx_offers_talent_id (also
      // satisfiable via idx_offers_client_talent's leading column) at
      // realistic table sizes — confirmed with EXPLAIN against the local
      // seed data (SET enable_seqscan=off surfaces the BitmapOr plan; the
      // planner just prefers a seq scan on this table while it's this
      // small, which is expected and not a sign of a missing index).
      qb.where('(o.client_id = :partyId OR o.talent_id = :partyId)', { partyId: partyFilter.userId });
    } else {
      const column = partyFilter.mode === 'client' ? 'client_id' : 'talent_id';
      qb.where(`o.${column} = :partyId`, { partyId: partyFilter.userId });
    }

    if (query.status && query.status.length > 0) {
      qb.andWhere('o.status IN (:...statuses)', { statuses: query.status });
    }

    // PMCM-393 AC-41.02: ANDed onto the partyFilter WHERE above, which is
    // always built from userId (the JWT) — this can only narrow the result
    // to one talent, never widen it to another caller's offers.
    if (query.talentId) {
      qb.andWhere('o.talent_id = :talentId', { talentId: query.talentId });
    }

    qb.orderBy(`o.${sortSpec.column}`, sortSpec.direction)
      // Tie-breaker: createdAt/expiresAt aren't unique, so without a
      // second key, rows on the boundary between two pages could shift
      // between requests and either repeat or get skipped.
      .addOrderBy('o.id', sortSpec.direction)
      .skip(offset)
      .take(query.limit);

    const [offers, total] = await qb.getManyAndCount();

    const latestCounterOffers = await this.fetchLatestCounterOffers(
      offers.map((offer) => offer.id),
    );

    const data: OfferListItem[] = offers.map((offer) => {
      // Always derived from clientId/talentId vs userId — never from
      // `as`, which only shaped the WHERE clause above. null here would
      // mean the WHERE clause and derivePartyRole disagree on membership,
      // which the query construction above rules out by design.
      const viewerRole = derivePartyRole(offer, userId);
      if (!viewerRole) {
        this.logger.error(`Offer ${offer.id} returned by the party filter but userId ${userId} is neither party.`);
        throw new InternalOfferException();
      }
      return {
        ...offer,
        viewerRole,
        latestCounterOffer: latestCounterOffers.get(offer.id) ?? null,
      };
    });

    return { data, total, page: query.page, limit: query.limit };
  }

  // One extra query for the whole page (not one per row) — avoids the N+1
  // a naive per-offer lookup would cause. DISTINCT ON (offer_id) with
  // created_at DESC, id DESC picks exactly the latest counter-offer per
  // offer id in a single pass.
  private async fetchLatestCounterOffers(
    offerIds: string[],
  ): Promise<Map<string, LatestCounterOfferSummary>> {
    const latestByOfferId = new Map<string, LatestCounterOfferSummary>();
    if (offerIds.length === 0) return latestByOfferId;

    const rows = await this.dataSource.query(
      `
        SELECT DISTINCT ON (offer_id)
          id, offer_id, submitted_by, submitted_by_id, status,
          rate, currency_code, duration_months, start_date, created_at
        FROM offer_service.counter_offers
        WHERE offer_id = ANY($1)
        ORDER BY offer_id, created_at DESC, id DESC
      `,
      [offerIds],
    );

    for (const raw of rows) {
      latestByOfferId.set(raw.offer_id, {
        id: raw.id,
        submittedBy: raw.submitted_by,
        submittedById: raw.submitted_by_id,
        status: raw.status,
        rate: raw.rate,
        currencyCode: raw.currency_code,
        durationMonths: raw.duration_months,
        startDate: normalizeDateOnly(raw.start_date),
        createdAt: raw.created_at instanceof Date
          ? raw.created_at.toISOString()
          : raw.created_at,
      });
    }

    return latestByOfferId;
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

      await this.offerHistoryService.append({
        offerId, eventType: OFFER_EVENTS.ACCEPTED,
        actor: 'TALENT', actorId: requesterId,
        terms: this.termsFromOffer(accepted),
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

      await this.offerHistoryService.append({
        offerId, eventType: OFFER_EVENTS.DECLINED,
        actor: 'TALENT', actorId: requesterId,
        terms: this.termsFromOffer(declined),
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

    if (offer.status === OfferStatus.ACCEPTED) {
      throw new OfferAlreadyAcceptedException();
    }
    if (
      offer.status === OfferStatus.EXPIRED ||
      (offer.status === OfferStatus.PENDING && offer.expiresAt <= new Date())
    ) {
      throw new OfferExpiredException();
    }

    // Withdrawal is allowed from PENDING or COUNTERED.
    if (offer.status !== OfferStatus.PENDING && offer.status !== OfferStatus.COUNTERED) {
      OfferStateMachine.assertCanTransition(offer.status, OfferStatus.WITHDRAWN);
    }

    const withdrawalMessage = dto?.message ?? null;

    const updatedOffer = await this.dataSource.transaction(async (em) => {
      // CAS: COUNTERED is accepted unconditionally (deliberate — see the
      // comment above). PENDING is accepted only if still not expired —
      // closes the race where expires_at has passed but the TTL sweeper
      // hasn't flipped the status yet, which the pre-transaction check
      // above can't fully close on its own.
      const result = await em.query(`
        UPDATE offer_service.offers
          SET status = 'WITHDRAWN', withdrawn_at = NOW(), withdrawal_message = $2, updated_at = NOW()
        WHERE id = $1
          AND (status = 'COUNTERED' OR (status = 'PENDING' AND expires_at > NOW()))
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

      await this.offerHistoryService.append({
        offerId, eventType: OFFER_EVENTS.WITHDRAWN,
        actor: 'CLIENT', actorId: requesterId,
        terms: this.termsFromOffer(withdrawn),
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
  // raiseIfActiveOfferConflict() — PMCM-393 AC-41.01/41.06
  // checkActiveOfferConstraint() above is check-then-insert with a real
  // race window; uq_offers_one_active_per_pair (see the migration) is the
  // actual DB-level backstop. Scoped to that index by name — a 23505 on
  // any other constraint (or any other error) is rethrown unchanged by the
  // caller, never swallowed here.
  // ============================================================

  private async raiseIfActiveOfferConflict(
    error: unknown,
    clientId: string,
    talentId: string,
  ): Promise<void> {
    const driverError = (error as { driverError?: { code?: string; constraint?: string } })?.driverError;
    const code = (error as { code?: string })?.code ?? driverError?.code;
    const constraint = (error as { constraint?: string })?.constraint ?? driverError?.constraint;

    if (code !== '23505' || constraint !== ACTIVE_OFFER_UNIQUE_INDEX) return;

    const existing = await this.offerRepo.findOne({
      where: [
        { clientId, talentId, status: OfferStatus.PENDING },
        { clientId, talentId, status: OfferStatus.COUNTERED },
      ],
      select: ['id', 'status'],
    });

    // If the conflicting row can't be found (it would have to have
    // transitioned away in the few-ms window between the failed insert and
    // this re-query), fall through and let the caller rethrow the original
    // error rather than inventing an offer id.
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

    let updatedOffer: Offer;
    try {
      updatedOffer = await this.dataSource.transaction(async (em) => {
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

        await this.offerHistoryService.append({
          offerId: saved.id, eventType: OFFER_EVENTS.CREATED,
          actor: 'CLIENT', actorId: userId,
          terms: this.termsFromOffer(saved),
        }, em);

        return saved;
      });
    } catch (error) {
      // PMCM-393 AC-41.01/41.06: the checkActiveOfferConstraint() call above
      // already caught the common case — this only fires in the race window
      // between that check and this insert. Re-raises the same 409 rather
      // than letting a raw 23505 surface as a 500.
      await this.raiseIfActiveOfferConflict(error, userId, dto.talentId);
      throw error;
    }

    this.ablyService.publish(updatedOffer.id, updatedOffer, null, false);
    return updatedOffer;
  }

  // ============================================================
  // edit() — CLIENT edits a PENDING offer
  // Resets TTL to fresh 14 days, clears warningSentAt
  // ============================================================

  async edit(id: string, userId: string, dto: any): Promise<Offer> {
    const offer = await this.findByIdOrThrow(id);

    OfferStateMachine.assertIsClient(offer, userId);
    OfferStateMachine.assertCanTransition(offer.status, OfferStatus.PENDING); // must be PENDING

    const previousTerms = this.termsFromOffer(offer);
    const newExpiresAt = calculateExpiresAt();

    const setParts: string[] = ['updated_at = NOW()', 'expires_at = $2', 'warning_sent_at = NULL'];
    const values: unknown[] = [id, newExpiresAt.toISOString()];
    let paramIdx = 3;

    const editableFields: Record<string, string> = {
      rate: 'rate', currencyCode: 'currency_code', durationMonths: 'duration_months',
      contractTitle: 'contract_title', message: 'message', startDate: 'start_date',
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

    const updatedOffer = await this.dataSource.transaction(async (em) => {
      const result = await em.query(`
        UPDATE offer_service.offers
        SET    ${setParts.join(', ')}
        WHERE  id = $1 AND status = 'PENDING'
        RETURNING *
      `, values);

      const rows = Array.isArray(result[0]) ? result[0] : result;
      const count = typeof result[1] === 'number' ? result[1] : rows.length;
      if (count === 0) throw new OfferConcurrentModificationException(id);

      const edited = this.mapRawToOffer(rows[0]);

      await this.outboxService.write({
        aggregateId: id,
        eventType: OFFER_EVENTS.EDITED,
        routingKey: OFFER_EVENTS.EDITED,
        exchange: OFFER_EXCHANGE,
        payload: buildOfferEditedPayload(edited, previousTerms as any) as any,
      }, em);

      await this.offerHistoryService.append({
        offerId: id,
        eventType: OFFER_EVENTS.EDITED,
        actor: 'CLIENT',
        actorId: userId,
        terms: this.termsFromOffer(edited),
      }, em);

      return edited;
    });

    this.ablyService.publish(id, updatedOffer, null, false);
    return updatedOffer;
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

    let newOffer: Offer;
    try {
      newOffer = await this.dataSource.transaction(async (em) => {
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

        await this.offerHistoryService.append({
          offerId: saved.id, eventType: OFFER_EVENTS.RESENT,
          actor: 'CLIENT', actorId: userId,
          terms: this.termsFromOffer(saved),
        }, em);

        return saved;
      });
    } catch (error) {
      // PMCM-393 AC-41.01/41.06: same race-window backstop as create() above.
      await this.raiseIfActiveOfferConflict(error, userId, originalOffer.talentId);
      throw error;
    }

    this.ablyService.publish(newOffer.id, newOffer, null, false);
    return newOffer;
  }

  // ============================================================
  // getHistory() — cursor-based paginated history
  // ============================================================

  async getHistory(id: string, query: any) {
    const limit = Math.min(query?.limit ?? OFFER_CONSTANTS.HISTORY_PAGE_SIZE, OFFER_CONSTANTS.HISTORY_PAGE_SIZE);
    const cursor = query?.cursor;

    const qb = this.dataSource
      .getRepository('OfferHistoryEvent')
      .createQueryBuilder('h')
      .where('h.offer_id = :offerId', { offerId: id })
      .orderBy('h.created_at', 'DESC')
      .addOrderBy('h.id', 'DESC')
      .take(limit + 1);

    if (cursor) {
      const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
      const [cursorDate, cursorId] = decoded.split('|');
      qb.andWhere('(h.created_at < :cursorDate OR (h.created_at = :cursorDate AND h.id < :cursorId))', {
        cursorDate, cursorId,
      });
    }

    const rows = await qb.getMany();

    const total = await this.dataSource
      .getRepository('OfferHistoryEvent')
      .count({ where: { offerId: id } });

    let nextCursor: string | null = null;
    if (rows.length > limit) {
      rows.pop();
      const last = rows[rows.length - 1];
      const raw = `${(last as any).createdAt.toISOString()}|${(last as any).id}`;
      nextCursor = Buffer.from(raw).toString('base64');
    }

    return { data: rows, nextCursor, total };
  }

  // ============================================================
  // Private: build terms snapshot for history
  // ============================================================

  private termsFromOffer(offer: Offer): OfferTermsSnapshot {
    return {
      rate: offer.rate,
      currencyCode: offer.currencyCode,
      durationMonths: offer.durationMonths,
      workSchedule: offer.workSchedule as { type: string; hoursPerWeek?: number },
      startDate: offer.startDate,
      message: offer.message ?? null,
    };
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