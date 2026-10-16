__10 — IDENTITY VERIFICATION SECURITY & AUTH__

*Internal Service Auth, PII Handling Posture, Encryption/KMS Approach — identity\-verification\-service*

__Epic: __Identity Verification

__Document Role: __Restates this service's current internal\-service\-authentication posture \(Doc 04's guard placeholders, unchanged\), classifies every PII\-bearing column Doc 03 already defined against its actual current protection and exposure, and restates the encryption/KMS gap Doc 03 §10 already flagged as unresolved, together with how every secret this service loads is handled today\. Documents, rather than resolves, every gap it finds along the way\.

__Prerequisites: __Doc 03 — Data Model & Database Schema, Doc 04 — API Specification, Doc 05 — Business Logic & Workflows, Doc 06 — Setup & Bootstrapping, Doc 07 — Integrations & Events, Doc 08 — Monitoring & Observability, Doc 09 — Error Handling \(all built, smoke\-tested, and complete — built and smoke\-tested does not mean every code path is production\-ready; see Docs 05, 06, 07, 08, and 09's own Section 7 for their unresolved implementation dependencies\), Marketeq Core Backend Technical Architecture Overview & Documentation Standards

__Author: __CTO — written for a developer building this microservice for the first time

__Status: __Final — ready to implement

__Date: __2 September 2026

__UPDATE — 16 SEPTEMBER 2026__

Applies all seven findings from the Document 10 impact report \(16 Sep 2026\)\. Step 2a's document\_number\_normalized classification is corrected: TRVG2 §1\.6 \[Citation corrected 21 September 2026; formerly cited as TRVG §1\.3\] and revised Doc 03 §6b/§8a require a one\-way hash, but the current code \(Doc 05 Step 11\) computes only a plaintext trim\+uppercase transform, explicitly flagged there as a non\-production\-safe placeholder; Section 7 gains an open item for Security/Engineering to choose the algorithm — no algorithm is chosen or implemented here\. Section 1 and Section 7 now carry forward SVC\-24 \(whether a visibility\-only internal\-review capability coexists with, or has been superseded by, the Decision Record's no\-manual\-review position\) — unresolved, no access surface designed\. A new passage after Step 1a's guard table explains that GET status/:userId may return raw statuses to an authorized internal caller, and that per Doc 04 §8b and TRVG §6 the calling service, not this one, is responsible for keeping that data from a hiring client or team owner — the existing API contract and responsibility split is unchanged\. A new callout after the same table discloses that the webhook's x\-didit\-signature header and HMAC\-SHA256 scheme are themselves Doc 04's and Doc 05's own unconfirmed placeholder, and separately states the already\-implemented duplicate\-delivery idempotency \(Doc 05 Step 9d\) — neither the signature code nor the idempotency logic is changed, and neither is described as comprehensive replay protection or a confirmed vendor scheme\. Section 1 and Section 7 now disclose the known IDENTITY\_VERIFIED\.userId gap \(Doc 05/07 Section 7\) — that field should not be treated as reliably identifying the verified account until the publisher is corrected; event schemas, publishers, and RabbitMQ configuration are unchanged\. Section 4 and Section 7's rate\-limiting finding is narrowed: TRVG2 §6\.2 \[Citation corrected 21 September 2026; formerly cited as TRVG §6\.1\] already requires rate limiting on the document\-submission endpoint specifically \(confirmed, not implemented\); general\-purpose rate limiting, CORS, and security headers remain genuinely undefined by any source\. The Prerequisites line now notes that built and smoke\-tested does not mean production\-ready, per Docs 05–09's own Section 7\. No guard, DTO, route, environment variable, PII catalog entry other than document\_number\_normalized's, or application code changed\. The failure\_code logging gap, encryption/KMS discussion, R2 storage question, TLS\-termination silence, Dockerfile hardening gap, and diagnostic\-script build\-isolation risk are all unchanged and not newly resolved\. The Decision Record authority question and every other outstanding Security/Engineering/Product/Infrastructure decision remain exactly as open as before\.

Update — 18 September 2026: resolves SVC\-24 \(Section 7\) and extends the GET status/:userId design \(Step 1a\) per Christopher’s Answer 4 and Technical Requirements — Verification Gates 2 \(“TRVG2”\) §6\.1\. SVC\-24 is confirmed needed as a data\-only surface — no support screen is built this release, but the endpoint is built now so one can be added later without a data migration\. The endpoint design is extended to include attempt\_count, timestamps, and a coarse failure reason alongside the existing statuses, and to state explicitly: read\-only \(cannot mutate status, reset attempts, or clear a block\), no document access \(never document images, raw vendor payloads, or document\_ref\), and every read attributed and logged\. This document does not implement the guard, the controller method, or the logging middleware — it documents the confirmed design, consistent with this document’s existing practice of describing rather than building\.

__UPDATE — 21 SEPTEMBER 2026__

Update — 21 September 2026 \(SOP B compliance review, Doc 10 pass\): four additive items; nothing above is altered\. Step 2a’s document\_number\_normalized table entry and the matching §7 finding are updated to reflect the five\-question technical resolution \(Q2\): HMAC\-SHA\-256, keyed with a KMS\-held pepper, computed over the normalized document number only, is the selected design — an engineering decision made under Christopher's SOP guidance, and still not implemented \(Doc 05’s code still computes only the plaintext trim/uppercase transform\)\. Three instances of “TRVG §1\.3” are corrected to “TRVG2 §1\.6”, and four instances of “TRVG §6\.1” \(Section 4’s and §7’s rate\-limiting findings, two each\) are corrected to “TRVG2 §6\.2” — both verified directly against TRVG2’s text, not a same\-number label swap\. TRVG2 §6\.1 \(“Internal and support access”\), cited above for SVC\-24, is a different, correctly\-cited section and is untouched\. Engineering/architecture position made under Christopher's SOP guidance, not yet a Didit\-confirmed fact \(five\-question technical resolution, Q5\): Didit\-hosted capture is the proposed architecture, which would make Didit the proposed owner of TLS termination and certificate management for the capture flow, per the Unresolved Questions register’s Answer\-8 rule \(item 3\) — this remains pending Didit’s direct confirmation, and Section 4/Section 7’s TLS\-termination finding below is updated to reflect this\.

# __1\. Purpose & Scope__

The Architecture Overview's confirmed guidance on this document's three topics is spread across short, generic sections rather than one dedicated place: §5\.7 \("Security & Permissions" — required roles/permissions, input validation, common guards/interceptors, a per\-service documentation template heading, not a policy\), §7\.2 \("Shared Code" — reusable guards belong under /shared, never duplicated per service\), and §7\.3 \("Error Shape", already fully covered by Doc 09\)\. None of these name a KMS product, an encryption algorithm, an internal\-JWT claim shape, or a PII classification scheme\. This service's actual internal\-auth code \(Doc 04 Step 6a\), its actual PII\-bearing columns \(Doc 03\), and its actual secret\-loading mechanism \(Doc 05 Step 13, Doc 06 Step 3\) are already fully built — nothing about them changes here\. This document does three things: it restates today's internal\-service\-auth posture in one place and lays out, as a labeled engineering recommendation, what a real replacement needs to satisfy; it classifies every PII\-bearing column Doc 03 already defined against its actual current protection and exposure; and it restates the encryption/KMS gap Doc 03 §10 already flagged as unresolved, together with the current, plain\-environment\-variable state of every secret this service loads, without choosing a vendor or inventing a decision no source has made\.

This document does NOT cover: a real replacement for BearerAuthGuard or InternalServiceGuard \(both still unconditionally reject exactly as Doc 04 built them\); a chosen encryption/KMS product or algorithm for document\_number or any other column \(Doc 03 §10 remains unresolved — Section 7\); a secrets\-manager or vault integration \(this service still reads every secret from a plain environment variable, exactly as Doc 05/06 built it\); rate limiting, CORS, or HTTP security headers for this service \(no confirmed source addresses any of these — Section 7\); whether SVC\-24's internal\-review access surface — a visibility\-only capability for an internal team to review verification status and submitted documents — is still needed alongside, or has been superseded by, the Decision Record's no\-manual\-review position \(unresolved — Section 7\); the privacy of data published in this service's RabbitMQ event payloads \(Doc 07's Event Catalog\), including the known gap where the currently\-wired IDENTITY\_VERIFIED publisher sets userId to a Didit vendor session ID rather than the profile's real user ID \(Doc 05/Doc 07 Section 7 — that field should not be treated as reliably identifying the verified account until the publisher is corrected and verified\); or any change to Doc 03's schema, Doc 04's guards or exception filter, or Doc 05/06's secret\-loading code\.

