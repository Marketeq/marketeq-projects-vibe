# G1 marketplace discovery gate - scope and Algolia decision record

Status: **ACCEPTED - the indexed `gate_open` filter is implemented (Chris, 2026-10-14).** This supersedes the
2026-10-13 conclusion that Algolia was out of scope for G1; that conclusion no longer applies.

G1 covers every marketplace talent discovery path: the PostgreSQL-backed paths (`GET /talent/users`,
`GET /public/talent`, `POST /public/talent/recommendations`, the search-service Postgres fallback) **and** the Algolia
talent index served by search-service.

## Requirements (Chris, 2026-10-14)

1. Unverified talent never appear in marketplace talent search or browse results.
2. A user can browse and search regardless of their own verification status (the viewer is never gated).
3. Direct talent profile URLs stay accessible (`GET /public/talent/:username` is deliberately not gated).
4. Nothing discloses why a talent is unavailable. Any disabled hire action uses the neutral wording
   **"This freelancer isn’t available to hire right now"** (the offer-service `TALENT_NOT_HIREABLE` response now
   carries exactly this text; it contains no verification vocabulary).
5. Search totals, pages, category counts and facet counts include only visible talent.

`gate_open` is owned by identity-verification-service (`gate_open = is_verified OR in_grace`, 30-day grace). It is read
through the batch RPC `identity_verification.gate_check_batch` on the Postgres paths and **mirrored onto the Algolia
records as `gate_open`** for the indexed path. Algolia is a derived copy; identity-verification-service and its
database remain authoritative, and no verification outcome depends on Algolia being available.

## Design

### Query side (search-service `AlgoliaClient`)
* Every query on the `talent` index **and its replicas** (`talent_*`, the sort orders) goes through one choke point.
  All other indices are untouched.
* **Secured API key.** The backend generates a secured key (`generateSecuredApiKey`, a local HMAC) from a
  **search-only parent key** (`ALGOLIA_SEARCH_API_KEY`) with `filters: gate_open:true`,
  `restrictIndices: [talent, talent_*]` and a one-hour `validUntil` (renewed 10 minutes early). Algolia ANDs the
  embedded filter into every query made with that key, so it cannot be removed or overridden by anything a request
  contains. The frontend never talks to Algolia and never receives any Algolia key; the admin/write key is never used
  for a talent query.
* **Explicit filter as well.** `gate_open:true AND (<caller filters>)` is also set on the query, with the gate as the
  outer AND, so an injected `OR` in a sidebar value cannot widen it. `gate_open` is configured as
  `filterOnly(gate_open)` in the index settings (applied by search-service at boot, forwarded to replicas); it is never a
  readable facet.
* Because Algolia filters **before** it ranks, paginates and counts, `nbHits`, `nbPages`, every page and every facet
  count (sidebar facets, category values, numeric buckets) are computed over visible talent only. No post-filtering,
  no scan ceiling.
* **Fail closed.** If `ALGOLIA_SEARCH_API_KEY` is missing, equals the write/admin key, or the secured key cannot be
  created, the talent query throws `TalentGateUnavailableError`. It never falls back to the unrestricted key or an
  unfiltered query. search-service then serves the request from the **already-gated PostgreSQL path**, so users still
  browse (verified talent only) while the misconfiguration is logged on every request.
* A record **without** `gate_open:true` (never synced, or not yet backfilled) does not match and stays hidden.

### Write side
* **algolia-service** applies every talent change as a **partial update** (`partialUpdateObject(s)`); a verification
  change writes `gate_open` / `gate_updated_at` and nothing else, and never deletes or recreates a record. Profile syncs
  (`talent.updated`) are now partial updates too, because a full replace would silently drop `gate_open`. A generic
  `algolia.sync` / REST caller cannot write `gate_open`, `gate_updated_at` or `account_id`.
* Each talent record carries `account_id` (the platform account identity keys on), so a gate change finds its record
  without a CMS lookup. user-service adds `accountId` and the current decision (`gateOpen`, `gateCheckedAt`) to the
  `talent.updated` events it already emits; when identity cannot answer it sends no decision and the record keeps its
  existing flag (hidden if it has none). Older decisions never overwrite newer ones (per-account decision timestamps).
* **identity-verification-service** `GateVisibilitySweepJob` publishes `identity.gate_changed` (`{userId, gateOpen,
  occurredAt}` - no status, reason or vendor detail) whenever an account's decision differs from the last one sent. It
  re-evaluates every profile whose row changed (all write paths bump `updated_at`: webhook approval, reconciliation,
  location confirmation, travel mode, duplicate-document block, status auto-clear, ...) with the same
  `computeGateState` that answers the RPC gate check. A failed publish is retried on the next sweep.
* **Grace expiry** has no write: each sweep also finds grace windows that have just closed (`expired_at + 30 days`) and
  arms a timer for the **next** closing instant, so visibility closes at the exact expiry time, with the 30-second
  interval sweep as the safety net.
