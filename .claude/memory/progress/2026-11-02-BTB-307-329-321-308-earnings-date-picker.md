# BTB-307 / BTB-329 / BTB-321 (+BTB-304) / BTB-308: Earnings date picker fixes

- Date: 2026-11-02
- Branch: fix/earnings-date-picker
- Area: frontend `components/ui/calendar/calendar.tsx` (design-system file — needs @CTorres9800 OK),
  `components/transactions-comps.tsx` (DateRangeFilterPopoverContent)

## What changed
- BTB-307/329: DualCalendar gets an optional, additive `maxValue` (same pattern as Calendar's
  existing `minValue`, #451), forwarded to AriaRangeCalendar. The Earnings/Payouts date filter
  passes today, so later days are disabled and can't be clicked; typed future dates aren't applied.
- BTB-321 / BTB-304: CalendarCell computed `data-today` from `new Date("YYYY-MM-DD")`, which is
  UTC midnight — west of UTC that's the previous local day, so tomorrow's cell was flagged too
  (react-aria already marks the real today). Now built from the local y/m/d. Shared cell, so
  the Payouts "Start Deposits On" calendar (BTB-304) is fixed too.
- BTB-308: end field can be typed (handler returned before storing the keystroke when start was
  invalid); both fields keep only letters/digits/commas/single spaces; a range is only taken
  when it's "Mon d, yyyy", start <= end and not past maxValue; Apply is disabled otherwise.
  No validation message — not in Figma, pending PM per the ticket.

## Not changed
- BTB-305 (default "All Time"): ES-13 Frontend Integration Guide says "Default on mount:
  this_month" and the code comment cites US-24.02. Conflicts with the Figma the ticket quotes —
  needs a PM decision.
- The /time-tracking picker mentioned in BTB-307 doesn't use DualCalendar; not touched.

## Verification
- Browser, Earnings → date filter → Custom range: Nov 3+ disabled and unclickable, only Nov 2
  has data-today, "  abc !!" -> "abc " with Apply off, Oct 30 → Oct 1 Apply off, end Nov 20
  Apply off, Oct 30 → Oct 31 selects the range and enables Apply.
- Node check on this machine: old cell logic flags 2026-11-03 as today, new flags 2026-11-02.
- `tsc --noEmit`: no errors in changed files.
