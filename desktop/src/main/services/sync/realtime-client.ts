// src/main/services/sync/realtime-client.ts
//
// Phase 4 — Ably realtime client per doc 14.
//
// The desktop subscribes to four channels:
//   * user.<userId>       — erasure, forcedSignOut, profileUpdated
//   * session.<sessionId> — takenOver, disputeOpened/Resolved, sessionApproved
//   * contract.<id>       — statusChanged, rateUpdated, capUpdated, task*
//   * device.<deviceId>   — forceUpdate, revoked
//
// Token auth: we fetch the Ably JWT via `api.requestRealtimeToken()` in
// an `authCallback` so Ably auto-refreshes it on expiry.
//
// The client exposes an EventEmitter bus so upstream services (timer,
// capture) can subscribe without caring about Ably internals. This
// matches the convention used by timer-service and capture-supervisor.

import { EventEmitter } from 'node:events';
import type { Logger } from 'pino';
import { z } from 'zod';
import type { ApiClient } from './api-client';

// -----------------------------------------------------------------------------
// Payload schemas (doc 14 §4)
// -----------------------------------------------------------------------------

const ZString = z.string().min(1);

export const ErasureRequestedPayload = z.object({ userId: ZString });
export const ForcedSignOutPayload = z.object({ reason: ZString });
export const ProfileUpdatedPayload = z.object({
  user: z.object({
    id: ZString,
    email: z.string().email(),
    displayName: ZString,
    avatarUrl: z.string().nullable(),
    timezone: ZString,
    currency: ZString,
    pendingErasure: z.boolean().optional(),
  }),
});

export const TakenOverPayload = z.object({
  sessionId: ZString,
  newDeviceId: ZString,
});
export const DisputeOpenedPayload = z.object({
  disputeId: ZString,
  sessionId: ZString,
  reason: ZString,
  openedBy: ZString,
});
export const DisputeResolvedPayload = z.object({
  disputeId: ZString,
  status: ZString,
  resolutionNote: ZString.nullable().optional(),
});
export const SessionApprovedPayload = z.object({
  sessionId: ZString,
  approvedBy: ZString,
});
export const StateChangedPayload = z.object({
  sessionId: ZString,
  field: ZString,
  oldValue: z.unknown(),
  newValue: z.unknown(),
});

export const ContractStatusChangedPayload = z.object({
  contractId: ZString,
  oldStatus: ZString,
  newStatus: ZString,
});
export const ContractRateUpdatedPayload = z.object({
  contractId: ZString,
  newRateMinor: z.number().int().nonnegative(),
});
export const ContractCapUpdatedPayload = z.object({
  contractId: ZString,
  dailyCapSeconds: z.number().int().nullable(),
  weeklyCapSeconds: z.number().int().nullable(),
});
export const TaskCreatedPayload = z.object({
  task: z.object({
    id: ZString,
    contractId: ZString,
    name: ZString,
    archived: z.boolean().optional(),
  }),
});
export const TaskArchivedPayload = z.object({ taskId: ZString });

export const ForceUpdatePayload = z.object({ minVersion: ZString });
export const DeviceRevokedPayload = z.object({ reason: ZString });

// -----------------------------------------------------------------------------
// Channel name builders (mirrors doc 14 §5.2 exactly)
// -----------------------------------------------------------------------------

export const ABLY_CHANNELS = {
  user: (userId: string) => `user.${userId}`,
  session: (sessionId: string) => `session.${sessionId}`,
  contract: (contractId: string) => `contract.${contractId}`,
  device: (deviceId: string) => `device.${deviceId}`,
} as const;

// -----------------------------------------------------------------------------
// Event bus types
// -----------------------------------------------------------------------------

export type RealtimeEvent =
  | { type: 'erasureRequested'; payload: z.infer<typeof ErasureRequestedPayload> }
  | { type: 'forcedSignOut'; payload: z.infer<typeof ForcedSignOutPayload> }
  | { type: 'profileUpdated'; payload: z.infer<typeof ProfileUpdatedPayload> }
  | { type: 'session.takenOver'; payload: z.infer<typeof TakenOverPayload> }
  | { type: 'session.disputeOpened'; payload: z.infer<typeof DisputeOpenedPayload> }
  | { type: 'session.disputeResolved'; payload: z.infer<typeof DisputeResolvedPayload> }
  | { type: 'session.approved'; payload: z.infer<typeof SessionApprovedPayload> }
  | { type: 'session.stateChanged'; payload: z.infer<typeof StateChangedPayload> }
  | { type: 'contract.statusChanged'; payload: z.infer<typeof ContractStatusChangedPayload> }
  | { type: 'contract.rateUpdated'; payload: z.infer<typeof ContractRateUpdatedPayload> }
  | { type: 'contract.capUpdated'; payload: z.infer<typeof ContractCapUpdatedPayload> }
  | { type: 'contract.taskCreated'; payload: z.infer<typeof TaskCreatedPayload> }
  | { type: 'contract.taskArchived'; payload: z.infer<typeof TaskArchivedPayload> }
  | { type: 'device.forceUpdate'; payload: z.infer<typeof ForceUpdatePayload> }
  | { type: 'device.revoked'; payload: z.infer<typeof DeviceRevokedPayload> };

