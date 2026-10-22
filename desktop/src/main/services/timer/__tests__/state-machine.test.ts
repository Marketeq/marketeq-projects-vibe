// src/main/services/timer/__tests__/state-machine.test.ts
//
// Exhaustive transition coverage for the 9-state timer FSM.
// Reference: doc 20 §4 (transition table) and §5 (Mermaid diagram).
//
// Every test should either:
//   a) assert a (state, event) -> next pair; or
//   b) assert the set of effects produced.

import { describe, it, expect } from 'vitest';
import {
  transition,
  createTimerMachine,
  ALL_STATES,
  type Ctx,
  type TimerState,
  type TimerEvent,
} from '../state-machine';

const ctxNone: Ctx = { hasActiveSession: false, paidBreakRemainingSeconds: 0 };
const ctxPaid: Ctx = { hasActiveSession: true, paidBreakRemainingSeconds: 1800 };
const ctxActive: Ctx = { hasActiveSession: true, paidBreakRemainingSeconds: 0 };

describe('timer state machine — transitions', () => {
  // ---------------------------------------------------------------------------
  // Idle
  // ---------------------------------------------------------------------------
  describe('from Idle', () => {
    it('PICK_CONTRACT -> Counting', () => {
      const r = transition(
        'Idle',
        { type: 'PICK_CONTRACT', contractId: 'con_a', taskId: 'tsk_a' },
        ctxNone,
      );
      expect(r.next).toBe('Counting');
      expect(r.effects.some((e) => e.kind === 'audit')).toBe(true);
    });

    it('ignores unrelated events', () => {
      const ignored: TimerEvent[] = [
        { type: 'PAUSE' },
        { type: 'RESUME' },
        { type: 'BREAK_END' },
        { type: 'NETWORK_OFFLINE', since: 0 },
      ];
      for (const e of ignored) {
        const r = transition('Idle', e, ctxNone);
        expect(r.next).toBe('Idle');
        expect(r.effects).toHaveLength(0);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Counting
  // ---------------------------------------------------------------------------
  describe('from Counting', () => {
    it('PICK_CONTRACT -> Counting (re-pick)', () => {
      const r = transition(
        'Counting',
        { type: 'PICK_CONTRACT', contractId: 'con_b', taskId: 'tsk_b' },
        ctxNone,
      );
      expect(r.next).toBe('Counting');
    });

    it('CLEAR_PICK -> Idle', () => {
      const r = transition('Counting', { type: 'CLEAR_PICK' }, ctxNone);
      expect(r.next).toBe('Idle');
    });

    it('START -> Running with open_session effect', () => {
      const r = transition('Counting', { type: 'START' }, ctxNone);
      expect(r.next).toBe('Running');
      expect(r.effects.some((e) => e.kind === 'open_session')).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Running
  // ---------------------------------------------------------------------------
  describe('from Running', () => {
    it('PAUSE -> Paused', () => {
      const r = transition('Running', { type: 'PAUSE' }, ctxActive);
      expect(r.next).toBe('Paused');
    });

    it('STOP -> Idle and closes session', () => {
      const r = transition(
        'Running',
        { type: 'STOP', reason: 'user_stop' },
        ctxActive,
      );
      expect(r.next).toBe('Idle');
      expect(
        r.effects.some(
          (e) => e.kind === 'close_session' && e.reason === 'user_stop',
        ),
      ).toBe(true);
    });

    it('BREAK_START(paid) with remaining allowance -> OnBreakPaid', () => {
      const r = transition(
        'Running',
        { type: 'BREAK_START', kind: 'paid' },
        ctxPaid,
      );
      expect(r.next).toBe('OnBreakPaid');
      expect(
        r.effects.some(
          (e) => e.kind === 'open_break' && e.breakKind === 'paid',
        ),
      ).toBe(true);
    });

    it('BREAK_START(paid) with no allowance is ignored (guard)', () => {
      const r = transition(
        'Running',
        { type: 'BREAK_START', kind: 'paid' },
        ctxActive,
      );
      expect(r.next).toBe('Running');
      expect(r.effects).toHaveLength(0);
    });

    it('BREAK_START(unpaid) is unconditional -> OnBreakUnpaid', () => {
      const r = transition(
        'Running',
        { type: 'BREAK_START', kind: 'unpaid' },
        ctxActive,
      );
      expect(r.next).toBe('OnBreakUnpaid');
    });

    it('IDLE_DETECTED -> IdleSoftPaused and opens idle event', () => {
      const r = transition(
        'Running',
        { type: 'IDLE_DETECTED', idleStartedAt: 1000, idleSeconds: 300 },
        ctxActive,
      );
      expect(r.next).toBe('IdleSoftPaused');
      const idleEff = r.effects.find((e) => e.kind === 'open_idle_event');
      expect(idleEff).toBeDefined();
      if (idleEff && idleEff.kind === 'open_idle_event') {
        expect(idleEff.seconds).toBe(300);
      }
    });

    it('OFFLINE_LIMIT_EXCEEDED -> OfflineStopped with offline_stop close', () => {
      const r = transition(
        'Running',
        { type: 'OFFLINE_LIMIT_EXCEEDED' },
        ctxActive,
      );
      expect(r.next).toBe('OfflineStopped');
      expect(
        r.effects.some(
          (e) => e.kind === 'close_session' && e.reason === 'offline_stop',
        ),
      ).toBe(true);
    });

    it('DISPUTE_OPENED -> LockedDisputed', () => {
      const r = transition(
        'Running',
        { type: 'DISPUTE_OPENED', disputeId: 'dsp_a', sessionId: 'ses_a' },
        ctxActive,
      );
      expect(r.next).toBe('LockedDisputed');
      expect(r.effects.some((e) => e.kind === 'open_dispute_lock')).toBe(true);
    });

    it('TAKE_OVER_PUSHED_FROM_OTHER_DEVICE -> Idle and closes with take_over', () => {
      const r = transition(
        'Running',
        { type: 'TAKE_OVER_PUSHED_FROM_OTHER_DEVICE' },
        ctxActive,
      );
      expect(r.next).toBe('Idle');
      expect(
        r.effects.some(
          (e) => e.kind === 'close_session' && e.reason === 'take_over',
        ),
      ).toBe(true);
    });

    it('SYSTEM_SUSPEND -> Paused (auto pause)', () => {
      const r = transition('Running', { type: 'SYSTEM_SUSPEND' }, ctxActive);
      expect(r.next).toBe('Paused');
    });

    it('SYSTEM_LOCK -> Paused (auto pause)', () => {
      const r = transition('Running', { type: 'SYSTEM_LOCK' }, ctxActive);
      expect(r.next).toBe('Paused');
    });
  });

  // ---------------------------------------------------------------------------
  // Paused
  // ---------------------------------------------------------------------------
  describe('from Paused', () => {
    it('RESUME -> Running', () => {
      const r = transition('Paused', { type: 'RESUME' }, ctxActive);
      expect(r.next).toBe('Running');
    });

    it('STOP -> Idle', () => {
      const r = transition(
        'Paused',
        { type: 'STOP', reason: 'user_stop' },
        ctxActive,
      );
      expect(r.next).toBe('Idle');
    });

    it('BREAK_START(unpaid) -> OnBreakUnpaid', () => {
      const r = transition(
        'Paused',
        { type: 'BREAK_START', kind: 'unpaid' },
        ctxActive,
      );
      expect(r.next).toBe('OnBreakUnpaid');
    });

    it('DISPUTE_OPENED -> LockedDisputed', () => {
      const r = transition(
        'Paused',
        { type: 'DISPUTE_OPENED', disputeId: 'dsp_a', sessionId: 'ses_a' },
        ctxActive,
      );
      expect(r.next).toBe('LockedDisputed');
    });
  });

  // ---------------------------------------------------------------------------
  // OnBreakPaid / OnBreakUnpaid
  // ---------------------------------------------------------------------------
  describe('from OnBreakPaid', () => {
    it('BREAK_END -> Running and closes break', () => {
      const r = transition('OnBreakPaid', { type: 'BREAK_END' }, ctxActive);
      expect(r.next).toBe('Running');
      expect(r.effects.some((e) => e.kind === 'close_break')).toBe(true);
    });

    it('STOP -> Idle and closes both break and session', () => {
      const r = transition(
        'OnBreakPaid',
        { type: 'STOP', reason: 'user_stop' },
        ctxActive,
      );
      expect(r.next).toBe('Idle');
      expect(r.effects.some((e) => e.kind === 'close_break')).toBe(true);
      expect(r.effects.some((e) => e.kind === 'close_session')).toBe(true);
    });
  });

  describe('from OnBreakUnpaid', () => {
    it('BREAK_END -> Running', () => {
      const r = transition('OnBreakUnpaid', { type: 'BREAK_END' }, ctxActive);
      expect(r.next).toBe('Running');
    });

    it('DISPUTE_OPENED -> LockedDisputed and closes break', () => {
      const r = transition(
        'OnBreakUnpaid',
        { type: 'DISPUTE_OPENED', disputeId: 'dsp_a', sessionId: 'ses_a' },
        ctxActive,
      );
      expect(r.next).toBe('LockedDisputed');
      expect(r.effects.some((e) => e.kind === 'close_break')).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // IdleSoftPaused
  // ---------------------------------------------------------------------------
  describe('from IdleSoftPaused', () => {
    it('IDLE_RESOLVED(keep) -> Running', () => {
      const r = transition(
        'IdleSoftPaused',
        { type: 'IDLE_RESOLVED', resolution: 'keep' },
        ctxActive,
      );
      expect(r.next).toBe('Running');
      expect(r.effects.some((e) => e.kind === 'resolve_idle')).toBe(true);
    });

    it('IDLE_RESOLVED(discard) -> Running', () => {
      const r = transition(
        'IdleSoftPaused',
        { type: 'IDLE_RESOLVED', resolution: 'discard' },
        ctxActive,
      );
      expect(r.next).toBe('Running');
    });

    it('IDLE_RESOLVED(convert_to_break) -> OnBreakUnpaid and opens break', () => {
      const r = transition(
        'IdleSoftPaused',
        { type: 'IDLE_RESOLVED', resolution: 'convert_to_break' },
        ctxActive,
      );
      expect(r.next).toBe('OnBreakUnpaid');
      expect(
        r.effects.some(
          (e) => e.kind === 'open_break' && e.breakKind === 'unpaid',
        ),
      ).toBe(true);
    });

    it('STOP -> Idle', () => {
      const r = transition(
        'IdleSoftPaused',
        { type: 'STOP', reason: 'idle_discard' },
        ctxActive,
      );
      expect(r.next).toBe('Idle');
    });
  });

  // ---------------------------------------------------------------------------
  // OfflineStopped
  // ---------------------------------------------------------------------------
  describe('from OfflineStopped', () => {
    it('STOP -> Idle', () => {
      const r = transition(
        'OfflineStopped',
        { type: 'STOP', reason: 'user_stop' },
        ctxNone,
      );
      expect(r.next).toBe('Idle');
    });

    it('NETWORK_ONLINE is ignored (user must explicitly stop then restart)', () => {
      const r = transition('OfflineStopped', { type: 'NETWORK_ONLINE' }, ctxNone);
      expect(r.next).toBe('OfflineStopped');
    });
  });

  // ---------------------------------------------------------------------------
  // LockedDisputed
  // ---------------------------------------------------------------------------
  describe('from LockedDisputed', () => {
    it('DISPUTE_CLOSED -> Paused (never directly Running)', () => {
      const r = transition(
        'LockedDisputed',
        { type: 'DISPUTE_CLOSED', disputeId: 'dsp_a' },
        ctxActive,
      );
      expect(r.next).toBe('Paused');
      expect(r.effects.some((e) => e.kind === 'close_dispute_lock')).toBe(true);
    });

    it('ignores STOP while locked', () => {
      const r = transition(
        'LockedDisputed',
        { type: 'STOP', reason: 'user_stop' },
        ctxActive,
      );
      expect(r.next).toBe('LockedDisputed');
    });
  });

  // ---------------------------------------------------------------------------
  // FORCED_SIGN_OUT — highest priority, from any state
  // ---------------------------------------------------------------------------
  describe('FORCED_SIGN_OUT', () => {
    it('trumps every state -> Idle', () => {
      for (const s of ALL_STATES) {
        const r = transition(s as TimerState, { type: 'FORCED_SIGN_OUT' }, ctxActive);
        expect(r.next).toBe('Idle');
      }
    });

    it('emits force_close_active only when a session was active', () => {
      const withSession = transition(
        'Running',
        { type: 'FORCED_SIGN_OUT' },
        ctxActive,
      );
      expect(
        withSession.effects.some((e) => e.kind === 'force_close_active'),
      ).toBe(true);

      const withoutSession = transition(
        'Idle',
        { type: 'FORCED_SIGN_OUT' },
        ctxNone,
      );
      expect(
        withoutSession.effects.some((e) => e.kind === 'force_close_active'),
      ).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // APP_QUIT
  // ---------------------------------------------------------------------------
  describe('APP_QUIT', () => {
    it('closes active session when quit from Running', () => {
      const r = transition('Running', { type: 'APP_QUIT' }, ctxActive);
      expect(r.next).toBe('Idle');
      expect(r.effects.some((e) => e.kind === 'force_close_active')).toBe(true);
    });

    it('no-op close from Idle', () => {
      const r = transition('Idle', { type: 'APP_QUIT' }, ctxNone);
      expect(r.next).toBe('Idle');
      expect(r.effects.some((e) => e.kind === 'force_close_active')).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // RESTORE_SESSION (crash recovery, DTT-US-132)
  // ---------------------------------------------------------------------------
  describe('RESTORE_SESSION', () => {
    const restore: TimerEvent = { type: 'RESTORE_SESSION', sessionId: 'ses_1' };

    it('Idle -> Paused, never Running, with no session effects (the row is already reopened)', () => {
      const r = transition('Idle', restore, ctxActive);
      expect(r.next).toBe('Paused');
      expect(r.effects.every((e) => e.kind === 'audit')).toBe(true);
    });

    it('is ignored from every other state', () => {
      for (const s of ALL_STATES.filter((x) => x !== 'Idle')) {
        const r = transition(s, restore, ctxActive);
        expect(r.next, s).toBe(s);
        expect(r.effects, s).toHaveLength(0);
      }
    });
  });
});

// -----------------------------------------------------------------------------
// Machine wrapper (stateful helper)
// -----------------------------------------------------------------------------

describe('createTimerMachine wrapper', () => {
  it('threads state through send()', () => {
    const m = createTimerMachine();
    expect(m.getState()).toBe('Idle');

    m.send(
      { type: 'PICK_CONTRACT', contractId: 'con_a', taskId: 'tsk_a' },
      ctxNone,
    );
    expect(m.getState()).toBe('Counting');

    m.send({ type: 'START' }, ctxNone);
    expect(m.getState()).toBe('Running');

    m.send({ type: 'PAUSE' }, ctxActive);
    expect(m.getState()).toBe('Paused');

    m.send({ type: 'RESUME' }, ctxActive);
    expect(m.getState()).toBe('Running');

    m.send({ type: 'STOP', reason: 'user_stop' }, ctxActive);
    expect(m.getState()).toBe('Idle');
  });

  it('can be seeded from a non-Idle state (for restart recovery)', () => {
    const m = createTimerMachine('Running');
    expect(m.getState()).toBe('Running');
    const r = m.send({ type: 'PAUSE' }, ctxActive);
    expect(r.next).toBe('Paused');
    expect(m.getState()).toBe('Paused');
  });
});
