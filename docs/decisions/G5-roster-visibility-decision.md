# G5 client-facing roster and listing-owner visibility - decision record

Status: **ACCEPTED (Christopher, final G5 decisions).** Builds on G1's `identity.gate_changed` propagation
(`docs/decisions/G1-algolia-discovery-gate-decision.md`).

## The rule
On a client-facing surface, a **member, assignee, owner or listing is shown only when its linked platform account has a
KNOWN OPEN verification gate** (`gate_open`, i.e. verified or inside the 30-day grace window).

| State of the linked account | Shown to clients? |
|---|---|
| gate known open (verified, or in grace) | yes |
| gate known closed | **no - omitted entirely** |
| state **never received** | **no - omitted** (and queued to be learned) |
| email-only record, no platform account | **no - omitted** |

This is a **display filter only**. Nothing is removed from a team or project, no membership record is modified, no
listing is deleted, unpublished or cancelled, and a listing's stored published status never changes. Visibility
returns automatically when the gate opens and the new state arrives.

* **Listing owners:** an unverified owner has **no public owner exemption**. Their listing is withheld from marketplace
  **discovery** (lists, rails, search, homepage tiles) while their gate is closed, and returns when it opens. **Direct
  detail** pages keep working (a hidden owner's identity is simply not shown on them).
* **Owner / internal views are unaffected** and keep showing every record. If the owner's view says anything about
  visibility it is only the neutral **"Not shown to clients"** (`notShownToClients: [{ userId, label }]`) - never a reason,
  and never anything about another member's verification.
* **No request parameter can change the view.** The viewer is derived server-side from the verified bearer token
  (`viewerIdFromRequest` / `@ViewerId()`); a missing, malformed or forged token is an anonymous viewer, never an error and
  never elevated. There is no `includeUnverified` (or similar) parameter, and nothing in the query string, body or other
  headers is read.
* Hidden members are **completely absent** from public/client responses - not returned with a visibility flag - in `team`,
  the raw `teamMemberIds`, the owner fields (`userId`, `ownerId`, `createdBy`) and avatar clusters.

## Availability and propagation (no synchronous identity calls)
* **Last-known state, kept locally.** listings-service owns a table `listings.account_gate_state`
  (`userId` PK, `gateOpen`, `occurredAt`, `receivedAt`; migration `1799000000000-CreateAccountGateState`, no schema
  synchronisation). It deliberately has no foreign key to any listing, team or member row. "No row" means "never received".
* **Fed by the G1 event.** identity-verification-service's `GateVisibilitySweepJob` publishes `identity.gate_changed`
  (`{ userId, gateOpen, occurredAt }`, unchanged format) for every write path and for **grace-period expiry at its exact
  instant**. The publisher now sends the identical event to a second durable queue, `listings_service_gate_queue`. listings-service
  consumes it with the repository's durable-consumer pattern (`GateStateConsumer`: manual ack **after** the write, requeue on
  failure, drop-and-ack for a malformed message). An older or redelivered decision never overwrites a newer one
  (`INSERT ... ON CONFLICT ... WHERE EXCLUDED."occurredAt" >= existing`).
* **Reads are one local query per response** (`RosterGateService.visibleUserIds`), however many members it covers. The
  roster path never calls identity-verification-service and never waits on RabbitMQ, so an outage of either serves the last
  known state and never produces an artificial empty roster; only accounts whose state was **never** received are omitted,
  without blanking unrelated known-visible members.
* **Background safety net** (`AccountGateReconciler`, never on a request path): accounts a roster asked about that have no state
  are queued and learned in batches every 30 s; every account on a listing, project, team, member row or job role row is
  re-checked hourly (first run ~1 minute after boot) through the existing batch RPC, which also heals a missed event; and the
  listing-owner gate is re-sent to the search index (below). If identity or the broker is down the pass is skipped and the last
  known state keeps being served. Tunables: `LISTINGS_GATE_LEARN_INTERVAL_MS`, `LISTINGS_GATE_RECONCILE_INTERVAL_MS`,
  `LISTINGS_GATE_RECONCILE_DISABLED`.
* **Homepage cache.** The homepage (api-gateway) is assembled from listings-service's public endpoints (anonymous, so already
  filtered) and cached for at most **15 seconds** (`HOMEPAGE_CACHE_TTL`, default 15). That is the accepted staleness; it is
  covered by a test.

