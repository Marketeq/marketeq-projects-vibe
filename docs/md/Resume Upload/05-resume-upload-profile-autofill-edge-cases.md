# 05 — Resume Upload & Profile Autofill · Edge Cases & Solutions

> **Updated 22 July 2026.** Confirmed decisions cascaded from the Overview Docs.
>
> - **EC-206 rewritten** — a resume with several job titles yields **one** written title, the most recent, regardless of how many slots are empty.
> - **EC-1103a and EC-1103b added** — the review flow is never entered on S1, and extracted data pre-fills onboarding steps instead.
> - **§11 QA approach** — intake and failure suites run against both surfaces; review-flow assertions are S3-only, and the S1 assertion is the inverse (no dialog at all).


**Parent epic:** Talent Profile
**Epic (this doc):** Resume Upload & Profile Autofill
**Audience:** Frontend engineering, QA, design QA.
**Sources of truth:** 01 — Feature List · 01a — Product Questions Register · 01b — CTO Answers & Decisions · 02 — User Stories · 03 — Acceptance Criteria · 04 — Frontend Specs · `user-service` Resume Upload & Profile Autofill · `resume-parsing-service` Doc 00 · Figma designs and flow diagrams.

**Purpose.** Docs 03 and 04 define the intended paths. This document defines what happens when reality doesn't cooperate — conflicting states, dependency failures, timing races, abandoned flows, missing data, and the unusual things talent actually do. Each case states the scenario, why it occurs, the expected behaviour, the frontend handling, and the QA assertion.

**Framework-agnostic.** No markup, styling or framework specifics.

---

## How to read this document

Each case follows the same shape:

> **EC-nnn · Title** — *Severity* · *Reference*
> **Scenario** — what happens.
> **Why** — why it occurs in practice.
> **Expected** — the correct outcome.
> **Frontend handling** — what to build.
> **QA** — the assertion that proves it.
> - **EC-407 added** — leaving the talent profile mid-upload does not cancel the upload or parse.
> - **EC-209 rewritten** — a role with no start date is always saved. If start date is required it is saved **and flagged**; if optional, saved with no flag. The earlier conflict between "add it without the date" and validation is resolved.
> - **EC-205 rewritten** — de-duplication then import to the profile limit of 100, with no import-specific cap.
> - **EC-204 settled** — an ambiguous match is not a match. Nothing is overwritten; the entry is added. Replaces the provisional "most recently updated wins", which would have made a silent destructive write on a coin flip.

### Severity

| Level | Meaning |
|---|---|
| **Critical** | Risks data loss, an unauthorised disclosure, or a stuck talent. Must be handled before launch. |
| **High** | Produces visibly wrong or confusing state. Must be handled before launch. |
| **Medium** | Degrades the experience but is recoverable by the talent. Should be handled before launch. |
| **Low** | Cosmetic or rare. May be scheduled after launch if explicitly accepted. |

### New rulings

Cases marked **⚑ New ruling** were not decided in Docs 01–04. They are the CTO's call, made to keep the build unblocked. Cases marked **⚠ Needs decision** require product or design input and are collected in §13.

---

## 1. File intake anomalies

### EC-101 · Multiple files dropped at once — *Medium · AC-201*
**Scenario.** Talent selects or drops two or more files in one action.
**Why.** Habit from multi-upload interfaces; accidental multi-select in the picker.
**Expected.** The first file is accepted; the rest are ignored with an explanation.
**Frontend handling.** Take the first file in the selection. Render an inline, non-blocking message stating that one resume is uploaded at a time. Do not enter an error state — the accepted file proceeds normally.
**QA.** Drop three valid PDFs. Assert exactly one upload starts, the message appears, and the flow completes for the first file.

### EC-102 · Zero-byte file — *Medium · AC-302* **⚑ New ruling**
**Scenario.** A 0 KB file with a valid extension is selected.
**Why.** Interrupted export, failed cloud sync, corrupted download.
**Expected.** Rejected client-side as `invalid_type`.
**Frontend handling.** Add a client-side minimum-size check alongside the 5MB maximum. Reject before transfer using the unsupported-file-type message — the file is structurally not a readable document.
**QA.** Select a 0 KB `.pdf`. Assert no bytes are transferred and `invalid_type` renders.

### EC-103 · Extension and file signature disagree — *High · AC-302*
**Scenario.** A file named `resume.pdf` is not actually a PDF.
**Why.** Manual renaming; an image exported with the wrong extension.
**Expected.** Passes client-side validation, rejected server-side as `invalid_type`.
**Frontend handling.** The frontend cannot detect this pre-upload. It must render the server-returned `invalid_type` after a successful transfer — meaning `invalid_type` is reachable both before and after upload, and the component must support both entry points.
**QA.** Upload a renamed PNG. Assert progress completes, then `invalid_type` renders with **Try again**.

### EC-104 · Corrupted but well-formed document — *Medium · AC-305*
**Scenario.** A genuine PDF whose content stream is damaged and yields unreadable text.
**Why.** Truncated download; a failed export.
**Expected.** Text extraction produces nothing usable. The classification gate fails and returns `not_a_resume`.
**Frontend handling.** No special case — `not_a_resume` already covers it. Do not attempt to distinguish corruption from wrong content; the talent's remedy is identical.
**QA.** Upload a truncated PDF. Assert `not_a_resume` renders and no file is stored.

### EC-105 · File modified or removed on disk mid-upload — *Low · AC-303*
**Scenario.** The source file is deleted or overwritten while transferring.
**Why.** Cloud-sync clients; the talent tidying up.
**Expected.** `upload_failed`.
**Frontend handling.** Treat any read error during transfer as `upload_failed`. **Try again** must reopen file selection rather than retry the stale reference.
**QA.** Begin an upload, delete the source, assert `upload_failed` and that retry reopens the picker.

