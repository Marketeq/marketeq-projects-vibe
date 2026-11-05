# Project → Service switch must end with an Ongoing phase

- Date: 2026-11-04
- Branch / PR: fix/service-scope-ongoing-phase
- Services / areas: frontend — `components/scope-builder/index.tsx`, `app/edit-listing/[slug]/page.tsx`

## What changed

**`components/scope-builder/index.tsx`** — `convertPhasesForScopeType`'s `"service"` branch gained a third parameter, `options?: { applyOngoingRule?: boolean }` (default `false`). When `true`, the mapping for **untyped** phases becomes: index 0 → Setup (unless a `"setup"` already exists elsewhere in the array), the last index → Ongoing with no recurrence fields (unless `index === 0` — i.e. a single-phase scope, already claimed by Setup — or an `"ongoing"` already exists elsewhere), everything else → Recurring (unchanged shape: `monthly`/`1`). Already-typed phases are still left completely untouched (pre-existing non-destructive behavior, unchanged). `ensureServicePhaseTypes` (the load-time normalizer) stays a bare passthrough that never passes `applyOngoingRule` — explicitly `false` by default — so it cannot start adding Ongoing phases to older saved drafts. The one real switch call site inside `ScopeBuilder`'s own confirm-dialog handler (~3341, used by every page that renders `<ScopeBuilder>`: `my-listings/[slug]/page.tsx`, `edit-listing/[slug]/page.tsx`'s own comment notwithstanding — see below — and the frozen `active-project/[id]/page.tsx`, which needed zero edits of its own since it only embeds the shared component) now passes `{ applyOngoingRule: true }`.

**`app/edit-listing/[slug]/page.tsx`** — this page does **not** render the shared `<ScopeBuilder>` component (confirmed: the only match for `<ScopeBuilder` in this file is inside a comment explaining exactly that) — it has its own, independent, hand-rolled phase/task table UI with its own parallel `confirmScopeTypeChange` switch handler (~6621) that happens to call the same exported `convertPhasesForScopeType` helper. Updated that one call site (~6632) identically: `{ applyOngoingRule: true }`.

## Audit — every conversion site

| Site | Kind | Change |
|---|---|---|
| `scope-builder/index.tsx:~3370` (confirm-dialog "Yes, Change") | **Real switch** | `applyOngoingRule: true` added |
| `scope-builder/index.tsx:~2742` (`useEffect`, untyped-phase guard) | Normalizer | Unchanged |
| `edit-listing/[slug]/page.tsx:~6632` (`confirmScopeTypeChange`) | **Real switch** | `applyOngoingRule: true` added |
| `edit-listing/[slug]/page.tsx:~6697` (`useEffect`, untyped-phase guard) | Normalizer | Unchanged |
| `edit-listing/[slug]/page.tsx:~12910` (draft hydration) | Normalizer (hydration) | Unchanged |
| `my-listings/[slug]/page.tsx:~3983` (draft hydration, maps `GetMyProjects` response) | Normalizer (hydration) | Unchanged |
| `publish-project/page.tsx` | N/A | Zero references to either function — this page doesn't do scope-type switching |

**Ongoing's data shape**: `{ phaseType: "ongoing" }`, no `recurrenceSchedule`/`recurrenceCount` (both optional on `Phase`, explicitly destructured out when assigning). Renders via `PhaseHeaderMeta` (`scope-builder/index.tsx:~689`): a static green-icon "Ongoing" chip — doesn't read either recurrence field, confirming "no recurrence fields" is a data-cleanliness requirement, not a rendering one. Setup/Ongoing are already position-locked singletons in the existing drag-and-drop code (`~1633`, `locked = phaseType === "setup" || phaseType === "ongoing"`) — assigning the type is enough to get the lock for free, no change needed there.

**Round-trip / Undo, confirmed by reading (not run live)**: Service → Project's branch is untouched — it destructures out `phaseType`/`recurrenceSchedule`/`recurrenceCount` unconditionally, so an Ongoing phase (which never had recurrence fields anyway) strips cleanly back to a flat phase, same as any other typed phase. Undo (both call sites) captures `previousPhases` *before* calling `convertPhasesForScopeType` and restores that exact snapshot — entirely independent of this fix, unaffected.

## Conversion table

| Untyped phases in | Output (`applyOngoingRule: true`, a real switch) |
|---|---|
| 1 | Setup |
| 2 | Setup, Ongoing |
| 3 | Setup, Recurring, Ongoing |
| 5 | Setup, Recurring, Recurring, Recurring, Ongoing |
| Mixed: `[typed-setup, untyped, untyped]` | `setup(unchanged)`, Recurring, Ongoing |
| Mixed: `[untyped, typed-setup, untyped]` | Recurring, `setup(unchanged)`, Ongoing |
| Mixed: `[untyped, untyped, typed-ongoing]` | Setup, Recurring, `ongoing(unchanged)` |
| Normalizer (`applyOngoingRule: false`, e.g. hydrating an older draft) | Same as before this ticket: index 0 → Setup, everything else untyped → Recurring, **never** Ongoing |

## Flagged-not-fixed
None.

## Verification
- `npm run types:check`: baseline re-confirmed on this fresh `origin/dev-main` pull = **12** errors (identical set to every prior ticket this session). 0 new errors.
- `npx eslint <changed files>`: same pre-existing "ESLint couldn't find an eslint.config.(js|mjs|cjs) file" gap reported in every prior ticket this session. Not fixed, out of scope.
- No test runner exists for this frontend at all (confirmed: no `test` script in `frontend/package.json`, no `*.test.*`/`*.spec.*` files anywhere under `scope-builder/`) — nothing to run, nothing to add tests to. The conversion table above was verified by manual trace through the implemented code, not an automated suite.

## §3 self-review
Pass on all seven points. `scope-builder/**` and `edit-listing/[slug]/page.tsx` both explicitly allowed for this ticket; `active-project/[id]/page.tsx` (frozen) needed and received zero edits — it only embeds the shared, now-fixed component. No backend/DB touched. No new dependencies. `convertPhasesForScopeType`'s existing callers that don't pass the new third argument (the three normalizer sites) are unaffected since it's optional with a safe default.
