# **Security Sprint — Status and Handover**

**As of:** 2026-10-02
**Branch:** `security/gateway-rate-limiting` — **nothing is pushed, merged or deployed.** The branch has no upstream, so everything below exists only on one laptop.
**Commit state:** rate limiting and CSRF are committed as `1b132e47` ("wip: gateway rate limiting and CSRF hardening"). Everything after that — privileged access and RBAC, audit logging, the second-factor gate, the role catalogue, the admin-service reduction and SCA — is **uncommitted**: 34 new source files and 18 modified ones.
**Verification across the whole branch:** `tsc --noEmit` clean for every service touched; **95 tests passing** across 10 suites.
**Frontend:** no files under `frontend/` were changed, as the Code Review SOP requires of security-sprint work.

### **The one-line summary**

Three security items have code written. Every control ships **inert** — logging what it would do, blocking nothing — so merging and deploying is safe, and each becomes active by changing one environment variable after reviewing its logs.

---

## **1. Rate limiting (tasklist item #5) — code complete, monitor mode**

The gateway had no request-rate protection of any kind. It now counts requests and can refuse callers who exceed a limit.

| | |
|---|---|
| **Where** | `apps/api-gateway/src/rate-limit/` (6 files), wired in `main.ts` and `api-gateway.module.ts` |
| **Switch** | `RATE_LIMIT_MODE` — `monitor` (default) / `enforce` / `off` |
| **State** | Logs `WOULD_BLOCK …`, rejects nothing |
| **Covers** | Per-IP and per-user limits; stricter buckets for login, password reset, 2FA verify, 2FA send, username check; separate buckets for money-service writes, uploads and webhooks |
| **Storage** | The existing Redis, with an in-memory fallback; no new dependency |

**Notable:** per-IP counting runs before body parsing, because a malformed body is rejected by the parser before middleware runs — found in manual testing, when such requests turned out not to be counted at all.

**To activate:** deploy, confirm the `x-forwarded-for carries N entries` log line matches `RATE_LIMIT_TRUSTED_PROXY_HOPS`, watch a week of `WOULD_BLOCK` lines, then set `enforce`.

---

## **2. CSRF defences (tasklist item #8) — phases 1–2 complete, monitor mode**

Auth cookies are `SameSite=None` in production (the site and API are different domains), so the browser offers no protection and an `Origin` allow-list was the only defence.

| | |
|---|---|
| **Where** | `apps/api-gateway/src/middleware/csrf-origin.middleware.ts` and the identical copy in `apps/auth-service` |
| **Switch** | `CSRF_STRICT_MODE` — `monitor` (default) / `enforce` |
| **State** | New check logs only; rejection of unknown origins is unchanged and always on |

**What changed:** a missing `Origin` header is no longer an automatic pass — it now only passes when the request cannot be forged (bearer token, no auth cookie, or `Sec-Fetch-Site` says same-origin/same-site/none). `localhost` is no longer trusted in production, in either CORS or CSRF, and was removed from `FRONTEND_URL`. Vercel preview origins matched by pattern are now logged in production.

**Audit result worth keeping:** all 249 controller files were scanned; no cookie-authenticated route changes state via GET.

**Remaining:** phase 3 is a CSRF token, which needs a frontend change — see `CSRF Phase 3 — Frontend Change Request.md`. Phase 4 is the same-site cookie migration — see its own guide.

---

## **3. Privileged access and RBAC (tasklist item #11) — part done**

The item assumed a role system to audit. There isn't one: no access token carries a role claim, so every role guard on the platform rejects everyone. The audit also turned up two live authorisation holes that had nothing to do with roles.

### **Fixed and active (these do block)**

**`wallet-service` — any signed-in user could read and spend another user's wallet.** No guard on any controller; the user id came from the request body or URL, on four routes including `wallet/checkout/use-wallet`, which spends balance. Now has a token-verifying guard and derives the user id from the token. Non-breaking by design: request shapes are unchanged and a body naming someone else is ignored rather than rejected, so no legitimate caller can break.

**`wire-review-service` — the wire-confirmation endpoint had no guard**, and took the approver's identity from the request body. Now requires `INTERNAL_SERVICE_TOKEN`, fails closed if that is unset, timing-safe comparison.

**`user-service` — privilege escalation is refused.** Any `/users` request setting `role=admin` or `platformRole` gets a 403, including on the caller's own record. Own switch, `USER_ACCESS_ESCALATION_MODE`, default `enforce` — separate from the monitor-mode switch on the other two checks, because nothing legitimate sets a privileged role through a profile route and there was nothing to observe first.

