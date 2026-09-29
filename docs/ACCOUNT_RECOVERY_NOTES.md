# Account Recovery — implementation notes and blockers

**Branch:** `account-recovery` · **Verified 2026-09-28** against the stack running
locally (api-gateway, auth-service, user-service all healthy on :4000/:3001/:3002).

Scope is the `/forgot-password` entry point and the six modals behind it.

> **@CTorres9800: §7 is the list of what needs you.** Read §4 first for what
> is still unwired. The flow can be walked end to end, but **most of it
> persists nothing** — including a final screen that tells the user their
> password was changed when it was not, a Call Us screen showing a placeholder
> phone number, and a Call Scheduled screen for a call nobody booked. This is
> fine for review; it must not reach an environment real users can reach.
>
> §3 is now **resolved** — the password reset email sends and delivers for real
> as of 2026-09-28. It is kept because it records the Brevo configuration, which
> template was chosen and why, and the authorised-IP restriction that **will
> break staging and production on deploy** until Render's egress IPs are
> allowlisted.

---

## 1. What was built

`Start account recovery` on `/forgot-password` was a `mailto:` link to
`support@marketeqdigital.com`. It now opens a six-modal flow:

```
Start account recovery → Account Recovery (chooser)
    ├─ Email Verification  → sends the magic link request
    ├─ Security Questions  → Update Password ─┐
    ├─ App Authenticator ─────────────────────┴─→ Confirmation → /sign-in
    └─ Contact Support     → Call Us (screen)
                           → Email Us (form) → mail client → Message Sent
                           → Schedule a Call (form) → Call Scheduled
                           → Live Chat (inert)
```

The authenticator route **skips Update Password**. The Figma ends it at "You
have been successfully authenticated!" with Continue to Dashboard, so proving a
TOTP code is treated as regaining access, not as authorising a password change.
Worth confirming that is intended: it means the authenticator path restores
access without the person ever setting a new password.

Phone Verification is still inert, deliberately — SMS is deprioritised per
CTorres, so nothing in this flow should build toward it.

Everything is composed from `COMPONENTS.md` components — `Dialog`, `Button`,
`Input`, `Label`, `Select`, `Checkbox`, `RadioGroup`, `InputGroup`,
`ErrorMessage`, `SixDigitPinInput` and design-system icons. **No new UI
component was created and no Storybook or shared component source was touched.**

### Figma fidelity

Every value is an exact token; each modal's geometry closes on its own
arithmetic.

| Modal | Figma | Built |
|---|---|---|
| Account Recovery | 650x580, pad 50 | **700x630, pad 75** — see §5 |
| Email Verification | 484x372, pad 50, gap 32 | `50+152+32+36+32+20+50 = 372` |
| Security Questions | 650x646, pad 50, gap 50 | `50+460+50+36+50 = 646` |
| Contact Support | 500x502, pad 50, gap 24 | `50+76+24+302+50 = 502` |
| Call Us | 500x280, pad 50, gap 32 | `50+76+32+20+32+20+50 = 280` |
| Email Us | 650x770, pad 50, gap 50 | **650x702** — see §5 |
| Schedule a Call | 650x626, pad 50, gap 50 | `50+440+50+36+50 = 626` |
| Message Sent / Call Scheduled | 371x258, pad 50 | `50+158+50 = 258` |
| App Authenticator | 680x444, pad 50, gap 32 | `50+276+32+36+50 = 444` |
| Update Password | 592x582, pad 50, gap 50 | `50+396+50+36+50 = 582` |
| Confirmation (both) | 420x490, pad 50, gap 32 | `50+180+32+110+32+36+50 = 490` |

Colours all map to existing tokens: `#306CFE`→`primary-500`,
`#EAECF0`→`gray-200`, `#667085`→`gray-500`, `#22376B`→`dark-blue-400`,
`#D0D5DD`→`gray-300`, `#98A2B3`→`gray-400`, `#344054`→`gray-700`,
`#E8EEFF`→`primary-50`, `#F6F8FE`→`primary-25`, `#FDA29B`→`error-300`,
`#F04438`→`error-500`, `#D1FADF`→`success-100`, `#ECFDF3`→`success-50`,
`#12B76A`→`success-500`.

Several design-system components matched the Figma with **zero overrides**:
`<Button size="sm">` is `h-9`/`py-2`/`px-[14px]` with `shadow-xs` on `filled`;
`Checkbox variant="circular"` already fills `primary-500` when checked;
`RadioGroupItem size="sm"` is 16x16; `Input` and `SelectTrigger` are both `h-11`.

### Component choices worth recording

- **`Select`, not `Listbox`, in Security Questions.** `Listbox` renders its
  options inline and is clipped by a scrolling ancestor — the bug this same
  modal hit in Settings. `SelectContent` is portalled at `z-50`.
