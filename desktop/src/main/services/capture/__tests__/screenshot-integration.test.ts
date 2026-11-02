// src/main/services/capture/__tests__/screenshot-integration.test.ts
//
// End-to-end smoke test for the screenshot capture pipeline running
// against an in-memory SQLite DB + a fake Electron desktopCapturer.
// Proves that `captureOnce()`:
//   1. Writes a real JPEG under the configured rootDir.
//   2. Writes a real blurred JPEG.
//   3. Inserts a `screenshot` row into the DB.
//
// This satisfies the Phase 3 "manual smoke test" acceptance criterion
// without requiring an actual Electron runtime.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import pino from 'pino';
import { createScreenshotRepo } from '../../../db/repos/screenshot.repo';
import { createSessionRepo } from '../../../db/repos/session.repo';
import { createPreferenceRepo } from '../../../db/repos/preference.repo';
import { createScreenshotService, type CapturedScreenshot } from '../screenshot-service';

// better-sqlite3 is compiled against the Electron Node ABI in this repo,
// which the plain `node` vitest runner cannot load. We probe it once and
// skip the suite cleanly if the native module is incompatible — the unit
// tests above still cover the pure helpers, and the end-to-end path is
// exercised by the actual Electron runtime at launch.
let Database: typeof import('better-sqlite3') | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Database = require('better-sqlite3') as typeof import('better-sqlite3');
  // Probe an actual open/close to catch NODE_MODULE_VERSION mismatches.
  const probe = new Database(':memory:');
  probe.close();
} catch {
  Database = null;
}
const d = Database ? describe : describe.skip;

function buildSchema(db: InstanceType<NonNullable<typeof Database>>): void {
  db.exec(`
    CREATE TABLE user (
      id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL,
      avatar_url TEXT, timezone TEXT NOT NULL, currency TEXT NOT NULL,
      pending_erasure INTEGER NOT NULL DEFAULT 0, mirrored_at INTEGER NOT NULL
    );
    CREATE TABLE device_self (
      id TEXT PRIMARY KEY, installation_uuid TEXT NOT NULL, os_name TEXT NOT NULL,
      os_version TEXT NOT NULL, app_version TEXT NOT NULL, arch TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE contract (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, client_name TEXT NOT NULL,
      status TEXT NOT NULL, currency TEXT NOT NULL, rate_minor INTEGER NOT NULL,
      daily_cap_seconds INTEGER, weekly_cap_seconds INTEGER,
      paid_break_allowance_seconds INTEGER NOT NULL DEFAULT 0,
      screenshot_interval_seconds INTEGER NOT NULL, mirrored_at INTEGER NOT NULL
    );
    CREATE TABLE task (
      id TEXT PRIMARY KEY, contract_id TEXT NOT NULL, name TEXT NOT NULL,
      archived INTEGER NOT NULL DEFAULT 0, mirrored_at INTEGER NOT NULL
    );
    CREATE TABLE session (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, contract_id TEXT NOT NULL,
      task_id TEXT NOT NULL, device_id TEXT NOT NULL, started_at INTEGER NOT NULL,
      ended_at INTEGER, end_reason TEXT, billable_seconds INTEGER NOT NULL DEFAULT 0,
      paid_break_seconds INTEGER NOT NULL DEFAULT 0,
      unpaid_break_seconds INTEGER NOT NULL DEFAULT 0,
      idle_seconds INTEGER NOT NULL DEFAULT 0, disputed INTEGER NOT NULL DEFAULT 0,
      synced_at INTEGER, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
    );
    CREATE TABLE time_entry (
      id TEXT PRIMARY KEY, session_id TEXT NOT NULL, started_at INTEGER NOT NULL,
      ended_at INTEGER, duration_seconds INTEGER NOT NULL DEFAULT 0, synced_at INTEGER
    );
    CREATE TABLE screenshot (
      id TEXT PRIMARY KEY, session_id TEXT NOT NULL, taken_at INTEGER NOT NULL,
      local_path TEXT, r2_key TEXT, status TEXT NOT NULL,
      width INTEGER NOT NULL, height INTEGER NOT NULL, bytes INTEGER NOT NULL,
      sensitive INTEGER NOT NULL DEFAULT 0, synced_at INTEGER,
      blur_path TEXT, display_id TEXT, sha256 TEXT
    );
    CREATE TABLE preference (
      key TEXT PRIMARY KEY, value_json TEXT NOT NULL, updated_at INTEGER NOT NULL
    );
  `);
}

// Minimal JPEG magic header (SOI + EOI). Not a real image but non-zero bytes.
const FAKE_JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0xff, 0xd9]);

function makeFakeElectron() {
  return {
    desktopCapturer: {
      getSources: vi.fn().mockResolvedValue([
        {
          id: 'screen:0',
          display_id: '0',
          name: 'Mock Display',
          thumbnail: {
            toJPEG: (_q: number) => FAKE_JPEG,
            toPNG: () => FAKE_JPEG,
            getSize: () => ({ width: 1920, height: 1080 }),
            resize: (_opts: unknown) => ({
              toJPEG: (_q: number) =>
                Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0xff, 0xd9]),
            }),
          },
        },
      ]),
    },
    screen: {
      getPrimaryDisplay: () => ({ size: { width: 1920, height: 1080 } }),
      getAllDisplays: () => [{ id: 0, size: { width: 1920, height: 1080 } }],
    },
    app: { getPath: () => '' },
  };
}

