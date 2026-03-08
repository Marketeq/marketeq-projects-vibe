**API Document -- Project Listings (Listings Service)**

**Base URL:** \${process.env.NEXT_PUBLIC_API_BASE_URL}/v1\
**Auth:** Authorization: Bearer \<token\> for protected calls\
**Content-Type:** application/json\
**Errors:** Non-2xx returns include JSON { \"message\": string,
\"code\": string? }\
**Notes:** The frontend talks only to the API Gateway. Do not call
microservice URLs directly.

# **🧭 1. System Overview**

The **Project Listings module** in the Listings Service is responsible
for creating and retrieving **project listings** that appear in the
Marketeq UI. It exposes a small, focused REST API that lets the frontend
list existing projects and create new ones.

Its role is to provide a consistent, typed interface between the
frontend and the database for Projects. It does manage Project Listings.

This API is used by both frontend engineers (for screens and flows) and
backend engineers (for service integration, DTO contracts, and OpenAPI
generation).

# **🧱 2. High-Level Architecture**

The Project Listings module follows a simple client--backend--database
model optimized for clarity and reuse.

### **1. Frontend (Next.js + TypeScript)**

● Uses REST API calls via the API Gateway to create and fetch Project
Listings.\
● Renders project lists, dashboards, and "Create Project" forms using
the data returned by this service.\
● Handles loading states, error messages, and user flows (e.g., redirect
after a project is created).\
● Reads the API host from NEXT_PUBLIC_API_BASE_URL and must not
hard-code service URLs.

### **2. Backend (NestJS + TypeScript)**

● ListingsController defines the /listings endpoints used by the
frontend.\
● ProjectService contains the core business logic for creating and
listing projects.\
● DTOs (CreateListingDto, ListingDto) define the contract for inputs and
outputs.\
● TypeORM repositories persist and read Project records from PostgreSQL.

### **3. Storage & Data Layers**

● **PostgreSQL** -- stores project listing records (id, title, userId,
status, etc.).\
● **TypeORM** -- maps the Project entity to the database table and
exposes repository methods.

# **⚙️ 3. Workflow Overview (Projects Only)**

1.  **User opens the Projects area\
    \**
    ● The frontend calls GET /v1/listings/dashboard to show a simple
    header/summary.\
    ● This returns static placeholder data today, but can be wired to
    real metrics later.

2.  **Frontend loads all Project Listings\
    \**
    ● The frontend calls GET /v1/listings to fetch all project
    listings.\
    ● The response is an array of ListingDto objects used to render
    cards, rows, or tiles.

3.  **User creates a new Project Listing\
    \**
    ● The user fills out a "Create Project" form (at minimum: title;
    plus userId and optional status).\
    ● The frontend sends a POST /v1/listings request with a
    CreateListingDto payload.\
    ● The backend validates the payload, persists the Project entity,
    and returns a ListingDto.\
    ● The frontend uses the returned object to drive navigation (e.g.,
    redirect to a detail page).

This is the **entire workflow** covered in this document: Project
Listings creation and retrieval.

# **🧩 4. Key Dependencies & Modules**

### **Frameworks & Libraries**

● **NestJS** -- application framework for defining controllers,
providers, and modules.\
● **TypeORM** -- ORM for mapping the Project entity to the PostgreSQL
database.\
● **\@nestjs/swagger** -- used to generate the OpenAPI specification
(openapi.json) from decorators.

### **Databases**

● **PostgreSQL** -- primary data store for project listings.

### **Internal Modules (Listings Service)**

● **ListingsController** -- defines GET /listings/dashboard, GET
/listings, and POST /listings.\
● **ProjectService** -- wraps TypeORM and implements findAll() and
create() for projects.\
● **DTOs** -- CreateListingDto (request), ListingDto (response).

There are no required 3rd-party APIs for this module in the current
scope.

# **🧱 5. Current State & Responsibilities**

### **✅ Features Completed**

● GET /v1/listings/dashboard for a simple header summary.\
● GET /v1/listings to list all project listings.\
● POST /v1/listings to create a new project listing.\
● DTOs and Swagger annotations for OpenAPI generation.

### **🧩 In Progress**

● Defining exact validation rules (e.g., required title length, allowed
status values).\
● Aligning project listing fields with future UI requirements
(categories, tags, etc.).

### **🚧 Planned**

● Add update/delete endpoints (e.g., PATCH /v1/listings/{id}, DELETE
/v1/listings/{id}).\
● Add pagination and filtering (e.g., by userId, status).\
● Enforce authentication and authorization on all endpoints.

### **⚠ Known Issues / Blockers**

● Dashboard endpoint returns static data (placeholder), not real
user-specific metrics yet.

# **🔐 6. Access & Tools**

  **Tool**             **Purpose**                       **Notes**
  -------------------- --------------------------------- ------------------------------------------------------------
  GitHub Repo          Listings Service codebase         marketeq-projects-nestjs/apps/listings-service
  Frontend Project     Uses these APIs for Projects UI   Reads NEXT_PUBLIC_API_BASE_URL from environment
  Postman Collection   Manual testing of project APIs    Should include /v1/listings endpoints with sample payloads
  Environment Setup    Local .env configuration          Database URL, gateway base URL, auth configuration
  QA Testing Flow      Verify end-to-end behavior        Testing → QA → Live; must pass manual + automated tests

### **Sections in this epic**

# **1) Project Listings**

Below are the **endpoints** in scope for the Project Listings module.

### **Get Project Dashboard Summary**

● **Purpose:** Return a lightweight dashboard object for the listings
area (used for header / greeting / quick summary).\
● **Used in UI:** Projects -- Dashboard Header / Overview\
● **Method & URL:** GET /v1/listings/dashboard\
● **Auth:** Bearer token (optional in MVP; will be required when auth is
enabled)\
● **Query Params:\**
○ None

● **Response (200):**

  -----------------------------------------------------------------------
  {\
  \"name\": \"Ali\",\
  \"email\": \"ali@example.com\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

JSON

● **Common Errors:\**
○ 500 Unexpected server error

● **Copy-Paste Example:**

  -----------------------------------------------------------------------
  const res = await fetch(\
  \`\${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/listings/dashboard\`,\
  {\
  headers: {\
  // Add when auth is enforced:\
  // Authorization: \`Bearer \${token}\`,\
  },\
  }\
  );\
  \
  if (!res.ok) throw new Error((await res.json()).message);\
  const dashboard = await res.json();
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### 

### 

### **Get Project Listings**

● **Purpose:** Fetch all **project listings** stored in the system so
they can be rendered as a list/grid.\
● **Used in UI:** Projects -- "My Projects" page / Projects listing
grid\
● **Method & URL:** GET /v1/listings\
● **Auth:** Bearer token (optional in MVP; will be required when auth is
enabled)\
● **Query Params:\**
○ None (pagination and filters can be added later)

● **Response (200):**

  -----------------------------------------------------------------------
  \[\
  {\
  \"id\": \"abc123\",\
  \"title\": \"My first project\",\
  \"userId\": \"u_789\",\
  \"status\": \"pending_review\"\
  }\
  \]
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

● **Common Errors:\**
○ 500 Failed to load project listings

  -----------------------------------------------------------------------
  ● Copy-Paste Example:\
  const res = await fetch(\
  \`\${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/listings\`,\
  {\
  headers: {\
  // Authorization: \`Bearer \${token}\`,\
  },\
  }\
  );\
  \
  if (!res.ok) throw new Error((await res.json()).message);\
  const projects = await res.json(); // ListingDto\[\]
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### 

### 

### **Create Project Listing**

● **Purpose:** Create a new **project listing** record in the system
from the "Create Project" form.\
● **Used in UI:** Projects -- "Create Project" flow / "Add Project"
modal\
● **Method & URL:** POST /v1/listings\
● **Auth:** Bearer token (optional in MVP; will be required when auth is
enabled)

● **Request Body (JSON):**

  -----------------------------------------------------------------------
  {\
  \"title\": \"My first project\",\
  \"userId\": \"u_789\",\
  \"status\": \"pending_review\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

● **Response (201):**

  -----------------------------------------------------------------------
  {\
  \"id\": \"b3a7b5e0-1234-4a7f-9f65-abc123\",\
  \"title\": \"My first project\",\
  \"userId\": \"u_789\",\
  \"status\": \"pending_review\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

● **Common Errors:\**
○ 400 Missing or invalid fields (e.g., empty title, missing userId)\
○ 500 Failed to create project listing

● **Copy-Paste Example:**

  -----------------------------------------------------------------------
  const res = await fetch(\
  \`\${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/listings\`,\
  {\
  method: \"POST\",\
  headers: {\
  \"Content-Type\": \"application/json\",\
  // Authorization: \`Bearer \${token}\`,\
  },\
  body: JSON.stringify({\
  title: \"My first project\",\
  userId: \"u_789\",\
  status: \"pending_review\"\
  }),\
  }\
  );\
  \
  if (!res.ok) throw new Error((await res.json()).message);\
  const project = await res.json(); // ListingDto
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **Appendix (optional -- only if you want it in this doc)**

● Public Reference Data: N/A for this module.\
● Non-UI Admin/Internal: Any future admin-only endpoints should **not**
be documented here; keep them in OpenAPI for engineering use.

### **Quick Wiring Notes (for devs skimming)**

● Use NEXT_PUBLIC_API_BASE_URL from env; do not hard-code API hosts.\
● Always send Authorization: Bearer \<token\> for protected calls (once
auth is enforced).\
● Handle non-2xx by reading message from JSON and showing a friendly
error.
