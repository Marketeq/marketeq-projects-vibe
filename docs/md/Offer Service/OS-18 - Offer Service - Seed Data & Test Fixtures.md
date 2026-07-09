**OS-18**

**Offer Service --- Seed Data & Test Fixtures**

**Seeds:** apps/offer-service/seeds/ **Fixtures:**
apps/offer-service/test/fixtures/ **Env:** development & test ONLY

This document defines all seed data and test fixtures for offer-service.
Seeds populate a local development database with realistic data in every
offer state so developers can work against a complete dataset without
manually creating offers. Fixtures are TypeScript factory functions used
in unit and integration tests to create predictable, typed test records
without hardcoding values throughout test files.

**File Map**

  ---------- ----------------------------------------------------------- ----------------------
  **Step**   **File Path**                                               **Purpose**

  **1**      apps/offer-service/seeds/constants/seed-ids.ts              Fixed UUIDs for all
                                                                         seed users, offers,
                                                                         COs, and listings

  **2**      apps/offer-service/seeds/seed.ts                            Main seed runner ---
                                                                         inserts all offer
                                                                         records

  **3**      apps/offer-service/seeds/reset.ts                           Wipes seed data so
                                                                         seed.ts can be re-run
                                                                         cleanly

  **4**      apps/offer-service/test/fixtures/offer.factory.ts           Factory: creates Offer
                                                                         entity instances for
                                                                         all states

  **5**      apps/offer-service/test/fixtures/counter-offer.factory.ts   Factory: creates
                                                                         CounterOffer entity
                                                                         instances

  **6**      apps/offer-service/test/fixtures/offer-history.factory.ts   Factory: creates
                                                                         OfferHistoryEvent
                                                                         records

  **7**      apps/offer-service/test/fixtures/outbox.factory.ts          Factory: creates
                                                                         OutboxEvent records

  **8**      apps/offer-service/test/fixtures/offer-chain.fixture.ts     Pre-built multi-round
                                                                         negotiation chains for
                                                                         complex tests

  **9**      apps/offer-service/package.json (update)                    Add seed:run and
                                                                         seed:reset scripts
  ---------- ----------------------------------------------------------- ----------------------

+-----------------------------------------------------------------------+
| **Step 1 Seed ID Constants**                                          |
|                                                                       |
| Fixed UUIDs for all seed records --- single source of truth           |
+-----------------------------------------------------------------------+

All seeds and fixtures use fixed, predictable UUIDs. This serves two
purposes: seeds can be re-run idempotently (INSERT \... ON CONFLICT DO
NOTHING checks by ID), and test fixtures can reference specific records
without searching the database. Every UUID in this file is version 4
format but fixed --- never randomly generated at runtime.

