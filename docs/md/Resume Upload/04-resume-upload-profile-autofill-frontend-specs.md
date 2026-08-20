# 04 — Resume Upload & Profile Autofill · Frontend Specs

> **Updated 22 July 2026.** Confirmed decisions cascaded from the Overview Docs.
>
> - **§2 surface map rewritten.** S5 is invoked from S3 only. The "shared engine with three differences" framing is replaced by *identical up to the parse result, different destinations after it*, with a comparison table.
> - **§3.7–3.10** — name-mismatch, conflict and summary components marked profile-only.
> - **§5.1 onboarding flow rewritten** — no dialogs; extracted data pre-fills steps 2–6 and the steps themselves are the review surface.
> - **§11 field scope** — job title is now most recent only into one empty slot; "desired work / project types" removed as an invented field; the closed-schema rule added.
> - **§18** — privacy disclosure closed as a design item.
> - **§8.6** — the third-party privacy clause is now a wording correction pending PM sign-off, not an addition.
> - **Correction, same day:** §5.1 and §11 reworded — the field list is illustrative, not a whitelist.
> - **§7** — scope line added: this is a talent feature; clients do not upload resumes.
> - **§11** — save-then-flag validation rule added, with the edit-mode-only visibility constraint.
> - **§11** — skills cap corrected to the profile's own limit of 100.
> - **§18 rewritten** as the complete design-work list — 21 items plus 3 comp bugs, sized by effort and mapped to phase. Added **§18.3**, the conflict dialog's fixed-actions requirement, which was previously only in the edge cases doc. `ConflictDialog` spec gains the layout constraint, the locally-edited row exception, and the accessible-name requirement.


**Parent epic:** Talent Profile
**Epic (this doc):** Resume Upload & Profile Autofill
**Audience:** Frontend engineering, QA, design QA.
**Scope:** Everything the frontend must build, render, guard and handle for this epic.
**Sources of truth:** 01 — Feature List · 01a — Product Questions Register · 01b — CTO Answers & Decisions · 02 — User Stories · 03 — Acceptance Criteria · `user-service` Resume Upload & Profile Autofill · `resume-parsing-service` Doc 00 · Figma designs and flow diagrams.

**Framework-agnostic by design.** No markup, styling or framework specifics. Component names below are logical units of behaviour, not file names.

**Traceability.** Every section cites the **AC** criteria it implements. AC IDs trace to **RUS** stories and onward to **RU** features.

---

## 1. Governing principles

These four rules resolve most ambiguity encountered during build. When a detail is unspecified, apply them.

| # | Principle | Consequence for the frontend |
|---|---|---|
| **P1** | **Additive is applied; destructive requires consent.** | The summary screen is a receipt, not a gate. Its primary action commits nothing. Only the conflict dialog gates a write. |
| **P2** | **Dismissal is always safe.** | Escape, click-outside, ✕, browser back and tab close must never overwrite or delete. Every dialog needs an explicitly defined dismissal outcome. |
| **P3** | **Failure states are distinct, never generic.** | Eighteen named statuses (§4). A shared "something went wrong" component fails acceptance. |
| **P4** | **The resume is private, always.** | No client-facing surface may render the file, its name, its date, or a derived preview. |

---

## 2. Surface map

Where this epic appears in the product. Each surface is independently routable and independently testable.

| # | Surface | Context | Contains |
|---|---|---|---|
| **S1** | Onboarding resume step | Onboarding, step 1 of 6 | Uploader, step navigation, all failure states. **No review flow** |
| **S2** | Profile prompt modal | Profile, incomplete + no resume | Prompt copy, dismissal |
| **S3** | Profile sidebar Resume card | Profile, always present to the owner | Empty state, file record, lifecycle actions, re-entry prompt |
| **S4** | Profile completion checklist | Profile modal | *Upload Resume* step, completion count |
| **S5** | Review flow | Overlay, **invoked from S3 only** | Name-mismatch warning, conflict dialog, summary dialog |
| **S6** | View-as-Client | Profile, preview mode | **Absence** of S3 — an assertion surface, not a feature surface |

**Shared uploader, different destinations.** S1 and S3 use the same uploader, the same validation and the same failure states. What happens *after* a successful parse differs completely, and the difference is structural rather than cosmetic:

| | S1 — onboarding | S3 — profile |
|---|---|---|
| Name matching | **Skipped.** The resume seeds the name | Runs. Warns on mismatch |
| Review flow (S5) | **Never invoked** | Invoked on every successful parse |
| Conflict dialog | **Unreachable** — the profile is empty, nothing can conflict | Shown when conflicts exist |
| Summary dialog | **Never shown** | Shown on every successful parse |
| Where extracted data goes | **Pre-fills onboarding steps 2–6**, seen in context and editable there | Written to the profile, reported in the summary |
| Step navigation | Back / Skip / Continue | None |

**Why there is no review flow at onboarding.** At step 1 the profile does not yet exist. Nothing can conflict, so the conflict dialog has no purpose. And a summary reporting "we updated your profile" would describe a profile the talent has never seen — a receipt with no context. The extracted data instead appears pre-filled on the steps that follow, beside its own labels, correctable in place.

