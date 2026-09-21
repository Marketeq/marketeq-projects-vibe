// src/main/services/contracts/register-ipc.ts
// IPC handler that fetches contracts from the backend API for the
// authenticated user. The desktop app must always get contracts from
// Supabase (via the backend), never from local SQLite.
//
// After fetching, contracts are mirrored into the local SQLite contract
// and task tables so that foreign key constraints are satisfied when the
// timer service creates a session row.

import { ipcMain } from 'electron';
import type { Logger } from 'pino';
import { IPC } from '../../../shared/ipc-contracts';
import type { BackendContract, BackendTask } from '../../../shared/ipc-contracts';
import type { ContractRepo } from '../../db/repos/contract.repo';
import type { TaskRepo } from '../../db/repos/task.repo';

export interface ContractsIpcDeps {
  logger?: Logger;
  getAccessToken: () => string | null;
  getUserId: () => string | null;
  apiBaseUrl: string;
  contractRepo?: ContractRepo;
  taskRepo?: TaskRepo;
}

export function registerContractsIpc(deps: ContractsIpcDeps): () => void {
  const log = deps.logger?.child({ svc: 'contracts-ipc' });

  // Authenticated fetch of a contract's tasks — the token is required,
  // the backend route is not public (doc 15: the token only lives here,
  // in the main process; doc 21: renderer reaches this data through the
  // bridge, same as contracts). Shared by the SQLite mirror below and the
  // contracts:get-tasks handler so there's one authenticated call site,
  // not two.
  const fetchTasksForContract = async (
    contractId: string,
    token: string,
  ): Promise<BackendTask[]> => {
    const res = await fetch(
      `${deps.apiBaseUrl}/tasks/contract/${encodeURIComponent(contractId)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    );
    if (!res.ok) {
      log?.warn({ contractId, status: res.status }, 'failed to fetch tasks for contract');
      return [];
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  };

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

    // Mirror each contract and its real tasks into local SQLite so the
    // session table's FK constraints are satisfied.
    if (deps.contractRepo && deps.taskRepo) {
      const now = Date.now();
      for (const c of contracts) {
        try {
          deps.contractRepo.upsert({
            id: c.id,
            name: c.title || 'Untitled',
            client_name: c.clientId || 'unknown',
            status: c.status === 'active' ? 'active' : c.status === 'paused' ? 'paused' : 'ended',
            currency: 'USD',
            rate_minor: Math.round((Number(c.rate) || 0) * 100),
            daily_cap_seconds: null,
            weekly_cap_seconds: null,
            paid_break_allowance_seconds: 0,
            screenshot_interval_seconds: 60,
            mirrored_at: now,
          });
          // Mirror only the contract's real tasks from TTS into local SQLite.
          // No synthetic "task-<id>" placeholder — a session must reference a
          // real task, and an unknown id should fail fast, not be made valid.
          try {
            const tasks = await fetchTasksForContract(c.id, token);
            for (const t of tasks) {
              deps.taskRepo.upsert({
                id: t.id,
                contract_id: c.id,
                name: t.name || 'Untitled task',
                archived: t.archived ? 1 : 0,
                mirrored_at: now,
              });
            }
          } catch { /* TTS unavailable — real tasks sync on the next fetch */ }
        } catch (err) {
          log?.warn({ err, contractId: c.id }, 'failed to mirror contract to local db');
        }
      }
      log?.info({ count: contracts.length }, 'contracts mirrored to local db');
    }

    return contracts;
  };

  const handleGetTasks = async (
    _evt: unknown,
    contractId: string,
  ): Promise<BackendTask[]> => {
    const token = deps.getAccessToken();
    if (!token) {
      log?.warn('contracts:get-tasks called without auth');
      return [];
    }
    return fetchTasksForContract(contractId, token);
  };

  ipcMain.handle(IPC.contractsGetMine, handle);
  ipcMain.handle(IPC.contractsGetTasks, handleGetTasks);

  return () => {
    ipcMain.removeHandler(IPC.contractsGetMine);
    ipcMain.removeHandler(IPC.contractsGetTasks);
  };
}
