**Marketeq Home Page**

API Design & Endpoint Catalog

*Complete REST API specification for the homepage backend*

Document Version: 1.0 \| Date: April 5, 2026

Scope: Backend Only (No React / No HTML / No Frontend Code)

**Table of Contents**

**1. API Overview**

The Marketeq homepage backend exposes a single public REST endpoint for
fetching assembled homepage content. This section provides a complete
overview of the API design, authentication requirements, and response
formats.

**1.1 Endpoint Summary**

  --------------------- -------------------------------------------------
  **Property**          **Value**

  **Base URL**          http://localhost:3000/api or
                        https://api.marketeq.com

  **Endpoint**          GET /api/homepage

  **Authentication**    None (public endpoint)

  **Preview Mode**      Optional, requires x-preview-token header

  **Response Format**   application/json

  **Content-Type**      application/json

  **Rate Limiting**     None (public, cached endpoint)

  **Expected Response   \<50ms (cache hit) \| \<500ms (cache miss)
  Time**                

  **Max Payload Size**  \~200KB (varies by section count and item count)

  **Connection**        Keep-Alive recommended
  --------------------- -------------------------------------------------

**1.2 Key Characteristics**

-   Public endpoint --- No API key or authentication required for
    standard requests

-   Heavily cached --- Responses are Redis-cached for 5 minutes (TTL
    configurable)

-   A/B test aware --- Can serve different homepage variants via
    mktq_hp_variant cookie

-   Preview-capable --- CMS admins can preview draft content with a
    shared secret token

-   Event-driven invalidation --- Cache invalidated when CMS publishes
    homepage changes

-   No pagination --- All sections and pinned items are included in a
    single response

**2. GET /api/homepage --- Request & Response**

This section documents the complete request and response specification
for the homepage endpoint, including all query parameters, headers, and
response schema.

**2.1 Request**

**Method & Path**

  --------------------- -------------------------------------------------
  **Property**          **Value**

  **HTTP Method**       GET

  **Path**              /api/homepage

  **Full URL**          GET /api/homepage?preview=1&other=params
  --------------------- -------------------------------------------------

**Query Parameters**

  --------------------- -------------------------------------------------
  **Parameter**         **Description**

  **preview**           (string, optional) Set to \'1\' to enable preview
                        mode. Returns draft and testing homepages.
                        Requires valid x-preview-token header. Default:
                        not set (preview mode disabled).
  --------------------- -------------------------------------------------

**Request Headers**

  --------------------- -------------------------------------------------
  **Header**            **Description**

  **x-preview-token**   (string, conditional) Required only when
                        preview=1. Must match the PREVIEW_SECRET
                        environment variable configured in the API
                        gateway. Protects draft content from unauthorized
                        access.

  **Cookie:             (string, optional) A/B test variant identifier.
  mktq_hp_variant**     Set by the frontend experimentation platform. If
                        set, the API returns the matching variant (if
                        available). If not set, returns the default
                        homepage.

  **Accept**            (optional) Should be \'application/json\'. All
                        responses are JSON regardless.
  --------------------- -------------------------------------------------

No request body is used. All parameters are passed via query string or
headers.

**2.2 Response --- 200 OK**

