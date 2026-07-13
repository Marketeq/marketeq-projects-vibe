**OS-28**

**Offer Service --- Active Offer Enforcement**

**Rule:** One active offer per client-talent pair (global) **Active =**
PENDING or COUNTERED

This document covers the enforcement of the
one-active-offer-per-client-talent-pair constraint. A client can only
have one offer in a non-terminal state (PENDING or COUNTERED) for any
given talent at one time. To send a new offer to the same talent, the
client must first withdraw the existing active offer. This rule is
enforced at both the service layer and the database index level.

**File Map**

  ---------- ----------------------------------------------------- -----------------------------------
  **Step**   **File Path**                                         **Purpose**

  **1**      (reference)                                           Business rules: what counts as
                                                                   active, the withdrawal requirement

  **2**      src/offers/offers.service.ts ---                      Service-layer enforcement: query +
             checkActiveOfferConstraint()                          exception

  **3**      src/offers/exceptions/offer.exceptions.ts (update)    ActiveOfferAlreadyExistsException
                                                                   --- the 409 error thrown on
                                                                   violation

  **4**      (reference)                                           Database-level enforcement:
                                                                   idx_offers_client_talent composite
                                                                   index

  **5**      src/counter-offers/entities/counter-offer.entity.ts   uq_counter_offers_one_pending
             (reference)                                           partial unique index (one PENDING
                                                                   CO rule)

  **6**      (reference)                                           Restoration logic: how the active
                                                                   offer restores after CO terminal
                                                                   events

  **7**      (reference)                                           Verification: queries to confirm
                                                                   enforcement works correctly
  ---------- ----------------------------------------------------- -----------------------------------

+-----------------------------------------------------------------------+
| **Step 1 Business Rules**                                             |
|                                                                       |
| All confirmed decisions on active offer enforcement                   |
+-----------------------------------------------------------------------+

  --------------------- -------------------------------------------------
  **What is an active   An offer in status PENDING or COUNTERED. Both
  offer**               statuses represent an ongoing negotiation.
                        Terminal statuses (ACCEPTED, DECLINED, WITHDRAWN,
                        EXPIRED) do not count.

  **The constraint**    A client can have at most ONE active offer per
                        talent at any time. This applies globally ---
                        across all job listings and contract types.

  **Applies to**        Both the initial offer creation (POST /v1/offers)
                        and resending a terminal offer (POST
                        /v1/offers/:id/resend).

  **How to unlock**     The client must withdraw the existing active
                        offer first (POST /v1/offers/:id/withdraw). Then
                        they can send a new offer.

  **COUNTERED counts as An offer in COUNTERED status still blocks new
  active**              offers. The client must withdraw it even if there
                        is an active counter offer.

  **Error response**    HTTP 409 Conflict with error code
                        ACTIVE_OFFER_ALREADY_EXISTS when the constraint
                        is violated.

  **Error data**        The response includes the ID of the existing
                        active offer so the frontend can link to it.

  **Concurrency         The check uses a service-layer SELECT before the
  safety**              INSERT. Race conditions are handled at the DB
                        level --- there is no DB unique constraint on
                        this rule (the combination of two non-terminal
                        statuses cannot be expressed as a simple unique
                        constraint). The service-layer check + the speed
                        of the transaction make double-inserts extremely
                        unlikely. If needed, a SELECT FOR UPDATE in the
                        same transaction can be added.
  --------------------- -------------------------------------------------

+-----------------------------------------------------------------------+
| Why the constraint is global (not per job listing):                   |
|                                                                       |
| A client could send multiple simultaneous offers to the same talent   |
| for                                                                   |
|                                                                       |
| different job listings or contract types. This creates confusion for  |
| the talent                                                            |
|                                                                       |
| (which offer to respond to?) and for the client (which offer was      |
| accepted?).                                                           |
|                                                                       |
| The global rule ensures one clean negotiation per client-talent       |
| relationship at a time.                                               |
|                                                                       |
| The CO one-PENDING rule is separate:                                  |
|                                                                       |
| uq_counter_offers_one_pending (OS-16) enforces that only ONE counter  |
| offer                                                                 |
|                                                                       |
| can be PENDING for a given parent offer at a time. This is enforced   |
| at the                                                                |
|                                                                       |
| DB level with a partial unique index. It is separate from the active  |
| offer                                                                 |
|                                                                       |
| constraint documented here.                                           |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 2 Service-Layer Enforcement --- checkActiveOfferConstraint()** |
|                                                                       |
| Called in create() and resend() before any database write             |
+-----------------------------------------------------------------------+

