# Environment & Full Setup (user-service)

## Purpose:

This guide gets apps/user-service running locally and in cloud
environments with the exact folders, env vars, Docker/Render config,
health checks, and bootstrap steps required for the Edit Modals feature
(Job Titles & Rate, Languages, Certifications). It follows the Core
Backend monorepo standards (service under /apps, shared code under
/shared).

## Step 1: Prerequisites

- OS: macOS, Linux, or WSL2 (Windows).

- Node.js: v20 LTS

- Package manager: npm (workspace-aware).

- Docker: latest (Desktop or Engine + Compose).

- PostgreSQL: via Docker Compose (provided below).

- S3-compatible storage: MinIO via Docker Compose (for certification
  attachments).

- GitHub access to the monorepo (read).

## Step 2: Monorepo Placement (Critical)

All service code must live under /apps/\<service-name\>/src. Do not
create or use a root /src/. Shared code lives in /shared. Place all Edit
Modals backend changes inside this path:

  -----------------------------------------------------------------
  Path\
  /apps/user-service/src
  -----------------------------------------------------------------

  -----------------------------------------------------------------

Controllers, modules, dto, entities, and config all live under this
path.

## Step 3: Clone & Install

  -----------------------------------------------------------------
  Shell\
  \# 1) clone the monorepo\
  git clone git@github.com:\<org\>/marketeq-projects-nestjs.git\
  cd marketeq-projects-nestjs\
  \
  \# 2) install workspace deps\
  npm ci
  -----------------------------------------------------------------

  -----------------------------------------------------------------

## Step 4: Local Infrastructure (Docker Compose)

Create infra.compose.yml at the repo root:

  -----------------------------------------------------------------
  YAML\
  version: \"3.9\"\
  services:\
  postgres:\
  image: postgres:16\
  container_name: mq_pg\
  environment:\
  POSTGRES_USER: marketeq\
  POSTGRES_PASSWORD: marketeq\
  POSTGRES_DB: marketeq\
  ports: \[\"5432:5432\"\]\
  volumes:\
  - pgdata:/var/lib/postgresql/data\
  \
  minio:\
  image: quay.io/minio/minio:RELEASE.2024-09-22T00-00-00Z\
  container_name: mq_minio\
  environment:\
  MINIO_ROOT_USER: minioadmin\
  MINIO_ROOT_PASSWORD: minioadmin\
  command: server /data \--console-address \":9001\"\
  ports:\
  - \"9000:9000\"\
  - \"9001:9001\"\
  volumes:\
  - minio:/data\
  \
  volumes:\
  pgdata:\
  minio:
  -----------------------------------------------------------------

  -----------------------------------------------------------------

Bring it up:

  -----------------------------------------------------------------
  Shell\
  docker compose -f infra.compose.yml up -d
  -----------------------------------------------------------------

  -----------------------------------------------------------------

