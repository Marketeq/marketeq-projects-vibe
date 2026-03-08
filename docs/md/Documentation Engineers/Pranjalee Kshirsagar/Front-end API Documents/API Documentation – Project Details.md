# **API Documentation -- Project Details**

**Base URL:** \${process.env.NEXT_PUBLIC_API_BASE_URL}/v1\
**Primary Namespace (as implemented):** /publish\
**Auth:** Public read endpoints are accessible without authentication.
Publishing (create) endpoints require Bearer token (JWT).\
**Content-Type:** application/json

## **🧭 1. System Overview**

The Project Details API powers the public-facing **Project Details**
page and ensures a consistent backend source of truth for project
overview content, scope/phases/tasks, FAQs, duration estimates, and
suggested content (similar/recommended projects).

In addition to read endpoints used by the UI, the module includes an
authenticated publishing endpoint to create project records. This
supports admin/internal workflows that seed projects shown publicly.

## **🧱 2. High-Level Architecture**

### **2.1 Frontend (Web / Mobile)**

The UI renders the Project Details screen and calls the backend to fetch
core project metadata and supporting sections. The UI composes these
responses into sections like **Overview**, **Scope**, **FAQ**, **Similar
Projects**, and **Recommendations**.

### **2.2 API Layer (Project Module)**

The backend exposes REST endpoints under /publish. Read endpoints are
public and optimized for retrieval. The create endpoint is protected by
JWT auth and used for internal publishing.

### **2.3 Persistence Layer**

Projects and related entities (scope phases/tasks, deliverables, FAQs,
media) are stored in a relational database. Soft-delete fields exist on
several entities to support auditability and non-destructive removal.

## **⚙️ 3. Workflow Overview -- Project Details Page**

### **Step 1 --- Load Project Details**

Frontend calls **Get Project Details** to render hero/header and
overview sections (title, descriptions, pricing view, tags, etc.).

### **Step 2 --- Load Scope / Phases**

Frontend calls **Get Project Scope** to render the scope/timeline
section using phase + task structure.

### **Step 3 --- Load FAQs**

Frontend calls **Get Project FAQs** to render the FAQ accordion.

### **Step 4 --- Calculate Duration**

Frontend calls **Get Project Duration** to display derived duration in
weeks/months plus a phase breakdown.

### **Step 5 --- Load Similar Projects**

Frontend calls **Get Similar Projects** to populate the Similar Projects
section.

### **Step 6 --- Load Recommendations**

Frontend calls **Get Project Recommendations** to populate the
Recommended for You section.

## **🧩 4. Key Dependencies & Modules**

### **Frameworks & Libraries**

● **NestJS** -- Main backend framework handling /publish routes,
modules, guards (for create), and service orchestration.\
● **TypeORM (or ORM layer used in service)** -- Manages Project entities
and related tables (Scope/Phase, Tasks, FAQs, Media, Deliverables).\
● **Class-Validator / Class-Transformer** -- Validates Create Project
payloads via DTOs and enforces schema consistency.\
● **Axios / HTTP Module (if used)** -- Used for any internal
service-to-service calls (e.g., user lookups or content fetch).

### **Databases**

● **PostgreSQL** -- Stores project metadata, scope phases, tasks, FAQs,
deliverables, media relations, and soft-delete state.

### **3rd-Party Services / APIs**

● **Strapi (if connected)** -- Acts as a CMS source (strapiId), used to
sync or reference content-managed fields.\
● **CDN / Media Storage (currently Cloudflare)** -- Hosts project media
(featured image, additional images, video URLs).

### **Internal Services**

● **Project Service** -- Core service for reading project details and
composing project response models.\
● **Scope/Timeline Service** -- Retrieves phases/tasks and supports
duration calculations.\
● **FAQ Service** -- Retrieves project FAQ entries.\
● **Recommendation/Discovery Service (current or planned)** -- Provides
similar projects and recommendations output.

## **🧱 5. Current State & Responsibilities**

### **✅ Features Completed**

● Public **Project Details** retrieval (GET /publish/project/{id})\
● Public **Scope/Phases/Tasks** retrieval (GET
/publish/projects/{id}/scope)\
● Public **FAQ** retrieval (GET /publish/project/{id}/faqs)\
● Public **Duration calculation** (GET /publish/project/{id}/duration)\
● Public **Similar projects** endpoint (GET
/publish/project/{id}/similar)\
● Public **Recommendations** endpoint (GET
/publish/project/{id}/recommendations)\
● Auth-protected **Project creation** (POST /publish/project) for
publishing workflows

### **🧩 In Progress**

