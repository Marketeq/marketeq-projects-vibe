# Project details page: instant tooltips + Level Up help tooltip

- Date: 2026-11-02
- Branch / PR: fix/project-page-instant-tooltips
- Services / areas: frontend — `project-details/[slug]`, `my-listings/[slug]`, `project-discovery-sections`, `share-window`

## What changed

**Task 1 — instant tooltips on the public project details page**
- `app/(group)/(group)/project-details/[slug]/page.tsx`: all 11 `TooltipProvider`s set to `delayDuration={0}` (4 were `150`, 2 were `75`, 2 were `200`, 3 had none — Radix's own default is ~700ms, confirmed via `components/ui/tooltip/tooltip.tsx`, which is a bare re-export of `TooltipPrimitive.Provider` with no delay override). No `skipDelayDuration` existed anywhere in this file.
- Two rendered child components also have their own tooltips and were updated: `components/project-discovery-sections.tsx` (`ProjectDiscoverySections`, rendered at the bottom of the page — two `TooltipProvider`s, both `75`→`0`; grep-confirmed this component has no other caller, so no other page is affected) and `components/share-window.tsx` (`ShareWindow`, rendered via `<ShareWindow />` — one bare `TooltipProvider`→`delayDuration={0}`; this component is **also** rendered by `components/case-study/client-view-top-bar.tsx`, so that page's share tooltip is now instant too, which is the intended "instant is the intended behavior" outcome per the ticket).
- `components/listing-card.tsx` imports the whole Tooltip family but never actually renders any of it (dead import) — confirmed via grep, nothing to change; also frozen/locked (CLAUDE.md's master-card rule) so it's moot either way.
- `components/scope-builder/index.tsx` has two `TooltipProvider`s already at `delayDuration={0}` — but this page only imports non-component helpers from it (`estimateScopeBudgetCents`, `PHASE_TYPE_TITLE`), never the `ScopeBuilder` component itself, so none of its JSX (including those tooltips) is ever rendered on this page. Not touched, correctly out of scope.
- `components/report-window.tsx` (rendered via `<ReportWindow />`) has zero tooltip usage — confirmed via grep, N/A.
- 13 other candidate child components checked (`lightbox-video-player`, `project-details-steps-section`, `read-more-less`, `show-more-less`, `talent-profile-comps`, `chat`, `emoji-picker`, inbox `message-components`, `inbox-comps`, `like-dislike`, `next-image`, `money`, `next-link`) — none contain any `TooltipProvider`/`delayDuration`.

**Deliverables section — native `title` → catalogued Tooltip**
- Same file, the Deliverables `CollapsibleCard` block (around line 3638 at time of writing). Wrapped the entire deliverables render (both the legacy flat-array branch and the grouped-phase branch, including the phase-name span and every item `<p>`) in **one** `<TooltipProvider delayDuration={0}>` — not one per item, per the ticket's explicit instruction.
- Each of the 3 previously-`title`-bearing elements (legacy item `<p>`, phase-name `<span>`, grouped item `<p>`) is now `<Tooltip><TooltipTrigger asChild>{the same truncating element, same `min-w-0 truncate`/`shrink-0` classes, title prop removed}</TooltipTrigger><TooltipContent>{the same text}</TooltipContent></Tooltip>`.
- **Always shown, not truncation-conditional** — detecting actual truncation (scrollWidth vs clientWidth) needs a ref + resize observation per item, which is more than "a few lines" across a 3-column grid with potentially many items per phase; reporting this choice explicitly per the ticket's own fallback instruction rather than guessing at a measurement approach.
- Grep-confirmed zero `title=` attributes remain anywhere in the page file after this change.

**Task 2 — "Level Up Your Project Listing Skills" help icon**
- `app/(group)/my-listings/[slug]/page.tsx` (~line 11361): the bare `<HelpCircle className="size-4 text-gray-400" />` is now wrapped in `TooltipProvider delayDuration={0}` → `Tooltip` → `TooltipTrigger asChild` → the unchanged icon → `TooltipContent`, mirroring the closest existing help-icon tooltip in the same file (the "Select Label" field tooltip at ~line 7635: `TooltipProvider` → `Tooltip` → `TooltipTrigger asChild` → icon → plain-text `TooltipContent`, no extra props). Icon's own className left untouched (not even the reference's `cursor-help`, per the ticket's explicit "Icon unchanged").
- No existing copy found for this exact card (grep across the repo, excluding node_modules/storybook-static, for "Level Up Your Project Listing Skills" and "Level Up Your") — sibling cards exist ("Level Up Your Hiring Skills" in `my-jobs/page.tsx` and `job-listing/page.tsx`, "Level Up Your Job Search" in `my-jobs/page.tsx`) but none of them have their own help-icon tooltip to copy text from either. Used the ticket's exact fallback text: "Short tutorials to help you write a stronger listing and attract the right talent."

## Findings (not changed)
- The "Select Label" tooltip this task mirrors (`my-listings/[slug]/page.tsx` ~7635) still has no `delayDuration` set (Radix default) — out of scope for Task 2, which only asked for the one new Level Up tooltip to be instant, not a sweep of every tooltip in this huge file.
- `ShareWindow`'s delay change also affects `components/case-study/client-view-top-bar.tsx` (its only other caller) — flagged per the ticket's own instruction, not something requiring a separate fix.

## Verification
- `npm run types:check`: baseline re-checked on this fresh `origin/dev-main` pull = **12** errors (same categories/count as the prior branch's baseline, one line-number shift in `app/job-listing/page.tsx` from unrelated upstream changes). 0 new errors after this ticket's changes — confirmed none of the 12 touch any of the 4 changed files.
- `npx eslint <changed files>`: fails with "ESLint couldn't find an eslint.config.(js|mjs|cjs) file" — same pre-existing ESLint v9 flat-config gap reported in every prior ticket this session. Not fixed, out of scope.
- Grep proof: `grep -n "delayDuration={" <file> | grep -v "delayDuration={0}"` returns empty for all 3 touched tooltip-bearing files (`project-details/[slug]/page.tsx`, `project-discovery-sections.tsx`, `share-window.tsx`). `grep -n "title=" project-details/[slug]/page.tsx` returns empty (all 3 Deliverables `title` attributes removed, no stray ones existed elsewhere).

## Task 3 (same branch, same day) — every tooltip on the My Listings page instant, incl. scope

**Audit**: 17 `TooltipProvider`s directly in `my-listings/[slug]/page.tsx` (1 at `{300}`, 4 at `{200}`, 11 bare → Radix default, 1 already `{0}` from Task 2) — all now `{0}`. No `skipDelayDuration` anywhere on this page.

**Child components rendered on this page, found via import-list cross-check** (same method as Task 1):
- `components/scope-builder/index.tsx` — `ScopeBuilder` **is** actually rendered here (`<ScopeBuilder embedded .../>`, unlike project-details which only imports its helper functions) — its two `TooltipProvider`s were already `{0}`, verified only, not touched.
- `app/(group)/my-listings/[slug]/project-chat-panel.tsx` (local, page-specific — confirmed via repo-wide grep, no other importer) — 8 bare `TooltipProvider`s, all → `{0}`.
- `app/(group)/my-listings/[slug]/recent-questions-manager.tsx` (local) — already `{0}`, verified only.
- `components/invite-window.tsx` — 3 bare `TooltipProvider`s → `{0}`. **Catalogued in COMPONENTS.md** (`frontend/COMPONENTS.md:813`), not in CLAUDE.md's named-frozen list, so it doesn't meet this ticket's own flagging test ("frozen top-level `components/*.tsx` **not** catalogued"). Fixed per that rule, not flagged. **Wide blast radius, reported rather than silently absorbed**: `<InviteWindow />` is mounted once in the **root** `app/layout.tsx` — this instant-delay change reaches every page in the app, not just my-listings, since the same mounted instance renders everywhere. Also referenced (rendering the store-triggered modal) in `app/(group)/(group)/my-network/page.tsx`, `app/top-most-header.tsx` (deny-listed file, but it only *renders* `InviteWindow`, doesn't define it — not edited), `components/case-study/client-view-top-bar.tsx`, `components/talent-profile-comps.tsx`.
- `components/rich-text-editor.tsx` — 21 `TooltipProvider`s at `delayDuration={75}` → `{0}`. Also catalogued in COMPONENTS.md (`:941`), not CLAUDE.md-frozen — fixed, not flagged. **Other pages affected**: `app/edit-listing/[slug]/page.tsx`, `app/job-listing/page.tsx`, `app/publish-project/page.tsx`, `components/case-study/sections/_shared.tsx`, `components/case-study-builder.tsx` all render this same component, so their rich-text-editor tooltips are now instant too.
- `components/marketplace-footer.tsx`, `components/listings/publish-confirm-dialog.tsx` — no tooltip usage at all, N/A.
- The 13 components already ruled out in Task 1's investigation (chat, inbox-comps, like-dislike, next-image, next-link, project-details-steps-section, read-more-less, show-more-less, talent-profile-comps, etc.) were not re-checked since they're also imported here and were already confirmed to have zero tooltip usage.

**Explicitly not touched, per this round's deny list**: `components/share-window.tsx`, `components/project-discovery-sections.tsx` — confirmed via `git diff origin/dev-main` showing zero diff on both after this round's work (neither is even imported by my-listings, so there was nothing to change there anyway).

**Verification**: `npm run types:check` — 12/12, 0 new errors (the pre-existing `rich-text-editor.tsx(2019,50)` TS2339 `near`/Function error was already in the baseline before this change, confirmed unrelated to the `delayDuration` edits). Grep proof across all four edited files (`my-listings/[slug]/page.tsx`, `project-chat-panel.tsx`, `invite-window.tsx`, `rich-text-editor.tsx`): zero non-`{0}` `delayDuration={` and zero bare `<TooltipProvider>` remain.

## Follow-ups
- None identified — all three tasks are complete within their stated scope. `invite-window.tsx`'s root-layout-wide blast radius is reported above for awareness, not flagged as incomplete — the ticket's own instruction treats a shared component's wider reach as acceptable and reportable, not a reason to skip the fix.
