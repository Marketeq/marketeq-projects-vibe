jest.mock('ioredis', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({ set: jest.fn(async () => 'OK'), del: jest.fn(async () => 1) })),
}));

import { IsNull } from 'typeorm';
import { ScheduleVerificationPauseService, PAUSE_REASON_VERIFICATION } from '../schedule/schedule-verification-pause.service';
import { ScheduleExecutionCron } from '../schedule/schedule-execution.cron';
import { GateChangedConsumer } from '../consumers/gate-changed.consumer';
import { PayoutExecutionGate } from './payout-execution-gate.service';
import { NextExecutionService } from '../schedule/next-execution.service';
import { AchInitiationCalculatorService } from '../schedule/ach-initiation-calculator.service';
import { ScheduleFrequency } from '../entities/payout-schedule.entity';
import { MethodType, VerificationStatus } from '../entities/deposit-method.entity';

const OPEN = { gateOpen: true, missingRequirements: 'none' };
const CLOSED = { gateOpen: false, missingRequirements: 'identity' };

// An in-memory payout_schedules table honouring the conditional updates the service issues.
function table(rows: any[]) {
  const match = (row: any, where: any) =>
    Object.entries(where).every(([k, v]: [string, any]) =>
      v && typeof v === 'object' && v._type === 'isNull' ? row[k] == null : row[k] === v);
  return {
    rows,
    find: jest.fn(async ({ where }: any) => rows.filter((r) => match(r, where))),
    update: jest.fn(async (where: any, patch: any) => {
      const hit = rows.filter((r) => match(r, where));
      hit.forEach((r) => Object.assign(r, patch));
      return { affected: hit.length };
    }),
  };
}

const sched = (over: any = {}) => ({
  id: 's1', contractorId: 'c1', isActive: true, pausedAt: null, pauseReason: null, frequency: ScheduleFrequency.WEEKLY,
  dayOfWeek: 1, dayOfMonth: null, anchorDate: new Date('2026-01-01'), createdAt: new Date('2026-01-01'), customIntervalDays: null,
  primaryMethodId: 'm1', nextExecutionAt: new Date(Date.now() - 3600_000), reserveUsd: '0', splitEnabled: false, ...over,
});

function pauseSvc(rows: any[]) {
  const t = table(rows);
  const audit = { log: jest.fn(async () => undefined) };
  const publisher = { publishPayoutsPaused: jest.fn(async () => undefined) };
  const methodRepo = { findOne: jest.fn(async () => ({ id: 'm1', methodType: MethodType.WISE, bankCountry: null })) };
  const next = new NextExecutionService({} as any, new AchInitiationCalculatorService());
  const svc = new ScheduleVerificationPauseService(t as any, methodRepo as any, next, audit as any, publisher as any);
  return { svc, t, audit, publisher };
}

describe('ScheduleVerificationPauseService (G9)', () => {
  it('pauses (never cancels) and keeps the whole configuration', async () => {
    const row = sched();
    const before = { ...row };
    const { svc } = pauseSvc([row]);
    expect(await svc.pauseForVerification(row as any)).toBe(true);
    expect(row.pausedAt).toBeInstanceOf(Date);
    expect(row.pauseReason).toBe(PAUSE_REASON_VERIFICATION);
    expect(row.isActive).toBe(true);
    for (const k of ['frequency', 'dayOfWeek', 'dayOfMonth', 'primaryMethodId', 'reserveUsd', 'splitEnabled', 'nextExecutionAt', 'anchorDate'] as const) {
      expect((row as any)[k]).toEqual((before as any)[k]);
    }
  });

  it('sends exactly one notification however many times the scheduler hits it', async () => {
    const row = sched();
    const { svc, publisher } = pauseSvc([row]);
    const results = await Promise.all([svc.pauseForVerification(row as any), svc.pauseForVerification(row as any)]);
    await svc.pauseForVerification(row as any);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(publisher.publishPayoutsPaused).toHaveBeenCalledTimes(1);
    expect(publisher.publishPayoutsPaused).toHaveBeenCalledWith('c1', expect.objectContaining({
      reason: PAUSE_REASON_VERIFICATION, message: 'Your scheduled payout did not run because account verification is required.',
    }));
  });

  it('resumes only verification-paused schedules; others stay paused', async () => {
    const paused = new Date(Date.now() - 86400_000);
    const verification = sched({ id: 'v', pausedAt: paused, pauseReason: PAUSE_REASON_VERIFICATION });
    const other = sched({ id: 'o', pausedAt: paused, pauseReason: 'user_paused' });
    const legacy = sched({ id: 'l', pausedAt: paused, pauseReason: null });
    const inactive = sched({ id: 'i', pausedAt: paused, pauseReason: PAUSE_REASON_VERIFICATION, isActive: false });
    const otherUser = sched({ id: 'x', contractorId: 'c2', pausedAt: paused, pauseReason: PAUSE_REASON_VERIFICATION });
    const { svc } = pauseSvc([verification, other, legacy, inactive, otherUser]);
    expect(await svc.resumeForVerification('c1')).toBe(1);
    expect(verification.pausedAt).toBeNull();
    expect(verification.pauseReason).toBeNull();
    expect(other.pausedAt).toEqual(paused);
    expect(other.pauseReason).toBe('user_paused');
    expect(legacy.pausedAt).toEqual(paused);
    expect(inactive.pausedAt).toEqual(paused);
    expect(otherUser.pausedAt).toEqual(paused);
  });

  it('resume does not create a catch-up payout: an overdue date moves to the next configured occurrence', async () => {
    const overdue = new Date(Date.now() - 10 * 86400_000);
    const row = sched({ pausedAt: new Date(), pauseReason: PAUSE_REASON_VERIFICATION, nextExecutionAt: overdue });
    const { svc } = pauseSvc([row]);
    await svc.resumeForVerification('c1');
    expect(row.nextExecutionAt.getTime()).toBeGreaterThan(Date.now());
    expect(row.frequency).toBe(ScheduleFrequency.WEEKLY);
  });

  it('resume keeps a future due date as it was, and a repeat resumes nothing', async () => {
    const future = new Date(Date.now() + 2 * 86400_000);
    const row = sched({ pausedAt: new Date(), pauseReason: PAUSE_REASON_VERIFICATION, nextExecutionAt: future });
    const { svc, audit } = pauseSvc([row]);
    expect(await svc.resumeForVerification('c1')).toBe(1);
    expect(row.nextExecutionAt).toEqual(future);
    expect(await svc.resumeForVerification('c1')).toBe(0);
    expect(audit.log).toHaveBeenCalledTimes(1);
  });
});

