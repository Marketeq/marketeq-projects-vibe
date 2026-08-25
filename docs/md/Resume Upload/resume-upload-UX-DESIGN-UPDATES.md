# UX & Design Updates — Resume Upload & Profile Autofill

**Parent epic:** Talent Profile
**Prepared:** 22 July 2026
**For:** Design, UX writing, design QA
**Sources:** Docs 01 → 08, plus every decision taken after the comps were shared.

---

## 1. What this is

The shared designs cover the happy path well: the upload prompt, the dropzone, the pre-save preview, the loading state, the conflict dialog, the summary, and the Resume card in its stored state. Those are done and this document does not revisit them.

**What follows is everything the comps do not cover.** Some of it is new work. A lot of it is a copy swap into a component that already exists. Three items are bugs in what was shared.

**Behaviour is settled for every item here.** Nothing below needs a product decision — the specs are written and the copy is drafted. What is missing is comps.

## 2. How to read this

| Effort | Meaning |
|---|---|
| **Trivial** | An existing component with different copy. Under an hour |
| **Small** | An existing component with a small structural change |
| **Real** | Genuinely new layout that needs designing |

| Blocks | Meaning |
|---|---|
| **P1 … P5** | The build phase this stops from shipping |
| **—** | Nothing blocked; schedule as convenient |

## 3. Summary

| # | Item | Effort | Blocks |
|---|---|---|---|
| 1 | `rate_limited` state | Trivial | **P1** |
| 2 | Privacy copy correction | Trivial | **P1** |
| 3 | `not_a_resume` state | Trivial | **P2** |
| 4 | `nothing_found` state | **Small** — must not look like an error | **P2** |
| 5 | `password_protected` state | Trivial | **P2** |
| 6 | Remove "Updating your Bio…" | Trivial | **P2** |
| 7 | Onboarding pre-filled step treatment | **Real** | **P2** |
| 8 | Conflict dialog — mobile layout | **Real** | **P3** |
| 9 | Conflict dialog — long lists | Small | **P3** |
| 10 | Conflict row — locally edited flag | Small | **P3** |
| 11 | Summary — nothing-changed variant | Trivial | **P3** |
| 12 | `NameMismatchDialog` | **Real** | **P4** |
| 13 | Resume card — `pending-review` | Small | **P5** |
| 14 | Resume card — file unavailable | Trivial | **P5** |
| 15 | Validation flag in edit mode | **Real** | **P5** |
| 16 | Truncated-resume notice | Trivial | — |
| 17 | Upload-in-progress message | Trivial | — |
| 18 | Pending-review discard warning | Small | — |
| 19 | Session expired | Trivial | — |
| 20 | Multiple files selected | Trivial | — |
| 21 | Empty file | Trivial | — |
| 22 | Preview expired | Trivial | — |

**Four items are Real design work.** The rest is copy and small structural changes.

---

## 4. Bugs in the shared comps

Fix these first — they are wrong in what already exists, not gaps.

### B-1 · Section labels swapped in the conflict dialog
Work history entries appear under the education heading and vice versa. Already flagged and corrected in the working file; confirming here so it does not reappear in a later revision.

### B-2 · "Updating your Bio…" in the onboarding loading copy
**Bio is never extracted from a resume.** It is hand-authored, always — that decision is settled and absolute. The line promises something that will never happen and must be removed, not reworded.

*Blocks P2.*

### B-3 · Duplicate skills in the summary
The summary comp shows the same skill twice. De-duplication now runs before anything renders, so this cannot occur in the built version — but the comp should be corrected so it is not read as intended behaviour.

---

## 5. Error and outcome states

All five reuse the existing inline treatment on the file item. **The copy is written.** These are effectively find-and-replace.

### 5.1 · `rate_limited` — *Trivial · blocks P1*

> You've uploaded several times in a short period. Please try again in about an hour.

Informational treatment, **not the error treatment**. Nothing broke; the system is declining politely. Action: acknowledge.

### 5.2 · `not_a_resume` — *Trivial · blocks P2*

> This doesn't look like a resume. Please upload your resume — we couldn't find work history or education in this file.

Action: **Try again**.

**This must be visibly distinct from the unsupported-file-type state.** Their file format was fine; the contents were not, and the remedies differ. If a talent reads this as a format error they will re-export a perfectly good PDF.