__WHY THIS DOCUMENT EXISTS AS ITS OWN NUMBER, WITH THIS SCOPE__

Unlike Doc 09's topic, this document's heading has a direct — if generic — counterpart in the Architecture Overview's own per\-service template: §5\.7, "Security & Permissions\." But this document's actual scope \(internal auth posture, PII classification, encryption/KMS\) is broader than §5\.7's three bullet points, and reaches into topics — a PII classification scheme, an encryption/KMS approach — that no section of the Architecture Overview names as belonging to any single numbered document\. This document exists as number 10, with exactly this scope, because the Required Docs Checklist currently in effect for this project locks it there: 10 — Security & Auth, "Internal service auth, PII handling posture, encryption/KMS approach \(flagged as unresolved in Doc 03 §10\)\." Its content is still fully sourced; only its existence as a separate, numbered document with this exact scope is project\-specific\.

__HOW THIS DOCUMENT RELATES TO ITS SOURCES__

Every claim in this document traces to one of: \(a\) the Architecture Overview's §5\.7/§7\.2/§7\.3 lines and its "auth\-service" service summary \(§6\) — the only confirmed platform\-wide material on this topic; \(b\) Docs 03–09's own already\-built and delivered code, referenced exactly, including newly\-surfaced findings about that code's actual current exposure \(Section 4\); \(c\) an engineering or classification decision this document makes on its own narrow authority, labeled as such in Section 4, and never presented as a Product, Architecture, or Infrastructure/Security decision; or \(d\) an explicitly\-flagged unresolved dependency — most centrally Doc 03 §10's own encryption/KMS gap — carried forward rather than invented an answer for \(Section 7\)\.

# __2\. Prerequisites__

- Docs 03–09 are complete: the service installs, builds, starts, serves every route, guard, provider, job, and event mechanism, and serves /health, /ready, and /v1/internal/metrics exactly as those documents left them\.
- No new npm dependency is installed by this document \(Section 4\) — everything below uses TypeScript types and plain data structures on top of packages Doc 04/05 already installed, plus @nestjs/common's own ExecutionContext type, already a dependency\.
- Familiarity with Doc 04's bearer\-auth\.guard\.ts and internal\-service\.guard\.ts, Doc 03's identity\_documents, identity\_verification\_profiles, and verification\_attempts entities, and Doc 05 Step 13 / Doc 06 Step 3's consolidated environment\-variable list — this document restates and classifies that code, it does not repeat its full listing here\.

# __3\. What You're Building__

Six new files, all reference material, classification data, or diagnostic tooling — nothing wires into the running request path, and nothing already\-confirmed changes:

- apps/identity\-verification\-service/docs/security/internal\-auth\-posture\.md — today's guard wiring restated exactly, what's confirmed vs\. not confirmed about a real replacement, and a labeled engineering recommendation for what that replacement needs to satisfy\.
- apps/identity\-verification\-service/scripts/dev\-verify\-guards\-reject\.ts — a diagnostic script proving, without starting the HTTP server, that both guards still unconditionally reject exactly as Doc 04 built them\.
- apps/identity\-verification\-service/src/common/security/pii\-classification\.ts — every PII\-bearing column Doc 03 already defined, in one array, each entry naming its sensitivity, its current protection, and its actual exposure in API responses and logs\.
- apps/identity\-verification\-service/scripts/dev\-list\-pii\-fields\.ts — a diagnostic script proving the PII catalog loads and printing it, the same pattern Doc 09's error\-code catalog script used\.
- apps/identity\-verification\-service/docs/security/pii\-handling\-posture\.md — the reasoning behind the catalog's classifications, including one newly\-surfaced logging gap this document flags but does not fix\.
- apps/identity\-verification\-service/docs/security/encryption\-kms\-approach\.md — Doc 03 §10's encryption/KMS gap restated exactly, today's secrets\-handling reality, and generic engineering options for both, presented for discussion only — no vendor chosen, nothing implemented\.

# __4\. Engineering Decisions Made in This Document__

None of these are Product, Architecture, or Infrastructure/Security decisions\. Three are newly\-surfaced findings about already\-confirmed code's actual current exposure, not decisions this document makes; the rest are the narrowest choices needed to organize material the Architecture Overview confirms is in scope but does not itself provide, or are explicitly labeled non\-binding recommendations\.

