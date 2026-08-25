# 08 — Resume Upload & Profile Autofill · Error States & Error Messages

> **Updated 22 July 2026.** Confirmed decisions cascaded from the Overview Docs.
>
> - **§8** scoped to the profile path — submission errors are unreachable during onboarding, since the review flow is never entered there.


**Parent epic:** Talent Profile
**Epic (this doc):** Resume Upload & Profile Autofill
**Audience:** Frontend engineering, UX writing, QA, production readiness.
**Sources of truth:** 01 — Feature List · 01a — Product Questions Register · 01b — CTO Answers & Decisions · 02 — User Stories · 03 — Acceptance Criteria · 04 — Frontend Specs · 05 — Edge Cases & Solutions · 06 — Frontend State Management · 07 — Data Limitations.

**Purpose.** Every error condition in this epic, what causes it, what the talent sees, the exact words, and how they get out of it. This is the implementation reference for engineering, the copy source for UX writing, and the assertion list for QA.

**Framework-agnostic.** No markup, styling, or framework specifics.

---

## 1. Principles

| # | Principle | Consequence |
|---|---|---|
| **EP1** | **No generic error.** Eleven distinct failure conditions exist. A shared "something went wrong" fails acceptance *(SP3, AC-301 → AC-310)*. |
| **EP2** | **Every error has an exit.** No error state is terminal. Each defines a recovery path the talent can act on *(SP2)*. |
| **EP3** | **Never blame the talent.** State the condition and the fix. Not "you uploaded an invalid file" — "only PDF, DOC, and DOCX files are accepted". |
| **EP4** | **Never expose internals.** No vendor names, service names, status codes, stack traces, object keys or model output in talent-facing copy. |
| **EP5** | **Distinguish "your file is wrong" from "we had a problem."** These require different actions from the talent. Conflating them wastes their time. |
| **EP6** | **An empty result is not an error.** `nothing_found` succeeded — the file is stored. It gets informational treatment, never error treatment *(EC-909)*. |
| **EP7** | **Errors never block onboarding.** Skip and Continue stay enabled in every error state on S1 *(AC-310)*. |
| **EP8** | **Silent recovery beats a visible error.** Where the system can retry or degrade safely, it does so without telling the talent *(§7)*. |

---

## 2. Error taxonomy

Nine classes, distinguished by cause and by what the talent must do differently.

| Class | Meaning | Talent's action | Section |
|---|---|---|---|
| **Validation** | The file does not meet a stated rule | Choose a different file | §4 |
| **Transfer** | The file did not arrive | Retry | §5 |
| **Content rejection** | The file arrived but is not a usable resume | Upload a different document | §6 |
| **Processing** | Extraction did not complete | Retry, or continue manually | §7 |
| **Submission** | A decision could not be recorded | Retry the decision | §8 |
| **Retrieval** | A stored file could not be served | Retry, or use an alternative action | §9 |
| **Blocked action** | The action is refused by a rule, not a failure | Wait, or resolve the conflict | §10 |
| **Session and permission** | Authorisation failed or lapsed | Re-authenticate, or nothing — absence | §11 |
| **Dependency** | A service this epic relies on is unavailable | Varies — some are invisible | §12 |

### 2.1 The three-way distinction talent care about

Every error in this document answers one of three questions, and the copy must make clear which:

1. **"Is my file wrong?"** — validation and content rejection.
2. **"Did something break?"** — transfer, processing, retrieval, dependency.
3. **"Am I not allowed?"** — blocked action, permission.

Copy that leaves this ambiguous causes the talent to try the wrong remedy — re-exporting a perfectly good resume because the message implied their file was at fault.

---

## 3. Copy rules

Applies to every string in this document.

| # | Rule | Example |
|---|---|---|
| **C1** | Lead with the condition, then the fix | "Uploaded file exceeds the size limit of 5MB. Please select a different file." |
| **C2** | Sentence case, full sentences, terminal punctuation | Not "UPLOAD FAILED" |
| **C3** | Plain words, no jargon | "We couldn't read this file" — not "parse exception" |
| **C4** | No blame, no second-person fault | "Only PDF, DOC, and DOCX files are accepted" — not "you chose the wrong format" |
| **C5** | No internals | Never a service name, vendor name, error code or identifier |
| **C6** | State what happened to their data when it matters | "Your profile hasn't been changed." |
| **C7** | One action verb per recovery control | **Try again** · **Choose a different file** · **Contact support** |
| **C8** | Never apologise repeatedly | One "sorry" per experience at most. Prefer none |
| **C9** | Never promise a timeline the system cannot keep | Not "this will only take a moment" |
| **C10** | Match the destructive treatment to the actual stakes | Errors are informational. Only overwriting is destructive-red |

