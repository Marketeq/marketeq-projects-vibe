# 02 — Resume Upload & Profile Autofill · User Stories

> **Updated 22 July 2026.** Confirmed decisions cascaded from the Overview Docs.
>
> - **§6 and §7 scoped to the profile path.** The review flow — name-mismatch warning, conflict dialog, summary — is never entered during onboarding.
> - **RUS-502a added** — reviewing imported details in context on the onboarding steps rather than in a summary dialog.


**Parent epic:** Talent Profile
**Epic (this doc):** Resume Upload & Profile Autofill
**Scope:** Front-end, user-facing stories only.
**Sources:** 01 — Feature List · 01a — Open Product Questions (resolved) · 01b — CTO Answers & Decisions · `user-service` Resume Upload & Profile Autofill · `resume-parsing-service` Doc 00 · Figma designs and flow diagrams.
**Excluded:** Acceptance criteria (Doc 03), backend-only behaviour, and sibling Talent Profile epics (Skills, Portfolio, Verification, Rates) except where resume autofill writes into them.

**Primary persona — Talent.** Someone building or maintaining their Marketeq profile in order to be hired. Referred to throughout as *talent* — never "freelancer".

**Clients do not upload resumes.** This is a talent feature. An account can hold both modes, but the resume lives on the talent profile.
**Secondary persona — Support agent.** Appears only in §13, and only because it produces a user-facing surface.

**Traceability.** Each story cites the feature IDs from Doc 01 it derives from.

---

## 1. Discovering and starting the feature

**RUS-101 — Upload during onboarding**
As a talent going through onboarding, I want to upload my resume as the first step, so that the rest of onboarding is pre-filled and I type as little as possible.
*Derives from: RU-101*

**RUS-102 — Skip the upload step**
As a talent who doesn't have a resume to hand, I want to skip the upload step, so that I can finish onboarding by filling everything in myself.
*Derives from: RU-102*

**RUS-103 — Move backward and forward around the step**
As a talent in onboarding, I want to move back to the previous step or continue to the next one from the resume step, so that I stay in control of the flow.
*Derives from: RU-102*

**RUS-104 — Be invited to upload from an empty profile**
As a talent with an incomplete profile, I want to be offered the option to complete it with my resume, so that I understand there's a fast path available.
*Derives from: RU-103*

**RUS-105 — Dismiss the invitation**
As a talent who doesn't want to upload right now, I want to dismiss the prompt, so that it stops interrupting me while I work on my profile another way.
*Derives from: RU-103*

**RUS-106 — Find the resume feature whenever I want it**
As a talent, I want a permanent Resume card on my profile, so that I can upload later even after dismissing the prompt or skipping onboarding.
*Derives from: RU-104*

**RUS-107 — See resume upload as a profile-completion step**
As a talent working through my completion checklist, I want *Upload Resume* listed as a step I can act on, so that I know it counts toward getting hired.
*Derives from: RU-105, RU-601*

**RUS-108 — Return to an unfinished import**
As a talent who left before finishing a resume import, I want the Resume card to tell me there are details waiting for review, so that I can pick up where I left off instead of starting over.
*Derives from: RU-107*

## 2. Getting the file in

**RUS-201 — Drag and drop a file**
As a talent, I want to drag my resume onto the upload area, so that I can add it without navigating a file dialog.
*Derives from: RU-201*

**RUS-202 — Choose a file from my device**
As a talent, I want to browse and select a file, so that I can upload from wherever I keep my resume.
*Derives from: RU-202*

**RUS-203 — See which formats are accepted before I try**
As a talent, I want the accepted formats and size limit shown on the upload area, so that I pick a valid file the first time.
*Derives from: RU-203, RU-204*

**RUS-204 — See the drop target respond to my file**
As a talent dragging a file, I want the upload area to visibly react as I hover over it, so that I know where to release.
*Derives from: RU-201, §2.1*

**RUS-205 — Watch the upload progress**
As a talent uploading a large file, I want to see the filename, size and progress, so that I know it's working and roughly how long it will take.
*Derives from: RU-205*

**RUS-206 — Check the file before saving it**
As a talent, I want to preview the document I selected before committing it, so that I can confirm I picked the right file.
*Derives from: RU-208*

