// src/main/services/onboarding/onboarding-service.ts
//
// Phase 6 — Onboarding & notification preferences service.
//
// Persists per-user onboarding state into the local SQLite database using
// the 006_onboarding migration. The renderer calls via IPC:
//   * onboarding:get-state
//   * onboarding:mark-step
//   * onboarding:complete
//   * onboarding:get-notification-prefs
//   * onboarding:set-notification-prefs
//
// Single-user machines still get a default "solo" user id if no authed
// user is present yet — onboarding can run before sign-in.
//
// All inbound args are zod-validated at the IPC boundary (see register-ipc).

import type { Logger } from 'pino';
import type { DbHandle } from '../../db/connection';
import {
  ONBOARDING_VERSION,
  type NotificationPrefs,
  type OnboardingMarkStepArgs,
  type OnboardingState,
} from '../../../shared/ipc-contracts';

export const DEFAULT_USER_ID = '__local__';

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  workReminders: true,
  breakReminders: true,
  idleAlerts: true,
  syncErrors: true,
  permissionChanges: true,
  authAlerts: true,
};

interface OnboardingRow {
  user_id: string;
  version: number;
  completed_at: number | null;
  steps_completed: string;
  created_at: number;
  updated_at: number;
}

interface NotificationPrefsRow {
  user_id: string;
  work_reminders: number;
  break_reminders: number;
  idle_alerts: number;
  sync_errors: number;
  permission_changes: number;
  auth_alerts: number;
  updated_at: number;
}

export interface OnboardingServiceDeps {
  db: DbHandle;
  logger: Logger;
  /** Returns the currently-signed-in user id, or null if onboarding runs pre-auth. */
  getUserId?: () => string | null;
}

export interface OnboardingService {
  getState(): OnboardingState;
  markStep(args: OnboardingMarkStepArgs): OnboardingState;
  complete(): OnboardingState;
  getNotificationPrefs(): NotificationPrefs;
  setNotificationPrefs(prefs: NotificationPrefs): NotificationPrefs;
  /** Subscribe to state changes. Returns an unsubscribe fn. */
  subscribe(cb: (state: OnboardingState) => void): () => void;
}

function parseSteps(blob: string): OnboardingState['stepsCompleted'] {
  try {
    const parsed = JSON.parse(blob) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as OnboardingState['stepsCompleted'];
    }
  } catch {
    /* ignore */
  }
  return {};
}

function rowToState(row: OnboardingRow | null): OnboardingState {
  if (!row) {
    return {
      userId: null,
      version: ONBOARDING_VERSION,
      completed: false,
      completedAt: null,
      stepsCompleted: {},
    };
  }
  return {
    userId: row.user_id === DEFAULT_USER_ID ? null : row.user_id,
    version: row.version,
    completed: row.completed_at != null,
    completedAt: row.completed_at,
    stepsCompleted: parseSteps(row.steps_completed),
  };
}

function rowToPrefs(row: NotificationPrefsRow | null): NotificationPrefs {
  if (!row) return { ...DEFAULT_NOTIFICATION_PREFS };
  return {
    workReminders: row.work_reminders !== 0,
    breakReminders: row.break_reminders !== 0,
    idleAlerts: row.idle_alerts !== 0,
    syncErrors: row.sync_errors !== 0,
    permissionChanges: row.permission_changes !== 0,
    authAlerts: row.auth_alerts !== 0,
  };
}

