# **CSRF Phase 4 — Same-Site Cookie Migration: Detailed Walkthrough**

**Who this is for:** a junior analyst doing this for the first time, with someone senior reachable.
**Goal:** put the website and the API on subdomains of one parent domain, so auth cookies can be `SameSite=Lax` and the **browser** blocks cross-site forged requests before our code ever runs.
**Status when written:** nothing changed. This is the plan.
**Effort:** about a day of hands-on work, spread across two to three weeks of waiting and verifying.

---

## **PART A — SCOPE**

### **A1. The idea in plain words**

Browsers decide whether to attach cookies by comparing *sites*, not exact addresses. `app.marketeq.com` and `api.marketeq.com` are the same site (same registrable domain). `marketeq-projects.vercel.app` and `marketeq-backend.onrender.com` are not.

Because ours are different sites today, the auth cookies must be `SameSite=None` — "send me from anywhere," including from an attacker's page. That is the root of our CSRF exposure. Move both onto `marketeq.com` and the cookies can be `SameSite=Lax`, after which the browser refuses to attach them to requests started by any other site.

### **A2. Target addresses**

Agree these before starting. Suggested:

| Purpose | Today | Target |
|---|---|---|
| API (all environments) | `marketeq-backend.onrender.com` | `api.marketeq.com` |
| Live site | `live-marketeq-projects.vercel.app` | `app.marketeq.com` |
| Staging site | `staging-marketeq-projects.vercel.app` | `staging.marketeq.com` |
| Dev site | `dev-marketeq-projects.vercel.app` | `dev.marketeq.com` |
| Dev/test API (temporary) | — | `api-dev.marketeq.com` |

One backend serves all three sites, so one API hostname is enough. `api-dev` exists only so you can rehearse safely; delete it at the end.

### **A3. Accounts and access you need**

You cannot start without all of these. Chase them first.

| # | Service | Access level | What you do there |
|---|---|---|---|
| 1 | DNS for `marketeq.com` (likely Cloudflare — `cdn.marketeq.com` is already served there) | Edit DNS records | Create the CNAMEs |
| 2 | Render — service `marketeq-backend` (`srv-d76r48nafjfc73e1djf0`) | Admin: settings + environment | Add custom domains, change env vars, restart |
| 3 | Vercel — `marketeq-projects-dev`, `-staging`, `-live` | Admin on all three | Add domains, change env vars, redeploy |
| 4 | Google Cloud console — the OAuth client behind `GOOGLE_CLIENT_ID` | Edit the OAuth client | Update authorised origins and redirect URIs |
| 5 | LinkedIn developer app | Edit the app | Update authorised redirect URLs |
| 6 | Stripe dashboard | Developers → Webhooks | Repoint the webhook endpoint |
| 7 | Ramp dashboard | Webhook settings | Same |
| 8 | Wise and Payoneer developer apps | Edit redirect URLs | Match the new callback addresses |
| 9 | GitHub — `Marketeq/marketeq-projects-vibe` | Push a branch, open a PR | Update config files in the repo |
| 10 | Jenkins (72.61.77.231:8080) | Edit job config | Fix the hourly health-check URL |
| 11 | Whoever owns the n8n deploy orchestrator | Ask them | Deploy topology references the old hostnames |
| 12 | @CTorres9800 | Approval | This touches login configuration, which the SOP treats as locked |

### **A4. Secrets: none are created or rotated**

Worth saying plainly, because it makes this less risky than it sounds. You are not generating keys, not rotating secrets, not touching `marketeq-secrets`. Every OAuth client ID and secret stays the same — only the redirect **addresses** registered against them change. Nothing sensitive should ever be pasted into chat, a ticket or a commit during this work.

### **A5. On your machine**

- A terminal with `curl` (PowerShell: use `curl.exe`)
- A browser with developer tools you are comfortable opening
- The repo cloned, on a branch
- Optional but useful: a second browser or a private window, for testing a logged-out user

### **A6. Good news: no code changes**

The audit found the code already supports the target through environment variables. Nothing in `backend/` or `frontend/` needs editing.

| Behaviour | Variable | Today | Target |
|---|---|---|---|
| Cookie cross-site rule | `AUTH_COOKIE_SAMESITE` | unset → `none` in production | `lax` |
| Cookie HTTPS-only | `AUTH_COOKIE_SECURE` | unset → `true` in production | unchanged |
| Cookie domain | `AUTH_COOKIE_DOMAIN` | unset → host-only | **leave unset** — see Trap 1 |
| Allowed origins | `FRONTEND_URL` | the `.vercel.app` hostnames | the `marketeq.com` hostnames |
| API address the site calls | the `NEXT_PUBLIC_*` URL variables | `.onrender.com` | `api.marketeq.com` |

