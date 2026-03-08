**[MARKETEQ PLATFORM --- BACKEND DOCUMENTATION]{.smallcaps}**

**earnings-service**

**ES-01 --- Database Schema & Entities**

  -----------------------------------------------------------------------
  **Property**       **Value**
  ------------------ ----------------------------------------------------
  **Service**        earnings-service

  **Document**       ES-01 --- Database Schema & Entities

  **Series**         earnings-service Documentation Series

  **Version**        1.0

  **Status**         Draft --- Awaiting Engineering Review

  **Monorepo Path**  apps/earnings-service/src/

  **Prerequisite**   ES-00 --- Service Overview & Architecture (read
                     first)

  **Next Document**  ES-02 --- REST API Endpoints (Contractor-Facing)
  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Purpose**                                                           |
|                                                                       |
| This document defines the complete PostgreSQL database schema for     |
| earnings-service.                                                     |
|                                                                       |
| It covers every table, every column, every index, every constraint,   |
| and every TypeORM entity                                              |
|                                                                       |
| file --- with full production-ready code for each.                    |
|                                                                       |
| After reading this document an engineer will know exactly what the    |
| database looks like,                                                  |
|                                                                       |
| where every file lives in the repo, how to run the migrations, and    |
| how to verify the schema                                              |
|                                                                       |
| was applied correctly. Nothing is left incomplete or marked TODO.     |
|                                                                       |
| This document does NOT cover: API endpoints (ES-02), RabbitMQ         |
| consumers (ES-04),                                                    |
|                                                                       |
| Redis caching strategy (ES-07), or currency conversion logic (ES-06). |
+=======================================================================+

# **1. Prerequisites**

Before working with anything in this document, the following must be
read and set up.

  ----------------------------------------------------------------------------
  **Requirement**       **What it covers**             **Where**
  --------------------- ------------------------------ -----------------------
  **ES-00 --- Service   Service purpose, boundaries,   Read first --- all
  Overview &            dependency map, folder         architectural decisions
  Architecture**        structure, environment         referenced here come
                        variables                      from ES-00

  **PostgreSQL          The service needs a live       See docker-compose.yml
  running**             PostgreSQL instance            in section 2 below

  **Node.js 20+**       TypeORM and NestJS require     Install from nodejs.org
                        Node 20 or higher              

  **npm install         All dependencies must be       Run: cd
  complete**            installed before running       apps/earnings-service
                        migrations                     && npm install
  ----------------------------------------------------------------------------

# **2. Repo & Folder Placement**

Every file introduced in this document belongs under
apps/earnings-service/src/. The full folder structure for this service
is shown below. Files introduced in this document are marked with ←
ES-01.

+-----------------------------------------------------------------------+
| plaintext                                                             |
+-----------------------------------------------------------------------+
| apps/                                                                 |
|                                                                       |
| └─ earnings-service/                                                  |
|                                                                       |
| ├─ Dockerfile (see Section 3)                                         |
|                                                                       |
| ├─ package.json                                                       |
|                                                                       |
| ├─ package-lock.json                                                  |
|                                                                       |
| ├─ tsconfig.json (see Section 3)                                      |
|                                                                       |
| └─ src/                                                               |
|                                                                       |
| ├─ app.module.ts (see ES-02)                                          |
|                                                                       |
| ├─ main.ts (see ES-02)                                                |
|                                                                       |
| │                                                                     |
|                                                                       |
| ├─ database/ ← ES-01 (all files in this folder)                       |
|                                                                       |
| │ ├─ database.module.ts ← ES-01                                       |
|                                                                       |
| │ └─ migrations/ ← ES-01                                              |
|                                                                       |
| │ ├─ 1700000001-CreateEarningsCache.ts ← ES-01                        |
|                                                                       |
| │ ├─ 1700000002-CreateBalanceSnapshots.ts ← ES-01                     |
|                                                                       |
| │ ├─ 1700000003-CreateFxRateCache.ts ← ES-01                          |
|                                                                       |
| │ └─ 1700000004-CreateContractLabelCache.ts ← ES-01                   |
|                                                                       |
| │                                                                     |
|                                                                       |
| ├─ entities/ ← ES-01 (all files in this folder)                       |
|                                                                       |
| │ ├─ earnings-cache.entity.ts ← ES-01                                 |
|                                                                       |
| │ ├─ balance-snapshot.entity.ts ← ES-01                               |
|                                                                       |
| │ ├─ fx-rate-cache.entity.ts ← ES-01                                  |
|                                                                       |
| │ └─ contract-label-cache.entity.ts ← ES-01                           |
|                                                                       |
| │                                                                     |
|                                                                       |
| ├─ balance/ (see ES-02, ES-07)                                        |
|                                                                       |
| ├─ earnings/ (see ES-02)                                              |
|                                                                       |
| ├─ consumers/ (see ES-04)                                             |
|                                                                       |
| ├─ publishers/ (see ES-05)                                            |
|                                                                       |
| ├─ currency/ (see ES-06)                                              |
|                                                                       |
| ├─ export/ (see ES-09)                                                |
|                                                                       |
| └─ guards/ (see ES-14)                                                |
+=======================================================================+

# **3. Docker & Runtime Setup**

Every setup and implementation document includes the full Docker
configuration. Even if you have already set up Docker from another
document, read this section --- it contains the database-specific
environment variables and the docker-compose service entry for
PostgreSQL that this service depends on.

## **3.1 Dockerfile**

Place this file at apps/earnings-service/Dockerfile. This is the
production Dockerfile.

+-----------------------------------------------------------------------+
| dockerfile                                                            |
+-----------------------------------------------------------------------+
| \# apps/earnings-service/Dockerfile                                   |
|                                                                       |
| FROM node:20-alpine                                                   |
|                                                                       |
| WORKDIR /usr/src/app                                                  |
|                                                                       |
| \# Copy dependency manifests first (layer cache optimisation)         |
|                                                                       |
| COPY package\*.json ./                                                |
|                                                                       |
| \# Install all dependencies including devDependencies for build step  |
|                                                                       |
| RUN npm ci                                                            |
|                                                                       |
| \# Copy full source                                                   |
|                                                                       |
| COPY . .                                                              |
|                                                                       |
| \# Compile TypeScript to /dist                                        |
|                                                                       |
| RUN npm run build                                                     |
|                                                                       |
| \# Expose the service port (must match PORT env var)                  |
|                                                                       |
| EXPOSE 3010                                                           |
|                                                                       |
| \# Start compiled output                                              |
|                                                                       |
| CMD \[\"node\", \"dist/main.js\"\]                                    |
+=======================================================================+

## **3.2 tsconfig.json**

Place this file at apps/earnings-service/tsconfig.json.

+-----------------------------------------------------------------------+
| json                                                                  |
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
| \"strictNullChecks\": false                                           |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **3.3 package.json**

Place this file at apps/earnings-service/package.json. This includes all
dependencies required for this document and the full earnings-service
series.

+-----------------------------------------------------------------------+
| json                                                                  |
+-----------------------------------------------------------------------+
| {                                                                     |
|                                                                       |
| \"name\": \"earnings-service\",                                       |
|                                                                       |
| \"version\": \"1.0.0\",                                               |
|                                                                       |
| \"scripts\": {                                                        |
|                                                                       |
| \"build\": \"nest build\",                                            |
|                                                                       |
| \"start:dev\": \"nest start \--watch\",                               |
|                                                                       |
| \"start:prod\": \"node dist/main.js\",                                |
|                                                                       |
| \"migration:run\": \"ts-node -r tsconfig-paths/register               |
| node_modules/.bin/typeorm migration:run -d                            |
| src/database/database.module.ts\",                                    |
|                                                                       |
| \"migration:revert\": \"ts-node -r tsconfig-paths/register            |
| node_modules/.bin/typeorm migration:revert -d                         |
| src/database/database.module.ts\"                                     |
|                                                                       |
| },                                                                    |
|                                                                       |
| \"dependencies\": {                                                   |
|                                                                       |
| \"@nestjs/common\": \"\^10.0.0\",                                     |
|                                                                       |
| \"@nestjs/core\": \"\^10.0.0\",                                       |
|                                                                       |
| \"@nestjs/platform-express\": \"\^10.0.0\",                           |
|                                                                       |
| \"@nestjs/typeorm\": \"\^10.0.0\",                                    |
|                                                                       |
| \"@nestjs/config\": \"\^3.0.0\",                                      |
|                                                                       |
| \"@nestjs/microservices\": \"\^10.0.0\",                              |
|                                                                       |
| \"typeorm\": \"\^0.3.17\",                                            |
|                                                                       |
| \"pg\": \"\^8.11.0\",                                                 |
|                                                                       |
| \"reflect-metadata\": \"\^0.1.13\",                                   |
|                                                                       |
| \"rxjs\": \"\^7.8.0\",                                                |
|                                                                       |
| \"class-validator\": \"\^0.14.0\",                                    |
|                                                                       |
| \"class-transformer\": \"\^0.5.1\",                                   |
|                                                                       |
| \"ioredis\": \"\^5.3.2\",                                             |
|                                                                       |
| \"amqplib\": \"\^0.10.3\"                                             |
|                                                                       |
| },                                                                    |
|                                                                       |
| \"devDependencies\": {                                                |
|                                                                       |
| \"@nestjs/cli\": \"\^10.0.0\",                                        |
|                                                                       |
| \"@nestjs/testing\": \"\^10.0.0\",                                    |
|                                                                       |
| \"@types/node\": \"\^20.0.0\",                                        |
|                                                                       |
| \"@types/pg\": \"\^8.0.0\",                                           |
|                                                                       |
| \"ts-node\": \"\^10.9.1\",                                            |
|                                                                       |
| \"tsconfig-paths\": \"\^4.2.0\",                                      |
|                                                                       |
| \"typescript\": \"\^5.1.0\"                                           |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **3.4 docker-compose.yml entry**

