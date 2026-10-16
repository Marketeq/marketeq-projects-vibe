# wire-review-service Memory

## Status
Implemented (pre-existing service; this entry starts its memory file)

## Docs Location
No dedicated docs folder. Security record: `docs/md/CyberSecurity/Privileged Access & RBAC — Audit and Implementation.md`

## What This Service Does
- Matches and reviews incoming wire transfers (`apps/wire-review-service`, port 3031, mapped in the gateway as `wire-transfer` / `wire-review`).
- Controllers: `wire-transfer`, `admin/wire-review`, `webhook/mercury`, `webhook/quickbooks`, health.

## Entities / Database Tables
`WireMatchCandidate` (and related wire entities).

## Key Decisions
- **Guarded the admin review endpoint (2026-09-30).** `POST admin/wire-review/resolve` confirms or flags a wire transfer and had no guard at all, with `adminId` taken from the request body — the caller asserted their own identity and that claim was written into the record as the audit trail. Added `src/guards/internal-service.guard.ts`, requiring `INTERNAL_SERVICE_TOKEN` via `x-service-token` or `x-internal-token`, failing closed when unset, timing-safe comparison.
- **Internal token rather than a role check**, because roles do not exist yet: the access token carries no role claim, so every role guard on the platform currently rejects everyone. When roles land, this should become a role check so a named human authorises a wire.

## Gotchas / Notes
- **The endpoint appears unreachable from the internet by accident, not by design.** The gateway maps the `admin` prefix to `admin-service`, so no external path reaches `admin/wire-review`. One line in `proxy.controller.ts`'s prefix map would change that. Do not rely on it.
- The service has no global guard; the two webhook controllers are verified by their providers' own signatures.
- `adminId` in the request body is still recorded, but it is self-asserted and is not an audit trail — the same action can edit it.

## Agent Log
- 2026-09-30: Added the internal-service guard during the privileged-access audit. `tsc --noEmit` clean. Not merged or deployed.
- 2026-10-05 (AUDIT): **`POST /wire-transfer` (`controllers/wire-transfer.controller.ts`) has NO guard, and this service registers no `APP_GUARD`.** The gateway requires a token for `/wire-transfer` (not in its public list), so not anonymous — but any signed-in account can create a wire transfer intent with a caller-supplied invoice id, amount and currency. Confirmation is guarded (`AdminReviewController` + `InternalServiceGuard`); origination is not. The same file also holds a large commented-out duplicate controller containing an email template that interpolates `MERCURY_ROUTING_NUMBER` / `MERCURY_ACCOUNT_NUMBER` — delete it.
- This service also has NO audit coverage: it never received `security-audit.ts`, so confirming a wire transfer leaves no record naming who did it. The `wire:review` capability exists in the role catalogue with nothing honouring it. See `docs/md/CyberSecurity/Authorisation Remediation — Open Code Changes.md` items 2 and 9.
