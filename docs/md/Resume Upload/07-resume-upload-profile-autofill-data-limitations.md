# 07 — Resume Upload & Profile Autofill · Data Limitations

> **Updated 22 July 2026.** Confirmed decisions cascaded from the Overview Docs.
>
> - **§2.2** — `job_titles[]` added with order significance called out; "desired work / project types" removed as an invented field.
> - **§2.2** — the response shape is now stated as fixed and closed; a key outside the set is a contract defect.
> - **§2.4** — job title slots now described as *most recent title only, into one empty slot*.
> - **§15** — **C-11 added**: a resume with several titles yields one written title, and the response order must not be re-sorted.
> - **R-07 and R-08** scoped to the profile path.
> - **Correction, same day:** §2.2 reworded. A response key outside the table is **no longer** treated as a contract defect — only a shape mismatch, or a key matching no field at all, is.
> - **§5.0 added** — save-then-flag validation, the edit-mode-only visibility table, and the fixed order of operations. Validation sets a flag; it never removes an entry.
> - **V-02 and V-05** — skills cap corrected to the profile's own limit of 100.
> - **C-10 corrected** to match EC-204. Retention rules settled: 4 versions, 24 h / 30 d on deletion, `raw_result` purged on resolution or after 30 d.


**Parent epic:** Talent Profile
**Epic (this doc):** Resume Upload & Profile Autofill
**Audience:** Frontend engineering, QA, design QA.
**Sources of truth:** 01 — Feature List · 01a — Product Questions Register · 01b — CTO Answers & Decisions · 02 — User Stories · 03 — Acceptance Criteria · 04 — Frontend Specs · 05 — Edge Cases & Solutions · 06 — Frontend State Management · `user-service` Resume Upload & Profile Autofill · `resume-parsing-service` Doc 00.

**Purpose.** Define every data constraint the frontend must survive. What may be absent, what arrives late, what goes stale, what is derived rather than stored, and what the frontend must never assume. This is the contract that prevents the class of defect where a resume with an unusual layout produces "undefined" on a talent's public profile.

**Framework-agnostic.** No markup, styling, or framework specifics.

---

## 1. The governing frame

**Extracted resume data is a fundamentally different class of data from everything else on the profile.**

| Property | Talent-entered data | Extracted resume data |
|---|---|---|
| Origin | The talent, deliberately | A statistical model reading an arbitrary document |
| Completeness | Enforced by form validation | Arbitrary — any field may be absent |
| Structure | Guaranteed by the form | Best-effort |
| Correctness | The talent's own assertion | Probabilistic, with a confidence score |
| Trust | Trusted for rendering | **Untrusted. Escaped at every render point** |
| Failure mode | Validation catches it | Reaches the interface unless the frontend catches it |

Every rule in this document follows from that distinction. The frontend must treat every extracted field as **optional, malformed, hostile, or absent** until proven otherwise — and must never let a parsing artefact reach a rendered surface.

### 1.1 Principles

| # | Principle | Consequence |
|---|---|---|
| **DP1** | **Assume absence.** Every extracted field may be missing. No render path may require one. | §4, §5 |
| **DP2** | **Never render an artefact.** "undefined", "null", "NaN", "Invalid Date", "[object Object]" must be unreachable. | §14 |
| **DP3** | **Untrusted until escaped.** Extracted values are escaped at every render point, including tooltips and accessible names. | §13 |
| **DP4** | **Derived values are computed, never trusted from the wire.** Counts, dedup outcomes and completion percentages are recomputed, not echoed. | §11 |
| **DP5** | **Stale is worse than absent.** Where freshness cannot be guaranteed for a destructive decision, re-verify rather than proceed. | §7 |
| **DP6** | **Degrade, don't block.** A failed secondary dependency never blocks the primary flow. | §9, §10 |

---

## 2. Data inventory

Every data element in the epic, classified. Classification determines the handling rules in §3 to §12.

### 2.1 File and record data — owned by `user-service`

| Element | Class | Nullable | Notes |
|---|---|---|---|
| Resume record existence | Required | ✅ | Absence is the legitimate `C-01` empty state |
| Filename | Required when a record exists | ❌ | Talent-supplied via the OS; may be very long or non-Latin |
| File size | Required | ❌ | Used for validation display |
| MIME type | Required | ❌ | |
| Upload timestamp | System-generated | ❌ | Rendered as "Added on \<date\>" |
| Storage reference | System-generated, restricted | ❌ | **Never exposed to the interface** |
| Signed access URL | System-generated, ephemeral | ✅ | Short expiry. Regenerated per action |
| Version history | System-generated | ❌ | Not surfaced in v1 |
| Upload status | System-generated | ❌ | Drives Domain A |

