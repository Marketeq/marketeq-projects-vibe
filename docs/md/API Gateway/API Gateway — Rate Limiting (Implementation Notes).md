# **API Gateway — Rate Limiting (Implementation Notes)**

**Audience:** engineers working on `api-gateway`.
**Status:** implemented on branch `security/gateway-rate-limiting`, running in **monitor mode** (nothing is blocked). Not merged or deployed.
**Why it exists:** Security Tasklist (Revised) item #5. The security rationale, threat list and rollout plan live in `docs/md/CyberSecurity/API Gateway Rate Limiting — Rollout Status.md`. This document is the implementation and operating reference.

## **1. What Was Added**

A new `src/rate-limit/` module inside `api-gateway`, registered as two middlewares. No new service, no new npm dependency, no new infrastructure: counters use the `ioredis` client and the `REDIS_URL` instance the gateway already had.

| **File** | **Contains** |
|---|---|
| `src/rate-limit/rate-limit.config.ts` | Rule table, path matching/normalization, env parsing |
| `src/rate-limit/client-ip.ts` | Trusted client-IP resolution |
| `src/rate-limit/rate-limit.store.ts` | Redis (Lua) counter + in-memory fallback |
| `src/rate-limit/rate-limit.service.ts` | Rule evaluation, modes, logging, the 429 response |
| `src/rate-limit/rate-limit.middleware.ts` | `createPreAuthRateLimit()` (used from `main.ts`), `PostAuthRateLimitMiddleware` |
| `src/rate-limit/rate-limit.spec.ts` | Unit tests |

**Also changed:**

- `src/main.ts` — CORS moved above body parsing, and the per-IP limiter wired in with `app.use()` there (order matters, §2).
- `src/api-gateway.module.ts` — registers `RateLimitService` and the per-user middleware (order matters, §2).
- `apps/api-gateway/package.json` — `test` script + Jest config, same shape as auth-service. No dependency change.
- `backend/.env.example`, `backend/.env.local.example` — the new settings.

**Not changed:** no routes, no proxy mappings, no existing response shapes, nothing under `frontend/`. In `main.ts` the CORS block was moved earlier but its logic is untouched.

## **2. Middleware Order (Load-Bearing)**

```
main.ts:  helmet → CORS → per-IP rate limit → raw-body/json/urlencoded → cookieParser
module:   Logging → CsrfOrigin → Jwt → PostAuthRateLimit → controllers
```

- **Per-IP limiting sits in `main.ts`, before body parsing.** Two reasons. Floods are turned away before the gateway spends parsing, CSRF and JWT work on them. And a malformed JSON body is rejected inside `json()`, which runs before any module middleware — while the limiter sat behind the parser, those requests were never counted at all, so an attacker could flood with broken payloads unseen (found in manual testing, 2026-09-25).
- **CORS is applied immediately above it.** Express applies these in registration order, so CORS must be registered first for a 429 to carry the CORS headers; otherwise a browser reports a CORS failure instead of showing the real status.
- **`PostAuthRateLimitMiddleware` stays after `JwtMiddleware`** — it needs `req.user.userId` from the verified token. Keying on an unverified token would let a client mint a fresh bucket per request.

If you reorder anything in `main.ts` or insert module middleware, re-check all three points.

## **3. Rules**

Fixed windows. Defaults below; every value is env-tunable (§5).

| **Rule** | **Applies to** | **Keyed by** | **Default** |
|---|---|---|---|
| `ip` | everything except webhooks and exempt paths | client IP | 1200 / min |
| `webhook` | `/v1/webhooks/*` | client IP | 300 / min |
| `auth-login` | `/auth/` `login`, `dev-login`, `signup`, `register`, `register-email`, `google`, `linkedin`, `magic-link` | client IP | 10 / min |
| `auth-password-reset` | `/auth/forgot-password`, `/auth/reset-password` | client IP | 10 / 15 min |
| `auth-otp-verify` | `/auth/2fa/verify`, `/auth/verify` | client IP | 10 / 15 min |
| `auth-otp-send` | `/auth/2fa/resend`, `/auth/2fa/generate-sms` | client IP | 5 / 15 min |
| `auth-username-check` | `/auth/check-username` | client IP | 60 / min |
| `user` | all requests from a signed-in user | user id | 300 / min |
| `money` | writes to `payouts`, `deposit-methods`, `wallet`, `wire-transfer`, `wire-review`, `checkout` (`/v1` optional) | user id (IP if anonymous) | 30 / min |
| `upload` | writes to `/user/me/avatar`, `/v1/companies/logo`, `/publish/media`, `/publish/rich-text-image`, `/resume/upload`, `/talent` | user id (IP if anonymous) | 20 / min |

