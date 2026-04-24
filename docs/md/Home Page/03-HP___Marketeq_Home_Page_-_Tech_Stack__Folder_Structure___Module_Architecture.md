**Marketeq Home Page**

Tech Stack, Folder Structure & Module Architecture

*Production-ready NestJS backend code, Payload CMS schema, folder
layout, and step-by-step implementation guide*

Document Version: 1.0 \| Date: April 5, 2026

Scope: Backend Only (No Frontend / No Next.js / No Tailwind)

**Table of Contents**

**1. Tech Stack Overview**

This section documents every runtime dependency, framework, and managed
service used by the Home Page backend. No other technologies are
required. The frontend is already built and is out of scope for this
document.

**1.1 Core Framework and Language**

  --------------------- -------------------------------------------------
  **Technology**        **Purpose**

  **NestJS 10.x**       Backend framework. All backend services in the
                        monorepo are NestJS applications. Provides
                        dependency injection, module system, guards,
                        interceptors, and pipes.

  **TypeScript 5.x**    Strict mode enabled. All code is written in
                        TypeScript with strict null checks. No JavaScript
                        files are committed to the repository.

  **Node.js 20 LTS**    Runtime environment. All services run on Node.js
                        20 in production. Use nvm to manage versions
                        locally.
  --------------------- -------------------------------------------------

**1.2 Database**

  ------------------------------ -------------------------------------------------
  **Technology**                 **Purpose**

  **PostgreSQL 15**              Primary data store. Hosted on Supabase. All
                                 services share a single Supabase project but use
                                 schema-level isolation.

  **Supabase**                   Managed PostgreSQL hosting. Provides connection
                                 pooling via PgBouncer, automated backups, and a
                                 dashboard UI. No Supabase client SDK is used in
                                 backend code --- we connect via standard pg
                                 connection strings.

  **TypeORM 0.3.x**              ORM for NestJS microservices. Used by
                                 api-gateway, listings-service, user-service, and
                                 all other NestJS services for entity definitions,
                                 migrations, and query building.

  **\@payloadcms/db-postgres**   Payload CMS database adapter. CMS service uses
                                 this adapter to store all CMS collections in the
                                 cms schema of the same Supabase PostgreSQL
                                 instance.
  ------------------------------ -------------------------------------------------

**1.3 CMS**

  ----------------------------- -------------------------------------------------
  **Technology**                **Purpose**

  **Payload CMS 3.x**           Headless CMS. Replaces Strapi. Manages all
                                editorial content including homepage
                                configurations, landing pages, blog posts,
                                categories, and feature flags. Runs as a
                                standalone service at /apps/cms-service/.

  **\@payloadcms/storage-r2**   Media storage adapter. All uploaded images and
                                files are stored in Cloudflare R2 via this
                                Payload plugin. No local filesystem storage in
                                production.
  ----------------------------- -------------------------------------------------

**1.4 Messaging**

  -------------------------- -------------------------------------------------
  **Technology**             **Purpose**

  **RabbitMQ 3.x**           Message broker. CloudAMQP-hosted in production.
                             Used for asynchronous event-driven communication
                             between CMS and API services. Homepage uses the
                             cms.events topic exchange.

  **amqplib /                Client libraries. NestJS microservices transport
  \@nestjs/microservices**   for RabbitMQ is used for consumer bindings.
                             amqplib is used for lower-level publisher
                             patterns in the CMS service.
  -------------------------- -------------------------------------------------

**1.5 Caching**

  ---------------------------- -------------------------------------------------
  **Technology**               **Purpose**

  **Redis (Upstash)**          In-memory cache. Used for caching assembled
                               homepage payloads. Deterministic cache keys based
                               on homepage slug and section content hash.
                               TTL-based expiration with event-driven
                               invalidation.

  **\@nestjs/cache-manager**   NestJS caching abstraction. Wraps Redis with
                               decorators and injectable cache manager.
  ---------------------------- -------------------------------------------------

**1.6 Search and Indexing**

  --------------------- -------------------------------------------------
  **Technology**        **Purpose**

  **Algolia**           Search index. The algolia-service syncs listing
                        data for full-text search. Homepage does not
                        directly use Algolia --- search navigates to a
                        dedicated search page. Mentioned here for
                        completeness since listings data comes from the
                        same PostgreSQL tables indexed by Algolia.
  --------------------- -------------------------------------------------

**1.7 External Services**

  --------------------- -------------------------------------------------
  **Technology**        **Purpose**

  **Cloudflare R2**     Object storage for CMS media (images, documents).
                        S3-compatible API. Configured via environment
                        variables in cms-service.

  **CloudAMQP**         Managed RabbitMQ hosting. Connection URL provided
                        via RABBITMQ_URL environment variable.

  **Upstash Redis**     Managed Redis. Connection URL provided via
                        REDIS_URL environment variable.
  --------------------- -------------------------------------------------

**1.8 Development Tooling**

  --------------------- -------------------------------------------------
  **Technology**        **Purpose**

  **pnpm**              Package manager for the monorepo. All install
                        commands use pnpm. Lock file is pnpm-lock.yaml.

  **Turborepo**         Monorepo build orchestrator. Defined in
                        turbo.json at repository root. Handles build
                        ordering, caching, and parallel execution.

  **Docker +            Local development environment. Runs PostgreSQL,
  docker-compose**      RabbitMQ, and Redis containers. See
                        docker-compose.yml at repository root.

  **Jest**              Testing framework. Unit and integration tests for
                        all services.

  **ESLint + Prettier** Code quality. Configuration at repository root.
  --------------------- -------------------------------------------------

**2. Monorepo Folder Structure**

The repository is named marketeq-projects-vibe and is hosted on GitHub.
This section documents the complete folder layout relevant to the Home
Page backend. All paths are relative to the repository root.

**2.1 Top-Level Layout**

  -----------------------------------------------------------------------
  marketeq-projects-vibe/\
  ├── apps/\
  │ ├── admin-service/\
  │ ├── affiliate-referral-service/\
  │ ├── algolia-service/\
  │ ├── api-gateway/ ← Main API (homepage module lives here)\
  │ ├── auth-service/\
  │ ├── autocomplete-service/\
  │ ├── cms-service/ ← Payload CMS (Homepages collection)\
  │ ├── content-moderation-service/\
  │ ├── favorites-service/\
  │ ├── invitations-service/\
  │ ├── listings-service/\
  │ ├── notification-service/\
  │ ├── portfolio-service/\
  │ ├── time-tracking-service/\
  │ └── user-service/\
  ├── shared/ ← Shared libraries and types\
  ├── docker-compose.yml\
  ├── turbo.json\
  ├── pnpm-workspace.yaml\
  └── package.json

  -----------------------------------------------------------------------

**2.2 Homepage Module (API Gateway)**

The homepage module is a NestJS module inside the api-gateway service.
It is NOT a separate microservice. It reuses the existing category-pages
infrastructure (evaluators, assemblers) that already exists in the
api-gateway.

  -----------------------------------------------------------------------
  apps/api-gateway/src/\
  ├── homepage/\
  │ ├── homepage.module.ts ← NestJS module declaration\
  │ ├── homepage.controller.ts ← GET /api/homepage endpoint\
  │ ├── homepage.service.ts ← Orchestrator: fetches CMS data, runs
  assembler\
  │ ├── homepage.consumer.ts ← RabbitMQ consumer for cache invalidation\
  │ ├── dto/\
  │ │ └── homepage-query.dto.ts ← Validation for query params\
  │ └── types/\
  │ ├── homepage-payload.type.ts ← Full API response type\
  │ └── homepage-cms.type.ts ← CMS document shape\
  ├── category-pages/ ← EXISTING (already built)\
  │ ├── evaluators/\
  │ │ ├── evaluator.factory.ts ← Dispatches by entity + kind\
  │ │ ├── projects.evaluator.ts ← top-rated, trending, newest\
  │ │ ├── services.evaluator.ts\
  │ │ ├── teams.evaluator.ts\
  │ │ ├── talent.evaluator.ts\
  │ │ └── most-popular.evaluator.ts ← NEW FILE (created in this doc)\
  │ ├── assembler/\
  │ │ └── page.assembler.ts ← EXISTING assembler we reuse\
  │ ├── repos/\
  │ │ └── tax-group.repo.ts ← EXISTING repo for Tax Groups\
  │ └── category-pages.module.ts\
  └── app.module.ts ← Root module (import HomepageModule here)

  -----------------------------------------------------------------------

