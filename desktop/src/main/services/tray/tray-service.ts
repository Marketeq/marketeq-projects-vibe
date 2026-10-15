// src/main/services/tray/tray-service.ts
//
// Phase 6 — System tray icon & context menu (doc 19 §1).
//
// Icon states map to timer + sync state. On macOS we use template images
// (falls back to the generic icon if state-specific art isn't available);
// on Windows we use .ico files.
//
// The tray service is deliberately defensive: if the icon assets are
// missing on disk we log a warning and fall back to `resources/icon.png`.

import type { Tray, MenuItemConstructorOptions } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import type { Logger } from 'pino';
import type { TimerStateName } from '../../../shared/ipc-contracts';
import type { WindowManager } from '../window/window-manager';

export interface TraySyncSnapshot {
  online: boolean;
  queueDepth: number;
}

export interface TrayServiceDeps {
  logger: Logger;
  iconsDir: string;
  fallbackIcon: string;
  windowManager: WindowManager;
  onStartTimer?: () => void;
  onPauseTimer?: () => Promise<void> | void;
  onResumeTimer?: () => Promise<void> | void;
  onStopTimer?: () => Promise<void> | void;
  onStartBreak?: (kind: 'paid' | 'unpaid') => Promise<void> | void;
  onSyncNow?: () => Promise<void> | void;
  onLogout?: () => Promise<void> | void;
  onQuit?: () => void;
  /** Optional injector for tests. */
  trayFactory?: (iconPath: string) => Tray;
  nativeImageFromPath?: (iconPath: string) => unknown;
  menuBuilder?: (
    template: MenuItemConstructorOptions[],
  ) => Electron.Menu;
}

export interface TrayService {
  start(): void;
  stop(): void;
  setTimerState(state: TimerStateName, elapsedSec: number): void;
  setSyncSnapshot(snap: TraySyncSnapshot): void;
  destroy(): void;
}

const STATE_TO_ICON_BASENAME: Record<TimerStateName, string> = {
  Idle: 'tray-idle',
  Counting: 'tray-idle',
  Running: 'tray-running',
  Paused: 'tray-paused',
  OnBreakPaid: 'tray-break',
  OnBreakUnpaid: 'tray-break',
  IdleSoftPaused: 'tray-idle-soft',
  OfflineStopped: 'tray-offline',
  LockedDisputed: 'tray-disputed',
};

