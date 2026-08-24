# 06 — Resume Upload & Profile Autofill · Frontend State Management

> **Updated 22 July 2026.** Confirmed decisions cascaded from the Overview Docs.
>
> - **Domain B is now profile-only.** Entered from Domain C, never from Domain D. `B-01` through `B-07` are unreachable during onboarding.
> - **§2 architecture diagram updated** to show onboarding routing straight to pre-filled steps 2–6.
> - **§8.2 added** — why Domain B is not entered from Domain D, and where extracted data goes instead.
> - **§8.3 added** — permitted divergence from S3, split into identical-before-parse and different-after-parse.
> - **§15.1** — new QA suite asserting onboarding produces no dialogs.
> - Anti-pattern 12 reworded to match the new divergence rule.


**Parent epic:** Talent Profile
**Epic (this doc):** Resume Upload & Profile Autofill
**Audience:** Frontend engineering, QA, design QA.
**Sources of truth:** 01 — Feature List · 01a — Product Questions Register · 01b — CTO Answers & Decisions · 02 — User Stories · 03 — Acceptance Criteria · 04 — Frontend Specs · 05 — Edge Cases & Solutions · `user-service` Resume Upload & Profile Autofill · `resume-parsing-service` Doc 00.

**Purpose.** Define every state the interface must represent, what causes it, what the talent sees, what they can do, and how it resolves. This is the state contract the build is written against and the surface QA asserts on.

**Framework-agnostic.** No markup, styling, or framework specifics. "State" here means a distinct, testable condition of the interface — not an implementation construct.

---

## 1. Governing principles

| # | Principle | State consequence |
|---|---|---|
| **SP1** | **No state is unnamed.** Every condition the talent can observe has an ID in this document. If the build produces a condition not listed here, it is a defect or a gap in this document — never an acceptable improvisation. | §14 anti-patterns |
| **SP2** | **No state is terminal without an exit.** Every state defines at least one action or automatic transition. A talent can never be stranded. | Every table below |
| **SP3** | **Failure states are distinct.** Eighteen upload statuses do not collapse into one error state. | §4 |
| **SP4** | **Dismissal resolves to the safe state.** Every dialog state defines its dismissal target explicitly. | §5.6 |
| **SP5** | **Permission is a gate, not a state.** Visibility is resolved before any state machine runs. A surface the talent may not see has no states at all. | §7 |
| **SP6** | **Additive is applied; destructive is pending.** Additions mutate the profile on arrival. Only conflict decisions are held. | §5 |

---

## 2. State architecture

This epic is **not** one state machine. It is four independent machines plus two derived layers. Conflating them is the most common architectural mistake here — the Resume card outlives any single upload, and the review flow outlives the session.

| Domain | Machine | Lifetime | Owner surface |
|---|---|---|---|
| **A** | Upload lifecycle | One upload attempt | Uploader (S1, S3) |
| **B** | Review flow | One parse result — **survives session loss** | Review overlay (S5) — **profile only** |
| **C** | Resume card | The talent's account | Profile sidebar (S3) |
| **D** | Onboarding step | One onboarding session | Onboarding step 1 (S1) |
| — | Permission gate | Resolved per render | All surfaces |
| — | Derived view state | Per dialog render | Summary, conflict dialog |

### 2.1 How they relate

```
Permission gate ─── resolves visibility, then ───┐
                                                 ▼
D · Onboarding step ──── hosts ────▶ A · Upload lifecycle
                                          │
                                    on ready_for_review
                                          ▼
                          Onboarding steps 2–6, pre-filled
                          (no dialogs — Domain B is not entered)

C · Resume card ──────── hosts ────▶ A · Upload lifecycle
                                          │
                                    on ready_for_review
                                          ▼
                                  B · Review flow
                                          │
                                    on resolution
                                          ▼
                          C · Resume card  ·  Checklist  ·  Profile data
```

**Key relationships**

- **A does not own the file.** It owns one attempt. When A terminates, C reflects the outcome.
- **B outlives A.** A parse result reaching `ready_for_review` persists even if the tab closes. C surfaces the re-entry point *(EC-306, AC-108)*.
- **C is durable.** It reflects account state, not attempt state, and renders on every profile load.
- **D never blocks on A.** Onboarding navigation stays available in every state of A *(AC-310)*.
- **D never enters B.** At onboarding the profile does not exist, so nothing can conflict and a summary would describe a profile the talent has never seen. Extracted data flows straight into onboarding steps 2–6, pre-filled and editable in context. **Domain B is reachable only from C.**

---

## 3. State notation

Each state below is defined as:

> **ID · Name** — *Category*
> **When** — the condition this represents.
> **Trigger** — what causes entry.
> **Talent sees** — the required rendering.
> **Actions** — what is available.
> **Transitions** — where it can go, and on what.
> **Ref** — governing acceptance criteria.

