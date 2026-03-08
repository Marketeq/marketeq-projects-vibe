**Category Service API Documentation**

## **Base URL**

- **Local:** http://localhost:3002/api

## **Authentication**

- **When available, send JWT token in header:\**
  Authorization: Bearer \<token\>\
  *(Note: in this code snapshot, controllers do not apply auth guards;
  auth may be enforced at the API gateway level.)*

- **Internal service endpoints (optional / if enabled in gateway):\**
  x-service-token: \<SERVICE_TOKEN\>

## **Content Type**

- Content-Type: application/json

## **Standard Error Pattern** 

- **400 Bad Request** → Validation error / missing required fields
  (ValidationPipe enabled)

- **401 Unauthorized** → Missing/invalid token (when enforced by
  gateway)

- **404 Not Found** → Entity not found (e.g., category slug/uuid not
  found)

- **429 Too Many Requests** → Rate limiting (when enabled)

# **1. System Overview**

The **Category Service** keeps Marketplace categories and tags
synchronized between **Strapi (CMS)** and the **NestJS database**, and
serves **SEO category pages** for the frontend. It also supports
category deletion, child reassignment, and content reassignment preview
tooling for safe maintenance operations.

# **2. High Level Architecture**

Strapi triggers webhook-style sync calls into this service, which
upserts categories/tags into Postgres via TypeORM. The frontend reads
category-page content via /category-pages/\* routes which assemble
metadata, navigation, blocks, suggestions, and editorial content using
internal adapters/services.

# **3. Workflow Overview**

1.  **Strapi publish/update → Nest sync:** Strapi calls /categories/sync
    and /tags/sync to upsert data locally.

2.  **Marketplace category pages:** Frontend requests
    /category-pages/:l1(/:l2/:l3) to render SEO category pages with
    blocks and suggestions.

3.  **Admin maintenance (safe delete):** Use preview + reassign + delete
    endpoints to move children/content and remove categories safely.

# **4. Key Dependencies and Modules**

- **NestJS + ValidationPipe**: request validation and transformation

- **TypeORM + Postgres**: categories_v2, tags_v2, join tables

- **Strapi integration**: push/pull sync and deletion webhooks

- **Category Pages module**: slug-path resolution, breadcrumbs, blocks,
  editorial content, suggestions

- **Content module**: reassignment discovery tools (preview
  counts/sample; reassign content)

# **5. Current State and Responsibilities**

- This document covers **only endpoints implemented in the repo** (no
  docs-only/QA-only endpoints).

- Sync endpoints support Strapi-driven updates for **categories** and
  **tags**.

- Category deletion includes safe handling for children by
  requiring/deriving reassignment targets.

