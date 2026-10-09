__UX REQUIREMENTS — IDENTITY VERIFICATION__

*Decision Record*

__Epic__

Identity Verification

__Document Role__

Consolidated record of decisions on the Identity Verification design gaps \(UX\-01, UX\-02\) and the Step\-7 Round\-1 questions\. Decisions marked Resolved are authoritative for downstream documentation\. Items in Section 7 are not\.

__Supersedes__

Design Gap Resolution Record \(earlier draft\) — replaced in full\.

__Related Documents__

00 — Identity Verification Epic Overview

UX Requirements — Identity Verification \(Design Gap Register\)

Technical Documentation Overview

__Source of Truth__

The Figma design files\. This document records decisions about intent where the exports were silent, inconsistent, or superseded by product decisions\. Where this record and the design disagree, the design governs\.

__Regulatory Status__

Not legally required to verify identity\. Verification is a chosen product feature for fraud reduction\.

__Scope Constraint__

No UX features or designs change, with one exception: Birth Certificate is removed from the accepted\-documents list\. Otherwise the only change is replacing Persona with Didit as the vendor\. The UI remains exactly as designed\.

__Verification Vendor__

Didit — selected, pending five commercial confirmations \(Section 7\)\.

__Status__

UX\-01 Resolved · UX\-02 Superseded · Round\-1 Resolved · 6 questions, 2 design observations \(1 resolved, 18 September 2026\)

__Date__

31 August 2026 \[Note, 18 September 2026: this Date field was not updated when the Status line and §7\.3 Observation 8 were revised on 18 September 2026; those two elements reflect the most recent revision, not this field\.\]

This record consolidates every decision taken since the Design Gap Register was raised: the two original design gaps, the eight Step\-7 Round\-1 questions, the review architecture, and the vendor selection\. The only UI change is the removal of Birth Certificate from the accepted\-documents list; otherwise Persona is replaced by Didit behind the existing screens and nothing else in the design changes\. Six questions and two design observations remain, listed in Section 7; one of the two observations \(observation 8, §7\.3\) was resolved on 18 September 2026 and is marked accordingly\.

# __1\. Governing Rules__

## __1\.1 Document acceptance__

__A document is acceptable if it is machine\-readable and can be authenticated\. If the ID can be scanned and checked, it is accepted; if it cannot be authenticated, it is not\.__

This replaces the idea of a dynamic, per\-country document list\. The set of accepted document types is standardised\. What varies by country is only whether a given type exists and is supported there\.

Birth Certificate is the one document type this rule cannot accommodate: no barcode, not scannable, no way to authenticate\. The selected vendor does not carry it in its catalogue, so the option cannot function if a user selects it\. Birth Certificate is therefore removed from the accepted\-documents list\. This is the only change to the UI\.

## __1\.2 Verification depth__

Verification runs at two depths depending on what is available in the user’s country\. Both are accepted\.

- __Registry validated\. __Document data is checked against the authoritative government registry that issued it — civil registry, tax authority, electoral roll or biometric registry\. Available only where the vendor holds a government data source\.
- __Authenticated\. __Document is checked by barcode decode, MRZ check\-digit validation, NFC chip read where present, OCR, and authenticity and tamper detection, plus face match with liveness\. No registry lookup\. Applies everywhere else\.

Both count as verified\. The product is not regulated, the objective is fraud reduction, and authentication with face match and liveness is a genuine barrier: it defeats forged documents and it defeats a genuine document presented by someone other than its holder\. Registry validation is applied additionally wherever the vendor supports it\.

## __1\.3 Review architecture__

__No manual review\. The AI reviewer is the final decision\-maker\. Help desk escalation is out of scope for this sprint\.__

For this sprint there is no escalation path of any kind: a rejection is final apart from retry\. This is a deliberate scope decision, not an omission — no help desk design exists\. It follows that the system will produce false rejections with no correction mechanism in this release, and that retry limits and failure messaging are part of the spec rather than polish\.

There is no regulatory exposure in this arrangement, as the product is not legally required to verify identity and there is no auditor to whom an AI\-only decision would need to be defended\.

# __2\. Vendor Selection — Didit__

Didit is selected, covering document verification, liveness, face match and registry validation under a single API\.

## __2\.1 Pricing__

__Module__

__Price__

ID Verification \(document only\)

$0\.15 per check

Passive Liveness