function formatElapsed(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function tooltipForState(
  state: TimerStateName,
  elapsedSec: number,
  syncOnline: boolean,
): string {
  const offline = syncOnline ? '' : ' · offline';
  switch (state) {
    case 'Running':
      return `DTT — Running (${formatElapsed(elapsedSec)})${offline}`;
    case 'Paused':
      return `DTT — Paused${offline}`;
    case 'OnBreakPaid':
    case 'OnBreakUnpaid':
      return `DTT — On break${offline}`;
    case 'IdleSoftPaused':
      return `DTT — Idle detected${offline}`;
    case 'OfflineStopped':
      return 'DTT — Offline stopped';
    case 'LockedDisputed':
      return 'DTT — Disputed';
    default:
      return `DTT — Not tracking${offline}`;
  }
}

export function createTrayService(deps: TrayServiceDeps): TrayService {
  const { logger, iconsDir, fallbackIcon, windowManager } = deps;

  let tray: Tray | null = null;
  let currentState: TimerStateName = 'Idle';
  let currentElapsed = 0;
  let currentSync: TraySyncSnapshot = { online: true, queueDepth: 0 };

  function resolveIconPath(state: TimerStateName): string {
    // Offline wins over the timer state: tracking continues offline, and the
    // red icon is how the talent sees their work is being held locally.
    const basename = !currentSync.online
      ? 'tray-offline'
      : STATE_TO_ICON_BASENAME[state] ?? 'tray-idle';
    const platform = process.platform;
    const ext = platform === 'win32' ? '.ico' : '.png';
    const candidate = path.join(iconsDir, `${basename}${ext}`);
    if (fs.existsSync(candidate)) return candidate;
    if (fs.existsSync(fallbackIcon)) return fallbackIcon;
    return fallbackIcon;
  }

  function buildMenuTemplate(): MenuItemConstructorOptions[] {
    const state = currentState;
    const canStart = state === 'Idle';
    const canPause = state === 'Running';
    const canResume = state === 'Paused' || state === 'IdleSoftPaused';
    const canStop =
      state === 'Running' ||
      state === 'Paused' ||
      state === 'OnBreakPaid' ||
      state === 'OnBreakUnpaid';
    const canBreak = state === 'Running';

    return [
      {
        label: 'Open DTT',
        click: () => {
          void windowManager.showMainWindow();
        },
      },
      { type: 'separator' },
      {
        label: 'Start Timer',
        enabled: canStart && !!deps.onStartTimer,
        click: () => deps.onStartTimer?.(),
      },
      {
        label: 'Pause Timer',
        enabled: canPause && !!deps.onPauseTimer,
        click: () => {
          void deps.onPauseTimer?.();
        },
      },
      {
        label: 'Resume Timer',
        enabled: canResume && !!deps.onResumeTimer,
        click: () => {
          void deps.onResumeTimer?.();
        },
      },
      {
        label: 'Stop Timer',
        enabled: canStop && !!deps.onStopTimer,
        click: () => {
          void deps.onStopTimer?.();
        },
      },
      { type: 'separator' },
      {
        label: 'Break',
        enabled: canBreak,
        submenu: [
          {
            label: 'Paid Break',
            click: () => {
              void deps.onStartBreak?.('paid');
            },
          },
          {
            label: 'Unpaid Break',
            click: () => {
              void deps.onStartBreak?.('unpaid');
            },
          },
        ],
      },
      { type: 'separator' },
      {
        label: currentSync.online
          ? `Sync Now (${currentSync.queueDepth} pending)`
          : 'Sync Now (offline)',
        click: () => {
          void deps.onSyncNow?.();
        },
      },
      { type: 'separator' },
      {
        label: 'Sign Out',
        click: () => {
          void deps.onLogout?.();
        },
      },
      {
        label: 'Quit DTT',
        click: () => deps.onQuit?.(),
      },
    ];
  }

  function applyMenu(): void {
    if (!tray) return;
    try {
      const buildMenu =
        deps.menuBuilder ??
        ((template: MenuItemConstructorOptions[]) => {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { Menu } = require('electron') as typeof import('electron');
          return Menu.buildFromTemplate(template);
        });
      const menu = buildMenu(buildMenuTemplate());
      tray.setContextMenu(menu);
    } catch (err) {
      logger.warn({ err }, 'tray: failed to apply menu');
    }
  }

  function applyIconAndTooltip(): void {
    if (!tray) return;
    try {
      const iconPath = resolveIconPath(currentState);
      // setImage accepts a path string directly
      tray.setImage(iconPath);
      tray.setToolTip(
        tooltipForState(currentState, currentElapsed, currentSync.online),
      );
    } catch (err) {
      logger.warn({ err }, 'tray: failed to apply icon/tooltip');
    }
  }

  function start(): void {
    if (tray) return;
    try {
      const factory =
        deps.trayFactory ??
        ((p: string) => {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { Tray } = require('electron') as typeof import('electron');
          return new Tray(p);
        });
      tray = factory(resolveIconPath(currentState));
      tray.on('click', () => {
        void windowManager.toggleMainWindow();
      });
      tray.on('double-click', () => {
        void windowManager.showMainWindow();
      });
      applyIconAndTooltip();
      applyMenu();
      logger.info('tray service started');
    } catch (err) {
      logger.warn({ err }, 'tray service failed to start');
    }
  }

  function stop(): void {
    destroy();
  }

  function setTimerState(state: TimerStateName, elapsedSec: number): void {
    currentState = state;
    currentElapsed = elapsedSec;
    applyIconAndTooltip();
    applyMenu();
  }

  function setSyncSnapshot(snap: TraySyncSnapshot): void {
    currentSync = snap;
    applyIconAndTooltip();
    applyMenu();
  }

  function destroy(): void {
    if (!tray) return;
    try {
      tray.destroy();
    } catch (err) {
      logger.warn({ err }, 'tray: destroy failed');
    }
    tray = null;
  }

  return {
    start,
    stop,
    setTimerState,
    setSyncSnapshot,
    destroy,
  };
}
