# Code Review SOP — Marketeq Projects Vibe

**Owner:** @CTorres9800
**Reviewer of record:** Claude Code (on behalf of @CTorres9800)
**Applies to:** every PR targeting `dev-main`, `staging`, or `live-mvp`

**Companion doc:** `docs/DEVOPS_SOP.md` owns all deployment, branch topology, env template, and QA promotion rules. This document stays focused on code review. Do not add deployment rules here.
**Last updated:** 2026-05-22

> **CI/CD Architecture (2026-05-22):** All CI/CD runs on **Jenkins** (72.61.77.231:8080). GitHub Actions are disabled (free plan minutes exhausted). GitHub webhook delivers PR events to the Jenkins `github-webhook-dispatcher`, which runs all 5 PR gate checks in parallel and posts commit statuses (`Jenkins / SOP Check`, `Jenkins / AI Breakage Detector`, `Jenkins / Secret Scan`, `Jenkins / Login Gate`, `Jenkins / Code Review`) back to GitHub. The `.github/workflows/*.yml` files are retained as reference but disabled. Old docs archived in `docs/md/Deployment (CI-CD)/old devops docs/`.

This is the single source of truth for how pull requests are reviewed, merged, and cleaned up in this repository. Nothing in this document is optional. If any step cannot be completed, the PR **does not merge**.

---

## 1. Non-Negotiable Rules

These rules override everything else in this SOP. If a PR violates any of them, it is blocked regardless of the quality of the feature work inside it.

### 1.1 Never override or delete existing working code
- **Preserve every bug fix.** If a PR rewrites a file that already contains a fix, the fix must survive the rewrite verbatim. If it doesn't, the PR is blocked.
- **No reverts, rollbacks, or "unnecessarily replacing" working code.** Fix forward only.
- **Additive merges only** when syncing from the original `marketeq-projects-nestjs` repo. Never replace vibe code.
- When in doubt, read the full existing file before accepting any diff against it.

**The standard for any change to existing code: better is fine, worse is not.**
This is a floor, not a bar to clear. A rewrite may improve the code freely and needs no justification for being an improvement — you are not asked to judge whether it is *enough* better, and you lack the design file and ticket to make that call anyway (§1.10). The only question is whether anything got **worse than the previous version**: a behavior, branch, guard, null check, error path, or edge case that the old code had and the new code does not. Nothing lost → fine, ship it. Something lost → not fine, regardless of how much cleaner the rest is. Run the coverage test in §15 to decide, and never substitute a general impression of quality for it.

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

### 1.4 Login files are PERMANENTLY LOCKED — CTO ONLY, NO EXCEPTIONS

**ABSOLUTE HARD BLOCK: Nobody is allowed to change login/auth files. Ever. Period.**

Login is working. Every single login regression in this repo's history happened because someone opened a ticket, touched login files, and broke everything. This will never happen again. The login files listed below are permanently locked. No developer, no contractor, no agent, no ticket, no feature request overrides this rule. Only the CTO (@CTorres9800) may modify these files, and only by pushing directly or approving a PR with an explicit review.

**If a PR touches ANY of these files and the author is not @CTorres9800, the PR is BLOCKED. No four-point confirmation makes it OK. No justification makes it OK. The PR does not merge.**

**Permanently locked files:**

- `frontend/app/top-most-header.tsx` — the single master navigation bar component. No replacements, no duplicates, no deletions. The shadow and gap-free layout between primary and secondary nav is intentional and must never be reverted.
- `frontend/components/navigation/marketplace-secondary-nav.tsx` — part of the master nav bar unit. The negative margin overlap and shadow placement are intentional fixes. Never overwrite.
- `frontend/components/auth/auth-modal.tsx` — the auth modal for in-marketplace login/signup. Marketplace login MUST use this modal, never redirect to `/sign-in`. See §1.4.1.
- `frontend/hoc/AuthenticatedRoute.tsx` — opens auth modal for unauthenticated users. Must call `openAuthModal()`, never `router.push("/sign-in")`. See §1.4.1.
- `frontend/hoc/UnauthenticatedRoute.tsx`
- `frontend/app/sign-in/**`, `frontend/app/sign-up/**`
- `frontend/app/forgot-password/**`, `frontend/app/reset-password/**`
- `frontend/contexts/auth.tsx`
- `frontend/service/http/auth.ts`
- `frontend/src/lib/api/auth.ts`
- `frontend/middleware.ts`
- `frontend/components/auth/**` (all auth components)
- `backend/apps/auth-service/**`
- `backend/apps/user-service/src/guards/**`
- `backend/apps/api-gateway/src/proxy/proxy.service.ts`
- `backend/libs/shared/src/guards/**`, `backend/libs/shared/src/decorators/**`
- Any of the six frozen env templates: `frontend/.env.{local,staging,production}.example`, `backend/.env.{local,staging,production}.example`
**Granting a temporary unlock.** Frozen files are locked for everyone except @CTorres9800. When someone genuinely needs to touch one, @CTorres9800 adds the `frozen-unlock` label to that specific PR. Labelling requires write access, so a contributor cannot grant it to themselves, and it applies to that PR only — it is not a standing exemption and does not carry to the next one. The SOP check then reports the unlock instead of blocking, and reviewers are expected to scrutinise those diffs as closely as the original work: no refactors, no restyling, no copy changes beyond what was approved.

- `frontend/app/(group)/job-screening/page.tsx` — the view applicants screen. Locked 2026-08-26.
  - **Frozen specifically:** the applicant list and cards, filters and sorting, status handling, empty states, layout and spacing, and every user-facing string.
  - **The only permitted change:** backend wiring that alters no class name, element, timing, or string.
  - Anything else requires explicit @CTorres9800 approval.

- `frontend/app/(group)/billing/**` — the entire billing tree. Locked 2026-08-26. Covers `page.tsx`, `transactions/`, `invoices/`, `my-plans/`, and `payment-methods/`.
  - **Frozen specifically:** layout, table columns and their order, status badges, currency and date formatting, empty states, filters, pagination, and every user-facing string. These screens show people money; a cosmetic change that misstates an amount, a currency, or a status is a financial defect, not a styling one.
  - **The only permitted change:** backend wiring that alters no class name, element, timing, or string.
  - Anything else requires explicit @CTorres9800 approval.

