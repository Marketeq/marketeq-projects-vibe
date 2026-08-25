// src/main/services/timer/timer-service.ts
//
// The Phase 2 Timer Service — orchestrates the pure FSM from state-machine.ts,
// runs the declarative Effects against the repositories, and emits typed IPC
// events for the renderer.
//
// Responsibilities (doc 20 §8.4 + Phase 2 prompt):
//   1. Owns a singleton FSM instance and the single active session.
//   2. Executes the Effects produced by `transition()` against the DB via
//      the Phase-1 repositories — no direct SQL here.
//   3. Emits `timer:state-changed`, `timer:tick`, `timer:error`,
//      `idle:resolution-needed`, `break:expiring`, `break:expired`, and the
//      reminder events via an event bus that the IPC layer pipes to the
//      renderer.
//   4. Computes elapsed time monotonically using process.hrtime.bigint() for
//      safety against wall-clock skew, while still using Date.now() for
//      persisted timestamps.
//   5. Survives app restart: restoreFromDb() reads the latest open session
//      and re-hydrates the FSM into `Paused` (never directly Running — the
//      user must explicitly resume so we don't silently bill).
//   6. Enforces business rules from doc 22 (max session 14h, max break 4h,
//      paid-break allowance).
//
// See __tests__/state-machine.test.ts for exhaustive FSM coverage.

import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import type { DbHandle } from '../../db/connection';
import type { Repos } from '../../db/repos';
import type { Logger } from 'pino';
import {
  createTimerMachine,
  transition,
  type Ctx,
  type Effect,
  type TimerEvent,
  type TimerState,
} from './state-machine';
import { writeAudit } from './audit';
import { createBreakManager, type BreakManager } from './break-manager';
import { createIdleResolver, type IdleResolver } from './idle-resolver';
import { createReminderScheduler, type ReminderScheduler } from './reminders';
import { createIdleDetector, type IdleDetector } from './idle-detector';
import type {
  BreakKind,
  ContractId,
  IdleResolution,
  SessionEndReason,
  SessionId,
  TaskId,
} from '../../../shared/types';

// -----------------------------------------------------------------------------
// Business rule constants (doc 22)
// -----------------------------------------------------------------------------

const MAX_SESSION_SEC = 14 * 60 * 60; // 14 hours
const MAX_BREAK_SEC = 4 * 60 * 60; // 4 hours
/** Sessions older than this on crash recovery are force-stopped (doc 05 CRASH.01). */
const CRASH_RECOVERY_CUTOFF_MS = 8 * 60 * 60 * 1000; // 8 hours

// -----------------------------------------------------------------------------
// IPC channel names — exported so the preload + renderer can reference them.
// -----------------------------------------------------------------------------

export const TIMER_CHANNELS = {
  // commands (request/response)
  start: 'timer:start',
  pause: 'timer:pause',
  resume: 'timer:resume',
  stop: 'timer:stop',
  breakStart: 'timer:break-start',
  breakEnd: 'timer:break-end',
  getState: 'timer:get-state',
  idleResolve: 'idle:resolve',
  // events (main -> renderer broadcast)
  stateChanged: 'timer:state-changed',
  tick: 'timer:tick',
  error: 'timer:error',
  idleResolutionNeeded: 'idle:resolution-needed',
  breakExpiring: 'break:expiring',
  breakExpired: 'break:expired',
  workReminder: 'timer:work-reminder',
  breakReminder: 'timer:break-reminder',
} as const;

export type TimerChannel = (typeof TIMER_CHANNELS)[keyof typeof TIMER_CHANNELS];

// -----------------------------------------------------------------------------
// Public snapshot shape (renderer consumes via IPC)
// -----------------------------------------------------------------------------

export interface TimerSnapshot {
  state: TimerState;
  activeSessionId: SessionId | null;
  pickedContract: { contractId: ContractId; taskId: TaskId } | null;
  /** Total billable seconds the current session has accrued so far. */
  elapsedSec: number;
  /** Seconds since the last Running transition (0 if not Running). */
  runningSec: number;
  /** Active break seconds remaining (null if no active break or open-ended). */
  breakRemainingSec: number | null;
  /** True if the current session is on any break state. */
  isOnBreak: boolean;
  /** Pending idle interval the user must resolve, if any. */
  pendingIdle:
    | null
    | { idleEventId: string; startedAt: number; endedAt: number; seconds: number };
  updatedAt: number;
}

