// apps/offer-service/test/load/offer-mutations.k6.js
// OS-33: Create → CO → Accept under ramp load (5→20→50 VUs).
// Each VU uses a unique talent ID to avoid active-offer constraint collisions.
import http from 'k6/http';
import { check, sleep } from 'k6';
import {
  BASE_URL, CLIENT_TOKEN, TALENT_TOKEN,
  authHeaders, newIdempKey, RAMP_SCENARIO,
} from './k6.config.js';

const TALENT_IDS = __ENV.TALENT_IDS
  ? __ENV.TALENT_IDS.split(',')
  : ['talent-uuid-1', 'talent-uuid-2'];
const LISTING_ID = __ENV.LISTING_ID || 'staging-listing-uuid';

export const options = {
  scenarios: { mutations: RAMP_SCENARIO },
  thresholds: {
    http_req_duration: ['p(50)<100', 'p(95)<400', 'p(99)<800'],
    http_req_failed:   ['rate<0.001'],
  },
};

export default function () {
  const talentId = TALENT_IDS[__VU % TALENT_IDS.length];

  // Step 1: Create offer
  const createRes = http.post(
    `${BASE_URL}/v1/offers`,
    JSON.stringify({
      talentId,
      jobListingId:   LISTING_ID,
      contractType:   'PROJECT',
      contractTitle:  `Load Test ${Date.now()}`,
      rate:           95,
      currencyCode:   'USD',
      durationMonths: 6,
      workSchedule:   { type: 'FULL_TIME' },
      startDate:      '2099-01-01',
    }),
    { headers: { ...authHeaders(CLIENT_TOKEN), 'X-Idempotency-Key': newIdempKey() } },
  );

  const createOk = check(createRes, {
    'create 201':              (r) => r.status === 201,
    'create response < 400ms': (r) => r.timings.duration < 400,
  });
  if (!createOk) { sleep(1); return; }

  const offerId = JSON.parse(createRes.body).id;
  sleep(0.2);

  // Step 2: Talent submits CO
  const coRes = http.post(
    `${BASE_URL}/v1/offers/${offerId}/counter-offers`,
    JSON.stringify({
      rate: 110, currencyCode: 'USD', durationMonths: 6,
      workSchedule: { type: 'FULL_TIME' }, startDate: '2099-01-01',
    }),
    { headers: { ...authHeaders(TALENT_TOKEN), 'X-Idempotency-Key': newIdempKey() } },
  );

  check(coRes, {
    'CO create 201':        (r) => r.status === 201,
    'CO response < 400ms':  (r) => r.timings.duration < 400,
  });
  if (coRes.status !== 201) { sleep(1); return; }

  const coId = JSON.parse(coRes.body).counterOffer.id;
  sleep(0.2);

  // Step 3: Client accepts CO
  const acceptRes = http.post(
    `${BASE_URL}/v1/offers/${offerId}/counter-offers/${coId}/accept`,
    JSON.stringify({}),
    { headers: { ...authHeaders(CLIENT_TOKEN), 'X-Idempotency-Key': newIdempKey() } },
  );

  check(acceptRes, {
    'CO accept 200 or 409':    (r) => [200, 409].includes(r.status),
    'accept response < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(0.5);
}