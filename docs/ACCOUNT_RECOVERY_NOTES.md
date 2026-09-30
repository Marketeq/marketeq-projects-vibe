# Account Recovery — implementation notes and blockers

**Branch:** `account-recovery` · **Verified 2026-09-30** against the stack running
locally (api-gateway, auth-service, user-service all healthy on :4000/:3001/:3002).

Scope is the `/forgot-password` entry point and the six modals behind it.

> **@CTorres9800: §7 is the list of what needs you.**
>
> As of **2026-09-30 every route through this flow reaches a backend and
> persists what it claims to persist.** The screen that told people their
> password had changed when it had not is gone; so is the unchecked
> authenticator code that let an empty field through. §4 is the record of what
> each route now does and how it was verified.
>
> Two things still stand out:
>
> 1. **Nothing works in staging or production until §7.1 is done** — the Brevo
>    vars on Render and Render's egress IPs on Brevo's allowlist. Every mail
>    failure in this flow is caught and swallowed, so a misconfiguration here
>    looks exactly like a working system while locking people out.
> 2. **The authenticator route deviates from the Figma on purpose** (§4.4 and
>    §7.2). It ends in a password change rather than a session, because issuing
>    a session for a TOTP code alone is an authentication bypass. That is a call
>    you may want to make differently.
>
> Schedule a Call still books nothing — it relays a request to the support
> inbox, and the confirmation screen must not promise more than that (§4.5).

---

## 1. What was built

`Start account recovery` on `/forgot-password` was a `mailto:` link to
`support@marketeqdigital.com`. It now opens a six-modal flow:

```
Start account recovery → Account Recovery (chooser)
    ├─ Email Verification  → POST /auth/forgot-password → emailed link
    ├─ Security Questions ──┐
    ├─ App Authenticator ───┴→ reset token → Update Password
    │                              → POST /auth/reset-password (session issued)
    │                              → Confirmation → optional session sweep
    │                                             → dashboard
    └─ Contact Support     → Email Us (form)       → POST /support/messages
                           → Schedule a Call (form) → POST /support/call-requests
```

Call Us, Live Chat and Phone Verification are commented out per @CTorres9800
(§4.5); their markup is still in the file.

The authenticator route **used to skip Update Password**, following the Figma,
which ends it at "You have been successfully authenticated!" with Continue to
Dashboard. It no longer does. Issuing a session for a TOTP code alone makes an
account with 2FA on reachable with strictly less than its own sign-in requires,
so the code now authorises a password change instead and both non-email routes
converge on Update Password. This is the one knowing deviation from the drawing
— see §4.4 and §7.2.

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

## 4. What is wired, and what is not

**Every route through this flow now reaches a backend and persists what it
claims to persist.** As of 2026-09-30 nothing on this screen announces something
that did not happen. The table is exhaustive; anything not listed here is real.

| Step | Works? | What actually happens |
|---|---|---|
| Account Recovery chooser | **real** | All four remaining rows open a working route |
| Email Verification | **real** | `POST /auth/forgot-password` — real 24h token, rotates `passwordResetVersion`, email delivers (§3) |
| Security Questions | **real** | `POST /auth/recovery/security-questions/verify` — answers checked against hashes, returns a reset token on a pass only |
| App Authenticator | **real** | `POST /auth/recovery/authenticator/verify` — code checked against the account's TOTP secret, returns a reset token |
| Update Password | **real** | `POST /auth/reset-password` spending that token — the password is changed and a session is issued |
| Password Updated | **real** | Opens only on a success |
| "Sign out of all other devices" | **real** | `DELETE /auth/sessions?currentSessionId=` with the session the reset issued |
| Contact Support | **real** | Email Us and Schedule a Call relay to the support inbox (§4.5) |

Verified end to end through api-gateway on 2026-09-30: catalogue served,
answers set and read back, wrong answer and wrong question both rejected,
correct answers accepted case- and whitespace-insensitively, token redeemed,
token reuse rejected, `{"revoked":2}` from the session sweep, a real TOTP code
accepted and a wrong one rejected, and the account-scoped limiter returning 429
on the sixth attempt.

### 4.1 Security questions — built 2026-09-30

`security_question_answers` in auth-service holds one row per answered question:
`userId`, `questionId`, a bcrypt `answerHash`, unique on `(userId, questionId)`.
Migration `1772600000000-CreateSecurityQuestionAnswers`.

