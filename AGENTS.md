# AGENTS.md

Instructions for any AI coding agent working in this repository — Claude Code,
Cursor, Windsurf, Copilot, Codex, Aider, Cline, or anything else.

## 🛑 Never push a stale branch

**A branch that is even one commit behind its remote is stale. There is no
acceptable number of commits to be behind other than zero.**

Before **every** `git push` — including doc-only changes, one-line fixes, and
the second and third push within the same session:

```bash
git fetch origin <branch>
git rev-list --left-right --count origin/<branch>...HEAD   # left number MUST be 0
```

If the left number is not `0`, merge `origin/<branch>` in and resolve the
conflicts **before** pushing. Never force-push past it.

A push from a stale branch is how merged work silently disappears. "I fetched
earlier in the session" is not updating: the branch moves between pushes, and a
push that succeeds only because nobody else happened to push in that window is
luck, not process.

When the update produces conflicts, take the authoritative side wholesale rather
than hand-blending two versions, then verify with
`git diff <pre-merge-sha> -- <file>`. See `docs/CODE_REVIEW_SOP.md`.

## Everything else

This file covers the one rule that must never be broken by any agent. For the
full working agreement — the design system law, frozen files, service
architecture, migrations, and the review and deploy SOPs — read:

- `CLAUDE.md` — codebase guide and the frozen-file rules
- `docs/CODE_REVIEW_SOP.md` — review rules and merge procedure
- `docs/DEVOPS_SOP.md` — branch model, promotion flow, environments
