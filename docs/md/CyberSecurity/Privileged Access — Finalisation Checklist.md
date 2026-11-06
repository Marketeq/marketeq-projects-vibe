# **Privileged Access — Finalisation Checklist**

**As of:** 2026-10-02
**Covers:** RBAC steps 6–8 — audit logging, mandatory second factor, and the `admin-service` decision.
**Origin:** security review item #11, "formal RBAC and privileged-access audit for admin and financial services."
**Model:** the platform owner is the admin — one privileged account, held by one person.
**Status:** code complete on branch `security/gateway-rate-limiting`, **uncommitted**. **Nothing is pushed.** The branch has no upstream, so all of it exists only in one working tree on one laptop.
**Full technical record:** `Privileged Access & RBAC — Audit and Implementation.md`. This document is the operational companion — what changed, what is gone, and what a person still has to do.

### **The short version**

Administration is now checked, audited, and gated behind a second factor. None of it is doing anything yet, because no account holds a platform role.

**The first finalisation step is enrolling the owner's account in two-factor authentication, and everything else depends on it.** A role can be assigned before then, and it will still grant nothing: the claim that carries it is only minted on a session that passed a second factor. That is deliberate, but it looks exactly like a broken feature to anyone who has not been told.

---

## **1. What was added**

| Change | What it does | Where |
|---|---|---|
| **Security audit log** | One line per privileged decision: who, what, to whom, allowed or denied, from where, when. Written to stdout always; written to a database table by user-service | `guards/security-audit.ts` (five services), `guards/audit-sink.database.ts`, migration `1799600000000` |
| **Audit table** | `security_audit.privileged_actions` — durable record that outlives log retention | user-service migration |
| **Second-factor gate** | A platform role is only ever carried by a session that passed 2FA | auth-service `issueTokens()`, `second-factor.claim.ts` |
| **Audit hooks in every role guard** | Both outcomes recorded — allowed as well as denied | `payout`, `checkout`, `time-tracking`, `content-moderation`, `user-service` |

Two properties worth knowing because they will shape how you read the logs:

- **Allowed actions are recorded, not just refusals.** A refusal already surfaces as a 403. A privileged account quietly succeeding leaves no other trace, and that is the thing a review needs.
- **An audit write can never fail the action it describes.** The stdout line goes first and unconditionally; the database insert is fired without waiting and its failures are swallowed. Losing an audit line is bad; failing a payout because the audit table was busy is worse.

---

## **2. What was removed**

Removal is part of the work, not a side effect. Each of these was a live surface.

| Removed | Why |
|---|---|
| **`GET /admin/dashboard`** and the file behind it (`admin-service/src/admin/admin.controller.ts`) | Returned a hardcoded string behind **no guard of any kind**. The gateway routes `/admin` there and only requires a token, so any signed-in account could reach it. Harmless in what it returned; not harmless as an unguarded route sitting in the `/admin` namespace, which is where things accrete. Nothing in the backend or frontend referenced it — verified by search before deleting |
| **admin-service's localhost CORS default** | It ran `enableCors({ origin: FE_ORIGIN \|\| 'http://localhost:3000', credentials: true })`, making a page on any developer's machine a trusted credentialed origin in production — the same defect that was already fixed at the gateway. Removed outright rather than narrowed, because the service has no browser-facing routes left |
| **The `role` and `roles[]` fallback in the shared role core** | `role` is the profile label (talent/client/admin) that `UpdateUserDto` exposes, so a user can write it about themselves. Treating it as a privilege source would have made editing your own profile a route to platform admin. Removing it changed no behaviour — no token has ever carried `role` — but it closes the path permanently |

**Nothing else was deleted.** `admin-service` itself still exists and still boots; see §4.

---

## **3. Finalisation — what a person has to do**

In this order. Steps 1 and 2 are the ones that make any of it real.

### **Step 1 — Enrol the owner's account in two-factor authentication**

**Do this before assigning the role.** An account that holds a role but has not enabled 2FA is issued an ordinary token with no role on it, and every admin endpoint will refuse it.

The flow already exists in auth-service and needs no new code:

| Step | Endpoint | What happens |
|---|---|---|
| 1 | `POST /auth/2fa/generate` | Returns a secret and a QR code. Scan it with an authenticator app |
| 2 | `POST /auth/2fa/enable` with the 6-digit code | Turns 2FA on and returns backup codes |
| 3 | — | **Store the backup codes somewhere offline.** With one admin account and no second admin to recover it, losing the authenticator means losing administrative access to the platform |

SMS is available instead of an app (`POST /auth/2fa/generate-sms`). An authenticator app is the stronger choice — SMS codes can be intercepted by SIM swap, which is a known attack against exactly this kind of account.

**Verify it took:** sign out and sign in again. The login response should carry `requiresTwoFactor` and a partial token rather than a session.

### **Step 2 — Assign the role**

Add the owner's account id to `PLATFORM_ROLE_ASSIGNMENTS` and deploy:

```
PLATFORM_ROLE_ASSIGNMENTS=<owner-user-id>:admin
```

The id is the account's `users.id` — the same value that appears as `sub` in their token.

The variable lives in `render.yaml` and in both env examples, and is currently empty. It is read when a token is minted, so **the change takes effect on the holder's next sign-in**, not on deploy.

