# **Screenshot Cards API (NestJS Backend)**

**Purpose\**
Provide a paginated list of screenshot "cards" for the grid view. Each
card shows key metadata: timestamp, preview thumbnail URL, activity %,
and blurred/deleted status. Integrates with the signed URL logic for
displaying thumbnails.

## **Step 1 -- Database Fields**

**Explanation:\**
The cards API uses the same screenshots table created earlier. The key
fields for cards are:

- id -- unique screenshot identifier

- timestamp -- UTC time when screenshot was captured

- imageUrl -- key to generate signed URL for thumbnail

- isBlurred -- whether the screenshot is blurred

- isDeleted -- whether the screenshot is deleted (should be hidden)

- keyboard, mouse -- activity metrics

**File:**
apps/time-tracking-service/src/screenshots/screenshot.entity.ts\
(Already defined earlier --- no changes required for cards.)

## **Step 2 -- DTO for Query Parameters**

**Explanation:\**
We need a DTO to validate pagination, filters, and sorting options.

**File:**
apps/time-tracking-service/src/screenshots/dto/list-cards.dto.ts

import { IsOptional, IsInt, Min, IsUUID, IsEnum } from
\'class-validator\';

import { Type } from \'class-transformer\';

export class ListCardsDto {

// Page number (default 1)

\@IsOptional()

\@Type(() =\> Number)

\@IsInt()

\@Min(1)

page: number = 1;

// Page size (default 20)

\@IsOptional()

\@Type(() =\> Number)

\@IsInt()

\@Min(1)

pageSize: number = 20;

// Optional filter by project

\@IsOptional()

\@IsUUID()

projectId?: string;

// Optional filter by task

\@IsOptional()

\@IsUUID()

taskId?: string;

// Sorting field

\@IsOptional()

\@IsEnum(\[\'timestamp\', \'keyboard\', \'mouse\'\])

sortBy: \'timestamp\' \| \'keyboard\' \| \'mouse\' = \'timestamp\';

// Sort order

\@IsOptional()

\@IsEnum(\[\'ASC\', \'DESC\'\])

order: \'ASC\' \| \'DESC\' = \'DESC\';

}



## **Step 3 -- Controller**

**Explanation:\**
The controller exposes the GET /api/screenshots/cards endpoint, which
uses the DTO for validation.

**File:**
apps/time-tracking-service/src/screenshots/screenshots.controller.ts

import { Controller, Get, Query, Req, UseGuards } from
\'@nestjs/common\';

import { ScreenshotsService } from \'./screenshots.service\';

import { ListCardsDto } from \'./dto/list-cards.dto\';

import { AuthGuard } from \'../auth/auth.guard\'; // Ensure user
authentication

\@Controller(\'api/screenshots\')

\@UseGuards(AuthGuard)

export class ScreenshotsController {

constructor(private readonly screenshotsService: ScreenshotsService) {}

// GET endpoint: fetch screenshot cards

\@Get(\'cards\')

async getCards(@Query() query: ListCardsDto, \@Req() req) {

return this.screenshotsService.getScreenshotCards(query, req.user);

}

}



## **Step 4 -- Service**

**Explanation:\**
The service queries the DB with pagination, filtering, and sorting. It
excludes deleted screenshots and generates signed URLs for thumbnails.

**File:**
apps/time-tracking-service/src/screenshots/screenshots.service.ts

import { Injectable, ForbiddenException } from \'@nestjs/common\';

import { InjectRepository } from \'@nestjs/typeorm\';

import { Repository } from \'typeorm\';

import { Screenshot } from \'./screenshot.entity\';

import { ListCardsDto } from \'./dto/list-cards.dto\';

import { CloudflareService } from \'../cloudflare/cloudflare.service\';

\@Injectable()

export class ScreenshotsService {

constructor(

\@InjectRepository(Screenshot)

private readonly repo: Repository\<Screenshot\>,

private readonly cloudflareService: CloudflareService,

) {}

// Fetch paginated screenshot cards

async getScreenshotCards(query: ListCardsDto, user: any) {

const { page, pageSize, projectId, taskId, sortBy, order } = query;

const qb = this.repo.createQueryBuilder(\'s\');

qb.where(\'s.isDeleted = false\');

// Non-admins can only see their own screenshots

if (!user.isAdmin) {

qb.andWhere(\'s.userId = :userId\', { userId: user.id });

} else if (user.isAdmin && user.userId) {

qb.andWhere(\'s.userId = :userId\', { userId: user.userId });

}

// Apply filters

if (projectId) qb.andWhere(\'s.projectId = :projectId\', { projectId });

if (taskId) qb.andWhere(\'s.taskId = :taskId\', { taskId });

// Sorting

qb.orderBy(\`s.\${sortBy}\`, order);

// Pagination

qb.skip((page - 1) \* pageSize).take(pageSize);

// Select only needed fields

qb.select(\[

\'s.id\',

\'s.timestamp\',

\'s.imageUrl\',

\'s.isBlurred\',

\'s.isDeleted\',

\'s.keyboard\',

\'s.mouse\',

\]);

const \[rows, total\] = await qb.getManyAndCount();

// Attach signed URLs

const cards = await Promise.all(

rows.map(async (s) =\> ({

id: s.id,

timestamp: s.timestamp,

isBlurred: s.isBlurred,

isDeleted: s.isDeleted,

keyboard: s.keyboard,

mouse: s.mouse,

thumbnailUrl: await this.cloudflareService.getSignedUrl(

s.imageUrl,

s.isBlurred,

),

})),

);

return {

page,

pageSize,

total,

cards,

};

}

}



## **Step 5 -- Security Rules**

**Explanation:\**
Security must be enforced so that users only see their own screenshots,
while admins may see all.

- Only authenticated users may call this endpoint.

- Non-admins see only their own screenshots.

- Deleted screenshots (isDeleted = true) are excluded.

- Signed URLs for thumbnails expire (recommended: 1 hour).

## **Step 6 -- Example Request**

****GET
/api/screenshots/cards?page=1&pageSize=20&projectId=proj_7&sortBy=timestamp&order=DESC

Authorization: Bearer \<token\>



## **Step 7 -- Example Response**

****{

\"page\": 1,

\"pageSize\": 20,

\"total\": 134,

\"cards\": \[

{

\"id\": \"scr_123\",

\"timestamp\": \"2025-08-15T14:32:10.000Z\",

\"isBlurred\": false,

\"isDeleted\": false,

\"keyboard\": 61,

\"mouse\": 38,

\"thumbnailUrl\":
\"https://cdn.cloudflare.com/signed/screenshots/123-thumb.png?expires=\...\"

},

{

\"id\": \"scr_124\",

\"timestamp\": \"2025-08-15T14:37:10.000Z\",

\"isBlurred\": true,

\"isDeleted\": false,

\"keyboard\": 55,

\"mouse\": 21,

\"thumbnailUrl\":
\"https://cdn.cloudflare.com/signed/screenshots/124-thumb.png?expires=\...\"

}

\]

}



## **Step 8 -- Integration Notes**

**Explanation:\**
How the frontend should use this API:

- Grid requests screenshots via GET /api/screenshots/cards.

- Query params drive pagination, filtering, and sorting.

- Each card includes metadata + signed thumbnail URL.

- For detail modal, the frontend calls GET /api/screenshots/:id/detail
  (documented previously).
