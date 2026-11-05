# Scope type dropdown (Project / Service): remove "(current)" and stop the title indent from changing

- Date: 2026-11-04
- Branch / PR: fix/scope-type-dropdown-alignment
- Services / areas: frontend — `components/scope-builder/index.tsx`, `app/edit-listing/[slug]/page.tsx`

## What changed

Two copies of this dropdown, identical structure, identical fix:

- `components/scope-builder/index.tsx` (~3178-3222, the shared `ScopeBuilder`'s own dropdown — covers every page that embeds it: `my-listings/[slug]/page.tsx` and the frozen `active-project/[id]/page.tsx`, zero edits needed to either).
- `app/edit-listing/[slug]/page.tsx` (~7524-7556) — its own independent, hand-rolled copy (confirmed again this ticket: this page doesn't render `<ScopeBuilder>`, same finding as the prior Ongoing-phase ticket).

In both: the `Check` icon is now always rendered (never conditionally mounted) with `invisible` added when that item isn't the current scope — so it always reserves its `size-4` (16px) + the row's `gap-x-2` (8px) space, and both titles/descriptions (`ml-6`) line up regardless of which one is selected. Removed the `" (current)"` text suffix from both titles — the check alone (now always in the DOM, just visually toggled) marks the current scope. Added `aria-current={<matches> ? "true" : undefined}` to each `DropdownMenuItem` — `"true"` rather than `"page"` since this isn't pagination; matches the existing `aria-current={cond ? "page" : undefined}` pattern already used in `components/transactions-comps.tsx:9793` for the same conditional-aria-current shape, generalized to the correct token for a selectable-option list rather than a page list. Everything else (click handlers, `setPendingScopeType`/`requestScopeTypeChange`, confirm-dialog wiring, classes, `align="end"`, `w-[280px]`, trigger button) untouched.

## Audit — every copy

| Site | Verdict |
|---|---|
| `components/scope-builder/index.tsx:~3178` | Fixed |
| `app/edit-listing/[slug]/page.tsx:~7524` | Fixed |
| `app/(group)/my-listings/[slug]/page.tsx` | N/A — renders the shared `<ScopeBuilder>`, no copy of its own (grep-confirmed zero matches for the description text) |
| `app/publish-project/page.tsx` | N/A — no scope-type-switch dropdown at all (grep-confirmed, same finding as the prior Ongoing-phase ticket) |
| `app/(group)/active-project/[id]/page.tsx` | N/A — frozen, renders the shared `<ScopeBuilder>`, covered automatically, zero edits |

## Accessibility indicator used

`aria-current="true"` on the selected `DropdownMenuItem`, `undefined` (omits the attribute) on the other — chosen over `aria-current="page"` because these are two mutually-exclusive **options** in a menu, not pages in a paginator; `"true"` is the generic token for "this is the current one in this set" per the WAI-ARIA spec. `DropdownMenuItem` (Radix-based, confirmed by its use alongside other already-forwarded HTML/ARIA props elsewhere in this codebase) passes arbitrary props through to the underlying element, so no component change was needed.

## Flagged-not-fixed
None.

## Verification
- `npm run types:check`: baseline re-confirmed on this fresh `origin/dev-main` pull = **12** errors (identical set to every prior ticket this session). 0 new errors.
- `npx eslint <changed files>`: same pre-existing "ESLint couldn't find an eslint.config.(js|mjs|cjs) file" gap reported in every prior ticket this session. Not fixed, out of scope.

## §3 self-review
Pass on all seven points. `components/ui/**` (the `DropdownMenu`/`DropdownMenuItem` primitives) untouched — only consumer-side props/className passed in, matching the ticket's explicit "the DropdownMenu primitive stays as is." `scope-builder/**` and `edit-listing/[slug]/page.tsx` both explicitly allowed for this ticket.
