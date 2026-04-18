// src/main/services/sync/network-monitor.ts
//
// Phase 4 — Network monitor / probe.
//
// Combines Electron's `net.isOnline()` signal with a periodic application
// health probe (GET /health) per doc 16 §3. Emits a single boolean
// `net:online-changed` event whenever the effective online/offline state
// flips.
//
// Unlike doc 16's three-state machine (Online / Degraded / Offline) the
// sync worker only cares about a binary "can we make a request right now"
// signal, so we collapse Degraded into Online (we try; the api-client
// itself backs off on errors) and Offline is exposed as a hard boolean.

import { EventEmitter } from 'node:events';
import type { Logger } from 'pino';
import type { ApiClient } from './api-client';

export type NetworkStateDetail = 'Online' | 'Degraded' | 'Offline';

export interface NetworkMonitorEvents {
  on(event: 'net:online-changed', listener: (online: boolean) => void): this;
  on(event: 'net:state-changed', listener: (detail: NetworkStateDetail) => void): this;
  off(event: 'net:online-changed', listener: (online: boolean) => void): this;
  off(event: 'net:state-changed', listener: (detail: NetworkStateDetail) => void): this;
}

export interface NetworkMonitorDeps {
  api: ApiClient;
  logger?: Logger;
  /** Health probe interval (ms). Defaults to doc 16 §3's 30 seconds. */
  probeIntervalMs?: number;
  /** Timeout for the health probe (ms). */
  probeTimeoutMs?: number;
  /** Injected Electron `net` surface (so tests can skip Electron entirely). */
  electronNet?: { isOnline: () => boolean } | null;
  /** Initial state override (tests). */
  initialOnline?: boolean;
}

export type NetworkMonitor = ReturnType<typeof createNetworkMonitor>;

function loadElectronNet(): { isOnline: () => boolean } | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { net } = require('electron') as {
      net: { isOnline: () => boolean };
    };
    return net ?? null;
  } catch {
    return null;
  }
}

export function createNetworkMonitor(deps: NetworkMonitorDeps) {
  const log = deps.logger?.child({ svc: 'network-monitor' });
  const bus = new EventEmitter() as EventEmitter & NetworkMonitorEvents;
  const probeIntervalMs = deps.probeIntervalMs ?? 30_000;
  const probeTimeoutMs = deps.probeTimeoutMs ?? 5_000;
  const eNet = deps.electronNet === undefined ? loadElectronNet() : deps.electronNet;

  let online = deps.initialOnline ?? true;
  let detail: NetworkStateDetail = online ? 'Online' : 'Offline';
  let strikes = 0;
  let handle: NodeJS.Timeout | null = null;
  let running = false;

  function setState(nextDetail: NetworkStateDetail) {
    if (nextDetail === detail) return;
    const wasOnline = detail !== 'Offline';
    detail = nextDetail;
    const isOnline = detail !== 'Offline';
    log?.info({ detail }, 'network: state changed');
    bus.emit('net:state-changed', detail);
    if (wasOnline !== isOnline) {
      online = isOnline;
      bus.emit('net:online-changed', online);
    }
  }

  async function probe(): Promise<void> {
    // Fast path — if Electron says we're hard-offline, bail without hitting
    // the network. This keeps airplane-mode detection ~instant.
    if (eNet && !eNet.isOnline()) {
      strikes = 3;
      setState('Offline');
      return;
    }
    try {
      await deps.api.health({ timeoutMs: probeTimeoutMs });
      strikes = 0;
      setState('Online');
    } catch (err) {
      strikes++;
      if (strikes >= 3) setState('Offline');
      else setState('Degraded');
      log?.debug(
        { strikes, err: err instanceof Error ? err.message : String(err) },
        'network: probe failed',
      );
    }
  }

  function start(): void {
    if (running) return;
    running = true;
    // Kick an immediate probe so sync starts from a real signal.
    void probe();
    handle = setInterval(() => void probe(), probeIntervalMs);
    if (handle.unref) handle.unref();
    log?.info({ probeIntervalMs }, 'network-monitor started');
  }

  function stop(): void {
    if (!running) return;
    running = false;
    if (handle) {
      clearInterval(handle);
      handle = null;
    }
    log?.info('network-monitor stopped');
  }

  return {
    start,
    stop,
    get online(): boolean {
      return online;
    },
    get detail(): NetworkStateDetail {
      return detail;
    },
    /** Forces an immediate probe; returns the resolved state. */
    async probeNow(): Promise<NetworkStateDetail> {
      await probe();
      return detail;
    },
    /** Test helper: push a synthetic online/offline state. */
    _setForTest(nextDetail: NetworkStateDetail): void {
      setState(nextDetail);
    },
    on: bus.on.bind(bus),
    off: bus.off.bind(bus),
  };
}
