__11 — IDENTITY VERIFICATION PERFORMANCE CONSIDERATIONS__

*Expected Load, Query/Index Performance Notes, Caching — identity\-verification\-service*

__Epic: __Identity Verification

__Document Role: __Restates what is and is not known about this service's expected load, restates Doc 03's complete index inventory against the query patterns Doc 05/06/07 actually built, adds two narrowly\-scoped, purely\-additive database indexes to close two real, independently\-confirmed indexing gaps, and confirms — rather than assumes — that no caching layer exists anywhere in this service today\. Documents, rather than invents, every load figure, capacity limit, and caching decision no source has made\.

__Prerequisites: __Doc 03 — Data Model & Database Schema, Doc 04 — API Specification, Doc 05 — Business Logic & Workflows, Doc 06 — Setup & Bootstrapping, Doc 07 — Integrations & Events, Doc 08 — Monitoring & Observability, Doc 09 — Error Handling, Doc 10 — Security & Auth \(all built, smoke\-tested, and complete — built and smoke\-tested does not mean every code path is production\-ready; see Docs 05, 06, 07, 08, 09, and 10's own Section 7 for their unresolved implementation dependencies\), Marketeq Core Backend Technical Architecture Overview & Documentation Standards

__Author: __CTO — written for a developer building this microservice for the first time

__Status: __Final — ready to implement

__Date: __2 September 2026

__UPDATE — 16 SEPTEMBER 2026__

Applies Findings 1, 2, 3, 4, and 6 from the Document 11 impact report \(16 Sep 2026\) as documentation corrections, and Finding 5 as an approval\-status disclosure only\. Step 2a's idx\_identity\_documents\_fingerprint row and the query\-index\-notes\.md file it restates now disclose that TRVG2 §1\.6 \[Citation corrected 21 September 2026; formerly cited as TRVG §1\.3\] and revised Doc 03 §6b/§8a require document\_number\_normalized to be a one\-way hash, while the current code \(Doc 05 Step 11\) is only a plaintext trim\+uppercase placeholder, not production\-safe; the hash algorithm and whether issuing\_country/document\_type join the hash input remain a Security/Engineering decision, and this index's own composition may need reassessment once that decision is made — no algorithm chosen, no index or schema changed\. Step 2a's idx\_identity\_documents\_profile\_id row now discloses that GET \.\.\./documents has no pagination and Doc 05's submitDocument always inserts a new row, so a profile's document count and this endpoint's response size can grow without bound — no row count, latency, or incident is claimed, and no pagination is added\. Step 1b's RabbitMQ event\-publish bullet now discloses the known IDENTITY\_VERIFIED\.userId gap \(Doc 05/07/10\) — that field should not be treated as reliably identifying the verified account; no publisher, event schema, or RabbitMQ configuration is changed\. The Prerequisites line now notes that built and smoke\-tested does not mean production\-ready, per Docs 05–10's own Section 7\. A new callout adjacent to Step 2d discloses that this document's migration being included here does not itself authorize running it against a shared or production\-like database — Engineering/Christopher must confirm that separately; the migration code itself is unchanged, and this document does not execute it or claim it is approved for deployment\. Step 2a's index inventory gains a fourteenth row for pk\_pending\_verification\_sessions, and the inventory count is corrected from thirteen to fourteen everywhere it is stated as complete; no index definition was modified and no additional migration was created\. Section 7 gains matching open items for the hash\-algorithm decision, the unbounded document\-list response, and the migration's execution\-approval dependency\. All other findings, open items, and unresolved decisions carried by this document are unchanged\.

__UPDATE — 21 SEPTEMBER 2026__

Update — 21 September 2026 \(SOP B compliance review, Doc 11 pass\): two additive items; nothing above is altered\. Step 2a’s idx\_identity\_documents\_fingerprint row, the duplicate\-detection match\-query discussion, and the query\-index\-notes\.md reference file are updated to reflect the five\-question technical resolution \(Q2\): HMAC\-SHA\-256, keyed with a KMS\-held pepper, computed over the normalized document number only, is the selected design — an engineering decision made under Christopher's SOP guidance, still not implemented\. Because issuing\_country/document\_type do not join the hash input, this index’s composition does not need reassessment on that account; no index or schema is changed\. Three instances of “TRVG §1\.3” are corrected to “TRVG2 §1\.6”, verified directly against TRVG2’s text\.

# __1\. Purpose & Scope__

No source available to this project — not the Architecture Overview, not the Epic Overview, not Docs 00–10 — states an expected request volume, a concurrent\-user target, a database size projection, or a latency SLA for identity\-verification\-service\. This document does not invent one\. What it can do, and does, is restate the query patterns Docs 03–07 already built, check each one against Doc 03's own index inventory, and close the two gaps that check actually finds — both confirmed by reading the migration and the code that queries against it, not assumed\. It also confirms, by checking every source of a caching layer this service could have \(npm dependencies, environment variables, module wiring\), that none exists today, rather than asserting that as a default\.

This document does NOT cover: a capacity plan, a load\-testing result, a horizontal\-scaling policy, or a database connection\-pool tuning recommendation \(no source provides a baseline to tune against — Section 7\); a caching implementation of any kind \(none exists, and this document does not add one — Step 3\); Doc 08's metrics/alerting mechanism, already fully covered by Doc 08 \(this document points to it as the future source of real load data, it does not re\-describe or extend it\); or any change to Doc 03's already\-delivered CreateIdentityVerificationSchema migration or Doc 05's already\-delivered CreatePendingVerificationSessions migration — this document's own migration is additive only, exactly like Doc 05's before it\.

__WHY THIS DOCUMENT EXISTS AS ITS OWN NUMBER, WITH THIS SCOPE__

The Architecture Overview's per\-service documentation template does not name a "Performance Considerations" section anywhere in §5 — its closest generic counterpart is §5\.5's "Integrations & Data Flow" template, which lists "Cache policies \(Redis keys & TTL\)" as one of several generic bullet points, not a requirement that every service caches something\. This document exists as number 11, with exactly this scope, because the Required Docs Checklist currently in effect for this project locks it there: 11 — Performance Considerations, "Expected load, query/index performance notes, caching \(if any\)\." The checklist's own parenthetical — "\(if any\)" — already anticipates that this service may have no caching to describe, which Step 3 below confirms is the case\.

__HOW THIS DOCUMENT RELATES TO ITS SOURCES__

Every claim in this document traces to one of: \(a\) Docs 03–10's own already\-built and delivered code, referenced exactly, including newly\-surfaced findings about that code's actual current indexing and connection behavior \(Section 4\); \(b\) the Architecture Overview's generic §5\.5 template heading and its confirmed, different\-service fact about pricing\-service's own Redis cache \(§6\) — cited only to distinguish this service from that one, not to imply this service shares it; \(c\) an engineering decision this document makes on its own narrow authority — specifically, the two new indexes in Step 2 — labeled as such and never presented as a Product, Architecture, or Infrastructure decision; or \(d\) an explicitly\-flagged unresolved dependency — most centrally, that no source anywhere defines an expected load figure — carried forward rather than invented an answer for \(Section 7\)\.

# __2\. Prerequisites__

- Docs 03–10 are complete: the service installs, builds, starts, serves every route, guard, provider, job, and event mechanism, and serves /health, /ready, and /v1/internal/metrics exactly as those documents left them\.
- One new npm dependency is not required by this document — the new migration \(Step 2\) uses the same typeorm CLI and QueryRunner API Doc 03's and Doc 05's migrations already use, and the new diagnostic script \(Step 2\) uses the same TypeORM DataSource Doc 03's own diagnostic pattern already established\.
- Familiarity with Doc 03's identity\_verification\_profiles, identity\_documents, verification\_attempts, and pending\_verification\_sessions entities and their existing indexes \(Doc 03 Section 9\), and with Doc 05's duplicate\-detection transaction, ceiling\-check queries, and TravelModeReminderJob — this document restates and extends that code, it does not repeat its full listing here\.

# __3\. What You're Building__

Five new files: one purely\-additive database migration, one diagnostic script, and three reference documents\. Nothing wires into the running request path beyond the two new indexes themselves, and nothing already\-confirmed changes:

- apps/identity\-verification\-service/src/database/migrations/1756915200000\-AddPerformanceIndexes\.ts — a new, additive\-only TypeORM migration adding two composite indexes: pending\_verification\_sessions\(profile\_id, document\_id\) and identity\_verification\_profiles\(travel\_mode\_active, next\_travel\_reminder\_at\)\. Does not alter any table, column, or existing index Doc 03's or Doc 05's migrations created\.
- apps/identity\-verification\-service/scripts/dev\-explain\-hot\-queries\.ts — a diagnostic script that runs EXPLAIN against the two query patterns the new indexes target, proving Postgres actually chooses to use them\.
- apps/identity\-verification\-service/docs/performance/query\-index\-notes\.md — Doc 03's complete index inventory restated against the query patterns that actually use each one, plus this document's own reasoning for the two new indexes and for the one additional index it considered and declined to add\.
- apps/identity\-verification\-service/docs/performance/expected\-load\-and\-scaling\.md — restates, in one place, that no source defines an expected load figure, a connection\-pool size, or a horizontal\-scaling policy for this service, and points to Doc 08's metrics scaffold as the future source of real data\.
- apps/identity\-verification\-service/docs/performance/caching\-posture\.md — confirms no caching layer exists anywhere in this service today, distinguishes this from pricing\-service's own confirmed Redis cache, and discusses, for consideration only, what a future cache candidate might look like\.

# __4\. Engineering Decisions Made in This Document__

None of these are Product, Architecture, or Infrastructure decisions\. Two are newly\-surfaced findings about already\-confirmed code's actual current indexing, documented rather than silently fixed elsewhere; one is a narrowly\-scoped, additive schema change this document makes on its own engineering authority; the rest are explicitly labeled non\-binding discussion\.

- New finding, and the reason Step 2's migration exists: pending\_verification\_sessions \(Doc 05's own migration, 1756828800000\-CreatePendingVerificationSessions\.ts\) has exactly one index — a unique index on vendor\_session\_id — and no index at all on profile\_id or document\_id, despite Doc 05's ceiling\-check query filtering on both columns together before every new verification attempt\. This document adds a composite index on \(profile\_id, document\_id\) to close that gap\. It does not touch vendor\_session\_id's existing unique index\.
- New finding, and the second reason Step 2's migration exists: identity\_verification\_profiles \(Doc 03's own migration\) has no index on travel\_mode\_active or next\_travel\_reminder\_at, despite Doc 05's TravelModeReminderJob\.runDailySweep\(\) querying both columns together, once a day, for every profile in the table, with no LIMIT or batch size\. This document adds a composite index on \(travel\_mode\_active, next\_travel\_reminder\_at\) to close that gap\.
- Engineering decision, on this document's own narrow authority: a third possible composite index, on verification\_attempts\(profile\_id, document\_id\), is considered in Step 2 and deliberately not added\. Doc 03 Section 9 already indexes both columns individually \(idx\_verification\_attempts\_profile\_id, idx\_verification\_attempts\_document\_id\); Postgres can combine two single\-column B\-tree indexes with a bitmap AND at query time, and no confirmed query pattern filters on that pair often enough, or at a scale no source has defined, to justify the write\-amplification cost of a third index this document cannot show is needed\. This is a labeled engineering judgment call, not a finding of a confirmed gap\. \[Superseded, 18 September 2026: this rationale was built on Step 2b's pre\-correction per\-document code example\. The ceiling\-check count is now account\-wide \(profileId alone, per Christopher's Answer 3 / TRVG2 §2 gate\-table note\), so it no longer filters on both profile\_id and document\_id together at all; the bitmap\-AND combination described above no longer applies to that query\. Whether a composite or partial index on verification\_attempts is warranted for any other confirmed query pattern is not addressed here\.\]
- Both new indexes are added via a new, purely\-additive migration file, never by editing Doc 03's or Doc 05's already\-delivered migrations — the exact convention Doc 05's own CreatePendingVerificationSessions migration already established for itself relative to Doc 03's\.
- Step 3's discussion of a hypothetical future cache candidate \(e\.g\., GET /me\) is offered for consideration only\. This document does not implement a cache, does not add a caching dependency, and does not name Redis or any other product as this service's choice — consistent with the checklist's own "\(if any\)" framing of this topic\.
- No new npm dependency is introduced\. The new migration and diagnostic script use only the typeorm and pg packages Doc 03 already installed\.

# __5\. Step\-by\-Step Implementation__

Follow these steps in order\. Every code block names the exact file path to create it in, relative to the repository root \(marketeq\-projects\-nestjs/\)\. All paths below start from apps/identity\-verification\-service/ — this folder, and everything Docs 03–10 already built inside it, already exists\.

## __Step 1 — Expected Load__

This step restates, plainly and in one place, what is and is not known about how much traffic this service will see\. It does not estimate a number to fill the gap — the same restraint Doc 09's retry\-and\-failure\-semantics\.md already exercised for retry policy, and Doc 10's Step 3 already exercised for encryption/KMS\.

__1a\. No source defines an expected load figure__

__NOT CONFIRMED BY ANY SOURCE__

No source available to this project — the Architecture Overview, the Epic Overview, the Identity Verification Service Overview \(Doc 00\), the Technical Architecture \(Doc 01\), the Feature List \(Doc 02\), or Docs 03–10 — states an expected requests\-per\-second figure, a concurrent\-user target, a peak\-vs\-average traffic ratio, a database row\-count projection, or a latency SLA \(p50/p95/p99\) for identity\-verification\-service, for any of its routes, or for its background jobs\.

This document does not fill that gap with an estimate\. An invented number would read as a confirmed target to a developer building against this document, and no source supports one at any scale — small pilot, single enterprise customer, or platform\-wide rollout\.

__1b\. What is confirmed instead: how the service behaves under whatever load it gets__

- TypeOrmModule\.forRoot\(\) connects to Postgres eagerly at application bootstrap, with no retryAttempts or lazy\-connection option set anywhere in Doc 03's data\-source\.ts \(Doc 06 Section 4/8\) — confirmed by reading that file directly: it sets only type, url, schema, entities, migrations, and synchronize: false, plus logging\. There is no pool size configured either, so the service runs on whatever default TypeORM's underlying pg driver applies\. No source states what that default is tuned for, or whether it is adequate at any particular request volume\.
- /health itself fails to start if the database is unreachable at boot \(Doc 06 Section 7/8\) — this is existing, confirmed behavior, not something this document changes\. It means database availability, not just query performance, is a hard dependency for this service to serve any traffic at all\.
- The Didit vendor call inside the verification\-attempt flow \(Doc 05 Step 3/13, Doc 07, Doc 09 Section 4\) is awaited synchronously, with no timeout, no retry loop, and no circuit breaker \(Doc 09's exact finding, unchanged by this document\)\. Under load, a slow or unresponsive Didit response holds open whatever request\-handling resource NestJS's underlying HTTP server allocates to that request for as long as Didit takes to respond — there is no confirmed upper bound on that duration\.
- The RabbitMQ event publish after a successful verification \(Doc 07\) is awaited, but a publish failure is caught and logged rather than failing the request \(Doc 07's confirmed failure\-isolation behavior\) — so a broker slowdown does not itself block the HTTP response path, only the event side\-effect\. Separately, and unrelated to that timing behavior: the currently\-wired IDENTITY\_VERIFIED publisher sets userId to the Didit vendor session ID rather than the profile's real user ID \(Doc 05 Step 11, Doc 07's Event Catalog, Doc 10 Section 7\) — a known, unresolved gap this document does not fix\. That field should not be treated as reliably identifying the verified account until the publisher is corrected\.

__1c\. Where real load data will eventually come from__

Doc 08 built MetricsService — an in\-memory counter/gauge registry exposed at GET /v1/internal/metrics — but, as Doc 08 itself already states, "MetricsService is not called anywhere in Doc 05's business logic today — no counter increments when a verification attempt is recorded, no gauge tracks pending sessions\.\.\. GET /v1/internal/metrics will report empty counters and gauges even on a fully healthy, actively\-used instance — that is expected, not a bug in the code above\." This document does not wire any new counter or gauge into Doc 05's business logic — doing so is already Doc 08's own flagged pending item \(Doc 08 Section 7\), not a gap this document introduces or an action within this document's scope to take\. Once that wiring happens, GET /v1/internal/metrics becomes the confirmed mechanism for observing this service's real request volume and job\-run counts — not a number this document can substitute for it today\.

__1d\. Reference document — this step's findings restated in one place__

__FILE: apps/identity\-verification\-service/docs/performance/expected\-load\-and\-scaling\.md__

\# Expected Load & Scaling — identity\-verification\-service

 

No source available to this project defines an expected load figure

for this service\. This file restates that fact, together with what is

confirmed instead: how the service behaves under whatever load it

gets, and where real load data will eventually come from\.

 

\#\# Not confirmed by any source \(Doc 11 Step 1a\)

 

  \- Requests\-per\-second, concurrent\-user target, or peak\-vs\-average

    traffic ratio\.

  \- Database row\-count projection at any time horizon\.

  \- Latency SLA \(p50/p95/p99\) for any route or background job\.

  \- Connection\-pool size, retry/lazy\-connection option, container

    CPU/memory limit, or replica count\.

 

\#\# Confirmed instead: how the service behaves under load \(Step 1b\)

 

  \- TypeOrmModule\.forRoot\(\) connects eagerly at bootstrap with no pool

    size, retryAttempts, or lazy\-connection option set \(Doc 03's

    data\-source\.ts, restated Doc 06 Section 4/8\)\. /health itself fails

    to start if the database is unreachable\.

  \- The Didit vendor call is awaited synchronously with no timeout, no

    retry loop, and no circuit breaker \(Doc 09's confirmed finding\)\.

  \- The RabbitMQ event publish is awaited but failure\-isolated — a

    broker slowdown does not block the HTTP response path \(Doc 07\)\.

 

\#\# Where real data will come from \(Step 1c\)

 

  \- Doc 08's MetricsService, once wired into Doc 05's business logic

    \(Doc 08's own already\-flagged pending item — not done by this

    document\), will make GET /v1/internal/metrics the confirmed source

    of real request\-volume and job\-run counts\.

 

\#\# What this document does not do

 

  \- It does not estimate or invent an expected load figure\.

  \- It does not configure a connection\-pool size\.

  \- It does not wire Doc 08's MetricsService into Doc 05's business

    logic\.

  \- It does not set a container resource limit or replica count\.

## __Step 2 — Query/Index Performance Notes__

Doc 03 Section 9 already built a complete index inventory for this service's three original tables, and Doc 05's own migration added one more index for the table it introduced\. This step restates all fourteen, checked one by one against the actual query patterns Docs 05–07 built against them, and adds two new indexes to close the two real gaps that check finds\. It does not touch any index, table, or column Doc 03's or Doc 05's migrations already created\.

__2a\. Doc 03's and Doc 05's complete index inventory, checked against real query patterns__

__Table__

__Index__

__Columns__

__Confirmed Query Pattern That Uses It__

identity\_verification\_profiles

pk\_identity\_verification\_profiles

id

Every foreign\-key join from identity\_documents and verification\_attempts back to a profile\.

identity\_verification\_profiles

idx\_ivp\_user\_id

user\_id \(unique\)

getOrCreateProfile's look\-up by the authenticated caller's userId \(Doc 05 Step 3\) — the single most frequently run query against this table\.

identity\_verification\_profiles

idx\_ivp\_identity\_status

identity\_verification\_status

Available for status\-filtered look\-ups \(e\.g\. an internal report of profiles by status\); no confirmed code path in Docs 05–07 currently issues one\.

identity\_verification\_profiles

idx\_ivp\_location\_status

location\_verification\_status

Available for status\-filtered look\-ups; no confirmed code path in Docs 05–07 currently issues one\.

identity\_documents

pk\_identity\_documents

id

Every foreign\-key join from verification\_attempts and pending\_verification\_sessions back to a document; startVerificationSession's document look\-up \(Doc 05 Step 8/Step 11\)\.

identity\_documents

idx\_identity\_documents\_profile\_id

profile\_id

listDocuments' per\-profile document list \(Doc 05 Step 11, documentRepository\.find\(\{ where: \{ profileId: profile\.id \} \}\)\)\. This index supports that lookup but does not limit how many rows it returns: listDocuments has no pagination parameter, and Doc 05's submitDocument \(Step 8\) always inserts a new row — including on a legitimate resubmission after a failed scan — so a profile's document count, and this endpoint's response size, can grow without bound over time\. No source establishes an actual row count, an observed latency, or a performance incident tied to this \(Section 7\)\.

identity\_documents

idx\_identity\_documents\_fingerprint

document\_number\_normalized, issuing\_country, document\_type \(composite, not unique\)

The duplicate\-detection transaction's match query \(Doc 03 Section 8a / Doc 05's upload transaction\) — this is the index the advisory\-lock\-protected duplicate check depends on\. TRVG2 §1\.6 \[Citation corrected 21 September 2026; formerly cited as TRVG §1\.3\] and revised Doc 03 §6b/§8a require document\_number\_normalized to contain a one\-way hash of the trimmed, upper\-cased document number; the current code \(Doc 05 Step 11\) instead computes only a plaintext trim\+uppercase transform, explicitly flagged there as a non\-production\-safe placeholder \(Doc 10 Step 2a\)\. The hashing algorithm, and whether issuing\_country and document\_type join the hash input, remain a Security/Engineering decision this document does not make — this index's own composition may need reassessment once that decision is made \(Section 7\)\. \[Updated 21 September 2026: the five\-question technical resolution \(Q2\) selects HMAC\-SHA\-256, keyed with a KMS\-held pepper, computed over the normalized document number only — issuing\_country/document\_type do not join the hash input, so this index's composition does not need reassessment on that account\. This is an engineering decision made under Christopher's SOP guidance, and is not yet implemented\.\]

identity\_documents

idx\_identity\_documents\_duplicate\_of

duplicate\_of\_document\_id

Available for tracing a duplicate chain back to its original document; no confirmed code path in Docs 05–07 currently issues that query\.

verification\_attempts

pk\_verification\_attempts

id

Webhook handler's update of a specific attempt row by id \(Doc 05 Step 9\)\.

verification\_attempts

idx\_verification\_attempts\_profile\_id

profile\_id

startVerificationSession's ceiling\-check count \(Doc 05 Step 8/Step 11, Section 2c below\) — combines with the next row via Postgres's bitmap AND\. \[Superseded, 18 September 2026: this ceiling\-check count is corrected \(Step 2b, above\) to filter by profileId alone — account\-wide, per Christopher's Answer 3 / TRVG2 §2 gate\-table note — not combined with the next row's document\_id index\. This index inventory row's description of a combined profile\_id\+document\_id filter reflected the pre\-correction code example\.\]

verification\_attempts

idx\_verification\_attempts\_document\_id

document\_id

Same ceiling\-check count, filtered together with profile\_id — see Section 2c below for why this document does not also add a composite index here\. \[Superseded, 18 September 2026: the ceiling\-check count \(Step 2b, above\) no longer filters on document\_id — it is account\-wide \(profileId alone\), per Christopher's Answer 3 / TRVG2 §2 gate\-table note\. This document\_id index remains available for other confirmed queries but is not part of the ceiling\-check; Section 2c's rationale for not adding a composite index no longer applies to that specific query, though it may still apply to other query patterns this document does not enumerate\.\]

verification\_attempts

idx\_verification\_attempts\_vendor\_session\_id

vendor\_session\_id \(unique\)

Webhook handler's look\-up of the attempt a Didit callback belongs to \(Doc 05 Step 9\)\.

pending\_verification\_sessions

idx\_pending\_verification\_sessions\_vendor\_session\_id

vendor\_session\_id \(unique\)

Webhook handler's correlation of a Didit callback to its pending session row before promoting it to a verification\_attempts row \(Doc 05 Step 9\)\.

pending\_verification\_sessions

pk\_pending\_verification\_sessions

id

Primary key; no confirmed Docs 05–07 query directly looks up a row by this ID\.

__2b\. Gap 1, confirmed by reading the code: pending\_verification\_sessions has no index for its own hottest query__

startVerificationSession \(Doc 05 Step 8/Step 11\) runs this exact ceiling check on every single new verification attempt, before starting a Didit session:

// apps/identity\-verification\-service/src/services/identity\-verification\.service\.ts

// \(Doc 05 Step 8/Step 11 — corrected here 18 September 2026 to match Doc 05's own revised code below, which filters profileId only\. \[Superseded: this example previously showed profileId \+ documentId filtering, a stale per\-document holdover predating Doc 05's own Round 4 correction; it now matches Doc 05's confirmed account\-wide filtering per Christopher's Answer 3 / TRVG2 §2 gate\-table note\.\]\)

 

const existingAttempts = await this\.attemptRepository\.count\(\{

  where: \{ profileId: profile\.id \}, // account\-wide \(TRVG2 §2 gate\-table note; Answer 3\)

\}\);

const pendingSessions = await this\.pendingSessionRepository\.count\(\{

  where: \{ profileId: profile\.id \}, // account\-wide \(TRVG2 §2 gate\-table note; Answer 3\)

\}\);

if \(existingAttempts \+ pendingSessions >= RETRY\_LIMIT\) \{

  throw new RetryLimitExceededException\(\);

\}

The first count\(\), against verification\_attempts, is reasonably well served today — Postgres can combine idx\_verification\_attempts\_profile\_id and idx\_verification\_attempts\_document\_id with a bitmap AND rather than scanning the table\. The second count\(\), against pending\_verification\_sessions, has no such option: that table's migration \(Doc 05's own CreatePendingVerificationSessions1756828800000\) creates exactly one index — the unique index on vendor\_session\_id — and nothing on profile\_id or document\_id at all\. Every call to startVerificationSession runs a sequential scan of the entire pending\_verification\_sessions table to answer that count\(\)\. This is a real, confirmed gap in already\-delivered code, not a hypothetical one\.

__2c\. Gap 2, confirmed by reading the code: the daily Travel Mode sweep has no index either__

TravelModeReminderJob\.runDailySweep\(\) \(Doc 05 Step 10\), quoted exactly:

// apps/identity\-verification\-service/src/jobs/travel\-mode\-reminder\.job\.ts

// \(Doc 05 Step 10 — quoted exactly, unchanged by this document\)

 

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

This runs once a day against identity\_verification\_profiles, with no LIMIT or batch size, and processes whatever it finds serially, one profile at a time\. Doc 03's entity defines travel\_mode\_active and next\_travel\_reminder\_at as ordinary columns with no index of any kind on either one \(confirmed directly against Doc 03 Section 6a's column dictionary — both show "—" in the Constraints/Indexes column\)\. At today's expected profile counts this is unlikely to be the sweep's dominant cost, but it is a full sequential scan against a table whose row count Section 7 already notes no source projects — and, unlike the ceiling\-check queries, nothing else in this table's existing index set \(idx\_ivp\_user\_id, idx\_ivp\_identity\_status, idx\_ivp\_location\_status\) can help Postgres avoid it, since none of them include either column\.

__2d\. This document's additive migration — two new indexes, nothing else__

__ADDITIVE ONLY — SAME CONVENTION AS DOC 05'S OWN MIGRATION__

This migration is purely additive, following the exact convention Doc 05's own CreatePendingVerificationSessions migration already established relative to Doc 03's: a new file, a new class, CREATE INDEX statements only\. It does not touch any column, constraint, enum type, or existing index Doc 03's or Doc 05's migrations created, and its down\(\) method removes only what its own up\(\) method added\.

__FILE: apps/identity\-verification\-service/src/database/migrations/1756915200000\-AddPerformanceIndexes\.ts__

import \{ MigrationInterface, QueryRunner \} from 'typeorm';

 

// Doc 11's own migration — additive only\. Does not alter any table,

// column, constraint, or existing index Doc 03's or Doc 05's

// migrations created\. Adds exactly two composite indexes, closing

// the two gaps documented in Doc 11 Step 2b and Step 2c\.

export class AddPerformanceIndexes1756915200000 implements MigrationInterface \{

  name = 'AddPerformanceIndexes1756915200000';

 

  public async up\(queryRunner: QueryRunner\): Promise<void> \{

    // Doc 11 Step 2b — startVerificationSession's ceiling\-check count\(\)

    // against pending\_verification\_sessions currently has no index to

    // use on \(profile\_id, document\_id\) and falls back to a sequential

    // scan on every call\.

    await queryRunner\.query\(\`

      CREATE INDEX "idx\_pending\_verification\_sessions\_profile\_document"

      ON identity\_verification\.pending\_verification\_sessions \("profile\_id", "document\_id"\);

    \`\);

 

    // Doc 11 Step 2c — TravelModeReminderJob\.runDailySweep\(\)'s WHERE

    // clause filters identity\_verification\_profiles on

    // \(travel\_mode\_active, next\_travel\_reminder\_at\) together; neither

    // column is indexed today\.

    await queryRunner\.query\(\`

      CREATE INDEX "idx\_ivp\_travel\_mode\_reminder"

      ON identity\_verification\.identity\_verification\_profiles \("travel\_mode\_active", "next\_travel\_reminder\_at"\);

    \`\);

  \}

 

  public async down\(queryRunner: QueryRunner\): Promise<void> \{

    await queryRunner\.query\(\`DROP INDEX identity\_verification\.idx\_ivp\_travel\_mode\_reminder;\`\);

    await queryRunner\.query\(\`DROP INDEX identity\_verification\.idx\_pending\_verification\_sessions\_profile\_document;\`\);

  \}

\}

__Run from: apps/identity\-verification\-service/__

npm run typeorm \-\- migration:run \-d src/database/data\-source\.ts

Both CREATE INDEX statements run without ONLINE/CONCURRENTLY options, matching the plain style Doc 03's and Doc 05's own migrations already use — on tables at today's expected size \(Section 7: no source projects a row count\) this runs in well under a second\. If this table ever grows large enough that a blocking index build becomes a concern, switching to CREATE INDEX CONCURRENTLY inside a migration that disables TypeORM's transaction wrapping for that migration is a change to make at that time, not something this document does preemptively without a confirmed need\.

__IMPLEMENTATION APPROVAL REQUIRED__

The migration in Step 2d is a proposed schema\-affecting change\. Engineering/Christopher must confirm that it is authorized before it is applied to any shared or production\-like database\. Approval of this documentation alone does not authorize migration execution\.

__2e\. Considered and declined: a third composite index on verification\_attempts__

__ENGINEERING DECISION — NOT ADDED, AND WHY__

verification\_attempts already has idx\_verification\_attempts\_profile\_id and idx\_verification\_attempts\_document\_id as two separate single\-column indexes \(Doc 03 Section 9\)\. Postgres's query planner can combine two single\-column B\-tree indexes with a bitmap AND to answer a query that filters on both columns together — exactly the ceiling\-check count\(\) shown in Step 2b — without needing a dedicated composite index\. Adding a third index here would cost extra write amplification on every insert to a table Docs 05–09 already write to on every verification attempt, for a benefit no confirmed query pattern or load figure \(Section 7\) shows is needed\. This document declines to add it\. This is a labeled engineering judgment call, not a finding of a confirmed gap the way Step 2b and Step 2c are\. \[Superseded, 18 September 2026: this rationale was built on Step 2b's pre\-correction per\-document code example\. The ceiling\-check count is now account\-wide \(profileId alone, per Christopher's Answer 3 / TRVG2 §2 gate\-table note\) and no longer filters on profile\_id and document\_id together; the bitmap\-AND combination described above no longer applies to that query\.\]

__2f\. Diagnostic script — proving Postgres actually chooses the new indexes__

__DIAGNOSTIC TOOLING — BUILD/IMAGE ISOLATION NOT GUARANTEED__

This script lives under scripts/, the same folder Doc 07's, Doc 08's, Doc 09's, and Doc 10's diagnostic scripts used, and inherits the exact same caveat all four already flagged: Doc 06's tsconfig\.json has no include/exclude/rootDir and its \.dockerignore does not exclude scripts/ or docs/, so placement outside src/ does not by itself guarantee this file is excluded from a compiled build or Docker image\. That risk is not re\-solved here — see Doc 07 Section 7, Doc 08 Section 7, Doc 09 Section 7, Doc 10 Section 7, and this document's Section 7\.

__FILE: apps/identity\-verification\-service/scripts/dev\-explain\-hot\-queries\.ts__

import \{ identityVerificationDataSourceOptions \} from '\.\./src/database/data\-source';

import \{ DataSource \} from 'typeorm';

 

// Not part of the deployed service's request path — see the callout

// above this file in the document that shipped it \(Doc 11 Step 2f\)\.

// Runs EXPLAIN against the two query patterns Doc 11's migration

// targets, confirming Postgres actually chooses the new indexes

// rather than falling back to a sequential scan\.

//

// \[Corrected 18 September 2026: the pending\_verification\_sessions

// ceiling\-check query below now filters on profile\_id only, matching

// Doc 05's confirmed account\-wide retry\-count queries \(Christopher's

// Answer 6; Doc 03 §8b\) \-\- it no longer filters on document\_id\. \[corrected 18 September 2026: this cited "Answer 6," which addresses vendor\-outage attempt handling \(I2\), not the account\-wide attempt\-count scope resolved here — the correct citation is Answer 3 / TRVG2 §2's gate\-table note\.\]

// This does not change the index recommendation above: a composite

// \(profile\_id, document\_id\) B\-tree index still satisfies a query

// filtering on profile\_id alone via leftmost\-prefix matching, so the

// EXPLAIN result below remains a valid check of index usage\.\]

 

async function main\(\): Promise<void> \{

  const dataSource = new DataSource\(identityVerificationDataSourceOptions\);

  await dataSource\.initialize\(\);

 

  console\.log\('\-\-\- pending\_verification\_sessions ceiling\-check query \-\-\-'\);

  const pendingPlan = await dataSource\.query\(

    \`EXPLAIN SELECT COUNT\(\*\) FROM identity\_verification\.pending\_verification\_sessions

     WHERE profile\_id = $1\`, // corrected 18 September 2026: account\-wide, matching Doc 05's revised query

    \['00000000\-0000\-0000\-0000\-000000000000'\],

  \);

  pendingPlan\.forEach\(\(row: Record<string, string>\) => console\.log\(row\['QUERY PLAN'\]\)\);

 

  console\.log\('\-\-\- identity\_verification\_profiles Travel Mode sweep query \-\-\-'\);

  const sweepPlan = await dataSource\.query\(

    \`EXPLAIN SELECT \* FROM identity\_verification\.identity\_verification\_profiles

     WHERE travel\_mode\_active = true AND next\_travel\_reminder\_at <= now\(\)\`,

  \);

  sweepPlan\.forEach\(\(row: Record<string, string>\) => console\.log\(row\['QUERY PLAN'\]\)\);

 

  await dataSource\.destroy\(\);

\}

main\(\);

This script does not start the HTTP server and does not modify any row — it opens the same TypeORM DataSource Doc 03's own configuration already defines, and asks Postgres to explain, not execute, each query's plan\. On an empty or small table, Postgres's planner can still choose a sequential scan even with a matching index present, simply because a scan is cheaper below some row\-count threshold — that is expected Postgres behavior, not a sign the index is broken\. Run it again after the tables carry realistic data volumes if you want to confirm the index is actually chosen at that scale; no source available to this project defines what that scale is \(Section 7\)\.

__2g\. Connection pooling — restated, not resolved__

Doc 03's data\-source\.ts \(confirmed directly, Section 4/Step 1b above\) sets no pool size, no retryAttempts, and no lazy\-connection option — only type, url, schema, entities, migrations, synchronize: false, and logging\. This document does not add pool configuration\. Tuning a connection pool without a load figure or a database instance size to tune it against \(Section 7\) would be guessing at a number this document has no source for, exactly the restraint Step 1 already applies to expected load generally\.

__2h\. Reference document — this step's findings restated in one place__

__FILE: apps/identity\-verification\-service/docs/performance/query\-index\-notes\.md__

\# Query / Index Performance Notes — identity\-verification\-service

 

This file restates Doc 03 Section 9's and Doc 05's already\-built index

inventory \(14 indexes total\) against the actual query patterns Docs

05\-07 built, and documents the two gaps and one declined addition

Doc 11 Step 2 found\. It does not change Doc 03's or Doc 05's

migrations — see 1756915200000\-AddPerformanceIndexes\.ts for the two

indexes this document actually adds\.

 

\#\# Confirmed well\-indexed today

 

  \- identity\_verification\_profiles\.user\_id \(idx\_ivp\_user\_id, unique\) —

    backs getOrCreateProfile's per\-request look\-up\.

  \- identity\_documents\.profile\_id \(idx\_identity\_documents\_profile\_id\) —

    backs the per\-profile document list\.

  \- identity\_documents\(document\_number\_normalized, issuing\_country,

    document\_type\) \(idx\_identity\_documents\_fingerprint\) — backs the

    duplicate\-detection transaction's match query\.

    TRVG2 §1\.6 \[Citation corrected 21 September 2026; formerly cited as

    TRVG §1\.3\] requires a one\-way hash here; the current code \(Doc 05

    Step 11\) is a plaintext placeholder only, not production\-safe \(Doc

    10 Step 2a\)\. \[Updated 21 September 2026: the five\-question technical

    resolution \(Q2\) selects HMAC\-SHA\-256, keyed with a KMS\-held pepper,

    computed over the normalized document number only —

    issuing\_country/document\_type do not join the hash input, so this

    index's composition does not need reassessment on that account\. This

    is an engineering decision made under Christopher's SOP

    guidance, and is not yet implemented\.\]

  \- verification\_attempts\.vendor\_session\_id and

    pending\_verification\_sessions\.vendor\_session\_id \(both unique\) —

    back the webhook handler's session\-correlation look\-ups\.

  \- verification\_attempts\(profile\_id, document\_id\) — served today by

    two separate single\-column indexes combined via Postgres's bitmap

    AND; see "Considered and declined" below for why this document

    does not also add a dedicated composite index here\.

 

\#\# Two gaps this document closes \(1756915200000\-AddPerformanceIndexes\.ts\)

 

  1\. pending\_verification\_sessions had no index at all on profile\_id

     or document\_id, despite startVerificationSession's ceiling\-check

     count\(\) filtering on both together on every new verification

     attempt \(Doc 05 Step 8/Step 11\)\. Closed by

     idx\_pending\_verification\_sessions\_profile\_document\.

  2\. identity\_verification\_profiles had no index on

     travel\_mode\_active or next\_travel\_reminder\_at, despite

     TravelModeReminderJob's daily sweep filtering both together with

     no LIMIT \(Doc 05 Step 10\)\. Closed by

     idx\_ivp\_travel\_mode\_reminder\.

 

\#\# Considered and declined

 

  \- A third composite index on verification\_attempts\(profile\_id,

    document\_id\): the two existing single\-column indexes already let

    Postgres answer that filter via a bitmap AND\. No confirmed query

    pattern or load figure justifies the added write cost of a

    dedicated composite index here\. Not added\.

 

\#\# Not addressed by this document

 

  \- Connection\-pool sizing — Doc 03's data\-source\.ts sets none, and no

    source provides a load figure or instance size to tune against\.

  \- Any index on identity\_verification\_profiles\.identity\_verification\_status or

    \.location\_verification\_status, or on identity\_documents\.duplicate\_of\_document\_id

    — all three already have an index \(Doc 03 Section 9\); no confirmed

    query pattern in Docs 05\-07 currently uses any of the three\.

## __Step 3 — Caching__

The Required Docs Checklist names this document's third topic as "caching \(if any\)\." That parenthetical already anticipates the answer this step confirms: this service has no caching layer of any kind today\. This step confirms that absence by checking every source a cache could come from, distinguishes this service from a different service that does have one, and offers, for consideration only, what a future cache candidate might look like — it does not add a cache\.

__3a\. Confirmed: no caching layer exists in this service today__

- No caching npm package \(@nestjs/cache\-manager, cache\-manager, ioredis, redis, or any similar package\) appears anywhere in Doc 06 Step 1's package\.json, and none has been added by any document since\.
- No environment variable for a cache connection \(a Redis URL, a cache TTL, or similar\) appears in Doc 06 Step 3's consolidated \.env\.example, Doc 08's, Doc 09's, or Doc 10's environment\-variable inventories, or in the complete nine\-variable table this document's own Step 2g/Doc 10 Step 3b already restates\.
- No CacheModule, CacheInterceptor, or manual in\-memory cache \(a Map, an LRU structure, or similar\) is imported or wired into app\.module\.ts anywhere in Docs 03\-10\.
- GET /me and every other read route \(Doc 04\) queries Postgres directly on every call, through the repositories Doc 03 defined — there is no cache\-then\-database fallback anywhere in the confirmed code\.

__3b\. This is a different fact than the Architecture Overview's generic template heading__

__A DIFFERENT SERVICE'S CACHE IS NOT THIS SERVICE'S CACHE__

The Architecture Overview's per\-service documentation template \(§5\.5, "Integrations & Data Flow"\) lists "Cache policies \(Redis keys & TTL\)" as one of several generic bullet points every service's documentation might address — it is a template heading, not a platform\-wide requirement that every service caches something\. Separately, and confirmed independently of this service's own code: the Architecture Overview's own service\-by\-service summary \(§6\) states that pricing\-service "caches the latest exchange rates in Redis on a 24\-hour TTL\." That is a different, already\-built service's own confirmed behavior\. It does not imply identity\-verification\-service has, needs, or is expected to have a comparable cache — Step 3a above confirms directly, by checking this service's own dependencies, environment variables, and wiring, that it does not\.

__3c\. For consideration only: what a future cache candidate might look like__

Nothing below is chosen, recommended, or implemented\. It is offered because a Performance Considerations document that said nothing at all about caching, once its absence is confirmed, would be less useful than one that names where a cache might eventually help — not because any source calls for one\.

- GET /me \(Doc 04\) returns a profile that changes relatively infrequently between a home\-country confirmation, a travel\-classification update, or a new document upload — a short\-TTL cache keyed on userId could reduce repeated Postgres reads for a caller that polls this endpoint, if one ever does at a volume that matters\. No source confirms any caller polls it, or at what rate\.
- GET \.\.\./documents \(Doc 04\) similarly changes only when a document is uploaded or a verification attempt completes — the same short\-TTL, invalidate\-on\-write pattern would apply if it ever became a bottleneck\.
- Any such cache would need explicit invalidation on every write path that touches the cached data \(document upload, verification\-attempt webhook outcome, home\-country confirmation\) — a real implementation cost this document does not estimate, size, or schedule\.

Choosing whether to build any of the above, and choosing a caching product if so, is an Architecture/Infrastructure decision this document's authority does not extend to — consistent with how Doc 10 Step 3 already treated the equally\-unresolved encryption/KMS choice\.

__3d\. Reference document — this step's findings restated in one place__

__FILE: apps/identity\-verification\-service/docs/performance/caching\-posture\.md__

\# Caching Posture — identity\-verification\-service

 

The Required Docs Checklist names this topic "caching \(if any\)"\. This

file confirms the answer: no caching layer of any kind exists in this

service today, checked directly against its own dependencies,

environment variables, and module wiring, not assumed by default\.

 

\#\# Confirmed absent \(Doc 11 Step 3a\)

 

  \- No caching npm package in Doc 06 Step 1's package\.json\.

  \- No cache\-related environment variable in the confirmed nine\-

    variable inventory \(Doc 10 Step 3b / Doc 11 Step 2g\)\.

  \- No CacheModule, CacheInterceptor, or manual in\-memory cache

    wired into app\.module\.ts anywhere in Docs 03\-10\.

  \- Every read route queries Postgres directly, with no cache

    fallback, on every call\.

 

\#\# Not the same fact as pricing\-service's own cache

 

The Architecture Overview \(§6\) confirms pricing\-service "caches the

latest exchange rates in Redis on a 24\-hour TTL" — a different,

already\-built service's own confirmed behavior\. It does not extend to

this service\. The Architecture Overview's generic per\-service template

\(§5\.5\) lists "Cache policies \(Redis keys & TTL\)" as a heading every

service's documentation might address, not a requirement that every

service has one\.

 

\#\# For consideration only, nothing chosen \(Doc 11 Step 3c\)

 

  \- GET /me and GET \.\.\./documents are the two read routes most likely

    to benefit from a short\-TTL, invalidate\-on\-write cache if request

    volume ever justified one\. No source confirms that volume\.

  \- Choosing to build this, and choosing a caching product, is an

    Architecture/Infrastructure decision, not one this document makes\.

## __Step 4 — Verify__

This step confirms this document's own two new artifacts — the migration and the diagnostic script — actually work against the real database, and restates what they do and do not prove\.

__4a\. Run the migration__

__Run from: apps/identity\-verification\-service/__

npm run typeorm \-\- migration:run \-d src/database/data\-source\.ts

query: SELECT \* FROM current\_schema\(\)

query: CREATE INDEX "idx\_pending\_verification\_sessions\_profile\_document" ON identity\_verification\.pending\_verification\_sessions \("profile\_id", "document\_id"\)

query: CREATE INDEX "idx\_ivp\_travel\_mode\_reminder" ON identity\_verification\.identity\_verification\_profiles \("travel\_mode\_active", "next\_travel\_reminder\_at"\)

Migration AddPerformanceIndexes1756915200000 has been executed successfully\.

Both CREATE INDEX statements run once, exactly as shown in Step 2d — this is TypeORM's standard migration\-run log, not output this document constructs\. If the migration has already run, migration:run reports no pending migrations rather than re\-running it; that is expected\.

__4b\. Run the EXPLAIN diagnostic script__

__Run from: apps/identity\-verification\-service/__

npx ts\-node scripts/dev\-explain\-hot\-queries\.ts

Expected: two "\-\-\-" section headers, each followed by Postgres's own EXPLAIN output naming a query plan node\. On a table with realistic data volumes, look for "Index Scan using idx\_pending\_verification\_sessions\_profile\_document" and "Index Scan using idx\_ivp\_travel\_mode\_reminder" in the respective plans — confirming Postgres chose the new index rather than a sequential scan\. On a small or empty table \(for example, immediately after running the migration in a fresh development database\), Postgres's planner may still choose "Seq Scan" for either query, because a full scan is genuinely cheaper than an index lookup below some row\-count threshold that depends on the actual data — that is correct Postgres behavior, not a sign either index is missing or broken\. Re\-run this script once the tables carry production\-realistic volumes if you want a plan that reflects that scale; no source available to this project defines what that scale is \(Step 1a\)\.

__4c\. What this step does and does not prove__

__WHAT THIS STEP DOES AND DOES NOT PROVE__

This step proves: the migration applies cleanly against the real schema Doc 03's and Doc 05's migrations already created, and the diagnostic script runs cleanly and returns a real Postgres query plan for both targeted queries\. It does NOT prove either index is actually used at production scale \(Step 4b\), does NOT establish an expected load figure, a connection\-pool size, or a horizontal\-scaling policy \(Section 7\), and does NOT add, wire, or choose a caching layer of any kind \(Step 3\)\.

# __6\. New Files Added by This Document__

This document does not repeat Docs 03\-10's complete, cumulative file manifest \(Doc 10 Section 6 covers every file through Doc 10\)\. It only adds the files below — none of them replace Docs 03\-10's own migrations, and none of them wire into anything already built beyond the two new indexes themselves\.

__File__

__Built By__

__Notes__

src/database/migrations/1756915200000\-AddPerformanceIndexes\.ts

Doc 11, Step 2d

Additive only\. Adds two indexes; does not alter any table, column, or existing index\.

scripts/dev\-explain\-hot\-queries\.ts

Doc 11, Step 2f

Diagnostic only — outside src/\. Build/image exclusion not guaranteed, see Section 7\.

docs/performance/query\-index\-notes\.md

Doc 11, Step 2h

Reference documentation, not compiled code\.

docs/performance/expected\-load\-and\-scaling\.md

Doc 11, Step 1

Reference documentation, not compiled code\.

docs/performance/caching\-posture\.md

Doc 11, Step 3d

Reference documentation, not compiled code\. Confirms absence — chooses nothing\.

# __7\. Pending Confirmations Carried Into This Document__

Step 4 above passes today against the same running service Docs 06\-10 already start\. None of the items below block that — each is a place where this document documented a gap or an absence instead of guessing a Product, Architecture, or Infrastructure answer, or surfaced a real gap in already\-confirmed material and closed the narrow, additive part of it that engineering authority allows, without inventing the rest\.

- Both of Doc 04's guards \(BearerAuthGuard, InternalServiceGuard\) still always reject, unchanged by this document\. This remains the single most important piece of unfinished work across this document series \(Doc 04 Section 9, Doc 05 Section 7/8, Doc 06 Section 7/8, Doc 07 Section 7, Doc 08 Section 7, Doc 09 Section 7, Doc 10 Section 7\) — restated here only because Doc 10 Section 7 is now itself part of the chain, not because this document changes anything about it\.
- No source available to this project defines an expected request volume, a concurrent\-user target, a database row\-count projection, or a latency SLA for this service \(Step 1a\)\. This document does not invent one, and the two new indexes it adds \(Step 2d\) are justified by the shape of the query, not by a load figure this document does not have\.
- No source available to this project sets a connection\-pool size, a retry/lazy\-connection option, or a horizontal\-scaling/replica\-count policy for this service \(Step 1b, Step 2g\) — Doc 03's data\-source\.ts and Doc 06's Dockerfile remain exactly as those documents built them\.
- The LocationProvider boundary itself is still unbuilt — already established by Doc 05 Section 4/7, not a new finding of this document: detected\-country and related location signals "arrive through the still\-undecided LocationProvider boundary \(Technical Architecture §11\), which is outside this document's scope" \(Doc 05 Section 4\), and Doc 05 Section 7 restates the same boundary as unresolved and out of scope\. No code anywhere in Docs 03\-10 actually performs an IP\-to\-location lookup today\. One level beneath that already\-unbuilt boundary sits a narrower, still\-open performance question this document does surface: Doc 03 §6a's confirmed note that time\_zone is "derived via MaxMind GeoLite2 IP resolution" \(restated at Doc 10 Step 2a\) does not say whether a future LocationProvider implementation would resolve this locally, against a GeoLite2 database file bundled with the deployment, or over the network, against a hosted service — a materially different performance profile either way\. This document does not guess at that answer, and does not imply a working implementation exists to ask it of\.
- This document declines to add a third composite index on verification\_attempts\(profile\_id, document\_id\) \(Step 2e\) — a labeled engineering judgment call based on Postgres's bitmap\-AND capability over the two existing single\-column indexes, not a confirmed requirement either way\. If a future load figure or observed query plan ever shows this assumption wrong, that would be new information this document does not have today\. \[Note, 18 September 2026: this Section 7 restatement, the Section 1 summary bullet, and Section 2e's own body \(above\) all rested on a per\-document ceiling\-check assumption predating Doc 05's Round 4 correction\. Step 2b's code example is now corrected to match Doc 05's confirmed account\-wide filtering \(Christopher's Answer 3 / TRVG2 §2 gate\-table note\); this composite\-index engineering judgment call is otherwise unaffected — it was never contingent on per\-document vs\. account\-wide scope, only on whether Postgres can combine the two existing single\-column indexes, which it still can regardless of filter scope\.\]
- No confirmed source addresses caching for this service specifically \(Step 3\) — the Architecture Overview's generic per\-service template heading \(§5\.5\) and pricing\-service's own confirmed, different\-service Redis cache \(§6\) are not the same fact as a requirement or an existing implementation here\. This document adds no caching layer\.
- Rate limiting, CORS policy, HTTP security headers, and TLS termination remain exactly as unresolved as Doc 10 Section 7 already found them — this document does not re\-litigate any of the three; they are performance\-adjacent but not performance topics this document's scope \(expected load, query/index notes, caching\) covers\.
- This document's new diagnostic script \(scripts/dev\-explain\-hot\-queries\.ts\) inherits the exact same build\-isolation risk Doc 07 Section 7, Doc 08 Section 7, Doc 09 Section 7, and Doc 10 Section 7 already flagged for their own diagnostic scripts: Doc 06's tsconfig\.json sets no include, exclude, or rootDir, and Doc 06's \.dockerignore does not exclude scripts/ or docs/\. That risk is not re\-solved here — it simply applies to one more file now\. A fix belongs in a Doc 06 sync, not in this document\.
- Doc 08's MetricsService remains unwired into Doc 05's business logic \(Doc 08 Section 7, restated at Step 1c\) — this document does not wire it\. Once it is wired, GET /v1/internal/metrics becomes the confirmed source of real request\-volume and job\-run data this document does not have today\.
- The Dockerfile still has no non\-root USER, no multi\-stage build, and no HEALTHCHECK instruction \(Doc 06 Section 7, unchanged since\), and no source sets a container CPU/memory limit or a replica count for this service — all container\- and deployment\-sizing decisions this document does not make either\.
- idx\_identity\_documents\_fingerprint's own composition may need reassessment once Security/Engineering decides document\_number\_normalized's hashing algorithm and whether issuing\_country and document\_type join the hash input \(Step 2a, Doc 10 Section 7\) — this document does not choose an algorithm, does not decide the hash input, and does not modify the index or the schema\. \[Updated 21 September 2026: the five\-question technical resolution \(Q2\) selects HMAC\-SHA\-256, keyed with a KMS\-held pepper, computed over the normalized document number only — issuing\_country/document\_type do not join the hash input, so this index's composition does not need reassessment on that account\. This is an engineering decision made under Christopher's SOP guidance, and is not yet implemented\.\]
- GET \.\.\./documents \(listDocuments\) has no pagination, and Doc 05's submitDocument always inserts a new row rather than updating an existing one, so a profile's document count and this endpoint's response size can grow without bound over time \(Step 2a\) — no source establishes an actual row count, a latency figure, or a performance incident, and this document does not add pagination, a page size, or a LIMIT\.
- The two new indexes in Step 2d's migration are additive and narrowly scoped, but their inclusion in this accepted document does not by itself authorize running that migration against a shared, staging, or production database — Engineering/Christopher must separately confirm the migration is authorized to execute before it is applied anywhere outside this document's own Step 4 verification run\.

# __8\. What's Next__

- Replace both of Doc 04's auth guards with real authentication — still the single most important piece of unfinished work across this document series, unchanged by this document \(Doc 10 Step 1c, Section 8\)\.
- Wire Doc 08's MetricsService into Doc 05's business logic so GET /v1/internal/metrics starts reporting real counts — the confirmed mechanism this document points to \(Step 1c\) but does not build, since that remains Doc 08's own already\-flagged pending item\.
- Once real request\-volume and job\-run data exists \(via the metrics wiring above, or a load test\), revisit whether a connection\-pool size, a caching layer \(Step 3c's candidates\), or the declined third index \(Step 2e\) are actually justified — none of them are today, for lack of a load figure to justify them against\.
- Get Infrastructure to confirm identity\-verification\-service's container CPU/memory limits and replica count, and to confirm whether MaxMind GeoLite2 resolves locally or over the network \(Section 7\) — both open questions this document only surfaced\.
- Run scripts/dev\-explain\-hot\-queries\.ts again once the pending\_verification\_sessions and identity\_verification\_profiles tables carry production\-realistic row counts, to confirm the two new indexes are actually chosen by Postgres's planner at that scale \(Step 4b\)\.
- Once this document is accepted, update the Required Docs Checklist to mark Doc 11 complete\.

