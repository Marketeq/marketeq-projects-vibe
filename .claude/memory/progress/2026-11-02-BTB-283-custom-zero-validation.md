# BTB-283: Custom Rate / Custom Duration / Custom Work Schedule accept 0

- Date: 2026-11-02
- Branch / PR: fix/BTB-283-custom-zero-validation
- Services / areas: frontend (hire-me-button, counter-offer-dialog, inbox right-sidebar resend flow), offer-service (verified only, no change)

## What changed

**`components/hire-me-button.tsx`** — the gating (`isCustomRateIncomplete`/`isCustomDurationIncomplete`) was already correct on dev-main and already blocked the Send Offer CTA; the bug was purely the missing inline message, explicitly marked "deliberately not built" in two comments. Added `customRateError`/`customDurationError` derived consts (shown once the field is non-empty-and-invalid, so an untouched empty row stays silent until a submit attempt sets `showValidationErrors`), rendered via the existing `ErrorMessage` component, and replaced both "deliberately not built" comments with short BTB-283 notes. Had to restructure the Custom Duration row's wrapping `<div className="mt-3 flex gap-3">` into an outer `<div className="mt-3">` + inner `<div className="flex gap-3">` so the error renders below the Input+Select row instead of beside it (Custom Rate didn't need this, its row only ever held the one Input). `customHoursError` (work schedule) was already fully correct — `onChange` rejects a 0 keystroke outright (BTB-260), confirmed, not touched.

