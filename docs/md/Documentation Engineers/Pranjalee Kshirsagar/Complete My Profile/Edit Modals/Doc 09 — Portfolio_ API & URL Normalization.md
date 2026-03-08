# **Portfolio: API & URL Normalization**

**Project:** Complete My Profile --- **Edit Modals** (Backend)\
**Module:** apps/user-service/src/modules/portfolio\
**DB Table:** portfolio_item (see Doc 03)\
**Scope:** Backend only. Add/List/Update/Delete **Portfolio** links.
Enforce **HTTP/HTTPS** URLs and **per-user de-dupe** via a normalized
URL.

## **1) Endpoints (v1)**

  -----------------------------------------------------------------------
  GET /v1/users/:userId/profile/portfolio? page& pageSize& q\
  POST /v1/users/:userId/profile/portfolio\
  PATCH /v1/users/:userId/profile/portfolio/:id\
  DELETE /v1/users/:userId/profile/portfolio/:id\
  GET /v1/users/:userId/profile/portfolio/:id
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

- **AuthN/Z:** owner-only (token subject must equal :userId; admin
  override if applicable).

- **Soft delete:** deleted_at (list excludes soft-deleted).

- **Search:** optional q filters by title/description substring
  (case-insensitive).

## **2) Data Model (client-facing)**

  -----------------------------------------------------------------------
  {\
  \"id\": \"uuid\",\
  \"userId\": \"uuid\",\
  \"title\": \"string\",\
  \"description\": \"string\|null\",\
  \"url\": \"string\", // what client submitted (normalized form echoed)\
  \"createdAt\": \"ISO\",\
  \"updatedAt\": \"ISO\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **3) Request / Response Contracts**

### **3.1 Create**

**Request (HTTP)**

  -----------------------------------------------------------------------
  POST /v1/users/9f\.../profile/portfolio\
  Content-Type: application/json\
  Authorization: Bearer \<JWT\>
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Body (JSON)**

  -----------------------------------------------------------------------
  {\
  \"title\": \"Case Study \-- Marketplace\",\
  \"description\": \"Feature flags, A/B infra, dashboards.\",\
  \"url\": \"https://Example.com:443/case-study?utm_source=li#overview\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Success (JSON)**

  -----------------------------------------------------------------------
  {\
  \"data\": {\
  \"id\": \"b8c8f0a5-17a5-4d5c-8e0d-0b8b5d2ff0a1\",\
  \"userId\": \"9f\...\",\
  \"title\": \"Case Study \-- Marketplace\",\
  \"description\": \"Feature flags, A/B infra, dashboards.\",\
  \"url\": \"https://example.com/case-study\", // normalized\
  \"createdAt\": \"2025-10-27T17:40:00.000Z\",\
  \"updatedAt\": \"2025-10-27T17:40:00.000Z\"\
  }\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Errors (JSON)**

  -----------------------------------------------------------------------
  { \"code\": \"VALIDATION_ERROR\", \"message\": \"One or more fields are
  invalid.\", \"details\": \[{ \"field\": \"url\", \"reason\":
  \"PROTOCOL\" }\] }\
  \
  { \"code\": \"CONFLICT_DUPLICATE\", \"message\": \"URL already
  exists.\", \"details\": \[{ \"field\": \"url\", \"reason\":
  \"DUPLICATE\" }\] }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **3.2 Update (partial)**

  -----------------------------------------------------------------------
  PATCH /v1/users/9f\.../profile/portfolio/a1\...\
  Authorization: Bearer \<JWT\>
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Body (JSON)**

  -----------------------------------------------------------------------
  {\
  \"title\": \"New Title\",\
  \"description\": null,\
  \"url\": \"http://example.com/case-study\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Success (JSON)**

  -----------------------------------------------------------------------
  { \"data\": { /\* Portfolio object \*/ } }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **3.3 List**

  -----------------------------------------------------------------------
  GET /v1/users/9f\.../profile/portfolio?page=1&pageSize=20&q=market\
  Authorization: Bearer \<JWT\>
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Success (JSON)**

  -----------------------------------------------------------------------
  {\
  \"data\": \[ /\* Portfolio objects \*/ \],\
  \"meta\": { \"page\": 1, \"pageSize\": 20, \"total\": 1 }\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **3.4 Get One**

  -----------------------------------------------------------------------
  GET /v1/users/9f\.../profile/portfolio/a1\...\
  Authorization: Bearer \<JWT\>
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Success (JSON)**

  -----------------------------------------------------------------------
  { \"data\": { /\* Portfolio object \*/ } }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **3.5 Delete (soft)**

  -----------------------------------------------------------------------
  DELETE /v1/users/9f\.../profile/portfolio/a1\...\
  Authorization: Bearer \<JWT\>
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Success (JSON)**

  -----------------------------------------------------------------------
  { \"data\": null }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **4) Validation & URL Normalization**

- **Required on create:** title, url.

- **Optional:** description (≤ 2000 chars; store as plain text).

- **Lengths:** title ≤ 200.

- **URL rules:\**

  - Must parse via new URL(\...) without error.

  - **Protocol**: only http: or https:.

  - **Normalize** to derive url_normalized (used for uniqueness):

    - lowercase **hostname**,

    - force protocol to http/https as provided (don't auto-upgrade),

    - **strip default ports** (:80 for http, :443 for https),

    - **remove fragment** (#\...),

    - **drop tracking params** (utm\_\*, fbclid, gclid, igshid, etc.),

    - **preserve** other query params in original order,

    - ensure path has no trailing slash changes except root → /,

    - decode/encode to a stable form (encodeURI-style).

  - **De-dupe per user** by (user_id, url_normalized) (unique index; see
    Doc 03).

  - Persist both:

    - url_raw: what the user submitted after basic trim,

    - url_normalized: canonical form for uniqueness.

Normalization helper:

  -----------------------------------------------------------------------------------------------------------------------------------
  // language: typescript\
  // apps/user-service/src/common/utils/url-normalize.ts\
  const TRACKING_PARAMS = new
  Set(\[\'utm_source\',\'utm_medium\',\'utm_campaign\',\'utm_term\',\'utm_content\',\'utm_id\',\'fbclid\',\'gclid\',\'igshid\'\]);\
  \
  export function normalizePortfolioUrl(input: string): { ok: boolean; reason?: string; raw?: string; normalized?: string } {\
  const raw = (input ?? \'\').trim();\
  let u: URL;\
  try { u = new URL(raw); } catch { return { ok: false, reason: \'PARSE\' }; }\
  const proto = u.protocol.toLowerCase();\
  if (proto !== \'http:\' && proto !== \'https:\') return { ok: false, reason: \'PROTOCOL\' };\
  \
  // hostname lowercased\
  u.hostname = u.hostname.toLowerCase();\
  \
  // strip default ports\
  if ((proto === \'http:\' && u.port === \'80\') \|\| (proto === \'https:\' && u.port === \'443\')) {\
  u.port = \'\';\
  }\
  \
  // remove fragment\
  u.hash = \'\';\
  \
  // prune tracking params\
  for (const k of Array.from(u.searchParams.keys())) {\
  if (TRACKING_PARAMS.has(k)) u.searchParams.delete(k);\
  }\
  \
  // stabilize empty query\
  const query = u.searchParams.toString();\
  const path = u.pathname \|\| \'/\';\
  \
  const normalized = \`\${proto}//\${u.host}\${path}\${query ? \`?\${query}\` : \'\'}\`;\
  return { ok: true, raw, normalized };\
  }
  -----------------------------------------------------------------------------------------------------------------------------------

  -----------------------------------------------------------------------------------------------------------------------------------

## **5) DTOs**

  -----------------------------------------------------------------------
  // language: typescript\
  // apps/user-service/src/modules/portfolio/dto/create-portfolio.dto.ts\
  import { IsString, MaxLength, IsOptional } from \'class-validator\';\
  \
  export class CreatePortfolioDto {\
  \@IsString() \@MaxLength(200)\
  title!: string;\
  \
  \@IsOptional() \@IsString() \@MaxLength(2000)\
  description?: string \| null;\
  \
  \@IsString()\
  url!: string;\
  }\
  \
  // language: typescript\
  // apps/user-service/src/modules/portfolio/dto/update-portfolio.dto.ts\
  import { IsString, MaxLength, IsOptional } from \'class-validator\';\
  \
  export class UpdatePortfolioDto {\
  \@IsOptional() \@IsString() \@MaxLength(200)\
  title?: string;\
  \
  \@IsOptional() \@IsString() \@MaxLength(2000)\
  description?: string \| null;\
  \
  \@IsOptional() \@IsString()\
  url?: string;\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **6) Controller**

  -----------------------------------------------------------------------
  // language: typescript\
  // apps/user-service/src/modules/portfolio/portfolio.controller.ts\
  import { Controller, Get, Post, Patch, Delete, Param, Body, Query,
  UseGuards } from \'@nestjs/common\';\
  import { PortfolioService } from \'./portfolio.service\';\
  import { CreatePortfolioDto } from \'./dto/create-portfolio.dto\';\
  import { UpdatePortfolioDto } from \'./dto/update-portfolio.dto\';\
  import { OwnerGuard } from \'@/common/guards/owner.guard\';\
  \
  \@Controller(\'/v1/users/:userId/profile/portfolio\')\
  \@UseGuards(OwnerGuard)\
  export class PortfolioController {\
  constructor(private readonly svc: PortfolioService) {}\
  \
  \@Post()\
  async create(@Param(\'userId\') userId: string, \@Body() dto:
  CreatePortfolioDto) {\
  const data = await this.svc.create(userId, dto);\
  return { data };\
  }\
  \
  \@Patch(\':id\')\
  async update(@Param(\'userId\') userId: string, \@Param(\'id\') id:
  string, \@Body() dto: UpdatePortfolioDto) {\
  const data = await this.svc.update(userId, id, dto);\
  return { data };\
  }\
  \
  \@Get()\
  async list(\
  \@Param(\'userId\') userId: string,\
  \@Query(\'page\') page = \'1\',\
  \@Query(\'pageSize\') pageSize = \'20\',\
  \@Query(\'q\') q?: string\
  ) {\
  return this.svc.list(userId, { page: +page \|\| 1, pageSize: +pageSize
  \|\| 20, q });\
  }\
  \
  \@Get(\':id\')\
  async getOne(@Param(\'userId\') userId: string, \@Param(\'id\') id:
  string) {\
  const data = await this.svc.getOne(userId, id);\
  return { data };\
  }\
  \
  \@Delete(\':id\')\
  async remove(@Param(\'userId\') userId: string, \@Param(\'id\') id:
  string) {\
  await this.svc.softDelete(userId, id);\
  return { data: null };\
  }\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **7) Service (normalization, de-dupe, soft delete)**

  -----------------------------------------------------------------------
  // language: typescript\
  // apps/user-service/src/modules/portfolio/portfolio.service.ts\
  import { Injectable, BadRequestException, ConflictException,
  NotFoundException } from \'@nestjs/common\';\
  import { InjectRepository } from \'@nestjs/typeorm\';\
  import { Repository, Brackets } from \'typeorm\';\
  import { PortfolioItemEntity } from
  \'@/database/entities/portfolio-item.entity\';\
  import { CreatePortfolioDto } from \'./dto/create-portfolio.dto\';\
  import { UpdatePortfolioDto } from \'./dto/update-portfolio.dto\';\
  import { normalizePortfolioUrl } from
  \'@/common/utils/url-normalize\';\
  \
  type ListOpts = { page: number; pageSize: number; q?: string };\
  \
  \@Injectable()\
  export class PortfolioService {\
  constructor(@InjectRepository(PortfolioItemEntity) private readonly
  repo: Repository\<PortfolioItemEntity\>) {}\
  \
  private toDto(r: PortfolioItemEntity) {\
  return {\
  id: r.id,\
  userId: r.user_id,\
  title: r.title,\
  description: r.description ?? null,\
  url: r.url_normalized \|\| r.url_raw,\
  createdAt: r.created_at?.toISOString(),\
  updatedAt: r.updated_at?.toISOString()\
  };\
  }\
  \
  async create(userId: string, dto: CreatePortfolioDto) {\
  const title = (dto.title ?? \'\').trim();\
  if (!title) {\
  throw new BadRequestException({\
  code: \'VALIDATION_ERROR\', message: \'One or more fields are
  invalid.\',\
  details: \[{ field: \'title\', reason: \'EMPTY\' }\]\
  });\
  }\
  if (title.length \> 200) {\
  throw new BadRequestException({\
  code: \'VALIDATION_ERROR\', message: \'One or more fields are
  invalid.\',\
  details: \[{ field: \'title\', reason: \'MAX_LENGTH\' }\]\
  });\
  }\
  \
  const norm = normalizePortfolioUrl(dto.url);\
  if (!norm.ok) {\
  throw new BadRequestException({\
  code: \'VALIDATION_ERROR\', message: \'One or more fields are
  invalid.\',\
  details: \[{ field: \'url\', reason: norm.reason }\]\
  });\
  }\
  \
  const row = this.repo.create({\
  user_id: userId,\
  title,\
  description: dto.description?.trim() \|\| null,\
  url_raw: norm.raw!,\
  url_normalized: norm.normalized!\
  });\
  \
  try {\
  const saved = await this.repo.save(row);\
  return this.toDto(saved);\
  } catch (e: any) {\
  const msg = String(e?.message \|\| \'\');\
  if (msg.includes(\'ux_portfolio_user_url\') \|\|
  msg.includes(\'duplicate key\')) {\
  throw new ConflictException({\
  code: \'CONFLICT_DUPLICATE\', message: \'URL already exists.\',\
  details: \[{ field: \'url\', reason: \'DUPLICATE\' }\]\
  });\
  }\
  throw e;\
  }\
  }\
  \
  async update(userId: string, id: string, dto: UpdatePortfolioDto) {\
  const rec = await this.repo.findOne({ where: { id, user_id: userId,
  deleted_at: null } });\
  if (!rec) throw new NotFoundException({ code: \'NOT_FOUND\', message:
  \'Portfolio item not found.\', details: \[\] });\
  \
  if (dto.title !== undefined) {\
  const title = (dto.title ?? \'\').trim();\
  if (!title) throw new BadRequestException({ code: \'VALIDATION_ERROR\',
  message: \'One or more fields are invalid.\', details: \[{ field:
  \'title\', reason: \'EMPTY\' }\] });\
  if (title.length \> 200) throw new BadRequestException({ code:
  \'VALIDATION_ERROR\', message: \'One or more fields are invalid.\',
  details: \[{ field: \'title\', reason: \'MAX_LENGTH\' }\] });\
  rec.title = title;\
  }\
  \
  if (dto.description !== undefined) {\
  rec.description = dto.description?.trim() \|\| null;\
  }\
  \
  if (dto.url !== undefined) {\
  const norm = normalizePortfolioUrl(dto.url);\
  if (!norm.ok) {\
  throw new BadRequestException({\
  code: \'VALIDATION_ERROR\', message: \'One or more fields are
  invalid.\',\
  details: \[{ field: \'url\', reason: norm.reason }\]\
  });\
  }\
  rec.url_raw = norm.raw!;\
  rec.url_normalized = norm.normalized!;\
  }\
  \
  try {\
  const saved = await this.repo.save(rec);\
  return this.toDto(saved);\
  } catch (e: any) {\
  const msg = String(e?.message \|\| \'\');\
  if (msg.includes(\'ux_portfolio_user_url\') \|\|
  msg.includes(\'duplicate key\')) {\
  throw new ConflictException({\
  code: \'CONFLICT_DUPLICATE\', message: \'URL already exists.\',\
  details: \[{ field: \'url\', reason: \'DUPLICATE\' }\]\
  });\
  }\
  throw e;\
  }\
  }\
  \
  async list(userId: string, { page, pageSize, q }: ListOpts) {\
  const take = Math.min(Math.max(pageSize, 1), 100);\
  const skip = (Math.max(page, 1) - 1) \* take;\
  \
  const qb = this.repo.createQueryBuilder(\'p\')\
  .where(\'p.user_id = :userId\', { userId })\
  .andWhere(\'p.deleted_at IS NULL\');\
  \
  if (q && q.trim()) {\
  const needle = \`%\${q.trim().toLowerCase()}%\`;\
  qb.andWhere(new Brackets(b =\> {\
  b.where(\'LOWER(p.title) LIKE :needle\', { needle })\
  .orWhere(\'LOWER(p.description) LIKE :needle\', { needle });\
  }));\
  }\
  \
  qb.orderBy(\'p.created_at\', \'DESC\').take(take).skip(skip);\
  \
  const \[rows, total\] = await qb.getManyAndCount();\
  return {\
  data: rows.map((r) =\> this.toDto(r)),\
  meta: { page: Math.max(page, 1), pageSize: take, total }\
  };\
  }\
  \
  async getOne(userId: string, id: string) {\
  const rec = await this.repo.findOne({ where: { id, user_id: userId,
  deleted_at: null } });\
  if (!rec) throw new NotFoundException({ code: \'NOT_FOUND\', message:
  \'Portfolio item not found.\', details: \[\] });\
  return this.toDto(rec);\
  }\
  \
  async softDelete(userId: string, id: string) {\
  const rec = await this.repo.findOne({ where: { id, user_id: userId,
  deleted_at: null } });\
  if (!rec) throw new NotFoundException({ code: \'NOT_FOUND\', message:
  \'Portfolio item not found.\', details: \[\] });\
  rec.deleted_at = new Date();\
  await this.repo.save(rec);\
  }\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **8) Entity (reference)**

  -----------------------------------------------------------------------
  // language: typescript\
  // apps/user-service/src/database/entities/portfolio-item.entity.ts\
  import { Column, Entity, PrimaryGeneratedColumn, Index,
  UpdateDateColumn, CreateDateColumn } from \'typeorm\';\
  \
  \@Index(\'ux_portfolio_user_url\', \[\'user_id\', \'url_normalized\'\],
  { unique: true, where: \'deleted_at IS NULL\' })\
  \@Entity({ name: \'portfolio_item\' })\
  export class PortfolioItemEntity {\
  \@PrimaryGeneratedColumn(\'uuid\')\
  id!: string;\
  \
  \@Column(\'uuid\')\
  user_id!: string;\
  \
  \@Column({ type: \'varchar\', length: 200 })\
  title!: string;\
  \
  \@Column({ type: \'varchar\', length: 2000, nullable: true })\
  description!: string \| null;\
  \
  \@Column({ type: \'varchar\', length: 2048 })\
  url_raw!: string;\
  \
  \@Column({ type: \'varchar\', length: 2048 })\
  url_normalized!: string;\
  \
  \@CreateDateColumn({ type: \'timestamptz\' })\
  created_at!: Date;\
  \
  \@UpdateDateColumn({ type: \'timestamptz\' })\
  updated_at!: Date;\
  \
  \@Column({ type: \'timestamptz\', nullable: true })\
  deleted_at!: Date \| null;\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **9) Error Model (standardized)**

- VALIDATION_ERROR --- empty/too long title, invalid URL/protocol.

- CONFLICT_DUPLICATE --- same normalized URL already exists for the
  user.

- FORBIDDEN_NOT_OWNER --- :userId ≠ token subject.

- NOT_FOUND --- id not found (or soft-deleted) for owner.

- UNKNOWN --- unexpected failures.

**Envelope (JSON)**

  -----------------------------------------------------------------------
  {\
  \"code\": \"VALIDATION_ERROR\",\
  \"message\": \"One or more fields are invalid.\",\
  \"details\": \[{ \"field\": \"url\", \"reason\": \"PROTOCOL\" }\]\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **10) Tests (minimum)**

**Unit**

- Normalization:

  - https://Example.com:443/p?a=1&utm_source=x#frag →
    https://example.com/p?a=1

  - http://example.com:80/ → http://example.com/

  - Reject ftp: / data: / javascript:.

- Title rules: empty/length overflow.

**Integration**

- Create → success; second create with different tracking params →
  CONFLICT_DUPLICATE.

- Update URL → normalized & de-duped; Update title/description.

- List with q filters title/description; pagination stable.

- Soft delete → hidden from list; re-adding same URL after delete
  succeeds.

**Contract/E2E**

- Owner-only writes; invalid IDs ⇒ NOT_FOUND.

## **11) Performance**

- Single-row CRUD; unique index on (user_id, url_normalized) protects
  de-dupe.

- List uses paginated query; basic LIKE filters on lowered columns scale
  adequately for profile scope.