### EC-106 · Drag-and-drop unavailable — *High · AC-1301*
**Scenario.** Talent is on a touch device or an environment without drag-and-drop.
**Why.** Mobile and tablet are a substantial share of profile traffic.
**Expected.** File selection remains fully available.
**Frontend handling.** The **Choose File** affordance is always rendered and never subordinate to the drop target. Drag-specific copy must not be the only instruction present.
**QA.** On a touch viewport, assert the picker path completes an upload end to end.

### EC-107 · Upload stalls near completion — *Medium · AC-205* **⚑ New ruling**
**Scenario.** Progress reaches 99% and stops.
**Why.** Server-side processing after the last byte; a flaky connection.
**Expected.** The talent is not left watching an indefinite indicator.
**Frontend handling.** Progress never displays 100% while the request is unresolved — cap the visible value at 99% and transition to the processing indicator on response. Apply an upload-level timeout; on expiry, surface `upload_failed` with **Try again**.
**QA.** Simulate a stalled response. Assert the timeout fires and `upload_failed` renders rather than a permanent spinner.

### EC-108 · Upload succeeds but the response is lost — *High · AC-1407* **⚑ New ruling**
**Scenario.** The file is stored server-side but the client never receives confirmation.
**Why.** Connection dropped after the request was processed.
**Expected.** Retrying must not create a duplicate resume record.
**Frontend handling.** Send an idempotency key with each upload attempt and reuse it across retries of the same file. On reconnect, re-read the resume state before assuming failure — if a current resume already exists from this attempt, resume the flow at its actual status rather than restarting.
**QA.** Kill the response after storage, then retry. Assert exactly one resume record exists.

### EC-109 · Very long filename — *Low · AC-901*
**Scenario.** A 200-character filename.
**Why.** Auto-generated exports and versioned naming.
**Expected.** Layout is unaffected and the full name remains discoverable.
**Frontend handling.** Truncate with an ellipsis, preserve the extension in the visible portion, and expose the full name via tooltip and accessible name.
**QA.** Assert no layout overflow and that the full name is available to assistive technology.

---

## 2. Extraction and content anomalies

### EC-201 · Resume with no work history — *Medium · AC-1402*
**Scenario.** A new graduate uploads a resume containing only education.
**Why.** Common and entirely legitimate.
**Expected.** Normal success. Only populated groups render.
**Frontend handling.** `nothing_found` applies **only** when every group is empty. A single populated group is a successful import. Groups with zero items are omitted, never rendered as empty sections.
**QA.** Upload an education-only resume. Assert the summary shows one group and `nothing_found` does not fire.

### EC-202 · Entities extracted but all values are empty — *High · AC-307* **⚑ New ruling**
**Scenario.** The parse returns array entries whose fields are empty strings or nulls.
**Why.** A partially-parsed document; unusual layout confusing the model.
**Expected.** Treated as `nothing_found`, not as a successful import of blank rows.
**Frontend handling.** Validate entities before counting. An entry with no identifying value — no title and no company; no institution and no degree — is discarded. If discarding leaves every group empty, render `nothing_found`. Blank rows must never reach the summary or the profile.
**QA.** Return three work entries with empty fields. Assert `nothing_found` renders and no profile write occurs.

### EC-203 · Duplicate entries within a single resume — *High · AC-606* **⚑ New ruling**
**Scenario.** The same job or the same skill appears twice in one parse result.
**Why.** Resumes that repeat a role across sections; the model emitting a near-duplicate.
**Expected.** Deduplicated before anything is displayed.
**Frontend handling.** De-duplication runs across the incoming set **before** comparison against the profile, using the same normalisation as conflict matching — company + title + start date for work, institution + degree + field for education, normalised name for skills. Counts in the summary reflect the deduplicated set.
**QA.** Return a parse result with an exact duplicate job. Assert one row renders and the count reads 1.

### EC-204 · One extracted entry matches two existing profile entries — *High · AC-710* **⚑ Settled**
**Scenario.** The profile holds two entries that both match a single extracted entry under the matching rule.
**Why.** Pre-existing duplicates on the profile, created manually before this feature existed.
**Expected.** **An ambiguous match is not a match.** Nothing is overwritten. The extracted entry is added as a new record.
**Frontend handling.** Where an extracted entry matches two or more existing entries: do **not** present a conflict row — we cannot honestly state what would be replaced — and do **not** overwrite either record. Add the entry and report it in the summary as an ordinary addition. Log the occurrence for observability.
**Why not pick one.** Selecting the most recently updated would be a coin flip performing a **destructive, silent write** against a record the talent never chose between. Record-linkage practice names this failure *over-resolution* and treats ambiguity as a third outcome requiring escalation rather than automatic resolution. Our own rule already says the same thing: additive applies immediately, destructive requires consent — and consent cannot be obtained for a replacement we cannot describe.
**Residual cost.** The talent sees three similar entries instead of two and deletes one. Small, visible, reversible in a click — and strictly better than destroying data we were unsure about. The profile already contained two entries that looked like the same job; that is pre-existing mess we did not create and should not silently tidy.
**QA.** Seed two matching profile jobs, import a matching resume. Assert no conflict row, no record modified, and one entry added.

### EC-205 · Skills de-duplication against the profile limit — *Medium · AC-606, AC-607* **⚑ New ruling**
**Scenario.** A resume yields 28 skills, of which 9 already exist on the profile.
**Why.** Skill-dense technical resumes.
**Expected.** De-duplication runs first; the remainder is imported up to the profile's own limit of 100.
**Frontend handling.** Order of operations is fixed: deduplicate within the parse result → remove skills already on the profile or associated through `portfolio-service` → import the remainder in the order returned, stopping only at the profile limit. **There is no import-specific cap** — a talent with 40 legitimate skills on their resume gets 40. The summary count reflects skills actually added.
**QA.** Return 28 skills with 9 pre-existing. Assert 19 are added and the count matches. Separately, seed a profile at 100 skills and assert none is added and none reported.