### 5.3 · `password_protected` — *Trivial · blocks P2*

> This file is password-protected, so we can't read it. Please remove the password and upload it again.

Action: **Try again**. Distinct from a generic failure — the fix is specific and immediately actionable.

### 5.4 · `nothing_found` — *Small · blocks P2*

> We couldn't pull any details out of this file. You can still fill in your profile yourself.

**This is the one to get right.** It is *not* an error. The upload succeeded, the file is stored, and the checklist step completes — we simply found nothing to import.

| Requirement | Why |
|---|---|
| **Informational treatment, never error styling** | It shares a component family with the errors above and will inherit their styling by default. That would tell the talent their upload failed |
| The Resume card must show the stored file afterwards | This is the strongest signal that it worked |
| Offer a path to manual profile entry | The only useful next step |

### 5.5 · Session expired — *Trivial*

> Your session has expired. Please sign in again to continue.

Renders as a re-authentication path, not a generic error. Nothing is lost — an unresolved review is waiting when they return.

---

## 6. Validation and intake messages

Three small messages with no comp today.

### 6.1 · Multiple files selected — *Trivial*

> We'll use the first file. You can upload one resume at a time.

**Non-blocking inline note, not an error state.** The first file proceeds normally and the flow continues underneath the message.

### 6.2 · Empty file — *Trivial*

> This file appears to be empty. Please select a different file.

Same treatment as the existing file-too-large state.

### 6.3 · Upload already in progress — *Trivial*

> An upload is already in progress. Please wait for it to finish.

Appears when a second tab attempts an upload. Must be specific — a generic failure here reads as a bug, and the first upload is proceeding perfectly well.

---

## 7. Onboarding — pre-filled steps · *Real · blocks P2*

**This is the largest gap, and it exists because a decision changed after the comps were made.**

### What changed
The review flow — name-mismatch warning, conflict dialog, summary — **never runs during onboarding.** At step 1 the profile does not yet exist, so nothing can conflict, and a summary reporting "we updated your profile" would describe a profile the talent has never seen.

Extracted data instead **pre-fills steps 2 through 6**, and those steps become the review surface.

### Why this is better than a dialog
Each value sits beside its own label, on the step that owns it, and can be corrected in place. A dialog listing sixty items for a profile that does not exist yet was never going to beat that.

### What design needs to produce

**A pre-filled state for every onboarding step that receives resume data** — name, job title, skills, work history, education, certifications.

| Requirement | Detail |
|---|---|
| **A note that the values came from their resume** | Otherwise pre-filled values read as though the talent entered them and get skimmed past. One short line per step, not a banner |
| Every value editable in place | Same affordance as manual entry. Nothing is locked |
| Steps the resume did not fill arrive empty | Exactly as they would without an upload. No empty-state messaging about the resume |
| No dialogs anywhere | No summary, no conflict dialog, no name warning |

### Tone
The note should be quiet. Something in the register of *"We filled this in from your resume — check it over."* The talent asked for this; it does not need celebrating or explaining at length.

---

## 8. Conflict dialog

The dialog exists and works. Three gaps.

### 8.1 · Mobile layout · *Real · blocks P3*

**The most likely source of a real usability failure in this feature.**

On a laptop, eight rows with checkboxes and two buttons beneath is comfortable. On a phone with a fifteen-year work history, the buttons are pushed well below the fold — and a talent who cannot see **Keep Existing** cannot decline safely.

| Requirement | Why |
|---|---|
| **Both actions pinned and always visible** | Non-negotiable. The safe exit must never require scrolling to reach |
| Header stays fixed | The talent needs to know what they are deciding about |
| Row list scrolls independently between them | |
| A row count is visible before scrolling | So the scale is known upfront |
| Rows readable at narrow width | Company, title and dates need to coexist without truncating into meaninglessness |

**This is the only genuinely destructive surface in the feature.** It deserves the most careful mobile treatment, not the least.

### 8.2 · Long lists · *Small · blocks P3*
A twenty-year career can produce thirty or more rows. Same pinning requirement as mobile, plus a visible count. The list scrolls; the actions never move.

### 8.3 · Row flagged as locally edited · *Small · blocks P3*

**The one exception to the all-rows-checked default.**

