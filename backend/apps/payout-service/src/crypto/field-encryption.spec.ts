import {
  EncryptionKeyError,
  FieldEncryption,
  RINGS,
  type Getter,
} from './field-encryption';

/**
 * AC-1.3.3 — previously encrypted data stays readable after a key rotation.
 *
 * The behaviour these tests protect is the one that used to be impossible:
 * two keys live at once, old rows readable under the key that wrote them,
 * new rows written under the current key.
 */

const K1 = '11'.repeat(32);
const K2 = '22'.repeat(32);
const K3 = '33'.repeat(32);
const BANK = RINGS.BANK;

const env = (values: Record<string, string>): Getter => (k) => values[k];

const PAN = '4111111111111111';

describe('backwards compatibility with the single-key form', () => {
  it('accepts the variable every environment already sets', () => {
    const ring = new FieldEncryption(BANK, env({ BANK_ENCRYPTION_KEY: K1 }));
    expect(ring.currentKeyId()).toBe('k1');
    expect(ring.decrypt(ring.encrypt(PAN))).toBe(PAN);
  });

  it('reads values written before key ids existed', () => {
    // The old format, produced by the previous implementation.
    const legacy = legacyEncrypt(PAN, K1);
    const ring = new FieldEncryption(BANK, env({ BANK_ENCRYPTION_KEY: K1 }));
    expect(ring.decrypt(legacy)).toBe(PAN);
    expect(ring.keyIdOf(legacy)).toBe('k1');
  });

  it('still reads old values after the ring has moved on to k2', () => {
    const legacy = legacyEncrypt(PAN, K1);
    const ring = new FieldEncryption(
      BANK,
      env({ BANK_ENCRYPTION_KEY: K1, BANK_ENCRYPTION_KEY_K2: K2, BANK_ENCRYPTION_KEY_CURRENT: 'k2' }),
    );
    expect(ring.decrypt(legacy)).toBe(PAN);
    expect(ring.currentKeyId()).toBe('k2');
  });
});

describe('AC-1.3.3 — a rotation does not destroy existing data', () => {
  it('decrypts data written under the old key after the key changes', () => {
    const before = new FieldEncryption(BANK, env({ BANK_ENCRYPTION_KEY_K1: K1, BANK_ENCRYPTION_KEY_CURRENT: 'k1' }));
    const stored = before.encrypt(PAN);

    const after = new FieldEncryption(
      BANK,
      env({ BANK_ENCRYPTION_KEY_K1: K1, BANK_ENCRYPTION_KEY_K2: K2, BANK_ENCRYPTION_KEY_CURRENT: 'k2' }),
    );

    expect(after.decrypt(stored)).toBe(PAN);
    expect(after.currentKeyId()).toBe('k2');
  });

  it('writes new values under the current key while old ones stay put', () => {
    const ring = new FieldEncryption(
      BANK,
      env({ BANK_ENCRYPTION_KEY_K1: K1, BANK_ENCRYPTION_KEY_K2: K2, BANK_ENCRYPTION_KEY_CURRENT: 'k2' }),
    );
    const old = new FieldEncryption(BANK, env({ BANK_ENCRYPTION_KEY_K1: K1 })).encrypt(PAN);
    const fresh = ring.encrypt(PAN);

    expect(ring.keyIdOf(old)).toBe('k1');
    expect(ring.keyIdOf(fresh)).toBe('k2');
    expect(ring.decrypt(old)).toBe(PAN);
    expect(ring.decrypt(fresh)).toBe(PAN);
  });

  it('survives three keys, reading data from each', () => {
    const all = env({
      BANK_ENCRYPTION_KEY_K1: K1,
      BANK_ENCRYPTION_KEY_K2: K2,
      BANK_ENCRYPTION_KEY_K3: K3,
      BANK_ENCRYPTION_KEY_CURRENT: 'k3',
    });
    const v1 = new FieldEncryption(BANK, env({ BANK_ENCRYPTION_KEY_K1: K1 })).encrypt('one');
    const v2 = new FieldEncryption(BANK, env({ BANK_ENCRYPTION_KEY_K2: K2 })).encrypt('two');
    const ring = new FieldEncryption(BANK, all);

    expect(ring.decrypt(v1)).toBe('one');
    expect(ring.decrypt(v2)).toBe('two');
    expect(ring.decrypt(ring.encrypt('three'))).toBe('three');
    expect(ring.knownKeyIds()).toEqual(['k1', 'k2', 'k3']);
  });

  it('says which values still need re-encrypting', () => {
    const ring = new FieldEncryption(
      BANK,
      env({ BANK_ENCRYPTION_KEY_K1: K1, BANK_ENCRYPTION_KEY_K2: K2, BANK_ENCRYPTION_KEY_CURRENT: 'k2' }),
    );
    const old = new FieldEncryption(BANK, env({ BANK_ENCRYPTION_KEY_K1: K1 })).encrypt(PAN);

    expect(ring.needsReEncryption(old)).toBe(true);
    expect(ring.needsReEncryption(ring.encrypt(PAN))).toBe(false);
    expect(ring.needsReEncryption(legacyEncrypt(PAN, K1))).toBe(true);
  });

  it('re-encrypts an old value onto the current key, preserving the plaintext', () => {
    const ring = new FieldEncryption(
      BANK,
      env({ BANK_ENCRYPTION_KEY_K1: K1, BANK_ENCRYPTION_KEY_K2: K2, BANK_ENCRYPTION_KEY_CURRENT: 'k2' }),
    );
    const old = new FieldEncryption(BANK, env({ BANK_ENCRYPTION_KEY_K1: K1 })).encrypt(PAN);

    const moved = ring.reEncrypt(old);
    expect(ring.keyIdOf(moved)).toBe('k2');
    expect(ring.decrypt(moved)).toBe(PAN);
  });

  it('leaves an already-current value untouched, so a backfill only writes what moved', () => {
    const ring = new FieldEncryption(BANK, env({ BANK_ENCRYPTION_KEY_K1: K1 }));
    const current = ring.encrypt(PAN);
    expect(ring.reEncrypt(current)).toBe(current);
  });
});

