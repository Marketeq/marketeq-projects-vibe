# Account Recovery — implementation notes and blockers

**Branch:** `account-recovery` · **Verified 2026-09-22** against the stack running
locally (api-gateway, auth-service, user-service all healthy on :4000/:3001/:3002).

Scope so far is the `/forgot-password` entry point: the Account Recovery chooser
modal and the Email Verification modal behind it.

---

## 1. What was built

`Start account recovery` on `/forgot-password` was a `mailto:` link to
`support@marketeqdigital.com`. It now opens the Account Recovery modal from
Figma, and the **Email Verification** row opens the "Please check your email"
modal and sends the magic link.

Both modals are composed entirely from `COMPONENTS.md` components (`Dialog`,
`Button`, design-system icons). No new UI component was created and no
Storybook source was touched.

### Figma fidelity

Every value is an exact token; the geometry closes on its own arithmetic.

| Modal | Figma | Built |
|---|---|---|
| Account Recovery | 650x580, pad 50 | **700x630, pad 75** — see §2 |
| Email Verification | 484x372, pad 50, gap 32 | exact: `50+152+32+36+32+20+50 = 372` |

Colours all map to existing tokens: `#306CFE`→`primary-500`,
`#EAECF0`→`gray-200`, `#667085`→`gray-500`, `#22376B`→`dark-blue-400`,
`#E8EEFF`→`primary-50`, `#F6F8FE`→`primary-25`.

`<Button size="sm">` matched the Figma's Resend button with **zero overrides**:
`h-9` = 36px, `py-2` = 8px, `px-[14px]` = 14px, and `filled` already carries
`shadow-xs` = `0 1px 2px rgba(16,24,40,.05)`.

### Deliberate deviations from the mockup

1. **No lorem ipsum.** The chooser's supporting text in Figma is
   "Rorem ipsum dolor sit amet…". Replaced with real copy.
2. **Typo not reproduced.** The Figma reads "We sent a magic link **sent** to
   the email". Built as "We sent a magic link to the email", matching the
   wording already approved in `MagicLinkSentShowcase`.
3. **Supporting text is `gray-500`.** The Figma specifies `#667085`; the older
   `MagicLinkSentShowcase` uses `dark-blue-400`. Followed the Figma.

Both copy strings are invented and need a real product review.

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

## 4. Still to build

The other four rows are inert — `handleRecoverySelect` returns early for
anything but `email`. Each needs its own Figma screen:

| Row | State |
|---|---|
| Phone Verification | no screen. **SMS — per @CTorres9800 this is deprioritised** |
| Security Questions | no screen, and no backend on either side |
| App Authenticator | no screen here. TOTP enrolment exists in Settings |
| Contact Support | no screen. The `/contact-support` page was removed in the PR #593 revert |
