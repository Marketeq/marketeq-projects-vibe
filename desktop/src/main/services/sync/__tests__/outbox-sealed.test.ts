// PMCM-832 — queued screenshots are encrypted at rest in the SQLite outbox
// and wiped once the backend acknowledges the upload.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createOutbox,
  createSqliteOutboxStore,
  stripImages,
  type OutboxPayloadCipher,
} from '../outbox';
import type { DbHandle } from '../../../db/connection';

// better-sqlite3 is built for the Electron ABI, so under a plain-Node vitest
// run it usually fails to load. Node 22.5+ ships `node:sqlite`, whose
// prepare().run/get/all match the subset the outbox store uses, so the suite
// falls back to it and only skips when neither is available.
interface TestDb {
  exec(sql: string): void;
  prepare(sql: string): {
    run(...params: unknown[]): unknown;
    get(...params: unknown[]): unknown;
    all(...params: unknown[]): unknown[];
  };
  close(): void;
}
let openDb: (() => TestDb) | null = null;
for (const mod of ['better-sqlite3', 'node:sqlite']) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const m = require(mod);
    const Ctor = mod === 'node:sqlite' ? m.DatabaseSync : m;
    const probe = new Ctor(':memory:');
    probe.close();
    openDb = () => new Ctor(':memory:') as TestDb;
    break;
  } catch {
    /* try the next driver */
  }
}
const d = openDb ? describe : describe.skip;

// Reversible stand-in for safeStorage: the test only needs the stored text
// to differ from the plaintext and to round-trip.
function fakeCipher(available = true): OutboxPayloadCipher {
  return {
    available: () => available,
    encrypt: (plain) => Buffer.from(plain, 'utf8').reverse().toString('base64'),
    decrypt: (sealed) => Buffer.from(sealed, 'base64').reverse().toString('utf8'),
  };
}

const IMAGE = Buffer.from('fake-jpeg-bytes').toString('base64');
const ICON = Buffer.from('fake-png-bytes').toString('base64');

function screenshotPayload() {
  return {
    userId: 'u1',
    key: 'screenshots/shot_1.jpg',
    imageBase64: IMAGE,
    apps: [{ appName: 'Code', iconUrl: '', iconBase64: ICON }],
  };
}

d('sqlite outbox — sealed screenshot payloads', () => {
  let db: TestDb;

  beforeEach(() => {
    db = openDb!();
    db.exec(`
      CREATE TABLE sync_queue (
        id TEXT PRIMARY KEY, created_at INTEGER NOT NULL, method TEXT NOT NULL,
        path TEXT NOT NULL, body_json TEXT NOT NULL, status TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0, last_error TEXT,
        next_attempt_at INTEGER, last_attempt_at INTEGER, completed_at INTEGER
      );
    `);
  });

  afterEach(() => db.close());

  function storedBody(id: string): string {
    return (db.prepare(`SELECT body_json FROM sync_queue WHERE id = ?`).get(id) as {
      body_json: string;
    }).body_json;
  }

  it('never writes the image in the clear, and hands it back decrypted', () => {
    const outbox = createOutbox({
      store: createSqliteOutboxStore(db as unknown as DbHandle, fakeCipher()),
    });
    outbox.enqueue({
      kind: 'screenshot.confirm',
      method: 'POST',
      path: '/screenshots/confirm',
      id: 'req_shot-1',
      payload: screenshotPayload(),
    });

    const body = storedBody('req_shot-1');
    expect(body).not.toContain(IMAGE);
    expect(body).not.toContain(ICON);
    expect(body).not.toContain('screenshots/shot_1.jpg');
    expect(JSON.parse(body).__outboxKind).toBe('screenshot.confirm');

    const [claimed] = outbox.claimNext();
    expect(claimed!.kind).toBe('screenshot.confirm');
    expect(claimed!.payload).toEqual(screenshotPayload());
  });

  it('wipes the image once the upload is acknowledged', () => {
    const outbox = createOutbox({
      store: createSqliteOutboxStore(db as unknown as DbHandle, fakeCipher()),
    });
    outbox.enqueue({
      kind: 'screenshot.confirm',
      method: 'POST',
      path: '/screenshots/confirm',
      id: 'req_shot-1',
      payload: screenshotPayload(),
    });
    outbox.claimNext();
    outbox.markDone('req_shot-1');

    expect(JSON.parse(storedBody('req_shot-1'))).toEqual({
      __outboxKind: 'screenshot.confirm',
      data: null,
    });
    expect(outbox.stats().completed).toBe(1);
  });

  it('keeps the image (still sealed) when the upload fails and will retry', () => {
    const outbox = createOutbox({
      store: createSqliteOutboxStore(db as unknown as DbHandle, fakeCipher()),
    });
    outbox.enqueue({
      kind: 'screenshot.confirm',
      method: 'POST',
      path: '/screenshots/confirm',
      id: 'req_shot-1',
      payload: screenshotPayload(),
    });
    outbox.claimNext();
    outbox.markFailed('req_shot-1', 'offline', { retryable: true, transient: true });

    expect(storedBody('req_shot-1')).not.toContain(IMAGE);
    expect(outbox.findById('req_shot-1')!.payload).toEqual(screenshotPayload());
  });

  it('drops the image rather than storing it in the clear when encryption is unavailable', () => {
    const outbox = createOutbox({
      store: createSqliteOutboxStore(db as unknown as DbHandle, fakeCipher(false)),
    });
    outbox.enqueue({
      kind: 'screenshot.confirm',
      method: 'POST',
      path: '/screenshots/confirm',
      id: 'req_shot-1',
      payload: screenshotPayload(),
    });

    const body = storedBody('req_shot-1');
    expect(body).not.toContain(IMAGE);
    expect(body).not.toContain(ICON);
    expect(outbox.findById('req_shot-1')!.payload).toEqual({
      userId: 'u1',
      key: 'screenshots/shot_1.jpg',
      apps: [{ appName: 'Code', iconUrl: '' }],
    });
  });

  it('leaves other kinds as plain JSON', () => {
    const outbox = createOutbox({
      store: createSqliteOutboxStore(db as unknown as DbHandle, fakeCipher()),
    });
    outbox.enqueue({
      kind: 'device.heartbeat',
      method: 'POST',
      path: '/devices/heartbeat',
      id: 'req_hb-1',
      payload: { deviceId: 'dev_1' },
    });
    expect(JSON.parse(storedBody('req_hb-1'))).toEqual({
      __outboxKind: 'device.heartbeat',
      data: { deviceId: 'dev_1' },
    });
  });

  it('still reads rows queued in the clear by an older build', () => {
    db.prepare(
      `INSERT INTO sync_queue (id, created_at, method, path, body_json, status, attempts)
       VALUES ('req_old', 1, 'POST', '/screenshots/confirm', ?, 'pending', 0)`,
    ).run(JSON.stringify({ __outboxKind: 'screenshot.confirm', data: screenshotPayload() }));
    const outbox = createOutbox({
      store: createSqliteOutboxStore(db as unknown as DbHandle, fakeCipher()),
    });
    expect(outbox.findById('req_old')!.payload).toEqual(screenshotPayload());
  });
});

describe('stripImages', () => {
  it('removes the screenshot and every app icon, keeping the rest', () => {
    expect(stripImages(screenshotPayload())).toEqual({
      userId: 'u1',
      key: 'screenshots/shot_1.jpg',
      apps: [{ appName: 'Code', iconUrl: '' }],
    });
  });

  it('leaves non-object payloads alone', () => {
    expect(stripImages(null)).toBeNull();
    expect(stripImages('x')).toBe('x');
  });
});
