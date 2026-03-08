# **Job Title & Rate: API, Currency Model**

**Project:** Complete My Profile --- **Edit Modals** (Backend)\
**Module:** apps/user-service/src/modules/rates\
**DB Table:** rate_title (see Doc 03)\
**Scope:** Backend only. Manage **Job Titles** (with an hourly/daily
rate) per user. One **primary** title at a time. Max **3** titles per
user (app-enforced). Case-insensitive de-dupe on title.

## **1) Endpoints (v1)**

  -----------------------------------------------------------------------
  GET /v1/users/:userId/profile/rates? page& pageSize\
  POST /v1/users/:userId/profile/rates\
  PATCH /v1/users/:userId/profile/rates/:id\
  DELETE /v1/users/:userId/profile/rates/:id\
  POST /v1/users/:userId/profile/rates/:id/primary \# set this record as
  primary
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

- **AuthN/Z:** owner-only (token subject must equal :userId; admin
  override if applicable).

- **Soft delete:** via deleted_at; listings exclude soft-deleted rows.

- **Primary constraint:** at most **one** primary per user
  (ux_rate_title_user_primary index in Doc 03).

- **De-dupe:** unique per user on title_norm excluding soft-deleted
  (ux_rate_title_user_norm in Doc 03).

## **2) Data Model (client-facing)**

  -----------------------------------------------------------------------
  {\
  \"id\": \"uuid\",\
  \"userId\": \"uuid\",\
  \"title\": \"string\",\
  \"currency\": \"ISO-4217 (e.g., USD)\",\
  \"amount\": \"string\|number\", // serialized decimal\
  \"isPrimary\": true,\
  \"createdAt\": \"ISO\",\
  \"updatedAt\": \"ISO\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **3) Request / Response Contracts**

### **3.1 Create**

**Request (HTTP)**

  -----------------------------------------------------------------------
  POST /v1/users/9f\.../profile/rates\
  Content-Type: application/json\
  Authorization: Bearer \<JWT\>
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Body (JSON)**

  -----------------------------------------------------------------------
  {\
  \"title\": \"Senior Full-Stack Developer\",\
  \"currency\": \"USD\",\
  \"amount\": \"125.00\",\
  \"isPrimary\": true\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Success (JSON)**

  -----------------------------------------------------------------------
  { \"data\": { /\* Rate object as above \*/ } }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Errors (JSON)**

  -----------------------------------------------------------------------
  { \"code\": \"VALIDATION_ERROR\", \"message\": \"One or more fields are
  invalid.\", \"details\": \[{ \"field\": \"title\", \"reason\":
  \"EMPTY\" }\] }\
  \
  { \"code\": \"VALIDATION_ERROR\", \"message\": \"Max titles reached.\",
  \"details\": \[{ \"field\": \"title\", \"reason\": \"MAX_REACHED_3\"
  }\] }\
  \
  { \"code\": \"CONFLICT_DUPLICATE\", \"message\": \"Title already
  exists.\", \"details\": \[{ \"field\": \"title\", \"reason\":
  \"DUPLICATE\" }\] }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **3.2 Update (partial)**

  -----------------------------------------------------------------------
  PATCH /v1/users/9f\.../profile/rates/a1\...\
  Authorization: Bearer \<JWT\>
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Body (JSON)**

  -----------------------------------------------------------------------
  {\
  \"title\": \"Staff Engineer\",\
  \"currency\": \"EUR\",\
  \"amount\": \"110.00\",\
  \"isPrimary\": false\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Success (JSON)**

  -----------------------------------------------------------------------
  { \"data\": { /\* Rate object \*/ } }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **3.3 List**

  -----------------------------------------------------------------------
  GET /v1/users/9f\.../profile/rates?page=1&pageSize=20\
  Authorization: Bearer \<JWT\>
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Success (JSON)**

  -----------------------------------------------------------------------
  {\
  \"data\": \[ /\* Rate objects (deleted filtered out) \*/ \],\
  \"meta\": { \"page\": 1, \"pageSize\": 20, \"total\": 2 }\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **3.4 Delete (soft)**

  -----------------------------------------------------------------------
  DELETE /v1/users/9f\.../profile/rates/a1\...\
  Authorization: Bearer \<JWT\>
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Success (JSON)**

  -----------------------------------------------------------------------
  { \"data\": null }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **3.5 Set Primary**

  -----------------------------------------------------------------------
  POST /v1/users/9f\.../profile/rates/a1\.../primary\
  Authorization: Bearer \<JWT\>
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Success (JSON)**

  -----------------------------------------------------------------------
  { \"data\": { /\* Rate object now isPrimary=true; others=false \*/ } }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **4) Validation & Business Rules**

- **Title**: required, string, **≤ 160** chars; trim + collapse inner
  spaces; **case-insensitive unique per user** (title_norm in DB).

- **Currency**: required, **ISO-4217** uppercase **3 letters** (e.g.,
  USD, EUR, INR).

- **Amount**: required, decimal string or number, **\> 0**, up to
  **precision (12,2)** as in DB.

- **isPrimary**: boolean (optional on create/update). If true, unset any
  other primary for this user (service logic).

- **Title cap**: **≤ 3** active (not soft-deleted) records per user
  (app-enforced).

- **Soft delete**: deleted_at timestamp; uniqueness and primary indexes
  ignore soft-deleted rows (per schema).

Create DTO:

  -----------------------------------------------------------------------
  // language: typescript\
  // apps/user-service/src/modules/rates/dto/create-rate.dto.ts\
  import { IsString, MaxLength, Matches, IsBoolean, IsOptional } from
  \'class-validator\';\
  \
  export class CreateRateDto {\
  \@IsString() \@MaxLength(160)\
  title!: string;\
  \
  \@IsString() \@Matches(/\^\[A-Z\]{3}\$/)\
  currency!: string;\
  \
  \@IsString()\
  // validate format \"digits\[.2\]\" in a custom pipe if needed; here
  kept as string to preserve exact decimal\
  amount!: string;\
  \
  \@IsOptional() \@IsBoolean()\
  isPrimary?: boolean;\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

Update DTO:

  -----------------------------------------------------------------------
  // language: typescript\
  // apps/user-service/src/modules/rates/dto/update-rate.dto.ts\
  import { IsString, MaxLength, Matches, IsBoolean, IsOptional } from
  \'class-validator\';\
  \
  export class UpdateRateDto {\
  \@IsOptional() \@IsString() \@MaxLength(160)\
  title?: string;\
  \
  \@IsOptional() \@IsString() \@Matches(/\^\[A-Z\]{3}\$/)\
  currency?: string;\
  \
  \@IsOptional() \@IsString()\
  amount?: string;\
  \
  \@IsOptional() \@IsBoolean()\
  isPrimary?: boolean;\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **5) Currency Model**

- Accept only **ISO-4217** codes (uppercase 3 letters).

- Persist currency as VARCHAR(3).

- Persist amount as **string at the DTO layer**, convert to
  NUMERIC(12,2) for DB write.

- Reject:

  - Invalid code (not \[A-Z\]{3}).

  - Negative/zero values.

  - More than 2 decimal places or overflow (\> 9,999,999,999.99).

- No fee math is required (per product answers). Store exactly what user
  provides (after validation).

Helper:

  -----------------------------------------------------------------------
  // language: typescript\
  // apps/user-service/src/common/utils/money.ts\
  export function parseMoneyToCents(amount: string): { ok: boolean;
  reason?: string } {\
  if (!/\^\\d+(\\.\\d{1,2})?\$/.test(amount)) return { ok: false, reason:
  \'FORMAT\' };\
  return { ok: true };\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **6) Controller**

  -----------------------------------------------------------------------
  // language: typescript\
  // apps/user-service/src/modules/rates/rates.controller.ts\
  import { Controller, Get, Post, Patch, Delete, Param, Body, Query,
  UseGuards } from \'@nestjs/common\';\
  import { RatesService } from \'./rates.service\';\
  import { CreateRateDto } from \'./dto/create-rate.dto\';\
  import { UpdateRateDto } from \'./dto/update-rate.dto\';\
  import { OwnerGuard } from \'@/common/guards/owner.guard\';\
  \
  \@Controller(\'/v1/users/:userId/profile/rates\')\
  \@UseGuards(OwnerGuard)\
  export class RatesController {\
  constructor(private readonly svc: RatesService) {}\
  \
  \@Post()\
  async create(@Param(\'userId\') userId: string, \@Body() dto:
  CreateRateDto) {\
  const data = await this.svc.create(userId, dto);\
  return { data };\
  }\
  \
  \@Patch(\':id\')\
  async update(@Param(\'userId\') userId: string, \@Param(\'id\') id:
  string, \@Body() dto: UpdateRateDto) {\
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
  \@Delete(\':id\')\
  async remove(@Param(\'userId\') userId: string, \@Param(\'id\') id:
  string) {\
  await this.svc.softDelete(userId, id);\
  return { data: null };\
  }\
  \
  \@Post(\':id/primary\')\
  async setPrimary(@Param(\'userId\') userId: string, \@Param(\'id\') id:
  string) {\
  const data = await this.svc.setPrimary(userId, id);\
  return { data };\
  }\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **7) Service (cap, de-dupe, primary toggle)**

  -----------------------------------------------------------------------
  // language: typescript\
  // apps/user-service/src/modules/rates/rates.service.ts\
  import { Injectable, BadRequestException, ConflictException,
  NotFoundException } from \'@nestjs/common\';\
  import { InjectRepository } from \'@nestjs/typeorm\';\
  import { Repository } from \'typeorm\';\
  import { RateTitleEntity } from
  \'@/database/entities/rate-title.entity\';\
  import { CreateRateDto } from \'./dto/create-rate.dto\';\
  import { UpdateRateDto } from \'./dto/update-rate.dto\';\
  import { parseMoneyToCents } from \'@/common/utils/money\';\
  \
  type ListOpts = { page: number; pageSize: number };\
  \
  function normalizeTitle(input: string) {\
  const raw = (input ?? \'\').trim().replace(/\\s+/g, \' \');\
  const norm = raw.toLowerCase();\
  return { raw, norm };\
  }\
  \
  \@Injectable()\
  export class RatesService {\
  constructor(@InjectRepository(RateTitleEntity) private readonly repo:
  Repository\<RateTitleEntity\>) {}\
  \
  private async countActive(userId: string) {\
  return this.repo.count({ where: { user_id: userId, deleted_at: null }
  });\
  }\
  \
  private toDto(r: RateTitleEntity) {\
  return {\
  id: r.id,\
  userId: r.user_id,\
  title: r.title_raw,\
  currency: r.currency,\
  amount: r.amount, // numeric in DB; serialize as string\
  isPrimary: r.is_primary,\
  createdAt: r.created_at?.toISOString(),\
  updatedAt: r.updated_at?.toISOString()\
  };\
  }\
  \
  async create(userId: string, dto: CreateRateDto) {\
  const { raw, norm } = normalizeTitle(dto.title);\
  if (!raw) throw new BadRequestException({ code: \'VALIDATION_ERROR\',
  message: \'One or more fields are invalid.\', details: \[{ field:
  \'title\', reason: \'EMPTY\' }\] });\
  if (raw.length \> 160) throw new BadRequestException({ code:
  \'VALIDATION_ERROR\', message: \'One or more fields are invalid.\',
  details: \[{ field: \'title\', reason: \'MAX_LENGTH\' }\] });\
  \
  if (!/\^\[A-Z\]{3}\$/.test(dto.currency)) {\
  throw new BadRequestException({ code: \'VALIDATION_ERROR\', message:
  \'One or more fields are invalid.\', details: \[{ field: \'currency\',
  reason: \'ISO4217\' }\] });\
  }\
  const money = parseMoneyToCents(dto.amount);\
  if (!money.ok) throw new BadRequestException({ code:
  \'VALIDATION_ERROR\', message: \'One or more fields are invalid.\',
  details: \[{ field: \'amount\', reason: \'FORMAT\' }\] });\
  \
  const cnt = await this.countActive(userId);\
  if (cnt \>= 3) {\
  throw new BadRequestException({ code: \'VALIDATION_ERROR\', message:
  \'Max titles reached.\', details: \[{ field: \'title\', reason:
  \'MAX_REACHED_3\' }\] });\
  }\
  \
  try {\
  const row = this.repo.create({\
  user_id: userId,\
  title_raw: raw,\
  title_norm: norm,\
  currency: dto.currency,\
  amount: dto.amount as any, // let TypeORM map to NUMERIC(12,2)\
  is_primary: !!dto.isPrimary\
  });\
  \
  // If new one is primary, unset existing primary\
  if (row.is_primary) {\
  await this.repo.createQueryBuilder()\
  .update(RateTitleEntity)\
  .set({ is_primary: false })\
  .where(\'user_id = :userId AND deleted_at IS NULL\', { userId })\
  .execute();\
  }\
  \
  const saved = await this.repo.save(row);\
  return this.toDto(saved);\
  } catch (e: any) {\
  const msg = String(e?.message \|\| \'\');\
  if (msg.includes(\'ux_rate_title_user_norm\') \|\|
  msg.includes(\'duplicate key\')) {\
  throw new ConflictException({ code: \'CONFLICT_DUPLICATE\', message:
  \'Title already exists.\', details: \[{ field: \'title\', reason:
  \'DUPLICATE\' }\] });\
  }\
  if (msg.includes(\'ux_rate_title_user_primary\')) {\
  // Rare race where two primaries collide\--surface as validation\
  throw new BadRequestException({ code: \'VALIDATION_ERROR\', message:
  \'One or more fields are invalid.\', details: \[{ field: \'isPrimary\',
  reason: \'MULTIPLE_PRIMARY\' }\] });\
  }\
  throw e;\
  }\
  }\
  \
  async update(userId: string, id: string, dto: UpdateRateDto) {\
  const rec = await this.repo.findOne({ where: { id, user_id: userId,
  deleted_at: null } });\
  if (!rec) throw new NotFoundException({ code: \'NOT_FOUND\', message:
  \'Rate not found.\', details: \[\] });\
  \
  if (dto.title !== undefined) {\
  const { raw, norm } = normalizeTitle(dto.title);\
  if (!raw) throw new BadRequestException({ code: \'VALIDATION_ERROR\',
  message: \'One or more fields are invalid.\', details: \[{ field:
  \'title\', reason: \'EMPTY\' }\] });\
  if (raw.length \> 160) throw new BadRequestException({ code:
  \'VALIDATION_ERROR\', message: \'One or more fields are invalid.\',
  details: \[{ field: \'title\', reason: \'MAX_LENGTH\' }\] });\
  rec.title_raw = raw;\
  rec.title_norm = norm;\
  }\
  \
  if (dto.currency !== undefined) {\
  if (!/\^\[A-Z\]{3}\$/.test(dto.currency)) {\
  throw new BadRequestException({ code: \'VALIDATION_ERROR\', message:
  \'One or more fields are invalid.\', details: \[{ field: \'currency\',
  reason: \'ISO4217\' }\] });\
  }\
  rec.currency = dto.currency;\
  }\
  \
  if (dto.amount !== undefined) {\
  const money = parseMoneyToCents(dto.amount);\
  if (!money.ok) throw new BadRequestException({ code:
  \'VALIDATION_ERROR\', message: \'One or more fields are invalid.\',
  details: \[{ field: \'amount\', reason: \'FORMAT\' }\] });\
  rec.amount = dto.amount as any;\
  }\
  \
  if (dto.isPrimary !== undefined) {\
  if (dto.isPrimary) {\
  await this.repo.createQueryBuilder()\
  .update(RateTitleEntity)\
  .set({ is_primary: false })\
  .where(\'user_id = :userId AND deleted_at IS NULL\', { userId })\
  .execute();\
  rec.is_primary = true;\
  } else {\
  rec.is_primary = false;\
  }\
  }\
  \
  try {\
  const saved = await this.repo.save(rec);\
  return this.toDto(saved);\
  } catch (e: any) {\
  const msg = String(e?.message \|\| \'\');\
  if (msg.includes(\'ux_rate_title_user_norm\') \|\|
  msg.includes(\'duplicate key\')) {\
  throw new ConflictException({ code: \'CONFLICT_DUPLICATE\', message:
  \'Title already exists.\', details: \[{ field: \'title\', reason:
  \'DUPLICATE\' }\] });\
  }\
  if (msg.includes(\'ux_rate_title_user_primary\')) {\
  throw new BadRequestException({ code: \'VALIDATION_ERROR\', message:
  \'One or more fields are invalid.\', details: \[{ field: \'isPrimary\',
  reason: \'MULTIPLE_PRIMARY\' }\] });\
  }\
  throw e;\
  }\
  }\
  \
  async list(userId: string, { page, pageSize }: ListOpts) {\
  const take = Math.min(Math.max(pageSize, 1), 100);\
  const skip = (Math.max(page, 1) - 1) \* take;\
  \
  const qb = this.repo.createQueryBuilder(\'r\')\
  .where(\'r.user_id = :userId\', { userId })\
  .andWhere(\'r.deleted_at IS NULL\')\
  .orderBy(\'r.is_primary\', \'DESC\')\
  .addOrderBy(\'r.created_at\', \'DESC\')\
  .take(take)\
  .skip(skip);\
  \
  const \[rows, total\] = await qb.getManyAndCount();\
  return { data: rows.map((r) =\> this.toDto(r)), meta: { page:
  Math.max(page, 1), pageSize: take, total } };\
  }\
  \
  async softDelete(userId: string, id: string) {\
  const rec = await this.repo.findOne({ where: { id, user_id: userId,
  deleted_at: null } });\
  if (!rec) throw new NotFoundException({ code: \'NOT_FOUND\', message:
  \'Rate not found.\', details: \[\] });\
  rec.deleted_at = new Date();\
  await this.repo.save(rec);\
  }\
  \
  async setPrimary(userId: string, id: string) {\
  const rec = await this.repo.findOne({ where: { id, user_id: userId,
  deleted_at: null } });\
  if (!rec) throw new NotFoundException({ code: \'NOT_FOUND\', message:
  \'Rate not found.\', details: \[\] });\
  \
  await this.repo.createQueryBuilder()\
  .update(RateTitleEntity)\
  .set({ is_primary: false })\
  .where(\'user_id = :userId AND deleted_at IS NULL\', { userId })\
  .execute();\
  \
  rec.is_primary = true;\
  const saved = await this.repo.save(rec);\
  return this.toDto(saved);\
  }\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **8) Entity (reference)**

  -----------------------------------------------------------------------
  // language: typescript\
  // apps/user-service/src/database/entities/rate-title.entity.ts\
  import { Column, Entity, PrimaryGeneratedColumn, Index,
  UpdateDateColumn, CreateDateColumn } from \'typeorm\';\
  \
  \@Index(\'ux_rate_title_user_norm\', \[\'user_id\', \'title_norm\'\], {
  unique: true, where: \'deleted_at IS NULL\' })\
  \@Index(\'ux_rate_title_user_primary\', \[\'user_id\'\], { unique:
  true, where: \'is_primary = TRUE AND deleted_at IS NULL\' })\
  \@Entity({ name: \'rate_title\' })\
  export class RateTitleEntity {\
  \@PrimaryGeneratedColumn(\'uuid\')\
  id!: string;\
  \
  \@Column(\'uuid\')\
  user_id!: string;\
  \
  \@Column({ type: \'varchar\', length: 160 })\
  title_raw!: string;\
  \
  \@Column({ type: \'varchar\', length: 160 })\
  title_norm!: string;\
  \
  \@Column({ type: \'varchar\', length: 3 })\
  currency!: string;\
  \
  \@Column({ type: \'numeric\', precision: 12, scale: 2 })\
  amount!: string;\
  \
  \@Column({ type: \'boolean\', default: false })\
  is_primary!: boolean;\
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

- VALIDATION_ERROR --- empty/too long title, bad currency, bad amount,
  multiple primary.

- CONFLICT_DUPLICATE --- duplicate title (case-insensitive) for the
  user.

- FORBIDDEN_NOT_OWNER --- :userId ≠ token subject.

- NOT_FOUND --- id not found (or soft-deleted) for owner.

- UNKNOWN --- unexpected failures.

**Envelope (JSON)**

  -----------------------------------------------------------------------
  {\
  \"code\": \"VALIDATION_ERROR\",\
  \"message\": \"One or more fields are invalid.\",\
  \"details\": \[{ \"field\": \"amount\", \"reason\": \"FORMAT\" }\]\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **10) Tests (minimum)**

**Unit**

- Title normalization & de-dupe; invalid currency; invalid amount
  formats; cap at 3.

- Setting isPrimary=true unsets others.

**Integration**

- Create 3 records; 4th ⇒ MAX_REACHED_3.

- Create duplicate with different case ⇒ CONFLICT_DUPLICATE.

- Set primary on A then on B ⇒ only B remains primary.

- Soft delete a primary; list excludes it; setPrimary on remaining
  works.

**Contract/E2E**

- Owner-only writes; invalid IDs ⇒ NOT_FOUND.

## **11) Performance**

- All ops are single-row; setting primary uses single bulk UPDATE +
  single UPDATE on target row.

- List is paginated, ordered by is_primary DESC, created_at DESC.