### 3.1 Approval status legend

| Marker | Meaning |
|---|---|
| **✅ Approved** | Locked in Doc 04 §8. Implement verbatim |
| **📝 Draft** | Written here, awaiting design and UX writing approval |
| **🔒 Blocking** | No approved copy exists; blocks the phase noted |

---

## 4. Validation errors

Resolved client-side before any bytes are transferred *(AC-301, AC-302)*.

### ER-401 · File too large — *state `A-10`*
**Cause.** Selected file exceeds 5MB.
**Trigger.** Client-side size check on selection.
**Display.** Inline on the file item. Informational treatment.
**Message.** ✅ Approved
> Uploaded file exceeds the size limit of 5MB. Please select a different file.

**Actions.** **Try again**.
**Recovery.** Returns to `A-01`. No bytes transferred, nothing stored.
**Ref.** AC-301.

### ER-402 · Unsupported file type — *state `A-11`*
**Cause.** Extension is not PDF, DOC or DOCX.
**Trigger.** Client-side extension check.
**Display.** Inline on the file item. Informational treatment.
**Message.** ✅ Approved
> Unsupported file type. Only PDF, DOC, and DOCX files are accepted.

**Actions.** **Try again**.
**Recovery.** Returns to `A-01`.
**Ref.** AC-302.

### ER-403 · File type mismatch, detected after upload — *state `A-11`*
**Cause.** Extension says PDF but the file signature disagrees — typically a renamed image.
**Trigger.** Server-side signature validation after a successful transfer.
**Display.** Same as ER-402. The talent does not need to know the check ran late.
**Message.** ✅ Approved — identical to ER-402.
**Actions.** **Try again**.
**Recovery.** Returns to `A-01`. Nothing stored.
**Ref.** EC-103.

> **Note.** `A-11` is reachable both before and after transfer. The component must support both entry points with identical copy.

### ER-404 · Empty file — *state `A-11`*
**Cause.** Zero-byte file with a valid extension.
**Trigger.** Client-side minimum-size check.
**Display.** Inline. Informational.
**Message.** 📝 Draft
> This file appears to be empty. Please select a different file.

**Actions.** **Try again**.
**Recovery.** Returns to `A-01`.
**Ref.** EC-102.

### ER-405 · Multiple files selected — *state `A-12`*
**Cause.** More than one file dropped or selected.
**Trigger.** Selection count check.
**Display.** Non-blocking inline note. **Not an error state** — the first file proceeds normally.
**Message.** 📝 Draft
> We'll use the first file. You can upload one resume at a time.

**Actions.** None. Informational only.
**Recovery.** Flow continues with the first file.
**Ref.** AC-201, EC-101.

---

## 5. Transfer errors

### ER-501 · Upload failed — *state `A-09`*
**Cause.** Network interruption, server error, or a failed virus scan.
**Trigger.** Transfer or scan failure.
**Display.** Inline on the file item.
**Message.** ✅ Approved
> Upload failed, please try again.

**Actions.** **Try again**.
**Recovery.** Retries with the same file. Where the source reference is stale, reopens file selection instead *(EC-105)*.
**Constraint.** Must not imply the talent's file is invalid — this is a "did something break" error, not a "is my file wrong" error *(EP5)*.
**Ref.** AC-303.

### ER-502 · Upload stalled — *state `A-09`*
**Cause.** Transfer completed but no response was received within the upload timeout.
**Trigger.** Upload-level timeout.
**Display.** Replaces the progress indicator.
**Message.** ✅ Approved — reuses ER-501.
**Actions.** **Try again**.
**Recovery.** The retry carries the same idempotency key, so a silently-succeeded upload cannot produce a duplicate record *(EC-108)*.
**Ref.** EC-107, EC-108.