Add the following entries to the root docker-compose.yml in your
monorepo. The earnings-service entry and the shared postgres service
entry are both shown. If postgres is already defined in your
docker-compose.yml, do not add it again --- only add the
earnings-service entry.

+----------------------------------------------------------------------------------+
| yaml                                                                             |
+----------------------------------------------------------------------------------+
| \# Root docker-compose.yml --- add these entries                                 |
|                                                                                  |
| services:                                                                        |
|                                                                                  |
| \# ── PostgreSQL (shared across services) ──────────────────────                 |
|                                                                                  |
| \# Only add this block if postgres is not already defined.                       |
|                                                                                  |
| postgres:                                                                        |
|                                                                                  |
| image: postgres:15-alpine                                                        |
|                                                                                  |
| container_name: marketeq-postgres                                                |
|                                                                                  |
| restart: always                                                                  |
|                                                                                  |
| environment:                                                                     |
|                                                                                  |
| POSTGRES_USER: \${POSTGRES_USER}                                                 |
|                                                                                  |
| POSTGRES_PASSWORD: \${POSTGRES_PASSWORD}                                         |
|                                                                                  |
| POSTGRES_DB: \${POSTGRES_DB}                                                     |
|                                                                                  |
| ports:                                                                           |
|                                                                                  |
| \- \"5432:5432\"                                                                 |
|                                                                                  |
| volumes:                                                                         |
|                                                                                  |
| \- postgres_data:/var/lib/postgresql/data                                        |
|                                                                                  |
| healthcheck:                                                                     |
|                                                                                  |
| test: \[\"CMD-SHELL\", \"pg_isready -U \${POSTGRES_USER}\"\]                     |
|                                                                                  |
| interval: 10s                                                                    |
|                                                                                  |
| timeout: 5s                                                                      |
|                                                                                  |
| retries: 5                                                                       |
|                                                                                  |
| \# ── earnings-service ──────────────────────────────────────────                |
|                                                                                  |
| earnings-service:                                                                |
|                                                                                  |
| build:                                                                           |
|                                                                                  |
| context: ./apps/earnings-service                                                 |
|                                                                                  |
| dockerfile: Dockerfile                                                           |
|                                                                                  |
| container_name: earnings-service                                                 |
|                                                                                  |
| restart: always                                                                  |
|                                                                                  |
| environment:                                                                     |
|                                                                                  |
| DATABASE_URL:                                                                    |
| postgres://\${POSTGRES_USER}:\${POSTGRES_PASSWORD}@postgres:5432/\${POSTGRES_DB} |
|                                                                                  |
| REDIS_URL: redis://redis:6379                                                    |
|                                                                                  |
| RABBITMQ_URL: amqp://guest:guest@rabbitmq:5672                                   |
|                                                                                  |
| JWT_SECRET: \${JWT_SECRET}                                                       |
|                                                                                  |
| INTERNAL_SERVICE_TOKEN: \${INTERNAL_SERVICE_TOKEN}                               |
|                                                                                  |
| FX_API_URL: \${FX_API_URL}                                                       |
|                                                                                  |
| PORT: 3010                                                                       |
|                                                                                  |
| NODE_ENV: production                                                             |
|                                                                                  |
| ports:                                                                           |
|                                                                                  |
| \- \"3010:3010\"                                                                 |
|                                                                                  |
| depends_on:                                                                      |
|                                                                                  |
| postgres:                                                                        |
|                                                                                  |
| condition: service_healthy                                                       |
|                                                                                  |
| redis:                                                                           |
|                                                                                  |
| condition: service_started                                                       |
|                                                                                  |
| rabbitmq:                                                                        |
|                                                                                  |
| condition: service_started                                                       |
|                                                                                  |
| volumes:                                                                         |
|                                                                                  |
| postgres_data:                                                                   |
+==================================================================================+

# **4. Environment Variables**

Listed alphabetically. Every variable listed here is required unless
marked Optional. All values shown are examples --- never commit real
secrets to the repository.

  --------------------------------------------------------------------------------------------------------------------------------
  **Variable**                 **Required**   **Description**                **Example Value**
  ---------------------------- -------------- ------------------------------ -----------------------------------------------------
  **DATABASE_URL**             Yes            Full PostgreSQL connection     postgresql://marketeq:secret@postgres:5432/earnings
                                              string. The host changes       
                                              depending on your environment  
                                              (local Docker, AWS RDS,        
                                              self-hosted Supabase, etc.)    
                                              --- the application code never 
                                              changes, only this variable.   

  **FX_API_URL**               Yes            Base URL of the self-hosted    https://fx.internal.marketeq.com/v1
                                              fawazahmed0/exchange-api       
                                              instance. Used for             
                                              display-only currency          
                                              conversion. See ES-06 for full 
                                              FX integration spec.           

  **FX_CACHE_TTL_SECONDS**     Optional       How long FX rates are cached   3600
                                              in Redis before refresh.       
                                              Defaults to 3600 (1 hour) if   
                                              not set.                       

  **INTERNAL_SERVICE_TOKEN**   Yes            Bearer token used by           (never commit --- use secrets manager)
                                              payout-service and             
                                              kyc-identity-service to call   
                                              internal earnings-service      
                                              endpoints. Must match the      
                                              token configured in those      
                                              services. Rotate regularly.    

  **JWT_SECRET**               Yes            Shared JWT signing secret.     (never commit --- use secrets manager)
                                              Must match the value           
                                              configured in auth-service and 
                                              the API Gateway.               

  **NODE_ENV**                 Optional       Runtime environment. Affects   production
                                              logging verbosity. Set to      
                                              production in all deployed     
                                              environments.                  

  **PORT**                     Optional       HTTP port the service listens  3010
                                              on. Defaults to 3010.          

  **RABBITMQ_URL**             Yes            RabbitMQ connection string.    amqp://guest:guest@rabbitmq:5672
                                              Used by consumer and publisher 
                                              modules introduced in ES-04    
                                              and ES-05.                     

  **REDIS_URL**                Yes            Redis connection string. Used  redis://redis:6379
                                              for balance cache and FX rate  
                                              cache. See ES-07 for full      
                                              caching spec.                  
  --------------------------------------------------------------------------------------------------------------------------------

# **5. Database Schema Overview**

earnings-service owns four tables. Each table has a single, clearly
defined purpose. No table stores data that belongs to another service.

  -------------------------------------------------------------------------------------------------------------------
  **Table**                  **Purpose**            **Source of data**          **Who writes it**  **Who reads it**
  -------------------------- ---------------------- --------------------------- ------------------ ------------------
  **earnings_cache**         One row per earnings   transaction.created and     earnings-service   earnings-service
                             event received from    transaction.reversed events consumers (ES-04)  API (ES-02)
                             transaction-service.   consumed from RabbitMQ                         
                             This is the local                                                     
                             read-model that powers                                                
                             the Earnings tab                                                      
                             history list and                                                      
                             aggregation cards.                                                    

  **balance_snapshots**      Running balance per    Same events as              earnings-service   earnings-service
                             contractor. Updated on earnings_cache              consumers (ES-04)  API (ES-02),
                             every credit, debit,                                                  payout-service via
                             or payout event. One                                                  internal endpoint
                             row per contractor ---                                                (ES-03)
                             upserted on every                                                     
                             change.                                                               

  **fx_rate_cache**          Stores the most        Self-hosted                 earnings-service   earnings-service
                             recently fetched FX    fawazahmed0/exchange-api,   currency module    currency module
                             rate for each currency fetched on a 1-hour refresh (ES-06)            (ES-06)
                             pair. Used to avoid    cycle                                          
                             hitting the FX API on                                                 
                             every request.                                                        

  **contract_label_cache**   Maps contractId to     contract.activated events   earnings-service   earnings-service
                             human-readable label   from contracts-service      consumers (ES-04)  API (ES-02) ---
                             data (projectName,                                                    display only
                             clientName) for                                                       
                             display in earnings                                                   
                             history. Populated                                                    
                             from                                                                  
                             contract.activated                                                    
                             events.                                                               
  -------------------------------------------------------------------------------------------------------------------

# **6. Table Definitions**

## **6.1 Table: earnings_cache**

Stores one row for every earnings event. This is the local projection of
the transaction-service ledger --- not the source of truth, but the
display-ready view earnings-service reads from for the Earnings tab.

  --------------------------------------------------------------------------------------------------------
  **Column**             **Type**        **Nullable**   **Default**         **Description**
  ---------------------- --------------- -------------- ------------------- ------------------------------
  **id**                 uuid            No             gen_random_uuid()   Primary key. Generated by
                                                                            PostgreSQL.

  **transaction_id**     uuid            No             ---                 The ID of the ledger entry in
                                                                            transaction-service. Must be
                                                                            unique --- used for
                                                                            idempotency. If a duplicate
                                                                            transaction.created event
                                                                            arrives, the INSERT is ignored
                                                                            (ON CONFLICT DO NOTHING).

  **contractor_id**      uuid            No             ---                 The userId of the contractor
                                                                            who earned this amount.
                                                                            Foreign concept ---
                                                                            earnings-service does not own
                                                                            user records.

  **contract_id**        uuid            Yes            NULL                The contractId this earnings
                                                                            entry belongs to. NULL if the
                                                                            earning cannot be attributed
                                                                            to a specific contract.

  **project_id**         uuid            Yes            NULL                The projectId from the
                                                                            originating
                                                                            timetracking.hours.logged
                                                                            event. Used for display
                                                                            labeling.

  **task_id**            uuid            Yes            NULL                The taskId. May be NULL if no
                                                                            task was assigned to the time
                                                                            entry.

  **entry_type**         varchar(20)     No             ---                 Either \'screenshot\' or
                                                                            \'manual\'. Sourced from the
                                                                            timetracking.hours.logged
                                                                            event payload.

  **gross_amount**       numeric(18,8)   No             ---                 The full earned amount before
                                                                            the Marketeq 20% service fee.
                                                                            Stored in the contract\'s
                                                                            rateCurrency.

  **fee_amount**         numeric(18,8)   No             ---                 The Marketeq service fee
                                                                            deducted (20% of
                                                                            gross_amount). Stored in
                                                                            rateCurrency.

  **net_amount**         numeric(18,8)   No             ---                 gross_amount minus fee_amount.
                                                                            This is what the contractor
                                                                            actually earns. Stored in
                                                                            rateCurrency.

  **currency**           varchar(3)      No             ---                 ISO 4217 currency code. The
                                                                            currency of gross_amount,
                                                                            fee_amount, and net_amount.
                                                                            This is the rateCurrency from
                                                                            the contract --- NOT the
                                                                            contractor\'s displayCurrency.

  **fx_rate_to_usd**     numeric(18,8)   No             ---                 The FX rate snapshot captured
                                                                            at billing time (not display
                                                                            time). Sourced from the
                                                                            timetracking.hours.logged
                                                                            event. Immutable.

  **net_amount_usd**     numeric(18,8)   No             ---                 net_amount converted to USD
                                                                            using fx_rate_to_usd. Computed
                                                                            at insert time, stored for
                                                                            fast aggregation queries.

  **status**             varchar(20)     No             \'confirmed\'       Current status of this
                                                                            earnings entry. Values:
                                                                            \'confirmed\', \'reversed\'.
                                                                            Set to \'reversed\' when a
                                                                            transaction.reversed event is
                                                                            received.

  **work_start_at**      timestamptz     No             ---                 UTC timestamp of the start of
                                                                            the billed work period. From
                                                                            timetracking.hours.logged.

  **work_end_at**        timestamptz     No             ---                 UTC timestamp of the end of
                                                                            the billed work period. From
                                                                            timetracking.hours.logged.

  **duration_minutes**   integer         No             ---                 Duration of the work period in
                                                                            minutes. From
                                                                            timetracking.hours.logged.

  **avg_keyboard_pct**   integer         Yes            NULL                Average keyboard activity
                                                                            percentage for this period
                                                                            (0--100). From
                                                                            timetracking.hours.logged.
                                                                            NULL for manual time entries.

  **avg_mouse_pct**      integer         Yes            NULL                Average mouse activity
                                                                            percentage (0--100). NULL for
                                                                            manual time entries.

  **idempotency_key**    varchar(128)    No             ---                 The idempotency key from the
                                                                            originating
                                                                            timetracking.hours.logged
                                                                            event. Format:
                                                                            {billingPeriodId}:{version}.
                                                                            Stored for audit trail.

  **created_at**         timestamptz     No             now()               When this record was inserted
                                                                            into earnings-service. Not the
                                                                            same as work_start_at.

  **reversed_at**        timestamptz     Yes            NULL                When a reversal was processed.
                                                                            Set when status changes to
                                                                            \'reversed\'.
  --------------------------------------------------------------------------------------------------------

### **Indexes --- earnings_cache**

  ------------------------------------------------------------------------------------------------
  **Index Name**                              **Columns**        **Type**   **Purpose**
  ------------------------------------------- ------------------ ---------- ----------------------
  **earnings_cache_pkey**                     id                 PRIMARY    Row identity
                                                                 KEY        

  **ux_earnings_cache_transaction_id**        transaction_id     UNIQUE     Idempotency ---
                                                                            prevents duplicate
                                                                            event processing

  **ux_earnings_cache_idempotency_key**       idempotency_key    UNIQUE     Secondary idempotency
                                                                            guard on the source
                                                                            event key

  **idx_earnings_cache_contractor_id**        contractor_id      BTREE      All queries filter by
                                                                            contractor_id first

  **idx_earnings_cache_contractor_created**   contractor_id,     BTREE      Earnings history list
                                              created_at DESC               --- ordered by date
                                                                            per contractor

  **idx_earnings_cache_contractor_status**    contractor_id,     BTREE      Filter confirmed vs
                                              status                        reversed entries per
                                                                            contractor

  **idx_earnings_cache_contract_id**          contract_id        BTREE      Filter earnings by
                                                                            contract

  **idx_earnings_cache_work_start**           contractor_id,     BTREE      Date range filtering
                                              work_start_at DESC            on the Earnings tab
  ------------------------------------------------------------------------------------------------

## **6.2 Table: balance_snapshots**

Stores the current available balance for each contractor. One row per
contractor --- this row is upserted (updated or inserted) on every
credit or debit event. It is the fast-path source for the balance
display and for payout-service balance checks.

  ---------------------------------------------------------------------------------------------------------
  **Column**                      **Type**        **Nullable**   **Default**   **Description**
  ------------------------------- --------------- -------------- ------------- ----------------------------
  **contractor_id**               uuid            No             ---           Primary key. One row per
                                                                               contractor. This is the
                                                                               userId from user-service.

  **available_balance**           numeric(18,8)   No             0             Current available balance in
                                                                               usd_equivalent. This is the
                                                                               sum of all confirmed
                                                                               net_amount_usd entries minus
                                                                               all payouts processed.

  **available_balance_local**     numeric(18,8)   No             0             Available balance in the
                                                                               contractor\'s localCurrency.
                                                                               Converted from
                                                                               available_balance using the
                                                                               most recent cached FX rate.
                                                                               Updated on every balance
                                                                               change and on every FX rate
                                                                               refresh.

  **available_balance_display**   numeric(18,8)   No             0             Available balance in the
                                                                               contractor\'s
                                                                               displayCurrency. This is
                                                                               what the UI shows. May
                                                                               differ from
                                                                               available_balance_local if
                                                                               the contractor changed their
                                                                               displayCurrency in Settings.

  **display_currency**            varchar(3)      No             \'USD\'       The ISO 4217 currency code
                                                                               of
                                                                               available_balance_display.
                                                                               Kept in sync with the
                                                                               contractor\'s
                                                                               displayCurrency from
                                                                               user-service. Updated when
                                                                               earnings-service receives a
                                                                               currency preference change
                                                                               event.

  **local_currency**              varchar(3)      No             \'USD\'       The ISO 4217 currency code
                                                                               of available_balance_local.
                                                                               Derived from the
                                                                               contractor\'s geolocation on
                                                                               last login.

  **total_earned_usd**            numeric(18,8)   No             0             Lifetime total of all
                                                                               confirmed net_amount_usd
                                                                               credits. Never decremented.
                                                                               Used for YTD threshold
                                                                               monitoring (IRS \$600
                                                                               limit).

  **total_paid_out_usd**          numeric(18,8)   No             0             Lifetime total of all
                                                                               confirmed payouts processed
                                                                               through payout-service.

  **pending_hold_usd**            numeric(18,8)   No             0             Amount currently on hold
                                                                               (e.g. first-payout
                                                                               5-business-day hold).
                                                                               Included in available
                                                                               balance calculation --- held
                                                                               amounts are not available
                                                                               for withdrawal.

  **last_credit_at**              timestamptz     Yes            NULL          Timestamp of the most recent
                                                                               credit event processed. Used
                                                                               to detect stale balance
                                                                               records.

  **last_debit_at**               timestamptz     Yes            NULL          Timestamp of the most recent
                                                                               debit or payout event
                                                                               processed.

  **updated_at**                  timestamptz     No             now()         Last time this row was
                                                                               updated. Auto-updated on
                                                                               every upsert via trigger.
  ---------------------------------------------------------------------------------------------------------

### **Indexes --- balance_snapshots**

  ----------------------------------------------------------------------------------------
  **Index Name**                      **Columns**        **Type**   **Purpose**
  ----------------------------------- ------------------ ---------- ----------------------
  **balance_snapshots_pkey**          contractor_id      PRIMARY    One row per contractor
                                                         KEY        --- contractor_id is
                                                                    both PK and lookup key

  **idx_balance_snapshots_updated**   updated_at DESC    BTREE      Detect stale balance
                                                                    records in monitoring
                                                                    queries
  ----------------------------------------------------------------------------------------

## **6.3 Table: fx_rate_cache**

Stores the most recently fetched exchange rate for each currency pair.
earnings-service refreshes this table on a 1-hour cycle from the
self-hosted fawazahmed0/exchange-api instance. The FX rates in this
table are for DISPLAY only --- they are never used for billing
calculations.

  -----------------------------------------------------------------------------------------------------
  **Column**          **Type**        **Nullable**   **Default**         **Description**
  ------------------- --------------- -------------- ------------------- ------------------------------
  **id**              uuid            No             gen_random_uuid()   Primary key.

  **from_currency**   varchar(3)      No             ---                 ISO 4217 source currency code.
                                                                         e.g. \'INR\'

  **to_currency**     varchar(3)      No             ---                 ISO 4217 target currency code.
                                                                         e.g. \'USD\'

  **rate**            numeric(18,8)   No             ---                 The exchange rate: 1 unit of
                                                                         from_currency = rate units of
                                                                         to_currency.

  **fetched_at**      timestamptz     No             now()               When this rate was fetched
                                                                         from the FX API.

  **expires_at**      timestamptz     No             ---                 When this rate should be
                                                                         refreshed. Set to fetched_at +
                                                                         FX_CACHE_TTL_SECONDS. The
                                                                         currency module checks this
                                                                         before using a cached rate.
  -----------------------------------------------------------------------------------------------------

### **Indexes --- fx_rate_cache**

  ------------------------------------------------------------------------------------
  **Index Name**                  **Columns**        **Type**   **Purpose**
  ------------------------------- ------------------ ---------- ----------------------
  **fx_rate_cache_pkey**          id                 PRIMARY    Row identity
                                                     KEY        

  **ux_fx_rate_cache_pair**       from_currency,     UNIQUE     One rate per currency
                                  to_currency                   pair --- upserted on
                                                                refresh

  **idx_fx_rate_cache_expires**   expires_at         BTREE      Currency module
                                                                queries by expiry to
                                                                find stale rates
  ------------------------------------------------------------------------------------

## **6.4 Table: contract_label_cache**

Stores minimal display metadata for contracts, populated from
contract.activated events published by contracts-service.
earnings-service joins against this table when building the earnings
history list so that each entry shows a human-readable contract/project
label rather than just a UUID.

  --------------------------------------------------------------------------------------------------
  **Column**                **Type**       **Nullable**   **Default**   **Description**
  ------------------------- -------------- -------------- ------------- ----------------------------
  **contract_id**           uuid           No             ---           Primary key. The contractId
                                                                        from contracts-service.

  **contractor_id**         uuid           No             ---           The userId of the contractor
                                                                        on this contract.

  **client_id**             uuid           No             ---           The userId of the client on
                                                                        this contract.

  **project_id**            uuid           Yes            NULL          The projectId associated
                                                                        with this contract. May be
                                                                        NULL for standalone
                                                                        contracts.

  **contract_title**        varchar(255)   Yes            NULL          Human-readable title of the
                                                                        contract. Shown in the
                                                                        earnings history row label.

  **project_name**          varchar(255)   Yes            NULL          Name of the associated
                                                                        project. Shown as a
                                                                        secondary label.

  **client_display_name**   varchar(255)   Yes            NULL          Display name of the client.
                                                                        Shown in earnings history
                                                                        for context.

  **status**                varchar(20)    No             \'active\'    Current status: \'active\'
                                                                        or \'ended\'. Updated when
                                                                        contract.ended event is
                                                                        received.

  **activated_at**          timestamptz    No             ---           When the contract became
                                                                        active. From the
                                                                        contract.activated event.

  **ended_at**              timestamptz    Yes            NULL          When the contract ended. Set
                                                                        on contract.ended event.

  **created_at**            timestamptz    No             now()         When this record was
                                                                        inserted.

  **updated_at**            timestamptz    No             now()         Last time this record was
                                                                        updated.
  --------------------------------------------------------------------------------------------------

### **Indexes --- contract_label_cache**

  ----------------------------------------------------------------------------------------
  **Index Name**                      **Columns**        **Type**   **Purpose**
  ----------------------------------- ------------------ ---------- ----------------------
  **contract_label_cache_pkey**       contract_id        PRIMARY    Row identity --- one
                                                         KEY        row per contract

  **idx_contract_label_contractor**   contractor_id      BTREE      Look up all contracts
                                                                    for a contractor
                                                                    quickly
  ----------------------------------------------------------------------------------------

# **7. TypeORM Entity Files**

The following files are the complete, production-ready TypeORM entity
definitions. Place each file at the exact path shown. Do not modify the
column names --- they match the migration SQL exactly.

## **7.1 src/entities/earnings-cache.entity.ts**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/entities/earnings-cache.entity.ts                              |
|                                                                       |
| import {                                                              |
|                                                                       |
| Entity,                                                               |
|                                                                       |
| PrimaryGeneratedColumn,                                               |
|                                                                       |
| Column,                                                               |
|                                                                       |
| Index,                                                                |
|                                                                       |
| CreateDateColumn,                                                     |
|                                                                       |
| } from \'typeorm\';                                                   |
|                                                                       |
| // EarningsCache is the local read-model for the Earnings tab.        |
|                                                                       |
| // One row per earnings event received from transaction-service.      |
|                                                                       |
| // This table is NEVER written to by the API layer --- only by        |
| RabbitMQ consumers.                                                   |
|                                                                       |
| \@Entity(\'earnings_cache\')                                          |
|                                                                       |
| \@Index(\'idx_earnings_cache_contractor_created\',                    |
| \[\'contractorId\', \'createdAt\'\])                                  |
|                                                                       |
| \@Index(\'idx_earnings_cache_contractor_status\', \[\'contractorId\', |
| \'status\'\])                                                         |
|                                                                       |
| \@Index(\'idx_earnings_cache_contract_id\', \[\'contractId\'\])       |
|                                                                       |
| \@Index(\'idx_earnings_cache_work_start\', \[\'contractorId\',        |
| \'workStartAt\'\])                                                    |
|                                                                       |
| export class EarningsCache {                                          |
|                                                                       |
| \@PrimaryGeneratedColumn(\'uuid\')                                    |
|                                                                       |
| id: string;                                                           |
|                                                                       |
| // Idempotency --- must be unique. Duplicate events are silently      |
| ignored.                                                              |
|                                                                       |
| \@Column({ type: \'uuid\', unique: true })                            |
|                                                                       |
| \@Index(\'idx_earnings_cache_contractor_id\')                         |
|                                                                       |
| transactionId: string;                                                |
|                                                                       |
| \@Column({ type: \'uuid\' })                                          |
|                                                                       |
| \@Index(\'idx_earnings_cache_contractor_id_plain\')                   |
|                                                                       |
| contractorId: string;                                                 |
|                                                                       |
| \@Column({ type: \'uuid\', nullable: true })                          |
|                                                                       |
| contractId: string \| null;                                           |
|                                                                       |
| \@Column({ type: \'uuid\', nullable: true })                          |
|                                                                       |
| projectId: string \| null;                                            |
|                                                                       |
| \@Column({ type: \'uuid\', nullable: true })                          |
|                                                                       |
| taskId: string \| null;                                               |
|                                                                       |
| // \'screenshot\' \| \'manual\'                                       |
|                                                                       |
| \@Column({ type: \'varchar\', length: 20 })                           |
|                                                                       |
| entryType: string;                                                    |
|                                                                       |
| // All monetary amounts stored with 8 decimal places.                 |
|                                                                       |
| // gross = before Marketeq 20% fee                                    |
|                                                                       |
| \@Column({ type: \'numeric\', precision: 18, scale: 8 })              |
|                                                                       |
| grossAmount: string; // numeric stored as string to avoid JS float    |
| precision loss                                                        |
|                                                                       |
| \@Column({ type: \'numeric\', precision: 18, scale: 8 })              |
|                                                                       |
| feeAmount: string;                                                    |
|                                                                       |
| \@Column({ type: \'numeric\', precision: 18, scale: 8 })              |
|                                                                       |
| netAmount: string;                                                    |
|                                                                       |
| // The rateCurrency from the contract --- NOT the contractor\'s       |
| displayCurrency                                                       |
|                                                                       |
| \@Column({ type: \'varchar\', length: 3 })                            |
|                                                                       |
| currency: string;                                                     |
|                                                                       |
| // FX rate snapshot from billing time --- immutable after insert      |
|                                                                       |
| \@Column({ type: \'numeric\', precision: 18, scale: 8 })              |
|                                                                       |
| fxRateToUsd: string;                                                  |
|                                                                       |
| // Pre-computed USD equivalent for fast aggregation queries           |
|                                                                       |
| \@Column({ type: \'numeric\', precision: 18, scale: 8 })              |
|                                                                       |
| netAmountUsd: string;                                                 |
|                                                                       |
| // \'confirmed\' \| \'reversed\'                                      |
|                                                                       |
| \@Column({ type: \'varchar\', length: 20, default: \'confirmed\' })   |
|                                                                       |
| status: string;                                                       |
|                                                                       |
| \@Column({ type: \'timestamptz\' })                                   |
|                                                                       |
| workStartAt: Date;                                                    |
|                                                                       |
| \@Column({ type: \'timestamptz\' })                                   |
|                                                                       |
| workEndAt: Date;                                                      |
|                                                                       |
| \@Column({ type: \'integer\' })                                       |
|                                                                       |
| durationMinutes: number;                                              |
|                                                                       |
| \@Column({ type: \'integer\', nullable: true })                       |
|                                                                       |
| avgKeyboardPct: number \| null;                                       |
|                                                                       |
| \@Column({ type: \'integer\', nullable: true })                       |
|                                                                       |
| avgMousePct: number \| null;                                          |
|                                                                       |
| // Stored for audit trail --- sourced from timetracking.hours.logged  |
| event                                                                 |
|                                                                       |
| \@Column({ type: \'varchar\', length: 128, unique: true })            |
|                                                                       |
| idempotencyKey: string;                                               |
|                                                                       |
| \@CreateDateColumn({ type: \'timestamptz\' })                         |
|                                                                       |
| createdAt: Date;                                                      |
|                                                                       |
| \@Column({ type: \'timestamptz\', nullable: true })                   |
|                                                                       |
| reversedAt: Date \| null;                                             |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **7.2 src/entities/balance-snapshot.entity.ts**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/entities/balance-snapshot.entity.ts                            |
|                                                                       |
| import {                                                              |
|                                                                       |
| Entity,                                                               |
|                                                                       |
| PrimaryColumn,                                                        |
|                                                                       |
| Column,                                                               |
|                                                                       |
| UpdateDateColumn,                                                     |
|                                                                       |
| } from \'typeorm\';                                                   |
|                                                                       |
| // BalanceSnapshot is the fast-path balance record for each           |
| contractor.                                                           |
|                                                                       |
| // One row per contractor. Upserted on every credit, debit, or payout |
| event.                                                                |
|                                                                       |
| // payout-service reads this via an internal REST endpoint (see       |
| ES-03).                                                               |
|                                                                       |
| \@Entity(\'balance_snapshots\')                                       |
|                                                                       |
| export class BalanceSnapshot {                                        |
|                                                                       |
| // contractor_id is the primary key --- one row per contractor.       |
|                                                                       |
| // This is the userId from user-service.                              |
|                                                                       |
| \@PrimaryColumn({ type: \'uuid\' })                                   |
|                                                                       |
| contractorId: string;                                                 |
|                                                                       |
| // Stored in USD equivalent for cross-currency consistency            |
|                                                                       |
| \@Column({ type: \'numeric\', precision: 18, scale: 8, default: \'0\' |
| })                                                                    |
|                                                                       |
| availableBalance: string; // USD equivalent                           |
|                                                                       |
| // Converted from availableBalance using cached FX rate for           |
| localCurrency                                                         |
|                                                                       |
| \@Column({ type: \'numeric\', precision: 18, scale: 8, default: \'0\' |
| })                                                                    |
|                                                                       |
| availableBalanceLocal: string;                                        |
|                                                                       |
| // Converted from availableBalance using cached FX rate for           |
| displayCurrency                                                       |
|                                                                       |
| \@Column({ type: \'numeric\', precision: 18, scale: 8, default: \'0\' |
| })                                                                    |
|                                                                       |
| availableBalanceDisplay: string;                                      |
|                                                                       |
| // ISO 4217 --- kept in sync with contractor\'s displayCurrency from  |
| user-service                                                          |
|                                                                       |
| \@Column({ type: \'varchar\', length: 3, default: \'USD\' })          |
|                                                                       |
| displayCurrency: string;                                              |
|                                                                       |
| // ISO 4217 --- from contractor\'s geolocation on last login          |
|                                                                       |
| \@Column({ type: \'varchar\', length: 3, default: \'USD\' })          |
|                                                                       |
| localCurrency: string;                                                |
|                                                                       |
| // Lifetime total earned --- never decremented --- used for YTD IRS   |
| \$600 threshold                                                       |
|                                                                       |
| \@Column({ type: \'numeric\', precision: 18, scale: 8, default: \'0\' |
| })                                                                    |
|                                                                       |
| totalEarnedUsd: string;                                               |
|                                                                       |
| \@Column({ type: \'numeric\', precision: 18, scale: 8, default: \'0\' |
| })                                                                    |
|                                                                       |
| totalPaidOutUsd: string;                                              |
|                                                                       |
| // Amount on hold (first-payout 5-business-day hold, etc.)            |
|                                                                       |
| // Held amounts are NOT included in availableBalance                  |
|                                                                       |
| \@Column({ type: \'numeric\', precision: 18, scale: 8, default: \'0\' |
| })                                                                    |
|                                                                       |
| pendingHoldUsd: string;                                               |
|                                                                       |
| \@Column({ type: \'timestamptz\', nullable: true })                   |
|                                                                       |
| lastCreditAt: Date \| null;                                           |
|                                                                       |
| \@Column({ type: \'timestamptz\', nullable: true })                   |
|                                                                       |
| lastDebitAt: Date \| null;                                            |
|                                                                       |
| \@UpdateDateColumn({ type: \'timestamptz\' })                         |
|                                                                       |
| updatedAt: Date;                                                      |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **7.3 src/entities/fx-rate-cache.entity.ts**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/entities/fx-rate-cache.entity.ts                               |
|                                                                       |
| import {                                                              |
|                                                                       |
| Entity,                                                               |
|                                                                       |
| PrimaryGeneratedColumn,                                               |
|                                                                       |
| Column,                                                               |
|                                                                       |
| Index,                                                                |
|                                                                       |
| } from \'typeorm\';                                                   |
|                                                                       |
| // FxRateCache stores the most recently fetched exchange rate per     |
| currency pair.                                                        |
|                                                                       |
| // Refreshed every FX_CACHE_TTL_SECONDS (default 3600) by the         |
| currency module.                                                      |
|                                                                       |
| // Used for DISPLAY ONLY --- never for billing calculations.          |
|                                                                       |
| \@Entity(\'fx_rate_cache\')                                           |
|                                                                       |
| \@Index(\'ux_fx_rate_cache_pair\', \[\'fromCurrency\',                |
| \'toCurrency\'\], { unique: true })                                   |
|                                                                       |
| \@Index(\'idx_fx_rate_cache_expires\', \[\'expiresAt\'\])             |
|                                                                       |
| export class FxRateCache {                                            |
|                                                                       |
| \@PrimaryGeneratedColumn(\'uuid\')                                    |
|                                                                       |
| id: string;                                                           |
|                                                                       |
| // ISO 4217 source currency --- e.g. \'INR\'                          |
|                                                                       |
| \@Column({ type: \'varchar\', length: 3 })                            |
|                                                                       |
| fromCurrency: string;                                                 |
|                                                                       |
| // ISO 4217 target currency --- e.g. \'USD\'                          |
|                                                                       |
| \@Column({ type: \'varchar\', length: 3 })                            |
|                                                                       |
| toCurrency: string;                                                   |
|                                                                       |
| // 1 unit of fromCurrency = rate units of toCurrency                  |
|                                                                       |
| \@Column({ type: \'numeric\', precision: 18, scale: 8 })              |
|                                                                       |
| rate: string;                                                         |
|                                                                       |
| \@Column({ type: \'timestamptz\' })                                   |
|                                                                       |
| fetchedAt: Date;                                                      |
|                                                                       |
| // Currency module checks this before using a cached rate.            |
|                                                                       |
| // If now() \> expiresAt, the rate is refreshed before use.           |
|                                                                       |
| \@Column({ type: \'timestamptz\' })                                   |
|                                                                       |
| expiresAt: Date;                                                      |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **7.4 src/entities/contract-label-cache.entity.ts**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/entities/contract-label-cache.entity.ts                        |
|                                                                       |
| import {                                                              |
|                                                                       |
| Entity,                                                               |
|                                                                       |
| PrimaryColumn,                                                        |
|                                                                       |
| Column,                                                               |
|                                                                       |
| Index,                                                                |
|                                                                       |
| CreateDateColumn,                                                     |
|                                                                       |
| UpdateDateColumn,                                                     |
|                                                                       |
| } from \'typeorm\';                                                   |
|                                                                       |
| // ContractLabelCache stores display metadata for contracts.          |
|                                                                       |
| // Populated from contract.activated events --- never from direct API |
| calls.                                                                |
|                                                                       |
| // Read by the earnings history API to show human-readable labels.    |
|                                                                       |
| \@Entity(\'contract_label_cache\')                                    |
|                                                                       |
| \@Index(\'idx_contract_label_contractor\', \[\'contractorId\'\])      |
|                                                                       |
| export class ContractLabelCache {                                     |
|                                                                       |
| // contract_id is the primary key --- one row per contract            |
|                                                                       |
| \@PrimaryColumn({ type: \'uuid\' })                                   |
|                                                                       |
| contractId: string;                                                   |
|                                                                       |
| \@Column({ type: \'uuid\' })                                          |
|                                                                       |
| contractorId: string;                                                 |
|                                                                       |
| \@Column({ type: \'uuid\' })                                          |
|                                                                       |
| clientId: string;                                                     |
|                                                                       |
| \@Column({ type: \'uuid\', nullable: true })                          |
|                                                                       |
| projectId: string \| null;                                            |
|                                                                       |
| \@Column({ type: \'varchar\', length: 255, nullable: true })          |
|                                                                       |
| contractTitle: string \| null;                                        |
|                                                                       |
| \@Column({ type: \'varchar\', length: 255, nullable: true })          |
|                                                                       |
| projectName: string \| null;                                          |
|                                                                       |
| \@Column({ type: \'varchar\', length: 255, nullable: true })          |
|                                                                       |
| clientDisplayName: string \| null;                                    |
|                                                                       |
| // \'active\' \| \'ended\'                                            |
|                                                                       |
| \@Column({ type: \'varchar\', length: 20, default: \'active\' })      |
|                                                                       |
| status: string;                                                       |
|                                                                       |
| \@Column({ type: \'timestamptz\' })                                   |
|                                                                       |
| activatedAt: Date;                                                    |
|                                                                       |
| \@Column({ type: \'timestamptz\', nullable: true })                   |
|                                                                       |
| endedAt: Date \| null;                                                |
|                                                                       |
| \@CreateDateColumn({ type: \'timestamptz\' })                         |
|                                                                       |
| createdAt: Date;                                                      |
|                                                                       |
| \@UpdateDateColumn({ type: \'timestamptz\' })                         |
|                                                                       |
| updatedAt: Date;                                                      |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **8. Database Module**

The database module wires TypeORM to NestJS and loads all four entities.
It also serves as the DataSource for running migrations via the CLI.
Place this file at src/database/database.module.ts.

## **8.1 src/database/database.module.ts**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/database/database.module.ts                                    |
|                                                                       |
| import { Module } from \'@nestjs/common\';                            |
|                                                                       |
| import { TypeOrmModule } from \'@nestjs/typeorm\';                    |
|                                                                       |
| import { ConfigModule, ConfigService } from \'@nestjs/config\';       |
|                                                                       |
| import { EarningsCache } from \'../entities/earnings-cache.entity\';  |
|                                                                       |
| import { BalanceSnapshot } from                                       |
| \'../entities/balance-snapshot.entity\';                              |
|                                                                       |
| import { FxRateCache } from \'../entities/fx-rate-cache.entity\';     |
|                                                                       |
| import { ContractLabelCache } from                                    |
| \'../entities/contract-label-cache.entity\';                          |
|                                                                       |
| import { DataSource } from \'typeorm\';                               |
|                                                                       |
| // DatabaseModule registers TypeORM and all earnings-service          |
| entities.                                                             |
|                                                                       |
| // Import this module in AppModule (see ES-02).                       |
|                                                                       |
| \@Module({                                                            |
|                                                                       |
| imports: \[                                                           |
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
| entities: \[EarningsCache, BalanceSnapshot, FxRateCache,              |
| ContractLabelCache\],                                                 |
|                                                                       |
| migrations: \[\_\_dirname + \'/migrations/\*{.ts,.js}\'\],            |
|                                                                       |
| synchronize: false, // NEVER true in production --- always use        |
| migrations                                                            |
|                                                                       |
| logging: config.get(\'NODE_ENV\') !== \'production\',                 |
|                                                                       |
| ssl: config.get(\'NODE_ENV\') === \'production\'                      |
|                                                                       |
| ? { rejectUnauthorized: false }                                       |
|                                                                       |
| : false,                                                              |
|                                                                       |
| }),                                                                   |
|                                                                       |
| }),                                                                   |
|                                                                       |
| \],                                                                   |
|                                                                       |
| exports: \[TypeOrmModule\],                                           |
|                                                                       |
| })                                                                    |
|                                                                       |
| export class DatabaseModule {}                                        |
|                                                                       |
| // ─────────────────────────────────────────────────────────────────  |
|                                                                       |
| // DataSource export --- used by the TypeORM CLI for running          |
| migrations.                                                           |
|                                                                       |
| // The CLI needs a named export called AppDataSource.                 |
|                                                                       |
| // Run migrations with:                                               |
|                                                                       |
| // npm run migration:run                                              |
|                                                                       |
| // ─────────────────────────────────────────────────────────────────  |
|                                                                       |
| export const AppDataSource = new DataSource({                         |
|                                                                       |
| type: \'postgres\',                                                   |
|                                                                       |
| url: process.env.DATABASE_URL,                                        |
|                                                                       |
| entities: \[EarningsCache, BalanceSnapshot, FxRateCache,              |
| ContractLabelCache\],                                                 |
|                                                                       |
| migrations: \[\_\_dirname + \'/migrations/\*{.ts,.js}\'\],            |
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

# **9. Migration Files**

Migrations are the only mechanism for making database schema changes.
synchronize is set to false in production --- TypeORM will never
auto-alter the schema. Each migration file below creates one table. Run
all four in order.

+-----------------------------------------------------------------------+
| **Important --- migration numbering**                                 |
|                                                                       |
| Migration filenames must begin with a Unix timestamp (milliseconds).  |
|                                                                       |
| The timestamps below (1700000001, 1700000002, etc.) are placeholders. |
|                                                                       |
| Before committing, replace each prefix with the real current          |
| timestamp.                                                            |
|                                                                       |
| Generate one with: Date.now() in a Node REPL.                         |
|                                                                       |
| Migrations must run in numeric order --- never rename or reorder      |
| existing migrations.                                                  |
+=======================================================================+

## **9.1 Migration: CreateEarningsCache**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/database/migrations/1700000001-CreateEarningsCache.ts          |
|                                                                       |
| import { MigrationInterface, QueryRunner } from \'typeorm\';          |
|                                                                       |
| export class CreateEarningsCache1700000001 implements                 |
| MigrationInterface {                                                  |
|                                                                       |
| name = \'CreateEarningsCache1700000001\';                             |
|                                                                       |
| public async up(queryRunner: QueryRunner): Promise\<void\> {          |
|                                                                       |
| await queryRunner.query(\`                                            |
|                                                                       |
| CREATE TABLE earnings_cache (                                         |
|                                                                       |
| id UUID NOT NULL DEFAULT gen_random_uuid(),                           |
|                                                                       |
| transaction_id UUID NOT NULL,                                         |
|                                                                       |
| contractor_id UUID NOT NULL,                                          |
|                                                                       |
| contract_id UUID,                                                     |
|                                                                       |
| project_id UUID,                                                      |
|                                                                       |
| task_id UUID,                                                         |
|                                                                       |
| entry_type VARCHAR(20) NOT NULL,                                      |
|                                                                       |
| gross_amount NUMERIC(18,8) NOT NULL,                                  |
|                                                                       |
| fee_amount NUMERIC(18,8) NOT NULL,                                    |
|                                                                       |
| net_amount NUMERIC(18,8) NOT NULL,                                    |
|                                                                       |
| currency VARCHAR(3) NOT NULL,                                         |
|                                                                       |
| fx_rate_to_usd NUMERIC(18,8) NOT NULL,                                |
|                                                                       |
| net_amount_usd NUMERIC(18,8) NOT NULL,                                |
|                                                                       |
| status VARCHAR(20) NOT NULL DEFAULT \'confirmed\',                    |
|                                                                       |
| work_start_at TIMESTAMPTZ NOT NULL,                                   |
|                                                                       |
| work_end_at TIMESTAMPTZ NOT NULL,                                     |
|                                                                       |
| duration_minutes INTEGER NOT NULL,                                    |
|                                                                       |
| avg_keyboard_pct INTEGER,                                             |
|                                                                       |
| avg_mouse_pct INTEGER,                                                |
|                                                                       |
| idempotency_key VARCHAR(128) NOT NULL,                                |
|                                                                       |
| created_at TIMESTAMPTZ NOT NULL DEFAULT now(),                        |
|                                                                       |
| reversed_at TIMESTAMPTZ,                                              |
|                                                                       |
| CONSTRAINT earnings_cache_pkey PRIMARY KEY (id),                      |
|                                                                       |
| CONSTRAINT ux_earnings_cache_transaction_id UNIQUE (transaction_id),  |
|                                                                       |
| CONSTRAINT ux_earnings_cache_idempotency_key UNIQUE (idempotency_key) |
|                                                                       |
| );                                                                    |
|                                                                       |
| \`);                                                                  |
|                                                                       |
| await queryRunner.query(\`CREATE INDEX                                |
| idx_earnings_cache_contractor_id ON earnings_cache                    |
| (contractor_id);\`);                                                  |
|                                                                       |
| await queryRunner.query(\`CREATE INDEX                                |
| idx_earnings_cache_contractor_created ON earnings_cache               |
| (contractor_id, created_at DESC);\`);                                 |
|                                                                       |
| await queryRunner.query(\`CREATE INDEX                                |
| idx_earnings_cache_contractor_status ON earnings_cache                |
| (contractor_id, status);\`);                                          |
|                                                                       |
| await queryRunner.query(\`CREATE INDEX idx_earnings_cache_contract_id |
| ON earnings_cache (contract_id);\`);                                  |
|                                                                       |
| await queryRunner.query(\`CREATE INDEX idx_earnings_cache_work_start  |
| ON earnings_cache (contractor_id, work_start_at DESC);\`);            |
|                                                                       |
| }                                                                     |
|                                                                       |
| public async down(queryRunner: QueryRunner): Promise\<void\> {        |
|                                                                       |
| await queryRunner.query(\`DROP TABLE IF EXISTS earnings_cache;\`);    |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **9.2 Migration: CreateBalanceSnapshots**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/database/migrations/1700000002-CreateBalanceSnapshots.ts       |
|                                                                       |
| import { MigrationInterface, QueryRunner } from \'typeorm\';          |
|                                                                       |
| export class CreateBalanceSnapshots1700000002 implements              |
| MigrationInterface {                                                  |
|                                                                       |
| name = \'CreateBalanceSnapshots1700000002\';                          |
|                                                                       |
| public async up(queryRunner: QueryRunner): Promise\<void\> {          |
|                                                                       |
| await queryRunner.query(\`                                            |
|                                                                       |
| CREATE TABLE balance_snapshots (                                      |
|                                                                       |
| contractor_id UUID NOT NULL,                                          |
|                                                                       |
| available_balance NUMERIC(18,8) NOT NULL DEFAULT 0,                   |
|                                                                       |
| available_balance_local NUMERIC(18,8) NOT NULL DEFAULT 0,             |
|                                                                       |
| available_balance_display NUMERIC(18,8) NOT NULL DEFAULT 0,           |
|                                                                       |
| display_currency VARCHAR(3) NOT NULL DEFAULT \'USD\',                 |
|                                                                       |
| local_currency VARCHAR(3) NOT NULL DEFAULT \'USD\',                   |
|                                                                       |
| total_earned_usd NUMERIC(18,8) NOT NULL DEFAULT 0,                    |
|                                                                       |
| total_paid_out_usd NUMERIC(18,8) NOT NULL DEFAULT 0,                  |
|                                                                       |
| pending_hold_usd NUMERIC(18,8) NOT NULL DEFAULT 0,                    |
|                                                                       |
| last_credit_at TIMESTAMPTZ,                                           |
|                                                                       |
| last_debit_at TIMESTAMPTZ,                                            |
|                                                                       |
| updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),                        |
|                                                                       |
| CONSTRAINT balance_snapshots_pkey PRIMARY KEY (contractor_id)         |
|                                                                       |
| );                                                                    |
|                                                                       |
| \`);                                                                  |
|                                                                       |
| await queryRunner.query(\`CREATE INDEX idx_balance_snapshots_updated  |
| ON balance_snapshots (updated_at DESC);\`);                           |
|                                                                       |
| // Auto-update updated_at on every row change                         |
|                                                                       |
| await queryRunner.query(\`                                            |
|                                                                       |
| CREATE OR REPLACE FUNCTION update_balance_snapshot_timestamp()        |
|                                                                       |
| RETURNS TRIGGER AS \$\$                                               |
|                                                                       |
| BEGIN                                                                 |
|                                                                       |
| NEW.updated_at = now();                                               |
|                                                                       |
| RETURN NEW;                                                           |
|                                                                       |
| END;                                                                  |
|                                                                       |
| \$\$ LANGUAGE plpgsql;                                                |
|                                                                       |
| \`);                                                                  |
|                                                                       |
| await queryRunner.query(\`                                            |
|                                                                       |
| CREATE TRIGGER trg_balance_snapshots_updated_at                       |
|                                                                       |
| BEFORE UPDATE ON balance_snapshots                                    |
|                                                                       |
| FOR EACH ROW EXECUTE FUNCTION update_balance_snapshot_timestamp();    |
|                                                                       |
| \`);                                                                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| public async down(queryRunner: QueryRunner): Promise\<void\> {        |
|                                                                       |
| await queryRunner.query(\`DROP TRIGGER IF EXISTS                      |
| trg_balance_snapshots_updated_at ON balance_snapshots;\`);            |
|                                                                       |
| await queryRunner.query(\`DROP FUNCTION IF EXISTS                     |
| update_balance_snapshot_timestamp;\`);                                |
|                                                                       |
| await queryRunner.query(\`DROP TABLE IF EXISTS balance_snapshots;\`); |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **9.3 Migration: CreateFxRateCache**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/database/migrations/1700000003-CreateFxRateCache.ts            |
|                                                                       |
| import { MigrationInterface, QueryRunner } from \'typeorm\';          |
|                                                                       |
| export class CreateFxRateCache1700000003 implements                   |
| MigrationInterface {                                                  |
|                                                                       |
| name = \'CreateFxRateCache1700000003\';                               |
|                                                                       |
| public async up(queryRunner: QueryRunner): Promise\<void\> {          |
|                                                                       |
| await queryRunner.query(\`                                            |
|                                                                       |
| CREATE TABLE fx_rate_cache (                                          |
|                                                                       |
| id UUID NOT NULL DEFAULT gen_random_uuid(),                           |
|                                                                       |
| from_currency VARCHAR(3) NOT NULL,                                    |
|                                                                       |
| to_currency VARCHAR(3) NOT NULL,                                      |
|                                                                       |
| rate NUMERIC(18,8) NOT NULL,                                          |
|                                                                       |
| fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),                        |
|                                                                       |
| expires_at TIMESTAMPTZ NOT NULL,                                      |
|                                                                       |
| CONSTRAINT fx_rate_cache_pkey PRIMARY KEY (id),                       |
|                                                                       |
| CONSTRAINT ux_fx_rate_cache_pair UNIQUE (from_currency, to_currency)  |
|                                                                       |
| );                                                                    |
|                                                                       |
| \`);                                                                  |
|                                                                       |
| await queryRunner.query(\`CREATE INDEX idx_fx_rate_cache_expires ON   |
| fx_rate_cache (expires_at);\`);                                       |
|                                                                       |
| }                                                                     |
|                                                                       |
| public async down(queryRunner: QueryRunner): Promise\<void\> {        |
|                                                                       |
| await queryRunner.query(\`DROP TABLE IF EXISTS fx_rate_cache;\`);     |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **9.4 Migration: CreateContractLabelCache**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/database/migrations/1700000004-CreateContractLabelCache.ts     |
|                                                                       |
| import { MigrationInterface, QueryRunner } from \'typeorm\';          |
|                                                                       |
| export class CreateContractLabelCache1700000004 implements            |
| MigrationInterface {                                                  |
|                                                                       |
| name = \'CreateContractLabelCache1700000004\';                        |
|                                                                       |
| public async up(queryRunner: QueryRunner): Promise\<void\> {          |
|                                                                       |
| await queryRunner.query(\`                                            |
|                                                                       |
| CREATE TABLE contract_label_cache (                                   |
|                                                                       |
| contract_id UUID NOT NULL,                                            |
|                                                                       |
| contractor_id UUID NOT NULL,                                          |
|                                                                       |
| client_id UUID NOT NULL,                                              |
|                                                                       |
| project_id UUID,                                                      |
|                                                                       |
| contract_title VARCHAR(255),                                          |
|                                                                       |
| project_name VARCHAR(255),                                            |
|                                                                       |
| client_display_name VARCHAR(255),                                     |
|                                                                       |
| status VARCHAR(20) NOT NULL DEFAULT \'active\',                       |
|                                                                       |
| activated_at TIMESTAMPTZ NOT NULL,                                    |
|                                                                       |
| ended_at TIMESTAMPTZ,                                                 |
|                                                                       |
| created_at TIMESTAMPTZ NOT NULL DEFAULT now(),                        |
|                                                                       |
| updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),                        |
|                                                                       |
| CONSTRAINT contract_label_cache_pkey PRIMARY KEY (contract_id)        |
|                                                                       |
| );                                                                    |
|                                                                       |
| \`);                                                                  |
|                                                                       |
| await queryRunner.query(\`CREATE INDEX idx_contract_label_contractor  |
| ON contract_label_cache (contractor_id);\`);                          |
|                                                                       |
| }                                                                     |
|                                                                       |
| public async down(queryRunner: QueryRunner): Promise\<void\> {        |
|                                                                       |
| await queryRunner.query(\`DROP TABLE IF EXISTS                        |
| contract_label_cache;\`);                                             |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **10. Running Migrations**

Follow these steps exactly. Do not skip steps. Each step includes the
expected output so you can confirm it worked.

## **Step 1 --- Start the database container**

+-----------------------------------------------------------------------+
| bash                                                                  |
+-----------------------------------------------------------------------+
| \# From the monorepo root                                             |
|                                                                       |
| docker compose up postgres -d                                         |
|                                                                       |
| \# Confirm it is healthy before continuing                            |
|                                                                       |
| docker compose ps postgres                                            |
|                                                                       |
| \# Expected output:                                                   |
|                                                                       |
| \# NAME STATUS                                                        |
|                                                                       |
| \# marketeq-postgres running (healthy)                                |
+=======================================================================+

## **Step 2 --- Install dependencies**

+-----------------------------------------------------------------------+
| bash                                                                  |
+-----------------------------------------------------------------------+
| cd apps/earnings-service                                              |
|                                                                       |
| npm install                                                           |
|                                                                       |
| \# No errors expected. If you see peer dependency warnings, they are  |
| safe to ignore.                                                       |
+=======================================================================+

## **Step 3 --- Set DATABASE_URL**

+-----------------------------------------------------------------------+
| bash                                                                  |
+-----------------------------------------------------------------------+
| \# Set the environment variable for this shell session                |
|                                                                       |
| export                                                                |
| DATABASE_URL=postgresql://marketeq:secret@localhost:5432/earnings     |
|                                                                       |
| \# If using a .env file at apps/earnings-service/.env:                |
|                                                                       |
| \# DATABASE_URL=postgresql://marketeq:secret@localhost:5432/earnings  |
|                                                                       |
| \# Then load it:                                                      |
|                                                                       |
| \# export \$(cat .env \| xargs)                                       |
+=======================================================================+

## **Step 4 --- Run migrations**

+-----------------------------------------------------------------------+
| bash                                                                  |
+-----------------------------------------------------------------------+
| npm run migration:run                                                 |
|                                                                       |
| \# Expected output (four lines, one per migration):                   |
|                                                                       |
| \# query: SELECT \* FROM migrations                                   |
|                                                                       |
| \# Running migration CreateEarningsCache1700000001\...                |
|                                                                       |
| \# Migration CreateEarningsCache1700000001 has been executed          |
| successfully.                                                         |
|                                                                       |
| \# Running migration CreateBalanceSnapshots1700000002\...             |
|                                                                       |
| \# Migration CreateBalanceSnapshots1700000002 has been executed       |
| successfully.                                                         |
|                                                                       |
| \# Running migration CreateFxRateCache1700000003\...                  |
|                                                                       |
| \# Migration CreateFxRateCache1700000003 has been executed            |
| successfully.                                                         |
|                                                                       |
| \# Running migration CreateContractLabelCache1700000004\...           |
|                                                                       |
| \# Migration CreateContractLabelCache1700000004 has been executed     |
| successfully.                                                         |
+=======================================================================+

## **Step 5 --- Verify the tables exist**

+-----------------------------------------------------------------------------------------------+
| bash                                                                                          |
+-----------------------------------------------------------------------------------------------+
| \# Connect to the database                                                                    |
|                                                                                               |
| docker exec -it marketeq-postgres psql -U marketeq -d earnings                                |
|                                                                                               |
| \# List all tables --- you should see exactly these four:                                     |
|                                                                                               |
| \\dt                                                                                          |
|                                                                                               |
| \# Expected:                                                                                  |
|                                                                                               |
| \# Schema \| Name \| Type \| Owner                                                            |
|                                                                                               |
| \#                                                                                            |
| \-\-\-\-\-\-\--+\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\--+\-\-\-\-\-\--+\-\-\-\-\-\-\-\-- |
|                                                                                               |
| \# public \| balance_snapshots \| table \| marketeq                                           |
|                                                                                               |
| \# public \| contract_label_cache \| table \| marketeq                                        |
|                                                                                               |
| \# public \| earnings_cache \| table \| marketeq                                              |
|                                                                                               |
| \# public \| fx_rate_cache \| table \| marketeq                                               |
|                                                                                               |
| \# public \| migrations \| table \| marketeq                                                  |
|                                                                                               |
| \# Verify the indexes on earnings_cache:                                                      |
|                                                                                               |
| \\di earnings_cache\*                                                                         |
|                                                                                               |
| \# Exit psql                                                                                  |
|                                                                                               |
| \\q                                                                                           |
+===============================================================================================+

## **Rolling back migrations**

+-----------------------------------------------------------------------+
| **Warning**                                                           |
|                                                                       |
| Rolling back migrations in production deletes data. Only run revert   |
| in development or staging.                                            |
|                                                                       |
| Always take a database backup before running any migration command in |
| a production environment.                                             |
+=======================================================================+

+-----------------------------------------------------------------------+
| bash                                                                  |
+-----------------------------------------------------------------------+
| \# Reverts the most recently applied migration only                   |
|                                                                       |
| npm run migration:revert                                              |
|                                                                       |
| \# To revert all four, run this command four times.                   |
|                                                                       |
| \# Each run reverts one migration in reverse order.                   |
+=======================================================================+

# **11. Verification**

After running migrations, use the following checks to confirm the schema
is correct before building on top of it.

+-----------------------------------------------------------------------+
| sql                                                                   |
+-----------------------------------------------------------------------+
| \# Connect to the earnings database                                   |
|                                                                       |
| docker exec -it marketeq-postgres psql -U marketeq -d earnings        |
|                                                                       |
| \-- 1. Confirm earnings_cache columns and types                       |
|                                                                       |
| SELECT column_name, data_type, character_maximum_length, is_nullable  |
|                                                                       |
| FROM information_schema.columns                                       |
|                                                                       |
| WHERE table_name = \'earnings_cache\'                                 |
|                                                                       |
| ORDER BY ordinal_position;                                            |
|                                                                       |
| \-- 2. Confirm unique constraints exist                               |
|                                                                       |
| SELECT conname, contype FROM pg_constraint                            |
|                                                                       |
| WHERE conrelid = \'earnings_cache\'::regclass;                        |
|                                                                       |
| \-- Expected: ux_earnings_cache_transaction_id,                       |
| ux_earnings_cache_idempotency_key                                     |
|                                                                       |
| \-- 3. Confirm balance_snapshots trigger exists                       |
|                                                                       |
| SELECT trigger_name FROM information_schema.triggers                  |
|                                                                       |
| WHERE event_object_table = \'balance_snapshots\';                     |
|                                                                       |
| \-- Expected: trg_balance_snapshots_updated_at                        |
|                                                                       |
| \-- 4. Insert a test row into earnings_cache and confirm it           |
| round-trips                                                           |
|                                                                       |
| INSERT INTO earnings_cache (                                          |
|                                                                       |
| transaction_id, contractor_id, entry_type,                            |
|                                                                       |
| gross_amount, fee_amount, net_amount, currency,                       |
|                                                                       |
| fx_rate_to_usd, net_amount_usd, work_start_at, work_end_at,           |
|                                                                       |
| duration_minutes, idempotency_key                                     |
|                                                                       |
| ) VALUES (                                                            |
|                                                                       |
| gen_random_uuid(), gen_random_uuid(), \'screenshot\',                 |
|                                                                       |
| \'100.00000000\', \'20.00000000\', \'80.00000000\', \'USD\',          |
|                                                                       |
| \'1.00000000\', \'80.00000000\', now(), now(),                        |
|                                                                       |
| 60, \'test-idempotency-key-001\'                                      |
|                                                                       |
| );                                                                    |
|                                                                       |
| SELECT id, contractor_id, net_amount, status FROM earnings_cache;     |
|                                                                       |
| \-- Expected: one row with status = \'confirmed\'                     |
|                                                                       |
| \-- 5. Clean up test row                                              |
|                                                                       |
| DELETE FROM earnings_cache WHERE idempotency_key =                    |
| \'test-idempotency-key-001\';                                         |
+=======================================================================+

# **12. References**

  --------------------------------------------------------------------------
  **Document**            **What it covers**     **Relationship to ES-01**
  ----------------------- ---------------------- ---------------------------
  **ES-00 --- Service     Full service purpose,  Read before ES-01. All
  Overview &              dependency map, folder architectural decisions in
  Architecture**          structure, environment this document originate
                          variables              from ES-00.

  **ES-02 --- REST API    All public API         Read after ES-01. ES-02
  Endpoints               endpoints that query   assumes the schema from
  (Contractor-Facing)**   the tables defined in  this document exists.
                          this document          

  **ES-03 --- REST API    Internal endpoints     Depends on
  Endpoints (Internal)**  that read              balance_snapshots table
                          balance_snapshots for  defined in this document.
                          payout-service and     
                          kyc-identity-service   

  **ES-04 --- RabbitMQ    Consumer handlers that Depends entirely on all
  Consumer                write to               four tables defined in this
  Implementation**        earnings_cache,        document.
                          balance_snapshots, and 
                          contract_label_cache   

  **ES-06 --- Currency    Currency module that   Depends on fx_rate_cache
  Conversion              reads and writes       table defined in this
  Implementation**        fx_rate_cache          document.

  **ES-07 --- Redis       Redis cache layer that Works alongside
  Caching Strategy**      sits in front of       balance_snapshots --- Redis
                          balance_snapshots for  is the hot path, PostgreSQL
                          fast balance reads     is the persistent store.
  --------------------------------------------------------------------------

CONFIDENTIAL --- Marketeq Internal Engineering Documentation \|
earnings-service ES-01 \| v1.0