**Everything before the parse result is identical.** Uploader, validation, every failure state and every error string must behave the same on both surfaces. Divergence there is a defect *(EC-1104 to EC-1108)*.

---

## 3. Component inventory

Logical components, their responsibilities, and the states each must render. A component is complete only when every listed state is implemented and reachable in isolation.

### 3.1 `Uploader`
**Responsibility:** file selection, client-side validation, transfer, and surfacing of every intake and processing status.
**Used by:** S1, S3 — identically.
**States:** `idle` · `drag-over` · `disabled` · `uploading` · `uploaded` · and every failure status in §4.
**Must support:** drag-and-drop, file-picker selection, keyboard activation, progress display, inline retry.
**Implements:** AC-201 → AC-205, AC-301 → AC-310, AC-1301, AC-1302.

### 3.2 `FileConstraintsHint`
**Responsibility:** state the accepted formats and size limit before any interaction.
**Rendered:** inside `Uploader` in `idle` and `drag-over`.
**Implements:** AC-203.

### 3.3 `PrivacyDisclosure`
**Responsibility:** render the approved privacy copy and the policy link.
**Rendered:** on both upload surfaces.
**Implements:** AC-208, AC-1004.

### 3.4 `PreSavePreview`
**Responsibility:** render the selected document for inspection before commit.
**Actions:** **Cancel** · **Save Resume**.
**Dismissal outcome:** discard selection, no file stored, no parse triggered.
**Implements:** AC-206, AC-207.

### 3.5 `ProcessingIndicator`
**Responsibility:** communicate that the resume is being read.
**Constraint:** exactly one message. No stage sequence, no percentage, no step counter.
**Behaviour:** at 10 seconds, hands off to `AsyncHandoff` and releases the talent.
**Implements:** AC-401, AC-402, AC-403.

### 3.6 `AsyncHandoff`
**Responsibility:** release the talent from blocking wait and deliver an in-app notification on resolution.
**Constraint:** in-app only. No email.
**Implements:** AC-403.

### 3.7 `NameMismatchDialog`
**Responsibility:** warn when the extracted name does not match the account name.
**Rendered:** S3 only. Never on S1 *(the account has no name to match against)*.
**Actions:** **Upload a different file** · **Yes, this is mine**.
**Dismissal outcome:** identical to **Upload a different file** — nothing written, no resume stored.
**Implements:** AC-505 → AC-509.

### 3.8 `ConflictDialog` — *"Update Current Information?"*
**Responsibility:** obtain explicit consent for every overwrite.
**Rendered:** S3 only. Unreachable on S1 — an empty profile has nothing to conflict with.

**Layout constraint — applies at every viewport.** The header and **both actions are fixed and always visible**; only the row list scrolls, between them. A row count is shown before the talent scrolls.

This is not a styling preference. A twenty-year career produces thirty or more rows, and a talent who cannot reach **Keep Existing** without scrolling cannot decline safely. It is the one destructive surface in the feature, so the safe exit must never move *(EC-602, §18.3)*.
**Composition:** grouped sections → `ConflictRow` per conflicting entry.
**Actions:** **Keep Existing** (secondary) · **Yes, Update** (primary, destructive treatment).
**Dismissal outcome:** **Keep Existing**.
**Constraint:** presented **before** `SummaryDialog` whenever both apply.
**Implements:** AC-701 → AC-712.

### 3.9 `ConflictRow`
**Responsibility:** represent one conflicting entry and its independent decision.
**Control:** checkbox labelled **Apply Update**, checked by default.

**One exception to the default.** Where the talent has an unsaved edit open on the entry this row would overwrite, the row defaults **unchecked** and is visually flagged. Their in-progress work outranks the resume. This is the only documented departure from all-checked, and the flag matters — a talent who notices one unchecked row among nine will otherwise assume a bug *(EC-605)*.

**Accessible name must identify the entry** — "Apply update to VP of Engineering at Android", not "Apply update". Nine identical checkboxes make per-entry choice unusable by screen reader, which defeats the purpose of the dialog *(AC-1303, EC-1204)*.
**Constraint:** the accessible name must identify *which entry* the checkbox governs, not merely repeat "Apply Update".
**Implements:** AC-704, AC-705, AC-706, AC-1303.

### 3.10 `SummaryDialog` — *"Resume Upload Complete"*
**Responsibility:** report the complete outcome of the import.
**Rendered:** S3 only. Never shown during onboarding.
**Composition:** grouped, counted sections → `SummaryGroup` → `SummaryItem`, with overflow collapse.
**Actions:** **Undo Changes** · **Looks good!**
**Constraint:** **Looks good!** commits nothing — additions were applied on arrival.
**Dismissal outcome:** identical to **Looks good!**
**Implements:** AC-601 → AC-609, AC-801, AC-802.

