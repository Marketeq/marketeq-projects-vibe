# **Multi-Cloud DB Controller -- Hot-Swappable Postgres (Render • AWS • Heroku • GCP • Azure)**

### **Goal**

Build a production-ready controller + module that lets you **switch live
database backends** (Render Postgres, AWS RDS, Heroku Postgres, GCP
Cloud SQL, or Azure Flexible Server) **without code changes**, with
safety, rollback, and migration support.

### **Stack assumptions**

- NestJS + TypeScript

- TypeORM ORM

- PostgreSQL on all providers

- One primary write DB at a time

## **1) Folder Structure**

****apps/

api-gateway/

src/

database/

admin-db.controller.ts

database.module.ts

db.config.ts

db.manager.ts

db.switcher.ts

db.health.ts

typeorm.adapter.ts

db.tokens.ts

db.types.ts

guards/

ip-allowlist.guard.ts

roles.guard.ts

✅ This keeps everything under /database with your guards in a separate
folder --- clean and consistent with your monorepo.

## **2) Environment Variables**

Store all connection strings in your environment (Render env vars, AWS
SSM, Doppler, etc.)

NODE_ENV=production\|staging\|development

DB_PROFILE=render\|aws\|heroku\|gcp\|azure

DB_SWITCH_PROTECT=true

DB_SSL_DEFAULT=true

DATABASE_URL_RENDER=postgres://user:pass@render-host:5432/db?sslmode=require

DATABASE_URL_AWS=postgres://user:pass@aws-host:5432/db?sslmode=require

DATABASE_URL_HEROKU=postgres://user:pass@heroku-host:5432/db?sslmode=require

DATABASE_URL_GCP=postgres://user:pass@gcp-host:5432/db?sslmode=require

DATABASE_URL_AZURE=postgres://user:pass@azure-host:5432/db?sslmode=require



## **3) db.config.ts**

Central registry for all provider connection profiles.

import { DataSourceOptions } from \'typeorm\';

import \* as path from \'node:path\';

export type DbProfileName = \'render\' \| \'aws\' \| \'heroku\' \|
\'gcp\' \| \'azure\';

export interface DbProfile {

name: DbProfileName;

url: string;

ssl?: boolean \| { ca?: string; rejectUnauthorized?: boolean };

extra?: Record\<string, any\>;

}