export function createOnboardingService(
  deps: OnboardingServiceDeps,
): OnboardingService {
  const { db, logger, getUserId } = deps;
  const subscribers = new Set<(s: OnboardingState) => void>();

  function resolveUserId(): string {
    try {
      const id = getUserId?.();
      return id ?? DEFAULT_USER_ID;
    } catch {
      return DEFAULT_USER_ID;
    }
  }

  function selectRow(userId: string): OnboardingRow | null {
    const stmt = db.prepare<[string], OnboardingRow>(
      `SELECT user_id, version, completed_at, steps_completed, created_at, updated_at
       FROM onboarding_state WHERE user_id = ?`,
    );
    return stmt.get(userId) ?? null;
  }

  function upsertRow(
    userId: string,
    steps: OnboardingState['stepsCompleted'],
    completedAt: number | null,
  ): OnboardingRow {
    const now = Date.now();
    const existing = selectRow(userId);
    if (existing) {
      db.prepare(
        `UPDATE onboarding_state
         SET steps_completed = ?, completed_at = ?, updated_at = ?
         WHERE user_id = ?`,
      ).run(JSON.stringify(steps), completedAt, now, userId);
    } else {
      db.prepare(
        `INSERT INTO onboarding_state
         (user_id, version, completed_at, steps_completed, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).run(
        userId,
        ONBOARDING_VERSION,
        completedAt,
        JSON.stringify(steps),
        now,
        now,
      );
    }
    const updated = selectRow(userId);
    if (!updated) {
      throw new Error('onboarding upsert failed');
    }
    return updated;
  }

  function emit(state: OnboardingState): void {
    for (const sub of subscribers) {
      try {
        sub(state);
      } catch (err) {
        logger.warn({ err }, 'onboarding subscriber threw');
      }
    }
  }

  function getState(): OnboardingState {
    const row = selectRow(resolveUserId());
    return rowToState(row);
  }

  function markStep(args: OnboardingMarkStepArgs): OnboardingState {
    const userId = resolveUserId();
    const current = selectRow(userId);
    const steps = current ? parseSteps(current.steps_completed) : {};
    steps[args.step] = { at: Date.now(), status: args.status ?? 'completed' };
    const row = upsertRow(userId, steps, current?.completed_at ?? null);
    const state = rowToState(row);
    logger.info({ step: args.step, status: args.status }, 'onboarding step marked');
    emit(state);
    return state;
  }

  function complete(): OnboardingState {
    const userId = resolveUserId();
    const current = selectRow(userId);
    const steps = current ? parseSteps(current.steps_completed) : {};
    const row = upsertRow(userId, steps, Date.now());
    const state = rowToState(row);
    logger.info({ userId }, 'onboarding completed');
    emit(state);
    return state;
  }

  function selectPrefsRow(userId: string): NotificationPrefsRow | null {
    const stmt = db.prepare<[string], NotificationPrefsRow>(
      `SELECT user_id, work_reminders, break_reminders, idle_alerts,
              sync_errors, permission_changes, auth_alerts, updated_at
       FROM notification_prefs WHERE user_id = ?`,
    );
    return stmt.get(userId) ?? null;
  }

  function getNotificationPrefs(): NotificationPrefs {
    return rowToPrefs(selectPrefsRow(resolveUserId()));
  }

  function setNotificationPrefs(prefs: NotificationPrefs): NotificationPrefs {
    const userId = resolveUserId();
    const now = Date.now();
    const existing = selectPrefsRow(userId);
    if (existing) {
      db.prepare(
        `UPDATE notification_prefs
         SET work_reminders = ?, break_reminders = ?, idle_alerts = ?,
             sync_errors = ?, permission_changes = ?, auth_alerts = ?,
             updated_at = ?
         WHERE user_id = ?`,
      ).run(
        prefs.workReminders ? 1 : 0,
        prefs.breakReminders ? 1 : 0,
        prefs.idleAlerts ? 1 : 0,
        prefs.syncErrors ? 1 : 0,
        prefs.permissionChanges ? 1 : 0,
        prefs.authAlerts ? 1 : 0,
        now,
        userId,
      );
    } else {
      db.prepare(
        `INSERT INTO notification_prefs
         (user_id, work_reminders, break_reminders, idle_alerts,
          sync_errors, permission_changes, auth_alerts, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        userId,
        prefs.workReminders ? 1 : 0,
        prefs.breakReminders ? 1 : 0,
        prefs.idleAlerts ? 1 : 0,
        prefs.syncErrors ? 1 : 0,
        prefs.permissionChanges ? 1 : 0,
        prefs.authAlerts ? 1 : 0,
        now,
      );
    }
    return prefs;
  }

  function subscribe(cb: (s: OnboardingState) => void): () => void {
    subscribers.add(cb);
    return () => subscribers.delete(cb);
  }

  return {
    getState,
    markStep,
    complete,
    getNotificationPrefs,
    setNotificationPrefs,
    subscribe,
  };
}
