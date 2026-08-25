# 03 — Resume Upload & Profile Autofill · Acceptance Criteria

> **Updated 22 July 2026.** Confirmed decisions cascaded from the Overview Docs.
>
> - **AC-600 added** — the review flow is profile-only. A successful parse during onboarding produces no dialog of any kind.
> - **AC-601, AC-701** scoped to the profile path.
> - **AC-501** now ends at step 2 rather than at a review stage.
> - **AC-1104 rewritten** — the **most recent job title only**, into one empty slot. No other extracted title is written regardless of remaining slots.
> - **AC-1105** — all slots full means nothing is written and nothing is reported.
> - **AC-600** now also asserts that no field outside the fixed extracted set reaches any onboarding step.
> - **Correction, same day:** AC-600 now asserts that undocumented-but-existing onboarding fields are pre-filled, and only that no value is written to a field that does not exist.
> - **AC-109 added** — an in-flight upload or parse is not cancelled by navigating away from the talent profile.
> - **AC-1106a and AC-1106b added** — entries failing required-field validation are **saved and flagged**, never discarded, and the flag appears in edit mode only.
> - **AC-607 rewritten** — skills fill to the profile's limit of 100. No import-specific cap.


**Parent epic:** Talent Profile
**Epic (this doc):** Resume Upload & Profile Autofill
**Scope:** Front-end, user-facing acceptance criteria only.
**Sources:** 01 — Feature List · 01a — Product Questions Register (resolved) · 01b — CTO Answers & Decisions · 02 — User Stories · `user-service` Resume Upload & Profile Autofill · `resume-parsing-service` Doc 00 · Figma designs and flow diagrams.
**Excluded:** Backend-internal contracts, database schema, and sibling Talent Profile epics except where resume autofill writes into them.

**Traceability.** Every criterion cites the **RUS** user story it verifies. Story IDs trace onward to **RU** feature IDs in Doc 01.

---

## 0. Conventions and global rules

These apply to every criterion in this document unless a specific criterion overrides them.

| ID | Rule |
|---|---|
| **AC-001** | **Additive is applied; destructive requires consent.** Any extracted item that does not collide with existing profile data is written on arrival. Any item that would overwrite existing data is held until the talent explicitly confirms it. |
| **AC-002** | **No partial writes.** If extraction fails at any stage, the profile is left exactly as it was. A talent never sees some of their jobs imported and others missing due to an error. |
| **AC-003** | **Dismissal is always the safe outcome.** Escape, click-outside, browser back and the ✕ control never cause data to be overwritten or deleted. |
| **AC-004** | **One resume per talent.** All criteria assume a single current resume; multi-resume behaviour is out of scope. |
| **AC-005** | **The resume is never rendered in any client-facing view,** including *View as Client*, public profile, search results, and application/proposal surfaces. |
| **AC-006** | **Every dialog and error state is reachable and operable by keyboard alone,** and every state change is announced to assistive technology. |
| **AC-007** | **Copy is authored, not generated.** All user-facing strings in this document are the approved strings and must be implemented verbatim unless design issues a revision. |
| **AC-008** | Where a criterion references "the parse result", it means the response from `resume-parsing-service` after the classification gate has passed. |

### Status vocabulary

The front end must be able to represent each of these distinctly. They are not interchangeable and must not collapse into a single "error" state.

| Status | Meaning |
|---|---|
| `idle` | No upload in progress |
| `uploading` | Bytes in transit |
| `upload_failed` | Transport or server failure — the file was never received |
| `invalid_type` | Extension not in PDF/DOC/DOCX |
| `too_large` | Exceeds 5MB |
| `rate_limited` | Hourly upload cap reached |
| `scanning` | Virus scan in progress |
| `scan_failed` | File rejected by scan |
| `parsing` | Extraction in progress |
| `parse_timeout` | Exceeded 30s after one automatic retry |
| `parse_failed` | Vendor error or malformed response |
| `password_protected` | Document is encrypted and unreadable |
| `not_a_resume` | Valid document, wrong content, or confidence below 0.7 |
| `nothing_found` | Valid resume, zero extractable entities |
| `name_mismatch` | Extracted name does not match account name (profile path only) |
| `ready_for_review` | Parse complete, awaiting talent review |
| `applied` | Sync committed |
| `undone` | Sync reversed |

---

## 1. Entry points and discovery

### AC-101 · Onboarding upload step — *RUS-101*
- **Given** a talent has selected *Seeking Hire or Work* during onboarding,
- **When** they reach step 1 of 6,
- **Then** the *Upload your resume* step is displayed with the heading `STEP 1 / 6` and the supporting line "Add your resume to complete your profile faster!",
- **And** the dropzone is in its `idle` state,
- **And** **Back**, **Skip** and **Continue** controls are all visible.

### AC-102 · Skip is always available — *RUS-102*
- **Given** the talent is on the onboarding resume step in any state — `idle`, `upload_failed`, `not_a_resume`, `parse_timeout` or any other,
- **When** they activate **Skip**,
- **Then** they advance to step 2 with no resume stored and no profile data written,
- **And** the *Upload Resume* checklist step remains incomplete,
- **And** onboarding remains completable entirely by manual entry.

### AC-103 · Step navigation — *RUS-103*
- **Given** the talent is on the resume step,
- **When** they activate **Back**, **Then** they return to the preceding step with any selected file discarded.
- **When** they activate **Continue** with a completed upload, **Then** they advance to step 2 with extracted data available to pre-fill it.
- **When** they activate **Continue** with no file selected, **Then** the behaviour is identical to **Skip**.