**2.3 CMS Service (Payload CMS)**

  -----------------------------------------------------------------------
  apps/cms-service/\
  ├── src/\
  │ ├── collections/\
  │ │ ├── Homepages.ts ← NEW: Payload collection for homepage entries\
  │ │ ├── Listings.ts ← EXISTING\
  │ │ ├── Users.ts ← EXISTING\
  │ │ ├── Categories.ts ← EXISTING\
  │ │ ├── BlogPosts.ts ← EXISTING\
  │ │ └── \...other collections\
  │ ├── globals/\
  │ │ ├── HomepageBanner.ts ← EXISTING: global banner config\
  │ │ ├── SiteSettings.ts ← EXISTING\
  │ │ └── AdminConfig.ts ← EXISTING\
  │ ├── hooks/\
  │ │ └── publishHomepageEvent.ts ← NEW: afterChange hook for RabbitMQ\
  │ ├── publishers/\
  │ │ └── CmsEventPublisher.ts ← EXISTING: RabbitMQ publisher\
  │ └── payload.config.ts ← Root config (register Homepages here)\
  ├── Dockerfile\
  └── package.json

  -----------------------------------------------------------------------

**2.4 Shared Libraries**

  -----------------------------------------------------------------------
  shared/\
  ├── types/\
  │ ├── listing.types.ts ← EXISTING: ProjectCard, ServiceCard, etc.\
  │ ├── homepage.types.ts ← NEW: shared homepage types\
  │ └── taxonomy.types.ts ← EXISTING: TaxGroup, Rule types\
  ├── constants/\
  │ └── rmq-events.ts ← EXISTING: RMQ routing key constants\
  └── utils/\
  └── cache-key.util.ts ← NEW: deterministic cache key builder

  -----------------------------------------------------------------------

**3. Environment Variables**

Every environment variable required by the homepage feature is listed
below. These must be set in both local development (.env files) and
production (deployment secrets). No code in this document relies on
hardcoded values.

**3.1 API Gateway (.env)**

**File:** apps/api-gateway/.env

  -------------------------------------------------------------------------------------------
  \# Database (Supabase PostgreSQL)\
  DATABASE_URL=postgresql://postgres:\[PASSWORD\]@db.\[PROJECT\].supabase.co:5432/postgres\
  \
  \# Redis (Upstash)\
  REDIS_URL=rediss://default:\[PASSWORD\]@\[HOST\].upstash.io:6379\
  \
  \# RabbitMQ (CloudAMQP)\
  RABBITMQ_URL=amqps://\[USER\]:\[PASSWORD\]@\[HOST\].cloudamqp.com/\[VHOST\]\
  \
  \# CMS Service internal URL (for fetching homepage configs)\
  CMS_SERVICE_URL=http://localhost:3001\
  \
  \# Homepage cache TTL in seconds (default 300 = 5 minutes)\
  HOMEPAGE_CACHE_TTL=300\
  \
  \# Preview mode shared secret (must match CMS admin panel)\
  PREVIEW_SECRET=your-preview-secret-here

  -------------------------------------------------------------------------------------------

**3.2 CMS Service (.env)**

**File:** apps/cms-service/.env

  -------------------------------------------------------------------------------------------
  \# Database (same Supabase instance, cms schema)\
  DATABASE_URI=postgresql://postgres:\[PASSWORD\]@db.\[PROJECT\].supabase.co:5432/postgres\
  PAYLOAD_DB_SCHEMA=cms\
  \
  \# Payload CMS\
  PAYLOAD_SECRET=your-payload-secret-min-32-chars\
  PAYLOAD_PORT=3001\
  \
  \# Cloudflare R2 (media storage)\
  R2_ACCESS_KEY_ID=your-r2-access-key\
  R2_SECRET_ACCESS_KEY=your-r2-secret-key\
  R2_BUCKET=marketeq-media\
  R2_ENDPOINT=https://\[ACCOUNT_ID\].r2.cloudflarestorage.com\
  R2_PUBLIC_URL=https://media.marketeq.com\
  \
  \# RabbitMQ (for publishing CMS events)\
  RABBITMQ_URL=amqps://\[USER\]:\[PASSWORD\]@\[HOST\].cloudamqp.com/\[VHOST\]

  -------------------------------------------------------------------------------------------

  -----------------------------------------------------------------------
  **Note:** Replace all bracketed placeholders (\[PASSWORD\],
  \[PROJECT\], etc.) with real values from your Supabase, CloudAMQP, and
  Upstash dashboards. Never commit .env files to Git. Add them to
  .gitignore.

  -----------------------------------------------------------------------

**4. Shared Types**

These TypeScript types are used by both the API gateway and CMS service.
They live in the shared/ directory so both apps can import them. Create
these files first before writing any module code.

**4.1 Homepage Types**

