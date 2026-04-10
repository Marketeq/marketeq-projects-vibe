// src/main/services/permissions/permissions-service.ts
//
// Permissions facade for the Marketeq Time Tracker desktop app.
// Implements the contract from doc 18 — single entry point that the IPC
// router calls to query and request OS permissions, with results audited
// to the `permission_grant` table for forensic review.
//
// The short-form `checkPermission` / `requestPermission` API (`'screen' |
// 'accessibility' | 'notifications'`) is what the Phase 3 deliverable spec
// asked for; we also expose `getAllPermissions()` returning the full
// long-form status map from doc 18 §6.2.

import { EventEmitter } from 'node:events';
import type { Logger } from 'pino';
import type { PermissionGrantRepo } from '../../db/repos/permission-grant.repo';
import type {
  OsPermissionKey,
  PermissionKindShort,
  PermissionStatus,
  PermissionStatusShort,
  PermissionStatuses,
} from '../../../shared/ipc-contracts';

// Electron APIs are looked up lazily so unit tests can mock the module.
interface ElectronSurface {
  systemPreferences: {
    getMediaAccessStatus: (kind: string) => string;
    isTrustedAccessibilityClient: (prompt: boolean) => boolean;
  };
  Notification: {
    isSupported: () => boolean;
    new (opts: {
      title: string;
      body: string;
      silent?: boolean;
    }): { show: () => void; close: () => void };
  };
  desktopCapturer: {
    getSources: (opts: {
      types: string[];
      thumbnailSize: { width: number; height: number };
    }) => Promise<unknown[]>;
  };
  app: {
    getLoginItemSettings: (opts: Record<string, unknown>) => {
      openAtLogin: boolean;
    };
    setLoginItemSettings: (opts: Record<string, unknown>) => void;
  };
}

function loadElectron(): ElectronSurface | null {
  // Avoid requiring electron at unit-test import time.
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const e = require('electron');
    return e as ElectronSurface;
  } catch {
    return null;
  }
}

interface Deps {
  logger: Logger;
  permissionGrantRepo: PermissionGrantRepo;
  platform?: NodeJS.Platform;
  electron?: ElectronSurface | null;
}

export interface PermissionsService {
  getAllPermissions: () => PermissionStatuses;
  checkPermission: (kind: PermissionKindShort) => PermissionStatusShort;
  requestPermission: (
    kind: PermissionKindShort,
  ) => Promise<PermissionStatusShort>;
  requestLongForm: (key: OsPermissionKey) => Promise<PermissionStatuses>;
  isScreenRecordingAllowed: () => boolean;
  subscribe: (cb: (s: PermissionStatuses) => void) => () => void;
  refresh: () => PermissionStatuses;
}

const SHORT_TO_LONG: Record<PermissionKindShort, OsPermissionKey> = {
  screen: 'screenRecording',
  accessibility: 'accessibility',
  notifications: 'notifications',
};

function toShortStatus(s: PermissionStatus): PermissionStatusShort {
  switch (s) {
    case 'granted':
      return 'granted';
    case 'denied':
    case 'restricted':
      return 'denied';
    case 'not_determined':
    case 'not_applicable':
      return 'not-determined';
    default:
      return 'not-determined';
  }
}

