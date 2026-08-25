**OS-31**

**Offer Service --- Unit & Integration Test Plan**

**Framework:** Jest **Coverage target:** 80% statements (100% on state
machine + business logic) **Test DB:** offer_service_test schema

This document defines what must be tested, how to set up the test
environment, the mocking strategy for RabbitMQ and Ably, the integration
test database setup, and ready-to-run test examples. Every test file
path follows the NestJS convention: \*.spec.ts alongside its source
file.

**File Map**

  ---------- ---------------------------------------------------------------------- ----------------------
  **Step**   **File Path**                                                          **Purpose**

  **1**      apps/offer-service/jest.config.ts                                      Jest configuration for
                                                                                    offer-service

  **2**      apps/offer-service/test/jest.setup.ts                                  Global test setup and
                                                                                    teardown

  **3**      apps/offer-service/test/test-db.helper.ts                              Test database
                                                                                    connection and
                                                                                    migration runner

  **4**      apps/offer-service/test/mocks/outbox.mock.ts                           Mock OutboxService for
                                                                                    unit tests

  **5**      apps/offer-service/test/mocks/ably.mock.ts                             Mock AblyService for
                                                                                    unit tests

  **6**      apps/offer-service/src/offers/offer-state-machine.spec.ts              Unit tests: state
                                                                                    machine, guards, rate
                                                                                    warning

  **7**      apps/offer-service/src/offers/offers.service.spec.ts                   Unit tests:
                                                                                    OffersService
                                                                                    transitions

  **8**      apps/offer-service/src/counter-offers/counter-offers.service.spec.ts   Unit tests:
                                                                                    CounterOffersService
                                                                                    transitions

  **9**      apps/offer-service/test/integration/offers.integration.spec.ts         Integration tests:
                                                                                    full stack with test
                                                                                    DB
  ---------- ---------------------------------------------------------------------- ----------------------

+-----------------------------------------------------------------------+
| **Overview What Must Be Tested --- Coverage Requirements**            |
|                                                                       |
| Mandatory test coverage by layer                                      |
+-----------------------------------------------------------------------+

The test pyramid for offer-service has three levels. Unit tests (fast,
no I/O) are the majority. Integration tests (real DB, mocked
RabbitMQ/Ably) cover the full service stack. E2E tests (real HTTP) are
out of scope for this document.

  ---------------------------- -------------- ----------------- -----------------------------
  **What to test**             **Coverage**   **Type**          **Reason**

  OfferStateMachine: all       **100%**       **Unit**          Pure logic --- no I/O. Every
  transitions, guards,                                          edge case must be verified.
  computeRateWarning                                            

  TTL helpers:                 **100%**       **Unit**          Pure functions. Edge cases:
  calculateExpiresAt,                                           exact boundary at 30 days.
  isWithinExtensionWindow,                                      
  hoursUntilExpiry                                              

  Payload builders: all 14     **100%**       **Unit**          Verify every field is set
  builder functions                                             correctly including edge
                                                                cases (null declineReason,
                                                                parentOfferStatus on expired
                                                                CO).

  OffersService: create, edit, **90%**        **Unit**          Mock repo, outbox, ably.
  accept, decline, withdraw,                                    Verify CAS query, outbox
  expire, resend                                                write, ably publish call.

  CounterOffersService:        **90%**        **Unit**          Mock repo, outbox, ably.
  create, edit, accept,                                         Verify restore-parent logic
  decline, withdraw, expire                                     in each terminal CO
                                                                transition.

  OutboxProcessor: retry,      **90%**        **Unit**          Mock publisher and repo.
  backoff schedule, FAILED                                      Verify backoff math and
  path, alert                                                   FAILED flag.

  WarningProcessor:            **80%**        **Unit**          Verify no double-send on same
  warning_sent_at                                               offer.
  deduplication                                                 

  ActiveOfferConstraint:       **80%**        **Unit**          PENDING and COUNTERED both
  checkActiveOfferConstraint                                    block. Terminal statuses do
                                                                not.

  Full offer lifecycle: create **Key flows**  **Integration**   Verify DB state, outbox
  → counter offer → accept                                      events, and restore-parent
  (real DB)                                                     logic end-to-end.

  CAS race condition: two      **Race**       **Integration**   Both requests hit the DB.
  concurrent accepts                                            Exactly one succeeds. The
                                                                other gets 409.

  Expiry processor (real DB,   **Key flow**   **Integration**   Set expires_at to past. Run
  fast clock)                                                   expiry. Verify status, outbox
                                                                event.
  ---------------------------- -------------- ----------------- -----------------------------

