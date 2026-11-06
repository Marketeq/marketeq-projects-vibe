# **Cybersecurity Test Cases — Dry-Run Record**

**As of:** 2026-11-04
**Covers:** all 26 parent test cases in `QA_Generated_Test_Cases/Cybersecurity — Parent Test Cases.docx`, read against the repository as it stands today.
**What this is:** a desk check of all 26, plus **five cases actually executed** — 12, 13, 14, 23 and 25. For the executed five, the results below are real output, not predictions. For the rest, every verdict comes from reading the code, the workflows and the SOPs, and where a verdict says a case will fail the file and line that makes it fail is named, so the finding stands without anyone standing up an environment.

**Not executed by choice:** case 17 pushes to the protected `staging` branch and triggers a deploy. Its unproven claim was verified by reading the script instead.
**Branch read:** `security/gateway-rate-limiting` (176 commits behind `dev-main`), plus `dev-main` files that branch does not touch.

---

### **The short version**

**Five cases have now been run: 12, 13, 14, 23 and 25. All five pass.** Running them turned up four things reading alone would not have:

1. **The migration check misses 27 of the repository's 170 entities** — 22 of them in `user-service`. One-line fix. (Case 13.)
2. **Rate limiting is completely bypassable if the gateway is reachable without passing through exactly one trusted proxy** — 0 of 12 login attempts blocked, no error, no log line. The code is right; the deployment assumption is what has to hold. (Case 25.)
3. **A typo in `RATE_LIMIT_MODE` fails open** — `enfroce` silently runs in monitor mode. Fine during rollout, not fine after. (Case 25.)
4. **The Secret Scan is the only PR gate that cannot say why it failed** — the dispatcher calls it without `HEAD_SHA`, so the job's own status descriptions never post and every failure reads as a bare `Failed`, with the Details link pointing at the wrong build. One-line fix. (Case 14.)

Case 17 was not run on purpose: it pushes to `staging`. Reading it showed its expected result is two-thirds true — the promotion record has *when* and *commit* but never records *who*, and if `gh issue create` fails the push stands with no record at all.

Two more cases are half-runnable (4, 16). The remaining eighteen are blocked, for four different reasons that need four different responses:

| Why blocked | Cases | Who unblocks it |
|---|---|---|
| The tool under test does not exist | 1, 4 (part), 6 (part), 11, 16 (part), 18, 20, 21, 22 | Whoever builds `scripts/security/` |
| Needs the CTO or privileged access | 6, 7, 15, 16, 19, 24 | Scheduling, not engineering |
| Needs a database fixture nobody has built | 8, 9, 10 | A QA setup script against `supabase-dev` |
| Needs our own branch pushed | 26 | Us |

**Four cases will fail as written, and I can say so now:**

- **Case 2** — a checked-in file supplies a secret value. `backend/libs/auth/src/jwt.strategy.ts:25`.
- **Case 3** — three financial encryption keys silently self-generate when unset, not one.
- **Case 5** — the test unsets a variable `auth-service` does not read. The step is wrong, not the code.
- **Case 15** — the SOP it validates has no credential-rotation step.

**One structural problem affects every CI case — and it is now a settled decision, not an open question.** `post-merge-audit.yml` says it plainly in its own header: the free GitHub org plan cannot block merges on failing checks. Required status checks on a private repository need a paid GitHub tier, and **Marketeq has decided not to upgrade** (confirmed 2026-10-28). So wherever a test case expects "PR is shown as blocked" (cases 4, 12, 13, 14), the correct expected result is "the check reports red, and the post-merge audit opens an issue if it was merged anyway." The check cannot physically prevent the merge, and no change to this repository can make it. That is a permanent correction to the test cases — not a defect, and not an outstanding action.

---

## **1. The cases that were run**

Cases 12 and 13 were also executed; they live in section 3 with the other CI cases.

### **Case 23 — Remove decommissioned infrastructure entirely (US-9.1)**

**Verdict: RAN IT. PASSES.**

This is the only case in the set that is a single grep with no preconditions, so I ran it:

```
grep -ri heroku render.yaml .env*.example .github/ backend/Dockerfile* Procfile*
```

No matches in any active deployment config. The `.env*.example` files live under `backend/`, not the repo root, so the step's glob needs widening to `backend/.env*.example` — otherwise it silently checks nothing. With that correction the case passes.

**Action:** fix the path glob in the test step; mark the case Passed.

### **Case 25 — API Gateway rate limiting (RL-1)**

**Verdict: EXECUTED. PASSES, in all four modes.**

Run against the real `RateLimitService` and `createPreAuthRateLimit` over real HTTP on port 4000, with a stub downstream returning 401 for wrong credentials (the thing under test is the gateway's limiter, not auth-service's password check).

**Enforce mode — exactly as specified:**

