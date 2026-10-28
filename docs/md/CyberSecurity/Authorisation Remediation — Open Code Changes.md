# **Authorisation Remediation — Open Code Changes**

**As of:** 2026-10-05
**Covers:** every outstanding authorisation change found across the security sprint — the holes beneath the role model, the security machinery that protects nothing, and the work left to make the platform role catalogue load-bearing.
**Status:** **none of these are done.** This is the work list, not a record of work. The sprint's own changes are also unpushed — rate limiting and CSRF are committed as `1b132e47`, everything after it is uncommitted, and the branch has no upstream.
**Related:** `Infrastructure Roles — Catalogue and Extension Guide.md` (the role model), `Privileged Access & RBAC — Audit and Implementation.md` (what was built), `Company & Team RBAC — Audit.md` (the separate company-scoped model).

### **The short version**

Eleven changes, in three kinds.

**Four are live authorisation holes** — routes that take an object id and act on it without checking the caller has any claim to it. Two of them move money. These are not role-model problems and do not wait on any decision; they are the first thing to fix, because a permission layer over routes that do not check ownership adds configuration rather than security.

**Two are security machinery that exists and protects nothing** — a guard applied to no route, and two more reading a field a user can set about themselves. Both read as coverage in a review. Dead security code is worse than none.

**Five are finishing the role model.** The catalogue is in place and nothing consumes it yet.

| # | Change | Severity | Size | Blocked by |
|---|---|---|---|---|
| 1 | Ownership checks on the contract routes | **Critical** | Small | — |
| 2 | Guard `POST /wire-transfer` | **High** | Small | — |
| 3 | Guard or delete `v1/jobs` | **High** | Small | A decision: is it dead? |
| 4 | Resolve payout-service's unused `RolesGuard` | Medium | Small | A decision |
| 5 | Delete contracts-service's two dead role guards | Medium | Small | — |
| 6 | Point existing routes at capabilities | Medium | Medium | — |
| 7 | Parameterise content-moderation's `AdminGuard` | Medium | Small | — |
| 8 | Refuse production-forbidden capabilities structurally | Medium | Small | — |
| 9 | Role check and audit hook for wire-review | Medium | Small | — |
| 10 | Durable audit sink in the other four services | Low | Small | — |
| 11 | Enforce the `/users` ownership checks | Medium | Small | A week of monitor logs |

---

## **A. Live authorisation holes**

### **1. Any signed-in account can end, accept or read any contract**

**Where** `contracts-service/src/contracts/contracts.controller.ts`

**Now** The controller has eleven routes and no `@UseGuards`. The service registers a global `JwtAuthGuard`, so a caller must be signed in — but nothing checks *which* caller:

```
PUT  /contracts/:id/end            no ownership check
PUT  /contracts/:id/respond        no ownership check
GET  /contracts/:id                no ownership check
GET  /contracts/talent/:talentId   no ownership check
```

`endContract` fetches the contract, confirms it is `ACTIVE`, and calls `billingClient.finalizeContract`. `respondToOffer` accepts or rejects a `PENDING` contract. Neither compares anything to the caller.

The sibling `GET /contracts/client/:clientId` **does** check, added under a ticket whose own comment records that the route "had no ownership check at all before". The routes beside it were not given the same treatment.

**Why it matters** Ending a contract has a billing consequence. Accepting one commits a party to work they never agreed to. Reading one exposes rates and terms between two other parties. This is the same class as the wallet-service finding — authenticated identity, unchecked object — and it reaches further.

**The change** The entity carries `clientId` and `talentId`. Each of these routes should confirm `req.user.sub` matches one of them, with the write routes narrowed further to whichever party is entitled to that action — a talent accepts an offer, a client ends a contract. A small shared helper in the service, in the pattern of `wallet-owner.ts`, keeps the rule in one testable place.

**Risk of the change** Low. The rule is "are you a party to this contract", which no legitimate caller fails. Worth shipping in monitor mode first if there is any doubt about internal callers.

**Verify** A signed-in account that is neither party gets a 403 on all four. Both parties keep their current access. Unit tests on the helper, covering caller-is-client, caller-is-talent, and caller-is-neither.

### **2. Any signed-in account can create a wire transfer**

**Where** `wire-review-service/src/controllers/wire-transfer.controller.ts`

**Now** `POST /wire-transfer` has no guard, and wire-review-service registers no global guard either. The handler takes a `CreateWireTransferDto` and creates a wire transfer intent with the supplied invoice id, amount and currency. The gateway requires a token for this path, so not anonymous — but no further check exists.

The file also contains a large commented-out second copy of the same controller, including an email template that would send bank routing and account numbers pulled from environment variables.

**Why it matters** It creates a financial record from caller-supplied values. The confirmation step is guarded; origination is not.

**The change** Require the internal service token, as `AdminReviewController` in the same service already does, or tie the transfer to the caller's own invoice. Which one depends on who is meant to call this — worth confirming before choosing. Delete the commented-out block regardless: dead code containing a credential-bearing email template is a liability in its own right.