**Answers are hashed, not encrypted.** They are only ever compared, never read
back or displayed — the same argument as a password. There is no endpoint that
returns an answer, which is why Settings reopens the modal with the questions
preselected and the answer fields blank: it can show that something is set, not
what was said.

**Normalisation** (`normalizeSecurityAnswer`) trims, collapses internal
whitespace and lowercases, applied identically on set and on verify. Changing it
on one side alone invalidates every stored answer.

**The catalogue is now owned by the backend**
(`security-questions.catalog.ts`) and served from
`GET /auth/security-questions/catalog`. It used to be two hardcoded lists in two
React components with nothing keeping them in step; because the *id* is what an
answer is stored against, an edit to one copy would have silently locked every
account that answered the edited question out of its own recovery path. Both
screens now render from the endpoint, with the same six prompts as a fallback.

**Endpoints:**

| Route | Auth | Purpose |
|---|---|---|
| `GET /auth/security-questions/catalog` | public | The six prompts. Names no account. |
| `GET /auth/security-questions` | bearer | Which questions *I* have answered — ids only |
| `PUT /auth/security-questions` | bearer | Replace my answers wholesale |
| `POST /auth/recovery/security-questions/verify` | public | The locked-out check |

**Replace, not merge**, on `PUT`: the form always submits the full set, so a
merge would leave an answer to a question the user has since deselected still
live and still accepted at recovery time.

**There is deliberately no endpoint that tells an unauthenticated caller which
questions an account set.** The recovery modal stays as the Figma draws it — a
picker — and the caller must name the right questions *and* give the right
answers. That is what keeps this from being an account-existence oracle, and it
is strictly stronger than showing someone their own questions.

Every failure returns the same 401 and the same sentence: unknown email, no
answers ever set, wrong questions named, wrong answers. The doomed paths still
run a bcrypt comparison against an unmatchable hash so the timing does not give
the answer away either — blunted rather than equalised; the rate limiter is the
control that actually matters.

**Settings now saves for real.** `Save Security Questions` used to set a boolean
in component state: the modal closed, the Enabled badge appeared, and nothing
was stored. It now calls `PUT /auth/security-questions` through
`useSecurityQuestions`, closes only on a success, and reports a failure inline.

### 4.2 Update Password writes — fixed 2026-09-30

`handleUpdatePasswordSubmit` calls `POST /auth/reset-password` with the reset
token the security-question or authenticator check returned, and opens the
confirmation screen **only on a success**. It used to open unconditionally while
writing nothing.

The token is the existing `type: 'reset'` JWT, minted by
`issueRecoveryResetToken` — which rotates the account's `passwordResetVersion`
first. That is what makes it single-use: `resetPassword` requires the version in
the token to still match the row and rotates it again on success. It also
retires any reset link already sitting in the account's inbox, which is the
right outcome — a second recovery attempt should invalidate the first.

TTL is `AUTH_RECOVERY_RESET_TOKEN_EXPIRES_IN`, default **15 minutes**, not the
24 hours an emailed link gets: this token is handed straight to the next screen
in an open modal, so its whole life is the time it takes to type a password.

The path mirrors `/reset-password`'s `onSubmit` exactly — same endpoint, same
profile merge, same handover of the session id — because it redeems the same
kind of token. The two differ only in where the token came from.

### 4.3 The session choice is wired — fixed 2026-09-30

`handleContinueToDashboard` now calls
`DELETE /auth/sessions?currentSessionId=<id>` when "Sign out of all other
devices" is chosen, then routes via `resolveDashboardRoute(recoveredUser)`.

The endpoint always existed; what did not exist was a session to call it with.
The reset in §4.2 signs this browser in, so by the time the confirmation screen
is on we hold one — which is what makes both halves possible: the revoke needs a
current session id to exempt, and "Continue to Dashboard" needs somewhere real
to go. The old `/sign-in` destination was the honest one only while the password
was never actually changed.

Verified: three live sessions before, `{"revoked":2}`, one after.

### 4.4 The authenticator code is checked — fixed 2026-09-30

`POST /auth/recovery/authenticator/verify` takes `{ email, code }`, loads that
account's TOTP secret, validates the window through the same
`validateTwoFactorCode` the login path uses (so backup codes work too), and on a
pass returns a reset token.

It had to be its own route. `/auth/2fa/verify` is the only other place that
validates a TOTP code and it demands a `partialToken` minted by a *completed*
login — which nobody holds in a forgotten-password flow — so it is unreachable
from here by construction.

