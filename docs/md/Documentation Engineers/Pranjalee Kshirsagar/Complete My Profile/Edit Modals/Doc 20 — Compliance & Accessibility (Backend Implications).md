# **Compliance & Accessibility (Backend Implications)**

**Project:** Complete My Profile --- **Edit Modals** (Backend)\
**Service:** apps/user-service\
**Scope:** Backend-only implications for **privacy/compliance**
(GDPR/CCPA-style principles) and **accessibility-supportive APIs**. No
new integrations or endpoints mandated; align strictly with existing
standards/docs.

## **1) Privacy by Design (what we already enforce)**

- **Data minimization:** Only store fields required by user stories
  (About, Skills, Experience, Education, Rates, Portfolio). No
  files/images this sprint.

- **Purpose limitation:** Data used solely for profile completion &
  display; no secondary use or sharing.

- **Least privilege:** App role has CRUD on owned tables only;
  migrations run via CI/CD, not at runtime (see Doc 14).

- **Access control:** Owner-only with optional admin override (Doc 05).

- **PII in logs:** Prohibited. Use audit table for minimal security
  events (Doc 11).

## **2) Lawful Basis & Consent (product-level note)**

- **Contractual necessity:** Editing a user's own profile is processed
  to provide the service.

- **No special categories:** The data types in this sprint are
  low/moderate PII (titles, employers, education, portfolio links).

- **No cookies/sessions here:** Auth is bearer JWT via gateway.

## **3) Data Subject Requests (DSR) --- Export, Rectify, Delete**

> No **new** endpoints are required; these are **operational
> procedures** using existing APIs/DB where permissible by policy.

### **3.1 Access/Portability (export)**

- Use owner-scoped reads to return profile data in a
  **machine-readable** JSON bundle.

- If a one-off internal job is needed, prefer a read-only SQL script
  (Ops runbook).

  -----------------------------------------------------------------------
  \-- language: sql\
  \-- Minimal export (single user)\
  \-- Replace :uid with the user\'s UUID.\
  SELECT json_build_object(\
  \'about\', (SELECT row_to_json(a) FROM about_me a WHERE a.user_id =
  :uid),\
  \'skills\', (SELECT json_agg(s) FROM (SELECT id, value_raw, created_at
  FROM user_skill WHERE user_id=:uid AND deleted_at IS NULL ORDER BY
  created_at DESC) s),\
  \'experience\', (SELECT json_agg(e) FROM (SELECT id, employer, title,
  start_date, end_date, created_at FROM experience WHERE user_id=:uid AND
  deleted_at IS NULL ORDER BY start_date DESC, created_at DESC) e),\
  \'education\', (SELECT json_agg(ed) FROM (SELECT id, institution,
  degree, start_date, end_date, created_at FROM education WHERE
  user_id=:uid AND deleted_at IS NULL ORDER BY start_date DESC,
  created_at DESC) ed),\
  \'rates\', (SELECT json_agg(r) FROM (SELECT id, title_raw, currency,
  amount, is_primary, created_at FROM rate_title WHERE user_id=:uid AND
  deleted_at IS NULL ORDER BY is_primary DESC, created_at DESC) r),\
  \'portfolio\', (SELECT json_agg(p) FROM (SELECT id, title, description,
  url_normalized AS url, created_at FROM portfolio_item WHERE
  user_id=:uid AND deleted_at IS NULL ORDER BY created_at DESC) p)\
  ) AS export;
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **3.2 Rectification**

- Already supported via existing PATCH/POST endpoints; DTO validation
  ensures correctness (Doc 10).

### **3.3 Deletion**

- **Soft-delete** per module is supported. Hard-delete (if required by
  corporate policy) should be an **Ops job** outside app runtime to
  avoid accidental service impact.

- Audit rows are retained per policy (Doc 11) and may be excluded from
  user export based on legal counsel.

## **4) Retention & Storage**

- **Primary data:** retained until user deletes or account closure
  workflow triggers Ops removal.

- **Audit data:** default **180 days** (config: AUDIT_RETENTION_DAYS)
  with scheduled cleanup (Doc 11 & 14).

- **Backups:** governed by platform policy; restores must re-run
  retention jobs to avoid over-retention.

## **5) Security Hardening (compliance-relevant)**

- **JSON-only inputs**; reject multipart/form-data (Doc 05).

- **HTML sanitization** for About/Experience/Education at write time;
  sanitized-blank rejected (Doc 04A/04C/04D/10).

- **URL normalization** prevents storing tracking fragments/params;
  http/https only (Doc 04F).

- **Money validation**: ISO-4217 & 2dp numeric constraints (Doc 04E).

- **Standardized error envelopes** prevent leakage of stack traces or
  internal SQL (Doc 05).