### EC-206 · Resume contains several job titles — *Medium · AC-1104*
**Scenario.** A resume lists three or more roles, each with its own title.
**Why.** Any resume with more than one job on it — which is most of them.
**Expected.** **Only the most recent title is used.** The rest are discarded silently, no matter how many empty slots exist.
**Frontend handling.** Take the first title returned — resumes are reverse-chronological, so that is the current or most recent role. Write it into the first empty slot. Stop. Do not fill a second slot from an older title: the other two slots exist so the talent can declare *different kinds of work at different rates*, not to be filled with their own job history. No message, no dialog, no conflict row.
**QA.** Import three titles against three empty slots. Assert exactly one is written, it is the most recent, no rate is set, and no dialog appears.

### EC-207 · All job title slots already filled — *Low · AC-1105*
**Scenario.** The talent has three titles configured.
**Expected.** Extracted titles are discarded silently.
**Frontend handling.** No message. The talent did not ask for titles and is not told any were ignored.
**QA.** Assert no title or rate changes and no notification appears.

### EC-208 · Job title slot freed after an import — *Low* **⚑ New ruling**
**Scenario.** The talent deletes one of three titles after importing.
**Why.** Housekeeping.
**Expected.** No retroactive fill.
**Frontend handling.** Autofill is not re-run on profile edits. The freed slot stays empty until a new import or manual entry.
**QA.** Delete a title post-import. Assert the slot stays empty.

### EC-209 · Malformed or partial dates — *Medium · AC-1408*
**Scenario.** "Jan 2023 – Present", "2023", or no dates at all.
**Why.** Resume formatting varies enormously.
**Expected.** The entry imports with whatever dates exist.
**Frontend handling.** Never invent, infer or repair a date. Render what is present, never emit "undefined", "null", "NaN" or "Invalid Date", and never block the whole import because one entry has a gap.

**The entry is always saved.** If Work History treats start date as required, the role is saved **and flagged** so the talent can add the date in edit mode. If start date is optional, it is saved with no flag. Either way the data is kept *(AC-1106a, AC-1106b)*.

An entry missing a start date cannot participate in start-date matching, so it is treated as an **addition**, not a conflict.
**QA.** Import entries with each date shape. Assert all import, all render cleanly, and the date-less entry is added rather than matched.

### EC-210 · Future or implausible dates — *Low* **⚑ New ruling**
**Scenario.** A start date in the future, or an end date before the start date.
**Why.** Typos in the source document.
**Expected.** Imported as written; not silently corrected.
**Frontend handling.** Do not reject, reorder or repair dates. Render as extracted and let the talent correct them. Silent correction is worse than a visible typo the talent can see and fix.
**QA.** Import a reversed date range. Assert it imports and renders without a crash.

### EC-211 · Markup or script in extracted values — *Critical · AC-1410*
**Scenario.** Extracted text contains angle brackets or script-like content.
**Why.** Copy-pasted résumé content; deliberate probing.
**Expected.** Rendered as inert text everywhere.
**Frontend handling.** Escape all extracted values at every render point — summary, conflict rows, profile, tooltips and accessible names. Extracted content is never treated as trusted markup.
**QA.** Import a value containing a script tag. Assert it renders as visible text and does not execute.

### EC-212 · Extremely long field values — *Medium · AC-1411*
**Scenario.** A job title of 400 characters, or an unbroken string with no spaces.
**Why.** Poorly structured documents; parsing artefacts.
**Expected.** Layout holds.
**Frontend handling.** Truncate for display while retaining the full value in data. Force wrapping on unbroken strings. Apply in the summary, conflict rows and profile alike.
**QA.** Import a 400-character title and a 200-character unbroken token. Assert no horizontal overflow in any surface.

### EC-213 · Non-Latin scripts and right-to-left content — *Medium · AC-1304* **⚑ New ruling**
**Scenario.** A resume in Arabic, Hebrew, Japanese or Cyrillic.
**Why.** A global talent marketplace.
**Expected.** Extraction proceeds; values are stored and rendered as written, untranslated.
**Frontend handling.** Do not assume Latin script in truncation, sorting or normalisation. Apply directionality per value so RTL content renders correctly inside an LTR interface. Name matching must normalise Unicode rather than stripping non-ASCII characters.
**QA.** Import Arabic and Japanese resumes. Assert correct rendering, no mojibake, and no false name mismatch.

### EC-214 · Confidence sits exactly at the threshold — *Low · AC-305* **⚑ New ruling**
**Scenario.** The parse returns confidence of precisely 0.7.
**Expected.** Accepted. The gate is "below 0.7 fails", so 0.7 passes.
**Frontend handling.** Use a strict less-than comparison. Document it so the boundary is not re-litigated during tuning.
**QA.** Return exactly 0.7. Assert the flow proceeds.

---

## 3. Timing, concurrency and races

### EC-301 · Concurrent uploads in two tabs — *Critical · AC-1407*
**Scenario.** The talent starts an upload in one tab, then another in a second tab.
**Why.** Multiple tabs open on the profile.
**Expected.** One upload in flight per talent. The second is rejected; the first is unaffected.
**Frontend handling.** Check for an in-flight upload before starting one. On rejection, render a clear message stating an upload is already in progress — not a generic failure. The rejected tab must not cancel, corrupt or interfere with the first upload.
**QA.** Start uploads in two tabs. Assert the first completes normally and the second shows the specific message.