**RUS-207 — Cancel before saving**
As a talent who picked the wrong file, I want to cancel from the preview, so that nothing is saved and I can choose again.
*Derives from: RU-208*

**RUS-208 — Understand what happens to my file**
As a talent, I want a plain statement that my resume is private, used only to fill my profile, and never shown to clients — with a link to the privacy policy — so that I can decide whether to upload it.
*Derives from: RU-207*

## 3. When the file is wrong

**RUS-301 — Know when my file is too large**
As a talent whose file exceeds the limit, I want to be told the size limit and asked for a different file, so that I know exactly what to fix.
*Derives from: RU-204, §2.1*

**RUS-302 — Know when my file type isn't supported**
As a talent who picked an unsupported format, I want to be told which formats are accepted, so that I can convert or re-export.
*Derives from: RU-203, §2.1*

**RUS-303 — Know when the upload itself failed**
As a talent whose upload failed for network or server reasons, I want a clear failure message that distinguishes it from a problem with my file, so that I don't waste time looking for a file that isn't broken.
*Derives from: §2.1*

**RUS-304 — Retry without starting over**
As a talent who hit any failure, I want a **Try again** action on the spot, so that I can retry without re-navigating the flow.
*Derives from: RU-206*

**RUS-305 — Know when my document isn't a resume**
As a talent who uploaded the wrong document — a contract, an invoice, a cover letter — I want to be told it doesn't look like a resume, in wording that's clearly different from an unsupported-file-type error, so that I understand the file is fine but the content is wrong.
*Derives from: RU-303, RU-304, §2.1*

**RUS-306 — Know when my file is password-protected**
As a talent whose resume is locked, I want to be told specifically that the file is password-protected, so that I remove the protection instead of assuming the site is broken.
*Derives from: §2.1*

**RUS-307 — Know when nothing could be extracted**
As a talent whose resume parsed but produced nothing usable, I want to be told plainly and invited to fill my profile myself, so that I'm not left staring at an empty result with no explanation.
*Derives from: RU-426, §2.1*

**RUS-308 — Keep my file even when extraction fails**
As a talent whose import produced nothing, I want my resume to still be saved to my profile, so that the upload wasn't wasted.
*Derives from: RU-426*

**RUS-309 — Be told when I've uploaded too often**
As a talent who has uploaded repeatedly in a short window, I want a clear message about the limit rather than a generic error, so that I know to wait rather than assume something is broken.
*Derives from: RU-210*

**RUS-310 — Recover inside onboarding**
As a talent who hits any upload or extraction failure during onboarding, I want to retry, skip, or continue manually from the same step, so that a bad file never traps me in the flow.
*Derives from: RU-102, RU-306*

## 4. While my resume is being read

**RUS-401 — See that my resume is being processed**
As a talent who has just uploaded, I want a single clear message that my resume is being read, so that I know the system is working.
*Derives from: RU-403*

**RUS-402 — Not be shown invented progress**
As a talent waiting, I want the waiting message to describe what's actually happening rather than fake step-by-step progress, so that a slow parse doesn't read as a broken one.
*Derives from: RU-403*

**RUS-403 — Be released from waiting when it takes too long**
As a talent whose resume is taking unusually long, I want to be let go and notified in-app when it finishes, so that I'm not stuck watching a spinner.
*Derives from: RU-403, RU-801*

**RUS-404 — Be told when reading the resume failed**
As a talent whose extraction timed out or errored, I want a recoverable message with a retry, and the confidence that nothing half-finished was written to my profile.
*Derives from: RU-306, RU-410*

## 5. Confirming the resume is mine

**RUS-501 — Not be interrogated during onboarding**
As a talent uploading during onboarding, I want my name taken from the resume without being asked to confirm it, so that the fastest path stays fast.
*Derives from: RU-441*

**RUS-502 — Correct a wrong name later**
As a talent who uploaded the wrong resume during onboarding, I want to edit my name in the following step, so that a wrong file is a five-second fix rather than a dead end.
*Derives from: RU-441*

**RUS-503 — Pass silently when the name matches**
As a talent uploading from my profile, I want no interruption at all when the name on my resume matches my account, so that the common case is frictionless.
*Derives from: RU-442, RU-443*

