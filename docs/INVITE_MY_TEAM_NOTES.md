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
| 2 | ~~**The in-app notification goes to the wrong person.**~~ **WRONG — corrected in §14.** The invitee notification exists and matches the Figma copy; it fires only when the invited email is already a Marketeq user. The inviter also gets one, which the design does not draw | invitations-service |
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

---

## 12. The Talent Network card (25 Oct)

### 12.1 An uncatalogued fork of a catalogued component

`frontend/components/talent-network-status-card.tsx` is a **fork** of
`TalentSearchCard`, and says so in its own header. Created 27 Aug by
@sejalshitole (#533). It is **not listed in COMPONENTS.md**; the component it
forked **is**. Both divergences below lived in it.

It has exactly one consumer — My Team's Talent Network tab — so changing it is
page-specific by construction, and the catalogued card used by five other
pages stays untouched. Worth a decision on whether the fork should exist at
all, since the alternative is putting the states into `TalentSearchCard` and
deleting it.

### 12.2 Only one of the three availability states existed

The Figma draws three states on the avatar — green check, amber clock, red
watch. The code hardcoded green with no conditional. All three colours already
exist in `tailwind.config.ts` at exactly the Figma values (Success/500
`#12B76A`, Warning/400 `#FDB022`, Error/500 `#F04438`), so no arbitrary values
were needed. Now built and driven by the profile's `availability` field.

**Not just this page:** the same dot is hardcoded green in
`talent-search-card.tsx`, which **nine surfaces** render. Every talent card in
the product currently claims availability regardless of the truth. Fixing that
one is a design-system change, not ours.

### 12.3 The hire-status badge was never in the design

The Active / Invitation pending / Ended pill is absent from the Figma's Talent
Network card, which ends at the rating row. Removed. Note the docs *do*
mention a Talent Network status badge under OQ-05, so **design and docs
disagree**; this follows the design.

### 12.4 Why every card looked identical — and why it matters beyond seed data

Every profile field was NULL, so each card fell through to the component's
default props, which read "Marketing Technologist / Australia / 4.7 /
2 projects / $85-$120". Three separate bugs were hiding behind those defaults:

| Field | Problem |
|---|---|
| `projects` | never passed to the card — pinned to the default `2` |
| `rating` | mapper reads `u.rating`; the endpoint returns `clientSuccessRating` |
| `localTime` | hardcoded `"7:30pm local time"` in the shared mapper |

The wider point: **the shared mapper's fallbacks make missing data
invisible.** A profile with nothing in it renders as a plausible-looking
talent rather than an obviously empty one, which is how six identical cards
sat there unnoticed.

### 12.5 Three experience tables, two of them dead

`user_service.experiences`, `user_service.experience` and `public.experiences`
all exist. The entity maps to **`user_service.experience` (singular)**; the
other two are decoys that nothing reads. Seeding the wrong one looks like it
worked and changes nothing.

### 12.6 Local test data

`~/dev/marketeq-seed/talent-network-figma-seed.sql` (outside the repo,
re-runnable, with undo notes) seeds the six Talent Network members to match
the Figma card-for-card: role, years, location, timezone, rating, project
count, availability, avatar and seven skills each. Rates vary by seniority —
the one deliberate deviation, since the design shows `$85-$120` on every card.

Worth knowing: the mapper pads with its generic skill list whenever a talent
has **fewer than six** skills, so a partial profile still looks generic.

### 12.7 Not done

- The "You currently have N team members" block is correctly wired to live
  data, but three values differ from the Figma: supporting-text line-height
  (15px vs 16.34px) and weight (300 vs unset), and the chevron (12px vs 14px).
  It lives in a nav rendered by five pages, so it is left alone.
- A rating of `4.0` renders as `4` — the card prints the value raw.

---

## 13. Which talent card is the real one? (27 Oct)

@CTorres9800 said a component already exists for the Talent Network card, and
that the one first used "didn't match the Figma at all". Both halves need
separating, because the answer is: **the component exists, and it does broadly
match — but the catalogue describes it wrongly and the chain is not obvious.**

### 13.1 There is one implementation, reached two ways

```
ListingCard  kind="talent"   ──delegates to──▶  TalentSearchCard   ← the implementation
TalentNetworkStatusCard      ──fork of────────▶  TalentSearchCard
```

`ListingCard` is a **dispatcher**, not a card: `kind="talent"` returns
`<TalentSearchCard …>` verbatim. So there is exactly one talent card in the
product, `TalentSearchCard`, and it is catalogued in COMPONENTS.md.

**The catalogue is wrong about it.** COMPONENTS.md calls `ListingCard` a
"Project/service listing card"; it also handles `kind: "talent"` and
`kind: "team"`. CLAUDE.md has this right, COMPONENTS.md does not — which is
exactly how someone concludes no talent component exists.

### 13.2 Does it match the Figma? Mostly, yes

`TalentSearchCard` has two variants. The **card** variant is a real card and
lines up with the design:

| | Figma | TalentSearchCard (card) | Our fork |
|---|---|---|---|
| radius | 6px | `rounded-[6px]` ✅ | `rounded-[6px]` ✅ |
| border | 1px #EAECF0 | `border-[#eaecf0]` ✅ | `border-gray-200` (= #EAECF0) ✅ |
| shadow | `0 2px 5px rgba(0,0,0,.04)` | `drop-shadow-[0 2px 2.5px …]` ≈ | `shadow-[0 2px 5px …]` ✅ exact |
| height | 418px | `h-full`, none | `min-h-[418px]` ✅ |
| count label | "11 **projects**" | "2 **reviews**" ✗ | "projects" ✅ (fixed 27 Oct) |
| availability dot | green / amber / red | hardcoded green ✗ | all three ✅ |

So "didn't match at all" is too strong — structurally it is the same card
(All Stars chip, photo, dot, rate, name/handle, role, experience,
location + local time, rating, skills footer). It differs in details.

The **compact** variant is a list row (`border-b … py-5`), not a card. Picking
the wrong variant would make it look nothing like the design, which may be
what was originally hit.

### 13.3 The fork's original reason no longer exists

`TalentNetworkStatusCard` was forked (27 Aug, @sejalshitole, #533) to add a
hire-status badge the catalogued card doesn't have. **That badge is not in the
Figma and has now been removed** (§12.3), so the only thing left that the fork
has and the catalogued card lacks is the three availability states — and the
catalogued card arguably needs those anyway, since it hardcodes green across
**nine** surfaces.

**Recommendation:** move the three availability states into `TalentSearchCard`,
fix its "reviews" label to "projects", give it the Figma's 418px, and delete
the fork. Every talent surface gains correct availability and the duplication
goes. That is a design-system change and needs an owner — it is not ours to
make unilaterally.

Two things to fix in the catalogue either way:
- `ListingCard`'s description should mention `talent` and `team`.
- `TalentSearchCard`'s card variant labels a **projects** count as "reviews".

---

## 14. Full epic audit — every Figma section vs frontend and backend (27 Oct)

Triggered by the answered Round 3 doc (19 Oct, received 27 Oct). That document
carries a header telling any AI reading it not to build UI from it; it is used
here only as a statement of product behaviour, which is what it says it is for.

**Correction to §4 defect #2 first.** That entry claimed the in-app invite
notification goes to the wrong person. It is wrong, and it has been wrong since
it was written. `notifyInviteeOnInvite` in
`invitations-service/src/invitations/invitations.service.ts:480` sends the
invitee a `team` / `team.invitation.received` notification titled **"New Offer"**
with the body `@handle invited you to join their external team` — the Figma copy
exactly, and `git log -S` dates it to 27 Aug (#529), well before the note. It
only fires when the invited email already belongs to a Marketeq user, which is
correct and is also what R3-02 describes; testing with brand-new addresses is
why it never appeared. The artifact circulated on 23 Oct had this right, so
nothing incorrect went to the team. §4 defect #3 (the inviter's copy leaking
`as viewer`) still stands.

### Coverage by Figma section

| Section | Frontend | Backend |
|---|---|---|
| Invite Team Member (External Team) | Built (S1–S3) | Built |
| Invite Window — S4 invite, S6 permissions | Built | Built |
| Invite Window — S5 Manage Invite Settings | Built, **inert** | **Does not exist** |
| External Team | Built | Built, minus pending-role change |
| Talent Network | Built | Built |
| Add Team Member (Talent Network) | Built on this branch | Reuses existing endpoints |
| External Team Member Onboarding | Built | Built, blocked by the accept gate |
| Confirmations | Built | Built |

Nothing in the Figma is unimplemented as a *screen*. Every gap below is either
behaviour behind a screen that renders, or a Round 3 decision the code predates.

### The one structural hole: invite settings have no backend

`components/invite-window.tsx` renders all of S5 — General Invites (Enable User
Tracking, Guest Sharing) and Link Settings (Who Has Access with the design's
three options, Allow Link Expiration After with 15/30/90/Custom, Enable Link
Password, Allow Notification Alerts, Enable Embed Code). Every control is local
`useState`. `handleSave` validates the custom date and calls `onBack()`. Nothing
is persisted, nothing is read back, and none of it reaches
`POST /invitations/link`, which mints a signed token on a fixed TTL and knows
nothing about access scope, password or custom expiry.

A repo-wide search for `userTracking|guestSharing|invite_settings|linkExpiration`
returns exactly one file: that component. No entity, no migration, no endpoint,
no consumer.

R3-02 moves this in scope — it changes WD-09 to "build link invitations and
account-wide invite settings", one set per client account, with the roles frame
deciding who may change them. This is the largest single piece of backend work
left in the epic, and it is currently invisible because the UI looks finished.

### Round 3 decisions vs the code (supersedes the §10 table)

| ID | Decision | Code today |
|---|---|---|
| R3-02 | Link invitations **and** account-wide invite settings | Link invitations exist; settings do not |
| R3-03 | Email invitations fixed at 30 days | `expHours` defaults to 336 (14 days); `INVITE_EXP_DAYS` is set in no env file |
| R3-04 | Logo limit 1 MB, design's wording | `MAX_LOGO_BYTES = 5 * 1024 * 1024`; S3 has no client-side check or copy |
| R3-05 | Count active members **on the open tab only** | `useTeamMemberCount` returns `activeTalent + acceptedExternal`, and the nav that renders it cannot see which tab is open |
| R3-06 | Company search returns only companies the caller owns | `GET /companies/search` is the **global directory**, unscoped; `app/invite/setup/page.tsx:248` feeds it to the invitee's picker and `onSelect` accepts a stranger's company |
| R3-09 | Resend held until the toast closes | Done, client-side (8s). The doc puts the hold in the backend |
| R3-10 | Roles changeable on pending invitations | No `PATCH` on `/invitations` at all. The toast's Manage Roles routes to `/my-network` for every send, not to Edit Permissions for a single invitee |
| R3-11 | Duplicates/existing members flagged **when the chip is created** | Chips are flagged only by `!isEmail(email)`. The checks exist, but only inside `createInvites` at send time |
| R3-12 | Row actions by status **and viewer role** | Status gating only; no viewer role is fetched anywhere |
| R3-13 | Send Invite sends valid staged chips | `canSend` includes `!hasInvalid`, so one flagged chip blocks the send |
| R3-14 | Settings save immediately, no Save button | `Cancel` + `Save Settings` (read-only file) |
| R3-15 | Multi-invitee toast lists every address | Says "sent to N people" (read-only file) |

R3-01, R3-07 and R3-08 need no change.

### Smaller divergences found this pass

1. **The two External Team views disagree with each other.** The card menu has
   the design's five items (Edit Permissions, View Profile, Resend Invite,
   Cancel Invite, Remove User); the list-view row menu has three, two of them
   relabelled — `Edit` and `Remove`. Same data, same page, different menus.
2. **Pending rows offer Cancel Invite and Remove User**, both calling
   `onCancel`. R3-12 gives a pending row two actions, not three.
3. **`View Profile` in the card menu has no `onSelect`.** It is live in the
   talent table, where it wraps a `NextLink`.
4. **`ctaLabel: 'View Invite'`** is set on the invitee notification
   (`invitations.service.ts:522`) and no frontend code reads `ctaLabel`. The
   Figma draws that link under the notification.
5. **R3-01's unreachable path is still implemented.** `app/invite/setup`
   handles all four company paths including "client specified no company",
   which no client screen can now produce. Harmless; worth a comment rather
   than a deletion, in case the decision flips.

### Still true from earlier sections

The accept-flow blocker (§6) is unchanged: acceptance is gated behind
identity-verification, which 403s locally. Nothing in this audit can be
end-to-end tested past the invitation email until that is settled.

---

## 15. The backend the audit asked for, built (27 Oct)

Everything §14 listed as a backend gap, implemented. Two services touched:
`invitations-service` and `user-service`. No frontend file changed — the
endpoints are additive and the existing UI keeps working untouched until
somebody wires it up.

### New storage: `invite_settings`

One row per client account, keyed by the same id invitations carry as
`team_id`. Absent row means defaults, and nothing creates one until a setting
is changed, so an account that never opens the panel costs nothing and reads
the same answers forever. The column defaults and the service's defaults are
the same values by construction.

Two defaults deliberately differ from what the panel draws:

- **`link_expiration_enabled = true`, preset `30d`.** The panel opens on
  "Custom" with no date — fine to draw, impossible to enforce. 30 days is the
  window R3-03 settles for email invitations, so both halves of the epic give
  one answer.
- **`notification_alerts = true`** where the panel draws it off. That
  notification ships today; a default matching the drawing would silently
  switch it off for every existing account.

### Endpoints

| Route | What it does | Decision |
|---|---|---|
| `GET /invitations/settings` | Read, defaults when no row. Never returns the password — `passwordSet` instead | R3-02 |
| `PATCH /invitations/settings` | Saves the one control that moved, immediately. No Save button to answer to | R3-02, R3-14 |
| `POST /invitations/check` | Flags duplicates and existing members for chips still in the field | R3-11 |
| `PATCH /invitations/:id` | Changes the roles on a pending invitation. Administrator only | R3-10 |
| `POST /invitations/:id/resend` | Takes an optional `holdMs`; with one, nothing goes out until it elapses | R3-09 |
| `DELETE /invitations/:id/resend` | Undo: drops a resend still held | R3-09 |

`holdMs` defaults to 0, so the invite UI's own 8s toast hold keeps working
exactly as it does now. Nothing double-delays until the frontend opts in.

### Link Settings are enforced live, not baked into the token

`createInviteLink` reads the account's settings for the expiry window and
reports `requiresPassword` and `accessLevel` alongside the URL. Everything
else is checked at accept time against whatever the settings say *then*:

- **Who Has Access** — `owner_only` admits nobody but the account owner;
  `invited_guests` requires a pending invitation for that address; `anyone`
  is open. The switch and the dropdown are separate, so a stored level does
  nothing until the switch is on.
- **Expiration** — measured from the token's new `iat` claim. Narrowing the
  window kills links already copied, immediately. Widening it cannot revive
  a token whose signature has lapsed, which is the safe direction.
- **Password** — bcrypt, never returned by any route. "Required" and "wrong"
  are different error codes so the client can tell *ask* from *ask again*.

Refusals say nothing about the account behind the link — not the owner, not
which rule rejected you. An invite link is a URL anyone can hold.

### A hole closed on the way past

`resend` and `cancel` took an invitation id and **no actor at all**: any
signed-in user could cancel any invitation in the system by guessing its id,
and `list` would hand over any team's invitations for the asking. Both now go
through the R3-12 table — account owner, the person who sent it, or a holder
of `administrator` / `coordinator` / `onboarder` in the owning company;
`administrator` alone for changing roles, since the roles frame says the
other two "cannot change roles".

### Two small ones in user-service

- Logo limit 5 MB → **1 MB**, and the rejection carries the design's own
  wording ("Max image size 1 mb") rather than multer's generic 413. Multer
  stops one byte past the ceiling so the handler can answer properly.
- `GET /companies/search` was an unscoped `ILike` over **every company on
  Marketeq**. It is now scoped to the caller's own (R3-06). That was both the
  wrong behaviour for the invitee's picker and a directory anyone signed in
  could enumerate a letter at a time.

### And the `as viewer` leak

The inviter's in-app notification said "as viewer" no matter what was
granted, because the invite dialog stopped having a role picker but the copy
kept reading the legacy field. It now describes the actual permissions, or
drops the clause when there are none.

### Tests

105 passing in `invitations-service`, up from 70. The 35 new ones cover the
settings service directly and drive the link rules end to end through the
controller — including that a refusal leaks nothing about the account.

### Deliberately not built

**Enable User Tracking** stores its flag but records nothing. R3-02 says it
"records who opened the link and who joined through it" and in the same
breath notes the design has no screen that shows that record (UX-32). An
audit table with no reader is a guess at a schema; it is a small addition
once somebody decides what the screen shows. **Guest Sharing** is the same
shape: the flag persists, and the request/approval screens it implies are
UX-33, which does not exist either.

**R3-05 needs no backend.** Both numbers already exist separately — the
talent count and the accepted-invitation count. The bug is that the frontend
hook adds them together.

### Local test data

The smoke test left invitation `d9403334` (seanstest123+team2@gmail.com)
with permissions `treasurer, auditor`, and its invite-settings row was
deleted afterwards so the account is back on defaults.

---

## 16. Defects left in frozen files, and what moved on 28 Oct

Written down here because the list below was produced in a session that
crashed before it could be committed; it existed only in that transcript.

Everything in this section lives in `frontend/components/*.tsx`, which
`CLAUDE.md` makes read-only. **None of it can be fixed without @CTorres9800.**

### 16.1 `components/invite-window.tsx` — nine

| # | Defect | Ref |
|---|---|---|
| 1 | **Link-password field autofills a saved password.** No `autoComplete="new-password"` on the `type="password"` input; `:-webkit-autofill` confirmed in the DOM. The file already uses `autoComplete="off"` on two other fields, so it is this one field that was missed | — |
| 2 | **Save Settings is unreachable.** The panel defaults to a Custom expiry with no date, and its own validation blocks the save | — |
| 3 | **The whole settings panel is local state.** Nothing reads or writes the endpoints built in §15 | R3-02 |
| 4 | Send Invite enables while an address is still an uncommitted chip | — |
| 5 | One flagged chip blocks the entire send | R3-13 |
| 6 | No duplicate / existing-member flag when a chip is created | R3-11 |
| 7 | Invites list does not pre-fill a default role | R2-04 |
| 8 | Title reads "Invite Your Team"; Figma says "Invite Team Member" | UX-29 |
| 9 | Manage Roles routes to the list for every send, never to Edit Permissions for one invitee | R3-10 |

**Number 1 is the one to escalate.** It was cosmetic while the field went
nowhere. §15 built the backend that stores a link password, so the next person
to wire that panel ships a feature which quietly uploads someone's personal
saved password as a shared link password.

### 16.2 The other two frozen files

- `components/invite-sent-notification.tsx` — the multi-invitee toast says
  "sent to N people" instead of listing the addresses (R3-15 / UX-31).
- `components/invite-company-steps.tsx` — S3 has no "Max image size 1 mb"
  copy and no client-side size check (the backend half of R3-04 is done), and
  no Clear link or Logo Tips panel.

### 16.3 Fixed on 28 Oct (not frozen)

**R3-12 — the row menus no longer offer what the server refuses.** Both views
offered **Edit Permissions** to every viewer, but the write
(`PATCH /companies/:id/members/:userId`) is `assertIsAdmin`-gated on
`company_users.role === 'admin'`, so a plain member got "Only company admins
can perform this action" from a menu item that looked available. Now gated on
the viewer's own role, read from the member lists the page already fetches —
no extra requests.

**Resend and Cancel Invite are deliberately left ungated,** and this is worth
recording as a decision rather than an omission. They go to
invitations-service, whose `assertCanManageInvitation` admits the team owner,
the invitation's *creator*, or a holder of `administrator | coordinator |
onboarder`. `createdByUserId` is not on the frontend's invitation type, so the
predicate cannot be evaluated client-side at all. Hiding those items on a
partial rule would remove actions the server allows — worse than offering one
that 403s. **If these should be gated, the accepted-invitation payload needs
to carry `createdByUserId`.**

### 16.4 `Remove User` has never been able to work

Not R3-12, found next to it. The item calls `handleCancel`, i.e. the
invitations **cancel** endpoint, which throws `InvitationNotPendingException`
for anything not pending. So on an accepted member the server always refuses,
while `confirmWithUndo` has already told the user "Your invitation has been
canceled". `useRemoveCompanyMember` exists and the Settings screen uses it
correctly; My Network is wired to the wrong endpoint.

Not fixed here because it needs per-row company state and a decision on the
Undo copy. **Whose call: @CTorres9800** — it is a behaviour change on a
destructive action, not a wiring tidy-up.

### 16.5 The gate blocker answered itself

§14 and the audit logged this as the epic's single biggest obstacle: the
identity gate shut out every invitee, because `gate_open = (identity VERIFIED
AND location VERIFIED) OR in-grace` and a new account has no profile.

**dev-main #832 (PMCM-652) deleted that gate from acceptance** — the code now
reads "Accepting an invitation is deliberately not verification-gated: an
unverified user may join the team" — and moved gating to listing creation
instead. So the blocker is gone, but by removal rather than by satisfaction,
and **no Round 3 document still describes what verification an invitee needs.**
Nothing in the R3 set is reconciled with this; it arrived from another epic.

The 70 tests in `invitations.accept-gate.spec.ts` went with it, replaced by 7
in `invitations.accept-ungated.spec.ts` asserting acceptance is *not* gated.

### 16.6 Still a decision, not a task

**R3-05.** `useTeamMemberCount` returns `activeTalent + acceptedExternal`, and
its own comment cites a "Final Logic doc" specifying exactly that sum — which
contradicts R3-05's per-tab reading. §15 recorded this as "the frontend hook
adds them together", i.e. a bug; the hook's comment says it is the spec. One of
the two documents is wrong and **@CTorres9800 has to say which** before anyone
changes the number.

### 16.7 Local environment, not code

**All 96 listings-service migrations are unrun locally.** The `listings`
schema holds one table, `migrations`, with 0 rows. The `GateStateConsumer`
therefore fails on `relation "listings.account_gate_state" does not exist`,
RabbitMQ redelivers forever, and that loop had written **1.4GB** of error log.
The migration exists and is compiled; it has simply never been applied. It
starts filling the disk again the moment PM2 starts.

**identity-verification-service was logging every SQL statement** and its gate
sweep runs every 30 seconds, so each pass printed a full 28-column SELECT —
**8.4GB** in one log, which is what filled the disk and ended the previous
session. Fixed in code (`logging: ['migration', 'error']`, matching
payout-service). Note a second, stale nested copy of that compiled file exists
under `dist/.../src/database/` which the build does not update and nothing
runs — do not be misled by grepping it.

---

## 17. The Figma and a live run, checked against all 28 child tickets (29 Oct)

Every child of PMCM-706 (707→734) read in Jira, then checked against the design
file and against a booted stack. **The child tickets are far more specific than
the epic summary — read the child before calling anything a defect.**

### 17.1 Four things we had logged as defects are not defects

1. **Send Invite staying enabled with a chip still staged is REQUIRED.**
   AC-10.2 / R3-13: "Send Invite stays available while chips are still staged…
   Pressing it sends every valid staged chip with the default role." The Figma
   confirms it — one modal state shows a single chip, Add active and Send Invite
   solid blue with the Invites list empty. §16.1 item 4 was wrong.
2. **The invite modal title is correct.** The design reads **"Invite Your Team"**,
   which is what we render. "Invite Team Member" is the *company-selection*
   modal's title (AC-01.1) and `invite-company-steps.tsx` renders that correctly
   too. UX-29 was a misreading of which modal is which — §16.1 item 8 withdrawn.
3. **The row menu matches the design.** Four items — Edit Permissions, Resend
   Invite, Cancel Invite, divider, **Remove User in red**. **No View Profile**,
   so removing it was right.
4. **The Talent Network card matches.** All Stars pill, favorite star, and the
   avatar indicator in **three variants** (red watch / green check / amber
   clock). PMCM-721 FR-4's "accepted or not accepted" prose contradicts its own
   frames — that is exactly what UX-20 flags as an open gap. **Our card is
   right; the ticket text is stale.**

### 17.2 Two things the design confirmed, with exact values

- **The Invites row default is `Viewer`** (AC-07.2), visible as a `Viewer ⌄`
  control in three separate modal states. We render "Select Permissions".
  **But see 17.4 — the backend applies viewer anyway, so this is presentational.**
- **Manage Invite Settings must have no Save button** (AC-12.7, R3-14). Our
  backend already saves per change via `PATCH`; the frozen frontend still has a
  Save button it should not have.

### 17.3 The §6 blocker is gone — observed, not inferred

Full stack booted; a real invite sent from My Network and the invitee flow
driven to completion:

```
POST /api/v1/invitations/accept  201
```

Invitation `status=accepted`, `invitee_user_id` set, `accepted_at` stamped,
`company_users` row written, nav count 7 → 8, notification fired. §6's
*"nobody can accept an invitation locally"* is **resolved**. PMCM-726→730 are
testable. Test rows were deleted afterwards.

### 17.4 Three findings only the live run produced

1. **Acceptance fires only on "Go to Dashboard."** Deliberate and commented in
   `app/invite/setup/page.tsx`: the invitee finishes profile and company setup
   first, and the final click does the roster write. **Every screen before it
   reads as success** — a tester who stops at the welcome screen leaves the
   invitation `pending` believing it worked. This must be in the test script.
2. **A wrong-account accept returns 403 `EMAIL_MISMATCH`**
   (`invitations.service.ts`: `inv.invitedEmail !== invitee.email`).
   **PMCM-726 EC-36 says the opposite** — that accepting while logged in with a
   different email "is allowed and records the accepting account (CTO answer,
   backend Q-07)". **Ticket and code disagree; @CTorres9800 to settle which.**
3. **The backend does apply the Viewer default.** The accepted member landed as
   `company_users.role = 'viewer'` even though the Invites row showed no
   selection — so 17.2's first item is a display gap, not a access-control one.

### 17.5 What is ready for QA

- **Ready now (15):** 707, 708, 711, 719, 721, 722, 724, 725, 731, 732, and the
  live-verified chain 726, 727, 728, 729, 730.
- **Ready with a known-issues note (7):** 709 (no 1 MB client check), 710
  (confirm the 8-suggestion cap), 713 (no Viewer shown), 714 (confirm the
  500-char cap), 716 (Invites-list path only), 717 (single invitee only),
  720 (exclude the count).
- **Hold for a ruling (1):** 715 — AC-09.1 says a link joiner gets Member;
  our tokens carry granular roles.
- **Blocked (4):** 712 and 718 (backends shipped with no caller — the caller
  lives in frozen `invite-window.tsx`), 723 (Remove User broken and ungated),
  733 (AC-27.2 depends on 723).
- **Close or fill in (1):** 734 — empty ticket, overdue since 12 Oct.

### 17.6 Still unresolved and worth a decision

- **Every FR names a `team-service` that does not exist** — `/v1/team/external`
  (with a per-row `actions` field), `/v1/team/count`, `/v1/roles`,
  `/v1/contacts/suggestions`, `/v1/members/:id`, `/v1/invite-settings`,
  `/v1/companies/:companyId/invitations/check`. We built the behaviour across
  `invitations-service` + `user-service` at different paths. UI testing is
  unaffected; **any API-level test case written from the FRs fails on the path.**
- **PMCM-723 FR-1 wants the roster to return the permitted `actions` per row.**
  That is the right answer to the gating problem: the server already knows who
  may do what, including the invitation's creator, which the client cannot see.
- **R3-05 is settled by AC-14.1** — "active members on the open tab only". The
  "Final Logic doc" comment in `useTeamMemberCount` is contradicted by the PO
  decision, so the count is a plain defect, not an open question.
