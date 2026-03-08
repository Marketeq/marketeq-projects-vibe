# **Client Integration Guide: Requests, Responses & Flows**

**Project:** Complete My Profile --- **Edit Modals** (Backend)\
**Service:** apps/user-service (expand existing user service)\
**Audience:** Web/App client engineers integrating the **Edit Modals**
and the **Progress** bar.\
**Scope:** Requests, responses, sequences, and edge-case handling.
**JSON-only** APIs; **no file uploads**.

## **0) Conventions**

- **Base path:** /v1/users/:userId/profile/\* (owner-only; token subject
  **must** equal :userId)

- **Headers (all mutating calls):\**

  - Authorization: Bearer \<JWT\>

  - Content-Type: application/json

- **Response envelope (success):** { \"data\": \<object\|array\|null\>,
  \"meta\"?: {\...} }

**Response envelope (error):\
\**

  -----------------------------------------------------------------------
  { \"code\": \"VALIDATION_ERROR\", \"message\": \"One or more fields are
  invalid.\", \"details\": \[ { \"field\": \"amount\", \"reason\":
  \"FORMAT\" } \] }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

- 

- **Pagination (lists):** ?page=1&pageSize=20 → returns meta.page,
  meta.pageSize, meta.total

- **Rate limits / retries:** Client may retry on network errors. On 409
  duplicates, surface inline error.

## **1) Authentication & Ownership**

- Client must attach a user JWT whose sub equals :userId.

- Non-owners receive 403 with code=\"FORBIDDEN_NOT_OWNER\".

  -----------------------------------------------------------------------
  // language: typescript\
  async function authHeaders(token: string) {\
  return { Authorization: \`Bearer \${token}\`, \'Content-Type\':
  \'application/json\' };\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **2) About Me (Rich Text HTML, Sanitized)**

### **Create/Update**

  -----------------------------------------------------------------------
  POST /v1/users/:userId/profile/about
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Request**

  -----------------------------------------------------------------------
  { \"contentHtml\": \"\<p\>Full-stack engineer with marketplace
  experience.\</p\>\" }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Response**

  -----------------------------------------------------------------------
  { \"data\": { \"userId\": \"uuid\", \"contentHtml\":
  \"\<p\>\...\</p\>\", \"updatedAt\": \"ISO\" } }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Client flow**

1.  Get current value (optional).

2.  On modal **Save** → POST.

3.  On 400 with VALIDATION_ERROR (length \> 2600 or empty after
    sanitize), show inline error.

4.  Refresh **Progress** (see §8).

## **3) Skills (Max 100, De-dupe case-insensitive)**

### **List (with optional q)**

  -----------------------------------------------------------------------
  GET /v1/users/:userId/profile/skills?page=1&pageSize=50&q=react
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Response**

  -----------------------------------------------------------------------
  { \"data\": \[ { \"id\": \"uuid\", \"value\": \"React\", \"createdAt\":
  \"ISO\" } \], \"meta\": { \"page\": 1, \"pageSize\": 50, \"total\": 1 }
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **Add**

  -----------------------------------------------------------------------
  POST /v1/users/:userId/profile/skills
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Request**

  -----------------------------------------------------------------------
  { \"value\": \"React \" }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Response**

  -----------------------------------------------------------------------
  { \"data\": { \"id\": \"uuid\", \"userId\": \"uuid\", \"value\":
  \"React\", \"createdAt\": \"ISO\" } }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Errors**

- CONFLICT_DUPLICATE if same skill (case-insensitive) exists

- VALIDATION_ERROR on empty/too long or cap reached (100)

### **Delete**

  -----------------------------------------------------------------------
  DELETE /v1/users/:userId/profile/skills/:skillId
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Response**

  -----------------------------------------------------------------------
  { \"data\": null }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Client flow (recommended)**

- **Debounce** user typing into typeahead; on Enter or item pick → POST.

- On 409 duplicate → show "already added".

- After add/delete → refresh list + **Progress**.

## **4) Work Experience (HTML sanitize; date rules)**

### **List**

  -----------------------------------------------------------------------
  GET /v1/users/:userId/profile/experience?page=1&pageSize=20
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **Create**

  -----------------------------------------------------------------------
  POST /v1/users/:userId/profile/experience
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Request**

  -----------------------------------------------------------------------
  {\
  \"employer\": \"Acme Corp\",\
  \"title\": \"Senior Developer\",\
  \"startDate\": \"2022-01-01\",\
  \"endDate\": null,\
  \"descriptionHtml\": \"\<p\>Led marketplace initiative.\</p\>\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **Update (partial)**

  -----------------------------------------------------------------------
  PATCH /v1/users/:userId/profile/experience/:id
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **Delete (soft)**

  -----------------------------------------------------------------------
  DELETE /v1/users/:userId/profile/experience/:id
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Errors**

- VALIDATION_ERROR when endDate \< startDate

- NOT_FOUND when id missing/soft-deleted

**Client flow**

- Save → optimistic update optional, but refresh list on success.

- For description editor, submit **HTML** string; backend sanitizes.

- After any change → **Progress** refresh.

## **5) Education (date rules mirror Experience)**

Endpoints mirror Experience:

  -----------------------------------------------------------------------
  GET /v1/users/:userId/profile/education\
  POST /v1/users/:userId/profile/education\
  PATCH /v1/users/:userId/profile/education/:id\
  DELETE /v1/users/:userId/profile/education/:id
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Client flow**

- Validate date order client-side where easy, but rely on backend error
  mapping.

- After any change → **Progress** refresh.

## **6) Job Title & Rate (Currency ISO-4217, 2dp, One Primary)**

  -----------------------------------------------------------------------
  GET /v1/users/:userId/profile/rates\
  POST /v1/users/:userId/profile/rates\
  PATCH /v1/users/:userId/profile/rates/:id\
  DELETE /v1/users/:userId/profile/rates/:id\
  POST /v1/users/:userId/profile/rates/:id/primary
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Create/Update body**

  -----------------------------------------------------------------------
  { \"title\": \"Senior Full-Stack Developer\", \"currency\": \"USD\",
  \"amount\": \"125.00\", \"isPrimary\": true }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Important**

- Max **3** active titles.

- Exactly **one** isPrimary=true across active rows. Setting primary
  unsets others.

**Errors**

- VALIDATION_ERROR for currency/amount format or multiple primary

- CONFLICT_DUPLICATE for duplicate title (case-insensitive)

**Client flow**

- When toggling a radio/"Make Primary" → call /primary.

- After changes → **Progress** refresh.

## **7) Portfolio (URL Normalization & De-dupe)**

  -----------------------------------------------------------------------
  GET /v1/users/:userId/profile/portfolio?page=1&pageSize=20&q=case\
  POST /v1/users/:userId/profile/portfolio\
  PATCH /v1/users/:userId/profile/portfolio/:id\
  GET /v1/users/:userId/profile/portfolio/:id\
  DELETE /v1/users/:userId/profile/portfolio/:id
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Create body**

  -----------------------------------------------------------------------
  { \"title\": \"Case Study \-- Marketplace\", \"description\": \"Flags,
  A/B infra\", \"url\": \"https://Example.com:443/case?utm_source=li#x\"
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Response**

  -----------------------------------------------------------------------
  { \"data\": { \"id\": \"uuid\", \"title\": \"Case Study \--
  Marketplace\", \"url\": \"https://example.com/case\", \"createdAt\":
  \"ISO\" } }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Errors**

- VALIDATION_ERROR → reason: \"PARSE\" \| \"PROTOCOL\"

- CONFLICT_DUPLICATE for same normalized URL

**Client flow**

- Allow user to paste any http/https URL.

- Display returned **normalized** URL.

## **8) Progress (single read; FE doesn't compute)**

  -----------------------------------------------------------------------
  GET /v1/users/:userId/profile/progress
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Response**

  -----------------------------------------------------------------------
  {\
  \"data\": {\
  \"totalSteps\": 5,\
  \"completedSteps\": 3,\
  \"percent\": 60,\
  \"steps\": \[\
  { \"id\": \"about\", \"title\": \"About Me\", \"required\": true,
  \"complete\": true, \"missing\": \[\] },\
  { \"id\": \"skills\", \"title\": \"Skills\", \"required\": true,
  \"complete\": true, \"missing\": \[\] },\
  { \"id\": \"experience\", \"title\": \"Work Experience\", \"required\":
  true, \"complete\": false, \"missing\": \[\"experience\[0\].title\"\]
  },\
  { \"id\": \"education\", \"title\": \"Education\", \"required\": true,
  \"complete\": false, \"missing\": \[\"education: none\"\] },\
  { \"id\": \"rates\", \"title\": \"Job Title & Rate\", \"required\":
  true, \"complete\": true, \"missing\": \[\] }\
  \]\
  }\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**When to call**

- After any successful save/delete in **About, Skills, Experience,
  Education, Rates**.

- On Talent Profile page load (to render "Ready to Get Hired?" bar).

## **9) Recommended UI Flows (per modal)**

### **9.1 Save Flow (generic)**

  -----------------------------------------------------------------------
  flowchart TD\
  A\[Open modal\] \--\> B\[Edit fields\]\
  B \--\> C{Client validation ok?}\
  C \-- no \--\> C1\[Inline errors\] \--\> B\
  C \-- yes \--\> D\[POST/PATCH to API\]\
  D \--\>\|200\| E\[Close modal\]\
  D \--\>\|4xx\| F\[Show API errors inline\]\
  E \--\> G\[Refetch list/section\]\
  G \--\> H\[GET /progress → update bar\]
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **9.2 Skills Flow (with typeahead)**

- Debounce search input (250ms).

- Enter or pick suggestion → **POST**.

- On 409 CONFLICT_DUPLICATE → toast "already added".

- Update chip list, then **GET /progress**.

### **9.3 Rates Flow (primary toggle)**

- Create/Update a rate → validate currency & amount format client-side
  where possible.

- "Make Primary" button → POST /:id/primary → refresh list → **GET
  /progress**.

## **10) Error → UI Mapping**

  **code**              **Typical cause**                       **UI action**
  --------------------- --------------------------------------- -------------------------------------------------
  VALIDATION_ERROR      Bad dates, formats, lengths, non-JSON   Inline field errors; keep modal open
  CONFLICT_DUPLICATE    Duplicate skill/title/url               Inline banner/toast + highlight offending field
  FORBIDDEN_NOT_OWNER   Token subject ≠ :userId                 Redirect to login / show 403 page
  NOT_FOUND             Editing/deleting a missing row          Refresh section; show toast "Item not found"
  UNKNOWN               Server error                            Retry affordance; show generic error

Error details shape:

  -----------------------------------------------------------------------
  { \"code\": \"VALIDATION_ERROR\", \"details\": \[ { \"field\":
  \"endDate\", \"reason\": \"BEFORE_START\" } \] }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **11) Sample cURL Snippets**

**Create Skill**

  -----------------------------------------------------------------------
  curl -X POST
  \"https://api.example.com/v1/users/USER_ID/profile/skills\" \\\
  -H \"Authorization: Bearer TOKEN\" -H \"Content-Type:
  application/json\" \\\
  -d \'{ \"value\": \"React\" }\'
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Set Primary Rate**

  ----------------------------------------------------------------------------
  curl -X POST
  \"https://api.example.com/v1/users/USER_ID/profile/rates/RATE_ID/primary\"
  \\\
  -H \"Authorization: Bearer TOKEN\"
  ----------------------------------------------------------------------------

  ----------------------------------------------------------------------------

**Get Progress**

  -----------------------------------------------------------------------
  curl -H \"Authorization: Bearer TOKEN\" \\\
  \"https://api.example.com/v1/users/USER_ID/profile/progress\"
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **12) Frontend Helpers (optional snippets)**

**HTTP client wrapper**

  -----------------------------------------------------------------------
  // language: typescript\
  export async function api\<T\>(path: string, opts: RequestInit = {}):
  Promise\<T\> {\
  const res = await fetch(path, { \...opts, headers: { \'Content-Type\':
  \'application/json\', \...(opts.headers\|\|{}) } });\
  const json = await res.json().catch(() =\> ({}));\
  if (!res.ok) throw json;\
  return json;\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Progress refresh after save**

  -----------------------------------------------------------------------
  // language: typescript\
  async function afterSave(userId: string) {\
  const prog = await api\<{ data: any
  }\>(\`/v1/users/\${userId}/profile/progress\`, { headers: await
  authHeaders(token) });\
  renderProgress(prog.data);\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **13) Non-Goals / Out of Scope (enforced)**

- **No file uploads** (multipart/form-data rejected with 415).

- **No profile image editing**.

- **No client-side progress calculation** (server is source of truth).

- **No external events/search integrations** in this sprint.

## **14) QA Checklist (per module)**

- **About**: sanitize verified (e.g., \<script\> stripped); blank after
  sanitize rejected.

- **Skills**: duplicate add → CONFLICT_DUPLICATE; cap at 100 enforced.

- **Experience/Education**: endDate \>= startDate; soft-delete not shown
  in list.

- **Rates**: amount format \^\\d+(\\.\\d{1,2})?\$; exactly one primary
  after operations.

- **Portfolio**: URL normalized; default ports/utm/fragment removed;
  de-dupe works.

- **Progress**: percent matches completedSteps / totalSteps (equal
  weights) and updates after each mutation.
