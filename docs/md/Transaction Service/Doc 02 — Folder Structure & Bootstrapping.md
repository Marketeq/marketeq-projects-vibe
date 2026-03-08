**[MARKETEQ BACKEND]{.smallcaps}**

**transaction-service**

**Doc 02 --- Folder Structure & Bootstrapping**

  -----------------------------------------------------------------------
  **Field**          **Value**
  ------------------ ----------------------------------------------------
  Service Name       transaction-service

  Doc Number         Doc 02

  Prerequisites      Doc 00 --- Service Overview & Repo Placement, Doc 01
                     --- Docker & Runtime Setup

  Framework          NestJS 10 + TypeScript (strict mode)

  ORM                TypeORM with PostgreSQL

  Config             NestJS ConfigModule with class-validator

  Modules Wired      TransactionModule, InvoiceModule, ExportModule,
                     AuditModule, ShareModule, HealthModule
  -----------------------------------------------------------------------

# **1. Purpose**

This document defines the complete folder structure for
transaction-service and walks through the bootstrapping sequence ---
from main.ts startup through AppModule wiring to each individual feature
module. It establishes the structural foundation that all subsequent
documents (data models, API endpoints, integrations) build on.

This document does not cover entity definitions, API routes, or
integration logic. Those are covered in Doc 03 through Doc 05. The
purpose here is to wire up the skeleton so every module has a home and
the application boots cleanly before any business logic is added.

+-----------------------------------------------------------------------+
| **Prerequisites**                                                     |
|                                                                       |
| Complete Doc 01 (Docker & Runtime Setup) before this document. The    |
| environment variables and configuration validator defined in Doc 01   |
| are imported and used here. Running npm run start:dev at the end of   |
| this doc should produce a running service with only the health        |
| endpoint responding.                                                  |
+=======================================================================+

# **2. Canonical Folder Structure**

Every file in transaction-service must live under
/apps/transaction-service/src. The structure below is the complete
canonical layout for this service. Create all folders now even if the
files inside them are populated in later documents.

+-----------------------------------------------------------------------+
| **\# /apps/transaction-service/**                                     |
+-----------------------------------------------------------------------+
| apps/transaction-service/                                             |
|                                                                       |
| ├── Dockerfile \# Doc 01                                              |
|                                                                       |
| ├── Supabase.yaml \# Doc 01                                           |
|                                                                       |
| ├── package.json                                                      |
|                                                                       |
| ├── tsconfig.json                                                     |
|                                                                       |
| ├── tsconfig.build.json                                               |
|                                                                       |
| ├── .env.example \# Doc 01                                            |
|                                                                       |
| └── src/                                                              |
|                                                                       |
| ├── main.ts \# Section 4 --- entry point                              |
|                                                                       |
| ├── app.module.ts \# Section 5 --- root module                        |
|                                                                       |
| │                                                                     |
|                                                                       |
| ├── config/                                                           |
|                                                                       |
| │ └── transaction.config.ts \# Doc 01 --- env validation              |
|                                                                       |
| │                                                                     |
|                                                                       |
| ├── controllers/                                                      |
|                                                                       |
| │ ├── health.controller.ts \# Doc 01                                  |
|                                                                       |
| │ ├── transaction.controller.ts \# Doc 04                             |
|                                                                       |
| │ ├── invoice.controller.ts \# Doc 04                                 |
|                                                                       |
| │ └── export.controller.ts \# Doc 04                                  |
|                                                                       |
| │                                                                     |
|                                                                       |
| ├── services/                                                         |
|                                                                       |
| │ ├── transaction.service.ts \# Doc 04                                |
|                                                                       |
| │ ├── invoice.service.ts \# Doc 04                                    |
|                                                                       |
| │ ├── export.service.ts \# Doc 04                                     |
|                                                                       |
| │ ├── audit.service.ts \# Doc 04                                      |
|                                                                       |
| │ └── share.service.ts \# Doc 05                                      |
|                                                                       |
| │                                                                     |
|                                                                       |
| ├── consumers/ \# RabbitMQ event consumers                            |
|                                                                       |
| │ ├── billing.consumer.ts \# Doc 05                                   |
|                                                                       |
| │ ├── timetracking.consumer.ts \# Doc 05                              |
|                                                                       |
| │ └── payout.consumer.ts \# Doc 05                                    |
|                                                                       |
| │                                                                     |
|                                                                       |
| ├── dto/                                                              |
|                                                                       |
| │ ├── transaction.dto.ts \# Doc 03                                    |
|                                                                       |
| │ ├── invoice.dto.ts \# Doc 03                                        |
|                                                                       |
| │ ├── filter.dto.ts \# Doc 03                                         |
|                                                                       |
| │ └── export.dto.ts \# Doc 03                                         |
|                                                                       |
| │                                                                     |
|                                                                       |
| ├── entities/                                                         |
|                                                                       |
| │ ├── transaction.entity.ts \# Doc 03                                 |
|                                                                       |
| │ ├── invoice.entity.ts \# Doc 03                                     |
|                                                                       |
| │ ├── transaction-detail.entity.ts \# Doc 03                          |
|                                                                       |
| │ ├── payment-method.entity.ts \# Doc 03                              |
|                                                                       |
| │ └── contract.entity.ts \# Doc 03                                    |
|                                                                       |
| │                                                                     |
|                                                                       |
| └── modules/                                                          |
|                                                                       |
| ├── transaction.module.ts \# Section 6.1                              |
|                                                                       |
| ├── invoice.module.ts \# Section 6.2                                  |
|                                                                       |
| ├── export.module.ts \# Section 6.3                                   |
|                                                                       |
| ├── audit.module.ts \# Section 6.4                                    |
|                                                                       |
| ├── share.module.ts \# Section 6.5                                    |
|                                                                       |
| └── health.module.ts \# Section 6.6                                   |
+=======================================================================+

