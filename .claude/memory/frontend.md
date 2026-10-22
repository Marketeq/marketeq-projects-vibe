# Frontend Memory

## Status
Partially implemented

## Stack
Next.js (App Router), TypeScript, Tailwind CSS

## What's Built
- Homepage: SSR page at `app/(group)/(group)/page.tsx` (server component) + `homepage-client.tsx` (client component). Fetches `/homepage` from api-gateway server-side, renders all sections dynamically. Supports A/B cookie forwarding, SEO from API, banner, hero, 4 card types.
- UI component library: /frontend/components/ui/ (tabs, sidebar, dialog, input, button, etc.)
- Type definitions: /frontend/types/ (user, talent, client, project, conversation, message, auth, core, day, react, homepage)
- Inbox hooks: /frontend/app/(group)/inbox/hooks/
  - use-messages.ts
  - use-send-message.ts
  - use-file-upload.ts
  - use-conversation-key.ts
  - use-group-encryption.ts
  - use-pinned-messages.ts
- Utilities: /frontend/utils/ (api, auth, conversation, helpers, date, hooks, etc.)
- Constants: username-suggestions, blacklist, job title validation
- Mock data: /frontend/public/mock/ (users, projects, skills, languages, etc.)
- E2E tests: Playwright + Cucumber
  - Auth tests: signin (pwd, OAuth), signup (hire, work)
  - Google + LinkedIn OAuth tests

## Key Conventions
- API calls go through /frontend/utils/api.ts
- Ably integration via /frontend/utils/useAblyChannel.ts
- Location search via /frontend/utils/useLocationSearch.ts

## Agent Log
- 2026-10-15: Removed the separate Leave Public Feedback intro; the first experience question now uses the updated Figma 13544:11820 heading (32px/700/30px), 12px description gap and 24px control gap. Restored original Storybook 37px Good/Yes/No library icons per explicit user correction, with 67px work-again circles; this intentionally overrides the smaller exported Yes/No component dimensions. Verified all seven rendered icons at 37px and selected Good/Yes colors in the isolated local fixture. Rechecked both supplied Word docs: review body has no defined minimum or maximum, so non-whitespace presence validation remains.
- 2026-10-14: Review hover states now follow Figma 13544:11392, 13358:3219, and 13358:3224. Circles use centered 2px/2.5px strokes without changing layout and the exact 1.226px/4.903px shadow. Yes/No icons are 22.0645px; Good face, satisfaction mini-stars, selected award and selected hand use downloaded Figma SVG assets. Required-field and highlight-limit errors use design-system DisclosureContent for 300 ms expansion/collapse plus HelperText fade. Extra image row combines the same 300 ms slide with a fade. Filled thumbnails clip to matching 5px inner/outer corners, with the gray border drawn above the image. UI fixture checks pass; TypeScript retains the 15 pre-existing errors with none added.
- 2026-10-14: Per user correction, attempting a fifth review highlight immediately shows “Please select no more than 4 highlights.” and preserves the existing four selections. Deselecting clears the message immediately. This selection-limit error is an explicit exception to Continue-only required-field validation. Verified fifth attempt, deselect, and replacement in the local fixture.
- 2026-10-14: Review highlights retain Inter 14px/600/20px, 24px row/column gaps and 4px icon-label gaps. Talent uses one content-sized four-column grid so the longest contractor label sets equal column widths, with single-line labels; removed fixed 144px items and wrapping. Client grid retains the Figma 648px width.
- 2026-10-14: Talent review header metadata follows Figma 13360:3393: one Contract Completed status, contract hours formatted as “237 Hours,” and actual contract amount with “paid.” Removed duplicate status and duration from this header; end-contract supplies hoursLogged.
- 2026-10-14: Review validation appears only on Continue; valid answers clear their individual errors immediately. Public title and images are optional; experience, work-again, 1–4 highlights, all five aspect ratings and public review body are required per user direction. No invented character/file-size limits or 11th-image error. Image slots support JPG/PNG previews, real local file-reading progress, retry, Figma hover/focus/delete styles, ten-slot cap, and a 300 ms second-row reveal. Reviews backend persistence remains outside this UI change.
- 2026-10-14: End-contract success popup matches Figma 15149:72764 dimensions, spacing, button variants and icon. Leave a Review opens a full-screen Dialog over the current page, without URL changes; Close dismisses it and preserves the page state. The review header is outside the scrolling content; hover transitions are 300 ms. `reviews.stories.tsx` now exposes an explicit TalentReview variant of its existing layout, with contractor questions/categories and contract-supplied identity, billing and duration; Default retains client-review copy. Direct `/active-project/[id]/review` uses TalentReview and router.back on Close, without the master navbar. Acknowledgement uses the design-system Label linked to the checkbox.
- 2026-10-02: Step 5 Smart Assistant selected-text edit now uses a generic edit-selection endpoint with the user-entered command instead of auto-filling/calling the hardcoded shorten flow.

