// src/main/ipc/timer.ts
//
// IPC handlers for Phase 2 timer commands + broadcast plumbing.
// The TimerService owns all state; this file only translates between the
// renderer wire protocol and the service API.

import type { BrowserWindow, IpcMain, WebContents } from 'electron';
import { IPC } from '../../shared/ipc-contracts';
import type {
  IdleResolveArgs,
  TimerContractOptionDTO,
  TimerBreakStartArgs,
  TimerSnapshotDTO,
  TimerStartArgs,
  TimerStopArgs,
  TimerTaskOptionDTO,
} from '../../shared/ipc-contracts';
import type { TimerService } from '../services/timer/timer-service';
import type { BreakKind, IdleResolution, SessionEndReason } from '../../shared/types';

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
  // ---------- commands ------------------------------------------------------
  ipcMain.handle(IPC.timerStart, async (_evt, args: TimerStartArgs) => {
    const snap = await timer.startTimer(args);
    return toDTO(snap);
  });
  ipcMain.handle(IPC.timerPause, async () => toDTO(await timer.pauseTimer()));
  ipcMain.handle(IPC.timerResume, async () => toDTO(await timer.resumeTimer()));
  ipcMain.handle(IPC.timerStop, async (_evt, args?: TimerStopArgs) => {
    const reason: SessionEndReason = args?.reason ?? 'user_stop';
    return toDTO(await timer.stopTimer(reason));
  });
  ipcMain.handle(IPC.timerBreakStart, async (_evt, args: TimerBreakStartArgs) => {
    const kind: BreakKind | 'custom' = args.kind;
    return toDTO(
      await timer.startBreak({ kind, durationSec: args.durationSec }),
    );
  });
  ipcMain.handle(IPC.timerBreakEnd, async () => toDTO(await timer.endBreak()));
  ipcMain.handle(IPC.timerGetState, () => toDTO(timer.getSnapshot()));
  ipcMain.handle(IPC.timerListContracts, (): TimerContractOptionDTO[] =>
    timer.listStartContracts(),
  );
  ipcMain.handle(
    IPC.timerListTasks,
    (_evt, contractId: string): TimerTaskOptionDTO[] =>
      timer.listStartTasks(contractId),
  );
  ipcMain.handle(IPC.idleResolve, async (_evt, args: IdleResolveArgs) => {
    const resolution: IdleResolution = args.resolution;
    return toDTO(await timer.resolveIdle(resolution));
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
    ipcMain.removeHandler(IPC.timerListContracts);
    ipcMain.removeHandler(IPC.timerListTasks);
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