### AC-104 · Profile prompt modal — *RUS-104*
- **Given** a talent has an incomplete profile and no resume on file,
- **When** they view their profile,
- **Then** the *Complete Profile with Resume* modal is presented with the body copy "Upload your resume to quickly complete your profile. It stays private and is only used to autofill your information.",
- **And** it offers **Not Now** and a **✕** control.

### AC-105 · Dismissing the prompt — *RUS-105*
- **Given** the *Complete Profile with Resume* modal is displayed,
- **When** the talent activates **Not Now** or **✕**,
- **Then** the modal closes without side effects,
- **And** it is not re-presented in the same session,
- **And** the permanent Resume card remains available in the sidebar.

### AC-106 · Permanent Resume card — *RUS-106*
- **Given** a talent has no resume on file, regardless of whether they skipped onboarding or dismissed the prompt,
- **When** they view their profile,
- **Then** the sidebar Resume card is present with the copy "Add your resume to complete your profile faster."
- **And** it exposes the upload affordance.

### AC-107 · Checklist step — *RUS-107*
- **Given** the profile-completion checklist is open,
- **Then** *Upload Resume* is listed as a step with a **Finish This Step** action,
- **And** the header displays the outstanding count in the form "N steps left", or "All Complete!" when none remain.

### AC-109 · Leaving the talent profile does not cancel an upload — *RUS-803*
- **Given** an upload or parse is in flight,
- **When** the talent navigates away from the profile — including switching their account to client mode,
- **Then** the upload or parse is **not cancelled**,
- **And** its outcome is available when they return, whether that is a stored resume, a pending review, or a failure state with its retry.

### AC-108 · Pending-review re-entry — *RUS-108, RUS-803*
- **Given** a parse reached `ready_for_review` and the talent left without resolving it,
- **When** they next view their profile,
- **Then** the Resume card displays "We found details in your resume. Review them." with an action that reopens the review flow,
- **And** the prompt persists across sessions until the review is resolved or the resume is deleted,
- **And** resolving the review — by any exit path, including **Keep Existing** — clears the prompt.

---

## 2. Getting the file in

### AC-201 · Drag and drop — *RUS-201*
- **Given** the dropzone is in `idle`,
- **When** the talent drops a single valid file onto it,
- **Then** upload begins immediately and the state moves to `uploading`.
- **When** the talent drops **multiple** files,
- **Then** only the first is accepted and the talent is informed that one resume is uploaded at a time.

### AC-202 · File picker — *RUS-202*
- **Given** the dropzone is in `idle`,
- **When** the talent activates **Choose File**,
- **Then** the native picker opens, filtered to PDF, DOC and DOCX,
- **And** selecting a file begins upload,
- **And** cancelling the picker returns to `idle` with no state change.

### AC-203 · Constraints shown before selection — *RUS-203*
- **Given** the dropzone is in `idle`,
- **Then** the accepted formats (PDF, DOC, DOCX) and the 5MB limit are visible without interaction.

### AC-204 · Drag-over feedback — *RUS-204*
- **Given** the talent drags a file over the dropzone,
- **Then** the border and fill change to the drag-over treatment,
- **And** the treatment reverts on drag-leave, drop, or drag cancel.
- **Given** the dropzone is `disabled`,
- **Then** no drag-over treatment is shown and dropped files are ignored.

### AC-205 · Upload progress — *RUS-205*
- **Given** an upload is in `uploading`,
- **Then** the file item displays the filename, the file size, a percentage in the form `200 KB – 70% uploaded`, and an animated indicator,
- **And** the percentage only ever increases,
- **And** on completion the item transitions to the uploaded chip showing the filename, "Added on \<date\>", and a **Replace** action.

### AC-206 · Pre-save preview — *RUS-206*
- **Given** a file has been selected,
- **When** the pre-save preview is presented,
- **Then** the document is rendered for inspection with **Cancel** and **Save Resume** actions,
- **And** no file is committed and no parse is triggered until **Save Resume** is activated.

### AC-207 · Cancel from preview — *RUS-207*
- **Given** the pre-save preview is open,
- **When** the talent activates **Cancel**, **✕**, or escape,
- **Then** the selection is discarded, no file is stored, no parse runs, and the dropzone returns to its prior state.

### AC-208 · Privacy disclosure — *RUS-208, RUS-1004*
- **Given** either upload surface is displayed,
- **Then** the following copy is present verbatim: "Your resume is private and is only used to fill in your profile. It is never shown to clients or shared for marketing."
- **And** a **Privacy Policy** link is present and resolves to the current policy,
- **And** the superseded string "will not be shared with any third parties" does not appear anywhere in the product.

---

## 3. When the file or its contents are wrong

Every criterion in this section requires that the state be visually and textually distinguishable from the others. A shared generic error message fails these criteria.

### AC-301 · File too large — *RUS-301*
- **Given** the talent selects a file exceeding 5MB,
- **Then** the file is rejected **client-side before any bytes are uploaded**,
- **And** the state is `too_large`,
- **And** the message reads "Uploaded file exceeds the size limit of 5MB. Please select a different file.",
- **And** **Try again** is offered.