```
req  1..10 -> 401  Retry-After=-
req 11     -> 429  Retry-After=60  {"statusCode":429,"code":"RATE_LIMITED",
                                    "message":"Too many requests. Please wait a moment and try again.",
                                    "details":{"retryAfterSeconds":60}}
req 12     -> 429  Retry-After=60  (same body)
health 1..3 -> 200
WARN [RateLimit] BLOCK rule=auth-login limit=10/60s key=ip:127.0.0.1 ip=127.0.0.1 user=- method=POST path=/auth/login
```

**Monitor mode — all 12 returned 401 and the log carries the predicted line:**

```
WARN [RateLimit] WOULD_BLOCK rule=auth-login limit=10/60s key=ip:127.0.0.1 ...
```

Note the `BLOCK`/`WOULD_BLOCK` warning fires **once per window**, not once per rejected request (`firstOverLimit: hit.count === limit + 1`). Request 12 was rejected silently. That is deliberate and correct — a flood should not generate a log line per request — but anyone reading logs to size the blast radius will undercount, so the sub-case should assert "exactly one WOULD_BLOCK line for 12 requests," not "a line for each rejection."

**Two extra modes, not in the case but worth having:**

- `RATE_LIMIT_MODE=off` — all 12 returned 401, no counting. Correct.
- `RATE_LIMIT_MODE=enfroce` (a typo) — logs `RATE_LIMIT_MODE="enfroce" is not one of off|monitor|enforce; using "monitor"` and runs in monitor. **This fails open.** During the rollout that is the right default. Once enforce is live in production it is not: a typo in a Render env var silently removes brute-force protection from the login endpoint while the variable looks set. Worth a follow-up decision — either fail startup on an unrecognised value, or add the mode to a startup assertion.

Everything in the expected result also matched the source on inspection:

- The 429 body is exactly `{ statusCode: 429, code: 'RATE_LIMITED', message: 'Too many requests. Please wait a moment and try again.', details: { retryAfterSeconds } }`.
- `Retry-After` is set as a response header.
- The `auth-login` tier is `{ stage: 'pre-auth', keyBy: 'ip', limit: 10, windowSec: 60 }` — so 10 pass and 11–12 are rejected, as written.
- `/health` is in `EXEMPT_EXACT`, so it stays 200 throughout.
- Monitor mode logs `WOULD_BLOCK rule=auth-login`.
- The gateway listens on `process.env.PORT || 4000`, matching `http://localhost:4000`.

**The sub-case the document asked for, now run: the `X-Forwarded-For` hop count.**

`logForwardedShapeOnce()` exists so `RATE_LIMIT_TRUSTED_PROXY_HOPS` can be checked against real traffic. I tested why it matters, enforce mode throughout, 12 login attempts per scenario:

| Scenario | `X-Forwarded-For` sent | hops | 429s |
|---|---|---|---|
| **A** — gateway reachable directly | a *different* single address each request (`198.51.100.1…12`) | 1 | **0 of 12 — limit never triggered** |
| **B** — behind one trusted proxy | `9.9.9.9, 203.0.113.5` (spoof + real) | 1 | 2 of 12, blocked at request 11 |
| **C** — hop count set too high | `203.0.113.9` (one entry) | 2 | 2 of 12, blocked at request 11 |

`client-ip.ts` is written correctly — it takes the entry `trustedHops` places **from the right**, never the leftmost, precisely so a client cannot mint a fresh bucket per request. Scenario B proves that works, and scenario C proves the fallback is safe: when the chain is shorter than expected it drops to the socket address rather than trusting the header.

**Scenario A is the one to care about.** When the chain length equals `trustedHops`, the client controls the entire header, and the limiter keys on a value the attacker picks. Brute-force protection on `/auth/login` is then completely void, with no error and no log line. This is not a bug in the code — it is the documented assumption failing. It holds the moment the gateway is reachable by any path that does not pass through exactly one trusted proxy: a Render internal URL, a second ingress, a direct port, or a local run.

**Action before enforce goes live:** read the `x-forwarded-for carries N entries` line off staging, confirm `RATE_LIMIT_TRUSTED_PROXY_HOPS` equals N, and confirm there is no route to the gateway that bypasses the edge. Add scenario A to the test case as a negative test — it should be impossible to reach the gateway in a way that makes it pass.

**One note on method.** The repo's own `rate-limit.spec.ts` could not be run from the linked Linux VM — jest's haste-map crawl over the mounted Windows filesystem exceeded 160 seconds with no output. That is a filesystem-performance artefact, not a code problem; run `npm test` in `backend` on Windows directly. The HTTP harness above covers the same behaviour more directly anyway, since it exercises the real middleware over real sockets.

### **Case 17 — Enforce a fixed promotion path (US-6.2)**

**Verdict: RUNNABLE but NOT EXECUTED — it mutates a protected branch. Its logging claim is only partly true, and that part I did verify by reading the script.**

Both halves exist: `scripts/devops/qa-promote-dev-to-staging.sh` (246 lines) and `.github/workflows/sync-dev-main-to-staging.yml`. The case needs a QA account with execute access, which is a permissions question rather than a build question.

