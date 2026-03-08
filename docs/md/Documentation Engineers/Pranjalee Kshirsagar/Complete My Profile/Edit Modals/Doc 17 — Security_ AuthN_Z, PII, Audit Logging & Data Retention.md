# **Security: AuthN/Z, PII, Audit Logging & Data Retention**

**Project:** Complete My Profile --- **Edit Modals** (Backend)\
**Service:** apps/user-service (expand existing user service)\
**Scope:** Backend-only security posture for **About, Skills,
Experience, Education, Rates, Portfolio, Progress**. JSON-only; no file
uploads this sprint.

## **1) Authentication & Session Trust (AuthN)**

- **Source of truth:** Upstream API Gateway / Auth service issues
  **JWT**.

- **Expectation in user-service:\**

  - Accepts requests **only** with Authorization: Bearer \<JWT\>.

  - Validated token decoded by upstream middleware; req.user.sub
    available.

  - **No cookies, no sessions** in this service.

- **Clock skew:** Honor gateway's verification windows; user-service
  does not re-verify signatures.

**Header contract (all endpoints):**

  -----------------------------------------------------------------------
  Authorization: Bearer \<JWT\>\
  Content-Type: application/json
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **2) Authorization (AuthZ)**

- **Owner-only policy** for all /v1/users/:userId/profile/\* endpoints.

- **Admin override** allowed if req.user.roles includes admin (honor
  central RBAC vocabulary).

