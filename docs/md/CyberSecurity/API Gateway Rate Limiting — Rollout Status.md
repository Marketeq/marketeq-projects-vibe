# **API Gateway Rate Limiting — Rollout Status**

**Status:** Built and tested, running in **monitor mode** — it watches and logs, but blocks nothing. Not yet merged or deployed. Enforcement waits on the checks in §6.
**Origin:** a security review finding — the API gateway, which fronts every login, OTP, checkout and payout request, had no request-rate protection of its own.
**For engineers:** implementation details, configuration and operating commands are in `docs/md/API Gateway/API Gateway — Rate Limiting (Implementation Notes).md`. This document covers what the change does, what it prevents, and why it was built this way.

### **Overview**

Every request from the website, the mobile app and the desktop app enters the platform through one service, `api-gateway`, which passes it on to whichever of the ~35 backend services owns it. Until now, nothing counted those requests. Anyone could send as many as they liked, as fast as they liked, and the only limits anywhere were a small in-memory count on password resets inside auth-service.

This change adds a limit at that single entrance. It is a hardening change to an existing service: no new service, no new infrastructure, no new endpoints, and no change to how any existing request behaves when it is within the limit.

## **1. What the Change Does**

The gateway now keeps a short-lived tally of how many requests each caller has made, and refuses further ones once a caller passes the limit for what they are doing.

- **Who a caller is.** A signed-in user is counted by their account, taken from their verified login token. Anyone else is counted by their network address, as recorded by our own host — not by anything the caller claims about themselves.
- **What the limits are.** Ordinary browsing gets a generous allowance. Sensitive actions get a strict one, because real people barely use them: about 10 login attempts a minute, 10 code entries per 15 minutes, 5 SMS code requests per 15 minutes.
- **What being over the limit means.** The request is refused with "too many requests, try again in X seconds." Nothing is banned and no account is locked. The tally clears itself within a minute for most rules, so a real person who trips one is back a moment later.
- **What is never limited.** Health checks (a refused health check would make our host restart the service) and browser pre-flight checks. Payment webhooks from Stripe and Ramp have their own generous allowance rather than the standard one, since providers legitimately retry in bursts.

Full rule table: see the engineering notes.

## **2. What It Prevents**

| **Threat** | **How the limit stops it** |
|---|---|
| **Password guessing / credential stuffing** — leaked email-password lists replayed against our login | Roughly 14,400 attempts per day per address instead of unlimited. Too slow to be worth running. |
| **2FA code guessing** — a 6-digit code has a million values | 10 tries per 15 minutes makes guessing effectively impossible. |
| **SMS pumping (toll fraud)** — flooding the "text me a code" endpoint to generate fees | Capped at 5 per 15 minutes per address, which caps the bill. |
| **Email and SMS bombing** — repeated password resets flooding a victim's inbox and burning our sending quota | Capped at 10 per 15 minutes per address. |
| **Denial of service against the application** — one script overwhelming the backend. Our backend is a single small Render instance shared by dev, staging and live, so this takes all three down at once | No single caller can consume the whole server. |
| **Account enumeration** — hammering the username check to build a list of our users for phishing | Capped at 60 per minute, making harvesting impractical. |
| **Scraping** — bulk-copying talent profiles and search results | Capped per caller. |
| **Cost abuse** — every Algolia search and R2 upload costs money | Uploads and searches are capped per user. |
| **Rapid probing of money endpoints** — hunting for bugs in payouts, wallet or wire transfer, including bugs that only appear when requests arrive faster than the checks expect | Money-moving actions capped at 30 per minute per user. |
| **Abuse going unnoticed** — today heavy abuse just looks like traffic | Every caller that crosses a limit is logged, giving early warning instead of a weeks-late discovery, as happened with the August database incident. |

**Note on the risk model:** most of these are not about traffic volume harming the servers. They are attacks where volume *is* the attack. Ten thousand login attempts would not strain our backend at all, yet that is how accounts get taken over.

## **3. What It Does Not Cover**

- **Large network-level floods.** By the time traffic reaches this limiter it has already reached our server. Stopping that earlier needs edge protection (a web application firewall), tracked separately. This change complements that rather than replacing it.
- **A single stolen password or session.** One valid request is still one valid request.
- **Anything that bypasses the gateway.** All of this assumes traffic comes through the front door. That assumption failed in the 2026-08-04 P0 incident, when an outside connection reached the production database directly. Locking down direct database access is tracked separately.
- **auth-service's own limits.** Those are still in-memory and reset on restart, and are tracked separately. The gateway limits sit in front of them but do not replace them; auth-service also counts per email address, which catches an attacker spread across many network addresses targeting one account.

