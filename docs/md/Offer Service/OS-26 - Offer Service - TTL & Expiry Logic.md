**OS-26**

**Offer Service --- TTL & Expiry Logic**

**TTL:** 14 days **Warning:** 48 hours before **Extension threshold:**
30 days after expiry **Clock resets on:** create, edit, CO submit, CO
edit, resend

This document covers the complete TTL and expiry implementation for
offer-service. It includes: all confirmed business rules for when the
clock resets, the expiry cron job, the 48-hour warning cron job, the
30-day extension threshold logic, and where expiresAt is calculated in
service methods.

**File Map**

  ---------- ------------------------------------------- ----------------------
  **Step**   **File Path**                               **Purpose**

  **0**      (install)                                   npm install
                                                         \@nestjs/schedule

  **1**      src/scheduler/ttl.helper.ts                 calculateExpiresAt()
                                                         --- used in every
                                                         service method that
                                                         resets TTL

  **2**      src/scheduler/expiry.processor.ts           ExpiryProcessor ---
                                                         expires offers and
                                                         counter offers every
                                                         60 seconds

  **3**      src/scheduler/warning.processor.ts          WarningProcessor ---
                                                         sends 48h warning
                                                         every 5 minutes

  **4**      src/scheduler/scheduler.module.ts           SchedulerModule ---
                                                         registers both
                                                         processors

  **5**      src/app.module.ts (update)                  Import ScheduleModule
                                                         and SchedulerModule

  **6**      (reference)                                 Where expiresAt is set
                                                         in service methods
                                                         (create, edit, CO
                                                         submit, CO edit,
                                                         resend)

  **7**      (reference)                                 30-day extension
                                                         threshold --- Request
                                                         Extension vs Ask Now

  **8**      (reference)                                 Verification and
                                                         manual testing
  ---------- ------------------------------------------- ----------------------

+-----------------------------------------------------------------------+
| **Overview TTL Business Rules**                                       |
|                                                                       |
| All confirmed decisions on when the clock resets                      |
+-----------------------------------------------------------------------+

The 14-day TTL means offers and counter offers expire 14 days after the
most recent activity that resets the clock. Understanding exactly when
the clock resets is critical --- incorrect TTL resets cause offers to
stay active longer than intended.

  ---------------------------------- ---------------- ------------------------
  **Action**                         **Resets         **New expiresAt value**
                                     expiresAt?**     

  POST /v1/offers (create offer)     **YES --- sets   NOW() + 14 days
                                     initial TTL**    

  PATCH /v1/offers/:id (edit offer)  **YES --- client NOW() + 14 days
                                     edited terms**   

  POST \.../counter-offers (talent   **YES --- resets NOW() + 14 days on the
  submits CO)                        PRIMARY offer    offer
                                     expiresAt**      

  POST \.../counter-offers (client   **YES --- resets NOW() + 14 days on the
  submits CO)                        PRIMARY offer    offer
                                     expiresAt**      

  PATCH \.../counter-offers/:id      **YES --- resets NOW() + 14 days on the
  (edit CO in-place)                 CO expiresAt     CO
                                     only**           

  POST /v1/offers/:id/resend (resend **YES --- new    NOW() + 14 days on the
  offer)                             offer, new TTL** NEW offer

  POST /v1/offers/:id/accept         NO --- terminal  N/A (expiresAt not
                                     state            updated)

  POST /v1/offers/:id/decline        NO --- terminal  N/A
                                     state            

  POST /v1/offers/:id/withdraw       NO --- terminal  N/A
                                     state            

  POST                               NO --- terminal  N/A
  \.../counter-offers/:id/accept     state            

  POST                               NO --- terminal  N/A
  \.../counter-offers/:id/decline    state            

  POST                               NO --- terminal  N/A
  \.../counter-offers/:id/withdraw   state            

  GET /v1/offers/:id (view offer)    NO ---           N/A
                                     read-only, never 
                                     resets           
  ---------------------------------- ---------------- ------------------------

+-----------------------------------------------------------------------+
| Counter offer TTL is independent from primary offer TTL:              |
|                                                                       |
| When TALENT submits a CO: the CO gets its own expiresAt (NOW() + 14   |
| days).                                                                |
|                                                                       |
| The PRIMARY offer expiresAt is also reset (NOW() + 14 days).          |
|                                                                       |
| This keeps both clocks in sync after a CO is submitted.               |
|                                                                       |
| When CO is edited (PATCH): only the CO expiresAt is reset.            |
|                                                                       |
| The primary offer expiresAt is NOT reset (it was set when the CO was  |
| created).                                                             |
|                                                                       |
| When CO expires: the primary offer is restored to PENDING.            |
|                                                                       |
| The primary offer expiresAt is NOT automatically reset --- it keeps   |
| its original value.                                                   |
|                                                                       |
| If the primary offer also expired (independently): it stays EXPIRED.  |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 0 Install \@nestjs/schedule**                                  |
|                                                                       |
| Required for \@Cron decorator and ScheduleModule                      |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| \# Install NestJS schedule module                                     |
|                                                                       |
| npm install \@nestjs/schedule                                         |
|                                                                       |
| \# \@nestjs/schedule is a thin wrapper around node-cron.              |
|                                                                       |
| \# It provides the \@Cron decorator for class methods.                |
|                                                                       |
| \# Verify:                                                            |
|                                                                       |
| cat package.json \| grep \@nestjs/schedule                            |
|                                                                       |
| \# Expected: \"@nestjs/schedule\": \"\^4.x.x\"                        |
|                                                                       |
| \# \@types/cron is included with \@nestjs/schedule. No separate       |
| install needed.                                                       |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 1 TTL Helper --- ttl.helper.ts**                               |
|                                                                       |
| calculateExpiresAt() --- single function imported by every service    |
| method that resets TTL                                                |
+-----------------------------------------------------------------------+

