# **📄 Strapi → NestJS Talent Profile Integration (Production-Ready)**

**Goal**

- Admins edit Talent Profiles in **Strapi**.

- Changes sync in near real time into your **user-service Postgres** via
  **webhooks**.

- Frontend (Next.js) **only hits NestJS** (not Strapi).

- Optional nightly **reconcile** pulls all profiles from Strapi to avoid
  drift.

## **0) Prerequisites**

### **Environment variables (add to your user-service .env)**

****\# Strapi (CMS)

STRAPI_URL=https://your-strapi.example.com

STRAPI_API_TOKEN=YOUR_STRAPI_ADMIN_API_TOKEN \# for reconcile/pull API

STRAPI_WEBHOOK_SECRET=your-long-random-secret \# used to verify webhook
signature

\# Internal security

INTERNAL_SYNC_TOKEN=another-long-random-secret \# for internal sync
endpoints if ever used elsewhere

\# Database already configured in your NestJS service (TypeORM
connection vars)

**Render/Heroku**: set the same keys via dashboard → Environment.

## **1) Strapi Webhook (near-real-time sync)**

**In Strapi Admin:**

- Settings → Webhooks → **Create new webhook\**

  - Name: Talent Profile Sync

  - URL:
    https://\<your-user-service-domain\>/strapi-sync/talent-profiles

  - Events: Entry create, Entry update, Entry delete (for your **Talent
    Profile** collection)

  - Secret: set to **STRAPI_WEBHOOK_SECRET** from above

  - Content type: your "Talent Profile" collection type (e.g.
    api::talent-profile.talent-profile)

This will POST a JSON body and a signature header each time content
changes.

## **2) Capture Raw Body for HMAC verification (NestJS)**

Strapi signs the **raw** body. We must capture it **before** JSON
parsing.

### **src/common/middleware/raw-body.middleware.ts**

****import { Injectable, NestMiddleware } from \'@nestjs/common\';

import \* as rawBody from \'raw-body\';

declare global {

// augment Express Request to hold rawBody

namespace Express {

interface Request { rawBody?: Buffer }

}

}

\@Injectable()

