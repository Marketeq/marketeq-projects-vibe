# DevOps SOP — Marketeq Projects Vibe

> **Scope.** This document owns all deployment, branch topology, environment, and promotion rules for the Marketeq freelance marketplace repo. It is the authoritative source for how code moves from a developer's laptop to production. It is intentionally **separate** from `docs/CODE_REVIEW_SOP.md`, which owns pull-request review rules. Do not conflate the two.
>
> **Audience.** Developers, QA, the CTO, and any Claude Code session working on the repo.
>
> **Binding.** Every rule here is enforced by a GitHub Actions workflow, a Jenkins pipeline, a promotion script, a CODEOWNERS route, or a PR template check. Nothing in this doc is aspirational — if a rule is stated, there is machinery behind it.
>
> **CI/CD Split (2026-05-22):** Branch protection checks (PR gates) run on **GitHub Actions**. Post-deploy automation (deployments, smoke tests, staging sync, stale branch cleanup) runs on **Jenkins** (72.61.77.231:8080). Post-merge enforcement (SOP audit, login violation alerts) runs on **both** — GitHub Actions for immediate enforcement, Jenkins as a safety net. Old docs archived in `docs/md/Deployment (CI-CD)/old devops docs/`.

---

## 1. Branch model

| Branch | Role | Who writes here | Deploys to |
|---|---|---|---|
| `dev-main` | Active development. Default branch. All feature PRs target this. | Developers (via PR) | Vercel `marketeq-projects-dev` |
| `staging` | QA testing. Receives promoted commits from `dev-main`. Regression fixes go here directly. | QA (via promotion script) + Developers (via PR for regression fixes) | Vercel `marketeq-projects-staging` |
| `live-mvp` | Production. Receives promoted commits from `staging`. | CTO + QA (via promotion script) | Vercel `marketeq-projects-live-mvp` + Render `marketeq-backend` |

**Flow:** feature branch → PR → `dev-main` → QA promotes to `staging` → QA tests → promote to `live-mvp` → production.

**Regression fix flow:** QA finds bug on `staging` → developer creates `fix/*` branch from `staging` → PR targeting `staging` → merge → developer cherry-picks fix back to `dev-main` to keep branches in sync.

**Never:**
- Push directly to `dev-main`, `staging`, or `live-mvp` (all changes go through PRs or promotion scripts)
- Force-push any of the three protected branches
- Merge `dev-main` → `live-mvp` directly (must pass through `staging`)
- Rename any of the three branches (historical rename is locked in — `live-mvp` is the production branch name, not `main-live` or `live/mvp`)

---

## 2. Vercel topology

Three Vercel projects, all under the `marketeq-projects-vibe` GitHub repo, each wired to exactly one branch:

| Vercel project | Production branch | Hostname | Purpose |
|---|---|---|---|
| `marketeq-projects-dev` (`prj_IuUgufT5MaEY03bNmdb3lFcr51WC`) | `dev-main` | `dev-marketeq-projects.vercel.app` | Dev preview. Lets the team see work-in-progress frontend against the production Render backend. |
| `marketeq-projects-staging` (`prj_zxwZ4cEzY1kRsMbPst6nAoMWTxTG`) | `staging` | `staging-marketeq-projects.vercel.app` | QA testing environment. |
| `marketeq-projects-live-mvp` (`prj_vvtSNsNsVxyMteDejCo32rh2CEiD`) | `live-mvp` | `live-marketeq-projects.vercel.app` | Production. |

Each Vercel project has its own env var set in the Vercel dashboard, populated from the matching frozen env template (§5). **No Vercel project reads env from the repo `.env.*.example` files at runtime** — those files are templates for humans, not runtime config.

**Preview deploy policy:** preview deployments for feature branches (`feat/*`, `fix/*`, `chore/*`, `refactor/*`, `agent/*`) are **disabled** at the `frontend/vercel.json` level. Previews cost money, invite login regressions from env-mismatched code, and add noise to Vercel notifications. Stakeholder demos happen on `staging` after a promotion, not on ad-hoc preview URLs.

