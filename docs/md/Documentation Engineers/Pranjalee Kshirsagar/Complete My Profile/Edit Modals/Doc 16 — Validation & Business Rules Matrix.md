# **Validation & Business Rules Matrix**

**Project:** Complete My Profile --- **Edit Modals** (Backend)\
**Service:** apps/user-service (expand existing user service)\
**Scope:** Backend-only validation for **About, Skills, Work Experience,
Education, Job Title & Rate, Portfolio, Progress**. JSON-only; no file
uploads.

## **0) Global Rules (apply to all endpoints)**

  ------------------------------------------------------------------------
  **Area**        **Rule**
  --------------- --------------------------------------------------------
  AuthZ           Owner-only (:userId must equal JWT sub), admin override
                  allowed. Errors: FORBIDDEN_NOT_OWNER.

  Content-Type    application/json only for POST/PATCH; non-JSON ⇒ 415
                  with VALIDATION_ERROR ("content-type: UNSUPPORTED").

  Whitelisting    DTOs use class-validator + global
                  ValidationPipe({whitelist:true,
                  forbidNonWhitelisted:true, transform:true}). Unknown
                  fields rejected as VALIDATION_ERROR.

  Trimming        Services **trim** and **collapse internal whitespace**
                  for user-entered strings prior to persistence and
                  checks.

  Soft Delete     Lists exclude deleted_at IS NULL only. Get-by-ID hides
                  soft-deleted rows → NOT_FOUND.

  Pagination      page \>= 1, pageSize: 1..100. Response includes
                  meta.page/pageSize/total.

  Error Envelope  { code, message, details\[\] }. Typical codes:
                  VALIDATION_ERROR, CONFLICT_DUPLICATE,
                  FORBIDDEN_NOT_OWNER, NOT_FOUND, UNKNOWN.

  Dates           ISO YYYY-MM-DD strings. If endDate is present, it must
                  be \>= startDate.

  HTML            Any \*Html field is sanitized to safe HTML;
                  **sanitized-blank** counts as empty.
                  Scripts/styles/event handlers removed.

  Normalization   Case-insensitive unique constraints use normalized
  Keys            forms: \*\_norm (lowercased + single spaces), or
                  canonical URL for portfolio.

  Numeric         Money as string \"\^\\d+(\\.\\d{1,2})?\$\", positive, DB
                  NUMERIC(12,2).
  ------------------------------------------------------------------------

## **1) About Me (Doc 04A)**

**Entity:** about_me (1 row per user)

  -----------------
  **Field**
  -----------------
  contentHtml

  -----------------

**Business Rules**

- Upsert semantics (conflict on user_id).

- Blank after sanitize → incomplete for progress.

## **2) Skills (Doc 04B)**

**Entity:** user_skill

  **Field**     **Type**   **Required**   **Constraints**                        **Normalization**                             **DB Constraint**                                        **Error (details)**
  ------------- ---------- -------------- -------------------------------------- --------------------------------------------- -------------------------------------------------------- ---------------------------------------------------------------
  value         string     **Yes**        Trimmed **1..100** chars               value_norm = toLower(collapseSpaces(value))   Unique: (user_id, value_norm) where deleted_at IS NULL   VALIDATION_ERROR (value: EMPTY_OR_LENGTH), CONFLICT_DUPLICATE
  --- cap ---   ---        ---            **Max 100 skills** per user (active)   ---                                           (service count check)                                    VALIDATION_ERROR (MAX_SKILLS_REACHED)

**Business Rules**

- Case-insensitive de-dupe.

- Soft-delete removes from active count.

## **3) Work Experience (Doc 04C)**

**Entity:** experience

  **Field**         **Type**           **Required**   **Constraints**                 **Normalization**   **DB Constraint**                                     **Error (details)**
  ----------------- ------------------ -------------- ------------------------------- ------------------- ----------------------------------------------------- ----------------------------------------------
  employer          string             **Yes**        1..200                          trim/collapse       varchar(200)                                          VALIDATION_ERROR (employer: EMPTY_OR_LENGTH)
  title             string             **Yes**        1..200                          trim/collapse       varchar(200)                                          VALIDATION_ERROR (title: EMPTY_OR_LENGTH)
  startDate         ISO date           **Yes**        valid date                      ---                 date                                                  VALIDATION_ERROR (startDate: INVALID)
  endDate           ISO date \| null   No             if present: \>= startDate       ---                 CHECK (end_date IS NULL OR end_date \>= start_date)   VALIDATION_ERROR (endDate: BEFORE_START)
  descriptionHtml   string (HTML)      No             sanitized; max **5000** chars   sanitize            varchar(5000)                                         VALIDATION_ERROR (descriptionHtml: TOO_LONG)

