// A split scheduled payout pays each leg (primary, secondary) AT MOST ONCE, however it is retried.
//
// Every leg has a deterministic idempotency key (schedule + due occurrence + role) and
// payout_requests.idempotency_key is UNIQUE. A second pass - the next tick, a restarted process,
// a queue redelivery, a second worker, or a retry after the verification gate was unreachable or
// closed between the two legs - finds the leg that already exists and resumes at the unfinished
// one. The schedule only advances once the occurrence is finished.
//
// The in-memory stores below enforce the same uniqueness the database does, and a shared state
// object lets two cron instances ("workers" / "after a restart") see the same rows.
jest.mock('ioredis', () => ({ __esModule: true, default: jest.fn().mockImplementation(() => ({ set: jest.fn(), del: jest.fn() })) }));

import { InternalServerErrorException } from '@nestjs/common';
import { ScheduleExecutionCron, legIdempotencyKey } from './schedule-execution.cron';
import { SplitCalculatorService } from './split-calculator.service';
import { PayoutExecutionGate } from '../identity-gate/payout-execution-gate.service';
import { ScheduleFrequency } from '../entities/payout-schedule.entity';
import { PayoutStatus } from '../entities/payout-request.entity';
import { MethodType, VerificationStatus } from '../entities/deposit-method.entity';

const OPEN = { gateOpen: true, missingRequirements: 'none' };
const CLOSED = { gateOpen: false, missingRequirements: 'identity' };
const DOWN = () => { throw new InternalServerErrorException('Timeout has occurred'); };

const OCCURRENCE = new Date('2026-10-12T12:00:00.000Z');
const NEXT = new Date('2026-10-19T12:00:00.000Z');