**Never limited:** `OPTIONS`, `/health`, `/ready`, `/health/migrations`, `/services/health`, `/services/debug`, `/homepage/health`, `/v1/homepage/health`. A 429 on `/health` would make Render restart the container.

A request is counted in every rule it matches; the tightest violation wins. Anonymous requests skip the `user` rule (the `ip` rule already covers them).

**Path matching** happens on a normalized path: `/api` stripped (as `JwtMiddleware` and `ProxyController` do), URL-decoded, lower-cased, repeated slashes collapsed, trailing slash dropped. **If you add or rename a route that belongs in a rule, update the matchers in `rate-limit.config.ts`** — nothing fails loudly if you forget; the route just falls back to the general rule.

## **4. Counting and Failure Behaviour**

- **Redis (primary):** one atomic Lua script per hit (`INCR` + `PEXPIRE`, with a repair branch if a key ever loses its TTL). Counts are shared across instances and survive restarts. Keys: `rl:gw:<rule>:ip:<addr>` / `rl:gw:<rule>:u:<userId>`, expiring with their window.
- **In-memory (fallback):** used when `REDIS_URL` is unset and whenever Redis is not ready or a command fails. Sweeps expired windows every 60s, capped at 100k keys.
- **Requests never wait on Redis:** offline queue disabled, 250 ms command timeout. The client keeps reconnecting with capped backoff and returns to Redis on its own. Redis warnings are logged at most once a minute (see `render.yaml`: an unreachable Redis once produced ~958 log lines per window).
- **Fails open on its own errors:** an unexpected error while counting logs a warning and allows the request.
- **Shutdown:** `onModuleDestroy` calls `disconnect()` when the client is not `ready`, otherwise `quit()`. Using `quit()` while reconnecting hangs shutdown.

### **4.1 Client IP**