### 2.2 Parse result — from `resume-parsing-service` via `user-service`

| Element | Class | Nullable | Notes |
|---|---|---|---|
| `document_type` | System-generated | ❌ | Not surfaced to the talent |
| `is_resume` | Required | ❌ | Gate input |
| `confidence` | Required | ⚠️ **Treat absence as failure** | Absent → fail closed to `A-14` *(EC-1008)* |
| `name` | Optional | ✅ | Absence is a **pass**, never a mismatch *(AC-509)* |
| `job_titles[]` | Optional | ✅ | **Only the first — most recent — title is ever used.** Order is significant: the response must preserve the resume's reverse-chronological order |
| `skills[]` | Optional | ✅ | May be empty, duplicated, or over-length |
| `work_experience[]` | Optional | ✅ | Any sub-field may be absent |
| `education[]` | Optional | ✅ | Any sub-field may be absent |
| `certifications[]` | Optional | ✅ | Issuer commonly absent |
| Parse timestamp | System-generated | ❌ | Drives staleness of a pending review |

**Not present in the response, by design:** `bio`, `location`, phone, email, postal address. The frontend must not render, request or accommodate these *(AC-1101, AC-1103, AC-1106)*.

**The table above is illustrative, not a whitelist.** Extraction fills any existing `user-service` field a resume can supply, including fields not enumerated in these docs. **A response key outside the table is not, by itself, a contract defect** — it is expected wherever the data model has a field this document has not caught up with. What *is* a defect is a value whose **shape** does not match its field, or a key corresponding to no field at all *(ER-13xx)*.

Adding a field remains a schema change owned by the `user-service` data model. Extraction never originates one.

### 2.3 Entity sub-fields — all optional

| Entity | Sub-field | Nullable | If absent |
|---|---|---|---|
| Work experience | Job title | ✅ | Entity discarded if company also absent *(EC-202)* |
| | Company | ✅ | Entity discarded if title also absent |
| | Start date | ✅ | **Cannot match — treated as an addition** *(EC-209)* |
| | End date | ✅ | Renders as ongoing or blank. Never "undefined" |
| | Description | ✅ | Omitted from render |
| Education | Institution | ✅ | Entity discarded if degree also absent |
| | Degree | ✅ | Renders with what exists |
| | Field of study | ✅ | Omitted from the identifying detail |
| | Dates | ✅ | Omitted |
| Certification | Name | ✅ | Entity discarded if absent — nothing identifies it |
| | Issuing body | ✅ | Renders name alone *(EC-907)* |
| Skill | Name | ✅ | Entity discarded if absent |

### 2.4 Profile data — read for comparison, written by autofill

| Element | Class | Written by this epic? |
|---|---|---|
| Skills | Dependency + written | ✅ Deduplicated, capped at 20 |
| Work experience | Dependency + written | ✅ Uncapped |
| Education | Dependency + written | ✅ Uncapped |
| Certifications | Dependency + written | ✅ Uncapped |
| Job title slots (max 3) | Dependency + written | ✅ **Most recent title only, into one empty slot** |
| Rate per slot | Read only | ❌ Never written |
| Account name | Dependency | ✅ **S1 only** — seeded, never overwritten on S3 |
| Verified legal name | Restricted dependency | ❌ **Never written by this epic** |
| Bio | — | ❌ Never read, never written |
| Location | — | ❌ Never written |

### 2.5 Cross-service data

| Element | Source | Class | On failure |
|---|---|---|---|
| Case-study skill associations | `portfolio-service` | Dependency, degradable | Deduplicate against profile skills only, proceed *(EC-703)* |
| Verified legal name | Identity verification | Restricted dependency | Matching proceeds against the account name |
| Pre-profile auth token | `auth-service` | Required on S1 | Recoverable upload error, never a sign-in prompt *(EC-404)* |
| Async completion notification | Notifications | Optional accelerator | Card re-entry prompt is the durable path *(EC-705)* |

### 2.6 Derived values — computed, never trusted from the wire