● Aligning API response shape to match UI design fields (Project header,
metadata blocks, section-level rendering requirements).\
● Ensuring Similar/Recommendations returns the correct "project card"
structure expected by UI components.

### **🚧 Planned**

● Add/confirm support for **media upload workflow** (if binary uploads
are required instead of URLs/base64).\
● Expand filtering/selection logic for Similar and Recommendations based
on tags/industries/categories.\
● Add pagination/query options if the UI expands list sections (e.g.,
"view more").

### **⚠️ Known Issues / Blockers**

● Scope route path uses **/publish/projects/{id}/scope** (plural) while
others use **/publish/project/\...** (singular) --- frontend must call
the exact route.\
● Similar/Recommendations may return **empty arrays** if recommendation
logic is stubbed or not connected to data.

## **🔐 6. Access & Tools**

  **Tool**             **Purpose**                   **Notes**
  -------------------- ----------------------------- ------------------------------------------------------------------------
  GitHub Repo          Project Service codebase      marketeq-projects-nestjs/src/project
  Postman Collection   Test endpoints                Include all /v1/publish/\... routes with sample payloads
  Environment Setup    Local .env variables          NEXT_PUBLIC_API_BASE_URL, backend DB creds, optional CMS/media configs
  DB Admin / Console   Validate persisted entities   Verify project → scope → tasks → FAQs relationships
  QA Testing Flow      Verify UI vs API              Validate each UI section maps to exactly one endpoint response

# **🔌 API Endpoints**

> **Standard Headers (include for all requests):**

- Authorization: Bearer \<token\> *(required only for create; safe to
  include everywhere)*

- Content-Type: application/json

- Accept: application/json

## **1) Create Project (Publish)**

**Purpose\**
Creates a new project record and stores core information along with
scope phases/tasks and optional media. This endpoint supports
internal/admin publishing workflows that seed projects shown in the
public catalog and Project Details page.

**Used in UI / Systems\**
● Admin / internal publishing tools\
● Migration scripts / seed jobs

**Method & URL\**
POST /publish/project

**Auth\**
Bearer token (required)

**Headers\**
Authorization: Bearer \<token\>\
Content-Type: application/json\
Accept: application/json

**Path Params\**
N/A (no path params)

**Query Params\**
N/A (no query params)