**It deliberately does not issue a session, and this DEVIATES FROM THE FIGMA.**
The Figma ends the route at "You have been successfully authenticated!" with
Continue to Dashboard, which only means anything if proving a code creates a
session. It must not. An account with 2FA on signs in with a password **and** a
code; letting the code alone restore access makes that account reachable with
strictly less than its own sign-in requires, which is an authentication bypass.
So the code authorises setting a new password — exactly as the security
questions do — and the new password is the way back in. Both non-email routes
now converge on Update Password, which is also what gives the authenticator
terminal a session for the §4.3 choice.

Reverting to the Figma means having the endpoint issue a session and sending
`handleAuthenticatorSubmit` back to `setConfirmationKind("authenticated")`. The
copy for that ending is kept, not deleted. **That is @CTorres9800's call** — see
§7.2.

**SMS-backed 2FA falls through to the same rejection** as an account with no
authenticator at all, rather than a distinguishable "wrong method" error. There
is no code to compare against without sending one first, and SMS is
deprioritised.

**The digits are readable now.** `SixDigitPinInput` still exposes no value
callback — extra props land on the root `div`, not the zag machine — so the page
reads the values straight off the six `<input>` elements the component rendered,
via a ref plus an `onInput` listener on the root (deferred a frame, because zag
rewrites the values after the event on paste and on backspace). **This is a
workaround.** Copying the component into the page to add a callback would be a
COMPONENTS.md violation and editing it is a Storybook change, so reading the DOM
it already rendered was the only option that touches neither. It is also what
finally lets Submit be gated on six digits, which is the Figma's disabled state.
Replace it with `onValueChange` the moment `PinInput` gains one — nothing else
in the authenticator path changes when it does.

**Rate limiting.** Both recovery checks are limited per account (5) and per IP
(10) per 15 minutes — `AUTH_RECOVERY_ACCOUNT_LIMIT`, `AUTH_RECOVERY_IP_LIMIT`,
`AUTH_RECOVERY_RATE_LIMIT_WINDOW_MS`. They are unauthenticated, they end in a
password reset, and they compare against a small space — six questions, or a
six-digit code — so without a ceiling they are a brute-force target, and the
code space in particular falls fast to an unthrottled attacker.

> **Same limitation as the support limiter (§4.5): the buckets live in the
> process.** Per-instance, cleared by a deploy, and on Render with more than one
> instance the effective limit is the configured number times the instance
> count. A shared Redis bucket is the real fix and Redis is already a dependency
> of this stack.

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
calendar. The date and time are picked rather than typed as of 2026-09-30, so
what is relayed always parses — but **no timezone is attached** (§4.6), so the
support agent reading it still cannot derive an instant. The confirmation screen
must not promise more than that.

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

### 4.6 Preferred Date and Preferred Time are pickers — fixed 2026-09-30

Both were free text. `canScheduleCall` only checked they were non-empty, so
`99/99/9999` and `banana` both passed straight through to the support inbox.

Both are now `Select`, which is what the design system actually offers for this
and what @CTorres9800 asked for. The route was there the whole time and the
earlier version of this section missed it:

| Field | Source |
|---|---|
| Preferred Date | 30 upcoming weekdays, generated; ISO value, `LLL d, yyyy` label |
| Preferred Time | `TIMES` from `@/utils/constants` — 24 half-hours, `01:00`–`12:30` |
| AM/PM | `DAY_PERIODS` from the same module |

`stories/time-selector.stories.tsx` ("Time Selector" in Storybook) is exactly
this: a `Select` over `TIMES`. `DAY_PERIODS` sits immediately above `TIMES` in
the constants module, and `onboarding/talent/page.tsx` already renders the
joined pair. None of that was found when this section was first written, which
is how it came to say no component could match.

**`SelectTrigger` already matches the `Input` beside it** on everything that
matters — `h-11` (44px), `rounded-[5px]`, `border-gray-300`, `px-[14px]`,
`data-[placeholder]:text-gray-500`, and a trailing 16px indicator. Three gaps
remained, closed by one shared className, the same override the Security
Questions modal in this file already uses:

```
"w-full text-base text-dark-blue-400 shadow-xs [&_svg]:size-4 [&_svg]:text-gray-400"
```

`indicator={false}` drops the built-in `ChevronDown` so the Figma's calendar and
clock glyphs can sit in its place, as a sibling of `SelectValue` — the same
trick the Security Questions modal uses for its error `AlertCircle`. The AM/PM
half keeps its chevron: the clock already says what the pair is for, and without
an affordance that half reads as a static label.

