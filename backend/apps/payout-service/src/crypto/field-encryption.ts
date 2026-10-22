import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

/**
 * Field-level encryption with a key ring, for AC-1.3.3.
 *
 * The problem this solves: every stored value used to be `iv:tag:ciphertext`
 * with nothing saying which key produced it. One key per ring, and changing it
 * made every existing bank account number, OAuth token and wallet address
 * permanently unreadable. There was no way to rotate a key without destroying
 * the data it protected.
 *
 * Values written from now on carry the id of the key that encrypted them:
 *
 *     v2:<kid>:<iv>:<tag>:<ciphertext>
 *
 * so several keys can be live at once. New writes use the current key, and old
 * rows keep decrypting under whichever key wrote them until they are
 * re-encrypted. Rotation becomes: add a key, point CURRENT at it, re-encrypt in
 * the background, retire the old one.
 *
 * Configuration, using BANK as the example:
 *
 *     BANK_ENCRYPTION_KEY_CURRENT = k2
 *     BANK_ENCRYPTION_KEY_K1      = <64 hex chars>
 *     BANK_ENCRYPTION_KEY_K2      = <64 hex chars>
 *
 * The single-key form every environment uses today still works untouched:
 *
 *     BANK_ENCRYPTION_KEY = <64 hex chars>
 *
 * It is registered as `k1` and used as current when no CURRENT is set, so no
 * environment has to change for this to ship, and values written before the
 * change keep decrypting under the same key they always did.
 */

export type Getter = (key: string) => string | undefined;

/** Keys are probed k1..k20. A ring with more live keys than that is a mistake, not a feature. */
const MAX_KEYS = 20;
const KEY_BYTES = 32;
const IV_BYTES = 12;
const VERSION = 'v2';
const HEX_KEY = /^[0-9a-fA-F]{64}$/;
const LEGACY_KID = 'k1';

export class EncryptionKeyError extends Error {}

export interface RingConfig {
  /** Human name used in errors and in the rotation record, e.g. "BANK". */
  readonly ring: string;
  /** The existing single-key variable, which is also the prefix for the ring. */
  readonly envPrefix: string;
  /** Appended to the "key is missing" error, naming what breaks if it is regenerated. */
  readonly warning: string;
}

export const RINGS = {
  BANK: {
    ring: 'BANK',
    envPrefix: 'BANK_ENCRYPTION_KEY',
    warning: 'once bank accounts have been stored',
  },
  OAUTH_TOKEN: {
    ring: 'OAUTH_TOKEN',
    envPrefix: 'OAUTH_TOKEN_ENCRYPTION_KEY',
    warning: 'once contractors have connected accounts',
  },
  CRYPTO_ADDRESS: {
    ring: 'CRYPTO_ADDRESS',
    envPrefix: 'CRYPTO_ADDRESS_ENCRYPTION_KEY',
    warning: 'once wallet addresses have been stored',
  },
} as const satisfies Record<string, RingConfig>;

export class FieldEncryption {
  private readonly keys = new Map<string, Buffer>();
  private readonly current: string;

  constructor(
    private readonly cfg: RingConfig,
    get: Getter,
  ) {
    const { envPrefix, ring, warning } = cfg;

    // Legacy single key, registered as k1 so existing rows stay readable.
    const legacy = (get(envPrefix) ?? '').trim();
    if (legacy) this.keys.set(LEGACY_KID, parseKey(legacy, envPrefix, warning));

    // Explicit ring members. A k1 defined here overrides the legacy variable,
    // which is how an environment migrates off the single-key form.
    for (let i = 1; i <= MAX_KEYS; i++) {
      const kid = `k${i}`;
      const raw = (get(`${envPrefix}_${kid.toUpperCase()}`) ?? '').trim();
      if (raw) this.keys.set(kid, parseKey(raw, `${envPrefix}_${kid.toUpperCase()}`, warning));
    }

    if (this.keys.size === 0) {
      throw new EncryptionKeyError(
        `${envPrefix} must be a 64-character hex string (32 bytes) — generate with ` +
          '`openssl rand -hex 32` and never regenerate it ' +
          `${warning}. To run several keys at once, set ${envPrefix}_K1, ` +
          `${envPrefix}_K2 … and ${envPrefix}_CURRENT instead.`,
      );
    }

    const declared = (get(`${envPrefix}_CURRENT`) ?? '').trim().toLowerCase();
    if (declared) {
      if (!this.keys.has(declared)) {
        throw new EncryptionKeyError(
          `${envPrefix}_CURRENT is "${declared}" but no ${envPrefix}_${declared.toUpperCase()} ` +
            `is set. Known keys for ring ${ring}: ${[...this.keys.keys()].join(', ')}.`,
        );
      }
      this.current = declared;
    } else {
      // Highest-numbered key wins, so adding k2 without touching CURRENT does
      // not silently keep writing under k1.
      this.current = [...this.keys.keys()].sort(byKeyNumber).pop()!;
    }
  }

