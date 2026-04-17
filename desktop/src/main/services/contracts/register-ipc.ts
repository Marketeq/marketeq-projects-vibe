// src/main/services/contracts/register-ipc.ts
// IPC handler that fetches contracts from the backend API for the
// authenticated user. The desktop app must always get contracts from
// Supabase (via the backend), never from local SQLite.

import { ipcMain } from 'electron';
import type { Logger } from 'pino';
import { IPC } from '../../../shared/ipc-contracts';
import type { BackendContract } from '../../../shared/ipc-contracts';

export interface ContractsIpcDeps {
  logger?: Logger;
  getAccessToken: () => string | null;
  getUserId: () => string | null;
  apiBaseUrl: string;
}

export function registerContractsIpc(deps: ContractsIpcDeps): () => void {
  const log = deps.logger?.child({ svc: 'contracts-ipc' });

  const handle = async (): Promise<BackendContract[]> => {
    const token = deps.getAccessToken();
    const userId = deps.getUserId();

    if (!token || !userId) {
      log?.warn('contracts:get-mine called without auth');
      return [];
    }

    const url = `${deps.apiBaseUrl}/contracts/talent/${encodeURIComponent(userId)}`;
    log?.info({ url }, 'fetching contracts from backend');

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      log?.error({ status: res.status, body }, 'failed to fetch contracts');
      throw new Error(`Failed to fetch contracts: ${res.status}`);
    }

    const data = await res.json();
    // The backend returns an array of Contract entities
    const contracts: BackendContract[] = Array.isArray(data) ? data : [];
    log?.info({ count: contracts.length }, 'contracts fetched');
    return contracts;
  };

  ipcMain.handle(IPC.contractsGetMine, handle);

  return () => {
    ipcMain.removeHandler(IPC.contractsGetMine);
  };
}