export class RawBodyMiddleware implements NestMiddleware {

async use(req: any, res: any, next: () =\> void) {

if (req.headers\[\'content-type\'\]?.startsWith(\'application/json\')) {

req.rawBody = await rawBody(req);

// now replace req.body with parsed JSON

try { req.body = JSON.parse(req.rawBody.toString(\'utf8\')); } catch {}

}

next();

}

}

### **enable the middleware (for the webhook route only)**

#### **src/app.module.ts (register middleware)**

****import { Module, MiddlewareConsumer, RequestMethod } from
\'@nestjs/common\';

import { HttpModule } from \'@nestjs/axios\';

import { TypeOrmModule } from \'@nestjs/typeorm\';

import { RawBodyMiddleware } from
\'./common/middleware/raw-body.middleware\';

import { TalentProfileSyncModule } from
\'./strapi-sync/talent-profile/talent-profile-sync.module\';

import { TalentProfile } from
\'./strapi-sync/talent-profile/entity/talent-profile.entity\';

\@Module({

imports: \[

HttpModule,

TypeOrmModule.forFeature(\[TalentProfile\]),

TalentProfileSyncModule,

\],

})

export class AppModule {

configure(consumer: MiddlewareConsumer) {

consumer

.apply(RawBodyMiddleware)

.forRoutes({ path: \'strapi-sync/talent-profiles\', method:
RequestMethod.POST });

}

}

> **Commenting guidance**: At the top of each file, add a header block
> explaining **WHY** the file exists, **WHAT** it does, and **HOW** to
> test. See examples below.

## **3) Create Talent Profile Sync Module (NestJS)**

**Paths** (create folders if missing):

src/strapi-sync/talent-profile/

├─ talent-profile-sync.module.ts

├─ talent-profile-sync.controller.ts

├─ talent-profile-sync.service.ts

├─ entity/

│ └─ talent-profile.entity.ts

├─ mapper/

│ └─ strapi-to-entity.mapper.ts

├─ util/

│ ├─ webhook-signature.util.ts

│ └─ pagination.util.ts

└─ reconcile/

└─ reconcile.service.ts

### **3.1 Entity (minimal, flexible; adjust columns as your schema evolves)**

> We use **JSONB** for arrays to reduce table complexity and keep schema
> flexible while your CMS evolves.

#### **src/strapi-sync/talent-profile/entity/talent-profile.entity.ts**

****/\*\*

\* TalentProfile entity

\* WHY: Stores CMS-backed talent data for fast runtime reads by the app.

\* WHAT: Mirrors Strapi \"Talent Profile\" essential fields; arrays kept
in JSONB for flexibility.

\* HOW: Upserted by webhook/reconcile. Queried by user-service
endpoints.

\*/

import {

Entity, PrimaryGeneratedColumn, Column, Index, Unique, CreateDateColumn,
UpdateDateColumn,

} from \'typeorm\';

\@Entity({ name: \'talent_profiles\' })

\@Unique(\[\'externalId\'\])

export class TalentProfile {

\@PrimaryGeneratedColumn()

id: number;

/\*\* Strapi record id (string or number) used as external key for
idempotency \*/

\@Index()

\@Column({ type: \'varchar\', length: 64 })

externalId: string;

/\*\* denormalized username for quick reads \*/

\@Index()

\@Column({ type: \'varchar\', length: 120, nullable: true })

username: string \| null;

\@Column({ type: \'varchar\', length: 180, nullable: true })

name: string \| null;

\@Column({ type: \'varchar\', length: 180, nullable: true })

role: string \| null; // e.g., \"Expert React Developer\"

\@Column({ type: \'int\', nullable: true })

yearsExperience: number \| null;

\@Column({ type: \'varchar\', length: 180, nullable: true })

locationCity: string \| null;

\@Column({ type: \'varchar\', length: 180, nullable: true })

locationRegion: string \| null;

\@Column({ type: \'varchar\', length: 180, nullable: true })

locationCountry: string \| null;

\@Column({ type: \'varchar\', length: 60, nullable: true })

timeZone: string \| null; // e.g., \"UTC+5:30\"

\@Column({ type: \'boolean\', nullable: true })

isAvailable: boolean \| null;

\@Column({ type: \'int\', nullable: true })

availabilityHoursPerWeek: number \| null;

\@Column({ type: \'int\', nullable: true })

rateMin: number \| null; // e.g., 85

\@Column({ type: \'int\', nullable: true })

rateMax: number \| null; // e.g., 120

\@Column({ type: \'numeric\', precision: 3, scale: 2, nullable: true })

rating: number \| null; // 0..5

\@Column({ type: \'int\', nullable: true })

reviewsCount: number \| null;

\@Column({ type: \'date\', nullable: true })

memberSince: Date \| null;

\@Column({ type: \'numeric\', precision: 5, scale: 2, nullable: true })

repeatHireRate: number \| null; // %

\@Column({ type: \'int\', nullable: true })

responseTimeHours: number \| null;

\@Column({ type: \'jsonb\', nullable: true })

skills: string\[\] \| null;

\@Column({ type: \'jsonb\', nullable: true })

languages: string\[\] \| null;

\@Column({ type: \'text\', nullable: true })

overview: string \| null;

\@Column({ type: \'jsonb\', nullable: true })

portfolio: any \| null; // cards/thumbnails/links if present

/\*\* Strapi timestamps for freshness checks \*/

\@Column({ type: \'timestamptz\', nullable: true })

externalUpdatedAt: Date \| null;

\@CreateDateColumn({ type: \'timestamptz\' })

createdAt: Date;

\@UpdateDateColumn({ type: \'timestamptz\' })

updatedAt: Date;

}

> **Comment instruction**: Copy the header block style; in your team,
> prepend WHY/WHAT/HOW to each file to make intent explicit.

### **3.2 Webhook signature verification**

#### **src/strapi-sync/talent-profile/util/webhook-signature.util.ts**

****/\*\*

\* WHY: Verify Strapi webhook authenticity using HMAC SHA-256 over raw
body.

\* HOW: Compare computed HMAC (hex) with header \'x-strapi-signature\'.

\*/

import \* as crypto from \'crypto\';

export function verifyStrapiSignature(rawBody: Buffer \| undefined,
headerSig: string \| undefined, secret: string): boolean {

if (!rawBody \|\| !headerSig \|\| !secret) return false;

const hmac = crypto.createHmac(\'sha256\',
secret).update(rawBody).digest(\'hex\');

// Strapi sends hex; if base64 in your env, adjust accordingly.

return crypto.timingSafeEqual(Buffer.from(hmac),
Buffer.from(headerSig));

}



### **3.3 Payload mapper (Strapi → Entity)**

> Adjust keys here to match your **actual Strapi fields**. This isolates
> changes to one file when schema evolves.

#### **src/strapi-sync/talent-profile/mapper/strapi-to-entity.mapper.ts**

****/\*\*

\* WHY: Centralize mapping from Strapi JSON -\> TalentProfile entity
fields.

\* WHAT: Read from entry.attributes.\*; tolerate missing fields to avoid
crashes.

\* HOW: Update keys here when Strapi schema changes. Keep Nest schema
stable.

\*/

import { TalentProfile } from \'../entity/talent-profile.entity\';

export type StrapiTalentPayload = {

id: number \| string;

attributes?: any; // Strapi v4 wraps fields under attributes

// older payloads may send fields at root, so guard accordingly

\[k: string\]: any;

}

export function mapStrapiToTalentProfile(entry: StrapiTalentPayload):
Partial\<TalentProfile\> {

const a = entry?.attributes ?? entry ?? {};

const profile: Partial\<TalentProfile\> = {

externalId: String(entry.id),

username: a.username ?? a.handle ?? null,

name: a.name ?? a.fullName ?? null,

role: a.role ?? a.title ?? a.headline ?? null,

yearsExperience: safeInt(a.yearsExperience ?? a.experienceYears),

locationCity: a.locationCity ?? a.city ?? null,

locationRegion: a.locationRegion ?? a.state ?? a.region ?? null,

locationCountry: a.locationCountry ?? a.country ?? null,

timeZone: a.timeZone ?? a.timezone ?? null,

isAvailable: toBool(a.isAvailable ?? a.availableForHire),

availabilityHoursPerWeek: safeInt(a.availabilityHoursPerWeek ??
a.availableHoursPerWeek),

rateMin: safeInt(a.rateMin ?? a.rate_min),

rateMax: safeInt(a.rateMax ?? a.rate_max),

rating: safeNumber(a.rating ?? a.averageRating),

reviewsCount: safeInt(a.reviewsCount ?? a.reviewCount),

memberSince: a.memberSince ? new Date(a.memberSince) : null,

repeatHireRate: safeNumber(a.repeatHireRate ?? a.repeatHirePercent),

responseTimeHours: safeInt(a.responseTimeHours ??
a.avgResponseTimeHours),

skills: arr(a.skills),

languages: arr(a.languages),

overview: a.overview ?? a.bio ?? null,

portfolio: a.portfolio ?? null,

externalUpdatedAt: a.updatedAt ? new Date(a.updatedAt) : null,

};

return profile;

}

function arr(v: any): string\[\] \| null {

if (!v) return null;

if (Array.isArray(v)) return v.map(String);

if (typeof v === \'string\') return v.split(\',\').map(s =\>
s.trim()).filter(Boolean);

return null;

}

function safeInt(v: any): number \| null { const n = Number(v); return
Number.isFinite(n) ? Math.trunc(n) : null; }

function safeNumber(v: any): number \| null { const n = Number(v);
return Number.isFinite(n) ? n : null; }

function toBool(v: any): boolean \| null {

if (v === true \|\| v === false) return v;

if (v === \'true\') return true;

if (v === \'false\') return false;

return null;

}



### **3.4 Sync service (upsert logic + idempotency)**

#### **src/strapi-sync/talent-profile/talent-profile-sync.service.ts**

****/\*\*

\* WHY: Upsert TalentProfile records based on Strapi webhook events or
reconcile pulls.

\* WHAT: Idempotent write keyed by externalId; ignore stale updates via
externalUpdatedAt.

\* HOW: Single entry upsert + bulk helpers.

\*/

import { Injectable, Logger } from \'@nestjs/common\';

import { InjectRepository } from \'@nestjs/typeorm\';

import { Repository } from \'typeorm\';

import { TalentProfile } from \'./entity/talent-profile.entity\';

import { mapStrapiToTalentProfile, StrapiTalentPayload } from
\'./mapper/strapi-to-entity.mapper\';

\@Injectable()

export class TalentProfileSyncService {

private readonly logger = new Logger(TalentProfileSyncService.name);

constructor(

\@InjectRepository(TalentProfile) private readonly repo:
Repository\<TalentProfile\>,

) {}

async upsertFromStrapiEntry(entry: StrapiTalentPayload):
Promise\<TalentProfile\> {

const partial = mapStrapiToTalentProfile(entry);

if (!partial.externalId) {

this.logger.warn(\`Skipping upsert: missing externalId in entry
\${JSON.stringify(entry).slice(0,200)}\`);

throw new Error(\'externalId missing\');

}

const existing = await this.repo.findOne({ where: { externalId:
partial.externalId } });

if (existing?.externalUpdatedAt && partial.externalUpdatedAt) {

// ignore stale update

if (existing.externalUpdatedAt \>= partial.externalUpdatedAt) {

this.logger.log(\`Skipping stale update for
externalId=\${partial.externalId}\`);

return existing;

}

}

const merged = this.repo.create({ \...(existing ?? {}), \...partial });

return this.repo.save(merged);

}

async deleteByExternalId(externalId: string \| number): Promise\<void\>
{

await this.repo.delete({ externalId: String(externalId) });

}

async bulkUpsert(entries: StrapiTalentPayload\[\]) {

for (const e of entries) {

try { await this.upsertFromStrapiEntry(e); }

catch (err) { this.logger.error(\`bulkUpsert failed for id=\${e?.id}:
\${err}\`); }

}

}

}



### **3.5 Webhook controller (verifies signature + routes events)**

#### **src/strapi-sync/talent-profile/talent-profile-sync.controller.ts**

****/\*\*

\* WHY: Receive Strapi webhooks for Talent Profile changes
(create/update/delete).

\* WHAT: Verify HMAC signature, then upsert or delete record by
externalId.

\* HOW: Strapi config uses the same secret set in STRAPI_WEBHOOK_SECRET.

\*/

import { Controller, Post, Body, Headers, Req, HttpException, HttpStatus
} from \'@nestjs/common\';

import { TalentProfileSyncService } from
\'./talent-profile-sync.service\';

import { verifyStrapiSignature } from \'./util/webhook-signature.util\';

\@Controller(\'strapi-sync\')

export class TalentProfileSyncController {

constructor(private readonly syncService: TalentProfileSyncService) {}

\@Post(\'talent-profiles\')

async handle(@Body() payload: any, \@Headers() headers:
Record\<string,string\>, \@Req() req: any) {

const signature = headers\[\'x-strapi-signature\'\] \|\|
headers\[\'X-STRAPI-SIGNATURE\'\];

const ok = verifyStrapiSignature(req.rawBody, signature,
process.env.STRAPI_WEBHOOK_SECRET!);

if (!ok) throw new HttpException(\'Invalid signature\',
HttpStatus.UNAUTHORIZED);

// Strapi v4 webhook example: { event: \'entry.update\', model:
\'api::talent-profile.talent-profile\', entry: {\...} }

const event = payload?.event ?? \'\';

const entry = payload?.entry ?? payload?.data ?? payload; // tolerate
different shapes

if (!entry?.id) throw new HttpException(\'Malformed payload: missing
entry.id\', HttpStatus.BAD_REQUEST);

if (event.includes(\'delete\')) {

await this.syncService.deleteByExternalId(entry.id);

return { status: \'deleted\', externalId: entry.id };

}

const saved = await this.syncService.upsertFromStrapiEntry(entry);

return { status: \'upserted\', id: saved.id, externalId:
saved.externalId };

}

}



### **3.6 Module wiring**

#### **src/strapi-sync/talent-profile/talent-profile-sync.module.ts**

****/\*\*

\* WHY: Bundle controller/service for Strapi Talent Profile sync.

\*/

import { Module } from \'@nestjs/common\';

import { TypeOrmModule } from \'@nestjs/typeorm\';

import { TalentProfile } from \'./entity/talent-profile.entity\';

import { TalentProfileSyncService } from
\'./talent-profile-sync.service\';

import { TalentProfileSyncController } from
\'./talent-profile-sync.controller\';

\@Module({

imports: \[TypeOrmModule.forFeature(\[TalentProfile\])\],

controllers: \[TalentProfileSyncController\],

providers: \[TalentProfileSyncService\],

exports: \[TalentProfileSyncService\],

})

export class TalentProfileSyncModule {}



## **4) Optional: Nightly Reconcile (API pull from Strapi)**

If a webhook is missed, run a cron that pulls all Talent Profiles and
upserts them.

### **4.1 Simple paginator util**

#### **src/strapi-sync/talent-profile/util/pagination.util.ts**

****/\*\*

\* WHY: Fetch all Strapi entries via REST with pagination.

\*/

import { HttpService } from \'@nestjs/axios\';

export async function fetchAllStrapiPages(http: HttpService, baseUrl:
string, apiToken: string, apiPath: string) {

const out: any\[\] = \[\];

let page = 1;

const pageSize = 100;

while (true) {

const url =
\`\${baseUrl}/api/\${apiPath}?pagination\[page\]=\${page}&pagination\[pageSize\]=\${pageSize}&sort=updatedAt:desc\`;

const res = await http.axiosRef.get(url, {

headers: { Authorization: \`Bearer \${apiToken}\` },

});

const data = res.data?.data ?? \[\];

out.push(\...data.map((d: any) =\> ({ id: d.id, attributes: d.attributes
})));

const meta = res.data?.meta?.pagination;

if (!meta \|\| meta.page \>= meta.pageCount) break;

page += 1;

}

return out;

}

### **4.2 Reconcile service**

#### **src/strapi-sync/talent-profile/reconcile/reconcile.service.ts**

****/\*\*

\* WHY: Safety-net job to reconcile all Talent Profiles from Strapi
nightly.

\* HOW: Pull every page, map to entity, upsert via
TalentProfileSyncService.

\*/

import { Injectable, Logger } from \'@nestjs/common\';

import { HttpService } from \'@nestjs/axios\';

import { fetchAllStrapiPages } from \'../util/pagination.util\';

import { TalentProfileSyncService } from
\'../talent-profile-sync.service\';

\@Injectable()

export class TalentProfileReconcileService {

private readonly logger = new
Logger(TalentProfileReconcileService.name);

constructor(

private readonly http: HttpService,

private readonly sync: TalentProfileSyncService,

) {}

async runFullReconcile() {

const baseUrl = process.env.STRAPI_URL!;

const token = process.env.STRAPI_API_TOKEN!;

const apiPath = \'talent-profiles\'; // adjust to your Strapi UID path

this.logger.log(\'Starting reconcile: talent-profiles\');

const entries = await fetchAllStrapiPages(this.http, baseUrl, token,
apiPath);

await this.sync.bulkUpsert(entries);

this.logger.log(\`Reconcile complete. Upserted \${entries.length}
entries.\`);

}

}

> If you want a real cron: add \@nestjs/schedule package and schedule
> runFullReconcile() nightly. Otherwise, invoke this via an internal
> admin endpoint when needed.

## **5) Minimal read endpoint (optional)**

Expose a read endpoint for FE (or keep it in your existing controllers).

#### **Example (optional) src/user/talent-public.controller.ts**

****/\*\*

\* WHY: Public read for FE (if not already exposed).

\*/

import { Controller, Get, Param } from \'@nestjs/common\';

import { InjectRepository } from \'@nestjs/typeorm\';

import { Repository } from \'typeorm\';

import { TalentProfile } from
\'../strapi-sync/talent-profile/entity/talent-profile.entity\';

\@Controller(\'public/talent\')

export class TalentPublicController {

constructor(

\@InjectRepository(TalentProfile) private readonly repo:
Repository\<TalentProfile\>,

) {}

\@Get(\':username\')

findByUsername(@Param(\'username\') username: string) {

return this.repo.findOne({ where: { username } });

}

}



## **6) Testing**

### **6.1 Simulate webhook (from your laptop)**

****\# Create a fake payload file

cat \> body.json \<\<\'JSON\'

{

\"event\": \"entry.update\",

\"model\": \"api::talent-profile.talent-profile\",

\"entry\": {

\"id\": 123,

\"attributes\": {

\"username\": \"dheerajnagdali\",

\"name\": \"Dheeraj\",

\"role\": \"Expert React Developer\",

\"yearsExperience\": 10,

\"locationCity\": \"Nainital\",

\"locationRegion\": \"Uttarakhand\",

\"locationCountry\": \"India\",

\"timeZone\": \"UTC+5:30\",

\"availableForHire\": true,

\"availabilityHoursPerWeek\": 40,

\"rate_min\": 85,

\"rate_max\": 120,

\"rating\": 4.5,

\"reviewCount\": 24,

\"memberSince\": \"2024-09-19\",

\"repeatHirePercent\": 85,

\"avgResponseTimeHours\": 1,

\"skills\": \[\"TypeScript\",\"React.js\",\"Tailwind
CSS\",\"Next.js\"\],

\"languages\": \[\"English\",\"Hindi\"\],

\"overview\": \"Frontend + accessibility\...\"

}

}

}

JSON

\# Compute signature (same as Strapi does): HMAC SHA-256 of raw body

SIG=\$(node -e \"const fs=require(\'fs\');const
c=fs.readFileSync(\'body.json\');const crypto=require(\'crypto\');const
sig=crypto.createHmac(\'sha256\',
process.env.STRAPI_WEBHOOK_SECRET\|\|\'your-long-random-secret\').update(c).digest(\'hex\');console.log(sig);\")

\# POST to your service

curl -s -X POST \\

-H \"Content-Type: application/json\" \\

-H \"x-strapi-signature: \$SIG\" \\

\--data-binary \@body.json \\

https://your-user-service.example.com/strapi-sync/talent-profiles

Expect: { status: \"upserted\", id: \<localId\>, externalId: \"123\" }

### **6.2 Verify DB row**

Query talent_profiles where externalId = \'123\'.

## **7) Code Commenting Standard (do this as you paste)**

- **Header block at top** of each file (WHY/WHAT/HOW).

- **Function JSDoc** for each public method: parameters, return, throws.

- **Mapping file** (strapi-to-entity.mapper.ts): inline comments next to
  every key describing the source path, e.g. // from attributes.role.

- **Controller**: comment the security expectation (HMAC), and note test
  steps.

- **Service**: comment idempotency choice (externalId), stale update
  guard (externalUpdatedAt).

Example JSDoc snippet:

/\*\*

\* Upsert profile from a Strapi payload.

\* \@param entry Strapi entry or { id, attributes } wrapper

\* \@returns Persisted TalentProfile

\* \@throws Error if externalId missing

\*/



## **8) What you still customize**

- **Mapping keys** in strapi-to-entity.mapper.ts to match your actual
  Strapi fields.

- **Strapi API path** in reconcile (api/talent-profiles) -- set it to
  your UID.

- **Entity columns** as your schema stabilizes (you can later normalize
  arrays to child tables).