describe('retiring a key too early is loud, not silent', () => {
  it('names the missing key and what to do when data needs it', () => {
    const old = new FieldEncryption(BANK, env({ BANK_ENCRYPTION_KEY_K1: K1 })).encrypt(PAN);
    const retired = new FieldEncryption(BANK, env({ BANK_ENCRYPTION_KEY_K2: K2, BANK_ENCRYPTION_KEY_CURRENT: 'k2' }));

    expect(() => retired.decrypt(old)).toThrow(/key "k1"/);
    expect(() => retired.decrypt(old)).toThrow(/BANK_ENCRYPTION_KEY_K1/);
  });
});

describe('key ids are recorded on every value written', () => {
  it('uses the versioned format', () => {
    const ring = new FieldEncryption(BANK, env({ BANK_ENCRYPTION_KEY_K1: K1 }));
    const parts = ring.encrypt(PAN).split(':');
    expect(parts).toHaveLength(5);
    expect(parts[0]).toBe('v2');
    expect(parts[1]).toBe('k1');
  });

  it('never leaks the plaintext into the stored value', () => {
    const stored = new FieldEncryption(BANK, env({ BANK_ENCRYPTION_KEY_K1: K1 })).encrypt(PAN);
    expect(stored).not.toContain(PAN);
    expect(stored).not.toContain('1111');
  });

  it('detects tampering', () => {
    const ring = new FieldEncryption(BANK, env({ BANK_ENCRYPTION_KEY_K1: K1 }));
    const parts = ring.encrypt(PAN).split(':');
    const ct = Buffer.from(parts[4], 'hex');
    ct[0] ^= 0xff;
    parts[4] = ct.toString('hex');
    expect(() => ring.decrypt(parts.join(':'))).toThrow();
  });
});