### 3.11 `SummaryGroup` / `SummaryItem`
**Responsibility:** render one entity type with its count, and one entry with its identifying detail.
**Constraints:** groups with zero items are omitted, not rendered empty. Counts must equal rendered items. Singular/plural correct at N = 1. Missing sub-fields degrade gracefully — never "undefined" or "Invalid Date".
**Implements:** AC-601, AC-602, AC-603, AC-604, AC-1408.

### 3.12 `ResumeCard`
**Responsibility:** the permanent home of the resume on the profile.
**States:** `empty` · `stored` · `pending-review` · `processing`.
**Actions when `stored`:** View · Download · Replace · Delete, each with default and hover treatment and a meaningful accessible name.
**Constraint:** absent entirely from View-as-Client.
**Implements:** AC-106, AC-108, AC-901, AC-909, AC-910, AC-1002.

### 3.13 `DeleteConfirmation`
**Responsibility:** guard resume deletion.
**Actions:** **Cancel** · **Yes, Delete**.
**Dismissal outcome:** abort.
**Implements:** AC-906, AC-907.

### 3.14 `ProfilePromptModal`
**Responsibility:** invite upload from an incomplete profile.
**Actions:** **Not Now** · **✕**.
**Constraint:** not re-presented in the same session once dismissed.
**Implements:** AC-104, AC-105.

### 3.15 `CompletionChecklistItem`
**Responsibility:** represent *Upload Resume* in the completion checklist and reflect its state.
**Constraint:** completes on success **including `nothing_found`**; does not complete on any rejection or failure.
**Implements:** AC-107, AC-1201, AC-1202, AC-1203.

### 3.16 `OnboardingStepNav`
**Responsibility:** **Back** · **Skip** · **Continue** on S1.
**Constraint:** **Skip** and **Continue** remain enabled in **every** state, including all failure states.
**Implements:** AC-102, AC-103, AC-310.

---

## 4. Status model

The canonical state machine for one upload attempt. The frontend must be able to represent every status distinctly; collapsing any two is a defect *(P3)*.

### 4.1 Statuses

| Status | Terminal? | Talent-visible outcome |
|---|---|---|
| `idle` | — | Dropzone ready |
| `uploading` | — | Progress display |
| `upload_failed` | ✅ recoverable | "Upload failed, please try again." |
| `invalid_type` | ✅ recoverable | Unsupported file type message |
| `too_large` | ✅ recoverable | Size limit message |
| `rate_limited` | ✅ recoverable | Limit message with retry timing |
| `scanning` | — | Presents as continued `uploading` |
| `scan_failed` | ✅ recoverable | Presents as `upload_failed` |
| `parsing` | — | Processing indicator |
| `parse_timeout` | ✅ recoverable | Recoverable error + retry |
| `parse_failed` | ✅ recoverable | Recoverable error + retry |
| `password_protected` | ✅ recoverable | Password-specific message |
| `not_a_resume` | ✅ recoverable | "This doesn't look like a resume…" |
| `nothing_found` | ✅ **success-ish** | "We couldn't pull any details out…" — **file is stored** |
| `name_mismatch` | — | Warning dialog, awaiting decision |
| `ready_for_review` | — | Conflict and/or summary flow |
| `applied` | ✅ | Profile updated |
| `undone` | ✅ | Profile restored |

### 4.2 Transition rules

```
idle
 └─▶ (client validation) ──▶ invalid_type | too_large | rate_limited
 └─▶ uploading ──▶ upload_failed
                └─▶ scanning ──▶ scan_failed
                             └─▶ parsing ──▶ parse_timeout | parse_failed
                                          └─▶ password_protected
                                          └─▶ not_a_resume
                                          └─▶ nothing_found        [file stored]
                                          └─▶ name_mismatch ──▶ (decline) idle
                                                            └─▶ (accept) ready_for_review
                                          └─▶ ready_for_review
                                                └─▶ [conflicts?] ConflictDialog
                                                       └─▶ SummaryDialog ──▶ applied
                                                                          └─▶ undone
```

### 4.3 Hard rules

1. **Client-side validation runs before transfer.** `invalid_type` and `too_large` must be reached without uploading bytes *(AC-301, AC-302)*.
2. **`nothing_found` stores the file.** It completes the checklist step and populates `ResumeCard` in `stored`. It is the only rejection-shaped status that is a success for storage purposes *(AC-307, AC-308, AC-1201)*.
3. **`not_a_resume` stores nothing.** No file, no profile data *(AC-305)*.
4. **One automatic retry precedes any parse error surfacing.** The retry is invisible to the talent *(AC-404)*.
5. **`ready_for_review` survives session loss.** Reachable afterwards via `ResumeCard` in `pending-review` *(AC-108, AC-803, AC-1404)*.
6. **One upload in flight per talent.** A concurrent attempt is rejected with a clear message; the in-flight upload is unaffected *(AC-1407)*.
7. **`name_mismatch` is unreachable on S1** *(AC-501)*.

---

## 5. Flows