## PMCM-641 "Still traveling?" check-in — frontend (2026-10-21, local branch `PMCM-641-identity-verification-periodic-still-traveling-check-in`)
- **Where:** `app/(group)/talent-dashboard/page.tsx` (two inline dialogs from design-system parts: the 405px check-in modal, Figma 13101-46785, and the duration question, Figma 13101-46818) + `src/lib/api/travel-check-in.ts` (copy, due/stale/dismissal/timer/answer logic, all pure) + `stories/identity-verification-check-in.stories.tsx` (`CheckIn`, `DurationAskedBefore`). `components/identity-verification-flow.tsx` was NOT edited (protected, no @CTorres9800 approval recorded); "Update my home country" reuses the existing flow via `startChangeHomeCountry` + `openFlowFromMismatch(launch, "change-country")`.
- **Driven by /me only:** `travelReminderDue` opens the modal; `travelReminderAvailableAt` is captured when it opens and sent as `checkInAt` with `POST …/travel-duration/update` `{ duration, checkInAt }`. Checks: dashboard load/login (existing `/me` read), `visibilitychange`, one timer for the next `travelReminderAvailableAt`. `POST travel-reminder/claim` is no longer used by the page (the claim-based small alert has no trigger now).
- **Rules:** a duration choice (Not sure included) is the answer and submits immediately; Skip/X/Escape/outside click/refresh send nothing and leave the occurrence due (kept from reopening only until the next real re-check). 409 `TRAVEL_CHECK_IN_ALREADY_ANSWERED`/`TRAVEL_MODE_NOT_ACTIVE` -> re-read /me and close; `HOME_COUNTRY_CHANGE_IN_PROGRESS` -> `runIdentityVerificationCheck()`. While due/open the traveler location prompt and the small Travel Mode alert wait.
- **Confirmed Figma copy:** check-in body "You’re logging in from a location outside your usual one. Just checking if you’re still away."; the later-duration information box says "You won’t be asked again for a while based on your selection." (first-time keeps "We’ll remind you later…"). Choosing a duration submits immediately; there is no Confirm button. The later-duration title "How much longer will you be traveling?" is final Figma copy (confirmed by the user); all `CHECK_IN_COPY` strings in `travel-check-in.ts` are now confirmed.
- **Answer outcomes are recorded locally before /me is re-read (first manual test, 2026-10-21):** a rejected answer (409) made the page re-read /me, still see the same occurrence due, and reopen the modal. `recordCheckInAnswerOutcome` now marks a saved occurrence *answered* (kept across re-checks) and a stale/in-progress one *dismissed* (returns on the next real re-check), and `reconcileCheckIn` is the single open/close decision. Root cause of that 409 was test data: timestamps written with SQL `now()` have microseconds, the service reads ms-precision JS Dates and its compare-and-set uses `=`; write local test timestamps with `date_trunc('milliseconds', …)`.
