__08 — IDENTITY VERIFICATION MONITORING & OBSERVABILITY__

*/health, /ready, Logging Conventions, Metrics, Alerting — identity\-verification\-service*

__Epic: __Identity Verification

__Document Role: __Adds readiness checking, a request\-identification convention, a minimal vendor\-neutral metrics scaffold, and an alerting\-readiness reference on top of Doc 06's already\-built GET /health\. Documents, rather than resolves, the logging/metrics/alerting decisions no source has made yet\.

__Prerequisites: __Doc 03 — Data Model & Database Schema, Doc 04 — API Specification, Doc 05 — Business Logic & Workflows, Doc 06 — Setup & Bootstrapping, Doc 07 — Integrations & Events \(all built, smoke\-tested, and complete — built and smoke\-tested does not mean every code path is production\-ready; see Docs 05, 06, and 07's own Section 7 for their unresolved implementation dependencies\), Marketeq Core Backend Technical Architecture Overview & Documentation Standards

__Author: __CTO — written for a developer building this microservice for the first time

__Status: __Final — ready to implement

__Date: __1 September 2026

__UPDATE — 16 SEPTEMBER 2026__

Applies four items from the Document 08 impact report \(16 Sep 2026\)\. The Prerequisites line now notes that built and smoke\-tested does not mean production\-ready, per Docs 05, 06, and 07's own Section 7\. Section 1 and Section 7 now disclose that this document's monitoring does not cover the nine\-value identity\-verification status model, duplicate\-document detection, verification\-attempt/rate\-limit behavior, or document expiry and the EXPIRED transition — MetricsService \(Step 3\) remains a generic, unwired counter/gauge registry, no metric or alert exists for any of these areas today, and location verification's own applicable status transitions remain separately unresolved and are not assumed here either \(Doc 05/06 Section 7\)\. alerting\-readiness\.md's open questions and Section 7 also now carry forward the known IDENTITY\_VERIFIED\.userId gap \(Doc 05 Section 7, Doc 07 Section 7 — Engineering blocker\): the currently\-wired publisher sets userId to a Didit vendor session ID, not the profile's real user ID, and no future event\-based monitoring should rely on that field until Engineering corrects and verifies the publisher\. Section 3's route description is corrected to GET /v1/internal/metrics, matching the controller \(Step 3b\) and Step 5f's verify walkthrough — no route or controller changed\. No code was changed, no monitoring was built, and both of Doc 04's guards remain unconditional\-reject placeholders, unchanged\. The Decision Record authority question, SVC\-24, hash implementation, retry\-budget scope, vendor mappings, expiry scheduling, rate limiting, and every other outstanding decision in this series remain exactly as open as before\.

__UPDATE — 17 SEPTEMBER 2026__

Applies one correction from the Identity Verification Final Cross\-Document Audit \(Finding 10\) and the Correction 5 review it authorized: Step 2c's logging\-conventions\.md reference, under “What must never be logged,” did not name verification\_attempts\.failure\_code\. Doc 03 §6c confirms this column exists \(vendor\-provided, server\-side\-only, never shown to the end user\), and this document's own PII classification and Section 7 already identified the gap without editing Doc 08 unilaterally\. One bullet is added naming failure\_code and its safe logging alternative \(the attempt's id\)\. No confirmed source states an active leak exists today — no log statement currently prints a full verification\_attempts row\. No other content in this document was changed\.

# __1\. Purpose & Scope__

The Architecture Overview's Service Template confirms this document's whole scope in one place \(§5\.6, "Health, Readiness & Observability"\): "GET /health returns \{ status: 'ok' \} — Optional /ready if dependencies \(DB, queues\) must be up — Logging guidelines; SLO/alerts if defined\." GET /health is already built \(Doc 06\) and unchanged here\. This document builds the rest of that one paragraph, and only that paragraph: a /ready route that actually checks this service's one critical dependency \(the database\) at request time; a request\-identification convention \(an X\-Request\-Id header\) as a foundation for log correlation; a minimal, dependency\-free metrics counter registry and an internal endpoint to read it; and a written alerting\-readiness reference\. None of the source material for this service names a logging library, a metrics vendor, a metrics format, an alerting tool, or an alert threshold — Section 4 and Section 7 say exactly where each of those stays undecided, so nothing here is presented as more settled than it is\.

This document does NOT cover: any change to HealthController or GET /health's response \(Doc 06 — unchanged\); any change to Doc 04's two auth guards \(still unconditionally reject\); wiring RabbitMQ connectivity into the readiness check \(Section 4 explains why\); or wiring the new metrics counters into any of Doc 05's already\-confirmed business logic \(Section 7 — doing so would mean editing that document's already\-delivered method bodies, which this document does not do unilaterally\)\. This document also does not monitor this service's own business\-outcome state: the nine\-value identity\-verification status model \(Doc 03\), duplicate\-document detection \(Doc 05/06 Section 7 — hash implementation unresolved\), verification\-attempt and rate\-limit behavior \(Doc 05/06 Section 7 — scope unresolved\) \[Superseded, 18 September 2026: the attempt\-count scope specifically is resolved — confirmed account\-wide \(profile\_id alone\), per Christopher's Answer 3 and TRVG2 §2's gate\-table note\. Rate\-limit implementation \(threshold, layer\) remains a genuinely open Security/Engineering decision \(O9\), unaffected by this correction\.\], or document expiry and the EXPIRED transition \(Doc 05/06 Section 7 — scheduler not built\); location verification's own applicable status transitions are separately unresolved and are not assumed here either\. MetricsService \(Step 3\) is a generic, unwired counter/gauge registry that could eventually carry signals for these areas, but nothing in this document connects it to any of them — see Section 7\.

__HOW THIS DOCUMENT RELATES TO ITS SOURCES__

Every claim in this document traces to one of: \(a\) the Architecture Overview's §5\.6 template line and §11 Appendix \(the only confirmed observability material for any Marketeq service\); \(b\) Docs 03–07's own already\-built and delivered code, referenced exactly; \(c\) an engineering decision this document makes on its own narrow authority, labeled as such in Section 4; or \(d\) real, named prior art from another Marketeq service's own architecture docset \(auth\-service, content\-moderation\-service\), cited only as illustrative precedent — never as a confirmed requirement for this service\.

# __2\. Prerequisites__

- Docs 03–07 are complete: the service installs, builds, starts, serves GET /health, and every route, guard, provider, job, and event mechanism those documents describe already exists and behaves exactly as those documents left it\.
- A local Postgres instance you can stop and restart at will, for Step 5's readiness\-failure test\. Do not do this against the shared Supabase instance — stopping a shared database to test one endpoint would take down every other developer's work against it\.
- No new npm dependency is installed by this document \(Section 4\) — everything below uses Node's built\-in crypto module, TypeORM's already\-registered DataSource, and NestJS's built\-in Logger and HTTP primitives\.
- Familiarity with Doc 06's health\.module\.ts/health\.controller\.ts and Doc 04's InternalServiceGuard — this document extends the first and reuses the second without repeating their full code here\.

# __3\. What You're Building__

Six new pieces, plus two markdown reference documents, plus two small additions to already\-existing files \(each clearly marked, the same convention Doc 06 used when it added HealthModule to app\.module\.ts\):

- apps/identity\-verification\-service/src/health/readiness\.controller\.ts — GET /ready, checking real database connectivity at request time via a live query\.
- apps/identity\-verification\-service/src/common/middleware/request\-id\.middleware\.ts — reads or generates a per\-request identifier and echoes it as an X\-Request\-Id response header\.
- apps/identity\-verification\-service/src/metrics/ \(metrics\.service\.ts, metrics\.controller\.ts, metrics\.module\.ts\) — an in\-memory, dependency\-free counter registry and an internal\-only GET /v1/internal/metrics route to read it\.
- apps/identity\-verification\-service/scripts/dev\-check\-metrics\.ts — a diagnostic script proving the counter registry works, the same pattern Doc 07 used for its own not\-yet\-wired mechanisms\.
- apps/identity\-verification\-service/docs/observability/logging\-conventions\.md — this service's logging practice as it already exists \(NestJS's built\-in Logger\), plus a PII\-redaction list specific to this service's own confirmed sensitive fields\.
- apps/identity\-verification\-service/docs/observability/alerting\-readiness\.md — what would need to be decided before real alerting exists, with two other Marketeq services' own tooling cited as illustrative precedent only\.
- Three marked additions: health\.module\.ts \(Doc 06's file\) registers ReadinessController; app\.module\.ts \(Doc 05/06's file\) registers MetricsModule and main\.ts \(Doc 04/05/06's file\) wires in the request\-ID middleware\. All three files are reproduced here in full, exactly as Doc 06 reproduced app\.module\.ts when it added HealthModule\.

# __4\. Engineering Decisions Made in This Document__

None of these are Product, Architecture, or Infrastructure/Security decisions\. Each is the narrowest choice needed to build something real against a scope the Architecture Overview confirms exists but does not specify, and each is labeled here so nothing downstream mistakes it for a confirmed requirement\.

- GET /ready checks only the database, not RabbitMQ\. Two reasons, both from code, not preference: \(1\) the database is this service's one dependency with an already\-established, request\-time\-queryable handle — TypeOrmModule's DataSource, already registered by app\.module\.ts; RabbitMqNotificationEventPublisher \(Doc 05 Step 5\) keeps its connection and channel as private fields with no exposed getter, so checking it would require either adding new public surface to that already\-confirmed class or opening a second, redundant connection purely to test readiness — this document does neither unilaterally\. \(2\) TypeOrmModule\.forRoot\(\) already connects eagerly at bootstrap with no retry option \(Doc 03's data\-source\.ts, Doc 06 Section 7\) — meaning the whole process, /ready included, never finishes starting if the database is unreachable at boot\. /ready's request\-time check therefore only adds value for a database that goes unreachable after a successful boot, which is still a real and useful case, but the reader should not assume /ready is a complete dependency\-health signal\.
- /ready's failure path throws ServiceUnavailableException and relies on AllExceptionsFilter \(Doc 04 Step 6b\) to shape the response, rather than returning a custom body\. Doc 04's filter is @Catch\(\) \(global, catches everything\) and its third branch turns any HttpException that isn't a DomainException or BadRequestException into \{ code: 'REQUEST\_FAILED', message \} at that exception's own status code — so /ready's 503 response is already fully determined by already\-confirmed code\. This document does not add a special case to that filter, and does not invent a different error envelope for this one route\.
- The request\-ID middleware \(Step 2\) is a plain Express\-style function wired directly into main\.ts via app\.use\(\), not a NestJS class\-based middleware requiring app\.module\.ts's configure\(\) method\. This is the narrower change: one new line in main\.ts, no change to how app\.module\.ts wires anything else\. It gives every response an X\-Request\-Id header, but does not propagate that ID into NestJS's built\-in Logger's own output — doing that fully would need either Node's AsyncLocalStorage or a custom LoggerService, which this document does not build \(Section 7\)\. This is a request\-identification foundation, not a complete log\-correlation system\.
- No structured \(JSON\) logging library is introduced\. Every class in Docs 03–07 that logs anything already uses NestJS's own built\-in Logger \(e\.g\. RabbitMqNotificationEventPublisher, Doc 05 Step 5\) — this document continues that existing practice rather than introducing Winston, Pino, or any other library no source names and no prior document in this series installed\.
- The PII\-redaction list in logging\-conventions\.md \(Step 2\) is modeled on auth\-service's own confirmed "Doc 06 – Observability & Health" documentation \(a different Marketeq service's own delivered doc, cited by name\), which states its own rule: never log raw idToken/authorization\-code/access\-token values\. This document adapts that same pattern to this service's own already\-confirmed sensitive fields \(document images, Didit credentials, R2 credentials, DATABASE\_URL, RABBITMQ\_URL\) — it is this document's own recommendation by analogy, not a confirmed cross\-platform policy, and is labeled as such in the file itself\.
- MetricsService \(Step 3\) is an in\-memory Map, not Prometheus, StatsD, Datadog, or any named vendor\. No source confirms a metrics library or format for this service\. content\-moderation\-service's own "Document 21" names Prometheus/Grafana/Sentry/Datadog/CloudWatch for its own service — real, cited by name in Step 4's alerting document as precedent, but not adopted here, because adopting a vendor is an Infrastructure decision this document is not authorized to make\.
- GET /internal/metrics is guarded by InternalServiceGuard \(Doc 04 Step 6\), the same convention as SVC\-20's status endpoint \(Doc 04 Step 8b\) — internal\-only data gets the internal\-only guard, consistent with how this service already treats internal routes, not a new access\-control decision\.
- MetricsService is not called from any of Doc 05's business\-logic methods\. Wiring real counters \(e\.g\. a verification\-attempt count\) into IdentityVerificationService would mean editing that class's already\-confirmed method bodies — out of this document's authority to do unilaterally, the same restraint Doc 07 applied to Doc 05's event publisher\. Step 5's diagnostic script exercises the registry directly instead, the same pattern Doc 07 used for its own unwired mechanisms\.
- Alerting \(Step 4\) produces a reference document, not code\. No source names an alerting tool, threshold, or escalation process for this service or the platform generally — writing code against an undecided vendor would mean inventing that vendor\. content\-moderation\-service's Document 21 and auth\-service's Social Login metrics table are cited by name as illustrative examples of what such a setup looks like elsewhere, never as this service's own contract\.
- No new npm dependency is added\. crypto\.randomUUID\(\) \(Step 2\) is a Node\.js built\-in; the metrics registry \(Step 3\) is a plain in\-memory Map\.

# __5\. Step\-by\-Step Implementation__

Follow these steps in order\. Every code block names the exact file path to create it in, relative to the repository root \(marketeq\-projects\-nestjs/\)\. All paths below start from apps/identity\-verification\-service/ — this folder, and everything Docs 03–07 already built inside it, already exists\.

## __Step 1 — GET /ready__

The Architecture Overview names this route once, as an option: "Optional /ready if dependencies \(DB, queues\) must be up" \(§5\.6\)\. This step builds it, checking exactly one dependency — the database — for the reasons in Section 4\. It reuses HealthController's already\-confirmed shape \(Doc 06 Step 4\) rather than inventing a new one\.

__1a\. The readiness controller__

__WHY THIS CHECKS THE DATABASE ONLY__

Only the database is checked here\. RabbitMQ is deliberately excluded — see Section 4, decision 1, for the full reasoning \(RabbitMqNotificationEventPublisher's connection state is private and it connects lazily, not at bootstrap; inspecting it would mean either changing that already\-confirmed class or opening a redundant second connection, and this document does neither\)\.

__FILE: apps/identity\-verification\-service/src/health/readiness\.controller\.ts__

import \{ Controller, Get, ServiceUnavailableException \} from '@nestjs/common';

import \{ InjectDataSource \} from '@nestjs/typeorm';

import \{ DataSource \} from 'typeorm';

 

// GET /ready — Architecture Overview §5\.6: "Optional /ready if

// dependencies \(DB, queues\) must be up\." This checks the database

// only — see Doc 08 Section 4, decision 1, for why RabbitMQ is not

// checked here\.

//

// Declared with no path prefix, the same way HealthController is

// \(Doc 06 Step 4\), so this resolves to exactly GET /ready — not GET

// /v1/ready\.

@Controller\(\)

export class ReadinessController \{

  constructor\(@InjectDataSource\(\) private readonly dataSource: DataSource\) \{\}

 

  @Get\('ready'\)

  async ready\(\): Promise<\{ status: string \}> \{

    try \{

      // A trivial round\-trip query — enough to prove the connection

      // this process already holds \(TypeOrmModule\.forRoot\(\), Doc 03/

      // Doc 05\) can still reach Postgres\. It proves nothing about

      // RabbitMQ or any other dependency\.

      await this\.dataSource\.query\('SELECT 1'\);

    \} catch \{

      // Deliberately no custom error body here\. Doc 04 Step 6b's

      // AllExceptionsFilter is already registered globally

      // \(app\.useGlobalFilters, main\.ts\) and its third branch — "any

      // other NestJS HttpException" — reshapes this into

      // \{ code: 'REQUEST\_FAILED', message: 'Database is not reachable\.' \}

      // at HTTP 503 automatically\. See Doc 08 Section 4, decision 2\.

      throw new ServiceUnavailableException\('Database is not reachable\.'\);

    \}

    return \{ status: 'ok' \};

  \}

\}

InjectDataSource\(\) and DataSource both come from the packages Doc 03 already installed for TypeORM — this file adds no new dependency\. TypeOrmModule\.forRoot\(identityVerificationDataSourceOptions\) \(Doc 05 Step 12's app\.module\.ts\) already registers a DataSource provider as part of wiring up the database; this controller only requests that existing provider, it does not create a new connection\.

__WHAT /ready DOES NOT COVER — A DATABASE THAT IS DOWN AT BOOT__

Doc 03's data\-source\.ts sets no retryAttempts or lazy\-connection option, and @nestjs/typeorm connects eagerly during Nest's own bootstrap \(Doc 06 Step 4's own callout on HealthController makes the same point about /health\)\. If the database is unreachable when the process starts, the whole application — including this route — never finishes starting, so nothing ever answers GET /ready with a 503; the request simply never reaches a listening server\. This route only adds value for a database that goes down after a successful boot, not before one\. This is a real limitation of the already\-confirmed bootstrap wiring, not something this document introduces or can fix unilaterally — see Section 4, decision 1, and Section 7\.

__1b\. health\.module\.ts \(reproduced, plus the readiness controller\)__

Everything below except the two lines marked "Doc 08 addition" is exactly Doc 06 Step 4's file — reproduced here, not re\-derived, the same way Doc 06 itself reproduced app\.module\.ts when it added HealthModule\. The only change this document makes is registering ReadinessController alongside the existing HealthController\.

__FILE: apps/identity\-verification\-service/src/health/health\.module\.ts__

import \{ Module \} from '@nestjs/common';

import \{ HealthController \} from '\./health\.controller';

import \{ ReadinessController \} from '\./readiness\.controller'; // Doc 08 addition

 

@Module\(\{

  controllers: \[HealthController, ReadinessController\], // Doc 08 addition: ReadinessController

\}\)

export class HealthModule \{\}

__THIS FILE IS REPRODUCED, NOT RE\-DERIVED__

If your working copy of this file differs from what's above outside the two Doc 08 addition lines, trust your working copy — same reasoning Doc 06 gave for main\.ts and app\.module\.ts: it means a later correction to an earlier document changed it after this document was written\.

## __Step 2 — Request\-ID Convention and Logging Conventions__

No confirmed source names a logging library, a log format, or a correlation\-ID scheme for this service \(Architecture Overview §5\.6 says only "Logging guidelines; SLO/alerts if defined" — it does not define them\)\. This step adds one small, real piece of code — a request ID attached to every incoming request — and one reference document describing how to use NestJS's Logger \(already in use since Doc 05\) consistently and safely\. It introduces no new package\.

__2a\. Request\-ID middleware__

__WHY THIS IS A PLAIN FUNCTION, NOT A NESTJS MIDDLEWARE CLASS__

This is a plain function passed to app\.use\(\), not a NestJS class middleware registered through a module's configure\(\) method\. Either approach is valid NestJS; this document picks the plain\-function form because it needs no change to app\.module\.ts — only to main\.ts, which Step 2b already touches for a comment update\. See Section 4, decision 3\.

__FILE: apps/identity\-verification\-service/src/common/middleware/request\-id\.middleware\.ts__

import \{ Request, Response, NextFunction \} from 'express';

import \{ randomUUID \} from 'crypto';

 

// Attaches a request ID to every incoming request: the caller's own

// x\-request\-id header if it sent one, otherwise a freshly generated

// UUID\. Also echoes it back on the response so a caller can match its

// own request to this service's response\.

//

// This does NOT make the request ID appear inside NestJS Logger's own

// output automatically — see the callout after this file, and

// "Correlation" in logging\-conventions\.md \(Step 2c\)\.

export function requestIdMiddleware\(req: Request, res: Response, next: NextFunction\): void \{

  const incoming = req\.headers\['x\-request\-id'\];

  const requestId = typeof incoming === 'string' && incoming\.length > 0 ? incoming : randomUUID\(\);

 

  \(req as Request & \{ requestId: string \}\)\.requestId = requestId;

  res\.setHeader\('x\-request\-id', requestId\);

  next\(\);

\}

__THIS DOES NOT YET CORRELATE INTO LOGGER'S OUTPUT__

req\.requestId is now available to any handler or provider that has access to the raw Express Request object, but nothing in this document wires it into NestJS Logger's own log lines — Logger has no built\-in "current request" context, and adding one \(a request\-scoped provider, or AsyncLocalStorage\) is a larger change than this document makes unilaterally\. This middleware is a foundation — a request ID that exists and is returned to the caller — not full log\-line correlation\. logging\-conventions\.md \(Step 2c\) discloses this directly rather than implying every log line already carries it\.

__2b\. main\.ts \(reproduced, plus the middleware\)__

Everything below except the one line marked "Doc 08 addition" is exactly Doc 06 Step 6's file — reproduced here, not re\-derived, the same way Step 1b reproduced health\.module\.ts\.

__FILE: apps/identity\-verification\-service/src/main\.ts__

import \{ NestFactory \} from '@nestjs/core';

import \{ ValidationPipe \} from '@nestjs/common';

import \{ AppModule \} from '\./app\.module';

import \{ AllExceptionsFilter \} from '\./common/filters/all\-exceptions\.filter';

import \{ requestIdMiddleware \} from '\./common/middleware/request\-id\.middleware'; // Doc 08 addition

 

async function bootstrap\(\) \{

  // \{ rawBody: true \} is the only change to this line from Doc 04\. It

  // makes NestJS attach the original request bytes to req\.rawBody for

  // every request, which the webhook handler \(Doc 05 Step 9\) needs\.

  const app = await NestFactory\.create\(AppModule, \{ rawBody: true \}\);

 

  app\.use\(requestIdMiddleware\); // Doc 08 addition — see Step 2a

 

  // Do NOT call app\.setGlobalPrefix\('v1'\) here — every versioned

  // controller already declares "v1/\.\.\." directly in its own

  // @Controller\(\) path \(Doc 04 Step 9\)\. Adding a global prefix on top

  // would double it into /v1/v1/\.\.\.\. The health route \(Step 4\) is the

  // one confirmed exception and is unaffected either way, since it

  // never had a prefix to double\.

  app\.useGlobalPipes\(

    new ValidationPipe\(\{ whitelist: true, forbidNonWhitelisted: true, transform: true \}\),

  \);

  app\.useGlobalFilters\(new AllExceptionsFilter\(\)\);

 

  await app\.listen\(process\.env\.PORT ?? 3000\);

\}

bootstrap\(\);

__THIS FILE IS REPRODUCED, NOT RE\-DERIVED__

app\.use\(requestIdMiddleware\) is placed before the validation pipe and exception filter so every request — including one that later fails validation or hits the global filter — already has req\.requestId set\. If your working copy of this file differs from what's above outside the one Doc 08 addition line, trust your working copy — same reasoning Doc 06 gave for this file\.

__2c\. Logging conventions reference__

This is a reference document, not code — no source names a required log format, level scheme, or redaction policy, so this document writes down a concrete, followable convention rather than leaving every future log statement to individual judgment\. It is this document's own recommendation \(Section 4, decision 5\), modeled by name on auth\-service's own confirmed "Doc 06 — Observability & Health" logging guidelines, adapted to this service's own confirmed sensitive fields\.

__FILE: apps/identity\-verification\-service/docs/observability/logging\-conventions\.md__

\# Logging Conventions — identity\-verification\-service

 

No confirmed source \(Architecture Overview, Technical Architecture,

Feature List\) names a required logging library, format, or level

scheme for this service\. This document does not introduce one either

— it continues NestJS's built\-in Logger, already used since Doc 05

\(RabbitMqNotificationEventPublisher, TravelModeReminderJob\)\. This file

is guidance for using it consistently, not a new mechanism\.

 

\#\# Levels

 

  \- logger\.error\(\.\.\.\) — an operation failed and could not complete

    \(e\.g\. RabbitMqNotificationEventPublisher's publish failure, Doc

    05 Step 5\)\. Reserve this for things worth paging on if alerting

    is ever wired up \(Step 4\)\.

  \- logger\.warn\(\.\.\.\) — something unexpected happened but the request

    still completed \(e\.g\. a Didit response field this document didn't

    expect, once Didit's real contract is confirmed — Doc 05 Section

    7\)\.

  \- logger\.log\(\.\.\.\) — routine operational events \(e\.g\.

    TravelModeReminderJob's sweep summary, Doc 05 Step 10\)\.

  \- logger\.debug\(\.\.\.\) — verbose detail useful only while developing\.

    Do not enable in production by default \(NestJS's default log

    levels already exclude 'debug' and 'verbose' unless configured

    on — no change made here\)\.

 

\#\# Correlation

 

Every request now carries a request ID \(Step 2a\) — the caller's own

x\-request\-id header, or a generated UUID — echoed back on the

response\. NestJS Logger does not automatically include it in log

lines; there is no request\-scoped context wired up for that today\.

Until that exists, if you need to correlate a specific log statement

with a specific request while debugging, read req\.requestId in the

handler and include it explicitly in that log call, for example:

logger\.log\('\[' \+ req\.requestId \+ '\] Travel duration recorded\.'\)\. This

is a manual, per\-call convention, not automatic — do not assume every

log line already has it\.

 

\#\# What must never be logged

 

Modeled on auth\-service's own confirmed "Doc 06 — Observability &

Health" logging guidelines \(never log raw idToken / authorization\-code

/ access\-token values\), adapted to this service's own confirmed

sensitive fields \(Doc 03 entities, Doc 05 Step 2b/9a\):

 

  \- DIDIT\_API\_KEY and the Authorization: Bearer header built from it

    \(Doc 05 Step 3\)\.

  \- R2\_SECRET\_ACCESS\_KEY \(Doc 05 Step 6\)\.

  \- The Didit webhook signing secret and the raw x\-didit\-signature

    header value \(Doc 05 Step 9a\) — log only whether verification

    passed or failed, never the header or secret itself\.

  \- IdentityDocument\.documentNumber and \.documentNumberNormalized

    \(Doc 03\) — log a document's id \(the row's uuid\) to identify it,

    never the number itself\.

  \- IdentityDocument\.documentImageReference \(Doc 03\) — this is a

    pointer into R2 object storage \(Doc 05 Step 6\); logging it would

    let anyone with log access retrieve the image\. Log the document's

    id instead\.

  \- verification\_attempts\.failure\_code \(Doc 03 §6c\) — vendor\-provided,

    server\-side\-only verification failure data\. Do not log its value\.

    Log the verification attempt's ID instead when an identifier is

    needed\.

  \- Any Authorization header on an incoming request \(the internal

    JWT once auth\-service's real internal\-service auth replaces

    InternalServiceGuard — Doc 04 Step 6, Doc 07 Section 7\)\.

  \- The full DATABASE\_URL connection string \(Doc 03 Step 2, Doc 06

    Step 3\) — it embeds a username and password\. Log the host/database

    name only if a connection\-level log is ever needed, never the full

    string\.

  \- The full RABBITMQ\_URL connection string \(Doc 05 Step 5, Doc 06

    Step 3\) — same reasoning as DATABASE\_URL; it can embed broker

    credentials\.

 

This list is this document's own extension of a pattern borrowed from

auth\-service — it is not a claim that auth\-service's document governs

this service, and it is not a confirmed platform\-wide policy\.

## __Step 3 — Metrics__

Architecture Overview §5\.6 lists "metrics" as part of this document's scope but names no vendor, no format, and no specific measurement\. No other confirmed source for this service names one either\. This step builds a small, dependency\-free metrics registry — real, working code — rather than either inventing a vendor choice or skipping the item\. content\-moderation\-service's own "Document 21: Monitoring & Alerts" names a real tool stack \(Prometheus, Grafana, Sentry, Datadog/CloudWatch\) for that service; it is cited here by name only as illustrative precedent for what a later, real integration could look like — it is not adopted as this service's mechanism \(Section 4, decision 6\)\.

__3a\. The metrics registry__

__FILE: apps/identity\-verification\-service/src/metrics/metrics\.service\.ts__

import \{ Injectable \} from '@nestjs/common';

 

// A minimal, dependency\-free metrics registry — two primitives, each

// keyed by name: counters \(monotonically increasing — "how many times

// did X happen"\) and gauges \(a current value — "how many are true

// right now"\)\. No source names a metrics vendor for this service

// \(Doc 08 Section 4, decision 6\); this is plain in\-memory state, not

// a stand\-in for Prometheus or any other named tool\.

//

// Values reset to zero whenever the process restarts — there is no

// persistence layer here, and none is implied by anything confirmed

// for this service\.

@Injectable\(\)

export class MetricsService \{

  private readonly counters = new Map<string, number>\(\);

  private readonly gauges = new Map<string, number>\(\);

 

  incrementCounter\(name: string, by = 1\): void \{

    this\.counters\.set\(name, \(this\.counters\.get\(name\) ?? 0\) \+ by\);

  \}

 

  setGauge\(name: string, value: number\): void \{

    this\.gauges\.set\(name, value\);

  \}

 

  snapshot\(\): \{ counters: Record<string, number>; gauges: Record<string, number> \} \{

    return \{

      counters: Object\.fromEntries\(this\.counters\),

      gauges: Object\.fromEntries\(this\.gauges\),

    \};

  \}

\}

__3b\. The metrics endpoint__

__WHY THIS ROUTE IS UNDER v1/internal/\.\.\. AND GUARDED__

This route follows the same internal\-route convention SVC\-20 already established for IdentityVerificationInternalController \(Doc 04 Step 8b\): v1/internal/\.\.\. path, InternalServiceGuard applied\. That guard is still the unconditional\-reject placeholder from Doc 04 Step 6 \(Doc 07 Section 7 flags it as unresolved\) — this route inherits that same limitation and does not change it\.

__FILE: apps/identity\-verification\-service/src/metrics/metrics\.controller\.ts__

import \{ Controller, Get, UseGuards \} from '@nestjs/common';

import \{ InternalServiceGuard \} from '\.\./common/guards/internal\-service\.guard';

import \{ MetricsService \} from '\./metrics\.service';

 

@Controller\('v1/internal/metrics'\)

@UseGuards\(InternalServiceGuard\)

export class MetricsController \{

  constructor\(private readonly metrics: MetricsService\) \{\}

 

  @Get\(\)

  getMetrics\(\): \{ counters: Record<string, number>; gauges: Record<string, number> \} \{

    return this\.metrics\.snapshot\(\);

  \}

\}

__FILE: apps/identity\-verification\-service/src/metrics/metrics\.module\.ts__

import \{ Module \} from '@nestjs/common';

import \{ MetricsController \} from '\./metrics\.controller';

import \{ MetricsService \} from '\./metrics\.service';

 

@Module\(\{

  controllers: \[MetricsController\],

  providers: \[MetricsService\],

  exports: \[MetricsService\],

\}\)

export class MetricsModule \{\}

__3c\. app\.module\.ts \(reproduced, plus the metrics module\)__

Everything below except the lines marked "Doc 08 addition" is exactly Doc 06 Step 7's file \(itself Doc 05 Step 12's file plus HealthModule\) — reproduced here, not re\-derived\. The only change this document makes is importing and registering MetricsModule\.

__FILE: apps/identity\-verification\-service/src/app\.module\.ts__

import \{ Module \} from '@nestjs/common';

import \{ TypeOrmModule \} from '@nestjs/typeorm';

import \{ ScheduleModule \} from '@nestjs/schedule';

import \{ identityVerificationDataSourceOptions \} from '\./database/data\-source';

import \{ IdentityVerificationProfile \} from '\./entities/identity\-verification\-profile\.entity';

import \{ IdentityDocument \} from '\./entities/identity\-document\.entity';

import \{ VerificationAttempt \} from '\./entities/verification\-attempt\.entity';

import \{ PendingVerificationSession \} from '\./entities/pending\-verification\-session\.entity';

import \{ IdentityVerificationController \} from '\./controllers/identity\-verification\.controller';

import \{ IdentityVerificationInternalController \} from '\./controllers/identity\-verification\-internal\.controller';

import \{ IdentityVerificationWebhooksController \} from '\./controllers/identity\-verification\-webhooks\.controller';

import \{ IdentityVerificationService \} from '\./services/identity\-verification\.service';

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

import \{ HealthModule \} from '\./health/health\.module'; // Doc 06 addition

import \{ MetricsModule \} from '\./metrics/metrics\.module'; // Doc 08 addition

 

@Module\(\{

  imports: \[

    TypeOrmModule\.forRoot\(identityVerificationDataSourceOptions\),

    TypeOrmModule\.forFeature\(\[

      IdentityVerificationProfile,

      IdentityDocument,

      VerificationAttempt,

      PendingVerificationSession,

    \]\),

    ScheduleModule\.forRoot\(\),

    HealthModule, // Doc 06 addition — see Doc 06 Step 4

    MetricsModule, // Doc 08 addition — see Step 3

  \],

  controllers: \[

    IdentityVerificationController,

    IdentityVerificationInternalController,

    IdentityVerificationWebhooksController,

  \],

  providers: \[

    IdentityVerificationService,

    TravelModeReminderJob,

    \{ provide: DOCUMENT\_VERIFICATION\_PROVIDER, useClass: DiditDocumentVerificationProvider \},

    \{ provide: VPN\_PROXY\_DETECTION\_PROVIDER, useClass: UnimplementedVpnProxyDetectionProvider \},

    \{ provide: OBJECT\_STORAGE\_PROVIDER, useClass: R2ObjectStorageProvider \},

    \{ provide: NOTIFICATION\_EVENT\_PUBLISHER, useClass: RabbitMqNotificationEventPublisher \},

  \],

\}\)

export class AppModule \{\}

__THIS FILE IS REPRODUCED, NOT RE\-DERIVED__

If your working copy of this file differs from what's above outside the marked addition lines, trust your working copy — same reasoning Doc 06 gave the first time this file was reproduced\.

__3d\. What this registry does not yet do__

__NOT WIRED INTO BUSINESS LOGIC — SEE SECTION 7__

MetricsService is not called anywhere in Doc 05's business logic today — no counter increments when a verification attempt is recorded, no gauge tracks pending sessions\. Wiring it in would mean editing IdentityVerificationService and TravelModeReminderJob, files Doc 05 already confirmed; this document does not make that change unilaterally, the same restraint Doc 07 showed toward Doc 05's event publisher \(Section 4, decision 8\)\. Until that follow\-up happens, GET /v1/internal/metrics will report empty counters and gauges even on a fully healthy, actively\-used instance — that is expected, not a bug in the code above\.

__3e\. Diagnostic script — proving the registry works__

Because nothing calls MetricsService yet \(3d\), the only way to see it behave today is to call it directly — the same diagnostic\-script pattern Doc 07 used for RabbitMQ \(Doc 07 Step 2\)\. This script instantiates MetricsService on its own, feeds it synthetic values, and prints a snapshot\. It proves the class's own logic works; it proves nothing about a real request ever reaching it\.

__DIAGNOSTIC TOOLING — BUILD/IMAGE ISOLATION NOT GUARANTEED__

This script lives under scripts/, the same folder Doc 07's diagnostic scripts used, and inherits the exact same caveat Doc 07 Section 7 already flagged for that folder: Doc 06's tsconfig\.json has no include/exclude/rootDir and its \.dockerignore does not exclude scripts/ or docs/, so placement outside src/ does not by itself guarantee this file is excluded from a compiled build or Docker image\. That risk is not re\-solved here — see Doc 07 Section 7 and this document's Section 7\.

__FILE: apps/identity\-verification\-service/scripts/dev\-check\-metrics\.ts__

import \{ MetricsService \} from '\.\./src/metrics/metrics\.service';

 

// Not part of the deployed service's request path — see the callout

// above this file in the document that shipped it \(Doc 08 Step 3e\)\.

// Bypasses HTTP and the \(still\-placeholder\) InternalServiceGuard

// entirely by calling the class directly, the same pattern Doc 07

// used for RabbitMQ verification\.

function main\(\): void \{

  const metrics = new MetricsService\(\);

 

  metrics\.incrementCounter\('dev\_check\_total'\);

  metrics\.incrementCounter\('dev\_check\_total'\);

  metrics\.setGauge\('dev\_check\_last\_run\_epoch\_seconds', Math\.floor\(Date\.now\(\) / 1000\)\);

 

  console\.log\('Synthetic metrics snapshot \(not from a running app instance\):'\);

  console\.log\(JSON\.stringify\(metrics\.snapshot\(\), null, 2\)\);

\}

main\(\);

## __Step 4 — Alerting Readiness__

Architecture Overview §5\.6 lists "alerting" as part of this document's scope \("SLO/alerts if defined"\) but no confirmed source defines one for this service — no tool, no threshold, no on\-call routing\. This step produces a reference document, not code \(Section 4, decision 9\): what a future, real alerting setup could watch, and what is deliberately left open\.

__"ALERTS" IN THE PRODUCT SOURCES MEANS SOMETHING ELSE — DO NOT CONFUSE THE TWO__

The word "alert\(s\)" appears throughout the Product sources \(Feature List FEAT\-37/FEAT\-38, Acceptance Criteria US\-32/US\-33, Epic Overview §5\.11\) but means something unrelated to this step: a user\-facing UI notification card or banner, delivered through the notification\-service RabbitMQ pipeline this service already emits into \(Doc 07\)\. Those sources are not evidence of any confirmed operational/infrastructure alerting requirement, and are not cited below\.

__4a\. The reference document__

__FILE: apps/identity\-verification\-service/docs/observability/alerting\-readiness\.md__

\# Alerting Readiness — identity\-verification\-service

 

\#\# Status: no tool, threshold, or on\-call policy is confirmed

 

No source available to this project \(Architecture Overview, Technical

Architecture, Feature List, Acceptance Criteria\) names an alerting

tool, an error\-rate or latency threshold, or an on\-call routing policy

for this service\. This document does not choose one\. What follows is

candidate signals and illustrative precedent only — nothing below is

a requirement\.

 

\#\# What this service can already expose to a future alerting system

 

  \- GET /ready \(Step 1\) — a binary signal: the database is reachable

    right now, from this process's point of view\. Its own limitation

    \(only meaningful after a successful boot, not before — Step 1\)

    would apply to any alerting rule built on it too\.

  \- GET /v1/internal/metrics \(Step 3\) — an in\-memory counters/gauges

    snapshot, guarded by InternalServiceGuard \(still a placeholder,

    Doc 04 Step 6\)\. Nothing in this service pushes these values to an

    external system today; a real alerting pipeline would need

    something to poll or scrape this endpoint \(or a proper exporter\)

    — not built here\.

  \- Existing logger\.error\(\.\.\.\) call sites \(Doc 05\) — currently

    RabbitMqNotificationEventPublisher's publish failure \(Doc 05 Step

    5\) is the only one\. A log\-based alerting tool could watch for

    these today without any code change; a metrics\-based one would

    need Section 7's follow\-up \(wiring MetricsService into that same

    call site\) first\.

 