export interface BusEventMap {
  [TIMER_CHANNELS.stateChanged]: TimerSnapshot;
  [TIMER_CHANNELS.tick]: { elapsedSec: number; runningSec: number; state: TimerState };
  [TIMER_CHANNELS.error]: { code: string; message: string };
  [TIMER_CHANNELS.idleResolutionNeeded]: {
    idleEventId: string;
    startedAt: number;
    endedAt: number;
    seconds: number;
  };
  [TIMER_CHANNELS.breakExpiring]: { breakId: string; kind: BreakKind; remainingSec: number };
  [TIMER_CHANNELS.breakExpired]: { breakId: string; kind: BreakKind };
  [TIMER_CHANNELS.workReminder]: { elapsedSec: number };
  [TIMER_CHANNELS.breakReminder]: { elapsedSec: number };
}

export type TimerBusEvent =
  | { channel: typeof TIMER_CHANNELS.stateChanged; payload: TimerSnapshot }
  | {
      channel: typeof TIMER_CHANNELS.tick;
      payload: { elapsedSec: number; runningSec: number; state: TimerState };
    }
  | { channel: typeof TIMER_CHANNELS.error; payload: { code: string; message: string } }
  | {
      channel: typeof TIMER_CHANNELS.idleResolutionNeeded;
      payload: {
        idleEventId: string;
        startedAt: number;
        endedAt: number;
        seconds: number;
      };
    }
  | {
      channel: typeof TIMER_CHANNELS.breakExpiring;
      payload: { breakId: string; kind: BreakKind; remainingSec: number };
    }
  | {
      channel: typeof TIMER_CHANNELS.breakExpired;
      payload: { breakId: string; kind: BreakKind };
    }
  | { channel: typeof TIMER_CHANNELS.workReminder; payload: { elapsedSec: number } }
  | { channel: typeof TIMER_CHANNELS.breakReminder; payload: { elapsedSec: number } };

// -----------------------------------------------------------------------------
// Dependencies
// -----------------------------------------------------------------------------

export interface TimerServiceDeps {
  db: DbHandle;
  repos: Repos;
  logger: Logger;
  /** Returns the currently authenticated user id, or null if signed out. */
  getUserId?: () => string | null;
  /** Returns the current device id (from device_self table). */
  getDeviceId?: () => string | null;
  /** Optional: override idle detection threshold (seconds). */
  idleThresholdSeconds?: number;
  /** Optional: disable automatic idle detector (useful in tests). */
  disableIdleDetector?: boolean;
}

// -----------------------------------------------------------------------------
// Factory
// -----------------------------------------------------------------------------

