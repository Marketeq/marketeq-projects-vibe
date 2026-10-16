__01 — IDENTITY VERIFICATION TECHNICAL ARCHITECTURE__

__*Update — 31 August 2026 \(Identity Verification Decision Record\): OPEN\-01 resolved — Didit selected as the vendor \(document verification, liveness, face match, registry validation in one API\)\. Persona is no longer part of this flow \(Section 9 rewritten\)\. Retry limit changed from ten attempts to three\. UX\-03 resolved \(Section 14 — deterministic block, not a flag\)\. Internal review \(Section 13\) re\-examined against the Decision Record's confirmed "no manual review" position\. Vendor coverage, pricing, certifications, and webhook\-consumption pattern added \(Section 10\)\. See the final section for a consolidated list of what changed\.*__

__*Update — 16 September 2026 \(Backend Documentation Review, Document 01 only\): Added four items sourced to Technical Requirements — Verification Gates: the state\-transition model with its two unresolved\-recovery open items \(Section 2\), the gate\-predicate / G1–G6 responsibility boundary \(Section 2\), the consumer\-scoped data\-exposure contract \(Section 15\), and account\-enumeration protection for duplicate detection \(Section 14\)\. No other content in this document was changed\. Three corrections identified during this review \(Section 9's reconciliation framing; the outstanding\-question count in Section 10 and in the footer\) remain on hold pending confirmation of which Identity Verification Decision Record copy is authoritative\.*__

__*Update — 18 September 2026 \(corrects a contradiction flagged in the 18 September 2026 backend documentation update’s cross\-document consistency audit, Section 3b\): Section 2’s gate\-predicate description below was carried forward unchanged from the 16 September 2026 review and is now stale\. Technical\_Requirements\_Verification\_Gates2\.docx \(“TRVG2”\) and Christopher’s direct answers \(Answer 3\) replace the single is\_verified\(account\)\-only predicate and six gates \(G1–G6\) with gate\_open\(account\) := is\_verified\(account\) OR in\_grace\(account\) across nine gates \(G1–G9, TRVG2 §2\), and remove profile\.completeness from gating entirely — the in\_marketplace\(account\) condition described below no longer applies\. This service still does not compute or enforce any gate itself; only the exposed predicate and gate list change\. The original Section 2 text is left in place below, marked superseded, rather than rewritten, so the prior description remains visible\.*__

__*Update — 18 September 2026, second correction this date \(corrects a further contradiction Christopher asked to have fixed after reviewing the first correction above\): Section 3’s bullet on FAILED\_FINAL/BLOCKED\_DUPLICATE/BLOCKED\_AGE terminality was also carried forward stale from the 16 September 2026 review\. TRVG2 §3 and Christopher’s Answer 11 confirm FAILED\_FINAL and BLOCKED\_AGE both clear automatically \(a 24\-hour cooldown and eligible\_on respectively\); only BLOCKED\_DUPLICATE never clears\. The original bullet is left in place below, marked superseded, rather than rewritten\.*__

This document is SOP B Doc 01, building on the confirmed scope in 00 — Identity Verification Service Overview\. It resolves OPEN\-03 as an engineering architecture decision and defines the technical boundaries needed to begin implementation\. OPEN\-01 \(the document\-verification vendor\) is separately resolved by the Identity Verification Decision Record \(31 August 2026\) — Didit is selected — a Product/vendor decision, not an engineering one; this document incorporates that resolution throughout\. All Product\-owned behavior not addressed by that Decision Record remains exactly as unresolved as it was before\.

# __1\. Architecture Decision & Service Boundary__

__Engineering decision \(this document\): __Identity Verification is implemented as a standalone service, identity\-verification\-service, added under /apps/ per Marketeq's established monorepo convention \(Architecture Overview §3\.1–§3\.2\) — not as a module inside user\-service, auth\-service, or any other existing service, and not split across multiple existing services\. This resolves OPEN\-03 \(Gap Resolution Record §4\) as an engineering architecture decision\. It is not a Product decision and does not by itself establish any user\-facing behavior\.

__Rationale, drawn from the Step 5 comparative analysis:__

- __Bounded domain ownership — __the capability owns a materially distinct domain \(verification status, government\-ID document submissions, travel/relocation declarations, attempt/audit history, duplicate\-document blocks\) that maps onto no existing service's current domain \(00 — Service Overview §5\)\.
- __Government\-ID/PII security boundary — __consolidating this domain into one schema and one credential set minimizes how many existing, unrelated services must carry PII\-handling code inside their trust boundary\.
- __Reduced blast radius — __an incident here doesn't automatically expose, or get exposed by, unrelated activity in a large, actively\-developed existing service\.
- __One authoritative verification owner — __identity and location verification status remain two independently tracked, individually authoritative conditions \(00 — Service Overview §6\), better served by one owning service than an answer assembled across several\.
- __Vendor isolation — __the selected verification vendor \(Didit\) is a volatile external dependency, best isolated behind one boundary \(Section 10\)\.
- __Auditability — __a dedicated service gives the confirmed internal\-review capability and attempt/audit history a narrow, coherent surface to secure and audit\.
- __Consistency with Marketeq's established pattern — __six of Marketeq's most recently added services \(cms\-, legal\-, pricing\-, scheduling\-, wallet\-, wire\-review\-service\) were added as standalone services for new domains \(Architecture Overview §4\); this is the platform's dominant recent pattern, not the exception\.

This decision does not resolve OPEN\-01, which is separately resolved by the Identity Verification Decision Record \(Section 10\)\.

__Independently reconfirmed from the Product side: __the Decision Record states, “No identity verification service currently exists\. A new one is to be created” \(Decision Record §6\.2\), and directs engineering to first confirm nothing equivalent already exists under another name in the Technical Documentation Overview before building \(Decision Record §7\.2, Q6\)\. That confirmation step has not been separately performed by this document and should be completed before implementation begins\.

# __2\. Responsibilities Owned by identity\-verification\-service__

- Location\-verification orchestration and home\-country confirmation processing using country\-level location signals obtained through the LocationProvider boundary\.
- Travel/Relocation classification \(Temporarily Traveling / Permanently Relocated\)\.
- Travel Mode state and reminder scheduling\.
- Permanent\-relocation routing into location/document proof verification\.
- Document intake \(type, issuing country, number, expiration, issuing state, image reference\)\.
- Manual\-entry validation orchestration \(delegated to Didit, the selected vendor — OPEN\-01 resolved\)\.
- Expired\-document rejection at point of entry\.
- Automated scan\-decisioning and three\-attempt retry\-limit enforcement \(revised from an earlier ten\-attempt figure\); the vendor's automated decision is final apart from retry, with no manual\-review step \(Decision Record §1\.3, §6\.1\)\.
- Identity Verification Status and Location Verification Status tracking \(two independent, extensible\-field flags — Decision Record §5, Q8\)\.
- Identity Verification Status transitions per the state model defined in Technical Requirements — Verification Gates §1\.2 \(“Status enumeration”\) and §3 \(“State Transitions”\): UNSTARTED → IN\_PROGRESS \(session created\) → PENDING \(submitted to vendor\) → VERIFIED \(vendor approves\); from PENDING the status may instead transition to FAILED \(vendor rejects, attempt\_count < 3\), FAILED\_FINAL \(vendor rejects, attempt\_count = 3\), BLOCKED\_DUPLICATE \(duplicate document\_ref detected\), or BLOCKED\_AGE \(date of birth under 18\)\. FAILED returns to IN\_PROGRESS on a new session \(retry\)\. VERIFIED transitions to EXPIRED when document\_expires\_on is reached — time\-driven, a scheduled evaluation against document\_expires\_on rather than a check performed only at login\. EXPIRED returns to IN\_PROGRESS on a new session and, on vendor approval, restores to VERIFIED with the prior published state restored automatically\. attempt\_count increments on transition into FAILED \(not on session creation\) and resets to 0 on transition into VERIFIED\.
- Whether FAILED\_FINAL, BLOCKED\_DUPLICATE, and BLOCKED\_AGE remain permanently terminal, or eventually support a path out, is an open product decision per Technical Requirements — Verification Gates §8\.1 and §8\.2 \(“Open Items”\) — not yet resolved, though a time\-based reset is noted there as the lowest\-cost option under consideration\. This document treats these three states as terminal only for the current release, consistent with TRVG's own current specification, and does not resolve the open question itself\. \[Superseded, 18 September 2026: this is now resolved\. TRVG2 §3 confirms FAILED\_FINAL clears automatically once a 24\-hour cooldown interval elapses \(attempt\_count resets to 0, status returns to UNSTARTED\) and BLOCKED\_AGE clears automatically once eligible\_on is reached \(status returns to UNSTARTED\) — both are the time\-based reset this document’s original text described only as “under consideration\.” BLOCKED\_DUPLICATE remains the one state of the three that never clears — TRVG2 confirms it as a deliberate, permanent one\-account\-per\-person block, not an oversight\. See Doc 02 SVC\-18 and Doc 03 §8b for the same resolution reflected in the backend documentation\.\]
- Duplicate/reused\-document deterministic blocking \(scope limited — Section 14\) — resolves UX\-03\.
- Verification attempt/audit history logging, including attempt counts against the three\-attempt limit\.
- Consumption of the selected vendor's \(Didit\) bundled document\-verification\-plus\-biometric session \(scope limited — Section 9\)\.
- Consuming vendor verification sessions via HMAC\-signed webhook, not polling \(Decision Record §6\.2\)\.
- Notification\-event emission for verification/travel\-related occurrences\.
- Exposure of verification status to other platform services \(Section 5\)\.
- This exposure is scoped to a single gate predicate this service computes and exposes: is\_verified\(account\) := identity\_status == VERIFIED AND location\_status == VERIFIED \(Technical Requirements — Verification Gates §2, “Gate Evaluation”\)\. Gates evaluated from this predicate include marketplace visibility \(G1\), team\-listing publish \(G2\), job application \(G3\), receive\-offers \(G4\), team\-roster membership \(G5\), and owner management view \(G6\) \(Technical Requirements — Verification Gates §2, “Gate Evaluation”\)\. Three of these \(G1, G3, G5\) are defined against a broader in\_marketplace\(account\) condition that also depends on profile completeness — data this service does not own\. This service does not itself enforce any consuming service's gate; it exposes the predicate for consuming services to evaluate at their own action endpoints \(Technical Requirements — Verification Gates §2, §4\.1\), consistent with the responsibility boundary established in 00 — Service Overview, items 15–16\. Which platform service owns each gated endpoint is not established by any source and is not asserted here\. \[Superseded, 18 September 2026: this predicate and gate list are retired\. TRVG2 §2 and Christopher’s Answer 3 replace them with gate\_open\(account\) := is\_verified\(account\) OR in\_grace\(account\) — in\_grace\(account\) := expired\_at is set AND fewer than 30 days have elapsed since it — evaluated across nine gates: G1 marketplace discovery, G2 publish any listing, G3 apply for a job, G4 receive/accept an offer, G5 client\-facing roster, G6 owner management view \(ungated\), G7 accept an invitation \(gated at acceptance\), G8 log time, G9 withdraw earnings\. Profile\.completeness and the in\_marketplace\(account\) condition described above no longer participate in gating at all\. This service still does not itself compute or enforce any gate; only what it exposes has changed\. See Doc 02 SVC\-20 and Doc 03’s revised schema for the full detail\.\]

# __3\. Responsibilities Explicitly NOT Owned__

- Facial/biometric capture, matching, or storage — owned entirely by the selected vendor, Didit \(Section 9\)\.
- Document\-authentication/validation logic itself — owned by Didit, the selected vendor, behind the DocumentVerificationProvider boundary \(Section 10\)\. OPEN\-01 is resolved\.
- Precise, coordinate\-based location for profile display — remains with the existing profile/location capability \(today, user\-service\) and, eventually, the planned Location Service's coordinate\-based endpoint; this service consumes country\-level resolution only \(Section 11\)\.
- Login/session issuance — remains with auth\-service\.
- General\-purpose notification delivery mechanics \(Ably/SendGrid dispatch, preferences, unread counts\) — remains with notification\-service; this service only emits events into that pipeline\.
- The role, permission model, and UI for internal\-team review — undefined by any source; Section 13 addresses only the technical surface, and now also the open question of whether it still applies at all\. \[Superseded, 18 September 2026: this is now resolved, not open — Doc 02 SVC\-24 / TRVG2 §6\.1 / Christopher's Answer 4 confirm a read\-only internal status endpoint \(status, attempt\_count, timestamps, coarse failure reason\) that coexists with the automated decision pipeline; it is visibility\-only and does not expose submitted identity documents\. See the "Unresolved Product/external dependencies" entry near the end of this document for the fuller correction\.\]
- Manual/human review of verification decisions — none exists this sprint; the vendor's automated decision is final apart from retry \(Decision Record §1\.3\)\.
- Help desk/escalation design for failed or rejected verifications — explicitly out of scope this sprint; no design exists \(Decision Record §1\.3, §8\)\.
- Any connection to payment\- or compliance\-specific verification elsewhere on the platform \(e\.g\., wire\-review\-service's EDD/OFAC checks\) — no source connects them\.

# __4\. Interactions with Existing Marketeq Services__

- __auth\-service — __candidate future login\-time integration point for a verification\-status check; not implemented anywhere on the platform today\.
- __user\-service — __today's closest existing owner of location/timezone data; this service depends on the LocationProvider boundary \(Section 11\) rather than duplicating or replacing that ownership\.
- __notification\-service — __consumes events emitted by this service via its existing RabbitMQ pipeline; category/integration specifics remain undecided \(already flagged as such in Doc 00, unchanged here\)\.
- __Callers gating platform actions — __read verification status via REST \(Section 5\); the specific calling services are not enumerated in any source and are not invented here\.
- __api\-gateway — __candidate owner of the X\-Forwarded\-For fix \(Section 12\) — a recommended default, not a confirmed integration\.
- __admin\-service — __candidate integration point for internal review, if that capability still applies \(Section 13\) — a recommended default, not a confirmed integration\.
- __Didit \(external, selected vendor\) — __bundled document verification, liveness, and face match in a single session \(Section 9, 10\)\.
- __Planned Location Service \(not yet built\) — __potential future implementation behind LocationProvider \(Section 11\); the relationship is deliberately kept replaceable, not a dependency\.

# __5\. Synchronous REST vs\. RabbitMQ Event Usage__

__Engineering decision: __both, for different purposes\.

- __REST — __synchronous, point\-in\-time reads of Identity Verification Status and Location Verification Status, for callers needing an immediate answer at the moment of a gated action\.
- __RabbitMQ events — __published on state changes \(Travel Mode activated, verification submitted, verified, home country updated\), consumed by notification\-service and any other interested consumer, rather than requiring polling\.

This mirrors the pattern already used platform\-wide rather than introducing a new communication style\. Separately, this service consumes the verification vendor's own result via an inbound HMAC\-signed webhook rather than polling \(Section 10\) — a third, asynchronous integration pattern distinct from the two above\. \[Updated 21 September 2026: the five\-question technical resolution \(Q3\) proposes amq\.topic as the exchange and a three\-segment routing key as the convention for these events — an engineering decision, made under Christopher's SOP guidance\. Whether notification\-service actually binds to amq\.topic remains an unconfirmed dependency, unchanged by this update\.\]

# __6\. Technology Stack__

Established Marketeq convention, applied without deviation: Node\.js / TypeScript, NestJS, TypeORM \(explicit precedent in Notification Service documentation\)\. No new language, framework, or ORM is introduced\.

# __7\. Persistence Recommendation__

__Recommended default \(pending Infrastructure/Security confirmation\): __the shared Supabase PostgreSQL instance used by every other Marketeq service, in a dedicated schema scoped to identity\-verification\-service, consistent with the Architecture Overview's stated model\.

This is a recommended default, not confirmed Marketeq policy for PII\-class data specifically — no source states whether this data requires physical database isolation, and none is asserted here\.

# __8\. Document/Object\-Storage Recommendation__

__Recommended default \(pending Infrastructure/Security confirmation\): __Cloudflare R2 — the platform's established object\-storage choice, already used for a comparably sensitive document class \(legal\-service's NDAs\) — in a bucket/prefix dedicated to this service, access\-restricted to its own credentials\.

Reinforced by the Decision Record: document images are stored and attached to the user's account by this service — the vendor does not retain them \(Decision Record §4\)\. No source documents actual retention duration beyond “deleted with the account” \(Section 15\), encryption\-at\-rest configuration, or access\-list policy for this data class, and none further is asserted here\.

# __9\. Face Match & Liveness Boundary \(Didit\)__

__Superseded by the Identity Verification Decision Record \(31 August 2026\): __the earlier Persona\-based boundary described in prior drafts of this document no longer applies\. Face match and liveness are now provided by Didit, the selected verification vendor, bundled into the same session as document verification \(Decision Record §2, §4\)\. No biometric data is stored by this service; it remains with Didit under the vendor's own policy\.

The existing frontend design's separate, Persona\-branded “ID not verified” gating modal and hosted hand\-off screen have not yet been reconciled to this single\-session model — that reconciliation is an explicit open design item \(Decision Record §7\.3, Q8–Q9\), not resolved by this document\.

# __10\. DocumentVerificationProvider Boundary — Didit \(OPEN\-01 Resolved\)__

__OPEN\-01 is resolved: __Didit is the selected vendor \(Identity Verification Decision Record, 31 August 2026\), covering document verification, liveness, face match, and — where the vendor holds a government data source — registry validation, under a single API\.

__Engineering recommendation \(retained\): __keep the DocumentVerificationProvider interface as the integration boundary rather than calling Didit's API directly from domain code, even though a vendor is now selected\. The Decision Record itself flags a live vendor\-risk factor: Didit is an early\-stage company \(a recent $7\.5M seed round\), with certification maturity and company maturity called out as distinct risks, and data portability/exit terms still unconfirmed \(Decision Record §2\.4\)\. An adapter boundary keeps a future vendor swap a contained change rather than a rewrite\.

__Verification depth__

Verification runs at two depths, both counted as fully verified \(Decision Record §1\.2\):

- __Registry Validated — __document data is checked against the authoritative government registry that issued it \(civil registry, tax authority, electoral roll, or biometric registry\), available only where the vendor holds that government data source\.
- __Authenticated — __barcode decode \(PDF417\), MRZ check\-digit validation, NFC chip read where present \(ICAO\-compliant e\-passports/eIDs\), OCR plus tamper detection against a 14,000\+ template library, and face match with liveness — no registry lookup\. Applies everywhere else\.

The vendor runs its own read fallback chain \(barcode → MRZ → NFC → OCR\); a document with no barcode still verifies via MRZ, and a document with neither still passes through OCR and authenticity checks\. No part of this chain is built by this service \(Decision Record §2\.2\)\.

__Session and webhook consumption__

This service consumes vendor verification sessions and verifies HMAC\-signed webhooks rather than polling \(Decision Record §6\.2\)\.

__Coverage, pricing, and certifications \(as published — confirm before commitment, Decision Record §2\.1\)__

- 220\+ countries, 14,000\+ document types, 130\+ languages \(Decision Record §2\.3\)\.
- SOC 2 Type I and II, ISO/IEC 27001:2022, iBeta Level 1 PAD, GDPR, HIPAA, eIDAS 2\.0, MiCA, AMLD6, DORA\-aligned \(Decision Record §2\.3\) — these are the vendor's own certifications, covering data the vendor processes and retains\.
- Per\-module pricing: ID Verification \(document only\) $0\.15; Passive Liveness $0\.10; Face Match 1:1 $0\.05; Device & IP Analysis $0\.03; AML Screening $0\.20; Database/registry validation from $0\.05 \(varies by country\); Full KYC bundle $0\.33 per session \(Decision Record §2\.1\)\.
- Free tier: 500 full\-KYC verifications per month, ongoing, no minimum commitment or annual contract \(Decision Record §2\.1\)\.

__Nine outstanding questions do not block this document: __five for the vendor \(does pricing apply to failed attempts; per\-country registry\-validation coverage and pricing; whether the vendor's optional manual\-review feature is strictly opt\-in and can be fully disabled; which of several published coverage numbers — 220\+, 230\+, 147 — is document vs\. registry coverage; data export and exit terms\), one for engineering \(confirm no equivalent service already exists under another name before building — Decision Record §7\.2, Q6\), and three for design \(Decision Record §7\.3, Q7–Q9\)\.

# __11\. LocationProvider Boundary & Relationship to the Planned Location Service__

__Engineering recommendation: __this service does not implement IP geolocation itself\. It depends on a LocationProvider interface exposing country\-level resolution only \(not precise/coordinate\-based location, out of scope per Section 3\)\.

No consolidated location service exists today \(location\-service\-migration\-plan\.md — not yet started\)\. Two independent existing implementations exist elsewhere \(user\-service's and earnings\-service's IP\-to\-country logic\); the Migration Plan identifies earnings\-service's copy as the weaker of the two\. The first concrete LocationProvider implementation should call into the existing, comparatively stronger logic — this document does not introduce a third copy of geoip\-lite or extractClientIp\.

__One engineering option, not decided or assumed approved here: __extracting the stronger existing implementation into Marketeq's /shared folder so both the interim caller and this service depend on one copy\. This would need light coordination with whoever owns user\-service/earnings\-service and is presented purely as an option\.

When the planned Location Service ships \(starting with its own Phase 1 — “stand up the service, change no behavior”\), only the concrete implementation behind LocationProvider changes, to call the new service's endpoint\. This service's own domain logic does not change\. No dependency on the Location Service's delivery schedule is introduced\.

# __12\. X\-Forwarded\-For Trust Boundary & VPN/Proxy Signal Consumption__

These are two separate ownership questions and are not grouped into one decision\.

__X\-Forwarded\-For trust\-boundary fix — recommended default \(pending Infrastructure/Security confirmation\): __belongs at the platform's edge/gateway layer \(api\-gateway\), the actual trust boundary for every service, not just this one\.

__VPN/proxy detection — consumed, not owned, by this service\. __Identity\-verification\-service consumes a VPN/proxy detection signal as an input to its verification logic but does not itself own or implement the detection mechanism\. Which shared platform component produces that signal is undecided\. Candidates include api\-gateway and, potentially, the planned Location Service, since other services \(earnings\-service, scheduling\-service\) already touch IP\-derived signals per the Migration Plan — but neither is established as the owner by any source, and the planned Location Service is not presumed to be the eventual owner\. The selected verification vendor \(Didit\) also offers a Device & IP Analysis module \(connection geolocation and device fingerprinting\) as part of its pricing catalogue \(Decision Record §2\.1, §8\) — a newly\-known candidate worth evaluating for this purpose, though it is not established as the producer of this signal by any source, and the Decision Record's own notes are explicit that this module is not proof of address \(a separate module, using utility bills or bank statements\)\. This document does not select an owner\. \[Updated 21 September 2026: the five\-question technical resolution \(Q4\) proposes identity\-verification\-service’s own backend team as the owner of VPN/proxy detection, with a MaxMind GeoIP2 Anonymous IP\-style feed recommended — an engineering decision, made under Christopher's SOP guidance, and not decided by this document\. Vendor selection and cost remain unresolved dependencies\.\]

# __13\. Internal\-Review Technical Recommendation — Re\-Examine Against “No Manual Review”__

__This section's premise needs re\-examination in light of the Identity Verification Decision Record \(31 August 2026\): __“No manual review\. The AI reviewer is the final decision\-maker\. Help desk escalation is out of scope for this sprint\.\.\. no escalation path of any kind: a rejection is final apart from retry” \(Decision Record §1\.3\)\. This directly rules out any manual review, approval, or override step inside the verification\-decision pipeline this sprint\.

What remains unresolved is whether Christopher's earlier SOP B Step 2 confirmation — that an internal team can review verification status and submitted documents — describes a separate, visibility\-only capability \(for example, for support or audit purposes\) that still exists alongside the automated decision pipeline, or whether it has been effectively superseded by the Decision Record's “no manual review\.\.\. of any kind” language\. No source resolves this directly, and it should be confirmed with Christopher before any internal\-review surface is built\. \[Superseded, 18 September 2026: this section's premise is now resolved — Doc 02 SVC\-24 / TRVG2 §6\.1 / Christopher's Answer 4 confirm the visibility\-only capability described above coexists with the "no manual review" decision pipeline: a read\-only internal status endpoint exposing status, attempt\_count, timestamps, and a coarse failure reason, with no access to submitted identity documents, document images, raw vendor payloads, or document\_ref\. See the "Unresolved Product/external dependencies" entry near the end of this document for the fuller correction\.\]

If a visibility\-only surface is still wanted, the previous recommendation stands as a starting point: a narrow, internal\-only endpoint set exposed by identity\-verification\-service itself, restricted to internal auth, with integration into the existing admin\-service as a candidate alternative — not decided here, and not to be confused with, or used to build, any decision\-making/override capability, which the Decision Record rules out for this sprint\.

# __14\. Duplicate\-Document Detection — Resolved \(UX\-03\)__

__Resolved by the Identity Verification Decision Record \(31 August 2026\): __a document already on file against a different account is a deterministic block, not an AI review case — “no AI evaluation required” \(Decision Record §6\.1\)\. The submitting user is told an account already exists and is pointed to account recovery\. This resolves UX\-03, previously an undefined flag with no automatic consequence\.

This service remains the natural place to hold this check, since it already stores the submitted documents needed for comparison\. The specific detection mechanism \(exact match vs\. similarity matching\) is not decided by any source — the Decision Record confirms the block is deterministic \(“one account per person makes this unambiguous”\) without specifying the underlying match technique\.

Per Technical Requirements — Verification Gates §6\.1 \(“Account enumeration”\), the duplicate\-block response must not identify the account holding the conflicting document — not its email address, a masked address, a profile name, or a handle; the response states only that the document is already in use\. The submission endpoint must be rate\-limited so repeated submissions cannot be used to probe which documents exist in the system\.

# __15\. Security/PII Boundaries__

- No biometric data is stored by this service \(Section 9\)\.
- Document images and structured document data are the most sensitive data this service stores; Sections 7–8 propose recommended defaults for their persistence, pending Infrastructure/Security confirmation\.
- __The automated, vendor\-driven document\-decisioning pipeline \(Section 10\) has no manual\-review step this sprint \(Decision Record §1\.3\)\. __Whether the separately\-confirmed internal\-team review capability \(Section 13\) is a visibility\-only capability coexisting with it, or has been superseded by it, remains unresolved and is not assumed either way by this document\. \[Superseded, 18 September 2026: this is now resolved — Doc 02 SVC\-24 / TRVG2 §6\.1 / Christopher's Answer 4 confirm Section 13's internal\-team review is a visibility\-only capability coexisting with the decision pipeline, exposing only status, attempt\_count, timestamps, and a coarse failure reason, with no document access\. See the "Unresolved Product/external dependencies" entry near the end of this document for the fuller correction\.\]
- __Retention: __documents are deleted when the account is deleted; no AML\-style retention obligation applies given the product's confirmed non\-regulated status, though general data\-protection obligations still apply \(Decision Record, Regulatory Status; §5 Q5\)\.
- The selected vendor \(Didit\) holds SOC 2 Type I/II, ISO/IEC 27001:2022, GDPR, HIPAA, eIDAS 2\.0, and other certifications \(Decision Record §2\.3\) — these cover data the vendor processes and retains; they are not a substitute for this service's own security/PII posture over what it stores directly\.
- No field\-level encryption product, KMS vendor, or compliance framework beyond the above is asserted \(Section 19\)\.
- Data exposure at the REST boundary \(Section 5\) is scoped per consumer type, per Technical Requirements — Verification Gates §6 \(“Data Exposure”\): a hiring client may receive only whether the hire action is open or closed — never the underlying status value, failure reason, attempt\_count, age\-block or duplicate\-block state, document data, or the reason a profile is unhireable\. A team owner may receive each member's gate result and a coarse state indicator — never member documents, failure reasons, attempt\_count, or date of birth\. The account holder may receive their own status and remaining attempts — never raw vendor payloads or the internal document reference\. This is an API contract requirement, not a presentation\-layer concern, and applies regardless of which consuming service is calling\.

# __16\. Proposed Folder/Module Structure__

Per Marketeq's established folder policy \(all code under /apps/<service>/src; shared code under /shared; no cross\-imports between services' src\):