**Categories:** `default` · `loading` · `success` · `empty` · `disabled` · `validation` · `error` · `permission` · `derived`

---

## 4. Domain A — Upload lifecycle

One instance per upload attempt. Hosted by S1 and S3 identically *(EC-1104 to EC-1108)*.

### A-01 · Idle — *default*
**When.** No upload in progress and none has failed in this attempt.
**Trigger.** Surface mount; or reset after cancel, retry, or a terminal failure being dismissed.
**Talent sees.** Dropzone, accepted-format and size hint, privacy disclosure, **Choose File**.
**Actions.** Select file (picker or drop).
**Transitions.** → `A-02` on drag-over · → `A-05` on valid selection · → `A-10`/`A-11`/`A-12` on client validation failure.
**Ref.** AC-101, AC-203, AC-208.

### A-02 · Drag-over — *default*
**When.** A file is dragged over the drop target.
**Trigger.** Drag enter.
**Talent sees.** Highlighted border and fill.
**Actions.** Drop, or drag away.
**Transitions.** → `A-01` on drag-leave or cancel · → `A-05` on drop.
**Ref.** AC-204.

### A-03 · Disabled — *disabled*
**When.** Upload is not currently permitted — an upload is already in flight for this talent, or the surface is in a read-only context.
**Trigger.** In-flight upload detected; context resolution.
**Talent sees.** Muted, non-interactive dropzone. No drag-over response. Dropped files ignored.
**Actions.** None.
**Transitions.** → `A-01` when the blocking condition clears.
**Ref.** AC-204, EC-301.

### A-04 · Pre-save preview — *default*
**When.** A file has been selected and passed client validation, awaiting commit.
**Trigger.** Valid selection.
**Talent sees.** The document rendered for inspection.
**Actions.** **Cancel** · **Save Resume**.
**Transitions.** → `A-01` on Cancel, escape, click-outside, ✕ — selection discarded, nothing stored, no parse · → `A-05` on Save Resume.
**Ref.** AC-206, AC-207.

### A-05 · Uploading — *loading*
**When.** Bytes in transfer.
**Trigger.** **Save Resume**.
**Talent sees.** Filename, size, percentage (`200 KB – 70% uploaded`), animated indicator. **Percentage is capped at 99% while the request is unresolved** *(EC-107)*.
**Actions.** None. Navigation away abandons cleanly *(AC-1406)*.
**Transitions.** → `A-06` on transfer complete · → `A-09` on transport failure or upload timeout · → `A-13` on rate limit · → `A-11` on server-side signature rejection.
**Ref.** AC-205, EC-103, EC-107, EC-405.

### A-06 · Scanning — *loading*
**When.** Virus scan in progress.
**Trigger.** Transfer complete.
**Talent sees.** **Presented as a continuation of `A-05`.** No separate message — the talent does not need to know about scanning.
**Actions.** None.
**Transitions.** → `A-07` on pass · → `A-09` on scan failure or scanner unavailable *(fail closed, EC-704)*.
**Ref.** AC-303, EC-704.

### A-07 · Parsing — *loading*
**When.** Extraction in progress.
**Trigger.** Scan passed.
**Talent sees.** One processing message with an animated indicator. **No stage sequence, no percentage, no step counter** *(AC-402)*. Under reduced-motion preferences, a static indicator *(EC-1205)*.
**Actions.** None while inline.
**Transitions.** → `A-08` at 10 seconds · → `A-14`–`A-18` on parse outcome · → `A-15` on timeout or vendor failure.
**Ref.** AC-401, AC-402, AC-403.

### A-08 · Async handoff — *loading*
**When.** Parsing has exceeded 10 seconds.
**Trigger.** 10-second threshold.
**Talent sees.** Released from the blocking indicator; free to use the product. An in-app notification follows on resolution.
**Actions.** Continue using the product.
**Transitions.** → `C-04` (card `pending-review`) on resolution · → `A-15` on the 30-second timeout, which still applies *(EC-1006)*.
**Ref.** AC-403, EC-1006.

### Failure and outcome states

