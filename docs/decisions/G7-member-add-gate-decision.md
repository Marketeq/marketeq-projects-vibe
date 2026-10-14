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
| `POST /companies` (the creator becomes the owner member) | user-service | the creator's own bootstrap membership | no - creating one's own company is not an add of another person; see open question |
| `POST /invitations/accept`, `POST /v1/invitations/accept` | invitations-service | via the internal routes above | **yes** (existing G7, unchanged) |
| `POST /v1/teams`, `PUT /v1/teams/:id` (`memberIds`); `POST /v1/my-teams` (creates a team with no members) | listings-service (team profiles) | team profile members | **yes** - `TeamsService.create/update`; bulk partial results (`memberResults`); the creator's own entry is bootstrap |
| `PUT /v1/publish/project/:id/members` | listings-service (listing team roster) | project members | **yes** - bulk; response is now `{ members, results }` |
| `PUT /v1/publish/project/:id` (`teamMemberIds`) | listings-service | listing team roster | **yes** - blocked ids left out, `memberResults` returned |
| `POST /v1/projects`, `PUT /v1/projects/:id` (`teamMemberIds`) | listings-service | listing team roster | **yes** - same; `memberResults` returned |
| `POST /contracts/groups/:id/members` | contracts-service | creates a **contract** for a talent (a hire), not team/company membership | not part of G7 (hiring gates are separate) |
| Job-role assignment (`assignedUserId` on role rows) | listings-service | assigns an existing person to a role of a hiring listing, not a roster add | not part of G7 (G5 governs how assignees are shown) |
| Service listing `teamMemberIds` | listings-service | no writable route (the create/update DTOs do not accept it) | n/a |
| CMS sync (`project-sync`) | listings-service | system sync of CMS content, not a user-triggered add | no |
| Seeds / migrations / `n8n` seeders | various | system bootstrap | no |

## Open questions for Christopher
1. **Company creation** gives the creator an owner membership (their own). It is treated as bootstrap and is not gated;
   say if company creation should itself require an open gate.
2. **Listing rosters** (`project_members`, `teamMemberIds` on listings) were included because they are user-triggered direct adds
   of people to a "team" in the product. If only user-service teams/companies and listings team profiles are meant, those two
   routes can be left ungated.
3. The wizard UI calls `PUT /v1/publish/project/:id/members` ignoring the response; no frontend change was made, so a blocked
   person is silently not added there until a UI decision is made (no copy was invented).

## Implementation
* user-service: `identity-gate/member-add-gate.ts` (`MemberAddGate`, `MemberVerificationRequiredException`,
  `MemberGateUnavailableException`) over the existing `IdentityVerificationGateClient.checkGate` (the same single-account RPC and strict
  reply parser invitation acceptance uses). Wired into `TeamsService.addMember` and `CompaniesService.addMemberInternal`.
* listings-service: `identity-gate/member-add-gate.ts` (`MemberAddGate.evaluate`) over the existing batch client
  `checkGateBatch` (all-or-nothing, fail-closed). Wired into `TeamsService`, `PublishService` and `ProjectsService`.
* Tests: `user-service/src/identity-gate/member-add-gate.spec.ts`; `listings-service/src/identity-gate/member-add-gate.spec.ts`,
  `teams/team.g7-members.spec.ts`, `publish/publish.g7-members.spec.ts`, `projects/projects.g7-members.spec.ts`. Existing
  invitation-acceptance tests (`invitations-service`) are unchanged and pass.