- The PII classification catalog \(Step 2\) and the encryption/KMS and secrets\-handling reference docs \(Step 3\) are pure, additive restatements of Doc 03's, Doc 05's, and Doc 06's already\-delivered code — no code anywhere imports the catalog, and it does not need to be added to app\.module\.ts, the same non\-wiring convention Doc 07's event catalog and Doc 09's error catalog already established for themselves\.
- Step 1's "readiness checklist" for replacing BearerAuthGuard and InternalServiceGuard is this document's own engineering recommendation, not a confirmed claim shape, signing\-key distribution, or secret\. It does not invent an answer to the exact gap Doc 04 §9 already flagged as unresolved — it only states, in general terms, what any real replacement needs to satisfy\.
- Step 3's engineering options for encrypting document\_number and for managing this service's secrets are presented for discussion only\. This document does not choose or recommend one option over another, does not implement any of them, and does not name a vendor or product — consistent with Doc 03 §10's own framing that this is "an Infrastructure/Security decision layered on top of this schema, not a change to it\."
- New finding, documented but not fixed: verification\_attempts\.failure\_code \(Doc 03 §6c\) is not named in Doc 08's logging\-conventions\.md "what must never be logged" list \(Doc 08 Step 2c\)\. It is vendor\-provided, server\-side\-only data \(00 §3 item 12\) that could plausibly leak vendor\-specific detail into a log line if a future log statement ever printed a full verification\_attempts row\. This document does not edit Doc 08's already\-delivered file to add it; that would be an unrequested change to an already\-confirmed file \(Section 7\)\.
- New finding, documented but not fixed: no confirmed source anywhere in this project — not the Architecture Overview, not Docs 03–09 — states where TLS is terminated for this service\. The only related context is the generic "GitHub Actions → Supabase" deployment path \(Architecture Overview §10\), which does not itself address transport security\. This document does not assume an answer \(Section 7\)\. \[Updated 21 September 2026: Didit\-hosted capture is now the proposed architecture \(five\-question technical resolution, Q5\) — an engineering/architecture position made under Christopher's SOP guidance, not yet a Didit\-confirmed fact\. If adopted, Didit would be the proposed owner of TLS termination and certificate management for the capture flow \(Unresolved Questions register, item 3, Answer 8’s rule\), but that ownership is not confirmed: Didit’s direct confirmation of whether it actually hosts the capture flow remains outstanding, and this document still does not assume an answer\.\]
- New finding, documented but not fixed: TRVG2 §6\.2 \[Citation corrected 21 September 2026; formerly cited as TRVG §6\.1\] already requires the document\-submission endpoint \(POST \.\.\./documents\) to be rate\-limited, specifically to prevent probing which documents exist in the system \(Doc 04 §4, Doc 09 Section 7\) — that requirement is confirmed but not yet implemented\. Beyond that one endpoint, no confirmed source addresses general\-purpose rate limiting, CORS policy, or HTTP security headers \(e\.g\. Helmet\) for this service specifically\. The Architecture Overview's own summary of api\-gateway \(§6\) names "request routing, auth enforcement, rate limits \(if configured\)" as that service's concern, which may be where general rate limiting is intended to live platform\-wide — but no source confirms this for identity\-verification\-service, or that it would by itself satisfy TRVG2 §6\.2's endpoint\-specific requirement, so both remain open gaps, not decisions made either way \(Section 7\)\.
- This document does not add a secrets\-manager or vault integration\. Every secret this service loads remains a plain environment variable, exactly as Doc 05 Step 13 and Doc 06 Step 3 already built; Step 3 only restates that fact under this document's encryption/KMS heading, it does not change it\.
- No new npm dependency is introduced\. The PII catalog is a plain TypeScript array; both diagnostic scripts use only Node/NestJS built\-ins already installed and the files they import\.

# __5\. Step\-by\-Step Implementation__

Follow these steps in order\. Every code block names the exact file path to create it in, relative to the repository root \(marketeq\-projects\-nestjs/\)\. All paths below start from apps/identity\-verification\-service/ — this folder, and everything Docs 03–09 already built inside it, already exists\.

## __Step 1 — Internal Service Auth__

Doc 04 Step 6a built two guards, both explicitly labeled structural placeholders, not real authentication: BearerAuthGuard and InternalServiceGuard\. Both still unconditionally reject every call today, unchanged through Docs 05–09 — verified live in Doc 08 Step 5f and Doc 09 Step 4c\. This step does not change either guard\. It restates exactly how they're wired today, restates exactly what is and isn't confirmed about their eventual replacement, and — as a labeled engineering recommendation only — lays out what that replacement needs to satisfy\.

__STILL UNRESOLVED — THIS STEP DOCUMENTS IT, IT DOES NOT FIX IT__

This is the single most important piece of unfinished work across this entire document series, restated identically by every document since Doc 04: Doc 04 Section 9, Doc 05 Section 7/8, Doc 06 Section 7/8, Doc 07 Section 7, Doc 08 Section 7, Doc 09 Section 7 — and now this document's own Section 7\. Nothing below resolves it\.

__1a\. Today's guard wiring, restated exactly__

__Controller__

__Guard__

__Routes Covered__

__Notes__

IdentityVerificationController

BearerAuthGuard

GET me, POST home\-country/confirm, POST travel\-classification, POST travel\-duration, POST documents/upload\-url, POST documents, POST documents/:documentId/verify, GET documents

Class\-level @UseGuards\(\) \(Doc 04 Step 8a\)\.

IdentityVerificationInternalController

InternalServiceGuard

GET status/:userId \(SVC\-20\)

Class\-level @UseGuards\(\) \(Doc 04 Step 8b\)\.

IdentityVerificationWebhooksController

None — no @UseGuards\(\) at all

POST didit

By design: authenticated by the HMAC signature header, not a guard \(Doc 04 Step 8c comment; Doc 05 Step 9\)\.

MetricsController

InternalServiceGuard

GET v1/internal/metrics

Same convention as SVC\-20's status endpoint \(Doc 08 Step 3b\)\.

HealthController / ReadinessController

None, by design

GET /health, GET /ready

Matches the Architecture Overview's own unguarded health\-check example \(§5\.6, §11\)\.

Both guards' current rejection behavior, quoted exactly as Doc 04 built it: BearerAuthGuard first checks only that an Authorization header is present and starts with "Bearer " — if not, it throws UnauthorizedException\('Missing bearer token'\); if the shape check passes, it still unconditionally throws "BearerAuthGuard is a placeholder — replace with the shared auth\-service JWT guard before use\." InternalServiceGuard ignores its input entirely and unconditionally throws "InternalServiceGuard is a placeholder — replace with the platform's real internal\-service auth before use\." Neither guard ever verifies a signature, an expiry, or an issuer, and neither ever accepts a request\. Both messages pass through AllExceptionsFilter's REQUEST\_FAILED branch unchanged and are shown verbatim to any caller today — the exact gap Doc 09 Step 3/Section 4 already classified as not safe to display verbatim\.

__WEBHOOK SIGNATURE SCHEME — DOCUMENTED, NOT CONFIRMED__

IdentityVerificationWebhooksController's guardless design is intentional — Didit's webhook is meant to be authenticated by its signature header, not @UseGuards\(\) \(Doc 04 §8c comment; Doc 05 Step 9\)\. But the specific scheme implementing that design is itself an unconfirmed placeholder: the header name \(x\-didit\-signature\) and the HMAC\-SHA256\-over\-raw\-body algorithm are Doc 04's and Doc 05's own placeholder, pending confirmation against Didit's actual webhook documentation \(Doc 04 §8c, Doc 05 Step 9a\) — not a confirmed signing mechanism\. This is not comprehensive replay protection: what is confirmed and already implemented is duplicate\-delivery idempotency — the handler looks up the existing verification\_attempts row by vendor\_session\_id and returns without any further write if an outcome is already recorded \(Doc 05 Step 9d\), live\-tested in Doc 05 Step 14b\. This document does not alter the signature\-verification code or the idempotency logic, and does not treat either as a confirmed, real\-vendor\-grade security guarantee\.

GET status/:userId \(InternalStatusResponseDto, Doc 04 Step 5e\) is confirmed, extended \(18 September 2026\), to return raw identityVerificationStatus and locationVerificationStatus values, a computed isVerified, and — per Christopher's Answer 4 and TRVG2 §6\.1 — attempt\_count, timestamps, and a coarse failure\_reason, to whichever caller InternalServiceGuard authorizes — today, none, since the guard unconditionally rejects every call \(Step 1a\)\. Three requirements are now explicit for this endpoint, none implemented by this document: \(1\) read\-only — it cannot mutate status, reset attempts, or clear a block, and no override path exists anywhere in this design; \(2\) no document access — document images, raw vendor payloads, and document\_ref are never exposed internally, since knowing a verification failed does not require seeing what was submitted; \(3\) access logged — every internal read must be attributed and logged\. Doc 04 Section 8b already confirms the design for once a real guard replaces this placeholder: this internal\-auth\-only endpoint may return raw statuses to authorized internal services, and the calling service — not this one — is responsible for applying TRVG2 §6's consumer\-scoping rules before any of it reaches an end user\. Per TRVG2 §6, a hiring client must never receive the status value itself, a failure reason, attempt\_count, an age or duplicate block, or document data; a team owner must never receive a member's failure reason, attempt\_count, or date of birth\. This document preserves that existing API contract and responsibility split, and adds the three requirements above to it — it still adds no filtering code, no new endpoint, and no new claim about what this service itself enforces\.

__1b\. What's confirmed, and what isn't, about a real replacement__

- Confirmed: auth\-service is the platform's unified authentication service and already issues JWTs for internal services as well as end users \(Architecture Overview §6, "auth\-service" summary: "issues JWTs for internal services"\)\.
- Confirmed: reusable guards belong under /shared, never duplicated per service \(Architecture Overview §7\.2\)\.
- Not confirmed by any source available to this project: the JWT's claim shape, the signing\-key distribution mechanism, the header/scheme name a real guard should expect, or whether a shared verification guard already exists under /shared today \(Doc 04 §6a callout, restated identically through every later document\)\.
- This document does not invent any of the above to fill the gap\. That restraint is not new here — it is the same restraint Doc 04 through Doc 09 have each already exercised on this exact point\.

__1c\. Reference document — today's posture, restated in one place__

__FILE: apps/identity\-verification\-service/docs/security/internal\-auth\-posture\.md__

\# Internal Service Auth — Posture — identity\-verification\-service

 

This file restates Doc 04 Step 6a's already\-built guards and Doc 04

Section 9's already\-confirmed dependency for replacing them\. It does

not change either guard file, and it does not invent an answer to

what remains unconfirmed\.

 

\#\# Today, both guards unconditionally reject

 

  \- BearerAuthGuard \(src/common/guards/bearer\-auth\.guard\.ts\): checks

    only that an Authorization header exists and starts with

    "Bearer " \(UnauthorizedException\('Missing bearer token'\) if not\),

    then unconditionally throws "BearerAuthGuard is a placeholder —

    replace with the shared auth\-service JWT guard before use\."

  \- InternalServiceGuard \(src/common/guards/internal\-service\.guard\.ts\):

    unconditionally throws "InternalServiceGuard is a placeholder —

    replace with the platform's real internal\-service auth before

    use," regardless of any header\.

 

Neither guard has ever accepted a request\. This is by design \(Doc 04

§6a: "do not deploy the placeholder logic below, and do not invent a

token format or shared secret to fill the gap in the meantime"\) and

is verified live in Doc 08 Step 5f and Doc 09 Step 4c\.

 

\#\# Confirmed dependency for the eventual replacement

 

  \- auth\-service is the platform's unified auth service and already

    issues JWTs for internal services as well as end users

    \(Architecture Overview §6\)\.

  \- Reusable guards belong under /shared, not duplicated per service

    \(Architecture Overview §7\.2\)\.

 

\#\# Not confirmed by any source available to this project

 

  \- The JWT's claim shape \(what fields it carries, e\.g\. a subject,

    an issuer, a service\-identity claim\)\.

  \- The signing\-key distribution mechanism \(a JWKS endpoint, a shared

    secret, something else\)\.

  \- The exact header/scheme name a real guard should expect \(this

    document assumes "Authorization: Bearer <token>" only because

    that is what BearerAuthGuard's placeholder shape\-check already

    uses — not because any source confirms it for the real mechanism\)\.

  \- Whether a shared verification guard already exists under /shared

    today for any other Marketeq service\.

 

This document does not guess at any of the above\. See Section 7 of

the document that shipped this file \(Doc 10\) for how this gap is

carried forward\.

 

\#\# Engineering recommendation for the eventual replacement \(see the

\#\# callout in Doc 10 Step 1d before treating this as more than that\)

 

  \- Verify the token's signature, expiry, and issuer against

    auth\-service's real, confirmed verification mechanism once it is

    documented — never trust an unverified claim, exactly as today's

    placeholder's own TODO comment \(Doc 04 Step 6a\) already says\.

  \- Derive the caller's identity \(userId, or an internal\-service

    identity\) only from verified claims, never from a raw header\.

  \- On rejection, return a generic, caller\-safe message — not the

    guard's own class name or a description of what implementation

    work remains\. Doing so would directly resolve the REQUEST\_FAILED

    information\-leak Doc 09 Step 3/Section 4 already found in today's

    placeholder messages, once a real replacement along these lines is

    actually built — nothing here builds it, and the leak remains

    exactly as open as Doc 09 and Section 7 of this document describe\.

  \- Implement the verification logic once, under /shared \(§7\.2\), so

    BearerAuthGuard and InternalServiceGuard can both call into it

    rather than each service reimplementing JWT verification\.

  \- Keep BearerAuthGuard \(end\-user callers\) and InternalServiceGuard

    \(internal\-service callers\) as two separate guard classes even if

    they share verification internals — they authenticate different

    caller populations and should be able to evolve independently\.

