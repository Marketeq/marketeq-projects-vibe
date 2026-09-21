// src/main/services/stats/register-ipc.ts
//
// "Today" summary IPC — a read-only aggregate over local SQLite
// (session.billable_seconds x contract.rate_minor), plus the live
// in-progress session's elapsed seconds. Entirely offline; no backend
// call. See the "Today's Hours + Earnings" plan for why this is computed
// locally instead of calling the backend's earnings-summary endpoint.

import { ipcMain } from 'electron';
import type { Logger } from 'pino';
import { IPC } from '../../../shared/ipc-contracts';
import type { IpcErrorResult, TodayStatsDTO } from '../../../shared/ipc-contracts';
import type { SessionRepo } from '../../db/repos/session.repo';
import type { ContractRepo } from '../../db/repos/contract.repo';
import type { TimerService } from '../timer/timer-service';

const GOAL_SECONDS = 8 * 3600;

function ipcError(code: string, message: string): IpcErrorResult {
  return { ok: false, code, message };
}

export function startOfLocalDay(now: Date = new Date()): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function endOfLocalDay(now: Date = new Date()): number {
  return startOfLocalDay(now) + 24 * 60 * 60 * 1000;
}

export interface StatsIpcDeps {
  logger?: Logger;
  sessionRepo: SessionRepo;
  contractRepo: ContractRepo;
  timer: TimerService;
  getUserId: () => string | null;
}

export function registerStatsIpc(deps: StatsIpcDeps): () => void {
  const log = deps.logger?.child({ svc: 'stats-ipc' });

  ipcMain.handle(IPC.statsGetToday, (): TodayStatsDTO | IpcErrorResult => {
    try {
      const userId = deps.getUserId();
      if (!userId) return ipcError('ERR_STATS_NO_USER', 'No authenticated user');

      const startAt = startOfLocalDay();
      const endAt = endOfLocalDay();

      const closed = deps.sessionRepo.sumBillableSecondsByContract({ userId, startAt, endAt });
      const byContract = new Map<string, number>(
        closed.map((r) => [r.contract_id, r.total_billable_seconds]),
      );

      // Fold in the live, not-yet-closed session's elapsed seconds (correct
      // in any FSM state — Running/Paused/OnBreak* — since it only grows
      // while a billable segment is open).
      const snap = deps.timer.getSnapshot();
      if (snap.activeSessionId && snap.pickedContract) {
        const active = deps.sessionRepo.findById(snap.activeSessionId);
        if (active && active.started_at >= startAt && active.started_at < endAt) {
          const prev = byContract.get(snap.pickedContract.contractId) ?? 0;
          byContract.set(snap.pickedContract.contractId, prev + snap.elapsedSec);
        }
      }

      let trackedSeconds = 0;
      let earnedCents = 0;
      for (const [contractId, seconds] of byContract) {
        const contract = deps.contractRepo.findById(contractId);
        if (!contract) {
          log?.warn({ contractId }, 'today-stats: contract not mirrored locally, skipping');
          continue;
        }
        trackedSeconds += seconds;
        earnedCents += Math.round((seconds * contract.rate_minor) / 3600);
      }

      return { trackedSeconds, earnedCents, currency: 'USD', goalSeconds: GOAL_SECONDS };
    } catch (err) {
      log?.error({ err }, 'stats:get-today failed');
      return ipcError('ERR_STATS_TODAY', err instanceof Error ? err.message : String(err));
    }
  });

  return () => ipcMain.removeHandler(IPC.statsGetToday);
}