| Value | Derived from | Rule |
|---|---|---|
| Group counts in the summary | Rendered items, post-dedup and post-cap | Must equal what is rendered *(AC-602)* |
| De-duplicated skill set | Parse result ∪ profile ∪ case-study associations | Order of operations fixed *(EC-205)* |
| Conflict set | Match rule against existing entries | Recomputed, never cached across a refresh |
| Name match outcome | Fuzzy comparison | Recomputed per upload |
| Profile completion percentage | Checklist step states | Recomputed after every import *(AC-1202)* |
| "N steps left" | Checklist step states | Recomputed |
| Same-job collapse | Company + title + start date | Applied before render *(V-07)* |

---

## 3. Required data

Data without which a surface cannot render. Each has a defined fallback — **none may produce a blank screen or a crash**.

| # | Required for | Data | If absent |
|---|---|---|---|
| **R-01** | Resume card, `C-03` | Resume record | Render `C-01` empty state. Legitimate, not an error |
| **R-02** | Resume card, `C-03` | Filename | Render a neutral placeholder label. Never blank, never "undefined" |
| **R-03** | Resume card, `C-03` | Upload timestamp | Omit the "Added on" line entirely. Do not render a partial or malformed date |
| **R-04** | View or download | Signed URL | Render `C-05` with a retry. **Never degrade to `C-01`** |
| **R-05** | Classification gate | `is_resume` and `confidence` | Absent or unparseable → fail closed to `A-14` *(EC-1008)* |
| **R-06** | Name matching, S3 | Account name | If no account name exists, **skip the check entirely** — matching is only defined where a name exists |
| **R-07** | Conflict dialog *(profile only)* | At least one conflict | If the recomputed conflict set is empty, **do not open the dialog**. Proceed to the summary |
| **R-08** | Summary *(profile only)* | At least one change | If nothing was added and nothing updated, render the "nothing changed" variant *(V-11)*. Not applicable at onboarding — no summary is shown |
| **R-09** | Onboarding step | Step index and total | Render the uploader regardless. Navigation must never depend on step metadata |
| **R-10** | Any conflict row | An identifying value on the existing entry | If the existing entry cannot be identified, exclude it from the dialog rather than render an unlabelled row |

### 3.1 The blank-screen rule

No absent data anywhere in this epic may produce an empty surface. Every path terminates in either a rendered state or a defined empty state from Doc 06. If a required value is missing and no fallback in this table applies, render the nearest defined empty state and log it — **never render nothing**.

---

## 4. Optional data

Data that is routinely absent. Absence is normal and must never be treated as an error.

| # | Data | Frequency of absence | Handling |
|---|---|---|---|
| **O-01** | Extracted name | Common — names in graphics, headers, unparsed regions | **Pass.** No warning, no dialog. Proceed *(AC-509, EC-506)* |
| **O-02** | End date on a role | Very common — current roles | Render as ongoing or blank. Never "Present" unless extracted as such |
| **O-03** | Start date | Occasional | Entity imports but **cannot participate in matching** — treated as an addition *(EC-209)* |
| **O-04** | Field of study | Common | Omit from the identifying detail. Institution and degree suffice |
| **O-05** | Certification issuer | Very common | Render the name alone *(EC-907)* |
| **O-06** | Company on a role | Occasional — freelance and self-employed entries | Render title alone if present. Cannot match — treated as an addition *(EC-908)* |
| **O-07** | Job description text | Common | Not rendered in the summary or conflict dialog regardless |
| **O-08** | Any single entity array | Common | Omit that group entirely. **Never render an empty section with a heading** *(V-01)* |
| **O-09** | All entity arrays | Occasional | → `A-17` `nothing_found`. File still stored |
| **O-10** | Case-study skill associations | On dependency failure | Deduplicate against profile skills only *(EC-703)* |

### 4.1 Optionality is not partiality

An **absent** field is optional and handled above. A field present but **empty or meaningless** — an empty string, whitespace, a single punctuation mark — is partial data and is discarded per §5. The frontend must normalise empty-equivalent values to absent before applying any rule in this section.

---

## 5. Partial data

Entities that arrive with some fields but not enough to be useful.

### 5.0 The validation rule — save it, then flag it

**Extracted entries are always saved. An entry that fails field validation is saved and flagged, not discarded.**

Every extracted entity is checked against the **same field rules the manual entry form applies**. The check does not decide whether to save — it decides whether to flag.