### AC-302 · Unsupported file type — *RUS-302*
- **Given** the talent selects a file whose extension is not PDF, DOC or DOCX,
- **Then** the file is rejected client-side,
- **And** the state is `invalid_type`,
- **And** the message reads "Unsupported file type. Only PDF, DOC, and DOCX files are accepted.",
- **And** a file with a permitted extension but a mismatched signature is rejected server-side into the same state.

### AC-303 · Upload failure — *RUS-303*
- **Given** an upload fails for transport or server reasons,
- **Then** the state is `upload_failed`,
- **And** the message reads "Upload failed, please try again.",
- **And** the message does not imply the talent's file is invalid,
- **And** a failed virus scan (`scan_failed`) presents as this same state to the talent.

### AC-304 · Retry — *RUS-304*
- **Given** any failure state,
- **Then** a **Try again** action is present,
- **And** activating it retries with the same file where the file was received, or reopens selection where it was not,
- **And** retry does not require re-navigating the flow or reloading the page,
- **And** repeated retries do not accumulate duplicate file records.

### AC-305 · Not a resume — *RUS-305*
- **Given** a valid PDF/DOC/DOCX is uploaded,
- **When** the parse result returns `is_resume: false`, **or** `confidence` below **0.7**,
- **Then** the state is `not_a_resume`,
- **And** the message reads "This doesn't look like a resume. Please upload your resume — we couldn't find work history or education in this file.",
- **And** the wording is visibly distinct from `invalid_type`,
- **And** **no profile data is written and no file is retained as the current resume**,
- **And** the talent may retry with a different document.

### AC-306 · Password-protected file — *RUS-306*
- **Given** an uploaded document is encrypted such that text cannot be read,
- **Then** the state is `password_protected`,
- **And** the message specifically identifies password protection and instructs the talent to remove it and re-upload,
- **And** the state is not presented as `upload_failed` or `not_a_resume`.

### AC-307 · Nothing found — *RUS-307*
- **Given** the parse result passes the classification gate,
- **When** it contains zero skills, zero work experience entries, zero education entries and zero certifications,
- **Then** the state is `nothing_found`,
- **And** the message reads "We couldn't pull any details out of this file. You can still fill in your profile yourself.",
- **And** the summary dialog is **not** shown,
- **And** the talent is offered a path to manual profile entry.

### AC-308 · File retained on empty extraction — *RUS-308*
- **Given** the state is `nothing_found`,
- **Then** the resume file **is** stored and appears on the Resume card with its filename and "Added on \<date\>",
- **And** the *Upload Resume* checklist step is marked complete,
- **And** view, download, replace and delete are all available.

### AC-309 · Rate limited — *RUS-309*
- **Given** the talent has reached the hourly upload cap,
- **When** they attempt a further upload,
- **Then** the state is `rate_limited`,
- **And** the message explains that too many uploads have been attempted and indicates when they may try again,
- **And** the message is not presented as `upload_failed`,
- **And** the previously stored resume and all profile data are unaffected.

### AC-310 · Failure recovery inside onboarding — *RUS-310*
- **Given** the talent is on the onboarding resume step,
- **When** any failure state occurs,
- **Then** the same state, copy and **Try again** action are presented as on the profile path,
- **And** **Skip** and **Continue** both remain enabled,
- **And** no failure state can leave the talent unable to progress through onboarding.

---

## 4. While the resume is being read

### AC-401 · Processing indicator — *RUS-401*
- **Given** a file has been accepted and the state is `parsing`,
- **Then** a single processing message is displayed with an animated indicator,
- **And** the message describes that the resume is being read,
- **And** the talent cannot start a second upload while one is in progress.

### AC-402 · No fabricated progress — *RUS-402*
- **Given** the state is `parsing`,
- **Then** the interface does **not** display sequential stage copy such as "Updating your Bio… / Skills… / Education… / Work History…",
- **And** the string "Updating your Bio" does not appear anywhere in the product,
- **And** no percentage or step counter implying measured progress is shown.

### AC-403 · Long parse handoff — *RUS-403*
- **Given** the state is `parsing`,
- **When** 10 seconds elapse without a result,
- **Then** the talent is released from the blocking indicator and may continue using the product,
- **And** an in-app notification is delivered when the parse resolves,
- **And** the result is reachable via the Resume card re-entry point (AC-108),
- **And** no email is sent.

### AC-404 · Parse failure and timeout — *RUS-404, RUS-1108*
- **Given** the parse exceeds **30 seconds**, or the vendor returns an error or a malformed response,
- **Then** exactly one automatic retry is attempted before any error is surfaced,
- **And** if the retry also fails the state is `parse_timeout` or `parse_failed`,
- **And** a recoverable message with **Try again** is displayed,
- **And** **the profile is byte-for-byte unchanged** — no skills, work experience, education, certifications or job titles have been written,
- **And** the uploaded file is not left as the current resume in a half-processed state.

---

## 5. Confirming the resume belongs to the talent

### AC-501 · No name check during onboarding — *RUS-501*
- **Given** the talent is uploading at onboarding step 1 and no account name exists,
- **When** the parse returns a name,
- **Then** that name is used to seed the profile,
- **And** **no** comparison is performed and **no** warning is displayed,
- **And** the talent proceeds directly to step 2 — **not** to a review dialog *(AC-600)*.

### AC-502 · Name is editable downstream — *RUS-502*
- **Given** a name was seeded from a resume during onboarding,
- **When** the talent reaches the Introduction step,
- **Then** the name field is pre-filled and fully editable,
- **And** editing it does not re-trigger any resume processing.

