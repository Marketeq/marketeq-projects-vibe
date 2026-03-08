# **Sorting API (Extended) (NestJS Backend)**

**Purpose\**
Provide full support for the sort options available in the UI designs.
Users can sort screenshots by capture time or by project, with ascending
or descending order. Sorting is integrated with the existing GET
/api/screenshots endpoint and works together with filters.

## **Step 1 -- DTO for Sorting**

**Explanation:\**
We define and validate the sortBy and order query parameters, making
sure only supported values (time and project) are accepted.

**File:**
apps/time-tracking-service/src/screenshots/dto/sort-screenshots.dto.ts

import { IsOptional, IsEnum } from \'class-validator\';

export class SortScreenshotsDto {

// Field to sort by (time or project only, per design)

\@IsOptional()

\@IsEnum(\[\'timestamp\', \'projectId\'\])

sortBy: \'timestamp\' \| \'projectId\' = \'timestamp\';

// Sorting order

\@IsOptional()

\@IsEnum(\[\'ASC\', \'DESC\'\])

order: \'ASC\' \| \'DESC\' = \'DESC\';

}



## **Step 2 -- Controller**

**Explanation:\**
We extend the controller for GET /api/screenshots so that filters and
sorting can be applied in a single query.

**File:**
apps/time-tracking-service/src/screenshots/screenshots.controller.ts

import { Controller, Get, Query, Req, UseGuards } from
\'@nestjs/common\';

import { ScreenshotsService } from \'./screenshots.service\';

import { FilterScreenshotsDto } from \'./dto/filter-screenshots.dto\';

import { SortScreenshotsDto } from \'./dto/sort-screenshots.dto\';

import { AuthGuard } from \'../auth/auth.guard\';

\@Controller(\'api/screenshots\')

\@UseGuards(AuthGuard)

export class ScreenshotsController {

constructor(private readonly screenshotsService: ScreenshotsService) {}

// GET endpoint: list screenshots with filters + sorting

\@Get()

async list(

\@Query() filters: FilterScreenshotsDto,

\@Query() sort: SortScreenshotsDto,

\@Req() req,

) {

return this.screenshotsService.listScreenshots(filters, sort, req.user);

}

}



## **Step 3 -- Service Logic**

**Explanation:\**
We apply filters first, then enforce the design-approved sorts
(timestamp or projectId).

**File:**
apps/time-tracking-service/src/screenshots/screenshots.service.ts

import { Injectable } from \'@nestjs/common\';

import { InjectRepository } from \'@nestjs/typeorm\';

import { Repository } from \'typeorm\';

import { Screenshot } from \'./screenshot.entity\';

import { FilterScreenshotsDto } from \'./dto/filter-screenshots.dto\';

import { SortScreenshotsDto } from \'./dto/sort-screenshots.dto\';

import { CloudflareService } from \'../cloudflare/cloudflare.service\';

\@Injectable()

export class ScreenshotsService {

constructor(

\@InjectRepository(Screenshot)

private readonly repo: Repository\<Screenshot\>,

private readonly cloudflareService: CloudflareService,

) {}

async listScreenshots(filters: FilterScreenshotsDto, sort:
SortScreenshotsDto, user: any) {

const qb = this.repo.createQueryBuilder(\'s\');

qb.where(\'s.isDeleted = false\');

// Security: non-admins can only view their own screenshots

if (!user.isAdmin) {

qb.andWhere(\'s.userId = :userId\', { userId: user.id });

}

// Apply filters (from Filters API doc)

if (filters.projectId) qb.andWhere(\'s.projectId = :projectId\', {
projectId: filters.projectId });

if (filters.taskId) qb.andWhere(\'s.taskId = :taskId\', { taskId:
filters.taskId });

if (filters.from && filters.to) {

qb.andWhere(\'s.timestamp BETWEEN :from AND :to\', { from: new
Date(filters.from), to: new Date(filters.to) });

}

// Apply sorting

const sortField = sort.sortBy \|\| \'timestamp\'; // \'timestamp\' or
\'projectId\'

const sortOrder = sort.order \|\| \'DESC\'; // \'ASC\' or \'DESC\'

qb.orderBy(\`s.\${sortField}\`, sortOrder);

const rows = await qb.getMany();

// Attach signed URLs

return Promise.all(

rows.map(async (s) =\> ({

id: s.id,

timestamp: s.timestamp,

projectId: s.projectId,

taskId: s.taskId,

keyboard: s.keyboard,

mouse: s.mouse,

isBlurred: s.isBlurred,

isDeleted: s.isDeleted,

signedUrl: await this.cloudflareService.getSignedUrl(s.imageUrl,
s.isBlurred),

})),

);

}

}



## **Step 4 -- Supported Sorts**

- **Time (timestamp)** → Oldest first (ASC) or newest first (DESC).

- **Project (projectId)** → Alphabetical order of project IDs.

## **Step 5 -- Example Usage with Filters**

**Example A -- Sort by time (newest first, default)**

****GET /api/screenshots?sortBy=timestamp&order=DESC

Authorization: Bearer \<token\>

**Example B -- Sort by project ascending inside a date range**

****GET
/api/screenshots?from=2025-08-01T00:00:00Z&to=2025-08-15T23:59:59Z&sortBy=projectId&order=ASC

Authorization: Bearer \<token\>

**Example C -- Sort by time ascending for a specific project**

****GET /api/screenshots?projectId=proj_7&sortBy=timestamp&order=ASC

Authorization: Bearer \<token\>



## **Step 6 -- Example Response**

****\[

{

\"id\": \"scr_123\",

\"timestamp\": \"2025-08-15T14:32:10.000Z\",

\"projectId\": \"proj_7\",

\"taskId\": \"task_42\",

\"keyboard\": 61,

\"mouse\": 38,

\"isBlurred\": false,

\"isDeleted\": false,

\"signedUrl\":
\"https://cdn.cloudflare.com/signed/screenshots/123.png?expires=\...\"

},

{

\"id\": \"scr_124\",

\"timestamp\": \"2025-08-15T14:37:10.000Z\",

\"projectId\": \"proj_7\",

\"taskId\": null,

\"keyboard\": 42,

\"mouse\": 55,

\"isBlurred\": false,

\"isDeleted\": false,

\"signedUrl\":
\"https://cdn.cloudflare.com/signed/screenshots/124.png?expires=\...\"

}

\]



## **Step 7 -- Frontend Integration Notes**

- Sorting options in the UI map directly to sortBy and order query
  params.

- Filters can be combined with sorting in a single query.

- The default is timestamp DESC (newest first).