Where the talent has an unsaved edit open on an entry that a conflict row would overwrite, that row defaults **unchecked** and is visually flagged. Their in-progress work outranks the resume.

Needs: a subtle marker on the row and a short explanation of why it is different — a talent who notices one unchecked row among nine will otherwise assume a bug.

---

## 9. Summary dialog

### 9.1 · Nothing-changed variant · *Trivial · blocks P3*
Where the talent declines every conflict and nothing new was added, the summary reports that nothing changed rather than rendering empty group headings.

The dialog still opens. They asked for something to happen and deserve to see the outcome.

### 9.2 · Truncated-resume notice · *Trivial*
Where a very long document was cut at the processing ceiling, one line in the summary saying we read the first part of the file.

Rare — it takes a document beyond a fifty-page academic CV. But **silent truncation is a known failure across the industry**: the talent gets a partial import and no indication anything was dropped. One line prevents it.

---

## 10. `NameMismatchDialog` · *Real · blocks P4*

Never designed. The only genuinely new dialog in this list.

**Profile path only** — unreachable during onboarding, since there is no account name to compare against.

### Approved copy

> **Is this your resume?**
>
> The name on this file — **[Extracted Name]** — doesn't match the name on your account, **[Account Name]**. You can only use your own resume to fill in your profile. If you've changed your name or go by something different, you can continue.

**Actions:** *Upload a different file* · *Yes, this is mine*

### Requirements

| Requirement | Why |
|---|---|
| **It warns; it never blocks** | Extraction can pull a referee's name or stale document metadata. **Yes, this is mine** must always be available and always proceed |
| Both names shown clearly | The talent needs to see what we saw to judge it |
| Not alarming | Someone who married last year, or goes by a shortened name, will hit this legitimately. This is a check, not an accusation |
| Dismissal equals decline | Escape, click-outside and ✕ all resolve to *upload a different file*. **Nothing is stored** |

**Closest existing pattern:** the conflict dialog without the row list. Two names, explanatory copy, two actions.

---

## 11. Resume card

The stored state is designed. Three additions.

### 11.1 · `pending-review` · *Small · blocks P5*

A parse resolved while the talent was elsewhere, or they abandoned a review. The card carries the stored file **plus** a prompt back into it.

> We found details in your resume. Review them.

| Requirement | Detail |
|---|---|
| Sits alongside the stored file, not instead of it | The file is there; there is also something waiting |
| A clear way back into the review | Text action is sufficient |
| Persists until resolved by any path | Including declining everything. It is not a nag — it is the only durable route back in if a notification was missed |
| Announced politely, **without moving focus** | The talent may be mid-task elsewhere on the profile |

### 11.2 · File unavailable · *Trivial · blocks P5*

Storage is temporarily unreachable when the talent tries to view or download.

> We couldn't open your resume right now. You can try again, or download it instead.

**The card must keep showing the file record.** The metadata is valid and the file is not gone — degrading to the empty state would tell the talent their resume was deleted, which is false. The error is scoped to the action, not the card.

### 11.3 · Preview expired · *Trivial*

> This preview has expired. Refresh to view your resume again.

Replaces the preview content. **Never a blank frame.**

---

## 12. Validation flag in edit mode · *Real · blocks P5*

**A new pattern that does not exist anywhere in the shared designs.**

### The behaviour
Extracted entries are always saved. Where an entry is missing something the manual entry form treats as **required** — most commonly a job with no start date — it is saved *and flagged*, so the talent can complete it.

### Where it appears

| Surface | Flag |
|---|---|
| **Edit mode** | ✅ Shown |
| The talent's own profile view | ❌ Never |
| Marketplace and search | ❌ Never |
| Any client-facing surface | ❌ Never |
| View as Client | ❌ Never |
| Summary and conflict dialogs | ❌ Never |

**Edit mode only.** A client must never see that a talent's entry is incomplete. This is the strictest visibility rule in the feature.

### Requirements

| Requirement | Detail |
|---|---|
| Small, per-entry, identifies the field | Enough to act on, not enough to feel like a telling-off |
| Clears when filled | It is a state of the entry, not a permanent mark |
| **No indication it came from a resume** | The talent's entry is their entry. Its provenance is not the point, and surfacing it invites a defensive reading |
| Empty **optional** fields are never flagged | An empty optional field is not a problem |