| Situation | Outcome |
|---|---|
| Passes validation | Saved. No flag |
| **Required field missing or invalid** | **Saved and flagged** |
| Optional field filled | Saved. No flag |
| **Optional field empty** | **Saved. No flag** — an empty optional field is not a problem |
| No identifying value at all | Discarded *(§5.1)* — there is nothing to save and nothing to flag |

**Where the flag appears: edit mode only.** A small error state on the affected entry, under the work history row, the certification, or whichever entry it belongs to. It marks the field that needs attention so the talent can fix it in place.

**Where it must never appear:**

| Surface | Flag |
|---|---|
| Edit mode | ✅ Shown |
| The talent's own profile view | ❌ Never |
| Marketplace and search | ❌ Never |
| Client-facing profile | ❌ Never |
| View as Client | ❌ Never |
| Summary dialog | ❌ Never — it is a receipt, not an editor |
| Conflict dialog | ❌ Never |

**Why save rather than discard.** Discarding loses real work history over a missing date and gives the talent nothing to act on. Saving with a flag keeps the data, keeps it out of sight of clients, and puts the fix exactly where the talent is already working.

**The flag clears when the field is filled.** It is a state of the entry, not a permanent mark, and it carries no memory of having come from a resume.

### 5.1 The identifying-value rule

This is the floor beneath §5.0, and it applies even where a form is permissive. **An entity must carry at least one identifying value or it is discarded before it reaches any surface.**

| Entity | Minimum to survive |
|---|---|
| Work experience | Job title **or** company |
| Education | Institution **or** degree |
| Certification | Name |
| Skill | Name |

Discarding — under §5.0 or §5.1 — happens **before** counting, before de-duplication, and before conflict matching. A discarded entity never appears in a count, a summary, a conflict row, or the profile *(EC-202)*.

**Order of operations:** identifying-value check → de-duplication → conflict matching → cap → save → validation check (sets the edit-mode flag) → count → render. Validation never removes an entry, so it cannot change a count.

### 5.2 Consequences of discarding

| Situation | Result |
|---|---|
| Some entities discarded, some survive | Normal import. Counts reflect survivors only |
| All entities in one group discarded | Group omitted *(V-01)* |
| **All entities across all groups discarded** | → `A-17` `nothing_found`. **File still stored** *(AC-307, AC-308)* |

### 5.3 Partial rendering rules

| Case | Rule |
|---|---|
| Entity survives with missing sub-fields | Render what exists. Omit the rest without placeholders |
| Date range partially present | Render the portion that exists. Never a half-formed range with a dangling separator |
| Value present but whitespace-only | Treat as absent |
| Value present but a single character or punctuation | Treat as present. Do not apply heuristics beyond emptiness — a one-character skill may be legitimate |

---

## 6. Delayed data

Data that is correct but not yet available.

| # | Situation | Delay | Frontend behaviour |
|---|---|---|---|
| **D-01** | Parse in progress, under 10s | Seconds | `A-07` inline processing indicator. One message, no fabricated stages *(AC-402)* |
| **D-02** | Parse exceeding 10s | Up to 30s | `A-08` async handoff. Talent released, in-app notification on resolution *(AC-403)* |
| **D-03** | Parse exceeding 30s | Terminal | One silent retry has already occurred. → `A-15` recoverable error. **Profile unchanged** *(AC-404)* |
| **D-04** | Parse resolved while the talent is elsewhere | Indefinite | → `C-04` pending review. Announced politely, **focus not moved** *(EC-1201)* |
| **D-05** | Notification delayed or lost | Indefinite | The card prompt is the durable path. Notification is an accelerator only *(EC-705)* |
| **D-06** | Signed URL generation slow | Seconds | Action-scoped loading indication. Do not block the whole card |
| **D-07** | Profile completion recalculation lags the import | Seconds | Recompute and render without requiring a page reload *(AC-1202)* |
| **D-08** | Case-study skill lookup slow | Seconds | Do not block the import. Apply a timeout and degrade per EC-703 |

### 6.1 The indefinite-wait prohibition

**No state may wait indefinitely.** Every loading state in Domain A carries a timeout that resolves to a defined outcome:

| State | Timeout | Resolves to |
|---|---|---|
| `A-05` uploading | Upload-level timeout | `A-09` *(EC-107)* |
| `A-06` scanning | Covered by the parse budget | `A-09` — fails closed *(EC-704)* |
| `A-07` parsing | 30s after one retry | `A-15` |
| `A-08` async handoff | 30s still applies | `A-15` *(EC-1006)* |
| `C-05` URL generation | Action timeout | Retry affordance |

---

## 7. Stale data

Data that was correct when read and is no longer correct now. **This is the highest-risk category in the epic**, because the conflict dialog makes destructive writes based on a snapshot the talent may have invalidated.

| # | Situation | Risk | Handling |
|---|---|---|---|
| **S-01** | Profile entry edited elsewhere while the conflict dialog is open | **Critical — silent overwrite of newer work** | Send an entity version with each decision. Server-reported mismatch → do not apply that row. → `B-07`, re-entry via `C-04`. Unaffected rows still apply *(EC-302)* |
| **S-02** | Profile entry deleted elsewhere while the dialog is open | **High — a write against a non-existent record** | Same version check. Exclude the row, report the change, re-enter review |
| **S-03** | Entry edited after import, then Undo pressed | **High — undo discards newer manual work** | Exclude modified entries from the reversal. Report the outcome plainly rather than claiming a complete reversal *(EC-606)* |
| **S-04** | Pending review resolved in another tab, notification actioned later | Medium — a stale dialog reopens | Re-read status on notification action. If already `applied`, `undone` or superseded, route to the profile *(EC-304)* |
| **S-05** | Conflict set computed, then the profile changed before the dialog rendered | Medium | The conflict set is recomputed at dialog open, never cached across a refresh *(DP4)* |
| **S-06** | Signed URL expired while the preview is open | Medium | Fail closed to `C-05` with a refresh action. Never a blank frame *(EC-309)* |
| **S-07** | Card rendered from a cached read after deletion elsewhere | Medium | Re-verify existence before any lifecycle action. Failure → `C-01` |
| **S-08** | Pending review that is very old | Low | Still valid. Age does not invalidate a parse result — but the conflict set is recomputed against the **current** profile, so an old result may produce a different conflict set than it would have originally. This is correct behaviour |
| **S-09** | Account name changed after import | Low | No retroactive effect. Matching runs only at upload time *(EC-502)* |

### 7.1 The freshness rule for destructive writes

**Any write that overwrites existing data must carry a freshness token.** The conflict dialog is the only destructive surface in this epic, and it must never apply a decision made against a stale snapshot.

Additive writes do not require this — an addition cannot destroy anything, so a stale read at worst produces a duplicate the conflict rule would have caught.

### 7.2 What is deliberately not restored

| Item | Why not |
|---|---|
| Conflict checkbox selections after a refresh | Restoring half-remembered destructive decisions is more dangerous than asking again *(EC-306)* |
| Undo availability after the summary closes | Undo is scoped to the dialog. A persistent window invites reversal of work done since *(AC-802)* |
| In-progress upload after navigation | No partial record exists to restore *(AC-1406)* |

---

## 8. Unavailable data

Data that cannot be retrieved at all.

| # | Unavailable | Impact | Frontend behaviour |
|---|---|---|---|
| **U-01** | Parse result — service down | Blocking | `A-15` recoverable error. **No vendor or service names in copy.** On S1, Skip and Continue remain enabled *(EC-701)* |
| **U-02** | File content — storage down | Action-scoped | `C-05`. **Card still renders the record** — metadata is valid, the file is not gone *(EC-702)* |
| **U-03** | Case-study skills — `portfolio-service` down | Degradable | Deduplicate against profile skills only. Import proceeds. A duplicated skill is a cosmetic defect; a blocked import is not acceptable *(EC-703)* |
| **U-04** | Virus scan — scanner down | Blocking, **fail closed** | Nothing stored, nothing parsed. `A-09` with retry. Security outranks convenience *(EC-704)* |
| **U-05** | Notification delivery | Degradable | Card prompt is the durable path *(EC-705)* |
| **U-06** | Confidence value absent from the response | Blocking, **fail closed** | → `A-14`. Never assume a passing score *(EC-1008)* |
| **U-07** | Account name — matching cannot run | Degradable | **Pass.** Never block on an unavailable check *(EC-1002)* |
| **U-08** | Locale or timezone | Degradable | Documented default format. Never a raw ISO string *(EC-1007)* |
| **U-09** | Pre-profile auth token, S1 | Blocking | Recoverable upload error with retry. **Never a sign-in prompt mid-onboarding** *(EC-404)* |

