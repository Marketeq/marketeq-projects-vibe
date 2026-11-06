# **Privileged Access & RBAC — Audit and Implementation**

**Status:** audit complete; steps 1–8 implemented on branch `security/gateway-rate-limiting`, **uncommitted**. **Nothing is pushed.** The branch has no upstream, so all of it exists only in one working tree on one laptop.
**Origin:** security review item — "formal RBAC and privileged-access audit for admin and financial services."
**Model decision:** Option A — platform administration lives in the main user system, and the platform owner is the admin (decided 2026-10-01, §4).
**Verification:** `tsc --noEmit` clean for every service touched; 95 tests passing across the security work; no `frontend/` files changed.

**Role model:** `Infrastructure Roles — Catalogue and Extension Guide.md` — the role list moved from hardcoded names to a capability catalogue on 2026-10-05; admin, developer, qa, product-manager, finance, support.
**Operational companion:** `Privileged Access — Finalisation Checklist.md` — what was removed, and the steps a person still has to take (starting with enrolling the owner in 2FA).

### **The short version**

The review item assumed there was a role system to audit. There is not — no access token carries a role claim, so every role guard on the platform rejects everyone. The audit also found three live authorisation holes that had nothing to do with roles, two of them serious. Those were fixed first. The groundwork for real roles is now in place, and as of 2026-10-01 the role claim is live: privilege escalation is refused outright, and a `platformRole` claim is minted from configuration that no request can reach. Nobody holds a role yet, which is a deliberate empty state rather than a missing piece. Privileged actions are audited, and a role is only carried by a session that passed a second factor.

---

## **1. What the audit found**

### **1.1 Role-based access control does not function**

The access token is built in `apps/auth-service/src/auth/auth.service.ts` (`issueTokens`) and carries only `sub`, `email` and `sid`. There is no role claim. The gateway copies `payload.role` into `req.user`, where it is always undefined.

Four role guards existed — payout, checkout, time-tracking, content-moderation — all reading `req.user.role`. All four fail closed, so nothing was wide open, but every role-protected endpoint rejected everyone.

This was already known to at least one engineer. `offer-service/src/offers/offers.controller.ts` carries the comment: *"no @Roles(CLIENT)/RolesGuard here: role is never set on the JWT"*, with an ownership guard used instead.

### **1.2 "Admin" was not where the item assumed**

- `admin-service` is a nine-line stub returning `{ message: 'Admin Dashboard v2' }`.
- `user.role` is a nullable freeform column used as a profile label (talent / client), not a security role. The only place `'admin'` is written is a **company** membership role, a different concept.
- Real administrative capability sits in the Payload CMS (`cms-service`): its own users collection, its own login, its own roles (`admin`, `developer`, `author`), and a `CMS_API_KEY` for service-to-service writes.

So platform administration happened in a separate identity system from the platform's own users, which is why nobody had noticed the role guards rejecting everyone.

### **1.3 Three authorisation holes, unrelated to roles**

| Severity | Service | Problem |
|---|---|---|
| **Critical** | `wallet-service` | No guard of any kind; user id taken from the request body or URL on four money routes |
| **Critical** | `user-service` | `/users` routes have only a global JWT guard; any signed-in caller can edit, delete or re-role any account and list every user |
| High | `wire-review-service` | Wire-confirmation endpoint unguarded, approver's identity taken from the request body |

---

## **2. Fixed and active**

These two changes do block. Both are deliberately non-breaking for legitimate callers.

### **2.1 wallet-service — ownership enforcement**

The service had no guard on any controller and took the user id from the request:

```
GET  /wallet/:userId/balance      → any userId in the URL
POST /wallet/apply-giftcard       → { code, userId }
POST /wallet/topup-intent         → { userId, amount }
POST /wallet/checkout/use-wallet  → { userId, walletBalanceUsed }
```

It is booted in production (`boot-all.js`, port 3030) and mapped in the gateway, and the gateway only proves the caller is signed in as *somebody*. So any authenticated user could read another user's balance, apply a gift card to another account, create a top-up intent against one, and **spend another user's balance**.