The limiter uses the `x-forwarded-for` entry `RATE_LIMIT_TRUSTED_PROXY_HOPS` places **from the right** (default 1 = Render's edge), falling back to the socket address when the chain is shorter.

**Do not "unify" this with `controllers/client-ip.controller.ts`.** That controller intentionally returns the **leftmost** entry, which is right for showing a user their own address but is client-controlled — keying limits on it would let anyone reset their bucket with a header.

### **4.2 Response on block (enforce mode only)**

```
HTTP/1.1 429 Too Many Requests
Retry-After: <seconds left in the window>

{ "statusCode": 429, "code": "RATE_LIMITED",
  "message": "Too many requests. Please wait a moment and try again.",
  "details": { "retryAfterSeconds": <n> } }
```

Same `{ statusCode, code, message, details }` shape as `GlobalExceptionFilter`, so existing frontend error handling reads it unchanged. It is written directly rather than thrown, so a flood does not add one filter error log per request.

## **5. Configuration**

| **Variable** | **Default** | **Meaning** |
|---|---|---|
| `RATE_LIMIT_MODE` | `monitor` | `off` / `monitor` (log only) / `enforce` (429). Unknown values fall back to `monitor` with a warning. |
| `RATE_LIMIT_TRUSTED_PROXY_HOPS` | `1` | Trusted proxies appending to `x-forwarded-for`; `0` = socket address only. |
| `RATE_LIMIT_IP_ALLOWLIST` | empty | Comma-separated IPs never limited. |
| `RATE_LIMIT_KEY_PREFIX` | `rl:gw` | Redis key prefix. |
| `RATE_LIMIT_<RULE>_LIMIT` | §3 | Requests per window. |
| `RATE_LIMIT_<RULE>_WINDOW_SEC` | §3 | Window length in seconds. |
| `REDIS_URL` | set on Render | Shared counters; without it, counts are per process. |

`<RULE>` = rule name upper-cased, dashes to underscores (`AUTH_LOGIN`, `AUTH_OTP_SEND`, `USER`, `MONEY`, `UPLOAD`, …). Invalid numbers are ignored in favour of the default.

## **6. Testing Locally**

```bash
cd backend/apps/api-gateway && npm test        # 18 unit tests
```

End-to-end, against a local stack: set `RATE_LIMIT_MODE=enforce` in `backend/.env`, start the backend, then send 12 requests to `POST http://localhost:4000/auth/login`. The first 10 return 401 (a failed login still counts), 11 and 12 return 429 with `Retry-After`. `GET /health` stays 200 throughout. Set the value back to `monitor` and restart when done.

Locally there is no proxy, so the socket address is used, and without a local Redis the counts are in-memory and reset with the process. Both are expected.

## **7. Reading the Logs**

Context `RateLimit`:

- **Startup:** `Rate limiting mode=… store=… trustedProxyHops=… allowlisted=…`
- **Once per process:** `x-forwarded-for carries N entries; using entry H from the right (…)` — counts only, no addresses. Use it to verify `RATE_LIMIT_TRUSTED_PROXY_HOPS`.
- **Over limit, once per key per window** (not per request):

```
WOULD_BLOCK rule=auth-login limit=10/60s key=ip:203.0.113.7 ip=203.0.113.7 user=- method=POST path=/auth/login
BLOCK       rule=user limit=300/60s key=u:<id> ip=76.76.21.21 user=<id> method=GET path=/v1/threads
```

`WOULD_BLOCK` = monitor (served). `BLOCK` = enforce (429).

- **Redis:** `Redis error: …` / `Redis rate-limit command failed, using in-memory fallback: …` (≤1/min); `Rate-limit counters connected to Redis` on recovery.

## **8. Operations**

| **Need** | **Action** |
|---|---|
| Turn blocking on | `RATE_LIMIT_MODE=enforce`, restart |
| Emergency stop | `RATE_LIMIT_MODE=monitor` (keeps logging) or `off`, restart |
| A rule blocks real users | raise `RATE_LIMIT_<RULE>_LIMIT`, restart |
| Exempt a monitor/bot | add its IP to `RATE_LIMIT_IP_ALLOWLIST`, restart |
| Clear one counter now | `DEL rl:gw:<rule>:u:<userId>` or `DEL rl:gw:<rule>:ip:<addr>` in Redis, or wait out the window |

## **9. Gotchas for Gateway Work**

- **The per-IP limiter is registered in `main.ts`, not in the module.** If you move it back behind `json()`, malformed-body requests stop being counted (that is the bug it was moved to fix). Oversized floods still reach Node either way — stopping those is the edge-WAF item, not this.
- **`RATE_LIMIT_TRUSTED_PROXY_HOPS` is unverified on Render.** Too low reads a proxy address (every user shares one bucket); too high trusts a client-supplied entry. Confirm from the log line in §7 before enforcing.
- **`enforce` is all-or-nothing today.** There is no per-rule switch; a staged rollout needs a small change.
- **Redis is shared.** The Render key-value store (free plan, `noeviction`) also backs BullMQ. Rate-limit keys are tiny and expire, but if memory fills, queues fail too.
- **Failed logins count.** A user typing a wrong password repeatedly consumes the `auth-login` budget for their address. Intentional, but relevant when triaging a "can't log in" report.
- **`@nestjs/throttler` is not installed** anywhere in `backend/`, though `favorites-service` imports it. Unrelated to this module; flagged, not fixed.

## **10. Verification Record**

- `tsc --noEmit -p apps/api-gateway/tsconfig.app.json` — clean.
- 18 unit tests: normalization, config parsing/fallbacks, IP resolution and spoofing, in-memory window reset and cap, all three modes, exemptions, webhook bucket, allowlist, per-user keying on a shared IP, writes-only `money`, `upload`, separate 2FA buckets.
- 5 wiring tests on a real Nest app (run outside the repo, mirroring `main.ts` order): 11th login → 429 with CORS + `Retry-After`; **a malformed JSON body is counted** (regression test for the 2026-09-25 finding); post-auth stage sees the JWT stage's user; spoofed `x-forwarded-for` does not reset a bucket; `/health` unlimited; Redis down → memory fallback and clean shutdown.
- Lua script checked against Redis 7 (increment, TTL repair, window reset).
- **Not done:** Render deployment, the proxy-hop check, a run against the live frontend.

## **11. Change Log**

- **2026-09-22** — Rate limiting added to `api-gateway` in monitor mode (Security Tasklist (Revised) item #5), branch `security/gateway-rate-limiting`. Not merged or deployed.
- **2026-09-25** — Manual testing found that requests with a malformed JSON body were never counted, because `json()` rejects them before module middleware runs. Per-IP limiting moved from module middleware into `main.ts`, ahead of body parsing, with CORS moved above it so a 429 still carries CORS headers. Per-user limiting unchanged. Regression test added.
