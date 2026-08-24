# 01 — Resume Upload & Profile Autofill · Feature List

> **Updated 22 July 2026.** Confirmed decisions cascaded from the Overview Docs.
>
> - **RU-305** — extraction schema is now a fixed, closed set of six existing fields. Extraction never introduces a field.
> - **RU-401** split into RU-401 (onboarding: everything pre-fills its step), **RU-401a** (profile: restricted set) and **RU-401b** (standing exclusions).
> - **RU-402** — job title is now **most recent only, into one empty slot**. Older resume titles are never used.
> - §9 — privacy disclosure removed from remaining design work; the design's existing notice stands.


**Parent epic:** Talent Profile
**Feature:** Resume Upload & Profile Autofill
**Owning service:** `user-service` (file, metadata, autofill, lifecycle)
**Supporting service:** `resume-parsing-service` (extraction only — referenced where it creates a direct requirement)
**Sources of truth:** Figma designs, flow diagrams, Marketeq Core Backend Technical Architecture Overview, Doc 00s for `user-service` (resume feature) and `resume-parsing-service`, CTO decisions log (01b).
**Status:** Consolidated. All product decisions settled — see 01b.
**Purpose:** Enumerate every capability, workflow, state, and responsibility this feature must support, as the foundation for user stories, acceptance criteria, and frontend technical documentation.

> **Scope note:** This is a **talent feature.** Clients do not upload resumes. An account can hold both client and talent modes, but the resume lives on the talent profile and appears nowhere in client mode — for the same reason nothing else from the talent profile does.
>
> Skills, portfolio, verification, rate, and other Talent Profile capabilities are siblings within the same epic and are **out of scope** here except where resume autofill writes into them.
> - **Correction, same day:** RU-305 and RU-401 reworded — the field list is illustrative, not a whitelist. Fill any existing onboarding or profile field the resume supplies; never originate one.
> - Scope note now states plainly that this is a **talent feature** — clients do not upload resumes.
> - **RU-409a and RU-409b added** — extracted entries are always saved; entries failing **required**-field validation are flagged, and the flag shows in **edit mode only**.
> - **RU-408 corrected** — the 20-skill import cap is removed. Imported skills fill up to the profile's own limit of 100; no import-specific cap exists.
> - **RU-510 settled**, plus RU-510a/b/c — version count, deletion timelines, parse-result purge, and why recruitment retention clocks do not apply.

---

## 1. Entry Points

Four surfaces initiate or expose this feature. All share one engine.

| ID | Feature | Description |
|---|---|---|
| **RU-101** | Onboarding upload step | `STEP 1 / 6 — Upload your resume` — "Add your resume to complete your profile faster!" Appears after the user chooses *Seeking Hire or Work*, so extracted data can pre-fill later onboarding steps. |
| **RU-102** | Onboarding step navigation | **Back**, **Skip**, and **Continue** controls. Every onboarding step is skippable, including this one. Skipping must leave onboarding fully completable by manual entry. |
| **RU-103** | Profile prompt modal (empty/temp state) | *"Complete Profile with Resume"* — "Upload your resume to quickly complete your profile. It stays private and is only used to autofill your information." Dismissible via **Not Now** and **✕**. |
| **RU-104** | Profile sidebar Resume card (permanent state) | Always-available card on the profile: *"Add your resume to complete your profile faster."* Hosts upload and the full file lifecycle (§5). |
| **RU-105** | Profile completion checklist | *"Complete your profile to get hired by top clients"* modal lists **Upload Resume** as a step with **Finish This Step** → green check; header shows remaining count (*"3 steps left"* → *"All Complete!"*). |
| **RU-106** | Client-facing suppression | The Resume card is **hidden entirely** in *View as Client* and in every client-facing rendering of the profile. The resume is never shown to clients and never attached to applications. |
| **RU-107** | Pending-review re-entry | If a parse completed but the user left before resolving it, the Resume card surfaces a re-entry point: *"We found details in your resume. Review them."* |