| ID | Name | Category | When | Talent sees | Actions | Transitions |
|---|---|---|---|---|---|---|
| **A-09** | Upload failed | `error` | Transport, server, or scan failure | "Upload failed, please try again." Must not imply the file is invalid | **Try again** | → `A-01` on retry, reopening selection if the file reference is stale *(EC-105)* |
| **A-10** | Too large | `validation` | > 5MB, **rejected before transfer** | "Uploaded file exceeds the size limit of 5MB. Please select a different file." | **Try again** | → `A-01` |
| **A-11** | Invalid type | `validation` | Extension not PDF/DOC/DOCX, **or** signature mismatch detected server-side, **or** zero-byte file | "Unsupported file type. Only PDF, DOC, and DOCX files are accepted." | **Try again** | → `A-01` |
| **A-12** | Multiple files | `validation` | More than one file selected | Non-blocking inline message; the first file proceeds | None — informational | → `A-04` with the first file |
| **A-13** | Rate limited | `error` | Hourly cap reached | Explains the cap and when retry is possible. **Not** a generic failure. *Copy pending design* | Acknowledge | → `A-01` |
| **A-14** | Not a resume | `error` | `is_resume: false`, or confidence **< 0.7**, or confidence absent | "This doesn't look like a resume. Please upload your resume — we couldn't find work history or education in this file." | **Try again** | → `A-01`. **Nothing stored, nothing written** |
| **A-15** | Parse failed / timeout | `error` | 30s exceeded after one silent retry, vendor error, or malformed response | Recoverable error. No vendor or service names in copy | **Try again** | → `A-01`. **Profile unchanged** |
| **A-16** | Password protected | `error` | Document encrypted, text unreadable | Specifically identifies password protection and instructs removal and re-upload. *Copy pending design* | **Try again** | → `A-01` |
| **A-17** | Nothing found | `empty` | Valid resume, zero usable entities after validation | "We couldn't pull any details out of this file. You can still fill in your profile yourself." **Informational treatment, not error treatment** *(EC-909)* | Acknowledge; fill profile manually | → `C-03` — **file is stored**, checklist step completes |
| **A-18** | Ready for review | `success` | Parse succeeded with at least one usable entity | Hands off to Domain B | — | → `B-01` if a name mismatch applies · → `B-02` if conflicts exist · → `B-03` otherwise |

### 4.1 Domain A rules

1. **Client validation precedes transfer.** `A-10` and `A-11` are reachable without uploading bytes. `A-11` is *also* reachable after transfer via signature mismatch — the component supports both entry paths *(AC-301, AC-302, EC-103)*.
2. **`A-17` stores the file; `A-14` does not.** This is the single most important distinction in the domain. `nothing_found` is a successful upload with an empty result. `not_a_resume` is a rejection *(AC-307, AC-308, AC-305)*.
3. **One instance of Domain A per talent at a time.** A concurrent attempt is refused with a specific message, and the in-flight attempt is untouched *(EC-301)*.
4. **Retries are idempotent.** The same idempotency key is reused across retries of one file, so a lost response cannot create a duplicate record *(EC-108)*.
5. **`A-06` is invisible.** Scanning renders as continued uploading.

---

## 5. Domain B — Review flow

One instance per parse result. **Survives session loss, tab close and refresh** until resolved *(AC-108, EC-306, EC-401)*.

> **Domain B is profile-only.** It is entered from Domain C and never from Domain D. During onboarding no state in this domain is reachable — no name-mismatch dialog, no conflict dialog, no summary. See §8.2.

### B-01 · Name mismatch — *validation*
**When.** An account name exists and the fuzzy comparison fails. **Unreachable on S1** — no account name exists to compare against *(AC-501)*.
**Trigger.** Parse resolved on S3 with a non-matching name.
**Talent sees.** "Is this your resume?" with both names rendered, and the explanatory copy.
**Actions.** **Upload a different file** · **Yes, this is mine**.
**Transitions.** → `A-01` on decline, dismissal, escape, click-outside or ✕ — **nothing written, no resume stored** · → `B-02` or `B-03` on accept.
**Ref.** AC-505 → AC-509.

**Note.** A missing extracted name, or an unavailable matching check, is a **pass** — this state is not entered *(AC-509, EC-1002)*.

### B-02 · Conflict decision — *default*
**When.** At least one extracted entity matches an existing profile entry. **Unreachable on S1** — an empty profile has nothing to match.
**Trigger.** Parse resolved with conflicts, after any name check passed.
**Talent sees.** "Update Current Information?" with the explanatory copy, conflicts grouped by entity type, one row per conflict, each carrying an **Apply Update** checkbox. Destructive treatment throughout. Groups with no conflicts are omitted.
**Row default.** **All checked** — except a row whose entry has an unsaved local edit, which defaults **unchecked** *(EC-605)*.
**Actions.** Toggle any row · **Keep Existing** · **Yes, Update**.
**Transitions.**
- → `B-03` on **Yes, Update** — checked rows applied, unchecked untouched. Zero checked is valid and applies nothing *(EC-604)*.
- → `B-03` on **Keep Existing** — nothing overwritten, additions remain.
- → `B-06` on escape, click-outside, ✕ or browser back — resolves to **Keep Existing**.
- → `B-05` on submission failure — dialog stays open, selections intact.
- → `B-07` on a stale-entity rejection.
**Ref.** AC-701 → AC-712, EC-302, EC-602, EC-604, EC-605.