### AC-503 · Silent pass on match — *RUS-503*
- **Given** an account name exists and the parse returns a name,
- **When** the fuzzy comparison succeeds,
- **Then** **no** dialog, banner or confirmation is shown,
- **And** the flow proceeds directly to the review stage.

### AC-504 · Matching tolerance — *RUS-503, RUS-505*
The comparison must succeed in all of the following cases:

| Account name | Resume name | Result |
|---|---|---|
| Christopher Torres | Chris Torres | Match |
| Christopher Torres | CHRISTOPHER TORRES | Match |
| Christopher Torres | Torres, Christopher | Match |
| Christopher Torres | Christopher A. Torres | Match |
| Christopher Torres | Christopher Torres Jr. | Match |
| José Álvarez | Jose Alvarez | Match |
| Mary Chen | Mary Chen-Williams | Match |
| Christopher Torres | Priya Raghunathan | **Mismatch** |

- **And** matching is case-insensitive, accent-insensitive, punctuation-insensitive and order-independent,
- **And** a match on **either** the first or the last name is sufficient.

### AC-505 · Mismatch warning — *RUS-504*
- **Given** an account name exists and the comparison fails,
- **Then** the state is `name_mismatch` and a warning dialog is presented containing: "Is this your resume? The name on this file — [Extracted Name] — doesn't match the name on your account, [Account Name]. You can only use your own resume to fill in your profile. If you've changed your name or go by something different, you can continue.",
- **And** both extracted and account names are rendered in the copy,
- **And** the actions are **Upload a different file** and **Yes, this is mine**,
- **And** no profile data is written while this dialog is open.

### AC-506 · Proceeding past the warning — *RUS-505*
- **Given** the `name_mismatch` dialog is displayed,
- **When** the talent activates **Yes, this is mine**,
- **Then** the flow proceeds to the review stage unchanged,
- **And** the account name is **not** modified by the resume,
- **And** the event is recorded for audit.

### AC-507 · Replacing the file from the warning — *RUS-506*
- **Given** the `name_mismatch` dialog is displayed,
- **When** the talent activates **Upload a different file**,
- **Then** the dropzone reopens in `idle`,
- **And** the rejected file is not stored as the current resume,
- **And** no profile data has been written.

### AC-508 · Dismissing the warning — *RUS-504, AC-003*
- **Given** the `name_mismatch` dialog is displayed,
- **When** the talent dismisses it via escape, click-outside or **✕**,
- **Then** the outcome is identical to **Upload a different file**: nothing is written and no resume is stored.

### AC-509 · No name in the resume — *RUS-507*
- **Given** the parse result contains no detectable name,
- **Then** the comparison is treated as a pass,
- **And** no warning is shown,
- **And** the import proceeds normally.

### AC-510 · Legal name authority — *RUS-501*
- **Given** the talent has completed identity verification,
- **Then** the verified legal name is the name of record,
- **And** no subsequent resume upload modifies it,
- **And** a resume whose name differs from the verified legal name still triggers only the warning of AC-505, never a silent overwrite.

---

## 6. Reviewing what was added

### AC-600 · The review flow is profile-only — *RUS-501*
- **Given** the talent uploads at onboarding step 1,
- **When** the parse succeeds,
- **Then** **no** name-mismatch dialog, conflict dialog or summary dialog is shown,
- **And** the talent advances to step 2 with the name pre-filled and editable,
- **And** every other extracted field appears pre-filled on the onboarding step that owns it — job title (most recent only, per AC-1104), skills, work experience, education, certifications — each noted as coming from the resume,
- **And** any other onboarding field the resume supplied is pre-filled, including fields not enumerated in these docs — the enumerated set is illustrative, not a whitelist *(RU-305)*,
- **And** fields the resume did not supply arrive empty, exactly as they would without an upload,
- **And** no value is written to a field that does not already exist in the data model,
- **And** every criterion in §5, §6 and §7 below applies to the profile path only.

### AC-601 · Summary presented — *RUS-601*
- **Given** the talent is on the **profile** path,
- **And** a parse succeeded and produced at least one entity,
- **When** any conflict resolution has been completed (AC-711),
- **Then** the *Resume Upload Complete* summary is displayed with the heading copy "We updated your profile with your information from your resume.",
- **And** content is grouped into skills, work experience, education and certifications,
- **And** groups with zero items are omitted entirely rather than shown empty.

### AC-602 · Counts per group — *RUS-602*
- **Given** the summary is displayed,
- **Then** each group is labelled with its count in the form "Added N skills", "Added N educations", "Added N work experiences", "Added N certifications",
- **And** each count exactly equals the number of items rendered in that group,
- **And** singular and plural forms are correct at N = 1.

### AC-603 · Item-level detail — *RUS-603*
- **Given** the summary is displayed,
- **Then** each work experience entry shows job title, company and date range,
- **And** each education entry shows institution, degree and field of study,
- **And** each certification shows its name and issuing body,
- **And** a missing sub-field renders gracefully without placeholder text such as "undefined" or "null".

### AC-604 · Overflow — *RUS-604*
- **Given** a group contains more items than the display threshold,
- **Then** the remainder is collapsed behind a "+ N more…" affordance,
- **And** the affordance expands in place,
- **And** the panel scrolls without the dialog exceeding the viewport or clipping its action buttons.