### EC-302 · Profile edited in a second tab while the conflict dialog is open — *Critical · AC-707* **⚑ New ruling**
**Scenario.** The talent opens the conflict dialog, then edits or deletes one of the conflicting entries elsewhere.
**Why.** Multi-tab working; a phone and a laptop at once.
**Expected.** A stale conflict row must never overwrite a newer edit.
**Frontend handling.** Send an entity version or updated-at value with each conflict decision. If the server reports a mismatch, do not apply that row. Close the dialog and render a recoverable message stating the profile changed and asking the talent to review again, re-entering via the pending-review path. Rows that did not change still apply.
**QA.** Open the dialog, mutate a conflicting entry externally, confirm. Assert the stale row is not applied and the talent is told why.

### EC-303 · Resume deleted while a parse is in flight — *High · AC-1405*
**Scenario.** The talent deletes their resume from a second surface while parsing continues.
**Expected.** The parse result is discarded. Nothing is written.
**Frontend handling.** On resolution, verify the resume still exists before applying anything. If it does not, discard silently and leave the card in `empty`. No error is shown — the talent got what they asked for.
**QA.** Delete during parse. Assert no profile write and the card renders `empty`.

### EC-304 · Notification arrives after the review was resolved elsewhere — *Medium · AC-403* **⚑ New ruling**
**Scenario.** An async parse notification is delivered after the talent already resolved that review in another tab.
**Expected.** The notification does not reopen a resolved flow.
**Frontend handling.** Re-read the current status when the notification is actioned. If the parse is already `applied`, `undone` or superseded, take the talent to the profile rather than to a stale review dialog.
**QA.** Resolve a review, then action the stale notification. Assert no dialog opens.

### EC-305 · Second upload started while a review is pending — *High* **⚑ New ruling**
**Scenario.** The talent has an unresolved `ready_for_review` and uploads a new resume.
**Why.** They abandoned the first review and started over.
**Expected.** The new upload supersedes the pending review.
**Frontend handling.** Before starting, warn that a pending review exists and will be discarded. On confirmation, discard the pending result, clear the re-entry prompt and proceed. Non-conflicting additions already applied from the earlier parse remain — they were applied on arrival and are not implicitly reversed.
**QA.** Leave a review pending, upload again, assert the prompt clears and the new flow runs.

### EC-306 · Page refreshed while a dialog is open — *High · AC-709* **⚑ New ruling**
**Scenario.** The talent refreshes during the conflict or summary dialog.
**Expected.** Nothing destructive occurs. State is recoverable.
**Frontend handling.** Dialogs hold no unsaved destructive state — the conflict dialog applies nothing until confirmed, so a refresh is equivalent to **Keep Existing**. On reload, if the parse is still `ready_for_review`, render the pending-review prompt. Never restore a dialog mid-decision with partially remembered checkbox state.
**QA.** Refresh during each dialog. Assert no writes and that the correct card state renders.

### EC-307 · Browser back during the review flow — *High · AC-709*
**Scenario.** The talent presses back while a dialog is open.
**Expected.** Identical to dismissal.
**Frontend handling.** Back resolves the conflict dialog to **Keep Existing** and the summary to **Looks good!**. Back must never bypass a dialog and land the talent on a mutated profile with no explanation.
**QA.** Press back in each dialog. Assert the documented dismissal outcome.

### EC-308 · Network lost mid-review — *High* **⚑ New ruling**
**Scenario.** Connectivity drops between opening the conflict dialog and confirming.
**Expected.** The talent is told the action did not apply.
**Frontend handling.** On failure to submit conflict decisions, keep the dialog open with selections intact and render an inline retry. Never close the dialog on a failed submission — closing implies a decision was recorded.
**QA.** Sever the connection, confirm, assert the dialog stays open with selections preserved and a retry offered.

### EC-309 · Signed URL expires while the preview is open — *Medium · AC-1003, AC-902*
**Scenario.** The talent leaves the resume preview open past URL expiry.
**Expected.** Fails closed and is recoverable.
**Frontend handling.** On expiry, render a recoverable message with an action that requests a fresh URL. Never render a blank frame or a raw storage error.
**QA.** Force expiry with the preview open. Assert the recoverable state renders and refresh restores the document.

### EC-310 · Clock skew on the "Added on" date — *Low · AC-901* **⚑ New ruling**
**Scenario.** The displayed date is off by a day for talent near the date line.
**Why.** Server timestamps rendered in local time.
**Expected.** The date reflects the talent's locale and timezone.
**Frontend handling.** Format server timestamps in the talent's timezone, not the server's. Never render a raw ISO string.
**QA.** With the client set to UTC+13, assert the date matches local expectation.

---

## 4. Session, authentication and navigation

### EC-401 · Session expires mid-parse — *High · AC-1404*
**Scenario.** Authentication lapses while parsing.
**Expected.** No data loss and no partial write.
**Frontend handling.** On re-authentication, return the talent to the profile and render the pending-review prompt if the parse resolved. The result survives the session.
**QA.** Expire the session during parse, re-authenticate, assert the prompt appears and review completes.

### EC-402 · Session expires with a dialog open — *High* **⚑ New ruling**
**Scenario.** Authentication lapses while the conflict dialog is displayed.
**Expected.** No write occurs and the talent is not silently dropped.
**Frontend handling.** A rejected submission due to authentication renders a re-authentication path rather than a generic error. Selections are discarded on re-entry — the talent decides again, which is the safe direction. Nothing is applied.
**QA.** Expire the session, confirm the dialog, assert no write and that re-authentication is offered.

### EC-403 · Onboarding abandoned after upload — *Medium · AC-1414*
**Scenario.** The talent uploads at step 1 and leaves onboarding entirely.
**Expected.** The resume and any seeded data persist.
**Frontend handling.** On return, the talent resumes onboarding with the stored resume in place, or reaches the profile with the Resume card populated. Do not re-prompt for an upload that already happened.
**QA.** Upload, abandon, return. Assert the resume is present on both surfaces.

