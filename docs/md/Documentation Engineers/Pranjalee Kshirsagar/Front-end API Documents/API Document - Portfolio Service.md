**API Document - Portfolio Service**\
\
Base URL: \${process.env.NEXT_PUBLIC_API_BASE_URL}/v1\
Auth: Authorization: Bearer \<token\> for protected calls (when
available)\
Content-Type: application/json\
Errors: Non-2xx returns include JSON { \"message\": string, \"code\"?:
string }\
Notes: The frontend talks only to the API Gateway. Do not call
microservice URLs directly.

## **🧭 1. System Overview**

The Portfolio Service powers the portfolio builder and portfolio viewing
experience. It supports creating/updating draft portfolios (autosave),
publishing a portfolio, reordering items, and serving public/preview
versions by slug.

This service also provides a media upload helper endpoint used by the
editor to upload images/files through a signed-upload flow, enabling
rich portfolio sections without storing binaries in the database.

## **🧱 2. High-Level Architecture**

The portfolio flow follows a simple frontend--API--storage model: the
Next.js editor saves draft data to the Portfolio Service and fetches
public/preview pages by slug for rendering. The backend persists
portfolio items in Postgres and manages portfolio ordering.

For media, the frontend requests an upload URL from the backend and then
uploads the file directly to object storage using the signed URL; the
backend returns a stable public URL that can be stored inside the
portfolio content.

## **⚙️ 3. Workflow Overview**

1.  **Editor Opens + Autosave Draft**: the editor continuously saves
    changes via the draft endpoint, storing the latest schema/content
    and preview HTML for fast rendering.

2.  **Publish**: when the user clicks Publish, the backend promotes the
    portfolio to a published state for public access.

3.  **View**: visitors load a public portfolio using the slug, while
    authenticated users can load a preview version. Media assets
    referenced inside the portfolio are uploaded using the media upload
    flow.

## **🧩 4. Key Dependencies & Modules**

- **NestJS** controllers/services for portfolio operations
  (draft/publish/list/public/preview/reorder) and media upload.

- **PostgreSQL (TypeORM)** for portfolio item persistence and ordering.

- **Object Storage (S3-compatible)** signing for uploads (used by
  /portfolio/media/upload) so large files don't pass through the API
  server.

## **🧱 5. Current State & Responsibilities**

This document covers **only the endpoints that are implemented in the
current portfolio-service backend code**. Any endpoints mentioned in
docs but not present in code are intentionally excluded.

Primary responsibilities: manage portfolio lifecycle (draft →
published), portfolio ordering, retrieval by slug (public/preview), and
secure media upload URL generation for editor assets.

## **🔐 6. Access & Tools**

  **Tool**                  **Purpose**                  **Notes**
  ------------------------- ---------------------------- ---------------------------------------------------------------
  GitHub Repo               Portfolio Service codebase   marketeq-projects-nestjs/apps/portfolio-service
  Vercel Frontend Project   Testing & Live builds        marketeq-projects-frontend-testing and marketeq-projects-live
  Postman Collection        Testing endpoints            Includes Portfolio API routes with sample payloads
  Environment Setup         Local .env variables         API base URL, storage credentials/URLs, DB connection
  QA Testing Flow           Verify Testing → QA → Live   Must pass manual editor flow + public page checks

## **Sections in this epic**

- Utilities & Health

- Portfolio Draft & Publishing

- Portfolio Views (Public & Preview)

- Portfolio Ordering

- Media Upload

# **1) Utilities & Health**

## **Health Check**

**Purpose:** Confirms the portfolio service is running and reachable
through the API Gateway. Useful for monitoring, deployments, and basic
uptime verification.\
**Used in UI:** Not a UI screen; used by ops/health monitoring and quick
diagnostics.

**Method & URL:** GET /v1/portfolio/health\
**Auth:** Not required

