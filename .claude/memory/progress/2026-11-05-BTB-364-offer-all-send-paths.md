# BTB-364 (reopened): "Offer Sent!" without a real offer — all three Send Offer branches

- Date: 2026-11-05
- Branch / PR: fix/BTB-364-offer-all-send-paths
- Services / areas: frontend (`components/hire-me-button.tsx` only); offer-service, contracts-service, notification-service investigated read-only, zero backend changes

## Audit — the three branches, as found on this fresh dev-main pull

All inside `hire-me-button.tsx`'s Send Offer `onClick` (one big async handler):

1. **`isExistingContractOfferStep && selectedContract`** (existing-contract path) — called only `addContractGroupMember()`, then `setOfferSent(true)`. No `createOffer()`.
2. **`!isEditMode && isStepFour`** ("Invite me to a new contract") — called nothing at all. Just `onSaveOffer?.()` + `setOfferSent(true)`.
3. **`!isEditMode`** (zero-existing-contracts fallthrough) — the only branch that already called `createOffer()` correctly (built in the prior BTB-364 pass, 2026-10-25).

## Backend investigation (via a background research agent, direct code reads, no DB access)

- **`CreateOfferDto`** (`backend/apps/offer-service/src/offers/dto/create-offer.dto.ts`): `talentId`, `jobListingId` (optional/nullable), `contractType`, `contractTitle` (conditionally required), `rate`, `currencyCode`, `durationMonths`, `workSchedule`, `startDate`, `message`. **No `contractId`/`contractGroupId`/any field referencing an existing contract or group.**
- **`Offer` entity**: has exactly one contract-related field, `contractId` — nullable, write-*after* acceptance, and confirmed **never actually written anywhere** (`GroupsService.createFromAcceptedOffer` never updates the Offer row). No "target an existing group at creation" field exists.
- **Migration `1790035200000-MakeJobListingIdNullable.ts`**: exists on disk, confirmed (`ALTER COLUMN job_listing_id DROP NOT NULL`, idempotent guarded `down()`). Matches the ticket's "already made nullable" claim — not run anywhere, per instruction, still not run by this ticket either.
- **`OfferCreatedSubscriber`** (`backend/apps/notification-service/src/subscribers/offer-created.subscriber.ts`): exists, confirmed the sole mechanism producing a real in-app notification for `offer.created` (`category: "offers"`, `event: "offer.received"`, `idempotencyKey: "offer.created:<offerId>"`). Confirmed `GroupsService.addMember` (the `addContractGroupMember` backend handler) publishes nothing at all — so that call alone can never have produced a notification, consistent with the QA report.
- **Accept-flow (`GroupsService.createFromAcceptedOffer`)**: unconditionally creates a **brand-new** `ContractGroup` + `Contract` on every accept. It never looks up, attaches to, or adds a member to any pre-existing group — the accepted-offer payload has no existing-group reference to act on (matches the DTO finding above).
- **`addContractGroupMember` → `GroupsService.addMember`**: confirmed to write a real, persisted, live `PENDING` `Contract` row into the **existing** group's roster **synchronously**, the instant the call succeeds — independent of any offer accept/decline, with no consent gate and no event published.

### Conflict conclusion (why Path 1 was NOT changed to also call `createOffer()`)

