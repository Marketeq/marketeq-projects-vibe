**Marketeq Home Page**

**Testing & QA**

*Unit tests, integration tests, Postman collections, SQL validation
queries, and QA checklists*

April 5, 2026

**Scope: Backend Only**

**1. Testing Strategy Overview**

-   Three testing layers: Unit Tests (Jest), Integration Tests (Jest +
    real services), Manual/API Tests (Postman)

-   Test coverage targets: 80% for service logic, 100% for evaluator
    scoring

-   All tests run via: pnpm test (from the api-gateway or cms-service
    directory)

-   CI/CD runs tests on every PR via GitHub Actions

**2. Unit Tests**

**2.1 HomepageService Unit Tests**

**File:**
apps/api-gateway/src/homepage/\_\_tests\_\_/homepage.service.spec.ts

Full test code covering:

-   should return cached payload on cache hit

-   should fetch from CMS and assemble on cache miss

-   should resolve default homepage when no variant

-   should resolve testing variant when cookie matches

-   should return null when no active default homepage

-   should bypass cache in preview mode

-   should invalidate cache by slug pattern

**2.2 MostPopularEvaluator Unit Tests**

**File:**
apps/api-gateway/src/category-pages/evaluators/\_\_tests\_\_/most-popular.evaluator.spec.ts

Tests:

-   should return listings sorted by most-popular score

-   should normalize scores relative to pool max

-   should apply recency decay (90-day window)

-   should respect admin boost weight

-   should exclude specified IDs

-   should return empty array when no active listings

-   should limit results to requested count

**2.3 HomepageController Unit Tests**

**File:**
apps/api-gateway/src/homepage/\_\_tests\_\_/homepage.controller.spec.ts

Tests:

-   should return 200 with homepage payload

-   should return 404 when no homepage found

-   should return 403 for invalid preview token

-   should read variant from cookie

**3. Integration Tests**

**3.1 Homepage API Integration Test**

**File:** apps/api-gateway/test/homepage.e2e-spec.ts

Full test code:

-   Setup: seed CMS with test homepage entry, seed listings in
    PostgreSQL

-   GET /api/homepage should return assembled payload with sections

-   GET /api/homepage with variant cookie should return testing variant

-   GET /api/homepage?preview=1 with valid token should return draft

-   GET /api/homepage?preview=1 without token should return 403

-   Teardown: clean up test data

**3.2 Cache Integration Test**

-   Verify first request populates cache

-   Verify second request serves from cache (faster)

-   Verify RabbitMQ event clears cache

-   Verify subsequent request assembles fresh

**4. Postman Collection**

**4.1 Collection Structure**

Collection name: \"Marketeq Homepage API\"

Environment variables: base_url, preview_token

Requests:

1.  GET Homepage (Default) --- GET {{base_url}}/api/homepage

2.  GET Homepage (A/B Variant) --- with Cookie header:
    mktq_hp_variant=experiment-a

3.  GET Homepage (Preview) --- GET {{base_url}}/api/homepage?preview=1
    with x-preview-token header

4.  GET Homepage (No Default) --- Expected 404

**4.2 Postman Tests (Assertions)**