__RECOMMENDATION, NOT A CONFIRMED DECISION__

The recommendation above is this document's own engineering opinion, offered because a Security & Auth document that said nothing about what a real replacement should look like would be less useful — not because any source confirms these specific properties\. It does not name a claim shape, a signing\-key mechanism, or a header scheme beyond what today's placeholder already assumes\. Treat it as a checklist to hold a future implementation to, not as a specification to build directly from\.

__1d\. Diagnostic script — proving today's placeholders still reject__

__DIAGNOSTIC TOOLING — BUILD/IMAGE ISOLATION NOT GUARANTEED__

This script lives under scripts/, the same folder Doc 07's, Doc 08's, and Doc 09's diagnostic scripts used, and inherits the exact same caveat all three already flagged: Doc 06's tsconfig\.json has no include/exclude/rootDir and its \.dockerignore does not exclude scripts/ or docs/, so placement outside src/ does not by itself guarantee this file is excluded from a compiled build or Docker image\. That risk is not re\-solved here — see Doc 07 Section 7, Doc 08 Section 7, Doc 09 Section 7, and this document's Section 7\.

__FILE: apps/identity\-verification\-service/scripts/dev\-verify\-guards\-reject\.ts__

import \{ ExecutionContext \} from '@nestjs/common';

import \{ BearerAuthGuard \} from '\.\./src/common/guards/bearer\-auth\.guard';

import \{ InternalServiceGuard \} from '\.\./src/common/guards/internal\-service\.guard';

 

// Not part of the deployed service's request path — see the callout

// above this file in the document that shipped it \(Doc 10 Step 1d\)\.

// Proves, without starting the HTTP server, that both guards still

// unconditionally reject exactly as Doc 04 built them \(Section 7\)\.

 

function fakeContext\(headers: Record<string, string>\): ExecutionContext \{

  return \{

    switchToHttp: \(\) => \(\{

      getRequest: \(\) => \(\{ headers \}\),

    \}\),

  \} as unknown as ExecutionContext;

\}

 

