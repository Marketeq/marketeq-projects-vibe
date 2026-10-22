// src/main/services/window/window-manager.ts
//
// Phase 6 — Single source of truth for BrowserWindow refs.
//
// Responsibilities (doc 19):
//   * Create the main window (hidden-on-close by default).
//   * Close → hide-to-tray behavior on both platforms.
//   * macOS dock activate re-shows the hidden window.
//   * `app.on('activate')` + tray click → show/focus.
//   * Confirm-before-quit when timer is Running/Paused.
//   * Clean teardown ordering for shutdown.
//
// Tests swap in `browserWindowFactory` so we don't need Electron at all.

import type { BrowserWindow, Dialog } from 'electron';
import path from 'node:path';
import type { Logger } from 'pino';

export type MinimalBrowserWindow = Pick<
  BrowserWindow,
  | 'show'
  | 'hide'
  | 'focus'
  | 'isVisible'
  | 'isDestroyed'
  | 'on'
  | 'once'
  | 'loadURL'
  | 'loadFile'
  | 'close'
  | 'webContents'
>;

export interface WindowManagerDeps {
  logger: Logger;
  isDev: boolean;
  devServerUrl?: string;
  preloadPath: string;
  rendererIndexPath: string;
  /** App logo used for the window / taskbar icon. */
  iconPath?: string;
  /** Called to know whether to block quit with a confirm dialog. */
  getTimerState?: () => string;
  /** Injected for unit tests; defaults to Electron's BrowserWindow. */
  browserWindowFactory?: (opts: unknown) => MinimalBrowserWindow;
  dialog?: Pick<Dialog, 'showMessageBox'>;
}

export interface WindowManager {
  /** Create or re-show the main window. Returns the window ref. */
  ensureMainWindow(): Promise<MinimalBrowserWindow>;
  /** Return current main window ref (may be null). */
  getMainWindow(): MinimalBrowserWindow | null;
  /** Toggle visibility — used by tray click. */
  toggleMainWindow(): Promise<void>;
  /** Show + focus main window. */
  showMainWindow(): Promise<void>;
  /** Hide (to tray). */
  hideMainWindow(): void;
  /** Confirm-before-quit when a session is active. Returns true if ok to quit. */
  confirmQuit(): Promise<boolean>;
  /** Prepare to quit — unblock close-to-tray so windows can actually close. */
  prepareToQuit(): void;
  /** Close all windows (during shutdown). */
  closeAll(): void;
  /** True when the app is quitting. */
  isQuitting(): boolean;
}

const ACTIVE_SESSION_STATES: ReadonlySet<string> = new Set([
  'Running',
  'Paused',
  'OnBreakPaid',
  'OnBreakUnpaid',
]);

export function createWindowManager(deps: WindowManagerDeps): WindowManager {
  const {
    logger,
    isDev,
    devServerUrl,
    preloadPath,
    rendererIndexPath,
    iconPath,
    getTimerState,
    dialog,
  } = deps;

  let mainWindow: MinimalBrowserWindow | null = null;
  let quitting = false;

  // Lazy import so unit tests can run without Electron.
  function getFactory(): (opts: unknown) => MinimalBrowserWindow {
    if (deps.browserWindowFactory) return deps.browserWindowFactory;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { BrowserWindow } = require('electron') as typeof import('electron');
    return (opts) => new BrowserWindow(opts as Electron.BrowserWindowConstructorOptions);
  }

  function getDialog(): Pick<Dialog, 'showMessageBox'> {
    if (dialog) return dialog;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const electron = require('electron') as typeof import('electron');
    return electron.dialog;
  }

  async function ensureMainWindow(): Promise<MinimalBrowserWindow> {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
      return mainWindow;
    }

    const factory = getFactory();
    const win = factory({
      width: 480,
      height: 720,
      minWidth: 360,
      minHeight: 540,
      show: false,
      title: 'Marketeq Time Tracker',
      ...(iconPath ? { icon: iconPath } : {}),
      webPreferences: {
        preload: preloadPath,
        contextIsolation: true,
        sandbox: false,
        nodeIntegration: false,
      },
    });

    win.on('close', (evt: Electron.Event) => {
      // Close-to-tray unless we're actually quitting.
      if (!quitting) {
        evt.preventDefault();
        try {
          win.hide();
        } catch (err) {
          logger.warn({ err }, 'close-to-tray hide failed');
        }
      }
    });

    win.once('ready-to-show', () => {
      try {
        win.show();
      } catch {
        /* ignore */
      }
    });

    if (isDev && devServerUrl) {
      await win.loadURL(devServerUrl);
    } else {
      await win.loadFile(rendererIndexPath);
    }

    mainWindow = win;
    return win;
  }

  function getMainWindow(): MinimalBrowserWindow | null {
    if (mainWindow && !mainWindow.isDestroyed()) return mainWindow;
    return null;
  }

  async function toggleMainWindow(): Promise<void> {
    const win = getMainWindow();
    if (!win) {
      await ensureMainWindow();
      return;
    }
    if (win.isVisible()) {
      win.hide();
    } else {
      win.show();
      win.focus();
    }
  }

  async function showMainWindow(): Promise<void> {
    const win = await ensureMainWindow();
    win.show();
    win.focus();
  }

  function hideMainWindow(): void {
    const win = getMainWindow();
    if (win && win.isVisible()) {
      win.hide();
    }
  }

  async function confirmQuit(): Promise<boolean> {
    const st = getTimerState?.() ?? 'Idle';
    // Active session = Running, Paused, or any OnBreak* (DTT-AC-048.1).
    if (!ACTIVE_SESSION_STATES.has(st)) return true;
    try {
      const result = await getDialog().showMessageBox({
        type: 'warning',
        buttons: ['Stop & Quit', 'Cancel'],
        defaultId: 1,
        cancelId: 1,
        title: 'Active session',
        message:
          'You have an active time tracking session. Quitting will stop the timer.',
      });
      return result.response === 0;
    } catch (err) {
      logger.warn({ err }, 'confirmQuit: dialog failed — allowing quit');
      return true;
    }
  }

  function prepareToQuit(): void {
    quitting = true;
  }

  function closeAll(): void {
    const win = mainWindow;
    if (win && !win.isDestroyed()) {
      try {
        win.close();
      } catch (err) {
        logger.warn({ err }, 'closeAll: error closing window');
      }
    }
    mainWindow = null;
  }

  function isQuitting(): boolean {
    return quitting;
  }

  return {
    ensureMainWindow,
    getMainWindow,
    toggleMainWindow,
    showMainWindow,
    hideMainWindow,
    confirmQuit,
    prepareToQuit,
    closeAll,
    isQuitting,
  };
}

/** Helper: compute paths for a dev/prod split. */
export function resolveRendererPaths(dirname: string): {
  preloadPath: string;
  rendererIndexPath: string;
} {
  return {
    preloadPath: path.join(dirname, '..', '..', 'preload', 'preload', 'index.js'),
    rendererIndexPath: path.join(
      dirname,
      '..',
      '..',
      'renderer',
      'index.html',
    ),
  };
}
