// src/main/services/onboarding/__tests__/onboarding-service.test.ts
//
// Phase 6 — Unit tests for the onboarding service. Runs against an in-memory
// better-sqlite3 DB when the native module is loadable; otherwise the suite
// is skipped (the same pattern used by the Phase 3 integration test).

import { describe, it, expect, beforeEach } from 'vitest';
import pino from 'pino';
import {
  createOnboardingService,
  DEFAULT_NOTIFICATION_PREFS,
  DEFAULT_USER_ID,
} from '../onboarding-service';
import type { DbHandle } from '../../../db/connection';

let Database: typeof import('better-sqlite3') | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
  Database = require('better-sqlite3') as typeof import('better-sqlite3');
  const probe = new Database(':memory:');
  probe.close();
} catch {
  Database = null;
}
const d = Database ? describe : describe.skip;

function buildSchema(db: InstanceType<NonNullable<typeof Database>>): void {
  db.exec(`
    CREATE TABLE onboarding_state (
      user_id TEXT PRIMARY KEY,
      version INTEGER NOT NULL,
      completed_at INTEGER,
      steps_completed TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE notification_prefs (
      user_id TEXT PRIMARY KEY,
      work_reminders INTEGER NOT NULL DEFAULT 1,
      break_reminders INTEGER NOT NULL DEFAULT 1,
      idle_alerts INTEGER NOT NULL DEFAULT 1,
      sync_errors INTEGER NOT NULL DEFAULT 1,
      permission_changes INTEGER NOT NULL DEFAULT 1,
      auth_alerts INTEGER NOT NULL DEFAULT 1,
      updated_at INTEGER NOT NULL
    );
  `);
}

const logger = pino({ level: 'silent' });

d('onboarding-service', () => {
  let db: InstanceType<NonNullable<typeof Database>>;

  beforeEach(() => {
    db = new Database!(':memory:');
    buildSchema(db);
  });

  it('returns an empty state when no row exists', () => {
    const svc = createOnboardingService({ db: db as unknown as DbHandle, logger });
    const state = svc.getState();
    expect(state.completed).toBe(false);
    expect(state.completedAt).toBeNull();
    expect(state.stepsCompleted).toEqual({});
  });

  it('marks steps and persists them', () => {
    const svc = createOnboardingService({ db: db as unknown as DbHandle, logger });
    const s1 = svc.markStep({ step: 'welcome', status: 'completed' });
    expect(s1.stepsCompleted.welcome?.status).toBe('completed');
    const s2 = svc.markStep({ step: 'privacy', status: 'completed' });
    expect(Object.keys(s2.stepsCompleted)).toEqual(['welcome', 'privacy']);
    expect(s2.completed).toBe(false);
  });

  it('complete() sets completedAt', () => {
    const svc = createOnboardingService({ db: db as unknown as DbHandle, logger });
    svc.markStep({ step: 'welcome' });
    const state = svc.complete();
    expect(state.completed).toBe(true);
    expect(state.completedAt).toBeGreaterThan(0);
  });

  it('returns defaults for notification prefs when unset', () => {
    const svc = createOnboardingService({ db: db as unknown as DbHandle, logger });
    expect(svc.getNotificationPrefs()).toEqual(DEFAULT_NOTIFICATION_PREFS);
  });

  it('setNotificationPrefs round-trips booleans', () => {
    const svc = createOnboardingService({ db: db as unknown as DbHandle, logger });
    const updated = svc.setNotificationPrefs({
      workReminders: false,
      breakReminders: true,
      idleAlerts: false,
      syncErrors: true,
      permissionChanges: false,
      authAlerts: true,
    });
    expect(updated.workReminders).toBe(false);
    expect(updated.idleAlerts).toBe(false);

    const fetched = svc.getNotificationPrefs();
    expect(fetched).toEqual(updated);
  });

  it('setNotificationPrefs updates existing row', () => {
    const svc = createOnboardingService({ db: db as unknown as DbHandle, logger });
    svc.setNotificationPrefs({
      ...DEFAULT_NOTIFICATION_PREFS,
      workReminders: false,
    });
    svc.setNotificationPrefs({
      ...DEFAULT_NOTIFICATION_PREFS,
      workReminders: true,
      idleAlerts: false,
    });
    const fetched = svc.getNotificationPrefs();
    expect(fetched.workReminders).toBe(true);
    expect(fetched.idleAlerts).toBe(false);
  });

  it('subscribe() delivers state-changed callbacks', () => {
    const svc = createOnboardingService({ db: db as unknown as DbHandle, logger });
    const seen: number[] = [];
    const off = svc.subscribe((s) => seen.push(Object.keys(s.stepsCompleted).length));
    svc.markStep({ step: 'welcome' });
    svc.markStep({ step: 'privacy' });
    off();
    svc.markStep({ step: 'notifications' });
    expect(seen).toEqual([1, 2]);
  });

  it('resolveUserId falls back to DEFAULT_USER_ID when getUserId throws', () => {
    const svc = createOnboardingService({
      db: db as unknown as DbHandle,
      logger,
      getUserId: () => {
        throw new Error('boom');
      },
    });
    expect(() => svc.getState()).not.toThrow();
    // And the row should come back keyed as the anonymous default:
    svc.markStep({ step: 'welcome' });
    const row = db
      .prepare('SELECT user_id FROM onboarding_state')
      .get() as { user_id: string };
    expect(row.user_id).toBe(DEFAULT_USER_ID);
  });
});
