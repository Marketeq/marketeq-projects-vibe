# CI/CD Architecture Overview — Jenkins + Vercel + Render

> **Effective:** 2026-05-22
> **Supersedes:** All docs in `old devops docs/` (GitHub Actions + Heroku era)

---

## Tooling Summary

| Layer | Tool | Purpose |
|---|---|---|
| Source Control | GitHub | Code versioning, webhooks to Jenkins |
| CI/CD Runner | Jenkins (self-hosted) | All 12 pipelines — SOP checks, AI review, deploys |
| Frontend Deployment | Vercel | Next.js deployment (3 projects, 3 branches) |
| Backend Deployment | Render | NestJS monorepo (single container) |
| Realtime | Ably | WebSocket messaging |
| DNS | Cloudflare | DNS for marketeqdigital.com |

---

## Jenkins Server

| Property | Value |
|---|---|
| URL | http://72.61.77.231:8080 |
| Host | Hostinger KVM 2 (srv1190822) |
| Container | Docker `jenkins` (1GB memory cap) |
| Pipeline files | `/var/jenkins_home/pipelines/` |
| Installed tools | git, curl, jq, python3, gh CLI 2.92.0, Node.js 20, gitleaks 8.18.4 |

### Credentials stored in Jenkins

| ID | Purpose |
|---|---|
| `github-token` | GitHub API (also `github-pat`) |
| `vercel-token` | Vercel API |
| `render-api-key` | Render API |
| `n8n-api-key` | n8n API |
| `anthropic-api-key` | Claude AI for code review + breakage detection |
| `hostinger-api-token` | Hostinger VPS API |

### GitHub Webhook

- Webhook URL: `http://72.61.77.231:8080/github-webhook/`
- Events: `push`, `pull_request`, `pull_request_review`
- Triggers Jenkins pipelines automatically on PR and push events

---

## 12 Jenkins Pipelines

### PR Pipelines (triggered on pull_request events)

| # | Pipeline | What it does |
|---|---|---|
| 1 | **sop-check** | 15+ mechanical SOP checks: secrets, junk files, login-frozen files, env template mismatches, hardcoded values, entity without migration, oversized PRs, `@ts-ignore` without justification. Posts consolidated violation comment. |
| 2 | **ai-breakage-check** | Claude Sonnet regression detector. Extracts changed symbols + callers, sends to Claude for semantic analysis. Verdicts: SAFE / RISKY / BLOCK. Posts analysis as PR comment. |
| 3 | **code-review** | AI code review via Claude Sonnet. Reviews diff for security issues, bugs, standards, breaking changes. Posts review as PR comment. |
| 4 | **gitleaks** | Secret scanning via gitleaks. Blocks PRs with committed secrets. |
| 5 | **login-gate** | Blocks PRs touching login files unless CTorres9800 has approved. Auto-labels `login-touched`, auto-requests CTO review. |

### Post-Merge Pipelines (triggered on push events to protected branches)

| # | Pipeline | What it does |
|---|---|---|
| 6 | **login-violation-alert** | Detects login file changes merged without approval, creates urgent issue. |
| 7 | **post-merge-audit** | Verifies required checks passed on the merged PR. If checks were bypassed, auto-creates a revert branch + PR. Detects force pushes and direct pushes without PRs. |

### Deploy Pipelines

| # | Pipeline | What it does |
|---|---|---|
| 8 | **stale-branch-cleanup** | Weekly (Monday 14:00 UTC) stale branch report. Creates issue listing branches with no activity. |
| 9 | **sync-dev-main-to-staging** | Force-syncs dev-main to staging branch. Manual trigger. |
| 10 | **vercel-deploy** | Triggers Vercel deployment for a given branch/commit. Handles public/private repo visibility toggle. Polls until deployment is READY. |
| 11 | **staging-orchestrator** | Full deploy orchestrator: syncs branches, triggers Vercel deploy, triggers Render deploy, runs smoke tests. |
| 12 | **infra-health-check** | Hourly health check: GitHub API, Vercel API, Render API, Anthropic API, repo clone test, CLI tools, frontend URLs, backend health endpoint. |

---

## Deployment Topology

### Frontend (Vercel)

| Vercel Project | Branch | URL |
|---|---|---|
| `marketeq-projects-dev` | `dev-main` | dev-marketeq-projects.vercel.app |
| `marketeq-projects-staging` | `staging` | staging-marketeq-projects.vercel.app |
| `marketeq-projects-live-mvp` | `live-mvp` | live-marketeq-projects.vercel.app |

### Backend (Render)

| Service | Branch | URL |
|---|---|---|
| `marketeq-backend` | `live-mvp` | marketeq-backend.onrender.com |

All three Vercel frontends point to the same Render backend.

### Database

| Database | Host | Port | Used by |
|---|---|---|---|
| `supabase-live` | Hostinger VPS (72.61.77.231) | 5433 | Render backend |
| `supabase-dev` | Hostinger VPS (72.61.77.231) | 5432 | Local development |

---

## Branch Model

| Branch | Role | Deploys to |
|---|---|---|
| `dev-main` | Active development (default branch) | Vercel dev |
| `staging` | QA testing + regression fixes | Vercel staging |
| `live-mvp` | Production | Vercel live + Render backend |

**Flow:** feature branch -> PR -> `dev-main` -> promote to `staging` -> QA tests -> promote to `live-mvp`

**Regression fix flow:** QA finds bug on staging -> developer branches `fix/*` from `staging` -> PR targeting `staging` -> merge -> cherry-pick back to `dev-main`

---

## What Changed from the Old Setup

| Before (GitHub Actions + n8n) | After (Jenkins) |
|---|---|
| 10 GitHub Actions workflows | All disabled (not deleted). CodeQL remains active. |
| n8n staging orchestrator + probes | 5 DevOps workflows deactivated in n8n |
| GitHub Actions as CI runner | Jenkins self-hosted on Hostinger KVM 2 |
| Heroku for backend (legacy) | Render for backend |
| SonarCloud / Zencoder for code review | Claude Sonnet via Anthropic API |
| Separate workflow files in `.github/workflows/` | Groovy pipelines in `/var/jenkins_home/pipelines/` |

---

## Reloading Pipelines

Edit files in `/var/jenkins_home/pipelines/`, then reload via Jenkins Groovy console:

```groovy
def job = Jenkins.instance.getItem("job-name")
job.setDefinition(new CpsFlowDefinition(new File("/var/jenkins_home/pipelines/filename.groovy").text, true))
job.save()
```

---

## Related Docs

- `docs/DEVOPS_SOP.md` — branch rules, env templates, promotion flow, role separation
- `docs/CODE_REVIEW_SOP.md` — PR review rules, seven-point checklist, merge procedure
- Old docs archived in `old devops docs/` subfolder (GitHub Actions + Heroku + Zencoder era)
