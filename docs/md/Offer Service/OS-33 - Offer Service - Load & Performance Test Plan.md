**OS-33**

**Offer Service --- Load & Performance Test Plan**

**Tools:** k6 (HTTP load) + custom Node.js race tests **Targets:** p95
\< 300ms GET, p95 \< 500ms mutations, \< 0.1% error rate

This document defines the load and performance test plan for
offer-service. It covers: acceptance thresholds per endpoint, k6 load
test scripts for normal traffic, concurrent accept stress tests to
validate CAS correctness, expiry scheduler performance under high load,
and the race condition stress test verifying the one-active-offer
constraint under concurrent pressure.

**File Map**

  ---------- ------------------------------------------- ----------------------
  **Step**   **File Path**                               **Purpose**

  **1**      (reference)                                 Acceptance thresholds
                                                         --- per-endpoint
                                                         latency and error rate
                                                         targets

  **2**      test/load/k6.config.js                      k6 shared
                                                         configuration (base
                                                         URL, auth, scenarios)

  **3**      test/load/offer-read.k6.js                  k6 script: GET
                                                         /v1/offers/:id under
                                                         sustained load

  **4**      test/load/offer-mutations.k6.js             k6 script: create,
                                                         accept, decline, CO
                                                         under ramp load

  **5**      test/load/race-cas.stress.ts                Node.js race stress:
                                                         50 concurrent accepts
                                                         on one offer

  **6**      test/load/race-active-offer.stress.ts       Node.js race stress:
                                                         50 concurrent creates
                                                         for same talent

  **7**      test/load/scheduler.perf.ts                 Scheduler perf: expire
                                                         10 000 offers in one
                                                         batch

  **8**      (reference)                                 Running the tests and
                                                         interpreting results
  ---------- ------------------------------------------- ----------------------

+-----------------------------------------------------------------------+
| **Step 1 Acceptance Thresholds**                                      |
|                                                                       |
| Pass/fail criteria for every endpoint                                 |
+-----------------------------------------------------------------------+

Every endpoint has defined latency and error rate thresholds. A load
test run is considered a PASS only when all thresholds are met under the
target concurrency. Any threshold breach is a blocker for production
deployment.

  ----------------------- --------- --------- --------- --------- -----------------
  **Endpoint**            **p50**   **p95**   **p99**   **Error   **Target
                                                        rate**    concurrency**

  **GET /v1/offers/:id**  \< 50ms   \< 200ms  \< 400ms  \< 0.1%   50 VUs sustained

  **POST /v1/offers**     \< 100ms  \< 400ms  \< 800ms  \< 0.1%   20 VUs ramp to 50

  **PATCH                 \< 80ms   \< 300ms  \< 600ms  \< 0.1%   20 VUs ramp to 50
  /v1/offers/:id**                                                

  **POST \.../accept**    \< 80ms   \< 300ms  \< 600ms  \< 0.5%   20 VUs (409s
                                                                  expected under
                                                                  race)

  **POST \.../decline**   \< 80ms   \< 300ms  \< 600ms  \< 0.1%   20 VUs

  **POST \.../withdraw**  \< 80ms   \< 300ms  \< 600ms  \< 0.1%   20 VUs

  **POST                  \< 100ms  \< 400ms  \< 800ms  \< 0.5%   20 VUs (23505
  \.../counter-offers**                                           conflicts
                                                                  expected)

  **GET \.../history**    \< 80ms   \< 300ms  \< 600ms  \< 0.1%   30 VUs

  **GET \.../ably-token** \< 50ms   \< 200ms  \< 400ms  \< 0.1%   50 VUs

  **Outbox publish        N/A       N/A       N/A       \< 0.01%  1 000 events in
  throughput**                                                    60s

  **ExpiryProcessor (1    \< 2s     \< 5s     \< 10s    0%        1 cron tick
  000 offers)**                                                   

  **ExpiryProcessor (10   \< 15s    N/A       N/A       0%        1 cron tick
  000 offers)**                                                   (batch loop)
  ----------------------- --------- --------- --------- --------- -----------------

+-----------------------------------------------------------------------+
| Error rate targets:                                                   |
|                                                                       |
| \< 0.1%: Standard API errors (4xx expected from correct behaviour     |
| excluded).                                                            |
|                                                                       |
| This means 5xx errors only.                                           |
|                                                                       |
| \< 0.5%: Mutation endpoints where 409 CAS conflicts are expected      |
| under concurrent load.                                                |
|                                                                       |
| 409 errors are NOT failures --- they are correct system behaviour.    |
|                                                                       |
| Error rate threshold only counts 5xx responses.                       |
|                                                                       |
| Latency measurement:                                                  |
|                                                                       |
| Measured server-to-server (not browser). Excludes network round-trip  |
| to client.                                                            |
|                                                                       |
| Measured at the load balancer or directly against the NestJS port.    |
|                                                                       |
| p50 = median, p95 = 95th percentile, p99 = 99th percentile.           |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 2 k6 Configuration --- k6.config.js**                          |
|                                                                       |
| Shared base URL, JWT token, and k6 options                            |
+-----------------------------------------------------------------------+

All k6 scripts import from this config file. It reads the base URL and
JWT tokens from environment variables so the same scripts run against
local, staging, and production.

