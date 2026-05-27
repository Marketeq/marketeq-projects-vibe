# Jenkins CI/CD Remediation Plan

> **Status:** RESOLVED — all 7 issues fixed 2026-05-27
> **Server:** 72.61.77.231:8080
> **Created:** 2026-05-27
> **Priority:** P0 — deployments and branch sync are manual until fixed

---

## Executive Summary

The Jenkins `github-webhook-dispatcher` pipeline receives GitHub webhook events and routes them to child pipelines. **PR gate checks work correctly.** However, the push-to-protected-branch handler is missing critical dispatch calls, and the post-merge-audit has a check-detection bug that creates false-positive auto-revert PRs.

---

## Issue 1: `sync-dev-main-to-staging` never triggers

**Severity:** P0 — staging branch is permanently stale
**Pipeline:** `sync-dev-main-to-staging` (last ran: 2026-05-22, build #5)

**Root cause:** The `github-webhook-dispatcher` push handler dispatches only 3 jobs on push to a protected branch:
- `post-merge-audit`
- `login-violation-alert`
- `gitleaks`

It does **not** dispatch `sync-dev-main-to-staging` when the push target is `dev-main`.

**Fix:** Add to the dispatcher's push handler, after the existing `gitleaks` dispatch:

```groovy
if (branch == 'dev-main') {
    build job: 'sync-dev-main-to-staging', wait: false, parameters: [
        string(name: 'COMMIT_SHA', value: push_after)
    ]
    echo "Triggered sync-dev-main-to-staging"
}
```

**Verification:** Merge any PR to `dev-main`. Confirm `sync-dev-main-to-staging` fires and staging branch matches dev-main within 60 seconds.

---

## Issue 2: `vercel-deploy` never triggers

**Severity:** P0 — frontend never deploys automatically
**Pipeline:** `vercel-deploy` (last ran: 2026-05-22, build #6)

**Root cause:** Same as Issue 1 — the dispatcher's push handler does not dispatch `vercel-deploy` on push to any protected branch.

**Fix:** Add to the dispatcher's push handler:

```groovy
build job: 'vercel-deploy', wait: false, parameters: [
    string(name: 'BRANCH', value: branch),
    string(name: 'COMMIT_SHA', value: push_after)
]
echo "Triggered vercel-deploy for ${branch}"
```

**Note:** The `vercel-deploy` pipeline handles the private-repo visibility toggle (temporarily public for Vercel free tier). Verify this still works — it was last tested May 22.

**Verification:** Push to `staging`. Confirm Vercel deployment appears in the Vercel dashboard within 5 minutes.

---

## Issue 3: `staging-orchestrator` never triggers

**Severity:** P1 — Render backend not auto-deployed on staging/dev-main changes
**Pipeline:** `staging-orchestrator` (last ran: 2026-05-22, build #3)

**Root cause:** Same as Issues 1-2 — not dispatched by the webhook handler.

**Fix:** Add to the dispatcher's push handler, conditional on backend file changes:

```groovy
build job: 'staging-orchestrator', wait: false, parameters: [
    string(name: 'BRANCH', value: branch),
    string(name: 'COMMIT_SHA', value: push_after)
]
echo "Triggered staging-orchestrator for ${branch}"
```

The `staging-orchestrator` pipeline itself should detect whether backend files changed and skip the Render deploy if not.

**Verification:** Push a backend change to `dev-main`. Confirm Render deploy triggers.

---

## Issue 4: `post-merge-audit` creates false-positive auto-revert PRs

**Severity:** P0 — creates revert PRs for legitimate merges, erodes trust in CI
**Pipeline:** `post-merge-audit` (build #10 — false positive on PR #222)

**Root cause:** The audit checks for GitHub commit statuses named `Regression risk analysis` and `Scan for committed secrets` (the old GitHub Actions names). Jenkins posts statuses with different names: `Jenkins / AI Breakage Detector` and `Jenkins / Secret Scan`. The audit doesn't find statuses under the old names, concludes checks were "not found", and opens a revert PR.

**Evidence from build #10 log:**
```
PR #222 merged despite failing checks: Regression risk analysis (not found)|Scan for committed secrets (not found)
```

Meanwhile, build #43 (the PR check run) posted all 5 statuses as SUCCESS under the `Jenkins / *` names.

**Fix:** Update the `post-merge-audit` pipeline to look for the correct status context names:
- `Regression risk analysis` -> `Jenkins / AI Breakage Detector`
- `Scan for committed secrets` -> `Jenkins / Secret Scan`
- Also check for `Jenkins / SOP Check`, `Jenkins / Login Gate`, `Jenkins / Code Review`

**Cleanup:** Close any open auto-revert PRs that were false positives. PR #223 was already closed.

**Verification:** Merge a PR to `dev-main`. Confirm `post-merge-audit` passes (no revert PR created).

---

## Issue 5: `post-merge-audit` incorrectly flags force-pushes to staging

**Severity:** P1 — the SOP-approved sync method (force-push dev-main to staging) triggers a violation alert
**Pipeline:** `post-merge-audit` (build #11 — flagged the staging sync)

**Root cause:** The audit detects `forced: true` on the staging push and immediately opens a force-push violation issue, without checking whether the push came from the `sync-dev-main-to-staging` pipeline or the webhook dispatcher.

**Fix:** The audit should allowlist force-pushes to `staging` that match `dev-main` HEAD. Options:
1. Check if the pushed SHA matches `origin/dev-main` HEAD — if yes, it's a sync, not a violation
2. Have `sync-dev-main-to-staging` set a tag or commit status before the force-push that the audit can check
3. Skip force-push detection entirely for `staging` (since staging is always a fast-forward or reset from dev-main)

**Verification:** Run `sync-dev-main-to-staging`. Confirm no violation issue is created.

---

## Issue 6: Dispatcher ignores `pull_request` `closed` events (merged PRs)

**Severity:** P2 — informational, not blocking (push event covers it)

**Root cause:** The dispatcher only handles PR actions `opened`, `synchronize`, `reopened`, `edited`. When a PR is merged, GitHub sends `action: closed` with `merged: true`. The dispatcher logs `PR action 'closed' -- skipping`.

This is currently harmless because the squash-merge also triggers a `push` event to the target branch, which the dispatcher does handle. However, if any future logic needs to know "a PR was just merged" (vs. a direct push), this event is lost.

**Fix (optional):** Add `closed` to the valid actions list, check `merged == true`, and use it for any merge-specific logic.

---

## Issue 7: Jenkins CSRF prevents programmatic job triggers

**Severity:** P2 — can't trigger jobs via API from local dev or scripts
**Affected:** All jobs when triggered via `curl`

**Root cause:** Jenkins requires a CSRF crumb for POST requests, but the crumb appears to be session-bound and expires. Standard `crumbIssuer/api/json` + header approach returns 403.

**Fix:** Either:
1. Configure Jenkins to use API tokens instead of crumbs for remote triggers (Manage Jenkins -> Security -> disable CSRF for API token auth)
2. Or ensure the Generic Webhook Trigger plugin (which the dispatcher uses) is the sole entry point and doesn't require crumbs

**Verification:** `curl -X POST .../job/sync-dev-main-to-staging/build` with auth succeeds.

---

## Summary Table

| # | Pipeline | Issue | Severity | Status |
|---|----------|-------|----------|--------|
| 1 | `sync-dev-main-to-staging` | Not dispatched on dev-main push | P0 | FIXED 2026-05-27 |
| 2 | `vercel-deploy` | Not dispatched on any push | P0 | FIXED 2026-05-27 |
| 3 | `staging-orchestrator` | Not dispatched on any push | P1 | FIXED 2026-05-27 |
| 4 | `post-merge-audit` | Wrong status context names -> false reverts | P0 | FIXED 2026-05-27 |
| 5 | `post-merge-audit` | Flags SOP-approved staging force-push | P1 | FIXED 2026-05-27 |
| 6 | `github-webhook-dispatcher` | Ignores merged PR events | P2 | FIXED 2026-05-27 |
| 7 | All jobs | CSRF blocks programmatic API triggers | P2 | FIXED 2026-05-27 |

---

## What Currently Works

| Pipeline | Status | Notes |
|----------|--------|-------|
| `github-webhook-dispatcher` | OK | Receives webhooks, routes PR events correctly |
| `sop-check` | OK | Runs on PRs, posts status to GitHub |
| `ai-breakage-check` | OK | Runs on PRs, posts status to GitHub |
| `gitleaks` | OK | Runs on PRs and pushes |
| `login-gate` | OK | Runs on PRs, posts status to GitHub |
| `code-review` | OK | Runs on PRs, posts status to GitHub |
| `login-violation-alert` | OK | Fires on push to protected branches |
| `infra-health-check` | OK | Runs periodically (build #179) |
| `stale-branch-cleanup` | OK | Weekly schedule works (last: May 25) |

---

## Recommended Fix Order

1. **Issue 4** (post-merge-audit false positives) — stop the bleeding, prevent bogus revert PRs
2. **Issue 1** (sync-dev-main-to-staging) — restore automatic branch sync
3. **Issue 2** (vercel-deploy) — restore automatic frontend deploys
4. **Issue 5** (staging force-push detection) — prevent false violation alerts from the sync
5. **Issue 3** (staging-orchestrator) — restore automatic backend deploys
6. **Issues 6-7** — nice-to-have, fix when convenient

---

## Changelog

| Date | Change |
|------|--------|
| 2026-05-27 | Initial document. Full audit of all 13 Jenkins pipelines after discovering staging was 5 days stale and Vercel hadn't deployed since May 22. |
| 2026-05-27 | ALL 7 ISSUES FIXED. Dispatcher updated with 3 new dispatch calls + merged PR handling. Post-merge-audit switched from check-runs API to statuses API with correct Jenkins context names. Staging force-push allowlist added. CSRF excludeClientIPFromCrumb enabled. |