**Why it was not run as part of this pass.** Line 197 is `git push origin staging`, which rewrites a protected branch and triggers a Vercel and Render deploy. That is not reversible from a test harness and it is not a step to take on someone's behalf without being asked for that specific push. The script is also a good citizen about it — it refuses to run on a dirty tree (line 52), requires `gh` auth (line 68), and gates the push behind a gitleaks scan scoped to just the promoted commits (lines 182–185), with a well-argued comment explaining why the scan is scoped rather than run over all ~1000 commits.

**On "promotion logged with who/when/commit" — two of three.**

| Claim | Where it actually lives | Verdict |
|---|---|---|
| when | `ROUND_DATE=$(date +%Y-%m-%d)` in the issue title and body; also in the merge commit message | **Date only, no time.** Two promotions on one day are indistinguishable in the record. |
| commit | `${DEV_SHA:0:7}` plus `git log --oneline origin/staging..HEAD` in the issue body | Present. |
| who | **Nowhere in the record.** | The issue body never names the operator. It is recoverable only from GitHub's own author metadata on the issue and from the git committer on the merge commit — not from the promotion record itself. |

There is also no durable promotion log at all. The record *is* the GitHub issue, and `gh issue create` is wrapped in `2>/dev/null || echo ""` (line 204). If it fails, the script prints `warn "Could not open tracking issue — do it manually"` and exits successfully — **the push has already happened and no record exists.** A promotion that silently loses its own audit trail is the failure mode this case is supposed to catch.

**Action:** add `--body` lines naming the operator (`$(gh api user --jq .login)`) and a full timestamp, and make a failed `gh issue create` a hard error rather than a warning, since by that point the push is irreversible and the record is the only artefact left. Then the case can pass as written.

---

## **2. The four cases that will fail — with the reason**

### **Case 2 — Store every secret outside the repository (US-1.2)**

**Verdict: FAILS at step 2.**

Step 1 passes: the listed secrets are read through `process.env` / `ConfigService`. Step 2 asks whether any checked-in file supplies one of those values. One does:

```ts
// backend/libs/auth/src/jwt.strategy.ts:25
const secret = configService.get<string>('JWT_SECRET') || 'asdasdasd';
```

When `AUTH_JWT_PUBLIC_KEY` is absent, this strategy drops to HS256 and signs with a literal string committed to the repository. Anyone with read access to the repo can mint a valid token for any service using this strategy.

Seven services import it: `checkout-service`, `content-moderation-service`, `invitations-service`, `offer-service`, `payout-service`, `time-tracking-service`, `wallet-service`.

`backend/apps/user-service/src/guards/jwt-auth.guard.ts` handles the same situation correctly — no key and no secret throws `'JWT verifier is not configured'`. That is the shape the shared library should take.

**Action:** remove the `|| 'asdasdasd'` fallback and throw instead. Add it to `Authorisation Remediation — Open Code Changes`.


**Two gaps found later, worth recording here.** No real `.env` is committed — the only two tracked matches are a symlink (`packages/prisma/.env`, mode 120000) and a one-line comment file (`gh.env`), both inside the vendored cal.diy tree. But:

- **A file named `prod.env` or `secrets.env` would be committed without complaint.** `.gitignore` has `.env` and `.env.*`, neither of which matches a prefixed name — confirmed with `git check-ignore`. Gitleaks does not cover it either: the `dotenv-file` rule's path is `(^|/)\.env(\..+)?$`, which matches `.env` and `.env.local` but not `prod.env`. One line in each file closes it.
- **Both tracked matches sit in the one directory the secret scan excludes wholesale** (`^backend/apps/scheduling-service/app/`). Reasonable for vendored code, but it means a real `.env` added anywhere under that tree would never be flagged — the same shape as the blanket `docs/` exclusion that hid the VPS root and Jenkins admin passwords until #825 removed it.

### **Case 3 — Centralize custody of financial encryption keys (US-1.3)**

**Verdict: FAILS as the case predicts, and the scope is three times larger than stated.**

The case expects a startup failure naming the missing key and says a random key is generated instead. Confirmed — in three places, not one:

| Variable | File | Behaviour when unset |
|---|---|---|
| `BANK_ENCRYPTION_KEY` | `methods/bank-encryption.service.ts:12–17` | warns, then `randomBytes(32)` — comment reads "fallback for dev" |
| `CRYPTO_ADDRESS_ENCRYPTION_KEY` | `crypto/crypto-connection.service.ts:57–58` | `randomBytes(32)`, no warning at all |
| `OAUTH_TOKEN_ENCRYPTION_KEY` | `oauth/oauth.service.ts:46–47` | `randomBytes(32)`, no warning at all |

Each also accepts the key only if it is exactly 64 hex characters and silently substitutes a random key otherwise — so a typo in the env var is indistinguishable from the variable being absent. Data encrypted under a generated key is unrecoverable after restart, because the key never leaves memory.

