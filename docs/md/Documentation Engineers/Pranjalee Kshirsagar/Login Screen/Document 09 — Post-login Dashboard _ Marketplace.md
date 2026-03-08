# **Document 09 --- Post-login Dashboard / Marketplace**

**Service:** auth-service (NestJS + TypeScript + Prisma)\
**DB:** Postgres (shared instance)\
**Scope:** Implement ONLY what is visible on the dashboard screen in the
design PDF (home sections, categories, "My Favorites", basic filtering,
project cards, and user summary block).\
**Out of scope:** Full marketplace search engine, talent marketplace,
pagination UX beyond basic API paging, account recovery flows.

## **1) Purpose**

After a user logs in and completes mandatory security + onboarding, they
land on a **Dashboard / Marketplace Home** screen that shows:

- A header search input: **"Search by skills or project type"**
  (implemented as **basic server-side filtering** over the project
  catalog in this sprint)

- A **Category** dropdown/filter

- A left navigation with visible category links (Research, Design,
  Development, Testing, Security, Maintenance, Digital Marketing) and
  **My Favorites**, **My Dashboard**

- A user summary block showing:

  - Name

  - Email

  - A money value (e.g., **\$1,540 USD**) --- treated as *client spend
    total*

  - "You currently have **10 team members**" --- treated as *client team
    member count*

- Featured sections:

  - **UX / UI Experts on Demand** (CTA: "browse UX / UI experts") ---
    implemented as a **navigation target stub**

  - **Our Favorite Projects** (View More)

  - **Newest Additions** (View More)

  - **Most Popular Projects** (View More)

  - Quick filter row: **View all**, **Top Web projects**, **Top mobile
    projects**, **Top Cloud projects**, **Top digital marketing
    projects**

## **2) Folder structure (additive)**

All code below is inside:

apps/auth-service/src/marketplace/

marketplace.module.ts

guards/session.guard.ts

dashboard/dashboard.controller.ts

dashboard/dashboard.service.ts

projects/projects.controller.ts

projects/projects.service.ts

categories/categories.controller.ts

categories/categories.service.ts

dto/common.dto.ts

dto/dashboard.dto.ts

dto/favorite.dto.ts

dto/projects.dto.ts

constants.ts

## **3) Database schema (Prisma)**

Update apps/auth-service/prisma/schema.prisma by adding these models.

> These models are **only** for the dashboard portion you can see. No
> hidden marketplace concepts are introduced.

model MarketplaceCategory {

id String \@id \@default(uuid())

name String

slug String \@unique

sortOrder Int \@default(0)

isActive Boolean \@default(true)

projects MarketplaceProject\[\]

createdAt DateTime \@default(now())

updatedAt DateTime \@updatedAt

}

model MarketplaceProject {

id String \@id \@default(uuid())

categoryId String

title String

subtitle String?

priceStartUsd Int // \"Starts at \$40k\" =\> 40000

durationWeeks Int // \"12 weeks\" =\> 12

tags String\[\] \@default(\[\])

heroImageUrl String?

isActive Boolean \@default(true)

// Used for "Most Popular"

popularityScore Int \@default(0)

// Used for "Newest Additions"

createdAt DateTime \@default(now())

updatedAt DateTime \@updatedAt

category MarketplaceCategory \@relation(fields: \[categoryId\],
references: \[id\])

favorites FavoriteProject\[\]

}

model FavoriteProject {

id String \@id \@default(uuid())

userId String

projectId String

createdAt DateTime \@default(now())

project MarketplaceProject \@relation(fields: \[projectId\], references:
\[id\])

@@unique(\[userId, projectId\])

@@index(\[userId\])

@@index(\[projectId\])

}

// For the dashboard summary: "You currently have 10 team members"