Broken object-level authorization, not a role problem — no amount of RBAC work would have fixed it.

**What was added**

- `src/guards/jwt-auth.guard.ts` — verifies the forwarded access token (RS256 with `AUTH_JWT_PUBLIC_KEY`, falling back to `JWT_SECRET`). Matches the local-guard pattern used by all but two services, rather than `@libs/auth`, which has a known build-path problem.
- `src/guards/wallet-owner.ts` — `ownerFromToken()` returns the caller's own id and ignores whatever the body supplied, logging a mismatch; `assertOwner()` refuses when a path id is not the caller's. Plain functions, so the rule is unit-testable on its own.
- Both controllers derive the user id from the verified token.

**Why it cannot break a legitimate caller:** request shapes are unchanged, and a body naming someone else is ignored rather than rejected. Only the path-based balance route returns 403, because silently substituting the caller's id would change what the URL means. The Stripe webhook controller is untouched and remains signature-verified.

### **2.2 wire-review-service — guarded the wire-confirmation endpoint**

`POST admin/wire-review/resolve` marks a wire transfer confirmed or flagged. It had no guard, and the `adminId` written into the record as the audit trail came from the request body — the caller stated who they were.

It appears unreachable from the internet: the gateway maps the `admin` prefix to `admin-service`, so no external path lands on `admin/wire-review`. That is a routing accident, not a control, and one line in the gateway's prefix map would undo it.

**What was added:** `src/guards/internal-service.guard.ts` requires `INTERNAL_SERVICE_TOKEN` (accepting `x-service-token` or the `x-internal-token` the gateway forwards), fails closed when the token is unset, and compares in constant time. The internal token was used rather than a role check because roles do not exist yet; when they do, this should become a role check so a named human authorises a wire.

### **2.3 user-service — privilege escalation refused**

Any request to a `/users` route that tries to set `role=admin`, or to set `platformRole` at all, is **rejected with a 403**, whoever the target is — including the caller's own record.

This has its own switch, `USER_ACCESS_ESCALATION_MODE`, defaulting to `enforce`, separate from the monitor-mode switch covering the other two checks in §3.1. Splitting them was deliberate:

- The two ownership checks might have legitimate callers, so they need an observation period. **Escalation does not.** No legitimate caller sets a privileged role through a self-service profile route, so there is nothing to learn by watching first.
- Enforcing it is what makes §2.4 safe. Without it, adding a role claim would have handed every signed-in account a one-request path to platform admin.

Backing it out is a single variable if it ever proves wrong.

### **2.4 The `platformRole` claim on access tokens**

Access tokens now carry a `platformRole` claim for accounts that hold a security role. Ordinary tokens are unchanged — the key is omitted rather than set to null.

| | |
|---|---|
| **Minted in** | `auth-service` `issueTokens()` — the single place every token is signed, including refresh |
| **Source** | `PLATFORM_ROLE_ASSIGNMENTS`, format `"<userId>:admin,<userId>:finance"`; valid ids come from `platform-roles.catalog.ts` |
| **Read by** | `platform-role.core.ts` in payout, checkout, time-tracking and content-moderation; carried onto `req.user` by the gateway JWT middleware and each service's own JWT guard |
| **Current holders** | None. The variable is empty, so every role guard still refuses everyone |

**Why configuration and not the `users.platform_role` column.** The column exists (§3.2) and is the eventual home, but two things made it the wrong source today:

1. **Two user tables.** auth-service mints tokens from its own `users` table in the public schema; the column was added to `user_service.users`. Reading it at login means either duplicating the column or calling user-service on every sign-in — work worth doing once someone actually holds a role, not before.
2. **Nothing could grant the first role.** There is no admin UI and no admin account, so a column-backed source would start empty with no way to fill it except hand-written SQL — which was already flagged as an open question.

Configuration solves both and has a property the column does not: **it is unreachable from any HTTP route.** No request, however crafted, can promote an account. The cost is that a role change needs a deploy, which is the right friction while the holder count is one or two.

