**OS-25**

**Offer Service --- State Machine Implementation**

**Pattern:** Atomic CAS (Compare-And-Swap) **Offers:** 6 states
**Counter offers:** 6 states

This document defines the complete code-level implementation of both
state machines. Every valid transition is listed with its guard
conditions. All state changes use atomic Compare-And-Swap DB operations
to prevent race conditions under concurrent load. The service layer
enforces state machine rules before any database write.

**File Map**

  ---------- ---------------------------------------------- ------------------------
  **Step**   **File Path**                                  **Purpose**

  **1**      src/offers/offer-state-machine.ts              Transition maps,
                                                            assertCanTransition(),
                                                            guard logic

  **2**      src/offers/offers.service.ts (CAS helper)      Atomic CAS update helper
                                                            used by every transition

  **3**      src/offers/offers.service.ts (transitions)     accept(), decline(),
                                                            withdraw(), expire()

  **4**      src/counter-offers/counter-offers.service.ts   createCO(), acceptCO(),
                                                            declineCO(),
                                                            withdrawCO(), expireCO()

  **5**      src/offers/guards/offer-action.guard.ts        OfferActionGuard ---
                                                            pre-controller
                                                            role+state check

  **6**      (reference)                                    Transition table,
                                                            restore-parent logic,
                                                            concurrency rules
  ---------- ---------------------------------------------- ------------------------

+-----------------------------------------------------------------------+
| **Overview State Transition Reference**                               |
|                                                                       |
| Every valid transition for both machines                              |
+-----------------------------------------------------------------------+

**Primary Offer State Machine**

  --------------- --------------- ----------- --------------------------- -------------------------------------------
  **From**        **To**          **Actor**   **Guard Conditions**        **Side Effects**

  **PENDING**     **ACCEPTED**    TALENT      offer.status = PENDING.     Write outbox offer.accepted.
                                              Requester = talent on       contracts-service triggered.
                                              offer.                      

  **PENDING**     **DECLINED**    TALENT      offer.status = PENDING.     Write outbox offer.declined. Reason stored
                                              Requester = talent. Decline on offer, NOT in payload.
                                              reason required (1--500     
                                              chars).                     

  **PENDING**     **WITHDRAWN**   CLIENT      offer.status = PENDING.     Write outbox offer.withdrawn. Withdrawal
                                              Requester = client.         message optional.

  **PENDING**     **EXPIRED**     SYSTEM      offer.status = PENDING.     Write outbox offer.expired. warning_sent_at
                                              expires_at \<= NOW().       check for deduplication.
                                              Scheduler only.             

  **PENDING**     **COUNTERED**   TALENT or   offer.status = PENDING. No  New CO row created. offer.status →
                                  CLIENT      other PENDING CO exists (DB COUNTERED. Write outbox offer.countered.
                                              partial unique index        
                                              enforces).                  

  **COUNTERED**   **PENDING**     TALENT or   CO is DECLINED, WITHDRAWN,  Offer status restored to PENDING. Write
                                  CLIENT      or EXPIRED. Offer may       outbox
                                              restore.                    offer.counter_declined/withdrawn/expired.

  **COUNTERED**   **ACCEPTED**    TALENT or   CO is ACCEPTED by the       Both CO and offer → ACCEPTED. Write outbox
                                  CLIENT      non-submitter.              offer.counter_accepted. contracts-service
                                                                          triggered.
  --------------- --------------- ----------- --------------------------- -------------------------------------------

+-----------------------------------------------------------------------+
| COUNTERED is the only non-terminal state that can return to PENDING.  |
|                                                                       |
| ACCEPTED, DECLINED, WITHDRAWN, EXPIRED are all terminal --- no        |
| further transitions.                                                  |
|                                                                       |
| The PENDING → COUNTERED transition is enforced at the DB level by the |
|                                                                       |
| partial unique index uq_counter_offers_one_pending (see OS-16).       |
|                                                                       |
| Even if service-layer validation is bypassed, the DB prevents two     |
| PENDING COs.                                                          |
+-----------------------------------------------------------------------+

**Counter Offer State Machine**

  ------------- ---------------- --------------- --------------------------- -----------------
  **From**      **To**           **Actor**       **Guard Conditions**        **Side Effects on
                                                                             Parent Offer**

  **PENDING**   **ACCEPTED**     NON-SUBMITTER   CO.status = PENDING.        Parent offer →
                                                 Requester is the party who  ACCEPTED. Both
                                                 did NOT submit the CO.      transitions in
                                                                             one transaction.

  **PENDING**   **DECLINED**     NON-SUBMITTER   CO.status = PENDING.        Parent offer
                                                 Requester is the            restored to
                                                 non-submitter.              PENDING (if not
                                                                             independently
                                                                             EXPIRED).

  **PENDING**   **WITHDRAWN**    SUBMITTER       CO.status = PENDING.        Parent offer
                                                 Requester is the party who  restored to
                                                 submitted the CO.           PENDING.

  **PENDING**   **EXPIRED**      SYSTEM          CO.status = PENDING.        Parent offer
                                                 CO.expires_at \<= NOW().    restored to
                                                 Scheduler only.             PENDING (unless
                                                                             parent also
                                                                             EXPIRED
                                                                             independently).

  **PENDING**   **SUPERSEDED**   SYSTEM          A new CO is submitted while Parent offer
                                                 this CO is PENDING. Handled stays COUNTERED.
                                                 atomically in createCO().   New CO is the
                                                                             active one.
  ------------- ---------------- --------------- --------------------------- -----------------

+-----------------------------------------------------------------------+
| **Step 1 offer-state-machine.ts**                                     |
|                                                                       |
| Transition maps and guard enforcement                                 |
+-----------------------------------------------------------------------+