**No component source was touched and no new component was created.** The modal
geometry is unchanged — 44px in, 44px out — so the 626px arithmetic still holds.

`DatePicker` and `TimeField` were the obvious candidates and neither fits: both
render 40px against a 44px field, `DatePicker` puts its icon leading with a
hardcoded trailing chevron and formats `LLL d, yyyy`, and `TimeField` is
segmented hh/mm/AM-PM. That part of the original finding stands; what was wrong
was concluding those two were the only options.

**Still missing: a timezone.** The value now always parses, but "2:30 PM" with
no zone attached still means nothing definite to whoever reads the request, and
the Figma draws no timezone control. The cheapest honest fix is to send the
browser's IANA zone alongside — `Intl.DateTimeFormat().resolvedOptions().timeZone`
— and render it in the support email. That needs a field on `ScheduleCallDto`
and is **not** done.

**The phone country dropdown no longer scrolls the modal.** Opening it used to
put a scrollbar on the form and cut the list off. `PhoneNumberInput` wraps
`react-international-phone`, whose country list is a plain absolutely-positioned
`<ul>` rather than a portal — so an `overflow-y-auto` ancestor both clipped it
and counted it toward the scroll height. The Schedule a Call field box is now
`overflow-visible`, which costs nothing: its 352px is exact, so it never had
anything to scroll, and the `-mb-1`/`pb-1` pair that kept the last row's shadow
off the clip boundary went with it.

The list itself is capped at 176px and scrolls internally. That number is
load-bearing: the dropdown opens at y=258 inside the 352px field box, which is
followed by a 50px gap and a 36px button row, so 176 ends at 434 against an
inner bottom of 438 — it cannot reach the modal's edge. The library's own 200px
would clear the buttons and crowd the border. Radius, border, shadow and
scrollbar are matched to `SelectContent`, the other dropdown on that screen.

All of it is done with arbitrary variants on the wrapper this page owns
(`[&_.react-international-phone-country-selector-dropdown]:…`), which beat the
library's rules on specificity — two classes against one — so no `!important`
and no stylesheet-order dependency. **`phone-number-input.tsx` was not touched.**

> Every one of those class names is written out in full. Tailwind's JIT scans
> source text for whole class names, so a variant assembled from a prefix at
> runtime is never generated — the rule silently does not exist, which looks
> exactly like the override not working. Verified against the served CSS: nine
> rules, `max-height: 176px` among them.

**Trade-off:** on a viewport under ~690px the modal's `max-h-[calc(100vh-4rem)]`
now crops the form rather than scrolling it.

**Not visually verified.** The Chrome extension was not connected in the session
that built this, so the side-by-side against the Figma has not been done. Types
pass, the page compiles, and the CSS was checked as served; the pixel check is
outstanding.

### 4.7 Everything this tab needs from the backend

Consolidated list. Nothing below exists today — every row was searched for on
both `account-recovery` and `feat/settings-unblocked`.

| # | Need | Type | Blocks | Owner | State |
|---|---|---|---|---|---|
| 1 | `BREVO_API_KEY` + `BREVO_PASSWORD_RESET_TEMPLATE_ID` on Render staging/production, plus Render egress IPs on the Brevo allowlist | config | Email Verification (§3) | @CTorres9800 | **open** — done locally 2026-09-28 |
| 2 | ~~`GET /auth/recovery/security-questions`~~ | — | — | — | **not built, on purpose** — it would be an account-existence oracle (§4.1) |
| 3 | `POST /auth/recovery/security-questions/verify` | endpoint | Security Questions → Update Password | backend | **done** 2026-09-30 |
| 4 | `POST /auth/recovery/authenticator/verify` | endpoint | App Authenticator (§4.4) | backend | **done** 2026-09-30 |
| 5 | Reset token accepted by `resetPassword` | contract | Update Password actually saving (§4.2) | backend | **done** 2026-09-30 |
| 6 | Session revocation without a session | design | "Sign out of all other devices" (§4.3) | backend | **done** 2026-09-30 — resolved by the reset issuing one |
| 7 | `POST /support/messages` + a Brevo template | endpoint | Email Us (§4.5) | backend | **done** 2026-09-28 |
| 8 | `POST /support/call-requests` | endpoint | Schedule a Call (§4.5) | backend | **done** 2026-09-28 |
| 9 | A real support phone number | config | Call Us (§4.5) | @CTorres9800 | moot — row commented out |
| 10 | A live-chat provider | integration | Live Chat (§4.5) | product | moot — row commented out |
| 11 | Storage for the answers (`security_question_answers` + migration) | schema | Security Questions (§4.1) | backend | **done** 2026-09-30 |
| 12 | A way to *set* the answers (`PUT /auth/security-questions`, Settings wired) | endpoint | everything in §4.1 | backend | **done** 2026-09-30 |
| 13 | Redis-backed rate limiting for `/support/*` and `/auth/recovery/*` | infra | multi-instance correctness | backend | **open** |

