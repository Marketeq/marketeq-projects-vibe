// src/main/ipc/crash-recovery.ts
//
// IPC for the crash recovery prompt (DTT-US-131/132/133). The renderer asks
// on load whether there is an unfinished session to resolve, then sends the
// user's Recover / Discard choice. See services/timer/crash-recovery.ts.

import { ipcMain } from 'electron';
import { IPC } from '../../shared/ipc-contracts';
import type { CrashRecoveryDTO, IpcErrorResult } from '../../shared/ipc-contracts';
import type { CrashRecovery } from '../services/timer/crash-recovery';

function ipcError(code: string, message: string): IpcErrorResult {
  return { ok: false, code, message };
}

export function registerCrashRecoveryIpc(crashRecovery: CrashRecovery): () => void {
  ipcMain.handle(IPC.crashRecoveryGet, (): CrashRecoveryDTO | null | IpcErrorResult => {
    try {
      return crashRecovery.getPending();
    } catch (err) {
      return ipcError('ERR_CRASH_RECOVERY_GET', err instanceof Error ? err.message : String(err));
    }
  });
  ipcMain.handle(IPC.crashRecoveryRecover, async (): Promise<boolean | IpcErrorResult> => {
    try {
      return await crashRecovery.recover();
    } catch (err) {
      return ipcError('ERR_CRASH_RECOVERY_RECOVER', err instanceof Error ? err.message : String(err));
    }
  });
  ipcMain.handle(IPC.crashRecoveryDiscard, (): boolean | IpcErrorResult => {
    try {
      return crashRecovery.discard();
    } catch (err) {
      return ipcError('ERR_CRASH_RECOVERY_DISCARD', err instanceof Error ? err.message : String(err));
    }
  });
  return () => {
    ipcMain.removeHandler(IPC.crashRecoveryGet);
    ipcMain.removeHandler(IPC.crashRecoveryRecover);
    ipcMain.removeHandler(IPC.crashRecoveryDiscard);
  };
}
