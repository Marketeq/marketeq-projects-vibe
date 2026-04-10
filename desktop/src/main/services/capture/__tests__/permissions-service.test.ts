// src/main/services/capture/__tests__/permissions-service.test.ts
//
// Mocks Electron's systemPreferences + app + Notification to exercise the
// PermissionsService state machine without an Electron runtime.

import { describe, it, expect, vi } from 'vitest';
import pino from 'pino';
import { createPermissionsService } from '../../permissions/permissions-service';
import type { PermissionGrantRepo } from '../../../db/repos/permission-grant.repo';
import type { PermissionGrantRow } from '../../../db/schema';

function makeFakeRepo(): PermissionGrantRepo & {
  store: Map<string, PermissionGrantRow>;
} {
  const store = new Map<string, PermissionGrantRow>();
  return {
    store,
    get(key) {
      return store.get(key) ?? null;
    },
    listAll() {
      return [...store.values()];
    },
    upsert(row) {
      store.set(row.key, row);
    },
  };
}

function makeElectronMock(overrides?: {
  screen?: string;
  accessibility?: boolean;
  notificationsSupported?: boolean;
  openAtLogin?: boolean;
}) {
  return {
    systemPreferences: {
      getMediaAccessStatus: vi
        .fn()
        .mockReturnValue(overrides?.screen ?? 'granted'),
      isTrustedAccessibilityClient: vi
        .fn()
        .mockReturnValue(overrides?.accessibility ?? true),
    },
    Notification: Object.assign(
      function Notification(_opts: {
        title: string;
        body: string;
        silent?: boolean;
      }) {
        return { show: vi.fn(), close: vi.fn() };
      },
      {
        isSupported: () => overrides?.notificationsSupported ?? true,
      },
    ) as unknown as {
      isSupported: () => boolean;
      new (opts: { title: string; body: string; silent?: boolean }): {
        show: () => void;
        close: () => void;
      };
    },
    desktopCapturer: {
      getSources: vi.fn().mockResolvedValue([]),
    },
    app: {
      getLoginItemSettings: vi
        .fn()
        .mockReturnValue({ openAtLogin: overrides?.openAtLogin ?? true }),
      setLoginItemSettings: vi.fn(),
    },
  };
}

describe('PermissionsService', () => {
  const logger = pino({ level: 'silent' });

  it('returns granted statuses when everything is allowed (macOS)', () => {
    const repo = makeFakeRepo();
    const svc = createPermissionsService({
      logger,
      permissionGrantRepo: repo,
      platform: 'darwin',
      electron: makeElectronMock(),
    });
    const all = svc.getAllPermissions();
    expect(all.screenRecording).toBe('granted');
    expect(all.accessibility).toBe('granted');
    expect(all.notifications).toBe('granted');
    expect(all.autostart).toBe('granted');
    expect(svc.isScreenRecordingAllowed()).toBe(true);
  });

  it('maps denied screen recording to short-form denied', () => {
    const repo = makeFakeRepo();
    const svc = createPermissionsService({
      logger,
      permissionGrantRepo: repo,
      platform: 'darwin',
      electron: makeElectronMock({ screen: 'denied', accessibility: false }),
    });
    expect(svc.checkPermission('screen')).toBe('denied');
    expect(svc.checkPermission('accessibility')).toBe('denied');
    expect(svc.isScreenRecordingAllowed()).toBe(false);
  });

  it('maps not-determined correctly', () => {
    const repo = makeFakeRepo();
    const svc = createPermissionsService({
      logger,
      permissionGrantRepo: repo,
      platform: 'darwin',
      electron: makeElectronMock({ screen: 'not-determined' }),
    });
    expect(svc.checkPermission('screen')).toBe('not-determined');
  });

  it('windows always reports screen recording as granted', () => {
    const repo = makeFakeRepo();
    const svc = createPermissionsService({
      logger,
      permissionGrantRepo: repo,
      platform: 'win32',
      electron: makeElectronMock({ screen: 'denied' }),
    });
    const all = svc.getAllPermissions();
    expect(all.screenRecording).toBe('granted');
    expect(all.accessibility).toBe('not_applicable');
  });

  it('persists grants to the permission_grant repo', () => {
    const repo = makeFakeRepo();
    const svc = createPermissionsService({
      logger,
      permissionGrantRepo: repo,
      platform: 'darwin',
      electron: makeElectronMock(),
    });
    svc.getAllPermissions();
    expect(repo.store.get('screenRecording')?.status).toBe('granted');
    expect(repo.store.get('accessibility')?.status).toBe('granted');
    expect(repo.store.get('notifications')?.status).toBe('granted');
    expect(repo.store.get('autostart')?.status).toBe('granted');
  });

  it('requestLongForm emits the changed event', async () => {
    const repo = makeFakeRepo();
    const svc = createPermissionsService({
      logger,
      permissionGrantRepo: repo,
      platform: 'darwin',
      electron: makeElectronMock(),
    });
    const seen: unknown[] = [];
    svc.subscribe((s) => seen.push(s));
    await svc.requestLongForm('notifications');
    expect(seen.length).toBe(1);
  });

  it('refreshes on demand', () => {
    const repo = makeFakeRepo();
    const electron = makeElectronMock({ screen: 'granted' });
    const svc = createPermissionsService({
      logger,
      permissionGrantRepo: repo,
      platform: 'darwin',
      electron,
    });
    expect(svc.checkPermission('screen')).toBe('granted');
    // Flip underlying mock and verify refresh picks it up.
    electron.systemPreferences.getMediaAccessStatus = vi
      .fn()
      .mockReturnValue('denied');
    svc.refresh();
    expect(svc.checkPermission('screen')).toBe('denied');
  });
});