### 5.1 Onboarding upload — S1
1. Step renders with `Uploader` in `idle`, `FileConstraintsHint`, `PrivacyDisclosure`, `OnboardingStepNav`.
2. File selected → client validation → `PreSavePreview` → **Save Resume**.
3. `uploading` → `scanning` → `parsing`. Under 10s inline; beyond 10s `AsyncHandoff`.
4. **Name matching is skipped.** The extracted name seeds the profile *(AC-501)*.
5. **No review flow.** No name-mismatch dialog, no conflict dialog, no summary. On a successful parse the talent simply advances.
6. **Continue** moves to step 2 with the name pre-filled and editable *(AC-502)*. Every other extracted field lands on the onboarding step that owns it — job title, skills, work history, education, certifications — each with a short line noting the values came from the resume so they do not read as the talent's own entries.

**Any existing onboarding field a resume can supply is pre-filled** *(RU-305)*. Known ones are name, job title, skills, work history, education and certifications — but that list is illustrative, not a whitelist. Onboarding contains fields not enumerated in these docs; if a field exists and the resume supplies it, it is filled. Fields the resume did not supply arrive empty, as they would without an upload. What extraction never does is **originate** a field.

**Failure at any point:** the corresponding status renders inline, **Try again** is offered, and **Skip** / **Continue** remain enabled *(AC-310)*.

**Editing is the review.** The onboarding steps themselves are where extracted data is checked — each value sits next to its own label, in the step that owns it, and can be corrected before the talent moves on. That is a better review surface than a dialog listing sixty items for a profile that does not yet exist.

### 5.2 Profile upload — S3
Same intake and processing as 5.1, then diverges completely at the parse result:
- No `OnboardingStepNav`.
- Name matching runs. Match or absent name → silent pass. Mismatch → `NameMismatchDialog` *(AC-503 → AC-509)*.
- The account name is never written.
- **The review flow runs** — conflict dialog where applicable, then the summary. This is the surface those dialogs exist for.

### 5.3 Review flow — S5
1. **If conflicts exist:** `ConflictDialog` opens with all rows checked. Talent adjusts, then **Yes, Update** applies checked rows only, or **Keep Existing** applies none. Dismissal = **Keep Existing**.
2. **Then:** `SummaryDialog` reports the complete outcome, including updates applied in step 1 *(AC-711)*.
3. **Undo Changes** reverses everything from this parse — additions and updates — and restores the pre-import profile. The file remains stored *(AC-801)*.
4. **Looks good!** or any dismissal closes the flow *(AC-605)*.

**Ordering is mandatory.** A summary must never be followed by a further question.

### 5.4 Replace — S3
1. **Replace** opens `Uploader`.
2. The existing resume stays current and unchanged until the new file completes upload **and** parsing *(AC-904)*.
3. On success: full re-run of extraction, name matching, conflict resolution and summary. *Added on* updates *(AC-905)*.
4. On failure at any stage: the original resume remains intact and current.

### 5.5 Delete — S3
1. **Delete** → `DeleteConfirmation`.
2. **Yes, Delete** removes file and metadata. `ResumeCard` returns to `empty`.
3. Profile data previously imported **remains**. The checklist step returns to incomplete and the completion count adjusts *(AC-908)*.
4. Cancel / escape / click-outside / ✕ abort.

### 5.6 Pending-review re-entry — S3
1. `ResumeCard` renders `pending-review` with "We found details in your resume. Review them."
2. The action reopens the review flow at `ready_for_review`.
3. The prompt persists across sessions until resolved by **any** exit path — including **Keep Existing** — or until the resume is deleted *(AC-108)*.

---

## 6. Validations

### 6.1 Client-side — before any bytes leave the device

| Check | Rule | Failure status |
|---|---|---|
| Extension | PDF, DOC, DOCX only | `invalid_type` |
| Size | ≤ 5MB | `too_large` |
| Selection count | Exactly one file; extras ignored with a message | — |
| Empty selection | Picker cancelled → return to prior state, no change | — |

### 6.2 Server-side — frontend must render the outcome

| Check | Failure status |
|---|---|
| File signature matches extension | `invalid_type` |
| Virus scan | `scan_failed` → presented as `upload_failed` |
| Upload rate limit | `rate_limited` |
| Document readable / not encrypted | `password_protected` |
| Classification gate: `is_resume` true **and** `confidence` ≥ 0.7 | `not_a_resume` |
| At least one extractable entity | `nothing_found` |
| Name comparison (S3 only) | `name_mismatch` |

### 6.3 Rendering-time validation

| Concern | Rule | Reference |
|---|---|---|
| Extracted content escaping | All extracted values escaped on render; never interpreted as markup | AC-1410 |
| Long values | Truncate for display, retain full value; no unbroken string may break layout | AC-1411 |
| Malformed / absent dates | Render what exists; never "undefined", "null" or "Invalid Date" | AC-1408 |
| Count integrity | Displayed group counts must equal rendered items | AC-602 |

---

## 7. Permissions and visibility

**This is a talent feature.** Clients do not upload resumes. An account may hold both modes, but every surface here belongs to the talent profile and appears nowhere in client mode.