## 2. File Intake & Validation

| ID | Feature | Description |
|---|---|---|
| **RU-201** | Drag & drop upload | Drop a file onto the dropzone. |
| **RU-202** | File picker upload | *"Drag & drop or **Choose File** to upload."* |
| **RU-203** | Format validation | Accept **PDF, DOC, DOCX** only. |
| **RU-204** | Size validation | Maximum **5MB**. |
| **RU-205** | Upload progress | Live progress on the file item — e.g. `200 KB – 70% uploaded` with spinner. |
| **RU-206** | Retry affordance | **Try again** on every failure state. |
| **RU-207** | Privacy disclosure | *"Your resume is private and is only used to fill in your profile. It is never shown to clients or shared for marketing."* + **Privacy Policy** link. **Copy updated** — the previous "not shared with any third parties" wording was inaccurate given third-party extraction processing. |
| **RU-208** | Pre-save preview | Modal renders the uploaded document with **Cancel** / **Save Resume** before commit. |
| **RU-209** | Accessible dropzone | Keyboard-operable and screen-reader labelled; drag & drop is never the only path. |
| **RU-210** | Upload rate limiting | Per-user hourly upload cap, surfaced as a friendly limit message rather than a generic failure. |

### 2.1 Dropzone & File Item States

| State | Trigger | Copy / behavior |
|---|---|---|
| Default | Idle | Dropzone with icon, instructions, format + size hint |
| Hover / drag-over | Pointer or file over target | Highlighted border + fill |
| Disabled | Upload not permitted | Muted, non-interactive |
| Uploading | Transfer in progress | Filename, size, `% uploaded`, spinner |
| Uploaded | Success | File chip: filename, *Added on \<date\>*, **Replace** |
| Upload failed | Network/server error | *"Upload failed, please try again."* + **Try again** |
| File size exceeded | > 5MB | *"Uploaded file exceeds the size limit of 5MB. Please select a different file."* |
| Unsupported file type | Wrong extension | *"Unsupported file type. Only PDF, DOC, and DOCX files are accepted."* |
| **Not a resume** | Valid file, wrong content | *"This doesn't look like a resume. Please upload your resume — we couldn't find work history or education in this file."* Distinct from *Unsupported file type*. See **RU-303**. |
| **Password-protected** | Encrypted document | Dedicated message instructing the user to remove protection and re-upload. Never a generic upload failure. |
| **Nothing found** | Valid resume, no extractable entities | *"We couldn't pull any details out of this file. You can still fill in your profile yourself."* File is still saved. |

## 3. Extraction & Document Validation

Delivered by `resume-parsing-service`; listed here because each creates a direct requirement on this feature.

| ID | Feature | Description |
|---|---|---|
| **RU-301** | Text extraction | Deterministic text extraction from PDF/DOC/DOCX prior to model call. |
| **RU-302** | Scanned-document fallback | If extracted text is near-empty (image-only resume), send the document itself to the model. |
| **RU-303** | Document-type classification gate | Confirm the document **is a resume** before any profile data is touched. Rejects contracts, invoices, and other valid-but-wrong documents. Returns `document_type`, `is_resume`, `confidence`. |
| **RU-304** | Confidence threshold | **0.7.** Below threshold → treat as rejection ("Not a resume"), not a low-quality autofill. Tunable after the first 100 production uploads. |
| **RU-305** | Structured extraction | **Fill any existing `user-service` field a resume can supply. Never introduce one.** Known at time of writing: `name`, `job_titles[]`, `skills[]`, `work_experience[]`, `education[]`, `certifications[]` — **illustrative, not a whitelist.** Onboarding and the profile model contain fields not enumerated in this doc; any of them a resume can populate should be populated. What is prohibited is originating a field — extraction never causes a schema change. **Bio, location and contact details are never extracted regardless.** |
| **RU-306** | Extraction failure handling | Timeout (30s hard limit, one automatic retry), vendor error, or malformed output must surface a recoverable state, never a partial profile write. |
| **RU-307** | Language tolerance | Non-English resumes parse successfully where the model supports it. Not advertised until validated. |
| **RU-308** | Virus scanning | Every file scanned before storage or parsing. |

