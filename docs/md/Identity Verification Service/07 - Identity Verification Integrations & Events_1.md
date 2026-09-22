__07 — IDENTITY VERIFICATION INTEGRATIONS & EVENTS__

*RabbitMQ Event Publication Details, Notification\-Service Handoff, Cross\-Service REST Consumer Contracts — identity\-verification\-service*

__Epic: __Identity Verification

__Document Role: __Deepens and documents the outbound/inbound integration contracts around what Docs 04–05 already built: a formal event catalog, a local end\-to\-end verification tool for the RabbitMQ publisher, a source\-grounded compatibility analysis against notification\-service's own architecture docs, and a consumer guide for the one confirmed cross\-service REST endpoint\.

__Prerequisites: __Doc 03 — Data Model & Database Schema, Doc 04 — API Specification, Doc 05 — Business Logic & Workflows, Doc 06 — Setup & Bootstrapping \(all built, smoke\-tested, and complete — built and smoke\-tested does not mean every code path is production\-ready; see Docs 05 and 06's own Section 7 for their unresolved implementation dependencies\), Marketeq Core Backend Technical Architecture Overview & Documentation Standards, notification\-service's own architecture docset

__Author: __CTO — written for a developer building this microservice for the first time

__Status: __Final — ready to implement

__Date: __1 September 2026

__UPDATE — 16 SEPTEMBER 2026__

Applies four corrections from the Document 07 impact report \(16 Sep 2026\)\. Step 4a's confirmed internal\-status response and Step 4b's illustrative client now include isVerified, matching Doc 04's own 16 September revision \(InternalStatusResponseDto, Step 5e\) — a computed predicate \(TRVG §2\) that does not itself confirm in\_marketplace\(account\) or enforce gates G1–G6\. Step 1's Event Catalog and Step 2a now flag a known implementation gap: the only currently\-wired IDENTITY\_VERIFIED publish call \(Doc 05 Step 11\) sets userId to payload\.vendorSessionId, not the profile's real userId \(Doc 05 Section 7\) — downstream consumers must not rely on that field until the publisher is corrected and verified; Section 7 now carries this forward as a named Engineering blocker, and Step 5's verify walkthrough is clarified to note its synthetic test event does not exercise the real, affected code path\. Step 3's citation of Epic Overview §7\.3 is narrowed to what that section actually confirms \(the general existence of a standard payload structure, not the specific field\-level shape, which remains attributed to notification\-service's own documentation, not independently available for this review\)\. The Prerequisites line now notes that built and smoke\-tested does not mean production\-ready, per Docs 05 and 06's own Section 7\. No event type, routing key, exchange name, DTO identifier, dependency, environment variable, or application code changed\. The Decision Record authority question, SVC\-24, hash implementation, retry\-budget scope, vendor mappings, expiry scheduling, rate limiting, and every other outstanding decision in this series remain exactly as open as before\.

Update — 18 September 2026 \(consistency check against Doc 02/03/05/10’s TRVG2 updates, not a scope change\): the in\_marketplace\(account\)/G1–G6 comment below is corrected — TRVG2 replaces that model with gate\_open\(account\) := is\_verified\(account\) OR in\_grace\(account\) across nine gates \(G1–G9, TRVG2 §2\); isVerified here still computes only is\_verified\(\), matching Doc 04’s and Doc 05’s same known gap\. SVC\-24, cited below as open, is resolved by Answer 4 \(Doc 10’s revised design\)\. The IDENTITY\_VERIFIED publisher userId bug, retry\-budget scope \(now resolved elsewhere — Doc 03/05\), and this document’s own event\-catalog gaps are otherwise unchanged by this note\.

# __1\. Purpose & Scope__

This document does not rebuild anything Docs 04–05 already finished: NotificationEventPublisher and the six confirmed event types \(Doc 05 Step 5\) are unchanged, and the internal\-status REST endpoint and its guard \(Doc 04 Steps 6 and 8b\) are unchanged\. What this document adds, per the Required Docs Checklist's own scope for Doc 07 — "RabbitMQ event publication details, notification\-service handoff, cross\-service REST consumers" — is four things: a formal, machine\-readable Event Catalog restating Doc 05's six confirmed events and their current wiring status \(Step 1\); a local diagnostic tool that proves this service's RabbitMQ publisher actually reaches an exchange end\-to\-end, independent of the two guards that currently block every HTTP route \(Step 2\); a source\-grounded write\-up of exactly what notification\-service's own architecture documents confirm and do not confirm about how it consumes events — including a real inconsistency between two of its own documents that this project has not previously surfaced \(Step 3\); and a consumer\-facing integration guide, with an illustrative example client, for the one confirmed cross\-service REST contract this service exposes \(Step 4\)\.

This document does NOT cover: any change to RabbitMqNotificationEventPublisher's exchange name, routing\-key pattern, or message body \(Doc 05 Step 5 — still an explicitly\-labeled placeholder, not a confirmed contract\); any change to BearerAuthGuard or InternalServiceGuard \(Doc 04 Step 6 — both still unconditionally reject every request\); a resolution of location\_verification\_submitted's trigger condition or the two unwired reminder hooks \(Doc 05 Section 7 — still open\); or Doc 08 — Monitoring & Observability's confirmed scope \(metrics, alerting, /ready\)\.

__HOW THIS DOCUMENT RELATES TO ITS SOURCES__

Every claim in this document traces to one of: \(a\) Docs 04–05's own already\-built and delivered code, reproduced or referenced exactly, never re\-derived; \(b\) this service's confirmed Technical Architecture and the platform\-wide Architecture Overview; \(c\) notification\-service's own architecture docset — a real, confirmed source this project had not previously drawn on for Docs 03–06, cited here by exact document title; or \(d\) an engineering decision this document makes on its own narrow authority \(the Event Catalog's structure, the diagnostic scripts\), labeled as such in Section 4\. Where notification\-service's own confirmed documents disagree with each other, this document says so explicitly rather than picking one silently\.