apps/identity\-verification\-service/  
├─ Dockerfile  
├─ Supabase\.yaml  
├─ package\.json  
└─ src/  
   ├─ app\.module\.ts  
   ├─ main\.ts  
   ├─ location/  
   │  ├─ location\.module\.ts  
   │  └─ location\-provider\.interface\.ts        \(LocationProvider boundary — §11\)  
   ├─ travel/                                   \(travel/relocation classification, Travel Mode\)  
   ├─ documents/  
   │  ├─ document\-verification\-provider\.interface\.ts   \(§10 — Didit\-backed\)  
   │  ├─ intake/  
   │  ├─ manual\-entry/  
   │  └─ duplicate\-detection/                   \(§14 — deterministic blocking\)  
   ├─ verification\-status/                      \(Identity/Location Verification Status\)  
   ├─ verification\-vendor/                      \(§9, §10 — Didit session \+ face match/liveness\)  
   ├─ webhooks/                                  \(§10 — HMAC\-signed vendor webhook consumption\)  
   ├─ internal\-review/                          \(§13 — if still needed; confirm with Christopher\)  
   ├─ audit/                                    \(attempt/audit history, 3\-attempt tracking\)  
   ├─ events/                                   \(RabbitMQ publishers — §5\)  
   ├─ controllers/  
   ├─ entities/  
   ├─ dto/  
   └─ config/