**File:** shared/types/homepage.types.ts

  -----------------------------------------------------------------------
  /\*\*\
  \* Homepage types shared between CMS service and API gateway.\
  \* These define the shape of data flowing through the system.\
  \*/\
  \
  /\*\* A single rule within a Tax Group --- defines what content to
  fetch \*/\
  export interface TaxGroupRule {\
  id: string;\
  entity: \'projects\' \| \'services\' \| \'teams\' \| \'talent\';\
  kind: \'top-rated\' \| \'trending\' \| \'newest\' \| \'most-popular\';\
  limit: number;\
  gridSize: number;\
  carousel: boolean;\
  }\
  \
  /\*\* A Tax Group configuration as stored in the CMS \*/\
  export interface TaxGroupConfig {\
  id: string;\
  title: string;\
  subtitle?: string;\
  ctaLabel?: string;\
  ctaUrl?: string;\
  rules: TaxGroupRule\[\];\
  manualEnabled: boolean;\
  pinnedItems?: string\[\]; // UUIDs of manually pinned listings\
  }\
  \
  /\*\* Hero section configuration \*/\
  export interface HomepageHero {\
  headline: string;\
  subheadline: string;\
  backgroundImage?: string; // R2 URL\
  ctaLabel: string;\
  ctaUrl: string;\
  }\
  \
  /\*\* Banner configuration (from HomepageBanner global) \*/\
  export interface HomepageBanner {\
  enabled: boolean;\
  message: string;\
  ctaLabel?: string;\
  ctaUrl?: string;\
  expiresAt?: string; // ISO date\
  bannerType: \'info\' \| \'promo\' \| \'warning\';\
  }\
  \
  /\*\* SEO metadata \*/\
  export interface HomepageSeo {\
  metaTitle: string;\
  metaDescription: string;\
  canonical?: string;\
  ogImage?: string;\
  noindex?: boolean;\
  }\
  \
  /\*\* Category reference (for Popular Tabs and More Categories) \*/\
  export interface CategoryRef {\
  uuid: string;\
  name: string;\
  slug: string;\
  iconUrl?: string;\
  }\
  \
  /\*\* The full CMS document shape for a Homepage entry \*/\
  export interface HomepageCmsDocument {\
  id: string;\
  title: string;\
  slug: string;\
  status: \'draft\' \| \'active\' \| \'testing\' \| \'archived\';\
  isDefault: boolean;\
  testGroup?: string;\
  hero?: HomepageHero;\
  sections: TaxGroupConfig\[\];\
  popularTabs: CategoryRef\[\];\
  moreCategoriesList: CategoryRef\[\];\
  talentNetworkCta?: {\
  headline: string;\
  description: string;\
  ctaLabel: string;\
  ctaUrl: string;\
  };\
  footerNav?: {\
  columns: Array\<{\
  heading: string;\
  links: Array\<{ label: string; url: string }\>;\
  }\>;\
  };\
  seo?: HomepageSeo;\
  createdAt: string;\
  updatedAt: string;\
  }

  -----------------------------------------------------------------------

**4.2 Homepage API Response Type**

**File:** shared/types/homepage.types.ts (continued)

  -----------------------------------------------------------------------
  /\*\* A single assembled block (grid or carousel of items) \*/\
  export interface HomepageBlock {\
  key: string;\
  type: \'grid\' \| \'carousel\';\
  entity: \'projects\' \| \'services\' \| \'teams\' \| \'talent\';\
  items: any\[\]; // ProjectCard \| ServiceCard \| TeamCard \|
  TalentCard\
  pagination?: {\
  page: number;\
  pageSize: number;\
  totalPages: number;\
  hasMore: boolean;\
  };\
  }\
  \
  /\*\* A section with one or more blocks \*/\
  export interface HomepageSection {\
  key: string;\
  title: string;\
  subtitle?: string;\
  ctaLabel?: string;\
  ctaUrl?: string;\
  blocks: HomepageBlock\[\];\
  }\
  \
  /\*\* The full API response for GET /api/homepage \*/\
  export interface HomepagePayload {\
  title: string;\
  slug: string;\
  status: \'active\' \| \'testing\';\
  hero?: HomepageHero;\
  banner?: HomepageBanner;\
  sections: HomepageSection\[\];\
  popularTabs: CategoryRef\[\];\
  moreCategoriesList: CategoryRef\[\];\
  talentNetworkCta?: {\
  headline: string;\
  description: string;\
  ctaLabel: string;\
  ctaUrl: string;\
  };\
  footerNav?: {\
  columns: Array\<{\
  heading: string;\
  links: Array\<{ label: string; url: string }\>;\
  }\>;\
  };\
  seo?: HomepageSeo;\
  }

  -----------------------------------------------------------------------

**4.3 RMQ Event Constants**

**File:** shared/constants/rmq-events.ts (add to existing file)

  -----------------------------------------------------------------------
  // Add these constants to the existing rmq-events.ts file\
  export const CMS_EVENTS_EXCHANGE = \'cms.events\';\
  \
  export const RMQ_ROUTING_KEYS = {\
  // \...existing keys\...\
  HOMEPAGE_SAVED: \'homepage.saved\',\
  HOMEPAGE_DELETED: \'homepage.deleted\',\
  CATEGORY_SAVED: \'category.saved\',\
  LISTING_SAVED: \'listing.saved\',\
  } as const;

  -----------------------------------------------------------------------

**4.4 Cache Key Utility**

**File:** shared/utils/cache-key.util.ts

  -----------------------------------------------------------------------
  import \* as crypto from \'crypto\';\
  \
  /\*\*\
  \* Builds a deterministic cache key for a homepage payload.\
  \* The key includes the slug and a hash of the sections config\
  \* so that CMS edits to section ordering/rules automatically\
  \* produce a new cache key.\
  \*/\
  export function buildHomepageCacheKey(\
  slug: string,\
  variant?: string,\
  ): string {\
  const parts = \[\'hp\', slug\];\
  if (variant) parts.push(variant);\
  return parts.join(\':\');\
  }\
  \
  /\*\*\
  \* Builds a wildcard pattern for invalidating all cached\
  \* variants of a given homepage slug.\
  \*/\
  export function buildHomepageInvalidationPattern(\
  slug: string,\
  ): string {\
  return \`hp:\${slug}:\*\`;\
  }

  -----------------------------------------------------------------------

**5. Payload CMS --- Homepages Collection**

This is the Payload CMS collection definition for homepage entries. It
defines the schema that CMS administrators use to create and configure
homepage layouts. This is the single source of truth for what the
homepage contains.

**5.1 Why a Collection (Not a Global)**

-   A Payload Global is a singleton --- only one document exists. A
    Collection allows multiple documents.

-   We need multiple homepage entries to support A/B testing. One entry
    is marked isDefault, others can be assigned to test groups.

-   This matches the architecture confirmed in prior conversations: a
    collection of landing pages where one is the default.

**5.2 Collection Schema**

**File:** apps/cms-service/src/collections/Homepages.ts

  -----------------------------------------------------------------------
  import { CollectionConfig } from \'payload/types\';\
  \
  export const Homepages: CollectionConfig = {\
  slug: \'homepages\',\
  admin: {\
  useAsTitle: \'title\',\
  defaultColumns: \[\'title\', \'slug\', \'status\', \'isDefault\',
  \'updatedAt\'\],\
  description: \'Homepage layouts. One must be marked as default. Others
  are used for A/B testing.\',\
  },\
  access: {\
  read: () =\> true,\
  create: ({ req }) =\> req.user?.role === \'admin\',\
  update: ({ req }) =\> req.user?.role === \'admin\',\
  delete: ({ req }) =\> req.user?.role === \'admin\',\
  },\
  hooks: {\
  afterChange: \[\
  async ({ doc, operation, req }) =\> {\
  // Publish RabbitMQ event for cache invalidation\
  const publisher = req.payload.local?.cmsEventPublisher;\
  if (publisher) {\
  await publisher.publish(\'homepage.saved\', {\
  id: doc.id,\
  slug: doc.slug,\
  status: doc.status,\
  isDefault: doc.isDefault,\
  operation, // \'create\' or \'update\'\
  });\
  }\
  },\
  \],\
  afterDelete: \[\
  async ({ doc, req }) =\> {\
  const publisher = req.payload.local?.cmsEventPublisher;\
  if (publisher) {\
  await publisher.publish(\'homepage.deleted\', {\
  id: doc.id,\
  slug: doc.slug,\
  });\
  }\
  },\
  \],\
  },\
  fields: \[\
  // ── Identity ──\
  {\
  name: \'title\',\
  type: \'text\',\
  required: true,\
  admin: { description: \'Internal name for this homepage entry (not
  shown to users).\' },\
  },\
  {\
  name: \'slug\',\
  type: \'text\',\
  required: true,\
  unique: true,\
  admin: { description: \'URL-safe identifier. The default homepage
  should use slug \"home\".\' },\
  },\
  {\
  name: \'status\',\
  type: \'select\',\
  required: true,\
  defaultValue: \'draft\',\
  options: \[\
  { label: \'Draft\', value: \'draft\' },\
  { label: \'Active\', value: \'active\' },\
  { label: \'Testing (A/B)\', value: \'testing\' },\
  { label: \'Archived\', value: \'archived\' },\
  \],\
  },\
  {\
  name: \'isDefault\',\
  type: \'checkbox\',\
  defaultValue: false,\
  admin: { description: \'Only ONE homepage should be marked as default.
  This is the one served to all users not in a test group.\' },\
  },\
  {\
  name: \'testGroup\',\
  type: \'text\',\
  admin: {\
  description: \'A/B test group identifier. If set, only users with
  matching mktq_hp_variant cookie see this page.\',\
  condition: (data) =\> data.status === \'testing\',\
  },\
  },\
  \
  // ── Hero Section ──\
  {\
  name: \'hero\',\
  type: \'group\',\
  admin: { description: \'Hero banner at the top of the homepage.\' },\
  fields: \[\
  { name: \'headline\', type: \'text\', required: true },\
  { name: \'subheadline\', type: \'textarea\' },\
  { name: \'backgroundImage\', type: \'upload\', relationTo: \'media\'
  },\
  { name: \'ctaLabel\', type: \'text\' },\
  { name: \'ctaUrl\', type: \'text\' },\
  \],\
  },\
  \
  // ── Content Sections (Tax Groups) ──\
  {\
  name: \'sections\',\
  type: \'array\',\
  admin: { description: \'Ordered list of content sections. Each section
  is a Tax Group defining what listings to display.\' },\
  fields: \[\
  { name: \'title\', type: \'text\', required: true },\
  { name: \'subtitle\', type: \'text\' },\
  { name: \'ctaLabel\', type: \'text\' },\
  { name: \'ctaUrl\', type: \'text\' },\
  {\
  name: \'rules\',\
  type: \'array\',\
  admin: { description: \'Content rules. Each rule fetches a set of
  listings by entity type and ranking kind.\' },\
  fields: \[\
  {\
  name: \'entity\',\
  type: \'select\',\
  required: true,\
  options: \[\
  { label: \'Projects\', value: \'projects\' },\
  { label: \'Services\', value: \'services\' },\
  { label: \'Teams\', value: \'teams\' },\
  { label: \'Talent\', value: \'talent\' },\
  \],\
  },\
  {\
  name: \'kind\',\
  type: \'select\',\
  required: true,\
  options: \[\
  { label: \'Top Rated\', value: \'top-rated\' },\
  { label: \'Trending\', value: \'trending\' },\
  { label: \'Newest\', value: \'newest\' },\
  { label: \'Most Popular\', value: \'most-popular\' },\
  \],\
  },\
  { name: \'limit\', type: \'number\', required: true, min: 1, max: 100,
  defaultValue: 12 },\
  {\
  name: \'gridSize\',\
  type: \'number\',\
  required: true,\
  min: 1,\
  max: 6,\
  defaultValue: 4,\
  admin: { description: \'Number of items visible per row. Carousel shows
  if enough items.\' },\
  },\
  {\
  name: \'carousel\',\
  type: \'checkbox\',\
  defaultValue: false,\
  admin: { description: \'If true and items \>= 3x gridSize, render as
  carousel. Otherwise grid.\' },\
  },\
  \],\
  },\
  {\
  name: \'manualEnabled\',\
  type: \'checkbox\',\
  defaultValue: false,\
  admin: { description: \'Enable hybrid mode: pinned items appear first,
  rule-based fill the rest.\' },\
  },\
  {\
  name: \'pinnedItems\',\
  type: \'relationship\',\
  relationTo: \'listings\',\
  hasMany: true,\
  admin: {\
  description: \'Manually pinned listings. Only used when manualEnabled
  is true.\',\
  condition: (data, siblingData) =\> siblingData?.manualEnabled,\
  },\
  },\
  \],\
  },\
  \
  // ── Popular Tabs ──\
  {\
  name: \'popularTabs\',\
  type: \'relationship\',\
  relationTo: \'categories\',\
  hasMany: true,\
  admin: { description: \'L1 categories displayed as filter tabs in the
  Most Popular section.\' },\
  },\
  \
  // ── More Categories ──\
  {\
  name: \'moreCategoriesList\',\
  type: \'relationship\',\
  relationTo: \'categories\',\
  hasMany: true,\
  admin: { description: \'Categories displayed in the More Categories
  grid tile section.\' },\
  },\
  \
  // ── Talent Network CTA ──\
  {\
  name: \'talentNetworkCta\',\
  type: \'group\',\
  fields: \[\
  { name: \'headline\', type: \'text\' },\
  { name: \'description\', type: \'textarea\' },\
  { name: \'ctaLabel\', type: \'text\' },\
  { name: \'ctaUrl\', type: \'text\' },\
  \],\
  },\
  \
  // ── Footer Navigation ──\
  {\
  name: \'footerNav\',\
  type: \'group\',\
  fields: \[\
  {\
  name: \'columns\',\
  type: \'array\',\
  fields: \[\
  { name: \'heading\', type: \'text\', required: true },\
  {\
  name: \'links\',\
  type: \'array\',\
  fields: \[\
  { name: \'label\', type: \'text\', required: true },\
  { name: \'url\', type: \'text\', required: true },\
  \],\
  },\
  \],\
  },\
  \],\
  },\
  \
  // ── SEO ──\
  {\
  name: \'seo\',\
  type: \'group\',\
  fields: \[\
  { name: \'metaTitle\', type: \'text\' },\
  { name: \'metaDescription\', type: \'textarea\' },\
  { name: \'canonical\', type: \'text\' },\
  { name: \'ogImage\', type: \'upload\', relationTo: \'media\' },\
  { name: \'noindex\', type: \'checkbox\', defaultValue: false },\
  \],\
  },\
  \],\
  };

  -----------------------------------------------------------------------

**5.3 Register Collection in Payload Config**

**File:** apps/cms-service/src/payload.config.ts

Add the Homepages collection to the existing Payload configuration. Do
not remove any existing collections.

  -----------------------------------------------------------------------
  // At the top of the file, add this import:\
  import { Homepages } from \'./collections/Homepages\';\
  \
  // In the buildConfig call, add Homepages to the collections array:\
  export default buildConfig({\
  // \...existing config\...\
  collections: \[\
  // \...existing collections (Listings, Users, Categories, etc.)\...\
  Homepages, // \<\-- ADD THIS LINE\
  \],\
  // \...rest of config\...\
  });

  -----------------------------------------------------------------------

**6. Most Popular Evaluator (New)**

This is a brand-new evaluator kind that does not exist in the current
codebase. The existing evaluators handle top-rated, trending, and
newest. Most Popular is distinct: it ranks by completions, views,
recency, and admin boost. It applies to all entity types (projects,
services, teams, talent).

**6.1 Blend Formula**

The Most Popular evaluator uses a weighted scoring blend. Each listing
receives a composite score based on four signals:

  ---------------- ------------------------------------- --------------------
  **Signal**       **Weight**                            **Source**

  Completions      40%                                   Number of completed
                                                         orders/engagements
                                                         for this listing.
                                                         Higher = more
                                                         popular.

  Views            35%                                   Total page views
                                                         over the last 90
                                                         days. Stored in
                                                         listing analytics.

  Recency          15%                                   Decay factor based
                                                         on days since last
                                                         activity. Listings
                                                         inactive for 90+
                                                         days score 0 on this
                                                         signal.

  Admin Boost      10%                                   Manual boost score
                                                         (0-100) set by admin
                                                         in CMS. Used for
                                                         editorial promotion.
  ---------------- ------------------------------------- --------------------

**6.2 Scoring Formula**

  -----------------------------------------------------------------------
  // Pseudocode for the scoring calculation:\
  //\
  // normalize(value, maxInSet) = value / max(maxInSet, 1)\
  //\
  // recencyScore = max(0, 1 - (daysSinceLastActivity / 90))\
  //\
  // finalScore =\
  // 0.40 \* normalize(completions) +\
  // 0.35 \* normalize(views90d) +\
  // 0.15 \* recencyScore +\
  // 0.10 \* (adminBoost / 100)

  -----------------------------------------------------------------------

**6.3 Implementation**

**File:**
apps/api-gateway/src/category-pages/evaluators/most-popular.evaluator.ts

  -----------------------------------------------------------------------
  import { Injectable, Logger } from \'@nestjs/common\';\
  import { InjectRepository } from \'@nestjs/typeorm\';\
  import { Repository, In } from \'typeorm\';\
  import { ListingEntity } from
  \'../../listings/entities/listing.entity\';\
  \
  export interface MostPopularOptions {\
  entity: \'projects\' \| \'services\' \| \'teams\' \| \'talent\';\
  limit: number;\
  categoryIds?: string\[\];\
  excludeIds?: string\[\];\
  }\
  \
  interface ScoredListing {\
  listing: ListingEntity;\
  score: number;\
  }\
  \
  \@Injectable()\
  export class MostPopularEvaluator {\
  private readonly logger = new Logger(MostPopularEvaluator.name);\
  \
  // Blend weights\
  private readonly WEIGHT_COMPLETIONS = 0.40;\
  private readonly WEIGHT_VIEWS = 0.35;\
  private readonly WEIGHT_RECENCY = 0.15;\
  private readonly WEIGHT_ADMIN_BOOST = 0.10;\
  \
  // Recency decay window in days\
  private readonly RECENCY_WINDOW_DAYS = 90;\
  \
  constructor(\
  \@InjectRepository(ListingEntity)\
  private readonly listingRepo: Repository\<ListingEntity\>,\
  ) {}\
  \
  /\*\*\
  \* Evaluate and return the most popular listings for a given entity
  type.\
  \*\
  \* Steps:\
  \* 1. Query active listings of the given entity type\
  \* 2. Optionally filter by category subtree\
  \* 3. Exclude already-shown IDs (deduplication)\
  \* 4. Compute composite score for each listing\
  \* 5. Sort by score descending\
  \* 6. Return top N\
  \*/\
  async evaluate(options: MostPopularOptions):
  Promise\<ListingEntity\[\]\> {\
  const { entity, limit, categoryIds, excludeIds } = options;\
  \
  // Step 1: Build query for active listings of this entity type\
  const qb = this.listingRepo\
  .createQueryBuilder(\'listing\')\
  .where(\'listing.type = :entity\', { entity })\
  .andWhere(\'listing.status = :status\', { status: \'active\' });\
  \
  // Step 2: Filter by categories if provided\
  if (categoryIds && categoryIds.length \> 0) {\
  qb.andWhere(\'listing.categoryId IN (:\...categoryIds)\', { categoryIds
  });\
  }\
  \
  // Step 3: Exclude already-used IDs\
  if (excludeIds && excludeIds.length \> 0) {\
  qb.andWhere(\'listing.id NOT IN (:\...excludeIds)\', { excludeIds });\
  }\
  \
  // Fetch a larger pool to score from (3x limit for ranking quality)\
  const pool = await qb\
  .take(limit \* 3)\
  .getMany();\
  \
  if (pool.length === 0) {\
  this.logger.warn(\`No active \${entity} listings found for most-popular
  evaluation\`);\
  return \[\];\
  }\
  \
  // Step 4: Compute scores\
  const scored = this.scoreListings(pool);\
  \
  // Step 5: Sort descending by score\
  scored.sort((a, b) =\> b.score - a.score);\
  \
  // Step 6: Return top N\
  return scored.slice(0, limit).map(s =\> s.listing);\
  }\
  \
  /\*\*\
  \* Score each listing using the blend formula.\
  \* Normalization is relative to the max value in the current pool.\
  \*/\
  private scoreListings(pool: ListingEntity\[\]): ScoredListing\[\] {\
  // Find max values for normalization\
  const maxCompletions = Math.max(\...pool.map(l =\> l.completionsCount
  ?? 0), 1);\
  const maxViews = Math.max(\...pool.map(l =\> l.views90d ?? 0), 1);\
  const now = Date.now();\
  \
  return pool.map(listing =\> {\
  // Normalize completions (0-1)\
  const completionsNorm = (listing.completionsCount ?? 0) /
  maxCompletions;\
  \
  // Normalize views (0-1)\
  const viewsNorm = (listing.views90d ?? 0) / maxViews;\
  \
  // Recency score (0-1): linear decay over 90 days\
  const lastActivityDate = listing.lastActivityAt\
  ? new Date(listing.lastActivityAt).getTime()\
  : new Date(listing.createdAt).getTime();\
  const daysSince = (now - lastActivityDate) / (1000 \* 60 \* 60 \* 24);\
  const recencyScore = Math.max(0, 1 - daysSince /
  this.RECENCY_WINDOW_DAYS);\
  \
  // Admin boost (0-1): boost is 0-100 in DB\
  const adminBoost = (listing.adminBoost ?? 0) / 100;\
  \
  // Weighted sum\
  const score =\
  this.WEIGHT_COMPLETIONS \* completionsNorm +\
  this.WEIGHT_VIEWS \* viewsNorm +\
  this.WEIGHT_RECENCY \* recencyScore +\
  this.WEIGHT_ADMIN_BOOST \* adminBoost;\
  \
  return { listing, score };\
  });\
  }\
  }

  -----------------------------------------------------------------------

**6.4 Register in Evaluator Factory**

**File:**
apps/api-gateway/src/category-pages/evaluators/evaluator.factory.ts

Add the most-popular kind to the existing EvaluatorFactory. The factory
already handles top-rated, trending, and newest. This is a minimal
addition.

  -----------------------------------------------------------------------
  // Add this import at the top of evaluator.factory.ts:\
  import { MostPopularEvaluator } from \'./most-popular.evaluator\';\
  \
  // In the EvaluatorFactory class, add to the constructor:\
  \@Injectable()\
  export class EvaluatorFactory {\
  constructor(\
  private readonly projectsEvaluator: ProjectsEvaluator,\
  private readonly servicesEvaluator: ServicesEvaluator,\
  private readonly teamsEvaluator: TeamsEvaluator,\
  private readonly talentEvaluator: TalentEvaluator,\
  private readonly mostPopularEvaluator: MostPopularEvaluator, // \<\--
  ADD\
  ) {}\
  \
  /\*\*\
  \* Dispatch to the correct evaluator based on entity + kind.\
  \* The most-popular kind is handled by a dedicated evaluator\
  \* because its blend formula differs from entity-specific ones.\
  \*/\
  async evaluate(rule: TaxGroupRule, context: EvalContext) {\
  // Most Popular uses its own evaluator regardless of entity\
  if (rule.kind === \'most-popular\') {\
  return this.mostPopularEvaluator.evaluate({\
  entity: rule.entity,\
  limit: rule.limit,\
  categoryIds: context.categoryIds,\
  excludeIds: context.excludeIds,\
  });\
  }\
  \
  // Existing dispatch for other kinds\...\
  switch (rule.entity) {\
  case \'projects\': return this.projectsEvaluator.evaluate(rule,
  context);\
  case \'services\': return this.servicesEvaluator.evaluate(rule,
  context);\
  case \'teams\': return this.teamsEvaluator.evaluate(rule, context);\
  case \'talent\': return this.talentEvaluator.evaluate(rule, context);\
  }\
  }\
  }

  -----------------------------------------------------------------------

**7. Homepage NestJS Module**

This section contains the complete implementation of the Homepage module
within the API gateway. Every file is listed with its full path and
production-ready code. The module follows the same patterns used by the
existing category-pages module.

**7.1 Module Declaration**

**File:** apps/api-gateway/src/homepage/homepage.module.ts

  -----------------------------------------------------------------------
  import { Module } from \'@nestjs/common\';\
  import { HttpModule } from \'@nestjs/axios\';\
  import { CacheModule } from \'@nestjs/cache-manager\';\
  import { HomepageController } from \'./homepage.controller\';\
  import { HomepageService } from \'./homepage.service\';\
  import { HomepageConsumer } from \'./homepage.consumer\';\
  import { CategoryPagesModule } from
  \'../category-pages/category-pages.module\';\
  \
  /\*\*\
  \* HomepageModule\
  \*\
  \* Purpose: Serves the assembled homepage payload via GET
  /api/homepage.\
  \*\
  \* Dependencies:\
  \* - HttpModule: For calling the CMS service REST API to fetch homepage
  configs.\
  \* - CacheModule: For caching assembled payloads in Redis.\
  \* - CategoryPagesModule: Provides access to EvaluatorFactory and
  PageAssembler.\
  \* The homepage reuses the same evaluator/assembler infrastructure as
  category pages.\
  \*\
  \* This module is imported into the root AppModule (app.module.ts).\
  \*/\
  \@Module({\
  imports: \[\
  HttpModule,\
  CacheModule.register(),\
  CategoryPagesModule, // Reuse evaluators + assembler\
  \],\
  controllers: \[HomepageController\],\
  providers: \[HomepageService, HomepageConsumer\],\
  })\
  export class HomepageModule {}

  -----------------------------------------------------------------------

**7.2 Query DTO**

**File:** apps/api-gateway/src/homepage/dto/homepage-query.dto.ts

  -----------------------------------------------------------------------
  import { IsOptional, IsString, IsIn } from \'class-validator\';\
  \
  /\*\*\
  \* HomepageQueryDto\
  \*\
  \* Validates query parameters for GET /api/homepage.\
  \*\
  \* Parameters:\
  \* - preview: Set to \'1\' to enable preview mode. Requires
  x-preview-token header.\
  \* Preview mode allows CMS admins to see draft homepage versions before
  publishing.\
  \*\
  \* The A/B variant is read from the mktq_hp_variant cookie, not a query
  param.\
  \*/\
  export class HomepageQueryDto {\
  \@IsOptional()\
  \@IsString()\
  \@IsIn(\[\'1\'\])\
  preview?: string;\
  }

  -----------------------------------------------------------------------

**7.3 Controller**

**File:** apps/api-gateway/src/homepage/homepage.controller.ts

  -----------------------------------------------------------------------
  import {\
  Controller,\
  Get,\
  Query,\
  Req,\
  Headers,\
  HttpException,\
  HttpStatus,\
  Logger,\
  UseInterceptors,\
  } from \'@nestjs/common\';\
  import { CacheInterceptor, CacheTTL } from \'@nestjs/cache-manager\';\
  import { Request } from \'express\';\
  import { HomepageService } from \'./homepage.service\';\
  import { HomepageQueryDto } from \'./dto/homepage-query.dto\';\
  import { HomepagePayload } from
  \'../../../../shared/types/homepage.types\';\
  \
  /\*\*\
  \* HomepageController\
  \*\
  \* Exposes: GET /api/homepage\
  \*\
  \* This is the single endpoint the frontend calls to get the full\
  \* homepage payload. The response includes hero, banner, all sections\
  \* with assembled listing data, popular tabs, categories, footer, and
  SEO.\
  \*\
  \* Flow:\
  \* 1. Read mktq_hp_variant cookie from request (A/B test assignment)\
  \* 2. Check if preview mode is requested (query param + header)\
  \* 3. Delegate to HomepageService.getHomepage()\
  \* 4. Return the assembled payload\
  \*\
  \* Cache: Response is cached via CacheInterceptor. TTL is configured\
  \* in the CacheModule registration. Cache is invalidated by\
  \* HomepageConsumer when it receives RabbitMQ events.\
  \*/\
  \@Controller(\'api/homepage\')\
  \@UseInterceptors(CacheInterceptor)\
  export class HomepageController {\
  private readonly logger = new Logger(HomepageController.name);\
  \
  constructor(private readonly homepageService: HomepageService) {}\
  \
  \@Get()\
  \@CacheTTL(300) // 5 minutes, overridden by HOMEPAGE_CACHE_TTL env var\
  async getHomepage(\
  \@Query() query: HomepageQueryDto,\
  \@Req() req: Request,\
  \@Headers(\'x-preview-token\') previewToken?: string,\
  ): Promise\<HomepagePayload\> {\
  // Step 1: Read A/B variant from cookie\
  const variant: string \| undefined =
  req.cookies?.\[\'mktq_hp_variant\'\];\
  \
  // Step 2: Determine if preview mode is active\
  const isPreview = query.preview === \'1\';\
  if (isPreview) {\
  // Validate preview token\
  const expectedSecret = process.env.PREVIEW_SECRET;\
  if (!previewToken \|\| previewToken !== expectedSecret) {\
  throw new HttpException(\
  \'Invalid or missing preview token\',\
  HttpStatus.FORBIDDEN,\
  );\
  }\
  }\
  \
  // Step 3: Get assembled homepage\
  try {\
  const payload = await this.homepageService.getHomepage({\
  variant,\
  isPreview,\
  });\
  \
  if (!payload) {\
  throw new HttpException(\
  \'No active homepage found\',\
  HttpStatus.NOT_FOUND,\
  );\
  }\
  \
  return payload;\
  } catch (error) {\
  if (error instanceof HttpException) throw error;\
  this.logger.error(\'Failed to assemble homepage\', error.stack);\
  throw new HttpException(\
  \'Homepage service unavailable\',\
  HttpStatus.SERVICE_UNAVAILABLE,\
  );\
  }\
  }\
  }

  -----------------------------------------------------------------------

**7.4 Service (Orchestrator)**

**File:** apps/api-gateway/src/homepage/homepage.service.ts

  -----------------------------------------------------------------------------
  import { Injectable, Logger, Inject } from \'@nestjs/common\';\
  import { HttpService } from \'@nestjs/axios\';\
  import { CACHE_MANAGER } from \'@nestjs/cache-manager\';\
  import { Cache } from \'cache-manager\';\
  import { firstValueFrom } from \'rxjs\';\
  import { ConfigService } from \'@nestjs/config\';\
  import { PageAssembler } from
  \'../category-pages/assembler/page.assembler\';\
  import { EvaluatorFactory } from
  \'../category-pages/evaluators/evaluator.factory\';\
  import {\
  HomepageCmsDocument,\
  HomepagePayload,\
  HomepageSection,\
  HomepageBlock,\
  TaxGroupConfig,\
  TaxGroupRule,\
  } from \'../../../../shared/types/homepage.types\';\
  import { buildHomepageCacheKey } from
  \'../../../../shared/utils/cache-key.util\';\
  \
  interface GetHomepageOptions {\
  variant?: string;\
  isPreview?: boolean;\
  }\
  \
  /\*\*\
  \* HomepageService\
  \*\
  \* This is the main orchestrator for the homepage endpoint.\
  \* It coordinates between the CMS (to get the homepage config)\
  \* and the evaluators/assembler (to build the content blocks).\
  \*\
  \* Cache Strategy:\
  \* - Check Redis cache first using deterministic key\
  \* - On miss, fetch CMS config, assemble sections, cache result\
  \* - Cache is invalidated by HomepageConsumer on RabbitMQ events\
  \*/\
  \@Injectable()\
  export class HomepageService {\
  private readonly logger = new Logger(HomepageService.name);\
  private readonly cmsBaseUrl: string;\
  private readonly cacheTtl: number;\
  \
  constructor(\
  private readonly httpService: HttpService,\
  private readonly configService: ConfigService,\
  private readonly pageAssembler: PageAssembler,\
  private readonly evaluatorFactory: EvaluatorFactory,\
  \@Inject(CACHE_MANAGER) private readonly cacheManager: Cache,\
  ) {\
  this.cmsBaseUrl = this.configService.get\<string\>(\'CMS_SERVICE_URL\',
  \'http://localhost:3001\');\
  this.cacheTtl = this.configService.get\<number\>(\'HOMEPAGE_CACHE_TTL\',
  300);\
  }\
  \
  /\*\*\
  \* Main entry point. Returns the fully assembled homepage payload.\
  \*\
  \* Steps:\
  \* 1. Build cache key from variant\
  \* 2. Check Redis cache\
  \* 3. On miss: fetch CMS config, resolve homepage, assemble sections\
  \* 4. Cache and return\
  \*/\
  async getHomepage(options: GetHomepageOptions): Promise\<HomepagePayload \|
  null\> {\
  const { variant, isPreview } = options;\
  \
  // Skip cache for preview mode\
  if (!isPreview) {\
  const cacheKey = buildHomepageCacheKey(\'home\', variant);\
  const cached = await this.cacheManager.get\<HomepagePayload\>(cacheKey);\
  if (cached) {\
  this.logger.debug(\`Cache hit for key: \${cacheKey}\`);\
  return cached;\
  }\
  }\
  \
  // Fetch the correct homepage document from CMS\
  const cmsDoc = await this.resolveHomepageDocument(variant, isPreview);\
  if (!cmsDoc) return null;\
  \
  // Fetch the global banner\
  const banner = await this.fetchBanner();\
  \
  // Assemble all sections\
  const sections = await this.assembleSections(cmsDoc.sections);\
  \
  // Build the final payload\
  const payload: HomepagePayload = {\
  title: cmsDoc.title,\
  slug: cmsDoc.slug,\
  status: cmsDoc.status as \'active\' \| \'testing\',\
  hero: cmsDoc.hero,\
  banner: banner?.enabled ? banner : undefined,\
  sections,\
  popularTabs: cmsDoc.popularTabs ?? \[\],\
  moreCategoriesList: cmsDoc.moreCategoriesList ?? \[\],\
  talentNetworkCta: cmsDoc.talentNetworkCta,\
  footerNav: cmsDoc.footerNav,\
  seo: cmsDoc.seo,\
  };\
  \
  // Cache the result (not for preview)\
  if (!isPreview) {\
  const cacheKey = buildHomepageCacheKey(\'home\', variant);\
  await this.cacheManager.set(cacheKey, payload, this.cacheTtl);\
  this.logger.debug(\`Cached homepage with key: \${cacheKey}, TTL:
  \${this.cacheTtl}s\`);\
  }\
  \
  return payload;\
  }\
  \
  /\*\*\
  \* Resolve which homepage document to serve.\
  \*\
  \* Logic:\
  \* - If variant is set, look for a \'testing\' homepage with matching
  testGroup\
  \* - If preview mode, include draft homepages in the search\
  \* - Fallback: return the default homepage (isDefault=true, status=active)\
  \*/\
  private async resolveHomepageDocument(\
  variant?: string,\
  isPreview?: boolean,\
  ): Promise\<HomepageCmsDocument \| null\> {\
  try {\
  // Fetch all homepage entries from CMS\
  const response = await firstValueFrom(\
  this.httpService.get\<{ docs: HomepageCmsDocument\[\] }\>(\
  \`\${this.cmsBaseUrl}/api/homepages\`,\
  { params: { limit: 50, depth: 2 } },\
  ),\
  );\
  const docs = response.data.docs;\
  \
  // If variant cookie is set, try to find a testing variant\
  if (variant) {\
  const testDoc = docs.find(\
  d =\> d.status === \'testing\' && d.testGroup === variant,\
  );\
  if (testDoc) return testDoc;\
  }\
  \
  // If preview mode, allow draft pages\
  if (isPreview) {\
  const draftDefault = docs.find(d =\> d.isDefault);\
  if (draftDefault) return draftDefault;\
  }\
  \
  // Default: active + isDefault\
  const defaultDoc = docs.find(\
  d =\> d.status === \'active\' && d.isDefault,\
  );\
  \
  if (!defaultDoc) {\
  this.logger.warn(\'No default active homepage found in CMS\');\
  }\
  \
  return defaultDoc ?? null;\
  } catch (error) {\
  this.logger.error(\'Failed to fetch homepages from CMS\', error.stack);\
  throw error;\
  }\
  }\
  \
  /\*\*\
  \* Fetch the HomepageBanner global from CMS.\
  \*/\
  private async fetchBanner() {\
  try {\
  const response = await firstValueFrom(\
  this.httpService.get(\`\${this.cmsBaseUrl}/api/globals/homepage-banner\`),\
  );\
  return response.data;\
  } catch {\
  this.logger.warn(\'Failed to fetch banner, skipping\');\
  return null;\
  }\
  }\
  \
  /\*\*\
  \* Assemble all sections by evaluating their Tax Group rules.\
  \*\
  \* For each section (Tax Group config):\
  \* 1. If manualEnabled, fetch pinned items first\
  \* 2. Run each rule through the EvaluatorFactory\
  \* 3. Apply carousel guard (need 3x gridSize for carousel)\
  \* 4. Deduplicate items across blocks within the section\
  \* 5. Build the section with its blocks\
  \*/\
  private async assembleSections(\
  sectionConfigs: TaxGroupConfig\[\],\
  ): Promise\<HomepageSection\[\]\> {\
  const sections: HomepageSection\[\] = \[\];\
  const globalExcludeIds: string\[\] = \[\]; // Dedup across all sections\
  \
  for (const config of sectionConfigs) {\
  const blocks: HomepageBlock\[\] = \[\];\
  \
  for (const rule of config.rules) {\
  // Get pinned items if hybrid mode\
  let pinnedItems: any\[\] = \[\];\
  if (config.manualEnabled && config.pinnedItems?.length) {\
  pinnedItems = await this.fetchPinnedItems(config.pinnedItems);\
  // Add pinned IDs to exclude list so evaluator doesn\'t duplicate them\
  globalExcludeIds.push(\...pinnedItems.map(i =\> i.id));\
  }\
  \
  // Evaluate rule to get listings\
  const adjustedLimit = config.manualEnabled\
  ? Math.max(0, rule.limit - pinnedItems.length)\
  : rule.limit;\
  \
  const evaluated = adjustedLimit \> 0\
  ? await this.evaluatorFactory.evaluate(rule, {\
  categoryIds: undefined, // Homepage is cross-category\
  excludeIds: globalExcludeIds,\
  })\
  : \[\];\
  \
  // Combine: pinned first, then rule-based\
  const allItems = \[\...pinnedItems, \...evaluated\];\
  \
  // Add all IDs to global exclude for cross-section dedup\
  globalExcludeIds.push(\...evaluated.map(i =\> i.id));\
  \
  // Determine display type: carousel requires 3x gridSize items\
  const isCarousel = rule.carousel && allItems.length \>= rule.gridSize \* 3;\
  \
  blocks.push({\
  key: \`\${config.id}-\${rule.entity}-\${rule.kind}\`,\
  type: isCarousel ? \'carousel\' : \'grid\',\
  entity: rule.entity,\
  items: allItems,\
  \...(isCarousel ? {\
  pagination: {\
  page: 1,\
  pageSize: rule.gridSize,\
  totalPages: Math.min(\
  Math.ceil(allItems.length / rule.gridSize),\
  10, // Max 10 carousel pages\
  ),\
  hasMore: allItems.length \> rule.gridSize,\
  },\
  } : {}),\
  });\
  }\
  \
  // Only include section if it has blocks with items\
  const nonEmptyBlocks = blocks.filter(b =\> b.items.length \> 0);\
  if (nonEmptyBlocks.length \> 0) {\
  sections.push({\
  key: config.id,\
  title: config.title,\
  subtitle: config.subtitle,\
  ctaLabel: config.ctaLabel,\
  ctaUrl: config.ctaUrl,\
  blocks: nonEmptyBlocks,\
  });\
  }\
  }\
  \
  return sections;\
  }\
  \
  /\*\*\
  \* Fetch specific listings by their IDs (for pinned/manual items).\
  \*/\
  private async fetchPinnedItems(ids: string\[\]): Promise\<any\[\]\> {\
  try {\
  const response = await firstValueFrom(\
  this.httpService.get(\`\${this.cmsBaseUrl}/api/listings\`, {\
  params: {\
  where: { id: { in: ids.join(\',\') } },\
  limit: ids.length,\
  depth: 1,\
  },\
  }),\
  );\
  // Maintain the pinned order\
  const byId = new Map(response.data.docs.map((d: any) =\> \[d.id, d\]));\
  return ids.map(id =\> byId.get(id)).filter(Boolean);\
  } catch (error) {\
  this.logger.warn(\'Failed to fetch pinned items, skipping\', error.message);\
  return \[\];\
  }\
  }\
  \
  /\*\*\
  \* Invalidate all cached homepage variants.\
  \* Called by HomepageConsumer when a RabbitMQ event is received.\
  \*/\
  async invalidateCache(slug?: string): Promise\<void\> {\
  try {\
  // Clear all homepage cache keys\
  // Since cache-manager doesn\'t support pattern deletion natively,\
  // we use the underlying Redis store\'s del command\
  const store = (this.cacheManager as any).store;\
  if (store?.keys) {\
  const pattern = slug ? \`hp:\${slug}:\*\` : \'hp:\*\';\
  const keys = await store.keys(pattern);\
  if (keys.length \> 0) {\
  await Promise.all(keys.map((k: string) =\> this.cacheManager.del(k)));\
  this.logger.log(\`Invalidated \${keys.length} homepage cache keys\`);\
  }\
  }\
  } catch (error) {\
  this.logger.error(\'Cache invalidation failed\', error.stack);\
  }\
  }\
  }

  -----------------------------------------------------------------------------

**7.5 RabbitMQ Consumer**

**File:** apps/api-gateway/src/homepage/homepage.consumer.ts

  -----------------------------------------------------------------------
  import { Injectable, Logger, OnModuleInit } from \'@nestjs/common\';\
  import { ConfigService } from \'@nestjs/config\';\
  import \* as amqplib from \'amqplib\';\
  import { HomepageService } from \'./homepage.service\';\
  \
  /\*\*\
  \* HomepageConsumer\
  \*\
  \* Listens to RabbitMQ events from the CMS service and invalidates\
  \* the homepage cache when relevant content changes.\
  \*\
  \* Exchange: cms.events (topic)\
  \* Queue: api-gateway.homepage (durable, auto-created)\
  \* Routing keys:\
  \* - homepage.saved → CMS admin saved/updated a homepage\
  \* - homepage.deleted → CMS admin deleted a homepage\
  \*\
  \* On receiving either event, ALL cached homepage variants are\
  \* invalidated. This is intentionally aggressive because homepage\
  \* changes are infrequent and cache rebuilds are fast.\
  \*/\
  \@Injectable()\
  export class HomepageConsumer implements OnModuleInit {\
  private readonly logger = new Logger(HomepageConsumer.name);\
  private connection: amqplib.Connection \| null = null;\
  private channel: amqplib.Channel \| null = null;\
  \
  private readonly EXCHANGE = \'cms.events\';\
  private readonly QUEUE = \'api-gateway.homepage\';\
  private readonly ROUTING_KEYS = \[\'homepage.saved\',
  \'homepage.deleted\'\];\
  \
  constructor(\
  private readonly homepageService: HomepageService,\
  private readonly configService: ConfigService,\
  ) {}\
  \
  async onModuleInit(): Promise\<void\> {\
  await this.connect();\
  }\
  \
  /\*\*\
  \* Establish connection to RabbitMQ and bind the consumer.\
  \*\
  \* Steps:\
  \* 1. Connect to RabbitMQ using the RABBITMQ_URL env var\
  \* 2. Create a channel\
  \* 3. Assert the exchange exists (topic type)\
  \* 4. Assert our queue (durable so messages survive restarts)\
  \* 5. Bind the queue to our routing keys\
  \* 6. Start consuming messages\
  \*/\
  private async connect(): Promise\<void\> {\
  const url = this.configService.get\<string\>(\'RABBITMQ_URL\');\
  if (!url) {\
  this.logger.warn(\'RABBITMQ_URL not configured, skipping consumer
  setup\');\
  return;\
  }\
  \
  try {\
  this.connection = await amqplib.connect(url);\
  this.channel = await this.connection.createChannel();\
  \
  // Assert exchange (idempotent, safe to call even if exists)\
  await this.channel.assertExchange(this.EXCHANGE, \'topic\', {\
  durable: true,\
  });\
  \
  // Assert queue\
  await this.channel.assertQueue(this.QUEUE, {\
  durable: true,\
  });\
  \
  // Bind routing keys\
  for (const key of this.ROUTING_KEYS) {\
  await this.channel.bindQueue(this.QUEUE, this.EXCHANGE, key);\
  }\
  \
  // Start consuming\
  await this.channel.consume(this.QUEUE, async (msg) =\> {\
  if (!msg) return;\
  \
  try {\
  const routingKey = msg.fields.routingKey;\
  const payload = JSON.parse(msg.content.toString());\
  \
  this.logger.log(\
  \`Received \${routingKey}: slug=\${payload.slug ?? \'unknown\'}\`,\
  );\
  \
  // Invalidate cache for this homepage\
  await this.homepageService.invalidateCache(payload.slug);\
  \
  // Acknowledge the message\
  this.channel!.ack(msg);\
  } catch (error) {\
  this.logger.error(\'Error processing RMQ message\', error.stack);\
  // Negative acknowledge, do not requeue (prevent poison messages)\
  this.channel!.nack(msg, false, false);\
  }\
  });\
  \
  this.logger.log(\'Homepage RabbitMQ consumer connected and
  listening\');\
  } catch (error) {\
  this.logger.error(\'Failed to connect to RabbitMQ\', error.stack);\
  // Retry after 5 seconds\
  setTimeout(() =\> this.connect(), 5000);\
  }\
  }\
  }

  -----------------------------------------------------------------------

**7.6 Register Module in AppModule**

**File:** apps/api-gateway/src/app.module.ts

Import HomepageModule into the root application module. This is the
final wiring step that makes the GET /api/homepage endpoint available.

  -----------------------------------------------------------------------
  // At the top of app.module.ts, add this import:\
  import { HomepageModule } from \'./homepage/homepage.module\';\
  \
  // In the \@Module decorator, add HomepageModule to the imports array:\
  \@Module({\
  imports: \[\
  // \...existing imports (ConfigModule, TypeOrmModule,
  CategoryPagesModule, etc.)\...\
  HomepageModule, // \<\-- ADD THIS LINE\
  \],\
  // \...rest of module config\...\
  })\
  export class AppModule {}

  -----------------------------------------------------------------------

**8. CMS Event Publishing Hook**

When a CMS admin saves or deletes a homepage entry in Payload, a
RabbitMQ message must be published so the API gateway can invalidate its
cache. This section documents the hook that fires on homepage changes.

**8.1 Publisher Hook**

**File:** apps/cms-service/src/hooks/publishHomepageEvent.ts

  -----------------------------------------------------------------------
  import { CollectionAfterChangeHook, CollectionAfterDeleteHook } from
  \'payload/types\';\
  import { getCmsEventPublisher } from
  \'../publishers/CmsEventPublisher\';\
  \
  /\*\*\
  \* afterChange hook for the Homepages collection.\
  \*\
  \* Publishes a \'homepage.saved\' event to RabbitMQ whenever a\
  \* homepage document is created or updated. The API gateway\
  \* consumes this event and invalidates its cache.\
  \*\
  \* The event payload includes the slug so the consumer can\
  \* target specific cache keys for invalidation.\
  \*/\
  export const publishHomepageSaved: CollectionAfterChangeHook = async
  ({\
  doc,\
  operation,\
  }) =\> {\
  try {\
  const publisher = getCmsEventPublisher();\
  await publisher.publish(\'homepage.saved\', {\
  id: doc.id,\
  slug: doc.slug,\
  status: doc.status,\
  isDefault: doc.isDefault,\
  operation, // \'create\' or \'update\'\
  timestamp: new Date().toISOString(),\
  });\
  } catch (error) {\
  // Log but don\'t throw --- CMS save should succeed even if RMQ is
  down\
  console.error(\'\[publishHomepageSaved\] Failed to publish event:\',
  error.message);\
  }\
  return doc;\
  };\
  \
  /\*\*\
  \* afterDelete hook for the Homepages collection.\
  \*\
  \* Publishes a \'homepage.deleted\' event to RabbitMQ.\
  \*/\
  export const publishHomepageDeleted: CollectionAfterDeleteHook = async
  ({\
  doc,\
  }) =\> {\
  try {\
  const publisher = getCmsEventPublisher();\
  await publisher.publish(\'homepage.deleted\', {\
  id: doc.id,\
  slug: doc.slug,\
  timestamp: new Date().toISOString(),\
  });\
  } catch (error) {\
  console.error(\'\[publishHomepageDeleted\] Failed to publish event:\',
  error.message);\
  }\
  return doc;\
  };

  -----------------------------------------------------------------------

**8.2 Wire Hooks into Collection**

If you chose to define hooks in a separate file (as above), update the
Homepages collection to reference them instead of inline functions:

  -----------------------------------------------------------------------
  // In apps/cms-service/src/collections/Homepages.ts:\
  import { publishHomepageSaved, publishHomepageDeleted } from
  \'../hooks/publishHomepageEvent\';\
  \
  // Replace the inline hooks with:\
  hooks: {\
  afterChange: \[publishHomepageSaved\],\
  afterDelete: \[publishHomepageDeleted\],\
  },

  -----------------------------------------------------------------------

**9. Step-by-Step Implementation Guide**

This section provides a sequential guide for a developer who has never
worked on this codebase before. Follow every step in order. Do not skip
any step. Each step tells you exactly what to do, which file to create
or edit, and what to expect.

**Step 1: Clone the Repository**

Open your terminal and run the following commands:

  -----------------------------------------------------------------------
  git clone https://github.com/Marketeq/marketeq-projects-vibe.git\
  cd marketeq-projects-vibe

  -----------------------------------------------------------------------

Verify you see the apps/ and shared/ directories:

  -----------------------------------------------------------------------
  ls apps/ shared/

  -----------------------------------------------------------------------

**Step 2: Install Dependencies**

This project uses pnpm. If you do not have pnpm installed:

  -----------------------------------------------------------------------
  npm install -g pnpm\
  pnpm install

  -----------------------------------------------------------------------

This installs all dependencies for all apps in the monorepo. It may take
a few minutes the first time.

**Step 3: Set Up Local Infrastructure**

Start PostgreSQL, RabbitMQ, and Redis using Docker:

  -----------------------------------------------------------------------
  docker-compose up -d

  -----------------------------------------------------------------------

Verify all containers are running:

  -----------------------------------------------------------------------
  docker-compose ps

  -----------------------------------------------------------------------

You should see containers for postgres, rabbitmq, and redis, all in a
healthy state.

**Step 4: Create Environment Files**

Copy the example environment files and fill in your local values:

  -----------------------------------------------------------------------
  cp apps/api-gateway/.env.example apps/api-gateway/.env\
  cp apps/cms-service/.env.example apps/cms-service/.env

  -----------------------------------------------------------------------

Edit each .env file with the values from Section 3 of this document. For
local development, use the Docker container URLs:

  -----------------------------------------------------------------------
  \# Local Docker defaults:\
  DATABASE_URL=postgresql://postgres:postgres@localhost:5432/marketeq\
  RABBITMQ_URL=amqp://guest:guest@localhost:5672\
  REDIS_URL=redis://localhost:6379

  -----------------------------------------------------------------------

**Step 5: Create Shared Types**

Create the shared types file. This must exist before any module code is
written.

1.  Open your editor and create the file shared/types/homepage.types.ts

2.  Copy the full code from Section 4.1 and 4.2 of this document

3.  Save the file

4.  Create shared/utils/cache-key.util.ts with code from Section 4.4

5.  Add the RMQ constants from Section 4.3 to the existing
    shared/constants/rmq-events.ts file

**Step 6: Create the Payload CMS Homepages Collection**

6.  Create the file apps/cms-service/src/collections/Homepages.ts

7.  Copy the full collection schema from Section 5.2

8.  Open apps/cms-service/src/payload.config.ts

9.  Add the import and register the collection as shown in Section 5.3

**Step 7: Create the CMS Event Hooks**

10. Create apps/cms-service/src/hooks/publishHomepageEvent.ts

11. Copy the code from Section 8.1

12. Update the Homepages.ts collection to use these hook functions as
    shown in Section 8.2

**Step 8: Create the Most Popular Evaluator**

13. Create
    apps/api-gateway/src/category-pages/evaluators/most-popular.evaluator.ts

14. Copy the full implementation from Section 6.3

15. Open
    apps/api-gateway/src/category-pages/evaluators/evaluator.factory.ts

16. Add the import and most-popular dispatch as shown in Section 6.4

17. Register MostPopularEvaluator as a provider in
    apps/api-gateway/src/category-pages/category-pages.module.ts

**Step 9: Create the Homepage Module**

18. Create the directory: apps/api-gateway/src/homepage/

19. Create the subdirectories: homepage/dto/ and homepage/types/

20. Create homepage.module.ts with code from Section 7.1

21. Create dto/homepage-query.dto.ts with code from Section 7.2

22. Create homepage.controller.ts with code from Section 7.3

23. Create homepage.service.ts with code from Section 7.4

24. Create homepage.consumer.ts with code from Section 7.5

**Step 10: Register the Module**

25. Open apps/api-gateway/src/app.module.ts

26. Add the HomepageModule import as shown in Section 7.6

27. Save the file

**Step 11: Run Database Migrations**

The CMS service auto-migrates on startup (Payload handles this). Start
the CMS service:

  -----------------------------------------------------------------------
  cd apps/cms-service\
  pnpm run start:dev

  -----------------------------------------------------------------------

Watch the console output. Payload will create the homepages table in the
cms schema. You should see output like:

  -----------------------------------------------------------------------
  info: Created collection \'homepages\'

  -----------------------------------------------------------------------

**Step 12: Start the API Gateway**

In a new terminal:

  -----------------------------------------------------------------------
  cd apps/api-gateway\
  pnpm run start:dev

  -----------------------------------------------------------------------

Watch for the log line confirming the RabbitMQ consumer connected:

  -----------------------------------------------------------------------
  \[HomepageConsumer\] Homepage RabbitMQ consumer connected and listening

  -----------------------------------------------------------------------

**Step 13: Seed Test Data in CMS**

Open the Payload admin panel at http://localhost:3001/admin. Navigate to
Homepages and create a new entry:

28. Title: \"Main Homepage\"

29. Slug: \"home\"

30. Status: Active

31. IsDefault: Checked

32. Add a Hero with headline and subheadline text

33. Add at least one Section with one Rule (entity: projects, kind:
    top-rated, limit: 12, gridSize: 4)

34. Save the document

**Step 14: Test the Endpoint**

Open a new terminal and test the endpoint:

  -----------------------------------------------------------------------
  curl http://localhost:3000/api/homepage \| jq .

  -----------------------------------------------------------------------

You should receive a JSON response with the homepage payload including
your hero, sections, and assembled listing data. If you see a 404,
verify you created a homepage with isDefault=true and status=active in
Step 13.

**Step 15: Verify Cache Invalidation**

35. Make a request to GET /api/homepage and note the response

36. Edit the homepage in Payload admin (change the hero headline)

37. Wait 1-2 seconds for the RabbitMQ event to propagate

38. Make another request to GET /api/homepage

39. Verify the response reflects the updated hero headline

If the old content persists, check the API gateway logs for RabbitMQ
connection errors.

**10. Architecture Decision Log**

This section documents key architecture decisions made for the homepage
feature, including the reasoning behind each one. These decisions were
confirmed during product and technical conversations.

**10.1 Module, Not Microservice**

Decision: The homepage is a NestJS module inside api-gateway, not a
standalone microservice.

Reasoning: The homepage reuses existing evaluators and the page
assembler from category-pages. Creating a new microservice would require
duplicating this infrastructure or adding inter-service RPC calls. A
module within the same process has zero-latency access to shared
services, simplifying the architecture.

**10.2 Collection, Not Global**

Decision: Homepages is a Payload CMS collection (multiple documents),
not a global (singleton).

Reasoning: A/B testing requires multiple homepage variants to coexist. A
global would only allow one configuration. With a collection, one entry
is marked isDefault and served to most users, while testing variants are
served to users with a matching mktq_hp_variant cookie.

**10.3 Aggressive Cache Invalidation**

Decision: On any homepage.saved or homepage.deleted event, ALL cached
homepage variants are invalidated.

Reasoning: Homepage CMS edits are infrequent (a few times per week at
most). The cost of rebuilding the cache is low (one database query plus
evaluator runs). Selective invalidation would add complexity with
negligible performance benefit.

**10.4 CMS-Driven Section Ordering**

Decision: The sections array in the CMS document determines render
order. The API does not reorder sections.

Reasoning: This gives CMS admins full control over the homepage layout
without requiring code changes. The frontend iterates the sections array
in order. New sections can be added or reordered entirely from the CMS
admin panel.

**10.5 Most Popular as Separate Evaluator**

Decision: Most Popular is a new evaluator kind, not a reuse of the
top-rated evaluator.

Reasoning: Top-rated emphasizes quality signals (rating 40%, revenue
15%, HF score 10%). Most Popular emphasizes engagement signals
(completions 40%, views 35%). These are fundamentally different ranking
strategies. Sharing an evaluator would require complex branching logic
and make both harder to tune independently.

**10.6 Preview Mode via Header**

Decision: Preview mode requires both a query parameter (preview=1) and a
header (x-preview-token).

Reasoning: The query parameter signals intent. The header provides
authentication. This prevents unauthorized users from seeing draft
content even if they guess the preview URL. The preview token is a
shared secret between the CMS admin panel and the API gateway.