# __2\. Prerequisites__

- Doc 06 is complete: the service installs, builds, starts, and serves GET /health \(Doc 06 Step 8\)\. Everything in this document runs against that same working copy — no new dependency, script, or config Doc 06 didn't already establish\.
- A real, reachable RABBITMQ\_URL\. Unlike most of Doc 06 — where a placeholder value was enough because nothing touched RabbitMQ before Step 8d — Step 5 below actually connects to the broker\. Use the same broker Doc 05 Step 5's own code already assumed exists\.
- ts\-node \(already a devDependency — Doc 06 Step 1\) and amqplib \(already a dependency — Doc 06 Step 1, Doc 05 Step 5\)\. No new package is installed by this document \(Section 4\)\.
- Familiarity with Doc 05 Step 5's NotificationEventPublisher/RabbitMqNotificationEventPublisher and Doc 04 Step 8b's internal controller — this document builds directly on both without repeating their full code here\.

# __3\. What You're Building__

Four new pieces, plus three markdown reference documents living in the repository alongside the code they document:

- apps/identity\-verification\-service/src/events/identity\-verification\-event\-catalog\.ts — a structured, importable restatement of Doc 05's six confirmed event types and their wiring status, so no other tool or document has to re\-derive it from prose\.
- apps/identity\-verification\-service/scripts/dev\-consume\-events\.ts and dev\-publish\-test\-event\.ts — two standalone diagnostic scripts, placed outside src/ as developer tooling, that together prove the RabbitMQ publisher reaches its exchange, without depending on either guard that currently blocks every HTTP route\. Placing them outside src/ does not by itself guarantee they are excluded from the compiled build or the Docker image — see Section 4 for the actual risk\.
- apps/identity\-verification\-service/docs/integrations/rabbitmq\-event\-publication\.md — the confirmed and unconfirmed facts about this service's outbound event mechanics, in one place\.
- apps/identity\-verification\-service/docs/integrations/notification\-service\-handoff\.md — what notification\-service's own architecture docset actually confirms \(and where it contradicts itself\) about how it consumes events, plus the one confirmed but unrelated cross\-service REST precedent found on the platform\.
- apps/identity\-verification\-service/docs/integrations/consuming\-verification\-status\.md and its example client \(docs/integrations/examples/verification\-status\-client\.example\.ts\) — the confirmed request/response contract for GET /v1/internal/identity\-verification/status/:userId, for whichever team builds the calling side\.

# __4\. Engineering Decisions Made in This Document__

None of these are Product, Architecture, or notification\-service\-team decisions\. Each is the narrowest choice needed to document and operationalize the integration surface Docs 04–05 already built, without resolving anything only those other teams can resolve\.