### 8.1 Fail-closed versus degrade

The distinction is whether proceeding could cause harm.

| Fail closed — block | Degrade — proceed |
|---|---|
| Virus scan unavailable *(U-04)* | Case-study skills unavailable *(U-03)* |
| Confidence absent *(U-06)* | Notification undeliverable *(U-05)* |
| Classification data unparseable *(R-05)* | Name matching unavailable *(U-07)* |
| Freshness token unavailable for a destructive write *(§7.1)* | Locale unavailable *(U-08)* |

**Rule of thumb.** Fail closed where proceeding risks storing malware, writing bad data over good, or admitting a non-resume. Degrade where the worst outcome is a cosmetic imperfection the talent can correct.

---

## 9. Permission-restricted data

| # | Data | Restricted from | Frontend behaviour |
|---|---|---|---|
| **P-01** | Resume file, filename, upload date, derived preview | **All clients**, on every client-facing surface | **Absent.** Not disabled, not empty — absent from the layout *(AC-1001)* |
| **P-02** | Entire Resume card | Owner in View-as-Client | Omitted. No residual spacing, heading or divider *(AC-1002, EC-802)* |
| **P-03** | Team member resumes | Team leads | Absent. Team context grants nothing *(EC-804)* |
| **P-04** | Any resume | Support without the restricted role | **Absent, not disabled.** A disabled control confirms the file exists *(EC-803)* |
| **P-05** | Storage reference / object key | Everyone, always | Never exposed to the interface in any form |
| **P-06** | Verified legal name | This epic's write paths | Readable for context; **never writable by a resume** *(AC-510)* |
| **P-07** | Skill provenance tags | The talent, in v1 | Stored, never surfaced. No badge, icon, tooltip or accessible-name mention *(AC-1305, AC-608)* |
| **P-08** | Parse confidence, `document_type` | The talent | Internal only. Never rendered |

### 9.1 Absence over disablement

Where data is permission-restricted, the correct treatment is **omission**, never a disabled or empty affordance. A greyed-out "Download resume" control tells a client that a resume exists. That is a disclosure, even though the file was never served.

### 9.2 Standing assertion

Client-facing absence is a continuous requirement, not a one-time implementation. Every new client-facing surface inherits it, and the test suite asserts absence across all of them *(EC-801)*.

---

## 10. Dependency-based data

Data owned elsewhere that this epic reads or is affected by. Listed only where it creates a direct frontend requirement.

| Dependency | Data | Direct requirement | Failure mode |
|---|---|---|---|
| `user-service` | Resume record, parse result, conflict set, sync audit | All frontend calls terminate here. Every Domain A and B state derives from its responses | Blocking — recoverable error |
| `resume-parsing-service` | Classification and extraction | **Never called directly by the frontend.** The frontend must render every outcome the gate can produce | Blocking via `user-service` |
| `portfolio-service` | Case-study skill associations | Skills associated through case studies count as existing for de-duplication | Degradable *(U-03)* |
| Identity verification | Verified legal name | This epic must never write it. The mismatch warning may still fire | Non-blocking |
| `auth-service` | Pre-profile token, S1 | Upload precedes profile existence | Blocking on S1 *(U-09)* |
| Notifications | Async completion delivery | Accelerator only | Degradable *(U-05)* |

### 10.1 The single-caller rule

The frontend calls `user-service` only. It never calls `resume-parsing-service`, never holds an extraction vendor credential, and never receives raw model output. Every parse outcome reaches the interface as a typed status from `user-service`.

---

## 11. Derived values

Values computed rather than stored. **Recompute; never trust an echoed value from the wire** *(DP4)*.

| # | Value | Computed from | Rule |
|---|---|---|---|
| **V-01** | Group counts | Rendered items after discard, dedup and cap | Must equal rendered items exactly. Correct singular and plural at N = 1 *(AC-602)* |
| **V-02** | De-duplicated skill set | Parse ∪ profile ∪ case-study associations | **Fixed order:** dedup within parse → remove existing → import remainder up to the profile's limit of 100, preserving returned order *(EC-205)* |
| **V-03** | Conflict set | Match rule against current profile | Recomputed at dialog open. Never cached across a refresh *(S-05)* |
| **V-04** | Same-job collapse | Company + title + **start date** | Applied before render. Entries lacking a start date cannot collapse *(V-07, O-03)* |
| **V-05** | Name match outcome | Fuzzy comparison, Unicode-normalised | Recomputed per upload. Never persisted *(EC-213)* |
| **V-06** | Profile completion percentage | Checklist step states | Recomputed after import, delete and undo. No page reload required *(AC-1202)* |
| **V-07** | "N steps left" | Checklist step states | Recomputed. "All Complete!" replaces the count at zero |
| **V-08** | Overflow threshold and "+ N more" | Group length | N equals items hidden, not total |
| **V-09** | Skills actually added | Post-dedup, post-cap set | The summary reports what was **added**, not what was **found** *(AC-607)* |

