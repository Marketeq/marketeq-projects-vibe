# user-service Memory

## Status
Implemented (pre-existing service; this entry starts its memory file)

## Docs Location
No dedicated docs folder. Security record: `docs/md/CyberSecurity/Privileged Access & RBAC — Audit and Implementation.md`

## What This Service Does
- Owns the user profile: the `users` table (name, email, bio, `userType`, `role`, `activeRole`, onboarding timestamps) plus skills, education, certifications, languages, industries, companies, teams, hire requests, resume parsing, tax info and the E2EE `user_keys` / `user_devices` tables. Schema `user_service`.
- auth-service owns credentials and sessions; this service owns everything else about a person.

## Key Decisions
- **Added ownership / privilege checks to the `/users` routes (2026-10-01), in MONITOR mode.** `src/guards/user-access.guard.ts` plus `src/guards/user-access.rules.ts` (pure, unit-tested). Logs three violations: `cross-user` (a signed-in caller touching another account), `role-escalation` (a body setting `role=ADMIN`) and `list-all` (`GET /users`). `USER_ACCESS_MODE` = `monitor` (default) | `enforce` | `off` governs `cross-user` and `list-all` only. **`role-escalation` ENFORCES by default** under its own switch `USER_ACCESS_ESCALATION_MODE` (set it to `monitor` to back that out); `USER_ACCESS_MODE=off` is still a kill switch for all three.
- **Service-to-service callers are exempt** via `INTERNAL_SERVICE_TOKEN` (`x-internal-token` or `x-service-token`), because auth-service and the CMS legitimately sync other users' profiles through this service.
- Monitor first because these routes are live and heavily used, and nothing is known yet about which internal flows legitimately write to another user's record.

## Gotchas / Notes
- **The routes are open today.** `UserController` has no per-route guards; only the global `JwtAuthGuard` (APP_GUARD in `app.module.ts`). `PATCH /users/:id` is `Object.assign(user, dto)`, and `UpdateUserDto` is `PartialType(CreateUserDto)` which includes `role?: UserRole` where `UserRole` has `ADMIN`. So a signed-in user can set `role=ADMIN` on any account, edit any profile, delete any account, and list every user.
- The cross-user and list-all holes are STILL OPEN (log-only): a signed-in account can read, edit and delete other people's records. It can no longer gain privilege by doing so — escalation is refused, and the token claim is not sourced from this database at all.
- `user.role` is a profile label (talent/client), not a security role. A security role should be a separate column that only an admin path can write.
- The guard reads the caller from `req.user.sub` — `JwtAuthGuard` assigns the raw token payload to `req.user`.

## Platform role storage (step 3 of Option A)
- `users.platform_role` (migration `1799500000000-AddPlatformRole.ts`, nullable varchar(32), partial index on non-null) is the SECURITY role. `user.role` stays a profile label (talent/client) and must not be reused for authorisation — it is DTO-exposed and written by onboarding.
- Values in `user/enums/platform-role.enum.ts`: `admin`, `finance`, `support`. Text rather than a Postgres enum so the list can grow without a migration each time.
- **`platformRole` must never appear in a DTO.** ValidationPipe runs with `whitelist` + `forbidNonWhitelisted`, so a body carrying it is rejected with 400 before `Object.assign(user, dto)` in `updateUser` can set it. The access rules flag it too, as defence in depth.
- Nothing reads the column yet: no token carries a role claim, and every row is null.

## Agent Log
- 2026-10-01: Found the open `/users` routes during the Option A groundwork; added the monitor-mode access guard. `tsc --noEmit` clean; 10 new tests (53 passing overall across the security work). Not merged or deployed.
- 2026-10-01: Step 3 of Option A — added the `platform_role` column, its migration, the `PlatformRole` enum, and extended the access rules to flag bodies carrying it. `tsc --noEmit` clean; 54 tests passing. Not merged or deployed; no behaviour change (nothing reads the column).
- 2026-10-02: **security audit log** (RBAC step 6). `src/guards/security-audit.ts` is a shared module (duplicated verbatim into payout/checkout/time-tracking/content-moderation, same rule as `platform-role.core.ts` — change one, change all). Emits one stdout line per privileged decision: `AUDIT outcome= actor= role= action= target= ip= requestId= at=`.
  - Durable sink: `src/guards/audit-sink.database.ts`, registered in `main.ts` from the live `DataSource`, inserting into `security_audit.privileged_actions` (migration `1799600000000-AddSecurityAuditLog.ts`). Raw SQL, not an entity — the table lives in its own schema because several services write it and it is read as one timeline; registering an entity would imply user-service owns records about payouts and wires.
  - **An audit write must never break the request.** stdout first and unconditionally; the insert is fired without await, failures swallowed and reported at most 1/min. Only user-service registers the durable sink so far; the other four are stdout-only until they add the one bootstrap line.
  - `UserAccessGuard` audits every request from a caller holding a `platformRole`, plus every ENFORCED refusal. Monitor-mode observations are deliberately NOT audited as denials — nothing was refused.
  - Table is append-only by intention but not yet by grant: locking it needs a DB role with INSERT/SELECT and no UPDATE/DELETE (deployment change, not a migration). Migration has not been run against a real database yet.
- 2026-10-04 (AUDIT ONLY): **company-scoped RBAC is a SEPARATE system from item #11's platform RBAC** — do not conflate. `company_users.role` (admin/editor/viewer, default viewer) + `company_users.permissions` (text[]). The authoritative model is the 30 permissions in 8 groups defined in `frontend/components/select-permissions-panel.tsx` (owner confirmed 2026-10-04 that this, not the Figma Super Admin/Manager/Contributor/Viewer hierarchy, is real). `companies.service.ts` `assertIsMember`/`assertIsAdmin` are the ONLY enforced company checks, covering 3 routes; **the 30 permissions are write-only — nothing in the backend reads them for an authorisation decision.** The invite DTO defaults `role` to VIEWER and the dialog no longer sends one, so the invite flow cannot produce a company admin; only the creator is admin. Fails closed. See `docs/md/CyberSecurity/Company & Team RBAC — Audit.md`.
