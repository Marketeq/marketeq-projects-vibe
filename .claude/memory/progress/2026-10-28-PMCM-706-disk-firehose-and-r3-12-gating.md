# PMCM-706: the log firehose that filled the disk, R3-12 menu gating, and the dev-main gate reversal

- Date: 2026-10-28
- Branch / PR: PMCM-706-invite-my-team (no PR yet)
- Services / areas: identity-verification-service, invitations-service, listings-service, user-service (companies), frontend my-network, frontend hooks

## What changed

**identity-verification-service — statement logging off.** `database/data-source.ts`
had `logging: process.env.NODE_ENV !== 'production'`, and the gate sweep runs
every 30 seconds, so every pass printed the full 28-column
`hosted_kyc_sessions` SELECT. The PM2 log reached **8.4GB** and took the disk
with it. Now `logging: ['migration', 'error']`, matching `payout-service` —
the only data source in the monorepo that had already made this choice.
`app.module.ts` feeds this same options object into `TypeOrmModule.forRoot`,
so this is the runtime config, not just the CLI's.

**R3-12 — the row menus no longer offer what the server refuses.** Both views
of the External Team row offered **Edit Permissions** to every viewer. The
write is `PATCH /companies/:id/members/:userId`, which user-service gates with
`assertIsAdmin` (`company_users.role === 'admin'`), so a plain member got
"Only company admins can perform this action" from a menu item that looked
available. New `useCompanyAdminIds` in `src/hooks/useCompanies.ts` shares
`KEYS.members` with `useCompanyMemberPermissions`, so it reads the member
lists the page already fetches and adds **no requests**. Threaded as
`AccountMember.viewerIsCompanyAdmin` rather than new component props.

**Resend / Cancel Invite deliberately NOT gated.** They go to
invitations-service, whose `assertCanManageInvitation` admits three different
ways in: the team owner (`inv.teamId === actor.id`), the invitation's creator
(`inv.createdByUserId === actor.id`), or a holder of
`administrator | coordinator | onboarder`. **`createdByUserId` is not on the
frontend's invitation type**, so that predicate cannot be evaluated
client-side. Hiding them on a partial rule would remove actions the server
allows, which is worse than offering one that 403s.

## Findings (not changed)

**`Remove User` can never succeed on an accepted member.** It calls
`handleCancel`, i.e. `cancelInvitation` → the invitations cancel endpoint,
which throws `InvitationNotPendingException` for anything not pending. So on
an active member the server always refuses, while `confirmWithUndo` has
already shown "Your invitation has been canceled". `useRemoveCompanyMember`
exists and `settings/[[...tab]]/page.tsx` uses it correctly — My Network is
simply wired to the wrong endpoint. Left alone because it needs per-row
company state and a decision on the Undo flow.

**All 96 listings-service migrations are unrun locally.** The `listings`
schema holds exactly one table, `migrations`, with **0 rows**. That is why
`listings-service-error.log` held 1.4GB of
`relation "listings.account_gate_state" does not exist` — the `GateStateConsumer`
fails, RabbitMQ redelivers, forever. The migration
(`1799100000000-CreateAccountGateState.ts`) exists and is compiled into dist;
it has just never been applied. Local DB state, no code change. It resumes
filling the disk the moment PM2 starts.

**The disk reclaim.** 9.3GB of PM2 logs truncated, but only ~1.5GB came back
as free space: a single **file-history snapshot of that same 8.4GB log** held
another 7.8GB in `~/.claude/file-history/<session>/`, taken when the previous
session ran `Read` on it. Removing that one file took free space from 5.7GB to
**15GB**. The other 171 source snapshots in that directory are ~300KB each and
were kept.

**Homebrew `node` is broken system-wide** — `simdjson` upgraded to `.33` while
node 25.3.0 links against `libsimdjson.29.dylib`, so the binary will not
start. Everything here ran on nvm's `v24.13.0`. Worth knowing because it fails
*silently*: a `tsc` run through the dead binary printed `0 errors` and looked
like a pass.

**`npm run lint` is broken in `frontend/`** too — `next lint` was removed in
this Next version and parses "lint" as a directory name. Typecheck is the only
working frontend gate.

**Both touched frontend files already failed `prettier --check` at HEAD**, before
any edit. Not fixed: `--write` would reformat unrelated regions and balloon the
diff. Only the lines added here were made prettier-clean.

## The dev-main merge (#832 / PMCM-652)

