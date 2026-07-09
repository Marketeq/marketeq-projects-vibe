**OS-17**

**Offer Service --- Database Migrations Guide**

**Tool:** TypeORM CLI **Migration dir:** apps/offer-service/migrations/
**Tracking table:** offer_service.migrations

This document covers the complete database migration workflow for
offer-service. Every schema change --- new table, new column, index,
constraint, or data correction --- must go through a TypeORM migration
file. Migrations are the only approved mechanism for modifying the
database schema in staging and production. DB_SYNC (TypeORM synchronize:
true) is permanently disabled in all non-local environments.

**File Map --- All Files to Create in This Document**

  ---------- -------------------------------------------------------------- ----------------------
  **Step**   **File Path**                                                  **Purpose**

  **1**      apps/offer-service/src/config/typeorm.config.ts                Standalone DataSource
                                                                            config for the TypeORM
                                                                            CLI

  **2**      apps/offer-service/package.json (update)                       Add migration scripts
                                                                            to npm run commands

  **3**      apps/offer-service/migrations/1706601600000-InitialSchema.ts   Migration 001: create
                                                                            offer_service schema
                                                                            and all four tables

  **4**      apps/offer-service/migrations/1706601700000-AddIndexes.ts      Migration 002: add all
                                                                            indexes including the
                                                                            partial unique index

  **5**      (pattern)                                                      Template for future
                                                                            migrations

  **6**      (reference)                                                    Full CLI command
                                                                            reference and naming
                                                                            conventions

  **7**      (reference)                                                    Zero-downtime
                                                                            migration patterns
  ---------- -------------------------------------------------------------- ----------------------

+-----------------------------------------------------------------------+
| **Overview Why Migrations Instead of DB_SYNC**                        |
|                                                                       |
| The core rule: migrations are mandatory in all shared environments    |
+-----------------------------------------------------------------------+

TypeORM\'s synchronize: true (DB_SYNC) automatically updates the
database schema to match your entity definitions every time the service
starts. In a solo development project this is convenient. In a team, in
staging, and in production, it is catastrophic.

  --------------------- -------------------------------------------------
  **DB_SYNC problem 1** If two developers have different local entities,
                        the first to deploy overwrites the other\'s
                        schema changes.

  **DB_SYNC problem 2** TypeORM may DROP COLUMN or DROP TABLE if an
                        entity property is removed. Silent data loss.

  **DB_SYNC problem 3** No audit trail. You cannot know what changed,
                        when, or who deployed it.

  **DB_SYNC problem 4** No rollback. If a bad change is deployed, there
                        is no automated way to revert it.

  **DB_SYNC problem 5** Race conditions. Multiple service instances
                        starting simultaneously can conflict on schema
                        changes.

  **Migration           Every schema change is code-reviewed,
  advantage**           timestamped, idempotent, and reversible.
  --------------------- -------------------------------------------------

+-----------------------------------------------------------------------+
| DB_SYNC is hardcoded off for non-local environments.                  |
|                                                                       |
| The Joi validation schema in OS-09 (validationSchema) rejects         |
| DB_SYNC=true                                                          |
|                                                                       |
| when NODE_ENV is production or staging.                               |
|                                                                       |
| If you need DB_SYNC=true for local development, set                   |
| NODE_ENV=development in .env.                                         |
|                                                                       |
| Never set DB_SYNC=true in .env.staging or .env.production.            |
+-----------------------------------------------------------------------+

**How TypeORM Migration Tracking Works**

TypeORM records every executed migration in a tracking table. When you
run migration:run, TypeORM compares the list of migration files in the
migrations/ directory against the rows in the tracking table and runs
only the ones not yet executed. This makes the command idempotent ---
safe to run multiple times.

+-----------------------------------------------------------------------+
| Migration tracking table: offer_service.migrations                    |
|                                                                       |
| TypeORM creates this table automatically on first migration:run.      |
|                                                                       |
| It has three columns:                                                 |
|                                                                       |
| id --- auto-increment integer primary key                             |
|                                                                       |
| timestamp --- the Unix timestamp from the migration filename          |
|                                                                       |
| name --- the class name of the migration                              |
|                                                                       |
| When you run migration:run, TypeORM queries this table, compares      |
|                                                                       |
| against all migration files, and runs only the new ones.              |
|                                                                       |
| When you run migration:revert, TypeORM finds the most recently run    |
|                                                                       |
| migration and calls its down() method, then removes the row from      |
|                                                                       |
| offer_service.migrations.                                             |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 1 Standalone DataSource Config**                               |
|                                                                       |
| The TypeORM CLI needs its own config file separate from NestJS        |
+-----------------------------------------------------------------------+

NestJS loads TypeORM through the AppModule using
TypeOrmModule.forRootAsync(). The TypeORM CLI cannot bootstrap NestJS
--- it needs a standalone DataSource file that it can import directly.
This file exports a DataSource instance configured with the same
connection settings as your NestJS module but without any NestJS
dependencies.

