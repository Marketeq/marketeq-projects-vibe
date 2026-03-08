**[MARKETEQ PLATFORM --- BACKEND DOCUMENTATION]{.smallcaps}**

**earnings-service**

ES-16 --- QA & Testing Guide

  -----------------------------------------------------------------------
  **Property**        **Value**
  ------------------- ---------------------------------------------------
  **Document**        ES-16 --- QA & Testing Guide

  **Version**         1.0

  **Test frameworks** Jest (unit/integration), Supertest (E2E), k6
                      (performance)

  **Coverage          80% line coverage minimum per module; 100% on
  requirement**       balance mutation paths

  **Performance       Balance API \<100ms P95 \| Earnings list \<200ms
  targets**           P95 \| Export sync \<3s P95

  **Prerequisites**   ES-01 through ES-15
  -----------------------------------------------------------------------

# **1. Unit Test Coverage Requirements**

  -------------------------------------------------------------------------------------
  **Module**                  **Min line   **Min branch **Critical paths --- must be
                              coverage**   coverage**   100%**
  --------------------------- ------------ ------------ -------------------------------
  **BalanceService**          85%          80%          getBalance() cache-hit path,
                                                        cache-miss path, \$0 response,
                                                        404 new contractor

  **EarningsService**         80%          75%          mapRowWithCurrency(),
                                                        feePercent derivation, all
                                                        three view modes
                                                        (daily/weekly/monthly)

  **CurrencyService**         90%          85%          All 5 fallback chain steps,
                                                        cross-rate derivation,
                                                        emergency rate path, rounding

  **GeoService**              80%          75%          Private IP guard, unknown
                                                        country fallback to
                                                        DEFAULT_CURRENCY

  **CacheService**            90%          85%          getBalance() miss→null, version
                                                        mismatch→null, Redis
                                                        error→null, setBalance() Redis
                                                        error swallowed,
                                                        invalidateBalance() Redis error
                                                        swallowed

  **ConsumersModule**         85%          80%          Idempotency guard (duplicate →
                                                        skip), retry backoff, DLQ
                                                        routing after max retries

  **PublishersModule**        85%          80%          publishBalanceUpdated()
                                                        confirm=true path, threshold
                                                        Redis guard (SET NX win + lose)

  **ExportService**           80%          75%          Sync path (\<5000 rows), async
                                                        path (\>=5000), row limit
                                                        rejection (\>500000)

  **CsvBuilder**              85%          80%          RFC 4180 escaping (comma,
                                                        quote, newline in field),
                                                        legacy entry (no fee data),
                                                        zero-fee entry

  **GlobalExceptionFilter**   90%          85%          errorCode extraction from
                                                        EarningsError, fallback
                                                        ERR_EARNINGS_INTERNAL, 500
                                                        stack log
  -------------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Coverage enforcement**                                              |
|                                                                       |
| Jest coverage thresholds are set in jest.config.ts per module using   |
| coverageThreshold.                                                    |
|                                                                       |
| CI pipeline blocks merge if any module falls below its threshold.     |
|                                                                       |
| Coverage reports are published to the internal dashboard after every  |
| main branch push.                                                     |
+=======================================================================+

# **2. Unit Test Patterns**

