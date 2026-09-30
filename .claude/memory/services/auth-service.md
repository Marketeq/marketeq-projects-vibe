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
