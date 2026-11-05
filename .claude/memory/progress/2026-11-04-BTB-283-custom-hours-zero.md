# BTB-283 follow-up: Custom Work Schedule hours should show the 0 error, not silently reject it

- Date: 2026-11-04
- Branch / PR: fix/BTB-283-custom-hours-zero
- Services / areas: frontend (hire-me-button.tsx only; counter-offer-dialog.tsx and right-sidebar.tsx verified already correct, no changes)

## What changed

**`components/hire-me-button.tsx`** — the Custom Work Schedule hours input was the one surface still rejecting "0"/"00" at the keystroke level (BTB-260's own `(value === "" || Number(value) > 0)` guard), so it behaved differently from Custom Rate/Duration (which already accept the zero and show an inline error via the reserved-slot pattern from the previous BTB-283 pass).

- `onChange`: dropped the `(value === "" || Number(value) > 0)` clause — kept the `/^\d*$/` integers-only regex and the `Number(value) <= CUSTOM_HOURS_MAX[customFrequency]` cap exactly as-is. "0"/"00" now land in `customHours` state and the field.
- Added `customHoursZeroError` (derived, immediate — same shape as `customRateError`/`customDurationError`): `customScheduleOpen && customHours !== "" && Number(customHours) === 0 ? "Hours must be greater than 0." : null`.
- `tryConfirmCustomSchedule` (blur/Enter confirm): added a new branch between the success case and the generic empty-field `else` — a non-empty value that parses to exactly 0 now sets `customHoursError` to "Hours must be greater than 0." (and does not advance/confirm the schedule), instead of falling through to the generic "Please enter the number of hours." The empty-field case is untouched.
- The existing reserved error slot now renders `customHoursZeroError || customHoursError || " "` (NBSP fallback, matching the slot's existing convention — confirmed via `xxd` that the merged code uses a real U+00A0 character, not a literal space, which is why a first attempt at this edit silently failed to match until caught) — the derived value takes priority since it reacts immediately on every keystroke, the state value only updates on blur/Enter and in practice agrees with it whenever both are set.
- Replaced the two stale BTB-260 comments (on the `customHoursError` state declaration and the `onChange` handler) with short BTB-283 notes.

**Verified, not changed, per the ticket's own instruction to check first**:
- `isCustomScheduleIncomplete` (`Number(customHours) > 0 && ... <= CUSTOM_HOURS_MAX[...]`) already requires a real positive number — confirmed it still correctly blocks Send Offer once 0 can land in state (no change was needed, this was already written in terms of the numeric value, never the old keystroke-rejection behavior).
- `resolvedWorkSchedule`'s `hoursPerWeek` computation reads `customHours` directly with no gate of its own — confirmed it can never actually reach `createOffer()` with `hoursPerWeek: 0` because the Send Offer CTA's `isOfferReady` already includes `!isCustomScheduleIncomplete`.
- The frequency-`Select`'s `onValueChange` clamp (`Number(customHours) > max ? String(max) : customHours`) is unaffected: for `customHours = "0"`, `0 > max` is always false, so it stays `"0"` unchanged, `clamped === customHours` is true, and it calls `tryConfirmCustomSchedule("0", value)` — which (with the fix above) now correctly shows the zero error and does not advance.

## Findings — other two surfaces

- **`components/counter-offer-dialog.tsx`** — already fully correct, **no change made**. Its hours `onChange` never had a keystroke-level rejection to begin with (confirmed by reading it fresh on this pull); `isCustomScheduleIncomplete` already checks `Number(state.scheduleValue.replace(/\D/g, "")) > 0`, and `customScheduleZeroError` already fires (`isCustomScheduleIncomplete && state.scheduleValue !== ""`) the moment a non-empty "0 Per day" lands in state — immediate error, Review/Submit already blocked via the existing gate.
- **`app/(group)/inbox/components/right-sidebar.tsx`** (resend dialog) — already produces the correct **observable** behavior, **no change made**, though worth noting why: its hours `<Input type="number">` has no `value=` prop at all (uncontrolled), so even though the `onChange` handler resets the REACT state `resendSchedule` to `""` when a typed value parses to 0 (own comment: "a typed '0' already reset resendSchedule to ''"), the DOM input itself is not forcibly cleared by that — the browser keeps showing exactly what the user typed ("0"), `resendScheduleError` is set to "Hours must be greater than 0." in the same keystroke, and the existing `!resendSchedule` submit-gate check (now empty string) still correctly blocks Send. The user never sees anything "silently rejected" — the field shows their "0", the error shows below it, submit stays blocked. Making this field controlled to track "0" in state too would require adding a new numeric incomplete-flag (mirroring `isResendCustomRateIncomplete`/`isResendCustomDurationIncomplete`) and wiring it into the submit gate in place of the string-truthiness check it currently relies on — judged out of scope since the current behavior already satisfies the requirement and that change would add surface area for no visible difference.

## Verification

- `npm run types:check`: baseline re-confirmed on this fresh `origin/dev-main` pull = **12** errors (identical set/count to every prior ticket this session). 0 new errors.
- `npx eslint components/hire-me-button.tsx`: same pre-existing "ESLint couldn't find an eslint.config.(js|mjs|cjs) file" gap reported in every prior ticket this session. Not fixed, out of scope.

### Validation table (hours → field content / error / Send blocked / layout shift)

**hire-me-button.tsx**

| Input | Field shows | Error shown | Send blocked | Layout shift |
|---|---|---|---|---|
| "0" | "0" | Yes, immediately ("Hours must be greater than 0.") | Yes | None (reserved slot) |
| "00" | "00" | Yes, immediately | Yes | None |
| "" (untouched) | "" | No | Yes (row incomplete) | None |
| "5" | "5" | No | No | None |
| over `CUSTOM_HOURS_MAX[frequency]` | rejected at keystroke (unchanged pre-existing cap) | — | Yes (can't be entered) | None |

**counter-offer-dialog.tsx** (already correct) / **right-sidebar.tsx** (already correct, same table)

| Input | Field shows | Error shown | Submit blocked | Layout shift |
|---|---|---|---|---|
| "0" | "0" | Yes, immediately | Yes | None |
| "00" | "00" | Yes, immediately | Yes | None |
| "" (untouched) | "" | No | Yes | None |
| "5" | "5" | No | No | None |

## Follow-ups

None — all three surfaces now show the 0 error identically instead of silently rejecting/resetting it.