**Second problem with the case:** the expected result requires error code `CYBERSEC.MISSING.004`. That code does not appear anywhere in the repository. The whole `CYBERSEC.*` error-code scheme is aspirational — it exists in doc 06 and nowhere in the code. Either the codes get implemented or the expected results stop citing them.

**Action:** fail startup on all three, and treat an invalid-length key as a failure, not a cue to improvise. Add to the remediation list.

### **Case 5 — Deliver auth-service's signing keys through the managed path (US-1.5)**

**Verdict: the test step is wrong. The code is right.**

Step 3 restarts `auth-service` with `JWT_SECRET` unset and expects a fail-fast. It will not fail, because `auth-service` never reads `JWT_SECRET`. It is RS256-only:

- `auth/auth.module.ts:33–41` — throws `'AUTH_JWT_PRIVATE_KEY and AUTH_JWT_PUBLIC_KEY are required for RS256'`
- `auth/strategies/jwt.strategy.ts:17` — throws `'AUTH_JWT_PUBLIC_KEY is required for RS256 validation'`

So the behaviour the case is looking for is already implemented, under different variable names.

**Action:** rewrite step 3 to unset `AUTH_JWT_PRIVATE_KEY`, then the case passes. Note that `JWT_SECRET` is still consulted by `api-gateway` and the shared lib, so the variable has not been retired — it just is not `auth-service`'s concern.

### **Case 15 — Follow a fixed response the moment a leak is detected (US-5.2)**

**Verdict: FAILS on the last criterion, provable without the tabletop.**

`docs/DEVOPS_SOP.md` §9 exists and its gitleaks row covers step 1 almost verbatim: do not push, reset staging, open an urgent issue, CTO fixes `dev-main` first. Good.

The expected result also requires "real-credential path includes a rotation step." §9 has no rotation step. Nothing in the SOP tells anyone to rotate the exposed credential after the commit is cleaned up — which is the one action that actually ends the exposure, since the secret is in the push history and in anyone's fork regardless of what the branch looks like afterwards.

**Action:** add a rotation step to DEVOPS_SOP §9 before running this case. The rest of the case still needs the CTO and a tabletop slot.

---

## **3. The CI cases: two checks exist, two do not**

### **Case 12 — Block destructive auto-schema-sync (US-4.1)**

**Verdict: EXECUTED. The check works. PASSES.**

Both of this case's steps need a throwaway branch and a PR, which we are not opening while the branch is unpushed. So instead of waiting, I extracted Section 4b verbatim from `sop-check.yml:208–211` and ran it against real git diffs in a scratch repository with the same directory shape. The logic under test is unmodified, including the pathspec and both greps.

| Scenario | Expected | Result |
|---|---|---|
| **A** add `synchronize: true` | violation | ✅ violation |
| **B** value is `synchronize: false` | pass | ✅ pass |
| **C** `synchronize: process.env.NODE_ENV !== 'production'` | violation | ✅ violation |
| **D** `synchronize:true` with no space | violation | ✅ violation |
| **E** file at `backend/apps/x/src/a/b/c/orm.ts` | violation | ✅ violation — the `**` pathspec does reach nested paths |
| **F** `synchronize: true` already on the base branch, PR edits an unrelated file | *pass* (blind spot) | ✅ pass — not flagged |

Scenarios A and B are the case as written: both pass. C and D matter more in practice — the environment-conditional form in C is how this usually gets reintroduced, and the check catches it.

**Scenario E settles a real risk.** `git diff -- 'backend/apps/**/*.ts'` could easily have matched nothing, which would have left the check permanently green and nobody the wiser. It matches.

**Scenario F is the blind spot, now confirmed empirically.** The check only sees added lines, so a `synchronize: true` already on `dev-main` is invisible forever. I swept the live repository for it: **clean.** The only matches for `synchronize:` that are not `false` are three explanatory comments in migration files (`invitations-service/1711000000000`, `notification-service/1797800000000`) describing the old behaviour. Nothing live. So the blind spot is real but currently unexploited — worth re-sweeping after the `dev-main` merge rather than trusting CI alone.

**One correction to the expected result:** "PR is shown as blocked" is not achievable on the current GitHub plan. Reword to "the check reports a violation and `sop-check` exits 1."

### **Case 13 — Require a migration for every entity change (US-4.2)**

**Verdict: EXECUTED. The check works as designed — but its file patterns miss 16% of the repository's entities.**

Same method: Section 4 extracted verbatim from `sop-check.yml:193–205` and run against real diffs.

| Scenario | Expected | Result |
|---|---|---|
| **A** entity changed, no migration | violation | ✅ violation |
| **B** entity changed + migration added | pass | ✅ pass |
| **C** entity at `src/entities/*.entity.ts` | violation | ✅ violation |
| **D** entity in user-service, migration added in payout-service | *pass* (blind spot) | ✅ pass — not flagged |
| **E** `*.entity.ts` at `src/models/`, outside any `entities/` dir | *not detected* | ✅ not flagged |
| **F** brand-new entity file added, no migration | violation | ✅ violation |

A, B and F are the case as written: all pass.