describe('scheduled payout cron gate (G9)', () => {
  function cron(rows: any[], check: jest.Mock, balance = 500) {
    const { svc, publisher, t } = pauseSvc(rows);
    const earnings = { holdBalance: jest.fn(async () => true), getBalance: jest.fn(async () => ({ availableBalance: String(balance) })) };
    const payoutService = { enqueueForProcessing: jest.fn(async () => undefined) };
    const dataSource = { transaction: jest.fn(async (fn: any) => fn({ create: (_e: any, v: any) => v, save: async (v: any) => ({ id: 'pay1', ...v }) })) };
    const gate = new PayoutExecutionGate({ checkGate: check } as any, {} as any, { log: jest.fn() } as any, {} as any);
    const nextExec = { advanceNextExecution: jest.fn(async () => undefined) };
    const methodRepo = { findOne: jest.fn(async () => ({
      id: 'm1', methodType: MethodType.WISE, verificationStatus: VerificationStatus.VERIFIED, isActive: true, reauthRequired: false, bankCountry: null, displayLabel: 'Wise',
    })) };
    const c = new ScheduleExecutionCron(
      t as any, {} as any, methodRepo as any, dataSource as any, { get: (_k: string, d?: any) => d } as any,
      {} as any, { checkThreshold: async () => ({ proceed: true }) } as any, nextExec as any, { isHoliday: () => false } as any,
      { assertNotPaused: async () => undefined } as any, earnings as any, { log: jest.fn() } as any,
      { publishScheduleCompleted: jest.fn(), publishPayoutFailed: jest.fn() } as any, payoutService as any,
      { checkGate: async () => ({ allowed: true }) } as any, gate, svc, { add: jest.fn() } as any,
    );
    return { c, earnings, payoutService, nextExec, publisher, t };
  }

  it('gate closed: payout does not run, schedule paused (not cancelled), balance untouched, one notification across ticks', async () => {
    const row = sched();
    const { c, earnings, payoutService, publisher, nextExec } = cron([row], jest.fn(async () => CLOSED));
    await (c as any).processSchedule(row);
    expect(earnings.holdBalance).not.toHaveBeenCalled();
    expect(payoutService.enqueueForProcessing).not.toHaveBeenCalled();
    expect(nextExec.advanceNextExecution).not.toHaveBeenCalled();
    expect(row.pausedAt).toBeInstanceOf(Date);
    expect(row.isActive).toBe(true);
    expect(row.frequency).toBe(ScheduleFrequency.WEEKLY);
    // later ticks no longer even select it, and a forced repeat does not notify again
    await (c as any).processSchedule(row);
    expect(publisher.publishPayoutsPaused).toHaveBeenCalledTimes(1);
  });

  it.each([['timeout', new Error('Timeout has occurred')], ['no consumer', new Error('no consumer')]])(
    'gate unanswered (%s): nothing runs, nothing paused, nothing advanced - the next tick retries',
    async (_n, err) => {
      const row = sched();
      const { c, earnings, payoutService, publisher, nextExec } = cron([row], jest.fn(async () => { throw err; }));
      await (c as any).processSchedule(row);
      expect(earnings.holdBalance).not.toHaveBeenCalled();
      expect(payoutService.enqueueForProcessing).not.toHaveBeenCalled();
      expect(publisher.publishPayoutsPaused).not.toHaveBeenCalled();
      expect(nextExec.advanceNextExecution).not.toHaveBeenCalled();
      expect(row.pausedAt).toBeNull();
    },
  );

  it('verified / grace-period account: the scheduled payout runs and the schedule continues', async () => {
    const row = sched();
    const { c, earnings, payoutService, nextExec } = cron([row], jest.fn(async () => OPEN));
    await (c as any).processSchedule(row);
    expect(earnings.holdBalance).toHaveBeenCalledTimes(1);
    expect(payoutService.enqueueForProcessing).toHaveBeenCalledTimes(1);
    expect(nextExec.advanceNextExecution).toHaveBeenCalled();
    expect(row.pausedAt).toBeNull();
  });

  it('the master query never selects a paused or inactive schedule', async () => {
    const row = sched({ pausedAt: new Date(), pauseReason: PAUSE_REASON_VERIFICATION });
    const { c, t, earnings } = cron([row], jest.fn(async () => OPEN));
    await c.runScheduledPayouts();
    const where = t.find.mock.calls[0][0].where;
    expect(where.isActive).toBe(true);
    expect(where.pausedAt).toEqual(IsNull());
    expect(earnings.holdBalance).not.toHaveBeenCalled();
  });
});