Migrating later is a change to one function, `resolvePlatformRole()`; the call site does not move. Do it once `USER_ACCESS_MODE=enforce` and there is a deliberate, audited path for writing the column.

**Three independent things now have to be true before an account gains privilege**: configuration names it (not a database row anyone can write), the claim is minted at sign-in (not read from a request), and the profile label is ignored entirely (§3.3). Defeating one is not enough.

### **2.5 Mandatory second factor for role holders**

**A `platformRole` claim is only ever minted on a session that passed a second factor.**

Access tokens come from one function, `issueTokens()`, reached by nine paths: registration, password login, magic link, password reset, Google, LinkedIn, refresh, and 2FA verification. Only the 2FA path proves a second factor, so only that one passes `strongAuth: true`. Everything else defaults to false. If an account named in `PLATFORM_ROLE_ASSIGNMENTS` signs in any other way, **the token is issued normally but carries no role** — they are an ordinary user for that session.

Refresh is the awkward case: it has no password and no code to check, so it has to learn the fact from the token it was handed. The refresh token records it as the standard `amr: ['mfa']` claim, written at 2FA verification and nowhere else. A single-factor session cannot acquire the marker by refreshing, and the refresh token is signed and verified before the claim is read, so it cannot be forged.

**Nothing new had to be built to make 2FA available** — auth-service already has TOTP and SMS enrolment, backup codes, and a partial-token flow that withholds tokens until the code is verified. What was missing was the connection between holding a role and being required to use it. That connection is now the only way a role reaches a token.

Withholding is logged, not silent:

```
platform role withheld: userId=<id> holds role=admin but this session is not
second-factor verified. Enable 2FA on this account and sign in again.
```

**Consequence worth stating plainly:** the owner must enrol in 2FA before the admin role does anything. Signing in with Google will not carry the role, because that path never checks a second factor. Fail-closed is the right default here, but it will look like the role is broken if nobody has written down why.

### **2.6 Security audit log**

Privileged actions are recorded in one consistent shape across services: **who, what, to whom, allowed or denied, from where, when.**

```
AUDIT outcome=allowed actor=<userId> role=admin action=PATCH_/v1/users/<id>
      target=<id> ip=<ip> requestId=<id> at=<iso8601>
```

Two layers, for two different failure modes:

| Layer | What it is | Why both |
|---|---|---|
| **stdout line** | Always written, by every service holding the shared module | No database, no migration, no configuration — works the moment the file is copied in, and keeps working when the database does not |
| **`security_audit.privileged_actions`** | Optional durable sink, registered at bootstrap | Platform log retention is finite. Anything that has to survive an incident review needs a table |

**The allow side is the point.** A denial already surfaces as a 403; a privileged account quietly doing privileged things leaves no other trace, and "what did the admin account do" is the question a review actually asks. Allowed requests from callers with *no* role are not recorded — those are ordinary traffic and logging them would bury the signal.

**Where it is wired:** all four role guards (payout, checkout, time-tracking, content-moderation) on both outcomes, and user-service's `/users` guard, which records every request from a role holder plus every enforced refusal. Monitor-mode observations are deliberately *not* audited as denials — nothing was refused, and recording otherwise would make the log disagree with what happened.

**Design notes on the table:**

- **Its own schema, not `user_service`.** Every service owns a schema and does not read another's. An audit log is the deliberate exception: several services write it and it is read as one timeline, so filing it under `user_service` would make that service the owner of records about payouts and wire transfers. All services share one Postgres instance, so this needs no new connection or credential.
- **`actor` is text, not a foreign key to `users`.** An audit row has to survive the account being deleted — which is itself an auditable act.
- **Append-only by intention.** No update path, no delete path. Enforcing that at the database level needs a role holding `INSERT` and `SELECT` but not `UPDATE` or `DELETE`; that is a deployment change rather than a migration, and is listed in §5 rather than done here.
- **It can never break a request.** The stdout line is written first and unconditionally; the insert is fired without being awaited and every failure is swallowed, reported at most once a minute. Losing an audit line is bad. Failing a payout because the audit table was busy is worse.

