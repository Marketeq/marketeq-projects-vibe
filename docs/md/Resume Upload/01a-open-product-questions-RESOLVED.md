# 01a — Resume Upload & Profile Autofill · Product Questions Register (RESOLVED)

> **Updated 22 July 2026.** Confirmed decisions cascaded from the Overview Docs.
>
> - Question 4 ruling updated — job title is now **most recent only, into one empty slot**, with the reasoning that the other slots exist for different kinds of work at different rates.
> - Privacy wording removed from remaining work; the design's existing notice stands and nothing is added.


**From:** CTO
**To:** Product Manager
**Parent epic:** Talent Profile · **Feature:** Resume Upload & Profile Autofill
**Status:** **Closed.** Every question raised here has a ruling. Retained as the audit trail of what was asked and what was decided.
**Authoritative record of decisions:** 01b — CTO Answers & Decisions. Where the two differ, 01b wins.

> This document originally listed open questions. It is now a register: each question is preserved as asked, with the ruling recorded beneath it. Nothing here is awaiting an answer.
> - **Question 7 corrected** — the 20-skill cap was an invented figure, never checked against the profile limit of 100. Removed.

---

## Part 1 — Decisions taken without PM input

All ten stand as written and are now reflected in Doc 01 (§8) and the service docs.

| # | Decision | Status |
|---|---|---|
| 1 | Virus-scan every uploaded file before storage or parsing | Standing — RU-308 |
| 2 | Private storage only; short-expiry signed links, never guessable | Standing — RU-509 |
| 3 | 5MB upload limit retained | Standing — RU-204 |
| 4 | Never overwrite a resume in place; keep version history | Standing — RU-507 |
| 5 | Rate-limit uploads per user per hour | Standing — RU-210 |
| 6 | Parse timeout with automatic retry before surfacing an error | Standing — 30s, one retry — RU-306 |
| 7 | Full audit record of every profile change made by an import | Standing — RU-411 |
| 8 | Partial parse results are discarded, never partially written | Standing — RU-410 |
| 9 | No vendor training or retention on resume content | Standing — RU-806 |
| 10 | Keyboard- and screen-reader-operable upload | Standing — RU-209 |

---

## Part 2 — Questions for the PM

### Business logic

**1. Can someone have more than one resume?**
**Ruling: one at launch, data model supports many.** A list plus a "current" pointer, so multiple resumes are a later extension rather than a redesign. — *RU-512*

**2. What happens to a bio the person wrote themselves?**
**Ruling: the bio is never touched.** Bio is excluded from extraction entirely — it is positioning, written by hand. About Me remains its own checklist step and is never satisfied by an upload. All "Updating your Bio…" copy is removed from the loading screen. — *RU-401, RU-603*

**3. How do we decide two entries are "the same job"?**
**Ruling: match on normalized company + title + start date.** Same start date means the same job, so a changed end date is an update to that record rather than a competing entry. Education matches on institution + degree + field. Normalization is case-insensitive and strips punctuation and common suffixes. — *RU-406*

**4. Does the resume set the person's job title and location?**
**Ruling: location never; the most recent job title into one empty slot.** Location drives timezone and rates and must not be overridden. The profile holds up to three job title + rate pairs. **Only the most recent title from the resume is used, into a single empty slot** — the other slots exist so the talent can offer different kinds of work at different rates, not to be filled with their own job history. Never overwrites an existing title or its rate. — *RU-401, RU-402*

**5. What do we do with contact details in the resume?**
**Ruling: don't extract them.** No phone, no address. Data minimisation — there is no use case, and storing them is liability without upside. — *RU-401*

**6. Do resume-imported skills count the same as skills someone picked themselves?**
**Ruling: same in the UI, distinguishable in the data.** Every imported skill carries a source tag in the data model, enabling future ranking or search weighting. Nothing is surfaced to the user in v1 — a "from resume" badge would invite client doubt about skills the talent already approved. — *RU-409*

**7. Is there a cap on how much we import?**
**Ruling: no import-specific cap — fill to the profile's own limit of 100.** An earlier ruling here set 20; that figure was invented rather than checked against the profile, and would have silently discarded legitimate skills. De-duplication runs first, then the remainder imports until the profile limit is reached. Work history, education and certifications import in full. — *RU-408*

### Permissions and privacy

**8. Can clients see the resume?**
**Ruling: never.** The resume is private to the talent, used only to fill the profile. Never shown to clients, never attached to applications. The Resume card is hidden entirely in *View as Client* and every client-facing rendering. — *RU-106*

**9. Can our own support or admin staff open someone's resume?**
**Ruling: break-glass only.** A restricted support role, with every view logged against actor and timestamp. — *RU-511*

**10. Anything team-related?**
**Ruling: no team-lead access.** Follows directly from the always-private ruling. — *RU-511*

### Fallbacks and failure

**11. If the parsing service is down, what does the person see?**
**Ruling: a recoverable error with retry, and the flow stays completable.** Every onboarding step is skippable, so a failure never blocks signup — the talent can retry, skip, or continue with manual entry from the same step. — *RU-306, RU-102*

**12. What if parsing works but finds nothing usable?**
**Ruling: dedicated "Nothing found" state.** *"We couldn't pull any details out of this file. You can still fill in your profile yourself."* The file is still saved. Never a silent no-op, never an upload error. — *RU-426*

