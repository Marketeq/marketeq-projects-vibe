// apps/offer-service/test/load/offer-read.k6.js
// OS-33: 50 VUs reading offer state continuously for 60s.
// Thresholds: p50<50ms, p95<200ms, p99<400ms, error<0.1%
import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, CLIENT_TOKEN, authHeaders, READ_SCENARIO } from './k6.config.js';

const OFFER_IDS = (
  __ENV.OFFER_IDS ? __ENV.OFFER_IDS.split(',') : ['staging-offer-uuid-1']
);

export const options = {
  scenarios: { read: READ_SCENARIO },
  thresholds: {
    http_req_duration: ['p(50)<50', 'p(95)<200', 'p(99)<400'],
    http_req_failed:   ['rate<0.001'],
  },
};

export default function () {
  const offerId = OFFER_IDS[Math.floor(Math.random() * OFFER_IDS.length)];

  const res = http.get(
    `${BASE_URL}/v1/offers/${offerId}`,
    { headers: authHeaders(CLIENT_TOKEN) },
  );

  check(res, {
    'status is 200':         (r) => r.status === 200,
    'response has id':       (r) => JSON.parse(r.body).id !== undefined,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });

  sleep(0.1);
}