+-----------------------------------------------------------------------+
| **Folder Structure Policy**                                           |
|                                                                       |
| All code must live under /apps/transaction-service/src. Never create  |
| a /src directory at the repo root. Never import from another          |
| service\'s src/ directory. Shared utilities belong in /shared at the  |
| repo root.                                                            |
+=======================================================================+

## **2.1 File Responsibility Map**

  ------------------------------------------------------------------------------------
  **File / Folder**                  **Owned By** **Responsibility**
  ---------------------------------- ------------ ------------------------------------
  main.ts                            Doc 02 (this Application entry point. Boots
                                     doc)         NestJS, sets global pipes and
                                                  prefix.

  app.module.ts                      Doc 02 (this Root module. Wires all feature
                                     doc)         modules, TypeORM, and ConfigModule.

  config/transaction.config.ts       Doc 01       Environment variable validation.
                                                  Imported by AppModule.

  controllers/health.controller.ts   Doc 01       GET /health and GET /ready
                                                  endpoints.

  controllers/\*.controller.ts       Doc 04       All transaction, invoice, and export
                                                  HTTP route handlers.

  services/\*.service.ts             Doc 04 / Doc All business logic --- queries,
                                     05           filtering, export, audit, share
                                                  context.

  consumers/\*.consumer.ts           Doc 05       RabbitMQ message consumers for
                                                  billing, time-tracking, and payout
                                                  events.

  dto/\*.dto.ts                      Doc 03       Data Transfer Objects with
                                                  class-validator rules for all input
                                                  and output shapes.

  entities/\*.entity.ts              Doc 03       TypeORM entities mapping to
                                                  PostgreSQL tables defined in the
                                                  data dictionary.

  modules/\*.module.ts               Doc 02 (this Feature module definitions ---
                                     doc)         providers, controllers, imports,
                                                  exports.
  ------------------------------------------------------------------------------------

# **3. TypeScript Configuration**

transaction-service uses strict TypeScript. The following tsconfig files
must be present at the service root.

## **3.1 tsconfig.json**

**/apps/transaction-service/tsconfig.json**

