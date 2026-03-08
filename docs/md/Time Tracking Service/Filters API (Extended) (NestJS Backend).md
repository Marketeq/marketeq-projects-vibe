# **Filters API (NestJS Backend)**

**Purpose\**
Provide backend filtering that corresponds directly to the UI filter
controls in the design:

- Projects

- Tasks

- Apps

- URLs

- Activity Level

- Time Entry

Filters extend the GET /api/screenshots endpoint for automatic
(screenshot) entries, while manual time entries are handled by a
separate table and combined in a timeline aggregator.

## **Step 1 -- Entity Fields**

**Explanation:\**
These columns must exist to support the filters. If missing, add them
via migration.

**File:**
apps/time-tracking-service/src/screenshots/screenshot.entity.ts

@Entity(\'screenshots\')

export class Screenshot {

\@PrimaryGeneratedColumn(\'uuid\')

id: string;

\@Column()

userId: string;

\@Column({ nullable: true })

projectId: string; // filter: Projects

\@Column({ nullable: true })

taskId: string; // filter: Tasks

\@Column({ type: \'timestamptz\' })

timestamp: Date; // filter: date range

\@Column({ type: \'int\', default: 0 })

keyboard: number; // used for activity level

\@Column({ type: \'int\', default: 0 })

mouse: number; // used for activity level

\@Column({ type: \'jsonb\', nullable: true })

apps: { appName: string; url?: string }\[\]; // filter: Apps

\@Column({ nullable: true })

url: string; // filter: URLs

\@Column()

imageUrl: string;

\@Column({ default: false })

isBlurred: boolean;

\@Column({ default: false })

isDeleted: boolean;

}

> 

## **Step 2 -- DTO for Filters**

**Explanation:\**
Validate the filters exactly as the design requires.

**File:**
apps/time-tracking-service/src/screenshots/dto/filter-screenshots.dto.ts

export class FilterScreenshotsDto {

\@IsOptional()

\@IsUUID()

projectId?: string; // Projects

\@IsOptional()

\@IsUUID()

taskId?: string; // Tasks

\@IsOptional()

\@IsDateString()

from?: string; // Date range start

\@IsOptional()

\@IsDateString()

to?: string; // Date range end

\@IsOptional()

\@IsArray()

\@IsString({ each: true })

apps?: string\[\]; // Apps

\@IsOptional()

\@IsString()

urlContains?: string; // URLs

\@IsOptional()

\@IsInt()

\@Min(0)

\@Max(100)

activityLevel?: number; // Activity Level

\@IsOptional()

\@IsIn(\[\'automatic\', \'manual\', \'all\'\])

timeEntryType?: \'automatic\' \| \'manual\' \| \'all\'; // Time Entry

}

> 

## **Step 3 -- Controller**

**Explanation:\**
The controller wires filters into the GET /api/screenshots endpoint.

**File:**
apps/time-tracking-service/src/screenshots/screenshots.controller.ts

@Controller(\'api/screenshots\')

\@UseGuards(AuthGuard)

export class ScreenshotsController {

constructor(private readonly screenshotsService: ScreenshotsService) {}

\@Get()

async list(

\@Query() filters: FilterScreenshotsDto,

\@Query() sort: SortScreenshotsDto,

\@Req() req,

) {

return this.screenshotsService.listScreenshots(filters, sort, req.user);

}

}

> 

## **Step 4 -- Service Logic**

**Explanation:\**
Filters apply only to screenshots. If timeEntryType=manual, return none
here --- manual entries live in their own table.

**File:**
apps/time-tracking-service/src/screenshots/screenshots.service.ts

async listScreenshots(filters: FilterScreenshotsDto, sort:
SortScreenshotsDto, user: any) {

const qb = this.repo.createQueryBuilder(\'s\');

if (!user.isAdmin) qb.where(\'s.userId = :userId\', { userId: user.id
});

if (filters.timeEntryType === \'manual\') {

qb.andWhere(\'1=0\'); // empty, manual time served elsewhere

}

if (filters.projectId) qb.andWhere(\'s.projectId = :p\', { p:
filters.projectId });

if (filters.taskId) qb.andWhere(\'s.taskId = :t\', { t: filters.taskId
});

if (filters.from && filters.to) {

qb.andWhere(\'s.timestamp BETWEEN :f AND :to\', { f: new
Date(filters.from), to: new Date(filters.to) });

} else if (filters.from) {

qb.andWhere(\'s.timestamp \>= :f\', { f: new Date(filters.from) });

} else if (filters.to) {

qb.andWhere(\'s.timestamp \<= :to\', { to: new Date(filters.to) });

}

if (filters.apps?.length) {

qb.andWhere(new Brackets(sub =\> {

filters.apps!.forEach((name, idx) =\> {

sub\[idx === 0 ? \'where\' : \'orWhere\'\](\`EXISTS (

SELECT 1 FROM jsonb_array_elements(s.apps) a WHERE a-\>\>\'appName\'
ILIKE :app\${idx}

)\`, { \[\`app\${idx}\`\]: name });

});

}));

}

if (filters.urlContains) {

qb.andWhere(\'s.url ILIKE :urlLike\', { urlLike:
\`%\${filters.urlContains}%\` });

}

if (typeof filters.activityLevel === \'number\') {

qb.andWhere(\'((s.keyboard + s.mouse) / 2) \>= :lvl\', { lvl:
filters.activityLevel });

}

const sortField = sort?.sortBy \|\| \'timestamp\';

const sortOrder = sort?.order \|\| \'DESC\';

qb.orderBy(\`s.\${sortField}\`, sortOrder);

const rows = await qb.getMany();

return Promise.all(rows.map(async s =\> ({

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

})));

}

> 

## **Step 5 -- Example Requests**

**Projects + Date range**

****GET
/api/screenshots?projectId=proj_7&from=2025-08-01T00:00:00Z&to=2025-08-15T23:59:59Z

**Apps filter (Chrome + VS Code)**

****GET /api/screenshots?apps=Chrome&apps=VS%20Code

**URLs filter (github.com)**

****GET /api/screenshots?urlContains=github.com

**Activity ≥ 60%**

****GET /api/screenshots?activityLevel=60

**Time Entry = manual (screenshots only endpoint returns empty)**

****GET /api/screenshots?timeEntryType=manual

> 

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

}

\]

> 

## **Step 7 -- Frontend Mapping**

- **Projects** → projectId

- **Tasks** → taskId

- **Apps** → apps\[\]=\...

- **URLs** → urlContains

- **Activity Level** → activityLevel

- **Time Entry** → timeEntryType (automatic/manual/all; manual handled
  in timeline API)
