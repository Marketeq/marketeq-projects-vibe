// src/main/services/capture/__tests__/activitywatch-tracker.test.ts
//
// Unit tests with injected spawn/fetch fakes — no real child process, no
// real network call, no real Electron. Mirrors the conventions already
// used in app-usage-tracker.test.ts.

import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { EventEmitter } from 'node:events';
import { createActivityWatchTracker } from '../activitywatch-tracker';

const logger = { child: () => ({ info: vi.fn(), debug: vi.fn(), warn: vi.fn() }) } as any;

function fakeChildProcess(pid = 12345) {
  const emitter = new EventEmitter() as any;
  emitter.kill = vi.fn();
  emitter.pid = pid;
  return emitter;
}

function jsonResponse(body: unknown, ok = true) {
  return Promise.resolve({ ok, json: () => Promise.resolve(body) } as Response);
}

/** Sets up a temp resourcesDir with fake win32 binaries present. */
function setupFakeBinaries() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-tracker-test-'));
  const dir = path.join(tmp, 'win-x64');
  fs.mkdirSync(path.join(dir, 'aw-watcher-window'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'aw-server-rust.exe'), 'fake');
  fs.writeFileSync(path.join(dir, 'aw-watcher-window', 'aw-watcher-window.exe'), 'fake');
  return tmp;
}

