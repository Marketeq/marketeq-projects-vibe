# **API Documentation -- Autocomplete Service**

Base URL: \${process.env.NEXT_PUBLIC_API_BASE_URL}\
Auth: Authorization: Bearer \<token\> when available (same convention as
Checkout template)\
Content-Type: application/json\
Errors: Non-2xx returns include JSON { \"message\": string, \"code\":
string? }\
Notes: Frontend should call only the platform API base URL (do not
hardcode microservice hostnames)

## **🧭 1. System Overview**

The Autocomplete Service powers "typeahead" suggestions across
onboarding and related flows (e.g., skills, languages, location, job
title). The goal is to give users fast, relevant suggestions while
keeping the data normalized and consistent platform-wide.

Long-term, the service is intended to support ingestion of
user-generated values (submission), optional moderation (review queue),
and category/type mapping, so autocomplete can scale beyond static JSON
and be reused across multiple screens and sprints.

## **🧱 2. High-Level Architecture**

1.  **Frontend (Onboarding + shared autocomplete UI components)\**
    Autocomplete appears in onboarding inputs such as "desired skills",
    "languages", "location", and "most recent job title".\
    The frontend calls backend endpoints to retrieve suggestions as the
    user types.

2.  **Backend (autocomplete-service microservice)\**
    The docs describe a dedicated microservice providing endpoints for
    fetch, submit, review, and category mapping.

3.  **Data Layer (current vs planned)**

- Planned architecture mentions Postgres tables for entries, categories,
  review queue, and type-map.

- Migration guidance emphasizes preserving the existing JSON shape/keys
  (e.g., label, id) to avoid breaking dropdown integrations.

## **⚙️ 3. Workflow Overview**

1.  **User types into an onboarding field**
    (skills/languages/location/job title).

2.  **Frontend requests suggestions** from the service (planned pattern
    is GET /autocomplete/:type?q=\...).

3.  **Service returns suggestions** in the same structure the frontend
    expects (migration doc explicitly warns not to change field shape).

4.  Optional future steps: **submit user-generated values**,
    **moderate/review**, and **manage category/type mappings**.

## **🧩 4. Key Dependencies and Modules**

**Frameworks & Libraries (planned)**

- NestJS for controllers/modules/services (matching the platform pattern
  and the template style).

- Fuzzy search (migration guide uses Fuse.js for label matching) to
  preserve current behavior while transitioning from static JSON.

**Data Sources**

- Static JSON seed lists for skills/job titles/languages/etc are
  referenced as the current structure and migration source.

- Postgres is planned as the canonical source of truth for submitted +
  approved entries.

## **🧱 5. Current State & Responsibilities**

### **✅ What is implemented in backend code right now**

- Only **one endpoint is actually coded** in the uploaded
  autocomplete-service.zip:\
  **GET /autocomplete/categories?q=\...** returning category/subcategory
  suggestions (DB-backed).

### **🧩 What docs say should exist (but code does not yet implement)**

Docs list these endpoints for the microservice:

- POST /autocomplete/submit

- GET /autocomplete/:type

- GET /autocomplete/category-map

- PATCH /autocomplete/review

### **Why we document "docs first" (what you can tell your supervisor)**

