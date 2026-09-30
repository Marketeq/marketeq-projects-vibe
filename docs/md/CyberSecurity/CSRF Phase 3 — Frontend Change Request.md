# **CSRF Phase 3 — Frontend Change Request**

## **Bottom line**

**Ask:** a frontend engineer attaches an `X-CSRF-Token` header to every state-changing API call. ~20–40 lines across 4 files, plus a sweep of 55 stray call sites.
**Why:** our auth cookies are `SameSite=None` (site and API are different domains), so any website can make a logged-in user's browser send authenticated writes to us — withdrawals, payout-detail changes, contract acceptances. The token is a secret an attacker's page cannot read, and it is the only defence that survives a trusted origin being compromised.
**User-visible change:** none. No screen, component, style, string, layout or animation.
**Blocking:** the security-sprint author cannot do this (Code Review SOP §1.13 bars those PRs from `frontend/`). Needs an owner and a slot.
**Status:** request only. Nothing changed in `frontend/`; the backend half is not built yet either.

---

## **1. The changes**

Agree the contract first: token returned as `csrfToken` on `POST /auth/login` and `POST /auth/refresh` (plus `GET /auth/csrf` for an existing session), sent back as `X-CSRF-Token` on POST/PUT/PATCH/DELETE, rejected with `403 CSRF_TOKEN_INVALID`.

| # | File | Change | Purpose |
|---|---|---|---|
| 1 | `contexts/auth.tsx` | Hold the token in memory; set on login/refresh, fetch once on load, clear on logout (~10 lines, near `getUser()` and `logoutHandler`) | The single place the secret lives. Memory, not `localStorage`, so an XSS bug cannot scrape it |
| 2 | `service/index.ts` | Add the header in the existing request interceptor; extend the 401 retry to also retry once on `403 CSRF_TOKEN_INVALID` | Covers the axios client — 94 files import it |
| 3 | `src/lib/http.ts` | Add the header in `request()` | Second HTTP client |
| 4 | `src/lib/api.ts` | Add the header in `apiFetch`; same retry handling (it already knows `refreshSession()`) | Third HTTP client |
| 5 | 15 files, 55 calls (§2) | Route through a shared client, or add the header individually | These bypass all three clients and would break on the day enforcement is switched on |

Retry handling in 2 and 4 matters: the token changes when a session refreshes, so without it a tab left open overnight fails on the next save.

---

## **2. The stray call sites**

Raw `fetch()` straight to the API with a write method:

| Writes | File |
|---|---|
| 15 | `components/transactions-comps.tsx` |
| 6 | `app/(group)/my-listings/[slug]/project-chat-panel.tsx` |
| 6 | `src/lib/api/favorites.ts` |
| 5 | `app/transfer-funds/page.tsx` |
| 4 | `components/withdraw-funds-dialog.tsx` |
| 4 | `utils/jobTitleValidation.ts` |
| 3 | `app/(group)/(group)/project-details/[slug]/page.tsx` |
| 2 each | `src/lib/api/legal-service.ts`, `src/lib/api/tax-info.ts` |
| 1 each | `app/(group)/inbox/hooks/use-file-upload.ts`, `app/verify-withdrawal/page.tsx`, `src/lib/api/active-role.ts`, `src/lib/api/claim.ts`, `src/lib/api/talent-users.ts` |

Several are money screens. None sit inside a frozen path, but changes must be wiring-only — no markup, strings or behaviour. If a frozen file turns out to need the header, stop and get @CTorres9800's approval.

**Proving full coverage:** the backend ships log-only, listing every request that arrives without a valid token. Deploy, use the app for a few days, work the list to empty. That is the only reliable check.

---

## **3. Out of scope**

Components, pages, layout, styles, copy, animations. The frozen trees (`app/(group)/billing/`, `onboarding/`, `job-screening/page.tsx`, `active-project/[id]/page.tsx`, `components/settings-tax-info.tsx`). Storing the token in `localStorage`/`sessionStorage`, logging it, or putting it in a URL. Server-side rendered calls need no token — they carry no victim's cookies.

---

## **4. Done when**

- [ ] Every write carries `X-CSRF-Token`; GETs unchanged
- [ ] Token is in memory only; cleared on logout, replaced on re-login
- [ ] A stale token causes one silent retry, not a visible error
- [ ] Backend log-only report is empty after a few days of normal use
- [ ] No visual or behavioural change; no frozen files touched

**Test:** save on each major flow (profile, listing, message, upload, offer, contract, payout, checkout); check the network tab for the header on writes only; confirm nothing in browser storage; re-login as another user; leave a tab idle past the refresh interval and save.

---

## **5. Sequencing and risk**

1. Agree the contract. 2. Backend PR, log-only (security-sprint author). 3. **This** PR (non-security-sprint author). 4. Both deployed, watch the report until empty. 5. Backend switched to enforcing.

**The risk is the gap between 2 and 3.** If this is never scheduled, the backend logs forever and protects nothing.

---

## **6. To confirm**

Is `GET /auth/csrf` acceptable for a returning session to obtain a token, or should the token come only from login and refresh?