**Business Rules**

- At least **1 valid active** experience to mark step complete.

- Nested additions (e.g., *skills inside experience*) are
  **non-blocking** for completion.

## **4) Education (Doc 04D)**

**Entity:** education

  **Field**         **Type**           **Required**   **Constraints**                 **Normalization**   **DB Constraint**                                     **Error (details)**
  ----------------- ------------------ -------------- ------------------------------- ------------------- ----------------------------------------------------- -------------------------------------------------
  institution       string             **Yes**        1..200                          trim/collapse       varchar(200)                                          VALIDATION_ERROR (institution: EMPTY_OR_LENGTH)
  degree            string             **Yes**        1..200                          trim/collapse       varchar(200)                                          VALIDATION_ERROR (degree: EMPTY_OR_LENGTH)
  startDate         ISO date           **Yes**        valid date                      ---                 date                                                  VALIDATION_ERROR (startDate: INVALID)
  endDate           ISO date \| null   No             if present: \>= startDate       ---                 CHECK (end_date IS NULL OR end_date \>= start_date)   VALIDATION_ERROR (endDate: BEFORE_START)
  descriptionHtml   string (HTML)      No             sanitized; max **5000** chars   sanitize            varchar(5000)                                         VALIDATION_ERROR (descriptionHtml: TOO_LONG)

**Business Rules**

- At least **1 valid active** education to mark step complete.

## **5) Job Title & Rate (Doc 04E)**

**Entity:** rate_title

  **Field**   **Type**         **Required**   **Constraints**                                   **Normalization**                             **DB Constraint**                                                                            **Error (details)**
  ----------- ---------------- -------------- ------------------------------------------------- --------------------------------------------- -------------------------------------------------------------------------------------------- ---------------------------------------------------------------
  title       string           **Yes**        1..160                                            title_norm = toLower(collapseSpaces(title))   Unique (user_id, title_norm) where deleted_at IS NULL                                        VALIDATION_ERROR (title: EMPTY_OR_LENGTH), CONFLICT_DUPLICATE
  currency    string           **Yes**        \^\[A-Z\]{3}\$ (ISO-4217)                         uppercase enforced                            varchar(3)                                                                                   VALIDATION_ERROR (currency: ISO4217)
  amount      string/decimal   **Yes**        \^\\d+(\\.\\d{1,2})?\$, \> 0, max 9999999999.99   string-in DTO; convert to NUMERIC             NUMERIC(12,2) CHECK (amount \> 0)                                                            VALIDATION_ERROR (amount: FORMAT_OR_RANGE)
  isPrimary   boolean          No             if true, **unset all others** for user            ---                                           single-primary partial unique index (user_id) WHERE is_primary=true AND deleted_at IS NULL   VALIDATION_ERROR (isPrimary: MULTIPLE_PRIMARY on race)

**Business Rules**

- **Cap 3** active titles per user (service enforced).

- Exactly **one** primary among active rows for step completion.

## **6) Portfolio (Doc 04F)**

