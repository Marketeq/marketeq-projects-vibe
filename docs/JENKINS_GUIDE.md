# Jenkins Automation Guide

> **For:** New DevOps engineers joining the Marketeq team.
>
> **What this is:** A plain-English explanation of every Jenkins automation we have, what it does, when it runs, and how to troubleshoot it. No jargon where it can be avoided.
>
> **Jenkins URL:** http://72.61.77.231:8080
>
> **Last updated:** 2026-07-08

---

## How It All Fits Together

We use Jenkins as our CI/CD engine because GitHub Actions ran out of free minutes. Jenkins lives on a Hostinger VPS (72.61.77.231) inside a Docker container.

Here's the flow:

```
Developer pushes code or opens a PR
    |
    v
GitHub sends a webhook to Jenkins
    |
    v
The "dispatcher" pipeline receives it and figures out what happened
    |
    v
It triggers the right pipelines based on the event:
  - PR opened? -> Run 5 checks in parallel
  - Code merged? -> Run post-merge audit + deploy
  - Push to protected branch? -> Deploy + audit
```

There are **17 pipeline files** on disk, but **15 active Jenkins jobs**. Two files are legacy/alternate versions.

---

## The Pipelines, Explained

### 1. GitHub Webhook Dispatcher

**File:** `github-webhook-dispatcher.groovy`
**Trigger:** Every GitHub webhook (push, PR opened, PR updated, PR review)
**What it does in plain English:**

This is the traffic cop. Every time something happens on GitHub, this pipeline receives the event and decides what to do with it. It handles two repos:

- **marketeq-projects-vibe** (the main app)
- **marketeq-website** (the marketing site)

For the main app, when a **PR is opened or updated**, it fires off five checks in parallel:
1. SOP Check
2. AI Breakage Detector
3. Secret Scan (gitleaks)
4. Login Gate
5. Code Review

When **code is pushed to a protected branch** (dev-main, staging, live-mvp), it fires:
1. Post-merge audit
2. Login violation alert
3. Secret scan
4. Staging orchestrator (deploy)

**If it breaks:** Nothing else runs. Check that the GitHub webhook is delivering (Settings > Webhooks on the repo). The webhook URL is `http://72.61.77.231:8080/generic-webhook-trigger/invoke?token=marketeq-dispatch`.

---

### 2. SOP Check

**File:** `jenkins_pipeline_sop_check.groovy`
**Trigger:** Dispatcher fires it on every PR
**GitHub status:** `Jenkins / SOP Check`
**What it does in plain English:**

This is the rule enforcer. It reads the PR diff and checks for 15+ violations:

- **Secrets:** Did someone commit an API key, password, or `.env` file?
- **Junk files:** Are there `.DS_Store`, `node_modules`, or other garbage in the PR?
- **Login files:** Did someone touch the sign-in page, auth context, or middleware without the required confirmation in the PR description?
- **Env template mismatch:** Is someone modifying a staging env template in a PR targeting dev-main? (That's not allowed — each template belongs to its branch.)
- **Hardcoded login values:** Are there `onrender.com` URLs, hardcoded `SameSite` flags, or hardcoded CORS origins in login code?
- **Entity without migration:** Did someone add a TypeORM entity but forget the migration file?
- **Oversized PR:** Is the PR changing more than 2,000 lines? (Big PRs are hard to review and tend to break things.)
- **@ts-ignore without justification:** TypeScript escapes need a comment explaining why.

If any check fails, it posts a `failure` status on the PR — the PR can't be merged until the issue is fixed.

**If it breaks:** Usually means the diff is too large for the shell script to handle, or the GitHub API token expired. Check the console output.

---

### 3. AI Breakage Detector

**File:** `jenkins_pipeline_ai_breakage.groovy`
**Trigger:** Dispatcher fires it on every PR
**GitHub status:** `Jenkins / AI Breakage Detector`
**What it does in plain English:**

This sends the PR diff to Claude Sonnet and asks: "Does this change silently break any existing functionality?" Claude reads the diff, looks at the callers of every changed function, and specifically hunts for:

- Functions that got renamed but their callers didn't update
- Default values that changed in a way that breaks existing behavior
- Imports that were removed but are still needed elsewhere
- Working code that got overwritten with new code that does less

If Claude finds a likely regression, it posts a `failure` status with a comment explaining the risk.

**Needs:** A funded Anthropic API key (stored as `anthropic-api-key` in Jenkins credentials). If the key has no credits, this check is skipped gracefully.

**If it breaks:** Usually the Anthropic API returned an error (rate limit, no credits). Check `anthropic_available.txt` in the console output. The check skips itself if the API is unavailable — it won't block a PR.

---

### 4. Secret Scan (gitleaks)

**File:** `jenkins_pipeline_gitleaks.groovy`
**Trigger:** Dispatcher fires it on every PR and every push to protected branches
**GitHub status:** `Jenkins / Secret Scan`
**What it does in plain English:**

Runs [gitleaks](https://github.com/gitleaks/gitleaks) on the PR diff to find accidentally committed secrets — API keys, passwords, tokens, private keys. If it finds anything, the PR is blocked.

This is a critical safety net. Even if a developer adds a key to `.env.local` (which is gitignored), gitleaks catches it if they accidentally staged and committed it.

**If it breaks:** Rare. Usually means gitleaks binary isn't installed in the Jenkins container. Check with `docker exec jenkins which gitleaks`.

---

### 5. Login Gate

**File:** `jenkins_pipeline_login_gate.groovy`
**Trigger:** Dispatcher fires it on every PR
**GitHub status:** `Jenkins / Login Gate`
**What it does in plain English:**

Login is the most fragile part of the app. It's been broken and fixed multiple times. This pipeline exists to prevent it from breaking again.

It checks if the PR changes any of these files:
- `frontend/app/sign-in/**`
- `frontend/app/sign-up/**`
- `frontend/contexts/auth.tsx`
- `frontend/middleware.ts`
- `backend/apps/auth-service/**`
- `backend/libs/shared/src/guards/**`

If any of these files are touched, the pipeline checks if the PR author is the repo owner (`CTorres9800`). If not, it posts a `failure` status requiring owner approval before merge.

**If it breaks:** Check that `REPO_OWNER` is set to `CTorres9800` in the pipeline env vars.

---

### 6. Code Review

**File:** `jenkins_pipeline_code_review.groovy`
**Trigger:** Dispatcher fires it on every PR
**GitHub status:** `Jenkins / Code Review`
**What it does in plain English:**

Sends the PR diff to Claude for a full code review. Claude looks at code quality, potential bugs, naming, architecture, and whether the changes follow the project's conventions.

The review is posted as a comment on the PR. It's informational — it doesn't block the PR by itself, but the team should read and address the feedback.

**Needs:** Funded Anthropic API key. Skips gracefully if unavailable.

---

### 7. Post-Merge Audit

**File:** `jenkins_pipeline_post_merge_audit.groovy`
**Trigger:** Dispatcher fires it on every push to protected branches (after a PR is merged)
**What it does in plain English:**

This is the "after the fact" safety check. After code is merged, it verifies:

- Was the merge a force push? (Force pushes to protected branches are always suspicious.)
- Did the merged code pass all the required checks before merging?
- Did someone bypass branch protection rules?

If it finds a violation, it opens a GitHub issue tagged to the CTO. It's currently set to **alert-only** — it warns but doesn't auto-revert. This is intentional because auto-reverting can cause more damage than the violation itself.

---

### 8. Login Violation Alert

**File:** `jenkins_pipeline_login_violation.groovy`
**Trigger:** Dispatcher fires it on every push to protected branches
**What it does in plain English:**

If login files were merged without the repo owner's approval (bypassing the Login Gate), this pipeline opens a GitHub issue immediately. The issue tags the CTO and includes:

- Which login files were changed
- Who pushed the code
- The commit SHA

This is the backstop for the Login Gate. Even if someone uses `--admin` to force-merge a PR, this catches it after the fact.

---

### 9. Staging Services Monitor

**File:** `jenkins_pipeline_staging_services_monitor.groovy`
**Trigger:** Every 5 minutes (cron)
**What it does in plain English:**

This is the watchdog. Every 5 minutes, it:

1. Hits the backend's `/services/health` endpoint
2. Counts how many of the 28 services are healthy
3. If any are down:
   - First failure: logs it and waits
   - Second consecutive failure: tries a service restart via Render API
   - Third consecutive failure: triggers a full Render redeploy
   - Continues failing: alerts (build goes UNSTABLE in Jenkins)

It also logs health metrics to `/var/jenkins_home/health-metrics/staging-health.jsonl` so you can track uptime over time.

**Benchmark:** 28/28 services healthy, 100% uptime.

**If it breaks:** Usually the Render backend is genuinely down. Check Render dashboard directly.

---

### 10. Infrastructure Health Check

**File:** `jenkins_pipeline_infra_health.groovy`
**Trigger:** Every hour (cron)
**What it does in plain English:**

Pings all of our third-party services to make sure they're reachable:

1. **GitHub API** — can we read the repo?
2. **Vercel API** — can we list projects?
3. **Render API** — can we list services?
4. **Anthropic API** — can we call Claude? (Optional — won't fail the build if unavailable)
5. **Frontend** — does the staging site load?
6. **Backend** — does the health endpoint respond?

If any critical service (GitHub, Vercel, Render) is unreachable, the build fails. This gives us early warning if a service is having an outage.

---

### 11. Stale Branch Cleanup

**File:** `jenkins_pipeline_stale_branches.groovy`
**Trigger:** Every Monday at 2:00 PM UTC (cron)
**What it does in plain English:**

Lists all branches on the repo that haven't had a commit in the last 30 days. It creates a report but **does NOT delete anything**. The report tells you:

- Branch name
- Last commit date
- Last commit author
- How old it is

The idea is that someone reviews this weekly and manually decides which branches to clean up. Protected branches (dev-main, staging, live-mvp) are always excluded.

---

### 12. Sync Dev-Main to Staging

**File:** `jenkins_pipeline_sync_staging.groovy`
**Trigger:** Manual only (someone has to click "Build with Parameters")
**What it does in plain English:**

This promotes code from `dev-main` to `staging`. It's the pipeline that QA or a Product Manager requests when they want the latest development code on the staging environment for testing.

The process:
1. You must type `PROMOTE TO STAGING` to confirm (prevents accidents)
2. Pre-flight: checks that the backend is healthy and login endpoints respond
3. Shows you what commits will be promoted
4. **Merges** dev-main into staging (not a force-push — this preserves any staging-only fixes)
5. If there are conflicts in protected files (env templates, vercel.json), staging's version wins
6. If there are conflicts in other files, it stops and tells you to fix them manually
7. Runs gitleaks to make sure no secrets snuck in
8. Pushes staging (triggers Vercel auto-deploy)
9. Runs a smoke test to verify login still works after deployment

**Important:** This is NOT automatic. See `docs/STAGING_PROMOTION_SOP.md` for the full request and approval process.

---

### 13. Staging Orchestrator

**File:** `staging-orchestrator.groovy`
**Trigger:** Dispatcher fires it on every push to a protected branch
**What it does in plain English:**

This is the deploy coordinator. When code lands on dev-main, staging, or live-mvp, this pipeline:

1. Validates all API credentials work (GitHub, Vercel, Render)
2. Checks the service registry (boot-all.js) for consistency
3. Triggers a Vercel deploy for the correct project
4. For staging/live-mvp: also triggers a Render deploy
5. Runs smoke tests after deployment

It's the glue that connects "code merged" to "code deployed."

---

### 14. Vercel Deploy

**File:** `jenkins_pipeline_vercel_deploy.groovy`
**Trigger:** Called by the staging orchestrator (not triggered directly by webhooks)
**What it does in plain English:**

Deploys the frontend to the correct Vercel project based on the branch:

| Branch | Vercel Project | URL |
|---|---|---|
| `dev-main` | `marketeq-projects-dev` | `dev-marketeq-projects.vercel.app` |
| `staging` | `marketeq-projects-staging` | `staging-marketeq-projects.vercel.app` |
| `live-mvp` | `marketeq-projects-live-mvp` | `live-marketeq-projects.vercel.app` |

It handles the repo visibility toggle (the repo must be temporarily public for Vercel's free plan), triggers the deploy, waits for it to finish, then sets the repo back to private.

---

### 15. Website Lint

**File:** `jenkins_pipeline_website_lint.groovy`
**Trigger:** Dispatcher fires it on PRs to the marketeq-website repo
**GitHub status:** `Jenkins / Lint & Type Check`
**What it does in plain English:**

Runs `npm run tooling` (format check + lint + type check) on PRs to the marketing website. Blocks the PR if there are lint errors or TypeScript problems.

This is the only pipeline that runs for the website repo. Everything else is for the main app.

---

## Where Things Live

| What | Path |
|---|---|
| Pipeline files | `/var/jenkins_home/pipelines/*.groovy` |
| Health metrics | `/var/jenkins_home/health-metrics/` |
| Commit status helper | `/var/jenkins_home/pipelines/jenkins_commit_status.sh` |
| Jenkins data | `/var/jenkins_home/` |
| Docker container | `jenkins` (on host 72.61.77.231) |

## Stored Credentials (in Jenkins)

| Credential ID | What it is |
|---|---|
| `github-token` | GitHub Personal Access Token (repo + workflow scopes) |
| `vercel-token` | Vercel API token |
| `render-api-key` | Render API key |
| `anthropic-api-key` | Anthropic API key (for Claude AI checks) |
| `n8n-api-key` | n8n workflow automation API key |
| `hostinger-api-token` | Hostinger VPS API token |

## How to Access Jenkins

```bash
# SSH into the VPS
sshpass -p 'JenkinsSetup(2026)' ssh root@72.61.77.231

# Jenkins web UI
# URL: http://72.61.77.231:8080
# Username: admin
# Password: 30abbf31c05c46b3b51c4f9ae2b47ba7

# Look at pipeline files
cat /var/jenkins_home/pipelines/<filename>.groovy

# Check Jenkins container status
docker ps | grep jenkins

# View Jenkins logs
docker logs jenkins --tail 50
```

## How to Reload a Pipeline After Editing

If you edit a pipeline file on disk, Jenkins doesn't pick up the change automatically. You need to reload it:

1. Edit the file: `vi /var/jenkins_home/pipelines/<filename>.groovy`
2. Reload via the Script Console (http://72.61.77.231:8080/script):

```groovy
def job = Jenkins.instance.getItem("job-name")
job.setDefinition(new CpsFlowDefinition(new File("/var/jenkins_home/pipelines/filename.groovy").text, true))
job.save()
```

Or via curl (need to get a fresh crumb first):

```bash
# Get crumb + session cookie
curl -c /tmp/j.cookie -u admin:30abbf31c05c46b3b51c4f9ae2b47ba7 \
  http://localhost:8080/crumbIssuer/api/json

# Post the script (use the crumb value from above)
curl -b /tmp/j.cookie -u admin:30abbf31c05c46b3b51c4f9ae2b47ba7 \
  -H "Jenkins-Crumb:<crumb>" \
  http://localhost:8080/scriptText \
  --data-urlencode 'script=def job = Jenkins.instance.getItem("job-name"); ...'
```

---

## Troubleshooting Cheat Sheet

| Symptom | Likely cause | Fix |
|---|---|---|
| PRs not getting status checks | Webhook not delivering | Check GitHub repo Settings > Webhooks > Recent Deliveries |
| "PASS: GitHub API" then nothing | Dispatcher routing is wrong | Check `github-webhook-dispatcher.groovy` event parsing |
| AI checks skipped | Anthropic API key expired or no credits | Add credits at console.anthropic.com/settings/billing |
| Staging monitor keeps failing | Backend services are genuinely down | Check Render dashboard, trigger manual redeploy |
| Pipeline says "Job not found" | Job name in dispatcher doesn't match Jenkins job name | Compare dispatcher `build job:` calls with Jenkins job list |
| "No valid crumb" on Script Console | Session expired | Get a fresh crumb and use cookie jar (see above) |
| Vercel deploy fails with 403 | Repo is private, Vercel can't read it | The deploy pipeline should handle visibility toggle — check it |
| gitleaks not found | Binary not in container | `docker exec jenkins apt-get update && docker exec jenkins apt-get install gitleaks` |

---

## Adding a New Pipeline

1. Write the Groovy file and save it to `/var/jenkins_home/pipelines/your_pipeline.groovy`
2. Create a new Pipeline job in Jenkins UI (New Item > Pipeline)
3. In the job config, set "Pipeline script" and paste the content, or use the Script Console to load from file
4. If it should run on webhooks, add a trigger call in `github-webhook-dispatcher.groovy`
5. If it should run on a schedule, add a `triggers { cron('...') }` block in the pipeline
6. Test with a dry run first
7. Update this document

---

## Resolved Incidents

### 2026-07-04: Ably API key wrong format
- **Symptom:** Real-time notifications disabled on all services. Ably client logged "key is missing or invalid".
- **Root cause:** `ABLY_API_KEY` on Render was a JWT token, not the required `keyId:keySecret` format.
- **Fix:** Updated the env var on Render via API with the correct key. Triggered redeploy.
- **Prevention:** Ably services already log a clear error when the key format is wrong. Just use the right key format.

### 2026-07-04: Transaction-service schema permissions
- **Symptom:** Transaction-service couldn't create tables — `transaction_service` schema owned by `supabase_admin`, `postgres` user lacked CREATE privilege.
- **Root cause:** Supabase self-hosted creates schemas as `supabase_admin`. The `postgres` user isn't a superuser.
- **Fix:** Connected as `supabase_admin`, granted ALL on schema + tables + sequences to `postgres`. Set default privileges. Ran all 3 migrations.
- **Prevention:** Any new service with a custom schema needs the same grants. Check: `SELECT has_schema_privilege('postgres', 'schema_name', 'CREATE')`.

### 2026-07-08: Legal-service crash on staggered boot
- **Symptom:** Legal-service exited code 1 during startup. Stderr: `routine: 'ProcessInterrupts'` — Postgres killed the connection.
- **Root cause:** boot-all.js staggers starts (3s apart). Legal-service starts late (~85s in) and hit a transient DB interruption with no retry config.
- **Fix:** Added `retryAttempts: 5` and `retryDelay: 3000` to TypeORM config in `app.module.ts`.
- **Prevention:** Tier 3 services that start late in boot-all.js should have TypeORM retry config.