- **`RadioGroup`, not two checkboxes, on Password Updated.** The Figma names
  those layers `_Checkbox base`, but the options are mutually exclusive;
  checkboxes would let someone pick "stay logged in" *and* "sign out
  everywhere".
- **Update Password is built inline rather than reusing `UpdatePasswordForm`.**
  That component is a page-level form carrying its own wrapper padding and no
  fixed height, so it cannot hit 592x582, and `components/*.tsx` is read-only.
  Only its validation helpers (`containsOneNumber` and friends, from
  `@/utils/functions`) are shared, so the rules stay identical to
  `/reset-password`.
- **The phone field is sized by a CSS variable, not props.**
  `styles/globals.css` sets `--react-international-phone-height` to `size.10`
  (40px) and the font to 14px, so `PhoneNumberInput` renders 4px shorter than
  every other field. The Figma specifies 44px, so the variable is re-set on a
  local wrapper — **not globally**, because the same variable drives the
  Settings phone inputs and changing it there is a design-system decision.
  Worth raising: 40px is now the odd one out against a 44px input scale.
  The variable covers the country selector and the text input together, so the
  input text is lifted to the Figma's 16px on its own (`!text-base`) while the
  country code keeps the inherited 14px.
- **Security Questions reuses the Settings question list and completeness rule**
  verbatim. The list is duplicated rather than imported because the Settings
  copy lives inside a page component; the two should move to one shared module
  once this gains a backend.

### Deliberate deviations from the mockup

1. **No lorem ipsum.** "Rorem ipsum…", "Torem ipsum…", "Porem ipsum…" and
   "Short description here" are all replaced with real copy. **Every replacement
   is invented and needs product review** — see §5.
2. **Typo not reproduced.** The Figma reads "We sent a magic link **sent** to
   the email". Built as "We sent a magic link to the email", matching the
   wording already approved in `MagicLinkSentShowcase`.
3. **Supporting text is `gray-500`.** The Figma specifies `#667085`; the older
   `MagicLinkSentShowcase` uses `dark-blue-400`. Followed the Figma.
4. **Two security question pairs, not three** — see §5.
5. **Schedule a Call gets a calendar icon, not the Figma's envelope.** The
   Figma repeats row 2's envelope on row 3, which reads as a slip rather than
   intent — two different actions would carry the same glyph. Drawn with
   `Calendar`. Revert if it was deliberate.
6. **Live Chat keeps the Figma's phone glyph.** The icon geometry is
   tall-and-narrow (`Smartphone`), not a speech bubble. Followed as drawn,
   since chat-on-mobile is a defensible reading — unlike (5), which is not.
7. **Email Us is 702 tall, not the Figma's 770.** Requested: 770 read as too
   tall on a laptop. The 68px comes entirely out of the message box
   (188 → 120), which is the only element with slack — width, padding, gaps,
   labels and the three single-line fields are untouched. Note the two
   screenshots that prompted this were the same design at different render
   scales (identical 1.19 aspect ratio in both); the change is a deliberate
   deviation, not a correction.
8. **Preferred Time placeholder is `HH:MM AM/PM`, not the Figma's
   `MM/DD/YYYY`.** The Figma reuses the date placeholder on the time field,
   which is the same class of slip as the duplicated envelope in (5). The clock
   icon beside it is drawn as specified.
9. **Preferred Date is a text input, not the `DatePicker` component.** The
   Figma draws a 44px field with a trailing 16px calendar glyph and a typed
   `MM/DD/YYYY` placeholder. `DatePicker` is a 40px Button+Popover with a
   leading indicator, a hardcoded trailing chevron and `LLL d, yyyy`
   formatting — it cannot be made to match without editing the component, which
   is read-only. Following the Figma costs a real picker; worth a decision,
   because typed dates need parsing and validation the current field has not
   got. Same applies to `TimeField`, which is segmented rather than a single
   placeholder field.

---

## 2. The transparent overlay

Per request the modals use `dialogOverlay={<DialogOverlay className="bg-transparent" />}`
so the Marketeq header stays visible. `bg-white` was tried first and rejected —
the overlay is `fixed inset-0 z-50`, so any opaque colour paints over the header
too.

With no dim, the reset form behind showed through. That is solved by hiding the
page body while either modal is open:

```tsx
const isRecoveryFlowOpen = isRecoveryOpen || isEmailVerificationOpen
// ...
className={cn("py-10 px-5 …", isRecoveryFlowOpen && "invisible")}
```

`visibility` rather than unmounting, because the trigger lives in that subtree
and Radix restores focus to it on close. `DialogContent` is portalled to
`document.body`, so it is unaffected.