+-----------------------------------------------------------------------+
| Why fixed UUIDs instead of random?                                    |
|                                                                       |
| Random UUIDs make seeds non-idempotent: running seed.ts twice creates |
| duplicates.                                                           |
|                                                                       |
| Fixed UUIDs allow INSERT \... ON CONFLICT (id) DO NOTHING for safe    |
| re-runs.                                                              |
|                                                                       |
| Fixed UUIDs allow fixtures to reference each other by ID without DB   |
| lookups.                                                              |
|                                                                       |
| Tests can assert specific IDs (e.g. \"the response must contain offer |
| OFFER_PENDING_ID\").                                                  |
|                                                                       |
| If you need more seed records, add new UUIDs to this file --- never   |
| use random ones.                                                      |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/seeds/constants/seed-ids.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| /\*\*                                                                 |
|                                                                       |
| \* Seed IDs --- Fixed UUIDs for all seed and fixture records.         |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* These are stable values used across:                               |
|                                                                       |
| \* - seeds/seed.ts (database seed data)                               |
|                                                                       |
| \* - test/fixtures/\*.factory.ts (unit and integration test           |
| factories)                                                            |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Organised by entity type. Add new IDs here when adding new seed    |
| scenarios.                                                            |
|                                                                       |
| \* NEVER use crypto.randomUUID() or uuidv4() in seed files --- always |
| use these constants.                                                  |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Users (these users live in auth-service --- they are referenced by |
| ID only)                                                              |
|                                                                       |
| // ============================================================       |
|                                                                       |
| export const SEED_USERS = {                                           |
|                                                                       |
| CLIENT_A: \'10000000-0000-4000-a000-000000000001\', // Client: Alice  |
| Corp                                                                  |
|                                                                       |
| CLIENT_B: \'10000000-0000-4000-a000-000000000002\', // Client: Bob    |
| Inc                                                                   |
|                                                                       |
| TALENT_X: \'20000000-0000-4000-a000-000000000001\', // Talent: Xavier |
| Dev                                                                   |
|                                                                       |
| TALENT_Y: \'20000000-0000-4000-a000-000000000002\', // Talent:        |
| Yolanda Design                                                        |
|                                                                       |
| TALENT_Z: \'20000000-0000-4000-a000-000000000003\', // Talent: Zara   |
| PM                                                                    |
|                                                                       |
| } as const;                                                           |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Job listings (these live in listings-service --- referenced by ID) |
|                                                                       |
| // ============================================================       |
|                                                                       |
| export const SEED_LISTINGS = {                                        |
|                                                                       |
| PROJECT_ALPHA: \'30000000-0000-4000-a000-000000000001\',              |
|                                                                       |
| SERVICE_BETA: \'30000000-0000-4000-a000-000000000002\',               |
|                                                                       |
| TEAM_GAMMA: \'30000000-0000-4000-a000-000000000003\',                 |
|                                                                       |
| CONTRACT_DELTA: \'30000000-0000-4000-a000-000000000004\',             |
|                                                                       |
| } as const;                                                           |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Offers --- one per status + special scenarios                      |
|                                                                       |
| // ============================================================       |
|                                                                       |
| export const SEED_OFFERS = {                                          |
|                                                                       |
| // Primary status scenarios                                           |
|                                                                       |
| PENDING: \'40000000-0000-4000-a000-000000000001\',                    |
|                                                                       |
| ACCEPTED: \'40000000-0000-4000-a000-000000000002\',                   |
|                                                                       |
| DECLINED: \'40000000-0000-4000-a000-000000000003\',                   |
|                                                                       |
| WITHDRAWN: \'40000000-0000-4000-a000-000000000004\',                  |
|                                                                       |
| EXPIRED: \'40000000-0000-4000-a000-000000000005\',                    |
|                                                                       |
| COUNTERED: \'40000000-0000-4000-a000-000000000006\',                  |
|                                                                       |
| // Special scenarios                                                  |
|                                                                       |
| EXPIRED_30_DAYS: \'40000000-0000-4000-a000-000000000007\', // Expired |
| \> 30 days ago (Ask Now, not Request Extension)                       |
|                                                                       |
| EXPIRING_SOON: \'40000000-0000-4000-a000-000000000008\', // Expires   |
| in \< 48h (warning state)                                             |
|                                                                       |
| RESENT: \'40000000-0000-4000-a000-000000000009\', // A resent offer   |
|                                                                       |
| RESENT_ORIGINAL: \'40000000-0000-4000-a000-000000000010\', // The     |
| original offer that was resent                                        |
|                                                                       |
| CO_MULTI_ROUND: \'40000000-0000-4000-a000-000000000011\', // Has 3    |
| rounds of counter offers                                              |
|                                                                       |
| DIFFERENT_CURRENCY: \'40000000-0000-4000-a000-000000000012\', // EUR  |
| offer (non-USD)                                                       |
|                                                                       |
| } as const;                                                           |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Counter offers                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| export const SEED_COUNTER_OFFERS = {                                  |
|                                                                       |
| // Status scenarios                                                   |
|                                                                       |
| PENDING: \'50000000-0000-4000-a000-000000000001\', // On              |
| SEED_OFFERS.COUNTERED                                                 |
|                                                                       |
| ACCEPTED: \'50000000-0000-4000-a000-000000000002\', // Historical CO  |
| on SEED_OFFERS.ACCEPTED                                               |
|                                                                       |
| DECLINED: \'50000000-0000-4000-a000-000000000003\', // On             |
| SEED_OFFERS.PENDING (was declined, restored)                          |
|                                                                       |
| WITHDRAWN: \'50000000-0000-4000-a000-000000000004\',                  |
|                                                                       |
| EXPIRED: \'50000000-0000-4000-a000-000000000005\',                    |
|                                                                       |
| SUPERSEDED: \'50000000-0000-4000-a000-000000000006\',                 |
|                                                                       |
| // Multi-round chain on SEED_OFFERS.CO_MULTI_ROUND                    |
|                                                                       |
| ROUND_1: \'50000000-0000-4000-a000-000000000007\', // SUPERSEDED      |
|                                                                       |
| ROUND_2: \'50000000-0000-4000-a000-000000000008\', // SUPERSEDED      |
|                                                                       |
| ROUND_3: \'50000000-0000-4000-a000-000000000009\', // PENDING         |
| (current active)                                                      |
|                                                                       |
| } as const;                                                           |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Offer history events (a sample --- real seeds insert many more)    |
|                                                                       |
| // ============================================================       |
|                                                                       |
| export const SEED_HISTORY = {                                         |
|                                                                       |
| OFFER_CREATED: \'60000000-0000-4000-a000-000000000001\',              |
|                                                                       |
| OFFER_ACCEPTED: \'60000000-0000-4000-a000-000000000002\',             |
|                                                                       |
| OFFER_COUNTERED: \'60000000-0000-4000-a000-000000000003\',            |
|                                                                       |
| } as const;                                                           |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 2 Seed Runner --- seed.ts**                                    |
|                                                                       |
| Inserts all offer records into the development database               |
+-----------------------------------------------------------------------+

The seed runner bootstraps a minimal NestJS application context to get
the TypeORM data sources, then inserts all seed records. It uses INSERT
\... ON CONFLICT (id) DO NOTHING so it is safe to run multiple times
without creating duplicates. Each section is labelled so you can see
progress in the terminal.

+-----------------------------------------------------------------------+
| Seeds are ONLY for local development and the test environment.        |
|                                                                       |
| This script checks NODE_ENV and aborts if it is not \"development\"   |
| or \"test\".                                                          |
|                                                                       |
| If you accidentally run this against staging or production, it will   |
| exit with an error.                                                   |
|                                                                       |
| Never add seed data to the application startup path.                  |
|                                                                       |
| Never run seeds in CI/CD pipelines against shared databases.          |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/seeds/seed.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import \'reflect-metadata\';                                          |
|                                                                       |
| import { NestFactory } from \'@nestjs/core\';                         |
|                                                                       |
| import { DataSource } from \'typeorm\';                               |
|                                                                       |
| import { getDataSourceToken } from \'@nestjs/typeorm\';               |
|                                                                       |
| import { AppModule } from \'../src/app.module\';                      |
|                                                                       |
| import { OfferStatus } from                                           |
| \'../src/offers/enums/offer-status.enum\';                            |
|                                                                       |
| import { ContractType } from                                          |
| \'../src/offers/enums/contract-type.enum\';                           |
|                                                                       |
| import { CounterOfferStatus } from                                    |
| \'../src/counter-offers/enums/counter-offer-status.enum\';            |
|                                                                       |
| import { OutboxEventStatus } from                                     |
| \'../src/outbox/entities/outbox-event.entity\';                       |
|                                                                       |
| import { SEED_USERS, SEED_LISTINGS, SEED_OFFERS, SEED_COUNTER_OFFERS  |
| } from \'./constants/seed-ids\';                                      |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Safety check                                                       |
|                                                                       |
| // ============================================================       |
|                                                                       |
| const ALLOWED_ENVS = \[\'development\', \'test\', \'local\'\];        |
|                                                                       |
| const NODE_ENV = process.env.NODE_ENV ?? \'development\';             |
|                                                                       |
| if (!ALLOWED_ENVS.includes(NODE_ENV)) {                               |
|                                                                       |
| console.error(\`\[seed\] ABORTED. NODE_ENV=\"\${NODE_ENV}\" is not    |
| allowed.\`);                                                          |
|                                                                       |
| console.error(\'\[seed\] Seeds may only run in: development, test,    |
| local.\');                                                            |
|                                                                       |
| process.exit(1);                                                      |
|                                                                       |
| }                                                                     |
|                                                                       |
| async function seed(): Promise\<void\> {                              |
|                                                                       |
| console.log(\'\[seed\] Starting offer-service seed\...\');            |
|                                                                       |
| console.log(\`\[seed\] NODE_ENV: \${NODE_ENV}\`);                     |
|                                                                       |
| // Bootstrap a minimal NestJS app context for TypeORM access.         |
|                                                                       |
| const app = await NestFactory.createApplicationContext(AppModule, {   |
|                                                                       |
| logger: \[\'error\'\], // Suppress verbose NestJS startup logs during |
| seeding                                                               |
|                                                                       |
| });                                                                   |
|                                                                       |
| const ds = app.get\<DataSource\>(getDataSourceToken());               |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Helper: insert with conflict skip                                  |
|                                                                       |
| // ============================================================       |
|                                                                       |
| async function insert(table: string, rows: Record\<string,            |
| unknown\>\[\]): Promise\<void\> {                                     |
|                                                                       |
| if (rows.length === 0) return;                                        |
|                                                                       |
| const cols = Object.keys(rows\[0\]);                                  |
|                                                                       |
| const colList = cols.map(c =\> \`\"\${c}\"\`).join(\', \');           |
|                                                                       |
| for (const row of rows) {                                             |
|                                                                       |
| const vals = cols.map((\_, i) =\> \`\$\${i + 1}\`).join(\', \');      |
|                                                                       |
| const values = cols.map(c =\> row\[c\]);                              |
|                                                                       |
| await ds.query(                                                       |
|                                                                       |
| \`INSERT INTO offer_service.\${table} (\${colList}) VALUES (\${vals}) |
|                                                                       |
| ON CONFLICT (id) DO NOTHING\`,                                        |
|                                                                       |
| values,                                                               |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Utility: future date as YYYY-MM-DD                                 |
|                                                                       |
| // ============================================================       |
|                                                                       |
| function futureDate(daysFromNow: number): string {                    |
|                                                                       |
| const d = new Date();                                                 |
|                                                                       |
| d.setDate(d.getDate() + daysFromNow);                                 |
|                                                                       |
| return d.toISOString().split(\'T\')\[0\];                             |
|                                                                       |
| }                                                                     |
|                                                                       |
| function pastDate(daysAgo: number): string {                          |
|                                                                       |
| const d = new Date();                                                 |
|                                                                       |
| d.setDate(d.getDate() - daysAgo);                                     |
|                                                                       |
| return d.toISOString().split(\'T\')\[0\];                             |
|                                                                       |
| }                                                                     |
|                                                                       |
| function nowPlusDays(days: number): Date {                            |
|                                                                       |
| const d = new Date(); d.setDate(d.getDate() + days); return d;        |
|                                                                       |
| }                                                                     |
|                                                                       |
| function nowMinusDays(days: number): Date {                           |
|                                                                       |
| const d = new Date(); d.setDate(d.getDate() - days); return d;        |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // SEED OFFERS                                                        |
|                                                                       |
| // ============================================================       |
|                                                                       |
| console.log(\'\[seed\] Inserting offers\...\');                       |
|                                                                       |
| const baseWorkSchedule = JSON.stringify({ type: \'FULL_TIME\' });     |
|                                                                       |
| const customSchedule = JSON.stringify({ type: \'CUSTOM\',             |
| hoursPerWeek: 30 });                                                  |
|                                                                       |
| await insert(\'offers\', \[                                           |
|                                                                       |
| // \-\-\-- PENDING offer \-\-\--                                      |
|                                                                       |
| // Normal pending offer. Client A hired Talent X for a PROJECT.       |
|                                                                       |
| // expires in 12 days (not yet expiring soon)                         |
|                                                                       |
| {                                                                     |
|                                                                       |
| id: SEED_OFFERS.PENDING,                                              |
|                                                                       |
| client_id: SEED_USERS.CLIENT_A,                                       |
|                                                                       |
| talent_id: SEED_USERS.TALENT_X,                                       |
|                                                                       |
| job_listing_id: SEED_LISTINGS.PROJECT_ALPHA,                          |
|                                                                       |
| contract_type: ContractType.PROJECT,                                  |
|                                                                       |
| contract_title: \'Alpha Platform Rebuild\',                           |
|                                                                       |
| status: OfferStatus.PENDING,                                          |
|                                                                       |
| rate: 95,                                                             |
|                                                                       |
| currency_code: \'USD\',                                               |
|                                                                       |
| duration_months: 6,                                                   |
|                                                                       |
| work_schedule: baseWorkSchedule,                                      |
|                                                                       |
| start_date: futureDate(30),                                           |
|                                                                       |
| message: \'Looking forward to working together on this project.\',    |
|                                                                       |
| expires_at: nowPlusDays(12),                                          |
|                                                                       |
| warning_sent_at: null,                                                |
|                                                                       |
| },                                                                    |
|                                                                       |
| // \-\-\-- ACCEPTED offer \-\-\--                                     |
|                                                                       |
| // Accepted 2 days ago. Client B hired Talent Y for a SERVICE.        |
|                                                                       |
| {                                                                     |
|                                                                       |
| id: SEED_OFFERS.ACCEPTED,                                             |
|                                                                       |
| client_id: SEED_USERS.CLIENT_B,                                       |
|                                                                       |
| talent_id: SEED_USERS.TALENT_Y,                                       |
|                                                                       |
| job_listing_id: SEED_LISTINGS.SERVICE_BETA,                           |
|                                                                       |
| contract_type: ContractType.SERVICE,                                  |
|                                                                       |
| contract_title: \'Beta UX Design Retainer\',                          |
|                                                                       |
| status: OfferStatus.ACCEPTED,                                         |
|                                                                       |
| rate: 120,                                                            |
|                                                                       |
| currency_code: \'USD\',                                               |
|                                                                       |
| duration_months: 3,                                                   |
|                                                                       |
| work_schedule: customSchedule,                                        |
|                                                                       |
| start_date: futureDate(7),                                            |
|                                                                       |
| message: null,                                                        |
|                                                                       |
| expires_at: nowPlusDays(12),                                          |
|                                                                       |
| accepted_at: nowMinusDays(2),                                         |
|                                                                       |
| },                                                                    |
|                                                                       |
| // \-\-\-- DECLINED offer \-\-\--                                     |
|                                                                       |
| // Declined 1 day ago. Talent X declined with a reason.               |
|                                                                       |
| {                                                                     |
|                                                                       |
| id: SEED_OFFERS.DECLINED,                                             |
|                                                                       |
| client_id: SEED_USERS.CLIENT_A,                                       |
|                                                                       |
| talent_id: SEED_USERS.TALENT_Z,                                       |
|                                                                       |
| job_listing_id: SEED_LISTINGS.CONTRACT_DELTA,                         |
|                                                                       |
| contract_type: ContractType.CONTRACT,                                 |
|                                                                       |
| contract_title: \'Delta Senior Engineer\',                            |
|                                                                       |
| status: OfferStatus.DECLINED,                                         |
|                                                                       |
| rate: 85,                                                             |
|                                                                       |
| currency_code: \'USD\',                                               |
|                                                                       |
| duration_months: 12,                                                  |
|                                                                       |
| work_schedule: baseWorkSchedule,                                      |
|                                                                       |
| start_date: futureDate(14),                                           |
|                                                                       |
| message: null,                                                        |
|                                                                       |
| expires_at: nowMinusDays(1),                                          |
|                                                                       |
| declined_at: nowMinusDays(1),                                         |
|                                                                       |
| declined_reason: \'The budget doesn\\\'t align with my current rate   |
| for a 12-month commitment.\',                                         |
|                                                                       |
| declined_chip: \'BUDGET_DOESNT_WORK\',                                |
|                                                                       |
| },                                                                    |
|                                                                       |
| // \-\-\-- WITHDRAWN offer \-\-\--                                    |
|                                                                       |
| // Client A withdrew an offer to Talent Y for a TEAM project.         |
|                                                                       |
| {                                                                     |
|                                                                       |
| id: SEED_OFFERS.WITHDRAWN,                                            |
|                                                                       |
| client_id: SEED_USERS.CLIENT_A,                                       |
|                                                                       |
| talent_id: SEED_USERS.TALENT_Y,                                       |
|                                                                       |
| job_listing_id: SEED_LISTINGS.TEAM_GAMMA,                             |
|                                                                       |
| contract_type: ContractType.TEAM,                                     |
|                                                                       |
| contract_title: \'Gamma Launch Team\',                                |
|                                                                       |
| status: OfferStatus.WITHDRAWN,                                        |
|                                                                       |
| rate: 100,                                                            |
|                                                                       |
| currency_code: \'USD\',                                               |
|                                                                       |
| duration_months: 4,                                                   |
|                                                                       |
| work_schedule: baseWorkSchedule,                                      |
|                                                                       |
| start_date: futureDate(60),                                           |
|                                                                       |
| message: null,                                                        |
|                                                                       |
| expires_at: nowMinusDays(3),                                          |
|                                                                       |
| withdrawn_at: nowMinusDays(3),                                        |
|                                                                       |
| withdrawal_message: \'We have decided to pause this hiring            |
| initiative.\',                                                        |
|                                                                       |
| },                                                                    |
|                                                                       |
| // \-\-\-- EXPIRED offer (within 30 days) \-\-\--                     |
|                                                                       |
| // Expired 10 days ago. Client can Request Extension (within 30d      |
| threshold).                                                           |
|                                                                       |
| {                                                                     |
|                                                                       |
| id: SEED_OFFERS.EXPIRED,                                              |
|                                                                       |
| client_id: SEED_USERS.CLIENT_B,                                       |
|                                                                       |
| talent_id: SEED_USERS.TALENT_X,                                       |
|                                                                       |
| job_listing_id: SEED_LISTINGS.PROJECT_ALPHA,                          |
|                                                                       |
| contract_type: ContractType.PROJECT,                                  |
|                                                                       |
| contract_title: \'Alpha Mobile App Phase 2\',                         |
|                                                                       |
| status: OfferStatus.EXPIRED,                                          |
|                                                                       |
| rate: 90,                                                             |
|                                                                       |
| currency_code: \'USD\',                                               |
|                                                                       |
| duration_months: 3,                                                   |
|                                                                       |
| work_schedule: customSchedule,                                        |
|                                                                       |
| start_date: futureDate(30),                                           |
|                                                                       |
| message: null,                                                        |
|                                                                       |
| expires_at: nowMinusDays(10),                                         |
|                                                                       |
| expired_at: nowMinusDays(10),                                         |
|                                                                       |
| },                                                                    |
|                                                                       |
| // \-\-\-- COUNTERED offer \-\-\--                                    |
|                                                                       |
| // Has an active (PENDING) counter offer from Talent X.               |
|                                                                       |
| // Client A made the offer; Talent X countered with higher rate.      |
|                                                                       |
| {                                                                     |
|                                                                       |
| id: SEED_OFFERS.COUNTERED,                                            |
|                                                                       |
| client_id: SEED_USERS.CLIENT_A,                                       |
|                                                                       |
| talent_id: SEED_USERS.TALENT_X,                                       |
|                                                                       |
| job_listing_id: SEED_LISTINGS.SERVICE_BETA,                           |
|                                                                       |
| contract_type: ContractType.SERVICE,                                  |
|                                                                       |
| contract_title: \'Beta API Integration Service\',                     |
|                                                                       |
| status: OfferStatus.COUNTERED,                                        |
|                                                                       |
| rate: 80,                                                             |
|                                                                       |
| currency_code: \'USD\',                                               |
|                                                                       |
| duration_months: 6,                                                   |
|                                                                       |
| work_schedule: baseWorkSchedule,                                      |
|                                                                       |
| start_date: futureDate(21),                                           |
|                                                                       |
| message: \'I think we can make this work.\',                          |
|                                                                       |
| expires_at: nowPlusDays(8),                                           |
|                                                                       |
| },                                                                    |
|                                                                       |
| // \-\-\-- EXPIRED \> 30 days ago (Ask Now scenario) \-\-\--          |
|                                                                       |
| // Expired 45 days ago. Shows \"Ask Now\" button (not Request         |
| Extension).                                                           |
|                                                                       |
| {                                                                     |
|                                                                       |
| id: SEED_OFFERS.EXPIRED_30_DAYS,                                      |
|                                                                       |
| client_id: SEED_USERS.CLIENT_B,                                       |
|                                                                       |
| talent_id: SEED_USERS.TALENT_Z,                                       |
|                                                                       |
| job_listing_id: SEED_LISTINGS.TEAM_GAMMA,                             |
|                                                                       |
| contract_type: ContractType.TEAM,                                     |
|                                                                       |
| contract_title: \'Gamma Data Team\',                                  |
|                                                                       |
| status: OfferStatus.EXPIRED,                                          |
|                                                                       |
| rate: 110,                                                            |
|                                                                       |
| currency_code: \'USD\',                                               |
|                                                                       |
| duration_months: 6,                                                   |
|                                                                       |
| work_schedule: baseWorkSchedule,                                      |
|                                                                       |
| start_date: futureDate(60),                                           |
|                                                                       |
| message: null,                                                        |
|                                                                       |
| expires_at: nowMinusDays(45),                                         |
|                                                                       |
| expired_at: nowMinusDays(45),                                         |
|                                                                       |
| },                                                                    |
|                                                                       |
| // \-\-\-- EXPIRING SOON (within 48h) \-\-\--                         |
|                                                                       |
| // Expires in 20 hours. Shows expiry warning banner.                  |
|                                                                       |
| {                                                                     |
|                                                                       |
| id: SEED_OFFERS.EXPIRING_SOON,                                        |
|                                                                       |
| client_id: SEED_USERS.CLIENT_A,                                       |
|                                                                       |
| talent_id: SEED_USERS.TALENT_Y,                                       |
|                                                                       |
| job_listing_id: SEED_LISTINGS.CONTRACT_DELTA,                         |
|                                                                       |
| contract_type: ContractType.CONTRACT,                                 |
|                                                                       |
| contract_title: \'Delta Frontend Lead\',                              |
|                                                                       |
| status: OfferStatus.PENDING,                                          |
|                                                                       |
| rate: 105,                                                            |
|                                                                       |
| currency_code: \'USD\',                                               |
|                                                                       |
| duration_months: 6,                                                   |
|                                                                       |
| work_schedule: customSchedule,                                        |
|                                                                       |
| start_date: futureDate(14),                                           |
|                                                                       |
| message: null,                                                        |
|                                                                       |
| // Set expires_at to 20 hours from now                                |
|                                                                       |
| expires_at: new Date(Date.now() + 20 \* 60 \* 60 \* 1000),            |
|                                                                       |
| warning_sent_at: new Date(Date.now() - 4 \* 60 \* 60 \* 1000), //     |
| Warning sent 4h ago                                                   |
|                                                                       |
| },                                                                    |
|                                                                       |
| // \-\-\-- RESENT original (DECLINED) \-\-\--                         |
|                                                                       |
| {                                                                     |
|                                                                       |
| id: SEED_OFFERS.RESENT_ORIGINAL,                                      |
|                                                                       |
| client_id: SEED_USERS.CLIENT_B,                                       |
|                                                                       |
| talent_id: SEED_USERS.TALENT_Z,                                       |
|                                                                       |
| job_listing_id: SEED_LISTINGS.SERVICE_BETA,                           |
|                                                                       |
| contract_type: ContractType.SERVICE,                                  |
|                                                                       |
| contract_title: \'Beta Analytics Service\',                           |
|                                                                       |
| status: OfferStatus.DECLINED,                                         |
|                                                                       |
| rate: 95,                                                             |
|                                                                       |
| currency_code: \'USD\',                                               |
|                                                                       |
| duration_months: 3,                                                   |
|                                                                       |
| work_schedule: baseWorkSchedule,                                      |
|                                                                       |
| start_date: futureDate(30),                                           |
|                                                                       |
| message: null,                                                        |
|                                                                       |
| expires_at: nowMinusDays(20),                                         |
|                                                                       |
| declined_at: nowMinusDays(20),                                        |
|                                                                       |
| declined_reason: \'The rate doesn\\\'t match current market rates.\', |
|                                                                       |
| declined_chip: \'BUDGET_DOESNT_WORK\',                                |
|                                                                       |
| },                                                                    |
|                                                                       |
| // \-\-\-- RESENT (new offer referencing original) \-\-\--            |
|                                                                       |
| {                                                                     |
|                                                                       |
| id: SEED_OFFERS.RESENT,                                               |
|                                                                       |
| client_id: SEED_USERS.CLIENT_B,                                       |
|                                                                       |
| talent_id: SEED_USERS.TALENT_Z,                                       |
|                                                                       |
| job_listing_id: SEED_LISTINGS.SERVICE_BETA,                           |
|                                                                       |
| contract_type: ContractType.SERVICE,                                  |
|                                                                       |
| contract_title: \'Beta Analytics Service\',                           |
|                                                                       |
| status: OfferStatus.PENDING,                                          |
|                                                                       |
| rate: 110, // Client increased rate for the resend                    |
|                                                                       |
| currency_code: \'USD\',                                               |
|                                                                       |
| duration_months: 3,                                                   |
|                                                                       |
| work_schedule: baseWorkSchedule,                                      |
|                                                                       |
| start_date: futureDate(14),                                           |
|                                                                       |
| message: \'Revised the rate based on your feedback.\',                |
|                                                                       |
| expires_at: nowPlusDays(14),                                          |
|                                                                       |
| original_offer_id: SEED_OFFERS.RESENT_ORIGINAL,                       |
|                                                                       |
| },                                                                    |
|                                                                       |
| // \-\-\-- EUR offer (non-USD currency) \-\-\--                       |
|                                                                       |
| {                                                                     |
|                                                                       |
| id: SEED_OFFERS.DIFFERENT_CURRENCY,                                   |
|                                                                       |
| client_id: SEED_USERS.CLIENT_B,                                       |
|                                                                       |
| talent_id: SEED_USERS.TALENT_Y,                                       |
|                                                                       |
| job_listing_id: SEED_LISTINGS.PROJECT_ALPHA,                          |
|                                                                       |
| contract_type: ContractType.PROJECT,                                  |
|                                                                       |
| contract_title: \'Alpha European Expansion\',                         |
|                                                                       |
| status: OfferStatus.PENDING,                                          |
|                                                                       |
| rate: 88,                                                             |
|                                                                       |
| currency_code: \'EUR\', // Non-USD currency                           |
|                                                                       |
| duration_months: 4,                                                   |
|                                                                       |
| work_schedule: customSchedule,                                        |
|                                                                       |
| start_date: futureDate(45),                                           |
|                                                                       |
| message: null,                                                        |
|                                                                       |
| expires_at: nowPlusDays(14),                                          |
|                                                                       |
| },                                                                    |
|                                                                       |
| // \-\-\-- Multi-round CO offer \-\-\--                               |
|                                                                       |
| {                                                                     |
|                                                                       |
| id: SEED_OFFERS.CO_MULTI_ROUND,                                       |
|                                                                       |
| client_id: SEED_USERS.CLIENT_A,                                       |
|                                                                       |
| talent_id: SEED_USERS.TALENT_X,                                       |
|                                                                       |
| job_listing_id: SEED_LISTINGS.CONTRACT_DELTA,                         |
|                                                                       |
| contract_type: ContractType.CONTRACT,                                 |
|                                                                       |
| contract_title: \'Delta Principal Engineer\',                         |
|                                                                       |
| status: OfferStatus.COUNTERED,                                        |
|                                                                       |
| rate: 120,                                                            |
|                                                                       |
| currency_code: \'USD\',                                               |
|                                                                       |
| duration_months: 12,                                                  |
|                                                                       |
| work_schedule: baseWorkSchedule,                                      |
|                                                                       |
| start_date: futureDate(30),                                           |
|                                                                       |
| message: \'This is a senior role with significant ownership.\',       |
|                                                                       |
| expires_at: nowPlusDays(5),                                           |
|                                                                       |
| },                                                                    |
|                                                                       |
| \]);                                                                  |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // SEED COUNTER OFFERS                                                |
|                                                                       |
| // ============================================================       |
|                                                                       |
| console.log(\'\[seed\] Inserting counter offers\...\');               |
|                                                                       |
| await insert(\'counter_offers\', \[                                   |
|                                                                       |
| // PENDING CO on the COUNTERED offer                                  |
|                                                                       |
| {                                                                     |
|                                                                       |
| id: SEED_COUNTER_OFFERS.PENDING,                                      |
|                                                                       |
| offer_id: SEED_OFFERS.COUNTERED,                                      |
|                                                                       |
| submitted_by: \'TALENT\',                                             |
|                                                                       |
| submitted_by_id: SEED_USERS.TALENT_X,                                 |
|                                                                       |
| status: CounterOfferStatus.PENDING,                                   |
|                                                                       |
| rate: 100,                                                            |
|                                                                       |
| currency_code: \'USD\',                                               |
|                                                                       |
| duration_months: 6,                                                   |
|                                                                       |
| work_schedule: JSON.stringify({ type: \'FULL_TIME\' }),               |
|                                                                       |
| start_date: futureDate(28),                                           |
|                                                                       |
| message: \'I would need \$100/hr given the scope.\',                  |
|                                                                       |
| expires_at: nowPlusDays(10),                                          |
|                                                                       |
| },                                                                    |
|                                                                       |
| // PENDING CO Round 3 on multi-round offer (current active CO)        |
|                                                                       |
| {                                                                     |
|                                                                       |
| id: SEED_COUNTER_OFFERS.ROUND_3,                                      |
|                                                                       |
| offer_id: SEED_OFFERS.CO_MULTI_ROUND,                                 |
|                                                                       |
| submitted_by: \'CLIENT\',                                             |
|                                                                       |
| submitted_by_id: SEED_USERS.CLIENT_A,                                 |
|                                                                       |
| status: CounterOfferStatus.PENDING,                                   |
|                                                                       |
| rate: 135,                                                            |
|                                                                       |
| currency_code: \'USD\',                                               |
|                                                                       |
| duration_months: 12,                                                  |
|                                                                       |
| work_schedule: JSON.stringify({ type: \'FULL_TIME\' }),               |
|                                                                       |
| start_date: futureDate(30),                                           |
|                                                                       |
| message: \'Final offer: \$135/hr and we start next month.\',          |
|                                                                       |
| expires_at: nowPlusDays(5),                                           |
|                                                                       |
| },                                                                    |
|                                                                       |
| // SUPERSEDED CO Round 2 on multi-round offer                         |
|                                                                       |
| {                                                                     |
|                                                                       |
| id: SEED_COUNTER_OFFERS.ROUND_2,                                      |
|                                                                       |
| offer_id: SEED_OFFERS.CO_MULTI_ROUND,                                 |
|                                                                       |
| submitted_by: \'TALENT\',                                             |
|                                                                       |
| submitted_by_id: SEED_USERS.TALENT_X,                                 |
|                                                                       |
| status: CounterOfferStatus.SUPERSEDED,                                |
|                                                                       |
| rate: 145,                                                            |
|                                                                       |
| currency_code: \'USD\',                                               |
|                                                                       |
| duration_months: 12,                                                  |
|                                                                       |
| work_schedule: JSON.stringify({ type: \'FULL_TIME\' }),               |
|                                                                       |
| start_date: futureDate(30),                                           |
|                                                                       |
| message: \'\$145/hr is my rate for this level of seniority.\',        |
|                                                                       |
| expires_at: nowMinusDays(2),                                          |
|                                                                       |
| superseded_at: nowMinusDays(2),                                       |
|                                                                       |
| },                                                                    |
|                                                                       |
| // SUPERSEDED CO Round 1 on multi-round offer                         |
|                                                                       |
| {                                                                     |
|                                                                       |
| id: SEED_COUNTER_OFFERS.ROUND_1,                                      |
|                                                                       |
| offer_id: SEED_OFFERS.CO_MULTI_ROUND,                                 |
|                                                                       |
| submitted_by: \'CLIENT\',                                             |
|                                                                       |
| submitted_by_id: SEED_USERS.CLIENT_A,                                 |
|                                                                       |
| status: CounterOfferStatus.SUPERSEDED,                                |
|                                                                       |
| rate: 125,                                                            |
|                                                                       |
| currency_code: \'USD\',                                               |
|                                                                       |
| duration_months: 12,                                                  |
|                                                                       |
| work_schedule: JSON.stringify({ type: \'FULL_TIME\' }),               |
|                                                                       |
| start_date: futureDate(30),                                           |
|                                                                       |
| message: \'\$125 is our budget for this role.\',                      |
|                                                                       |
| expires_at: nowMinusDays(5),                                          |
|                                                                       |
| superseded_at: nowMinusDays(5),                                       |
|                                                                       |
| },                                                                    |
|                                                                       |
| \]);                                                                  |
|                                                                       |
| console.log(\'\[seed\] Seed complete.\');                             |
|                                                                       |
| console.log(\`\[seed\] Summary:\`);                                   |
|                                                                       |
| console.log(\`\[seed\] Offers:                                        |
| \${Object.keys(SEED_OFFERS).length}\`);                               |
|                                                                       |
| console.log(\`\[seed\] Counter offers: 4\`);                          |
|                                                                       |
| await app.close();                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| seed().catch(err =\> {                                                |
|                                                                       |
| console.error(\'\[seed\] Error:\', err);                              |
|                                                                       |
| process.exit(1);                                                      |
|                                                                       |
| });                                                                   |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 3 Reset Script --- reset.ts**                                  |
|                                                                       |
| Wipes all offer-service seed data                                     |
+-----------------------------------------------------------------------+

The reset script deletes all rows from all offer-service tables in the
correct dependency order (outbox and offer_history first, then
counter_offers, then offers). Safe to run --- it does not drop tables or
alter schema. After reset, run seed.ts to repopulate.

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/seeds/reset.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import \'reflect-metadata\';                                          |
|                                                                       |
| import { NestFactory } from \'@nestjs/core\';                         |
|                                                                       |
| import { DataSource } from \'typeorm\';                               |
|                                                                       |
| import { getDataSourceToken } from \'@nestjs/typeorm\';               |
|                                                                       |
| import { AppModule } from \'../src/app.module\';                      |
|                                                                       |
| const ALLOWED_ENVS = \[\'development\', \'test\', \'local\'\];        |
|                                                                       |
| const NODE_ENV = process.env.NODE_ENV ?? \'development\';             |
|                                                                       |
| if (!ALLOWED_ENVS.includes(NODE_ENV)) {                               |
|                                                                       |
| console.error(\`\[reset\] ABORTED. NODE_ENV=\"\${NODE_ENV}\" is not   |
| allowed.\`);                                                          |
|                                                                       |
| process.exit(1);                                                      |
|                                                                       |
| }                                                                     |
|                                                                       |
| async function reset(): Promise\<void\> {                             |
|                                                                       |
| console.log(\'\[reset\] Resetting offer-service data\...\');          |
|                                                                       |
| const app = await NestFactory.createApplicationContext(AppModule, {   |
| logger: \[\'error\'\] });                                             |
|                                                                       |
| const ds = app.get\<DataSource\>(getDataSourceToken());               |
|                                                                       |
| // Delete in reverse FK dependency order.                             |
|                                                                       |
| // outbox and offer_history reference offers and counter_offers.      |
|                                                                       |
| await ds.query(\`DELETE FROM offer_service.outbox\`);                 |
|                                                                       |
| await ds.query(\`DELETE FROM offer_service.offer_history\`);          |
|                                                                       |
| await ds.query(\`DELETE FROM offer_service.counter_offers\`);         |
|                                                                       |
| await ds.query(\`DELETE FROM offer_service.offers\`);                 |
|                                                                       |
| console.log(\'\[reset\] All offer_service data cleared.\');           |
|                                                                       |
| await app.close();                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| reset().catch(err =\> {                                               |
|                                                                       |
| console.error(\'\[reset\] Error:\', err);                             |
|                                                                       |
| process.exit(1);                                                      |
|                                                                       |
| });                                                                   |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 4 Offer Factory --- offer.factory.ts**                         |
|                                                                       |
| Creates typed Offer instances for unit and integration tests          |
+-----------------------------------------------------------------------+

The offer factory provides a single createOffer() function that accepts
Partial\<Offer\> overrides and returns a fully typed Offer instance with
sensible defaults. Every field has a meaningful default value so tests
only need to override the fields relevant to what they are testing.

+-----------------------------------------------------------------------+
| How factories work in tests:                                          |
|                                                                       |
| Unit tests: call the factory directly. It returns a plain object      |
| matching the entity.                                                  |
|                                                                       |
| No database involved. Pass the result to a mocked repository.         |
|                                                                       |
| Integration tests: call the factory, then save via the real           |
| repository.                                                           |
|                                                                       |
| The factory fills all required fields so save() succeeds.             |
|                                                                       |
| Example unit test usage:                                              |
|                                                                       |
| const offer = createOffer({ status: OfferStatus.PENDING, rate: 95 }); |
|                                                                       |
| mockRepo.findOne.mockResolvedValue(offer);                            |
|                                                                       |
| Example integration test usage:                                       |
|                                                                       |
| const offer = createOffer({ clientId: testClientId, talentId:         |
| testTalentId });                                                      |
|                                                                       |
| await offerRepo.save(offer);                                          |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/test/fixtures/offer.factory.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { Offer, WorkSchedule } from                                   |
| \'../../src/offers/entities/offer.entity\';                           |
|                                                                       |
| import { OfferStatus } from                                           |
| \'../../src/offers/enums/offer-status.enum\';                         |
|                                                                       |
| import { ContractType } from                                          |
| \'../../src/offers/enums/contract-type.enum\';                        |
|                                                                       |
| import { WorkScheduleType } from                                      |
| \'../../src/offers/enums/work-schedule-type.enum\';                   |
|                                                                       |
| import { SEED_USERS, SEED_LISTINGS } from                             |
| \'../../seeds/constants/seed-ids\';                                   |
|                                                                       |
| /\*\* Default work schedule used across all factory calls unless      |
| overridden. \*/                                                       |
|                                                                       |
| const DEFAULT_SCHEDULE: WorkSchedule = { type:                        |
| WorkScheduleType.FULL_TIME };                                         |
|                                                                       |
| /\*\* Offset from today in days for the default expiry. \*/           |
|                                                                       |
| const DEFAULT_TTL_DAYS = 14;                                          |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* createOffer --- Factory for Offer entity instances.                |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Returns a plain object matching the Offer entity structure.        |
|                                                                       |
| \* All fields have sensible defaults. Pass overrides to customise.    |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* \@example                                                          |
|                                                                       |
| \* // Unit test: offer with specific status                           |
|                                                                       |
| \* const offer = createOffer({ status: OfferStatus.DECLINED });       |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* // Integration test: save to DB                                    |
|                                                                       |
| \* const offer = createOffer({ clientId: myClientId, talentId:        |
| myTalentId });                                                        |
|                                                                       |
| \* await offerRepo.save(offer);                                       |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export function createOffer(overrides: Partial\<Offer\> = {}): Offer  |
| {                                                                     |
|                                                                       |
| const now = new Date();                                               |
|                                                                       |
| const expires = new Date(now);                                        |
|                                                                       |
| expires.setDate(expires.getDate() + DEFAULT_TTL_DAYS);                |
|                                                                       |
| const defaults: Offer = {                                             |
|                                                                       |
| id: overrides.id ?? crypto.randomUUID(),                              |
|                                                                       |
| clientId: overrides.clientId ?? SEED_USERS.CLIENT_A,                  |
|                                                                       |
| talentId: overrides.talentId ?? SEED_USERS.TALENT_X,                  |
|                                                                       |
| jobListingId: overrides.jobListingId ?? SEED_LISTINGS.PROJECT_ALPHA,  |
|                                                                       |
| contractType: overrides.contractType ?? ContractType.PROJECT,         |
|                                                                       |
| contractTitle: overrides.contractTitle ?? \'Test Project\',           |
|                                                                       |
| status: overrides.status ?? OfferStatus.PENDING,                      |
|                                                                       |
| rate: overrides.rate ?? 95,                                           |
|                                                                       |
| currencyCode: overrides.currencyCode ?? \'USD\',                      |
|                                                                       |
| durationMonths: overrides.durationMonths ?? 6,                        |
|                                                                       |
| workSchedule: overrides.workSchedule ?? DEFAULT_SCHEDULE,             |
|                                                                       |
| startDate: overrides.startDate ?? futureDate(30),                     |
|                                                                       |
| message: overrides.message ?? null,                                   |
|                                                                       |
| expiresAt: overrides.expiresAt ?? expires,                            |
|                                                                       |
| warningSentAt: overrides.warningSentAt ?? null,                       |
|                                                                       |
| acceptedAt: overrides.acceptedAt ?? null,                             |
|                                                                       |
| declinedAt: overrides.declinedAt ?? null,                             |
|                                                                       |
| declinedReason: overrides.declinedReason ?? null,                     |
|                                                                       |
| declinedChip: overrides.declinedChip ?? null,                         |
|                                                                       |
| withdrawnAt: overrides.withdrawnAt ?? null,                           |
|                                                                       |
| withdrawalMessage: overrides.withdrawalMessage ?? null,               |
|                                                                       |
| expiredAt: overrides.expiredAt ?? null,                               |
|                                                                       |
| originalOfferId: overrides.originalOfferId ?? null,                   |
|                                                                       |
| counterOffers: overrides.counterOffers ?? \[\],                       |
|                                                                       |
| historyEvents: overrides.historyEvents ?? \[\],                       |
|                                                                       |
| createdAt: overrides.createdAt ?? now,                                |
|                                                                       |
| updatedAt: overrides.updatedAt ?? now,                                |
|                                                                       |
| };                                                                    |
|                                                                       |
| // Merge overrides (already spread above, but ensure any extra props  |
| are included)                                                         |
|                                                                       |
| return { \...defaults, \...overrides };                               |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // State-specific convenience factories                               |
|                                                                       |
| // ============================================================       |
|                                                                       |
| /\*\* Creates a PENDING offer with full default terms. \*/            |
|                                                                       |
| export function createPendingOffer(overrides: Partial\<Offer\> = {}): |
| Offer {                                                               |
|                                                                       |
| return createOffer({ \...overrides, status: OfferStatus.PENDING });   |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\* Creates an ACCEPTED offer with acceptedAt set. \*/              |
|                                                                       |
| export function createAcceptedOffer(overrides: Partial\<Offer\> =     |
| {}): Offer {                                                          |
|                                                                       |
| return createOffer({                                                  |
|                                                                       |
| status: OfferStatus.ACCEPTED,                                         |
|                                                                       |
| acceptedAt: new Date(),                                               |
|                                                                       |
| \...overrides,                                                        |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\* Creates a DECLINED offer with reason and chip. \*/              |
|                                                                       |
| export function createDeclinedOffer(overrides: Partial\<Offer\> =     |
| {}): Offer {                                                          |
|                                                                       |
| return createOffer({                                                  |
|                                                                       |
| status: OfferStatus.DECLINED,                                         |
|                                                                       |
| declinedAt: new Date(),                                               |
|                                                                       |
| declinedReason: \'Budget doesn\\\'t work.\',                          |
|                                                                       |
| declinedChip: \'BUDGET_DOESNT_WORK\',                                 |
|                                                                       |
| \...overrides,                                                        |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\* Creates a WITHDRAWN offer with withdrawnAt set. \*/             |
|                                                                       |
| export function createWithdrawnOffer(overrides: Partial\<Offer\> =    |
| {}): Offer {                                                          |
|                                                                       |
| return createOffer({                                                  |
|                                                                       |
| status: OfferStatus.WITHDRAWN,                                        |
|                                                                       |
| withdrawnAt: new Date(),                                              |
|                                                                       |
| \...overrides,                                                        |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\* Creates an EXPIRED offer. expiresAt and expiredAt are set in    |
| the past. \*/                                                         |
|                                                                       |
| export function createExpiredOffer(daysAgo = 1, overrides:            |
| Partial\<Offer\> = {}): Offer {                                       |
|                                                                       |
| const pastExpiry = new Date();                                        |
|                                                                       |
| pastExpiry.setDate(pastExpiry.getDate() - daysAgo);                   |
|                                                                       |
| return createOffer({                                                  |
|                                                                       |
| status: OfferStatus.EXPIRED,                                          |
|                                                                       |
| expiresAt: pastExpiry,                                                |
|                                                                       |
| expiredAt: pastExpiry,                                                |
|                                                                       |
| \...overrides,                                                        |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\* Creates a COUNTERED offer (has an active counter offer). \*/    |
|                                                                       |
| export function createCounteredOffer(overrides: Partial\<Offer\> =    |
| {}): Offer {                                                          |
|                                                                       |
| return createOffer({ \...overrides, status: OfferStatus.COUNTERED }); |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* Creates an offer expiring soon (within the warning threshold).     |
|                                                                       |
| \* Sets expiresAt to 20 hours from now and warningSentAt to 4 hours   |
| ago.                                                                  |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export function createExpiringSoonOffer(overrides: Partial\<Offer\> = |
| {}): Offer {                                                          |
|                                                                       |
| const expiresAt = new Date(Date.now() + 20 \* 60 \* 60 \* 1000);      |
|                                                                       |
| const warningSentAt = new Date(Date.now() - 4 \* 60 \* 60 \* 1000);   |
|                                                                       |
| return createOffer({ expiresAt, warningSentAt, \...overrides });      |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Helper                                                             |
|                                                                       |
| function futureDate(days: number): string {                           |
|                                                                       |
| const d = new Date();                                                 |
|                                                                       |
| d.setDate(d.getDate() + days);                                        |
|                                                                       |
| return d.toISOString().split(\'T\')\[0\];                             |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 5 Counter Offer Factory --- counter-offer.factory.ts**         |
|                                                                       |
| Creates typed CounterOffer instances for all states                   |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/test/fixtures/counter-offer.factory.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { CounterOffer } from                                          |
| \'../../src/counter-offers/entities/counter-offer.entity\';           |
|                                                                       |
| import { CounterOfferStatus } from                                    |
| \'../../src/counter-offers/enums/counter-offer-status.enum\';         |
|                                                                       |
| import { WorkScheduleType } from                                      |
| \'../../src/offers/enums/work-schedule-type.enum\';                   |
|                                                                       |
| import { SEED_USERS, SEED_OFFERS } from                               |
| \'../../seeds/constants/seed-ids\';                                   |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* createCounterOffer --- Factory for CounterOffer entity instances.  |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Defaults to a PENDING counter offer submitted by TALENT            |
|                                                                       |
| \* on SEED_OFFERS.COUNTERED with a rate of \$100.                     |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export function createCounterOffer(overrides: Partial\<CounterOffer\> |
| = {}): CounterOffer {                                                 |
|                                                                       |
| const now = new Date();                                               |
|                                                                       |
| const expires = new Date(now);                                        |
|                                                                       |
| expires.setDate(expires.getDate() + 14);                              |
|                                                                       |
| return {                                                              |
|                                                                       |
| id: overrides.id ?? crypto.randomUUID(),                              |
|                                                                       |
| offerId: overrides.offerId ?? SEED_OFFERS.COUNTERED,                  |
|                                                                       |
| submittedBy: overrides.submittedBy ?? \'TALENT\',                     |
|                                                                       |
| submittedById: overrides.submittedById ?? SEED_USERS.TALENT_X,        |
|                                                                       |
| status: overrides.status ?? CounterOfferStatus.PENDING,               |
|                                                                       |
| rate: overrides.rate ?? 100,                                          |
|                                                                       |
| currencyCode: overrides.currencyCode ?? \'USD\',                      |
|                                                                       |
| durationMonths: overrides.durationMonths ?? 6,                        |
|                                                                       |
| workSchedule: overrides.workSchedule ?? { type:                       |
| WorkScheduleType.FULL_TIME },                                         |
|                                                                       |
| startDate: overrides.startDate ?? futureDate(28),                     |
|                                                                       |
| message: overrides.message ?? null,                                   |
|                                                                       |
| expiresAt: overrides.expiresAt ?? expires,                            |
|                                                                       |
| warningSentAt: overrides.warningSentAt ?? null,                       |
|                                                                       |
| acceptedAt: overrides.acceptedAt ?? null,                             |
|                                                                       |
| declinedAt: overrides.declinedAt ?? null,                             |
|                                                                       |
| withdrawnAt: overrides.withdrawnAt ?? null,                           |
|                                                                       |
| withdrawalMessage: overrides.withdrawalMessage ?? null,               |
|                                                                       |
| expiredAt: overrides.expiredAt ?? null,                               |
|                                                                       |
| supersededAt: overrides.supersededAt ?? null,                         |
|                                                                       |
| offer: overrides.offer ?? undefined as any,                           |
|                                                                       |
| historyEvents: overrides.historyEvents ?? \[\],                       |
|                                                                       |
| createdAt: overrides.createdAt ?? now,                                |
|                                                                       |
| updatedAt: overrides.updatedAt ?? now,                                |
|                                                                       |
| \...overrides,                                                        |
|                                                                       |
| } as CounterOffer;                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| // State-specific factories                                           |
|                                                                       |
| export function createPendingCO(overrides: Partial\<CounterOffer\> =  |
| {}): CounterOffer {                                                   |
|                                                                       |
| return createCounterOffer({ \...overrides, status:                    |
| CounterOfferStatus.PENDING });                                        |
|                                                                       |
| }                                                                     |
|                                                                       |
| export function createAcceptedCO(overrides: Partial\<CounterOffer\> = |
| {}): CounterOffer {                                                   |
|                                                                       |
| return createCounterOffer({ status: CounterOfferStatus.ACCEPTED,      |
| acceptedAt: new Date(), \...overrides });                             |
|                                                                       |
| }                                                                     |
|                                                                       |
| export function createDeclinedCO(overrides: Partial\<CounterOffer\> = |
| {}): CounterOffer {                                                   |
|                                                                       |
| return createCounterOffer({ status: CounterOfferStatus.DECLINED,      |
| declinedAt: new Date(), \...overrides });                             |
|                                                                       |
| }                                                                     |
|                                                                       |
| export function createWithdrawnCO(overrides: Partial\<CounterOffer\>  |
| = {}): CounterOffer {                                                 |
|                                                                       |
| return createCounterOffer({ status: CounterOfferStatus.WITHDRAWN,     |
| withdrawnAt: new Date(), \...overrides });                            |
|                                                                       |
| }                                                                     |
|                                                                       |
| export function createExpiredCO(daysAgo = 1, overrides:               |
| Partial\<CounterOffer\> = {}): CounterOffer {                         |
|                                                                       |
| const past = new Date(); past.setDate(past.getDate() - daysAgo);      |
|                                                                       |
| return createCounterOffer({ status: CounterOfferStatus.EXPIRED,       |
| expiresAt: past, expiredAt: past, \...overrides });                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| export function createSupersededCO(overrides: Partial\<CounterOffer\> |
| = {}): CounterOffer {                                                 |
|                                                                       |
| return createCounterOffer({ status: CounterOfferStatus.SUPERSEDED,    |
| supersededAt: new Date(), \...overrides });                           |
|                                                                       |
| }                                                                     |
|                                                                       |
| function futureDate(days: number): string {                           |
|                                                                       |
| const d = new Date(); d.setDate(d.getDate() + days); return           |
| d.toISOString().split(\'T\')\[0\];                                    |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 6 Offer History Factory --- offer-history.factory.ts**         |
|                                                                       |
| Creates OfferHistoryEvent records for tests                           |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/test/fixtures/offer-history.factory.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { OfferHistoryEvent, OfferTermsSnapshot } from                 |
| \'../../src/offer-history/entities/offer-history-event.entity\';      |
|                                                                       |
| import { WorkScheduleType } from                                      |
| \'../../src/offers/enums/work-schedule-type.enum\';                   |
|                                                                       |
| import { SEED_OFFERS } from \'../../seeds/constants/seed-ids\';       |
|                                                                       |
| const DEFAULT_TERMS: OfferTermsSnapshot = {                           |
|                                                                       |
| rate: 95,                                                             |
|                                                                       |
| currencyCode: \'USD\',                                                |
|                                                                       |
| durationMonths: 6,                                                    |
|                                                                       |
| workSchedule: { type: WorkScheduleType.FULL_TIME },                   |
|                                                                       |
| startDate: futureDate(30),                                            |
|                                                                       |
| message: null,                                                        |
|                                                                       |
| };                                                                    |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* createHistoryEvent --- Factory for OfferHistoryEvent records.      |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Defaults to an offer.created event by CLIENT on                    |
| SEED_OFFERS.PENDING.                                                  |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export function createHistoryEvent(overrides:                         |
| Partial\<OfferHistoryEvent\> = {}): OfferHistoryEvent {               |
|                                                                       |
| return {                                                              |
|                                                                       |
| id: overrides.id ?? crypto.randomUUID(),                              |
|                                                                       |
| offerId: overrides.offerId ?? SEED_OFFERS.PENDING,                    |
|                                                                       |
| counterOfferId: overrides.counterOfferId ?? null,                     |
|                                                                       |
| eventType: overrides.eventType ?? \'offer.created\',                  |
|                                                                       |
| actor: overrides.actor ?? \'CLIENT\',                                 |
|                                                                       |
| actorId: overrides.actorId ?? null,                                   |
|                                                                       |
| terms: overrides.terms ?? { \...DEFAULT_TERMS },                      |
|                                                                       |
| offer: overrides.offer ?? undefined as any,                           |
|                                                                       |
| counterOffer: overrides.counterOffer ?? null,                         |
|                                                                       |
| createdAt: overrides.createdAt ?? new Date(),                         |
|                                                                       |
| \...overrides,                                                        |
|                                                                       |
| } as OfferHistoryEvent;                                               |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Event-specific convenience factories                               |
|                                                                       |
| export function createOfferCreatedEvent(overrides:                    |
| Partial\<OfferHistoryEvent\> = {}): OfferHistoryEvent {               |
|                                                                       |
| return createHistoryEvent({ eventType: \'offer.created\', actor:      |
| \'CLIENT\', \...overrides });                                         |
|                                                                       |
| }                                                                     |
|                                                                       |
| export function createOfferEditedEvent(overrides:                     |
| Partial\<OfferHistoryEvent\> = {}): OfferHistoryEvent {               |
|                                                                       |
| return createHistoryEvent({ eventType: \'offer.edited\', actor:       |
| \'CLIENT\', \...overrides });                                         |
|                                                                       |
| }                                                                     |
|                                                                       |
| export function createOfferAcceptedEvent(overrides:                   |
| Partial\<OfferHistoryEvent\> = {}): OfferHistoryEvent {               |
|                                                                       |
| return createHistoryEvent({ eventType: \'offer.accepted\', actor:     |
| \'TALENT\', \...overrides });                                         |
|                                                                       |
| }                                                                     |
|                                                                       |
| export function createOfferDeclinedEvent(overrides:                   |
| Partial\<OfferHistoryEvent\> = {}): OfferHistoryEvent {               |
|                                                                       |
| return createHistoryEvent({ eventType: \'offer.declined\', actor:     |
| \'TALENT\', \...overrides });                                         |
|                                                                       |
| }                                                                     |
|                                                                       |
| export function createOfferCounteredEvent(overrides:                  |
| Partial\<OfferHistoryEvent\> = {}): OfferHistoryEvent {               |
|                                                                       |
| return createHistoryEvent({ eventType: \'offer.countered\', actor:    |
| \'TALENT\', \...overrides });                                         |
|                                                                       |
| }                                                                     |
|                                                                       |
| export function createOfferExpiredEvent(overrides:                    |
| Partial\<OfferHistoryEvent\> = {}): OfferHistoryEvent {               |
|                                                                       |
| return createHistoryEvent({ eventType: \'offer.expired\', actor:      |
| \'SYSTEM\', actorId: null, \...overrides });                          |
|                                                                       |
| }                                                                     |
|                                                                       |
| export function createOfferWithdrawnEvent(overrides:                  |
| Partial\<OfferHistoryEvent\> = {}): OfferHistoryEvent {               |
|                                                                       |
| return createHistoryEvent({ eventType: \'offer.withdrawn\', actor:    |
| \'CLIENT\', \...overrides });                                         |
|                                                                       |
| }                                                                     |
|                                                                       |
| export function createCounterEditedEvent(overrides:                   |
| Partial\<OfferHistoryEvent\> = {}): OfferHistoryEvent {               |
|                                                                       |
| return createHistoryEvent({ eventType: \'offer.counter_edited\',      |
| actor: \'TALENT\', \...overrides });                                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| function futureDate(days: number): string {                           |
|                                                                       |
| const d = new Date(); d.setDate(d.getDate() + days); return           |
| d.toISOString().split(\'T\')\[0\];                                    |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 7 Outbox Factory --- outbox.factory.ts**                       |
|                                                                       |
| Creates OutboxEvent records for tests                                 |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/test/fixtures/outbox.factory.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { OutboxEvent, OutboxEventStatus } from                        |
| \'../../src/outbox/entities/outbox-event.entity\';                    |
|                                                                       |
| import { SEED_OFFERS } from \'../../seeds/constants/seed-ids\';       |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* createOutboxEvent --- Factory for OutboxEvent records.             |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Defaults to a PENDING offer.created event on SEED_OFFERS.PENDING.  |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export function createOutboxEvent(overrides: Partial\<OutboxEvent\> = |
| {}): OutboxEvent {                                                    |
|                                                                       |
| const now = new Date();                                               |
|                                                                       |
| return {                                                              |
|                                                                       |
| id: overrides.id ?? crypto.randomUUID(),                              |
|                                                                       |
| aggregateId: overrides.aggregateId ?? SEED_OFFERS.PENDING,            |
|                                                                       |
| aggregateType: overrides.aggregateType ?? \'offer\',                  |
|                                                                       |
| eventType: overrides.eventType ?? \'offer.created\',                  |
|                                                                       |
| exchange: overrides.exchange ?? \'marketeq.offers\',                  |
|                                                                       |
| routingKey: overrides.routingKey ?? \'offer.created\',                |
|                                                                       |
| payload: overrides.payload ?? {                                       |
|                                                                       |
| offerId: SEED_OFFERS.PENDING, event: \'offer.created\',               |
|                                                                       |
| },                                                                    |
|                                                                       |
| status: overrides.status ?? OutboxEventStatus.PENDING,                |
|                                                                       |
| retryCount: overrides.retryCount ?? 0,                                |
|                                                                       |
| lastError: overrides.lastError ?? null,                               |
|                                                                       |
| scheduledAt: overrides.scheduledAt ?? now,                            |
|                                                                       |
| processedAt: overrides.processedAt ?? null,                           |
|                                                                       |
| createdAt: overrides.createdAt ?? now,                                |
|                                                                       |
| updatedAt: overrides.updatedAt ?? now,                                |
|                                                                       |
| \...overrides,                                                        |
|                                                                       |
| } as OutboxEvent;                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\* Creates a FAILED outbox event (retry_count = 10, max retries    |
| exhausted). \*/                                                       |
|                                                                       |
| export function createFailedOutboxEvent(overrides:                    |
| Partial\<OutboxEvent\> = {}): OutboxEvent {                           |
|                                                                       |
| return createOutboxEvent({                                            |
|                                                                       |
| status: OutboxEventStatus.FAILED,                                     |
|                                                                       |
| retryCount: 10,                                                       |
|                                                                       |
| lastError: \'AMQP connection refused after 10 attempts.\',            |
|                                                                       |
| \...overrides,                                                        |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\* Creates a PROCESSING outbox event (in-flight). \*/              |
|                                                                       |
| export function createProcessingOutboxEvent(overrides:                |
| Partial\<OutboxEvent\> = {}): OutboxEvent {                           |
|                                                                       |
| return createOutboxEvent({ status: OutboxEventStatus.PROCESSING,      |
| \...overrides });                                                     |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 8 Offer Chain Fixtures --- offer-chain.fixture.ts**            |
|                                                                       |
| Pre-built multi-round negotiation chains                              |
+-----------------------------------------------------------------------+

The chain fixtures provide complete multi-entity scenarios that require
multiple related records. Instead of assembling these manually in each
test, import the pre-built chain. Each chain returns all related
entities in a single object.

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/test/fixtures/offer-chain.fixture.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { Offer } from \'../../src/offers/entities/offer.entity\';     |
|                                                                       |
| import { CounterOffer } from                                          |
| \'../../src/counter-offers/entities/counter-offer.entity\';           |
|                                                                       |
| import { OfferHistoryEvent } from                                     |
| \'../../src/offer-history/entities/offer-history-event.entity\';      |
|                                                                       |
| import { OfferStatus } from                                           |
| \'../../src/offers/enums/offer-status.enum\';                         |
|                                                                       |
| import { CounterOfferStatus } from                                    |
| \'../../src/counter-offers/enums/counter-offer-status.enum\';         |
|                                                                       |
| import { SEED_USERS, SEED_LISTINGS } from                             |
| \'../../seeds/constants/seed-ids\';                                   |
|                                                                       |
| import { createOffer } from \'./offer.factory\';                      |
|                                                                       |
| import { createCounterOffer } from \'./counter-offer.factory\';       |
|                                                                       |
| import { createHistoryEvent } from \'./offer-history.factory\';       |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* Chain 1: Single round counter offer (most common test scenario)    |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Offer: COUNTERED (PENDING before the CO)                           |
|                                                                       |
| \* Counter offer: PENDING (Talent submitted)                          |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Use this to test: viewing a counter offer, editing a CO,           |
|                                                                       |
| \* accepting a CO, declining a CO, withdrawing a CO.                  |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export interface SingleRoundChain {                                   |
|                                                                       |
| offer: Offer;                                                         |
|                                                                       |
| counterOffer: CounterOffer;                                           |
|                                                                       |
| }                                                                     |
|                                                                       |
| export function buildSingleRoundChain(overrides: {                    |
|                                                                       |
| offerId?: string;                                                     |
|                                                                       |
| clientId?: string;                                                    |
|                                                                       |
| talentId?: string;                                                    |
|                                                                       |
| } = {}): SingleRoundChain {                                           |
|                                                                       |
| const offerId = overrides.offerId ?? crypto.randomUUID();             |
|                                                                       |
| const clientId = overrides.clientId ?? SEED_USERS.CLIENT_A;           |
|                                                                       |
| const talentId = overrides.talentId ?? SEED_USERS.TALENT_X;           |
|                                                                       |
| const offer = createOffer({                                           |
|                                                                       |
| id: offerId, clientId, talentId,                                      |
|                                                                       |
| status: OfferStatus.COUNTERED,                                        |
|                                                                       |
| jobListingId: SEED_LISTINGS.PROJECT_ALPHA,                            |
|                                                                       |
| rate: 80,                                                             |
|                                                                       |
| });                                                                   |
|                                                                       |
| const counterOffer = createCounterOffer({                             |
|                                                                       |
| offerId,                                                              |
|                                                                       |
| submittedBy: \'TALENT\',                                              |
|                                                                       |
| submittedById: talentId,                                              |
|                                                                       |
| status: CounterOfferStatus.PENDING,                                   |
|                                                                       |
| rate: 100, // Talent is asking for more                               |
|                                                                       |
| });                                                                   |
|                                                                       |
| return { offer, counterOffer };                                       |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* Chain 2: Three-round negotiation                                   |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Round 1: TALENT submits CO at \$130 → SUPERSEDED                   |
|                                                                       |
| \* Round 2: CLIENT responds at \$115 → SUPERSEDED                     |
|                                                                       |
| \* Round 3: TALENT submits CO at \$122 → PENDING (current active)     |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Offer is COUNTERED.                                                |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Use this to test: offer history timeline, multi-round display,     |
|                                                                       |
| \* supersede logic, active CO identification.                         |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export interface ThreeRoundChain {                                    |
|                                                                       |
| offer: Offer;                                                         |
|                                                                       |
| round1: CounterOffer; // SUPERSEDED                                   |
|                                                                       |
| round2: CounterOffer; // SUPERSEDED                                   |
|                                                                       |
| round3: CounterOffer; // PENDING (active)                             |
|                                                                       |
| history: OfferHistoryEvent\[\];                                       |
|                                                                       |
| }                                                                     |
|                                                                       |
| export function buildThreeRoundChain(overrides: {                     |
|                                                                       |
| offerId?: string;                                                     |
|                                                                       |
| clientId?: string;                                                    |
|                                                                       |
| talentId?: string;                                                    |
|                                                                       |
| } = {}): ThreeRoundChain {                                            |
|                                                                       |
| const offerId = overrides.offerId ?? crypto.randomUUID();             |
|                                                                       |
| const clientId = overrides.clientId ?? SEED_USERS.CLIENT_A;           |
|                                                                       |
| const talentId = overrides.talentId ?? SEED_USERS.TALENT_X;           |
|                                                                       |
| const now = new Date();                                               |
|                                                                       |
| function daysAgo(n: number) { const d = new Date();                   |
| d.setDate(d.getDate()-n); return d; }                                 |
|                                                                       |
| const offer = createOffer({                                           |
|                                                                       |
| id: offerId, clientId, talentId,                                      |
|                                                                       |
| status: OfferStatus.COUNTERED,                                        |
|                                                                       |
| rate: 120,                                                            |
|                                                                       |
| createdAt: daysAgo(10),                                               |
|                                                                       |
| });                                                                   |
|                                                                       |
| const round1Id = crypto.randomUUID();                                 |
|                                                                       |
| const round2Id = crypto.randomUUID();                                 |
|                                                                       |
| const round3Id = crypto.randomUUID();                                 |
|                                                                       |
| const round1 = createCounterOffer({                                   |
|                                                                       |
| id: round1Id, offerId,                                                |
|                                                                       |
| submittedBy: \'TALENT\', submittedById: talentId,                     |
|                                                                       |
| status: CounterOfferStatus.SUPERSEDED,                                |
|                                                                       |
| rate: 130,                                                            |
|                                                                       |
| message: \'\$130/hr is my rate.\',                                    |
|                                                                       |
| createdAt: daysAgo(8),                                                |
|                                                                       |
| supersededAt: daysAgo(6),                                             |
|                                                                       |
| });                                                                   |
|                                                                       |
| const round2 = createCounterOffer({                                   |
|                                                                       |
| id: round2Id, offerId,                                                |
|                                                                       |
| submittedBy: \'CLIENT\', submittedById: clientId,                     |
|                                                                       |
| status: CounterOfferStatus.SUPERSEDED,                                |
|                                                                       |
| rate: 115,                                                            |
|                                                                       |
| message: \'\$115 is our maximum.\',                                   |
|                                                                       |
| createdAt: daysAgo(6),                                                |
|                                                                       |
| supersededAt: daysAgo(3),                                             |
|                                                                       |
| });                                                                   |
|                                                                       |
| const round3 = createCounterOffer({                                   |
|                                                                       |
| id: round3Id, offerId,                                                |
|                                                                       |
| submittedBy: \'TALENT\', submittedById: talentId,                     |
|                                                                       |
| status: CounterOfferStatus.PENDING,                                   |
|                                                                       |
| rate: 122,                                                            |
|                                                                       |
| message: \'I can meet at \$122.\',                                    |
|                                                                       |
| createdAt: daysAgo(3),                                                |
|                                                                       |
| });                                                                   |
|                                                                       |
| const history: OfferHistoryEvent\[\] = \[                             |
|                                                                       |
| createHistoryEvent({ offerId, eventType: \'offer.created\', actor:    |
| \'CLIENT\', actorId: clientId, createdAt: daysAgo(10) }),             |
|                                                                       |
| createHistoryEvent({ offerId, counterOfferId: round1Id, eventType:    |
| \'offer.countered\', actor: \'TALENT\', actorId: talentId, createdAt: |
| daysAgo(8) }),                                                        |
|                                                                       |
| createHistoryEvent({ offerId, counterOfferId: round2Id, eventType:    |
| \'offer.counter_declined\', actor: \'TALENT\', actorId: talentId,     |
| createdAt: daysAgo(6) }),                                             |
|                                                                       |
| createHistoryEvent({ offerId, counterOfferId: round2Id, eventType:    |
| \'offer.countered\', actor: \'CLIENT\', actorId: clientId, createdAt: |
| daysAgo(6) }),                                                        |
|                                                                       |
| createHistoryEvent({ offerId, counterOfferId: round3Id, eventType:    |
| \'offer.counter_declined\', actor: \'CLIENT\', actorId: clientId,     |
| createdAt: daysAgo(3) }),                                             |
|                                                                       |
| createHistoryEvent({ offerId, counterOfferId: round3Id, eventType:    |
| \'offer.countered\', actor: \'TALENT\', actorId: talentId, createdAt: |
| daysAgo(3) }),                                                        |
|                                                                       |
| \];                                                                   |
|                                                                       |
| return { offer, round1, round2, round3, history };                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* Chain 3: Completed negotiation (counter offer accepted)            |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Offer: ACCEPTED                                                    |
|                                                                       |
| \* Counter offer: ACCEPTED (the counter offer that was accepted)      |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Use this to test: accepted state display, contracts-service event  |
| payload,                                                              |
|                                                                       |
| \* offer history showing the full accepted chain.                     |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export interface AcceptedChain {                                      |
|                                                                       |
| offer: Offer;                                                         |
|                                                                       |
| counterOffer: CounterOffer;                                           |
|                                                                       |
| }                                                                     |
|                                                                       |
| export function buildAcceptedChain(overrides: {                       |
|                                                                       |
| offerId?: string;                                                     |
|                                                                       |
| clientId?: string;                                                    |
|                                                                       |
| talentId?: string;                                                    |
|                                                                       |
| } = {}): AcceptedChain {                                              |
|                                                                       |
| const offerId = overrides.offerId ?? crypto.randomUUID();             |
|                                                                       |
| const clientId = overrides.clientId ?? SEED_USERS.CLIENT_A;           |
|                                                                       |
| const talentId = overrides.talentId ?? SEED_USERS.TALENT_X;           |
|                                                                       |
| const coId = crypto.randomUUID();                                     |
|                                                                       |
| const acceptedAt = new Date();                                        |
|                                                                       |
| const offer = createOffer({                                           |
|                                                                       |
| id: offerId, clientId, talentId,                                      |
|                                                                       |
| status: OfferStatus.ACCEPTED,                                         |
|                                                                       |
| rate: 80, // Original rate                                            |
|                                                                       |
| acceptedAt,                                                           |
|                                                                       |
| });                                                                   |
|                                                                       |
| const counterOffer = createCounterOffer({                             |
|                                                                       |
| id: coId, offerId,                                                    |
|                                                                       |
| submittedBy: \'TALENT\', submittedById: talentId,                     |
|                                                                       |
| status: CounterOfferStatus.ACCEPTED,                                  |
|                                                                       |
| rate: 100, // The counter rate that was accepted                      |
|                                                                       |
| acceptedAt,                                                           |
|                                                                       |
| });                                                                   |
|                                                                       |
| return { offer, counterOffer };                                       |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* Chain 4: Expired with counter offer restore                        |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Simulates: CO expires, parent offer restored to PENDING.           |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Offer: PENDING (restored after CO expired)                         |
|                                                                       |
| \* Counter offer: EXPIRED                                             |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export interface ExpiredCOChain {                                     |
|                                                                       |
| offer: Offer;                                                         |
|                                                                       |
| counterOffer: CounterOffer;                                           |
|                                                                       |
| }                                                                     |
|                                                                       |
| export function buildExpiredCOChain(overrides: {                      |
|                                                                       |
| offerId?: string;                                                     |
|                                                                       |
| } = {}): ExpiredCOChain {                                             |
|                                                                       |
| const offerId = overrides.offerId ?? crypto.randomUUID();             |
|                                                                       |
| const pastDate = new Date(); pastDate.setDate(pastDate.getDate() -    |
| 1);                                                                   |
|                                                                       |
| const offer = createOffer({                                           |
|                                                                       |
| id: offerId,                                                          |
|                                                                       |
| status: OfferStatus.PENDING, // Restored after CO expired             |
|                                                                       |
| rate: 80,                                                             |
|                                                                       |
| });                                                                   |
|                                                                       |
| const counterOffer = createCounterOffer({                             |
|                                                                       |
| offerId,                                                              |
|                                                                       |
| submittedBy: \'TALENT\',                                              |
|                                                                       |
| status: CounterOfferStatus.EXPIRED,                                   |
|                                                                       |
| expiresAt: pastDate,                                                  |
|                                                                       |
| expiredAt: pastDate,                                                  |
|                                                                       |
| rate: 100,                                                            |
|                                                                       |
| });                                                                   |
|                                                                       |
| return { offer, counterOffer };                                       |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 9 Add Seed Scripts to package.json**                           |
|                                                                       |
| npm run shortcuts for seed operations                                 |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/package.json --- add to \"scripts\"**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| // Add these to the \"scripts\" section:                              |
|                                                                       |
| \"seed:run\": \"ts-node -r tsconfig-paths/register                    |
| apps/offer-service/seeds/seed.ts\",                                   |
|                                                                       |
| \"seed:reset\": \"ts-node -r tsconfig-paths/register                  |
| apps/offer-service/seeds/reset.ts\",                                  |
|                                                                       |
| \"seed:fresh\": \"npm run seed:reset \--workspace=apps/offer-service  |
| && npm run seed:run \--workspace=apps/offer-service\"                 |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Usage:                                                             |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Insert all seed data (idempotent --- safe to run multiple times):  |
|                                                                       |
| npm run seed:run \--workspace=apps/offer-service                      |
|                                                                       |
| // Delete all seed data (tables remain, data cleared):                |
|                                                                       |
| npm run seed:reset \--workspace=apps/offer-service                    |
|                                                                       |
| // Full reset and re-seed (wipe then repopulate):                     |
|                                                                       |
| npm run seed:fresh \--workspace=apps/offer-service                    |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Prerequisites before running seeds:                                |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // 1. DB is running: docker-compose up -d postgres (or your local     |
| setup)                                                                |
|                                                                       |
| // 2. Migrations have run: npm run migration:run                      |
| \--workspace=apps/offer-service                                       |
|                                                                       |
| // 3. NODE_ENV=development is set in .env                             |
|                                                                       |
| // 4. All DB environment variables are correct in .env                |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 10 Verification --- Confirm Seeds and Fixtures Work**          |
|                                                                       |
| Run these checks after setup                                          |
+-----------------------------------------------------------------------+

**Verify seeds were inserted**

+-----------------------------------------------------------------------+
| \# 1. Run the seeds                                                   |
|                                                                       |
| npm run seed:run \--workspace=apps/offer-service                      |
|                                                                       |
| \# Expected output:                                                   |
|                                                                       |
| \# \[seed\] Starting offer-service seed\...                           |
|                                                                       |
| \# \[seed\] Inserting offers\...                                      |
|                                                                       |
| \# \[seed\] Inserting counter offers\...                              |
|                                                                       |
| \# \[seed\] Seed complete.                                            |
|                                                                       |
| \# \[seed\] Summary:                                                  |
|                                                                       |
| \# Offers: 12                                                         |
|                                                                       |
| \# Counter offers: 4                                                  |
|                                                                       |
| \# 2. Verify in the database                                          |
|                                                                       |
| psql -h localhost -U postgres -d marketeq_dev -c \\                   |
|                                                                       |
| \"SELECT id, contract_title, status FROM offer_service.offers ORDER   |
| BY created_at;\"                                                      |
|                                                                       |
| \# Expected: 12 rows with various statuses                            |
|                                                                       |
| psql -h localhost -U postgres -d marketeq_dev -c \\                   |
|                                                                       |
| \"SELECT id, status, rate FROM offer_service.counter_offers ORDER BY  |
| created_at;\"                                                         |
|                                                                       |
| \# Expected: 4 rows (1 PENDING, 2 SUPERSEDED, 1 PENDING for           |
| multi-round)                                                          |
|                                                                       |
| \# 3. Verify idempotency (run again --- should not fail or duplicate) |
|                                                                       |
| npm run seed:run \--workspace=apps/offer-service                      |
|                                                                       |
| \# Expected: same output, same 12 + 4 rows (ON CONFLICT DO NOTHING)   |
|                                                                       |
| \# 4. Test the reset                                                  |
|                                                                       |
| npm run seed:reset \--workspace=apps/offer-service                    |
|                                                                       |
| psql -h localhost -U postgres -d marketeq_dev -c \\                   |
|                                                                       |
| \"SELECT COUNT(\*) FROM offer_service.offers;\"                       |
|                                                                       |
| \# Expected: 0                                                        |
+-----------------------------------------------------------------------+

**Verify factories in a unit test**

+-----------------------------------------------------------------------+
| // Example unit test using factories:                                 |
|                                                                       |
| import { createPendingOffer, createExpiredOffer } from                |
| \'../../test/fixtures/offer.factory\';                                |
|                                                                       |
| import { buildSingleRoundChain } from                                 |
| \'../../test/fixtures/offer-chain.fixture\';                          |
|                                                                       |
| import { OfferStatus } from                                           |
| \'../../src/offers/enums/offer-status.enum\';                         |
|                                                                       |
| describe(\'OffersService\', () =\> {                                  |
|                                                                       |
| it(\'returns a pending offer\', () =\> {                              |
|                                                                       |
| const offer = createPendingOffer({ rate: 85 });                       |
|                                                                       |
| expect(offer.status).toBe(OfferStatus.PENDING);                       |
|                                                                       |
| expect(offer.rate).toBe(85);                                          |
|                                                                       |
| expect(offer.acceptedAt).toBeNull();                                  |
|                                                                       |
| });                                                                   |
|                                                                       |
| it(\'builds a counter offer chain\', () =\> {                         |
|                                                                       |
| const { offer, counterOffer } = buildSingleRoundChain();              |
|                                                                       |
| expect(offer.status).toBe(OfferStatus.COUNTERED);                     |
|                                                                       |
| expect(counterOffer.offerId).toBe(offer.id);                          |
|                                                                       |
| expect(counterOffer.rate).toBeGreaterThan(offer.rate); // Talent      |
| asking more                                                           |
|                                                                       |
| });                                                                   |
|                                                                       |
| it(\'expired offer has past dates\', () =\> {                         |
|                                                                       |
| const offer = createExpiredOffer(10); // 10 days ago                  |
|                                                                       |
| expect(offer.status).toBe(OfferStatus.EXPIRED);                       |
|                                                                       |
| expect(offer.expiredAt!.getTime()).toBeLessThan(Date.now());          |
|                                                                       |
| });                                                                   |
|                                                                       |
| });                                                                   |
|                                                                       |
| // Run tests:                                                         |
|                                                                       |
| npm run test \--workspace=apps/offer-service                          |
|                                                                       |
| \# All tests using factories should pass.                             |
|                                                                       |
| \# No database connection needed for unit tests using factories.      |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| If seed:run fails with \"Cannot find module\": ts-node cannot find    |
| the seed file.                                                        |
|                                                                       |
| Check the path in the package.json script matches the actual file     |
| location.                                                             |
|                                                                       |
| Ensure tsconfig.json in offer-service includes the seeds/ directory.  |
|                                                                       |
| If seed:run fails with \"relation offer_service.offers does not       |
| exist\":                                                              |
|                                                                       |
| Migrations have not been run. Run: npm run migration:run first.       |
|                                                                       |
| If seed:run succeeds but the database has 0 rows:                     |
|                                                                       |
| The INSERT \... ON CONFLICT may be silently failing due to a          |
| constraint.                                                           |
|                                                                       |
| Check that the SEED IDs are valid UUID v4 format.                     |
|                                                                       |
| Check that the status values match the CHECK constraints in the       |
| schema.                                                               |
|                                                                       |
| If factories produce TypeScript errors:                               |
|                                                                       |
| The Offer entity interface may have changed. Check that all required  |
| fields                                                                |
|                                                                       |
| from the entity are present in the factory defaults object.           |
|                                                                       |
| Run: npx tsc \--noEmit \--project apps/offer-service/tsconfig.json to |
| check types.                                                          |
+-----------------------------------------------------------------------+