This mirrors the module\-per\-domain shape already used in notification\-service \(events/, ably/, sendgrid/, preferences/\) and content\-moderation\-service \(moderation/, duplicate\-detection/\)\. The specific module names are this document's organizational proposal, not a confirmed Marketeq requirement\.

# __17\. Packages/Dependencies__

Justified only by existing convention or the architecture above:

- @nestjs/\* core packages, typeorm — platform\-standard\.
- class\-validator / class\-transformer — platform\-standard for DTO validation \(Architecture Overview §7\.1\)\.
- Marketeq's existing RabbitMQ messaging client/abstraction — for event publication \(Section 5\); exact package selection should follow whatever the repository already uses elsewhere\. No specific package name is confirmed in the reviewed documentation\.
- Marketeq's existing R2\-compatible storage client/pattern — for document storage \(Section 8\); exact package selection should follow repository precedent\. No specific package name is confirmed in the reviewed documentation\.
- Didit's official SDK/client library, if one exists and fits the HTTP\-client conventions already used elsewhere in the monorepo — to be evaluated against a plain HTTP\-plus\-webhook integration; no specific package is confirmed by any source\.
- HMAC signature verification for inbound vendor webhooks \(Section 10\) — standard Node crypto module; no new package is required for this alone\.
- No new database, cache, queue, or search technology is introduced\. No KMS client or biometric library is named — these depend on Infrastructure/Security decisions not yet made\.