model ClientTeamMember {

id String \@id \@default(uuid())

clientUserId String

memberUserId String

status String \@default(\"ACTIVE\") // ACTIVE \| INVITED \| REMOVED

createdAt DateTime \@default(now())

@@index(\[clientUserId\])

@@index(\[memberUserId\])

}

// For the dashboard summary: \"\$ 1,540 USD\"

model ClientSpendLedger {

id String \@id \@default(uuid())

clientUserId String

amountUsd Int // store cents if you prefer; keep as dollars for now

createdAt DateTime \@default(now())

@@index(\[clientUserId\])

}

Run migration:

cd apps/auth-service

npx prisma migrate dev \--name add_marketplace_dashboard

npx prisma generate

## **4) Environment variables**

Add to apps/auth-service/.env (or Supabase env):

\# Already existing in auth-service:

DATABASE_URL=\"postgresql://\...\"

\# Optional: if you want to return a real link for CTA

MARKETPLACE_UXUI_EXPERTS_URL=\"/talent?category=ux-ui\"

## **5) Session validation guard (shared)**

This dashboard is **post-login**, so every endpoint in this doc requires
a valid sessionId.

Create apps/auth-service/src/marketplace/guards/session.guard.ts:

import { BadRequestException, CanActivate, ExecutionContext, Injectable
} from \'@nestjs/common\';

import { PrismaService } from \'../../prisma/prisma.service\';

type SessionMode = \'CLIENT\' \| \'TALENT\';

\@Injectable()

export class SessionGuard implements CanActivate {

constructor(private prisma: PrismaService) {}

async canActivate(ctx: ExecutionContext): Promise\<boolean\> {

const req = ctx.switchToHttp().getRequest();

const sessionId =

req.query.sessionId \|\|

req.body?.sessionId \|\|

req.headers\[\'x-session-id\'\];

if (!sessionId \|\| typeof sessionId !== \'string\') {

throw new BadRequestException({ code: \'SESSION_ID_REQUIRED\', message:
\'sessionId is required.\' });

}

const session = await this.prisma.authSession.findUnique({

where: { id: sessionId },

select: { id: true, userId: true, state: true, expiresAt: true,
revokedAt: true, mode: true },

});

if (!session \|\| session.revokedAt \|\| session.state !== \'ACTIVE\') {

throw new BadRequestException({ code: \'INVALID_SESSION\', message:
\'Invalid session.\' });

}

if (new Date() \> session.expiresAt) {

throw new BadRequestException({ code: \'SESSION_EXPIRED\', message:
\'Session expired.\' });

}

// Attach for controllers/services

req.session = {

id: session.id,

userId: session.userId,

mode: session.mode as SessionMode,

};

return true;

}

}

> This assumes your authSession table exists from prior docs (Document
> 01/08 flows).

## **6) Marketplace constants**

Create apps/auth-service/src/marketplace/constants.ts:

export const DASHBOARD_SECTIONS = {

FAVORITES: \'FAVORITES\',

NEWEST: \'NEWEST\',

MOST_POPULAR: \'MOST_POPULAR\',

} as const;

export const QUICK_FILTERS = \[

{ key: \'VIEW_ALL\', label: \'View all\' },

{ key: \'TOP_WEB\', label: \'Top Web projects\' },

{ key: \'TOP_MOBILE\', label: \'Top mobile projects\' },

{ key: \'TOP_CLOUD\', label: \'Top Cloud projects\' },

{ key: \'TOP_DIGITAL_MARKETING\', label: \'Top digital marketing
projects\' },

\] as const;

## **7) DTOs**

Create apps/auth-service/src/marketplace/dto/common.dto.ts:

import { IsInt, IsOptional, IsString, Max, Min } from
\'class-validator\';

export class PagingQueryDto {

\@IsOptional()

\@IsInt()

\@Min(1)

page?: number = 1;

\@IsOptional()

\@IsInt()

\@Min(1)

\@Max(50)

pageSize?: number = 12;

\@IsOptional()

\@IsString()

q?: string;

\@IsOptional()

\@IsString()

categorySlug?: string;

}

Create apps/auth-service/src/marketplace/dto/favorite.dto.ts:

import { IsBoolean, IsString } from \'class-validator\';

export class FavoriteToggleDto {

\@IsString()

sessionId!: string;

\@IsBoolean()

isFavorite!: boolean;

}

Create apps/auth-service/src/marketplace/dto/projects.dto.ts:

import { IsIn, IsOptional, IsString } from \'class-validator\';

import { DASHBOARD_SECTIONS } from \'../constants\';

export class ProjectsListQueryDto {

\@IsString()

sessionId!: string;

\@IsOptional()

\@IsIn(\[DASHBOARD_SECTIONS.FAVORITES, DASHBOARD_SECTIONS.NEWEST,
DASHBOARD_SECTIONS.MOST_POPULAR\])

section?: string;

\@IsOptional()

\@IsString()

q?: string;

\@IsOptional()

\@IsString()

categorySlug?: string;

\@IsOptional()

page?: any;

\@IsOptional()

pageSize?: any;

}

Create apps/auth-service/src/marketplace/dto/dashboard.dto.ts:

import { IsString } from \'class-validator\';

export class DashboardQueryDto {

\@IsString()

sessionId!: string;

}

## **8) Categories API**

### **8.1 Service**

Create
apps/auth-service/src/marketplace/categories/categories.service.ts:

import { Injectable } from \'@nestjs/common\';

import { PrismaService } from \'../../prisma/prisma.service\';

\@Injectable()

export class CategoriesService {

constructor(private prisma: PrismaService) {}

async listActive() {

const rows = await this.prisma.marketplaceCategory.findMany({

where: { isActive: true },

orderBy: \[{ sortOrder: \'asc\' }, { name: \'asc\' }\],

select: { id: true, name: true, slug: true, sortOrder: true },

});

return { categories: rows };

}

}

### **8.2 Controller**

Create
apps/auth-service/src/marketplace/categories/categories.controller.ts:

import { Controller, Get, UseGuards } from \'@nestjs/common\';

import { CategoriesService } from \'./categories.service\';

import { SessionGuard } from \'../guards/session.guard\';

\@Controller(\'v1/marketplace/categories\')

\@UseGuards(SessionGuard)

export class CategoriesController {

constructor(private svc: CategoriesService) {}

\@Get()

async list() {

return this.svc.listActive();

}

}

## **9) Projects API (cards + favorites + filtering)**

### **9.1 Service**

Create apps/auth-service/src/marketplace/projects/projects.service.ts:

import { BadRequestException, Injectable } from \'@nestjs/common\';

import { PrismaService } from \'../../prisma/prisma.service\';

import { DASHBOARD_SECTIONS } from \'../constants\';

function toInt(v: any, fallback: number) {

const n = Number(v);

return Number.isFinite(n) ? n : fallback;

}

\@Injectable()

export class ProjectsService {

constructor(private prisma: PrismaService) {}

private async resolveCategoryId(categorySlug?: string) {

if (!categorySlug) return null;

const cat = await this.prisma.marketplaceCategory.findUnique({

where: { slug: categorySlug },

select: { id: true },

});

if (!cat) throw new BadRequestException({ code: \'CATEGORY_NOT_FOUND\',
message: \'Category not found.\' });

return cat.id;

}

async list(input: {

userId: string;

section?: string;

q?: string;

categorySlug?: string;

page?: any;

pageSize?: any;

}) {

const page = Math.max(1, toInt(input.page, 1));

const pageSize = Math.min(50, Math.max(1, toInt(input.pageSize, 12)));

const skip = (page - 1) \* pageSize;

const categoryId = await this.resolveCategoryId(input.categorySlug);

const q = (input.q ?? \'\').trim();

// base where

const where: any = { isActive: true };

if (categoryId) where.categoryId = categoryId;

if (q) {

where.OR = \[

{ title: { contains: q, mode: \'insensitive\' } },

{ subtitle: { contains: q, mode: \'insensitive\' } },

{ tags: { has: q } }, // exact tag match (simple)

\];

}

// sections

let orderBy: any\[\] = \[{ createdAt: \'desc\' }\];

if (input.section === DASHBOARD_SECTIONS.NEWEST) {

orderBy = \[{ createdAt: \'desc\' }\];

} else if (input.section === DASHBOARD_SECTIONS.MOST_POPULAR) {

orderBy = \[{ popularityScore: \'desc\' }, { createdAt: \'desc\' }\];

}

// FAVORITES section is computed by joining favorites

if (input.section === DASHBOARD_SECTIONS.FAVORITES) {

const \[total, rows\] = await this.prisma.favoriteProject.findMany({

where: { userId: input.userId, project: where },

orderBy: \[{ createdAt: \'desc\' }\],

skip,

take: pageSize,

select: {

project: {

select: {

id: true,

title: true,

subtitle: true,

priceStartUsd: true,

durationWeeks: true,

heroImageUrl: true,

tags: true,

category: { select: { name: true, slug: true } },

},

},

},

}).then(async (favRows) =\> {

const total = await this.prisma.favoriteProject.count({

where: { userId: input.userId, project: where },

});

return \[total, favRows.map((x) =\> x.project)\];

});

return {

page,

pageSize,

total,

projects: rows.map((p) =\> ({ \...p, isFavorite: true })),

};

}

const \[total, rows, favs\] = await Promise.all(\[

this.prisma.marketplaceProject.count({ where }),

this.prisma.marketplaceProject.findMany({

where,

orderBy,

skip,

take: pageSize,

select: {

id: true,

title: true,

subtitle: true,

priceStartUsd: true,

durationWeeks: true,

heroImageUrl: true,

tags: true,

category: { select: { name: true, slug: true } },

},

}),

this.prisma.favoriteProject.findMany({

where: { userId: input.userId, project: { isActive: true } },

select: { projectId: true },

}),

\]);

const favSet = new Set(favs.map((f) =\> f.projectId));

return {

page,

pageSize,

total,

projects: rows.map((p) =\> ({ \...p, isFavorite: favSet.has(p.id) })),

};

}

async toggleFavorite(input: { userId: string; projectId: string;
isFavorite: boolean }) {

// ensure project exists and active

const proj = await this.prisma.marketplaceProject.findUnique({

where: { id: input.projectId },

select: { id: true, isActive: true },

});

if (!proj \|\| !proj.isActive) {

throw new BadRequestException({ code: \'PROJECT_NOT_FOUND\', message:
\'Project not found.\' });

}

if (input.isFavorite) {

await this.prisma.favoriteProject.upsert({

where: { userId_projectId: { userId: input.userId, projectId:
input.projectId } },

create: { userId: input.userId, projectId: input.projectId },

update: {},

});

} else {

await this.prisma.favoriteProject.deleteMany({

where: { userId: input.userId, projectId: input.projectId },

});

}

return { projectId: input.projectId, isFavorite: input.isFavorite };

}

}

### **9.2 Controller**

Create
apps/auth-service/src/marketplace/projects/projects.controller.ts:

import { Body, Controller, Get, Param, Post, Query, Req, UseGuards }
from \'@nestjs/common\';

import { ProjectsService } from \'./projects.service\';

import { SessionGuard } from \'../guards/session.guard\';

import { ProjectsListQueryDto } from \'../dto/projects.dto\';

import { FavoriteToggleDto } from \'../dto/favorite.dto\';

\@Controller(\'v1/marketplace/projects\')

\@UseGuards(SessionGuard)

export class ProjectsController {

constructor(private svc: ProjectsService) {}

\@Get()

async list(@Req() req: any, \@Query() q: ProjectsListQueryDto) {

return this.svc.list({

userId: req.session.userId,

section: q.section,

q: q.q,

categorySlug: q.categorySlug,

page: q.page,

pageSize: q.pageSize,

});

}

\@Post(\':projectId/favorite\')

async favorite(@Req() req: any, \@Param(\'projectId\') projectId:
string, \@Body() dto: FavoriteToggleDto) {

// SessionGuard already validated dto.sessionId; we only use it for
consistency.

return this.svc.toggleFavorite({

userId: req.session.userId,

projectId,

isFavorite: dto.isFavorite,

});

}

}

## **10) Dashboard Home API (the visible screen)**

### **10.1 Service**

Create apps/auth-service/src/marketplace/dashboard/dashboard.service.ts:

import { Injectable } from \'@nestjs/common\';

import { PrismaService } from \'../../prisma/prisma.service\';

import { DASHBOARD_SECTIONS, QUICK_FILTERS } from \'../constants\';

import { ProjectsService } from \'../projects/projects.service\';

\@Injectable()

export class DashboardService {

constructor(private prisma: PrismaService, private projects:
ProjectsService) {}

async getHome(input: { userId: string }) {

const user = await this.prisma.authUser.findUnique({

where: { id: input.userId },

select: { id: true, email: true, firstName: true, lastName: true },

});

const fullName = \[user?.firstName,
user?.lastName\].filter(Boolean).join(\' \').trim() \|\| \'User\';

const \[teamCount, spendSum\] = await Promise.all(\[

this.prisma.clientTeamMember.count({

where: { clientUserId: input.userId, status: \'ACTIVE\' },

}),

this.prisma.clientSpendLedger.aggregate({

where: { clientUserId: input.userId },

\_sum: { amountUsd: true },

}),

\]);

const spendUsd = spendSum.\_sum.amountUsd ?? 0;

const categories = await this.prisma.marketplaceCategory.findMany({

where: { isActive: true },

orderBy: \[{ sortOrder: \'asc\' }, { name: \'asc\' }\],

select: { name: true, slug: true },

});

// Sections: return first N cards for each

const \[favoriteProjects, newestAdditions, mostPopular\] = await
Promise.all(\[

this.projects.list({ userId: input.userId, section:
DASHBOARD_SECTIONS.FAVORITES, page: 1, pageSize: 8 }),

this.projects.list({ userId: input.userId, section:
DASHBOARD_SECTIONS.NEWEST, page: 1, pageSize: 8 }),

this.projects.list({ userId: input.userId, section:
DASHBOARD_SECTIONS.MOST_POPULAR, page: 1, pageSize: 8 }),

\]);

return {

userSummary: {

name: fullName,

email: user?.email ?? \'\',

spendUsd, // drives \"\$ 1,540 USD\"

teamMembersCount: teamCount, // drives \"10 team members\"

},

header: {

searchPlaceholder: \'Search by skills or project type\',

categoryLabel: \'Category\',

},

leftNav: {

categories, // Research/Design/etc are seeded categories (see Seed
script section)

staticLinks: \[

{ key: \'MY_FAVORITES\', label: \'My Favorites\', href: \'/favorites\'
},

{ key: \'MY_DASHBOARD\', label: \'My Dashboard\', href: \'/dashboard\'
},

\],

},

heroCta: {

title: \'UX / UI Experts on Demand\',

subtitle: \'Get your ux / ui done right with one of our ux/ui experts\',

ctaLabel: \'browse UX / UI experts\',

// Visible portion only: we return a navigation target

ctaHref: process.env.MARKETPLACE_UXUI_EXPERTS_URL \|\|
\'/talent?category=ux-ui\',

},

sections: {

ourFavoriteProjects: {

title: \'Our Favorite Projects\',

viewMoreHref: \'/projects?section=FAVORITES\',

items: favoriteProjects.projects,

},

newestAdditions: {

title: \'Newest Additions\',

viewMoreHref: \'/projects?section=NEWEST\',

items: newestAdditions.projects,

},

mostPopularProjects: {

title: \'Most Popular Projects\',

viewMoreHref: \'/projects?section=MOST_POPULAR\',

items: mostPopular.projects,

},

},

quickFilters: QUICK_FILTERS,

};

}

}

### **10.2 Controller**

Create
apps/auth-service/src/marketplace/dashboard/dashboard.controller.ts:

import { Controller, Get, Req, UseGuards } from \'@nestjs/common\';

import { SessionGuard } from \'../guards/session.guard\';

import { DashboardService } from \'./dashboard.service\';

\@Controller(\'v1/marketplace/dashboard\')

\@UseGuards(SessionGuard)

export class DashboardController {

constructor(private svc: DashboardService) {}

\@Get(\'home\')

async home(@Req() req: any) {

return this.svc.getHome({ userId: req.session.userId });

}

}

## **11) Marketplace module wiring**

Create apps/auth-service/src/marketplace/marketplace.module.ts:

import { Module } from \'@nestjs/common\';

import { PrismaService } from \'../prisma/prisma.service\';

import { SessionGuard } from \'./guards/session.guard\';

import { CategoriesController } from
\'./categories/categories.controller\';

import { CategoriesService } from \'./categories/categories.service\';

import { ProjectsController } from \'./projects/projects.controller\';

import { ProjectsService } from \'./projects/projects.service\';

import { DashboardController } from
\'./dashboard/dashboard.controller\';

import { DashboardService } from \'./dashboard/dashboard.service\';

\@Module({

controllers: \[CategoriesController, ProjectsController,
DashboardController\],

providers: \[PrismaService, SessionGuard, CategoriesService,
ProjectsService, DashboardService\],

})

export class MarketplaceModule {}

Update apps/auth-service/src/app.module.ts (or whichever module
aggregates features):

import { MarketplaceModule } from \'./marketplace/marketplace.module\';

\@Module({

imports: \[

// \...existing modules

MarketplaceModule,

\],

})

export class AppModule {}

## **12) Seeding (required so the dashboard renders exactly like the design)**

Create apps/auth-service/prisma/seed-marketplace.ts:

import { PrismaClient } from \'@prisma/client\';

const prisma = new PrismaClient();

async function main() {

// Categories visible in left nav

const categories = \[

{ name: \'Research\', slug: \'research\', sortOrder: 1 },

{ name: \'Design\', slug: \'design\', sortOrder: 2 },

{ name: \'Development\', slug: \'development\', sortOrder: 3 },

{ name: \'Testing\', slug: \'testing\', sortOrder: 4 },

{ name: \'Security\', slug: \'security\', sortOrder: 5 },

{ name: \'Maintenance\', slug: \'maintenance\', sortOrder: 6 },

{ name: \'Digital Marketing\', slug: \'digital-marketing\', sortOrder: 7
},

// Quick filter needs these to exist:

{ name: \'Web\', slug: \'web\', sortOrder: 20 },

{ name: \'Mobile\', slug: \'mobile\', sortOrder: 21 },

{ name: \'Cloud\', slug: \'cloud\', sortOrder: 22 },

\];

for (const c of categories) {

await prisma.marketplaceCategory.upsert({

where: { slug: c.slug },

create: { \...c, isActive: true },

update: { name: c.name, sortOrder: c.sortOrder, isActive: true },

});

}

const mobile = await prisma.marketplaceCategory.findUnique({ where: {
slug: \'mobile\' } });

const cloud = await prisma.marketplaceCategory.findUnique({ where: {
slug: \'cloud\' } });

const digital = await prisma.marketplaceCategory.findUnique({ where: {
slug: \'digital-marketing\' } });

// Projects visible on screen (examples from design)

const sampleProjects = \[

{

categoryId: mobile!.id,

title: \'The Ultimate Mobile App Experience\',

subtitle: \'A complete funnel for your customer service needs\',

priceStartUsd: 40000,

durationWeeks: 12,

tags: \[\'mobile\', \'react-native\', \'ux\'\],

popularityScore: 80,

},

{

categoryId: digital!.id,

title: \'SEO Enterprise\',

subtitle: \'Sed ut perspiciatis unde\',

priceStartUsd: 40000,

durationWeeks: 12,

tags: \[\'seo\', \'digital-marketing\'\],

popularityScore: 70,

},

{

categoryId: cloud!.id,

title: \'Cloud Scale-Up Package\',

subtitle: \'Infrastructure + DevOps essentials\',

priceStartUsd: 40000,

durationWeeks: 12,

tags: \[\'cloud\', \'devops\'\],

popularityScore: 90,

},

\];

for (const p of sampleProjects) {

await prisma.marketplaceProject.create({ data: p }).catch(() =\> null);

}

console.log(\'✅ Marketplace seed complete\');

}

main()

.catch((e) =\> {

console.error(e);

process.exit(1);

})

.finally(async () =\> prisma.\$disconnect());

Update apps/auth-service/package.json scripts:

{

\"scripts\": {

\"seed:marketplace\": \"ts-node prisma/seed-marketplace.ts\"

}

}

Run:

cd apps/auth-service

npm run seed:marketplace

## **13) How the frontend uses this (Next.js)**

### **13.1 Load dashboard home**

**Request:\**
GET /v1/marketplace/dashboard/home?sessionId=\<SESSION_ID\>

**Response includes everything needed**:

- user summary block

- categories and left nav items

- hero CTA link

- three project sections with cards

- quick filters

### **13.2 "View More" behavior**

When user clicks "View More" on a section:

Call:

GET
/v1/marketplace/projects?sessionId=\<SESSION_ID\>&section=FAVORITES&page=1&pageSize=12\
(or NEWEST, MOST_POPULAR)

### **13.3 Category filter dropdown**

Call:

GET
/v1/marketplace/projects?sessionId=\<SESSION_ID\>&section=NEWEST&categorySlug=cloud

### **13.4 Header search (basic)**

Call:

GET
/v1/marketplace/projects?sessionId=\<SESSION_ID\>&q=react&page=1&pageSize=12

This searches:

- title contains q

- subtitle contains q

- tags has exact match q (simple)

## **14) Favorites UX ("My Favorites")**

- If user clicks a heart/bookmark toggle on a project card:

POST /v1/marketplace/projects/\<projectId\>/favorite

Body:

{

\"sessionId\": \"\<SESSION_ID\>\",

\"isFavorite\": true

}

To remove favorite set isFavorite: false.

## **15) Validation rules + edge cases**

**Session & auth**

- sessionId missing → SESSION_ID_REQUIRED

- invalid/expired session → INVALID_SESSION / SESSION_EXPIRED

**Projects**

- unknown categorySlug → CATEGORY_NOT_FOUND

- favorite toggle on nonexistent project → PROJECT_NOT_FOUND

**Search**

- Empty q returns default ordering (section-specific)

- q is case-insensitive for title/subtitle

**Cards**

- If subtitle is null → frontend should hide subtitle line

- If heroImageUrl is null → frontend uses default placeholder image

**Empty states (required)**

- If a section returns projects: \[\]:

  - show empty state UI (frontend)

  - API returns items: \[\] consistently

## **16) Local dev runbook**

cd apps/auth-service

npm i

npx prisma migrate dev

npm run seed:marketplace

npm run start:dev

Test quickly:

\# Dashboard home

curl
\"http://localhost:3003/v1/marketplace/dashboard/home?sessionId=\<SESSION_ID\>\"

\# List newest

curl
\"http://localhost:3003/v1/marketplace/projects?sessionId=\<SESSION_ID\>&section=NEWEST&page=1&pageSize=8\"

\# Search

curl
\"http://localhost:3003/v1/marketplace/projects?sessionId=\<SESSION_ID\>&q=cloud&page=1&pageSize=8\"

## **17) What this doc intentionally does NOT implement**

To stay aligned with your confirmed scope ("Visible Portion Only" and
"Marketplace search not part of this sprint"):

- No advanced search service (Algolia/Elastic) and no autocomplete
  suggestions

- No talent marketplace browsing implementation (CTA returns a link
  only)

- No project detail pages, checkout, ordering, messaging, or
  applications