### 11.1 The count-integrity rule

A count that disagrees with what is rendered is a defect, not a rounding difference. Three operations sit between the parse result and the render — discard, deduplicate, cap — and every one changes the number. Counts are computed at the end of that chain, never at the start.

---

## 12. System-generated values

Values the talent never supplies and cannot edit.

| # | Value | Generated by | Frontend rules |
|---|---|---|---|
| **G-01** | Upload timestamp | `user-service` | Render in the **talent's** timezone and locale. Never a raw ISO string. Absent → omit the line entirely *(EC-310, R-03)* |
| **G-02** | Signed access URL | Storage layer | Ephemeral. Requested per action, never cached, never rendered as copyable link text *(EC-805)* |
| **G-03** | Resume record identifier | `user-service` | Internal. Never rendered |
| **G-04** | Storage object key | Storage layer | **Never exposed in any form** *(P-05)* |
| **G-05** | Version identifiers | `user-service` | Internal in v1. Used as the freshness token for destructive writes *(§7.1)* |
| **G-06** | Parse confidence | `resume-parsing-service` | Internal gate input. Never rendered. Absent → fail closed *(U-06)* |
| **G-07** | `document_type` | `resume-parsing-service` | Internal. Never rendered |
| **G-08** | Skill provenance tags | `user-service` | Stored, never surfaced in v1 *(P-07)* |
| **G-09** | Sync audit record | `user-service` | Powers Undo. Not rendered as a history view in v1 |
| **G-10** | Idempotency key | Frontend, per upload attempt | Reused across retries of the same file. Prevents duplicate records *(EC-108)* |

---

## 13. Data trust and sanitisation

Extracted values originate in an arbitrary document supplied by the talent and interpreted by a model. They are **untrusted input** *(DP3)*.

| # | Rule | Applies at |
|---|---|---|
| **T-01** | Escape all extracted values | Summary, conflict rows, profile, tooltips, **accessible names**, and any export |
| **T-02** | Never interpret extracted content as markup | Every render point *(AC-1410, EC-211)* |
| **T-03** | Never interpolate extracted values into a URL, query or identifier | All |
| **T-04** | Truncate for display, retain full value in data | All *(AC-1411)* |
| **T-05** | Force wrapping on unbroken strings | All *(EC-212)* |
| **T-06** | Normalise Unicode rather than stripping non-ASCII | Matching, dedup, sorting *(EC-213)* |
| **T-07** | Apply per-value directionality for RTL content | All rendering *(EC-213)* |
| **T-08** | Do not repair implausible values | Dates, ordering — render as extracted, let the talent correct *(EC-210)* |

### 13.1 The accessible-name trap

`T-01` extends to accessible names, and this is the most commonly missed application. A conflict row's accessible name is composed from extracted values — "Apply update to VP of Engineering at Android" — and unescaped content there is as much a defect as unescaped content on screen *(EC-1204)*.

---

## 14. Null, empty and malformed handling

The single reference table. **No value in the left column may ever reach a rendered surface.**

| Received | Interpretation | Render |
|---|---|---|
| `null` / absent | Absent | Omit the element. Never a placeholder |
| Empty string | Absent | Omit |
| Whitespace only | Absent | Omit |
| `"undefined"` / `"null"` as literal strings | Parsing artefact | Discard the field. Treat as absent |
| `NaN`, unparseable date | Malformed | Omit the date. **Never "Invalid Date"** |
| Empty array | No entities of that type | Omit the group *(V-01)* |
| All arrays empty | No usable content | → `A-17` `nothing_found`. **File still stored** |
| Object where a string was expected | Malformed | Discard the field. **Never "[object Object]"** |
| Number where a string was expected | Coercible | Render as a string |
| Value exceeding display length | Valid but long | Truncate for display, retain in data |
| Confidence absent | Malformed | **Fail closed** → `A-14` |
| Duplicate entities | Valid but redundant | Deduplicate before counting |
| Entity with no identifying value | Unusable | Discard before counting *(§5.1)* |

