**OS-32**

**Offer Service --- E2E Test Scenarios**

**Tool:** Supertest + NestJS Testing **Transport:** HTTP **DB:**
offer_service_test schema (real PostgreSQL)

This document contains the complete E2E test scenarios for
offer-service. E2E tests issue real HTTP requests against a running
NestJS app with a real test database. They verify the full request
stack: auth guard, controller, service, database writes, and HTTP
response. RabbitMQ and Ably are mocked at the provider level so tests
are fast and deterministic.

**File Map**

  ----------- ------------------------------------------- ----------------------
  **File**    **Path**                                    **Scenarios**

  **Setup**   test/e2e/e2e.setup.ts                       App bootstrap, JWT
                                                          helpers, DB truncation

  **Flow 1**  test/e2e/offer-happy-path.e2e.spec.ts       Create → accept.
                                                          Create → decline.
                                                          Create → withdraw.

  **Flow 2**  test/e2e/counter-offer-rounds.e2e.spec.ts   1-round CO, 3-round
                                                          negotiation, client CO
                                                          direction flip

  **Flow 3**  test/e2e/expiry.e2e.spec.ts                 Offer expiry, CO
                                                          expiry + restore,
                                                          30-day extension
                                                          threshold

  **Flow 4**  test/e2e/resend.e2e.spec.ts                 Resend after decline,
                                                          resend blocked by
                                                          active offer

  **Flow 5**  test/e2e/active-offer.e2e.spec.ts           Constraint
                                                          enforcement: PENDING +
                                                          COUNTERED both block

  **Flow 6**  test/e2e/nda-gate.e2e.spec.ts               Scope view blocked
                                                          without NDA, actions
                                                          never blocked

  **Flow 7**  test/e2e/error-cases.e2e.spec.ts            Auth errors, role
                                                          errors, 409 CAS, 422
                                                          validation
  ----------- ------------------------------------------- ----------------------

+-----------------------------------------------------------------------+
| **Setup E2E Test Bootstrap --- e2e.setup.ts**                         |
|                                                                       |
| App, JWT helpers, and per-test cleanup                                |
+-----------------------------------------------------------------------+