- The Event Catalog \(Step 1\) is this document's own structure, not a new source of truth — every field in it \(event name, description, wiring status, emitting method\) is copied from Doc 05 Step 5's code and Doc 05 Section 6's own reference table, not re\-decided here\. It is additive: nothing in Docs 04–06 imports it, so adding it changes no runtime behavior\.
- dev\-consume\-events\.ts, dev\-publish\-test\-event\.ts \(Step 2\), and the illustrative example client \(Step 4b\) are placed outside src/ as developer tooling and documentation rather than application code — but this document does not claim that location alone excludes them from the compiled build or the deployed Docker image, and on inspection it likely does not\. Doc 06 Step 2's nest\-cli\.json sourceRoot: "src" governs Nest CLI scaffolding, not what tsc actually compiles; Doc 06's own tsconfig\.json sets no include, exclude, or rootDir, so TypeScript's default behavior compiles every \.ts file under the project root and infers rootDir as their common path — once files exist outside src/, that could shift the compiled entry point away from dist/main\.js, which the confirmed Dockerfile's CMD and start:prod script both depend on\. Separately, Doc 06's \.dockerignore excludes node\_modules, dist, \.env\*, and \*\.md, but not scripts/ or docs/ — so the raw script and example sources would be copied into the image by COPY \. \. regardless of how they compile\. This is a real, unresolved build\-isolation risk, not a decision this document makes \(Section 7\)\. A real fix — adding include/rootDir to tsconfig\.json, or excluding scripts/ and docs/ in \.dockerignore — would be a follow\-up engineering change to Doc 06's already\-delivered files, requiring a separate Doc 06 sync; this document does not make that change unilaterally\.
- dev\-publish\-test\-event\.ts calls RabbitMqNotificationEventPublisher directly rather than over HTTP because both of Doc 04's guards \(BearerAuthGuard and InternalServiceGuard\) unconditionally reject every request today \(Doc 04 Step 6, unchanged through Doc 06\) — an HTTP\-triggered verification step would be impossible to run until real authentication replaces them\. Calling the publisher directly is exactly what IdentityVerificationService's own methods already do \(Doc 05 Step 11\); this script does not bypass or weaken anything the guards protect\.
- The three markdown files under docs/integrations/ are this document's own choice of location and format — no source specifies where integration documentation should live in this repository\. They are placed beside the code they document rather than folded into this Word document alone, so a developer working in the codebase later finds them without needing to locate this document\.
- consuming\-verification\-status\.md's example client \(Step 4\) is explicitly labeled illustrative, not working code — it cannot succeed against a real deployment today because InternalServiceGuard rejects everything unconditionally \(Doc 04 Step 6\)\. Its Authorization: Bearer <token> header is a reasonable guess consistent with the Architecture Overview's confirmed statement that auth\-service "issues JWTs for internal services," not a confirmed header name, claim shape, or signing\-key detail — none of which is documented by any source available to this project \(Doc 04 Step 6's own callout, unchanged\)\.
- No new npm dependency is added by this document\. Both diagnostic scripts \(Step 2\) use amqplib, already a dependency since Doc 06 Step 1; both run via ts\-node, already a devDependency since the same step\.

# __5\. Step\-by\-Step Implementation__

Follow these steps in order\. Every code block names the exact file path to create it in, relative to the repository root \(marketeq\-projects\-nestjs/\)\. All paths below start from apps/identity\-verification\-service/ — this folder, and everything Docs 03–06 already built inside it, already exists\.

## __Step 1 — The Event Catalog Reference__

Doc 05 Step 5 defined the six confirmed event types and Doc 05 Section 6 described, in prose and a table, which are actually wired to a call site today\. This step restates the same facts as one importable TypeScript module — no new event, no new trigger, nothing Doc 05 didn't already establish\.

__PURELY ADDITIVE — NOT WIRED INTO THE RUNNING SERVICE__

This file adds no behavior\. Nothing in Docs 04–06 imports it, and it does not need to be added to app\.module\.ts — it exports plain data, not a NestJS provider\. Step 2's diagnostic script is its first consumer\.

__FILE: apps/identity\-verification\-service/src/events/identity\-verification\-event\-catalog\.ts__

import \{ IdentityVerificationEventType \} from '\./identity\-verification\-event\.types';

 

// A structured restatement of Doc 05 Step 5's six confirmed event

// types and Doc 05 Section 6's own reference table\. Do not add an

// event here that identity\-verification\-event\.types\.ts does not

// already define — this file describes that file, it does not

// extend it\.

export interface EventCatalogEntry \{

  eventType: IdentityVerificationEventType;

  description: string;

  wired: boolean; // false = the type exists but no code path emits it yet\.

  emittedBy: string;

\}

 

export const IDENTITY\_VERIFICATION\_EVENT\_CATALOG: readonly EventCatalogEntry\[\] = \[

  \{

    eventType: IdentityVerificationEventType\.TRAVEL\_MODE\_ACTIVATED,

    description: 'Travel Mode activated: a declared duration was recorded \(or skipped\) while the profile was classified Temporarily Traveling\.',

    wired: true,

    emittedBy: 'IdentityVerificationService\.recordTravelDuration \(Doc 05 Step 11\)',

  \},

  \{

    eventType: IdentityVerificationEventType\.TRAVEL\_MODE\_STILL\_ACTIVE,

    description: 'The daily reminder sweep found a profile due for a Travel Mode reminder, not on a skip day\.',

    wired: true,

    emittedBy: 'TravelModeReminderJob \(Doc 05 Step 10\)',

  \},

  \{

    eventType: IdentityVerificationEventType\.LOCATION\_VERIFICATION\_SUBMITTED,

    description: 'Reserved for a location\-verification submission\. No confirmed source defines what "submitted" means for location verification, so this document does not wire it up \(Doc 05 Section 7; this document's Section 7\)\.',

    wired: false,

    emittedBy: 'Not wired by any document yet\.',

  \},

  \{

    eventType: IdentityVerificationEventType\.IDENTITY\_VERIFIED,

    description: 'The Didit webhook reported outcome 'approved'\.',

    wired: true,

    emittedBy: 'IdentityVerificationService\.handleDiditWebhook \(Doc 05 Step 11\)',

    // KNOWN GAP \-\- this call site currently sets userId to

    // payload\.vendorSessionId, not the profile's real userId

    // \(Doc 05 Section 7\)\. Do not rely on this event's userId

    // field until that is corrected and verified \-\- see this

    // document's Section 7\.

  \},

  \{

    eventType: IdentityVerificationEventType\.LOCATION\_VERIFIED,

    description: 'First\-time home\-country confirmation\.',

    wired: true,

    emittedBy: 'IdentityVerificationService\.confirmHomeCountry \(Doc 05 Step 11\)',

  \},

  \{

    eventType: IdentityVerificationEventType\.HOME\_COUNTRY\_UPDATED,

    description: 'A later confirmation that changed a previously\-confirmed home country\.',

    wired: true,

    emittedBy: 'IdentityVerificationService\.confirmHomeCountry \(Doc 05 Step 11\)',

  \},

\] as const;

Every field above traces to Doc 05: the five "wired: true" entries and their emittedBy values are copied from Doc 05 Section 6's reference table; location\_verification\_submitted's "wired: false" and its description are copied from that same table's own "Not wired — see Section 7" note and Doc 05 Section 7's own wording\. This document changes none of it — see Section 7 below for why it stays unwired\.

## __Step 2 — RabbitMQ Event Publication Details__

Doc 05 Step 5 already built the publisher\. This step writes down, in one reference document, exactly what is and is not confirmed about how it publishes — and adds two small scripts that let you prove it actually works against a real broker, without needing either of Doc 04's guards to work first\.

__2a\. The confirmed and unconfirmed facts__

__FILE: apps/identity\-verification\-service/docs/integrations/rabbitmq\-event\-publication\.md__

\# RabbitMQ Event Publication — Identity Verification Service

 

\#\# What's confirmed

 

\- Technical Architecture Section 5: RabbitMQ \(not polling\) is the

  confirmed mechanism for publishing state\-change events, consumed by

  notification\-service and any other interested consumer\.

\- The six event types and their trigger conditions — Doc 05 Step 5

  \(identity\-verification\-event\.types\.ts\), restated in

  identity\-verification\-event\-catalog\.ts \(Step 1 of this document\)\.

\- The message body shape: IdentityVerificationEvent \{ eventType,

  profileId, userId, occurredAt, data? \} — Doc 05 Step 5\.

\- Known implementation gap: the currently\-wired IDENTITY\_VERIFIED

  publisher \(handleDiditWebhook, Doc 05 Step 11\) sets userId to

  payload\.vendorSessionId, not the profile's real userId \(Doc 05

  Section 7\) — the message\-body contract above is the

  documented shape, not what this one call site currently sends\.

  Do not rely on IDENTITY\_VERIFIED\.userId until the publisher is

  corrected and verified; see this document's Section 7\.