## 4. Profile Sync & Autofill

| ID | Feature | Description |
|---|---|---|
| **RU-401** | Autofilled field set — onboarding | **Every extracted value pre-fills the onboarding field it belongs to.** Nothing is held back, because nothing exists to overwrite. This includes onboarding fields not enumerated in this document — if the field exists and the resume supplies it, fill it *(RU-305)*. Job title follows RU-402 — most recent only. Fields the resume did not supply are left empty for the talent to complete. |
| **RU-401a** | Autofilled field set — profile | **Skills**, **Work Experience**, **Education**, **Certifications**, plus **the most recent job title into one empty slot** (RU-402). The account name is never written on this path. |
| **RU-401b** | Standing exclusions, both paths | **Bio** — always hand-written. **Location** — drives timezone and rates. **Contact details** — not extracted at all. |
| **RU-402** | Job title fill rule | The profile supports up to **three job title + rate pairs**. **Only the most recent job title from the resume is used, and only into one empty slot.** Never overwrites an existing title or its rate. If all three slots are filled, no title is written. Older titles from the resume are never used — they belong to work history, not to the talent's current positioning. |
| **RU-403** | Processing feedback | **One honest message** while parsing — no fabricated multi-stage progress. Under 10s: inline loader. Over 10s: asynchronous with in-app notification on completion. |
| **RU-404** | Add-vs-conflict classification | For each extracted entity: no match → **Add** (applied); match against existing profile entry → **Conflict** (routed to §4.2 for an explicit decision). |
| **RU-405** | Strict entity typing | Work → work, education → education, certification → certification. Never cross-mapped. |
| **RU-406** | Conflict matching logic | Work: normalized company + title + **start date**. Same start date = same job, so a changed end date is an update, not a conflict. Education: institution + degree + field. Matching is case-insensitive and ignores punctuation and common suffixes (Inc., LLC). |
| **RU-407** | Skills de-duplication | Dedup extracted skills against each other **and** against the user's existing canonical skill list (case-insensitive, normalized). Case-study skills in `portfolio-service` are associations to that same canonical list, so they resolve through it. |
| **RU-408** | Skills import limit | **No import-specific cap.** Imported skills fill up to the profile's own skill limit (**100**). De-duplication runs first; whatever remains is imported until the profile limit is reached. Work history, education and certifications import in full. |
| **RU-409** | Skill provenance | Every imported skill is tagged with its source in the data model. **Not surfaced in the UI in v1.** |
| **RU-409a** | Validation flagging | Extracted entries are **always saved**. Each is checked against the same field rules the manual entry form applies; where a **required** field is missing or invalid the entry is flagged. Empty **optional** fields are never flagged. Validation never removes an entry. |
| **RU-409b** | Flag visibility | The validation flag appears in **edit mode only** — a small error state on the affected entry. Never on the talent's profile view, in marketplace or search, on any client-facing surface, in *View as Client*, or in either review dialog. It clears when the field is filled. |
| **RU-410** | Non-destructive failure | A failed parse writes nothing. Partial profile writes are never permitted. |
| **RU-411** | Sync audit trail | Persist what was added / replaced / kept, enabling undo and traceability. |
| **RU-412** | Screen ordering | When a resume produces **both** conflicts and additions, the conflict dialog (§4.2) resolves **first**; the summary (§4.1) then reports the complete outcome. |

### 4.1 Summary — "Resume Upload Complete"

Additions are non-destructive, so they are **applied on arrival**. This screen is a receipt, not a permission gate.

