# Invite My Team — Notes, Questions and Blockers

**Epic:** PMCM-706 · **Branch:** `PMCM-706-invite-my-team` · **Date:** 20 Oct 2026

Written for @CTorres9800. Everything marked "verified" was confirmed by reading
the code or clicking it in a browser on `localhost:3000`, not inferred from the
specification documents.

---

## Update — 22 October 2026

Two things happened since this was written: the **Round 3 answers (19 Oct) were
applied to the doc set on 21 Oct**, and the branch was run end to end against a
live local stack. Read §10 and §11 first — they supersede parts of what follows.

**Corrections to the sections below.** These were true on 20 Oct and are not any
more; they are left in place rather than deleted so the history reads straight:

| Section | Said | Actually |
|---|---|---|
| §2 | Confirmations "Partly" built | **Built.** Toast with Undo/Manage Roles, invitee in-app notification, and both email templates, all wired |
| §4 defect 2 | In-app notification goes to the wrong person | **Fixed.** `notifyInviteeOnInvite` sends title "New Offer", body "@handle invited you to join their external team" — an exact Figma match |
| §3 call 3 / §7 Q2 | Hire Me modal "is not in the repo" | **It is** — `components/hire-me-button.tsx`, created by @CTorres9800 in April. The docs route S17's Continue to it, and this branch now does |
| §3 call 1 | Eligibility rule was a guess | **Confirmed correct** by the Figma sticky note: "does not show profiles that already have a contract or a pending offer" |
| §7 Q4 / Q5 | Logo limit and expiry unresolved | **Answered** (R3-04: 1 MB; R3-03: 30 days). The code is wrong on both — see §10 |
| §8 | TC-09 / TC-12 On Hold, backend not building them | **Reversed.** R3-02 puts Copy Link and Manage Invite Settings in this release |

---

## 1. The thing to decide first

**The backend docs say to build a new `team-service`. This repo already has that
functionality.**

> SOP B doc 00: *"This is new backend work: none of the services the Invite My
> Team epic touches owns companies, team membership, or roles."*

That is not true here:

| Docs specify | Repo already has |
|---|---|
| new `team-service` | `backend/apps/invitations-service` — 10 endpoints, full PENDING/ACCEPTED/CANCELED/EXPIRED lifecycle, bcrypt-hashed single-use tokens |
| companies, members, roles | `backend/apps/user-service/src/companies/` — `Company`, `CompanyUser`, 14 endpoints |

Building `team-service` as written creates a second writer for data
`user-service` owns, which breaks the one-schema-per-service rule and would
strand `/invite/setup`, `/my-network` and the live invitation emails.

**Three independent document sets share this blind spot**, so it is systemic
rather than one author's oversight: the SOP A frontend docs, the SOP B backend
docs, and the QA suite. The QA Coverage Gap Report §J files PMCM-399 / QA-180
to QA-182 as a *different* epic ("Project Listings team invitations"), but those
are commits in this repo (`62b325a5`, `bd520b01`) touching the same
`invitations-service` that powers `/invite/setup`. The code says so itself, at
`invitations.service.ts:99`:

```ts
// QA-180/PMCM-399: default changed from 72h to 14 days (336h)
```

**Decision needed:** does `team-service` get built, or does the epic adopt what
exists? Everything else is cheap to change; this is not.

---

## 2. What is already built

Verified by clicking each screen against the Figma.

| Figma section | State |
|---|---|
| Invite Team Member (External Team) | **Built** — S1 company selector, S2 company name, S3 logo |
| Invite Window | **Built** — S4 invite modal, S5 Manage Invite Settings, S6 Select Permisions with the real 30-role catalogue |
| External Team | **Built** — member cards, status badges, row actions |
| External Team Member Onboarding | **Built** — every screen, sign-up/login through "You're all set" |
| Talent Network | **Built** — tab, search, sort, grid/list |
| Add Team Meber (Talent Network) | **Was missing — built on this branch** |
| Confirmations | **Partly** — see §4 |

