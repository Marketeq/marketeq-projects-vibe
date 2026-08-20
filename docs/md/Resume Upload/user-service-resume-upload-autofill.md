# user-service — Resume Upload & Profile Autofill

> **Updated 22 July 2026.** Confirmed decisions cascaded from the Overview Docs.
>
> - **Field scope rewritten.** Extracted set is fixed and closed; extraction never introduces a field. Profile path and onboarding path now stated separately.
> - **Job title rule changed:** the **most recent title only**, into a single empty slot — not multiple slots filled in order.
> - Bio, location and contact details confirmed excluded on both paths.
> - **Correction, same day:** field scope reworded — the six-field list is illustrative, not a whitelist. Validation rule added: entries are always saved, required-field failures are flagged, and the flag shows in edit mode only.
> - Skills import cap removed — fills to the profile's own limit of 100.


**Service:** `user-service` (existing — this is a feature addition, not a new service)
**Doc number:** _next available in the `user-service` series — confirm against existing docs._
**Purpose:** Own the resume file, its lifecycle, and the autofill of profile data extracted from it, including the add-vs-replace decision and undo.
**Owners:** _Backend — Profile/Onboarding pod (confirm)._

---

## 1) Purpose & Why This Lives Here

Work experience, education, skills, bio, and job title all persist on the **user profile, owned by `user-service`**. `portfolio-service` holds case studies only (with skills optionally associated to a case study) — it has no work-experience or education entities.

Because nearly every write the autofill performs lands in `user-service`, the feature lives here. A standalone resume service would have been a middleman calling `user-service` for everything.

**The one part that is NOT here:** document extraction, which lives in the thin, stateless **`resume-parsing-service`** (see its Doc 00). That isolates an external LLM dependency from the core identity service.

```
frontend ──▶ user-service ──▶ resume-parsing-service ──▶ LLM
                  │  (owns file, metadata, autofill, undo)
                  └──▶ R2 (file) + Postgres (metadata, audit)
```

## 2) Responsibilities

- **Intake & validation** — `PDF, DOC, DOCX`, max **5MB**.
- **Storage** — file in Cloudflare R2; metadata + versions in Postgres (service-scoped schema).
- **Call `resume-parsing-service`** and handle its result, including **rejection** when the document isn't a resume.
- **Add-vs-replace orchestration** — compare extracted entities to existing profile data, classify each as add or conflict.
- **Apply, undo, and audit** the sync.
- **Lifecycle** — view, download, replace, delete.

## 3) Entry Points

Two surfaces, one engine:

- **Onboarding** — `STEP 1 / 6 — Upload your resume`, after "Seeking Hire or Work," so parsed data pre-fills later onboarding steps. Skippable.
- **Profile page** — sidebar **Resume** card: Upload/Update, View, Download, Replace, Delete.

## 4) Data Model (detail in the DTO/model doc)

- `resume` — one current resume per user: `user_id`, `filename`, `size`, `mime_type`, `r2_key`, `uploaded_at`, `current_version_id`.
- `resume_version` — upload/replace history, so Replace doesn't destroy the audit trail.
- `parse_result` — the structured output returned by `resume-parsing-service` for a version.
- `sync_audit` — what was added / replaced / kept, and when. Powers **Undo**.

## 5) Add-vs-Update Semantics

For each extracted entity:

1. **No matching existing entry → Add.** Applied immediately — an addition cannot destroy anything. Reported in the "Resume Upload Complete" summary under its group.
2. **Matching existing entry (work history / education / certification) → Conflict.** Routed to the **"Update Current Information?"** dialog, where each conflicting row carries its own **Apply Update** checkbox (all checked by default). **Yes, Update** applies checked rows only; **Keep Existing** — and any dismissal (escape, click-outside, ✕) — applies none.
3. **Undo Changes** reverses the whole applied sync (replay `sync_audit` in reverse). Available only while the summary dialog is open; there is no persistent undo window.

**Match key.** Work: normalized company + title + **start date**. Same start date means the same job, so a changed end date is an update to that record, not a competing entry. Education: institution + degree + field. Normalization is case-insensitive and strips punctuation and common suffixes (Inc., LLC).

**Screen order.** When one parse produces both conflicts and additions, the conflict dialog resolves first; the summary then reports the complete outcome.

