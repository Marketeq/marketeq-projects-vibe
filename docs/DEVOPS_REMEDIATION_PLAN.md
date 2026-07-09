# DevOps Remediation Plan

This document tracks the remaining production-grade DevOps controls for the `marketeq-projects-vibe` stack in priority order. It exists so the repo has a concrete, reviewable backlog instead of relying on memory or one-off chat history.

## Priority order

| Priority | Control | Status | Why it matters | Repo / runtime owner |
|---|---|---|---|---|
| P0 | Post-deploy smoke testing for critical user flows | Implemented | Prevents green deploys when login, homepage, onboarding, or protected routes are actually broken | `scripts/devops/regression/smoke.deploy.mjs`, live n8n orchestrator |
| P0 | Deployment health gating on business flow checks, not just platform success | Implemented | Vercel `READY` is not enough; staging must fail if sign-in or homepage is broken | live n8n orchestrator + GitHub commit statuses |
| P0 | Workflow drift detection for the live n8n deploy orchestrator | Implemented in this phase | Detects when the live workflow, pinned runner URL, gist revision, or webhook metadata drift away from the repo-controlled contract | `scripts/devops/check-devops-drift.mjs` |
| P0 | Repo-controlled deploy topology manifest | Implemented in this phase | Removes hidden project IDs / hook URLs / workflow IDs from tribal memory and makes drift auditable in PRs | `scripts/devops/marketeq-devops.config.json` |
| P1 | One-command live n8n workflow sync from the repo contract | Implemented in this phase | Makes it possible to reconcile the live workflow to the pinned runner revision without manual dashboard edits | `scripts/devops/sync-n8n-workflow.mjs` |
| P1 | Full workflow-as-code for the orchestrator source itself | Implemented | The orchestration logic now lives in the repo and is published outward to the pinned gist revision | `scripts/devops/marketeq_orchestrator_node.js`, publish + sync scripts |
| P1 | Secret externalization from inline n8n Build Command code | Implemented in this phase | The live workflow now sources a host-side runtime env file instead of embedding deploy tokens in the Build Command node | `scripts/devops/install-n8n-runtime-secrets.mjs`, `scripts/devops/build-n8n-build-command.mjs` |
| P1 | Structured deploy summary / observability artifact | Implemented in this phase | Every promotion now emits a single GitHub commit comment summary with SHA, visibility, checks, and machine-readable JSON | live n8n orchestrator |
| P1 | Automated rollback playbook | In progress | A first-class staging rollback trigger now exists in-repo, but current staging history has no recent smoke-green candidate to validate a full live recovery | `scripts/devops/rollback-staging.mjs`, live n8n orchestrator |
| P2 | Concurrency lock / queue hardening at the orchestrator level | Implemented in this phase | Prevents overlapping `dev-main` / `staging` promotions from racing each other on the n8n host | live n8n orchestrator |
| P1 | Staging env self-heal before promotion | Implemented in this phase | Prevents `dev-main -> staging` deploys from breaking login when Vercel staging URLs or Render auth/runtime envs drift | `scripts/devops/sync-staging-runtime-envs.mjs`, `scripts/devops/marketeq-staging-env-baseline.json`, live n8n orchestrator |
| P2 | Live env drift reconciliation against Vercel / Render variable sets | Implemented in this phase | The repo now checks and repairs the exact staging Vercel contract plus required Render runtime/auth envs before promotions | `scripts/devops/check-runtime-env-drift.mjs`, `scripts/devops/sync-staging-runtime-envs.mjs` |

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

### 5. Runtime secret externalization

`scripts/devops/build-n8n-build-command.mjs`

Generates the exact `Build Command` node contract so the live workflow sources runtime secrets from the n8n host file path pinned in `scripts/devops/marketeq-devops.config.json` instead of embedding token literals inline.

`node scripts/devops/install-n8n-runtime-secrets.mjs`

Creates a short-lived installer workflow on the n8n instance, writes `/home/node/.n8n/marketeq-devops.env` with the required runtime secret keys, verifies the file owner/mode/keyset, then deletes the installer workflow.

### 6. Structured deploy summary artifact

The live orchestrator now upserts one branch-scoped GitHub commit comment per managed SHA using the marker `<!-- marketeq-deploy-summary:<branch> -->`.

Each summary includes:
- final status
- mode / reason
- branch / SHA / event
- final repo visibility state
- changed files
- normalized check results
- embedded JSON for machine-readable audit trails

### 7. Concurrency lock hardening

The live orchestrator now acquires host-side branch locks under `/home/node/.n8n/marketeq-locks` before it mutates statuses or protected branches.

Lock behavior:
- `dev-main` promotions lock both `dev-main` and `staging`
- `staging` promotions lock `staging`
- stale locks are evicted after 30 minutes
- lock wait time is emitted into the deploy summary JSON

### 8. Runtime env drift checker

`node scripts/devops/check-runtime-env-drift.mjs`

Compares:
- the exact staging Vercel runtime values required for login and API routing
- the exact shared Render backend runtime values required for staging/live auth stability
- required live Render auth secret presence with backup-secret awareness

Current live result:
- live staging Vercel envs are readable and match the frozen staging contract
- live Render envs are readable and are now repaired back to the shared-backend baseline when they drift

### 9. Staging env self-heal baseline + repair

`node scripts/devops/sync-staging-runtime-envs.mjs --component all`

This is the repo-controlled repair tool for the staging runtime contract. It:
- restores the exact staging Vercel env values from `scripts/devops/marketeq-staging-env-baseline.json`
- restores the shared Render backend runtime values needed for staging login and deploy safety
- rehydrates required Render auth secrets from n8n runtime backup env vars if they ever drift out

The live n8n orchestrator now runs the same repair logic before `dev-main -> staging` and `staging` promotions. If env repair cannot restore a safe auth/runtime state, the promotion fails before frontend deploy completion instead of silently shipping a broken staging login.

### 10. Staging rollback trigger

`node scripts/devops/rollback-staging.mjs --check`

Scans recent `staging` history for the most recent SHA with both:
- `Vercel – marketeq-projects-staging: success`
- `Smoke – marketeq-projects-staging: success`

`node scripts/devops/rollback-staging.mjs --apply --to-sha <sha>`

Triggers the live n8n orchestrator with `event=rollback`, which promotes the requested SHA onto `staging` and re-runs the staging deployment path.

## Known remaining gaps

1. A fully live rollback test still needs a known-good staging candidate SHA with both green Vercel and green Smoke histories.
2. The current shared backend auth route is still returning `502` in live smoke, which is an app/runtime issue that the new self-heal automation now detects and blocks instead of masking.

## Next recommended implementation order

1. Validate a live staging rollback against a known-good candidate once one exists or is deliberately selected.
2. Keep the staging auth smoke green after the current backend/login repair lands, then re-run a full `dev-main -> staging` promotion to confirm the self-heal + smoke gate path on a healthy backend.
