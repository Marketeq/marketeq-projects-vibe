# **Shared Concerns: AuthZ, Idempotency, Errors, Pagination**

**Project:** Complete My Profile --- **Edit Modals** (Backend)\
**Service:** apps/user-service (expand existing user service)\
**Scope:** Cross-cutting standards reused by **About, Skills,
Experience, Education, Rates, Portfolio, Progress**.\
**Note (merged Doc 07):** This sprint accepts **JSON only**; **no file
uploads**. Profile image/editing is **out of scope**.

## **1) Authorization (AuthZ): Owner-only + Admin Override**

**Rule:** All profile-edit endpoints are **owner-only**; the :userId in
the path must equal the subject in the access token. An **admin** (if
your gateway attaches a role/claim) may override.

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
  const tokenUserId = req.user?.sub; // set by upstream auth middleware\
  const pathUserId = req.params?.userId;\
  \
  // Admin override (optional - honor your central RBAC)\
  const isAdmin = Array.isArray(req.user?.roles) &&
  req.user.roles.includes(\'admin\');\
  \
  const allowed = isAdmin \|\| (tokenUserId && pathUserId && tokenUserId
  === pathUserId);\
  if (!allowed) {\
  throw new ForbiddenException({\
  code: \'FORBIDDEN_NOT_OWNER\',\
  message: \'Forbidden.\',\
  details: \[\]\
  });\
  }\
  return true;\
  }\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

Attach to controllers:

  -----------------------------------------------------------------------
  // language: typescript\
  // \@UseGuards(OwnerGuard) on all /v1/users/:userId/\... controllers
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **2) Idempotency & Safe Replays**

**Goal:** Clients can safely retry without duplicating state. Prefer
**DB-backed idempotency** using natural keys & unique constraints.

**Patterns used:**

- **Upsert by natural key\**

  - About Me: PK = user_id → INSERT \... ON CONFLICT (user_id) DO UPDATE
    \....

  - Skills: unique (user_id, value_norm).

  - Rates: unique (user_id, title_norm); single primary guarded by
    service + index.

  - Portfolio: unique (user_id, url_normalized).

- **Safe DELETE\**

  - Soft-delete (deleted_at) or "clear section" → { data: null }. Repeat
    delete is safe (module rules apply).

- **Conflict mapping\**

  - Map DB unique violations to CONFLICT_DUPLICATE with
    details\[\].field.

Example --- Upsert (About Me):

  -----------------------------------------------------------------------
  // language: typescript\
  // apps/user-service/src/modules/about/about.service.ts (excerpt)\
  await this.repo\
  .createQueryBuilder()\
  .insert()\
  .into(AboutMeEntity)\
  .values({ user_id: userId, content_html: sanitized })\
  .onConflict(\'(user_id) DO UPDATE SET content_html =
  EXCLUDED.content_html\')\
  .execute();
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

Example --- Safe "Create with unique constraint":

  -----------------------------------------------------------------------
  // language: typescript\
  // apps/user-service/src/modules/skills/skills.service.ts (excerpt)\
  try {\
  const saved = await this.repo.save({ user_id: userId, value_raw: raw,
  value_norm: norm });\
  return this.toDto(saved);\
  } catch (e: any) {\
  const msg = String(e?.message \|\| \'\');\
  if (msg.includes(\'ux_user_skill_user_norm\') \|\|
  msg.includes(\'duplicate key\')) {\
  throw new ConflictException({\
  code: \'CONFLICT_DUPLICATE\',\
  message: \'Skill already exists.\',\
  details: \[{ field: \'value\', reason: \'DUPLICATE\' }\]\
  });\
  }\
  throw e;\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **3) Error Handling: Standard Envelope & Filters**

**Envelope (all 4xx/5xx):**

  -----------------------------------------------------------------------
  {\
  \"code\": \"VALIDATION_ERROR\",\
  \"message\": \"One or more fields are invalid.\",\
  \"details\": \[{ \"field\": \"amount\", \"reason\": \"FORMAT\" }\]\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Canonical codes:**

- VALIDATION_ERROR --- malformed input, date/order/length breaches,
  format checks

- CONFLICT_DUPLICATE --- unique constraint violations

- FORBIDDEN_NOT_OWNER --- owner guard failure

- NOT_FOUND --- resource not found (or soft-deleted)

- UNKNOWN --- unclassified server errors

NestJS exception filter:

  -----------------------------------------------------------------------
  // language: typescript\
  // apps/user-service/src/common/filters/http-exception.filter.ts\
  import { ArgumentsHost, Catch, ExceptionFilter, HttpException,
  HttpStatus } from \'@nestjs/common\';\
  \
  \@Catch()\
  export class HttpErrorFilter implements ExceptionFilter {\
  catch(error: any, host: ArgumentsHost) {\
  const ctx = host.switchToHttp();\
  const res = ctx.getResponse();\
  \
  if (error instanceof HttpException) {\
  const status = error.getStatus();\
  const payload: any = error.getResponse?.() \|\| {};\
  const body = {\
  code: payload.code \|\| this.mapStatusToCode(status),\
  message: payload.message \|\| error.message \|\| \'Error\',\
  details: payload.details \|\| \[\]\
  };\
  return res.status(status).json(body);\
  }\
  \
  return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({\
  code: \'UNKNOWN\',\
  message: \'Unexpected error.\',\
  details: \[\]\
  });\
  }\
  \
  private mapStatusToCode(status: number): string {\
  if (status === 400) return \'VALIDATION_ERROR\';\
  if (status === 403) return \'FORBIDDEN_NOT_OWNER\';\
  if (status === 404) return \'NOT_FOUND\';\
  if (status === 409) return \'CONFLICT_DUPLICATE\';\
  return \'UNKNOWN\';\
  }\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

Bind the filter at module/bootstrap per standards.

## **4) Pagination: Query Params & Response Meta**

**Query params:**

- page (default 1, min 1)

- pageSize (default 20, min 1, **max 100**)

Controller pattern:

  -----------------------------------------------------------------------
  // language: typescript\
  \@Get()\
  async list(@Query(\'page\') page = \'1\', \@Query(\'pageSize\')
  pageSize = \'20\') {\
  return this.svc.list(userId, { page: +page \|\| 1, pageSize: +pageSize
  \|\| 20 });\
  }\
  \
  Service helper:\
  // language: typescript\
  // apps/user-service/src/common/pagination.ts\
  export function clampPagination(pageRaw: number, sizeRaw: number) {\
  const page = Math.max(1, Number.isFinite(pageRaw) ? Math.trunc(pageRaw)
  : 1);\
  const pageSize = Math.min(100, Math.max(1, Number.isFinite(sizeRaw) ?
  Math.trunc(sizeRaw) : 20));\
  const take = pageSize;\
  const skip = (page - 1) \* take;\
  return { page, pageSize, take, skip };\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

Response shape:

  -----------------------------------------------------------------------
  {\
  \"data\": \[ /\* items \*/ \],\
  \"meta\": { \"page\": 1, \"pageSize\": 20, \"total\": 3 }\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

Example list:

// language: typescript\
// apps/user-service/src/modules/portfolio/portfolio.service.ts
(excerpt)\
const { page, pageSize, take, skip } = clampPagination(opts.page,
opts.pageSize);\
const \[rows, total\] = await
qb.take(take).skip(skip).getManyAndCount();\
return { data: rows.map((r) =\> this.toDto(r)), meta: { page, pageSize,
total } };

## **5) Validation Consistency (DTO + Narrow Pipes)**

- Use **class-validator DTOs** for type/length/date checks.

- Normalize inputs (trim/collapse whitespace) in services before
  persistence.

- Prefer **rejecting unknown fields** to keep contracts strict.

  -----------------------------------------------------------------------
  // language: typescript\
  // apps/user-service/src/main.ts (excerpt)\
  import { ValidationPipe } from \'@nestjs/common\';\
  \
  app.useGlobalPipes(new ValidationPipe({\
  whitelist: true, // strip unknown fields\
  forbidNonWhitelisted: true, // or set to false if you prefer to ignore
  silently\
  transform: true\
  }));
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **5.1) No File Uploads (merged Doc 07)**

**Policy (this sprint):**

- **Inbound files:** **Not accepted**. No multipart/form-data, no
  binary/base64 fields.

- **Accepted content type:** application/json; charset=utf-8.

- **Profile image/editing:** **Out of scope**.

- **Portfolio:** **URLs only** (Doc 04F). No fetching/scraping of remote
  content.

**Middleware to reject non-JSON:**

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
  if (req.method === \'POST\' \|\| req.method === \'PATCH\') {\
  if (!ct.startsWith(\'application/json\')) {\
  throw new UnsupportedMediaTypeException({\
  code: \'VALIDATION_ERROR\',\
  message: \'Only application/json is supported.\',\
  details: \[{ field: \'content-type\', reason: \'UNSUPPORTED\' }\]\
  });\
  }\
  }\
  next();\
  }\
  }
  ------------------------------------------------------------------------

  ------------------------------------------------------------------------

Register and set body limits:

  -----------------------------------------------------------------------
  // language: typescript\
  // apps/user-service/src/main.ts (excerpt)\
  import \* as bodyParser from \'body-parser\';\
  import { RejectNonJsonMiddleware } from
  \'@/common/middleware/reject-non-json.middleware\';\
  \
  app.use(bodyParser.json({ limit: \'128kb\' }));\
  app.use(bodyParser.urlencoded({ extended: false, limit: \'64kb\' }));\
  app.use(\'/v1/users\', new RejectNonJsonMiddleware().use);
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

Error example:

  -----------------------------------------------------------------------
  {\
  \"code\": \"VALIDATION_ERROR\",\
  \"message\": \"Only application/json is supported.\",\
  \"details\": \[{ \"field\": \"content-type\", \"reason\":
  \"UNSUPPORTED\" }\]\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **6) Ordering, Soft-Delete, and Get-by-ID**

**Ordering**

- Experience/Education: start_date DESC, created_at DESC

- Skills/Portfolio: created_at DESC

- Rates: is_primary DESC, created_at DESC

**Soft-delete**

- Use deleted_at; lists must filter deleted_at IS NULL.

- Get-by-ID excludes soft-deleted → return NOT_FOUND.

  -----------------------------------------------------------------------
  // language: typescript\
  // typical soft delete\
  rec.deleted_at = new Date();\
  await this.repo.save(rec);
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **7) Consistent Versioning & Paths**

- Prefix everything with /v1/.

- Module paths:

  - /v1/users/:userId/profile/about

  - /v1/users/:userId/profile/skills

  - /v1/users/:userId/profile/experience

  - /v1/users/:userId/profile/education

  - /v1/users/:userId/profile/rates

  - /v1/users/:userId/profile/portfolio

  - /v1/users/:userId/profile/progress

## **8) Minimal SQL/DB Guidance**

- Unique constraints are the idempotency backbone; always catch & map
  conflicts.

- Check constraints (e.g., amount \> 0, end_date \>= start_date) live in
  DB **and** DTOs for parity.

- Indexes support list ordering/query filters as defined in **Doc 03**.

## **9) Testing Matrix (Shared)**

- **AuthZ:** owner vs non-owner; admin override.

- **Idempotency:** repeated POST/DELETE doesn't duplicate; duplicates →
  CONFLICT_DUPLICATE.

- **Errors:** standardized envelope + correct code.

- **Pagination:** boundaries (page \< 1, pageSize \> 100), totals,
  deterministic ordering.

- **No-files:** POST/PATCH with multipart/form-data ⇒ 415 mapped to our
  envelope.

## **10) Performance Targets**

- Owner-guard check is O(1).

- Lists: single paginated SELECT.

- Writes: one INSERT (with conflict) or one UPDATE.

- Target p95: **\< 300 ms** on warm DB.