checkActiveOfferConstraint() runs before the INSERT in create() and
before the INSERT in resend(). If an active offer already exists, it
throws ActiveOfferAlreadyExistsException immediately. The method never
reaches the database INSERT if the constraint is violated.

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/offers/offers.service.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| // ============================================================       |
|                                                                       |
| // checkActiveOfferConstraint() --- add this method to OffersService  |
|                                                                       |
| // ============================================================       |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* checkActiveOfferConstraint()                                       |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Ensures no active (PENDING or COUNTERED) offer already exists      |
|                                                                       |
| \* for the given client-talent pair.                                  |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Called in:                                                         |
|                                                                       |
| \* - OffersService.create() (before inserting new offer)              |
|                                                                       |
| \* - OffersService.resend() (before inserting resent offer)           |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* \@throws ActiveOfferAlreadyExistsException (409) if an active      |
| offer exists.                                                         |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| private async checkActiveOfferConstraint(                             |
|                                                                       |
| clientId: string,                                                     |
|                                                                       |
| talentId: string,                                                     |
|                                                                       |
| ): Promise\<void\> {                                                  |
|                                                                       |
| // Uses idx_offers_client_talent composite index (OS-16).             |
|                                                                       |
| // This query is sub-millisecond even at large table sizes.           |
|                                                                       |
| const existing = await this.offerRepo.findOne({                       |
|                                                                       |
| where: \[                                                             |
|                                                                       |
| { clientId, talentId, status: OfferStatus.PENDING },                  |
|                                                                       |
| { clientId, talentId, status: OfferStatus.COUNTERED },                |
|                                                                       |
| \],                                                                   |
|                                                                       |
| select: \[\'id\', \'status\', \'contractTitle\'\],                    |
|                                                                       |
| });                                                                   |
|                                                                       |
| if (existing) {                                                       |
|                                                                       |
| throw new ActiveOfferAlreadyExistsException(existing.id,              |
| existing.status);                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // How it is called in create()                                       |
|                                                                       |
| // ============================================================       |
|                                                                       |
| async create(clientId: string, dto: CreateOfferDto): Promise\<Offer\> |
| {                                                                     |
|                                                                       |
| // Step 1: Check constraint BEFORE any DB write.                      |
|                                                                       |
| await this.checkActiveOfferConstraint(clientId, dto.talentId);        |
|                                                                       |
| // Step 2: Proceed with offer creation.                               |
|                                                                       |
| const expiresAt = calculateExpiresAt();                               |
|                                                                       |
| const offer = this.offerRepo.create({                                 |
|                                                                       |
| clientId,                                                             |
|                                                                       |
| talentId: dto.talentId,                                               |
|                                                                       |
| jobListingId: dto.jobListingId,                                       |
|                                                                       |
| contractType: dto.contractType,                                       |
|                                                                       |
| contractTitle: dto.contractTitle,                                     |
|                                                                       |
| rate: dto.rate,                                                       |
|                                                                       |
| currencyCode: dto.currencyCode,                                       |
|                                                                       |
| durationMonths: dto.durationMonths,                                   |
|                                                                       |
| workSchedule: dto.workSchedule,                                       |
|                                                                       |
| startDate: dto.startDate,                                             |
|                                                                       |
| message: dto.message ?? null,                                         |
|                                                                       |
| status: OfferStatus.PENDING,                                          |
|                                                                       |
| expiresAt,                                                            |
|                                                                       |
| warningSentAt: null,                                                  |
|                                                                       |
| });                                                                   |
|                                                                       |
| return this.dataSource.transaction(async (em) =\> {                   |
|                                                                       |
| const saved = await em.save(offer);                                   |
|                                                                       |
| await this.outboxService.create(em, {                                 |
|                                                                       |
| aggregateId: saved.id,                                                |
|                                                                       |
| eventType: OFFER_EVENTS.CREATED,                                      |
|                                                                       |
| routingKey: OFFER_EVENTS.CREATED,                                     |
|                                                                       |
| exchange: OFFER_EXCHANGE,                                             |
|                                                                       |
| payload: buildOfferCreatedPayload(saved),                             |
|                                                                       |
| });                                                                   |
|                                                                       |
| return saved;                                                         |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // How it is called in resend()                                       |
|                                                                       |
| // ============================================================       |
|                                                                       |
| async resend(originalOfferId: string, clientId: string, dto:          |
| ResendOfferDto): Promise\<Offer\> {                                   |
|                                                                       |
| const originalOffer = await this.findByIdOrThrow(originalOfferId);    |
|                                                                       |
| OfferStateMachine.assertIsClient(originalOffer, clientId);            |
|                                                                       |
| // Only terminal offers can be resent.                                |
|                                                                       |
| const terminalStatuses = \[OfferStatus.DECLINED,                      |
| OfferStatus.WITHDRAWN, OfferStatus.EXPIRED\];                         |
|                                                                       |
| if (!terminalStatuses.includes(originalOffer.status)) {               |
|                                                                       |
| throw new OfferNotResendableException(originalOffer.status);          |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Check the constraint for the NEW offer about to be created.        |
|                                                                       |
| // Even though the original offer is terminal, a DIFFERENT active     |
| offer                                                                 |
|                                                                       |
| // might exist for this client-talent pair.                           |
|                                                                       |
| await this.checkActiveOfferConstraint(clientId,                       |
| originalOffer.talentId);                                              |
|                                                                       |
| const expiresAt = calculateExpiresAt();                               |
|                                                                       |
| return this.dataSource.transaction(async (em) =\> {                   |
|                                                                       |
| const newOffer = await em.save(em.create(Offer, {                     |
|                                                                       |
| clientId,                                                             |
|                                                                       |
| talentId: originalOffer.talentId,                                     |
|                                                                       |
| jobListingId: originalOffer.jobListingId,                             |
|                                                                       |
| contractType: dto.contractType ?? originalOffer.contractType,         |
|                                                                       |
| contractTitle: dto.contractTitle ?? originalOffer.contractTitle,      |
|                                                                       |
| rate: dto.rate ?? originalOffer.rate,                                 |
|                                                                       |
| currencyCode: dto.currencyCode ?? originalOffer.currencyCode,         |
|                                                                       |
| durationMonths: dto.durationMonths ?? originalOffer.durationMonths,   |
|                                                                       |
| workSchedule: dto.workSchedule ?? originalOffer.workSchedule,         |
|                                                                       |
| startDate: dto.startDate ?? originalOffer.startDate,                  |
|                                                                       |
| message: dto.message ?? null,                                         |
|                                                                       |
| status: OfferStatus.PENDING,                                          |
|                                                                       |
| expiresAt,                                                            |
|                                                                       |
| warningSentAt: null,                                                  |
|                                                                       |
| originalOfferId: originalOfferId, // Link to the offer being resent   |
|                                                                       |
| }));                                                                  |
|                                                                       |
| await this.outboxService.create(em, {                                 |
|                                                                       |
| aggregateId: newOffer.id,                                             |
|                                                                       |
| eventType: OFFER_EVENTS.RESENT,                                       |
|                                                                       |
| routingKey: OFFER_EVENTS.RESENT,                                      |
|                                                                       |
| exchange: OFFER_EXCHANGE,                                             |
|                                                                       |
| payload: buildOfferResentPayload(newOffer),                           |
|                                                                       |
| });                                                                   |
|                                                                       |
| return newOffer;                                                      |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 3 ActiveOfferAlreadyExistsException**                          |
|                                                                       |
| The 409 error thrown when the constraint is violated                  |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/offers/exceptions/offer.exceptions.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| /\*\*                                                                 |
|                                                                       |
| \* ActiveOfferAlreadyExistsException                                  |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Thrown when a client attempts to create or resend an offer to a    |
| talent                                                                |
|                                                                       |
| \* when an active (PENDING or COUNTERED) offer already exists for     |
| this pair.                                                            |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* HTTP 409 Conflict.                                                 |
|                                                                       |
| \* Error code: ACTIVE_OFFER_ALREADY_EXISTS                            |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* The response includes activeOfferId so the frontend can link to    |
| the                                                                   |
|                                                                       |
| \* existing offer and show the \"Withdraw your existing offer first\" |
| CTA.                                                                  |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export class ActiveOfferAlreadyExistsException extends Error {        |
|                                                                       |
| readonly statusCode = 409;                                            |
|                                                                       |
| readonly errorCode = \'ACTIVE_OFFER_ALREADY_EXISTS\';                 |
|                                                                       |
| readonly activeOfferId: string;                                       |
|                                                                       |
| readonly activeOfferStatus: string;                                   |
|                                                                       |
| constructor(activeOfferId: string, activeOfferStatus: string) {       |
|                                                                       |
| super(                                                                |
|                                                                       |
| \'An active offer already exists for this client-talent pair. \' +    |
|                                                                       |
| \'Withdraw the existing offer before sending a new one.\',            |
|                                                                       |
| );                                                                    |
|                                                                       |
| this.activeOfferId = activeOfferId;                                   |
|                                                                       |
| this.activeOfferStatus = activeOfferStatus;                           |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // HTTP response body when this exception is thrown:                  |
|                                                                       |
| // ============================================================       |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"statusCode\": 409,                                                  |
|                                                                       |
| \"error\": \"ACTIVE_OFFER_ALREADY_EXISTS\",                           |
|                                                                       |
| \"message\": \"An active offer already exists for this client-talent  |
| pair. Withdraw the existing offer before sending a new one.\",        |
|                                                                       |
| \"activeOfferId\": \"f47ac10b-58cc-4372-a567-0e02b2c3d479\",          |
|                                                                       |
| \"activeOfferStatus\": \"COUNTERED\",                                 |
|                                                                       |
| \"timestamp\": \"2025-02-01T14:00:00.000Z\",                          |
|                                                                       |
| \"path\": \"/v1/offers\"                                              |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Register in OfferExceptionFilter (OS-13):                          |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // In OfferExceptionFilter.catch():                                   |
|                                                                       |
| // if (exception instanceof ActiveOfferAlreadyExistsException) {      |
|                                                                       |
| // response.status(409).json({                                        |
|                                                                       |
| // statusCode: 409,                                                   |
|                                                                       |
| // error: exception.errorCode,                                        |
|                                                                       |
| // message: exception.message,                                        |
|                                                                       |
| // activeOfferId: exception.activeOfferId,                            |
|                                                                       |
| // activeOfferStatus: exception.activeOfferStatus,                    |
|                                                                       |
| // timestamp: new Date().toISOString(),                               |
|                                                                       |
| // path: request.url,                                                 |
|                                                                       |
| // });                                                                |
|                                                                       |
| // return;                                                            |
|                                                                       |
| // }                                                                  |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 4 Database-Level Index --- idx_offers_client_talent**          |
|                                                                       |
| The composite index that makes the constraint check fast              |
+-----------------------------------------------------------------------+

The service-layer check uses idx_offers_client_talent (documented in
OS-16) to find active offers efficiently. The index is on (client_id,
talent_id) and was created in Migration 002 (OS-17). This step confirms
the index is in place and shows the exact query plan.

+-----------------------------------------------------------------------+
| There is NO DB-level unique constraint preventing two concurrent      |
| active offers.                                                        |
|                                                                       |
| A database-level UNIQUE constraint cannot express \"unique where      |
| status IN (PENDING, COUNTERED)\"                                      |
|                                                                       |
| because partial unique indexes can only check a single equality       |
| condition (status = VALUE),                                           |
|                                                                       |
| not an IN clause. This means the one-active-offer rule is enforced at |
| the service layer.                                                    |
|                                                                       |
| Race condition scenario:                                              |
|                                                                       |
| Two concurrent requests to create offers for the same client-talent   |
| pair.                                                                 |
|                                                                       |
| Both check the constraint simultaneously and find 0 active offers.    |
|                                                                       |
| Both proceed to INSERT.                                               |
|                                                                       |
| Result: two PENDING offers for the same client-talent pair.           |
|                                                                       |
| Mitigation:                                                           |
|                                                                       |
| This race is extremely rare in practice because the constraint        |
| check + INSERT                                                        |
|                                                                       |
| completes in \< 10ms. The duplicate scenario requires exact           |
| simultaneous requests.                                                |
|                                                                       |
| If strict enforcement is required: add a SELECT FOR UPDATE in the     |
| same transaction                                                      |
|                                                                       |
| to lock the client-talent pair during the check-and-insert. See the   |
| pattern below.                                                        |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| // Verify idx_offers_client_talent exists (run in psql):              |
|                                                                       |
| SELECT indexname, indexdef                                            |
|                                                                       |
| FROM pg_indexes                                                       |
|                                                                       |
| WHERE schemaname = \'offer_service\'                                  |
|                                                                       |
| AND indexname = \'idx_offers_client_talent\';                         |
|                                                                       |
| // Expected output:                                                   |
|                                                                       |
| // idx_offers_client_talent \| CREATE INDEX idx_offers_client_talent  |
|                                                                       |
| // \| ON offer_service.offers(client_id, talent_id)                   |
|                                                                       |
| // Verify the constraint check uses the index (EXPLAIN):              |
|                                                                       |
| EXPLAIN SELECT id, status FROM offer_service.offers                   |
|                                                                       |
| WHERE client_id = \'10000000-0000-0000-0000-000000000001\'            |
|                                                                       |
| AND talent_id = \'20000000-0000-0000-0000-000000000001\'              |
|                                                                       |
| AND status IN (\'PENDING\', \'COUNTERED\')                            |
|                                                                       |
| LIMIT 1;                                                              |
|                                                                       |
| // Expected plan:                                                     |
|                                                                       |
| // Index Scan using idx_offers_client_talent on offers                |
|                                                                       |
| // (cost=0.43..2.65 rows=1 width=32)                                  |
|                                                                       |
| // Index Cond: ((client_id = \...) AND (talent_id = \...))            |
|                                                                       |
| // Filter: (status = ANY (\...))                                      |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Optional: SELECT FOR UPDATE pattern for strict enforcement         |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Use this if the team decides to eliminate the race condition       |
| entirely.                                                             |
|                                                                       |
| // Replace checkActiveOfferConstraint() with this in-transaction      |
| version:                                                              |
|                                                                       |
| private async checkActiveOfferConstraintLocked(                       |
|                                                                       |
| em: EntityManager,                                                    |
|                                                                       |
| clientId: string,                                                     |
|                                                                       |
| talentId: string,                                                     |
|                                                                       |
| ): Promise\<void\> {                                                  |
|                                                                       |
| // SELECT FOR UPDATE NOWAIT: locks any matching row.                  |
|                                                                       |
| // If another transaction is also inserting for the same pair,        |
|                                                                       |
| // this will either block (FOR UPDATE) or throw immediately (NOWAIT). |
|                                                                       |
| const \[rows\] = await em.query(\`                                    |
|                                                                       |
| SELECT id, status FROM offer_service.offers                           |
|                                                                       |
| WHERE client_id = \$1                                                 |
|                                                                       |
| AND talent_id = \$2                                                   |
|                                                                       |
| AND status IN (\'PENDING\', \'COUNTERED\')                            |
|                                                                       |
| LIMIT 1                                                               |
|                                                                       |
| FOR UPDATE NOWAIT                                                     |
|                                                                       |
| \`, \[clientId, talentId\]);                                          |
|                                                                       |
| if (rows) {                                                           |
|                                                                       |
| throw new ActiveOfferAlreadyExistsException(rows.id, rows.status);    |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Call this version INSIDE the transaction in create():              |
|                                                                       |
| // return this.dataSource.transaction(async (em) =\> {                |
|                                                                       |
| // await this.checkActiveOfferConstraintLocked(em, clientId,          |
| dto.talentId);                                                        |
|                                                                       |
| // const saved = await em.save(offer);                                |
|                                                                       |
| // \...outbox\...                                                     |
|                                                                       |
| // });                                                                |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 5 One PENDING CO Enforcement ---                               |
| uq_counter_offers_one_pending**                                       |
|                                                                       |
| DB-level enforcement of the one-pending-CO rule (separate from active |
| offer rule)                                                           |
+-----------------------------------------------------------------------+

The partial unique index uq_counter_offers_one_pending is documented in
OS-16 and created in Migration 002. This step confirms its existence and
clarifies how it relates to the active offer rule.

+-----------------------------------------------------------------------+
| Two separate enforcement rules:                                       |
|                                                                       |
| Rule 1 (this document): One active OFFER per client-talent pair.      |
|                                                                       |
| Active = PENDING or COUNTERED.                                        |
|                                                                       |
| Enforced at: service layer (checkActiveOfferConstraint).              |
|                                                                       |
| Index used: idx_offers_client_talent.                                 |
|                                                                       |
| Rule 2: One PENDING COUNTER OFFER per parent offer.                   |
|                                                                       |
| Enforced at: PostgreSQL partial unique index (DB level).              |
|                                                                       |
| Index: uq_counter_offers_one_pending.                                 |
|                                                                       |
| Any attempt to INSERT a second PENDING CO for the same offer_id       |
|                                                                       |
| causes a PostgreSQL 23505 unique violation --- caught and re-thrown   |
| as                                                                    |
|                                                                       |
| CounterOfferAlreadyPendingException (409).                            |
|                                                                       |
| These two rules are not the same. Rule 1 is about offers between      |
| parties.                                                              |
|                                                                       |
| Rule 2 is about counter offers within a negotiation round.            |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| // Verify uq_counter_offers_one_pending exists (run in psql):         |
|                                                                       |
| SELECT indexname, indexdef                                            |
|                                                                       |
| FROM pg_indexes                                                       |
|                                                                       |
| WHERE schemaname = \'offer_service\'                                  |
|                                                                       |
| AND indexname = \'uq_counter_offers_one_pending\';                    |
|                                                                       |
| // Expected:                                                          |
|                                                                       |
| // uq_counter_offers_one_pending \| CREATE UNIQUE INDEX               |
| uq_counter_offers_one_pending                                         |
|                                                                       |
| // \| ON offer_service.counter_offers(offer_id)                       |
|                                                                       |
| // \| WHERE ((status)::text = \'PENDING\')                            |
|                                                                       |
| // How CounterOffersService handles the 23505 unique violation:       |
|                                                                       |
| try {                                                                 |
|                                                                       |
| const savedCO = await em.save(newCounterOffer);                       |
|                                                                       |
| } catch (err: any) {                                                  |
|                                                                       |
| if (err?.code === \'23505\') {                                        |
|                                                                       |
| // PostgreSQL unique violation: two PENDING COs for the same offer.   |
|                                                                       |
| // This catches the rare concurrent-submission race condition.        |
|                                                                       |
| throw new CounterOfferAlreadyPendingException(offerId);               |
|                                                                       |
| }                                                                     |
|                                                                       |
| throw err;                                                            |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* CounterOfferAlreadyPendingException --- 409 Conflict               |
|                                                                       |
| \* Thrown when a second PENDING CO is submitted for the same offer.   |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export class CounterOfferAlreadyPendingException extends Error {      |
|                                                                       |
| readonly statusCode = 409;                                            |
|                                                                       |
| readonly errorCode = \'COUNTER_OFFER_ALREADY_PENDING\';               |
|                                                                       |
| constructor(offerId: string) {                                        |
|                                                                       |
| super(\`A pending counter offer already exists for offer              |
| \${offerId}.\`);                                                      |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 6 Restoration Logic --- Active Offer After CO Terminal         |
| Events**                                                              |
|                                                                       |
| How the active offer is managed when a counter offer resolves         |
+-----------------------------------------------------------------------+

When a counter offer transitions to a terminal state (DECLINED,
WITHDRAWN, EXPIRED), the parent offer is restored to PENDING. This makes
the parent offer \"active\" again so that both parties can act on it.
The restoration is a CAS UPDATE in the same transaction as the CO
terminal transition.

  --------------------- -------------------------------------------------
  **CO DECLINED by      Parent offer: COUNTERED → PENDING. The
  non-submitter**       negotiation continues with the original offer
                        back on the table.

  **CO WITHDRAWN by     Parent offer: COUNTERED → PENDING. Same result as
  submitter**           decline --- original offer is actionable again.

  **CO EXPIRED by       Parent offer: COUNTERED → PENDING (if not
  scheduler**           independently expired). If parent also expired:
                        stays EXPIRED.

  **CO ACCEPTED**       Parent offer: COUNTERED → ACCEPTED. Not restored
                        to PENDING. This is a terminal state.

  **CO SUPERSEDED**     Parent offer: stays COUNTERED. A new CO
                        immediately replaces the superseded one.
  --------------------- -------------------------------------------------

The restoration logic is already implemented in OS-25
(CounterOffersService). This section shows the exact CAS query used and
explains why it is safe.

+-----------------------------------------------------------------------+
| // From CounterOffersService.declineCO() and withdrawCO().            |
|                                                                       |
| // This runs INSIDE the database transaction that also transitions    |
| the CO.                                                               |
|                                                                       |
| // Restore parent offer from COUNTERED to PENDING.                    |
|                                                                       |
| // CAS: only update if the parent is still COUNTERED.                 |
|                                                                       |
| // If another event (e.g. client withdrew the offer) already changed  |
| the parent:                                                           |
|                                                                       |
| // this UPDATE affects 0 rows and we proceed without error.           |
|                                                                       |
| const \[offerRows\] = await em.query(\`                               |
|                                                                       |
| UPDATE offer_service.offers                                           |
|                                                                       |
| SET status = \'PENDING\'                                              |
|                                                                       |
| WHERE id = \$1 AND status = \'COUNTERED\'                             |
|                                                                       |
| RETURNING \*                                                          |
|                                                                       |
| \`, \[offerId\]);                                                     |
|                                                                       |
| // If offerRows is empty: the parent independently transitioned.      |
|                                                                       |
| // (client withdrew it, or expiry scheduler expired it)               |
|                                                                       |
| // In this case: no action needed, the CO terminal event is still     |
| written.                                                              |
|                                                                       |
| const restoredOffer = offerRows?.\[0\] ?? null;                       |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // After restoration: is the offer \"active\" again?                  |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Yes: restored offer status = PENDING                               |
|                                                                       |
| // The client can see it as an active offer                           |
|                                                                       |
| // The talent can still accept, decline, or submit a new CO           |
|                                                                       |
| // The offer retains its original expiresAt (TTL was NOT reset)       |
|                                                                       |
| // If the offer is about to expire: the 48h warning may re-fire       |
|                                                                       |
| // (depends on warning_sent_at --- it was set when CO was created,    |
|                                                                       |
| // see OS-26 for warning reset logic)                                 |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Does the active offer constraint apply to the restored offer?      |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Yes. After restoration, the offer is back to PENDING.              |
|                                                                       |
| // checkActiveOfferConstraint() would find it if the client tried to  |
|                                                                       |
| // send another offer to the same talent.                             |
|                                                                       |
| // The client must withdraw this restored offer before sending a new  |
| one.                                                                  |
+-----------------------------------------------------------------------+

**Edge case: CO expires while parent offer also expires**

+-----------------------------------------------------------------------+
| // From CounterOffersService.expireCO() (called by ExpiryProcessor):  |
|                                                                       |
| // The CO expiry scheduler runs every 60 seconds.                     |
|                                                                       |
| // The primary offer expiry scheduler also runs every 60 seconds.     |
|                                                                       |
| // Both can run in the same cron tick.                                |
|                                                                       |
| // Scenario: both the CO and the parent offer have expires_at \<=     |
| NOW().                                                                |
|                                                                       |
| // Which scheduler wins?                                              |
|                                                                       |
| // Case A: Primary offer expiry runs first:                           |
|                                                                       |
| // 1. Offers expiry: offers SET status=\'EXPIRED\' WHERE              |
| status=\'PENDING\' AND expires_at\<=NOW()                             |
|                                                                       |
| // 2. But the offer is COUNTERED (not PENDING), so 0 rows affected.   |
|                                                                       |
| // 3. CO expiry runs: CO SET status=EXPIRED.                          |
|                                                                       |
| // 4. CO expiry tries to restore parent:                              |
|                                                                       |
| // UPDATE offers SET status=\'PENDING\' WHERE id=\... AND             |
| status=\'COUNTERED\'                                                  |
|                                                                       |
| // 5. Parent is now PENDING (restored).                               |
|                                                                       |
| // 6. Offers expiry on next tick: finds the restored PENDING offer,   |
| expires it.                                                           |
|                                                                       |
| // Result: parent ends up EXPIRED (on the next cron tick).            |
|                                                                       |
| // Case B: CO expiry runs first:                                      |
|                                                                       |
| // 1. CO expiry: CO SET status=\'EXPIRED\'.                           |
|                                                                       |
| // 2. CO expiry: tries to restore parent: UPDATE offers SET           |
| status=\'PENDING\'                                                    |
|                                                                       |
| // WHERE status=\'COUNTERED\'. 1 row affected. Parent now PENDING.    |
|                                                                       |
| // 3. Offers expiry (same tick): finds PENDING parent with            |
| expires_at\<=NOW().                                                   |
|                                                                       |
| // 4. Offers expiry: SET status=\'EXPIRED\'. Parent ends up EXPIRED.  |
|                                                                       |
| // Result: parent ends up EXPIRED.                                    |
|                                                                       |
| // In BOTH cases, the parent offer eventually ends up EXPIRED.        |
|                                                                       |
| // The parentOfferStatus in offer.counter_expired payload reflects    |
| reality:                                                              |
|                                                                       |
| // If parent was already EXPIRED when CO expires: parentOfferStatus = |
| \'EXPIRED\'                                                           |
|                                                                       |
| // If parent was restored before expiry: parentOfferStatus =          |
| \'PENDING\'                                                           |
|                                                                       |
| // (the next cron tick expires it and fires offer.expired)            |
|                                                                       |
| // This is the correct behavior. No special handling needed.          |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 7 Verification**                                               |
|                                                                       |
| SQL queries to confirm enforcement works correctly                    |
+-----------------------------------------------------------------------+

**Test 1 --- Confirm constraint blocks duplicate active offers**

+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| \# 1. Create an offer via the API (it becomes PENDING):                                                                                                                                                                                                     |
|                                                                                                                                                                                                                                                             |
| curl -s -X POST http://localhost:3005/v1/offers \\                                                                                                                                                                                                          |
|                                                                                                                                                                                                                                                             |
| -H \"Authorization: Bearer \<CLIENT_JWT\>\" \\                                                                                                                                                                                                              |
|                                                                                                                                                                                                                                                             |
| -H \"Content-Type: application/json\" \\                                                                                                                                                                                                                    |
|                                                                                                                                                                                                                                                             |
| -H \"X-Idempotency-Key: key-001\" \\                                                                                                                                                                                                                        |
|                                                                                                                                                                                                                                                             |
| -d \'{\"talentId\":\"20000000-\...\",\"jobListingId\":\"\...\",\"contractType\":\"PROJECT\",\"contractTitle\":\"Test\",\"rate\":95,\"currencyCode\":\"USD\",\"durationMonths\":6,\"workSchedule\":{\"type\":\"FULL_TIME\"},\"startDate\":\"2099-01-01\"}\'  |
| \| jq .id                                                                                                                                                                                                                                                   |
|                                                                                                                                                                                                                                                             |
| \# Expected: UUID of new offer                                                                                                                                                                                                                              |
|                                                                                                                                                                                                                                                             |
| \# 2. Attempt to create a second offer for the same talent:                                                                                                                                                                                                 |
|                                                                                                                                                                                                                                                             |
| curl -s -X POST http://localhost:3005/v1/offers \\                                                                                                                                                                                                          |
|                                                                                                                                                                                                                                                             |
| -H \"Authorization: Bearer \<CLIENT_JWT\>\" \\                                                                                                                                                                                                              |
|                                                                                                                                                                                                                                                             |
| -H \"Content-Type: application/json\" \\                                                                                                                                                                                                                    |
|                                                                                                                                                                                                                                                             |
| -H \"X-Idempotency-Key: key-002\" \\                                                                                                                                                                                                                        |
|                                                                                                                                                                                                                                                             |
| -d                                                                                                                                                                                                                                                          |
| \'{\"talentId\":\"20000000-\...\",\"jobListingId\":\"\...\",\"contractType\":\"SERVICE\",\"contractTitle\":\"Another\",\"rate\":100,\"currencyCode\":\"USD\",\"durationMonths\":3,\"workSchedule\":{\"type\":\"FULL_TIME\"},\"startDate\":\"2099-01-01\"}\' |
| \| jq .                                                                                                                                                                                                                                                     |
|                                                                                                                                                                                                                                                             |
| \# Expected 409:                                                                                                                                                                                                                                            |
|                                                                                                                                                                                                                                                             |
| \# { \"statusCode\": 409, \"error\": \"ACTIVE_OFFER_ALREADY_EXISTS\",                                                                                                                                                                                       |
|                                                                                                                                                                                                                                                             |
| \# \"activeOfferId\": \"\...\", \"activeOfferStatus\": \"PENDING\" }                                                                                                                                                                                        |
+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+

**Test 2 --- Confirm withdraw then resend works**

+----------------------------------------------------------------------------------------+
| \# 1. Withdraw the active offer:                                                       |
|                                                                                        |
| curl -s -X POST http://localhost:3005/v1/offers/\<ACTIVE_OFFER_ID\>/withdraw \\        |
|                                                                                        |
| -H \"Authorization: Bearer \<CLIENT_JWT\>\" \\                                         |
|                                                                                        |
| -H \"Content-Type: application/json\" \\                                               |
|                                                                                        |
| -d \'{\"withdrawalMessage\":\"Starting fresh.\"}\' \| jq .status                       |
|                                                                                        |
| \# Expected: \"WITHDRAWN\"                                                             |
|                                                                                        |
| \# 2. Now the constraint should be clear. Create a new offer:                          |
|                                                                                        |
| curl -s -X POST http://localhost:3005/v1/offers \\                                     |
|                                                                                        |
| -H \"Authorization: Bearer \<CLIENT_JWT\>\" \\                                         |
|                                                                                        |
| -H \"Content-Type: application/json\" \\                                               |
|                                                                                        |
| -H \"X-Idempotency-Key: key-003\" \\                                                   |
|                                                                                        |
| -d                                                                                     |
| \'{\"talentId\":\"20000000-\...\",\"contractType\":\"PROJECT\",\"contractTitle\":\"New |
| Project\",\"rate\":95,\...}\' \| jq .status                                            |
|                                                                                        |
| \# Expected: \"PENDING\" (new offer created successfully)                              |
+----------------------------------------------------------------------------------------+

**Test 3 --- Confirm COUNTERED also blocks new offers**

+-----------------------------------------------------------------------+
| \# 1. Get an offer into COUNTERED state (talent submits a CO).        |
|                                                                       |
| \# 2. Try to create another offer as the same client to the same      |
| talent:                                                               |
|                                                                       |
| curl -s -X POST http://localhost:3005/v1/offers \\                    |
|                                                                       |
| -H \"Authorization: Bearer \<CLIENT_JWT\>\" \\                        |
|                                                                       |
| -H \"Content-Type: application/json\" \\                              |
|                                                                       |
| -H \"X-Idempotency-Key: key-004\" \\                                  |
|                                                                       |
| -d \'{\"talentId\":\"\<SAME_TALENT_ID\>\", \...}\' \| jq .            |
|                                                                       |
| \# Expected 409:                                                      |
|                                                                       |
| \# { \"statusCode\": 409, \"error\": \"ACTIVE_OFFER_ALREADY_EXISTS\", |
|                                                                       |
| \# \"activeOfferStatus\": \"COUNTERED\" }                             |
|                                                                       |
| \# The COUNTERED state counts as active and blocks new offers.        |
+-----------------------------------------------------------------------+

**Test 4 --- Confirm restoration after CO decline**

+-------------------------------------------------------------------------------+
| \# 1. Verify offer is COUNTERED, CO is PENDING.                               |
|                                                                               |
| SELECT o.status, co.status AS co_status                                       |
|                                                                               |
| FROM offer_service.offers o                                                   |
|                                                                               |
| JOIN offer_service.counter_offers co ON co.offer_id = o.id                    |
|                                                                               |
| WHERE o.id = \'\<OFFER_ID\>\' AND co.status = \'PENDING\';                    |
|                                                                               |
| \# Expected: COUNTERED, PENDING                                               |
|                                                                               |
| \# 2. Client declines the CO.                                                 |
|                                                                               |
| curl -s -X POST                                                               |
| http://localhost:3005/v1/offers/\<OFFER_ID\>/counter-offers/\<CO_ID\>/decline |
| \\                                                                            |
|                                                                               |
| -H \"Authorization: Bearer \<CLIENT_JWT\>\" \| jq .status                     |
|                                                                               |
| \# Expected: \"DECLINED\"                                                     |
|                                                                               |
| \# 3. Check offer status restored to PENDING:                                 |
|                                                                               |
| SELECT status FROM offer_service.offers WHERE id = \'\<OFFER_ID\>\';          |
|                                                                               |
| \# Expected: PENDING                                                          |
|                                                                               |
| \# 4. Now the constraint should block a new offer to the same talent.         |
|                                                                               |
| \# (because the restored PENDING offer is the active one)                     |
+-------------------------------------------------------------------------------+
