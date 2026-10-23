// src/main/services/timer/state-machine.ts
//
// Pure finite-state machine for the Marketeq Time Tracker timer.
// Authoritative source: doc 20 §2-§5 (9 states, transition table, Mermaid).
//
// This module is intentionally side-effect-free. Given a (state, event, ctx)
// triple it produces the next state plus a list of declarative Effects that
// the orchestrator (timer-service.ts) will execute. No DB writes, no IPC,
// no logging happens here. That makes the FSM trivially unit-testable and
// guarantees determinism — the same inputs always produce the same outputs.

import type { SessionEndReason, BreakKind, IdleResolution } from '../../../shared/types';

// -----------------------------------------------------------------------------
// States (doc 20 §2)
// -----------------------------------------------------------------------------

export type TimerState =
  | 'Idle'
  | 'Counting'
  | 'Running'
  | 'Paused'
  | 'OnBreakPaid'
  | 'OnBreakUnpaid'
  | 'IdleSoftPaused'
  | 'OfflineStopped'
  | 'LockedDisputed';

export const ALL_STATES: readonly TimerState[] = [
  'Idle',
  'Counting',
  'Running',
  'Paused',
  'OnBreakPaid',
  'OnBreakUnpaid',
  'IdleSoftPaused',
  'OfflineStopped',
  'LockedDisputed',
] as const;

// -----------------------------------------------------------------------------
// Events (doc 20 §3)
// -----------------------------------------------------------------------------

export type TimerEvent =
  | { type: 'PICK_CONTRACT'; contractId: string; taskId: string }
  | { type: 'CLEAR_PICK' }
  | { type: 'START' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'STOP'; reason: SessionEndReason }
  | { type: 'BREAK_START'; kind: BreakKind }
  | { type: 'BREAK_END' }
  | { type: 'IDLE_DETECTED'; idleStartedAt: number; idleSeconds: number }
  | { type: 'IDLE_RESOLVED'; resolution: IdleResolution }
  | { type: 'NETWORK_OFFLINE'; since: number }
  | { type: 'NETWORK_ONLINE' }
  | { type: 'OFFLINE_LIMIT_EXCEEDED' }
  | { type: 'DISPUTE_OPENED'; disputeId: string; sessionId: string }
  | { type: 'DISPUTE_CLOSED'; disputeId: string }
  | { type: 'TAKE_OVER_REQUESTED'; sessionId: string }
  | { type: 'TAKE_OVER_PUSHED_FROM_OTHER_DEVICE' }
  | { type: 'FORCED_SIGN_OUT' }
  | { type: 'SYSTEM_SUSPEND' }
  | { type: 'SYSTEM_RESUME' }
  | { type: 'SYSTEM_LOCK' }
  | { type: 'SYSTEM_UNLOCK' }
  | { type: 'APP_QUIT' }
  // Crash recovery (doc 01 §18, DTT-US-132): the user chose Recover for a
  // session an unclean shutdown left behind. It comes back Paused — never
  // Running — so continuing needs an explicit Resume.
  | { type: 'RESTORE_SESSION'; sessionId: string };

export type TimerEventType = TimerEvent['type'];

// -----------------------------------------------------------------------------
// Effects (declarative; executed by orchestrator)
// -----------------------------------------------------------------------------

export type Effect =
  | { kind: 'open_session'; contractId: string; taskId: string }
  | { kind: 'close_session'; reason: SessionEndReason }
  | { kind: 'open_break'; breakKind: BreakKind }
  | { kind: 'close_break' }
  | { kind: 'open_idle_event'; startedAt: number; seconds: number }
  | { kind: 'resolve_idle'; resolution: IdleResolution }
  | { kind: 'open_dispute_lock'; disputeId: string }
  | { kind: 'close_dispute_lock' }
  | { kind: 'request_take_over'; sessionId: string }
  | { kind: 'force_close_active'; reason: SessionEndReason }
  | { kind: 'audit'; from: TimerState; to: TimerState; event: TimerEvent };

export interface TransitionResult {
  next: TimerState;
  effects: Effect[];
}

export interface Ctx {
  /** Is there a currently open session row in DB? */
  hasActiveSession: boolean;
  /** Remaining paid break allowance for the currently picked contract, in seconds. */
  paidBreakRemainingSeconds: number;
}

// -----------------------------------------------------------------------------
// Core transition function
// -----------------------------------------------------------------------------

/**
 * Pure reducer — given (state, event, ctx), return the next state and the
 * effects to run. Must be deterministic: no Date.now(), no randomness, no I/O.
 */