# **6. Access & Tools**

  **Tool**                 **Purpose**                                                        **Notes**
  ------------------------ ------------------------------------------------------------------ -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  GitHub Repo              Category service codebase                                          [marketeq-projects-nestjs](https://github.com/Marketeq/marketeq-projects-nestjs/tree/main)/[apps](https://github.com/Marketeq/marketeq-projects-nestjs/tree/main/apps)/category-service
  Strapi Admin             Manage categories/tags, approvals, publish to marketplace          Example: https://strapi.\<env\>.yourdomain.com/admin (needs Strapi admin credentials + correct environment)
  API Base URL (Gateway)   Call category-service endpoints via gateway                        Example: https://api.\<env\>.yourdomain.com/api (ensure /api prefix is included)
  Postman Collection       Manual endpoint testing (sync, delete, reassign, category-pages)   Store BASE_URL, JWT_TOKEN, SERVICE_TOKEN as env vars; include sample payloads for Strapi sync + reassignment
  Database Console         Verify category/tag rows + relations after sync                    Example: pgAdmin / TablePlus; check categories_v2, tags_v2, join tables; confirm parent-child links + slugs
  Logs / Observability     Debug Strapi webhook calls + sync failures                         Example: Render logs / CloudWatch / Grafana; filter by request path (/categories/sync, /tags/sync) and UUID

# **7. Endpoints**

## **Quick Reference (Implemented in Code)**

### **Categories**

- POST /api/categories/sync

- POST /api/categories/push-test

- POST /api/categories/push

- POST /api/categories/user-subcategory

- POST /api/categories/user-subcategory/moderated

- POST /api/categories/strapi/delete

- GET /api/categories/slug/:slug

- GET /api/categories/:uuid/reassign/preview

- POST /api/categories/:uuid/reassign?to=\<uuid\>

- DELETE /api/categories/:uuid?reassignTo=\<uuid\>

- POST /api/categories/:uuid/delete *(same as DELETE, but POST form)*

- GET /api/categories/test-delete/:uuid?reassignTo=\<uuid\>

- GET /api/categories/test-strapi

### **Tags**

- POST /api/tags/sync

- POST /api/tags/push

- POST /api/tags/push-test

- GET /api/tags/slug/:slug

### **Category Pages**

- POST /api/category-pages/strapi-sync

- GET /api/category-pages/:l1?kind=&cursor=&limit=

- GET /api/category-pages/:l1/:l2?kind=&cursor=&limit=

- GET /api/category-pages/:l1/:l2/:l3?kind=&cursor=&limit=

## **7.1 Categories APIs**

### **7.1.1 POST /api/categories/sync**

**Summary :\**
Upserts a category record from a Strapi payload into the local database.
This is the primary "Strapi → NestJS" sync hook for categories. Returns
a simple OK status so Strapi can treat the webhook as successful.

**Auth:** Bearer token when available.

**Request Body**

  -----------------------------------------------------------------------
  {\
  \"uuid\": \"cat-uuid-1\",\
  \"name\": \"UI Design\",\
  \"slug\": \"ui-design\",\
  \"seo_meta_title\": \"UI Design Services\",\
  \"seo_meta_description\": \"Find UI design experts\",\
  \"approved\": true,\
  \"published_in_marketplace\": true,\
  \"parent\": \"parent-cat-uuid\",\
  \"tags\": \[\
  { \"uuid\": \"tag-uuid-1\", \"name\": \"Figma\", \"slug\": \"figma\" }\
  \]\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Response Body**

  -----------------------------------------------------------------------
  { \"status\": \"ok\" }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Copy-pastable Example**

  -----------------------------------------------------------------------
  await fetch(\`\${BASE_URL}/categories/sync\`, {\
  method: \"POST\",\
  headers: {\
  \"Content-Type\": \"application/json\",\
  \...(token ? { Authorization: \`Bearer \${token}\` } : {})\
  },\
  body: JSON.stringify({\
  uuid: \"cat-uuid-1\",\
  name: \"UI Design\",\
  slug: \"ui-design\",\
  tags: \[{ uuid: \"tag-uuid-1\", name: \"Figma\", slug: \"figma\" }\]\
  })\
  });
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **7.1.2 POST /api/categories/push-test**

**Summary :\**
Creates a dummy category locally and pushes it to Strapi for
validation/testing. Useful for confirming connectivity and Strapi
permissions without needing a full Strapi lifecycle event.

**Auth:** Bearer token when available.

**Request Body:** *(none)*

**Response Body**

  -----------------------------------------------------------------------
  {\
  \"status\": \"ok\",\
  \"data\": { \"uuid\": \"cat-uuid-123\", \"slug\": \"dummy-category\" }\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Copy-pastable Example**

  -----------------------------------------------------------------------
  await fetch(\`\${BASE_URL}/categories/push-test\`, {\
  method: \"POST\",\
  headers: { \...(token ? { Authorization: \`Bearer \${token}\` } : {})
  }\
  });
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **7.1.3 POST /api/categories/push**

**Summary :\**
Upserts a category locally (same as sync) and then pushes the saved
category to Strapi. This is used for manual "force publish" scenarios
where the system needs to confirm Strapi has the latest category.

**Auth:** Bearer token when available.

**Request Body** *(same as /categories/sync)*

  -----------------------------------------------------------------------
  {\
  \"uuid\": \"cat-uuid-1\",\
  \"name\": \"UI Design\",\
  \"slug\": \"ui-design\",\
  \"parent\": \"parent-cat-uuid\",\
  \"tags\": \[{ \"name\": \"Figma\", \"slug\": \"figma\", \"uuid\":
  \"tag-uuid-1\" }\]\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Response Body**

  -----------------------------------------------------------------------
  { \"status\": \"ok\", \"strapiId\": 123 }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Copy-pastable Example**

  -----------------------------------------------------------------------
  await fetch(\`\${BASE_URL}/categories/push\`, {\
  method: \"POST\",\
  headers: {\
  \"Content-Type\": \"application/json\",\
  \...(token ? { Authorization: \`Bearer \${token}\` } : {})\
  },\
  body: JSON.stringify({\
  uuid: \"cat-uuid-1\",\
  name: \"UI Design\",\
  slug: \"ui-design\",\
  tags: \[{ name: \"Figma\", slug: \"figma\", uuid: \"tag-uuid-1\" }\]\
  })\
  });
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **7.1.4 POST /api/categories/user-subcategory**

**Summary :\**
Creates a user-generated subcategory under a given parent UUID. This is
a quick creation path that derives a unique slug and stores the category
locally. Returns the created UUID/slug and resolved parent reference.

**Auth:** Bearer token when available.

**Request Body**

  -----------------------------------------------------------------------
  { \"name\": \"Mobile UI\", \"parentUuid\": \"parent-cat-uuid\" }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Response Body**

  -----------------------------------------------------------------------
  {\
  \"status\": \"ok\",\
  \"data\": { \"uuid\": \"new-cat-uuid\", \"slug\": \"mobile-ui\",
  \"parent\": \"parent-cat-uuid\" }\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Copy-pastable Example**

  -----------------------------------------------------------------------
  await fetch(\`\${BASE_URL}/categories/user-subcategory\`, {\
  method: \"POST\",\
  headers: {\
  \"Content-Type\": \"application/json\",\
  \...(token ? { Authorization: \`Bearer \${token}\` } : {})\
  },\
  body: JSON.stringify({ name: \"Mobile UI\", parentUuid:
  \"parent-cat-uuid\" })\
  });
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **7.1.5 POST /api/categories/user-subcategory/moderated**

**Summary :\**
Creates a user subcategory with moderation-friendly behavior. The parent
UUID is optional, and the endpoint returns the new category uuid/slug
and parent if assigned. This supports "suggested categories" that may be
reviewed before publishing.

**Auth:** Bearer token when available.

**Request Body**

  -----------------------------------------------------------------------
  { \"name\": \"AI Prompting\", \"parentUuid\": \"parent-cat-uuid\" }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Response Body**

  -----------------------------------------------------------------------
  {\
  \"status\": \"ok\",\
  \"data\": { \"uuid\": \"new-cat-uuid\", \"slug\": \"ai-prompting\",
  \"parent\": \"parent-cat-uuid\" }\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Copy-pastable Example**

  -----------------------------------------------------------------------
  await fetch(\`\${BASE_URL}/categories/user-subcategory/moderated\`, {\
  method: \"POST\",\
  headers: {\
  \"Content-Type\": \"application/json\",\
  \...(token ? { Authorization: \`Bearer \${token}\` } : {})\
  },\
  body: JSON.stringify({ name: \"AI Prompting\", parentUuid:
  \"parent-cat-uuid\" })\
  });
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **7.1.6 POST /api/categories/strapi/delete**

**Summary :\**
Handles Strapi delete webhook payloads and deletes the corresponding
local category by UUID. The handler is idempotent: repeated delete
events are treated as "already deleted" and will be ignored safely.

**Auth:** Bearer token when available.

**Request Body** *(webhook payload varies; UUID is extracted from known
shapes)*

  -----------------------------------------------------------------------
  {\
  \"event\": \"entry.delete\",\
  \"entry\": { \"uuid\": \"cat-uuid-1\" }\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Response Body**

  -----------------------------------------------------------------------
  { \"status\": \"ok\" }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Copy-pastable Example**

  -----------------------------------------------------------------------
  await fetch(\`\${BASE_URL}/categories/strapi/delete\`, {\
  method: \"POST\",\
  headers: {\
  \"Content-Type\": \"application/json\",\
  \...(token ? { Authorization: \`Bearer \${token}\` } : {})\
  },\
  body: JSON.stringify({ event: \"entry.delete\", entry: { uuid:
  \"cat-uuid-1\" } })\
  });
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **7.1.7 GET /api/categories/slug/:slug**

**Summary:\**
Fetches a category by its slug from the local DB. Useful for debugging
and verifying sync correctness. Returns category fields plus parent and
tags relations.

**Auth:** Bearer token when available.

**Response Body (example)**

  -----------------------------------------------------------------------
  {\
  \"id\": 10,\
  \"uuid\": \"cat-uuid-1\",\
  \"name\": \"UI Design\",\
  \"slug\": \"ui-design\",\
  \"seo_meta_title\": null,\
  \"seo_meta_description\": null,\
  \"approved\": true,\
  \"published_in_marketplace\": true,\
  \"parentId\": 1,\
  \"created_at\": \"2026-02-02T12:00:00.000Z\",\
  \"updated_at\": \"2026-02-02T12:00:00.000Z\",\
  \"parent\": { \"uuid\": \"parent-cat-uuid\", \"slug\": \"creative\",
  \"name\": \"Creative\" },\
  \"tags\": \[{ \"uuid\": \"tag-uuid-1\", \"name\": \"Figma\", \"slug\":
  \"figma\" }\]\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Copy-pastable Example**

  -----------------------------------------------------------------------
  await fetch(\`\${BASE_URL}/categories/slug/ui-design\`, {\
  method: \"GET\",\
  headers: { \...(token ? { Authorization: \`Bearer \${token}\` } : {})
  }\
  });
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **7.1.8 GET /api/categories/:uuid/reassign/preview**

**Summary :\**
Previews how much Strapi content would be impacted by deleting a
category. Returns counts by content type and a sample set of items that
reference the category so admins can confirm impact before reassignment.

**Auth:** Bearer token when available.

**Response Body**

  -----------------------------------------------------------------------
  {\
  \"counts\": { \"projects\": 4, \"services\": 2 },\
  \"sample\": {\
  \"projects\": \[{ \"id\": 101, \"title\": \"Landing Page Redesign\"
  }\],\
  \"services\": \[{ \"id\": 55, \"title\": \"UI Audit\" }\]\
  }\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Copy-pastable Example**

  -----------------------------------------------------------------------
  await fetch(\`\${BASE_URL}/categories/cat-uuid-1/reassign/preview\`, {\
  method: \"GET\",\
  headers: { \...(token ? { Authorization: \`Bearer \${token}\` } : {})
  }\
  });
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **7.1.9 POST /api/categories/:uuid/reassign?to=\<uuid\>**

**Summary :\**
Reassigns content in Strapi from one category UUID to another. This is
used before deletion to keep marketplace content attached to a valid
category. Returns a simple OK status when the reassignment completes.

**Auth:** Bearer token when available.

**Query Params**

- to (required): target category UUID

**Response Body**

  -----------------------------------------------------------------------
  { \"status\": \"ok\" }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Copy-pastable Example**

  -----------------------------------------------------------------------
  await
  fetch(\`\${BASE_URL}/categories/cat-uuid-1/reassign?to=cat-uuid-2\`, {\
  method: \"POST\",\
  headers: { \...(token ? { Authorization: \`Bearer \${token}\` } : {})
  }\
  });
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **7.1.10 DELETE /api/categories/:uuid?reassignTo=\<uuid\>**

**Summary :\**
Deletes a category by UUID with safe handling for children. If the
category has children, a reassignment target must be available (explicit
reassignTo, parent category, or a fallback UUID in env). Returns {
status: \"deleted\" } when successful.

**Auth:** Bearer token when available.

**Query Params**

- reassignTo (optional): target UUID to reparent children

**Response Body**

  -----------------------------------------------------------------------
  { \"status\": \"deleted\" }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Copy-pastable Example**

  -----------------------------------------------------------------------
  await
  fetch(\`\${BASE_URL}/categories/cat-uuid-1?reassignTo=cat-uuid-2\`, {\
  method: \"DELETE\",\
  headers: { \...(token ? { Authorization: \`Bearer \${token}\` } : {})
  }\
  });
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **7.1.11 POST /api/categories/:uuid/delete**

**Summary :\**
Same deletion behavior as the DELETE endpoint, but accepts reassignTo in
the request body. This exists for clients/tools that prefer POST
semantics. Returns the same { status: \"deleted\" } response.

**Auth:** Bearer token when available.

**Request Body**

  -----------------------------------------------------------------------
  { \"reassignTo\": \"cat-uuid-2\" }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Response Body**

  -----------------------------------------------------------------------
  { \"status\": \"deleted\" }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Copy-pastable Example**

  -----------------------------------------------------------------------
  await fetch(\`\${BASE_URL}/categories/cat-uuid-1/delete\`, {\
  method: \"POST\",\
  headers: {\
  \"Content-Type\": \"application/json\",\
  \...(token ? { Authorization: \`Bearer \${token}\` } : {})\
  },\
  body: JSON.stringify({ reassignTo: \"cat-uuid-2\" })\
  });
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **7.1.12 GET /api/categories/test-delete/:uuid?reassignTo=\<uuid\>**

**Summary :\**
Dry-run helper for deletion to verify parameters are being passed
correctly. This does not delete anything; it returns a simple message
and whether reassignment would work based on supplied params. Useful for
quick manual checks.

**Auth:** Bearer token when available.

**Response Body**

  -----------------------------------------------------------------------
  {\
  \"uuid\": \"cat-uuid-1\",\
  \"reassignTo\": \"cat-uuid-2\",\
  \"message\": \"This would delete the category\",\
  \"willWork\": true\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Copy-pastable Example**

  ---------------------------------------------------------------------------------
  await
  fetch(\`\${BASE_URL}/categories/test-delete/cat-uuid-1?reassignTo=cat-uuid-2\`,
  {\
  method: \"GET\",\
  headers: { \...(token ? { Authorization: \`Bearer \${token}\` } : {}) }\
  });
  ---------------------------------------------------------------------------------

  ---------------------------------------------------------------------------------

### **7.1.13 GET /api/categories/test-strapi**

**Summary :\**
Connectivity test endpoint that checks if the service can talk to Strapi
correctly. Use this to validate environment variables and Strapi
credentials/config. Returns the Strapi connection test result from the
service layer.

**Auth:** Bearer token when available.

**Response Body (example)**

  -----------------------------------------------------------------------
  { \"status\": \"ok\", \"message\": \"Strapi connection successful\" }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Copy-pastable Example**

  -----------------------------------------------------------------------
  await fetch(\`\${BASE_URL}/categories/test-strapi\`, {\
  method: \"GET\",\
  headers: { \...(token ? { Authorization: \`Bearer \${token}\` } : {})
  }\
  });
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **7.2 Tags APIs**

### **7.2.1 POST /api/tags/sync**

**Summary :\**
Upserts a tag from a Strapi payload into the local database. The handler
ignores Strapi intermediate update events (entry.update) and only
processes publish payloads. Returns OK or ignored with a reason.

**Auth:** Bearer token when available.

**Request Body (example Strapi style)**

  -----------------------------------------------------------------------
  {\
  \"event\": \"entry.publish\",\
  \"entry\": {\
  \"uuid\": \"tag-uuid-1\",\
  \"name\": \"Figma\",\
  \"slug\": \"figma\"\
  }\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Response Body (ok)**

  -----------------------------------------------------------------------
  {\
  \"status\": \"ok\",\
  \"tag\": { \"uuid\": \"tag-uuid-1\", \"name\": \"Figma\", \"slug\":
  \"figma\" }\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Response Body (ignored)**

  -----------------------------------------------------------------------
  { \"status\": \"ignored\", \"reason\": \"update event skipped\" }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Copy-pastable Example**

  -----------------------------------------------------------------------
  await fetch(\`\${BASE_URL}/tags/sync\`, {\
  method: \"POST\",\
  headers: {\
  \"Content-Type\": \"application/json\",\
  \...(token ? { Authorization: \`Bearer \${token}\` } : {})\
  },\
  body: JSON.stringify({\
  event: \"entry.publish\",\
  entry: { uuid: \"tag-uuid-1\", name: \"Figma\", slug: \"figma\" }\
  })\
  });
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **7.2.2 POST /api/tags/push**

**Summary :\**
Upserts a tag locally and then pushes it to Strapi (create/update). Use
this for manual "force push" when Strapi needs to be updated from the
service state. Returns Strapi id for traceability.

**Auth:** Bearer token when available.

**Request Body**

  -----------------------------------------------------------------------
  { \"uuid\": \"tag-uuid-1\", \"name\": \"Figma\", \"slug\": \"figma\" }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Response Body**

  -----------------------------------------------------------------------
  { \"status\": \"ok\", \"strapiId\": 456 }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Copy-pastable Example**

  -----------------------------------------------------------------------
  await fetch(\`\${BASE_URL}/tags/push\`, {\
  method: \"POST\",\
  headers: {\
  \"Content-Type\": \"application/json\",\
  \...(token ? { Authorization: \`Bearer \${token}\` } : {})\
  },\
  body: JSON.stringify({ uuid: \"tag-uuid-1\", name: \"Figma\", slug:
  \"figma\" })\
  });
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **7.2.3 POST /api/tags/push-test**

**Summary :\**
Creates a dummy local tag and pushes it to Strapi to validate
connectivity and permissions. This is a fast sanity test during setup or
troubleshooting. Returns created uuid/slug.

**Auth:** Bearer token when available.

**Response Body**

  -----------------------------------------------------------------------
  { \"status\": \"ok\", \"data\": { \"uuid\": \"tag-uuid-xyz\", \"slug\":
  \"dummy-tag\" } }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Copy-pastable Example**

  -----------------------------------------------------------------------
  await fetch(\`\${BASE_URL}/tags/push-test\`, {\
  method: \"POST\",\
  headers: { \...(token ? { Authorization: \`Bearer \${token}\` } : {})
  }\
  });
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **7.2.4 GET /api/tags/slug/:slug**

**Summary :\**
Fetches a tag by slug from the local DB. Used for debugging sync status
and confirming a tag exists before category-tag assignments. Returns the
Tag entity fields.

**Auth:** Bearer token when available.

**Response Body (example)**

  -----------------------------------------------------------------------
  {\
  \"id\": 22,\
  \"uuid\": \"tag-uuid-1\",\
  \"name\": \"Figma\",\
  \"slug\": \"figma\",\
  \"created_at\": \"2026-02-02T12:00:00.000Z\",\
  \"updated_at\": \"2026-02-02T12:00:00.000Z\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Copy-pastable Example**

  -----------------------------------------------------------------------
  await fetch(\`\${BASE_URL}/tags/slug/figma\`, {\
  method: \"GET\",\
  headers: { \...(token ? { Authorization: \`Bearer \${token}\` } : {})
  }\
  });
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **7.3 Category Pages APIs**

### **7.3.1 POST /api/category-pages/strapi-sync**

**Summary :\**
Webhook endpoint used to upsert category/tag data for the Category Pages
system. It inspects payload model type (category vs tag) and routes to
the correct upsert handler. Returns success/ignored with a clear message
for webhook observability.

**Auth:** Bearer token when available.

**Request Body (example)**

  -----------------------------------------------------------------------
  {\
  \"model\": \"category\",\
  \"entry\": { \"uuid\": \"cat-uuid-1\", \"name\": \"UI Design\",
  \"slug\": \"ui-design\" }\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Response Body (success)**

  -----------------------------------------------------------------------
  { \"status\": \"success\", \"message\": \"Category UI Design synced\" }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Response Body (ignored)**

  -----------------------------------------------------------------------
  { \"status\": \"ignored\", \"reason\": \"Model \'xyz\' not handled\" }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Copy-pastable Example**

  -----------------------------------------------------------------------
  await fetch(\`\${BASE_URL}/category-pages/strapi-sync\`, {\
  method: \"POST\",\
  headers: {\
  \"Content-Type\": \"application/json\",\
  \...(token ? { Authorization: \`Bearer \${token}\` } : {})\
  },\
  body: JSON.stringify({\
  model: \"category\",\
  entry: { uuid: \"cat-uuid-1\", name: \"UI Design\", slug: \"ui-design\"
  }\
  })\
  });
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **7.3.2 GET /api/category-pages/:l1**

**Summary :\**
Returns an L1 (root) category page assembled by slug path. Includes
category metadata, breadcrumbs, parent/children/siblings, tags, blocks,
suggestions, and editorial content if available. Supports filtering and
pagination controls for blocks via query params.

**Auth:** Bearer token when available.

**Query Params**

- kind (optional): show-all \| projects \| services \| teams \| talent

- cursor (optional): opaque pagination cursor

- limit (optional): items per block (max 10)

**Response Body (example shape)**

  -----------------------------------------------------------------------
  {\
  \"category\": { \"uuid\": \"cat-uuid-1\", \"name\": \"Creative\",
  \"slug\": \"creative\" },\
  \"breadcrumbs\": \[{ \"uuid\": \"cat-uuid-1\", \"name\": \"Creative\",
  \"slug\": \"creative\" }\],\
  \"parent\": null,\
  \"children\": \[{ \"uuid\": \"cat-uuid-2\", \"name\": \"UI Design\",
  \"slug\": \"ui-design\" }\],\
  \"siblings\": \[\],\
  \"relatedCategories\": \[\],\
  \"tags\": \[{ \"uuid\": \"tag-uuid-1\", \"name\": \"Figma\", \"slug\":
  \"figma\" }\],\
  \"blocks\": \[\],\
  \"suggestions\": {},\
  \"editorial\": {}\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Copy-pastable Example**

  ------------------------------------------------------------------------
  await
  fetch(\`\${BASE_URL}/category-pages/creative?kind=show-all&limit=10\`,
  {\
  method: \"GET\",\
  headers: { \...(token ? { Authorization: \`Bearer \${token}\` } : {}) }\
  });
  ------------------------------------------------------------------------

  ------------------------------------------------------------------------

### **7.3.3 GET /api/category-pages/:l1/:l2**

**Summary :\**
Returns an L2 category page assembled from a 2-level slug path. Response
includes the same page structure as L1, but resolves the category by
first finding its L1 parent then the child under it. Supports the same
kind/cursor/limit query pattern.

**Auth:** Bearer token when available.

**Copy-pastable Example**

  ----------------------------------------------------------------------------------
  await
  fetch(\`\${BASE_URL}/category-pages/creative/ui-design?kind=projects&limit=10\`,
  {\
  method: \"GET\",\
  headers: { \...(token ? { Authorization: \`Bearer \${token}\` } : {}) }\
  });
  ----------------------------------------------------------------------------------

  ----------------------------------------------------------------------------------

**Response Body:** *(same shape as L1; category/breadcrumbs differ by
path)*

### **7.3.4 GET /api/category-pages/:l1/:l2/:l3**

**Summary :\**
Returns an L3 category page assembled from a 3-level slug path. The
service resolves L1 → L2 → L3 in order and returns the same
category-page structure. Useful for deep SEO navigation while keeping
frontend API stable.

**Auth:** Bearer token when available.

**Copy-pastable Example**

  --------------------------------------------------------------------------------------------
  await
  fetch(\`\${BASE_URL}/category-pages/creative/ui-design/mobile-ui?kind=services&limit=10\`,
  {\
  method: \"GET\",\
  headers: { \...(token ? { Authorization: \`Bearer \${token}\` } : {}) }\
  });
  --------------------------------------------------------------------------------------------

  --------------------------------------------------------------------------------------------

**Response Body:** *(same shape as L1; category/breadcrumbs differ by
path)*

## **8. Notes & Constraints**

- All endpoints are prefixed by /api (global prefix set in main.ts) and
  default port is 3002.

- ValidationPipe is enabled with whitelist: true, so unknown fields in
  request bodies may be stripped.

- Some endpoints are designed for internal/admin workflows (sync,
  delete, reassign). For production, ensure these are protected at the
  gateway.
