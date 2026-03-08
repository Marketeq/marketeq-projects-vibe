# **Progress Engine: Weights, Completion Criteria & Contract**

**Project:** Complete My Profile --- **Edit Modals** (Backend)\
**Module:** apps/user-service/src/modules/progress\
**Scope:** Backend-only progress for **profile completion** shown on the
Talent Profile page.\
**Authoritative rule:** *"Each step is weighed equally; a step is
complete when all **required** fields in that step are filled. All
fields are required unless explicitly labeled optional; a few UX
exceptions exist (e.g., adding skills to a work experience). The
frontend does **not** compute locally."*

## **1) Contract (single read endpoint)**

  -----------------------------------------------------------------------
  GET /v1/users/:userId/profile/progress\
  Authorization: Bearer \<JWT\>
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Response (JSON)**

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
  { \"id\": \"experience\",\"title\": \"Work Experience\", \"required\":
  true, \"complete\": false, \"missing\":
  \[\"experience\[0\].title\",\"experience\[0\].startDate\"\] },\
  { \"id\": \"education\", \"title\": \"Education\", \"required\": true,
  \"complete\": false, \"missing\": \[\"education: none\"\] },\
  { \"id\": \"rates\", \"title\": \"Job Title & Rate\", \"required\":
  true, \"complete\": true, \"missing\": \[\] }\
  \]\
  }\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

- totalSteps = number of **enabled** steps for this sprint (equal
  weights).

- completedSteps = count of steps with complete=true.

- percent = round( completedSteps / totalSteps \* 100 ).

- steps\[\].missing lists **human-readable keys** the developer can map
  back to the modal.

> **Out of scope this sprint:** Availability, Languages, Industries,
> Teams, Profile Image. Not included in totalSteps.

## **2) Steps enabled in this sprint (equal weights)**

Order is stable for UX:

1.  about --- **About Me\**

2.  skills --- **Skills\**

3.  experience --- **Work Experience\**

4.  education --- **Education\**

5.  rates --- **Job Title & Rate\**

> **Portfolio** is documented and available via API, but **not** counted
> in progress for this sprint unless product toggles it on later (see §7
> config).

## **3) Completion Criteria (per step)**

### **3.1 About Me (about)**

- **Complete if:** about_me.content_html exists **after** sanitization
  **and** not blank after stripping tags/entities; length ≤ 2600.

- **Missing keys when incomplete:** about.contentHtml.

### **3.2 Skills (skills)**

- **Complete if:** user has **≥ 1** row in user_skill (active).

- **Rules:** per Doc 04B --- max 100; case-insensitive de-dupe.

- **Missing keys when incomplete:** skills\[0\].value.

### **3.3 Work Experience (experience)**

- **Complete if:** user has **≥ 1** **active** row in experience with
  **all required fields**:

  - employer (≤200), title (≤200), start_date (ISO), and if end_date
    present then end_date ≥ start_date.

  - description_html is optional (sanitized when provided).

- **Missing keys examples:** experience: none, experience\[0\].title,
  experience\[0\].startDate.

### **3.4 Education (education)**

- **Complete if:** user has **≥ 1** **active** row in education with
  **required fields**:

  - institution (≤200), degree (≤200), start_date (ISO), end_date null
    or ≥ start_date.

  - description_html optional.

- **Missing keys examples:** education: none, education\[0\].degree.

### **3.5 Job Title & Rate (rates)**

- **Complete if:** user has **≥ 1 active** row in rate_title **AND**
  **exactly one** is_primary=true among active rows.

  - Each row requires: title_raw (≤160), currency (ISO-4217), amount
    (NUMERIC(12,2) \> 0).

- **Missing keys examples:** rates: none, rates.primary: none,
  rates\[0\].amount.

> **Edge rule (from supervisor note):** certain UX fields may be present
> in modals that are not required even if not marked "optional" (e.g.,
> *adding skills inside an experience*). Back end treats such nested
> add-ons as **non-blocking** for the step's completion.

## **4) Calculation Logic (service)**

  -----------------------------------------------------------------------
  // language: typescript\
  // apps/user-service/src/modules/progress/progress.service.ts\
  import { Injectable } from \'@nestjs/common\';\
  import { DataSource } from \'typeorm\';\
  \
  type StepState = { id: string; title: string; required: boolean;
  complete: boolean; missing: string\[\] };\
  \
  \@Injectable()\
  export class ProgressService {\
  constructor(private readonly db: DataSource) {}\
  \
  async get(userId: string) {\
  const steps: StepState\[\] = \[\];\
  \
  // ABOUT\
  const about = await this.db.query(\
  \`SELECT content_html FROM about_me WHERE user_id = \$1\`, \[userId\]\
  );\
  const aboutHtml = about?.\[0\]?.content_html \|\| \'\';\
  const aboutText = stripHtmlToText(aboutHtml);\
  steps.push({\
  id: \'about\', title: \'About Me\', required: true,\
  complete: !!aboutText && aboutHtml.length \<= 2600,\
  missing: (!!aboutText && aboutHtml.length \<= 2600) ? \[\] :
  \[\'about.contentHtml\'\]\
  });\
  \
  // SKILLS\
  const skillsCount = await single\<number\>(this.db.query(\
  \`SELECT COUNT(1)::int AS c FROM user_skill WHERE user_id = \$1\`,
  \[userId\]\
  ), \'c\');\
  steps.push({\
  id: \'skills\', title: \'Skills\', required: true,\
  complete: skillsCount \>= 1,\
  missing: skillsCount \>= 1 ? \[\] : \[\'skills\[0\].value\'\]\
  });\
  \
  // EXPERIENCE\
  const expRows = await this.db.query(\
  \`SELECT id, employer, title, start_date, end_date\
  FROM experience\
  WHERE user_id = \$1 AND deleted_at IS NULL\
  ORDER BY created_at DESC\
  LIMIT 1\`, \[userId\]\
  );\
  const expMiss: string\[\] = \[\];\
  let expOk = false;\
  if (expRows.length === 0) {\
  expMiss.push(\'experience: none\');\
  } else {\
  const r = expRows\[0\];\
  if (!r.employer) expMiss.push(\'experience\[0\].employer\');\
  if (!r.title) expMiss.push(\'experience\[0\].title\');\
  if (!r.start_date) expMiss.push(\'experience\[0\].startDate\');\
  if (r.end_date && new Date(r.end_date) \< new Date(r.start_date)) {\
  expMiss.push(\'experience\[0\].endDate\');\
  }\
  expOk = expMiss.length === 0;\
  }\
  steps.push({ id: \'experience\', title: \'Work Experience\', required:
  true, complete: expOk, missing: expMiss });\
  \
  // EDUCATION\
  const eduRows = await this.db.query(\
  \`SELECT id, institution, degree, start_date, end_date\
  FROM education\
  WHERE user_id = \$1 AND deleted_at IS NULL\
  ORDER BY created_at DESC\
  LIMIT 1\`, \[userId\]\
  );\
  const eduMiss: string\[\] = \[\];\
  let eduOk = false;\
  if (eduRows.length === 0) {\
  eduMiss.push(\'education: none\');\
  } else {\
  const r = eduRows\[0\];\
  if (!r.institution) eduMiss.push(\'education\[0\].institution\');\
  if (!r.degree) eduMiss.push(\'education\[0\].degree\');\
  if (!r.start_date) eduMiss.push(\'education\[0\].startDate\');\
  if (r.end_date && new Date(r.end_date) \< new Date(r.start_date)) {\
  eduMiss.push(\'education\[0\].endDate\');\
  }\
  eduOk = eduMiss.length === 0;\
  }\
  steps.push({ id: \'education\', title: \'Education\', required: true,
  complete: eduOk, missing: eduMiss });\
  \
  // RATES\
  const rateAgg = await this.db.query(\
  \`SELECT\
  COUNT(\*) FILTER (WHERE deleted_at IS NULL) AS active_count,\
  COUNT(\*) FILTER (WHERE deleted_at IS NULL AND is_primary) AS
  primary_count\
  FROM rate_title WHERE user_id = \$1\`, \[userId\]\
  );\
  const activeCount = parseInt(rateAgg?.\[0\]?.active_count \|\| \'0\',
  10);\
  const primaryCount = parseInt(rateAgg?.\[0\]?.primary_count \|\| \'0\',
  10);\
  const ratesOk = activeCount \>= 1 && primaryCount === 1;\
  const ratesMiss: string\[\] = \[\];\
  if (activeCount === 0) ratesMiss.push(\'rates: none\');\
  if (primaryCount !== 1) ratesMiss.push(\'rates.primary:
  none-or-multiple\');\
  steps.push({ id: \'rates\', title: \'Job Title & Rate\', required:
  true, complete: ratesOk, missing: ratesMiss });\
  \
  // Equal weights across enabled steps\
  const totalSteps = steps.length;\
  const completedSteps = steps.filter(s =\> s.complete).length;\
  const percent = Math.round((completedSteps / Math.max(totalSteps, 1))
  \* 100);\
  \
  return { totalSteps, completedSteps, percent, steps };\
  }\
  }\
  \
  // helpers\
  function stripHtmlToText(html: string): string {\
  return (html \|\| \'\').replace(/\<\[\^\>\]\*\>/g,
  \'\').replace(/&nbsp;/gi, \' \').trim();\
  }\
  function single\<T = any\>(rows: any\[\], key: string): T {\
  return (rows?.\[0\]?.\[key\]) as T;\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **5) Controller (owner-only)**

  -----------------------------------------------------------------------
  // language: typescript\
  // apps/user-service/src/modules/progress/progress.controller.ts\
  import { Controller, Get, Param, UseGuards } from \'@nestjs/common\';\
  import { ProgressService } from \'./progress.service\';\
  import { OwnerGuard } from \'@/common/guards/owner.guard\';\
  \
  \@Controller(\'/v1/users/:userId/profile/progress\')\
  \@UseGuards(OwnerGuard)\
  export class ProgressController {\
  constructor(private readonly svc: ProgressService) {}\
  \
  \@Get()\
  async get(@Param(\'userId\') userId: string) {\
  const data = await this.svc.get(userId);\
  return { data };\
  }\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **6) Module wiring**

  -----------------------------------------------------------------------
  // language: typescript\
  // apps/user-service/src/modules/progress/progress.module.ts\
  import { Module } from \'@nestjs/common\';\
  import { ProgressController } from \'./progress.controller\';\
  import { ProgressService } from \'./progress.service\';\
  \
  \@Module({\
  controllers: \[ProgressController\],\
  providers: \[ProgressService\]\
  })\
  export class ProgressModule {}
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

> Add ProgressModule to the root user-service module's imports.

## **7) Feature flags / configuration (optional, non-breaking)**

If product later chooses to include/exclude steps (e.g., enable
**Portfolio** as a counted step), add a static config provider:

  -----------------------------------------------------------------------
  // language: typescript\
  // apps/user-service/src/modules/progress/progress.config.ts\
  export const PROGRESS_STEPS = {\
  about: { enabled: true, title: \'About Me\' },\
  skills: { enabled: true, title: \'Skills\' },\
  experience:{ enabled: true, title: \'Work Experience\' },\
  education: { enabled: true, title: \'Education\' },\
  rates: { enabled: true, title: \'Job Title & Rate\' },\
  portfolio: { enabled: false, title: \'Portfolio\' } // can turn on
  later\
  } as const;
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

> **Weights remain equal**; enabling/disabling a step changes totalSteps
> accordingly.

## **8) Error model**

- FORBIDDEN_NOT_OWNER --- token subject ≠ :userId.

- UNKNOWN --- unexpected failures.

Response envelope follows the service standard used elsewhere in the
user-service.

## **9) Tests (minimum)**

**Unit**

- About: empty/sanitized-empty ⇒ not complete; length \> 2600 rejected
  at write-time (Doc 04A) but ensure get marks incomplete when blank.

- Skills: 0 ⇒ incomplete; ≥1 ⇒ complete.

- Experience/Education: presence of one valid row ⇒ complete; invalid
  date order ⇒ incomplete outline shows missing endDate.

- Rates: zero ⇒ incomplete; multiple primaries or none ⇒ incomplete;
  exactly one ⇒ complete.

**Integration**

- Seed a user with combinations of sections; verify percent and
  steps\[\].complete.

- Toggle a step (if config used) and assert totalSteps/percent adjust.

**Contract/E2E**

- Owner-only access enforced; returns deterministic percent and stable
  steps order.

## **10) Performance**

- Exactly **5 lightweight queries** (one per step) with simple
  predicates and small cardinalities.

- p95 target \< **150--250 ms** on warm DB.