| Rule | Requirement | Reference |
|---|---|---|
| Owner | Full access to upload, view, download, replace, delete | §5 |
| **Client** | **No access of any kind.** No file, filename, upload date, or derived preview on any client-facing surface — public profile, search results, proposals, applications | AC-1001 |
| **View-as-Client** | `ResumeCard` **absent from the layout entirely** — not disabled, greyed, or empty. No residual spacing or heading | AC-1002 |
| Team lead | No access to team members' resumes under any role | AC-1305 |
| Support agent, without restricted role | No access from any support surface | AC-1305 |
| Support agent, with restricted role | Access permitted; every view logged with agent, talent and timestamp | AC-1305 |
| File transport | Short-expiry signed URLs only; non-sequential, non-guessable; expired URL fails closed | AC-1003 |

**Test assertion for S6:** the absence of `ResumeCard` in View-as-Client is a required test, not an implied one.

---

## 8. Copy register

Every talent-facing string in the epic. Implement verbatim *(AC-007)*. Design owns revisions; engineering does not paraphrase.

### 8.1 Entry points

| Context | String |
|---|---|
| Onboarding step heading | `STEP 1 / 6` — Upload your resume |
| Onboarding supporting line | Add your resume to complete your profile faster! |
| Profile prompt title | Complete Profile with Resume |
| Profile prompt body | Upload your resume to quickly complete your profile. It stays private and is only used to autofill your information. |
| Resume card, empty | Add your resume to complete your profile faster. |
| Resume card, pending review | We found details in your resume. Review them. |
| Checklist step | Upload Resume · **Finish This Step** |
| Checklist header | N steps left / All Complete! |

### 8.2 Uploader

| Context | String |
|---|---|
| Dropzone | Drag & drop or **Choose File** to upload. |
| Progress | `200 KB – 70% uploaded` |
| File chip | \<filename\> · Added on \<date\> · **Replace** |
| Privacy | Your resume is private and is only used to fill in your profile. It is never shown to clients or shared for marketing. |

### 8.3 Errors and empty states

| Status | String |
|---|---|
| `upload_failed` | Upload failed, please try again. |
| `too_large` | Uploaded file exceeds the size limit of 5MB. Please select a different file. |
| `invalid_type` | Unsupported file type. Only PDF, DOC, and DOCX files are accepted. |
| `not_a_resume` | This doesn't look like a resume. Please upload your resume — we couldn't find work history or education in this file. |
| `nothing_found` | We couldn't pull any details out of this file. You can still fill in your profile yourself. |
| `password_protected` | *Design pending* — must specifically identify password protection and instruct removal and re-upload |
| `rate_limited` | *Design pending* — must explain the cap and indicate when retry is possible |
| Retry action | **Try again** |

### 8.4 Review flow

| Context | String |
|---|---|
| Name mismatch title | Is this your resume? |
| Name mismatch body | The name on this file — [Extracted Name] — doesn't match the name on your account, [Account Name]. You can only use your own resume to fill in your profile. If you've changed your name or go by something different, you can continue. |
| Name mismatch actions | **Upload a different file** · **Yes, this is mine** |
| Conflict title | Update Current Information? |
| Conflict body | We found work history and education entries that already exist in your profile. You can keep your current information or replace it with information from your resume. |
| Conflict row control | **Apply Update** |
| Conflict actions | **Keep Existing** · **Yes, Update** |
| Summary title | Resume Upload Complete |
| Summary body | We updated your profile with your information from your resume. |
| Summary group labels | Added N skills · Added N educations · Added N work experiences · Added N certifications |
| Summary overflow | + N more… |
| Summary actions | **Undo Changes** · **Looks good!** |

### 8.5 Lifecycle

| Context | String |
|---|---|
| Delete confirmation | Delete Resume? Your resume will be removed. This cannot be undone. |
| Delete actions | **Cancel** · **Yes, Delete** |

### 8.6 Prohibited strings

These must not appear anywhere in the product. Add a lint or test assertion.

| String | Reason |
|---|---|
| "Updating your Bio…" | Bio is never written by this feature — AC-402, AC-1101 |
| "will not be shared with any third parties" | Inaccurate — a third-party model processes the file. **Wording correction only; the design's existing privacy notice stays and nothing is added to it.** Pending PM sign-off on the replacement clause — AC-208 |
| "Replace Current Information?" | Superseded by "Update Current Information?" |
| "Yes, Replace" | Superseded by "Yes, Update" |

---

## 9. State coverage matrix

Every cell must be implemented and independently reachable for design QA. A component is not done until all its states are demonstrable in isolation.