$0\.10

Face Match 1:1

$0\.05

Device & IP Analysis

$0\.03

AML Screening

$0\.20

Database Validation \(registry lookup\)

from $0\.05, varies by country

Full KYC bundle

$0\.33 per session

Free tier

500 full KYC verifications per month, ongoing

Minimum commitment

None\. No annual contract\.

Prices are published publicly and volume discounts apply automatically\. The free tier covers pilot testing at no cost and with no lock\-in\. Figures are as published at the date of this document and should be confirmed before commitment\.

## __2\.2 Scanning and fallback chain__

Verification does not depend on any single read method succeeding\. The vendor runs a fallback chain, and no part of it needs to be built on our side:

- __Barcode\. __PDF417 decode — the machine\-readable strip on US driver’s licences and state IDs\.
- __MRZ\. __Machine\-readable zone with full check\-digit validation on document number, date of birth, expiry, nationality and document type, each validated mathematically before the response returns\. Also serves as the structured fallback when OCR confidence drops below threshold, giving name, document number and dates a deterministic recovery path on imperfect captures\.
- __NFC chip\. __Cryptographic chip read for e\-passports and eIDs, ICAO\-compliant\.
- __OCR and authenticity\. __Visual zone read plus tamper detection against a 14,000\+ template library\.

A document with no barcode still verifies via MRZ\. A document with neither still passes through OCR and authenticity checks\. Where a government data source exists, registry validation runs on top\.

## __2\.3 Coverage and compliance__

- 220\+ countries, 14,000\+ document types, 130\+ languages\.
- SOC 2 Type I and II, ISO/IEC 27001:2022, iBeta Level 1 PAD, GDPR, HIPAA, eIDAS 2\.0, MiCA, AMLD6, DORA\-aligned\.

## __2\.4 Vendor risk__

Didit is an early\-stage company following a recent $7\.5M seed round\. Certification maturity and company maturity are distinct risks\. Data portability and exit terms should be confirmed before commitment\.

# __3\. UX\-01 — Document Types__

__ID__

UX\-01

__Status__

Resolved

__Scope__

Document type selection screens vs\. capture and manual\-entry screens

__Question__

__Decision__

__Status__

Which countries are supported at launch?

All countries the vendor supports\. No country list is maintained on our side\. The United States is the template; every other country follows the same pattern\.

__Resolved__

What is the accepted document list per country?

Standardised across countries\. Per country, each type is available or not, determined by vendor coverage\.

__Resolved__

Where does the mapping live?

The vendor\. Not Figma, not backend config\.

__Resolved__

Is the canonical US list the four\-item or five\-item version?

The five\-item version, including Identification Card \(ID\)\. The four\-item instances are superseded\.

__Resolved__

Are National ID and Identification Card the same type?

Two distinct types in our model; the distinction varies by country \(a national ID and a state ID are not the same document\)\. The vendor collapses both into a single "ID Card" type, so the distinction must be modelled on our side if required\.

__Resolved__

SUPERSEDED, 18 September 2026 — see below

Corrected by Christopher’s direct answer \(Answer 7, Unresolved Questions register, 18 September 2026\): National ID and Identification Card are ONE shared type, not two\. The vendor collapses both into a single “ID Card” value and cannot reliably tell them apart, so two stored types would be a distinction with no data to populate\. “Local ID” is not a third thing either — it names the same document as Identification Card, and the label should be retired in favor of one term \(see observation 8, §7\.3, resolved by this same answer\)\. The row above is left as originally written, not edited, so the superseded reasoning remains visible; this row is the correction of record\.

__Superseded__

Which country do National ID and Local ID capture screens belong to?

Neither is country\-specific\. Both are generic\. Their presence without a country attached is correct, not a gap\.

__Resolved__

Is Birth Certificate supported?

No — removed\. Not scannable, no barcode, no way to authenticate, and not present in the vendor catalogue, so the option cannot function\. Remove Birth Certificate from the US accepted\-documents list\. No capture or manual\-entry screens are required for it\. This is the only UI change in this document\.

__Resolved__

Should a non\-US country be added to Figma?

No\. The US example is sufficient and the pattern is demonstrated\.

__Resolved__

## __3\.1 Country selection__

The user selects their country first, as the design specifies\. The design is the source of truth on this point\.

## __3\.2 Document types the vendor supports__

