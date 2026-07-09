// apps/offer-service/test/load/race-cas.stress.ts
// OS-33: 50 concurrent accepts on one offer — exactly one must win.
// Correctness test, not latency test. Any result other than 1×200 + 49×409 is a bug.
import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';

const TARGET_URL   = process.env.TARGET_URL   || 'http://localhost:3023';
const CLIENT_TOKEN = process.env.CLIENT_TOKEN  || 'test-client-jwt';
const TALENT_TOKEN = process.env.TALENT_TOKEN  || 'test-talent-jwt';
const CONCURRENCY  = parseInt(process.env.CONCURRENCY ?? '50', 10);

export function post(
  path: string,
  token: string,
  body: object,
): Promise<{ status: number; body: unknown }> {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const url = new URL(TARGET_URL + path);
    const lib = url.protocol === 'https:' ? https : http;

    const req = lib.request(
      {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-Idempotency-Key': `${Date.now()}-${Math.random().toString(36).substr(2, 12)}`,
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode!, body: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode!, body: data });
          }
        });
      },
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function runCASRaceTest(): Promise<void> {
  console.log(`\n[CAS Race Test] Concurrency: ${CONCURRENCY}`);

  // Setup: Create one PENDING offer
  const createRes = await post('/v1/offers', CLIENT_TOKEN, {
    talentId: process.env.TALENT_ID ?? 'talent-uuid',
    jobListingId: process.env.LISTING_ID ?? 'listing-uuid',
    contractType: 'PROJECT',
    contractTitle: 'CAS Race Test',
    rate: 95,
    currencyCode: 'USD',
    durationMonths: 6,
    workSchedule: { type: 'FULL_TIME' },
    startDate: '2099-01-01',
  });

  if (createRes.status !== 201) {
    console.error('[SETUP FAILED] Could not create test offer:', createRes);
    process.exit(1);
  }

  const offerId = (createRes.body as any).id;
  console.log(`[CAS Race Test] Created offer ${offerId}`);

  // Fire N concurrent accept requests
  const startMs = Date.now();
  const results = await Promise.all(
    Array.from({ length: CONCURRENCY }, () =>
      post(`/v1/offers/${offerId}/accept`, TALENT_TOKEN, {}),
    ),
  );
  const elapsedMs = Date.now() - startMs;

  // Analyse results
  const successes = results.filter((r) => r.status === 200);
  const conflicts = results.filter((r) => r.status === 409);
  const errors = results.filter((r) => r.status !== 200 && r.status !== 409);

  console.log('\n[CAS Race Test] Results:');
  console.log(`  Total requests:  ${CONCURRENCY}`);
  console.log(`  Elapsed:         ${elapsedMs}ms`);
  console.log(`  200 (success):   ${successes.length}`);
  console.log(`  409 (conflict):  ${conflicts.length}`);
  console.log(`  Other errors:    ${errors.length}`);

  let passed = true;
  if (successes.length !== 1) {
    console.error(`[FAIL] Expected exactly 1 success. Got ${successes.length}.`);
    if (successes.length > 1) {
      console.error('[FAIL] CRITICAL: Multiple accepts succeeded. CAS is broken.');
    }
    passed = false;
  }
  if (conflicts.length !== CONCURRENCY - 1) {
    console.error(`[FAIL] Expected ${CONCURRENCY - 1} conflicts. Got ${conflicts.length}.`);
    passed = false;
  }
  if (errors.length > 0) {
    console.error(`[FAIL] ${errors.length} unexpected errors:`);
    errors.forEach((e) => console.error('  ', e));
    passed = false;
  }

  if (passed) {
    console.log('\n[PASS] CAS race test passed. Exactly 1 accept succeeded.');
  } else {
    console.error('\n[FAIL] CAS race test failed.');
    process.exit(1);
  }
}

runCASRaceTest().catch((err) => {
  console.error('[ERROR]', err);
  process.exit(1);
});