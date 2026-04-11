**Marketeq Home Page**

**Data Dictionary**

*Payload CMS Collections, PostgreSQL Schema, TypeORM Entities, and API
Types*

**Backend Only Documentation**

NestJS • TypeScript • PostgreSQL • Payload CMS • RabbitMQ

April 5, 2026

**Scope: Backend Only**

**1. Payload CMS Collections**

The homepage system is configured entirely within Payload CMS. This
section documents all collections and fields relevant to homepage
rendering and management.

**1.1 Homepages Collection**

Core collection for managing individual homepage configurations. Each
homepage instance can be customized for different user segments or A/B
testing.

  --------------------------------------- --------------------------- -------------- -------------- -----------------
  **Field Name**                          **Type**                    **Required**   **Default**    **Description**

  id                                      auto (serial)               Yes            ---            Unique primary
                                                                                                    key

  title                                   text (varchar)              Yes            ---            Display title for
                                                                                                    this homepage
                                                                                                    configuration

  slug                                    text (varchar)              Yes            ---            URL slug; must be
                                                                                                    unique

  status                                  select                      Yes            draft          draft, active,
                                                                                                    testing, or
                                                                                                    archived

  isDefault                               checkbox                    No             false          Mark as the
                                                                                                    default homepage
                                                                                                    for all users

  testGroup                               text (varchar)              No             ---            Optional test
                                                                                                    group identifier
                                                                                                    for A/B testing

  hero                                    group                       No             ---            Hero section
                                                                                                    configuration

  hero.headline                           text (varchar)              Yes (if hero)  ---            Main headline

  hero.subheadline                        textarea                    No             ---            Supporting text
                                                                                                    below headline

  hero.backgroundImage                    upload-\>media              No             ---            Reference to
                                                                                                    Media collection

  hero.ctaLabel                           text (varchar)              No             ---            CTA button label

  hero.ctaUrl                             text (varchar)              No             ---            CTA button URL

  sections                                array                       No             \[\]           Homepage content
                                                                                                    sections

  sections\[\].title                      text                        Yes (if        ---            Section heading
                                                                      section)                      

  sections\[\].subtitle                   textarea                    No             ---            Section
                                                                                                    subheading

  sections\[\].ctaLabel                   text                        No             ---            Section CTA label

  sections\[\].ctaUrl                     text                        No             ---            Section CTA URL

  sections\[\].rules                      array                       No             \[\]           Dynamic content
                                                                                                    rules

  sections\[\].rules\[\].entity           select                      Yes (if rule)  ---            projects,
                                                                                                    services, teams,
                                                                                                    or talent

  sections\[\].rules\[\].kind             select                      Yes (if rule)  ---            top-rated,
                                                                                                    trending, newest,
                                                                                                    or most-popular

  sections\[\].rules\[\].limit            number                      Yes (if rule)  12             Max items to
                                                                                                    fetch (1-100)

  sections\[\].rules\[\].gridSize         number                      Yes (if rule)  4              Grid columns
                                                                                                    (1-6)

  sections\[\].rules\[\].carousel         checkbox                    No             false          Render as
                                                                                                    carousel instead
                                                                                                    of grid

  sections\[\].manualEnabled              checkbox                    No             false          Allow manual
                                                                                                    pinning of items

  sections\[\].pinnedItems                relationship-\>listings     No             \[\]           Hand-picked
                                                                                                    listings for this
                                                                                                    section

  popularTabs                             relationship-\>categories   No             \[\]           Featured category
                                                                                                    tabs

  moreCategoriesList                      relationship-\>categories   No             \[\]           Categories in
                                                                                                    \'More\' dropdown

  talentNetworkCta                        group                       No             ---            Talent network
                                                                                                    CTA block

  talentNetworkCta.headline               text                        No             ---            Headline text

  talentNetworkCta.description            textarea                    No             ---            Description text

  talentNetworkCta.ctaLabel               text                        No             ---            Button label

  talentNetworkCta.ctaUrl                 text                        No             ---            Button URL

  footerNav                               group                       No             ---            Footer navigation
                                                                                                    structure

  footerNav.columns                       array                       No             \[\]           Footer column
                                                                                                    definitions

  footerNav.columns\[\].heading           text                        Yes (if        ---            Column heading
                                                                      column)                       

  footerNav.columns\[\].links             array                       No             \[\]           Links in this
                                                                                                    column

  footerNav.columns\[\].links\[\].label   text                        Yes (if link)  ---            Link text

  footerNav.columns\[\].links\[\].url     text                        Yes (if link)  ---            Link destination

  seo                                     group                       No             ---            SEO metadata

  seo.metaTitle                           text                        No             ---            HTML title tag

  seo.metaDescription                     text                        No             ---            HTML meta
                                                                                                    description

  seo.canonical                           text                        No             ---            Canonical URL

  seo.ogImage                             upload-\>media              No             ---            Open Graph image

  seo.noindex                             checkbox                    No             false          Prevent search
                                                                                                    indexing

  createdAt                               auto (timestamptz)          Yes            ---            Creation
                                                                                                    timestamp (UTC)

  updatedAt                               auto (timestamptz)          Yes            ---            Last modification
                                                                                                    timestamp (UTC)
  --------------------------------------- --------------------------- -------------- -------------- -----------------