Only user-service registers the durable sink so far. The other four get the stdout layer; adopting the table is a one-line bootstrap call each.

**One privileged surface is not covered:** `wire-review-service` has no audit hook, because its wire-confirmation endpoint is guarded by an internal service token rather than by a role, so there is no role guard for the hook to sit in. Confirming a wire transfer leaves no audit record today. It is the first gap to close — see the finalisation checklist.

### **2.7 admin-service reduced to a health check**

`admin-service` had exactly one route:

```
GET /admin/dashboard  →  { "message": "Admin Dashboard v2" }
```

No guard of any kind. The gateway routes `/admin` to it and requires a token, so **any signed-in account could reach it** — harmless given what it returned, but it is an unguarded surface in the `/admin` namespace, which is precisely where things accrete. It also ran `enableCors({ origin: FE_ORIGIN || 'http://localhost:3000', credentials: true })`, repeating in miniature the localhost-trust defect fixed at the gateway.

The route is removed; `/health` remains (the module never actually registered it before). The localhost CORS default is gone rather than narrowed — the service is behind the gateway and has no browser-facing routes left. Nothing in the backend or the frontend referenced the dashboard route; this was verified by search before removal.

**The recommendation is to delete the service entirely.** Under the agreed model, administration happens in the service that owns the data — users in user-service, wires in wire-review-service, payouts in payout-service — behind the role guard, so a privileged action is checked and audited where it takes effect rather than in a separate service that has to be trusted to ask. A standalone admin service would need cross-service calls and its own identity story, which is Option B under a different name.

Meanwhile it costs something to keep: it boots with a 48 MB heap cap, opens a Postgres connection pool with no entities behind it, and registers a RabbitMQ queue it never consumes. On a shared Supabase instance, connections are a finite resource.

Deleting it is four steps, none urgent, all yours to approve:

1. Remove `apps/admin-service/` and its `nest-cli.json` project entry.
2. Remove the `admin-service` row from `boot-all.js`.
3. Remove the `admin` route mapping and `ADMIN_SERVICE_URL` from the gateway's proxy, so `/admin/*` 404s instead of reaching a dead host.
4. Remove `ADMIN_SERVICE_URL` from `render.yaml` and the env examples.

This was left undone deliberately: the service is running in production, and taking a service out of a deployment is your call, not a side effect of a security change.

---

## **3. Added, inert**

These change no behaviour today.

### **3.1 user-service `/users` access guard — the two ownership checks**

`UserController` has no per-route guards, only the global `JwtAuthGuard`. Nothing checks *which* user the caller is:

```
GET    /v1/users          → lists every user (paginated)
GET    /v1/users/:id      → any user
PATCH  /v1/users/:id      → edits any user
DELETE /v1/users/:id      → deletes any user
```

`updateUser` is `Object.assign(user, dto)`, and `UpdateUserDto` is a `PartialType` of `CreateUserDto`, which carries `role?: UserRole` where `UserRole` is `ADMIN | TALENT | CLIENT`. **So any signed-in account can set `role=ADMIN` on any user, rewrite any profile, delete any account, and enumerate the user base.**

The damage is bounded today only because no role guard functions. **It also means adding a role claim to the token first would have converted this into a one-request path from any account to platform admin** — the ordering of the work is what caught it.

| | |
|---|---|
| **Where** | `src/guards/user-access.rules.ts` (pure, testable) and `user-access.guard.ts`, applied at `UserController` |
| **Switch** | `USER_ACCESS_MODE` — `monitor` (default) / `enforce` / `off` |
| **Governs** | `cross-user` and `list-all` only — log-only, nothing is rejected |
| **Exempt** | Service-to-service callers presenting `INTERNAL_SERVICE_TOKEN` — auth-service and the CMS legitimately sync other users' profiles |
| **Left alone** | `TALENT` and `CLIENT` role values, which onboarding sets through this route |

