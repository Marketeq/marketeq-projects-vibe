# PMCM-802: Smart Assistant field actions, Shorten it, Insert on the selected occurrence

- Date: 2026-10-28
- Branch / PR: dev-main, uncommitted (no PR yet)
- Services / areas: frontend `app/job-listing/page.tsx` (Final Check step assistant panels)

## What changed
- AC-JC-84: the panel starts with no field focused and offers "Change a Project Title" (Service path: "Change a Service Title"), "Rewrite Overview", "Rewrite Benefits". Once a field is focused the per-field actions show as before.
- AC-JC-85: selecting text and choosing "Edit with Smart Assistant" prefills the composer with "Shorten it" (Figma shows it as the composer command next to the selected-text chip, not as a pill).
- AC-JC-86: Insert replaces the occurrence the user selected, not the first match. The selection's plain-text offset is read from the DOM at click time (`getSelectionTextOffsetInField`) and `replaceFirstTextInRichTextHtml` picks the match nearest that offset.
- Retry and Insert buttons in the field/selection assistant panels (service, project, role) now match Figma: both 28px tall with a 4px gap (the shared Button defaults to 8px, so `gap-x-1` is needed); Insert 69px wide, `#E8EEFF`, `#306CFE` text/icon; Retry 63px wide, white, 1px `#D0D5DD` border, `shadow-xs`, `#1D2939` text, and the Material `autorenew` glyph (`MdAutorenew`, 12px, `#1D2939`) — not `RefreshCw`/`RefreshCcw05`. Text is 10px/600/120%.
- Insert icon is now the exact Material Symbols `variable_insert` outlined (FILL0, hollow box) glyph (viewBox 24, 12px render); the old hand-drawn SVG was a different shape.
- Follow-up suggestions block (service, project, role panels) rebuilt to Figma: header row 18px / 4px gap, 12px/18px `#98A2B3` text with a 12px chevron right after the text (no full-width gray bar, no `flex-1`); options wrap with 8px gap; each pill is 28px tall, 12px/8px padding, 32px radius, 1px `#D0D5DD` border, `shadow-xs`, 10px/500/120% `#22376B` text, hug width. Figma's open-state label reads "Use this suggestions" (typo); the code keeps "Use these suggestions".

## Findings (not changed)
- The floating rich-text toolbar differs from Figma (`components/rich-text-editor.tsx` is read-only per CLAUDE.md): code is `h-[41px] p-2`, `text-xs text-white/75`, dividers `w-px bg-white/20`; Figma is 48px tall, `12px 16px` padding, 16px gap, 14px/500 white labels, 1x20 `#22376B` dividers, selected Bold as a 32x32 white tile, "Edit with Smart Assistant" 14px/600 with a 20px wand.
- The Retry buttons in the scope-step (Step 4) assistant panels are still the old blue style (PMCM-789 area).
- `GROQ_API_KEY` is not set in `backend/.env`; all listings-service AI calls return AI_UNAVAILABLE until it is.
- `tsc` reports a pre-existing `updateData` type error in `page.tsx`.

## Verification
- Insert logic checked in a real browser DOM (second of two repeated phrases replaced; re-insert and leading-space selections work).
- Panels type-check; the full wizard was not run end to end (needs login and the Groq key).

## Follow-ups
- Decide how to fix the toolbar (shared component edit vs page-level override).
