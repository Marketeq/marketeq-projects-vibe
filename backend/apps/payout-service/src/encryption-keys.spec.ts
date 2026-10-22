import { ConfigService } from '@nestjs/config';

/**
 * Test case PMCM-739 / US-1.3 — custody of the financial encryption keys.
 * Acceptance criteria AC-1.3.1 to AC-1.3.4.
 *
 * The three keys here protect bank account numbers, OAuth provider tokens and
 * crypto wallet addresses. Each one used to respond to a missing or malformed
 * value by generating a random key and carrying on, which silently made every
 * previously encrypted record unreadable on the next restart, with no error
 * and no log anyone would notice. All three now refuse to start.
 *
 * These tests exercise the real constructors rather than a reimplementation of
 * the guard, because the thing worth proving is that *these services* refuse,
 * not that a copy of their logic would.
 */

// Both OAuth and crypto-connection open a Redis connection before they reach
// the key check. Stub it so the constructor can be exercised without a server.
jest.mock('ioredis', () => {
  class RedisStub {
    on() { return this; }
    quit() { return Promise.resolve(); }
    disconnect() { /* no-op */ }
  }
  return { __esModule: true, default: RedisStub, Redis: RedisStub };
});

// Pulled in transitively by the crypto address validator, which this spec
// never calls. Mocked virtually so the suite runs whether or not the package
// happens to be installed locally.
jest.mock('js-sha3', () => ({ keccak256: jest.fn(() => '') }), { virtual: true });

import { BankEncryptionService } from './methods/bank-encryption.service';
import { OAuthService } from './oauth/oauth.service';
import { CryptoConnectionService } from './crypto/crypto-connection.service';

const VALID_KEY = 'a'.repeat(64);
const OTHER_KEY = 'b'.repeat(64);

/** ConfigService stand-in: returns the given values, default otherwise. */
function config(values: Record<string, string>): ConfigService {
  return {
    get: (key: string, fallback?: unknown) =>
      key in values ? values[key] : fallback,
  } as unknown as ConfigService;
}

/** The other six constructor arguments are never touched before the key check. */
const unused = [null, null, null, null, null, null] as any[];

function makeBank(keyValue?: string) {
  return new BankEncryptionService(
    config(keyValue === undefined ? {} : { BANK_ENCRYPTION_KEY: keyValue }),
  );
}

function makeOAuth(keyValue?: string) {
  const cfg = config(
    keyValue === undefined ? {} : { OAUTH_TOKEN_ENCRYPTION_KEY: keyValue },
  );
  // (methodRepo, dataSource, config, auditService, publisher, stripeProvider, pauseStatusService)
  return new OAuthService(unused[0], unused[1], cfg, unused[2], unused[3], unused[4], unused[5]);
}

function makeCrypto(keyValue?: string) {
  const cfg = config(
    keyValue === undefined ? {} : { CRYPTO_ADDRESS_ENCRYPTION_KEY: keyValue },
  );
  // (methodRepo, config, addressValidator, conversionSvc, providerValidator, auditService, walletConnectClient)
  return new CryptoConnectionService(unused[0], cfg, unused[1], unused[2], unused[3], unused[4], unused[5]);
}

const SERVICES: Array<[string, string, (k?: string) => unknown]> = [
  ['BankEncryptionService', 'BANK_ENCRYPTION_KEY', makeBank],
  ['OAuthService', 'OAUTH_TOKEN_ENCRYPTION_KEY', makeOAuth],
  ['CryptoConnectionService', 'CRYPTO_ADDRESS_ENCRYPTION_KEY', makeCrypto],
];

