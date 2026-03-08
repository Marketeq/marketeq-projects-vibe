## **Frontend API -- Favorites Service** 

### **Base URL**

- **Local:** http://localhost:4003

- **Prod:** (to be filled)

### **Authentication**

- **When available, send JWT token** in header:\
  Authorization: Bearer \<token\> (JWT extraction via Bearer header is
  expected)

- Some internal service endpoints use:\
  x-service-token: \<SERVICE_TOKEN\>

### **Content Type**

- Content-Type: application/json

### **Standard Error Pattern (Typical)**

- **401 Unauthorized** → Missing/invalid token

- **429 Too Many Requests** → Rate limiting (when enabled)

# **1. System Overview**

Favorites Service powers the **My Favorites** screens by storing a
user's saved items (favorites) and organizing them into groups. The
frontend uses the user's JWT to scope all read/write operations to the
authenticated user, so each user sees only their own favorites.

# **2. High Level Architecture**

1.  **Frontend (Next.js Favorites Screens)\**
    Displays favorites lists + groups, and triggers add/remove/move
    actions. Frontend sends JWT using Authorization: Bearer \<token\>
    when available.

2.  **Favorites Service (NestJS)\**
    Own microservice exposing /favorites CRUD endpoints plus internal
    endpoints. Core endpoints are protected by JWT guard.