### EC-404 · Pre-profile authentication on the onboarding path — *High · §13*
**Scenario.** Upload occurs at step 1, before the profile fully exists.
**Why.** The resume seeds the profile, so it necessarily precedes it.
**Expected.** The talent never sees an authentication error.
**Frontend handling.** Use the pre-profile token model from `auth-service` on S1. A token or scope failure must render as a recoverable upload error with **Try again**, never as a sign-in prompt mid-onboarding.
**QA.** Force a token failure on S1. Assert a recoverable upload error and that **Skip** remains available.

### EC-405 · Navigation away during upload — *Medium · AC-1406*
**Scenario.** The talent leaves the page mid-transfer.
**Expected.** The upload is abandoned cleanly.
**Frontend handling.** No partial file is stored and no `uploading` state persists on return. Do not present a "leave site?" prompt for an upload — it is recoverable and the friction is not warranted.
**QA.** Navigate away mid-upload and return. Assert the dropzone is `idle` and no partial record exists.

### EC-407 · Leaving the talent profile mid-upload — *Medium* **⚑ New ruling**
**Scenario.** The person navigates away from the talent profile while an upload or parse is running — including switching their account to client mode.
**Why.** Both are one click away, and tearing down the talent interface could plausibly tear down the in-flight request with it.
**Expected.** The work is not thrown away.
**Frontend handling.** Do **not** cancel the upload or parse. On return, the flow is at whatever state it reached: stored, `ready_for_review` with the pending prompt, or a failure state with its retry.
**QA.** Leave mid-parse, return. Assert the outcome is intact.

### EC-406 · Account deleted mid-flow — *Low* **⚑ New ruling**
**Scenario.** The account is deleted while an upload or parse is in progress.
**Expected.** Everything is discarded.
**Frontend handling.** Any request rejected for a non-existent account terminates the flow silently and routes the talent out. No error dialog referencing resumes.
**QA.** Delete the account mid-parse. Assert no resume artefacts survive and no resume-specific error renders.

---

## 5. Identity and name matching

### EC-501 · Re-upload after onboarding seeded the name — *High · AC-503* **⚑ New ruling**
**Scenario.** The account name came from a resume at onboarding. The talent later uploads on the profile path.
**Why.** The normal lifecycle — onboarding seeds, profile refreshes.
**Expected.** Matching runs against the seeded name as it would any other account name.
**Frontend handling.** No special case. If the same resume is uploaded, it matches. If a different person's resume is uploaded, the mismatch warning correctly fires. The provenance of the account name is irrelevant to the comparison.
**QA.** Seed a name at onboarding, then upload a different person's resume on the profile. Assert the warning fires.

### EC-502 · Talent renames their account after import — *Low* **⚑ New ruling**
**Scenario.** The account name is changed after a resume was imported.
**Expected.** No retroactive effect.
**Frontend handling.** Matching runs only at upload time. A rename never re-triggers validation and never invalidates existing profile data.
**QA.** Import, rename, assert no prompts or changes.

### EC-503 · Identity verification contradicts the seeded name — *High · AC-510* **⚠ Needs decision**
**Scenario.** Onboarding seeded "Mike Chen" from a resume; verification later returns "Michael Chen".
**Why.** Resumes carry preferred names; verification carries legal names.
**Expected ruling.** The verified legal name becomes the name of record. The talent is offered the update rather than having it applied silently.
**Frontend handling.** This belongs to the identity verification epic, not this one. **This epic's only obligation is that no resume upload may modify a verified name** — after verification, the mismatch warning may fire but the account name is never written by this feature.
**QA.** Verify an account, upload a resume with a different name, assert the account name is unchanged.
**Open.** The prompt-to-update behaviour is owned by identity verification; confirm it exists there.

### EC-504 · Mononym or single-token name — *Medium · AC-504* **⚑ New ruling**
**Scenario.** The resume or the account holds a single name with no surname.
**Why.** Common in Indonesia, Iceland and elsewhere.
**Expected.** Not treated as a mismatch by default.
**Frontend handling.** With only one token available, a match on that token passes. Matching must not require both a first and a last name to be present.
**QA.** Compare "Sukarno" to "Sukarno" and to "Sukarno Wijaya". Assert both pass.

### EC-505 · Initials only — *Low · AC-504* **⚑ New ruling**
**Scenario.** The resume renders the name as "C. Torres".
**Expected.** Passes on the surname match.
**Frontend handling.** Because a match on **either** token is sufficient, "Torres" carries it. No initial-expansion logic is required.
**QA.** Compare "Christopher Torres" to "C. Torres". Assert a pass.

### EC-506 · Name appears in a header or footer only — *Low · AC-509*
**Scenario.** Extraction returns no name because it sits in a graphic or an unparsed region.
**Expected.** Silent pass.
**Frontend handling.** A missing name is never a mismatch. Proceed without a warning.
**QA.** Return a null name on the profile path. Assert no dialog appears.

### EC-507 · Two names present in the document — *Medium* **⚑ New ruling**
**Scenario.** A reference's name, or a previous owner's name in metadata, is extracted instead of the talent's.
**Expected.** A false mismatch warning is acceptable; a block is not.
**Frontend handling.** This is precisely why the warning never blocks. **Yes, this is mine** must always be available and must always proceed.
**QA.** Force a wrong extracted name. Assert the talent can proceed in one action.

---

## 6. Conflicting and ambiguous states

### EC-601 · Every extracted entity duplicates existing data — *Medium · AC-1413*
**Scenario.** A re-upload of an already-imported resume.
**Expected.** No additions. Conflicts handle the overlaps.
**Frontend handling.** If the talent declines everything, the summary reports that nothing changed rather than rendering empty groups. The dialog sequence still runs — the talent asked for something to happen and deserves to see the outcome.
**QA.** Import the same resume twice. Assert the conflict dialog appears and the second summary reports no change when declined.

