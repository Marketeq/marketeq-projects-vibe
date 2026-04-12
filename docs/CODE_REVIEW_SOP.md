# Code Review SOP — Marketeq Projects Vibe

**Owner:** @CTorres9800
**Reviewer of record:** Claude Code (on behalf of @CTorres9800)
**Applies to:** every PR targeting `dev-main`, `staging`, or `main-live`
**Last updated:** 2026-04-11

This is the single source of truth for how pull requests are reviewed, merged, and cleaned up in this repository. Nothing in this document is optional. If any step cannot be completed, the PR **does not merge**.

---

## 1. Non-Negotiable Rules

These rules override everything else in this SOP. If a PR violates any of them, it is blocked regardless of the quality of the feature work inside it.

### 1.1 Never override or delete existing working code
- **Preserve every bug fix.** If a PR rewrites a file that already contains a fix, the fix must survive the rewrite verbatim. If it doesn't, the PR is blocked.
- **No reverts, rollbacks, or "unnecessarily replacing" working code.** Fix forward only.
- **Additive merges only** when syncing from the original `marketeq-projects-nestjs` repo. Never replace vibe code.
- When in doubt, read the full existing file before accepting any diff against it.

### 1.2 Read ALL code before approving any change
- Read every line of every file the PR touches, not just the diff hunks.
- Understand how the touched code is used elsewhere in the repo before signing off.
- **New features must never break existing working features.** This is a hard constraint, not a suggestion.

### 1.3 Off-limits paths — profile data loading
The profile loading path is **fixed and sacred**. Any PR touching these files must be flagged and blocked until the author explicitly confirms they did not change the loading logic:

- `frontend/app/(group)/(group)/talent-profile/page.tsx`
- `frontend/app/(group)/(group)/client-profile/page.tsx`
- `frontend/components/edit-profile-modals.tsx`
- Anything in the `useEffect` chain that fetches `/me` or hydrates user state
- `frontend/contexts/auth.tsx` loading logic
- `frontend/src/lib/api/user.ts` profile methods

If a PR modifies any of the above, the author must confirm **in writing in the PR description**:
1. No API call shapes in the profile data-loading path were changed
2. `useEffect` ordering around the profile fetch was not modified
3. Loading spinner / fallback states still work for slow-network and error cases
4. Manual QA was performed against the live backend on a real talent **and** client profile

Without all four confirmations, block the PR.

### 1.8 Local dev login is FROZEN
Once local development login is working against a fresh `.env` / `.env.example` setup, **nobody changes it without CTO approval**. Developers must not have to re-fix the login flow every time they pull `dev-main`. This rule exists because every regression in this area has cost the team half a day of debugging.

**Frozen files:**
- `frontend/app/sign-in/page.tsx`
- `frontend/app/sign-up/page.tsx`
- `frontend/contexts/auth.tsx`
- `frontend/src/lib/api/auth.ts`
- `frontend/middleware.ts`
- `backend/apps/auth-service/**` (any file)
- `backend/libs/shared/src/guards/**`
- `backend/libs/shared/src/decorators/**`
- `.env.example`, `frontend/.env.example`, `backend/.env.example`

Any PR modifying any of the above must include **all four** of the following confirmation sentences, **verbatim**, in the PR description. The mechanical SOP check (`.github/workflows/sop-check.yml`) will fail the PR if any sentence is missing:

1. `local dev login on the frontend still works against a fresh .env`
2. `backend JWT signing, verification, and guards are unchanged`
3. `manual QA was performed locally with a client account and a talent account`
4. `no credentials, keys, or secrets are committed in this PR`

Without all four, block the PR. If the author can't honestly make all four claims, the login-touching changes must be removed from the PR.

**Automatic enforcement on every PR touching login-frozen files:**
- The PR is automatically labeled `login-touched` by `.github/workflows/sop-check.yml`.
- A 🚨 **LOGIN TOUCHED** comment is posted on the PR, even if the four-point confirmation is present — reviewers cannot miss that the login path was modified.
- The CTO (@CTorres9800) is auto-requested as a reviewer on top of the normal CODEOWNERS request.
- The goal is stated plainly: **fix login once, never again.** Every regression of the local login flow is a failure of this rule and a reason to revert the responsible PR immediately.

### 1.10 Environment-aware login (env-driven, never hardcoded)
Login behavior is different on local vs. Vercel+Render because of cookies (`SameSite`, `Secure`), CORS origin allowlists, backend URLs, and JWT verification. Previously this caused the recurring failure mode: a developer "fixes local login" by hardcoding a value that only works locally, which silently breaks login on Vercel/Render (or vice versa).

**The rule:** login code must never hardcode environment-specific values. It reads them from env vars. There are exactly **three frozen env templates**, one per environment:

| Template | Used for | Expected values |
|---|---|---|
| `frontend/.env.local.example` | Local dev on `dev-main` | `NEXT_PUBLIC_BACKEND_URL=http://localhost:3002/api`, `NEXT_PUBLIC_COOKIE_SAMESITE=lax`, `NEXT_PUBLIC_COOKIE_SECURE=false`, `NEXT_PUBLIC_AUTH_MODE=dev` |
| `frontend/.env.staging.example` | Vercel Preview + Render staging | `NEXT_PUBLIC_BACKEND_URL=https://<staging>.onrender.com/api`, `NEXT_PUBLIC_COOKIE_SAMESITE=none`, `NEXT_PUBLIC_COOKIE_SECURE=true`, `NEXT_PUBLIC_AUTH_MODE=staging` |
| `frontend/.env.production.example` | Vercel Production + Render live | `NEXT_PUBLIC_BACKEND_URL=https://<prod>.onrender.com/api`, `NEXT_PUBLIC_COOKIE_SAMESITE=none`, `NEXT_PUBLIC_COOKIE_SECURE=true`, `NEXT_PUBLIC_AUTH_MODE=production` |

Equivalent `backend/.env.*.example` files cover the backend side (CORS origins, JWT issuer, cookie domain, `NODE_ENV`).

**Hard constraints:**