describe('choosing the current key', () => {
  it('honours CURRENT when set', () => {
    const ring = new FieldEncryption(
      BANK,
      env({ BANK_ENCRYPTION_KEY_K1: K1, BANK_ENCRYPTION_KEY_K2: K2, BANK_ENCRYPTION_KEY_CURRENT: 'k1' }),
    );
    expect(ring.currentKeyId()).toBe('k1');
  });

  it('defaults to the highest key, so adding k2 does not silently keep writing k1', () => {
    const ring = new FieldEncryption(BANK, env({ BANK_ENCRYPTION_KEY_K1: K1, BANK_ENCRYPTION_KEY_K2: K2 }));
    expect(ring.currentKeyId()).toBe('k2');
  });

  it('orders k10 after k9 rather than alphabetically', () => {
    const values: Record<string, string> = { BANK_ENCRYPTION_KEY_K9: K1, BANK_ENCRYPTION_KEY_K10: K2 };
    expect(new FieldEncryption(BANK, env(values)).currentKeyId()).toBe('k10');
  });

  it('refuses to start when CURRENT points at a key that is not set', () => {
    expect(
      () => new FieldEncryption(BANK, env({ BANK_ENCRYPTION_KEY_K1: K1, BANK_ENCRYPTION_KEY_CURRENT: 'k7' })),
    ).toThrow(/BANK_ENCRYPTION_KEY_K7/);
  });
});

describe('AC-1.3.1 — presence and format, including the hex gap', () => {
  it('refuses to start with no key at all', () => {
    expect(() => new FieldEncryption(BANK, env({}))).toThrow(EncryptionKeyError);
    expect(() => new FieldEncryption(BANK, env({}))).toThrow(/openssl rand -hex 32/);
    expect(() => new FieldEncryption(BANK, env({}))).toThrow(/never regenerate/i);
  });

  it('rejects a key of the wrong length', () => {
    expect(() => new FieldEncryption(BANK, env({ BANK_ENCRYPTION_KEY: 'a'.repeat(63) }))).toThrow();
  });

  /** The gap the old length-only guard left: this used to pass startup. */
  it('rejects a 64-character value that is not hex', () => {
    expect(() => new FieldEncryption(BANK, env({ BANK_ENCRYPTION_KEY: 'z'.repeat(64) }))).toThrow(
      /64-character hex/,
    );
  });

  it('names the offending variable, not just the ring', () => {
    expect(
      () => new FieldEncryption(BANK, env({ BANK_ENCRYPTION_KEY_K2: 'nope' })),
    ).toThrow(/BANK_ENCRYPTION_KEY_K2/);
  });
});

describe('every ring is configured', () => {
  it.each(Object.values(RINGS))('$ring has a prefix and a warning', (cfg) => {
    expect(cfg.envPrefix).toMatch(/_ENCRYPTION_KEY$/);
    expect(cfg.warning.length).toBeGreaterThan(10);
  });

  it.each(Object.values(RINGS))('$ring round-trips', (cfg) => {
    const ring = new FieldEncryption(cfg, env({ [cfg.envPrefix]: K1 }));
    expect(ring.decrypt(ring.encrypt(PAN))).toBe(PAN);
  });
});

describe('empty and malformed input', () => {
  const ring = () => new FieldEncryption(BANK, env({ BANK_ENCRYPTION_KEY: K1 }));

  it('passes empty values straight through', () => {
    expect(ring().encrypt('')).toBe('');
    expect(ring().decrypt('')).toBe('');
  });

  it('leaves a value with no separator alone, as the old code did', () => {
    expect(ring().decrypt('not-encrypted')).toBe('not-encrypted');
  });

  it('rejects a value claiming v2 with the wrong number of segments', () => {
    expect(() => ring().decrypt('v2:k1:aa:bb')).toThrow(/claims format v2 but has 4 segments/);
  });

  it('reports no key id for a value it cannot classify', () => {
    expect(ring().keyIdOf('v2:k1:aa:bb')).toBeNull();
  });
});

/** Reproduces the pre-rotation format exactly, to prove old rows still read. */
function legacyEncrypt(plaintext: string, keyHex: string): string {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createCipheriv, randomBytes } = require('crypto');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', Buffer.from(keyHex, 'hex'), iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return [iv.toString('hex'), cipher.getAuthTag().toString('hex'), ct.toString('hex')].join(':');
}