**RUS-504 — Be warned when the name doesn't match**
As a talent uploading from my profile, I want to be shown both names and asked whether the file is mine when they don't match, so that I catch an accidental upload of someone else's resume.
*Derives from: RU-444*

**RUS-505 — Continue anyway when the mismatch is legitimate**
As a talent who goes by a different name, has married, or uses a professional name, I want to confirm the resume is mine and proceed, so that a naming difference never blocks me.
*Derives from: RU-444*

**RUS-506 — Swap the file from the warning**
As a talent who realises the file really is wrong, I want to upload a different one directly from the warning, so that I don't have to back out and restart.
*Derives from: RU-444*

**RUS-507 — Not be blocked when my resume has no name on it**
As a talent whose resume has no clearly detectable name, I want the import to proceed normally, so that an unusual layout doesn't cost me the feature.
*Derives from: RU-443*

## 6. Seeing what was added

> **Profile path only.** During onboarding there is no profile to report changes against, so no summary is shown. Extracted data appears pre-filled on onboarding steps 2–6 instead — see RUS-502a. Sections 6 and 7 describe the profile experience.
> - Persona corrected to **talent** (never "freelancer"); scope note states clients do not upload resumes.

**RUS-502a — Review my imported details in context during onboarding**
As a talent who uploaded at step 1, I want the details from my resume to appear already filled in on the steps that follow, so that I can check and correct them beside their own labels instead of in a summary of a profile I haven't seen yet.
*Derives from: RU-101, RU-401*


**RUS-601 — See a summary of everything that was added**
As a talent whose import succeeded, I want a grouped summary of what was added to my profile — skills, work experience, education, certifications — so that I know exactly what changed.
*Derives from: RU-421*

**RUS-602 — See counts per group**
As a talent reviewing the summary, I want each group to show how many items were added, so that I can gauge the scale of the change at a glance.
*Derives from: RU-421*

**RUS-603 — Recognise each item individually**
As a talent reviewing the summary, I want each entry shown with the detail that identifies it — job title, company and dates; institution, degree and field — so that I can tell whether it's right.
*Derives from: RU-422*

**RUS-604 — Read a long summary comfortably**
As a talent with a long resume, I want long lists to collapse behind a *+ N more* affordance and the panel to scroll, so that the summary stays readable.
*Derives from: RU-423*

**RUS-605 — Close the summary when I'm happy**
As a talent who is satisfied with what was added, I want a single action to close the summary, so that I can get on with my profile.
*Derives from: RU-424*

**RUS-606 — Not see duplicate skills**
As a talent, I want the same skill never to appear twice in my summary or on my profile, so that the result looks credible rather than sloppy.
*Derives from: RU-407*

**RUS-607 — Not have my skill list flooded**
As a talent with a skill-heavy resume, I want the number of imported skills capped at a sensible maximum, so that my profile stays focused.
*Derives from: RU-408*

**RUS-608 — Have imported items look like my own**
As a talent, I want imported skills to appear identically to skills I added myself, with no "from resume" labelling, so that nothing on my profile looks second-class to a client.
*Derives from: RU-409*

**RUS-609 — Keep my work, education and certifications complete**
As a talent, I want all my work history, education and certifications imported rather than truncated, so that I don't have to hand-add the remainder.
*Derives from: RU-408*

## 7. Deciding what to overwrite

**RUS-701 — Be told when the resume conflicts with what's already there**
As a talent whose resume overlaps with my existing profile, I want to be shown which entries already exist before anything is changed, so that I'm never overwritten silently.
*Derives from: RU-431*

**RUS-702 — Recognise this as a destructive decision**
As a talent facing the update dialog, I want it presented with clear destructive styling, so that I slow down and read before acting.
*Derives from: RU-432*

**RUS-703 — See conflicts grouped by type**
As a talent, I want conflicts grouped into work history, education and certifications, so that I can reason about them section by section.
*Derives from: RU-433*

**RUS-704 — Choose per entry**
As a talent, I want to accept some updates and reject others in the same pass, so that one good change doesn't force me to accept a bad one.
*Derives from: RU-434*

**RUS-705 — Accept everything in one click**
As a talent who trusts my resume over my profile, I want every row pre-selected so I can confirm the whole set immediately, so that the common case takes one action.
*Derives from: RU-435*