### B-03 · Summary — *success*
**When.** The import has resolved and produced at least one change. **Unreachable on S1** — see §8.2.
**Trigger.** Conflicts resolved, or no conflicts existed.
**Talent sees.** "Resume Upload Complete" with past-tense copy, grouped counted sections, per-item identifying detail, overflow collapsed behind **+ N more…**. Groups with zero items are omitted.
**Actions.** Expand overflow · **Undo Changes** · **Looks good!**
**Transitions.** → `B-04` on Undo · → `C-03` on **Looks good!**, escape, click-outside or ✕ — all identical, because additions were already applied.
**Ref.** AC-601 → AC-605, AC-801, AC-802.

### B-04 · Undone — *success*
**When.** The talent reverses the import.
**Trigger.** **Undo Changes**.
**Talent sees.** Confirmation that the profile was restored. Where an imported entry was modified since import, it is **excluded from the reversal** and the outcome is reported plainly rather than claimed as complete *(EC-606)*.
**Actions.** Close.
**Transitions.** → `C-03` — the file remains stored *(AC-801)*.
**Ref.** AC-801, EC-606.

### B-05 · Submission failed — *error*
**When.** Conflict decisions could not be submitted.
**Trigger.** Network loss or server error on confirm.
**Talent sees.** Inline error **inside the open dialog**. Selections preserved.
**Actions.** Retry · **Keep Existing**.
**Transitions.** → `B-03` on successful retry · → `B-06` on **Keep Existing**.
**Ref.** EC-308.

> **Rule.** The dialog **must not close** on a failed submission. Closing implies a decision was recorded. This is a data-integrity requirement, not a nicety.

### B-06 · Dismissed — *derived*
**When.** The review was exited without an explicit decision.
**Trigger.** Escape, click-outside, ✕, browser back, refresh, tab close, or session loss.
**Talent sees.** Nothing — a transient resolution, not a rendered state.
**Effect.** Resolves to **Keep Existing**. Nothing overwritten. Additions remain applied.
**Transitions.** → `C-04` (card `pending-review`) where the review was abandoned rather than deliberately declined *(AC-803, EC-607)*.
**Ref.** AC-709, EC-306, EC-307.

### B-07 · Stale entity — *error*
**When.** A conflicting profile entry was modified elsewhere while the dialog was open.
**Trigger.** Server reports a version mismatch on confirm.
**Talent sees.** A recoverable message stating the profile changed and asking them to review again. Rows that did not change are still applied.
**Actions.** Re-open review.
**Transitions.** → `C-04` — re-entry via the pending-review path.
**Ref.** EC-302.

### 5.1 Ordering rule

`B-02` **always precedes** `B-03`. A talent is never shown a completion summary followed by a further question *(AC-711)*.

```
A-18 ──▶ [name mismatch?] ──▶ B-01 ──(accept)──┐
   │                             │             │
   │                        (decline)          │
   │                             ▼             ▼
   │                           A-01      [conflicts?]
   │                                       │      │
   └───────────────────────────────────── yes    no
                                           ▼      │
                                         B-02 ────┤
                                           │      │
                                           ▼      ▼
                                          B-03 ◀──┘
                                           │
                                    ┌──────┴──────┐
                                    ▼             ▼
                                  B-04           C-03
```

### 5.2 Durability

| Event | Domain B outcome |
|---|---|
| Refresh during `B-02` | → `B-06`, then `C-04`. Checkbox state is **not** restored — the talent decides again *(EC-306)* |
| Tab closed during `B-02` | → `B-06`, then `C-04` |
| Session expired during `B-02` | → `B-06`, no write. Re-authentication offered *(EC-402)* |
| Refresh during `B-03` | Additions already applied. → `C-03` |
| New upload started while `B-02`/`B-03` pending | Warn, then discard the pending result on confirmation. Prior additions remain *(EC-305)* |
| Resume deleted while parse in flight | Result discarded silently. → `C-01` *(EC-303)* |

---

## 6. Domain C — Resume card

Durable, account-scoped. Renders on every profile load for the owner. **Never renders for any other viewer** *(§7)*.

### C-01 · Empty — *empty*
**When.** No resume stored.
**Trigger.** Never uploaded; deleted; or a rejected upload that stored nothing.
**Talent sees.** "Add your resume to complete your profile faster." with the upload affordance. **No lifecycle actions rendered.**
**Actions.** Upload.
**Transitions.** → `C-02` on upload start.
**Ref.** AC-106, AC-910.

### C-02 · Processing — *loading*
**When.** An upload or parse is in progress for this talent.
**Trigger.** Domain A entering `A-05` through `A-08`.
**Talent sees.** In-progress indication on the card.
**Actions.** None. Upload affordance is `disabled` *(EC-301)*.
**Transitions.** → `C-03` on success or `A-17` · → `C-04` on `A-18` with an unresolved review · → back to prior state on failure.
**Ref.** EC-301.