- `frontend/app/(group)/onboarding/**` — the entire onboarding flow. Locked 2026-08-26, enforced **directory-wide**. Covers the role picker (`page.tsx`), `talent/page.tsx`, `client/page.tsx`, and **every other file under that path, including files that do not exist yet**. Adding a new file inside the onboarding tree does not route around the freeze — the SOP check matches the directory, not a list of filenames. Rebuilt end to end in one session after a long period of accumulated defects; every value in it was set deliberately.
  - **Frozen specifically:** the five talent steps and their order, the step registry and numbering, the resume upload step and its reading modal (skeleton shimmer, extraction feed, summary rows and counts, Done button, all six error states and their exact copy), the autofill mapping from parse result into `stepData`, the avatar empty state (initials when a name is known, icon otherwise), every validation guard and error message, and all animation timings.
  - **The only permitted change:** backend wiring that alters no class name, element, timing, or string.
  - Anything else requires explicit @CTorres9800 approval.
- **The Taxes screens** — `frontend/components/settings-tax-info.tsx` and `backend/apps/user-service/src/tax-info/**`, the latter enforced **directory-wide**. Locked 2026-08-29. These produce real IRS documents from real taxpayer data; a cosmetic change that alters a certification string, a validation rule, or a PDF field mapping is a tax defect, not a styling one.
  - **Frozen specifically:** the W-9 and W-8BEN certification text and its US/non-US switching, every validation rule and error message, the read-only today-only signing date, the completeness rules that decide when a form may be submitted, the TIN encryption and the last-4 masking, the verified IRS PDF field maps, the guards that refuse to produce an incomplete form or a Copy A, and every user-facing string on the screen.
  - **Why the field maps matter:** they were derived by filling the official IRS forms and rendering the output, not by inference. A plausible-looking edit to a field name silently writes a value into the wrong box on a government form, and nothing fails.
  - **The only permitted change:** backend wiring that alters no class name, element, timing, string, or PDF field mapping.
  - Anything else requires explicit @CTorres9800 approval.

- **The login and account sign-up surface** — locked, enforced directory-wide, no exceptions. Covers `frontend/app/sign-in/**`, `frontend/app/sign-up/**`, `frontend/app/forgot-password/**`, `frontend/app/reset-password/**`, `frontend/components/auth/**`, `frontend/contexts/auth.tsx`, `frontend/service/http/auth.ts`, `frontend/src/lib/api/auth.ts`, `frontend/hoc/AuthenticatedRoute.tsx`, `frontend/hoc/UnauthenticatedRoute.tsx`, and `backend/apps/auth-service/**`.
  - These were previously covered by CODEOWNERS only, which auto-requests review but cannot block on the free org plan. They are now in the SOP check's frozen list, so a PR touching them fails mechanically.
  - **Frozen specifically:** every field, label, placeholder, button, validation rule and message, social-login button and its ordering, redirect target, session and cookie handling, and every user-facing string.
  - Nobody but @CTorres9800 may touch these. No tickets, no exceptions. Close login tickets rather than assigning them.


- `frontend/app/(group)/active-project/[id]/page.tsx` — the active project task screen. Locked 2026-08-22. Covers the task tables, pinned section bars and column headers, the bulk-select bar, the create/edit task dialog, the checklist, the attachments views, and the components defined in this file (`AssigneePicker`, `TaskStatusMenu`, `TaskDueDatePicker`, `SortableTaskRow`, `StickySectionBar`). Every spacing, sticky offset, hover shade, and border position in this screen was set deliberately after extensive correction. No refactors, no cleanup, no restyling. Surgical edits only, and only with explicit @CTorres9800 approval.
  - **Frozen specifically:** all markup, layout, spacing, hover states, borders, sticky offsets, and **transitions/animations** (section collapse slides, folder row slide, row reveal, drag states, toast and tooltip timing). Do not retime, replace, or remove any transition.
  - **The only permitted change:** wiring these components to backend APIs — swapping the seeded arrays for real data, adding fetch/mutation calls, and hooking up handlers that are currently no-ops. Data wiring must not alter a single class name, element, or transition.

**Enforcement layers (all active, all blocking):**

1. **`.github/CODEOWNERS`** — requires @CTorres9800 review on all login/auth file paths
2. **Login Gate workflow** (`.github/workflows/login-gate.yml`) — CI hard-blocks any PR to `dev-main`, `staging`, or `live` that touches login files unless @CTorres9800 is the author or has submitted an Approved review
3. **Jenkins SOP Check** — auto-labels `login-touched`, posts sticky comment, auto-requests @CTorres9800
4. **Post-merge audit** — opens an urgent issue for merges that bypassed the login gate. Report only; it never modifies code.
5. **Login violation alert** — opens issues when login files are merged without owner approval
6. **This SOP** — any Claude Code agent reviewing a PR MUST block it if login files are touched by anyone other than @CTorres9800

**What to do if someone creates a login-related ticket:**
- Close the ticket. Login is not open for changes.
- If there is a genuine login bug, only @CTorres9800 diagnoses and fixes it.
- If a feature requires auth changes, only @CTorres9800 implements the auth portion.

**No hardcoded env values** in login code. Block any PR that adds a literal `*.onrender.com` URL, a literal `sameSite:` / `secure:` flag, a literal CORS origin string, or a literal JWT secret inside the locked files. All values come from `process.env.*`.

**The bidirectional invariant (said plainly, because this is the real pain):**

> If login works locally, a PR must not break login on Vercel dev / staging / live.
> If login works on Vercel dev / staging / live, a PR must not break login locally.
> "Fixing" login in one environment by hardcoding a value that only works there is **the bug**, not the fix.

Every login regression in this repo's history has been a violation of this invariant: someone changed a hardcoded cookie flag, or a hardcoded backend URL, or a hardcoded CORS origin, in one environment to make that environment work -- and silently broke the others. The only code that satisfies the invariant is code that reads every environment-specific value from `process.env.*` and has **zero** literals for URLs, cookie flags, CORS origins, or JWT material in the locked files.

**Everything else about the login/env topology -- Render wiring, Vercel deploy gating, env template ownership, branch-to-template mapping -- lives in `docs/DEVOPS_SOP.md`. Do not duplicate those rules here.**

### 1.4.1 Auth modal login flow is FROZEN — block any PR that changes it

