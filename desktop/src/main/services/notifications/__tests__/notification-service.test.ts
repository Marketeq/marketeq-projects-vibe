// src/main/services/notifications/__tests__/notification-service.test.ts
//
// Phase 6 — Unit tests for the notification service. Uses an injected
// `notificationFactory` so no Electron runtime is required.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import pino from 'pino';
import {
  createNotificationService,
  type NotificationFactory,
  type NotificationHandle,
} from '../notification-service';
import type { NotificationPrefs } from '../../../../shared/ipc-contracts';
import type { WindowManager } from '../../window/window-manager';

const logger = pino({ level: 'silent' });

const ALL_ON: NotificationPrefs = {
  workReminders: true,
  breakReminders: true,
  idleAlerts: true,
  syncErrors: true,
  permissionChanges: true,
  authAlerts: true,
};

function makeStubWindowManager(): WindowManager {
  return {
    ensureMainWindow: vi.fn(async () => ({}) as never),
    getMainWindow: vi.fn(() => null),
    toggleMainWindow: vi.fn(async () => undefined),
    showMainWindow: vi.fn(async () => undefined),
    hideMainWindow: vi.fn(() => undefined),
    confirmQuit: vi.fn(async () => true),
    prepareToQuit: vi.fn(() => undefined),
    closeAll: vi.fn(() => undefined),
    isQuitting: vi.fn(() => false),
  };
}

interface RecordedNotification {
  title: string;
  body: string;
  silent: boolean;
  shown: number;
  clickHandlers: (() => void)[];
}

function makeFactory(): {
  factory: NotificationFactory;
  shown: RecordedNotification[];
} {
  const shown: RecordedNotification[] = [];
  const factory: NotificationFactory = (opts) => {
    const rec: RecordedNotification = {
      ...opts,
      shown: 0,
      clickHandlers: [],
    };
    shown.push(rec);
    const handle: NotificationHandle = {
      show: () => {
        rec.shown += 1;
      },
      on: (_evt, cb) => {
        rec.clickHandlers.push(cb);
      },
    };
    return handle;
  };
  return { factory, shown };
}

describe('notification-service', () => {
  let nowRef: { value: number };
  let prefs: NotificationPrefs;
  let wm: WindowManager;

  beforeEach(() => {
    nowRef = { value: 1_000_000 };
    prefs = { ...ALL_ON };
    wm = makeStubWindowManager();
  });

  it('shows a notification when prefs allow', () => {
    const { factory, shown } = makeFactory();
    const svc = createNotificationService({
      logger,
      windowManager: wm,
      getPrefs: () => prefs,
      notificationFactory: factory,
      now: () => nowRef.value,
    });
    svc.workReminder(3600);
    expect(shown).toHaveLength(1);
    expect(shown[0]!.shown).toBe(1);
    expect(shown[0]!.title).toContain('Still working');
  });

  it('suppresses notifications when pref is false', () => {
    const { factory, shown } = makeFactory();
    prefs.workReminders = false;
    const svc = createNotificationService({
      logger,
      windowManager: wm,
      getPrefs: () => prefs,
      notificationFactory: factory,
      now: () => nowRef.value,
    });
    svc.workReminder(3600);
    expect(shown).toHaveLength(0);
  });

  it('rate-limits syncError to one per 60s window', () => {
    const { factory, shown } = makeFactory();
    const svc = createNotificationService({
      logger,
      windowManager: wm,
      getPrefs: () => prefs,
      notificationFactory: factory,
      now: () => nowRef.value,
    });
    svc.syncError('err 1');
    svc.syncError('err 2');
    svc.syncError('err 3');
    expect(shown).toHaveLength(1);

    nowRef.value += 59_999;
    svc.syncError('err 4');
    expect(shown).toHaveLength(1);

    nowRef.value += 2;
    svc.syncError('err 5');
    expect(shown).toHaveLength(2);
  });

  it('rate-limits idleDetected to one per 10s window', () => {
    const { factory, shown } = makeFactory();
    const svc = createNotificationService({
      logger,
      windowManager: wm,
      getPrefs: () => prefs,
      notificationFactory: factory,
      now: () => nowRef.value,
    });
    svc.idleDetected(300);
    svc.idleDetected(305);
    expect(shown).toHaveLength(1);
    nowRef.value += 10_001;
    svc.idleDetected(310);
    expect(shown).toHaveLength(2);
  });

  it('click handler calls windowManager.showMainWindow', () => {
    const { factory, shown } = makeFactory();
    const svc = createNotificationService({
      logger,
      windowManager: wm,
      getPrefs: () => prefs,
      notificationFactory: factory,
      now: () => nowRef.value,
    });
    svc.authNeedsLogin('refresh_failed');
    expect(shown).toHaveLength(1);
    expect(shown[0]!.clickHandlers).toHaveLength(1);
    shown[0]!.clickHandlers[0]!();
    expect(wm.showMainWindow).toHaveBeenCalled();
  });

  it('breakExpiring uses the breakReminders pref', () => {
    const { factory, shown } = makeFactory();
    prefs.breakReminders = false;
    const svc = createNotificationService({
      logger,
      windowManager: wm,
      getPrefs: () => prefs,
      notificationFactory: factory,
      now: () => nowRef.value,
    });
    svc.breakExpiring(120);
    expect(shown).toHaveLength(0);
  });

  it('permissionsChanged uses the permissionChanges pref and is rate-limited', () => {
    const { factory, shown } = makeFactory();
    const svc = createNotificationService({
      logger,
      windowManager: wm,
      getPrefs: () => prefs,
      notificationFactory: factory,
      now: () => nowRef.value,
    });
    svc.permissionsChanged('screen', 'granted');
    svc.permissionsChanged('screen', 'revoked');
    expect(shown).toHaveLength(1);
    nowRef.value += 30_001;
    svc.permissionsChanged('screen', 'granted');
    expect(shown).toHaveLength(2);
  });

  it('network offline / restored notices show even with every pref off, and are rate-limited', () => {
    const { factory, shown } = makeFactory();
    const allOff: NotificationPrefs = {
      workReminders: false,
      breakReminders: false,
      idleAlerts: false,
      syncErrors: false,
      permissionChanges: false,
      authAlerts: false,
    };
    const svc = createNotificationService({
      logger,
      windowManager: wm,
      getPrefs: () => allOff,
      notificationFactory: factory,
      now: () => nowRef.value,
    });

    svc.networkOffline();
    svc.networkOffline(); // flapping connection: suppressed
    expect(shown).toHaveLength(1);
    expect(shown[0]!.title).toBe("You're offline — tracking continues");
    expect(shown[0]!.body).toContain('saved on this computer');

    svc.networkRestored(3);
    expect(shown).toHaveLength(2);
    expect(shown[1]!.title).toBe('Back online');
    expect(shown[1]!.body).toBe('Syncing 3 saved items.');

    nowRef.value += 60_001;
    svc.networkRestored(1);
    expect(shown[2]!.body).toBe('Syncing 1 saved item.');
  });
});