**Leftover:** the chooser is still **700x630 instead of the Figma's 650x580**.
It was enlarged to work around the form peeking over its top edge, before the
`invisible` fix made that unnecessary. It can go back to 650x580 / pad 50 —
left as-is pending a look.

---

## 3. RESOLVED — the password reset email now sends

**Configured and verified live on 2026-09-28.** `POST /auth/forgot-password`
now delivers a real email. Brevo's own event log for the test send:

```
21:13:37  requests    seanstest123@gmail.com  'Reset your password'
21:13:38  delivered   seanstest123@gmail.com
21:14:01  opened      seanstest123@gmail.com
21:14:17  clicks      seanstest123@gmail.com
```

Requested to delivered in about one second, then opened and the reset link
clicked. The rest of the request was already working before this: an RS256
reset token is issued with a 24h expiry (`exp - iat = 86400`, exactly what the
modal promises) and `passwordResetVersion` is rotated so older links stop
working.

### What was set

| Variable | Value | Where |
|---|---|---|
| `BREVO_API_KEY` | `xkeysib-…` (89 chars) | `backend/.env` — **gitignored, local only** |
| `BREVO_PASSWORD_RESET_TEMPLATE_ID` | `2` | `backend/.env` |
| `BREVO_FROM_EMAIL` | `support@marketeqdigital.com` | already set |
| `BREVO_FROM_NAME` | `Marketeq Projects` | already set |

`BREVO_PASSWORD_CREATED_TEMPLATE_ID` is still empty and does **not** need to be
set — `sendPasswordCreatedEmail` falls back to hardcoded HTML when it is absent.
Only the reset path had a hard guard.

### Which template, and why

The account has **two active password-reset templates**, both using the same
`params.firstName` / `params.resetUrl` and the same verified sender:

| id | Name | Created | Modified | Tag |
|---|---|---|---|---|
| **2** | `Marketeq — Password Reset` | 2026-04-07 | 2026-08-12 | `password-reset` |
| 7 | `Password Reset` | 2026-08-12 | never | *(empty)* |

**Id 2 is the correct one.** Its tag matches the `tags: ['password-reset']` that
`BrevoService.sendPasswordResetEmail` sends, and it has been maintained since
April. Id 7 was created 16 hours after id 2 was last edited, never touched
again, has an empty tag and a default reply-to — an abandoned duplicate.

> **Worth a decision from @CTorres9800:** template 7 should probably be deleted.
> Two near-identical active reset templates is how the wrong one eventually gets
> wired up.

### Brevo account constraints found while configuring

1. **Authorised-IP restriction is ON.** The first call failed with
   `401 unauthorized — "unrecognised IP address …"`. Any machine or host
   calling Brevo must be added at
   `https://app.brevo.com/security/authorised_ips` first.
   **This will break staging and production on deploy** — Render's egress
   addresses are different from a developer's and are not on the list.
   Allowlist both IPv4 and IPv6: the request went out over IPv6 here, and
   curl and Node do not always pick the same stack, so allowlisting one
   gives an intermittent 401 that looks random.
2. **Sender is verified.** `support@marketeqdigital.com` is sender id 2,
   `active: true`, so no sender-validation work is needed.
3. **The account is on the free plan — 300 emails/day.** Fine for dev; worth
   knowing before any bulk or load testing.

### The swallowed failure is still there

`auth.service.ts:647` still wraps the send in a `try/catch` that logs and
continues, so `forgotPassword` returns `accountFound: true` whether or not the
email went out, and the UI states *"We sent a magic link to …"* either way.

That is **pre-existing behaviour, not introduced here**, and it is now benign
locally because the send genuinely works. It stops being benign the moment an
environment has the vars missing, the IP not allowlisted, or the daily quota
exhausted — the failure is invisible to the user and to the API, and appears
only in the auth-service log.

**Still needed from @CTorres9800:** the same two variables set on Render for
staging and production, and Render's egress IPs added to the Brevo allowlist.
Until then, those environments still claim to send and do not.

### Testing without Brevo

`NODE_ENV=development` makes the response include the working link, which is
still the fastest way to exercise the flow without spending quota:

```json
{ "accountFound": true, "reset_url": "http://localhost:3000/reset-password?token=…" }
```

---

## 4. BLOCKER — what is NOT wired to a backend

The `/forgot-password` recovery flow now runs end to end as screens, and can be
walked start to finish for review. **Most of it persists nothing.** The table is
exhaustive; anything not listed here is real.

| Step | Works? | What actually happens |
|---|---|---|
| Account Recovery chooser | UI only | Email and Security Questions open; the other three rows are inert |
| Email Verification | **real** | Calls `POST /auth/forgot-password`, issues a real 24h token, rotates `passwordResetVersion` — **but the email never sends**, see §3 |
| Security Questions | **UI only** | Answers are not checked against anything |
| Update Password | **UI only** | **The password is not changed** |
| Password Updated | **UI only** | Confirms a change that did not happen |
| "Sign out of all other devices" | **UI only** | The choice is collected and discarded |

