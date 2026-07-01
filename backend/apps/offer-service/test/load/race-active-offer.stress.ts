// apps/offer-service/test/load/race-active-offer.stress.ts
// OS-33: 50 concurrent creates for the same client-talent pair.
// Correct outcome: exactly 1×201, all others 409 ACTIVE_OFFER_ALREADY_EXISTS.
import { post } from './race-cas.stress';

const CONCURRENCY = parseInt(process.env.CONCURRENCY ?? '50', 10);

async function runActiveOfferRaceTest(): Promise<void> {
  console.log(`\n[Active Offer Race Test] Concurrency: ${CONCURRENCY}`);

  const talentId = process.env.TALENT_ID || 'talent-uuid';
  const listingId = process.env.LISTING_ID || 'listing-uuid';
  const clientToken = process.env.CLIENT_TOKEN || 'test-client-jwt';

  const createBody = {
    talentId,
    jobListingId: listingId,
    contractType: 'PROJECT',
    contractTitle: 'Race Test',
    rate: 95,
    currencyCode: 'USD',
    durationMonths: 6,
    workSchedule: { type: 'FULL_TIME' },
    startDate: '2099-01-01',
  };

  const startMs = Date.now();

  const results = await Promise.all(
    Array.from({ length: CONCURRENCY }, () =>
      post('/v1/offers', clientToken, createBody),
    ),
  );

  const elapsed = Date.now() - startMs;

  const created = results.filter((r) => r.status === 201);
  const blocked = results.filter((r) => r.status === 409);
  const errors = results.filter((r) => r.status !== 201 && r.status !== 409);

  console.log('\n[Active Offer Race Test] Results:');
  console.log(`  Elapsed: ${elapsed}ms`);
  console.log(`  201 created:  ${created.length}`);
  console.log(`  409 blocked:  ${blocked.length}`);
  console.log(`  Other errors: ${errors.length}`);

  if (created.length === 0) {
    console.error('[FAIL] No creates succeeded. Unexpected.');
    process.exit(1);
  }
  if (created.length > 1) {
    console.error(
      `[FAIL] CRITICAL: ${created.length} creates succeeded. Active offer constraint broken.`,
    );
    process.exit(1);
  }
  if (errors.length > 0) {
    console.error(`[FAIL] Unexpected errors: ${errors.length}`);
    errors.forEach((e) => console.error('  ', e));
    process.exit(1);
  }

  console.log('\n[PASS] Active offer race test passed.');
}

runActiveOfferRaceTest().catch((err) => {
  console.error('[ERROR]', err);
  process.exit(1);
});