### ER-503 · Virus scan unavailable — *state `A-09`*
**Cause.** The scanning dependency is unreachable.
**Trigger.** Scan request failure.
**Display.** Presented as ER-501. The talent is not told scanning exists.
**Message.** ✅ Approved — reuses ER-501.
**Actions.** **Try again**.
**Recovery.** Fails closed — nothing stored, nothing parsed *(EC-704)*.
**Ref.** EC-704, U-04.

---

## 6. Content rejection errors

The file arrived intact. Its contents are the problem. These are the errors most likely to be misread as system failures, so the copy must be unambiguous about where the issue lies.

### ER-601 · Not a resume — *state `A-14`*
**Cause.** The classification gate returned `is_resume: false`, or confidence below 0.7, or confidence absent.
**Trigger.** Parse result evaluated against the gate.
**Display.** Inline. Informational treatment, not destructive.
**Message.** ✅ Approved
> This doesn't look like a resume. Please upload your resume — we couldn't find work history or education in this file.

**Actions.** **Try again**.
**Recovery.** Returns to `A-01`. **Nothing stored, nothing written to the profile.**
**Constraint.** Must be visibly distinct from ER-402. The talent's file type was fine; the content was not *(AC-305)*.
**Ref.** AC-305, EC-1008.

### ER-602 · Password-protected file — *state `A-16`*
**Cause.** The document is encrypted and its text cannot be read.
**Trigger.** Extraction reports an unreadable, encrypted document.
**Display.** Inline. Informational.
**Message.** 🔒 **Blocking — phase 2.** Draft for approval:
> This file is password-protected, so we can't read it. Please remove the password and upload it again.

**Actions.** **Try again**.
**Recovery.** Returns to `A-01`.
**Constraint.** Must not present as ER-501 or ER-601 — the fix is specific and the talent can act on it immediately *(AC-306)*.
**Ref.** AC-306.

### ER-603 · Corrupted document — *state `A-14`*
**Cause.** A structurally valid file whose content stream is damaged.
**Trigger.** Extraction yields nothing usable and the gate fails.
**Display.** Presented as ER-601.
**Message.** ✅ Approved — reuses ER-601.
**Rationale.** The talent's remedy is identical to a wrong-document upload: supply a different file. Distinguishing corruption from wrong content adds no actionable information *(EC-104)*.
**Ref.** EC-104.

---

## 7. Processing errors and the empty result

### ER-701 · Extraction failed — *state `A-15`*
**Cause.** Timeout beyond 30 seconds, vendor error, or a malformed response — **after one silent automatic retry has already occurred**.
**Trigger.** Parse failure surfacing after retry.
**Display.** Inline. Informational.
**Message.** 📝 Draft
> We couldn't read your resume just now. Your profile hasn't been changed. Please try again.

**Actions.** **Try again**.
**Recovery.** Returns to `A-01`. Profile is byte-for-byte unchanged.
**Constraints.** No vendor or service names *(EP4)*. Explicitly states the profile is untouched *(C6)* — this is the reassurance the talent actually needs.
**Ref.** AC-404, EC-701.

### ER-702 · Nothing found — *state `A-17`* — **not an error**
**Cause.** A valid resume passed the gate but produced zero usable entities after discard.
**Trigger.** All entity groups empty.
**Display.** **Informational treatment, visually distinct from every error above.** The upload succeeded and the file is stored *(EP6, EC-909)*.
**Message.** ✅ Approved
> We couldn't pull any details out of this file. You can still fill in your profile yourself.

**Actions.** Acknowledge, and a path to manual profile entry.
**Recovery.** → `C-03`. **The file is stored**, the *Upload Resume* checklist step completes, and view, download, replace and delete are all available.
**Constraint.** Must never render in the error treatment. The stored file on the card is the signal that the upload worked.
**Ref.** AC-307, AC-308, EC-909.

---

## 8. Submission errors

Failures while recording a decision. **The most consequential class in the epic** — these touch the only destructive write.

> **Profile path only.** The review flow is never entered during onboarding, so none of these errors is reachable on S1.

### ER-801 · Conflict decision failed to submit — *state `B-05`*
**Cause.** Network loss or server error when confirming the conflict dialog.
**Trigger.** Submission failure.
**Display.** **Inline, inside the open dialog.** Row selections preserved.
**Message.** 📝 Draft
> We couldn't save your choices. Nothing has been changed. Please try again.