3.  **Database (DB (Postgres via TypeORM)\**
    Stores Favorite and FavoriteGroup entities (favorites belong to a
    user and may belong to a group).

4.  **AI + Caching (Planned / Enhancement Path)\**
    AI-based group assignment and expensive operations can be cached
    with Redis; service can be rate-limited globally.

# **3. Workflow Overview**

1.  **User opens Favorites screen** → frontend calls GET /favorites with
    JWT to load saved favorites for that user.

2.  **User favorites an item** → frontend calls POST /favorites with {
    type, itemId, groupId? }. If groupId is not provided, backend may
    assign one (AI path planned).

3.  **User moves a favorite between groups** → frontend calls a PATCH
    endpoint with { groupId } to update grouping.

4.  **User removes a favorite** → frontend calls DELETE /favorites/:id.

# **4. Key Dependencies and Modules**

### **Frameworks & Libraries**

- **NestJS** -- API framework for controllers/guards/modules.

- **TypeORM + Postgres** -- persistence layer for favorites and groups.

- **JWT Auth (Bearer)** -- protects routes and scopes to authenticated
  user.

### **Optional Enhancements (already documented)**

- **Redis Cache** -- cache expensive operations (embedding/group
  assignment).

- **Rate limiting (Throttler)** -- protect endpoints from abuse.

# **5. Current State and Responsibilities**

✅ **Implemented in backend code now**

- /favorites CRUD core (create, list, move, delete) is available as the
  primary API surface.

- /health endpoint exists for uptime checks.

- Internal service-to-service guard pattern exists using
  x-service-token.

🕒 **Planned / Documented (not fully implemented in code yet)**

- /favorites/groups management endpoints (create/rename/delete/list
  groups) are described in docs and expected by UI patterns.

- AI group assignment implementation is referenced as a future step in
  docs.

# **6. Access & Tools**

  **Tool**                 **Purpose**                               **Notes**
  ------------------------ ----------------------------------------- ------------------------------------------------------------------------------
  GitHub Repo              Favorites service codebase                https://github.com/\<org\>/\<repo\>/apps/favorites-service *(replace later)*
  Render Service           Backend deployment (service hosting)      e.g., favorites-service on Render (region: Oregon)
  Render Logs / Alerts     Observability, failure-rate monitoring    Use Render dashboard Logs + Alerts (failure rate \> threshold)
  CI/CD (GitHub Actions)   Build/test/deploy on push                 Workflow example included in deployment doc
  Environment Variables    Service config (.env / Render env vars)   DATABASE_URL, JWT_SECRET, SERVICE_TOKEN, (optional) REDIS_URL
  Local Testing            Health + endpoint verification            curl http://localhost:4003/health

## **Sections in this epic**

1.  Favorites Core (Implemented)

2.  Internal + Health (Implemented)

3.  Favorites Groups (Planned / Documented)

# **1) Favorites Core (Implemented)**

## **1.1 GET /favorites**

**Purpose:** Fetch the authenticated user's favorites so the Favorites
screen can render saved items and their grouping. This is typically
called on page load and after mutations (add/remove/move) to refresh UI
state.

**Used in UI:** My Favorites screens (lists + group sections).

**Method & URL:** GET /favorites\
**Auth:** JWT Bearer required (send if available).

**Query Params:** *(optional, if frontend adds later)*

- type (e.g., \"project\" \| \"talent\" \| \...)

- groupId (UUID)

- q (search term)

**Request Body:** *(none)*

**Response (200):**

  -----------------------------------------------------------------------
  \[\
  {\
  \"id\": \"uuid\",\
  \"userId\": \"uuid\",\
  \"groupId\": \"uuid\",\
  \"type\": \"project\",\
  \"itemId\": \"string\",\
  \"createdAt\": \"2026-01-25T00:00:00.000Z\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

\]

**Common Errors**

- **401** Missing/invalid JWT token

- **429** Too many requests (if throttling enabled)

**Copy-Paste Example**

  -----------------------------------------------------------------------
  const baseUrl = process.env.NEXT_PUBLIC_FAVORITES_API_URL \|\|
  \"http://localhost:4003\";\
  const token = \"\<JWT_IF_AVAILABLE\>\";\
  \
  const res = await fetch(\`\${baseUrl}/favorites\`, {\
  method: \"GET\",\
  headers: {\
  \"Content-Type\": \"application/json\",\
  \...(token ? { Authorization: \`Bearer \${token}\` } : {}),\
  },\
  });\
  \
  const data = await res.json();\
  console.log(data);
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **1.2 POST /favorites**

**Purpose:** Add a new favorite item for the authenticated user. If
groupId is provided, the favorite is added to that group; otherwise
group assignment can be handled automatically (AI assignment path is
referenced in docs).

**Used in UI:** "Star / Save" button actions on listings.

**Method & URL:** POST /favorites\
**Auth:** JWT Bearer required.

**Request Body:**

  -----------------------------------------------------------------------
  {\
  \"type\": \"project\",\
  \"itemId\": \"12345\",\
  \"groupId\": \"uuid-optional\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Response (200):**

  -----------------------------------------------------------------------
  {\
  \"id\": \"uuid\",\
  \"userId\": \"uuid\",\
  \"groupId\": \"uuid\",\
  \"type\": \"project\",\
  \"itemId\": \"12345\",\
  \"createdAt\": \"2026-01-25T00:00:00.000Z\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Common Errors**

- **400** Invalid groupId (group not found for user)

- **401** Missing/invalid JWT token

**Copy-Paste Example**

  -----------------------------------------------------------------------
  const baseUrl = process.env.NEXT_PUBLIC_FAVORITES_API_URL \|\|
  \"http://localhost:4003\";\
  const token = \"\<JWT_IF_AVAILABLE\>\";\
  \
  const body = {\
  type: \"project\",\
  itemId: \"12345\",\
  // groupId: \"optional-uuid\"\
  };\
  \
  const res = await fetch(\`\${baseUrl}/favorites\`, {\
  method: \"POST\",\
  headers: {\
  \"Content-Type\": \"application/json\",\
  \...(token ? { Authorization: \`Bearer \${token}\` } : {}),\
  },\
  body: JSON.stringify(body),\
  });\
  \
  const data = await res.json();\
  console.log(data);
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **1.3 PATCH /favorites/:favoriteId/move**

**Purpose:** Move an existing favorite into a different group. Frontend
uses this when user selects "Move to group" or similar action from an
options menu; after success, UI should refresh by reloading GET
/favorites.

**Used in UI:** Favorites "Options / Move" action menu.

**Method & URL:** PATCH /favorites/:favoriteId/move\
**Auth:** JWT Bearer required.

**Path Params**

- favoriteId (UUID)

**Request Body:**

  -----------------------------------------------------------------------
  {\
  \"groupId\": \"uuid\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Response (200)**

  -----------------------------------------------------------------------
  {\
  \"ok\": true,\
  \"favoriteId\": \"uuid\",\
  \"groupId\": \"uuid\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Common Errors**

- **400** groupId invalid for the user

- **401** Missing/invalid JWT token

**Copy-Paste Example**

  -----------------------------------------------------------------------
  const baseUrl = process.env.NEXT_PUBLIC_FAVORITES_API_URL \|\|
  \"http://localhost:4003\";\
  const token = \"\<JWT_IF_AVAILABLE\>\";\
  const favoriteId = \"favorite-uuid\";\
  const groupId = \"target-group-uuid\";\
  \
  const res = await fetch(\`\${baseUrl}/favorites/\${favoriteId}/move\`,
  {\
  method: \"PATCH\",\
  headers: {\
  \"Content-Type\": \"application/json\",\
  \...(token ? { Authorization: \`Bearer \${token}\` } : {}),\
  },\
  body: JSON.stringify({ groupId }),\
  });\
  \
  const data = await res.json();\
  console.log(data);
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

> **Doc Note (Path mismatch to be aware of):** Some docs/examples
> describe PATCH /favorites/:id for moving; the current code route is
> PATCH /favorites/:favoriteId/move.

## **1.4 DELETE /favorites/:favoriteId**

**Purpose:** Remove a favorite item for the authenticated user. Used
when user "un-stars" an item or deletes it from Favorites; UI should
refresh by calling GET /favorites again.

**Used in UI:** Remove/unfavorite actions.

**Method & URL:** DELETE /favorites/:favoriteId\
**Auth:** JWT Bearer required.

**Path Params**

- favoriteId (UUID)

**Request Body:** *(none)*

**Response (200)** *(current implementation)*:

  -----------------------------------------------------------------------
  {\
  \"ok\": true,\
  \"removed\": true\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Common Errors**

- **401** Missing/invalid JWT token

**Copy-Paste Example**

  -----------------------------------------------------------------------
  const baseUrl = process.env.NEXT_PUBLIC_FAVORITES_API_URL \|\|
  \"http://localhost:4003\";\
  const token = \"\<JWT_IF_AVAILABLE\>\";\
  const favoriteId = \"favorite-uuid\";\
  \
  const res = await fetch(\`\${baseUrl}/favorites/\${favoriteId}\`, {\
  method: \"DELETE\",\
  headers: {\
  \"Content-Type\": \"application/json\",\
  \...(token ? { Authorization: \`Bearer \${token}\` } : {}),\
  },\
  });\
  \
  const data = await res.json();\
  console.log(data);
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

# **2) Internal + Health (Implemented)**

## **2.1 GET /health**

**Purpose:** Simple health endpoint for uptime monitoring and deployment
health checks. Used by hosting platform and CI/CD to verify the service
is running and responding.

**Method & URL:** GET /health\
**Auth:** None

**Request Body:** *(none)*

**Response (200):**

  -----------------------------------------------------------------------
  {\
  \"status\": \"ok\",\
  \"timestamp\": \"2026-01-25T00:00:00.000Z\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Common Errors**

- Typically none; if service is down you'll get network error / 5xx.

**Copy-Paste Example**

  -----------------------------------------------------------------------
  const baseUrl = process.env.NEXT_PUBLIC_FAVORITES_API_URL \|\|
  \"http://localhost:4003\";\
  \
  const res = await fetch(\`\${baseUrl}/health\`);\
  const data = await res.json();\
  console.log(data);
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **2.2 POST /internal/sync**

**Purpose:** Internal service-to-service endpoint used for controlled
backend sync operations (e.g., webhook-like flows or internal batch
operations). This endpoint is protected by a service token header
(x-service-token) instead of user JWT.

**Method & URL:** POST /internal/sync\
**Auth:** x-service-token: \<SERVICE_TOKEN\>

**Request Body:** *(none for current stub)*

{}

**Response (200):**

  -----------------------------------------------------------------------
  {\
  \"ok\": true\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Common Errors**

- **401** Invalid service token

**Copy-Paste Example**

  -----------------------------------------------------------------------
  const baseUrl = process.env.NEXT_PUBLIC_FAVORITES_API_URL \|\|
  \"http://localhost:4003\";\
  const serviceToken = \"\<SERVICE_TOKEN\>\";\
  \
  const res = await fetch(\`\${baseUrl}/internal/sync\`, {\
  method: \"POST\",\
  headers: {\
  \"Content-Type\": \"application/json\",\
  \"x-service-token\": serviceToken,\
  },\
  body: JSON.stringify({}),\
  });\
  \
  const data = await res.json();\
  console.log(data);
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

# **3) Favorites Groups (Planned / Documented)**

> These endpoints are **documented as expected behavior** for group
> management, but they are **not fully implemented in the current code
> snapshot**. The docs define the group CRUD surface and the frontend
> can be aligned once controllers are implemented.

## **3.1 GET /favorites/groups**

**Purpose:** Fetch all favorite groups for the authenticated user so the
UI can display group sections and allow grouping/moving items. This is
usually called together with GET /favorites (or the backend could later
return both together).

**Method & URL:** GET /favorites/groups\
**Auth:** JWT Bearer required.

**Request Body:** *(none)*

**Response (200):**

  -----------------------------------------------------------------------
  \[\
  {\
  \"id\": \"uuid\",\
  \"userId\": \"uuid\",\
  \"name\": \"My Group Name\",\
  \"type\": \"project\",\
  \"createdAt\": \"2026-01-25T00:00:00.000Z\"\
  }\
  \]
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Common Errors**

- **401** Missing/invalid JWT token

**Copy-Paste Example**

  -----------------------------------------------------------------------
  const baseUrl = process.env.NEXT_PUBLIC_FAVORITES_API_URL \|\|
  \"http://localhost:4003\";\
  const token = \"\<JWT_IF_AVAILABLE\>\";\
  \
  const res = await fetch(\`\${baseUrl}/favorites/groups\`, {\
  method: \"GET\",\
  headers: {\
  \"Content-Type\": \"application/json\",\
  \...(token ? { Authorization: \`Bearer \${token}\` } : {}),\
  },\
  });\
  \
  const data = await res.json();\
  console.log(data);
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **3.2 POST /favorites/groups**

**Purpose:** Create a new group for a specific favorite type (e.g.,
projects vs talents). Used when user adds a custom group name from the
Favorites UI.

**Method & URL:** POST /favorites/groups\
**Auth:** JWT Bearer required.

**Request Body:**

  -----------------------------------------------------------------------
  {\
  \"name\": \"My Group Name\",\
  \"type\": \"project\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Response (200):**

  -----------------------------------------------------------------------
  {\
  \"id\": \"uuid\",\
  \"userId\": \"uuid\",\
  \"name\": \"My Group Name\",\
  \"type\": \"project\",\
  \"createdAt\": \"2026-01-25T00:00:00.000Z\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Common Errors**

- **400** Missing/invalid fields (name/type)

- **401** Missing/invalid JWT token

**Copy-Paste Example**

  -----------------------------------------------------------------------
  const baseUrl = process.env.NEXT_PUBLIC_FAVORITES_API_URL \|\|
  \"http://localhost:4003\";\
  const token = \"\<JWT_IF_AVAILABLE\>\";\
  \
  const res = await fetch(\`\${baseUrl}/favorites/groups\`, {\
  method: \"POST\",\
  headers: {\
  \"Content-Type\": \"application/json\",\
  \...(token ? { Authorization: \`Bearer \${token}\` } : {}),\
  },\
  body: JSON.stringify({ name: \"My Group Name\", type: \"project\" }),\
  });\
  \
  const data = await res.json();\
  console.log(data);
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **3.3 PATCH /favorites/groups/:groupId**

**Purpose:** Rename/update an existing group name. Used when user edits
group title via options menu or inline rename action.

**Method & URL:** PATCH /favorites/groups/:groupId\
**Auth:** JWT Bearer required.

**Path Params**

- groupId (UUID)

**Request Body:**

  -----------------------------------------------------------------------
  {\
  \"name\": \"Renamed Group\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Response (200):**

  -----------------------------------------------------------------------
  {\
  \"id\": \"uuid\",\
  \"userId\": \"uuid\",\
  \"name\": \"Renamed Group\",\
  \"type\": \"project\",\
  \"createdAt\": \"2026-01-25T00:00:00.000Z\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Common Errors**

- **404** Group not found

- **401** Missing/invalid JWT token

**Copy-Paste Example**

  -----------------------------------------------------------------------
  const baseUrl = process.env.NEXT_PUBLIC_FAVORITES_API_URL \|\|
  \"http://localhost:4003\";\
  const token = \"\<JWT_IF_AVAILABLE\>\";\
  const groupId = \"group-uuid\";\
  \
  const res = await fetch(\`\${baseUrl}/favorites/groups/\${groupId}\`,
  {\
  method: \"PATCH\",\
  headers: {\
  \"Content-Type\": \"application/json\",\
  \...(token ? { Authorization: \`Bearer \${token}\` } : {}),\
  },\
  body: JSON.stringify({ name: \"Renamed Group\" }),\
  });\
  \
  const data = await res.json();\
  console.log(data);
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **3.4 DELETE /favorites/groups/:groupId**

**Purpose:** Delete a group. UI should decide what happens to favorites
inside that group (e.g., move to default group, or ungroup). Backend
behavior should match the business rules in Favorites docs.

**Method & URL:** DELETE /favorites/groups/:groupId\
**Auth:** JWT Bearer required.

**Path Params**

- groupId (UUID)

**Request Body:** *(none)*

**Response (204 No Content)** *(recommended)*:

{}

**Common Errors**

- **404** Group not found

- **401** Missing/invalid JWT token

**Copy-Paste Example**

  -----------------------------------------------------------------------
  const baseUrl = process.env.NEXT_PUBLIC_FAVORITES_API_URL \|\|
  \"http://localhost:4003\";\
  const token = \"\<JWT_IF_AVAILABLE\>\";\
  const groupId = \"group-uuid\";\
  \
  const res = await fetch(\`\${baseUrl}/favorites/groups/\${groupId}\`,
  {\
  method: \"DELETE\",\
  headers: {\
  \"Content-Type\": \"application/json\",\
  \...(token ? { Authorization: \`Bearer \${token}\` } : {}),\
  },\
  });\
  \
  console.log(\"status:\", res.status);
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **Quick alignment note (Design ↔ Docs ↔ Code)**

- **Core Favorites CRUD** aligns strongly (create/list/delete) with
  documented patterns.

- **Move endpoint path mismatch** exists: docs/examples often show PATCH
  /favorites/:id, but code currently routes as PATCH
  /favorites/:favoriteId/move.

- **Group endpoints** are documented as expected API surface, but are
  not fully implemented yet in current snapshot.