1. Login code (`frontend/app/sign-in/page.tsx`, `frontend/contexts/auth.tsx`, `frontend/src/lib/api/auth.ts`, `frontend/middleware.ts`, `backend/apps/auth-service/**`) **must not contain hardcoded URLs, cookie flag values, CORS origin strings, or JWT key material**. All of these must come from `process.env.*`.
2. A PR that modifies `frontend/.env.local.example` must carry the §1.8 four-point login confirmation for **local**.
3. A PR that modifies `frontend/.env.staging.example` or `backend/.env.staging.example` must carry a four-point confirmation for **staging** (see below) and must target the `staging` branch, not `dev-main`.
4. A PR that modifies `frontend/.env.production.example` or `backend/.env.production.example` must target `main-live` and carry a four-point confirmation for **production**.
5. The three template pairs are independent. Modifying the local template never affects staging or prod; modifying staging never affects local or prod. If a PR modifies more than one template at once, block it and ask the author to split.

**Staging four-point confirmation (required in PR description of any PR to `staging` that touches login or `*.staging.example`):**
1. `staging login on Vercel preview still works against the staging Render backend`
2. `staging cookie SameSite/Secure flags are unchanged`
3. `staging CORS origin allowlist is unchanged`
4. `manual QA was performed against the staging Render deployment with a client account and a talent account`

**Production four-point confirmation (required in PR description of any PR to `main-live` that touches login or `*.production.example`):**
1. `production login on Vercel production still works against the production Render backend`
2. `production cookie SameSite/Secure flags are unchanged`
3. `production CORS origin allowlist is unchanged`
4. `manual QA was performed against the production Render deployment with a client account and a talent account`

**Why this rule exists:** "fix login once, never again" only works if local, staging, and production each have their own frozen template that nobody is allowed to touch without explicit CTO sign-off. The login code itself is environment-agnostic — it just reads env vars. A developer fixing their local issue cannot accidentally break production, and vice versa.

### 1.9 `dev-main` and local dev MUST be detached from Render
Local development and the `dev-main` branch must run **entirely against a local backend** — never against a Render deployment. Render is a deployment target for `staging` and `main-live` only.

**Why this rule exists:** if `dev-main` or any developer's local `.env` points at a Render URL, a single broken Render deploy makes every developer unable to work locally until the deploy is fixed. That is an unacceptable coupling and has caused team-wide outages.

**Hard constraints enforced on every PR to `dev-main`:**

1. `frontend/.env.example`, `backend/.env.example`, and root `.env.example` must **not** contain any `*.onrender.com` URL for backend targets. Backend URLs in these files must point at localhost (e.g. `http://localhost:3002/api`).
2. `NEXT_PUBLIC_BACKEND_URL` in any `.env.example` must resolve to a localhost URL, not a Render URL.
3. `render.yaml` must not list `dev-main` (or any `dev-*` branch) under any service's `branch:` field. Only `staging` and `main-live` are valid deploy branches.
4. No new `render.yaml` services may be added in a PR targeting `dev-main` — `render.yaml` changes only merge through a `staging` → `main-live` promotion.
5. No PR targeting `dev-main` may add Render CLI calls, Render webhook wiring, or `render deploy` commands to CI workflows that run on `dev-main`.

The mechanical SOP check (`.github/workflows/sop-check.yml`) will scan for these violations on every PR and block the merge. Human reviewers must also treat any of these as automatic blocks, regardless of how small the change looks.

**Promotion workflow (the only approved path for Render-connected changes):**

```
feature/xyz  →  dev-main  (local-only, no Render)
                   ↓ (QA green-lights)
                staging    (deploys to Render staging environment)
                   ↓ (QA + CTO approval)
               main-live   (deploys to Render production)
```

A developer who needs to test a feature against Render does it on the `staging` branch after `dev-main` merge, not by wiring `dev-main` to Render.

### 1.11 `dev-main` and feature branches do NOT deploy to Vercel
Only `staging` and `main-live` deploy to Vercel. `dev-main` and every feature branch targeting `dev-main` are **local-only**. This mirrors SOP §1.9 (no Render coupling) and extends it: no Vercel coupling either. The reason is identical — if `dev-main` deploys to Vercel, developers will "fix" the login flow in a way that works on Vercel but breaks locally (or vice versa), and every login fix becomes a regression risk for both environments.

**Enforced by:**
- `frontend/vercel.json` with `git.deploymentEnabled` explicitly set to `false` for `dev-main`, `feat/*`, `fix/*`, `chore/*`, `refactor/*`, `agent/*` and `true` only for `staging` and `main-live`.
- `.github/workflows/sop-check.yml` blocks any PR targeting `dev-main` that modifies `vercel.json`.
- Vercel dashboard (manual, CTO-only): Production Branch = `main-live`; all non-`staging`/non-`main-live` preview deploys disabled.

**Stakeholder demo workflow:** if a stakeholder wants to see a preview URL for unreleased work, the answer is "merge it to `staging` first." Do not create ad-hoc demo branches that deploy to Vercel — they reintroduce the exact bug class this rule prevents.

### 1.12 QA works on `staging` only — never `dev-main`
Role separation by branch:

| Role | Branches they touch | Branches they NEVER touch |
|---|---|---|
| **Developers** | feature branches → `dev-main` | `staging`, `main-live` |
| **QA** | `staging` → `main-live` | `dev-main`, feature branches |
| **CTO (@CTorres9800)** | all branches, all merges | — |

**Workflow:**
1. Developers build and test features locally on feature branches, merge to `dev-main` after passing review + CI.
2. When a `dev-main` milestone is ready for QA, the CTO (or a trusted promoter) fast-forwards or cherry-picks the relevant commits into `staging`.
3. QA tests on `staging` (deployed to Render staging + Vercel staging preview).
4. When QA signs off, `staging` promotes to `main-live`, which deploys to Render production + Vercel production.

**Enforced by:**
- CODEOWNERS: `staging`-only branches (via path-based rules where applicable) require QA team review.
- Convention: QA is never added as a reviewer on PRs targeting `dev-main`. If QA is tagged on a `dev-main` PR, the PR is misrouted and should be closed and re-opened against `staging` after the `dev-main` PR has merged.
- Branch promotion is a CTO action, not a QA action. QA does not open PRs from `dev-main` → `staging`.

