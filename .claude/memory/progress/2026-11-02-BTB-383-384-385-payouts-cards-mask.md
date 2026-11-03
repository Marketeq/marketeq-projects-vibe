# BTB-383 / BTB-384 / BTB-385: Payouts summary cards keep Figma layout; "..." mask everywhere

- Date: 2026-11-02
- Branch: fix/payouts-earnings-ui-bugs
- Area: frontend `components/transactions-comps.tsx` (StatCard, PayoutsTab stats row, method label formatters, Recent Activity settings rows)

## What changed
- BTB-383/384 (reopened): QA wants the amount on the right of the label (Figma), not under it
  below 1600px, and the Next Payout date was still cut off at 1024px.
  - StatCard top row is always label-left / amount-right. The aside (Next Payout date) wraps
    under the label instead of `truncate`; a long label wraps instead of running under the amount.
  - Payouts stats row stacks the three cards below `xl` (1280px); three across from 1280 up.
  - StatCard is shared with the Earnings/Overview cards, so they get the same top row.
- BTB-385 (reopened): remaining "••••" spots now go through `formatPayoutMethodMask`:
  crypto fallback label in `getMethodLabel` / `splitMethodLabel` / `formatMethodOptionLabel`
  (Connected Accounts crypto card, All Accounts dropdown, Preferred Deposit Method), bank
  labels from `formatMethodOptionLabel`, and the split labels in Recent Activity
  "Deposit Settings Changed". The single "•" separator in split descriptions is kept.

## Verification
- Browser (same-origin iframe at exact widths; amounts injected because earnings-service
  401s locally): 1024 stacked, 1280 / 1440 / 1536 three across, amount right, full date.
- Formatter checked on QA's strings ("METAMASK ETH ••••b1e6a" -> "...b1e6a"). Local account
  has no crypto wallet, so that card wasn't seen live.
- `tsc --noEmit`: no errors in the changed file.