### AC-605 · Dismissing the summary — *RUS-605*
- **Given** the summary is displayed,
- **When** the talent activates **Looks good!**,
- **Then** the dialog closes and the profile reflects the additions,
- **And** because additions were applied on arrival, this action commits nothing further,
- **And** dismissing via escape, click-outside or **✕** produces the identical outcome.

### AC-606 · Skills de-duplication — *RUS-606*
- **Given** a parse result contains repeated skills, or skills already present on the profile,
- **Then** each skill appears **at most once** in the summary and at most once on the profile,
- **And** comparison is case-insensitive and whitespace-normalised, so that "React.js", "React.JS" and "react.js" resolve to a single skill,
- **And** skills already associated with the talent's `portfolio-service` case studies are treated as present and are not re-added,
- **And** the "Added N skills" count reflects only the skills actually added after de-duplication.

### AC-607 · Skills fill up to the profile limit — *RUS-607*
- **Given** a parse result contains skills after de-duplication,
- **Then** they are imported until the profile's own skill limit (**100**) is reached,
- **And** **no import-specific cap is applied** — the only ceiling is the profile's,
- **And** where the profile is already at its limit, no further skills are added and none is reported,
- **And** the count in the summary reflects the number **added**, not the number found.

### AC-608 · No provenance in the UI — *RUS-608*
- **Given** skills have been imported from a resume,
- **Then** they render identically to manually added skills on the profile, in search, and in every client-facing view,
- **And** no badge, icon, tooltip or label identifies them as resume-derived,
- **And** provenance is recorded in the data model only.

### AC-609 · Work, education and certifications import in full — *RUS-609*
- **Given** a parse result contains any number of work experience, education or certification entries,
- **Then** all of them are imported,
- **And** no cap is applied to these three types.

---

## 7. Resolving conflicts — "Update Current Information?"

### AC-701 · Conflict dialog presented — *RUS-701*
- **Given** the talent is on the **profile** path,
- **And** the parse result contains at least one entity matching an existing profile entry,
- **Then** the *Update Current Information?* dialog is displayed **before** any of those entries are modified,
- **And** the body copy reads "We found work history and education entries that already exist in your profile. You can keep your current information or replace it with information from your resume.",
- **And** no conflicting entry has been written at the time the dialog opens.

### AC-702 · Destructive visual treatment — *RUS-702*
- **Given** the conflict dialog is displayed,
- **Then** the section labels, the per-row icons and the primary action are rendered in the destructive (red) treatment per the design system,
- **And** the primary action is visually dominant over the secondary,
- **And** the treatment is applied regardless of how many rows are present.

### AC-703 · Grouping — *RUS-703*
- **Given** conflicts exist across multiple entity types,
- **Then** they are grouped under work history, education and certification headings,
- **And** a group with no conflicts is omitted,
- **And** entries appear only under the heading matching their own type — work under work, education under education, certification under certification.

### AC-704 · Per-row control — *RUS-704*
- **Given** the conflict dialog is displayed,
- **Then** every conflicting row carries its own checkbox labelled **Apply Update**,
- **And** each checkbox toggles independently with no effect on any other row,
- **And** rows may be left in any combination of checked and unchecked states.

### AC-705 · Default state — *RUS-705*
- **Given** the conflict dialog opens,
- **Then** **every** row is checked,
- **And** activating **Yes, Update** without further interaction applies every conflicting update.

### AC-706 · Deselection — *RUS-706*
- **Given** the conflict dialog is displayed with all rows checked,
- **When** the talent unchecks one or more rows,
- **Then** those rows remain unchecked until changed by the talent,
- **And** unchecking every row is permitted and does not disable the **Yes, Update** action.

### AC-707 · Commit — *RUS-707*
- **Given** the talent has set the row selections,
- **When** they activate **Yes, Update**,
- **Then** every checked row overwrites its matching profile entry,
- **And** every unchecked row leaves its profile entry untouched,
- **And** if no rows are checked, no profile entry is modified and the flow proceeds without error,
- **And** the dialog closes and the flow advances to the summary.

### AC-708 · Decline all — *RUS-708*
- **Given** the conflict dialog is displayed,
- **When** the talent activates **Keep Existing**,
- **Then** no conflicting profile entry is modified, irrespective of checkbox state,
- **And** any non-conflicting additions from the same parse remain applied,
- **And** the flow advances to the summary, which reports only those additions.

### AC-709 · Dismissal resolves to Keep Existing — *RUS-709*
- **Given** the conflict dialog is displayed,
- **When** the talent dismisses it via escape, click-outside, **✕**, browser back, or by closing the tab,
- **Then** the outcome is identical to **Keep Existing**,
- **And** no conflicting entry is overwritten under any circumstances,
- **And** where the dialog was abandoned rather than dismissed deliberately, the pending-review prompt of AC-108 is surfaced.

### AC-710 · Same-job detection — *RUS-710*
- **Given** an existing profile entry and an extracted entry share a normalised company, a normalised title and the **same start date**,
- **Then** they are treated as the **same job**, and the extracted version updates the existing record,
- **And** they are **not** presented as two competing entries,
- **And** specifically: an existing "VP of Engineering, Android, Jan 2023 – Present" and an extracted "VP of Engineering, Android, Jan 2023 – Jun 2025" resolve to one row representing an end-date update,
- **And** normalisation is case-insensitive and ignores punctuation and common corporate suffixes (Inc., Inc, LLC, Ltd., Ltd, Corp.),
- **And** education entries match on institution, degree and field of study by the same normalisation rules,
- **And** entries differing only in start date are treated as **separate** roles and both are retained.