The vendor verifies the following types, subject to per\-country availability\. This is a statement of vendor capability against the existing design, not a proposed change to the accepted\-documents screens:

- Passport — national, e\-passport, emergency, diplomatic
- ID Card — national identity cards, citizen cards, voter cards, digital IDs, state and regional IDs
- Driver’s Licence — standard, commercial \(CDL\), learner permits
- Residence Permit — permanent resident cards, alien and foreigner IDs, border crossing cards

The five\-item US list is covered by the above, with Birth Certificate removed\. Health Insurance Card, Tax Card and Social Security Card are additionally available from the vendor but do not appear in the design and are not in scope\.

# __4\. UX\-02 — Persona and Face Match__

__ID__

UX\-02

__Status__

Superseded by vendor selection

__Original scope__

Relationship between the in\-house document capture flow and the Persona\-hosted verification step

The original question — whether Persona is the vendor behind the in\-house\-styled scan screens or a separate path — is moot\. Neither\. Didit provides document verification, liveness and face match through one API in one session\.

__Question__

__Decision__

__Status__

Is face match in scope for this sprint?

Yes\. Face match already appears in the master flow as designed \("Scan face to match ID"\), so this is not an addition to the UI — it restores alignment with the design after an earlier decision to defer it\. Face match and liveness are bundled with the vendor at $0\.18 above document\-only cost\.

__Resolved__

Where are document images and biometric data stored?

No biometric data is stored by us; face match data remains with the vendor\. Document images are stored and attached to the user’s account\.

__Resolved__

Does this require a microservice?

Yes\. No identity verification service exists; a new one is to be created \(Section 6\)\.

__Resolved__

Can a user encounter document and face verification in one journey?

Yes\. Both run in a single vendor session\.

__Resolved__

In what order?

Per the design: document capture, then face match\. Recorded from the design, not proposed\.

__Resolved__

Do the Figma flow connectors need updating?

No\. The vendor swap does not change the flow\. Persona is replaced by Didit behind the existing screens; the connectors already show when face match occurs\.

__Resolved__

# __5\. Step\-7 Round\-1 Questions__

__\#__

__Decision__

__Status__

1 — Displaced / cannot\-go\-home users

Supported\. The vendor catalogue includes refugee documents and voter cards, so no special path is required and no additional cost is incurred\. There is no compliance reason to exclude them\.

__Resolved__

2 — Does verification expire?

Yes\. Store the document expiry date and re\-verify on trigger — document expiry or suspicious activity — rather than on a fixed calendar cycle\. Expired documents are not accepted at onboarding either\.

__Resolved__

3 — How many countries at launch?

All countries the vendor supports\. Cost scales with verification volume, not country count, so enabling a country with no users costs nothing\.

__Resolved__

4 — Non\-US document requirements?

Determined by the vendor across 220\+ countries\. No per\-country requirement definition is needed on our side\.

__Resolved__

5 — Does deleting an account delete ID documents?

Yes\. Delete the documents with the account\. No AML retention obligation applies, as the product is not legally required to verify identity\. General data protection obligations still apply\.

__Resolved__

6 — Minimum age?

18 to hold an account\. Date of birth is read from the document during verification, so the check costs nothing extra\. Under\-18s are declined\. No parental consent, guardian verification or minor account type is required\. \[Clarified, 18 September 2026: per TRVG2 §3 and Doc 03 §10, date of birth is read transiently from the document solely to compute eligible\_on \(the date the account becomes eligible if currently under 18\) and is then discarded — no date\_of\_birth field is persisted anywhere in the schema; Doc 03 is explicit that a persisted DOB field is not currently part of the confirmed design, only a UX Requirements suggestion\. The base "18 to hold an account" rule itself is unaffected\. Whether/how DOB reaches this service at all, and any broader DOB collection or retention question, remains a separate open Product/Design dependency \(O13\), not resolved by this entry\.\]

__Resolved__

7 — Can one person hold two accounts?

No\. One account per person\. Multiple email addresses attach to a single account and are not separate accounts\. A document already on file is a deterministic block, not an AI review case\.

__Resolved__

8 — What does "verified" feed into long\-term?

Deferred to roadmap\. Note for this sprint: model verification status as an extensible field \(status or level\) rather than a boolean, so later use does not require a migration\.

__Resolved__

# __6\. Failure Handling and the Verification Service__

## __6\.1 Failure handling__