**Entity:** portfolio_item

  **Field**     **Type**       **Required**   **Constraints**                            **Normalization**                                                                                        **DB Constraint**                                           **Error (details)**
  ------------- -------------- -------------- ------------------------------------------ -------------------------------------------------------------------------------------------------------- ----------------------------------------------------------- -------------------------------------------
  title         string         **Yes**        1..200                                     trim/collapse                                                                                            varchar(200)                                                VALIDATION_ERROR (title: EMPTY_OR_LENGTH)
  description   string\|null   No             0..2000                                    trim or null                                                                                             varchar(2000) NULL                                          VALIDATION_ERROR (description: TOO_LONG)
  url           string         **Yes**        must parse; **protocol http/https only**   Normalize: lower host, strip default ports, drop fragment, drop UTM/fbclid/gclid, stabilize path/query   Unique (user_id, url_normalized) where deleted_at IS NULL   VALIDATION_ERROR (\`url: PARSE

**Business Rules**

- Store both url_raw and url_normalized; echo normalized URL in API
  responses.

- Updating URL re-normalizes and may hit duplicate check.

## **7) Progress (Doc 04G)**

**No entity; computed.** Equal-weight steps for this sprint: **about,
skills, experience, education, rates**.

  **Step**     **Completion Criteria**                                                           **Missing keys (examples)**
  ------------ --------------------------------------------------------------------------------- --------------------------------------------------------------------
  about        about_me.content_html sanitized, non-blank, ≤ 2600 chars                          about.contentHtml
  skills       ≥ 1 active skill                                                                  skills\[0\].value
  experience   ≥ 1 active row with **employer, title, startDate** present and valid date order   experience: none, experience\[0\].title, experience\[0\].startDate
  education    ≥ 1 active row with **institution, degree, startDate** valid, date order ok       education: none, education\[0\].degree
  rates        ≥ 1 active row **and** exactly **one** primary; fields valid                      rates: none, rates.primary: none-or-multiple

**Percent** = round(completedSteps / totalSteps \* 100); FE **never**
computes locally.

## **8) Error Mapping (standardized)**

  **Condition**               **HTTP**   **code**              **details example**
  --------------------------- ---------- --------------------- ------------------------------------------------------
  Empty/too long strings      400        VALIDATION_ERROR      { field: \"title\", reason: \"EMPTY_OR_LENGTH\" }
  Bad date                    400        VALIDATION_ERROR      { field: \"startDate\", reason: \"INVALID\" }
  End before start            400        VALIDATION_ERROR      { field: \"endDate\", reason: \"BEFORE_START\" }
  Bad currency                400        VALIDATION_ERROR      { field: \"currency\", reason: \"ISO4217\" }
  Bad amount format           400        VALIDATION_ERROR      { field: \"amount\", reason: \"FORMAT\" }
  Amount ≤ 0                  400        VALIDATION_ERROR      { field: \"amount\", reason: \"RANGE\" }
  Duplicate skill/title/url   409        CONFLICT_DUPLICATE    \`{ field: \"value
  Too many titles/skills      400        VALIDATION_ERROR      \`{ field: \"title
  Non-owner                   403        FORBIDDEN_NOT_OWNER   \[\]
  Missing id / soft-deleted   404        NOT_FOUND             \[\]
  Non-JSON body               415        VALIDATION_ERROR      { field: \"content-type\", reason: \"UNSUPPORTED\" }

## **9) Ordering, Caps, and Limits Summary**

  **Module**   **Ordering**                       **Caps/Limits**
  ------------ ---------------------------------- --------------------------------------------------------
  About        n/a (single row)                   2600 chars
  Skills       created_at DESC                    Max 100 active
  Experience   start_date DESC, created_at DESC   descriptionHtml ≤ 5000
  Education    start_date DESC, created_at DESC   descriptionHtml ≤ 5000
  Rates        is_primary DESC, created_at DESC   Max 3 active; amount 2dp; title ≤ 160
  Portfolio    created_at DESC                    title ≤ 200; description ≤ 2000; URL normalized unique

## **10) Examples (good vs rejected)**

**Amount (good)**

  -----------------------------------------------------------------------
  { \"amount\": \"125.00\" }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Amount (reject)**

  -----------------------------------------------------------------------
  { \"amount\": \"125.999\" } // details: { field:\"amount\",
  reason:\"FORMAT\" }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Currency (good)**

  -----------------------------------------------------------------------
  { \"currency\": \"USD\" }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Currency (reject)**

  -----------------------------------------------------------------------
  { \"currency\": \"usd\" } // details: { field:\"currency\",
  reason:\"ISO4217\" }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Portfolio URL (good → normalized)**

  -----------------------------------------------------------------------
  { \"url\": \"https://Example.com:443/case?utm_source=li#frag\" }\
  // stored normalized: \"https://example.com/case\"
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Portfolio URL (reject)**

  -----------------------------------------------------------------------
  { \"url\": \"ftp://example.com/file\" } // PROTOCOL
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Experience dates (reject)**

  -----------------------------------------------------------------------
  { \"startDate\": \"2024-05-01\", \"endDate\": \"2024-04-30\" } //
  BEFORE_START
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**About (reject after sanitize)**

  -----------------------------------------------------------------------
  { \"contentHtml\": \"\<script\>alert(1)\</script\>\" } // becomes blank
  → EMPTY_OR_TOO_LONG
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **11) Test Checklist (per module)**

- **DTO:** length/format/date validations fire with precise details.

- **Service:** normalization works (case-insensitive, spaces collapsed).

- **DB:** unique + check constraints mirror DTO rules (no gaps).

- **Soft-delete:** excluded from lists, blocked on get-by-id.

- **Caps:** 100 skills / 3 titles enforced with correct errors.

- **Progress:** completion toggles correctly across combinations.

- **No-files:** multipart requests rejected with 415.
