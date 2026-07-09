**OS-16**

**Offer Service --- Database Indexes & Query Optimization**

**Schema:** offer_service **Total indexes:** 15 indexes across 4 tables
**Critical:** 1 partial unique index enforcing business rule

This document covers every index in the offer_service schema: why it
exists, which queries it serves, how to verify it is being used, and
what happens without it. Every index was chosen to serve a specific
query pattern that occurs during normal operation. There are no
speculative indexes --- each one has a concrete justification tied to a
service method or scheduler job.

**Master Index Catalogue --- All 15 Indexes**

The table below lists every index across all four tables. Colour coding:
B-tree (standard), Partial (filtered), Unique (uniqueness enforced),
Composite (multiple columns).

  ----------------------------------- ---------------- --------------- ------------------------------------
  **Index Name**                      **Table**        **Type**        **Purpose & Queries Served**

  **pk_offers**                       offers           **Unique**      Primary key lookup. Used on every
                                                                       GET /v1/offers/:id and every FK
                                                                       join.

  **idx_offers_client_id**            offers           **B-tree**      Filter offers by client. Used by
                                                                       active-offer constraint check on
                                                                       POST /v1/offers.

  **idx_offers_talent_id**            offers           **B-tree**      Filter offers by talent. Used by GET
                                                                       offer history and active-offer
                                                                       check.

  **idx_offers_client_talent**        offers           **Composite**   Filter offers by both client AND
                                                                       talent together. Core query for
                                                                       one-active-offer enforcement.

  **idx_offers_status_expires**       offers           **Composite**   Expiry scheduler query. SELECT
                                                                       offers WHERE status=PENDING AND
                                                                       expires_at \<= NOW()

  **idx_offers_talent_status**        offers           **Composite**   Talent dashboard queries. Fetch all
                                                                       PENDING offers for a specific
                                                                       talent.

  **pk_counter_offers**               counter_offers   **Unique**      Primary key lookup. Every GET
                                                                       /v1/\.../counter-offers/:id.

  **idx_co_offer_id**                 counter_offers   **B-tree**      Fetch all COs for a parent offer.
                                                                       Used when loading offer details with
                                                                       CO context.

  **idx_co_offer_status**             counter_offers   **Composite**   Fetch the active (PENDING) CO for a
                                                                       given offer. Core query for every CO
                                                                       action.

  **idx_co_expires**                  counter_offers   **Composite**   CO expiry scheduler. SELECT
                                                                       counter_offers WHERE status=PENDING
                                                                       AND expires_at \<= NOW()

  **uq_counter_offers_one_pending**   counter_offers   **Partial**     CRITICAL. Enforces only one PENDING
                                                                       counter offer per parent offer at
                                                                       the DB level.

  **pk_offer_history**                offer_history    **Unique**      Primary key lookup. Rarely used
                                                                       directly.

  **idx_oh_offer_id**                 offer_history    **B-tree**      Fetch all history events for an
                                                                       offer. Core query for GET
                                                                       /v1/offers/:id/history.

  **idx_oh_offer_id_created**         offer_history    **Composite**   Paginated history fetch ordered by
                                                                       created_at DESC. Cursor-based
                                                                       pagination.

  **idx_outbox_status_scheduled**     outbox           **Partial**     Outbox poller query. SELECT WHERE
                                                                       status IN (PENDING, PROCESSING)
                                                                       ORDER BY scheduled_at.
  ----------------------------------- ---------------- --------------- ------------------------------------

+-----------------------------------------------------------------------+
| **Section 1 offers Table Indexes**                                    |
|                                                                       |
| 6 indexes on the most queried table                                   |
+-----------------------------------------------------------------------+

**1.1 pk_offers --- Primary Key**

The primary key index on offers.id. This is used on every request that
loads an offer by ID --- GET /v1/offers/:id, OfferPartyGuard, accept,
decline, withdraw, edit, resend. It is also used implicitly by every
foreign key join from counter_offers and offer_history. PostgreSQL
creates this automatically when you define PRIMARY KEY.

+-----------------------------------------------------------------------+
| \-- Created automatically by PRIMARY KEY constraint in OS-15 DDL:     |
|                                                                       |
| CONSTRAINT pk_offers PRIMARY KEY (id)                                 |
|                                                                       |
| \-- Serves queries like:                                              |
|                                                                       |
| SELECT \* FROM offer_service.offers WHERE id = \$1;                   |
|                                                                       |
| \-- Used by: OffersService.findById(), OfferPartyGuard, all state     |
| transition methods                                                    |
|                                                                       |
| \-- EXPLAIN ANALYZE example:                                          |
|                                                                       |
| EXPLAIN ANALYZE SELECT id, client_id, talent_id, status               |
|                                                                       |
| FROM offer_service.offers                                             |
|                                                                       |
| WHERE id = \'f47ac10b-58cc-4372-a567-0e02b2c3d479\';                  |
|                                                                       |
| \-- Expected plan: Index Scan using pk_offers                         |
|                                                                       |
| \-- Expected cost: \< 1ms on any table size (UUID lookup is O(log n)) |
+-----------------------------------------------------------------------+

**1.2 idx_offers_client_id --- Client Lookup**

Single-column B-tree index on client_id. Allows fast filtering of all
offers sent by a specific client. Used by the active-offer constraint
check (before creating a new offer, the service queries all active
offers by this client to a specific talent). Also used when a client
views their sent offers.

