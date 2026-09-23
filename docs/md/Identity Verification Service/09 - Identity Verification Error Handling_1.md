__09 — IDENTITY VERIFICATION ERROR HANDLING__

*Standard Error\-Response Shapes, Retry/Failure Semantics, User\-Facing vs\. Internal Error Messaging — identity\-verification\-service*

__Epic: __Identity Verification

__Document Role: __Consolidates Doc 04's already\-confirmed error\-response shape and exception hierarchy \(plus Doc 05's two additions\) into one cumulative catalog, writes down this service's existing retry/failure semantics exactly as already built, and classifies which error messages are safe to show which caller\. Documents, rather than resolves, every gap it finds along the way\.

__Prerequisites: __Doc 03 — Data Model & Database Schema, Doc 04 — API Specification, Doc 05 — Business Logic & Workflows, Doc 06 — Setup & Bootstrapping, Doc 07 — Integrations & Events, Doc 08 — Monitoring & Observability \(all built, smoke\-tested, and complete — built and smoke\-tested does not mean every code path is production\-ready; see Docs 05, 06, 07, and 08's own Section 7 for their unresolved implementation dependencies\), Marketeq Core Backend Technical Architecture Overview & Documentation Standards

__Author: __CTO — written for a developer building this microservice for the first time

__Status: __Final — ready to implement

__Date: __2 September 2026

__UPDATE — 16 SEPTEMBER 2026__

Applies four items from the Document 09 impact report \(16 Sep 2026\)\. Section 1, Step 2, Section 7, and Section 8's statements that the 3\-attempt ceiling's outcome is undefined are corrected: revised Doc 05 now transitions a confirmed AttemptOutcome\.REJECTED to FAILED or FAILED\_FINAL per TRVG §3, using the existing per\-document attempt count; FAILED\_FINAL is terminal with no confirmed recovery path this release \(TRVG §8\.1 — an open product decision, not implemented or invented here\)\. \[Superseded, 18 September 2026: two corrections\. First, this attempt count is account\-wide \(profile\_id alone\), not per\-document, confirmed by Christopher's Answer 3 and TRVG2 §2's gate\-table note\. Second, FAILED\_FINAL is not permanently terminal — TRVG2 §2\.9/§3 confirms it clears automatically after a 24\-hour cooldown, resetting attempt\_count to 0 and status to UNSTARTED, with no human or support action required; this is no longer an open product decision\.\] What remains genuinely open — whether AttemptOutcome\.ERROR should drive the same transition, and the attempt count's account\-versus\-document scope \(Doc 03 §8b\) — is preserved unresolved\. Step 1a's DUPLICATE\_DOCUMENT messagingNote now discloses that TRVG2 §6\.2 \[Citation corrected 21 September 2026; formerly cited as TRVG §6\.1\]'s rate\-limiting requirement, distinct from the response\-content protection already documented, remains unimplemented; no threshold or algorithm is added\. Step 1a's VPN\_PROXY\_DETECTED messagingNote now discloses that VpnProxyDetectedException is thrown with no details, so today's response can't distinguish the three detected variants the frontend's confirmed design treats separately \(Epic Overview §5\.2\); the actual detection producer remains unresolved and no fix is chosen\. The Prerequisites line now notes that built and smoke\-tested does not mean production\-ready, per Docs 05–08's own Section 7\. No error code, HTTP status, exception message, retry behavior, or application code changed\. TravelModeReminderJob's isolation gap, the guard\-message leak through REQUEST\_FAILED, RabbitMQ's logged\-and\-swallowed publish failures, and vendor\-outage/webhook\-idempotency behavior are all unchanged and not newly fixed\. The Decision Record authority question, SVC\-24, hash implementation, expiry scheduling, authentication, RabbitMQ delivery guarantees, and the IDENTITY\_VERIFIED\.userId bug all remain exactly as open as before\.

Update — 18 September 2026: resolves the VPN\_PROXY\_DETECTED gap this document previously surfaced \(Section 1, Section 7\)\. Christopher’s Answer 2 and Technical Requirements — Verification Gates 2 \(“TRVG2”\) §1\.5 confirm three distinct alerts are required, and Doc 05’s revised VpnProxyDetectedException \(Step 9\) now carries the detected vpnProxyResult value, so a caller can distinguish VPN\_DETECTED, PROXY\_DETECTED, and VPN\_AND\_PROXY\_DETECTED\. This document’s own DUPLICATE\_DOCUMENT rate\-limiting gap \(Step 1a, TRVG2 §6\.2 \[Citation corrected 21 September 2026; formerly cited as TRVG §6\.1\]\) and the other Section 7 items remain exactly as open as before — only the VPN/proxy detail gap is resolved by this update\.

__UPDATE — 21 SEPTEMBER 2026__

Update — 21 September 2026 \(SOP B compliance review, Doc 09 pass\): three additive items; nothing above is altered\. The §7 bullet on the underlying VPN/proxy detection producer is updated to reflect the five\-question technical resolution \(Q4\): identity\-verification\-service’s own backend team is now the proposed owner, with a MaxMind GeoIP2 Anonymous IP\-style feed recommended — an engineering decision made under Christopher's SOP guidance; vendor, cost, and the fallback policy when the signal is unavailable all remain open\. Four instances of “TRVG §6\.1” \(Step 1a’s DUPLICATE\_DOCUMENT messagingNote, twice, and the matching §7 finding, twice\) are corrected to “TRVG2 §6\.2”, verified directly against TRVG2’s text \(the account\-enumeration/rate\-limiting requirement is §6\.2, not §6\.1, under TRVG2’s renumbering\)\. The generated reference file’s “What this document does not resolve” section is corrected with a superseded annotation: it quoted the pre\-18\-September FAILED\_FINAL framing \(terminal, no confirmed recovery path\) without the bracket the main §7 prose already carries — that gap is closed here, restating \(not altering\) the confirmed 24\-hour\-cooldown/automatic\-reset behavior\. No error code, HTTP status, exception message, or application code changed\.

# __1\. Purpose & Scope__

The Architecture Overview's entire confirmed guidance on this topic is one short subsection \(§7\.3, "Error Shape"\): "Standard error JSON: \{ code, message, details? \}\. Avoid leaking internals in messages\." That shape, and the full exception hierarchy that produces it, are already fully built — Doc 04 Step 2 defined ErrorResponseDto and the DomainException base class plus nine concrete exceptions, Doc 04 Step 6b's AllExceptionsFilter turns every error \(domain, validation, any other HttpException, or anything unexpected\) into that exact shape, and Doc 05 Step 9b added two more domain exceptions on top\. None of that changes here\. This document adds three things on top of it: a single cumulative catalog restating every error code across Doc 04 and Doc 05 in one place; a written reference documenting this service's retry\-and\-failure semantics exactly as already built, introducing no new retry mechanism anywhere; and a written classification of which error messages are safe to show which kind of caller, which surfaces one real, already\-existing gap this document flags but does not fix\.

This document does NOT cover: any new domain exception or any change to AllExceptionsFilter \(Doc 04, unchanged\); any new retry, backoff, dead\-letter, or outbox mechanism anywhere in this service \(none exists today and none is added here\); a resolution of whether AttemptOutcome\.ERROR should also drive a FAILED/FAILED\_FINAL transition — the attempt\-count's account\-versus\-document scope is resolved \(account\-wide; see the 18 September 2026 update note above\) and the general post\-ceiling transition itself is no longer undefined; see the update note above; or a fix for the guard\-message leak Section 4 identifies \(fixing it means editing Doc 04's guard files, which this document does not do unilaterally\)\.

