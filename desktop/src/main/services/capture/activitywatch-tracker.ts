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

import { spawn, execFile, type ChildProcess } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import fs from 'node:fs';
import type { Logger } from 'pino';
import type { AppUsageTracker } from './app-usage-tracker';
import { resolveFriendlyAppName, type AsyncExecFile } from './app-icon-service';

const execFileAsync = promisify(execFile);
const defaultCheckExec: AsyncExecFile = async (file, args, options) => {
  const { stdout } = await execFileAsync(file, args, options);
  return stdout;
};

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
  /** Injectable for tests — used only to verify a stale PID's identity before killing it. */
  checkExecFn?: AsyncExecFile;
  /**
   * Fired once with the result of the startup check (binaries missing,
   * failed to bind, or came up successfully), and again with `false` if
   * either child process exits unexpectedly afterward. Lets the caller run
   * a fallback tracker only when ActivityWatch genuinely isn't working,
   * instead of running both unconditionally for the whole session.
   */
  onAvailabilityChange?: (available: boolean) => void;
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

/**
 * Looks up the full executable path of whatever is *currently* running
 * under `pid`, or null if nothing is (or the lookup itself fails). Used to
 * confirm a stale PID from a previous crashed run genuinely still is our
 * own process before killing it — PIDs get reused by the OS, sometimes for
 * something else entirely, so the PID alone is never enough to act on.
 *
 * pid is passed out of band (env var on Windows, a real argv item on
 * macOS/Linux), never interpolated into script text — same rule as every
 * other shell-out in this codebase, even though a PID is "just a number":
 * consistency matters more than judging this one value safe in isolation.
 *
 * Confirmed directly against the real OS (not assumed): a real spawned
 * process's path comes back byte-identical to how this file already
 * constructs it; a real unrelated process's path correctly does not match;
 * a nonexistent PID comes back as a clean empty result, not an error,
 * given -ErrorAction SilentlyContinue on Windows.
 */
async function getProcessExecutablePath(
  pid: number,
  platform: NodeJS.Platform,
  exec: AsyncExecFile,
): Promise<string | null> {
  try {
    if (platform === 'win32') {
      const script = '(Get-Process -Id $env:DTT_CHECK_PID -ErrorAction SilentlyContinue).Path';
      const result = (
        await exec(
          'powershell.exe',
          ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
          { timeout: 2000, env: { ...process.env, DTT_CHECK_PID: String(pid) } },
        )
      ).trim();
      return result || null;
    }
    // macOS/Linux: `ps -p <pid> -o comm=` prints the executable path for
    // that pid, or nothing (empty stdout) if it doesn't exist. pid is a
    // real argv item here, not shell text, so there's nothing to escape.
    const result = (await exec('ps', ['-p', String(pid), '-o', 'comm='], { timeout: 2000 })).trim();
    return result || null;
  } catch {
    return null;
  }
}

