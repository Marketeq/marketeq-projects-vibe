__06 — IDENTITY VERIFICATION SETUP & BOOTSTRAPPING__

*package\.json / Dockerfile Scaffold, Final app\.module\.ts and main\.ts Wiring, Health\-Check Endpoint — identity\-verification\-service*

__Epic: __Identity Verification

__Document Role: __Scaffold doc: assembles the complete, runnable project skeleton \(dependencies, build config, container image, bootstrap files, health check\) around the entities, DTOs, controllers, services, and providers Docs 03–05 already built\. Successfully installing, building, and starting this scaffold \(Section 8\) confirms the project is wired together correctly — it does not by itself confirm every code path it wires together is production\-ready; see the 16 September 2026 update note above and Section 7 for the security\- and business\-logic dependencies this scaffold does not resolve\.

__Prerequisites: __Doc 03 — Data Model & Database Schema \(built and smoke\-tested\), Doc 04 — API Specification \(built and smoke\-tested\), Doc 05 — Business Logic & Workflows \(built and smoke\-tested\), 00–02 \(Service Overview, Technical Architecture, Feature List — backend\), Marketeq Core Backend Technical Architecture Overview & Documentation Standards

__Author: __CTO — written for a developer building this microservice for the first time

__Status: __Final — ready to implement

__Date: __1 September 2026

__UPDATE — 16 SEPTEMBER 2026__

Documents 03, 04, and 05 \(this document's three prerequisites\) were each revised 16 September 2026, after this document was written\. None of those revisions changed any file path, dependency version, environment variable, migration filename, or configuration example this document already gave — every one was re\-checked against the revised documents and still matches exactly \(Section 6's file manifest is unchanged\)\. Document 05's revision did add several newly\-flagged implementation gaps that this document's Section 7 — the rollup of every unresolved dependency across Docs 03–05 — did not yet carry forward: the plaintext duplicate\-document hash placeholder, the REJECTED\-to\-FAILED/FAILED\_FINAL transition's dependency on the unresolved retry\-count scope, the unresolved AttemptOutcome\.ERROR and BLOCKED\_AGE vendor\-outcome mappings, the missing document\_expires\_on/last\_evaluated\_at population and scheduled EXPIRED transition, the unimplemented TRVG2 §6\.2 \[Citation corrected 21 September 2026; formerly cited as TRVG §6\.1\] anti\-enumeration rate limiting, and the distinction between current vendor\-outage behavior and an approved retry\-counting policy\. Section 7 below now carries all six forward, none of them resolved here\. The Decision Record authority question, SVC\-24 internal\-review access, and every other outstanding Christopher/Security/Engineering/Infrastructure decision in this series remain exactly as open as before\.

__UPDATE — 21 SEPTEMBER 2026__

Update — 21 September 2026 \(SOP B compliance review, Doc 06 pass\): three additive items in Section 7; nothing above is altered\. The VPN/proxy\-detection bullet is updated to name identity\-verification\-service’s own backend team as the proposed owner \(five\-question technical resolution, Q4\) — an engineering decision made under Christopher's SOP guidance; vendor, cost, and the fallback policy when the signal is unavailable remain open\. The RabbitMQ exchange\-name/routing\-key bullet is updated to note Doc 05 Step 5’s proposed engineering configuration \(Q3\) — amq\.topic and a three\-segment routing key — not yet verified against notification\-service’s actual consumer binding\. The documentNumberNormalized bullet is updated to note the selected hashing design \(Q2\) — HMAC\-SHA\-256, keyed with a KMS\-held pepper, over the normalized document number only — still not implemented in Doc 05’s current code\. Two stale TRVG citations in these same bullets are corrected to their actual TRVG2 section numbers \(TRVG2 §1\.6, not §1\.3, for the document\-reference hash requirement; TRVG2 §6\.2, not §6\.1, for the account\-enumeration rate\-limiting requirement\), verified directly against TRVG2’s text, not a same\-number label swap\.

# __1\. Purpose & Scope__

This document assembles the parts of identity\-verification\-service that make it an actual, runnable, deployable Node\.js project rather than a collection of source files: the service's own package\.json \(every dependency Docs 03–05 already told you to npm install, in one final manifest\), its TypeScript build configuration, its Dockerfile and container\-image plumbing, its consolidated \.env file, the final app\.module\.ts and main\.ts \(both already fully assembled across Docs 04 and 05 — reproduced here unchanged so this document is a complete, self\-contained bootstrapping reference\), and the one route no other document owns: GET /health\.

This document does NOT cover: any entity, DTO, controller, service method, provider, job, or event publisher — all of that is already built by Docs 03, 04, and 05, and none of it is repeated or modified here \(Section 3 gives a complete file manifest with the doc/step that built each one\)\. It also does not cover /ready, structured logging conventions, metrics, or alerting — those are Doc 08 — Monitoring & Observability's confirmed scope on the locked Required Docs Checklist, not this document's, and building them here would duplicate a document that hasn't been written yet\.

__HOW THIS DOCUMENT RELATES TO ITS SOURCES__