**`components/counter-offer-dialog.tsx`** — found the SAME half-finished state as hire-me-button: `isCustomRateIncomplete`/`isCustomDurationIncomplete`/`isCustomScheduleIncomplete` already existed (comment explicitly says "BTB-283/AC-18.04"), already gated the "Review Counter Offer"/"Review Edit" button, but the file had **zero** `ErrorMessage` usage anywhere — no inline feedback on any of the three custom inputs. Added `ErrorMessage` to the `@/components/ui` import, added `customRateError`/`customDurationError`/`customScheduleZeroError` derived consts (same non-empty-and-invalid shape as hire-me-button, no separate "touched" state needed since each custom row's value resets to `""` when opened), and rendered them under each input. **Real gap found and fixed**: the review-screen's own `onSubmit` button ("Send Offer"/"Submit Counter Offer", line ~672) only checked the external `submitDisabled` prop — none of the three incomplete flags. Not reachable with a bad value through the component's own normal flow today (the "Review" button that transitions into that screen is already gated), but the ticket explicitly names this control as one that "must not proceed while any custom value is invalid" — added all three flags to its `disabled` condition too, as defense-in-depth against any future `initialReview={true}` entry path.

**`app/(group)/inbox/components/right-sidebar.tsx`** (resend-offer dialog) — this is a THIRD, fully independent, much more minimal re-implementation (plain `Input type="number" min={1}`, no reusable component), and the real bug here is worse than the other two: `submitResentOffer`'s guard and the Send Offer button's `disabled` both did `!resendRate`/`!resendDuration` — but `resendRate`/`resendDuration` are **formatted display strings** ("$0/hr", "0 Months"), always non-empty once the custom row is touched, so these checks never actually caught a zero (HTML `min={1}` on a number input does not block typed/pasted "0" either — it only affects the spinner and native form-validity API, which this code never calls). Added `resendRateNumeric`/`resendDurationNumeric` (parsed from the display string) and `isResendCustomRateIncomplete`/`isResendCustomDurationIncomplete`, wired into both `submitResentOffer`'s own early-return guard and the Send Offer button's `disabled`, plus `resendRateError`/`resendDurationError` rendered via the newly-imported `ErrorMessage`. Work-schedule hours were different: its onChange already silently resets `resendSchedule` to `""` for a non-positive value (so `!resendSchedule` already blocked it correctly) — added a new `resendScheduleError` state set directly in that onChange (mirroring hire-me-button's `customHoursError` pattern) so the "Hours must be greater than 0." message actually appears instead of the field just going quietly blank.

## Findings (not changed)

- **`components/offer-flow-dialog.tsx`**: grep-confirmed zero custom rate/duration/hours inputs of its own — it's a status/action dialog (pending/declined/etc. views), not an editing form. The actual "Edit Offer" UI it triggers is `CounterOfferDialog` in `mode="edit"`, already fixed above. No changes needed or possible here.
- **`app/(group)/inbox/components/chats-comp.tsx`**: grep-confirmed zero custom rate/duration/hours inputs of its own either — it only renders `CounterOfferDialog`/`offer-flow-dialog`, both already covered.
- **Backend, offer-service — already fully defended, confirmed by reading every relevant DTO, no change made**: `OFFER_CONSTANTS.MIN_RATE = 1`, `MIN_DURATION_MONTHS = 1`, `MIN_HOURS_PER_WEEK = 1` (`common/constants/offer.constants.ts`). `CreateOfferDto.rate`/`durationMonths` both already `@Min(MIN_RATE)`/`@Min(MIN_DURATION_MONTHS)`; `WorkScheduleDto.hoursPerWeek` already `@Min(MIN_HOURS_PER_WEEK)` (only validated when `type === CUSTOM`, via `@ValidateIf`). `CreateCounterOfferDto` and `EditCounterOfferDto` (the PATCH/edit path) both carry the identical `@Min(1)`-equivalent decorators on `rate`/`durationMonths`, and `EditCounterOfferDto`'s `@IsOptional()` only skips validation when a field is entirely omitted — a submitted `0` still fails `@Min`. No decorator added; nothing to add.
- **`app/(group)/job-screening/page.tsx`** ("view applicants" screen) — has "Custom Duration"/"Custom Work Schedule" buttons in its step-4 bulk-hire wizard, but **both buttons have no `onClick` handler at all** — clicking them does nothing, no custom input row ever opens, so there is no live "accepts 0" bug to fix here (nothing captures a value in the first place). This file is also on CLAUDE.md's absolute frozen list ("NEVER touch the view applicants screen... backend wiring only") — flagged-not-fixed on both grounds, not edited.
- **`app/job-listing/page.tsx`** — has its own "Enter duration" custom input, but this is the job-LISTING creation wizard's own duration preference (metadata on the posting itself), not an offer being sent to a specific talent with an attached rate — a different feature area than this ticket's "Custom Rate / Custom Duration / Custom Work Schedule" (which is specifically about the hire/offer flow). Out of scope, not touched.
- **`components/transactions-comps.tsx`**'s "Set Custom Schedule" is a recurring-payment scheduling modal (billing domain), unrelated to hiring offers. Out of scope.

## Verification

- `npm run types:check`: baseline re-confirmed on this fresh `origin/dev-main` pull = **12** errors (same set as every prior ticket this session). 0 new errors — confirmed none of the 12 touch any of the 3 changed files.
- `npx eslint <changed files>`: fails with the same pre-existing "ESLint couldn't find an eslint.config.(js|mjs|cjs) file" gap reported in every prior ticket this session. Not fixed, out of scope.
- Backend: not touched, so `npx jest apps/offer-service`/`npx nest build offer-service` were not run (nothing to verify that this ticket changed).

### Validation table (input → error shown? → submit/review blocked?)

**hire-me-button.tsx (Custom Rate / Custom Duration rows; Custom Hours already fully correct pre-existing)**

| Input | Error shown | Send Offer blocked |
|---|---|---|
| "0" | Yes, immediately | Yes (`isCustomRateIncomplete`/`isCustomDurationIncomplete`) |
| "00" | Yes, immediately | Yes |
| "0.00" (rate only; duration is integer-only) | Yes, immediately | Yes |
| "" (untouched) | No | Yes (CTA already disabled before any typing) |
| "1" / valid | No | No |

**counter-offer-dialog.tsx (Custom Rate / Custom Duration / Custom Schedule rows)**

| Input | Error shown | Review/Submit blocked |
|---|---|---|
| "0" | Yes, immediately | Yes (Review button; Send Offer/Submit button now also gated) |
| "00" | Yes, immediately | Yes |
| "0.00" | N/A (rate input here is digits-only via its own filter, decimals not reachable this way) | Yes (empty/incomplete either way) |
| "" (untouched) | No | Yes |
| "1" / valid | No | No |

**right-sidebar.tsx resend-offer dialog (Custom Rate / Custom Duration / Custom Work Schedule)**

| Input | Error shown | Send Offer blocked |
|---|---|---|
| "0" | Yes (rate/duration: immediately via derived numeric check; schedule: immediately via its own onChange-set error) | Yes (button `disabled` + `submitResentOffer`'s own guard) — **previously NOT blocked, this was the real bug** |
| "00" | Yes | Yes |
| "0.00" | N/A (all three inputs are `type="number"` with digit-driven parsing, no decimal path reachable) | Yes |
| "" (untouched) | No | Yes (pre-existing `!resendRate`/etc. still applies) |
| "1" / valid | No | No |

## Follow-up (2026-11-02, same day) — inline errors were resizing the modal

Manual test found the inline BTB-283 errors growing/shrinking the modal and
shifting content below each row when they appeared/disappeared (the
`ErrorMessage` was conditionally mounted — `{error ? <ErrorMessage>...</ErrorMessage> : null}`).

**Fix, applied identically to all 9 error slots across the three files**
(hire-me-button.tsx: Custom Rate, Custom Duration, Custom Hours/Schedule;
counter-offer-dialog.tsx: Custom Rate, Custom Duration, Custom Schedule;
right-sidebar.tsx resend dialog: Custom Rate, Custom Duration, Custom
Schedule): the `ErrorMessage` is now **always mounted while its custom row
is open**, and only its `invisible` class toggles:
```tsx
<ErrorMessage className={cn("mt-1" /* or mt-2, or none — unchanged per site */, !error && "invisible")}>
  {error || " "}
</ErrorMessage>
```
The non-breaking-space fallback (`" "`) guarantees the span always has
real inline content establishing a line box — an empty string risks
collapsing to zero height in some engines, which would reintroduce the same
bug intermittently.

**Why no `min-h-*` was used**: none of the `ErrorMessage` usages pass a
`size` prop, so all 9 render at the component's **default** size —
`text-xs leading-[18px]` (`components/ui/error-message/error-message.tsx`'s
`xs` variant, confirmed by reading the component; COMPONENTS.md just points
at the component, no size guidance). 18px doesn't line up with any standard
Tailwind `min-h-*` step (`min-h-4`=16px, `min-h-5`=20px), and the ticket
explicitly disallows `min-h-[18px]` as an arbitrary value. Rather than pick
an approximate standard step, the slot **is** the real `ErrorMessage`
element at all times — its own `leading-[18px]` determines the slot height
by construction, so there is no height to get wrong and no Tailwind class to
choose for it at all. The only class added to each slot is `invisible`
(and the pre-existing spacing class, moved from the old conditional wrapper
onto the always-mounted element, unchanged in value).

**Line stays single**: all three messages ("Rate must be greater than $0.",
"Duration must be at least 1 month.", "Hours must be greater than 0.") are
short enough that none wraps at any of the three rows' widths — confirmed by
the existing `ErrorMessage`/`cva` base class having no `whitespace-nowrap`
of its own and none of these three rows constraining width tightly enough
to force a wrap (same row widths the pre-existing `contractTitleError`/
`selectedRateError`/`selectedDurationError` messages — longer sentences —
already render on in `hire-me-button.tsx` without wrapping).

**Nothing else changed**: no validation logic, gating, keystroke filters, or
other error messages (`contractTitleError`, `selectedRateError`,
`selectedDurationError`, `addMemberError`, `offerSubmitError`, etc.)
touched. `components/ui/error-message/error-message.tsx` itself not
modified — only wrapped via its own existing `className` prop.

**New imports needed**: `cn` (`@/utils/functions`) added to
`counter-offer-dialog.tsx` and `right-sidebar.tsx` — neither imported it
before; `hire-me-button.tsx` already had it.

**types:check**: 12/12, 0 new errors.

## Follow-ups

None identified — all three real frontend surfaces are fixed (including this
layout follow-up), the fourth (offer-flow-dialog.tsx) and fifth
(chats-comp.tsx) have no inputs to fix, and the backend was confirmed
already fully defended.
