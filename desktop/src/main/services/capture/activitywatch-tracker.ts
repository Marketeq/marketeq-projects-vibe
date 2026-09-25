// src/main/services/capture/activitywatch-tracker.ts
//
// Real, event-driven app tracking backed by ActivityWatch's own
// aw-watcher-window, run entirely locally (bound to 127.0.0.1, never
// exposed to the network — ActivityWatch itself has no per-user
// authentication, so a shared/remote server is unsafe; see the
// implementation plan for why this is local-only by design).
//
// Implements the exact same AppUsageTracker shape as app-usage-tracker.ts
// (start/stop/drain) so this can be swapped in as a drop-in replacement —
// screenshot-service.ts, capture-supervisor.ts, and index.ts never need to
// know which one they're holding, and drain() stays synchronous like the
// original. isAvailable() additionally reports whether both child
// processes actually started this session, so a composite tracker can
// fall back to the polling-based tracker when the vendored binaries are
// missing, blocked, or fail for any reason.
//
// Why drain() can stay synchronous despite the data source being a local
// HTTP server: aw-watcher-window records every focus change continuously
// and completely on its own — nothing is ever missed by the *watcher*,
// regardless of how often we happen to ask it for what it's recorded. So
// this tracker runs its own short background poll (SYNC_INTERVAL_MS) that
// asynchronously pulls "events since the last sync" into an in-memory Set;
// drain() just reads and clears that already-populated Set, the same
// contract app-usage-tracker.ts's drain() already has. The accuracy gain
// over that tracker isn't "we ask more often" — it's that nothing can slip
// through the cracks *between* our asks, because the watcher's own log is
// complete.
//
// Confirmed against the real binaries on this machine (not assumed):
//   - aw-server-rust.exe is a genuinely standalone executable.
//   - aw-watcher-window.exe is a PyInstaller bundle — the whole sibling
//     folder must be vendored, not just the .exe.
//   - On Windows, the watcher reports the raw executable name (e.g.
//     "WindowsTerminal.exe"), not a friendly display name — app-icon-
//     service.ts's extraction matching was updated to handle this.

import { spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import type { Logger } from 'pino';
import type { AppUsageTracker } from './app-usage-tracker';
import { resolveFriendlyAppName } from './app-icon-service';

const DEFAULT_PORT = 5987; // deliberately not AW's own default 5600, to
// avoid colliding with a real ActivityWatch install the user might already
// be running for their own personal use.
const STARTUP_TIMEOUT_MS = 5000;
const STARTUP_POLL_MS = 250;
const SYNC_INTERVAL_MS = 5000; // how often we pull new events out of AW's log

export interface ActivityWatchTrackerOptions {
  port?: number;
  /** Root dir containing win-x64/mac-x64/etc subfolders. Defaults to resources/activitywatch next to the packaged app. */
  resourcesDir?: string;
  syncIntervalMs?: number;
  /**
   * Where aw-server-rust stores its local event database. Without this,
   * it falls back to its own default OS-level location — outside this
   * app's managed userData directory, with no retention policy and
   * nothing cleaning it up on uninstall. Callers should pass a path
   * under app.getPath('userData') (see index.ts).
   */
  dbPath?: string;
}

interface Deps {
  logger: Logger;
  options?: ActivityWatchTrackerOptions;
  platform?: NodeJS.Platform;
  arch?: string;
  /** Injectable for tests. */
  spawnFn?: typeof spawn;
  fetchFn?: typeof fetch;
  resolveNameFn?: typeof resolveFriendlyAppName;
}

export interface ActivityWatchTracker extends AppUsageTracker {
  isAvailable: () => boolean;
}

/**
 * `process.resourcesPath` points at the packaged app's resources dir when
 * running from a real build, but at Electron's own bundled resources when
 * running unpackaged (`electron .` — every dev-mode launch this session).
 * Prefer the packaged path if it actually contains our vendored binaries;
 * otherwise fall back to resources/ next to the project root (dev mode).
 */
function resolveDefaultResourcesDir(): string {
  const packaged = path.join(process.resourcesPath ?? '', 'activitywatch');
  if (fs.existsSync(packaged)) return packaged;
  return path.join(process.cwd(), 'resources', 'activitywatch');
}

function platformDir(platform: NodeJS.Platform, arch: string): string {
  const os = platform === 'darwin' ? 'mac' : platform === 'win32' ? 'win' : platform;
  const a = arch === 'x64' ? 'x64' : arch === 'arm64' ? 'arm64' : arch;
  return `${os}-${a}`;
}

export function createActivityWatchTracker(deps: Deps): ActivityWatchTracker {
  const log = deps.logger.child({ svc: 'activitywatch-tracker' });
  const platform = deps.platform ?? process.platform;
  const arch = deps.arch ?? process.arch;
  const port = deps.options?.port ?? DEFAULT_PORT;
  const syncIntervalMs = deps.options?.syncIntervalMs ?? SYNC_INTERVAL_MS;
  const dbPath = deps.options?.dbPath;
  const spawnFn = deps.spawnFn ?? spawn;
  const fetchFn = deps.fetchFn ?? fetch;
  const resolveNameFn = deps.resolveNameFn ?? resolveFriendlyAppName;
  const resourcesDir = deps.options?.resourcesDir ?? resolveDefaultResourcesDir();

  const dir = path.join(resourcesDir, platformDir(platform, arch));
  const serverPath =
    platform === 'win32' ? path.join(dir, 'aw-server-rust.exe') : path.join(dir, 'aw-server-rust');
  const watcherPath =
    platform === 'win32'
      ? path.join(dir, 'aw-watcher-window', 'aw-watcher-window.exe')
      : path.join(dir, 'aw-watcher-window', 'aw-watcher-window');

  let serverProc: ChildProcess | null = null;
  let watcherProc: ChildProcess | null = null;
  let syncHandle: NodeJS.Timeout | null = null;
  let available = false;
  let hostname: string | null = null;
  let syncedThrough = 0;
  const seen = new Set<string>();
  // Resolving a raw name to its friendly display name is a PowerShell
  // round-trip on Windows — cache it per session so each distinct app only
  // pays that cost once, not once per 5s sync tick.
  const nameCache = new Map<string, string>();
  function friendlyName(raw: string): string {
    let resolved = nameCache.get(raw);
    if (resolved === undefined) {
      resolved = resolveNameFn(raw, platform);
      nameCache.set(raw, resolved);
    }
    return resolved;
  }

  async function waitForServer(): Promise<boolean> {
    const deadline = Date.now() + STARTUP_TIMEOUT_MS;
    while (Date.now() < deadline) {
      try {
        const res = await fetchFn(`http://127.0.0.1:${port}/api/0/info`);
        if (res.ok) {
          const info = (await res.json()) as { hostname?: string };
          hostname = info.hostname ?? null;
          return true;
        }
      } catch {
        // not up yet, keep polling until the deadline
      }
      await new Promise((r) => setTimeout(r, STARTUP_POLL_MS));
    }
    return false;
  }

  async function syncOnce(): Promise<void> {
    if (!available || !hostname) return;
    try {
      const bucketId = `aw-watcher-window_${hostname}`;
      const from = syncedThrough || Date.now() - 10 * 60_000;
      const to = Date.now();
      const url =
        `http://127.0.0.1:${port}/api/0/buckets/${encodeURIComponent(bucketId)}/events` +
        `?start=${encodeURIComponent(new Date(from).toISOString())}` +
        `&end=${encodeURIComponent(new Date(to).toISOString())}`;
      const res = await fetchFn(url);
      if (res.ok) {
        const events = (await res.json()) as Array<{ data?: { app?: string } }>;
        for (const e of events) {
          const app = e.data?.app;
          if (app) seen.add(friendlyName(app));
        }
      }
      syncedThrough = to;
    } catch (err) {
      log.debug({ err }, 'activitywatch event sync failed (non-fatal)');
    }
  }

  function start(): void {
    if (serverProc || watcherProc) return;
    if (!fs.existsSync(serverPath) || !fs.existsSync(watcherPath)) {
      log.info({ serverPath, watcherPath }, 'activitywatch binaries not present, unavailable');
      available = false;
      return;
    }
    try {
      const serverArgs = ['--port', String(port)];
      if (dbPath) {
        // --dbpath wants the database *file* itself, not its containing
        // directory — passing a directory makes aw-server-rust panic trying
        // to open it as a SQLite file, which poisons its internal lock and
        // breaks every request after (confirmed directly against the real
        // binary). dbPath here is the directory; create it, then point
        // --dbpath at a file inside it.
        fs.mkdirSync(dbPath, { recursive: true });
        const dbFilePath = path.join(dbPath, 'aw-server.sqlite');
        serverArgs.push('--dbpath', dbFilePath);
      }
      serverProc = spawnFn(serverPath, serverArgs, {
        stdio: 'ignore',
        windowsHide: true,
      });
      serverProc.on('error', (err) => log.warn({ err }, 'aw-server-rust spawn error'));
      serverProc.on('exit', (code) => log.info({ code }, 'aw-server-rust exited'));

      watcherProc = spawnFn(watcherPath, ['--port', String(port)], {
        stdio: 'ignore',
        windowsHide: true,
        cwd: path.dirname(watcherPath),
      });
      watcherProc.on('error', (err) => log.warn({ err }, 'aw-watcher-window spawn error'));
      watcherProc.on('exit', (code) => log.info({ code }, 'aw-watcher-window exited'));

      waitForServer().then((ok) => {
        available = ok;
        log.info({ available: ok }, 'activitywatch tracker startup check complete');
        if (ok) {
          syncedThrough = Date.now();
          syncHandle = setInterval(() => void syncOnce(), syncIntervalMs);
          if (syncHandle.unref) syncHandle.unref();
        }
      });
    } catch (err) {
      log.warn({ err }, 'failed to spawn activitywatch processes (non-fatal)');
      available = false;
      stop();
    }
  }

  function stop(): void {
    if (syncHandle) clearInterval(syncHandle);
    syncHandle = null;
    try {
      watcherProc?.kill();
    } catch {
      /* ignore */
    }
    try {
      serverProc?.kill();
    } catch {
      /* ignore */
    }
    watcherProc = null;
    serverProc = null;
    available = false;
  }

  function isAvailable(): boolean {
    return available;
  }

  function drain(): string[] {
    const result = Array.from(seen);
    seen.clear();
    return result;
  }

  return { start, stop, drain, isAvailable };
}
