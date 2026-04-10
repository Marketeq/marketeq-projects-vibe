// src/main/services/notifications/notification-service.ts
//
// Phase 6 — OS notifications (doc 19 §3, doc 41 §5).
//
// Thin wrapper over Electron's `Notification` API that:
//   * Respects user notification preferences (from the onboarding service).
//   * Rate-limits sync errors so a bad network doesn't spam.
//   * Routes click events back to the main window via the window manager.
//
// Tests swap in a `notificationFactory` to avoid pulling in Electron.

import type { Logger } from 'pino';
import type { NotificationPrefs } from '../../../shared/ipc-contracts';
import type { WindowManager } from '../window/window-manager';

export type NotificationCategory =
  | 'workReminder'
  | 'breakReminder'
  | 'breakExpiring'
  | 'breakExpired'
  | 'idleDetected'
  | 'syncError'
  | 'authNeedsLogin'
  | 'permissionsChanged';

export interface NotificationInput {
  category: NotificationCategory;
  title: string;
  body: string;
  silent?: boolean;
  onClick?: () => void;
}

export interface NotificationHandle {
  show(): void;
  on(event: 'click', handler: () => void): void;
  close?: () => void;
}

export type NotificationFactory = (opts: {
  title: string;
  body: string;
  silent: boolean;
}) => NotificationHandle;

export interface NotificationServiceDeps {
  logger: Logger;
  windowManager: WindowManager;
  getPrefs: () => NotificationPrefs;
  /** Injected in tests. Defaults to Electron's `Notification`. */
  notificationFactory?: NotificationFactory;
  /** Injected clock for deterministic tests. */
  now?: () => number;
}

/** Rate limit windows (ms) per category. */
const RATE_LIMIT_WINDOW_MS: Partial<Record<NotificationCategory, number>> = {
  syncError: 60_000, // at most one sync-error notification per minute
  permissionsChanged: 30_000,
  idleDetected: 10_000,
};

export interface NotificationService {
  send(input: NotificationInput): void;
  /** Convenience helpers for the common domain events. */
  workReminder(elapsedSec: number): void;
  breakReminder(elapsedSec: number): void;
  breakExpiring(remainingSec: number): void;
  breakExpired(): void;
  idleDetected(seconds: number): void;
  syncError(msg: string): void;
  authNeedsLogin(reason: string): void;
  permissionsChanged(key: string, status: string): void;
}

function categoryToPrefKey(
  c: NotificationCategory,
): keyof NotificationPrefs | null {
  switch (c) {
    case 'workReminder':
      return 'workReminders';
    case 'breakReminder':
    case 'breakExpiring':
    case 'breakExpired':
      return 'breakReminders';
    case 'idleDetected':
      return 'idleAlerts';
    case 'syncError':
      return 'syncErrors';
    case 'authNeedsLogin':
      return 'authAlerts';
    case 'permissionsChanged':
      return 'permissionChanges';
    default:
      return null;
  }
}

export function createNotificationService(
  deps: NotificationServiceDeps,
): NotificationService {
  const { logger, windowManager, getPrefs } = deps;
  const now = deps.now ?? (() => Date.now());
  const lastSent = new Map<NotificationCategory, number>();

  function getFactory(): NotificationFactory {
    if (deps.notificationFactory) return deps.notificationFactory;
    return (opts) => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Notification } = require('electron') as typeof import('electron');
      if (!Notification.isSupported()) {
        return {
          show: () => undefined,
          on: () => undefined,
        };
      }
      const n = new Notification({
        title: opts.title,
        body: opts.body,
        silent: opts.silent,
      });
      return {
        show: () => n.show(),
        on: (_evt, handler) => {
          n.on('click', handler);
        },
        close: () => n.close(),
      };
    };
  }

  function checkRateLimit(category: NotificationCategory): boolean {
    const window = RATE_LIMIT_WINDOW_MS[category];
    if (!window) return true;
    const last = lastSent.get(category) ?? 0;
    const current = now();
    if (current - last < window) return false;
    lastSent.set(category, current);
    return true;
  }

  function send(input: NotificationInput): void {
    const prefKey = categoryToPrefKey(input.category);
    const prefs = getPrefs();
    if (prefKey && !prefs[prefKey]) {
      logger.debug({ category: input.category }, 'notification suppressed (prefs)');
      return;
    }
    if (!checkRateLimit(input.category)) {
      logger.debug({ category: input.category }, 'notification rate-limited');
      return;
    }

    try {
      const factory = getFactory();
      const handle = factory({
        title: input.title,
        body: input.body,
        silent: input.silent ?? false,
      });
      handle.on('click', () => {
        try {
          input.onClick?.();
        } catch (err) {
          logger.warn({ err }, 'notification onClick handler threw');
        }
        void windowManager.showMainWindow().catch((err) => {
          logger.warn({ err }, 'showMainWindow on click failed');
        });
      });
      handle.show();
      logger.info(
        { category: input.category, title: input.title },
        'notification shown',
      );
    } catch (err) {
      logger.warn({ err, category: input.category }, 'notification failed');
    }
  }

  function formatDuration(sec: number): string {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  return {
    send,
    workReminder(elapsedSec) {
      send({
        category: 'workReminder',
        title: 'Still working?',
        body: `You've been tracking for ${formatDuration(elapsedSec)}. Consider a break soon.`,
      });
    },
    breakReminder(elapsedSec) {
      send({
        category: 'breakReminder',
        title: 'Time for a break',
        body: `You've worked ${formatDuration(elapsedSec)}. Take a breather.`,
      });
    },
    breakExpiring(remainingSec) {
      send({
        category: 'breakExpiring',
        title: 'Break ending soon',
        body: `Your break ends in ${Math.max(0, Math.round(remainingSec / 60))} minutes.`,
      });
    },
    breakExpired() {
      send({
        category: 'breakExpired',
        title: 'Break ended',
        body: 'Your break has ended — ready to resume?',
      });
    },
    idleDetected(seconds) {
      send({
        category: 'idleDetected',
        title: "You've been idle",
        body: `DTT paused your timer after ${formatDuration(seconds)} of inactivity. What should we do with the idle time?`,
      });
    },
    syncError(msg) {
      send({
        category: 'syncError',
        title: 'Sync error',
        body: msg || 'Time Tracker couldn\u2019t sync your latest data. We\u2019ll keep retrying.',
      });
    },
    authNeedsLogin(reason) {
      send({
        category: 'authNeedsLogin',
        title: 'Sign in required',
        body:
          reason === 'refresh_failed'
            ? 'Your session expired. Please sign in again.'
            : 'Please sign in to continue tracking time.',
      });
    },
    permissionsChanged(key, status) {
      send({
        category: 'permissionsChanged',
        title: 'Permissions changed',
        body: `${key} is now ${status}.`,
      });
    },
  };
}