+-----------------------------------------------------------------------+
| Load tests MUST be run against an isolated staging environment.       |
|                                                                       |
| NEVER run load tests against production.                              |
|                                                                       |
| The test creates and modifies real data in the target database.       |
|                                                                       |
| Use a staging database seeded with synthetic load-test data.          |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/test/load/k6.config.js**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| // k6 shared config. Import in all k6 scripts.                        |
|                                                                       |
| export const BASE_URL = \_\_ENV.TARGET_URL \|\|                       |
| \'http://localhost:3005\';                                            |
|                                                                       |
| // JWT tokens for the load test users.                                |
|                                                                       |
| // Generate valid tokens for load-test users in the staging           |
| environment.                                                          |
|                                                                       |
| // Set via: k6 run -e CLIENT_TOKEN=\<jwt\> -e TALENT_TOKEN=\<jwt\>    |
| script.js                                                             |
|                                                                       |
| export const CLIENT_TOKEN = \_\_ENV.CLIENT_TOKEN \|\|                 |
| \'replace-with-staging-jwt\';                                         |
|                                                                       |
| export const TALENT_TOKEN = \_\_ENV.TALENT_TOKEN \|\|                 |
| \'replace-with-staging-jwt\';                                         |
|                                                                       |
| // Common HTTP headers                                                |
|                                                                       |
| export function authHeaders(token) {                                  |
|                                                                       |
| return {                                                              |
|                                                                       |
| Authorization: \`Bearer \${token}\`,                                  |
|                                                                       |
| \'Content-Type\': \'application/json\',                               |
|                                                                       |
| };                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Generate a UUID v4 for idempotency keys.                           |
|                                                                       |
| // k6 does not have crypto.randomUUID(); use this helper instead.     |
|                                                                       |
| export function newIdempKey() {                                       |
|                                                                       |
| return \'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx\'.replace(/\[xy\]/g,    |
| (c) =\> {                                                             |
|                                                                       |
| const r = Math.random() \* 16 \| 0;                                   |
|                                                                       |
| return (c === \'x\' ? r : (r & 0x3 \| 0x8)).toString(16);             |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Shared threshold configuration for all scripts.                    |
|                                                                       |
| export const THRESHOLDS = {                                           |
|                                                                       |
| http_req_duration: \[\'p(95)\<300\', \'p(99)\<600\'\],                |
|                                                                       |
| http_req_failed: \[\'rate\<0.001\'\], // \< 0.1% 5xx errors           |
|                                                                       |
| };                                                                    |
|                                                                       |
| // Standard ramp-up scenario for mutation endpoints.                  |
|                                                                       |
| export const RAMP_SCENARIO = {                                        |
|                                                                       |
| executor: \'ramping-vus\',                                            |
|                                                                       |
| startVUs: 1,                                                          |
|                                                                       |
| stages: \[                                                            |
|                                                                       |
| { duration: \'30s\', target: 10 }, // Warm up                         |
|                                                                       |
| { duration: \'60s\', target: 50 }, // Ramp to target                  |
|                                                                       |
| { duration: \'60s\', target: 50 }, // Sustained                       |
|                                                                       |
| { duration: \'30s\', target: 0 }, // Ramp down                        |
|                                                                       |
| \],                                                                   |
|                                                                       |
| };                                                                    |
|                                                                       |
| // Sustained read scenario.                                           |
|                                                                       |
| export const READ_SCENARIO = {                                        |
|                                                                       |
| executor: \'constant-vus\',                                           |
|                                                                       |
| vus: 50,                                                              |
|                                                                       |
| duration: \'120s\',                                                   |
|                                                                       |
| };                                                                    |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 3 k6 Read Load Test --- offer-read.k6.js**                     |
|                                                                       |
| 50 VUs reading offer state continuously                               |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/test/load/offer-read.k6.js**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import http from \'k6/http\';                                         |
|                                                                       |
| import { check, sleep } from \'k6\';                                  |
|                                                                       |
| import { BASE_URL, CLIENT_TOKEN, authHeaders, THRESHOLDS,             |
| READ_SCENARIO } from \'./k6.config.js\';                              |
|                                                                       |
| // List of offer IDs pre-seeded in the staging environment.           |
|                                                                       |
| // These offers must exist and be in PENDING or COUNTERED state.      |
|                                                                       |
| // Add 100+ IDs for a realistic read distribution.                    |
|                                                                       |
| const OFFER_IDS = \[                                                  |
|                                                                       |
| \_\_ENV.OFFER_IDS ? \_\_ENV.OFFER_IDS.split(\',\') :                  |
| \[\'staging-offer-uuid-1\', \'staging-offer-uuid-2\'\],               |
|                                                                       |
| \].flat();                                                            |
|                                                                       |
| export const options = {                                              |
|                                                                       |
| scenarios: { read: READ_SCENARIO },                                   |
|                                                                       |
| thresholds: {                                                         |
|                                                                       |
| http_req_duration: \[\'p(50)\<50\', \'p(95)\<200\', \'p(99)\<400\'\], |
|                                                                       |
| http_req_failed: \[\'rate\<0.001\'\],                                 |
|                                                                       |
| },                                                                    |
|                                                                       |
| };                                                                    |
|                                                                       |
| export default function() {                                           |
|                                                                       |
| // Pick a random offer ID from the pool.                              |
|                                                                       |
| const offerId = OFFER_IDS\[Math.floor(Math.random() \*                |
| OFFER_IDS.length)\];                                                  |
|                                                                       |
| // GET offer with client token.                                       |
|                                                                       |
| const res = http.get(                                                 |
|                                                                       |
| \`\${BASE_URL}/v1/offers/\${offerId}\`,                               |
|                                                                       |
| { headers: authHeaders(CLIENT_TOKEN) },                               |
|                                                                       |
| );                                                                    |
|                                                                       |
| check(res, {                                                          |
|                                                                       |
| \'status is 200\': (r) =\> r.status === 200,                          |
|                                                                       |
| \'response has offer\': (r) =\> JSON.parse(r.body).offer !==          |
| undefined,                                                            |
|                                                                       |
| \'response time \< 200ms\': (r) =\> r.timings.duration \< 200,        |
|                                                                       |
| });                                                                   |
|                                                                       |
| sleep(0.1); // 100ms think time between requests                      |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Run:                                                               |
|                                                                       |
| // k6 run -e TARGET_URL=http://staging:3005 \\                        |
|                                                                       |
| // -e CLIENT_TOKEN=\<jwt\> \\                                         |
|                                                                       |
| // -e OFFER_IDS=uuid1,uuid2,uuid3 \\                                  |
|                                                                       |
| // apps/offer-service/test/load/offer-read.k6.js                      |
|                                                                       |
| // Expected output:                                                   |
|                                                                       |
| // ✓ status is 200                                                    |
|                                                                       |
| // ✓ response has offer                                               |
|                                                                       |
| // ✓ response time \< 200ms                                           |
|                                                                       |
| // http_req_duration: avg=45ms p(95)=150ms p(99)=280ms                |
|                                                                       |
| // http_req_failed: 0.00%                                             |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 4 k6 Mutation Load Test --- offer-mutations.k6.js**            |
|                                                                       |
| Create, CO, and accept under ramp load                                |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/test/load/offer-mutations.k6.js**

  -----------------------------------------------------------------------

+------------------------------------------------------------------------+
| import http from \'k6/http\';                                          |
|                                                                        |
| import { check, sleep } from \'k6\';                                   |
|                                                                        |
| import {                                                               |
|                                                                        |
| BASE_URL, CLIENT_TOKEN, TALENT_TOKEN,                                  |
|                                                                        |
| authHeaders, newIdempKey, THRESHOLDS, RAMP_SCENARIO,                   |
|                                                                        |
| } from \'./k6.config.js\';                                             |
|                                                                        |
| // Pre-seeded talent IDs (distinct users to avoid active-offer         |
| conflicts)                                                             |
|                                                                        |
| // Each VU uses a different talent ID so they do not collide on the    |
| one-active-offer rule.                                                 |
|                                                                        |
| // Pre-seed 100+ talent users in the staging environment.              |
|                                                                        |
| const TALENT_IDS = \_\_ENV.TALENT_IDS                                  |
|                                                                        |
| ? \_\_ENV.TALENT_IDS.split(\',\')                                      |
|                                                                        |
| : \[\'talent-uuid-1\', \'talent-uuid-2\'\];                            |
|                                                                        |
| const LISTING_ID = \_\_ENV.LISTING_ID \|\| \'staging-listing-uuid\';   |
|                                                                        |
| export const options = {                                               |
|                                                                        |
| scenarios: { mutations: RAMP_SCENARIO },                               |
|                                                                        |
| thresholds: {                                                          |
|                                                                        |
| http_req_duration: \[\'p(50)\<100\', \'p(95)\<400\', \'p(99)\<800\'\], |
|                                                                        |
| http_req_failed: \[\'rate\<0.001\'\], // 5xx only                      |
|                                                                        |
| },                                                                     |
|                                                                        |
| };                                                                     |
|                                                                        |
| export default function() {                                            |
|                                                                        |
| // Each VU gets a unique talent ID based on its VU number.             |
|                                                                        |
| // This prevents multiple VUs from hitting the same client-talent      |
| pair.                                                                  |
|                                                                        |
| const talentId = TALENT_IDS\[\_\_VU % TALENT_IDS.length\];             |
|                                                                        |
| // \-\-\-- Step 1: Create an offer \-\-\--                             |
|                                                                        |
| const createRes = http.post(                                           |
|                                                                        |
| \`\${BASE_URL}/v1/offers\`,                                            |
|                                                                        |
| JSON.stringify({                                                       |
|                                                                        |
| talentId,                                                              |
|                                                                        |
| jobListingId: LISTING_ID,                                              |
|                                                                        |
| contractType: \'PROJECT\',                                             |
|                                                                        |
| contractTitle: \`Load Test \${Date.now()}\`,                           |
|                                                                        |
| rate: 95,                                                              |
|                                                                        |
| currencyCode: \'USD\',                                                 |
|                                                                        |
| durationMonths: 6,                                                     |
|                                                                        |
| workSchedule: { type: \'FULL_TIME\' },                                 |
|                                                                        |
| startDate: \'2099-01-01\',                                             |
|                                                                        |
| }),                                                                    |
|                                                                        |
| { headers: { \...authHeaders(CLIENT_TOKEN), \'X-Idempotency-Key\':     |
| newIdempKey() } },                                                     |
|                                                                        |
| );                                                                     |
|                                                                        |
| const createOk = check(createRes, {                                    |
|                                                                        |
| \'create 201\': (r) =\> r.status === 201,                              |
|                                                                        |
| \'create response \< 400ms\': (r) =\> r.timings.duration \< 400,       |
|                                                                        |
| });                                                                    |
|                                                                        |
| if (!createOk) { sleep(1); return; }                                   |
|                                                                        |
| const offerId = JSON.parse(createRes.body).id;                         |
|                                                                        |
| sleep(0.2);                                                            |
|                                                                        |
| // \-\-\-- Step 2: Talent submits a counter offer \-\-\--              |
|                                                                        |
| const coRes = http.post(                                               |
|                                                                        |
| \`\${BASE_URL}/v1/offers/\${offerId}/counter-offers\`,                 |
|                                                                        |
| JSON.stringify({                                                       |
|                                                                        |
| rate: 110,                                                             |
|                                                                        |
| currencyCode: \'USD\',                                                 |
|                                                                        |
| durationMonths: 6,                                                     |
|                                                                        |
| workSchedule: { type: \'FULL_TIME\' },                                 |
|                                                                        |
| startDate: \'2099-01-01\',                                             |
|                                                                        |
| }),                                                                    |
|                                                                        |
| { headers: { \...authHeaders(TALENT_TOKEN), \'X-Idempotency-Key\':     |
| newIdempKey() } },                                                     |
|                                                                        |
| );                                                                     |
|                                                                        |
| check(coRes, {                                                         |
|                                                                        |
| \'CO create 201\': (r) =\> r.status === 201,                           |
|                                                                        |
| \'CO response \< 400ms\': (r) =\> r.timings.duration \< 400,           |
|                                                                        |
| });                                                                    |
|                                                                        |
| if (coRes.status !== 201) { sleep(1); return; }                        |
|                                                                        |
| const coId = JSON.parse(coRes.body).counterOffer.id;                   |
|                                                                        |
| sleep(0.2);                                                            |
|                                                                        |
| // \-\-\-- Step 3: Client accepts the counter offer \-\-\--            |
|                                                                        |
| const acceptRes = http.post(                                           |
|                                                                        |
| \`\${BASE_URL}/v1/offers/\${offerId}/counter-offers/\${coId}/accept\`, |
|                                                                        |
| JSON.stringify({}),                                                    |
|                                                                        |
| { headers: { \...authHeaders(CLIENT_TOKEN), \'X-Idempotency-Key\':     |
| newIdempKey() } },                                                     |
|                                                                        |
| );                                                                     |
|                                                                        |
| check(acceptRes, {                                                     |
|                                                                        |
| \'CO accept 200 or 409\': (r) =\> \[200, 409\].includes(r.status),     |
|                                                                        |
| \'accept response \< 500ms\': (r) =\> r.timings.duration \< 500,       |
|                                                                        |
| });                                                                    |
|                                                                        |
| sleep(0.5);                                                            |
|                                                                        |
| }                                                                      |
+------------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 5 Race CAS Stress Test --- race-cas.stress.ts**                |
|                                                                       |
| 50 concurrent accepts on one offer --- exactly one must win           |
+-----------------------------------------------------------------------+

This test is a correctness test under concurrency, not a latency test.
It fires N concurrent HTTP requests to accept the same offer
simultaneously. The correct outcome is: exactly one request returns 200
ACCEPTED, all others return 409 OFFER_CONCURRENT_MODIFICATION. Any other
result is a bug.

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/test/load/race-cas.stress.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import \* as http from \'http\';                                      |
|                                                                       |
| import \* as https from \'https\';                                    |
|                                                                       |
| import { URL } from \'url\';                                          |
|                                                                       |
| const TARGET_URL = process.env.TARGET_URL \|\|                        |
| \'http://localhost:3005\';                                            |
|                                                                       |
| const CLIENT_TOKEN = process.env.CLIENT_TOKEN \|\|                    |
| \'test-client-jwt\';                                                  |
|                                                                       |
| const TALENT_TOKEN = process.env.TALENT_TOKEN \|\|                    |
| \'test-talent-jwt\';                                                  |
|                                                                       |
| const CONCURRENCY = parseInt(process.env.CONCURRENCY ?? \'50\', 10);  |
|                                                                       |
| /\*\* Make a single HTTP POST request. Returns { status, body }. \*/  |
|                                                                       |
| function post(path: string, token: string, body: object): Promise\<{  |
| status: number; body: unknown }\> {                                   |
|                                                                       |
| return new Promise((resolve, reject) =\> {                            |
|                                                                       |
| const payload = JSON.stringify(body);                                 |
|                                                                       |
| const url = new URL(TARGET_URL + path);                               |
|                                                                       |
| const lib = url.protocol === \'https:\' ? https : http;               |
|                                                                       |
| const req = lib.request({                                             |
|                                                                       |
| hostname: url.hostname,                                               |
|                                                                       |
| port: url.port \|\| (url.protocol === \'https:\' ? 443 : 80),         |
|                                                                       |
| path: url.pathname,                                                   |
|                                                                       |
| method: \'POST\',                                                     |
|                                                                       |
| headers: {                                                            |
|                                                                       |
| \'Content-Type\': \'application/json\',                               |
|                                                                       |
| Authorization: \`Bearer \${token}\`,                                  |
|                                                                       |
| \'X-Idempotency-Key\': Math.random().toString(36),                    |
|                                                                       |
| \'Content-Length\': Buffer.byteLength(payload),                       |
|                                                                       |
| },                                                                    |
|                                                                       |
| }, (res) =\> {                                                        |
|                                                                       |
| let data = \'\';                                                      |
|                                                                       |
| res.on(\'data\', (chunk) =\> { data += chunk; });                     |
|                                                                       |
| res.on(\'end\', () =\> {                                              |
|                                                                       |
| resolve({ status: res.statusCode!, body: JSON.parse(data) });         |
|                                                                       |
| });                                                                   |
|                                                                       |
| });                                                                   |
|                                                                       |
| req.on(\'error\', reject);                                            |
|                                                                       |
| req.write(payload);                                                   |
|                                                                       |
| req.end();                                                            |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| async function runCASRaceTest(): Promise\<void\> {                    |
|                                                                       |
| console.log(\`\\n\[CAS Race Test\] Concurrency: \${CONCURRENCY}\`);   |
|                                                                       |
| // \-\-\-- Setup: Create one PENDING offer \-\-\--                    |
|                                                                       |
| const createRes = await post(\'/v1/offers\', CLIENT_TOKEN, {          |
|                                                                       |
| talentId: process.env.TALENT_ID ?? \'talent-uuid\',                   |
|                                                                       |
| jobListingId: process.env.LISTING_ID ?? \'listing-uuid\',             |
|                                                                       |
| contractType: \'PROJECT\',                                            |
|                                                                       |
| contractTitle: \'CAS Race Test\',                                     |
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
| if (createRes.status !== 201) {                                       |
|                                                                       |
| console.error(\'\[SETUP FAILED\] Could not create test offer:\',      |
| createRes);                                                           |
|                                                                       |
| process.exit(1);                                                      |
|                                                                       |
| }                                                                     |
|                                                                       |
| const offerId = (createRes.body as any).id;                           |
|                                                                       |
| console.log(\`\[CAS Race Test\] Created offer \${offerId}\`);         |
|                                                                       |
| // \-\-\-- Fire N concurrent accept requests \-\-\--                  |
|                                                                       |
| const startMs = Date.now();                                           |
|                                                                       |
| const results = await Promise.all(                                    |
|                                                                       |
| Array.from({ length: CONCURRENCY }, () =\>                            |
|                                                                       |
| post(\`/v1/offers/\${offerId}/accept\`, TALENT_TOKEN, {})             |
|                                                                       |
| ),                                                                    |
|                                                                       |
| );                                                                    |
|                                                                       |
| const elapsedMs = Date.now() - startMs;                               |
|                                                                       |
| // \-\-\-- Analyse results \-\-\--                                    |
|                                                                       |
| const successes = results.filter(r =\> r.status === 200);             |
|                                                                       |
| const conflicts = results.filter(r =\> r.status === 409);             |
|                                                                       |
| const errors = results.filter(r =\> r.status !== 200 && r.status !==  |
| 409);                                                                 |
|                                                                       |
| console.log(\'\\n\[CAS Race Test\] Results:\');                       |
|                                                                       |
| console.log(\` Total requests: \${CONCURRENCY}\`);                    |
|                                                                       |
| console.log(\` Elapsed: \${elapsedMs}ms\`);                           |
|                                                                       |
| console.log(\` 200 (success): \${successes.length}\`);                |
|                                                                       |
| console.log(\` 409 (conflict): \${conflicts.length}\`);               |
|                                                                       |
| console.log(\` Other errors: \${errors.length}\`);                    |
|                                                                       |
| // \-\-\-- Assertions \-\-\--                                         |
|                                                                       |
| let passed = true;                                                    |
|                                                                       |
| if (successes.length !== 1) {                                         |
|                                                                       |
| console.error(\`\[FAIL\] Expected exactly 1 success. Got              |
| \${successes.length}.\`);                                             |
|                                                                       |
| if (successes.length \> 1) {                                          |
|                                                                       |
| console.error(\'\[FAIL\] CRITICAL: Multiple accepts succeeded. CAS is |
| broken.\');                                                           |
|                                                                       |
| }                                                                     |
|                                                                       |
| passed = false;                                                       |
|                                                                       |
| }                                                                     |
|                                                                       |
| if (conflicts.length !== CONCURRENCY - 1) {                           |
|                                                                       |
| console.error(\`\[FAIL\] Expected \${CONCURRENCY - 1} conflicts. Got  |
| \${conflicts.length}.\`);                                             |
|                                                                       |
| passed = false;                                                       |
|                                                                       |
| }                                                                     |
|                                                                       |
| if (errors.length \> 0) {                                             |
|                                                                       |
| console.error(\`\[FAIL\] \${errors.length} unexpected errors (not 200 |
| or 409):\`);                                                          |
|                                                                       |
| errors.forEach(e =\> console.error(\' \', e));                        |
|                                                                       |
| passed = false;                                                       |
|                                                                       |
| }                                                                     |
|                                                                       |
| if (passed) {                                                         |
|                                                                       |
| console.log(\'\\n\[PASS\] CAS race test passed. Exactly 1 accept      |
| succeeded.\');                                                        |
|                                                                       |
| } else {                                                              |
|                                                                       |
| console.error(\'\\n\[FAIL\] CAS race test failed.\');                 |
|                                                                       |
| process.exit(1);                                                      |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| runCASRaceTest().catch(err =\> {                                      |
|                                                                       |
| console.error(\'\[ERROR\]\', err);                                    |
|                                                                       |
| process.exit(1);                                                      |
|                                                                       |
| });                                                                   |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 6 Active Offer Race Stress Test ---                            |
| race-active-offer.stress.ts**                                         |
|                                                                       |
| 50 concurrent creates for the same client-talent pair                 |
+-----------------------------------------------------------------------+

This test verifies the one-active-offer constraint holds under
concurrent pressure. The correct outcome: exactly one create returns
201, all others return 409 ACTIVE_OFFER_ALREADY_EXISTS. If two creates
both return 201, the constraint enforcement is broken.

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/test/load/race-active-offer.stress.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { post } from \'./race-cas.stress\'; // Reuse the post()       |
| helper                                                                |
|                                                                       |
| async function runActiveOfferRaceTest(): Promise\<void\> {            |
|                                                                       |
| const CONCURRENCY = parseInt(process.env.CONCURRENCY ?? \'50\', 10);  |
|                                                                       |
| console.log(\`\\n\[Active Offer Race Test\] Concurrency:              |
| \${CONCURRENCY}\`);                                                   |
|                                                                       |
| const talentId = process.env.TALENT_ID ?? \'talent-uuid\';            |
|                                                                       |
| const listingId = process.env.LISTING_ID ?? \'listing-uuid\';         |
|                                                                       |
| const createBody = {                                                  |
|                                                                       |
| talentId,                                                             |
|                                                                       |
| jobListingId: listingId,                                              |
|                                                                       |
| contractType: \'PROJECT\',                                            |
|                                                                       |
| contractTitle: \'Race Test\',                                         |
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
| };                                                                    |
|                                                                       |
| const startMs = Date.now();                                           |
|                                                                       |
| // Fire N concurrent creates for the same client-talent pair.         |
|                                                                       |
| const results = await Promise.all(                                    |
|                                                                       |
| Array.from({ length: CONCURRENCY }, () =\>                            |
|                                                                       |
| post(\'/v1/offers\', process.env.CLIENT_TOKEN!, createBody)           |
|                                                                       |
| ),                                                                    |
|                                                                       |
| );                                                                    |
|                                                                       |
| const elapsed = Date.now() - startMs;                                 |
|                                                                       |
| const created = results.filter(r =\> r.status === 201);               |
|                                                                       |
| const blocked = results.filter(r =\> r.status === 409);               |
|                                                                       |
| const errors = results.filter(r =\> r.status !== 201 && r.status !==  |
| 409);                                                                 |
|                                                                       |
| console.log(\'\\n\[Active Offer Race Test\] Results:\');              |
|                                                                       |
| console.log(\` Elapsed: \${elapsed}ms\`);                             |
|                                                                       |
| console.log(\` 201 created: \${created.length}\`);                    |
|                                                                       |
| console.log(\` 409 blocked: \${blocked.length}\`);                    |
|                                                                       |
| console.log(\` Other errors: \${errors.length}\`);                    |
|                                                                       |
| // Assertions: at most 1 create should succeed.                       |
|                                                                       |
| // More than 1 = constraint enforcement broken.                       |
|                                                                       |
| // 0 successes = unexpected failure.                                  |
|                                                                       |
| if (created.length === 0) {                                           |
|                                                                       |
| console.error(\'\[FAIL\] No creates succeeded. Unexpected.\');        |
|                                                                       |
| process.exit(1);                                                      |
|                                                                       |
| }                                                                     |
|                                                                       |
| if (created.length \> 1) {                                            |
|                                                                       |
| console.error(\`\[FAIL\] CRITICAL: \${created.length} creates         |
| succeeded. Active offer constraint broken.\`);                        |
|                                                                       |
| process.exit(1);                                                      |
|                                                                       |
| }                                                                     |
|                                                                       |
| if (errors.length \> 0) {                                             |
|                                                                       |
| console.error(\`\[FAIL\] Unexpected errors: \${errors.length}\`);     |
|                                                                       |
| process.exit(1);                                                      |
|                                                                       |
| }                                                                     |
|                                                                       |
| console.log(\'\\n\[PASS\] Active offer race test passed.\');          |
|                                                                       |
| }                                                                     |
|                                                                       |
| runActiveOfferRaceTest().catch(err =\> {                              |
|                                                                       |
| console.error(\'\[ERROR\]\', err); process.exit(1);                   |
|                                                                       |
| });                                                                   |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 7 Scheduler Performance Test --- scheduler.perf.ts**           |
|                                                                       |
| Expiry processor performance under high load                          |
+-----------------------------------------------------------------------+

This test measures how long the ExpiryProcessor takes to expire a large
batch of offers. It inserts 10 000 expired PENDING offers directly into
the test database, then times how long the expiry processor takes to
process them all. The acceptance threshold is 10 000 offers processed in
under 60 seconds.

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/test/load/scheduler.perf.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { DataSource } from \'typeorm\';                               |
|                                                                       |
| import { NestFactory } from \'@nestjs/core\';                         |
|                                                                       |
| import { AppModule } from \'../../src/app.module\';                   |
|                                                                       |
| import { ExpiryProcessor } from                                       |
| \'../../src/scheduler/expiry.processor\';                             |
|                                                                       |
| import { getDataSourceToken } from \'@nestjs/typeorm\';               |
|                                                                       |
| const BATCH_SIZE = parseInt(process.env.PERF_BATCH ?? \'10000\', 10); |
|                                                                       |
| async function runSchedulerPerfTest(): Promise\<void\> {              |
|                                                                       |
| console.log(\`\[Scheduler Perf\] Testing expiry of \${BATCH_SIZE}     |
| offers.\`);                                                           |
|                                                                       |
| const app = await NestFactory.createApplicationContext(AppModule, {   |
| logger: \[\'error\'\] });                                             |
|                                                                       |
| const ds = app.get\<DataSource\>(getDataSourceToken());               |
|                                                                       |
| const processor = app.get\<ExpiryProcessor\>(ExpiryProcessor);        |
|                                                                       |
| // \-\-\-- Setup: Insert BATCH_SIZE expired PENDING offers \-\-\--    |
|                                                                       |
| console.log(\'\[Scheduler Perf\] Inserting test offers\...\');        |
|                                                                       |
| const insertStart = Date.now();                                       |
|                                                                       |
| // Insert in chunks of 500 to avoid parameter limit.                  |
|                                                                       |
| const chunkSize = 500;                                                |
|                                                                       |
| let inserted = 0;                                                     |
|                                                                       |
| while (inserted \< BATCH_SIZE) {                                      |
|                                                                       |
| const chunk = Math.min(chunkSize, BATCH_SIZE - inserted);             |
|                                                                       |
| const values = Array.from({ length: chunk }, (\_, i) =\> {            |
|                                                                       |
| const idx = inserted + i;                                             |
|                                                                       |
| return \`(                                                            |
|                                                                       |
| \'00000000-0000-4000-a000-\${String(idx).padStart(12, \'0\')}\',      |
|                                                                       |
| \'10000000-0000-4000-a000-000000000001\',                             |
|                                                                       |
| \'20000000-0000-4000-a000-000000000001\',                             |
|                                                                       |
| \'30000000-0000-4000-a000-000000000001\',                             |
|                                                                       |
| \'PROJECT\', \'Perf Test \${idx}\', \'PENDING\', 95, \'USD\', 6,      |
|                                                                       |
| \'{\"type\":\"FULL_TIME\"}\'::jsonb, \'2099-01-01\',                  |
|                                                                       |
| NOW() - INTERVAL \'1 minute\'                                         |
|                                                                       |
| )\`;                                                                  |
|                                                                       |
| }).join(\', \');                                                      |
|                                                                       |
| await ds.query(\`                                                     |
|                                                                       |
| INSERT INTO offer_service_test.offers                                 |
|                                                                       |
| (id, client_id, talent_id, job_listing_id, contract_type,             |
|                                                                       |
| contract_title, status, rate, currency_code, duration_months,         |
|                                                                       |
| work_schedule, start_date, expires_at)                                |
|                                                                       |
| VALUES \${values}                                                     |
|                                                                       |
| ON CONFLICT (id) DO NOTHING                                           |
|                                                                       |
| \`);                                                                  |
|                                                                       |
| inserted += chunk;                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| const insertMs = Date.now() - insertStart;                            |
|                                                                       |
| console.log(\`\[Scheduler Perf\] Inserted \${BATCH_SIZE} offers in    |
| \${insertMs}ms.\`);                                                   |
|                                                                       |
| // \-\-\-- Measure: Run expiry processor \-\-\--                      |
|                                                                       |
| console.log(\'\[Scheduler Perf\] Running ExpiryProcessor\...\');      |
|                                                                       |
| const processStart = Date.now();                                      |
|                                                                       |
| // The processor runs in batches of BATCH_SIZE_PER_TICK (100 per      |
| tick).                                                                |
|                                                                       |
| // Run it in a loop until all offers are expired.                     |
|                                                                       |
| let remaining = BATCH_SIZE;                                           |
|                                                                       |
| while (remaining \> 0) {                                              |
|                                                                       |
| await processor.expireOffers();                                       |
|                                                                       |
| const \[{ count }\] = await ds.query(\`                               |
|                                                                       |
| SELECT COUNT(\*) as count FROM offer_service_test.offers WHERE status |
| = \'PENDING\'                                                         |
|                                                                       |
| \`);                                                                  |
|                                                                       |
| remaining = parseInt(count, 10);                                      |
|                                                                       |
| if (remaining \> 0) {                                                 |
|                                                                       |
| process.stdout.write(\`\\r\[Scheduler Perf\] Remaining: \${remaining} |
| \`);                                                                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| const processMs = Date.now() - processStart;                          |
|                                                                       |
| const throughput = Math.round(BATCH_SIZE / (processMs / 1000));       |
|                                                                       |
| console.log(\`\\n\\n\[Scheduler Perf\] Results:\`);                   |
|                                                                       |
| console.log(\` Offers expired: \${BATCH_SIZE}\`);                     |
|                                                                       |
| console.log(\` Total time: \${processMs}ms                            |
| (\${(processMs/1000).toFixed(1)}s)\`);                                |
|                                                                       |
| console.log(\` Throughput: \${throughput} offers/second\`);           |
|                                                                       |
| // Acceptance threshold: 10 000 offers in under 60 seconds.           |
|                                                                       |
| const THRESHOLD_MS = 60 \* 1000;                                      |
|                                                                       |
| if (processMs \> THRESHOLD_MS) {                                      |
|                                                                       |
| console.error(\`\[FAIL\] Exceeded threshold of \${THRESHOLD_MS}ms.    |
| Got \${processMs}ms.\`);                                              |
|                                                                       |
| process.exit(1);                                                      |
|                                                                       |
| }                                                                     |
|                                                                       |
| console.log(\'\[PASS\] Scheduler performance test passed.\');         |
|                                                                       |
| await app.close();                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| runSchedulerPerfTest().catch(err =\> {                                |
|                                                                       |
| console.error(err); process.exit(1);                                  |
|                                                                       |
| });                                                                   |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 8 Running the Tests --- Commands & Interpreting Results**      |
|                                                                       |
| How to execute each test and what to look for                         |
+-----------------------------------------------------------------------+

**Prerequisites**

+-----------------------------------------------------------------------+
| \# Install k6:                                                        |
|                                                                       |
| \# macOS: brew install k6                                             |
|                                                                       |
| \# Linux: https://k6.io/docs/getting-started/installation/            |
|                                                                       |
| \# Verify k6 is installed:                                            |
|                                                                       |
| k6 version                                                            |
|                                                                       |
| \# Expected: k6 v0.x.x \...                                           |
|                                                                       |
| \# Add load test scripts to package.json:                             |
|                                                                       |
| // \"test:load:read\": \"k6 run test/load/offer-read.k6.js\",         |
|                                                                       |
| // \"test:load:mutations\": \"k6 run                                  |
| test/load/offer-mutations.k6.js\",                                    |
|                                                                       |
| // \"test:load:race:cas\": \"ts-node test/load/race-cas.stress.ts\",  |
|                                                                       |
| // \"test:load:race:active\": \"ts-node                               |
| test/load/race-active-offer.stress.ts\",                              |
|                                                                       |
| // \"test:load:scheduler\": \"ts-node test/load/scheduler.perf.ts\"   |
+-----------------------------------------------------------------------+

**Read load test**

+-----------------------------------------------------------------------+
| \# Against local environment:                                         |
|                                                                       |
| k6 run \\                                                             |
|                                                                       |
| -e TARGET_URL=http://localhost:3005 \\                                |
|                                                                       |
| -e CLIENT_TOKEN=\$(node -e                                            |
| \"console.log(require(\'./test-token\').clientJwt)\") \\              |
|                                                                       |
| -e OFFER_IDS=uuid1,uuid2,uuid3 \\                                     |
|                                                                       |
| apps/offer-service/test/load/offer-read.k6.js                         |
|                                                                       |
| \# PASS indicators:                                                   |
|                                                                       |
| \# ✓ checks\...\...\...\...\...\...\...\....: 100.00% 18000 out of    |
| 18000                                                                 |
|                                                                       |
| \# http_req_duration\...\...\...\....: avg=45ms p(95)=180ms           |
| p(99)=320ms                                                           |
|                                                                       |
| \# http_req_failed\...\...\...\...\....: 0.00% 0 out of 6000          |
|                                                                       |
| \# FAIL indicators (investigate if any of these appear):              |
|                                                                       |
| \# ✗ status is 200 \<- 5xx errors under load                          |
|                                                                       |
| \# http_req_duration p(95) \> 200ms \<- latency threshold breached    |
|                                                                       |
| \# http_req_failed \> 0.1% \<- unexpected errors                      |
+-----------------------------------------------------------------------+

**CAS race stress test**

+-----------------------------------------------------------------------+
| CONCURRENCY=50 \\                                                     |
|                                                                       |
| TARGET_URL=http://localhost:3005 \\                                   |
|                                                                       |
| CLIENT_TOKEN=\<jwt\> \\                                               |
|                                                                       |
| TALENT_TOKEN=\<jwt\> \\                                               |
|                                                                       |
| TALENT_ID=\<staging-talent-uuid\> \\                                  |
|                                                                       |
| LISTING_ID=\<staging-listing-uuid\> \\                                |
|                                                                       |
| npx ts-node apps/offer-service/test/load/race-cas.stress.ts           |
|                                                                       |
| \# PASS output:                                                       |
|                                                                       |
| \# \[CAS Race Test\] Concurrency: 50                                  |
|                                                                       |
| \# \[CAS Race Test\] Created offer f47ac10b-\...                      |
|                                                                       |
| \# \[CAS Race Test\] Results:                                         |
|                                                                       |
| \# Total requests: 50                                                 |
|                                                                       |
| \# Elapsed: 312ms                                                     |
|                                                                       |
| \# 200 (success): 1 \<- exactly one                                   |
|                                                                       |
| \# 409 (conflict): 49 \<- all others                                  |
|                                                                       |
| \# Other errors: 0                                                    |
|                                                                       |
| \# \[PASS\] CAS race test passed. Exactly 1 accept succeeded.         |
|                                                                       |
| \# FAIL output (requires investigation):                              |
|                                                                       |
| \# \[FAIL\] CRITICAL: 2 accepts succeeded. CAS is broken.             |
|                                                                       |
| \# -\> Check the CAS query in performCAS()                            |
|                                                                       |
| \# -\> Check PostgreSQL serialization level                           |
|                                                                       |
| \# -\> Check if multiple DB connections are racing outside a          |
| transaction                                                           |
+-----------------------------------------------------------------------+

**Scheduler performance test**

+-----------------------------------------------------------------------+
| PERF_BATCH=10000 \\                                                   |
|                                                                       |
| TEST_DATABASE_URL=postgresql://user:pass@localhost:5432/marketeq_test |
| \\                                                                    |
|                                                                       |
| NODE_ENV=test \\                                                      |
|                                                                       |
| npx ts-node apps/offer-service/test/load/scheduler.perf.ts            |
|                                                                       |
| \# PASS output:                                                       |
|                                                                       |
| \# \[Scheduler Perf\] Testing expiry of 10000 offers.                 |
|                                                                       |
| \# \[Scheduler Perf\] Inserted 10000 offers in 3842ms.                |
|                                                                       |
| \# \[Scheduler Perf\] Running ExpiryProcessor\...                     |
|                                                                       |
| \# \[Scheduler Perf\] Remaining: 9900                                 |
|                                                                       |
| \# \[Scheduler Perf\] Remaining: 800                                  |
|                                                                       |
| \# \[Scheduler Perf\] Remaining: 0                                    |
|                                                                       |
| \# \[Scheduler Perf\] Results:                                        |
|                                                                       |
| \# Offers expired: 10000                                              |
|                                                                       |
| \# Total time: 8420ms (8.4s)                                          |
|                                                                       |
| \# Throughput: 1188 offers/second                                     |
|                                                                       |
| \# \[PASS\] Scheduler performance test passed.                        |
|                                                                       |
| \# If throughput \< 100 offers/second:                                |
|                                                                       |
| \# -\> Check idx_offers_status_expires is being used (EXPLAIN         |
| ANALYZE)                                                              |
|                                                                       |
| \# -\> Check FOR UPDATE SKIP LOCKED is in the query                   |
|                                                                       |
| \# -\> Check batch size (EXPIRY_BATCH_SIZE in expiry.processor.ts)    |
|                                                                       |
| \# -\> Check connection pool size (TypeORM poolSize setting)          |
+-----------------------------------------------------------------------+

**CI/CD integration**

+-----------------------------------------------------------------------+
| \# Add to CI pipeline (GitHub Actions, GitLab CI, etc.):              |
|                                                                       |
| \# Run CAS race test on every PR (fast, no k6 required):              |
|                                                                       |
| \# - name: CAS Race Stress Test                                       |
|                                                                       |
| \# run: \|                                                            |
|                                                                       |
| \# CONCURRENCY=20 TARGET_URL=\${{ secrets.STAGING_URL }} \\           |
|                                                                       |
| \# CLIENT_TOKEN=\${{ secrets.STAGING_CLIENT_JWT }} \\                 |
|                                                                       |
| \# TALENT_TOKEN=\${{ secrets.STAGING_TALENT_JWT }} \\                 |
|                                                                       |
| \# TALENT_ID=\${{ secrets.STAGING_TALENT_ID }} \\                     |
|                                                                       |
| \# LISTING_ID=\${{ secrets.STAGING_LISTING_ID }} \\                   |
|                                                                       |
| \# npx ts-node test/load/race-cas.stress.ts                           |
|                                                                       |
| \# Run k6 load tests on staging before production deploy:             |
|                                                                       |
| \# - name: Load Test                                                  |
|                                                                       |
| \# run: \|                                                            |
|                                                                       |
| \# k6 run -e TARGET_URL=\${{ secrets.STAGING_URL }} \\                |
|                                                                       |
| \# -e CLIENT_TOKEN=\${{ secrets.STAGING_CLIENT_JWT }} \\              |
|                                                                       |
| \# test/load/offer-read.k6.js                                         |
+-----------------------------------------------------------------------+