Every piece of this document traces to one of two kinds of source: \(a\) the Marketeq Core Backend Technical Architecture Overview & Documentation Standards — the platform\-wide guide that defines the confirmed Dockerfile skeleton, the confirmed /health response shape, the confirmed Supabase/GitHub Actions deployment path, and the confirmed monorepo/workspaces conventions every service including this one already follows — or \(b\) files Docs 03, 04, and 05 already built and delivered, reproduced here exactly, never re\-derived\. Where this document adds something neither source supplies \(the exact TypeScript build config, the \.dockerignore contents, the health module's file layout\), it is called out explicitly in Section 4 as this document's own scaffolding choice, not a Product or Architecture decision\.

# __2\. Prerequisites__

- Doc 03's schema, Doc 04's API layer, and Doc 05's business logic are all built and smoke\-tested — every entity, migration, DTO, guard, controller, service method, provider, job, and event publisher those three documents describe already exists in apps/identity\-verification\-service/src\. Built and smoke\-tested means this code compiles, runs, and is wired together correctly — it does not mean every code path is production\-ready; see Section 7 for what remains open\.
- Node\.js 20\.x installed locally \(the confirmed Dockerfile in Step 5 runs the service on node:20\-alpine; Doc 05 §Step 1 already established a Node 18\+ floor for its global fetch\(\) usage — 20\.x satisfies both and matches the container image exactly\)\.
- npm \(ships with Node\.js\)\. This document does not introduce yarn, pnpm, or any other package manager — none is named by any confirmed source\.
- Docker installed locally, only if you intend to build and run the container image in Step 8d's verification steps\. Not required to run the service locally with npm run start:dev\.
- Access to the marketeq\-projects\-nestjs monorepo and, specifically, to whoever administers this service's Supabase project and its GitHub Actions deployment — you will not need their credentials to complete this document, but Section 7 flags exactly where you will need them next\.
- A working DATABASE\_URL already pointed at a real, reachable Postgres database — the same one Doc 03 Step 10's smoke test already required you to have\. This is not optional infrastructure to set up later: TypeOrmModule\.forRoot\(\) connects eagerly at application bootstrap \(Step 4's callout\), so nothing in this service — not even GET /health — starts without it\.
- The other eight environment variables Docs 03 and 05 already named \(RABBITMQ\_URL, DIDIT\_API\_BASE\_URL, DIDIT\_API\_KEY, DIDIT\_WEBHOOK\_SECRET, R2\_ACCOUNT\_ID, R2\_ACCESS\_KEY\_ID, R2\_SECRET\_ACCESS\_KEY, R2\_BUCKET\_NAME\) — Step 3 below consolidates them into one file\. Unlike DATABASE\_URL, none of these are touched until their own code path actually runs \(a RabbitMQ publish, a Didit call, an R2 presign\), so placeholder values are enough to complete this document; you only need the real ones to exercise that code\.

# __3\. What You're Building__

Five new pieces, plus a reproduction of two files Docs 04 and 05 already finished:

- apps/identity\-verification\-service/package\.json — the final, complete dependency manifest\. Every npm install command across Docs 03, 04, and 05 lands here, plus the base NestJS framework packages none of those documents had reason to install explicitly \(Section 4\)\.
- apps/identity\-verification\-service/tsconfig\.json and nest\-cli\.json — the TypeScript/Nest CLI build configuration nest build and nest start \-\-watch \(already referenced by Doc 03's package\.json starter\) depend on\.
- apps/identity\-verification\-service/Dockerfile and \.dockerignore — the confirmed platform Dockerfile skeleton \(Architecture Overview, Appendix\), filled in for this service\.
- apps/identity\-verification\-service/\.env\.example — every environment variable this service reads, in one file, consolidated from Docs 03 and 05\.
- apps/identity\-verification\-service/src/health/health\.controller\.ts — the confirmed GET /health route \(Architecture Overview, Appendix\), wired into app\.module\.ts\.
- apps/identity\-verification\-service/src/main\.ts and src/app\.module\.ts — both already fully assembled \(Doc 04 Step 9 \+ Doc 05 Step 2b for main\.ts; Doc 05 Step 12 for app\.module\.ts\)\. Reproduced here unchanged, with the health module added, so this document hands you one complete, current copy of each rather than sending you back to two other documents to reconstruct them\.
- A complete file manifest \(Section 6\) mapping every file in the finished project to the document and step that built it — the payoff of assembling everything in one place\.

Nothing in Docs 03, 04, or 05 changes\. This document only adds the files above and reproduces two files those documents already finished\.

# __4\. Engineering Decisions Made in This Document__

None of these are Product or Architecture decisions\. Each is the narrowest choice needed to turn already\-confirmed platform conventions and already\-built application code into a project that actually installs, builds, and runs, and each is flagged here so nothing downstream mistakes it for something a source document decided\.

- package\.json's dependencies section did not exist as a complete list anywhere before this document — Docs 03, 04, and 05 each ran their own npm install for the packages their own step needed, and Doc 03's brand\-new\-folder starter \(its Step 1 callout\) shipped with dependencies: \{\} left empty\. This document is the first place all of those installs are merged into one manifest\. The version pins for typeorm, pg, @nestjs/typeorm, reflect\-metadata, class\-validator, class\-transformer, @nestjs/schedule, amqplib, and the two @aws\-sdk packages are copied verbatim from the npm install commands Docs 03, 04, and 05 already gave — not re\-chosen here\.
- The base NestJS framework packages — @nestjs/core, @nestjs/common, @nestjs/platform\-express, rxjs — were never explicitly installed by any prior document; every one of them assumed a working NestJS project already existed to add code to\. This document adds them for the first time, version\-matched to @nestjs/typeorm@^10\.0\.2's NestJS 10\.x line \(Doc 03 Step 1\), because a package that targets NestJS 10's module/DI APIs will not resolve correctly against a different major version\. This is a compatibility requirement, not a framework\-version decision — no source names a NestJS major version explicitly, and Technical Architecture §6 only confirms "NestJS" generically\.
- Four devDependencies — @nestjs/cli@^10\.4\.5, @nestjs/schematics@^10\.1\.4, @types/express@^4\.17\.21, and @types/node@^20\.14\.9 — are likewise added for the first time by this document\. They are not specified anywhere in Docs 03, 04, or 05, and their version pins were not copied from any prior install command — unlike the dependencies above, there is no earlier npm install line to trace them to\. @nestjs/cli and @nestjs/schematics are engineering additions needed to run the nest build and nest start \-\-watch scripts Doc 03's starter package\.json already committed to \(Step 2 below\); @types/express and @types/node are needed for TypeScript to compile against the Express and Node APIs this service's code already uses\. All four are version\-matched to the NestJS 10\.x / Node 20\.x lines already established elsewhere in this document \(the @nestjs/typeorm@^10\.0\.2 pin above, and the engines\.node: ">=20\.0\.0" / node:20\-alpine target\), not chosen independently of it\.
- tsconfig\.json and nest\-cli\.json are not defined by any confirmed source\. Their contents below are the standard output of the Nest CLI's own project scaffold \(nest new\), matching the build/start:dev scripts Doc 03's starter package\.json already committed to\. Nothing in them is Marketeq\- or identity\-verification\-service\-specific\.
- \.dockerignore is not defined by any confirmed source either\. Its contents \(excluding node\_modules, dist, and \.env from the build context\) are standard Docker practice needed to make the confirmed Dockerfile skeleton's COPY \. \. step work correctly and securely — without it, a locally\-installed node\_modules folder or a real \.env file could be copied into the image\. This document adds it as an engineering necessity of the confirmed skeleton, not a new convention\.
- Supabase\.yaml is confirmed to exist at the service root by two independent sources \(Architecture Overview §5\.2, and Technical Architecture §16's own folder structure\) — but its internal field schema is not documented by any source available to this project\. This document does not invent one\. Step 5 explains exactly what is and is not known about this file and defers its contents to whoever configures this service's actual Supabase deployment\.
- The health module's file layout \(src/health/health\.module\.ts, src/health/health\.controller\.ts\) follows the same one\-domain\-per\-folder shape Doc 05 already used for providers/ \(Steps 3, 4, 6\), events/ \(Step 5\), and jobs/ \(Step 10\) — an organizational choice Doc 05 made on its own, not a behavioral one and not a confirmed architecture requirement\. It is also not the same shape Technical Architecture §16 proposes \(location/, travel/, documents/, verification\-status/, persona/, and others, with no providers/ or jobs/ folder at all\) — that section itself calls its own layout "this document's organizational proposal, not a confirmed Marketeq requirement," not something this document treats as settled either\. This document follows Doc 05's existing precedent only for consistency with the rest of the already\-built service, not because either shape is confirmed over the other\. The route and response body themselves \(GET /health → \{ status: 'ok' \}\) are copied verbatim from the Architecture Overview's own confirmed example, not written from scratch\.
- main\.ts and app\.module\.ts below are reproduced, not re\-derived: main\.ts is exactly Doc 04 Step 9's bootstrap plus Doc 05 Step 2b's one\-line \{ rawBody: true \} addition, and app\.module\.ts is exactly Doc 05 Step 12's file, both with only the health module's import/registration added on top\. If either file in your working copy differs from what's below, trust your working copy — it means a later correction to Doc 04 or Doc 05 happened after this document was written, and this document's reproduction has gone stale, not the other way around\.

# __5\. Step\-by\-Step Implementation__

Follow these steps in order\. Every code block names the exact file path to create it in, relative to the repository root \(marketeq\-projects\-nestjs/\)\. All paths below start from apps/identity\-verification\-service/ — this folder, and everything in src/ except what this document adds, already exists from Docs 03–05\.

## __Step 1 — The Final package\.json__

Doc 03's starter shipped this file with dependencies: \{\} and two scripts\. Docs 03, 04, and 05 each ran their own npm install on top of it\. This step replaces the whole file with the final, merged result — every package any of those three documents told you to install, plus the base NestJS framework packages every one of them assumed were already there \(Section 4\)\.

__IF YOU ALREADY RAN DOCS 03–05'S INSTALL COMMANDS__

If you have been following Docs 03–05 in order and running each npm install command as you went, your node\_modules and package\-lock\.json already match what's below — this step just makes the package\.json file itself match what you already have installed\. If you are starting fresh from this document instead, replace the whole file below, then run npm install once \(Step 8\) to install everything in one pass\.

__FILE: apps/identity\-verification\-service/package\.json__

\{

  "name": "identity\-verification\-service",

  "version": "0\.0\.1",

  "private": true,

  "engines": \{

    "node": ">=20\.0\.0"

  \},

  "scripts": \{

    "build": "nest build",

    "start": "nest start",

    "start:dev": "nest start \-\-watch",

    "start:prod": "node dist/main\.js"

  \},

  "dependencies": \{

    "@nestjs/common": "^10\.4\.1",

    "@nestjs/core": "^10\.4\.1",

    "@nestjs/platform\-express": "^10\.4\.1",

    "@nestjs/schedule": "^4\.1\.1",

    "@nestjs/typeorm": "^10\.0\.2",

    "@aws\-sdk/client\-s3": "^3\.637\.0",

    "@aws\-sdk/s3\-request\-presigner": "^3\.637\.0",

    "amqplib": "^0\.10\.4",

    "class\-transformer": "^0\.5\.1",

    "class\-validator": "^0\.14\.1",

    "pg": "^8\.12\.0",

    "reflect\-metadata": "^0\.2\.2",

    "rxjs": "^7\.8\.1",

    "typeorm": "^0\.3\.20"

  \},

  "devDependencies": \{

    "@nestjs/cli": "^10\.4\.5",

    "@nestjs/schematics": "^10\.1\.4",

    "@types/amqplib": "^0\.10\.5",

    "@types/express": "^4\.17\.21",

    "@types/node": "^20\.14\.9",

    "@types/pg": "^8\.11\.6",

    "ts\-node": "^10\.9\.2",

    "typescript": "^5\.5\.4"

  \}

\}

Where each line came from: typeorm, pg, @nestjs/typeorm, reflect\-metadata, ts\-node, typescript, and @types/pg are Doc 03 Step 1's install command\. class\-validator and class\-transformer are Doc 04 Step 1's\. @nestjs/schedule, amqplib, and both @aws\-sdk packages \(plus @types/amqplib\) are Doc 05 Step 1's\. @nestjs/common, @nestjs/core, @nestjs/platform\-express, and rxjs are the base NestJS framework itself — see Section 4 for why this document is the one that finally adds them explicitly\. @nestjs/cli, @nestjs/schematics, @types/express, and @types/node are also this document's own additions, not copied from any prior install command — see Section 4 for what they're needed for and how their versions were chosen\. start:prod mirrors the confirmed Dockerfile's CMD line \(Step 5\) for running a production build manually, outside a container; the Dockerfile itself calls node dist/main\.js directly and does not invoke this script\.

## __Step 2 — TypeScript & Nest CLI Build Configuration__

nest build and nest start \-\-watch — the two scripts Doc 03's starter package\.json already committed to — are Nest CLI commands\. The Nest CLI needs two configuration files to know how to compile this service: nest\-cli\.json \(where source lives, which schematics collection to use\) and tsconfig\.json \(TypeScript's own compiler options\)\. Neither file is defined by any confirmed source; both are the standard, unmodified output of the Nest CLI's own project generator \(nest new\) — see Section 4\.

__FILE: apps/identity\-verification\-service/nest\-cli\.json__

\{

  "$schema": "https://json\.schemastore\.org/nest\-cli",

  "collection": "@nestjs/schematics",

  "sourceRoot": "src",

  "compilerOptions": \{

    "deleteOutDir": true

  \}

\}

__FILE: apps/identity\-verification\-service/tsconfig\.json__

\{

  "compilerOptions": \{

    "module": "commonjs",

    "declaration": true,

    "removeComments": true,

    "emitDecoratorMetadata": true,

    "experimentalDecorators": true,

    "allowSyntheticDefaultImports": true,

    "target": "ES2021",

    "sourceMap": true,

    "outDir": "\./dist",

    "baseUrl": "\./",

    "incremental": true,

    "skipLibCheck": true,

    "strictNullChecks": true,

    "noImplicitAny": false,

    "strictBindCallApply": false,

    "forceConsistentCasingInFileNames": false,

    "noFallthroughCasesInSwitch": false

  \}

\}

emitDecoratorMetadata and experimentalDecorators are not optional — every @Entity, @Column, @Injectable, @Controller, and DTO decorator across Docs 03–05 depends on them being on\. deleteOutDir: true in nest\-cli\.json means nest build clears dist/ before every build, so a file you rename in src/ never leaves a stale copy behind in dist/\.

## __Step 3 — The Consolidated \.env File__

Doc 03 Step 2 had you create \.env with one variable \(DATABASE\_URL\)\. Doc 05 Step 13 named eight more, but only as a reference table — no document has given you one complete file to copy until now\. This step is that file, as a \.env\.example template: every variable this service's code reads, with a placeholder value and a one\-line note on where it's used, safe to commit\. Copy it to a real \.env \(never committed\) and fill in real values before running the service against anything but a local, empty database\.

__FILE: apps/identity\-verification\-service/\.env\.example__

\# Postgres connection string for the shared Supabase instance \(Doc 03

\# Step 2\)\. Ask whoever administers Supabase access for this service's

\# real connection string\.

DATABASE\_URL=postgresql://<user>:<password>@<host>:<port>/<database>

 

\# HTTP port this service listens on \(main\.ts, Step 6\)\. Also the port the

\# Dockerfile's EXPOSE $PORT and Supabase's health\-check both read

\# \(Architecture Overview, Appendix\) — the platform convention is that

\# the container port and this value must match\.

PORT=3000

 

\# Connection string for the shared Marketeq RabbitMQ broker \(Doc 05 Step

\# 1, Step 5\)\. Platform\-standard variable name \(Architecture Overview,

\# Appendix\)\.

RABBITMQ\_URL=amqp://<user>:<password>@<host>:<port>

 

\# Didit document\-verification vendor credentials \(Doc 05 Step 3\)\. Every

\# value below is a placeholder until Didit's real API documentation is

\# available — see Doc 05 Section 7\.

DIDIT\_API\_BASE\_URL=https://api\.didit\.example

DIDIT\_API\_KEY=<didit\-api\-key>

DIDIT\_WEBHOOK\_SECRET=<didit\-webhook\-signing\-secret>

 

\# Cloudflare R2 credentials, used to presign document\-upload URLs \(Doc

\# 05 Step 6\) via the AWS S3\-compatible SDK\.

R2\_ACCOUNT\_ID=<cloudflare\-account\-id>

R2\_ACCESS\_KEY\_ID=<r2\-access\-key\-id>

R2\_SECRET\_ACCESS\_KEY=<r2\-secret\-access\-key>

R2\_BUCKET\_NAME=<r2\-bucket\-name>

__PLACEHOLDER VALUES — \.env\.example IS SAFE TO COMMIT, \.env IS NOT__

None of the placeholder values above are confirmed Infrastructure/Security values — this file only consolidates variable names Docs 03 and 05 already confirmed this service's code reads\. Never commit a real \.env file; add \.env to the repository's \.gitignore if it isn't already covered \(Doc 03 Step 2 already flagged this\)\. \.env\.example, with placeholders only, is safe to commit and is what Step 8's verification steps assume exists\.

## __Step 4 — The Health\-Check Module__

The Architecture Overview's own Appendix gives this route's exact code and response shape \("Health Endpoint Example \(NestJS\)"\), and its CI/CD Notes and Supabase Health Check sections both confirm the path is /health — not /v1/health\. This step wires that confirmed example into this service as its own small module, following the one\-domain\-per\-folder shape Doc 05 already used for providers/, events/, and jobs/ — its own scaffolding choice, not a confirmed architecture requirement \(Section 4\)\.

__WHY THIS ROUTE HAS ITS OWN FOLDER, NOT src/controllers/__

This route deliberately stays outside the src/services/ and src/controllers/ folders every other route in this service lives in\. HealthController itself has no business logic, no auth guard, and no dependency on the database or any other service — nothing in this file could itself be the reason a health check fails\. That said, this alone does not make GET /health reachable whenever the database is down: see the callout at the end of this step\.

__FILE: apps/identity\-verification\-service/src/health/health\.controller\.ts__

import \{ Controller, Get \} from '@nestjs/common';

 

// Confirmed route path and response shape — Marketeq Core Backend

// Technical Architecture Overview & Documentation Standards, §11

// Appendix \("Health Endpoint Example \(NestJS\)"\)\. Reproduced exactly\.

//

// Deliberately declared with no path prefix \(@Controller\(\) with @Get

// \('health'\), not @Controller\('v1'\) or @Controller\('health'\) with

// @Get\(\)\) so the route resolves to exactly GET /health — not GET

// /v1/health\. Every other controller in this service puts "v1/\.\.\."

// directly in its own @Controller\(\) path \(Doc 04 Step 9\); this is the

// one confirmed exception, per the same Appendix's CI/CD Notes and

// Supabase Health Check sections, both of which name the path as

// /health\.

@Controller\(\)

export class HealthController \{

  @Get\('health'\)

  health\(\): \{ status: string \} \{

    return \{ status: 'ok' \};

  \}

\}

__FILE: apps/identity\-verification\-service/src/health/health\.module\.ts__

import \{ Module \} from '@nestjs/common';

import \{ HealthController \} from '\./health\.controller';

 

@Module\(\{

  controllers: \[HealthController\],

\}\)

export class HealthModule \{\}

HealthModule has no providers and imports nothing — there is nothing for it to depend on\. Step 7 adds it to app\.module\.ts's imports array, the only wiring it needs\.

__THIS IS /health, NOT /ready — SEE SECTION 7__

This route returns \{ status: 'ok' \} unconditionally — it does not check the database connection, RabbitMQ, or any vendor\. That is intentional and matches the confirmed example exactly, not a simplification this document made\. A deeper check that verifies dependencies before responding is what the Architecture Overview's own Service Template calls /ready \("Optional /ready if dependencies \(DB, queues\) must be up"\) — that route is Doc 08 — Monitoring & Observability's confirmed scope \(Required Docs Checklist\), not this document's, and is not built here\.

__THIS ROUTE IS NOT ACTUALLY DB\-INDEPENDENT TODAY — SEE SECTION 7__

HealthController's own code has no database dependency, but that does not mean this route is reachable independent of the database today\. app\.module\.ts \(Step 7, reproduced from Doc 05 Step 12\) registers TypeOrmModule\.forRoot\(\.\.\.\) unconditionally, and @nestjs/typeorm's default behavior is to open a real Postgres connection as part of bootstrapping the whole Nest application — with no retryAttempts or lazy\-connection option set anywhere in Doc 03's data\-source\.ts\. In practice, if the database is unreachable, the entire process fails to finish starting, and no route — including /health — ever begins serving requests\. Decoupling /health from database startup would mean changing how TypeOrmModule is registered, which is Doc 03/Doc 05's already\-confirmed wiring — this document does not make that change unilaterally\. See Section 7\.

## __Step 5 — Dockerfile, \.dockerignore, and Supabase\.yaml__

Technical Architecture §18 confirms this service deploys the same way every other Marketeq service does: "Standard path is GitHub Actions → Supabase per service" \(Architecture Overview §10, verified direct quotation\), container port matching PORT, health check at /health\. That same Architecture Overview gives an exact Dockerfile skeleton in its Appendix\. This step reproduces it for this service — nothing below the confirmed skeleton is a new deployment decision\.

__5a\. Dockerfile__

__CONFIRMED SKELETON — REPRODUCED EXACTLY__

This is the confirmed platform skeleton \(Architecture Overview, Appendix, "Dockerfile Skeleton"\), reproduced exactly — every line, in the same order\. This document does not add multi\-stage builds, a non\-root user, or a HEALTHCHECK instruction, because none of that is part of the confirmed skeleton and this document is not the place to introduce new container\-hardening decisions on its own \(Section 7\)\.

__FILE: apps/identity\-verification\-service/Dockerfile__

FROM node:20\-alpine

 

WORKDIR /usr/src/app

 

COPY package\*\.json \./

RUN npm ci

 

COPY \. \.

RUN npm run build

 

EXPOSE $PORT

 

CMD \["node", "dist/main\.js"\]

__5b\. \.dockerignore__

Not part of the confirmed skeleton — this file is standard Docker practice needed to make COPY \. \. above behave correctly\. Without it, a locally\-installed node\_modules folder \(built for your host machine, not node:20\-alpine's Linux/musl environment\) or a real \.env file could be copied straight into the image\.

__FILE: apps/identity\-verification\-service/\.dockerignore__

node\_modules

dist

\.env

\.env\.\*

\!\.env\.example

npm\-debug\.log

\.git

\.gitignore

\*\.md

__5c\. Supabase\.yaml__

__FILE CONTENTS NOT CONFIRMED BY ANY SOURCE — DO NOT INVENT__

This service's Supabase service definition file is confirmed to belong here by two independent sources — the Architecture Overview's Service Template \(§5\.2\) and Technical Architecture's own folder structure for this service \(§16, "Proposed Folder/Module Structure"\) both list Supabase\.yaml at the service root, right beside the Dockerfile\. Neither source, nor any other available to this project, documents what fields this file actually needs — there is no example, schema, or template anywhere in the confirmed sources\. This document does not invent one\. Ask whoever configures this service's Supabase deployment for the real file \(or a template from an already\-deployed service, e\.g\. notification\-service\) before this service can actually be deployed — see Section 7\. Until then, the fact that this file must exist at this path is confirmed; its contents are not\.

Create an empty placeholder so the confirmed folder structure is complete and the gap is visible rather than silently missing:

__FILE: apps/identity\-verification\-service/Supabase\.yaml__

\# PLACEHOLDER — see Doc 06 Step 5c and Section 7\. No confirmed source

\# documents this file's actual schema\. Replace with the real service

\# definition before this service is deployed through the confirmed

\# GitHub Actions → Supabase path \(Architecture Overview §10\)\.

## __Step 6 — main\.ts \(Reproduced, Final\)__

This file does not change in this document\. It is exactly Doc 04 Step 9's bootstrap function with Doc 05 Step 2b's one\-line \{ rawBody: true \} addition — reproduced here so this document hands you one complete, current copy instead of sending you back to two other documents to reconstruct it\.

__FILE: apps/identity\-verification\-service/src/main\.ts__

import \{ NestFactory \} from '@nestjs/core';

import \{ ValidationPipe \} from '@nestjs/common';

import \{ AppModule \} from '\./app\.module';

import \{ AllExceptionsFilter \} from '\./common/filters/all\-exceptions\.filter';

 

async function bootstrap\(\) \{

  // \{ rawBody: true \} is the only change to this line from Doc 04\. It

  // makes NestJS attach the original request bytes to req\.rawBody for

  // every request, which the webhook handler \(Doc 05 Step 9\) needs\.

  const app = await NestFactory\.create\(AppModule, \{ rawBody: true \}\);

 

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

If your working copy of main\.ts differs from what's above, trust your working copy over this document — it means Doc 04 or Doc 05 was corrected after this document was written \(Section 4\)\. This document did not re\-derive this file from architecture; it copied it from those two documents' own final state at the time this document was built\.

## __Step 7 — app\.module\.ts \(Reproduced, Plus the Health Module\)__

Everything below except the two lines marked "Doc 06 addition" is exactly Doc 05 Step 12's file — reproduced here, not re\-derived, for the same reason as Step 6\. The only change this document makes is importing and registering HealthModule \(Step 4\)\.

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

    HealthModule, // Doc 06 addition — see Step 4

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

HealthModule contributes no entity, no provider, and no import of its own into this file beyond the one line above — it only adds HealthController's GET /health route to the app\. If your working copy of this file differs from what's above outside the two Doc 06 addition lines, trust your working copy — same reasoning as Step 6\.

## __Step 8 — Verify__

Four checks: the full dependency set installs cleanly, the service builds and starts against the final package\.json, the confirmed health route responds, and the confirmed Dockerfile actually builds and runs the same service in a container\.

__8a\. Install every dependency__

__Run from: apps/identity\-verification\-service/__

npm install

Expected: npm install completes with no errors and no unresolved peer\-dependency warnings for any @nestjs/\* package\. If you already installed packages incrementally while working through Docs 03–05, this reconciles node\_modules and package\-lock\.json against Step 1's final package\.json — it should still complete cleanly, since Step 1 changed no version already installed\.

__8b\. Build and start the service__

npm run build

Expected: a dist/ folder appears containing main\.js and the compiled output of every file Docs 03–05 built, with no TypeScript errors\. If you see a decorator\-related compiler error, re\-check Step 2's tsconfig\.json — emitDecoratorMetadata and experimentalDecorators must both be true\.

npm run start:dev

Expected: the same route list Doc 04's and Doc 05's own verify steps described \(every v1/identity\-verification/\.\.\. route\), plus one new line for the route this document added: "Mapped \{/health, GET\} route"\. If that line is missing, re\-check that HealthModule is listed in app\.module\.ts's imports array \(Step 7\)\.

__8c\. Confirm the health route__

With the service still running from 8b, in another terminal:

curl \-i http://localhost:3000/health

Expected: HTTP 200 with body \{"status":"ok"\} — exactly the confirmed response shape \(Step 4\)\. Note the path is /health, not /v1/health; if you get 404, you likely added a v1 prefix to HealthController by mistake\.

__8d\. Build and run the confirmed Docker image__

__THIS STEP NEEDS A REAL DATABASE CONNECTION — SEE STEP 4__

This step needs a real, reachable DATABASE\_URL — not a placeholder\. Even though HealthController itself never queries the database, app\.module\.ts's TypeOrmModule\.forRoot\(\) \(Step 7\) connects eagerly as part of Nest's own bootstrap, with no retry or lazy\-connection option configured anywhere \(Step 4's callout\)\. A container given an unreachable DATABASE\_URL will fail to finish starting and will never serve /health at all\. Use the same working DATABASE\_URL you already verified against in Doc 03 Step 10\.

Stop the process from 8b first \(the container will bind the same port\)\. RabbitMQ and vendor credentials are still not needed — nothing on the startup path this document controls touches them before /health can respond\.

__Run from: apps/identity\-verification\-service/__

docker build \-t identity\-verification\-service \.

docker run \-\-rm \-p 3000:3000 \-e PORT=3000 \-e DATABASE\_URL="<your working Doc 03 DATABASE\_URL>" identity\-verification\-service

Expected: the image builds in three layered steps matching the Dockerfile exactly \(npm ci, then npm run build, then the final CMD\), and the container logs show the same NestJS startup output as 8b, including the /health route\. Confirm from a third terminal:

curl \-i http://localhost:3000/health

Expected: the same 200 \{"status":"ok"\} response as 8c, this time served from inside the container\. If the container instead exits or loops retrying a connection, the DATABASE\_URL passed to docker run is not reachable from inside the container — a common cause is using localhost to refer to a database running on your host machine, which resolves differently from inside a container than in a plain npm run start:dev process\. Stop the container with Ctrl\+C when done\.

__WHAT THIS STEP DOES AND DOES NOT PROVE__

This step confirms the confirmed Dockerfile skeleton builds and runs this specific service correctly\. It does not confirm this service deploys correctly through the actual GitHub Actions → Supabase pipeline \(Technical Architecture §18\) — that requires Supabase\.yaml's real contents \(Step 5c\) and access to this service's actual Supabase project, neither of which this document has\. See Section 7\.

# __6\. Complete File Manifest__

Every file in the finished project, grouped by folder, with the document and step that built its current, final version\. Use this as the map when you can't remember which document covers a given file — everything here already exists except the 6a/6l groups, which this document adds\.

__6a\. Project Root \(this document\)__

__File__

__Built By__

__Notes__

package\.json

Doc 06, Step 1

Final, merged manifest\. Started as Doc 03 Step 1's starter\.

nest\-cli\.json

Doc 06, Step 2

New — standard Nest CLI scaffold\.

tsconfig\.json

Doc 06, Step 2

New — standard Nest CLI scaffold\.

\.env\.example

Doc 06, Step 3

Consolidates Doc 03 Step 2 \+ Doc 05 Step 13\.

Dockerfile

Doc 06, Step 5a

Confirmed platform skeleton, reproduced exactly\.

\.dockerignore

Doc 06, Step 5b

New — standard Docker practice\.

Supabase\.yaml

Doc 06, Step 5c

Placeholder only — contents not confirmed by any source\.

__6b\. src/ Root__

__File__

__Built By__

__Notes__

main\.ts

Doc 04 Step 9 \+ Doc 05 Step 2b

Reproduced unchanged in Doc 06 Step 6\.

app\.module\.ts

Doc 05 Step 12

Reproduced with HealthModule added in Doc 06 Step 7\.

__6c\. src/entities/__

__File__

__Built By__

__Notes__

enums/identity\-verification\.enums\.ts

Doc 03, Step 3

Every fixed\-choice value for this service's schema\.

identity\-verification\-profile\.entity\.ts

Doc 03, Step 4

identity\-document\.entity\.ts

Doc 03, Step 4

verification\-attempt\.entity\.ts

Doc 03, Step 4

pending\-verification\-session\.entity\.ts

Doc 05, Step 2a

Doc 05's own addition — not part of Doc 03's confirmed schema\.

__6d\. src/database/__

__File__

__Built By__

__Notes__

data\-source\.ts

Doc 03, Step 5

TypeORM DataSource options, imported by app\.module\.ts\.

migrations/1756742400000\-CreateIdentityVerificationSchema\.ts

Doc 03, Step 8

migrations/1756828800000\-CreatePendingVerificationSessions\.ts

Doc 05, Step 2a

smoke\-test\.ts

Doc 03, Step 10

Manual verification script, not part of the running service\.

__6e\. src/dto/__

__File__

__Built By__

__Notes__

response/error\.response\.dto\.ts

Doc 04, Step 2

Shared \{ code, message, details? \} shape\.

request/travel\-classification\.request\.dto\.ts

Doc 04, Step 4

request/travel\-duration\.request\.dto\.ts

Doc 04, Step 4

request/document\-upload\-url\.request\.dto\.ts

Doc 04, Step 4

request/submit\-document\.request\.dto\.ts

Doc 04, Step 4

response/profile\-status\.response\.dto\.ts

Doc 04, Step 5

response/document\.response\.dto\.ts

Doc 04, Step 5

response/document\-upload\-url\.response\.dto\.ts

Doc 04, Step 5

response/verification\-session\.response\.dto\.ts

Doc 04, Step 5

response/internal\-status\.response\.dto\.ts

Doc 04, Step 5

webhooks/didit\-webhook\.payload\.dto\.ts

Doc 04, Step 8

Placeholder shape — Didit's real contract unconfirmed\.

__6f\. src/common/__

__File__

__Built By__

__Notes__

errors/domain\-exceptions\.ts

Doc 04 Step 2 \+ Doc 05 Step 9b

Every domain exception this service throws\.

validators/is\-not\-past\-date\.validator\.ts

Doc 04, Step 3

guards/bearer\-auth\.guard\.ts

Doc 04, Step 6

Placeholder — always rejects\. See Section 7\.

guards/internal\-service\.guard\.ts

Doc 04, Step 6

Placeholder — always rejects\. See Section 7\.

filters/all\-exceptions\.filter\.ts

Doc 04, Step 6

Registered in main\.ts \(Step 6\)\.

utils/verify\-didit\-webhook\-signature\.ts

Doc 05, Step 9a

Placeholder signing scheme — Didit's real scheme unconfirmed\.

__6g\. src/controllers/__

__File__

__Built By__

__Notes__

identity\-verification\.controller\.ts

Doc 04, Step 8

identity\-verification\-internal\.controller\.ts

Doc 04, Step 8

identity\-verification\-webhooks\.controller\.ts

Doc 04 Step 8 \+ Doc 05 Step 9c

Doc 05 added the raw\-body parameter\.

__6h\. src/services/__

__File__

__Built By__

__Notes__

identity\-verification\.service\.ts

Doc 05, Step 11

Final, complete file — Doc 04's stub is fully replaced\.

__6i\. src/providers/__

__File__

__Built By__

__Notes__

document\-verification/document\-verification\-provider\.interface\.ts

Doc 05, Step 3

document\-verification/didit\-document\-verification\.provider\.ts

Doc 05, Step 3

Placeholder Didit request/response shape\.

vpn\-proxy/vpn\-proxy\-detection\-provider\.interface\.ts

Doc 05, Step 4

vpn\-proxy/unimplemented\-vpn\-proxy\-detection\.provider\.ts

Doc 05, Step 4

Scaffolding only — see Doc 05 Section 7\.

storage/object\-storage\-provider\.interface\.ts

Doc 05, Step 6

storage/r2\-object\-storage\.provider\.ts

Doc 05, Step 6

__6j\. src/events/__

__File__

__Built By__

__Notes__

identity\-verification\-event\.types\.ts

Doc 05, Step 5

The six confirmed notification occasions\.

notification\-event\-publisher\.interface\.ts

Doc 05, Step 5

rabbitmq\-notification\-event\-publisher\.ts

Doc 05, Step 5

Placeholder exchange/routing\-key topology\.

__6k\. src/jobs/__

__File__

__Built By__

__Notes__

travel\-mode\-reminder\.job\.ts

Doc 05, Step 10

Two of its three triggers are not yet wired to anything\.

__6l\. src/health/ \(this document\)__

__File__

__Built By__

__Notes__

health\.controller\.ts

Doc 06, Step 4

Confirmed GET /health route\.

health\.module\.ts

Doc 06, Step 4

# __7\. Pending Confirmations Carried Into This Document__

None of these block Step 8a–8c above from passing today with no real infrastructure at all\. Step 8d is the one exception — it needs a real, reachable database, for the reason its own callout gives\. Each item below is a place where this document either reproduced a gap Docs 03–05 already flagged, or hit a boundary of what the confirmed platform sources document\.

- GET /health is not actually reachable independent of the database today, despite HealthController itself having no database dependency \(Step 4\)\. TypeOrmModule\.forRoot\(\) \(Step 7, from Doc 05 Step 12\) connects eagerly at Nest's own bootstrap with no retry or lazy\-connection option set anywhere in Doc 03's data\-source\.ts, so the whole application — /health included — fails to finish starting if the database is unreachable\. Decoupling the two would mean changing how TypeOrmModule is registered in already\-confirmed Doc 03/Doc 05 code, which this document does not do unilaterally\. If Supabase's actual health check \(Step 5, Step 8d's callout\) expects /health to respond even during a database outage, this gap needs a resolution before that assumption can be relied on\.
- Supabase\.yaml \(Step 5c\) has no confirmed contents anywhere in this project's available sources\. This service cannot actually be deployed through the confirmed GitHub Actions → Supabase path \(Technical Architecture §18\) until someone who administers this service's Supabase project supplies the real file — a placeholder ships in its place\.
- Doc 04's two authentication guards \(bearer\-auth\.guard\.ts, internal\-service\.guard\.ts\) still always reject, unchanged by this document\. This was already the single most important piece of unfinished work flagged by both Doc 04 §9 and Doc 05 Section 8, and remains exactly as open here — this document only wires the project together, it does not build authentication\.
- Didit's real API/webhook contract \(Doc 05 Step 3, Step 9\) remains a placeholder\. The DIDIT\_API\_BASE\_URL, DIDIT\_API\_KEY, and DIDIT\_WEBHOOK\_SECRET entries in Step 3's \.env\.example are names and placeholder\-format values only, not real credentials or a confirmed contract\.
- VPN/proxy detection \(Doc 05 Step 4\) still has no real implementation or confirmed owner, and no source defines what should happen when the signal is unavailable — unchanged by this document\. \[Updated 21 September 2026: per the five\-question technical resolution \(Q4\), identity\-verification\-service’s own backend team is now the proposed owner — built inline, not by api\-gateway, the Location Service, or Didit’s module — with a MaxMind GeoIP2 Anonymous IP\-style feed recommended\. This is an engineering decision made under Christopher's SOP guidance; the vendor, its cost, and the fallback policy when the signal is unavailable all remain open \(Doc 05 Step 4\)\.\]
- The RabbitMQ exchange name, routing\-key pattern, and Marketeq's own shared messaging client's real interface \(Doc 05 Step 5\) remain unconfirmed — this document installs and starts amqplib as Doc 05 built it, but does not resolve that gap\. \[Updated 21 September 2026: Doc 05 Step 5 now targets the amq\.topic exchange and a three\-segment identity\-verification\.verification\.<event\-type> routing key — a proposed engineering configuration \(Q3\), made under Christopher's SOP guidance\. Marketeq's own shared messaging client's real interface remains genuinely unconfirmed, and whether notification\-service is actually bound to consume from amq\.topic with this routing key remains unverified\.\]
- Cloudflare R2 credentials \(R2\_ACCOUNT\_ID, R2\_ACCESS\_KEY\_ID, R2\_SECRET\_ACCESS\_KEY, R2\_BUCKET\_NAME\) are placeholder names in Step 3's \.env\.example, consistent with Doc 03 §10 and Doc 05 Section 7 already flagging R2 as a recommended default pending Infrastructure/Security confirmation\.
- Docker image hardening — a non\-root user, a multi\-stage build to shrink the final image, a HEALTHCHECK instruction — is not part of the confirmed Dockerfile skeleton \(Step 5a\) and is not added here\. No source calls for it, and this document does not introduce container\-security decisions on its own\.
- Doc 08 — Monitoring & Observability \(locked at that number on the Required Docs Checklist\) owns /ready, structured logging conventions, metrics, and alerting\. Nothing in this document anticipates or duplicates that scope beyond the one confirmed /health route\.
- No test tooling \(jest, ts\-jest, @nestjs/testing, or any spec file\) is installed or configured by this document\. No source available to this project defines a testing requirement or convention for this service, and no prior document in this series created a test file for this document to build configuration around\.
- identity\-verification\.service\.ts's duplicate\-document detection computes documentNumberNormalized as a plaintext trim/uppercase of the submitted document number, not a one\-way hash — contradicting Doc 03 §6b/§8a and TRVG2 §1\.6 \[Citation corrected 21 September 2026; formerly cited as TRVG §1\.3\], and explicitly flagged by Doc 05's 16 September revision as not production\-safe\. The hash algorithm, and whether issuing country/document type join the hash input, are pending Security/Engineering confirmation \(Doc 03, 16 September update note\); this document does not choose either\. \[Updated 21 September 2026: per the five\-question technical resolution \(Q2\), the selected design is HMAC\-SHA\-256, keyed with a KMS\-held pepper, computed over the normalized document number only — issuing\_country/document\_type do not join the hash input\. This is a proposed engineering decision, made under Christopher's SOP guidance, and is not yet implemented: Doc 05's code still computes only the plaintext trim/uppercase transform described above \(Doc 03 §6b, §8a, §10\)\.\]
- handleDiditWebhook's REJECTED\-to\-FAILED/FAILED\_FINAL transition \(Doc 05 Section 4, 16 September revision\) reuses the existing per\-document attempt count and is explicitly flagged not production\-safe until the account\-wide\-versus\-per\-document attempt\-count scope question \(Doc 03 §8b\) is resolved — carried forward here, not resolved by this document\. \[Superseded, 18 September 2026: the account\-wide\-versus\-per\-document scope question is resolved — confirmed account\-wide, per Christopher’s Answer 6 and Doc 03 §8b’s and Doc 05’s 18 September 2026 revisions\. handleDiditWebhook’s transition now reuses the account\-wide attempt count, not a per\-document one — carried forward here for awareness, not re\-implemented by this document\.\]
- Two of TRVG §3's confirmed status transitions have no implementation: AttemptOutcome\.ERROR does not drive any status change, and whether it should remains unresolved \(Doc 05 Section 7\); BLOCKED\_AGE has no detection mechanism at all, since DiditWebhookPayloadDto \(Doc 04\) has no field to support one\. Neither is built by Docs 03–05, and this document does not add one\. \[Reconciled, 18 September 2026: BLOCKED\_AGE’s general mechanism is now confirmed, not fully open the way this bullet describes — TRVG2 §3 states the transition fires when “document indicates under 18,” and that the date of birth read from the document is used to derive eligible\_on and then discarded \(TRVG2 §3; Doc 03 §6a/Section 10\)\. What remains genuinely unspecified is the implementation path, not the policy: no source reviewed — including TRVG2 — confirms that Didit’s webhook payload actually carries a date of birth or age signal, or that DiditWebhookPayloadDto \(Doc 04\) has been updated with a field to receive one\. That integration detail is not decided here and is not invented; it is a genuine open dependency, distinct from the resolved AttemptOutcome\.ERROR question in the same original sentence, which remains open as this document originally described\.\]
- document\_expires\_on and last\_evaluated\_at \(Doc 03 §6a, TRVG §1\.1\) are schema columns with no corresponding population logic or scheduled EXPIRED\-transition job anywhere in Docs 03–05 — unlike the analogous Travel Mode reminder job \(Section 6k\), no comparable job exists for expiry\. No expiry policy, population rule, scheduler, or backfill is proposed by this document either\.
- TRVG2 §6\.2 \[Citation corrected 21 September 2026; formerly cited as TRVG §6\.1\]'s anti\-enumeration rate\-limiting requirement for POST \.\.\./documents \(Doc 04 §4, Doc 05 Section 7\) is not implemented anywhere in Docs 03–05, and no threshold, enforcement layer, middleware, or error code is chosen by this document either — the route this document brings online in Step 8 has no rate limiting in front of it\.
- An outage from the Didit provider during session creation does not consume one of the three retry attempts, as a structural consequence of where pending\_verification\_sessions rows are written \(Doc 05 Section 4\) — not an approved counting policy\. Whether an outage\-caused attempt should count toward the limit remains open \(Doc 03 §8c\); this document does not resolve it\. \[Superseded, 18 September 2026: this is resolved, not open — per Christopher's Answer 6 / TRVG2 §5\.1, a vendor\-outage\-caused attempt never counts toward the three\-attempt limit, without qualification, matching this document's own two correctly\-annotated neighboring bullets above\.\]

# __8\. What's Next__

- Decide whether GET /health needs to stay reachable during a database outage\. If yes, that requires changing how TypeOrmModule\.forRoot\(\) is registered \(a retry policy, a lazy connection, or moving the health route to a process that starts independently of it\) — a change to Doc 03/Doc 05's already\-confirmed wiring that this document flags but does not make on its own \(Section 7\)\.
- Get this service's real Supabase\.yaml from whoever administers its Supabase project \(or an already\-deployed service's file as a template\), and replace Step 5c's placeholder before attempting a real deployment\.
- Replace Doc 04's two auth guards with real authentication — still the single most important piece of unfinished work across this document series, unchanged by this document\.
- Confirm Didit's real API contract, a VPN/proxy signal owner and fallback policy, RabbitMQ's real topology, and real R2/Didit credentials — all carried forward from Doc 05 Section 7/8, none resolved here\.
- Once this document is accepted, update the Required Docs Checklist to mark Doc 06 complete, and begin Doc 07 — Integrations & Events per the locked numbering\.

