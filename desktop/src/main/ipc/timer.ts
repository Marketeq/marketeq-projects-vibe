// src/main/ipc/timer.ts
//
// IPC handlers for Phase 2 timer commands + broadcast plumbing.
// The TimerService owns all state; this file only translates between the
// renderer wire protocol and the service API.

import type { BrowserWindow, IpcMain, WebContents } from 'electron';
import { IPC } from '../../shared/ipc-contracts';
import type {
  IdleResolveArgs,
  IpcErrorResult,
  TimerBreakStartArgs,
  TimerSnapshotDTO,
  TimerStartArgs,
  TimerStopArgs,
} from '../../shared/ipc-contracts';
import {
  TimerStartArgsSchema,
  TimerStopArgsSchema,
  TimerBreakStartArgsSchema,
  IdleResolveArgsSchema,
} from '../../shared/ipc-contracts';
import type { TimerService } from '../services/timer/timer-service';
import type { BreakKind, IdleResolution, SessionEndReason } from '../../shared/types';

function ipcError(code: string, message: string): IpcErrorResult {
  return { ok: false, code, message };
}

function toDTO(snap: ReturnType<TimerService['getSnapshot']>): TimerSnapshotDTO {
  return {
    state: snap.state,
    activeSessionId: snap.activeSessionId,
    pickedContract: snap.pickedContract,
    elapsedSec: snap.elapsedSec,
    runningSec: snap.runningSec,
    breakRemainingSec: snap.breakRemainingSec,
    isOnBreak: snap.isOnBreak,
    pendingIdle: snap.pendingIdle,
    updatedAt: snap.updatedAt,
  };
}

export function registerTimerIpc(
  ipcMain: IpcMain,
  timer: TimerService,
  getBroadcastTargets: () => readonly WebContents[],
): () => void {
  // ---------- idempotency guard (doc 05 XCUT.01 — 250ms dedup window) ------
  let lastCommandAt = 0;
  let lastCommandType = '';
  const DEDUP_WINDOW_MS = 250;

  function isDuplicate(commandType: string): boolean {
    const now = Date.now();
    if (commandType === lastCommandType && now - lastCommandAt < DEDUP_WINDOW_MS) {
      return true;
    }
    lastCommandAt = now;
    lastCommandType = commandType;
    return false;
  }

  // ---------- commands (all validated via zod) --------------------------------
  ipcMain.handle(IPC.timerStart, async (_evt, args: unknown) => {
    const parsed = TimerStartArgsSchema.safeParse(args);
    if (!parsed.success) {
      return ipcError('ERR_VAL_TIMER_START', parsed.error.issues[0]?.message ?? 'Invalid timer start args');
    }
    if (isDuplicate('timerStart')) return toDTO(timer.getSnapshot());
    try {
      const snap = await timer.startTimer(parsed.data);
      return toDTO(snap);
    } catch (err) {
      return ipcError('ERR_TIMER_START', err instanceof Error ? err.message : String(err));
    }
  });
  ipcMain.handle(IPC.timerPause, async () => {
    if (isDuplicate('timerPause')) return toDTO(timer.getSnapshot());
    try {
      return toDTO(await timer.pauseTimer());
    } catch (err) {
      return ipcError('ERR_TIMER_PAUSE', err instanceof Error ? err.message : String(err));
    }
  });
  ipcMain.handle(IPC.timerResume, async () => {
    if (isDuplicate('timerResume')) return toDTO(timer.getSnapshot());
    try {
      return toDTO(await timer.resumeTimer());
    } catch (err) {
      return ipcError('ERR_TIMER_RESUME', err instanceof Error ? err.message : String(err));
    }
  });
  ipcMain.handle(IPC.timerStop, async (_evt, args?: unknown) => {
    const parsed = TimerStopArgsSchema.safeParse(args ?? {});
    if (!parsed.success) {
      return ipcError('ERR_VAL_TIMER_STOP', parsed.error.issues[0]?.message ?? 'Invalid timer stop args');
    }
    if (isDuplicate('timerStop')) return toDTO(timer.getSnapshot());
    try {
      const reason: SessionEndReason = parsed.data.reason ?? 'user_stop';
      return toDTO(await timer.stopTimer(reason));
    } catch (err) {
      return ipcError('ERR_TIMER_STOP', err instanceof Error ? err.message : String(err));
    }
  });
  ipcMain.handle(IPC.timerBreakStart, async (_evt, args: unknown) => {
    const parsed = TimerBreakStartArgsSchema.safeParse(args);
    if (!parsed.success) {
      return ipcError('ERR_VAL_BREAK_START', parsed.error.issues[0]?.message ?? 'Invalid break start args');
    }
    if (isDuplicate('timerBreakStart')) return toDTO(timer.getSnapshot());
    try {
      const kind: BreakKind | 'custom' = parsed.data.kind;
      return toDTO(
        await timer.startBreak({ kind, durationSec: parsed.data.durationSec }),
      );
    } catch (err) {
      return ipcError('ERR_BREAK_START', err instanceof Error ? err.message : String(err));
    }
  });
  ipcMain.handle(IPC.timerBreakEnd, async () => {
    if (isDuplicate('timerBreakEnd')) return toDTO(timer.getSnapshot());
    try {
      return toDTO(await timer.endBreak());
    } catch (err) {
      return ipcError('ERR_BREAK_END', err instanceof Error ? err.message : String(err));
    }
  });
  ipcMain.handle(IPC.timerGetState, () => {
    try {
      return toDTO(timer.getSnapshot());
    } catch (err) {
      return ipcError('ERR_TIMER_STATE', err instanceof Error ? err.message : String(err));
    }
  });
  ipcMain.handle(IPC.idleResolve, async (_evt, args: unknown) => {
    const parsed = IdleResolveArgsSchema.safeParse(args);
    if (!parsed.success) {
      return ipcError('ERR_VAL_IDLE_RESOLVE', parsed.error.issues[0]?.message ?? 'Invalid idle resolve args');
    }
    if (isDuplicate('idleResolve')) return toDTO(timer.getSnapshot());
    try {
      const resolution: IdleResolution = parsed.data.resolution;
      return toDTO(await timer.resolveIdle(resolution));
    } catch (err) {
      return ipcError('ERR_IDLE_RESOLVE', err instanceof Error ? err.message : String(err));
    }
  });

  // ---------- broadcast plumbing -------------------------------------------
  const detach = timer.attachEventBus((evt) => {
    for (const wc of getBroadcastTargets()) {
      if (!wc.isDestroyed()) wc.send(evt.channel, evt.payload);
    }
  });

  return () => {
    detach();
    ipcMain.removeHandler(IPC.timerStart);
    ipcMain.removeHandler(IPC.timerPause);
    ipcMain.removeHandler(IPC.timerResume);
    ipcMain.removeHandler(IPC.timerStop);
    ipcMain.removeHandler(IPC.timerBreakStart);
    ipcMain.removeHandler(IPC.timerBreakEnd);
    ipcMain.removeHandler(IPC.timerGetState);
    ipcMain.removeHandler(IPC.idleResolve);
  };
}

export function collectBroadcastTargets(): WebContents[] {
  // Imported lazily to avoid requiring electron at module-load time during tests.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { BrowserWindow } = require('electron') as {
    BrowserWindow: typeof import('electron').BrowserWindow;
  };
  return BrowserWindow.getAllWindows()
    .map((w: BrowserWindow) => w.webContents)
    .filter((wc): wc is WebContents => wc != null);
}