describe('identity.gate_changed consumer (G9)', () => {
  const ctx = () => {
    const channel = { ack: jest.fn(), nack: jest.fn() };
    return { channel, context: { getChannelRef: () => channel, getMessage: () => ({}) } as any };
  };
  const consumer = (check: jest.Mock) => {
    const pause = { resumeForVerification: jest.fn(async () => 1) };
    const gate = new PayoutExecutionGate({ checkGate: check } as any, {} as any, {} as any, {} as any);
    return { c: new GateChangedConsumer(pause as any, gate), pause };
  };
  const evt = (over: any = {}) => ({ userId: 'c1', gateOpen: true, occurredAt: '2026-10-14T12:00:00.000Z', ...over });

  it('gate reopened (and confirmed open): resumes, then acks', async () => {
    const { c, pause } = consumer(jest.fn(async () => OPEN));
    const { channel, context } = ctx();
    await c.onGateChanged(evt(), context);
    expect(pause.resumeForVerification).toHaveBeenCalledWith('c1');
    expect(channel.ack).toHaveBeenCalledTimes(1);
  });

  it('a stale "open" event while the gate is closed again does not resume', async () => {
    const { c, pause } = consumer(jest.fn(async () => CLOSED));
    const { channel, context } = ctx();
    await c.onGateChanged(evt(), context);
    expect(pause.resumeForVerification).not.toHaveBeenCalled();
    expect(channel.ack).toHaveBeenCalled();
  });

  it('a closing event changes nothing here (the scheduler pauses at the moment of the run)', async () => {
    const { c, pause } = consumer(jest.fn(async () => CLOSED));
    const { channel, context } = ctx();
    await c.onGateChanged(evt({ gateOpen: false }), context);
    expect(pause.resumeForVerification).not.toHaveBeenCalled();
    expect(channel.ack).toHaveBeenCalled();
  });

  it('duplicate delivery is harmless (resume is idempotent); both are acked', async () => {
    const { c, pause } = consumer(jest.fn(async () => OPEN));
    const { channel, context } = ctx();
    await c.onGateChanged(evt(), context);
    await c.onGateChanged(evt(), context);
    expect(channel.ack).toHaveBeenCalledTimes(2);
    expect(pause.resumeForVerification).toHaveBeenCalledTimes(2);
  });

  it('cannot confirm the gate: requeued, nothing resumed', async () => {
    const { c, pause } = consumer(jest.fn(async () => { throw new Error('Timeout has occurred'); }));
    const { channel, context } = ctx();
    await c.onGateChanged(evt(), context);
    expect(pause.resumeForVerification).not.toHaveBeenCalled();
    expect(channel.nack).toHaveBeenCalledWith(expect.anything(), false, true);
    expect(channel.ack).not.toHaveBeenCalled();
  });

  it('malformed messages are dropped and acked', async () => {
    const { c, pause } = consumer(jest.fn(async () => OPEN));
    for (const bad of [null, {}, { userId: 1, gateOpen: true, occurredAt: 'x' }, evt({ gateOpen: 'yes' }), evt({ occurredAt: 'nope' })]) {
      const { channel, context } = ctx();
      await c.onGateChanged(bad as any, context);
      expect(channel.ack).toHaveBeenCalledTimes(1);
    }
    expect(pause.resumeForVerification).not.toHaveBeenCalled();
  });
});
