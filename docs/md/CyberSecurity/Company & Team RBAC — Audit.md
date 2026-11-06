# **Company & Team RBAC — Audit**

**As of:** 2026-10-04
**Covers:** the company-scoped permission model — who can do what inside one client's team. **Not** security review item #11, which is platform administration; see §1.
**Origin:** design review of the invite and team-member screens, and confirmation that the eight functional permission groups in the code are the real model.
**Status:** audit only. **No code was changed.** No files under `frontend/` were read for modification.
**Authoritative source:** `frontend/components/select-permissions-panel.tsx` — 30 permissions in 8 groups, each with a written description.

### **The short version**

The model is better specified than most. Thirty permissions, eight groups, each with a description precise enough to build from. The database carries them, the invite flow collects them, and acceptance writes them onto the membership row.

**Nothing reads them.** Across the backend there is not one authorisation decision that consults a permission. The only enforced company check is `role === 'admin'`, on three routes, and the invite dialog no longer sets that role — it defaults to `viewer`.

Separately, the audit found authorisation holes underneath the model. Several contract and job routes take an object id and act on it with no ownership check at all. A permission layer cannot be built on top of those: there is no point deciding whether a Follower may view a contract while any signed-in account can end one.

---

## **1. This is not item #11**

Two systems share the name and are easy to conflate.