### AC-711 · Screen ordering — *RUS-711*
- **Given** a single parse produces both conflicts and non-conflicting additions,
- **Then** the *Update Current Information?* dialog is presented **first**,
- **And** the *Resume Upload Complete* summary is presented **after** it resolves,
- **And** the summary reflects the complete outcome, including any updates applied via the conflict dialog,
- **And** the talent is never shown a completion summary followed by a further question.

### AC-712 · Conflicts only, no additions — *RUS-701*
- **Given** a parse produces conflicts but no new entries,
- **Then** the conflict dialog is presented,
- **And** on resolution the summary is presented reporting the updates applied,
- **And** if no updates were applied, the summary reports that nothing was changed rather than displaying empty groups.

---

## 8. Undo and abandonment

### AC-801 · Undo reverses the whole sync — *RUS-801*
- **Given** the summary dialog is displayed,
- **When** the talent activates **Undo Changes**,
- **Then** every addition and every update applied by this parse is reversed,
- **And** the profile is restored to its exact pre-import state, including any entries that were overwritten via the conflict dialog,
- **And** entries the talent created manually before the import are untouched,
- **And** the state becomes `undone`,
- **And** the resume file itself remains stored on the profile.

### AC-802 · Undo scope is the open dialog — *RUS-802*
- **Given** the summary dialog has been closed by any means,
- **Then** **Undo Changes** is no longer available,
- **And** no undo affordance is presented elsewhere in the product,
- **And** no persistent undo window exists.

### AC-803 · Abandonment — *RUS-803*
- **Given** a parse reached `ready_for_review`,
- **When** the talent closes the tab, navigates away, or loses their session before resolving it,
- **Then** non-conflicting additions remain applied,
- **And** no conflicting entry has been overwritten,
- **And** the parse result is retained,
- **And** the Resume card surfaces the re-entry prompt of AC-108.

---

## 9. Managing the stored resume

### AC-901 · File record displayed — *RUS-901*
- **Given** a resume is stored,
- **Then** the Resume card displays the filename and "Added on \<date\>",
- **And** the date is rendered in the talent's locale,
- **And** long filenames truncate with an ellipsis while remaining readable in full via tooltip or accessible name.

### AC-902 · View — *RUS-902*
- **Given** a resume is stored,
- **When** the talent activates **View**,
- **Then** the document is rendered in-app,
- **And** access is served via a short-expiry signed URL,
- **And** a failure to render presents a recoverable error, not a blank frame.

### AC-903 · Download — *RUS-903*
- **Given** a resume is stored,
- **When** the talent activates **Download**,
- **Then** the original file is delivered unmodified with its original filename and extension.

### AC-904 · Replace — *RUS-904*
- **Given** a resume is stored,
- **When** the talent activates **Replace**,
- **Then** the upload flow opens,
- **And** the existing resume remains in place and unchanged until a new file successfully completes upload and parsing,
- **And** a failure at any stage of the replacement leaves the original resume intact and current.

### AC-905 · Replace re-runs the import — *RUS-905*
- **Given** a replacement file has been successfully uploaded,
- **Then** extraction, classification, name matching, conflict resolution and the summary all run in full,
- **And** the prior version is retained in history,
- **And** the *Added on* date reflects the new upload.

### AC-906 · Delete — *RUS-906*
- **Given** a resume is stored,
- **When** the talent activates **Delete** and confirms,
- **Then** the file and its metadata are removed,
- **And** the Resume card returns to its empty state with the upload affordance.

### AC-907 · Delete confirmation — *RUS-907*
- **Given** the talent activates **Delete**,
- **Then** a confirmation is presented reading "Delete Resume? Your resume will be removed. This cannot be undone." with **Cancel** and **Yes, Delete** actions,
- **And** **Cancel**, escape, click-outside and **✕** all abort the deletion,
- **And** deletion occurs only on explicit confirmation.

### AC-908 · Delete does not roll back the profile — *RUS-908*
- **Given** a resume is deleted,
- **Then** skills, work experience, education, certifications and job titles previously imported from it remain on the profile,
- **And** no profile-completion progress is lost as a result of the profile data,
- **And** the *Upload Resume* checklist step returns to incomplete and the completion count adjusts accordingly.

### AC-909 · Action affordances — *RUS-909*
- **Given** the Resume card is displayed with a stored resume,
- **Then** view, download, replace and delete are reachable directly from the card,
- **And** each has a default and a hover treatment per the component spec,
- **And** each has an accessible name that is meaningful without relying on the icon.

### AC-910 · Empty state — *RUS-106*
- **Given** no resume is stored,
- **Then** the Resume card shows the upload affordance and the prompt copy,
- **And** view, download, replace and delete are not present.

---

## 10. Privacy and visibility

### AC-1001 · Never shown to clients — *RUS-1001*
- **Given** a talent has a resume stored,
- **Then** the resume file, filename, upload date and any derived preview are absent from every client-facing surface, including the public profile, search results, proposals and applications,
- **And** no client-facing API response includes resume file references.

### AC-1002 · View as Client — *RUS-1002*
- **Given** the talent activates *View as Client*,
- **Then** the Resume card is **absent from the layout entirely**, not merely disabled, greyed or empty,
- **And** no residual spacing or heading indicates that a hidden card exists.

