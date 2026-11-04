# PMCM-806: AC-04 — failed/cancelled withdrawal email CTAs land on their stated destinations

- Date: 2026-11-02
- Branch / PR: fix/pmcm-806-ac04-failure-ctas
- Services / areas: notification-service, frontend earnings (Overview tab, withdraw-funds-dialog)

## What changed
- notification-service `sendWithdrawalNotification`: "Review payout method" now links
  `/earnings?tab=overview&method=<depositMethodId>` (plain overview when the id is null);
  "Try again" links `/earnings?tab=overview&withdrawAmount=<amountUsd>`. Both used to be
  the bare overview URL, so AC-04 was not met.
- OverviewTab reads `?method=` → opens that method's Edit dialog (same setters as the row's
  Edit button), and `?withdrawAmount=` → opens Withdraw Funds pre-filled, applying the same
  gate as the Withdraw Funds button (US-11 $50 minimum, BTB-345 verified method). Both
  params are dropped with `router.replace` once handled, like PayoutsTab's `?payout=`.
- WithdrawFundsDialog: optional `initialAmount` prop, applied after the on-open reset.

## Findings (not changed)
- "Push" in PMCM-806 means the web-app notification (Ably realtime + stored row); there is
  no FCM/APNs in the repo.
- Withdrawal emails ignore the user's email-channel toggle (they only read the address).
- `withdrawal-notifier.service.ts` (payout-service) has no spec.
- Frontend `npm run lint` is broken on dev-main (ESLint 9 has no flat config; `next lint` gone in Next 16).

## Verification
- New `withdrawal-notification-ctas.spec.ts` (failed, cancelled, null method id); all
  notification-service suites pass (130 tests).
- `tsc --noEmit` on frontend: no errors in changed files (13 pre-existing elsewhere).
- Not exercised in a running browser.

## Follow-ups
- In-app failure treatment (banner/popup) for contractors already in the app — needs the
  separate UX doc the ticket calls for.
