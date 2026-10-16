import * as crypto from 'crypto';
import {
  ClientWrappedKeyError,
  ServerSecretMissingError,
  UserKeysService,
  detectFormat,
} from './user-keys.service';

/**
 * Covers Security Tasklist item #2 Phase 1: key custody moved server-side.
 *
 * The cases that matter most here are the negative ones — a wrong-user
 * unwrap, a browser-wrapped blob, a missing server secret, an overwrite by a
 * second device. Each is a path that a passing happy-path test would never
 * touch, and each is a way for a user's message history to be silently lost
 * or silently exposed.
 */

const USER_A = '11111111-1111-4111-8111-111111111111';
const USER_B = '22222222-2222-4222-8222-222222222222';
const PEM_A =
  '-----BEGIN PRIVATE KEY-----\n' + 'A'.repeat(64) + '\n-----END PRIVATE KEY-----';
const PUB_A =
  '-----BEGIN PUBLIC KEY-----\n' + 'P'.repeat(64) + '\n-----END PUBLIC KEY-----';
const PUB_B =
  '-----BEGIN PUBLIC KEY-----\n' + 'Q'.repeat(64) + '\n-----END PUBLIC KEY-----';

/** Minimal in-memory stand-in for the TypeORM repository. */
function fakeRepo(rows: any[] = []) {
  return {
    rows,
    findOne: jest.fn(async ({ where }: any) =>
      rows.find((r) => r.userId === where.userId) ?? null,
    ),
    create: jest.fn((data: any) => ({ ...data })),
    save: jest.fn(async (row: any) => {
      const i = rows.findIndex((r) => r.userId === row.userId);
      if (i >= 0) rows[i] = row;
      else rows.push(row);
      return row;
    }),
  };
}

function makeService(rows: any[] = []) {
  const keyRepo = fakeRepo(rows);
  const deviceRepo = fakeRepo([]);
  const service = new UserKeysService(keyRepo as any, deviceRepo as any);
  return { service, keyRepo, rows };
}