**Why this rule exists:** giving QA access to `dev-main` inevitably means QA tries to "help" by pushing small fixes to unstable feature work. Those fixes collide with in-flight developer work and cause regressions. Keep the branches cleanly separated by role.

### 1.4 Incremental changes only
- No mega-PRs that mix unrelated concerns (e.g., "fix login" should not also include a CSS refactor).
- If a PR contains unrelated changes, request that the author split it.

### 1.5 Repo must stay private
- Do not publish, make public, or fork this repo publicly as part of a review.
- The repo may be temporarily toggled public only for Vercel free-tier deploy workarounds by the owner — never by a reviewer.

### 1.6 Never silently switch branches during review
- If reviewing on a local checkout requires switching branches, tell the user first.
- After pushing any review commit, **stay on that branch** until the user acknowledges. Do not `git checkout` elsewhere silently.

### 1.7 Always verify before declaring done
- "Merged" means: squash-merge landed on `dev-main`, branch deleted, and a sanity check that `dev-main` still builds.
- Do not tell the user a PR is merged until `gh pr view N --json state,mergedAt` returns `"MERGED"`.

---

## 2. Review Inputs — what you must gather before starting

For every PR you review, collect the following in this order:

1. **PR metadata** — `gh pr view N --json mergeable,mergeStateStatus,headRefName,baseRefName,title,state,author,body,files`
   - Confirm `state: OPEN`
   - Confirm `mergeable: MERGEABLE` (if `CONFLICTING` → see §5)
   - Note `mergeStateStatus` — `CLEAN` is ideal, `UNSTABLE` is tolerable if failing checks are only Vercel-preview deploys, anything else needs investigation
2. **Full diff** — `gh pr diff N > /tmp/prN.diff`
   - Read it **completely** using the Read tool. Never rely on the PR summary alone.
3. **File list with line counts** — already in the metadata from step 1; use it to prioritize reading the biggest changes first.
4. **Existing file contents** — for every file the PR modifies, read the current version on `dev-main` before reading the diff. You cannot judge a change without knowing what it replaces.
5. **Related files** — if the PR touches a component, read every file that imports it. If it touches an API method, read every caller. This is how you catch breaking changes the author missed.
6. **Commit history** — `gh pr view N --json commits` to spot suspicious patterns (force-pushes, rebases that may have dropped fixes, commits labeled "revert", etc.).

---

## 3. The Seven-Point Review Checklist

Run every PR through this checklist in order. A single "❌ fail" blocks the merge.

### ✅ 3.1 Security
- [ ] **No committed secrets.** Scan the diff for:
  - `-----BEGIN .* PRIVATE KEY-----`
  - `.pem`, `.key`, `.p12`, `.pfx` files
  - Committed `.env` or `.env.*` files (except `.env.example`)
  - Hardcoded API keys, tokens, Stripe keys, Anthropic keys, JWT secrets
  - Stripe `sk_live_*` / `pk_live_*`, AWS `AKIA*`, GitHub `ghp_*`/`gho_*`