### EC-602 · Very large number of conflicts — *Medium* **⚑ New ruling**
**Scenario.** A twenty-year resume produces thirty or more conflict rows.
**Expected.** The dialog stays usable.
**Frontend handling.** The dialog body scrolls while the header and both actions remain fixed and visible. A row count is shown so the talent knows the scale before scrolling. Actions must never be pushed below the fold — a talent who cannot see **Keep Existing** cannot decline safely.
**QA.** Render forty conflict rows. Assert both actions remain visible without scrolling and the list scrolls independently.

### EC-603 · Conflicts in one entity type only — *Low · AC-703*
**Scenario.** Work history conflicts; education and certifications do not.
**Expected.** Only the work history group renders.
**Frontend handling.** Omit groups with no conflicts entirely. Never render an empty section with a heading.
**QA.** Produce a work-only conflict set. Assert one group renders.

### EC-604 · All rows unchecked, then confirmed — *Medium · AC-707*
**Scenario.** The talent unchecks everything and activates **Yes, Update**.
**Expected.** Nothing is modified and no error occurs.
**Frontend handling.** **Yes, Update** stays enabled with zero selections. It applies nothing and advances to the summary, which reports the additions only. Disabling the button would strand a talent who wants exactly this outcome but has already reasoned their way there.
**QA.** Uncheck all, confirm, assert no writes and that the summary renders.

### EC-605 · Extracted entry matches an entry the talent is mid-edit on — *High* **⚑ New ruling**
**Scenario.** A profile entry is open in an edit form when the import resolves.
**Expected.** Unsaved local edits are not destroyed silently.
**Frontend handling.** Where an unsaved edit exists for a conflicting entry, the conflict row is flagged and defaults to **unchecked** — the sole documented exception to the all-checked default of AC-705. The talent's in-progress work outranks the resume.
**QA.** Open an edit form, resolve an import touching that entry, assert the row is unchecked by default.

### EC-606 · Undo after a manual edit to an imported entry — *High* **⚑ New ruling**
**Scenario.** The talent edits an imported entry, then activates **Undo Changes**.
**Why.** Undo lives with the summary dialog, so the window is narrow — but a second tab makes it reachable.
**Expected.** Undo does not silently discard newer manual work.
**Frontend handling.** Undo reverses the sync as recorded. Where an entry has been modified since import, exclude it from the reversal and leave it in place. Report the outcome plainly rather than claiming a complete reversal.
**QA.** Import, edit an entry in a second tab, undo. Assert the edited entry survives.

### EC-607 · Additions applied, conflicts abandoned — *Medium · AC-803*
**Scenario.** The talent closes the tab during the conflict dialog.
**Expected.** Additions stand; nothing is overwritten.
**Frontend handling.** This is the designed behaviour of P1 and P2, not a failure. Surface the pending-review prompt so the conflict decision remains reachable. The talent must not be told anything is broken.
**QA.** Abandon at the conflict dialog. Assert additions persist, no overwrite occurred, and the prompt renders.

---

## 7. Dependency failures

### EC-701 · Parsing service unavailable — *High · AC-404*
**Scenario.** `resume-parsing-service` is down or unreachable.
**Expected.** A recoverable error after one automatic retry. Nothing written.
**Frontend handling.** Render `parse_failed` with **Try again**. Do not expose vendor or service names in talent-facing copy. On S1, **Skip** and **Continue** remain enabled so onboarding is never blocked by an outage.
**QA.** Force the service offline. Assert a recoverable error, an intact profile, and that onboarding remains completable.

### EC-702 · Storage unavailable for view or download — *Medium* **⚑ New ruling**
**Scenario.** The Resume card shows a file but the object store cannot serve it.
**Expected.** A recoverable error scoped to the action.
**Frontend handling.** The card continues to render the file record — metadata lives in the database and is still valid. Only the attempted action fails, with a retry. Do not degrade the card to `empty`; the file is not gone.
**QA.** Force a storage failure on view. Assert the card still shows the record and the action offers a retry.

### EC-703 · Portfolio service unavailable during de-duplication — *Medium* **⚑ New ruling**
**Scenario.** Case-study skills cannot be retrieved while de-duplicating.
**Expected.** The import is not blocked.
**Frontend handling.** Degrade gracefully — deduplicate against the profile's own skills and proceed. A skill duplicated because a cross-service lookup failed is a minor cosmetic defect; a blocked import over a secondary dependency is not acceptable.
**QA.** Force the lookup to fail. Assert the import completes.

### EC-704 · Virus scan unavailable — *High* **⚑ New ruling**
**Scenario.** The scanning dependency is down.
**Expected.** Fail closed.
**Frontend handling.** An unscanned file is never stored or parsed. Render `upload_failed` with **Try again**. Security posture outranks convenience, and the talent's remedy — retry later — is intact.
**QA.** Force the scanner offline. Assert the upload fails and nothing is stored.

### EC-705 · Notification delivery fails — *Low · AC-403*
**Scenario.** The async completion notification is not delivered.
**Expected.** The talent can still reach the result.
**Frontend handling.** The pending-review prompt on the Resume card is the durable path and does not depend on notification delivery. Notification is an accelerator, never the only route.
**QA.** Suppress notifications. Assert the prompt still appears and the review completes.

---

## 8. Permission and visibility

### EC-801 · Resume rendered in a client-facing surface — *Critical · AC-1001, AC-1002*
**Scenario.** A regression exposes the resume to a client.
**Why.** New client-facing surfaces added later without the exclusion.
**Expected.** Never rendered, anywhere.
**Frontend handling.** Treat exclusion as a standing assertion rather than a one-time implementation. Every client-facing surface must be covered by a test asserting the absence of the resume record, filename, date and preview.
**QA.** Assert absence across public profile, search results, proposals, applications and View-as-Client.