Cookies are set in exactly one file — `backend/apps/auth-service/src/auth/auth.controller.ts` — and it reads all three settings from the environment. The frontend resolves its API address through `frontend/lib/runtime-urls.ts`, also from the environment.

So the whole migration is configuration, and every step is reversible by putting a value back.

### **A7. Four rules**

1. **Dev, then staging, then live.** Never live first.
2. **Both addresses work throughout.** Old hostnames keep serving until the new ones are proven.
3. **One environment at a time**, with sign-off between.
4. **Write down the undo before each step.** Each step below has one.

---

## **PART B — THE WALKTHROUGH**

### **Step 1 — Create the DNS records** *(15 minutes, plus propagation)*

In your DNS provider, add a CNAME per hostname:

| Name | Type | Value |
|---|---|---|
| `api-dev` | CNAME | `marketeq-backend.onrender.com` |
| `dev` | CNAME | the value Vercel shows for the **dev** project |

**Two details that catch people out:**

- **Render:** remove any `AAAA` record for the same name — Render is IPv4 only. If you use CAA records, they must authorise `letsencrypt.org` and `pki.goog`, or certificate issuance fails.
- **Vercel:** each project has its **own** CNAME target, shown in that project's domain settings (something like `d1d4fc829fe7bc7c.vercel-dns-017.com`). Do not copy a value from another project or from a blog post.
- **If your DNS is on Cloudflare,** set the proxy to **DNS only** (grey cloud) for now. The orange cloud adds a hop that breaks the rate limiter's visitor-address reading — see Trap 4.

**Check:**
```powershell
nslookup api-dev.marketeq.com
```
It should resolve. DNS can take minutes to an hour.

**Undo:** delete the records. Nothing else has changed.

---

### **Step 2 — Attach the domains** *(10 minutes, plus certificates)*

**Render:** service → **Settings** → **Custom Domains** → **+ Add Custom Domain** → `api-dev.marketeq.com` → Save → **Verify**. Certificates are issued automatically; HTTP redirects to HTTPS on its own.

**Vercel (dev project):** **Settings** → **Domains** → **Add Domain** → `dev.marketeq.com`. Follow the CNAME value it shows. Wait for "Valid Configuration".

**Check:**
```powershell
curl.exe -I https://api-dev.marketeq.com/health
```
Expect `HTTP/2 200`. A certificate error usually means "wait a few more minutes"; if it persists past ~30 minutes, re-check the CNAME.

Then open `https://dev.marketeq.com` in a browser. The site should load, though it is still calling the old API.

**Undo:** remove the custom domain in each dashboard.

---

### **Step 3 — Point the dev site at the new API** *(20 minutes)*

In the Vercel **dev** project → **Settings** → **Environment Variables**, change every variable holding a backend URL to `https://api.marketeq.com`. From the repo template, they are:

`NEXT_PUBLIC_BACKEND_URL`, `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_AUTH_URL`, `NEXT_PUBLIC_USER_URL`, `NEXT_PUBLIC_LISTINGS_URL`, `NEXT_PUBLIC_WS_URL`, `NEXT_PUBLIC_TTS_URL`, `NEXT_PUBLIC_EARNINGS_SERVICE_URL`, `NEXT_PUBLIC_PAYOUT_SERVICE_URL`

Use `api-dev.marketeq.com` for this rehearsal. **Read the project's actual variable list** — it may hold more than the template.

Also update, in the same place:

- `NEXT_PUBLIC_GOOGLE_OAUTH_REDIRECT` → `https://dev.marketeq.com/auth/google/callback`
- `NEXT_PUBLIC_LINKEDIN_OAUTH_REDIRECT` → `https://dev.marketeq.com/sign-in`
- `NEXT_PUBLIC_COOKIE_DOMAIN` → `marketeq.com`

Redeploy the project.

**Check:** open `dev.marketeq.com`, then devtools → **Network**. Requests should go to `api-dev.marketeq.com`, not `onrender.com`. Log in. Everything should work — cookies are still `SameSite=None` at this point, so nothing about cookie behaviour has changed. You are only proving the new addresses work.

**Undo:** set the variables back, redeploy.

---

### **Step 4 — Let the API accept the new origin** *(10 minutes)*

