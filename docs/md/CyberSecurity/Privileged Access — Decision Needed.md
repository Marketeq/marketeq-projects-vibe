# **Privileged Access — Decision Needed**

> **DECIDED (2026-10-01): Option A — platform administration lives in the main user system.**
> Implementation has not started. The first step is a read-only check of the
> `/users` routes (see "Next step" at the end of this document), because a role
> is only meaningful once it cannot be self-assigned.

## **The question**

**Where should platform administration live?** Everything else in the privileged-access work depends on this answer, and it is a product and architecture call rather than a security one.

### **Option A — In the main user system**

Add a role to the user record, put a role claim in the access token, and build an admin interface. The four existing role guards start working, and one identity system covers everyone.

- Admins are platform users, so 2FA, session management and audit logging apply to them automatically.
- Most work. Needs a role model, an admin UI, and a careful rollout, since turning on checks that have silently been rejecting everyone can break flows people have worked around.

### **Option B — Stay in the Payload CMS**

Administration keeps its own users in the CMS, and backend admin endpoints are reached only by internal service calls, which is what the wire-review fix already does.

- Least work; matches how things actually operate today.
- Two identity systems to keep in step. The CMS becomes a very high-value target, and admin actions are harder to tie back to a named person in the platform's own logs.

**Needed from you:** a decision, and an owner for whichever path is chosen.

---

## **Why the question exists**

The review item assumed there was a role system to audit. There is not.

The access token carries only `sub`, `email` and `sid` — no role. Four separate role guards (payout, checkout, time-tracking, content-moderation) all check a field that is always undefined. They fail closed, so nothing is wide open, but every role-protected endpoint currently rejects everyone. `admin-service` is a nine-line stub, `user.role` is a profile label rather than a security role, and real admin capability sits in the Payload CMS with its own users and its own login.

So the task is not "audit RBAC." It is "decide where admin lives, then build it."

---

## **What was fixed in the meantime**

Two findings did not depend on the decision, so they are done. Both are on branch `security/gateway-rate-limiting`, not merged or deployed.

### **1. wallet-service accepted any user id** *(highest severity)*

The service had **no guard of any kind**, and took the user id from the request body or URL. It is live in production and reachable through the gateway, which only proves the caller is signed in as *somebody*. So any logged-in user could read another user's balance, apply a gift card to another account, create a top-up intent against one, and — through `wallet/checkout/use-wallet` — **spend another user's balance**.

This is broken object-level authorization, not a role problem. No amount of RBAC work would have fixed it.

**Fixed by** adding a local token-verifying guard (the pattern used by all but two services) and deriving the user id from the verified token on all four routes. The change is deliberately non-breaking: request shapes are unchanged, and a body naming someone else is ignored rather than rejected, so no legitimate caller can be broken while an attempt stops working immediately. Eight new unit tests.

### **2. The wire-review admin endpoint had no guard**

`POST admin/wire-review/resolve` confirms or flags a wire transfer. It had no guard, and the `adminId` recorded as the audit trail came from the request body — the caller stated who they were.

It appears unreachable from the internet, because the gateway routes the `admin` prefix elsewhere, but that is a routing accident rather than a control.

**Fixed by** requiring the shared internal-service token, failing closed if that token is unset, with a timing-safe comparison. The internal token was used because roles do not exist to check; when they do, this should become a role check so a named human authorises a wire.

**Also checked:** the other seven money-handling services. No other route takes a user id from the request without a guard.

---

## **What is waiting on the decision**

- A role claim in the token, one shared role list, and replacing the four separate guards
- Audit logging for privileged actions, written where the action itself cannot edit it
- Mandatory 2FA for privileged roles (the TOTP and SMS machinery already exists)
- Whether `admin-service` becomes real or is removed

Full detail: `docs/md/CyberSecurity/Privileged Access & RBAC — Audit and Implementation.md`

---

## **Next step (decision made)**

Option A is chosen, so the work is: a role on the user record, a role claim in the access token, one shared guard replacing the four, then audit logging and mandatory 2FA for privileged roles.

**Before any of that**, two routes in `user-service` need a read-only check, because adding a role claim while a role can be self-assigned would create the exact escalation the work is meant to prevent:

- `POST /users` accepts a `CreateUserDto` with an optional `role`, and `UserRole` already includes `ADMIN`.
- `PATCH /users/:id` takes an id from the URL with no ownership check visible at the route.

Neither has been confirmed as reachable or unguarded — a class-level guard may cover them. Confirm first, fix whatever that turns up as its own small change, and only then add the role claim.