The entire client-side modal stack is one component,
`frontend/components/invite-window.tsx` (1,331 lines). It renders S1–S3 through
`InviteCompanySteps` and S4–S6 itself.

The invitee journey is `frontend/app/invite/setup/page.tsx`, which already
implements all four company paths the design annotates. Note it is **not** under
the frozen `app/(group)/onboarding/` tree despite the Figma calling it
onboarding.

---

## 3. What this branch adds

`feat(my-team)` — S16 and S17, +414/−7 in
`frontend/app/(group)/(group)/my-network/page.tsx`. No other file touched, no
frozen files, typecheck unchanged from baseline.

**The defect:** one Add Team Member button serves both tabs and had no idea
which was active, so Talent Network opened the External Team company selector.
TC-25 / AC-25.1 was failing. `Tabs` is now controlled and the button branches;
External Team keeps its original behaviour untouched.

Behaviour follows the designer's sticky notes on the Figma frames — Continue
disabled until an option is picked, the picker rejecting email addresses with
the designed error copy, chip select/remove enabling and disabling Continue, the
username linking to the profile, and revalidation of the recipient before
hand-off.

### Three judgement calls that need your eye

1. **Eligibility is "no live engagement"** — neither an active contract nor a
   pending offer, which leaves the `past` bucket. That is my reading of the
   sticky note. A client whose network is all active sees an empty picker.
2. **The picker searches the client's existing talent network**, because no
   platform-wide talent search endpoint exists. If S17 is meant to search all of
   Marketeq, that is backend work that does not exist yet.
3. **Continue hands off to `/talent-checkout`** plus the existing
   `logHireFlowInitiated` audit call. The docs name a "Hire Me modal" that is not
   in the repo and belongs to another sprint, so this is the nearest real entry
   point. **Please confirm the intended target.**

---

## 4. Defects found while verifying

| # | Finding | Where |
|---|---|---|
| 1 | Modal title is **"Invite Your Team"**; Figma says **"Invite Team Member"** (UX-29 — the app took the wrong one of the two) | `invite-window.tsx:1078` |
| 2 | **The in-app notification goes to the wrong person.** Figma specifies the *invitee* gets "@user invited you to join their external team". The app notifies the *inviter*: "Invitation sent to… You've invited X to join your team as viewer" | notification-service |
| 3 | That copy says **"as viewer"** when the actual grant was Hiring Manager + Negotiator — the legacy `role` field leaking into user-facing text | same |
| 4 | **Send Invite is enabled too early** — active while an address is still typed in the field and not yet added to the Invites list, contrary to the epic AC and R3-13 | `invite-window.tsx` |
| 5 | S3 has no `Clear` link and no Logo Tips panel; Continue is enabled before any upload | `invite-company-steps.tsx` |
| 6 | Page is titled **"My Network"**; the epic, all 30 docs and every test case say **"My Team"** | `my-network/page.tsx` |

### Where the app is ahead of the design

- **Manage Invite Settings has a Save button.** UX-26 says the design has no save
  control and "when a change takes effect is undefined." The app shipped
  Cancel / Save Settings.
- **Row actions are status-aware.** UX-24 notes the design shows all four
  actions on every row; the app correctly omits Edit Permissions on a pending
  invitation and adds View Profile.

### Documentation errors

- Three documents state the **"Step 1 of 2" label is not in the Figma exports**
  (UX-21, and the Round 3 "already corrected" list). **It is there** — visible on
  the Add a Profile Photo frame with its ring indicator. The app matches the
  design; the docs are stale.
- **UX-19 is confirmed real** and the designer annotated the intent:
  *"The system does not support email-based recipients in this modal because
  direct offers can only be sent to existing Marketeq profiles."* The
  `teresa.gomez@gmail.com` entry in the results list is a design error.
- **UX-11 is confirmed real** — External Team cards still show job titles, not
  permission roles, despite OQ-04.

---

## 5. Local setup blockers — these stop any fresh checkout

Every one of these was hit today on a clean `dev-main` pull. None is caused by
this branch.