function main\(\): void \{

  const bearerGuard = new BearerAuthGuard\(\);

  try \{

    bearerGuard\.canActivate\(fakeContext\(\{ authorization: 'Bearer test\-token' \}\)\);

    console\.log\('UNEXPECTED: BearerAuthGuard did not reject\.'\);

  \} catch \(err\) \{

    console\.log\(\`BearerAuthGuard rejected as expected: $\{\(err as Error\)\.message\}\`\);

  \}

 

  const internalGuard = new InternalServiceGuard\(\);

  try \{

    internalGuard\.canActivate\(fakeContext\(\{\}\)\);

    console\.log\('UNEXPECTED: InternalServiceGuard did not reject\.'\);

  \} catch \(err\) \{

    console\.log\(\`InternalServiceGuard rejected as expected: $\{\(err as Error\)\.message\}\`\);

  \}

\}

main\(\);

This script does not start the service, does not open a database connection, and does not import anything beyond the two guard classes and NestJS's own ExecutionContext type — it constructs the smallest fake request context each guard's canActivate method actually reads, then confirms both still throw\. It is a repeatable regression check a developer can run before and after any future real\-auth change, not a claim that this is how the guards are tested in production\.

## __Step 2 — PII Handling Posture__

Doc 03 already defined every column this service persists\. This step does not add, rename, or change a single one of them — it classifies the ones that carry personally identifiable information against their actual current protection \(Doc 03 §10: none are encrypted at rest\), their actual current exposure in an API response \(Doc 04's DTOs\), and their actual current exposure in a log line \(Doc 08's logging\-conventions\.md redaction list\)\. One classification surfaces a real, previously\-undocumented gap in that redaction list\.

__2a\. The classification catalog__

__FILE: apps/identity\-verification\-service/src/common/security/pii\-classification\.ts__

// A structured, cumulative classification of every PII\-bearing column

// Doc 03 already defined, plus this service's own location\-derived

// fields\. Do not add a row here for a column Doc 03's entities do not

// already have — this file describes those entities, it does not

// extend them\. If a future document adds a new persisted field that

// carries personal or vendor\-sensitive data, add its entry here too\.

export type PiiSensitivity = 'high' | 'medium' | 'low';

 

export interface PiiFieldEntry \{

  table: string;

  column: string;

  sensitivity: PiiSensitivity;

  meaning: string;

  source: string;

  // Whether this column is encrypted, hashed, or otherwise protected

  // beyond ordinary database access control, as it exists today\.

  currentProtection: string;

  // Whether/where this value is ever returned in an API response\.

  apiExposure: string;

  // Whether Doc 08's logging\-conventions\.md already forbids logging

  // this value by name\.

  loggingRedactionStatus: 'explicitly redacted' | 'not explicitly named — gap';

\}

 

export const PII\_FIELD\_CATALOG: readonly PiiFieldEntry\[\] = \[

  \{

    table: 'identity\_documents',

    column: 'document\_number',

    sensitivity: 'high',

    meaning: 'Raw document number, as captured or entered\.',

    source: 'Doc 03 Step 4b, §6b',

    currentProtection: 'Plain varchar\(64\) column, no encryption at rest \(Doc 03 §10\)\.',

    apiExposure: 'Accepted as request input \(SubmitDocumentDto\); never returned in any response DTO — DocumentResponseDto \(Doc 04 Step 5b\) comments "documentNumber is deliberately omitted\."',

    loggingRedactionStatus: 'explicitly redacted',

  \},

  \{

    table: 'identity\_documents',

    column: 'document\_number\_normalized',

    sensitivity: 'high',

    meaning: "TRVG2 §1\.6 \[Citation corrected 21 September 2026; formerly cited as TRVG §1\.3\] and Doc 03 §6b/§8a require this to be a one\-way hash of the trimmed, upper\-cased document number \(whether issuing\_country/document\_type join the hash input is undecided\)\. The current code \(Doc 05 Step 11\) computes only dto\.documentNumber\.trim\(\)\.toUpperCase\(\) — plaintext normalization, not a hash — and is explicitly flagged there as a non\-production\-safe placeholder pending Security/Engineering's choice of algorithm\. \[Updated 21 September 2026: the five\-question technical resolution \(Q2\) selects HMAC\-SHA\-256, keyed with a KMS\-held pepper, computed over the normalized document number only — issuing\_country/document\_type do not join the hash input\. This is an engineering decision made under Christopher's SOP guidance, and is not yet implemented; the code above is unchanged\.\] Used only for duplicate matching — never displayed\.",

    source: 'Doc 03 Step 4b, §6b, §8a',

    currentProtection: "Plain varchar\(64\) column, no encryption at rest \(Doc 03 §10\)\. As written today \(Doc 05 Step 11\), this column stores a reversible trim\-plus\-uppercase transform of document\_number, not the one\-way hash TRVG2 §1\.6 requires \[Citation corrected 21 September 2026; formerly cited as TRVG §1\.3\] — materially less protection than its 'high' sensitivity classification implies\. Indexed for duplicate\-match lookups \(idx\_identity\_documents\_fingerprint, Doc 03 §9\)\.",

    apiExposure: 'Never returned in any response DTO — used only internally by the duplicate\-detection transaction \(Doc 03 §8a, Doc 05 Step 7/11\)\.',

    loggingRedactionStatus: 'explicitly redacted',

  \},

  \{

    table: 'identity\_documents',

    column: 'document\_image\_reference',

    sensitivity: 'high',

    meaning: 'Pointer \(Cloudflare R2 object key\) to the stored document image — not the image itself\.',

    source: 'Doc 03 Step 4b, §6b',

    currentProtection: "Plain varchar\(512\) column\. The underlying image is protected only by whatever R2 bucket\-level access control is configured — not confirmed by any source \(Doc 03 §10\)\.",

    apiExposure: "Returned only in DocumentUploadUrlResponseDto, immediately after the client's own presigned upload \(Doc 04 Step 5c\) — the client already generated this key\. Never returned from DocumentResponseDto \(Doc 04 Step 5b\)\.",

    loggingRedactionStatus: 'explicitly redacted',

  \},

  \{

    table: 'verification\_attempts',

    column: 'failure\_code',

    sensitivity: 'medium',

    meaning: 'Vendor\-provided failure code for a failed verification attempt\.',

    source: 'Doc 03 §6c; Service Overview §3 item 12',

    currentProtection: 'Plain varchar\(64\) column, no encryption at rest\.',

    apiExposure: 'Never returned to the end user \(Service Overview §3 item 12\)\. Not present in InternalStatusResponseDto \(Doc 04 Step 5e\) either — visible only via direct database access today\. \[Updated 18 September 2026: this document's own header update \(“Update — 18 September 2026”, above\) extends GET /v1/internal/identity\-verification/status/:userId \(Doc 10 Step 1a\) to return a coarse failure\_reason alongside status, attempt\_count, and timestamps — this catalog entry predates that extension\. The raw failure\_code column itself \(this row\) remains internal\-only and is still never returned to any caller; only a coarse, separate failure\_reason value is now exposed internally, per J1\.\]',

    loggingRedactionStatus: 'not explicitly named — gap',

  \},

  \{

    table: 'identity\_verification\_profiles',

    column: 'verified\_home\_country',

    sensitivity: 'low',

    meaning: 'The country the user confirmed as home country\. Persists until the detected country changes\.',

    source: 'Doc 03 §6a, "00 §5" \(Service Overview §5\)',

    currentProtection: 'Plain char\(2\) column, no encryption at rest\.',

    apiExposure: "Returned to the caller themselves via GET me \(ProfileStatusResponseDto, Doc 04 Step 5a\) — this is a user's own data returned to them, not third\-party exposure\.",

    loggingRedactionStatus: 'not explicitly named — gap',

  \},

  \{

    table: 'identity\_verification\_profiles',

    column: 'detected\_country',

    sensitivity: 'low',

    meaning: 'Most recent LocationProvider reading — not a history log\.',

    source: 'Doc 03 §6a, Section 4',

    currentProtection: 'Plain char\(2\) column, no encryption at rest\.',

    apiExposure: "Returned to the caller themselves via GET me \(ProfileStatusResponseDto, Doc 04 Step 5a\) — this is a user's own data returned to them, not third\-party exposure\.",

    loggingRedactionStatus: 'not explicitly named — gap',

  \},

  \{

    table: 'identity\_verification\_profiles',

    column: 'detected\_region\_state',

    sensitivity: 'low',

    meaning: 'Region/state component of the current\-location display\.',

    source: 'Doc 03 §6a, "AC\-01\.2"',

    currentProtection: 'Plain varchar\(120\) column, no encryption at rest\.',

    apiExposure: "Returned to the caller themselves via GET me \(ProfileStatusResponseDto, Doc 04 Step 5a\) — this is a user's own data returned to them, not third\-party exposure\.",

    loggingRedactionStatus: 'not explicitly named — gap',

  \},

  \{

    table: 'identity\_verification\_profiles',

    column: 'detected\_city',

    sensitivity: 'low',

    meaning: 'City component of the current\-location display\.',

    source: 'Doc 03 §6a, "AC\-01\.2"',

    currentProtection: 'Plain varchar\(120\) column, no encryption at rest\.',

    apiExposure: "Returned to the caller themselves via GET me \(ProfileStatusResponseDto, Doc 04 Step 5a\) — this is a user's own data returned to them, not third\-party exposure\.",

    loggingRedactionStatus: 'not explicitly named — gap',

  \},

  \{

    table: 'identity\_verification\_profiles',

    column: 'time\_zone',

    sensitivity: 'low',

    meaning: 'IANA tz string \(e\.g\. "America/New\_York"\), derived via MaxMind GeoLite2 IP resolution\.',

    source: 'Doc 03 §6a, "Epic Overview §7\.1"',

    currentProtection: 'Plain varchar\(64\) column, no encryption at rest\.',

    apiExposure: "Returned to the caller themselves via GET me \(ProfileStatusResponseDto, Doc 04 Step 5a\) — this is a user's own data returned to them, not third\-party exposure\.",

    loggingRedactionStatus: 'not explicitly named — gap',

  \},

\] as const;

Every field above traces to Doc 03's already\-delivered schema and Doc 04's already\-delivered DTOs: table/column/meaning/source are copied from Doc 03 Section 6's data dictionary, apiExposure is traced through Doc 04's actual response DTO code, and currentProtection/loggingRedactionStatus are this document's own classification, developed in Step 2c\.

__WHY THERE IS NO date\_of\_birth ROW__

date\_of\_birth is deliberately absent from this catalog because it is not part of Doc 03's schema at all — Doc 03 §10 confirms SVC\-32 \(minimum\-age enforcement\) has no persisted data path today, and no document since has added one\. This is not a classification gap; it is the same already\-confirmed gap Doc 03 itself carries forward\.

__2b\. Diagnostic script — proving the catalog loads__

__DIAGNOSTIC TOOLING — BUILD/IMAGE ISOLATION NOT GUARANTEED__

Same convention, same caveat as Doc 10 Step 1d's guard\-verification script: this file lives under scripts/, and Doc 06's tsconfig\.json/\.dockerignore gap \(Doc 07 Section 7, Doc 08 Section 7, Doc 09 Section 7, this document's Section 7\) applies to it too\.

__FILE: apps/identity\-verification\-service/scripts/dev\-list\-pii\-fields\.ts__

import \{ PII\_FIELD\_CATALOG \} from '\.\./src/common/security/pii\-classification';

 

// Not part of the deployed service's request path — see the callout

// above this file in the document that shipped it \(Doc 10 Step 2b\)\.

function main\(\): void \{

  console\.log\(\`$\{PII\_FIELD\_CATALOG\.length\} PII fields catalogued:\`\);

  for \(const entry of PII\_FIELD\_CATALOG\) \{

    console\.log\(\`  $\{entry\.table\}\.$\{entry\.column\} \($\{entry\.sensitivity\}\) — logging: $\{entry\.loggingRedactionStatus\}\`\);

  \}

\}

main\(\);

__2c\. Reference document — the reasoning behind the classification__

__FILE: apps/identity\-verification\-service/docs/security/pii\-handling\-posture\.md__

\# PII Handling Posture — identity\-verification\-service

 

This file explains Step 2a's classification\. It does not change any

schema, any DTO, or any logging rule — see "What this document does

not resolve" below for the one gap it surfaces but does not fix\.

 

\#\# The general pattern, already correct

 

Doc 04's response DTOs already minimize PII exposure without this

document's help: DocumentResponseDto \(Doc 04 Step 5b\) omits both

document\_number and document\_image\_reference from every read

response, on the stated reasoning that "the frontend already has it

from the user's own submission, and no source requires redisplaying

raw document numbers in a read response" \(Doc 04 Section 4\)\.

document\_image\_reference is returned exactly once, in

DocumentUploadUrlResponseDto, immediately after the client's own

presigned upload — the client already generated that key, so this is

not new exposure\. Doc 08's logging\-conventions\.md \(Step 2c\) already

forbids logging document\_number, document\_number\_normalized, and

document\_image\_reference by name, requiring a document's id \(its row

uuid\) to be logged instead\. None of this document's classification

changes any of that; Step 2a's catalog restates it in one place\.

 

\#\# Location data — classified low sensitivity

 

verified\_home\_country, detected\_country, detected\_region\_state,

detected\_city, and time\_zone are coarse, IP\-derived signals, not

precise geolocation and not document\-identifying data\. They are

already returned to the caller themselves via GET me \(Doc 04 Step

5a\) — a user seeing their own location data is not third\-party

exposure\. No confirmed source classifies these fields' sensitivity

one way or the other; this document classifies them here as low,

labeled as this document's own judgment call, not a confirmed

platform taxonomy \(the same kind of narrow, labeled classification

authority Doc 09 already exercised for error\-message audiences\)\.

 

\#\# The one real gap this document surfaces: failure\_code

 

verification\_attempts\.failure\_code \(Doc 03 §6c\) is vendor\-provided,

server\-side\-only data — Service Overview §3 item 12 already confirms

it is never shown to the end user, and it is not present in

InternalStatusResponseDto \(Doc 04 Step 5e\) either\. But Doc 08's

logging\-conventions\.md "what must never be logged" list \(Step 2c\)

does not name it\. Today, nothing in this service actually logs a

full verification\_attempts row, so this is not a confirmed live leak

— but if a future log statement ever did print one \(for debugging a

failed verification, for example\), failure\_code's vendor\-specific

detail would go out ungoverned by any redaction rule\. This document

does not add failure\_code to Doc 08's list; editing that already\-

delivered file is not something this document does unilaterally

\(Section 7\) — it surfaces the gap so whoever next touches Doc 08's

logging conventions closes it deliberately\.

 

\#\# What this document does not resolve

 

  \- Whether document\_number should be encrypted at rest, and with

    what mechanism — Doc 03 §10, unchanged\. See Doc 10 Step 3\.

  \- Whether Cloudflare R2's bucket\-level access control is configured

    to actually protect document\_image\_reference's target — not

    confirmed by any source \(Doc 03 §10\)\.

  \- The failure\_code logging gap above — documented, not fixed\.

  \- Whether SVC\-32 \(minimum\-age enforcement\) will ever get a

    persisted date\-of\-birth field — Doc 03 §10, unchanged\.

  \- Whether a one\-way document fingerprint may be retained after

    account deletion, for cross\-account duplicate prevention, and for

    how long — Doc 03 §10 states this is a technical recommendation

    only, pending privacy/legal confirmation, and that the schema

    "implements no persistent post\-deletion storage of any kind\."

    Still unresolved; not decided or implemented here\.

  \- How account deletion is signaled to this service — Doc 03 §10

    states this is "not established by any source": the cascade

    behavior that would delete a profile's documents and attempts is

    ready \(Doc 03 Section 7\), but the trigger for it is not yet

    designed\. Still unresolved; not decided or implemented here\.

## __Step 3 — Encryption/KMS Approach__

The Required Docs Checklist names this document's third topic as "encryption/KMS approach \(flagged as unresolved in Doc 03 §10\)\." That flag is quoted exactly below\. This step does not resolve it — no source available to this project names a product or vendor, and this document does not invent one\. It restates the gap, restates today's secrets\-handling reality alongside it, and lays out, for discussion only, the generic categories of option a future Infrastructure/Security decision would choose between\.

__3a\. Doc 03 §10, quoted exactly__

__DOC 03 §10 — VERBATIM, UNCHANGED SINCE 1 SEPTEMBER 2026__

"Field\-level encryption / KMS approach for document\_number — no product or vendor is named by any source \(Technical Architecture §15\)\. This schema stores it as a plain column; encrypting it is an Infrastructure/Security decision layered on top of this schema, not a change to it\."

"Cloudflare R2 as the object\-storage target for document\_image\_reference is a recommended default pending Infrastructure/Security confirmation \(Technical Architecture §8\), carried through unchanged from that document\."

No document since Doc 03 has revisited, resolved, or contradicted either bullet\. Doc 04 §4, Doc 05 §2/Step 6, and Doc 06 §2/§7 each cite the same gap rather than closing it\. This document does the same — it adds classification and discussion \(Step 2, and below\), not a resolution\.

__3b\. Today's secrets handling, restated exactly__

Every environment variable this service reads — credential and plain configuration alike — is loaded the same way: directly via process\.env\.X, with no @nestjs/config ConfigModule, no secrets manager, and no vault anywhere in Docs 03–09\. But not every one of them is actually a secret, and this document does not call one a credential unless a confirmed source treats it that way\. Doc 08's logging\-conventions\.md \(Step 2c\) already draws exactly this line for its own purposes: DATABASE\_URL, RABBITMQ\_URL, DIDIT\_API\_KEY, and DIDIT\_WEBHOOK\_SECRET are each named individually in its "what must never be logged" list, and R2\_SECRET\_ACCESS\_KEY is named there too — five variables Doc 08 itself already treats as credential material\. DIDIT\_API\_BASE\_URL, R2\_ACCOUNT\_ID, R2\_ACCESS\_KEY\_ID, and R2\_BUCKET\_NAME appear nowhere in that list — this document classifies those four as plain configuration on that same basis, not as a new judgment of its own\. The table below restates Doc 06 Step 3's complete \.env\.example inventory: nine variables, excluding only PORT, which is an ordinary HTTP port number, not credential\-related by any source\.

__Variable__

__Purpose__

__Type__

__Introduced By__

__Currently Loaded Via__

DATABASE\_URL

Postgres connection string — embeds a username and password\.

Credential — named in Doc 08's redaction list

Doc 03 Step 2

process\.env \(TypeORM config\)

RABBITMQ\_URL

Broker connection string — can embed credentials\.

Credential — named in Doc 08's redaction list

Doc 05 Step 13, Doc 06 Step 3

process\.env

DIDIT\_API\_BASE\_URL

Base URL for Didit's API\.

Configuration — not named in Doc 08's redaction list

Doc 05 Step 3/13

process\.env\.DIDIT\_API\_BASE\_URL

DIDIT\_API\_KEY

Bearer credential for calls to Didit's API\.

Credential — named in Doc 08's redaction list

Doc 05 Step 3a/13

process\.env\.DIDIT\_API\_KEY

DIDIT\_WEBHOOK\_SECRET

HMAC shared secret for webhook signature verification\.

Credential — named in Doc 08's redaction list

Doc 05 Step 9a/13

process\.env\.DIDIT\_WEBHOOK\_SECRET

R2\_ACCOUNT\_ID

Cloudflare account ID \(builds the R2 endpoint URL\)\.

Configuration — not named in Doc 08's redaction list

Doc 05 Step 6/13

process\.env\.R2\_ACCOUNT\_ID

R2\_ACCESS\_KEY\_ID

R2 access key\.

Configuration — not named in Doc 08's redaction list

Doc 05 Step 6/13

process\.env\.R2\_ACCESS\_KEY\_ID

R2\_SECRET\_ACCESS\_KEY

R2 secret key\.

Credential — named in Doc 08's redaction list

Doc 05 Step 6/13

process\.env\.R2\_SECRET\_ACCESS\_KEY

R2\_BUCKET\_NAME

R2 bucket name\.

Configuration — not named in Doc 08's redaction list

Doc 05 Step 6/13

process\.env\.R2\_BUCKET\_NAME

Doc 06 Step 3 already consolidated all nine \(plus PORT\) into one \.env\.example template \(placeholders only, safe to commit\) and already warns never to commit a real \.env file\. This document changes none of that — the table above restates it under this document's encryption/KMS heading because "how are today's secrets protected" is directly the question that heading asks, and it distinguishes the five actual credentials from the four plain configuration values rather than treating all nine as equally sensitive\.

__3c\. Reference document — options for discussion, nothing chosen__

__ENGINEERING DISCUSSION ONLY — NOT A DECISION__

Nothing in this file is implemented, chosen, or recommended as final\. No vendor or product is named\. This is this document's own engineering discussion, offered because a Security & Auth document that said nothing about the shape of the eventual decision would be less useful — not because any source has resolved Doc 03 §10\.

__FILE: apps/identity\-verification\-service/docs/security/encryption\-kms\-approach\.md__

\# Encryption / KMS Approach — Discussion Only — identity\-verification\-service

 

Doc 03 §10 flagged field\-level encryption for document\_number, and

Cloudflare R2's access control for document\_image\_reference, as

unresolved Infrastructure/Security decisions\. No document since has

resolved either\. This file does not resolve them either — it lays

out the generic categories of option a real decision would choose

between, for discussion, with no vendor named and nothing implemented\.

 

\#\# Current state \(restated from Step 3a/3b\)

 

  \- document\_number: plain varchar column, no encryption at rest\.

  \- document\_image\_reference: a pointer into Cloudflare R2; the

    actual image's protection depends entirely on R2 bucket\-level

    access control, which is not confirmed by any source\.

  \- Every credential this service uses \(Step 3b's table\) is a plain

    environment variable, read directly via process\.env — no

    secrets manager, no vault\.

 

\#\# Options for document\_number encryption at rest \(not chosen\)

 

  1\. Column\-level encryption via Postgres pgcrypto

     \(pgp\_sym\_encrypt/pgp\_sym\_decrypt\)\. Narrowest footprint — no new

     infrastructure dependency\. But the symmetric key itself still

     needs KMS\-backed storage and rotation to be meaningfully more

     secure than today's plain column, and every read/write path

     that touches document\_number — including Doc 03 §8a's

     duplicate\-match query — would need updating to encrypt/decrypt

     around it\.

  2\. Application\-layer envelope encryption via a cloud KMS \(encrypt

     the plaintext with a per\-record data key, wrap that data key

     with a KMS\-held key\)\. This is the shape of protection most

     platforms converge on, but no cloud provider or KMS product is

     named anywhere in this project's confirmed sources — choosing

     one is an Infrastructure/Security decision, not something this

     document's authority extends to\.

  3\. Tokenization/vaulting: replace document\_number with an opaque

     token in this service's own tables, and store the real value in

     a separate, narrowly\-scoped vault\. Strongest isolation, heaviest

     to build and operate — unlikely to be justified unless a

     specific compliance requirement calls for it, which no

     confirmed source does today\.

 

\#\# Options for this service's secrets \(not chosen\)

 

  \- Today: plain environment variables \(Step 3b\), loaded via

    process\.env directly, consolidated in \.env\.example \(Doc 06 Step

    3\)\. No rotation mechanism beyond manually editing the deployed

    environment\.

  \- A secrets\-manager service \(a cloud provider's own offering, or a

    self\-hosted product\) would remove plaintext secrets from

    deployment config and enable rotation without a redeploy — at

    the cost of a new operational dependency that no source confirms

    this platform has adopted anywhere today\.

 

\#\# What this document does not do

 

  \- It does not choose an option from either list above\.

  \- It does not implement pgcrypto, a KMS integration, tokenization,

    or a secrets manager anywhere in this service\.

  \- It does not modify Doc 03's schema or migration\.

  \- It does not change Doc 05's or Doc 06's environment\-variable

    loading code\.

  \- It does not name a cloud provider, a KMS product, or a

    secrets\-manager product as this project's choice\.

## __Step 4 — Verify__

Doc 08 Step 5f and Doc 09 Step 4c already demonstrated both guards rejecting live, end to end, over HTTP\. Doc 04's own verify step already demonstrated that read responses omit documentNumber\. The Architecture Overview's documentation rule \("Do not repeat content covered in earlier docs"\) means this step does not re\-run those checks\. It instead confirms this document's own two new catalogs load correctly and stay in sync with the code they describe\.

__4a\. Confirm the guard\-verification script__

__Run from: apps/identity\-verification\-service/__

npx ts\-node scripts/dev\-verify\-guards\-reject\.ts

BearerAuthGuard rejected as expected: BearerAuthGuard is a placeholder — replace with the shared auth\-service JWT guard before use\.

InternalServiceGuard rejected as expected: InternalServiceGuard is a placeholder — replace with the platform's real internal\-service auth before use\.

Both lines confirm the exact messages quoted in Step 1a and already classified as not safe to display verbatim by Doc 09 Step 3\. If either guard ever starts accepting a request without a real replacement landing first, this script's "UNEXPECTED" branch fires instead — a quick regression check to run before and after any future auth change\.

__4b\. Confirm the PII catalog loads and stays in sync__

__Run from: apps/identity\-verification\-service/__

npx ts\-node scripts/dev\-list\-pii\-fields\.ts

Expected: "9 PII fields catalogued:" followed by one line per entry\. If Doc 03's entities ever gain a new PII\-bearing column, this count will not change on its own — keep Step 2a's catalog updated by hand when that happens, the same discipline Doc 09 Step 1a already established for the error\-code catalog\.

__4c\. Read responses still omit document\_number and document\_image\_reference — already verified in Doc 04__

Doc 04 Step 10 already confirmed, with a live request/response pair, that GET /v1/identity\-verification/documents returns DocumentResponseDto objects with no documentNumber field\. Nothing in this document changes DocumentResponseDto, so re\-running that check here would only repeat Doc 04's own verify step\. Refer to Doc 04 Step 10 directly if you want to re\-confirm it\.

__WHAT THIS STEP DOES AND DOES NOT PROVE__

This step proves: both diagnostic scripts run cleanly against the real guard and catalog files they import, and both new catalogs \(guards, PII fields\) accurately restate already\-confirmed code as of today\. It does NOT verify a real internal\-auth mechanism \(none exists yet\), does NOT verify encryption at rest for document\_number \(none exists\), does NOT verify R2 bucket\-level access control \(not confirmed by any source either way\), and does NOT close the failure\_code logging gap Step 2c surfaced\.

# __6\. New Files Added by This Document__

This document does not repeat Docs 03–09's complete, cumulative file manifest \(Doc 09 Section 6 covers every file through Doc 09\)\. It only adds the files below — none of them replace, modify, or get imported into anything Docs 03–09 already built\.

__File__

__Built By__

__Notes__

docs/security/internal\-auth\-posture\.md

Doc 10, Step 1c

Reference documentation, not compiled code\.

scripts/dev\-verify\-guards\-reject\.ts

Doc 10, Step 1d

Diagnostic only — outside src/\. Build/image exclusion not guaranteed, see Section 7\.

src/common/security/pii\-classification\.ts

Doc 10, Step 2a

Restates Doc 03's PII\-bearing columns\. Not imported by app\.module\.ts\.

scripts/dev\-list\-pii\-fields\.ts

Doc 10, Step 2b

Diagnostic only — outside src/\. Build/image exclusion not guaranteed, see Section 7\.

docs/security/pii\-handling\-posture\.md

Doc 10, Step 2c

Reference documentation, not compiled code\.

docs/security/encryption\-kms\-approach\.md

Doc 10, Step 3c

Reference documentation, not compiled code\. Discussion only — no vendor chosen\.

# __7\. Pending Confirmations Carried Into This Document__

Step 4 above passes today against the same running service Docs 06–09 already start\. None of the items below block that — each is a place where this document documented a gap instead of guessing a Product, Architecture, or Infrastructure/Security answer, or surfaced a real gap in already\-confirmed material without fixing it unilaterally\.

- Both of Doc 04's guards \(BearerAuthGuard, InternalServiceGuard\) still always reject, unchanged by this document\. This remains the single most important piece of unfinished work across this document series \(Doc 04 Section 9, Doc 05 Section 7/8, Doc 06 Section 7/8, Doc 07 Section 7, Doc 08 Section 7, Doc 09 Section 7\) — and, per Doc 09 Step 3/Section 4, it is also the reason REQUEST\_FAILED's only real messages today are not user\-safe\. Step 1's readiness checklist is a recommendation for the eventual replacement, not an implementation of one\.
- RESOLVED, 18 September 2026: whether SVC\-24's internal\-review access surface is still needed alongside, or has been superseded by, the Decision Record's no\-manual\-review position \(§1\.3\) is settled by Christopher's Answer 4 — needed, but as a data\-only surface, not a documents\-review capability\. No help desk exists to use a screen this release, and no state in this document's model routes to a human; the endpoint \(Step 1a, extended above\) is built now so a screen can be added later without a data migration\. This document still does not design a role, permission, or access\-control surface for it — only InternalServiceGuard's existing \(placeholder\) authorization boundary applies, unchanged\.
- New finding: this document does not classify or restate the privacy of data published in this service's RabbitMQ event payloads — that is Doc 07's scope \(Event Catalog\)\. In particular, the currently\-wired IDENTITY\_VERIFIED publisher sets userId to a Didit vendor session ID rather than the profile's real user ID \(Doc 05 Section 7, Doc 07 Section 7\); a downstream consumer of that event should not be treated as receiving a verified linkage to the correct account until that publisher is corrected and verified\. This document does not fix the publisher, and does not change any event schema, consumer, or RabbitMQ configuration\.
- Field\-level encryption / KMS approach for document\_number remains unresolved — no product or vendor is named by any source \(Doc 03 §10, Technical Architecture §15\)\. Step 3 restates the gap and discusses generic option categories; it chooses none of them\.
- New finding: document\_number\_normalized \(Step 2a\) does not yet meet TRVG2 §1\.6's \[Citation corrected 21 September 2026; formerly cited as TRVG §1\.3\]/Doc 03 §6b's one\-way\-hash requirement — Doc 05 Step 11's current code computes only a plaintext trim\+uppercase transform, flagged there as a non\-production\-safe placeholder\. The hash algorithm, and whether issuing\_country/document\_type join the hash input, are a Security/Engineering decision this document does not make — no algorithm is chosen or implemented here\. \[Updated 21 September 2026: the five\-question technical resolution \(Q2\) selects HMAC\-SHA\-256, keyed with a KMS\-held pepper, computed over the normalized document number only — issuing\_country/document\_type do not join the hash input\. This is an engineering decision made under Christopher's SOP guidance, and is not yet implemented\.\]
- Cloudflare R2's bucket\-level access control for document\_image\_reference's target is not confirmed by any source either way \(Doc 03 §10, Technical Architecture §8\)\. This document does not confirm or configure it\.
- New finding: verification\_attempts\.failure\_code \(Doc 03 §6c\) is not named in Doc 08's logging\-conventions\.md redaction list \(Step 2c\)\. No confirmed log statement prints a full verification\_attempts row today, so this is not a confirmed live leak, but the gap is real\. Closing it means editing Doc 08's already\-delivered file, which this document does not do unilaterally\.
- New finding: no confirmed source anywhere in this project states where TLS is terminated for this service\. The generic "GitHub Actions → Supabase" deployment path \(Architecture Overview §10\) does not itself address transport security\. \[Updated 21 September 2026: Didit\-hosted capture is now the proposed architecture \(Q5\) — made under Christopher's SOP guidance, not yet Didit\-confirmed\. This would make Didit the proposed TLS/certificate owner per the Unresolved Questions register \(item 3\), pending Didit’s direct confirmation\.\]
- New finding: TRVG2 §6\.2 \[Citation corrected 21 September 2026; formerly cited as TRVG §6\.1\] already requires rate limiting on the document\-submission endpoint specifically, to prevent probing which documents exist in the system \(Doc 04 §4, Doc 09 Section 7\) — confirmed, but not yet implemented\. Beyond that one endpoint, no confirmed source addresses general\-purpose rate limiting, CORS policy, or HTTP security headers \(e\.g\. Helmet\) for this service specifically\. The Architecture Overview's own summary of api\-gateway \(§6\) suggests general rate limiting may be intended to live at the gateway layer platform\-wide, but no source confirms this for identity\-verification\-service, or that gateway\-level enforcement would by itself satisfy TRVG2 §6\.2's endpoint\-specific requirement\.
- This service's secrets remain plain environment variables \(Step 3b\) — no secrets\-manager or vault integration is confirmed anywhere in this project\. Step 3c discusses this as an option category only\.
- date\_of\_birth is still not part of Doc 03's schema, so SVC\-32 \(minimum\-age enforcement\) still has no persisted data path \(Doc 03 §10, unchanged by this document\)\.
- Carried forward from Doc 03 §10, not previously restated in this document: whether a one\-way document fingerprint may be retained after account deletion, for cross\-account duplicate prevention, and for how long, is a technical recommendation only, pending privacy/legal confirmation — Doc 03's schema "implements no persistent post\-deletion storage of any kind\." This document does not decide this either\.
- Carried forward from Doc 03 §10, not previously restated in this document: how account deletion is signaled to this service is "not established by any source" — the ON DELETE CASCADE behavior that removes a deleted profile's documents and attempts is already built \(Doc 03 Section 7\), but the trigger for it is not yet designed\. This document does not design it\.
- This document's two diagnostic scripts \(scripts/dev\-verify\-guards\-reject\.ts, scripts/dev\-list\-pii\-fields\.ts\) inherit the exact build\-isolation risk Doc 07 Section 7, Doc 08 Section 7, and Doc 09 Section 7 already flagged for their own diagnostic scripts: Doc 06's tsconfig\.json sets no include, exclude, or rootDir, and Doc 06's \.dockerignore does not exclude scripts/ or docs/\. That risk is not re\-solved here — it simply applies to two more files now\. A fix belongs in a Doc 06 sync, not in this document\.
- The Dockerfile still has no non\-root USER, no multi\-stage build, and no HEALTHCHECK instruction \(Doc 06 Section 7, unchanged by this document\) — container\-hardening decisions this document does not make either\.

# __8\. What's Next__

- Replace both of Doc 04's auth guards with real authentication, following Step 1c's readiness checklist as a non\-binding guide — still the single most important piece of unfinished work across this document series\. When that happens, use a generic, user\-safe rejection message rather than carrying forward the placeholders' internal\-detail text \(Doc 09 Step 3, this document's Step 1\)\.
- Get Infrastructure/Security to name an actual encryption/KMS approach for document\_number and confirm Cloudflare R2's bucket\-level access control for document\_image\_reference — Doc 03 §10, still open, discussed but not resolved by Step 3\.
- Consider a secrets\-manager integration for this service's credentials if and when the platform adopts one elsewhere — not chosen or evaluated further here\.
- Close the verification\_attempts\.failure\_code logging\-redaction gap this document surfaced by adding it to Doc 08's logging\-conventions\.md — a candidate Doc 08 sync\.
- Get a confirmed answer on where TLS terminates for this service — Didit is now the proposed owner if Didit\-hosted capture is adopted as the architecture \(Q5, Unresolved Questions item 3\), but this still needs Didit’s direct confirmation — and on whether rate limiting/CORS/security\-header enforcement belongs at api\-gateway, at this service, or both — both open questions this document only surfaced\.
- Once this document is accepted, update the Required Docs Checklist to mark Doc 10 complete, and begin Doc 11 — Performance Considerations per the locked numbering\.