| ID | Feature | Description |
|---|---|---|
| **RU-421** | Grouped additions summary | *"We updated your profile with your information from your resume."* Grouped, counted sections: *Added N skills*, *Added N educations*, *Added N work experiences*, *Added N certifications*. |
| **RU-422** | Per-item detail | Each entry shows its identifying detail (institution + degree + field; title + company + date range). |
| **RU-423** | Overflow handling | Long lists collapse with *"+ N more…"*; panel scrolls. |
| **RU-424** | Dismiss | **Looks good!** closes the dialog. It confirms nothing new — the additions are already applied. |
| **RU-425** | Undo | **Undo Changes** reverses the entire applied sync. Available **only while this dialog is open**; there is no persistent undo window. |
| **RU-426** | Empty-result handling | A valid resume that yields no extractable entities shows the **Nothing found** state. The file is still saved. Never a silent no-op. |

### 4.2 Conflict Resolution — "Update Current Information?"

| ID | Feature | Description |
|---|---|---|
| **RU-431** | Dialog title & framing | **"Update Current Information?"** — *"We found work history and education entries that already exist in your profile. You can keep your current information or replace it with information from your resume."* |
| **RU-432** | Destructive visual treatment | Title, section labels, row icons, and the primary button are rendered in the destructive (red) treatment. The action overwrites existing data and must read that way. |
| **RU-433** | Grouped conflicts | Sections for **work history**, **education**, and **certifications**, each listing the affected entries with their identifying detail. |
| **RU-434** | Per-entry control | Each conflicting row carries its own **"Apply Update"** checkbox. Users may accept some updates and reject others in a single pass. |
| **RU-435** | Default state | **All rows checked by default.** A user who trusts the resume can confirm in one click; a user who does not can uncheck individual rows. |
| **RU-436** | Commit | **Yes, Update** applies every checked row and leaves unchecked rows untouched. |
| **RU-437** | Decline all | **Keep Existing** discards all parsed versions of conflicting entries and retains current profile data. |
| **RU-438** | Dismiss-without-choosing | Escape, click-outside, and **✕** all resolve to **Keep Existing**. Nothing is ever overwritten by default. |

### 4.3 Identity Check — Name Matching

| ID | Feature | Description |
|---|---|---|
| **RU-441** | Onboarding path — no check | At onboarding the account has no name yet; the resume **seeds** it. No comparison is performed and no warning is shown. A wrong name is corrected in the Introduction step. |
| **RU-442** | Profile path — loose match | Where an account name exists, compare it to the extracted name. Match if **first or last name** matches closely — case-insensitive, accent- and punctuation-insensitive, order-independent, tolerant of middle names and suffixes. |
| **RU-443** | Pass conditions | A match, or no name found in the resume, proceeds **silently**. No confirmation screen on the happy path. |
| **RU-444** | Mismatch warning | A mismatch shows a warning; it never hard-blocks. Copy: *"Is this your resume? The name on this file — [Extracted Name] — doesn't match the name on your account, [Account Name]. You can only use your own resume to fill in your profile. If you've changed your name or go by something different, you can continue."* Actions: **Upload a different file** / **Yes, this is mine**. |
| **RU-445** | Legal name authority | The resume name is display/convenience data only. Identity verification supplies the legal name of record and no resume can override it. |

## 5. Resume Lifecycle Management

Sidebar Resume card, per the component spec (default + hover states).