function world(opts: { split?: boolean; balance?: number } = {}) {
  const schedule: any = {
    id: 's1', contractorId: 'c1', isActive: true, pausedAt: null, pauseReason: null, frequency: ScheduleFrequency.WEEKLY,
    dayOfWeek: 1, dayOfMonth: null, anchorDate: new Date('2026-01-01'), createdAt: new Date('2026-01-01'), customIntervalDays: null,
    primaryMethodId: 'm1', secondaryMethodId: 'm2', splitEnabled: opts.split !== false, primarySplitPercent: '60.00',
    nextExecutionAt: OCCURRENCE, reserveUsd: '0', splitOccurrenceAt: null, splitSecondaryUsd: null, consecutiveMissCount: 0,
  };
  const payouts = new Map<string, any>();
  const state = {
    schedule, payouts, balance: opts.balance ?? 1000, holds: [] as string[], enqueued: [] as string[], released: [] as any[],
    holdResults: [] as boolean[], enqueueFails: 0, saveDelay: false, crashOnAdvance: 0, retryJobs: [] as any[],
    partialFailures: 0, paused: 0, audits: [] as string[], thresholdProceed: true,
  };
  let n = 0;
  const scheduleRepo = {
    find: jest.fn(async () => [schedule]),
    findOne: jest.fn(async () => schedule),
    update: jest.fn(async (_w: any, patch: any) => { Object.assign(schedule, patch); return { affected: 1 }; }),
    save: jest.fn(async (v: any) => v),
  };
  const payoutRepo = {
    findOne: jest.fn(async ({ where }: any) => {
      if (state.saveDelay) await new Promise((r) => setImmediate(r)); // let a second worker pass its pre-check too
      return [...payouts.values()].find((p) => p.idempotencyKey === where.idempotencyKey) ?? null;
    }),
    update: jest.fn(async (id: string, patch: any) => { Object.assign(payouts.get(id), patch); }),
  };
  const dataSource = {
    transaction: jest.fn(async (fn: any) => {
      const em = {
        create: (_e: any, v: any) => ({ ...v }),
        save: async (v: any) => {
          if ([...payouts.values()].some((p) => p.idempotencyKey === v.idempotencyKey)) {
            throw Object.assign(new Error('duplicate key value violates unique constraint'), { code: '23505' });
          }
          const row = { id: `p${++n}`, ...v };
          payouts.set(row.id, row);
          return row;
        },
        update: async (_E: any, _id: string, patch: any) => { Object.assign(schedule, patch); },
      };
      return fn(em);
    }),
  };
  const methodRepo = {
    findOne: jest.fn(async ({ where }: any) => ({
      id: where.id, methodType: MethodType.WISE, verificationStatus: VerificationStatus.VERIFIED, isActive: true,
      reauthRequired: false, bankCountry: null, displayLabel: where.id === 'm1' ? 'Wise A' : 'Wise B',
    })),
  };
  const earnings = {
    holdBalance: jest.fn(async (_c: string, amount: string) => {
      const ok = state.holdResults.length ? state.holdResults.shift()! : true;
      if (!ok) return false;
      state.balance -= parseFloat(amount);
      state.holds.push(amount);
      return true;
    }),
    getBalance: jest.fn(async () => ({ availableBalance: String(state.balance) })),
  };
  const payoutService = {
    enqueueForProcessing: jest.fn(async (id: string) => {
      if (state.enqueueFails > 0) { state.enqueueFails--; throw new InternalServerErrorException('redis unavailable'); }
      state.enqueued.push(id);
    }),
  };
  const publisher = {
    publishScheduleCompleted: jest.fn(async () => undefined),
    publishSchedulePartialFailure: jest.fn(async () => { state.partialFailures++; }),
    publishPayoutFailed: jest.fn(async (e: any) => { state.released.push(e); }),
    publishSecondaryFailed: jest.fn(async () => undefined),
    publishPayoutsPaused: jest.fn(async () => undefined),
  };
  const audit = { log: jest.fn(async (e: any) => { state.audits.push(e.action); }) };
  const retryQueue = { add: jest.fn(async (_n: string, data: any, o: any) => { state.retryJobs.push({ data, o }); }) };
  const verificationPause = { pauseForVerification: jest.fn(async (s: any) => { state.paused++; s.pausedAt = new Date(); s.pauseReason = 'verification_required'; return true; }) };

  /** A new cron "worker"/process over the SAME database state. `check` answers the gate. */
  function worker(check: jest.Mock) {
    const gate = new PayoutExecutionGate({ checkGate: check } as any, {} as any, { log: jest.fn() } as any, {} as any);
    const nextExec = {
      advanceNextExecution: jest.fn(async () => {
        if (state.crashOnAdvance > 0) { state.crashOnAdvance--; throw new InternalServerErrorException('process died'); }
        schedule.nextExecutionAt = NEXT;
      }),
    };
    const cron = new ScheduleExecutionCron(
      scheduleRepo as any, payoutRepo as any, methodRepo as any, dataSource as any, { get: (_k: string, d?: any) => d } as any,
      new SplitCalculatorService(), { checkThreshold: async () => ({ proceed: state.thresholdProceed }) } as any, nextExec as any, { isHoliday: () => false } as any,
      { assertNotPaused: async () => undefined } as any, earnings as any, audit as any, publisher as any, payoutService as any,
      { checkGate: async () => ({ allowed: true }) } as any, gate, verificationPause as any, retryQueue as any,
    );
    return { cron, nextExec };
  }
  const tick = (w: { cron: ScheduleExecutionCron }) => (w.cron as any).processSchedule(schedule).catch(() => undefined);
  const legs = () => [...payouts.values()];
  const bySeq = (seq: number) => legs().filter((p) => p.splitSequence === seq);
  return { state, schedule, worker, tick, legs, bySeq, earnings, payoutService, publisher, retryQueue, verificationPause, payoutRepo };
}

const open = () => jest.fn(async () => OPEN);