All expiresAt calculations go through this one function. This means the
TTL duration (14 days) is defined in exactly one place. If the TTL
changes, update this file only.

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/scheduler/ttl.helper.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| /\*\*                                                                 |
|                                                                       |
| \* TTL constants for offer-service.                                   |
|                                                                       |
| \* All durations are confirmed business rules.                        |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| /\*\* Primary TTL: offers and counter offers expire 14 days after     |
| last activity. \*/                                                    |
|                                                                       |
| export const OFFER_TTL_DAYS = 14;                                     |
|                                                                       |
| /\*\* Warning threshold: send 48h warning before expiry. \*/          |
|                                                                       |
| export const EXPIRY_WARNING_HOURS = 48;                               |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* Extension threshold: if an offer expired \<= 30 days ago, show     |
|                                                                       |
| \* \"Request Extension\" button. If \> 30 days ago, show \"Ask Now\"  |
| button.                                                               |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export const EXTENSION_THRESHOLD_DAYS = 30;                           |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* calculateExpiresAt()                                               |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Returns the Date when this offer or counter offer should expire.   |
|                                                                       |
| \* Always NOW() + OFFER_TTL_DAYS.                                     |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Called in:                                                         |
|                                                                       |
| \* - OffersService.create() (initial TTL)                             |
|                                                                       |
| \* - OffersService.edit() (reset TTL on edit)                         |
|                                                                       |
| \* - CounterOffersService.create() (new CO TTL + reset primary offer  |
| TTL)                                                                  |
|                                                                       |
| \* - CounterOffersService.editCO() (reset CO TTL)                     |
|                                                                       |
| \* - OffersService.resend() (new offer TTL)                           |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* \@returns Date object set to exactly OFFER_TTL_DAYS from now.      |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export function calculateExpiresAt(): Date {                          |
|                                                                       |
| const d = new Date();                                                 |
|                                                                       |
| d.setDate(d.getDate() + OFFER_TTL_DAYS);                              |
|                                                                       |
| return d;                                                             |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* getWarningThreshold()                                              |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Returns the Date threshold for the 48h warning query.              |
|                                                                       |
| \* Offers expiring before this threshold should receive a warning.    |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Used by WarningProcessor:                                          |
|                                                                       |
| \* WHERE expires_at \<= getWarningThreshold() AND warning_sent_at IS  |
| NULL                                                                  |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export function getWarningThreshold(): Date {                         |
|                                                                       |
| const d = new Date();                                                 |
|                                                                       |
| d.setHours(d.getHours() + EXPIRY_WARNING_HOURS);                      |
|                                                                       |
| return d;                                                             |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* isWithinExtensionWindow(expiredAt)                                 |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Returns true if the offer expired within the last                  |
| EXTENSION_THRESHOLD_DAYS.                                             |
|                                                                       |
| \* Used by the frontend to decide which button to show on an expired  |
| offer.                                                                |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* \<= 30 days since expiredAt: show \"Request Extension\"            |
| (pre-populated chat message)                                          |
|                                                                       |
| \* \> 30 days since expiredAt: show \"Ask Now\" (open chat, message   |
| not pre-populated)                                                    |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* This function is called server-side to include the flag in the     |
| offer response.                                                       |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export function isWithinExtensionWindow(expiredAt: Date): boolean {   |
|                                                                       |
| const daysSinceExpiry =                                               |
|                                                                       |
| (Date.now() - expiredAt.getTime()) / (1000 \* 60 \* 60 \* 24);        |
|                                                                       |
| return daysSinceExpiry \<= EXTENSION_THRESHOLD_DAYS;                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* hoursUntilExpiry(expiresAt)                                        |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Returns the approximate number of hours until expiry.              |
|                                                                       |
| \* Used in OfferExpiringSoonPayload.hoursRemaining.                   |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export function hoursUntilExpiry(expiresAt: Date): number {           |
|                                                                       |
| const ms = expiresAt.getTime() - Date.now();                          |
|                                                                       |
| return Math.max(0, Math.floor(ms / (1000 \* 60 \* 60)));              |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 2 ExpiryProcessor --- expiry.processor.ts**                    |
|                                                                       |
| Runs every 60 seconds --- expires PENDING offers and counter offers   |
+-----------------------------------------------------------------------+

ExpiryProcessor runs two checks on each cron tick: one for expired
primary offers and one for expired counter offers. Both queries use
SELECT FOR UPDATE SKIP LOCKED so that multiple service instances
(horizontal scaling) never double-process the same offer. On each
successful expiry, the processor writes an outbox event and publishes an
Ably real-time update.

+-----------------------------------------------------------------------+
| The expiry cron runs every 60 seconds but offers expire when          |
| expires_at \<= NOW().                                                 |
|                                                                       |
| This means an offer may be expired up to 59 seconds after its actual  |
| expiry time.                                                          |
|                                                                       |
| This is acceptable. The UI reflects the correct state immediately via |
| the                                                                   |
|                                                                       |
| expiresAt field (frontend can show a countdown and mark as expired    |
| client-side).                                                         |
|                                                                       |
| SKIP LOCKED is mandatory when running more than one service instance. |
|                                                                       |
| Without SKIP LOCKED, all instances try to expire the same offer       |
| simultaneously.                                                       |
|                                                                       |
| With SKIP LOCKED, each offer is processed by exactly one instance.    |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/scheduler/expiry.processor.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { Injectable, Logger } from \'@nestjs/common\';                |
|                                                                       |
| import { Cron, CronExpression } from \'@nestjs/schedule\';            |
|                                                                       |
| import { DataSource, EntityManager } from \'typeorm\';                |
|                                                                       |
| import { OutboxService } from \'../outbox/outbox.service\';           |
|                                                                       |
| import { AblyService } from \'../realtime/ably.service\';             |
|                                                                       |
| import { OFFER_EXCHANGE } from                                        |
| \'../messaging/constants/rabbitmq.constants\';                        |
|                                                                       |
| import { OFFER_EVENTS } from \'../messaging/events/offer-events\';    |
|                                                                       |
| import {                                                              |
|                                                                       |
| buildOfferExpiredPayload,                                             |
|                                                                       |
| buildOfferCounterExpiredPayload,                                      |
|                                                                       |
| } from \'../messaging/events/offer-payload-builders\';                |
|                                                                       |
| import { Offer } from \'../offers/entities/offer.entity\';            |
|                                                                       |
| import { CounterOffer } from                                          |
| \'../counter-offers/entities/counter-offer.entity\';                  |
|                                                                       |
| /\*\* How many offers/COs to expire per cron tick. \*/                |
|                                                                       |
| const EXPIRY_BATCH_SIZE = 100;                                        |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* ExpiryProcessor --- Expires PENDING offers and counter offers.     |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Cron: every 60 seconds.                                            |
|                                                                       |
| \* Uses SELECT FOR UPDATE SKIP LOCKED for multi-instance safety.      |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* For each expired offer: writes outbox offer.expired event.         |
|                                                                       |
| \* For each expired CO: writes outbox offer.counter_expired event,    |
|                                                                       |
| \* restores parent offer to PENDING if not independently expired.     |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Ably publish fires AFTER the transaction commits                   |
| (fire-and-forget).                                                    |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| \@Injectable()                                                        |
|                                                                       |
| export class ExpiryProcessor {                                        |
|                                                                       |
| private readonly logger = new Logger(ExpiryProcessor.name);           |
|                                                                       |
| constructor(                                                          |
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
| // Primary offer expiry --- every 60 seconds                          |
|                                                                       |
| // ============================================================       |
|                                                                       |
| \@Cron(\'0 \* \* \* \* \*\', { name: \'offer-expiry\' })              |
|                                                                       |
| async expireOffers(): Promise\<void\> {                               |
|                                                                       |
| await this.expirePrimaryOffers();                                     |
|                                                                       |
| await this.expireCounterOffers();                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| private async expirePrimaryOffers(): Promise\<void\> {                |
|                                                                       |
| // Claim a batch of expired PENDING offers atomically.                |
|                                                                       |
| // UPDATE \... WHERE id IN (SELECT \... FOR UPDATE SKIP LOCKED)       |
|                                                                       |
| const expiredOffers = await this.dataSource.transaction(async (em)    |
| =\> {                                                                 |
|                                                                       |
| const rows: Offer\[\] = await em.query(\`                             |
|                                                                       |
| UPDATE offer_service.offers                                           |
|                                                                       |
| SET status = \'EXPIRED\', expired_at = NOW()                          |
|                                                                       |
| WHERE id IN (                                                         |
|                                                                       |
| SELECT id FROM offer_service.offers                                   |
|                                                                       |
| WHERE status = \'PENDING\'                                            |
|                                                                       |
| AND expires_at \<= NOW()                                              |
|                                                                       |
| ORDER BY expires_at ASC                                               |
|                                                                       |
| LIMIT \$1                                                             |
|                                                                       |
| FOR UPDATE SKIP LOCKED                                                |
|                                                                       |
| )                                                                     |
|                                                                       |
| RETURNING \*                                                          |
|                                                                       |
| \`, \[EXPIRY_BATCH_SIZE\]);                                           |
|                                                                       |
| if (rows.length === 0) return \[\];                                   |
|                                                                       |
| this.logger.log(\`Expiring \${rows.length} primary offer(s).\`);      |
|                                                                       |
| // Write one outbox event per expired offer.                          |
|                                                                       |
| for (const offer of rows) {                                           |
|                                                                       |
| await this.outboxService.create(em, {                                 |
|                                                                       |
| aggregateId: offer.id,                                                |
|                                                                       |
| eventType: OFFER_EVENTS.EXPIRED,                                      |
|                                                                       |
| routingKey: OFFER_EVENTS.EXPIRED,                                     |
|                                                                       |
| exchange: OFFER_EXCHANGE,                                             |
|                                                                       |
| payload: buildOfferExpiredPayload(offer),                             |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| return rows;                                                          |
|                                                                       |
| });                                                                   |
|                                                                       |
| // Ably publish outside the transaction (fire-and-forget).            |
|                                                                       |
| for (const offer of expiredOffers) {                                  |
|                                                                       |
| this.ablyService.publish(offer.id, offer, null, false);               |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Counter offer expiry --- runs on the same cron tick                |
|                                                                       |
| // ============================================================       |
|                                                                       |
| private async expireCounterOffers(): Promise\<void\> {                |
|                                                                       |
| type ExpiredCORow = {                                                 |
|                                                                       |
| co: CounterOffer;                                                     |
|                                                                       |
| restoredOffer: Offer \| null;                                         |
|                                                                       |
| };                                                                    |
|                                                                       |
| const results: ExpiredCORow\[\] = await                               |
| this.dataSource.transaction(async (em) =\> {                          |
|                                                                       |
| // Claim expired PENDING counter offers.                              |
|                                                                       |
| const expiredCOs: CounterOffer\[\] = await em.query(\`                |
|                                                                       |
| UPDATE offer_service.counter_offers                                   |
|                                                                       |
| SET status = \'EXPIRED\', expired_at = NOW()                          |
|                                                                       |
| WHERE id IN (                                                         |
|                                                                       |
| SELECT id FROM offer_service.counter_offers                           |
|                                                                       |
| WHERE status = \'PENDING\'                                            |
|                                                                       |
| AND expires_at \<= NOW()                                              |
|                                                                       |
| ORDER BY expires_at ASC                                               |
|                                                                       |
| LIMIT \$1                                                             |
|                                                                       |
| FOR UPDATE SKIP LOCKED                                                |
|                                                                       |
| )                                                                     |
|                                                                       |
| RETURNING \*                                                          |
|                                                                       |
| \`, \[EXPIRY_BATCH_SIZE\]);                                           |
|                                                                       |
| if (expiredCOs.length === 0) return \[\];                             |
|                                                                       |
| this.logger.log(\`Expiring \${expiredCOs.length} counter              |
| offer(s).\`);                                                         |
|                                                                       |
| const rows: ExpiredCORow\[\] = \[\];                                  |
|                                                                       |
| for (const co of expiredCOs) {                                        |
|                                                                       |
| // Attempt to restore the parent offer to PENDING.                    |
|                                                                       |
| // CAS: only update if the parent is still COUNTERED.                 |
|                                                                       |
| // If 0 rows: parent was independently withdrawn, accepted, or        |
| expired.                                                              |
|                                                                       |
| const offerRows: Offer\[\] = await em.query(\`                        |
|                                                                       |
| UPDATE offer_service.offers                                           |
|                                                                       |
| SET status = \'PENDING\'                                              |
|                                                                       |
| WHERE id = \$1 AND status = \'COUNTERED\'                             |
|                                                                       |
| RETURNING \*                                                          |
|                                                                       |
| \`, \[co.offerId\]);                                                  |
|                                                                       |
| const restoredOffer = offerRows\[0\] ?? null;                         |
|                                                                       |
| // Build payload: parentOfferStatus reflects what actually happened.  |
|                                                                       |
| const parentOffer = restoredOffer ?? await em.query(\`                |
|                                                                       |
| SELECT id, status FROM offer_service.offers WHERE id = \$1            |
|                                                                       |
| \`, \[co.offerId\]).then((r: Offer\[\]) =\> r\[0\]);                  |
|                                                                       |
| await this.outboxService.create(em, {                                 |
|                                                                       |
| aggregateId: co.offerId,                                              |
|                                                                       |
| eventType: OFFER_EVENTS.COUNTER_EXPIRED,                              |
|                                                                       |
| routingKey: OFFER_EVENTS.COUNTER_EXPIRED,                             |
|                                                                       |
| exchange: OFFER_EXCHANGE,                                             |
|                                                                       |
| payload: buildOfferCounterExpiredPayload(parentOffer, co),            |
|                                                                       |
| });                                                                   |
|                                                                       |
| rows.push({ co, restoredOffer });                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| return rows;                                                          |
|                                                                       |
| });                                                                   |
|                                                                       |
| // Ably publish outside transaction.                                  |
|                                                                       |
| for (const { co, restoredOffer } of results) {                        |
|                                                                       |
| if (restoredOffer) {                                                  |
|                                                                       |
| // Parent was restored to PENDING --- publish updated offer state.    |
|                                                                       |
| this.ablyService.publish(co.offerId, restoredOffer, null, false);     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // If parent was not restored (independently terminal): no Ably       |
| publish.                                                              |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 3 WarningProcessor --- warning.processor.ts**                  |
|                                                                       |
| Runs every 5 minutes --- sends 48h expiry warning once per offer      |
+-----------------------------------------------------------------------+

WarningProcessor finds PENDING offers that will expire within 48 hours
and have not yet had a warning sent (warning_sent_at IS NULL). It sets
warning_sent_at to NOW() in the same transaction as the outbox write,
ensuring the warning is sent exactly once per expiry window.

+-----------------------------------------------------------------------+
| Why warning_sent_at instead of a boolean?                             |
|                                                                       |
| Storing the timestamp (not just a boolean) allows auditing: you can   |
| see                                                                   |
|                                                                       |
| exactly when the warning was sent relative to the expiry time.        |
|                                                                       |
| The deduplication query is:                                           |
|                                                                       |
| WHERE expires_at \<= NOW() + 48h AND warning_sent_at IS NULL          |
|                                                                       |
| Once warning_sent_at is set, this offer is never matched again.       |
|                                                                       |
| If an offer is edited (TTL reset): its expires_at moves forward.      |
|                                                                       |
| The offer may re-enter the 48h window after the edit.                 |
|                                                                       |
| warning_sent_at is reset to NULL on every TTL reset (edit, CO submit, |
| etc.)                                                                 |
|                                                                       |
| so that a new warning is sent for the new expiry time.                |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/scheduler/warning.processor.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { Injectable, Logger } from \'@nestjs/common\';                |
|                                                                       |
| import { Cron } from \'@nestjs/schedule\';                            |
|                                                                       |
| import { DataSource } from \'typeorm\';                               |
|                                                                       |
| import { OutboxService } from \'../outbox/outbox.service\';           |
|                                                                       |
| import { OFFER_EXCHANGE } from                                        |
| \'../messaging/constants/rabbitmq.constants\';                        |
|                                                                       |
| import { OFFER_EVENTS } from \'../messaging/events/offer-events\';    |
|                                                                       |
| import { buildOfferExpiringSoonPayload } from                         |
| \'../messaging/events/offer-payload-builders\';                       |
|                                                                       |
| import { Offer } from \'../offers/entities/offer.entity\';            |
|                                                                       |
| import { getWarningThreshold, hoursUntilExpiry } from                 |
| \'./ttl.helper\';                                                     |
|                                                                       |
| /\*\* How many warnings to send per cron tick. \*/                    |
|                                                                       |
| const WARNING_BATCH_SIZE = 50;                                        |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* WarningProcessor --- Sends 48h expiry warnings.                    |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Cron: every 5 minutes.                                             |
|                                                                       |
| \* Finds PENDING offers expiring within 48h that have not been        |
| warned.                                                               |
|                                                                       |
| \* Sets warning_sent_at = NOW() atomically with the outbox write.     |
|                                                                       |
| \* warning_sent_at ensures each offer gets exactly ONE warning per    |
| expiry window.                                                        |
|                                                                       |
| \* warning_sent_at is reset to NULL whenever expiresAt is reset       |
| (edit, CO, resend).                                                   |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Note: counter offers do NOT get 48h warnings. Only primary offers. |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| \@Injectable()                                                        |
|                                                                       |
| export class WarningProcessor {                                       |
|                                                                       |
| private readonly logger = new Logger(WarningProcessor.name);          |
|                                                                       |
| constructor(                                                          |
|                                                                       |
| private readonly dataSource: DataSource,                              |
|                                                                       |
| private readonly outboxService: OutboxService,                        |
|                                                                       |
| ) {}                                                                  |
|                                                                       |
| \@Cron(\'0 \*/5 \* \* \* \*\', { name: \'offer-expiry-warning\' })    |
|                                                                       |
| async sendWarnings(): Promise\<void\> {                               |
|                                                                       |
| const threshold = getWarningThreshold(); // NOW() + 48 hours          |
|                                                                       |
| await this.dataSource.transaction(async (em) =\> {                    |
|                                                                       |
| // Claim offers that:                                                 |
|                                                                       |
| // 1. Are still PENDING                                               |
|                                                                       |
| // 2. Will expire within 48 hours (expires_at \<= threshold)          |
|                                                                       |
| // 3. Have NOT had a warning sent yet (warning_sent_at IS NULL)       |
|                                                                       |
| // Set warning_sent_at atomically so no double-sending.               |
|                                                                       |
| const offers: Offer\[\] = await em.query(\`                           |
|                                                                       |
| UPDATE offer_service.offers                                           |
|                                                                       |
| SET warning_sent_at = NOW()                                           |
|                                                                       |
| WHERE id IN (                                                         |
|                                                                       |
| SELECT id FROM offer_service.offers                                   |
|                                                                       |
| WHERE status = \'PENDING\'                                            |
|                                                                       |
| AND expires_at \<= \$1                                                |
|                                                                       |
| AND warning_sent_at IS NULL                                           |
|                                                                       |
| ORDER BY expires_at ASC                                               |
|                                                                       |
| LIMIT \$2                                                             |
|                                                                       |
| FOR UPDATE SKIP LOCKED                                                |
|                                                                       |
| )                                                                     |
|                                                                       |
| RETURNING \*                                                          |
|                                                                       |
| \`, \[threshold, WARNING_BATCH_SIZE\]);                               |
|                                                                       |
| if (offers.length === 0) return;                                      |
|                                                                       |
| this.logger.log(\`Sending 48h warning for \${offers.length}           |
| offer(s).\`);                                                         |
|                                                                       |
| for (const offer of offers) {                                         |
|                                                                       |
| await this.outboxService.create(em, {                                 |
|                                                                       |
| aggregateId: offer.id,                                                |
|                                                                       |
| eventType: OFFER_EVENTS.EXPIRING_SOON,                                |
|                                                                       |
| routingKey: OFFER_EVENTS.EXPIRING_SOON,                               |
|                                                                       |
| exchange: OFFER_EXCHANGE,                                             |
|                                                                       |
| payload: buildOfferExpiringSoonPayload(offer),                        |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 4 SchedulerModule --- scheduler.module.ts**                    |
|                                                                       |
| Registers ExpiryProcessor and WarningProcessor                        |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/scheduler/scheduler.module.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { Module } from \'@nestjs/common\';                            |
|                                                                       |
| import { TypeOrmModule } from \'@nestjs/typeorm\';                    |
|                                                                       |
| import { ExpiryProcessor } from \'./expiry.processor\';               |
|                                                                       |
| import { WarningProcessor } from \'./warning.processor\';             |
|                                                                       |
| import { Offer } from \'../offers/entities/offer.entity\';            |
|                                                                       |
| import { CounterOffer } from                                          |
| \'../counter-offers/entities/counter-offer.entity\';                  |
|                                                                       |
| import { OutboxModule } from \'../outbox/outbox.module\';             |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* SchedulerModule --- Registers all cron-based processors.           |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Requires ScheduleModule.forRoot() to be in AppModule.              |
|                                                                       |
| \* See Step 5.                                                        |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| \@Module({                                                            |
|                                                                       |
| imports: \[                                                           |
|                                                                       |
| TypeOrmModule.forFeature(\[Offer, CounterOffer\]),                    |
|                                                                       |
| OutboxModule,                                                         |
|                                                                       |
| \],                                                                   |
|                                                                       |
| providers: \[                                                         |
|                                                                       |
| ExpiryProcessor,                                                      |
|                                                                       |
| WarningProcessor,                                                     |
|                                                                       |
| \],                                                                   |
|                                                                       |
| })                                                                    |
|                                                                       |
| export class SchedulerModule {}                                       |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 5 Update AppModule --- Register ScheduleModule and             |
| SchedulerModule**                                                     |
|                                                                       |
| Two import lines in AppModule                                         |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/app.module.ts --- add these imports**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { ScheduleModule } from \'@nestjs/schedule\'; // \<\-- ADD     |
|                                                                       |
| import { SchedulerModule } from \'./scheduler/scheduler.module\'; //  |
| \<\-- ADD                                                             |
|                                                                       |
| \@Module({                                                            |
|                                                                       |
| imports: \[                                                           |
|                                                                       |
| ConfigModule.forRoot(\...),                                           |
|                                                                       |
| TypeOrmModule.forRootAsync(\...),                                     |
|                                                                       |
| AuthModule,                                                           |
|                                                                       |
| RedisModule,                                                          |
|                                                                       |
| MessagingModule,                                                      |
|                                                                       |
| AlertModule,                                                          |
|                                                                       |
| RealtimeModule,                                                       |
|                                                                       |
| ScheduleModule.forRoot(), // \<\-- ADD: enables \@Cron decorator      |
|                                                                       |
| SchedulerModule, // \<\-- ADD: registers Expiry + Warning processors  |
|                                                                       |
| OffersModule,                                                         |
|                                                                       |
| CounterOffersModule,                                                  |
|                                                                       |
| HealthModule,                                                         |
|                                                                       |
| \],                                                                   |
|                                                                       |
| \...                                                                  |
|                                                                       |
| })                                                                    |
|                                                                       |
| export class AppModule {}                                             |
|                                                                       |
| // ScheduleModule.forRoot() must be imported ONCE globally.           |
|                                                                       |
| // It initialises the node-cron scheduler.                            |
|                                                                       |
| // Without it, \@Cron decorators are ignored silently.                |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 6 (Reference) Where calculateExpiresAt() is Called in Service  |
| Methods**                                                             |
|                                                                       |
| Copy this pattern into every method that resets TTL                   |
+-----------------------------------------------------------------------+

Every service method that resets the TTL must import
calculateExpiresAt() from ttl.helper.ts and use it to set expiresAt.
Crucially, warning_sent_at is always reset to NULL at the same time, so
that a new 48h warning is issued for the new expiry time.

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/offers/offers.service.ts --- TTL reset
  pattern**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { calculateExpiresAt } from \'../scheduler/ttl.helper\';       |
|                                                                       |
| // \-\-\-- Pattern used in create() \-\-\--                           |
|                                                                       |
| async create(clientId: string, dto: CreateOfferDto): Promise\<Offer\> |
| {                                                                     |
|                                                                       |
| const expiresAt = calculateExpiresAt(); // NOW() + 14 days            |
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
| warningSentAt: null, // Always null on creation                       |
|                                                                       |
| });                                                                   |
|                                                                       |
| // \... save, outbox, ably \...                                       |
|                                                                       |
| }                                                                     |
|                                                                       |
| // \-\-\-- Pattern used in edit() \-\-\--                             |
|                                                                       |
| async edit(offerId: string, dto: EditOfferDto): Promise\<Offer\> {    |
|                                                                       |
| const expiresAt = calculateExpiresAt(); // Reset TTL on edit          |
|                                                                       |
| const \[rows, count\] = await em.query(\`                             |
|                                                                       |
| UPDATE offer_service.offers                                           |
|                                                                       |
| SET rate = \$2, currency_code = \$3, duration_months = \$4,           |
|                                                                       |
| work_schedule = \$5, start_date = \$6, message = \$7,                 |
|                                                                       |
| expires_at = \$8,                                                     |
|                                                                       |
| warning_sent_at = NULL \-- Reset warning so new warning fires near    |
| new expiry                                                            |
|                                                                       |
| WHERE id = \$1 AND status = \'PENDING\'                               |
|                                                                       |
| RETURNING \*                                                          |
|                                                                       |
| \`, \[offerId, dto.rate, dto.currencyCode, dto.durationMonths,        |
|                                                                       |
| JSON.stringify(dto.workSchedule), dto.startDate, dto.message,         |
|                                                                       |
| expiresAt\]);                                                         |
|                                                                       |
| // \...CAS check, outbox, ably \...                                   |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/counter-offers/counter-offers.service.ts
  --- TTL resets for COs**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { calculateExpiresAt } from \'../scheduler/ttl.helper\';       |
|                                                                       |
| // \-\-\-- TTL reset in CounterOffersService.create() \-\-\--         |
|                                                                       |
| // When CO is submitted: reset BOTH the CO expiresAt AND the primary  |
| offer expiresAt.                                                      |
|                                                                       |
| async create(offerId, requesterId, role, dto):                        |
| Promise\<CounterOffer\> {                                             |
|                                                                       |
| const coExpiresAt = calculateExpiresAt(); // CO-specific TTL          |
|                                                                       |
| const offerExpiresAt = calculateExpiresAt(); // Reset primary offer   |
| TTL too                                                               |
|                                                                       |
| const { newCO, updatedOffer } = await                                 |
| this.dataSource.transaction(async (em) =\> {                          |
|                                                                       |
| // Supersede existing PENDING CO (if any) \...                        |
|                                                                       |
| // Create new CO with its own TTL.                                    |
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
| // \... other fields \...                                             |
|                                                                       |
| expiresAt: coExpiresAt,                                               |
|                                                                       |
| warningSentAt: null,                                                  |
|                                                                       |
| });                                                                   |
|                                                                       |
| const savedCO = await em.save(co);                                    |
|                                                                       |
| // Reset primary offer TTL + warning_sent_at in the same transaction. |
|                                                                       |
| const \[offerRows\] = await em.query(\`                               |
|                                                                       |
| UPDATE offer_service.offers                                           |
|                                                                       |
| SET status = \'COUNTERED\',                                           |
|                                                                       |
| expires_at = \$2,                                                     |
|                                                                       |
| warning_sent_at = NULL                                                |
|                                                                       |
| WHERE id = \$1 AND status IN (\'PENDING\', \'COUNTERED\')             |
|                                                                       |
| RETURNING \*                                                          |
|                                                                       |
| \`, \[offerId, offerExpiresAt\]);                                     |
|                                                                       |
| // \... outbox \...                                                   |
|                                                                       |
| return { newCO: savedCO, updatedOffer: offerRows\[0\] };              |
|                                                                       |
| });                                                                   |
|                                                                       |
| // \...ably publish \...                                              |
|                                                                       |
| }                                                                     |
|                                                                       |
| // \-\-\-- TTL reset in CounterOffersService.editCO() \-\-\--         |
|                                                                       |
| // When CO is edited in-place: reset CO expiresAt only. Primary offer |
| NOT reset.                                                            |
|                                                                       |
| async editCO(offerId, coId, requesterId, dto):                        |
| Promise\<CounterOffer\> {                                             |
|                                                                       |
| const coExpiresAt = calculateExpiresAt(); // Reset CO TTL             |
|                                                                       |
| const \[rows\] = await em.query(\`                                    |
|                                                                       |
| UPDATE offer_service.counter_offers                                   |
|                                                                       |
| SET rate = \$2, currency_code = \$3, duration_months = \$4,           |
|                                                                       |
| work_schedule = \$5, start_date = \$6, message = \$7,                 |
|                                                                       |
| expires_at = \$8,                                                     |
|                                                                       |
| warning_sent_at = NULL \-- (COs don\'t get warnings, but reset for    |
| consistency)                                                          |
|                                                                       |
| WHERE id = \$1 AND status = \'PENDING\'                               |
|                                                                       |
| RETURNING \*                                                          |
|                                                                       |
| \`, \[coId, dto.rate, dto.currencyCode, dto.durationMonths,           |
|                                                                       |
| JSON.stringify(dto.workSchedule), dto.startDate, dto.message,         |
|                                                                       |
| coExpiresAt\]);                                                       |
|                                                                       |
| // \...CAS check, outbox, ably \...                                   |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 7 (Reference) 30-Day Extension Threshold --- Request Extension |
| vs Ask Now**                                                          |
|                                                                       |
| How the API communicates this to the frontend                         |
+-----------------------------------------------------------------------+

When a talent views an expired offer, the UI shows one of two action
buttons depending on how long ago the offer expired. This threshold is
computed server-side and included in the offer response, so the frontend
never needs to know the 30-day rule itself.

  --------------------- -------------------------------------------------
  **Elapsed since       Show \"Request Extension\" button. Pre-populates
  expiredAt ≤ 30 days** the chat input with: \"Hi, I wanted to follow up
                        on the \[contractTitle\] offer. Would you be able
                        to extend it?\" Talent can edit before sending.
                        Message is NOT auto-sent.

  **Elapsed since       Show \"Ask Now\" button. Opens the chat thread
  expiredAt \> 30       with the client. No pre-populated message. The
  days**                offer has been expired too long for a standard
                        extension flow.
  --------------------- -------------------------------------------------

+-----------------------------------------------------------------------+
| Neither action changes the offer status.                              |
|                                                                       |
| \"Request Extension\" sends a plain chat message. The offer remains   |
| EXPIRED.                                                              |
|                                                                       |
| \"Ask Now\" opens the chat thread. No backend state change.           |
|                                                                       |
| If the client wants to re-engage, they use POST /v1/offers/:id/resend |
|                                                                       |
| which creates a NEW offer record (the expired one stays EXPIRED       |
| forever).                                                             |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/offers/offers.service.ts --- include
  extensionInfo in offer response**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { isWithinExtensionWindow } from \'../scheduler/ttl.helper\';  |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* getOfferWithExtensionInfo()                                        |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Adds computed fields to the offer response that the frontend       |
| needs.                                                                |
|                                                                       |
| \* These are NOT stored in the database --- computed at read time.    |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| async getOfferWithExtensionInfo(offerId: string, requesterId: string) |
| {                                                                     |
|                                                                       |
| const offer = await this.findByIdOrThrow(offerId);                    |
|                                                                       |
| OfferStateMachine.assertIsParty(offer, requesterId);                  |
|                                                                       |
| // Compute extension info for EXPIRED offers.                         |
|                                                                       |
| const extensionInfo = offer.status === OfferStatus.EXPIRED &&         |
| offer.expiredAt                                                       |
|                                                                       |
| ? {                                                                   |
|                                                                       |
| canRequestExtension: isWithinExtensionWindow(offer.expiredAt),        |
|                                                                       |
| // canRequestExtension=true: show \"Request Extension\" button        |
|                                                                       |
| // canRequestExtension=false: show \"Ask Now\" button                 |
|                                                                       |
| // Pre-populated message for \"Request Extension\":                   |
|                                                                       |
| extensionMessage: isWithinExtensionWindow(offer.expiredAt)            |
|                                                                       |
| ? \`Hi, I wanted to follow up on the \${offer.contractTitle} offer.   |
| \` +                                                                  |
|                                                                       |
| \'Would you be able to extend it?\'                                   |
|                                                                       |
| : null,                                                               |
|                                                                       |
| }                                                                     |
|                                                                       |
| : null;                                                               |
|                                                                       |
| return { \...offer, extensionInfo };                                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Frontend usage:                                                    |
|                                                                       |
| // if (offer.status === \"EXPIRED\") {                                |
|                                                                       |
| // if (offer.extensionInfo?.canRequestExtension) {                    |
|                                                                       |
| // // Show \"Request Extension\" button                               |
|                                                                       |
| // // Pre-fill chat input with extensionInfo.extensionMessage         |
|                                                                       |
| // } else {                                                           |
|                                                                       |
| // // Show \"Ask Now\" button (opens chat, no pre-fill)               |
|                                                                       |
| // }                                                                  |
|                                                                       |
| // }                                                                  |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 8 Verification --- Test the Expiry and Warning Processors**    |
|                                                                       |
| Manual testing steps to confirm expiry and warning logic works        |
+-----------------------------------------------------------------------+

**Test 1 --- Confirm cron jobs are registered**

+-----------------------------------------------------------------------+
| \# Start the service and watch the startup logs:                      |
|                                                                       |
| npm run start:dev \--workspace=apps/offer-service                     |
|                                                                       |
| \# Look for these lines in the NestJS startup output:                 |
|                                                                       |
| \# \[SchedulerRegistry\] Registered \"offer-expiry\" cron job.        |
|                                                                       |
| \# \[SchedulerRegistry\] Registered \"offer-expiry-warning\" cron     |
| job.                                                                  |
|                                                                       |
| \# If not present: confirm ScheduleModule.forRoot() is in AppModule   |
|                                                                       |
| \# and SchedulerModule is imported after it.                          |
+-----------------------------------------------------------------------+

**Test 2 --- Force expiry on a test offer (database shortcut)**

+-----------------------------------------------------------------------+
| \# 1. Create a PENDING offer via the API (or use seed data).          |
|                                                                       |
| OFFER_ID=40000000-0000-4000-a000-000000000001                         |
|                                                                       |
| \# 2. Set expires_at to 1 minute in the past:                         |
|                                                                       |
| UPDATE offer_service.offers                                           |
|                                                                       |
| SET expires_at = NOW() - INTERVAL \'1 minute\'                        |
|                                                                       |
| WHERE id = \$OFFER_ID AND status = \'PENDING\';                       |
|                                                                       |
| \# 3. Wait for the cron tick (up to 60 seconds) or restart service.   |
|                                                                       |
| \# 4. Check the offer status:                                         |
|                                                                       |
| SELECT id, status, expired_at FROM offer_service.offers WHERE id =    |
| \'\$OFFER_ID\';                                                       |
|                                                                       |
| \# Expected: status = \'EXPIRED\', expired_at = recent timestamp      |
|                                                                       |
| \# 5. Check outbox for the event:                                     |
|                                                                       |
| SELECT event_type, status FROM offer_service.outbox WHERE             |
| aggregate_id = \'\$OFFER_ID\';                                        |
|                                                                       |
| \# Expected: event_type = \'offer.expired\', status = \'PENDING\' or  |
| \'PUBLISHED\'                                                         |
+-----------------------------------------------------------------------+

**Test 3 --- Force the 48h warning on a test offer**

+-----------------------------------------------------------------------+
| \# 1. Set expires_at to 20 hours from now AND warning_sent_at to      |
| NULL:                                                                 |
|                                                                       |
| UPDATE offer_service.offers                                           |
|                                                                       |
| SET expires_at = NOW() + INTERVAL \'20 hours\',                       |
|                                                                       |
| warning_sent_at = NULL                                                |
|                                                                       |
| WHERE id = \'\$OFFER_ID\' AND status = \'PENDING\';                   |
|                                                                       |
| \# 2. Wait for WarningProcessor cron tick (up to 5 minutes).          |
|                                                                       |
| \# 3. Check warning_sent_at is now set:                               |
|                                                                       |
| SELECT id, expires_at, warning_sent_at FROM offer_service.offers      |
| WHERE id = \'\$OFFER_ID\';                                            |
|                                                                       |
| \# Expected: warning_sent_at = recent timestamp (not null)            |
|                                                                       |
| \# 4. Check outbox:                                                   |
|                                                                       |
| SELECT event_type FROM offer_service.outbox WHERE aggregate_id =      |
| \'\$OFFER_ID\'                                                        |
|                                                                       |
| AND event_type = \'offer.expiring_soon\';                             |
|                                                                       |
| \# Expected: 1 row with status \'PENDING\' or \'PUBLISHED\'           |
|                                                                       |
| \# 5. Confirm no double-warning (run cron again):                     |
|                                                                       |
| \# Since warning_sent_at is now set, the warning should NOT be        |
| re-sent.                                                              |
|                                                                       |
| SELECT COUNT(\*) FROM offer_service.outbox WHERE aggregate_id =       |
| \'\$OFFER_ID\'                                                        |
|                                                                       |
| AND event_type = \'offer.expiring_soon\';                             |
|                                                                       |
| \# Expected: still 1 row (not 2)                                      |
+-----------------------------------------------------------------------+

**Test 4 --- Verify warning resets after TTL reset**

+-----------------------------------------------------------------------+
| \# 1. Set warning_sent_at to a past timestamp (simulating warning was |
| sent):                                                                |
|                                                                       |
| UPDATE offer_service.offers                                           |
|                                                                       |
| SET warning_sent_at = NOW() - INTERVAL \'2 hours\'                    |
|                                                                       |
| WHERE id = \'\$OFFER_ID\';                                            |
|                                                                       |
| \# 2. Edit the offer via the API (any field change --- this resets    |
| expiresAt):                                                           |
|                                                                       |
| curl -s -X PATCH http://localhost:3005/v1/offers/\$OFFER_ID \\        |
|                                                                       |
| -H \"Authorization: Bearer \<CLIENT_JWT\>\" \\                        |
|                                                                       |
| -H \"Content-Type: application/json\" \\                              |
|                                                                       |
| -d \'{\"message\": \"Updated message.\"}\'                            |
|                                                                       |
| \# 3. Verify warning_sent_at is now NULL:                             |
|                                                                       |
| SELECT warning_sent_at, expires_at FROM offer_service.offers WHERE id |
| = \'\$OFFER_ID\';                                                     |
|                                                                       |
| \# Expected: warning_sent_at = NULL (reset), expires_at = \~14 days   |
| from now                                                              |
|                                                                       |
| \# 4. Set expires_at to 20 hours from now again:                      |
|                                                                       |
| UPDATE offer_service.offers                                           |
|                                                                       |
| SET expires_at = NOW() + INTERVAL \'20 hours\'                        |
|                                                                       |
| WHERE id = \'\$OFFER_ID\';                                            |
|                                                                       |
| \# 5. Wait for WarningProcessor. Confirm warning fires again (new     |
| expiry).                                                              |
+-----------------------------------------------------------------------+

**Test 5 --- Verify 30-day extension threshold**

+-----------------------------------------------------------------------+
| \# 1. Set an offer to EXPIRED with expiredAt = 10 days ago:           |
|                                                                       |
| UPDATE offer_service.offers                                           |
|                                                                       |
| SET status = \'EXPIRED\',                                             |
|                                                                       |
| expired_at = NOW() - INTERVAL \'10 days\',                            |
|                                                                       |
| expires_at = NOW() - INTERVAL \'10 days\'                             |
|                                                                       |
| WHERE id = \'\$OFFER_ID\';                                            |
|                                                                       |
| \# 2. Fetch the offer via REST:                                       |
|                                                                       |
| curl -s http://localhost:3005/v1/offers/\$OFFER_ID \\                 |
|                                                                       |
| -H \"Authorization: Bearer \<JWT\>\" \| jq .extensionInfo             |
|                                                                       |
| \# Expected:                                                          |
|                                                                       |
| \# { \"canRequestExtension\": true, \"extensionMessage\": \"Hi, I     |
| wanted to follow up\...\" }                                           |
|                                                                       |
| \# 3. Set expiredAt = 40 days ago:                                    |
|                                                                       |
| UPDATE offer_service.offers                                           |
|                                                                       |
| SET expired_at = NOW() - INTERVAL \'40 days\'                         |
|                                                                       |
| WHERE id = \'\$OFFER_ID\';                                            |
|                                                                       |
| \# 4. Fetch again:                                                    |
|                                                                       |
| curl -s http://localhost:3005/v1/offers/\$OFFER_ID \\                 |
|                                                                       |
| -H \"Authorization: Bearer \<JWT\>\" \| jq .extensionInfo             |
|                                                                       |
| \# Expected:                                                          |
|                                                                       |
| \# { \"canRequestExtension\": false, \"extensionMessage\": null }     |
+-----------------------------------------------------------------------+