| | **Platform RBAC** (item #11) | **Company RBAC** (this document) |
|---|---|---|
| **Protects** | Marketeq from its users | A client's team members from each other |
| **Who holds a role** | Marketeq staff — currently the owner alone | Every member of every company |
| **Where it lives** | `users.platform_role`, claim on the access token | `company_users.role` + `company_users.permissions` |
| **Scope** | Whole platform | One company |
| **Status** | Built; see `Privileged Access & RBAC — Audit and Implementation.md` | Partly built; this document |

They are independent. A company administrator is not a platform administrator and must never become one by accident. Work on this model should not alter anything built for item #11.

---

## **2. The model, as the code defines it**

Eight groups, four tiers in most: one who can do everything in that area, one or two who can act within limits, one who can only look.

| Group | Permissions (most to least) |
|---|---|
| **Contracts & Hiring** | Hiring Manager, Negotiator, Drafter, Observer |
| **Jobs & Talent** | Recruitment Lead, Recruiter, Sourcer, Spectator |
| **Contract Management** | Project Manager, Producer, Contributor, Follower |
| **Financial** | Treasurer, Finance Lead, Bookkeeper, Auditor |
| **Team & Permissions** | Administrator, Coordinator, Onboarder, Member |
| **Communication** | Communications Lead, Moderator, Correspondent, Listener |
| **Reports & Analytics** | Senior Analyst, Analyst, Reader |
| **Account & Settings** | Account Manager, Profile Editor, Guest |

The descriptions carry the real detail, and they are specific about limits rather than only capabilities — "Cannot end contracts, start new spend, or change settings." That negative framing is what makes the set implementable, and it should be preserved as the specification rather than re-derived.

Selection is multiple-choice: a member holds a set of these, not one. `3 roles selected` in the dialog writes three ids.

---

## **3. What is enforced today**

### **3.1 One real check, on three routes**

`companies.service.ts` has two helpers, and they work:

- `assertIsMember(companyId, userId)` — throws unless the caller belongs to the company
- `assertIsAdmin(companyId, userId)` — throws unless `membership.role === 'admin'`

`assertIsAdmin` guards exactly three things: updating the company, updating a member's role and permissions, and removing a member. The company's creator is written in as `admin`, so a company is never left without one.

That is the entirety of company-scoped authorisation on the platform.

### **3.2 The thirty permissions are write-only**

They are written in three places — onto the invitation, passed from invitations-service to user-service on acceptance, and saved to `company_users.permissions`.

Every read of `.permissions` across the backend was checked. Outside the vendored `scheduling-service` (a third-party codebase, unrelated), **there is no read that influences an authorisation decision.** The array is stored and never consulted.

### **3.3 The invite flow cannot grant the role that is enforced**

`InvitationRole` is `admin | editor | viewer`, and `CreateInvitationDto` defaults it to `VIEWER`. The DTO's own comment explains why: the invite dialog no longer has a role picker, because the permission panel replaced it.

So the one field that is enforced can no longer be set by the person doing the inviting, and the fields they do set are not read.

**The practical effect:** invite somebody with any combination of the thirty permissions and they arrive as a viewer, holding an array nobody consults. Only the company creator is ever an admin.

**This fails closed** — people get less access than intended, not more — so it is a broken feature rather than a vulnerability. It is worth fixing before it becomes one, because the obvious workaround for "my colleague cannot do anything" is to make everybody an admin.

---

## **4. Authorisation holes beneath the model**

These are not permission-model gaps. They are missing ownership checks on routes the model is meant to govern, and they matter more than the model does.

| Route | Service | Problem |
|---|---|---|
| `PUT /contracts/:id/end` | contracts-service | **No ownership check in controller or service.** Any signed-in account can end any active contract. The handler calls `billingClient.finalizeContract`, so it has financial consequences |
| `PUT /contracts/:id/respond` | contracts-service | No ownership check. Any signed-in account can accept or reject any pending contract offer |
| `GET /contracts/:id` | contracts-service | No ownership check. Any signed-in account can read any contract |
| `GET /contracts/talent/:talentId` | contracts-service | No ownership check — while its sibling `GET /contracts/client/:clientId` has one, added under "T2-1" with a comment noting the route "had no ownership check at all before". The sibling was not given the same treatment |
| `PUT /v1/jobs/:id`, `PUT /v1/jobs/:id/publish`, `DELETE /v1/jobs/:id` | listings-service | **No guard of any kind on the controller, and no global guard in the service.** The gateway requires a token for these paths, so not anonymous — but any signed-in account can edit, publish or delete any job |
| `POST /v1/jobs` | listings-service | Authorship is `req.user?.id \|\| dto.createdBy`. Nothing populates `req.user` on this controller, and the gateway sets `userId` rather than `id`, so the fallback always wins: **the creator is whoever the request body says it is** |

contracts-service does have a global `JwtAuthGuard`, so these require a session. They do not require being a party to the contract.

This is the same class of flaw as the wallet-service finding in item #11: the identity is authenticated, the object is not checked against it.

`v1/jobs` sits beside a much better-guarded `v1/job-listings` controller (28 guards across 30 routes). It may be a superseded surface, but it is still routed through the gateway and still reachable, which is the only thing that matters.

---

## **5. The mapping**

Each group against the services that own its routes, and what stands between a caller and those routes today.

| Group | Owning services | Enforced today |
|---|---|---|
| Contracts & Hiring | contracts-service, offer-service, checkout-service | Authentication only on contracts; offer-service and checkout carry per-route guards but no company awareness |
| Jobs & Talent | listings-service, search-service, favorites-service | `v1/job-listings` guarded; `v1/jobs` unguarded; no company awareness anywhere |
| Contract Management | contracts-service, time-tracking-service | Authentication only; no concept of "assigned to me" (see §6) |
| Financial | billing-service, transaction-service, checkout-service, payout-service, wallet-service, pricing-service | Authentication, plus the wallet ownership checks added under item #11. No company awareness, no spend limits |
| Team & Permissions | user-service (companies), invitations-service | **The only group partly enforced** — `assertIsAdmin` covers Administrator's remit; Coordinator, Onboarder and Member are not distinguished |
| Communication | messaging-service | Authentication via `GatewayAuthGuard`; thread participation is the access model, not company permissions |
| Reports & Analytics | transaction-service exports, earnings-service | Authentication only |
| Account & Settings | user-service, auth-service | Authentication only; "manage security" maps onto auth-service's own 2FA and session routes, which are self-scoped already |

Across every one of these, the guards found were authentication guards — `JwtAuthGuard`, `GatewayAuthGuard`, `AuthGuard('jwt')`. **No guard anywhere reads a company permission.**

---

## **6. What the model assumes that the backend may not have**

Four things the descriptions require. Each needs a decision before that part can be built, and none should be guessed.

1. **Per-contract assignment.** Producer, Contributor and Follower are all scoped to *assigned* contracts, against Project Manager's *all* contracts. That distinction needs a record of who is assigned to which contract. If none exists, those three tiers collapse into the top one and the model is weaker than it looks.

2. **Spend limits.** Treasurer "sets and approves spend limits"; Finance Lead approves "within limits". A limit amount has to be stored, attached to a member, and checked at spend time.

3. **How multiple permissions combine.** Holding Hiring Manager and Observer together — presumably the union, most permissive wins. Worth stating explicitly, because the opposite reading (most restrictive wins) is equally defensible and the two produce different systems.

4. **Whether Administrator replaces `role = 'admin'`.** The cleanest route is for the Team & Permissions group to become the source of truth and the coarse `role` column to be derived from it or retired. Running both indefinitely means two answers to the same question.

---

## **7. Recommended sequence**

Ownership before permissions. A permission layer over routes that do not check ownership adds configuration, not security.

1. **Close the §4 holes.** Ownership checks on the contract routes and the `v1/jobs` controller, or confirm `v1/jobs` is dead and remove it. This is the urgent part and does not depend on any decision in §6. Written up as items 1 and 3 of `Authorisation Remediation — Open Code Changes.md`.
2. **Answer the four questions in §6.**
3. **Make the enforced field settable.** Either let the invite flow set `role` again, or derive it from the Team & Permissions selection. Today the invite flow cannot produce a company administrator at all.
4. **Build the permission check**, as a shared module in the pattern already used for `platform-role.core.ts` and `security-audit.ts` — one implementation, copied verbatim, since this monorepo has no working cross-service import.
5. **Roll out in monitor mode first**, as every other control in this sprint did: log what would be refused, read the logs, then enforce.

---

## **8. Change log**

- **2026-10-04** — Audit performed. No code changed. Confirmed with the owner that the eight functional groups in `select-permissions-panel.tsx` are the real model, superseding the Super Admin / Manager / Contributor / Viewer hierarchy shown on the Figma work-in-progress page.