**Actions.** **Try again** · **Keep Existing**.
**Recovery.** Retry submits the same selections. **Keep Existing** exits safely.
**Constraint.** **The dialog must not close.** Closing implies a decision was recorded. This is a data-integrity requirement, not a presentation preference *(EC-308)*.
**Ref.** EC-308.

### ER-802 · Profile changed while the dialog was open — *state `B-07`*
**Cause.** One or more conflicting entries were edited or deleted elsewhere while the talent was deciding.
**Trigger.** Server reports a version mismatch on confirm.
**Display.** Dialog closes. Recoverable message on the profile.
**Message.** 📝 Draft
> Your profile changed while you were reviewing, so we didn't apply those updates. You can review them again from your Resume card.

**Actions.** Review again.
**Recovery.** → `C-04` pending review. Rows that did not change **were** applied; the message must not imply nothing happened at all.
**Constraint.** A stale row must never overwrite a newer edit *(S-01)*.
**Ref.** EC-302.

### ER-803 · Undo failed — *state `B-03`*
**Cause.** The reversal could not be completed.
**Trigger.** Undo submission failure.
**Display.** Inline in the summary dialog. Dialog stays open.
**Message.** 📝 Draft
> We couldn't undo those changes. Your profile is as it was after the import. Please try again.

**Actions.** **Try again** · **Looks good!**
**Recovery.** Retry, or accept the imported state.
**Constraint.** Must state accurately where the profile stands — the talent has just been told a reversal failed and needs to know what is currently true.
**Ref.** AC-801.

### ER-804 · Partial undo — *state `B-04`* — **not an error**
**Cause.** One or more imported entries were modified after import, so they are excluded from the reversal.
**Trigger.** Undo executed with modified entries present.
**Display.** Informational confirmation.
**Message.** 📝 Draft
> We undid the changes from your resume. Anything you edited yourself since then has been left as it is.

**Actions.** Close.
**Recovery.** → `C-03`.
**Constraint.** Never claim a complete reversal when one did not occur *(EC-606)*.
**Ref.** EC-606.

---

## 9. Retrieval errors

The record exists; the file could not be served.

### ER-901 · Resume could not be opened — *state `C-05`*
**Cause.** Storage unavailable, or a signed URL failed to generate.
**Trigger.** View action failure.
**Display.** Scoped to the action. **The file record stays rendered on the card.**
**Message.** 📝 Draft
> We couldn't open your resume right now. You can try again, or download it instead.

**Actions.** **Try again** · **Download**.
**Recovery.** → `C-03` on success. Download is the fallback when preview fails *(EC-1005)*.
**Constraint.** **The card must never degrade to `C-01`.** Presenting an empty card tells the talent their file was deleted, which is false *(EC-702)*.
**Ref.** EC-702, EC-1005.

### ER-902 · Download failed — *state `C-05`*
**Cause.** Storage unavailable, or the connection dropped mid-download.
**Trigger.** Download failure.
**Display.** Scoped to the action.
**Message.** 📝 Draft
> We couldn't download your resume right now. Please try again.

**Actions.** **Try again**.
**Recovery.** → `C-03` on success.
**Ref.** EC-702.

### ER-903 · Preview expired while open — *state `C-05`*
**Cause.** The signed URL expired while the preview remained open.
**Trigger.** Expiry during an open session.
**Display.** Replaces the preview content. **Never a blank frame or a raw storage error.**
**Message.** 📝 Draft
> This preview has expired. Refresh to view your resume again.

**Actions.** Refresh.
**Recovery.** Requests a fresh URL and re-renders.
**Ref.** EC-309, S-06.

### ER-904 · Resume no longer exists — *state `C-01`*
**Cause.** The resume was deleted elsewhere and the card was rendered from a stale read.
**Trigger.** Any lifecycle action against a missing record.
**Display.** Card resolves to the empty state.
**Message.** 📝 Draft
> This resume is no longer on your profile.

**Actions.** Upload.
**Recovery.** → `C-01`.
**Constraint.** This is the **only** case where the card legitimately resolves to empty on a retrieval failure — the record is genuinely gone, unlike ER-901 *(S-07)*.
**Ref.** S-07.

---

## 10. Blocked actions

The system is working correctly and is declining the request. These are refusals, not failures, and the copy must not sound broken.