# __18\. Deployment/Runtime Relationship to the Existing Platform__

- One independently deployable service within the existing marketeq\-projects\-nestjs monorepo, following the platform's Supabase\-based deployment notes: container port matching PORT, health check at /health, env vars configured per\-service\.
- __Confirmed source: __the Architecture Overview explicitly states, “Standard path is GitHub Actions → Supabase per service” \(§10, CI/CD Notes\), also noting some services may be manually deployed, with exact steps documented per service\. This document follows that standard path and does not introduce a new deployment platform, orchestrator, or CI/CD pattern\.
- An older per\-service document \(Notification Service, “Adding the Notification Service to the Monorepo”\) describes a different, Docker\-Compose\-based pattern; this architecture follows the more recent, currently\-documented Supabase/GitHub\-Actions convention instead — the discrepancy already flagged during the Step 5 assessment\.

# __Architecture Decisions & Pending Confirmations__

__Established by existing Marketeq architecture \(not decided in this document\):__

- Monorepo structure, /apps/<service>/src, /shared policy\.
- NestJS \+ TypeScript \+ TypeORM; shared Supabase Postgres; RabbitMQ; Ably/SendGrid; Cloudflare R2\.
- Supabase\-based deployment convention \(/health, PORT\)\.
- GitHub Actions → Supabase as the standard CI/CD path, per Architecture Overview §10 \(verified direct quotation\)\.
- The planned Location Service's existence, phasing, and stated purpose — not yet built\.