**Scenario E is the finding, and it is not theoretical.** The two `case` patterns both require the file to sit in a directory literally named `entities/`. The repository's dominant convention is not that — it is `src/<feature>/<name>.entity.ts`:

| | Count |
|---|---|
| Total `*.entity.ts` under `backend/apps` | 170 |
| Inside an `entities/` directory — **detected** | 143 |
| Outside one — **invisible to the check** | **27** |

Those 27 are concentrated where the churn is: **22 in `user-service`**, 3 in `time-tracking-service`, 1 each in `portfolio-service` and `listings-service`. Examples: `user-service/src/message/message.entity.ts`, `user-service/src/client/client.entity.ts`, `time-tracking-service/src/sessions/session.entity.ts`.

A schema change to any of those 27 merges with no migration and no complaint — in the service with the most entity churn in the repo. Given that `synchronize: false` is enforced everywhere, a missing migration does not auto-apply; it just means the column never exists in production and the service breaks on first query.

**Fix is one line** — add `backend/apps/*/src/**/*.entity.ts` to the `ENTITY_CHANGED` case pattern. That makes the existing 143 a superset and closes the 27.

**Scenario D is the weaker blind spot:** the check asks only whether *some* migration file was added, not whether it corresponds to the changed entity. Two unrelated changes in one PR satisfy it. Acceptable for now — worth stating in the expected result so nobody reads more assurance into a green check than it carries.

### **Case 4 — Prevent credentials from ever being committed (US-1.4)**

**Half blocked.** `gitleaks.yml` exists, so the gitleaks half is runnable on a throwaway PR. The other half is not:

- `'Security - Connection String Scan'` workflow — does not exist
- `scripts/security/fixtures/fake-leaked-secret.txt` — does not exist

Run the gitleaks half now with a fake `AKIA`-style key; leave the connection-string half as an acceptance test for unbuilt work.

### **Case 14 — Catch committed secrets before merge (US-5.1)**

**Verdict: EXECUTED, all three steps. Detection passes. The gate cannot block a merge, and that is a plan limitation, not a defect.**

Run on PR #817 (`qa/secret-scan-pmcm-750`) after `9509b6ab` (#825) repaired the Jenkins Secret Scan. Step 3's evidence is PR #827 rather than #817, for the reason given below.

| Step | Fixture | Evidence | Result |
|---|---|---|---|
| 1 — fake AWS key, `AKIA` + 16 | `qa-secret-scan-fixture.ts` | #817 `b7bf385f` | `Jenkins / Secret Scan — Secrets detected` ✅ |
| 2 — connection-string fixture | same file, `postgresql://…@…` | #817 `fb99af11` | `Jenkins / Secret Scan — Failed` ✅ |
| 3 — secrets removed, expect clean | real credential removal | #827 `4fa66d3` | `Jenkins / Secret Scan — Passed` ✅ |

Each fixture was verified locally first with gitleaks 8.18.4 against `dev-main`'s `.gitleaks.toml`: step 1 `aws-access-token` at `qa-secret-scan-fixture.ts:1`, step 2 `connection-string-password` at line 2, both redacted, exit 1; the clean state exit 0.

**Step 2 is no longer blocked, and the missing workflow is never coming.** The case expects a separate `'Security - Connection String Scan'`. No such workflow exists and none is planned. #825 instead added a `connection-string-password` rule to gitleaks, which is the path the case itself allowed for — *"(and gitleaks once ruleset extended)"*. Treat that parenthetical as the spec and drop the separate-workflow expectation from the step.

**Step 3's expected result is wrong as written, and the gate is right.** The case says *"Remove both; push. Expected: all secret checks pass with no findings."* That assumes the scan reads the final state of the files. It reads the PR's **commits** — `${SCAN_REF} --not origin/dev-main origin/staging origin/live-mvp` (`.jenkins/gitleaks.groovy:87`). On #817 the step 1 and step 2 commits added the fake secrets, so they stay in that branch's history and the scan keeps reporting them however the last commit ends up. Pushing a removal commit to #817 returned red (`9eb36e44`), which is correct: merging #817 would carry both values into `dev-main` regardless of the final tree. A scanner that went green there would be the defect.

Step 3 therefore cannot be demonstrated on a branch that previously held the secret. #827 is the faithful run — it removed real committed credentials from nine seed scripts, `db-test.js` and `JENKINS_GUIDE.md`, on clean history, and the scan passed.

**Correction to the test step:** step 3 should read *"open a PR from a branch whose history never contained the fixture; all secret checks pass with no findings."*

**Finding — the Secret Scan is the only PR gate that cannot say why it failed.** The dispatcher calls the gitleaks job without `HEAD_SHA` (`.jenkins/github-webhook-dispatcher.groovy:235-241`), while branch-freshness, login-gate and code-review are all handed `pr_head_sha`. The gitleaks job gates its own status posting on `when { expression { return params.HEAD_SHA?.trim() } }`, so on the PR path that block never runs and its `"Secrets detected"` / `"No secrets found"` descriptions are dead code. The dispatcher posts instead, flattening every failure to one word:

```groovy
def desc = (state == 'success') ? 'Passed' : 'Failed'
```

Two consequences. The status says `Failed` with no reason, and because it is posted from the dispatcher the "Details" link lands on the dispatcher build rather than the scan build. The dispatcher's `catch (e)` also cannot distinguish a finding from a pipeline error — the same conflation that caused the original PMCM-750 defect, pointing the other way. **Fix:** pass `string(name: 'HEAD_SHA', value: pr_head_sha)` in that build call, as every neighbouring gate already does.

**Blocking: not achievable on this plan.** `.github/workflows/post-merge-audit.yml` states it in its own header — *"The free GitHub org plan cannot block merges on failing checks."* Confirmed on #817: with `Jenkins / Secret Scan` red, GitHub still showed "Merging can be performed automatically" and an enabled **Squash and merge**. No required status check exists to stop it. The compensating control is real, though: `Jenkins / Secret Scan` is in the post-merge audit's watched contexts (`.jenkins/post-merge-audit.groovy:201`), so merging a PR with a secret opens an issue and tags the CTO.

So the achievable behaviour is **detect and report, not prevent** — permanently. Marketeq has decided not to move to a paid GitHub tier (confirmed 2026-10-28), so no required status check will ever exist on this repository. The case title "catch committed secrets *before merge*" should be read as "detect on the PR, and audit after the merge". **Nothing is outstanding on blocking.**

That raises the `HEAD_SHA` defect above from cosmetic to the main remaining gap in this case: with blocking off the table for good, a clear failure message is the only thing the gate can still do for the developer who committed the secret. It is the one CTO item left here.

**Cleanup owed:** close #817 without merging and delete `qa/secret-scan-pmcm-750`.

### **Case 16 — Require review on every infrastructure-sensitive change (US-6.1)**

**Ownership is correct. The audit is missing.**

`.github/CODEOWNERS` assigns exactly what the case expects:

```
/.github/      @CTorres9800 @Marketeq/code-review
/render.yaml   @CTorres9800 @Marketeq/code-review
```

…plus all six `.env.*.example` files. So steps 1 and 2 will pass.

Step 3 expects `'Security - Merge Review Audit'` to log "Required review was recorded." No such workflow exists, and `post-merge-audit.yml` does not substitute for it — it audits whether SOP *checks* failed on the merged commits, not whether a non-author *approved*. There is no call to the reviews API anywhere in it.

Note also that CODEOWNERS cannot cover `scripts/security/` because the directory does not exist. Add that line at the same time the directory is created.

### **Case 19 — Get alerted on an unauthorized branch push (US-7.2)**

**Mostly already built.** `post-merge-audit.yml` fires on pushes to `dev-main`, `staging` and `live`, resolves the code-review team, and opens an urgent issue tagging the CTO on both force-push (`urgent,force-push-violation`) and direct push (`urgent,sop-violation`). That is what the case asks for.

Still needs the CTO to authorise a deliberate push to a protected test branch, and the "Jenkins backup also detects" half needs whoever owns `jenkins/` to confirm. The ~60-second expectation is plausible for a workflow that only calls the issues API.

---

## **4. The cases waiting on `scripts/security/`**

`scripts/security/` does not exist. Neither do the three workflows these cases name:

- `security-rotation-reminder.yml`
- `security-connection-string-scan.yml`
- `security-merge-review-audit.yml`

Nor do any of the tables (`security_credential_rotations`, `security_allowlist_changes`, `security_incidents`), CLI entry points (`npm run rotate`, `npm run allowlist`, `npm run incident:open`, `npm run incident:close`, `npm run check:grant-drift`) or scripts (`audit/inspect-connections.ts`, `record-incident.ts`, `close-incident.ts`, `anomaly-monitoring-check.ts`) they call.

| Case | What it needs |
|---|---|
| 1 — Rotate the database credential | `npm run rotate`, `security_credential_rotations`, rotation-reminder workflow |
| 11 — Strip default roles of standing access | ~~`npm run check:grant-drift`~~ — **written**, see `scripts/security/check-grant-drift.js`. Needs database access only. |
| 18 — Repeatable incident-response sequence | `inspect-connections.ts`, `incident:open`, `incident:close`, fixture JSON |
| 20 — Structured record of every incident | `record-incident.ts`, `close-incident.ts`, `security_incidents` |
| 21 — Alert on abnormal database activity | `anomaly-monitoring-check.ts` (the case already marks this gap CS-8.1) |
| 22 — Inspect live database connections | `audit/inspect-connections.ts` |

**These are not failing tests. They are acceptance criteria for work that has not started.** Written before the thing exists, they are the most useful artefact in the folder — they say precisely what "done" looks like, down to the log strings. Status should be **Blocked — Not Implemented**, never Failed, so the distinction between "built wrong" and "not built" survives in the Jira board.

---

## **5. The cases that need someone else in the room**

