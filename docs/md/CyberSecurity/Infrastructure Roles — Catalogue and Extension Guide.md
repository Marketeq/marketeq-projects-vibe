# **Infrastructure Roles — Catalogue and Extension Guide**

**As of:** 2026-10-05
**Covers:** the platform-side (infrastructure) role model — who inside the business can do what to the platform. Distinct from the company-scoped model; see `Company & Team RBAC — Audit.md`.
**Origin:** security review item #11, extended once the job roles were named — admin/owner, developer, QA, product manager.
**Status:** implemented on branch `security/gateway-rate-limiting`, **uncommitted**. **Nothing is pushed.** The branch has no upstream, so all of it exists only in one working tree on one laptop. No account holds a role, so nothing has changed in behaviour.
**Standing caveat:** every role except `admin` is **provisional**. The specifications are loose and expected to change. The model is built so that changing them is a data edit.
**Outstanding work:** `Authorisation Remediation — Open Code Changes.md` — eleven changes, written up in full. §8 summarises them. Three predate this work and undercut it.

### **The short version**

Role names used to be written into the guards — `RolesGuard('admin')`, `isRoleAllowed(role, ['admin'])`. That is fine with one role and unworkable with six, because adding a role would mean editing every guard in every service and hoping none were missed.

Roles are now **data**. A single catalogue defines each role and the capabilities it holds. Adding a role, renaming one, or changing what one can do is an edit to one table. No guard changes, no controller changes, no new files.

That is the deliverable: not a finished policy, which nobody can write yet, but a structure that absorbs the policy when it arrives.

**What it does not yet do:** no route asks for a capability. Every call site still names `'admin'`, so five of the six roles are defined and unreachable. Closing that is §8 item 3, and it carries no risk.

---

## **1. The two-layer idea**

The thing that makes this expandable is one layer of indirection.

- A **capability** is a thing somebody can do, named `domain:action` — `finance:approve`, `observability:read`.
- A **role** is a named bundle of capabilities — Developer, QA.
- **Guards ask for capabilities. Roles hold them.**

So a new job title is a new bundle of existing capabilities, and a new feature is a new capability added to whichever roles should have it. Neither requires a guard to be rewritten, which is what went wrong in the first version.

Where this matters in practice: when somebody decides QA should be able to read the moderation queue, that is one word added to one line. Under the old shape it was a hunt through five services for every place `'admin'` appeared.

---

## **2. The roles**

| Role | Rank | Status | Whose job | Holds |
|---|---|---|---|---|
| **admin** | 100 | **confirmed** | The platform owner | **Everything** (`*`) |
| **developer** | 60 | provisional | Builds and operates the platform | `observability:read`, `release:flag:write`, `analytics:read` |
| **finance** | 60 | provisional | Reviews and approves money movement | `finance:read`, `finance:approve`, `wire:review` |
| **qa** | 40 | provisional | Tests the platform | `observability:read`, `qa:fixture:write`, `analytics:read` |
| **product-manager** | 40 | provisional | Owns what gets built | `analytics:read`, `content:queue:read` |
| **support** | 40 | provisional | Answers tickets | `users:read`, `analytics:read` |

`admin` holds a wildcard rather than an enumerated list, so a capability invented next year belongs to the owner the moment it exists. If owner and admin ever need separating, add a higher-ranked `owner` role holding the wildcard and narrow `admin` — and no guard anywhere changes.

### **The capabilities**

| Domain | Capabilities |
|---|---|
| Platform | `platform:role:grant`, `platform:config:write` |
| Users | `users:read`, `users:write`, `users:delete` |
| Money | `finance:read`, `finance:approve`, `finance:move`, `wire:review` |
| Content | `content:queue:read`, `content:moderate`, `content:appeal:resolve` |
| Engineering | `observability:read`, `release:flag:write`, `qa:fixture:write` |
| Reporting | `analytics:read` |
| Service admin | `timetracking:admin`, `checkout:admin` |

---

## **3. Four decisions worth keeping**

**Rank does not grant anything.** Developer outranks QA, and deliberately does not inherit QA's power to rewrite test data. Rank is for display and ordering. Every capability is listed explicitly, or composed through an explicit `inherits`. Implicit inheritance by seniority is how privilege creeps — the role nobody audited quietly acquires the powers of everything beneath it.

**Provisional roles start under-powered.** A role missing a capability produces a support ticket. A role with one too many produces an incident. So each provisional role gets the smallest set that plausibly matches the job and is widened on request. `product-manager` is read-only for exactly this reason: acting on user content is plausible for the title but is a real power, and should be granted deliberately rather than assumed.

**Money is split three ways.** Seeing it, approving it, and moving it are separate capabilities. `finance` can approve a payment already in flight and cannot originate one. Whoever authorises a payment should not also be able to execute an arbitrary one.

**Technical roles do not get user data.** None of developer, QA or product-manager holds `users:write`, `finance:*` or `platform:role:grant`. Production access to customer records is a separate decision from shipping code, and the two are routinely conflated. If developers genuinely need `users:read` to debug, grant it on purpose.

---

## **4. How to extend it**

### **Add a role**

One entry in `platform-roles.catalog.ts`:

```ts
{
  id: 'release-manager',
  label: 'Release Manager',
  rank: 50,
  status: 'provisional',
  summary: 'Controls what ships and when.',
  capabilities: ['release:flag:write', 'observability:read'],
}
```