\#\# Candidate signals, if a real tool is chosen later

 

These are suggestions for what to watch, not confirmed thresholds —

modeled on the shape of auth\-service's own confirmed "Key Metrics to

Monitor" table \(named metric, named condition\), not its actual

metrics, which are specific to social login:

 

  \- Repeated GET /ready failures over a short window — candidate

    signal for "the database this instance depends on may be down\."

  \- A rising rate of INVALID\_SIGNATURE responses \(Doc 05 Step 9a\) —

    candidate signal for "either Didit's signing key rotated

    unexpectedly, or something is sending forged webhook traffic\."

  \- A rising rate of RabbitMqNotificationEventPublisher publish

    failures \(Doc 05 Step 5's logger\.error call\) — candidate signal

    for "notification\-service or the broker may be unreachable\."

  \- Once Section 7's follow\-up wires MetricsService into Doc 05's

    business logic: a rising verification\-attempt failure rate,

    analogous to auth\-service's own social\_login\_failure\_total metric

    and its "rate > 5% over 5 min" condition — the specific metric

    name, threshold, and window here are illustrative, not proposed

    for adoption verbatim\.

 

\#\# Illustrative tooling precedent — not adopted here

 

content\-moderation\-service's own confirmed "Document 21: Monitoring &

Alerts" names a real tool stack for that service: Prometheus for

collecting metrics, Grafana for visualizing them, Sentry for error

tracking, and Datadog/CloudWatch for general system health\. This is

cited here only to show what a real, working setup looks like

elsewhere on the platform — it is not this service's chosen stack,

and nothing in this document installs or configures any of it\.

 

\#\# Open questions this document does not resolve

 

  \- Which tool \(if any\) the platform standardizes on for metrics

    collection, log aggregation, and error tracking\.

  \- Concrete thresholds and evaluation windows for any of the

    candidate signals above\.

  \- On\-call routing and escalation policy\.

  \- Whether /ready and /v1/internal/metrics get scraped/polled by a

    real system, and how often\.

  \- The one currently\-wired IDENTITY\_VERIFIED publisher sets

    userId to a Didit vendor session ID, not the profile's

    real user ID \(Doc 05 Section 7, Doc 07 Section 7 — an

    Engineering blocker, not yet fixed\)\. No future event\-based

    metric or alert should rely on IDENTITY\_VERIFIED\.userId

    until Engineering corrects and verifies the publisher\.

 

These remain unresolved dependencies, not implementation gaps in this

document — see Section 7\.

## __Step 5 — Verify__

This step exercises everything Steps 1–3 built against a running process: /ready succeeding, /ready failing when the database genuinely goes away, the request\-ID header, and the metrics registry\. Step 4 produced a reference document, not runtime behavior, so nothing to run there\.

__USE A LOCAL DATABASE FOR THIS STEP — NOT SHARED SUPABASE__

This step needs a local Postgres instance you can stop and restart \(Section 2\) — not the shared Supabase instance\. Point DATABASE\_URL at that local instance only for this step, then restore your working DATABASE\_URL from Doc 03/Doc 06 afterward \(5g\)\.

__5a\. Start the service against a local database__

__Run from: apps/identity\-verification\-service/__

DATABASE\_URL="postgresql://<user>:<password>@localhost:5432/<local\-db>" npm run start:dev

Expected: the same NestJS startup log Doc 06 Step 8b showed, now also listing /ready and /v1/internal/metrics among the mapped routes\. If the process never finishes starting, confirm the local Postgres instance is actually running and reachable at that URL first — Step 1's callout on eager connection applies here too\.

__5b\. Confirm /ready succeeds__

__Run from a second terminal__

curl \-i http://localhost:3000/ready

Expected: HTTP 200, body \{"status":"ok"\}, and an x\-request\-id response header carrying a generated UUID \(Step 2a\) — confirming the middleware runs on this route the same as any other\.

__5c\. Confirm the request ID round\-trips a caller's own value__

curl \-i \-H "x\-request\-id: dev\-test\-123" http://localhost:3000/ready

Expected: the same 200 response, but the x\-request\-id response header now reads back dev\-test\-123 exactly — confirming the middleware prefers a caller\-supplied ID over generating its own \(Step 2a\)\.

__5d\. Simulate a database failure__

Stop the local Postgres instance you pointed DATABASE\_URL at in 5a \(leave the NestJS process from 5a running — do not restart it\)\.

curl \-i http://localhost:3000/ready

HTTP/1\.1 503 Service Unavailable

\.\.\.

\{"code":"REQUEST\_FAILED","message":"Database is not reachable\."\}

This is AllExceptionsFilter's branch 3 \(Doc 04 Step 6b\) reshaping the ServiceUnavailableException thrown in Step 1a — exactly the envelope Section 4, decision 2 described, not a custom body this document wrote by hand\. Restart the local Postgres instance now\.

curl \-i http://localhost:3000/ready

Expected: HTTP 200 \{"status":"ok"\} again, without restarting the NestJS process itself\. This is this document's own engineering expectation of node\-postgres's default connection\-pool behavior \(the driver underneath TypeORM here\) — that it opens a fresh connection on the next query after an old one errors out — not a behavior Doc 03 configured, and not something any Marketeq source confirms\. If it does not recover within a few seconds, restart the NestJS process itself and repeat 5b\.

__5e\. Run the metrics diagnostic script__

__Run from: apps/identity\-verification\-service/__

npx ts\-node scripts/dev\-check\-metrics\.ts

Expected: "Synthetic metrics snapshot \(not from a running app instance\):" followed by JSON showing dev\_check\_total: 2 and a dev\_check\_last\_run\_epoch\_seconds gauge — confirming MetricsService's own logic works\. This script does not talk to the running process from 5a at all \(Step 3e\); it is a separate, standalone run\.

__5f\. Confirm the metrics endpoint is guarded the same as any other internal route__

curl \-i http://localhost:3000/v1/internal/metrics

HTTP/1\.1 401 Unauthorized

\.\.\.

\{"code":"REQUEST\_FAILED","message":"InternalServiceGuard is a placeholder — replace with the platform's real internal\-service auth before use\."\}

This confirms MetricsController inherited InternalServiceGuard correctly — the same unconditional rejection Doc 07 Step 4a already documented for the other internal route, not a new or different failure mode\.

__5g\. Restore your working database connection__

Stop the process from 5a \(Ctrl\+C\) and restart the service the normal way — against your real working DATABASE\_URL from Doc 03/Doc 06, not the local instance used only for 5d\.

__WHAT THIS STEP DOES AND DOES NOT PROVE__

This step proves: /ready reflects the real, current reachability of the database from this process, using the confirmed error envelope, and does so without needing a process restart to recover; the request\-ID middleware runs ahead of every route and both generates and echoes IDs correctly; and MetricsService's own primitives work and MetricsController inherits the same guard every other internal route uses\. It does NOT prove RabbitMQ readiness \(deliberately out of scope, Section 4\), does NOT prove any log line actually carries a request ID \(Step 2a's disclosed limitation\), does NOT prove metrics ever populate from real traffic \(Section 7\), and does NOT prove or resolve anything about real internal\-service authentication \(unchanged placeholder, Doc 04/Doc 07\)\.