### 4.1 Security questions cannot be verified — nothing exists

Confirmed 2026-09-22 by searching `feat/settings-unblocked`, which carries all
20 commits of the Settings work. The phrase "security question" appears in
exactly two files: `docs/SETTINGS_BLOCKERS.md` and the Settings page UI.

**No entity, no migration, no route, no client API, on either branch.** Searched
`securityQuestion`, `security_question`, `recovery question`, `kba` and
`knowledge-based`; every hit was a false positive (`kba` matches inside
`fallbackBase`, and a listings migration has `recentQuestions` for job
applications).

`handleSecurityAnswersSubmit` therefore advances **without checking anything.**

### 4.2 The password is never changed

`handleUpdatePasswordSubmit` opens the confirmation screen and writes nothing.
Every write path into `resetPassword` requires a token proving identity, and the
security-question route issues none, so there is nothing to authorise the change
with. The confirmation screen then states the password was updated — **it was
not.** This must not reach an environment real users can get to.

### 4.3 The session choice is discarded

Applies to both terminals — the confirmation screen is shared, so the same
unwired radio group is shown after a password reset and after an authenticator
pass.

"Sign out of all other devices" would call `AuthAPI.RevokeAllOtherSessions`,
which needs a session this unauthenticated flow does not have.
`handleContinueToDashboard` sends the person to `/sign-in` rather than a
dashboard, because there is no session to land in.

### 4.4 The authenticator code is never verified

`handleAuthenticatorSubmit` advances to the confirmation screen without
checking the six digits, so **anything gets you in** — including an empty
field. Two separate things block a real check:

**There is no route it can call.** Verifying means POSTing the code plus the
address from the reset form to something that loads that user's TOTP secret and
validates the time window. `auth-service` already exposes `POST /auth/2fa/verify`
(`AuthAPI.VerifyTwoFactor`), but it requires a `partialToken` issued by a
*completed* login — which nobody holds in a forgotten-password flow. So the one
endpoint that checks TOTP codes is unreachable from here by construction; this
needs its own unauthenticated route keyed on the email.

**The digits are not readable on the client either.** `SixDigitPinInput`
(`components/ui/pin-input/pin-input.tsx`) owns its `@zag-js/pin-input` machine
internally and exposes no value callback — extra props spread onto the root
`div`, not the machine. So the page cannot see what was typed, and Submit cannot
even be gated on six digits being present. It is enabled unconditionally, which
is why the Figma's `opacity: 0.5` disabled state is not reproduced.

Gating Submit needs `onValueChange` / `onValueComplete` plumbed through
`PinInput`. That is a Storybook design-system change and therefore
@CTorres9800's call, not something to work around locally — a page-local copy of
the component would be a COMPONENTS.md violation.

### 4.5 Contact Support: Email Us and Schedule a Call now reach the backend

**Both send for real as of 2026-09-28.** The `mailto:` handoff is gone.

| Row | Behaviour |
|---|---|
| Email Us | `POST /support/messages` → relayed to the support inbox over Brevo |
| Schedule a Call | `POST /support/call-requests` → relayed to the support inbox |
| ~~Call Us~~ | **commented out** 2026-09-29 per @CTorres9800 — SMS/phone not in use |
| ~~Live Chat~~ | **commented out** 2026-09-29 per @CTorres9800 — no provider |

**Only the two working rows are shown.** Call Us and Live Chat are commented out
of `SUPPORT_OPTIONS`, not deleted, so restoring either is a one-line change.
Commenting Call Us also removed the last screen in this flow that displayed a
fabricated value to a user — the placeholder phone number. The Call Us modal
markup is still in the file but is now unreachable.

**Phone Verification is commented out of `RECOVERY_OPTIONS` too**, same date and
same reason: SMS is not in use, so the row had no working route behind it. This
matches how the SMS paths in Settings were handled.

**What was built.** `notification-service` gained a `SupportController` at
`@Controller('support')` with two endpoints, backed by a `SupportService` that
uses the Brevo client the service already had. The gateway routes the `support`
prefix to it (`SERVICE_PREFIX_MAP` + `serviceMap`) and lists both paths in
`PUBLIC_EXACT_ROUTES`.

**Why they are public.** Whoever needs Contact Support is locked out of their
account by definition and has no token to present — the same reasoning that
makes `/auth/forgot-password` public. Note the gateway allowlist alone is not
sufficient: notification-service applies `JwtAuthGuard` globally, so the
controller also carries `@Public()`. Missing either one produces a 401 that
looks like a routing bug.