__WHY THIS DOCUMENT EXISTS AS ITS OWN NUMBER__

The Architecture Overview's own generic per\-service documentation template \(§8\.1\) has no separate numbered "Error Handling" document at all — it folds error shapes into "Doc 04 – API Endpoints\.\.\. error shapes" and has no slot resembling this document's scope beyond that one line\. This document exists as its own number because the Required Docs Checklist currently in effect for this project locks it there: 09 — Error Handling\. Its content is still fully sourced; only its existence as a separate, numbered document is project\-specific\.

__HOW THIS DOCUMENT RELATES TO ITS SOURCES__

Every claim in this document traces to one of: \(a\) the Architecture Overview's §7\.3 line \(the only confirmed material on this topic for any Marketeq service\); \(b\) Docs 03–08's own already\-built and delivered code, referenced exactly, including two newly\-surfaced findings about that code's actual behavior \(Section 4\); \(c\) an engineering or messaging\-classification decision this document makes on its own narrow authority, labeled as such in Section 4; or \(d\) an explicitly\-flagged unresolved dependency, carried forward rather than invented an answer for \(Section 7\)\.

# __2\. Prerequisites__

- Docs 03–08 are complete: the service installs, builds, starts, serves every route, guard, provider, job, and event mechanism, and serves /health, /ready, and /v1/internal/metrics exactly as those documents left them\.
- No new npm dependency is installed by this document \(Section 4\) — everything below uses TypeScript types and plain data structures on top of packages Doc 04/05 already installed\.
- Familiarity with Doc 04's domain\-exceptions\.ts and all\-exceptions\.filter\.ts, and Doc 05's DiditDocumentVerificationProvider, RabbitMqNotificationEventPublisher, and the service's submitDocument/startVerificationSession/handleDiditWebhook methods — this document restates and classifies that code, it does not repeat its full listing here\.

# __3\. What You're Building__

Four new files, all reference material or purely additive data — nothing wires into the running request path, and nothing already\-confirmed changes:

- apps/identity\-verification\-service/src/common/errors/error\-code\-catalog\.ts — every error code across Doc 04 and Doc 05 in one array, each entry naming its HTTP status, meaning, source, which kind of caller can see it, and whether its message is safe to display verbatim\.
- apps/identity\-verification\-service/scripts/dev\-list\-error\-codes\.ts — a diagnostic script proving the catalog loads and printing it, the same pattern Doc 07 and Doc 08 used for their own not\-wired\-into\-runtime data\.
- apps/identity\-verification\-service/docs/error\-handling/retry\-and\-failure\-semantics\.md — exactly what already happens on failure in each of this service's four confirmed failure\-prone operations \(Didit calls, RabbitMQ publishing, the duplicate\-detection transaction, webhook redelivery\), plus one newly\-surfaced gap in the reminder job's error isolation\.
- apps/identity\-verification\-service/docs/error\-handling/error\-messaging\-conventions\.md — which of the catalog's codes are safe to show an end user, a vendor webhook caller, or another internal service verbatim, and one newly\-surfaced case where that is not true today\.

# __4\. Engineering Decisions Made in This Document__

None of these are Product, Architecture, or Infrastructure/Security decisions\. Two are newly\-surfaced findings about already\-confirmed code's actual behavior, not decisions this document makes; the rest are the narrowest choices needed to organize material the Architecture Overview confirms is in scope but does not itself provide\.

- The error\-code catalog \(Step 1\) is a pure, additive restatement of Doc 04 §2a/§7 and Doc 05 Step 9b's two additions — no code anywhere imports it, and it does not need to be added to app\.module\.ts, the same non\-wiring Doc 07's event catalog established for itself\.
- This document introduces no automatic retry, backoff, dead\-letter, or outbox mechanism anywhere\. Every failure behavior described in Step 2 is either \(a\) already\-built code, restated exactly as it exists, or \(b\) an explicitly\-flagged open question this document does not invent an answer for \(Section 7\)\.
- New finding, documented but not fixed: TravelModeReminderJob's daily sweep \(Doc 05 Step 10\) has no per\-profile error isolation — its for loop calls evaluateAndSendIfDue with no try/catch around each iteration, so an exception thrown while processing one profile aborts the sweep for every profile still queued behind it in that run\. The job runs again the next day at 09:00, so a profile skipped this way is delayed, not permanently missed — but this document does not edit Doc 05's file to add isolation; that would be an unrequested change to an already\-confirmed file \(Section 7\)\.
- New finding, documented but not fixed: BearerAuthGuard's and InternalServiceGuard's placeholder rejection messages \(Doc 04 Step 6a\) — "BearerAuthGuard is a placeholder — replace with the shared auth\-service JWT guard before use" and "InternalServiceGuard is a placeholder — replace with the platform's real internal\-service auth before use" — pass through AllExceptionsFilter's REQUEST\_FAILED branch unchanged and are shown verbatim to any caller today\. Naming the exact guard class and what needs replacing is internal implementation detail, in tension with Architecture Overview §7\.3's "avoid leaking internals in messages\." Step 3 classifies both as not safe to display verbatim; fixing the underlying message is a Doc 04 change this document does not make unilaterally \(Section 7\)\.
- The user\-facing/vendor/internal\-service classification \(Step 3\) is this document's own convention, not a confirmed platform taxonomy — no source defines which codes are safe for which caller\. Every classification is a judgment call, and is labeled as this document's own in the file itself\.
- No new npm dependency is introduced\. The catalog is a plain TypeScript array; the diagnostic script uses only Node's built\-ins and the catalog file itself\.