The marketplace uses a **dual login flow** that must never be changed:

1. **Marketplace (in-app):** When a logged-out user clicks any protected feature (Dashboard, profile, etc.) or clicks Sign In / Sign Up in the nav bar, a **popup modal** opens on the current page. The user never leaves the page they're on. This is powered by:
   - `frontend/components/auth/auth-modal.tsx` — the AuthModal component with SignInForm and SignUpForm
   - `frontend/contexts/auth.tsx` — exposes `openAuthModal()` / `closeAuthModal()` via AuthContext
   - `frontend/hoc/AuthenticatedRoute.tsx` — calls `openAuthModal("sign-in")` instead of redirecting to `/sign-in`
   - `frontend/app/top-most-header.tsx` — nav bar buttons call `openAuthModal()` for logged-out users

2. **Marketing website:** When a user clicks Login/Sign Up from the marketing website (marketeqdigital.com), they navigate to the full `/sign-in` or `/sign-up` page with the sidebar layout.

**Block any PR that:**
- Replaces `openAuthModal()` with `router.push("/sign-in")` in `AuthenticatedRoute.tsx`
- Removes or bypasses the auth modal in favor of page navigation within the marketplace
- Removes `authModalOpen` / `openAuthModal` / `closeAuthModal` from the AuthContext
- Deletes or guts `auth-modal.tsx`
- Changes the nav bar to navigate to `/sign-in` instead of opening the modal

**These files are frozen for this purpose** (in addition to §1.4 frozen rules):
- `frontend/components/auth/auth-modal.tsx`
- `frontend/hoc/AuthenticatedRoute.tsx`

### 1.5 Incremental changes only
- No mega-PRs that mix unrelated concerns (e.g., "fix login" should not also include a CSS refactor).
- If a PR contains unrelated changes, request that the author split it.

### 1.6 Repo must stay private
- Do not publish, make public, or fork this repo publicly as part of a review.
- The repo may be temporarily toggled public only for Vercel free-tier deploy workarounds by the owner — never by a reviewer.

### 1.7 Never silently switch branches during review
- If reviewing on a local checkout requires switching branches, tell the user first.
- After pushing any review commit, **stay on that branch** until the user acknowledges. Do not `git checkout` elsewhere silently.

### 1.8 Always verify before declaring done
- "Merged" means: squash-merge landed on `dev-main`, branch deleted, and a sanity check that `dev-main` still builds.
- Do not tell the user a PR is merged until `gh pr view N --json state,mergedAt` returns `"MERGED"`.

### 1.9 Only the author or the CTO may authorize deleting the author's work
Deleting good code is a worse outcome than shipping a bug. A bug gets fixed; deleted work gets rebuilt from scratch, or silently never comes back.

- **Code the PR ADDED is not reviewable for removal.** It is the developer's deliberate new work. A reviewer may ask what it is for. A reviewer may not recommend removing it, and no approval of such a recommendation is valid from anyone other than its author.
- **A reviewer's approval is not authority.** "Go ahead and make the fixes" from a code-review engineer, a DevOps engineer, or an agent does NOT authorize deleting a feature. Only the author of the code, or @CTorres9800, can authorize that. Anyone reviewing without the design file, the ticket, and the spec is not in a position to consent to a deletion on the author's behalf.
- **Nothing may remove a developer's merged code** — no workflow, script, button, or agent, automatically or by a single click. A failing check, a bad merge, or an SOP bypass is fixed **forward**: keep the code, open a follow-up, fix it (§1.1). The post-merge audit reports; it never modifies code. See §9.9.
- **Findings that turn on intent go to the author, not to a gatekeeper.** The author knows why the code is that way; a third party is guessing, and a guess with merge rights deletes things.

### 1.11 Automation never changes a developer's code

No Jenkins pipeline, GitHub workflow, script, bot, or agent may **destroy** work a developer wrote. The test is not whether automation touched the branch — it is whether anything the author wrote could be lost.

**Allowed — non-destructive, safe to automate:**
- **Bringing a stale branch current with a merge commit.** `gh pr update-branch <N>` (no flag) adds a merge commit on top. Every existing commit survives, nothing is force-pushed, no history is rewritten. Automate this freely.

**Forbidden — destructive:**
- **`--rebase`, `git rebase`, or any force-push on the author's branch.** These rewrite the author's commits. The content may survive, but their history does not, and a force-push can drop work pushed between the read and the write.
- **Auto-resolving a conflict.** Choosing a side deletes the other side's work, and nothing in the result shows what went missing.
- **Auto-fixes or auto-formatting** pushed to their branch.
- **Reverts** (§1.1).

**On conflicts, automation checks which side is better. It does not choose, and it does not edit.** A non-destructive update stops when it hits a conflict, which is correct — that is where a human is genuinely needed. Analyse in a local scratch merge that is thrown away (§3.6), run the per-hunk test in §5.1 to see whether either side would lose behaviour, and **report the finding to the author**. The author resolves their own conflict, better informed than they were before.

The reason is simple: a pipeline has no design file, no ticket, and no spec, so it cannot know which side of a conflict was intended. A pipeline that edits code it cannot judge will eventually delete work that was there on purpose, and the developer gets blamed for a deletion they did not make.

### 1.12 A page you were sent to look at is READ-ONLY

When you are pointed at another page, screen, or component — to copy it, to match a width, spacing, colour, animation, or behaviour, or just to see how it works — **that source is read-only for that task**. Read it, take what you need, apply it where the work actually belongs, and leave the source byte-for-byte unchanged.

This holds for every phrasing of the instruction: "copy the X from Y", "check how Y does it", "look at Y", "match Y's width", "see Y for reference". The destination changes. The reference does not.

It holds **even when the source looks wrong**. Inconsistent spacing, a stale class, a value you would have written differently, an obvious cleanup — none of these are yours to fix on the way past. The screen works today, and an unrequested edit to a working screen is exactly the kind of change nobody asked for and nobody reviews carefully, because the PR is titled after the destination.

**Reviewers:** if a PR's stated purpose is a change to page A, and the diff also touches page B where B is the thing being copied or measured, block it and ask why B changed. The answer is almost always "I tidied it while I was in there."

If the source genuinely needs a change, say so in the PR or to the CTO and let them decide. Do not make it.

### 1.13 Security sprint PRs are backend-only — zero frontend changes

