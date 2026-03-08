Here you go --- **Doc 01: Monorepo Merge Plan & AppModule
Consolidation** (PR-ready).\
This lets a dev collapse all Nest services into **one** app with a clean
AppModule, single main.ts, shared middleware/guards, CORS, versioning,
and health checks.

# **Doc 01 --- Monorepo Merge Plan & AppModule Consolidation**

## **Goal**

Collapse all NestJS microservices into **one backend app** that exposes
every domain (auth, users, listings, projects, payments, notifications,
etc.) behind a single process and URL.

## **Final folder structure (target)**

****repo-root/

├─ apps/

│ ├─ backend/ \# ← unified app (deploy this)

│ │ ├─ src/

│ │ │ ├─ main.ts \# ← single bootstrap

│ │ │ ├─ app.module.ts \# ← single root module

│ │ │ ├─ common/ \# shared guards/filters/interceptors

│ │ │ │ ├─ guards/

│ │ │ │ ├─ filters/

│ │ │ │ ├─ interceptors/

│ │ │ │ └─ middleware/

│ │ │ ├─ health/ \# liveness/readiness endpoints

│ │ │ │ ├─ health.module.ts

│ │ │ │ └─ health.controller.ts

│ │ │ └─ modules/ \# feature domains (migrated from old services)

│ │ │ ├─ auth/

│ │ │ ├─ users/

│ │ │ ├─ listings/

│ │ │ ├─ projects/

│ │ │ ├─ payments/

│ │ │ ├─ notifications/

│ │ │ └─ \...

│ │ ├─ tsconfig.app.json

│ │ └─ (Nest configs)

│ └─ (other apps kept only if truly separate, e.g., admin/strapi lives
elsewhere)

├─ packages/ or libs/ \# optional shared libraries (DTOs, utils)

├─ .github/workflows/ \# CI

├─ package.json

└─ pnpm-workspace.yaml / nx.json / etc.

**What moves:** Each former service's AppModule becomes a **feature
module** under apps/backend/src/modules/\<domain\> with its
controllers/providers intact. Only **one** main.ts and **one** AppModule
remain.

## **Environment & assumptions**

Unified app uses a single DB connection (or multiple if you actually use
more than one DB). Set these env vars:

NODE_ENV=production

PORT=3000 (Render/Heroku will inject one; we still default to 3000)

DATABASE_URL=postgres://\...

JWT_PUBLIC_KEY=\...

JWT_PRIVATE_KEY=\... (if applicable)

REDIS_URL=\... (if queues/caching used)

CORS_ORIGINS=https://your-frontend.com,https://staging-frontend.com



## **PR-ready code (drop-in)**

### **1) apps/backend/src/main.ts**

****import \'reflect-metadata\';

import { NestFactory } from \'@nestjs/core\';

import { AppModule } from \'./app.module\';

import { ValidationPipe, VersioningType } from \'@nestjs/common\';

import helmet from \'helmet\';

async function bootstrap() {

const app = await NestFactory.create(AppModule, {

bufferLogs: true, // safe logging

});

// Security hardening

app.use(helmet());

// CORS

const origins = (process.env.CORS_ORIGINS \|\| \'\').split(\',\').map(s
=\> s.trim()).filter(Boolean);

app.enableCors({

origin: origins.length ? origins : true,

credentials: true,

});

// Global prefix + versioning

app.setGlobalPrefix(\'api\');

app.enableVersioning({ type: VersioningType.URI }); // /v1/\...

// Validation

app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true
}));

// (Optional) If you use a global filter/interceptor/guard, register
here.

const port = process.env.PORT ? Number(process.env.PORT) : 3000;