| ID | Feature | Description |
|---|---|---|
| **RU-501** | Stored file record | Filename + *Added on \<date\>* displayed as a file chip. |
| **RU-502** | View resume | Open a rendered preview of the document in-app. |
| **RU-503** | Download resume | Retrieve the original file. |
| **RU-504** | Replace resume | Upload a new file over the existing one; re-runs §3–§4 in full. Prior version retained for audit. |
| **RU-505** | Delete resume | *"Delete Resume? Your resume will be removed. This cannot be undone."* → **Cancel** / **Yes, Delete**. |
| **RU-506** | Delete scope | Delete removes the file and its metadata. It does **not** roll back profile data previously autofilled from it. |
| **RU-507** | Version history | Uploads/replaces retained so Replace does not destroy the audit trail. Files are never overwritten in place. |
| **RU-508** | Hover action affordances | Download / Replace / Delete icons with default + hover treatments. |
| **RU-509** | Private access only | Files served via short-expiry signed URLs. Never publicly addressable, never guessable. |
| **RU-510** | Retention on account deletion — **settled** | Resume record and stored file removed from production within **24 hours** of account closure; logs and backups de-identified within **30 days**. Matches LinkedIn's published policy. |
| **RU-510a** | Version retention — **settled** | Keep the **4 most recent** stored versions. **Count-based, no time expiry** — a version is never deleted while the account is active. |
| **RU-510b** | Parse-result retention — **settled** | `raw_result` purged on review resolution; purged after **30 days** if the review is abandoned, clearing the pending-review prompt with it. |
| **RU-510c** | Recruitment retention clocks **do not apply** | The 6-month and 2-year recruitment retention rules govern a recruiter holding a candidate's CV under legitimate interest. A talent's own resume on their own profile is account content held to provide the service. A deletion clock here would destroy active users' files. |
| **RU-511** | Support access | Support staff may view a resume under a restricted break-glass role only. Every access is logged with actor and timestamp. Team leads have no access. |
| **RU-512** | One current resume | One resume per user at launch. The data model supports a list plus a "current" pointer so multiple resumes are a later extension, not a redesign. |
| **RU-513** | Re-import from stored file *(fast-follow)* | Re-run autofill from the already-stored file without re-uploading. Backend already supports it; surfaces as a row above the dropzone in the existing Replace modal. Not in launch scope. |

## 6. Profile Completion Integration

| ID | Feature | Description |
|---|---|---|
| **RU-601** | Checklist step completion | A successful upload marks **Upload Resume** complete in the profile-completion checklist. |
| **RU-602** | Completion percentage | Feeds the *"Ready to Get Hired?"* progress bar and *"N steps left" / "All Complete!"* state. |
| **RU-603** | Downstream step completion | Autofilled skills / work / education satisfy their own checklist steps. **About Me remains its own step and is never satisfied by a resume upload.** |

## 7. Cross-Service Requirements

Referenced only where they create a direct requirement on this feature.

| Service | Requirement |
|---|---|
| `resume-parsing-service` | Provides RU-301 → RU-308. This feature must handle rejection and failure responses, not just success. |
| Cloudflare R2 | Private object storage for the resume file (RU-501–512). |
| PostgreSQL (Supabase) | Resume metadata, versions, parse results, sync audit. |
| `auth-service` | Auth for profile-path endpoints; onboarding path needs a pre-profile token model. |
| `portfolio-service` | Holds case studies only, with skills optionally associated. **No** work experience or education. Skills dedup (RU-407) resolves through the shared canonical skill list. |
| Identity verification | Supplies the legal name of record (RU-445). |
| Notifications | In-app notification when an asynchronous parse completes (RU-403). No email in v1. |

## 8. Non-Functional Requirements

| ID | Requirement |
|---|---|
| **RU-801** | Parse latency budget: 30s hard timeout, one automatic retry, inline loader under 10s and async handoff beyond it. |
| **RU-802** | Cost control — one model call per upload. **Claude Haiku class** at launch. No parse cache for MVP. |
| **RU-803** | Resume files stored privately; never publicly addressable. |
| **RU-804** | Extraction failure must never leave a partially-written profile. |
| **RU-805** | All state transitions observable (parse success/rejection rates, latency, token spend). |
| **RU-806** | No LLM vendor training or retention on resume content. |
| **RU-807** | *Fast-follow:* evaluate lower-cost models on real resume batches post-launch and migrate if extraction quality holds. |

## 9. Remaining Work

All product decisions are settled (see 01b). What remains is design and delivery:

1. **Design the five states that have copy but no comps** — Not a resume, Password-protected, Nothing found, Name mismatch, Pending-review re-entry.
2. **Update onboarding loading copy** — remove all references to updating the Bio.
4. **Confirm the `portfolio-service` skill-list contract** used for dedup.

---

_Next: 02 — Resume Upload & Profile Autofill User Stories._