Security sprints produce backend-only code. PRs authored by security sprint engineers **must not touch any file under `frontend/`**. If they do, block the PR immediately with:

> **BLOCKED — Security sprint PR contains frontend changes.**
> Security sprints are scoped to backend only. Please remove all changes under `frontend/` and resubmit. No frontend files may be added, modified, or deleted in a security sprint PR.

**Current security sprint authors:** `SomiLA1`. To add more authors, update the `SECURITY_SPRINT_AUTHORS` list in `.jenkins/sop-check.groovy` Section 10.

This is non-negotiable. Even a one-line frontend change from a security sprint author is a block. The developer must split the work: backend changes in the security sprint PR, frontend changes (if any are needed) in a separate PR by a non-security-sprint engineer that goes through normal review.

**Reviewers:** if the PR author is a security sprint engineer, check the file list first. If any path starts with `frontend/`, stop and block before reviewing any backend code.

### 1.10 Every blocking rule needs evidence behind it
A rule that blocks a PR must be traceable to something factual: a named surviving caller, a failing check, a contract in `REGRESSION_MANIFEST.json`, or a specific incident in §8. Strictness with no evidence behind it produces false blocks, and false blocks cost the developer real work.

- If a threshold is stated as a number, the number needs a reason. Otherwise use the decidable form (`>= 1 behind` is decidable; `> 5 behind` is a guess about how much drift is tolerable).
- "When in doubt, block" applies to **evidence you have not yet gathered** — an unread caller, an unrun check. It does not license blocking on a hunch. If you cannot name what would confirm the finding, it is not a finding.
- Prefer a question to the author over a block whenever the answer depends on intent rather than on code.

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

### ✅ 3.6 Merge-conflict status and branch freshness
- [ ] `mergeable: MERGEABLE` in `gh pr view`. If `CONFLICTING`, the PR cannot merge — see §5.
- [ ] **Branch must be at zero commits behind its base before merge.** Check, do not fix:
  ```bash
  gh api repos/Marketeq/marketeq-projects-vibe/compare/<base>...<head> --jq '.behind_by'
  ```
  **If `behind_by` >= 1, block and tell the author to update their branch.** Do NOT use `--admin` to bypass this.
- [ ] **Bring it current non-destructively, or not at all (§1.11).** `gh pr update-branch <NUMBER>` with **no flag** is a merge commit: every author commit survives, nothing is force-pushed. That is safe to run automatically. **Never pass `--rebase`** and never force-push — those rewrite the author's commits. If the update stops on a conflict, that is correct: report it, do not resolve it.
- [ ] **Review a current tree, produced locally and thrown away.** To analyse a stale branch, merge the base into it in a scratch checkout, read the result, then discard it:
  ```bash
  git fetch origin <base>
  git checkout -B scratch-review origin/<head>
  git merge --no-commit --no-ff origin/<base>   # local only, never pushed
  # ... analyse, note conflicts ...
  git merge --abort && git branch -D scratch-review
  ```
  This gives you a current view without touching anything the author owns. Conflicts found this way are **reported** to the author, never resolved on their behalf.
- [ ] **NEVER merge a stale branch.** A squash merge from a stale branch silently overwrites any changes made to the same files on the base branch since the branch point. This has caused code loss in this repo. See §8.11.

### ✅ 3.7 Memory & performance
- [ ] No new infinite loops, unbounded queries, or `while(true)` without break conditions.
- [ ] No heap-explosion risks (per the standing memory-usage rule — the dev environment has crashed three times already).

---

### ✅ 3.8 Security sprint PR checklist (SomiLA1 and future security sprint authors only)

When the PR author is a security sprint engineer (see §1.13), run these additional checks ON TOP of the standard seven-point checklist. Security hardening is high-risk for silent breakage because the code compiles and looks correct but changes runtime behavior.

- [ ] **Zero frontend files.** If any path starts with `frontend/`, stop immediately (§1.13).
- [ ] **Guard changes do not block legitimate requests.** For every new or modified guard:
  - Trace which endpoints use it (decorator or global registration).
  - Confirm authenticated users with valid JWTs still pass.
  - Confirm public endpoints (marketplace browse, health checks) are not affected.
- [ ] **DTO validation tightening does not reject working requests.** For every new validation decorator:
  - Check if the frontend currently sends empty strings, nulls, or optional fields for that property.
  - A new `@IsNotEmpty()` on a field the frontend sends as `""` is a 400 error on a working form.
  - A new `@MaxLength(N)` must be longer than any existing stored value for that column.
- [ ] **Response shape unchanged.** For every changed service method or controller:
  - Diff the return type / selected fields before and after.
  - If a serialization interceptor or `@Exclude()` decorator was added, verify no fields the frontend reads were hidden.
  - Cross-reference with `REGRESSION_MANIFEST.json` `api_contracts` section.
- [ ] **Error shapes and status codes unchanged.** Security changes often swap error types:
  - 401 vs 403 vs 404 matters -- the frontend handles them differently.
  - Error response body shape (`{ message }` vs `{ error }`) must stay consistent.
- [ ] **No encryption/hashing algorithm changes without migration.** Changing bcrypt rounds, JWT signing algorithm, or encryption method without re-processing stored data locks users out. E2EE rotation incident (2026-08-19) is precedent.
- [ ] **Database constraints are safe.** New NOT NULL, UNIQUE, or CHECK constraints must not conflict with existing rows. Verify with: `SELECT COUNT(*) FROM table WHERE column IS NULL` (or equivalent).
- [ ] **Middleware ordering is safe.** New global middleware (rate limiting, CORS, helmet) must not interfere with:
  - Vercel preview URL CORS patterns
  - File upload endpoints (multipart)
  - WebSocket connections (Ably, messaging)
  - Health check endpoints (must remain unauthenticated)

**How breakage is caught:** The Deep Regression Check (§15) reads the `security_sprint_breakage_patterns` section of `REGRESSION_MANIFEST.json` and applies heightened scrutiny to PRs touching guard, middleware, DTO, interceptor, and encryption files. The SOP Check (§1.13) blocks frontend changes mechanically. This checklist is for the human/AI code reviewer to catch what automated checks cannot.

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

### 4.1 Selective Merge — never waste code

When a PR has **mixed quality** (some good code, some violations), **never close the entire PR**. Instead:

