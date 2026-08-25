# Staging Promotion SOP

> **Scope.** This document defines how code moves from `dev-main` to `staging`. It is a supplement to `DEVOPS_SOP.md` Section 7.
>
> **Who can request a staging push:** QA engineers, Product Managers, CTO.
>
> **Who executes it:** DevOps team (or CTO directly).

---

## 1. Requesting a staging promotion

### 1.1 When to request

Request a staging push when:
- A milestone, feature set, or sprint is complete on `dev-main`
- A critical bug fix on `dev-main` needs QA verification on staging
- Product or CTO wants to demo current state to stakeholders

### 1.2 How to request

Open a GitHub issue in `Marketeq/marketeq-projects-vibe` with:

**Title:** `[Staging Push] <brief reason>`

**Body:**
```
## Staging Promotion Request

**Requested by:** @<your-github-handle>
**Role:** QA / Product Manager / CTO
**Reason:** <why this needs to go to staging now>

### Pre-push checklist (requester fills out)
- [ ] I have verified the feature/fix works on `dev-marketeq-projects.vercel.app` (dev preview)
- [ ] No known broken pages or console errors on dev preview
- [ ] All related PRs are merged to `dev-main`
- [ ] No in-progress PRs that should land first (check with team)

### Commits to promote
<optional: list specific PRs or commits, or "all of dev-main">
```

**Labels:** `staging-push`, `priority: <low|medium|high>`

### 1.3 Slack/Teams shortcut

If urgent (P0 bug fix), message the DevOps channel directly:
> "Requesting staging push — [reason]. GitHub issue: [link]"

Do NOT skip the GitHub issue — it's the audit trail.

---

## 2. DevOps execution checklist

The DevOps engineer (or CTO) follows these steps:

### 2.1 Pre-promotion verification

1. Open the GitHub issue and verify the requester's checklist is complete
2. The pipeline handles all health checks automatically (backend health, auth-service login endpoint). No manual curl commands needed — if anything is unhealthy, the pipeline aborts and tells you why.

### 2.2 Run the promotion pipeline

1. Go to Jenkins: http://72.61.77.231:8080/job/sync-dev-main-to-staging/
2. Click "Build with Parameters"
3. Set:
   - `SOURCE_BRANCH`: `dev-main` (default)
   - `CONFIRM`: Type exactly `PROMOTE TO STAGING`
   - `DRY_RUN`: Leave unchecked (or check first to preview)
4. Click "Build"
5. Monitor the console output

### 2.3 What the pipeline does

1. Requires `PROMOTE TO STAGING` confirmation (typo = abort)
2. Pre-flight health check (backend services + auth login endpoint)
3. Shows commits to be promoted
4. **Merges** dev-main into staging (NOT force-push)
   - Protected files (env templates, vercel.json, render.yaml) keep staging's version on conflict
   - Non-protected file conflicts abort and require manual resolution
5. Runs gitleaks secret scan on merged result
6. Pushes staging (triggers Vercel auto-deploy)
7. Post-deploy smoke test (frontend + auth endpoints)

### 2.4 Post-promotion

1. Comment on the GitHub issue:
   ```
   Staging promotion complete.
   - Pipeline: [link to Jenkins build]
   - Staging URL: https://staging-marketeq-projects.vercel.app
   - Commit SHA: <sha>
   - All smoke tests passed.
   ```
2. Close the issue
3. Notify the requester that staging is ready for testing

---

## 3. What to do if promotion fails

| Failure | Action |
|---|---|
| Pre-flight health check fails | Fix backend first. Do NOT promote broken code to staging. |
| Merge conflicts in non-protected files | A developer must resolve conflicts manually, then re-run. |
| Gitleaks finds secrets | Do NOT push. Open urgent issue for the dev who committed the secret. |
| Post-deploy smoke test fails (auth timeout) | Check if auth-service is stuck. Trigger a Render redeploy if needed. Re-run pipeline after services recover. |
| Vercel build fails | Check Vercel dashboard for build errors. Fix on dev-main first, then re-promote. |

---

## 4. Rules

1. **No auto-sync.** Staging promotions are always human-initiated, never automatic.
2. **No force-push.** The pipeline merges, not resets. This preserves staging-only regression fixes.
3. **No skipping the issue.** Every promotion has a GitHub issue for audit trail.
4. **No promoting during active incidents.** If backend services are down, fix first, promote after.
5. **QA/PM request, DevOps execute.** Separation of concerns — the requester verifies the feature works on dev, DevOps verifies the promotion is safe.

---

## 5. Emergency promotions

For P0 fixes (login broken, payments broken, data loss):

1. CTO can run the pipeline directly without a GitHub issue
2. Create the issue retroactively within 1 hour
3. Tag with `priority: P0` and `staging-push`
4. The pipeline's confirmation step (`PROMOTE TO STAGING`) still applies — no bypassing safety checks even in emergencies