**Because they are public, they are a mail relay.** Both are per-IP rate
limited in `SupportService` (5 per 15 minutes, `SUPPORT_RATE_LIMIT` /
`SUPPORT_RATE_LIMIT_WINDOW_MS`), mirroring auth-service's password-reset
limiter. Verified: the 5th request in a window returns 429.

> **The limiter is in-memory, so it is per-instance and resets on deploy.** It
> stops a naive loop, not a distributed flood, and on Render with more than one
> instance the effective limit is 5 × instances. A shared Redis bucket is the
> real fix. Redis is already a dependency of this stack.

All input is length-capped and validated with `class-validator`, and escaped
before being interpolated into the HTML a support agent opens — every field is
attacker-controlled.

**Schedule a Call is a request, not a booking.** Nothing is reserved in any
calendar; the date and time are relayed as the free text the form collected,
with no timezone (§4.6). The confirmation screen must not promise more than
that.

Both Submits are properly gated — all fields required, address parsed with
`zod`, phone with `isPhoneValid` — so the Figma's `opacity: 0.5` disabled state
is reproduced, unlike the authenticator's (§4.4).

**Call Us has a screen** (500x280) but shows a placeholder number —
`SUPPORT_PHONE_PLACEHOLDER`. There is no support number anywhere in this repo,
so the Figma's example is what renders. It is deliberately plain text rather
than a `tel:` link, so it cannot be dialled by accident. **This is the most
dangerous string in the flow**: unlike the other stubs it looks entirely real,
and a person locked out of their account will try it. Replace it or drop the
row before this reaches anyone.

**Schedule a Call has a form (650x626) and books nothing.** Unlike Email Us
there is no `mailto:` fallback worth having — a booking has to land in a
calendar, not an inbox — so Submit reserves nothing and tells no one, then opens
a screen saying the call is scheduled. **That is the same class of untruth as
the password screen in §4.2** and must not reach real users.

Its Submit is properly gated: name, a parsed address, a real number via
`isPhoneValid` (the same rule Settings enforces), and both preferences.

Live Chat still raises a toast saying it is not connected:

| Row | Needs |
|---|---|
| Call Us | **A real number.** The screen exists; the number on it is the Figma's `+1 (123) 555-1212`. |
| Email Us | A support-ticket endpoint, plus the Brevo config from §3. Works via `mailto:` handoff until then. |
| Schedule a Call | A scheduling integration. The form exists; nothing is reserved. `scheduling-service` (:3024) exposes nothing for unauthenticated support booking. |
| Live Chat | A chat provider. Ably carries in-app messaging between users, not support. |

A toast is a placeholder, not a design — the Figma draws all four rows as
equals. Either wire them or drop the rows; dead entries on a screen someone
reaches *because they are locked out* are worse than fewer working ones.

### 4.6 Preferred Date and Preferred Time have no picker

Schedule a Call collects both as **free text**. They are `Input` fields with a
trailing calendar / clock glyph and typed placeholders, because that is what the
Figma draws — a 44px field with a 16px icon and `MM/DD/YYYY`.

The design system has purpose-built controls, and **neither can be made to match
that drawing without editing read-only component source**:

| Component | What it actually renders | Why it does not fit |
|---|---|---|
| `DatePicker` (`@/components/ui`) | 40px Button + Popover calendar | Indicator is **leading**, not trailing; a `ChevronDown` is hardcoded via `rightIcon`; value formats as `LLL d, yyyy`, not `MM/DD/YYYY`; 40px against a 44px field scale |
| `TimeField` (`@/components/ui`) | Segmented hh / mm / AM-PM inputs | Segments, not a single placeholder field. No single-input variant |

**What this costs today.** Nothing validates either value. `canScheduleCall`
only checks the strings are non-empty, so `99/99/9999` and `banana` both pass.
There is no parse, no "not in the past" rule, no business-hours rule, and no
timezone — the Figma names neither a timezone control nor a stored offset, so a
booking has no unambiguous instant attached to it.

**This has to be resolved before the booking endpoint in §4.7 is built**, since
that endpoint's payload depends on it. Three ways out, in order of preference:

1. Add trailing-indicator support to `DatePicker` and a single-field variant to
   `TimeField` — a Storybook change, so @CTorres9800's call.
2. Accept `DatePicker`/`TimeField` as they render and deviate from the Figma.
3. Keep the text inputs and add parsing plus validation here. Cheapest now,
   and the one that puts a malformed date into a real calendar later.

### 4.7 Everything this tab needs from the backend

Consolidated list. Nothing below exists today — every row was searched for on
both `account-recovery` and `feat/settings-unblocked`.