### 5.1 identity-verification-service will not boot

```
missing required configuration: DIDIT_API_KEY, DIDIT_FREE_KYC_WORKFLOW_ID
```

Neither variable is in `backend/.env.local.example`. **Fix:** add them (empty,
documented) to the template.

### 5.2 The `identity_verification` schema is provisioned by nothing

No setup step creates it, so even once the service boots its queries throw
`relation "identity_verification.identity_verification_profiles" does not exist`.
Its data-source also sits at `src/database/data-source.ts`, not the usual
`src/data-source.ts`, and the TypeScript CLI cannot load it
(`does not provide an export named 'DataSourceOptions'`) — it has to be run
against the compiled `dist` copy.

### 5.3 contracts-service can never migrate — worst of the set

There are **three** migrations named `InitContractsSchema`:

| File | Class |
|---|---|
| `InitContractsSchema.ts` | `InitContractsSchema1234567890123` |
| `1710000000000-InitContractsSchema.ts` | `InitContractsSchema1710000000000` |
| `1761575667451-InitContractsSchema.ts` | `InitContractsSchema1761575667451` |

The placeholder timestamp `1234567890123` sorts first. It creates the tables,
the real migration then fails on "already exists", and because TypeORM wraps the
run in a single transaction **the whole thing rolls back**. The bogus one also
produces a *wrong* schema — `status` as varchar instead of an enum, missing
`reasonCode` and `notes`.

Consequence: `relation "contracts" does not exist`, so
`GET /contracts/talent-network` returns **500** and the Talent Network tab shows
"Your talent network is empty" for everyone. The tab is not empty — it is
failing.

**Fix:** delete `InitContractsSchema.ts` (the untimestamped one) and reconcile
the remaining duplicates.

### 5.4 R2 environment variable names disagree with the code

`CLAUDE.md` documents `R2_CDN_BASE`. `r2.service.ts:129-136` reads
`CLOUDFLARE_R2_PUBLIC_URL` / `CLOUDFLARE_PUBLIC_URL` / `R2_PUBLIC_URL` and never
`R2_CDN_BASE`. With credentials set but only `R2_CDN_BASE`, the upload succeeds
and then throws *"Logo was uploaded but no public URL is configured."*

### 5.5 Four services down on migrations

| Service | Error |
|---|---|
| messaging-service | `relation "messaging.threads" does not exist` |
| content-moderation-service | `relation "moderation_logs" does not exist` |
| category-service | `relation "categories_v2" does not exist` |
| time-tracking-service | `default for column "archived" cannot be cast automatically to type integer` |

The first three are unrun migrations. **The fourth is a broken migration** — that
cast fails every time, so it restart-loops forever until the migration itself is
fixed. All four had accumulated 110+ restarts while reporting "online" in PM2.

---

## 6. Behaviour blocker: nobody can accept an invitation locally

Verified end to end. Two real invitations were sent (Brevo `statusCode=201`,
message IDs in the notification-service log), both links followed through every
onboarding screen. The final accept returns **403**:

```
POST /api/v1/invitations/accept  403
```

`acceptInvitation` gates on identity-verification-service, and an account with
no verification profile is refused by design:

> *"An account with no profile has verified nothing: the gate is closed and both
> requirements are outstanding."*