dev-main **removed the verification gate from invitation acceptance** —
"an unverified user may join the team" — and moved gating to listing creation.
This answers what this epic had logged as its single biggest blocker ("the
identity gate blocks every invitee"), in the opposite direction from a fix:
the gate was deleted, not satisfied.

Resolved per concern, not per side:

- `invitation-exceptions.ts` — kept dev-main's nine exceptions **plus** our four
  Link Settings/forbidden ones; dropped the three gate items it deleted.
- `invitations.service.ts` — took dev-main's removal of the gate import, the
  `IdentityVerificationGateClient` injection and `assertVerificationGateOpen`;
  kept our `InviteSettingsService` dependency and Link Settings imports.
- `invitations.accept-gate.spec.ts` — accepted dev-main's **deletion**. Its 70
  tests went with the gate; `invitations.accept-ungated.spec.ts` replaces them
  with 7 asserting acceptance is *not* gated.

Two fixes the merge itself required, neither side's fault:

- `invitations.link-settings.spec.ts` (ours) stubbed the now-deleted gate client
  to hold the gate open — provider, import and the orphaned rxjs `of` removed.
- `invitations.accept-ungated.spec.ts` (dev-main's, new) could not resolve
  `InviteSettingsService` at constructor index [5], which this branch added and
  dev-main had no way to know about. Given the real service over an empty
  settings table, so acceptance runs against real defaults.

## Verification

- `invitations-service` **42/42 pass** (3 suites). Down from 105 only because
  the 70 gate tests were deleted by #832.
- The three specs #832 added or changed: **50/50 pass**.
- `invitations-service`, `listings-service`, `identity-verification-service`
  all build. The compiled `dist/apps/identity-verification-service/main.js`
  path PM2 actually runs was confirmed to load the new logging value — note
  there is a second, **stale** nested copy at
  `dist/apps/identity-verification-service/src/database/data-source.js` that
  the build does not update and nothing runs.
- Frontend typecheck **unchanged at the 12 baseline errors**, none in the
  touched files.
- **13 listings-service tests fail, all pre-existing on dev-main**:
  `job-listing`, `project-sync`, and a stale `app.controller.spec.ts` importing
  `./listings/project.service`, which does not exist. No commit in the merge
  touches those files, and none of their subjects import anything #832 changed.
- Local data suits the gating check: Alliance Corp. has **1 admin and 6
  members**, so only the admin is offered Edit Permissions now.

## Follow-ups

1. **R3-05 is a decision, not a code task.** `useTeamMemberCount` returns
   `activeTalent + acceptedExternal`, and its own comment cites a "Final Logic
   doc" specifying exactly that sum — which contradicts R3-05's per-tab
   reading. Needs @CTorres9800 to pick a definition before anyone codes it.
2. **Run the listings-service migrations locally** to stop the 1.4GB error loop.
3. **Rewire `Remove User`** to `useRemoveCompanyMember`, with a decision on the
   Undo copy (it currently says "invitation has been canceled").
4. The nine `invite-window.tsx` defects and the two other
   `frontend/components/*.tsx` ones remain frozen — see
   `docs/INVITE_MY_TEAM_NOTES.md` §16.

---

## Update 2026-10-29: all 28 child tickets, the Figma, and a live run

Full detail in `docs/INVITE_MY_TEAM_NOTES.md` §17.

**Read the child ticket, not the epic.** The epic summary omits the numbers and
defaults that decide whether something is a defect. Four things logged as
defects turned out to be correct as built: Send Invite staying enabled with a
staged chip (AC-10.2/R3-13 requires it), the "Invite Your Team" modal title
(UX-29 was a mix-up with the company-selection modal), the row menu composition,
and the Talent Network card's three availability variants.

**The §6 acceptance blocker is gone, verified live:**
`POST /api/v1/invitations/accept` → **201**, invitation `accepted`, roster row
written, count 7 → 8. Test rows deleted after.

**Three gotchas worth keeping:**

1. **Acceptance fires only on "Go to Dashboard"** — every earlier screen reads
   as success while the invitation stays `pending`. Cost me a wrong diagnosis
   mid-run; it must be in any test script.
2. **Wrong-account accept → 403 `EMAIL_MISMATCH`**, which contradicts PMCM-726
   EC-36 ("allowed, records the accepting account"). Ticket vs code.
3. **The backend applies the Viewer default** even though the Invites row shows
   "Select Permissions" — so that gap is presentational only.

**R3-05 is settled** by AC-14.1 ("active members on the open tab only"), so the
member count is a plain defect needing no ruling — a one-line fix in
`useTeamNetwork.ts`, still to do.

**Seeds are local only.** No commit on this branch touches a seed file; the SQL
lives in `~/dev/marketeq-seed/` outside the repo.
