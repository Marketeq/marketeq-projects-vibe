# **Marketeq Core Backend -- Technical Architecture Overview & Documentation Standards**

Audience: Technical Documentation Engineers and new backend
contributors\
\
Tone: User‑friendly, concise, implementation‑ready\
\
Scope: **Core backend (NestJS + TypeScript) monorepo**.

## **1) Purpose & How To Use This Guide**

This is the starting point for anyone documenting or extending the
Marketeq backend. It explains the platform architecture, the monorepo
structure, our microservices, and the documentation rules you must
follow so GPT (and humans) can produce production‑ready docs for any new
service or feature.

**What you can do with this guide**

- Understand how services fit together and where code belongs.

- Follow the **Folder Structure Policy** so code never lands in the
  wrong place.

- Use the **Service Template** to document any microservice end‑to‑end
  (including env vars, health checks, and deployment notes).

- Train AI on our documentation style with consistent headings and
  embedded code.

## **2) High‑Level Platform Overview**

- **Frontend**: Next.js (Vercel). Calls the API Gateway and/or service
  endpoints.

- **Backend**: NestJS microservices in a single GitHub monorepo (this
  repo).

- **Primary DB**: PostgreSQL on Supabase. (Current initiative:
  **consolidate services into one database**; not covered by this doc,
  but assume a shared instance with schemas/tables per service.)

- **Queues / Cache**: RabbitMQ, Redis (where relevant per service).

- **Realtime**: Ably for publish/subscribe and live UI updates.

- **Payments/Accounting**: Stripe for cards/ACH/installments; QuickBooks
  for invoice reconciliation and wire‑verification status.

- **Search**: Algolia for marketplace search and autocomplete.

- **CMS**: Strapi for category/editorial content.

- **Object Storage**: Cloudflare R2 for media (e.g., screenshots).

## **3) Monorepo Structure (GitHub)**

**Repository**: marketeq-projects-nestjs

### **3.1 Folder Structure Policy (Critical)**

**All code for a service must live under /apps/\<service-name\>/src.**

- ✅ **DO** put every microservice inside /apps/\<service-name\>.

- ✅ **DO** have a **src/** folder **inside** each service (controllers,
  modules, DTOs, etc.).

- ❌ **DO NOT** create or use a **/src** at the **repo root**.

- ❌ **DO NOT** put shared runtime code in a service folder---use
  /shared.

### **3.2 Canonical Layout (ASCII Diagram)**

****marketeq-projects-nestjs/

├─ .github/

├─ .vscode/

├─ apps/ \# All microservices live here

│ ├─ admin-service/

│ │ ├─ Dockerfile

│ │ ├─ Supabase.yaml

│ │ ├─ package.json

│ │ └─ src/ \# Controllers, modules, services, dto, entities

│ ├─ affiliate-referral-service/

│ ├─ algolia-service/

│ ├─ api-gateway/

│ ├─ auth-service/

│ ├─ autocomplete-service/

│ ├─ content-moderation-service/

│ ├─ favorites-service/

│ ├─ invitations-service/

│ ├─ listings-service/

│ ├─ portfolio-service/

│ ├─ time-tracking-service/

│ └─ user-service/

├─ shared/ \# Shared types/utils/config (no business logic)

│ ├─ types/

│ ├─ utils/

│ └─ config/

├─ package.json \# Workspaces root

└─ README.md

### **3.3 Workspace Config (Example)**

****{

\"name\": \"marketeq-projects-backend-nest\",

\"private\": true,

\"workspaces\": \[\"apps/\*\"\],

\"scripts\": {

\"build\": \"nest build\",

\"start:dev\": \"nest start \--watch\",

\"lint\": \"eslint .\",

\"test\": \"jest\"

}

}

> **Tip:** If you see a src/ **outside** /apps, treat that as a cleanup
> task. Move files into the correct service under
> /apps/\<service-name\>/src and update imports/paths.

## **4) Current Microservices (Core Backend)**

The following services are present under apps/ (based on the repository
view):

- admin-service

- affiliate-referral-service

- algolia-service

- api-gateway

- auth-service

- autocomplete-service

- content-moderation-service

- favorites-service

- invitations-service

- listings-service

- portfolio-service

- time-tracking-service

- user-service

- notification-service *(if not yet a folder, promote
  notification.service.ts into its own service folder)\*

> **Naming**: Use **kebab-case** for service folders. Each service is
> independently deployable.

## **5) Service Template (What Every Service Document Must Include)**

Use this template when documenting or creating any service. It's
designed so GPT can generate full, production‑ready docs without
guesswork.

### **5.1 Header**

- **Service Name**: \<service-name\>

- **Purpose**: One‑sentence, outcome‑focused summary.

- **Owners**: Team or lead responsible.

### **5.2 Folder & Files**

****apps/\<service-name\>/

├─ Dockerfile

├─ Supabase.yaml \# Supabase service definition

├─ package.json

└─ src/

├─ app.module.ts