- **Observability** excludes bodies/PII; uses correlation IDs (Doc 12).

## **6) Accessibility-Supportive API Behaviors (WCAG-friendly from backend)**

> Accessibility is mainly FE, but APIs can **help** AT/keyboard users
> through predictable, parseable responses.

- **Deterministic response shape:** Always { data, meta? } on success; {
  code, message, details\[\] } on error (Doc 05).

- **Field-level error details:** Populate details\[{ field, reason }\]
  consistently so FE can announce precise messages via ARIA.

- **Stable ordering:** Lists ordered by dates or created_at (Doc 10) to
  prevent confusing reflows for screen readers.

- **Pagination limits:** pageSize ≤ 100 to avoid excessive content for
  AT.

- **Human-readable messages:** Keep message clear & concise; no internal
  jargon.

- **Timeouts:** Service should not rely on long-polling; all endpoints
  return fast (target p95 \< 300ms).

- **Localization (optional, non-blocking):** If platform enables, error
  message may be mapped by gateway; backend keeps codes stable.

**Example error (accessible for FE mapping):**

  -----------------------------------------------------------------------
  {\
  \"code\": \"VALIDATION_ERROR\",\
  \"message\": \"One or more fields are invalid.\",\
  \"details\": \[\
  { \"field\": \"endDate\", \"reason\": \"BEFORE_START\" },\
  { \"field\": \"amount\", \"reason\": \"FORMAT\" }\
  \]\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **7) Third-Country Transfers & Vendors**

- None this sprint. No outbound events/search/storage; all data remains
  in primary DB. (Doc 06 confirms **no integrations**.)

## **8) Admin & Support Operations (least-impact guidance)**

- **DSR exports**: run export SQL (above) or call read endpoints with
  admin token on behalf of user (owner policies still apply).

- **Bulk deletes/closure**: execute soft-delete across modules; queue
  hard-delete Ops job if policy mandates.

- **Audit review**: query audit_log by target_user_id with time range;
  avoid free-text searches to reduce incidental PII exposure.

## **9) Testing & Evidence (for audits)**

- Keep **Postman/Insomnia** collections (Doc 09) as **evidence scripts**
  for:

  - Access control (403 for non-owner)

  - HTML sanitization rejection

  - URL normalization & duplicate handling

  - Progress parity after edits

- Retain CI logs for **migrations** applied (Doc 14).

- Preserve change records of **validation matrices** (Doc 10) in the
  repo.

## **10) What We Deliberately Avoid (this sprint)**

- No per-field encryption beyond platform/DB at rest.

- No custom DPIA inside the codebase (handled by company privacy
  office).

- No cookies/session identifiers; no cross-site concerns in this
  service.

- No external sharing, processors, or sub-processors added.

## **11) Minimal Code Hooks (already present or safe to add)**

**Reject non-JSON (compliance & security)**

  ------------------------------------------------------------------------
  // language: typescript\
  //
  apps/user-service/src/common/middleware/reject-non-json.middleware.ts\
  import { Injectable, NestMiddleware, UnsupportedMediaTypeException }
  from \'@nestjs/common\';\
  import type { Request, Response, NextFunction } from \'express\';\
  \
  \@Injectable()\
  export class RejectNonJsonMiddleware implements NestMiddleware {\
  use(req: Request, \_res: Response, next: NextFunction) {\
  const ct = (req.headers\[\'content-type\'\] \|\| \'\').toLowerCase();\
  if ((req.method === \'POST\' \|\| req.method === \'PATCH\') &&
  !ct.startsWith(\'application/json\')) {\
  throw new UnsupportedMediaTypeException({\
  code: \'VALIDATION_ERROR\',\
  message: \'Only application/json is supported.\',\
  details: \[{ field: \'content-type\', reason: \'UNSUPPORTED\' }\]\
  });\
  }\
  next();\
  }\
  }
  ------------------------------------------------------------------------

  ------------------------------------------------------------------------

**Audit log writer (no sensitive bodies)**

  -----------------------------------------------------------------------
  // language: typescript\
  // apps/user-service/src/common/audit/audit.service.ts (see Doc 11 for
  full version)\
  await this.audit.log(req, \'experience.updated\', userId, exp.id,
  \'title_changed\');
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **12) Team Checklist (ready for privacy/a11y review)**

- ✅ Owner-only access enforced everywhere (Doc 05).

- ✅ No files/images processed; JSON-only.

- ✅ HTML sanitized; URLs normalized; money validated.

- ✅ Logs exclude PII; audit captures minimal "who/what/when".

- ✅ Retention configured; cleanup job path documented.

- ✅ Error envelope + details stable and parseable for AT.

- ✅ DSR export runbook available for Support/Ops.