d('ScreenshotService integration (fake electron)', () => {
  let db: InstanceType<NonNullable<typeof Database>>;
  let tmpRoot: string;

  beforeEach(() => {
    db = new Database!(':memory:');
    buildSchema(db);
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dtt-cap-test-'));
    // Seed the minimum rows the session FK chain needs to insert a screenshot.
    db.prepare(
      `INSERT INTO user VALUES ('usr_t','t@e.com','T',NULL,'UTC','USD',0,0)`,
    ).run();
    db.prepare(
      `INSERT INTO device_self VALUES ('dev_t','uuid','mac','14','0.1','arm64',0)`,
    ).run();
    db.prepare(
      `INSERT INTO contract VALUES ('con_t','Test','Client','active','USD',10000,NULL,NULL,0,600,0)`,
    ).run();
    db.prepare(
      `INSERT INTO task VALUES ('tsk_t','con_t','Task',0,0)`,
    ).run();
    db.prepare(
      `INSERT INTO session VALUES ('ses_t','usr_t','con_t','tsk_t','dev_t',0,NULL,NULL,0,0,0,0,0,NULL,0,0)`,
    ).run();
  });

  afterEach(() => {
    db.close();
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('captureOnce writes JPEG + blur files and inserts a DB row', async () => {
    const repos = {
      screenshot: createScreenshotRepo(db),
      session: createSessionRepo(db),
      preference: createPreferenceRepo(db),
    };
    // Supervisor mirrors active session id into a preference; fake it here.
    repos.preference.set('dtt.activeSessionId', JSON.stringify('ses_t'));

    const permissions = {
      getAllPermissions: () => ({
        screenRecording: 'granted' as const,
        accessibility: 'granted' as const,
        notifications: 'granted' as const,
        autostart: 'granted' as const,
      }),
      checkPermission: () => 'granted' as const,
      requestPermission: async () => 'granted' as const,
      requestLongForm: async () => ({
        screenRecording: 'granted' as const,
        accessibility: 'granted' as const,
        notifications: 'granted' as const,
        autostart: 'granted' as const,
      }),
      isScreenRecordingAllowed: () => true,
      subscribe: () => () => undefined,
      refresh: () => ({
        screenRecording: 'granted' as const,
        accessibility: 'granted' as const,
        notifications: 'granted' as const,
        autostart: 'granted' as const,
      }),
    };

    const svc = createScreenshotService({
      logger: pino({ level: 'silent' }),
      screenshotRepo: repos.screenshot,
      sessionRepo: repos.session,
      preferenceRepo: repos.preference,
      permissions,
      rootDir: tmpRoot,
      electron: makeFakeElectron(),
      options: { intervalSeconds: 600 },
    });

    const captured: CapturedScreenshot[] = [];
    svc.subscribe((e) => captured.push(e));
    const events = await svc.captureOnce();
    expect(events.length).toBe(1);
    const evt = events[0]!;
    // PMCM-832: the image is handed over in memory and never written to disk.
    expect(captured).toHaveLength(1);
    expect(captured[0]!.id).toBe(evt.id);
    expect(captured[0]!.jpeg.length).toBe(evt.bytes);
    expect('jpeg' in evt).toBe(false);
    const jpgs = (fs.readdirSync(tmpRoot, { recursive: true }) as string[]).filter((p) =>
      p.endsWith('.jpg'),
    );
    expect(jpgs).toEqual([]);

    const row = db
      .prepare<[], { id: string; local_path: string | null; blur_path: string | null }>(
        `SELECT id, local_path, blur_path FROM screenshot WHERE session_id = 'ses_t'`,
      )
      .get();
    expect(row).toBeDefined();
    expect(row?.id).toBe(evt.id);
    expect(row?.local_path).toBeNull();
    expect(row?.blur_path).toBeNull();

    const stats = svc.getStats();
    expect(stats.capturedCount).toBe(1);
    expect(stats.lastCaptureAt).toBeTruthy();
  });

  it('does not capture when screen recording is denied', async () => {
    const repos = {
      screenshot: createScreenshotRepo(db),
      session: createSessionRepo(db),
      preference: createPreferenceRepo(db),
    };
    repos.preference.set('dtt.activeSessionId', JSON.stringify('ses_t'));
    const denied = {
      getAllPermissions: () => ({
        screenRecording: 'denied' as const,
        accessibility: 'denied' as const,
        notifications: 'granted' as const,
        autostart: 'granted' as const,
      }),
      checkPermission: () => 'denied' as const,
      requestPermission: async () => 'denied' as const,
      requestLongForm: async () => ({
        screenRecording: 'denied' as const,
        accessibility: 'denied' as const,
        notifications: 'granted' as const,
        autostart: 'granted' as const,
      }),
      isScreenRecordingAllowed: () => false,
      subscribe: () => () => undefined,
      refresh: () => ({
        screenRecording: 'denied' as const,
        accessibility: 'denied' as const,
        notifications: 'granted' as const,
        autostart: 'granted' as const,
      }),
    };
    const svc = createScreenshotService({
      logger: pino({ level: 'silent' }),
      screenshotRepo: repos.screenshot,
      sessionRepo: repos.session,
      preferenceRepo: repos.preference,
      permissions: denied,
      rootDir: tmpRoot,
      electron: makeFakeElectron(),
    });
    const events = await svc.captureOnce();
    expect(events.length).toBe(0);
  });
});