# __6\. New Files Added by This Document__

This document does not repeat Docs 03–07's complete, cumulative file manifest \(Doc 07 Section 6 covers every file through Doc 07\)\. It only adds the files below\. health\.module\.ts, app\.module\.ts, and main\.ts are modified, not new — see Steps 1b, 2b, and 3c for their reproduced, marked contents\.

__File__

__Built By__

__Notes__

src/health/readiness\.controller\.ts

Doc 08, Step 1a

GET /ready\. Checks the database only — see Section 7\.

src/common/middleware/request\-id\.middleware\.ts

Doc 08, Step 2a

Attaches/echoes x\-request\-id\. Does not propagate into Logger output — see Section 7\.

docs/observability/logging\-conventions\.md

Doc 08, Step 2c

Reference documentation, not compiled code\.

src/metrics/metrics\.service\.ts

Doc 08, Step 3a

In\-memory counters/gauges\. Not wired into Doc 05's business logic — see Section 7\.

src/metrics/metrics\.controller\.ts

Doc 08, Step 3b

GET /v1/internal/metrics, guarded by InternalServiceGuard\.

src/metrics/metrics\.module\.ts

Doc 08, Step 3b

Registers the two files above\.

scripts/dev\-check\-metrics\.ts

Doc 08, Step 3e