### Tone
This is a nudge, not a validation failure. The talent did nothing wrong — their resume simply did not list a date. Something closer to *"Add a start date"* than *"Required field missing."*

---

## 13. Copy correction · *Trivial · blocks P1*

The privacy line currently says the resume will not be shared with any third parties. **That is not accurate** — a third-party model reads the file to extract from it.

Same placement, same length, one clause changed:

> Your resume file is private — clients never see it. We use it to fill in your profile, and the details you keep will appear on your profile as normal.

Honest about both halves: the file stays private, the contents become profile data.

**Nothing is added.** The design's existing privacy notice stays exactly where it is. This is a wording swap, and it is the only change to that element.

---

## 14. Pending-review discard warning · *Small*

The talent uploads a new resume while an earlier review is still unresolved.

> You have resume details waiting for review. Uploading a new file will discard them. Continue?

**Actions:** *Cancel* · *Continue*

Not destructive-red. Nothing on their profile is at risk — only an unreviewed parse result.

---

## 15. Accessibility, not visible in comps

Design QA should confirm these; they are easy to lose between comp and build.

| # | Requirement | Why |
|---|---|---|
| A-1 | **Each conflict checkbox has a unique, meaningful name** — "Apply update to VP of Engineering at Android", not "Apply update" | Nine identical checkboxes make per-entry choice unusable by screen reader, which fails the whole point of the dialog |
| A-2 | `pending-review` announced politely, focus not moved | The talent may be mid-task |
| A-3 | Focus returns somewhere sensible when a dialog closes on an error | Never lost to the page body |
| A-4 | Upload progress announcements throttled | Announce start and completion; do not narrate every percent |
| A-5 | Static processing indicator under reduced-motion preferences | Progress must stay legible without animation |
| A-6 | Long filenames truncate visually, full value available to assistive technology | |
| A-7 | Extracted values render as inert text everywhere | Resume content is untrusted input |

---

## 16. Not changing — do not redesign

Listed so effort goes where it is needed.

| Element | Status |
|---|---|
| Upload prompt and dropzone | ✅ Done |
| Pre-save preview | ✅ Done |
| Loading state | ✅ Done except the Bio line — B-2 |
| Conflict dialog, desktop | ✅ Done except the swapped labels — B-1 |
| Per-entry checkboxes | ✅ Done. Ships as designed |
| Summary dialog, desktop | ✅ Done except duplicate skills — B-3 |
| Resume card, stored state | ✅ Done |
| Delete confirmation | ✅ Done |
| File-too-large and unsupported-type states | ✅ Done |
| Privacy notice **placement** | ✅ Done. Wording only — §13 |

**The dialog titles and buttons are settled and should not drift:** *Update Current Information?* with *Yes, Update* and *Keep Existing*. Earlier wording using "Replace" is prohibited — it overstates what happens when only some rows are selected.

---

## 17. What blocks what

| Phase | Must be delivered |
|---|---|
| **P1** | `rate_limited`, privacy copy correction |
| **P2** | `not_a_resume`, `nothing_found`, `password_protected`, Bio line removed, onboarding pre-filled steps |
| **P3** | Conflict dialog mobile, long lists, locally-edited row, nothing-changed summary |
| **P4** | `NameMismatchDialog` |
| **P5** | `pending-review`, file unavailable, validation flag |
| — | Truncated notice, upload-in-progress, discard warning, session expired, multiple files, empty file, preview expired |

---

## 18. If you only read one page

**Four items need real design work.** Everything else is copy or a small change to something that exists.

1. **Onboarding pre-filled steps** — the largest gap, caused by a decision that changed after the comps
2. **Conflict dialog on mobile** — the only destructive surface in the feature, and the only place a layout failure causes real harm
3. **`NameMismatchDialog`** — the one genuinely new dialog
4. **Validation flag in edit mode** — a new pattern, with the strictest visibility rule in the feature

**Two things are easy to get wrong and expensive to fix later:**

- **`nothing_found` must not look like an error.** It shares a component family with five states that are errors, and it will inherit their styling unless someone decides otherwise. The upload worked; the file is stored.
- **The conflict dialog's actions must never scroll out of view.** A talent who cannot reach *Keep Existing* cannot decline safely, and that dialog is the one place this feature can destroy something.