export function createPermissionsService(deps: Deps): PermissionsService {
  const log = deps.logger.child({ svc: 'permissions' });
  const platform = deps.platform ?? process.platform;
  const isMac = platform === 'darwin';
  const isWin = platform === 'win32';
  const electron = deps.electron ?? loadElectron();
  const bus = new EventEmitter();

  const platformTag: 'mac' | 'win' | 'linux' | 'other' = isMac
    ? 'mac'
    : isWin
      ? 'win'
      : platform === 'linux'
        ? 'linux'
        : 'other';

  function queryScreenRecording(): PermissionStatus {
    if (!electron) return 'not_determined';
    if (isMac) {
      try {
        const v = electron.systemPreferences.getMediaAccessStatus('screen');
        switch (v) {
          case 'granted':
            return 'granted';
          case 'denied':
            return 'denied';
          case 'not-determined':
            return 'not_determined';
          case 'restricted':
            return 'restricted';
          default:
            return 'not_determined';
        }
      } catch (err) {
        log.warn({ err }, 'getMediaAccessStatus(screen) failed');
        return 'not_determined';
      }
    }
    // Windows: desktopCapturer is ungated for full-display capture as of
    // Win 11 23H2. Doc 18 §6.5 instructs us to always report `granted`.
    if (isWin) return 'granted';
    return 'not_applicable';
  }

  function queryAccessibility(): PermissionStatus {
    if (!electron) return 'not_determined';
    if (isMac) {
      try {
        // Read-only: pass `false` so we never accidentally prompt from query.
        return electron.systemPreferences.isTrustedAccessibilityClient(false)
          ? 'granted'
          : 'denied';
      } catch (err) {
        log.warn({ err }, 'isTrustedAccessibilityClient failed');
        return 'not_determined';
      }
    }
    return 'not_applicable';
  }

  function queryNotifications(): PermissionStatus {
    if (!electron) return 'not_determined';
    try {
      return electron.Notification.isSupported() ? 'granted' : 'denied';
    } catch {
      return 'denied';
    }
  }

  function queryAutostart(): PermissionStatus {
    if (!electron) return 'not_determined';
    try {
      return electron.app.getLoginItemSettings({}).openAtLogin
        ? 'granted'
        : 'denied';
    } catch {
      return 'denied';
    }
  }

  function snapshot(): PermissionStatuses {
    const now = Date.now();
    const s: PermissionStatuses = {
      screenRecording: queryScreenRecording(),
      accessibility: queryAccessibility(),
      notifications: queryNotifications(),
      autostart: queryAutostart(),
    };
    for (const key of Object.keys(s) as OsPermissionKey[]) {
      try {
        deps.permissionGrantRepo.upsert({
          key,
          status: s[key],
          platform: platformTag,
          last_checked_at: now,
          last_requested_at: null,
          last_changed_at: now,
        });
      } catch (err) {
        log.warn({ err, key }, 'failed to persist permission grant');
      }
    }
    return s;
  }

  async function requestLongForm(
    key: OsPermissionKey,
  ): Promise<PermissionStatuses> {
    const now = Date.now();
    log.info({ key }, 'permission:request');
    if (!electron) {
      const s = snapshot();
      bus.emit('changed', s);
      return s;
    }
    try {
      switch (key) {
        case 'screenRecording':
          if (isMac) {
            // Calling desktopCapturer triggers the TCC dialog — drop result.
            try {
              await electron.desktopCapturer.getSources({
                types: ['screen'],
                thumbnailSize: { width: 1, height: 1 },
              });
            } catch (e) {
              log.debug({ e }, 'screen recording request dialog dismissed');
            }
          }
          break;
        case 'accessibility':
          if (isMac) {
            // Pass `true` to surface the OS prompt.
            electron.systemPreferences.isTrustedAccessibilityClient(true);
          }
          break;
        case 'notifications':
          if (isMac && electron.Notification.isSupported()) {
            const n = new electron.Notification({
              title: 'Marketeq Time Tracker',
              body: 'Notifications are enabled.',
              silent: true,
            });
            n.show();
            setTimeout(() => {
              try {
                n.close();
              } catch {
                /* ignore */
              }
            }, 1000);
          }
          break;
        case 'autostart':
          electron.app.setLoginItemSettings({
            openAtLogin: true,
            openAsHidden: true,
          });
          break;
      }
    } catch (err) {
      log.error({ err, key }, 'permission request failed');
    }
    // After the user interacts, persist request timestamp then re-snapshot.
    try {
      const current = deps.permissionGrantRepo.get(key);
      deps.permissionGrantRepo.upsert({
        key,
        status: current?.status ?? 'not_determined',
        platform: platformTag,
        last_checked_at: now,
        last_requested_at: now,
        last_changed_at: current?.last_changed_at ?? now,
      });
    } catch (err) {
      log.warn({ err }, 'failed to stamp permission request');
    }
    const s = snapshot();
    bus.emit('changed', s);
    return s;
  }

  return {
    getAllPermissions: snapshot,
    checkPermission(kind) {
      const longKey = SHORT_TO_LONG[kind];
      const s = snapshot();
      return toShortStatus(s[longKey]);
    },
    async requestPermission(kind) {
      const longKey = SHORT_TO_LONG[kind];
      const s = await requestLongForm(longKey);
      return toShortStatus(s[longKey]);
    },
    requestLongForm,
    isScreenRecordingAllowed() {
      return snapshot().screenRecording === 'granted';
    },
    subscribe(cb) {
      bus.on('changed', cb);
      return () => bus.off('changed', cb);
    },
    refresh: snapshot,
  };
}