export function transition(
  state: TimerState,
  event: TimerEvent,
  ctx: Ctx,
): TransitionResult {
  // FORCED_SIGN_OUT is the highest-priority event. Doc 20 §6.6:
  // from ANY state it transitions directly to Idle and force-closes any
  // active session.
  if (event.type === 'FORCED_SIGN_OUT') {
    const effects: Effect[] = [];
    if (ctx.hasActiveSession) {
      effects.push({ kind: 'force_close_active', reason: 'forced_signout' });
    }
    effects.push(auditEffect(state, 'Idle', event));
    return { next: 'Idle', effects };
  }

  // APP_QUIT is a graceful close from any "active" state.
  if (event.type === 'APP_QUIT') {
    if (
      state === 'Idle' ||
      state === 'Counting' ||
      state === 'OfflineStopped'
    ) {
      return simple('Idle', state, event);
    }
    // For everything else, close the active session and move to Idle. This
    // is a deliberate quit (the user confirmed "Stop & Quit"), so it ends the
    // session like a normal stop — 'crash_recover' is reserved for the boot
    // sweep that closes sessions a crash / force-kill left open.
    return {
      next: 'Idle',
      effects: [
        { kind: 'force_close_active', reason: 'user_stop' },
        auditEffect(state, 'Idle', event),
      ],
    };
  }

  switch (state) {
    case 'Idle':
      if (event.type === 'PICK_CONTRACT') return simple('Counting', state, event);
      // The orchestrator has already reopened the session row and loaded its
      // context; the machine only moves to Paused (no session effects).
      if (event.type === 'RESTORE_SESSION') return simple('Paused', state, event);
      return ignore(state);

    case 'Counting':
      if (event.type === 'PICK_CONTRACT') return simple('Counting', state, event);
      if (event.type === 'CLEAR_PICK') return simple('Idle', state, event);
      if (event.type === 'START') {
        return {
          next: 'Running',
          // contractId/taskId are filled in by the orchestrator from its own
          // `pickedContract` memory — the transition function only knows the
          // abstract shape of the effect.
          effects: [
            { kind: 'open_session', contractId: '', taskId: '' },
            auditEffect(state, 'Running', event),
          ],
        };
      }
      return ignore(state);

    case 'Running':
      if (event.type === 'PAUSE') return simple('Paused', state, event);
      if (event.type === 'STOP') {
        return {
          next: 'Idle',
          effects: [
            { kind: 'close_session', reason: event.reason },
            auditEffect(state, 'Idle', event),
          ],
        };
      }
      if (event.type === 'BREAK_START') {
        // Guard: paid break requires remaining allowance. If not, ignore —
        // the caller should have raised DTT-ERR-BREAK.01 before dispatching.
        if (event.kind === 'paid' && ctx.paidBreakRemainingSeconds <= 0) {
          return ignore(state);
        }
        const next: TimerState =
          event.kind === 'paid' ? 'OnBreakPaid' : 'OnBreakUnpaid';
        return {
          next,
          effects: [
            { kind: 'open_break', breakKind: event.kind },
            auditEffect(state, next, event),
          ],
        };
      }
      if (event.type === 'IDLE_DETECTED') {
        return {
          next: 'IdleSoftPaused',
          effects: [
            {
              kind: 'open_idle_event',
              startedAt: event.idleStartedAt,
              seconds: event.idleSeconds,
            },
            auditEffect(state, 'IdleSoftPaused', event),
          ],
        };
      }
      if (event.type === 'OFFLINE_LIMIT_EXCEEDED') {
        return {
          next: 'OfflineStopped',
          effects: [
            { kind: 'close_session', reason: 'offline_stop' },
            auditEffect(state, 'OfflineStopped', event),
          ],
        };
      }
      if (event.type === 'DISPUTE_OPENED') {
        return {
          next: 'LockedDisputed',
          effects: [
            { kind: 'open_dispute_lock', disputeId: event.disputeId },
            auditEffect(state, 'LockedDisputed', event),
          ],
        };
      }
      if (event.type === 'TAKE_OVER_PUSHED_FROM_OTHER_DEVICE') {
        return {
          next: 'Idle',
          effects: [
            { kind: 'close_session', reason: 'take_over' },
            auditEffect(state, 'Idle', event),
          ],
        };
      }
      if (event.type === 'SYSTEM_SUSPEND' || event.type === 'SYSTEM_LOCK') {
        return simple('Paused', state, event);
      }
      return ignore(state);

    case 'Paused':
      if (event.type === 'RESUME') return simple('Running', state, event);
      if (event.type === 'STOP') {
        return {
          next: 'Idle',
          effects: [
            { kind: 'close_session', reason: event.reason },
            auditEffect(state, 'Idle', event),
          ],
        };
      }
      if (event.type === 'BREAK_START') {
        if (event.kind === 'paid' && ctx.paidBreakRemainingSeconds <= 0) {
          return ignore(state);
        }
        const next: TimerState =
          event.kind === 'paid' ? 'OnBreakPaid' : 'OnBreakUnpaid';
        return {
          next,
          effects: [
            { kind: 'open_break', breakKind: event.kind },
            auditEffect(state, next, event),
          ],
        };
      }
      if (event.type === 'DISPUTE_OPENED') {
        return {
          next: 'LockedDisputed',
          effects: [
            { kind: 'open_dispute_lock', disputeId: event.disputeId },
            auditEffect(state, 'LockedDisputed', event),
          ],
        };
      }
      return ignore(state);

    case 'OnBreakPaid':
    case 'OnBreakUnpaid':
      if (event.type === 'BREAK_END') {
        return {
          next: 'Running',
          effects: [{ kind: 'close_break' }, auditEffect(state, 'Running', event)],
        };
      }
      if (event.type === 'STOP') {
        return {
          next: 'Idle',
          effects: [
            { kind: 'close_break' },
            { kind: 'close_session', reason: event.reason },
            auditEffect(state, 'Idle', event),
          ],
        };
      }
      if (event.type === 'DISPUTE_OPENED') {
        return {
          next: 'LockedDisputed',
          effects: [
            { kind: 'close_break' },
            { kind: 'open_dispute_lock', disputeId: event.disputeId },
            auditEffect(state, 'LockedDisputed', event),
          ],
        };
      }
      return ignore(state);

    case 'IdleSoftPaused':
      if (event.type === 'IDLE_RESOLVED') {
        const next: TimerState =
          event.resolution === 'convert_to_break' ? 'OnBreakUnpaid' : 'Running';
        const effects: Effect[] = [
          { kind: 'resolve_idle', resolution: event.resolution },
        ];
        if (event.resolution === 'convert_to_break') {
          effects.push({ kind: 'open_break', breakKind: 'unpaid' });
        }
        effects.push(auditEffect(state, next, event));
        return { next, effects };
      }
      if (event.type === 'STOP') {
        return {
          next: 'Idle',
          effects: [
            { kind: 'close_session', reason: event.reason },
            auditEffect(state, 'Idle', event),
          ],
        };
      }
      return ignore(state);

    case 'OfflineStopped':
      if (event.type === 'STOP') return simple('Idle', state, event);
      if (event.type === 'NETWORK_ONLINE') return ignore(state);
      return ignore(state);

    case 'LockedDisputed':
      if (event.type === 'DISPUTE_CLOSED') {
        return {
          next: 'Paused',
          effects: [
            { kind: 'close_dispute_lock' },
            auditEffect(state, 'Paused', event),
          ],
        };
      }
      return ignore(state);

    default: {
      // Exhaustiveness guard — TypeScript will complain if a state is unhandled.
      const _exhaustive: never = state;
      return { next: _exhaustive, effects: [] };
    }
  }
}

// -----------------------------------------------------------------------------
// Helper constructors
// -----------------------------------------------------------------------------

function simple(
  next: TimerState,
  from: TimerState,
  event: TimerEvent,
): TransitionResult {
  return { next, effects: [auditEffect(from, next, event)] };
}

function ignore(state: TimerState): TransitionResult {
  return { next: state, effects: [] };
}

function auditEffect(
  from: TimerState,
  to: TimerState,
  event: TimerEvent,
): Effect {
  return { kind: 'audit', from, to, event };
}

// -----------------------------------------------------------------------------
// Optional factory so callers can pin an initial state (used by tests and by
// the orchestrator when restoring from disk after an app restart).
// -----------------------------------------------------------------------------

export function createTimerMachine(initial: TimerState = 'Idle'): {
  getState(): TimerState;
  send(event: TimerEvent, ctx: Ctx): TransitionResult;
} {
  let current: TimerState = initial;
  return {
    getState: () => current,
    send(event: TimerEvent, ctx: Ctx): TransitionResult {
      const result = transition(current, event, ctx);
      current = result.next;
      return result;
    },
  };
}
