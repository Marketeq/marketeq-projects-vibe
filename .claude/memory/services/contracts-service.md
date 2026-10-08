# Contracts Service

## Status: Complete

## Port: 3010

## Tables
- `contract_groups` — groups contracts by project/service/team/job, tracks deposit status
- `contracts` — individual 1-client-to-1-talent contracts with lifecycle status
- `contract_audits` — immutable audit trail of all lifecycle actions

## Entities
- `ContractGroup` — type (project/service/team/job), ownerClientId, depositPaid, optional refs
- `Contract` — groupId, clientId, talentId, title, rate, schedule, duration, status, timestamps
- `ContractAudit` — userId, role, action, contractId, groupId, details (jsonb)

## Enums
- `ContractStatus`: pending, active, ended, canceled — **corrected 11 Aug 2026**: this file
  previously also listed `disputed`. `enums.ts` has exactly four values; no `DISPUTED`, no
  dispute route anywhere in `contracts.controller.ts` or `groups.controller.ts` (grepped,
  zero matches). `dispute-contract.dto.ts` exists as a file but is never imported/wired.
- `GroupType`: project, service, team, job

## Endpoints
**Guard column corrected 11 Aug 2026** — verified against `app.module.ts` directly: the only
guard registered anywhere is a global `JwtAuthGuard` via `APP_GUARD`. `RolesGuard` exists as a
file (`middleware/roles.guard.ts` and `guards/roles.guard.ts` — two copies) but is never
imported into any module or applied via `@UseGuards` on any controller. Every "JwtAuth +
RolesGuard(...)" pairing below was aspirational, copied from the original docs scaffold, not
the real code.

| Method | Path | Guard | Purpose |
|--------|------|-------|---------|
| POST | /contract-groups | JwtAuth (global) | Create group + N contracts. `ownerClientId` from `req.user.sub` only |
| GET | /contract-groups/:id | JwtAuth (global) + manual ownership check (403 if not yours) | Get group with contracts |
| GET | /contracts/groups/mine | JwtAuth (global) | T2-1: the authenticated client's own groups, with `members[]` (talentId/status/title per contract) — routed under `/contracts/` because api-gateway's `SERVICE_PREFIX_MAP` doesn't map `contract-groups` |
| POST | /contracts/groups/:id/members | JwtAuth (global) + manual ownership check | T2-13: add a Contract to an existing group. 404 if group missing, 403 if not owned, 409 if talentId already PENDING/ACTIVE in the group |
| GET | /contracts/:id | JwtAuth (global) | Get single contract |
| GET | /contracts/client/:clientId | JwtAuth (global) + manual `clientId === req.user.sub` check | List client's contracts |
| GET | /contracts/talent/:talentId | JwtAuth (global) | List talent's contracts — no ownership check |
| PUT | /contracts/:id/end | JwtAuth (global) | End active contract |
| PUT | /contracts/:id/respond | JwtAuth (global) | Accept/reject pending offer — **accept path is a no-op, see Key Behaviors** |
| POST | /webhooks/checkout/deposit-cleared | JwtAuth (global) — no `@Public()`, no separate BearerGuard found | Intended to activate group on deposit; **currently a stub, see Key Behaviors** |
| POST | /webhooks/billing/finalized | JwtAuth (global) | Confirm billing |
| POST | /contracts/:id/cms-sync | `@Public()` + manual `x-internal-token` header check | CMS webhook |

## RabbitMQ Events Emitted
**Corrected 11 Aug 2026**: `EventsService` (`events.service.ts`) defines `groupCreated`,
`contractActivated`, `groupActivated`, `contractEnded`, `groupEnded`, `contractDisputed`,
`contractsCanceled` — but it is **never injected into `AppModule`'s providers**, so none of
these methods are ever called by anything. Zero events are actually emitted by this service
today, despite the method surface existing.

## RabbitMQ Events Consumed
None. Zero `@MessagePattern`/`@EventPattern` handlers anywhere in the service — outbound-only
by design (per T2-0), and even outbound is currently dead (see above).

## Key Behaviors
- Transactional group creation (group + all contracts atomically) — verified, real
- Ownership enforcement on `getGroup`/`addMember`/`getClientContracts` (`clientId`/
  `ownerClientId` must match `req.user.sub`) — verified, real
- Full audit trail via `AuditLoggerService`, real (saves to DB, not the doc scaffold's
  `console.log` stub) — used by `HIRE_FLOW_INITIATED` and `CONTRACT_MEMBER_ADDED`
- **🔴 A PENDING contract has no implemented path to ACTIVE**, found 11 Aug 2026 while
  building T2-13: `respondToOffer`'s accept branch never persists (`contracts.service.ts:
  82-87`, no `.save()`); `handleDepositCleared` never queries the DB and returns hardcoded
  fake contracts (`webhooks.service.ts:6-24`); and events are dead per above. This applies to
  every PENDING contract in the system, not just ones created via T2-13's new endpoint.
- Previously claimed but **not found in code**: `RolesGuard` role enforcement, a
  `PUT /contracts/:id/dispute` route, a `contract.activate` MessagePattern consumer, and a
  daily CRON auto-cancelling stale pending groups. None of these exist — grepped for each,
  zero matches. Removed from this file rather than left to mislead the next session.

## RPC: contract parties (added 2026-10-03)
- `subscribers/contract-parties.responder.ts` answers RabbitMQ queue `contracts.parties.rpc`
  (amqplib, request/reply via `replyTo` + `correlationId`). Request `{contractIds}` |
  `{clientId}` | `{talentId}` → `{contracts: [{id, clientId, talentId, status}]}`.
- Caller today: time-tracking-service `contracts/contract-parties.client.ts` (direct reply-to,
  5s timeout, 60s cache). It decides who may view/moderate screenshots, settings and manual
  time from the contract, because access tokens carry no `role`.

## Migration
- `1710000000000-InitContractsSchema.ts` — creates all 3 tables, indexes, enums