* **Retry / reconciliation.** algolia-service keeps the newest unapplied decision per account, retries with exponential
  backoff (5 s doubling, capped at 2 min) until Algolia accepts it, and drops stale or out-of-order events.
  user-service `TalentProfileSyncService.reindexGate()` is the **repeatable backfill and reconciler**: it asks identity
  for the decision of every profile's account (batches of 100), and algolia-service applies it as a partial batch that
  creates nothing. It runs ~1 minute after boot and then hourly (`TALENT_GATE_RECONCILE_INTERVAL_MS`, `0` disables the
  schedule), and can be triggered by an operator with the RabbitMQ message `talent-profile.reindex_gate`. Run it once
  after rollout: until a record has been backfilled it stays hidden.

### Monitoring
algolia-service tracks pending (failed) updates, their age, and event-to-index lag, exposes them at
`GET /algolia/gate-sync/health` (JWT-guarded), and logs `[gate-sync-alert]` at error level while either exceeds the
threshold. **Engineering assumption:** the repository has no standard for index-propagation monitoring, so the alert
threshold is a configurable **five minutes** (`ALGOLIA_GATE_SYNC_ALERT_THRESHOLD_MS`, default `300000`).

## Configuration added (not yet in the frozen env templates)
The six env templates are frozen (DevOps SOP section 5), so these are **not** added to them here; adding them needs the
SOP's four-point confirmation.

| Variable | Service | Purpose |
|---|---|---|
| `ALGOLIA_SEARCH_API_KEY` | search-service | **Required.** Search-only parent for the secured key. Must differ from the write/admin key. Without it talent search is served from PostgreSQL. |
| `ALGOLIA_GATE_SYNC_ALERT_THRESHOLD_MS` | algolia-service | Propagation alert threshold (default 300000). |
| `ALGOLIA_GATE_SYNC_RETRY_INTERVAL_MS` | algolia-service | Retry timer (default 15000). |
| `GATE_INDEX_SWEEP_INTERVAL_MS` / `GATE_INDEX_BOOT_LOOKBACK_MS` / `GATE_INDEX_SYNC_DISABLED` | identity-verification-service | Sweep cadence (30 s), restart lookback (15 min), kill switch. |
| `TALENT_GATE_RECONCILE_INTERVAL_MS` | user-service | Reconcile cadence (default 3600000; `0` = off). |

## Known boundaries and consequences
* **Stale `true`** (event lag or a lost event): a talent whose gate has just closed can remain visible until the update
  lands - bounded by the sweep interval plus delivery, normally seconds, alerted past five minutes, healed by the hourly
  reconcile. **Stale `false`**: an eligible talent is hidden until the next event/reconcile (fail-closed).
* Algolia's own browse window (`paginationLimitedTo`, default 1,000) now applies only to *visible* talent.
* The identity sweep's watermark is in memory: changes made while the service is down for more than the 15-minute
  lookback are repaired by the hourly reconcile rather than by the sweep.
* A talent profile with no platform account (`sourceId` null) can never be backfilled, so it stays hidden - the same
  rule the PostgreSQL paths apply.
* `browseObjects` remains rejected for search (index order, not relevance order).

## Live validation still required (no Algolia credentials in the test environment)
Automated tests use an in-memory engine that mimics Algolia's secured-key and filter semantics. These must still be
checked against a real Algolia app before release: (1) a secured key generated from the search-only key is accepted and
actually restricts `talent`/`talent_*`; (2) `filterOnly(gate_open)` and `filterOnly(account_id)` are present on `talent`
and every replica after search-service boots; (3) `partialUpdateObjects` with `createIfNotExists:false` leaves other
attributes intact and skips unknown objectIDs; (4) a run of `reindexGate` against the real index, then `nbHits` equals the
number of open talent; (5) a verification loss and a grace expiry disappear from search within the propagation target.

## Earlier decision (superseded)
On 2026-10-13 Chris scoped G1 to the PostgreSQL paths and recorded Algolia as out of scope; the indexed `gate_open`
proposal, the incomplete-results alternative ("accept results beyond the 1,000-hit window") and the `browseObjects`
rejection were recorded as future options. **On 2026-10-14 Chris chose the indexed filter; it is implemented as above and
the "out of scope" conclusion is withdrawn.**

## Recorded QA disclosures (2026-10-12 isolated live QA)
* QA cleanup used a broad `pkill -f dist/apps/<service>/main.js`, which also stopped the developer's normal PM2 services
  (user-service, api-gateway, search-service, identity-verification-service); PM2 respawned them and all were healthy
  afterwards. No normal data changed (all 212 tables identical before/after).
* On respawn, user-service re-published sync events: `cms_user_events_queue` on the normal `/` vhost went from 44 to 88
  messages. That queue was not purged or modified. It also shows a pre-existing redelivery loop.
* A fault-injection responder briefly attached to the normal vhost's `identity_verification_rpc_queue` (0 consumers
  before and after; it handled no messages).

## PostgreSQL discovery paths: the gate is applied inside the query
Review finding: the PostgreSQL talent paths loaded talent and asked identity-verification-service about them
page by page (`collectVisible`, one batch RPC per 100-500 rows), so a request could walk the whole talent table and
make an RPC per chunk - the cost grew with the table, not the page.