  /** The key new writes use. Recorded against each value and in the rotation log. */
  currentKeyId(): string {
    return this.current;
  }

  /** Every key this process can decrypt with, oldest first. */
  knownKeyIds(): string[] {
    return [...this.keys.keys()].sort(byKeyNumber);
  }

  /** Which key wrote a stored value. `k1` for values predating the versioned format. */
  keyIdOf(stored: string): string | null {
    if (!stored) return null;
    const parts = stored.split(':');
    if (parts[0] === VERSION && parts.length === 5) return parts[1];
    if (parts.length === 3) return LEGACY_KID;
    return null;
  }

  /** True when a value was written under a key that is no longer current. */
  needsReEncryption(stored: string): boolean {
    const kid = this.keyIdOf(stored);
    return kid !== null && kid !== this.current;
  }

  encrypt(plaintext: string): string {
    if (!plaintext) return '';
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv('aes-256-gcm', this.keyFor(this.current), iv);
    const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    return [
      VERSION,
      this.current,
      iv.toString('hex'),
      cipher.getAuthTag().toString('hex'),
      ct.toString('hex'),
    ].join(':');
  }

  decrypt(stored: string): string {
    if (!stored || !stored.includes(':')) return stored;

    const parts = stored.split(':');
    let kid: string;
    let ivHex: string;
    let tagHex: string;
    let ctHex: string;

    if (parts[0] === VERSION) {
      if (parts.length !== 5) {
        throw new EncryptionKeyError(
          `Stored value claims format ${VERSION} but has ${parts.length} segments, not 5.`,
        );
      }
      [, kid, ivHex, tagHex, ctHex] = parts;
    } else if (parts.length === 3) {
      // Written before key ids existed, so by definition under the single key.
      kid = LEGACY_KID;
      [ivHex, tagHex, ctHex] = parts;
    } else {
      throw new EncryptionKeyError(
        `Stored value is in an unrecognised format (${parts.length} segments).`,
      );
    }

    const decipher = createDecipheriv('aes-256-gcm', this.keyFor(kid), Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    return decipher.update(Buffer.from(ctHex, 'hex'), undefined, 'utf8') + decipher.final('utf8');
  }

  /**
   * Re-encrypt a value under the current key. Returns the input unchanged when
   * it is already current, so a backfill can run over every row and only write
   * the ones that moved.
   */
  reEncrypt(stored: string): string {
    if (!stored || !this.needsReEncryption(stored)) return stored;
    return this.encrypt(this.decrypt(stored));
  }

  private keyFor(kid: string): Buffer {
    const key = this.keys.get(kid);
    if (!key) {
      throw new EncryptionKeyError(
        `Stored value was encrypted with key "${kid}" for ring ${this.cfg.ring}, which this ` +
          `process does not have. Set ${this.cfg.envPrefix}_${kid.toUpperCase()}. ` +
          `Available: ${this.knownKeyIds().join(', ') || 'none'}. ` +
          'Retiring a key before its data is re-encrypted makes that data unreadable.',
      );
    }
    return key;
  }
}

/**
 * Validates hex as well as length. The previous guard checked length only, so a
 * 64-character non-hex value passed startup and failed at the first encrypt
 * with an opaque error from Node instead.
 */
function parseKey(value: string, varName: string, warning: string): Buffer {
  if (!HEX_KEY.test(value)) {
    throw new EncryptionKeyError(
      `${varName} must be a 64-character hex string (32 bytes) — generate with ` +
        `\`openssl rand -hex 32\` and never regenerate it ${warning}.`,
    );
  }
  const key = Buffer.from(value, 'hex');
  /* istanbul ignore next — unreachable while HEX_KEY pins the length */
  if (key.length !== KEY_BYTES) {
    throw new EncryptionKeyError(`${varName} decoded to ${key.length} bytes, expected ${KEY_BYTES}.`);
  }
  return key;
}

/** k2 sorts after k1, and k10 after k9, which a plain string sort gets wrong. */
function byKeyNumber(a: string, b: string): number {
  return parseInt(a.slice(1), 10) - parseInt(b.slice(1), 10);
}