**Manual dashboard steps (one-time, after this PR lands):**
1. On each of the three Vercel projects, confirm the Production Branch matches the table above
2. On each of the three Vercel projects, disable preview deployments for all non-production branches
3. Populate env vars on each project from the matching `.env.*.example` template (with real secret values, not the placeholders in the templates)

---

## 3. Render topology

**One shared Render service.**

| Render service | ID | Branch (dashboard) | Deploy mechanism | Serves | URL |
|---|---|---|---|---|---|
| `marketeq-backend` | `srv-d76r48nafjfc73e1djf0` | `live-mvp` | n8n orchestrator API deploys | Vercel dev + Vercel staging + Vercel live | `https://marketeq-backend.onrender.com` |

### 3.1 How the shared backend deploys

All three Vercel projects point to the same Render backend. The Jenkins `staging-orchestrator` pipeline triggers Render API deploys with the specific commit SHA whenever backend files change on `dev-main` or `staging`. This keeps the shared backend current for all frontends without waiting for a `live-mvp` promotion.

The Render dashboard branch is set to `live-mvp` as a fallback for manual deploys, but normal operation uses the Jenkins orchestrator's API-driven deploys with explicit commit SHAs.

**Constraints (Render Starter plan — 512 MB RAM):**
- `boot-all.js` only starts services the API gateway actively proxies to (see `SERVICES` array)
- Each child process runs with `--max-old-space-size=20` to stay within memory limits
- `build-all-services.sh` builds one service at a time with `--max-old-space-size=384` during Docker build
- New services must be added to both `boot-all.js SERVICES` array and `proxy.service.ts` route map before they consume runtime memory

### 3.2 Vercel → Render mapping

| Vercel Project | Branch | Points to |
|---|---|---|
| `marketeq-projects-dev` | `dev-main` | `marketeq-backend` |
| `marketeq-projects-staging` | `staging` | `marketeq-backend` |
| `marketeq-projects-live-mvp` | `live-mvp` | `marketeq-backend` |

### 3.3 Database isolation

The shared Render backend uses the live backend database wiring on the Hostinger VPS (`72.61.77.231`). Local development keeps its own local-only stack.

| Database | Docker Project | Port | Used by |
|---|---|---|---|
| `supabase-live` | `supabase-live` | `5433` | Shared Render backend (`marketeq-backend`) |
| `supabase-dev` | `supabase-dev` | `5432` | Local development only |

### 3.4 Backwards-compatibility requirement

Backend changes must remain backwards-compatible. All three frontends (dev, staging, live) hit the same backend, so a backend deploy must not break any of them.

---

## 4. Local development

**The iron rule:** local development runs the backend locally. Local dev must never depend on a Render URL for login, auth, API calls, WebSockets, or anything else.

### 4.1 What "detached from Render" actually means

- The committed code and templates **must not** contain any `*.onrender.com` URL as a default for backend targets in local-dev code paths
- `frontend/.env.local.example` (the template devs copy to `.env.local`) has `NEXT_PUBLIC_BACKEND_URL=http://localhost:3002/api`
- No fallback logic in source code of the form `process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://marketeq-backend.onrender.com"`. A missing env var must throw, not silently point at Render
- No login, auth, or API client hardcodes a Render hostname

### 4.2 What devs are free to do on their own machines

A developer who wants to experiment by pointing their **personal** `.env.local` at the Render backend is not prevented from doing so — nothing on the server side can see inside their machine. But:

- `.env.local` is git-ignored and never committed
- Any code that encourages or enables that pattern gets caught by GitHub Actions `sop-check` workflow on the PR
- The developer is responsible for switching back to localhost before they open a PR — if they don't, their local tests pass but downstream devs' tests fail, and the PR check flags the hardcoded URL

### 4.3 Runtime guardrails (follow-up)

As a belt-and-suspenders layer on top of the PR check, the frontend dev server should assert at boot time:

```ts
if (process.env.NODE_ENV === 'development' && /onrender\.com/.test(process.env.NEXT_PUBLIC_BACKEND_URL ?? '')) {
  throw new Error('Local dev is trying to hit Render. Per DEVOPS_SOP §4, run the backend locally.')
}
```

This is tracked as a follow-up task — not in this enforcement epic because it requires touching frontend boot code, which is out of scope for a DevOps PR.

---

## 5. Environment templates

There are **three frozen env templates per app**, one per environment, each independent. They are named exactly:

| Frontend template | Backend template | Used for |
|---|---|---|
| `frontend/.env.local.example` | `backend/.env.local.example` | Local dev on `dev-main` or any feature branch |
| `frontend/.env.staging.example` | `backend/.env.staging.example` | Vercel `marketeq-projects-staging` against the shared Render backend |
| `frontend/.env.production.example` | `backend/.env.production.example` | Vercel `marketeq-projects-live-mvp` + Render `marketeq-backend` |

Each template owns a distinct set of values for:
- `NEXT_PUBLIC_BACKEND_URL` / `BACKEND_URL`
- `NEXT_PUBLIC_COOKIE_SAMESITE`, `NEXT_PUBLIC_COOKIE_SECURE`, `NEXT_PUBLIC_COOKIE_DOMAIN`
- `NEXT_PUBLIC_AUTH_MODE`
- `CORS_ORIGIN`, `JWT_ISSUER` (backend side)
- `NODE_ENV`

### 5.1 Frozen means frozen

A PR that modifies **any** of these six template files requires a four-point confirmation for the matching environment in the PR description. GitHub Actions `sop-check` workflow blocks the PR if the confirmation is missing.

**Local four-point confirmation** (required on any PR to `dev-main` that modifies `*.local.example` or any login-frozen file — see `CODE_REVIEW_SOP.md` §1.4):

1. `local dev login on the frontend still works against a fresh .env`
2. `backend JWT signing, verification, and guards are unchanged`
3. `manual QA was performed locally with a client account and a talent account`
4. `no credentials, keys, or secrets are committed in this PR`

**Staging four-point confirmation** (required on any PR targeting `staging` that modifies `*.staging.example`):

1. `staging login on Vercel staging still works against the production Render backend`
2. `staging cookie SameSite/Secure flags are unchanged`
3. `staging CORS origin allowlist is unchanged`
4. `manual QA was performed against the staging Vercel deployment with a client account and a talent account`

**Production four-point confirmation** (required on any PR targeting `live-mvp` that modifies `*.production.example`):

1. `production login on Vercel live still works against the production Render backend`
2. `production cookie SameSite/Secure flags are unchanged`
3. `production CORS origin allowlist is unchanged`
4. `manual QA was performed against the production Vercel deployment with a client account and a talent account`

### 5.2 Templates are branch-specific

- A PR modifying `*.local.example` must target `dev-main`
- A PR modifying `*.staging.example` must target `staging`
- A PR modifying `*.production.example` must target `live-mvp`

GitHub Actions `sop-check` workflow blocks branch/template mismatches. The three template pairs are independent: modifying the local template never affects staging or prod; modifying staging never affects local or prod. If a PR modifies more than one pair at once, block it and ask the author to split.

---

## 6. Env-driven login (no hardcoded values)

Login behavior differs across environments because of cookies (`SameSite`, `Secure`, `Domain`), CORS origin allowlists, backend URLs, and JWT verification. The recurring failure mode is: a developer "fixes" login by hardcoding a value that works in one environment and silently breaks the others.

**The rule:** login code reads every environment-specific value from `process.env.*`. There are **zero hardcoded URLs, cookie flag values, CORS origin strings, or JWT key material** in login source code.

**Scoped files** (enforced by GitHub Actions `sop-check` workflow):

- `frontend/app/sign-in/**`
- `frontend/app/sign-up/**`
- `frontend/contexts/auth.tsx`
- `frontend/src/lib/api/auth.ts`
- `frontend/middleware.ts`
- `backend/apps/auth-service/**`
- `backend/libs/shared/src/guards/**`
- `backend/libs/shared/src/decorators/**`