+-----------------------------------------------------------------------+
| \-- Created in OS-15 DDL:                                             |
|                                                                       |
| CREATE INDEX IF NOT EXISTS idx_offers_client_id ON                    |
| offer_service.offers (client_id);                                     |
|                                                                       |
| \-- Serves queries like:                                              |
|                                                                       |
| SELECT id, talent_id, status FROM offer_service.offers                |
|                                                                       |
| WHERE client_id = \$1 AND status IN (\'PENDING\', \'COUNTERED\');     |
|                                                                       |
| \-- Used by: OffersService.checkActiveOfferConstraint()               |
|                                                                       |
| \-- Without this index:                                               |
|                                                                       |
| \-- PostgreSQL would scan ALL offers to find those by this client.    |
|                                                                       |
| \-- At 100k rows: \~50ms seq scan. With index: \~0.1ms index scan.    |
+-----------------------------------------------------------------------+

**1.3 idx_offers_talent_id --- Talent Lookup**

Single-column B-tree index on talent_id. Allows fast filtering of all
offers received by a specific talent. Used when loading a talent\'s
offer inbox and when the active-offer constraint needs to check
talent-specific offers.

+-----------------------------------------------------------------------+
| CREATE INDEX IF NOT EXISTS idx_offers_talent_id ON                    |
| offer_service.offers (talent_id);                                     |
|                                                                       |
| \-- Serves queries like:                                              |
|                                                                       |
| SELECT id, client_id, status, expires_at FROM offer_service.offers    |
|                                                                       |
| WHERE talent_id = \$1 AND status = \'PENDING\'                        |
|                                                                       |
| ORDER BY created_at DESC;                                             |
|                                                                       |
| \-- Used by: OffersService.findPendingOffersForTalent()               |
+-----------------------------------------------------------------------+

**1.4 idx_offers_client_talent --- Active Offer Constraint (Composite)**

The most critical write-path index. When a client sends a new offer, the
service MUST check whether an active offer already exists for this
client-talent pair. Without this composite index, that check requires a
full table scan filtered by two columns. With the composite index, it is
a precise, sub-millisecond lookup. This query runs on EVERY POST
/v1/offers and POST /v1/offers/:id/resend.

+-----------------------------------------------------------------------+
| Why a composite index instead of two single-column indexes?           |
|                                                                       |
| PostgreSQL can sometimes use two single-column indexes (bitmap AND    |
| scan),                                                                |
|                                                                       |
| but it is less efficient than a single composite index for this AND   |
| query.                                                                |
|                                                                       |
| The composite (client_id, talent_id) index perfectly serves the       |
| query:                                                                |
|                                                                       |
| WHERE client_id = \$1 AND talent_id = \$2 AND status IN (\'PENDING\', |
| \'COUNTERED\')                                                        |
|                                                                       |
| PostgreSQL uses the index to narrow to the exact client-talent pair,  |
| then                                                                  |
|                                                                       |
| filters on status from the much smaller result set.                   |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| CREATE INDEX IF NOT EXISTS idx_offers_client_talent                   |
|                                                                       |
| ON offer_service.offers (client_id, talent_id);                       |
|                                                                       |
| \-- Serves the active-offer constraint query:                         |
|                                                                       |
| SELECT id, status FROM offer_service.offers                           |
|                                                                       |
| WHERE client_id = \$1                                                 |
|                                                                       |
| AND talent_id = \$2                                                   |
|                                                                       |
| AND status IN (\'PENDING\', \'COUNTERED\')                            |
|                                                                       |
| LIMIT 1;                                                              |
|                                                                       |
| \-- Used by: OffersService.create() and OffersService.resend()        |
|                                                                       |
| \-- Runs on: every POST /v1/offers and POST /v1/offers/:id/resend     |
|                                                                       |
| \-- TypeORM query pattern in OffersService:                           |
|                                                                       |
| \-- const existing = await this.offerRepo.findOne({                   |
|                                                                       |
| \-- where: \[                                                         |
|                                                                       |
| \-- { clientId, talentId, status: OfferStatus.PENDING },              |
|                                                                       |
| \-- { clientId, talentId, status: OfferStatus.COUNTERED },            |
|                                                                       |
| \-- \],                                                               |
|                                                                       |
| \-- });                                                               |
|                                                                       |
| \-- EXPLAIN ANALYZE:                                                  |
|                                                                       |
| EXPLAIN ANALYZE SELECT id, status FROM offer_service.offers           |
|                                                                       |
| WHERE client_id = \'client-uuid\' AND talent_id = \'talent-uuid\'     |
|                                                                       |
| AND status IN (\'PENDING\', \'COUNTERED\') LIMIT 1;                   |
|                                                                       |
| \-- Expected: Index Scan using idx_offers_client_talent               |
|                                                                       |
| \-- Expected cost: \< 0.2ms                                           |
+-----------------------------------------------------------------------+

**1.5 idx_offers_status_expires --- Expiry Scheduler (Composite)**

The scheduler runs a cron job every minute to expire offers past their
TTL. This query must be fast because it runs constantly. The composite
index on (status, expires_at) allows the scheduler to find all PENDING
offers where expires_at has passed without a full table scan. The status
column is first because it has low cardinality (few distinct values),
which makes the composite more selective.

+-----------------------------------------------------------------------+
| CREATE INDEX IF NOT EXISTS idx_offers_status_expires                  |
|                                                                       |
| ON offer_service.offers (status, expires_at);                         |
|                                                                       |
| \-- Serves the expiry cron job query:                                 |
|                                                                       |
| SELECT id FROM offer_service.offers                                   |
|                                                                       |
| WHERE status = \'PENDING\'                                            |
|                                                                       |
| AND expires_at \<= NOW()                                              |
|                                                                       |
| FOR UPDATE SKIP LOCKED;                                               |
|                                                                       |
| \-- Used by: ExpiryProcessor (scheduler/expiry.processor.ts)          |
|                                                                       |
| \-- Runs: every 60 seconds                                            |
|                                                                       |
| \-- Also serves the 48h warning query:                                |
|                                                                       |
| SELECT id FROM offer_service.offers                                   |
|                                                                       |
| WHERE status = \'PENDING\'                                            |
|                                                                       |
| AND expires_at \<= NOW() + INTERVAL \'48 hours\'                      |
|                                                                       |
| AND warning_sent_at IS NULL                                           |
|                                                                       |
| FOR UPDATE SKIP LOCKED;                                               |
|                                                                       |
| \-- Used by: WarningProcessor (scheduler/warning.processor.ts)        |
|                                                                       |
| \-- Runs: every 5 minutes                                             |
|                                                                       |
| \-- Without this index: full table scan on every cron tick.           |
|                                                                       |
| \-- At 10k active offers: 100ms per minute = 1.7 hours/day wasted.    |
+-----------------------------------------------------------------------+

**1.6 idx_offers_talent_status --- Talent Offer Inbox (Composite)**

Used when the frontend loads all active offers for a talent (their inbox
view). Filters by talent_id first, then status. This allows the
talent\'s offer list page to load all PENDING and COUNTERED offers
efficiently.

+-----------------------------------------------------------------------+
| CREATE INDEX IF NOT EXISTS idx_offers_talent_status                   |
|                                                                       |
| ON offer_service.offers (talent_id, status);                          |
|                                                                       |
| \-- Serves talent inbox queries:                                      |
|                                                                       |
| SELECT id, client_id, contract_title, rate, status, expires_at        |
|                                                                       |
| FROM offer_service.offers                                             |
|                                                                       |
| WHERE talent_id = \$1                                                 |
|                                                                       |
| AND status IN (\'PENDING\', \'COUNTERED\')                            |
|                                                                       |
| ORDER BY created_at DESC;                                             |
|                                                                       |
| \-- Used by: OffersService.findActiveOffersForTalent() (frontend      |
| call)                                                                 |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Section 2 counter_offers Table Indexes**                            |
|                                                                       |
| 5 indexes including the critical partial unique index                 |
+-----------------------------------------------------------------------+

**2.1 pk_counter_offers --- Primary Key**

Standard primary key. Used on every GET
/v1/offers/:offerId/counter-offers/:id and on every FK join from
offer_history. Auto-created by PostgreSQL from the PRIMARY KEY
constraint.

+-----------------------------------------------------------------------+
| CONSTRAINT pk_counter_offers PRIMARY KEY (id)                         |
|                                                                       |
| \-- Serves:                                                           |
|                                                                       |
| SELECT \* FROM offer_service.counter_offers WHERE id = \$1;           |
|                                                                       |
| \-- Used by: CounterOffersService.findById()                          |
+-----------------------------------------------------------------------+

**2.2 idx_co_offer_id --- Parent Offer Lookup**

Fetches all counter offers for a given parent offer. Used when loading
the full offer state (which includes the current counter offer context)
and when building the offer history timeline.

+-----------------------------------------------------------------------+
| CREATE INDEX IF NOT EXISTS idx_co_offer_id                            |
|                                                                       |
| ON offer_service.counter_offers (offer_id);                           |
|                                                                       |
| \-- Serves:                                                           |
|                                                                       |
| SELECT id, submitted_by, status, rate, expires_at                     |
|                                                                       |
| FROM offer_service.counter_offers                                     |
|                                                                       |
| WHERE offer_id = \$1                                                  |
|                                                                       |
| ORDER BY created_at DESC;                                             |
|                                                                       |
| \-- Used by: CounterOffersService.findByOfferId()                     |
+-----------------------------------------------------------------------+

**2.3 idx_co_offer_status --- Active Counter Offer Lookup (Composite)**

The most frequently queried index on the counter_offers table. When any
action is taken on a counter offer (accept, decline, withdraw, edit),
the service first loads the current PENDING counter offer for the parent
offer. This composite index makes that lookup sub-millisecond.

+-----------------------------------------------------------------------+
| CREATE INDEX IF NOT EXISTS idx_co_offer_status                        |
|                                                                       |
| ON offer_service.counter_offers (offer_id, status);                   |
|                                                                       |
| \-- Serves the active-CO lookup:                                      |
|                                                                       |
| SELECT id, submitted_by, submitted_by_id, rate, status                |
|                                                                       |
| FROM offer_service.counter_offers                                     |
|                                                                       |
| WHERE offer_id = \$1 AND status = \'PENDING\'                         |
|                                                                       |
| LIMIT 1;                                                              |
|                                                                       |
| \-- Used by: CounterOffersService.findPendingForOffer()               |
|                                                                       |
| \-- Called on: every CO accept, decline, withdraw, edit action        |
|                                                                       |
| \-- Also serves supersede query (when client submits a new CO):       |
|                                                                       |
| SELECT id FROM offer_service.counter_offers                           |
|                                                                       |
| WHERE offer_id = \$1 AND status = \'PENDING\'                         |
|                                                                       |
| FOR UPDATE;                                                           |
|                                                                       |
| \-- Used by: CounterOffersService.create() to supersede existing      |
| PENDING CO                                                            |
+-----------------------------------------------------------------------+

**2.4 idx_co_expires --- Counter Offer Expiry Scheduler (Composite)**

Mirrors idx_offers_status_expires but for counter_offers. The same
expiry cron job also expires counter offers. When a counter offer
expires, the parent offer is restored to PENDING (unless the parent
independently expired). This index ensures the scheduler query is fast.

+-----------------------------------------------------------------------+
| CREATE INDEX IF NOT EXISTS idx_co_expires                             |
|                                                                       |
| ON offer_service.counter_offers (status, expires_at);                 |
|                                                                       |
| \-- Serves the CO expiry cron query:                                  |
|                                                                       |
| SELECT id, offer_id FROM offer_service.counter_offers                 |
|                                                                       |
| WHERE status = \'PENDING\'                                            |
|                                                                       |
| AND expires_at \<= NOW()                                              |
|                                                                       |
| FOR UPDATE SKIP LOCKED;                                               |
|                                                                       |
| \-- Used by: ExpiryProcessor (same cron job handles both offers and   |
| COs)                                                                  |
+-----------------------------------------------------------------------+

**2.5 uq_counter_offers_one_pending --- The Critical Partial Unique
Index**

This is the most important index in the entire schema. It is a PARTIAL
UNIQUE index that enforces the confirmed business rule: only ONE counter
offer can be PENDING for a given parent offer at any time. This is a
database-level constraint that cannot be bypassed by any application
code, even under concurrent load.

+-----------------------------------------------------------------------+
| What is a partial unique index?                                       |
|                                                                       |
| A regular unique index enforces uniqueness across ALL rows in the     |
| table.                                                                |
|                                                                       |
| A partial unique index enforces uniqueness only on rows matching a    |
| WHERE clause.                                                         |
|                                                                       |
| uq_counter_offers_one_pending says:                                   |
|                                                                       |
| \"offer_id must be unique among rows WHERE status = \'PENDING\'\"     |
|                                                                       |
| This means:                                                           |
|                                                                       |
| \- An offer can have at most ONE counter offer with status = PENDING  |
| at any time.                                                          |
|                                                                       |
| \- The same offer can have many counter offers with status =          |
| DECLINED, WITHDRAWN,                                                  |
|                                                                       |
| SUPERSEDED, EXPIRED, or ACCEPTED (these do not count toward the       |
| uniqueness check).                                                    |
|                                                                       |
| \- This is exactly the business rule: one active negotiation round at |
| a time.                                                               |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| This index is the database-level safety net for a critical business   |
| rule.                                                                 |
|                                                                       |
| The service layer also enforces this with the idx_co_offer_status     |
| query.                                                                |
|                                                                       |
| But the partial unique index catches race conditions that the service |
| layer cannot:                                                         |
|                                                                       |
| Two concurrent requests submitting a CO simultaneously would both     |
| pass the                                                              |
|                                                                       |
| service-layer check (both read 0 PENDING COs before either inserts).  |
|                                                                       |
| Only the database-level constraint guarantees that exactly one INSERT |
| succeeds.                                                             |
|                                                                       |
| If this index is missing, duplicate pending COs can be created under  |
| load.                                                                 |
|                                                                       |
| NEVER drop this index.                                                |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| \-- Created in OS-15 DDL:                                             |
|                                                                       |
| CREATE UNIQUE INDEX IF NOT EXISTS uq_counter_offers_one_pending       |
|                                                                       |
| ON offer_service.counter_offers (offer_id)                            |
|                                                                       |
| WHERE status = \'PENDING\';                                           |
|                                                                       |
| \-- What this does:                                                   |
|                                                                       |
| \-- PostgreSQL maintains a unique constraint on offer_id for all rows |
|                                                                       |
| \-- where status = \'PENDING\'. Any attempt to INSERT a second        |
| PENDING                                                               |
|                                                                       |
| \-- CO for the same offer_id will fail with a unique constraint       |
| violation.                                                            |
|                                                                       |
| \-- How CounterOffersService handles the constraint violation:        |
|                                                                       |
| \-- try {                                                             |
|                                                                       |
| \-- await this.coRepo.save(newCounterOffer);                          |
|                                                                       |
| \-- } catch (err) {                                                   |
|                                                                       |
| \-- if (err?.code === \'23505\') { // PostgreSQL unique violation     |
|                                                                       |
| \-- throw new CounterOfferAlreadyPendingException();                  |
|                                                                       |
| \-- }                                                                 |
|                                                                       |
| \-- throw err;                                                        |
|                                                                       |
| \-- }                                                                 |
|                                                                       |
| \-- Verify this index exists after running the DDL:                   |
|                                                                       |
| SELECT indexname, indexdef FROM pg_indexes                            |
|                                                                       |
| WHERE schemaname = \'offer_service\'                                  |
|                                                                       |
| AND indexname = \'uq_counter_offers_one_pending\';                    |
|                                                                       |
| \-- Expected output:                                                  |
|                                                                       |
| \-- uq_counter_offers_one_pending \| CREATE UNIQUE INDEX              |
| uq_counter_offers_one_pending                                         |
|                                                                       |
| \-- \| ON offer_service.counter_offers(offer_id)                      |
|                                                                       |
| \-- \| WHERE ((status)::text = \'PENDING\')                           |
|                                                                       |
| \-- Test the constraint manually:                                     |
|                                                                       |
| INSERT INTO offer_service.counter_offers                              |
|                                                                       |
| (offer_id, submitted_by, submitted_by_id, status, rate,               |
| currency_code,                                                        |
|                                                                       |
| duration_months, work_schedule, start_date, expires_at)               |
|                                                                       |
| VALUES (\'offer-uuid\', \'TALENT\', \'talent-uuid\', \'PENDING\', 85, |
| \'USD\',                                                              |
|                                                                       |
| 3, \'{\"type\":\"FULL_TIME\"}\'::jsonb, \'2099-01-01\', NOW() +       |
| INTERVAL \'14 days\');                                                |
|                                                                       |
| \-- Try to insert a SECOND PENDING CO for the same offer:             |
|                                                                       |
| INSERT INTO offer_service.counter_offers                              |
|                                                                       |
| (offer_id, submitted_by, submitted_by_id, status, rate,               |
| currency_code,                                                        |
|                                                                       |
| duration_months, work_schedule, start_date, expires_at)               |
|                                                                       |
| VALUES (\'offer-uuid\', \'CLIENT\', \'client-uuid\', \'PENDING\', 70, |
| \'USD\',                                                              |
|                                                                       |
| 3, \'{\"type\":\"FULL_TIME\"}\'::jsonb, \'2099-01-01\', NOW() +       |
| INTERVAL \'14 days\');                                                |
|                                                                       |
| \-- Expected: ERROR: duplicate key value violates unique constraint   |
|                                                                       |
| \-- \"uq_counter_offers_one_pending\"                                 |
|                                                                       |
| \-- A DECLINED CO for the same offer IS allowed (not in the WHERE     |
| clause):                                                              |
|                                                                       |
| UPDATE offer_service.counter_offers                                   |
|                                                                       |
| SET status = \'DECLINED\' WHERE offer_id = \'offer-uuid\' AND status  |
| = \'PENDING\';                                                        |
|                                                                       |
| \-- Now this INSERT will succeed (PENDING slot is free again):        |
|                                                                       |
| INSERT INTO offer_service.counter_offers (\...) VALUES (\...,         |
| \'PENDING\', \...);                                                   |
|                                                                       |
| \-- Succeeds: only one PENDING row for this offer_id                  |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Section 3 offer_history Table Indexes**                             |
|                                                                       |
| 2 indexes serving paginated history queries                           |
+-----------------------------------------------------------------------+

**3.1 idx_oh_offer_id --- History by Offer**

Simple B-tree index on offer_id. Used when loading all history events
for an offer. The paginated history endpoint (GET
/v1/offers/:id/history) fetches all events for a specific offer_id
ordered by created_at DESC.

+-----------------------------------------------------------------------+
| CREATE INDEX IF NOT EXISTS idx_oh_offer_id                            |
|                                                                       |
| ON offer_service.offer_history (offer_id);                            |
|                                                                       |
| \-- Serves:                                                           |
|                                                                       |
| SELECT id, event_type, actor, terms, created_at                       |
|                                                                       |
| FROM offer_service.offer_history                                      |
|                                                                       |
| WHERE offer_id = \$1                                                  |
|                                                                       |
| ORDER BY created_at DESC;                                             |
|                                                                       |
| \-- Used by: OfferHistoryService.findByOfferId()                      |
+-----------------------------------------------------------------------+

**3.2 idx_oh_offer_id_created --- Paginated History (Composite with
ordering)**

This composite index is specifically designed for cursor-based
pagination on the history endpoint. Including created_at in the index
allows PostgreSQL to serve the ORDER BY created_at DESC without a sort
operation --- the data comes out of the index already ordered. This is
critical for large history sets.

+-----------------------------------------------------------------------+
| Why (offer_id, created_at DESC) and not just (offer_id)?              |
|                                                                       |
| With only offer_id indexed: PostgreSQL uses idx_oh_offer_id to find   |
| rows,                                                                 |
|                                                                       |
| then performs a separate sort on the results.                         |
|                                                                       |
| With (offer_id, created_at DESC): PostgreSQL reads rows from the      |
| index in                                                              |
|                                                                       |
| the correct order, eliminating the sort entirely.                     |
|                                                                       |
| For an offer with 50 history events: the difference is negligible.    |
|                                                                       |
| For the system under load (many concurrent history requests): it adds |
| up.                                                                   |
|                                                                       |
| The cursor-based pagination works like this:                          |
|                                                                       |
| First page: WHERE offer_id = \$1 ORDER BY created_at DESC LIMIT 50    |
|                                                                       |
| Next page: WHERE offer_id = \$1 AND created_at \< \$cursor ORDER BY   |
| created_at DESC LIMIT 50                                              |
|                                                                       |
| The cursor is the created_at value of the last event on the previous  |
| page.                                                                 |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| CREATE INDEX IF NOT EXISTS idx_oh_offer_id_created                    |
|                                                                       |
| ON offer_service.offer_history (offer_id, created_at DESC);           |
|                                                                       |
| \-- First page (no cursor):                                           |
|                                                                       |
| SELECT id, event_type, actor, actor_id, terms, created_at             |
|                                                                       |
| FROM offer_service.offer_history                                      |
|                                                                       |
| WHERE offer_id = \$1                                                  |
|                                                                       |
| ORDER BY created_at DESC                                              |
|                                                                       |
| LIMIT 50;                                                             |
|                                                                       |
| \-- Subsequent pages (cursor = created_at of last event from previous |
| page):                                                                |
|                                                                       |
| SELECT id, event_type, actor, actor_id, terms, created_at             |
|                                                                       |
| FROM offer_service.offer_history                                      |
|                                                                       |
| WHERE offer_id = \$1                                                  |
|                                                                       |
| AND created_at \< \$2 \-- cursor                                      |
|                                                                       |
| ORDER BY created_at DESC                                              |
|                                                                       |
| LIMIT 50;                                                             |
|                                                                       |
| \-- Both queries use idx_oh_offer_id_created.                         |
|                                                                       |
| \-- No sort operation needed (data is already ordered by the index).  |
|                                                                       |
| \-- EXPLAIN ANALYZE for the first page:                               |
|                                                                       |
| EXPLAIN ANALYZE                                                       |
|                                                                       |
| SELECT id, event_type, actor, terms, created_at                       |
|                                                                       |
| FROM offer_service.offer_history                                      |
|                                                                       |
| WHERE offer_id = \'f47ac10b-58cc-4372-a567-0e02b2c3d479\'             |
|                                                                       |
| ORDER BY created_at DESC LIMIT 50;                                    |
|                                                                       |
| \-- Expected: Index Scan Backward using idx_oh_offer_id_created       |
|                                                                       |
| \-- Expected: no Sort node in the plan                                |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Section 4 outbox Table Indexes**                                    |
|                                                                       |
| 2 indexes --- one partial for the poller, one for aggregation         |
+-----------------------------------------------------------------------+

**4.1 idx_outbox_status_scheduled --- Poller Query (Partial Index)**

The outbox poller runs every few seconds to pick up PENDING events and
publish them to RabbitMQ. This partial index filters only PENDING and
PROCESSING rows, making the poller query sub-millisecond even when the
outbox table has many PUBLISHED or FAILED rows from historical activity.

+-----------------------------------------------------------------------+
| Why partial index (WHERE status IN (PENDING, PROCESSING))?            |
|                                                                       |
| Most rows in the outbox table are PUBLISHED (successfully processed). |
|                                                                       |
| A full index on (status, scheduled_at) would be large and include     |
| many                                                                  |
|                                                                       |
| PUBLISHED rows that the poller never needs to read.                   |
|                                                                       |
| The partial index includes ONLY actionable rows (PENDING or           |
| PROCESSING),                                                          |
|                                                                       |
| making it small and fast regardless of total table size.              |
|                                                                       |
| PUBLISHED rows are deleted after processing, so this stays lean.      |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| CREATE INDEX IF NOT EXISTS idx_outbox_status_scheduled                |
|                                                                       |
| ON offer_service.outbox (status, scheduled_at)                        |
|                                                                       |
| WHERE status IN (\'PENDING\', \'PROCESSING\');                        |
|                                                                       |
| \-- Serves the poller batch-claim query:                              |
|                                                                       |
| \-- The poller uses SELECT FOR UPDATE SKIP LOCKED to claim a batch    |
| atomically.                                                           |
|                                                                       |
| \-- SKIP LOCKED prevents multiple poller instances from picking the   |
| same row.                                                             |
|                                                                       |
| \-- This is critical for horizontal scaling where multiple service    |
| instances run.                                                        |
|                                                                       |
| UPDATE offer_service.outbox                                           |
|                                                                       |
| SET status = \'PROCESSING\'                                           |
|                                                                       |
| WHERE id IN (                                                         |
|                                                                       |
| SELECT id FROM offer_service.outbox                                   |
|                                                                       |
| WHERE status = \'PENDING\'                                            |
|                                                                       |
| AND scheduled_at \<= NOW()                                            |
|                                                                       |
| ORDER BY scheduled_at ASC                                             |
|                                                                       |
| LIMIT 10                                                              |
|                                                                       |
| FOR UPDATE SKIP LOCKED                                                |
|                                                                       |
| )                                                                     |
|                                                                       |
| RETURNING id, event_type, payload, routing_key, exchange;             |
|                                                                       |
| \-- After successful publish: delete the row                          |
|                                                                       |
| DELETE FROM offer_service.outbox WHERE id = \$1;                      |
|                                                                       |
| \-- On publish failure: increment retry_count, set scheduled_at for   |
| backoff                                                               |
|                                                                       |
| UPDATE offer_service.outbox                                           |
|                                                                       |
| SET retry_count = retry_count + 1,                                    |
|                                                                       |
| status = \'PENDING\',                                                 |
|                                                                       |
| last_error = \$2,                                                     |
|                                                                       |
| scheduled_at = NOW() + (INTERVAL \'1 minute\' \* POWER(2,             |
| retry_count))                                                         |
|                                                                       |
| WHERE id = \$1;                                                       |
|                                                                       |
| \-- Backoff: attempt 1 = +1min, 2 = +2min, 3 = +4min, 4 = +8min, max  |
| 10 attempts                                                           |
+-----------------------------------------------------------------------+

**4.2 idx_outbox_aggregate_id --- Aggregate Lookup**

Allows querying all outbox events for a specific offer. Used when
debugging --- \"show me all pending events for offer X\" --- and
potentially in future features that need to check whether a specific
event has been queued for an offer.

+-----------------------------------------------------------------------+
| CREATE INDEX IF NOT EXISTS idx_outbox_aggregate_id                    |
|                                                                       |
| ON offer_service.outbox (aggregate_id);                               |
|                                                                       |
| \-- Serves debugging queries:                                         |
|                                                                       |
| SELECT event_type, status, retry_count, scheduled_at                  |
|                                                                       |
| FROM offer_service.outbox                                             |
|                                                                       |
| WHERE aggregate_id = \$1                                              |
|                                                                       |
| ORDER BY created_at DESC;                                             |
|                                                                       |
| \-- Used by: debugging, runbook queries (OS-38), monitoring           |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Section 5 Critical Query Patterns**                                 |
|                                                                       |
| The 8 most important queries and their index usage                    |
+-----------------------------------------------------------------------+

This section maps every high-frequency service operation to the specific
query it generates and the index that serves it. Use EXPLAIN ANALYZE on
each query to confirm the expected plan is being used.

**Query 1 --- GET Offer by ID (OfferPartyGuard + findById)**

Runs on every authenticated offer request. OfferPartyGuard loads the
offer, then the controller calls findById() again. Two sequential
primary key lookups per request.

+-----------------------------------------------------------------------+
| \-- Query:                                                            |
|                                                                       |
| SELECT id, client_id, talent_id, status FROM offer_service.offers     |
| WHERE id = \$1;                                                       |
|                                                                       |
| \-- Index: pk_offers                                                  |
|                                                                       |
| \-- Plan: Index Scan using pk_offers on offers                        |
|                                                                       |
| \-- Cost: \< 0.2ms                                                    |
|                                                                       |
| \-- TypeORM equivalent in OfferPartyGuard:                            |
|                                                                       |
| const offer = await this.offerRepo.findOne({                          |
|                                                                       |
| where: { id: offerId },                                               |
|                                                                       |
| select: \[\'id\', \'clientId\', \'talentId\'\],                       |
|                                                                       |
| });                                                                   |
+-----------------------------------------------------------------------+

**Query 2 --- Active Offer Constraint Check (create / resend)**

Runs before every offer creation and resend. Must complete fast because
it is on the hot path of the most common write operation.

+-----------------------------------------------------------------------+
| \-- Query:                                                            |
|                                                                       |
| SELECT id FROM offer_service.offers                                   |
|                                                                       |
| WHERE client_id = \$1                                                 |
|                                                                       |
| AND talent_id = \$2                                                   |
|                                                                       |
| AND status IN (\'PENDING\', \'COUNTERED\')                            |
|                                                                       |
| LIMIT 1;                                                              |
|                                                                       |
| \-- Index: idx_offers_client_talent                                   |
|                                                                       |
| \-- Plan: Index Scan using idx_offers_client_talent                   |
|                                                                       |
| \-- Cost: \< 0.2ms                                                    |
|                                                                       |
| \-- TypeORM equivalent:                                               |
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
| });                                                                   |
+-----------------------------------------------------------------------+

**Query 3 --- Find Active Counter Offer for an Offer**

Runs before every counter offer action (accept, decline, withdraw,
edit). Finds the single PENDING CO for the parent offer.

+-----------------------------------------------------------------------+
| \-- Query:                                                            |
|                                                                       |
| SELECT id, submitted_by, submitted_by_id, status, rate                |
|                                                                       |
| FROM offer_service.counter_offers                                     |
|                                                                       |
| WHERE offer_id = \$1 AND status = \'PENDING\'                         |
|                                                                       |
| LIMIT 1;                                                              |
|                                                                       |
| \-- Index: idx_co_offer_status (composite on offer_id, status)        |
|                                                                       |
| \-- Plan: Index Scan using idx_co_offer_status                        |
|                                                                       |
| \-- Cost: \< 0.2ms                                                    |
|                                                                       |
| \-- TypeORM equivalent:                                               |
|                                                                       |
| const pendingCo = await this.coRepo.findOne({                         |
|                                                                       |
| where: { offerId, status: CounterOfferStatus.PENDING },               |
|                                                                       |
| });                                                                   |
+-----------------------------------------------------------------------+

**Query 4 --- Expiry Cron Job (offers)**

Runs every 60 seconds. Must be fast to prevent scheduler drift. The FOR
UPDATE SKIP LOCKED pattern prevents multiple service instances from
processing the same offer.

+-----------------------------------------------------------------------+
| \-- Query (batch claim):                                              |
|                                                                       |
| SELECT id FROM offer_service.offers                                   |
|                                                                       |
| WHERE status = \'PENDING\'                                            |
|                                                                       |
| AND expires_at \<= NOW()                                              |
|                                                                       |
| LIMIT 100                                                             |
|                                                                       |
| FOR UPDATE SKIP LOCKED;                                               |
|                                                                       |
| \-- Index: idx_offers_status_expires (composite on status,            |
| expires_at)                                                           |
|                                                                       |
| \-- Plan: Index Scan using idx_offers_status_expires                  |
|                                                                       |
| \-- Cost: \< 1ms for 100 rows, regardless of total table size         |
|                                                                       |
| \-- Then bulk update:                                                 |
|                                                                       |
| UPDATE offer_service.offers                                           |
|                                                                       |
| SET status = \'EXPIRED\', expired_at = NOW()                          |
|                                                                       |
| WHERE id = ANY(\$1::uuid\[\]);                                        |
|                                                                       |
| \-- Index: pk_offers (for each ID in the array)                       |
+-----------------------------------------------------------------------+

**Query 5 --- 48h Expiry Warning Cron**

Runs every 5 minutes. Finds offers expiring in the next 48 hours that
haven\'t had a warning sent yet.

+-----------------------------------------------------------------------+
| \-- Query:                                                            |
|                                                                       |
| SELECT id FROM offer_service.offers                                   |
|                                                                       |
| WHERE status = \'PENDING\'                                            |
|                                                                       |
| AND expires_at \<= NOW() + INTERVAL \'48 hours\'                      |
|                                                                       |
| AND warning_sent_at IS NULL                                           |
|                                                                       |
| FOR UPDATE SKIP LOCKED;                                               |
|                                                                       |
| \-- Index: idx_offers_status_expires                                  |
|                                                                       |
| \-- Note: warning_sent_at IS NULL is a filter applied AFTER the index |
| scan.                                                                 |
|                                                                       |
| \-- The index narrows to status=PENDING, expires_at \<= threshold.    |
|                                                                       |
| \-- warning_sent_at IS NULL filters the small remaining set.          |
+-----------------------------------------------------------------------+

**Query 6 --- Counter Offer Expiry Cron**

Mirrors Query 4 but for counter offers. When a CO expires, the parent
offer must be restored to PENDING --- the cron job handles both the CO
expiry and the parent offer restoration in a single transaction.

+-----------------------------------------------------------------------+
| \-- Query:                                                            |
|                                                                       |
| SELECT id, offer_id FROM offer_service.counter_offers                 |
|                                                                       |
| WHERE status = \'PENDING\'                                            |
|                                                                       |
| AND expires_at \<= NOW()                                              |
|                                                                       |
| LIMIT 100                                                             |
|                                                                       |
| FOR UPDATE SKIP LOCKED;                                               |
|                                                                       |
| \-- Index: idx_co_expires (composite on status, expires_at)           |
|                                                                       |
| \-- Plan: Index Scan using idx_co_expires                             |
|                                                                       |
| \-- After claiming, in a single transaction:                          |
|                                                                       |
| \-- 1. Set CO status = EXPIRED                                        |
|                                                                       |
| \-- 2. Check if parent offer is still PENDING or COUNTERED            |
|                                                                       |
| \-- 3. If COUNTERED: restore parent offer to PENDING                  |
|                                                                       |
| \-- 4. Write offer.counter_expired to outbox                          |
+-----------------------------------------------------------------------+

**Query 7 --- Offer History Pagination (first page)**

The history endpoint returns up to 50 events per page ordered by
creation time, newest first.

+-----------------------------------------------------------------------+
| \-- First page (no cursor):                                           |
|                                                                       |
| SELECT id, event_type, actor, actor_id, terms, created_at             |
|                                                                       |
| FROM offer_service.offer_history                                      |
|                                                                       |
| WHERE offer_id = \$1                                                  |
|                                                                       |
| ORDER BY created_at DESC                                              |
|                                                                       |
| LIMIT 50;                                                             |
|                                                                       |
| \-- Index: idx_oh_offer_id_created                                    |
|                                                                       |
| \-- Plan: Index Scan Backward using idx_oh_offer_id_created           |
|                                                                       |
| \-- Note: No Sort node --- the index provides the order               |
|                                                                       |
| \-- Subsequent pages (cursor = created_at of the last event on        |
| previous page):                                                       |
|                                                                       |
| SELECT id, event_type, actor, actor_id, terms, created_at             |
|                                                                       |
| FROM offer_service.offer_history                                      |
|                                                                       |
| WHERE offer_id = \$1                                                  |
|                                                                       |
| AND created_at \< \$2                                                 |
|                                                                       |
| ORDER BY created_at DESC                                              |
|                                                                       |
| LIMIT 50;                                                             |
|                                                                       |
| \-- Index: idx_oh_offer_id_created (range scan within the offer\'s    |
| events)                                                               |
+-----------------------------------------------------------------------+

**Query 8 --- Outbox Poller Batch Claim**

The outbox poller claims pending events using an UPDATE\...RETURNING
pattern. SKIP LOCKED ensures concurrent poller instances (multiple
service replicas) don\'t process the same event twice.

+-----------------------------------------------------------------------+
| \-- Claim a batch of up to 10 pending events:                         |
|                                                                       |
| UPDATE offer_service.outbox SET status = \'PROCESSING\'               |
|                                                                       |
| WHERE id IN (                                                         |
|                                                                       |
| SELECT id FROM offer_service.outbox                                   |
|                                                                       |
| WHERE status = \'PENDING\' AND scheduled_at \<= NOW()                 |
|                                                                       |
| ORDER BY scheduled_at ASC                                             |
|                                                                       |
| LIMIT 10                                                              |
|                                                                       |
| FOR UPDATE SKIP LOCKED                                                |
|                                                                       |
| )                                                                     |
|                                                                       |
| RETURNING id, event_type, payload, routing_key, exchange,             |
| retry_count;                                                          |
|                                                                       |
| \-- Index: idx_outbox_status_scheduled (partial, PENDING/PROCESSING   |
| only)                                                                 |
|                                                                       |
| \-- Plan: Index Scan using idx_outbox_status_scheduled                |
|                                                                       |
| \-- The partial index keeps this fast even if outbox has millions of  |
|                                                                       |
| \-- PUBLISHED rows (which are deleted after processing anyway).       |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Section 6 Running EXPLAIN ANALYZE --- Verification Guide**          |
|                                                                       |
| Confirm indexes are used in production queries                        |
+-----------------------------------------------------------------------+

EXPLAIN ANALYZE executes the query and shows the actual query plan. Run
this on every critical query in a development database with realistic
data volumes to confirm the planner uses the expected indexes.

+-----------------------------------------------------------------------+
| Never run EXPLAIN ANALYZE on production tables during traffic.        |
|                                                                       |
| EXPLAIN ANALYZE actually executes the query, including writes.        |
|                                                                       |
| Run in development with a copy of production schema and data.         |
|                                                                       |
| Use EXPLAIN (not ANALYZE) on production for read queries only.        |
+-----------------------------------------------------------------------+

**How to read EXPLAIN output**

+-----------------------------------------------------------------------+
| \-- Run EXPLAIN ANALYZE on any query:                                 |
|                                                                       |
| EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)                               |
|                                                                       |
| SELECT id FROM offer_service.offers                                   |
|                                                                       |
| WHERE client_id = \'uuid\' AND talent_id = \'uuid\'                   |
|                                                                       |
| AND status IN (\'PENDING\', \'COUNTERED\') LIMIT 1;                   |
|                                                                       |
| \-- Good output (index used):                                         |
|                                                                       |
| \-- Index Scan using idx_offers_client_talent on offers               |
|                                                                       |
| \-- (cost=0.43..2.65 rows=1 width=16)                                 |
|                                                                       |
| \-- (actual time=0.025..0.026 rows=0 loops=1)                         |
|                                                                       |
| \-- Index Cond: ((client_id = \...) AND (talent_id = \...))           |
|                                                                       |
| \-- Filter: (status = ANY (\...))                                     |
|                                                                       |
| \-- Planning Time: 0.3 ms                                             |
|                                                                       |
| \-- Execution Time: 0.04 ms                                           |
|                                                                       |
| \-- Bad output (no index, full scan):                                 |
|                                                                       |
| \-- Seq Scan on offers                                                |
|                                                                       |
| \-- (cost=0.00..4523.00 rows=1 width=16)                              |
|                                                                       |
| \-- (actual time=45.2..45.3 rows=0 loops=1)                           |
|                                                                       |
| \-- Filter: ((client_id = \...) AND \...)                             |
|                                                                       |
| \-- Rows Removed by Filter: 99999                                     |
|                                                                       |
| \-- Planning Time: 0.3 ms                                             |
|                                                                       |
| \-- Execution Time: 45.3 ms                                           |
|                                                                       |
| \-- Key terms:                                                        |
|                                                                       |
| \-- \"Index Scan using X\" --- index X is being used. GOOD.           |
|                                                                       |
| \-- \"Seq Scan\" --- full table scan. BAD for large tables.           |
|                                                                       |
| \-- \"Bitmap Heap Scan\" --- PostgreSQL combines multiple indexes.    |
| OK.                                                                   |
|                                                                       |
| \-- \"cost=X..Y\" --- estimated cost. Lower = faster.                 |
|                                                                       |
| \-- \"actual time=X..Y\" --- measured execution time in ms.           |
+-----------------------------------------------------------------------+

**Full verification script --- confirm all indexes are used**

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/database/verify-indexes.sql**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| \-- OS-16: Index verification script                                  |
|                                                                       |
| \-- Run this in psql against a development database with some test    |
| data.                                                                 |
|                                                                       |
| \-- Every query should show \"Index Scan\" or \"Index Only Scan\" --- |
| never \"Seq Scan\".                                                   |
|                                                                       |
| \\echo === 1. Check all indexes exist ===                             |
|                                                                       |
| SELECT indexname, tablename, indexdef                                 |
|                                                                       |
| FROM pg_indexes                                                       |
|                                                                       |
| WHERE schemaname = \'offer_service\'                                  |
|                                                                       |
| ORDER BY tablename, indexname;                                        |
|                                                                       |
| \-- Expected: 15 rows (6 on offers, 5 on counter_offers, 2 on         |
| offer_history, 2 on outbox + PKs)                                     |
|                                                                       |
| \\echo === 2. Confirm idx_offers_client_talent is used ===            |
|                                                                       |
| EXPLAIN SELECT id FROM offer_service.offers                           |
|                                                                       |
| WHERE client_id = \'00000000-0000-0000-0000-000000000001\'            |
|                                                                       |
| AND talent_id = \'00000000-0000-0000-0000-000000000002\'              |
|                                                                       |
| AND status IN (\'PENDING\', \'COUNTERED\') LIMIT 1;                   |
|                                                                       |
| \\echo === 3. Confirm idx_offers_status_expires is used ===           |
|                                                                       |
| EXPLAIN SELECT id FROM offer_service.offers                           |
|                                                                       |
| WHERE status = \'PENDING\' AND expires_at \<= NOW();                  |
|                                                                       |
| \\echo === 4. Confirm idx_co_offer_status is used ===                 |
|                                                                       |
| EXPLAIN SELECT id FROM offer_service.counter_offers                   |
|                                                                       |
| WHERE offer_id = \'00000000-0000-0000-0000-000000000001\'             |
|                                                                       |
| AND status = \'PENDING\' LIMIT 1;                                     |
|                                                                       |
| \\echo === 5. Confirm partial unique index exists ===                 |
|                                                                       |
| SELECT indexname, indexdef FROM pg_indexes                            |
|                                                                       |
| WHERE schemaname = \'offer_service\'                                  |
|                                                                       |
| AND indexname = \'uq_counter_offers_one_pending\';                    |
|                                                                       |
| \-- Must show: WHERE ((status)::text = \'PENDING\')                   |
|                                                                       |
| \\echo === 6. Confirm idx_oh_offer_id_created eliminates sort ===     |
|                                                                       |
| EXPLAIN SELECT id, event_type, created_at                             |
|                                                                       |
| FROM offer_service.offer_history                                      |
|                                                                       |
| WHERE offer_id = \'00000000-0000-0000-0000-000000000001\'             |
|                                                                       |
| ORDER BY created_at DESC LIMIT 50;                                    |
|                                                                       |
| \-- Should NOT have a \"Sort\" node in the plan                       |
|                                                                       |
| \\echo === 7. Confirm outbox partial index is used ===                |
|                                                                       |
| EXPLAIN SELECT id FROM offer_service.outbox                           |
|                                                                       |
| WHERE status = \'PENDING\' AND scheduled_at \<= NOW()                 |
|                                                                       |
| ORDER BY scheduled_at ASC LIMIT 10;                                   |
|                                                                       |
| \\echo === 8. Confirm partial unique index blocks duplicates ===      |
|                                                                       |
| \-- (Only run if you have test data. Creates then cleans up a test    |
| row.)                                                                 |
|                                                                       |
| \-- INSERT \... first PENDING CO for a test offer                     |
|                                                                       |
| \-- INSERT \... second PENDING CO for the same offer                  |
|                                                                       |
| \-- Second INSERT must fail with: duplicate key value violates unique |
| constraint                                                            |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Section 7 Index Maintenance & Monitoring**                          |
|                                                                       |
| Keeping indexes healthy in production                                 |
+-----------------------------------------------------------------------+

**Index bloat and VACUUM**

PostgreSQL uses MVCC, which means deleted rows are not immediately
removed from index pages. Over time, indexes accumulate dead tuples
(bloat). The outbox table is particularly susceptible because rows are
frequently deleted after publish. Regular autovacuum handles this, but
for the outbox table, monitor bloat proactively.

+-----------------------------------------------------------------------+
| \-- Check index bloat (run periodically, not on every query):         |
|                                                                       |
| SELECT                                                                |
|                                                                       |
| relname AS table_name,                                                |
|                                                                       |
| indexrelname AS index_name,                                           |
|                                                                       |
| pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,           |
|                                                                       |
| idx_scan AS index_scans                                               |
|                                                                       |
| FROM pg_stat_user_indexes                                             |
|                                                                       |
| WHERE schemaname = \'offer_service\'                                  |
|                                                                       |
| ORDER BY pg_relation_size(indexrelid) DESC;                           |
|                                                                       |
| \-- Check if autovacuum is keeping up with the outbox table:          |
|                                                                       |
| SELECT relname, n_dead_tup, n_live_tup, last_autovacuum               |
|                                                                       |
| FROM pg_stat_user_tables                                              |
|                                                                       |
| WHERE schemaname = \'offer_service\'                                  |
|                                                                       |
| ORDER BY n_dead_tup DESC;                                             |
|                                                                       |
| \-- If n_dead_tup \> 10% of n_live_tup on outbox: increase autovacuum |
| frequency.                                                            |
|                                                                       |
| \-- Manual VACUUM if needed (does not lock the table):                |
|                                                                       |
| VACUUM ANALYZE offer_service.outbox;                                  |
|                                                                       |
| VACUUM ANALYZE offer_service.offers;                                  |
+-----------------------------------------------------------------------+

**Index usage statistics**

PostgreSQL tracks how many times each index has been used since the last
stats reset. An index with 0 scans may be unused and a candidate for
removal (but always check thoroughly before dropping any index).

+-----------------------------------------------------------------------+
| \-- Check index usage since last stats reset:                         |
|                                                                       |
| SELECT                                                                |
|                                                                       |
| indexrelname AS index_name,                                           |
|                                                                       |
| idx_scan AS times_used,                                               |
|                                                                       |
| idx_tup_read AS rows_read                                             |
|                                                                       |
| FROM pg_stat_user_indexes                                             |
|                                                                       |
| WHERE schemaname = \'offer_service\'                                  |
|                                                                       |
| ORDER BY idx_scan DESC;                                               |
|                                                                       |
| \-- Check when stats were last reset:                                 |
|                                                                       |
| SELECT stats_reset FROM pg_stat_bgwriter;                             |
|                                                                       |
| \-- An index with idx_scan = 0 after several weeks of normal traffic  |
|                                                                       |
| \-- is likely unused. Investigate before dropping.                    |
|                                                                       |
| \-- Reset stats (for fresh measurement):                              |
|                                                                       |
| SELECT pg_stat_reset();                                               |
|                                                                       |
| \-- Wait 24-48 hours of normal traffic before interpreting results.   |
+-----------------------------------------------------------------------+

**When to add new indexes**

Add a new index when: a service method runs a query that causes a
sequential scan on a large table, or when a new query pattern is
introduced (e.g. a new endpoint or scheduler job). Always profile first
with EXPLAIN ANALYZE before adding.

+-----------------------------------------------------------------------+
| \-- Find slow queries in PostgreSQL logs:                             |
|                                                                       |
| \-- Set log_min_duration_statement = 100 in postgresql.conf           |
|                                                                       |
| \-- Queries taking \> 100ms will be logged.                           |
|                                                                       |
| \-- Check pg_stat_statements for top queries by total time:           |
|                                                                       |
| SELECT query, calls, total_exec_time, mean_exec_time                  |
|                                                                       |
| FROM pg_stat_statements                                               |
|                                                                       |
| WHERE query LIKE \'%offer_service%\'                                  |
|                                                                       |
| ORDER BY total_exec_time DESC                                         |
|                                                                       |
| LIMIT 10;                                                             |
|                                                                       |
| \-- Requires pg_stat_statements extension to be enabled.              |
|                                                                       |
| \-- Create a new index WITHOUT blocking production traffic:           |
|                                                                       |
| \-- Use CREATE INDEX CONCURRENTLY (not available in a transaction)    |
|                                                                       |
| CREATE INDEX CONCURRENTLY idx_offers_new_pattern                      |
|                                                                       |
| ON offer_service.offers (new_column);                                 |
|                                                                       |
| \-- CONCURRENTLY takes longer but does not lock the table.            |
|                                                                       |
| \-- Never use CREATE INDEX (without CONCURRENTLY) on a live           |
| production table.                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| Do NOT add indexes speculatively.                                     |
|                                                                       |
| Every index has a write overhead: INSERT and UPDATE must maintain all |
| indexes.                                                              |
|                                                                       |
| Adding 5 speculative indexes on the offers table increases write cost |
| by \~40%.                                                             |
|                                                                       |
| Only add an index when you have a proven slow query that it will fix. |
|                                                                       |
| Measure before and after with EXPLAIN ANALYZE.                        |
|                                                                       |
| Do NOT drop indexes without checking all query patterns.              |
|                                                                       |
| An index with low idx_scan might be used by an infrequent but         |
| critical query                                                        |
|                                                                       |
| (e.g. the uq_counter_offers_one_pending partial unique index has low  |
| scan count                                                            |
|                                                                       |
| because it is only consulted on INSERT, not on SELECT --- but it is   |
| essential).                                                           |
+-----------------------------------------------------------------------+
