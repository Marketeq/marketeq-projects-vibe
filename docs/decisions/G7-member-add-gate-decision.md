# G7 team and company membership gate - invitation acceptance and direct adds

Status: **ACCEPTED (Christopher, final G7 decision).** Direct team and company member-add routes check the verification
gate of **every person being added**, with the same gate condition, HTTP behaviour and error code as invitation acceptance.
The gate applies to the **resulting membership**, however it came about.

## The rule
* **Condition:** `gate_open = is_verified OR in_grace` (30-day grace), answered by identity-verification-service. Verified and
  grace-period people may be added; a closed gate (unverified, expired, no profile) may not.
* **Subject:** the person being added - **never** the owner, administrator or client performing the action, and never a
  verification value supplied in the request (request bodies are not read for it).
* **Order:** the gate runs **before** any membership row is created, event published or other side effect, and after the
  existing authentication/authorization/validation (a non-party learns nothing about the gate).
* **Existing members:** re-adding someone already on the roster (or changing an existing member's role) creates no
  membership, so nothing is gated or removed. A member whose gate later closes is not removed (G5 only hides them from
  client-facing views).
* **Invitation creation stays allowed.** The invitee can verify and then accept; acceptance remains gated (`invitations-service`,
  unchanged).

## Responses (same as invitation acceptance)
| Situation | Status | `error` |
|---|---|---|
| Gate closed for the person being added | 403 | `VERIFICATION_REQUIRED` |
| Gate could not be evaluated (no broker, RPC error, timeout after 3 s, unusable or self-contradicting reply) | 503 | `IDENTITY_VERIFICATION_UNAVAILABLE` |

Envelope `{ success: false, error, message }`, like the invitation exceptions. Unlike acceptance (where the caller is the
person), a direct add refuses someone **other than the caller**, so the response deliberately does **not** carry that person's
`missingRequirements`: an administrator must not learn what another account still has to verify.

## Bulk additions: partial results
A request that adds several people is **never failed because one is blocked**. Every person who would be a new membership is
evaluated in **one batch gate request** (`identity_verification.gate_check_batch`, never one per member), every eligible person
is added, and the caller gets **one result per input, in input order** (`index` is the position of the input entry):

| `status` | `added` | `error` | Meaning |
|---|---|---|---|
| `added` | true | - | membership created |
| `already_member` | false | - | already on the roster; nothing created, not re-gated |
| `blocked_verification` | false | `VERIFICATION_REQUIRED` | gate closed - **not added**; same code as acceptance |
| `invalid` | false | `INVALID_MEMBER` | not a usable user id - not added |
| `duplicate` | false | `DUPLICATE_MEMBER` | repeated earlier in the request - not added again |

Unauthorized requests are refused as a whole by the existing owner/membership checks (403) before anything is evaluated. A
failed entry produces no membership row and no downstream event; successful entries are never rolled back. If the **gate itself**
cannot be evaluated, the request fails exactly as an acceptance does (503 `IDENTITY_VERIFICATION_UNAVAILABLE`) and **nobody** in it
is added - an unanswered gate is a closed gate.

## Route audit
| Route / method | Service | Creates membership? | Gated |
|---|---|---|---|
| `POST /teams/:teamId/members` (direct single add) | user-service | team member | **yes** - `TeamsService.addMember` |
| `POST /internal/teams/:teamId/members` (internal; used by invitation acceptance and invite-link acceptance) | user-service | team member | **yes** - same method (acceptance has already checked, so this is a second, cheap check; a blocked person is refused 403) |
| `POST /internal/companies/:id/members` (internal; used by invitation acceptance) | user-service | company member | **yes** - `CompaniesService.addMemberInternal`, new memberships only |
| `PATCH /companies/:id/members/:userId` | user-service | no - edits an existing member | no |
| `DELETE /teams/.../members/:userId`, `DELETE /companies/.../members/:userId` | user-service | no | no |
| `POST /companies` (the creator becomes the owner member) | user-service | the creator's own bootstrap membership | no - outside the direct-add decision (decided) |
| `POST /invitations/accept`, `POST /v1/invitations/accept` | invitations-service | via the internal routes above | **yes** (existing G7, unchanged) |
| `POST /v1/teams`, `PUT /v1/teams/:id` (`memberIds`); `POST /v1/my-teams` (creates a team with no members) | listings-service (team profiles) | team profile members | **yes** - `TeamsService.create/update`; bulk partial results (`memberResults`); the creator's own entry is bootstrap |
| `PUT /v1/publish/project/:id/members` | listings-service (listing team roster) | project members | **yes** - bulk; response is now `{ members, results }` (the wizard and My listings read it - see Frontend behaviour) |
| `PUT /v1/publish/project/:id` (`teamMemberIds`) | listings-service | listing team roster | **yes** - blocked ids left out, `memberResults` returned |
| `POST /v1/projects`, `PUT /v1/projects/:id` (`teamMemberIds`) | listings-service | listing team roster | **yes** - same; `memberResults` returned |
| `POST /contracts/groups/:id/members` | contracts-service | creates a **contract** for a talent (a hire), not team/company membership | not part of G7 (hiring gates are separate) |
| Job-role assignment (`assignedUserId` on role rows) | listings-service | assigns an existing person to a role of a hiring listing, not a roster add | not part of G7 (G5 governs how assignees are shown) |
| Service listing `teamMemberIds` | listings-service | no writable route (the create/update DTOs do not accept it) | n/a |
| CMS sync (`project-sync`) | listings-service | system sync of CMS content, not a user-triggered add | no |
| Seeds / migrations / `n8n` seeders | various | system bootstrap | no |

## Decided scope (no open questions)
* **Company/team creator bootstrap** (the creator's own owner membership when they create a company, team or listing) is **outside
  the direct-add decision**: it is not a separate member-add route and adds nobody else, so it is not gated.
* **User-triggered listing roster routes stay gated** (`PUT /publish/project/:id/members`, `teamMemberIds` on the draft and project
  routes, team profile `memberIds`) because they directly add people to a team/project roster.

## Frontend behaviour (listing wizard and "My listings" team)
The roster is saved by endpoints that answer with one result per entry, so the pages now read them (`frontend/lib/member-add-results.ts`,
pure logic, shown with the pages' existing `toast`; no new UI):

* **Successful additions stay.** A blocked person never fails the save, so everyone eligible is added and kept.
* **The owner is told who was not added, by name** (the member's first name/username, otherwise "this person"), one message per person,
  four outcomes kept distinct:

  | Result | Message |
  |---|---|
  | `blocked_verification` | "Couldn’t add *name*. Their account is not currently eligible to join the team." |
  | `invalid` | "Couldn’t add *name*. This isn’t a valid team member." |
  | `duplicate` | "*name* was listed more than once, so they were only added once." |
  | `already_member` | "*name* is already on the team." - only for someone the owner just chose to add (the autosave re-sends the whole roster, where this is routine and is not announced) |

  The copy never says why, never repeats `missingRequirements` (the server does not send it), and never mentions verification.
* **Not added means not shown as added:** the person is taken back out of the roster on screen (`teamMemberIds`), and the success toast
  ("Team member added to project") is shown only when the server says the person was added.
* **Gate service unavailable (503 `IDENTITY_VERIFICATION_UNAVAILABLE`):** nobody was added, so the page puts the roster back and shows
  "We couldn’t update the team right now. Please try again shortly." (in My listings' team settings, every other save failure keeps the
  existing "Failed to save team settings"). It never claims anyone was added, and the wizard's autosave cannot retry in a loop.
* **Order** is the server's: results are 1:1 with the entries sent.

### Frontend caller audit (responses that changed)
| Caller | Endpoint | Change needed | Done |
|---|---|---|---|
| `app/edit-listing/[slug]/page.tsx` Team step autosave | `PUT /publish/project/:id/members` (now `{ members, results }`) | read results, report, drop | yes |
| `app/edit-listing/[slug]/page.tsx` `persistTeam` (add/remove from the wizard) | `PUT /publish/project/:id` with `teamMemberIds` (adds `memberResults`) | read results, report, revert on 503 | yes |
| `app/(group)/my-listings/[slug]/page.tsx` `saveTeamSettings` | `PUT .../members` | read results; "saved" only if nobody was left out | yes |
| `app/(group)/my-listings/[slug]/page.tsx` `addMemberToProject` | `PUT /publish/project/:id` with `teamMemberIds` | success only if added; revert + failure otherwise | yes |
| `app/(group)/my-listings/[slug]/page.tsx` remove-member flow | both of the above | consume results (nothing added; any refusal is still reported) | yes |
| `GET /publish/project/:id/members` (`ProjectAPI.GetProjectMembers`, edit-listing hydration) | unchanged: still a bare array | none | n/a |
| `ProjectAPI.UpdateProjectDraft` / `CreateProjectDraft` callers that do not send `teamMemberIds` (publish-project, job-listing, edit-listing field saves, FAQ/video) | unchanged; `memberResults` is additive and only present when `teamMemberIds` was sent | none | n/a |
| `TeamsAPI.addTeamMember` (`POST /teams/:id/members`) | now may return 403 `VERIFICATION_REQUIRED` / 503 | no active caller (defined, never used) | n/a |
| `project-details/[slug]` thread creation (`teamMemberIds` to `/v1/threads/project`) | unrelated messaging endpoint | none | n/a |

No other caller reads the `PUT .../members` response, so changing it from a bare array to `{ members, results }` breaks nothing; the reader
also accepts the old bare array.

### Tests and manual QA
The frontend has no unit/e2e runner (`npm run types:check`, `lint` and Storybook only), so there is no committed frontend test. The helper's
parsing and copy were exercised with a temporary spec and `types:check` shows only the 15 pre-existing errors. Manual QA in staging:
1. As a listing owner open the wizard's Team step and add one verified and one unverified member. Expect: the verified member stays; a toast
   "Couldn’t add *name*. Their account is not currently eligible to join the team."; the unverified member is not left on screen; reload shows
   only the verified member.
2. In My listings → Team add an unverified member: expect the same neutral toast and **no** "Team member added to project" toast.
3. In My listings → team settings save a roster that includes an unverified member: expect the toast for that member and no "Team settings saved".
4. Stop identity-verification-service (or RabbitMQ) and add a member: expect "We couldn’t update the team right now. Please try again shortly.",
   the roster restored, and no success toast.
5. Confirm no toast or response shows what the person still has to verify.

## Implementation
* user-service: `identity-gate/member-add-gate.ts` (`MemberAddGate`, `MemberVerificationRequiredException`,
  `MemberGateUnavailableException`) over the existing `IdentityVerificationGateClient.checkGate` (the same single-account RPC and strict
  reply parser invitation acceptance uses). Wired into `TeamsService.addMember` and `CompaniesService.addMemberInternal`.
* listings-service: `identity-gate/member-add-gate.ts` (`MemberAddGate.evaluate`) over the existing batch client
  `checkGateBatch` (all-or-nothing, fail-closed). Wired into `TeamsService`, `PublishService` and `ProjectsService`.
* Tests: `user-service/src/identity-gate/member-add-gate.spec.ts`; `listings-service/src/identity-gate/member-add-gate.spec.ts`,
  `teams/team.g7-members.spec.ts`, `publish/publish.g7-members.spec.ts`, `projects/projects.g7-members.spec.ts`. Existing
  invitation-acceptance tests (`invitations-service`) are unchanged and pass.