**Risk** Low, but confirm the caller first — if the frontend calls this directly, the internal-token option breaks it and the ownership option is the right one.

**Verify** A signed-in account with no claim to the invoice gets a 403. The legitimate caller is unaffected.

### **3. Any signed-in account can edit, publish or delete any job**

**Where** `listings-service/src/.../job.controller.ts`

**Now** `@Controller('v1/jobs')` has no guard on the class or any method, and listings-service registers no global guard:

```
PUT    /v1/jobs/:id          edit any job
PUT    /v1/jobs/:id/publish  publish any job
DELETE /v1/jobs/:id          delete any job
POST   /v1/jobs              authorship from req.user?.id || dto.createdBy
```

On the create route, nothing populates `req.user` on this controller, and the gateway sets `userId` rather than `id`, so `req.user?.id` is always undefined and the body-supplied `createdBy` always wins. A caller declares their own authorship.

**Why it matters** Publishing and deleting other people's job postings is a direct integrity problem, and caller-declared authorship undermines every later ownership check that trusts `createdBy`.

**The change** This controller sits beside `v1/job-listings`, which has 28 guards across 30 routes and looks like the current surface. **Establish first whether `v1/jobs` is superseded.** If it is, delete it and remove the gateway mapping — much better than guarding code nobody uses. If it is live, it needs the same guard treatment as its neighbour, and `createdBy` must come from the token.

**Risk** Deleting is zero risk if genuinely unused; the gateway mapping makes it reachable, so confirm with logs rather than by reading.

**Verify** Either the routes 404, or a non-owner gets a 403 and `createdBy` cannot be set from a request body.

---

## **B. Security machinery that protects nothing**

### **4. payout-service's role guard is applied to no route**

**Where** `payout-service/src/guards/roles.guard.ts`

**Now** The file exports `ROLES_KEY`, a `@Roles()` decorator and a `RolesGuard` class. It is unit-tested. Searching the service for either outside the guard file and the catalogue returns nothing: **neither is applied to a single route.** The money service has no platform-role check anywhere.

The guard's own header comment references "admin endpoints (PS-24)", so either those endpoints exist without their guard, or they were never built.

**Why it matters** It is worse than having nothing. A reviewer seeing a tested `RolesGuard` in the money service reasonably concludes the admin routes are protected.

Note also its default: with no `@Roles` metadata on a route, `canActivate` returns true. So applying the guard without the decorator protects nothing while looking like it does.

**The change** Decide which it is. If the admin endpoints exist, apply the guard with an explicit capability. If they do not, delete the guard and its tests, and record why.

**Risk** None either way.

**Verify** Either `grep` finds the guard applied to real routes, or the file is gone.

### **5. contracts-service has two dead role guards reading a user-writable field**

**Where** `contracts-service/src/guards/roles.guard.ts` and `contracts-service/src/middleware/roles.guard.ts`

**Now** Two separate copies, neither applied to anything. Both decide access from `user.role`:

```ts
if (!allowedRoles.includes(user.role)) throw new ForbiddenException(...)
```

`role` is the profile label — talent, client, admin — exposed by `UpdateUserDto`, which means it is a field a user can set about themselves. This is exactly the escalation path removed from the shared `platform-role.core.ts`.

**Why it matters** Inert today: neither guard is applied, and no access token carries `role`. But both are one `@UseGuards` away from turning a profile edit into platform privilege, and they are sitting in the repository looking like the way role checks are done here.

**The change** Delete both. If contracts-service later needs role checks, copy the shared `platform-role.core.ts` as the other four services did — `req.user` here is the whole decoded payload, so `platformRole` is already available.

**Risk** None. Dead code.

**Verify** The files are gone, and no import of them remains.

---

## **C. Making the role model load-bearing**

### **6. No route asks for a capability**

**Where** Every call site: checkout, time-tracking, content-moderation.

**Now** All of them name the role directly:

```ts
@UseGuards(JwtAuthGuard, RolesGuard('admin'))   // checkout, time-tracking
@UseGuards(JwtAuthGuard, AdminGuard)            // content-moderation
```

The catalogue defines six roles and nineteen capabilities. **No route consults a capability**, so developer, QA, product-manager, finance and support are defined and unreachable. Granting someone `finance` today gives them nothing.

**Why it matters** This is the difference between a role model that works and one that is decorative. It is also how the model gets a bad name — the first person handed a role will report it does nothing.

**The change** Point each route at the capability it actually needs:

| Route group | Now | Becomes |
|---|---|---|
| time-tracking settings, manual time, screenshots | `RolesGuard('admin')` | `RolesGuard('timetracking:admin')` |
| checkout admin route | `RolesGuard('admin')` | `RolesGuard('checkout:admin')` |
| content moderation actions | `AdminGuard` | `content:moderate` |
| moderation appeals | `AdminGuard` | `content:appeal:resolve` |

**Risk** None. `admin` holds the wildcard, so it continues to pass every one of these, and no other account holds a role. Requires item 7 for the content-moderation half.