**Field scope.** **Fill any existing field a resume can supply. Never originate one.** Known at time of writing: `name`, `job_titles[]`, `skills[]`, `work_experience[]`, `education[]`, `certifications[]` — **illustrative, not a whitelist.** Onboarding and the profile model contain fields not enumerated in these docs; any of them a resume can populate should be populated. What is prohibited is causing a schema change.

- **Profile path** writes skills, work experience, education, certifications, plus **the most recent job title into one empty slot** (max three title/rate pairs, never overwriting). The account name is never written here.
- **Onboarding path** pre-fills every extracted field on its matching step. Nothing is held back — nothing exists to overwrite.
- **Never written on either path:** bio (hand-authored), location (drives timezone and rates). Contact details are not extracted at all.

**Validation.** Extracted entries are **always saved**. Each is checked against the same field rules the manual entry form applies; where a **required** field is missing or invalid the entry carries a validation flag. Empty **optional** fields are never flagged. Validation sets a flag — it never removes an entry, and never changes a count. The flag surfaces in **edit mode only**; it is absent from the profile view, marketplace and search, every client-facing surface, and both review dialogs.

Entity typing must stay strict: work → work, education → education, certification → certification. _(The mockup previously swapped the dialog's section labels; this has been corrected in the designs. The backend contract was always correct and is unaffected.)_

**Delete** removes the file and metadata and **cannot be undone**. It does **not** roll back profile fields previously autofilled from it.

## 6) UI States the API Must Support

Dropzone / file item: **Default · Hover · Disabled · Uploading (progress %) · Uploaded (chip + `Added on <date>` + Replace) · Upload failed · File size exceeded · Unsupported file type · Not a resume · Password-protected · Nothing found.**

Sync outcome: **"Resume Upload Complete"** (grouped add counts, Undo Changes / Looks good!) and **"Update Current Information?"** (per-row Apply Update checkboxes, Keep Existing / Yes, Update).

Identity: **name-mismatch warning** on the profile path only.

Re-entry: **pending review** prompt on the Resume card when a parse completed but was never resolved.

### Content-rejection states the API must distinguish

| State | Cause | User action |
|---|---|---|
| Unsupported file type | Wrong extension (e.g. `.png`) | Convert / choose a different format |
| **Not a resume** | Valid PDF/DOC/DOCX, wrong content, or confidence below 0.7 | Upload a different **document** |
| **Password-protected** | Encrypted document, text unreadable | Remove protection, re-upload |
| **Nothing found** | Valid resume, no extractable entities | File is kept; fill the profile manually |

Each needs its own error code and its own entry in the component set.

## 7) Settled Decisions Affecting This Service

1. **Skills de-duplication.** Dedup key is the normalized, case-insensitive skill name. Dedup runs against the incoming list **and** the user's existing canonical skills. `portfolio-service` case-study skills are associations to that same canonical list, so they resolve through it. **No import-specific cap** — imported skills fill up to the profile's own limit of **100**. Work, education and certifications import in full.
2. **Onboarding failure branch.** Every onboarding step is skippable, including step 1. Upload and parse failures surface the same error states as the profile path and leave the user free to Skip or Continue with manual entry.
3. **Onboarding auth model.** Upload occurs before the profile fully exists — a pre-profile token model is required. Confirm the shape with `auth-service`.
4. **Undo retention.** Lives and dies with the summary dialog. No persistence.
5. **Loading copy.** One honest message. No staged progress, and **no reference to updating the Bio**. Under 10s inline; beyond 10s, async with in-app notification.
6. **Name matching.** No check during onboarding (the resume seeds the name). On the profile path, loose fuzzy match against the account name — warn, never block.
7. **Retention.** Resume files follow the platform account-deletion retention policy.
8. **Access control.** Private signed URLs only. Resume is hidden from clients entirely, including *View as Client*. Support access is break-glass under a restricted role, fully logged.

## 8) Next Docs

- Data models & DTOs (entities in §4).
- API endpoints — upload, resume CRUD, sync confirm/undo, guards, error shapes, the states in §6.
- Integrations & events — R2, `resume-parsing-service` contract, RabbitMQ events, upload→parse→sync sequence diagram.
- QA & test data — including a **contract fixture that must be rejected**.
