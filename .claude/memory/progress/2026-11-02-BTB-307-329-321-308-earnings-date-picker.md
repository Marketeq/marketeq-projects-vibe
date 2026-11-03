# BTB-307 / BTB-329: Earnings date picker refuses future ranges

- Date: 2026-11-02 (reworked 2026-11-03)
- Branch: fix/earnings-date-picker
- Area: frontend `components/transactions-comps.tsx` (DateRangeFilterPopoverContent) only.
  `components/ui/calendar/calendar.tsx` is a design-system file and is NOT changed.

## What changed
- BTB-307/329: on Apply, a custom range whose start or end is after today is not sent to the
  API; an error toast ("Invalid date range" / "Dates can't be later than today.") is shown and
  the popover stays open. The API's "startDate cannot be in the future" error can no longer be
  reached from this filter.

## Escalated (needs a design-system change, @CTorres9800 to decide)
- BTB-307/329 as written (future days greyed out / unclickable): DualCalendar has no maxValue prop.
- BTB-321 / BTB-304: CalendarCell builds `data-today` from `new Date("YYYY-MM-DD")` (UTC
  midnight), so west of UTC tomorrow is flagged as today too. Fix is one line in CalendarCell.
- BTB-308: DualCalendar's end-date input handler returns before storing the keystroke when the
  start date is invalid.

## Not changed
- BTB-305 (default "All Time" vs ES-13 "Default on mount: this_month"): PM decision.