### ER-1001 · Upload rate limit reached — *state `A-13`*
**Cause.** The hourly per-talent upload cap has been reached.
**Trigger.** Rate limit rejection.
**Display.** Inline. Informational.
**Message.** 🔒 **Blocking — phase 1.** Draft for approval:
> You've uploaded a few times in a short while. Please wait a little before trying again.

**Actions.** Acknowledge.
**Recovery.** → `A-01` once the window clears. The stored resume and all profile data are unaffected.
**Constraint.** Must not present as ER-501. Nothing broke *(AC-309)*.
**Ref.** AC-309.

### ER-1002 · Upload already in progress — *state `A-03`*
**Cause.** Another upload is in flight for this talent, typically in a second tab.
**Trigger.** In-flight check before starting.
**Display.** Specific message on the blocked surface. The in-flight upload is untouched.
**Message.** 📝 Draft
> An upload is already in progress. Please wait for it to finish.

**Actions.** Acknowledge.
**Recovery.** → `A-01` when the in-flight upload resolves.
**Ref.** EC-301.

### ER-1003 · Pending review will be discarded — *warning, not an error*
**Cause.** A new upload is started while an unresolved review exists.
**Trigger.** Upload initiated with a pending review present.
**Display.** Confirmation before the upload proceeds.
**Message.** 📝 Draft
> You have resume details waiting for review. Uploading a new file will discard them. Continue?

**Actions.** **Cancel** · **Continue**.
**Recovery.** Cancel preserves the pending review. Continue discards it and clears the card prompt. Additions already applied from the earlier parse remain.
**Ref.** EC-305.

### ER-1004 · Delete blocked by an in-flight parse — *informational*
**Cause.** The talent deletes their resume while a parse is running.
**Trigger.** Delete confirmed during `A-07` or `A-08`.
**Display.** **None.** The deletion succeeds and the parse result is discarded silently.
**Message.** None — the talent got what they asked for.
**Recovery.** → `C-01`.
**Constraint.** Do not surface an error for a successful deletion *(EP8)*.
**Ref.** EC-303.

---

## 11. Session and permission failures

### ER-1101 · Session expired during upload or parse — *state `A-09` or `A-15`*
**Cause.** Authentication lapsed mid-flow.
**Trigger.** Request rejected for authentication.
**Display.** Re-authentication path, not a generic error.
**Message.** 📝 Draft
> Your session has expired. Please sign in again to continue.

**Actions.** Sign in.
**Recovery.** On return, the pending review surfaces via `C-04` if the parse resolved. No data is lost and no partial write occurred *(EC-401)*.
**Ref.** EC-401.

### ER-1102 · Session expired with the conflict dialog open — *state `B-02`*
**Cause.** Authentication lapsed while the talent was deciding.
**Trigger.** Submission rejected for authentication.
**Display.** Re-authentication path.
**Message.** ✅ Reuses ER-1101.
**Actions.** Sign in.
**Recovery.** **No write occurred.** Selections are discarded and the talent decides again on re-entry — the safe direction *(EC-402)*.
**Ref.** EC-402.

### ER-1103 · Pre-profile token failure, onboarding — *state `A-09`*
**Cause.** The pre-profile token used at onboarding step 1 failed or lacked scope.
**Trigger.** Upload rejected for authorisation before the profile exists.
**Display.** **Recoverable upload error. Never a sign-in prompt mid-onboarding.**
**Message.** ✅ Reuses ER-501.
**Actions.** **Try again**. **Skip and Continue remain enabled.**
**Recovery.** → `A-01`, with onboarding still fully completable *(EP7)*.
**Ref.** EC-404, U-09.

### ER-1104 · Account no longer exists — *terminal*
**Cause.** The account was deleted mid-flow.
**Trigger.** Any request rejected for a non-existent account.
**Display.** Route out of the product. **No resume-specific error.**
**Message.** None from this epic. Handled by platform-level account handling.
**Ref.** EC-406.

### ER-1105 · Permission-restricted surfaces — *no error rendered*
**Cause.** The viewer is not the profile owner.
**Trigger.** Permission gate resolution.
**Display.** **Absence.** The Resume card is omitted from the layout.
**Message.** **None. There is no error message, and there must not be one.**
**Rationale.** An error, a disabled control, or an "insufficient permissions" notice each confirms that a resume exists. Absence discloses nothing *(P-04, EC-803)*.
**Applies to.** Clients, View-as-Client, team leads, and support agents without the restricted role.
**Ref.** AC-1001, AC-1002, EC-802, EC-803, EC-804.

