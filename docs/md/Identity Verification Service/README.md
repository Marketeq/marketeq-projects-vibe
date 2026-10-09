# Identity Verification — Backend Documentation Handoff (Round 7)

Prepared for: Christopher
Prepared: 18 September 2026 (Round 1); corrected 18 September 2026 (Round 2, after Christopher's review); corrected again 18 September 2026 (Round 3, after Christopher's second review); corrected again 18 September 2026 (Round 4, after Christopher's third review); corrected again 18 September 2026 (Round 5, after Christopher's fourth review); corrected again 18 September 2026 (Round 6, after Christopher's fifth review); corrected again 18 September 2026 (Round 7, applying the approved traceability-matrix correction plan)
Supersedes: `Identity_Verification_Backend_Docs_For_Christopher` (17 September 2026), `Identity_Verification_Backend_Docs_UPDATED_2026-09-18` (Round 1), `Identity_Verification_Backend_Docs_CORRECTED_2026-09-18` (Round 2), `Identity_Verification_Backend_Docs_ROUND3_2026-09-18` (Round 3), `Identity_Verification_Backend_Docs_ROUND4_2026-09-18` (Round 4), `Identity_Verification_Backend_Docs_ROUND5_2026-09-18` (Round 5), and `Identity_Verification_Backend_Docs_ROUND6_2026-09-18` (Round 6) — none of the seven is overwritten; all remain available for reference.
Contents: the 12 Identity Verification backend documents, the current Data Dictionary, the Identity Verification Decision Record, and a revised unresolved-questions list — 15 files total, plus this README.

This folder is a documentation handoff only. Nothing in it was uploaded or shared automatically; it is meant to be copied into Google Drive and shared manually.

This documentation is **not being declared final with this package.** One item — CI-11, an internal Decision Record inconsistency about the accepted-document-screen inventory — was left unresolved this round pending further evidence. It has since been **fully resolved through two post-Round-7 updates (18 September 2026)**: the Birth Certificate finding, the country-dependent accepted-document-list question, and the four-item-vs-five-item backend-type question (National ID and Identification Card (ID) are one backend document_type) are all now confirmed resolved. One non-blocking residual note remains — only the United States instance of the four Figma screens this item references has been directly inspected — but it is not a confirmed defect. See Section 0 and Section 6 below.

---

## 0. What changed since Round 6 (read this first if you already reviewed Round 6)

Round 6's final comprehensive audit found five new contradictions but was authorized to correct only one item (Data Dictionary row 55), so those five were reported and left outstanding. Rather than starting Round 7 as another pattern-based audit — the same method that had already required seven successive rounds to keep surfacing new issues — the process itself changed: **a complete requirements traceability matrix was built directly from Christopher's two source documents** (`Identity_Verification_Answers.docx` and TRVG2), tracing forward into the documentation rather than searching the documentation for stale wording. That matrix covered 338 requirement-location rows across every DOCX file, every Data Dictionary row and cell, the Decision Record, the README, and the change report, and grouped 41 contradictory rows into 14 distinct issue clusters (CI-1 through CI-14). Christopher reviewed the resulting correction plan across two revisions — correcting a documentation/production-code conflation in one item, redirecting another item's conclusion entirely (the accepted-document-type question), and correcting an attribution error — before approving one consolidated correction pass.

**This round applies that approved plan: CI-1 through CI-10, CI-12, and CI-13 (12 correction items, 39 individual document/cell locations, plus 1 additional location found while correcting Doc 11 — see Section 3), and the four CI-14 tracking-file process fixes.** CI-11 was explicitly left unresolved, per instruction, pending the actual Figma accepted-documents screen inventory. **Round 6's five outstanding contradictions are all resolved by this round's CI-1/CI-2/CI-3 corrections.** A complete cross-document re-audit after all edits found no remaining contradiction other than CI-11 and the standing genuinely-open items already tracked in the Unresolved Questions register. Full detail is in `IDENTITY_VERIFICATION_UPDATE_18SEP2026_CHANGE_REPORT.md` Section 10, and in the accompanying traceability matrix (Revision 3).

## 1. Why this update exists

Christopher supplied two new documents on 18 September 2026: `Identity_Verification_Answers.docx` (his direct answers to the 11-question unresolved-questions register) and `Technical_Requirements_Verification_Gates2.docx` ("TRVG2," a substantially revised Technical Requirements — Verification Gates document). Both were cross-checked against the full backend documentation set, and the backend documents below were updated to bring them into line with what Christopher's answers and TRVG2 actually confirm. See `IDENTITY_VERIFICATION_UPDATE_18SEP2026_CHANGE_REPORT.md` (included in this folder) for the complete, document-by-document account of every change made, across all seven rounds.

## 2. File inventory

| # | File | Revision date | Changed in this update? |
|---|---|---|---|
| 1 | `00 - Identity Verification Service Overview.docx` | 18 September 2026 | **Yes — Round 7** (CI-2, CI-3 ×2, CI-5, CI-6 ×4 — 8 locations) |
| 2 | `01 - Identity Verification Technical Architecture.docx` | 18 September 2026 | **Yes — Round 7** (CI-6, 4 remaining locations) |
| 3 | `02 - Identity Verification Feature List.docx` | 18 September 2026 | **Yes — Round 7** (CI-1 SVC-15, CI-2 SVC-32 — resolves both contradictions found by Round 6's audit) |
| 4 | `03 - Identity Verification Data Model & Database Schema.docx` | 18 September 2026 | **Yes — Round 7** (CI-4 ×2, CI-9) |
| 5 | `04 - Identity Verification API Specification.docx` | 18 September 2026 | **Yes — Round 7** (CI-7, CI-8) |
| 6 | `05 - Identity Verification Business Logic & Workflows.docx` | 18 September 2026 | **Yes — Round 7** (CI-4 ×3) |
| 7 | `06 - Identity Verification Setup & Bootstrapping.docx` | 18 September 2026 | **Yes — Round 7** (CI-9) |
| 8 | `07 - Identity Verification Integrations & Events.docx` | 18 September 2026 | No — carried forward byte-identical since Round 1 (not named in any approved correction item) |
| 9 | `08 - Identity Verification Monitoring & Observability.docx` | 17 September 2026 | **Yes — Round 7** (CI-4 ×2) |
| 10 | `09 - Identity Verification Error Handling.docx` | 18 September 2026 | **Yes — Round 7** (CI-1 ×3, CI-4 — resolves the three contradictions found by Round 6's audit) |
| 11 | `10 - Identity Verification Security & Auth.docx` | 18 September 2026 | **Yes — Round 7** (CI-7) |
| 12 | `11 - Identity Verification Performance Considerations.docx` | 18 September 2026 | **Yes — Round 7** (CI-4, 6 locations — 5 planned plus 1 found during edit-time verification, plus a citation correction) |
| 13 | `Identity Verification Data Dictionary.xlsx` | 18 September 2026 | **Yes — Round 7** (row 42 — CI-10; row 64 — CI-2, resolves the contradiction found by Round 6's audit) |
| 14 | `Identity Verification Decision Record.docx` | 18 September 2026 | **Yes — Round 7** (CI-2 new §6.1 row — resolves the contradiction found by Round 6's audit; CI-12 §5 Q6; CI-13 §6.3; CI-14 header-date note) |
| 15 | `Identity Verification Unresolved Questions (Revised 2026-09-18).docx` | 18 September 2026 | No — carried forward byte-identical since Round 1; the 5 items it lists are unaffected by this round's corrections |

**Note on Document 07 and the Unresolved Questions document:** neither is named in any location across CI-1 through CI-13, and both are confirmed byte-identical to the Round 6 (and, for the Unresolved Questions document, Round 1) copies by SHA-256 checksum — see `MANIFEST.md`.

**Note on Document 08's revision date:** unchanged from Round 6 — this remains the Correction 5–revised version (17 September 2026); only its content changed this round (CI-4), not its underlying revision date, since the date reflects when the document's substantive drafting was last touched by Engineering-facing edits rather than documentation corrections. This is consistent with how the same note has read since Round 6.

Filenames in this folder are clean, numbered names without revision-date suffixes, since each is the single current copy of that document. See `MANIFEST.md` for checksummed file identity.

## 3. What changed, in brief

Rounds 1–6: see `IDENTITY_VERIFICATION_UPDATE_18SEP2026_CHANGE_REPORT.md` Sections 1–9 for full detail. In summary: the nine-gate `gate_open`/`in_grace` model, the account-wide attempt-count scope, VPN/proxy and vendor-outage handling, the read-only internal support endpoint, the manual document-entry flow, the National ID/Identification Card single-type correction, and (Round 6) Data Dictionary row 55's `attempt_count` correction.

Round 7 (this round, applying the approved traceability-matrix correction plan):
- **CI-1 — FAILED_FINAL automatic-clearing (4 locations: Doc 02, Doc 09 ×3).** Every remaining stale "FAILED_FINAL is permanently terminal / unresolved" claim annotated as superseded, confirming the 24-hour automatic-cooldown clearing per TRVG2 §2.9/§3.
- **CI-2 — BLOCKED_AGE automatic-clearing / age-rejection permanence (4 locations: Doc 00, Doc 02, Data Dictionary row 64, Decision Record §6.1).** Every remaining stale "age-rejection permanence is undecided" claim annotated or rewritten, confirming automatic clearing at `eligible_on`; a new Superseded row added to the Decision Record, matching the established National ID/Identification Card correction pattern.
- **CI-3 — Terminal-state conflation (2 locations: Doc 00 ×2).** The undifferentiated "Rejected/blocked" framing annotated to distinguish FAILED_FINAL and BLOCKED_AGE (both auto-clear) from BLOCKED_DUPLICATE (permanent).
- **CI-4 — Account-wide attempt-count framing (14 locations across Docs 03, 05, 08, 09, 11).** The largest cluster. Doc 11's illustrative `startVerificationSession` code example corrected to match Doc 05's own confirmed account-wide filtering (a documentation-internal consistency fix, not a claim about any live repository); every other location annotated. One additional Doc 11 location, not separately listed in the approved plan, was found and corrected during this work (see Section 10e of the change report).
- **CI-5 — Hiring gate `is_verified()`-only (1 location: Doc 00 item 15).** Annotated, extending the `gate_open`/`in_grace` correction already applied to the adjacent item 16.
- **CI-6 — Internal-team document review (8 locations: Doc 00 ×4, Doc 01 ×4).** Every location annotated to confirm the internal-team review capability is resolved (Doc 02 SVC-24 / TRVG2 §6.1 / Answer 4) as a read-only, no-document-access status endpoint, correcting the lingering claim that submitted identity documents are internally reviewable.
- **CI-7 — Internal endpoint field-list mismatch (2 locations: Doc 04, Doc 10).** Doc 04's "nothing new to build here" claim corrected to point to Doc 10's actual endpoint; Doc 10's PII catalog updated to reflect its own 18 September extension.
- **CI-8 — Country-conditional validation gap (1 location: Doc 04).** A gap noted (not a stale claim) acknowledging `issuingState` validation is not yet country-conditional, per Answer 9 / TRVG2 §2.1.
- **CI-9 — Vendor-outage attempt consumption (2 locations: Doc 06, Doc 03).** Both annotated, confirming an outage never consumes an attempt (Answer 6 / TRVG2 §5.1).
- **CI-10 — Data Dictionary row 42 stale 4-stage model (1 location).** Rewritten to state the confirmed nine-value enum.
- **CI-12 — Decision Record §5 Q6 DOB claim (1 location).** Clarified: DOB is read transiently to derive `eligible_on` and discarded; broader DOB collection/retention remains open (O13).
- **CI-13 — Decision Record §6.3 single-gate model (1 location).** Annotated, extending the nine-gate correction to this Decision Record section.
- **CI-14 — README/change-report/manifest process fixes (4 items).** File count corrected to 15; the Decision Record's own header date issue addressed with a clarifying note rather than overwriting the field; contradiction-count phrasing made explicit; "six questions and two design observations" updated to "one design observation."
- **CI-11 left unresolved this round**, per explicit instruction; **fully resolved through two post-Round-7 updates, 18 September 2026** — Birth Certificate, country-dependent document lists, and the four-item-vs-five-item backend-type question all confirmed; one non-blocking Figma-screen-inspection note remains — see Section 6.

Full before/after detail for every edit, across all seven rounds, is in `IDENTITY_VERIFICATION_UPDATE_18SEP2026_CHANGE_REPORT.md`.

## 4. Confirmed requirements vs. features deferred for implementation

Everything described in Docs 02, 03, 05, 09, and 10 is a **confirmed requirement** — either a stated product/behavioral decision from Christopher's answers, or a specification carried directly from TRVG2. None of it is a proposal awaiting sign-off. This engagement has no visibility into, and makes no claims about, any live backend source-code repository; every code example in this documentation set is illustrative content within these `.docx` files, corrected this round for internal consistency (Doc 11 vs. Doc 05, CI-4) but not verified against — or asserted to describe — any actual implementation.

**Didit integration mechanics** (the vendor call sequence, webhook handling details, and the specific SDK integration described in TRVG2 §5 and §8) are **confirmed as the intended design but deferred for implementation.** **TLS/certificate-termination build ownership** is similarly confirmed-as-a-rule but the underlying fact — whether Didit hosts the capture flow — is not yet confirmed; see item 3 in Section 5.

**Persona remains out of scope for the current build.** **Team Gating remains explicitly out of scope**, unchanged from the prior handoff.

## 5. What remains genuinely unresolved

Five items, unchanged from Round 1 and unaffected by this round's corrections. See `Identity Verification Unresolved Questions (Revised 2026-09-18).docx` for full detail on each:

1. **Document-number hash algorithm** — owner: Security/Engineering. Docs 03 and 05 still describe a placeholder, explicitly marked not production-safe.
2. **Who builds the VPN/proxy detector** — owner: Engineering. The behavior is fully specified; the build assignment is not.
3. **TLS/certificate-termination fact** — owner: pending confirmation from Didit. The rule is settled; whether Didit hosts the capture flow is not.
4. **Persona-branded hand-off screen reconciliation** — owner: Design. Flagged in Docs 00/01, not addressed by either of Christopher's new documents.
5. **Document-capture-then-face-scan ordering** — still verbal-only. Not written into any approved document; not being re-asked per standing instruction, but flagged so it is not lost.

No answer has been invented for any of these.

## 6. CI-11 — fully resolved through two post-Round-7 updates, 18 September 2026 (one non-blocking note remains)

**Decision Record §3's "five-item, Resolved" accepted-documents-screen row vs. §7.3 Observation 7.** This was originally an internal inconsistency within the Decision Record itself about a factual inventory (what the four referenced Figma screen instances actually show). Round 7 left it unresolved. It was then resolved across two subsequent updates. Decision Record §7.3 Observation 7 now carries a `[Verified in part, 18 September 2026]` note and a further `[Further update, 18 September 2026]` note recording all of the below.

**Confirmed and RESOLVED:**

- **Birth Certificate.** A Figma screenshot of the United States instance of this screen was reviewed and showed five items, including Birth Certificate — which is not one of the four canonical backend `document_type` categories (Answer 7). Confirmed resolved, not an outstanding defect: Birth Certificate has since been removed from the current Figma design, and the reviewed screenshot reflected an older version of the screen.
- **Country-dependent accepted-document lists.** Accepted documents are confirmed to be intentionally country-dependent by design — selecting a country displays that country's own accepted-document list (e.g., the United States screen shows the documents accepted for the United States; the India screen shows the documents accepted for India). Confirmed intended behavior, not a documentation inconsistency.
- **Backend-type distinction (the original four-item-vs-five-item question).** Christopher gave a definitive answer: National ID and Identification Card (ID) share one backend `document_type` — `ID Card` — because the vendor cannot reliably distinguish them; they are not two entries but one. "Local ID" names the same document, and that label is retired in favor of "Identification Card." This directly resolves the "four-item or five-item" question in the §3 table (the canonical backend model has exactly four types) and reconfirms the SUPERSEDED row already present in §3 for the related "Are National ID and Identification Card the same type?" question. The backend stores the vendor's `document_type` value; `document_type_label` is display-only and may vary by country or locale, so differing on-screen labels across countries are expected, not a defect. All four accepted document types — Passport, ID Card, Driver's Licence, Residence Permit — follow the same verification gate logic and produce the same verified status.

**Residual note, not a confirmed defect:** only the United States instance of the four Figma screen instances Observation 7 references has been directly inspected (via the now-superseded screenshot discussed above); the other three have not been individually inspected. It is not confirmed whether any of them displays "National ID" and "Identification Card" as two separate, selectable items on the same screen — a UI-level verification question distinct from, and not addressed by, the backend-type resolution above. No country-specific accepted-document list is invented or assumed for any of the three uninspected instances, and this is tracked as a completeness note, not an open contradiction. The §3 "five-item, Resolved" row and the original §7.3 Observation 7 text are both left untouched, per this engagement's preserve-history convention — the correction of record is the SUPERSEDED row in §3 plus the two dated notes on Observation 7.

## 7. What is deliberately not in this folder

This folder does not include: outdated/original (pre-update) versions of any document, intermediate drafts, the Final Cross-Document Audit report, the prior Correction 1/2/5 change reports, frontend documents, or Figma exports. No sensitive credentials, secrets, or environment-variable values are included anywhere in this folder. `Identity_Verification_Answers.docx` and `Technical_Requirements_Verification_Gates2.docx` (Christopher's two source documents for this update), and the traceability matrix and correction plan that this round's work was built from, are also not included in this specific handoff folder — the matrix (Revision 3) accompanies this package as a separate deliverable.

## 8. Prior open items now resolved by this update

Every contradiction Round 6's audit found and reported as outstanding — the Decision Record §6.1 Age rejection row, Data Dictionary row 64, Doc 02's SVC-15 and SVC-33 entries, and Doc 09's three FAILED_FINAL-terminality occurrences — is resolved by this round. These are no longer tracked as open. CI-11 (Section 6 above) was the only item carried forward as unresolved out of Round 7; it was not previously tracked by Round 6's audit, since it was surfaced by the Round 6→7 traceability-matrix build, not by Round 6's own pattern-based sweep. All three of CI-11's components were subsequently confirmed resolved across two post-Round-7 updates on 18 September 2026 — see Section 6 for the full resolution and its one non-blocking residual note.

## 9. Related materials (not included here, available on request)

- `IDENTITY_VERIFICATION_UPDATE_18SEP2026_CHANGE_REPORT.md` — included in this folder; full before/after detail for every document changed across all seven rounds.
- `Identity_Verification_Traceability_Matrix_2026-09-18.xlsx` (Revision 3) — the complete 338-row requirements traceability matrix underlying this round's corrections, updated to reflect every Round 7 fix; available as a separate deliverable alongside this package.
- `IDENTITY_VERIFICATION_CORRECTION_PLAN_2026-09-18.md` (Revision 2) — the approved correction plan this round's work was built from.
- `IDENTITY_VERIFICATION_DOCUMENTATION_UPDATE_PLAN.md` — the Round 1 approved plan.
- `IDENTITY_VERIFICATION_FINAL_CROSS_DOCUMENT_AUDIT.md` — the pre-engagement audit referenced in earlier rounds.