| Case | Blocker |
|---|---|
| 6 — Restrict database connections to known sources | CTO on the Hostinger VPS; plus `npm run allowlist` does not exist. The case already warns the deny-all baseline is not in place, so step 2 is an expected FAIL. |
| 7 — Network rules survive a reboot | CTO, a maintenance window, and `iptables-persistent` installed |
| 24 — Remove stale access when no longer needed | CTO exports of GitHub org + Render team members, and an HR roster. The case already predicts FAIL: no offboarding checklist exists. |

Cases 8, 9 and 10 need a different kind of help: superuser access to `supabase-dev`, and a fixture that did not exist — two schemas (`svc_a`, `svc_b`), two roles (`svc_a_rw`, `svc_b_rw`), a table in each, and a published view `svc_b.orders_v1`. Case 10 additionally lists "documented request/approval location agreed" as a precondition, and no one has agreed one.

**The fixture now exists**: `fixtures/svc-read-access-fixture.sql`, with the grant and the revoke as separate files, because case 8 needs cross-schema access denied and case 10 needs the grant absent until approved — a fixture that applied the grant would make both untestable. Idempotent, and verified on PostgreSQL 16 before it was committed. All three cases now need only database access.

### **Case 10 — Review and document every new cross-schema read (US-3.3)**

**Verdict: AC-3.3.1 and AC-3.3.2 FAIL. AC-3.3.3 PASSES, conditionally.**

The mechanism half was executed against a throwaway PostgreSQL 16 instance using the fixture above. The governance half was read against the repository.

| Criterion | Verdict |
|---|---|
| AC-3.3.1 — a read-access request cannot be granted until the owner approves | **FAIL** |
| AC-3.3.2 — each grant records view, role, approver and date somewhere findable | **FAIL** |
| AC-3.3.3 — after revocation, queries fail with a permissions error, not empty rows | **PASS**, if revocation uses `REVOKE` |

**AC-3.3.1 and AC-3.3.2: the policy exists, the mechanism does not.** `docs/md/Database Architecture/Microservice Data Ownership & Database Access Policy.md` states the requirement plainly — read access must be "Explicit, Approved, Auditable", cross-service reads must go through versioned views, each service must use a dedicated role, "all new cross-schema access must be reviewed" and "all schema contracts must be documented". It then stops. It names no approver, no request process, no record format and no location for the register. AC-3.3.2 asks for view definition, granted role, approving party and date, findable by engineers; not one of those fields exists anywhere in the repository.

The precondition is unmet underneath that. The only database usernames in the service env templates are `postgres` and a generic `user` — no `_rw` or `_ro` roles exist, though the policy mandates them. There are no per-service roles, so there are no cross-schema grants to govern yet.

These are not failing tests so much as acceptance criteria for governance that has been written down as principle and never implemented. Status should distinguish that from "built wrong".

**AC-3.3.3 passes, and the condition matters more than the pass.** Executed in full:

| Action | Result |
|---|---|
| `svc_a_rw` reads `svc_b.orders_v1` before the grant | `ERROR: permission denied for schema svc_b` |
| after the approved grant | exactly the view's five columns; `internal_notes` withheld |
| `svc_a_rw` reads the base table `svc_b.orders` | `ERROR: permission denied for table orders` (also case 9 step 2) |
| after `REVOKE SELECT` on the view | `ERROR: permission denied for view orders_v1`, exit code 1 |

But the same read contract gated with **row-level security** instead of a grant returns `(0 rows)` and **exit code 0** when access is withdrawn — exactly the silent empty result AC-3.3.3 forbids. Both are reasonable readings of "revoke access to a view"; only one satisfies the criterion.

**Action:** add one line to the Data Ownership policy stating that access to a read contract is withdrawn with `REVOKE`, never by RLS or by dropping rows from the view. Without it, a future implementer can satisfy the policy and fail AC-3.3.3.

---

## **6. Case 26 — SCA in CI (PMCM-761)**

**Verdict: the blocker moved rather than cleared. AC-1.2 and AC-2.3 are now done; AC-1.1 needs the Jenkins job to be created.**

The earlier entry said this was blocked on us not having pushed `sca.yml`. That is no longer true, and what replaced it is worse.

The branch was pushed and **PR #800** opened. The workflow fired and failed: all eight jobs got no runner and ran zero steps, on *"recent account payments have failed or your spending limit needs to be increased."* GitHub Actions has no billing on this account, which is the same reason Jenkins exists here at all. The case expects a run-summary table, a JSON artifact and SARIF; none was produced, so AC-1.1 cannot be assessed from that run.

The review of #800 found two further defects, independent of billing:

- **The Trivy install downloaded `latest` unverified.** The pinned version had no published release, so the fallback was the normal path — inside a job holding a write token.
- **The gate reported a broken scanner as a clean pass.** A failed scan wrote no output file, and the next step read that absence as "no lockfile changed" and exited 0.

