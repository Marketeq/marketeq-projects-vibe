'use strict';
const {
  parseMode,
  filterEnv,
  describe: describeResult,
  isSensitiveName,
} = require('./env-isolation');

/**
 * The behaviour worth protecting here is mostly the refusals: that monitor
 * changes nothing, that an unknown service still boots, and that a bad mode
 * value does not silently start withholding things from a live platform.
 */

const MANIFEST = {
  baseline: ['PATH', 'NODE_ENV', 'DATABASE_URL', 'npm_*'],
  shared: ['JWT_SECRET'],
  services: {
    'wallet-service': { scanned: ['STRIPE_SECRET_KEY'], extra: [] },
    'payout-service': { scanned: ['BANK_ENCRYPTION_KEY'], extra: ['BANK_ENCRYPTION_KEY_*'] },
  },
};

const FULL = {
  PATH: '/usr/bin',
  NODE_ENV: 'production',
  DATABASE_URL: 'postgres://…',
  JWT_SECRET: 'jwt',
  STRIPE_SECRET_KEY: 'sk_live_…',
  BANK_ENCRYPTION_KEY: 'aa',
  BANK_ENCRYPTION_KEY_K2: 'bb',
  TAX_TIN_ENCRYPTION_KEY: 'cc',
  npm_config_cache: '/tmp',
};

describe('mode parsing', () => {
  it.each(['off', 'monitor', 'enforce'])('accepts %s', (m) => {
    expect(parseMode(m)).toEqual({ mode: m, valid: true });
  });

  it('defaults to monitor when unset', () => {
    expect(parseMode(undefined)).toEqual({ mode: 'monitor', valid: true });
    expect(parseMode('')).toEqual({ mode: 'monitor', valid: true });
  });

  /** A typo must not start withholding variables from a running platform. */
  it('falls back to monitor on an unrecognised value, and says it is invalid', () => {
    expect(parseMode('enfroce')).toEqual({ mode: 'monitor', valid: false });
    expect(parseMode('ENFORCE ')).toEqual({ mode: 'enforce', valid: true });
  });
});

describe('monitor mode changes nothing', () => {
  const r = filterEnv('wallet-service', FULL, MANIFEST, 'monitor');

  it('hands over the full environment', () => {
    expect(r.env).toBe(FULL);
  });

  it('still reports what it would have withheld', () => {
    expect(r.withheld).toContain('TAX_TIN_ENCRYPTION_KEY');
    expect(r.withheld).toContain('BANK_ENCRYPTION_KEY');
  });
});

describe('off mode is the old behaviour exactly', () => {
  const r = filterEnv('wallet-service', FULL, MANIFEST, 'off');
  it('passes everything and reports nothing', () => {
    expect(r.env).toBe(FULL);
    expect(r.withheld).toEqual([]);
    expect(describeResult('wallet-service', r)).toBeNull();
  });
});

describe('enforce mode', () => {
  const r = filterEnv('wallet-service', FULL, MANIFEST, 'enforce');

  it('keeps the baseline', () => {
    expect(r.env.PATH).toBe('/usr/bin');
    expect(r.env.DATABASE_URL).toBeDefined();
  });

  it('keeps what the shared libraries read', () => {
    expect(r.env.JWT_SECRET).toBe('jwt');
  });

  it('keeps what the service itself reads', () => {
    expect(r.env.STRIPE_SECRET_KEY).toBe('sk_live_…');
  });

  it('withholds the keys that belong to other services', () => {
    expect(r.env.BANK_ENCRYPTION_KEY).toBeUndefined();
    expect(r.env.TAX_TIN_ENCRYPTION_KEY).toBeUndefined();
  });

  it('supports prefix entries for names built at runtime', () => {
    const p = filterEnv('payout-service', FULL, MANIFEST, 'enforce');
    expect(p.env.BANK_ENCRYPTION_KEY).toBe('aa');
    expect(p.env.BANK_ENCRYPTION_KEY_K2).toBe('bb');
    expect(p.env.TAX_TIN_ENCRYPTION_KEY).toBeUndefined();
  });

  it('matches baseline prefixes too', () => {
    expect(r.env.npm_config_cache).toBe('/tmp');
  });

  it('does not mutate the environment it was given', () => {
    expect(FULL.BANK_ENCRYPTION_KEY).toBe('aa');
  });
});

describe('a service with no manifest entry still boots', () => {
  const r = filterEnv('brand-new-service', FULL, MANIFEST, 'enforce');

  it('gets the full environment rather than failing', () => {
    expect(r.env).toBe(FULL);
    expect(r.known).toBe(false);
  });

  it('is reported so it does not stay unnoticed', () => {
    expect(describeResult('brand-new-service', r)).toMatch(/no manifest entry/);
  });
});

describe('what the log says', () => {
  it('counts secret-looking names instead of listing them', () => {
    const line = describeResult('wallet-service', filterEnv('wallet-service', FULL, MANIFEST, 'enforce'));
    expect(line).toMatch(/secret-looking/);
    expect(line).not.toContain('sk_live_');
    expect(line).not.toContain('TAX_TIN_ENCRYPTION_KEY');
  });

  it('distinguishes monitor from enforce', () => {
    expect(describeResult('wallet-service', filterEnv('wallet-service', FULL, MANIFEST, 'monitor')))
      .toMatch(/would withhold/);
    expect(describeResult('wallet-service', filterEnv('wallet-service', FULL, MANIFEST, 'enforce')))
      .toMatch(/withheld \d+/);
  });

  it('says so plainly when nothing is withheld', () => {
    const everything = { ...MANIFEST, services: { 'x': { scanned: Object.keys(FULL), extra: [] } } };
    const r = filterEnv('x', FULL, everything, 'enforce');
    expect(describeResult('x', r)).toMatch(/nothing withheld/);
  });
});

describe('which names count as secret-looking', () => {
  it.each([
    'JWT_SECRET', 'BANK_ENCRYPTION_KEY', 'STRIPE_SECRET_KEY',
    'AUTH_JWT_PRIVATE_KEY', 'ABLY_API_KEY', 'DB_PASSWORD', 'SOME_TOKEN',
  ])('%s', (n) => expect(isSensitiveName(n)).toBe(true));

  it.each(['PATH', 'NODE_ENV', 'DATABASE_SSL_ENABLED', 'PORT'])('%s is not', (n) =>
    expect(isSensitiveName(n)).toBe(false),
  );
});
