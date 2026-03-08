# **Skills: API, Limits & De-dupe**

**Project:** Complete My Profile --- **Edit Modals** (Backend)\
**Module:** apps/user-service/src/modules/skills\
**DB Table:** user_skill (see Doc 03)\
**Scope:** Backend only. Add/list/remove **Skills** for a user with
strict limits and de-dupe.

## **1) Endpoints (v1)**

  -----------------------------------------------------------------------
  GET /v1/users/:userId/profile/skills? page& pageSize& q\
  POST /v1/users/:userId/profile/skills\
  DELETE /v1/users/:userId/profile/skills/:skillId
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

- AuthN/Z: **owner-only** (token subject must equal :userId; admin
  override if applicable).

- Versioning: /v1/\... per standard.

## **2) Request / Response Contracts**

### **2.1 Create (Add a skill)**

**Request (HTTP)**

  -----------------------------------------------------------------------
  POST /v1/users/9f\.../profile/skills\
  Content-Type: application/json\
  Authorization: Bearer \<JWT\>
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Body (JSON)**

  -----------------------------------------------------------------------
  { \"value\": \"React \" }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Success (JSON)**

  -----------------------------------------------------------------------
  {\
  \"data\": {\
  \"id\": \"b1b05189-6dcb-4c4a-9d5b-bf2e6a2b8d2b\",\
  \"userId\": \"9f\...\",\
  \"value\": \"React\",\
  \"createdAt\": \"2025-10-27T17:20:00.000Z\"\
  }\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Errors (JSON)**

  -----------------------------------------------------------------------
  { \"code\": \"VALIDATION_ERROR\", \"message\": \"One or more fields are
  invalid.\", \"details\": \[{ \"field\": \"value\", \"reason\":
  \"EMPTY\" }\] }\
  \
  { \"code\": \"VALIDATION_ERROR\", \"message\": \"One or more fields are
  invalid.\", \"details\": \[{ \"field\": \"value\", \"reason\":
  \"MAX_LENGTH\" }\] }\
  \
  { \"code\": \"CONFLICT_DUPLICATE\", \"message\": \"Skill already
  exists.\", \"details\": \[{ \"field\": \"value\", \"reason\":
  \"DUPLICATE\" }\] }\
  \
  { \"code\": \"VALIDATION_ERROR\", \"message\": \"Max skills reached.\",
  \"details\": \[{ \"field\": \"value\", \"reason\": \"MAX_REACHED_100\"
  }\] }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **2.2 List**

