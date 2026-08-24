# 02a — CTO Answers & Decisions

> **Updated 22 July 2026.** Confirmed decisions cascaded from the Overview Docs.
>
> - Job title decision updated to **most recent title only, into a single empty slot**.


**From:** CTO
**To:** Product Manager
**Re:** Open questions raised in 01a
**Status:** Consolidated after the design review and decision reversals. This is the authoritative decisions log.

**All 30 items settled.** No outstanding questions requiring PM input.

---

## Part A — Decided. Final.

### 1. One resume per person at launch (data model supports more)

One resume per person at launch. Every design assumes it and it keeps the profile simple. Backend stores file + parse result + versions. Scaling to multiple resumes is a data model extension, not a redesign — fast-follow when product asks for it.

### 2. Resume is private, never shown to clients

Resume file is never shown to clients, never attached to applications, never shared. Used only to fill the profile. "View as Client" must hide the Resume card entirely. File stored privately in R2 with signed temporary URLs.

### 3. Resume stored, not discarded

File is kept in R2 privately after parsing. Designs prove it: Download action, View, Delete confirmation, "Added on" date, Replace. Supports future re-import from existing file.

### 4. Additive changes apply immediately; destructive changes require consent

**REVERSAL of the earlier "preview model" ruling.** The governing principle is: **destructive needs consent, additive does not.**

- **Additions** (new skills, new jobs, new education, new certifications) cannot destroy anything, so they are applied on arrival. The "Resume Upload Complete" screen is a **receipt**, not a permission gate. Past-tense copy — "We updated your profile with your information from your resume" — is accurate and stays.
- **Looks good!** simply dismisses the dialog. It confirms nothing.
- **Undo Changes** reverses the whole sync and is available only while that dialog is open. No persistent undo window.
- **Conflicts** overwrite existing data, so they get a real decision with two real buttons and no silent default.

**Screen order:** when a resume produces both, the conflict dialog runs **first**, then the summary reports the complete outcome. One clear ending.

### 5. Per-entry conflict resolution

**REVERSAL:** all-or-nothing was decided verbally, then reversed once the design was reviewed — the comp already implements per-row checkboxes. Removing them would be taking away working functionality. Per-entry stands.

**Checkbox behavior:**
- Label: **"Apply Update"** (singular — one change per row)
- Default state: **All checked**
- Primary button: **"Yes, Update"** (matches dialog title "Update Current Information?")
- Secondary: **"Keep Existing"** (declines all, keeps current data)
- **Escape / click-outside / ✕ → Keep Existing.** Nothing is overwritten by default.

**Why all-checked is safe:** the dialog is rendered in full destructive-red treatment, so it stops people. And the alternative is worse — if nothing is checked and the user clicks **Yes, Update**, nothing happens and they have to re-upload the resume to try again. A wasted action is a worse failure than an over-eager one the user was warned about.

### 6. Conflict matching logic

Match on: normalized company + title + **start date** (not end date). Same start date = same job, update only. "VP of Engineering, Android, Jan 2023–Present" + "VP of Engineering, Android, Jan 2023–Jun 2025" = same job, updated end date, not a conflict.

Matching: case-insensitive, ignores punctuation, common suffixes (Inc., LLC).

Education: same institution + degree + field.

### 7. Name matching — loose, warns only post-signup

**Onboarding (step 1):** No name check. Resume uploads first, we extract the name and build the profile around it. If wrong name, they edit in step 2 (Introduction).

**Profile page (post-signup):** Loose fuzzy match only if account name exists. Match if first **or** last name matches closely (case-insensitive, accent- and punctuation-insensitive, order-independent). Warn, never block. If no name found in resume, silently pass.

**Warning popup copy (if mismatch detected):**
> **Is this your resume?**
> The name on this file — [Extracted Name] — doesn't match the name on your account, [Account Name].
> You can only use your own resume to fill in your profile. If you've changed your name or go by something different, you can continue.
> [Upload a different file] [Yes, this is mine]
> - **Decision 11 corrected** — 20-skill import cap removed; fill to the profile limit of 100.
> - **Retention decision settled with concrete numbers**, grounded in LinkedIn's published policy rather than an invented figure.

### 8. Identity verification seals legal name post-onboarding

Resume name at onboarding is display/convenience only. Once identity verification happens, the legal name from the verified document becomes the source of truth. No resume can override it.

### 9. Autofilled fields: Skills, Work Experience, Education, Certifications ONLY

Bio: excluded (always hand-written, reflects positioning).
Location: excluded (drives timezone/rates, must not be overridden).
Job title: the **most recent title only**, into a single empty slot (max 3 title/rate pairs; never override existing; older titles from the resume are never used).
Contact details (phone/address): not extracted (data minimization).

### 10. Job title fills empty slots, never overrides

User can save up to three job titles with three separate rates. Resume can autofill empty slots, but never overwrites an existing title. User controls tier assignment and rate.

### 11. Skills: no import cap — fill to the profile limit, deduped, source-tagged