**What has been done since.** The workflow is ported to `.jenkins/sca.groovy`, where it can actually run, with both defects fixed rather than carried over: no fallback to `latest`, the tarball verified against the release's checksums and cosign-verified where possible, and "lockfile changed" tracked separately from "scan produced output". The three Python scripts move to `scripts/security/sca/` unchanged. `sca.yml` is deliberately left behind — in place it registers as active and adds seven permanently red checks to every PR while scanning nothing.

The gate fix was exercised against a scratch repository with a stubbed scanner, in both directions, including confirming that the old logic did report a pass with a changed lockfile and a broken scanner.

**AC-1.2 is now satisfied on content, not on mechanism.** All three lockfiles have been scanned — `backend` and `frontend` in Phase 2, and `cms-service` in *Software Composition Analysis — cms-service Baseline*. That root was never audited before and turns out to be 96% runtime: 46 findings, 44 of them runtime, 3 critical. Project runtime findings go from 73 to 117. But AC-1.2 asks for the lockfiles to be scanned *by the workflow*, and the workflow still has not run, so this is local evidence standing in.

**AC-2.3 is done.** See *Dependency Overrides — Register and Justification*. Two of the nine overrides turn out to constrain nothing at all.

**What is left:** someone with Jenkins access creates the job from `.jenkins/sca.groovy` and sets `TRIVY_VERSION` to a release they have confirmed exists. No version is hard-coded on purpose — a version nobody checked would be a guess, and a wrong one breaks the build.

**One open question that decides AC-2.1's deadlines.** `cms-service` could not be found in any deployment path: no entry in `render.yaml`, no reference in `Dockerfile.all`, and `boot-all.js` excludes it explicitly. If it runs nowhere, its three criticals do not reach production and the 7-day clock should not start. If it runs by some route not in the repository, they have been live and unscanned. Whoever owns the deployment needs to answer it.

## **7. What to change in the test cases themselves**

These are corrections to the documents, separate from the repository work:

1. **Case 23** — widen the `.env*.example` glob to `backend/.env*.example`; as written it matches nothing.
2. **Case 5** — step 3 should unset `AUTH_JWT_PRIVATE_KEY`, not `JWT_SECRET`.
3. **Case 3** — drop the `CYBERSEC.MISSING.004` reference, or implement the error-code scheme. Also extend the case to all three keys.
4. **Cases 4, 12, 13, 14** — replace "PR is shown as blocked" with "the check reports a violation"; merge-blocking is not available on this GitHub plan.
5. **Cases 1, 11, 18, 20, 21, 22** — set status to **Blocked — Not Implemented**, not To Be Tested, so the board distinguishes unbuilt from untested.
6. **Case 25** — add a sub-case for the `RATE_LIMIT_TRUSTED_PROXY_HOPS` hop-count reading before enforce goes live.
7. **Case 17** — name the promotion log sink in the expected result, or drop the claim.
8. **Case 15** — can only pass after DEVOPS_SOP §9 gains a rotation step.

---

## **8. Where this leaves the board**

| Status | Count | Cases |
|---|---|---|
| **Passed — executed** | **4** | **12, 13, 23, 25** |
| Not executed by choice (mutates `staging`) | 1 | 17 |
| Failed, cause identified | 4 | 2, 3, 15 (code/SOP defects) and 5 (defective test step) |
| Partly runnable | 3 | 4, 14 (gitleaks half only), 16 (steps 1–2 only) |
| Blocked — not implemented | 5 | 1, 18, 20, 21, 22 |
| Blocked — needs database access only | 4 | 8, 9, 10, 11 |
| Blocked — needs CTO or access | 6 | 6, 7, 8, 9, 19, 24 |
| Partly executed, governance half failed | 1 | 10 |
| Blocked — needs the Jenkins job created | 1 | 26 |

Twenty-six cases, every one accounted for.

**Findings worth acting on, in order.** The first two are the most serious; items 3 to 5 came out of actually running the tests and are all small fixes.

1. **`'asdasdasd'`** in `backend/libs/auth/src/jwt.strategy.ts:25` — a committed signing secret reachable by seven services. Remove the fallback, throw instead.
2. **Three self-generating financial encryption keys** in `payout-service` — fail startup instead, and treat a wrong-length key as a failure.
3. **The migration check misses 27 entities** — add `backend/apps/*/src/**/*.entity.ts` to `sop-check.yml:197`. One line, 22 of the 27 are in `user-service`.
4. **Confirm `RATE_LIMIT_TRUSTED_PROXY_HOPS` against staging traffic, and confirm no route reaches the gateway around the edge,** before enforce goes live. Scenario A in case 25 shows the limiter silently does nothing if that assumption breaks.
5. **No credential-rotation step in the leak-response SOP** — one paragraph in `docs/DEVOPS_SOP.md` §9.

Items 1 and 2 belong in `Authorisation Remediation — Open Code Changes`. Items 3 and 4 are new and belong on the gateway rollout checklist.

---

## **9. Revision log**

| Date | Change |
|---|---|
| 2026-10-08 | Initial desk check of all 26 parent test cases. |