This is the verification-gates epic (#782, merged 19 Oct) working correctly —
but it means **no local developer can complete the invite flow**, and QA cannot
test TC-18 to TC-24 without verified accounts. Worth a deliberate decision on how
local and QA environments satisfy the gate.

---

## 7. Open questions

1. **Does `team-service` get built?** (§1 — blocks everyone)
2. **Where should "Send an offer" hand off?** The Hire Me modal is not in the
   repo; this branch routes to `/talent-checkout`.
3. **Is the eligibility rule right?** (§3, item 1)
4. **Logo size limit.** Jira says 1 MB, the backend doc says 2 MB, the code
   enforces **5 MB** (`user-service/src/storage/image-upload.util.ts:26`), and
   the Figma shows no number at all.
5. **Invitation expiry.** This epic assumes 30 days; the code defaults to
   **14** (`invitations.service.ts:99`) and already shipped.
6. **"My Team" or "My Network"?** TC-14 fails as written against the current
   route and heading.
7. **Should the inviter-side notification exist at all**, given the design
   specifies an invitee-side one? (§4, item 2)

---

## 8. Jira state as of 20 Oct 2026

Epic PMCM-706 is In Progress with 28 child stories (PMCM-707 to PMCM-733, plus
PMCM-734, an empty placeholder). **All are To Do**, no bugs are filed, and no QA
test cases are linked — the ~225-case QA suite has never been imported.

Of that suite, TC-09 (Copy Link) and TC-12 (Manage Invite Settings) are On Hold
because the backend is not building them this release (R3-02) — yet both render
in the UI today. 25 of 27 error tests have no designed copy to assert, and 18 UX
gaps have nothing to test against.

---

## 10. Round 3 answers (19 Oct) vs the code as it stands

The 21 Oct doc set applies the Product Owner's Round 3 decisions. Nine of them
contradict what is built. Everything below was checked against the code.

| # | Decision | Code today | Where |
|---|---|---|---|
| 1 | S17 Continue → the existing Hire Me modal | **Fixed on this branch.** It pushed to `/talent-checkout/<username>`, which has no `page.tsx` at the `[slug]` root and 404s | AC-26.5, 04 §S17 |
| 2 | Manage Invite Settings saves immediately, **no Save button**, Back returns, a failed save reverts | Ships `Cancel` + `Save Settings` | R3-14, AC-12.7 |
| 3 | A resend is **held** until its toast closes; Undo drops it | **Fixed on this branch** (was a dead button) | R3-09, AC-17.4 |
| 4 | Undo on a cancel restores the invitation; on permissions restores the prior roles | **Fixed on this branch** (both were dead) | AC-17.2, R2-25 |
| 5 | Send Invite sends valid staged chips; flagged chips stay in the field | `canSend` has `!hasInvalid`, so one flagged chip blocks the whole send | R3-13, AC-10.2 |
| 6 | A multi-invitee toast lists **all** addresses | Says "sent to N people" | R3-15, UX-31 |
| 7 | Count = active members **on the open tab only** | `useTeamMemberCount` returns `activeTalent + acceptedExternal` — both tabs summed | R3-05 |
| 8 | Email invitations expire in a fixed **30 days** | Defaults to `336h` = 14 days (env-overridable) | R3-03 |
| 9 | Logo limit **1 MB**, message "Max image size 1 mb" | `MAX_LOGO_BYTES = 5 * 1024 * 1024` | R3-04 |

**2, 5 and 6 are not ours to fix.** They live in `components/invite-window.tsx`
and `components/invite-sent-notification.tsx`, which are READ-ONLY under
COMPONENTS.md Rule 2. They need either an owner's change or an explicit
exemption.

### One copy fix that was our mistake

S17's "recipient no longer available" alert read *"This person is no longer
available to receive an offer. Remove them and choose someone else."* The spec
string — present in **four** documents since the original 8 Oct set, so this was
not a Round 3 change — is:

> "This user has no availability for new projects or services right now. Please
> select someone else to continue."

Corrected on this branch.

---

## 11. Found while testing the branch against a live stack (22 Oct)

Full stack up: 30/30 PM2 services, api-gateway/auth/user/contracts/invitations/
identity-verification all 200, frontend on :3000. Signed in as a real client
holding four `ended` contracts, so S17 had eligible recipients.

**Verified working end to end:** S16 → "Send an offer" → S17 → dropdown listed
only the four eligible members (correctly hiding the Active and the pending
one) → chip → Continue → the Hire Me modal opened for the right person, no
navigation, no 404. Resend's Undo was tested both ways: pressed, nothing reached
the backend and no email went out; left alone, the request fired at the 8s mark
(`Emitted: invitation.resent`, Brevo `statusCode=201`).

### 11.1 The S17 dropdown was clipped inside the modal — fixed

`DialogContent` carried `overflow-hidden`, and overflow clips
absolutely-positioned descendants, so the results list was trapped inside the
card and cut off. Removed; the white fill and 12px radius are on
`DialogContent` itself and no child paints to the corners, so nothing needed
clipping. The same trap cost four rounds on the Security Questions modal in
October — worth knowing it is the first thing to check when a dropdown in a
dialog renders short.

### 11.2 The Hire Me modal clips its own message field — NOT ours

`components/hire-me-button.tsx` (created by @CTorres9800 on 16 Apr, maintained
by @VAndrejeus, last touched 19 Oct). Now that S17 hands off to it, this is on
the epic's happy path.

Its scroll viewport is capped at `max-h-[calc(100dvh-76px)]`, which subtracts
the **header** but never the **footer**. Measured live at a 745px viewport:

```
viewport max-height : 669px   (calc(100dvh-76px))
viewport height     : 669px
parent height       : 600px
overflow past parent:  69px   ← clipped, parent is overflow:hidden
```

Those 69px — almost exactly the footer height — are unreachable: the scrollbar
belongs to the viewport, which believes it is 669px tall. Scrolled fully to the
bottom (`scrollTop 553` of `scrollHeight 1222`) the last 69px still cannot be
seen, which is why "Add a Message" dies where "Send Offer" begins. It is
viewport-height dependent, so it disappears on a tall window.

Fix is one expression — subtract header *and* footer — but the file is
READ-ONLY to us and actively owned, so it is left for @VAndrejeus.

### 11.3 Two more in the same modal

- **"We couldn't load your contracts. Please try again."** on the Select From
  Existing Contracts step. A failing fetch inside the Hire Me modal, unrelated
  to the hand-off.
- **An eligibility disagreement the hand-off exposes.** On a talent's own
  profile the Hire Me button is disabled when they are not available for hire
  (BTB-261). S17 still opens the same modal for them, because the eligibility
  rule is contract-based (`past`) per the Figma sticky note and never consults
  the availability flag. **Decision needed:** should S17 also respect
  availability? Adding it goes beyond the written sticky note, but leaving it
  means two entry points disagree about who can be hired.

### 11.4 Sorting on My Team does nothing — to build next

The toolbar sort control is presentational only:

```tsx
const SortDropdown = () => (          // no props, no state, no handlers
  <DropdownMenuCheckItem>Name A-Z</DropdownMenuCheckItem>
  <DropdownMenuCheckItem>Name Z-A</DropdownMenuCheckItem>
  <DropdownMenuCheckItem>Newest First</DropdownMenuCheckItem>
  <DropdownMenuCheckItem>Oldest First</DropdownMenuCheckItem>
)
```

No `checked`, no `onCheckedChange`, and nothing downstream reads a sort order.
All four options are inert, in **both** tabs and **both** views. The list-view
tables do have real TanStack sorting wired (`getSortedRowModel` plus `sorting`
state) for their column headers, but the toolbar dropdown does not drive it, and
grid view has no sorting at all.

Two things to settle before building it: what "Newest/Oldest" sorts on (the
Talent Network has no date field on the card — presumably contract start or end
from contracts-service), and whether the choice is shared across the two tabs or
kept per tab. Not started.

### 11.5 Local setup notes

Two gaps that cost time on a clean boot, neither caused by this branch:

- `E2EE_SERVER_SECRET` is required or messaging-service refuses to start, and is
  in none of the four env templates. Generated locally with `openssl rand -hex 32`.
- Brevo silently 401s on IPv6 (the allowlist holds the IPv4 address only).
  `NODE_OPTIONS=--dns-result-order=ipv4first` in the shell that launches PM2
  fixes it; nothing pins this in `ecosystem.config.js`, so a plain `npm run dev`
  sends mail that fails invisibly.

Still unfixed from §5: the three colliding `InitContractsSchema` migrations, and
`messaging-service` / `time-tracking-service` / `content-moderation-service`
restart-looping past `max_restarts` on broken or unrun migrations.
