# **QA Plan: Test Cases, Boundary Values & E2E Journeys**

**Project:** Complete My Profile --- **Edit Modals** (Backend)\
**Service:** apps/user-service (expand existing user service)\
**Scope:** Backend-only QA for **About, Skills, Experience, Education,
Rates, Portfolio, Progress** + shared concerns (AuthZ, idempotency,
validation, errors, pagination, observability). **JSON-only; no file
uploads.**

## **0) Test Strategy & Environments**

- **Levels:** Unit (DTO/service), Integration (controller⇄DB), E2E
  (Postman/Insomnia flows).

- **Oracles:\**

  - HTTP status + error envelope ({ code, message, details\[\] }).

  - DB state (rows inserted/updated/soft-deleted; uniques/checks).

  - Progress endpoint parity after mutations.

- **Non-goals:** Frontend behavior, profile image, external
  integrations.

## **1) Shared Concerns (applies to all endpoints)**

### **1.1 AuthN/Z & Ownership**

  **Case**         **Steps**                                           **Expected**
  ---------------- --------------------------------------------------- ------------------------------------
  Missing token    POST any endpoint w/o Authorization                 401 (gateway) or 403, no DB change
  Non-owner        Token sub≠:userId                                   403, code=\"FORBIDDEN_NOT_OWNER\"
  Admin override   Token with roles:\[\"admin\"\] to another :userId   2xx, DB changed

### **1.2 Content-Type / No Files**

  **Case**             **Steps**                       **Expected**
  -------------------- ------------------------------- -------------------------------------------------------------------
  Wrong content type   POST with text/plain            415, code=\"VALIDATION_ERROR\", details content-type: UNSUPPORTED
  Multipart            POST with multipart/form-data   415 same as above

### **1.3 Pagination & Meta**

  ----------------------------------------------------------------
  **Case**   **Steps**           **Expected**
  ---------- ------------------- ---------------------------------
  Defaults   GET list without    meta.page=1, meta.pageSize=20
             params              

  Bounds     page=0,             Coerced to page=1, pageSize=100
             pageSize=999        (clamped)
  ----------------------------------------------------------------

### **1.4 Error Envelope Consistency**

- Inject DTO violations & unique conflicts across modules; verify codes:

  - VALIDATION_ERROR, CONFLICT_DUPLICATE, NOT_FOUND,
    FORBIDDEN_NOT_OWNER, UNKNOWN.

### **1.5 Observability Smoke (Doc 12)**

- /health/live → ok; /health/ready → ok + db:ok.

- /metrics non-empty; request counters increase on calls.

- Logs include x-request-id; no bodies printed.

## **2) Module Test Matrices**

### **2.1 About Me (sanitized HTML, max 2600)**

  **Case**                  **Input**                       **Expected**
  ------------------------- ------------------------------- -------------------------------------------------
  Happy path                \<p\>Hello\</p\>                200, persisted sanitized HTML, updatedAt set
  Script stripped → blank   \<script\>alert(1)\</script\>   400, VALIDATION_ERROR (EMPTY_OR_TOO_LONG)
  Length limit              2600 chars (after sanitize)     200
  Length +1                 2601 chars                      400, VALIDATION_ERROR
  Idempotent upsert         same content twice              second call 200, no duplicate rows (PK user_id)

**DB checks (SQL):**

\-- language: sql

SELECT char_length(content_html) \<= 2600 FROM about_me WHERE user_id =
:uid;

### **2.2 Skills (cap 100, case-insensitive de-dupe)**

  -----------------------------------------------------------------------
  **Case**          **Input**         **Expected**
  ----------------- ----------------- -----------------------------------
  Add               \"React\"         200, one row

  De-dupe           \"react\" / \"    409, CONFLICT_DUPLICATE
  (case/space)      Rea ct \"         

  Cap boundary      Add 100th         200

  Cap exceeded      Add 101st         400, VALIDATION_ERROR
                                      (MAX_SKILLS_REACHED)

  Delete            DELETE /:skillId  200, data:null

  Re-add after      \"React\"         200, new active row (soft-deleted
  delete                              not counted)
  -----------------------------------------------------------------------

**DB checks:**

  -----------------------------------------------------------------------
  \-- language: sql\
  SELECT COUNT(\*) FROM user_skill WHERE user_id=:uid AND deleted_at IS
  NULL;\
  SELECT id FROM user_skill WHERE user_id=:uid AND value_norm=\'react\'
  AND deleted_at IS NULL;
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **2.3 Work Experience (dates, sanitize)**

  **Case**            **Input**                          **Expected**
  ------------------- ---------------------------------- ------------------------------------------------
  Create minimal      employer/title/startDate           200, appears in list, order by start_date DESC
  End before start    start=2024-05-01, end=2024-04-30   400, endDate: BEFORE_START
  Description long    5001 chars                         400, descriptionHtml: TOO_LONG
  Update title only   PATCH                              200, updatedAt changes
  Delete (soft)       DELETE                             200, not returned in list
  Progress gating     after first valid row              progress step experience.complete=true