**Verify** Existing tests pass unchanged; a test asserting `admin` still satisfies each new requirement, and that a role without the capability does not.

### **7. content-moderation's AdminGuard cannot express a capability**

**Where** `content-moderation-service/src/guards/admin.guard.ts`

**Now** The requirement is hardcoded inside the guard as `['admin']`, so every route using it asks for the role by name and none can ask for `content:moderate`.

**The change** Accept an optional requirement, defaulting to `'admin'` so existing call sites are untouched — either a mixin factory like the `RolesGuard` in checkout and time-tracking, or a `@RequiresCapability()` decorator read through the reflector.

**Risk** Low; backwards compatible by construction.

**Verify** Existing usages behave identically; a new usage with a capability resolves through the catalogue.

### **8. A capability that must never apply in production is not enforced as one**

**Where** `platform-roles.catalog.ts`, `platform-role.core.ts`

**Now** `qa:fixture:write` lets a holder create or reset test data. The catalogue grants it to the `qa` role, and nothing prevents it being honoured in production. The current guidance is that whichever route honours it should check the environment itself.

**Why it matters** "Remember to check the environment" in a comment is how it gets forgotten, and the route that forgets will be written months from now by someone who never read the comment. Never applying in production is a property of the capability, not of the routes that happen to use it.

**The change** A `PRODUCTION_FORBIDDEN_CAPABILITIES` set in the catalogue, checked inside `hasCapability`:

```ts
if (PRODUCTION_FORBIDDEN_CAPABILITIES.has(capability) && isProduction()) return false
```

A future route then cannot get it wrong, and adding another environment-restricted capability is one more entry in the set.

**Risk** None today — no route honours the capability yet. Cheapest now, before one does.

**Verify** `hasCapability('qa', 'qa:fixture:write')` is true outside production and false with `NODE_ENV=production`, including for `admin`'s wildcard.

---

## **D. Coverage gaps**

### **9. wire-review-service has neither a role check nor an audit record**

**Where** `wire-review-service/src/controllers/admin-review.controller.ts`

**Now** Guarded by `InternalServiceGuard` — a shared internal token, which authenticates a *service* rather than a person. The `wire:review` capability exists in the catalogue with nothing honouring it, and the service holds no copy of the audit module, so **confirming a wire transfer leaves no audit record naming who did it.**

**Why it matters** It is the most consequential privileged action on the platform, and it is the one action nobody can later attribute to a person.

**The change** Copy `security-audit.ts` into the service and record the resolve action; and decide whether wire confirmation should additionally require the `wire:review` capability from a named human rather than only a shared service token. A shared token cannot name a person in an audit log, which is the whole point of having one.

**Risk** Low for the audit hook. The role check needs confirmation of who calls this today.

**Verify** A resolve action produces an `AUDIT` line naming the actor.

### **10. The durable audit sink runs in one service**

**Where** payout, checkout, time-tracking, content-moderation

**Now** All four hold the shared audit module and write to stdout only. Only user-service registers the database sink, so everywhere else the record lasts as long as platform log retention.

**The change** Copy `audit-sink.database.ts` and call `registerDatabaseAuditSink(app.get(DataSource))` in each `main.ts`. One line each. payout first — its actions move money.

**Risk** None. The sink fails soft; a failure degrades to stdout and never affects the request.

**Verify** Each service logs `security audit sink registered` at startup and rows appear with the right `service` value.

### **11. The `/users` ownership checks are still log-only**

**Where** `user-service/src/guards/user-access.guard.ts`

**Now** `role-escalation` enforces. `cross-user` and `list-all` are monitor-only, so a signed-in account can still read, edit and delete other people's records.

**The change** Set `USER_ACCESS_MODE=enforce` once the monitor logs show which legitimate callers exist, giving each the internal service token or an explicit exemption first.

**Risk** Medium, and the reason this is last — these two checks plausibly have legitimate callers, and enforcing blind breaks a working flow. The logs exist precisely to find them.

**Verify** `WOULD BLOCK [cross-user]` and `[list-all]` lines fall to zero for legitimate traffic before the switch is flipped.

---

## **E. Suggested order**

1. **Items 1, 2, 3** — the live holes. No decisions needed beyond whether `v1/jobs` is dead.
2. **Items 5, 8** — pure deletions and a small safety change, no behavioural risk.
3. **Items 7, 6** — in that order; the guard has to accept a capability before routes can ask for one.
4. **Items 4, 9** — each needs a short answer about who calls what.
5. **Item 10** — any time.
6. **Item 11** — after a week of monitor logs.

Items 1 to 10 are all low risk and none depends on the role specifications being finalised.

---

## **F. Change log**

- **2026-10-05** — Compiled from the rate limiting, CSRF, privileged access and company RBAC audits, plus a review of the platform role surface. `POST /wire-transfer` (item 2) and payout-service's unapplied `RolesGuard` (item 4) were found during that review and are recorded here first.