---

## 12. Dependency errors

Failures originating in another service. Most are invisible to the talent by design.

| ID | Dependency | Talent-visible? | Message | Behaviour |
|---|---|---|---|---|
| **ER-1201** | `resume-parsing-service` unavailable | ✅ Yes | ER-701 | Recoverable. Profile unchanged. Onboarding unblocked *(EC-701)* |
| **ER-1202** | Storage unavailable | ✅ Yes | ER-901 / ER-902 | Action-scoped. Card record retained *(EC-702)* |
| **ER-1203** | `portfolio-service` unavailable | ❌ **No** | None | Degrade — deduplicate against profile skills only, import proceeds *(EC-703)* |
| **ER-1204** | Virus scanner unavailable | ✅ Yes | ER-501 | Fail closed. Nothing stored *(EC-704)* |
| **ER-1205** | Notification delivery failed | ❌ **No** | None | Card prompt is the durable path *(EC-705)* |
| **ER-1206** | Name matching unavailable | ❌ **No** | None | Treat as a pass. Never block on an unavailable check *(EC-1002)* |
| **ER-1207** | Locale or timezone unavailable | ❌ **No** | None | Documented default format *(EC-1007)* |
| **ER-1208** | `auth-service` pre-profile token | ✅ Yes | ER-501 via ER-1103 | Recoverable upload error *(EC-404)* |

### 12.1 The invisibility rule

Four dependency failures are deliberately silent — `portfolio-service`, notifications, name matching, and locale. In each case the degraded outcome is either invisible or a minor cosmetic imperfection the talent can correct. Surfacing an error would give them a problem they cannot act on *(EP8, DP6)*.

---

## 13. Missing and malformed data errors

Data-shape failures. **None of these may reach a rendered surface** *(DP2)*.

| ID | Condition | Talent-visible? | Handling |
|---|---|---|---|
| **ER-1301** | Confidence absent from the parse result | ✅ As ER-601 | Fail closed to `A-14`. Never assume a passing score *(U-06)* |
| **ER-1302** | Entity with no identifying value | ❌ No | Discarded before counting. If all groups empty → ER-702 *(§5.1)* |
| **ER-1303** | Literal `"undefined"` or `"null"` string values | ❌ No | Field discarded, treated as absent *(§14)* |
| **ER-1304** | Unparseable date | ❌ No | Date omitted. **Never "Invalid Date"** |
| **ER-1305** | Object where a string was expected | ❌ No | Field discarded. **Never "[object Object]"** |
| **ER-1306** | Missing upload timestamp | ❌ No | "Added on" line omitted entirely *(R-03)* |
| **ER-1307** | Missing filename | ❌ No | Neutral placeholder label. Never blank *(R-02)* |
| **ER-1308** | Conflict set empty after recomputation | ❌ No | Dialog does not open. Proceed to summary *(R-07)* |
| **ER-1309** | Count disagrees with rendered items | ❌ No | Recompute. A mismatch is a defect, never rendered *(V-01, C-01)* |

### 13.1 Required standing assertion

The strings `undefined`, `null`, `NaN`, `Invalid Date` and `[object Object]` must be unreachable in every rendered surface of this epic — including tooltips and accessible names. This warrants a permanent test assertion *(§14.1 of Doc 07)*.

---

## 14. Errors the talent must never see

Conditions handled silently. Surfacing any of these is a defect.

| # | Condition | Why silent |
|---|---|---|
| 1 | First parse attempt failing | One automatic retry precedes any visible error *(AC-404)* |
| 2 | Virus scan running | The talent does not need to know it exists. Renders as continued upload |
| 3 | `portfolio-service` unavailable during dedup | Degraded outcome is a possible duplicate skill — cosmetic *(EC-703)* |
| 4 | Notification delivery failure | The card prompt is the durable path *(EC-705)* |
| 5 | Name matching unavailable | Treated as a pass *(EC-1002)* |
| 6 | Parse discarded because the resume was deleted | The talent asked for the deletion *(EC-303)* |
| 7 | Extracted job titles discarded because all slots are full | The talent never asked for titles *(AC-1105)* |
| 8 | Skills dropped by the 20-item cap | The count reports what was added, not what was found *(AC-607)* |
| 9 | Entities discarded for having no identifying value | Invisible unless all are discarded, which becomes ER-702 *(§5.1)* |
| 10 | Duplicate entities collapsed | Expected behaviour, not an exception *(EC-203)* |
| 11 | Stale notification actioned after resolution | Route to the profile rather than reopen *(EC-304)* |
| 12 | Permission-restricted surface | Absence, never a message *(ER-1105)* |

