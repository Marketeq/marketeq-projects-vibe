// apps/offer-service/test/load/k6.config.js
// OS-33: Shared k6 configuration for all load test scripts.
// Reads from environment variables so same scripts run against local/staging/prod.

export const BASE_URL     = __ENV.TARGET_URL   || 'http://localhost:3023';
export const CLIENT_TOKEN = __ENV.CLIENT_TOKEN  || 'test-client-jwt';
export const TALENT_TOKEN = __ENV.TALENT_TOKEN  || 'test-talent-jwt';

export function authHeaders(token) {
  return {
    'Content-Type':  'application/json',
    Authorization:   `Bearer ${token}`,
  };
}

export function newIdempKey() {
  // k6 doesn't have crypto.randomUUID(); use a simple random string.
  return `${Date.now()}-${Math.random().toString(36).substr(2, 12)}`;
}

export const THRESHOLDS = {
  read: {
    http_req_duration: ['p(50)<50', 'p(95)<200', 'p(99)<400'],
    http_req_failed:   ['rate<0.001'],
  },
  mutation: {
    http_req_duration: ['p(50)<100', 'p(95)<400', 'p(99)<800'],
    http_req_failed:   ['rate<0.001'],
  },
};

export const READ_SCENARIO = {
  executor:   'constant-vus',
  vus:        50,
  duration:   '60s',
};

export const RAMP_SCENARIO = {
  executor: 'ramping-vus',
  startVUs: 5,
  stages: [
    { duration: '30s', target: 20 },
    { duration: '60s', target: 50 },
    { duration: '30s', target: 50 },
    { duration: '20s', target: 0 },
  ],
};