+-----------------------------------------------------------------------+
| **tsconfig.json**                                                     |
+-----------------------------------------------------------------------+
| {                                                                     |
|                                                                       |
| \"compilerOptions\": {                                                |
|                                                                       |
| \"module\": \"commonjs\",                                             |
|                                                                       |
| \"declaration\": true,                                                |
|                                                                       |
| \"removeComments\": true,                                             |
|                                                                       |
| \"emitDecoratorMetadata\": true,                                      |
|                                                                       |
| \"experimentalDecorators\": true,                                     |
|                                                                       |
| \"allowSyntheticDefaultImports\": true,                               |
|                                                                       |
| \"target\": \"ES2021\",                                               |
|                                                                       |
| \"sourceMap\": true,                                                  |
|                                                                       |
| \"outDir\": \"./dist\",                                               |
|                                                                       |
| \"baseUrl\": \"./\",                                                  |
|                                                                       |
| \"incremental\": true,                                                |
|                                                                       |
| \"skipLibCheck\": true,                                               |
|                                                                       |
| \"strictNullChecks\": true,                                           |
|                                                                       |
| \"noImplicitAny\": true,                                              |
|                                                                       |
| \"strict\": true,                                                     |
|                                                                       |
| \"strictBindCallApply\": true,                                        |
|                                                                       |
| \"forceConsistentCasingInFileNames\": true,                           |
|                                                                       |
| \"noFallthroughCasesInSwitch\": true                                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **3.2 tsconfig.build.json**

**/apps/transaction-service/tsconfig.build.json**

+-----------------------------------------------------------------------+
| **tsconfig.build.json**                                               |
+-----------------------------------------------------------------------+
| {                                                                     |
|                                                                       |
| \"extends\": \"./tsconfig.json\",                                     |
|                                                                       |
| \"exclude\": \[\"node_modules\", \"test\", \"dist\",                  |
| \"\*\*/\*spec.ts\"\]                                                  |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **4. main.ts --- Application Entry Point**

main.ts is the first file executed when the service starts. It creates
the NestJS application instance, applies global configuration, and
begins listening for HTTP requests. No business logic belongs here.

**/apps/transaction-service/src/main.ts**

+-----------------------------------------------------------------------+
| **src/main.ts**                                                       |
+-----------------------------------------------------------------------+
| import { NestFactory } from \'@nestjs/core\';                         |
|                                                                       |
| import { ValidationPipe, Logger } from \'@nestjs/common\';            |
|                                                                       |
| import { AppModule } from \'./app.module\';                           |
|                                                                       |
| async function bootstrap() {                                          |
|                                                                       |
| const logger = new Logger(\'transaction-service\');                   |
|                                                                       |
| const app = await NestFactory.create(AppModule);                      |
|                                                                       |
| // ── Global route prefix                                             |
| ──────────────────────────────────────────────                        |
|                                                                       |
| // All routes are prefixed with /v1 except /health and /ready         |
|                                                                       |
| app.setGlobalPrefix(\'v1\', {                                         |
|                                                                       |
| exclude: \[\'health\', \'ready\'\],                                   |
|                                                                       |
| });                                                                   |
|                                                                       |
| // ── Global validation pipe                                          |
| ───────────────────────────────────────────                           |
|                                                                       |
| // Automatically validates all incoming DTOs using class-validator    |
|                                                                       |
| // whitelist: strips properties not defined in the DTO                |
|                                                                       |
| // forbidNonWhitelisted: throws 400 if unknown properties are sent    |
|                                                                       |
| // transform: auto-converts query params and body to DTO types        |
|                                                                       |
| app.useGlobalPipes(                                                   |
|                                                                       |
| new ValidationPipe({                                                  |
|                                                                       |
| whitelist: true,                                                      |
|                                                                       |
| forbidNonWhitelisted: true,                                           |
|                                                                       |
| transform: true,                                                      |
|                                                                       |
| transformOptions: {                                                   |
|                                                                       |
| enableImplicitConversion: true,                                       |
|                                                                       |
| },                                                                    |
|                                                                       |
| }),                                                                   |
|                                                                       |
| );                                                                    |
|                                                                       |
| // ── CORS                                                            |
| ─────────────────────────────────────────────────────────────         |
|                                                                       |
| // Restrict to Marketeq frontend origin in production                 |
|                                                                       |
| // Origins are expanded in staging and local environments             |
|                                                                       |
| app.enableCors({                                                      |
|                                                                       |
| origin: process.env.NODE_ENV === \'production\'                       |
|                                                                       |
| ? \[\'https://marketeq.com\', \'https://app.marketeq.com\'\]          |
|                                                                       |
| : true,                                                               |
|                                                                       |
| methods: \[\'GET\', \'POST\'\],                                       |
|                                                                       |
| credentials: true,                                                    |
|                                                                       |
| });                                                                   |
|                                                                       |
| // ── Start listening                                                 |
| ──────────────────────────────────────────────────                    |
|                                                                       |
| const port = process.env.PORT ?? 3007;                                |
|                                                                       |
| await app.listen(port);                                               |
|                                                                       |
| logger.log(\`transaction-service running on port \${port}\`);         |
|                                                                       |
| logger.log(\`Health check: http://localhost:\${port}/health\`);       |
|                                                                       |
| }                                                                     |
|                                                                       |
| bootstrap();                                                          |
+=======================================================================+

## **4.1 main.ts Rules**

- Never add business logic to main.ts. Controllers, services, and
  modules own that.

- The global prefix /v1 excludes /health and /ready so Supabase can
  reach them without any path prefix.

- ValidationPipe with whitelist: true ensures unknown fields sent by the
  frontend are silently stripped rather than passed to services.

- forbidNonWhitelisted: true ensures the API returns 400 rather than
  silently ignoring unexpected fields --- this surfaces integration bugs
  early.

- transform: true enables automatic type coercion so query parameters
  (which arrive as strings) are converted to numbers, booleans, and Date
  objects as defined in filter DTOs.

# **5. app.module.ts --- Root Module**

AppModule is the root of the NestJS dependency injection tree. It
imports all feature modules, wires the database connection, and loads
configuration. Nothing is instantiated in the application unless it is
registered here or in a module imported here.

**/apps/transaction-service/src/app.module.ts**

+-----------------------------------------------------------------------+
| **src/app.module.ts**                                                 |
+-----------------------------------------------------------------------+
| import { Module } from \'@nestjs/common\';                            |
|                                                                       |
| import { ConfigModule, ConfigService } from \'@nestjs/config\';       |
|                                                                       |
| import { TypeOrmModule } from \'@nestjs/typeorm\';                    |
|                                                                       |
| // Config validator from Doc 01                                       |
|                                                                       |
| import { validate } from \'./config/transaction.config\';             |
|                                                                       |
| // Entities --- populated in Doc 03                                   |
|                                                                       |
| import { Transaction } from \'./entities/transaction.entity\';        |
|                                                                       |
| import { Invoice } from \'./entities/invoice.entity\';                |
|                                                                       |
| import { TransactionDetail } from                                     |
| \'./entities/transaction-detail.entity\';                             |
|                                                                       |
| import { PaymentMethod } from \'./entities/payment-method.entity\';   |
|                                                                       |
| import { Contract } from \'./entities/contract.entity\';              |
|                                                                       |
| // Feature modules                                                    |
|                                                                       |
| import { HealthModule } from \'./modules/health.module\';             |
|                                                                       |
| import { TransactionModule } from \'./modules/transaction.module\';   |
|                                                                       |
| import { InvoiceModule } from \'./modules/invoice.module\';           |
|                                                                       |
| import { ExportModule } from \'./modules/export.module\';             |
|                                                                       |
| import { AuditModule } from \'./modules/audit.module\';               |
|                                                                       |
| import { ShareModule } from \'./modules/share.module\';               |
|                                                                       |
| \@Module({                                                            |
|                                                                       |
| imports: \[                                                           |
|                                                                       |
| // ── Configuration                                                   |
| ──────────────────────────────────────────────────                    |
|                                                                       |
| // isGlobal: true makes ConfigService injectable in every module      |
|                                                                       |
| // without needing to re-import ConfigModule in each one              |
|                                                                       |
| ConfigModule.forRoot({                                                |
|                                                                       |
| isGlobal: true,                                                       |
|                                                                       |
| validate,                                                             |
|                                                                       |
| }),                                                                   |
|                                                                       |
| // ── Database                                                        |
| ───────────────────────────────────────────────────────               |
|                                                                       |
| // TypeORM async config reads DATABASE_URL from ConfigService         |
|                                                                       |
| // after ConfigModule has validated and loaded env vars               |
|                                                                       |
| TypeOrmModule.forRootAsync({                                          |
|                                                                       |
| imports: \[ConfigModule\],                                            |
|                                                                       |
| inject: \[ConfigService\],                                            |
|                                                                       |
| useFactory: (config: ConfigService) =\> ({                            |
|                                                                       |
| type: \'postgres\',                                                   |
|                                                                       |
| url: config.get\<string\>(\'DATABASE_URL\'),                          |
|                                                                       |
| schema: config.get\<string\>(\'SUPABASE_SCHEMA\') ??                  |
| \'transaction_service\',                                              |
|                                                                       |
| entities: \[                                                          |
|                                                                       |
| Transaction,                                                          |
|                                                                       |
| Invoice,                                                              |
|                                                                       |
| TransactionDetail,                                                    |
|                                                                       |
| PaymentMethod,                                                        |
|                                                                       |
| Contract,                                                             |
|                                                                       |
| \],                                                                   |
|                                                                       |
| // synchronize: false in all environments                             |
|                                                                       |
| // Schema is managed by migrations only --- never auto-synced         |
|                                                                       |
| synchronize: false,                                                   |
|                                                                       |
| logging: config.get\<string\>(\'NODE_ENV\') !== \'production\',       |
|                                                                       |
| ssl: config.get\<string\>(\'NODE_ENV\') === \'production\'            |
|                                                                       |
| ? { rejectUnauthorized: false }                                       |
|                                                                       |
| : false,                                                              |
|                                                                       |
| }),                                                                   |
|                                                                       |
| }),                                                                   |
|                                                                       |
| // ── Feature Modules                                                 |
| ────────────────────────────────────────────────                      |
|                                                                       |
| HealthModule,                                                         |
|                                                                       |
| TransactionModule,                                                    |
|                                                                       |
| InvoiceModule,                                                        |
|                                                                       |
| ExportModule,                                                         |
|                                                                       |
| AuditModule,                                                          |
|                                                                       |
| ShareModule,                                                          |
|                                                                       |
| \],                                                                   |
|                                                                       |
| })                                                                    |
|                                                                       |
| export class AppModule {}                                             |
+=======================================================================+

## **5.1 AppModule Rules**

- synchronize: false is non-negotiable. TypeORM must never auto-sync the
  schema in any environment. All schema changes are handled via
  migrations documented in Doc 03.

- ConfigModule.forRoot with isGlobal: true means every module in the
  application can inject ConfigService without re-importing
  ConfigModule.

- TypeOrmModule.forRootAsync is used instead of forRoot so the database
  configuration can read from ConfigService after environment variables
  have been validated.

- SSL is enabled with rejectUnauthorized: false in production to connect
  to Supabase PostgreSQL which uses a self-signed certificate.

- Query logging is enabled in non-production environments to aid local
  development and debugging.

+-----------------------------------------------------------------------+
| **Never use synchronize: true**                                       |
|                                                                       |
| Setting synchronize: true tells TypeORM to automatically alter the    |
| database schema based on entity definitions. In production this will  |
| silently drop columns and destroy data. It is disabled                |
| unconditionally in this service. All schema changes must go through   |
| migration scripts defined in Doc 03.                                  |
+=======================================================================+

# **6. Feature Module Definitions**

Each feature module groups a related set of controllers, services,
consumers, and entity repositories. The modules defined here are
skeletal --- their controllers and services are populated in Doc 03
through Doc 05. The purpose in this document is to establish the wiring
so the application compiles and boots.

## **6.1 TransactionModule**

Owns all transaction list, detail, search, and filter functionality.
This is the primary module for the client-facing Transactions tab.

**/apps/transaction-service/src/modules/transaction.module.ts**

+-----------------------------------------------------------------------+
| **src/modules/transaction.module.ts**                                 |
+-----------------------------------------------------------------------+
| import { Module } from \'@nestjs/common\';                            |
|                                                                       |
| import { TypeOrmModule } from \'@nestjs/typeorm\';                    |
|                                                                       |
| import { Transaction } from \'../entities/transaction.entity\';       |
|                                                                       |
| import { TransactionDetail } from                                     |
| \'../entities/transaction-detail.entity\';                            |
|                                                                       |
| import { Contract } from \'../entities/contract.entity\';             |
|                                                                       |
| import { PaymentMethod } from \'../entities/payment-method.entity\';  |
|                                                                       |
| // Populated in Doc 04                                                |
|                                                                       |
| import { TransactionController } from                                 |
| \'../controllers/transaction.controller\';                            |
|                                                                       |
| import { TransactionService } from                                    |
| \'../services/transaction.service\';                                  |
|                                                                       |
| // Populated in Doc 05                                                |
|                                                                       |
| import { BillingConsumer } from \'../consumers/billing.consumer\';    |
|                                                                       |
| import { TimeTrackingConsumer } from                                  |
| \'../consumers/timetracking.consumer\';                               |
|                                                                       |
| import { PayoutConsumer } from \'../consumers/payout.consumer\';      |
|                                                                       |
| \@Module({                                                            |
|                                                                       |
| imports: \[                                                           |
|                                                                       |
| // Register TypeORM repositories for entities used by this module     |
|                                                                       |
| TypeOrmModule.forFeature(\[                                           |
|                                                                       |
| Transaction,                                                          |
|                                                                       |
| TransactionDetail,                                                    |
|                                                                       |
| Contract,                                                             |
|                                                                       |
| PaymentMethod,                                                        |
|                                                                       |
| \]),                                                                  |
|                                                                       |
| \],                                                                   |
|                                                                       |
| controllers: \[TransactionController\],                               |
|                                                                       |
| providers: \[                                                         |
|                                                                       |
| TransactionService,                                                   |
|                                                                       |
| BillingConsumer,                                                      |
|                                                                       |
| TimeTrackingConsumer,                                                 |
|                                                                       |
| PayoutConsumer,                                                       |
|                                                                       |
| \],                                                                   |
|                                                                       |
| // Export TransactionService so AuditModule and ExportModule can use  |
| it                                                                    |
|                                                                       |
| exports: \[TransactionService\],                                      |
|                                                                       |
| })                                                                    |
|                                                                       |
| export class TransactionModule {}                                     |
+=======================================================================+

## **6.2 InvoiceModule**

Owns all invoice list, detail, and Stripe hosted invoice retrieval
functionality. This is the primary module for the client-facing Invoices
tab.

**/apps/transaction-service/src/modules/invoice.module.ts**

+-----------------------------------------------------------------------+
| **src/modules/invoice.module.ts**                                     |
+-----------------------------------------------------------------------+
| import { Module } from \'@nestjs/common\';                            |
|                                                                       |
| import { TypeOrmModule } from \'@nestjs/typeorm\';                    |
|                                                                       |
| import { HttpModule } from \'@nestjs/axios\';                         |
|                                                                       |
| import { Invoice } from \'../entities/invoice.entity\';               |
|                                                                       |
| import { Contract } from \'../entities/contract.entity\';             |
|                                                                       |
| // Populated in Doc 04                                                |
|                                                                       |
| import { InvoiceController } from                                     |
| \'../controllers/invoice.controller\';                                |
|                                                                       |
| import { InvoiceService } from \'../services/invoice.service\';       |
|                                                                       |
| \@Module({                                                            |
|                                                                       |
| imports: \[                                                           |
|                                                                       |
| TypeOrmModule.forFeature(\[Invoice, Contract\]),                      |
|                                                                       |
| // HttpModule enables outbound HTTP calls to Stripe invoice API       |
|                                                                       |
| HttpModule.register({                                                 |
|                                                                       |
| timeout: 10000,                                                       |
|                                                                       |
| maxRedirects: 3,                                                      |
|                                                                       |
| }),                                                                   |
|                                                                       |
| \],                                                                   |
|                                                                       |
| controllers: \[InvoiceController\],                                   |
|                                                                       |
| providers: \[InvoiceService\],                                        |
|                                                                       |
| exports: \[InvoiceService\],                                          |
|                                                                       |
| })                                                                    |
|                                                                       |
| export class InvoiceModule {}                                         |
+=======================================================================+

+-----------------------------------------------------------------------+
| **Stripe in InvoiceModule**                                           |
|                                                                       |
| InvoiceModule uses HttpModule to make outbound GET requests to the    |
| Stripe API to retrieve hosted invoice URLs and PDF links.             |
| transaction-service does NOT use Stripe to process payments --- it    |
| only reads invoice data from Stripe that billing-service has already  |
| created. Full Stripe integration details are in Doc 05.               |
+=======================================================================+

## **6.3 ExportModule**

Owns CSV and PDF export generation for both transactions and invoices.
Depends on TransactionService and InvoiceService to fetch the data being
exported.

**/apps/transaction-service/src/modules/export.module.ts**

+-----------------------------------------------------------------------+
| **src/modules/export.module.ts**                                      |
+-----------------------------------------------------------------------+
| import { Module } from \'@nestjs/common\';                            |
|                                                                       |
| import { TransactionModule } from \'./transaction.module\';           |
|                                                                       |
| import { InvoiceModule } from \'./invoice.module\';                   |
|                                                                       |
| // Populated in Doc 04                                                |
|                                                                       |
| import { ExportController } from                                      |
| \'../controllers/export.controller\';                                 |
|                                                                       |
| import { ExportService } from \'../services/export.service\';         |
|                                                                       |
| \@Module({                                                            |
|                                                                       |
| imports: \[                                                           |
|                                                                       |
| // Import TransactionModule and InvoiceModule to access their         |
| exported services                                                     |
|                                                                       |
| TransactionModule,                                                    |
|                                                                       |
| InvoiceModule,                                                        |
|                                                                       |
| \],                                                                   |
|                                                                       |
| controllers: \[ExportController\],                                    |
|                                                                       |
| providers: \[ExportService\],                                         |
|                                                                       |
| })                                                                    |
|                                                                       |
| export class ExportModule {}                                          |
+=======================================================================+

## **6.4 AuditModule**

Owns the backend audit log. Records all transaction views, exports, and
problem report submissions. Not exposed to the frontend --- internal use
only.

**/apps/transaction-service/src/modules/audit.module.ts**

+-----------------------------------------------------------------------+
| **src/modules/audit.module.ts**                                       |
+-----------------------------------------------------------------------+
| import { Module, Global } from \'@nestjs/common\';                    |
|                                                                       |
| import { TypeOrmModule } from \'@nestjs/typeorm\';                    |
|                                                                       |
| import { Transaction } from \'../entities/transaction.entity\';       |
|                                                                       |
| // Populated in Doc 04                                                |
|                                                                       |
| import { AuditService } from \'../services/audit.service\';           |
|                                                                       |
| // \@Global() makes AuditService injectable across all modules        |
|                                                                       |
| // without each module needing to import AuditModule explicitly       |
|                                                                       |
| \@Global()                                                            |
|                                                                       |
| \@Module({                                                            |
|                                                                       |
| imports: \[TypeOrmModule.forFeature(\[Transaction\])\],               |
|                                                                       |
| providers: \[AuditService\],                                          |
|                                                                       |
| exports: \[AuditService\],                                            |
|                                                                       |
| })                                                                    |
|                                                                       |
| export class AuditModule {}                                           |
+=======================================================================+

+-----------------------------------------------------------------------+
| **Why \@Global() on AuditModule**                                     |
|                                                                       |
| AuditService needs to be called from TransactionService,              |
| InvoiceService, and ExportService to log views, downloads, and        |
| exports. Marking AuditModule as \@Global() makes AuditService         |
| available for injection across the entire application without each    |
| module needing to explicitly import AuditModule. This is the correct  |
| NestJS pattern for cross-cutting concerns like logging and auditing.  |
+=======================================================================+

## **6.5 ShareModule**

Owns the share context payload sent to the invitations-service
share/invite modal when a user shares a transaction or invoice.
Constructs the item context line that appears beneath the share modal
headline.

**/apps/transaction-service/src/modules/share.module.ts**

+-----------------------------------------------------------------------+
| **src/modules/share.module.ts**                                       |
+-----------------------------------------------------------------------+
| import { Module } from \'@nestjs/common\';                            |
|                                                                       |
| import { TransactionModule } from \'./transaction.module\';           |
|                                                                       |
| import { InvoiceModule } from \'./invoice.module\';                   |
|                                                                       |
| // Populated in Doc 05                                                |
|                                                                       |
| import { ShareService } from \'../services/share.service\';           |
|                                                                       |
| \@Module({                                                            |
|                                                                       |
| imports: \[TransactionModule, InvoiceModule\],                        |
|                                                                       |
| providers: \[ShareService\],                                          |
|                                                                       |
| exports: \[ShareService\],                                            |
|                                                                       |
| })                                                                    |
|                                                                       |
| export class ShareModule {}                                           |
+=======================================================================+

+-----------------------------------------------------------------------+
| **Share Context Payload**                                             |
|                                                                       |
| When a user clicks the Share icon on a transaction or invoice,        |
| transaction-service constructs a context payload containing the item  |
| type (transaction or invoice), the display label, and the reference   |
| number. This payload is passed to invitations-service which owns the  |
| share modal UI, permission dropdowns, and delivery logic.             |
| transaction-service does not own any share UI behavior. Full          |
| implementation is in Doc 05.                                          |
+=======================================================================+

## **6.6 HealthModule**

Wraps the health and readiness controllers defined in Doc 01 into a
formal NestJS module.

**/apps/transaction-service/src/modules/health.module.ts**

+-----------------------------------------------------------------------+
| **src/modules/health.module.ts**                                      |
+-----------------------------------------------------------------------+
| import { Module } from \'@nestjs/common\';                            |
|                                                                       |
| import { TypeOrmModule } from \'@nestjs/typeorm\';                    |
|                                                                       |
| import { HealthController } from                                      |
| \'../controllers/health.controller\';                                 |
|                                                                       |
| \@Module({                                                            |
|                                                                       |
| // TypeOrmModule is injected here so HealthController can             |
|                                                                       |
| // run a SELECT 1 query to verify database connectivity on /ready     |
|                                                                       |
| imports: \[TypeOrmModule\],                                           |
|                                                                       |
| controllers: \[HealthController\],                                    |
|                                                                       |
| })                                                                    |
|                                                                       |
| export class HealthModule {}                                          |
+=======================================================================+

# **7. Database Connection Setup**

The database connection is configured in AppModule via
TypeOrmModule.forRootAsync (defined in Section 5). This section covers
the PostgreSQL schema setup and migration baseline required before the
service can connect.

## **7.1 Schema Isolation**

transaction-service uses a dedicated PostgreSQL schema named
transaction_service within the shared Supabase database. This keeps all
tables, enums, and indexes for this service isolated from other
microservices that share the same database instance.

+-----------------------------------------------------------------------+
| **Schema setup --- run once in Supabase SQL editor**                  |
+-----------------------------------------------------------------------+
| \-- Run once in Supabase SQL editor before first deployment           |
|                                                                       |
| \-- Creates the schema if it does not already exist                   |
|                                                                       |
| CREATE SCHEMA IF NOT EXISTS transaction_service;                      |
|                                                                       |
| \-- Grant the application user access to the schema                   |
|                                                                       |
| GRANT ALL ON SCHEMA transaction_service TO postgres;                  |
|                                                                       |
| GRANT ALL ON SCHEMA transaction_service TO authenticated;             |
+=======================================================================+

## **7.2 Migration Baseline**

All schema changes --- creating tables, adding columns, creating indexes
--- are handled by migration scripts. The full set of CREATE TABLE
statements and enum definitions are in Doc 03. The migration runner is
configured here.

Add the following scripts to package.json:

+-----------------------------------------------------------------------+
| **package.json scripts**                                              |
+-----------------------------------------------------------------------+
| {                                                                     |
|                                                                       |
| \"scripts\": {                                                        |
|                                                                       |
| \"migration:run\": \"typeorm migration:run -d                         |
| src/config/data-source.ts\",                                          |
|                                                                       |
| \"migration:revert\": \"typeorm migration:revert -d                   |
| src/config/data-source.ts\",                                          |
|                                                                       |
| \"migration:generate\": \"typeorm migration:generate -d               |
| src/config/data-source.ts\"                                           |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

Create the TypeORM data source file for the migration CLI:

**/apps/transaction-service/src/config/data-source.ts**

+-----------------------------------------------------------------------+
| **src/config/data-source.ts**                                         |
+-----------------------------------------------------------------------+
| import { DataSource } from \'typeorm\';                               |
|                                                                       |
| import { config } from \'dotenv\';                                    |
|                                                                       |
| import { Transaction } from \'../entities/transaction.entity\';       |
|                                                                       |
| import { Invoice } from \'../entities/invoice.entity\';               |
|                                                                       |
| import { TransactionDetail } from                                     |
| \'../entities/transaction-detail.entity\';                            |
|                                                                       |
| import { PaymentMethod } from \'../entities/payment-method.entity\';  |
|                                                                       |
| import { Contract } from \'../entities/contract.entity\';             |
|                                                                       |
| // Load .env for local migration runs                                 |
|                                                                       |
| config();                                                             |
|                                                                       |
| export const AppDataSource = new DataSource({                         |
|                                                                       |
| type: \'postgres\',                                                   |
|                                                                       |
| url: process.env.DATABASE_URL,                                        |
|                                                                       |
| schema: process.env.SUPABASE_SCHEMA ?? \'transaction_service\',       |
|                                                                       |
| entities: \[Transaction, Invoice, TransactionDetail, PaymentMethod,   |
| Contract\],                                                           |
|                                                                       |
| migrations: \[\'src/migrations/\*\*/\*.ts\'\],                        |
|                                                                       |
| synchronize: false,                                                   |
|                                                                       |
| ssl: process.env.NODE_ENV === \'production\'                          |
|                                                                       |
| ? { rejectUnauthorized: false }                                       |
|                                                                       |
| : false,                                                              |
|                                                                       |
| });                                                                   |
+=======================================================================+

+-----------------------------------------------------------------------+
| **Migration Policy**                                                  |
|                                                                       |
| Migrations are the only permitted way to modify the database schema.  |
| Never run typeorm migration:generate in production --- generate       |
| locally, review the output carefully, commit the migration file, and  |
| run migration:run as part of the deployment pipeline. Full migration  |
| files are provided in Doc 03 alongside each entity definition.        |
+=======================================================================+

## **7.3 Verifying the Database Connection**

After completing this document and before moving to Doc 03, verify the
database connection is working:

+-----------------------------------------------------------------------+
| **Verification commands**                                             |
+-----------------------------------------------------------------------+
| \# Start the service                                                  |
|                                                                       |
| npm run start:dev                                                     |
|                                                                       |
| \# Confirm no TypeORM connection errors appear in the terminal        |
|                                                                       |
| \# Expected log line:                                                 |
|                                                                       |
| \# \[TypeORM\] Connected to PostgreSQL --- schema:                    |
| transaction_service                                                   |
|                                                                       |
| \# Confirm health check passes                                        |
|                                                                       |
| curl http://localhost:3007/health                                     |
|                                                                       |
| \# Expected: { \"status\": \"ok\", \"service\":                       |
| \"transaction-service\" }                                             |
|                                                                       |
| \# Confirm readiness check passes (database must be reachable)        |
|                                                                       |
| curl http://localhost:3007/ready                                      |
|                                                                       |
| \# Expected: { \"status\": \"ok\", \"checks\": { \"database\": \"ok\" |
| } }                                                                   |
+=======================================================================+

# **8. Bootstrap Verification Checklist**

Before proceeding to Doc 03, confirm each item below. The service must
boot cleanly with a passing health check before any entity or API work
begins.

  --------------------------------------------------------------------------------
  **Check**          **How to Verify**              **Expected Result**
  ------------------ ------------------------------ ------------------------------
  Folder structure   ls -R                          All folders and placeholder
  complete           apps/transaction-service/src   files exist as defined in
                                                    Section 2

  TypeScript         npm run build                  No TypeScript errors. /dist
  compiles cleanly                                  folder is created.

  Linting passes     npm run lint                   Zero ESLint errors

  Service starts     npm run start:dev              Terminal shows
                                                    transaction-service running on
                                                    port 3007

  Environment        npm run start:dev              No startup validation errors
  validation runs                                   in the terminal

  Database connected npm run start:dev              No TypeORM connection errors
                                                    in the terminal

  Health check       curl localhost:3007/health     { \"status\": \"ok\",
  passes                                            \"service\":
                                                    \"transaction-service\" }

  Readiness check    curl localhost:3007/ready      { \"status\": \"ok\",
  passes                                            \"checks\": { \"database\":
                                                    \"ok\" } }

  Global prefix      curl                           Returns 404 (route not found)
  applied            localhost:3007/v1/anything     --- not 400 or 500, which
                                                    would indicate prefix
                                                    misconfiguration

  Unknown routes     curl localhost:3007/unknown    Returns 404 Not Found
  rejected                                          
  --------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Ready for Doc 03**                                                  |
|                                                                       |
| If all ten checks above pass, transaction-service is correctly        |
| bootstrapped. Proceed to Doc 03 --- Data Models & DTOs to define the  |
| TypeORM entities, PostgreSQL enums, and migration scripts for all     |
| five database tables.                                                 |
+=======================================================================+

# **9. Module Dependency Map**

The diagram below shows how modules import from and export to each
other. Understanding this before adding services in Doc 04 prevents
circular dependency errors.

+-----------------------------------------------------------------------+
| **Module dependency tree**                                            |
+-----------------------------------------------------------------------+
| AppModule                                                             |
|                                                                       |
| ├── ConfigModule (global) --- available everywhere, no re-import      |
| needed                                                                |
|                                                                       |
| ├── TypeOrmModule (root) --- database connection, available           |
| everywhere                                                            |
|                                                                       |
| ├── AuditModule (global) --- AuditService injectable everywhere       |
|                                                                       |
| │                                                                     |
|                                                                       |
| ├── HealthModule                                                      |
|                                                                       |
| │ └── controllers: HealthController                                   |
|                                                                       |
| │                                                                     |
|                                                                       |
| ├── TransactionModule                                                 |
|                                                                       |
| │ ├── entities: Transaction, TransactionDetail, Contract,             |
| PaymentMethod                                                         |
|                                                                       |
| │ ├── controllers: TransactionController                              |
|                                                                       |
| │ ├── providers: TransactionService, BillingConsumer,                 |
|                                                                       |
| │ │ TimeTrackingConsumer, PayoutConsumer                              |
|                                                                       |
| │ └── exports: TransactionService                                     |
|                                                                       |
| │                                                                     |
|                                                                       |
| ├── InvoiceModule                                                     |
|                                                                       |
| │ ├── entities: Invoice, Contract                                     |
|                                                                       |
| │ ├── imports: HttpModule (for Stripe API calls)                      |
|                                                                       |
| │ ├── controllers: InvoiceController                                  |
|                                                                       |
| │ ├── providers: InvoiceService                                       |
|                                                                       |
| │ └── exports: InvoiceService                                         |
|                                                                       |
| │                                                                     |
|                                                                       |
| ├── ExportModule                                                      |
|                                                                       |
| │ ├── imports: TransactionModule, InvoiceModule                       |
|                                                                       |
| │ ├── controllers: ExportController                                   |
|                                                                       |
| │ └── providers: ExportService                                        |
|                                                                       |
| │                                                                     |
|                                                                       |
| └── ShareModule                                                       |
|                                                                       |
| ├── imports: TransactionModule, InvoiceModule                         |
|                                                                       |
| └── providers: ShareService                                           |
+=======================================================================+

+-----------------------------------------------------------------------+
| **Circular Dependency Prevention**                                    |
|                                                                       |
| ExportModule and ShareModule import TransactionModule and             |
| InvoiceModule to access their exported services. TransactionModule    |
| and InvoiceModule must never import ExportModule or ShareModule ---   |
| that would create a circular dependency and crash the application at  |
| startup. If you need a service from ExportModule inside               |
| TransactionModule, extract it into a shared module instead.           |
+=======================================================================+

# **10. Next Steps**

With the service skeleton wired and all modules bootstrapping cleanly,
proceed to Doc 03 to define the data layer:

  -----------------------------------------------------------------------------
  **Document**   **Title**           **What It Covers**
  -------------- ------------------- ------------------------------------------
  Doc 03         Data Models & DTOs  TypeORM entities for all 5 tables,
                                     PostgreSQL enums, CHECK constraints,
                                     migration scripts, DTOs with
                                     class-validator rules for all filter,
                                     query, and response shapes

  Doc 04         API Endpoints       All route handlers wired into the modules
                                     defined here --- GET /v1/transactions, GET
                                     /v1/invoices, POST
                                     /v1/transactions/:id/report, POST
                                     /v1/transactions/export, and more

  Doc 05         Integrations &      RabbitMQ consumers wired into
                 Events              TransactionModule, Stripe HTTP calls wired
                                     into InvoiceModule, Ably publishing, Redis
                                     cache, share context payload for
                                     invitations-service

  Doc 06         Observability &     Extending the /ready endpoint with
                 Health              RabbitMQ and Redis checks, structured
                                     logging setup, metric definitions

  Doc 07         QA & Test Data      Unit test scaffolding for all modules,
                                     seed scripts, Postman collection
  -----------------------------------------------------------------------------