---

## 15. Message register

Every talent-facing string in the epic's error surface, in one place.

| ID | Status | Message |
|---|---|---|
| ER-401 | ✅ | Uploaded file exceeds the size limit of 5MB. Please select a different file. |
| ER-402 / 403 | ✅ | Unsupported file type. Only PDF, DOC, and DOCX files are accepted. |
| ER-404 | 📝 | This file appears to be empty. Please select a different file. |
| ER-405 | 📝 | We'll use the first file. You can upload one resume at a time. |
| ER-501 / 502 / 503 | ✅ | Upload failed, please try again. |
| ER-601 / 603 | ✅ | This doesn't look like a resume. Please upload your resume — we couldn't find work history or education in this file. |
| ER-602 | 🔒 | This file is password-protected, so we can't read it. Please remove the password and upload it again. |
| ER-701 | 📝 | We couldn't read your resume just now. Your profile hasn't been changed. Please try again. |
| ER-702 | ✅ | We couldn't pull any details out of this file. You can still fill in your profile yourself. |
| ER-801 | 📝 | We couldn't save your choices. Nothing has been changed. Please try again. |
| ER-802 | 📝 | Your profile changed while you were reviewing, so we didn't apply those updates. You can review them again from your Resume card. |
| ER-803 | 📝 | We couldn't undo those changes. Your profile is as it was after the import. Please try again. |
| ER-804 | 📝 | We undid the changes from your resume. Anything you edited yourself since then has been left as it is. |
| ER-901 | 📝 | We couldn't open your resume right now. You can try again, or download it instead. |
| ER-902 | 📝 | We couldn't download your resume right now. Please try again. |
| ER-903 | 📝 | This preview has expired. Refresh to view your resume again. |
| ER-904 | 📝 | This resume is no longer on your profile. |
| ER-1001 | 🔒 | You've uploaded a few times in a short while. Please wait a little before trying again. |
| ER-1002 | 📝 | An upload is already in progress. Please wait for it to finish. |
| ER-1003 | 📝 | You have resume details waiting for review. Uploading a new file will discard them. Continue? |
| ER-1101 / 1102 | 📝 | Your session has expired. Please sign in again to continue. |

**Totals — 5 approved, 14 draft awaiting approval, 2 blocking.**

### 15.1 Related non-error copy

Reproduced for context. Governed by Doc 04 §8.

| Context | Status | Message |
|---|---|---|
| Name mismatch — a **warning**, not an error | ✅ | Is this your resume? The name on this file — [Extracted Name] — doesn't match the name on your account, [Account Name]. You can only use your own resume to fill in your profile. If you've changed your name or go by something different, you can continue. |
| Delete confirmation | ✅ | Delete Resume? Your resume will be removed. This cannot be undone. |

---

## 16. Recovery path matrix

Every error and its exit. **No cell is empty** *(EP2)*.

| Error | Primary recovery | Alternative | Resolves to |
|---|---|---|---|
| ER-401 Too large | Choose a smaller file | — | `A-01` |
| ER-402/403 Wrong type | Choose a supported file | — | `A-01` |
| ER-404 Empty file | Choose a different file | — | `A-01` |
| ER-501/502 Upload failed | Try again | Skip, on S1 | `A-01` |
| ER-503 Scanner down | Try again later | Skip, on S1 | `A-01` |
| ER-601/603 Not a resume | Upload a different document | Skip, on S1 | `A-01` |
| ER-602 Password-protected | Remove the password, re-upload | Skip, on S1 | `A-01` |
| ER-701 Extraction failed | Try again | Fill profile manually | `A-01` |
| ER-702 Nothing found | Fill profile manually | Replace with a different resume | `C-03` |
| ER-801 Submission failed | Try again | Keep Existing | `B-03` or `B-06` |
| ER-802 Profile changed | Review again | Ignore — nothing was lost | `C-04` |
| ER-803 Undo failed | Try again | Accept the imported state | `B-03` |
| ER-901 Cannot open | Try again | **Download instead** | `C-03` |
| ER-902 Download failed | Try again | View instead | `C-03` |
| ER-903 Preview expired | Refresh | Download | `C-03` |
| ER-904 No longer exists | Upload a new resume | — | `C-01` |
| ER-1001 Rate limited | Wait, then retry | — | `A-01` |
| ER-1002 Upload in progress | Wait for it to finish | — | `A-01` |
| ER-1101/1102 Session expired | Sign in | — | `C-04` or `A-01` |
| ER-1103 Token failure, S1 | Try again | **Skip** — onboarding never blocked | `A-01` |