### AC-1003 · Private access — *RUS-1003*
- **Given** any request to view or download a resume,
- **Then** access is granted only via a short-expiry signed URL,
- **And** URLs are non-sequential and non-guessable,
- **And** an expired URL fails closed with a recoverable error rather than exposing the file.

### AC-1004 · Accurate privacy copy — *RUS-1004*
- Covered by AC-208. The superseded third-party wording must not appear on any surface.

---

## 11. What the resume does and does not write

### AC-1101 · Bio is never written — *RUS-1101*
- **Given** any resume upload on any path,
- **Then** the profile bio is neither created nor modified,
- **And** the parse result contains no bio field,
- **And** the bio does not appear in the summary, the conflict dialog, or the loading copy.

### AC-1102 · About Me remains its own step — *RUS-1102*
- **Given** a resume import completes successfully,
- **Then** the *About Me* checklist step remains in its prior state,
- **And** it is completed only by the talent writing their bio.

### AC-1103 · Location is never written — *RUS-1103*
- **Given** a resume contains a location,
- **Then** the talent's profile location, timezone and any location-derived rate settings are unchanged,
- **And** location does not appear in the summary or the conflict dialog.

### AC-1104 · The most recent job title fills one empty slot — *RUS-1104*
- **Given** the talent has at least one empty job title slot,
- **And** the parse result contains one or more job titles,
- **Then** **only the most recent job title** is written, into the first empty slot,
- **And** **no other extracted title is written**, regardless of how many empty slots remain,
- **And** the newly filled slot has no rate set, leaving the rate for the talent to define,
- **And** the most recent title is the one belonging to the talent's latest role — resumes are reverse-chronological, so this is the first title returned.

### AC-1105 · Job titles never overwrite — *RUS-1105*
- **Given** any job title slot is already populated,
- **Then** neither that title nor its rate is modified by any resume upload,
- **And** where all three slots are populated, **no** extracted title is written and none is reported,
- **And** job titles never appear as conflicts in the *Update Current Information?* dialog.

### AC-1106 · Contact details are not extracted — *RUS-1106*
- **Given** a resume contains a phone number, email address or postal address,
- **Then** none of these values is extracted, stored, displayed or written to the profile.

### AC-1106a · Entries failing validation are saved and flagged — *RUS-1108*
- **Given** any extracted entity that carries at least one identifying value,
- **Then** it is **saved**, whether or not it passes field validation,
- **And** it is checked against **the same field rules the manual entry form applies**,
- **And** where a **required** field is missing or invalid, the entry is marked with a validation flag,
- **And** where only **optional** fields are empty, **no flag is set** — an empty optional field is not a problem,
- **And** validation never removes an entry, so counts in the summary are unaffected.

### AC-1106b · The validation flag appears in edit mode only — *RUS-1108*
- **Given** an entry carries a validation flag,
- **When** the talent opens that section in **edit mode**,
- **Then** a small error state is shown on the affected entry, identifying the field that needs attention,
- **And** the flag is **absent** from the talent's own profile view, marketplace and search results, any client-facing profile, *View as Client*, the summary dialog and the conflict dialog,
- **And** the flag clears once the field is filled,
- **And** the flag carries no indication that the entry came from a resume.

### AC-1107 · Strict entity typing — *RUS-1107*
- **Given** any parse result,
- **Then** work experience entries are written only to work history, education only to education, and certifications only to certifications,
- **And** no entity is written to more than one section,
- **And** section headings in both dialogs correspond to the entries listed beneath them.

### AC-1108 · No partial writes — *RUS-1108*
- Covered by AC-002 and AC-404.

---

## 12. Profile completion

### AC-1201 · Upload completes the step — *RUS-1201*
- **Given** a resume upload completes successfully, including the `nothing_found` outcome,
- **Then** the *Upload Resume* checklist step is marked complete with a green check,
- **And** a failed or rejected upload — `not_a_resume`, `password_protected`, `upload_failed`, `parse_failed` — does **not** complete the step.

### AC-1202 · Completion progress updates — *RUS-1202*
- **Given** an import completes,
- **Then** the *Ready to Get Hired?* progress bar and the "N steps left" / "All Complete!" indicator update to reflect the new state,
- **And** the update is visible without a page reload.

### AC-1203 · Downstream steps complete — *RUS-1203*
- **Given** an import writes skills, work experience or education,
- **Then** the corresponding checklist steps are satisfied under their own completion rules,
- **And** *About Me* is excluded per AC-1102.

### AC-1204 · Faster than manual — *RUS-1204*
- **Given** a talent uploads a resume containing work history, education, skills and certifications,
- **Then** reaching an equivalent state of profile completion requires materially fewer interactions than manual entry of the same content,
- **And** the happy path from file selection to a complete profile requires no more than: select file → save → resolve conflicts if any → dismiss summary.

---

## 13. Accessibility, language and privileged access

### AC-1301 · Keyboard upload — *RUS-1301*
- **Given** a talent navigating by keyboard,
- **Then** the upload control is reachable in the natural tab order and activates via Enter or Space,
- **And** drag and drop is never the only means of selecting a file,
- **And** focus is visible on every interactive element at all times.

### AC-1302 · Assistive technology — *RUS-1302*
- **Given** a talent using a screen reader,
- **Then** the dropzone has an accessible name describing its purpose and the accepted formats,
- **And** upload progress is announced without flooding the announcement queue,
- **And** every error, empty and success state is announced when it appears,
- **And** both dialogs are announced on open, trap focus while open, and return focus to the invoking control on close.

