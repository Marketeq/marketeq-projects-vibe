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
import type {
  IpcErrorResult,
  TodayStatsDTO,
  TodayTaskStatDTO,
} from '../../../shared/ipc-contracts';
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

  // Totals for one local-day window from closed sessions, optionally folding
  // in the live, not-yet-closed session (correct in any FSM state —
  // Running/Paused/OnBreak* — since elapsed only grows while a billable
  // segment is open). Earnings use each contract's own rate.
  const dayTotals = (userId: string, startAt: number, endAt: number, includeLive: boolean) => {
    const byContract = new Map<string, number>(
      deps.sessionRepo
        .sumBillableSecondsByContract({ userId, startAt, endAt })
        .map((r) => [r.contract_id, r.total_billable_seconds]),
    );

    // Per-task totals, so a relaunch restores each task's time and range
    // instead of showing every task as "Not started".
    const byTask = new Map<string, Omit<TodayTaskStatDTO, 'capSeconds'>>();
    for (const r of deps.sessionRepo.sumBillableSecondsByTask({ userId, startAt, endAt })) {
      byTask.set(r.task_id, {
        contractId: r.contract_id,
        taskId: r.task_id,
        trackedSeconds: r.total_billable_seconds,
        firstStartedAt: r.first_started_at,
        lastEndedAt: r.last_ended_at,
        liveSeconds: 0,
      });
    }

    if (includeLive) {
      const snap = deps.timer.getSnapshot();
      if (snap.activeSessionId && snap.pickedContract) {
        const active = deps.sessionRepo.findById(snap.activeSessionId);
        if (active && active.started_at >= startAt && active.started_at < endAt) {
          const { contractId, taskId } = snap.pickedContract;
          byContract.set(contractId, (byContract.get(contractId) ?? 0) + snap.elapsedSec);
          const t = byTask.get(taskId);
          byTask.set(taskId, {
            contractId,
            taskId,
            trackedSeconds: (t?.trackedSeconds ?? 0) + snap.elapsedSec,
            firstStartedAt: Math.min(t?.firstStartedAt ?? active.started_at, active.started_at),
            lastEndedAt: null,
            liveSeconds: snap.elapsedSec,
          });
        }
      }
    }

    let trackedSeconds = 0;
    let earnedCents = 0;
    for (const [contractId, seconds] of byContract) {
      const contract = deps.contractRepo.findById(contractId);
      if (!contract) {
        log?.warn({ contractId }, 'day-stats: contract not mirrored locally, skipping');
        continue;
      }
      trackedSeconds += seconds;
      earnedCents += Math.round((seconds * contract.rate_minor) / 3600);
    }
    // PMCM-829: each task's progress bar measures against its contract's
    // cap (daily if set, else weekly) instead of a fixed 8 h.
    const tasks = [...byTask.values()].map((t) => {
      const contract = deps.contractRepo.findById(t.contractId);
      return {
        ...t,
        capSeconds: contract?.daily_cap_seconds ?? contract?.weekly_cap_seconds ?? null,
      };
    });
    return { trackedSeconds, earnedCents, tasks };
  };

  ipcMain.handle(IPC.statsGetToday, (): TodayStatsDTO | IpcErrorResult => {
    try {
      const userId = deps.getUserId();
      if (!userId) return ipcError('ERR_STATS_NO_USER', 'No authenticated user');

      const startAt = startOfLocalDay();
      const endAt = endOfLocalDay();
      const today = dayTotals(userId, startAt, endAt, true);
      // The previous local day (DST-safe: derived from today's local midnight).
      const yesterdayStart = startOfLocalDay(new Date(startAt - 1));
      const yesterday = dayTotals(userId, yesterdayStart, startAt, false);

      // The task to pre-select on relaunch: the live one, else the most
      // recent session's task.
      const picked = deps.timer.getSnapshot().pickedContract;
      const latestRow = picked ? null : deps.sessionRepo.findLatest(userId);
      const lastTask = picked
        ? { contractId: picked.contractId, taskId: picked.taskId }
        : latestRow
          ? { contractId: latestRow.contract_id, taskId: latestRow.task_id }
          : null;

      return {
        trackedSeconds: today.trackedSeconds,
        earnedCents: today.earnedCents,
        currency: 'USD',
        goalSeconds: GOAL_SECONDS,
        tasks: today.tasks,
        lastTask,
        yesterday,
      };
    } catch (err) {
      log?.error({ err }, 'stats:get-today failed');
      return ipcError('ERR_STATS_TODAY', err instanceof Error ? err.message : String(err));
    }
  });

  return () => ipcMain.removeHandler(IPC.statsGetToday);
}