### **2.4 Education (mirror experience)**

  ------------------------------------------------------------
  **Case**      **Input**                      **Expected**
  ------------- ------------------------------ ---------------
  Create        institution/degree/startDate   200
  minimal                                      

  End before    invalid order                  400
  start                                        

  Description   \>5000                         400
  long                                         

  Delete (soft) DELETE                         200

  Progress      ≥1 active row                  complete=true
  ------------------------------------------------------------

### **2.5 Job Title & Rate (ISO currency, 2dp, single primary, cap 3)**

  **Case**                  **Input**                                             **Expected**
  ------------------------- ----------------------------------------------------- ---------------------------------------------------------------------------------------------------
  Create                    title,currency=USD,amount=\"125.00\",isPrimary=true   200
  Amount format             \"125.999\"                                           400, amount: FORMAT
  Amount ≤0                 \"0.00\"                                              400, amount: RANGE
  Currency lower            \"usd\"                                               400, currency: ISO4217
  Duplicate title           same title (case-insensitive)                         409, CONFLICT_DUPLICATE
  Multiple primary (race)   two primaries                                         one becomes primary; other fails with VALIDATION_ERROR (MULTIPLE_PRIMARY) or is unset per service
  Cap = 3                   4th active title                                      400, MAX_REACHED_3
  Set primary endpoint      POST /rates/:id/primary                               returns 200; others unset

**DB checks:**

  -----------------------------------------------------------------------
  \-- language: sql\
  SELECT COUNT(\*) FROM rate_title WHERE user_id=:uid AND deleted_at IS
  NULL;\
  SELECT COUNT(\*) FROM rate_title WHERE user_id=:uid AND is_primary =
  TRUE AND deleted_at IS NULL;
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **2.6 Portfolio (URL normalization & de-dupe)**

  **Case**                 **Input**                                      **Expected**
  ------------------------ ---------------------------------------------- ---------------------------------------------
  Create                   https://Example.com:443/case?utm_source=li#x   Returns normalized https://example.com/case
  Bad protocol             ftp://example.com                              400, url: PROTOCOL
  Duplicate (normalized)   different raw, same normalized                 409, CONFLICT_DUPLICATE
  Update title only        PATCH                                          200
  Update URL → dup         to existing normalized URL                     409
  Delete                   DELETE                                         200, soft-deleted

**DB checks:**

  -----------------------------------------------------------------------
  \-- language: sql\
  SELECT url_raw, url_normalized FROM portfolio_item WHERE id=:id;
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **2.7 Progress (equal weights, FE never computes)**

  **Case**                 **Setup**                **Expected**
  ------------------------ ------------------------ -----------------------------------------------
  0%                       No sections complete     percent=0, correct missing\[\] per step
  20%                      Only About               percent=20
  40%                      About + Skills           percent=40
  60%                      \+ Experience            percent=60
  80%                      \+ Education             percent=80
  100%                     \+ Rates (one primary)   percent=100
  Recompute after delete   remove needed item       step toggles to complete=false, percent drops

## **3) Boundary Value Suites**

### **3.1 Strings (min/max)**

  **Field**                                                **Min valid**              **Max valid**   **Min invalid**   **Max invalid**
  -------------------------------------------------------- -------------------------- --------------- ----------------- -----------------
  About contentHtml                                        \<p\>a\</p\> → non-blank   2600 chars      sanitized blank   2601+
  Skill value                                              1 char                     100 chars       0 (after trim)    101+
  Experience/Education employer/title/institution/degree   1                          200             0                 201+
  Rates title_raw                                          1                          160             0                 161+
  Portfolio title                                          1                          200             0                 201+
  Portfolio description                                    0                          2000            ---               2001+

### **3.2 Dates**

  -----------------------------------------------------------
  **Case**   **Input**                         **Expected**
  ---------- --------------------------------- --------------
  Valid      start=2020-01-01,end=null         200

  Equal      start=2020-01-01,end=2020-01-01   200

  Invalid    end \< start                      400
  -----------------------------------------------------------

### **3.3 Money**

  ----------------------------------------------
  **Case**       **Input**     **Expected**
  -------------- ------------- -----------------
  2dp            \"125.00\"    200

  0dp            \"125\"       200 (stored as
                               125.00)

  1dp            \"125.5\"     200 (stored as
                               125.50)

  3dp            \"125.999\"   400

  Non-positive   \"0.00\" /    400
                 \"-1.00\"     
  ----------------------------------------------

### **3.4 Caps**

  --------------------------------------------
  **Case**   **Module**   **Expected**
  ---------- ------------ --------------------
  101st      Skills       400
  skill                   MAX_SKILLS_REACHED

  4th title  Rates        400 MAX_REACHED_3
  --------------------------------------------

## **4) Idempotency & Concurrency**