describe('split scheduled payouts: each leg at most once', () => {
  describe('the happy path and partial failure', () => {
    it('pays primary 60% then secondary 40%, once each, then advances and clears the recorded plan', async () => {
      const w = world();
      await w.tick(w.worker(open()));
      expect(w.bySeq(1)).toHaveLength(1);
      expect(w.bySeq(2)).toHaveLength(1);
      expect(w.bySeq(1)[0].amountUsd).toBe('600.00000000');
      expect(w.bySeq(2)[0].amountUsd).toBe('400.00000000');
      expect(w.state.enqueued).toHaveLength(2);
      expect(w.schedule.nextExecutionAt).toEqual(NEXT);
      expect(w.schedule.splitOccurrenceAt).toBeNull();
      expect(w.schedule.splitSecondaryUsd).toBeNull();
    });

    it('primary succeeds, secondary fails: primary is not repeated, a keyed retry is queued, the schedule advances', async () => {
      const w = world();
      w.state.holdResults = [true, false]; // secondary hold refused
      await w.tick(w.worker(open()));
      expect(w.bySeq(1)).toHaveLength(1);
      expect(w.bySeq(2)).toHaveLength(0);
      expect(w.state.partialFailures).toBe(1);
      expect(w.state.retryJobs).toHaveLength(1);
      expect(w.state.retryJobs[0].data).toMatchObject({ scheduleId: 's1', amountUSD: 400, attempt: 1, occurrence: OCCURRENCE.toISOString() });
      expect(w.state.retryJobs[0].o.jobId).toContain(OCCURRENCE.toISOString());
      expect(w.schedule.nextExecutionAt).toEqual(NEXT);
      // a later tick is a new occurrence and does not pay the old primary again
      expect(w.state.holds.filter((h) => h === '600.00000000')).toHaveLength(1);
    });
  });

  describe('verification between the two legs', () => {
    it('gate unanswered before the secondary: primary created once, schedule stays due; the next tick pays only the secondary at its ORIGINAL amount', async () => {
      const w = world();
      const check = jest.fn()
        .mockResolvedValueOnce(OPEN)   // primary
        .mockImplementationOnce(DOWN)  // secondary: unanswered
        .mockResolvedValue(OPEN);
      const worker = w.worker(check);

      await w.tick(worker);
      expect(w.bySeq(1)).toHaveLength(1);
      expect(w.bySeq(2)).toHaveLength(0);
      expect(w.schedule.nextExecutionAt).toEqual(OCCURRENCE);        // not advanced: still due
      expect(w.schedule.pausedAt).toBeNull();                         // unanswered is not a pause
      expect(w.schedule.splitOccurrenceAt).toEqual(OCCURRENCE);       // plan persisted with the primary
      expect(w.schedule.splitSecondaryUsd).toBe('400.00000000');

      await w.tick(worker);                                           // the next 30-minute tick
      expect(w.bySeq(1)).toHaveLength(1);                             // primary NOT repeated
      expect(w.bySeq(2)).toHaveLength(1);
      expect(w.bySeq(2)[0].amountUsd).toBe('400.00000000');          // not re-sized from the reduced balance
      expect(w.state.holds).toEqual(['600.00000000', '400.00000000']);
      expect(w.schedule.nextExecutionAt).toEqual(NEXT);
      expect(w.schedule.splitOccurrenceAt).toBeNull();
    });

    it('the resumed secondary is paid even when what is left is under the threshold or the reserve', async () => {
      const w = world();
      const check = jest.fn().mockResolvedValueOnce(OPEN).mockImplementationOnce(DOWN).mockResolvedValue(OPEN);
      const worker = w.worker(check);
      await w.tick(worker);
      expect(w.bySeq(2)).toHaveLength(0);

      w.state.thresholdProceed = false; // the remaining balance no longer clears the schedule's threshold
      await w.tick(worker);
      expect(w.bySeq(2)).toHaveLength(1);
      expect(w.bySeq(2)[0].amountUsd).toBe('400.00000000');
      expect(w.bySeq(1)).toHaveLength(1);
    });

    it('a long gate outage never repeats the primary: many ticks, still one primary and no secondary', async () => {
      const w = world();
      const check = jest.fn().mockResolvedValueOnce(OPEN).mockImplementation(DOWN);
      const worker = w.worker(check);
      for (let i = 0; i < 6; i++) await w.tick(worker);
      expect(w.bySeq(1)).toHaveLength(1);
      expect(w.bySeq(2)).toHaveLength(0);
      expect(w.state.holds).toEqual(['600.00000000']);
      expect(w.state.enqueued).toHaveLength(1);
      expect(w.schedule.pausedAt).toBeNull();
    });

    it('gate closes between the legs: the schedule is paused, the secondary is not paid, the primary is not repeated', async () => {
      const w = world();
      const check = jest.fn().mockResolvedValueOnce(OPEN).mockResolvedValue(CLOSED);
      const worker = w.worker(check);

      await w.tick(worker);
      expect(w.bySeq(1)).toHaveLength(1);
      expect(w.bySeq(2)).toHaveLength(0);
      expect(w.verificationPause.pauseForVerification).toHaveBeenCalledTimes(1);
      expect(w.schedule.pausedAt).toBeInstanceOf(Date);
      expect(w.schedule.isActive).toBe(true);                         // paused, never cancelled
      expect(w.schedule.nextExecutionAt).toEqual(OCCURRENCE);

      await w.tick(worker);                                           // even a forced second pass
      expect(w.bySeq(1)).toHaveLength(1);
      expect(w.state.holds).toEqual(['600.00000000']);
      expect(w.bySeq(2)).toHaveLength(0);
    });

    it('the gate is checked again before EACH payment that moves money', async () => {
      const w = world();
      const check = open();
      await w.tick(w.worker(check));
      expect(check).toHaveBeenCalledTimes(2);
    });
  });

  describe('queue redelivery, restart and concurrent workers', () => {
    it('process dies after both legs were created but before the schedule advanced: the restarted process pays nothing again', async () => {
      const w = world();
      w.state.crashOnAdvance = 2; // finishSplit and the error handler both fail: nothing was recorded as finished
      await w.tick(w.worker(open()));
      expect(w.legs()).toHaveLength(2);
      expect(w.schedule.nextExecutionAt).toEqual(OCCURRENCE);

      await w.tick(w.worker(open()));                                  // new process, same database
      expect(w.legs()).toHaveLength(2);
      expect(w.state.holds).toEqual(['600.00000000', '400.00000000']);
      expect(w.state.enqueued).toHaveLength(2);
      expect(w.schedule.nextExecutionAt).toEqual(NEXT);
    });

    it('process dies after the primary only: the restart resumes at the secondary', async () => {
      const w = world();
      const dies = jest.fn().mockResolvedValueOnce(OPEN).mockImplementation(DOWN);
      await w.tick(w.worker(dies));
      expect(w.bySeq(1)).toHaveLength(1);

      await w.tick(w.worker(open()));
      expect(w.bySeq(1)).toHaveLength(1);
      expect(w.bySeq(2)).toHaveLength(1);
      expect(w.state.holds).toEqual(['600.00000000', '400.00000000']);
    });

    it('two workers racing for the same occurrence create each leg once; the loser releases its extra hold', async () => {
      const w = world();
      w.state.saveDelay = true;
      const a = w.worker(open());
      const b = w.worker(open());
      await Promise.all([w.tick(a), w.tick(b)]);

      expect(w.bySeq(1)).toHaveLength(1);
      expect(w.bySeq(2).length).toBeLessThanOrEqual(1);
      expect(new Set(w.legs().map((p) => p.idempotencyKey)).size).toBe(w.legs().length);
      // every hold that did not become a payment was released
      const kept = w.legs().reduce((s, p) => s + parseFloat(p.amountUsd), 0);
      const held = w.state.holds.reduce((s, h) => s + parseFloat(h), 0);
      const released = w.state.released.reduce((s, e) => s + parseFloat(e.amount), 0);
      expect(held - released).toBeCloseTo(kept, 8);
      expect(w.state.enqueued).toHaveLength(w.legs().length);

      // and a third pass finishes the occurrence without creating anything new
      await w.tick(w.worker(open()));
      expect(w.legs().length).toBeLessThanOrEqual(2);
      expect(w.bySeq(1)).toHaveLength(1);
    });

    it('a repeated tick over an already-queued occurrence creates and holds nothing new', async () => {
      const w = world();
      const worker = w.worker(open());
      w.state.crashOnAdvance = 2;
      await w.tick(worker);
      const holds = w.state.holds.length;
      await w.tick(worker);
      await w.tick(worker);
      expect(w.state.holds.length).toBe(holds);
      expect(w.legs()).toHaveLength(2);
    });
  });

  describe('provider timeout / ambiguous outcome', () => {
    it('a primary already PROCESSING with a provider reference is never created or enqueued again', async () => {
      const w = world();
      const dies = jest.fn().mockResolvedValueOnce(OPEN).mockImplementation(DOWN);
      await w.tick(w.worker(dies));
      const primary = w.bySeq(1)[0];
      Object.assign(primary, { status: PayoutStatus.PROCESSING, providerReference: 'tr_ambiguous', providerStatus: 'timeout' });

      await w.tick(w.worker(open()));
      expect(w.bySeq(1)).toHaveLength(1);
      expect(w.bySeq(1)[0]).toMatchObject({ status: PayoutStatus.PROCESSING, providerReference: 'tr_ambiguous' });
      expect(w.state.enqueued.filter((id) => id === primary.id)).toHaveLength(1);
      expect(w.state.holds.filter((h) => h === '600.00000000')).toHaveLength(1);
      expect(w.bySeq(2)).toHaveLength(1);
    });

    it('a primary that ended FAILED closes the occurrence: no secondary, no second primary', async () => {
      const w = world();
      const dies = jest.fn().mockResolvedValueOnce(OPEN).mockImplementation(DOWN);
      await w.tick(w.worker(dies));
      w.bySeq(1)[0].status = PayoutStatus.FAILED;

      await w.tick(w.worker(open()));
      expect(w.legs()).toHaveLength(1);
      expect(w.bySeq(2)).toHaveLength(0);
      expect(w.schedule.nextExecutionAt).toEqual(NEXT);
    });

    it('the row saved but the queue was unreachable: the hold is released and the row is marked FAILED, not left looking live', async () => {
      const w = world();
      w.state.enqueueFails = 1;
      await w.tick(w.worker(open()));
      expect(w.bySeq(1)).toHaveLength(1);
      expect(w.bySeq(1)[0].status).toBe(PayoutStatus.FAILED);
      expect(w.state.released).toHaveLength(1);
      expect(w.bySeq(2)).toHaveLength(0);                              // a failed primary skips the secondary, as before
      expect(w.schedule.nextExecutionAt).toEqual(NEXT);
    });
  });

  describe('non-split scheduled payout', () => {
    it('a re-run of the same occurrence after a crash does not pay again', async () => {
      const w = world({ split: false });
      w.state.crashOnAdvance = 2;
      await w.tick(w.worker(open()));
      expect(w.legs()).toHaveLength(1);
      await w.tick(w.worker(open()));
      expect(w.legs()).toHaveLength(1);
      expect(w.state.holds).toHaveLength(1);
      expect(w.state.enqueued).toHaveLength(1);
      expect(w.schedule.nextExecutionAt).toEqual(NEXT);
    });
  });

  describe('secondary retry job', () => {
    const job = (over: any = {}) => ({ id: 'j1', data: { scheduleId: 's1', secondaryMethodId: 'm2', amountUSD: 400, attempt: 1, occurrence: OCCURRENCE.toISOString(), ...over } }) as any;

    it('a redelivered job (stalled / restarted worker) pays the secondary once', async () => {
      const w = world();
      const worker = w.worker(open());
      await (worker.cron as any).handleSecondaryRetry(job());
      await (worker.cron as any).handleSecondaryRetry(job());
      expect(w.bySeq(2)).toHaveLength(1);
      expect(w.state.holds).toEqual(['400.00000000']);
      expect(w.state.enqueued).toHaveLength(1);
    });

    it('an unanswered gate re-queues the SAME attempt instead of ending the chain silently', async () => {
      const w = world();
      const worker = w.worker(jest.fn(DOWN as any));
      await (worker.cron as any).handleSecondaryRetry(job());
      expect(w.bySeq(2)).toHaveLength(0);
      expect(w.state.retryJobs).toHaveLength(1);
      expect(w.state.retryJobs[0].data).toMatchObject({ attempt: 1, gateWaits: 1 });
      expect(w.state.audits).not.toContain('schedule.secondary.failed');
    });

    it('an outage that never clears is handed to finance after a bounded number of waits', async () => {
      const w = world();
      const worker = w.worker(jest.fn(DOWN as any));
      await (worker.cron as any).handleSecondaryRetry(job({ gateWaits: 12 }));
      expect(w.state.retryJobs).toHaveLength(0);
      expect(w.state.audits).toContain('schedule.secondary.failed');
      expect(w.publisher.publishSecondaryFailed).toHaveBeenCalledTimes(1);
      expect(w.bySeq(2)).toHaveLength(0);
    });

    it('a closed gate pauses and ends the chain without paying or re-queuing', async () => {
      const w = world();
      const worker = w.worker(jest.fn(async () => CLOSED));
      await (worker.cron as any).handleSecondaryRetry(job());
      expect(w.verificationPause.pauseForVerification).toHaveBeenCalledTimes(1);
      expect(w.bySeq(2)).toHaveLength(0);
      expect(w.state.retryJobs).toHaveLength(0);
    });

    it('each attempt has its own key: attempt 2 is a different payment from attempt 1', async () => {
      const w = world();
      const worker = w.worker(open());
      w.state.holdResults = [false]; // attempt 1's hold refused -> failed, queues attempt 2
      await (worker.cron as any).handleSecondaryRetry(job({ attempt: 1 }));
      expect(w.state.retryJobs[0].data.attempt).toBe(2);
      await (worker.cron as any).handleSecondaryRetry(job({ attempt: 2 }));
      expect(w.bySeq(2)).toHaveLength(1);
    });
  });

  describe('legIdempotencyKey', () => {
    it('is deterministic, UUID-shaped, and differs by schedule, occurrence and role', () => {
      const k = legIdempotencyKey('s1', OCCURRENCE.toISOString(), 'primary');
      expect(k).toBe(legIdempotencyKey('s1', OCCURRENCE.toISOString(), 'primary'));
      expect(k).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      const others = [
        legIdempotencyKey('s2', OCCURRENCE.toISOString(), 'primary'),
        legIdempotencyKey('s1', NEXT.toISOString(), 'primary'),
        legIdempotencyKey('s1', OCCURRENCE.toISOString(), 'secondary'),
      ];
      for (const o of others) expect(o).not.toBe(k);
    });
  });
});