---

## 17. Logging and observability

Talent-facing copy carries no diagnostic detail *(EP4)*, so every error must be logged with enough context to diagnose without it.

| Error class | Log | Alert threshold |
|---|---|---|
| Validation (ER-4xx) | Rejection reason, file size and type | Anomalous rate only |
| Transfer (ER-5xx) | Failure cause, retry count, idempotency key | Elevated rate |
| Content rejection (ER-6xx) | `document_type`, confidence, discard counts | **Rate feeds the 0.7 threshold tuning after the first 100 uploads** |
| Processing (ER-7xx) | Duration, retry outcome, failure mode | Elevated rate or timeout clustering |
| Submission (ER-8xx) | Rows attempted, rows applied, version-mismatch flag | **Any occurrence of ER-802** — indicates real concurrent editing |
| Retrieval (ER-9xx) | Action, expiry state | Elevated rate |
| Blocked (ER-10xx) | Cap window, concurrent-attempt flag | Anomalous rate |
| Session and permission (ER-11xx) | Surface, path | Any ER-1103 — pre-profile auth is fragile by nature |
| Data shape (ER-13xx) | Field, received shape | **Any occurrence** — indicates a contract drift with `resume-parsing-service` |

### 17.1 The two that matter most

- **ER-601 rate** is the tuning signal for the confidence threshold. Too high means the gate is rejecting real resumes; too low means contracts are getting through *(AC-304)*.
- **ER-1301 and ER-13xx generally** indicate the parse response no longer matches the expected shape. Any occurrence is a contract problem, not a talent problem.

---

## 18. QA assertions

| # | Assertion |
|---|---|
| 1 | All eleven Domain A failure and outcome states render distinguishable copy and treatment *(EP1)* |
| 2 | ER-402 and ER-601 are visibly and textually distinct — file type versus file content |
| 3 | ER-702 renders in informational treatment, and the file **is** stored afterward |
| 4 | ER-601 stores **nothing** — no file, no profile data |
| 5 | ER-801 leaves the conflict dialog **open** with selections intact |
| 6 | ER-901 leaves the file record rendered on the card — never `C-01` |
| 7 | ER-904 is the only retrieval failure that resolves to `C-01` |
| 8 | Every error state on S1 leaves **Skip** and **Continue** enabled |
| 9 | No talent-facing string contains a service name, vendor name, error code or identifier |
| 10 | `undefined`, `null`, `NaN`, `Invalid Date`, `[object Object]` are unreachable in every rendered surface, including accessible names |
| 11 | No error, disabled control or permission notice renders for any non-owner viewer — absence only |
| 12 | Every error in §16 has a working recovery path that reaches its stated state |
| 13 | Error copy is identical on S1 and S3 *(EC-1104)* |
| 14 | The twelve silent conditions in §14 produce no talent-facing message |

---

## 19. Approval status

| Status | Count | Action |
|---|---|---|
| ✅ Approved and locked | 5 | Implement verbatim |
| 📝 Draft, awaiting UX writing and design | 14 | Review before the relevant phase |
| 🔒 Blocking | 2 | **ER-1001 blocks phase 1. ER-602 blocks phase 2.** |

### 19.1 The two blockers

| ID | State | Phase | Note |
|---|---|---|---|
| **ER-1001** | `A-13` rate limited | **1** | Drafted above. Needs a decision on whether to state the retry window numerically or keep it vague |
| **ER-602** | `A-16` password protected | **2** | Drafted above. Straightforward — likely approvable as written |

Both have drafted copy in this document. Neither needs new thinking, only approval.