| Component | Empty | Loading | Success | Error | Disabled | Dismissal defined |
|---|---|---|---|---|---|---|
| `Uploader` | ✅ `idle` | ✅ `uploading` | ✅ `uploaded` | ✅ 8 statuses | ✅ | n/a |
| `PreSavePreview` | n/a | ✅ render | ✅ | ✅ render failure | n/a | ✅ discard |
| `ProcessingIndicator` | n/a | ✅ | n/a | ✅ handoff at 10s | n/a | n/a |
| `NameMismatchDialog` | n/a | n/a | n/a | ✅ | n/a | ✅ = decline |
| `ConflictDialog` | n/a | n/a | ✅ | n/a | n/a | ✅ = Keep Existing |
| `SummaryDialog` | ✅ nothing changed | n/a | ✅ | n/a | n/a | ✅ = Looks good! |
| `ResumeCard` | ✅ | ✅ processing | ✅ stored | ✅ | n/a | n/a |
| `DeleteConfirmation` | n/a | n/a | n/a | n/a | n/a | ✅ = abort |
| `ProfilePromptModal` | n/a | n/a | n/a | n/a | n/a | ✅ = Not Now |

**Empty-state definitions:**
- `Uploader.idle` — dropzone, constraints hint, privacy disclosure.
- `ResumeCard.empty` — prompt copy and upload affordance; no lifecycle actions rendered.
- `SummaryDialog` "nothing changed" — reached when conflicts existed, all were declined, and there were no additions. Reports that nothing changed rather than rendering empty groups *(AC-712, AC-1413)*.

---

## 10. Interaction rules

### 10.1 Dismissal semantics
Every dialog needs a defined outcome for escape, click-outside, ✕, browser back and tab close *(P2)*.

| Dialog | Dismissal resolves to |
|---|---|
| `PreSavePreview` | Discard selection. Nothing stored, no parse. |
| `NameMismatchDialog` | **Upload a different file** — nothing written, no resume stored. |
| `ConflictDialog` | **Keep Existing** — nothing overwritten. Abandonment additionally sets `pending-review`. |
| `SummaryDialog` | **Looks good!** — additions already applied, nothing further committed. |
| `DeleteConfirmation` | Abort. |
| `ProfilePromptModal` | **Not Now** — no re-present this session. |

### 10.2 Defaults
- `ConflictDialog` opens with **every row checked** *(AC-705)*.
- Unchecking every row is permitted; **Yes, Update** stays enabled and applies nothing *(AC-706, AC-707)*.
- A newly filled job title slot has **no rate** — the talent sets it *(AC-1104)*.

### 10.3 Focus and keyboard
- Both review dialogs trap focus while open and return focus to the invoking control on close *(AC-1302)*.
- Every `ConflictRow` checkbox is keyboard-reachable and toggles via Space *(AC-1303)*.
- Escape on `ConflictDialog` resolves to **Keep Existing** *(AC-709, AC-1303)*.
- The uploader is reachable in the natural tab order and activates via Enter or Space *(AC-1301)*.
- Focus is visible on every interactive element at all times.

### 10.4 Announcements
- Upload progress is announced without flooding the announcement queue *(AC-1302)*.
- Every error, empty and success state is announced on appearance.
- Each `ConflictRow` checkbox's accessible name identifies the entry it governs — not merely "Apply Update" *(AC-1303)*.

---

## 11. Field scope — what the frontend may and may not write

| Field | Rule | Reference |
|---|---|---|
| Skills | Written. Deduplicated case-insensitively against incoming list, existing profile skills, and `portfolio-service` case-study skills. **No import-specific cap** — fills up to the profile's own limit of **100** | AC-606, AC-607 |
| Work experience | Written, uncapped | AC-609 |
| Education | Written, uncapped | AC-609 |
| Certifications | Written, uncapped | AC-609 |
| Job title | **Most recent title only, into one empty slot.** Max three title/rate pairs on the profile. Never overwrites an existing title or its rate. Never appears as a conflict. Older titles from the resume are never used — they belong to work history. All slots full → nothing written | AC-1104, AC-1105 |
| Name | **S1 only** — seeds the profile. Never written on S3 | AC-501, AC-506 |

| **Bio** | **Never written.** Not extracted, not displayed in any dialog, not referenced in loading copy | AC-1101, AC-1102 |
| **Location** | **Never written.** Drives timezone and rates | AC-1103 |
| **Contact details** | **Never extracted.** No phone, email or postal address | AC-1106 |

**Extracted entries are always saved, then validated.** Each is checked against the same field rules the manual entry form applies. A **required** field missing or invalid sets a validation flag on the entry; empty **optional** fields set nothing. Validation never removes an entry *(AC-1106a)*.

**The flag is an edit-mode affordance only.** A small error state on the affected entry, shown when the talent is editing that section. It appears nowhere else — not on their own profile view, not in marketplace or search, not on any client-facing surface, not in *View as Client*, and not in the summary or conflict dialogs *(AC-1106b)*.

**The table above is illustrative, not a whitelist.** Any existing `user-service` field a resume can supply is filled, including fields not enumerated in these docs. What this feature never does is **define** profile data — it fills fields the data model already has, and never originates one *(RU-305)*. The exclusions below are absolute and apply regardless.

**Entity typing is strict.** Work → work history, education → education, certification → certifications. No entity is written to more than one section, and dialog section headings must correspond to the entries beneath them *(AC-1107)*.

---

## 12. Edge cases the frontend must handle