### C-03 · Stored — *success*
**When.** A resume is on file.
**Trigger.** Successful upload, including `A-17` `nothing_found`.
**Talent sees.** Filename, "Added on \<date\>" in the talent's locale, and the four lifecycle actions with default and hover treatments. Long filenames truncate with the full value available to assistive technology.
**Actions.** View · Download · Replace · Delete.
**Transitions.** → `C-01` on delete confirmed · → `C-02` on replace started · → `C-05` on a storage failure for view or download.
**Ref.** AC-308, AC-901, AC-909, EC-109, EC-310.

### C-04 · Pending review — *success*
**When.** A parse reached `ready_for_review` and was never resolved.
**Trigger.** Abandonment, session loss, async completion, or a stale-entity rejection.
**Talent sees.** The stored-file record **plus** "We found details in your resume. Review them." with a re-entry action. Announced politely to assistive technology **without moving focus** *(EC-1201)*.
**Actions.** All `C-03` actions, plus review.
**Transitions.** → `B-01`/`B-02`/`B-03` on review · → `C-03` once resolved by **any** exit path, including **Keep Existing** · → `C-01` on delete.
**Ref.** AC-108, AC-803, EC-1201.

### C-05 · File unavailable — *error*
**When.** The file record exists but storage cannot serve it.
**Trigger.** View or download failure; expired signed URL.
**Talent sees.** The file record **still rendered** — metadata is valid and the file is not gone — with a recoverable error scoped to the attempted action.
**Actions.** Retry · Download as an alternative to a failed preview *(EC-1005)*.
**Transitions.** → `C-03` on successful retry.
**Ref.** EC-309, EC-702, EC-1005.

> **Rule.** `C-05` must never degrade to `C-01`. Presenting the card as empty tells the talent their file was deleted, which is false.
> - **§7** — scope line added: this is a talent feature; no domain runs outside the talent profile.
> - **V-05** — skills cap corrected to the profile's own limit of 100.

---

## 7. Permission-derived states

**Permission is a gate, not a state** *(SP5)*. It resolves before any machine runs. A surface the viewer may not see has no states — it is absent from the layout.

**This is a talent feature.** Clients do not upload resumes; no domain here runs outside the talent profile.

| Viewer | Resume card | Notes |
|---|---|---|
| Profile owner | Full — `C-01` … `C-05` | The only viewer with any resume states |
| **Client** | **Absent** | No file, filename, date or derived preview on any client-facing surface *(AC-1001)* |
| **Owner in View-as-Client** | **Absent** | Omitted from the layout, not hidden. No residual spacing, heading or divider *(AC-1002, EC-802)* |
| Team lead | **Absent** | Team context grants no visibility *(EC-804)* |
| Support agent, no restricted role | **Absent** | Absence, not a disabled control — a disabled control confirms the file exists *(EC-803)* |
| Support agent, restricted role | Read-only view | Every access logged with agent, talent and timestamp *(AC-1305)* |

### 7.1 Rules

1. **Absence, never disablement.** A hidden-but-present control leaks the existence of the file. Omit the component.
2. **Standing assertion.** Client-facing absence is asserted continuously, not implemented once. New client-facing surfaces inherit the requirement *(EC-801)*.
3. **Pre-profile authentication.** On S1 the upload precedes the profile. A token or scope failure renders as a recoverable upload error, never a sign-in prompt mid-onboarding *(EC-404)*.

---

## 8. Domain D — Onboarding step

### D-01 · Step active — *default*
**When.** The talent is on onboarding step 1.
**Talent sees.** `STEP 1 / 6`, the supporting line, the uploader in its current Domain A state, and **Back** · **Skip** · **Continue**.
**Actions.** All Domain A actions, plus step navigation.
**Transitions.** → previous step on Back, discarding any selection · → step 2 on Skip or Continue.
**Ref.** AC-101, AC-102, AC-103.

### D-02 · Step complete — *success*
**When.** A resume was uploaded and parsed successfully.
**Talent sees.** The stored file, and **no dialog of any kind**. Step 2 arrives with the name pre-filled and editable; skills, work history, education and certifications appear pre-filled on their own steps, each noted as coming from the resume.
**Transitions.** → step 2 on Continue.
**Ref.** AC-502.

### D-03 · Step skipped — *empty*
**When.** The talent advanced without uploading.
**Talent sees.** Step 2, with no resume stored and no profile data written.
**Ref.** AC-102.

### 8.1 The invariant

**Navigation is never blocked.** **Skip** and **Continue** remain enabled in **every** Domain A state, including every failure state. No upload or parse outcome can strand a talent in onboarding *(AC-310, EC-701)*.

### 8.2 Domain B is not entered from Domain D

At onboarding step 1 the profile does not yet exist. Two consequences follow, and neither is optional:

| State | Why unreachable on S1 |
|---|---|
| `B-01` name mismatch | No account name exists to compare against. The resume *is* the source of the name |
| `B-02` conflict decision | An empty profile has nothing to conflict with. The dialog would always be empty |
| `B-03` summary | Would report changes to a profile the talent has never seen. A receipt with no context |
| `B-04` – `B-07` | All downstream of the above |

