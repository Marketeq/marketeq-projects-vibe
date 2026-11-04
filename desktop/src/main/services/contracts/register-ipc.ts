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
import type {
  BackendContract,
  BackendTask,
  CreateManualTimeInput,
  CreateManualTimeResult,
  CreateTaskInput,
} from '../../../shared/ipc-contracts';
import type { ContractRepo } from '../../db/repos/contract.repo';
import type { TaskRepo } from '../../db/repos/task.repo';

export interface ContractsIpcDeps {
  logger?: Logger;
  getAccessToken: () => string | null;
  getUserId: () => string | null;
  apiBaseUrl: string;
  contractRepo?: ContractRepo;
  taskRepo?: TaskRepo;
  /** Silent refresh on a 401 (auth-service handleUnauthorized); true = new token ready. */
  onUnauthorized?: () => Promise<boolean>;
}

// Every backend call goes through here. The access token is short-lived
// (15 min), so a 401 triggers one silent refresh and one retry with the
// new token — same contract as the sync api-client (doc 15 §7). Without
// this, contracts and tasks stopped loading once the token expired.
function createAuthedFetch(deps: ContractsIpcDeps, log: Logger | undefined) {
  return async (
    url: string,
    init: { method: string; body?: string } = { method: 'GET' },
  ): Promise<Response> => {
    const send = (token: string | null) =>
      fetch(url, {
        ...init,
        headers: {
          Authorization: `Bearer ${token ?? ''}`,
          'Content-Type': 'application/json',
        },
      });
    const res = await send(deps.getAccessToken());
    if (res.status !== 401 || !deps.onUnauthorized) return res;
    let refreshed = false;
    try {
      refreshed = await deps.onUnauthorized();
    } catch (err) {
      log?.warn({ err }, 'token refresh threw');
    }
    if (!refreshed) return res;
    log?.debug({ url }, '401 — refreshed, retrying once');
    return send(deps.getAccessToken());
  };
}

/**
 * PMCM-831: the current backend status of one of the talent's contracts
 * ("active", "paused", "disputed", ...), or null when it can't be read
 * (offline, signed out, not found) — callers must not act on null.
 */
export function createContractStatusFetcher(deps: ContractsIpcDeps) {
  const log = deps.logger?.child({ svc: 'contract-status' });
  const authedFetch = createAuthedFetch(deps, log);
  return async (contractId: string): Promise<string | null> => {
    const userId = deps.getUserId();
    if (!deps.getAccessToken() || !userId) return null;
    try {
      const res = await authedFetch(
        `${deps.apiBaseUrl}/contracts/talent/${encodeURIComponent(userId)}`,
      );
      if (!res.ok) return null;
      const data = await res.json();
      const match = Array.isArray(data)
        ? (data as BackendContract[]).find((c) => c.id === contractId)
        : undefined;
      return typeof match?.status === 'string' ? match.status.toLowerCase() : null;
    } catch (err) {
      log?.debug({ err, contractId }, 'contract status check failed');
      return null;
    }
  };
}

