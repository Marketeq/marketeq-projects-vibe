# **HTTP Security Headers (Helmet) — Rollout Status**

**Status:** api-gateway hardened and verified. Wider rollout scoped, then paused (§4) — not yet complete.

### **Overview**

This document tracks where [Helmet](https://helmetjs.github.io/) — the Express/NestJS middleware that sets hardening HTTP response headers (Content-Security-Policy, HTTP Strict-Transport-Security, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, and others) — is actually applied across the backend, and why. It originates from Security Tasklist item #4 ("Apply HTTP security headers — Helmet: CSP, HSTS, X-Frame-Options, etc. — at the API Gateway"), which found Helmet was a declared dependency in only 2 of ~28 backend services and absent from `api-gateway`, the single public entry point for all external traffic. This applies to all backend services in the microservice architecture. This is a status/decision record, not a setup guide — see each service's own `main.ts` for the actual implementation.

## **1. Current Coverage**

  ------------------------------------------------------------------
  **Service**                **Helmet applied?**   **Config**
  --------------------------- ---------------------- ----------------
  api-gateway                 Yes (added 2026-09-16) Bare `helmet()` defaults

  portfolio-service           Yes (pre-existing)     Bare `helmet()` defaults

  time-tracking-service       Yes (pre-existing)     Bare `helmet()` defaults

  All other services (~25)    No                     —
  ------------------------------------------------------------------

## **2. Why api-gateway Was Prioritized**

Helmet's headers are enforced by browsers, not servers — they only do anything on a response a browser actually receives and renders. `api-gateway` is the only service a browser talks to directly; every other service is reached through internal proxying (RabbitMQ events, direct service-to-service calls authenticated via `INTERNAL_SERVICE_TOKEN`). So applying Helmet at the gateway covers the full browser-facing attack surface today, assuming that internal/external boundary holds.

That assumption is not purely theoretical: the 2026-08-04 P0 incident was exactly a boundary failure (an untracked external connection reached the production database directly). Extending Helmet to the remaining ~25 services would be pure defense-in-depth against a similar boundary failure recurring elsewhere — it would not change today's actual browser-facing risk, since no browser currently talks to those services directly.

## **3. Config Choice: Bare `helmet()` Defaults**

All three covered services use `app.use(helmet())` with no custom options, rather than a tailored Content-Security-Policy. This was a deliberate choice for `api-gateway` specifically: it also handles Stripe/Ramp webhook signature verification and OAuth popup flows (Google, LinkedIn, Wise, Payoneer), making it the highest-blast-radius service to misconfigure. Since two other services already run bare `helmet()` in production without documented issues, that proven pattern was used instead of a bespoke policy.

**Open item, not yet resolved:** Helmet's defaults set `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Resource-Policy: same-origin`, which can interact with popup-based OAuth flows and cross-origin frontend calls (the frontend is on Vercel, a different origin than the gateway). This has not been smoke-tested against a live OAuth popup flow. Do that before treating this as fully validated in production.

## **4. Why the Remaining ~25 Services Are Paused, Not Scheduled**

A wider rollout was scoped and then paused mid-investigation. While checking whether to centralize the Helmet call behind a shared `@marketeq/shared` helper (so future services don't each need a hand-copied `app.use(helmet())`), the following was found:

- The `@shared/*` path alias (in root `tsconfig.json`, inherited by every service's `tsconfig.app.json`) is configured but currently unused anywhere in the codebase.
- The one comparable pattern that is used — `offer-service` and `invitations-service` importing from `@libs/auth`, a path outside their own `src/` — does not build cleanly. `offer-service`'s compiled output lands at `dist/apps/offer-service/apps/offer-service/src/main.js` (a duplicated path segment) rather than the `dist/apps/offer-service/src/main.js` its own `start:prod` script expects.

Introducing a new shared-import mechanism as the vehicle for a security rollout carried a real risk of quietly breaking a service's production start path, in the same class of service (offer-service) that this exercise wasn't even trying to change. Given the ambiguity, the decision was to pause the wider rollout rather than proceed on an unverified assumption. See `.claude/memory/services/api-gateway.md` for the same note in that service's memory file.

## **5. Options When This Resumes**

Not yet decided — listed here for whoever picks this up next:

1. **Inline `app.use(helmet())` per remaining service** — copy the exact proven pattern into each service's `main.ts` directly. No new shared dependency, no untested build path. ~25 small, independently-verified edits.
2. **Fix the shared-import path first, then centralize** — larger scope: diagnose and fix why `@libs/auth`-style imports produce a malformed build path, then add a real `@shared/security-headers` module. Touches build tooling, not just this task.
3. **Investigate `offer-service`'s build/start mismatch on its own first**, independent of Helmet, since it may indicate that service's `start:prod` script doesn't work as written today — a separate, possibly-live issue surfaced only incidentally by this investigation.

## **6. Change Log**

- **2026-09-16** — Helmet added to `api-gateway` (Security Tasklist item #4). Verified via `npx nest build api-gateway` and inspection of compiled output. See `apps/api-gateway/src/main.ts` and `apps/api-gateway/package.json`.
- **2026-09-20** — Wider rollout to remaining ~25 services scoped, then paused after the `@shared/*` / `offer-service` build-path finding above. No code changed for any service other than `api-gateway` in this pass.
