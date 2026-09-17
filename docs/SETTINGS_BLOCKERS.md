# Settings — Open Blockers

**Verified 2026-09-16** against live code on `feat/settings-unblocked` (PR #593,
draft), with the stack running locally.

Scope is the eight Settings tabs this branch has worked on: Personal Info,
Company Info, Account Recovery, Login & Password, Two-Factor Auth, Devices,
IP Restrictions, Notifications.

Everything below is **blocked on a decision, a credential, or another service** —
not on engineering time on our side. Items we can build ourselves are not listed
here; they are simply being built.

---

## 1. Needs a decision from @CTorres9800

### 1.1 Written approval for the login-frozen files on PR #593

Five files on this branch are CODEOWNERS-owned or match the `Jenkins / Login
Gate` pattern, plus three frozen `.env.*.example` templates that gained **names
only, with empty values**. We proceeded on verbal clearance and would like it
confirmed in writing on the PR. Nothing else on the branch merges until then.

| File | Why |
|---|---|
| `api-gateway/src/proxy/proxy.service.ts` | one line, forwards `user-agent` |
| `auth-service/src/auth/auth.controller.ts` | `PATCH /auth/change-password`, `GET /auth/2fa/status`, recovery-email routes |
| `auth-service/src/auth/auth.service.ts` | `changePassword()`, `getTwoFactorStatus()`, recovery-email logic |
| `auth-service/src/auth/dto/change-password.dto.ts` | new DTO |
| `frontend/service/http/auth.ts` | the matching client methods |

### 1.2 Password history never records the outgoing password — SB-609

`assertPasswordNotReused` is correct, but both `changePassword` **and the
pre-existing `resetPassword`** write only the *incoming* password to
`password_history`. The outgoing one is never stored.

Verified in the database: `Old → New → Old` was **accepted with a 200**, and
registration wrote zero history rows. So the password you just moved away from
is immediately reusable, which defeats forced rotation. The API says *"You
cannot reuse one of your last 5 passwords"*, which overstates what is enforced.

**Why we did not fix it:** login-frozen **and** non-additive — previously
accepted passwords would start being rejected. Your call.

### 1.3 Fingerprint login is not authentication — SB-602

`handleEnableFingerprint` (`settings/[[...tab]]/page.tsx:777`) genuinely calls
`navigator.credentials.create()` against the platform authenticator, and
`lib/webauthn.ts` says at the top that it is not auth. The challenge is
generated in the browser and the credential discarded. **Nobody can sign in with
a fingerprint.**

Blockers for the real thing:

1. The Login Gate pattern is `backend/apps/auth-service/*` — a shell glob that
   spans `/`, so **even a brand-new `webauthn/` module trips it.** There is no
   version of this that avoids gated files.
2. Needs `@simplewebauthn/server` + `/browser`; nothing WebAuthn exists in-repo.
3. Needs a `webauthn_credentials` entity **and a migration**, plus single-use
   challenge storage.
4. **RP ID is domain-bound.** A credential enrolled on `localhost` will not work
   on staging or production, and **Vercel preview URLs change per deploy**. Must
   be env-driven.
5. No disable path, no device list (credentials are per *browser profile*, not
   per device), and no recovery path if the enrolled device is lost — none of
   which have a Figma.

Decision taken on our side, please correct if wrong: **fingerprint replaces the
password step, and 2FA still runs.** A fingerprint proves the device, not the
second factor.

### 1.4 Security Questions have no backend at all — SB-702

Not "partially wired" — **nothing exists on either side.**
`updateSecurityQuestion` (`page.tsx:1054`) edits local React state and nothing
persists it. Greps across `frontend/service/` and `backend/apps/*/src` return no
security-question storage, endpoint, or entity.

Needs a product decision on whether they are a real recovery factor before any
of it is worth building. The modal also still carries Figma lorem ipsum — see
§4.

### 1.5 Backup codes are generated and thrown away

`POST /auth/2fa/enable` returns 10 single-use backup codes. The modal discards
the response (`page.tsx:1176`). They are the only way back in if the enrolled
phone is lost.

There is **no Figma for a backup-codes screen**, so we have not invented one.
Needs a design. Worth treating as urgent: every account enrolling today gets
codes that nobody ever sees.

### 1.6 IP allow-list is not enforced at sign-in — SB-512

Storage, CRUD, CIDR, overlap detection and the 1,000-entry cap all work. Nothing
consults the list during authentication. Until that exists the master switch
persists a preference that **enforces nothing**, which is worse than absent
because the screen implies protection.

### 1.7 Session location — SB-406