__Item__

__Decision__

Manual review

None\.

Decision authority

The AI reviewer makes the final decision\.

Escalation

Help desk is out of scope for this sprint\. No design exists\. A rejection is final apart from retry\.

Retry limit

Three attempts\. Industry guidance is 2–3 retries for technical and image\-quality failures, which are the majority — blur, glare, cropped corners, name mismatches — and usually clear on a cleaner attempt\.

Duplicate documents

Deterministic block\. One account per person makes this unambiguous; no AI evaluation required\. The user is told an account already exists and pointed to recovery\.

Age rejection

Under\-18 declined at verification\. Whether the rejection is permanent against that document or the user may return after turning 18 is a design decision, not specified here\.

SUPERSEDED, 18 September 2026 — see below

Corrected by Christopher’s Answer 3 / TRVG2 §2\.9 and §3: BLOCKED\_AGE is not permanently terminal\. It clears automatically once eligible\_on \(the holder’s 18th birthday, derived transiently from the document at read time and then discarded\) is reached, returning the account to UNSTARTED — the user does return automatically after turning 18\. The row above is left as originally written, not edited, so the original open question remains visible; this row is the correction of record\.

## __6\.2 Identity verification microservice__

No identity verification service currently exists\. A new one is to be created\. Engineering should confirm against the Technical Documentation Overview that nothing equivalent exists under another name before building\.

The service is thin: the vendor owns all verification logic, the fallback chain and biometric data\. The service owns account linkage and state\.

- Store document images and attach them to the user account
- Hold verification status as an extensible field, not a boolean, mirroring the vendor’s state model
- Store the document expiry date as the re\-verification trigger
- Track attempt counts against the three\-retry limit
- Hold a reference to verified documents so duplicates can be blocked deterministically
- Consume vendor sessions and verify HMAC\-signed webhooks rather than polling
- Store no biometric data

## __6\.3 What verification gates__

Identity verification and location verification are two distinct checks\. Both must pass before the gate lifts\.