### EC-802 · View-as-Client leaves a residual gap — *High · AC-1002*
**Scenario.** The card is hidden but its container or heading remains.
**Why.** Visibility toggled by styling rather than by omission.
**Expected.** Absent from the layout entirely.
**Frontend handling.** Omit the component, do not hide it. No residual spacing, heading or divider may indicate that something was removed.
**QA.** Compare the View-as-Client layout against the owner view. Assert no empty region where the card sits.

### EC-803 · Support agent without the restricted role — *Critical · AC-1305*
**Scenario.** An agent lacking the role attempts to view a resume.
**Expected.** No access.
**Frontend handling.** No resume affordance renders on any support surface without the role. Absence is the correct treatment — not a disabled control, which itself confirms the file exists.
**QA.** Assert no resume surface renders for an unprivileged agent.

### EC-804 · Team lead viewing a member's profile — *High · AC-1305*
**Scenario.** A lead opens a team member's profile.
**Expected.** No resume access.
**Frontend handling.** Team context grants no resume visibility. The card renders only for the profile owner.
**QA.** Assert the card is absent in the team-lead view.

### EC-805 · Signed URL shared outside the product — *Medium · AC-1003*
**Scenario.** A talent copies a signed URL and shares it.
**Expected.** It expires quickly and cannot be revived.
**Frontend handling.** Short expiry, single-purpose URLs, never surfaced as copyable link text in the interface. This is a containment measure, not a prohibition on the talent sharing their own resume.
**QA.** Assert a URL past expiry fails closed.

---

## 9. Missing data and empty states

Every empty state below must be independently reachable for design QA.

| ID | State | Trigger | Required treatment | Severity | Ref |
|---|---|---|---|---|---|
| **EC-901** | Resume card, empty | No resume stored | Prompt copy and upload affordance. No lifecycle actions rendered | Medium | AC-910 |
| **EC-902** | Summary, nothing changed | Conflicts all declined, no additions | Reports that nothing changed. Never renders empty groups | Medium | AC-712 |
| **EC-903** | Group omitted | An entity type yielded no items | Omitted entirely. Never an empty section with a heading | Medium | AC-601 |
| **EC-904** | `nothing_found` | Valid resume, zero entities | Its own message. **File is stored**, checklist step completes, lifecycle actions available | High | AC-307, AC-308 |
| **EC-905** | Checklist, all complete | Every step done | "All Complete!" replaces the count | Low | AC-107 |
| **EC-906** | No profile data to conflict with | First-ever import | Conflict dialog never opens. Straight to summary | Medium | AC-711 |
| **EC-907** | Certification with no issuer | Issuer absent from the document | Renders with the name alone. No placeholder text | Low | AC-603 |
| **EC-908** | Work entry with no company | Title only | Imports and renders with what exists. Cannot participate in matching, so treated as an addition | Medium | AC-603, EC-209 |

### EC-909 · Empty state must not be confused with a failure — *High* **⚑ New ruling**
**Scenario.** `nothing_found` renders in a treatment resembling an error.
**Why.** Both are non-happy outcomes and tend to share components.
**Expected.** Visually distinct. The upload succeeded and the file is stored.
**Frontend handling.** Use an informational treatment, not the error treatment. The presence of the stored file on the card is itself the signal that the upload worked.
**QA.** Assert `nothing_found` and `not_a_resume` are visually distinguishable and that only the former leaves a stored file.

---

## 10. Fallback behaviours

| ID | Failure | Fallback | Severity | Ref |
|---|---|---|---|---|
| **EC-1001** | Extraction unavailable | Manual profile entry, unblocked. On S1, **Skip** remains available | High | EC-701 |
| **EC-1002** | Name matching cannot run | Treat as a pass. Never block on an unavailable check | Medium | AC-509 |
| **EC-1003** | Case-study skill lookup fails | Deduplicate against profile skills only, proceed | Medium | EC-703 |
| **EC-1004** | Notification undeliverable | Pending-review prompt on the card is the durable path | Low | EC-705 |
| **EC-1005** | Preview cannot render | Offer download instead. The file is retrievable even when it is not viewable | Medium | AC-902 |
| **EC-1006** | Async handoff fails to fire | The 30s timeout still applies and surfaces a recoverable error. The talent is never held indefinitely | High | AC-403, AC-404 |
| **EC-1007** | Locale or timezone unavailable | Fall back to a documented default format. Never render a raw ISO timestamp | Low | EC-310 |
| **EC-1008** | Confidence value absent from the response | Treat as below threshold — `not_a_resume`. Fail closed | High | AC-305 |

---

## 11. Cross-surface divergence

The single most likely source of long-term defects is S1 and S3 drifting apart. **Everything before the parse result must be identical** — uploader, validation, failure states, error copy. What happens after the parse result differs by design and is listed in Doc 04 §2.

| ID | Divergence | Permitted? | Severity |
|---|---|---|---|
| **EC-1101** | Name matching skipped on S1 | ✅ Required | — |
| **EC-1102** | Step navigation present on S1 only | ✅ Required | — |
| **EC-1103** | Account name seeded on S1 only | ✅ Required | — |
| **EC-1103a** | **Review flow never entered on S1** — no name-mismatch, conflict or summary dialog | ✅ Required | — |
| **EC-1103b** | Extracted data pre-fills onboarding steps 2–6 on S1, rather than being reported in a summary | ✅ Required | — |
| **EC-1104** | Different error copy between surfaces | ❌ Defect | High |
| **EC-1105** | Different validation thresholds | ❌ Defect | Critical |
| **EC-1106** | Different conflict or summary behaviour | ❌ Defect | Critical |
| **EC-1107** | Different dismissal semantics | ❌ Defect | Critical |
| **EC-1108** | Pre-save preview on one surface only | ❌ Defect | Medium |

**QA approach.** Run the full **intake and failure** suite against both surfaces from the same fixtures — everything up to and including the parse result must behave identically. Divergence there fails the build.