### 14.1 Required assertion

The strings `undefined`, `null`, `NaN`, `Invalid Date` and `[object Object]` must be unreachable in any rendered surface of this epic. This warrants a standing test assertion across the summary, conflict dialog, resume card and the profile sections this epic writes to.

---

## 15. Consistency rules

Where the same fact is represented in more than one place, these define which wins.

| # | Inconsistency | Resolution |
|---|---|---|
| **C-01** | Summary count disagrees with rendered items | Rendered items are correct. The count is a defect *(V-01)* |
| **C-02** | Card shows a file, storage cannot serve it | Both are true. Metadata is valid; the file is temporarily unreachable. → `C-05`, not `C-01` *(U-02)* |
| **C-03** | Checklist says complete, no resume on the card | Card state wins. Recompute the checklist *(AC-1201)* |
| **C-04** | Profile shows an entry the sync audit says was undone | Profile state wins. The audit is a record, not a source of truth for render |
| **C-05** | Extracted name differs from the verified legal name | Verified name wins as the name of record. The resume never writes it *(AC-510)* |
| **C-06** | Extracted location differs from the profile location | Profile wins. Location is never written *(AC-1103)* |
| **C-07** | Resume title differs from a filled job title slot | Profile wins. Filled slots are never overwritten *(AC-1105)* |
| **C-11** | Resume lists several job titles | Only the most recent is used. Order in the parse response is significant and must not be re-sorted *(AC-1104)* |
| **C-08** | Skill present on the profile and in the parse result | Profile wins. The skill is not re-added *(AC-606)* |
| **C-09** | Same job, different end dates | One record. The resume version updates the end date *(V-04)* |
| **C-10** | Two profile entries both match one extracted entry | **Neither is touched.** An ambiguous match is not a match — the extracted entry is added as a new record and no conflict row is shown. Never resolve ambiguity into a destructive write *(EC-204)* |

---

## 16. QA data fixtures

Fixtures required to exercise the constraints in this document, beyond the twenty in Doc 03 §15.

| Fixture | Exercises |
|---|---|
| Parse result with every optional field absent | §4, §5 — entity discard and group omission |
| Parse result with all entities lacking identifying values | §5.2 — `nothing_found` with a stored file |
| Parse result with `confidence` absent | U-06 — fail closed |
| Parse result with literal `"undefined"` string values | §14 — artefact discard |
| Parse result with an object where a string is expected | §14 — no `[object Object]` |
| Parse result with a 400-character title and an unbroken 200-character token | T-04, T-05 |
| Parse result containing markup in a value | T-01, T-02, and the accessible-name path |
| Parse result in Arabic and in Japanese | T-06, T-07 |
| Parse result with 28 skills, 9 pre-existing | V-02 — dedup then cap ordering |
| Entry with no start date | O-03 — treated as an addition, not a conflict |
| Two profile entries matching one extracted entry | C-10 |
| Profile mutated between dialog open and confirm | S-01 — freshness token path |
| Entry modified after import, then Undo | S-03 — exclusion from reversal |
| Storage unavailable on view | U-02 — `C-05`, card record retained |
| `portfolio-service` unavailable during dedup | U-03 — degrade and proceed |
| Virus scanner unavailable | U-04 — fail closed |
| Expired signed URL with the preview open | S-06 |
| Missing upload timestamp | R-03 — line omitted |
| Locale unavailable | U-08 — documented default |

---

## 17. Out of scope

| Item | Status |
|---|---|
| Version history surfaced to the talent | Stored, not rendered in v1 — G-05 |
| Sync audit rendered as a change history | Powers Undo only in v1 — G-09 |
| Skill provenance surfaced in the UI | Excluded in v1 — P-07 |
| Multiple stored resumes | Future — RU-512 |
| Re-import from a stored file | Fast-follow — RU-513 |
| Platform account-deletion retention | **Settled** — 24 h production, 30 d backups; 4 most recent versions, no time expiry; `raw_result` purged on resolution or after 30 d — RU-510, RU-510a, RU-510b |
| DPA and compliance posture for extraction | Compliance documentation |