**The `platformRole` claim exists.** Access tokens carry it for accounts named in `PLATFORM_ROLE_ASSIGNMENTS`; ordinary tokens are unchanged. Sourced from configuration rather than `users.platform_role` on purpose — environment config is unreachable from any HTTP route, so no request can promote an account, and auth-service mints tokens from a different `users` table anyway. **Nobody is assigned a role yet**, so every role guard still refuses everyone. The shared role core now reads `platformRole` and nothing else; the old `role` / `roles[]` fallback is gone, so the writable profile label cannot grant privilege.

**Privileged actions are audited.** One consistent line per privileged decision across five guards — who, what, to whom, allowed or denied, from where, when — written to stdout always, and to `security_audit.privileged_actions` by user-service. The allow side is the point: a denial is already a 403, but an admin quietly doing admin things otherwise leaves no trace. An audit write can never fail the action it describes.

**A role requires a second factor.** The `platformRole` claim is only minted on a session that passed 2FA, carried across refresh by an `amr` claim and nowhere else. **The owner must enrol in 2FA before the admin role does anything** — a password-only or Google sign-in carries no role, by design. auth-service logs `platform role withheld: ...` when that happens, so it will not look like a mystery.

**`admin-service` is reduced to a health check.** Its one route, `GET /admin/dashboard`, returned a hardcoded string behind no guard and was reachable by any signed-in account; it also trusted localhost as a credentialed CORS origin. Both are gone. Nothing referenced the route. Deleting the service outright is recommended and written up, but not done — taking a service out of a running deployment is your call.

### **Added, inert**

**`user-service` `/users` ownership checks — monitor mode.** The routes have only a global JWT guard, so **any signed-in caller can today read, edit or delete any account and list every user**. Re-roling is now blocked (above); the ownership side is still log-only, because these two checks plausibly have legitimate callers and rejecting one blind would break a working flow.

| | |
|---|---|
| **Where** | `apps/user-service/src/guards/user-access.{guard,rules}.ts`, applied at `UserController` |
| **Switch** | `USER_ACCESS_MODE` — `monitor` (default) / `enforce` / `off` |
| **Logs** | `cross-user` and `list-all`. `role-escalation` is enforced separately |
| **Exempt** | Service-to-service callers presenting `INTERNAL_SERVICE_TOKEN` |

**`users.platform_role` column** — migration `1799500000000-AddPlatformRole.ts`, plus a `PlatformRole` enum (`admin`, `finance`, `support`). Separate from `user.role`, which is a profile label a user can set about themselves. Absent from every DTO, so validation rejects any request carrying it. **Nothing reads it yet** — the live claim is sourced from configuration instead, and moving it to this column waits on the ownership checks enforcing.

**One shared role-check implementation** — `guards/platform-role.core.ts`, copied verbatim into payout, checkout, time-tracking and content-moderation, replacing four slightly different versions. Call sites unchanged. Still denies everyone, because no account holds a role, now with a log line naming the endpoint and the roles required.

### **Not started**

Steps 1–8 are done. What is left: enrol the owner's account in 2FA (nothing works without it); register the durable audit sink in the other four services, one line each; lock the audit table to append-only with a database role that lacks `UPDATE`/`DELETE`; delete `admin-service` if you agree; move the role claim's source from configuration to `users.platform_role`, which waits on the ownership checks enforcing. `contracts-service` has two more copies of the role logic that have not adopted the shared core.

---

## **4. Configuration added**

All default to the inert setting. Present in `render.yaml` and both backend env templates.

| Variable | Default | Effect |
|---|---|---|
| `RATE_LIMIT_MODE` | `monitor` | `enforce` starts returning 429 |
| `RATE_LIMIT_TRUSTED_PROXY_HOPS` | `1` | Which `x-forwarded-for` entry is the visitor |
| `RATE_LIMIT_IP_ALLOWLIST` | empty | Never-limited addresses |
| `CSRF_STRICT_MODE` | `monitor` | `enforce` rejects cookie-authenticated writes with no `Origin` |
| `ALLOW_LOCALHOST_ORIGIN` | `false` | `true` re-trusts localhost in production |
| `CORS_ALLOW_VERCEL_PREVIEWS` | `true` | `false` stops matching preview origins by pattern |
| `USER_ACCESS_MODE` | `monitor` | `enforce` returns 403 on cross-user and role-escalation attempts |