Create a bucket for certification attachments (via MinIO console
http://localhost:9001): sign in with minioadmin/minioadmin, create
bucket user-certifications, keep it private (we will use presigned
URLs).

## Step 5: Environment Variables

Create apps/user-service/.env.local:

  ----------------------------------------------------------------------
  dotenv\
  \# Runtime\
  NODE_ENV=development\
  PORT=3001\
  \
  \# Database (Postgres via Docker)\
  DATABASE_URL=postgresql://marketeq:marketeq@localhost:5432/marketeq\
  \
  \# CORS\
  CORS_ORIGIN=http://localhost:3000\
  \
  \# Rate limiting (Edit Modals: 10 writes/min/user)\
  THROTTLE_TTL=60\
  THROTTLE_LIMIT=10\
  \
  \# S3-compatible storage (MinIO local)\
  FILES_S3_ENDPOINT=http://localhost:9000\
  FILES_S3_REGION=us-east-1\
  FILES_S3_BUCKET_CERTS=user-certifications\
  FILES_S3_ACCESS_KEY=minioadmin\
  FILES_S3_SECRET_KEY=minioadmin\
  FILES_S3_SIGNED_URL_TTL=300
  ----------------------------------------------------------------------

  ----------------------------------------------------------------------

## Step 6: Service Bootstrapping (NestJS)

### Backend app entrypoint

Ensure apps/user-service/src/main.ts exposes /health and reads env:

  -----------------------------------------------------------------
  TypeScript\
  // apps/user-service/src/main.ts\
  import { NestFactory } from \'@nestjs/core\';\
  import { AppModule } from \'./app.module\';\
  import { ValidationPipe } from \'@nestjs/common\';\
  \
  async function bootstrap() {\
  const app = await NestFactory.create(AppModule);\
  const origin = process.env.CORS_ORIGIN?.split(\',\').map(s =\>
  s.trim());\
  app.enableCors({ origin: origin && origin.length ? origin : true
  });\
  app.useGlobalPipes(new ValidationPipe({ whitelist: True,
  forbidUnknownValues: False }));\
  const port = Number(process.env.PORT \|\| 3001);\
  await app.listen(port);\
  console.log(\`user-service listening on
  http://localhost:\${port}\`);\
  }\
  bootstrap();
  -----------------------------------------------------------------

  -----------------------------------------------------------------

### Health controller

  -----------------------------------------------------------------
  TypeScript\
  // apps/user-service/src/controllers/health.controller.ts\
  import { Controller, Get } from \'@nestjs/common\';\
  \
  \@Controller(\'health\')\
  export class HealthController {\
  \@Get()\
  health() {\
  return { status: \'ok\' };\
  }\
  }
  -----------------------------------------------------------------

  -----------------------------------------------------------------

### App module wiring

  -----------------------------------------------------------------
  TypeScript\
  // apps/user-service/src/app.module.ts\
  import { Module } from \'@nestjs/common\';\
  import { TypeOrmModule } from \'@nestjs/typeorm\';\
  import { HealthController } from
  \'./controllers/health.controller\';\
  \
  \@Module({\
  imports: \[\
  TypeOrmModule.forRoot({\
  type: \'postgres\',\
  url: process.env.DATABASE_URL,\
  autoLoadEntities: true,\
  synchronize: false,\
  }),\
  \],\
  controllers: \[HealthController\],\
  })\
  export class AppModule {}
  -----------------------------------------------------------------

  -----------------------------------------------------------------

## Step 7: NPM Scripts (Workspace + Service)

### Root package.json

  -----------------------------------------------------------------
  JSON\
  {\
  \"name\": \"marketeq-projects-backend-nest\",\
  \"private\": true,\
  \"workspaces\": \[\"apps/\*\"\],\
  \"scripts\": {\
  \"build\": \"nest build\",\
  \"start:dev\": \"nest start \--watch\",\
  \"lint\": \"eslint .\",\
  \"test\": \"jest\"\
  }\
  }
  -----------------------------------------------------------------

  -----------------------------------------------------------------

### Service package.json

  -----------------------------------------------------------------
  JSON\
  {\
  \"name\": \"user-service\",\
  \"private\": true,\
  \"scripts\": {\
  \"start\": \"node dist/main.js\",\
  \"start:dev\": \"nest start user-service \--watch\",\
  \"build\": \"nest build user-service\",\
  \"lint\": \"eslint . \--ext .ts\",\
  \"typeorm\": \"ts-node -r tsconfig-paths/register
  ./node_modules/typeorm/cli.js -d
  ./apps/user-service/src/config/typeorm.config.ts\",\
  \"migration:generate\": \"npm run typeorm \-- migration:generate
  apps/user-service/migrations/\$(date +%s)-auto\",\
  \"migration:run\": \"npm run typeorm \-- migration:run\",\
  \"migration:revert\": \"npm run typeorm \-- migration:revert\"\
  },\
  \"dependencies\": {\
  \"@nestjs/common\": \"\^10.0.0\",\
  \"@nestjs/core\": \"\^10.0.0\",\
  \"@nestjs/typeorm\": \"\^10.0.0\",\
  \"class-transformer\": \"\^0.5.1\",\
  \"class-validator\": \"\^0.14.0\",\
  \"pg\": \"\^8.11.3\",\
  \"reflect-metadata\": \"\^0.1.13\",\
  \"rxjs\": \"\^7.8.1\",\
  \"typeorm\": \"\^0.3.20\"\
  },\
  \"devDependencies\": {\
  \"@nestjs/cli\": \"\^10.0.0\",\
  \"ts-node\": \"\^10.9.2\",\
  \"tsconfig-paths\": \"\^4.2.0\",\
  \"typescript\": \"\^5.4.0\",\
  \"eslint\": \"\^8.57.0\"\
  }\
  }
  -----------------------------------------------------------------

  -----------------------------------------------------------------

### TypeORM data source

  -----------------------------------------------------------------
  TypeScript\
  import { DataSource } from \'typeorm\';\
  export default new DataSource({\
  type: \'postgres\',\
  url: process.env.DATABASE_URL,\
  entities: \[\_\_dirname + \'/../\*\*/\*.entity.{ts,js}\'\],\
  migrations: \[\'apps/user-service/migrations/\*.{ts,js}\'\],\
  migrationsTableName: \'typeorm_migrations_user_service\',\
  synchronize: false\
  });
  -----------------------------------------------------------------

  -----------------------------------------------------------------

## Step 8: Run Locally

  -----------------------------------------------------------------
  Shell\
  \# in repo root (workspaces)\
  npm run build\
  npm run start:dev \--workspace=user-service\
  \
  \# or from service folder:\
  \# cd apps/user-service && npm run start:dev\
  \
  \# verify health\
  curl http://localhost:3001/health\
  \# =\> {\"status\":\"ok\"}
  -----------------------------------------------------------------

  -----------------------------------------------------------------

## Step 9: Database Migrations (Skeleton)

  -----------------------------------------------------------------
  Shell\
  mkdir -p apps/user-service/migrations\
  \
  \# generate (blank or auto)\
  npm run migration:generate \--workspace=user-service\
  \
  \# run migrations\
  npm run migration:run \--workspace=user-service\
  \
  \# rollback\
  npm run migration:revert \--workspace=user-service
  -----------------------------------------------------------------

  -----------------------------------------------------------------

## Step 10: Dockerfile (Service)

Create apps/user-service/Dockerfile:

  -----------------------------------------------------------------
  Dockerfile\
  FROM node:20-alpine\
  WORKDIR /usr/src/app\
  \
  \# install deps\
  COPY package\*.json ./\
  COPY apps/user-service/package\*.json ./apps/user-service/\
  RUN npm ci\
  \
  \# copy source\
  COPY . .\
  \
  \# build service\
  RUN npm run build \--workspace=user-service\
  \
  \# expose and run\
  ENV PORT=3001\
  EXPOSE 3001\
  CMD \[\"node\", \"dist/apps/user-service/main.js\"\]
  -----------------------------------------------------------------

  -----------------------------------------------------------------

## Step 11: Render Deployment (Notes)

- Service: user-service

- Docker image: Built from apps/user-service/Dockerfile

- Port: PORT=3001

- Health check: /health (200--299 = healthy)

- Env vars: Provide all vars from .env.local, replacing with cloud DB
  and S3/R2 endpoints

- File storage: Use cloud keys; never commit secrets

## Step 12: Seed & Test Data (Optional for Local)

### Seed script

  -----------------------------------------------------------------
  TypeScript\
  import \'reflect-metadata\';\
  import dataSource from \'../config/typeorm.config\';\
  async function run() {\
  const ds = await dataSource.initialize();\
  // insert a test user row or minimal entities required for Edit
  Modals QA\
  await ds.destroy();\
  console.log(\'Seed complete\');\
  }\
  run().catch(err =\> { console.error(err); process.exit(1); });
  -----------------------------------------------------------------

  -----------------------------------------------------------------

### Run seed

  -----------------------------------------------------------------
  Shell\
  ts-node -r tsconfig-paths/register
  apps/user-service/src/scripts/seed.ts
  -----------------------------------------------------------------

  -----------------------------------------------------------------

## Step 13: Verification Checklist (Local)

- docker compose -f infra.compose.yml up -d shows mq_pg and mq_minio
  healthy.

- npm run start:dev \--workspace=user-service runs without errors.

- GET http://localhost:3001/health returns { \"status\": \"ok\" }.

- npm run migration:run \--workspace=user-service applies cleanly.

- MinIO console shows user-certifications bucket (private).

- Env vars are read and CORS behaves as expected.

## Step 14: Troubleshooting

- Port already in use: change PORT in .env.local and Docker/Render
  config.

- Cannot connect to DB: verify DATABASE_URL, compose status, and
  network.

- Presign errors: confirm FILES_S3\_\* values and bucket existence.

- CORS blocked: set CORS_ORIGIN to your frontend origin(s),
  comma-separated.
