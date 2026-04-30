# DevOps Remediation Plan

This document tracks the remaining production-grade DevOps controls for the `marketeq-projects-vibe` stack in priority order. It exists so the repo has a concrete, reviewable backlog instead of relying on memory or one-off chat history.

## Priority order

| Priority | Control | Status | Why it matters | Repo / runtime owner |
|---|---|---|---|---|
| P0 | Post-deploy smoke testing for critical user flows | Implemented | Prevents green deploys when login, homepage, onboarding, or protected routes are actually broken | `scripts/regression/smoke.deploy.mjs`, live n8n orchestrator |
| P0 | Deployment health gating on business flow checks, not just platform success | Implemented | Vercel `READY` is not enough; staging must fail if sign-in or homepage is broken | live n8n orchestrator + GitHub commit statuses |
| P0 | Workflow drift detection for the live n8n deploy orchestrator | Implemented in this phase | Detects when the live workflow, pinned runner URL, gist revision, or webhook metadata drift away from the repo-controlled contract | `scripts/devops/check-devops-drift.mjs` |
| P0 | Repo-controlled deploy topology manifest | Implemented in this phase | Removes hidden project IDs / hook URLs / workflow IDs from tribal memory and makes drift auditable in PRs | `scripts/devops/marketeq-devops.config.json` |
| P1 | One-command live n8n workflow sync from the repo contract | Implemented in this phase | Makes it possible to reconcile the live workflow to the pinned runner revision without manual dashboard edits | `scripts/devops/sync-n8n-workflow.mjs` |
| P1 | Full workflow-as-code for the orchestrator source itself | In progress | The orchestration logic should live in the repo, not only in a gist / live n8n node | `scripts/devops/marketeq_orchestrator_node.js`, publish + sync scripts |
| P1 | Secret externalization from inline n8n Build Command code | Planned | Tokens should come from managed credentials or env injection, not inline code strings | follow-up |
| P1 | Structured deploy summary / observability artifact | Planned | Every promotion should emit one deploy report tying together SHA, Render, Vercel, smoke, and final visibility state | follow-up |
| P1 | Automated rollback playbook | Planned | Failures should have a first-class recovery path instead of manual ad-hoc steps | follow-up |
| P2 | Concurrency lock / queue hardening at the orchestrator level | Planned | Prevents race conditions during rapid successive pushes | follow-up |
| P2 | Live env drift reconciliation against Vercel / Render variable sets | Planned | Prevents the repo templates from silently diverging from deployed runtime config | follow-up |

## What was implemented in this phase

### 1. Drift checker

`node scripts/devops/check-devops-drift.mjs`

Checks:
- protected branch SHAs
- pinned gist raw URL vs repo config
- live n8n workflow metadata (`workflowId`, active state, webhook path / id)
- live Build Command runner URL vs repo config
- required env keys across the frozen frontend/backend templates
- latest Vercel / Smoke commit statuses on `origin/dev-main`

Exit code:
- `0` when the checked contract matches
- `1` when drift or missing keys are found

### 2. Live workflow sync

`node scripts/devops/sync-n8n-workflow.mjs --check`

Checks whether the live n8n `Build Command` node is pinned to the configured runner URL.

`node scripts/devops/sync-n8n-workflow.mjs --apply`

Rewrites the live workflow `Build Command` node so it points at the configured pinned runner URL, then re-fetches the workflow and verifies the update.

### 3. Checked-in topology manifest

`scripts/devops/marketeq-devops.config.json` now pins:
- repo name
- protected branches
- n8n workflow ID / webhook metadata / pinned runner raw URL
- Render service ID / URL
- Vercel team IDs and protected-project deploy hooks
- required frontend/backend env contract keys

### 4. Repo-controlled orchestrator source

`scripts/devops/marketeq_orchestrator_node.js`

The live orchestrator source now exists in the repo. The gist is no longer the only source copy.

`node scripts/devops/publish-n8n-runner.mjs`

Publishes the repo-controlled runner file to the configured gist, then rewrites `scripts/devops/marketeq-devops.config.json` with the new pinned raw URL so `sync-n8n-workflow.mjs` can push that exact revision into the live n8n workflow.

## Known remaining gaps

1. The orchestrator source code is still primarily maintained in the live gist / external working copy instead of being fully versioned under the repo.
2. The live n8n `Build Command` still contains inline secret injection and should be moved to managed credentials / secret store inputs.
3. The current smoke gate correctly fails the deploy on broken login, but it does not yet emit a first-class structured deploy summary artifact.
4. Rollback remains manual.
5. Runtime env reconciliation against real Vercel / Render env var sets is still a follow-up.

## Next recommended implementation order

1. Vendor the orchestrator source into the repo and make the gist a build artifact, not the source of truth.
2. Remove inline secret injection from the n8n Build Command.
3. Add structured deploy summary output and rollback automation.
4. Add live env reconciliation against Vercel and Render.