| # | Need | Type | Blocks | Owner |
|---|---|---|---|---|
| 1 | ~~`BREVO_API_KEY` + `BREVO_PASSWORD_RESET_TEMPLATE_ID`~~ **done locally 2026-09-28**; still needed on Render staging/production, plus Render egress IPs on the Brevo allowlist | config | Email Verification (§3) | @CTorres9800 |
| 2 | `GET /auth/recovery/security-questions` | endpoint | Security Questions (§4.1) | backend |
| 3 | `POST /auth/recovery/security-questions/verify` | endpoint | Security Questions → Update Password | backend |
| 4 | `POST /auth/recovery/authenticator/verify` | endpoint | App Authenticator (§4.4) | backend |
| 5 | Reset token accepted by `resetPassword` | contract | Update Password actually saving (§4.2) | backend |
| 6 | Session revocation without a session | design | "Sign out of all other devices" (§4.3) | backend |
| 7 | `POST /support/messages` + a Brevo template | endpoint | Email Us (§4.5) | backend |
| 8 | `POST /support/call-requests` | endpoint | Schedule a Call (§4.5) | backend |
| 9 | A real support phone number | config | Call Us (§4.5) | @CTorres9800 |
| 10 | A live-chat provider | integration | Live Chat (§4.5) | product |

Not backend, but blocking the same screens:

| # | Need | Type | Blocks |
|---|---|---|---|
| 11 | `onValueChange` on `PinInput` | design system | Gating the authenticator's Submit (§4.4) |
| 12 | Trailing-indicator `DatePicker` / single-field `TimeField` | design system | Validating a booking (§4.6) |
| 13 | Is a security question an acceptable recovery factor? | product | Whether (2) and (3) are built at all |

#### The three recovery endpoints

Keyed on the email from the reset form — the same source the email step uses:

1. **`GET /auth/recovery/security-questions?email=…`** → which questions that
   account set, so the modal shows theirs rather than all six. **Must respond
   identically for unknown emails**, or it becomes an account-existence oracle.
2. **`POST /auth/recovery/security-questions/verify`** → `{ email, answers[] }`.
   On a pass, returns a short-lived reset token that `resetPassword` accepts, so
   Update Password has something to authorise with.
3. **`POST /auth/recovery/authenticator/verify`** → `{ email, code }`. Loads
   that account's TOTP secret, validates the window, and on a pass returns the
   same short-lived reset token as (2). Needed because `/auth/2fa/verify`
   demands a `partialToken` from a completed login, which this flow never has.
   **Must respond identically for unknown emails and for accounts with no
   authenticator paired**, for the same oracle reason as (1) — and it needs the
   same rate limiting as (2), since it also ends in a password reset.

Storage requirements:

- Answers **hashed, not encrypted** — they are only ever compared, never read
  back. Same argument as passwords.
- Normalised for case and surrounding whitespace before hashing.
- Rate limiting and lockout per account **and** per IP. These are
  unauthenticated endpoints that end in a password reset; without a lockout they
  are a brute-force target against a small answer space.
- A product decision first on whether security questions are an acceptable
  recovery factor at all — they are weak, and this is the second time that
  question has been raised (SB-702).

#### The two support endpoints

Both are unauthenticated and both accept free text from someone who is not
signed in, so both need spam protection and rate limiting per IP before they go
anywhere near production.

4. **`POST /support/messages`** → `{ firstName, lastName, email, subject,
   message }`. Needs its own Brevo template, so it carries the same dependency
   as (1). Replaces the `mailto:` handoff described in §4.5.
5. **`POST /support/call-requests`** → `{ name, email, phone, date, time }`, and
   **the payload shape depends on resolving §4.6 first** — as free text there is
   no unambiguous instant to store, and no timezone is captured anywhere in the
   Figma. `scheduling-service` (:3024) is the natural home but exposes nothing
   for unauthenticated booking today.

Neither has an agreed destination: whether a support message becomes an email,
a ticket in a helpdesk, or a row in a table is an open product question.

---

## 5. Still to build

Every chooser row except one now has its screens. What they lack is the backend
in §4.7.

| Row | Screens | State |
|---|---|---|
| Email Verification | built + **sending** | Real email delivers as of 2026-09-28 (§3); Render envs still unset |
| Security Questions | built | Answers never checked (§4.1) |
| App Authenticator | built | Code never checked, Submit ungateable (§4.4) |
| Contact Support | built + **sending** | Email Us and Schedule a Call reach the support inbox; Call Us and Live Chat commented out per @CTorres9800 (§4.5) |
| ~~Phone Verification~~ | **removed from the chooser** | Commented out of `RECOVERY_OPTIONS` 2026-09-29 per @CTorres9800 — SMS not in use. Uncomment to restore |

Also outstanding:

- The chooser modal is **700x630 rather than the Figma's 650x580.** It was
  enlarged to stop the page behind peeking through the transparent overlay,
  before hiding the page body solved that properly. It can go back.
