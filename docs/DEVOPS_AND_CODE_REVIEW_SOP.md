# Marketeq Projects — DevOps & Code Review SOP

**Owner:** @CTorres9800 (CTO)
**Last updated:** 2026-04-14
**Applies to:** Every developer, QA engineer, Claude Code session, and CI workflow in this repository.

This is the single source of truth for how code moves from a developer's laptop to production. It consolidates branch management, code review, GitHub Actions enforcement, environment management, and deployment promotion into one document.

> **Binding.** Every rule here is enforced by a GitHub Action, a promotion script, a CODEOWNERS route, or a repo-level setting. Nothing is aspirational — if a rule is stated, there is machinery behind it.

---

## Table of Contents

1. [Branch Model](#1-branch-model)
2. [Repository Settings (Server-Enforced)](#2-repository-settings-server-enforced)
3. [Developer Workflow: Local → dev-main](#3-developer-workflow-local--dev-main)
4. [Code Review Process](#4-code-review-process)
5. [GitHub Actions — Automated Enforcement](#5-github-actions--automated-enforcement)
6. [CODEOWNERS & Auto-Routing](#6-codeowners--auto-routing)
7. [Environment Templates](#7-environment-templates)
8. [Vercel Topology](#8-vercel-topology)
9. [Render Topology](#9-render-topology)
10. [QA Promotion: dev-main → staging → live-mvp](#10-qa-promotion-dev-main--staging--live-mvp)
11. [Role Separation](#11-role-separation)
12. [Non-Negotiable Rules](#12-non-negotiable-rules)
13. [Known Historical Bugs](#13-known-historical-bugs)
14. [Failure Modes & Recovery](#14-failure-modes--recovery)
15. [File Reference](#15-file-reference)
16. [Revision Log](#16-revision-log)

---

## 1. Branch Model

```
feature branch → PR → dev-main → QA promotes → staging → QA promotes → live-mvp
```

| Branch | Role | Who writes | Deploys to |
|---|---|---|---|
| `dev-main` | Active development. Default branch. All feature PRs target this. | Developers (via PR) | Vercel `marketeq-projects-dev` |
| `staging` | QA testing. Receives promoted commits from `dev-main`. | QA (via promotion script only) | Vercel `marketeq-projects-staging` |
| `live-mvp` | Production. Receives promoted commits from `staging`. | CTO + QA (via promotion script only) | Vercel `marketeq-projects-live-mvp` + Render `marketeq-backend` |

### Branch Rules

- **Never** push directly to `dev-main`, `staging`, or `live-mvp` — all changes go through PRs or promotion scripts
- **Never** force-push any of the three protected branches
- **Never** merge `dev-main` → `live-mvp` directly — must pass through `staging`
- **Never** rename any of the three branches
- Feature branches use naming convention: `feat/<name>`, `fix/<name>`, `chore/<name>`, `refactor/<name>`

### GitHub Branch Protection Status

The repo is on the **free GitHub org plan**. Classic branch protection, rulesets, and native push protection all require GitHub Team or GHAS. Therefore:

- Pre-merge blocking on failing status checks: **NOT available** (enforced post-hoc by `post-merge-audit.yml`)
- Server-side force-push prevention: **NOT available** (detected post-hoc by `post-merge-audit.yml`)
- Required code-owner reviews: **NOT available server-side** (enforced by SOP convention)
- Required conversation resolution: **NOT available**

All protections are enforced via CI checks + post-merge audit + reviewer discipline instead.

---

## 2. Repository Settings (Server-Enforced)

These are configured at the GitHub repo level and cannot be bypassed without admin access:

| Setting | Value | Effect |
|---|---|---|
| `allow_merge_commit` | `false` | Merge commits disabled — option hidden in UI |
| `allow_rebase_merge` | `false` | Rebase merges disabled |
| `allow_squash_merge` | `true` | **Squash merge is the only allowed merge type** |
| `delete_branch_on_merge` | `true` | Merged branches auto-delete |
| `default_branch` | `dev-main` | All PRs default to targeting `dev-main` |
| `visibility` | `private` | Repo is private (temporarily public only for Vercel free-tier deploys) |

---

## 3. Developer Workflow: Local → dev-main

### 3.1 Starting Work

```bash
git checkout dev-main
git pull origin dev-main
git checkout -b feat/my-feature    # or fix/, chore/, refactor/
```

### 3.2 Local Development Rules

- **Run the backend locally.** Local dev must never depend on a Render URL.
- `frontend/.env.local.example` has `NEXT_PUBLIC_BACKEND_URL=http://localhost:3002/api`
- No fallback logic like `process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://marketeq-backend.onrender.com"` — a missing env var must throw, not silently point at Render
- `.env.local` is git-ignored and never committed
- Limit Node heap to prevent OOM crashes (the dev machine has crashed three times)

### 3.3 Opening a PR

```bash
git push -u origin feat/my-feature
gh pr create --base dev-main --title "feat: description" --body "$(cat <<'EOF'
<fill in PR template>
EOF
)"
```

The PR template (`.github/pull_request_template.md`) is **mandatory**. It includes:
- Summary and linked issues
- Breaking-change analysis (list every changed exported symbol and verified callers)
- Migration status (entity changes require migration files)
- QA performed (specific flows tested)
- Off-limits confirmations (profile loading, login files — see §12)
- Reviewer checklist

### 3.4 What Happens After You Open a PR

Four automated checks run immediately:

1. **Enforce Code Review SOP** (`sop-check.yml`) — mechanical SOP checks
2. **Regression risk analysis** (`ai-breakage-check.yml`) — AI-powered regression detection
3. **Scan for committed secrets** (`gitleaks.yml`) — secret scanning
4. **CODEOWNERS review** — auto-requests reviewers based on files touched

All four must pass before merge. See §5 for details on each.

### 3.5 Merging

Only one approved merge command:

```bash
gh pr merge <NUMBER> --squash --delete-branch
```

**Never:**
- `--admin` (bypasses checks)
- `--merge` (pollutes history — disabled server-side anyway)
- `--rebase` without user approval (disabled server-side anyway)
- `--no-verify`

After merge, verify:
```bash
gh pr view <NUMBER> --json state,mergedAt,mergeCommit
# Must show: "state": "MERGED", non-null mergedAt
```

---

## 4. Code Review Process

### 4.1 Review Inputs (gather before starting)

For every PR, collect in this order:

1. **PR metadata:** `gh pr view N --json mergeable,mergeStateStatus,headRefName,baseRefName,title,state,author,body,files`
2. **Full diff:** `gh pr diff N > /tmp/prN.diff` — read it completely
3. **Existing file contents:** read the current `dev-main` version of every modified file BEFORE reading the diff
4. **Related files:** for every changed component/function, read every file that imports it
5. **Commit history:** `gh pr view N --json commits`

### 4.2 Seven-Point Review Checklist

Every PR must pass all seven. A single fail blocks the merge.

#### 1. Security
- No committed secrets (PEM keys, .env files, API keys, tokens)
- No `undefined === undefined` auth bypass bugs (see §13.1)
- No SQL injection, XSS, or command injection
- JWT guards present on all new endpoints
- No `origin: "*"` CORS on authenticated endpoints

#### 2. Off-Limits Files
- Profile loading files touched → require four-point confirmation (§12.3)
- Login frozen files touched → require four-point confirmation (§12.4)
- If confirmation missing → **block**

#### 3. Breaking-Change Analysis
- Changed function signatures, API shapes, DTOs, entity columns → verify every caller
- Removed files, exports, or props → search repo for references
- Renamed anything → confirm all imports updated
- Touched shared component → read every consumer
- **Existing bug fixes must survive rewrites verbatim**

#### 4. Repo Conventions
- No root-level `package.json` or lockfiles (monorepo layout)
- Entity changes ship with migration files (`synchronize: false`)
- DTOs use `class-validator` decorators
- Inter-service communication via RabbitMQ only
- Storage via `R2Service` in `StorageModule`
- No TODO stubs or empty method bodies
- No `.DS_Store`, `build/`, `dist/`, `node_modules/`

#### 5. Standards (TypeScript + NestJS + Next.js)
- No new `any` types, no `@ts-ignore` without justification
- Error handling uses NestJS exceptions (`NotFoundException`, etc.)
- Correct `useEffect` dependency arrays
- Correct Next.js route group placement

#### 6. Merge Status
- `mergeable: MERGEABLE` (not `CONFLICTING`)
- Branch not >10 commits behind `dev-main` (request rebase if so)

#### 7. Memory & Performance
- No infinite loops, unbounded queries, heap-explosion risks

### 4.3 Decision Matrix

| Result | Action |
|---|---|
| All 7 pass, `MERGEABLE`, no off-limits concerns | **Merge** |
| 1+ checklist points fail | **Block** with detailed comment |
| `CONFLICTING` / `DIRTY` | **Block**, request rebase |
| Off-limits files without confirmation | **Block**, request confirmation |
| Feature work clearly incomplete | **Block**, request completion |
| Author marked `[DO NOT MERGE]` or draft | **Do not merge** |

**Default posture:** when in doubt, block.

### 4.4 Block Comment Format

Post a single consolidated comment listing every blocker:

```bash
gh pr comment <NUMBER> --body "$(cat <<'EOF'
## ⛔ Cannot be merged — detailed blocker list

### 1. <emoji> <BLOCKER TITLE>
<explanation>

**Why this is a block:**
- <bullet>

**Required action:**
1. <step>

---

### How to unblock this work
1. <step>

🤖 Posted by Claude Code on behalf of @CTorres9800
EOF
)"
```

**Severity emojis:** 🔒 Security | 📦 Repo conventions | ⚠️ Off-limits file | 🧩 Missing migration | 🔀 Merge conflict | 🐛 Logic bug | 🔥 Breaking change | 🧪 Missing test

---

## 5. GitHub Actions — Automated Enforcement

### 5.1 `sop-check.yml` — Mechanical SOP Checker (BLOCKING)

**Triggers:** Every PR (opened, synchronize, reopened, edited)

**Checks performed:**
| Check | What it catches |
|---|---|
| Secrets in diff | PEM headers, `.env` files, key material |
| Root-level pollution | `package.json`, lockfiles in repo root |
| Profile files without confirmation | Off-limits profile files touched without four-point confirmation |
| Login files without confirmation | Off-limits login files touched without four-point confirmation |
| Hardcoded env values in login code | `*.onrender.com`, hardcoded `SameSite:`, `secure: true`, CORS origins, `localhost` fallbacks in frozen files |
| Entity without migration | TypeORM entity changes with no migration file |
| Junk files | `.DS_Store`, `dist/`, `node_modules/`, `.next/` |
| Raw `throw new Error()` | Backend code not using NestJS exceptions |
| Bypass flags | `--no-verify`, `gh pr merge --admin` in scripts |
| Oversized PRs | >2000 lines without `[EPIC]` prefix |
| Env template mismatch | `*.local.example` on non-`dev-main` branch, `*.staging.example` on non-`staging` branch, etc. |
| Unjustified `@ts-ignore` | Missing `-- justification` comment |

**On login files touched:** auto-labels PR `login-touched`, posts sentinel comment, auto-requests @CTorres9800.

### 5.2 `ai-breakage-check.yml` — AI Regression Detector (BLOCKING)

**Triggers:** Every PR (opened, synchronize, reopened)

**How it works:**
1. Extracts the full diff (80KB cap)
2. Identifies all changed `.ts`/`.tsx` files
3. Extracts every exported symbol from the BASE (pre-PR) version of each file
4. Greps the repo for callers of those symbols (up to 40 caller files, 200 lines each)
5. Sends diff + symbol list + caller snippets to Claude Sonnet 4.6

**Claude's analysis checks for:**
- Changed signatures/prop types/return types that break callers
- Removed/renamed/inlined exported symbols callers still reference
- Rewrites that lose safety checks, null guards, or bug fixes
- Profile loading logic touched without confirmation
- Login code with hardcoded env values or missing confirmation
- Onboarding changes that lose validation/error states
- CSS/Tailwind changes breaking shared components

**Verdicts:**
| Verdict | Effect |
|---|---|
| `SAFE` | Check passes |
| `RISKY — NEEDS MANUAL VERIFICATION` | Check passes with warning comment |
| `BLOCK — LIKELY REGRESSION` | **Check fails** |

### 5.3 `gitleaks.yml` — Secret Scanning (BLOCKING)

**Triggers:** Every PR + push to `dev-main`/`staging`/`live-mvp`
**Config:** `.gitleaks.toml` (extends default ruleset + PEM private-key and `.env` file rules)
**Effect:** Fails check if any committed secret is detected. **Merge is blocked.**

### 5.4 `code-review.yml` — AI Code Review (ADVISORY)

**Triggers:** PRs targeting `staging` or `live-mvp` only
**Effect:** Posts AI-generated review comment using Claude Sonnet 4.6 covering security, bugs, standards, and breaking changes. Informational only — does not block.

### 5.5 `post-merge-audit.yml` — Post-Merge SOP Audit (POST-HOC BLOCKING)

**Triggers:** Push to `dev-main`/`staging`/`live-mvp` (fires after merge)

This is the **keystone enforcement** on the free plan. Since GitHub can't technically block a merge on failing checks, this catches bypasses after the fact.

**What it detects:**
| Condition | Action |
|---|---|
| Force push to protected branch | Opens urgent issue, assigns @CTorres9800 |
| Direct push with no PR | Opens urgent issue, assigns @CTorres9800 |
| Merge despite failing required checks | Creates revert branch, opens `[SOP AUTO-REVERT]` PR, assigns @CTorres9800 |

**Required checks it validates:**
- `Enforce Code Review SOP` (sop-check.yml)
- `Regression risk analysis` (ai-breakage-check.yml)
- `Scan for committed secrets` (gitleaks.yml)

A bypass survives only ~60–120 seconds before it is auto-reverted and publicly flagged.

### 5.6 `sync-dev-main-to-staging.yml` — Auto-Sync (AUTOMATED)

**Triggers:** Push to `dev-main`
**Effect:** Force-resets `staging` to match `dev-main`, pushes to origin. Keeps staging always in sync with dev-main.

### 5.7 `vercel-deploy.yml` — Frontend Deploy (AUTOMATED)

**Triggers:** Push to `dev-main`/`staging`/`live-mvp` with `frontend/**` changes
**Effect:** Temporarily makes repo public (Vercel free-tier workaround), waits for Vercel deploy to reach `READY`, then makes repo private again. 10-minute timeout.

### 5.8 `stale-branch-cleanup.yml` — Weekly Stale Branch Audit (AUTOMATED)

**Triggers:** Every Monday 14:00 UTC + manual dispatch
**Effect:** Finds branches >30 days old (excluding protected branches), opens GitHub issue with cleanup list.

---

## 6. CODEOWNERS & Auto-Routing

**File:** `.github/CODEOWNERS`

Every PR automatically requests review from the owner(s) of every directory it touches. Reviews are advisory (free plan limitation) but **mandatory by SOP convention**.

### Critical Path Routing (→ @CTorres9800 + @Marketeq/code-review)

| Path | Why it's critical |
|---|---|
| `frontend/app/sign-in/`, `frontend/app/sign-up/` | Login flow |
| `frontend/contexts/auth.tsx` | Auth state management |
| `frontend/src/lib/api/auth.ts` | Auth API client |
| `backend/apps/auth-service/` | Backend auth |
| `backend/libs/shared/src/guards/`, `decorators/` | Auth guards |
| `frontend/app/(group)/(group)/talent-profile/` | Profile loading (sacred) |
| `frontend/app/(group)/(group)/client-profile/` | Profile loading (sacred) |
| `frontend/components/edit-profile-modals.tsx` | Profile editing |
| `frontend/app/(group)/onboarding/` | Onboarding funnel |
| `frontend/app/publish-project/` | Publish flow |
| `frontend/app/top-most-header.tsx`, `layout.tsx` | Top-level layout |
| `frontend/middleware.ts` | Route middleware |
| `.github/`, `render.yaml`, `vercel.json` | Infrastructure |
| All 6 `.env.*.example` files | Environment templates |
| `docs/CODE_REVIEW_SOP.md`, `docs/DEVOPS_SOP.md` | SOP docs |

### Everything Else (→ @Marketeq/code-review)

All backend services, shared UI components, and other frontend files.

---

## 7. Environment Templates

Three frozen env templates per app, one per environment:

| Frontend Template | Backend Template | Environment |
|---|---|---|
| `frontend/.env.local.example` | `backend/.env.local.example` | Local dev (`dev-main` or feature branch) |
| `frontend/.env.staging.example` | `backend/.env.staging.example` | Vercel staging |
| `frontend/.env.production.example` | `backend/.env.production.example` | Vercel live + Render |

### Frozen Means Frozen

Any PR modifying a template requires the matching four-point confirmation:

**Local (PRs to `dev-main`):**
1. local dev login on the frontend still works against a fresh .env
2. backend JWT signing, verification, and guards are unchanged
3. manual QA was performed locally with a client account and a talent account
4. no credentials, keys, or secrets are committed in this PR

**Staging (PRs to `staging`):**
1. staging login on Vercel staging still works against the production Render backend
2. staging cookie SameSite/Secure flags are unchanged
3. staging CORS origin allowlist is unchanged
4. manual QA was performed against the staging Vercel deployment

**Production (PRs to `live-mvp`):**
1. production login on Vercel live still works against the production Render backend
2. production cookie SameSite/Secure flags are unchanged
3. production CORS origin allowlist are unchanged
4. manual QA was performed against the production Vercel deployment

### Branch-Template Rules

- `*.local.example` → only modified on PRs targeting `dev-main`
- `*.staging.example` → only modified on PRs targeting `staging`
- `*.production.example` → only modified on PRs targeting `live-mvp`

`sop-check.yml` blocks branch/template mismatches automatically.

---

## 8. Vercel Topology

Three Vercel projects, each wired to exactly one branch:

| Vercel Project | Branch | Hostname |
|---|---|---|
| `marketeq-projects-dev` | `dev-main` | `dev-marketeq-projects.vercel.app` |
| `marketeq-projects-staging` | `staging` | `staging-marketeq-projects.vercel.app` |
| `marketeq-projects-live-mvp` | `live-mvp` | `live-marketeq-projects.vercel.app` |

**Preview deploys are disabled** for feature branches (`feat/*`, `fix/*`, `chore/*`, `refactor/*`, `agent/*`) via `frontend/vercel.json`. Only the three production branches auto-deploy.

Each project has its own env vars in the Vercel dashboard, populated from the matching frozen template (§7). Templates are for humans — Vercel reads its own dashboard config at runtime.

---

## 9. Render Topology

**One shared Render service:**

| Service | ID | Branch | Auto-deploy | Serves | URL |
|---|---|---|---|---|---|
| `marketeq-backend` | `srv-d76r48nafjfc73e1djf0` | `live-mvp` | yes | Vercel dev + Vercel staging + Vercel live | `https://marketeq-backend.onrender.com` |

### Why One Service

Local development runs the backend locally, `dev-main` does not deploy to Render, and `staging` is a frontend promotion environment rather than a second backend fleet. Keeping one shared Render backend matches the intended release model and avoids drift between two backend services.

### Vercel → Render Mapping

| Vercel Project | Vercel Branch | Points to Render service |
|---|---|---|
| `marketeq-projects-dev` | `dev-main` | `marketeq-backend` |
| `marketeq-projects-staging` | `staging` | `marketeq-backend` |
| `marketeq-projects-live-mvp` | `live-mvp` | `marketeq-backend` |

### Promotion Flow

1. Code merges to `dev-main`
2. `staging` is promoted for QA frontend testing against the shared backend
3. QA promotes `staging` → `live-mvp`
4. `live-mvp` triggers the shared Render backend deploy

### Database Isolation

The shared Render backend points at the live backend database on the Hostinger VPS (`72.61.77.231`), while local development keeps its own local-only database:

| Database | Docker Project | Port | Used by |
|---|---|---|---|
| `supabase-live` | `supabase-live` | `5433` | Shared Render backend (`marketeq-backend`) |
| `supabase-dev` | `supabase-dev` | `5432` | Local development only |

### Backwards-Compatibility Requirement

Backend changes must remain backwards-compatible. During the promotion window, the live Vercel frontend (old code) briefly hits the live Render backend (newly promoted code). This window is seconds long and the backwards-compatibility rule ensures no breakage.

---

## 10. QA Promotion: dev-main → staging → live-mvp

QA's entire workflow is two scripts. QA never hand-edits any protected branch, never opens a PR targeting a protected branch, and never merges anything manually.

### 10.1 Promote dev-main → staging

**Script:** `scripts/devops/qa-promote-dev-to-staging.sh`

```bash
./scripts/devops/qa-promote-dev-to-staging.sh        # run promotion
./scripts/devops/qa-promote-dev-to-staging.sh --dry-run  # preview only
```

**What it does (step by step):**

1. **Preflight** — verify clean working tree, `gh` authenticated, `origin` reachable
2. **Fetch** — `git fetch origin --prune`
3. **Verify** — both `origin/dev-main` and `origin/staging` exist
4. **Show commits** — display what's being promoted
5. **Merge** — checkout `staging`, merge `origin/dev-main` with protected-file strategy:
   - **staging wins** on conflict for: `frontend/.env.staging.example`, `backend/.env.staging.example`, `frontend/.env.production.example`, `backend/.env.production.example`, `frontend/vercel.json`, `render.yaml`
   - **dev-main wins** for everything else
6. **Secret scan** — run `gitleaks` on merged result. **Hard fail if secrets found** → reset to `origin/staging`
7. **Push** — `git push origin staging` → triggers Vercel `marketeq-projects-staging` auto-deploy
8. **Poll** — poll Vercel API until deployment reports `READY` or fails (10-min timeout)
9. **Open issue** — create GitHub issue labeled `qa-round` with promoted SHA, Vercel staging URL, and QA checklist

**Does NOT:** touch Render, deploy to production, delete branches, force-push.

### 10.2 Promote staging → live-mvp (PRODUCTION)

**Script:** `scripts/devops/qa-promote-staging-to-live.sh`

```bash
./scripts/devops/qa-promote-staging-to-live.sh        # run promotion
./scripts/devops/qa-promote-staging-to-live.sh --dry-run  # preview only
```

**What it does (step by step):**

1. **Preflight** — same as above
2. **Show commits** — display what's being promoted
3. **Explicit confirmation** — user must type exactly `PROMOTE TO PRODUCTION` or abort
4. **Merge** — checkout `live-mvp`, merge `origin/staging` with protected-file strategy:
   - **live-mvp wins** on conflict for: `frontend/.env.production.example`, `backend/.env.production.example`, `frontend/vercel.json`, `render.yaml`
5. **Secret scan** — `gitleaks` with hard fail
6. **Push** — `git push origin live-mvp` → triggers BOTH Vercel `marketeq-projects-live-mvp` AND Render `marketeq-backend` auto-deploys **in lockstep**
7. **Poll** — poll both Vercel AND Render APIs until both report ready (10-min timeout)
8. **Tag** — create annotated git tag `release-YYYY-MM-DD-HHMM`
9. **GitHub Release** — create release listing every promoted commit

**Does NOT:** touch `dev-main`, change Render branch configuration, delete `staging`.

---

## 11. Role Separation

| Role | `dev-main` | `staging` | `live-mvp` | Promotion scripts |
|---|---|---|---|---|
| Developer | via PR | no | no | no |
| QA | no | via script | no (script only) | yes |
| CTO | all branches | all branches | all branches | yes |

A direct push to `staging` or `live-mvp` (no PR, no script) opens an urgent issue and tags the CTO within ~60 seconds.

---

## 12. Non-Negotiable Rules

### 12.1 Never Override Existing Working Code
- Preserve every bug fix — if a PR rewrites a file containing a fix, the fix must survive verbatim
- No reverts, rollbacks, or replacing working code — fix forward only
- Additive merges only when syncing from `marketeq-projects-nestjs`

### 12.2 Read ALL Code Before Approving
- Read every line of every file the PR touches, not just diff hunks
- Understand how touched code is used elsewhere
- New features must never break existing working features

### 12.3 Off-Limits: Profile Data Loading
These files are sacred. Any PR touching them requires all four confirmations in the PR description:

**Files:** `talent-profile/page.tsx`, `client-profile/page.tsx`, `edit-profile-modals.tsx`, `auth.tsx` loading logic, `src/lib/api/user.ts`

**Required confirmations:**
1. No API call shapes in the profile data-loading path were changed
2. `useEffect` ordering around the profile fetch was not modified
3. Loading spinner / fallback states still work for slow-network and error cases
4. Manual QA was performed against the live backend on a real talent and client profile

### 12.4 Off-Limits: Login Files are FROZEN
Once local login works, no PR changes the login path without CTO sign-off.

**Frozen files:** `sign-in/**`, `sign-up/**`, `contexts/auth.tsx`, `src/lib/api/auth.ts`, `middleware.ts`, `auth-service/**`, shared `guards/**`, `decorators/**`, all 6 env templates

**The bidirectional invariant:**
> If login works locally, a PR must not break login on dev / staging / live.
> If login works on dev / staging / live, a PR must not break login locally.
> "Fixing" login in one environment by hardcoding a value is **the bug**, not the fix.

**No hardcoded env values** in login code — no literal `*.onrender.com` URLs, `sameSite:`, `secure:`, CORS origins, or JWT secrets. All values from `process.env.*`.

### 12.5 Incremental Changes Only
No mega-PRs mixing unrelated concerns. If a PR contains unrelated changes, request a split.

### 12.6 Repo Must Stay Private
Temporarily public only for Vercel free-tier deploy workarounds by the CTO.

### 12.7 Never Silently Switch Branches
After pushing, stay on that branch until the user acknowledges.

### 12.8 Always Verify Before Declaring Done
"Merged" means squash-merge landed, branch deleted, and `gh pr view` returns `"MERGED"`.

---

## 13. Known Historical Bugs

Every reviewer must watch for these — they are bugs we have actually hit.

| # | Bug | What happened | What to watch for |
|---|---|---|---|
| 13.1 | Open-auth via `undefined === undefined` | `CMS_API_KEY` unset made reconcile-categories fully open | Any env var comparison without `?? '__UNSET__'` fallback |
| 13.2 | Committed private keys | RSA 2048 keypair committed to feature branch (PR #37) | `.pem`, `.key` files; gitleaks catches this now |
| 13.3 | Render-prop children crash | `FavoriteRoot` expects function child, got element | Render-prop components invoked with function child |
| 13.4 | CategorySidebar import alias | `sidebar.tsx` exports `Sidebar` not `CategorySidebar` | Import aliases matching actual export names |
| 13.5 | Save-and-exit without persistence | "Save & Exit" button wired to `<DialogClose>` with no `onClick` | Save flows must write to localStorage/backend before navigating |
| 13.6 | Non-optimistic account switch | `setUser` inside try/catch after `await` — never updates on failure | Account toggles update local state optimistically before API call |
| 13.7 | Dev-server OOM | Two Next.js dev servers + Chrome crashed machine 3x | PRs spawning background processes need justification |
| 13.8 | NestJS sync overwriting fixes | Merging from original repo replaced vibe-modified files | Only add new files/lines when syncing — never replace |
| 13.9 | Silent regression from concurrent PRs | Two PRs touch same file/dependency — second overwrites first's fix | The #1 bug class. AI Breakage Detector + CODEOWNERS catch this |
| 13.10 | Login broken by cross-env "fix" | Hardcoded cookie/URL/CORS for one env breaks others | The #2 bug class. `sop-check.yml` blocks hardcoded values |

---

## 14. Failure Modes & Recovery

| Failure | Cause | Action |
|---|---|---|
| Promotion script aborts on "working tree dirty" | Uncommitted local changes | Stash or discard |
| Merge conflicts outside protected files | Developer and QA touched same file | Contact CTO; developer rebases |
| `gitleaks` detects secret during promotion | Secret committed on `dev-main` | **Do not push.** Reset branch, open urgent issue, fix leak on `dev-main` first |
| Vercel deploy fails after promotion | Build error, env var missing | Script exits non-zero with deployment URL; investigate |
| Render deploy fails after `live-mvp` promotion | Build/migration error | Script exits non-zero; do NOT revert until root cause understood |
| Post-merge audit auto-reverts | Required checks failed on merged PR | CTO reviews revert PR; developer fixes checks; re-promote |
| Force-push detected on protected branch | Mistake or deliberate bypass | `post-merge-audit.yml` opens urgent issue within ~60s |

---

## 15. File Reference

### SOP Documents
| File | Purpose |
|---|---|
| `docs/DEVOPS_AND_CODE_REVIEW_SOP.md` | This document — consolidated SOP |
| `docs/CODE_REVIEW_SOP.md` | Detailed code review rules (original) |
| `docs/DEVOPS_SOP.md` | Detailed devops rules (original) |
| `docs/DEVOPS_REMEDIATION_PLAN.md` | Prioritized backlog for remaining production-grade DevOps controls |

### GitHub Actions Workflows
| Workflow | File | Type |
|---|---|---|
| Mechanical SOP Checker | `.github/workflows/sop-check.yml` | Blocking |
| AI Regression Detector | `.github/workflows/ai-breakage-check.yml` | Blocking |
| Secret Scanner | `.github/workflows/gitleaks.yml` | Blocking |
| AI Code Review | `.github/workflows/code-review.yml` | Advisory |
| Post-Merge Audit | `.github/workflows/post-merge-audit.yml` | Post-hoc blocking |
| Auto-Sync to Staging | `.github/workflows/sync-dev-main-to-staging.yml` | Automated |
| Vercel Deploy | `.github/workflows/vercel-deploy.yml` | Automated |
| Stale Branch Cleanup | `.github/workflows/stale-branch-cleanup.yml` | Weekly audit |

### Infrastructure Config
| File | Purpose |
|---|---|
| `.github/CODEOWNERS` | Auto-review routing by directory |
| `.github/pull_request_template.md` | PR template with required confirmations |
| `.gitleaks.toml` | Secret scanning config |
| `frontend/vercel.json` | Vercel deploy gating (feature branches disabled) |
| `render.yaml` | Render service config |

### QA Promotion Scripts
| Script | Purpose |
|---|---|
| `scripts/devops/qa-promote-dev-to-staging.sh` | Promote dev-main → staging |
| `scripts/devops/qa-promote-staging-to-live.sh` | Promote staging → live-mvp (production) |
| `scripts/devops/check-devops-drift.mjs` | Detect live n8n / gist / env contract drift from the repo-controlled DevOps contract |
| `scripts/devops/check-runtime-env-drift.mjs` | Compare the exact staging Vercel runtime contract and the shared Render auth/runtime contract against live envs |
| `scripts/devops/sync-staging-runtime-envs.mjs` | Repair staging Vercel env drift and shared Render auth/runtime drift before promotions or during recovery |
| `scripts/devops/sync-n8n-workflow.mjs` | Re-pin the live n8n Build Command node to the repo-controlled runner URL |
| `scripts/devops/publish-n8n-runner.mjs` | Publish the repo-controlled orchestrator source to the pinned gist revision used by n8n |
| `scripts/devops/install-n8n-runtime-secrets.mjs` | Install and verify the host-side runtime secret env file consumed by the live n8n workflow |
| `scripts/devops/rollback-staging.mjs` | Find a previous staging rollback candidate and trigger a first-class n8n rollback event for `staging` |
| `scripts/devops/marketeq-devops.config.json` | Checked-in control-plane manifest for n8n, Vercel, Render, and env contracts |
| `scripts/devops/marketeq-staging-env-baseline.json` | Canonical staging runtime baseline for Vercel login envs and shared Render auth/runtime envs |

### Environment Templates
| Template | Environment |
|---|---|
| `frontend/.env.local.example` / `backend/.env.local.example` | Local dev |
| `frontend/.env.staging.example` / `backend/.env.staging.example` | Staging |
| `frontend/.env.production.example` / `backend/.env.production.example` | Production |

---

## 16. Revision Log

| Date | Change |
|---|---|
| 2026-04-14 | Consolidated document created from `CODE_REVIEW_SOP.md` and `DEVOPS_SOP.md`. Captures branch model, repo settings, developer workflow, code review process, all 8 GitHub Actions, CODEOWNERS routing, environment templates, Vercel/Render topology, QA promotion flow, role separation, non-negotiable rules, historical bugs, and failure recovery. |