**Request Body (CreateProjectDto)**

  -----------------------------------------------------------------------
  {\
  \"title\": \"string\",\
  \"shortDescription\": \"string\",\
  \"longDescription\": \"string\",\
  \"categories\": \[\"string\"\],\
  \"subcategories\": \[\"string\"\],\
  \"industries\": \[\"string\"\],\
  \"tags\": \[\"string\"\],\
  \"skills\": \[\"string\"\],\
  \"phases\": \[\
  {\
  \"phaseName\": \"string\",\
  \"phaseDurationWeeks\": 0,\
  \"tasks\": \[\
  {\
  \"taskName\": \"string\",\
  \"role\": \"string\",\
  \"location\": \[\"string\"\],\
  \"experience\": \"string\",\
  \"duration\": 0\
  }\
  \]\
  }\
  \],\
  \"initialTeamBudget\": 0,\
  \"media\": {\
  \"featuredImage\": \"string-or-binary\",\
  \"additionalImages\": \[\"string-or-binary\"\],\
  \"videoUrl\": \"string\"\
  },\
  \"userId\": \"string\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Sample Request**

  ------------------------------------------------------------------------
  const res = await
  fetch(\`\${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/publish/project\`,
  {\
  method: \"POST\",\
  headers: {\
  \"Content-Type\": \"application/json\",\
  \"Accept\": \"application/json\",\
  Authorization: \`Bearer \${token}\`\
  },\
  body: JSON.stringify({\
  title: \"AI-Powered Customer Support Portal\",\
  shortDescription: \"Modern customer support portal with AI-assisted
  ticketing and analytics.\",\
  longDescription: \"End-to-end support experience including ticketing,
  knowledge base, admin tooling, and reporting.\",\
  categories: \[\"Web App\", \"SaaS\"\],\
  subcategories: \[\"Customer Support\", \"Analytics\"\],\
  industries: \[\"SaaS\", \"E-commerce\"\],\
  tags: \[\"support\", \"ai\", \"portal\"\],\
  skills: \[\"react\", \"node\", \"nestjs\", \"postgres\"\],\
  phases: \[\
  {\
  phaseName: \"Discovery & UX\",\
  phaseDurationWeeks: 2,\
  tasks: \[\
  { \"taskName\": \"User flows + IA\", \"role\": \"Product Designer\",
  \"location\": \[\"Remote\"\], \"experience\": \"3+ years\",
  \"duration\": 1 },\
  { \"taskName\": \"UX wireframes\", \"role\": \"Product Designer\",
  \"location\": \[\"Remote\"\], \"experience\": \"3+ years\",
  \"duration\": 1 }\
  \]\
  }\
  \],\
  initialTeamBudget: 25000,\
  media: {\
  featuredImage: \"\<base64-or-binary\>\",\
  additionalImages: \[\"\<base64-or-binary\>\"\],\
  videoUrl: \"https://example.com/demo.mp4\"\
  },\
  userId: \"usr_12345\"\
  })\
  });\
  \
  if (!res.ok) throw new Error((await res.json()).message);\
  const created = await res.json();
  ------------------------------------------------------------------------

  ------------------------------------------------------------------------

**Response (201 Created)**

  -----------------------------------------------------------------------
  {\
  \"id\": \"prj_12345\",\
  \"status\": \"open\",\
  \"created_at\": \"2025-12-15T10:00:00.000Z\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Common Errors\**
● 400 Bad Request -- validation failure\
● 401 Unauthorized -- missing/invalid JWT\
● 500 Internal Server Error -- persistence failure

## **2) Get Project Details**

**Purpose\**
Fetches the project record required to render the Project Details page
overview, including title, descriptions, pricing view, tags, and skills.
This endpoint is the primary data source for the hero/header and
overview sections.

**Used in UI / Systems\**
● Project Details page (initial load)\
● Deep-link navigation from browse/search

**Method & URL\**
GET /publish/project/{id}

**Auth\**
Public (no auth required)

**Headers\**
Authorization: Bearer \<token\> *(optional)\*
Content-Type: application/json\
Accept: application/json

**Path Params\**
id (string, required) -- Project ID (example: prj_12345)

**Query Params\**
N/A (no query params)

**Request Body\**
{} (no body for GET)

**Sample Request**

  ----------------------------------------------------------------------------------
  const res = await
  fetch(\`\${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/publish/project/prj_12345\`,
  {\
  method: \"GET\",\
  headers: {\
  \"Content-Type\": \"application/json\",\
  \"Accept\": \"application/json\",\
  Authorization: \`Bearer \${token}\` // optional\
  }\
  });\
  const project = await res.json();
  ----------------------------------------------------------------------------------

  ----------------------------------------------------------------------------------

**Response (200 OK)**

  -----------------------------------------------------------------------
  {\
  \"id\": \"prj_12345\",\
  \"title\": \"AI-Powered Customer Support Portal\",\
  \"userId\": \"usr_12345\",\
  \"strapiId\": \"strapi_999\",\
  \"shortDescription\": \"Modern customer support portal with AI-assisted
  ticketing and analytics.\",\
  \"longDescription\": \"End-to-end support experience including
  ticketing, knowledge base, admin tooling, and reporting.\",\
  \"startingPriceTotal\": 45000,\
  \"priceViewMode\": \"FROM\",\
  \"priceViewAmount\": 45000,\
  \"programmingLanguages\": \[\"TypeScript\"\],\
  \"developmentTechnologies\": \[\"Next.js\", \"NestJS\",
  \"PostgreSQL\"\],\
  \"categories\": \[\"Web App\", \"SaaS\"\],\
  \"subcategories\": \[\"Customer Support\", \"Analytics\"\],\
  \"industries\": \[\"SaaS\", \"E-commerce\"\],\
  \"tags\": \[\"support\", \"ai\", \"portal\"\],\
  \"skills\": \[\"react\", \"node\", \"nestjs\", \"postgres\"\],\
  \"initialTeamBudget\": 25000,\
  \"createdAt\": \"2025-12-15T10:00:00.000Z\",\
  \"updatedAt\": \"2025-12-15T10:00:00.000Z\",\
  \"deletedAt\": null\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Common Errors\**
● 404 Not Found -- project not found\
● 500 Internal Server Error -- retrieval failure

## **3) Get Project FAQs**

**Purpose\**
Returns FAQ entries attached to the project for rendering the FAQ
accordion. This endpoint keeps FAQ content modular and allows the
frontend to load or refresh FAQs independently from core project data.

**Used in UI / Systems\**
● Project Details page (FAQ section)

**Method & URL\**
GET /publish/project/{id}/faqs

**Auth\**
Public (no auth required)

**Headers\**
Authorization: Bearer \<token\> *(optional)\*
Content-Type: application/json\
Accept: application/json

**Path Params\**
id (string, required) -- Project ID

**Query Params\**
N/A (no query params)

**Request Body\**
{} (no body for GET)

**Sample Request**

  ---------------------------------------------------------------------------------------
  const res = await
  fetch(\`\${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/publish/project/prj_12345/faqs\`,
  {\
  method: \"GET\",\
  headers: {\
  \"Content-Type\": \"application/json\",\
  \"Accept\": \"application/json\",\
  Authorization: \`Bearer \${token}\` // optional\
  }\
  });\
  const faqs = await res.json();
  ---------------------------------------------------------------------------------------

  ---------------------------------------------------------------------------------------

**Response (200 OK)**

  -----------------------------------------------------------------------
  \[\
  { \"id\": 1, \"question\": \"What is included?\", \"answer\":
  \"Discovery, design, build, and QA.\", \"projectId\": \"prj_12345\" },\
  { \"id\": 2, \"question\": \"Is support included?\", \"answer\": \"Yes,
  30 days post-launch support is included.\", \"projectId\":
  \"prj_12345\" }\
  \]
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Common Errors\**
● 404 Not Found -- project not found or no FAQs\
● 500 Internal Server Error -- retrieval failure

## **4) Get Project Scope (Phases & Tasks)**

**Purpose\**
Returns the structured scope model (phases and tasks) used to render the
Scope section and feed duration calculation. This provides the canonical
breakdown of work expectations and enables consistent timeline
computations across UI surfaces.

**Used in UI / Systems\**
● Project Details page (Scope section)\
● Timeline planning UI elements

**Method & URL\**
GET /publish/projects/{id}/scope

**Auth\**
Public (no auth required)

**Headers\**
Authorization: Bearer \<token\> *(optional)\*
Content-Type: application/json\
Accept: application/json

**Path Params\**
id (string, required) -- Project ID

**Query Params\**
N/A (no query params)

**Request Body\**
{} (no body for GET)

**Sample Request**

  -----------------------------------------------------------------------------------------
  const res = await
  fetch(\`\${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/publish/projects/prj_12345/scope\`,
  {\
  method: \"GET\",\
  headers: {\
  \"Content-Type\": \"application/json\",\
  \"Accept\": \"application/json\",\
  Authorization: \`Bearer \${token}\` // optional\
  }\
  });\
  const scope = await res.json();
  -----------------------------------------------------------------------------------------

  -----------------------------------------------------------------------------------------

**Response (200 OK)**

  -----------------------------------------------------------------------
  \[\
  {\
  \"id\": \"scp_1\",\
  \"name\": \"Discovery & UX\",\
  \"projectId\": \"prj_12345\",\
  \"phaseDurationWeeks\": 2,\
  \"task\": \[\
  {\
  \"id\": \"tsk_1\",\
  \"taskName\": \"User flows + IA\",\
  \"role\": \"Product Designer\",\
  \"location\": \[\"Remote\"\],\
  \"experience\": \"3+ years\",\
  \"duration\": 1,\
  \"phaseId\": \"scp_1\",\
  \"createdAt\": \"2025-12-15T10:00:00.000Z\",\
  \"updatedAt\": \"2025-12-15T10:00:00.000Z\",\
  \"deletedAt\": null\
  }\
  \],\
  \"createdAt\": \"2025-12-15T10:00:00.000Z\",\
  \"updatedAt\": \"2025-12-15T10:00:00.000Z\",\
  \"deletedAt\": null\
  }\
  \]
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Common Errors\**
● 404 Not Found -- project not found or no scope\
● 500 Internal Server Error -- retrieval failure

## **5) Get Project Duration**

**Purpose\**
Computes total project duration based on phase and task duration data
stored in scope. This allows the UI to show a backend-derived estimate
in weeks/months, avoiding duplicate timeline computation logic in the
frontend.

**Used in UI / Systems\**
● Project Details page (Duration summary panel)

**Method & URL\**
GET /publish/project/{id}/duration

**Auth\**
Public (no auth required)

**Headers\**
Authorization: Bearer \<token\> *(optional)\*
Content-Type: application/json\
Accept: application/json

**Path Params\**
id (string, required) -- Project ID

**Query Params\**
N/A (no query params)

**Request Body\**
{} (no body for GET)

**Sample Request**

  -------------------------------------------------------------------------------------------
  const res = await
  fetch(\`\${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/publish/project/prj_12345/duration\`,
  {\
  method: \"GET\",\
  headers: {\
  \"Content-Type\": \"application/json\",\
  \"Accept\": \"application/json\",\
  Authorization: \`Bearer \${token}\` // optional\
  }\
  });\
  const duration = await res.json();
  -------------------------------------------------------------------------------------------

  -------------------------------------------------------------------------------------------

**Response (200 OK)**

  -----------------------------------------------------------------------
  {\
  \"phases\": \[\
  { \"phaseId\": \"scp_1\", \"phaseName\": \"Discovery & UX\",
  \"phaseWeeks\": 2 },\
  { \"phaseId\": \"scp_2\", \"phaseName\": \"Build\", \"phaseWeeks\": 6
  }\
  \],\
  \"totalProjectDurationWeeks\": 8,\
  \"totalProjectDurationMonths\": 2\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Common Errors\**
● 404 Not Found -- project not found\
● 500 Internal Server Error -- calculation failure

## **6) Get Similar Projects**

**Purpose\**
Returns a list of projects similar to the current project so users can
discover related opportunities. This supports the Similar Projects
section and helps keep users engaged in browsing.

If similarity logic is not enabled, the endpoint can return an empty
list but still follows the same response contract.

**Used in UI / Systems\**
● Project Details page (Similar Projects section)

**Method & URL\**
GET /publish/project/{id}/similar

**Auth\**
Public (no auth required)

**Headers\**
Authorization: Bearer \<token\> *(optional)\*
Content-Type: application/json\
Accept: application/json

**Path Params\**
id (string, required) -- Project ID

**Query Params\**
N/A (no query params)

**Request Body\**
{} (no body for GET)

**Sample Request**

  ------------------------------------------------------------------------------------------
  const res = await
  fetch(\`\${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/publish/project/prj_12345/similar\`,
  {\
  method: \"GET\",\
  headers: {\
  \"Content-Type\": \"application/json\",\
  \"Accept\": \"application/json\",\
  Authorization: \`Bearer \${token}\` // optional\
  }\
  });\
  const similar = await res.json();
  ------------------------------------------------------------------------------------------

  ------------------------------------------------------------------------------------------

**Response (200 OK)**

  -----------------------------------------------------------------------
  \[\
  {\
  \"id\": \"prj_222\",\
  \"title\": \"Customer Portal Redesign\",\
  \"shortDescription\": \"Modern portal UI + performance
  improvements.\",\
  \"categories\": \[\"Web App\"\],\
  \"industries\": \[\"SaaS\"\],\
  \"priceViewAmount\": 30000\
  }\
  \]
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Common Errors\**
● 404 Not Found -- project not found\
● 500 Internal Server Error -- retrieval failure

## **7) Get Project Recommendations**

**Purpose\**
Returns recommended projects for users to explore based on the current
project context. This supports the Recommended for You section and
enables future personalization and engagement workflows.

If recommendation logic is not enabled, the endpoint can return an empty
list but still follows the same response contract.

**Used in UI / Systems\**
● Project Details page (Recommended for You section)

**Method & URL\**
GET /publish/project/{id}/recommendations

**Auth\**
Public (no auth required)

**Headers\**
Authorization: Bearer \<token\> *(optional)\*
Content-Type: application/json\
Accept: application/json

**Path Params\**
id (string, required) -- Project ID

**Query Params\**
N/A (no query params)

**Request Body\**
{} (no body for GET)

**Sample Request**

  --------------------------------------------------------------------------------------------------
  const res = await
  fetch(\`\${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/publish/project/prj_12345/recommendations\`,
  {\
  method: \"GET\",\
  headers: {\
  \"Content-Type\": \"application/json\",\
  \"Accept\": \"application/json\",\
  Authorization: \`Bearer \${token}\` // optional\
  }\
  });\
  const recommendations = await res.json();
  --------------------------------------------------------------------------------------------------

  --------------------------------------------------------------------------------------------------

**Response (200 OK)**

  -----------------------------------------------------------------------
  \[\
  {\
  \"id\": \"prj_333\",\
  \"title\": \"Analytics Dashboard Build\",\
  \"shortDescription\": \"Business analytics dashboard with role-based
  access.\",\
  \"categories\": \[\"Dashboard\"\],\
  \"industries\": \[\"Fintech\"\],\
  \"priceViewAmount\": 40000\
  }\
  \]
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Common Errors\**
● 404 Not Found -- project not found\
● 500 Internal Server Error -- retrieval failure

## **📝 8. Notes & Assumptions**

● /publish/projects/{id}/scope uses a plural segment (projects) while
other endpoints use project. Use the exact route as documented.\
● Similar and recommendations endpoints may return \[\] depending on
current recommendation logic. The response structure remains
consistent.\
● Create Project currently uses application/json. If image uploads must
be binary files, the endpoint should evolve to accept
multipart/form-data with file interceptors.