**13. How long are we willing to make someone wait?**
**Ruling: 30s hard timeout with one automatic retry.** Under 10s, an inline loader. Beyond 10s, the talent is released and notified in-app on completion. No email in v1. — *RU-403, RU-801*

### Edge cases

**14. Resumes not in English.**
**Ruling: supported silently.** The model handles them. Not advertised until validated on real files. — *RU-307*

**15. Someone with no work history.**
**Ruling: flow holds.** Education-only imports are a normal outcome; the summary reports whichever groups have content. — *RU-421*

**16. Password-protected files.**
**Ruling: its own error state.** A specific message telling the talent to remove protection and re-upload — never a generic upload failure. — *Doc 01 §2.1*

**17. Uploading the exact same file twice.**
**Ruling: re-parse. No cache for MVP.** Each upload is parsed once; a cache solves a problem this feature doesn't have. — *RU-802*

**18. Abandoning the flow halfway.**
**Ruling: nothing is lost, and nothing destructive is applied.** Additions are non-destructive and are applied on arrival, so closing the tab leaves them in place. Anything that would overwrite existing data sits behind the Update dialog, and dismissal there resolves to **Keep Existing**. A parse that was never reviewed surfaces a re-entry point on the Resume card: *"We found details in your resume. Review them."* — *RU-107, RU-438*

---

## Part 3 — Gaps in the designs

**1. No "this isn't a resume" error screen.**
**Ruling: new state, copy approved.** *"This doesn't look like a resume. Please upload your resume — we couldn't find work history or education in this file."* Distinct from unsupported-file-type. **Design ticket open.** — *RU-303, RU-304*

**2. Does replacing a resume redo everything?**
**Ruling: yes, full re-run.** Replace re-runs extraction, conflict resolution and summary. That is the point of replacing. — *RU-504*

**3. What exactly does "Undo Changes" undo?**
**Ruling: the profile sync only, not the file.** The resume stays on the profile. Undo lives and dies with the summary dialog — there is no persistent undo window. — *RU-425*

**4. Deleting the resume and the completion checklist.**
**Ruling: deleting the file does not roll back profile data.** Work history, education and skills already imported remain. — *RU-506*

**5. No way to re-import from a resume already uploaded.**
**Ruling: fast-follow, not launch.** The backend already supports it — file and parse result are both stored. UI is a row above the dropzone in the existing Replace modal, not a new screen. — *RU-513*

**6. Nothing shows which parts of a profile came from a resume.**
**Ruling: intentional.** Provenance is stored, not displayed. See question 6 above. — *RU-409*

**7. Preview before committing on every path.**
**Ruling: pre-save preview stands as a feature of the upload flow.** — *RU-208*

**8. The onboarding flow has no failure path.**
**Ruling: closed by the existing skip.** Every onboarding step already has a skip control, and the error states are shared with the profile path. — *RU-102, RU-306*

---

## Part 4 — Things that needed clarifying

**1. Does the loading screen show real stages?**
**Ruling: no staged copy.** One honest message. It is a single call, and fabricated progress reads as broken when the call is slow. — *RU-403*

**2. Is the conflict screen deliberately all-or-nothing?**
**Ruling: per-entry — the design already had it.** This was decided as all-or-nothing verbally, then reversed on design review: the comp already carries per-row checkboxes, and removing them would have taken away working functionality. Each row has an **Apply Update** checkbox, all checked by default, committed with **Yes, Update** or declined wholesale with **Keep Existing**. — *RU-434, RU-435, RU-436, RU-437*

*Competitive note:* Indeed's "Sync to profile" is all-or-nothing; Workday drops parsed values into form fields for manual correction; LinkedIn doesn't autofill profiles from resumes at all. Per-entry is better than the market norm, not worse — worth keeping on that basis alone.

**3. Do we police whose resume it is?**
**Ruling: yes, loosely, and only where an account name exists.**
- **Onboarding:** no check. The resume *seeds* the name — there is nothing to compare against. A wrong name is corrected in the Introduction step.
- **Profile:** fuzzy match on first **or** last name — case-insensitive, accent- and punctuation-insensitive, order-independent, tolerant of middle names and suffixes. Warn, never block. No name found in the resume passes silently.
- **Legal name authority:** identity verification supplies the legal name of record. The resume name is display data and can never override it.
— *RU-441 through RU-445*

**4. The privacy promise conflicts with how we're building it.**
**Ruling: copy changes before launch.** Replace *"will not be shared with any third parties"* with: *"Your resume is private and is only used to fill in your profile. It is never shown to clients or shared for marketing."* Accurate, and it still says the thing talent actually care about. — *RU-207*

---

## The three that were settled first

- **The bio question (#2)** — resolved: bio is never touched by a resume.
- **Can clients see the resume (#8)** — resolved: never.
- **Abandoning the flow (#18)** — resolved: additive persists, destructive requires consent, unreviewed parses resurface on the Resume card.

---

## What remains — design and delivery only

1. Comps for the five states that have approved copy but no design: **Not a resume**, **Password-protected**, **Nothing found**, **Name mismatch**, **Pending-review re-entry**.
2. Remove all "Updating your Bio…" copy from the onboarding loading screen.
4. Confirm the `portfolio-service` canonical skill-list contract used for dedup.

No blocking product questions remain.