- The Security Questions modal shows **two** question/answer pairs. The Figma
  draws **three** (six labelled fields at 130/85/132/85/133/85, plus a
  scrollbar). Dropped to two on request 2026-09-22 — two pairs come to exactly
  `4*70 + 3*24 = 352`, which fills the field box with nothing cut off.
- Copy invented and needing product review: the chooser's supporting text, the
  Security Questions supporting text, the Update Password confirmation copy,
  and both session-choice descriptions. All replaced Figma lorem ipsum
  ("Torem ipsum…", "Porem ipsum…", "Short description here").
- `UpdatePasswordForm` in `components/` orders its rules 8 characters →
  uppercase → lowercase; the Figma wants lowercase → uppercase. The recovery
  modal is built inline and follows the Figma, so **the two now differ.**
  Reconciling means editing a read-only shared component — @CTorres9800's call.

---

## 6. Wiring the rest of this tab to the backend

Where the flow stands after 2026-09-28, and what each remaining piece needs.

### 6.1 Working end to end

| Path | Endpoint | Verified |
|---|---|---|
| Reset email | `POST /auth/forgot-password` → Brevo template 2 | delivered, opened, clicked |
| Password changed notice | fires inside `resetPassword` | sent, logged by Brevo |
| Email Us | `POST /support/messages` | `201` from Brevo, real message id |
| Schedule a Call | `POST /support/call-requests` | `201` from Brevo, real message id |
| Reset itself | `POST /auth/reset-password` | password changed, token single-use |

### 6.2 Still not wired, in dependency order

**1. Security questions (§4.1) — blocked on a product decision, not code.**
Nothing stores questions or answers: no table, no endpoint, no entity. Before
building it, someone has to decide whether security questions are an acceptable
recovery factor at all — they are widely considered weak, and this one currently
hands out a password change with no second factor. If the answer is yes it needs
a table, a hashed-answer column, `GET /auth/security-questions` and
`POST /auth/security-questions/verify`, and the verify endpoint must issue the
same kind of short-lived reset token the email flow uses. **Owner: @CTorres9800
/ product.**

**2. Update Password from the questions route (§4.2) — blocked on 1.**
`handleUpdatePasswordSubmit` writes nothing and then claims success. It cannot
be fixed independently: every write path into `resetPassword` requires a token
proving identity, and the questions route issues none. Once 1 issues a token,
this becomes a normal `POST /auth/reset-password` call and the screen stops
lying. **This is the single most important untruth left in the flow.**

**3. Authenticator verification (§4.4) — needs a new endpoint *and* a component change.**
The code is accepted without being checked. The TOTP machinery exists —
`otplib`, a per-user secret, and `otplib.verifySync` — but **the existing
`POST /auth/2fa/verify` cannot be reused**: it takes a `partialToken` issued by
the login flow, and someone recovering an account has never logged in. Recovery
needs its own endpoint taking an email plus a code, which on success issues the
same short-lived reset token the email flow uses.

The second blocker is frontend: `SixDigitPinInput` exposes no value callback, so
the page cannot read what was typed or gate Submit. That is a Storybook change
(`onValueChange` on `PinInput`) and therefore **@CTorres9800's call**. Also still
open: whether this route should skip Update Password, as the Figma draws it.