The Devices table has a Location column rendering a hardcoded `—`
(`page.tsx:4893`). Needs a privacy decision plus a paid geo-IP provider.

---

## 2. SMS — to be commented out per @CTorres9800

Per CTorres, SMS is not being used yet, so the items below **should be commented
out** rather than built. They are listed for completeness and so nothing is
silently lost when the decision is revisited.

**No SMS code has been changed or removed on this branch** — commenting it out
touches frozen files and is not additive, so it needs the same written clearance
as §1.1.

### 2.1 The entire Two-Factor Auth tab

Designed as an SMS/magic-link flow, and **no control on it calls a backend**:

- "Add Backup Number" (`page.tsx:3163`) — opens a local form only
- "Send Link" (`page.tsx:3240`) — `setIsMagicLinkSent(true)`, nothing sent
- "Resend Link" (`page.tsx:3299`) — no `onClick` at all

There is also a shape mismatch worth recording: the tab is designed as
magic-link while the backend is a code wizard. The working entry point for
two-factor today is **Account Recovery → App Authenticator**, which is fully
built.

### 2.2 Phone Verification badge is cosmetic

`isRecoveryPhoneVerified` is `useState(false)` (`page.tsx:1066`) set to `true`
when a modal closes, and read at `page.tsx:3355`. It is never read from the
server, so the Enabled badge appears once and is **gone on the next reload**.

This is the same class of defect we fixed on App Authenticator — there the flag
was recoverable because `twoFactorEnabled` exists on auth-service. Here there is
**no recovery-phone storage at all**, so it cannot be fixed by reading harder;
the field would have to be built first.

Left alone deliberately: it is SMS.

### 2.3 SMS client methods with no provider

`AuthAPI.GenerateSmsTwoFactor` and `AuthAPI.ResendTwoFactorCode` exist in
`frontend/service/http/auth.ts`, and SMS notification delivery (SB-314) is
listed in the notification catalogue. No SMS provider is configured in any
environment.

---

## 3. Blocked on other services

| Item | Blocker |
|---|---|
| **Inbox notifications** (SB-312) | `messaging-service` emits nothing and will not start locally — `relation "messaging.threads" does not exist` |
| **Offers notifications** (SB-313) | `offer-service` has **no RabbitMQ client at all** |
| **Browser push** (SB-315) | No VAPID keys |
| **Auth-service audit trail** | `settings_audit_logs` covers 10 actions, all in user-service. Password change, session revoke and 2FA changes happen in auth-service, which has no audit service — wiring it crosses into frozen files |

---

## 4. Copy and design gaps — must not ship

- **Figma lorem ipsum is still in three screens**, including the "Torem" typo:
  Security Questions (`page.tsx:3503`) and App Authenticator steps 1–2
  (`page.tsx:3986`, `:3997`, `:4008`).
- **Contact Support has one working channel.** Email Us reaches the documented
  support address; **Call Us, Schedule a Call and Live Chat have no
  destination.** "Schedule a Call" also uses a mail icon in the Figma.
- **The IP Restrictions info box understates what is accepted** — it reads
  *"individual IP addresses or an IP range"*, but CIDR now works. The Add IP
  dialog has a single/range toggle and **no CIDR mode**; CIDR works only by
  typing it into the address field. Adding a mode is a design decision.
- **Invented placeholders needing real copy:** Company Info's five dropdown
  option lists, the six security questions, and four alert strings.

---

## 5. Environment

These block *testing*, not building.

| Variable | State |
|---|---|
| `CLOUDFLARE_R2_ACCESS_KEY_ID` | **empty locally** |
| `CLOUDFLARE_R2_SECRET_ACCESS_KEY` | **empty locally** |
| `BREVO_API_KEY` | **empty everywhere** — never committed, and none of the `~/.config/brevo/*` files named in `docs/MCP_TOOLS_SETUP.md` exist |
| `TWO_FACTOR_ENCRYPTION_KEY` | set locally; **unset on staging and production** |

**R2 is configured on Render**, confirmed by probing the public homepage API —
all images resolve to `pub-4789db6a57d64de3ad7b5e8c316d125b.r2.dev`. So this is
a local-dev gap, but it means **nobody on the team can test avatars or company
logos locally**.

Without a Brevo key, recovery emails only reach the auth-service log via the dev
mock.

`TWO_FACTOR_ENCRYPTION_KEY` is **generatable, not a vendor secret** — the code
does `scryptSync(envKey, 'marketeq-2fa-salt', 32)`, so any random string works
(`openssl rand -hex 32`). Staging and production each need their own value.
**Set it once and never rotate it** — rotating makes every enrolled TOTP secret
undecryptable.