On Render → **Environment**, edit `FRONTEND_URL` to **add** the new hostnames while keeping the old ones:

```
https://live-marketeq-projects.vercel.app,https://staging-marketeq-projects.vercel.app,https://dev-marketeq-projects.vercel.app,https://marketeq-mvp-live.vercel.app,https://marketeq-mvp-dev.vercel.app,https://marketeq-mvp-staging.vercel.app,https://dev.marketeq.com
```

Save and restart.

**Check:** reload `dev.marketeq.com`, log in, save something. No CORS errors in the console. If you see one, the origin in the error message is missing from the list — usually a trailing slash or `http` vs `https`.

**Undo:** remove the added hostname, restart.

---

### **Step 5 — Update the identity providers** *(20 minutes)*

Still on dev, but these are shared consoles, so change carefully and only add — do not remove the existing entries yet.

**Google Cloud console** → APIs & Services → Credentials → your OAuth 2.0 client:

- **Authorised JavaScript origins:** add `https://dev.marketeq.com`
- **Authorised redirect URIs:** add `https://dev.marketeq.com/auth/google/callback`

**LinkedIn developer app** → Auth → Authorised redirect URLs: add `https://dev.marketeq.com/sign-in`.

**Check:** sign out, then sign in with Google. Then with LinkedIn. Both should complete and land you logged in.

**Undo:** remove the entries you added.

---

### **Step 6 — The actual change** *(5 minutes, then test thoroughly)*

On Render → **Environment**, add:

```
AUTH_COOKIE_SAMESITE=lax
```

Leave `AUTH_COOKIE_DOMAIN` **unset**. Leave `AUTH_COOKIE_SECURE` alone. Save and restart.

**This is the step that matters. Verify properly:**

1. Log in on `dev.marketeq.com`.
2. Devtools → **Application** → **Cookies** → select the site. Find `access_token` and confirm:
   - **SameSite: `Lax`**
   - **Secure:** ticked
   - **HttpOnly:** ticked
   - **Domain:** `api-dev.marketeq.com` (host-only, no leading dot — see Trap 1)
3. Reload the page. You should still be logged in.
4. Full pass: browse listings, open a profile, save a profile change, send a message, upload a file.
5. Sign in with Google. Sign in with LinkedIn.
6. Connect a Wise or Payoneer account.
7. Send a Stripe test-mode webhook from the Stripe dashboard and confirm it is received.
8. In a private window, confirm a logged-out visitor can still browse public pages.

**Undo:** set `AUTH_COOKIE_SAMESITE=none`, restart. Users may need to log in once more.

**If login breaks here:** the usual cause is the site and API not actually sharing a parent domain — check both hostnames for a typo. Second most common: a `NEXT_PUBLIC_*` variable still pointing at `onrender.com`, so the browser sees a genuinely cross-site call.

---

### **Step 7 — Update the repo** *(30 minutes, needs a PR)*

On a branch, update the files that describe reality:

| File | Change |
|---|---|
| `render.yaml` | `FRONTEND_URL` list; add `AUTH_COOKIE_SAMESITE: lax` |
| `backend/.env.example`, `backend/.env.local.example` | Document `AUTH_COOKIE_SAMESITE`, note that `AUTH_COOKIE_DOMAIN` stays unset |
| `frontend/.env.local.example` | New hostnames in the URL variables |
| `scripts/devops/marketeq-devops.config.json` | Contains `https://marketeq-backend.onrender.com` and all three `.vercel.app` hostnames — **the drift checker fails if this is not updated** |
| `scripts/devops/regression/smoke.deploy.mjs` | Any hardcoded hostnames |

Open the PR, get @CTorres9800's approval. The SOP blocks hardcoded URLs in login code, so keep everything in environment variables.

---

### **Step 8 — Staging** *(repeat steps 1–7)*

Same sequence, with `staging.marketeq.com` and the real `api.marketeq.com`. Then leave it alone for **at least three days** while the team uses it normally. Watch for: unexpected logouts, OAuth failures, anything odd in the gateway logs.

---

### **Step 9 — Live** *(the cutover)*

**Before the window:**