__Resolved by Product/vendor decision \(Identity Verification Decision Record, 31 August 2026\) — not engineering decisions:__

- __OPEN\-01 resolved: __Didit selected as the document\-verification, liveness, face\-match, and \(where available\) registry\-validation vendor \(Section 10\)\.
- Retry limit set to three attempts, replacing the earlier ten\-attempt figure \(Sections 2, 10\)\.
- __UX\-03 resolved: __duplicate documents are a deterministic block, not a flag with an undefined disposition \(Section 14\)\.
- No manual review or escalation path exists this sprint; a rejection is final apart from retry \(Section 13\)\.
- Minimum age 18, checked via the document's date of birth; under\-18 declined\.
- Documents are deleted on account deletion; no AML retention obligation applies, given the product's confirmed non\-regulated status\.
- One account per person is enforced\.
- Verification status is modeled as an extensible field, not a boolean\.
- Re\-verification is triggered by document expiry or suspicious activity, not a fixed calendar cycle\.

__Engineering decisions made in this Step 5 analysis:__

- __OPEN\-03 resolved: __standalone identity\-verification\-service \(Section 1\) — an engineering architecture decision, not a Product decision\.
- REST \+ RabbitMQ used together for status exposure, plus HMAC\-signed webhook consumption from the vendor \(Section 5, 10\)\.
- DocumentVerificationProvider adapter boundary retained even after vendor selection, given the Decision Record's own vendor\-risk note about Didit's early\-stage maturity \(Section 10\)\.
- LocationProvider adapter boundary, decoupling this service from the Location Service's delivery schedule \(Section 11\)\.
- This service is the architectural owner of duplicate\-document deterministic blocking \(Section 14\)\.
- Proposed folder/module structure \(Section 16\) and package categories consistent with existing convention, with exact package names left to repository precedent \(Section 17\)\.

