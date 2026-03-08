# **About Me: API & Validation**

**Project:** Complete My Profile --- **Edit Modals** (Backend)\
**Module:** apps/user-service/src/modules/about\
**DB Table:** about_me (1:1 with user_profile)\
**Scope:** Backend only (per standards). Store **sanitized HTML** for
the user's "About Me" text.

## **1) Endpoints (v1)** 

  -----------------------------------------------------------------------
  POST /v1/users/:userId/profile/about \# create or update (upsert)\
  GET /v1/users/:userId/profile/about \# read (1:1)\
  DELETE /v1/users/:userId/profile/about \# clear section (optional, sets
  empty content)\
  \
  AuthN/Z: owner-only (user in token must match :userId), admin override
  if your gateway/guard supports it.\
  Versioning: under /v1/\... per standard.
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **2) Request / Response Contracts**

### **2.1 Upsert (create/update)**

**Request**

  -----------------------------------------------------------------------
  POST /v1/users/9a2e1b1e-0c84-4d60-9c8d-5b3a9b1a1f01/profile/about\
  Content-Type: application/json\
  Authorization: Bearer \<JWT\>\
  \
  {\
  \"contentHtml\": \"\<p\>Senior engineer with a passion for
  marketplaces.\</p\>\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Response --- 200**

  -----------------------------------------------------------------------
  {\
  \"data\": {\
  \"userId\": \"9a2e1b1e-0c84-4d60-9c8d-5b3a9b1a1f01\",\
  \"contentHtml\": \"\<p\>Senior engineer with a passion for
  marketplaces.\</p\>\",\
  \"updatedAt\": \"2025-10-27T17:10:00.000Z\"\
  }\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Possible 4xx**

  -----------------------------------------------------------------------
  {\
  \"code\": \"VALIDATION_ERROR\",\
  \"message\": \"One or more fields are invalid.\",\
  \"details\": \[{ \"field\": \"contentHtml\", \"reason\": \"MAX_LENGTH\"
  }\]\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **2.2 Read**

**Request**

  -----------------------------------------------------------------------
  GET /v1/users/9a2e1b1e-0c84-4d60-9c8d-5b3a9b1a1f01/profile/about\
  Authorization: Bearer \<JWT\>
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Response --- 200 (exists)**

  -----------------------------------------------------------------------
  {\
  \"data\": {\
  \"userId\": \"9a2e1b1e-0c84-4d60-9c8d-5b3a9b1a1f01\",\
  \"contentHtml\": \"\<p\>Senior engineer with a passion for
  marketplaces.\</p\>\",\
  \"updatedAt\": \"2025-10-27T17:10:00.000Z\"\
  }\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Response --- 200 (empty state)**

  -----------------------------------------------------------------------
  { \"data\": null }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **2.3 Delete (clear)**

**Request**

  -----------------------------------------------------------------------
  DELETE /v1/users/9a2e1b1e-0c84-4d60-9c8d-5b3a9b1a1f01/profile/about\
  Authorization: Bearer \<JWT\>
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Response --- 200**

  -----------------------------------------------------------------------
  { \"data\": null }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **3) Validation Rules**

- **Field:** contentHtml (string, required on POST)

  - Length (characters): **≤ 2600** (matches DB CHECK).

  - Not blank after stripping HTML tags/whitespace (treat
    \<p\>&nbsp;\</p\> as empty).

  - Must pass **HTML sanitization** (below). Reject if sanitization
    removes everything (i.e., becomes empty).

- Any extra fields → ignored or rejected per global validation strategy
  (recommended: reject unknown).

DTO example:

  -----------------------------------------------------------------------
  // apps/user-service/src/modules/about/dto/upsert-about.dto.ts\
  import { IsString, MaxLength } from \'class-validator\';\
  \
  export class UpsertAboutDto {\
  \@IsString()\
  \@MaxLength(2600)\
  contentHtml!: string;\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **4) HTML Sanitization (Server-Side)**

- **Store sanitized HTML** only.

- Reject scripts, iframes, event-handlers (on\*), javascript/data URLs,
  and disallowed attributes.

- Suggested allow-list (adjust to your sanitizer lib's config):

  - **Tags:** p, b, strong, i, em, u, s, br, ul, ol, li, blockquote,
    code, pre, a

  - **Attributes:** a\[href\] (protocols: http, https, mailto),
    rel=\"noopener nofollow noreferrer\", target=\"\_blank\" optional

  - **URL policy:** absolute/relative http(s) only; **no** javascript:
    or data:

- After sanitization, enforce final **length ≤ 2600** and **non-empty**
  rule (see §3).

Sanitizer wrapper:

  -----------------------------------------------------------------------
  // apps/user-service/src/common/utils/html-sanitizer.ts\
  export interface HtmlSanitizer {\
  sanitize(input: string): string;\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **5) Persistence Mapping (to Doc 03 schema)**

- Table: about_me

  - user_id → UUID (PK, FK → user_profile.user_id)

  - content_html → TEXT (sanitized)

  - Timestamps handled by triggers / ORM decorators.

Entity:

  -----------------------------------------------------------------------
  // apps/user-service/src/database/entities/about-me.entity.ts\
  import { Column, Entity, PrimaryColumn, UpdateDateColumn,
  CreateDateColumn } from \'typeorm\';\
  \
  \@Entity({ name: \'about_me\' })\
  export class AboutMeEntity {\
  \@PrimaryColumn(\'uuid\')\
  user_id!: string;\
  \
  \@Column({ type: \'text\' })\
  content_html!: string;\
  \
  \@CreateDateColumn({ type: \'timestamptz\' })\
  created_at!: Date;\
  \
  \@UpdateDateColumn({ type: \'timestamptz\' })\
  updated_at!: Date;\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **6) Controller & Service (reference implementation)**

Controller:

  -----------------------------------------------------------------------
  // apps/user-service/src/modules/about/about.controller.ts\
  import { Controller, Post, Get, Delete, Param, Body, UseGuards } from
  \'@nestjs/common\';\
  import { AboutService } from \'./about.service\';\
  import { UpsertAboutDto } from \'./dto/upsert-about.dto\';\
  import { OwnerGuard } from \'@/common/guards/owner.guard\';\
  \
  \@Controller(\'/v1/users/:userId/profile/about\')\
  \@UseGuards(OwnerGuard)\
  export class AboutController {\
  constructor(private readonly about: AboutService) {}\
  \
  \@Post()\
  async upsert(@Param(\'userId\') userId: string, \@Body() dto:
  UpsertAboutDto) {\
  const data = await this.about.upsert(userId, dto);\
  return { data };\
  }\
  \
  \@Get()\
  async get(@Param(\'userId\') userId: string) {\
  const data = await this.about.get(userId);\
  return { data };\
  }\
  \
  \@Delete()\
  async clear(@Param(\'userId\') userId: string) {\
  await this.about.clear(userId);\
  return { data: null };\
  }\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

Service:

  -----------------------------------------------------------------------
  // apps/user-service/src/modules/about/about.service.ts\
  import { Injectable, BadRequestException } from \'@nestjs/common\';\
  import { Repository } from \'typeorm\';\
  import { AboutMeEntity } from \'@/database/entities/about-me.entity\';\
  import { InjectRepository } from \'@nestjs/typeorm\';\
  import { UpsertAboutDto } from \'./dto/upsert-about.dto\';\
  import { HtmlSanitizer } from \'@/common/utils/html-sanitizer\';\
  \
  \@Injectable()\
  export class AboutService {\
  constructor(\
  \@InjectRepository(AboutMeEntity) private readonly repo:
  Repository\<AboutMeEntity\>,\
  private readonly sanitizer: HtmlSanitizer\
  ) {}\
  \
  async upsert(userId: string, dto: UpsertAboutDto) {\
  const sanitized = this.sanitizer.sanitize(dto.contentHtml ?? \'\');\
  const cleanText = stripHtmlToText(sanitized).trim();\
  \
  if (!cleanText) {\
  throw new BadRequestException({\
  code: \'VALIDATION_ERROR\',\
  message: \'One or more fields are invalid.\',\
  details: \[{ field: \'contentHtml\', reason: \'EMPTY\' }\]\
  });\
  }\
  if (sanitized.length \> 2600) {\
  throw new BadRequestException({\
  code: \'VALIDATION_ERROR\',\
  message: \'One or more fields are invalid.\',\
  details: \[{ field: \'contentHtml\', reason: \'MAX_LENGTH\' }\]\
  });\
  }\
  \
  await this.repo\
  .createQueryBuilder()\
  .insert()\
  .into(AboutMeEntity)\
  .values({ user_id: userId, content_html: sanitized })\
  .onConflict(\`(user_id) DO UPDATE SET content_html =
  EXCLUDED.content_html\`)\
  .execute();\
  \
  const rec = await this.repo.findOneBy({ user_id: userId });\
  return rec ? this.toDto(rec) : null;\
  }\
  \
  async get(userId: string) {\
  const rec = await this.repo.findOneBy({ user_id: userId });\
  return rec ? this.toDto(rec) : null;\
  }\
  \
  async clear(userId: string) {\
  // Clear to empty content (or delete row; choose one policy)\
  await this.repo.delete({ user_id: userId });\
  }\
  \
  private toDto(rec: AboutMeEntity) {\
  return {\
  userId: rec.user_id,\
  contentHtml: rec.content_html,\
  updatedAt: rec.updated_at?.toISOString()\
  };\
  }\
  }\
  \
  // Minimal helper; implement per your utilities\
  function stripHtmlToText(html: string): string {\
  return html.replace(/\<\[\^\>\]\*\>/g, \'\').replace(/&nbsp;/gi, \'
  \');\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

Module:

  -----------------------------------------------------------------------
  // apps/user-service/src/modules/about/about.module.ts\
  import { Module } from \'@nestjs/common\';\
  import { TypeOrmModule } from \'@nestjs/typeorm\';\
  import { AboutMeEntity } from \'@/database/entities/about-me.entity\';\
  import { AboutController } from \'./about.controller\';\
  import { AboutService } from \'./about.service\';\
  \
  \@Module({\
  imports: \[TypeOrmModule.forFeature(\[AboutMeEntity\])\],\
  controllers: \[AboutController\],\
  providers: \[AboutService\],\
  exports: \[AboutService\]\
  })\
  export class AboutModule {}
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **7) Error Model (standardized)**

- VALIDATION_ERROR --- length \> 2600, empty after sanitization,
  non-string input.

- FORBIDDEN_NOT_OWNER --- :userId ≠ token subject.

- NOT_FOUND --- only for reads if user_profile (owner) doesn't exist;
  otherwise return { data: null }.

- UNKNOWN --- unexpected failures.

  -----------------------------------------------------------------------
  Envelope:\
  {\
  \"code\": \"VALIDATION_ERROR\",\
  \"message\": \"One or more fields are invalid.\",\
  \"details\": \[{ \"field\": \"contentHtml\", \"reason\": \"MAX_LENGTH\"
  }\]\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **8) Tests (minimum)**

**Unit**

- Sanitizer strips scripts/event handlers.

- Empty after sanitize → VALIDATION_ERROR.

- Length \> 2600 → VALIDATION_ERROR.

**Integration**

- POST creates row; second POST updates same row (upsert).

- GET returns last version.

- DELETE clears (row removed); subsequent GET → { \"data\": null }.

**Contract/E2E**

- Auth guard: owner-only mutate.

- Bad payloads return error envelope.

## **9) Performance & Limits**

- Single-row upsert (PK on user_id), O(1) queries.

- p95 target: \< 200--300ms for write on warm DB.