**Response (200):**

  -----------------------------------------------------------------------
  {\
  \"ok\": true,\
  \"service\": \"portfolio-service\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Common Errors:**

- 503 Service unavailable (deployment/startup issues)

**Copy-Paste Example:**

  ---------------------------------------------------------------------------
  const res = await
  fetch(\`\${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/portfolio/health\`);\
  if (!res.ok) throw new Error((await res.json()).message);\
  const health = await res.json();
  ---------------------------------------------------------------------------

  ---------------------------------------------------------------------------

# **2) Portfolio Draft & Publishing**

## **Create or Update Draft (Autosave)**

**Purpose:** Creates a new draft portfolio or updates an existing draft
for the same ownerUserId + slug. This endpoint is designed for frequent
autosave calls from the editor without requiring separate "create vs
update" handling on the frontend.\
**Used in UI:** Portfolio Editor (autosave on change).

**Method & URL:** POST /v1/portfolio/draft\
**Auth:** Token recommended when available (Bearer)

**Request Body (example used by editor integration docs):**

  -----------------------------------------------------------------------
  {\
  \"ownerUserId\": \"user_123\",\
  \"slug\": \"my-portfolio\",\
  \"title\": \"My Portfolio Title\",\
  \"schemaJson\": { \"blocks\": \[\] },\
  \"htmlDraft\": \"\<div\>\...\</div\>\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Response (200):** (saved draft record)

  -----------------------------------------------------------------------
  {\
  \"id\": \"c2a0f7b2-3b6c-4aaf-8a7a-1b2c3d4e5f6a\",\
  \"ownerUserId\": \"user_123\",\
  \"slug\": \"my-portfolio\",\
  \"title\": \"My Portfolio Title\",\
  \"schemaJson\": { \"blocks\": \[\] },\
  \"htmlDraft\": \"\<div\>\...\</div\>\",\
  \"status\": \"draft\",\
  \"createdAt\": \"2026-01-20T18:22:10.000Z\",\
  \"updatedAt\": \"2026-01-20T18:25:40.000Z\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Common Errors:**

- 400 Validation failed (missing required fields like slug or invalid
  body)

- 401 Not authenticated (if protected in gateway/guard config)

- 500 Server error (DB/storage issues)

**Copy-Paste Example:**

  ------------------------------------------------------------------------
  const res = await
  fetch(\`\${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/portfolio/draft\`,
  {\
  method: \"POST\",\
  headers: {\
  \"Content-Type\": \"application/json\",\
  \...(token ? { Authorization: \`Bearer \${token}\` } : {})\
  },\
  body: JSON.stringify({\
  ownerUserId,\
  slug,\
  title,\
  schemaJson,\
  htmlDraft\
  })\
  });\
  if (!res.ok) throw new Error((await res.json()).message);\
  const draft = await res.json();
  ------------------------------------------------------------------------

  ------------------------------------------------------------------------

## **Publish Portfolio**

**Purpose:** Promotes a portfolio identified by slug into a published
state so it can be served publicly. This is typically triggered by a
Publish button after draft content is ready.\
**Used in UI:** Portfolio Editor → "Publish" action.

**Method & URL:** POST /v1/portfolio/publish\
**Auth:** Token recommended when available (Bearer)

**Request Body:**

  -----------------------------------------------------------------------
  {\
  \"slug\": \"my-portfolio\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Response (200):** (published record / publish result)

  -----------------------------------------------------------------------
  {\
  \"slug\": \"my-portfolio\",\
  \"status\": \"published\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Common Errors:**

- 400 Missing/invalid slug

- 404 Draft portfolio not found for slug

- 401 Not authenticated (if protected)

- 500 Server error

**Copy-Paste Example:**

  --------------------------------------------------------------------------
  const res = await
  fetch(\`\${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/portfolio/publish\`,
  {\
  method: \"POST\",\
  headers: {\
  \"Content-Type\": \"application/json\",\
  \...(token ? { Authorization: \`Bearer \${token}\` } : {})\
  },\
  body: JSON.stringify({ slug })\
  });\
  if (!res.ok) throw new Error((await res.json()).message);\
  const published = await res.json();
  --------------------------------------------------------------------------

  --------------------------------------------------------------------------

## **List Portfolio Items (by Owner)**

**Purpose:** Returns all portfolio items belonging to a specific owner
so the UI can show the user's portfolio list/dashboard. This is also the
basis for reorder operations.\
**Used in UI:** Portfolio dashboard / portfolio list screen (owner's
portfolios).

**Method & URL:** GET /v1/portfolio/list?owner=\<ownerUserId\>\
**Auth:** Token recommended when available (Bearer)

**Query Params:**

- owner (string, required) --- Example: user_123

**Response (200):**

  -----------------------------------------------------------------------
  {\
  \"data\": \[\
  {\
  \"id\": \"c2a0f7b2-3b6c-4aaf-8a7a-1b2c3d4e5f6a\",\
  \"ownerUserId\": \"user_123\",\
  \"slug\": \"my-portfolio\",\
  \"title\": \"My Portfolio Title\",\
  \"status\": \"draft\",\
  \"position\": 0,\
  \"updatedAt\": \"2026-01-20T18:25:40.000Z\"\
  }\
  \]\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Common Errors:**

- 400 Missing owner

- 401 Not authenticated (if protected)

- 500 Server error

**Copy-Paste Example:**

  ------------------------------------------------------------------------------------------------------------
  const res = await fetch(\
  \`\${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/portfolio/list?owner=\${encodeURIComponent(ownerUserId)}\`,\
  { headers: token ? { Authorization: \`Bearer \${token}\` } : {} }\
  );\
  if (!res.ok) throw new Error((await res.json()).message);\
  const { data } = await res.json();
  ------------------------------------------------------------------------------------------------------------

  ------------------------------------------------------------------------------------------------------------

# **3) Portfolio Views**

## **Get Public Portfolio by Slug**

**Purpose:** Fetches a published portfolio by slug for public viewing.
This powers the public portfolio page and should return the content
needed to render the portfolio.\
**Used in UI:** Public Portfolio page (/portfolio/\<slug\>).

**Method & URL:** GET /v1/portfolio/public/:slug\
**Auth:** Not required (public)

**Path Params:**

- slug (string, required) --- Example: my-portfolio

**Response (200):**

  -----------------------------------------------------------------------
  {\
  \"slug\": \"my-portfolio\",\
  \"title\": \"My Portfolio Title\",\
  \"html\": \"\<div\>\...\</div\>\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Common Errors:**

- 404 Portfolio not found / not published

- 500 Server error

**Copy-Paste Example:**

  ------------------------------------------------------------------------------------
  const res = await
  fetch(\`\${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/portfolio/public/\${slug}\`);\
  if (!res.ok) throw new Error((await res.json()).message);\
  const pub = await res.json();
  ------------------------------------------------------------------------------------

  ------------------------------------------------------------------------------------

## **Get Preview Portfolio by Slug**

**Purpose:** Fetches a preview version of a portfolio by slug, typically
used by the owner or internal roles to view the latest draft/pending
changes. This endpoint is intended to be protected.\
**Used in UI:** Preview mode page (owner preview / internal review).

**Method & URL:** GET /v1/portfolio/preview/:slug\
**Auth:** Bearer token (recommended/expected)

**Path Params:**

- slug (string, required) --- Example: my-portfolio

**Response (200):**

  -----------------------------------------------------------------------
  {\
  \"slug\": \"my-portfolio\",\
  \"title\": \"My Portfolio Title\",\
  \"html\": \"\<div\>\...\</div\>\",\
  \"status\": \"draft\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Common Errors:**

- 401 Not authenticated

- 403 Forbidden (not owner / not permitted)

- 404 Portfolio not found

- 500 Server error

**Copy-Paste Example:**

const res = await
fetch(\`\${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/portfolio/preview/\${slug}\`,
{

headers: token ? { Authorization: \`Bearer \${token}\` } : {}

});

if (!res.ok) throw new Error((await res.json()).message);

const preview = await res.json();

# **4) Portfolio Ordering**

## **Reorder Portfolio Items**

**Purpose:** Updates the order of a user's portfolio items so the
portfolio list UI can support drag-and-drop ordering. The backend
applies the new positions in the same order as provided.\
**Used in UI:** Portfolio dashboard → reorder/drag-and-drop list.

**Method & URL:** PATCH /v1/portfolio/reorder\
**Auth:** Token recommended when available (Bearer)

**Request Body:**

  -----------------------------------------------------------------------
  {\
  \"order\": \[\
  \"c2a0f7b2-3b6c-4aaf-8a7a-1b2c3d4e5f6a\",\
  \"d1b2c3d4-1111-2222-3333-abcdefabcdef\"\
  \]\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Response (200):**

  -----------------------------------------------------------------------
  {\
  \"ok\": true\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Common Errors:**

- 400 Invalid order list (missing/empty ids)

- 401 Not authenticated (if protected)

- 500 Server error

**Copy-Paste Example:**

  --------------------------------------------------------------------------
  const res = await
  fetch(\`\${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/portfolio/reorder\`,
  {\
  method: \"PATCH\",\
  headers: {\
  \"Content-Type\": \"application/json\",\
  \...(token ? { Authorization: \`Bearer \${token}\` } : {})\
  },\
  body: JSON.stringify({ order })\
  });\
  if (!res.ok) throw new Error((await res.json()).message);\
  const result = await res.json();
  --------------------------------------------------------------------------

  --------------------------------------------------------------------------

# **5) Media Upload**

## **Generate Upload URL (Signed Upload)**

**Purpose:** Generates a signed upload URL for a file so the frontend
can upload directly to object storage. This avoids uploading large
binaries through the API server and returns a publicUrl that can be
saved into portfolio content.\
**Used in UI:** Editor.js image/file blocks (upload workflow).

**Method & URL:** POST /v1/portfolio/media/upload\
**Auth:** Token recommended when available (Bearer)

**Request Body:**

  -----------------------------------------------------------------------
  {\
  \"fileName\": \"cover.png\",\
  \"fileSize\": 345678\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Response (200):**

  -----------------------------------------------------------------------
  {\
  \"key\": \"uploads/uuid-cover.png\",\
  \"uploadUrl\": \"https://\...signed-url\...\",\
  \"publicUrl\": \"https://\...public-base\.../uploads/uuid-cover.png\",\
  \"contentType\": \"image/png\",\
  \"expiresInSeconds\": 300\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Common Errors:**

- 400 Invalid file name or file size

- 413 File too large (if size limits enforced by service)

- 500 Storage client not configured / signing failed

**Copy-Paste Example (2-step upload):**

  -------------------------------------------------------------------------------
  // 1) Ask backend for signed URL\
  const signRes = await
  fetch(\`\${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/portfolio/media/upload\`,
  {\
  method: \"POST\",\
  headers: {\
  \"Content-Type\": \"application/json\",\
  \...(token ? { Authorization: \`Bearer \${token}\` } : {})\
  },\
  body: JSON.stringify({ fileName: file.name, fileSize: file.size })\
  });\
  if (!signRes.ok) throw new Error((await signRes.json()).message);\
  const { uploadUrl, publicUrl, contentType } = await signRes.json();\
  \
  // 2) Upload file directly to storage\
  const putRes = await fetch(uploadUrl, {\
  method: \"PUT\",\
  headers: { \"Content-Type\": contentType },\
  body: file\
  });\
  if (!putRes.ok) throw new Error(\"Upload failed\");\
  \
  // Save publicUrl inside schemaJson/sections for rendering later
  -------------------------------------------------------------------------------

  -------------------------------------------------------------------------------

## **Quick Wiring Notes (for devs skimming)**

- Use NEXT_PUBLIC_API_BASE_URL from env; do not hard-code API hosts.

- Send Authorization: Bearer \<token\> for protected calls when
  available (preview/publish/draft/reorder are typically protected).

- For media: call /portfolio/media/upload → PUT file to uploadUrl →
  store publicUrl in the portfolio content.