**4. Session revocation (§4.3) — NOT backend work; the endpoint already exists.**
The confirmation screen's "sign out other devices" choice is discarded, but
`DELETE /auth/sessions?currentSessionId=<id>` ("revoke all sessions except
current") is already implemented and guarded. `resetPassword` returns both a
valid access token and the new `sessionId`, so the caller has everything the
endpoint needs. This is frontend wiring only.

**5. Call Us (§4.5).** The number on screen is a placeholder constant. **This
needs a real support number or the row must be removed** — it is the one
remaining screen that shows something fabricated to a user.

**6. Live Chat (§4.5).** Inert, and nothing in the stack provides chat to a
logged-out visitor. Needs a provider decision (Intercom, Crisp, etc.) before
any code.

**7. Date and time pickers (§4.6).** Both are free-text inputs, so `99/99/9999`
and `banana` both pass, and no timezone is captured anywhere. The design-system
`DatePicker` and `TimeField` cannot match the Figma without editing read-only
source. Until this is resolved the call request stays a request a human must
confirm.

### 6.3 Infrastructure that will break on deploy

These are not features, and all three are invisible when they fail.

1. **Brevo env vars are local only.** `BREVO_API_KEY` and
   `BREVO_PASSWORD_RESET_TEMPLATE_ID` live in a gitignored `backend/.env`.
   Render staging and production have neither.
2. **Brevo's authorised-IP restriction.** Render's egress IPs are not on the
   allowlist, so every send from a deployed environment will `401` even once
   the vars are set. Add IPv4 and IPv6.
3. **The support rate limiter is in-memory.** Per-instance, resets on deploy.
   Move it to Redis before this is publicly reachable.

And the failure mode that ties them together: **every mail failure in this flow
is swallowed.** `auth.service.ts:647` and `notifyPasswordChanged` both catch,
log and continue, so the API keeps returning success and the UI keeps claiming
the email was sent. Nothing surfaces except the service log. Whatever else is
decided, these paths need an alert or a health check — a silent mail outage here
locks people out of their accounts with no signal to anyone.

### 6.4 One-time setup, not code

- Brevo template **7** (`Password Reset`) is an abandoned duplicate of template
  2 and should be deleted before someone wires up the wrong one.
- A Brevo template for the password-changed email would replace the hardcoded
  HTML fallback; set `BREVO_PASSWORD_CHANGED_TEMPLATE_ID` and no code changes.
- `SUPPORT_INBOX_EMAIL` defaults to `BREVO_FROM_EMAIL`. Set it explicitly if
  support mail should land somewhere other than the sending address — right now
  the support inbox receives mail from itself, which is also why those sends do
  not appear in Brevo's recipient-filtered log.

---

## 7. What @CTorres9800 needs to action

Only the items that cannot be done without you. Everything else in §6 is
ordinary work that needs no approval.

### 7.1 Will break on deploy — nothing works in staging or production until these are done

| # | Action | Where | Consequence if skipped |
|---|---|---|---|
| 1 | Set `BREVO_API_KEY` and `BREVO_PASSWORD_RESET_TEMPLATE_ID=2` | Render env, staging **and** production | No recovery email is ever sent |
| 2 | Add Render's egress IPs (IPv4 **and** IPv6) at `app.brevo.com/security/authorised_ips` | Brevo | Every send `401`s even with the vars set |
| 3 | Set `SUPPORT_INBOX_EMAIL` if support mail should not land in the sending address | Render env | Support mail arrives from itself |

**All three fail silently.** Mail failures in this flow are caught, logged and
swallowed — the API still returns success and the UI still says the email was
sent. Nothing surfaces outside the service log, so a misconfiguration here looks
exactly like a working system while locking people out of their accounts.

### 7.2 Decisions only you can make

**1. Are security questions an acceptable recovery factor?**
Nothing is built yet, and this blocks two screens (§4.1, §4.2). As drawn, that
route hands out a password change with no second factor. If the answer is no,
the route should be removed rather than built. **This is the largest open item.**

**2. `onValueChange` on `PinInput`** — a Storybook change, and therefore yours.
Without it the App Authenticator cannot read the typed code, so its Submit
cannot be gated and the code cannot be checked even once the backend endpoint
exists (§4.4).

**3. A trailing-indicator `DatePicker` and a single-field `TimeField`** —
Storybook again (§4.6). Until these exist, Schedule a Call collects free text:
`99/99/9999` and `banana` both pass, and no timezone is captured.

**4. ~~A real support phone number~~ — resolved 2026-09-29.** You asked for Call
Us to be commented out; it is. Restoring the row needs a real number first.

**5. ~~A live-chat provider~~ — resolved 2026-09-29.** Live Chat is commented
out. Restoring it needs a provider that serves logged-out visitors.

**5b. Phone Verification** is commented out of the recovery chooser at your
request. Restoring it needs the SMS decision reversed.

**6. Should the authenticator route skip Update Password?** The Figma draws it
that way; the implementation follows the Figma. Confirm that is intended.

### 7.3 Housekeeping in Brevo

- **Delete template 7** (`Password Reset`). It is an abandoned duplicate of
  template 2 with an empty tag, created 16 hours after 2 was last edited. Two
  near-identical active reset templates is how the wrong one eventually gets
  wired up.
- Optionally create a password-changed template and set
  `BREVO_PASSWORD_CHANGED_TEMPLATE_ID`; the code already prefers a template and
  falls back to hardcoded HTML, so this needs no code change.

### 7.4 Review notes for this PR

Two changes touch files outside the recovery flow, both deliberate:

1. **`api-gateway/src/proxy/proxy.service.ts`** now forwards `user-agent`. The
   proxy builds an allowlist from scratch and this header was missing, so
   downstream never saw it. **This also fixes the Devices tab**, where every
   session has been recording with no browser or OS. One additive line.
2. **`api-gateway/src/middleware/jwt.middleware.ts`** adds `/support/messages`
   and `/support/call-requests` to `PUBLIC_EXACT_ROUTES`. Contact Support is
   reached by people who are locked out and have no token — the same reasoning
   as `/auth/forgot-password`. Both endpoints are per-IP rate limited, input is
   length-capped, validated and HTML-escaped.

These will trip the **Login Gate**, which is correct — they are exactly the kind
of change it exists to surface.
