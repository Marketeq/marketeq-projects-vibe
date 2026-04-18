---
name: review-pr
description: Do a full Code Review SOP review of a pull request and merge only if every check passes.
argument-hint: <PR number>
---

Review pull request #$ARGUMENTS using the SOPs at `docs/CODE_REVIEW_SOP.md` and `docs/DEVOPS_SOP.md`. Do a full code review and only merge the branch if it passes every one of the following checks.

1. `gh pr view $ARGUMENTS --json mergeable,mergeStateStatus,headRefName,baseRefName,title,state,author,body,files` shows state: OPEN and mergeable: MERGEABLE. If CONFLICTING or DIRTY, block with a comment and stop.

2. Save the full diff to `/tmp/pr$ARGUMENTS.diff` with `gh pr diff $ARGUMENTS > /tmp/pr$ARGUMENTS.diff` and read the entire file using the Read tool. Do not skip any part of it. Do not rely on the PR summary.

3. For every file the PR modifies, read the current version on dev-main FIRST using the Read tool, then compare against the new version. This is the only way to detect silent overrides of existing bug fixes. Never approve a change to a file you have not read in full.

4. For every exported symbol, function signature, DTO, entity, or shared component that the PR changes, search the repo with Grep to find every caller and confirm they still work. Breaking changes to existing code are an automatic block.

5. Run the seven-point checklist from §3 of the SOP:
   (1) Security — no committed secrets, private keys, open-auth bugs, SQL injection, XSS, missing JWT guards, or unscoped CORS.
   (2) Off-limits files — profile loading (SOP §1.3), login-frozen (SOP §1.4), env templates (DEVOPS_SOP §5). If any are touched, require the appropriate four-point confirmation. If missing, block. The bidirectional invariant applies: login working in one environment cannot be achieved by breaking it in another.
   (3) Breaking-change analysis — function signatures, API shapes, entity columns, removed files/props, renamed imports, shared components, preserved bug fixes.
   (4) Repo conventions — no root-level package.json, entity changes require migrations, DTOs use class-validator, inter-service via RabbitMQ, R2Service for storage, no stubs, no .DS_Store or dist/.
   (5) Standards — no new any types, no @ts-ignore without a reason, NestJS exceptions for errors, correct useEffect deps, correct Next.js route group placement.
   (6) Merge status — MERGEABLE and not >10 commits behind dev-main.
   (7) Memory/perf — no infinite loops, unbounded queries, heap risks.

6. Confirm `Scan for committed secrets` (gitleaks), `Enforce Code Review SOP` (sop-check), and `Regression risk analysis` (ai-breakage-check) are all passing. If any is failing, block immediately — do not attempt to bypass.

7. Confirm the CODEOWNERS team review has been requested and, by SOP convention, treat it as required.

8. Verify that login code in the diff reads URLs, cookie flags, and CORS origins from `process.env.*` only — zero hardcoded environment-specific values. Per SOP §1.4 and DEVOPS_SOP §6, the same committed code must run in local, dev, staging, and live with only env vars differing. Also verify no `*.onrender.com` URL has been committed into `.env.local.example`.

If every check passes, merge with `gh pr merge $ARGUMENTS --squash --delete-branch`.

Then verify with `gh pr view $ARGUMENTS --json state,mergedAt,mergeCommit`. The result must show state: MERGED with a non-null mergedAt before you tell me the PR is merged.

If ANY check fails, DO NOT MERGE. Instead, post a single consolidated block comment using the template in §7 of the SOP, listing every blocker with severity emoji, a paragraph explanation, required actions, the files you did not review line-by-line because of the blockers, and a clear "how to unblock this work" section. Sign the comment as Claude Code on behalf of @CTorres9800.

Hard rules that override everything else:
- Never override, revert, rollback, or delete existing working code.
- Never touch profile or login-frozen files without the four-point confirmation.
- Never use --admin or --no-verify to bypass checks.
- Never rebase or force-push someone else's branch unless explicitly asked.
- Never silently switch git branches during a review.
- Never tell me a PR is merged until gh pr view confirms state: MERGED.
- Only delete the branch via `gh pr merge --delete-branch` after the merge is verified.
- Preserve every existing bug fix verbatim.
- New features must never break existing working features. If you cannot prove this by reading callers, block the PR.