## Surface audit
| Surface | Class | Treatment |
|---|---|---|
| `GET /v1/services` (marketplace list, homepage tiles) | public / client | owner-withheld; rosters, avatars, `teamMemberIds` filtered |
| `GET /v1/services/slug/:slug`, `GET /v1/services/:id` (service detail) | public / client, **viewer-aware** | hidden members absent; hidden owner's `userId`/`createdBy` withheld; owner gets the full roster + `notShownToClients`; direct detail stays available |
| `service.findById` RPC, `internal/*` controllers | internal | raw, unfiltered |
| `GET /v1/projects` (list, homepage tiles), `/recommended`, `:id/similar` | public / client | owner-withheld; avatars / member counts filtered |
| `GET /v1/projects/slug/:slug` (project detail roster, `team`, `ownerId`) | public / client, **viewer-aware** | hidden members absent; `ownerId` withheld if hidden; owner sees all + `notShownToClients` |
| Recently viewed / recommended rails | client | owner-withheld; avatars filtered |
| `GET /v1/teams`, `GET /v1/teams/:id` | public / client (detail viewer-aware) | owner-withheld; `memberIds` filtered; owner sees all. `v1/my-teams` and `team.findById` RPC are management/internal |
| CMS project members (assignee emails resolved to accounts) | public / client | shown only with a linked account whose gate is known open; email-only, closed and never-received omitted. The CMS scope/emails are never changed; CMS admin is the management view (note: `CmsProjectsController` is not registered in any module in this branch) |
| Job-role assignees (`GET /v1/job-listings/:id`) | owner view vs. other viewers | listing owner sees all; any other viewer sees an assignee only when known open, otherwise the role appears unassigned (copy only, stored row untouched) |
| Marketplace search - PostgreSQL fallback (projects, services, teams) | client | listings whose owner lacks a known open gate withheld by a join on `listings.account_gate_state` |
| Marketplace search - Algolia (`projects`, `services`, `teams` and replicas) | client | `NOT owner_hidden:true` through a per-index secured key (same mechanism as G1 talent); records are kept in step by the same event, by `owner_id`, with partial updates |
| Owner/management: publish wizard (`/v1/publish/*`), `my-teams`, `projects/mine`, job-listing create/update | owner / internal (G6) | unfiltered |

## Search index (listing owner)
* `owner_hidden` and `owner_id` are `filterOnly` attributes on `projects`, `services` and `teams`. Every query on those
  indices (and replicas) carries `NOT owner_hidden:true` inside a secured key generated from the search-only parent key
  (`ALGOLIA_SEARCH_API_KEY`), so hits, pages and facet counts cover visible listings only. If the key cannot be created the
  query fails closed and search is served from the (gated) PostgreSQL fallback.
* A listing **with** a real user id as owner is indexed `owner_hidden: true` unless listings-service's last known gate is open;
  a listing **without** an owner (CMS-authored, seeded, `cms-sync`) carries no `owner_hidden` and is never hidden.
* `identity.gate_changed` also updates `owner_hidden` on every record with that `owner_id` in each listing index (partial
  updates; nothing deleted or recreated). listings-service re-sends the owner gate of every published, owned listing hourly
  (`listing.owner_gate_backfill`), so records indexed before this existed are corrected.
* **Transitional behaviour:** a platform-owned listing indexed before this change has no `owner_hidden` until the first
  backfill (about a minute after listings-service boots) and is visible in Algolia until then. Ownerless records are never hidden.

## Configuration / deployment
Not added to the frozen env templates (DevOps SOP section 5 four-point confirmation applies): `LISTINGS_GATE_*` (above),
plus G1's `ALGOLIA_SEARCH_API_KEY` (now also required for listing search), `ALGOLIA_GATE_SYNC_*`, `GATE_INDEX_*`.
**Deploy order:** listings-service first (runs the migration, starts the consumer queue), then identity-verification-service
(starts publishing to the new queue), then search-service/algolia-service. The new queue only receives events published after it
exists; the reconcile fills the rest. search-service's DB fallback requires the migration to have run.

## Validation
Automated tests cover every rule above (see the G5 specs under `apps/listings-service`, `apps/search-service`,
`apps/algolia-service`, `apps/api-gateway/src/homepage`, and the publisher spec in identity-verification-service). The SQL
(state upsert with stale-event protection, and the owner-gate joins for projects/services/teams) was also run against a real
PostgreSQL in a throwaway database, which was dropped afterwards.

**Still needs staging QA:** real RabbitMQ delivery to `listings_service_gate_queue` end to end (verify, lose verification, grace
expiry, reopen) and the visible effect on the service detail page, marketplace list and homepage; the first reconcile after
deploy; and a real Algolia app for the secured-key / `owner_hidden` behaviour (no Algolia credentials were available).
