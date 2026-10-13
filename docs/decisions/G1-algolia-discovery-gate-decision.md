# G1 marketplace discovery gate - scope and Algolia decision record

Status: **DECIDED - Algolia is intentionally out of scope for G1 (per Chris).** G1 is closed on the
PostgreSQL-backed talent discovery paths only. The indexed `gate_open` design below is preserved as a *future
scaling proposal*; it is not accepted, scheduled or implemented.

Scope of G1: `GET /talent/users`, `GET /public/talent`, `POST /public/talent/recommendations` (user-service) and the
Postgres search fallback for `category=talent` / the talent section of `category=all` (search-service).
**No Algolia code, index, event, configuration, backfill or test is changed by G1.**

## Context

G1 requires that a talent whose `gate_open` is false (unverified, grace lapsed, no verification profile) is
silently excluded from marketplace search, browse and recommendations; verified and 30-day-grace talent stay
visible; the viewer is never gated. `gate_open` is owned by identity-verification-service and is read through
the batch RPC `identity_verification.gate_check_batch`; a failed, timed-out or malformed reply fails closed.

* **Postgres-backed paths (in scope, done)** have **no scan ceiling**: they scan in pages until the requested
  number of visible talent is found or the data is exhausted (`/talent/users`, recommendations), or scan every
  matching id so the visible total and pagination are exact (`/public/talent`, search fallback). Hidden profiles
  are read only as ids; full rows are loaded for visible talent only and never sent to the recommendation ranker.
* **Algolia path (out of scope, unchanged)**: when Algolia is configured, search-service talent results are served
  by Algolia exactly as before G1, i.e. **not gated by G1**. Algolia's own browse window
  (`paginationLimitedTo`, default 1,000) is likewise untouched.

## Known boundary

While Algolia serves talent search, closed-gate talent can still appear in those Algolia results. Closing that
gap is the future work below and needs a separate decision.

## Future options (not part of G1)

### 1. Indexed `gate_open` field (future scaling proposal - not accepted)
Add `gate_open` (boolean, `filterOnly`) to each talent index record so Algolia filters **before** ranking and
pagination (`filters: gate_open:true`). Then `nbHits`, `nbPages` and every page are exact for the index state,
at any size, within Algolia's own 1,000-hit browse limit applying only to *visible* talent.

Required work:
* identity-verification-service emits a gate-changed event whenever `gate_open` can change (verification
  approved/failed/expired, location verified/unverified, travel-mode changes) carrying `userId` and
  `gate_open`.
* A **grace-expiry sweep** (at least daily; hourly preferred): `gate_open` flips to false 30 days after
  `expiredAt` with no event, so a scheduled job must publish/refresh those flips.
* Consumer (algolia-service `talent.updated` path or a dedicated handler) writes `gate_open` to the talent
  record via partial update; `attributesForFaceting` gains `filterOnly(gate_open)`; a one-off backfill sets it
  for existing records.
* Mapping: records are keyed by CMS profile uuid; the event is keyed by account id (`cms.talent_profiles.source_id`).
  Index the account id too (also removes the per-request CMS lookup).
* **The final batch gate stays authoritative** on the returned page (cheap: at most one page of ids). The index
  flag is an optimisation, never the source of truth.

Failure semantics: stale `true` (event lag) -> the talent is filtered out by the final gate, so the page can be
short by those entries and the total slightly over-counted until reconciled; stale `false` -> an eligible talent
is hidden until the next event/sweep (fail-closed). Both are bounded by event latency and the sweep interval and
must be monitored (count of index records whose flag disagrees with identity).

### 2. Accept incomplete results beyond the 1,000-hit window
Keep the current behaviour. Acceptable only if the product accepts that visible talent ranked beyond the first
1,000 matches (or behind a run of hidden talent filling the window) are not returned, and that `nbHits` is a
lower bound. Requirements if chosen: document the limitation, **do not label the total exact**, log/metric a
"gate window saturated" signal when 1,000 ids are scanned and Algolia reports more hits, and revisit when the
talent index approaches the window size.

### Rejected: `browseObjects`
Cursor-based browse iterates an entire index but returns records in index order, not relevance order, so it
cannot replace ranked search. It is not used for search. (It could at most be used for backfills.)

## Data points from isolated QA (2026-10-12)
* Batch identity check, real service: 2,300 accounts in 23 requests took 54 ms in parallel, 48 ms sequential
  (about 2 ms per 100 accounts). Identity is not the bottleneck; the ceilings were.
* With 2,100 hidden talent ranked ahead of 209 visible ones, the old 2,000-row and 1,000-hit ceilings returned
  zero results and total 0 on every path. Postgres paths are now exact. (The Algolia path was measured with a
  prototype that is no longer part of G1.)

## Decision
Chris confirmed (2026-10-13): **Algolia is out of scope for G1.** G1 ships on the PostgreSQL-backed paths only;
Options 1 and 2 above remain unimplemented future proposals and neither is accepted. The earlier Algolia-path
G1 implementation (two-phase gated search) was removed from G1 before commit.

## Recorded QA disclosures (2026-10-12 isolated live QA)
* QA cleanup used a broad `pkill -f dist/apps/<service>/main.js`, which also stopped the developer's normal
  PM2 services (user-service, api-gateway, search-service, identity-verification-service); PM2 respawned them
  and all were healthy afterwards. No normal data changed (all 212 tables identical before/after).
* On respawn, user-service re-published sync events: `cms_user_events_queue` on the normal `/` vhost went from
  44 to 88 messages. That queue was not purged or modified. It also shows a pre-existing redelivery loop.
* A fault-injection responder briefly attached to the normal vhost's `identity_verification_rpc_queue`
  (0 consumers before and after; it handled no messages).