describe('AC-1.3.1 — each key is validated for presence and format before any crypto runs', () => {
  it.each(SERVICES)('%s accepts a valid 32-byte hex key', (_name, _env, make) => {
    expect(() => make(VALID_KEY)).not.toThrow();
  });

  it.each(SERVICES)('%s rejects a key of the wrong length', (_name, _env, make) => {
    expect(() => make('a'.repeat(63))).toThrow();
    expect(() => make('a'.repeat(65))).toThrow();
    expect(() => make('')).toThrow();
  });

  it.each(SERVICES)('%s rejects an empty value the same as a missing one', (_name, _env, make) => {
    expect(() => make('')).toThrow();
  });

  /**
   * Closed 2026-10-19. The guard used to check length only, so a 64-character
   * value that was not hex passed startup and failed later at the first
   * encrypt. FieldEncryption validates hex as well, which is what AC-1.3.1
   * asks for: format checked before any encryption is permitted.
   */
  it.each(SERVICES)('%s rejects a 64-character value that is not hex', (_name, _env, make) => {
    expect(() => make('z'.repeat(64))).toThrow(/64-character hex/);
  });
});

describe('AC-1.3.2 — a missing key fails startup and never substitutes a generated one', () => {
  it.each(SERVICES)('%s throws when the key is absent', (_name, _env, make) => {
    expect(() => make(undefined)).toThrow();
  });

  it.each(SERVICES)('%s names the missing variable in the error', (_name, env, make) => {
    expect(() => make(undefined)).toThrow(new RegExp(env));
  });

  it.each(SERVICES)('%s tells the operator how to generate one', (_name, _env, make) => {
    expect(() => make(undefined)).toThrow(/openssl rand -hex 32/);
  });

  it.each(SERVICES)('%s warns against regenerating a key already in use', (_name, _env, make) => {
    expect(() => make(undefined)).toThrow(/never regenerate/i);
  });

  /**
   * The point of the whole criterion. The old behaviour produced a usable
   * service whose key existed only in memory, so this asserts that no instance
   * is returned at all when the key is missing.
   */
  it.each(SERVICES)('%s produces no usable instance without a key', (_name, _env, make) => {
    let instance: unknown;
    try {
      instance = make(undefined);
    } catch {
      instance = undefined;
    }
    expect(instance).toBeUndefined();
  });
});

describe('AC-1.3.3 — data stays readable across a key rotation (closed)', () => {
  it('round-trips under a single key', () => {
    const service = makeBank(VALID_KEY);
    const stored = service.encrypt('12345678901234');
    expect(stored).not.toContain('12345678901234');
    expect(service.decrypt(stored)).toBe('12345678901234');
  });

  /**
   * Closed 2026-10-19. Stored values now carry the id of the key that wrote
   * them, so several keys can be live at once and old rows keep decrypting
   * under the key that produced them.
   *
   * Full coverage of the key ring lives in crypto/field-encryption.spec.ts.
   * These two keep the criterion visible at the level of the service the test
   * case actually names.
   */
  it('reads data written under the previous key after a rotation', () => {
    const before = makeBank(VALID_KEY);
    const stored = before.encrypt('12345678901234');

    const after = new BankEncryptionService(
      config({
        BANK_ENCRYPTION_KEY_K1: VALID_KEY,
        BANK_ENCRYPTION_KEY_K2: OTHER_KEY,
        BANK_ENCRYPTION_KEY_CURRENT: 'k2',
      }),
    );

    expect(after.decrypt(stored)).toBe('12345678901234');
    expect(after.currentKeyId()).toBe('k2');
    expect(after.needsReEncryption(stored)).toBe(true);
  });

  it('stamps every stored value with the key that wrote it', () => {
    const stored = makeBank(VALID_KEY).encrypt('12345678901234');
    const parts = stored.split(':');
    expect(parts).toHaveLength(5);
    expect(parts[0]).toBe('v2');
    expect(parts[1]).toBe('k1');
  });
});

describe('AC-1.3.4 — keys come from a managed KMS rather than the process environment', () => {
  /**
   * Target state, not current state, and flagged as such in the acceptance
   * criteria themselves. All three keys are read from environment variables
   * through ConfigService, which is what the criterion rules out.
   *
   * Tracked in docs/md/CyberSecurity/Encryption Key Management — Audit and
   * KMS Plan.md. Left as a skipped test so the criterion is visible in the
   * run output rather than silently absent.
   */
  it.todo('keys are fetched from a KMS at the moment of use, not held in process env');
});