describe('UserKeysService — server-side key custody', () => {
  const ORIGINAL = process.env.E2EE_SERVER_SECRET;

  beforeEach(() => {
    process.env.E2EE_SERVER_SECRET = 'a'.repeat(64);
  });

  afterAll(() => {
    if (ORIGINAL === undefined) delete process.env.E2EE_SERVER_SECRET;
    else process.env.E2EE_SERVER_SECRET = ORIGINAL;
  });

  describe('round trip', () => {
    it('stores a private key and gives it back unchanged', async () => {
      const { service } = makeService();
      await service.backupPrivateKey(USER_A, PEM_A, PUB_A);
      const out = await service.restorePrivateKey(USER_A);
      expect(out.privateKey).toBe(PEM_A);
      expect(out.format).toBe('v2');
    });

    it('never stores the key in the clear', async () => {
      const { service, rows } = makeService();
      await service.backupPrivateKey(USER_A, PEM_A, PUB_A);
      const stored = rows[0].encryptedPrivateKey as string;
      expect(stored).not.toContain('BEGIN PRIVATE KEY');
      expect(stored).not.toContain('AAAA');
      expect(stored.startsWith('v2:')).toBe(true);
      expect(stored.split(':')).toHaveLength(5);
    });

    it('uses a fresh salt per wrap, so the same key never produces the same blob', async () => {
      const { service, rows } = makeService();
      await service.backupPrivateKey(USER_A, PEM_A, PUB_A);
      const first = rows[0].encryptedPrivateKey;
      await service.backupPrivateKey(USER_A, PEM_A, PUB_A);
      const second = rows[0].encryptedPrivateKey;
      expect(second).not.toBe(first);
    });

    it('reports no backup as null rather than throwing', async () => {
      const { service } = makeService();
      const out = await service.restorePrivateKey(USER_A);
      expect(out.privateKey).toBeNull();
    });
  });

  describe('the key is bound to its owner', () => {
    it("refuses to unwrap another user's blob moved into their row", async () => {
      const { service, rows } = makeService();
      await service.backupPrivateKey(USER_A, PEM_A, PUB_A);
      const stolen = rows[0].encryptedPrivateKey;

      // Simulate the blob being written into user B's row (bad migration,
      // SQL injection, restore from the wrong backup).
      rows.push({ userId: USER_B, publicKey: PUB_B, encryptedPrivateKey: stolen });

      await expect(service.restorePrivateKey(USER_B)).rejects.toThrow();
    });
  });

  describe('legacy formats', () => {
    it('reads a legacy-3 blob written by registerDevice, which previously had no reader', async () => {
      // Reproduce the old format exactly.
      const key = crypto.scryptSync(process.env.E2EE_SERVER_SECRET!, 'e2ee-salt', 32);
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
      const ct = Buffer.concat([cipher.update(PEM_A, 'utf8'), cipher.final()]);
      const legacy = `${iv.toString('base64')}:${cipher
        .getAuthTag()
        .toString('base64')}:${ct.toString('base64')}`;

      const { service } = makeService([
        { userId: USER_A, publicKey: PUB_A, encryptedPrivateKey: legacy },
      ]);
      const out = await service.restorePrivateKey(USER_A);
      expect(out.format).toBe('legacy-3');
      expect(out.privateKey).toBe(PEM_A);
    });

    it('refuses to use a browser-wrapped legacy-2 blob, returning null instead of guessing', async () => {
      const { service } = makeService([
        { userId: USER_A, publicKey: PUB_A, encryptedPrivateKey: 'aXY=:Y3Q=' },
      ]);
      const out = await service.restorePrivateKey(USER_A);
      expect(out.format).toBe('legacy-2');
      expect(out.privateKey).toBeNull();
    });

    it('treats an unrecognisable blob as unusable rather than throwing at the caller', async () => {
      const { service } = makeService([
        { userId: USER_A, publicKey: PUB_A, encryptedPrivateKey: 'garbage' },
      ]);
      const out = await service.restorePrivateKey(USER_A);
      expect(out.format).toBe('unknown');
      expect(out.privateKey).toBeNull();
    });
  });

  describe('overwrite protection', () => {
    it('refuses a second device with a different public key', async () => {
      const { service } = makeService();
      await service.backupPrivateKey(USER_A, PEM_A, PUB_A);
      await expect(
        service.backupPrivateKey(USER_A, 'other-pem-'.repeat(8), PUB_B),
      ).rejects.toThrow(/already exists/i);
    });

    it('allows a re-backup from the same keypair, ignoring PEM whitespace differences', async () => {
      const { service } = makeService();
      await service.backupPrivateKey(USER_A, PEM_A, PUB_A);
      const rewrapped = PUB_A.replace(/\n/g, '\r\n') + '\n';
      await expect(
        service.backupPrivateKey(USER_A, PEM_A, rewrapped),
      ).resolves.toEqual({ success: true, replaced: true });
    });

    it('leaves the original recoverable after a refused overwrite', async () => {
      const { service } = makeService();
      await service.backupPrivateKey(USER_A, PEM_A, PUB_A);
      await service
        .backupPrivateKey(USER_A, 'other-pem-'.repeat(8), PUB_B)
        .catch(() => undefined);
      const out = await service.restorePrivateKey(USER_A);
      expect(out.privateKey).toBe(PEM_A);
    });
  });

  describe('missing server secret', () => {
    it('refuses to store rather than falling back to anything', async () => {
      delete process.env.E2EE_SERVER_SECRET;
      const { service, rows } = makeService();
      await expect(
        service.backupPrivateKey(USER_A, PEM_A, PUB_A),
      ).rejects.toBeInstanceOf(ServerSecretMissingError);
      expect(rows).toHaveLength(0);
    });

    it('refuses to restore rather than returning something wrong', async () => {
      const { service, rows } = makeService();
      await service.backupPrivateKey(USER_A, PEM_A, PUB_A);
      delete process.env.E2EE_SERVER_SECRET;
      await expect(service.restorePrivateKey(USER_A)).rejects.toBeInstanceOf(
        ServerSecretMissingError,
      );
    });

    it('does not need the secret to answer whether a backup exists', async () => {
      const { service } = makeService();
      await service.backupPrivateKey(USER_A, PEM_A, PUB_A);
      delete process.env.E2EE_SERVER_SECRET;
      await expect(service.backupStatus(USER_A)).resolves.toEqual({
        hasBackup: true,
        format: 'v2',
      });
    });
  });

  describe('tamper detection', () => {
    it('rejects a blob whose ciphertext was altered', async () => {
      const { service, rows } = makeService();
      await service.backupPrivateKey(USER_A, PEM_A, PUB_A);
      const parts = (rows[0].encryptedPrivateKey as string).split(':');
      const ct = Buffer.from(parts[4], 'base64');
      ct[0] ^= 0xff;
      parts[4] = ct.toString('base64');
      rows[0].encryptedPrivateKey = parts.join(':');
      await expect(service.restorePrivateKey(USER_A)).rejects.toThrow();
    });

    it('rejects a blob whose salt was swapped', async () => {
      const { service, rows } = makeService();
      await service.backupPrivateKey(USER_A, PEM_A, PUB_A);
      const parts = (rows[0].encryptedPrivateKey as string).split(':');
      parts[1] = crypto.randomBytes(16).toString('base64');
      rows[0].encryptedPrivateKey = parts.join(':');
      await expect(service.restorePrivateKey(USER_A)).rejects.toThrow();
    });
  });

  describe('detectFormat', () => {
    it.each([
      ['v2:c2FsdA==:aXY=:dGFn:Y3Q=', 'v2'],
      ['aXY=:dGFn:Y3Q=', 'legacy-3'],
      ['aXY=:Y3Q=', 'legacy-2'],
      ['nope', 'unknown'],
      // A truncated v2 blob must not be mistaken for legacy-3 and decrypted
      // with the wrong key — that would surface as a confusing auth-tag
      // failure instead of "this row is corrupt".
      ['v2:too:few', 'unknown'],
    ])('%s → %s', (blob, expected) => {
      expect(detectFormat(blob as string)).toBe(expected);
    });
  });
});

describe('error types', () => {
  it('are distinguishable, so the controller can map them to status codes', () => {
    expect(new ServerSecretMissingError()).toBeInstanceOf(Error);
    expect(new ClientWrappedKeyError()).toBeInstanceOf(Error);
    expect(new ServerSecretMissingError()).not.toBeInstanceOf(ClientWrappedKeyError);
  });
});
