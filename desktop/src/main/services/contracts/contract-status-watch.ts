// src/main/services/contracts/contract-status-watch.ts
//
// PMCM-831 (DTT-US-163, 187–192): stop tracking when the contract being
// tracked stops being trackable — paused, disputed, ended — instead of
// billing against it until the talent notices.
//
// The spec'd signal is the Ably `contract.<id>` statusChanged event, but
// nothing on the backend publishes it yet (PMCM-543). Until it does, this
// polls the contract's status while a session is open. A failed check
// (offline, signed out) does nothing — only a real non-active status stops
// the timer.

import type { Logger } from 'pino';

/** Backend statuses a talent may keep tracking time against. */
const TRACKABLE_STATUSES = new Set(['active']);

export interface ContractStatusWatchDeps {
  /** The contract of the open session, or null when nothing is being tracked. */
  getTrackedContractId: () => string | null;
  /** Current backend status, lower-case; null when it couldn't be read. */
  fetchStatus: (contractId: string) => Promise<string | null>;
  /** Called once when the tracked contract is found non-trackable. */
  onNotTrackable: (contractId: string, status: string) => Promise<void> | void;
  intervalMs?: number;
  logger?: Logger;
}

export function createContractStatusWatch(deps: ContractStatusWatchDeps) {
  const log = deps.logger?.child({ svc: 'contract-status-watch' });
  const intervalMs = deps.intervalMs ?? 60_000;
  let handle: NodeJS.Timeout | null = null;
  let checking = false;

  async function checkNow(): Promise<void> {
    if (checking) return;
    const contractId = deps.getTrackedContractId();
    if (!contractId) return;
    checking = true;
    try {
      const status = await deps.fetchStatus(contractId);
      // The session may have ended while the request was in flight.
      if (!status || deps.getTrackedContractId() !== contractId) return;
      if (TRACKABLE_STATUSES.has(status)) return;
      log?.warn({ contractId, status }, 'tracked contract is no longer active — stopping the timer');
      await deps.onNotTrackable(contractId, status);
    } catch (err) {
      log?.warn({ err, contractId }, 'contract status watch failed');
    } finally {
      checking = false;
    }
  }

  function start(): void {
    if (handle) return;
    handle = setInterval(() => void checkNow(), intervalMs);
  }

  function stop(): void {
    if (handle) clearInterval(handle);
    handle = null;
  }

  return { start, stop, checkNow };
}

export type ContractStatusWatch = ReturnType<typeof createContractStatusWatch>;