For each request, document the test scripts:

  -----------------------------------------------------------------------
  // Default homepage\
  pm.test(\"Status is 200\", () =\> pm.response.to.have.status(200));\
  pm.test(\"Has hero object\", () =\> {\
  const json = pm.response.json();\
  pm.expect(json).to.have.property(\"hero\");\
  });\
  pm.test(\"Has sections array\", () =\> {\
  const json = pm.response.json();\
  pm.expect(json.sections).to.be.an(\"array\");\
  });\
  pm.test(\"Sections have blocks\", () =\> {\
  const json = pm.response.json();\
  json.sections.forEach(s =\> {\
  pm.expect(s.blocks).to.be.an(\"array\").that.is.not.empty;\
  });\
  });

  -----------------------------------------------------------------------

**5. SQL Validation Queries**

**5.1 Verify Homepages Table Exists**

  -----------------------------------------------------------------------
  SELECT table_name FROM information_schema.tables\
  WHERE table_schema = \'cms\' AND table_name = \'homepages\';

  -----------------------------------------------------------------------

**5.2 Verify Default Homepage**

  -----------------------------------------------------------------------
  SELECT id, title, slug, status, is_default\
  FROM cms.homepages\
  WHERE is_default = true AND status = \'active\';

  -----------------------------------------------------------------------

Expected: exactly 1 row

**5.3 Check for Orphaned References**

  -----------------------------------------------------------------------
  \-- Check if pinned listing IDs in homepage sections reference existing
  listings\
  \-- (This requires parsing JSONB)\
  SELECT h.id, h.title\
  FROM cms.homepages h\
  WHERE h.sections::text LIKE \'%pinnedItems%\'\
  AND NOT EXISTS (\
  SELECT 1 FROM public.listings l\
  WHERE l.id::text = ANY(\
  SELECT jsonb_array_elements_text(\
  jsonb_path_query_array(h.sections, \'\$\[\*\].pinnedItems\[\*\]\')\
  )\
  )\
  );

  -----------------------------------------------------------------------

**5.4 Listing Data Health Check**

  -----------------------------------------------------------------------
  SELECT type, COUNT(\*) as count,\
  AVG(rating) as avg_rating,\
  AVG(completions_count) as avg_completions\
  FROM public.listings\
  WHERE status = \'active\'\
  GROUP BY type;

  -----------------------------------------------------------------------

**5.5 Verify Evaluator Data Availability**

  -----------------------------------------------------------------------
  \-- Ensure enough active listings per type for homepage sections\
  SELECT type, COUNT(\*) as active_count\
  FROM public.listings\
  WHERE status = \'active\'\
  GROUP BY type\
  HAVING COUNT(\*) \< 12;\
  \-- If any rows returned, those entity types may show empty sections

  -----------------------------------------------------------------------

**6. QA Checklist**

  ------------------------ ----------------------------------------------
  **Checklist Item**       **Expected Result**

  **Default homepage       Status 200, full payload in response
  returns 200 with full    
  payload**                

  **All sections contain   No empty sections, all have content
  at least one block with  
  items**                  

  **Carousel blocks have   Pagination present in carousel
  pagination object**      

  **Grid blocks do not     No pagination in grid blocks
  have pagination object** 

  **Preview mode shows     Draft homepage returned with valid token
  draft content**          

  **Preview without token  403 Forbidden status
  returns 403**            

  **A/B variant cookie     Variant homepage matches cookie
  returns correct          
  homepage**               

  **Missing variant cookie Default homepage returned
  returns default**        

  **Cache invalidation     Cache refreshed, new data served
  works after CMS edit**   

  **Banner respects        Banner shown only when enabled
  enabled flag**           

  **Banner respects        Banner hidden after expiration
  expiresAt date**         

  **SEO fields are         Title, description, keywords present
  populated**              

  **Popular tabs array     All categories have valid IDs
  contains valid           
  categories**             

  **More categories list   All categories have valid IDs
  contains valid           
  categories**             

  **No duplicate listings  Each listing appears once
  across sections**        

  **Pinned items appear    Pinned items in correct position
  first when manual mode   
  enabled**                

  **Empty sections are     No empty sections in payload
  suppressed (not in       
  response)**              

  **Response time \< 50ms  Cached requests complete in \<50ms
  on cache hit**           

  **Response time \< 500ms Fresh requests complete in \<500ms
  on cache miss**          

  **404 returned when no   404 status when no default
  active default homepage  
  exists**                 
  ------------------------ ----------------------------------------------

**7. Test Data Seeding**

**7.1 Seed Script for Local Development**

**File:** apps/api-gateway/test/seed-homepage.ts

Script that:

-   Creates test listings (at least 20 projects, 20 services, 10 teams,
    10 talent)

-   Creates test categories

-   Creates a default homepage in CMS with 3 sections

-   Creates a testing variant homepage

-   Useful for local dev and CI

**7.2 Seed Commands**

  -----------------------------------------------------------------------
  \# Run from api-gateway directory\
  npx ts-node test/seed-homepage.ts

  -----------------------------------------------------------------------

**8. CI/CD Integration**

-   Tests run on every PR via GitHub Actions

-   Workflow file: .github/workflows/test.yml

-   Services: PostgreSQL, RabbitMQ, Redis (all via Docker in CI)

-   Steps: install deps → run migrations → seed data → run tests

-   Test results reported as PR checks