Diagnostic only — outside src/\. Build/image exclusion not guaranteed, see Section 7\.

docs/observability/alerting\-readiness\.md

Doc 08, Step 4a

Reference documentation, not compiled code\. No tool/threshold adopted\.

# __7\. Pending Confirmations Carried Into This Document__

Step 5 above passes today with a local Postgres instance and no other new infrastructure\. None of the items below block that — each is a place where this document documented a gap instead of guessing a Product, Architecture, or vendor answer\.

- This document's diagnostic script \(scripts/dev\-check\-metrics\.ts, Step 3e\) inherits the exact build\-isolation risk Doc 07 Section 7 already flagged for its own two diagnostic scripts: Doc 06's tsconfig\.json sets no include, exclude, or rootDir, and Doc 06's \.dockerignore does not exclude scripts/ or docs/\. That risk is not re\-solved here and is not made worse by this document in any new way — it simply applies to one more file now\. A fix belongs in a Doc 06 sync, not in this document \(Step 3e\)\.
- GET /ready deliberately checks only the database, not RabbitMQ \(Step 1a, Section 4 decision 1\) — RabbitMqNotificationEventPublisher \(Doc 05 Step 5\) keeps its connection and channel as private fields with no exposed getter and connects lazily on first publish, not at bootstrap\. Checking it would require either adding public surface to that already\-confirmed class or opening a redundant second connection; this document does neither unilaterally\.
- GET /ready only adds value for a database that fails after a successful boot — Doc 03's data\-source\.ts sets no retryAttempts or lazy\-connection option, and @nestjs/typeorm's default eager\-connect\-at\-bootstrap behavior means the whole process never finishes starting if the database is unreachable at boot \(Step 1, callout\)\. This is an existing limitation in Doc 03/Doc 05's already\-confirmed wiring, not something this document introduces or resolves\.
- The request\-ID middleware \(Step 2a\) attaches and echoes an ID but does not make it appear inside NestJS Logger's own output — there is no request\-scoped logging context wired up\. Real log\-line correlation would need a larger change \(a request\-scoped provider, or AsyncLocalStorage\) that this document does not make\.
- The logging\-conventions\.md PII\-redaction list \(Step 2c\) is this document's own extension of a pattern borrowed from auth\-service's confirmed "Doc 06 — Observability & Health" section, adapted to this service's own confirmed sensitive fields\. It is not a confirmed platform\-wide logging policy, and no source requires this service to follow auth\-service's convention\.
- MetricsService \(Step 3a\) is not called anywhere in Doc 05's business logic — no verification attempt, webhook outcome, or reminder sweep increments a counter today\. Wiring it in would mean editing IdentityVerificationService and TravelModeReminderJob, already\-confirmed Doc 05 files; this document does not make that change unilaterally, the same restraint Doc 07 showed toward Doc 05's event publisher\.
- No mechanism exists for anything to actually collect GET /v1/internal/metrics's snapshot on a schedule — no scraper, poller, or exporter is built here\. A real metrics pipeline would need one, and would need a name for the vendor or format it targets \(Section 4 decision 6, Step 4a\)\.
- No alerting tool, threshold, evaluation window, or on\-call routing policy is confirmed for this service \(Step 4a\)\. alerting\-readiness\.md names candidate signals only — none are adopted requirements\.
- Both of Doc 04's guards \(BearerAuthGuard, InternalServiceGuard\) still always reject, unchanged by this document — MetricsController \(Step 3b\) inherits this exact limitation, confirmed directly in Step 5f\. This remains the single most important piece of unfinished work across this document series \(Doc 04 Section 9, Doc 05 Section 7, Doc 06 Section 7/8, Doc 07 Section 7\)\.
- This document does not monitor this service's own business\-outcome state — the nine\-value identity\-verification status model \(Doc 03\), duplicate\-document detection, verification\-attempt/rate\-limit behavior, or document expiry and the EXPIRED transition \(Doc 05/06 Section 7 — all three remain unresolved dependencies, not something this document assumes an answer to\)\. \[Superseded, 18 September 2026: of these, only the attempt\-count scope is resolved — confirmed account\-wide \(profile\_id alone\), per Christopher's Answer 3 and TRVG2 §2's gate\-table note\. Rate\-limit implementation \(O9\) and the EXPIRED\-transition scheduler \(O8\) remain genuinely open, unaffected by this correction\.\] MetricsService \(Step 3a\) is a generic, unwired counter/gauge registry only; no metric, dashboard, alert, or threshold exists for any of these areas today \(Section 1\)\.
- The one currently\-wired IDENTITY\_VERIFIED publish call site \(handleDiditWebhook, Doc 05 Step 11\) sets userId to a Didit vendor session ID, not the profile's real user ID \(Doc 05 Section 7, Doc 07 Section 7 — an Engineering blocker, not yet fixed\)\. This document does not change the publisher, build any event\-based monitoring, or claim the bug is fixed — alerting\-readiness\.md \(Step 4a\) now flags that no future event\-based metric or alert should rely on IDENTITY\_VERIFIED\.userId until Engineering corrects and verifies it\.