+-----------------------------------------------------------------------+
| Why a separate config file?                                           |
|                                                                       |
| The TypeORM CLI runs as a standalone Node.js process.                 |
|                                                                       |
| It cannot instantiate a NestJS module with its DI container.          |
|                                                                       |
| It imports the DataSource file directly using ts-node.                |
|                                                                       |
| This file reads database connection settings from environment         |
| variables directly                                                    |
|                                                                       |
| (not through ConfigService, because ConfigService requires NestJS to  |
| be running).                                                          |
|                                                                       |
| You must have the correct DB environment variables set in your shell  |
| when running                                                          |
|                                                                       |
| any migration command.                                                |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/config/typeorm.config.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { DataSource, DataSourceOptions } from \'typeorm\';            |
|                                                                       |
| import { join } from \'path\';                                        |
|                                                                       |
| import \* as dotenv from \'dotenv\';                                  |
|                                                                       |
| // Load environment variables from .env file.                         |
|                                                                       |
| // dotenv.config() reads the .env file in the current working         |
| directory.                                                            |
|                                                                       |
| // When running migration commands, ensure you are in the monorepo    |
| root                                                                  |
|                                                                       |
| // OR that the correct .env path is set via DOTENV_CONFIG_PATH.       |
|                                                                       |
| dotenv.config({ path: process.env.DOTENV_CONFIG_PATH ?? \'.env\' });  |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* TypeORM DataSource for offer-service migrations.                   |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* This file is used exclusively by the TypeORM CLI.                  |
|                                                                       |
| \* NestJS uses TypeOrmModule.forRootAsync() in AppModule instead.     |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* The CLI accesses this via:                                         |
|                                                                       |
| \* typeorm-ts-node-commonjs -d                                        |
| apps/offer-service/src/config/typeorm.config.ts                       |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| const options: DataSourceOptions = {                                  |
|                                                                       |
| type: \'postgres\',                                                   |
|                                                                       |
| host: process.env.DB_HOST ?? \'localhost\',                           |
|                                                                       |
| port: parseInt(process.env.DB_PORT ?? \'5432\', 10),                  |
|                                                                       |
| username: process.env.DB_USERNAME ?? \'postgres\',                    |
|                                                                       |
| password: process.env.DB_PASSWORD ?? \'\',                            |
|                                                                       |
| database: process.env.DB_DATABASE ?? \'marketeq_dev\',                |
|                                                                       |
| schema: process.env.DB_SCHEMA ?? \'offer_service\',                   |
|                                                                       |
| // SSL: enabled in staging/production, disabled in development.       |
|                                                                       |
| ssl: process.env.DB_SSL === \'true\'                                  |
|                                                                       |
| ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !==    |
| \'false\' }                                                           |
|                                                                       |
| : false,                                                              |
|                                                                       |
| // IMPORTANT: synchronize is ALWAYS false in this config.             |
|                                                                       |
| // Migrations are the ONLY mechanism for schema changes.              |
|                                                                       |
| synchronize: false,                                                   |
|                                                                       |
| // Entity files: all four entities in the service.                    |
|                                                                       |
| // Use glob patterns so new entities are picked up automatically.     |
|                                                                       |
| entities: \[join(\_\_dirname, \'../../\*\*/\*.entity.{ts,js}\')\],    |
|                                                                       |
| // Migration files: all files in the migrations/ directory.           |
|                                                                       |
| migrations: \[join(\_\_dirname, \'../../migrations/\*.{ts,js}\')\],   |
|                                                                       |
| // The table where TypeORM records executed migrations.               |
|                                                                       |
| // Using a separate table per service prevents conflicts in shared    |
| databases.                                                            |
|                                                                       |
| migrationsTableName: \'migrations\',                                  |
|                                                                       |
| // Run migrations in the offer_service schema.                        |
|                                                                       |
| // This means the tracking table is offer_service.migrations.         |
|                                                                       |
| // Log migration SQL for debugging. Useful during development.        |
|                                                                       |
| logging: \[\'migration\', \'error\'\],                                |
|                                                                       |
| };                                                                    |
|                                                                       |
| // Export as default for NestJS TypeOrmModule (if needed)             |
|                                                                       |
| export default options;                                               |
|                                                                       |
| // Export as named DataSource for the TypeORM CLI                     |
|                                                                       |
| export const AppDataSource = new DataSource(options);                 |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 2 Add Migration Scripts to package.json**                      |
|                                                                       |
| npm run shortcuts for all migration commands                          |
+-----------------------------------------------------------------------+

Add these scripts to the offer-service package.json. The scripts use
typeorm-ts-node-commonjs to run TypeORM CLI commands with TypeScript
support, pointing at the standalone DataSource config file. Always pass
\--project=offer-service when running from the monorepo root.

+-----------------------------------------------------------------------+
| typeorm-ts-node-commonjs requires ts-node and \@types/node to be      |
| installed.                                                            |
|                                                                       |
| These are typically already in the monorepo devDependencies.          |
|                                                                       |
| If you see \"typeorm-ts-node-commonjs: command not found\":           |
|                                                                       |
| npm install \--save-dev ts-node typeorm                               |
|                                                                       |
| Then verify: npx typeorm-ts-node-commonjs \--version                  |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/package.json --- add to \"scripts\"
  section**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| {                                                                     |
|                                                                       |
| \"name\": \"offer-service\",                                          |
|                                                                       |
| \"scripts\": {                                                        |
|                                                                       |
| \"start:dev\": \"nest start offer-service \--watch\",                 |
|                                                                       |
| \"build\": \"nest build offer-service\",                              |
|                                                                       |
| \"test\": \"jest \--config=apps/offer-service/jest.config.ts\",       |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Migration commands                                                 |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Generate a new migration by comparing entities to the current DB   |
| schema.                                                               |
|                                                                       |
| // TypeORM will create a migration file with the detected diffs.      |
|                                                                       |
| // ALWAYS review the generated file before running it.                |
|                                                                       |
| // Usage: npm run migration:generate \--name=add-offer-indexes        |
|                                                                       |
| \"migration:generate\":                                               |
|                                                                       |
| \"typeorm-ts-node-commonjs -d                                         |
| apps/offer-service/src/config/typeorm.config.ts migration:generate    |
| apps/offer-service/migrations/\$npm_config_name\",                    |
|                                                                       |
| // Create a blank migration file for manual SQL (indexes,             |
| constraints, data fixes).                                             |
|                                                                       |
| // Usage: npm run migration:create \--name=add-partial-unique-index   |
|                                                                       |
| \"migration:create\":                                                 |
|                                                                       |
| \"typeorm migration:create                                            |
| apps/offer-service/migrations/\$npm_config_name\",                    |
|                                                                       |
| // Run all pending migrations that have not yet been executed.        |
|                                                                       |
| // Safe to run multiple times --- already-executed migrations are     |
| skipped.                                                              |
|                                                                       |
| \"migration:run\":                                                    |
|                                                                       |
| \"typeorm-ts-node-commonjs -d                                         |
| apps/offer-service/src/config/typeorm.config.ts migration:run\",      |
|                                                                       |
| // Revert the most recently executed migration (calls down() method). |
|                                                                       |
| // Can be called multiple times to revert multiple migrations in      |
| sequence.                                                             |
|                                                                       |
| \"migration:revert\":                                                 |
|                                                                       |
| \"typeorm-ts-node-commonjs -d                                         |
| apps/offer-service/src/config/typeorm.config.ts migration:revert\",   |
|                                                                       |
| // Show all migrations and their execution status (executed or        |
| pending).                                                             |
|                                                                       |
| \"migration:show\":                                                   |
|                                                                       |
| \"typeorm-ts-node-commonjs -d                                         |
| apps/offer-service/src/config/typeorm.config.ts migration:show\"      |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // How to run from the monorepo root (most common):                   |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // cd /path/to/marketeq-projects-nestjs                               |
|                                                                       |
| // npm run migration:run \--workspace=apps/offer-service              |
|                                                                       |
| //                                                                    |
|                                                                       |
| // Or directly from the offer-service directory:                      |
|                                                                       |
| // cd apps/offer-service                                              |
|                                                                       |
| // npm run migration:run                                              |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 3 Migration 001 --- Initial Schema**                           |
|                                                                       |
| Creates the offer_service schema and all four tables                  |
+-----------------------------------------------------------------------+

This is the first migration for offer-service. It creates the
offer_service PostgreSQL schema and all four tables (offers,
counter_offers, offer_history, outbox) along with the updated_at trigger
function. This migration contains the complete table DDL from OS-15. The
down() method drops everything in reverse order.

+-----------------------------------------------------------------------+
| Naming convention for migration files:                                |
|                                                                       |
| Format: {timestamp}-{PascalCaseName}.ts                               |
|                                                                       |
| Timestamp: Unix timestamp in milliseconds (13 digits)                 |
|                                                                       |
| Name: PascalCase description of what the migration does               |
|                                                                       |
| Examples:                                                             |
|                                                                       |
| 1706601600000-InitialSchema.ts                                        |
|                                                                       |
| 1706601700000-AddIndexes.ts                                           |
|                                                                       |
| 1706610000000-AddDeclineChipColumn.ts                                 |
|                                                                       |
| 1706700000000-AddOriginalOfferIdColumn.ts                             |
|                                                                       |
| The TypeORM CLI generates the timestamp automatically.                |
|                                                                       |
| When creating migrations manually, use Date.now() to get the          |
| timestamp.                                                            |
|                                                                       |
| Run: node -e \"console.log(Date.now())\" to get the current Unix ms   |
| timestamp.                                                            |
|                                                                       |
| NEVER rename a migration file after it has been run. TypeORM tracks   |
| by filename.                                                          |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/migrations/1706601600000-InitialSchema.ts**

  -----------------------------------------------------------------------

+------------------------------------------------------------------------------------+
| import { MigrationInterface, QueryRunner } from \'typeorm\';                       |
|                                                                                    |
| /\*\*                                                                              |
|                                                                                    |
| \* Migration 001 --- InitialSchema                                                 |
|                                                                                    |
| \* Creates the offer_service schema and all four tables.                           |
|                                                                                    |
| \*                                                                                 |
|                                                                                    |
| \* Tables created:                                                                 |
|                                                                                    |
| \* offer_service.offers --- Primary offer records                                  |
|                                                                                    |
| \* offer_service.counter_offers --- Counter offer records                          |
|                                                                                    |
| \* offer_service.offer_history --- Append-only event log                           |
|                                                                                    |
| \* offer_service.outbox --- Transactional outbox for RabbitMQ                      |
|                                                                                    |
| \*                                                                                 |
|                                                                                    |
| \* Also creates:                                                                   |
|                                                                                    |
| \* offer_service.set_updated_at() trigger function                                 |
|                                                                                    |
| \* updated_at triggers on offers, counter_offers, outbox                           |
|                                                                                    |
| \*/                                                                                |
|                                                                                    |
| export class InitialSchema1706601600000 implements MigrationInterface {            |
|                                                                                    |
| name = \'InitialSchema1706601600000\';                                             |
|                                                                                    |
| public async up(queryRunner: QueryRunner): Promise\<void\> {                       |
|                                                                                    |
| // ============================================================                    |
|                                                                                    |
| // Schema                                                                          |
|                                                                                    |
| // ============================================================                    |
|                                                                                    |
| await queryRunner.query(\`CREATE SCHEMA IF NOT EXISTS offer_service\`);            |
|                                                                                    |
| // ============================================================                    |
|                                                                                    |
| // Trigger function (shared by all tables with updated_at)                         |
|                                                                                    |
| // ============================================================                    |
|                                                                                    |
| await queryRunner.query(\`                                                         |
|                                                                                    |
| CREATE OR REPLACE FUNCTION offer_service.set_updated_at()                          |
|                                                                                    |
| RETURNS TRIGGER AS \$\$                                                            |
|                                                                                    |
| BEGIN                                                                              |
|                                                                                    |
| NEW.updated_at = NOW();                                                            |
|                                                                                    |
| RETURN NEW;                                                                        |
|                                                                                    |
| END;                                                                               |
|                                                                                    |
| \$\$ LANGUAGE plpgsql                                                              |
|                                                                                    |
| \`);                                                                               |
|                                                                                    |
| // ============================================================                    |
|                                                                                    |
| // Table: offers                                                                   |
|                                                                                    |
| // ============================================================                    |
|                                                                                    |
| await queryRunner.query(\`                                                         |
|                                                                                    |
| CREATE TABLE IF NOT EXISTS offer_service.offers (                                  |
|                                                                                    |
| id UUID NOT NULL DEFAULT gen_random_uuid(),                                        |
|                                                                                    |
| client_id UUID NOT NULL,                                                           |
|                                                                                    |
| talent_id UUID NOT NULL,                                                           |
|                                                                                    |
| job_listing_id UUID NOT NULL,                                                      |
|                                                                                    |
| contract_type VARCHAR(20) NOT NULL CHECK (contract_type IN                         |
| (\'PROJECT\',\'SERVICE\',\'TEAM\',\'CONTRACT\')),                                  |
|                                                                                    |
| contract_title VARCHAR(200) NOT NULL,                                              |
|                                                                                    |
| status VARCHAR(20) NOT NULL DEFAULT \'PENDING\'                                    |
|                                                                                    |
| CHECK (status IN                                                                   |
| (\'PENDING\',\'ACCEPTED\',\'DECLINED\',\'WITHDRAWN\',\'EXPIRED\',\'COUNTERED\')),  |
|                                                                                    |
| rate INTEGER NOT NULL CHECK (rate \>= 1 AND rate \<= 9999),                        |
|                                                                                    |
| currency_code CHAR(3) NOT NULL,                                                    |
|                                                                                    |
| duration_months INTEGER NOT NULL CHECK (duration_months \>= 1 AND duration_months  |
| \<= 60),                                                                           |
|                                                                                    |
| work_schedule JSONB NOT NULL,                                                      |
|                                                                                    |
| start_date DATE NOT NULL,                                                          |
|                                                                                    |
| message TEXT,                                                                      |
|                                                                                    |
| expires_at TIMESTAMPTZ NOT NULL,                                                   |
|                                                                                    |
| warning_sent_at TIMESTAMPTZ,                                                       |
|                                                                                    |
| accepted_at TIMESTAMPTZ,                                                           |
|                                                                                    |
| declined_at TIMESTAMPTZ,                                                           |
|                                                                                    |
| declined_reason TEXT,                                                              |
|                                                                                    |
| declined_chip VARCHAR(30),                                                         |
|                                                                                    |
| withdrawn_at TIMESTAMPTZ,                                                          |
|                                                                                    |
| withdrawal_message TEXT,                                                           |
|                                                                                    |
| expired_at TIMESTAMPTZ,                                                            |
|                                                                                    |
| original_offer_id UUID REFERENCES offer_service.offers(id) ON DELETE SET NULL,     |
|                                                                                    |
| created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),                                     |
|                                                                                    |
| updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),                                     |
|                                                                                    |
| CONSTRAINT pk_offers PRIMARY KEY (id)                                              |
|                                                                                    |
| )                                                                                  |
|                                                                                    |
| \`);                                                                               |
|                                                                                    |
| await queryRunner.query(\`                                                         |
|                                                                                    |
| CREATE TRIGGER offers_updated_at                                                   |
|                                                                                    |
| BEFORE UPDATE ON offer_service.offers                                              |
|                                                                                    |
| FOR EACH ROW EXECUTE FUNCTION offer_service.set_updated_at()                       |
|                                                                                    |
| \`);                                                                               |
|                                                                                    |
| // ============================================================                    |
|                                                                                    |
| // Table: counter_offers                                                           |
|                                                                                    |
| // ============================================================                    |
|                                                                                    |
| await queryRunner.query(\`                                                         |
|                                                                                    |
| CREATE TABLE IF NOT EXISTS offer_service.counter_offers (                          |
|                                                                                    |
| id UUID NOT NULL DEFAULT gen_random_uuid(),                                        |
|                                                                                    |
| offer_id UUID NOT NULL REFERENCES offer_service.offers(id) ON DELETE RESTRICT,     |
|                                                                                    |
| submitted_by VARCHAR(10) NOT NULL CHECK (submitted_by IN (\'CLIENT\',\'TALENT\')), |
|                                                                                    |
| submitted_by_id UUID NOT NULL,                                                     |
|                                                                                    |
| status VARCHAR(20) NOT NULL DEFAULT \'PENDING\'                                    |
|                                                                                    |
| CHECK (status IN                                                                   |
| (\'PENDING\',\'ACCEPTED\',\'DECLINED\',\'WITHDRAWN\',\'EXPIRED\',\'SUPERSEDED\')), |
|                                                                                    |
| rate INTEGER NOT NULL CHECK (rate \>= 1 AND rate \<= 9999),                        |
|                                                                                    |
| currency_code CHAR(3) NOT NULL,                                                    |
|                                                                                    |
| duration_months INTEGER NOT NULL CHECK (duration_months \>= 1 AND duration_months  |
| \<= 60),                                                                           |
|                                                                                    |
| work_schedule JSONB NOT NULL,                                                      |
|                                                                                    |
| start_date DATE NOT NULL,                                                          |
|                                                                                    |
| message TEXT,                                                                      |
|                                                                                    |
| expires_at TIMESTAMPTZ NOT NULL,                                                   |
|                                                                                    |
| warning_sent_at TIMESTAMPTZ,                                                       |
|                                                                                    |
| accepted_at TIMESTAMPTZ,                                                           |
|                                                                                    |
| declined_at TIMESTAMPTZ,                                                           |
|                                                                                    |
| withdrawn_at TIMESTAMPTZ,                                                          |
|                                                                                    |
| withdrawal_message TEXT,                                                           |
|                                                                                    |
| expired_at TIMESTAMPTZ,                                                            |
|                                                                                    |
| superseded_at TIMESTAMPTZ,                                                         |
|                                                                                    |
| created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),                                     |
|                                                                                    |
| updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),                                     |
|                                                                                    |
| CONSTRAINT pk_counter_offers PRIMARY KEY (id)                                      |
|                                                                                    |
| )                                                                                  |
|                                                                                    |
| \`);                                                                               |
|                                                                                    |
| await queryRunner.query(\`                                                         |
|                                                                                    |
| CREATE TRIGGER counter_offers_updated_at                                           |
|                                                                                    |
| BEFORE UPDATE ON offer_service.counter_offers                                      |
|                                                                                    |
| FOR EACH ROW EXECUTE FUNCTION offer_service.set_updated_at()                       |
|                                                                                    |
| \`);                                                                               |
|                                                                                    |
| // ============================================================                    |
|                                                                                    |
| // Table: offer_history (append-only, no updated_at trigger)                       |
|                                                                                    |
| // ============================================================                    |
|                                                                                    |
| await queryRunner.query(\`                                                         |
|                                                                                    |
| CREATE TABLE IF NOT EXISTS offer_service.offer_history (                           |
|                                                                                    |
| id UUID NOT NULL DEFAULT gen_random_uuid(),                                        |
|                                                                                    |
| offer_id UUID NOT NULL REFERENCES offer_service.offers(id) ON DELETE RESTRICT,     |
|                                                                                    |
| counter_offer_id UUID REFERENCES offer_service.counter_offers(id) ON DELETE SET    |
| NULL,                                                                              |
|                                                                                    |
| event_type VARCHAR(50) NOT NULL,                                                   |
|                                                                                    |
| actor VARCHAR(10) NOT NULL CHECK (actor IN (\'CLIENT\',\'TALENT\',\'SYSTEM\')),    |
|                                                                                    |
| actor_id UUID,                                                                     |
|                                                                                    |
| terms JSONB NOT NULL,                                                              |
|                                                                                    |
| created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),                                     |
|                                                                                    |
| CONSTRAINT pk_offer_history PRIMARY KEY (id)                                       |
|                                                                                    |
| )                                                                                  |
|                                                                                    |
| \`);                                                                               |
|                                                                                    |
| // ============================================================                    |
|                                                                                    |
| // Table: outbox                                                                   |
|                                                                                    |
| // ============================================================                    |
|                                                                                    |
| await queryRunner.query(\`                                                         |
|                                                                                    |
| CREATE TABLE IF NOT EXISTS offer_service.outbox (                                  |
|                                                                                    |
| id UUID NOT NULL DEFAULT gen_random_uuid(),                                        |
|                                                                                    |
| aggregate_id UUID NOT NULL,                                                        |
|                                                                                    |
| aggregate_type VARCHAR(30) NOT NULL DEFAULT \'offer\',                             |
|                                                                                    |
| event_type VARCHAR(50) NOT NULL,                                                   |
|                                                                                    |
| exchange VARCHAR(100) NOT NULL DEFAULT \'marketeq.offers\',                        |
|                                                                                    |
| routing_key VARCHAR(100) NOT NULL,                                                 |
|                                                                                    |
| payload JSONB NOT NULL,                                                            |
|                                                                                    |
| status VARCHAR(20) NOT NULL DEFAULT \'PENDING\'                                    |
|                                                                                    |
| CHECK (status IN (\'PENDING\',\'PROCESSING\',\'PUBLISHED\',\'FAILED\')),           |
|                                                                                    |
| retry_count INTEGER NOT NULL DEFAULT 0,                                            |
|                                                                                    |
| last_error TEXT,                                                                   |
|                                                                                    |
| scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),                                   |
|                                                                                    |
| processed_at TIMESTAMPTZ,                                                          |
|                                                                                    |
| created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),                                     |
|                                                                                    |
| updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),                                     |
|                                                                                    |
| CONSTRAINT pk_outbox PRIMARY KEY (id)                                              |
|                                                                                    |
| )                                                                                  |
|                                                                                    |
| \`);                                                                               |
|                                                                                    |
| await queryRunner.query(\`                                                         |
|                                                                                    |
| CREATE TRIGGER outbox_updated_at                                                   |
|                                                                                    |
| BEFORE UPDATE ON offer_service.outbox                                              |
|                                                                                    |
| FOR EACH ROW EXECUTE FUNCTION offer_service.set_updated_at()                       |
|                                                                                    |
| \`);                                                                               |
|                                                                                    |
| }                                                                                  |
|                                                                                    |
| public async down(queryRunner: QueryRunner): Promise\<void\> {                     |
|                                                                                    |
| // Drop in reverse order to respect foreign key constraints.                       |
|                                                                                    |
| // outbox and offer_history reference offers and counter_offers.                   |
|                                                                                    |
| // counter_offers references offers.                                               |
|                                                                                    |
| // offers must be dropped last.                                                    |
|                                                                                    |
| await queryRunner.query(\`DROP TABLE IF EXISTS offer_service.outbox CASCADE\`);    |
|                                                                                    |
| await queryRunner.query(\`DROP TABLE IF EXISTS offer_service.offer_history         |
| CASCADE\`);                                                                        |
|                                                                                    |
| await queryRunner.query(\`DROP TABLE IF EXISTS offer_service.counter_offers        |
| CASCADE\`);                                                                        |
|                                                                                    |
| await queryRunner.query(\`DROP TABLE IF EXISTS offer_service.offers CASCADE\`);    |
|                                                                                    |
| await queryRunner.query(\`DROP FUNCTION IF EXISTS offer_service.set_updated_at()   |
| CASCADE\`);                                                                        |
|                                                                                    |
| await queryRunner.query(\`DROP SCHEMA IF EXISTS offer_service CASCADE\`);          |
|                                                                                    |
| }                                                                                  |
|                                                                                    |
| }                                                                                  |
+------------------------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 4 Migration 002 --- Add Indexes**                              |
|                                                                       |
| All 15 indexes from OS-16 including the critical partial unique index |
+-----------------------------------------------------------------------+

This migration adds all indexes documented in OS-16. It is split from
the table creation migration (001) intentionally: this allows the
indexes to be created and dropped independently without affecting the
tables. The down() method drops all indexes cleanly.

+-----------------------------------------------------------------------+
| This migration uses CREATE INDEX CONCURRENTLY for non-unique indexes. |
|                                                                       |
| CONCURRENTLY builds the index without locking the table for reads or  |
| writes.                                                               |
|                                                                       |
| However, CREATE INDEX CONCURRENTLY cannot run inside a transaction.   |
|                                                                       |
| TypeORM wraps migrations in a transaction by default.                 |
|                                                                       |
| To use CONCURRENTLY, we must disable the transaction on this          |
| migration.                                                            |
|                                                                       |
| The transaction: false flag shown below is required for CONCURRENTLY. |
|                                                                       |
| The partial unique index (uq_counter_offers_one_pending) uses regular |
|                                                                       |
| CREATE UNIQUE INDEX (not CONCURRENTLY) because it is the very first   |
| time                                                                  |
|                                                                       |
| this index is being created on an empty table. CONCURRENTLY is only   |
| needed                                                                |
|                                                                       |
| when adding an index to an existing table with live data.             |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/migrations/1706601700000-AddIndexes.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { MigrationInterface, QueryRunner } from \'typeorm\';          |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* Migration 002 --- AddIndexes                                       |
|                                                                       |
| \* Creates all 15 indexes for the offer_service schema.               |
|                                                                       |
| \* See OS-16 for the complete index justification and query analysis. |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* transaction: false is required because CREATE INDEX CONCURRENTLY   |
|                                                                       |
| \* cannot run inside a transaction.                                   |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export class AddIndexes1706601700000 implements MigrationInterface {  |
|                                                                       |
| name = \'AddIndexes1706601700000\';                                   |
|                                                                       |
| // Disable the default transaction wrapper.                           |
|                                                                       |
| // Required for CREATE INDEX CONCURRENTLY.                            |
|                                                                       |
| transaction = false;                                                  |
|                                                                       |
| public async up(queryRunner: QueryRunner): Promise\<void\> {          |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // offers table indexes                                               |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Client lookup --- active offer constraint check                    |
|                                                                       |
| await queryRunner.query(\`                                            |
|                                                                       |
| CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_offers_client_id          |
|                                                                       |
| ON offer_service.offers (client_id)                                   |
|                                                                       |
| \`);                                                                  |
|                                                                       |
| // Talent lookup --- talent inbox queries                             |
|                                                                       |
| await queryRunner.query(\`                                            |
|                                                                       |
| CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_offers_talent_id          |
|                                                                       |
| ON offer_service.offers (talent_id)                                   |
|                                                                       |
| \`);                                                                  |
|                                                                       |
| // Composite: client + talent --- one-active-offer constraint (most   |
| critical)                                                             |
|                                                                       |
| await queryRunner.query(\`                                            |
|                                                                       |
| CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_offers_client_talent      |
|                                                                       |
| ON offer_service.offers (client_id, talent_id)                        |
|                                                                       |
| \`);                                                                  |
|                                                                       |
| // Composite: status + expires_at --- expiry scheduler query          |
|                                                                       |
| await queryRunner.query(\`                                            |
|                                                                       |
| CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_offers_status_expires     |
|                                                                       |
| ON offer_service.offers (status, expires_at)                          |
|                                                                       |
| \`);                                                                  |
|                                                                       |
| // Composite: talent + status --- talent offer inbox                  |
|                                                                       |
| await queryRunner.query(\`                                            |
|                                                                       |
| CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_offers_talent_status      |
|                                                                       |
| ON offer_service.offers (talent_id, status)                           |
|                                                                       |
| \`);                                                                  |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // counter_offers table indexes                                       |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Offer ID lookup --- fetch all COs for a parent offer               |
|                                                                       |
| await queryRunner.query(\`                                            |
|                                                                       |
| CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_co_offer_id               |
|                                                                       |
| ON offer_service.counter_offers (offer_id)                            |
|                                                                       |
| \`);                                                                  |
|                                                                       |
| // Composite: offer_id + status --- active CO lookup (runs on every   |
| CO action)                                                            |
|                                                                       |
| await queryRunner.query(\`                                            |
|                                                                       |
| CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_co_offer_status           |
|                                                                       |
| ON offer_service.counter_offers (offer_id, status)                    |
|                                                                       |
| \`);                                                                  |
|                                                                       |
| // Composite: status + expires_at --- CO expiry scheduler             |
|                                                                       |
| await queryRunner.query(\`                                            |
|                                                                       |
| CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_co_expires                |
|                                                                       |
| ON offer_service.counter_offers (status, expires_at)                  |
|                                                                       |
| \`);                                                                  |
|                                                                       |
| // CRITICAL: Partial unique index --- one PENDING CO per offer        |
| (business rule)                                                       |
|                                                                       |
| // This is NOT CONCURRENTLY because unique indexes have different     |
| concurrency rules.                                                    |
|                                                                       |
| // On a live table, take a brief maintenance window for this index.   |
|                                                                       |
| // On a fresh table (first deploy), this is instant.                  |
|                                                                       |
| await queryRunner.query(\`                                            |
|                                                                       |
| CREATE UNIQUE INDEX IF NOT EXISTS uq_counter_offers_one_pending       |
|                                                                       |
| ON offer_service.counter_offers (offer_id)                            |
|                                                                       |
| WHERE status = \'PENDING\'                                            |
|                                                                       |
| \`);                                                                  |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // offer_history table indexes                                        |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Simple offer_id lookup                                             |
|                                                                       |
| await queryRunner.query(\`                                            |
|                                                                       |
| CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_oh_offer_id               |
|                                                                       |
| ON offer_service.offer_history (offer_id)                             |
|                                                                       |
| \`);                                                                  |
|                                                                       |
| // Composite with created_at DESC --- paginated history (eliminates   |
| sort)                                                                 |
|                                                                       |
| await queryRunner.query(\`                                            |
|                                                                       |
| CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_oh_offer_id_created       |
|                                                                       |
| ON offer_service.offer_history (offer_id, created_at DESC)            |
|                                                                       |
| \`);                                                                  |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // outbox table indexes                                               |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Partial: only PENDING/PROCESSING rows --- outbox poller query      |
|                                                                       |
| await queryRunner.query(\`                                            |
|                                                                       |
| CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_outbox_status_scheduled   |
|                                                                       |
| ON offer_service.outbox (status, scheduled_at)                        |
|                                                                       |
| WHERE status IN (\'PENDING\', \'PROCESSING\')                         |
|                                                                       |
| \`);                                                                  |
|                                                                       |
| // Aggregate ID lookup --- debugging and monitoring                   |
|                                                                       |
| await queryRunner.query(\`                                            |
|                                                                       |
| CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_outbox_aggregate_id       |
|                                                                       |
| ON offer_service.outbox (aggregate_id)                                |
|                                                                       |
| \`);                                                                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| public async down(queryRunner: QueryRunner): Promise\<void\> {        |
|                                                                       |
| // Drop indexes in reverse creation order.                            |
|                                                                       |
| // Note: DROP INDEX CONCURRENTLY also cannot run in a transaction.    |
|                                                                       |
| await queryRunner.query(\`DROP INDEX CONCURRENTLY IF EXISTS           |
| offer_service.idx_outbox_aggregate_id\`);                             |
|                                                                       |
| await queryRunner.query(\`DROP INDEX CONCURRENTLY IF EXISTS           |
| offer_service.idx_outbox_status_scheduled\`);                         |
|                                                                       |
| await queryRunner.query(\`DROP INDEX CONCURRENTLY IF EXISTS           |
| offer_service.idx_oh_offer_id_created\`);                             |
|                                                                       |
| await queryRunner.query(\`DROP INDEX CONCURRENTLY IF EXISTS           |
| offer_service.idx_oh_offer_id\`);                                     |
|                                                                       |
| await queryRunner.query(\`DROP INDEX IF EXISTS                        |
| offer_service.uq_counter_offers_one_pending\`);                       |
|                                                                       |
| await queryRunner.query(\`DROP INDEX CONCURRENTLY IF EXISTS           |
| offer_service.idx_co_expires\`);                                      |
|                                                                       |
| await queryRunner.query(\`DROP INDEX CONCURRENTLY IF EXISTS           |
| offer_service.idx_co_offer_status\`);                                 |
|                                                                       |
| await queryRunner.query(\`DROP INDEX CONCURRENTLY IF EXISTS           |
| offer_service.idx_co_offer_id\`);                                     |
|                                                                       |
| await queryRunner.query(\`DROP INDEX CONCURRENTLY IF EXISTS           |
| offer_service.idx_offers_talent_status\`);                            |
|                                                                       |
| await queryRunner.query(\`DROP INDEX CONCURRENTLY IF EXISTS           |
| offer_service.idx_offers_status_expires\`);                           |
|                                                                       |
| await queryRunner.query(\`DROP INDEX CONCURRENTLY IF EXISTS           |
| offer_service.idx_offers_client_talent\`);                            |
|                                                                       |
| await queryRunner.query(\`DROP INDEX CONCURRENTLY IF EXISTS           |
| offer_service.idx_offers_talent_id\`);                                |
|                                                                       |
| await queryRunner.query(\`DROP INDEX CONCURRENTLY IF EXISTS           |
| offer_service.idx_offers_client_id\`);                                |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 5 Template for Future Migrations**                             |
|                                                                       |
| Copy this for every new migration                                     |
+-----------------------------------------------------------------------+

Use this template when creating a migration manually (for operations
TypeORM cannot auto-generate: indexes, partial indexes, constraints,
data backfills, enum value additions). For schema changes that TypeORM
CAN detect from entity changes, use migration:generate instead and
review the output.

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/migrations/{timestamp}-{MigrationName}.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { MigrationInterface, QueryRunner } from \'typeorm\';          |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* Migration NNN --- {Describe what this migration does}              |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Reason: {Why this change is needed --- link to ticket/issue}       |
|                                                                       |
| \* Author: {your name}                                                |
|                                                                       |
| \* Date: {YYYY-MM-DD}                                                 |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export class {MigrationName}{timestamp} implements MigrationInterface |
| {                                                                     |
|                                                                       |
| name = \'{MigrationName}{timestamp}\';                                |
|                                                                       |
| // Remove the next line if you do NOT use CREATE/DROP INDEX           |
| CONCURRENTLY.                                                         |
|                                                                       |
| // transaction: false is required ONLY for CONCURRENTLY operations.   |
|                                                                       |
| // transaction = false;                                               |
|                                                                       |
| public async up(queryRunner: QueryRunner): Promise\<void\> {          |
|                                                                       |
| // Write your forward migration SQL here.                             |
|                                                                       |
| // Use queryRunner.query() for each SQL statement.                    |
|                                                                       |
| // Use template literals for multi-line SQL (backtick strings).       |
|                                                                       |
| // Example: add a column                                              |
|                                                                       |
| await queryRunner.query(\`                                            |
|                                                                       |
| ALTER TABLE offer_service.offers                                      |
|                                                                       |
| ADD COLUMN new_column VARCHAR(100)                                    |
|                                                                       |
| \`);                                                                  |
|                                                                       |
| // Example: add an index (use CONCURRENTLY on live tables)            |
|                                                                       |
| await queryRunner.query(\`                                            |
|                                                                       |
| CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_offers_new_column         |
|                                                                       |
| ON offer_service.offers (new_column)                                  |
|                                                                       |
| \`);                                                                  |
|                                                                       |
| // Example: add a constraint                                          |
|                                                                       |
| await queryRunner.query(\`                                            |
|                                                                       |
| ALTER TABLE offer_service.offers                                      |
|                                                                       |
| ADD CONSTRAINT chk_new_column CHECK (new_column IN (\'A\', \'B\',     |
| \'C\'))                                                               |
|                                                                       |
| \`);                                                                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| public async down(queryRunner: QueryRunner): Promise\<void\> {        |
|                                                                       |
| // Write the EXACT REVERSAL of up() here.                             |
|                                                                       |
| // Every statement in up() must have a matching reversal here.        |
|                                                                       |
| // Order: reverse of up().                                            |
|                                                                       |
| await queryRunner.query(\`                                            |
|                                                                       |
| ALTER TABLE offer_service.offers                                      |
|                                                                       |
| DROP CONSTRAINT IF EXISTS chk_new_column                              |
|                                                                       |
| \`);                                                                  |
|                                                                       |
| await queryRunner.query(\`                                            |
|                                                                       |
| DROP INDEX CONCURRENTLY IF EXISTS offer_service.idx_offers_new_column |
|                                                                       |
| \`);                                                                  |
|                                                                       |
| await queryRunner.query(\`                                            |
|                                                                       |
| ALTER TABLE offer_service.offers                                      |
|                                                                       |
| DROP COLUMN IF EXISTS new_column                                      |
|                                                                       |
| \`);                                                                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 6 CLI Command Reference**                                      |
|                                                                       |
| Every migration command with examples                                 |
+-----------------------------------------------------------------------+

All commands are run from the monorepo root. Ensure DB environment
variables are set in your shell before running any migration command.
The commands read from .env by default --- set DOTENV_CONFIG_PATH if
your .env is in a non-standard location.

**migration:show --- See what is pending**

Always run this first to see the current migration state. Shows which
migrations have been run and which are pending.

+-----------------------------------------------------------------------+
| npm run migration:show \--workspace=apps/offer-service                |
|                                                                       |
| \# Expected output when nothing is run yet:                           |
|                                                                       |
| \# \[ \] InitialSchema1706601600000                                   |
|                                                                       |
| \# \[ \] AddIndexes1706601700000                                      |
|                                                                       |
| \# Expected output after running both migrations:                     |
|                                                                       |
| \# \[X\] InitialSchema1706601600000                                   |
|                                                                       |
| \# \[X\] AddIndexes1706601700000                                      |
|                                                                       |
| \# \[X\] = executed, \[ \] = pending                                  |
+-----------------------------------------------------------------------+

**migration:run --- Apply all pending migrations**

Runs all pending migrations in timestamp order. Safe to run multiple
times --- already-executed migrations are skipped. This is the command
run in CI/CD deployment pipelines.

+-----------------------------------------------------------------------+
| npm run migration:run \--workspace=apps/offer-service                 |
|                                                                       |
| \# Output:                                                            |
|                                                                       |
| \# query: SELECT \* FROM \"offer_service\".\"migrations\" \...        |
|                                                                       |
| \# 0 migrations are already loaded in the database.                   |
|                                                                       |
| \# 2 migrations were found in the source code.                        |
|                                                                       |
| \# 2 migrations are new migrations must be executed.                  |
|                                                                       |
| \# query: START TRANSACTION                                           |
|                                                                       |
| \# query: CREATE SCHEMA IF NOT EXISTS offer_service                   |
|                                                                       |
| \# \... (all DDL statements)                                          |
|                                                                       |
| \# query: INSERT INTO \"offer_service\".\"migrations\" \...           |
|                                                                       |
| \# query: COMMIT                                                      |
|                                                                       |
| \# Migration InitialSchema1706601600000 has been executed             |
| successfully.                                                         |
|                                                                       |
| \# Migration AddIndexes1706601700000 has been executed successfully.  |
|                                                                       |
| \# If all migrations are already run:                                 |
|                                                                       |
| \# No migrations are pending                                          |
|                                                                       |
| \# Exit code 0 = success, any other = failure                         |
+-----------------------------------------------------------------------+

**migration:revert --- Roll back the most recent migration**

Reverts ONLY the most recently executed migration by calling its down()
method. Call it multiple times to revert multiple migrations in
sequence. After reverting, the migration row is removed from
offer_service.migrations.

+-----------------------------------------------------------------------+
| \# Before reverting, see what is currently executed:                  |
|                                                                       |
| npm run migration:show \--workspace=apps/offer-service                |
|                                                                       |
| \# \[X\] InitialSchema1706601600000                                   |
|                                                                       |
| \# \[X\] AddIndexes1706601700000                                      |
|                                                                       |
| \# Revert the most recent (AddIndexes):                               |
|                                                                       |
| npm run migration:revert \--workspace=apps/offer-service              |
|                                                                       |
| \# Output: Reverted migration AddIndexes1706601700000                 |
|                                                                       |
| \# Revert again (now InitialSchema):                                  |
|                                                                       |
| npm run migration:revert \--workspace=apps/offer-service              |
|                                                                       |
| \# Output: Reverted migration InitialSchema1706601600000              |
|                                                                       |
| \# After second revert: all tables and schema are dropped.            |
|                                                                       |
| \# migration:show shows both as \[ \] (pending).                      |
+-----------------------------------------------------------------------+

**migration:generate --- Auto-generate from entity diffs**

Compares the current database schema against the entity definitions and
generates a migration for any differences detected. ALWAYS review the
generated file before running it.

+------------------------------------------------------------------------------+
| \# Generate a migration named \"add-withdrawal-message-column\"              |
|                                                                              |
| npm run migration:generate \--name=add-withdrawal-message-column             |
| \--workspace=apps/offer-service                                              |
|                                                                              |
| \# Output: Migration                                                         |
| apps/offer-service/migrations/1706610000000-add-withdrawal-message-column.ts |
|                                                                              |
| \# Review the generated file BEFORE running it:                              |
|                                                                              |
| \# cat                                                                       |
| apps/offer-service/migrations/1706610000000-add-withdrawal-message-column.ts |
|                                                                              |
| \# Look for any unexpected statements:                                       |
|                                                                              |
| \# DROP TABLE --- TypeORM thinks a table was removed. Never allow this       |
| unintentionally.                                                             |
|                                                                              |
| \# DROP COLUMN --- TypeORM thinks a column was removed. Extremely dangerous  |
| in prod.                                                                     |
|                                                                              |
| \# ALTER COLUMN --- TypeORM detected a type or constraint change.            |
|                                                                              |
| \# If the generated migration looks correct, run it:                         |
|                                                                              |
| npm run migration:run \--workspace=apps/offer-service                        |
+------------------------------------------------------------------------------+

**migration:create --- Create a blank migration**

Creates an empty migration file with the correct timestamp and class
name. Use this for: custom indexes, partial indexes, constraints, data
migrations, and anything TypeORM cannot auto-generate from entities.

+-----------------------------------------------------------------------+
| \# Create blank migration for a new index                             |
|                                                                       |
| npm run migration:create \--name=AddDeclineChipIndex                  |
| \--workspace=apps/offer-service                                       |
|                                                                       |
| \# Creates:                                                           |
| apps/offer-service/migrations/1706620000000-AddDeclineChipIndex.ts    |
|                                                                       |
| \# File contains empty up() and down() methods.                       |
|                                                                       |
| \# Fill in the SQL manually.                                          |
|                                                                       |
| \# Get current Unix timestamp (for naming manual files):              |
|                                                                       |
| node -e \"console.log(Date.now())\"                                   |
|                                                                       |
| \# Example output: 1706620000000                                      |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Reference 1 Naming Conventions**                                    |
|                                                                       |
| Rules for migration file and class names                              |
+-----------------------------------------------------------------------+

Consistent naming makes the migration history readable. Every migration
file has a timestamp and a description. The description tells you what
the migration does without opening the file.

  --------------------- -------------------------------------------------
  **Convention**        **Detail**

  **File format**       {UnixMilliseconds}-{PascalCaseName}.ts

  **Timestamp**         Unix timestamp in milliseconds (13 digits). Use
                        Date.now() to generate. Auto-assigned by
                        migration:generate and migration:create.

  **Name format**       PascalCase. Describes what the migration does.
                        Start with a verb: Add, Remove, Create, Drop,
                        Update, Rename, Backfill.

  **Class name**        {PascalCaseName}{timestamp} --- matches the
                        filename. TypeORM tracks by class name, not
                        filename, in some versions.

  **name property**     Always set: name = \'{ClassName}{timestamp}\'.
                        Prevents tracking mismatches if the class is
                        renamed.

  **Never rename**      Once a migration file is committed and run, NEVER
                        rename it or its class. TypeORM tracks by this
                        identity.

  **Good examples**     AddDeclineChipColumn, RemoveObsoleteStatusColumn,
                        BackfillMissingCurrencyCode,
                        CreateOfferTitleUniqueIndex

  **Bad examples**      Migration1, Fix, UpdateDB, Version2 --- these are
                        meaningless in a git history
  --------------------- -------------------------------------------------

+-----------------------------------------------------------------------+
| **Reference 2 Zero-Downtime Migration Patterns**                      |
|                                                                       |
| How to make schema changes without service outage                     |
+-----------------------------------------------------------------------+

Production schema changes must not block queries or cause timeouts.
PostgreSQL takes exclusive locks for some DDL operations. These patterns
let you make schema changes safely while the service continues to serve
traffic.

**Pattern 1 --- Adding a nullable column (safe, zero downtime)**

Adding a nullable column with a default is instant in PostgreSQL 11+.
The existing rows are not updated --- the default is applied to new rows
only. This operation does not require a table lock for long.

+-----------------------------------------------------------------------+
| // Safe: add nullable column with server-side default                 |
|                                                                       |
| await queryRunner.query(\`                                            |
|                                                                       |
| ALTER TABLE offer_service.offers                                      |
|                                                                       |
| ADD COLUMN IF NOT EXISTS new_field VARCHAR(50) DEFAULT NULL           |
|                                                                       |
| \`);                                                                  |
|                                                                       |
| // Safe: add NOT NULL column with a default value (PostgreSQL 11+)    |
|                                                                       |
| // PostgreSQL adds it as a virtual column with a catalog default.     |
|                                                                       |
| // It only writes to disk if rows are updated.                        |
|                                                                       |
| await queryRunner.query(\`                                            |
|                                                                       |
| ALTER TABLE offer_service.offers                                      |
|                                                                       |
| ADD COLUMN IF NOT EXISTS new_status_field VARCHAR(20) NOT NULL        |
| DEFAULT \'ACTIVE\'                                                    |
|                                                                       |
| \`);                                                                  |
+-----------------------------------------------------------------------+

**Pattern 2 --- Adding an index without locking (CREATE INDEX
CONCURRENTLY)**

Regular CREATE INDEX takes a ShareLock that blocks writes for the
duration. CREATE INDEX CONCURRENTLY builds the index in the background
without blocking reads or writes. It takes longer but is safe for
production.

+-----------------------------------------------------------------------+
| // Always use CONCURRENTLY when adding indexes to existing tables     |
| with data.                                                            |
|                                                                       |
| // Requires transaction = false on the migration class.               |
|                                                                       |
| await queryRunner.query(\`                                            |
|                                                                       |
| CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_offers_new_field          |
|                                                                       |
| ON offer_service.offers (new_field)                                   |
|                                                                       |
| \`);                                                                  |
|                                                                       |
| // NEVER use this on a live table:                                    |
|                                                                       |
| // CREATE INDEX idx_offers_new_field ON offer_service.offers          |
| (new_field);                                                          |
|                                                                       |
| // \^\^\^ This blocks all writes for the duration of index build.     |
+-----------------------------------------------------------------------+

**Pattern 3 --- Renaming a column (requires a multi-step migration)**

You cannot rename a column atomically in zero-downtime deployments
because the application code and the database must agree on the column
name. The pattern is: add new column, dual-write in app code, backfill
old data, switch reads to new column, drop old column across multiple
deployments.

+-----------------------------------------------------------------------+
| // Step 1 (Migration): Add the new column alongside the old one.      |
|                                                                       |
| await queryRunner.query(\`                                            |
|                                                                       |
| ALTER TABLE offer_service.offers                                      |
|                                                                       |
| ADD COLUMN IF NOT EXISTS new_column_name VARCHAR(200)                 |
|                                                                       |
| \`);                                                                  |
|                                                                       |
| // Step 2 (App code): Write to BOTH columns. Read from old column.    |
|                                                                       |
| // Deploy this version of the app.                                    |
|                                                                       |
| // Step 3 (Migration): Backfill new column from old column.           |
|                                                                       |
| await queryRunner.query(\`                                            |
|                                                                       |
| UPDATE offer_service.offers                                           |
|                                                                       |
| SET new_column_name = old_column_name                                 |
|                                                                       |
| WHERE new_column_name IS NULL                                         |
|                                                                       |
| \`);                                                                  |
|                                                                       |
| // Step 4 (App code): Read from NEW column. Still write to both.      |
|                                                                       |
| // Deploy this version.                                               |
|                                                                       |
| // Step 5 (App code): Remove writes to old column.                    |
|                                                                       |
| // Deploy this version.                                               |
|                                                                       |
| // Step 6 (Migration): Drop old column.                               |
|                                                                       |
| await queryRunner.query(\`                                            |
|                                                                       |
| ALTER TABLE offer_service.offers                                      |
|                                                                       |
| DROP COLUMN IF EXISTS old_column_name                                 |
|                                                                       |
| \`);                                                                  |
+-----------------------------------------------------------------------+

**Pattern 4 --- Adding a NOT NULL constraint to an existing column**

Adding NOT NULL to an existing column that has NULL values will fail.
Even if all values are non-null, PostgreSQL scans the entire table to
verify, taking a long time. Use this multi-step pattern instead.

+-----------------------------------------------------------------------+
| // Step 1: Add a NOT VALID constraint (does not scan existing rows).  |
|                                                                       |
| // New writes must satisfy the constraint. Existing nulls are not     |
| checked.                                                              |
|                                                                       |
| await queryRunner.query(\`                                            |
|                                                                       |
| ALTER TABLE offer_service.offers                                      |
|                                                                       |
| ADD CONSTRAINT chk_currency_code_not_null                             |
|                                                                       |
| CHECK (currency_code IS NOT NULL) NOT VALID                           |
|                                                                       |
| \`);                                                                  |
|                                                                       |
| // Step 2: Validate the constraint in the background.                 |
|                                                                       |
| // VALIDATE CONSTRAINT scans the table but only holds a               |
| ShareUpdateExclusiveLock,                                             |
|                                                                       |
| // which does NOT block reads or normal writes.                       |
|                                                                       |
| await queryRunner.query(\`                                            |
|                                                                       |
| ALTER TABLE offer_service.offers                                      |
|                                                                       |
| VALIDATE CONSTRAINT chk_currency_code_not_null                        |
|                                                                       |
| \`);                                                                  |
|                                                                       |
| // Step 3 (later migration): Set NOT NULL formally.                   |
|                                                                       |
| // PostgreSQL is smart enough to skip the table scan if the           |
|                                                                       |
| // constraint is already validated.                                   |
|                                                                       |
| await queryRunner.query(\`                                            |
|                                                                       |
| ALTER TABLE offer_service.offers                                      |
|                                                                       |
| ALTER COLUMN currency_code SET NOT NULL                               |
|                                                                       |
| \`);                                                                  |
|                                                                       |
| // Step 4: Drop the check constraint (now redundant).                 |
|                                                                       |
| await queryRunner.query(\`                                            |
|                                                                       |
| ALTER TABLE offer_service.offers                                      |
|                                                                       |
| DROP CONSTRAINT IF EXISTS chk_currency_code_not_null                  |
|                                                                       |
| \`);                                                                  |
+-----------------------------------------------------------------------+

**Pattern 5 --- Data backfill migration**

When a migration needs to update existing data (e.g. set a default value
on a new column for existing rows), batch the updates to avoid locking
the table for a long time.

+-----------------------------------------------------------------------+
| // Do NOT do this on a large table --- it locks every row:            |
|                                                                       |
| // await queryRunner.query(\`UPDATE offer_service.offers SET new_col  |
| = \'default\'\`);                                                     |
|                                                                       |
| // DO this: batch update in chunks of 1000 rows.                      |
|                                                                       |
| // Each batch is a separate transaction, allowing other queries to    |
| proceed.                                                              |
|                                                                       |
| async up(queryRunner: QueryRunner): Promise\<void\> {                 |
|                                                                       |
| let updated = 1;                                                      |
|                                                                       |
| while (updated \> 0) {                                                |
|                                                                       |
| const result = await queryRunner.query(\`                             |
|                                                                       |
| UPDATE offer_service.offers                                           |
|                                                                       |
| SET new_col = \'default\'                                             |
|                                                                       |
| WHERE new_col IS NULL                                                 |
|                                                                       |
| AND id IN (                                                           |
|                                                                       |
| SELECT id FROM offer_service.offers                                   |
|                                                                       |
| WHERE new_col IS NULL                                                 |
|                                                                       |
| LIMIT 1000                                                            |
|                                                                       |
| FOR UPDATE SKIP LOCKED                                                |
|                                                                       |
| )                                                                     |
|                                                                       |
| \`);                                                                  |
|                                                                       |
| updated = result\[1\]; // affected row count                          |
|                                                                       |
| if (updated \> 0) {                                                   |
|                                                                       |
| // Small delay to allow other queries to run between batches          |
|                                                                       |
| await new Promise(resolve =\> setTimeout(resolve, 10));               |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 7 Verification Checklist --- First Deploy**                    |
|                                                                       |
| Run this when setting up offer-service for the first time             |
+-----------------------------------------------------------------------+

Follow these steps in order when deploying offer-service to a new
environment (local, dev, staging, or production). Every step must
succeed before proceeding to the next.

+-----------------------------------------------------------------------+
| \# ============================================================       |
|                                                                       |
| \# Pre-flight checks                                                  |
|                                                                       |
| \# ============================================================       |
|                                                                       |
| \# 1. Verify DB environment variables are set                         |
|                                                                       |
| echo \"DB_HOST=\$DB_HOST\"                                            |
|                                                                       |
| echo \"DB_PORT=\$DB_PORT\"                                            |
|                                                                       |
| echo \"DB_DATABASE=\$DB_DATABASE\"                                    |
|                                                                       |
| \# All must be non-empty. Never echo DB_PASSWORD in production.       |
|                                                                       |
| \# 2. Verify DB connection works                                      |
|                                                                       |
| psql -h \$DB_HOST -p \$DB_PORT -U \$DB_USERNAME -d \$DB_DATABASE -c   |
| \"SELECT 1\"                                                          |
|                                                                       |
| \# Expected: 1 row returned.                                          |
|                                                                       |
| \# 3. Verify typeorm config can be loaded without errors              |
|                                                                       |
| npx typeorm-ts-node-commonjs -d                                       |
| apps/offer-service/src/config/typeorm.config.ts migration:show        |
|                                                                       |
| \# Should list migrations without error.                              |
|                                                                       |
| \# ============================================================       |
|                                                                       |
| \# Run migrations                                                     |
|                                                                       |
| \# ============================================================       |
|                                                                       |
| \# 4. Check current migration state                                   |
|                                                                       |
| npm run migration:show \--workspace=apps/offer-service                |
|                                                                       |
| \# Expected first time: \[ \] InitialSchema, \[ \] AddIndexes         |
|                                                                       |
| \# 5. Run all pending migrations                                      |
|                                                                       |
| npm run migration:run \--workspace=apps/offer-service                 |
|                                                                       |
| \# Expected: both migrations execute, exit code 0                     |
|                                                                       |
| \# 6. Verify migration state                                          |
|                                                                       |
| npm run migration:show \--workspace=apps/offer-service                |
|                                                                       |
| \# Expected: \[X\] InitialSchema, \[X\] AddIndexes                    |
|                                                                       |
| \# ============================================================       |
|                                                                       |
| \# Database verification                                              |
|                                                                       |
| \# ============================================================       |
|                                                                       |
| \# 7. Verify tables exist                                             |
|                                                                       |
| psql -h \$DB_HOST -U \$DB_USERNAME -d \$DB_DATABASE -c \\             |
|                                                                       |
| \"SELECT table_name FROM information_schema.tables WHERE table_schema |
| = \'offer_service\' ORDER BY table_name;\"                            |
|                                                                       |
| \# Expected: counter_offers, migrations, offer_history, offers,       |
| outbox                                                                |
|                                                                       |
| \# 8. Verify critical partial unique index                            |
|                                                                       |
| psql -h \$DB_HOST -U \$DB_USERNAME -d \$DB_DATABASE -c \\             |
|                                                                       |
| \"SELECT indexname, indexdef FROM pg_indexes WHERE schemaname =       |
| \'offer_service\' AND indexname =                                     |
| \'uq_counter_offers_one_pending\';\"                                  |
|                                                                       |
| \# Expected: 1 row with WHERE ((status)::text = \'PENDING\')          |
|                                                                       |
| \# 9. Count all indexes                                               |
|                                                                       |
| psql -h \$DB_HOST -U \$DB_USERNAME -d \$DB_DATABASE -c \\             |
|                                                                       |
| \"SELECT COUNT(\*) FROM pg_indexes WHERE schemaname =                 |
| \'offer_service\';\"                                                  |
|                                                                       |
| \# Expected: 15 (14 custom + 1 migrations table PK)                   |
|                                                                       |
| \# ============================================================       |
|                                                                       |
| \# Start service                                                      |
|                                                                       |
| \# ============================================================       |
|                                                                       |
| \# 10. Start with DB_SYNC=false (always)                              |
|                                                                       |
| \# Verify .env has: DB_SYNC=false                                     |
|                                                                       |
| grep DB_SYNC .env                                                     |
|                                                                       |
| \# Expected: DB_SYNC=false                                            |
|                                                                       |
| \# 11. Start the service                                              |
|                                                                       |
| npm run start:dev \--workspace=apps/offer-service                     |
|                                                                       |
| \# Look for: \"offer-service listening on :3005\"                     |
|                                                                       |
| \# No \"entity metadata not found\" errors.                           |
|                                                                       |
| \# No \"relation does not exist\" errors.                             |
|                                                                       |
| \# 12. Verify health endpoint                                         |
|                                                                       |
| curl -s http://localhost:3005/health \| jq .status                    |
|                                                                       |
| \# Expected: \"ok\"                                                   |
|                                                                       |
| curl -s http://localhost:3005/ready \| jq                             |
|                                                                       |
| \# Expected: { \"status\": \"ready\", \"checks\": { \"db\":           |
| \"connected\", \... } }                                               |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| If migration:run fails with \"role does not exist\":                  |
|                                                                       |
| DB_USERNAME in .env does not exist in PostgreSQL.                     |
|                                                                       |
| Create the role: CREATE ROLE offer_service_user LOGIN PASSWORD        |
| \'\...\';                                                             |
|                                                                       |
| Grant permissions: GRANT ALL ON SCHEMA offer_service TO               |
| offer_service_user;                                                   |
|                                                                       |
| If migration:run fails with \"permission denied to create schema\":   |
|                                                                       |
| The database user does not have CREATE SCHEMA privilege.              |
|                                                                       |
| Grant it: GRANT CREATE ON DATABASE marketeq_dev TO                    |
| offer_service_user;                                                   |
|                                                                       |
| If migration:run fails mid-way and leaves partial tables:             |
|                                                                       |
| Run migration:revert to undo the partial migration.                   |
|                                                                       |
| Fix the issue, then run migration:run again.                          |
|                                                                       |
| If revert also fails (rare), manually DROP the partial objects and    |
|                                                                       |
| delete the row from offer_service.migrations for that migration.      |
|                                                                       |
| If typeorm.config.ts cannot find entity files:                        |
|                                                                       |
| Check the entities glob path in typeorm.config.ts.                    |
|                                                                       |
| Run the service once in dev to confirm entities load (check startup   |
| logs).                                                                |
|                                                                       |
| Entity files must be compiled or accessible to ts-node.               |
+-----------------------------------------------------------------------+