1. **Cherry-pick the good code** — manually apply usable changes (backend logic, data wiring, API endpoints, bug fixes) to `dev-main`
2. **Reject only the specific violations** — security issues, off-limits/frozen-file changes, and layout changes that meet the manifest's scope (a data-wiring or content PR altering structure on a `layout_frozen_patterns` file). A layout change in a fix, polish, or feature PR is the developer's call and is **not** a violation: you do not have the design file and cannot tell a deliberate layout fix from collateral. Ask the author instead of rejecting.
3. **Close the PR** with a comment listing exactly what was merged and what was rejected, with line references

Code takes time and money to write. Closing an entire PR because of one bad file wastes all the good work in it. Always extract value before closing.

---

## 5. Handling Conflicts and Unmergeable Branches

A branch cannot merge when any of these are true:
- `mergeable: CONFLICTING`
- `mergeStateStatus: DIRTY`
- `state: CLOSED` or `DRAFT` with explicit `[DO NOT MERGE]`
- The `Scan for committed secrets` gitleaks check is ❌
- Any required CODEOWNER review is missing (see §9)

**The reviewer may bring the branch current non-destructively (`gh pr update-branch`, no flag), but never rebases, force-pushes, or resolves the author's conflicts (§1.11).** Conflicts are the author's to resolve. Your job is to analyse them in a local scratch merge (§3.6), determine per hunk whether either side would lose behaviour, and **report what you found** so the author can resolve it with that information in hand.

Post a block comment (§7) with what each conflicting hunk contains, which side holds what, and the commands the author should run. Apply §5.1's per-hunk test when analysing, not when editing:

```bash
git fetch origin dev-main
git rebase origin/dev-main
# resolve conflicts one at a time — see §5.1
git push --force-with-lease
```

### 5.1 Resolving conflicts — one at a time, preserving the engineer's work

A merge conflict is where code silently disappears in this repo. Never resolve one in bulk. **`git checkout --ours` / `--theirs` across a file, "accept all incoming", and re-running a generator over the whole file are all forbidden.** Each is a way of deleting one side's work without reading it.

Work **one conflict hunk at a time**. For each hunk, both sides are real work by a real person. Before writing the resolution, answer both:

1. **Does either side break a feature?** Run the coverage test (§15) in both directions: list every behavior on the branch side and find it on the base side, then list every behavior on the base side and find it on the branch side. Anything present on one side and missing from the resolution is a deleted feature. The resolution must carry **both** sides' behaviors unless they genuinely contradict.
2. **If the two sides genuinely contradict, is the surviving side worse than what it replaces?** Better is fine and needs no defense (§1.1). Worse is not, no matter how much cleaner it reads. One side wins only when it loses nothing the other had, or when the author states the reason it should. "It came later," "it's cleaner," and "it's what the base has" are not reasons. Record the reason in the PR comment.

Defaults when the answer is not clear from the code:
- **Preserve the engineer's work.** Ambiguity resolves toward keeping code, never toward dropping it.
- **Ask the author.** They know why their side is written that way; you are guessing (§1.9).
- **Never resolve a conflict by deleting either side to make it go away.** That is the single most expensive mistake available here — the conflict is visible, the deletion is not.

After resolving, state in the PR comment which hunks conflicted, what each side did, and what the resolution kept. If a conflict was resolved by dropping something, it must be named explicitly and approved by the author or @CTorres9800.

---

## 6. How to Merge — the only approved procedure

Once the checklist passes and the PR is `MERGEABLE`, **verify the branch is up to date first**:

```bash
# Check how far behind the branch is
gh api repos/Marketeq/marketeq-projects-vibe/compare/<base>...<head> --jq '.behind_by'
# If behind_by >= 1, bring it current non-destructively (merge commit):
gh pr update-branch <NUMBER>     # NO --rebase, ever. See SS1.11.
# Every author commit survives; nothing is force-pushed.
# If it stops on a conflict, report the conflict -- do not resolve it.
```

Only after the branch is up to date, merge with:

```bash
# Full merge (all code in the PR is being merged):
gh pr merge <NUMBER> --squash --delete-branch

# Cherry-pick or partial merge (only some commits/changes taken):
gh pr merge <NUMBER> --squash
# Do NOT use --delete-branch — the source branch may still have unmerged work
```

**Branch deletion rule:** Only delete a branch when merging ALL of its code. If you are cherry-picking, partially merging, or not taking every change from the branch, keep the original branch intact.

**Never:**
- `--admin` (bypasses checks) — **HARD BLOCK, no exceptions unless CTO explicitly types "use --admin"**
- `--merge` (no commit-squashing — pollutes history)
- `--rebase` without user approval
- Skip `--delete-branch` — stale branches accumulate
- Merge a branch that is behind the base — **this causes silent code loss** (see §8.11)
- Delete a branch that still has unmerged work

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

Branches are only deleted when ALL code from the branch has been merged. If a cherry-pick or partial merge was done, the branch must be kept. **Do not manually `git push origin --delete` remote branches** unless the user explicitly tells you to.

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

### 8.11 Silent code loss from stale branch squash merges (the #3 recurring bug)
A feature branch is created from `dev-main` at commit A. Meanwhile, 20+ commits land on `dev-main` (commits B through T), modifying files X, Y, Z. The feature branch also modifies files X and Y. The branch is squash-merged **without rebasing** — GitHub creates a single commit on `dev-main` that contains the feature branch's version of X and Y, silently overwriting the changes from commits B-T on those same files. The code from B-T on files X and Y is now gone. There is no merge conflict because squash merges do not compare against intermediate commits.

**This has caused actual code loss in this repo.** Audit of PRs #296-#324 found branches merged 40-68 commits behind their base.

**Prevention:**
- §3.6 now requires branches to be up to date before merge
- `--admin` is hard-blocked (no exceptions without CTO typing the words)
- Never duplicate commits across branches (commit to dev-main first, promote to staging, promote to live-mvp)
- Never push directly to staging or live-mvp with separate commits