**Why a variable and not a database row:** nothing reachable over HTTP can write it, so no request can promote an account. It also means the grant is visible in version control and in the deploy history, which a hand-written SQL statement would not have been.

**Verify it took:** sign in, complete 2FA, and decode the access token. It should carry `platformRole: "admin"`. If it does not, auth-service will have logged why — most likely `platform role withheld: ... not second-factor verified`, meaning step 1 is incomplete.

### **Step 3 — Confirm the audit migration ran**

`user-service` runs with `migrationsRun: true`, so `1799600000000-AddSecurityAuditLog` is applied automatically when the service starts. There is no manual step in normal operation.

To run it by hand: `./scripts/devops/migrate.sh user-service run`

**This migration has not yet run against a real database**, so the table definition is untested. Watch the `user-service` startup log on the first deploy. If the migration fails, the service still boots and the audit log falls back to stdout rather than taking the service down with it.

**Verify it took:** the table `security_audit.privileged_actions` exists, and `user-service` logs `security audit sink registered` at startup.

### **Step 4 — Lock the audit table to append-only**

The table is append-only by convention — no code updates or deletes rows — which is not the same as the database refusing to let it happen.

An audit trail a privileged user can quietly edit is not an audit trail, so this should be enforced at the database level, by a role that can insert and read but cannot change or remove:

```sql
REVOKE UPDATE, DELETE ON security_audit.privileged_actions FROM <app_role>;
GRANT  INSERT, SELECT ON security_audit.privileged_actions TO   <app_role>;
```

This is a deployment change rather than a migration, because it depends on which database role the services connect as — a Supabase configuration question, not a repository one.

---

## **4. Decisions still waiting on you**

### **Delete `admin-service`**

**Recommended.** It is now a health check with no entities, no business logic and no callers, and it still costs something to keep: it boots with a 48 MB heap cap, opens a Postgres connection pool with nothing behind it, and registers a RabbitMQ queue it never consumes. On a shared Supabase instance, connections are finite.

The deeper reason is the model. Administration belongs in the service that owns the data — users in user-service, wires in wire-review-service, payouts in payout-service — so a privileged action is checked and audited where it takes effect. A separate admin service would need cross-service calls and an identity story of its own, which is the CMS model under a different name — the option that was already rejected.

Four steps:

1. Remove `apps/admin-service/` and its `nest-cli.json` project entry.
2. Remove the `admin-service` row from `boot-all.js`.
3. Remove the `admin` route mapping and `ADMIN_SERVICE_URL` from the gateway proxy, so `/admin/*` returns 404 rather than reaching a dead host.
4. Remove `ADMIN_SERVICE_URL` from `render.yaml` and the env examples.

This was left undone deliberately. The service is live in production, and removing one from a deployment is an operational decision, not a side effect of a security change.

### **Extend audit coverage**

Two separate gaps, in order of importance:

**`wire-review-service` has no audit coverage at all.** It is the only privileged surface that did not receive the shared module, because its wire-confirmation endpoint is guarded by an internal service token rather than by a role, so it has no role guard for the audit hook to sit in. Confirming a wire transfer is arguably the most consequential privileged action on the platform, and it currently leaves no audit record. This is the gap worth closing first.

**The other four services write to stdout only.** `payout`, `checkout`, `time-tracking` and `content-moderation` hold the shared module but no durable sink, so their audit lines live only as long as the platform's log retention. Adding the table is one bootstrap line each — copy `audit-sink.database.ts` and call it from `main.ts`. `payout` matters most, because its actions move money.

Neither is urgent while nobody holds a role and no privileged action can succeed.

### **Correlate audit lines with a request id**

The audit log records `x-request-id` when a caller supplies one. The gateway does not currently issue one, so the field is usually empty. Generating one at the gateway and forwarding it would let a single admin action be traced across services.

---

## **5. What this does not cover**

Stated plainly so it is not mistaken for finished:

- **The `/users` ownership holes are still open.** A signed-in account can still read, edit and delete other people's records. It can no longer gain privilege by doing so, and the attempts are logged, but the hole is real and waits on a week of monitor-mode logs before enforcement.
- **No second admin.** One account, one authenticator, and no colleague who can restore access. The backup codes from step 1 are the only recovery route, which is why storing them offline is not optional.
- **Role assignment requires a deploy.** That is the right amount of friction for a single admin, but it will not scale to a support team. The eventual move is to read the role from `users.platform_role`, which waits on the ownership checks enforcing.
- **No admin interface exists.** There is nothing to log in to as an admin. The role grants access to existing API endpoints and nothing more.
- **Nothing is deployed.** All of the above describes code on a branch on one laptop.

---

## **6. Verification state**

- 95 tests passing across the security work, in 10 suites; `tsc --noEmit` clean for every service touched.
- Four tests exist as deliberate regression guards: the writable `role` field is ignored as a privilege source; escalation is refused with no environment variables set at all; a throwing or rejecting audit sink never propagates into the request path; anything other than an exact `mfa` marker reads as single-factor.
- No `frontend/` files changed.
- **Not verified:** anything requiring a deployment — the audit migration against a real database, the 2FA gate end to end with a real authenticator, and the audit table under real write volume.

---

## **7. Change log**

- **2026-10-02** — Steps 6–8 implemented and this checklist written. Security audit log added across five services with a durable table in `user-service`; the platform role claim gated behind a second factor; `admin-service` reduced to a health check, with full removal recommended and awaiting approval.