export function createActivityWatchTracker(deps: Deps): ActivityWatchTracker {
  const log = deps.logger.child({ svc: 'activitywatch-tracker' });
  const platform = deps.platform ?? process.platform;
  const arch = deps.arch ?? process.arch;
  const port = deps.options?.port ?? DEFAULT_PORT;
  const syncIntervalMs = deps.options?.syncIntervalMs ?? SYNC_INTERVAL_MS;
  const dbPath = deps.options?.dbPath;
  const onAvailabilityChange = deps.onAvailabilityChange ?? (() => {});
  const spawnFn = deps.spawnFn ?? spawn;
  const fetchFn = deps.fetchFn ?? fetch;
  const resolveNameFn = deps.resolveNameFn ?? resolveFriendlyAppName;
  const checkExecFn = deps.checkExecFn ?? defaultCheckExec;
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
  async function friendlyName(raw: string): Promise<string> {
    let resolved = nameCache.get(raw);
    if (resolved === undefined) {
      resolved = await resolveNameFn(raw, platform);
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
        const events = (await res.json()) as Array<{ id?: number; data?: { app?: string } }>;
        for (const e of events) {
          const app = e.data?.app;
          if (app) seen.add(await friendlyName(app));
        }
        // Retention: we've extracted everything this feature ever needs
        // (just the app name) — delete the underlying events from
        // ActivityWatch's own database immediately rather than letting
        // them accumulate indefinitely. Confirmed directly against the
        // real binary: DELETE /api/0/buckets/<bucket>/events/<id> -> 200.
        // Best-effort per event; one failed delete doesn't block the rest
        // or the next sync (they'll fall outside the next [from, to]
        // window either way once syncedThrough advances).
        await Promise.all(
          events
            .filter((e) => e.id !== undefined)
            .map((e) =>
              fetchFn(
                `http://127.0.0.1:${port}/api/0/buckets/${encodeURIComponent(bucketId)}/events/${e.id}`,
                { method: 'DELETE' },
              ).catch((err) => log.debug({ err, id: e.id }, 'failed to delete synced AW event (non-fatal)')),
            ),
        );
      }
      syncedThrough = to;
    } catch (err) {
      log.debug({ err }, 'activitywatch event sync failed (non-fatal)');
    }
  }

  // Written after both processes spawn successfully, removed on a clean
  // stop(). If it's still there on the next start(), the previous run
  // crashed or was force-quit without stopping cleanly — those two
  // processes are orphaned, still running, and (per the review that found
  // this) the next launch would otherwise find the port already taken.
  // Only meaningful when dbPath is set (real usage always sets it — see
  // index.ts); skipped entirely otherwise, e.g. in tests.
  const pidFilePath = dbPath ? path.join(dbPath, 'activitywatch.pid') : null;

  function isValidPid(pid: unknown): pid is number {
    return typeof pid === 'number' && Number.isInteger(pid) && pid > 0;
  }

  // .kill() only *requests* termination — it resolves nothing and fires no
  // event of its own; the process can still hold its port and any open file
  // handles (notably the sqlite --dbpath file) for a little while after the
  // call returns. Confirmed directly against the real binaries: a stop()
  // that only called .kill() and moved on let a rapid stop()-then-start()
  // spawn a new aw-server-rust before the old one had actually released the
  // port/db file, and the new one died on startup. Waiting for the child's
  // own 'exit' event (not just calling kill()) is what actually closes that
  // gap. Bounded by a timeout so a process that refuses to die can't hang
  // shutdown (and therefore the next start()) forever.
  function waitForExit(proc: ChildProcess | null, timeoutMs = 3000): Promise<void> {
    return new Promise((resolve) => {
      if (!proc || proc.exitCode !== null || proc.signalCode !== null) {
        resolve();
        return;
      }
      const timer = setTimeout(() => {
        proc.removeListener('exit', onExit);
        log.debug('process did not exit within the timeout after kill() — proceeding anyway');
        resolve();
      }, timeoutMs);
      function onExit() {
        clearTimeout(timer);
        resolve();
      }
      proc.once('exit', onExit);
      try {
        proc.kill();
      } catch {
        clearTimeout(timer);
        proc.removeListener('exit', onExit);
        resolve();
      }
    });
  }

  // Kills a leftover process from a previous crashed run — but only after
  // confirming it's actually still our own binary, not whatever the OS has
  // since handed that PID to. Real review finding, verified against the
  // real OS before fixing: PIDs get reused, sometimes within days (a
  // reboot, or the app just not being reopened for a while), and killing
  // by PID alone could take down something completely unrelated — an
  // editor, anything. Confirmed directly: a real spawned copy of our own
  // binary reports back the exact same path we already know it by; a real
  // unrelated program's path correctly never matches.
  //
  // Structured so this can never reject and never throw past its own
  // boundary — a bug in a safety check must never be able to stop the
  // feature it's protecting from starting.
  async function killOrphansFromPreviousRun(): Promise<void> {
    if (!pidFilePath || !fs.existsSync(pidFilePath)) return;
    try {
      const parsed = JSON.parse(fs.readFileSync(pidFilePath, 'utf8')) as {
        serverPid?: number;
        watcherPid?: number;
      };
      const candidates: Array<{ pid: number | undefined; expectedPath: string; label: string }> = [
        { pid: parsed.serverPid, expectedPath: serverPath, label: 'aw-server-rust' },
        { pid: parsed.watcherPid, expectedPath: watcherPath, label: 'aw-watcher-window' },
      ];
      for (const { pid, expectedPath, label } of candidates) {
        if (!isValidPid(pid)) continue; // malformed entry (zero, negative, not a number) — never act on it
        if (pid === process.pid) continue; // never kill ourselves, whatever the file claims
        try {
          const actualPath = await getProcessExecutablePath(pid, platform, checkExecFn);
          const matches =
            actualPath !== null && path.resolve(actualPath).toLowerCase() === path.resolve(expectedPath).toLowerCase();
          if (matches) {
            try {
              process.kill(pid);
              log.info({ pid, label }, 'killed orphaned activitywatch process from a previous crashed run');
            } catch {
              /* gone between the check and the kill — fine, nothing left to clean up */
            }
          } else {
            log.debug(
              { pid, label, actualPath },
              'stale pid no longer matches our own process (reused, or already gone) — leaving it alone',
            );
          }
        } catch (err) {
          // A failure verifying this one candidate must never turn into an
          // unverified kill, and must never stop the other candidate from
          // still being checked.
          log.debug({ err, pid, label }, 'failed to verify stale pid, leaving it alone (non-fatal)');
        }
      }
    } catch (err) {
      log.debug({ err }, 'failed to read/parse stale activitywatch pid file (non-fatal)');
    } finally {
      try {
        fs.unlinkSync(pidFilePath);
      } catch {
        /* ignore */
      }
    }
  }

  // Bumped on every start() and stop() call. The orphan check now happens
  // asynchronously before anything spawns, which opens a real gap that
  // didn't exist when this was all synchronous: stop() (or a newer
  // start()) could run while an earlier start() is still mid-check. Each
  // start() captures its own generation and re-checks it right before
  // spawning — if something else has moved the generation on in the
  // meantime, that attempt is abandoned instead of spawning into a session
  // that's already changed its mind.
  let startGeneration = 0;

  // Set while stop()'s teardown (wipe the bucket, then kill both
  // processes, then clear the pid file) is in flight, cleared once it's
  // fully done. Review finding: stop() used to fire the wipe and kill
  // immediately after, without waiting — the wipe rarely completed before
  // the server died. The fix isn't just "await the wipe": if start() is
  // called while that teardown is still running, it must wait for the old
  // processes to actually be dead before spawning new ones, otherwise it
  // either wrongly thinks a session is "already running" or tries to bind
  // the same port the dying server hasn't released yet.
  let stoppingPromise: Promise<void> | null = null;

  function start(): void {
    if (stoppingPromise) {
      const waitFor = stoppingPromise;
      const myGeneration = ++startGeneration;
      void waitFor.then(() => {
        if (myGeneration !== startGeneration) {
          log.debug('start() superseded while waiting for a prior stop() to finish tearing down — abandoning');
          return;
        }
        start(); // teardown is done, refs are cleared — re-enter for a normal fresh start
      });
      return;
    }
    if (serverProc || watcherProc) return;
    if (!fs.existsSync(serverPath) || !fs.existsSync(watcherPath)) {
      log.info({ serverPath, watcherPath }, 'activitywatch binaries not present, unavailable');
      available = false;
      onAvailabilityChange(false);
      return;
    }
    const myGeneration = ++startGeneration;
    void killOrphansFromPreviousRun()
      .catch((err) => {
        // killOrphansFromPreviousRun is written to never reject — this is
        // a last-resort guard, not the expected path.
        log.debug({ err }, 'unexpected error during orphan cleanup (non-fatal)');
      })
      .then(() => {
        if (myGeneration !== startGeneration) {
          log.debug('start() superseded by a newer start()/stop() while checking for orphans — abandoning');
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
          serverProc.on('exit', (code) => {
            log.info({ code }, 'aw-server-rust exited');
            if (available) {
              available = false;
              onAvailabilityChange(false);
            }
          });

          // --exclude-title: aw-watcher-window records the full window title by
          // default (document names, email subjects, and on macOS the active
          // browser URL including incognito) — far more than this feature needs
          // or should retain. We only ever read data.app; --exclude-title makes
          // the watcher itself replace the title field before it's ever written
          // to the local database, rather than us discarding it after the fact.
          // Verified directly against the real binary: with this flag, captured
          // events show `"title":"excluded"` while `"app"` is unaffected.
          watcherProc = spawnFn(watcherPath, ['--port', String(port), '--exclude-title'], {
            stdio: 'ignore',
            windowsHide: true,
            cwd: path.dirname(watcherPath),
          });
          watcherProc.on('error', (err) => log.warn({ err }, 'aw-watcher-window spawn error'));
          watcherProc.on('exit', (code) => {
            log.info({ code }, 'aw-watcher-window exited');
            if (available) {
              available = false;
              onAvailabilityChange(false);
            }
          });

          if (pidFilePath && serverProc.pid && watcherProc.pid) {
            try {
              fs.mkdirSync(path.dirname(pidFilePath), { recursive: true });
              fs.writeFileSync(
                pidFilePath,
                JSON.stringify({ serverPid: serverProc.pid, watcherPid: watcherProc.pid }),
              );
            } catch (err) {
              log.debug({ err }, 'failed to write activitywatch pid file (non-fatal)');
            }
          }

          waitForServer().then((ok) => {
            available = ok;
            log.info({ available: ok }, 'activitywatch tracker startup check complete');
            if (ok) {
              syncedThrough = Date.now();
              syncHandle = setInterval(() => void syncOnce(), syncIntervalMs);
              if (syncHandle.unref) syncHandle.unref();
            }
            onAvailabilityChange(ok);
          });
        } catch (err) {
          log.warn({ err }, 'failed to spawn activitywatch processes (non-fatal)');
          available = false;
          stop();
          onAvailabilityChange(false);
        }
      });
  }

  function stop(): void {
    startGeneration++;
    if (syncHandle) clearInterval(syncHandle);
    syncHandle = null;
    if (stoppingPromise) return; // a teardown is already in flight — don't start a second one
    if (!serverProc && !watcherProc) {
      available = false;
      return; // nothing actually running, nothing to tear down
    }

    // Snapshot what needs cleanup before resetting state, so a start()
    // called the instant after this returns doesn't see stale references.
    const serverProcToKill = serverProc;
    const watcherProcToKill = watcherProc;
    const bucketIdToWipe = available && hostname ? `aw-watcher-window_${hostname}` : null;
    available = false; // reflect "stopped" immediately — isAvailable() shouldn't lag behind a stop() call

    stoppingPromise = (async () => {
      // Ordered, not parallel — and each step is confirmed-dead, not just
      // signaled. Review finding: killing the watcher and wiping the bucket
      // at the same time leaves a real gap — the watcher can still report
      // one more focus change while the DELETE is in flight, and that event
      // can land in the bucket *after* the wipe already ran, so it never
      // gets erased. Killing the watcher first, and waiting for it to
      // actually be gone (not just signaled — see waitForExit's comment),
      // makes it physically impossible for new data to appear once the wipe
      // starts. The server is killed last, once nothing needs it anymore.
      await waitForExit(watcherProcToKill);

      // Retention backstop: wipe anything left in the bucket (events that
      // arrived after the last sync but before stop) so nothing outlives
      // the session that generated it. Genuinely awaited — a real review
      // finding: this used to fire the DELETE and kill the server in the
      // same tick, so the request almost never landed before the process
      // died. Bounded by a short timeout so an unresponsive server can't
      // block shutdown (and a subsequent start()) forever. Confirmed
      // directly against the real binary: DELETE
      // /api/0/buckets/<bucket>?force=1 -> 200, and the data is actually
      // gone afterward — not just "the request didn't error."
      if (bucketIdToWipe) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        try {
          await fetchFn(`http://127.0.0.1:${port}/api/0/buckets/${encodeURIComponent(bucketIdToWipe)}?force=1`, {
            method: 'DELETE',
            signal: controller.signal,
          });
        } catch (err) {
          log.debug({ err }, 'failed to wipe AW bucket on stop (non-fatal)');
        } finally {
          clearTimeout(timeoutId);
        }
      }
      // Awaited, not fire-and-forget — see waitForExit's comment for why:
      // a queued start() must not be able to spawn into a port/db file the
      // old process hasn't actually released yet.
      await waitForExit(serverProcToKill);
      // A clean stop shut both processes down properly — nothing orphaned,
      // nothing for the next start() to clean up.
      if (pidFilePath) {
        try {
          fs.unlinkSync(pidFilePath);
        } catch {
          /* ignore — may not exist */
        }
      }
    })().finally(() => {
      watcherProc = null;
      serverProc = null;
      stoppingPromise = null;
    });
  }

  function isAvailable(): boolean {
    return available;
  }

  // Synchronous in practice (just reads the in-memory Set that syncOnce's
  // background interval already populated) — async only to satisfy the
  // shared AppUsageTracker interface, which the polling tracker genuinely
  // needs async for (see app-usage-tracker.ts).
  async function drain(): Promise<string[]> {
    const result = Array.from(seen);
    seen.clear();
    return result;
  }

  return { start, stop, drain, isAvailable };
}