+-----------------------------------------------------------------------+
| Why RabbitMQ is NOT mocked via a real broker in unit tests:           |
|                                                                       |
| The outbox pattern decouples offer-service from RabbitMQ at the       |
| service layer.                                                        |
|                                                                       |
| Service methods write to the outbox table (or mock). They do NOT call |
| the broker.                                                           |
|                                                                       |
| Unit tests mock outboxService.create() to verify the correct event is |
| queued.                                                               |
|                                                                       |
| Integration tests verify the outbox row was written to the real test  |
| DB.                                                                   |
|                                                                       |
| RabbitMQ publisher tests are in OutboxProcessor unit tests where the  |
| publisher is mocked.                                                  |
|                                                                       |
| Why Ably is mocked:                                                   |
|                                                                       |
| AblyService.publish() is fire-and-forget in service methods.          |
|                                                                       |
| Tests verify it was called with the correct arguments, not that Ably  |
| received the message.                                                 |
|                                                                       |
| The AblyService mock from OS-24 is reused for backend unit tests.     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 1 Jest Configuration --- jest.config.ts**                      |
|                                                                       |
| Separate configs for unit and integration tests                       |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/jest.config.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import type { Config } from \'jest\';                                 |
|                                                                       |
| const config: Config = {                                              |
|                                                                       |
| preset: \'ts-jest\',                                                  |
|                                                                       |
| testEnvironment: \'node\',                                            |
|                                                                       |
| rootDir: \'.\',                                                       |
|                                                                       |
| // Separate test patterns for unit vs integration:                    |
|                                                                       |
| // npm run test -\> unit tests only (fast)                            |
|                                                                       |
| // npm run test:int -\> integration tests only (needs DB)             |
|                                                                       |
| // npm run test:all -\> both                                          |
|                                                                       |
| testMatch: process.env.TEST_TYPE === \'integration\'                  |
|                                                                       |
| ? \[\'\<rootDir\>/test/integration/\*\*/\*.spec.ts\'\]                |
|                                                                       |
| : \[\'\<rootDir\>/src/\*\*/\*.spec.ts\'\],                            |
|                                                                       |
| // Module paths that match tsconfig.json                              |
|                                                                       |
| moduleNameMapper: {                                                   |
|                                                                       |
| \'\^@app/(.\*)\$\': \'\<rootDir\>/src/\$1\',                          |
|                                                                       |
| },                                                                    |
|                                                                       |
| // Global setup file (DB migrations for integration tests)            |
|                                                                       |
| globalSetup: \'\<rootDir\>/test/jest.setup.ts\',                      |
|                                                                       |
| globalTeardown: \'\<rootDir\>/test/jest.teardown.ts\',                |
|                                                                       |
| // Coverage configuration                                             |
|                                                                       |
| collectCoverageFrom: \[                                               |
|                                                                       |
| \'src/\*\*/\*.ts\',                                                   |
|                                                                       |
| \'!src/\*\*/\*.module.ts\', // Module files are wiring only           |
|                                                                       |
| \'!src/\*\*/\*.dto.ts\', // DTOs are covered by validation tests      |
|                                                                       |
| \'!src/main.ts\',                                                     |
|                                                                       |
| \'!src/\*\*/\*.entity.ts\', // Entities are covered by integration    |
| tests                                                                 |
|                                                                       |
| \],                                                                   |
|                                                                       |
| coverageDirectory: \'coverage\',                                      |
|                                                                       |
| coverageThresholds: {                                                 |
|                                                                       |
| global: {                                                             |
|                                                                       |
| statements: 80,                                                       |
|                                                                       |
| branches: 75,                                                         |
|                                                                       |
| functions: 80,                                                        |
|                                                                       |
| lines: 80,                                                            |
|                                                                       |
| },                                                                    |
|                                                                       |
| // Specific files that require 100% coverage:                         |
|                                                                       |
| \'./src/offers/offer-state-machine.ts\': {                            |
|                                                                       |
| statements: 100,                                                      |
|                                                                       |
| branches: 100,                                                        |
|                                                                       |
| functions: 100,                                                       |
|                                                                       |
| lines: 100,                                                           |
|                                                                       |
| },                                                                    |
|                                                                       |
| \'./src/scheduler/ttl.helper.ts\': {                                  |
|                                                                       |
| statements: 100, branches: 100, functions: 100, lines: 100,           |
|                                                                       |
| },                                                                    |
|                                                                       |
| },                                                                    |
|                                                                       |
| // ts-jest configuration                                              |
|                                                                       |
| transform: {                                                          |
|                                                                       |
| \'\^.+\\.ts\$\': \[\'ts-jest\', {                                     |
|                                                                       |
| tsconfig: \'tsconfig.json\',                                          |
|                                                                       |
| }\],                                                                  |
|                                                                       |
| },                                                                    |
|                                                                       |
| // Test timeout: unit=5s, integration=30s                             |
|                                                                       |
| testTimeout: process.env.TEST_TYPE === \'integration\' ? 30000 :      |
| 5000,                                                                 |
|                                                                       |
| // Verbose output for CI                                              |
|                                                                       |
| verbose: true,                                                        |
|                                                                       |
| };                                                                    |
|                                                                       |
| export default config;                                                |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Add to apps/offer-service/package.json scripts:                    |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // \"test\": \"jest \--testPathPattern=\\.spec\\.ts\$                 |
| \--passWithNoTests\",                                                 |
|                                                                       |
| // \"test:watch\": \"jest \--testPathPattern=\\.spec\\.ts\$           |
| \--watch\",                                                           |
|                                                                       |
| // \"test:cov\": \"jest \--testPathPattern=\\.spec\\.ts\$             |
| \--coverage\",                                                        |
|                                                                       |
| // \"test:int\": \"TEST_TYPE=integration jest \--runInBand\",         |
|                                                                       |
| // \"test:all\": \"npm run test && npm run test:int\",                |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 2 Test Setup --- jest.setup.ts & jest.teardown.ts**            |
|                                                                       |
| Global setup and teardown for integration tests                       |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/test/jest.setup.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| /\*\*                                                                 |
|                                                                       |
| \* Global setup for integration tests.                                |
|                                                                       |
| \* Runs ONCE before all integration test suites.                      |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Creates the test schema and runs all migrations.                   |
|                                                                       |
| \* Unit tests skip this entirely (testMatch does not match            |
| integration files).                                                   |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| import { TestDbHelper } from \'./test-db.helper\';                    |
|                                                                       |
| export default async function globalSetup(): Promise\<void\> {        |
|                                                                       |
| if (process.env.TEST_TYPE !== \'integration\') return;                |
|                                                                       |
| console.log(\'\[test-setup\] Creating test database schema\...\');    |
|                                                                       |
| await TestDbHelper.createSchemaAndMigrate();                          |
|                                                                       |
| console.log(\'\[test-setup\] Test database ready.\');                 |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/test/jest.teardown.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { TestDbHelper } from \'./test-db.helper\';                    |
|                                                                       |
| export default async function globalTeardown(): Promise\<void\> {     |
|                                                                       |
| if (process.env.TEST_TYPE !== \'integration\') return;                |
|                                                                       |
| await TestDbHelper.close();                                           |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 3 Test Database Helper --- test-db.helper.ts**                 |
|                                                                       |
| Creates the test schema and runs migrations                           |
+-----------------------------------------------------------------------+

Integration tests run against a real PostgreSQL database using a
separate schema (offer_service_test). Migrations are run once before all
tests. Each test suite truncates tables between tests to ensure
isolation.

+-----------------------------------------------------------------------+
| Integration tests require a running PostgreSQL instance.              |
|                                                                       |
| Set TEST_DATABASE_URL in your .env.test file.                         |
|                                                                       |
| Format: postgresql://user:pass@localhost:5432/marketeq_test           |
|                                                                       |
| The helper creates the offer_service_test schema inside this          |
| database.                                                             |
|                                                                       |
| NEVER point TEST_DATABASE_URL at a production or staging database.    |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/test/test-db.helper.ts**

  -----------------------------------------------------------------------

+-------------------------------------------------------------------------------+
| import { DataSource } from \'typeorm\';                                       |
|                                                                               |
| import { join } from \'path\';                                                |
|                                                                               |
| import \* as dotenv from \'dotenv\';                                          |
|                                                                               |
| dotenv.config({ path: \'.env.test\' });                                       |
|                                                                               |
| let dataSource: DataSource;                                                   |
|                                                                               |
| export const TestDbHelper = {                                                 |
|                                                                               |
| async createSchemaAndMigrate(): Promise\<void\> {                             |
|                                                                               |
| dataSource = new DataSource({                                                 |
|                                                                               |
| type: \'postgres\',                                                           |
|                                                                               |
| url: process.env.TEST_DATABASE_URL,                                           |
|                                                                               |
| schema: \'offer_service_test\', // Separate schema from dev                   |
|                                                                               |
| synchronize: false,                                                           |
|                                                                               |
| entities: \[join(\_\_dirname, \'../src/\*\*/\*.entity.{ts,js}\')\],           |
|                                                                               |
| migrations: \[join(\_\_dirname, \'../migrations/\*.{ts,js}\')\],              |
|                                                                               |
| migrationsTableName: \'migrations\',                                          |
|                                                                               |
| logging: \[\'error\'\],                                                       |
|                                                                               |
| });                                                                           |
|                                                                               |
| await dataSource.initialize();                                                |
|                                                                               |
| // Create the test schema if it does not exist.                               |
|                                                                               |
| await dataSource.query(\'CREATE SCHEMA IF NOT EXISTS offer_service_test\');   |
|                                                                               |
| // Run all pending migrations.                                                |
|                                                                               |
| await dataSource.runMigrations({ transaction: \'each\' });                    |
|                                                                               |
| console.log(\'\[test-db\] Migrations applied to offer_service_test.\');       |
|                                                                               |
| },                                                                            |
|                                                                               |
| /\*\* Get the initialized DataSource for use in integration tests. \*/        |
|                                                                               |
| getDataSource(): DataSource {                                                 |
|                                                                               |
| if (!dataSource) throw new Error(\'TestDbHelper not initialized\');           |
|                                                                               |
| return dataSource;                                                            |
|                                                                               |
| },                                                                            |
|                                                                               |
| /\*\* Truncate all offer tables between tests. \*/                            |
|                                                                               |
| async truncateAll(): Promise\<void\> {                                        |
|                                                                               |
| await dataSource.query(\`                                                     |
|                                                                               |
| TRUNCATE                                                                      |
|                                                                               |
| offer_service_test.outbox,                                                    |
|                                                                               |
| offer_service_test.offer_history,                                             |
|                                                                               |
| offer_service_test.counter_offers,                                            |
|                                                                               |
| offer_service_test.offers                                                     |
|                                                                               |
| RESTART IDENTITY CASCADE                                                      |
|                                                                               |
| \`);                                                                          |
|                                                                               |
| },                                                                            |
|                                                                               |
| async close(): Promise\<void\> {                                              |
|                                                                               |
| if (dataSource?.isInitialized) await dataSource.destroy();                    |
|                                                                               |
| },                                                                            |
|                                                                               |
| };                                                                            |
|                                                                               |
| // ============================================================               |
|                                                                               |
| // .env.test file (add to project root, do NOT commit secrets):               |
|                                                                               |
| // ============================================================               |
|                                                                               |
| //                                                                            |
| TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/marketeq_test |
|                                                                               |
| // NODE_ENV=test                                                              |
|                                                                               |
| // DB_SCHEMA=offer_service_test                                               |
|                                                                               |
| // RABBITMQ_URL=amqp://guest:guest@localhost:5672 \# not actually used in     |
| tests                                                                         |
|                                                                               |
| // ABLY_API_KEY=test.key:secret \# not actually used in tests                 |
|                                                                               |
| // INTERNAL_SERVICE_SECRET=test-secret-32-chars-xx                            |
+-------------------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 4 Mocks --- outbox.mock.ts and ably.mock.ts**                  |
|                                                                       |
| Reusable mocks for unit tests                                         |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/test/mocks/outbox.mock.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { OutboxService } from \'../../src/outbox/outbox.service\';    |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* createMockOutboxService()                                          |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Returns a Jest mock of OutboxService for unit tests.               |
|                                                                       |
| \* All service methods that write events use outboxService.create().  |
|                                                                       |
| \* We verify it was called with the correct event type and payload.   |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export function createMockOutboxService():                            |
| jest.Mocked\<Pick\<OutboxService, \'create\'\>\> {                    |
|                                                                       |
| return {                                                              |
|                                                                       |
| create: jest.fn().mockResolvedValue(undefined),                       |
|                                                                       |
| };                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Usage in unit tests:                                               |
|                                                                       |
| // const mockOutbox = createMockOutboxService();                      |
|                                                                       |
| // // In the test:                                                    |
|                                                                       |
| // expect(mockOutbox.create).toHaveBeenCalledWith(                    |
|                                                                       |
| // expect.anything(), // EntityManager                                |
|                                                                       |
| // expect.objectContaining({ eventType: \'offer.accepted\' }),        |
|                                                                       |
| // );                                                                 |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/test/mocks/ably.mock.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { AblyService } from \'../../src/realtime/ably.service\';      |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* createMockAblyService()                                            |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Returns a Jest mock of AblyService for unit tests.                 |
|                                                                       |
| \* AblyService.publish() is fire-and-forget; we verify it was called  |
|                                                                       |
| \* with the correct offerId, offer state, and rateWarning flag.       |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export function createMockAblyService():                              |
| jest.Mocked\<Pick\<AblyService, \'publish\' \| \'createToken\' \|     |
| \'isReady\'\>\> {                                                     |
|                                                                       |
| return {                                                              |
|                                                                       |
| publish: jest.fn().mockResolvedValue(undefined),                      |
|                                                                       |
| createToken: jest.fn().mockResolvedValue({ token: \'mock-token\',     |
| expires: Date.now() + 3600000, issued: Date.now(), capability: \'{}\' |
| }),                                                                   |
|                                                                       |
| isReady: jest.fn().mockResolvedValue(true),                           |
|                                                                       |
| };                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Usage in unit tests:                                               |
|                                                                       |
| // const mockAbly = createMockAblyService();                          |
|                                                                       |
| // // After an accept():                                              |
|                                                                       |
| // expect(mockAbly.publish).toHaveBeenCalledWith(                     |
|                                                                       |
| // offerId, expect.objectContaining({ status: \'ACCEPTED\' }), null,  |
| false                                                                 |
|                                                                       |
| // );                                                                 |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 5 Unit Tests --- offer-state-machine.spec.ts**                 |
|                                                                       |
| 100% coverage on all transitions, guards, and rate warning            |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/offers/offer-state-machine.spec.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { OfferStateMachine, InvalidOfferTransitionException } from    |
| \'./offer-state-machine\';                                            |
|                                                                       |
| import { OfferStatus } from \'./enums/offer-status.enum\';            |
|                                                                       |
| import { CounterOfferStatus } from                                    |
| \'../counter-offers/enums/counter-offer-status.enum\';                |
|                                                                       |
| import { ForbiddenException } from \'@nestjs/common\';                |
|                                                                       |
| describe(\'OfferStateMachine\', () =\> {                              |
|                                                                       |
| describe(\'assertCanTransition (offer)\', () =\> {                    |
|                                                                       |
| it.each(\[                                                            |
|                                                                       |
| \[OfferStatus.PENDING, OfferStatus.ACCEPTED\],                        |
|                                                                       |
| \[OfferStatus.PENDING, OfferStatus.DECLINED\],                        |
|                                                                       |
| \[OfferStatus.PENDING, OfferStatus.WITHDRAWN\],                       |
|                                                                       |
| \[OfferStatus.PENDING, OfferStatus.EXPIRED\],                         |
|                                                                       |
| \[OfferStatus.COUNTERED, OfferStatus.PENDING\],                       |
|                                                                       |
| \[OfferStatus.COUNTERED, OfferStatus.ACCEPTED\],                      |
|                                                                       |
| \])(\`allows %s -\> %s\`, (from, to) =\> {                            |
|                                                                       |
| expect(() =\> OfferStateMachine.assertCanTransition(from,             |
| to)).not.toThrow();                                                   |
|                                                                       |
| });                                                                   |
|                                                                       |
| it.each(\[                                                            |
|                                                                       |
| \[OfferStatus.ACCEPTED, OfferStatus.DECLINED\],                       |
|                                                                       |
| \[OfferStatus.DECLINED, OfferStatus.PENDING\],                        |
|                                                                       |
| \[OfferStatus.WITHDRAWN, OfferStatus.PENDING\],                       |
|                                                                       |
| \[OfferStatus.EXPIRED, OfferStatus.PENDING\],                         |
|                                                                       |
| \[OfferStatus.PENDING, OfferStatus.PENDING\],                         |
|                                                                       |
| \])(\`blocks %s -\> %s (terminal or self)\`, (from, to) =\> {         |
|                                                                       |
| expect(() =\> OfferStateMachine.assertCanTransition(from, to))        |
|                                                                       |
| .toThrow(InvalidOfferTransitionException);                            |
|                                                                       |
| });                                                                   |
|                                                                       |
| });                                                                   |
|                                                                       |
| describe(\'assertIsTalent\', () =\> {                                 |
|                                                                       |
| it(\'passes when requesterId matches talentId\', () =\> {             |
|                                                                       |
| expect(() =\> OfferStateMachine.assertIsTalent({ talentId: \'T1\' },  |
| \'T1\')).not.toThrow();                                               |
|                                                                       |
| });                                                                   |
|                                                                       |
| it(\'throws ForbiddenException when requesterId does not match\', ()  |
| =\> {                                                                 |
|                                                                       |
| expect(() =\> OfferStateMachine.assertIsTalent({ talentId: \'T1\' },  |
| \'C1\'))                                                              |
|                                                                       |
| .toThrow(ForbiddenException);                                         |
|                                                                       |
| });                                                                   |
|                                                                       |
| });                                                                   |
|                                                                       |
| describe(\'assertNotBlockedByCO\', () =\> {                           |
|                                                                       |
| it(\'passes when offer is PENDING\', () =\> {                         |
|                                                                       |
| expect(() =\> OfferStateMachine.assertNotBlockedByCO({ status:        |
| OfferStatus.PENDING }, \'accept\'))                                   |
|                                                                       |
| .not.toThrow();                                                       |
|                                                                       |
| });                                                                   |
|                                                                       |
| it(\'throws ForbiddenException when offer is COUNTERED\', () =\> {    |
|                                                                       |
| expect(() =\> OfferStateMachine.assertNotBlockedByCO({ status:        |
| OfferStatus.COUNTERED }, \'accept\'))                                 |
|                                                                       |
| .toThrow(ForbiddenException);                                         |
|                                                                       |
| });                                                                   |
|                                                                       |
| });                                                                   |
|                                                                       |
| describe(\'assertIsNonSubmitter\', () =\> {                           |
|                                                                       |
| const offer = { clientId: \'C1\', talentId: \'T1\' };                 |
|                                                                       |
| it(\'talent can act on client CO\', () =\> {                          |
|                                                                       |
| const co = { submittedBy: \'CLIENT\', submittedById: \'C1\' };        |
|                                                                       |
| expect(() =\> OfferStateMachine.assertIsNonSubmitter(co, offer,       |
| \'T1\')).not.toThrow();                                               |
|                                                                       |
| });                                                                   |
|                                                                       |
| it(\'client can act on talent CO\', () =\> {                          |
|                                                                       |
| const co = { submittedBy: \'TALENT\', submittedById: \'T1\' };        |
|                                                                       |
| expect(() =\> OfferStateMachine.assertIsNonSubmitter(co, offer,       |
| \'C1\')).not.toThrow();                                               |
|                                                                       |
| });                                                                   |
|                                                                       |
| it(\'talent cannot act on their own CO\', () =\> {                    |
|                                                                       |
| const co = { submittedBy: \'TALENT\', submittedById: \'T1\' };        |
|                                                                       |
| expect(() =\> OfferStateMachine.assertIsNonSubmitter(co, offer,       |
| \'T1\'))                                                              |
|                                                                       |
| .toThrow(ForbiddenException);                                         |
|                                                                       |
| });                                                                   |
|                                                                       |
| });                                                                   |
|                                                                       |
| describe(\'computeRateWarning\', () =\> {                             |
|                                                                       |
| describe(\'TALENT submits\', () =\> {                                 |
|                                                                       |
| it(\'warns when rate \> parentRate \* 1.25\', () =\> {                |
|                                                                       |
| expect(OfferStateMachine.computeRateWarning(100, 126,                 |
| \'TALENT\')).toBe(true);                                              |
|                                                                       |
| });                                                                   |
|                                                                       |
| it(\'does not warn at exactly 125 (strict \>)\', () =\> {             |
|                                                                       |
| expect(OfferStateMachine.computeRateWarning(100, 125,                 |
| \'TALENT\')).toBe(false);                                             |
|                                                                       |
| });                                                                   |
|                                                                       |
| it(\'does not warn when talent concedes below offer\', () =\> {       |
|                                                                       |
| expect(OfferStateMachine.computeRateWarning(100, 80,                  |
| \'TALENT\')).toBe(false);                                             |
|                                                                       |
| });                                                                   |
|                                                                       |
| it(\'handles non-integer threshold (95 \* 1.25 = 118.75)\', () =\> {  |
|                                                                       |
| expect(OfferStateMachine.computeRateWarning(95, 119,                  |
| \'TALENT\')).toBe(true);                                              |
|                                                                       |
| expect(OfferStateMachine.computeRateWarning(95, 118,                  |
| \'TALENT\')).toBe(false);                                             |
|                                                                       |
| });                                                                   |
|                                                                       |
| });                                                                   |
|                                                                       |
| describe(\'CLIENT submits\', () =\> {                                 |
|                                                                       |
| it(\'warns when rate \< parentRate \* 0.80\', () =\> {                |
|                                                                       |
| expect(OfferStateMachine.computeRateWarning(100, 79,                  |
| \'CLIENT\')).toBe(true);                                              |
|                                                                       |
| });                                                                   |
|                                                                       |
| it(\'does not warn at exactly 80 (strict \<)\', () =\> {              |
|                                                                       |
| expect(OfferStateMachine.computeRateWarning(100, 80,                  |
| \'CLIENT\')).toBe(false);                                             |
|                                                                       |
| });                                                                   |
|                                                                       |
| it(\'does not warn when client increases rate\', () =\> {             |
|                                                                       |
| expect(OfferStateMachine.computeRateWarning(100, 110,                 |
| \'CLIENT\')).toBe(false);                                             |
|                                                                       |
| });                                                                   |
|                                                                       |
| });                                                                   |
|                                                                       |
| });                                                                   |
|                                                                       |
| });                                                                   |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 6 Unit Tests --- offers.service.spec.ts**                      |
|                                                                       |
| Service-layer unit tests with mocked dependencies                     |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/offers/offers.service.spec.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { Test, TestingModule } from \'@nestjs/testing\';              |
|                                                                       |
| import { getRepositoryToken } from \'@nestjs/typeorm\';               |
|                                                                       |
| import { DataSource } from \'typeorm\';                               |
|                                                                       |
| import { OffersService, OfferConcurrentModificationException } from   |
| \'./offers.service\';                                                 |
|                                                                       |
| import { Offer } from \'./entities/offer.entity\';                    |
|                                                                       |
| import { OfferStatus } from \'./enums/offer-status.enum\';            |
|                                                                       |
| import { createOffer } from \'../../test/fixtures/offer.factory\';    |
|                                                                       |
| import { createMockOutboxService } from                               |
| \'../../test/mocks/outbox.mock\';                                     |
|                                                                       |
| import { createMockAblyService } from \'../../test/mocks/ably.mock\'; |
|                                                                       |
| import { ActiveOfferAlreadyExistsException } from                     |
| \'./exceptions/offer.exceptions\';                                    |
|                                                                       |
| describe(\'OffersService\', () =\> {                                  |
|                                                                       |
| let service: OffersService;                                           |
|                                                                       |
| let mockRepo: any;                                                    |
|                                                                       |
| let mockDs: any;                                                      |
|                                                                       |
| let mockOutbox: ReturnType\<typeof createMockOutboxService\>;         |
|                                                                       |
| let mockAbly: ReturnType\<typeof createMockAblyService\>;             |
|                                                                       |
| beforeEach(async () =\> {                                             |
|                                                                       |
| mockOutbox = createMockOutboxService();                               |
|                                                                       |
| mockAbly = createMockAblyService();                                   |
|                                                                       |
| // Mock the entity manager returned by dataSource.transaction()       |
|                                                                       |
| const mockEm = {                                                      |
|                                                                       |
| query: jest.fn(),                                                     |
|                                                                       |
| save: jest.fn(),                                                      |
|                                                                       |
| create: jest.fn((\_, data) =\> data),                                 |
|                                                                       |
| };                                                                    |
|                                                                       |
| mockDs = {                                                            |
|                                                                       |
| transaction: jest.fn((fn) =\> fn(mockEm)),                            |
|                                                                       |
| manager: mockEm,                                                      |
|                                                                       |
| };                                                                    |
|                                                                       |
| mockRepo = {                                                          |
|                                                                       |
| findOne: jest.fn(),                                                   |
|                                                                       |
| create: jest.fn((data) =\> data),                                     |
|                                                                       |
| save: jest.fn((offer) =\> Promise.resolve({ \...offer, id: \'new-id\' |
| })),                                                                  |
|                                                                       |
| };                                                                    |
|                                                                       |
| const module: TestingModule = await Test.createTestingModule({        |
|                                                                       |
| providers: \[                                                         |
|                                                                       |
| OffersService,                                                        |
|                                                                       |
| { provide: getRepositoryToken(Offer), useValue: mockRepo },           |
|                                                                       |
| { provide: DataSource, useValue: mockDs },                            |
|                                                                       |
| { provide: \'OutboxService\', useValue: mockOutbox },                 |
|                                                                       |
| { provide: \'AblyService\', useValue: mockAbly },                     |
|                                                                       |
| \],                                                                   |
|                                                                       |
| }).compile();                                                         |
|                                                                       |
| service = module.get\<OffersService\>(OffersService);                 |
|                                                                       |
| });                                                                   |
|                                                                       |
| describe(\'accept()\', () =\> {                                       |
|                                                                       |
| it(\'transitions PENDING -\> ACCEPTED and writes outbox event\',      |
| async () =\> {                                                        |
|                                                                       |
| const offer = createOffer({ status: OfferStatus.PENDING });           |
|                                                                       |
| mockRepo.findOne.mockResolvedValue(offer);                            |
|                                                                       |
| // CAS query returns 1 row affected                                   |
|                                                                       |
| mockDs.manager.query.mockResolvedValue(\[                             |
|                                                                       |
| \[{ \...offer, status: \'ACCEPTED\', accepted_at: new Date() }\],     |
|                                                                       |
| 1,                                                                    |
|                                                                       |
| \]);                                                                  |
|                                                                       |
| await service.accept(offer.id, offer.talentId);                       |
|                                                                       |
| // Outbox event written                                               |
|                                                                       |
| expect(mockOutbox.create).toHaveBeenCalledWith(                       |
|                                                                       |
| expect.anything(),                                                    |
|                                                                       |
| expect.objectContaining({ eventType: \'offer.accepted\' }),           |
|                                                                       |
| );                                                                    |
|                                                                       |
| // Ably publish fired                                                 |
|                                                                       |
| expect(mockAbly.publish).toHaveBeenCalledWith(                        |
|                                                                       |
| offer.id,                                                             |
|                                                                       |
| expect.objectContaining({ status: \'ACCEPTED\' }),                    |
|                                                                       |
| null,                                                                 |
|                                                                       |
| false,                                                                |
|                                                                       |
| );                                                                    |
|                                                                       |
| });                                                                   |
|                                                                       |
| it(\'throws ForbiddenException when non-talent tries to accept\',     |
| async () =\> {                                                        |
|                                                                       |
| const offer = createOffer({ status: OfferStatus.PENDING });           |
|                                                                       |
| mockRepo.findOne.mockResolvedValue(offer);                            |
|                                                                       |
| await expect(service.accept(offer.id, offer.clientId))                |
|                                                                       |
| .rejects.toThrow(ForbiddenException);                                 |
|                                                                       |
| expect(mockOutbox.create).not.toHaveBeenCalled();                     |
|                                                                       |
| });                                                                   |
|                                                                       |
| it(\'throws ForbiddenException when offer is COUNTERED\', async ()    |
| =\> {                                                                 |
|                                                                       |
| const offer = createOffer({ status: OfferStatus.COUNTERED });         |
|                                                                       |
| mockRepo.findOne.mockResolvedValue(offer);                            |
|                                                                       |
| await expect(service.accept(offer.id, offer.talentId))                |
|                                                                       |
| .rejects.toThrow(ForbiddenException);                                 |
|                                                                       |
| });                                                                   |
|                                                                       |
| it(\'throws 409 when CAS finds 0 rows (concurrent modification)\',    |
| async () =\> {                                                        |
|                                                                       |
| const offer = createOffer({ status: OfferStatus.PENDING });           |
|                                                                       |
| mockRepo.findOne.mockResolvedValue(offer);                            |
|                                                                       |
| mockDs.manager.query.mockResolvedValue(\[\[\], 0\]); // 0 rows        |
| affected                                                              |
|                                                                       |
| await expect(service.accept(offer.id, offer.talentId))                |
|                                                                       |
| .rejects.toThrow(OfferConcurrentModificationException);               |
|                                                                       |
| });                                                                   |
|                                                                       |
| });                                                                   |
|                                                                       |
| describe(\'checkActiveOfferConstraint()\', () =\> {                   |
|                                                                       |
| it(\'throws 409 when PENDING offer exists for the same client-talent  |
| pair\', async () =\> {                                                |
|                                                                       |
| const existingOffer = createOffer({ status: OfferStatus.PENDING });   |
|                                                                       |
| mockRepo.findOne.mockResolvedValue(existingOffer);                    |
|                                                                       |
| await expect((service as any).checkActiveOfferConstraint(\'C1\',      |
| \'T1\'))                                                              |
|                                                                       |
| .rejects.toThrow(ActiveOfferAlreadyExistsException);                  |
|                                                                       |
| });                                                                   |
|                                                                       |
| it(\'throws 409 when COUNTERED offer exists\', async () =\> {         |
|                                                                       |
| const existingOffer = createOffer({ status: OfferStatus.COUNTERED }); |
|                                                                       |
| mockRepo.findOne.mockResolvedValue(existingOffer);                    |
|                                                                       |
| await expect((service as any).checkActiveOfferConstraint(\'C1\',      |
| \'T1\'))                                                              |
|                                                                       |
| .rejects.toThrow(ActiveOfferAlreadyExistsException);                  |
|                                                                       |
| });                                                                   |
|                                                                       |
| it(\'passes when no active offer exists (returns terminal offer)\',   |
| async () =\> {                                                        |
|                                                                       |
| mockRepo.findOne.mockResolvedValue(null); // No match                 |
|                                                                       |
| await expect((service as any).checkActiveOfferConstraint(\'C1\',      |
| \'T1\'))                                                              |
|                                                                       |
| .resolves.toBeUndefined();                                            |
|                                                                       |
| });                                                                   |
|                                                                       |
| });                                                                   |
|                                                                       |
| });                                                                   |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 7 Unit Tests --- counter-offers.service.spec.ts**              |
|                                                                       |
| CO transitions and restore-parent logic                               |
+-----------------------------------------------------------------------+

  ------------------------------------------------------------------------
  **FILE:
  apps/offer-service/src/counter-offers/counter-offers.service.spec.ts**

  ------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { OfferStatus } from \'../offers/enums/offer-status.enum\';    |
|                                                                       |
| import { CounterOfferStatus } from                                    |
| \'./enums/counter-offer-status.enum\';                                |
|                                                                       |
| import { createOffer } from \'../../test/fixtures/offer.factory\';    |
|                                                                       |
| import { createCounterOffer } from                                    |
| \'../../test/fixtures/counter-offer.factory\';                        |
|                                                                       |
| describe(\'CounterOffersService\', () =\> {                           |
|                                                                       |
| describe(\'declineCO()\', () =\> {                                    |
|                                                                       |
| it(\'transitions CO to DECLINED and restores parent offer to          |
| PENDING\', async () =\> {                                             |
|                                                                       |
| const offer = createOffer({ status: OfferStatus.COUNTERED });         |
|                                                                       |
| const co = createCounterOffer({ offerId: offer.id, submittedBy:       |
| \'TALENT\' });                                                        |
|                                                                       |
| // Mock offer repo                                                    |
|                                                                       |
| mockOffersService.findByIdOrThrow.mockResolvedValue(offer);           |
|                                                                       |
| mockCoRepo.findOne.mockResolvedValue(co);                             |
|                                                                       |
| // CAS on CO: 1 row affected                                          |
|                                                                       |
| mockEm.query.mockResolvedValueOnce(\[\[{ \...co, status: \'DECLINED\' |
| }\], 1\]);                                                            |
|                                                                       |
| // CAS on offer (restore): 1 row affected                             |
|                                                                       |
| mockEm.query.mockResolvedValueOnce(\[\[{ \...offer, status:           |
| \'PENDING\' }\]\]);                                                   |
|                                                                       |
| await service.declineCO(offer.id, co.id, offer.clientId);             |
|                                                                       |
| // Verify outbox event for CO decline                                 |
|                                                                       |
| expect(mockOutbox.create).toHaveBeenCalledWith(                       |
|                                                                       |
| expect.anything(),                                                    |
|                                                                       |
| expect.objectContaining({ eventType: \'offer.counter_declined\' }),   |
|                                                                       |
| );                                                                    |
|                                                                       |
| // Verify Ably push with restored PENDING offer                       |
|                                                                       |
| expect(mockAbly.publish).toHaveBeenCalledWith(                        |
|                                                                       |
| offer.id,                                                             |
|                                                                       |
| expect.objectContaining({ status: \'PENDING\' }),                     |
|                                                                       |
| null,                                                                 |
|                                                                       |
| false,                                                                |
|                                                                       |
| );                                                                    |
|                                                                       |
| });                                                                   |
|                                                                       |
| it(\'does not error when parent offer was independently expired (0    |
| rows on restore)\', async () =\> {                                    |
|                                                                       |
| const offer = createOffer({ status: OfferStatus.COUNTERED });         |
|                                                                       |
| const co = createCounterOffer({ offerId: offer.id, submittedBy:       |
| \'TALENT\' });                                                        |
|                                                                       |
| mockOffersService.findByIdOrThrow.mockResolvedValue(offer);           |
|                                                                       |
| mockCoRepo.findOne.mockResolvedValue(co);                             |
|                                                                       |
| mockEm.query.mockResolvedValueOnce(\[\[{ \...co, status: \'DECLINED\' |
| }\], 1\]);                                                            |
|                                                                       |
| mockEm.query.mockResolvedValueOnce(\[\[\]\]); // 0 rows: parent       |
| already expired                                                       |
|                                                                       |
| // Should not throw even though parent restore returns 0 rows         |
|                                                                       |
| await expect(service.declineCO(offer.id, co.id,                       |
| offer.clientId)).resolves.toBeDefined();                              |
|                                                                       |
| });                                                                   |
|                                                                       |
| it(\'throws ForbiddenException when submitter tries to decline their  |
| own CO\', async () =\> {                                              |
|                                                                       |
| const offer = createOffer({ status: OfferStatus.COUNTERED });         |
|                                                                       |
| const co = createCounterOffer({ offerId: offer.id, submittedBy:       |
| \'TALENT\', submittedById: offer.talentId });                         |
|                                                                       |
| mockOffersService.findByIdOrThrow.mockResolvedValue(offer);           |
|                                                                       |
| mockCoRepo.findOne.mockResolvedValue(co);                             |
|                                                                       |
| // Talent submitted the CO. Talent trying to decline their own CO:    |
| forbidden.                                                            |
|                                                                       |
| await expect(service.declineCO(offer.id, co.id, offer.talentId))      |
|                                                                       |
| .rejects.toThrow(ForbiddenException);                                 |
|                                                                       |
| });                                                                   |
|                                                                       |
| });                                                                   |
|                                                                       |
| describe(\'create() rate warning\', () =\> {                          |
|                                                                       |
| it(\'computes rateWarning=true when talent asks \>25% above offer     |
| rate\', async () =\> {                                                |
|                                                                       |
| const offer = createOffer({ rate: 100 });                             |
|                                                                       |
| mockOffersService.findByIdOrThrow.mockResolvedValue(offer);           |
|                                                                       |
| // \... setup mocks \...                                              |
|                                                                       |
| const result = await service.create(offer.id, offer.talentId,         |
| \'TALENT\', {                                                         |
|                                                                       |
| rate: 126, currencyCode: \'USD\', durationMonths: 6,                  |
|                                                                       |
| workSchedule: { type: \'FULL_TIME\' }, startDate: \'2099-01-01\',     |
|                                                                       |
| });                                                                   |
|                                                                       |
| expect(mockAbly.publish).toHaveBeenCalledWith(                        |
|                                                                       |
| offer.id, expect.anything(), expect.anything(), true, //              |
| rateWarning=true                                                      |
|                                                                       |
| );                                                                    |
|                                                                       |
| });                                                                   |
|                                                                       |
| });                                                                   |
|                                                                       |
| });                                                                   |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 8 Integration Tests --- offers.integration.spec.ts**           |
|                                                                       |
| Full stack with real test DB                                          |
+-----------------------------------------------------------------------+

Integration tests bootstrap a full NestJS application with a real
PostgreSQL connection to the test schema. They mock only AblyService and
RabbitMQPublisher (the outbox is tested for correct DB writes, not
actual RabbitMQ delivery). Tests run sequentially (runInBand) to avoid
connection pool issues.

  -----------------------------------------------------------------------
  **FILE:
  apps/offer-service/test/integration/offers.integration.spec.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { Test, TestingModule } from \'@nestjs/testing\';              |
|                                                                       |
| import { INestApplication } from \'@nestjs/common\';                  |
|                                                                       |
| import { DataSource } from \'typeorm\';                               |
|                                                                       |
| import { AppModule } from \'../../src/app.module\';                   |
|                                                                       |
| import { OffersService } from \'../../src/offers/offers.service\';    |
|                                                                       |
| import { OutboxEvent } from                                           |
| \'../../src/outbox/entities/outbox-event.entity\';                    |
|                                                                       |
| import { Offer } from \'../../src/offers/entities/offer.entity\';     |
|                                                                       |
| import { OfferStatus } from                                           |
| \'../../src/offers/enums/offer-status.enum\';                         |
|                                                                       |
| import { createMockAblyService } from \'../mocks/ably.mock\';         |
|                                                                       |
| import { TestDbHelper } from \'../test-db.helper\';                   |
|                                                                       |
| import { SEED_USERS, SEED_LISTINGS } from                             |
| \'../../../seeds/constants/seed-ids\';                                |
|                                                                       |
| describe(\'OffersService (integration)\', () =\> {                    |
|                                                                       |
| let app: INestApplication;                                            |
|                                                                       |
| let service: OffersService;                                           |
|                                                                       |
| let dataSource: DataSource;                                           |
|                                                                       |
| let mockAbly: ReturnType\<typeof createMockAblyService\>;             |
|                                                                       |
| beforeAll(async () =\> {                                              |
|                                                                       |
| mockAbly = createMockAblyService();                                   |
|                                                                       |
| const module: TestingModule = await Test.createTestingModule({        |
|                                                                       |
| imports: \[AppModule\],                                               |
|                                                                       |
| })                                                                    |
|                                                                       |
| .overrideProvider(\'AblyService\').useValue(mockAbly)                 |
|                                                                       |
| // RabbitMQPublisher is mocked to prevent actual AMQP calls.          |
|                                                                       |
| // The outbox rows are the focus of integration tests.                |
|                                                                       |
| .overrideProvider(\'RabbitMQPublisher\').useValue({ publish:          |
| jest.fn(), isReady: () =\> true })                                    |
|                                                                       |
| .compile();                                                           |
|                                                                       |
| app = module.createNestApplication();                                 |
|                                                                       |
| await app.init();                                                     |
|                                                                       |
| service = module.get\<OffersService\>(OffersService);                 |
|                                                                       |
| dataSource = module.get\<DataSource\>(DataSource);                    |
|                                                                       |
| });                                                                   |
|                                                                       |
| afterEach(async () =\> {                                              |
|                                                                       |
| await TestDbHelper.truncateAll();                                     |
|                                                                       |
| jest.clearAllMocks();                                                 |
|                                                                       |
| });                                                                   |
|                                                                       |
| afterAll(async () =\> {                                               |
|                                                                       |
| await app.close();                                                    |
|                                                                       |
| });                                                                   |
|                                                                       |
| describe(\'Full lifecycle: create -\> accept\', () =\> {              |
|                                                                       |
| it(\'creates an offer and writes offer.created to outbox\', async ()  |
| =\> {                                                                 |
|                                                                       |
| const offer = await service.create(SEED_USERS.CLIENT_A, {             |
|                                                                       |
| talentId: SEED_USERS.TALENT_X,                                        |
|                                                                       |
| jobListingId: SEED_LISTINGS.PROJECT_ALPHA,                            |
|                                                                       |
| contractType: \'PROJECT\',                                            |
|                                                                       |
| contractTitle: \'Alpha Test\',                                        |
|                                                                       |
| rate: 95,                                                             |
|                                                                       |
| currencyCode: \'USD\',                                                |
|                                                                       |
| durationMonths: 6,                                                    |
|                                                                       |
| workSchedule: { type: \'FULL_TIME\' },                                |
|                                                                       |
| startDate: \'2099-01-01\',                                            |
|                                                                       |
| });                                                                   |
|                                                                       |
| expect(offer.status).toBe(\'PENDING\');                               |
|                                                                       |
| expect(offer.id).toBeDefined();                                       |
|                                                                       |
| // Verify outbox row written to the test DB.                          |
|                                                                       |
| const outboxRows = await dataSource.getRepository(OutboxEvent).find({ |
|                                                                       |
| where: { aggregateId: offer.id },                                     |
|                                                                       |
| });                                                                   |
|                                                                       |
| expect(outboxRows).toHaveLength(1);                                   |
|                                                                       |
| expect(outboxRows\[0\].eventType).toBe(\'offer.created\');            |
|                                                                       |
| });                                                                   |
|                                                                       |
| it(\'accept() transitions offer to ACCEPTED and writes                |
| offer.accepted\', async () =\> {                                      |
|                                                                       |
| // Create offer first.                                                |
|                                                                       |
| const offer = await service.create(SEED_USERS.CLIENT_A, {             |
|                                                                       |
| talentId: SEED_USERS.TALENT_X,                                        |
|                                                                       |
| // \... full DTO \...                                                 |
|                                                                       |
| });                                                                   |
|                                                                       |
| // Talent accepts.                                                    |
|                                                                       |
| const accepted = await service.accept(offer.id, SEED_USERS.TALENT_X); |
|                                                                       |
| expect(accepted.status).toBe(\'ACCEPTED\');                           |
|                                                                       |
| expect(accepted.acceptedAt).toBeDefined();                            |
|                                                                       |
| // Verify DB state.                                                   |
|                                                                       |
| const dbOffer = await dataSource.getRepository(Offer).findOne({       |
|                                                                       |
| where: { id: offer.id },                                              |
|                                                                       |
| });                                                                   |
|                                                                       |
| expect(dbOffer?.status).toBe(\'ACCEPTED\');                           |
|                                                                       |
| // Verify outbox events: created + accepted.                          |
|                                                                       |
| const outboxRows = await dataSource.getRepository(OutboxEvent).find({ |
|                                                                       |
| where: { aggregateId: offer.id },                                     |
|                                                                       |
| order: { createdAt: \'ASC\' },                                        |
|                                                                       |
| });                                                                   |
|                                                                       |
| expect(outboxRows).toHaveLength(2);                                   |
|                                                                       |
| expect(outboxRows\[0\].eventType).toBe(\'offer.created\');            |
|                                                                       |
| expect(outboxRows\[1\].eventType).toBe(\'offer.accepted\');           |
|                                                                       |
| });                                                                   |
|                                                                       |
| });                                                                   |
|                                                                       |
| describe(\'CAS race condition\', () =\> {                             |
|                                                                       |
| it(\'exactly one of two concurrent accepts succeeds\', async () =\> { |
|                                                                       |
| const offer = await service.create(SEED_USERS.CLIENT_A, { /\* \...    |
| \*/ });                                                               |
|                                                                       |
| // Fire two concurrent accept requests.                               |
|                                                                       |
| const results = await Promise.allSettled(\[                           |
|                                                                       |
| service.accept(offer.id, SEED_USERS.TALENT_X),                        |
|                                                                       |
| service.accept(offer.id, SEED_USERS.TALENT_X),                        |
|                                                                       |
| \]);                                                                  |
|                                                                       |
| const successes = results.filter(r =\> r.status === \'fulfilled\');   |
|                                                                       |
| const failures = results.filter(r =\> r.status === \'rejected\');     |
|                                                                       |
| // Exactly one succeeds, one gets 409.                                |
|                                                                       |
| expect(successes).toHaveLength(1);                                    |
|                                                                       |
| expect(failures).toHaveLength(1);                                     |
|                                                                       |
| expect((failures\[0\] as PromiseRejectedResult).reason.errorCode)     |
|                                                                       |
| .toBe(\'OFFER_CONCURRENT_MODIFICATION\');                             |
|                                                                       |
| });                                                                   |
|                                                                       |
| });                                                                   |
|                                                                       |
| });                                                                   |
+-----------------------------------------------------------------------+

**Running the tests**

+-----------------------------------------------------------------------+
| \# Unit tests (fast, no DB needed):                                   |
|                                                                       |
| cd apps/offer-service                                                 |
|                                                                       |
| npm run test                                                          |
|                                                                       |
| \# Expected: all unit tests pass in \< 10s                            |
|                                                                       |
| \# Unit tests with coverage report:                                   |
|                                                                       |
| npm run test:cov                                                      |
|                                                                       |
| \# Expected: coverage report in apps/offer-service/coverage/          |
|                                                                       |
| \# Verify: offer-state-machine.ts shows 100%                          |
|                                                                       |
| \# Integration tests (needs PostgreSQL):                              |
|                                                                       |
| \# Ensure .env.test is set with TEST_DATABASE_URL                     |
|                                                                       |
| npm run test:int                                                      |
|                                                                       |
| \# Expected: integration tests pass in \< 60s                         |
|                                                                       |
| \# \--runInBand: tests run sequentially (required for shared DB)      |
|                                                                       |
| \# Run both:                                                          |
|                                                                       |
| npm run test:all                                                      |
+-----------------------------------------------------------------------+