| ID | Scenario | Required frontend behaviour |
|---|---|---|
| **E1** | Multiple files dropped at once | Accept the first, inform the talent that one resume is uploaded at a time — AC-201 |
| **E2** | Identical file uploaded twice | Full re-run. No caching. Conflicts expected and handled normally — AC-1401 |
| **E3** | New graduate, education only | Normal flow. Only populated groups render. `nothing_found` applies only when **all** groups are empty — AC-1402 |
| **E4** | Scanned / image-only resume | Fallback path is transparent to the frontend. Outcome is a normal parse result, `nothing_found`, or `not_a_resume` — AC-1403 |
| **E5** | Session expires mid-parse | On return, authenticate and present `pending-review`. No data loss, no partial write — AC-1404 |
| **E6** | Resume deleted while a parse is in flight | Discard the parse result. Write nothing. `ResumeCard` returns to `empty` — AC-1405 |
| **E7** | Navigation away during upload | Abandon the upload. No partial file, no lingering `uploading` state on return — AC-1406 |
| **E8** | Concurrent uploads in two tabs | One in flight per talent. Reject the second with a clear message; the first is unaffected — AC-1407 |
| **E9** | Malformed or missing dates | Import with the dates present. Never block. Never render "undefined" or "Invalid Date" — AC-1408 |
| **E10** | Markup or script in extracted content | Escape on render, always — AC-1410 |
| **E11** | Very long extracted values | Truncate for display, retain in data, never break layout — AC-1411 |
| **E12** | All extracted entities duplicate existing data | No additions. `ConflictDialog` handles overlaps. If all declined, summary reports nothing changed — AC-1413 |
| **E13** | Onboarding abandoned after upload | Stored resume and seeded data persist and are available on return — AC-1414 |
| **E14** | Same role, same start date, later end date | One row representing an end-date update. Never two competing entries — AC-710 |
| **E15** | Expired signed URL on view or download | Recoverable error. Never expose the file, never render a blank frame — AC-902, AC-1003 |

---

## 13. Cross-service touchpoints

Listed only where another service creates a **direct frontend requirement**.

| Service | Frontend requirement |
|---|---|
| `resume-parsing-service` | The frontend never calls it directly. It must render every outcome the gate can produce: `not_a_resume` (including confidence below **0.7**), `nothing_found`, `password_protected`, timeout and vendor failure |
| `user-service` | Owns file, metadata, autofill, conflict orchestration, undo and lifecycle. All frontend calls terminate here |
| `portfolio-service` | Case-study skills are associations to the canonical skill list. The frontend must not surface a skill already present through that association — it counts as existing for de-duplication — AC-606 |
| `auth-service` | S1 uploads occur before the profile fully exists. A pre-profile token model is required; the frontend must handle it without exposing an auth error to the talent |
| Identity verification | Supplies the legal name of record. The frontend must never allow a resume to modify a verified name — AC-510 |
| Notifications | In-app delivery for asynchronous parse completion. No email path in v1 — AC-403 |

---

## 14. Telemetry

Events required to operate and tune the feature. Names are indicative; the set is not.

| Event | Purpose |
|---|---|
| Upload started / succeeded / failed, with status | Funnel and failure-rate monitoring |
| Rejection by status (`not_a_resume`, `nothing_found`, `password_protected`) | Tuning the **0.7** confidence threshold after the first 100 production uploads |
| Parse duration | Validating the 10s handoff and the 30s timeout |
| Conflict dialog shown, rows presented, rows unchecked | Measuring whether per-entry control is actually used — informs any future revisit of all-or-nothing |
| **Yes, Update** vs **Keep Existing** vs dismissal | Consent-path distribution |
| Undo used | Extraction-quality proxy |
| Name mismatch shown, and the action taken | False-positive rate on the fuzzy match |
| Skip on the onboarding resume step | Onboarding funnel impact |
| Pending-review prompt shown and resolved | Abandonment rate |

---

## 15. Build sequencing

Each phase is independently demonstrable. No phase depends on a later one.

| Phase | Contents | Done when |
|---|---|---|
| **1 — Intake** | `Uploader`, `FileConstraintsHint`, `PrivacyDisclosure`, `PreSavePreview`, client validation, `ResumeCard` empty and stored states | Every intake status renders distinctly; a file can be uploaded, viewed, downloaded and deleted |
| **2 — Processing** | `ProcessingIndicator`, `AsyncHandoff`, all parse-outcome statuses including `not_a_resume`, `nothing_found`, `password_protected` | Every parse outcome renders distinctly; the 10s handoff and 30s timeout behave correctly |
| **3 — Review** | `ConflictDialog`, `ConflictRow`, `SummaryDialog`, ordering, undo, all dismissal semantics | Conflicts and additions both resolve correctly; every dismissal path is safe |
| **4 — Identity** | `NameMismatchDialog`, fuzzy matching, S1 suppression | AC-504 truth table passes in full |
| **5 — Integration** | Checklist, completion progress, View-as-Client suppression, `pending-review` re-entry | S6 absence assertion passes; abandonment and re-entry work across sessions |
| **6 — Hardening** | Accessibility, edge cases E1–E15, telemetry, prohibited-string assertions | §9 matrix fully demonstrable; §12 covered by tests |