That is the whole change. The role becomes assignable through `PLATFORM_ROLE_ASSIGNMENTS` and enforceable everywhere, because the assignment validator and the guards both read this list. Copy the edited file to the other five services and restart — the id index is built at module load.

### **Add a capability**

Add it to `CAPABILITIES` with a description, then list it on the roles that should hold it. A capability no role holds is unreachable, which is a safe default rather than a bug. The owner gets it automatically through the wildcard.

### **Protect a route with it**

```ts
@UseGuards(JwtAuthGuard, RolesGuard('finance:approve'))
```

The colon is what distinguishes a capability from a role name. Both forms work, so the existing `RolesGuard('admin')` call sites were not touched — but prefer capabilities in anything new. `RolesGuard('admin')` has to be revisited every time the role list changes; `RolesGuard('finance:approve')` never does.

### **Three ways it fails closed**

No role, an unrecognised role, and an unrecognised capability are all denials. The third matters most: a misspelled `finance:aprove` must not become a route that everybody can reach, so it denies and logs an error naming the typo, once per process.

---

## **5. What still needs the business**

The structure is done. The policy is not, and these are not questions code can answer:

| Question | Why it matters |
|---|---|
| Should developers read production user records? | Currently no. The honest answer depends on how debugging actually happens |
| Should QA's `qa:fixture:write` be refused in production? | The catalogue grants the capability; **nothing yet scopes it by environment.** Today each route would have to check. §8 item 7 proposes making that structural instead |
| Should product managers action the moderation queue, or only read it? | Currently read-only |
| Do finance and support survive as roles? | Carried over from the first version; nobody has confirmed they match real jobs |
| Who may grant roles? | Only `admin` holds `platform:role:grant`, and today granting is an environment variable plus a deploy, so the capability is not yet enforced anywhere |

Answering any of these is an edit to the catalogue, which is the point.

---

## **6. Current state**

Inert. `PLATFORM_ROLE_ASSIGNMENTS` is empty, so no account holds a role, so every role-protected route refuses everyone — as it did before this change. The model becomes live when the owner enrols in 2FA and is assigned `admin`; see `Privileged Access — Finalisation Checklist.md`.

Every privileged decision is recorded in the security audit log either way.

---

## **7. Verification**

- **115 tests passing** across the security work, in 11 suites; `tsc --noEmit` clean for every service touched; the new import paths compiled against the real directory layout.
- 24 of those tests cover this catalogue, including: the owner holds every capability that exists; finance can approve but not move funds; no technical role holds `users:write`, `finance:move` or `platform:role:grant`; rank does not imply inheritance; and an unknown role, an absent role and a misspelled capability all deny.
- One test asserts every capability granted to a role actually exists in the registry, so a typo in the catalogue fails the build rather than silently granting nothing.
- No `frontend/` files changed.
- **Not verified:** anything requiring deployment. No role has ever been held by a real account.

---

## **8. Code changes still needed**

Eleven outstanding changes are written up in full — what each one is, why it matters, the change, the risk and how to verify — in **`Authorisation Remediation — Open Code Changes.md`**. Summarised here so this document is not misread as describing a finished system.

| # | Change | Severity |
|---|---|---|
| 1 | Ownership checks on the contract routes — any signed-in account can end, accept or read any contract | **Critical** |
| 2 | Guard `POST /wire-transfer` — any signed-in account can create a wire transfer record | **High** |
| 3 | Guard or delete `v1/jobs` — any signed-in account can edit, publish or delete any job | **High** |
| 4 | Resolve payout-service's `RolesGuard`, which is applied to no route | Medium |
| 5 | Delete contracts-service's two dead role guards, which read the user-writable `role` field | Medium |
| 6 | **Point existing routes at capabilities** — no route asks for one, so five of the six roles are unreachable | Medium |
| 7 | Parameterise content-moderation's `AdminGuard` so it can express a capability | Medium |
| 8 | Refuse production-forbidden capabilities in the catalogue rather than per route | Medium |
| 9 | Role check and audit hook for wire-review | Medium |
| 10 | Register the durable audit sink in the other four services | Low |
| 11 | Enforce the `/users` cross-user and list-all checks | Medium |

**Item 6 is the one that matters most for this document.** The catalogue is wired into the assignment validator and the guards, and nothing consumes it: every call site still names `'admin'`. Until routes ask for capabilities the model protects nothing new, and the first person handed a `developer` role will report that it does nothing. The migration is mechanical and carries no behavioural risk, because the owner passes through the wildcard either way and no other account holds a role.

Items 1, 2 and 3 are not role-model problems. They are routes that act on an object without checking the caller has any claim to it, and they matter more than the model does — a permission layer over routes that do not check ownership adds configuration rather than security.

---

## **9. Change log**

- **2026-10-05** — Role model moved from hardcoded names to a capability catalogue. Added `developer`, `qa` and `product-manager`; `admin` became a wildcard holder; `finance` and `support` carried over as provisional. `isRoleAllowed` extended to accept capability requirements with every existing call site unchanged. The auth-service assignment validator and the user-service enum now source their role list from the catalogue instead of keeping private copies.
- **2026-10-05** — Reviewed the whole platform-role surface for outstanding work and recorded it as §8. Found two dead role-guard copies in contracts-service still reading the user-writable `role` field, and a `RolesGuard` in payout-service applied to no route.