### **4.1 Safe Replays**

- Repeat same **About** upsert → no duplicate rows.

- Repeat **DELETE** (skill/portfolio/experience/education/rate) → still
  200 or 404 per module rule; DB unchanged.

### **4.2 Concurrent Mutations**

- Two "Make Primary" calls on different rate IDs:

  - Exactly one ends with is_primary=true; others false.

  - No unique-index violation leaks to client (caught & mapped if it
    happens).

**Race test (pseudo)**

  -----------------------------------------------------------------------
  // language: typescript\
  await Promise.all(\[\
  setPrimary(id1), setPrimary(id2)\
  \]);\
  // then:\
  assert(await primaryCount(userId) === 1);
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **5) E2E Journeys (Happy Paths)**

### **5.1 "Zero to 100%" Journey**

1.  Upsert **About** with valid HTML.

2.  Add two **Skills** ("React", "Node.js").

3.  Create one **Experience** (no endDate).

4.  Create one **Education**.

5.  Create two **Rates** ("Senior..., 125 USD (primary)" and
    "Full-Stack..., 110 USD").

6.  Add a **Portfolio** item.

7.  **GET /progress** → percent=100, all steps complete.

### **5.2 "Edit & Recompute" Journey**

1.  Reach 100%.

2.  Delete the only **Education**.

3.  **GET /progress** → percent=80, education.complete=false,
    missing=\[\"education: none\"\].

4.  Add Education back → percent=100.

### **5.3 "Defensive Input" Journey**

1.  About with \<script\> → 400.

2.  Portfolio with ftp:// → 400.

3.  Rate \"125.999\" → 400.

4.  Skills duplicate case → 409.

5.  Verify error envelopes & details fields.

## **6) Negative & Security Tests**

- **Authorization bypass attempts:** different :userId → 403.

- **HTML injection in About/Experience/Education:** script removed,
  blank detection works.

- **Large bodies:** \>128KB JSON rejected by body parser (mapped by
  global filter).

- **SQL injection strings:** treated as plain strings; no DB errors
  beyond validation.

- **URL SSRF attempts:** ensure service **does not fetch** portfolio
  URLs.

## **7) Fixtures & Utilities**

### **7.1 Minimal JWT Header (mock in integration tests)**

  -----------------------------------------------------------------------
  Authorization: Bearer \<MOCK_JWT_FOR_UID\>
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **7.2 Common Payloads**

  ---------------------------------------------------------------------------------------------------------------------
  {\
  \"about\": { \"contentHtml\": \"\<p\>Engineer\</p\>\" },\
  \"skill\": { \"value\": \"React\" },\
  \"experience\": {
  \"employer\":\"Acme\",\"title\":\"SE\",\"startDate\":\"2023-01-01\",\"endDate\":null,\"descriptionHtml\":\"\<p\>did
  things\</p\>\" },\
  \"education\": { \"institution\":\"State U\",\"degree\":\"MS
  CS\",\"startDate\":\"2021-09-01\",\"endDate\":\"2023-06-15\",\"descriptionHtml\":\"\<p\>ML\</p\>\" },\
  \"rate\": { \"title\":\"Senior Full-Stack Developer\",\"currency\":\"USD\",\"amount\":\"125.00\",\"isPrimary\":true
  },\
  \"portfolio\": { \"title\":\"Case Study\",\"description\":\"A/B infra\",\"url\":\"https://example.com/case?utm=1#x\"
  }\
  }
  ---------------------------------------------------------------------------------------------------------------------

  ---------------------------------------------------------------------------------------------------------------------

## **8) SQL Post-conditions (spot checks)**

  -----------------------------------------------------------------------
  \-- language: sql\
  \-- Soft-delete not listed:\
  SELECT COUNT(\*) FROM experience WHERE user_id=:uid AND deleted_at IS
  NULL;\
  \
  \-- Single primary:\
  SELECT COUNT(\*) FROM rate_title WHERE user_id=:uid AND is_primary=TRUE
  AND deleted_at IS NULL;\
  \
  \-- Portfolio normalization de-dup:\
  SELECT COUNT(\*) FROM portfolio_item WHERE user_id=:uid AND
  url_normalized=\'https://example.com/case\' AND deleted_at IS NULL;
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **9) Performance & Reliability Checks**

- **Latency:** Run 100 RPS for 1 minute on list endpoints; p95 \< 300ms.

- **Error rate:** \< 1%; no 5xx under normal load.

- **Cold start:** first request after deploy within platform SLOs.

- **Readiness:** pods fail /health/ready during DB outage; recover
  automatically after DB returns.

## **10) Exit Criteria (QA Sign-off)**

- All matrices pass across modules.

- Progress always in sync post-mutation.

- No PII/body content logged; logs correlate by x-request-id.

- Constraints enforced (uniques/checks) with correct mapping to error
  codes.

- Observability endpoints functional; metrics scraped.