\- Delivery semantics: a publish failure is logged and swallowed, never

  thrown back to the caller\. "A notification\-event failure must never

  break the request that triggered it" \(Doc 05 Step 5's own code

  comment\)\. No retry, no outbox — Doc 05 Section 7 already flags this

  as an open question, not a decision this document makes\.

 

\#\# What's NOT confirmed \(Doc 05 Step 5's own placeholder\)

 

\- The exchange name \(identity\-verification\.events\), its type \(topic\),

  and the routing\-key pattern \(identity\-verification\.<event\-type>\) are

  Doc 05's own recommended default, not a Product or Architecture

  decision\. Technical Architecture Section 4: "category/integration

  specifics remain undecided\."

\- Marketeq's real shared RabbitMQ messaging client/abstraction

  \(Technical Architecture Section 17: referenced, but "no specific

  package name is confirmed in the reviewed documentation"\) — Doc 05

  built directly on amqplib instead of guessing at that client's API\.

 

\#\# This document's contribution

 

This document does not change the exchange name, routing key, message

body, or delivery semantics above — all four remain exactly as Doc 05

Step 5 left them\. What this document adds is a way to actually observe

the publisher working, end to end, against a real broker: see 2b/2c

below and Step 5 \(Verify\)\. See notification\-service\-handoff\.md for

whether this topology is compatible with notification\-service's own

confirmed consumption patterns — short answer: not proven, and

possibly not, in two different ways\. See that file for detail\.

\[Updated 21 September 2026: the five\-question technical resolution \(Q3\) proposes amq\.topic as the exchange and a three\-segment routing key as the convention for these events — an engineering decision made under Christopher's SOP guidance\. Marketeq's real shared RabbitMQ messaging client/abstraction and notification\-service's actual binding to this exchange remain unconfirmed; this document does not itself modify Doc 05's publisher, which was itself updated by the same Q3 decision \(EXCHANGE\_NAME is now amq\.topic; the routing key is now the three\-segment identity\-verification\.verification\.<event\-type>\)\.\]

__2b\. Local event\-verification consumer__

A standalone script — not part of the deployable service — that binds a temporary queue to the same exchange the publisher uses, with a wildcard binding key, and logs every message it receives\. Its only purpose is to let you see, locally, that a published event actually reaches the exchange\.

__DIAGNOSTIC TOOLING — BUILD/IMAGE ISOLATION NOT GUARANTEED, SEE SECTION 4__

This lives under scripts/, not src/, as developer tooling rather than application code\. That placement does not by itself guarantee this file is excluded from the compiled build or the Docker image: Doc 06's tsconfig\.json sets no include, exclude, or rootDir, so it may currently compile into dist/ alongside the application, and Doc 06's \.dockerignore does not exclude scripts/ either way\. See Section 4 and Section 7 — this is a real, open build\-isolation risk this document flags but does not fix\.

__FILE: apps/identity\-verification\-service/scripts/dev\-consume\-events\.ts__

/\*\*

 \* Local diagnostic tool\. Connects to the same RabbitMQ instance this

 \* service publishes to \(RABBITMQ\_URL\) and creates a temporary,

 \* exclusive queue bound to the confirmed placeholder exchange

 \* \(identity\-verification\.events, Doc 05 Step 5\) with a wildcard

 \* binding key, then logs every message it receives\.

 \*

 \* This proves events reach the exchange this service publishes to\.

 \* It does NOT prove notification\-service \(or any other real consumer\)

 \* can receive them in a shape it expects — see

 \* rabbitmq\-event\-publication\.md and notification\-service\-handoff\.md

 \* for why that is a separate, unresolved question\.

 \*

 \* Run with: npx ts\-node scripts/dev\-consume\-events\.ts

 \*/

import \* as amqplib from 'amqplib';

import \{ IDENTITY\_VERIFICATION\_EVENT\_CATALOG \} from '\.\./src/events/identity\-verification\-event\-catalog';

 

const EXCHANGE\_NAME = 'identity\-verification\.events'; // Doc 05 Step 5 — placeholder, not confirmed\.

const BINDING\_KEY = 'identity\-verification\.\#';

 

async function main\(\): Promise<void> \{

  const url = process\.env\.RABBITMQ\_URL;

  if \(\!url\) \{

    console\.error\('RABBITMQ\_URL is not set\. Export it before running this script \(Doc 06 Step 3\)\.'\);

    process\.exit\(1\);

  \}

 

  const connection = await amqplib\.connect\(url\);

  const channel = await connection\.createChannel\(\);

  await channel\.assertExchange\(EXCHANGE\_NAME, 'topic', \{ durable: true \}\);

  const \{ queue \} = await channel\.assertQueue\('', \{ exclusive: true, autoDelete: true \}\);

  await channel\.bindQueue\(queue, EXCHANGE\_NAME, BINDING\_KEY\);

 

  console\.log\(\`Listening on exchange "$\{EXCHANGE\_NAME\}" \(binding key "$\{BINDING\_KEY\}"\)\. Ctrl\+C to stop\.\`\);

  console\.log\(

    'Wired event types:',

    IDENTITY\_VERIFICATION\_EVENT\_CATALOG\.filter\(\(e\) => e\.wired\)\.map\(\(e\) => e\.eventType\)\.join\(', '\),

  \);

 

  channel\.consume\(queue, \(msg\) => \{

    if \(\!msg\) return;

    const event = JSON\.parse\(msg\.content\.toString\(\)\);

    console\.log\(\`\\n\[$\{new Date\(\)\.toISOString\(\)\}\] routingKey=$\{msg\.fields\.routingKey\}\`\);

    console\.log\(JSON\.stringify\(event, null, 2\)\);

    channel\.ack\(msg\);

  \}\);

\}

 

main\(\)\.catch\(\(err\) => \{

  console\.error\('dev\-consume\-events failed:', err\);

  process\.exit\(1\);

\}\);

__2c\. Local test\-event publisher__

A companion script that publishes one synthetic event through the real, unmodified RabbitMqNotificationEventPublisher — the same class IdentityVerificationService's own methods already use \(Doc 05 Step 11\) — without going through HTTP\. This is necessary, not just convenient: both of Doc 04's guards unconditionally reject every request today \(Doc 04 Step 6, unchanged through Doc 06\), so there is currently no way to trigger a real event through the API at all\. Calling the publisher directly is the only way to exercise it until real authentication lands\.

__FILE: apps/identity\-verification\-service/scripts/dev\-publish\-test\-event\.ts__

/\*\*

 \* Local diagnostic tool — see the note on dev\-consume\-events\.ts above

 \* for why this lives outside src/\.

 \*

 \* Publishes one synthetic event through the actual

 \* RabbitMqNotificationEventPublisher \(Doc 05 Step 5\), unmodified,

 \* bypassing HTTP entirely\. Both BearerAuthGuard and

 \* InternalServiceGuard \(Doc 04 Step 6\) unconditionally reject every

 \* request today, which would make an HTTP\-triggered verification step

 \* impossible to run — this script exists so Step 5 \(Verify\) below can

 \* still prove the publisher works\.

 \*

 \* Run with: npx ts\-node scripts/dev\-publish\-test\-event\.ts

 \*/

import \{ RabbitMqNotificationEventPublisher \} from '\.\./src/events/rabbitmq\-notification\-event\-publisher';

import \{ IdentityVerificationEventType \} from '\.\./src/events/identity\-verification\-event\.types';

 

async function main\(\): Promise<void> \{

  if \(\!process\.env\.RABBITMQ\_URL\) \{

    console\.error\('RABBITMQ\_URL is not set\. Export it before running this script \(Doc 06 Step 3\)\.'\);

    process\.exit\(1\);

  \}

 

  const publisher = new RabbitMqNotificationEventPublisher\(\);

  await publisher\.publish\(\{

    eventType: IdentityVerificationEventType\.IDENTITY\_VERIFIED,

    profileId: 'test\-profile\-id',

    userId: 'test\-user\-id',

    occurredAt: new Date\(\)\.toISOString\(\),

    data: \{ note: 'Synthetic event from dev\-publish\-test\-event\.ts — not a real verification\.' \},

  \}\);

 

  console\.log\('Published one synthetic identity\_verified event\. Check dev\-consume\-events\.ts\\'s terminal\.'\);

  await publisher\.onModuleDestroy\(\);

\}

 

main\(\)\.catch\(\(err\) => \{

  console\.error\('dev\-publish\-test\-event failed:', err\);

  process\.exit\(1\);

\}\);

## __Step 3 — Notification\-Service Handoff__

Docs 03–06 never drew on notification\-service's own architecture docset\. This step does, for the first time in this document series, and reports exactly what it confirms — including a real inconsistency between two of its own documents that matters to anyone eventually connecting the two services\.

__THIS STEP DOES NOT RESOLVE THE HANDOFF — IT DOCUMENTS WHAT'S KNOWN__

Nothing below changes RabbitMqNotificationEventPublisher \(Doc 05 Step 5\)\. This document does not pick a side in notification\-service's own internal inconsistency, and does not guess which of its two patterns is the one actually deployed — that is a confirmation only the notification\-service team can give\.

__FILE: apps/identity\-verification\-service/docs/integrations/notification\-service\-handoff\.md__

\# Notification\-Service Handoff — What's Actually Confirmed

 

\#\# The confirmed relationship

 

Technical Architecture Section 4: "notification\-service — consumes

events emitted by this service via its existing RabbitMQ pipeline;

category/integration specifics remain undecided\." That is the entire

confirmed relationship between the two services\. Everything below is

what notification\-service's own architecture docset says about its

consuming side — cited so this project stops treating that gap as

totally undocumented, while being explicit about where that docset

disagrees with itself\.

 

\#\# notification\-service's own docs disagree on how it consumes

 

\*\*"02 \- Notification Triggers"\*\* describes topic\-based RabbitMQ

subscriptions with a three\-segment namespaced format:

\`<service>\.<entity>\.<eventType>\` \(examples given: listing\.project\.

approved, messaging\.message\.sent\)\. No exchange name is given anywhere

in this document\.

 

\*\*"NestJS notification\-service bootstrap"\*\* describes something

different and incompatible with the above: a single fixed queue

\(notifications\_queue\) consumed via @nestjs/microservices' RMQ

transport, keyed on one message pattern \(send\_notification\) carrying

a generic \{ type: 'email'|'push', to, subject?, message, channel?,

event? \} payload — not a topic exchange, and not per\-event routing at

all\.

 

These two confirmed notification\-service documents do not agree with

each other, and no source available to this project states which

pattern \(if either\) reflects what is actually deployed\. Note also:

even taken at face value, "02"'s three\-segment format

\(<service>\.<entity>\.<eventType>\) does not match this service's own

two\-segment routing key \(identity\-verification\.<event\-type>,

Doc 05 Step 5\) — so this service's placeholder topology is not

confirmed compatible with either of notification\-service's own

patterns\.

 

\#\# The confirmed stored\-notification payload shape \(informational only\)

 

"03 \- Notification Types & Payload Structure" gives notification\-

service's internal/stored record shape:

 

  \{ recipientId, category, event, title, body, link, metadata,

    delivery: \{ inApp, email, sms \}, origin, createdAt \}

 

This is real, per notification\-service's own documented

internal record shape — though that document was not

independently available for this review\. Epic Overview

Section 7\.3 independently confirms the general existence of a

standard payload structure for this pipeline, but does not

itself enumerate these specific fields\. It describes

notification\-service's own stored record, not a confirmed wire\-level

RabbitMQ message body a producer must publish\. No source states that

identity\-verification\-service's outbound event must arrive in this

shape\. This document does not adopt it as this service's message

format — doing so would be inventing a contract no source confirms\.

 

\#\# A confirmed REST pattern exists elsewhere — not for this service

 

"Sending Team Member Invitations via Notification Service" documents

a real, working cross\-service REST call: User Registration Service

calls notification\-service's POST /notification/send\-invite directly

over HTTP, with no visible auth header of any kind\. This is scoped

specifically to team invitations and is not connected to identity\-

verification\-service by any source\. It is cited here only as platform

precedent that unauthenticated service\-to\-service REST calls

apparently happen elsewhere on this platform today — not as an

alternative handoff mechanism for this service to adopt\.

 

\#\# What this means for this document series

 

Resolving the actual exchange/queue/routing\-key/message\-schema

contract between identity\-verification\-service and notification\-

service requires both teams to agree on one pattern — this document

cannot make that decision unilaterally, and does not attempt to\. See

Section 7\.

## __Step 4 — Cross\-Service REST Consumers__

This service exposes exactly one confirmed cross\-service REST contract: GET /v1/internal/identity\-verification/status/:userId \(Doc 04 Step 8b\), built for SVC\-20 — "another Marketeq service gating an action" on verification status \(Doc 01 Section 5\)\. No confirmed source names which service\(s\) will actually call it \(Technical Architecture Section 4: "the specific calling services are not enumerated in any source and are not invented here"\)\. This step writes down its confirmed contract for whichever team eventually builds the calling side, and gives an illustrative example client\.

__4a\. The confirmed contract__

__FILE: apps/identity\-verification\-service/docs/integrations/consuming\-verification\-status\.md__

\# Consuming GET /v1/internal/identity\-verification/status/:userId

 

\#\# Confirmed request

 

  GET /v1/internal/identity\-verification/status/:userId

  Authorization: <see "Auth" below — not resolved today>

 

No request body\. userId is a path parameter, not a query string field

\(Doc 04 Step 8b\)\.

 

\#\# Confirmed response — 200

 

  \{ "identityVerificationStatus": "<IdentityVerificationStatus>",

    "locationVerificationStatus": "<LocationVerificationStatus>",

    "isVerified": <boolean> \}

 

\(InternalStatusResponseDto, Doc 04 Step 5e, 16 September

revision\. isVerified is computed — true only when both

identityVerificationStatus and locationVerificationStatus are

VERIFIED \(TRVG2 §2\) — not a stored field; it still does not

confirm gate\_open\(account\) := is\_verified\(\) OR in\_grace\(\), or

enforce any of the nine gates \(G1–G9, TRVG2 §2\) — same known

gap as Doc 04/05, not fixed here \(18 September 2026\)\.

\(TRVG §2\.4, Doc 04 §8b\)\. The enum value sets themselves are

Doc 03's confirmed schema — see Doc 03's entity reference,

not repeated here\.\)

 

\#\# Confirmed error shape

 

Every error uses the shared \{ code, message, details? \} envelope

\(AllExceptionsFilter, Doc 04 Step 6b\)\. Two documented cases:

 

  \- 401 REQUEST\_FAILED \(AllExceptionsFilter's fallback branch — Doc 04

    Section 7 names "an unhandled guard rejection" as exactly this

    case; message text is the guard's placeholder rejection string,

    not a real auth failure\) — today this is the ONLY outcome any

    caller will ever see \(see "Auth" below\)\.

  \- 404 PROFILE\_NOT\_FOUND — Doc 04/05: getStatusForInternalCaller

    throws ProfileNotFoundException rather than lazily creating a

    profile the way the user\-facing path does \(a deliberate,

    confirmed difference for the internal\-caller path\)\.

 

\#\# Auth — NOT resolved, do not guess further than this

 

InternalServiceGuard \(Doc 04 Step 6\) unconditionally rejects every

request with 401 today\. It is not production\-safe and is unchanged

through Doc 06\. What IS confirmed: auth\-service "issues JWTs for

internal services" \(Architecture Overview\) and reusable guards belong

under /shared \(Architecture Overview Section 7\.2\)\. What is NOT

confirmed by any source available to this project: the JWT's claim

shape, its signing\-key distribution, or the exact header/scheme a

caller should use\. Do not build a real integration against this

endpoint until that is confirmed and InternalServiceGuard is replaced

— see Section 7\.

__4b\. Illustrative example client__

__ILLUSTRATIVE ONLY — NOT A WORKING INTEGRATION TODAY__

This file cannot succeed against a real deployment today — InternalServiceGuard rejects every request unconditionally \(4a above\)\. It exists to show the confirmed request/response shape precisely, so the calling team has something concrete to start from once real auth replaces the guard\. The Authorization header shown is a reasonable guess consistent with auth\-service issuing JWTs for internal services — not a confirmed header name or token format\.

__FILE: apps/identity\-verification\-service/docs/integrations/examples/verification\-status\-client\.example\.ts__

/\*\*

 \* ILLUSTRATIVE ONLY — see the callout above this file in the document

 \* that shipped it \(Doc 07 Step 4b\)\. Do not deploy or call this

 \* against a real environment; InternalServiceGuard rejects every

 \* request unconditionally until real internal\-service auth replaces

 \* it \(Doc 04 Step 6, Doc 07 Section 7\)\.

 \*/

export interface InternalStatusResponse \{

  identityVerificationStatus: string;

  locationVerificationStatus: string;

  isVerified: boolean;

\}

 

export async function getVerificationStatus\(

  baseUrl: string,

  userId: string,

  internalServiceToken: string, // Placeholder — see the note above this file\.

\): Promise<InternalStatusResponse> \{

  const response = await fetch\(

    \`$\{baseUrl\}/v1/internal/identity\-verification/status/$\{encodeURIComponent\(userId\)\}\`,

    \{ headers: \{ Authorization: \`Bearer $\{internalServiceToken\}\` \} \},

  \);

 

  if \(\!response\.ok\) \{

    const errorBody = await response\.json\(\);

    // Shared error shape — Doc 04 Step 6b\.

    throw new Error\(\`identity\-verification\-service returned $\{response\.status\}: $\{errorBody\.code ?? 'UNKNOWN'\} — $\{errorBody\.message\}\`\);

  \}

 

  return response\.json\(\);

\}

## __Step 5 — Verify__

One end\-to\-end check: prove a synthetic event, published through the real, unmodified RabbitMqNotificationEventPublisher, actually reaches an exchange\-bound consumer\. This is the only step in this document that touches a running process — Steps 1–4 produced reference files and example code, not runtime behavior\.

__5a\. Confirm RABBITMQ\_URL points at a real broker__

Unlike most of Doc 06 — where a placeholder value was enough — this step actually connects\. Use the same broker Doc 05 Step 5's code already assumed exists\.

echo $RABBITMQ\_URL

Expected: a real amqp:// URL, not empty and not a placeholder string\. If this is unset, export it \(or source it from your \.env — Doc 06 Step 3\) before continuing\.

__5b\. Start the consumer__

__Terminal 1 — run from: apps/identity\-verification\-service/__

npx ts\-node scripts/dev\-consume\-events\.ts

Expected: "Listening on exchange "identity\-verification\.events" \(binding key "identity\-verification\.\#"\)\. Ctrl\+C to stop\.", followed by a line listing the five wired event types from Step 1's catalog\. Leave this running\.

__5c\. Publish a synthetic event__

__Terminal 2 — run from: apps/identity\-verification\-service/__

npx ts\-node scripts/dev\-publish\-test\-event\.ts

Expected: "Published one synthetic identity\_verified event\. Check dev\-consume\-events\.ts's terminal\.", then the process exits cleanly \(its own onModuleDestroy call closes the channel and connection — Doc 05 Step 5\)\.

__5d\. Confirm it arrived__

Back in Terminal 1, expect the event to appear within a second or two:

\[<timestamp>\] routingKey=identity\-verification\.identity\_verified

\{

  "eventType": "identity\_verified",

  "profileId": "test\-profile\-id",

  "userId": "test\-user\-id",

  "occurredAt": "<timestamp>",

  "data": \{

    "note": "Synthetic event from dev\-publish\-test\-event\.ts — not a real verification\."

  \}

\}

If nothing appears within a few seconds, confirm both scripts are pointed at the same RABBITMQ\_URL and that no firewall or network policy is separating them from the broker\. Stop the consumer with Ctrl\+C when done\.

__WHAT THIS STEP DOES AND DOES NOT PROVE__

This proves the placeholder topology is self\-consistent: this service's own publisher and a consumer bound to the same exchange with a wildcard key can exchange a message end to end\. It does NOT prove compatibility with notification\-service's real consumption pattern \(Step 3\) — neither of notification\-service's own documented patterns was exercised here\. It also does NOT prove the guards or real authentication work — both remain unconditional\-reject placeholders \(Doc 04 Step 6\), unrelated to what this step tests\. It also does NOT validate the real, currently\-wired IDENTITY\_VERIFIED publish call site \(handleDiditWebhook, Doc 05 Step 11\): Step 2c's script publishes a synthetic event with a correctly\-shaped test userId \('test\-user\-id'\), which is not affected by the known userId gap in that call site \(Section 7\) — passing this step does not mean that gap is fixed\.

# __6\. New Files Added by This Document__

This document does not repeat Docs 03–06's complete, cumulative file manifest \(Doc 06 Section 6 already covers every file through Doc 06\)\. It only adds the files below — none of them replace, modify, or get imported into anything Docs 03–06 already built\.

__File__

__Built By__

__Notes__

src/events/identity\-verification\-event\-catalog\.ts

Doc 07, Step 1

Restates Doc 05 Step 5's event types\. Not imported by app\.module\.ts\.

scripts/dev\-consume\-events\.ts

Doc 07, Step 2b

Diagnostic only — outside src/\. Build/image exclusion not guaranteed, see Section 7\.

scripts/dev\-publish\-test\-event\.ts

Doc 07, Step 2c

Diagnostic only — outside src/\. Build/image exclusion not guaranteed, see Section 7\.

docs/integrations/rabbitmq\-event\-publication\.md

Doc 07, Step 2a

Reference documentation, not compiled code\.

docs/integrations/notification\-service\-handoff\.md

Doc 07, Step 3

Reference documentation, not compiled code\.

docs/integrations/consuming\-verification\-status\.md

Doc 07, Step 4a

Reference documentation, not compiled code\.

docs/integrations/examples/verification\-status\-client\.example\.ts

Doc 07, Step 4b

Illustrative only — not a working integration today\.

# __7\. Pending Confirmations Carried Into This Document__

Step 5 above passes today with no real infrastructure beyond a reachable RabbitMQ broker\. None of the items below block that — each is a place where this document documented a gap instead of guessing a Product, Architecture, or notification\-service\-team answer\.

- New finding: this document's two diagnostic scripts \(Step 2b/2c\) and its illustrative example client \(Step 4b\) are placed outside src/ as developer tooling, but that placement does not by itself exclude them from the compiled build or the deployed Docker image\. Doc 06's tsconfig\.json sets no include, exclude, or rootDir \(so TypeScript's default file discovery would pick them up and could shift the compiled entry point away from dist/main\.js\), and Doc 06's \.dockerignore does not exclude scripts/ or docs/ either\. Whether this actually breaks anything has not been tested — it is a real, unresolved build\-isolation risk this document surfaces but does not fix\. A fix \(tsconfig\.json include/rootDir, or \.dockerignore exclusions\) would change Doc 06's already\-delivered files and needs a separate Doc 06 sync, not a change this document makes on its own\.
- The RabbitMQ exchange name, routing\-key pattern, and Marketeq's own shared messaging client's real interface \(Doc 05 Step 5\) remain unconfirmed — unchanged by this document \(Step 2a\)\. \[Updated 21 September 2026: the exchange name and routing\-key pattern are no longer unconfirmed — Q3 proposes amq\.topic and a three\-segment routing key, an engineering decision made under Christopher's SOP guidance\. Marketeq's shared messaging client's real interface remains unconfirmed, unchanged by this document\.\]
- New finding: notification\-service's own architecture docset contains two mutually\-inconsistent descriptions of how it consumes events \(a topic\-exchange pattern in "02 \- Notification Triggers" vs\. a fixed\-queue/message\-pattern design in "NestJS notification\-service bootstrap"\), and neither is confirmed as what is actually deployed\. Even the topic\-exchange pattern's three\-segment routing\-key format does not match this service's own two\-segment convention\. Resolving this requires the identity\-verification\-service and notification\-service teams to agree on one contract — this document surfaces the inconsistency but does not adjudicate it \(Step 3\)\. \[Updated 21 September 2026: Q3 confirms three\-segment as the proposed platform convention \(an engineering decision made under Christopher's SOP guidance\), and this service's own implementation was updated at the same time — Doc 05 Step 5's routing key is now the three\-segment identity\-verification\.verification\.<event\-type>, resolving the segment\-count mismatch this bullet originally flagged\. What remains unresolved: whether notification\-service is actually bound to consume from amq\.topic with this routing key at all; the two teams still need to confirm that, and this document still does not adjudicate it\.\]
- notification\-service's confirmed stored\-notification payload structure \(recipientId, category, event, title, body, link, metadata, delivery flags\) is cited as informational context only \(Step 3\) — no source requires this service's outbound RabbitMQ message to match it, and this document does not adopt it as a contract\.
- Both of Doc 04's guards \(BearerAuthGuard, InternalServiceGuard\) still always reject, unchanged by this document\. This remains the single most important piece of unfinished work across this document series \(Doc 04 Section 9, Doc 05 Section 8, Doc 06 Section 7/8\), and is why Step 4's example client and Step 2c's direct\-publisher workaround exist in the first place\.
- The real internal\-service auth mechanism's claim shape and signing\-key distribution \(Doc 04 Step 6, Doc 06 Section 7\) remain unconfirmed — Step 4's illustrative client's Authorization header is a guess consistent with auth\-service issuing JWTs for internal services, not a confirmed scheme\.
- location\_verification\_submitted \(Doc 05 Section 7, restated in Step 1's catalog\) is still not wired to any call site\. No source defines what "submitted" means for location verification, and this document does not invent one\.
- The two unwired reminder hooks \(onFreshLogin, onDetectedCountryChanged — Doc 05 Step 10, Doc 05 Section 7/8\) remain unwired\. No confirmed integration point delivers either signal to this service, and cross\-service REST consumers \(Step 4\) is a different, unrelated integration surface from this inbound\-signal question\.
- No delivery\-guarantee, retry, or outbox requirement is defined for this service's outbound events \(Doc 05 Section 7, unchanged\) — a publish failure is still logged and swallowed \(Step 2a\)\.
- No calling service for the internal status endpoint \(Step 4\) is named by any source — Technical Architecture Section 4 explicitly states this and this document does not invent one\.
- Engineering blocker: the only currently\-wired IDENTITY\_VERIFIED publish call site \(handleDiditWebhook, Doc 05 Step 11\) sets userId to payload\.vendorSessionId instead of the profile's real userId \(Doc 05 Section 7\)\. This document does not change the publisher or invent a replacement lookup — it documents the gap \(Step 1, Step 2a\) and states that downstream consumers must not rely on IDENTITY\_VERIFIED\.userId until it is corrected and verified\. Fixing it requires a one\-line profile lookup in already\-confirmed Doc 05 code, an Engineering task this document flags but does not perform\.

# __8\. What's Next__

- Verify, and fix if needed, whether this document's diagnostic scripts and example client actually end up outside the compiled build and the Docker image as intended — Doc 06's tsconfig\.json and \.dockerignore do not currently guarantee that \(Section 7\)\. If a fix is needed, it belongs in a Doc 06 sync \(tsconfig\.json include/rootDir, or \.dockerignore exclusions\), not in this document\.
- Get the identity\-verification\-service and notification\-service teams to agree on one exchange/queue/routing\-key/message\-schema contract, resolving the inconsistency this document surfaced in Step 3 — neither team's existing documentation alone answers this\. \[Updated 21 September 2026: the exchange/routing\-key half of that contract is now proposed — Q3 names amq\.topic and a three\-segment routing key\. Still unresolved: whether notification\-service is actually bound to consume from it, which remains the open half of getting the two teams to agree\.\]
- Replace both of Doc 04's auth guards with real authentication — still the single most important piece of unfinished work across this document series, unchanged by this document\.
- Confirm the real internal\-service auth mechanism's claim shape and signing\-key distribution, then replace Step 4's illustrative example with a working one\.
- Resolve location\_verification\_submitted's trigger condition and decide how the two unwired reminder signals \(fresh login, detected country change\) should reach this service — both carried forward from Doc 05, unchanged here\.
- Once this document is accepted, update the Required Docs Checklist to mark Doc 07 complete, and begin Doc 08 — Monitoring & Observability per the locked numbering\.

