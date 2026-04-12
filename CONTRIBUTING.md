# Contributing to Marketeq Projects Vibe

Welcome. This is a private NestJS + Next.js monorepo for the Marketeq freelance marketplace platform. Every contributor — human or AI agent — must follow the same rules when opening, reviewing, or merging pull requests.

## Before you start

1. **Read `docs/CODE_REVIEW_SOP.md` in full.** It is the source of truth for how PRs are reviewed and merged.
2. **Read `docs/DEVOPS_SOP.md` in full.** It is the source of truth for branch topology, env templates, and the promotion flow. Nothing in either SOP is optional.
3. Read `CLAUDE.md` at the repo root for the AI-agent-specific instructions.
4. Read the service-specific docs in `.claude/memory/services/<service>.md` for whichever service you are touching.

## Branch model

```
feature/<name>  →  dev-main    (deploys to marketeq-projects-dev on Vercel)
                     ↓ (QA green-lights)
                  staging       (deploys to marketeq-projects-staging on Vercel)
                     ↓ (QA + CTO approval)
                  live-mvp     (deploys to marketeq-projects-live-mvp on Vercel AND Render backend)
```

- All feature PRs target `dev-main`. Never target `staging` or `live-mvp` directly unless you are promoting a tested change.
- **Local development runs the backend locally** (`http://localhost:*`). A dev may connect their local frontend to Render on their own machine, but committed `.env.local.example` templates must never point at `*.onrender.com`. See DEVOPS_SOP §4.
- `dev-main`, `staging`, and `live-mvp` all deploy to their own Vercel project. Only `live-mvp` triggers the single Render backend redeploy. See DEVOPS_SOP §2 and §3.
- Every PR is squash-merged (`gh pr merge <N> --squash --delete-branch`).

## Branch naming

- `feature/<short-description>` — new features
- `fix/<short-description>` — bug fixes
- `chore/<short-description>` — tooling, CI, docs, scaffolding
- `refactor/<short-description>` — non-behavioral rewrites
- `agent/<service-name>` — automated agents working in a service-scoped worktree
- `[EPIC] feature/<name>` — oversized PRs (>2000 lines) that have explicit CTO approval for scope

## Opening a PR

Every PR must fill out the template at `.github/pull_request_template.md`. Missing sections will fail the mechanical SOP check. The template asks for:

1. **Summary** — what and why
2. **Breaking-change analysis** — every exported symbol, prop type, or API shape you changed, and every caller you verified
3. **Migration status** — any TypeORM entity change must ship with a migration
4. **QA performed** — what you actually tested locally
5. **Confirmations** — if you touched a login-frozen or profile-frozen file, the four-point confirmation from SOP §1.4 or §1.3

## What gets blocked automatically

Every PR runs through five GitHub Actions. Any red check blocks the merge by convention:

1. **SOP Check** — mechanical rules (secrets, junk files, off-limits files, env template branch mismatches, entity migrations, bidirectional hardcoded login values, oversized PRs, `@ts-ignore` justifications)
2. **AI Breakage Detector** — Claude Sonnet 4.6 reads the diff + every caller of every changed symbol and blocks on likely regressions
3. **Gitleaks** — blocks on any committed secret or PEM key
4. **AI Code Review** — advisory second opinion from Claude Sonnet 4.6
5. **CODEOWNERS auto-review** — the right reviewer is automatically requested for every file you touch

## Hard rules you cannot override

From SOP §1, paraphrased. Read the full SOP for details.

- **Never override, revert, or delete existing working code.** Preserve every bug fix verbatim.
- **Read all code before writing.** Never modify a file you haven't read in full.
- **Profile data loading is frozen** (SOP §1.3).
- **Login code is frozen and bidirectional** (SOP §1.4). If login works locally it must not break on dev/staging/live, and vice versa. Hardcoding a value that only works in one environment is the bug, not the fix.
- **Local development runs the backend locally** (DEVOPS_SOP §4). Committed `.env.local.example` templates never point at Render.
- **Login config is env-driven, never hardcoded** (SOP §1.4, DEVOPS_SOP §6). Six independent env templates: `.env.{local,staging,production}.example` × frontend/backend.
- **Incremental changes only.** Oversized PRs must be split or prefixed `[EPIC]`.
- **Repo stays private.**
- **Never silently switch branches after push.** After pushing a review, stay on that branch until acknowledged.
- **Always verify before declaring done.** "Merged" means `gh pr view --json state` returns `MERGED`.

## Optional local hooks

A `.pre-commit-config.yaml` at the repo root runs gitleaks, prettier, and eslint locally before every commit. Install with:

```bash
pip install pre-commit
pre-commit install
```

This is optional — the CI checks are the source of truth. But it will save you round trips by catching violations before you push.

## Getting help

- Open a GitHub issue for bugs or feature requests
- Tag @CTorres9800 on PRs that touch critical paths
- Tag @Marketeq/code-review on any PR you want reviewed