export function registerContractsIpc(deps: ContractsIpcDeps): () => void {
  const log = deps.logger?.child({ svc: 'contracts-ipc' });
  const authedFetch = createAuthedFetch(deps, log);

  // Authenticated fetch of a contract's tasks — the token is required,
  // the backend route is not public (doc 15: the token only lives here,
  // in the main process; doc 21: renderer reaches this data through the
  // bridge, same as contracts). Shared by the SQLite mirror below and the
  // contracts:get-tasks handler so there's one authenticated call site,
  // not two.
  const fetchTasksForContract = async (
    contractId: string,
  ): Promise<BackendTask[]> => {
    const res = await authedFetch(
      `${deps.apiBaseUrl}/tasks/contract/${encodeURIComponent(contractId)}`,
    );
    if (!res.ok) {
      log?.warn({ contractId, status: res.status }, 'failed to fetch tasks for contract');
      return [];
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  };

  // The client's picture for the contract card. A contract only carries the
  // client's id and name, so this reads `avatarUrl` from the same
  // `GET /users/:id` profile the web's UserAPI.getProfile uses. The client
  // profile page shows that field as the company logo, so it already covers
  // "company logo, else avatar". Any failure is null — the card falls back
  // to its letter, and the contract list still loads.
  const fetchClientAvatarUrl = async (clientId: string): Promise<string | null> => {
    try {
      const res = await authedFetch(
        `${deps.apiBaseUrl}/users/${encodeURIComponent(clientId)}`,
      );
      if (!res.ok) {
        log?.warn({ clientId, status: res.status }, 'failed to fetch client avatar');
        return null;
      }
      const data = await res.json();
      return typeof data?.avatarUrl === 'string' && data.avatarUrl ? data.avatarUrl : null;
    } catch (err) {
      log?.warn({ err, clientId }, 'failed to fetch client avatar');
      return null;
    }
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

    const res = await authedFetch(url);

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      log?.error({ status: res.status, body }, 'failed to fetch contracts');
      throw new Error(`Failed to fetch contracts: ${res.status}`);
    }

    const data = await res.json();
    // The backend returns an array of Contract entities
    const contracts: BackendContract[] = Array.isArray(data) ? data : [];
    log?.info({ count: contracts.length }, 'contracts fetched');

    // One lookup per client, not per contract — a client can hire on several.
    const clientIds = [...new Set(contracts.map((c) => c.clientId).filter(Boolean))];
    const avatarByClient = new Map(
      await Promise.all(
        clientIds.map(async (id) => [id, await fetchClientAvatarUrl(id)] as const),
      ),
    );
    for (const c of contracts) {
      c.clientAvatarUrl = avatarByClient.get(c.clientId) ?? null;
    }

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
            currency: /^[A-Z]{3}$/.test(c.currencyCode ?? '') ? c.currencyCode! : 'USD',
            rate_minor: Math.round((Number(c.rate) || 0) * 100),
            daily_cap_seconds: null,
            weekly_cap_seconds:
              Number(c.weeklyCapHours) > 0 ? Math.round(Number(c.weeklyCapHours) * 3600) : null,
            paid_break_allowance_seconds: 0,
            screenshot_interval_seconds: 60,
            mirrored_at: now,
          });
          // Mirror only the contract's real tasks from TTS into local SQLite.
          // No synthetic "task-<id>" placeholder — a session must reference a
          // real task, and an unknown id should fail fast, not be made valid.
          try {
            const tasks = await fetchTasksForContract(c.id);
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
    return fetchTasksForContract(contractId);
  };

  // Create a real task in TTS, then mirror it into local SQLite right away
  // so the timer can start a session against it — the session row's FK
  // needs the task to exist locally, and a renderer-only placeholder id
  // would never match anything on the backend.
  const handleCreateTask = async (
    _evt: unknown,
    input: CreateTaskInput,
  ): Promise<BackendTask> => {
    const token = deps.getAccessToken();
    const userId = deps.getUserId();
    if (!token || !userId) {
      log?.warn('contracts:create-task called without auth');
      throw new Error('Not signed in');
    }
    const name = input?.name?.trim();
    if (!input?.contractId || !name) {
      throw new Error('A contract and a task name are required');
    }

    const res = await authedFetch(`${deps.apiBaseUrl}/tasks`, {
      method: 'POST',
      body: JSON.stringify({ contractId: input.contractId, name, createdBy: userId }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      log?.error({ status: res.status, body, contractId: input.contractId }, 'failed to create task');
      throw new Error(`Failed to create task: ${res.status}`);
    }

    const task = (await res.json()) as BackendTask;
    log?.info({ taskId: task.id, contractId: task.contractId }, 'task created');

    if (deps.taskRepo) {
      try {
        deps.taskRepo.upsert({
          id: task.id,
          contract_id: task.contractId,
          name: task.name,
          archived: task.archived ? 1 : 0,
          mirrored_at: Date.now(),
        });
      } catch (err) {
        log?.warn({ err, taskId: task.id }, 'failed to mirror new task to local db');
      }
    }
    return task;
  };

  // Manual time (US-087–092): submit for client review. Validation failures
  // come back as { ok: false } with the server's message so the form can
  // show it inline — including the soft overlap warning, which the user can
  // confirm and resubmit with confirmOverlap.
  const handleCreateManualTime = async (
    _evt: unknown,
    input: CreateManualTimeInput,
  ): Promise<CreateManualTimeResult> => {
    if (!deps.getAccessToken()) {
      return { ok: false, message: 'You are signed out. Sign in again to submit time.' };
    }
    let res: Response;
    try {
      res = await authedFetch(`${deps.apiBaseUrl}/manual-time`, {
        method: 'POST',
        body: JSON.stringify({
          contractId: input.contractId,
          taskId: input.taskId,
          startTime: input.startTime,
          endTime: input.endTime,
          notes: input.notes,
          confirmOverlap: input.confirmOverlap,
        }),
      });
    } catch (err) {
      log?.warn({ err }, 'manual time submit failed (network)');
      return { ok: false, message: "We couldn't reach the server. Check your connection and try again." };
    }
    const body = (await res.json().catch(() => ({}))) as {
      id?: string;
      message?: string | string[];
      errorCode?: string;
    };
    if (!res.ok) {
      const message = Array.isArray(body.message) ? body.message[0] : body.message;
      log?.warn({ status: res.status, code: body.errorCode }, 'manual time rejected');
      return {
        ok: false,
        code: body.errorCode,
        message: message || `We couldn't submit this time (${res.status}). Please try again.`,
      };
    }
    log?.info({ id: body.id, contractId: input.contractId }, 'manual time submitted');
    return { ok: true, id: body.id ?? '' };
  };

  ipcMain.handle(IPC.contractsGetMine, handle);
  ipcMain.handle(IPC.contractsGetTasks, handleGetTasks);
  ipcMain.handle(IPC.contractsCreateTask, handleCreateTask);
  ipcMain.handle(IPC.manualTimeCreate, handleCreateManualTime);

  return () => {
    ipcMain.removeHandler(IPC.contractsGetMine);
    ipcMain.removeHandler(IPC.contractsGetTasks);
    ipcMain.removeHandler(IPC.contractsCreateTask);
    ipcMain.removeHandler(IPC.manualTimeCreate);
  };
}