export function createTimerService(deps: TimerServiceDeps) {
  const { db, repos, logger } = deps;
  const bus = new EventEmitter();

  const machine = createTimerMachine('Idle');
  let pickedContract:
    | { contractId: ContractId; taskId: TaskId }
    | null = null;
  let activeSessionId: SessionId | null = null;
  let runningStartedAt: number | null = null; // wall-clock Date.now() ms
  let runningStartedHr: bigint | null = null; // monotonic start
  let sessionStartedAt: number | null = null; // wall-clock start of the session
  /** Rolling sum of billable seconds from previous Running segments (excluding the current one). */
  let accumulatedRunningSec = 0;
  let activeTimeEntryId: string | null = null;

  const breakManager: BreakManager = createBreakManager(repos.break, {
    onExpiring: (brk) => {
      emit(TIMER_CHANNELS.breakExpiring, {
        breakId: brk.id,
        kind: brk.kind,
        remainingSec: Math.max(0, breakManager.remainingSeconds() ?? 0),
      });
    },
    onExpired: (brk) => {
      emit(TIMER_CHANNELS.breakExpired, { breakId: brk.id, kind: brk.kind });
    },
  });
  const idleResolver: IdleResolver = createIdleResolver(repos.idle);
  const reminders: ReminderScheduler = createReminderScheduler({
    onWorkReminder: (p) => emit(TIMER_CHANNELS.workReminder, p),
    onBreakReminder: (p) => emit(TIMER_CHANNELS.breakReminder, p),
  });

  // --------- tick loop (1 Hz while Running) ---------------------------------
  let tickHandle: NodeJS.Timeout | null = null;

  function startTickLoop() {
    if (tickHandle) return;
    tickHandle = setInterval(() => {
      if (machine.getState() !== 'Running') return;
      const snap = snapshot();
      emit(TIMER_CHANNELS.tick, {
        elapsedSec: snap.elapsedSec,
        runningSec: snap.runningSec,
        state: snap.state,
      });
      // Enforce max session duration (doc 22).
      if (snap.elapsedSec >= MAX_SESSION_SEC) {
        logger.warn({ sessionId: activeSessionId }, 'max session duration reached — auto-stopping');
        void safeDispatch({ type: 'STOP', reason: 'user_stop' });
      }
    }, 1000);
  }

  function stopTickLoop() {
    if (tickHandle) {
      clearInterval(tickHandle);
      tickHandle = null;
    }
  }

  // --------- idle detector --------------------------------------------------
  let idleDetector: IdleDetector | null = null;
  if (!deps.disableIdleDetector) {
    idleDetector = createIdleDetector({
      thresholdSeconds: deps.idleThresholdSeconds,
      shouldFire: () => machine.getState() === 'Running',
      onIdleDetected: ({ idleStartedAt, idleSeconds }) => {
        void safeDispatch({ type: 'IDLE_DETECTED', idleStartedAt, idleSeconds });
      },
      onSuspend: () => void safeDispatch({ type: 'SYSTEM_SUSPEND' }),
      onResume: () => void safeDispatch({ type: 'SYSTEM_RESUME' }),
      onLock: () => void safeDispatch({ type: 'SYSTEM_LOCK' }),
      onUnlock: () => void safeDispatch({ type: 'SYSTEM_UNLOCK' }),
    });
    try {
      idleDetector.start();
    } catch (err) {
      logger.warn({ err }, 'idle detector failed to start (likely no Electron context)');
    }
  }

  // ---------------------------------------------------------------------------
  // Elapsed-time computation (monotonic, skew-safe)
  // ---------------------------------------------------------------------------

  function currentRunningSec(): number {
    // Deliberately does NOT also check `machine.getState() === 'Running'`:
    // handlePostTransition() calls this to freeze the clock (accumulatedRunningSec
    // += currentRunningSec(), closeTimeEntry()) AFTER machine.send() has already
    // moved the FSM to the new (non-Running) state, so that check made this
    // always return 0 at exactly the moment the real elapsed time was needed —
    // silently zeroing every session's billable_seconds and every time_entry's
    // duration_seconds. runningStartedHr being non-null is already the correct,
    // sufficient signal for "there's an open running segment to measure."
    if (runningStartedHr == null) return 0;
    const deltaNs = process.hrtime.bigint() - runningStartedHr;
    const sec = Number(deltaNs / 1_000_000_000n);
    // Phase 8: clock skew guard — monotonic clock should never go negative,
    // but if it somehow does (doc 05 XCUT.05), clamp to zero.
    if (sec < 0) {
      logger.warn({ sec }, 'negative running seconds detected (clock skew) — clamping to 0');
      return 0;
    }
    return sec;
  }

  function totalBillableSec(): number {
    return accumulatedRunningSec + currentRunningSec();
  }

  // ---------------------------------------------------------------------------
  // Snapshot
  // ---------------------------------------------------------------------------

  function snapshot(): TimerSnapshot {
    const pending = idleResolver.getPending();
    return {
      state: machine.getState(),
      activeSessionId,
      pickedContract,
      elapsedSec: totalBillableSec(),
      runningSec: currentRunningSec(),
      breakRemainingSec: breakManager.remainingSeconds(),
      isOnBreak:
        machine.getState() === 'OnBreakPaid' ||
        machine.getState() === 'OnBreakUnpaid',
      pendingIdle: pending
        ? {
            idleEventId: pending.idleEventId,
            startedAt: pending.startedAt,
            endedAt: pending.endedAt,
            seconds: pending.seconds,
          }
        : null,
      updatedAt: Date.now(),
    };
  }

  function emit<K extends keyof BusEventMap>(channel: K, payload: BusEventMap[K]) {
    bus.emit('event', { channel, payload });
    bus.emit(channel, payload);
  }

  function emitSnapshot() {
    emit(TIMER_CHANNELS.stateChanged, snapshot());
  }

  function emitError(code: string, message: string) {
    logger.warn({ code, message }, 'timer error');
    emit(TIMER_CHANNELS.error, { code, message });
  }

  // ---------------------------------------------------------------------------
  // Dispatch
  // ---------------------------------------------------------------------------

  function ctx(): Ctx {
    return {
      hasActiveSession: activeSessionId != null,
      // Phase 2 does not yet wire a contract-aware break allowance service
      // (that lives in a later phase). For now we honour the contract's
      // paid_break_allowance_seconds field directly by subtracting today's
      // usage, which is a good-enough approximation until the allowance
      // service ships.
      paidBreakRemainingSeconds: computePaidBreakRemaining(),
    };
  }

  function computePaidBreakRemaining(): number {
    if (!pickedContract) return 0;
    const contract = repos.contract.findById(pickedContract.contractId);
    if (!contract) return 0;
    const allowance = contract.paid_break_allowance_seconds;
    if (allowance <= 0) return 0;
    // Naive: sum paid break durations in this session so far.
    if (!activeSessionId) return allowance;
    const breaks = repos.break.listForSession(activeSessionId);
    let used = 0;
    const now = Date.now();
    for (const b of breaks) {
      if (b.kind !== 'paid') continue;
      const end = b.ended_at ?? now;
      used += Math.max(0, Math.floor((end - b.started_at) / 1000));
    }
    return Math.max(0, allowance - used);
  }

  async function safeDispatch(event: TimerEvent): Promise<TimerState> {
    try {
      return dispatchInternal(event);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      emitError('DTT-ERR-TIMER.00', message);
      throw err;
    }
  }

  function dispatchInternal(event: TimerEvent): TimerState {
    // Handle the two events that mutate internal picks BEFORE the FSM runs,
    // because the transition function needs to know about them through ctx.
    if (event.type === 'PICK_CONTRACT') {
      pickedContract = {
        contractId: event.contractId as ContractId,
        taskId: event.taskId as TaskId,
      };
    } else if (event.type === 'CLEAR_PICK') {
      pickedContract = null;
    }

    const before = machine.getState();
    const result = transition(before, event, ctx());
    runEffects(result.effects, event);
    // Push the FSM forward only AFTER effects have a chance to see the
    // "from" state (they don't here, but effects can mutate activeSessionId
    // etc., so order matters for runningStartedHr management).
    machine.send(event, ctx());
    handlePostTransition(before, machine.getState(), event);
    emitSnapshot();
    return machine.getState();
  }

  function runEffects(effects: Effect[], _event: TimerEvent) {
    for (const eff of effects) {
      switch (eff.kind) {
        case 'open_session':
          handleOpenSession();
          break;
        case 'close_session':
          handleCloseSession(eff.reason);
          break;
        case 'open_break':
          handleOpenBreak(eff.breakKind);
          break;
        case 'close_break':
          handleCloseBreak();
          break;
        case 'open_idle_event':
          handleOpenIdleEvent(eff.startedAt, eff.seconds);
          break;
        case 'resolve_idle':
          handleResolveIdle(eff.resolution);
          break;
        case 'open_dispute_lock':
        case 'close_dispute_lock':
          // UI-only markers — the renderer reads `state` from the snapshot.
          break;
        case 'request_take_over':
          logger.info({ sessionId: eff.sessionId }, 'take-over requested (phase 2 no-op)');
          break;
        case 'force_close_active':
          handleCloseSession(eff.reason);
          break;
        case 'audit':
          writeAudit(db, {
            from: eff.from,
            to: eff.to,
            event: eff.event,
            sessionId: activeSessionId,
          });
          break;
      }
    }
  }

  function handlePostTransition(
    from: TimerState,
    to: TimerState,
    _event: TimerEvent,
  ) {
    // (Re)start monotonic clock when entering Running.
    if (to === 'Running' && from !== 'Running') {
      runningStartedAt = Date.now();
      runningStartedHr = process.hrtime.bigint();
      // When entering Running from Counting, a fresh session was opened.
      if (from === 'Counting') {
        accumulatedRunningSec = 0;
        sessionStartedAt = runningStartedAt;
      }
      // Open a fresh time_entry segment.
      openTimeEntry(runningStartedAt);
      startTickLoop();
      reminders.scheduleWorkReminder(runningStartedAt);
    }

    // Freeze the monotonic clock when leaving Running. Compute the final
    // running-segment duration ONCE, before clearing runningStartedHr, and
    // pass it directly to closeTimeEntry() rather than letting it recompute
    // via currentRunningSec() — by the time closeTimeEntry() ran here,
    // runningStartedHr was already null, so it silently persisted a
    // duration_seconds of 0 for every single time_entry, regardless of the
    // (correct, since the fix above) session-level billable_seconds.
    if (from === 'Running' && to !== 'Running') {
      const finalRunningSec = currentRunningSec();
      accumulatedRunningSec += finalRunningSec;
      closeTimeEntry(finalRunningSec);
      runningStartedHr = null;
      runningStartedAt = null;
      stopTickLoop();
    }

    // Break reminders.
    if ((to === 'OnBreakPaid' || to === 'OnBreakUnpaid') && from !== to) {
      reminders.scheduleBreakReminder(Date.now());
    }
    if (
      (from === 'OnBreakPaid' || from === 'OnBreakUnpaid') &&
      to !== 'OnBreakPaid' &&
      to !== 'OnBreakUnpaid'
    ) {
      reminders.clearAll();
    }

    // Idle resolution prompt signal — when we enter IdleSoftPaused the
    // `open_idle_event` effect already wrote the row; now tell the renderer.
    if (to === 'IdleSoftPaused' && from !== 'IdleSoftPaused') {
      const pending = idleResolver.getPending();
      if (pending) {
        emit(TIMER_CHANNELS.idleResolutionNeeded, {
          idleEventId: pending.idleEventId,
          startedAt: pending.startedAt,
          endedAt: pending.endedAt,
          seconds: pending.seconds,
        });
      }
    }

    // When we reach a terminal Idle (session closed), clear everything.
    if (to === 'Idle' && from !== 'Idle') {
      pickedContract = null;
      accumulatedRunningSec = 0;
      sessionStartedAt = null;
      activeTimeEntryId = null;
      reminders.clearAll();
    }
  }

  // ---------------------------------------------------------------------------
  // Effect handlers
  // ---------------------------------------------------------------------------

  function handleOpenSession() {
    if (!pickedContract) {
      emitError('DTT-ERR-TIMER.01', 'no contract picked');
      return;
    }
    const userId = deps.getUserId?.() ?? repos.user.findFirst()?.id ?? null;
    const deviceId = deps.getDeviceId?.() ?? repos.device.findSelf()?.id ?? null;
    if (!userId || !deviceId) {
      emitError('DTT-ERR-TIMER.02', 'missing user or device for session');
      return;
    }
    const now = Date.now();
    const id = `ses_${randomUUID().replace(/-/g, '').slice(0, 24)}` as SessionId;
    repos.session.insert({
      id,
      user_id: userId,
      contract_id: pickedContract.contractId,
      task_id: pickedContract.taskId,
      device_id: deviceId,
      started_at: now,
      ended_at: null,
      end_reason: null,
      billable_seconds: 0,
      paid_break_seconds: 0,
      unpaid_break_seconds: 0,
      idle_seconds: 0,
      disputed: 0,
      synced_at: null,
      created_at: now,
      updated_at: now,
    });
    activeSessionId = id;
    logger.info({ sessionId: id, contract: pickedContract }, 'session opened');
  }

  function handleCloseSession(reason: SessionEndReason) {
    if (!activeSessionId) return;
    // Snapshot the billable seconds BEFORE we clear the running clock in
    // handlePostTransition — but handlePostTransition hasn't run yet, so we
    // compute it fresh here including the in-flight Running segment.
    const billable = totalBillableSec();
    const endedAt = Date.now();
    repos.session.closeActive({
      id: activeSessionId,
      endedAt,
      reason,
      billableSeconds: billable,
    });
    logger.info(
      { sessionId: activeSessionId, reason, billable },
      'session closed',
    );
    activeSessionId = null;
  }

  function handleOpenBreak(kind: BreakKind) {
    if (!activeSessionId) return;
    // Doc 22 — cap paid breaks to 4h hard ceiling. We rely on break-manager
    // for the actual timers.
    breakManager.start({ sessionId: activeSessionId, kind, plannedDurationSec: null });
  }

  function handleCloseBreak() {
    const ended = breakManager.end();
    if (ended && activeSessionId) {
      const durSec = Math.floor((Date.now() - ended.startedAt) / 1000);
      if (durSec > MAX_BREAK_SEC) {
        emitError('DTT-ERR-BREAK.02', 'break exceeded 4-hour cap');
      }
    }
  }

  function handleOpenIdleEvent(startedAt: number, seconds: number) {
    if (!activeSessionId) return;
    idleResolver.open({ sessionId: activeSessionId, startedAt, seconds });
  }

  function handleResolveIdle(resolution: IdleResolution) {
    const closed = idleResolver.resolve(resolution);
    if (!closed || !activeSessionId) return;
    // If 'discard', subtract the idle seconds from our accumulated running
    // total so the billable clock reflects the decision.
    if (resolution === 'discard') {
      accumulatedRunningSec = Math.max(0, accumulatedRunningSec - closed.seconds);
    }
  }

  // ---------------------------------------------------------------------------
  // Time entry segments
  // ---------------------------------------------------------------------------

  function openTimeEntry(startedAt: number) {
    if (!activeSessionId) return;
    const id = `ent_${randomUUID().replace(/-/g, '').slice(0, 24)}`;
    repos.timeEntry.insert({
      id,
      session_id: activeSessionId,
      started_at: startedAt,
      ended_at: null,
      duration_seconds: 0,
      synced_at: null,
    });
    activeTimeEntryId = id;
  }

  function closeTimeEntry(durationSec: number) {
    if (!activeTimeEntryId) return;
    const endedAt = Date.now();
    repos.timeEntry.close(activeTimeEntryId, endedAt, durationSec);
    activeTimeEntryId = null;
  }

  // ---------------------------------------------------------------------------
  // Public high-level methods (phase-2 prompt API)
  // ---------------------------------------------------------------------------

  async function startTimer(input: {
    contractId: string;
    taskId: string;
    description?: string;
  }): Promise<TimerSnapshot> {
    await safeDispatch({
      type: 'PICK_CONTRACT',
      contractId: input.contractId,
      taskId: input.taskId,
    });
    await safeDispatch({ type: 'START' });
    return snapshot();
  }

  async function pauseTimer(): Promise<TimerSnapshot> {
    await safeDispatch({ type: 'PAUSE' });
    return snapshot();
  }
  async function resumeTimer(): Promise<TimerSnapshot> {
    await safeDispatch({ type: 'RESUME' });
    return snapshot();
  }
  async function stopTimer(
    reason: SessionEndReason = 'user_stop',
  ): Promise<TimerSnapshot> {
    await safeDispatch({ type: 'STOP', reason });
    return snapshot();
  }
  async function startBreak(
    input:
      | { kind: BreakKind }
      | { kind: 'paid' | 'unpaid' | 'custom'; durationSec?: number },
  ): Promise<TimerSnapshot> {
    // Treat 'custom' as 'unpaid' for FSM purposes.
    const fsmKind: BreakKind = input.kind === 'custom' ? 'unpaid' : input.kind;
    // Doc 22 guard: explicit error when paid allowance is exhausted.
    if (fsmKind === 'paid' && computePaidBreakRemaining() <= 0) {
      emitError('DTT-ERR-BREAK.01', 'paid break allowance exhausted');
      return snapshot();
    }
    await safeDispatch({ type: 'BREAK_START', kind: fsmKind });
    return snapshot();
  }
  async function endBreak(): Promise<TimerSnapshot> {
    await safeDispatch({ type: 'BREAK_END' });
    return snapshot();
  }
  async function resolveIdle(resolution: IdleResolution): Promise<TimerSnapshot> {
    await safeDispatch({ type: 'IDLE_RESOLVED', resolution });
    return snapshot();
  }

  function getCurrentState(): TimerState {
    return machine.getState();
  }

  function getSnapshot(): TimerSnapshot {
    return snapshot();
  }

  function attachEventBus(cb: (event: TimerBusEvent) => void): () => void {
    const listener = (evt: TimerBusEvent) => cb(evt);
    bus.on('event', listener);
    return () => bus.off('event', listener);
  }

  // ---------------------------------------------------------------------------
  // Restart recovery (doc 20 §"Recovery on restart")
  // ---------------------------------------------------------------------------

  function restoreFromDb(): TimerSnapshot {
    const userId = deps.getUserId?.() ?? repos.user.findFirst()?.id ?? null;
    if (!userId) return snapshot();
    const open = repos.session.findActive(userId);
    if (!open) return snapshot();

    // Phase 8: crash recovery cutoff — if the session is older than the
    // threshold, force-stop it rather than resuming (doc 05 DTT-EDGE-CRASH.01).
    const sessionAge = Date.now() - open.started_at;
    if (sessionAge > CRASH_RECOVERY_CUTOFF_MS) {
      logger.warn(
        { sessionId: open.id, ageHours: Math.round(sessionAge / 3600000) },
        'stale session found during crash recovery — force-stopping',
      );
      repos.session.closeActive({
        id: open.id,
        endedAt: Date.now(),
        reason: 'crash_recover',
        billableSeconds: open.billable_seconds,
      });
      emit(TIMER_CHANNELS.error, {
        code: 'DTT-ERR-SYS.03',
        message: 'A stale session was recovered and closed after an unexpected restart.',
      });
      return snapshot();
    }

    // Rehydrate into Paused, not Running — doc 20 never silently bills the
    // user after a crash. The renderer will show "Resume" and let the user
    // confirm.
    logger.info({ sessionId: open.id }, 'restoring open session into Paused');
    activeSessionId = open.id as SessionId;
    pickedContract = {
      contractId: open.contract_id as ContractId,
      taskId: open.task_id as TaskId,
    };
    sessionStartedAt = open.started_at;
    accumulatedRunningSec = open.billable_seconds;
    // Drive the machine: Idle -> Counting -> Running -> Paused.
    machine.send(
      { type: 'PICK_CONTRACT', contractId: open.contract_id, taskId: open.task_id },
      ctx(),
    );
    // Can't use our dispatchInternal because that re-opens a session row.
    // Simulate by directly updating FSM to Running then Paused without effects.
    // We use the raw transition() sequence, bypassing open_session handler.
    const afterStart = transition('Counting', { type: 'START' }, ctx());
    // skip the open_session effect — it's already in DB
    for (const eff of afterStart.effects) {
      if (eff.kind === 'audit') {
        writeAudit(db, {
          from: eff.from,
          to: eff.to,
          event: eff.event,
          sessionId: activeSessionId,
        });
      }
    }
    machine.send({ type: 'START' }, ctx());
    // Now pause.
    dispatchInternal({ type: 'PAUSE' });
    return snapshot();
  }

  // ---------------------------------------------------------------------------
  // Shutdown
  // ---------------------------------------------------------------------------

  function dispose() {
    stopTickLoop();
    idleDetector?.stop();
    breakManager.dispose();
    reminders.dispose();
    bus.removeAllListeners();
  }

  return {
    // high-level command API
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    startBreak,
    endBreak,
    resolveIdle,
    // raw dispatch (for IPC events that don't map 1:1 to commands)
    dispatch: (event: TimerEvent) => safeDispatch(event),
    // introspection
    getCurrentState,
    getSnapshot,
    // bus / lifecycle
    attachEventBus,
    restoreFromDb,
    dispose,
  };
}

export type TimerService = ReturnType<typeof createTimerService>;
