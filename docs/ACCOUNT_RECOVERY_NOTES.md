# Account Recovery — implementation notes and blockers

**Branch:** `account-recovery` · **Verified 2026-09-22** against the stack running
locally (api-gateway, auth-service, user-service all healthy on :4000/:3001/:3002).

Scope is the `/forgot-password` entry point and the five modals behind it.

> **Read §3 and §4 first.** The flow can be walked end to end, but **most of it
> persists nothing** — including a final screen that tells the user their
> password was changed when it was not. This is fine for review; it must not
> reach an environment real users can reach.

---

## 1. What was built

`Start account recovery` on `/forgot-password` was a `mailto:` link to
`support@marketeqdigital.com`. It now opens a five-modal flow:

```
Start account recovery → Account Recovery (chooser)
    ├─ Email Verification          → sends the magic link request
    └─ Security Questions → Update Password → Password Updated → /sign-in
```

Everything is composed from `COMPONENTS.md` components — `Dialog`, `Button`,
`Input`, `Label`, `Select`, `Checkbox`, `RadioGroup`, `InputGroup`,
`ErrorMessage` and design-system icons. **No new UI component was created and no
Storybook or shared component source was touched.**

### Figma fidelity

Every value is an exact token; each modal's geometry closes on its own
arithmetic.

| Modal | Figma | Built |
|---|---|---|
| Account Recovery | 650x580, pad 50 | **700x630, pad 75** — see §5 |
| Email Verification | 484x372, pad 50, gap 32 | `50+152+32+36+32+20+50 = 372` |
| Security Questions | 650x646, pad 50, gap 50 | `50+460+50+36+50 = 646` |
| Update Password | 592x582, pad 50, gap 50 | `50+396+50+36+50 = 582` |
| Password Updated | 420x490, pad 50, gap 32 | `50+180+32+110+32+36+50 = 490` |

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

## 3. BLOCKER — the magic link is never sent

**`POST /auth/forgot-password` returns 200 and sends no email.** Confirmed live.

The request succeeds and does real work: an RS256 reset token is issued with a
24h expiry (`exp - iat = 86400`, which is exactly what the modal promises), and
`passwordResetVersion` is rotated so older links stop working. Then:

```
ERROR [BrevoService] BREVO_PASSWORD_RESET_TEMPLATE_ID is not set
      — cannot send password reset email.
ERROR [AuthService] forgotPassword: Brevo password reset email failed
      for <email>: Password reset template id is not configured
```

| Variable | Local state |
|---|---|
| `BREVO_API_KEY` | **empty** |
| `BREVO_PASSWORD_RESET_TEMPLATE_ID` | **empty** |

`BREVO_FROM_EMAIL` / `BREVO_FROM_NAME` are set. There is **no dev mock** —
`BrevoService` posts straight to `https://api.brevo.com/v3/smtp/email`.

It throws at the **template-id guard, before the HTTP call**, so it never
reaches the point where the missing API key would 401. Setting only the key
will not fix it; both values are required.

### Why this matters beyond local dev

The send is wrapped in a `try/catch` that logs and swallows, so `forgotPassword`
returns `accountFound: true` regardless. The UI then states
*"We sent a magic link to the email s\*\*\*3@gmail.com"* when nothing was sent.

This is **pre-existing behaviour in `forgotPassword`**, not introduced here —
but the new modal is a second surface asserting it. If these vars are also unset
on staging or production, users there get the same confident claim with no
email. **Render's env could not be checked from here; staging/production status
is unverified.**

**Needed from @CTorres9800:** the Brevo API key, and the password-reset template
id (created or identified in Brevo), set locally and on Render for staging and
production.

### Testing without Brevo

`NODE_ENV=development` makes the response include the working link:

```json
{ "accountFound": true, "reset_url": "http://localhost:3000/reset-password?token=…" }
```

Pasting that completes the reset for real, which exercises everything except
delivery.

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

"Sign out of all other devices" would call `AuthAPI.RevokeAllOtherSessions`,
which needs a session this unauthenticated flow does not have.
`handleContinueToDashboard` sends the person to `/sign-in` rather than a
dashboard, because there is no session to land in.

### 4.4 The backend contract needed

Two endpoints, keyed on the email from the reset form — the same source the
email step already uses:

1. **`GET /auth/recovery/security-questions?email=…`** → which questions that
   account set, so the modal shows theirs rather than all six. **Must respond
   identically for unknown emails**, or it becomes an account-existence oracle.
2. **`POST /auth/recovery/security-questions/verify`** → `{ email, answers[] }`.
   On a pass, returns a short-lived reset token that `resetPassword` accepts, so
   Update Password has something to authorise with.

Storage requirements:

- Answers **hashed, not encrypted** — they are only ever compared, never read
  back. Same argument as passwords.
- Normalised for case and surrounding whitespace before hashing.
- Rate limiting and lockout per account **and** per IP. This is an
  unauthenticated endpoint that ends in a password reset; without a lockout it
  is a brute-force target against a small answer space.
- A product decision first on whether security questions are an acceptable
  recovery factor at all — they are weak, and this is the second time that
  question has been raised (SB-702).

---

## 5. Still to build

The other four rows are inert — `handleRecoverySelect` returns early for
anything but `email`. Each needs its own Figma screen:

| Row | State |
|---|---|
| Phone Verification | no screen. **SMS — per @CTorres9800 this is deprioritised** |
| App Authenticator | no screen here. TOTP enrolment exists in Settings |
| Contact Support | no screen. The `/contact-support` page was removed in the PR #593 revert |

Security Questions now has its screens; what it lacks is the backend in §4.

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