### 8.10 Broken login after a cross-environment "fix" (the #2 recurring bug)
A PR modifies `sign-in/page.tsx`, `contexts/auth.tsx`, `auth-service`, or a guard decorator to "fix login" in one environment. The feature work is fine for the author's environment but silently breaks login in the others — typically because the fix hardcoded a cookie flag, a backend URL, a CORS origin, or a JWT setting that only works in the author's environment. Every instance of this bug in the repo's history has been a violation of the bidirectional invariant in §1.4: *fixing login in any one environment must never break any other environment*. PRs touching login-frozen files are automatically labeled `login-touched`, post a sentinel comment, and auto-request CTO review. GitHub Actions `sop-check` workflow also fails the PR on any hardcoded URL, cookie flag, CORS origin, or JWT secret in a frozen file.

---

## 9. Branch Rules We Can Actually Enforce (Free Org Plan)

GitHub's classic branch protection, rulesets, and native push protection **all require GitHub Team or GHAS** on private organization repos. This repo is on the free org plan, so we enforce protection through **CI checks and conventions** instead. Everything below is live as of 2026-04-11.

### 9.1 Gitleaks secret scanning — **ENFORCED**
- **Workflow:** GitHub Actions `gitleaks`
- **Config:** `.gitleaks.toml` (extends default ruleset + adds PEM private-key and `.env` file rules)
- **Triggers:** every PR to any branch, plus every push to `dev-main`, `staging`, `live-mvp`
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

### 9.4 AI Code Review — **ENFORCED (advisory)**
- **Workflow:** GitHub Actions `code-review`
- **Triggers:** PRs targeting `dev-main`, `staging`, or `live-mvp`
- **Behavior:** posts an AI-generated review comment using Claude Sonnet 4.6. Treat its findings as a second opinion, not as authoritative.

### 9.6 Mechanical SOP Checker — **ENFORCED (blocking)**
- **Pipeline:** GitHub Actions `sop-check` workflow
- **Triggers:** every PR (opened, synchronize, reopened, edited)
- **Behavior:** runs ~10 mechanical checks derived from this SOP and fails the check on any violation. Posts a single consolidated comment listing every violation with SOP section references. Specifically blocks:
  - Committed `*.pem`, `*.key`, `*.p12`, `*.pfx`, `.env`, `.env.*` files
  - Embedded PEM private-key headers in any added file
  - Root-level `package.json` / `package-lock.json` / `yarn.lock`
  - Off-limits profile files touched without the four-point confirmation (§1.3)
  - Login/auth files touched by anyone other than @CTorres9800 — ABSOLUTE BLOCK, no exceptions (§1.4)
  - Any hardcoded URL, cookie flag, CORS origin, or JWT secret inside a locked login file — bidirectional (§1.4)
  - TypeORM entity changes without a matching migration
  - Env template branch mismatches — `*.local.example` only on `dev-main`, `*.staging.example` only on `staging`, `*.production.example` only on `live-mvp` (see `docs/DEVOPS_SOP.md` §5.2)
  - Junk files (`.DS_Store`, `dist/`, `build/`, `node_modules/`, `.next/`)
  - Raw `throw new Error()` in backend code
  - `--no-verify` or `gh pr merge --admin` in scripts
  - Oversized PRs (>2000 lines) without `[EPIC]` prefix
  - New `@ts-ignore` without a `-- justification` comment
  - **Stale branches:** PR branch is more than 5 commits behind the base branch — blocks with "Rebase required" message
- **Login sentinel:** if any locked login file is touched, the workflow auto-labels `login-touched`, auto-requests @CTorres9800, and posts a sticky comment. If the PR author is not @CTorres9800, the PR is HARD BLOCKED — no confirmation or justification overrides this. See §1.4.

### 9.7 AI Breakage Detector — **ENFORCED (blocking)**
- **Workflow:** GitHub Actions `ai-breakage-check`
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

### 9.9 Post-Merge SOP Audit — **ENFORCED (post-hoc, reporting only)**
- **Workflow:** GitHub Actions `post-merge-audit` (+ Jenkins safety net)
- **Triggers:** `push` event on `dev-main`, `staging`, `live-mvp` (i.e., fires the moment a merge lands)
- **Behavior:** this workflow makes a bypass **visible**. It reports; it never undoes. See §1.1 and §1.9.
  1. Finds the PR associated with the push
  2. Reads the status of every required check (`Enforce Code Review SOP`, `Regression risk analysis`, `Scan for committed secrets`) via `gh pr view --json statusCheckRollup`
  3. If any required check is `FAILURE`, `CANCELLED`, `TIMED_OUT`, or missing → opens an urgent issue assigned to @CTorres9800 naming the PR, the failing check, and the merge author
  4. Posts a sticky 🚨 `MERGED DESPITE FAILING SOP CHECKS` comment on the original PR, naming the merge author publicly
  5. Also detects forced pushes (`github.event.forced == true`) and opens an urgent issue assigned to CTO
  6. Also detects direct pushes with no associated PR and opens an urgent issue assigned to CTO
- **REPORT ONLY. This workflow never modifies code, and must never be changed to.** Nothing else in this repo may either — no workflow, no script, no button, no DevOps engineer, no agent. A failing check means the work needs a **forward fix**, not deletion. The remedy is always: keep the code, open a follow-up, fix it forward (§1.1).
- **Why reporting is enough:** a developer can technically click Merge despite a red check on the free plan. Within ~60–120 seconds the bypass is publicly named and assigned to the CTO. That makes it visible and auditable, which is the goal. Deleting the work to punish a process violation destroys the feature along with the violation (§1.1).

### 9.10 Repo-level merge settings — **ENFORCED (server-side)**
Applied via `gh api -X PATCH repos/Marketeq/marketeq-projects-vibe`:
- `allow_merge_commit: false` — merge commits disabled at the server; the option is not shown in the UI
- `allow_rebase_merge: false` — rebase merges disabled; only squash-merge is available
- `allow_squash_merge: true` — the only allowed merge type
- `delete_branch_on_merge: true` — merged branches are auto-deleted
These are enforced by GitHub itself. Developers cannot bypass them without admin UI access.

### 9.11 Vercel deploy gating — **ENFORCED (server-side via Vercel)**
`frontend/vercel.json` disables preview deployments for feature branch patterns (`feat/*`, `fix/*`, `chore/*`, `refactor/*`, `agent/*`) and leaves `dev-main`, `staging`, and `live-mvp` enabled — each of those is the production branch of its own Vercel project. Full topology in `docs/DEVOPS_SOP.md` §2.