- [ ] **No open-auth bugs.** Specifically watch for `undefined === undefined` comparisons that accidentally disable auth when an env var is unset (this was the PR #16 bug).
- [ ] **No SQL injection, XSS, or command injection** in new code paths.
- [ ] **JWT guards present** on any new controller endpoint. Bearer for M2M, JwtAuthGuard for user-scoped, RolesGuard for admin.
- [ ] **CORS changes are scoped** — no `origin: "*"` on authenticated endpoints.

### ✅ 3.2 Off-limits files (see §1.3)
- [ ] If any off-limits file is touched, require the four-point confirmation in the PR description.
- [ ] If the confirmation is missing, block.

### ✅ 3.3 Breaking-change analysis
- [ ] Does the PR change any function signature, API response shape, DTO, or entity column? If yes, find every caller and confirm they still work.
- [ ] Does the PR remove any file, export, or prop? If yes, search the repo for references.
- [ ] Does the PR rename anything? If yes, confirm every import and every string reference is updated.
- [ ] Does the PR touch a shared component? If yes, read every consumer.
- [ ] **Does the PR preserve every existing bug fix?** Diff the full new file against the current `dev-main` version of that file, not just the PR's reported hunks.

### ✅ 3.4 Repo conventions
- [ ] **No root-level `package.json` or `package-lock.json`.** Lockfiles live in `backend/`, `frontend/`, and individual services. This was the PR #37 bug.
- [ ] **Entity changes require migrations.** `synchronize: false` is enforced — every TypeORM entity change must ship with a migration file.
- [ ] **DTOs use `class-validator` decorators.**
- [ ] **Inter-service communication via RabbitMQ only** — no direct HTTP between backend services.
- [ ] **Storage via `R2Service`** in `StorageModule`, not raw SDK calls.
- [ ] **No TODO stubs or empty method bodies** in production code.
- [ ] **No `.DS_Store`, `build/`, `dist/`, or `node_modules/`** accidentally committed.

### ✅ 3.5 Standards (TypeScript + NestJS + Next.js)
- [ ] TypeScript strict mode — no new `any` types, no `@ts-ignore` without a justification comment.
- [ ] Error handling uses NestJS exceptions (`NotFoundException`, `BadRequestException`, etc.) — not raw `throw new Error()`.
- [ ] React render props and `useEffect` dependency arrays look correct.
- [ ] Next.js route groups (`(group)/(group)/`) are respected — no files dropped in the wrong layout folder.

### ✅ 3.6 Merge-conflict status
- [ ] `mergeable: MERGEABLE` in `gh pr view`. If `CONFLICTING`, the PR cannot merge — see §5.
- [ ] Branch is not more than ~10 commits behind `dev-main`. If it is, request a rebase before review.

### ✅ 3.7 Memory & performance
- [ ] No new infinite loops, unbounded queries, or `while(true)` without break conditions.
- [ ] No heap-explosion risks (per the standing memory-usage rule — the dev environment has crashed three times already).

---

## 4. Decision Matrix

After the checklist, apply this matrix:

| Checklist Result | Action |
|---|---|
| All 7 points pass, `mergeable: MERGEABLE`, no off-limits concerns | **Merge** (§6) |
| 1+ checklist points fail | **Block** with detailed comment (§7) |
| `mergeable: CONFLICTING` / `DIRTY` | **Block** and request rebase (§5) |
| Touches off-limits files without the four-point confirmation | **Block** and request confirmation (§1.3) |
| Checklist passes but feature work is clearly incomplete | **Block** and request completion |
| Author explicitly marked `[DO NOT MERGE]` or draft | **Do not merge** regardless of checklist |

**Default posture:** when in doubt, block. The cost of a bad merge is much higher than the cost of another review cycle.

---

## 5. Handling Conflicts and Unmergeable Branches

A branch cannot merge when any of these are true:
- `mergeable: CONFLICTING`
- `mergeStateStatus: DIRTY`
- `state: CLOSED` or `DRAFT` with explicit `[DO NOT MERGE]`
- The `Scan for committed secrets` gitleaks check is ❌
- Any required CODEOWNER review is missing (see §9)

**Do not rebase or force-push someone else's branch to resolve conflicts unless the user explicitly asks you to.** Instead, post a block comment (§7) with the exact rebase command the author should run:

```bash
git fetch origin dev-main
git rebase origin/dev-main
# resolve conflicts
git push --force-with-lease
```

---

## 6. How to Merge — the only approved procedure

Once the checklist passes and the PR is `MERGEABLE`, merge with:

```bash
gh pr merge <NUMBER> --squash --delete-branch
```

**Never:**
- `--admin` (bypasses checks) unless explicitly instructed by the user
- `--merge` (no commit-squashing — pollutes history)
- `--rebase` without user approval
- Skip `--delete-branch` — stale branches accumulate

**After merging, verify:**

```bash
gh pr view <NUMBER> --json state,mergedAt,mergeCommit
```

Expected result: `"state": "MERGED"`, a non-null `mergedAt`, and a `mergeCommit.oid`. Only after this succeeds can you tell the user the PR is merged.

**Then confirm nothing broke on `dev-main`:**

```bash
git fetch origin dev-main
# Optional: quick sanity checkout of dev-main and look for obvious build breakage
```

Branches are only deleted by `gh pr merge --delete-branch`. **Do not manually `git push origin --delete` remote branches** unless the user explicitly tells you to.

---

## 7. Block-Comment Template

When a PR fails the checklist, post a single consolidated comment explaining every blocker. Do not spread findings across multiple comments.

**Command:**
```bash
gh pr comment <NUMBER> --body "$(cat <<'EOF'
## ⛔ Cannot be merged — detailed blocker list

This PR has the following issues that must be resolved before it can be merged.

---

### <N>. <🔒 / 📦 / ⚠️ / 🧩 / 🔀> <BLOCKER TITLE>

<One-paragraph explanation of what the blocker is.>

**Why this is a block:**
- <bullet 1>
- <bullet 2>

**Required action:**
1. <concrete step>
2. <concrete step>

---

### Files NOT reviewed

Because of the blockers above, no line-by-line review was performed on:
- `path/to/file.ts` (<lines> line diff)

---

### How to unblock this work

1. <step 1>
2. <step 2>
3. <step 3>

🤖 Posted by [Claude Code](https://claude.com/claude-code) on behalf of @CTorres9800
EOF
)"
```

**Severity emoji conventions:**
- 🔒 Security / secret exposure
- 📦 Repo structure / conventions
- ⚠️ Off-limits file modification
- 🧩 Missing migration / entity change
- 🔀 Merge conflicts / rebase required
- 🐛 Logic bug / null ref / race condition
- 🔥 Breaking change to existing feature
- 🧪 Missing test or QA confirmation

See PR #37 for the canonical example of this block-comment style.

---

## 8. Known Historical Bugs to Watch For

Every reviewer in this repo should memorize these. They are the bugs we have actually hit and fixed.

### 8.1 Open-auth via `undefined === undefined` (PR #16)
The `reconcile-categories` endpoint became fully open when the `CMS_API_KEY` env var was unset because `undefined !== undefined` is `false`. **Any PR that compares an env var to another env var without an explicit `process.env.X ?? '__UNSET__'` fallback is suspect.**

### 8.2 Committed private keys (PR #37)
An RSA 2048-bit private keypair (`backend/jwt_private.pem`, `backend/jwt_public.pem`) was committed to a feature branch. Also added a root-level `package.json` and `package-lock.json` polluting the monorepo layout. **Blocked and never merged.** The gitleaks workflow (§10) now catches this automatically.

### 8.3 Render-prop components silently broken (search page)
`FavoriteRoot` expects a render-prop `children` function: `<FavoriteRoot>{() => <Favorite />}</FavoriteRoot>`. PRs that pass a React element directly cause `children is not a function` runtime errors. **Always check that render-prop components are invoked with a function child.**

### 8.4 CategorySidebar import alias (search page)
`sidebar.tsx` exports `Sidebar`, not `CategorySidebar`. Import it as `import { Sidebar as CategorySidebar } from "./sidebar"` to avoid TypeScript build errors.

### 8.5 Save-and-exit without persistence (publish-project page)
A "Save & Exit" button wired to `<DialogClose>` with no `onClick` handler does nothing. Any PR that adds a "save draft" flow must write to `localStorage` (or the backend) **before** navigating away.

### 8.6 Non-optimistic account switch (top-most-header)
`setUser` wrapped inside a try/catch **after** an `await` means the local state never updates if the API fails. Account-type toggles must update local state **optimistically** before firing the API call.

### 8.7 Dev-server memory OOM
Running two Next.js dev servers on the same port plus Chrome has crashed the dev machine three times. Any PR that spawns background processes or watchers must justify why and must not be merged without the user's explicit go-ahead.

### 8.8 NestJS sync overwriting vibe fixes
When merging from the original `marketeq-projects-nestjs` repo, **only add new files or net-new lines.** Never replace existing vibe-modified files. Every bug fix in the vibe repo is sacred.

### 8.9 Silent regression from concurrent PRs (the #1 recurring bug)
Two contributors independently touch the same file — or touch different files that depend on the same exported symbol, function signature, API shape, or prop type. Whoever merges first is fine; the second PR silently overwrites or contradicts the first. The user only discovers it when a previously-working feature (login, onboarding, profile load, publish-project) mysteriously breaks.

**This is the bug class the AI Breakage Detector (§9.6) and directory-scoped CODEOWNERS exist to catch.** Every reviewer must also manually apply §3.3 and specifically compare the full new version of each changed file against the `dev-main` version to verify no existing fix was lost in a rewrite.

### 8.10 Broken local login after a merge
A PR modifies `sign-in/page.tsx`, `contexts/auth.tsx`, `auth-service`, or a guard decorator. The feature work is fine for the author's local setup but breaks local login for everyone else who pulls `dev-main` — typically because a new env var is required, a guard decorator changed, or a token-refresh code path was rewritten. Per SOP §1.8, local dev login is **frozen**: fix it once, never again. PRs touching login-frozen files are automatically labeled `login-touched`, post a sentinel comment, and auto-request CTO review.

### 8.11 `dev-main` coupled to Render
A PR points `NEXT_PUBLIC_BACKEND_URL` at a Render URL, or adds `dev-main` to `render.yaml`, or wires a Render deploy hook into a `dev-main` CI workflow. Result: when the Render deploy fails, every developer loses the ability to work locally until someone fixes the deploy. Per SOP §1.9, Render only connects on `staging` and `main-live`.

---

## 9. Branch Rules We Can Actually Enforce (Free Org Plan)

GitHub's classic branch protection, rulesets, and native push protection **all require GitHub Team or GHAS** on private organization repos. This repo is on the free org plan, so we enforce protection through **CI checks and conventions** instead. Everything below is live as of 2026-04-11.

### 9.1 Gitleaks secret scanning — **ENFORCED**
- **Workflow:** `.github/workflows/gitleaks.yml`
- **Config:** `.gitleaks.toml` (extends default ruleset + adds PEM private-key and `.env` file rules)
- **Triggers:** every PR to any branch, plus every push to `dev-main`, `staging`, `main-live`
- **Behavior:** fails the check if any committed secret is detected. Reviewer **must not merge** a PR with a failed gitleaks check, regardless of the author or urgency.
- **Why it matters:** this is our replacement for GHAS push protection. It would have caught PR #37's private key commit automatically.

### 9.2 `.gitignore` secret blocklist — **ENFORCED**
The repo root `.gitignore` excludes:
```
*.pem
*.key
*.p12
*.pfx
id_rsa
id_rsa.*
id_ed25519
id_ed25519.*
.env
.env.*
!.env.example
```
This prevents developers from accidentally staging key material. It does not stop someone who deliberately bypasses it — gitleaks (§9.1) is the backstop.

### 9.3 CODEOWNERS auto-review — **ENFORCED (advisory)**
- **File:** `.github/CODEOWNERS`
- **Rule:** `* @Marketeq/code-review`
- **Behavior:** every PR automatically requests a review from the `@Marketeq/code-review` team. The team currently has `push` (write) permission on the repo, so their approvals would count toward a protected-branch check if one were active.
- **Limitation:** because classic branch protection is paywalled on free org plans, the team review is **requested but not required**. A reviewer with write access could technically click "Merge" without their approval. SOP rule §1 treats the team review as **mandatory** by convention.

### 9.4 AI Code Review workflow — **ENFORCED (advisory)**
- **File:** `.github/workflows/code-review.yml`
- **Triggers:** PRs targeting `dev-main`, `staging`, or `main-live`
- **Behavior:** posts an AI-generated review comment using Claude Sonnet 4.6. Treat its findings as a second opinion, not as authoritative.

### 9.6 Mechanical SOP Checker — **ENFORCED (blocking)**
- **File:** `.github/workflows/sop-check.yml`
- **Triggers:** every PR (opened, synchronize, reopened, edited)
- **Behavior:** runs ~10 mechanical checks derived from this SOP and fails the check on any violation. Posts a single consolidated comment listing every violation with SOP section references. Specifically blocks:
  - Committed `*.pem`, `*.key`, `*.p12`, `*.pfx`, `.env`, `.env.*` files
  - Embedded PEM private-key headers in any added file
  - Root-level `package.json` / `package-lock.json` / `yarn.lock`
  - Off-limits profile files touched without the four-point confirmation (§1.3)
  - Off-limits login files touched without the four-point login confirmation (§1.8)
  - TypeORM entity changes without a matching migration
  - Render URLs in any `.env.example` on PRs targeting `dev-main` (§1.9)
  - `render.yaml` changes on PRs targeting `dev-main` (§1.9)
  - Render CLI / webhook wiring in `dev-main` CI workflows (§1.9)
  - Junk files (`.DS_Store`, `dist/`, `build/`, `node_modules/`, `.next/`)
  - Raw `throw new Error()` in backend code
  - `--no-verify` or `gh pr merge --admin` in scripts
  - Oversized PRs (>2000 lines) without `[EPIC]` prefix
  - New `@ts-ignore` without a `-- justification` comment
- **Login sentinel:** if any login-frozen file is touched, the workflow also auto-labels the PR `login-touched`, auto-requests @CTorres9800 as a reviewer, and posts a sticky 🚨 LOGIN TOUCHED comment regardless of confirmation status. See §1.8.

### 9.7 AI Breakage Detector — **ENFORCED (blocking)**
- **File:** `.github/workflows/ai-breakage-check.yml`
- **Triggers:** every PR (opened, synchronize, reopened)
- **Behavior:** purpose-built to catch §8.9 silent regressions. On each PR it:
  1. Gets the full diff
  2. Extracts every exported symbol from the base version of each changed file
  3. Greps the whole repo for callers of those symbols (excluding the changed files themselves)
  4. Reads the first 200 lines of up to 40 caller files
  5. Feeds diff + symbol list + caller snippets to Claude Sonnet 4.6 with a regression-hunting prompt (see §15)
  6. Claude returns a verdict: `SAFE` / `RISKY — NEEDS MANUAL VERIFICATION` / `BLOCK — LIKELY REGRESSION`
  7. Posts the full analysis as a sticky PR comment
  8. Fails the check if Claude's verdict is `BLOCK`
- **Why it exists:** mechanical grep cannot tell you "does this signature change break a caller somewhere else in the repo?" — only semantic analysis can. This is the automated layer that catches the "Dev B overwrote Dev A's fix" bug class before it merges.

### 9.8 Directory-scoped CODEOWNERS — **ENFORCED (advisory)**
- **File:** `.github/CODEOWNERS`
- **Behavior:** every PR automatically requests review from the owner(s) of every directory it touches. Critical paths (sign-in, auth, profile, onboarding, publish-project, top-header, render.yaml, env files) route to @CTorres9800 **and** @Marketeq/code-review. Everything else routes to @Marketeq/code-review. Review is advisory by default (free org plan limitation) but mandatory by SOP convention.

### 9.9 Post-Merge SOP Audit + Auto-Revert — **ENFORCED (post-hoc, binding)**
- **File:** `.github/workflows/post-merge-audit.yml`
- **Triggers:** `push` event on `dev-main`, `staging`, `main-live` (i.e., fires the moment a merge lands)
- **Behavior:** this is the keystone enforcement on the free plan. Since GitHub won't technically block a merge despite a red check, this workflow catches the bypass **after the merge** and undoes it automatically.
  1. Finds the PR associated with the push
  2. Reads the status of every required check (`Enforce Code Review SOP`, `Regression risk analysis`, `Scan for committed secrets`) via `gh pr view --json statusCheckRollup`
  3. If any required check is `FAILURE`, `CANCELLED`, `TIMED_OUT`, or missing → automatically creates a revert branch, pushes it, and opens an `[SOP AUTO-REVERT]` PR assigned to @CTorres9800
  4. Posts a sticky 🚨 `MERGED DESPITE FAILING SOP CHECKS` comment on the original PR, naming the merge author publicly
  5. Also detects forced pushes (`github.event.forced == true`) and opens an urgent issue assigned to CTO
  6. Also detects direct pushes with no associated PR and opens an urgent issue assigned to CTO
- **Why it works:** a developer can technically click Merge despite a red check on the free plan. This workflow makes that merge survive only for ~60–120 seconds before it is auto-reverted, publicly called out, and handed to the CTO to decide. Merging around the rules becomes a visible, auditable, reversible event rather than a silent bypass.

### 9.10 Repo-level merge settings — **ENFORCED (server-side)**
Applied via `gh api -X PATCH repos/Marketeq/marketeq-projects-vibe`:
- `allow_merge_commit: false` — merge commits disabled at the server; the option is not shown in the UI
- `allow_rebase_merge: false` — rebase merges disabled; only squash-merge is available
- `allow_squash_merge: true` — the only allowed merge type
- `delete_branch_on_merge: true` — merged branches are auto-deleted
These are enforced by GitHub itself. Developers cannot bypass them without admin UI access.

### 9.11 Vercel deploy gating — **ENFORCED (server-side via Vercel)**
`frontend/vercel.json` sets `git.deploymentEnabled` to `false` for `dev-main` and all feature branch patterns and `true` only for `staging` and `main-live`. Vercel honors this file on every push, so `dev-main` cannot be accidentally deployed. Per SOP §1.11.

### 9.12 What is NOT technically blockable on free org plan
The following require GitHub Team or higher and are therefore unavailable today:
- Pre-merge blocking on failing status checks
- Server-side force-push prevention
- Server-side branch deletion prevention
- Required code-owner reviews enforced by GitHub itself
- Required conversation resolution enforced by GitHub itself

**We do not upgrade.** Instead, all of the above are enforced post-hoc by §9.9 (auto-revert) and by the reviewer discipline codified in this SOP. Merging despite a failing check is technically possible but immediately reverted, publicly flagged, and assigned to the CTO for follow-up.

---

## 10. The Exact Claude CLI Prompt for Code Reviews

Use this prompt verbatim when asking Claude Code to review a PR. Replace `<N>` with the PR number. Do not shorten it — every line is load-bearing.

```text
Review pull request #<N> against dev-main using the SOP at
docs/CODE_REVIEW_SOP.md. Do a full code review and only merge the
branch if it passes every one of the following checks:

1. gh pr view <N> --json mergeable,mergeStateStatus,headRefName,baseRefName,title,state,author,body,files
   shows state: OPEN and mergeable: MERGEABLE. If CONFLICTING or DIRTY,
   block with a comment and stop.

2. Save the full diff to /tmp/pr<N>.diff with
   gh pr diff <N> > /tmp/pr<N>.diff
   and read the entire file using the Read tool. Do not skip any part
   of it. Do not rely on the PR summary.

3. For every file the PR modifies, read the current version on dev-main
   FIRST using the Read tool, then compare against the new version.
   This is the only way to detect silent overrides of existing bug
   fixes. Never approve a change to a file you have not read in full.

4. For every exported symbol, function signature, DTO, entity, or
   shared component that the PR changes, search the repo with Grep to
   find every caller and confirm they still work. Breaking changes to
   existing code are an automatic block.

5. Run the seven-point checklist from §3 of the SOP:
   (1) Security — no committed secrets, private keys, open-auth bugs,
       SQL injection, XSS, missing JWT guards, or unscoped CORS.
   (2) Off-limits files — if the PR touches talent-profile/page.tsx,
       client-profile/page.tsx, edit-profile-modals.tsx, auth.tsx
       loading logic, or src/lib/api/user.ts, require the four-point
       confirmation in the PR description. If missing, block.
   (3) Breaking-change analysis — function signatures, API shapes,
       entity columns, removed files/props, renamed imports, shared
       components, preserved bug fixes.
   (4) Repo conventions — no root-level package.json, entity changes
       require migrations, DTOs use class-validator, inter-service via
       RabbitMQ, R2Service for storage, no stubs, no .DS_Store or
       dist/.
   (5) Standards — no new any types, no @ts-ignore without a reason,
       NestJS exceptions for errors, correct useEffect deps, correct
       Next.js route group placement.
   (6) Merge status — MERGEABLE and not >10 commits behind dev-main.
   (7) Memory/perf — no infinite loops, unbounded queries, heap risks.

6. Confirm the gitleaks "Scan for committed secrets" check is passing.
   If it is failing, block immediately — do not attempt to bypass it.

7. Confirm the CODEOWNERS team review has been requested (it is
   automatic) and, by SOP convention, treat it as required.

If every check passes, merge with:
  gh pr merge <N> --squash --delete-branch

Then verify with:
  gh pr view <N> --json state,mergedAt,mergeCommit
The result must show state: MERGED with a non-null mergedAt before
you tell me the PR is merged.

If ANY check fails, DO NOT MERGE. Instead, post a single consolidated
block comment using the template in §7 of the SOP, listing every
blocker with severity emoji (🔒 🔥 🧩 📦 ⚠️ 🔀 🐛 🧪), a paragraph
explanation, required actions, the files you did not review line-by-
line because of the blockers, and a clear "how to unblock this work"
section. Sign the comment as Claude Code on behalf of @CTorres9800.

Hard rules that override everything else:
- Never override, revert, rollback, or delete existing working code.
- Never touch the profile data loading logic without the four-point
  confirmation from the author.
- Never use --admin or --no-verify to bypass checks.
- Never rebase or force-push someone else's branch to resolve
  conflicts unless I explicitly ask you to.
- Never silently switch git branches during a review. After pushing,
  stay on that branch until I acknowledge.
- Never tell me a PR is merged until gh pr view confirms state: MERGED.
- Only delete the branch via gh pr merge --delete-branch after the
  merge is verified successful, with no conflicts and no bugs.
- Preserve every existing bug fix. Any PR that rewrites a file must
  carry the fix forward verbatim.
- New features must never break existing working features. If you
  cannot prove this by reading the callers, block the PR and ask for
  more tests.
```

---

## 11. One-Line Triage Prompts

For quick status checks:

```text
List every open PR against dev-main with mergeable status, author, and
title. Flag any that are CONFLICTING, DIRTY, or touching off-limits
profile files.
```

```text
For PR #<N>, tell me in one paragraph whether it would pass §3 of the
Code Review SOP. Do not merge. Do not post a comment. Just summarize.
```

```text
For PR #<N>, check only that the gitleaks and AI Code Review checks
are passing. Do not do a full review. Do not merge.
```

---

## 12. Quick Reference — Commands You Will Actually Use

```bash
# List open PRs
gh pr list --state open --base dev-main

# Full metadata for one PR
gh pr view <N> --json mergeable,mergeStateStatus,headRefName,baseRefName,title,state,author,body,files,commits

# Save the full diff
gh pr diff <N> > /tmp/pr<N>.diff

# Check CI status
gh pr checks <N>

# Merge (the only approved form)
gh pr merge <N> --squash --delete-branch

# Verify merge
gh pr view <N> --json state,mergedAt,mergeCommit

# Post a block comment from a heredoc
gh pr comment <N> --body "$(cat <<'EOF'
<comment body>
EOF
)"
```

---

## 14. Regression Prevention Architecture

The #1 recurring bug class in this repo (SOP §8.9) is **silent regressions from concurrent PRs** — Dev B's merge overwrites Dev A's fix. This section explains how the enforcement layers combine to catch this failure mode automatically.

**Four layers, applied on every PR in order:**

1. **Mechanical SOP check (`sop-check.yml`)** — catches the "obvious" regressions: committed secrets, junk files, off-limits files, hardcoded env values, entity without migration, Render/Vercel coupling. Grep-based, fast (<30s), deterministic.

2. **AI Breakage Detector (`ai-breakage-check.yml`)** — catches the "subtle" regressions. Extracts every exported symbol from the base version of each changed file, greps the repo for callers, and asks Claude Sonnet 4.6 to read the diff + caller snippets and flag any signature / prop / API-shape change that a caller still expects in the old form. This is the layer that catches the "Dev B overwrote Dev A's fix" bug class.

3. **Directory-scoped CODEOWNERS (`CODEOWNERS`)** — auto-requests review from the domain expert for the touched directory. Login changes always route to @CTorres9800. Profile changes always route to @CTorres9800. This ensures the person who last fixed a bug in that area sees the PR before it merges.

4. **Post-Merge SOP Audit (`post-merge-audit.yml`)** — the safety net. Even if a bypass makes it past layers 1–3 (e.g., reviewer clicks Merge despite red checks), this workflow detects the bypass within ~60 seconds and opens an auto-revert PR assigned to the CTO.

**Follow-up layer (separate PR, tracked in the EPIC enforcement PR description):**

5. **Playwright smoke-test suite** — headless-browser tests for login, onboarding, profile load, account switch, publish-project save-and-exit, listing browse. Runs on every PR as a required Actions check. This is the mechanical guarantee that the critical user flows still work end-to-end after a merge. Not included in this PR because it requires a test database, test fixtures, and dedicated CI runtime; will ship as a follow-up.

**The design principle:** mechanical grep cannot tell you "does this signature change break a caller somewhere else in the repo?" — only semantic analysis (the AI Breakage Detector) or end-to-end testing (Playwright) can. Both layers are necessary. The AI layer is cheap and available today; Playwright is the long-term guarantee.

---

## 15. The AI Breakage Detector Prompt (load-bearing)

This is the prompt used by `.github/workflows/ai-breakage-check.yml`. Do not modify it casually — it is tuned specifically for the "Dev B overwrote Dev A's fix" failure mode. If you need to change it, open a PR, get a human code review, and update this section in the same commit.

```text
You are the Regression Detector for the Marketeq freelance marketplace repo (Next.js frontend + NestJS backend). Your ONLY job is to find places where this pull request silently breaks code that was working before.

The biggest recurring bug class in this repo is: Dev A fixes something, Dev B opens a PR that touches the same file or a shared dependency, Dev B's PR lands and silently overwrites or contradicts Dev A's fix. You must catch this before it merges.

[DIFF, SYMBOL LIST, CALLER SNIPPETS provided by the workflow]

Analyze the diff against the caller snippets and answer these questions explicitly:

1. Does this PR change any exported symbol signature, prop type, function argument, return type, API response shape, DTO, or entity column that a caller still expects in the old form?
2. Does this PR remove, rename, or inline any exported symbol that callers still reference?
3. Does this PR rewrite any file that currently contains a fix, guard, null check, error handler, or early return — and does the rewrite preserve that logic verbatim?
4. Does this PR touch profile loading logic? If yes, does the PR description contain the four-point confirmation from SOP §1.3?
5. Does this PR touch authentication or local dev login? If yes, does the PR description contain the four-point login confirmation from SOP §1.8?
6. Does this PR touch onboarding? If yes, does it preserve every existing form validation, error state, and field?
7. Are there any CSS/Tailwind class changes that could visually break shared components?
8. Does the PR change any shared utility function? If yes, read every caller before approving.

Respond with Verdict (SAFE / RISKY / BLOCK), Regression Risks Found (list), What I Could Not Verify, and Reviewer Action Required. Be paranoid. Prefer false positives over false negatives.
```

Full prompt source lives in `.github/workflows/ai-breakage-check.yml`.

---

## 16. QA Promotion SOP (`dev-main` → `staging` → `main-live`)

Per SOP §1.12, QA never works on `dev-main`. The only approved interaction is running sanctioned promotion scripts. Both scripts enforce the rules and cannot easily be bypassed.

### 16.1 Role separation reminder

| Role | May edit `dev-main`? | May edit `staging`? | May edit `main-live`? | May run promotion scripts? |
|---|---|---|---|---|
| Developer | ✅ (via PR) | ❌ | ❌ | ❌ |
| QA | ❌ | ✅ (via PR + scripts) | ❌ | ✅ |
| CTO | ✅ (all branches) | ✅ (all branches) | ✅ (all branches) | ✅ |

### 16.2 Promoting `dev-main` → `staging` (developer work → QA testing)

QA runs `./scripts/qa-promote-dev-to-staging.sh`. The script:

1. Verifies your working tree is clean and you're authenticated to `gh`
2. Fetches `origin`
3. Verifies both `dev-main` and `staging` exist remotely
4. Shows you how many commits `dev-main` is ahead of `staging`
5. Checks out `staging` and merges `dev-main` with this explicit strategy:
   - `staging` WINS on conflict for `frontend/.env.staging.example`, `backend/.env.staging.example`, `frontend/.env.production.example`, `backend/.env.production.example`, `frontend/vercel.json`, `render.yaml`
   - `dev-main` wins for everything else
6. Runs `gitleaks` on the merged result. Aborts if secrets are detected.
7. Pushes `staging` to `origin`
8. Opens a GitHub issue labeled `qa-round` with a QA checklist covering the critical flows

**QA never edits files during this process.** If the script fails (merge conflicts outside the protected files), QA reports back to the CTO. The CTO resolves the conflicts or asks the developer to rebase their work.

### 16.3 Promoting `staging` → `main-live` (QA sign-off → production)

After QA testing on `staging` is complete and signed off, QA runs `./scripts/qa-promote-staging-to-live.sh`. The script:

1. Same preflight + fetch
2. Shows every commit being promoted
3. Requires QA to type `PROMOTE TO PRODUCTION` literally (no silent confirmation)
4. Checks out `main-live` and merges `staging` with this strategy:
   - `main-live` WINS on conflict for `frontend/.env.production.example`, `backend/.env.production.example`, `frontend/vercel.json`, `render.yaml`
5. Runs `gitleaks`
6. Pushes `main-live` (triggers Render production + Vercel production deploys)
7. Creates an annotated git tag `release-YYYY-MM-DD-HHMM` and a GitHub Release

### 16.4 What QA is NOT allowed to do

- Edit any file on `dev-main` directly
- Open a PR whose base is `dev-main`
- Run the promotion script while `dev-main` has failing CI
- Promote `staging` → `main-live` without the full QA checklist signed off in the tracking issue
- Force-push `staging` or `main-live`
- Manually merge `dev-main` into `staging` without the script (the script has the environment-aware merge strategy — a manual merge will overwrite staging's env templates)

If QA needs to stop a promotion that already pushed, they contact the CTO immediately and do not attempt to revert themselves.

### 16.5 Failure modes

| Failure | Cause | Action |
|---|---|---|
| Script exits with "working tree is dirty" | QA has uncommitted local changes | QA must stash or discard them before promoting |
| Merge conflicts in non-protected files | Developer and QA both touched the same file | Contact CTO — developer needs to rebase |
| `gitleaks` fails | A secret was committed on `dev-main` | **DO NOT PUSH.** Run `git reset --hard origin/staging`. File an urgent issue. CTO must fix the leak on `dev-main` first. |
| Post-merge audit auto-reverts the promotion | Required checks failed on the `dev-main` commits | CTO reviews the revert PR. Developer fixes the failing checks. |

---

## 13. Revision Log

| Date | Change |
|---|---|
| 2026-04-11 | Initial document. Captures the review rules, block-comment format, branch rules enforceable on the free org plan, and the exact Claude CLI prompt used for reviews. |
| 2026-04-11 | Added §1.8 Local dev login is FROZEN, §1.9 dev-main detached from Render, §1.10 Env-driven login config + three frozen templates, §1.11 dev-main does not deploy to Vercel, §1.12 QA role separation. Added §8.9 silent regression, §8.10 broken local login, §8.11 dev-main Render coupling as historical bug entries. Added §9.6 mechanical SOP checker, §9.7 AI Breakage Detector, §9.8 directory-scoped CODEOWNERS, §9.9 post-merge audit + auto-revert, §9.10 repo-level merge settings, §9.11 Vercel deploy gating, §9.12 what's not blockable on free plan. Added §14 regression prevention architecture, §15 AI breakage prompt, §16 QA promotion SOP. |
