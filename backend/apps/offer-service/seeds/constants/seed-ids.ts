// apps/offer-service/seeds/constants/seed-ids.ts
// OS-18: Fixed UUIDs for all seed and fixture records.
//
// Party and listing ids default to synthetic UUIDs so the seed is portable and
// runs identically on any machine. To point the seed at REAL local accounts —
// so seeded offers are visible when you sign in — override via env vars:
//
//   $env:SEED_TALENT_ID="<uuid from user_service.users>"
//   $env:SEED_CLIENT_ID="<uuid from user_service.users>"
//   $env:SEED_LISTING_IDS="<uuid>,<uuid>,<uuid>,<uuid>"   # optional, from listings.project
//   npx ts-node apps/offer-service/seeds/seed.ts
//
// Every talent slot resolves to one talent and every client slot to one client,
// which is what puts the full status spread (PENDING / ACCEPTED / DECLINED /
// WITHDRAWN / EXPIRED / COUNTERED) in front of a single signed-in user. There is
// no unique constraint on (client_id, talent_id), so reusing the pair is safe.
//
// Local dev only — seed.ts refuses to run unless NODE_ENV is development/test/local.

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Read a uuid from env, falling back to the portable default. Bad values fail loudly. */
function uuidFromEnv(key: string, fallback: string): string {
  const raw = process.env[key]?.trim();
  if (!raw) return fallback;
  if (!UUID_RE.test(raw)) {
    throw new Error(`[seed] ${key}="${raw}" is not a valid UUID.`);
  }
  return raw;
}

const TALENT_ID = uuidFromEnv('SEED_TALENT_ID', '20000000-0000-4000-a000-000000000001');
const CLIENT_ID = uuidFromEnv('SEED_CLIENT_ID', '10000000-0000-4000-a000-000000000001');

const DEFAULT_LISTINGS = [
  '30000000-0000-4000-a000-000000000001',
  '30000000-0000-4000-a000-000000000002',
  '30000000-0000-4000-a000-000000000003',
  '30000000-0000-4000-a000-000000000004',
];

/** SEED_LISTING_IDS is a comma-separated list; missing entries fall back per-slot. */
const listingOverrides = (process.env.SEED_LISTING_IDS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const listing = (slot: number): string => {
  const override = listingOverrides[slot];
  if (!override) return DEFAULT_LISTINGS[slot];
  if (!UUID_RE.test(override)) {
    throw new Error(`[seed] SEED_LISTING_IDS[${slot}]="${override}" is not a valid UUID.`);
  }
  return override;
};

export const SEED_USERS = {
  CLIENT_A: CLIENT_ID,
  CLIENT_B: CLIENT_ID,
  TALENT_X: TALENT_ID,
  TALENT_Y: TALENT_ID,
  TALENT_Z: TALENT_ID,
} as const;

export const SEED_LISTINGS = {
  PROJECT_ALPHA: listing(0),
  SERVICE_BETA: listing(1),
  TEAM_GAMMA: listing(2),
  CONTRACT_DELTA: listing(3),
} as const;

export const SEED_OFFERS = {
  PENDING: '40000000-0000-4000-a000-000000000001',
  ACCEPTED: '40000000-0000-4000-a000-000000000002',
  DECLINED: '40000000-0000-4000-a000-000000000003',
  WITHDRAWN: '40000000-0000-4000-a000-000000000004',
  EXPIRED: '40000000-0000-4000-a000-000000000005',
  COUNTERED: '40000000-0000-4000-a000-000000000006',
  EXPIRED_30_DAYS: '40000000-0000-4000-a000-000000000007',
  EXPIRING_SOON: '40000000-0000-4000-a000-000000000008',
  RESENT: '40000000-0000-4000-a000-000000000009',
  RESENT_ORIGINAL: '40000000-0000-4000-a000-000000000010',
  CO_MULTI_ROUND: '40000000-0000-4000-a000-000000000011',
  DIFFERENT_CURRENCY: '40000000-0000-4000-a000-000000000012',
} as const;

export const SEED_COUNTER_OFFERS = {
  PENDING: '50000000-0000-4000-a000-000000000001',
  ACCEPTED: '50000000-0000-4000-a000-000000000002',
  DECLINED: '50000000-0000-4000-a000-000000000003',
  WITHDRAWN: '50000000-0000-4000-a000-000000000004',
  EXPIRED: '50000000-0000-4000-a000-000000000005',
  SUPERSEDED: '50000000-0000-4000-a000-000000000006',
  ROUND_1: '50000000-0000-4000-a000-000000000007',
  ROUND_2: '50000000-0000-4000-a000-000000000008',
  ROUND_3: '50000000-0000-4000-a000-000000000009',
} as const;

export const SEED_HISTORY = {
  OFFER_CREATED: '60000000-0000-4000-a000-000000000001',
  OFFER_ACCEPTED: '60000000-0000-4000-a000-000000000002',
  OFFER_COUNTERED: '60000000-0000-4000-a000-000000000003',
} as const;