describe('createActivityWatchTracker', () => {
  it('isAvailable() is false and nothing is spawned when binaries are missing', async () => {
    const spawnFn = vi.fn();
    const tracker = createActivityWatchTracker({
      logger,
      platform: 'win32',
      arch: 'x64',
      options: { resourcesDir: fs.mkdtempSync(path.join(os.tmpdir(), 'aw-tracker-empty-')) },
      spawnFn: spawnFn as any,
      fetchFn: vi.fn() as any,
    });
    tracker.start();
    expect(spawnFn).not.toHaveBeenCalled();
    expect(tracker.isAvailable()).toBe(false);
    expect(await tracker.drain()).toEqual([]);
  });

  it('reports unavailable via onAvailabilityChange when binaries are missing, and available once the startup check succeeds', async () => {
    const changes: boolean[] = [];
    const missingTracker = createActivityWatchTracker({
      logger,
      platform: 'win32',
      arch: 'x64',
      options: { resourcesDir: fs.mkdtempSync(path.join(os.tmpdir(), 'aw-tracker-empty-')) },
      spawnFn: vi.fn() as any,
      fetchFn: vi.fn() as any,
      onAvailabilityChange: (available) => changes.push(available),
    });
    missingTracker.start();
    expect(changes).toEqual([false]);

    const resourcesDir = setupFakeBinaries();
    const availChanges: boolean[] = [];
    const fetchFn = vi.fn().mockImplementation((url: string) =>
      url.includes('/api/0/info') ? jsonResponse({ hostname: 'test-host' }) : jsonResponse([]),
    );
    const tracker = createActivityWatchTracker({
      logger,
      platform: 'win32',
      arch: 'x64',
      options: { resourcesDir },
      spawnFn: (() => fakeChildProcess()) as any,
      fetchFn: fetchFn as any,
      onAvailabilityChange: (available) => availChanges.push(available),
    });
    tracker.start();
    await new Promise((r) => setTimeout(r, 400));
    expect(availChanges).toEqual([true]);
    tracker.stop();
  });

  it('reports unavailable via onAvailabilityChange if a child process exits after having been available', async () => {
    const resourcesDir = setupFakeBinaries();
    const serverProc = fakeChildProcess();
    const watcherProc = fakeChildProcess();
    let call = 0;
    const spawnFn = vi.fn(() => (call++ === 0 ? serverProc : watcherProc));
    const fetchFn = vi.fn().mockImplementation((url: string) =>
      url.includes('/api/0/info') ? jsonResponse({ hostname: 'test-host' }) : jsonResponse([]),
    );
    const changes: boolean[] = [];
    const tracker = createActivityWatchTracker({
      logger,
      platform: 'win32',
      arch: 'x64',
      options: { resourcesDir },
      spawnFn: spawnFn as any,
      fetchFn: fetchFn as any,
      onAvailabilityChange: (available) => changes.push(available),
    });

    tracker.start();
    await new Promise((r) => setTimeout(r, 400));
    expect(changes).toEqual([true]);

    watcherProc.emit('exit', 1); // simulate a crash, not a deliberate stop()
    expect(changes).toEqual([true, false]);
    expect(tracker.isAvailable()).toBe(false);
  });

  it('passes --dbpath as a FILE inside the directory (not the directory itself — confirmed against the real binary that passing a directory panics it)', async () => {
    const resourcesDir = setupFakeBinaries();
    const dbPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'aw-dbpath-test-')), 'nested', 'activitywatch');
    const spawnFn = vi.fn(() => fakeChildProcess());
    const tracker = createActivityWatchTracker({
      logger,
      platform: 'win32',
      arch: 'x64',
      options: { resourcesDir, dbPath },
      spawnFn: spawnFn as any,
      fetchFn: vi.fn().mockImplementation(() => jsonResponse({}, false)) as any,
    });

    tracker.start();
    await new Promise((r) => setTimeout(r, 50)); // let the (now async) orphan check resolve before spawning

    expect(fs.existsSync(dbPath)).toBe(true);
    const serverCall = spawnFn.mock.calls[0];
    const dbpathIdx = serverCall[1].indexOf('--dbpath');
    expect(dbpathIdx).toBeGreaterThanOrEqual(0);
    const passedPath = serverCall[1][dbpathIdx + 1];
    expect(passedPath).not.toBe(dbPath); // must be a file inside it, not the dir itself
    expect(path.dirname(passedPath)).toBe(dbPath);
  });

  it('always passes --exclude-title to the watcher, so window titles (document names, email subjects, browser URLs) are never captured — only the app name we actually use', async () => {
    const resourcesDir = setupFakeBinaries();
    const spawnFn = vi.fn(() => fakeChildProcess());
    const tracker = createActivityWatchTracker({
      logger,
      platform: 'win32',
      arch: 'x64',
      options: { resourcesDir },
      spawnFn: spawnFn as any,
      fetchFn: vi.fn().mockImplementation(() => jsonResponse({}, false)) as any,
    });

    tracker.start();
    await new Promise((r) => setTimeout(r, 50));

    const watcherCall = spawnFn.mock.calls[1];
    expect(watcherCall[1]).toContain('--exclude-title');
  });

  it('spawns both processes and becomes available once the local server responds', async () => {
    const resourcesDir = setupFakeBinaries();
    const spawnFn = vi.fn(() => fakeChildProcess());
    const fetchFn = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/0/info')) return jsonResponse({ hostname: 'test-host' });
      return jsonResponse([]);
    });
    const tracker = createActivityWatchTracker({
      logger,
      platform: 'win32',
      arch: 'x64',
      options: { resourcesDir, syncIntervalMs: 50 },
      spawnFn: spawnFn as any,
      fetchFn: fetchFn as any,
    });

    tracker.start();
    // waitForServer polls every 250ms; give it a couple of ticks to resolve
    // (this also covers the now-async orphan check ahead of spawning).
    await new Promise((r) => setTimeout(r, 400));
    expect(spawnFn).toHaveBeenCalledTimes(2);
    expect(tracker.isAvailable()).toBe(true);

    tracker.stop();
  });

  it('drain() reduces synced events to distinct, name-resolved apps and clears afterward', async () => {
    const resourcesDir = setupFakeBinaries();
    const events = [
      { data: { app: 'chrome.exe' } },
      { data: { app: 'Code.exe' } },
      { data: { app: 'chrome.exe' } },
    ];
    const fetchFn = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/0/info')) return jsonResponse({ hostname: 'test-host' });
      if (url.includes('/events')) return jsonResponse(events);
      return jsonResponse({});
    });
    const resolveNameFn = vi.fn((raw: string) => (raw === 'chrome.exe' ? 'Google Chrome' : 'Visual Studio Code'));
    const tracker = createActivityWatchTracker({
      logger,
      platform: 'win32',
      arch: 'x64',
      options: { resourcesDir, syncIntervalMs: 50 },
      spawnFn: (() => fakeChildProcess()) as any,
      fetchFn: fetchFn as any,
      resolveNameFn: resolveNameFn as any,
    });

    tracker.start();
    await new Promise((r) => setTimeout(r, 500)); // let the startup check + at least one sync run

    const result = await tracker.drain();
    expect(result.sort()).toEqual(['Google Chrome', 'Visual Studio Code']);
    expect(await tracker.drain()).toEqual([]); // cleared
    // "chrome.exe" appeared twice across events but should only be resolved once (cached).
    expect(resolveNameFn.mock.calls.filter((c) => c[0] === 'chrome.exe').length).toBe(1);

    tracker.stop();
  });

  it('deletes each synced event from AW by id after reading it — retention, not just reading', async () => {
    const resourcesDir = setupFakeBinaries();
    // Stateful, matching how the real server behaves (confirmed directly):
    // once an event is deleted it no longer appears in subsequent queries.
    let remaining = [
      { id: 101, data: { app: 'chrome.exe' } },
      { id: 102, data: { app: 'Code.exe' } },
    ];
    const deletedIds: string[] = [];
    const fetchFn = vi.fn().mockImplementation((url: string, init?: { method?: string }) => {
      if (init?.method === 'DELETE') {
        const match = url.match(/\/events\/(\d+)$/);
        if (match) {
          deletedIds.push(match[1]);
          remaining = remaining.filter((e) => String(e.id) !== match[1]);
        }
        return jsonResponse({});
      }
      if (url.includes('/api/0/info')) return jsonResponse({ hostname: 'test-host' });
      if (url.includes('/events')) return jsonResponse(remaining);
      return jsonResponse({});
    });
    const tracker = createActivityWatchTracker({
      logger,
      platform: 'win32',
      arch: 'x64',
      options: { resourcesDir, syncIntervalMs: 50 },
      spawnFn: (() => fakeChildProcess()) as any,
      fetchFn: fetchFn as any,
      resolveNameFn: ((raw: string) => raw) as any,
    });

    tracker.start();
    await new Promise((r) => setTimeout(r, 500));

    expect(deletedIds.sort()).toEqual(['101', '102']);
    tracker.stop();
  });

  it('wipes the whole bucket on stop() as a retention backstop', async () => {
    const resourcesDir = setupFakeBinaries();
    let bucketWiped = false;
    const fetchFn = vi.fn().mockImplementation((url: string, init?: { method?: string }) => {
      if (init?.method === 'DELETE' && /\/buckets\/[^/]+\?force=1$/.test(url)) {
        bucketWiped = true;
        return jsonResponse({});
      }
      if (url.includes('/api/0/info')) return jsonResponse({ hostname: 'test-host' });
      return jsonResponse([]);
    });
    const tracker = createActivityWatchTracker({
      logger,
      platform: 'win32',
      arch: 'x64',
      options: { resourcesDir },
      spawnFn: (() => fakeChildProcess()) as any,
      fetchFn: fetchFn as any,
    });

    tracker.start();
    await new Promise((r) => setTimeout(r, 400));
    expect(tracker.isAvailable()).toBe(true);

    tracker.stop();
    expect(bucketWiped).toBe(true);
  });

  it('drain() returns [] non-fatally when the event query fails', async () => {
    const resourcesDir = setupFakeBinaries();
    const fetchFn = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/0/info')) return jsonResponse({ hostname: 'test-host' });
      return Promise.reject(new Error('network down'));
    });
    const tracker = createActivityWatchTracker({
      logger,
      platform: 'win32',
      arch: 'x64',
      options: { resourcesDir, syncIntervalMs: 50 },
      spawnFn: (() => fakeChildProcess()) as any,
      fetchFn: fetchFn as any,
    });

    tracker.start();
    await new Promise((r) => setTimeout(r, 400));
    // drain() resolving (rather than rejecting) is itself the "doesn't
    // throw non-fatally" assertion here.
    expect(await tracker.drain()).toEqual([]);
    expect(await tracker.drain()).toEqual([]);

    tracker.stop();
  });

  it('stop() kills both processes and resets availability', async () => {
    const resourcesDir = setupFakeBinaries();
    const serverProc = fakeChildProcess();
    const watcherProc = fakeChildProcess();
    let call = 0;
    const spawnFn = vi.fn(() => (call++ === 0 ? serverProc : watcherProc));
    const fetchFn = vi.fn().mockImplementation((url: string) =>
      url.includes('/api/0/info') ? jsonResponse({ hostname: 'test-host' }) : jsonResponse([]),
    );
    const tracker = createActivityWatchTracker({
      logger,
      platform: 'win32',
      arch: 'x64',
      options: { resourcesDir },
      spawnFn: spawnFn as any,
      fetchFn: fetchFn as any,
    });

    tracker.start();
    await new Promise((r) => setTimeout(r, 400));
    expect(tracker.isAvailable()).toBe(true);

    tracker.stop();
    expect(serverProc.kill).toHaveBeenCalled();
    expect(watcherProc.kill).toHaveBeenCalled();
    expect(tracker.isAvailable()).toBe(false);
  });

  it('does not spawn twice if start() is called while already running', async () => {
    const resourcesDir = setupFakeBinaries();
    const spawnFn = vi.fn(() => fakeChildProcess());
    const tracker = createActivityWatchTracker({
      logger,
      platform: 'win32',
      arch: 'x64',
      options: { resourcesDir },
      spawnFn: spawnFn as any,
      fetchFn: vi.fn().mockImplementation(() => jsonResponse({}, false)) as any,
    });
    tracker.start();
    tracker.start();
    await new Promise((r) => setTimeout(r, 50));
    expect(spawnFn).toHaveBeenCalledTimes(2); // one pair, not two pairs
  });

  it('writes a pid file after spawning, and removes it on a clean stop()', async () => {
    const resourcesDir = setupFakeBinaries();
    const dbPath = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-pidfile-test-'));
    const pidFilePath = path.join(dbPath, 'activitywatch.pid');
    const tracker = createActivityWatchTracker({
      logger,
      platform: 'win32',
      arch: 'x64',
      options: { resourcesDir, dbPath },
      spawnFn: (() => fakeChildProcess()) as any,
      fetchFn: vi.fn().mockImplementation(() => jsonResponse({}, false)) as any,
    });

    tracker.start();
    await new Promise((r) => setTimeout(r, 50)); // let the (now async) orphan check resolve before spawning
    expect(fs.existsSync(pidFilePath)).toBe(true);
    const written = JSON.parse(fs.readFileSync(pidFilePath, 'utf8'));
    expect(written).toEqual({ serverPid: 12345, watcherPid: 12345 });

    tracker.stop();
    expect(fs.existsSync(pidFilePath)).toBe(false);
  });

  /** A checkExecFn that reports a given pid as running at a given path — the "identity" the real OS lookup would return. */
  function fakeCheckExec(pidToPath: Record<string, string>) {
    return vi.fn(async (_file: string, _args: string[], options: any) => {
      const pid = options?.env?.DTT_CHECK_PID;
      return pidToPath[pid] ?? '';
    });
  }

  it('kills a stale pid only after confirming it still points at our own binary — the actual bug that was found', async () => {
    const resourcesDir = setupFakeBinaries();
    const dbPath = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-pidfile-test-'));
    const pidFilePath = path.join(dbPath, 'activitywatch.pid');
    fs.writeFileSync(pidFilePath, JSON.stringify({ serverPid: 99991, watcherPid: 99992 }));

    const serverExePath = path.join(resourcesDir, 'win-x64', 'aw-server-rust.exe');
    const watcherExePath = path.join(resourcesDir, 'win-x64', 'aw-watcher-window', 'aw-watcher-window.exe');
    const checkExecFn = fakeCheckExec({ '99991': serverExePath, '99992': watcherExePath });
    const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => true as any);
    const tracker = createActivityWatchTracker({
      logger,
      platform: 'win32',
      arch: 'x64',
      options: { resourcesDir, dbPath },
      spawnFn: (() => fakeChildProcess()) as any,
      fetchFn: vi.fn().mockImplementation(() => jsonResponse({}, false)) as any,
      checkExecFn: checkExecFn as any,
    });

    tracker.start();
    await new Promise((r) => setTimeout(r, 50));

    expect(checkExecFn).toHaveBeenCalled(); // identity was actually checked, not assumed
    expect(killSpy).toHaveBeenCalledWith(99991);
    expect(killSpy).toHaveBeenCalledWith(99992);
    const written = JSON.parse(fs.readFileSync(pidFilePath, 'utf8'));
    expect(written).toEqual({ serverPid: 12345, watcherPid: 12345 });

    killSpy.mockRestore();
  });

  it('does NOT kill a stale pid that now belongs to an unrelated program — the exact scenario the review flagged', async () => {
    const resourcesDir = setupFakeBinaries();
    const dbPath = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-pidfile-test-'));
    const pidFilePath = path.join(dbPath, 'activitywatch.pid');
    // 99991 is claimed by the stale file to be our server — but the OS now
    // reports something completely different living at that pid, e.g. an
    // editor that started later and happened to reuse the number.
    fs.writeFileSync(pidFilePath, JSON.stringify({ serverPid: 99991, watcherPid: 99992 }));

    const checkExecFn = fakeCheckExec({
      '99991': 'C:\\Program Files\\SomeEditor\\editor.exe',
      '99992': 'C:\\Program Files\\SomeEditor\\editor.exe',
    });
    const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => true as any);
    const tracker = createActivityWatchTracker({
      logger,
      platform: 'win32',
      arch: 'x64',
      options: { resourcesDir, dbPath },
      spawnFn: (() => fakeChildProcess()) as any,
      fetchFn: vi.fn().mockImplementation(() => jsonResponse({}, false)) as any,
      checkExecFn: checkExecFn as any,
    });

    tracker.start();
    await new Promise((r) => setTimeout(r, 50));

    expect(killSpy).not.toHaveBeenCalled();

    killSpy.mockRestore();
  });

  it('does not throw when a stale pid refers to a process that is already gone (identity check returns nothing)', async () => {
    const resourcesDir = setupFakeBinaries();
    const dbPath = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-pidfile-test-'));
    const pidFilePath = path.join(dbPath, 'activitywatch.pid');
    fs.writeFileSync(pidFilePath, JSON.stringify({ serverPid: 99991, watcherPid: 99992 }));

    const checkExecFn = fakeCheckExec({}); // nothing found for any pid
    const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => true as any);
    const tracker = createActivityWatchTracker({
      logger,
      platform: 'win32',
      arch: 'x64',
      options: { resourcesDir, dbPath },
      spawnFn: (() => fakeChildProcess()) as any,
      fetchFn: vi.fn().mockImplementation(() => jsonResponse({}, false)) as any,
      checkExecFn: checkExecFn as any,
    });

    expect(() => tracker.start()).not.toThrow();
    await new Promise((r) => setTimeout(r, 50));
    expect(killSpy).not.toHaveBeenCalled();

    killSpy.mockRestore();
  });

  it('skips a malformed pid (zero, negative, not a number) without even attempting a lookup', async () => {
    const resourcesDir = setupFakeBinaries();
    const dbPath = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-pidfile-test-'));
    const pidFilePath = path.join(dbPath, 'activitywatch.pid');
    fs.writeFileSync(pidFilePath, JSON.stringify({ serverPid: -5, watcherPid: 0 }));

    const checkExecFn = vi.fn(async () => '');
    const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => true as any);
    const tracker = createActivityWatchTracker({
      logger,
      platform: 'win32',
      arch: 'x64',
      options: { resourcesDir, dbPath },
      spawnFn: (() => fakeChildProcess()) as any,
      fetchFn: vi.fn().mockImplementation(() => jsonResponse({}, false)) as any,
      checkExecFn: checkExecFn as any,
    });

    tracker.start();
    await new Promise((r) => setTimeout(r, 50));

    expect(checkExecFn).not.toHaveBeenCalled(); // never even asked — invalid before that
    expect(killSpy).not.toHaveBeenCalled();

    killSpy.mockRestore();
  });

  it('never kills its own current process, even if the stale file somehow claims that pid', async () => {
    const resourcesDir = setupFakeBinaries();
    const dbPath = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-pidfile-test-'));
    const pidFilePath = path.join(dbPath, 'activitywatch.pid');
    fs.writeFileSync(pidFilePath, JSON.stringify({ serverPid: process.pid, watcherPid: 99992 }));

    const checkExecFn = fakeCheckExec({
      [String(process.pid)]: path.join(resourcesDir, 'win-x64', 'aw-server-rust.exe'),
      '99992': path.join(resourcesDir, 'win-x64', 'aw-watcher-window', 'aw-watcher-window.exe'),
    });
    const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => true as any);
    const tracker = createActivityWatchTracker({
      logger,
      platform: 'win32',
      arch: 'x64',
      options: { resourcesDir, dbPath },
      spawnFn: (() => fakeChildProcess()) as any,
      fetchFn: vi.fn().mockImplementation(() => jsonResponse({}, false)) as any,
      checkExecFn: checkExecFn as any,
    });

    tracker.start();
    await new Promise((r) => setTimeout(r, 50));

    expect(killSpy).not.toHaveBeenCalledWith(process.pid);

    killSpy.mockRestore();
  });

  it('still starts tracking normally even if the identity check itself throws unexpectedly', async () => {
    const resourcesDir = setupFakeBinaries();
    const dbPath = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-pidfile-test-'));
    const pidFilePath = path.join(dbPath, 'activitywatch.pid');
    fs.writeFileSync(pidFilePath, JSON.stringify({ serverPid: 99991, watcherPid: 99992 }));

    const checkExecFn = vi.fn(async () => {
      throw new Error('boom — unexpected failure inside the identity check');
    });
    const spawnFn = vi.fn(() => fakeChildProcess());
    const tracker = createActivityWatchTracker({
      logger,
      platform: 'win32',
      arch: 'x64',
      options: { resourcesDir, dbPath },
      spawnFn: spawnFn as any,
      fetchFn: vi.fn().mockImplementation(() => jsonResponse({}, false)) as any,
      checkExecFn: checkExecFn as any,
    });

    expect(() => tracker.start()).not.toThrow();
    await new Promise((r) => setTimeout(r, 50));

    // A bug in the safety check must never stop the feature it's protecting.
    expect(spawnFn).toHaveBeenCalledTimes(2); // still spawned a fresh pair
  });

  it('only spawns new processes after the orphan check has finished, never before or during', async () => {
    const resourcesDir = setupFakeBinaries();
    const dbPath = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-pidfile-test-'));
    const pidFilePath = path.join(dbPath, 'activitywatch.pid');
    fs.writeFileSync(pidFilePath, JSON.stringify({ serverPid: 99991, watcherPid: 99992 }));

    const resolvers: Array<(v: string) => void> = [];
    const checkExecFn = vi.fn(
      () => new Promise<string>((resolve) => { resolvers.push(resolve); }),
    );
    const spawnFn = vi.fn(() => fakeChildProcess());
    const tracker = createActivityWatchTracker({
      logger,
      platform: 'win32',
      arch: 'x64',
      options: { resourcesDir, dbPath },
      spawnFn: spawnFn as any,
      fetchFn: vi.fn().mockImplementation(() => jsonResponse({}, false)) as any,
      checkExecFn: checkExecFn as any,
    });

    tracker.start();
    await new Promise((r) => setTimeout(r, 20));
    expect(spawnFn).not.toHaveBeenCalled(); // still waiting on the first pid's check

    resolvers[0](''); // serverPid's check resolves ("not found") — loop moves to watcherPid
    await new Promise((r) => setTimeout(r, 20));
    expect(spawnFn).not.toHaveBeenCalled(); // watcherPid's check is now the one pending — still no spawn

    resolvers[1](''); // let the test finish cleanly, no dangling promise
    await new Promise((r) => setTimeout(r, 20));
    expect(spawnFn).toHaveBeenCalledTimes(2); // now that the check is fully done, spawning proceeds
  });
});