---

## 16. Definition of done

The epic is complete when all of the following hold.

1. Every status in §4 is reachable, distinct in copy and treatment, and covered by a test.
2. Every dismissal path in §10.1 is implemented and tested, and none causes a write or a delete.
3. Every cell in the §9 state matrix is demonstrable in isolation for design QA.
4. The AC-504 name-matching truth table passes in full.
5. All twenty fixtures in Doc 03 §15 are present and produce their expected outcomes — including the **contract PDF**, which is the regression fixture for the defect that originated this feature.
6. No prohibited string from §8.6 appears anywhere in the product.
7. `ResumeCard` is provably absent from View-as-Client and from every client-facing surface.
8. Bio, location and contact details are provably never written by any path.
9. `ConflictDialog` opens with every row checked, and dismissal provably resolves to **Keep Existing**.
10. The full keyboard-only path — upload through conflict resolution to summary — is completable without a mouse.

---

## 17. Out of scope

| Item | Status |
|---|---|
| Re-import from an already-stored file | Fast-follow — RU-513 |
| Multiple stored resumes with a current-version selector | Future — RU-512 |
| Visible provenance for imported skills | Deliberately excluded in v1 — RU-409 |
| Email notification on asynchronous parse completion | Future — RU-403 |
| Platform account-deletion retention policy | Platform-level, not this epic — RU-510 |
| DPA and compliance posture for third-party extraction | Compliance documentation |
| Lower-cost extraction model evaluation | Post-launch — RU-807 |

---

## 18. Open items for design

Behaviour is settled for every item here; each needs comps before its phase ships. Full briefs are in **`resume-upload-UX-DESIGN-UPDATES.md`**.

**Effort:** *Trivial* = existing component, different copy · *Small* = existing component, small structural change · **Real** = new layout.

### 18.1 Bugs in the shared comps — fix first

| # | Item | Blocks |
|---|---|---|
| B-1 | Section labels swapped in the conflict dialog — work entries under the education heading and vice versa | 3 |
| B-2 | "Updating your Bio…" in the onboarding loading copy. **Bio is never extracted** — the line must be removed, not reworded | **2** |
| B-3 | Duplicate skills shown in the summary comp. De-duplication now runs before render, so this cannot occur in the build; the comp should not imply it is intended | 3 |

### 18.2 New comps required

| # | Item | Effort | Blocks |
|---|---|---|---|
| 1 | `rate_limited` state | Trivial | **1** |
| 2 | Privacy copy correction — wording only, §8.6. Placement unchanged | Trivial | **1** |
| 3 | `not_a_resume` state — **must be visibly distinct from `invalid_type`** | Trivial | **2** |
| 4 | `nothing_found` state — **informational treatment, never error styling** | Small | **2** |
| 5 | `password_protected` state | Trivial | **2** |
| 6 | **Onboarding pre-filled step treatment** — every step receiving resume data, with a short note that the values came from the resume | **Real** | **2** |
| 7 | **Conflict dialog, mobile layout** — see §18.3 | **Real** | **3** |
| 8 | Conflict dialog, long lists — scrolling body, fixed actions, visible row count | Small | **3** |
| 9 | Conflict row flagged as locally edited — the one row that defaults **unchecked** | Small | **3** |
| 10 | Summary, nothing-changed variant | Trivial | **3** |
| 11 | `NameMismatchDialog` | **Real** | **4** |
| 12 | `ResumeCard` `pending-review` state | Small | **5** |
| 13 | `ResumeCard` file-unavailable state — **card keeps showing the file record** | Trivial | **5** |
| 14 | **Validation flag in edit mode** — edit mode only, never on any client-visible surface | **Real** | **5** |
| 15 | Truncated-resume notice in the summary | Trivial | — |
| 16 | Upload-already-in-progress message | Trivial | — |
| 17 | Pending-review discard warning | Small | — |
| 18 | Session-expired re-authentication path | Trivial | — |
| 19 | Multiple-files-selected note — non-blocking, first file proceeds | Trivial | — |
| 20 | Empty-file state | Trivial | — |
| 21 | Preview-expired state | Trivial | — |

**Four items are Real design work: 6, 7, 11 and 14.** Everything else is copy or a small structural change.

### 18.3 The conflict dialog on mobile — a hard requirement

The only destructive surface in this feature, and the only place a layout failure causes real harm.

On a phone with a long work history, a scrolling list pushes the actions below the fold. **A talent who cannot see *Keep Existing* cannot decline safely.**

| Requirement | Non-negotiable? |
|---|---|
| Both actions pinned and visible without scrolling | **Yes** |
| Header fixed | Yes |
| Row list scrolls independently between header and actions | Yes |
| Row count visible before scrolling | Yes |
| Company, title and dates readable at narrow width without truncating into meaninglessness | Yes |

Applies at any viewport, not only on mobile — a long list on a laptop produces the same failure. *(EC-602)*