The successful response (HTTP 200) contains the complete assembled
homepage payload as JSON. Every field is fully documented below.

  -----------------------------------------------------------------------
  {\
  \"title\": \"string --- internal name of the homepage document\",\
  \"slug\": \"string --- URL identifier (e.g. \'default\',
  \'summer-2026\')\",\
  \"status\": \"\'active\' \| \'testing\' --- serves only if \'active\'
  or matching test group\",\
  \"hero\": {\
  \"headline\": \"string --- main hero text (e.g. \'Find Top
  Talent\')\",\
  \"subheadline\": \"string --- supporting hero text\",\
  \"backgroundImage\": \"string \| null --- Cloudflare R2 URL\",\
  \"ctaLabel\": \"string --- button text (e.g. \'Get Started\')\",\
  \"ctaUrl\": \"string --- navigation target (e.g.
  \'/talent/search\')\",\
  },\
  \"banner\": {\
  \"enabled\": \"boolean --- whether to display the banner\",\
  \"message\": \"string --- banner text (e.g. \'Free webinar: Scaling
  your team\')\",\
  \"ctaLabel\": \"string \| null --- optional button label\",\
  \"ctaUrl\": \"string \| null --- optional navigation target\",\
  \"expiresAt\": \"string \| null --- ISO 8601 datetime; banner hidden
  after this\",\
  \"bannerType\": \"\'info\' \| \'promo\' \| \'warning\' --- styling
  hint\",\
  },\
  \"sections\": \[\
  {\
  \"key\": \"string --- unique section identifier (e.g.
  \'top-rated-projects\')\",\
  \"title\": \"string --- section heading (e.g. \'Top Rated
  Projects\')\",\
  \"subtitle\": \"string \| null --- optional subheading\",\
  \"ctaLabel\": \"string \| null --- optional CTA button\",\
  \"ctaUrl\": \"string \| null --- optional CTA target\",\
  \"blocks\": \[\
  {\
  \"key\": \"string --- unique block identifier\",\
  \"type\": \"\'grid\' \| \'carousel\' --- layout hint for frontend\",\
  \"entity\": \"\'projects\'\|\'services\'\|\'teams\'\|\'talent\' ---
  content type\",\
  \"items\": \[ /\* ProjectCard \| ServiceCard \| TeamCard \| TalentCard
  objects \*/\
  \],\
  \"pagination\": {\
  \"page\": \"number --- current page (1-indexed)\",\
  \"pageSize\": \"number --- items per page\",\
  \"totalPages\": \"number --- total available pages\",\
  \"hasMore\": \"boolean --- whether more pages exist\",\
  },\
  }\
  \],\
  }\
  \],\
  \"popularTabs\": \[\
  {\
  \"uuid\": \"string --- category UUID\",\
  \"name\": \"string --- display name (e.g. \'Web Development\')\",\
  \"slug\": \"string --- URL slug (e.g. \'web-development\')\",\
  }\
  \],\
  \"moreCategoriesList\": \[\
  {\
  \"uuid\": \"string --- category UUID\",\
  \"name\": \"string --- category name\",\
  \"slug\": \"string --- URL slug\",\
  \"iconUrl\": \"string \| null --- Cloudflare R2 icon URL\",\
  }\
  \],\
  \"talentNetworkCta\": {\
  \"headline\": \"string\",\
  \"description\": \"string\",\
  \"ctaLabel\": \"string\",\
  \"ctaUrl\": \"string\",\
  },\
  \"footerNav\": {\
  \"columns\": \[\
  {\
  \"heading\": \"string\",\
  \"links\": \[{ \"label\": \"string\", \"url\": \"string\" }\],\
  }\
  \],\
  },\
  \"seo\": {\
  \"metaTitle\": \"string --- page title for HTML \<title\>\",\
  \"metaDescription\": \"string --- page description for HTML meta
  tag\",\
  \"canonical\": \"string \| null --- canonical URL\",\
  \"ogImage\": \"string \| null --- Open Graph image URL\",\
  \"noindex\": \"boolean --- set to true to prevent search engine
  indexing\",\
  }\
  }

  -----------------------------------------------------------------------

**Response Field Details**

-   title: Internal document name (not displayed to users). Used in logs
    and admin panels.

-   slug: URL identifier. Homepages with slug=\'default\' are served to
    most users.

-   status: \'active\' means this homepage is served. \'testing\' is
    only served if the user has the matching mktq_hp_variant cookie.

-   hero: Hero section with headline, subheadline, background image, and
    CTA. Always present.

-   banner: Promotional banner. Can be disabled. expiresAt automatically
    hides the banner.

-   sections: Array of content sections (top-rated projects, trending
    services, etc.). Order determines render order on the frontend.

-   popularTabs: Quick-access category tabs shown in the top navigation.
    Typically 3-5 categories.

-   moreCategoriesList: Full category list shown in a \'More
    Categories\' dropdown/modal. Includes all categories with icons.

-   talentNetworkCta: Call-to-action section encouraging users to join
    the talent network.

-   footerNav: Footer link structure. Column-based layout for responsive
    display.

