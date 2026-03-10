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
- `ContractStatus`: pending, active, ended, canceled, disputed
- `GroupType`: project, service, team, job

## Endpoints
| Method | Path | Guard | Purpose |
|--------|------|-------|---------|
| POST | /contract-groups | JwtAuth + RolesGuard(client) | Create group + N contracts |
| GET | /contract-groups/:id | JwtAuth | Get group with contracts |
| GET | /contracts/:id | JwtAuth | Get single contract |
| GET | /contracts/client/:clientId | JwtAuth | List client's contracts |
| GET | /contracts/talent/:talentId | JwtAuth | List talent's contracts |
| PUT | /contracts/:id/end | JwtAuth + RolesGuard(client) | End active contract (ownership enforced) |
| PUT | /contracts/:id/respond | JwtAuth + RolesGuard(talent) | Accept/reject pending offer |
| PUT | /contracts/:id/dispute | JwtAuth | Dispute active contract (either party) |
| POST | /webhooks/checkout/deposit-cleared | BearerGuard | Activate group on deposit |
| POST | /webhooks/checkout/deposit-failed | BearerGuard | Log deposit failure |
| POST | /webhooks/billing/finalized | BearerGuard | Confirm billing |
| GET | /health | Public | Health check |

## RabbitMQ Events Emitted
- contract.group.created, contract.activated, contract.group.activated
- contract.ended, contract.group.ended, contract.disputed, contract.canceled

## RabbitMQ Events Consumed
- contract.activate (MessagePattern) — triggers group activation

## Key Behaviors
- Transactional group creation (group + all contracts atomically)
- Transactional activation (all pending contracts activated together)
- Ownership enforcement on endContract (clientId must match user.sub)
- Group-ended detection: emits contract.group.ended when last contract ends
- CRON daily: auto-cancels pending groups older than 7 days without deposit
- Full audit trail on every lifecycle action

## Migration
- `1710000000000-InitContractsSchema.ts` — creates all 3 tables, indexes, enums