export interface RealtimeClientDeps {
  api: ApiClient;
  logger?: Logger;
  /** Optional injected Ably library (tests mock this). */
  ablyModule?: AblyRealtimeConstructor;
}

/** Minimal structural type matching Ably.Realtime. Keeps us loosely coupled. */
interface AblyChannel {
  subscribe(event: string, cb: (msg: { data: unknown }) => void): void;
  unsubscribe(): void;
}
interface AblyChannels {
  get(name: string): AblyChannel;
}
interface AblyRealtimeInstance {
  channels: AblyChannels;
  close(): void;
  connection: {
    on(event: string, cb: (arg: unknown) => void): void;
    off?(event: string, cb: (arg: unknown) => void): void;
  };
}
export interface AblyRealtimeConstructor {
  new (options: unknown): AblyRealtimeInstance;
}

function loadAbly(): AblyRealtimeConstructor | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('ably') as { Realtime: AblyRealtimeConstructor };
    return mod.Realtime;
  } catch {
    return null;
  }
}

export type RealtimeClient = ReturnType<typeof createRealtimeClient>;

export function createRealtimeClient(deps: RealtimeClientDeps) {
  const log = deps.logger?.child({ svc: 'realtime' });
  const bus = new EventEmitter();
  const Ably = deps.ablyModule ?? loadAbly();

  let client: AblyRealtimeInstance | null = null;
  let subscribedSessionIds = new Set<string>();
  let connected = false;

  function safeParse<T>(
    schema: z.ZodType<T>,
    data: unknown,
    label: string,
  ): T | null {
    const res = schema.safeParse(data);
    if (!res.success) {
      log?.warn({ label, issues: res.error.issues }, 'ably: payload rejected');
      return null;
    }
    return res.data;
  }

  function emit(event: RealtimeEvent): void {
    bus.emit('event', event);
    bus.emit(event.type, event.payload);
  }

  function subscribeUser(userId: string): void {
    if (!client) return;
    const ch = client.channels.get(ABLY_CHANNELS.user(userId));
    ch.subscribe('erasureRequested', (msg) => {
      const p = safeParse(ErasureRequestedPayload, msg.data, 'erasureRequested');
      if (p) emit({ type: 'erasureRequested', payload: p });
    });
    ch.subscribe('forcedSignOut', (msg) => {
      const p = safeParse(ForcedSignOutPayload, msg.data, 'forcedSignOut');
      if (p) emit({ type: 'forcedSignOut', payload: p });
    });
    ch.subscribe('profileUpdated', (msg) => {
      const p = safeParse(ProfileUpdatedPayload, msg.data, 'profileUpdated');
      if (p) emit({ type: 'profileUpdated', payload: p });
    });
  }

  function subscribeDevice(deviceId: string): void {
    if (!client) return;
    const ch = client.channels.get(ABLY_CHANNELS.device(deviceId));
    ch.subscribe('forceUpdate', (msg) => {
      const p = safeParse(ForceUpdatePayload, msg.data, 'forceUpdate');
      if (p) emit({ type: 'device.forceUpdate', payload: p });
    });
    ch.subscribe('revoked', (msg) => {
      const p = safeParse(DeviceRevokedPayload, msg.data, 'revoked');
      if (p) emit({ type: 'device.revoked', payload: p });
    });
  }

  function subscribeContract(contractId: string): void {
    if (!client) return;
    const ch = client.channels.get(ABLY_CHANNELS.contract(contractId));
    ch.subscribe('statusChanged', (msg) => {
      const p = safeParse(ContractStatusChangedPayload, msg.data, 'contract.statusChanged');
      if (p) emit({ type: 'contract.statusChanged', payload: p });
    });
    ch.subscribe('rateUpdated', (msg) => {
      const p = safeParse(ContractRateUpdatedPayload, msg.data, 'contract.rateUpdated');
      if (p) emit({ type: 'contract.rateUpdated', payload: p });
    });
    ch.subscribe('capUpdated', (msg) => {
      const p = safeParse(ContractCapUpdatedPayload, msg.data, 'contract.capUpdated');
      if (p) emit({ type: 'contract.capUpdated', payload: p });
    });
    ch.subscribe('taskCreated', (msg) => {
      const p = safeParse(TaskCreatedPayload, msg.data, 'contract.taskCreated');
      if (p) emit({ type: 'contract.taskCreated', payload: p });
    });
    ch.subscribe('taskArchived', (msg) => {
      const p = safeParse(TaskArchivedPayload, msg.data, 'contract.taskArchived');
      if (p) emit({ type: 'contract.taskArchived', payload: p });
    });
  }

  function subscribeSession(sessionId: string): () => void {
    if (!client) return () => {};
    if (subscribedSessionIds.has(sessionId)) return () => {};
    subscribedSessionIds.add(sessionId);
    const ch = client.channels.get(ABLY_CHANNELS.session(sessionId));
    ch.subscribe('takenOver', (msg) => {
      const p = safeParse(TakenOverPayload, msg.data, 'session.takenOver');
      if (p) emit({ type: 'session.takenOver', payload: p });
    });
    ch.subscribe('disputeOpened', (msg) => {
      const p = safeParse(DisputeOpenedPayload, msg.data, 'session.disputeOpened');
      if (p) emit({ type: 'session.disputeOpened', payload: p });
    });
    ch.subscribe('disputeResolved', (msg) => {
      const p = safeParse(DisputeResolvedPayload, msg.data, 'session.disputeResolved');
      if (p) emit({ type: 'session.disputeResolved', payload: p });
    });
    ch.subscribe('sessionApproved', (msg) => {
      const p = safeParse(SessionApprovedPayload, msg.data, 'session.approved');
      if (p) emit({ type: 'session.approved', payload: p });
    });
    ch.subscribe('stateChanged', (msg) => {
      const p = safeParse(StateChangedPayload, msg.data, 'session.stateChanged');
      if (p) emit({ type: 'session.stateChanged', payload: p });
    });
    return () => {
      subscribedSessionIds.delete(sessionId);
      try {
        ch.unsubscribe();
      } catch {
        /* ignore */
      }
    };
  }

  async function connect(input: {
    userId: string;
    deviceId: string;
    contractIds?: string[];
  }): Promise<void> {
    if (!Ably) {
      log?.warn('ably module not available — realtime disabled');
      return;
    }
    if (client) {
      try {
        client.close();
      } catch {
        /* ignore */
      }
      client = null;
    }
    client = new Ably({
      authCallback: async (
        _data: unknown,
        cb: (err: Error | null, token: string | null) => void,
      ) => {
        try {
          const resp = await deps.api.requestRealtimeToken(input.deviceId);
          cb(null, resp.token);
        } catch (err) {
          cb(err as Error, null);
        }
      },
    });
    client.connection.on('connected', () => {
      connected = true;
      log?.info('ably: connected');
    });
    client.connection.on('disconnected', () => {
      connected = false;
      log?.info('ably: disconnected');
    });
    client.connection.on('failed', (e: unknown) => {
      connected = false;
      log?.warn({ err: describe(e) }, 'ably: connection failed');
    });

    subscribeUser(input.userId);
    subscribeDevice(input.deviceId);
    for (const cid of input.contractIds ?? []) subscribeContract(cid);
  }

  function disconnect(): void {
    if (!client) return;
    try {
      client.close();
    } catch {
      /* ignore */
    }
    client = null;
    connected = false;
    subscribedSessionIds = new Set<string>();
  }

  return {
    connect,
    disconnect,
    subscribeSession,
    get isConnected() {
      return connected;
    },
    /** Typed subscription to every incoming event. */
    onEvent(cb: (e: RealtimeEvent) => void): () => void {
      const listener = (e: RealtimeEvent) => cb(e);
      bus.on('event', listener);
      return () => bus.off('event', listener);
    },
    /** Narrow subscription. */
    on<T extends RealtimeEvent['type']>(
      type: T,
      cb: (payload: Extract<RealtimeEvent, { type: T }>['payload']) => void,
    ): () => void {
      const listener = (p: unknown) =>
        (cb as (payload: unknown) => void)(p);
      bus.on(type, listener);
      return () => bus.off(type, listener);
    },
    /** Test helper — inject a synthetic event. */
    _injectForTest(event: RealtimeEvent): void {
      emit(event);
    },
  };
}

function describe(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