├─ main.ts

├─ controllers/

├─ services/

├─ dto/

├─ entities/

└─ config/

### **5.3 Environment Variables**

List every variable the service requires, where it's consumed, and
defaults. Example:

- DATABASE_URL: Postgres connection string (use shared DB;
  service‑scoped schema/table names)

- PORT: HTTP port exposed by the service

- JWT_SECRET: For auth‑bound services

- REDIS_URL, RABBITMQ_URL: If used

- ABLY_API_KEY, ALGOLIA_APP_ID, ALGOLIA_API_KEY, etc. when applicable

### **5.4 API Surface**

Document all routes:

- **Method + Path**: GET /v1/resource

- **Auth**: public \| bearer \| internal

- **Request**: params, query, body (DTO types)

- **Response**: JSON schema or TypeScript interface

- **Errors**: standard error shapes

### **5.5 Integrations & Data Flow**

- External APIs (Stripe/QuickBooks/Ably/Algolia/etc.)

- Events & queues (what events published/consumed)

- Cache policies (Redis keys & TTL)

### **5.6 Health, Readiness & Observability**

- GET /health returns { status: \'ok\' }

- Optional /ready if dependencies (DB, queues) must be up

- Logging guidelines; SLO/alerts if defined

### **5.7 Security & Permissions**

- Required roles/permissions

- Input validation (DTOs, pipes)

- Common guards/interceptors

### **5.8 Local Dev & Runbook**

- npm i && npm run start:dev

- Seeding scripts if any

- Test data or mock strategies

### **5.9 Deployment Notes (Supabase)**

- Container port must match PORT

- Health check path /health

- Required env vars in Supabase dashboard

## **6) Service‑by‑Service Quick Overview**

This section gives one‑paragraph summaries for orientation. Full docs
for each service should live beside the code using the template above.

### **admin-service**

Back‑office configuration and admin‑level endpoints that affect global
behavior.

### **affiliate-referral-service**

Referral code issuance, tracking, and commission accrual. Interfaces
with invitations and orders/contracts for attribution.

### **algolia-service**

Central indexing pipeline to Algolia; normalizes entities from
listings/user/portfolio for search and autocomplete.

### **api-gateway**

Traffic entry point from frontend; request routing, auth enforcement,
rate limits (if configured), and cross‑service aggregation.

### **auth-service**

Unified auth (email/password + OAuth). Ensures **one account per email**
regardless of provider; issues JWTs for internal services.

### **autocomplete-service**

Low‑latency suggestion API powering marketplace autocomplete and
category hints. Builds from Algolia, listings, and curated terms.

### **content-moderation-service**

Text/media moderation and compliance checks. Can queue async reviews.
Surfaces flags back to UI.

### **favorites-service**

User‑controlled collections (favorites). Supports AI‑generated group
names, CRUD, and sharing rules if enabled.

### **invitations-service**

External invite flows for client stakeholders and collaborators. Handles
rate limits, tokens, and email triggers.

### **listings-service**

Reads editorial content from **Strapi** and combines it with internal
metadata. **Includes core listing entities for *Projects*, *Services*,
*Teams*, and *Talent*** so other microservices can reliably query
listing types and their relationships (e.g., categories, tags, skills,
pricing, and SEO fields). Exposes category pages, breadcrumbs, related
content, and typed endpoints for these four entity classes.

### **portfolio-service**

Talent/company portfolio data, sections, cards, and layout management.
Supports drag‑drop ordering and future editor wiring.

### **time-tracking-service**

Ingests ActivityWatch data (time, app focus, optional screenshots) into
platform for project/time reporting.

### **user-service**

Profiles for client and talent users, stakeholder linking, and
cross‑service identity references.

### **notification-service**

Real‑time and system notifications via Ably (channels, fanout,
presence). Persisted notifications policy is service‑specific.

## **7) Coding Conventions & Shared Modules**

### **7.1 TypeScript/Nest Basics**

- Use strict TypeScript. Enable strict and noImplicitAny.

- DTOs + class-validator for input validation; class-transformer for
  serialization.

- Feature modules per domain (thin controllers, fat services where logic
  lives).

### **7.2 Shared Code**

- Place reusable types, guards, error helpers under /shared.

- **Never** import from one service's src/ into another service; share
  via /shared or a published internal package.

### **7.3 Error Shape**

- Standard error JSON: { code, message, details? }.

- Avoid leaking internals in messages.

### **7.4 Versioned Routes**

- Prefix public APIs with /v1.

- Breaking changes → bump version.

## **8) Documentation Rules (for Humans & AI)**

**Modular, numbered documents --- avoid duplication.** Each service has
a small set of numbered docs, each focused on one topic. Do **not**
repeat content covered in earlier docs; **link** to it. Assume the
reader knows nothing, but only teach what belongs to your doc's scope.

**Doc sections inside each topic (use what applies):**

1.  **Purpose** -- What this doc covers and its boundaries.

2.  **Prerequisites** -- Link to earlier docs in the series if required.

3.  **Docker Setup (Early in the doc)** -- If the doc involves running
    the service, start with the /apps/\<service\>/Dockerfile, container
    build/run, health check, and Supabase notes before diving into code.

4.  **Implementation (topic‑specific)** -- Only the
    modules/DTOs/endpoints that belong to this doc's scope.

5.  **Verification** -- How to test what this doc adds (routes, scripts,
    health, etc.).

6.  **References** -- Pointers to related docs (no copy/paste of their
    content).

**Style:**

- Clear, simple English; short paragraphs.

- Headings and order should be predictable so GPT learns the pattern.

- Use concrete nouns over abstractions.

**Never do:**

- Placeholders like // TODO: implement.

- Renaming existing docs or titles.

- Copying large chunks from other docs --- link instead.

## **8.1) Documentation Series & Numbering (Per Service)**

Use this sequence for each microservice. Keep each document tightly
scoped and reference earlier items instead of duplicating content.

- **Doc 00 -- Service Overview & Repo Placement\**
  Purpose, responsibilities, dependencies, and **exact folder
  placement** under /apps/\<service\>/src. Quick start links to later
  docs.

- **Doc 01 -- Docker & Runtime Setup\**
  Dockerfile, PORT, health endpoint, local run (npm run start:dev), and
  **Supabase** service notes. This section should appear **early**
  whenever runtime is needed.

- **Doc 02 -- Folder Structure & Bootstrapping\**
  app.module.ts, main.ts, module wiring, and configuration loading. No
  endpoints yet.

- **Doc 03 -- Data Models & DTOs\**
  Entities, DTOs, validation, and serialization. Reference (don't
  duplicate) shared types if used.

- **Doc 04 -- API Endpoints\**
  Routes, guards, request/response schemas, and error shapes. No Docker
  or bootstrapping here --- link to Docs 01--03.

- **Doc 05 -- Integrations & Events\**
  Outbound calls (Stripe/QuickBooks/Ably/Algolia), queues, and event
  contracts. Include sequence diagrams where helpful.

- **Doc 06 -- Observability & Health\**
  /health, /ready, logging, metrics, alerts.

- **Doc 07 -- QA & Test Data\**
  Test cases, seed scripts, fixtures, Postman/REST Client collections.

> When extending a service, add a new numbered doc rather than expanding
> older ones unless it's a fundamental change to that area.

## **9) Monorepo Diagram -- Where Code Belongs**

Use this to onboard new contributors and stop root‑level src/ mistakes.

# Only these two top-level directories are for code you'll touch often:

/apps/ \<\-- every microservice lives here

/shared/ \<\-- cross-service types, utils, config only

\# You should NEVER see this in the repo:

/src/ \<\-- ❌ invalid (at repo root)

**Migration Checklist (if you discover a misplaced src/ root):**

1.  Identify which service the files belong to.

2.  Create/confirm apps/\<service-name\>/src/.

3.  Move files; fix import paths (search for from \"../../ patterns).

4.  Verify tsconfig.json paths; update if needed.

5.  Run npm run start:dev for that service and hit /health.

6.  Push PR with a note: "Repo‑root src/ cleanup → moved to apps//src".

## **10) CI/CD Notes (Short)**

- Standard path is **GitHub Actions → Supabase** per service.

- Health path is /health; ensure PORT env var and container port match.

- Some services may be manually deployed; when documenting, include the
  exact steps used for that service today.

## **11) Appendix -- Quick Reference**

**Common Env Vars**

- DATABASE_URL -- Shared Postgres connection on Supabase (service‑scoped
  schemas/tables)

- PORT -- Service HTTP port (expose in Dockerfile)

- JWT_SECRET -- Auth token secret (for auth‑bound services)

- REDIS_URL, RABBITMQ_URL -- Cache/queue endpoints

- ABLY_API_KEY, ALGOLIA_APP_ID, ALGOLIA_API_KEY -- Realtime/search

- STRIPE_SECRET_KEY -- Payments

- QUICKBOOKS_CLIENT_ID/SECRET -- Accounting integrations

**Health Endpoint Example (NestJS)**

****\@Get(\'health\')

health() {

return { status: \'ok\' };

}

**Dockerfile Skeleton**

****FROM node:20-alpine

WORKDIR /usr/src/app

COPY package\*.json ./

RUN npm ci

COPY . .

RUN npm run build

EXPOSE \$PORT

CMD \[\"node\", \"dist/main.js\"\]

**Supabase Health Check**

- Path: /health

- Success Codes: 200--299

- Timeout: 10s (adjust if init is slower)

## **12) What To Do Next (For Documentation Engineers)**

1.  Pick one service missing a complete doc.

2.  Create a new doc using **Section 5 -- Service Template**.

3.  Validate the folder structure; fix any root‑level src/ leaks.

4.  Embed full implementation details; remove all placeholders.

5.  Submit for review; once approved, add it to the AI training set.