-   seo: Search engine optimization metadata. Influences page titles,
    meta tags, and indexing.

**3. Error Responses**

The API returns the following error responses. Always check the HTTP
status code and the \'message\' field for debugging.

**3.1 404 Not Found**

Returned when no active default homepage exists in the CMS.

  -----------------------------------------------------------------------
  HTTP/1.1 404 Not Found\
  Content-Type: application/json\
  \
  {\
  \"statusCode\": 404,\
  \"message\": \"No active homepage found\",\
  }

  -----------------------------------------------------------------------

Cause: CMS has no homepage document with status=\'active\' and
isDefault=true.

Solution: Log into Payload CMS admin panel and create an active default
homepage.

**3.2 403 Forbidden**

Returned when preview=1 is requested but the x-preview-token header is
missing or invalid.

  -----------------------------------------------------------------------
  HTTP/1.1 403 Forbidden\
  Content-Type: application/json\
  \
  {\
  \"statusCode\": 403,\
  \"message\": \"Invalid or missing preview token\",\
  }

  -----------------------------------------------------------------------

Cause: Preview mode requires authentication via x-preview-token header.

Solution: Include a valid x-preview-token header that matches the
PREVIEW_SECRET environment variable.

**3.3 503 Service Unavailable**

Returned when the CMS service is unreachable or an internal server error
occurs.

  -----------------------------------------------------------------------
  HTTP/1.1 503 Service Unavailable\
  Content-Type: application/json\
  \
  {\
  \"statusCode\": 503,\
  \"message\": \"Homepage service unavailable\",\
  }

  -----------------------------------------------------------------------

Cause: CMS service is offline, database is unreachable, or an unhandled
error occurred in the homepage module.

Solution: Check API gateway logs (CloudWatch or your logging backend).
Verify database and CMS service connectivity.

**4. Listing Card Schemas**

The sections\[\].blocks\[\].items array contains card objects. Each card
type (Project, Service, Team, Talent) has a distinct schema. All cards
are paginated and returned with pagination metadata.

**4.1 Project Card**

Represents a project listing. Returned in blocks with
entity=\'projects\'.

  -----------------------------------------------------------------------
  {\
  \"uuid\": \"string --- unique project ID\",\
  \"thumbnail\": \"string \| null --- Cloudflare R2 image URL\",\
  \"title\": \"string --- project name\",\
  \"slug\": \"string --- URL slug\",\
  \"rating\": \"number --- 0-5 star rating\",\
  \"description\": \"string --- truncated to 120 characters\",\
  \"timeline\": \"string --- e.g. \'2-4 weeks\'\",\
  \"budget\": \"string --- e.g. \'\$5,000 - \$10,000\'\",\
  \"teamAvatars\": \"string\[\] --- array of team member avatar URLs\",\
  \"categoryName\": \"string --- e.g. \'Web Development\'\",\
  \"featured\": \"boolean --- true if manually pinned\",\
  \"editorialLabel\": \"string \| null --- e.g. \'Featured\', \'Hot\'\",\
  }

  -----------------------------------------------------------------------

**4.2 Service Card**

Represents a service offering. Returned in blocks with
entity=\'services\'.

  -----------------------------------------------------------------------
  {\
  \"uuid\": \"string --- unique service ID\",\
  \"thumbnail\": \"string \| null --- Cloudflare R2 image URL\",\
  \"tags\": \"string\[\] --- technology/skill tags\",\
  \"title\": \"string --- service name\",\
  \"slug\": \"string --- URL slug\",\
  \"rating\": \"number --- 0-5 star rating\",\
  \"description\": \"string --- truncated to 120 characters\",\
  \"monthlyPrice\": \"string --- e.g. \'\$499/mo\'\",\
  \"teamAvatars\": \"string\[\] --- service provider avatar URLs\",\
  \"categoryName\": \"string --- e.g. \'Design\'\",\
  \"featured\": \"boolean --- true if manually pinned\",\
  \"editorialLabel\": \"string \| null --- e.g. \'New\', \'Popular\'\",\
  }

  -----------------------------------------------------------------------

**4.3 Team Card**

Represents a team profile. Returned in blocks with entity=\'teams\'.

  -----------------------------------------------------------------------
  {\
  \"uuid\": \"string --- unique team ID\",\
  \"name\": \"string --- team name\",\
  \"slug\": \"string --- URL slug\",\
  \"logo\": \"string \| null --- Cloudflare R2 logo URL\",\
  \"memberCount\": \"number --- total team members\",\
  \"rating\": \"number --- 0-5 average team rating\",\
  \"specializations\": \"string\[\] --- areas of expertise\",\
  \"completedProjects\": \"number --- historical project count\",\
  }

  -----------------------------------------------------------------------

**4.4 Talent Card**

Represents an individual freelancer or contractor. Returned in blocks
with entity=\'talent\'.

  -----------------------------------------------------------------------
  {\
  \"uuid\": \"string --- unique talent ID\",\
  \"name\": \"string --- full name\",\
  \"slug\": \"string --- URL slug\",\
  \"avatar\": \"string \| null --- Cloudflare R2 profile image URL\",\
  \"title\": \"string --- professional title (e.g. \'Full Stack
  Developer\')\",\
  \"rating\": \"number --- 0-5 rating\",\
  \"skills\": \"string\[\] --- list of skills\",\
  \"hourlyRate\": \"string --- e.g. \'\$75/hr\'\",\
  \"availability\": \"string --- e.g. \'Available Now\' or \'Not
  Available\'\",\
  }

  -----------------------------------------------------------------------

**5. Caching Behavior**

The homepage endpoint is heavily cached to minimize database load and
ensure sub-50ms response times. This section documents cache layers,
TTLs, invalidation strategy, and preview mode behavior.

**5.1 Cache Layer**

  --------------------- -------------------------------------------------
  **Property**          **Value**

  **Cache System**      Redis (Upstash managed service)

  **Default TTL**       300 seconds (5 minutes)

  **TTL Configuration** HOMEPAGE_CACHE_TTL environment variable (in
                        seconds)

  **Cache Key Format**  hp:{slug}:{variantHash}

  **Invalidation        Event-driven via RabbitMQ
  Trigger**             

  **Preview Mode        Bypassed entirely (always fresh)
  Cache**               
  --------------------- -------------------------------------------------

**5.2 Cache Key Pattern**

Cache keys are deterministic and include the homepage slug and variant
identifier:

  -----------------------------------------------------------------------
  hp:default:0 ← Default homepage, no variant\
  hp:default:abc123 ← Default homepage, variant \'abc123\'\
  hp:summer-2026:0 ← \'summer-2026\' homepage, no variant

  -----------------------------------------------------------------------

**5.3 Cache Invalidation**

When a user publishes or deletes a homepage in the CMS, a RabbitMQ event
is sent. The API gateway consumes this event and invalidates all cached
variants:

  -----------------------------------------------------------------------
  Event: cms.events / homepage.saved\
  Payload: { id, slug, status, operation: \'publish\' }\
  Action: Invalidate ALL keys matching hp:{slug}:\*\
  \
  Event: cms.events / homepage.deleted\
  Payload: { id, slug }\
  Action: Invalidate ALL keys matching hp:{slug}:\*

  -----------------------------------------------------------------------

Rationale: Homepage CMS edits are infrequent (few times per week). The
cost of rebuilding cache is low (one DB query + evaluator runs).
Selective invalidation adds complexity with minimal benefit.

**5.4 Preview Mode (Cache Bypass)**

When preview=1 is requested with a valid x-preview-token, the API
completely bypasses Redis:

-   No cache lookup --- Always fetch fresh data from CMS

-   No cache write --- Response is not stored in Redis

-   Always current --- Draft and testing homepages are immediately
    visible

**5.5 Expected Performance**

  --------------------- -------------------------------------------------
  **Scenario**          **Response Time**

  **Cache hit           \<50ms
  (in-memory Redis)**   

  **Cache miss (DB      \<500ms
  query + evaluation)** 

  **Preview mode (cache \~300-500ms (same as cache miss)
  bypass)**             

  **Large payload (200+ \<500ms (evaluation is async-friendly)
  items)**              
  --------------------- -------------------------------------------------

**6. Internal Service-to-Service Communication**

The homepage endpoint does not call external third-party APIs. Instead,
it orchestrates data from the CMS service and evaluators within the same
API gateway process. This section documents the internal communication
patterns.

**6.1 API Gateway → CMS Service**

The API gateway makes internal HTTP calls to the CMS service to fetch
homepage configurations and banner data.

  ------------------------------------------------------------- -------------------------------------------------
  **Endpoint**                                                  **Purpose**

  **GET {CMS_SERVICE_URL}/api/homepages**                       Fetch all homepage documents. Filters by status
                                                                and isDefault. Used to find active or testing
                                                                variants.

  **GET {CMS_SERVICE_URL}/api/globals/homepage-banner**         Fetch global banner configuration (message, CTA,
                                                                expiry). Called once per request.

  **GET                                                         Fetch pinned project/service/team/talent items by
  {CMS_SERVICE_URL}/api/listings?where\[id\]\[in\]=\[\...\]**   UUID. Used to place featured items at the top of
                                                                sections.
  ------------------------------------------------------------- -------------------------------------------------

All CMS calls are made using the CMS_SERVICE_URL environment variable
(e.g. http://localhost:3001 in dev, https://cms.marketeq.internal in
prod).

**6.2 RabbitMQ Event Consumption**

The API gateway consumes RabbitMQ events published by the CMS service.
These events trigger cache invalidation.

  ---------------- ------------------------------------- ----------------
  **Property**     **Value**                             **Purpose**

  Exchange         cms.events (topic)                    CMS publishes
                                                         all events to
                                                         this exchange

  Routing Keys     homepage.saved, homepage.deleted      Filters events
                                                         relevant to
                                                         homepages

  Queue            api-gateway.homepage                  Dedicated queue
                                                         for API gateway
                                                         to consume

  Consumer         homepage.consumer.ts                  NestJS
                                                         microservice
                                                         consumer in
                                                         api-gateway

  Requeue Policy   Acknowledge on success, requeue on    Ensures
                   error (3x retry)                      at-least-once
                                                         delivery
                                                         semantics
  ---------------- ------------------------------------- ----------------

**Event Payload Examples**

Homepage Save Event:

  -----------------------------------------------------------------------
  {\
  \"id\": \"uuid\",\
  \"slug\": \"default\",\
  \"status\": \"active\",\
  \"isDefault\": true,\
  \"operation\": \"publish\",\
  \"timestamp\": \"2026-04-05T14:30:00Z\",\
  }

  -----------------------------------------------------------------------

Homepage Delete Event:

  -----------------------------------------------------------------------
  {\
  \"id\": \"uuid\",\
  \"slug\": \"summer-2026\",\
  \"operation\": \"delete\",\
  \"timestamp\": \"2026-04-05T14:31:00Z\",\
  }

  -----------------------------------------------------------------------

**7. Rate Limiting & Performance Quotas**

The homepage endpoint is public and cached, so no rate limiting is
applied. However, performance expectations and resource constraints are
documented below.

**7.1 Rate Limiting Policy**

  --------------------- -------------------------------------------------
  **Aspect**            **Details**

  **Per-IP Rate Limit** None --- public endpoint, no auth required

  **Per-User Rate       None --- stateless, no session tracking
  Limit**               

  **Global Throughput** Unlimited (served from Redis cache)

  **Burst Capacity**    Cache handles 10,000+ concurrent requests
  --------------------- -------------------------------------------------

Rationale: Responses are cached at the CDN edge (future enhancement) or
Redis. Cache hits require minimal backend resources.

**7.2 Expected Quotas**

  --------------------- -------------------------------------------------
  **Metric**            **Limit**

  **Max payload size**  \~200KB (200 projects + 5 sections = typical)

  **Max sections per    10 (configurable in CMS)
  homepage**            

  **Max items per       20 (pagination keeps sections bounded)
  section**             

  **Max popular         10 (displayed as tabs)
  categories**          

  **Max footer          5 (configurable in CMS)
  columns**             
  --------------------- -------------------------------------------------

**7.3 Performance SLA**

  --------------------- -------------------------------------------------
  **Condition**         **Target Response Time**

  **Cache hit**         \<50ms (p99)

  **Cache miss**        \<500ms (p99)

  **Preview mode**      \<500ms (cache bypass)

  **Database            503 error within \<5s
  unavailable**         
  --------------------- -------------------------------------------------

**8. CORS & Security Configuration**

This section documents cross-origin resource sharing rules,
authentication patterns, and security best practices for consuming the
homepage API.

**8.1 CORS Configuration**

  --------------------- -------------------------------------------------
  **Property**          **Value**

  **Allowed Origins**   Configured via CORS_ORIGINS environment variable
                        (comma-separated list)

  **Allowed Methods**   GET (only read operations)

  **Allowed Headers**   Content-Type, x-preview-token, Cookie

  **Expose Headers**    Content-Length, Content-Type

  **Credentials**       true (allows Cookie: mktq_hp_variant)

  **Max Age**           86400 (CORS preflight cached for 24 hours)
  --------------------- -------------------------------------------------

Example CORS_ORIGINS:
https://marketeq.com,https://app.marketeq.com,http://localhost:3000

**8.2 Authentication & Authorization**

  --------------------- -------------------------------------------------
  **Scenario**          **Auth Method**

  **Standard request    None --- public endpoint
  (GET /api/homepage)** 

  **Preview mode        x-preview-token header must match PREVIEW_SECRET
  (preview=1)**         

  **A/B variant         mktq_hp_variant cookie (set by frontend)
  selection**           

  **Admin CMS access**  Separate auth (Payload CMS dashboard, not this
                        API)
  --------------------- -------------------------------------------------

**8.3 Security Best Practices**

-   HTTPS only in production. Set CORS_ORIGINS to HTTPS URLs only.

-   Preview tokens are shared secrets. Rotate PREVIEW_SECRET regularly
    (env var).

-   Cookie-based variant selection. Frontend sets mktq_hp_variant; API
    reads and respects it.

-   No sensitive data in response. All UUIDs, IDs, and URLs are safe for
    public consumption.

-   Content-Security-Policy: API response does not contain executable
    scripts or external includes.

**9. API Versioning Strategy**

The homepage API does not use URL versioning (no /v1/, /v2/ prefixes).
Instead, it follows a forward-compatibility strategy to evolve without
breaking existing clients.

**9.1 Current Endpoint**

  -----------------------------------------------------------------------
  GET /api/homepage (no version prefix)

  -----------------------------------------------------------------------

Future versions will be at /api/v2/homepage if a breaking change is
necessary, but this is a last resort.

**9.2 Forward Compatibility Rules**

-   New fields are additive --- Frontend clients MUST ignore unknown
    fields.

-   Deprecated fields are kept --- Old fields remain in response
    alongside new ones.

-   Enum values expand --- New status values (e.g. \'paused\') may be
    added to existing enums. Clients must handle unexpected values
    gracefully.

-   Type changes are avoided --- Existing fields keep the same type
    (string, number, boolean, object, array).

**9.3 Migration Path for Breaking Changes**

If a breaking change becomes necessary (rare):

1.  Announce deprecation in changelog 4 weeks in advance.

2.  Provide migration guide and code examples.

3.  Support both /api/homepage (old) and /api/v2/homepage (new) for 2+
    months.

4.  Require explicit header Accept-Version: v2 to opt into new behavior.

5.  After grace period, sunset old endpoint with 404.

**9.4 Changelog & Documentation**

All API changes are documented in:

-   CHANGELOG.md (root of repo) --- Dated entries, version numbers

-   This document --- Updated on each change, version bumped

-   API endpoint /api/homepage/schema --- Returns OpenAPI 3.0 schema
    (optional, not implemented yet)

**10. Example Requests & Responses**

This section provides complete curl and JavaScript examples for common
use cases.

**10.1 Simple GET Request (Default Homepage)**

Fetch the default active homepage with no preview or A/B variant:

  -----------------------------------------------------------------------
  curl -X GET https://api.marketeq.com/api/homepage \\\
  -H \"Accept: application/json\" \\\
  -H \"Cookie: mktq_hp_variant=\" \\\
  -v

  -----------------------------------------------------------------------

**10.2 A/B Test Variant Request**

Request a specific A/B test variant using the mktq_hp_variant cookie:

  -----------------------------------------------------------------------
  curl -X GET https://api.marketeq.com/api/homepage \\\
  -H \"Accept: application/json\" \\\
  -H \"Cookie: mktq_hp_variant=variant-red-cta\" \\\
  -v

  -----------------------------------------------------------------------

The API returns the variant if it exists and has status=\'testing\'.
Otherwise, returns default.

**10.3 Preview Mode Request (Draft Homepage)**

Preview a draft or testing homepage before publication:

  -----------------------------------------------------------------------
  curl -X GET \"https://api.marketeq.com/api/homepage?preview=1\" \\\
  -H \"Accept: application/json\" \\\
  -H \"x-preview-token: my-secret-token-12345\" \\\
  -v

  -----------------------------------------------------------------------

The x-preview-token must match PREVIEW_SECRET environment variable in
the API gateway.

**10.4 JavaScript / Fetch Example**

  -----------------------------------------------------------------------
  // Fetch default homepage\
  const response = await fetch(\'https://api.marketeq.com/api/homepage\',
  {\
  method: \'GET\',\
  headers: { \'Accept\': \'application/json\' },\
  credentials: \'include\', // Include cookies\
  });\
  \
  if (!response.ok) {\
  const error = await response.json();\
  console.error(\'API Error:\', error.message);\
  return;\
  }\
  \
  const homepage = await response.json();\
  console.log(homepage.title);\
  console.log(\'Sections:\', homepage.sections.length);

  -----------------------------------------------------------------------

**10.5 Preview Mode (JavaScript)**

  -----------------------------------------------------------------------
  // Fetch draft homepage with preview token\
  const previewToken = process.env.REACT_APP_PREVIEW_TOKEN;\
  \
  const response = await fetch(\
  \'https://api.marketeq.com/api/homepage?preview=1\',\
  {\
  method: \'GET\',\
  headers: {\
  \'Accept\': \'application/json\',\
  \'x-preview-token\': previewToken,\
  },\
  credentials: \'include\',\
  }\
  );\
  \
  const draftHomepage = await response.json();

  -----------------------------------------------------------------------

**11. Troubleshooting & Debugging**

This section provides guidance for diagnosing common issues and
interpreting API errors.

**11.1 Response is 404 (No active homepage found)**

-   Cause: No homepage document with status=\'active\' and
    isDefault=true in CMS.

-   Debug: Log into Payload CMS admin. Navigate to Homepages collection.
    Check that at least one document has status=\'active\' and \'Is
    Default\' checkbox is checked.

-   Fix: Create a new homepage with status=\'active\' or publish an
    existing draft.

**11.2 Response is 403 (Invalid or missing preview token)**

-   Cause: Request has preview=1 but x-preview-token header is missing
    or wrong.

-   Debug: Verify the preview token matches PREVIEW_SECRET in
    api-gateway .env file.

-   Fix: Include correct x-preview-token header or remove preview=1 from
    query string.

**11.3 Response is 503 (Service unavailable)**

-   Cause: CMS service offline, database unreachable, or unhandled
    server error.

-   Debug: Check API gateway logs (CloudWatch, DataDog, or local logs).
    Look for database connection errors or RabbitMQ timeouts.

-   Fix: Restart CMS service. Verify database connection string. Check
    RabbitMQ connectivity.

**11.4 Cache Not Invalidating (Old Content Persists)**

-   Cause: RabbitMQ consumer not running or Redis connection failed.

-   Debug: Check API gateway logs for RabbitMQ connection errors. Verify
    Redis URL in .env. Restart API gateway.

-   Fix: Manually clear Redis cache with \'redis-cli FLUSHDB\' (dev
    only). Or wait for TTL expiry (5 minutes).

**11.5 Slow Response (\<500ms threshold breached)**

-   Cause: Cache miss (first request) or database query slowdown.

-   Debug: Check if response includes many items or sections. Use \'curl
    -w %{time_total}\' to measure total time.

-   Fix: Optimize evaluators. Reduce items per section. Add database
    indexes on listing queries.

**11.6 A/B Variant Not Serving**

-   Cause: Cookie not set or variant does not exist in CMS.

-   Debug: Check browser DevTools \> Application \> Cookies for
    \'mktq_hp_variant\'. Verify variant status in Payload CMS.

-   Fix: Ensure frontend sets cookie correctly. Create variant in CMS
    with status=\'testing\' matching cookie value.

**12. Environment Variables Reference**

Every environment variable used by the homepage API is documented below.
Set these in .env files (development) or deployment secrets
(production).

**12.1 API Gateway Variables (.env)**

**Endpoint:** apps/api-gateway/.env

  ------------------------ -------------------------------------------------
  **Variable**             **Description**

  **DATABASE_URL**         PostgreSQL connection string to Supabase. Format:
                           postgresql://user:password@host:5432/database

  **REDIS_URL**            Redis connection URL (Upstash). Format:
                           rediss://default:password@host.upstash.io:6379

  **RABBITMQ_URL**         RabbitMQ connection URL (CloudAMQP). Format:
                           amqps://user:password@host.cloudamqp.com/vhost

  **CMS_SERVICE_URL**      Base URL of CMS service. Local:
                           http://localhost:3001 \| Prod:
                           https://cms.marketeq.internal

  **HOMEPAGE_CACHE_TTL**   Redis cache time-to-live in seconds. Default: 300
                           (5 minutes). Increase for longer cache, decrease
                           for more frequent updates.

  **PREVIEW_SECRET**       Shared secret for preview mode authentication.
                           Must be at least 32 characters. Use strong random
                           value.

  **CORS_ORIGINS**         Comma-separated list of allowed origins. Example:
                           https://marketeq.com,https://app.marketeq.com

  **NODE_ENV**             Set to \'production\' in prod. Affects logging
                           level and error messages.
  ------------------------ -------------------------------------------------

**12.2 CMS Service Variables (.env)**

**Endpoint:** apps/cms-service/.env

  -------------------------- -------------------------------------------------
  **Variable**               **Description**

  **DATABASE_URI**           PostgreSQL connection string. Same Supabase
                             instance as API gateway.

  **PAYLOAD_DB_SCHEMA**      PostgreSQL schema name for Payload CMS. Usually:
                             cms

  **PAYLOAD_SECRET**         Secret key for Payload CMS. Minimum 32
                             characters. Used for encryption.

  **PAYLOAD_PORT**           Port CMS service listens on. Default: 3001

  **R2_ACCESS_KEY_ID**       Cloudflare R2 access key. From R2 bucket
                             settings.

  **R2_SECRET_ACCESS_KEY**   Cloudflare R2 secret key. From R2 bucket
                             settings.

  **R2_BUCKET**              R2 bucket name. Example: marketeq-media

  **R2_ENDPOINT**            R2 endpoint URL. Format:
                             https://\[account-id\].r2.cloudflarestorage.com

  **R2_PUBLIC_URL**          Public CDN URL for R2 files. Example:
                             https://media.marketeq.com

  **RABBITMQ_URL**           RabbitMQ connection URL. Same as API gateway.
  -------------------------- -------------------------------------------------

  -----------------------------------------------------------------------
  **Note:** Never commit .env files to Git. Add them to .gitignore. Use a
  secrets manager (e.g. AWS Secrets Manager, HashiCorp Vault) for
  production.

  -----------------------------------------------------------------------

**Conclusion**

The Marketeq homepage API is a simple, cacheable GET endpoint that
returns fully assembled homepage content. It is public, fast, and
designed for high throughput with minimal backend complexity.

**Key Takeaways**

-   Single endpoint: GET /api/homepage returns everything needed to
    render the homepage.

-   Cached by default: Responses are Redis-cached for 5 minutes with
    event-driven invalidation.

-   A/B test aware: Can serve different variants via mktq_hp_variant
    cookie.

-   Preview-capable: Draft content visible to admins with
    x-preview-token authentication.

-   No external API calls: All data is orchestrated internally from CMS
    and evaluators.

-   Future-proof: New fields are additive; clients must ignore unknown
    fields.

For questions or issues, refer to the troubleshooting section (Section
11) or check the API gateway logs.