GitHub Actions `sop-check` workflow greps these paths for hardcoded `*.onrender.com`, hardcoded `SameSite:`, hardcoded `secure: true`, hardcoded `origin:` CORS strings, and hardcoded `localhost` fallbacks. Matches block the PR.

**Why this matters:** "fix login once, never again" is only possible if the code is environment-agnostic. The code reads env vars, the three template pairs own the per-environment values, and the four-point confirmations gate the templates. Break any link in that chain and you re-introduce the bug class.

---

## 7. QA promotion flow

QA's entire workflow is two scripts. QA never hand-edits any protected branch, never opens a PR targeting a protected branch, and never merges anything manually.

### 7.1 `scripts/devops/qa-promote-dev-to-staging.sh`

Run by QA (or CTO) when `dev-main` has accumulated a milestone worth testing.

**What it does:**

1. Preflight: clean working tree, `gh` authenticated, `origin` reachable
2. Fetches `origin`, verifies `dev-main` and `staging` exist
3. Shows the commits `dev-main` is ahead of `staging`
4. Prompts for explicit confirmation (type `PROMOTE TO STAGING`)
5. Checks out `staging`, merges `origin/dev-main` with the protected-file strategy:
   - `staging` wins on conflict for: `frontend/.env.staging.example`, `backend/.env.staging.example`, `frontend/.env.production.example`, `backend/.env.production.example`, `frontend/vercel.json`, `render.yaml`
   - `dev-main` wins for everything else
6. Runs `gitleaks` on the merged result. Aborts if secrets are found
7. Pushes `staging` to origin — triggers Vercel `marketeq-projects-staging` auto-deploy
8. Polls Vercel API for the resulting deployment until it reports `READY` or fails (10-min timeout)
9. Opens a GitHub issue labeled `qa-round` with: the promoted SHA, the Vercel staging URL, and the QA checklist for the critical user flows

**What it does NOT do:**

- Does not touch Render. Render is on `live-mvp` (§3) and is untouched by a staging promotion
- Does not deploy to production
- Does not delete branches
- Does not force-push

### 7.2 `scripts/devops/qa-promote-staging-to-live.sh`

Run by QA (or CTO) after QA has signed off on a staging build.

**What it does:**

1. Preflight + fetch
2. Verifies `staging` and `live-mvp` exist
3. Shows every commit being promoted
4. Requires typing `PROMOTE TO PRODUCTION` literally
5. Checks out `live-mvp`, merges `staging` with the protected-file strategy:
   - `live-mvp` wins on conflict for: `frontend/.env.production.example`, `backend/.env.production.example`, `frontend/vercel.json`, `render.yaml`
6. Runs `gitleaks`
7. Pushes `live-mvp` — triggers both Vercel `marketeq-projects-live-mvp` and Render `marketeq-backend` auto-deploys **in lockstep**
8. Polls Vercel **and** Render APIs for the resulting deployments until both report `READY` / `live` or fail (10-min timeout)
9. Creates an annotated git tag `release-YYYY-MM-DD-HHMM` and a GitHub Release listing every promoted commit

**What it does NOT do:**