### 9.12 What is NOT technically blockable on free org plan
The following require GitHub Team or higher and are therefore unavailable today:
- Pre-merge blocking on failing status checks
- Server-side force-push prevention
- Server-side branch deletion prevention
- Required code-owner reviews enforced by GitHub itself
- Required conversation resolution enforced by GitHub itself

**We do not upgrade.** Instead, all of the above are enforced post-hoc by §9.9 (reporting) and by the reviewer discipline codified in this SOP. Merging despite a failing check is technically possible but is immediately flagged publicly and assigned to the CTO for a forward fix.

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
   (6) Branch freshness — MERGEABLE and zero commits behind base.
       Check behind_by. If >= 1, run `gh pr update-branch <N>` with NO
       flag (merge commit, non-destructive). NEVER pass --rebase and
       never force-push (SS1.11). If it stops on a conflict, report the
       conflict; do not resolve it. NEVER use --admin.
   (7) Memory/perf — no infinite loops, unbounded queries, heap risks.

6. Confirm the gitleaks "Scan for committed secrets" check is passing.
   If it is failing, block immediately — do not attempt to bypass it.

7. Confirm the CODEOWNERS team review has been requested (it is
   automatic) and, by SOP convention, treat it as required.

If every check passes, merge with:
  gh pr merge <N> --squash --delete-branch
  # Only use --delete-branch when merging ALL code from the branch.
  # For cherry-picks or partial merges, omit --delete-branch.

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

Scope limits on what you may report (see §1.9 and §1.10):
- You may only report on code that existed BEFORE this PR. Code this
  PR added is the developer's deliberate new work. Ask what it is for;
  never recommend removing it.
- Every finding must quote the two conflicting lines, or the
  code-vs-interface mismatch. No citation, no finding.
- Before reporting a missing guard, validator, or handler, grep for a
  global/framework-level equivalent (APP_GUARD, middleware,
  interceptor, base class). Absence at the decorator is not absence.
- Do not report on naming, casing, style, copy, product scope, layout
  outside the manifest's scope, or performance you have not measured.
  Each of these needs the design file, the ticket, or a benchmark, and
  you have none of them.
- For rewritten pre-existing code, run the coverage test: list every
  behavior of the old code and name the new line providing it, or mark
  it MISSING. Report only MISSING. If nothing is missing, stay silent —
  whether the rewrite is better is the developer's call, not yours.
- A false finding costs the developer real work and risks deleting good
  code. That is worse than a missed bug. When you cannot cite it, drop it.
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

# Merge (full merge — all code taken, delete branch)
gh pr merge <N> --squash --delete-branch
# Merge (partial/cherry-pick — keep branch for remaining work)
gh pr merge <N> --squash

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

1. **Mechanical SOP check (GitHub Actions `sop-check` workflow)** — catches the "obvious" regressions: committed secrets, junk files, off-limits files, hardcoded env values, entity without migration, Render/Vercel coupling. Grep-based, fast (<30s), deterministic.

2. **AI Breakage Detector (GitHub Actions `ai-breakage-check`)** — catches the "subtle" regressions. Extracts every exported symbol from the base version of each changed file, greps the repo for callers, and asks Claude Sonnet 4.6 to read the diff + caller snippets and flag any signature / prop / API-shape change that a caller still expects in the old form. This is the layer that catches the "Dev B overwrote Dev A's fix" bug class.

3. **Directory-scoped CODEOWNERS (`CODEOWNERS`)** — auto-requests review from the domain expert for the touched directory. Login changes always route to @CTorres9800. Profile changes always route to @CTorres9800. This ensures the person who last fixed a bug in that area sees the PR before it merges.

4. **Post-Merge SOP Audit (GitHub Actions `post-merge-audit` + Jenkins safety net)** — the safety net. Even if a bypass makes it past layers 1–3 (e.g., reviewer clicks Merge despite red checks), this workflow detects the bypass within ~60 seconds and opens an urgent issue assigned to the CTO. Report only — the remedy is a forward fix.

**Follow-up layer (separate PR, tracked in the EPIC enforcement PR description):**

5. **Playwright smoke-test suite** — headless-browser tests for login, onboarding, profile load, account switch, publish-project save-and-exit, listing browse. Runs on every PR as a required Actions check. This is the mechanical guarantee that the critical user flows still work end-to-end after a merge. Not included in this PR because it requires a test database, test fixtures, and dedicated CI runtime; will ship as a follow-up.

**The design principle:** mechanical grep cannot tell you "does this signature change break a caller somewhere else in the repo?" — only semantic analysis (the AI Breakage Detector) or end-to-end testing (Playwright) can. Both layers are necessary. The AI layer is cheap and available today; Playwright is the long-term guarantee.

---

## 15. The AI Breakage Detector Prompt (load-bearing)

This is the prompt used by the GitHub Actions `ai-breakage-check` workflow (`.github/workflows/ai-breakage-check.yml`) and duplicated in the Jenkins safety-net pipeline (`/var/jenkins_home/pipelines/jenkins_pipeline_ai_breakage.groovy`). Do not modify it casually — it is tuned specifically for the "Dev B overwrote Dev A's fix" failure mode. If you need to change it, update the GitHub Actions workflow, the Jenkins pipeline, and this section in the same commit.