__Recommended defaults pending Infrastructure/Security confirmation:__

- Shared Supabase Postgres instance, dedicated schema \(Section 7\)\.
- Cloudflare R2, dedicated bucket/prefix \(Section 8\)\.
- X\-Forwarded\-For trust\-boundary fix at the gateway/edge layer \(Section 12\)\.
- Producer of the VPN/proxy detection signal this service consumes — candidates now include api\-gateway, the \(not\-yet\-built\) Location Service, and the selected vendor's \(Didit\) Device & IP Analysis module; no owner is established \(Section 12\)\. \[Updated 21 September 2026: Q4 proposes identity\-verification\-service’s own backend team as the owner, with MaxMind GeoIP2 recommended — engineering decision, made under Christopher's SOP guidance; vendor and cost remain open\.\]
- Internal\-review technical surface, if the capability is still needed after confirming with Christopher whether it is superseded by the Decision Record's “no manual review” position — admin\-service as a candidate alternative, not decided \(Section 13\)\.
- Field\-level encryption/KMS approach — no specific product or vendor named \(Section 15\)\.
- Extraction of the interim LocationProvider implementation into /shared — an engineering option, not an approved plan \(Section 11\)\.

__Unresolved Product/external dependencies:__

- The role, permission model, and interface for internal\-team review — and now, prior to any of that, whether the capability still applies at all alongside the confirmed “no manual review” position \(Section 13\)\. \[Superseded, 18 September 2026: this is now resolved, not open — Doc 02 SVC\-24 / TRVG2 §6\.1 / Christopher's Answer 4 confirm the internal\-team review capability coexists with the “no manual review” decision pipeline as a visibility\-only read: a read\-only internal status endpoint exposing status, attempt\_count, timestamps, and a coarse failure reason only, with no access to submitted identity documents, document images, raw vendor payloads, or document\_ref\. The remaining open question is narrower than stated here: only the specific role, permission model, and interface for this capability remain unbuilt \(Section 13\); that the capability exists and is visibility\-only is no longer in question\.\]
- Sequencing/resourcing of the Location Service migration relative to this service's build — this architecture is deliberately indifferent to that timing \(Section 11\)\.
- Nine outstanding vendor/engineering/design confirmations from the Decision Record — none block this document but should be tracked to closure \(Section 10\)\.

