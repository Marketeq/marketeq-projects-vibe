# **Education: API & Date Rules**

**Project:** Complete My Profile --- **Edit Modals** (Backend)\
**Module:** apps/user-service/src/modules/education\
**DB Table:** education (see Doc 03)\
**Scope:** Backend only. Create/Update/Delete **Education** rows;
enforce date rules.

## **1) Endpoints (v1)**

  -----------------------------------------------------------------------
  GET /v1/users/:userId/profile/education? page& pageSize\
  POST /v1/users/:userId/profile/education\
  PATCH /v1/users/:userId/profile/education/:id\
  DELETE /v1/users/:userId/profile/education/:id\
  GET /v1/users/:userId/profile/education/:id
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

- **AuthN/Z:** owner-only (token subject must equal :userId; admin
  override if applicable).

- **Versioning:** /v1/\... per standard.

- **Soft delete:** set deleted_at (lists exclude soft-deleted).

## **2) Data Model (client-facing)**

  -----------------------------------------------------------------------
  {\
  \"id\": \"uuid\",\
  \"userId\": \"uuid\",\
  \"institution\": \"string\",\
  \"degree\": \"string\",\
  \"startDate\": \"YYYY-MM-DD\",\
  \"endDate\": \"YYYY-MM-DD \| null\",\
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
  POST /v1/users/9f\.../profile/education\
  Content-Type: application/json\
  Authorization: Bearer \<JWT\>
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Body (JSON)**

  -----------------------------------------------------------------------
  {\
  \"institution\": \"State University\",\
  \"degree\": \"MS Computer Science\",\
  \"startDate\": \"2021-09-01\",\
  \"endDate\": \"2023-06-15\",\
  \"descriptionHtml\": \"\<p\>Thesis in ML systems.\</p\>\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Success (JSON)**

  -----------------------------------------------------------------------
  { \"data\": { /\* Education object as above \*/ } }
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
  PATCH /v1/users/9f\.../profile/education/ab\...\
  Content-Type: application/json\
  Authorization: Bearer \<JWT\>
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Body (JSON)**

  -----------------------------------------------------------------------
  {\
  \"degree\": \"M.S. Computer Science\",\
  \"endDate\": null,\
  \"descriptionHtml\": \"\<p\>Continuing research assistantship.\</p\>\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Success (JSON)**

  -----------------------------------------------------------------------
  { \"data\": { /\* Education object \*/ } }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Errors (JSON)**

  -----------------------------------------------------------------------
  {\
  \"code\": \"NOT_FOUND\",\
  \"message\": \"Education not found.\",\
  \"details\": \[\]\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **3.3 List**

**Request (HTTP)**

  -----------------------------------------------------------------------
  GET /v1/users/9f\.../profile/education?page=1&pageSize=20\
  Authorization: Bearer \<JWT\>
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Success (JSON)**

  -----------------------------------------------------------------------
  {\
  \"data\": \[ /\* Education objects (deleted filtered out) \*/ \],\
  \"meta\": { \"page\": 1, \"pageSize\": 20, \"total\": 2 }\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **3.4 Delete (soft)**

**Request (HTTP)**

  -----------------------------------------------------------------------
  DELETE /v1/users/9f\.../profile/education/ab\...\
  Authorization: Bearer \<JWT\>
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Success (JSON)**

  -----------------------------------------------------------------------
  { \"data\": null }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **4) Validation & Date Rules**

- **Required on create:** institution, degree, startDate.

- **Optional:** endDate (null allowed), descriptionHtml.

- **Lengths:** institution ≤ 200, degree ≤ 200.

- **Dates:\**

  - startDate must be **valid ISO date**.

  - endDate must be **null or valid ISO date ≥ startDate**.

- **Description HTML (optional):\**

  - Sanitize server-side (same allow-list as Doc 04A).

  - If provided and sanitization results in empty text, set to **null**.

**Create DTO**

  -----------------------------------------------------------------------
  // language: typescript\
  // apps/user-service/src/modules/education/dto/create-education.dto.ts\
  import { IsString, MaxLength, IsDateString, IsOptional } from
  \'class-validator\';\
  \
  export class CreateEducationDto {\
  \@IsString() \@MaxLength(200)\
  institution!: string;\
  \
  \@IsString() \@MaxLength(200)\
  degree!: string;\
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
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Update DTO**

  -----------------------------------------------------------------------
  // language: typescript\
  // apps/user-service/src/modules/education/dto/update-education.dto.ts\
  import { IsString, MaxLength, IsDateString, IsOptional } from
  \'class-validator\';\
  \
  export class UpdateEducationDto {\
  \@IsOptional() \@IsString() \@MaxLength(200)\
  institution?: string;\
  \
  \@IsOptional() \@IsString() \@MaxLength(200)\
  degree?: string;\
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
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **5) Controller**

  -----------------------------------------------------------------------
  // language: typescript\
  // apps/user-service/src/modules/education/education.controller.ts\
  import { Controller, Get, Post, Patch, Delete, Param, Body, Query,
  UseGuards } from \'@nestjs/common\';\
  import { EducationService } from \'./education.service\';\
  import { CreateEducationDto } from \'./dto/create-education.dto\';\
  import { UpdateEducationDto } from \'./dto/update-education.dto\';\
  import { OwnerGuard } from \'@/common/guards/owner.guard\';\
  \
  \@Controller(\'/v1/users/:userId/profile/education\')\
  \@UseGuards(OwnerGuard)\
  export class EducationController {\
  constructor(private readonly svc: EducationService) {}\
  \
  \@Post()\
  async create(@Param(\'userId\') userId: string, \@Body() dto:
  CreateEducationDto) {\
  const data = await this.svc.create(userId, dto);\
  return { data };\
  }\
  \
  \@Patch(\':id\')\
  async update(@Param(\'userId\') userId: string, \@Param(\'id\') id:
  string, \@Body() dto: UpdateEducationDto) {\
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

## **6) Service (date rules, sanitization, soft delete)**

  -----------------------------------------------------------------------
  // language: typescript\
  // apps/user-service/src/modules/education/education.service.ts\
  import { Injectable, BadRequestException, NotFoundException } from
  \'@nestjs/common\';\
  import { InjectRepository } from \'@nestjs/typeorm\';\
  import { Repository } from \'typeorm\';\
  import { EducationEntity } from
  \'@/database/entities/education.entity\';\
  import { CreateEducationDto } from \'./dto/create-education.dto\';\
  import { UpdateEducationDto } from \'./dto/update-education.dto\';\
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
  export class EducationService {\
  constructor(\
  \@InjectRepository(EducationEntity) private readonly repo:
  Repository\<EducationEntity\>,\
  private readonly sanitizer: HtmlSanitizer\
  ) {}\
  \
  async create(userId: string, dto: CreateEducationDto) {\
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
  institution: dto.institution.trim(),\
  degree: dto.degree.trim(),\
  start_date: dto.startDate,\
  end_date: dto.endDate ?? null,\
  description_html: descHtml\
  });\
  const saved = await this.repo.save(row);\
  return this.toDto(saved);\
  }\
  \
  async update(userId: string, id: string, dto: UpdateEducationDto) {\
  const rec = await this.repo.findOne({ where: { id, user_id: userId,
  deleted_at: null } });\
  if (!rec) throw new NotFoundException({ code: \'NOT_FOUND\', message:
  \'Education not found.\', details: \[\] });\
  \
  const start = dto.startDate ?? rec.start_date;\
  const end = (dto.endDate === undefined) ? rec.end_date : dto.endDate;\
  ensureDateOrder(start, end ?? null);\
  \
  if (dto.institution !== undefined) rec.institution =
  dto.institution.trim();\
  if (dto.degree !== undefined) rec.degree = dto.degree.trim();\
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
  \'Education not found.\', details: \[\] });\
  return this.toDto(rec);\
  }\
  \
  async softDelete(userId: string, id: string) {\
  const rec = await this.repo.findOne({ where: { id, user_id: userId,
  deleted_at: null } });\
  if (!rec) throw new NotFoundException({ code: \'NOT_FOUND\', message:
  \'Education not found.\', details: \[\] });\
  rec.deleted_at = new Date();\
  await this.repo.save(rec);\
  }\
  \
  private toDto(r: EducationEntity) {\
  return {\
  id: r.id,\
  userId: r.user_id,\
  institution: r.institution,\
  degree: r.degree,\
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

## **7) Entity (reference)**

  -----------------------------------------------------------------------
  // language: typescript\
  // apps/user-service/src/database/entities/education.entity.ts\
  import { Column, Entity, PrimaryGeneratedColumn, Index,
  UpdateDateColumn, CreateDateColumn } from \'typeorm\';\
  \
  \@Index(\'ix_education_user_created\', \[\'user_id\',
  \'created_at\'\])\
  \@Entity({ name: \'education\' })\
  export class EducationEntity {\
  \@PrimaryGeneratedColumn(\'uuid\')\
  id!: string;\
  \
  \@Column(\'uuid\')\
  user_id!: string;\
  \
  \@Column({ type: \'varchar\', length: 200 })\
  institution!: string;\
  \
  \@Column({ type: \'varchar\', length: 200 })\
  degree!: string;\
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

## **8) Error Model (standardized)**

- VALIDATION_ERROR --- bad date order, invalid payload.

- NOT_FOUND --- id not found (or soft-deleted) for owner.

- FORBIDDEN_NOT_OWNER --- :userId ≠ token subject.

- UNKNOWN --- unexpected failures.

**Envelope (JSON)**

{

\"code\": \"VALIDATION_ERROR\",

\"message\": \"One or more fields are invalid.\",

\"details\": \[{ \"field\": \"endDate\", \"reason\": \"BEFORE_START\"
}\]

}

## **9) Tests (minimum)**

**Unit**

- endDate before startDate ⇒ VALIDATION_ERROR.

- descriptionHtml sanitized; empty after sanitation ⇒ null.

**Integration**

- Create → row exists; Update degree/date; List excludes deleted_at;
  Delete marks deleted_at and hides from list; GetOne returns 404 after
  delete.

**Contract/E2E**

- Owner-only writes; invalid IDs → NOT_FOUND; invalid dates →
  VALIDATION_ERROR.

## **10) Performance**

- Single-row ops; list is paginated with indexed order.

- Target p95 write \< 300ms on warm DB.
