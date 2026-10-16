# auth-service Memory

## Status
Implemented

## Docs Location
/docs/Technical Documentation/User Service/User Onboarding/

## What This Service Does
Handles user authentication: sign up, sign in, JWT issuance, OAuth (Google, LinkedIn), password management.

## Src Structure
/backend/apps/auth-service/src/
├── auth/         # Auth logic, strategies
├── config/       # Config module
├── main.ts
├── auth-service.controller.ts
├── auth-service.module.ts
└── auth-service.service.ts

## Key Decisions
- JWT-based auth
- OAuth via Passport strategies (Google, LinkedIn)

## Gotchas / Notes
- Guards live in /backend/shared/ and are reused by all services

## Agent Log (security)
- 2026-09-28: `src/middleware/csrf-origin.middleware.ts` updated in step with the api-gateway copy (the two are deliberately identical). A missing `Origin` on a state-changing request is no longer an automatic pass: bearer-authenticated, cookie-less, and `Sec-Fetch-Site`-safe requests still pass, everything else is logged and rejected only when `CSRF_STRICT_MODE=enforce` (default `monitor`). localhost origins from `FRONTEND_URL` are dropped in production unless `ALLOW_LOCALHOST_ORIGIN=true`. Rationale: `docs/md/CyberSecurity/CSRF Defences — Rollout Status.md`.
- 2026-10-01: **access tokens now carry a `platformRole` claim** for accounts holding a platform security role (RBAC item #11, step 4). Minted in `issueTokens()` — the single signing chokepoint, which refresh also routes through, so a role change lands on the next refresh. Omitted entirely (not null) for ordinary accounts, so their tokens are byte-identical to before.
  - Source is `src/auth/platform-role.source.ts`, reading `PLATFORM_ROLE_ASSIGNMENTS` (`"<userId>:admin,<userId>:finance"`; roles admin/finance/support; malformed and unknown-role entries are dropped with a warning, never granted).
  - **Deliberately NOT read from `users.platform_role`.** Two reasons: auth-service mints from its own `users` table (public schema) while the column is on `user_service.users`; and env config is unreachable from any HTTP route, so no request can promote an account. Migrating later = rewrite `resolvePlatformRole()` only; the call site does not move. Do it once `USER_ACCESS_MODE=enforce`.
  - Currently empty, so nobody holds a role and every role guard still refuses everyone.
  - Rationale: `docs/md/CyberSecurity/Privileged Access & RBAC — Audit and Implementation.md` §2.4.
- 2026-10-02: **the `platformRole` claim now requires a second factor** (RBAC step 7). `issueTokens()` takes `strongAuth?: boolean`, default false; the claim is only attached when true. Only `verifyTwoFactorLogin()` passes `strongAuth: true` — every other mint (register, registerEmail, password login without 2FA, magic link, password reset, Google, LinkedIn) is single-factor and carries no role.
  - Refresh inherits it from `amr: ['mfa']` on the refresh token, written at 2FA verification and nowhere else; read by `src/auth/second-factor.claim.ts`, which fails closed on anything unexpected.
  - **Operational trap:** an account in `PLATFORM_ROLE_ASSIGNMENTS` without 2FA enabled gets a normal token with NO role and will be refused by every admin endpoint. auth-service logs `platform role withheld: userId=... holds role=... but this session is not second-factor verified`. Enrol 2FA first, then assign the role.
  - No new 2FA machinery was built — TOTP/SMS enrolment, backup codes and the partial-token flow already existed.