**CORRECTION.** An earlier version of this decision set a 20-skill import cap. That number was invented here and never checked against the profile's actual limit, which is **100**. A 20-cap would silently discard skills a talent legitimately has. There is **no import-specific cap** — imported skills fill up to the profile's own limit.

Import skills from the resume up to the profile limit of 100. Deduplicate:
- Against user's canonical skill list (case-insensitive)
- Against existing profile skills
- Against portfolio case-study skills (via portfolio-service integration)

Tag each imported skill with source (resume, portfolio, manual) in data model. Don't show provenance in UI v1, but it enables future ranking/search differentiation.

### 12. Parse confidence threshold: 0.7

Below 0.7, treat as "not a resume." Tune on real data after 100 uploads.

### 13. Redis parse cache: no

Resumes parsed once per upload. Caching solves a problem we don't have. Skip for MVP.

### 14. Async parse notification: in-app only

In-app notification when parse completes. No email for v1. Re-entry point on Resume card: "We found details in your resume. Review them."

### 15. Empty extraction (valid resume, nothing found)

Show the "Nothing found" error state. Keep the file saved. Let them fill manually. Never silent no-op.

### 16. Skills interaction with portfolio case-study skills

Dedup against the user's canonical skill list. Case-study skills are an association to that list, not a separate pool — so it resolves itself via portfolio-service.

### 17. Imported skills: no visual distinction in UI

Store provenance in the data model. Show nothing in the UI. A "from resume" badge invites doubt about skills the user already approved.

### 18. Staged loading copy: one honest message

One message, not fake progress stages. Single call, no staged copy. Honest beats clever.

### 19. Parse timeout: 30 seconds hard limit

Auto-retry once before surfacing an error to user.

### 20. File storage: versioned, never overwrite in place

5MB file size limit. Virus scan before storage or parsing. Private storage only — signed URLs, short expiry, never guessable. Rate-limit uploads per user per hour. Version history always retained.

### 21. Non-destructive default

Parse failure = throw away entirely, never partial profile write.

### 22. No LLM vendor training on resume content

Contract with vendor explicitly excludes resume content from training/retention.

### 23. Accessibility

Keyboard/screen reader accessible dropzone. Under 10s inline loader, over 10s async with notification.

### 24. Error states designed

Four new states:
- **"Not a resume"** (valid file type, wrong content): "This doesn't look like a resume. Please upload your resume — we couldn't find work history or education in this file."
- **"Password-protected file"** (specific error, not generic)
- **"Nothing found"** (valid resume, extraction returned nothing): "We couldn't pull any details out of this file. You can still fill in your profile yourself."
- **"Name doesn't match"** (popup above; warning only on profile path)
- **Pending review re-entry** (on Resume card after abandoned session): "We found details in your resume. Review them."

### 25. Undo window

Lives and dies with the summary dialog. No persistence, no 24-hour window.

### 26. Resume retention on account deletion

**Settled with concrete numbers.** Resume and stored file are removed from production within **24 hours** of account closure; logs and backups de-identified within **30 days**. Stored versions: keep the **4 most recent**, count-based, with **no time-based expiry** — a version is never deleted while the account is active. This matches LinkedIn's published policy for talent-uploaded resumes. Recruitment-industry retention clocks (6 months, 2 years) govern a recruiter holding a candidate's CV and **do not apply here** — a talent's own resume on their own profile is account content, and a deletion clock would destroy active users' files.

### 27. LLM choice: Claude Haiku 4.5

$1 input / $5 output per million tokens. ~$0.0045 per resume. Validates structured extraction reliably. Cheaper alternatives exist (Gemini Flash-Lite $0.00044, DeepSeek, Mistral) but trust/data residency constraints favor Haiku for MVP.

**Fast-follow:** Post-launch, test Gemini Flash or Mistral on real batches. If quality holds, migrate and cut costs 80–90%.

### 28. Onboarding: resume upload is skippable (existing skip on every step)

Every onboarding step has a skip button. Resume step 1 is no exception.

### 29. On-brand copy and tone

Dialog title: **"Update Current Information?"** (not "Replace")
Button: **"Yes, Update"** (not "Yes, Replace")
Checkbox label: **"Apply Update"** (one per row, all checked by default)
Copy reflects safety-first, non-destructive mental model throughout.

### 30. Support staff access: break-glass only

Support staff can view resumes under restricted role, every access logged (who/when). Team leads: no access (defaulted by "always private" ruling).

---

## Dependency Notes

- **Portfolio-service integration:** Skills dedup requires cross-service query. Confirm API contract.
- **Identity verification:** Legal name sealing happens at a different workflow. Confirm timing and integration points.
- **Rate limiting:** Per-user per-hour upload limit. Confirm with backend infra standards.
- **Virus scanning:** Before storage or parsing. Confirm vendor/service.

---

## What's Left for Product/Design

Nothing at the feature level. All product decisions are locked. Remaining work:

1. **Confirm the five new error state designs** (not a resume, password-protected, nothing found, name mismatch, pending re-entry).
2. **Finalize onboarding copy** (loading screen no longer says "Updating your Bio...").
3. **Confirm portfolio-service integration scope** (do we deduplicate against case-study skills or not?).

These are design/QA tickets, not blocking questions.