**RUS-706 — Deselect what I want to protect**
As a talent, I want to uncheck any individual entry I'd rather keep as-is, so that I retain the version I prefer.
*Derives from: RU-434, RU-435*

**RUS-707 — Apply my selections**
As a talent, I want a single confirm action that applies exactly the rows I selected and leaves the rest untouched, so that the outcome matches what I chose.
*Derives from: RU-436*

**RUS-708 — Decline all updates**
As a talent who wants my existing profile preserved wholesale, I want one action that keeps everything as it is, so that I can dismiss the whole set quickly.
*Derives from: RU-437*

**RUS-709 — Leave without deciding and lose nothing**
As a talent who closes the dialog with the ✕, the escape key, or a click outside, I want my existing information kept, so that walking away is always the safe outcome.
*Derives from: RU-438*

**RUS-710 — Not be asked about a job that merely ended**
As a talent whose resume shows an end date for a role my profile lists as current, I want that treated as an update to the same job rather than a conflict between two jobs, so that I'm not asked to choose between duplicates of the same role.
*Derives from: RU-406*

**RUS-711 — Resolve conflicts before I see the summary**
As a talent whose resume produces both new entries and conflicts, I want to settle the conflicts first and then see one complete summary, so that the process has a single clear ending.
*Derives from: RU-412*

## 8. Undoing and walking away

**RUS-801 — Undo the whole import**
As a talent who doesn't like the result, I want to reverse the entire import from the summary, so that I can return my profile to its previous state in one action.
*Derives from: RU-425*

**RUS-802 — Understand that undo is available now**
As a talent, I want it to be clear that undo belongs to this dialog and isn't a permanent history feature, so that I don't assume I can undo tomorrow.
*Derives from: RU-425*

**RUS-803 — Not lose my import by closing the tab**
As a talent who leaves mid-flow, I want the result held so I can review it later from the Resume card, so that an interruption doesn't cost me the upload.
*Derives from: RU-107*

## 9. Living with my stored resume

**RUS-901 — See which resume is on file**
As a talent, I want the filename and the date it was added shown on my profile, so that I know which version Marketeq holds.
*Derives from: RU-501*

**RUS-902 — View my resume**
As a talent, I want to open and read my stored resume in-app, so that I can check it without hunting for the original on my device.
*Derives from: RU-502*

**RUS-903 — Download my resume**
As a talent, I want to download the original file, so that I can retrieve it if I've lost my local copy.
*Derives from: RU-503*

**RUS-904 — Replace my resume**
As a talent with an updated CV, I want to replace the stored file, so that my profile can be refreshed from the newer version.
*Derives from: RU-504*

**RUS-905 — Have a replacement re-run the import**
As a talent replacing my resume, I want the new file to go through the same extraction and review flow, so that my profile actually benefits from the update.
*Derives from: RU-504*

**RUS-906 — Delete my resume**
As a talent, I want to delete my resume from my profile, so that I control what Marketeq stores about me.
*Derives from: RU-505*

**RUS-907 — Be warned before deleting**
As a talent about to delete, I want a confirmation that tells me it can't be undone, so that I don't lose the file by accident.
*Derives from: RU-505*

**RUS-908 — Keep my profile data after deleting the file**
As a talent deleting my resume, I want the work history, education and skills already on my profile to remain, so that removing a file doesn't dismantle my profile.
*Derives from: RU-506*

**RUS-909 — Reach the file actions easily**
As a talent, I want view, download, replace and delete reachable directly from the Resume card, so that managing the file takes one step.
*Derives from: RU-508*

## 10. Privacy and who can see what

**RUS-1001 — Keep my resume away from clients**
As a talent, I want my resume never shown to clients and never attached to my applications, so that I control what clients see about me.
*Derives from: RU-106*

**RUS-1002 — Verify that for myself**
As a talent using *View as Client*, I want the Resume card to be absent entirely, so that I can see with my own eyes that clients can't reach it.
*Derives from: RU-106*

**RUS-1003 — Trust that my file isn't publicly reachable**
As a talent, I want my resume accessible only through short-lived private links, so that nobody can stumble onto it or share a permanent URL.
*Derives from: RU-509*

