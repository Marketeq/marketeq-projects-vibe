# **Committed Credential Register**

**As of:** 2026-10-27
**Audience:** the CTO and whoever holds each account below. Items 1–3 need action this week.
**Status:** **discovery complete, no rotation performed.** This document opens the tracked item `AC-1.4.3` requires; it does not close it.
**Why it exists:** `AC-1.4.3` requires that a credential found already committed and merged is treated as compromised immediately, rotated per `AC-1.1` regardless of evidence of misuse, and tracked for removal from history. Found while testing `PMCM-740`. **No value appears in this document** — only locations.

---

### **The finding, in one line**

Seven credentials are committed to `dev-main` and readable by anyone with repository access, including root on the CI server.

---

## **1. Scope and method**

Scanned `origin/dev-main` — the merged state — on 2026-10-27. Fixes sitting on unmerged branches do not count as remediated, because the value is still live in the shipping branch and in history.

Searched for: connection strings with embedded credentials, AWS-style access keys, PEM private-key headers, `sshpass` invocations, and known weak literals. Excluded the vendored `scheduling-service/app/` tree and lockfiles.

**Cleared by this scan** — no finding: no real PEM private key is committed anywhere (every hit is a detection pattern or a test mock); no AWS `AKIA`/`ASIA` key is committed; the `.claude/memory/` files mention credentials but hold no values.

## **2. The register**

| # | What | Where on `dev-main` | Severity | Owner |
|---|---|---|---|---|
| 1 | VPS **root** SSH password | `docs/JENKINS_GUIDE.md:357` | **Critical** | DevOps / CTO |
| 2 | Jenkins **admin** password | `docs/JENKINS_GUIDE.md:361–362` | **Critical** | DevOps / CTO |
| 3 | Supabase `postgres` **superuser** password, hosted instance | `backend/apps/transaction-service/src/db-test.js:4` | **Critical** | Database owner |
| 4 | Cloudflare R2 access key + secret key | `backend/apps/user-service/seed-users.js:252–253` | **High** | Cloudflare account owner |
| 5 | Local Postgres password | `backend/apps/user-service/seed-users.js:3` | **Medium** | Database owner |
| 6 | Jenkins webhook trigger token | `docs/JENKINS_GUIDE.md:65` | **Medium** | DevOps |
| 7 | Shared weak defaults — JWT signing and service keys | 4+ files (`asdasdasd`, `fallback-secret`, `change-me`, `password123`, `dev-secret`) | **Medium** | Backend |

### **Why 1 and 2 are first**

They are not one credential each. Root on `72.61.77.231` and admin on Jenkins both grant access to **everything Jenkins stores**: the GitHub token, the Anthropic API key, and the Render and Vercel deploy tokens. Rotating items 3–7 while 1 and 2 stand means rotating into a container someone else can still open.

### **Why 3 is not a local placeholder**

`db-test.js` hardcodes the connection string — there is no `process.env` fallback, so the literal is the only value the file has ever used. The host is a hosted Supabase instance, not `localhost`, and the user is `postgres`, the superuser. Committed in `27394cf51`.

### **On 4 and 5**

Removed from the working copy under `PMCM-738` on 2026-10-25, **but that branch has not merged.** Both values are still live on `dev-main` and remain in history regardless. R2 backs NDA documents, job-listing briefs, message attachments and avatars across at least ten services.

### **On 7**

`asdasdasd` was the JWT signing fallback in a shared library imported by seven services: anyone with repository read access could mint a valid token for any of them wherever `JWT_SECRET` was unset. Remediated on the same unmerged branch. `password123` also appears in API examples and documentation, where it is illustrative rather than a credential — the two seed scripts are the real instances.

## **3. What AC-1.4.3 requires, and where each stands**

| Requirement | State |
|---|---|
| Treat as compromised immediately | **Done** by this document, for all seven |
| Trigger rotation per `AC-1.1`, regardless of evidence of misuse | **Not started** |
| Open a tracked item to remove the literal from history | **This document.** Needs a Jira ticket per item 1–4 |

### **What "rotation per AC-1.1" means here**

`AC-1.1` is written for the database credential, but its shape governs any rotation:

- **AC-1.1.3** — a suspected compromise rotates **immediately**, independent of the 90-day cycle. Every item here qualifies. Confirmation of misuse is explicitly not required.
- **AC-1.1.1 and 1.1.5** — where a credential lives in two places (Render's `marketeq-secrets` group and the GitHub secret), **both** must be updated before the old value is invalidated. A half-rotation is an outage, not a fix.
- **AC-1.1.4** — after rotation, the old value must be **rejected**. Deleting a line from a file is not rotation; the old credential still works.
- **AC-1.1.6** — a record is retained: timestamp, who did it, and the reason (here: suspected compromise).

### **Removal from history does not substitute for rotation**

Every value here is in the git history of a repository that has been cloned many times. Rewriting history does not reach those clones, and cannot reach anyone who already copied a value. **Rotation is the remedy. History removal is cleanup, and it comes second.**

## **4. Suggested order**

1. **Items 1 and 2** — new VPS root password, new Jenkins admin password. Then rotate every credential stored *inside* Jenkins, since admin access exposed all of them.
2. **Item 3** — rotate the Supabase `postgres` password, then delete `db-test.js` or rewrite it to read `process.env.DATABASE_URL`. Check what else uses that database first: it is the superuser.
3. **Item 4** — issue a new R2 key pair, revoke the old. Check the Cloudflare dashboard for whether the committed key ID is still active, and for any usage from unfamiliar sources.
4. **Items 5–7** — merge `PMCM-738`, which removes the literals; rotate the local database password if it is reused anywhere real.
5. **Then** open history-removal tickets, and revisit the `docs/` allowlist in `.gitleaks.toml` (see `AC-1.4.4`) — it is why items 1, 2 and 6 were never flagged.

## **5. Change log**

| Date | What |
|---|---|
| 2026-10-27 | Written. Scan of `origin/dev-main` found seven committed credentials. Discovery complete; **no rotation performed and no per-item tickets opened yet.** |