- [ ] Announce it. **Everyone will be logged out once** — cookies do not transfer between domains. Say so in advance.
- [ ] Pick your quietest hour.
- [ ] Update the remaining shared services, since these affect live directly:
  - Stripe webhook → `https://api.marketeq.com/v1/webhooks/stripe`
  - Ramp webhook → the matching new address
  - `WISE_REDIRECT_URI`, `PAYONEER_REDIRECT_URI`, `PAYPAL_REDIRECT_URI` on Render, plus the matching entries in each provider's console
  - Desktop app: `DTT_API_BASE_URL` / `TTS_API_URL`
  - Jenkins hourly health check → `https://api.marketeq.com/health`
  - n8n deploy orchestrator hostnames

**During:** steps 1–6 for `app.marketeq.com`, in order, verifying each.

**After:**

- [ ] Run the full verification list from step 6 against live
- [ ] Check the Stripe dashboard's delivery log for a successful delivery to the new address
- [ ] Watch the gateway logs for an hour
- [ ] Keep the old hostnames working for **at least a week** as a fallback

**A week later, if all is quiet:** remove the old hostnames from `FRONTEND_URL`, remove the old redirect entries from Google and LinkedIn, delete `api-dev.marketeq.com`, and set `CORS_ALLOW_VERCEL_PREVIEWS=false` if preview deployments are no longer needed.

---

## **PART C — TRAPS, RECOVERY, SIGN-OFF**

### **C1. Four traps**

**Trap 1 — Do not set `AUTH_COOKIE_DOMAIN=.marketeq.com`.** It looks like the natural move. It would send auth cookies to *every* subdomain, including `cdn.marketeq.com`, which serves files from Cloudflare R2 — auth cookies attached to every image request, to a host with no business seeing them. Leave it unset so the cookie stays host-only on the API. `SameSite=Lax` still works, because it compares the parent domain, not the exact host.

**Trap 2 — The retired-host rewrite map.** `frontend/lib/runtime-urls.ts` silently rewrites two old `.onrender.com` hostnames to the current one. It will not rewrite anything to the new domain. Miss a variable and the site quietly keeps calling the old API instead of failing loudly. Check the Network tab; do not assume.

**Trap 3 — The DevOps drift checker.** `marketeq-devops.config.json` pins the current hostnames and `check-devops-drift.mjs` compares live configuration against it. Change the environment without updating that file and deploys start failing, at which point people assume the migration broke the build.

**Trap 4 — A Cloudflare proxy adds a hop.** If you turn the orange cloud on for the API hostname, the gateway's rate limiter reads the wrong visitor address and may count every user as one person. Keep DNS-only, or change `RATE_LIMIT_TRUSTED_PROXY_HOPS` and confirm against the gateway's startup line `x-forwarded-for carries N entries`.

### **C2. Emergency card**

| Symptom | Action |
|---|---|
| Nobody can log in after step 6 | `AUTH_COOKIE_SAMESITE=none` on Render, restart |
| CORS errors in the console | Add the exact origin from the error to `FRONTEND_URL`, restart |
| Site loads, every API call fails | A `NEXT_PUBLIC_*` variable is wrong — check the Network tab for the address being called |
| Google or LinkedIn sign-in fails | That provider's console still lacks the new redirect URL |
| Payments stop reconciling | A webhook URL was missed — check Stripe's delivery log |
| Total loss of nerve | Point the Vercel variables back at the old API and redeploy; the old hostnames still work |

### **C3. Sign-off**

- [ ] All three environments on the new hostnames, certificates valid
- [ ] `AUTH_COOKIE_SAMESITE=lax` on Render; `AUTH_COOKIE_DOMAIN` unset
- [ ] Cookies show `SameSite=Lax`, `Secure`, `HttpOnly`, host-only domain, verified in devtools on live
- [ ] Login, Google, LinkedIn, Wise/Payoneer connect, uploads, messaging, checkout and payouts verified after cutover
- [ ] A Stripe test webhook delivered successfully to the new address
- [ ] Desktop app verified
- [ ] Jenkins health check and smoke tests green
- [ ] Repo updated: `render.yaml`, both backend templates, the frontend template, the DevOps config, smoke tests
- [ ] Old hostnames kept a week, then removed from `FRONTEND_URL` and the provider consoles
- [ ] Emergency card shared with whoever is on call

### **C4. When this is done**

Most cross-site forgery is stopped by the browser, before our code runs. The origin check and the rate limiter stay as they are — this is an added layer, not a replacement. The CSRF token work (Phase 3) becomes less urgent but still worth doing: it is the only defence that holds if one of our own trusted origins is ever compromised.

### **C5. Change log**

- **2026-09-30** — Written from an audit of the repo; DNS and dashboard steps checked against current Render and Vercel documentation. No infrastructure, DNS, provider or code changes made.