# __5\. Step\-by\-Step Implementation__

Follow these steps in order\. Every code block names the exact file path to create it in, relative to the repository root \(marketeq\-projects\-nestjs/\)\. All paths below start from apps/identity\-verification\-service/ — this folder, and everything Docs 03–08 already built inside it, already exists\.

## __Step 1 — The Cumulative Error\-Code Catalog__

Doc 04 Step 2a defined nine domain exceptions and Doc 04 Section 7 tabulated all twelve codes this service could produce at the time \(nine domain codes plus VALIDATION\_ERROR, REQUEST\_FAILED, and INTERNAL\_ERROR\)\. Doc 05 Step 9b then added two more \(INVALID\_SIGNATURE, UNKNOWN\_VENDOR\_SESSION\) directly to Doc 04's domain\-exceptions\.ts file, without updating Doc 04's own table — that table now under\-counts by two\. This step restates all fourteen codes in one place, accurately, as an importable module — no new code, no new behavior, nothing Docs 04–05 didn't already establish\.

__PURELY ADDITIVE — NOT WIRED INTO THE RUNNING SERVICE__

This file adds no behavior\. Nothing in Docs 04–08 imports it, and it does not need to be added to app\.module\.ts — it exports plain data, not a NestJS provider\. Step 1b's diagnostic script is its first consumer\.

__1a\. The catalog file__

__FILE: apps/identity\-verification\-service/src/common/errors/error\-code\-catalog\.ts__

// A structured, cumulative restatement of every error code this

// service can produce, across Doc 04 §2a/§7 and Doc 05 Step 9b\. Do

// not add a code here that domain\-exceptions\.ts does not already

// throw — this file describes that file \(plus the three fixed,

// non\-domain codes AllExceptionsFilter itself produces\), it does not

// extend it\. If a future document adds a new DomainException

// subclass, add its entry here too so this catalog stays complete\.

export type CallerAudience = 'end\-user' | 'vendor\-webhook' | 'internal\-service' | 'any\-caller';

 

export interface ErrorCatalogEntry \{

  code: string;

  httpStatus: number | 'varies';

  meaning: string;

  source: string;

  // Who actually calls the route\(s\) that can produce this code today\.

  callerAudience: CallerAudience;

  // Doc 09 Section 4, decision 5: this document's own convention, not

  // a confirmed platform taxonomy\. 'depends' means the code's message

  // text varies by which underlying condition produced it — see

  // messagingNote\.

  safeToDisplayVerbatim: boolean | 'depends';

  messagingNote: string;

\}

 

