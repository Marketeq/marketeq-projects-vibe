# **CSRF Defences — Rollout Status**

**Status:** Phase 2 implemented on branch `security/gateway-rate-limiting`, with the new check in **monitor mode** (it logs, it does not reject). Not merged or deployed. Phase 3 (a CSRF token) needs a frontend change and has not started.
**Origin:** security review finding — the only defence against cross-site request forgery was an `Origin` header allow-list, which needed strengthening.

### **Overview**

Cross-site request forgery is when another website causes a logged-in user's browser to send a request to us, and the browser attaches that user's cookies automatically. The request looks completely legitimate. Money moves, settings change, and the user never clicked anything on our site.

Marketeq is unusually exposed to this. The website runs on Vercel and the API on Render, which browsers treat as different sites, so the auth cookies are set `SameSite=None`. That tells the browser to attach them to requests from **any** site. Browsers therefore provide no protection of their own here, and until now a single `Origin` header check stood between a hostile page and 465 state-changing endpoints.

## **1. What the Audit Found (Phase 1)**

- **No state-changing GET routes behind cookie auth.** All 249 controller files were scanned. Three GETs do change state (`/v1/payouts/verify`, `/v1/payouts/verify-email`, `/v1/notifications/preferences/email/verify`), but each is a magic link where a one-time emailed token is the credential and no session is involved, so they cannot be forged. Separately worth noting, not CSRF: tokens in URLs leak through browser history, referrers and logs.
- **`http://localhost:3000` was in the production allow-list**, via `FRONTEND_URL` on Render, and the gateway also appended it unconditionally in every environment. Any page running on a victim's own machine was a trusted origin against live data.
- **A missing `Origin` header was an unconditional pass.** The one CSRF control could be skipped by the header simply being absent.
- **The Vercel preview pattern is a CORS allowance, not a CSRF one.** `vercel.app` is a shared domain anyone can deploy to, and a matching origin was allowed to *read* authenticated responses. State-changing requests from previews were already rejected by the CSRF check.
- **Clients:** the website uses cookies and strips Authorization headers; the desktop app uses bearer tokens; the mobile folder contains no API client. So "protect cookie-authenticated requests, exempt bearer ones" covers every real client.
- **The middleware exists twice**, in `api-gateway` and `auth-service`, as two copies of the same logic.

## **2. What Phase 2 Changed**

Backend only. No frontend files touched.

| Change | Effect |
|---|---|
| A missing `Origin` is no longer an automatic pass | A cookie-authenticated write with no `Origin` is now treated as suspicious |
| Bearer-authenticated requests are exempt | The desktop app is unaffected; a bearer token cannot be attached by someone else's page |
| Requests with no auth cookie are exempt | Webhooks, server-to-server calls and anonymous traffic are unaffected |
| `Sec-Fetch-Site` is honoured | When the browser states the request is `same-origin`, `same-site` or user-initiated, it is allowed |
| localhost is dropped from the production allow-list | Both CORS and CSRF. `ALLOW_LOCALHOST_ORIGIN=true` restores it deliberately |
| `FRONTEND_URL` on Render no longer contains localhost | The configuration matches the code |
| Vercel preview matches are logged in production | Identifies who actually relies on it; `CORS_ALLOW_VERCEL_PREVIEWS=false` turns it off once real preview origins are listed explicitly |

**Unchanged:** safe methods (GET, HEAD, OPTIONS) still pass, and a write from an origin that is not allow-listed is still rejected with `403 CSRF_ORIGIN_BLOCKED`, in both modes. No response shape or status code changed.

**Monitor by default.** `CSRF_STRICT_MODE` defaults to `monitor`: the new no-Origin check logs `CSRF would block …` and still serves the request. Nothing is rejected that was not already being rejected before. Switch to `enforce` after reviewing a week of those logs.

## **3. What Phase 2 Does Not Fix**

The Origin check is still a single signal. If any allow-listed origin is ever compromised — a cross-site scripting bug on the live site, a takeover of an allow-listed host — forged requests become possible again. Closing that needs a secret the attacker cannot obtain, which is Phase 3.

## **4. Phase 3 — A CSRF Token (Not Started)**

The gateway would issue a token tied to the session; the website would hold it in memory and send it as a header on every state-changing request; the gateway would reject writes without it.

**The common shortcut does not work here.** The "double-submit cookie" pattern relies on JavaScript reading a cookie the API set. The site and the API are on different domains, so the page cannot read that cookie. Implemented here, it would look correct and protect nothing.

**It needs a frontend change** — roughly ten to twenty lines across two HTTP clients and the auth provider — and security-sprint PRs may not touch `frontend/` (Code Review SOP §1.13). So the backend half ships in log-only mode and only starts enforcing once the frontend half is live. Nothing visible to users changes either way.

## **5. Phase 4 — The Structural Fix (Not Started)**

The only reason the cookies are `SameSite=None` is that the site and API sit on different domains. Moving both under `marketeq.com` would allow `SameSite=Lax`, and the browser itself would block most CSRF before our code runs. Larger change, tied to the custom-domain work, and the version where the defence does not depend on our own middleware being right.

## **6. Configuration**

| Variable | Default | Meaning |
|---|---|---|
| `CSRF_STRICT_MODE` | `monitor` | `monitor` logs the no-Origin check; `enforce` rejects |
| `CSRF_ALLOWED_ORIGINS` | empty | Extra allowed origins, on top of `FRONTEND_URL` |
| `ALLOW_LOCALHOST_ORIGIN` | `false` | Production only; `true` re-trusts localhost origins |
| `CORS_ALLOW_VERCEL_PREVIEWS` | `true` | `false` stops matching preview origins by pattern |

## **7. Verification**

- Full `api-gateway` type check: clean.
- 13 new unit tests (`src/middleware/csrf-origin.middleware.spec.ts`): safe methods pass; allow-listed origins pass; unknown origins rejected in both modes; no-Origin rejected under `enforce` and logged-only under `monitor`; bearer and no-cookie requests exempt; each `Sec-Fetch-Site` value handled; every auth cookie name recognised, and a lookalike cookie name (`my_access_token`) correctly ignored; localhost untrusted in production, trusted outside it, restorable by the escape hatch.
- 36 tests passing in total across the gateway's security code.
- **Not yet done:** deployment, a week of monitor-mode logs, and a run against the live frontend.

## **8. Path to Enforcement**

1. Deploy with `CSRF_STRICT_MODE=monitor`.
2. Watch for `CSRF would block` lines for at least a week. Every one names the method and path. Anything legitimate is a client that needs fixing or exempting — expect old browsers, proxies that strip headers, or an internal tool.
3. Also watch for the preview-origin warning and the localhost warning, and clean up `FRONTEND_URL` accordingly.
4. Switch to `CSRF_STRICT_MODE=enforce`.
5. Schedule Phase 3 with whoever owns the frontend.

## **9. Change Log**

- **2026-09-28** — Phase 1 audit and Phase 2 implementation, in monitor mode, on branch `security/gateway-rate-limiting`. Both copies of the middleware updated; CORS allow-list hardened in `main.ts`; `FRONTEND_URL` cleaned in `render.yaml`. No frontend files changed. Not merged or deployed.