Because the FE API documentation is meant to be the **contract used by
frontend**, and the docs explicitly emphasize preserving the existing
shape and migration behavior (so onboarding doesn't break).\
So the document follows the **intended architecture + UI requirements**,
while clearly calling out the **single endpoint currently implemented**.

## **🔐 6. Access & Tools**

  **Tool**                  **Purpose**                     **Notes**
  ------------------------- ------------------------------- ----------------------------------------------------------------------------------------------------------------------
  GitHub Repo               Autocomplete Service codebase   marketeq-projects-nestjs/apps/autocomplete-service *(placeholder --- you will replace with exact path/URL)*
  Vercel Frontend Project   Testing & Live builds           marketeq-projects-frontend-testing and marketeq-projects-live
  Postman Collection        Testing endpoints               Includes all Autocomplete API routes with sample payloads
  Environment Setup         Local .env variables            API base URL, auth token (if applicable), DB credentials (if running service locally), and any required service keys

# **Autocomplete APIs**

## **A) Onboarding Categories Autocomplete (Implemented in Code)**

### **Get Category Suggestions**

Purpose: Returns category/subcategory suggestions for onboarding fields
that require "Category" style search. This is the **only endpoint
currently implemented** in backend code, and it supports a query string
to search suggestions.

Used in UI: Onboarding flows where users select categories and need
quick suggestions (the onboarding screens show category-driven selection
patterns).

**Method & URL:** GET /autocomplete/categories?q={query}\
**Auth:** Bearer token (optional / when available)\
**Query Params:**

- q (string, required) --- Example: ux

**Request Body:** *(none)*

**Response (200):**

  -----------------------------------------------------------------------
  \[\
  { \"value\": \"UX / UI Experts\", \"uuid\":
  \"b7f4c5d8-1111-2222-3333-abcdefabcdef\", \"type\": \"category\" },\
  { \"value\": \"UX/UI Designer\", \"uuid\":
  \"c8a9d1e2-4444-5555-6666-fedcfedcfedc\", \"type\": \"subcategory\" }\
  \]
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Common Errors:**

- 400 Missing/invalid query

- 500 Unexpected server error

**Copy-Paste Example:**

  ---------------------------------------------------------------------------------------------------------
  const res = await
  fetch(\`\${process.env.NEXT_PUBLIC_API_BASE_URL}/autocomplete/categories?q=\${encodeURIComponent(q)}\`,
  {\
  headers: token ? { Authorization: \`Bearer \${token}\` } : {}\
  });\
  if (!res.ok) throw new Error((await res.json()).message);\
  const suggestions = await res.json();
  ---------------------------------------------------------------------------------------------------------

  ---------------------------------------------------------------------------------------------------------

## **B) Planned Endpoints (Defined in Docs + Required for Full Autocomplete)**

> Important: The docs specify these endpoints exist , but the uploaded
> backend code does **not** implement them yet.\
> The request/response bodies below are **Proposed**, constrained to
> what the docs/UI actually imply (and keeping the legacy JSON shape,
> like label/id, to avoid breaking the frontend).

### **1) Fetch Suggestions by Type (Skills / Languages / Titles / Location)**

Purpose: Fetch approved suggestions for a given type used by onboarding
inputs (skills, languages, job titles, etc.). The migration guide
explicitly shows this fetch pattern and includes q as the search string.

Used in UI:

- "Enter desired skills"

- "What languages do you speak?"

- "What's your location?"

- "What's your most recent job title?"

**Method & URL:** GET /autocomplete/{type}?q={query}\
**Auth:** Bearer token (optional / when available)\
**Path Params:**

- type (string, required) --- Example: skills, languages, job_titles

**Query Params:**

- q (string, optional) --- Example: rea

**Request Body:** *(none)*

**Response (200) --- Proposed :**

  -----------------------------------------------------------------------
  \[\
  { \"id\": \"skill_001\", \"label\": \"React.js\" },\
  { \"id\": \"skill_002\", \"label\": \"React Native\" }\
  \]
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Common Errors:**

- 404 Unknown type (no backing dataset)

- 500 Dataset load/search failure

**Copy-Paste Example:**

  -------------------------------------------------------------------------------------------------------
  const res = await
  fetch(\`\${process.env.NEXT_PUBLIC_API_BASE_URL}/autocomplete/\${type}?q=\${encodeURIComponent(q)}\`,
  {\
  headers: token ? { Authorization: \`Bearer \${token}\` } : {}\
  });\
  if (!res.ok) throw new Error((await res.json()).message);\
  const suggestions = await res.json();
  -------------------------------------------------------------------------------------------------------

  -------------------------------------------------------------------------------------------------------

### **2) Submit a New Autocomplete Value**

Purpose: Receive user-generated autocomplete values so the system can
sanitize, normalize, and store them for future approval/usage. Docs
describe accepting user-generated input and saving to a shared DB.

Used in UI: Any onboarding input that allows custom entry when the
desired value isn't found (skills, titles, etc.).

**Method & URL:** POST /autocomplete/submit\
**Auth:** Bearer token (optional / when available)

**Request Body --- Proposed (minimum fields; reuse label to preserve FE
shape):**

  -----------------------------------------------------------------------
  {\
  \"type\": \"skills\",\
  \"label\": \"Tailwind CSS\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Response (201) --- Proposed:**

  -----------------------------------------------------------------------
  {\
  \"type\": \"skills\",\
  \"label\": \"Tailwind CSS\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Common Errors:**

- 400 Validation failed (missing type/label)

- 401 Not authenticated (if later enforced)

- 409 Duplicate submission (if later enforced)

**Copy-Paste Example:**

  -------------------------------------------------------------------------
  const res = await
  fetch(\`\${process.env.NEXT_PUBLIC_API_BASE_URL}/autocomplete/submit\`,
  {\
  method: \'POST\',\
  headers: {\
  \'Content-Type\': \'application/json\',\
  \...(token ? { Authorization: \`Bearer \${token}\` } : {})\
  },\
  body: JSON.stringify({ type, label })\
  });\
  if (!res.ok) throw new Error((await res.json()).message);\
  const submitted = await res.json();
  -------------------------------------------------------------------------

  -------------------------------------------------------------------------

### **3) Get Category-to-Type Mappings**

Purpose: Returns category/type mapping data so the frontend (or admin
tooling) can understand which autocomplete types map to which
categories. Docs list this endpoint explicitly.

Used in UI: Not directly visible in onboarding UI, but supports
consistent categorization of suggestions across onboarding and future
reuse.

**Method & URL:** GET /autocomplete/category-map\
**Auth:** Bearer token (optional / when available)

**Request Body:** *(none)*

**Response (200) --- Proposed:**

  -----------------------------------------------------------------------
  \[\
  { \"type\": \"skills\", \"category\": \"Development \> Frontend
  Frameworks\" },\
  { \"type\": \"job_titles\", \"category\": \"Roles\" }\
  \]
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Common Errors:**

- 500 Mapping store unavailable

**Copy-Paste Example:**

  -------------------------------------------------------------------------------
  const res = await
  fetch(\`\${process.env.NEXT_PUBLIC_API_BASE_URL}/autocomplete/category-map\`,
  {\
  headers: token ? { Authorization: \`Bearer \${token}\` } : {}\
  });\
  if (!res.ok) throw new Error((await res.json()).message);\
  const map = await res.json();
  -------------------------------------------------------------------------------

  -------------------------------------------------------------------------------

### **4) Review Queue (Approve / Reject Flagged Terms)**

Purpose: Admin moderation endpoint to approve/reject flagged terms that
were submitted. Docs list this endpoint as "Manually approve/reject
flagged terms."

Used in UI: Admin/internal tools (not onboarding directly). Once
approved, values can appear in future autocomplete fetch results.

**Method & URL:** PATCH /autocomplete/review\
**Auth:** Bearer token (recommended; likely required when implemented)

**Request Body --- Proposed (minimal moderation action):**

  -----------------------------------------------------------------------
  {\
  \"uuid\": \"c8a9d1e2-4444-5555-6666-fedcfedcfedc\",\
  \"decision\": \"approve\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Response (200) --- Proposed:**

  -----------------------------------------------------------------------
  {\
  \"uuid\": \"c8a9d1e2-4444-5555-6666-fedcfedcfedc\",\
  \"decision\": \"approve\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Common Errors:**

- 400 Invalid decision (must be approve/reject)

- 401 Not authenticated

- 404 Item not found in review queue

**Copy-Paste Example:**

  -------------------------------------------------------------------------
  const res = await
  fetch(\`\${process.env.NEXT_PUBLIC_API_BASE_URL}/autocomplete/review\`,
  {\
  method: \'PATCH\',\
  headers: {\
  \'Content-Type\': \'application/json\',\
  \...(token ? { Authorization: \`Bearer \${token}\` } : {})\
  },\
  body: JSON.stringify({ uuid, decision })\
  });\
  if (!res.ok) throw new Error((await res.json()).message);\
  const result = await res.json();
  -------------------------------------------------------------------------

  -------------------------------------------------------------------------