### AC-1303 · Keyboard operation of the review dialogs — *RUS-1303*
- **Given** the *Update Current Information?* dialog is open,
- **Then** every **Apply Update** checkbox is reachable by keyboard and toggles via Space,
- **And** each checkbox's accessible name identifies which entry it governs, not merely "Apply Update",
- **And** **Keep Existing** and **Yes, Update** are both reachable,
- **And** escape resolves to **Keep Existing** per AC-709.

### AC-1304 · Non-English resumes — *RUS-1304*
- **Given** a resume written in a language other than English,
- **Then** extraction proceeds normally where the model supports the language,
- **And** extracted values are stored as written, without translation,
- **And** the interface makes no claim about supported languages.

### AC-1305 · Support access — *RUS-1305*
- **Given** a support agent without the restricted resume role,
- **Then** no resume file, filename or preview is accessible from any support surface.
- **Given** a support agent **with** the restricted role,
- **Then** access is permitted,
- **And** every view is recorded with the acting agent, the talent, and a timestamp,
- **And** team leads have no access to team members' resumes under any role.

---

## 14. Cross-cutting edge cases

| ID | Scenario | Required behaviour |
|---|---|---|
| **AC-1401** | Talent uploads the identical file twice | The file is re-parsed and the flow runs in full. No cache is consulted. Conflicts are expected and handled normally. |
| **AC-1402** | Talent with no work history — a new graduate | The flow completes normally. The summary reports only the groups that have content. `nothing_found` applies only when **all** groups are empty. |
| **AC-1403** | Scanned or image-only resume | Extraction falls back to sending the document itself. If usable content is returned the flow proceeds normally; otherwise `nothing_found` or `not_a_resume` applies. |
| **AC-1404** | Session expires mid-parse | On return, the talent is authenticated and the pending-review prompt of AC-108 is presented. No data is lost and no partial write has occurred. |
| **AC-1405** | Talent deletes their resume while a parse is in flight | The parse result is discarded. No profile data is written. The Resume card returns to its empty state. |
| **AC-1406** | Talent navigates away during upload | The upload is abandoned. No partial file is stored and no `uploading` state persists on return. |
| **AC-1407** | Two uploads attempted concurrently in two tabs | Only one upload may be in flight per talent. The second is rejected with a clear message and the first is unaffected. |
| **AC-1408** | Extracted date ranges are malformed or absent | The entry is imported with the dates it does have. A missing date never blocks the import and never renders as "undefined" or "Invalid Date". |
| **AC-1409** | Resume contains more than one job title | Only the most recent is written, into one empty slot. All others discarded silently per AC-1104. |
| **AC-1410** | Extracted text contains markup or script content | All extracted values are escaped on render. No extracted content is ever interpreted as markup. |
| **AC-1411** | Extremely long extracted field values | Values are truncated for display with the full value retained in data, and no layout is broken by an unbroken long string. |
| **AC-1412** | Talent's account is deleted | The resume file follows the platform account-deletion retention policy. No feature-specific retention rule applies. |
| **AC-1413** | Parse succeeds but every extracted entity duplicates existing profile data | No additions occur. The conflict dialog handles the overlaps. If the talent declines all, the summary reports that nothing was changed. |
| **AC-1414** | Talent uploads during onboarding, then abandons onboarding entirely | The stored resume and any seeded data persist against the account and are available when the talent returns. |

---

## 15. Required test fixtures

These fixtures are required for test-driven development and must exist before implementation is considered testable.

| Fixture | Expected outcome |
|---|---|
| Clean, well-formatted PDF resume | Full extraction, summary displayed |
| DOCX resume | Full extraction, parity with PDF |
| DOC (legacy) resume | Full extraction, parity with PDF |
| Scanned / image-only resume | Fallback path exercised, extraction succeeds |
| **Contract document (valid PDF)** | `not_a_resume` — the regression fixture for the original defect |
| Invoice (valid PDF) | `not_a_resume` |
| Password-protected PDF | `password_protected` |
| Resume with no extractable content | `nothing_found`, file still stored |
| Resume with 60+ skills | Capped at 20 after de-duplication |
| Resume with duplicate skills in varied casing | De-duplicated to one each |
| Resume matching existing profile entries exactly | Conflict dialog, same-job detection exercised |
| Resume with same role and start date, later end date | Single row, end-date update — not two entries |
| Resume with a different person's name | `name_mismatch` on profile path; silent on onboarding path |
| Resume with no detectable name | Silent pass |
| Resume with accented and reordered name | Silent pass per AC-504 |
| Non-English resume | Extraction succeeds, values stored untranslated |
| 5.1MB file | `too_large`, rejected client-side |
| `.png` file | `invalid_type` |
| `.pdf` extension with non-PDF signature | `invalid_type`, rejected server-side |
| Education-only resume (new graduate) | Normal flow, education group only |

---

## Out of scope for this document

| Item | Where it belongs |
|---|---|
| Re-import from an already-stored file | Fast-follow — RU-513 |
| Multiple stored resumes with a current-version selector | Future — RU-512 |
| Visible provenance for imported skills | Deliberately excluded in v1 — RU-409 |
| Email notification on asynchronous parse completion | Future — RU-403 |
| Platform account-deletion retention policy | Platform-level policy, not this epic — RU-510 |
| DPA and compliance posture for third-party extraction | Compliance documentation |

---

_Next: 04 — Front-end technical documentation, derived from these criteria._