- Does not touch `dev-main`
- Does not change Render branch configuration (that's a fixed-at-`live-mvp` invariant, not per-promotion state)
- Does not delete `staging` or any feature branches

---

## 8. Role separation

| Role | `dev-main` | `staging` | `live-mvp` | Promotion scripts |
|---|---|---|---|---|
| Developer | ✅ via PR | ✅ via PR (regression fixes only) | ❌ | ❌ |
| QA | ❌ | ✅ via script | ❌ (script only) | ✅ |
| CTO | ✅ all branches | ✅ all branches | ✅ all branches | ✅ |

**Enforcement:** CODEOWNERS routes reviews by directory, PR template has different required confirmations per target branch, and promotion scripts are the only approved path onto `staging` and `live-mvp`. Breaking role separation is caught by the GitHub Actions `post-merge-audit` workflow (with Jenkins as a safety net): a direct push to `staging` or `live-mvp` (no PR, no script) opens an urgent issue and tags the CTO within ~60 seconds of the push.

---

## 9. Failure modes

| Failure | Cause | Action |
|---|---|---|
| `qa-promote-dev-to-staging.sh` aborts on "working tree dirty" | QA has uncommitted local changes | Stash or discard |
| Merge conflicts outside protected files | Developer and QA touched the same non-protected file | Contact CTO; developer rebases their work |
| `gitleaks` detects a secret | A secret was committed on `dev-main` | **Do not push.** Reset staging, open an urgent issue, CTO fixes the leak on `dev-main` first |
| Vercel deploy fails after promotion push | Build error, env var missing, framework change | Script exits non-zero with the Vercel deployment URL; investigate there |
| Render deploy fails after `live-mvp` promotion | Build error, migration error, env var missing | Script exits non-zero with the Render deploy log URL; investigate there. Do **not** revert `live-mvp` until the root cause is understood — the commit may be fine and the cause may be Render infra |
| Post-merge audit auto-reverts a promotion | Required checks failed on the promoted commits | CTO reviews the revert PR; developer fixes the failing checks; re-promote |
| Someone force-pushes `dev-main`, `staging`, or `live-mvp` | Mistake or deliberate bypass | GitHub Actions `post-merge-audit` workflow (+ Jenkins safety net) opens an urgent issue within ~60 seconds; CTO investigates and, if needed, restores the previous SHA from the reflog |

---

## 10. Pointers

- Code review rules (seven-point checklist, block comment template, review prompt): `docs/CODE_REVIEW_SOP.md`
- Remediation backlog and implementation status: `docs/DEVOPS_REMEDIATION_PLAN.md`
- Automated PR gate checks (GitHub Actions): `sop-check`, `ai-breakage-check`, `gitleaks`, `code-review`, `login-gate`
- Post-merge enforcement (GitHub Actions + Jenkins safety net): `post-merge-audit`, `login-violation-alert`
- CODEOWNERS routing: `.github/CODEOWNERS`
- PR template: `.github/pull_request_template.md`
- Promotion scripts: `scripts/devops/qa-promote-dev-to-staging.sh`, `scripts/devops/qa-promote-staging-to-live.sh`
- DevOps control scripts: `scripts/devops/check-devops-drift.mjs`, `scripts/devops/check-runtime-env-drift.mjs`, `scripts/devops/sync-staging-runtime-envs.mjs`, `scripts/devops/sync-n8n-workflow.mjs`, `scripts/devops/publish-n8n-runner.mjs`, `scripts/devops/install-n8n-runtime-secrets.mjs`, `scripts/devops/rollback-staging.mjs`, `scripts/devops/marketeq-devops.config.json`, `scripts/devops/marketeq-staging-env-baseline.json`
- Env templates: `frontend/.env.{local,staging,production}.example`, `backend/.env.{local,staging,production}.example`

---

## 11. Revision log

| Date | Change |
|---|---|
| 2026-04-11 | Initial document. Split from `docs/CODE_REVIEW_SOP.md` at CTO request — devops concerns belong here, code review concerns stay in the review SOP. Branch names locked to `dev-main` / `staging` / `live-mvp` (real names on origin). §3 CTO call: Render on `live-mvp` with auto-deploy on, one service, all three Vercel projects hit it. §1.11 "dev-main not on Vercel" rule from the review SOP is deleted — dev-main legitimately deploys to `marketeq-projects-dev`, the bug was hardcoded login values not the Vercel coupling itself. |
| 2026-05-22 | CI/CD split: PR gate checks (`sop-check`, `ai-breakage-check`, `gitleaks`, `code-review`, `login-gate`) run on **GitHub Actions**. Post-merge enforcement (`post-merge-audit`, `login-violation-alert`) runs on **both** GitHub Actions and Jenkins. Post-deploy automation (deployments, smoke tests, staging sync, stale branch cleanup) runs on **Jenkins** (72.61.77.231:8080). n8n DevOps workflows deactivated. Old docs archived to `docs/md/Deployment (CI-CD)/old devops docs/`. |