**RUS-1004 — Read an accurate privacy statement**
As a talent, I want the on-screen privacy wording to be truthful about how my resume is handled, so that I'm not agreeing to something the product doesn't actually do.
*Derives from: RU-207*

## 11. What the resume does and doesn't touch

**RUS-1101 — Write my own bio**
As a talent, I want my bio to stay entirely mine and never be generated or overwritten by a resume, so that my positioning is in my own voice.
*Derives from: RU-401, RU-603*

**RUS-1102 — Complete About Me myself**
As a talent, I want About Me to remain its own checklist step that a resume upload doesn't tick off, so that the checklist reflects what I've actually written.
*Derives from: RU-603*

**RUS-1103 — Keep my location untouched**
As a talent, I want my location never changed by a resume, so that my timezone and rates stay correct.
*Derives from: RU-401*

**RUS-1104 — Have empty job title slots filled**
As a talent with unused job title slots, I want titles from my resume placed into the empty ones, so that I have less to type.
*Derives from: RU-402*

**RUS-1105 — Keep the job titles I've already set**
As a talent, I want my existing job titles and their rates left exactly as they are, so that an import never disturbs what I charge.
*Derives from: RU-402*

**RUS-1106 — Not be asked for contact details I didn't offer**
As a talent, I want my phone number and address left out of extraction entirely, so that only what's needed is taken from my file.
*Derives from: RU-401*

**RUS-1107 — Have entries land in the right section**
As a talent, I want work experience, education and certifications to land in their own sections and never be mixed up, so that my profile reads correctly.
*Derives from: RU-405*

**RUS-1108 — Never end up with a half-imported profile**
As a talent whose import fails partway, I want nothing at all written rather than a partial result, so that I never have to clean up fragments.
*Derives from: RU-410*

## 12. Completion and momentum

**RUS-1201 — Get credit for uploading**
As a talent, I want a successful upload to tick off the *Upload Resume* checklist step, so that I see progress for the effort.
*Derives from: RU-601*

**RUS-1202 — See my completion move**
As a talent, I want my profile completion progress and remaining-step count to update after an import, so that I can tell how close I am to done.
*Derives from: RU-602*

**RUS-1203 — Get credit for what the import filled**
As a talent, I want the skills, work and education steps satisfied by imported content, so that I'm not asked to redo work the resume already did.
*Derives from: RU-603*

**RUS-1204 — Reach completion faster than typing it all**
As a talent, I want the upload path to be a materially quicker route to a complete profile than manual entry, so that the feature is worth using at all.
*Derives from: RU-101, RU-103*

## 13. Access and accessibility

**RUS-1301 — Upload without a mouse**
As a talent using a keyboard, I want the upload control fully operable by keyboard, so that drag and drop is never the only way in.
*Derives from: RU-209*

**RUS-1302 — Upload with a screen reader**
As a talent using assistive technology, I want the upload area, progress, error states and review dialogs properly labelled and announced, so that I can complete the flow independently.
*Derives from: RU-209*

**RUS-1303 — Have the review dialogs operable by keyboard**
As a talent using a keyboard, I want to reach and toggle every per-row control and both dialog actions, so that per-entry choice is available to me too.
*Derives from: RU-434, RU-209*

**RUS-1304 — Use my resume in my own language**
As a talent whose resume isn't in English, I want it to parse and fill my profile normally where supported, so that language isn't a barrier to using the feature.
*Derives from: RU-307*

**RUS-1305 — Get help without exposing my file** *(Support agent — secondary persona)*
As a support agent resolving a resume-related ticket, I want access only through an explicitly restricted, fully logged path, so that a talent's private file is never casually browsable.
*Derives from: RU-511*

---

## Deferred — not in launch scope

| Story | Reason |
|---|---|
| Re-import from the already-stored file without re-uploading | Backend supports it; UI is a fast-follow row in the existing Replace modal (RU-513). |
| Multiple stored resumes with a selectable current version | Data model supports it; one resume at launch (RU-512). |
| Visible provenance for imported skills | Provenance is stored but deliberately not surfaced in v1 (RU-409). |
| Email notification on asynchronous parse completion | In-app notification only for v1 (RU-403). |

---

_Next: 03 — Acceptance Criteria, derived from these stories._
