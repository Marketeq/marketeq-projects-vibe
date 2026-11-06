# Browsing History (PMCM-348) — findings before any code

**Status: blocked. No production code has been written.** Round 1 of the
updated doc set (read 6 Nov) does not unblock it — see §10, which supersedes
the framing of §3–§5.

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


---

## 10. The updated doc set (read 6 Nov 2026) — it specifies a different service

Source: `BROWSING HISTORY DOCS/drive-download-20261105T173036Z-1-001` —
9 frontend docs, 14 backend docs + data dictionary, 8 test-case docs, UX
Requirements, and **Open Questions (Round 1)**.

### The Round 1 questions do not cover our blockers

Status line reads *"Awaiting Product Owner — 12 of 12 questions need a
decision"* (29 Oct). All twelve are product-behaviour questions — who the page
is for, team privacy, default layout, search/sort semantics, where the entry
point lives. **None of them is about the `job` type, enrichment, or who
records a view.** Q1 does confirm "both account types get the page with the
same six tabs", which makes Recent Jobs firmly in scope and so makes the
missing `job` type a harder blocker, not a softer one.

### The backend docs answer two of our three blockers — by specifying a service we did not build

`browsing-history-service` was shipped by **Mrunal Sawant on 3 Sep 2026
(#569)** and is merged to **dev-main and staging**. The backend docs, last
updated **29 Oct** — nearly two months later — say:

> *"no existing service currently owns 'persisting and reading the
> browsing-history list' … this doc **proposes a new**, small, focused
> service — browsing-history-service"* (BE_00 §)
>
> *"No existing service … claims ownership … **creating a new one doesn't
> duplicate anything already built**."* (BE_01 §)

They were written blind to the shipped service. The designs differ
materially:

| | Built (#569, on dev-main + staging) | Docs (29 Oct) |
|---|---|---|
| Write path | `POST /` — HTTP, **called from nowhere** | RabbitMQ consumer of `listing.viewed` (`history.listing_viewed`); **no POST endpoint at all** |
| Table | `public.browsing_history` | `browsing_history.history_entries` |
| Item types | 4 — **no `job`** | 5 — **includes `job`** |
| Card content | none, by explicit design: *"never the listing/profile … resolved live via the owner-target contract at read time"* | `snapshot` JSONB written at view time, a discriminated union keyed by `itemType` |
| Delete | hard `repo.delete` | soft: `status` active/removed + `removedAt` |
| Cache | none | Redis sorted set, 100-item cap, 90-day TTL |
| Also present | `viewCount` (nullable, unused) | not in the spec |

Page size 20 is the one thing both agree on.

### What this means for the three blockers

1. **`job` type** — the docs include it. Resolved on paper, but only inside a
   schema we have not built.
2. **Enrichment** — the docs resolve it by storing a snapshot at write time.
   That is the **opposite** of the decision the shipped entity documents in
   its own header comment. One of the two has to give.
3. **`recordView`** — moves from an unowned HTTP POST to an unowned
   `listing.viewed` event. Still nobody emits it, but it is now at least a
   named contract rather than a gap.

### Recommendation

**This is not frontend work and it is not small.** Taken literally the docs
ask for a rewrite of a shipped, merged microservice — different schema,
different write path, different delete semantics, plus Redis. That is
`CODE_REVIEW_SOP.md` §1.9 territory: only the author (@Mrunal Sawant) or
@CTorres9800 can authorise replacing it.

Three ways out, in the order I would ask:

1. **Reconcile the docs to the built service** — keep `public.browsing_history`
   and the live-resolution read path, and amend the docs. Cheapest; needs only
   the `job` enum value + migration to unblock Recent Jobs.
2. **Rewrite to the spec** — accept the snapshot design, the event consumer and
   Redis. Needs Mrunal's or CTorres's sign-off, and a migration path for
   whatever is already in `public.browsing_history` on staging.
3. **Descope Recent Jobs** and ship the four types that exist, noting PMCM-351
   as deferred.

Until one of those is chosen, writing frontend code still risks being thrown
away — the read response shape differs between the two designs.


---

## 11. Figma vs built vs Jira vs docs (6 Nov 2026) — what actually needs building

Sources checked this pass: the Figma (`OXmLCzzRZARva9RiPm4Qsp`, Page 12
"Browsing History - Grid / List", 7 frames / ~13 screens), Jira PMCM-348 and
its children, the 29 Oct doc set, and the code on this branch.

### Jira has grown since the last read

**Eight children now, not six.** Two are new and both land exactly on the
gaps below:

- **PMCM-842 — Remove an Item or Clear All History**
- **PMCM-843 — Page Through My History**

Epic is *In Progress, 0% done*, and states plainly that **UX-05 (remove /
Clear All controls) and UX-13 (page controls) are not yet designed.**

### Already built — more than the docs assume

| Piece | State |
|---|---|
| `browsing-history-service` (4 endpoints, port 3034) | shipped #569, on dev-main + staging |
| Gateway route `browsing-history` → 3034 | present |
| `/browsing-history` page, 939 lines | all six tabs incl. **Recent Jobs**, Grid + List, search + Clear Search, sort, favourite toggle, empty state |
| Cards | master components only — `ListingCard`, `TeamCardLandscape`, `TalentSearchCardLandscape` |
| Entry point | account menu in `top-most-header.tsx` ("Browsing History", ClockRewind) |

That last row matters: **Open Questions Q9 asks where the entry point should
live, saying none exists in the designs — it is already built.** Q9 is
answerable from the repo, not from Chris.

The Figma tab order — Show All · Recent Projects · Recent Services · Recent
Talent · Recent Teams · Recent Jobs — **matches the built page exactly**,
including a Job card with "Payment Verified" and "N of 9 skills match".

### Not built — the actual work, in dependency order

1. **API wiring.** The page is 100% placeholder: `STATIC_PROJECTS`,
   `STATIC_SERVICES`, `STATIC_TEAMS`, `STATIC_JOBS`. There is **no
   `service/http` client for browsing history at all**, and no `useQuery` or
   `fetch` anywhere in the page. This is the single biggest gap and
   everything else depends on it.
2. **Paging — PMCM-843.** Nothing. 20 per page, cap 100, max 5 pages, tab
   switch returns to page 1. Backend `GET` already defaults `limit` to 20, so
   the server half exists. **Design does not (UX-13).**
3. **Remove one item / Clear All + confirmation — PMCM-842.** Nothing. The
   `delete` calls in the page are *favourites*, not history. Backend
   `DELETE /:id` and `DELETE /` already exist, so again only the client half
   is missing. **Design does not exist (UX-05).**
4. **Category dropdown** — pending UX-11; Q12's proposed answer is that it
   belongs to global search and does **not** filter this page, i.e. likely no
   work here at all.

### Still blocked, and the blockers did not move

- **`job` is not in the backend enum**, yet the frontend already renders a
  Jobs tab off `STATIC_JOBS` and PMCM-351 is a whole story. Wiring item 1
  without the enum means the Jobs tab silently returns nothing.
- **Nothing records a view.** The built service exposes `POST /` and nobody
  calls it; the docs instead specify a `listing.viewed` consumer and no POST
  at all. Either way the write is unowned.
- **The §10 design conflict is unresolved** — until it is, the read response
  shape is undecided, and item 1 is the thing that would have to be rewritten.

### Recommendation

Items 2 and 3 are the only ones that can be built today without a ruling, and
both are blocked on *design* rather than backend — so the honest answer is
that **no frontend work here is ready to start**. The unblocking order is:

1. Settle §10 (reconcile docs to the shipped service, or authorise the
   rewrite) — this fixes the read shape and the `job` enum together.
2. Get UX-05 and UX-13 designed, or accept behaviour-only controls built from
   existing `COMPONENTS.md` parts and flagged as un-designed.
3. Then wire the API, which is a day's work once the shape is fixed.

---

## 12. Open Questions Round 1 — what the repo already answers

@CTorres9800 / Chris: **9 of the 12 questions are already decided by shipped
code.** Each line below is verified against the repo, not inferred. Where the
build and the proposed answer agree, there is nothing to decide — just
confirm. Where they differ, the decision is to *change* working behaviour.

| Q | Proposed answer | What the code actually does | Still needs you? |
|---|---|---|---|
| **Q1** Who gets the page? | Both account types, same six tabs | **No role gating at all** in the page — both already get it, all six tabs | No — matches |
| **Q2** Team: private or shared? | Private per person | Every query is `userId`-scoped (10 call sites); there is no team-wide read | No — matches |
| **Q3** Hide NDA jobs if shared? | Moot if Q2 is private | Moot — Q2 is private in code | No |
| **Q4** Any role blocked from saving? | No restrictions | No restriction; favourites available to every signed-in user | No — matches |
| **Q5** Can admins view a user's history? | No access by default | **No admin or support endpoint exists** — 0 references | No — matches |
| **Q6** Expiry beyond the 100 cap? | No time limit | A nightly cleanup task already supports **both** retention *and* a per-user cap, via `BROWSING_HISTORY_RETENTION_DAYS` and `BROWSING_HISTORY_MAX_PER_USER` | **See the note below** |
| **Q7** Default layout, and remember it? | Grid first, remember the choice | Defaults to **Grid** ✅. **Does not remember** — no persistence anywhere in the page | Half built — see below |
| **Q8** Team card: "projects" or "reviews"? | Reviews, both layouts | Grid says **projects** (`listing-card.tsx:152,205`), List says **reviews** (`team-card-landscape.tsx:309`) | **Yes — and it is bigger than this epic** |
| **Q9** Where is the entry point? | Account menu + dashboard link | **Already built** — account menu in `top-most-header.tsx` ("Browsing History", ClockRewind) | No — already done |
| **Q10** What does search match? | Title, name/handle, skill/tag; whole tab | Matches **the item label only**; scoped to loaded items | Partly built |
| **Q11** Sort options? | Two: Recently viewed, Oldest | **Four** already ship: Newest, Oldest, Name A-Z, Name Z-A | **Yes — you'd be removing two** |
| **Q12** Category dropdown filters this page? | No, belongs to global search | Page has no category filter; dropdown lives in the global header | No — matches |

### The three that genuinely need you

1. **Q8 has blast radius beyond Browsing History.** The "projects vs reviews"
   mismatch is real, but it lives in the **locked master cards**
   (`listing-card.tsx`, `team-card-landscape.tsx`) which many surfaces render.
   Answering "reviews in both" is a design-system change, not a browsing-history
   one, and needs an owner.
2. **Q11 is a removal, not an addition.** Name A-Z / Name Z-A already work.
   Confirm whether to drop them.
3. **Q7's second half** — remembering the layout — is not built. Small, but
   it is new behaviour.

### The 100-item cap is not actually on

Jira says history is "capped at 100 items", and the cleanup task can enforce
exactly that — but **`BROWSING_HISTORY_MAX_PER_USER` and
`BROWSING_HISTORY_RETENTION_DAYS` appear in no env template and in no `.env`**,
so both default to `0` and the nightly job logs "Cleanup skipped" and returns.

So the cap is a **config change, not code**: set
`BROWSING_HISTORY_MAX_PER_USER=100`. It needs adding to the six frozen env
templates, which is a DevOps SOP change and therefore yours. Leaving
`RETENTION_DAYS` unset matches Q6's proposed "no time limit".

---

## 13. Done on `fixes/browser-history`

**`job` added to the browsing-history item type.** Additive only — it extends
the shipped service rather than replacing any of its decisions, so it is not
SOP §1.9.

The strongest argument that this was always intended is in the service's own
source: `CLIENT_BY_TYPE`'s doc comment already read
*"PROJECT/SERVICE/JOB -> listing-service, TALENT/TEAM -> user-service"*,
matching favorites-service's routing — the enum simply shipped with four
values. Jira mandates a Recent Jobs tab, PMCM-351 is a story about Job cards,
the Figma draws one, and the frontend already renders the tab from
`STATIC_JOBS`.

Three files: the enum, the `CLIENT_BY_TYPE` entry, and
`AddJobItemType1794000727405` (`ALTER TYPE … ADD VALUE IF NOT EXISTS 'job'`,
following checkout-service's `AddKlarnaPaymentMethod` precedent, with the same
note that Postgres cannot remove an enum value on `down`).

Verified: migration ran, and the enum reads
`project service team talent job` **from the database** rather than from the
CLI's success message; a `job` row inserts and reads back (rolled back, no
test data left); `nest build` clean.

**Known limitation, inherited not introduced:** jobs will resolve as
*unavailable* until listings-service's `validateTarget` handles them — exactly
the caveat the shipped code already documents for `service`. Storing and
listing jobs works; live resolution does not.