**Where extracted data goes instead.** Straight into onboarding steps 2–6, pre-filled and editable in context. Each pre-filled step carries a short note that the values came from the resume, so they do not read as the talent's own entries.

**The onboarding steps are the review.** Each value sits beside its own label, on the step that owns it, and can be corrected before the talent moves on. That is a better review surface than a dialog listing sixty items for a profile that does not yet exist.

### 8.3 Permitted divergence from S3

Everything **before** the parse result is identical — uploader, validation, every failure state, every error string. Divergence there is a defect *(EC-1104 to EC-1108)*.

Everything **after** the parse result differs by design:

| | S1 | S3 |
|---|---|---|
| Name matching | Skipped; name seeded | Runs; warns on mismatch |
| Domain B | **Never entered** | Entered on every successful parse |
| Destination of extracted data | Onboarding steps 2–6, pre-filled | Profile, reported in the summary |
| Step navigation | Present | Absent |

---

## 9. Derived and filtered view states

These are not machine states. They are rendering conditions computed from data, and each must be independently reachable for design QA.

| ID | Condition | When | Rendering rule | Ref |
|---|---|---|---|---|
| **V-01** | Group omitted | An entity type produced zero items | Omitted entirely. **Never an empty section with a heading** | AC-601, EC-903 |
| **V-02** | Overflow collapsed | A group exceeds the display threshold | Remainder behind **+ N more…**, expandable in place | AC-604 |
| **V-03** | Overflow expanded | Talent expanded a group | Full list, panel scrolls, dialog does not exceed the viewport or clip its actions | AC-604 |
| **V-04** | Long list scroll | Many conflict rows | Body scrolls; header and **both** actions stay fixed and visible. A row count is shown | EC-602 |
| **V-05** | Skills filtered by dedup | Skills remain after de-duplication | Dedup within parse → remove existing and case-study-associated → import remainder in order, stopping only at the **profile's own limit of 100**. Count reflects skills **added** | AC-606, AC-607, EC-205 |
| **V-06** | Entity discarded as empty | An entry has no identifying value | Excluded before counting. If all groups empty, → `A-17` | EC-202 |
| **V-07** | Same-job collapse | Same company, title and **start date** | One row representing an update — never two competing entries | AC-710, EC-203 |
| **V-08** | Row flagged as locally edited | An unsaved edit exists on a conflicting entry | Row flagged and defaults **unchecked** — the sole exception to all-checked | EC-605 |
| **V-09** | Truncated value | Value exceeds display length | Truncate for display, retain in data, force wrapping on unbroken strings | AC-1411, EC-212 |
| **V-10** | Partial date | Some or all dates absent | Render what exists. Never "undefined", "null", "NaN" or "Invalid Date". Entries without a start date cannot match and are treated as additions | AC-1408, EC-209 |
| **V-11** | Summary reports no change | Conflicts all declined, no additions | Reports that nothing changed. Never empty groups | AC-712, EC-902 |
| **V-12** | RTL or non-Latin content | Extracted values in non-Latin scripts | Per-value directionality. Unicode-normalised, not ASCII-stripped | EC-213 |

---

## 10. Validation states

Two tiers, distinguished by when they resolve. The distinction matters because tier 1 must never transfer bytes.

### 10.1 Tier 1 — client-side, before transfer

| Check | Failure state | Rule |
|---|---|---|
| Extension | `A-11` | PDF, DOC, DOCX only |
| Size, maximum | `A-10` | ≤ 5MB |
| Size, minimum | `A-11` | Zero-byte files rejected *(EC-102)* |
| Selection count | `A-12` | First file accepted; informational message |
| Empty selection | — | Return to prior state, no change |

### 10.2 Tier 2 — server-resolved, rendered by the frontend

| Check | Failure state | Notes |
|---|---|---|
| Signature matches extension | `A-11` | Reached **after** transfer — the component supports both entry paths *(EC-103)* |
| Virus scan | `A-09` | Presented as upload failure. **Fails closed** if the scanner is unavailable *(EC-704)* |
| Rate limit | `A-13` | Specific message, not generic |
| Document readable | `A-16` | Password-protected |
| Classification gate | `A-14` | `is_resume` true **and** confidence ≥ 0.7. **Absent confidence fails closed** *(EC-1008)*. Exactly 0.7 **passes** *(EC-214)* |
| Usable entities present | `A-17` | After discarding entries with no identifying value *(EC-202)* |
| Name comparison | `B-01` | S3 only. Missing name or unavailable check → pass |
| Entity version on confirm | `B-07` | Stale rows not applied *(EC-302)* |

### 10.3 Rendering-time validation

Applies at every render point — summary, conflict rows, profile, tooltips and accessible names.