## **2.1 CurrencyService --- fallback chain unit tests**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // \_\_tests\_\_/currency.service.spec.ts                             |
|                                                                       |
| describe(\'CurrencyService.getRate()\', () =\> {                      |
|                                                                       |
| it(\'returns Redis hit without calling FX API\', async () =\> {       |
|                                                                       |
| redisMock.get.mockResolvedValue(\'83.42000000\');                     |
|                                                                       |
| const result = await svc.getRate(\'USD\', \'INR\');                   |
|                                                                       |
| expect(result.source).toBe(\'redis\');                                |
|                                                                       |
| expect(fetchMock).not.toHaveBeenCalled();                             |
|                                                                       |
| });                                                                   |
|                                                                       |
| it(\'calls primary API on Redis miss, writes to Redis\', async () =\> |
| {                                                                     |
|                                                                       |
| redisMock.get.mockResolvedValue(null);                                |
|                                                                       |
| fetchMock.mockResolvedValueOnce(primaryResponse);                     |
|                                                                       |
| const result = await svc.getRate(\'USD\', \'INR\');                   |
|                                                                       |
| expect(result.source).toBe(\'primary\');                              |
|                                                                       |
| expect(redisMock.setex).toHaveBeenCalledWith(\'fx:USD:INR\',          |
| expect.any(Number), expect.any(String));                              |
|                                                                       |
| });                                                                   |
|                                                                       |
| it(\'falls through to Frankfurter when primary is down\', async ()    |
| =\> {                                                                 |
|                                                                       |
| redisMock.get.mockResolvedValue(null);                                |
|                                                                       |
| fetchMock.mockRejectedValueOnce(new Error(\'ECONNREFUSED\')); //      |
| primary fails                                                         |
|                                                                       |
| fetchMock.mockResolvedValueOnce(frankfurterResponse);                 |
|                                                                       |
| const result = await svc.getRate(\'USD\', \'INR\');                   |
|                                                                       |
| expect(result.source).toBe(\'fallback\');                             |
|                                                                       |
| });                                                                   |
|                                                                       |
| it(\'serves stale DB rate when both APIs are down\', async () =\> {   |
|                                                                       |
| redisMock.get.mockResolvedValue(null);                                |
|                                                                       |
| fetchMock.mockRejectedValue(new Error(\'timeout\'));                  |
|                                                                       |
| dbMock.findOne.mockResolvedValue({ rate: \'82.5\', fetchedAt:         |
| recentDate });                                                        |
|                                                                       |
| const result = await svc.getRate(\'USD\', \'INR\');                   |
|                                                                       |
| expect(result.source).toBe(\'db_cache\');                             |
|                                                                       |
| expect(result.stale).toBe(true);                                      |
|                                                                       |
| });                                                                   |
|                                                                       |
| it(\'applies emergency rate 1.0 when all sources exhausted\', async   |
| () =\> {                                                              |
|                                                                       |
| redisMock.get.mockResolvedValue(null);                                |
|                                                                       |
| fetchMock.mockRejectedValue(new Error(\'timeout\'));                  |
|                                                                       |
| dbMock.findOne.mockResolvedValue(null);                               |
|                                                                       |
| const result = await svc.getRate(\'USD\', \'INR\');                   |
|                                                                       |
| expect(result.source).toBe(\'emergency\');                            |
|                                                                       |
| expect(result.rate).toBe(1.0);                                        |
|                                                                       |
| });                                                                   |
|                                                                       |
| it(\'rounds display amounts to whole integer\', async () =\> {        |
|                                                                       |
| const r = await svc.convertFromUsd(\'80.00\', \'INR\'); // rate =     |
| 83.42                                                                 |
|                                                                       |
| expect(r.amount).toBe(\'6674\'); // Math.round(80 \* 83.42)           |
|                                                                       |
| expect(r.amount).not.toContain(\'.\');                                |
|                                                                       |
| });                                                                   |
|                                                                       |
| });                                                                   |
+=======================================================================+

## **2.2 CacheService --- Redis unavailability unit tests**

+----------------------------------------------------------------------------+
| typescript                                                                 |
+----------------------------------------------------------------------------+
| describe(\'CacheService\', () =\> {                                        |
|                                                                            |
| it(\'returns null on Redis GET error --- does not throw\', async () =\> {  |
|                                                                            |
| redisMock.get.mockRejectedValue(new Error(\'ECONNREFUSED\'));              |
|                                                                            |
| const result = await svc.getBalance(\'contractor-uuid\');                  |
|                                                                            |
| expect(result).toBeNull();                                                 |
|                                                                            |
| });                                                                        |
|                                                                            |
| it(\'treats version mismatch as cache miss\', async () =\> {               |
|                                                                            |
| redisMock.get.mockResolvedValue(JSON.stringify({ \...entry, cacheVersion:  |
| 0 }));                                                                     |
|                                                                            |
| const result = await svc.getBalance(\'contractor-uuid\');                  |
|                                                                            |
| expect(result).toBeNull();                                                 |
|                                                                            |
| });                                                                        |
|                                                                            |
| it(\'swallows Redis error in setBalance --- does not throw\', async () =\> |
| {                                                                          |
|                                                                            |
| redisMock.setex.mockRejectedValue(new Error(\'OOM\'));                     |
|                                                                            |
| await expect(svc.setBalance(\'contractor-uuid\',                           |
| entry)).resolves.not.toThrow();                                            |
|                                                                            |
| });                                                                        |
|                                                                            |
| it(\'swallows Redis error in invalidateBalance --- does not throw\', async |
| () =\> {                                                                   |
|                                                                            |
| redisMock.del.mockRejectedValue(new Error(\'ECONNREFUSED\'));              |
|                                                                            |
| await                                                                      |
| expect(svc.invalidateBalance(\'contractor-uuid\')).resolves.not.toThrow(); |
|                                                                            |
| });                                                                        |
|                                                                            |
| });                                                                        |
+============================================================================+

# **3. Integration Test Scenarios**

Integration tests use a real PostgreSQL and Redis instance (Docker
Compose test profile). RabbitMQ is simulated using the RabbitMQ
simulator described in §5. Tests run against a real NestJS application
instance via Supertest.

## **3.1 Event → balance update flow**

+--------------------------------------------------------------------------+
| typescript                                                               |
+--------------------------------------------------------------------------+
| describe(\'transaction.created → balance update\', () =\> {              |
|                                                                          |
| it(\'creates balance_snapshots row and updates Redis on first            |
| transaction\', async () =\> {                                            |
|                                                                          |
| // Arrange: no balance_snapshots row exists for contractor               |
|                                                                          |
| const contractorId = uuidv4();                                           |
|                                                                          |
| const event = buildTransactionCreatedEvent({ contractorId, netAmountUsd: |
| \'80.00\' });                                                            |
|                                                                          |
| // Act: publish event to consumer                                        |
|                                                                          |
| await consumer.process(event);                                           |
|                                                                          |
| // Assert: DB row created                                                |
|                                                                          |
| const snap = await db.findOne(BalanceSnapshot, { where: { contractorId } |
| });                                                                      |
|                                                                          |
| expect(snap.availableBalance).toBe(\'80.00000000\');                     |
|                                                                          |
| expect(snap.totalEarnedUsd).toBe(\'80.00000000\');                       |
|                                                                          |
| // Assert: Redis invalidated (key deleted after write)                   |
|                                                                          |
| expect(redisSpy.del).toHaveBeenCalledWith(\`balance:\${contractorId}\`); |
|                                                                          |
| // Assert: balance.updated event published                               |
|                                                                          |
| expect(publisherSpy.publishBalanceUpdated).toHaveBeenCalledWith(         |
|                                                                          |
| expect.objectContaining({ contractorId, delta: \'80.00\' })              |
|                                                                          |
| );                                                                       |
|                                                                          |
| });                                                                      |
|                                                                          |
| it(\'does not duplicate on replay of same eventId\', async () =\> {      |
|                                                                          |
| const event = buildTransactionCreatedEvent({ eventId: \'fixed-uuid\' }); |
|                                                                          |
| await consumer.process(event); // first delivery                         |
|                                                                          |
| await consumer.process(event); // duplicate                              |
|                                                                          |
| const rows = await db.find(EarningsCache, { where: { eventId:            |
| \'fixed-uuid\' } });                                                     |
|                                                                          |
| expect(rows).toHaveLength(1); // idempotent                              |
|                                                                          |
| });                                                                      |
|                                                                          |
| it(\'fires threshold event exactly once when YTD crosses \$600\', async  |
| () =\> {                                                                 |
|                                                                          |
| // Seed existing earnings: \$560 YTD                                     |
|                                                                          |
| await seedEarnings(contractorId, { netAmountUsd: \'560.00\', year:       |
| currentYear });                                                          |
|                                                                          |
| // Trigger: new \$80 entry pushes YTD to \$640                           |
|                                                                          |
| await consumer.process(buildTransactionCreatedEvent({ contractorId,      |
| netAmountUsd: \'80.00\' }));                                             |
|                                                                          |
| expect(publisherSpy.publishThresholdReached).toHaveBeenCalledTimes(1);   |
|                                                                          |
| expect(publisherSpy.publishThresholdReached).toHaveBeenCalledWith(       |
|                                                                          |
| expect.objectContaining({ contractorId, ytdTotalUsd: expect.any(String)  |
| })                                                                       |
|                                                                          |
| );                                                                       |
|                                                                          |
| // Second transaction same year --- threshold not fired again            |
|                                                                          |
| await consumer.process(buildTransactionCreatedEvent({ contractorId,      |
| netAmountUsd: \'50.00\' }));                                             |
|                                                                          |
| expect(publisherSpy.publishThresholdReached).toHaveBeenCalledTimes(1);   |
|                                                                          |
| });                                                                      |
|                                                                          |
| it(\'payout.completed decrements balance and invalidates cache\', async  |
| () =\> {                                                                 |
|                                                                          |
| await seedBalance(contractorId, { availableBalance: \'200.00\' });       |
|                                                                          |
| await redisClient.set(\`balance:\${contractorId}\`,                      |
| JSON.stringify(cachedEntry));                                            |
|                                                                          |
| await payoutConsumer.process(buildPayoutCompletedEvent({ contractorId,   |
| amount: \'150.00\' }));                                                  |
|                                                                          |
| const snap = await db.findOne(BalanceSnapshot, { where: { contractorId } |
| });                                                                      |
|                                                                          |
| expect(snap.availableBalance).toBe(\'50.00000000\');                     |
|                                                                          |
| expect(await redisClient.get(\`balance:\${contractorId}\`)).toBeNull();  |
| // cache invalidated                                                     |
|                                                                          |
| });                                                                      |
|                                                                          |
| it(\'balance never goes below zero on payout.completed\', async () =\> { |
|                                                                          |
| await seedBalance(contractorId, { availableBalance: \'20.00\' });        |
|                                                                          |
| await payoutConsumer.process(buildPayoutCompletedEvent({ contractorId,   |
| amount: \'150.00\' }));                                                  |
|                                                                          |
| const snap = await db.findOne(BalanceSnapshot, { where: { contractorId } |
| });                                                                      |
|                                                                          |
| expect(parseFloat(snap.availableBalance)).toBeGreaterThanOrEqual(0);     |
|                                                                          |
| });                                                                      |
|                                                                          |
| });                                                                      |
+==========================================================================+

## **3.2 Balance API integration scenarios**

  --------------------------------------------------------------------------------------
  **Scenario**       **Setup**              **Expected response**
  ------------------ ---------------------- --------------------------------------------
  **Cache hit**      Seed                   200\. cachedAt matches Redis entry. No DB
                     balance_snapshots.     query fired (verify via query spy).
                     Seed Redis key.        

  **Cache miss → DB  Seed                   200\. Redis key exists after response. Next
  read → cache       balance_snapshots. No  call is a cache hit.
  write**            Redis key.             

  **New contractor   No balance_snapshots   404\.
  (no row)**         row.                   errorCode=ERR_EARNINGS_BALANCE_NOT_FOUND.

  **Redis down, DB   Stop Redis container.  200\. Balance from DB. WARN log emitted. No
  available**                               500.

  **Redis down, DB   Stop both.             503\. errorCode=ERR_EARNINGS_DB_UNAVAILABLE.
  down**                                    

  **Expired JWT**    Send request with      401\.
                     expired JWT.           errorCode=ERR_EARNINGS_AUTH_TOKEN_EXPIRED.

  **Wrong role       Send JWT with          403\. errorCode=ERR_EARNINGS_WRONG_ROLE.
  (client JWT)**     role=client.           
  --------------------------------------------------------------------------------------

# **4. E2E Test Flows**

E2E tests run against the full Docker Compose stack: PostgreSQL, Redis,
RabbitMQ, fx-api container, earnings-service. They test complete user
journeys from HTTP request to DB state change.

  --------------------------------------------------------------------------------
  **Flow**         **Steps**                          **Pass criteria**
  ---------------- ---------------------------------- ----------------------------
  **New contractor 1\. GET /v1/earnings/balance →     Balance shows netAmountUsd
  first earnings** 4042. Publish                      from event. Redis key
                   transaction.created3. GET          exists.
                   /v1/earnings/balance → 200         earnings.balance.updated
                                                      published.

  **Full payout    1\. Seed \$200 balance2. Publish   Balance = \$50. Cache
  cycle**          payout.completed (\$150)3. GET     invalidated.
                   /v1/earnings/balance               earnings.balance.updated
                                                      published with
                                                      delta=\"-150.00\".

  **YTD threshold  1\. Seed \$560 YTD2. Publish       Exactly one
  breach**         transaction.created (\$80)3. Check earnings.threshold.reached
                   published events                   published. Redis guard key
                                                      exists.

  **Sync CSV       1\. Seed 100 earnings rows2. GET   HTTP 200. Content-Type:
  export**         /v1/earnings/export?format=csv3.   text/csv. 21 columns. Date
                   Parse response                     format YYYY-MM-DD. No
                                                      decimals in display column.

  **Async export   1\. Seed 6000 rows2. GET           HTTP 202. Bull job created.
  flow**           /v1/earnings/export3. Poll Bull    R2 key exists after job.
                   queue4. Wait for job completion    earnings.export.ready
                                                      published with presigned
                                                      URL.

  **FX fallback    1\. Stop fx-api container2. GET    Response stale:true or uses
  chain**          /v1/earnings/balance with          Frankfurter rate. No 500.
                   displayCurrency=INR                WARN log emitted.
  --------------------------------------------------------------------------------

# **5. RabbitMQ Event Simulation in Test Environment**

Tests use a lightweight in-process RabbitMQ simulator for unit and
integration tests. Full RabbitMQ is used only for E2E tests.

## **5.1 In-process simulator for unit/integration tests**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // test/helpers/rabbitmq-simulator.ts                                 |
|                                                                       |
| // Simulates RabbitMQ channel for consumer tests --- no real broker   |
| needed.                                                               |
|                                                                       |
| export class RabbitMQSimulator {                                      |
|                                                                       |
| private handlers: Map\<string, Function\> = new Map();                |
|                                                                       |
| // Register a consumer handler (called by BaseConsumer on init).      |
|                                                                       |
| registerConsumer(routingKey: string, handler: Function) {             |
|                                                                       |
| this.handlers.set(routingKey, handler);                               |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Publish a message to a routing key and await processing.           |
|                                                                       |
| async publish(routingKey: string, payload: object): Promise\<void\> { |
|                                                                       |
| const handler = this.handlers.get(routingKey);                        |
|                                                                       |
| if (!handler) throw new Error(\`No consumer registered for            |
| \${routingKey}\`);                                                    |
|                                                                       |
| const msg = {                                                         |
|                                                                       |
| content: Buffer.from(JSON.stringify(payload)),                        |
|                                                                       |
| fields: { routingKey },                                               |
|                                                                       |
| properties: { messageId: uuidv4() },                                  |
|                                                                       |
| };                                                                    |
|                                                                       |
| await handler(msg);                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Publish and expect DLQ routing (nack after max retries).           |
|                                                                       |
| async publishExpectDlq(routingKey: string, payload: object):          |
| Promise\<void\> {                                                     |
|                                                                       |
| // Override consumer to always throw, then publish.                   |
|                                                                       |
| // Verify the message is nacked after MAX_RETRIES attempts.           |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Usage in integration tests:                                        |
|                                                                       |
| const mq = new RabbitMQSimulator();                                   |
|                                                                       |
| await mq.publish(\'transaction.created\', { contractorId,             |
| netAmountUsd: \'80.00\', \... });                                     |
+=======================================================================+

## **5.2 Event payload builders**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // test/helpers/event-builders.ts                                     |
|                                                                       |
| // Canonical event payloads. Tests use these --- never hardcode       |
| payloads in test files.                                               |
|                                                                       |
| export function buildTransactionCreatedEvent(overrides = {}):         |
| TransactionCreatedPayload {                                           |
|                                                                       |
| return {                                                              |
|                                                                       |
| eventId: uuidv4(),                                                    |
|                                                                       |
| contractorId: uuidv4(),                                               |
|                                                                       |
| contractId: uuidv4(),                                                 |
|                                                                       |
| grossAmount: \'100.00\',                                              |
|                                                                       |
| feeAmount: \'20.00\',                                                 |
|                                                                       |
| netAmount: \'80.00\',                                                 |
|                                                                       |
| netAmountUsd: \'80.00\',                                              |
|                                                                       |
| currency: \'USD\',                                                    |
|                                                                       |
| fxRateToUsd: \'1.00000000\',                                          |
|                                                                       |
| entryType: \'screenshot\',                                            |
|                                                                       |
| workStartAt: new Date().toISOString(),                                |
|                                                                       |
| workEndAt: new Date(Date.now() + 3600000).toISOString(),              |
|                                                                       |
| durationMinutes: 60,                                                  |
|                                                                       |
| \...overrides,                                                        |
|                                                                       |
| };                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| export function buildPayoutCompletedEvent(overrides = {}) {           |
|                                                                       |
| return { eventId: uuidv4(), contractorId: uuidv4(), amount:           |
| \'100.00\', currency: \'USD\', \...overrides };                       |
|                                                                       |
| }                                                                     |
|                                                                       |
| export function buildPayoutFailedEvent(overrides = {}) {              |
|                                                                       |
| return { eventId: uuidv4(), contractorId: uuidv4(), amount:           |
| \'100.00\', \...overrides };                                          |
|                                                                       |
| }                                                                     |
|                                                                       |
| export function buildTransactionReversedEvent(overrides = {}) {       |
|                                                                       |
| return { eventId: uuidv4(), contractorId: uuidv4(), originalEventId:  |
| uuidv4(), netAmountUsd: \'80.00\', \...overrides };                   |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **5.3 Test data seeding**

+-------------------------------------------------------------------------------+
| typescript                                                                    |
+-------------------------------------------------------------------------------+
| // test/helpers/seed.ts                                                       |
|                                                                               |
| export async function seedBalance(ds: DataSource, contractorId: string,       |
| overrides = {}) {                                                             |
|                                                                               |
| return ds.getRepository(BalanceSnapshot).save({                               |
|                                                                               |
| contractorId,                                                                 |
|                                                                               |
| availableBalance: \'0.00\',                                                   |
|                                                                               |
| pendingHoldUsd: \'0.00\',                                                     |
|                                                                               |
| totalEarnedUsd: \'0.00\',                                                     |
|                                                                               |
| totalPaidOutUsd: \'0.00\',                                                    |
|                                                                               |
| displayCurrency: \'USD\',                                                     |
|                                                                               |
| localCurrency: \'USD\',                                                       |
|                                                                               |
| \...overrides,                                                                |
|                                                                               |
| });                                                                           |
|                                                                               |
| }                                                                             |
|                                                                               |
| export async function seedEarnings(ds: DataSource, contractorId: string,      |
| count: number, overrides = {}) {                                              |
|                                                                               |
| const rows = Array.from({ length: count }, (\_, i) =\> ({                     |
|                                                                               |
| contractorId,                                                                 |
|                                                                               |
| grossAmount: \'100.00\',                                                      |
|                                                                               |
| feeAmount: \'20.00\',                                                         |
|                                                                               |
| netAmount: \'80.00\',                                                         |
|                                                                               |
| netAmountUsd: \'80.00\',                                                      |
|                                                                               |
| currency: \'USD\',                                                            |
|                                                                               |
| fxRateToUsd: \'1.00000000\',                                                  |
|                                                                               |
| entryType: \'screenshot\',                                                    |
|                                                                               |
| status: \'confirmed\',                                                        |
|                                                                               |
| workStartAt: new Date(Date.now() - i \* 86400000),                            |
|                                                                               |
| workEndAt: new Date(Date.now() - i \* 86400000 + 3600000),                    |
|                                                                               |
| durationMinutes: 60,                                                          |
|                                                                               |
| \...overrides,                                                                |
|                                                                               |
| }));                                                                          |
|                                                                               |
| return ds.getRepository(EarningsCache).save(rows);                            |
|                                                                               |
| }                                                                             |
|                                                                               |
| // Seed for large export / performance tests                                  |
|                                                                               |
| export async function seedLargeHistory(ds: DataSource, contractorId: string,  |
| count: number) {                                                              |
|                                                                               |
| // Insert in batches of 500 to avoid statement size limits                    |
|                                                                               |
| const batchSize = 500;                                                        |
|                                                                               |
| for (let i = 0; i \< count; i += batchSize) {                                 |
|                                                                               |
| const batch = Array.from({ length: Math.min(batchSize, count - i) }, (\_, j)  |
| =\> ({ contractorId, \...minimalRow(i+j) }));                                 |
|                                                                               |
| await                                                                         |
| ds.createQueryBuilder().insert().into(EarningsCache).values(batch).execute(); |
|                                                                               |
| }                                                                             |
|                                                                               |
| }                                                                             |
+===============================================================================+

# **6. Edge Case Test Matrix**

Maps each ES-11 edge case to specific test assertions. Every cell is a
required test --- mark as covered in the test plan tracker.

  -----------------------------------------------------------------------------------------------
  **Edge case      **Unit test**                 **Integration test**              **E2E test**
  (ES-11)**                                                                        
  ---------------- ----------------------------- --------------------------------- --------------
  **01 --- \$0     BalanceService returns 200    Seed \$0 balance. GET /balance →  ---
  balance**        with \"0.00\" fields          200, not 404                      

  **02 --- No      BalanceService throws         No row → GET /balance → 404       Full flow: new
  earnings (new    NotFoundException when no row ERR_EARNINGS_BALANCE_NOT_FOUND.   user, no
  contractor)**                                  Internal GET → 200 zeros.         events → 404

  **03 --- FX      CurrencyService: concurrent   50 parallel GET /balance calls on ---
  thundering       calls resolve to same value.  cold cache → all 200, same        
  herd**           Redis written once per pair.  display amount                    

  **04 --- 50k+    ExportService: rows above     Seed 6000 rows → GET /export →    Seed 6000,
  rows**           EXPORT_SYNC_ROW_LIMIT → 202   202. Seed 600001 rows → GET       trigger async
                   path                          /export → 400.                    job, verify R2
                                                                                   upload

  **05 ---         CacheService: old             GET /balance with INR JWT → cache ---
  Currency change  displayCurrency served from   written. GET /balance with GBP    
  mid-session**    cache after change            JWT before TTL → cache hit        
                                                 returns INR                       

  **06 ---         ---                           Seed \$200. Publish               ---
  Concurrent reads                               payout.completed. Immediate GET   
  during payout**                                /balance → may show stale. After  
                                                 500ms → shows \$50.               

  **07 --- YTD     TransactionCreatedConsumer:   Parallel publish of two events    ---
  threshold race** two concurrent calls with     crossing \$600 → exactly one      
                   same contractor → SET NX      threshold event in published      
                   atomic → exactly one          queue                             
                   publishThresholdReached                                         

  **08 --- Geo     BalanceService: localCurrency JWT with localCurrency=GBP,       ---
  currency         from JWT applied to           displayCurrency=INR → GET         
  mismatch**       availableBalanceLocal,        /balance → both fields present    
                   displayCurrency applied to    and non-zero                      
                   availableBalanceDisplay                                         
  -----------------------------------------------------------------------------------------------

# **7. Performance Targets & Load Tests**

  --------------------------------------------------------------------------------
  **Endpoint**             **P50      **P95      **P99      **Test scenario**
                           target**   target**   target**   
  ------------------------ ---------- ---------- ---------- ----------------------
  **GET                    \< 10ms    \< 50ms    \< 100ms   100 VUs, 60s, all
  /v1/earnings/balance                                      requests hit warm
  (cache hit)**                                             cache

  **GET                    \< 50ms    \< 100ms   \< 200ms   100 VUs, 60s, Redis
  /v1/earnings/balance                                      flushed before each VU
  (cache miss)**                                            

  **GET /v1/earnings       \< 50ms    \< 200ms   \< 400ms   50 VUs, 60s, 1000 rows
  (list, page 1)**                                          seeded

  **GET                    \< 80ms    \< 200ms   \< 350ms   50 VUs, 60s, 10,000
  /v1/earnings/summary**                                    rows seeded per
                                                            contractor

  **GET /v1/earnings/:id   \< 20ms    \< 80ms    \< 150ms   100 VUs, 60s
  (detail)**                                                

  **GET                    \< 500ms   \< 3s      \< 5s      20 VUs, 60s
  /v1/earnings/export                                       
  (sync, 100 rows)**                                        

  **GET                    202 \<     202 \<     202 \<     10 VUs --- measures
  /v1/earnings/export      100ms      200ms      500ms      time to 202 only, not
  (async, 6000 rows)**                                      job completion
  --------------------------------------------------------------------------------

## **7.1 k6 load test --- balance endpoint**

+-----------------------------------------------------------------------+
| javascript                                                            |
+-----------------------------------------------------------------------+
| // tests/performance/balance.k6.js                                    |
|                                                                       |
| import http from \'k6/http\';                                         |
|                                                                       |
| import { check, sleep } from \'k6\';                                  |
|                                                                       |
| import { Rate, Trend } from \'k6/metrics\';                           |
|                                                                       |
| const errorRate = new Rate(\'errors\');                               |
|                                                                       |
| const cacheHitRate = new Rate(\'cache_hits\');                        |
|                                                                       |
| export const options = {                                              |
|                                                                       |
| stages: \[                                                            |
|                                                                       |
| { duration: \'10s\', target: 100 }, // ramp up                        |
|                                                                       |
| { duration: \'60s\', target: 100 }, // steady state                   |
|                                                                       |
| { duration: \'10s\', target: 0 }, // ramp down                        |
|                                                                       |
| \],                                                                   |
|                                                                       |
| thresholds: {                                                         |
|                                                                       |
| http_req_duration: \[\'p(95)\<100\'\], // P95 \< 100ms                |
|                                                                       |
| http_req_duration: \[\'p(99)\<200\'\], // P99 \< 200ms                |
|                                                                       |
| errors: \[\'rate\<0.01\'\], // \< 1% error rate                       |
|                                                                       |
| http_req_failed: \[\'rate\<0.01\'\],                                  |
|                                                                       |
| },                                                                    |
|                                                                       |
| };                                                                    |
|                                                                       |
| export default function () {                                          |
|                                                                       |
| const res = http.get(\`\${\_\_ENV.BASE_URL}/v1/earnings/balance\`, {  |
|                                                                       |
| headers: { Authorization: \`Bearer \${\_\_ENV.TEST_JWT}\` },          |
|                                                                       |
| });                                                                   |
|                                                                       |
| check(res, {                                                          |
|                                                                       |
| \'status 200\': r =\> r.status === 200,                               |
|                                                                       |
| \'has balance\': r =\> JSON.parse(r.body).availableBalance !==        |
| undefined,                                                            |
|                                                                       |
| \'no decimals\': r =\>                                                |
| !JSON.parse(r.body).availableBalanceDisplay.includes(\'.\'),          |
|                                                                       |
| });                                                                   |
|                                                                       |
| errorRate.add(res.status !== 200);                                    |
|                                                                       |
| cacheHitRate.add(res.headers\[\'X-Cache\'\] === \'HIT\');             |
|                                                                       |
| sleep(0.1);                                                           |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **7.2 Performance test data requirements**

  ------------------------------------------------------------------------
  **Test**           **Required seed data**   **Seed command**
  ------------------ ------------------------ ----------------------------
  **Balance cache    1 contractor with        npm run seed:balance \--
  hit P95**          balance_snapshots row +  \--count 1 \--warm-cache
                     warm Redis key           

  **Earnings list    1 contractor with 1,000  npm run seed:earnings \--
  P95**              confirmed earnings rows  \--count 1000

  **Summary card     1 contractor with 10,000 npm run seed:earnings \--
  P95**              earnings rows across 3   \--count 10000
                     years                    \--spread-years 3

  **Export sync      1 contractor with        npm run seed:earnings \--
  P95**              exactly 100 rows (stays  \--count 100
                     under sync threshold)    

  **Export async**   1 contractor with        npm run seed:earnings \--
                     exactly 6,000 rows       \--count 6000
  ------------------------------------------------------------------------

# **8. CI Pipeline Test Stages**

  ---------------------------------------------------------------------------
  **Stage**         **Tests run**         **Failure          **Approx.
                                          behaviour**        duration**
  ----------------- --------------------- ------------------ ----------------
  **lint**          ESLint + TypeScript   Block merge        \< 30s
                    tsc \--noEmit                            

  **unit**          Jest unit tests ---   Block merge        \< 60s
                    all modules                              

  **coverage**      Jest \--coverage ---  Block merge        \< 90s
                    enforce thresholds                       

  **integration**   Jest integration      Block merge        \< 3 min
                    tests --- real PG +                      
                    Redis (Docker)                           

  **e2e**           Supertest E2E ---     Block merge        \< 5 min
                    full Docker Compose                      
                    stack                                    

  **performance**   k6 smoke test (10     Warn only --- does \< 2 min
                    VUs, 30s) --- not     not block merge    
                    full load test                           

  **load            k6 full load test --- Creates ticket if  \< 15 min
  (scheduled)**     runs nightly on main  thresholds         
                    branch                breached           
  ---------------------------------------------------------------------------

# **9. References**

  -----------------------------------------------------------------------
  **Document**           **Relevant to**
  ---------------------- ------------------------------------------------
  **ES-04 --- RabbitMQ   Event payload shapes used by event builders in
  Consumers**            §5.2

  **ES-07 --- Redis      Cache-aside test scenarios, version mismatch
  Caching**              test, invalidation ordering tests

  **ES-11 --- Edge       Edge case test matrix in §6 --- one row per
  Cases**                documented edge case

  **ES-14 --- User       Acceptance criteria in ES-14 map 1:1 to E2E test
  Stories**              flows in §4

  **ES-15 ---            Metrics validated in integration tests ---
  Observability**        assert prom-client counters increment correctly
  -----------------------------------------------------------------------

CONFIDENTIAL --- Marketeq Internal Engineering Documentation \|
earnings-service ES-16 \| v1.0