```text
You are the Regression Detector for the Marketeq freelance marketplace repo (Next.js frontend + NestJS backend). Your ONLY job is to find places where this pull request silently breaks code that was working before.

The biggest recurring bug class in this repo is: Dev A fixes something, Dev B opens a PR that touches the same file or a shared dependency, Dev B's PR lands and silently overwrites or contradicts Dev A's fix. You must catch this before it merges.

[DIFF, SYMBOL LIST, CALLER SNIPPETS provided by the workflow]

Analyze the diff against the caller snippets and answer these questions explicitly:

1. Does this PR change any exported symbol signature, prop type, function argument, return type, API response shape, DTO, or entity column that a caller still expects in the old form?
2. Does this PR remove, rename, or inline any exported symbol that callers still reference?
3. Does this PR rewrite any file that currently contains a fix, guard, null check, error handler, or early return — and does the rewrite preserve that logic verbatim?
4. Does this PR touch profile loading logic? If yes, does the PR description contain the four-point confirmation from SOP §1.3?
5. Does this PR touch authentication or local dev login? If yes, is the PR author @CTorres9800? If not, BLOCK immediately — login files are permanently locked per SOP §1.4. No exceptions.
6. Does this PR touch onboarding? If yes, does it preserve every existing form validation, error state, and field?
7. Skip layout and CSS entirely. You cannot tell whether a style change is better or worse — you do not have the design file, the mockup, or the ticket, and nothing in the diff distinguishes a deliberate design update from collateral damage. NEVER report a CSS class, spacing, grid, colour, or structural style change as a regression. Frozen-file protection is handled mechanically by the SOP check, not by the reviewer.
8. Does the PR change any shared utility function? If yes, read every caller before approving.

SCOPE LIMITS — these bound every answer above:
- You may only report on code that existed BEFORE this PR. Code this PR ADDED is the developer's deliberate new work; you have no standing to judge it and must never recommend removing it.
- Report a finding ONLY when you can quote the two specific lines that conflict, or the code-vs-interface mismatch. No citation, no finding.
- Before reporting a missing guard, validator, or handler, grep for a global or framework-level equivalent (APP_GUARD, middleware, interceptor, base class). Absence at the decorator is not absence.
- Never report on: naming, casing, style, copy, product scope ("this isn't persisted yet"), or performance you have not measured. These require the design file, the ticket, or a benchmark. You have none of them.

THE COVERAGE TEST — this is the regression test, and it replaces any judgment about code quality:
For each hunk that removes or rewrites pre-existing code, list every behavior of the OLD code (each branch, null check, guard, catch, early return, edge case, side effect). For each one, name the line in the NEW code that provides it, or mark it MISSING. Report ONLY the MISSING ones.
- Nothing missing -> stay SILENT. The rewrite may be better or worse; that is the developer's call, not yours, and you lack the context to make it.
- Something missing -> BLOCK, naming the specific lost behavior. "The new code is cleaner" is not a defense for dropped functionality.

Respond with Verdict (SAFE / BLOCK), Lost Behaviors Found (list, each with old line + new line + what is missing), and What I Could Not Verify.
Do NOT prefer false positives. A false finding costs the developer real work and risks deleting good code, which is worse than a missed bug. If you cannot cite it, do not report it.
```

Primary prompt source: GitHub Actions `.github/workflows/ai-breakage-check.yml`. Jenkins duplicate: `/var/jenkins_home/pipelines/jenkins_pipeline_ai_breakage.groovy`.

---

## 13. Revision Log

| Date | Change |
|---|---|
| 2026-04-11 | Initial document. Captures the review rules, block-comment format, branch rules enforceable on the free org plan, and the exact Claude CLI prompt used for reviews. |
| 2026-04-11 | Split devops concerns into `docs/DEVOPS_SOP.md`. This doc is now code-review-only. Removed former §1.8/§1.9/§1.10/§1.11/§1.12 (now consolidated in DEVOPS_SOP §3–§8) and kept only the §1.4 "login files are frozen" rule as a review-side concern with the bidirectional invariant stated plainly. Removed former §16 QA promotion SOP (moved to DEVOPS_SOP §7). Renamed production branch `main-live` → `live-mvp` throughout (actual branch name on origin). Added §14 regression prevention architecture and §15 AI breakage prompt (both review concerns, kept). |
| 2026-05-22 | CI/CD split: PR gate checks on GitHub Actions, post-merge on both GitHub Actions + Jenkins, post-deploy on Jenkins only. All workflow/pipeline references updated accordingly. |
| 2026-07-08 | Added §4.1 Selective Merge rule: never close entire PRs with mixed quality. Cherry-pick good code, reject only specific violations. |
| 2026-07-09 | Added §8.11 stale branch code loss bug. Hardened §3.6 to require branches up to date before merge (max 5 commits behind). Hard-blocked `--admin` flag. Added staleness check to `sop-check.yml` workflow. Updated §6 merge procedure to require `gh pr update-branch` before merge. Updated review prompt §10 accordingly. |
| 2026-08-31 | **Automation may not DESTROY a developer's work (new §1.11).** The line is destructive vs non-destructive, not touched vs untouched. Allowed: auto-updating a stale branch with `gh pr update-branch` (no flag) — a merge commit, every author commit survives, no force-push. Forbidden: `--rebase` and any force-push (rewrites their commits), auto-resolving conflicts (deletes one side), auto-fixes pushed to their branch, and reverts. On a conflict the update stops, which is correct: automation determines which side is better and REPORTS it (§5, §5.1); the author resolves. Supersedes the 2026-08-28 `--rebase` instruction. |
| 2026-08-28 | **The standard for changes to existing code: better is fine, worse is not.** Stated in §1.1 as a floor rather than a bar — a rewrite needs no justification for being an improvement; it is rejected only when a behavior, guard, null check, error path, or edge case present in the previous version is missing from the new one. Decided by the §15 coverage test, never by a general impression of quality. Added §5.1: conflicts are resolved one hunk at a time, coverage-tested in both directions, defaulting to preserving the engineer's work; blanket `--ours`/`--theirs` forbidden. Standing authorization for `gh pr update-branch --rebase`. |
| 2026-08-28 | **Less opinionated, more factual.** Added §1.9 (only the author or CTO may authorize deleting the author's work; a reviewer's approval is not authority; no single-action deletion of merged work) and §1.10 (every blocking rule needs evidence). Hardened §3.6: branch is auto-rebased with `gh pr update-branch --rebase` before review and before merge, block at >=1 behind instead of >5. Scoped §4.1 so layout changes are only a violation inside the manifest's "when wiring data" scope. **Removed all revert machinery:** §9.9 is now reporting-only (opens an urgent issue, never creates a revert branch or revert PR), matching §1.1 fix-forward. We do not revert; reverting means deleting somebody's work. Added scope limits and the coverage test to the §10 and §15 prompts; removed "Be paranoid / prefer false positives" from §15. |
| 2026-08-11 | **ABSOLUTE LOGIN LOCKDOWN.** §1.4 upgraded from "four-point confirmation required" to "CTO ONLY, NO EXCEPTIONS." Login files are permanently locked. No developer, contractor, or agent may touch them. Only @CTorres9800 may modify login/auth files. Login Gate workflow expanded to cover dev-main, staging, and live branches. All review prompts updated to hard-block login PRs from non-CTO authors. |
