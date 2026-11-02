# PMCM-348: Browsing History is already built — and blocked on three backend decisions

- Date: 2026-11-02
- Branch / PR: PMCM-348-browsing-history (draft PR)
- Services / areas: browsing-history-service, frontend browsing-history page

## What changed

Documentation only. **No production code was written**, deliberately — see below.

`docs/BROWSING_HISTORY_NOTES.md` is the new channel to @CTorres9800 for this
epic, carrying the findings in full.

## Findings (not changed)

**The epic is not greenfield.** The page is 939 lines (482 @CTorres9800 / 457
Mrunal Sawant) with all six tabs, grid/list, search, sort, favorites,
skeletons and responsive already done. The backend service exists on port
3034 with record/list/delete-one/clear-all and paging. The page's own comment
says `// Placeholder data — layout-only until browsing-history backend is wired`.

**Three blockers, none fixable on the frontend:**

1. **No `job` item type.** The enum is `project|service|team|talent`. The epic
   mandates a Recent Jobs tab and PMCM-351 is a whole story about Job cards.
2. **The contract carries at most 3 of ~10 fields per card** — `displayName`,
   `title`, `skills`, and only when `available: true`. No thumbnail, rating,
   price, description, location or avatars. Wiring it today would make the
   page visibly worse than the placeholder data.
3. **Nothing ever calls `POST /browsing-history`.** The table was empty until
   seeded by hand, and Doc 00 §2.2 puts that write out of scope for this epic
   — so PMCM-348 cannot be verified end to end on its own.

**Verified working:** `GET /api/browsing-history` returns 200, correctly
ordered most-recent-first. Note the path has **no `/v1`** segment, unlike most
services. Unresolvable rows degrade to `available: false` rather than being
dropped, which is the AC-UNAVAIL behaviour the docs require.

**Why everything resolves unavailable locally:** the owner-target resolver is
gRPC and the `listings` tables are missing — 96 migrations, 0 applied, and the
chain is broken (`AddDeliverablesColumn` assumes a `project` table no
migration creates).

## Verification

API exercised live from the logged-in browser session against 11 seeded rows.
Frontend typecheck untouched (no code changed).

## Follow-ups

1. Add the `job` type or formally descope Recent Jobs + PMCM-351.
2. Decide where card enrichment happens — server-side or client fan-out.
3. Own the `recordView` write, or record on the ticket that this epic cannot
   be verified alone.
4. Jira is stale on paging: the epic says scroll-triggered, the docs (29 Oct)
   say 20/page with explicit controls and supersede it. UX-13 means the
   control is undesigned.

## Local-only, deliberately not committed

- `~/dev/marketeq-seed/browsing-history-seed.sql` — 11 seeded rows + undo
- Postgres log rotation (`logging_collector = on`) in
  `/opt/homebrew/var/postgresql@17/postgresql.conf` — that log had reached
  **22 GB** and was filling the disk
- `pm2-logrotate` (100 MB cap, retain 3)
- `listings.account_gate_state` created by hand to stop a redelivery loop