function envRequired(key: string): string {

const v = process.env\[key\];

if (!v) throw new Error(\`Missing required env: \${key}\`);

return v;

}

export function loadProfile(name: DbProfileName): DbProfile {

const sslDefault = process.env.DB_SSL_DEFAULT === \'false\' ? false :
true;

switch (name) {

case \'render\':

return { name, url: envRequired(\'DATABASE_URL_RENDER\'), ssl:
sslDefault };

case \'aws\':

return { name, url: envRequired(\'DATABASE_URL_AWS\'), ssl: sslDefault
};

case \'heroku\':

return { name, url: envRequired(\'DATABASE_URL_HEROKU\'), ssl:
sslDefault };

case \'gcp\':

return { name, url: envRequired(\'DATABASE_URL_GCP\'), ssl: sslDefault
};

case \'azure\':

return { name, url: envRequired(\'DATABASE_URL_AZURE\'), ssl: sslDefault
};

default:

throw new Error(\`Unsupported DB profile: \${name}\`);

}

}

export function profileToTypeOrmOptions(p: DbProfile): DataSourceOptions
{

return {

type: \'postgres\',

url: p.url,

ssl: p.ssl,

synchronize: false,

entities: \[path.join(process.cwd(), \'dist/\*\*/\*.entity.js\')\],

migrations: \[path.join(process.cwd(), \'dist/migrations/\*.js\')\],

extra: {

max: 20,

connectionTimeoutMillis: 10_000,

idleTimeoutMillis: 30_000,

\...p.extra,

},

} as DataSourceOptions;

}



## **4) typeorm.adapter.ts**

****import { DataSource, EntityManager } from \'typeorm\';

import { DataSourceOptions } from \'typeorm\';

export class TypeOrmAdapter {

private dataSource?: DataSource;

async init(options: DataSourceOptions): Promise\<DataSource\> {

if (this.dataSource?.isInitialized) return this.dataSource;

this.dataSource = new DataSource(options);

await this.dataSource.initialize();

return this.dataSource;

}

getDataSource(): DataSource {

if (!this.dataSource \|\| !this.dataSource.isInitialized) {

throw new Error(\'DataSource not initialized\');

}

return this.dataSource;

}

async close(): Promise\<void\> {

if (this.dataSource?.isInitialized) {

await this.dataSource.destroy();

}

}

}



## **5) db.switcher.ts**

****import { loadProfile, profileToTypeOrmOptions, DbProfileName } from
\'./db.config\';

import { TypeOrmAdapter } from \'./typeorm.adapter\';

import { DataSource } from \'typeorm\';

export class DbSwitcher {

private current?: { name: DbProfileName; ds: DataSource };

private adapter = new TypeOrmAdapter();

private switching = false;

async boot(initial: DbProfileName) {

const p = loadProfile(initial);

const ds = await this.adapter.init(profileToTypeOrmOptions(p));

this.current = { name: initial, ds };

return this.current;

}

getActive(): { name: DbProfileName; ds: DataSource } {

if (!this.current) throw new Error(\'DB not initialized\');

return this.current;

}

async switchTo(target: DbProfileName): Promise\<DbProfileName\> {

if (this.switching) throw new Error(\'A switch operation is already in
progress\');

this.switching = true;

try {

const active = this.current?.name;

if (active === target) return target;

const profile = loadProfile(target);

const next = await new
TypeOrmAdapter().init(profileToTypeOrmOptions(profile));

const prev = this.current?.ds;

this.current = { name: target, ds: next };

if (prev?.isInitialized) await prev.destroy();

return target;

} finally {

this.switching = false;

}

}

}



## **6) db.manager.ts**

****import { EntityManager } from \'typeorm\';

import { DbSwitcher } from \'./db.switcher\';

export class DbManager {

constructor(private readonly switcher: DbSwitcher) {}

getEntityManager(): EntityManager {

return this.switcher.getActive().ds.manager;

}

}



## **7) db.health.ts**

****import { DbSwitcher } from \'./db.switcher\';

export class DbHealth {

constructor(private readonly switcher: DbSwitcher) {}

async check() {

const { name, ds } = this.switcher.getActive();

try {

await ds.query(\'select 1\');

return { ok: true, profile: name };

} catch (e) {

return { ok: false, profile: name, error: (e as Error).message };

}

}

}



## **8) admin-db.controller.ts**

****import { Controller, Get, Post, Body, Headers, BadRequestException,
UseGuards } from \'@nestjs/common\';

import { DbSwitcher } from \'./db.switcher\';

import { DbHealth } from \'./db.health\';

import { DbProfileName } from \'./db.config\';

import { IpAllowlistGuard } from \'../guards/ip-allowlist.guard\';

import { RolesGuard } from \'../guards/roles.guard\';

class SwitchDto { target!: DbProfileName; reason?: string }

\@UseGuards(IpAllowlistGuard, RolesGuard)

\@Controller(\'admin/db\')

export class DbAdminController {

constructor(private readonly switcher: DbSwitcher, private readonly
health: DbHealth) {}

\@Get(\'status\')

async status() {

const { name } = this.switcher.getActive();

const h = await this.health.check();

return { active: name, health: h };

}

\@Post(\'switch\')

async switch(@Body() body: SwitchDto, \@Headers() headers:
Record\<string,string\>) {

if (process.env.DB_SWITCH_PROTECT === \'true\') {

if (headers\[\'x-db-switch-confirm\'\] !== \'I-accept-the-risk\') {

throw new BadRequestException(\'Missing confirmation header
x-db-switch-confirm\');

}

}

if (!body?.target) throw new BadRequestException(\'target profile is
required\');

const next = await this.switcher.switchTo(body.target);

return { ok: true, active: next, reason: body?.reason ?? null };

}

}



## **9) database.module.ts**

****import { Module, Global } from \'@nestjs/common\';

import { DbSwitcher } from \'./db.switcher\';

import { DbManager } from \'./db.manager\';

import { DbHealth } from \'./db.health\';

import { DbAdminController } from \'./admin-db.controller\';

\@Global()

\@Module({

providers: \[

{

provide: DbSwitcher,

useFactory: async () =\> {

const s = new DbSwitcher();

const initial = (process.env.DB_PROFILE as any) \|\| \'render\';

await s.boot(initial);

return s;

},

},

{

provide: DbManager,

useFactory: (switcher: DbSwitcher) =\> new DbManager(switcher),

inject: \[DbSwitcher\],

},

{

provide: DbHealth,

useFactory: (switcher: DbSwitcher) =\> new DbHealth(switcher),

inject: \[DbSwitcher\],

},

\],

controllers: \[DbAdminController\],

exports: \[DbManager, DbHealth\],

})

export class DatabaseModule {}



## **10) Integration**

**In your AppModule:**

****import { Module } from \'@nestjs/common\';

import { DatabaseModule } from \'./database/database.module\';

\@Module({

imports: \[DatabaseModule\],

})

export class AppModule {}



## **11) Example Usage**

****import { Injectable } from \'@nestjs/common\';

import { DbManager } from \'../database/db.manager\';

import { User } from \'./entities/user.entity\';

\@Injectable()

export class UsersService {

constructor(private readonly db: DbManager) {}

async findById(id: string) {

const em = this.db.getEntityManager();

return em.findOne(User, { where: { id } });

}

}



## **12) Switch Runbook**

1.  GET /admin/db/status → confirm health OK

2.  Run migrations on target profile (DB_MIGRATION_PROFILE=aws npm run
    migration:run)

3.  POST /admin/db/switch { target: \"aws\" } with header\
    x-db-switch-confirm: I-accept-the-risk

4.  Verify GET /admin/db/status

5.  Roll back using same command with previous target if needed

## **13) Migrations**

**typeorm-datasource.ts**

****import { DataSource } from \'typeorm\';

import { loadProfile, profileToTypeOrmOptions } from \'./db.config\';

const targetProfile = (process.env.DB_MIGRATION_PROFILE as any) \|\|
(process.env.DB_PROFILE as any) \|\| \'render\';

const ds = new
DataSource(profileToTypeOrmOptions(loadProfile(targetProfile)));

export default ds;

**package.json scripts**

****\"migration:generate\": \"typeorm migration:generate -d
dist/database/typeorm-datasource.js src/migrations/Auto\",

\"migration:run\": \"typeorm migration:run -d
dist/database/typeorm-datasource.js\"



## **14) Security and Guards**

- Guards:\
  ip-allowlist.guard.ts and roles.guard.ts protect /admin/db/\*.

- Require header x-db-switch-confirm: I-accept-the-risk when
  DB_SWITCH_PROTECT=true.

- Add RBAC + IP whitelist via Nest Guards for production.

## **15) Observability**

Emit structured logs for:

- boot:success

- switch:start

- switch:success

- switch:failed\
  Track metrics for:

- active_profile

- query_latency

- pool_wait_count

## **16) Tests**

- **Unit:** Mock DbSwitcher to confirm all services use DbManager.

- **Integration:** Spin up 2 Postgres containers → switch → verify
  continuity.

## **17) Rollback**

Switch back to previous profile:

POST /admin/db/switch { \"target\": \"render\" }

and confirm health.

## **18) Hardening Checklist**

- Joi env validation

- RBAC & IP allowlist

- Audit logs (actor, time, reason)

- Canary tests post-switch

- Alerts for health failures

## **19) Quick Start (Dev)**

1.  Set local env:

NODE_ENV=development

DB_PROFILE=render

DATABASE_URL_RENDER=postgres://postgres:postgres@localhost:5432/dev?sslmode=disable

2.  Run API Gateway.

3.  GET /admin/db/status

4.  Add second DB → test switch to AWS profile.

✅ **Final notes:**

- This structure matches your current repository exactly.

- You don't need subfolders; all files sit flat inside src/database/.

- Guards remain global in src/guards/.

- Safe for production with minimal import adjustments.