# __8\. What's Next__

- Decide on and apply a fix for the build\-isolation risk Doc 07 first flagged and this document's own diagnostic script now also depends on \(tsconfig\.json include/rootDir, or \.dockerignore exclusions\) — a Doc 06 sync, not a change either document makes unilaterally\.
- Wire MetricsService into Doc 05's business logic once it is decided which counters and gauges actually matter \(verification attempt outcomes, webhook signature failures, reminder sweep results are the most obvious candidates — Section 7, Step 4a's candidate\-signal list\)\.
- Choose a real metrics/alerting tool \(or confirm none is planned\) and, if one is chosen, build the exporter or scraper that would actually collect GET /v1/internal/metrics's data and evaluate the candidate signals in alerting\-readiness\.md against real thresholds\.
- Replace both of Doc 04's auth guards with real authentication — still the single most important piece of unfinished work across this document series, and now also gating the new metrics endpoint \(Step 3b/5f\)\.
- If end\-to\-end log correlation becomes a real requirement, decide how request IDs should propagate into Logger's actual output \(a request\-scoped provider or AsyncLocalStorage\) — not attempted by this document's plain\-function middleware \(Step 2a\)\.
- Once this document is accepted, update the Required Docs Checklist to mark Doc 08 complete, and begin Doc 09 — Error Handling per the locked numbering\.