Review-flow assertions apply to **S3 only**. On S1 the corresponding assertion is the inverse: a successful parse must produce **no dialog at all** and must leave steps 2–6 pre-filled.

---

## 12. Accessibility edge cases

### EC-1201 · Screen reader and the pending-review prompt — *Medium · AC-1302* **⚑ New ruling**
**Scenario.** The card changes to `pending-review` after an async parse resolves.
**Expected.** The change is announced without hijacking focus.
**Frontend handling.** Announce politely. Do not move focus — the talent may be mid-task elsewhere on the profile.
**QA.** Assert a polite announcement and that focus does not move.

### EC-1202 · Focus after a dialog closes on an error — *Medium · AC-1302*
**Scenario.** A dialog closes because of a failure rather than a talent action.
**Expected.** Focus lands somewhere sensible.
**Frontend handling.** Return focus to the invoking control, or to the error message where the invoking control no longer exists. Focus must never be lost to the document body.
**QA.** Force each error-driven close. Assert focus lands on a meaningful element.

### EC-1203 · Progress announcements flooding — *Medium · AC-1302*
**Scenario.** Percentage updates are announced on every tick.
**Expected.** Progress is conveyed without overwhelming the talent.
**Frontend handling.** Throttle announcements to meaningful intervals, and always announce start and completion.
**QA.** Assert no more than a small number of announcements across a full upload.

### EC-1204 · Conflict checkbox names are indistinguishable — *High · AC-1303*
**Scenario.** Every checkbox announces only "Apply Update".
**Expected.** Each identifies the entry it governs.
**Frontend handling.** Compose the accessible name from the entry's identifying detail — "Apply update to VP of Engineering at Android" rather than "Apply update". Without this, per-entry choice is unusable by screen reader and the feature fails AC-1303.
**QA.** Assert every checkbox has a unique, meaningful accessible name.

### EC-1205 · Reduced motion — *Low* **⚑ New ruling**
**Scenario.** The talent has reduced-motion preferences set.
**Expected.** Animated indicators respect it.
**Frontend handling.** Provide a static or minimally animated processing indicator under reduced-motion preferences. Progress must remain legible without animation.
**QA.** Assert the indicator degrades correctly with the preference set.

---

## 13. Items requiring a decision

One case in this document still needs input from another epic's owner. It does not block the build — it has a documented default. EC-204, previously listed here, is now settled (see §3).

| # | Case | Provisional ruling | Who decides |
|---|---|---|---|
| 1 | ~~**EC-204**~~ — **settled.** An ambiguous match is not a match: nothing is overwritten, the entry is added. Grounded in record-linkage practice, which treats ambiguity as escalation rather than automatic resolution | Closed |
| 2 | **EC-503** — verification returns a legal name differing from the resume-seeded name | This epic guarantees only that no resume modifies a verified name. The prompt-to-update flow belongs to identity verification | Product, with identity verification |

Additionally, two error states have **draft copy awaiting sign-off** (drafts are in Doc 08 and the UX updates doc). They block their phases only until the copy is approved:

| State | Blocks until approved | Owner |
|---|---|---|
| `rate_limited` | Phase 1 | UX writing — draft ready |
| `password_protected` | Phase 2 | UX writing — draft ready |

---

## 14. Coverage summary

| Category | Cases | Critical | High | Medium | Low |
|---|---|---|---|---|---|
| 1 · File intake | 9 | 0 | 3 | 4 | 2 |
| 2 · Extraction and content | 14 | 1 | 4 | 6 | 3 |
| 3 · Timing and concurrency | 10 | 2 | 5 | 2 | 1 |
| 4 · Session and navigation | 6 | 0 | 3 | 2 | 1 |
| 5 · Identity and matching | 7 | 0 | 2 | 3 | 2 |
| 6 · Conflicting states | 7 | 0 | 3 | 3 | 1 |
| 7 · Dependency failures | 5 | 0 | 3 | 2 | 0 |
| 8 · Permission and visibility | 5 | 2 | 2 | 1 | 0 |
| 9 · Missing data and empty states | 9 | 0 | 2 | 5 | 2 |
| 10 · Fallback behaviours | 8 | 0 | 3 | 3 | 2 |
| 11 · Cross-surface divergence | 8 | 3 | 1 | 1 | — |
| 12 · Accessibility | 5 | 0 | 1 | 3 | 1 |
| **Total** | **93** | **8** | **32** | **35** | **15** |

**Launch gate.** All Critical and High cases — **40 in total** — must be handled and covered by tests before the epic ships. Medium cases should be handled; any deferral must be explicitly accepted. Low cases may be scheduled after launch.

### The eight Critical cases

| ID | Case |
|---|---|
| EC-211 | Markup or script in extracted values |
| EC-301 | Concurrent uploads in two tabs |
| EC-302 | Profile edited elsewhere while the conflict dialog is open |
| EC-801 | Resume rendered in a client-facing surface |
| EC-803 | Support agent without the restricted role |
| EC-1105 | Divergent validation thresholds between surfaces |
| EC-1106 | Divergent conflict or summary behaviour between surfaces |
| EC-1107 | Divergent dismissal semantics between surfaces |

Five of the eight are containment failures — data reaching somewhere it should not, or the two surfaces behaving differently. Both classes are cheap to prevent with a shared engine and standing assertions, and expensive to discover in production.

---

## 15. Out of scope

| Item | Status |
|---|---|
| Re-import from an already-stored file | Fast-follow — RU-513 |
| Multiple stored resumes | Future — RU-512 |
| Visible provenance for imported skills | Excluded in v1 — RU-409 |
| Email notification on async completion | Future — RU-403 |
| Platform account-deletion retention policy | Platform-level — RU-510 |
| DPA and compliance posture for extraction | Compliance documentation |
| Lower-cost extraction model evaluation | Post-launch — RU-807 |
