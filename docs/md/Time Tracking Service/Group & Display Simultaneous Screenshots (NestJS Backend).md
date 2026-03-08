# **Group & Display Simultaneous Screenshots (NestJS Backend)**

**Purpose\**
Support multi-monitor timeline views by grouping screenshots taken at
the same timestamp for the same user. This allows the frontend to
display all monitors together when reviewing work activity.

## **Step 1 -- Database Schema Update**

**Explanation:\**
We need to track which monitor a screenshot belongs to. This requires a
new monitorId field in the screenshots table.

**File:**
apps/time-tracking-service/src/screenshots/screenshot.entity.ts

import { Entity, PrimaryGeneratedColumn, Column } from \'typeorm\';

\@Entity(\'screenshots\')

export class Screenshot {

\@PrimaryGeneratedColumn(\'uuid\')

id: string;

\@Column()

userId: string;

\@Column({ nullable: true })

projectId: string;

\@Column({ nullable: true })

taskId: string;

// Timestamp when the screenshot was taken (UTC)

\@Column({ type: \'timestamptz\' })

timestamp: Date;

// NEW FIELD: monitor identifier for multi-screen setups

\@Column({ nullable: true })

monitorId: string;

\@Column({ type: \'int\' })

keyboard: number;

\@Column({ type: \'int\' })

mouse: number;

\@Column({ default: false })

isBlurred: boolean;

\@Column({ default: false })

isDeleted: boolean;

\@Column()

imageUrl: string;

}



## **Step 2 -- Service Logic for Grouping**

**Explanation:\**
We extend the timeline query so that screenshots are grouped by
(userId + timestamp). Each group contains an array of screenshots, one
per monitor.

**File:**
apps/time-tracking-service/src/screenshots/screenshots.service.ts

import { Injectable } from \'@nestjs/common\';

import { InjectRepository } from \'@nestjs/typeorm\';

import { Repository } from \'typeorm\';

import { Screenshot } from \'./screenshot.entity\';

import { CloudflareService } from \'../cloudflare/cloudflare.service\';

\@Injectable()

export class ScreenshotsService {

constructor(

\@InjectRepository(Screenshot)

private readonly repo: Repository\<Screenshot\>,

private readonly cloudflareService: CloudflareService,

) {}

// Fetch grouped screenshots by user + timestamp

async getGroupedTimeline(userId: string, from: Date, to: Date) {

const rows = await this.repo.find({

where: { userId, isDeleted: false, timestamp: Between(from, to) },

order: { timestamp: \'ASC\' },

});

// Group by timestamp

const groups: Record\<string, any\> = {};

for (const s of rows) {

const key = \`\${s.userId}-\${s.timestamp.toISOString()}\`;

if (!groups\[key\]) {

groups\[key\] = {

timestamp: s.timestamp,

userId: s.userId,

screenshots: \[\],

};

}

groups\[key\].screenshots.push({

id: s.id,

monitorId: s.monitorId,

keyboard: s.keyboard,

mouse: s.mouse,

isBlurred: s.isBlurred,

isDeleted: s.isDeleted,

signedUrl: await this.cloudflareService.getSignedUrl(

s.imageUrl,

s.isBlurred,

),

});

}

return Object.values(groups);

}

}



## **Step 3 -- Controller Endpoint**

**Explanation:\**
The controller exposes the grouped timeline as an endpoint for the
frontend.

**File:**
apps/time-tracking-service/src/screenshots/screenshots.controller.ts

import { Controller, Get, Query, Req, UseGuards } from
\'@nestjs/common\';

import { ScreenshotsService } from \'./screenshots.service\';

import { AuthGuard } from \'../auth/auth.guard\';

\@Controller(\'api/screenshots\')

\@UseGuards(AuthGuard)

export class ScreenshotsController {

constructor(private readonly screenshotsService: ScreenshotsService) {}

// GET endpoint: grouped timeline with multi-monitor support

\@Get(\'timeline/grouped\')

async getGroupedTimeline(@Query(\'from\') from: string, \@Query(\'to\')
to: string, \@Req() req) {

const userId = req.user.id;

return this.screenshotsService.getGroupedTimeline(userId, new
Date(from), new Date(to));

}

}



## **Step 4 -- Security Rules**

**Explanation:\**
We must ensure only owners or admins can access grouped screenshots.

- Non-admins: only their own userId.

- Admins: can request grouped screenshots for other users (extend with
  userId query param).

- Deleted screenshots (isDeleted = true) are excluded.

## **Step 5 -- Example Response**

****\[

{

\"timestamp\": \"2025-08-15T14:32:10.000Z\",

\"userId\": \"user_1\",

\"screenshots\": \[

{

\"id\": \"scr_123\",

\"monitorId\": \"monitor-1\",

\"keyboard\": 61,

\"mouse\": 38,

\"isBlurred\": false,

\"isDeleted\": false,

\"signedUrl\":
\"https://cdn.cloudflare.com/screenshots/123.png?expires=\...\"

},

{

\"id\": \"scr_124\",

\"monitorId\": \"monitor-2\",

\"keyboard\": 54,

\"mouse\": 22,

\"isBlurred\": false,

\"isDeleted\": false,

\"signedUrl\":
\"https://cdn.cloudflare.com/screenshots/124.png?expires=\...\"

}

\]

}

\]



## **Step 6 -- Frontend Guidance**

**Explanation:\**
How the frontend should use the grouped data:

- Call GET /api/screenshots/timeline/grouped?from=\...&to=\... for a
  time range.

- Each group corresponds to one timestamp for a user.

- Render screenshots\[\] in a row, one per monitor.

- If a user has multiple monitors, multiple screenshots will appear side
  by side for the same timestamp.