export const ERROR\_CODE\_CATALOG: readonly ErrorCatalogEntry\[\] = \[

  \{

    code: 'VALIDATION\_ERROR',

    httpStatus: 400,

    meaning: 'One or more request fields failed a class\-validator rule\. details\.errors lists each failure\.',

    source: 'Global ValidationPipe \(Doc 04 Step 9\)',

    callerAudience: 'end\-user',

    safeToDisplayVerbatim: true,

    messagingNote: 'details\.errors names request field properties \(e\.g\. "documentNumber"\) — these are the same field names the caller itself submitted, not internal implementation names, so this is safe\.',

  \},

  \{

    code: 'DOCUMENT\_EXPIRED',

    httpStatus: 400,

    meaning: 'expirationDate is in the past\.',

    source: 'SVC\-12 \(Doc 04 Step 2a\)',

    callerAudience: 'end\-user',

    safeToDisplayVerbatim: true,

    messagingNote: 'Message is a plain, already\-safe sentence written for the end user\.',

  \},

  \{

    code: 'NO\_DETECTED\_LOCATION',

    httpStatus: 409,

    meaning: 'Nothing to confirm — no detected country is on the profile yet\.',

    source: 'SVC\-02 \(Doc 04 Step 2a\)',

    callerAudience: 'end\-user',

    safeToDisplayVerbatim: true,

    messagingNote: 'Message is a plain, already\-safe sentence written for the end user\.',

  \},

  \{

    code: 'CLASSIFICATION\_REQUIRED',

    httpStatus: 409,

    meaning: 'A travel duration was submitted before a Temporarily Traveling classification exists\.',

    source: 'SVC\-04, SVC\-05 \(Doc 04 Step 2a\)',

    callerAudience: 'end\-user',

    safeToDisplayVerbatim: true,

    messagingNote: 'Message is a plain, already\-safe sentence written for the end user\.',

  \},

  \{

    code: 'DUPLICATE\_DOCUMENT',

    httpStatus: 409,

    meaning: 'This document is already on file under a different account\.',

    source: 'SVC\-17 \(Doc 04 Step 2a\)',

    callerAudience: 'end\-user',

    safeToDisplayVerbatim: true,

    messagingNote: 'details only ever carries the CALLING profile\\'s own newly\-created documentId \(Doc 05 Step 11\) — the other profile\\'s id is never exposed\. This addresses the response\-content half of TRVG2 §6\.2\\'s anti\-enumeration requirement \[Citation corrected 21 September 2026; formerly cited as TRVG §6\.1\]\. TRVG2 §6\.2 separately requires the submission endpoint itself to be rate\-limited so repeated submissions can\\'t be used to probe which documents exist in the system — that rate limit is not implemented today \(Doc 04 §4, Doc 05/06 Section 7, unchanged\) and this document does not add one\. Safe as written for the response content; the endpoint\-level control remains open \(Section 7\)\.',

  \},

  \{

    code: 'RETRY\_LIMIT\_EXCEEDED',

    httpStatus: 429,

    meaning: 'The three\-attempt limit has been reached\.',

    source: 'SVC\-15 \(Doc 04 Step 2a\)',

    callerAudience: 'end\-user',

    safeToDisplayVerbatim: true,

    messagingNote: 'Message is a plain, already\-safe sentence written for the end user\.',

  \},

  \{

    code: 'VPN\_PROXY\_DETECTED',

    httpStatus: 403,

    meaning: 'Verification cannot proceed while a VPN or proxy is detected\.',

    source: '00 §4 \(Doc 04 Step 2a\)',

    callerAudience: 'end\-user',

    safeToDisplayVerbatim: true,

    messagingNote: \\'Message does not describe the detection mechanism — safe as written\. VpnProxyDetectedException now carries the detected vpnProxyResult value \(Doc 05 Step 9, updated 18 September 2026\), so the response CAN distinguish which of the three variants \(VPN\_DETECTED, PROXY\_DETECTED, VPN\_AND\_PROXY\_DETECTED — Doc 03\) occurred, matching the frontend\\'s confirmed design \(Epic Overview §5\.2\) having a separate error state for each\. \[Superseded, 18 September 2026: earlier drafts of this note said the exception was thrown with no details and could not distinguish the three variants — resolved by Answer 2 and TRVG2 §1\.5\.\]\\',

  \},

  \{

    code: 'VENDOR\_UNAVAILABLE',

    httpStatus: 502,

    meaning: 'Didit could not be reached, returned a non\-2xx response, or returned a malformed body\.',

    source: 'Doc 04\\'s Section 4, via Doc 04 Step 2a \(Doc 05 Step 3a throws it\)',

    callerAudience: 'end\-user',

    safeToDisplayVerbatim: true,

    messagingNote: 'Message is generic by design \("temporarily unavailable\.\.\. try again shortly"\)\. details may carry \{ vendorStatus \} \(an HTTP status number\) or \{ reason: "malformed\_vendor\_response" \} — neither exposes vendor credentials or a raw vendor payload\.',

  \},

  \{

    code: 'PROFILE\_NOT\_FOUND',

    httpStatus: 404,

    meaning: 'No profile exists for the given userId \(internal\-controller path only — the user\-facing controller lazily creates one instead\)\.',

    source: "Doc 04's Section 4 \(Doc 04 Step 2a\)",

    callerAudience: 'internal\-service',

    safeToDisplayVerbatim: true,

    messagingNote: 'Only reachable through the internal controller \(Doc 04 Step 8b\) once InternalServiceGuard is replaced — today that route always returns REQUEST\_FAILED first \(see below\)\.',

  \},

  \{

    code: 'DOCUMENT\_NOT\_FOUND',

    httpStatus: 404,

    meaning: 'documentId does not exist or does not belong to the caller\.',

    source: 'Doc 04 Step 2a',

    callerAudience: 'end\-user',

    safeToDisplayVerbatim: true,

    messagingNote: 'Message does not distinguish "does not exist" from "belongs to someone else" — intentionally, so this response cannot be used to probe for other accounts\\' document IDs\.',

  \},

  \{

    code: 'INVALID\_SIGNATURE',

    httpStatus: 401,

    meaning: "Didit's webhook signature didn't match, or was missing\.",

    source: 'Doc 05 Step 9b',

    callerAudience: 'vendor\-webhook',

    safeToDisplayVerbatim: true,

    messagingNote: 'Caller is Didit \(or whoever sent the request\), not an end user or another Marketeq service — message is generic and reveals nothing about the signing secret\.',

  \},

  \{

    code: 'UNKNOWN\_VENDOR\_SESSION',

    httpStatus: 404,

    meaning: 'The webhook referenced a vendor\_session\_id this service never issued\.',

    source: 'Doc 05 Step 9b',

    callerAudience: 'vendor\-webhook',

    safeToDisplayVerbatim: true,

    messagingNote: 'Caller is Didit \(or whoever sent the request\) — message is generic and safe\.',

  \},

  \{

    code: 'REQUEST\_FAILED',

    httpStatus: 'varies',

    meaning: 'Fallback for any NestJS HttpException not covered by the codes above — the message is whatever that underlying exception carries\.',

    source: 'AllExceptionsFilter branch 3 \(Doc 04 Step 6b\)',

    callerAudience: 'any\-caller',

    safeToDisplayVerbatim: 'depends',

    messagingNote: "Today, in this service, the only two real call sites are BearerAuthGuard's and InternalServiceGuard's placeholder rejections \(Doc 04 Step 6a\) — both are internal\-only text, not safe to display verbatim\. See Step 3\. A third, framework\-level case \(an unmatched route\) also lands here with NestJS's own default message and is likewise not written for end users\.",

  \},

  \{

    code: 'INTERNAL\_ERROR',

    httpStatus: 500,

    meaning: 'Anything unexpected\.',

    source: 'AllExceptionsFilter branch 4 \(Doc 04 Step 6b\)',

    callerAudience: 'any\-caller',

    safeToDisplayVerbatim: true,

    messagingNote: 'Message is the fixed string "Something went wrong\. Try again\." by design \(Architecture Overview §7\.3, "avoid leaking internals in messages"\) — never the real exception\\'s own message or stack\.',

  \},

\] as const;