## **4. Why This Approach**

- **At the gateway, not in each service.** One service terminates all external traffic. Protecting it covers every backend service at once, rather than ~35 separate changes that would each need to be kept in step.
- **Counted in the shared Redis we already run.** Counts survive restarts and deploys, and hold across instances if the backend is ever scaled. A per-process count would reset on every deploy and could be bypassed simply by spreading requests across instances — the same weakness auth-service's in-memory limits have today. No new dependency and no new infrastructure were introduced: the gateway already used this Redis and this client.
- **Never fails closed, never waits.** If Redis is slow or unavailable, counting falls back to the service's own memory, so limits keep applying rather than switching off, and no user request waits on Redis. Any unexpected error in the limiter lets the request through: a hardening feature must not become a new way for the platform to go down.
- **Signed-in users counted by account, not address.** An office, a shared network or our own website's server-side calls can put many people behind one address. Counting by account keeps real users from exhausting each other's allowance, and the per-address allowance is set high for the same reason.
- **The caller's address is taken from our host's record, not the caller's own header.** The obvious field for this is set by the client and can be changed at will, which would let an attacker reset their tally on every request.
- **Sensitive actions separated into their own allowances.** Sending a 2FA code and entering one are counted separately, so a user who asked for a couple of resends is not locked out of typing their code. The signup username check has its own looser allowance because the form may call it as the user types.
- **Ships in monitor mode.** Explained in §5.

## **5. Why It Blocks Nothing Yet**

The limits are informed estimates. They were chosen by reading the code and reasoning about normal use, not by measuring our traffic, and three unknowns make a wrong guess costly:

1. It is not yet confirmed how our host reports a visitor's address in production. If that is misread, every visitor could be counted as one, and the whole platform would start refusing requests within seconds.
2. One backend serves dev, staging and live, so a limit that is too tight hits paying customers, not just testing.
3. Real usage patterns for the desktop app's syncing, our website's server-side calls and the signup form are unknown from the code alone.

Monitor mode removes that risk: over-limit requests are logged as "would block" and still served. Nothing is worse than it is today, and the logs turn the estimates into measured values. Code Review SOP §3.8 also requires showing that new middleware does not block legitimate requests, which these logs provide.

## **6. Path to Enforcement**

1. **Confirm the address setting.** Each process logs, once, how many forwarding entries it receives (counts only, no addresses). This must match the configured value. Cross-check against the existing `/v1/client-ip` endpoint. This comes first — every other log line depends on it.
2. **Collect at least one normal week** of "would block" logs, covering weekdays and the busiest period.
3. **Review who appears.** Only attackers → that rule is safe to enforce. Real users, the desktop app or our own site → raise that rule's limit and observe a few more days.
4. **Switch on**, ideally in stages: the login and 2FA rules first (real users rarely approach them, and they cover the highest-risk abuse), then the money and upload rules, then the general rules last.

Turning enforcement on is an environment-variable change and a restart — no code change, no redeploy. Turning it back off is the same.

## **7. Open Items**

- The production address setting is unverified (§6, step 1). Must be confirmed before enforcing.
- Enforcement is currently all-or-nothing; the staged rollout in §6 needs a small change to enable rules individually.
- No usage metrics yet. The limiter only logs requests that go over a limit, so it shows who would be blocked but not how close normal traffic comes. A per-minute peak counter would give a true baseline and would also feed the separately tracked work on monitoring and alerting.
- auth-service's in-memory limits remain open. The counting mechanism built here can be reused there.
- Incidental finding: `favorites-service` imports a rate-limiting package that is not installed anywhere in the backend, so the only pre-existing rate limit in the platform may not work. Not investigated or changed.

## **8. Verification**

Type checks clean; 18 unit tests and 4 wiring tests pass on a real application instance, covering the limits, the three modes, the exemptions, resistance to address spoofing, and correct behaviour when Redis is unavailable. The counter logic was checked against a real Redis instance. Not yet verified: behaviour on our production host and against the live website. Details in the engineering notes.

## **9. Change Log**

- **2026-09-22** — Rate limiting added to `api-gateway` in monitor mode, on branch `security/gateway-rate-limiting`. Not merged or deployed. No frontend files changed.
- **2026-09-24** — Document split: implementation detail moved to `docs/md/API Gateway/API Gateway — Rate Limiting (Implementation Notes).md`; this document kept as the security record.
- **2026-09-25** — Manual testing found a counting gap: requests with a malformed body were rejected by the gateway's body parser before the limiter saw them, so they were never counted and could be sent without limit. Fixed by moving the address-based counting earlier in the request path, ahead of body parsing. Low severity (such requests cannot guess a password), and now covered by a test.