**Request (HTTP)**

  -----------------------------------------------------------------------
  GET /v1/users/9f\.../profile/skills?page=1&pageSize=50&q=react\
  Authorization: Bearer \<JWT\>
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Success (JSON)**

  -----------------------------------------------------------------------
  {\
  \"data\": \[\
  { \"id\": \"b1b05189-6dcb-4c4a-9d5b-bf2e6a2b8d2b\", \"value\":
  \"React\", \"createdAt\": \"2025-10-27T17:20:00.000Z\" }\
  \],\
  \"meta\": { \"page\": 1, \"pageSize\": 50, \"total\": 1 }\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

- q (optional) filters by substring match on value_raw
  (case-insensitive).

- Defaults: page=1, pageSize=20 (max 100).

### **2.3 Delete**

**Request (HTTP)**

  -----------------------------------------------------------------------
  DELETE
  /v1/users/9f\.../profile/skills/b1b05189-6dcb-4c4a-9d5b-bf2e6a2b8d2b\
  Authorization: Bearer \<JWT\>
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Success (JSON)**

  -----------------------------------------------------------------------
  { \"data\": null }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Errors (JSON)**

  -----------------------------------------------------------------------
  { \"code\": \"NOT_FOUND\", \"message\": \"Skill not found.\",
  \"details\": \[\] }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **3) Validation, Normalization & Limits**

- **Input field:** value (string, required)

  - Trim leading/trailing spaces.

  - Collapse inner whitespace to a single space.

  - Must be **non-empty** after normalization.

  - **Max length:** 160 chars (matches DB column).

- **De-dupe:** case-insensitive uniqueness **per user** using normalized
  value

  - Store:

    - value_raw = normalized casing from input (trim + collapse; keep
      user's case)

    - value_norm = value_raw.toLowerCase()

  - Unique index: (user_id, value_norm) (see Doc 03).

- **Cap:** **100** skills **per user** (app-level check before insert).

DTO (TypeScript):

  -----------------------------------------------------------------------
  // language: typescript\
  // apps/user-service/src/modules/skills/dto/create-skill.dto.ts\
  import { IsString, MaxLength } from \'class-validator\';\
  \
  export class CreateSkillDto {\
  \@IsString()\
  \@MaxLength(160)\
  value!: string;\
  }\
  \
  Normalization helper:\
  // language: typescript\
  // apps/user-service/src/common/utils/normalize.ts\
  export function normalizeSkillInput(input: string): { raw: string;
  norm: string } {\
  const raw = (input ?? \'\').trim().replace(/\\s+/g, \' \');\
  return { raw, norm: raw.toLowerCase() };\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **4) Controller**

  -----------------------------------------------------------------------
  // language: typescript\
  // apps/user-service/src/modules/skills/skills.controller.ts\
  import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards,
  BadRequestException } from \'@nestjs/common\';\
  import { SkillsService } from \'./skills.service\';\
  import { CreateSkillDto } from \'./dto/create-skill.dto\';\
  import { OwnerGuard } from \'@/common/guards/owner.guard\';\
  \
  \@Controller(\'/v1/users/:userId/profile/skills\')\
  \@UseGuards(OwnerGuard)\
  export class SkillsController {\
  constructor(private readonly skills: SkillsService) {}\
  \
  \@Post()\
  async create(@Param(\'userId\') userId: string, \@Body() dto:
  CreateSkillDto) {\
  const data = await this.skills.create(userId, dto);\
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
  const result = await this.skills.list(userId, { page: +page \|\| 1,
  pageSize: +pageSize \|\| 20, q });\
  return result;\
  }\
  \
  \@Delete(\':skillId\')\
  async remove(@Param(\'userId\') userId: string, \@Param(\'skillId\')
  skillId: string) {\
  await this.skills.remove(userId, skillId);\
  return { data: null };\
  }\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **5) Service (de-dupe, cap-enforcement, unique-violation mapping)**

  -----------------------------------------------------------------------
  // language: typescript\
  // apps/user-service/src/modules/skills/skills.service.ts\
  import { Injectable, BadRequestException, ConflictException,
  NotFoundException } from \'@nestjs/common\';\
  import { InjectRepository } from \'@nestjs/typeorm\';\
  import { Repository } from \'typeorm\';\
  import { UserSkillEntity } from
  \'@/database/entities/user-skill.entity\';\
  import { CreateSkillDto } from \'./dto/create-skill.dto\';\
  import { normalizeSkillInput } from \'@/common/utils/normalize\';\
  \
  type ListOpts = { page: number; pageSize: number; q?: string };\
  \
  \@Injectable()\
  export class SkillsService {\
  constructor(@InjectRepository(UserSkillEntity) private readonly repo:
  Repository\<UserSkillEntity\>) {}\
  \
  private async countForUser(userId: string): Promise\<number\> {\
  return this.repo.count({ where: { user_id: userId } });\
  }\
  \
  async create(userId: string, dto: CreateSkillDto) {\
  const { raw, norm } = normalizeSkillInput(dto.value);\
  \
  if (!raw) {\
  throw new BadRequestException({\
  code: \'VALIDATION_ERROR\',\
  message: \'One or more fields are invalid.\',\
  details: \[{ field: \'value\', reason: \'EMPTY\' }\]\
  });\
  }\
  if (raw.length \> 160) {\
  throw new BadRequestException({\
  code: \'VALIDATION_ERROR\',\
  message: \'One or more fields are invalid.\',\
  details: \[{ field: \'value\', reason: \'MAX_LENGTH\' }\]\
  });\
  }\
  \
  const currentCount = await this.countForUser(userId);\
  if (currentCount \>= 100) {\
  throw new BadRequestException({\
  code: \'VALIDATION_ERROR\',\
  message: \'Max skills reached.\',\
  details: \[{ field: \'value\', reason: \'MAX_REACHED_100\' }\]\
  });\
  }\
  \
  try {\
  const toSave = this.repo.create({\
  user_id: userId,\
  value_raw: raw,\
  value_norm: norm\
  });\
  const saved = await this.repo.save(toSave);\
  return this.toDto(saved);\
  } catch (e: any) {\
  // Unique index on (user_id, value_norm) → duplicate\
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
  }\
  }\
  \
  async list(userId: string, { page, pageSize, q }: ListOpts) {\
  const take = Math.min(Math.max(pageSize, 1), 100);\
  const skip = (Math.max(page, 1) - 1) \* take;\
  \
  const qb = this.repo.createQueryBuilder(\'s\').where(\'s.user_id =
  :userId\', { userId });\
  if (q && q.trim()) {\
  qb.andWhere(\'LOWER(s.value_raw) LIKE :q\', { q:
  \`%\${q.trim().toLowerCase()}%\` });\
  }\
  qb.orderBy(\'s.created_at\', \'DESC\').take(take).skip(skip);\
  \
  const \[rows, total\] = await qb.getManyAndCount();\
  return {\
  data: rows.map((r) =\> this.toDto(r)),\
  meta: { page: Math.max(page, 1), pageSize: take, total }\
  };\
  }\
  \
  async remove(userId: string, skillId: string) {\
  const row = await this.repo.findOne({ where: { id: skillId, user_id:
  userId } });\
  if (!row) {\
  throw new NotFoundException({ code: \'NOT_FOUND\', message: \'Skill not
  found.\', details: \[\] });\
  }\
  await this.repo.delete({ id: skillId, user_id: userId });\
  }\
  \
  private toDto(s: UserSkillEntity) {\
  return {\
  id: s.id,\
  userId: s.user_id,\
  value: s.value_raw,\
  createdAt: s.created_at?.toISOString()\
  };\
  }\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **6) Entity (reference)**

  -----------------------------------------------------------------------
  // language: typescript\
  // apps/user-service/src/database/entities/user-skill.entity.ts\
  import { Column, Entity, PrimaryGeneratedColumn, Index,
  CreateDateColumn } from \'typeorm\';\
  \
  \@Index(\'ux_user_skill_user_norm\', \[\'user_id\', \'value_norm\'\], {
  unique: true })\
  \@Entity({ name: \'user_skill\' })\
  export class UserSkillEntity {\
  \@PrimaryGeneratedColumn(\'uuid\')\
  id!: string;\
  \
  \@Column(\'uuid\')\
  user_id!: string;\
  \
  \@Column({ type: \'varchar\', length: 160 })\
  value_raw!: string;\
  \
  \@Column({ type: \'varchar\', length: 160 })\
  value_norm!: string;\
  \
  \@CreateDateColumn({ type: \'timestamptz\' })\
  created_at!: Date;\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **7) Error Model (standardized)**

- VALIDATION_ERROR --- empty/too long, over cap 100.

- CONFLICT_DUPLICATE --- duplicate skill (case-insensitive).

- FORBIDDEN_NOT_OWNER --- :userId ≠ token subject.

- NOT_FOUND --- delete on non-existent id.

- UNKNOWN --- unexpected failures.

**Envelope (JSON)**

  -----------------------------------------------------------------------
  {\
  \"code\": \"CONFLICT_DUPLICATE\",\
  \"message\": \"Skill already exists.\",\
  \"details\": \[{ \"field\": \"value\", \"reason\": \"DUPLICATE\" }\]\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **8) Tests (minimum)**

**Unit**

- Normalization: \" React JS \" → value_raw=\"React JS\",
  value_norm=\"react js\".

- Reject empty after trim/collapse.

- Reject length \> 160.

**Integration**

- First add succeeds; second add with case variant (e.g., react) ⇒
  CONFLICT_DUPLICATE.

- Add until 100; 101st ⇒ MAX_REACHED_100.

- List with q filters case-insensitively.

- Delete non-owner ⇒ FORBIDDEN_NOT_OWNER; delete not found ⇒ NOT_FOUND.

## **9) Performance**

- Add: single INSERT with unique index --- O(1).

- List: single paged SELECT with LIKE on lowered column; index is on
  (user_id, created_at) for ordering---OK at this scale.