The third violation, `role-escalation`, is **no longer governed by this switch** — see §2.3. These two remain log-only because they plausibly have legitimate callers (an internal tool, a sync path not carrying the service token) and rejecting one blind would break a working flow. **This is the hole that is still open:** a signed-in account can still read, edit and delete other people's records. It can no longer gain privilege by doing so.

### **3.2 The security role column**

**Decision: a new column, `users.platform_role`, not the existing `role`.** `role` is a freeform label meaning talent or client, written by signup and onboarding and exposed by `UpdateUserDto`. Reusing it would make the field a user legitimately sets about themselves the same field that grants administration.

- Migration `1799500000000-AddPlatformRole.ts` — schema-qualified, nullable `varchar(32)`, with a partial index on non-null values so finding admins does not scan the table.
- `user/enums/platform-role.enum.ts` — `admin`, `finance`, `support`. Three rather than one because whoever reviews wire transfers is not necessarily whoever manages content, and separating later is harder than starting separated. Only `admin` is needed for the first milestone.
- Stored as text, not a Postgres enum: the list will grow, an enum needs a migration per addition, and a dropped value breaks reads rather than simply displaying.

**Why it is safe from the §3.1 hole:** `platformRole` appears in no DTO, and user-service runs `ValidationPipe` with `whitelist` and `forbidNonWhitelisted`, so a request carrying it is rejected with a 400 before `Object.assign` sees it. The access rules flag it too, as defence in depth.

**Nothing reads the column yet.** Every row is null.

### **3.3 One role-check implementation**

`guards/platform-role.core.ts`, copied verbatim into payout, checkout, time-tracking and content-moderation, replacing four slightly different versions:

- `resolveCallerRole(user)` — reads the `platformRole` claim, lower-cased, and **nothing else**. The original version also fell back to `role` and `roles[0]`; that fallback was removed when the claim went live (§2.4), because `role` is the profile label an ordinary user can write about themselves. Honouring it would have turned a profile edit into real privilege. Removing it changed no behaviour: no token has ever carried `role`.
- `isRoleAllowed(callerRole, allowedRoles)` — case-insensitive; empty requirement means "any signed-in caller"; no role means refused.
- `logRoleDenial(...)` — one line per endpoint/role pair per minute, naming the endpoint and the roles required.

**Note on rollout mode.** Everywhere else in this security work a new control ships log-only first. That pattern inverts here: these guards currently **deny everyone**, so a log-only version would mean *allowing* everyone — a regression. This change keeps deny-by-default exactly and adds logging, which is what the observation period is for: finding out whether these endpoints are called at all before roles go live.

**Call sites are untouched.** Each service's guard file keeps its original exports — `Roles` + `RolesGuard` class in payout, the `RolesGuard(...roles)` factory in checkout and time-tracking, `AdminGuard` in content-moderation — and delegates to the core.

**Why duplicated rather than imported:** there is no working cross-service import. `@shared/*` is unused scaffolding, and the two services importing `@libs/auth` build to a malformed output path. Same decision, and the same maintenance note, as the CSRF middleware.

---

## **4. The model decision (Option A)**

**Platform administration lives in the main user system.**

| | For | Against |
|---|---|---|
| **A — main user system** (chosen) | One identity; 2FA, sessions and audit logging apply automatically; roles can be named to a person; half the scaffolding already exists | Most work; enabling checks that have silently rejected everyone can break flows that depend on that |
| **B — stay in the CMS** | Matches how things operate today; least immediate work | Two identity systems to keep in step; a content tool becomes the gatekeeper for financial operations; the shared internal token cannot name a person in an audit log |

---

## **5. What remains**