Every field above traces to Doc 04 or Doc 05's already\-delivered code: httpStatus and meaning are copied from Doc 04 Section 7's table \(extended with Doc 05's two additions\), source cites exactly where each is thrown, and callerAudience/safeToDisplayVerbatim/messagingNote are this document's own classification, developed in Step 3\.

__1b\. Diagnostic script — proving the catalog loads__

__DIAGNOSTIC TOOLING — BUILD/IMAGE ISOLATION NOT GUARANTEED__

This script lives under scripts/, the same folder Doc 07's and Doc 08's diagnostic scripts used, and inherits the exact same caveat both of those documents already flagged: Doc 06's tsconfig\.json has no include/exclude/rootDir and its \.dockerignore does not exclude scripts/ or docs/, so placement outside src/ does not by itself guarantee this file is excluded from a compiled build or Docker image\. That risk is not re\-solved here — see Doc 07 Section 7, Doc 08 Section 7, and this document's Section 7\.

__FILE: apps/identity\-verification\-service/scripts/dev\-list\-error\-codes\.ts__

import \{ ERROR\_CODE\_CATALOG \} from '\.\./src/common/errors/error\-code\-catalog';

 

// Not part of the deployed service's request path — see the callout

// above this file in the document that shipped it \(Doc 09 Step 1b\)\.

function main\(\): void \{

  console\.log\(\`$\{ERROR\_CODE\_CATALOG\.length\} error codes catalogued:\`\);

  for \(const entry of ERROR\_CODE\_CATALOG\) \{

    console\.log\(\`  $\{entry\.code\} \($\{entry\.httpStatus\}\) — $\{entry\.callerAudience\}, safeToDisplayVerbatim=$\{entry\.safeToDisplayVerbatim\}\`\);

  \}

\}

main\(\);

## __Step 2 — Retry & Failure Semantics__

No source available to this project \(Architecture Overview, Technical Architecture, Feature List\) defines a retry policy, backoff strategy, dead\-letter mechanism, or delivery\-guarantee SLA for anything this service does\. This step does not invent one\. It writes down, precisely, what this service's four failure\-prone operations already do today — all four behaviors already exist in Doc 05's delivered code; nothing here is new logic\.

__FILE: apps/identity\-verification\-service/docs/error\-handling/retry\-and\-failure\-semantics\.md__

\# Retry & Failure Semantics — identity\-verification\-service

 

No confirmed source defines a retry policy, backoff strategy,

dead\-letter mechanism, or delivery\-guarantee SLA anywhere in this

service\. This document does not introduce one\. What follows is an

exact restatement of what the already\-confirmed code in Docs 05

already does on failure, plus one newly\-surfaced gap\.

 

\#\# 1\. Didit vendor calls — no automatic retry

 

DiditDocumentVerificationProvider\.startVerificationSession \(Doc 05

Step 3a\) makes exactly one attempt per call\. A network failure, a

non\-2xx response, or a malformed response body all immediately throw

VendorUnavailableException \(502\) — there is no retry loop, no

backoff, and no circuit breaker anywhere in this path\.

 

Important: a VENDOR\_UNAVAILABLE failure does NOT consume one of the

caller's three verification attempts\. startVerificationSession \(Doc

05 Step 11\) only creates a pending\_verification\_sessions row AFTER

the vendor call succeeds — if the vendor call throws, nothing is

persisted and the 3\-attempt ceiling count is unaffected \(confirmed

directly from Doc 05 Step 11's code: the pending\-session insert is

the step immediately following the vendor call, not before it\)\. A

caller who receives VENDOR\_UNAVAILABLE may retry the same request

immediately without being penalized\.

 

\#\# 2\. RabbitMQ event publishing — logged and swallowed, never retried

 

RabbitMqNotificationEventPublisher\.publish \(Doc 05 Step 5\) wraps its

publish call in a try/catch\. On any failure — an unreachable broker,

a channel error, anything — it logs the failure with logger\.error and

returns normally\. The request that triggered the event \(e\.g\. a travel

duration submission\) still succeeds even if the notification event is

lost\. There is no outbox table, no retry queue, and no redelivery of

a failed publish\. No source defines a delivery\-guarantee requirement

for this pipeline \(Doc 05 Section 7\) — this is a deliberate, disclosed

gap, not an oversight\.

 

\#\# 3\. The duplicate\-detection transaction — full rollback, no partial writes, no retry

 

submitDocument's transaction \(Doc 03 §8a, Doc 05 Step 7/Step 11\) runs

the advisory lock, the cross\-profile lookup, and the document insert

\(plus, on a match, the profile status update\) inside one TypeORM

QueryRunner transaction\. Any error anywhere inside that block rolls

the entire transaction back — there is no partial commit, and no

automatic retry of the transaction\. The original error propagates to

the caller unchanged \(wrapped, like every other domain error, into

the shared error shape by AllExceptionsFilter\)\.

 

\#\# 4\. Webhook redelivery — idempotent no\-op, not a retry mechanism

 

handleDiditWebhook \(Doc 05 Step 9d/Step 11\) is not itself a retry

mechanism, but it safely tolerates Didit \(or anyone\) redelivering the

same webhook: Doc 03's unique index on vendor\_session\_id makes a

settled\-attempt lookup a single indexed query\. If a verification\_

attempts row already exists for that vendor\_session\_id, the handler

returns immediately with no further writes — a silent, idempotent

200 \{ "received": true \}\. This is confirmed end\-to\-end in Doc 05 Step

14b, including a real repeat\-delivery test; that verification is not

repeated in this document's own Step 4 — see Doc 05 Step 14b directly\.

 

\#\# 5\. New finding: the reminder job's daily sweep has no per\-profile isolation

 

TravelModeReminderJob\.runDailySweep \(Doc 05 Step 10\) loops over every

due profile and calls evaluateAndSendIfDue for each, with no

try/catch around the individual iteration:

 

  for \(const profile of dueProfiles\) \{

    await this\.evaluateAndSendIfDue\(profile, now\);

  \}

 

If evaluateAndSendIfDue throws for one profile \(for example, a

transient database error while saving that profile's updated

next\_travel\_reminder\_at\), the exception propagates out of the for

loop and aborts the sweep for every profile still queued behind it in

that run\. Because the job re\-runs the next day at 09:00 \(Doc 05 Step

10\), a profile skipped this way is delayed by up to 24 hours, not

permanently missed — but this is still a real, present\-day gap in

this already\-confirmed file, not something this document invents\.

Adding per\-profile isolation \(a try/catch inside the loop, logging

and continuing on a single profile's failure\) would mean editing Doc

05's file, which this document does not do unilaterally — see Section

7\.

 

\#\# What this document does not resolve

 

  \- What happens once the 3\-attempt verification ceiling is

    reached is no longer undefined: revised Doc 05 transitions a

    confirmed AttemptOutcome\.REJECTED to FAILED or FAILED\_FINAL

    per TRVG §3, using the existing per\-document attempt count\.

    FAILED\_FINAL is terminal, with no confirmed recovery path in

    this release \(TRVG §8\.1 — an explicitly open product

    decision, not a gap this document invents an answer for\)\.

\[Superseded, 18 September 2026: FAILED\_FINAL's terminality is now resolved, not open — TRVG2 §2\.9/§3 confirms it clears automatically after a 24\-hour cooldown, resetting attempt\_count to 0 and status to UNSTARTED, with no human or support action required\.\]

    What remains genuinely open is narrower: whether

    AttemptOutcome\.ERROR should drive the same transition, and

    the account\-versus\-document attempt\-count scope question

    \(Doc 03 §8b, Doc 05 Section 7\)\.

    \[Superseded, 18 September 2026: the account\-versus\-document scope question is now resolved — confirmed account\-wide, per Christopher’s Answer 6 and Doc 03 §8b’s and Doc 05’s 18 September 2026 revisions, matching the same fix already annotated on this finding’s fuller restatement below \(Section 7, “Pending Confirmations Carried Into This Document”\)\. Whether AttemptOutcome\.ERROR should drive a FAILED/FAILED\_FINAL transition remains open\.\]

  \- Whether RabbitMQ publishing should ever get a retry/outbox

    mechanism is still an open product/infrastructure question \(Doc

    05 Section 7, unchanged\)\.

  \- Whether TravelModeReminderJob should get per\-profile error

    isolation is a real, disclosed gap this document surfaces but

    does not decide to fix — that decision belongs with whoever owns

    Doc 05's file next\.

## __Step 3 — User\-Facing vs\. Internal Error Messaging__

Architecture Overview §7\.3's entire guidance on this is one clause: "avoid leaking internals in messages\." No source defines which specific codes are safe to show which specific caller — this step is this document's own classification \(Section 4, decision 5\), built directly from Step 1's catalog, not a confirmed platform taxonomy\.

__MOST OF THE CATALOG IS ALREADY FINE — ONE CODE ISN'T__

13 of this service's 14 catalogued codes are already safe as written — their messages are plain sentences written for whoever calls that route, and none of their details fields expose credentials, other accounts' identifiers, or raw vendor payloads \(verified entry\-by\-entry in Step 1a's messagingNote field\)\. The one unsafe code is REQUEST\_FAILED, currently exposed through two different real call sites — and both of those call sites are NOT safe as written\. That is this step's one real finding\.

__3a\. The reference document__

__FILE: apps/identity\-verification\-service/docs/error\-handling/error\-messaging\-conventions\.md__

\# Error Messaging Conventions — identity\-verification\-service

 

Architecture Overview §7\.3's full guidance: "Standard error JSON:

\{ code, message, details? \}\. Avoid leaking internals in messages\."

This document classifies every catalogued code \(Step 1\) against that

one clause\. Every classification below is this document's own

judgment call, not a confirmed platform rule\.

 

\#\# The general pattern, already correct

 

Every DomainException subclass Doc 04 and Doc 05 defined already

writes its own message as a plain, complete sentence aimed at

whoever calls that route — "This document has already expired\.",

"A document with this number is already on file under a different

account\.", "No verification attempt matches this vendor session\."

None of them reference a class name, a file path, a stack frame, an

environment variable, or a raw vendor/database error\. None of their

details fields carry a credential, another account's identifier, or

an unredacted vendor payload \(Step 1a traces this claim entry by

entry\)\. Any future DomainException subclass should keep matching this

existing pattern — this document does not need to add a rule for

something Docs 04\-05 already do consistently\.

 

\#\# The one real gap: REQUEST\_FAILED's two current call sites

 

REQUEST\_FAILED \(Doc 04 Step 6b, AllExceptionsFilter branch 3\) is a

fallback whose message is always whatever the underlying

HttpException carries — it has no fixed text of its own\. Today, in

this service, there are exactly two real call sites, and both fail

the "avoid leaking internals" test:

 

  \- BearerAuthGuard \(Doc 04 Step 6a\): "BearerAuthGuard is a

    placeholder — replace with the shared auth\-service JWT guard

    before use\."

  \- InternalServiceGuard \(Doc 04 Step 6a\): "InternalServiceGuard is a

    placeholder — replace with the platform's real internal\-service

    auth before use\."

 

Both name the exact guard class and describe exactly what

implementation work remains — genuinely useful information for the

developer building this service, but exactly the kind of internal

detail Architecture Overview §7\.3 says to avoid showing a caller\.

Today, every single request to a bearer\-guarded or internal\-guarded

route receives one of these two messages, because both guards

unconditionally reject \(Doc 04 Section 9, unchanged through Doc 08\)\.

 

This document does not change either message — doing so means editing

Doc 04's guard files, which this document does not do unilaterally

\(Section 7\)\. The classification below exists so nothing downstream

mistakes today's placeholder text for an acceptable production

message\.

 

\#\# Classification \(see Step 1a's catalog for full detail\)

 

  \- Safe to display verbatim to the audience named in the catalog:

    VALIDATION\_ERROR, DOCUMENT\_EXPIRED, NO\_DETECTED\_LOCATION,

    CLASSIFICATION\_REQUIRED, DUPLICATE\_DOCUMENT, RETRY\_LIMIT\_EXCEEDED,

    VPN\_PROXY\_DETECTED, VENDOR\_UNAVAILABLE, PROFILE\_NOT\_FOUND,

    DOCUMENT\_NOT\_FOUND, INVALID\_SIGNATURE, UNKNOWN\_VENDOR\_SESSION,

    INTERNAL\_ERROR \(13 of 14 codes\)\.

  \- NOT safe to display verbatim today: REQUEST\_FAILED, specifically

    its two current guard\-placeholder call sites\. A frontend or

    gateway that shows this service's error\.message directly to an

    end user should special\-case this one code today — for example,

    substituting a generic "You're not authorized to do that\." until

    the real guards replace the placeholders — rather than showing

    the placeholder text verbatim\.

 

\#\# What this document does not resolve

 

  \- The actual fix \(giving the real, eventual auth\-service\-backed

    guards a generic, user\-safe rejection message\) is a Doc 04

    change, not made here \(Section 7\)\.

  \- No source defines a platform\-wide taxonomy for which codes are

    "user\-facing" — this classification is this document's own, and

    should be revisited if a real platform convention is ever

    confirmed\.

## __Step 4 — Verify__

Doc 04's own verify step \(Step 10\) and Doc 05's own verify step \(Step 14\) already demonstrated the validation\-error shape, the always\-rejecting guards, and the webhook's real domain exceptions \(INVALID\_SIGNATURE, UNKNOWN\_VENDOR\_SESSION, idempotent redelivery\) end to end — the Architecture Overview's documentation rule \("Do not repeat content covered in earlier docs"\) means this step does not re\-run those checks\. It instead typechecks this document's own new catalog and demonstrates the two things only this document establishes: REQUEST\_FAILED's two\-different\-messages reality, and the unmatched\-route case\.

__4a\. Confirm the catalog loads and prints correctly__

__Run from: apps/identity\-verification\-service/__

npx ts\-node scripts/dev\-list\-error\-codes\.ts

Expected: "14 error codes catalogued:" followed by one line per code\. Count them — if it prints anything other than 14, a code was added to domain\-exceptions\.ts \(or removed\) without updating Step 1a's catalog to match; keep the two in sync\.

__4b\. Start the service__

__Run from: apps/identity\-verification\-service/__

npm run start:dev

Expected: the same route list Docs 04–08's verify steps already described, starting cleanly\.

__4c\. Confirm REQUEST\_FAILED's message actually varies by call site__

With the service running in another terminal, call a bearer\-guarded route with no Authorization header at all:

curl \-i http://localhost:3000/v1/identity\-verification/me

HTTP/1\.1 401 Unauthorized

\.\.\.

\{"code":"REQUEST\_FAILED","message":"Missing bearer token"\}

Now call the exact same route, but with a header that satisfies the "Bearer \.\.\." shape check:

curl \-i \-H "Authorization: Bearer test\-token" http://localhost:3000/v1/identity\-verification/me

HTTP/1\.1 401 Unauthorized

\.\.\.

\{"code":"REQUEST\_FAILED","message":"BearerAuthGuard is a placeholder — replace with the shared auth\-service JWT guard before use\."\}

Same code, same HTTP status, two completely different messages — exactly Step 3's point\. The second message names the guard class and what needs replacing, confirming live that today's REQUEST\_FAILED is not safe to show an end user verbatim \(Step 3a\)\.

__4d\. Confirm an unmatched route also becomes REQUEST\_FAILED__

curl \-i http://localhost:3000/v1/this\-route\-does\-not\-exist

HTTP/1\.1 404 Not Found

\.\.\.

\{"code":"REQUEST\_FAILED","message":"Cannot GET /v1/this\-route\-does\-not\-exist"\}

This is NestJS's own default routing behavior, not anything this service's code decided — an unmatched route throws its own NotFoundException, which is still just an HttpException, so AllExceptionsFilter's branch 3 \(Doc 04 Step 6b\) reshapes it the same way it reshapes a guard rejection\. This is Step 1a's third REQUEST\_FAILED case \(messagingNote\) demonstrated live\.

__4e\. The webhook's domain exceptions — already verified in Doc 05__

INVALID\_SIGNATURE, UNKNOWN\_VENDOR\_SESSION, and the idempotent\-redelivery no\-op are all already demonstrated end to end, with exact curl commands, in Doc 05 Step 14b — including seeding a pending session, computing a real HMAC signature, and confirming both the success and failure paths against a live database\. Nothing about that behavior has changed since Doc 05 shipped; re\-running it here would only repeat Doc 05's own verify step\. Refer to Doc 05 Step 14b directly if you want to re\-confirm it\.

__WHAT THIS STEP DOES AND DOES NOT PROVE__

This step proves: the cumulative catalog \(Step 1\) stays in sync with the real domain\-exceptions\.ts file, and REQUEST\_FAILED genuinely carries two different internal\-detail\-leaking messages today from its only two real call sites, plus a third framework\-level case — confirming Step 3's classification is accurate, not a hypothetical concern\. It does NOT re\-verify anything Doc 04 or Doc 05 already verified, does NOT fix the guard\-message leak \(Section 7\), does NOT change the 3\-attempt ceiling's undefined post\-ceiling behavior, and does NOT add retry logic anywhere\.

# __6\. New Files Added by This Document__

This document does not repeat Docs 03–08's complete, cumulative file manifest \(Doc 08 Section 6 covers every file through Doc 08\)\. It only adds the files below — none of them replace, modify, or get imported into anything Docs 03–08 already built\.

__File__

__Built By__

__Notes__

src/common/errors/error\-code\-catalog\.ts

Doc 09, Step 1a

Restates Doc 04's and Doc 05's error codes\. Not imported by app\.module\.ts\.

scripts/dev\-list\-error\-codes\.ts

Doc 09, Step 1b

Diagnostic only — outside src/\. Build/image exclusion not guaranteed, see Section 7\.

docs/error\-handling/retry\-and\-failure\-semantics\.md

Doc 09, Step 2

Reference documentation, not compiled code\.

docs/error\-handling/error\-messaging\-conventions\.md

Doc 09, Step 3a

Reference documentation, not compiled code\.

# __7\. Pending Confirmations Carried Into This Document__

Step 4 above passes today against the same running service Docs 06–08 already start\. None of the items below block that — each is a place where this document documented a gap instead of guessing a Product or Architecture answer, or surfaced a real gap in already\-confirmed code without fixing it unilaterally\.

- This document's diagnostic script \(scripts/dev\-list\-error\-codes\.ts, Step 1b\) inherits the exact build\-isolation risk Doc 07 Section 7 and Doc 08 Section 7 already flagged for their own diagnostic scripts: Doc 06's tsconfig\.json sets no include, exclude, or rootDir, and Doc 06's \.dockerignore does not exclude scripts/ or docs/\. That risk is not re\-solved here — it simply applies to one more file now\. A fix belongs in a Doc 06 sync, not in this document\.
- New finding: REQUEST\_FAILED's only two real call sites today \(BearerAuthGuard and InternalServiceGuard's placeholder rejections, Doc 04 Step 6a\) produce messages that name the exact guard class and what implementation work remains — internal detail, in tension with Architecture Overview §7\.3's "avoid leaking internals in messages," and confirmed live in Step 4c\. Fixing this means giving the eventual real, auth\-service\-backed guards a generic, user\-safe rejection message when they replace these placeholders — a Doc 04 change, not made here\.
- New finding: TravelModeReminderJob's daily sweep \(Doc 05 Step 10\) has no per\-profile error isolation in its for loop — an exception while processing one profile aborts the sweep for every profile still queued behind it that day \(Step 2, item 5\)\. The job re\-runs the next day, so this delays rather than permanently drops a reminder, but the gap is real\. Adding isolation would mean editing Doc 05's already\-confirmed file, not done here\.
- What happens once the 3\-attempt verification ceiling is reached is no longer undefined: revised Doc 05 transitions a confirmed AttemptOutcome\.REJECTED to FAILED or FAILED\_FINAL per TRVG §3, using the existing per\-document attempt count\. FAILED\_FINAL is terminal, with no confirmed recovery path in this release \(TRVG §8\.1 — an explicitly open product decision\)\. \[Superseded, 18 September 2026: FAILED\_FINAL's terminality is now resolved, not open — TRVG2 §2\.9/§3 confirms it clears automatically after a 24\-hour cooldown, resetting attempt\_count to 0 and status to UNSTARTED, with no human or support action required\.\] What remains genuinely open is narrower: whether AttemptOutcome\.ERROR should drive the same transition, and the account\-versus\-document attempt\-count scope question \(Doc 03 §8b, Doc 05 Section 7, unchanged by this document\)\. \[Superseded, 18 September 2026: the account\-versus\-document scope question is now resolved — confirmed account\-wide, per Christopher’s Answer 6 and Doc 03 §8b’s revised query and Doc 05’s revised retry\-count queries, both updated 18 September 2026\. Whether AttemptOutcome\.ERROR should drive a FAILED/FAILED\_FINAL transition remains open\.\]
- Whether RabbitMQ event publishing should ever get a retry mechanism or an outbox pattern remains an open product/infrastructure question \(Doc 05 Section 7, unchanged by this document\) — this document only restates the current logged\-and\-swallowed behavior, it does not decide whether that should change\.
- The user\-facing/vendor\-webhook/internal\-service classification \(Step 3\) is this document's own convention, not a confirmed platform taxonomy\. If Marketeq ever confirms a platform\-wide error\-messaging policy, this document's classification should be revisited against it\.
- Both of Doc 04's guards \(BearerAuthGuard, InternalServiceGuard\) still always reject, unchanged by this document\. This remains the single most important piece of unfinished work across this document series \(Doc 04 Section 9, Doc 05 Section 7, Doc 06 Section 7/8, Doc 07 Section 7, Doc 08 Section 7\) — and, as Step 4c shows directly, it is now also the reason REQUEST\_FAILED's only real messages today are not user\-safe\.
- New finding: TRVG2 §6\.2's anti\-enumeration requirement \[Citation corrected 21 September 2026; formerly cited as TRVG §6\.1\] for DUPLICATE\_DOCUMENT \(Step 1a\) has two parts — the response content correctly never identifies the other account, but TRVG2 §6\.2 separately requires the submission endpoint to be rate\-limited so repeated submissions can't be used to probe which documents exist; that rate limit is not implemented today \(Doc 04 §4, Doc 05/06 Section 7\)\. This document does not add one — no threshold, algorithm, or middleware is invented here\.
- RESOLVED, 18 September 2026: VpnProxyDetectedException \(Step 1a, VPN\_PROXY\_DETECTED\) previously was thrown with no details, so the response could not distinguish VPN\_DETECTED, PROXY\_DETECTED, or VPN\_AND\_PROXY\_DETECTED \(Doc 03\), even though the frontend’s confirmed design \(Epic Overview §5\.2\) has a separate error state for each variant\. Christopher’s Answer 2 confirms the requirement and Doc 05’s revised exception now carries the detected vpnProxyResult value — the fix landed in the exception itself, not a separate backend response or a frontend\-side detection mechanism\. The underlying VPN/proxy detection producer itself \(Technical Architecture §12\) remains unresolved — this document does not decide who builds the detector, only that its output is now surfaced correctly once one exists\. \[Updated 21 September 2026: per the five\-question technical resolution \(Q4\), identity\-verification\-service’s own backend team is now the proposed owner — built inline, not by api\-gateway, the Location Service, or Didit’s module — with a MaxMind GeoIP2 Anonymous IP\-style feed recommended\. This is an engineering decision made under Christopher's SOP guidance; the vendor, its cost, and the fallback policy when the signal is unavailable all remain open \(Doc 05 Step 4\)\.\]

# __8\. What's Next__

- Replace both of Doc 04's auth guards with real authentication — still the single most important piece of unfinished work across this document series\. When that happens, give the replacement guards a generic, user\-safe rejection message rather than carrying forward the placeholders' internal\-detail text \(Step 3, Section 7\)\.
- Decide the one remaining narrower question the 3\-attempt ceiling's now\-implemented FAILED\_FINAL transition leaves open: whether AttemptOutcome\.ERROR should drive the same transition\. \[Superseded, 18 September 2026: the attempt count's account\-wide\-versus\-per\-document scope, the other half of this item, is resolved — confirmed account\-wide, per Christopher’s Answer 6 and Doc 03 §8b's and Doc 05's 18 September 2026 revisions\.\]
- Decide whether RabbitMQ event publishing needs a retry mechanism or an outbox pattern, or whether logged\-and\-swallowed is the accepted permanent behavior — unresolved since Doc 05, unchanged here\.
- Consider adding per\-profile try/catch isolation to TravelModeReminderJob's daily sweep so one profile's failure can't delay every profile queued behind it — a candidate Doc 05 sync surfaced by this document \(Step 2, item 5\)\.
- Keep src/common/errors/error\-code\-catalog\.ts \(Step 1a\) in sync whenever a future document adds a new DomainException subclass — this document's own catalog is only as accurate as its last update\.
- Once this document is accepted, update the Required Docs Checklist to mark Doc 09 complete, and begin Doc 10 — Security & Auth per the locked numbering\.