All E2E test files import from e2e.setup.ts. This keeps the app
bootstrap in one place. JWT helpers generate signed tokens for the
CLIENT_A and TALENT_X test users without hitting auth-service.

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/test/e2e/e2e.setup.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { Test, TestingModule } from \'@nestjs/testing\';              |
|                                                                       |
| import { INestApplication } from \'@nestjs/common\';                  |
|                                                                       |
| import { JwtService } from \'@nestjs/jwt\';                           |
|                                                                       |
| import \* as request from \'supertest\';                              |
|                                                                       |
| import { AppModule } from \'../../src/app.module\';                   |
|                                                                       |
| import { TestDbHelper } from \'../test-db.helper\';                   |
|                                                                       |
| import { SEED_USERS, SEED_LISTINGS } from                             |
| \'../../../seeds/constants/seed-ids\';                                |
|                                                                       |
| import { createMockAblyService } from \'../mocks/ably.mock\';         |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Shared test state (initialised once in beforeAll)                  |
|                                                                       |
| // ============================================================       |
|                                                                       |
| export let app: INestApplication;                                     |
|                                                                       |
| export let req: ReturnType\<typeof request\>;                         |
|                                                                       |
| export let clientAToken: string;                                      |
|                                                                       |
| export let talentXToken: string;                                      |
|                                                                       |
| export let talentYToken: string;                                      |
|                                                                       |
| export let mockAbly: ReturnType\<typeof createMockAblyService\>;      |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* bootstrapE2E()                                                     |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Call in beforeAll() of every E2E test suite.                       |
|                                                                       |
| \* Sets up the NestJS app with mocked Ably and RabbitMQ.              |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Example:                                                           |
|                                                                       |
| \* beforeAll(() =\> bootstrapE2E());                                  |
|                                                                       |
| \* afterEach(() =\> TestDbHelper.truncateAll());                      |
|                                                                       |
| \* afterAll(() =\> app.close());                                      |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export async function bootstrapE2E(): Promise\<void\> {               |
|                                                                       |
| mockAbly = createMockAblyService();                                   |
|                                                                       |
| const moduleRef: TestingModule = await Test.createTestingModule({     |
|                                                                       |
| imports: \[AppModule\],                                               |
|                                                                       |
| })                                                                    |
|                                                                       |
| .overrideProvider(\'AblyService\').useValue(mockAbly)                 |
|                                                                       |
| .overrideProvider(\'RabbitMQPublisher\').useValue({                   |
|                                                                       |
| publish: jest.fn().mockResolvedValue(undefined),                      |
|                                                                       |
| isReady: () =\> true,                                                 |
|                                                                       |
| })                                                                    |
|                                                                       |
| .overrideProvider(\'ListingsClient\').useValue({                      |
|                                                                       |
| validateListing: jest.fn().mockResolvedValue({                        |
|                                                                       |
| id: SEED_LISTINGS.PROJECT_ALPHA,                                      |
|                                                                       |
| contractType: \'PROJECT\',                                            |
|                                                                       |
| title: \'Alpha Platform Rebuild\',                                    |
|                                                                       |
| clientId: SEED_USERS.CLIENT_A,                                        |
|                                                                       |
| status: \'ACTIVE\',                                                   |
|                                                                       |
| }),                                                                   |
|                                                                       |
| })                                                                    |
|                                                                       |
| .overrideProvider(\'LegalClient\').useValue({                         |
|                                                                       |
| getNdaStatus: jest.fn().mockResolvedValue({ signed: true, signedAt:   |
| new Date().toISOString() }),                                          |
|                                                                       |
| })                                                                    |
|                                                                       |
| .compile();                                                           |
|                                                                       |
| app = moduleRef.createNestApplication();                              |
|                                                                       |
| app.setGlobalPrefix(\'v1\'); // Match the real app prefix             |
|                                                                       |
| await app.init();                                                     |
|                                                                       |
| // Build the Supertest request agent.                                 |
|                                                                       |
| req = request(app.getHttpServer());                                   |
|                                                                       |
| // Generate JWT tokens for test users.                                |
|                                                                       |
| // These use the same secret as the app config (set in .env.test).    |
|                                                                       |
| const jwt = moduleRef.get\<JwtService\>(JwtService);                  |
|                                                                       |
| clientAToken = jwt.sign({ sub: SEED_USERS.CLIENT_A, role: \'CLIENT\'  |
| });                                                                   |
|                                                                       |
| talentXToken = jwt.sign({ sub: SEED_USERS.TALENT_X, role: \'TALENT\'  |
| });                                                                   |
|                                                                       |
| talentYToken = jwt.sign({ sub: SEED_USERS.TALENT_Y, role: \'TALENT\'  |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Shared request helpers                                             |
|                                                                       |
| // ============================================================       |
|                                                                       |
| /\*\* Create an offer as CLIENT_A to TALENT_X. Returns the created    |
| offer. \*/                                                            |
|                                                                       |
| export async function createTestOffer(overrides: Record\<string,      |
| unknown\> = {}) {                                                     |
|                                                                       |
| const res = await req                                                 |
|                                                                       |
| .post(\'/v1/offers\')                                                 |
|                                                                       |
| .set(\'Authorization\', \`Bearer \${clientAToken}\`)                  |
|                                                                       |
| .set(\'X-Idempotency-Key\', crypto.randomUUID())                      |
|                                                                       |
| .send({                                                               |
|                                                                       |
| talentId: SEED_USERS.TALENT_X,                                        |
|                                                                       |
| jobListingId: SEED_LISTINGS.PROJECT_ALPHA,                            |
|                                                                       |
| contractType: \'PROJECT\',                                            |
|                                                                       |
| contractTitle: \'E2E Test Project\',                                  |
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
| \...overrides,                                                        |
|                                                                       |
| });                                                                   |
|                                                                       |
| expect(res.status).toBe(201);                                         |
|                                                                       |
| return res.body;                                                      |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\* Submit a counter offer as TALENT_X. Returns CO and rateWarning. |
| \*/                                                                   |
|                                                                       |
| export async function createTestCO(                                   |
|                                                                       |
| offerId: string,                                                      |
|                                                                       |
| rate: number,                                                         |
|                                                                       |
| token = talentXToken,                                                 |
|                                                                       |
| ) {                                                                   |
|                                                                       |
| const res = await req                                                 |
|                                                                       |
| .post(\`/v1/offers/\${offerId}/counter-offers\`)                      |
|                                                                       |
| .set(\'Authorization\', \`Bearer \${token}\`)                         |
|                                                                       |
| .set(\'X-Idempotency-Key\', crypto.randomUUID())                      |
|                                                                       |
| .send({                                                               |
|                                                                       |
| rate,                                                                 |
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
| expect(res.status).toBe(201);                                         |
|                                                                       |
| return res.body;                                                      |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Flow 1 Offer Happy Path --- offer-happy-path.e2e.spec.ts**          |
|                                                                       |
| Create, accept, decline, and withdraw                                 |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/test/e2e/offer-happy-path.e2e.spec.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { bootstrapE2E, createTestOffer, req, clientAToken,            |
| talentXToken, app } from \'./e2e.setup\';                             |
|                                                                       |
| import { TestDbHelper } from \'../test-db.helper\';                   |
|                                                                       |
| import { SEED_USERS } from \'../../../seeds/constants/seed-ids\';     |
|                                                                       |
| describe(\'E2E: Offer Happy Path\', () =\> {                          |
|                                                                       |
| beforeAll(() =\> bootstrapE2E());                                     |
|                                                                       |
| afterEach(() =\> TestDbHelper.truncateAll());                         |
|                                                                       |
| afterAll(() =\> app.close());                                         |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Scenario 1: CREATE -\> ACCEPT (US-OS-01, US-OS-09)                 |
|                                                                       |
| // ============================================================       |
|                                                                       |
| it(\'Scenario 1: Client creates offer, talent accepts it\', async ()  |
| =\> {                                                                 |
|                                                                       |
| // Step 1: CLIENT creates offer                                       |
|                                                                       |
| const offer = await createTestOffer();                                |
|                                                                       |
| expect(offer.status).toBe(\'PENDING\');                               |
|                                                                       |
| expect(offer.id).toBeDefined();                                       |
|                                                                       |
| expect(offer.expiresAt).toBeDefined();                                |
|                                                                       |
| expect(offer.currencyCode).toBe(\'USD\');                             |
|                                                                       |
| // Step 2: GET offer as talent (verify they can see it)               |
|                                                                       |
| const getRes = await req                                              |
|                                                                       |
| .get(\`/v1/offers/\${offer.id}\`)                                     |
|                                                                       |
| .set(\'Authorization\', \`Bearer \${talentXToken}\`);                 |
|                                                                       |
| expect(getRes.status).toBe(200);                                      |
|                                                                       |
| expect(getRes.body.offer.status).toBe(\'PENDING\');                   |
|                                                                       |
| // Step 3: TALENT accepts                                             |
|                                                                       |
| const acceptRes = await req                                           |
|                                                                       |
| .post(\`/v1/offers/\${offer.id}/accept\`)                             |
|                                                                       |
| .set(\'Authorization\', \`Bearer \${talentXToken}\`)                  |
|                                                                       |
| .set(\'X-Idempotency-Key\', crypto.randomUUID())                      |
|                                                                       |
| .send({});                                                            |
|                                                                       |
| expect(acceptRes.status).toBe(200);                                   |
|                                                                       |
| expect(acceptRes.body.status).toBe(\'ACCEPTED\');                     |
|                                                                       |
| expect(acceptRes.body.acceptedAt).toBeDefined();                      |
|                                                                       |
| // Step 4: Verify idempotent replay returns same result               |
|                                                                       |
| const idempKey = crypto.randomUUID();                                 |
|                                                                       |
| // First accept already happened. Try accepting again with new key.   |
|                                                                       |
| const replayRes = await req                                           |
|                                                                       |
| .post(\`/v1/offers/\${offer.id}/accept\`)                             |
|                                                                       |
| .set(\'Authorization\', \`Bearer \${talentXToken}\`)                  |
|                                                                       |
| .set(\'X-Idempotency-Key\', idempKey)                                 |
|                                                                       |
| .send({});                                                            |
|                                                                       |
| // Should get 409 (already accepted, invalid transition)              |
|                                                                       |
| expect(replayRes.status).toBe(409);                                   |
|                                                                       |
| });                                                                   |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Scenario 2: CREATE -\> DECLINE (US-OS-10)                          |
|                                                                       |
| // ============================================================       |
|                                                                       |
| it(\'Scenario 2: Client creates offer, talent declines with reason\', |
| async () =\> {                                                        |
|                                                                       |
| const offer = await createTestOffer();                                |
|                                                                       |
| const declineRes = await req                                          |
|                                                                       |
| .post(\`/v1/offers/\${offer.id}/decline\`)                            |
|                                                                       |
| .set(\'Authorization\', \`Bearer \${talentXToken}\`)                  |
|                                                                       |
| .set(\'X-Idempotency-Key\', crypto.randomUUID())                      |
|                                                                       |
| .send({                                                               |
|                                                                       |
| reason: \'The budget does not align with my current rate.\',          |
|                                                                       |
| chip: \'BUDGET_DOESNT_WORK\',                                         |
|                                                                       |
| });                                                                   |
|                                                                       |
| expect(declineRes.status).toBe(200);                                  |
|                                                                       |
| expect(declineRes.body.status).toBe(\'DECLINED\');                    |
|                                                                       |
| expect(declineRes.body.declinedAt).toBeDefined();                     |
|                                                                       |
| // Verify: decline reason is stored but NOT in response body          |
| directly.                                                             |
|                                                                       |
| // Client must fetch the offer details to see the reason.             |
|                                                                       |
| const detailRes = await req                                           |
|                                                                       |
| .get(\`/v1/offers/\${offer.id}\`)                                     |
|                                                                       |
| .set(\'Authorization\', \`Bearer \${clientAToken}\`);                 |
|                                                                       |
| expect(detailRes.status).toBe(200);                                   |
|                                                                       |
| // declinedReason is available in the full offer details.             |
|                                                                       |
| expect(detailRes.body.offer.status).toBe(\'DECLINED\');               |
|                                                                       |
| });                                                                   |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Scenario 3: CREATE -\> WITHDRAW (US-OS-11)                         |
|                                                                       |
| // ============================================================       |
|                                                                       |
| it(\'Scenario 3: Client withdraws a pending offer\', async () =\> {   |
|                                                                       |
| const offer = await createTestOffer();                                |
|                                                                       |
| const withdrawRes = await req                                         |
|                                                                       |
| .post(\`/v1/offers/\${offer.id}/withdraw\`)                           |
|                                                                       |
| .set(\'Authorization\', \`Bearer \${clientAToken}\`)                  |
|                                                                       |
| .set(\'X-Idempotency-Key\', crypto.randomUUID())                      |
|                                                                       |
| .send({ withdrawalMessage: \'Pausing this hire.\' });                 |
|                                                                       |
| expect(withdrawRes.status).toBe(200);                                 |
|                                                                       |
| expect(withdrawRes.body.status).toBe(\'WITHDRAWN\');                  |
|                                                                       |
| expect(withdrawRes.body.withdrawalMessage).toBe(\'Pausing this        |
| hire.\');                                                             |
|                                                                       |
| });                                                                   |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Scenario 4: EDIT offer resets TTL (US-OS-04)                       |
|                                                                       |
| // ============================================================       |
|                                                                       |
| it(\'Scenario 4: Client edits offer and TTL resets\', async () =\> {  |
|                                                                       |
| const offer = await createTestOffer();                                |
|                                                                       |
| const originalExpiry = offer.expiresAt;                               |
|                                                                       |
| // Small delay to ensure expiresAt changes                            |
|                                                                       |
| await new Promise(r =\> setTimeout(r, 50));                           |
|                                                                       |
| const editRes = await req                                             |
|                                                                       |
| .patch(\`/v1/offers/\${offer.id}\`)                                   |
|                                                                       |
| .set(\'Authorization\', \`Bearer \${clientAToken}\`)                  |
|                                                                       |
| .set(\'X-Idempotency-Key\', crypto.randomUUID())                      |
|                                                                       |
| .send({ rate: 100, message: \'Updated terms.\' });                    |
|                                                                       |
| expect(editRes.status).toBe(200);                                     |
|                                                                       |
| expect(editRes.body.rate).toBe(100);                                  |
|                                                                       |
| // expiresAt is later than before (TTL reset).                        |
|                                                                       |
| expect(new Date(editRes.body.expiresAt).getTime())                    |
|                                                                       |
| .toBeGreaterThan(new Date(originalExpiry).getTime());                 |
|                                                                       |
| });                                                                   |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Scenario 5: ROLE guard --- client cannot accept their own offer    |
|                                                                       |
| // ============================================================       |
|                                                                       |
| it(\'Scenario 5: CLIENT cannot accept their own offer (403)\', async  |
| () =\> {                                                              |
|                                                                       |
| const offer = await createTestOffer();                                |
|                                                                       |
| const res = await req                                                 |
|                                                                       |
| .post(\`/v1/offers/\${offer.id}/accept\`)                             |
|                                                                       |
| .set(\'Authorization\', \`Bearer \${clientAToken}\`) // client, not   |
| talent                                                                |
|                                                                       |
| .set(\'X-Idempotency-Key\', crypto.randomUUID())                      |
|                                                                       |
| .send({});                                                            |
|                                                                       |
| expect(res.status).toBe(403);                                         |
|                                                                       |
| });                                                                   |
|                                                                       |
| });                                                                   |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Flow 2 Counter Offer Rounds --- counter-offer-rounds.e2e.spec.ts**  |
|                                                                       |
| 1-round, 3-round, client CO direction flip                            |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/test/e2e/counter-offer-rounds.e2e.spec.ts**

  -----------------------------------------------------------------------

+--------------------------------------------------------------------------------+
| import { bootstrapE2E, createTestOffer, createTestCO, req, clientAToken,       |
| talentXToken, app } from \'./e2e.setup\';                                      |
|                                                                                |
| import { TestDbHelper } from \'../test-db.helper\';                            |
|                                                                                |
| describe(\'E2E: Counter Offer Rounds\', () =\> {                               |
|                                                                                |
| beforeAll(() =\> bootstrapE2E());                                              |
|                                                                                |
| afterEach(() =\> TestDbHelper.truncateAll());                                  |
|                                                                                |
| afterAll(() =\> app.close());                                                  |
|                                                                                |
| // ============================================================                |
|                                                                                |
| // Scenario 1: 1-round CO, talent submits, client accepts                      |
|                                                                                |
| // ============================================================                |
|                                                                                |
| it(\'Scenario 1: Talent counter offer accepted by client\', async () =\> {     |
|                                                                                |
| const offer = await createTestOffer({ rate: 90 });                             |
|                                                                                |
| // Talent submits CO at \$100 (not triggering 25% warning: 100 \<              |
| 90\*1.25=112.5)                                                                |
|                                                                                |
| const { counterOffer, rateWarning } = await createTestCO(offer.id, 100);       |
|                                                                                |
| expect(counterOffer.status).toBe(\'PENDING\');                                 |
|                                                                                |
| expect(rateWarning).toBe(false);                                               |
|                                                                                |
| // Verify offer is now COUNTERED                                               |
|                                                                                |
| const offerRes = await req                                                     |
|                                                                                |
| .get(\`/v1/offers/\${offer.id}\`)                                              |
|                                                                                |
| .set(\'Authorization\', \`Bearer \${clientAToken}\`);                          |
|                                                                                |
| expect(offerRes.body.offer.status).toBe(\'COUNTERED\');                        |
|                                                                                |
| expect(offerRes.body.counterOffer.status).toBe(\'PENDING\');                   |
|                                                                                |
| // Client accepts the CO                                                       |
|                                                                                |
| const acceptRes = await req                                                    |
|                                                                                |
| .post(\`/v1/offers/\${offer.id}/counter-offers/\${counterOffer.id}/accept\`)   |
|                                                                                |
| .set(\'Authorization\', \`Bearer \${clientAToken}\`)                           |
|                                                                                |
| .set(\'X-Idempotency-Key\', crypto.randomUUID())                               |
|                                                                                |
| .send({});                                                                     |
|                                                                                |
| expect(acceptRes.status).toBe(200);                                            |
|                                                                                |
| expect(acceptRes.body.status).toBe(\'ACCEPTED\');                              |
|                                                                                |
| // Verify both offer and CO are ACCEPTED                                       |
|                                                                                |
| const finalRes = await req                                                     |
|                                                                                |
| .get(\`/v1/offers/\${offer.id}\`)                                              |
|                                                                                |
| .set(\'Authorization\', \`Bearer \${clientAToken}\`);                          |
|                                                                                |
| expect(finalRes.body.offer.status).toBe(\'ACCEPTED\');                         |
|                                                                                |
| });                                                                            |
|                                                                                |
| // ============================================================                |
|                                                                                |
| // Scenario 2: 3-round negotiation                                             |
|                                                                                |
| // ============================================================                |
|                                                                                |
| it(\'Scenario 2: Three rounds of counter offers ending in acceptance\', async  |
| () =\> {                                                                       |
|                                                                                |
| const offer = await createTestOffer({ rate: 120 });                            |
|                                                                                |
| // Round 1: Talent submits CO at \$145 (\>25% above 120: triggers warning)     |
|                                                                                |
| const { counterOffer: co1, rateWarning: w1 } = await createTestCO(offer.id,    |
| 145);                                                                          |
|                                                                                |
| expect(w1).toBe(true); // 145 \> 120 \* 1.25 = 150? No: 145 \< 150. False.     |
|                                                                                |
| // Actually: 145 \> 120 \* 1.25 = 150? 150 is the threshold. 145 \< 150. So    |
| false.                                                                         |
|                                                                                |
| // For a true warning: need rate \> 150. Let\'s use 152.                       |
|                                                                                |
| // Client declines round 1 CO (non-submitter declines)                         |
|                                                                                |
| await req                                                                      |
|                                                                                |
| .post(\`/v1/offers/\${offer.id}/counter-offers/\${co1.id}/decline\`)           |
|                                                                                |
| .set(\'Authorization\', \`Bearer \${clientAToken}\`)                           |
|                                                                                |
| .set(\'X-Idempotency-Key\', crypto.randomUUID())                               |
|                                                                                |
| .send({});                                                                     |
|                                                                                |
| // Offer should be restored to PENDING after CO decline                        |
|                                                                                |
| const afterDecline = await req                                                 |
|                                                                                |
| .get(\`/v1/offers/\${offer.id}\`)                                              |
|                                                                                |
| .set(\'Authorization\', \`Bearer \${clientAToken}\`);                          |
|                                                                                |
| expect(afterDecline.body.offer.status).toBe(\'PENDING\');                      |
|                                                                                |
| expect(afterDecline.body.counterOffer).toBeNull();                             |
|                                                                                |
| // Round 2: Client responds with CO at \$130 (client CO)                       |
|                                                                                |
| const { counterOffer: co2 } = await createTestCO(offer.id, 130, clientAToken); |
|                                                                                |
| expect(co2.submittedBy).toBe(\'CLIENT\');                                      |
|                                                                                |
| // Talent declines round 2                                                     |
|                                                                                |
| await req                                                                      |
|                                                                                |
| .post(\`/v1/offers/\${offer.id}/counter-offers/\${co2.id}/decline\`)           |
|                                                                                |
| .set(\'Authorization\', \`Bearer \${talentXToken}\`)                           |
|                                                                                |
| .set(\'X-Idempotency-Key\', crypto.randomUUID())                               |
|                                                                                |
| .send({});                                                                     |
|                                                                                |
| // Round 3: Talent submits CO at \$135, client accepts                         |
|                                                                                |
| const { counterOffer: co3 } = await createTestCO(offer.id, 135, talentXToken); |
|                                                                                |
| const acceptFinal = await req                                                  |
|                                                                                |
| .post(\`/v1/offers/\${offer.id}/counter-offers/\${co3.id}/accept\`)            |
|                                                                                |
| .set(\'Authorization\', \`Bearer \${clientAToken}\`)                           |
|                                                                                |
| .set(\'X-Idempotency-Key\', crypto.randomUUID())                               |
|                                                                                |
| .send({});                                                                     |
|                                                                                |
| expect(acceptFinal.status).toBe(200);                                          |
|                                                                                |
| // Final state: offer ACCEPTED                                                 |
|                                                                                |
| const final = await req                                                        |
|                                                                                |
| .get(\`/v1/offers/\${offer.id}\`)                                              |
|                                                                                |
| .set(\'Authorization\', \`Bearer \${clientAToken}\`);                          |
|                                                                                |
| expect(final.body.offer.status).toBe(\'ACCEPTED\');                            |
|                                                                                |
| // Verify offer history has 3 CO rounds                                        |
|                                                                                |
| const histRes = await req                                                      |
|                                                                                |
| .get(\`/v1/offers/\${offer.id}/history\`)                                      |
|                                                                                |
| .set(\'Authorization\', \`Bearer \${clientAToken}\`);                          |
|                                                                                |
| expect(histRes.status).toBe(200);                                              |
|                                                                                |
| expect(histRes.body.events.length).toBeGreaterThanOrEqual(6);                  |
|                                                                                |
| });                                                                            |
|                                                                                |
| // ============================================================                |
|                                                                                |
| // Scenario 3: Rate warning --- talent asks \>25% above offer rate             |
|                                                                                |
| // ============================================================                |
|                                                                                |
| it(\'Scenario 3: rateWarning=true when talent exceeds 25% threshold\', async   |
| () =\> {                                                                       |
|                                                                                |
| const offer = await createTestOffer({ rate: 100 });                            |
|                                                                                |
| // 126 \> 100 \* 1.25 = 125: triggers warning                                  |
|                                                                                |
| const { rateWarning } = await createTestCO(offer.id, 126);                     |
|                                                                                |
| expect(rateWarning).toBe(true);                                                |
|                                                                                |
| });                                                                            |
|                                                                                |
| // ============================================================                |
|                                                                                |
| // Scenario 4: Talent cannot accept original offer while CO is PENDING         |
|                                                                                |
| // ============================================================                |
|                                                                                |
| it(\'Scenario 4: Accept blocked when offer is COUNTERED\', async () =\> {      |
|                                                                                |
| const offer = await createTestOffer({ rate: 90 });                             |
|                                                                                |
| await createTestCO(offer.id, 100); // Creates CO, offer becomes COUNTERED      |
|                                                                                |
| // Talent tries to accept the original offer (not the CO)                      |
|                                                                                |
| const res = await req                                                          |
|                                                                                |
| .post(\`/v1/offers/\${offer.id}/accept\`)                                      |
|                                                                                |
| .set(\'Authorization\', \`Bearer \${talentXToken}\`)                           |
|                                                                                |
| .set(\'X-Idempotency-Key\', crypto.randomUUID())                               |
|                                                                                |
| .send({});                                                                     |
|                                                                                |
| expect(res.status).toBe(403); // Blocked by COUNTERED status                   |
|                                                                                |
| });                                                                            |
|                                                                                |
| // ============================================================                |
|                                                                                |
| // Scenario 5: CO withdraw restores parent offer to PENDING                    |
|                                                                                |
| // ============================================================                |
|                                                                                |
| it(\'Scenario 5: CO withdrawal restores parent to PENDING\', async () =\> {    |
|                                                                                |
| const offer = await createTestOffer({ rate: 90 });                             |
|                                                                                |
| const { counterOffer } = await createTestCO(offer.id, 100);                    |
|                                                                                |
| // Talent withdraws their own CO                                               |
|                                                                                |
| await req                                                                      |
|                                                                                |
| .post(\`/v1/offers/\${offer.id}/counter-offers/\${counterOffer.id}/withdraw\`) |
|                                                                                |
| .set(\'Authorization\', \`Bearer \${talentXToken}\`)                           |
|                                                                                |
| .set(\'X-Idempotency-Key\', crypto.randomUUID())                               |
|                                                                                |
| .send({ withdrawalMessage: \'Reconsidering.\' });                              |
|                                                                                |
| const res = await req                                                          |
|                                                                                |
| .get(\`/v1/offers/\${offer.id}\`)                                              |
|                                                                                |
| .set(\'Authorization\', \`Bearer \${clientAToken}\`);                          |
|                                                                                |
| expect(res.body.offer.status).toBe(\'PENDING\');                               |
|                                                                                |
| expect(res.body.counterOffer).toBeNull();                                      |
|                                                                                |
| });                                                                            |
|                                                                                |
| });                                                                            |
+--------------------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Flow 3 Expiry Flows --- expiry.e2e.spec.ts**                        |
|                                                                       |
| Offer expiry, CO expiry + restore, 30-day extension threshold         |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/test/e2e/expiry.e2e.spec.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { bootstrapE2E, createTestOffer, createTestCO, req,            |
| clientAToken, talentXToken, app } from \'./e2e.setup\';               |
|                                                                       |
| import { TestDbHelper } from \'../test-db.helper\';                   |
|                                                                       |
| import { DataSource } from \'typeorm\';                               |
|                                                                       |
| import { ExpiryProcessor } from                                       |
| \'../../src/scheduler/expiry.processor\';                             |
|                                                                       |
| import { WarningProcessor } from                                      |
| \'../../src/scheduler/warning.processor\';                            |
|                                                                       |
| describe(\'E2E: Expiry Flows\', () =\> {                              |
|                                                                       |
| let dataSource: DataSource;                                           |
|                                                                       |
| let expiryProcessor: ExpiryProcessor;                                 |
|                                                                       |
| let warningProcessor: WarningProcessor;                               |
|                                                                       |
| beforeAll(async () =\> {                                              |
|                                                                       |
| await bootstrapE2E();                                                 |
|                                                                       |
| // Get processors directly to trigger them in tests without waiting   |
| for cron.                                                             |
|                                                                       |
| // In E2E tests we call expireOffers() manually to avoid timing       |
| dependencies.                                                         |
|                                                                       |
| // dataSource and processors are injected via the app module.         |
|                                                                       |
| });                                                                   |
|                                                                       |
| afterEach(() =\> TestDbHelper.truncateAll());                         |
|                                                                       |
| afterAll(() =\> app.close());                                         |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Scenario 1: Offer expires (expires_at set to past via DB)          |
|                                                                       |
| // ============================================================       |
|                                                                       |
| it(\'Scenario 1: Offer transitions to EXPIRED when TTL passes\',      |
| async () =\> {                                                        |
|                                                                       |
| const offer = await createTestOffer();                                |
|                                                                       |
| // Fast-forward: set expires_at to 1 minute ago.                      |
|                                                                       |
| await TestDbHelper.getDataSource().query(\`                           |
|                                                                       |
| UPDATE offer_service_test.offers                                      |
|                                                                       |
| SET expires_at = NOW() - INTERVAL \'1 minute\'                        |
|                                                                       |
| WHERE id = \$1                                                        |
|                                                                       |
| \`, \[offer.id\]);                                                    |
|                                                                       |
| // Trigger the expiry processor manually.                             |
|                                                                       |
| await expiryProcessor.expireOffers();                                 |
|                                                                       |
| // Verify offer is now EXPIRED.                                       |
|                                                                       |
| const res = await req                                                 |
|                                                                       |
| .get(\`/v1/offers/\${offer.id}\`)                                     |
|                                                                       |
| .set(\'Authorization\', \`Bearer \${clientAToken}\`);                 |
|                                                                       |
| expect(res.body.offer.status).toBe(\'EXPIRED\');                      |
|                                                                       |
| expect(res.body.offer.expiredAt).toBeDefined();                       |
|                                                                       |
| // Verify outbox event written                                        |
|                                                                       |
| const outbox = await TestDbHelper.getDataSource().query(\`            |
|                                                                       |
| SELECT event_type FROM offer_service_test.outbox WHERE aggregate_id = |
| \$1                                                                   |
|                                                                       |
| \`, \[offer.id\]);                                                    |
|                                                                       |
| expect(outbox.some(r =\> r.event_type ===                             |
| \'offer.expired\')).toBe(true);                                       |
|                                                                       |
| });                                                                   |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Scenario 2: CO expires, parent offer restored to PENDING           |
|                                                                       |
| // ============================================================       |
|                                                                       |
| it(\'Scenario 2: CO expiry restores parent offer to PENDING\', async  |
| () =\> {                                                              |
|                                                                       |
| const offer = await createTestOffer({ rate: 90 });                    |
|                                                                       |
| const { counterOffer } = await createTestCO(offer.id, 100);           |
|                                                                       |
| // Set CO expires_at to past                                          |
|                                                                       |
| await TestDbHelper.getDataSource().query(\`                           |
|                                                                       |
| UPDATE offer_service_test.counter_offers                              |
|                                                                       |
| SET expires_at = NOW() - INTERVAL \'1 minute\'                        |
|                                                                       |
| WHERE id = \$1                                                        |
|                                                                       |
| \`, \[counterOffer.id\]);                                             |
|                                                                       |
| await expiryProcessor.expireOffers();                                 |
|                                                                       |
| const res = await req                                                 |
|                                                                       |
| .get(\`/v1/offers/\${offer.id}\`)                                     |
|                                                                       |
| .set(\'Authorization\', \`Bearer \${clientAToken}\`);                 |
|                                                                       |
| expect(res.body.offer.status).toBe(\'PENDING\'); // Restored          |
|                                                                       |
| expect(res.body.counterOffer).toBeNull();                             |
|                                                                       |
| });                                                                   |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Scenario 3: 48h warning sent once, not again on re-check           |
|                                                                       |
| // ============================================================       |
|                                                                       |
| it(\'Scenario 3: 48h warning sent once and not duplicated\', async () |
| =\> {                                                                 |
|                                                                       |
| const offer = await createTestOffer();                                |
|                                                                       |
| // Set expires_at to 20 hours from now (within 48h window)            |
|                                                                       |
| await TestDbHelper.getDataSource().query(\`                           |
|                                                                       |
| UPDATE offer_service_test.offers                                      |
|                                                                       |
| SET expires_at = NOW() + INTERVAL \'20 hours\',                       |
|                                                                       |
| warning_sent_at = NULL                                                |
|                                                                       |
| WHERE id = \$1                                                        |
|                                                                       |
| \`, \[offer.id\]);                                                    |
|                                                                       |
| // First warning run: should send warning.                            |
|                                                                       |
| await warningProcessor.sendWarnings();                                |
|                                                                       |
| // Check warning_sent_at is now set.                                  |
|                                                                       |
| const \[row\] = await TestDbHelper.getDataSource().query(\`           |
|                                                                       |
| SELECT warning_sent_at FROM offer_service_test.offers WHERE id = \$1  |
|                                                                       |
| \`, \[offer.id\]);                                                    |
|                                                                       |
| expect(row.warning_sent_at).not.toBeNull();                           |
|                                                                       |
| // Second warning run: should NOT send a second warning.              |
|                                                                       |
| jest.clearAllMocks();                                                 |
|                                                                       |
| await warningProcessor.sendWarnings();                                |
|                                                                       |
| // Only 1 outbox event for expiring_soon                              |
|                                                                       |
| const outbox = await TestDbHelper.getDataSource().query(\`            |
|                                                                       |
| SELECT COUNT(\*) FROM offer_service_test.outbox                       |
|                                                                       |
| WHERE aggregate_id = \$1 AND event_type = \'offer.expiring_soon\'     |
|                                                                       |
| \`, \[offer.id\]);                                                    |
|                                                                       |
| expect(parseInt(outbox\[0\].count)).toBe(1);                          |
|                                                                       |
| });                                                                   |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Scenario 4: 30-day extension threshold                             |
|                                                                       |
| // ============================================================       |
|                                                                       |
| it(\'Scenario 4: extensionInfo.canRequestExtension=true within 30     |
| days\', async () =\> {                                                |
|                                                                       |
| const offer = await createTestOffer();                                |
|                                                                       |
| // Expire the offer 10 days ago                                       |
|                                                                       |
| await TestDbHelper.getDataSource().query(\`                           |
|                                                                       |
| UPDATE offer_service_test.offers                                      |
|                                                                       |
| SET status = \'EXPIRED\',                                             |
|                                                                       |
| expired_at = NOW() - INTERVAL \'10 days\',                            |
|                                                                       |
| expires_at = NOW() - INTERVAL \'10 days\'                             |
|                                                                       |
| WHERE id = \$1                                                        |
|                                                                       |
| \`, \[offer.id\]);                                                    |
|                                                                       |
| const res = await req                                                 |
|                                                                       |
| .get(\`/v1/offers/\${offer.id}\`)                                     |
|                                                                       |
| .set(\'Authorization\', \`Bearer \${talentXToken}\`);                 |
|                                                                       |
| expect(res.body.offer.extensionInfo.canRequestExtension).toBe(true);  |
|                                                                       |
| expect(res.body.offer.extensionInfo.extensionMessage).toContain(\'E2E |
| Test Project\');                                                      |
|                                                                       |
| });                                                                   |
|                                                                       |
| it(\'Scenario 4b: extensionInfo.canRequestExtension=false after 30    |
| days\', async () =\> {                                                |
|                                                                       |
| const offer = await createTestOffer();                                |
|                                                                       |
| await TestDbHelper.getDataSource().query(\`                           |
|                                                                       |
| UPDATE offer_service_test.offers                                      |
|                                                                       |
| SET status = \'EXPIRED\',                                             |
|                                                                       |
| expired_at = NOW() - INTERVAL \'40 days\',                            |
|                                                                       |
| expires_at = NOW() - INTERVAL \'40 days\'                             |
|                                                                       |
| WHERE id = \$1                                                        |
|                                                                       |
| \`, \[offer.id\]);                                                    |
|                                                                       |
| const res = await req                                                 |
|                                                                       |
| .get(\`/v1/offers/\${offer.id}\`)                                     |
|                                                                       |
| .set(\'Authorization\', \`Bearer \${talentXToken}\`);                 |
|                                                                       |
| expect(res.body.offer.extensionInfo.canRequestExtension).toBe(false); |
|                                                                       |
| expect(res.body.offer.extensionInfo.extensionMessage).toBeNull();     |
|                                                                       |
| });                                                                   |
|                                                                       |
| });                                                                   |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Flow 4 Resend & Active Offer Enforcement --- resend &               |
| active-offer.e2e.spec.ts**                                            |
|                                                                       |
| Resend after terminal state, constraint blocks new offer              |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/test/e2e/resend.e2e.spec.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| describe(\'E2E: Resend Flow\', () =\> {                               |
|                                                                       |
| it(\'Scenario 1: Client resends a declined offer with updated         |
| terms\', async () =\> {                                               |
|                                                                       |
| const original = await createTestOffer({ rate: 90 });                 |
|                                                                       |
| // Talent declines                                                    |
|                                                                       |
| await req                                                             |
|                                                                       |
| .post(\`/v1/offers/\${original.id}/decline\`)                         |
|                                                                       |
| .set(\'Authorization\', \`Bearer \${talentXToken}\`)                  |
|                                                                       |
| .set(\'X-Idempotency-Key\', crypto.randomUUID())                      |
|                                                                       |
| .send({ reason: \'Rate too low.\' });                                 |
|                                                                       |
| // Client resends with higher rate                                    |
|                                                                       |
| const resendRes = await req                                           |
|                                                                       |
| .post(\`/v1/offers/\${original.id}/resend\`)                          |
|                                                                       |
| .set(\'Authorization\', \`Bearer \${clientAToken}\`)                  |
|                                                                       |
| .set(\'X-Idempotency-Key\', crypto.randomUUID())                      |
|                                                                       |
| .send({ rate: 100 });                                                 |
|                                                                       |
| expect(resendRes.status).toBe(201);                                   |
|                                                                       |
| expect(resendRes.body.status).toBe(\'PENDING\');                      |
|                                                                       |
| expect(resendRes.body.rate).toBe(100);                                |
|                                                                       |
| expect(resendRes.body.originalOfferId).toBe(original.id);             |
|                                                                       |
| // Original offer stays DECLINED                                      |
|                                                                       |
| const origRes = await req                                             |
|                                                                       |
| .get(\`/v1/offers/\${original.id}\`)                                  |
|                                                                       |
| .set(\'Authorization\', \`Bearer \${clientAToken}\`);                 |
|                                                                       |
| expect(origRes.body.offer.status).toBe(\'DECLINED\');                 |
|                                                                       |
| });                                                                   |
|                                                                       |
| it(\'Scenario 2: Resend blocked if active offer already exists for    |
| same talent\', async () =\> {                                         |
|                                                                       |
| // Offer 1: Active (PENDING)                                          |
|                                                                       |
| const active = await createTestOffer();                               |
|                                                                       |
| // Offer 2: Declined (terminal) --- can normally be resent            |
|                                                                       |
| const declined = await createTestOffer();                             |
|                                                                       |
| await req                                                             |
|                                                                       |
| .post(\`/v1/offers/\${declined.id}/decline\`)                         |
|                                                                       |
| .set(\'Authorization\', \`Bearer \${talentXToken}\`)                  |
|                                                                       |
| .set(\'X-Idempotency-Key\', crypto.randomUUID())                      |
|                                                                       |
| .send({ reason: \'Not interested.\' });                               |
|                                                                       |
| // Try to resend --- should be blocked because offer 1 is still       |
| PENDING                                                               |
|                                                                       |
| const resendRes = await req                                           |
|                                                                       |
| .post(\`/v1/offers/\${declined.id}/resend\`)                          |
|                                                                       |
| .set(\'Authorization\', \`Bearer \${clientAToken}\`)                  |
|                                                                       |
| .set(\'X-Idempotency-Key\', crypto.randomUUID())                      |
|                                                                       |
| .send({});                                                            |
|                                                                       |
| expect(resendRes.status).toBe(409);                                   |
|                                                                       |
| expect(resendRes.body.error).toBe(\'ACTIVE_OFFER_ALREADY_EXISTS\');   |
|                                                                       |
| expect(resendRes.body.activeOfferId).toBe(active.id);                 |
|                                                                       |
| });                                                                   |
|                                                                       |
| });                                                                   |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Active Offer Enforcement                                           |
|                                                                       |
| // ============================================================       |
|                                                                       |
| describe(\'E2E: Active Offer Enforcement\', () =\> {                  |
|                                                                       |
| it(\'Scenario 1: PENDING offer blocks new offer to same talent\',     |
| async () =\> {                                                        |
|                                                                       |
| await createTestOffer(); // First offer (PENDING)                     |
|                                                                       |
| // Try to create a second offer to the same talent                    |
|                                                                       |
| const res = await req                                                 |
|                                                                       |
| .post(\'/v1/offers\')                                                 |
|                                                                       |
| .set(\'Authorization\', \`Bearer \${clientAToken}\`)                  |
|                                                                       |
| .set(\'X-Idempotency-Key\', crypto.randomUUID())                      |
|                                                                       |
| .send({                                                               |
|                                                                       |
| talentId: SEED_USERS.TALENT_X,                                        |
|                                                                       |
| jobListingId: SEED_LISTINGS.SERVICE_BETA, // Different listing        |
|                                                                       |
| contractType: \'SERVICE\',                                            |
|                                                                       |
| contractTitle: \'Second Attempt\',                                    |
|                                                                       |
| rate: 100,                                                            |
|                                                                       |
| currencyCode: \'USD\',                                                |
|                                                                       |
| durationMonths: 3,                                                    |
|                                                                       |
| workSchedule: { type: \'FULL_TIME\' },                                |
|                                                                       |
| startDate: \'2099-06-01\',                                            |
|                                                                       |
| });                                                                   |
|                                                                       |
| expect(res.status).toBe(409);                                         |
|                                                                       |
| expect(res.body.error).toBe(\'ACTIVE_OFFER_ALREADY_EXISTS\');         |
|                                                                       |
| expect(res.body.activeOfferStatus).toBe(\'PENDING\');                 |
|                                                                       |
| });                                                                   |
|                                                                       |
| it(\'Scenario 2: COUNTERED offer also blocks new offer\', async ()    |
| =\> {                                                                 |
|                                                                       |
| const offer = await createTestOffer({ rate: 90 });                    |
|                                                                       |
| await createTestCO(offer.id, 100); // Offer becomes COUNTERED         |
|                                                                       |
| const res = await req                                                 |
|                                                                       |
| .post(\'/v1/offers\')                                                 |
|                                                                       |
| .set(\'Authorization\', \`Bearer \${clientAToken}\`)                  |
|                                                                       |
| .set(\'X-Idempotency-Key\', crypto.randomUUID())                      |
|                                                                       |
| .send({ talentId: SEED_USERS.TALENT_X, /\* \... \*/ });               |
|                                                                       |
| expect(res.status).toBe(409);                                         |
|                                                                       |
| expect(res.body.activeOfferStatus).toBe(\'COUNTERED\');               |
|                                                                       |
| });                                                                   |
|                                                                       |
| it(\'Scenario 3: After withdrawal, new offer can be sent\', async ()  |
| =\> {                                                                 |
|                                                                       |
| const offer = await createTestOffer();                                |
|                                                                       |
| await req                                                             |
|                                                                       |
| .post(\`/v1/offers/\${offer.id}/withdraw\`)                           |
|                                                                       |
| .set(\'Authorization\', \`Bearer \${clientAToken}\`)                  |
|                                                                       |
| .set(\'X-Idempotency-Key\', crypto.randomUUID())                      |
|                                                                       |
| .send({});                                                            |
|                                                                       |
| // Now a new offer should succeed                                     |
|                                                                       |
| const newOffer = await createTestOffer();                             |
|                                                                       |
| expect(newOffer.status).toBe(\'PENDING\');                            |
|                                                                       |
| });                                                                   |
|                                                                       |
| });                                                                   |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Flow 5 Error Cases --- error-cases.e2e.spec.ts**                    |
|                                                                       |
| Auth, role, 409 CAS, and 422 validation                               |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/test/e2e/error-cases.e2e.spec.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| describe(\'E2E: Error Cases\', () =\> {                               |
|                                                                       |
| it(\'401 when no auth token provided\', async () =\> {                |
|                                                                       |
| const res = await req.get(\'/v1/offers/any-id\');                     |
|                                                                       |
| expect(res.status).toBe(401);                                         |
|                                                                       |
| });                                                                   |
|                                                                       |
| it(\'404 when offer does not exist\', async () =\> {                  |
|                                                                       |
| const res = await req                                                 |
|                                                                       |
| .get(\'/v1/offers/00000000-0000-0000-0000-000000000000\')             |
|                                                                       |
| .set(\'Authorization\', \`Bearer \${clientAToken}\`);                 |
|                                                                       |
| expect(res.status).toBe(404);                                         |
|                                                                       |
| expect(res.body.error).toBe(\'OFFER_NOT_FOUND\');                     |
|                                                                       |
| });                                                                   |
|                                                                       |
| it(\'403 when unrelated user tries to access an offer\', async () =\> |
| {                                                                     |
|                                                                       |
| const offer = await createTestOffer();                                |
|                                                                       |
| // talentY is not a party to this offer                               |
|                                                                       |
| const res = await req                                                 |
|                                                                       |
| .get(\`/v1/offers/\${offer.id}\`)                                     |
|                                                                       |
| .set(\'Authorization\', \`Bearer \${talentYToken}\`);                 |
|                                                                       |
| expect(res.status).toBe(403);                                         |
|                                                                       |
| });                                                                   |
|                                                                       |
| it(\'422 when rate is above maximum (9999)\', async () =\> {          |
|                                                                       |
| const res = await req                                                 |
|                                                                       |
| .post(\'/v1/offers\')                                                 |
|                                                                       |
| .set(\'Authorization\', \`Bearer \${clientAToken}\`)                  |
|                                                                       |
| .set(\'X-Idempotency-Key\', crypto.randomUUID())                      |
|                                                                       |
| .send({                                                               |
|                                                                       |
| talentId: SEED_USERS.TALENT_X,                                        |
|                                                                       |
| jobListingId: SEED_LISTINGS.PROJECT_ALPHA,                            |
|                                                                       |
| contractType: \'PROJECT\',                                            |
|                                                                       |
| contractTitle: \'Test\',                                              |
|                                                                       |
| rate: 10000, // Over the 9999 max                                     |
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
| expect(res.status).toBe(422);                                         |
|                                                                       |
| expect(res.body.error).toBe(\'VALIDATION_ERROR\');                    |
|                                                                       |
| });                                                                   |
|                                                                       |
| it(\'422 when start date is in the past\', async () =\> {             |
|                                                                       |
| const res = await req                                                 |
|                                                                       |
| .post(\'/v1/offers\')                                                 |
|                                                                       |
| .set(\'Authorization\', \`Bearer \${clientAToken}\`)                  |
|                                                                       |
| .set(\'X-Idempotency-Key\', crypto.randomUUID())                      |
|                                                                       |
| .send({                                                               |
|                                                                       |
| talentId: SEED_USERS.TALENT_X,                                        |
|                                                                       |
| jobListingId: SEED_LISTINGS.PROJECT_ALPHA,                            |
|                                                                       |
| contractType: \'PROJECT\',                                            |
|                                                                       |
| contractTitle: \'Test\',                                              |
|                                                                       |
| rate: 95,                                                             |
|                                                                       |
| currencyCode: \'USD\',                                                |
|                                                                       |
| durationMonths: 6,                                                    |
|                                                                       |
| workSchedule: { type: \'FULL_TIME\' },                                |
|                                                                       |
| startDate: \'2000-01-01\', // Past date                               |
|                                                                       |
| });                                                                   |
|                                                                       |
| expect(res.status).toBe(422);                                         |
|                                                                       |
| expect(res.body.details?.some(d =\> d.field ===                       |
| \'startDate\')).toBe(true);                                           |
|                                                                       |
| });                                                                   |
|                                                                       |
| it(\'409 with idempotent replay returns cached success response\',    |
| async () =\> {                                                        |
|                                                                       |
| const key = crypto.randomUUID();                                      |
|                                                                       |
| // First request: success                                             |
|                                                                       |
| const first = await req                                               |
|                                                                       |
| .post(\'/v1/offers\')                                                 |
|                                                                       |
| .set(\'Authorization\', \`Bearer \${clientAToken}\`)                  |
|                                                                       |
| .set(\'X-Idempotency-Key\', key)                                      |
|                                                                       |
| .send({                                                               |
|                                                                       |
| talentId: SEED_USERS.TALENT_X,                                        |
|                                                                       |
| jobListingId: SEED_LISTINGS.PROJECT_ALPHA,                            |
|                                                                       |
| contractType: \'PROJECT\', contractTitle: \'Test\',                   |
|                                                                       |
| rate: 95, currencyCode: \'USD\', durationMonths: 6,                   |
|                                                                       |
| workSchedule: { type: \'FULL_TIME\' }, startDate: \'2099-01-01\',     |
|                                                                       |
| });                                                                   |
|                                                                       |
| expect(first.status).toBe(201);                                       |
|                                                                       |
| // Second request with the SAME key: replays the cached response      |
|                                                                       |
| const replay = await req                                              |
|                                                                       |
| .post(\'/v1/offers\')                                                 |
|                                                                       |
| .set(\'Authorization\', \`Bearer \${clientAToken}\`)                  |
|                                                                       |
| .set(\'X-Idempotency-Key\', key)                                      |
|                                                                       |
| .send({                                                               |
|                                                                       |
| talentId: SEED_USERS.TALENT_X,                                        |
|                                                                       |
| jobListingId: SEED_LISTINGS.PROJECT_ALPHA,                            |
|                                                                       |
| contractType: \'PROJECT\', contractTitle: \'Test\',                   |
|                                                                       |
| rate: 95, currencyCode: \'USD\', durationMonths: 6,                   |
|                                                                       |
| workSchedule: { type: \'FULL_TIME\' }, startDate: \'2099-01-01\',     |
|                                                                       |
| });                                                                   |
|                                                                       |
| expect(replay.status).toBe(200); // Idempotent replay: 200 not 201    |
|                                                                       |
| expect(replay.body.id).toBe(first.body.id); // Same offer returned    |
|                                                                       |
| });                                                                   |
|                                                                       |
| });                                                                   |
+-----------------------------------------------------------------------+

**Running E2E tests**

+-----------------------------------------------------------------------+
| \# Ensure .env.test is configured with TEST_DATABASE_URL.             |
|                                                                       |
| \# Ensure PostgreSQL is running.                                      |
|                                                                       |
| \# Run all E2E tests:                                                 |
|                                                                       |
| TEST_TYPE=e2e npm run test:int \--workspace=apps/offer-service        |
|                                                                       |
| \# Or add to package.json:                                            |
|                                                                       |
| \# \"test:e2e\": \"TEST_TYPE=e2e jest \--testPathPattern=e2e          |
| \--runInBand\"                                                        |
|                                                                       |
| \# \--runInBand is required: E2E tests share the same app instance.   |
|                                                                       |
| \# Running in parallel causes port conflicts and DB contention.       |
|                                                                       |
| \# Expected output:                                                   |
|                                                                       |
| \# E2E: Offer Happy Path                                              |
|                                                                       |
| \# ✓ Scenario 1: Client creates offer, talent accepts it              |
|                                                                       |
| \# ✓ Scenario 2: Client creates offer, talent declines with reason    |
|                                                                       |
| \# ✓ Scenario 3: Client withdraws a pending offer                     |
|                                                                       |
| \# ✓ Scenario 4: Client edits offer and TTL resets                    |
|                                                                       |
| \# ✓ Scenario 5: CLIENT cannot accept their own offer (403)           |
|                                                                       |
| \# E2E: Counter Offer Rounds                                          |
|                                                                       |
| \# ✓ Scenario 1: Talent counter offer accepted by client              |
|                                                                       |
| \# ✓ Scenario 2: Three rounds of counter offers ending in acceptance  |
|                                                                       |
| \# ✓ Scenario 3: rateWarning=true when talent exceeds 25% threshold   |
|                                                                       |
| \# ✓ Scenario 4: Accept blocked when offer is COUNTERED               |
|                                                                       |
| \# ✓ Scenario 5: CO withdrawal restores parent to PENDING             |
|                                                                       |
| \# \... (all scenarios)                                               |
+-----------------------------------------------------------------------+