__"Hire me" is disabled, and offers cannot be sent to a user, until that user has verified both identity and location\. \[Superseded, 18 September 2026: this single\-gate framing is retired\. TRVG2 §2 and Christopher's Answer 3 replace it with gate\_open\(account\) := is\_verified\(account\) OR in\_grace\(account\), evaluated across nine gates \(G1–G9, TRVG2 §2\) — marketplace discovery, publish a listing, apply for a job, receive/accept an offer \(the gate described in this row\), client\-facing roster, owner management view, accept an invitation, log time, and withdraw earnings\. An account inside its 30\-day expiry grace window \(in\_grace\) still satisfies every gate, including this one\. See 00 §9 and 01 §2 for the full nine\-gate detail\.\]__

The gate sits on the person being hired, not the person hiring\. Verification is what makes a profile hireable, so the incentive to complete it is built into the flow: an unverified profile cannot receive offers and therefore cannot earn\.

Verification is account\-level, not action\-level — verify once and the gate lifts for all subsequent offers\.

Team and agency profiles are gated differently, because a team profile is a listing in its own right and verification attaches to a person rather than an entity\. That logic is out of scope for this epic and is recorded separately in the companion note, "Identity Verification — Team Profile Gating"\.

Other uses of verification status are deferred to roadmap \(Section 5, item 8\)\.

# __7\. Outstanding Questions__

Six questions remain, plus two observations for design \(one of the two, observation 8, was resolved on 18 September 2026 — see §7\.3\)\. None require a product decision\. The only UI change in this document is the removal of Birth Certificate\.

## __7\.1 For the vendor__

__\#__

__Question__

1

Do you charge for failed verification attempts, or only successful ones?

2

Which countries do you have Database Validation government sources for, and what is the per\-call price in each?

3

Is "manual reviewers on demand" strictly opt\-in, and can it be disabled entirely?

4

Your pages show 220\+, 230\+ and 147 countries — which number is document coverage and which is registry coverage?

5

If we leave, how do we export our data and what are the exit terms?

## __7\.2 For engineering__

__\#__

__Question__

6

Does an identity verification service already exist in the Technical Documentation Overview, possibly under a different name?

## __7\.3 For design__

These are observations arising from the vendor swap\. Aside from the Birth Certificate removal, no UI change is proposed — design decides whether anything else changes\.

__\#__

__Observation__

7

The US "Accepted Documents" screen appears in four instances with two different lists \(four items and five items\)\. Which is canonical? \[Verified in part, 18 September 2026: a Figma screenshot of the United States instance of this screen was reviewed, showing five items including Birth Certificate\. Birth Certificate has since been confirmed removed from the current Figma design — the screenshot reflected an older version of the screen, and this is resolved, not an outstanding defect\. Separately, accepted documents are intentionally country\-dependent: selecting a country displays that country's own accepted\-document list by design \(e\.g\., selecting the United States displays the documents accepted for the United States; selecting India displays the documents accepted for India\) — this is confirmed intended behavior, not an inconsistency\. The four canonical backend document\_type categories \(Passport, ID Card, Driver's Licence, Residence Permit — Answer 7\) are categories the vendor maps per country; no source states or implies every country's screen must display all four\. What remains unresolved: this observation references four separate screen instances, and only the United States instance has been directly inspected \(via the now\-superseded screenshot above\) — the other three instances have not been individually inspected, and no assumption is made about what they show or which country each represents\. The original four\-item\-vs\-five\-item question this observation asks — whether the United States screen's canonical list counts Identification Card \(ID\) as a distinct entry from National ID \(see §3 table, "Is the canonical US list the four\-item or five\-item version?"\) — is a separate axis from the Birth Certificate finding above and is not addressed or resolved by this note\.\] \[Further update, 18 September 2026: Christopher has since given a definitive answer to the remaining four\-item\-vs\-five\-item question above\. National ID and Identification Card \(ID\) share one backend document\_type: ID Card — the vendor cannot reliably distinguish them, so they are not two entries but one\. "Local ID" names the same document and its label is retired in favor of "Identification Card" \(consistent with, and now directly resolving, the "four\-item or five\-item" question in the §3 table above, and reconfirming the SUPERSEDED row already added to that table for the related "Are National ID and Identification Card the same type?" question\)\. The backend stores the vendor's document\_type value; document\_type\_label is display\-only and may vary by country or locale, so differing on\-screen labels across countries are expected, not a defect\. The canonical accepted types remain exactly four: Passport, ID Card, Driver's Licence, Residence Permit, with Birth Certificate excluded \(per the Birth Certificate finding above\)\. All four accepted document types follow the same verification gate logic and produce the same verified status\. This resolves the backend\-type\-counting axis of this observation\. What is NOT claimed: that all four Figma screen instances referenced by this observation have been individually inspected — only the United States instance has been \(via the now\-superseded screenshot above\); the other three remain uninspected, and it is not confirmed whether any of them displays "National ID" and "Identification Card" as two separate, selectable items on the same screen, which would be a UI\-level question distinct from the backend\-type question resolved here\.\]

8

"National ID" and "Local ID" exist as capture screens with no country attached and appear in no selection list\. Is that intended? \[Resolved, 18 September 2026: intended is no longer the question\. Christopher’s Answer 7 \(Unresolved Questions register\) confirms one shared document type; the vendor collapses both to a single ID Card value, so no country\-specific list entry is needed for either screen, and "Local ID" is retired as a label in favour of "Identification Card"\. See the SUPERSEDED row added to the Section 3 table above\.\]

# __8\. Notes__

- __Terminology — "location verification" vs "document verification"\. __These are used interchangeably across the design files and discussion\. If they name the same step, the documentation should say so explicitly\. Note separately that the vendor’s Device & IP Analysis module provides connection geolocation and device fingerprinting, which is not proof of address; proof of address is a separate module using utility bills or bank statements\.
- __The vendor swap is the only change\. __Persona is replaced by Didit behind the existing screens\. The in\-house\-styled document capture screens, the country selection screen, the accepted\-documents screens and the face match step all remain exactly as designed\. The removal of Birth Certificate from the accepted\-documents list is the sole UI change\.
- __Face match was always in the design\. __It appears in the master flow as "Scan face to match ID"\. The earlier decision to defer it as out of scope contradicted the design; including it restores alignment rather than adding anything\.
- __Help desk deferral is a scope decision, not an omission\. __Whoever picks up help desk design later should know it was considered and deferred for lack of a design, and that this sprint ships with no escalation path\.
- __No deadlines are attached\. __The downstream documents these decisions affect — the data model document\-type enum, the API endpoint spec, and the QA test matrix — have no due dates set\.