| Concern | Rule | Ref |
|---|---|---|
| Escaping | All extracted values escaped. Never interpreted as markup | AC-1410, EC-211 |
| Count integrity | Displayed counts equal rendered items, after dedup and cap | AC-602, EC-205 |
| Pluralisation | Correct at N = 1 | AC-602 |
| Graceful degradation | Missing sub-fields render cleanly with no placeholder artefacts | AC-603, EC-907, EC-908 |
| Locale | Dates in the talent's timezone. Never a raw ISO string | EC-310, EC-1007 |

---

## 11. Disabled states

| ID | Element | Disabled when | Treatment | Ref |
|---|---|---|---|---|
| **X-01** | Dropzone | An upload is in flight for this talent | Muted, non-interactive, no drag-over response, dropped files ignored | AC-204, EC-301 |
| **X-02** | Upload affordance on the card | Card in `C-02` | Non-interactive | EC-301 |
| **X-03** | Lifecycle actions | Card in `C-01` | **Not rendered** — absence, not disablement | AC-910 |
| **X-04** | Resume card entirely | Viewer is not the owner | **Absent from the layout** — not disabled | AC-1002, EC-802 |

### 11.1 Two things that must never be disabled

| Element | Reason |
|---|---|
| **Yes, Update** with zero rows checked | Applying nothing is a legitimate outcome the talent may have reasoned toward. Disabling strands them *(AC-707, EC-604)* |
| **Skip** and **Continue** on S1 | No upload or parse outcome may block onboarding *(AC-310, EC-701)* |

---

## 12. State precedence

When conditions collide, resolve in this order. Higher rows win.

| Rank | Condition | Resolution |
|---|---|---|
| 1 | Viewer is not the owner | Card absent. No machine runs *(SP5)* |
| 2 | Account deleted | Terminate silently, route out. No resume-specific error *(EC-406)* |
| 3 | Resume deleted mid-flight | Discard the parse result silently. → `C-01` *(EC-303)* |
| 4 | Session expired | No write. Offer re-authentication *(EC-402)* |
| 5 | Upload already in flight | Refuse the second attempt with a specific message *(EC-301)* |
| 6 | Pending review exists, new upload started | Warn; discard the pending result on confirmation. Prior additions remain *(EC-305)* |
| 7 | Unsaved local edit on a conflicting entry | That row defaults unchecked *(EC-605, V-08)* |
| 8 | Normal machine transitions | Per §4 to §8 |

---

## 13. Persistence and durability

What survives what. Anything not listed as durable is discarded on exit.

| Item | Survives refresh | Survives tab close | Survives session loss | Notes |
|---|---|---|---|---|
| Stored resume file and metadata | ✅ | ✅ | ✅ | Account-scoped |
| Parse result at `ready_for_review` | ✅ | ✅ | ✅ | Re-entry via `C-04` |
| Applied additions | ✅ | ✅ | ✅ | Applied on arrival |
| Pending-review prompt | ✅ | ✅ | ✅ | Until resolved by **any** exit path, or the resume is deleted |
| Conflict checkbox selections | ❌ | ❌ | ❌ | Talent decides again. Restoring partial decisions is unsafe *(EC-306)* |
| Undo availability | ❌ | ❌ | ❌ | Lives and dies with `B-03` *(AC-802)* |
| In-progress upload | ❌ | ❌ | ❌ | Abandoned cleanly. No partial record *(AC-1406)* |
| Selected-but-unsaved file | ❌ | ❌ | ❌ | Discarded at `A-04` |
| Dismissed profile prompt | Session only | ❌ | ❌ | Not re-presented in the same session *(AC-105)* |

---

## 14. Anti-patterns

Each of these is a build failure, not a style preference.

| # | Anti-pattern | Why it fails |
|---|---|---|
| 1 | A shared generic "something went wrong" state | Collapses eleven distinct outcomes. Violates SP3 and fails AC-301 to AC-310 |
| 2 | Treating `A-17` as an error | `nothing_found` stores the file and completes the checklist step. Error treatment tells the talent their upload failed *(EC-909)* |
| 3 | Degrading `C-05` to `C-01` | Tells the talent their file was deleted. It was not *(EC-702)* |
| 4 | Closing `B-02` on a failed submission | Implies a decision was recorded. Data-integrity failure *(EC-308)* |
| 5 | Restoring conflict selections after a refresh | Presents remembered partial decisions as current. Unsafe *(EC-306)* |
| 6 | Hiding the card by styling in View-as-Client | Leaves residual layout and leaks that something exists *(EC-802)* |
| 7 | Disabling a control instead of omitting it, for permission | A disabled control confirms the file exists *(EC-803)* |
| 8 | Disabling **Yes, Update** at zero selections | Strands a talent who wants exactly that outcome *(EC-604)* |
| 9 | Blocking onboarding navigation on any upload state | Violates the Domain D invariant *(AC-310)* |
| 10 | Staged progress copy during `A-07` | Fabricated progress reads as broken when slow *(AC-402)* |
| 11 | Displaying 100% while the request is unresolved | Produces an apparent permanent hang *(EC-107)* |
| 12 | Divergent intake or failure handling between S1 and S3 | Everything up to the parse result must be identical. What follows differs by design — see §8.3 *(EC-1104 to EC-1108)* |
| 13 | Rendering an empty group with a heading | Omit it *(V-01)* |
| 14 | Moving focus when `C-04` appears | The talent may be mid-task elsewhere *(EC-1201)* |