Not backend, but blocking the same screens:

| # | Need | Type | Blocks |
|---|---|---|---|
| 14 | `onValueChange` on `PinInput` | design system | Replacing the DOM-read workaround in §4.4. No longer blocking — the code is read and Submit is gated today |
| 15 | ~~Trailing-indicator `DatePicker` / single-field `TimeField`~~ | — | **not needed** — `Select` covers it without a design-system change (§4.6) |
| 17 | A timezone on a call request | endpoint + UI | A booking request that names an unambiguous instant (§4.6) |
| 16 | Should the authenticator route end in a session rather than a password change? | product | Whether §4.4 keeps its deviation from the Figma |

#### The recovery endpoints, as built

Keyed on the email from the reset form — the same source the email step uses:

1. **`POST /auth/recovery/security-questions/verify`** → `{ email, answers[] }`,
   each answer `{ questionId, answer }`. On a pass, returns a short-lived reset
   token that `resetPassword` accepts. Every failure is identical.
2. **`POST /auth/recovery/authenticator/verify`** → `{ email, code }`. Loads the
   account's TOTP secret, validates the window, and on a pass returns the same
   kind of token. Needed because `/auth/2fa/verify` demands a `partialToken`
   from a completed login, which this flow never has. Identical response for
   unknown emails, accounts with no authenticator paired, and SMS-backed
   accounts — same oracle reasoning — and the same rate limiting, since it also
   ends in a password reset.

A third endpoint — "which questions did this account set?" — was specified here
and **deliberately not built**. See §4.1: the modal asks the caller to name the
questions, which is both the Figma's drawing and the stronger check.

Storage, as implemented:

- Answers **hashed, not encrypted** — they are only ever compared, never read
  back. Same argument as passwords.
- Normalised for case and whitespace before hashing, identically on both sides.
- Rate limited per account **and** per IP (§4.4).
- Unique on `(userId, questionId)`, so a concurrent second write cannot leave an
  account with two different answers to the same question — which would make
  verification depend on row order.

**The product question stands.** Security questions are a weak factor, and this
is the third time it has been raised (SB-702). The route is built and safe as
built; whether it should be *offered* is still @CTorres9800's call, and turning
it off is one commented line in `RECOVERY_OPTIONS` — the same treatment Phone
Verification got.

#### The two support endpoints

Both are unauthenticated and both accept free text from someone who is not
signed in, so both need spam protection and rate limiting per IP before they go
anywhere near production.

4. **`POST /support/messages`** → `{ firstName, lastName, email, subject,
   message }`. Needs its own Brevo template, so it carries the same dependency
   as (1). Replaces the `mailto:` handoff described in §4.5.
5. **`POST /support/call-requests`** → `{ name, email, phone, date, time }`.
   Built and sending. Since 2026-09-30 `date` arrives as an ISO `yyyy-MM-dd` and
   `time` as `"02:30 PM"`, both from dropdowns, so neither can be malformed —
   but **no timezone is captured**, so the pair is still not an instant (§4.6).
   The contract did not change: `time` was already free text.
   `scheduling-service` (:3024) remains the natural home for a real booking and
   exposes nothing for unauthenticated use today.

Neither has an agreed destination: whether a support message becomes an email,
a ticket in a helpdesk, or a row in a table is an open product question.

---

## 5. Still to build

Every chooser row now has its screens **and its backend**.

| Row | Screens | State |
|---|---|---|
| Email Verification | built + **sending** | Real email delivers as of 2026-09-28 (§3); Render envs still unset |
| Security Questions | built + **wired** | Answers stored hashed and checked (§4.1); set from Settings |
| App Authenticator | built + **wired** | Code checked against the TOTP secret, Submit gated on six digits (§4.4) |
| Contact Support | built + **sending** | Email Us and Schedule a Call reach the support inbox; Call Us and Live Chat commented out per @CTorres9800 (§4.5) |
| ~~Phone Verification~~ | **removed from the chooser** | Commented out of `RECOVERY_OPTIONS` 2026-09-29 per @CTorres9800 — SMS not in use. Uncomment to restore |