**1.2 HomepageBanner Global**

Global configuration for site-wide banner notifications (e.g.,
maintenance alerts, promos). Separate from homepage-specific sections.

  -------------- -------------- -------------- -------------- -----------------
  **Field Name** **Type**       **Required**   **Default**    **Description**

  enabled        checkbox       No             false          Show or hide the
                                                              banner

  message        text (varchar) Yes (if        ---            Banner message
                                enabled)                      text

  ctaLabel       text (varchar) No             ---            CTA button label

  ctaUrl         text (varchar) No             ---            CTA button
                                                              destination

  expiresAt      date           No             ---            Auto-hide after
                                                              this date

  bannerType     select         No             info           info, promo, or
                                                              warning
  -------------- -------------- -------------- -------------- -----------------

**1.3 Related Collections (Referenced)**

These collections are linked from the Homepages collection and
documented for context.

**Categories Collection**

Taxonomic categories for browsing and filtering.

  -------------- -------------- -------------- -------------- -----------------
  **Field Name** **Type**       **Required**   **Default**    **Description**

  uuid           text (uuid)    Yes            ---            Unique identifier

  name           text (varchar) Yes            ---            Display name

  slug           text (varchar) Yes            ---            URL-friendly
                                                              identifier

  iconUrl        text (varchar) No             ---            URL to category
                                                              icon

  parentId       uuid           No             ---            Parent category
                                                              for hierarchies

  type           select         No             ---            Category type
                                                              (e.g., service,
                                                              project, skill)
  -------------- -------------- -------------- -------------- -----------------

**Listings Collection**

Individual listings (projects, services, teams, talent profiles). Only
relevant fields for homepage evaluation are documented.

  ------------------ -------------- -------------- -------------- -----------------
  **Field Name**     **Type**       **Required**   **Default**    **Description**

  id                 text (uuid)    Yes            ---            Unique identifier

  type               select         Yes            ---            project, service,
                                                                  team, talent, or
                                                                  job

  title              text (varchar) Yes            ---            Listing title

  slug               text (varchar) Yes            ---            URL-friendly
                                                                  identifier

  status             select         Yes            ---            active, draft,
                                                                  archived, or
                                                                  suspended

  categoryId         uuid           No             ---            Foreign key to
                                                                  Categories

  rating             numeric        No             0              Average rating
                                                                  (0-5.0)

  completionsCount   integer        No             0              Total successful
                                                                  completions

  views90d           integer        No             0              Views in last 90
                                                                  days

  lastActivityAt     timestamptz    No             ---            Timestamp of last
                                                                  activity

  adminBoost         numeric        No             0              Admin ranking
                                                                  boost multiplier

  featured           boolean        No             false          Manually featured
                                                                  flag

  featuredOrder      integer        No             ---            Display order if
                                                                  featured

  editorialLabel     text           No             ---            Custom label for
                                                                  editorial
                                                                  curation

  budget             numeric        No             ---            Project budget
                                                                  (for projects)

  timeline           text           No             ---            Project timeline
                                                                  (for projects)

  monthlyPrice       numeric        No             ---            Monthly price
                                                                  (for services)

  thumbnail          text (varchar) No             ---            URL to listing
                                                                  thumbnail

  description        text           No             ---            Long-form
                                                                  description

  teamAvatars        jsonb          No             \[\]           Array of team
                                                                  member avatars
  ------------------ -------------- -------------- -------------- -----------------