The gate is now a **semi-join inside the SQL**, so it is evaluated before the COUNT, before ORDER BY/LIMIT/OFFSET
and before anything is hydrated:

* **Last-known state, kept locally.** `user_service.talent_gate_state` (`userId` PK, `gateOpen`, `occurredAt`,
  `receivedAt`; migration `1799500000000-CreateTalentGateState`, additive, no foreign key). "No row" means the state was
  never received, which is hidden - the same rule as before.
* **Fed by the G1 event, plus a reconcile.** identity-verification-service publishes the same `identity.gate_changed`
  event to a fourth durable queue, `user_service_gate_queue`; user-service consumes it with manual ack after the write,
  newer-decision-wins (`TalentGateStateConsumer`). `TalentProfileSyncService.reindexGate` (the existing boot + hourly
  reconcile and operator message) also writes the decisions it already fetches, and now also reconciles every talent
  user in id-keyset batches of 100 (`reconcileUserGateState`) - background work, never on a request path. Until a
  talent's state has arrived they stay hidden (fail closed), so run the reconcile once after rollout
  (`TALENT_GATE_RECONCILE_INTERVAL_MS=0` disables the schedule; the operator message still works).
* **Paths changed.** `GET /public/talent` (one COUNT + one page, public columns only), `GET /talent/users` (one
  bounded read, then hydration of only the visible ids), `POST /public/talent/recommendations` (the newest 80 *visible*
  candidates in one read), and search-service's PostgreSQL fallback (COUNT + `LIMIT/OFFSET` page; the job-title facet
  counts; the category-derivation candidate probe). The account is the same one the index is keyed on (`source_id`,
  else the profile uuid). None of these calls identity-verification-service any more.
* **Indexes.** The primary key serves the `uuid = uuid` semi-join (users). A partial expression index on
  `("userId"::text) WHERE "gateOpen"` serves the text comparison (talent profiles, search-service) and holds only open
  accounts. Existing ordering is untouched (`updatedAt DESC, id ASC` / `onboardedAt DESC, id ASC` / the fallback's
  ranking `ORDER BY`).
* **Fail closed, narrowly.** If the state table cannot be read (migration not run), public discovery lists nobody -
  never everybody - and logs it. Any other database error is not swallowed. Owner and administrative views do not use
  these paths, and direct profile URLs stay open as before.
* **Measured on a local PostgreSQL 16 database** (200,000 talent profiles, 250,000 talent users, 204,000 gate rows of which
  92,000 open, the first 20,000 accounts hidden - the "hidden first" worst case), `EXPLAIN (ANALYZE, BUFFERS)` of the SQL the
  production code actually issues:
  * Without ordered indexes the page queries were `Seq Scan` of the talent table + `HashAggregate` of every open gate row +
    `Sort` (65-75 ms, temp-file spills) - cost proportional to the table, the problem this change set out to remove.
  * Migration `1799600000000-AddTalentDiscoveryIndexes` adds two partial ordered indexes
    (`talent_profiles ("updatedAt" DESC, id) WHERE status = 'active'`, `users ("onboardedAt" DESC, id) WHERE "userType" = 'talent'`).
    The page queries then run as an ordered index scan with a nested-loop semi-join into the gate table's primary key (users) or
    its partial index (profiles, search), stopping at the LIMIT: 13-18 ms, no temp files, work proportional to the hidden
    accounts ahead of the page, not to the table.
  * The exact `COUNT` (and any page whose OFFSET reaches deep into the list, e.g. page 500) is still a set-based hash
    semi-join over the talent and open-gate rows (35-80 ms at this size, and linear in the table). That is inherent to an exact
    total; it runs inside PostgreSQL and loads no rows into the service. If it becomes a cost, the options are a short-lived
    cache of the total, a maintained counter, or `work_mem` large enough to avoid the temp spill - a product/ops decision.
  * `cms.talent_profiles` (Payload, cms-service) - the search fallback's talent tables. Existing indexes: `pkey`, `created_at`
    (ascending), and unique `source_id`, `username`, `uuid`. The fallback orders by `created_at DESC NULLS LAST, id ASC`,
    which the ascending `created_at` index cannot deliver. dev-main's single query (rows + `COUNT(*) OVER ()`) never used an
    index at all: it scanned every matching profile and sorted them, spilling to disk (87 ms first page, 538 ms at offset
    100,000, on 250,000 profiles). The gate change splits it into a COUNT and a page query, so without a matching index the
    first page cost 51 + 92 ms = 143 ms (a second table scan, a hash of the open gate rows, a spilling top-N sort). With
    cms-service migration `20261016_000000_add_talent_profiles_active_created_at_index`
    (`(created_at DESC NULLS LAST, id ASC) WHERE status = 'active'`) the page is an ordered index scan with a nested-loop
    semi-join into the gate table's partial index, no sort, no temp file: 28-30 ms (COUNT stays ~50 ms), i.e. 80 ms for the
    first page against dev-main's 87 ms, and 50 ms against 538 ms at a deep offset. Run it with `npx payload migrate`
    (cms-service does not run migrations on boot).
* Migration order in user-service: `1799500000000-CreateTalentGateState`, then `1799600000000-AddTalentDiscoveryIndexes`.