- Implemented via shared guard (see Doc 05). Example snippet here for
  completeness:

  -----------------------------------------------------------------------
  // language: typescript\
  // apps/user-service/src/common/guards/owner.guard.ts\
  import { CanActivate, ExecutionContext, ForbiddenException, Injectable
  } from \'@nestjs/common\';\
  \
  \@Injectable()\
  export class OwnerGuard implements CanActivate {\
  canActivate(ctx: ExecutionContext): boolean {\
  const req = ctx.switchToHttp().getRequest();\
  const sub = req.user?.sub;\
  const pathUserId = req.params?.userId;\
  const isAdmin = Array.isArray(req.user?.roles) &&
  req.user.roles.includes(\'admin\');\
  const allowed = isAdmin \|\| (sub && pathUserId && sub ===
  pathUserId);\
  if (!allowed) {\
  throw new ForbiddenException({ code: \'FORBIDDEN_NOT_OWNER\', message:
  \'Forbidden.\', details: \[\] });\
  }\
  return true;\
  }\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

Attach with \@UseGuards(OwnerGuard) on all profile controllers.

## **3) Input Security & Output Encoding**

- **JSON-only** POST/PATCH (reject multipart/form-data; see Doc 05
  §5.1).

- **Sanitize HTML** fields (about, experience.descriptionHtml,
  education.descriptionHtml) at write time:

  - Strip scripts, event handlers, dangerous CSS; allow a minimal, safe
    tag set.

  - Treat **sanitized-blank** as empty for business rules.

- **Normalize** and validate:

  - **URLs:** http/https only; canonicalize and drop tracking params
    (Doc 04F).

  - **Strings:** trim, collapse whitespace before uniqueness checks.

  - **Money:** strict regex and positive numeric (Doc 04E).

- **Error handling:** unified envelope; never leak stack traces.

## **4) PII Classification & Handling**

**Data in scope (examples)**

- **Low/Moderate PII:** names in free text (About), employers/titles
  (Experience), institutions/degrees (Education), skills list, rate
  amounts/currency, portfolio URLs.

- **Out of scope this sprint:** profile images/files.

**Rules**

- **No data egress** to external systems this sprint.

- **Return only owner's data**; no cross-user reads.

- **Logging:** See Audit (§6) --- never log HTML bodies or rate amounts
  verbatim in info-level logs; keep sensitive fields out of structured
  logs.

## **5) Least Privilege & DB Security**

- **App role** (user-service) uses **minimal DB privileges**:
  SELECT/INSERT/UPDATE on owned tables; no schema DDL in runtime.

- **Migrations** run via controlled pipeline, not at runtime of the
  service pod.

- All list queries filter out soft-deleted records (deleted_at IS NULL).

## **6) Audit Logging (Security/Compliance-Oriented)**

**Purpose:** Record "who did what" for profile mutations without storing
sensitive bodies.

**Events to capture**

- about.updated

- skills.added, skills.removed

- experience.created\|updated\|deleted

- education.created\|updated\|deleted

- rates.created\|updated\|deleted\|primary.changed

- portfolio.created\|updated\|deleted

**Capture fields (minimal):**

- audit_id (uuid), occurred_at (timestamptz now())

- actor_user_id (from JWT sub)

- target_user_id (path :userId)

- action (enum from list above)

- resource_id (entity id where applicable)

- ip (from x-forwarded-for if present)

- ua_hash (hash of user-agent string; do not store full UA if not
  required)

- **delta summary** (short redacted string; never store full HTML or
  amounts---store booleans/lengths or masked values)

**Table (example)**

  -----------------------------------------------------------------------
  \-- language: sql\
  CREATE TABLE IF NOT EXISTS audit_log (\
  audit_id UUID PRIMARY KEY,\
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),\
  actor_user_id UUID NOT NULL,\
  target_user_id UUID NOT NULL,\
  action VARCHAR(64) NOT NULL,\
  resource_id UUID NULL,\
  ip INET NULL,\
  ua_hash VARCHAR(64) NULL,\
  delta_summary VARCHAR(512) NULL\
  );\
  CREATE INDEX IF NOT EXISTS ix_audit_target_time ON
  audit_log(target_user_id, occurred_at DESC);
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Write helper**

  -----------------------------------------------------------------------
  // language: typescript\
  // apps/user-service/src/common/audit/audit.service.ts\
  import { randomUUID, createHash } from \'crypto\';\
  import { Injectable } from \'@nestjs/common\';\
  import { DataSource } from \'typeorm\';\
  \
  \@Injectable()\
  export class AuditService {\
  constructor(private readonly db: DataSource) {}\
  \
  async log(req: any, action: string, targetUserId: string, resourceId?:
  string, deltaSummary?: string) {\
  const actor = req.user?.sub \|\| \'anonymous\';\
  const ip = (req.headers\[\'x-forwarded-for\'\] \|\| req.ip \|\| \'\')
  as string;\
  const ua = (req.headers\[\'user-agent\'\] \|\| \'\') as string;\
  const uaHash =
  createHash(\'sha256\').update(ua).digest(\'hex\').slice(0, 64);\
  \
  await this.db.query(\
  \`INSERT INTO audit_log(audit_id, actor_user_id, target_user_id,
  action, resource_id, ip, ua_hash, delta_summary)\
  VALUES(\$1,\$2,\$3,\$4,\$5,\$6,\$7,\$8)\`,\
  \[randomUUID(), actor, targetUserId, action, resourceId \|\| null,
  ip.split(\',\')\[0\] \|\| null, uaHash, (deltaSummary \|\|
  \'\').slice(0,512)\]\
  );\
  }\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Usage (example in a controller after success)**

  -----------------------------------------------------------------------
  // language: typescript\
  await this.audit.log(req, \'skills.added\', userId, newSkill.id,
  \`value_norm=\${newSkill.value_norm}\`);
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

> **Do not** include full HTML bodies, raw rate amounts, or portfolio
> URL query strings in delta_summary. Prefer short, non-sensitive
> identifiers or lengths, e.g., about.len=234.

## **7) Data Retention & Deletion**

- **Primary entities:** retained until user deletes (soft-delete) or
  account removal policies apply.

- **Soft-delete:** immediate removal from reads; recoverable until
  hard-delete job runs.

- **Audit logs:** retain **180 days** minimum (configurable
  AUDIT_RETENTION_DAYS). Hard-delete beyond retention.

**Retention job (SQL outline)**

  -----------------------------------------------------------------------
  \-- language: sql\
  DELETE FROM audit_log\
  WHERE occurred_at \< (now() - make_interval(days =\>
  :AUDIT_RETENTION_DAYS));
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Service-side scheduled task (optional lightweight cron)**

  -----------------------------------------------------------------------
  // language: typescript\
  // apps/user-service/src/ops/retention.job.ts\
  import { Injectable } from \'@nestjs/common\';\
  import { DataSource } from \'typeorm\';\
  \
  \@Injectable()\
  export class RetentionJob {\
  constructor(private readonly db: DataSource) {}\
  async runOnce(days: number) {\
  await this.db.query(\`DELETE FROM audit_log WHERE occurred_at \<
  (now() - make_interval(days =\> \$1))\`, \[days\]);\
  }\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

> Schedule via platform cron/ops (do not create in-app infinite loops).

## **8) Secrets & Config**

- Secrets (DB creds, JWT public keys if ever needed locally) are
  **env-injected** by the platform; never committed.

- No third-party keys this sprint (no events/search, no storage).

- Recommended environment toggles:

  - AUDIT_ENABLED=true

  - AUDIT_RETENTION_DAYS=180

## **9) Logging & Observability**

- **Application logs:** info-level for start/stop; warn/error for
  failures; **do not log** request bodies for profile endpoints.

- **Audit logs:** use the table above for security events; keep app logs
  free from PII.

- **Correlation:** respect gateway x-request-id header (if provided) and
  forward it in logs for traceability.

**Example log context**

  -----------------------------------------------------------------------
  // language: typescript\
  this.logger.log({ msg: \'experience.updated\', userId, id, reqId:
  req.headers\[\'x-request-id\'\] });
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **10) Denial-of-Service & Abuse Guards**

- **Body size caps:** JSON 128kb, urlencoded 64kb (Doc 05).

- **Pagination caps:** pageSize \<= 100.

- **Server-side debouncing:** none; endpoints are O(1)/O(n page) and
  idempotent.

- **Rate limiting:** assumed at API Gateway (outside this service).

## **11) Security Tests (Minimum)**

- **AuthN/Z:\**

  - Missing/invalid token ⇒ 401/403 (per gateway); non-owner ⇒
    FORBIDDEN_NOT_OWNER.

  - Admin role can access any :userId.

- **Input hardening:\**

  - POST non-JSON ⇒ 415 with VALIDATION_ERROR.

  - HTML with \<script\> sanitized ⇒ stored safe; about becomes blank ⇒
    rejected.

- **URL & money validation:\**

  - Portfolio ftp: rejected; tracking params removed; duplicates
    conflict.

  - amount bad format/≤0 rejected; currency non-ISO rejected.

- **Audit:\**

  - Each mutation writes exactly one row to audit_log.

  - delta_summary limited to 512 chars and redacted (no HTML/amounts).

- **Retention:\**

  - Seed old audit rows; run job; verify only older-than-retention
    removed.

## **12) Out of Scope (Explicit)**

- No file uploads or image processing.

- No external eventing/search integrations.

- No per-field encryption at rest beyond DB/storage defaults (not
  required for this dataset in this sprint).

- No SSO flows inside this service (delegated to gateway).
