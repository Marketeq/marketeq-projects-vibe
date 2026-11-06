# Browsing History (PMCM-348) — findings before any code

**Status: blocked on three decisions. No production code has been written.**

Read on 1–2 Nov 2026: the full doc set
(`BROWSING HISTORY DOCS/all docs`, 9 frontend + 14 backend), the Jira epic
PMCM-348 and all six children (PMCM-349…354), and the Figma file
(`OXmLCzzRZARva9RiPm4Qsp`).

This file is the channel to @CTorres9800 for this epic. Update it rather than
writing new local docs.

---

## 1. This epic is not greenfield

The page's own comment says so:

```
// Placeholder data — layout-only until browsing-history backend is wired
```

**Already built**

- `frontend/app/(group)/(group)/browsing-history/page.tsx` — 939 lines. Six
  tabs, grid/list toggle, search, sort, favorites wired to the real favorites
  API, shimmer skeletons, cascade fade-in, responsive.
  **482 lines @CTorres9800 / 457 lines Mrunal Sawant.**
- `backend/apps/browsing-history-service` — port 3034, in `ecosystem.config.js`
  and the gateway proxy. `POST /` record, `GET /` list (`limit`/`offset`,
  returns `{items,total}`), `DELETE /:id`, `DELETE /` clear-all. Migration and
  cleanup task included. Built by **Mrunal Sawant** (#569).

Authorship matters here: the 5 Oct commit `751432ab`
*"fix(browsing-history): pixel-perfect cards matching Figma specs"* is
@CTorres9800's, and its body cites **Figma Dev Mode** values. The Figma team is
now **locked** (Dev Mode shows "Request access"), so that pass cannot currently
be reproduced with the same source of truth. Properties-panel values and
right-click → Copy as code → CSS still work.

---

## 2. Verified working

The API is live and correct as far as it goes. Seeded 11 rows locally and:

```
GET /api/browsing-history?limit=20   →  200
{ total: 11, items: [...] }          →  ordered most-recent-first ✓
```

Note the path is **`/api/browsing-history`** — no `/v1` segment, unlike most
services on this gateway.

Unresolvable rows come back `available: false` rather than being dropped or
500ing, which is the AC-UNAVAIL behaviour the docs require. That part is right.

---

## 3. ⛔ Blocker 1 — there is no `job` item type

```ts
export enum BrowsingHistoryItemType {
  PROJECT = 'project',
  SERVICE = 'service',
  TEAM    = 'team',
  TALENT  = 'talent',
}
```

The epic mandates **six tabs including Recent Jobs**, and **PMCM-351 is an
entire story about Job cards** (Payment Verified, NDA Required, skill match,
Earnings Opportunity, Website link, matching-role link).

**The backend cannot store or serve a job view at all.** No frontend work
closes this. It needs an enum value, a migration, and resolver support.

---

## 4. ⛔ Blocker 2 — the contract does not carry the fields the cards need

Everything `GET /` returns:

```ts
interface BrowsingHistoryListItem {
  id; itemId; itemType; firstViewedAt; lastViewedAt; viewCount; available;
  displayName?; title?; skills?;     // only when available: true
}
```

Against what the designs specify per card:

| Card | Needs | Served |
|---|---|---|
| Project | thumbnail, title, rating, review count, description, duration, budget, avatar stack | `title` |
| Service | as Project + monthly price + Service badge | `title` |
| Talent | photo, rate range, name, handle, role, years, location + local time, rating, skills | `displayName`, `skills` |
| Team | avatars, rate range, name, handle, type, avg years, locations, rating, tags, previous clients | `displayName`, `skills` |
| Job | title, skill match, badges, earnings, duration, schedule, client rating… | **n/a — no job type** |

**At most 3 of ~10 fields per card.** Wiring the page to this endpoint today
would replace a complete-looking page with near-empty cards. The placeholder
data is standing in for fields the API does not serve.

Locally every row currently returns `available: false`: resolution goes over
**gRPC** to an owner-target resolver, and the `listings` tables it depends on
do not exist (see §6).

**The decision needed:** does `browsing-history-service` enrich server-side
from listings/user/favorites, or does the frontend fan out per item?
Server-side enrichment is the recommendation — one call, and it matches how
the cards are specified — but it is a design call, not a bug fix.

---

## 5. ⛔ Blocker 3 — nothing ever records a view

`POST /browsing-history` is called from **nowhere** in the frontend. The only
references to browsing history outside its own page are navigation links in
`top-most-header.tsx`. The table was empty until seeded by hand.

Doc 00 §2.2 puts that write **out of scope** for this epic:

> *"How or when an item is added to a user's browsing history in the first
> place. That write happens wherever the user actually views an item (e.g., a
> Project detail page), which is outside the screens covered here."*

So **PMCM-348 cannot be completed or tested end to end on its own.** The half
that produces the data belongs to other epics, and none of them have done it.

---

## 6. Documentation conflicts to settle

1. **Paging — Jira is stale.** The epic AC says *"Long lists load additional
   items on scroll"* and the QA Objectives say *"scroll-triggered pagination"*.
   The docs, updated **29 Oct 2026**, specify 20 per page with explicit page
   controls and state *"This replaces scroll-triggered loading"* (Open
   Questions E1). Docs are newer. **UX-13: the page control is not designed**,
   so there is nothing in the Figma to build to.
2. **The shipped search and sort may exceed spec.** FC-03 says build
   Idle → Open → Has text only and *"Do not invent filtering behavior"*;
   FC-04 says sort is "present and clickable", behaviour out of scope. The
   code implements real filtering and four sort options. Removing working
   behaviour to match a doc needs a decision.
3. **Remove / clear-all** are confirmed requirements (E10) with working
   endpoints, but **no control exists in any design** (UX-05) — while QA-140
   actively tests removal.

Other explicit "do not build" instructions already honoured: **UX-11**
(Category dropdown layout rule), **UX-12** (Job badge Grid/List split),
**UX-09** (List Save button saved state), **Q8** (Team rating count label).

---

## 7. Not this epic's bug, but it blocks testing here

`listings` has **96 migrations and 0 applied** locally, and the chain is broken
— `AddDeliverablesColumn1746576000000` assumes a `project` table that no
migration creates. That is why the owner-target resolver cannot resolve
anything, so every history row degrades to `available: false`.

Related missing tables seen in the same local database: `payout_schedules`
(entity exists, **no migration creates it** — pre-existing on `dev-main`),
`moderation_logs`, `ls_outbox_events`, `messaging.threads`, `public.teams`.

Each one makes a consumer retry forever, and every retry is logged. Worth its
own ticket: repairing the local migration baseline.

---

## 8. QA is already running

Unlike PMCM-706, this epic has a live suite: **QA-129 → QA-144** are linked to
the children. **QA-131 and QA-132 are Done**; the rest In Progress. So the UI
demonstrably works to some degree against placeholder data.

---

## 9. Recommendation

Do not write code against the current contract. Settle, in order:

1. **Add the `job` type**, or formally descope Recent Jobs and PMCM-351.
2. **Decide where enrichment happens** — server-side in
   `browsing-history-service`, or client-side fan-out.
3. **Own the `recordView` write**, or accept that this epic cannot be verified
   end to end and say so on the ticket.

Once 1 and 2 are settled the frontend work is small: an API client, the mapping
into the existing cards, and page controls (behaviour only — UX-13).

---

## Local-only test data (deliberately not in this repo)

`~/dev/marketeq-seed/browsing-history-seed.sql` — 11 rows across the four
supported types for one local user, with undo notes inside. Kept outside the
repo like the other local seeds.
