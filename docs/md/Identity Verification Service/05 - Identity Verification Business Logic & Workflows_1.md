__05 — IDENTITY VERIFICATION BUSINESS LOGIC & WORKFLOWS__

*Duplicate\-Detection Transaction, Travel Mode Reminder Scheduler, DocumentVerificationProvider/Didit Integration, HMAC\-Signed Webhook Handler — identity\-verification\-service*

__Epic: __Identity Verification

__Document Role: __Production\-ready implementation doc: fills in every placeholder method Doc 04 left in IdentityVerificationService, plus the background reminder job and the vendor/event\-publishing infrastructure that logic depends on\.

__Prerequisites: __Doc 03 — Data Model & Database Schema \(built and smoke\-tested\), Doc 04 — API Specification \(built and smoke\-tested\), 00–02 \(Service Overview, Technical Architecture, Feature List — backend\), Identity Verification Decision Record \(31 Aug 2026\)

__Author: __CTO — written for a developer building this microservice for the first time

__Status: __Final — ready to implement

__Date: __1 September 2026

__UPDATE — 16 SEPTEMBER 2026__

Applies ten documentation and business\-logic corrections from the Document 05 final verification \(16 Sep 2026\), using its corrected findings rather than the superseded impact report; none change any existing route, DTO identifier, or unrelated business logic\. Three retired REJECTED\_BLOCKED references \(Step 7, Step 11\) are corrected to BLOCKED\_DUPLICATE, matching Doc 03's revised nine\-value enum\. handleDiditWebhook now transitions a confirmed AttemptOutcome\.REJECTED to FAILED or FAILED\_FINAL per TRVG §3, reusing the existing per\-document attempt count without a new query; this logic is flagged NOT production\-safe until the account\-versus\-document retry\-scope question \(Doc 03 §8b\) is resolved\. AttemptOutcome\.ERROR and BLOCKED\_AGE remain explicitly unresolved — no Didit payload fields or age\-detection mechanism are invented\. startVerificationSession now sets IN\_PROGRESS on session creation \(TRVG §3\); whether the same call also constitutes PENDING is left as an open question, not decided here\. A placeholder\-warning callout is added above the plaintext documentNumberNormalized computation \(Step 11\) stating it is NOT production\-safe until Security/Engineering confirm the one\-way hash algorithm and input composition \(Doc 03 §6b\) — no hash code is inserted\. getStatusForInternalCaller is corrected to match Doc 04's revised internal contract exactly, returning a computed isVerified boolean alongside both statuses, without computing in\_marketplace or enforcing gates G1–G6\. New Section 7 entries document the unbuilt document\_expires\_on/last\_evaluated\_at population and scheduled EXPIRED evaluation \(Doc 03's own entity comment assigns this to Doc 05\), and the still\-open TRVG2 §6\.2 \[Citation corrected 21 September 2026; formerly cited as TRVG §6\.1\] anti\-enumeration rate\-limiting dependency \(Doc 04 §4\) — neither a scheduler, an expiry value, nor a rate\-limit threshold/layer/owner is chosen\. A new Section 4 note describes the current vendor\-outage behavior \(an outage\-caused call consumes no retry attempt\) as a structural consequence of the existing code, not an approved counting policy \(Doc 03 §8c\)\. The Decision Record authority question, SVC\-24 internal\-review access, and all other outstanding Christopher/Security/Engineering/Infrastructure decisions remain exactly as open as before\.

Update — 18 September 2026: incorporates Christopher’s answers to the Unresolved Questions register and Technical Requirements — Verification Gates 2 \(“TRVG2”\)\. The retry\-count derivation in startVerificationSession \(Step 9\) and its Section 4 note are corrected from per\-\(profile\_id, document\_id\) to account\-wide \(profile\_id alone\), resolving what Doc 03 §8b previously carried as open \(Answer 3; TRVG2 §2 gate\-table note\)\. The vendor\-outage behavior described in Section 4 is reframed from an unintended structural side effect to confirmed policy \(Answer 6; TRVG2 §5\.1\) — no code changes accompany that reframing beyond the account\-wide count fix\. VpnProxyDetectedException \(Step 9\) now carries the detected vpnProxyResult value so the three distinct VPN/proxy/both alerts TRVG2 §1\.5 requires can be told apart; Doc 03’s vpn\_proxy\_detection\_result\_enum already had the values needed for this\. getStatusForInternalCaller’s \(Step 10\) comment is corrected to describe TRVG2’s gate\_open := is\_verified\(\) OR in\_grace\(\) predicate, replacing the retired in\_marketplace\(account\)/G1–G6 framing; the method itself still returns only isVerified \(== is\_verified\(\), not gate\_open\) — this is flagged below as a newly surfaced gap, not silently fixed, because extending the returned shape is an API\-contract decision this document does not make unilaterally\. New Section 4a describes two requirements TRVG2 newly confirms — the manual\-entry registry\-lookup flow \(Answer 1; TRVG2 §2\.1\) and the FAILED\_FINAL/BLOCKED\_AGE automatic reset transitions \(TRVG2 §3\) — in prose, without inventing implementation code neither source specifies\. Didit’s vendor\-integration mechanics \(TRVG2 §5, §8\) remain confirmed\-but\-deferred; Didit integration and Persona both stay out of scope for the current build\.

__UPDATE — 17 SEPTEMBER 2026__

Corrects one stale citation identified by the Identity Verification Final Cross\-Document Audit \(Finding 11\): Section 8’s “What’s Next” list previously described the Setup & Bootstrapping document’s number as still unconfirmed\. It is Document 06 — Identity Verification Setup & Bootstrapping, per the Required Docs Checklist’s locked numbering and Document 06’s own self\-identification; the bullet now names it directly\. No other content in this document was changed\.

Update — 21 September 2026 \(SOP B compliance review, Doc 05 pass\): six additive items; nothing above is altered\. Engineering decisions made under Christopher's SOP guidance \(five\-question technical resolution, Q2–Q4\): \(1\) Step 11’s document\-fingerprint hash algorithm is HMAC\-SHA\-256 with a KMS\-held pepper, over the normalized document number only — the code still only normalizes, not hashes, pending secure pepper/KMS retrieval, and remains explicitly not production\-ready; this is unrelated to Step 9’s Didit webhook\-signature HMAC, which is untouched\. \(2\) Step 5’s RabbitMQ exchange/routing\-key example is updated to amq\.topic / identity\-verification\.verification\.<event\-type> — whether notification\-service is actually bound to consume from it remains unverified, unchanged from before\. \(3\) Step 4’s VPN/proxy detector is now understood to be this service’s own backend team’s to build, rather than an external component of undecided ownership — the provider stays Unimplemented/NONE; its fallback policy, feed vendor, and cost remain unresolved and are not invented here\. One citation fix \(Step 7\): TRVG §1\.2, §3 → TRVG2\. Section 7’s VPN/proxy and RabbitMQ bullets are updated to match, and a new bullet is added on migrating existing plaintext document\_number\_normalized values once hashing is implemented\. The location\-expiry conflict and every other genuine dependency already flagged in this document are left exactly as unresolved as before\.

# __1\. Purpose & Scope__

This document fills in every method Doc 04's IdentityVerificationService left as a NotImplementedException stub, and builds the infrastructure that logic depends on: the duplicate\-document detection transaction \(Doc 03 §8a\), the DocumentVerificationProvider interface and its Didit\-backed implementation, the HMAC\-signed inbound webhook handler, the Travel Mode reminder scheduler, and the RabbitMQ notification\-event publisher\. After this document, every route in Doc 04's endpoint table does real work — nothing left to build against Doc 03's schema remains a placeholder\.

This document does NOT cover: replacing Doc 04's two authentication guards with real auth \(out of scope for the checklist item that authorizes this document, and would require inventing an auth\-service token format no source documents — see Section 4\), the document\-verification vendor's actual API contract \(Didit's real request/response schema is not published anywhere available to this project — Section 4 flags every placeholder\), or the VPN/proxy detection mechanism itself \(confirmed to be consumed, not owned, by this service — Technical Architecture §12 — this document wires the consumption point and ships a flagged scaffolding implementation, nothing more; what should happen when the signal is unavailable is not decided here — see Section 7\)\.

__HOW THIS DOCUMENT RELATES TO DOC 03 AND DOC 04__

Every piece of business logic below is built to compile and run against the exact entities, DTOs, exceptions, and error codes Doc 03 and Doc 04 already defined\. Where this document adds a new field, enum value, or file that those documents didn't already contain, it is called out explicitly in Section 4 as this document's own addition — never presented as something Doc 03 or Doc 04 already decided\.

__WHAT "PRODUCTION\-READY" MEANS IN THIS DOCUMENT__

"Production\-ready" in this document has two different meanings depending on the code\. The orchestration layer — the duplicate\-detection transaction, the retry\-count logic, the Travel Mode scheduler, the provider\-abstraction interfaces, the webhook signature\-verification mechanism, the event\-publishing call sites — is built against confirmed architecture and schema, and is production\-ready as written\. The Didit\-specific contract details inside DocumentVerificationProvider's implementation \(Step 3\) and the webhook payload shape it expects \(Step 9\) are NOT production\-ready: they are placeholders standing in for Didit's real request fields, response fields, endpoint URLs, webhook event names, signature/header format, and retry behavior, none of which is documented anywhere available to this project\. Every place this applies is marked with an explicit callout naming it a Didit integration dependency, not a finished implementation\. Treat those sections as needing a follow\-up pass once Didit's real documentation is in hand — the surrounding orchestration will not need to change, only the vendor\-facing code inside those specific files\.

# __2\. Prerequisites__

- Doc 03's schema is built, migrated, and smoke\-tested — the three entities, their enums, and the identity\_verification\_profiles / identity\_documents / verification\_attempts tables all exist in the target database\.
- Doc 04's API layer is built and smoke\-tested — every controller, DTO, guard placeholder, and the global exception filter from that document are already in place and compiling\.
- Node\.js 20\+, npm, and access to the same Supabase Postgres instance Doc 03's DATABASE\_URL points at\.
- A RabbitMQ connection string for the shared Marketeq message broker \(RABBITMQ\_URL — Architecture Overview, Appendix\)\. If you don't have one for local development, ask whoever administers the platform's RabbitMQ instance; a local RabbitMQ container works for development in the meantime\.
- Cloudflare R2 credentials \(account ID, access key ID, secret access key, bucket name\) for this service\. If none exist yet, ask Infrastructure — Doc 03 §10 already flagged R2 as a recommended default pending that confirmation, unchanged here\.
- Didit API credentials \(base URL, API key, webhook signing secret\) for a sandbox/test environment\. If none exist yet, this document's Didit\-calling code will compile and run, but every real call to Didit will fail with VENDOR\_UNAVAILABLE until real credentials are supplied — that is expected, not a bug in this document\.

# __3\. What You're Building__

Five pieces of infrastructure, then the ten service methods Doc 04 left as stubs, built on top of them:

- DocumentVerificationProvider — an interface plus a Didit\-backed implementation, so the service layer never calls Didit's HTTP API directly \(Technical Architecture §10\)\.
- VpnProxyDetectionProvider — an interface the service layer consumes for the VPN/proxy signal, plus a clearly\-flagged placeholder implementation, since no shared platform component that produces this signal exists yet \(Technical Architecture §12\)\.
- NotificationEventPublisher — a thin RabbitMQ publisher for the six confirmed notification occasions \(Service Overview item 14; Technical Architecture §5\)\.
- The duplicate\-document detection transaction — Doc 03 §8a's advisory\-lock pattern, implemented exactly as that document specified it\.
- The Travel Mode reminder scheduler — a daily background job implementing the confirmed cadence \(Service Overview item 3\): daily re\-check, skip at day 3 and day 7, stop after day 7\.
- Every IdentityVerificationService method: getOrCreateProfile, confirmHomeCountry, recordTravelClassification, recordTravelDuration, createDocumentUploadUrl, submitDocument, startVerificationSession, listDocuments, getStatusForInternalCaller, handleDiditWebhook\.

None of Doc 04's controllers, DTOs, or routes change\. This document only replaces the body of IdentityVerificationService and adds new files beside it\.

# __4\. Engineering Decisions Made in This Document__

None of these are Product or vendor decisions\. Each is the narrowest choice needed to turn Doc 03's schema and Doc 04's HTTP contract into working logic, and each is flagged here so nothing downstream mistakes it for a confirmed requirement\.

- AttemptOutcome is not extended\. Doc 03 deliberately kept attempt\_outcome's confirmed vocabulary limited and explicitly did not include a pending/in\-flight value \(Doc 03 §10\)\. Correlating a Didit session between session\-start and webhook\-arrival still requires somewhere to hold that in\-flight state, so this document adds a separate table instead: pending\_verification\_sessions \(Step 2a\)\. This table is this document's own technical recommendation, not part of Doc 03's confirmed schema — verification\_attempts is written exactly once, with a real outcome already known, and its confirmed vocabulary is never touched by this document\.
- A pending\_verification\_sessions row is written at session\-start \(Step 8 below\) instead of a verification\_attempts row\. The webhook handler \(Step 9\) looks that row up by vendor session ID, writes the one and only verification\_attempts row for the attempt once Didit's outcome is known, and then deletes the pending row\. If this table is ever formalized as part of the authoritative schema, that is a synchronization step with Doc 03 and the Data Dictionary that this document does not take on its own — see Section 7\.
- The three\-attempt retry count \(Doc 03 §8b\) is now the sum of two numbers: the count of verification\_attempts rows for the document \(Doc 03's own COUNT\(\*\) query, unchanged\) plus the count of pending\_verification\_sessions rows for it \(sessions still awaiting a Didit outcome\)\. Summing both, rather than only counting settled attempts, is this document's own engineering choice to keep the 3\-attempt ceiling from being bypassed by concurrent in\-flight sessions — Doc 03 does not define how in\-flight sessions should be counted, since it does not model them at all\. \[Superseded, 18 September 2026: both counts in this bullet should be read as account\-wide \(filtered by profile\_id alone\), not per\-document — confirmed by Christopher's Answer 3 and TRVG2 §2's gate\-table note\. The engineering rationale for summing settled attempts plus in\-flight sessions is unaffected; only the per\-document framing of "for the document"/"for it" above is corrected\.\]
- identity\_verification\_status transitions to FAILED \(attempt\_count < 3\) or FAILED\_FINAL \(attempt\_count = 3\) on a confirmed vendor rejection \(AttemptOutcome\.REJECTED\), per TRVG §3's transition table and Doc 03's revised nine\-value enum — not to the retired rejected\_blocked value this document's 1 September draft referenced, which Doc 03's 16 September revision retired in favor of BLOCKED\_DUPLICATE for the duplicate\-document case specifically \(see the corrected Step 7/Step 11 comments and code\)\. This reuses the existing per\-document attempt count \(below\) rather than a new query, and is flagged as not production\-safe until that count's account\-versus\-document scope is confirmed — see the next bullet\. \[Superseded, 18 September 2026: this scope question is resolved — confirmed account\-wide \(profile\_id alone\), per Christopher's Answer 3 and TRVG2 §2's gate\-table note\. This attempt count is production\-safe with respect to scope; see the next bullet, which itself still needs to be read as account\-wide, not per\-document\.\] Whether AttemptOutcome\.ERROR should also drive a FAILED/FAILED\_FINAL transition, and how a BLOCKED\_AGE result would ever be detected in Didit's current placeholder payload shape, remain unresolved — see Section 7\.
- HMAC signature verification needs the exact raw request bytes, not a re\-serialized copy of the parsed body — re\-serializing JSON can silently change byte\-for\-byte content \(key order, whitespace\) and break a real signature check\. This requires two small, additive extensions to files Doc 04 already built: one more constructor option on main\.ts's NestFactory\.create call \(Step 2b\), and one more parameter on the webhook controller method \(Step 9c\)\. Doc 04 already anticipated this — its Section 4 states plainly that "the signature check happens inside the service call \(Doc 05\)" — so this is completing what Doc 04 deferred, not revising a decision it made\.
- DocumentVerificationProvider \(Step 3\) is split into two layers with two different confidence levels\. The interface and the calling code around it — retry counting, duplicate\-detection, how the service reacts to a session being created — are built against confirmed architecture and are production\-ready\. The Didit implementation's request/response shape, endpoint path, and field names inside that one file are not: Didit's actual API contract is not documented in any source available to this project, exactly the same status Doc 04 already gave the inbound webhook DTO\. Do not treat the field names in Step 3's Didit\-calling code as Didit's real API — replace that file's internals once real Didit API documentation is available; the interface it implements does not need to change\.
- VpnProxyDetectionProvider's only implementation always returns NONE, but this is scaffolding, not a Product or security decision\. Technical Architecture §12 confirms this service consumes, but does not own, the VPN/proxy signal, and that no shared platform component producing it has been chosen — it does not say what should happen when the signal is unavailable\. This document does not decide that either; it is carried into Section 7 as an unresolved dependency\. Replace this file once a real signal source \(api\-gateway, or the planned Location Service\) is confirmed, and confirm the fallback policy at the same time\.
- Marketeq's existing RabbitMQ messaging client/abstraction is referenced by the Technical Architecture \(§4, §16\) but its concrete method names and topology are not documented anywhere available to this project\. Rather than guess at that shared client's API, this document builds its own minimal publisher directly on amqplib\. Replace NotificationEventPublisher's implementation with the shared client once its interface is available; the six event types this document emits \(Step 6\) do not need to change when that happens\.
- The exchange name \(identity\-verification\.events\) and routing\-key pattern this document's publisher uses are its own recommended default\. No source specifies queue/exchange naming for this service's events \(Technical Architecture §4: "category/integration specifics remain undecided"\)\. \[Updated 21 September 2026: Q3 \(five\-question technical resolution, engineering decision made under Christopher's SOP guidance\) now names amq\.topic and a three\-segment routing key as the proposed convention \(Section 7 below\)\. Marketeq's shared messaging client's real interface and notification\-service's actual binding to this exchange remain unconfirmed; this document's publisher is unchanged\.\]
- The Travel Mode reminder cadence \("daily re\-check \.\.\. skip\-reminders at 3 and 7 days, then stop" — Service Overview item 3\) is implemented literally: a daily sweep; the reminder that would fire on day 3 and day 7 since activation is skipped, not sent; scheduling stops entirely once day 7 has passed\. No source spells out the algorithm in more detail than that sentence — this is this document's own reading of it, not a confirmed spec\.
- The first Travel Mode reminder is scheduled 5 minutes after Travel Mode activation \(Step 11's recordTravelDuration\), standing in for Service Overview item 3's "roughly 5 minutes after a user first reaches the home page\." This service cannot observe an actual home\-page\-load event; activation time is the closest confirmed signal available to it\. Flagged in Section 7\.
- Two reminder triggers Service Overview item 3 also names — "every fresh login" and "immediate re\-prompt on any new detected\-country change" — are implemented as callable methods \(onFreshLogin, onDetectedCountryChanged in Step 10\) with correct logic, but nothing in this codebase calls them yet\. No confirmed integration point delivers either signal to this service: a login\-time check at auth\-service "would be new capability" that does not exist today \(Service Overview §7\), and detected\-country updates arrive through the still\-undecided LocationProvider boundary \(Technical Architecture §11\), which is outside this document's scope\. Flagged in Section 7, not silently wired to an invented event source\.
- New folders \(providers/, events/, jobs/\) are added beside the flat src/ layout Doc 03 and Doc 04 already built code against \(entities/, dto/, controllers/, services/, common/\) — not Technical Architecture §16's originally proposed domain\-module layout \(location/, travel/, documents/, etc\.\)\. That proposal predates the concrete structure this project's build series already committed to; this document follows the code that already exists\.
- Cloudflare R2's presigned\-URL generation uses the AWS S3\-compatible SDK against R2's S3\-compatible endpoint — Cloudflare's own documented method for issuing presigned URLs against R2\. This is a technical implementation detail, not a new Product or vendor decision; R2 itself remains "a recommended default pending Infrastructure/Security confirmation" exactly as Doc 03 §10 already stated\.
- Doc 04's two authentication guards \(BearerAuthGuard, InternalServiceGuard\) are not touched by this document\. The checklist item authorizing this document names four specific pieces of business logic and does not include production authentication; building real JWT verification here would mean inventing auth\-service's token format, which no source documents\. This remains open — see Section 7\.
- startVerificationSession now sets identity\_verification\_status to IN\_PROGRESS immediately after DocumentVerificationProvider\.startVerificationSession \(Step 3\) succeeds, per TRVG §3 \(UNSTARTED/FAILED/EXPIRED, Session created → IN\_PROGRESS\)\. Whether this same Didit call should also be read as TRVG §3's separate 'Submitted to vendor' event — which would additionally set PENDING — is not resolved by any source: this integration has only one Didit\-facing call at this point, and TRVG models session creation and submission as two distinct events\. This document does not choose between them; PENDING is not set anywhere in this pass\.
- handleDiditWebhook \(Step 9d, Step 11\) transitions identity\_verification\_status to FAILED or FAILED\_FINAL on AttemptOutcome\.REJECTED, using savedAttempt\.attemptNumber — derived as existingAttempts \+ pendingSessions \+ 1 \(Step 9\), both account\-wide since the 18 September 2026 update\. This branch is now production\-safe on scope: Doc 03 §8b's account\-vs\-document question is resolved \(account\-wide; Answer 3, TRVG2 §2 gate\-table note\), and this logic already reused the same existingAttempts/pendingSessions values startVerificationSession computes, so no separate code change was needed here beyond that fix\. \[Superseded, 18 September 2026: earlier drafts flagged this branch NOT production\-safe pending that scope question; it is resolved now\.\]
- This document's retry\-count derivation \(above, and Step 9's startVerificationSession\) is account\-wide \(profile\_id alone\), matching Doc 03 §8b's now\-resolved derivation query\. TRVG2 §2's gate\-table note and Christopher's Answer 3 resolve what Doc 03 §8b previously left open: attempt\_count is one counter per account, not one per distinct document\. This corrects the per\-\(profile\_id, document\_id\) scope this document previously implemented, which Doc 03 had flagged as provisional\. \[Superseded, 18 September 2026: earlier drafts of this document counted attempts per document, matching what Doc 03 §8b described at the time as an open question rather than a confirmed scope\.\]
- A VendorUnavailableException from DocumentVerificationProvider\.startVerificationSession \(Step 3\) is thrown before any pending\_verification\_sessions row is written \(Step 8\); an outage\-caused call therefore does not consume one of the three retry attempts\. This is now confirmed policy, not an incidental side effect of the code structure: Christopher's Answer 6 and TRVG2 §5\.1 both require that an unreachable or erroring vendor never consume an attempt and never set a failure state — treated as the check not having run\. Doc 03 §8c's framing is updated to match \(see the 18 September 2026 update note there\)\. This document's existing code already satisfies the confirmed policy; no code changes were needed to bring it into compliance, only the documentation framing\.

## __4a\. Newly Confirmed Requirements, Not Yet Implemented \(18 September 2026\)__

TRVG2 and Christopher’s answers confirm two pieces of business logic this document does not yet implement\. Both are described below at the level of detail either source actually specifies — neither invents an implementation beyond what is given\.

- Manual\-entry registry lookup \(Answer 1; TRVG2 §2\.1\)\. Where a document cannot be scanned, the account holder may key in the document number as a fallback — offered only after a scan has failed, never as a first\-run choice\. The confirmed flow: the keyed document number is checked against a government registry for the issuing country, which returns the holder’s name; that name is matched against the account; the face is then matched against the registry identity, not a document image\. This produces the same VERIFIED status as a scan — the biometric check is not skipped, the registry supplies the identity the face is matched against in place of the document image\. Where the vendor holds no registry source for a country, there is no manual fallback and scanning is the only route \(TRVG2 §8, “Database Validation country coverage” — a vendor dependency, not a product decision\)\. No registry API contract, method signature, or DocumentVerificationProvider extension is specified by either source, and none is invented here\.
- Automatic reset from FAILED\_FINAL and BLOCKED\_AGE \(TRVG2 §3\)\. Neither state is permanently terminal, correcting the “unresolved” framing Doc 03 §8\.1/§8\.2 \(original TRVG\) previously carried\. FAILED\_FINAL clears automatically once a 24\-hour cooldown interval elapses, resetting attempt\_count to 0 and status to UNSTARTED\. BLOCKED\_AGE clears automatically once the newly added eligible\_on date \(Doc 03 §6a\) is reached, also transitioning to UNSTARTED\. TRVG2 states the EXPIRED transition “must fire without user action — a scheduled evaluation … not a check performed only on next login” \(§3\); by the same logic these two resets likely should not depend on the account holder returning to trigger them, though TRVG2 does not say so explicitly for these two states the way it does for EXPIRED\. No scheduler, cron expression, or queue mechanism is specified by any source, and none is invented here — this sits alongside the still\-unbuilt document\_expires\_on/EXPIRED scheduled evaluation Section 7 already tracks\.

Whether either scheduled reset needs alerting or a distinguishable log line belongs to Doc 08 \(Monitoring & Observability\) and Doc 09 \(Error Handling\) to decide; this document does not resolve that\.

# __5\. Step\-by\-Step Implementation__

Follow these steps in order\. Every code block names the exact file path to create it in, relative to the repository root \(marketeq\-projects\-nestjs/\)\. All paths start from apps/identity\-verification\-service/\.

## __Step 1 — Install Dependencies__

Doc 03 installed typeorm/pg; Doc 04 installed class\-validator/class\-transformer\. This step adds what this document's logic needs: a cron scheduler, a RabbitMQ client, and the AWS SDK packages Cloudflare R2's S3\-compatible API uses\.

__Run from: apps/identity\-verification\-service/__

npm install @nestjs/schedule@^4\.1\.1 amqplib@^0\.10\.4 @aws\-sdk/client\-s3@^3\.637\.0 @aws\-sdk/s3\-request\-presigner@^3\.637\.0

npm install \-\-save\-dev @types/amqplib@^0\.10\.5

Node\.js 18\+ ships a global fetch\(\), which this document uses for the Didit HTTP calls — no separate HTTP client package is needed\.

## __Step 2 — Two Small Additions to Files Doc 03 and Doc 04 Already Created__

Both additions are exactly that — additions\. Nothing existing in either file is changed or removed\.

__2a\. A pending\-verification\-session table — Doc 05's own addition, not Doc 03's schema__

Didit's session\-start response arrives before its outcome does \(Step 9's webhook reports the outcome later, asynchronously\)\. Something durable has to hold the in\-flight session's details in between so the webhook can find them — but Doc 03 deliberately kept attempt\_outcome's vocabulary to three values it already flagged as placeholders pending Didit's real vocabulary \(Doc 03 §10\), and this document does not add a fourth, unconfirmed value to that authoritative list to bridge the gap\. Instead, this step adds a separate table that exists only for that bridging purpose\.

__TECHNICAL RECOMMENDATION — NOT PART OF DOC 03'S CONFIRMED SCHEMA__

This table is not part of Doc 03's confirmed schema\. It is this document's own technical recommendation, needed purely to correlate a Didit session that has started but not yet reported an outcome\. verification\_attempts \(Doc 03\) is written only once, in Step 9d, with a real outcome already known — never with a placeholder value\. If the team wants this table formalized as part of the authoritative schema, that is a synchronization step with Doc 03 and the Data Dictionary this document does not take on its own\.

__FILE: apps/identity\-verification\-service/src/entities/pending\-verification\-session\.entity\.ts__

import \{

  Entity,

  PrimaryGeneratedColumn,

  Column,

  CreateDateColumn,

  Index,

\} from 'typeorm';

import \{

  CaptureMethod,

  DocumentType,

  VpnProxyDetectionResult,

\} from '\./enums/identity\-verification\.enums';

 

// Doc 05's own addition — see the callout above this file in the

// document\. Not part of Doc 03's confirmed schema\. Holds a Didit

// session's details between session\-start and the webhook that reports

// its outcome, so verification\_attempts \(Doc 03\) never has to be

// written with a placeholder outcome value\.

@Entity\(\{ name: 'pending\_verification\_sessions', schema: 'identity\_verification' \}\)

export class PendingVerificationSession \{

  @PrimaryGeneratedColumn\('uuid'\)

  id: string;

 

  @Column\(\{ name: 'profile\_id', type: 'uuid' \}\)

  profileId: string;

 

  @Column\(\{ name: 'document\_id', type: 'uuid' \}\)

  documentId: string;

 

  // Didit's session identifier\. Unique so the webhook handler \(Step 9\)

  // can look it up directly\.

  @Index\('idx\_pending\_verification\_sessions\_vendor\_session\_id', \{ unique: true \}\)

  @Column\(\{ name: 'vendor\_session\_id', type: 'varchar', length: 128 \}\)

  vendorSessionId: string;

 

  // This attempt's position in the 3\-attempt sequence \(SVC\-15\) —

  // reused as\-is for the real verification\_attempts row Step 9d

  // eventually writes\.

  @Column\(\{ name: 'attempt\_number', type: 'smallint' \}\)

  attemptNumber: number;

 

  @Column\(\{ name: 'attempt\_method', type: 'enum', enum: CaptureMethod, enumName: 'capture\_method\_enum' \}\)

  attemptMethod: CaptureMethod;

 

  @Column\(\{ name: 'attempt\_document\_type', type: 'enum', enum: DocumentType, enumName: 'document\_type\_enum' \}\)

  attemptDocumentType: DocumentType;

 

  @Column\(\{ name: 'vpn\_proxy\_detection\_result', type: 'enum', enum: VpnProxyDetectionResult, enumName: 'vpn\_proxy\_detection\_result\_enum' \}\)

  vpnProxyDetectionResult: VpnProxyDetectionResult;

 

  @CreateDateColumn\(\{ name: 'created\_at', type: 'timestamptz' \}\)

  createdAt: Date;

\}

This table reuses the three Postgres enum types Doc 03's migration already created \(capture\_method\_enum, document\_type\_enum, vpn\_proxy\_detection\_result\_enum\) — it does not define any new enum type\. The migration below only adds the new table\.

__FILE: apps/identity\-verification\-service/src/database/migrations/1756828800000\-CreatePendingVerificationSessions\.ts__

import \{ MigrationInterface, QueryRunner \} from 'typeorm';

 

// Doc 05's own migration — additive only\. Does not alter any table,

// column, or enum type Doc 03's migration created\.

export class CreatePendingVerificationSessions1756828800000 implements MigrationInterface \{

  name = 'CreatePendingVerificationSessions1756828800000';

 

  public async up\(queryRunner: QueryRunner\): Promise<void> \{

    await queryRunner\.query\(\`

      CREATE TABLE identity\_verification\.pending\_verification\_sessions \(

        "id" uuid NOT NULL DEFAULT gen\_random\_uuid\(\),

        "profile\_id" uuid NOT NULL,

        "document\_id" uuid NOT NULL,

        "vendor\_session\_id" varchar\(128\) NOT NULL,

        "attempt\_number" smallint NOT NULL,

        "attempt\_method" capture\_method\_enum NOT NULL,

        "attempt\_document\_type" document\_type\_enum NOT NULL,

        "vpn\_proxy\_detection\_result" vpn\_proxy\_detection\_result\_enum NOT NULL,

        "created\_at" timestamptz NOT NULL DEFAULT now\(\),

        CONSTRAINT "pk\_pending\_verification\_sessions" PRIMARY KEY \("id"\)

      \);

    \`\);

    await queryRunner\.query\(\`

      CREATE UNIQUE INDEX "idx\_pending\_verification\_sessions\_vendor\_session\_id"

      ON identity\_verification\.pending\_verification\_sessions \("vendor\_session\_id"\);

    \`\);

  \}

 

  public async down\(queryRunner: QueryRunner\): Promise<void> \{

    await queryRunner\.query\(\`DROP TABLE identity\_verification\.pending\_verification\_sessions;\`\);

  \}

\}

__Run from: apps/identity\-verification\-service/__

npm run typeorm \-\- migration:run \-d src/database/data\-source\.ts

__2b\. Enable raw\-body capture in main\.ts__

HMAC signature verification \(Step 10\) needs the exact bytes Didit sent, not a re\-serialized copy of the parsed JSON body\. NestJS can capture this for you with one bootstrap option\. Doc 04 already anticipated this step — its Section 4 states the webhook's signature check "happens inside the service call \(Doc 05\)\."

__FILE: apps/identity\-verification\-service/src/main\.ts \(one\-line addition to the existing bootstrap\)__

import \{ NestFactory \} from '@nestjs/core';

import \{ ValidationPipe \} from '@nestjs/common';

import \{ AppModule \} from '\./app\.module';

import \{ AllExceptionsFilter \} from '\./common/filters/all\-exceptions\.filter';

 

async function bootstrap\(\) \{

  // \{ rawBody: true \} is the only change to this line from Doc 04\. It

  // makes NestJS attach the original request bytes to req\.rawBody for

  // every request, which Step 10's webhook handler needs\.

  const app = await NestFactory\.create\(AppModule, \{ rawBody: true \}\);

 

  // \-\-\- everything below is unchanged from Doc 04 \-\-\-

  app\.useGlobalPipes\(

    new ValidationPipe\(\{ whitelist: true, forbidNonWhitelisted: true, transform: true \}\),

  \);

  app\.useGlobalFilters\(new AllExceptionsFilter\(\)\);

 

  await app\.listen\(process\.env\.PORT ?? 3000\);

\}

bootstrap\(\);

## __Step 3 — DocumentVerificationProvider Interface__

One interface, so the service layer never calls Didit's HTTP API directly \(Technical Architecture §10\)\. This also means a second vendor could be added later behind the same interface without touching the service layer — Gap Resolution Record §4 already anticipates "different vendors per country or region" as a real possibility\.

__FILE: apps/identity\-verification\-service/src/providers/document\-verification/document\-verification\-provider\.interface\.ts__

import \{ DocumentType \} from '\.\./\.\./entities/enums/identity\-verification\.enums';

 

export interface StartVerificationSessionInput \{

  documentId: string;

  documentType: DocumentType;

  issuingCountry: string;

  documentImageReference: string;

\}

 

export interface StartVerificationSessionResult \{

  vendorSessionId: string;

  vendorSessionUrl: string;

\}

 

export interface DocumentVerificationProvider \{

  startVerificationSession\(

    input: StartVerificationSessionInput,

  \): Promise<StartVerificationSessionResult>;

\}

 

// Injection token — see Step 12's app\.module\.ts wiring\.

export const DOCUMENT\_VERIFICATION\_PROVIDER = Symbol\('DOCUMENT\_VERIFICATION\_PROVIDER'\);

__3a\. Didit implementation__

__PLACEHOLDER VENDOR CONTRACT — CONFIRM AGAINST DIDIT'S REAL DOCS__

The request and response field names below \(document\_id, session\_id, session\_url, and so on\) are this document's own placeholder shape, not Didit's real, documented API contract — no source available to this project publishes that contract\. Confirm Didit's actual endpoint path, request body, and response body from Didit's own API documentation before relying on this code against a real Didit account, and update this file's request/response mapping to match\. The DocumentVerificationProvider interface above does not need to change no matter what that mapping turns out to be\.

__FILE: apps/identity\-verification\-service/src/providers/document\-verification/didit\-document\-verification\.provider\.ts__

import \{ Injectable \} from '@nestjs/common';

import \{ VendorUnavailableException \} from '\.\./\.\./common/errors/domain\-exceptions';

import \{

  DocumentVerificationProvider,

  StartVerificationSessionInput,

  StartVerificationSessionResult,

\} from '\./document\-verification\-provider\.interface';

 

@Injectable\(\)

export class DiditDocumentVerificationProvider implements DocumentVerificationProvider \{

  private readonly baseUrl = process\.env\.DIDIT\_API\_BASE\_URL;

  private readonly apiKey = process\.env\.DIDIT\_API\_KEY;

 

  async startVerificationSession\(

    input: StartVerificationSessionInput,

  \): Promise<StartVerificationSessionResult> \{

    let response: Response;

    try \{

      // PLACEHOLDER endpoint path and request body — see the callout

      // above this file in the document\.

      response = await fetch\(\`$\{this\.baseUrl\}/v1/sessions\`, \{

        method: 'POST',

        headers: \{

          'Content\-Type': 'application/json',

          Authorization: \`Bearer $\{this\.apiKey\}\`,

        \},

        body: JSON\.stringify\(\{

          document\_id: input\.documentId,

          document\_type: input\.documentType,

          issuing\_country: input\.issuingCountry,

          document\_image\_reference: input\.documentImageReference,

        \}\),

      \}\);

    \} catch \{

      // Network failure reaching Didit at all\.

      throw new VendorUnavailableException\(\);

    \}

 

    if \(\!response\.ok\) \{

      throw new VendorUnavailableException\(\{ vendorStatus: response\.status \}\);

    \}

 

    // PLACEHOLDER response shape — see the callout above this file\.

    const body = \(await response\.json\(\)\) as \{ session\_id: string; session\_url: string \};

    if \(\!body\.session\_id || \!body\.session\_url\) \{

      throw new VendorUnavailableException\(\{ reason: 'malformed\_vendor\_response' \}\);

    \}

    return \{ vendorSessionId: body\.session\_id, vendorSessionUrl: body\.session\_url \};

  \}

\}

## __Step 4 — VpnProxyDetectionProvider Interface__

Technical Architecture §12 is explicit: this service consumes a VPN/proxy detection signal as an input, but does not own or implement the detection mechanism, and no shared platform component that produces it has been chosen yet \(api\-gateway and the planned Location Service are both candidates, neither confirmed\)\. This step wires the consumption point so Step 9 has something concrete to call; it does not invent an owner\. \[Updated 21 September 2026: Q4 \(five\-question technical resolution, engineering decision made under Christopher's SOP guidance\) proposes identity\-verification\-service's own backend team as that owner, with a MaxMind GeoIP2 Anonymous IP\-style feed recommended\. Vendor selection, cost, and the fallback policy when the signal is unavailable remain unresolved dependencies; Step 4's placeholder provider below is unchanged\.\]

__SCAFFOLDING ONLY — FALLBACK BEHAVIOR IS AN UNRESOLVED DEPENDENCY, NOT A DECISION__

This is the only implementation of VpnProxyDetectionProvider in this document\. It always returns NONE — not because NONE is the confirmed or recommended behavior when a signal is unavailable, but because there is no real detector for it to call yet \(Technical Architecture §12: producer undecided\)\. It exists only so startVerificationSession \(Step 9\) has a real dependency to call and the service compiles and runs end\-to\-end\. \[Updated 21 September 2026 — engineering decision made under Christopher's SOP guidance \(five\-question technical resolution, Q4\): the producer question is understood to be resolved — this service’s own backend team builds the detector inline, rather than depending on api\-gateway, the Location Service, or an external vendor module\. This provider stays Unimplemented/NONE below; the fallback policy, the specific feed/vendor, and its cost remain unresolved and are not invented here\.\]

What should happen when no VPN/proxy signal is available — block the attempt, allow it, or something else — is not decided by any confirmed source and is not decided by this document\. That is a Product/security decision this project is not authorized to make on its own; see Section 7\. Do not read this file's return value as an implied answer to that question, and do not ship it to production without first replacing it with a real provider and confirming what the fallback behavior should be\.

__FILE: apps/identity\-verification\-service/src/providers/vpn\-proxy/vpn\-proxy\-detection\-provider\.interface\.ts__

import \{ VpnProxyDetectionResult \} from '\.\./\.\./entities/enums/identity\-verification\.enums';

 

export interface DetectVpnProxyInput \{

  ipAddress: string;

\}

 

export interface VpnProxyDetectionProvider \{

  detect\(input: DetectVpnProxyInput\): Promise<VpnProxyDetectionResult>;

\}

 

// Injection token — see Step 12's app\.module\.ts wiring\.

export const VPN\_PROXY\_DETECTION\_PROVIDER = Symbol\('VPN\_PROXY\_DETECTION\_PROVIDER'\);

__FILE: apps/identity\-verification\-service/src/providers/vpn\-proxy/unimplemented\-vpn\-proxy\-detection\.provider\.ts__

import \{ Injectable \} from '@nestjs/common';

import \{ VpnProxyDetectionResult \} from '\.\./\.\./entities/enums/identity\-verification\.enums';

import \{

  DetectVpnProxyInput,

  VpnProxyDetectionProvider,

\} from '\./vpn\-proxy\-detection\-provider\.interface';

 

// PLACEHOLDER — see the callout above this file in the document\. Returns

// NONE only because no real detector is built yet\. Proposed engineering

// decision made under Christopher's SOP guidance \(Q4, 21 Sep 2026\): this service's own

// team builds it inline\. This is still a scaffolding default,

// not a fail\-open security decision\. What this service should do when no

// VPN/proxy signal is available is an unresolved dependency \(Section 7\),

// not something this file, or this document, has decided\. Replace before

// this signal is relied on for anything\.

@Injectable\(\)

export class UnimplementedVpnProxyDetectionProvider implements VpnProxyDetectionProvider \{

  async detect\(\_input: DetectVpnProxyInput\): Promise<VpnProxyDetectionResult> \{

    return VpnProxyDetectionResult\.NONE;

  \}

\}

## __Step 5 — NotificationEventPublisher__

Service Overview item 14 confirms six occasions this service must emit events for; Technical Architecture §5 confirms RabbitMQ \(not polling\) is the mechanism, consumed by notification\-service\. Neither source names an exchange, queue, or routing\-key convention, and Marketeq's "existing RabbitMQ messaging client/abstraction" \(Technical Architecture §16\) is referenced but its concrete API is not documented anywhere available to this project — so this step builds directly on amqplib instead of guessing at that shared client's method names\.

__FILE: apps/identity\-verification\-service/src/events/identity\-verification\-event\.types\.ts__

// The six occasions Service Overview item 14 confirms this service must

// emit events for\. Do not add a new value here without a confirmed

// source — this list is not this document's to extend informally\.

export enum IdentityVerificationEventType \{

  TRAVEL\_MODE\_ACTIVATED = 'travel\_mode\_activated',

  TRAVEL\_MODE\_STILL\_ACTIVE = 'travel\_mode\_still\_active',

  LOCATION\_VERIFICATION\_SUBMITTED = 'location\_verification\_submitted',

  IDENTITY\_VERIFIED = 'identity\_verified',

  LOCATION\_VERIFIED = 'location\_verified',

  HOME\_COUNTRY\_UPDATED = 'home\_country\_updated',

\}

 

export interface IdentityVerificationEvent \{

  eventType: IdentityVerificationEventType;

  profileId: string;

  userId: string;

  occurredAt: string;

  data?: Record<string, unknown>;

\}

__FILE: apps/identity\-verification\-service/src/events/notification\-event\-publisher\.interface\.ts__

import \{ IdentityVerificationEvent \} from '\./identity\-verification\-event\.types';

 

export interface NotificationEventPublisher \{

  publish\(event: IdentityVerificationEvent\): Promise<void>;

\}

 

// Injection token — see Step 12's app\.module\.ts wiring\.

export const NOTIFICATION\_EVENT\_PUBLISHER = Symbol\('NOTIFICATION\_EVENT\_PUBLISHER'\);

__PLACEHOLDER EVENT TOPOLOGY — NOT A CONFIRMED CONTRACT__

The exchange name below \(identity\-verification\.events\) and the routing\-key pattern \(identity\-verification\.<event\-type>\) are this document's own recommended default — no source specifies event topology for this service \(Technical Architecture §4: "category/integration specifics remain undecided"\)\. Replace this file's implementation with Marketeq's shared RabbitMQ client once its interface is confirmed; IdentityVerificationEvent \(above\) does not need to change when that happens — only how it gets published does\. \[Superseded, 21 September 2026: this is no longer this document's own recommended default\. Per the five\-question technical resolution \(Q3\) — an engineering decision made under Christopher's SOP guidance — the exchange is amq\.topic \(a pre\-declared broker exchange\) and the routing key is identity\-verification\.verification\.<event\-type> \(note the added “verification” segment vs\. the placeholder pattern above\)\. The code below is updated accordingly\. What remains unverified: whether notification\-service is actually bound to consume from amq\.topic with this routing key — see Section 7\. Replace this file's implementation with Marketeq's shared RabbitMQ client once its interface is confirmed, as before\.\]

__FILE: apps/identity\-verification\-service/src/events/rabbitmq\-notification\-event\-publisher\.ts__

import \{ Injectable, Logger, OnModuleDestroy \} from '@nestjs/common';

import \* as amqplib from 'amqplib';

import \{ NotificationEventPublisher \} from '\./notification\-event\-publisher\.interface';

import \{ IdentityVerificationEvent \} from '\./identity\-verification\-event\.types';

 

const EXCHANGE\_NAME = 'amq\.topic'; // pre\-declared broker exchange, Q3 \(21 Sep 2026\)

 

@Injectable\(\)

export class RabbitMqNotificationEventPublisher implements NotificationEventPublisher, OnModuleDestroy \{

  private readonly logger = new Logger\(RabbitMqNotificationEventPublisher\.name\);

  private connection: amqplib\.Connection | null = null;

  private channel: amqplib\.Channel | null = null;

  private connecting: Promise<amqplib\.Channel> | null = null;

 

  private async getChannel\(\): Promise<amqplib\.Channel> \{

    if \(this\.channel\) return this\.channel;

    if \(\!this\.connecting\) \{

      this\.connecting = \(async \(\) => \{

        this\.connection = await amqplib\.connect\(process\.env\.RABBITMQ\_URL as string\);

        const channel = await this\.connection\.createChannel\(\);

        // amq\.topic is a broker default; assertExchange here is a

        // harmless no\-op, not a declaration this service owns \(Q3,

        // 21 Sep 2026\)\. Kept for clarity, not required\.

        await channel\.assertExchange\(EXCHANGE\_NAME, 'topic', \{ durable: true \}\);

        this\.channel = channel;

        return channel;

      \}\)\(\);

    \}

    return this\.connecting;

  \}

 

  async publish\(event: IdentityVerificationEvent\): Promise<void> \{

    try \{

      const channel = await this\.getChannel\(\);

      const routingKey = \`identity\-verification\.verification\.$\{event\.eventType\}\`;

      channel\.publish\(

        EXCHANGE\_NAME,

        routingKey,

        Buffer\.from\(JSON\.stringify\(event\)\),

        \{ contentType: 'application/json', persistent: true \},

      \);

    \} catch \(err\) \{

      // A notification\-event failure must never break the request that

      // triggered it \(e\.g\. a travel\-duration submission should still

      // succeed even if RabbitMQ is briefly unreachable\)\. Log and move

      // on — there is no confirmed retry/outbox requirement to build

      // against \(see Section 7\)\.

      this\.logger\.error\(\`Failed to publish $\{event\.eventType\}: $\{\(err as Error\)\.message\}\`\);

    \}

  \}

 

  async onModuleDestroy\(\): Promise<void> \{

    await this\.channel?\.close\(\);

    await this\.connection?\.close\(\);

  \}

\}

## __Step 6 — ObjectStorageProvider \(Cloudflare R2\)__

createDocumentUploadUrl \(Doc 04, Section 4's upload\-URL pattern\) needs a pre\-signed PUT URL\. Cloudflare R2 exposes an S3\-compatible API, so this uses AWS's own S3 SDK pointed at R2's endpoint — Cloudflare's documented method for issuing R2 pre\-signed URLs, not a new vendor choice\. R2 itself remains a recommended default pending Infrastructure/Security confirmation \(Doc 03 §10\), unchanged here\.

__FILE: apps/identity\-verification\-service/src/providers/storage/object\-storage\-provider\.interface\.ts__

export interface CreateUploadUrlInput \{

  profileId: string;

  fileExtension: string;

\}

 

export interface CreateUploadUrlResult \{

  uploadUrl: string;

  objectKey: string;

  expiresAt: Date;

\}

 

export interface ObjectStorageProvider \{

  createUploadUrl\(input: CreateUploadUrlInput\): Promise<CreateUploadUrlResult>;

\}

 

// Injection token — see Step 12's app\.module\.ts wiring\.

export const OBJECT\_STORAGE\_PROVIDER = Symbol\('OBJECT\_STORAGE\_PROVIDER'\);

__FILE: apps/identity\-verification\-service/src/providers/storage/r2\-object\-storage\.provider\.ts__

import \{ Injectable \} from '@nestjs/common';

import \{ randomUUID \} from 'crypto';

import \{ S3Client, PutObjectCommand \} from '@aws\-sdk/client\-s3';

import \{ getSignedUrl \} from '@aws\-sdk/s3\-request\-presigner';

import \{

  CreateUploadUrlInput,

  CreateUploadUrlResult,

  ObjectStorageProvider,

\} from '\./object\-storage\-provider\.interface';

 

const UPLOAD\_URL\_TTL\_SECONDS = 300;

 

@Injectable\(\)

export class R2ObjectStorageProvider implements ObjectStorageProvider \{

  private readonly client = new S3Client\(\{

    region: 'auto',

    endpoint: \`https://$\{process\.env\.R2\_ACCOUNT\_ID\}\.r2\.cloudflarestorage\.com\`,

    credentials: \{

      accessKeyId: process\.env\.R2\_ACCESS\_KEY\_ID as string,

      secretAccessKey: process\.env\.R2\_SECRET\_ACCESS\_KEY as string,

    \},

  \}\);

 

  async createUploadUrl\(input: CreateUploadUrlInput\): Promise<CreateUploadUrlResult> \{

    // Object key includes the profile ID as a prefix so a bucket listing

    // can be scoped to one user's documents if that's ever needed, and a

    // fresh UUID so two uploads never collide\.

    const objectKey = \`identity\-documents/$\{input\.profileId\}/$\{randomUUID\(\)\}\.$\{input\.fileExtension\}\`;

    const command = new PutObjectCommand\(\{

      Bucket: process\.env\.R2\_BUCKET\_NAME,

      Key: objectKey,

    \}\);

    const uploadUrl = await getSignedUrl\(this\.client, command, \{

      expiresIn: UPLOAD\_URL\_TTL\_SECONDS,

    \}\);

    return \{

      uploadUrl,

      objectKey,

      expiresAt: new Date\(Date\.now\(\) \+ UPLOAD\_URL\_TTL\_SECONDS \* 1000\),

    \};

  \}

\}

## __Step 7 — The Duplicate\-Document Detection Transaction__

This implements Doc 03 §8a exactly as that document specified it: an advisory lock keyed on the document's fingerprint, then a lookup for a match belonging to a different profile, all inside one database transaction\. Doc 03 already explained why a UNIQUE constraint can't express this rule — a user must be able to resubmit their own document after a failed scan, so "unique except for your own profile" has to be application logic\. This step walks through the algorithm; Step 11 shows it wired into the full service class\.

// Algorithm \(Doc 03 §8a\) — runs inside one TypeORM QueryRunner transaction:

//

// 1\. SELECT pg\_advisory\_xact\_lock\(hashtext\($1 || $2 || $3\)\)

//    \($1 = documentNumberNormalized — NOT YET a one\-way hash, see the

//    PLACEHOLDER FINGERPRINT callout above Step 11; $2 = issuingCountry, $3 = documentType\)

//    Serializes two concurrent submissions of the same real\-world

//    document so they can't both pass the check before either commits\.

//

// 2\. SELECT id, profile\_id FROM identity\_verification\.identity\_documents

//    WHERE document\_number\_normalized = $1 AND issuing\_country = $2

//      AND document\_type = $3 AND profile\_id <> $4

//    LIMIT 1

//    \($4 = the submitting user's own profile\_id\)

//

// 3\. If a row comes back: save the new document with is\_duplicate\_match

//    = true and duplicate\_of\_document\_id set, set the profile's

//    identity\_verification\_status to BLOCKED\_DUPLICATE \(Doc 03 §8a,

//    TRVG2 §1\.2, §3\), commit, then

//    throw DuplicateDocumentException so the caller sees SVC\-17's block\.

//    If no row comes back: save the document normally and commit\.

__SCOPE, CARRIED FORWARD FROM DOC 03__

This is exact\-match detection only — same document number, issuing country, and document type under a different profile\. A broader biometric \(cross\-document\) match is a technical recommendation pending confirmation that Didit supports the required cross\-user/1:N capability \(Doc 03 §8a callout\) and is not built here\.

## __Step 8 — Starting a Verification Session__

This is what POST /v1/identity\-verification/documents/:documentId/verify \(Doc 04\) actually does\. Four things happen in order, each backed by a confirmed source:

- 1\. Count existing verification\_attempts rows for this document \(Doc 03 §8b's exact query, WHERE profile\_id = $1 AND document\_id = $2\), then add the count of pending\_verification\_sessions rows for the same document \(Section 4 — sessions still awaiting a Didit outcome count toward the ceiling too\)\. If the total is already 3, throw RetryLimitExceededException \(SVC\-15\) before calling anyone — the vendor is never called a 4th time\. \[Superseded, 18 September 2026: this query and the pending\_verification\_sessions count above are both account\-wide \(profile\_id alone\) as of the 18 September 2026 update — the document\_id filter shown here was retired when Doc 03 §8b's attempt\-count scope was resolved \(Answer 3; TRVG2 §2 gate\-table note\), the same fix already reflected in this document's own retry\-count\-derivation paragraph and its handleDiditWebhook bullet \(both above\)\. This walkthrough's query text was not updated in the same pass and is corrected now; nothing about the four\-step sequence itself changes\.\]
- 2\. Ask VpnProxyDetectionProvider \(Step 4\) for the current signal\. If it is anything other than NONE, throw VpnProxyDetectedException \(00 §4\) before calling Didit\.
- 3\. Call DocumentVerificationProvider\.startVerificationSession \(Step 3\) to get a vendorSessionId and vendorSessionUrl from Didit\.
- 4\. Insert a pending\_verification\_sessions row \(Step 2a\) — not a verification\_attempts row — with attempt\_number = the total from step 1 plus one, and vpn\_proxy\_detection\_result set to whatever step 2 returned\. Return \{ vendorSessionId, vendorSessionUrl, attemptNumber \} — exactly Doc 04's VerificationSessionResponseDto shape\.

The row inserted in step 4 is what step 9's webhook handler looks up later, by vendor\_session\_id\. It is deliberately not a verification\_attempts row — Doc 03's confirmed attempt\_outcome vocabulary is never written to until a real outcome is known \(Step 9d\)\. If Didit's call in step 3 fails, nothing is inserted — DiditDocumentVerificationProvider already throws VendorUnavailableException, and the transaction never reaches step 4\.

## __Step 9 — The HMAC\-Signed Webhook Handler__

Didit's inbound webhook reports a verification outcome asynchronously, sometime after Step 8 started a session\. Two things must happen before this document trusts anything in that payload: verify the signature, then look up the matching attempt row idempotently\.

__9a\. Signature verification utility__

__PLACEHOLDER SIGNING SCHEME — CONFIRM AGAINST DIDIT'S REAL DOCS__

The header name \(x\-didit\-signature\) and the HMAC\-SHA256\-over\-the\-raw\-body scheme below are this document's own placeholder, matching the same placeholder status Doc 04 already gave this header \(Doc 04 §8c\)\. Confirm Didit's actual signing scheme, header name, and secret\-rotation approach from Didit's real webhook documentation before this handles a real Didit webhook, and update this file to match — nothing else in this document depends on the exact scheme\.

__FILE: apps/identity\-verification\-service/src/common/utils/verify\-didit\-webhook\-signature\.ts__

import \{ createHmac, timingSafeEqual \} from 'crypto';

 

// Computes an HMAC\-SHA256 over the exact raw request body and compares

// it to the signature Didit sent, using a constant\-time comparison so

// this check itself can't leak timing information about the secret\.

export function verifyDiditWebhookSignature\(

  rawBody: Buffer,

  signatureHeader: string | undefined,

  secret: string,

\): boolean \{

  if \(\!signatureHeader\) return false;

  const expected = createHmac\('sha256', secret\)\.update\(rawBody\)\.digest\('hex'\);

  const expectedBuffer = Buffer\.from\(expected, 'utf8'\);

  const providedBuffer = Buffer\.from\(signatureHeader, 'utf8'\);

  if \(expectedBuffer\.length \!== providedBuffer\.length\) return false;

  return timingSafeEqual\(expectedBuffer, providedBuffer\);

\}

__9b\. Two new domain exceptions__

Doc 04's error table already reserved these two codes for this document \("Doc 05 will add a small number more, INVALID\_SIGNATURE for the webhook, at minimum" — Doc 04 §7\)\. Add them to the file Doc 04 Step 2a created\.

__FILE: apps/identity\-verification\-service/src/common/errors/domain\-exceptions\.ts \(addition\)__

// Added by Doc 05\. Didit's signature didn't match, or was missing\.

export class InvalidWebhookSignatureException extends DomainException \{

  readonly code = 'INVALID\_SIGNATURE';

  constructor\(details?: Record<string, unknown>\) \{

    super\('Webhook signature verification failed\.', HttpStatus\.UNAUTHORIZED, details\);

  \}

\}

 

// Added by Doc 05\. The webhook referenced a vendor\_session\_id this

// service never issued — most likely a session for a different

// environment \(e\.g\. a sandbox event delivered to production\)\.

export class UnknownVendorSessionException extends DomainException \{

  readonly code = 'UNKNOWN\_VENDOR\_SESSION';

  constructor\(details?: Record<string, unknown>\) \{

    super\('No verification attempt matches this vendor session\.', HttpStatus\.NOT\_FOUND, details\);

  \}

\}

__9c\. One additional parameter on Doc 04's webhook controller__

Doc 04's method already accepts the parsed payload and the signature header; it is missing only the raw body, which the signature check needs\. This adds one parameter — everything else about the method, and every other controller in the file, is unchanged\.

__FILE: apps/identity\-verification\-service/src/controllers/identity\-verification\-webhooks\.controller\.ts \(updated method\)__

import \{ Controller, Post, Body, Headers, HttpCode, HttpStatus, Req \} from '@nestjs/common';

import \{ RawBodyRequest \} from '@nestjs/common';

import \{ Request \} from 'express';

import \{ IdentityVerificationService \} from '\.\./services/identity\-verification\.service';

import \{ DiditWebhookPayloadDto \} from '\.\./dto/webhooks/didit\-webhook\.payload\.dto';

 

@Controller\('v1/identity\-verification/webhooks'\)

export class IdentityVerificationWebhooksController \{

  constructor\(private readonly service: IdentityVerificationService\) \{\}

 

  @Post\('didit'\)

  @HttpCode\(HttpStatus\.OK\)

  async handleDiditWebhook\(

    @Body\(\) payload: DiditWebhookPayloadDto,

    @Headers\('x\-didit\-signature'\) signature: string | undefined,

    // Added by Doc 05 — Section 4\. Requires main\.ts's \{ rawBody: true \}

    // option \(Step 2b\)\. req\.rawBody holds the exact bytes Didit sent,

    // which the signature check \(9a\) must verify against — not a

    // re\-serialized copy of the parsed payload above\.

    @Req\(\) req: RawBodyRequest<Request>,

  \): Promise<\{ received: boolean \}> \{

    await this\.service\.handleDiditWebhook\(payload, signature, req\.rawBody as Buffer\);

    return \{ received: true \};

  \}

\}

__9d\. handleDiditWebhook algorithm__

- 1\. Verify the signature \(9a\) against req\.rawBody using DIDIT\_WEBHOOK\_SECRET\. If it fails, throw InvalidWebhookSignatureException — nothing else in the payload is trusted or read\.
- 2\. Look up a verification\_attempts row by vendor\_session\_id = payload\.vendorSessionId \(Doc 03's unique index makes this a single indexed lookup\)\. If one already exists, this delivery has already been processed — a real outcome was already recorded by an earlier delivery of this same webhook \(Didit re\-delivering, or a genuine duplicate\)\. Return immediately without changing anything\. This is the idempotency Doc 03 §10's column comment describes, and it never touches pending\_verification\_sessions at all\.
- 3\. Otherwise, look up a pending\_verification\_sessions row by the same vendor\_session\_id\. If none exists there either, throw UnknownVendorSessionException — the webhook references a session this service never started\.
- 4\. Otherwise, this is the first delivery for this session\. In a single transaction: insert the one and only verification\_attempts row for this attempt, using the pending row's profile\_id, document\_id, attempt\_number, attempt\_method, attempt\_document\_type, and vpn\_proxy\_detection\_result, plus attempt\_outcome read from the webhook payload \(see the callout below on why this mapping is still a placeholder\) and failure\_code if present; then delete the pending\_verification\_sessions row\. If the outcome is 'approved', set the profile's identity\_verification\_status to VERIFIED\. If it is 'rejected' \(AttemptOutcome\.REJECTED\), transition to FAILED or FAILED\_FINAL per TRVG §3, using the attempt's own attempt\_number against the existing 3\-attempt ceiling \(Section 4\) — not yet production\-safe pending that count's scope, see Section 4\. \[Superseded, 18 September 2026: that count's scope is resolved — confirmed account\-wide \(profile\_id alone\), per Christopher's Answer 3 and TRVG2 §2's gate\-table note; this step is production\-safe with respect to scope\.\] If it is 'error' \(AttemptOutcome\.ERROR\), leave the profile's status as it was — whether an in\-band vendor error should instead drive a FAILED transition is an open mapping question, not resolved by any source \(Section 7\)\. No source provides a basis for detecting an age\-specific outcome \(BLOCKED\_AGE, TRVG §3\) in Didit's current placeholder payload shape; that transition has no implementation path until Didit's real documentation is available\.
- 5\. Publish an IDENTITY\_VERIFIED event \(Step 5\) if the outcome was 'approved'\. No event is defined for a rejected or errored attempt — Service Overview item 14 lists identity verified as a notification occasion; it does not list a rejection notification\.

__PLACEHOLDER OUTCOME MAPPING — CONFIRM AGAINST DIDIT'S REAL PAYLOAD__

Step 4 maps whatever outcome value Didit's webhook payload carries directly onto attempt\_outcome's confirmed column, and treats anything other than an exact string match on 'approved' as not\-approved\. Didit's real outcome vocabulary is not documented by any source \(Doc 03 §10\) — DiditWebhookPayloadDto \(Doc 04\) only guarantees vendorSessionId, eventType, occurredAt, and a raw passthrough field\. This document reads the outcome from that raw field under a placeholder key \(raw\.outcome\) until Didit's real payload schema is confirmed and this mapping can be corrected\. This is a Didit integration dependency, not a finished implementation — the surrounding transaction logic around it does not need to change once Didit's real schema is confirmed, only this one mapping step\.

## __Step 10 — The Travel Mode Reminder Scheduler__

Service Overview item 3 confirms the cadence in one sentence: "daily re\-check plus every fresh login; immediate re\-prompt on any new detected\-country change; skip\-reminders at 3 and 7 days, then stop; first prompt fires roughly 5 minutes after a user first reaches the home page\." Doc 03 already deliberately left this cadence out of the schema \("fixed, system\-wide configuration values, not per\-user data" — Doc 03 Step 4a\) — the constants below are that configuration, and this file is where the cadence rule actually lives\.

__CADENCE ALGORITHM — THIS DOCUMENT'S OWN READING; TWO TRIGGERS NOT YET WIRED__

REMINDER\_SKIP\_DAYS and REMINDER\_STOP\_AFTER\_DAYS below are this document's own literal reading of "skip\-reminders at 3 and 7 days, then stop" — no source spells out the exact algorithm further than that sentence\. The daily\-sweep trigger and the reminder\-skip/stop days are fully self\-contained and run today\. The other two triggers the same sentence names — every fresh login, and any detected\-country change — are implemented as the onFreshLogin and onDetectedCountryChanged methods below, but nothing in this codebase calls either one yet; see Section 7\.

__FILE: apps/identity\-verification\-service/src/jobs/travel\-mode\-reminder\.job\.ts__

import \{ Injectable, Logger \} from '@nestjs/common';

import \{ InjectRepository \} from '@nestjs/typeorm';

import \{ Cron, CronExpression \} from '@nestjs/schedule';

import \{ LessThanOrEqual, Repository \} from 'typeorm';

import \{ Inject \} from '@nestjs/common';

import \{ IdentityVerificationProfile \} from '\.\./entities/identity\-verification\-profile\.entity';

import \{

  NotificationEventPublisher,

  NOTIFICATION\_EVENT\_PUBLISHER,

\} from '\.\./events/notification\-event\-publisher\.interface';

import \{ IdentityVerificationEventType \} from '\.\./events/identity\-verification\-event\.types';

 

const DAY\_MS = 24 \* 60 \* 60 \* 1000;

// "skip\-reminders at 3 and 7 days, then stop" \(Service Overview item 3\)\.

// This document's reading: the reminder that would otherwise fire on day

// 3 and day 7 since activation is skipped, not sent; once day 7 has

// passed, no further reminders are scheduled at all\.

const REMINDER\_SKIP\_DAYS = \[3, 7\];

const REMINDER\_STOP\_AFTER\_DAYS = 7;

 

@Injectable\(\)

export class TravelModeReminderJob \{

  private readonly logger = new Logger\(TravelModeReminderJob\.name\);

 

  constructor\(

    @InjectRepository\(IdentityVerificationProfile\)

    private readonly profileRepository: Repository<IdentityVerificationProfile>,

    @Inject\(NOTIFICATION\_EVENT\_PUBLISHER\)

    private readonly events: NotificationEventPublisher,

  \) \{\}

 

  // Daily re\-check \(Service Overview item 3, trigger 1 of 3\)\. The exact

  // time of day \(09:00 server time\) is this document's own choice — no

  // source specifies one\.

  @Cron\(CronExpression\.EVERY\_DAY\_AT\_9AM\)

  async runDailySweep\(\): Promise<void> \{

    const now = new Date\(\);

    const dueProfiles = await this\.profileRepository\.find\(\{

      where: \{ travelModeActive: true, nextTravelReminderAt: LessThanOrEqual\(now\) \},

    \}\);

    this\.logger\.log\(\`Travel Mode reminder sweep: $\{dueProfiles\.length\} profile\(s\) due\.\`\);

    for \(const profile of dueProfiles\) \{

      await this\.evaluateAndSendIfDue\(profile, now\);

    \}

  \}

 

  // Fresh\-login trigger \(Service Overview item 3, trigger 2 of 3\)\.

  // Correct logic, but NOT CALLED by anything today — no confirmed

  // integration point delivers a login event to this service \(Section

  // 4, Section 7; Service Overview §7 — a login\-time check at

  // auth\-service "would be new capability" that does not exist\)\.

  async onFreshLogin\(profile: IdentityVerificationProfile\): Promise<void> \{

    if \(\!profile\.travelModeActive\) return;

    await this\.evaluateAndSendIfDue\(profile, new Date\(\)\);

  \}

 

  // Detected\-country\-change trigger \(Service Overview item 3, trigger 3

  // of 3: "immediate re\-prompt"\)\. Correct logic, but NOT CALLED by

  // anything today — detected\-country updates arrive through the

  // still\-undecided LocationProvider boundary \(Technical Architecture

  // §11\), which is out of scope for this document \(Section 4, Section 7\)\.

  async onDetectedCountryChanged\(profile: IdentityVerificationProfile\): Promise<void> \{

    if \(\!profile\.travelModeActive\) return;

    profile\.nextTravelReminderAt = new Date\(\);

    await this\.profileRepository\.save\(profile\);

    await this\.evaluateAndSendIfDue\(profile, new Date\(\)\);

  \}

 

  private async evaluateAndSendIfDue\(

    profile: IdentityVerificationProfile,

    now: Date,

  \): Promise<void> \{

    if \(\!profile\.travelModeActivatedAt\) return;

    const daysSinceActivation = Math\.floor\(

      \(now\.getTime\(\) \- profile\.travelModeActivatedAt\.getTime\(\)\) / DAY\_MS,

    \);

 

    if \(daysSinceActivation > REMINDER\_STOP\_AFTER\_DAYS\) \{

      profile\.nextTravelReminderAt = null;

      await this\.profileRepository\.save\(profile\);

      return;

    \}

 

    if \(REMINDER\_SKIP\_DAYS\.includes\(daysSinceActivation\)\) \{

      // Skip this reminder, but keep the schedule alive for the next day\.

      profile\.nextTravelReminderAt = this\.dayOffset\(profile\.travelModeActivatedAt, daysSinceActivation \+ 1\);

      await this\.profileRepository\.save\(profile\);

      return;

    \}

 

    await this\.events\.publish\(\{

      eventType: IdentityVerificationEventType\.TRAVEL\_MODE\_STILL\_ACTIVE,

      profileId: profile\.id,

      userId: profile\.userId,

      occurredAt: now\.toISOString\(\),

    \}\);

    profile\.lastTravelReminderSentAt = now;

    profile\.nextTravelReminderAt = this\.dayOffset\(profile\.travelModeActivatedAt, daysSinceActivation \+ 1\);

    await this\.profileRepository\.save\(profile\);

  \}

 

  private dayOffset\(base: Date, days: number\): Date \{

    return new Date\(base\.getTime\(\) \+ days \* DAY\_MS\);

  \}

\}

The first reminder is not scheduled by this file — it is set once, at Travel Mode activation, by recordTravelDuration \(Step 11\)\. This job only evaluates a schedule that is already running\.

## __Step 11 — The Complete Service__

This file replaces Doc 04's entire placeholder service\. Every method below implements exactly the algorithm Steps 6–10 walked through\. This is the file to copy\-paste in full — it supersedes the stub Doc 04 Step 7 created\.

__FILE: apps/identity\-verification\-service/src/services/identity\-verification\.service\.ts__

import \{ Injectable, Inject \} from '@nestjs/common';

import \{ InjectRepository, InjectDataSource \} from '@nestjs/typeorm';

import \{ DataSource, Repository \} from 'typeorm';

import \{ IdentityVerificationProfile \} from '\.\./entities/identity\-verification\-profile\.entity';

import \{ IdentityDocument \} from '\.\./entities/identity\-document\.entity';

import \{ VerificationAttempt \} from '\.\./entities/verification\-attempt\.entity';

import \{ PendingVerificationSession \} from '\.\./entities/pending\-verification\-session\.entity';

import \{

  TravelClassification,

  DeclaredDuration,

  IdentityVerificationStatus,

  LocationVerificationStatus,

  AttemptOutcome,

  VpnProxyDetectionResult,

\} from '\.\./entities/enums/identity\-verification\.enums';

import \{ SubmitDocumentRequestDto \} from '\.\./dto/request/submit\-document\.request\.dto';

import \{ DiditWebhookPayloadDto \} from '\.\./dto/webhooks/didit\-webhook\.payload\.dto';

import \{

  DuplicateDocumentException,

  RetryLimitExceededException,

  ProfileNotFoundException,

  DocumentNotFoundException,

  NoDetectedLocationException,

  ClassificationRequiredException,

  InvalidWebhookSignatureException,

  UnknownVendorSessionException,

  VpnProxyDetectedException,

\} from '\.\./common/errors/domain\-exceptions';

import \{ verifyDiditWebhookSignature \} from '\.\./common/utils/verify\-didit\-webhook\-signature';

import \{

  DocumentVerificationProvider,

  DOCUMENT\_VERIFICATION\_PROVIDER,

\} from '\.\./providers/document\-verification/document\-verification\-provider\.interface';

import \{

  VpnProxyDetectionProvider,

  VPN\_PROXY\_DETECTION\_PROVIDER,

\} from '\.\./providers/vpn\-proxy/vpn\-proxy\-detection\-provider\.interface';

import \{

  ObjectStorageProvider,

  OBJECT\_STORAGE\_PROVIDER,

\} from '\.\./providers/storage/object\-storage\-provider\.interface';

import \{

  NotificationEventPublisher,

  NOTIFICATION\_EVENT\_PUBLISHER,

\} from '\.\./events/notification\-event\-publisher\.interface';

import \{ IdentityVerificationEventType \} from '\.\./events/identity\-verification\-event\.types';

 

const RETRY\_LIMIT = 3;

const FIRST\_REMINDER\_DELAY\_MS = 5 \* 60 \* 1000;

 

@Injectable\(\)

export class IdentityVerificationService \{

  constructor\(

    @InjectRepository\(IdentityVerificationProfile\)

    private readonly profileRepository: Repository<IdentityVerificationProfile>,

    @InjectRepository\(IdentityDocument\)

    private readonly documentRepository: Repository<IdentityDocument>,

    @InjectRepository\(VerificationAttempt\)

    private readonly attemptRepository: Repository<VerificationAttempt>,

    @InjectRepository\(PendingVerificationSession\)

    private readonly pendingSessionRepository: Repository<PendingVerificationSession>,

    @InjectDataSource\(\)

    private readonly dataSource: DataSource,

    @Inject\(DOCUMENT\_VERIFICATION\_PROVIDER\)

    private readonly documentVerificationProvider: DocumentVerificationProvider,

    @Inject\(VPN\_PROXY\_DETECTION\_PROVIDER\)

    private readonly vpnProxyDetectionProvider: VpnProxyDetectionProvider,

    @Inject\(OBJECT\_STORAGE\_PROVIDER\)

    private readonly objectStorageProvider: ObjectStorageProvider,

    @Inject\(NOTIFICATION\_EVENT\_PUBLISHER\)

    private readonly events: NotificationEventPublisher,

  \) \{\}

 

  // \-\-\- Profile lifecycle \-\-\-

 

  async getOrCreateProfile\(userId: string\): Promise<IdentityVerificationProfile> \{

    const existing = await this\.profileRepository\.findOne\(\{ where: \{ userId \} \}\);

    if \(existing\) return existing;

    // Lazy\-creation decision — Doc 04 Section 4\. No separate provisioning

    // endpoint exists; the first authenticated call for a user creates

    // their profile\.

    const created = this\.profileRepository\.create\(\{ userId \}\);

    return this\.profileRepository\.save\(created\);

  \}

 

  async confirmHomeCountry\(userId: string\): Promise<IdentityVerificationProfile> \{

    const profile = await this\.getOrCreateProfile\(userId\);

    if \(\!profile\.detectedCountry\) \{

      throw new NoDetectedLocationException\(\);

    \}

    const previousCountry = profile\.verifiedHomeCountry;

    const isFirstConfirmation = profile\.locationVerificationStatus \!== LocationVerificationStatus\.VERIFIED;

 

    profile\.verifiedHomeCountry = profile\.detectedCountry;

    profile\.verifiedHomeCountryConfirmedAt = new Date\(\);

    profile\.locationVerificationStatus = LocationVerificationStatus\.VERIFIED;

    const saved = await this\.profileRepository\.save\(profile\);

 

    // Service Overview item 14 lists "location verified" and "home

    // country updated" as two separate confirmed occasions\. This

    // document's reading: the first confirmation is LOCATION\_VERIFIED;

    // any later confirmation that actually changes the stored country

    // is HOME\_COUNTRY\_UPDATED\. See Section 4\.

    if \(isFirstConfirmation\) \{

      await this\.events\.publish\(\{

        eventType: IdentityVerificationEventType\.LOCATION\_VERIFIED,

        profileId: saved\.id,

        userId,

        occurredAt: new Date\(\)\.toISOString\(\),

      \}\);

    \} else if \(previousCountry \!== saved\.verifiedHomeCountry\) \{

      await this\.events\.publish\(\{

        eventType: IdentityVerificationEventType\.HOME\_COUNTRY\_UPDATED,

        profileId: saved\.id,

        userId,

        occurredAt: new Date\(\)\.toISOString\(\),

      \}\);

    \}

    return saved;

  \}

 

  // \-\-\- Travel / Relocation \-\-\-

 

  async recordTravelClassification\(

    userId: string,

    classification: TravelClassification,

  \): Promise<IdentityVerificationProfile> \{

    const profile = await this\.getOrCreateProfile\(userId\);

    // AC\-04\.3 — classifying does not alter the verified home country\.

    profile\.travelClassification = classification;

    return this\.profileRepository\.save\(profile\);

  \}

 

  async recordTravelDuration\(

    userId: string,

    duration: DeclaredDuration,

  \): Promise<IdentityVerificationProfile> \{

    const profile = await this\.getOrCreateProfile\(userId\);

    if \(profile\.travelClassification \!== TravelClassification\.TEMPORARILY\_TRAVELING\) \{

      throw new ClassificationRequiredException\(\);

    \}

    const now = new Date\(\);

    profile\.declaredDuration = duration;

    profile\.travelModeActive = true;

    profile\.travelModeActivatedAt = now;

    // First reminder ~5 minutes after activation \(Section 4 — standing

    // in for "roughly 5 minutes after a user first reaches the home

    // page," which this service cannot observe directly\)\.

    profile\.nextTravelReminderAt = new Date\(now\.getTime\(\) \+ FIRST\_REMINDER\_DELAY\_MS\);

    const saved = await this\.profileRepository\.save\(profile\);

 

    await this\.events\.publish\(\{

      eventType: IdentityVerificationEventType\.TRAVEL\_MODE\_ACTIVATED,

      profileId: saved\.id,

      userId,

      occurredAt: now\.toISOString\(\),

    \}\);

    return saved;

  \}

 

  // \-\-\- Documents \-\-\-

 

  async createDocumentUploadUrl\(

    userId: string,

    fileExtension: string,

  \): Promise<\{ uploadUrl: string; documentImageReference: string; expiresAt: string \}> \{

    const profile = await this\.getOrCreateProfile\(userId\);

    const result = await this\.objectStorageProvider\.createUploadUrl\(\{

      profileId: profile\.id,

      fileExtension,

    \}\);

    return \{

      uploadUrl: result\.uploadUrl,

      documentImageReference: result\.objectKey,

      expiresAt: result\.expiresAt\.toISOString\(\),

    \};

  \}

 

  async submitDocument\(

    userId: string,

    dto: SubmitDocumentRequestDto,

  \): Promise<IdentityDocument> \{

    const profile = await this\.getOrCreateProfile\(userId\);

__PLACEHOLDER FINGERPRINT — NOT A ONE\-WAY HASH__

The line below normalizes documentNumber \(trim \+ uppercase\) but does not hash it, contradicting Doc 03 §6b/§8a and TRVG2 §1\.6 \[Citation corrected 21 September 2026; formerly miscited within this document as TRVG2 §1\.3\]'s requirement that document\_number\_normalized be a one\-way hash\. The hash algorithm, and whether issuingCountry/documentType join the hash input, are pending Security/Engineering \(Doc 03, 16 September update note\) — this document does not choose either and does not insert placeholder hash code in its place\. Do not deploy this code path until that decision is made and this line is replaced with the confirmed hash computation; the surrounding advisory\-lock and lookup logic \(Step 7\) does not need to change when it is\. \[Updated 21 September 2026 — engineering decision made under Christopher's SOP guidance \(five\-question technical resolution, Q2\): the hash algorithm is now named — HMAC\-SHA\-256, keyed with a KMS\-held pepper, computed over this normalized document number only \(issuingCountry/documentType do not join the hash input\)\. This does not make the code below production\-ready: no source specifies how this service retrieves the pepper securely \(no KMS vendor/integration is named\), so the line below still only normalizes, not hashes, and this code path remains not\-deployable until that retrieval mechanism exists and this line is replaced with the real HMAC\-SHA\-256 call\. The surrounding advisory\-lock and lookup logic \(Step 7\) still does not need to change\. This is unrelated to Step 9's Didit webhook\-signature HMAC scheme, which is untouched\.\]

    const documentNumberNormalized = dto\.documentNumber\.trim\(\)\.toUpperCase\(\);

 

    const queryRunner = this\.dataSource\.createQueryRunner\(\);

    await queryRunner\.connect\(\);

    await queryRunner\.startTransaction\(\);

    try \{

      // Doc 03 §8a, step 1 — advisory lock keyed on the fingerprint\.

      await queryRunner\.query\('SELECT pg\_advisory\_xact\_lock\(hashtext\($1 || $2 || $3\)\)', \[

        documentNumberNormalized,

        dto\.issuingCountry,

        dto\.documentType,

      \]\);

 

      // Doc 03 §8a, step 2 — look for a match under a DIFFERENT profile\.

      const matches: Array<\{ id: string; profile\_id: string \}> = await queryRunner\.query\(

        \`SELECT id, profile\_id FROM identity\_verification\.identity\_documents

         WHERE document\_number\_normalized = $1 AND issuing\_country = $2

           AND document\_type = $3 AND profile\_id <> $4

         LIMIT 1\`,

        \[documentNumberNormalized, dto\.issuingCountry, dto\.documentType, profile\.id\],

      \);

      const duplicate = matches\[0\];

 

      const document = queryRunner\.manager\.create\(IdentityDocument, \{

        profileId: profile\.id,

        documentType: dto\.documentType,

        issuingCountry: dto\.issuingCountry,

        documentNumber: dto\.documentNumber,

        documentNumberNormalized,

        expirationDate: dto\.expirationDate,

        issuingState: dto\.issuingState ?? null,

        captureMethod: dto\.captureMethod,

        documentImageReference: dto\.documentImageReference,

        isDuplicateMatch: \!\!duplicate,

        duplicateOfDocumentId: duplicate ? duplicate\.id : null,

      \}\);

      const saved = await queryRunner\.manager\.save\(document\);

 

      if \(duplicate\) \{

        // Doc 03 §8a, step 3 — block via SVC\-17; set

        // identityVerificationStatus to BLOCKED\_DUPLICATE \(TRVG §1\.2, §3\)\.

        await queryRunner\.manager\.update\(IdentityVerificationProfile, profile\.id, \{

          identityVerificationStatus: IdentityVerificationStatus\.BLOCKED\_DUPLICATE,

        \}\);

        await queryRunner\.commitTransaction\(\);

        throw new DuplicateDocumentException\(\{ documentId: saved\.id \}\);

      \}

 

      await queryRunner\.commitTransaction\(\);

      return saved;

    \} catch \(err\) \{

      if \(queryRunner\.isTransactionActive\) \{

        await queryRunner\.rollbackTransaction\(\);

      \}

      throw err;

    \} finally \{

      await queryRunner\.release\(\);

    \}

  \}

 

  async startVerificationSession\(

    userId: string,

    documentId: string,

  \): Promise<\{ vendorSessionId: string; vendorSessionUrl: string; attemptNumber: number \}> \{

    const profile = await this\.getOrCreateProfile\(userId\);

    const document = await this\.documentRepository\.findOne\(\{

      where: \{ id: documentId, profileId: profile\.id \},

    \}\);

    if \(\!document\) throw new DocumentNotFoundException\(\);

 

    // Doc 03 §8b — count every existing \(settled\) attempt for this

    // account, regardless of outcome \(TRVG2 §2 gate\-table note\)\. Then add sessions still awaiting a

    // Didit outcome \(Section 4\) so the 3\-attempt ceiling can't be

    // bypassed by starting several sessions concurrently\.

    const existingAttempts = await this\.attemptRepository\.count\(\{

where: \{ profileId: profile\.id \}, // account\-wide \(TRVG2 §2 gate\-table note; Answer 3\)

    \}\);

    const pendingSessions = await this\.pendingSessionRepository\.count\(\{

where: \{ profileId: profile\.id \}, // account\-wide \(TRVG2 §2 gate\-table note; Answer 3\)

    \}\);

    if \(existingAttempts \+ pendingSessions >= RETRY\_LIMIT\) \{

      throw new RetryLimitExceededException\(\);

    \}

 

    // KNOWN GAP \(Section 7\): startVerificationSession's controller method

    // \(Doc 04\) does not currently pass the caller's IP address through to

    // the service layer, so there is nothing real to hand this provider

    // yet\. The only implementation registered \(Step 4\) ignores its input

    // and always returns NONE, so this does not break anything today —

    // but wiring a real VpnProxyDetectionProvider will also require

    // adding @Req\(\) to Doc 04's verify\-session controller method, the

    // same way Step 9c added it to the webhook controller\.

    const vpnProxyResult = await this\.vpnProxyDetectionProvider\.detect\(\{ ipAddress: '' \}\);

    // TRVG2 §1\.5: three distinct alerts \(VPN, proxy, or both\) — never a

    // generic message, so the account holder is not sent after a setting

    // that does not exist\. Detection does not consume an attempt or set

    // FAILED; it is thrown before any attempt/session row is written\.

    if \(vpnProxyResult \!== VpnProxyDetectionResult\.NONE\) \{

      throw new VpnProxyDetectedException\(vpnProxyResult\); // carries which of VPN/proxy/both \(TRVG2 §1\.5\)

    \}

 

    const session = await this\.documentVerificationProvider\.startVerificationSession\(\{

      documentId: document\.id,

      documentType: document\.documentType,

      issuingCountry: document\.issuingCountry,

      documentImageReference: document\.documentImageReference,

    \}\);

 

    // TRVG §3: UNSTARTED/FAILED/EXPIRED, Session created \-> IN\_PROGRESS\.

    // Whether this same Didit call also counts as TRVG §3's separate

    // "Submitted to vendor" event \(which would additionally set PENDING\)

    // is not resolved by any source \-\- see Section 4\. PENDING is not set

    // here\.

    await this\.profileRepository\.update\(profile\.id, \{

      identityVerificationStatus: IdentityVerificationStatus\.IN\_PROGRESS,

    \}\);

 

    const attemptNumber = existingAttempts \+ pendingSessions \+ 1;

    // Doc 05's own addition \(Step 2a\) — not a verification\_attempts row,

    // and Doc 03's confirmed attempt\_outcome vocabulary is not touched

    // here\. This row only correlates the session until the webhook \(Step

    // 9d\) reports a real outcome\.

    const pendingSession = this\.pendingSessionRepository\.create\(\{

      profileId: profile\.id,

      documentId: document\.id,

      vendorSessionId: session\.vendorSessionId,

      attemptMethod: document\.captureMethod,

      attemptDocumentType: document\.documentType,

      attemptNumber,

      vpnProxyDetectionResult: vpnProxyResult,

    \}\);

    await this\.pendingSessionRepository\.save\(pendingSession\);

 

    return \{

      vendorSessionId: session\.vendorSessionId,

      vendorSessionUrl: session\.vendorSessionUrl,

      attemptNumber,

    \};

  \}

 

  async listDocuments\(userId: string\): Promise<IdentityDocument\[\]> \{

    const profile = await this\.getOrCreateProfile\(userId\);

    return this\.documentRepository\.find\(\{ where: \{ profileId: profile\.id \} \}\);

  \}

 

  // \-\-\- Internal / webhook \-\-\-

 

  async getStatusForInternalCaller\(

    userId: string,

  \): Promise<\{

    identityVerificationStatus: IdentityVerificationStatus;

    locationVerificationStatus: LocationVerificationStatus;

    // Computed \(TRVG2 §2\), not a stored field \-\- matches Doc 04's

    // revised internal contract exactly\. isVerified is this service's

    // own exposed predicate and still computes ONLY is\_verified\(account\)

    // \-\- identity\_status == VERIFIED AND location\_status == VERIFIED\.

    // TRVG2 replaces the old in\_marketplace\(account\)/G1\-\-G6 framing

    // entirely: profile\.completeness no longer participates in gating

    // at all, and the real gating predicate is now nine gates wide

    // \(G1\-\-G9, TRVG2 §2\) evaluating gate\_open\(account\) := is\_verified\(\)

    // OR in\_grace\(\) \-\- where in\_grace extends access 30 days past

    // expired\_at \(TRVG2 §1\.1, §2\)\. KNOWN GAP \(18 September 2026\): this

    // method was not extended to return gate\_open, only is\_verified \-\-

    // a caller relying on isVerified here would incorrectly read a

    // grace\-period account as ungated\. Extending the returned shape is

    // an API\-contract change \(Doc 04\) this document does not make

    // unilaterally; not fixed in this pass\. No gate is enforced here

    // regardless \-\- that remains each consuming action's own job

    // \(Doc 04 §8b; TRVG2 §2\.3\)\.

    isVerified: boolean;

  \}> \{

    const profile = await this\.profileRepository\.findOne\(\{ where: \{ userId \} \}\);

    if \(\!profile\) throw new ProfileNotFoundException\(\);

    return \{

      identityVerificationStatus: profile\.identityVerificationStatus,

      locationVerificationStatus: profile\.locationVerificationStatus,

      isVerified:

        profile\.identityVerificationStatus === IdentityVerificationStatus\.VERIFIED &&

        profile\.locationVerificationStatus === LocationVerificationStatus\.VERIFIED,

    \};

  \}

 

  async handleDiditWebhook\(

    payload: DiditWebhookPayloadDto,

    signatureHeader: string | undefined,

    rawBody: Buffer,

  \): Promise<void> \{

    const verified = verifyDiditWebhookSignature\(

      rawBody,

      signatureHeader,

      process\.env\.DIDIT\_WEBHOOK\_SECRET as string,

    \);

    if \(\!verified\) throw new InvalidWebhookSignatureException\(\);

 

    // Doc 03's unique index on vendor\_session\_id makes this a single

    // indexed lookup\. If a settled attempt already exists, this delivery

    // has already been processed by an earlier call \(Didit re\-delivering,

    // or a genuine duplicate\) — idempotent no\-op \(Doc 03 §10's column

    // comment\)\. This never touches pending\_verification\_sessions\.

    const existingAttempt = await this\.attemptRepository\.findOne\(\{

      where: \{ vendorSessionId: payload\.vendorSessionId \},

    \}\);

    if \(existingAttempt\) \{

      return;

    \}

 

    const pendingSession = await this\.pendingSessionRepository\.findOne\(\{

      where: \{ vendorSessionId: payload\.vendorSessionId \},

    \}\);

    if \(\!pendingSession\) throw new UnknownVendorSessionException\(\);

 

    // PLACEHOLDER outcome mapping — see Step 9d's callout\.

    const raw = payload\.raw as \{ outcome?: string; failure\_code?: string \} | undefined;

    const outcome = raw?\.outcome ?? AttemptOutcome\.ERROR;

 

    // First delivery for this session: create the one and only

    // verification\_attempts row for this attempt \(Doc 03's confirmed

    // schema, written here with a real outcome already known — never with

    // a placeholder value\), then remove the now\-consumed pending session\.

    // Both happen in one transaction so a mid\-way failure can't leave the

    // session correlated twice\.

    const queryRunner = this\.dataSource\.createQueryRunner\(\);

    await queryRunner\.connect\(\);

    await queryRunner\.startTransaction\(\);

    try \{

      const attempt = queryRunner\.manager\.create\(VerificationAttempt, \{

        profileId: pendingSession\.profileId,

        documentId: pendingSession\.documentId,

        vendorSessionId: pendingSession\.vendorSessionId,

        attemptMethod: pendingSession\.attemptMethod,

        attemptDocumentType: pendingSession\.attemptDocumentType,

        attemptOutcome: outcome,

        attemptNumber: pendingSession\.attemptNumber,

        vpnProxyDetectionResult: pendingSession\.vpnProxyDetectionResult,

        failureCode: raw?\.failure\_code ?? null,

      \}\);

      const savedAttempt = await queryRunner\.manager\.save\(attempt\);

      await queryRunner\.manager\.delete\(PendingVerificationSession, pendingSession\.id\);

 

      if \(outcome === AttemptOutcome\.APPROVED\) \{

        await queryRunner\.manager\.update\(IdentityVerificationProfile, savedAttempt\.profileId, \{

          identityVerificationStatus: IdentityVerificationStatus\.VERIFIED,

        \}\);

      \} else if \(outcome === AttemptOutcome\.REJECTED\) \{

        // TRVG §3: PENDING, Vendor rejects \-> FAILED \(attempt\_count < 3\) or

        // FAILED\_FINAL \(attempt\_count = 3\)\. Uses savedAttempt\.attemptNumber \-\-

        // account\-wide \(existingAttempts \+ pendingSessions \+ 1, Step 9\),

        // resolved 18 September 2026 \(Answer 3; TRVG2 §2 gate\-table

        // note\)\. No separate query needed here\.

        await queryRunner\.manager\.update\(IdentityVerificationProfile, savedAttempt\.profileId, \{

          identityVerificationStatus:

            savedAttempt\.attemptNumber >= RETRY\_LIMIT

              ? IdentityVerificationStatus\.FAILED\_FINAL

              : IdentityVerificationStatus\.FAILED,

        \}\);

        // AttemptOutcome\.ERROR: left unresolved \-\- see Section 7\.

      \}

      await queryRunner\.commitTransaction\(\);

 

      if \(outcome === AttemptOutcome\.APPROVED\) \{

        await this\.events\.publish\(\{

          eventType: IdentityVerificationEventType\.IDENTITY\_VERIFIED,

          profileId: savedAttempt\.profileId,

          userId: payload\.vendorSessionId, // see note below

          occurredAt: new Date\(\)\.toISOString\(\),

        \}\);

      \}

      // 'rejected' and 'error' outcomes: the attempt row now reflects the

      // real outcome; the profile's identity\_verification\_status is left

      // as\-is\. See Section 4 on why this is not set to rejected\_blocked\.

    \} catch \(err\) \{

      if \(queryRunner\.isTransactionActive\) \{

        await queryRunner\.rollbackTransaction\(\);

      \}

      throw err;

    \} finally \{

      await queryRunner\.release\(\);

    \}

  \}

\}

__KNOWN SIMPLIFICATION — RESOLVE BEFORE RELYING ON THIS EVENT'S userId__

handleDiditWebhook's IDENTITY\_VERIFIED event above publishes userId: payload\.vendorSessionId as a placeholder — the webhook payload does not carry this service's own userId, only Didit's vendorSessionId, and the identity\_verification\_profiles lookup needed to resolve the real userId is a one\-line addition \(profileRepository\.findOne\(\{ where: \{ id: savedAttempt\.profileId \} \}\)\) intentionally left out of this code block to keep it focused on the outcome\-handling logic; add that lookup before relying on this event's userId field downstream\.

## __Step 12 — Wire Everything Into app\.module\.ts__

This shows only the additions this document introduces on top of Doc 04's app\.module\.ts\. Nothing Doc 03 or Doc 04 already added is removed\.

__FILE: apps/identity\-verification\-service/src/app\.module\.ts \(full file, Doc 05's additions marked\)__

import \{ Module \} from '@nestjs/common';

import \{ TypeOrmModule \} from '@nestjs/typeorm';

import \{ ScheduleModule \} from '@nestjs/schedule'; // Doc 05 addition

import \{ identityVerificationDataSourceOptions \} from '\./database/data\-source';

import \{ IdentityVerificationProfile \} from '\./entities/identity\-verification\-profile\.entity';

import \{ IdentityDocument \} from '\./entities/identity\-document\.entity';

import \{ VerificationAttempt \} from '\./entities/verification\-attempt\.entity';

import \{ PendingVerificationSession \} from '\./entities/pending\-verification\-session\.entity'; // Doc 05 addition

import \{ IdentityVerificationController \} from '\./controllers/identity\-verification\.controller';

import \{ IdentityVerificationInternalController \} from '\./controllers/identity\-verification\-internal\.controller';

import \{ IdentityVerificationWebhooksController \} from '\./controllers/identity\-verification\-webhooks\.controller';

import \{ IdentityVerificationService \} from '\./services/identity\-verification\.service';

 

// \-\-\- Doc 05 additions below \-\-\-

import \{ TravelModeReminderJob \} from '\./jobs/travel\-mode\-reminder\.job';

import \{

  DOCUMENT\_VERIFICATION\_PROVIDER,

\} from '\./providers/document\-verification/document\-verification\-provider\.interface';

import \{ DiditDocumentVerificationProvider \} from '\./providers/document\-verification/didit\-document\-verification\.provider';

import \{

  VPN\_PROXY\_DETECTION\_PROVIDER,

\} from '\./providers/vpn\-proxy/vpn\-proxy\-detection\-provider\.interface';

import \{ UnimplementedVpnProxyDetectionProvider \} from '\./providers/vpn\-proxy/unimplemented\-vpn\-proxy\-detection\.provider';

import \{ OBJECT\_STORAGE\_PROVIDER \} from '\./providers/storage/object\-storage\-provider\.interface';

import \{ R2ObjectStorageProvider \} from '\./providers/storage/r2\-object\-storage\.provider';

import \{ NOTIFICATION\_EVENT\_PUBLISHER \} from '\./events/notification\-event\-publisher\.interface';

import \{ RabbitMqNotificationEventPublisher \} from '\./events/rabbitmq\-notification\-event\-publisher';

 

@Module\(\{

  imports: \[

    TypeOrmModule\.forRoot\(identityVerificationDataSourceOptions\),

    TypeOrmModule\.forFeature\(\[

      IdentityVerificationProfile,

      IdentityDocument,

      VerificationAttempt,

      PendingVerificationSession, // Doc 05 addition — see Step 2a

    \]\),

    ScheduleModule\.forRoot\(\), // Doc 05 addition — enables @Cron in Step 10's job

  \],

  controllers: \[

    IdentityVerificationController,

    IdentityVerificationInternalController,

    IdentityVerificationWebhooksController,

  \],

  providers: \[

    IdentityVerificationService,

    // \-\-\- Doc 05 additions below \-\-\-

    TravelModeReminderJob,

    \{ provide: DOCUMENT\_VERIFICATION\_PROVIDER, useClass: DiditDocumentVerificationProvider \},

    \{ provide: VPN\_PROXY\_DETECTION\_PROVIDER, useClass: UnimplementedVpnProxyDetectionProvider \},

    \{ provide: OBJECT\_STORAGE\_PROVIDER, useClass: R2ObjectStorageProvider \},

    \{ provide: NOTIFICATION\_EVENT\_PUBLISHER, useClass: RabbitMqNotificationEventPublisher \},

  \],

\}\)

export class AppModule \{\}

## __Step 13 — Environment Variables__

Every variable this document's code reads\. Add each to your \.env file \(Doc 03 Step 2 already created it\) and to this service's environment configuration wherever it deploys\.

__Variable__

__Purpose__

RABBITMQ\_URL

Connection string for the shared Marketeq RabbitMQ broker \(Step 5\)\. Platform\-standard variable name \(Architecture Overview, Appendix\)\.

DIDIT\_API\_BASE\_URL

Base URL for Didit's API \(Step 3\)\. Placeholder until Didit's real API documentation is available\.

DIDIT\_API\_KEY

Credential for calls to Didit's API \(Step 3\)\.

DIDIT\_WEBHOOK\_SECRET

Shared secret used to verify the x\-didit\-signature header \(Step 9a\)\. Placeholder header/scheme — see that step's callout\.

R2\_ACCOUNT\_ID

Cloudflare account ID, used to build R2's S3\-compatible endpoint URL \(Step 6\)\.

R2\_ACCESS\_KEY\_ID

R2 access key \(Step 6\)\.

R2\_SECRET\_ACCESS\_KEY

R2 secret key \(Step 6\)\.

R2\_BUCKET\_NAME

R2 bucket this service uploads document images into \(Step 6\)\.

__PLACEHOLDER CREDENTIALS — NOT CONFIRMED VALUES__

None of these are confirmed Infrastructure/Security values — they are this document's own placeholder names, consistent with Doc 03 §10 and Doc 04 §9 already flagging R2 and Didit credentials as pending confirmation\. Ask Infrastructure/whoever administers each vendor account for the real values before deploying anywhere but local development\.

## __Step 14 — Verify__

Doc 04's two auth guards still always reject \(Section 4 — out of scope for this document\), so a curl against any bearer\-auth or internal\-auth route still returns 401 by design, exactly as Doc 04's own verify step already established\. The checks below focus on what this document added and what can genuinely be exercised end\-to\-end today: the webhook route \(no guard\) and the database logic directly\.

__14a\. Start the service__

__Run from: apps/identity\-verification\-service/__

npm run start:dev

Expected: the same route list Doc 04's verify step described, still starting cleanly with no dependency\-injection errors\. If Nest reports it cannot resolve a dependency for IdentityVerificationService or TravelModeReminderJob, re\-check that every provider token in Step 12's app\.module\.ts is spelled exactly as its interface file exports it\.

__14b\. Verify the webhook end\-to\-end, including the signature check__

The webhook route has no guard, so this is a genuine end\-to\-end test\. First, seed one pending\_verification\_sessions row directly — this stands in for a prior startVerificationSession call \(Step 8\), which the placeholder auth guard would otherwise block from a plain curl\. Note this is Step 2a's table, not verification\_attempts — no verification\_attempts row should exist yet for this session:

INSERT INTO identity\_verification\.pending\_verification\_sessions

  \(profile\_id, document\_id, vendor\_session\_id, attempt\_method, attempt\_document\_type, attempt\_number, vpn\_proxy\_detection\_result\)

VALUES

  \('<an existing profile id>', '<an existing document id>', 'test\-session\-001', 'scan', 'passport', 1, 'none'\);

Next, compute a valid signature for a test payload using Node, with the same DIDIT\_WEBHOOK\_SECRET your \.env file uses:

node \-e "

const crypto = require\('crypto'\);

const body = JSON\.stringify\(\{ vendorSessionId: 'test\-session\-001', eventType: 'verification\.completed', occurredAt: new Date\(\)\.toISOString\(\), raw: \{ outcome: 'approved' \} \}\);

const sig = crypto\.createHmac\('sha256', process\.env\.DIDIT\_WEBHOOK\_SECRET || 'dev\-secret'\)\.update\(body\)\.digest\('hex'\);

console\.log\(body\); console\.log\(sig\);

"

Then send it:

curl \-i \-X POST http://localhost:3000/v1/identity\-verification/webhooks/didit \\

  \-H "Content\-Type: application/json" \\

  \-H "x\-didit\-signature: <the signature the script printed>" \\

  \-d '<the body the script printed>'

Expected: HTTP 200, \{ "received": true \}; the pending\_verification\_sessions row seeded above is now gone; and a new verification\_attempts row exists for the same profile/document with attempt\_outcome = 'approved' — confirm both with a SELECT against each table\. Re\-sending the exact same request a second time should still return 200 without changing anything further — the second delivery finds the settled verification\_attempts row and returns immediately \(Step 9d's idempotency check\)\. Sending it with the signature header altered by even one character should return 401 with code: "INVALID\_SIGNATURE"\. Sending a well\-signed payload with a vendorSessionId that matches neither table should return 404 with code: "UNKNOWN\_VENDOR\_SESSION"\.

__14c\. Verify the duplicate\-detection transaction directly__

This is Doc 03 §8a's own SQL, so it can be verified with psql alone, independent of the HTTP layer or auth guards\. Insert one document row for profile A, then run the lookup a second profile's submission would trigger\. The document\_number\_normalized value below is a placeholder illustrating the query shape, not a real hash — see Step 11's PLACEHOLDER FINGERPRINT callout:

SELECT id, profile\_id FROM identity\_verification\.identity\_documents

WHERE document\_number\_normalized = '<hash\-of\-the\-test\-document\-number>' AND issuing\_country = 'US'

  AND document\_type = 'passport' AND profile\_id <> '<profile B id>'

LIMIT 1;

Expected: this returns profile A's document row when profile A already has a matching document on file, and returns nothing when it doesn't — exactly the branch submitDocument \(Step 11\) checks before deciding whether to throw DuplicateDocumentException\.

__14d\. Verify the reminder job's cadence logic__

EVERY\_DAY\_AT\_9AM won't fire during a short local session\. To see it run without waiting, temporarily change Step 10's @Cron\(CronExpression\.EVERY\_DAY\_AT\_9AM\) to @Cron\(CronExpression\.EVERY\_MINUTE\), restart the service, and set one profile's next\_travel\_reminder\_at to a past timestamp directly in the database\. Within a minute, the log line from runDailySweep should appear and next\_travel\_reminder\_at should move forward\. Revert the CronExpression change before committing — EVERY\_MINUTE is for this check only\.

# __6\. Notification Event Reference__

All six occasions Service Overview item 14 confirms, and where each is actually emitted \(or not\) by this document's code\.

__Event Type__

__Emitted By__

__When__

__Source__

travel\_mode\_activated

recordTravelDuration

Duration recorded \(or skipped\) while classified Temporarily Traveling\.

Service Overview item 14

travel\_mode\_still\_active

TravelModeReminderJob

Daily sweep finds a profile due for a reminder, not on a skip day \(Step 10\)\.

Service Overview item 14, item 3

location\_verification\_submitted

Not wired — see Section 7

Type defined; no call site in this document\.

Service Overview item 14 \(name only\)

identity\_verified

handleDiditWebhook

Didit webhook reports outcome 'approved'\.

Service Overview item 14

location\_verified

confirmHomeCountry

First\-time home\-country confirmation\.

Service Overview item 14 \(this document's reading — Section 4\)

home\_country\_updated

confirmHomeCountry

A later confirmation that changes the stored country\.

Service Overview item 14 \(this document's reading — Section 4\)

# __7\. Pending Confirmations Carried Into This Document__

None of these block the code above from compiling and running today\. Each is a place where this document made the narrowest workable engineering decision instead of guessing a Product or vendor answer\.

- Didit's real API contract — the session\-start request/response shape \(Step 3\), the webhook payload/signature scheme and outcome vocabulary \(Step 9\) — is a placeholder throughout, not production\-ready code\. Confirm against Didit's actual documentation and update every flagged mapping point before relying on this in a real Didit account\. The surrounding orchestration \(retry counting, the duplicate\-detection transaction, the pending\-session correlation, event publishing\) does not depend on Didit's real contract and does not need to change when it is confirmed\.
- pending\_verification\_sessions \(Step 2a\) is this document's own technical recommendation, not part of Doc 03's confirmed schema\. If the team wants durable in\-flight\-session correlation formalized as part of the authoritative data model, adding this table \(or an equivalent\) to Doc 03 and the Data Dictionary is a synchronization step this document does not take on its own\.
- What happens once the 3\-attempt retry ceiling is reached is now named by TRVG §3 \(FAILED\_FINAL\) and Doc 03's revised nine\-value enum, superseding this document's original 1 September note that no source defined it\. Section 4 now implements that transition on a confirmed AttemptOutcome\.REJECTED, reusing the existing per\-document count\. What remains genuinely open is narrower than before: whether AttemptOutcome\.ERROR should drive the same transition, and the account\-versus\-document attempt\-scope question this new logic inherits from Doc 03 §8b — see Section 4 and the entries below\. \[Superseded, 18 September 2026: the account\-versus\-document scope question referenced here is resolved — confirmed account\-wide, per Christopher’s Answer 6 and Doc 03 §8b's and this document's own 18 September 2026 revisions \(Section 4's retry\-count\-derivation bullet, already annotated\)\. Section 4 now reuses an account\-wide count, not the per\-document count this bullet describes\. Whether AttemptOutcome\.ERROR should drive the same transition remains open\.\]
- VPN/proxy detection has no real implementation or confirmed owner \(Technical Architecture §12\), and no source defines what should happen when the signal is unavailable — that is an unresolved dependency, not a decision this document makes\. The only registered VpnProxyDetectionProvider always returns NONE as scaffolding, not as a chosen fail\-open policy\. Before this signal is relied on for anything, both a real signal source and the fallback policy need to be confirmed; startVerificationSession's controller method will also need a request\-IP parameter added \(Step 11's callout\) — it doesn't have one today\. \[Updated 21 September 2026: “confirmed owner” is superseded — Q4 \(five\-question technical resolution, engineering decision made under Christopher's SOP guidance\) resolves that this service's own backend team builds the detector\. What remains exactly as unresolved as before: the fallback policy when the signal is unavailable, the specific feed/vendor, and its cost\. VpnProxyDetectionProvider is unchanged — still Unimplemented/NONE \(Step 4\)\.\]
- The fresh\-login and detected\-country\-change reminder triggers \(onFreshLogin, onDetectedCountryChanged — Step 10\) are implemented with correct logic but are not called by anything\. No confirmed integration point delivers either signal to this service today \(Service Overview §7 on auth\-service; Technical Architecture §11 on the LocationProvider boundary, out of scope here\)\.
- location\_verification\_submitted \(Section 6\) is defined but not fired anywhere in this document\. Whether it belongs to the Permanently Relocated re\-verification path specifically, or some other action, is not disambiguated by any source available to this project\.
- The Permanently Relocated classification's confirmed behavior — routing back through location/document proof rather than duration selection and Travel Mode \(Service Overview item 4\) — is not built as a distinct flow here\. Doc 04 exposes one submitDocument endpoint; no source defines a separate request shape for a relocation\-proof submission, so this document does not invent one\. recordTravelClassification simply records the classification value\.
- The "skip the duration question" path \(AC\-05\.4\) has no distinct request shape in Doc 04's TravelDurationRequestDto — duration is a required enum with no "skipped" value\. recordTravelDuration \(Step 11\) only implements the "a duration was selected" path; this is a Doc 04 DTO gap this document does not patch around\.
- NotificationEventPublisher \(Step 5\) logs and swallows a publish failure rather than retrying it or using an outbox pattern\. No source defines a delivery\-guarantee requirement for this pipeline\.
- The RabbitMQ exchange name, routing\-key pattern, and Marketeq's own shared messaging client's real interface \(Technical Architecture §16\) all remain unconfirmed — this document's publisher \(Step 5\) is a standalone implementation pending that confirmation\. \[Updated 21 September 2026: the exchange name and routing\-key pattern are no longer unconfirmed — Q3 \(five\-question technical resolution, engineering decision made under Christopher's SOP guidance\) names amq\.topic and identity\-verification\.verification\.<event\-type> \(Step 5\)\. Marketeq's shared messaging client's real interface remains unconfirmed, as does whether notification\-service is actually bound to consume from this exchange/routing key — this document's publisher \(Step 5\) is still a standalone implementation pending that verification\.\]
- Migrating any already\-submitted rows' plaintext documentNumberNormalized \(Step 11\) to a real HMAC\-SHA\-256 hash, once secure pepper/KMS retrieval exists, is a separate, not\-yet\-implemented consideration — no source specifies a backfill procedure, and this document does not propose one \(Doc 03 §10 carries the same open item\)\. \[Added 21 September 2026\.\]
- handleDiditWebhook's IDENTITY\_VERIFIED event \(Step 11\) publishes a placeholder value for userId, flagged in that step's callout — resolve with a one\-line profile lookup before any downstream consumer relies on that field\.
- Doc 04's two authentication guards are untouched by this document and still always reject\. Replacing them with real authentication remains open — out of scope for the checklist item that authorized this document \(Section 4\)\.
- Doc 03's AttemptOutcome enum \(APPROVED, REJECTED, ERROR\) is explicitly flagged there as provisional and incomplete \("do not assume application code can safely restrict itself to only these three"\)\. This document now transitions identity\_verification\_status to FAILED/FAILED\_FINAL on REJECTED \(Section 4\), but ERROR's handling is left unresolved — whether an in\-band vendor error should also drive a FAILED transition, be treated like a vendor outage, or something else is not decided here\. BLOCKED\_AGE \(TRVG §3\) has no implementation path at all: DiditWebhookPayloadDto \(Doc 04\) guarantees only vendorSessionId, eventType, occurredAt, and an opaque raw field, with no basis for detecting an age\-specific outcome — this document does not invent one\.
- document\_expires\_on and last\_evaluated\_at \(Doc 03 §6a, TRVG §1\.1\) were added to the schema with population and scheduled\-job mechanics explicitly assigned to this document \(Doc 03's own entity comment: "Population and scheduled\-job mechanics are Doc 05's responsibility"\), but neither is populated, updated, or evaluated anywhere in this document, and no scheduled EXPIRED\-transition job exists — unlike the analogous Travel Mode reminder job \(Step 10\) this document does build\. What value should populate document\_expires\_on, when it should be set, and how the scheduled evaluation should run are not specified by any source and are not decided here; no expiry policy, population rule, scheduler, or backfill is proposed\.
- The account\-versus\-document attempt\-count scope question \(Section 4, and Doc 03 §8b\) is carried forward here as well: this document's retry\-count derivation, and the new FAILED/FAILED\_FINAL transition logic built on it \(Section 4\), both use the same per\-document scope Doc 03 flagged as provisional\. Resolving this is an open Engineering/Product decision, not something this document resolves on its own\. \[Superseded, 18 September 2026: this scope question is resolved — confirmed account\-wide, per Christopher’s Answer 6 and Doc 03 §8b's and this document's own 18 September 2026 revisions \(Section 4\)\. This document's retry\-count derivation and the FAILED/FAILED\_FINAL transition logic built on it now both use the account\-wide count, not the per\-document scope this bullet describes; nothing further is open on this specific question\.\]
- TRVG2 §6\.2 \[Citation corrected 21 September 2026; formerly cited as TRVG §6\.1\]'s anti\-enumeration rate\-limiting requirement for document submission \(Doc 04 §4: "Rate\-limit the endpoint so repeated submissions cannot be used to probe which documents exist in the system"\) constrains this document's submitDocument \(Step 11\) but is not implemented here\. No threshold, enforcement layer, middleware choice, or error code is proposed by this document either — those remain open Security/Engineering decisions, and application\-layer business logic is not necessarily where the enforcement belongs\.

# __8\. What's Next__

- Replace Doc 04's two auth guards with real authentication — the single most important piece of unfinished work across this document series \(carried forward from Doc 04 §9, unchanged by this document\)\.
- Confirm Didit's real API contract and update every placeholder mapping this document flagged: session\-start request/response \(Step 3\), webhook signature scheme and payload shape \(Step 9\)\.
- Confirm a VPN/proxy detection signal owner \(Technical Architecture §12\) and the fallback policy for when that signal is unavailable — neither is decided by any source or by this document — then replace Step 4's placeholder provider; add the request\-IP parameter startVerificationSession's controller method is currently missing\. \[Updated 21 September 2026: the owner question is now addressed — Q4 proposes identity\-verification\-service's own backend team, with MaxMind GeoIP2 recommended\. The fallback policy, vendor selection, and cost remain exactly as open as before, and replacing Step 4's placeholder provider is still the next action\.\]
- Decide how login\-time and detected\-country\-change signals reach this service, then call the two already\-implemented, currently\-unwired reminder hooks \(Step 10\) from wherever those signals land\.
- Resolve location\_verification\_submitted's trigger condition and, separately, whether the Permanently Relocated re\-verification path needs its own request shape\.
- Once this document is accepted, update the Required Docs Checklist to mark Doc 05 complete, and confirm the number and scope of whichever document comes next \(Document 06 — Identity Verification Setup & Bootstrapping, per that checklist\)\.