What is left is configuration, not flow work: the Render/Brevo setup in §7.1, a
shared Redis bucket for the rate limiters, and a timezone on a call request
(§4.6).

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

**7. A timezone on a call request (§4.6).** The pickers landed 2026-09-30, so
`99/99/9999` and `banana` no longer pass — but the request still carries no
zone, and "2:30 PM" is not an instant. Send the browser's IANA zone
(`Intl.DateTimeFormat().resolvedOptions().timeZone`) with the request and render
it in the support email; that needs a field on `ScheduleCallDto`. Until then the
call request stays something a human must confirm by replying.

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
The route is now **built and verified** (§4.1) — hashed answers, no
account-existence oracle, rate limited per account and per IP. The product
question is unchanged though: a security question is a weak factor, and that
route hands out a password change on it alone. If the answer is no, turning the
row off is one commented line in `RECOVERY_OPTIONS`, the same treatment Phone
Verification got. Nothing is wasted either way.

**1b. The authenticator route no longer ends in a session, and that deviates
from the Figma.** Proving a TOTP code now authorises a password change instead
of restoring access, because issuing a session for a code alone makes an account
with 2FA on reachable with strictly less than its own sign-in requires (§4.4).
This is the one place the implementation knowingly departs from the drawing.
Reverting it is one line here plus a change to the endpoint — your call.

**2. `onValueChange` on `PinInput`** — a Storybook change, and therefore yours.
**No longer blocking**: the authenticator reads its digits off the rendered
inputs via a ref, so the code is checked and Submit is gated today. That is a
workaround living in the page, and it should be retired the moment the component
exposes a callback (§4.4).

**3. ~~A trailing-indicator `DatePicker` and a single-field `TimeField`~~ —
withdrawn 2026-09-30.** No Storybook change is needed after all. Preferred Date
and Preferred Time are now `Select` dropdowns over `TIMES` / `DAY_PERIODS`, per
your instruction to use the existing components, and `SelectTrigger` already
matches the 44px field (§4.6). **A timezone is still not captured** — the
picked value always parses now, but "2:30 PM" with no zone is not an instant
anyone can act on. That one needs a field on the endpoint.

**4. ~~A real support phone number~~ — resolved 2026-09-29.** You asked for Call
Us to be commented out; it is. Restoring the row needs a real number first.

**5. ~~A live-chat provider~~ — resolved 2026-09-29.** Live Chat is commented
out. Restoring it needs a provider that serves logged-out visitors.

**5b. Phone Verification** is commented out of the recovery chooser at your
request. Restoring it needs the SMS decision reversed.

**6. ~~Should the authenticator route skip Update Password?~~** Answered by
1b above: it no longer does, on security grounds. Confirm or reverse.

**7. Redis-backed rate limiting.** Both the support endpoints and the two
recovery checks limit in process memory, so on Render with more than one
instance the effective limit multiplies by the instance count and a deploy
clears the buckets. Redis is already a dependency of this stack. Not a decision
so much as a scheduling call — it is ordinary work, it just is not on this
branch.

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

3. **`api-gateway/src/middleware/jwt.middleware.ts`** (2026-09-30) also adds
   `/auth/security-questions/catalog`,
   `/auth/recovery/security-questions/verify` and
   `/auth/recovery/authenticator/verify`. Same reasoning: reached by people who
   are locked out and hold no token. The catalogue is the same six prompts for
   everyone and names no account; the two verify routes are rate limited per
   account and per IP and answer every failure identically, so neither reveals
   whether an email is registered.

4. **`auth.service.ts` / `auth.controller.ts`** (2026-09-30) gain the security
   question management and recovery verification methods, and
   **`app/(group)/settings/[[...tab]]/page.tsx`** now saves security questions
   for real through a new `useSecurityQuestions` hook. The Settings change is
   confined to that panel: no shared component was touched, no frozen tree was
   entered, and the modal's markup changed only where the list had to render
   from the catalogue instead of a hardcoded array.

These will trip the **Login Gate**, which is correct — they are exactly the kind
of change it exists to surface. The auth-service changes are additive: no
existing method, route or contract was modified. `resetPassword` is unchanged —
the new routes mint the token it already accepted.