**Media Collection**

Asset storage for images, documents, and other files.

  -------------- -------------- -------------- -------------- -----------------
  **Field Name** **Type**       **Required**   **Default**    **Description**

  id             text (uuid)    Yes            ---            Unique identifier

  filename       text (varchar) Yes            ---            Original filename

  url            text (varchar) Yes            ---            CDN URL to asset

  mimeType       text (varchar) No             ---            File MIME type
                                                              (e.g., image/png)

  width          integer        No             ---            Image width in
                                                              pixels

  height         integer        No             ---            Image height in
                                                              pixels

  alt            text (varchar) No             ---            Alt text for
                                                              accessibility
  -------------- -------------- -------------- -------------- -----------------

**2. PostgreSQL Schema**

The Marketeq platform uses a single Supabase PostgreSQL instance with
multiple schemas. The CMS data is stored in the \'cms\' schema, while
operational data is in the \'public\' schema.

**2.1 Schema Layout**

-   cms schema: All Payload CMS collections and auto-generated tables

-   public schema: NestJS TypeORM entities and microservice data

-   Both schemas coexist in the same PostgreSQL instance for easy
    cross-referencing

**2.2 cms.homepages Table (Auto-Generated by Payload)**

Payload automatically generates this table structure from the CMS
collection definition.

  ---------------------- -------------- -------------- --------------- -----------------
  **Column Name**        **Data Type**  **Nullable**   **Default**     **Constraints**

  id                     serial         NO             nextval(\...)   PRIMARY KEY

  title                  character      NO             ---             
                         varying                                       

  slug                   character      NO             ---             UNIQUE
                         varying                                       

  status                 character      NO             \'draft\'       CHECK (status IN
                         varying                                       (\'draft\',
                                                                       \'active\',
                                                                       \'testing\',
                                                                       \'archived\'))

  is_default             boolean        NO             false           

  test_group             character      YES            NULL            
                         varying                                       

  hero                   jsonb          YES            NULL            

  sections               jsonb          YES            NULL            

  popular_tabs           jsonb          YES            NULL            

  more_categories_list   jsonb          YES            NULL            

  talent_network_cta     jsonb          YES            NULL            

  footer_nav             jsonb          YES            NULL            

  seo                    jsonb          YES            NULL            

  created_at             timestamp with NO             now()           
                         time zone                                     

  updated_at             timestamp with NO             now()           
                         time zone                                     
  ---------------------- -------------- -------------- --------------- -----------------

**2.3 Key Indexes**

1.  UNIQUE INDEX on slug: Ensures no duplicate homepage slugs

2.  INDEX on (status, is_default): Fast lookup of default active
    homepage

3.  INDEX on created_at DESC: Efficient sorting by recency

**2.4 Cross-Schema References**

Payload CMS stores relationships as JSON arrays of IDs (e.g.,
popularTabs contains an array of category UUIDs). The actual entity data
lives in the public schema. The API Gateway performs runtime joins when
assembling the complete homepage payload for the frontend.

-   Example: A homepage\'s popularTabs field contains \[\'uuid-123\',
    \'uuid-456\'\]

-   The API Gateway queries the public schema to fetch the full category
    objects

-   The complete categories are then embedded in the JSON response to
    the frontend

**3. TypeORM Entities (API Gateway)**

These entities represent the operational data in the public schema. Only
fields relevant to homepage evaluation are documented.

**3.1 ListingEntity**

Represents a project, service, team, talent profile, or job listing. The
homepage evaluator uses these fields to rank and sort listings.

> \@Entity(\'listings\') export class ListingEntity {
> \@PrimaryColumn(\'uuid\') id: string; \@Column(\'varchar\') type:
> \'project\' \| \'service\' \| \'team\' \| \'talent\' \| \'job\';
> \@Column(\'varchar\') status: \'active\' \| \'draft\' \| \'archived\'
> \| \'suspended\'; \@Column(\'uuid\', { nullable: true }) categoryId:
> string; \@Column(\'numeric\', { precision: 3, scale: 1, default: 0 })
> rating: number; // 0-5.0 \@Column(\'integer\', { default: 0 })
> completionsCount: number; \@Column(\'integer\', { default: 0 })
> views90d: number; \@Column(\'timestamptz\', { nullable: true })
> lastActivityAt: Date; \@Column(\'numeric\', { default: 0 })
> adminBoost: number; // Multiplier for ranking \@Column(\'boolean\', {
> default: false }) featured: boolean; \@Column(\'integer\', { nullable:
> true }) featuredOrder: number; \@Column(\'varchar\', { nullable: true
> }) editorialLabel: string; \@Column(\'timestamptz\') createdAt: Date;
> \@Column(\'varchar\') title: string; \@Column(\'varchar\') slug:
> string; \@Column(\'varchar\', { nullable: true }) thumbnail: string;
> \@Column(\'text\', { nullable: true }) description: string;
> \@Column(\'numeric\', { nullable: true }) budget: number; // For
> projects \@Column(\'varchar\', { nullable: true }) timeline: string;
> // For projects \@Column(\'numeric\', { nullable: true })
> monthlyPrice: number; // For services }

**3.2 CategoryEntity**

Represents a category or skill tag that listings can be organized under.

> \@Entity(\'categories\') export class CategoryEntity {
> \@PrimaryColumn(\'uuid\') uuid: string; \@Column(\'varchar\') name:
> string; \@Column(\'varchar\') slug: string; \@Column(\'varchar\', {
> nullable: true }) iconUrl: string; \@Column(\'uuid\', { nullable: true
> }) parentId: string; \@Column(\'varchar\', { nullable: true }) type:
> string; }

**4. Shared TypeScript Types**

All TypeScript types used across the homepage system are defined in
shared/types/homepage.types.ts. These ensure type safety and consistency
between CMS, API Gateway, and evaluator services.

**4.1 Core Type Definitions**

> // Rule for a single content source and ranking method export type
> TaxGroupRule = { entity: \'projects\' \| \'services\' \| \'teams\' \|
> \'talent\'; kind: \'top-rated\' \| \'trending\' \| \'newest\' \|
> \'most-popular\'; limit: number; // 1-100 gridSize: number; // 1-6
> columns carousel?: boolean; // Default: false };
>
> // Full configuration for a homepage section\'s rules export type
> TaxGroupConfig = { rules: TaxGroupRule\[\]; manualEnabled?: boolean;
> // Allow pinned items override pinnedItems?: string\[\]; // Array of
> listing IDs };
>
> // Hero banner configuration export type HomepageHero = { headline:
> string; subheadline?: string; backgroundImage?: string; // Media ID
> ctaLabel?: string; ctaUrl?: string; };
>
> // Global site banner (separate from homepage sections) export type
> HomepageBanner = { enabled: boolean; message?: string; ctaLabel?:
> string; ctaUrl?: string; expiresAt?: Date; bannerType?: \'info\' \|
> \'promo\' \| \'warning\'; };
>
> // SEO metadata for a homepage export type HomepageSeo = { metaTitle?:
> string; metaDescription?: string; canonical?: string; ogImage?:
> string; // Media ID noindex?: boolean; };
>
> // Lightweight reference to a category export type CategoryRef = {
> uuid: string; name: string; slug: string; iconUrl?: string; };
>
> // CMS document structure (from Payload) export type
> HomepageCmsDocument = { id: number; title: string; slug: string;
> status: \'draft\' \| \'active\' \| \'testing\' \| \'archived\';
> isDefault: boolean; testGroup?: string; hero?: HomepageHero;
> sections?: HomepageSection\[\]; popularTabs?: string\[\]; // Category
> IDs moreCategoriesList?: string\[\]; talentNetworkCta?: { headline?:
> string; description?: string; ctaLabel?: string; ctaUrl?: string };
> footerNav?: { columns: Array\<{ heading: string; links: Array\<{
> label: string; url: string }\> }\> }; seo?: HomepageSeo; createdAt:
> string; // ISO 8601 updatedAt: string; };
>
> // A single content block/section in a homepage export type
> HomepageBlock = { title?: string; subtitle?: string; rules?:
> TaxGroupRule\[\]; manualEnabled?: boolean; pinnedItems?: string\[\];
> };
>
> // Represents a homepage section with merged dynamic/manual content
> export type HomepageSection = HomepageBlock & { title: string; //
> Required in final payload content: Array\<{ // Evaluated and assembled
> content id: string; type: string; title: string; rating?: number;
> completionsCount?: number; thumbnail?: string; }\>; };
>
> // Complete homepage payload sent to frontend export type
> HomepagePayload = { id: string; slug: string; status: string; hero?:
> HomepageHero; banner?: HomepageBanner; sections: HomepageSection\[\];
> popularTabs?: CategoryRef\[\]; moreCategoriesList?: CategoryRef\[\];
> talentNetworkCta?: { headline?: string; description?: string;
> ctaLabel?: string; ctaUrl?: string }; footerNav?: { columns: Array\<{
> heading: string; links: Array\<{ label: string; url: string }\> }\> };
> seo?: HomepageSeo; generatedAt: string; // ISO 8601 };

**4.2 Evaluator Types**

Types used by the HomepageEvaluator service to rank and filter listings.

> // Options for the most-popular evaluator export type
> MostPopularOptions = { entity: \'projects\' \| \'services\' \|
> \'teams\' \| \'talent\'; limit: number; categoryIds?: string\[\]; //
> Filter to specific categories excludeIds?: string\[\]; // Exclude
> these listing IDs };
>
> // Context passed to evaluators export type EvalContext = {
> categoryIds?: string\[\]; excludeIds?: string\[\]; limit: number; };

**4.3 DTO Types**

Data Transfer Objects for API endpoints.

> // Query parameters for GET /api/homepage export type HomepageQueryDto
> = { preview?: string; // \'1\' to fetch draft/testing homepages // No
> pagination: always returns full homepage };

**5. Data Flow Diagram**

This section documents the complete flow of data from CMS admin actions
through to the frontend.

**5.1 Write Path (Admin to CMS)**

4.  Admin logs into Payload CMS

5.  Creates or updates a homepage configuration

6.  Payload validates and saves to cms.homepages table

7.  Payload emits homepage.saved event to RabbitMQ

8.  HomepageConsumer service receives event

9.  Service invalidates related Redis cache keys

10. Next user request will fetch fresh data

**5.2 Read Path (User Request to Frontend)**

> User Request ↓ API Gateway: GET /api/homepage ↓
> HomepageController.getHomepage() ↓ Check Redis Cache Key:
> \'homepage:{slug}\' ↓ Cache Hit? → Return cached payload to frontend ↓
> NO Fetch CMS Config: SELECT \* FROM cms.homepages WHERE slug = ?; ↓
> HomepageEvaluator.evaluate() ├─ For each section\'s rules: │ ├─ Query
> listings by entity type & kind │ ├─ Apply category filters │ ├─ Apply
> ranking (rating, views90d, adminBoost, etc.) │ ├─ Merge with
> pinnedItems if manualEnabled │ └─ Limit results ├─ Fetch category
> details for popularTabs └─ Assemble complete HomepagePayload ↓ Cache
> in Redis (TTL: 3600s) ↓ Return to frontend

**5.3 Event-Driven Invalidation**

When related entities change, cache is invalidated:

-   Listing updated → Invalidate all homepage caches (multiple sections
    may reference it)

-   Category updated → Invalidate all homepage caches (affects filters)

-   Homepage updated → Invalidate that specific homepage cache

**6. Relationship Map**

This section documents all entity relationships and foreign keys in the
system.

**6.1 Entity Relationships**

**Homepages → Categories**

-   Relationship: popularTabs (array of category UUIDs)

-   Stored as: jsonb column in cms.homepages

-   Resolution: API joins with public.categories at runtime

-   Cardinality: One homepage may reference many categories; one
    category may appear in many homepages

**Homepages → Categories (More List)**

-   Relationship: moreCategoriesList (array of category UUIDs)

-   Stored as: jsonb column in cms.homepages

-   Resolution: API joins with public.categories at runtime

-   Cardinality: One homepage may reference many categories

**Homepages → Listings (Pinned Items)**

-   Relationship: sections\[\].pinnedItems (array of listing IDs)

-   Stored as: jsonb column in cms.homepages

-   Resolution: API joins with public.listings at runtime

-   Cardinality: One section may pin many listings; one listing may be
    pinned in multiple sections

**Homepages → Media**

-   Relationship: hero.backgroundImage (Media ID)

-   Relationship: seo.ogImage (Media ID)

-   Stored as: text (varchar) in cms.homepages

-   Resolution: Simple URL reference via public.media

-   Cardinality: One media asset may be referenced by multiple homepages

**Listings → Categories (Foreign Key)**

-   Relationship: categoryId (uuid FK)

-   Stored as: foreign key in public.listings table

-   Cardinality: One listing has one primary category; one category has
    many listings

**6.2 Referential Integrity Notes**

-   Payload does not enforce foreign key constraints on JSONB
    relationship fields

-   Orphaned IDs in cms.homepages are silently ignored during evaluation

-   Delete-cascade is enforced at the public schema level (e.g.,
    deleting a listing cascades to any analytics)

-   CMS admins should verify that pinned items and featured categories
    still exist before publishing

**7. Notes & Best Practices**

**7.1 Caching Strategy**

-   Homepage payloads are cached in Redis with a 1-hour TTL

-   Cache keys include the homepage slug and optional test group:
    \'homepage:{slug}:{testGroup?}\'

-   Invalidation occurs on any CMS update via RabbitMQ

-   Consider setting shorter TTLs for draft/testing homepages

**7.2 Evaluation Performance**

-   Evaluators use indexed queries on status, rating, completionsCount,
    views90d, and lastActivityAt

-   Large limits (100+) may trigger slow queries; recommend capping at
    50 per section

-   Multiple sections with the same entity type should be deduplicated
    to avoid duplicate database queries

**7.3 JSON Schema Validation**

-   All JSONB columns in cms.homepages should be validated against the
    TypeScript types on write

-   Use JSON schema validators in the Payload plugin to prevent
    malformed data

**7.4 A/B Testing with testGroup**

-   Set testGroup to a cohort identifier (e.g.,
    \'experiment-2026-04-001\')

-   The frontend must send testGroup in the preview parameter if opted
    into the cohort

-   Cache keys are isolated per test group to prevent cache pollution

**7.5 SEO & Social Sharing**

-   Always set seo.metaTitle and seo.metaDescription for production
    homepages

-   For social sharing, ensure seo.ogImage references a high-quality
    media asset (1200x630px recommended)

-   The noindex flag should only be set for draft or testing homepages