Per-rule rate-limit overrides also exist (`RATE_LIMIT_<RULE>_LIMIT` / `_WINDOW_SEC`).

---

## **5. What to do next, in order**

1. **Commit the branch.** Several days of security work exist on one laptop only. A commit is local; pushing the branch changes nothing for anyone else and gives you an off-machine copy.
2. **Review and merge.** The Helmet change from 2026-09-16 is part of commit `1b132e47`; decide whether it belongs in the same PR as the rest.
3. **Deploy in monitor mode** — the default, so a merge is enough.
4. **Read the logs for a week.** Three separate streams: `WOULD_BLOCK` (rate limiting), `CSRF would block`, and `WOULD BLOCK [violation]` (user access). A fourth line, `BLOCKED [role-escalation]`, is already enforcing and should never appear — if it does, investigate it the same day.
5. **Enforce one control at a time**, several days apart, starting with the user-access guard — the hole it covers is the most serious one still open.
6. **Enrol the owner's account in 2FA, then assign the role** — add the account id to `PLATFORM_ROLE_ASSIGNMENTS` and deploy. In that order: the role is inert without the second factor.

---

## **6. Where everything is written down**

| Document | Covers |
|---|---|
| `API Gateway Rate Limiting — Rollout Status.md` | Item #5: threats, decisions, enforcement path |
| `API Gateway — Rate Limiting (Implementation Notes).md` (under `docs/md/API Gateway/`) | Item #5: files, config, testing, operations |
| `CSRF Defences — Rollout Status.md` | Item #8: audit, phase 2, what phases 3 and 4 need |
| `CSRF Phase 3 — Frontend Change Request.md` | The frontend half of the CSRF token |
| `CSRF Phase 4 — Same-Site Cookie Migration Guide.md` | The structural fix, step by step |
| `Privileged Access & RBAC — Audit and Implementation.md` | Item #11: full audit and every step so far |
| `Privileged Access — Finalisation Checklist.md` | Item #11: what was removed, and the steps left to make it live |
| `Company & Team RBAC — Audit.md` | The separate company-scoped permission model: what exists, what is unenforced, and two IDOR holes beneath it |
| `Infrastructure Roles — Catalogue and Extension Guide.md` | The platform role catalogue, and how to add a role or capability |
| `Authorisation Remediation — Open Code Changes.md` | **The work list** — eleven outstanding authorisation changes, with severity, risk and verification for each |
| `Software Composition Analysis — Phase 1 (Baseline).md` | Dependency vulnerability scanning in CI — what phase 1 added and what phases 2–4 need |
| `Software Composition Analysis — Phase 2 (Triage).md` | **The dependency baseline** — 163 findings, 73 reaching production, 4 critical, and what to do about them |
| `Software Composition Analysis — Phase 3 (The Gate).md` | The check that fails a pull request introducing a vulnerable dependency |
| `Software Composition Analysis — Phase 4 (Sustain).md` | The weekly tracking issue, and the ownership question no workflow can answer |
| `Privileged Access — Decision Needed.md` | The Option A decision and its reasoning |
| `.claude/memory/services/*.md` | Per-service notes: api-gateway, auth-service, user-service, wallet-service, wire-review-service |

## **7. Change log**

- **2026-10-01** — Status captured. Rate limiting and CSRF committed as `1b132e47`; nothing pushed.
- **2026-10-07** — SCA phase 4: weekly tracking issue, updated every run, commenting only when the finding set changes; 14-day warning before an accepted finding expires and starts failing builds. Completes the four-phase rollout.
- **2026-10-07** — SCA phase 3: the gate. Fails a pull request on new high/critical runtime findings measured against the base branch, so the existing backlog cannot fail anyone. `sca-override` label as the escape hatch; needs creating in GitHub.
- **2026-10-06** — SCA phase 2: first real baseline captured (163 findings, 73 runtime, 4 critical) and triaged. Found three existing overrides pinning to versions that are themselves vulnerable, one critical. Nothing fixed yet.
- **2026-10-05** — SCA phase 1 added: a report-only dependency scan on pull requests, pushes, and a weekly schedule. Blocks nothing; has never run.
- **2026-10-02** — RBAC steps 6–8 added: privileged-action audit logging, a second-factor gate on the platform role claim, and `admin-service` reduced to a health check. Still nothing committed, merged or deployed.
