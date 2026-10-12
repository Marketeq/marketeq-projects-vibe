# Manifest — Identity Verification Backend Documentation Handoff (Round 7, CI-11 Final Update, 18 September 2026)

Prepared: 18 September 2026 (second CI-11 post-Round-7 update, using Christopher's definitive answer on the backend document-type question)
Folder: `Identity_Verification_Backend_Docs_ROUND7_CI11FINAL_2026-09-18`
Base package: `Identity_Verification_Backend_Docs_ROUND7_2026-09-18` (Round 7, 18 September 2026). Prior update: `Identity_Verification_Backend_Docs_ROUND7_CI11UPDATE_2026-09-18` (first CI-11 update — Birth Certificate finding and country-dependent-list confirmation). **Neither is overwritten; both remain available unchanged, including their own ZIPs.** This is a distinct, additional deliverable; it does not supersede Round 7 or the first CI-11 update, and none of the six earlier rounds (or the original upload) are overwritten either.

**Scope of this update: exactly one item, CI-11 — its final remaining component.** Nothing else changed. The first CI-11 update (see `Identity_Verification_Backend_Docs_ROUND7_CI11UPDATE_2026-09-18`) resolved the Birth Certificate finding and confirmed country-dependent accepted-document lists as intentional, but left one question open: whether the United States screen's canonical list counts Identification Card (ID) as an entry distinct from National ID. Christopher has since given a definitive answer, and this update applies it to the same three artifacts: the Decision Record, the traceability matrix, and the README. No backend code and no other documentation file changed.

**What this update resolved:** National ID and Identification Card (ID) share one backend `document_type` — `ID Card` — because the vendor cannot reliably distinguish them; they are not two entries but one. "Local ID" names the same document and that label is retired. The backend stores the vendor's `document_type` value; `document_type_label` is display-only and may vary by country or locale. The canonical accepted types remain exactly four: Passport, ID Card, Driver's Licence, Residence Permit. All four accepted document types follow the same verification gate logic and produce the same verified status (no weighting or scoring implied). This directly resolves the "four-item or five-item" question in Decision Record §3 and reconfirms the SUPERSEDED row already present there for the related "Are National ID and Identification Card the same type?" question.

**What remains as a residual, non-blocking note — not a confirmed defect:** only the United States instance of the four Figma screen instances Decision Record §7.3 Observation 7 references has been directly inspected. The other three have not been individually inspected, and it is not confirmed whether any of them displays "National ID" and "Identification Card" as two separate, selectable items on the same screen — a UI-level verification question distinct from the backend-type question resolved above. No country-specific accepted-document list is invented or assumed for any of the three uninspected instances. **CI-11 is now fully resolved on the documentation-consistency question it raised; this documentation is still not being declared final overall**, per instruction — see README Section 6 for the complete account.

This manifest is the authoritative record of exactly which file, at exactly which content state, is included in this handoff. It covers the same 16 files as the first CI-11 update package (12 numbered documents, the Data Dictionary, the Decision Record, the revised Unresolved Questions list, and the traceability matrix as a 16th file, included directly at Christopher's request). It does not include itself, `README.md`, or `IDENTITY_VERIFICATION_UPDATE_18SEP2026_CHANGE_REPORT.md`.

Checksums were computed directly against the files in this folder with `sha256sum`. The three changed files were individually validated before assembly: the Decision Record docx (`lxml` well-formedness, unescaped-ampersand scan, `validate.py --original` against the Round 6 baseline — paragraph count 262→264, unchanged from the first CI-11 update, confirming the new text was appended within an existing paragraph — and a `pandoc -t markdown` diff against the first-CI-11-update Decision Record confirming only the one intended `[Further update]` note was added); the traceability matrix xlsx (`openpyxl` load check, all 5 sheets and dimensions intact, status tally now 163 Correct/current, 73 Outdated-but-Annotated, 0 Outdated-Unannotated/Contradictory, 0 Needs Clarification, 74 Genuinely-open, 31 UNLISTED — 341 rows total); the README (diffed against the first-CI-11-update README, confirming only the CI-11-related passages changed).

| # | File | Revision date | Changed in this update? | SHA-256 |
|---|---|---|---|---|
| 1 | `00 - Identity Verification Service Overview.docx` | 18 September 2026 (Round 7) | No — unchanged since Round 7 | `eea4b8a3a001355c0769285c0890c869195d2be3dd04f6e5415b69848f2e6c01` |
| 2 | `01 - Identity Verification Technical Architecture.docx` | 18 September 2026 (Round 7) | No — unchanged since Round 7 | `bb1241ced2b1bf95c914995a4ceaf483603eedf39454a898eeb7cf5a46d189a2` |
| 3 | `02 - Identity Verification Feature List.docx` | 18 September 2026 (Round 7) | No — unchanged since Round 7 | `7caff560c1bafb093fa17d0e133565705bb3ef91d3384d80df9d54af9191c6d7` |
| 4 | `03 - Identity Verification Data Model & Database Schema.docx` | 18 September 2026 (Round 7) | No — unchanged since Round 7 | `a184d8dbb0505f6739f6394e7ccea0a2e7af00f166432c4f20d1c03999d6be33` |
| 5 | `04 - Identity Verification API Specification.docx` | 18 September 2026 (Round 7) | No — unchanged since Round 7 | `c5df3f0e1d98d6ed24030975d835c9369d84d7a22939c088fdafe172e84401ba` |
| 6 | `05 - Identity Verification Business Logic & Workflows.docx` | 18 September 2026 (Round 7) | No — unchanged since Round 7 | `1281380b3f966a114ea24405ff36ef1a809b972e21de7417f21b2c9bad2614bb` |
| 7 | `06 - Identity Verification Setup & Bootstrapping.docx` | 18 September 2026 (Round 7) | No — unchanged since Round 7 | `82a4f39382efcd2aa7c29324890a11ebd50dc7245435f0b8c52fda0bdec319a5` |
| 8 | `07 - Identity Verification Integrations & Events.docx` | 18 September 2026 (Round 1) | No — unchanged since Round 1 | `2f136f4a7795e562ce6df21cc2a0b30401b0eab3b1eedb352a03873e0ae7a799` |
| 9 | `08 - Identity Verification Monitoring & Observability.docx` | 17 September 2026 | No — unchanged since Round 7 | `e1af07d460907467482c87ae15dc53d495cc6084e7df95906c01b488042e3ffb` |
| 10 | `09 - Identity Verification Error Handling.docx` | 18 September 2026 (Round 7) | No — unchanged since Round 7 | `f347f679ba620ea22ac469c9eb1d89935105ee274a5c10efe3cb6ae3bcd440d9` |
| 11 | `10 - Identity Verification Security & Auth.docx` | 18 September 2026 (Round 7) | No — unchanged since Round 7 | `6669e371d7470b26e569fa1086beddec5ce8632b7c6e0f7863b92dacc6868d9a` |
| 12 | `11 - Identity Verification Performance Considerations.docx` | 18 September 2026 (Round 7) | No — unchanged since Round 7 | `4facb7837d957d24ce9e25fa3dd10834db981e90c272b15feb237d882d6193a7` |
| 13 | `Identity Verification Data Dictionary.xlsx` | 18 September 2026 (Round 7) | No — unchanged since Round 7 | `822ca0e650f9e183c091c5824a905691437fbe1b5855011eb70f860fb04010f7` |
| 14 | `Identity Verification Decision Record.docx` | 18 September 2026 (CI-11 final update) | **Yes** — §7.3 Observation 7 given a second, `[Further update, 18 September 2026]` note, appended after the existing `[Verified in part]` note; original §3/§7.3 text still unchanged (superseding-annotation convention preserved throughout) | `b76272c256b0cb0d8dc348393fe09d35cd9561d2f1d41b8dc6cfa6113493803c` |
| 15 | `Identity Verification Unresolved Questions (Revised 2026-09-18).docx` | 18 September 2026 (Round 1) | No — unchanged since Round 1 | `64509b6e474105d5058689310feaa4f6b77024f32898e1ebf68f554d6d5cebb9` |
| 16 | `Identity_Verification_Traceability_Matrix_2026-09-18.xlsx` (Revision 3) | 18 September 2026 (CI-11 final update) | **Yes** — row 318 (CI-11) Status changed from "Needs Clarification" to "Outdated-but-Annotated"; Note rewritten; Summary sheet tally and CI-11 narrative (A24, B20) updated to stay consistent | `52655f5e28f7bb4b992307ad4102c116b9d52d5044ffd02a2f5bcdf80a39c176` |

## Cross-package integrity verification

Files 1–13 and 15 above were confirmed byte-identical to their Round 7 package counterparts by direct SHA-256 comparison — carried forward, not touched, by this update. File 14 (Decision Record) and the README were also confirmed byte-identical to the versions already delivered in the first CI-11 update package, confirming this update built strictly on top of that one rather than reintroducing any earlier state.

All prior packages were independently re-verified untouched before this update's work began:

- **Original upload** (`Identity_Verification_Backend-20260916T172321Z-1-001.zip`) — untouched.
- **Round 1** (`Identity_Verification_Backend_Docs_UPDATED_2026-09-18.zip`, `final/`) — untouched.
- **Round 2** (`Identity_Verification_Backend_Docs_CORRECTED_2026-09-18.zip`, `corrected/`) — untouched.
- **Round 3** (`Identity_Verification_Backend_Docs_ROUND3_2026-09-18.zip`, `round3/`) — untouched.
- **Round 4** (`Identity_Verification_Backend_Docs_ROUND4_2026-09-18.zip`, `round4pkg/`) — untouched.
- **Round 5** (`Identity_Verification_Backend_Docs_ROUND5_2026-09-18.zip`, `round5pkg/`) — untouched.
- **Round 6** (`Identity_Verification_Backend_Docs_ROUND6_2026-09-18.zip`, `round6pkg/`) — untouched.
- **Round 7** (`Identity_Verification_Backend_Docs_ROUND7_2026-09-18.zip`) — untouched; md5 `b8fbf51465c84c9116c247cedc30004b` reconfirmed unchanged.
- **Round 7 CI-11 Update (first)** (`Identity_Verification_Backend_Docs_ROUND7_CI11UPDATE_2026-09-18.zip`) — untouched; md5 `48698d263e00c2d6094ae3751165dd37` reconfirmed unchanged.

This update's own folder and ZIP were assembled in a separate location. Only files 14 and 16 (plus this manifest) are new content; files 1–13 and 15 were copied byte-for-byte from the Round 7 package, and the README from the current working copy (already validated in the prior turn), without modification.