await app.listen(port, \'0.0.0.0\');

// eslint-disable-next-line no-console

console.log(\`API ready on port \${port}\`);

}

bootstrap();

### **2) apps/backend/src/app.module.ts**

****import { Module } from \'@nestjs/common\';

import { ConfigModule } from \'@nestjs/config\';

import { TypeOrmModule } from \'@nestjs/typeorm\'; // or MongooseModule
if you use Mongo

import { HealthModule } from \'./health/health.module\';

// Feature modules (migrated from old services)

import { AuthModule } from \'./modules/auth/auth.module\';

import { UsersModule } from \'./modules/users/users.module\';

import { ListingsModule } from \'./modules/listings/listings.module\';

import { ProjectsModule } from \'./modules/projects/projects.module\';

import { PaymentsModule } from \'./modules/payments/payments.module\';

import { NotificationsModule } from
\'./modules/notifications/notifications.module\';

// \...add remaining modules as you migrate

\@Module({

imports: \[

ConfigModule.forRoot({

isGlobal: true,

// load: \[customConfig\], // optional config factory

// envFilePath: \[\'.env\', \'.env.local\'\], // optional

}),

// Single DB connection (adjust for Prisma/Mongoose if needed)

TypeOrmModule.forRoot({

// If you use a URL string:

url: process.env.DATABASE_URL,

type: \'postgres\',

autoLoadEntities: true,

synchronize: false, // true only for local dev

ssl: process.env.NODE_ENV === \'production\' ? { rejectUnauthorized:
false } : false,

}),

// Core utility modules

HealthModule,

// Domain modules

AuthModule,

UsersModule,

ListingsModule,

ProjectsModule,

PaymentsModule,

NotificationsModule,

\],

})

export class AppModule {}

### **3) Health endpoints (apps/backend/src/health/\*)**

**health.module.ts**

****import { Module } from \'@nestjs/common\';

import { HealthController } from \'./health.controller\';

\@Module({

controllers: \[HealthController\],

})

export class HealthModule {}

**health.controller.ts**

****import { Controller, Get } from \'@nestjs/common\';

\@Controller({ path: \'health\', version: \'1\' })

export class HealthController {

\@Get()

alive() {

return { ok: true, service: \'backend\', ts: new Date().toISOString() };

}

\@Get(\'db\')

db() {

// Optionally check DB/redis/stripe integrations here

return { ok: true };

}

}

### **4) Controller/module import map (pattern)**

For each former service:

- Take its AppModule and rename to \<Domain\>Module (if not already).

- Place under apps/backend/src/modules/\<domain\>/.

- Ensure every controller keeps a **stable route root**:

@Controller({ path: \'listings\', version: \'1\' })

export class ListingsController { \... }

- \
  If paths *used to* be /listings/\..., they will now be
  /api/v1/listings/\... (consistent across all domains).

- Move service-specific configs (e.g., Stripe secret) into ConfigModule
  (env-driven), not per-app bootstraps.

**Example listings.module.ts:**

****import { Module } from \'@nestjs/common\';

import { TypeOrmModule } from \'@nestjs/typeorm\';

import { ListingsController } from \'./listings.controller\';

import { ListingsService } from \'./listings.service\';

import { ListingEntity } from \'./entities/listing.entity\';

\@Module({

imports: \[TypeOrmModule.forFeature(\[ListingEntity\])\],

controllers: \[ListingsController\],

providers: \[ListingsService\],

exports: \[ListingsService\],

})

export class ListingsModule {}

**Example listings.controller.ts:**

****import { Controller, Get, Param } from \'@nestjs/common\';

import { ListingsService } from \'./listings.service\';

\@Controller({ path: \'listings\', version: \'1\' })

export class ListingsController {

constructor(private readonly listings: ListingsService) {}

\@Get()

findAll() { return this.listings.findAll(); }

\@Get(\':id\')

findOne(@Param(\'id\') id: string) { return this.listings.findOne(id); }

}



## **One-time migration steps (code moves)**

1.  **Pick the host app**: apps/backend.

2.  For each old service:

    - Copy its **domain module** code into
      apps/backend/src/modules/\<domain\>/.

    - Delete its legacy main.ts and legacy AppModule (they're
      superseded).

    - Fix imports to **relative** or workspace aliases (e.g.,
      src/modules/\...).

    - If two services had **same-named providers**, namespace them or
      merge.

3.  Consolidate **global** concerns in the unified app:

    - ConfigModule.forRoot (only once)

    - TypeOrmModule.forRoot / PrismaClient / Mongoose root (only once)

    - Global pipes/filters/guards (only once, registered in main.ts)

4.  **Route roots**: ensure each domain uses a unique path segment
    (auth, users, listings, projects, payments, notifications, ...) with
    version: \'1\'.

## **Common pitfalls (and fixes)**

- **Duplicate globals**: Don't import ConfigModule.forRoot() or
  TypeOrmModule.forRoot() inside feature modules.

- **Port binding**: Must listen on 0.0.0.0 and process.env.PORT.

- **CORS**: If you had per-service differences, resolve into a
  **single** allowlist via CORS_ORIGINS.

- **DTO/Validation**: With whitelist: true, DTOs missing class-validator
  decorators will drop fields --- add \@Is\... as needed.

- **Circular deps**: If two domains depended on each other as services,
  extract shared parts into libs/ or use forwardRef judiciously.

## **PR diff (example snippets)**

> Adjust paths to match your repo. These are illustrative hunks you can
> copy into the PR description.

+ apps/backend/src/main.ts

\+ apps/backend/src/app.module.ts

\+ apps/backend/src/health/health.module.ts

\+ apps/backend/src/health/health.controller.ts

\+ apps/backend/src/modules/auth/\*

\+ apps/backend/src/modules/users/\*

\+ apps/backend/src/modules/listings/\*

\+ apps/backend/src/modules/projects/\*

\+ apps/backend/src/modules/payments/\*

\+ apps/backend/src/modules/notifications/\*

\- apps/auth-service/src/main.ts

\- apps/listings-service/src/main.ts

\- apps/projects-service/src/main.ts

\- apps/payments-service/src/main.ts

\- apps/notifications-service/src/main.ts



## **Local boot checklist (must pass before merging)**

1.  **Install & build\**

    - pnpm i (or npm ci)

    - pnpm -F backend build (or npm run build in apps/backend)

2.  **Env vars present\**

    - DATABASE_URL set and reachable

    - CORS_ORIGINS set (or omit to allow all in dev)

3.  **Run\**

    - pnpm -F backend start:dev (or npm run start:dev)

    - Logs show: API ready on port 3000

4.  **Smoke\**

    - GET http://localhost:3000/api/health → 200 { ok: true, \... }

    - GET http://localhost:3000/api/v1/listings → 200 (or 401 if
      protected)

    - GET http://localhost:3000/api/v1/me → 401 (unauthenticated)

5.  **No duplicate globals\**

    - Grep project: only **one** ConfigModule.forRoot and **one** DB
      root config

6.  **No circular deps\**

    - If Nest warns, resolve by moving shared logic to libs/ or using
      forwardRef.

## **Done state (definition of success)**

- One app boots locally and exposes **all** endpoints under
  /api/v1/\....

- Health checks work (/api/v1/health, /api/v1/health/db).

- No missing dependencies, no circular import errors.

- Former service routes reachable (or intentionally re-mapped) in the
  unified app.

- Ready to wire into Render/Heroku with a **single** web service.

If you want, I can tailor this to your **exact** current folder names
and produce the concrete import list for AppModule so your dev can
copy-paste with zero guesswork.
