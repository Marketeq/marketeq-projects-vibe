// src/main/services/window/__tests__/window-manager.test.ts
//
// Phase 6 — Unit tests for the window manager. Uses an injected
// `browserWindowFactory` so Electron is never imported.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import pino from 'pino';
import {
  createWindowManager,
  type MinimalBrowserWindow,
} from '../window-manager';

const logger = pino({ level: 'silent' });

interface FakeWin extends MinimalBrowserWindow {
  listeners: Map<string, Array<(...args: unknown[]) => void>>;
  visible: boolean;
  destroyed: boolean;
  loadedUrl: string | null;
  loadedFile: string | null;
  trigger(evt: string, arg?: unknown): void;
}

function makeFakeWindowFactory(): {
  factory: (opts: unknown) => MinimalBrowserWindow;
  instances: FakeWin[];
} {
  const instances: FakeWin[] = [];
  const factory = (_opts: unknown): MinimalBrowserWindow => {
    const listeners = new Map<string, Array<(...args: unknown[]) => void>>();
    const win: FakeWin = {
      listeners,
      visible: false,
      destroyed: false,
      loadedUrl: null,
      loadedFile: null,
      show: vi.fn(() => {
        win.visible = true;
      }),
      hide: vi.fn(() => {
        win.visible = false;
      }),
      focus: vi.fn(),
      isVisible: vi.fn(() => win.visible),
      isDestroyed: vi.fn(() => win.destroyed),
      on: vi.fn((evt: string, cb: (...args: unknown[]) => void) => {
        const list = listeners.get(evt) ?? [];
        list.push(cb);
        listeners.set(evt, list);
        return win as unknown as MinimalBrowserWindow;
      }) as unknown as MinimalBrowserWindow['on'],
      once: vi.fn((evt: string, cb: (...args: unknown[]) => void) => {
        const list = listeners.get(evt) ?? [];
        list.push(cb);
        listeners.set(evt, list);
        return win as unknown as MinimalBrowserWindow;
      }) as unknown as MinimalBrowserWindow['once'],
      loadURL: vi.fn(async (url: string) => {
        win.loadedUrl = url;
      }) as unknown as MinimalBrowserWindow['loadURL'],
      loadFile: vi.fn(async (file: string) => {
        win.loadedFile = file;
      }) as unknown as MinimalBrowserWindow['loadFile'],
      close: vi.fn(() => {
        win.destroyed = true;
      }) as unknown as MinimalBrowserWindow['close'],
      webContents: {} as MinimalBrowserWindow['webContents'],
      trigger(evt: string, arg?: unknown) {
        const list = listeners.get(evt) ?? [];
        for (const cb of list) cb(arg);
      },
    };
    instances.push(win);
    return win;
  };
  return { factory, instances };
}

describe('window-manager', () => {
  let wf: ReturnType<typeof makeFakeWindowFactory>;
  let showMessageBox: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    wf = makeFakeWindowFactory();
    showMessageBox = vi.fn(
      async () => ({ response: 0, checkboxChecked: false }) as never,
    );
  });

  function make(opts?: { getTimerState?: () => string }) {
    return createWindowManager({
      logger,
      isDev: false,
      preloadPath: '/fake/preload.js',
      rendererIndexPath: '/fake/index.html',
      browserWindowFactory: wf.factory,
      // Cast through unknown to bypass Electron's overloaded Dialog type.
      dialog: { showMessageBox } as unknown as {
        showMessageBox: (opts: unknown) => Promise<unknown>;
      } as never,
      getTimerState: opts?.getTimerState,
    });
  }

  it('ensureMainWindow creates exactly one window on repeated calls', async () => {
    const wm = make();
    await wm.ensureMainWindow();
    await wm.ensureMainWindow();
    expect(wf.instances).toHaveLength(1);
  });

  it('close event hides the window instead of closing (close-to-tray)', async () => {
    const wm = make();
    await wm.ensureMainWindow();
    const win = wf.instances[0]!;
    win.visible = true;
    const evt = { preventDefault: vi.fn() };
    win.trigger('close', evt);
    expect(evt.preventDefault).toHaveBeenCalled();
    expect(win.hide).toHaveBeenCalled();
  });

  it('after prepareToQuit, close is allowed to proceed', async () => {
    const wm = make();
    await wm.ensureMainWindow();
    wm.prepareToQuit();
    const win = wf.instances[0]!;
    const evt = { preventDefault: vi.fn() };
    win.trigger('close', evt);
    expect(evt.preventDefault).not.toHaveBeenCalled();
  });

  it('toggleMainWindow hides when visible, shows when hidden', async () => {
    const wm = make();
    await wm.ensureMainWindow();
    const win = wf.instances[0]!;
    win.visible = true;
    await wm.toggleMainWindow();
    expect(win.hide).toHaveBeenCalled();
    win.visible = false;
    await wm.toggleMainWindow();
    expect(win.show).toHaveBeenCalled();
  });

  it('confirmQuit returns true when timer is Idle', async () => {
    const wm = make({ getTimerState: () => 'Idle' });
    const ok = await wm.confirmQuit();
    expect(ok).toBe(true);
    expect(showMessageBox).not.toHaveBeenCalled();
  });

  it('confirmQuit shows dialog when timer is Running and honors user choice', async () => {
    showMessageBox.mockResolvedValueOnce({
      response: 0,
      checkboxChecked: false,
    });
    const wm = make({ getTimerState: () => 'Running' });
    expect(await wm.confirmQuit()).toBe(true);

    showMessageBox.mockResolvedValueOnce({
      response: 1,
      checkboxChecked: false,
    });
    expect(await wm.confirmQuit()).toBe(false);
  });

  it('confirmQuit shows dialog for Paused and both break states', async () => {
    for (const state of ['Paused', 'OnBreakPaid', 'OnBreakUnpaid']) {
      showMessageBox.mockClear();
      showMessageBox.mockResolvedValueOnce({ response: 1, checkboxChecked: false });
      const wm = make({ getTimerState: () => state });
      expect(await wm.confirmQuit()).toBe(false);
      expect(showMessageBox).toHaveBeenCalledTimes(1);
    }
  });

  it('confirmQuit does not ask when no session is active', async () => {
    for (const state of ['Idle', 'Counting', 'OfflineStopped']) {
      showMessageBox.mockClear();
      const wm = make({ getTimerState: () => state });
      expect(await wm.confirmQuit()).toBe(true);
      expect(showMessageBox).not.toHaveBeenCalled();
    }
  });

  it('hideMainWindow is a no-op when the window is not visible', async () => {
    const wm = make();
    await wm.ensureMainWindow();
    const win = wf.instances[0]!;
    win.visible = false;
    wm.hideMainWindow();
    expect(win.hide).not.toHaveBeenCalled();
  });

  it('closeAll closes the window and clears the ref', async () => {
    const wm = make();
    await wm.ensureMainWindow();
    wm.closeAll();
    expect(wf.instances[0]!.close).toHaveBeenCalled();
    expect(wm.getMainWindow()).toBeNull();
  });

  it('isQuitting reflects prepareToQuit state', () => {
    const wm = make();
    expect(wm.isQuitting()).toBe(false);
    wm.prepareToQuit();
    expect(wm.isQuitting()).toBe(true);
  });
});
