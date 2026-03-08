# **Screenshot Detail View API (NestJS Backend)**

**Purpose\**
Provide a detailed response for the screenshot modal, including
metadata, signed image URL, app usage data, and inline editing support.
Security ensures only the screenshot owner or an admin can access this
detail.

## **Step 1 -- Database Fields**

**Explanation:\**
We must ensure the database has all the fields needed for the detail
view, including metadata, blurred/deleted flags, and app usage data.

**File:**
apps/time-tracking-service/src/screenshots/screenshot.entity.ts

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn }
from \'typeorm\';

\@Entity(\'screenshots\')

export class Screenshot {

// Unique identifier for each screenshot

\@PrimaryGeneratedColumn(\'uuid\')

id: string;

// The user who owns this screenshot

\@Column()

userId: string;

// Associated project (optional)

\@Column({ nullable: true })

projectId: string;

// Associated task (optional)

\@Column({ nullable: true })

taskId: string;

// When the screenshot was taken (stored in UTC)

\@Column({ type: \'timestamptz\' })

timestamp: Date;

// Keyboard activity score (percentage or count)

\@Column({ type: \'int\' })

keyboard: number;

// Mouse activity score (percentage or count)

\@Column({ type: \'int\' })

mouse: number;

// Whether the screenshot has been blurred

\@Column({ default: false })

isBlurred: boolean;

// Whether the screenshot has been soft-deleted

\@Column({ default: false })

isDeleted: boolean;

// Storage key for the Cloudflare R2 object

\@Column()

imageUrl: string;

// Embedded application usage metadata (icon, name, url)

\@Column({ type: \'jsonb\', nullable: true })

apps: { iconUrl: string; appName: string; url?: string }\[\];

// Auto-generated creation timestamp

\@CreateDateColumn()

createdAt: Date;

}



## **Step 2 -- DTO for Editing**

**Explanation:\**
A DTO (Data Transfer Object) validates incoming data when updating the
screenshot's project/task inline from the modal.

**File:**
apps/time-tracking-service/src/screenshots/dto/update-screenshot.dto.ts

import { IsOptional, IsUUID } from \'class-validator\';

export class UpdateScreenshotDto {

// Optional new project ID

\@IsOptional()

\@IsUUID()

projectId?: string;

// Optional new task ID

\@IsOptional()

\@IsUUID()

taskId?: string;

}



## **Step 3 -- Controller**

**Explanation:\**
The controller defines two endpoints: one for retrieving details and
another for updating project/task metadata.

**File:**
apps/time-tracking-service/src/screenshots/screenshots.controller.ts

import { Controller, Get, Put, Param, Req, Body } from
\'@nestjs/common\';

import { ScreenshotsService } from \'./screenshots.service\';

import { UpdateScreenshotDto } from \'./dto/update-screenshot.dto\';

\@Controller(\'api/screenshots\')

export class ScreenshotsController {

constructor(private readonly screenshotsService: ScreenshotsService) {}

// GET endpoint: retrieve details for a screenshot

\@Get(\':id/detail\')

async getScreenshotDetail(@Param(\'id\') id: string, \@Req() req) {

return this.screenshotsService.getScreenshotDetail(id, req.user);

}

// PUT endpoint: update screenshot project/task metadata

\@Put(\':id\')

async updateScreenshot(

\@Param(\'id\') id: string,

\@Req() req,

\@Body() dto: UpdateScreenshotDto,

) {

return this.screenshotsService.updateScreenshotMetadata(id, req.user,
dto);

}

}



## **Step 4 -- Service**

**Explanation:\**
The service contains the logic for retrieving screenshot details,
generating signed URLs, and updating project/task metadata.

**File:**
apps/time-tracking-service/src/screenshots/screenshots.service.ts

import { Injectable, NotFoundException, ForbiddenException } from
\'@nestjs/common\';

import { InjectRepository } from \'@nestjs/typeorm\';

import { Repository } from \'typeorm\';

import { Screenshot } from \'./screenshot.entity\';

import { UpdateScreenshotDto } from \'./dto/update-screenshot.dto\';

import { CloudflareService } from \'../cloudflare/cloudflare.service\';
// assume you have this service

\@Injectable()

export class ScreenshotsService {

constructor(

\@InjectRepository(Screenshot)

private readonly repo: Repository\<Screenshot\>,

private readonly cloudflareService: CloudflareService,

) {}

// Fetch screenshot detail with signed URL

async getScreenshotDetail(id: string, user: any) {

const screenshot = await this.repo.findOneBy({ id });

if (!screenshot \|\| screenshot.isDeleted) {

throw new NotFoundException(\'Screenshot not found\');

}

// Only owner or admin can access

if (screenshot.userId !== user.id && !user.isAdmin) {

throw new ForbiddenException(\'Access denied\');

}

// Get signed URL (blurred if applicable)

const signedUrl = await this.cloudflareService.getSignedUrl(

screenshot.imageUrl,

screenshot.isBlurred,

);

return {

id: screenshot.id,

timestamp: screenshot.timestamp,

userId: screenshot.userId,

projectId: screenshot.projectId,

taskId: screenshot.taskId,

keyboard: screenshot.keyboard,

mouse: screenshot.mouse,

isBlurred: screenshot.isBlurred,

isDeleted: screenshot.isDeleted,

apps: screenshot.apps \|\| \[\],

signedUrl,

};

}

// Update project/task metadata inline

async updateScreenshotMetadata(id: string, user: any, dto:
UpdateScreenshotDto) {

const screenshot = await this.repo.findOneBy({ id });

if (!screenshot \|\| screenshot.isDeleted) {

throw new NotFoundException(\'Screenshot not found\');

}

if (screenshot.userId !== user.id && !user.isAdmin) {

throw new ForbiddenException(\'Access denied\');

}

screenshot.projectId = dto.projectId ?? screenshot.projectId;

screenshot.taskId = dto.taskId ?? screenshot.taskId;

return this.repo.save(screenshot);

}

}



## **Step 5 -- Security Rules**

**Explanation:\**
We must clearly define the access rules to ensure privacy and proper
permissions.

- Only screenshot owner or an admin can fetch details.

- Only screenshot owner or an admin can update project/task metadata.

- Soft-deleted screenshots cannot be retrieved.

- Signed URLs are temporary and expire (recommended: 1 hour).

## **Step 6 -- Example Response**

**Explanation:\**
The frontend can rely on this consistent response format to render the
modal correctly.

{

\"id\": \"scr_123\",

\"timestamp\": \"2025-08-15T14:32:10.000Z\",

\"userId\": \"user_1\",

\"projectId\": \"proj_7\",

\"taskId\": \"task_42\",

\"keyboard\": 61,

\"mouse\": 38,

\"isBlurred\": false,

\"isDeleted\": false,

\"apps\": \[

{ \"iconUrl\": \"https://cdn/app/chrome.png\", \"appName\": \"Chrome\",
\"url\": \"https://github.com\" },

{ \"iconUrl\": \"https://cdn/app/vscode.png\", \"appName\": \"VS Code\"
}

\],

\"signedUrl\":
\"https://cdn.cloudflare.com/signed/screenshots/123.png?expires=\...\"

}



## **Step 7 -- Integration Notes**

**Explanation:\**
This shows how the API ties into the frontend workflow.

- Frontend opens modal → calls GET /api/screenshots/:id/detail.

- Inline project/task editing → PUT /api/screenshots/:id with updated
  IDs.

- UI renders apps array with app icons and optional URLs.

- If blurred, signed URL returns blurred variant.
