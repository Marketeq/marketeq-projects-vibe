# wallet-service Memory

## Status
Implemented (pre-existing service; this entry starts its memory file)

## Docs Location
No dedicated docs folder. Security record: `docs/md/CyberSecurity/Privileged Access & RBAC — Audit and Implementation.md`

## What This Service Does
- Holds user wallet balances, gift cards and wallet transactions (`apps/wallet-service`, port 3030, mapped in the gateway as `wallet`).
- Applies gift cards, creates Stripe top-up intents, spends wallet balance at checkout, reports balances.
- Receives its own Stripe webhook at `wallet/webhook` (signature-verified, unauthenticated by design).

## Entities / Database Tables
`GiftCard`, `WalletTransaction`, `UserWallet`.

## API Endpoints
- `GET /wallet/:userId/balance`
- `POST /wallet/apply-giftcard`
- `POST /wallet/topup-intent`
- `POST /wallet/checkout/use-wallet`
- `POST /wallet/webhook` (Stripe)

## RabbitMQ Events
- Emits: none found.
- Listens to: none found.

## Key Decisions
- **Added authentication and ownership checks (2026-09-30).** The service had NO guard on any controller and took the user id from the request body or URL, so any authenticated user could read or spend another user's wallet. Added `src/guards/jwt-auth.guard.ts` (local guard verifying the forwarded token with `AUTH_JWT_PUBLIC_KEY`, falling back to `JWT_SECRET` — the pattern used by all but two services; `@libs/auth` was avoided because of its known build-path problem) and `src/guards/wallet-owner.ts`.
- **Non-breaking by design.** Request shapes are unchanged. `ownerFromToken()` ignores a body-supplied id and uses the token's, logging a mismatch, so no legitimate caller can be rejected; only the path-based balance route returns 403, because substituting the id there would change what the URL means.
- The ownership rule is plain functions rather than a guard so it can be unit tested directly (`src/guards/wallet-owner.spec.ts`, 8 tests).

## Gotchas / Notes
- **The Stripe webhook controller must stay unauthenticated** — it is verified by signature and carries no user session.
- Wallet routes are money paths. Any new endpoint here must derive the user id from the token; do not trust a `userId` in a body or path.
- The service has no `package.json` of its own and relies on root dependencies (`jsonwebtoken` is there).

## Agent Log
- 2026-09-30: Found and fixed the ownership gap during the privileged-access audit. `tsc --noEmit` clean; 8 new tests. Not merged or deployed.