| Step | State | Blocked by |
|---|---|---|
| 4. Role claim in the access token | **Done** (§2.4), sourced from configuration | — |
| Move the claim's source to `users.platform_role` | Not started | §3.1 enforcing, and an audited write path |
| 6. Audit logging for privileged actions | **Done** (§2.6) — stdout everywhere, durable table in user-service | — |
| 7. Mandatory 2FA for privileged roles | **Done** (§2.5) — a role is only minted on a second-factor session | — |
| 8. `admin-service` | **Decided: remove.** Reduced to a health check (§2.7); full deletion awaits your approval | — |
| Enrol the owner's account in 2FA | **Required before the role works at all** | — |
| Audit coverage for `wire-review-service` | Not started — no role guard to hook into; needs the module wired to the internal-token guard | — |
| Register the durable audit sink in the other four services | Not started — one bootstrap line each | — |
| Lock the audit table to append-only at the database level | Not started — a role with `INSERT`/`SELECT` but not `UPDATE`/`DELETE` | Deployment change, not a migration |
| Correlate audit lines with a request id | Not started — the gateway does not issue `x-request-id`; the field is recorded when a caller supplies one | — |
| `contracts-service`'s two further copies of the role logic | Not started | — |
| How the first role is granted | **Answered** — add the account's id to `PLATFORM_ROLE_ASSIGNMENTS` and deploy. The grant is visible in version control and in the deploy history, which a database statement would not have been | — |

### **Path to enforcing the `/users` guard**

1. Deploy in monitor mode (the default).
2. Watch for `WOULD BLOCK [violation]` lines for about a week.
   - `role-escalation` now logs as `BLOCKED` rather than `WOULD BLOCK` and should be **zero**; any line deserves immediate attention.
   - `cross-user` will likely appear from internal flows not carrying the internal token — each is given the token or exempted.
   - `list-all` will fire wherever something enumerates users; those move to an admin path.
3. Fix what appears, then set `USER_ACCESS_MODE=enforce`.
4. **Only then** move the claim's source from configuration to `users.platform_role`.

Step 4 originally read "only then add the role claim". That ordering existed to stop a writable column from becoming a privilege grant. Sourcing the claim from configuration instead removes the dependency, so the claim went in first; what still waits on enforcement is reading the role from the database.

---

## **6. Verification**

- `tsc --noEmit` clean for `auth-service`, `api-gateway`, `wallet-service`, `wire-review-service`, `user-service`, `payout-service`, `checkout-service`, `time-tracking-service` and `content-moderation-service`.
- **New tests:** 8 for wallet ownership, 11 for the `/users` access rules, 9 for the role-check core, 10 for the guard's mode split, 11 for the role-assignment parser, 12 for the audit log, 2 for the second-factor claim. 95 passing across the security work overall, in 10 suites.
- Four tests exist specifically as regression guards: that `resolveCallerRole` ignores the writable `role` field; that escalation is refused with no environment variables set at all; that a throwing or rejecting audit sink never propagates into the request path; and that anything other than an exact `mfa` entry reads as single-factor.
- A scan of the eight money-handling services found no other route taking a user id from the request without a guard; `earnings-service`'s `/balance/:userId` routes are internal and already behind `ServiceAuthGuard`.
- **Not done:** deployment, a week of monitor-mode logs, a live check that `admin/wire-review` is genuinely unreachable from outside, and a live run of the audit migration — the table shape is unexercised against the real database.

---

## **7. Change log**

- **2026-09-30** — Audit completed. wallet-service ownership enforcement and the wire-review guard implemented.
- **2026-10-01** — Option A decided. `/users` access guard added in monitor mode after the routes were found open; `users.platform_role` column, migration and `PlatformRole` enum added; the four role guards unified onto one shared core. Document restructured from append-only notes into this record.
- **2026-10-01** — Privilege escalation moved from monitor to enforce under its own switch; the `platformRole` claim added to access tokens, sourced from `PLATFORM_ROLE_ASSIGNMENTS`; the `role` / `roles[]` fallback removed from the shared role core so the writable profile label can never grant privilege.
- **2026-10-02** — Steps 6–8 under the owner-as-admin model. Security audit log added (shared module, stdout everywhere, durable `security_audit.privileged_actions` table written by user-service) and wired into all five privileged guards. The `platformRole` claim now requires a second-factor session, carried across refresh by an `amr` claim. `admin-service` stripped to a health check, its unguarded `/admin/dashboard` route and localhost CORS default removed; full deletion recommended.