The OfferStateMachine class is a pure logic module --- no database
access, no NestJS decorators. It holds the valid transition maps and
enforces them. Import it in OffersService and CounterOffersService
before any state change. If an invalid transition is attempted, it
throws before any DB write happens.

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/offers/offer-state-machine.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { ForbiddenException } from \'@nestjs/common\';                |
|                                                                       |
| import { OfferStatus } from \'./enums/offer-status.enum\';            |
|                                                                       |
| import { CounterOfferStatus } from                                    |
| \'../counter-offers/enums/counter-offer-status.enum\';                |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Valid transition maps                                              |
|                                                                       |
| // ============================================================       |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* OFFER_TRANSITIONS                                                  |
|                                                                       |
| \* Maps each source status to the set of valid target statuses.       |
|                                                                       |
| \* Terminal states (ACCEPTED, DECLINED, WITHDRAWN, EXPIRED) have no   |
| targets.                                                              |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Note: PENDING -\> COUNTERED is NOT in this map because the         |
| transition                                                            |
|                                                                       |
| \* is triggered implicitly by counter offer creation, not by a direct |
|                                                                       |
| \* offer action. It is handled in CounterOffersService.create().      |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export const OFFER_TRANSITIONS: Partial\<Record\<OfferStatus,         |
| OfferStatus\[\]\>\> = {                                               |
|                                                                       |
| \[OfferStatus.PENDING\]: \[                                           |
|                                                                       |
| OfferStatus.ACCEPTED,                                                 |
|                                                                       |
| OfferStatus.DECLINED,                                                 |
|                                                                       |
| OfferStatus.WITHDRAWN,                                                |
|                                                                       |
| OfferStatus.EXPIRED,                                                  |
|                                                                       |
| \],                                                                   |
|                                                                       |
| \[OfferStatus.COUNTERED\]: \[                                         |
|                                                                       |
| OfferStatus.PENDING, // Restored when CO is                           |
| declined/withdrawn/expired                                            |
|                                                                       |
| OfferStatus.ACCEPTED, // When CO is accepted (via                     |
| CounterOffersService)                                                 |
|                                                                       |
| \],                                                                   |
|                                                                       |
| // ACCEPTED, DECLINED, WITHDRAWN, EXPIRED: no entries = terminal (no  |
| transitions)                                                          |
|                                                                       |
| };                                                                    |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* COUNTER_OFFER_TRANSITIONS                                          |
|                                                                       |
| \* Maps each CO source status to valid target statuses.               |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export const COUNTER_OFFER_TRANSITIONS:                               |
| Partial\<Record\<CounterOfferStatus, CounterOfferStatus\[\]\>\> = {   |
|                                                                       |
| \[CounterOfferStatus.PENDING\]: \[                                    |
|                                                                       |
| CounterOfferStatus.ACCEPTED,                                          |
|                                                                       |
| CounterOfferStatus.DECLINED,                                          |
|                                                                       |
| CounterOfferStatus.WITHDRAWN,                                         |
|                                                                       |
| CounterOfferStatus.EXPIRED,                                           |
|                                                                       |
| CounterOfferStatus.SUPERSEDED,                                        |
|                                                                       |
| \],                                                                   |
|                                                                       |
| // ACCEPTED, DECLINED, WITHDRAWN, EXPIRED, SUPERSEDED: terminal       |
|                                                                       |
| };                                                                    |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // OfferStateMachine                                                  |
|                                                                       |
| // ============================================================       |
|                                                                       |
| export class OfferStateMachine {                                      |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* Assert that a primary offer transition is valid.                   |
|                                                                       |
| \* Throws ForbiddenException (403) if the transition is not allowed.  |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Call this BEFORE any DB write in a service method.                 |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* \@param from Current offer status (read from DB before calling)    |
|                                                                       |
| \* \@param to Target status                                           |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| static assertCanTransition(from: OfferStatus, to: OfferStatus): void  |
| {                                                                     |
|                                                                       |
| const allowed = OFFER_TRANSITIONS\[from\];                            |
|                                                                       |
| if (!allowed \|\| !allowed.includes(to)) {                            |
|                                                                       |
| throw new InvalidOfferTransitionException(\'offer\', from, to);       |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* Assert that a counter offer transition is valid.                   |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| static assertCanTransitionCO(                                         |
|                                                                       |
| from: CounterOfferStatus,                                             |
|                                                                       |
| to: CounterOfferStatus,                                               |
|                                                                       |
| ): void {                                                             |
|                                                                       |
| const allowed = COUNTER_OFFER_TRANSITIONS\[from\];                    |
|                                                                       |
| if (!allowed \|\| !allowed.includes(to)) {                            |
|                                                                       |
| throw new InvalidOfferTransitionException(\'counterOffer\', from,     |
| to);                                                                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Guard conditions                                                   |
|                                                                       |
| // ============================================================       |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* Assert the requester is the TALENT on this offer.                  |
|                                                                       |
| \* Used for: accept, decline, submit CO.                              |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| static assertIsTalent(offer: { talentId: string }, requesterId:       |
| string): void {                                                       |
|                                                                       |
| if (offer.talentId !== requesterId) {                                 |
|                                                                       |
| throw new ForbiddenException(\'Only the talent on this offer can      |
| perform this action.\');                                              |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* Assert the requester is the CLIENT on this offer.                  |
|                                                                       |
| \* Used for: withdraw, edit, resend.                                  |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| static assertIsClient(offer: { clientId: string }, requesterId:       |
| string): void {                                                       |
|                                                                       |
| if (offer.clientId !== requesterId) {                                 |
|                                                                       |
| throw new ForbiddenException(\'Only the client on this offer can      |
| perform this action.\');                                              |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* Assert the requester is either the client OR talent on this offer. |
|                                                                       |
| \* Used for: view, token generation.                                  |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| static assertIsParty(                                                 |
|                                                                       |
| offer: { clientId: string; talentId: string },                        |
|                                                                       |
| requesterId: string,                                                  |
|                                                                       |
| ): void {                                                             |
|                                                                       |
| if (offer.clientId !== requesterId && offer.talentId !== requesterId) |
| {                                                                     |
|                                                                       |
| throw new ForbiddenException(\'You are not a party to this offer.\'); |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* Assert the requester is the NON-SUBMITTER of a counter offer.      |
|                                                                       |
| \* Non-submitter is the party who can accept or decline a CO.         |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* If talent submitted the CO: client can accept/decline              |
|                                                                       |
| \* If client submitted the CO: talent can accept/decline              |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| static assertIsNonSubmitter(                                          |
|                                                                       |
| co: { submittedBy: string; submittedById: string },                   |
|                                                                       |
| offer: { clientId: string; talentId: string },                        |
|                                                                       |
| requesterId: string,                                                  |
|                                                                       |
| ): void {                                                             |
|                                                                       |
| const nonSubmitterId = co.submittedBy === \'TALENT\'                  |
|                                                                       |
| ? offer.clientId                                                      |
|                                                                       |
| : offer.talentId;                                                     |
|                                                                       |
| if (nonSubmitterId !== requesterId) {                                 |
|                                                                       |
| throw new ForbiddenException(                                         |
|                                                                       |
| \'Only the party who received this counter offer can accept or        |
| decline it.\',                                                        |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* Assert the requester is the SUBMITTER of a counter offer.          |
|                                                                       |
| \* Submitter is the party who can withdraw or edit their own CO.      |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| static assertIsSubmitter(                                             |
|                                                                       |
| co: { submittedById: string },                                        |
|                                                                       |
| requesterId: string,                                                  |
|                                                                       |
| ): void {                                                             |
|                                                                       |
| if (co.submittedById !== requesterId) {                               |
|                                                                       |
| throw new ForbiddenException(                                         |
|                                                                       |
| \'Only the party who submitted this counter offer can withdraw or     |
| edit it.\',                                                           |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* Assert no active (PENDING) counter offer blocks this offer action. |
|                                                                       |
| \* When an offer is COUNTERED, the talent cannot accept or decline    |
| the                                                                   |
|                                                                       |
| \* original offer --- they must act on the counter offer first.       |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* The client can still withdraw the offer even when COUNTERED.       |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| static assertNotBlockedByCO(                                          |
|                                                                       |
| offer: { status: OfferStatus },                                       |
|                                                                       |
| action: \'accept\' \| \'decline\',                                    |
|                                                                       |
| ): void {                                                             |
|                                                                       |
| if (offer.status === OfferStatus.COUNTERED) {                         |
|                                                                       |
| throw new ForbiddenException(                                         |
|                                                                       |
| \`Cannot \${action} an offer with an active counter offer. \` +       |
|                                                                       |
| \'Withdraw the counter offer first.\',                                |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* Compute the rate warning flag for a counter offer.                 |
|                                                                       |
| \* Talent CO: warn if coRate \> parentRate \* 1.25 (25% above)        |
|                                                                       |
| \* Client CO: warn if coRate \< parentRate \* 0.80 (20% below)        |
|                                                                       |
| \* Threshold is STRICTLY greater/less than (not \>=).                 |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| static computeRateWarning(                                            |
|                                                                       |
| parentRate: number,                                                   |
|                                                                       |
| coRate: number,                                                       |
|                                                                       |
| submittedBy: \'CLIENT\' \| \'TALENT\',                                |
|                                                                       |
| ): boolean {                                                          |
|                                                                       |
| if (submittedBy === \'TALENT\') {                                     |
|                                                                       |
| return coRate \> parentRate \* 1.25;                                  |
|                                                                       |
| } else {                                                              |
|                                                                       |
| return coRate \< parentRate \* 0.80;                                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Custom exception for invalid transitions                           |
|                                                                       |
| // ============================================================       |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* Thrown when a service method attempts an invalid state transition. |
|                                                                       |
| \* HTTP 409 Conflict.                                                 |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export class InvalidOfferTransitionException extends Error {          |
|                                                                       |
| readonly statusCode = 409;                                            |
|                                                                       |
| readonly errorCode: string;                                           |
|                                                                       |
| constructor(                                                          |
|                                                                       |
| type: \'offer\' \| \'counterOffer\',                                  |
|                                                                       |
| from: string,                                                         |
|                                                                       |
| to: string,                                                           |
|                                                                       |
| ) {                                                                   |
|                                                                       |
| const msg = \`Cannot transition \${type} from \${from} to \${to}\`;   |
|                                                                       |
| super(msg);                                                           |
|                                                                       |
| this.name = \'InvalidOfferTransitionException\';                      |
|                                                                       |
| this.errorCode = type === \'offer\'                                   |
|                                                                       |
| ? \'OFFER_INVALID_TRANSITION\'                                        |
|                                                                       |
| : \'COUNTER_OFFER_INVALID_TRANSITION\';                               |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 2 Atomic CAS Helper --- OffersService**                        |
|                                                                       |
| Race-condition safe state transitions using UPDATE \... WHERE status  |
| = expected                                                            |
+-----------------------------------------------------------------------+

The CAS (Compare-And-Swap) pattern is the core safety mechanism for
concurrent state transitions. Every state change uses an UPDATE query
with a WHERE clause that checks the current status. If another request
changed the status between our read and our write, 0 rows are affected
and we throw 409 Conflict immediately.

+-----------------------------------------------------------------------+
| Never use a two-step read-then-update pattern for state transitions.  |
|                                                                       |
| Read (SELECT) followed by update (UPDATE) has a TOCTOU race           |
| condition:                                                            |
|                                                                       |
| Two concurrent requests both read status=PENDING.                     |
|                                                                       |
| Both pass the service-layer status check.                             |
|                                                                       |
| Both attempt the UPDATE. Both succeed. Double-transition.             |
|                                                                       |
| CAS prevents this: the UPDATE itself checks the expected status.      |
|                                                                       |
| Only one concurrent request can win the CAS. The other gets 0 rows    |
| affected.                                                             |
|                                                                       |
| Always check result.affected === 0 and throw                          |
| OfferConcurrentModificationException.                                 |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/offers/offers.service.ts --- CAS
  helper**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { Injectable, Logger, NotFoundException } from                 |
| \'@nestjs/common\';                                                   |
|                                                                       |
| import { InjectRepository } from \'@nestjs/typeorm\';                 |
|                                                                       |
| import { Repository, EntityManager, DataSource } from \'typeorm\';    |
|                                                                       |
| import { Offer } from \'./entities/offer.entity\';                    |
|                                                                       |
| import { OfferStatus } from \'./enums/offer-status.enum\';            |
|                                                                       |
| import { OfferStateMachine } from \'./offer-state-machine\';          |
|                                                                       |
| import { OutboxService } from \'../outbox/outbox.service\';           |
|                                                                       |
| import { AblyService } from \'../realtime/ably.service\';             |
|                                                                       |
| import { AlertService } from \'../common/alert/alert.service\';       |
|                                                                       |
| /\*\* Thrown when CAS finds 0 rows affected (concurrent               |
| modification). \*/                                                    |
|                                                                       |
| export class OfferConcurrentModificationException extends Error {     |
|                                                                       |
| readonly statusCode = 409;                                            |
|                                                                       |
| readonly errorCode = \'OFFER_CONCURRENT_MODIFICATION\';               |
|                                                                       |
| constructor(offerId: string) {                                        |
|                                                                       |
| super(\`Offer \${offerId} was modified by a concurrent request.       |
| Reload and retry.\`);                                                 |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| \@Injectable()                                                        |
|                                                                       |
| export class OffersService {                                          |
|                                                                       |
| private readonly logger = new Logger(OffersService.name);             |
|                                                                       |
| constructor(                                                          |
|                                                                       |
| \@InjectRepository(Offer)                                             |
|                                                                       |
| private readonly offerRepo: Repository\<Offer\>,                      |
|                                                                       |
| private readonly dataSource: DataSource,                              |
|                                                                       |
| private readonly outboxService: OutboxService,                        |
|                                                                       |
| private readonly ablyService: AblyService,                            |
|                                                                       |
| ) {}                                                                  |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // findByIdOrThrow --- used before every CAS operation                |
|                                                                       |
| // ============================================================       |
|                                                                       |
| async findByIdOrThrow(id: string): Promise\<Offer\> {                 |
|                                                                       |
| const offer = await this.offerRepo.findOne({ where: { id } });        |
|                                                                       |
| if (!offer) throw new NotFoundException(\`Offer \${id} not found\`);  |
|                                                                       |
| return offer;                                                         |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // CAS helper --- the atomic state transition primitive               |
|                                                                       |
| // ============================================================       |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* performCAS --- Atomic Compare-And-Swap state transition.           |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Executes: UPDATE offers SET status=\$newStatus, \<fields\> WHERE   |
| id=\$id AND status=\$expectedStatus                                   |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* If 0 rows affected: another request changed the status first.      |
| Throw 409.                                                            |
|                                                                       |
| \* If 1 row affected: transition succeeded. Returns the updated       |
| offer.                                                                |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* \@param em EntityManager from a transaction                        |
|                                                                       |
| \* \@param offerId The offer to transition                            |
|                                                                       |
| \* \@param expectedStatus The status the offer MUST have for this     |
| transition to proceed                                                 |
|                                                                       |
| \* \@param newStatus The target status                                |
|                                                                       |
| \* \@param extraFields Additional columns to SET in the same UPDATE   |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| async performCAS(                                                     |
|                                                                       |
| em: EntityManager,                                                    |
|                                                                       |
| offerId: string,                                                      |
|                                                                       |
| expectedStatus: OfferStatus,                                          |
|                                                                       |
| newStatus: OfferStatus,                                               |
|                                                                       |
| extraFields: Record\<string, unknown\> = {},                          |
|                                                                       |
| ): Promise\<Offer\> {                                                 |
|                                                                       |
| const setParts: string\[\] = \[\`status = \$3\`\];                    |
|                                                                       |
| const values: unknown\[\] = \[offerId, expectedStatus, newStatus\];   |
|                                                                       |
| let paramIdx = 4;                                                     |
|                                                                       |
| // Build dynamic SET clause for extra fields (accepted_at,            |
| declined_at, etc.)                                                    |
|                                                                       |
| for (const \[col, val\] of Object.entries(extraFields)) {             |
|                                                                       |
| setParts.push(\`\${col} = \$\${paramIdx}\`);                          |
|                                                                       |
| values.push(val);                                                     |
|                                                                       |
| paramIdx++;                                                           |
|                                                                       |
| }                                                                     |
|                                                                       |
| const sql = \`                                                        |
|                                                                       |
| UPDATE offer_service.offers                                           |
|                                                                       |
| SET \${setParts.join(\', \')}                                         |
|                                                                       |
| WHERE id = \$1 AND status = \$2                                       |
|                                                                       |
| RETURNING \*                                                          |
|                                                                       |
| \`;                                                                   |
|                                                                       |
| const \[rows, count\] = await em.query(sql, values);                  |
|                                                                       |
| if (count === 0) {                                                    |
|                                                                       |
| throw new OfferConcurrentModificationException(offerId);              |
|                                                                       |
| }                                                                     |
|                                                                       |
| return rows\[0\] as Offer;                                            |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 3 Offer Service Transitions --- accept / decline / withdraw /  |
| expire**                                                              |
|                                                                       |
| Each transition in full with guards, CAS, outbox write, and Ably      |
| publish                                                               |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/offers/offers.service.ts --- state
  transition methods**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| // ============================================================       |
|                                                                       |
| // accept() --- PENDING -\> ACCEPTED (TALENT only)                    |
|                                                                       |
| // ============================================================       |
|                                                                       |
| async accept(offerId: string, requesterId: string): Promise\<Offer\>  |
| {                                                                     |
|                                                                       |
| // Step 1: Load offer. Guard: must exist.                             |
|                                                                       |
| const offer = await this.findByIdOrThrow(offerId);                    |
|                                                                       |
| // Step 2: Guard --- requester must be the TALENT.                    |
|                                                                       |
| OfferStateMachine.assertIsTalent(offer, requesterId);                 |
|                                                                       |
| // Step 3: Guard --- offer must not be COUNTERED (CO must be resolved |
| first).                                                               |
|                                                                       |
| OfferStateMachine.assertNotBlockedByCO(offer, \'accept\');            |
|                                                                       |
| // Step 4: Validate transition before touching the DB.                |
|                                                                       |
| OfferStateMachine.assertCanTransition(offer.status,                   |
| OfferStatus.ACCEPTED);                                                |
|                                                                       |
| // Step 5: Atomic CAS + outbox in ONE transaction.                    |
|                                                                       |
| const updatedOffer = await this.dataSource.transaction(async (em) =\> |
| {                                                                     |
|                                                                       |
| const accepted = await this.performCAS(                               |
|                                                                       |
| em, offerId, OfferStatus.PENDING, OfferStatus.ACCEPTED,               |
|                                                                       |
| { accepted_at: \'NOW()\' },                                           |
|                                                                       |
| );                                                                    |
|                                                                       |
| await this.outboxService.create(em, {                                 |
|                                                                       |
| aggregateId: offerId,                                                 |
|                                                                       |
| eventType: OFFER_EVENTS.ACCEPTED,                                     |
|                                                                       |
| routingKey: OFFER_EVENTS.ACCEPTED,                                    |
|                                                                       |
| exchange: OFFER_EXCHANGE,                                             |
|                                                                       |
| payload: buildOfferAcceptedPayload(accepted),                         |
|                                                                       |
| });                                                                   |
|                                                                       |
| return accepted;                                                      |
|                                                                       |
| });                                                                   |
|                                                                       |
| // Step 6: Ably real-time push (fire-and-forget, outside              |
| transaction).                                                         |
|                                                                       |
| this.ablyService.publish(offerId, updatedOffer, null, false);         |
|                                                                       |
| return updatedOffer;                                                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // decline() --- PENDING -\> DECLINED (TALENT only)                   |
|                                                                       |
| // ============================================================       |
|                                                                       |
| async decline(                                                        |
|                                                                       |
| offerId: string,                                                      |
|                                                                       |
| requesterId: string,                                                  |
|                                                                       |
| reason: string,                                                       |
|                                                                       |
| chip?: string,                                                        |
|                                                                       |
| ): Promise\<Offer\> {                                                 |
|                                                                       |
| const offer = await this.findByIdOrThrow(offerId);                    |
|                                                                       |
| OfferStateMachine.assertIsTalent(offer, requesterId);                 |
|                                                                       |
| OfferStateMachine.assertNotBlockedByCO(offer, \'decline\');           |
|                                                                       |
| OfferStateMachine.assertCanTransition(offer.status,                   |
| OfferStatus.DECLINED);                                                |
|                                                                       |
| const updatedOffer = await this.dataSource.transaction(async (em) =\> |
| {                                                                     |
|                                                                       |
| const declined = await this.performCAS(                               |
|                                                                       |
| em, offerId, OfferStatus.PENDING, OfferStatus.DECLINED,               |
|                                                                       |
| {                                                                     |
|                                                                       |
| declined_at: \'NOW()\',                                               |
|                                                                       |
| declined_reason: reason,                                              |
|                                                                       |
| declined_chip: chip ?? null,                                          |
|                                                                       |
| },                                                                    |
|                                                                       |
| );                                                                    |
|                                                                       |
| await this.outboxService.create(em, {                                 |
|                                                                       |
| aggregateId: offerId,                                                 |
|                                                                       |
| eventType: OFFER_EVENTS.DECLINED,                                     |
|                                                                       |
| routingKey: OFFER_EVENTS.DECLINED,                                    |
|                                                                       |
| exchange: OFFER_EXCHANGE,                                             |
|                                                                       |
| // IMPORTANT: declineReason is NOT in the payload (OS-20)             |
|                                                                       |
| payload: buildOfferDeclinedPayload(declined),                         |
|                                                                       |
| });                                                                   |
|                                                                       |
| return declined;                                                      |
|                                                                       |
| });                                                                   |
|                                                                       |
| this.ablyService.publish(offerId, updatedOffer, null, false);         |
|                                                                       |
| return updatedOffer;                                                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // withdraw() --- PENDING -\> WITHDRAWN (CLIENT only)                 |
|                                                                       |
| // Client can withdraw even when offer is COUNTERED.                  |
|                                                                       |
| // ============================================================       |
|                                                                       |
| async withdraw(                                                       |
|                                                                       |
| offerId: string,                                                      |
|                                                                       |
| requesterId: string,                                                  |
|                                                                       |
| withdrawalMessage: string \| null,                                    |
|                                                                       |
| ): Promise\<Offer\> {                                                 |
|                                                                       |
| const offer = await this.findByIdOrThrow(offerId);                    |
|                                                                       |
| OfferStateMachine.assertIsClient(offer, requesterId);                 |
|                                                                       |
| // Withdrawal is allowed from PENDING or COUNTERED.                   |
|                                                                       |
| // The CAS uses the ACTUAL current status as the expectedStatus.      |
|                                                                       |
| if (offer.status !== OfferStatus.PENDING && offer.status !==          |
| OfferStatus.COUNTERED) {                                              |
|                                                                       |
| OfferStateMachine.assertCanTransition(offer.status,                   |
| OfferStatus.WITHDRAWN);                                               |
|                                                                       |
| }                                                                     |
|                                                                       |
| const updatedOffer = await this.dataSource.transaction(async (em) =\> |
| {                                                                     |
|                                                                       |
| // CAS: accept PENDING or COUNTERED as the expected status.           |
|                                                                       |
| // We use a raw UPDATE to handle both.                                |
|                                                                       |
| const \[rows, count\] = await em.query(\`                             |
|                                                                       |
| UPDATE offer_service.offers                                           |
|                                                                       |
| SET status = \'WITHDRAWN\', withdrawn_at = NOW(), withdrawal_message  |
| = \$2                                                                 |
|                                                                       |
| WHERE id = \$1 AND status IN (\'PENDING\', \'COUNTERED\')             |
|                                                                       |
| RETURNING \*                                                          |
|                                                                       |
| \`, \[offerId, withdrawalMessage\]);                                  |
|                                                                       |
| if (count === 0) throw new                                            |
| OfferConcurrentModificationException(offerId);                        |
|                                                                       |
| const withdrawn = rows\[0\] as Offer;                                 |
|                                                                       |
| await this.outboxService.create(em, {                                 |
|                                                                       |
| aggregateId: offerId,                                                 |
|                                                                       |
| eventType: OFFER_EVENTS.WITHDRAWN,                                    |
|                                                                       |
| routingKey: OFFER_EVENTS.WITHDRAWN,                                   |
|                                                                       |
| exchange: OFFER_EXCHANGE,                                             |
|                                                                       |
| payload: buildOfferWithdrawnPayload(withdrawn),                       |
|                                                                       |
| });                                                                   |
|                                                                       |
| return withdrawn;                                                     |
|                                                                       |
| });                                                                   |
|                                                                       |
| this.ablyService.publish(offerId, updatedOffer, null, false);         |
|                                                                       |
| return updatedOffer;                                                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // expire() --- PENDING -\> EXPIRED (SYSTEM / scheduler only)         |
|                                                                       |
| // Called by ExpiryProcessor. Never callable via API.                 |
|                                                                       |
| // ============================================================       |
|                                                                       |
| async expire(offerId: string, em: EntityManager): Promise\<Offer\> {  |
|                                                                       |
| // No requester guard: called by scheduler, not a user.               |
|                                                                       |
| const \[rows, count\] = await em.query(\`                             |
|                                                                       |
| UPDATE offer_service.offers                                           |
|                                                                       |
| SET status = \'EXPIRED\', expired_at = NOW()                          |
|                                                                       |
| WHERE id = \$1 AND status = \'PENDING\'                               |
|                                                                       |
| RETURNING \*                                                          |
|                                                                       |
| \`, \[offerId\]);                                                     |
|                                                                       |
| if (count === 0) {                                                    |
|                                                                       |
| // Offer was already acted on (accepted/declined/withdrawn) before    |
| expiry ran.                                                           |
|                                                                       |
| // This is a benign race. Log and skip.                               |
|                                                                       |
| this.logger.debug(\`Offer \${offerId} already transitioned before     |
| expiry ran.\`);                                                       |
|                                                                       |
| return null;                                                          |
|                                                                       |
| }                                                                     |
|                                                                       |
| const expired = rows\[0\] as Offer;                                   |
|                                                                       |
| await this.outboxService.create(em, {                                 |
|                                                                       |
| aggregateId: offerId,                                                 |
|                                                                       |
| eventType: OFFER_EVENTS.EXPIRED,                                      |
|                                                                       |
| routingKey: OFFER_EVENTS.EXPIRED,                                     |
|                                                                       |
| exchange: OFFER_EXCHANGE,                                             |
|                                                                       |
| payload: buildOfferExpiredPayload(expired),                           |
|                                                                       |
| });                                                                   |
|                                                                       |
| // Ably publish is called by ExpiryProcessor after the transaction    |
| commits.                                                              |
|                                                                       |
| return expired;                                                       |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 4 Counter Offer Service Transitions**                          |
|                                                                       |
| create, accept, decline, withdraw, expire --- with parent offer       |
| restore logic                                                         |
+-----------------------------------------------------------------------+

Counter offer transitions are more complex than primary offer
transitions because most of them have a side effect: restoring the
parent offer to PENDING. Both the CO transition and the parent offer
update must happen in the same database transaction.

+-----------------------------------------------------------------------+
| Restore-parent logic:                                                 |
|                                                                       |
| When CO is DECLINED (by non-submitter): parent offer → PENDING        |
|                                                                       |
| When CO is WITHDRAWN (by submitter): parent offer → PENDING           |
|                                                                       |
| When CO is EXPIRED (by scheduler): parent offer → PENDING (unless     |
| parent also EXPIRED)                                                  |
|                                                                       |
| When CO is SUPERSEDED (new CO submitted): parent offer stays          |
| COUNTERED                                                             |
|                                                                       |
| When CO is ACCEPTED: parent offer → ACCEPTED (not PENDING)            |
|                                                                       |
| The CAS for parent restoration uses:                                  |
|                                                                       |
| UPDATE offers SET status=\'PENDING\' WHERE id=\$1 AND                 |
| status=\'COUNTERED\'                                                  |
|                                                                       |
| If 0 rows: the parent independently transitioned. No action needed.   |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE:
  apps/offer-service/src/counter-offers/counter-offers.service.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { Injectable, Logger, NotFoundException } from                 |
| \'@nestjs/common\';                                                   |
|                                                                       |
| import { InjectRepository } from \'@nestjs/typeorm\';                 |
|                                                                       |
| import { Repository, EntityManager, DataSource } from \'typeorm\';    |
|                                                                       |
| import { CounterOffer } from \'./entities/counter-offer.entity\';     |
|                                                                       |
| import { CounterOfferStatus } from                                    |
| \'./enums/counter-offer-status.enum\';                                |
|                                                                       |
| import { OfferStatus } from \'../offers/enums/offer-status.enum\';    |
|                                                                       |
| import { OfferStateMachine } from \'../offers/offer-state-machine\';  |
|                                                                       |
| import { OutboxService } from \'../outbox/outbox.service\';           |
|                                                                       |
| import { AblyService } from \'../realtime/ably.service\';             |
|                                                                       |
| import { OffersService, OfferConcurrentModificationException } from   |
| \'../offers/offers.service\';                                         |
|                                                                       |
| \@Injectable()                                                        |
|                                                                       |
| export class CounterOffersService {                                   |
|                                                                       |
| private readonly logger = new Logger(CounterOffersService.name);      |
|                                                                       |
| constructor(                                                          |
|                                                                       |
| \@InjectRepository(CounterOffer)                                      |
|                                                                       |
| private readonly coRepo: Repository\<CounterOffer\>,                  |
|                                                                       |
| private readonly dataSource: DataSource,                              |
|                                                                       |
| private readonly offersService: OffersService,                        |
|                                                                       |
| private readonly outboxService: OutboxService,                        |
|                                                                       |
| private readonly ablyService: AblyService,                            |
|                                                                       |
| ) {}                                                                  |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // create() --- Talent or Client submits counter offer                |
|                                                                       |
| // PENDING -\> COUNTERED (offer), PENDING (new CO)                    |
|                                                                       |
| // If an existing PENDING CO exists -\> SUPERSEDED first              |
|                                                                       |
| // ============================================================       |
|                                                                       |
| async create(                                                         |
|                                                                       |
| offerId: string,                                                      |
|                                                                       |
| requesterId: string,                                                  |
|                                                                       |
| role: \'CLIENT\' \| \'TALENT\',                                       |
|                                                                       |
| dto: CreateCounterOfferDto,                                           |
|                                                                       |
| ): Promise\<CounterOffer\> {                                          |
|                                                                       |
| const offer = await this.offersService.findByIdOrThrow(offerId);      |
|                                                                       |
| // Guard: requester must be a party to the offer.                     |
|                                                                       |
| OfferStateMachine.assertIsParty(offer, requesterId);                  |
|                                                                       |
| // Guard: offer must be PENDING or COUNTERED to accept a new CO.      |
|                                                                       |
| if (offer.status !== OfferStatus.PENDING && offer.status !==          |
| OfferStatus.COUNTERED) {                                              |
|                                                                       |
| throw new InvalidOfferTransitionException(\'offer\', offer.status,    |
| \'COUNTERED\');                                                       |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Compute rate warning BEFORE the transaction (pure computation, no  |
| I/O).                                                                 |
|                                                                       |
| const rateWarning = OfferStateMachine.computeRateWarning(             |
|                                                                       |
| offer.rate, dto.rate, role,                                           |
|                                                                       |
| );                                                                    |
|                                                                       |
| const { newCO, updatedOffer } = await                                 |
| this.dataSource.transaction(async (em) =\> {                          |
|                                                                       |
| // Step A: Supersede any existing PENDING CO.                         |
|                                                                       |
| // The partial unique index (uq_counter_offers_one_pending) prevents  |
| two                                                                   |
|                                                                       |
| // PENDING COs at the DB level, but we also supersede explicitly so   |
| the                                                                   |
|                                                                       |
| // old CO has the correct terminal status in history.                 |
|                                                                       |
| await em.query(\`                                                     |
|                                                                       |
| UPDATE offer_service.counter_offers                                   |
|                                                                       |
| SET status = \'SUPERSEDED\', superseded_at = NOW()                    |
|                                                                       |
| WHERE offer_id = \$1 AND status = \'PENDING\'                         |
|                                                                       |
| \`, \[offerId\]);                                                     |
|                                                                       |
| // Step B: Create the new counter offer.                              |
|                                                                       |
| const expiresAt = new Date();                                         |
|                                                                       |
| expiresAt.setDate(expiresAt.getDate() + 14); // 14-day TTL            |
|                                                                       |
| const co = em.create(CounterOffer, {                                  |
|                                                                       |
| offerId,                                                              |
|                                                                       |
| submittedBy: role,                                                    |
|                                                                       |
| submittedById: requesterId,                                           |
|                                                                       |
| status: CounterOfferStatus.PENDING,                                   |
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
| expiresAt,                                                            |
|                                                                       |
| });                                                                   |
|                                                                       |
| const savedCO = await em.save(co);                                    |
|                                                                       |
| // Step C: Set offer status to COUNTERED (CAS: must still be PENDING  |
| or COUNTERED).                                                        |
|                                                                       |
| const \[rows, count\] = await em.query(\`                             |
|                                                                       |
| UPDATE offer_service.offers                                           |
|                                                                       |
| SET status = \'COUNTERED\'                                            |
|                                                                       |
| WHERE id = \$1 AND status IN (\'PENDING\', \'COUNTERED\')             |
|                                                                       |
| RETURNING \*                                                          |
|                                                                       |
| \`, \[offerId\]);                                                     |
|                                                                       |
| if (count === 0) throw new                                            |
| OfferConcurrentModificationException(offerId);                        |
|                                                                       |
| const updatedOffer = rows\[0\];                                       |
|                                                                       |
| // Step D: Write outbox event.                                        |
|                                                                       |
| await this.outboxService.create(em, {                                 |
|                                                                       |
| aggregateId: offerId,                                                 |
|                                                                       |
| eventType: OFFER_EVENTS.COUNTERED,                                    |
|                                                                       |
| routingKey: OFFER_EVENTS.COUNTERED,                                   |
|                                                                       |
| exchange: OFFER_EXCHANGE,                                             |
|                                                                       |
| payload: buildOfferCounteredPayload(updatedOffer, savedCO,            |
| rateWarning),                                                         |
|                                                                       |
| });                                                                   |
|                                                                       |
| return { newCO: savedCO, updatedOffer };                              |
|                                                                       |
| });                                                                   |
|                                                                       |
| // Step E: Ably publish (outside transaction).                        |
|                                                                       |
| this.ablyService.publish(offerId, updatedOffer, newCO, rateWarning);  |
|                                                                       |
| return newCO;                                                         |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // acceptCO() --- NON-SUBMITTER accepts CO                            |
|                                                                       |
| // CO: PENDING -\> ACCEPTED                                           |
|                                                                       |
| // Offer: COUNTERED -\> ACCEPTED (both in one transaction)            |
|                                                                       |
| // ============================================================       |
|                                                                       |
| async acceptCO(                                                       |
|                                                                       |
| offerId: string,                                                      |
|                                                                       |
| coId: string,                                                         |
|                                                                       |
| requesterId: string,                                                  |
|                                                                       |
| ): Promise\<CounterOffer\> {                                          |
|                                                                       |
| const offer = await this.offersService.findByIdOrThrow(offerId);      |
|                                                                       |
| const co = await this.findCOByIdOrThrow(coId, offerId);               |
|                                                                       |
| OfferStateMachine.assertIsNonSubmitter(co, offer, requesterId);       |
|                                                                       |
| OfferStateMachine.assertCanTransitionCO(co.status,                    |
| CounterOfferStatus.ACCEPTED);                                         |
|                                                                       |
| const { acceptedCO, acceptedOffer } = await                           |
| this.dataSource.transaction(async (em) =\> {                          |
|                                                                       |
| // CAS on counter offer.                                              |
|                                                                       |
| const \[coRows, coCount\] = await em.query(\`                         |
|                                                                       |
| UPDATE offer_service.counter_offers                                   |
|                                                                       |
| SET status = \'ACCEPTED\', accepted_at = NOW()                        |
|                                                                       |
| WHERE id = \$1 AND status = \'PENDING\'                               |
|                                                                       |
| RETURNING \*                                                          |
|                                                                       |
| \`, \[coId\]);                                                        |
|                                                                       |
| if (coCount === 0) throw new                                          |
| OfferConcurrentModificationException(coId);                           |
|                                                                       |
| // CAS on parent offer: COUNTERED -\> ACCEPTED.                       |
|                                                                       |
| const \[offerRows, offerCount\] = await em.query(\`                   |
|                                                                       |
| UPDATE offer_service.offers                                           |
|                                                                       |
| SET status = \'ACCEPTED\', accepted_at = NOW()                        |
|                                                                       |
| WHERE id = \$1 AND status = \'COUNTERED\'                             |
|                                                                       |
| RETURNING \*                                                          |
|                                                                       |
| \`, \[offerId\]);                                                     |
|                                                                       |
| if (offerCount === 0) throw new                                       |
| OfferConcurrentModificationException(offerId);                        |
|                                                                       |
| const acceptedCO = coRows\[0\] as CounterOffer;                       |
|                                                                       |
| const acceptedOffer = offerRows\[0\];                                 |
|                                                                       |
| // contracts-service is triggered by this event.                      |
|                                                                       |
| await this.outboxService.create(em, {                                 |
|                                                                       |
| aggregateId: offerId,                                                 |
|                                                                       |
| eventType: OFFER_EVENTS.COUNTER_ACCEPTED,                             |
|                                                                       |
| routingKey: OFFER_EVENTS.COUNTER_ACCEPTED,                            |
|                                                                       |
| exchange: OFFER_EXCHANGE,                                             |
|                                                                       |
| payload: buildOfferCounterAcceptedPayload(acceptedOffer, acceptedCO,  |
| requesterId),                                                         |
|                                                                       |
| });                                                                   |
|                                                                       |
| return { acceptedCO, acceptedOffer };                                 |
|                                                                       |
| });                                                                   |
|                                                                       |
| this.ablyService.publish(offerId, acceptedOffer, null, false);        |
|                                                                       |
| return acceptedCO;                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // declineCO() --- NON-SUBMITTER declines CO                          |
|                                                                       |
| // CO: PENDING -\> DECLINED                                           |
|                                                                       |
| // Offer: COUNTERED -\> PENDING (restored)                            |
|                                                                       |
| // ============================================================       |
|                                                                       |
| async declineCO(                                                      |
|                                                                       |
| offerId: string,                                                      |
|                                                                       |
| coId: string,                                                         |
|                                                                       |
| requesterId: string,                                                  |
|                                                                       |
| ): Promise\<CounterOffer\> {                                          |
|                                                                       |
| const offer = await this.offersService.findByIdOrThrow(offerId);      |
|                                                                       |
| const co = await this.findCOByIdOrThrow(coId, offerId);               |
|                                                                       |
| OfferStateMachine.assertIsNonSubmitter(co, offer, requesterId);       |
|                                                                       |
| OfferStateMachine.assertCanTransitionCO(co.status,                    |
| CounterOfferStatus.DECLINED);                                         |
|                                                                       |
| const { declinedCO, restoredOffer } = await                           |
| this.dataSource.transaction(async (em) =\> {                          |
|                                                                       |
| // CAS on counter offer.                                              |
|                                                                       |
| const \[coRows, coCount\] = await em.query(\`                         |
|                                                                       |
| UPDATE offer_service.counter_offers                                   |
|                                                                       |
| SET status = \'DECLINED\', declined_at = NOW()                        |
|                                                                       |
| WHERE id = \$1 AND status = \'PENDING\'                               |
|                                                                       |
| RETURNING \*                                                          |
|                                                                       |
| \`, \[coId\]);                                                        |
|                                                                       |
| if (coCount === 0) throw new                                          |
| OfferConcurrentModificationException(coId);                           |
|                                                                       |
| // Restore parent offer to PENDING (CAS: must still be COUNTERED).    |
|                                                                       |
| // If 0 rows: parent was independently withdrawn/expired. No action   |
| needed.                                                               |
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
| const restoredOffer = offerRows?.\[0\] ?? offer;                      |
|                                                                       |
| await this.outboxService.create(em, {                                 |
|                                                                       |
| aggregateId: offerId,                                                 |
|                                                                       |
| eventType: OFFER_EVENTS.COUNTER_DECLINED,                             |
|                                                                       |
| routingKey: OFFER_EVENTS.COUNTER_DECLINED,                            |
|                                                                       |
| exchange: OFFER_EXCHANGE,                                             |
|                                                                       |
| payload: buildOfferCounterDeclinedPayload(restoredOffer, coRows\[0\], |
| requesterId),                                                         |
|                                                                       |
| });                                                                   |
|                                                                       |
| return { declinedCO: coRows\[0\] as CounterOffer, restoredOffer };    |
|                                                                       |
| });                                                                   |
|                                                                       |
| this.ablyService.publish(offerId, restoredOffer, null, false);        |
|                                                                       |
| return declinedCO;                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // withdrawCO() --- SUBMITTER withdraws their own CO                  |
|                                                                       |
| // CO: PENDING -\> WITHDRAWN                                          |
|                                                                       |
| // Offer: COUNTERED -\> PENDING (restored)                            |
|                                                                       |
| // ============================================================       |
|                                                                       |
| async withdrawCO(                                                     |
|                                                                       |
| offerId: string,                                                      |
|                                                                       |
| coId: string,                                                         |
|                                                                       |
| requesterId: string,                                                  |
|                                                                       |
| withdrawalMessage: string \| null,                                    |
|                                                                       |
| ): Promise\<CounterOffer\> {                                          |
|                                                                       |
| const offer = await this.offersService.findByIdOrThrow(offerId);      |
|                                                                       |
| const co = await this.findCOByIdOrThrow(coId, offerId);               |
|                                                                       |
| // Guard: only the SUBMITTER can withdraw their own CO.               |
|                                                                       |
| OfferStateMachine.assertIsSubmitter(co, requesterId);                 |
|                                                                       |
| OfferStateMachine.assertCanTransitionCO(co.status,                    |
| CounterOfferStatus.WITHDRAWN);                                        |
|                                                                       |
| const { withdrawnCO, restoredOffer } = await                          |
| this.dataSource.transaction(async (em) =\> {                          |
|                                                                       |
| const \[coRows, coCount\] = await em.query(\`                         |
|                                                                       |
| UPDATE offer_service.counter_offers                                   |
|                                                                       |
| SET status = \'WITHDRAWN\', withdrawn_at = NOW(), withdrawal_message  |
| = \$2                                                                 |
|                                                                       |
| WHERE id = \$1 AND status = \'PENDING\'                               |
|                                                                       |
| RETURNING \*                                                          |
|                                                                       |
| \`, \[coId, withdrawalMessage\]);                                     |
|                                                                       |
| if (coCount === 0) throw new                                          |
| OfferConcurrentModificationException(coId);                           |
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
| const restoredOffer = offerRows?.\[0\] ?? offer;                      |
|                                                                       |
| await this.outboxService.create(em, {                                 |
|                                                                       |
| aggregateId: offerId,                                                 |
|                                                                       |
| eventType: OFFER_EVENTS.COUNTER_WITHDRAWN,                            |
|                                                                       |
| routingKey: OFFER_EVENTS.COUNTER_WITHDRAWN,                           |
|                                                                       |
| exchange: OFFER_EXCHANGE,                                             |
|                                                                       |
| payload: buildOfferCounterWithdrawnPayload(restoredOffer,             |
| coRows\[0\]),                                                         |
|                                                                       |
| });                                                                   |
|                                                                       |
| return { withdrawnCO: coRows\[0\] as CounterOffer, restoredOffer };   |
|                                                                       |
| });                                                                   |
|                                                                       |
| this.ablyService.publish(offerId, restoredOffer, null, false);        |
|                                                                       |
| return withdrawnCO;                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // expireCO() --- SYSTEM expires a PENDING CO                         |
|                                                                       |
| // CO: PENDING -\> EXPIRED                                            |
|                                                                       |
| // Offer: COUNTERED -\> PENDING (unless parent also EXPIRED)          |
|                                                                       |
| // Called by ExpiryProcessor, never via API.                          |
|                                                                       |
| // ============================================================       |
|                                                                       |
| async expireCO(                                                       |
|                                                                       |
| offerId: string,                                                      |
|                                                                       |
| coId: string,                                                         |
|                                                                       |
| em: EntityManager,                                                    |
|                                                                       |
| ): Promise\<CounterOffer \| null\> {                                  |
|                                                                       |
| const \[coRows, coCount\] = await em.query(\`                         |
|                                                                       |
| UPDATE offer_service.counter_offers                                   |
|                                                                       |
| SET status = \'EXPIRED\', expired_at = NOW()                          |
|                                                                       |
| WHERE id = \$1 AND status = \'PENDING\'                               |
|                                                                       |
| RETURNING \*                                                          |
|                                                                       |
| \`, \[coId\]);                                                        |
|                                                                       |
| if (coCount === 0) {                                                  |
|                                                                       |
| this.logger.debug(\`CO \${coId} already transitioned before CO expiry |
| ran.\`);                                                              |
|                                                                       |
| return null;                                                          |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Restore parent offer IF it is still COUNTERED.                     |
|                                                                       |
| // If the parent was withdrawn/expired independently: 0 rows, no      |
| action.                                                               |
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
| const expiredCO = coRows\[0\] as CounterOffer;                        |
|                                                                       |
| const restoredOffer = offerRows?.\[0\];                               |
|                                                                       |
| // parentOfferStatus for payload: PENDING if restored, EXPIRED if     |
| not.                                                                  |
|                                                                       |
| const parentOfferStatus = restoredOffer ? \'PENDING\' : \'EXPIRED\';  |
|                                                                       |
| await this.outboxService.create(em, {                                 |
|                                                                       |
| aggregateId: offerId,                                                 |
|                                                                       |
| eventType: OFFER_EVENTS.COUNTER_EXPIRED,                              |
|                                                                       |
| routingKey: OFFER_EVENTS.COUNTER_EXPIRED,                             |
|                                                                       |
| exchange: OFFER_EXCHANGE,                                             |
|                                                                       |
| payload: buildOfferCounterExpiredPayload(                             |
|                                                                       |
| restoredOffer ?? { id: offerId, status: OfferStatus.EXPIRED } as any, |
|                                                                       |
| expiredCO,                                                            |
|                                                                       |
| ),                                                                    |
|                                                                       |
| });                                                                   |
|                                                                       |
| // ExpiryProcessor calls ablyService.publish after the transaction    |
| commits.                                                              |
|                                                                       |
| return expiredCO;                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Helper                                                             |
|                                                                       |
| // ============================================================       |
|                                                                       |
| private async findCOByIdOrThrow(coId: string, offerId: string):       |
| Promise\<CounterOffer\> {                                             |
|                                                                       |
| const co = await this.coRepo.findOne({ where: { id: coId, offerId }   |
| });                                                                   |
|                                                                       |
| if (!co) throw new NotFoundException(\`Counter offer \${coId} not     |
| found on offer \${offerId}\`);                                        |
|                                                                       |
| return co;                                                            |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 5 OfferActionGuard --- Pre-controller Role + State Check**     |
|                                                                       |
| Catches invalid actions before they reach the service layer           |
+-----------------------------------------------------------------------+

OfferActionGuard is a NestJS guard applied per-endpoint. It loads the
offer, checks the requester\'s role (CLIENT or TALENT), and validates
whether the action is allowed in the current offer state. This catches
invalid actions at the HTTP layer without the overhead of a full service
method invocation.

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/offers/guards/offer-action.guard.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import {                                                              |
|                                                                       |
| Injectable, CanActivate, ExecutionContext, ForbiddenException,        |
|                                                                       |
| } from \'@nestjs/common\';                                            |
|                                                                       |
| import { Reflector } from \'@nestjs/core\';                           |
|                                                                       |
| import { OffersService } from \'../offers.service\';                  |
|                                                                       |
| import { OfferStatus } from \'../enums/offer-status.enum\';           |
|                                                                       |
| import { UserRole } from \'../../common/types/user-role.enum\';       |
|                                                                       |
| export const OFFER_ACTION_KEY = \'offerAction\';                      |
|                                                                       |
| export interface OfferActionMeta {                                    |
|                                                                       |
| /\*\* The status the offer must be in for this action to proceed. \*/ |
|                                                                       |
| requireStatus: OfferStatus \| OfferStatus\[\];                        |
|                                                                       |
| /\*\* The role the requester must have. \*/                           |
|                                                                       |
| requireRole: \'CLIENT\' \| \'TALENT\' \| \'EITHER\';                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* \@OfferAction decorator --- attach allowed status + role metadata  |
| to a route.                                                           |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* \@example                                                          |
|                                                                       |
| \* \@OfferAction({ requireStatus: OfferStatus.PENDING, requireRole:   |
| \'TALENT\' })                                                         |
|                                                                       |
| \* \@Post(\':id/accept\')                                             |
|                                                                       |
| \* async accept(\...) {}                                              |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export const OfferAction = (meta: OfferActionMeta) =\>                |
|                                                                       |
| SetMetadata(OFFER_ACTION_KEY, meta);                                  |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* OfferActionGuard --- validates role and offer status before the    |
| route handler.                                                        |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Apply as \@UseGuards(OfferPartyGuard, OfferActionGuard).           |
|                                                                       |
| \* OfferPartyGuard must run first to attach req.offer.                |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| \@Injectable()                                                        |
|                                                                       |
| export class OfferActionGuard implements CanActivate {                |
|                                                                       |
| constructor(                                                          |
|                                                                       |
| private readonly reflector: Reflector,                                |
|                                                                       |
| private readonly offersService: OffersService,                        |
|                                                                       |
| ) {}                                                                  |
|                                                                       |
| async canActivate(context: ExecutionContext): Promise\<boolean\> {    |
|                                                                       |
| const meta = this.reflector.get\<OfferActionMeta\>(                   |
|                                                                       |
| OFFER_ACTION_KEY,                                                     |
|                                                                       |
| context.getHandler(),                                                 |
|                                                                       |
| );                                                                    |
|                                                                       |
| if (!meta) return true; // No metadata: guard is a no-op.             |
|                                                                       |
| const req = context.switchToHttp().getRequest();                      |
|                                                                       |
| const user = req.user;                                                |
|                                                                       |
| const offer = req.offer; // Attached by OfferPartyGuard               |
|                                                                       |
| if (!offer) throw new ForbiddenException(\'Offer not loaded. Ensure   |
| OfferPartyGuard runs first.\');                                       |
|                                                                       |
| // Check role.                                                        |
|                                                                       |
| if (meta.requireRole !== \'EITHER\') {                                |
|                                                                       |
| const isClient = meta.requireRole === \'CLIENT\';                     |
|                                                                       |
| const partyId = isClient ? offer.clientId : offer.talentId;           |
|                                                                       |
| if (partyId !== user.sub) {                                           |
|                                                                       |
| const role = isClient ? \'client\' : \'talent\';                      |
|                                                                       |
| throw new ForbiddenException(\`Only the \${role} on this offer can    |
| perform this action.\`);                                              |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Check offer status.                                                |
|                                                                       |
| const allowed = Array.isArray(meta.requireStatus)                     |
|                                                                       |
| ? meta.requireStatus                                                  |
|                                                                       |
| : \[meta.requireStatus\];                                             |
|                                                                       |
| if (!allowed.includes(offer.status)) {                                |
|                                                                       |
| throw new ForbiddenException(                                         |
|                                                                       |
| \`This action requires the offer to be in status: \${allowed.join(\'  |
| or \')}. \` +                                                         |
|                                                                       |
| \`Current status: \${offer.status}\`,                                 |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| return true;                                                          |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Usage in OffersController:                                         |
|                                                                       |
| // ============================================================       |
|                                                                       |
| \@Post(\':id/accept\')                                                |
|                                                                       |
| \@UseGuards(OfferPartyGuard, OfferActionGuard)                        |
|                                                                       |
| \@OfferAction({ requireStatus: OfferStatus.PENDING, requireRole:      |
| \'TALENT\' })                                                         |
|                                                                       |
| async accept(@Param(\"id\", ParseUUIDPipe) id: string, \@Req() req:   |
| AuthenticatedRequest) {                                               |
|                                                                       |
| return this.offersService.accept(id, req.user.sub);                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| \@Post(\':id/decline\')                                               |
|                                                                       |
| \@UseGuards(OfferPartyGuard, OfferActionGuard)                        |
|                                                                       |
| \@OfferAction({ requireStatus: OfferStatus.PENDING, requireRole:      |
| \'TALENT\' })                                                         |
|                                                                       |
| async decline(\...) { \... }                                          |
|                                                                       |
| \@Post(\':id/withdraw\')                                              |
|                                                                       |
| \@UseGuards(OfferPartyGuard, OfferActionGuard)                        |
|                                                                       |
| \@OfferAction({ requireStatus: \[OfferStatus.PENDING,                 |
| OfferStatus.COUNTERED\], requireRole: \'CLIENT\' })                   |
|                                                                       |
| async withdraw(\...) { \... }                                         |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 6 (Reference) Concurrency Rules & Edge Cases**                 |
|                                                                       |
| What happens under concurrent requests to the same offer              |
+-----------------------------------------------------------------------+

**Race condition scenarios and resolutions**

  --------------------- ------------------------------- -------------------------------------
  **Scenario**          **What happens**                **Client response**

  Two requests accept   CAS: both set expected=PENDING, Second: 409
  the same offer        target=ACCEPTED. First wins.    OFFER_CONCURRENT_MODIFICATION. Client
  simultaneously        Second finds 0 rows.            reloads and sees ACCEPTED.

  Accept and decline    CAS: both set expected=PENDING. Second: 409. Client reloads and sees
  simultaneously        First wins (either transition). the winning terminal state.

  Create CO while offer CO creation sets offer to       CO creation: 409. Client reloads and
  is being accepted     COUNTERED. Accept CAS checks    sees ACCEPTED.
                        status=PENDING. If accept wins  
                        first: offer is ACCEPTED, CO    
                        insert is rejected by FK.       

  Two CO submissions    DB partial unique index         Second INSERT: 23505 PG unique
  simultaneously        uq_counter_offers_one_pending   violation →
                        blocks the second INSERT.       CounterOfferAlreadyPendingException
                                                        (409).

  Decline CO while it   Both check CO.status=PENDING.   Second: 409
  is being accepted     First wins.                     OFFER_CONCURRENT_MODIFICATION. Client
  simultaneously                                        reloads.

  Expiry scheduler      Scheduler CAS:                  The loser gets 0 rows. Scheduler logs
  races with user       expected=PENDING,               and skips. User: 409, reload shows
  accept                target=EXPIRED. User CAS:       EXPIRED.
                        expected=PENDING,               
                        target=ACCEPTED. First wins.    
  --------------------- ------------------------------- -------------------------------------

**The 409 response the client receives on a CAS failure**

+-----------------------------------------------------------------------+
| // HTTP 409 Conflict response body:                                   |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"statusCode\": 409,                                                  |
|                                                                       |
| \"error\": \"OFFER_CONCURRENT_MODIFICATION\",                         |
|                                                                       |
| \"message\": \"Offer f47ac10b-\... was modified by a concurrent       |
| request. Reload and retry.\",                                         |
|                                                                       |
| \"timestamp\": \"2025-02-01T14:30:00.000Z\",                          |
|                                                                       |
| \"path\": \"/v1/offers/f47ac10b-\.../accept\"                         |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Frontend handling:                                                 |
|                                                                       |
| // 1. On any 409 from an offer mutation endpoint:                     |
|                                                                       |
| // 2. Show toast: \"This offer was updated. Loading the latest        |
| state\...\"                                                           |
|                                                                       |
| // 3. Reload offer via GET /v1/offers/:id                             |
|                                                                       |
| // 4. Re-render action buttons based on new status                    |
|                                                                       |
| // Note: Ably will also push the updated state to the frontend,       |
|                                                                       |
| // so in most cases the UI already reflects the new state before the  |
| 409 is handled.                                                       |
+-----------------------------------------------------------------------+