---

## 15. QA state coverage matrix

Every row must be independently reachable and demonstrable in isolation. A component is not done until all of its states can be produced on demand for design QA.

| Domain | State | Category | Reachable in isolation | Covered by test |
|---|---|---|---|---|
| A | A-01 Idle | default | ☐ | ☐ |
| A | A-02 Drag-over | default | ☐ | ☐ |
| A | A-03 Disabled | disabled | ☐ | ☐ |
| A | A-04 Pre-save preview | default | ☐ | ☐ |
| A | A-05 Uploading | loading | ☐ | ☐ |
| A | A-06 Scanning | loading | ☐ | ☐ |
| A | A-07 Parsing | loading | ☐ | ☐ |
| A | A-08 Async handoff | loading | ☐ | ☐ |
| A | A-09 Upload failed | error | ☐ | ☐ |
| A | A-10 Too large | validation | ☐ | ☐ |
| A | A-11 Invalid type | validation | ☐ | ☐ |
| A | A-12 Multiple files | validation | ☐ | ☐ |
| A | A-13 Rate limited | error | ☐ | ☐ |
| A | A-14 Not a resume | error | ☐ | ☐ |
| A | A-15 Parse failed | error | ☐ | ☐ |
| A | A-16 Password protected | error | ☐ | ☐ |
| A | A-17 Nothing found | empty | ☐ | ☐ |
| A | A-18 Ready for review | success | ☐ | ☐ |
| B | B-01 Name mismatch | validation | ☐ | ☐ |
| B | B-02 Conflict decision | default | ☐ | ☐ |
| B | B-03 Summary | success | ☐ | ☐ |
| B | B-04 Undone | success | ☐ | ☐ |
| B | B-05 Submission failed | error | ☐ | ☐ |
| B | B-06 Dismissed | derived | ☐ | ☐ |
| B | B-07 Stale entity | error | ☐ | ☐ |
| C | C-01 Empty | empty | ☐ | ☐ |
| C | C-02 Processing | loading | ☐ | ☐ |
| C | C-03 Stored | success | ☐ | ☐ |
| C | C-04 Pending review | success | ☐ | ☐ |
| C | C-05 File unavailable | error | ☐ | ☐ |
| D | D-01 Step active | default | ☐ | ☐ |
| D | D-02 Step complete | success | ☐ | ☐ |
| D | D-03 Step skipped | empty | ☐ | ☐ |
| V | V-01 … V-12 | derived | ☐ | ☐ |
| X | X-01 … X-04 | disabled | ☐ | ☐ |
| P | Permission gate, six viewer types | permission | ☐ | ☐ |

**Totals — 33 machine states, 12 derived view states, 4 disabled states, 6 permission resolutions.**

### 15.1 Required suites

| Suite | Assertion |
|---|---|
| **Status distinctness** | All eleven Domain A failure and outcome states render distinguishable copy and treatment |
| **Dismissal safety** | Every dialog's dismissal path resolves to its documented target and performs no write or delete |
| **Cross-surface parity** | The full **intake and failure** suite passes identically on S1 and S3. Domain B assertions apply to S3 only |
| **Onboarding has no dialogs** | A successful parse on S1 produces no name-mismatch, conflict or summary dialog, and steps 2–6 arrive pre-filled |
| **Permission absence** | The card is absent for all five non-owner viewer types, with no residual layout |
| **Durability** | Refresh, tab close and session loss produce the documented outcome in §13 |
| **Precedence** | Colliding conditions resolve per §12 |

---

## 16. Out of scope

| Item | Status |
|---|---|
| Re-import from an already-stored file — a `C-03` sub-action | Fast-follow, RU-513 |
| Multiple stored resumes — a list state in Domain C | Future, RU-512 |
| Visible skill provenance — a derived view state | Excluded in v1, RU-409 |
| Email notification on async completion | Future, RU-403 |
| Platform account-deletion retention | Platform-level, RU-510 |
| Lower-cost extraction model evaluation | Post-launch, RU-807 |

---

## 17. Blocked on design

Two states have defined behaviour but no approved copy, and cannot ship without it.

| State | Category | Blocks | Owner |
|---|---|---|---|
| `A-13` Rate limited | error | Phase 1 | Design |
| `A-16` Password protected | error | Phase 2 | Design |