Calling both at send time is a real, confirmed conflict, not a cosmetic duplicate:
- The talent is added to the existing group's roster **immediately**, before they've seen or agreed to anything (same as today — adding `createOffer()` doesn't fix this, it just also fires a real, unrelated offer on top).
- There is no linkage between the two systems: a later accept of that offer would create a **second, independent, brand-new contract/group**, never reconciled with the one `addContractGroupMember` already populated.

**Options for a product/backend decision** (not decided here, per the ticket's own "STOP and report" instruction):
- **(A)** Drop `addContractGroupMember` entirely for this path and call only `createOffer()`, accepting that until a backend change exists, accept-time will create a brand-new contract/group rather than attaching to the pre-selected existing one — i.e. the "existing contract" selection becomes purely cosmetic until that backend work ships.
- **(B)** Keep `addContractGroupMember` as the real mechanism for this path (today's behavior, unchanged), but fix the misleading "Offer Sent!" copy/flow for it specifically, since no real consent-gated offer exists on this path at all.
- **(C)** The real fix: add a target-existing-group reference to `CreateOfferDto`/`Offer`/the `offer.accepted` event payload, and teach `createFromAcceptedOffer` to call `addMember` against that existing group instead of always creating a new one — then `addContractGroupMember` could be removed from the frontend entirely, with real consent-gated membership happening only on accept.

### Side findings, not part of this fix
- `right-sidebar.tsx`'s resend flow already calls the same `createOffer()`/DTO — confirmed no divergent validation.
- A separate, dedicated `POST /v1/offers/:id/resend` endpoint (`ResendOfferDto`) exists for resending a *terminal* offer by cloning its terms — `right-sidebar.tsx` doesn't use it (calls plain `createOffer()` instead, a pre-existing, unrelated inconsistency, not touched).
- A legacy `PUT /contracts/:id/respond` endpoint (`ContractsService.respondToOffer`) exists with no ownership check and no frontend caller — possibly the "intended" way a talent would respond to an `addMember`-created PENDING row, never wired up. Flagged, not touched.
- Per earlier-session memory (confirmed still accurate): the Inbox "sent an offer…" **chat card** (as opposed to the in-app notification) is a pre-existing, separate, already-reported gap — `chats-comp.tsx`'s rendered offer cards come from a local-only React array, not real data, and messaging-service has no mechanism to inject a system/offer message at all. This ticket's fix makes the **notification** fire for real (via the existing `OfferCreatedSubscriber`) on Paths 2 and 3 going forward, but the **chat card** will still not appear on any path — not a regression, not in scope, already documented.

## What changed

**`components/hire-me-button.tsx`** only:
- Added one new local helper, `submitCreateOffer(talentId): Promise<Offer | null>` — the exact `createOffer()` payload/error-handling (401 redirect, `ACTIVE_OFFER_ALREADY_EXISTS` → `offerSubmitError`, 429/generic toast) Path 3 already had, now shared.
- **Path 2 (`isStepFour`)**: now does the same offline/`hiredTalentId` pre-flight as Path 3, then calls `submitCreateOffer()`, and only sets `createdOffer`/`onSaveOffer`/`setOfferSent(true)` on success. `contractTitle` comes from the Contract Title field — already required for this step by `isOfferReady` (BTB-388, unchanged).
- **Path 3**: refactored to call the same shared helper — **no behavior change**, same payload, same error handling, same success side effects.
- **Path 1 (existing contract)**: **unchanged**, per the conflict above — `addContractGroupMember` is still the only call. Comment rewritten to explain why, with the conflict and options.
- Updated the `createdContract`/`createdOffer` state-declaration comments and the "Review Your Offer" button's own comment to reflect that `createdOffer` is now populated by two branches, not one — no logic change to that button; it already checked `createdOffer` before `createdContract`, so it already does exactly what the ticket asks ("Review Your Offer" opens the in-place `OfferFlowDialog` on both now-real paths, `/my-contracts` fallback stays for Path 1 only).
- `isEditMode` (unchanged), BTB-283 validation (untouched), BTB-388 contract title logic (untouched), success-screen copy (untouched).

### Other entry points checked, confirmed N/A
- `talent-profile-comps.tsx`, `chats-comp.tsx`: zero `createOffer`/`addContractGroupMember`/offer-send logic of their own — both only render `HireMeButton` (this file) or `CounterOfferDialog`, so this one fix covers every page that renders `HireMeButton` (`client-profile`, `my-network`, `talent-profile`, `inbox`, both checkout pages, both case-study views).
- `job-screening/page.tsx`: "Offer Sent" is only a filter-dropdown label, not a send action.
- `right-sidebar.tsx`'s resend flow: already correct (confirmed above).

## Per-path table

| Path | API calls on success | Success screen only on success | 409 on repeat | "Review Your Offer" target |
|---|---|---|---|---|
| 1. Existing contract | `addContractGroupMember()` only (unchanged) | Yes (unchanged) | Via `addContractGroupMember`'s own 409 (unchanged — not a real offer-duplicate check) | `createdContract` → `/my-contracts` (unchanged) |
| 2. Invite to new contract (`isStepFour`) | `createOffer()` (new) | Yes — only after real success | Yes — `ACTIVE_OFFER_ALREADY_EXISTS` → inline error (new) | `createdOffer` → in-place `OfferFlowDialog` (new) |
| 3. Zero existing contracts | `createOffer()` (unchanged, now via shared helper) | Yes (unchanged) | Yes (unchanged) | `createdOffer` → in-place `OfferFlowDialog` (unchanged) |

## Flagged / decisions needed
The Path 1 conflict above (options A/B/C) — the single open item this ticket could not resolve on its own, per its own explicit "STOP and report" instruction.

## Verification
- `npm run types:check`: baseline **re-verified on this fresh dev-main pull = 7**, not the 12 reported in prior tickets this session — confirmed via `git log origin/dev-main` that this is a genuine upstream drop (other merges landed, including this session's own two most recent tickets: `9ccf2d0e` scope-type-dropdown, `a1e7cb7b` service-scope-ongoing-phase), not something this change broke. 0 new errors from this change — none of the 7 touch `hire-me-button.tsx`.
- `npx eslint components/hire-me-button.tsx`: same pre-existing "ESLint couldn't find an eslint.config.(js|mjs|cjs) file" gap reported in every prior ticket this session. Not fixed, out of scope.
- No backend touched — no `npx nest build`/`jest` run needed.

## §3 self-review
Pass on all seven points. `hire-me-button.tsx` explicitly allowed for this ticket. No backend/DB changes. Path 1 deliberately left unchanged rather than guessing at a product decision.

## Follow-up (same day) — Path 1 decision made: option A, create a real offer

Decision: Path 1 now sends a real offer exactly like Paths 2/3, via the
shared `submitCreateOffer()` helper, and no longer calls
`addContractGroupMember` at send time.

**Changes**:
- `submitCreateOffer(talentId, contractTitleOverride?)` gained the optional
  second parameter — when provided, it replaces the default
  `contractTitle.trim() || jobTitle || "Team Member"` chain. Paths 2/3 call
  it with no override (unchanged BTB-388 behavior). Path 1 calls it with
  `contractTitle.trim() || selectedContract.title || jobTitle || "Team Member"`
  — the exact same fallback precedence the old `addContractGroupMember`
  call used for its own `title` field.
- Path 1's body replaced: same offline/`hiredTalentId` pre-flight as
  Paths 2/3, then `submitCreateOffer(hiredTalentId, <title>)`, and only on
  success `setCreatedOffer(offer)` / `onSaveOffer` / `setOfferSent(true)`.
  The existing-contract **selection UI is unchanged** — the client still
  picks a contract; it now only supplies the offer's `contractTitle`.
- **Removed, confirmed fully dead by grep, in this order**: the
  `addContractGroupMember` import (`@/service/http/contracts`); the
  `addMemberError` state + its "This talent is already part of this
  contract." `ErrorMessage` block + its two `setAddMemberError(null)` reset
  sites (`resetFlow()` and the "Change Contract" button's `onClick`); the
  `createdContract` state + its `setCreatedContract(null)` reset in
  `resetFlow()`; the `type ContractDTO` import (only consumer was
  `createdContract`'s type annotation). "Review Your Offer"'s `onClick`
  simplified to just `createdOffer ? open dialog : show the existing error
  toast` — the `/my-contracts` fallback branch (only reachable via
  `createdContract`) removed along with it.
- **One additional removal beyond the ticket's explicit list, reported as
  instructed by the "report exactly what was removed" clause**: removing
  the `/my-contracts` `router.push` left `const router = useRouter()` (and
  its import) with zero remaining uses anywhere in the file — confirmed by
  grep (`router\b` matched only its own declaration). Removed both; this is
  the direct, mechanical consequence of the mandated removal, not a
  separate refactor.
- `addContractGroupMember` **itself** (the API client function in
  `frontend/service/http/contracts.ts`, and its contracts-service backend
  endpoint) was **not touched**, per instruction. Grep confirms **zero
  remaining callers of it anywhere in the frontend** — it is now dead code
  at the API-client level, flagged for awareness, not removed (out of this
  ticket's scope, and may still be useful for the follow-up below or a
  future "respond to an existing-group invite" flow).

## Follow-up ticket (attach an accepted offer to the selected existing contract group)

**What**: today, accepting any offer always creates a brand-new
`ContractGroup` + `Contract` (`contracts-service`'s
`GroupsService.createFromAcceptedOffer`); there is no way for an offer to
say "attach me to contract group G when accepted." For the "client picked
an existing contract" Hire-Me flow to actually land the talent in that
specific group (rather than a disconnected new one), `CreateOfferDto`/the
`Offer` entity need a new optional field (e.g. `targetContractGroupId`),
carried through to the `offer.accepted` event payload
(`AcceptedOfferInput` in `contracts-service/src/subscribers/offer-accepted.subscriber.ts`),
and `createFromAcceptedOffer` needs a branch that calls something like
`GroupsService.addMember` against that existing group instead of always
creating a new one when the field is present. **Where**: offer-service
(`create-offer.dto.ts`, `offer.entity.ts`, migration for the new nullable
column, the event-payload builder) and contracts-service
(`offer-accepted.subscriber.ts`, `groups.service.ts`). **Migration
needed**: yes, one nullable column on `offer_service.offers`.

## Per-path table (current state, this follow-up)

| Path | API call | Success screen gated | 409 on repeat | Review Your Offer target | contractTitle sent |
|---|---|---|---|---|---|
| 1. Existing contract | `createOffer()` (**changed from `addContractGroupMember()`**) | Yes | Yes — `ACTIVE_OFFER_ALREADY_EXISTS` → inline error (new) | `createdOffer` → in-place `OfferFlowDialog` (new) | `contractTitle.trim() \|\| selectedContract.title \|\| jobTitle \|\| "Team Member"` |
| 2. Invite to new contract | `createOffer()` (unchanged from the prior BTB-364 pass) | Yes | Yes | `createdOffer` → in-place `OfferFlowDialog` | Contract Title field (`contractTitle.trim() \|\| jobTitle \|\| "Team Member"`, BTB-388, unchanged) |
| 3. Zero existing contracts | `createOffer()` (unchanged) | Yes | Yes | `createdOffer` → in-place `OfferFlowDialog` | Same default as Path 2 |

## Verification (this follow-up)
- `npm run types:check`: **7/7**, baseline unchanged, 0 new errors — confirmed clean after removing `addContractGroupMember`/`ContractDTO`/`useRouter` with no dangling references.
- `npx eslint components/hire-me-button.tsx`: same pre-existing ESLint v9 flat-config gap.
- Grep proof: zero `addContractGroupMember(` calls in `hire-me-button.tsx`; only other repo references are its own export in `service/http/contracts.ts` (untouched) and this file's own explanatory comments (text, not calls).
