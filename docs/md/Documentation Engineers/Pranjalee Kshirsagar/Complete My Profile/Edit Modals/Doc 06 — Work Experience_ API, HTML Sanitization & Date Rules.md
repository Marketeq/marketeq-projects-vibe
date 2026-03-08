# **Work Experience: API, HTML Sanitization & Date Rules**

**Project:** Complete My Profile --- **Edit Modals** (Backend)\
**Module:** apps/user-service/src/modules/experience\
**DB Table:** experience (see Doc 03)\
**Scope:** Backend only. Create/Update/Delete **Work Experience** rows;
store **sanitized HTML** for description; enforce date rules.

## **1) Endpoints (v1)**

  -----------------------------------------------------------------------
  GET /v1/users/:userId/profile/experience? page& pageSize\
  POST /v1/users/:userId/profile/experience\
  PATCH /v1/users/:userId/profile/experience/:id\
  DELETE /v1/users/:userId/profile/experience/:id\
  GET /v1/users/:userId/profile/experience/:id
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

- **AuthN/Z:** owner-only (token subject must equal :userId; admin
  override if applicable).

- **Versioning:** /v1/\... per standard.

- **Soft delete:** set deleted_at (list excludes soft-deleted by
  default).

## **2) Data Model (client-facing)**

  -----------------------------------------------------------------------
  {\
  \"id\": \"uuid\",\
  \"userId\": \"uuid\",\
  \"employer\": \"string\",\
  \"title\": \"string\",\
  \"startDate\": \"YYYY-MM-DD\",\
  \"endDate\": \"YYYY-MM-DD \| null\", // null = currently here\
  \"descriptionHtml\": \"sanitized HTML \| null\",\
  \"createdAt\": \"ISO\",\
  \"updatedAt\": \"ISO\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **3) Request / Response Contracts**

### **3.1 Create**

**Request (HTTP)**

  -----------------------------------------------------------------------
  POST /v1/users/9f\.../profile/experience\
  Content-Type: application/json\
  Authorization: Bearer \<JWT\>
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Body (JSON)**

  -----------------------------------------------------------------------
  {\
  \"employer\": \"Acme Corp\",\
  \"title\": \"Senior Developer\",\
  \"startDate\": \"2022-01-01\",\
  \"endDate\": null,\
  \"descriptionHtml\": \"\<p\>Lead developer for marketplace
  features.\</p\>\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Success (JSON)**

  -----------------------------------------------------------------------
  { \"data\": { /\* Experience object as above \*/ } }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Errors (JSON)**

  -----------------------------------------------------------------------
  {\
  \"code\": \"VALIDATION_ERROR\",\
  \"message\": \"One or more fields are invalid.\",\
  \"details\": \[{ \"field\": \"endDate\", \"reason\": \"BEFORE_START\"
  }\]\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **3.2 Update (partial)**

**Request (HTTP)**

  -----------------------------------------------------------------------
  PATCH /v1/users/9f\.../profile/experience/6a\...\
  Content-Type: application/json\
  Authorization: Bearer \<JWT\>
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Body (JSON)**

  -----------------------------------------------------------------------
  {\
  \"title\": \"Staff Developer\",\
  \"endDate\": \"2024-12-31\",\
  \"descriptionHtml\": \"\<p\>Promoted. Led X initiative.\</p\>\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Success (JSON)**

  -----------------------------------------------------------------------
  { \"data\": { /\* Experience object \*/ } }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Errors (JSON)**

  -----------------------------------------------------------------------
  {\
  \"code\": \"NOT_FOUND\",\
  \"message\": \"Experience not found.\",\
  \"details\": \[\]\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **3.3 List**

**Request (HTTP)**

  -----------------------------------------------------------------------
  GET /v1/users/9f\.../profile/experience?page=1&pageSize=20\
  Authorization: Bearer \<JWT\>
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Success (JSON)**

  -----------------------------------------------------------------------
  {\
  \"data\": \[ /\* Experience objects (deleted filtered out) \*/ \],\
  \"meta\": { \"page\": 1, \"pageSize\": 20, \"total\": 3 }\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **3.4 Delete (soft)**

**Request (HTTP)**

  -----------------------------------------------------------------------
  DELETE /v1/users/9f\.../profile/experience/6a\...\
  Authorization: Bearer \<JWT\>
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Success (JSON)**

  -----------------------------------------------------------------------
  { \"data\": null }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **4) Validation & Date Rules**

- **Required on create:** employer, title, startDate.

- **Optional:** endDate (null = "currently here"), descriptionHtml.

- **Lengths:** employer ≤ 200, title ≤ 200.

- **Dates:\**

  - startDate must be a valid **ISO date**.

  - endDate must be **null or valid ISO date ≥ startDate**.

  - (No "future-date" restriction unless your standard requires; not
    enforced here.)

- **Description HTML:\**

  - If provided, sanitize server-side; see §5.

  - Optionally allow empty (null). If provided and sanitization results
    in empty string, convert to **null**.

**Create DTO**

  ------------------------------------------------------------------------
  // language: typescript\
  //
  apps/user-service/src/modules/experience/dto/create-experience.dto.ts\
  import { IsString, MaxLength, IsDateString, IsOptional } from
  \'class-validator\';\
  \
  export class CreateExperienceDto {\
  \@IsString() \@MaxLength(200)\
  employer!: string;\
  \
  \@IsString() \@MaxLength(200)\
  title!: string;\
  \
  \@IsDateString()\
  startDate!: string;\
  \
  \@IsOptional() \@IsDateString()\
  endDate?: string \| null;\
  \
  \@IsOptional() \@IsString()\
  descriptionHtml?: string \| null;\
  }
  ------------------------------------------------------------------------

  ------------------------------------------------------------------------

**Update DTO**

  ------------------------------------------------------------------------
  // language: typescript\
  //
  apps/user-service/src/modules/experience/dto/update-experience.dto.ts\
  import { IsString, MaxLength, IsDateString, IsOptional } from
  \'class-validator\';\
  \
  export class UpdateExperienceDto {\
  \@IsOptional() \@IsString() \@MaxLength(200)\
  employer?: string;\
  \
  \@IsOptional() \@IsString() \@MaxLength(200)\
  title?: string;\
  \
  \@IsOptional() \@IsDateString()\
  startDate?: string;\
  \
  \@IsOptional() \@IsDateString()\
  endDate?: string \| null;\
  \
  \@IsOptional() \@IsString()\
  descriptionHtml?: string \| null;\
  }
  ------------------------------------------------------------------------

  ------------------------------------------------------------------------

## **5) HTML Sanitization (server-side)**

- Store **sanitized HTML**.

- Allow minimal tags/attrs (align with Doc 04A):

  - **Tags:** p, b, strong, i, em, u, s, br, ul, ol, li, blockquote,
    code, pre, a

  - **Attrs:** a\[href\] with safe protocols (http, https, mailto); add
    rel=\"noopener nofollow noreferrer\", optional target=\"\_blank\".

  - Strip script, style, event handlers, javascript:/data: URLs.

- When descriptionHtml is provided:

  - Sanitize → if sanitized string becomes empty after trimming tags and
    entities, set to **null**.

Sanitizer usage contract:

  -----------------------------------------------------------------------
  // language: typescript\
  // apps/user-service/src/common/utils/html-sanitizer.ts\
  export interface HtmlSanitizer {\
  sanitize(input: string): string;\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **6) Controller**

  -----------------------------------------------------------------------
  // language: typescript\
  // apps/user-service/src/modules/experience/experience.controller.ts\
  import { Controller, Get, Post, Patch, Delete, Param, Body, Query,
  UseGuards } from \'@nestjs/common\';\
  import { ExperienceService } from \'./experience.service\';\
  import { CreateExperienceDto } from \'./dto/create-experience.dto\';\
  import { UpdateExperienceDto } from \'./dto/update-experience.dto\';\
  import { OwnerGuard } from \'@/common/guards/owner.guard\';\
  \
  \@Controller(\'/v1/users/:userId/profile/experience\')\
  \@UseGuards(OwnerGuard)\
  export class ExperienceController {\
  constructor(private readonly svc: ExperienceService) {}\
  \
  \@Post()\
  async create(@Param(\'userId\') userId: string, \@Body() dto:
  CreateExperienceDto) {\
  const data = await this.svc.create(userId, dto);\
  return { data };\
  }\
  \
  \@Patch(\':id\')\
  async update(@Param(\'userId\') userId: string, \@Param(\'id\') id:
  string, \@Body() dto: UpdateExperienceDto) {\
  const data = await this.svc.update(userId, id, dto);\
  return { data };\
  }\
  \
  \@Get()\
  async list(@Param(\'userId\') userId: string, \@Query(\'page\') page =
  \'1\', \@Query(\'pageSize\') pageSize = \'20\') {\
  return this.svc.list(userId, { page: +page \|\| 1, pageSize: +pageSize
  \|\| 20 });\
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

## **7) Service (date rules, sanitization, soft delete)**

  -----------------------------------------------------------------------
  // language: typescript\
  // apps/user-service/src/modules/experience/experience.service.ts\
  import { Injectable, BadRequestException, NotFoundException } from
  \'@nestjs/common\';\
  import { InjectRepository } from \'@nestjs/typeorm\';\
  import { Repository } from \'typeorm\';\
  import { ExperienceEntity } from
  \'@/database/entities/experience.entity\';\
  import { CreateExperienceDto } from \'./dto/create-experience.dto\';\
  import { UpdateExperienceDto } from \'./dto/update-experience.dto\';\
  import { HtmlSanitizer } from \'@/common/utils/html-sanitizer\';\
  \
  type ListOpts = { page: number; pageSize: number };\
  \
  function toISO(d?: Date \| null) { return d ? d.toISOString() :
  undefined; }\
  function stripHtmlToText(html: string): string {\
  return html.replace(/\<\[\^\>\]\*\>/g, \'\').replace(/&nbsp;/gi, \'
  \').trim();\
  }\
  function ensureDateOrder(start?: string, end?: string \| null) {\
  if (start && end) {\
  const s = new Date(start); const e = new Date(end);\
  if (Number.isNaN(s.getTime()) \|\| Number.isNaN(e.getTime()) \|\| e \<
  s) {\
  throw new BadRequestException({\
  code: \'VALIDATION_ERROR\',\
  message: \'One or more fields are invalid.\',\
  details: \[{ field: \'endDate\', reason: \'BEFORE_START\' }\]\
  });\
  }\
  }\
  }\
  \
  \@Injectable()\
  export class ExperienceService {\
  constructor(\
  \@InjectRepository(ExperienceEntity) private readonly repo:
  Repository\<ExperienceEntity\>,\
  private readonly sanitizer: HtmlSanitizer\
  ) {}\
  \
  async create(userId: string, dto: CreateExperienceDto) {\
  ensureDateOrder(dto.startDate, dto.endDate ?? null);\
  \
  let descHtml: string \| null = null;\
  if (dto.descriptionHtml != null) {\
  const sanitized = this.sanitizer.sanitize(dto.descriptionHtml);\
  descHtml = stripHtmlToText(sanitized) ? sanitized : null;\
  }\
  \
  const row = this.repo.create({\
  user_id: userId,\
  employer: dto.employer.trim(),\
  title: dto.title.trim(),\
  start_date: dto.startDate,\
  end_date: dto.endDate ?? null,\
  description_html: descHtml\
  });\
  const saved = await this.repo.save(row);\
  return this.toDto(saved);\
  }\
  \
  async update(userId: string, id: string, dto: UpdateExperienceDto) {\
  const rec = await this.repo.findOne({ where: { id, user_id: userId,
  deleted_at: null } });\
  if (!rec) throw new NotFoundException({ code: \'NOT_FOUND\', message:
  \'Experience not found.\', details: \[\] });\
  \
  const start = dto.startDate ?? rec.start_date;\
  const end = (dto.endDate === undefined) ? rec.end_date : dto.endDate;\
  ensureDateOrder(start, end ?? null);\
  \
  if (dto.employer !== undefined) rec.employer = dto.employer.trim();\
  if (dto.title !== undefined) rec.title = dto.title.trim();\
  if (dto.startDate !== undefined) rec.start_date = dto.startDate;\
  if (dto.endDate !== undefined) rec.end_date = dto.endDate ?? null;\
  \
  if (dto.descriptionHtml !== undefined) {\
  if (dto.descriptionHtml === null) {\
  rec.description_html = null;\
  } else {\
  const sanitized = this.sanitizer.sanitize(dto.descriptionHtml);\
  rec.description_html = stripHtmlToText(sanitized) ? sanitized : null;\
  }\
  }\
  \
  const saved = await this.repo.save(rec);\
  return this.toDto(saved);\
  }\
  \
  async list(userId: string, { page, pageSize }: ListOpts) {\
  const take = Math.min(Math.max(pageSize, 1), 100);\
  const skip = (Math.max(page, 1) - 1) \* take;\
  \
  const qb = this.repo.createQueryBuilder(\'e\')\
  .where(\'e.user_id = :userId\', { userId })\
  .andWhere(\'e.deleted_at IS NULL\')\
  .orderBy(\'e.start_date\', \'DESC\')\
  .addOrderBy(\'e.created_at\', \'DESC\')\
  .take(take)\
  .skip(skip);\
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
  \'Experience not found.\', details: \[\] });\
  return this.toDto(rec);\
  }\
  \
  async softDelete(userId: string, id: string) {\
  const rec = await this.repo.findOne({ where: { id, user_id: userId,
  deleted_at: null } });\
  if (!rec) throw new NotFoundException({ code: \'NOT_FOUND\', message:
  \'Experience not found.\', details: \[\] });\
  rec.deleted_at = new Date();\
  await this.repo.save(rec);\
  }\
  \
  private toDto(r: ExperienceEntity) {\
  return {\
  id: r.id,\
  userId: r.user_id,\
  employer: r.employer,\
  title: r.title,\
  startDate: r.start_date,\
  endDate: r.end_date,\
  descriptionHtml: r.description_html ?? null,\
  createdAt: toISO(r.created_at),\
  updatedAt: toISO(r.updated_at)\
  };\
  }\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **8) Entity (reference)**

  -----------------------------------------------------------------------
  // language: typescript\
  // apps/user-service/src/database/entities/experience.entity.ts\
  import { Column, Entity, PrimaryGeneratedColumn, Index,
  UpdateDateColumn, CreateDateColumn } from \'typeorm\';\
  \
  \@Index(\'ix_experience_user_created\', \[\'user_id\',
  \'created_at\'\])\
  \@Entity({ name: \'experience\' })\
  export class ExperienceEntity {\
  \@PrimaryGeneratedColumn(\'uuid\')\
  id!: string;\
  \
  \@Column(\'uuid\')\
  user_id!: string;\
  \
  \@Column({ type: \'varchar\', length: 200 })\
  employer!: string;\
  \
  \@Column({ type: \'varchar\', length: 200 })\
  title!: string;\
  \
  \@Column({ type: \'date\' })\
  start_date!: string;\
  \
  \@Column({ type: \'date\', nullable: true })\
  end_date!: string \| null;\
  \
  \@Column({ type: \'text\', nullable: true })\
  description_html!: string \| null;\
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

- VALIDATION_ERROR --- bad date order, invalid payload.

- NOT_FOUND --- id not found (or soft-deleted) for owner.

- FORBIDDEN_NOT_OWNER --- :userId ≠ token subject.

- UNKNOWN --- unexpected failures.

**Envelope (JSON)**

  -----------------------------------------------------------------------
  {\
  \"code\": \"VALIDATION_ERROR\",\
  \"message\": \"One or more fields are invalid.\",\
  \"details\": \[{ \"field\": \"endDate\", \"reason\": \"BEFORE_START\"
  }\]\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **10) Tests (minimum)**

**Unit**

- endDate before startDate ⇒ VALIDATION_ERROR.

- descriptionHtml with scripts/events is sanitized; empty after
  sanitation ⇒ null.

**Integration**

- Create → row exists; Update title/date; List excludes deleted_at
  items; Delete marks deleted_at and hides from list; GetOne returns 404
  after delete.

**Contract/E2E**

- Owner-only writes; invalid IDs → NOT_FOUND; invalid dates →
  VALIDATION_ERROR.

## **11) Performance**

- Single-row ops; list is paginated with indexed order.

- Target p95 write \< 300ms on warm DB.
