// PMCM-285: a payout that fails before execution must release its hold
// (payout.failed → earnings-service restores available_balance), and nothing
// that never held funds may publish payout.failed.
import { PayoutService } from './payout.service';
import { PayoutQueueProcessor } from './payout-queue.processor';
import { MagicLinkService } from '../magic-link/magic-link.service';
import { PayoutStatus, PayoutTrigger } from '../entities/payout-request.entity';
import { MethodType } from '../entities/deposit-method.entity';

const PAYOUT_ID = '11111111-1111-4111-8111-111111111111';
const CONTRACTOR = 'contractor-1';

function queuedPayout(overrides: Record<string, unknown> = {}) {
  return {
    id: PAYOUT_ID,
    contractorId: CONTRACTOR,
    amountUsd: '80.00000000',
    currency: 'USD',
    status: PayoutStatus.QUEUED,
    trigger: PayoutTrigger.MANUAL,
    verifiedAt: new Date(),
    depositMethod: { methodType: MethodType.BANK_STRIPE },
    ...overrides,
  };
}

function makeService(opts: { available?: string; kyc?: Record<string, unknown>; affected?: number } = {}) {
  const svc = Object.create(PayoutService.prototype) as PayoutService;
  const deps = {
    logger: { warn: jest.fn(), error: jest.fn(), log: jest.fn() },
    payoutRepo: {
      findOne: jest.fn().mockResolvedValue(queuedPayout()),
      update: jest.fn().mockResolvedValue({ affected: opts.affected ?? 1 }),
    },
    earningsClient: { getBalance: jest.fn().mockResolvedValue({ availableBalance: opts.available ?? '20.00' }) },
    kycClient: { getStatus: jest.fn().mockResolvedValue(opts.kyc ?? { suspended: false, firstPayoutHold: false }) },
    auditService: { log: jest.fn().mockResolvedValue(undefined) },
    publisher: { publishPayoutFailed: jest.fn().mockResolvedValue(undefined) },
  };
  Object.assign(svc, deps);
  return { svc, ...deps };
}

describe('execution-time balance re-check (PMCM-285 A/B)', () => {
  it('passes a withdrawal of more than half the balance, since its amount is already held', async () => {
    // $100 balance, $80 withdrawal: $20 left after the hold.
    const { svc, publisher, payoutRepo } = makeService({ available: '20.00' });
    await expect(svc.recheckBalanceAtExecution(CONTRACTOR, PAYOUT_ID, 80)).resolves.toBe(true);
    expect(payoutRepo.update).not.toHaveBeenCalled();
    expect(publisher.publishPayoutFailed).not.toHaveBeenCalled();
  });

  it('passes a withdrawal of the whole balance', async () => {
    const { svc } = makeService({ available: '0.00' });
    await expect(svc.recheckBalanceAtExecution(CONTRACTOR, PAYOUT_ID, 100)).resolves.toBe(true);
  });

  it('fails a clawed-back balance and releases the hold', async () => {
    const { svc, publisher, payoutRepo } = makeService({ available: '-5.00' });
    await expect(svc.recheckBalanceAtExecution(CONTRACTOR, PAYOUT_ID, 80)).resolves.toBe(false);
    expect(payoutRepo.update).toHaveBeenCalledWith(
      { id: PAYOUT_ID, status: PayoutStatus.QUEUED },
      expect.objectContaining({ status: PayoutStatus.FAILED }),
    );
    expect(publisher.publishPayoutFailed).toHaveBeenCalledWith(expect.objectContaining({
      payoutRequestId: PAYOUT_ID,
      contractorId: CONTRACTOR,
      amount: '80.00000000',
      failureCode: 'ERR_INSUFFICIENT_BALANCE_AT_EXECUTION',
    }));
  });

  it('throws when earnings-service is unreachable, so the job retries', async () => {
    const { svc, earningsClient, publisher } = makeService();
    earningsClient.getBalance.mockRejectedValue(new Error('ECONNREFUSED'));
    await expect(svc.recheckBalanceAtExecution(CONTRACTOR, PAYOUT_ID, 80)).rejects.toThrow('ECONNREFUSED');
    expect(publisher.publishPayoutFailed).not.toHaveBeenCalled();
  });
});

describe('execution-time KYC re-check (PMCM-285 B)', () => {
  it.each([
    [{ suspended: true, firstPayoutHold: false }, 'ERR_KYC_SUSPENDED_AT_EXECUTION'],
    [{ suspended: false, firstPayoutHold: true }, 'ERR_KYC_HOLD_AT_EXECUTION'],
  ])('fails %o, stores a sentence and releases the hold', async (kyc, code) => {
    const { svc, publisher, payoutRepo } = makeService({ kyc });
    await expect(svc.recheckKycAtExecution(CONTRACTOR, PAYOUT_ID)).resolves.toBe(false);
    const stored = payoutRepo.update.mock.calls[0][1].failureReason as string;
    expect(stored).not.toMatch(/^KYC_|^ERR_/);
    expect(stored).toMatch(/back in your available balance/);
    expect(publisher.publishPayoutFailed).toHaveBeenCalledWith(expect.objectContaining({ failureCode: code }));
  });
});

describe('failHeldPayoutBeforeExecution', () => {
  it('does not publish when the payout is no longer QUEUED (cancelled meanwhile)', async () => {
    const { svc, publisher } = makeService({ affected: 0 });
    await expect(svc.failHeldPayoutBeforeExecution(PAYOUT_ID, 'r', 'ERR_X')).resolves.toBe(false);
    expect(publisher.publishPayoutFailed).not.toHaveBeenCalled();
  });
});

describe('queue processor re-check errors (PMCM-285 C)', () => {
  function makeProcessor() {
    const payoutService = {
      recheckBalanceAtExecution: jest.fn().mockRejectedValue(new Error('timeout')),
      recheckKycAtExecution: jest.fn().mockResolvedValue(true),
      failHeldPayoutBeforeExecution: jest.fn().mockResolvedValue(true),
    };
    const bankExecutor = { executeBankPayout: jest.fn() };
    const notifier = { notifySubmitted: jest.fn() };
    const processor = new PayoutQueueProcessor(
      { findOne: jest.fn().mockResolvedValue(queuedPayout()) } as any,
      {} as any, {} as any, bankExecutor as any, {} as any,
      // G9: an open verification gate, so these specs exercise the PMCM-285 re-check path
      payoutService as any, { guardBeforeProvider: jest.fn().mockResolvedValue(true), failBeforeProvider: jest.fn() } as any, notifier as any,
    );
    return { processor, payoutService, bankExecutor };
  }
  const job = (attemptsMade: number) =>
    ({ data: { payoutRequestId: PAYOUT_ID }, attemptsMade, opts: { attempts: 3 } }) as any;

  it('rethrows on an early attempt so Bull retries, without failing the payout', async () => {
    const { processor, payoutService, bankExecutor } = makeProcessor();
    await expect(processor.handleProcessPayout(job(0))).rejects.toThrow('timeout');
    expect(payoutService.failHeldPayoutBeforeExecution).not.toHaveBeenCalled();
    expect(bankExecutor.executeBankPayout).not.toHaveBeenCalled();
  });

  it('fails the payout and releases the hold on the last attempt', async () => {
    const { processor, payoutService, bankExecutor } = makeProcessor();
    await expect(processor.handleProcessPayout(job(2))).resolves.toBeUndefined();
    expect(payoutService.failHeldPayoutBeforeExecution).toHaveBeenCalledWith(
      PAYOUT_ID, expect.any(String), 'ERR_EXECUTION_PRECHECK_UNAVAILABLE',
    );
    expect(bankExecutor.executeBankPayout).not.toHaveBeenCalled();
  });
});

describe('cancelling a queued scheduled payout', () => {
  function makeCancel(jobs: unknown[]) {
    const svc = Object.create(PayoutService.prototype) as PayoutService;
    const publisher = {
      publishPayoutFailed: jest.fn().mockResolvedValue(undefined),
      publishPayoutCancelled: jest.fn().mockResolvedValue(undefined),
    };
    const em = { update: jest.fn().mockResolvedValue({ affected: 1 }) };
    Object.assign(svc, {
      logger: { warn: jest.fn(), error: jest.fn(), log: jest.fn() },
      payoutRepo: {
        findOne: jest.fn().mockResolvedValue(
          queuedPayout({ trigger: PayoutTrigger.SCHEDULED, verifiedAt: null }),
        ),
      },
      dataSource: { transaction: (fn: (e: unknown) => unknown) => fn(em) },
      auditService: { log: jest.fn().mockResolvedValue(undefined) },
      queue: { getJobs: jest.fn().mockResolvedValue(jobs) },
      publisher,
    });
    return { svc, publisher };
  }

  it('releases its hold even though it never set verifiedAt', async () => {
    const job = { data: { payoutRequestId: PAYOUT_ID }, remove: jest.fn().mockResolvedValue(undefined) };
    const { svc, publisher } = makeCancel([job]);
    await svc.cancel(CONTRACTOR, PAYOUT_ID);
    expect(job.remove).toHaveBeenCalled();
    expect(publisher.publishPayoutFailed).toHaveBeenCalledWith(expect.objectContaining({
      payoutRequestId: PAYOUT_ID, amount: '80.00000000',
    }));
  });

  it('does not credit a pre-#586 scheduled payout that was never enqueued or held', async () => {
    const { svc, publisher } = makeCancel([]);
    await svc.cancel(CONTRACTOR, PAYOUT_ID);
    expect(publisher.publishPayoutFailed).not.toHaveBeenCalled();
    expect(publisher.publishPayoutCancelled).toHaveBeenCalled();
  });
});

describe('magic-link expiry (PMCM-285 D)', () => {
  function makeMagicLink(affected: number) {
    const svc = Object.create(MagicLinkService.prototype) as MagicLinkService;
    const publisher = {
      publishPayoutFailed: jest.fn().mockResolvedValue(undefined),
      publishPayoutCancelled: jest.fn().mockResolvedValue(undefined),
    };
    Object.assign(svc, {
      logger: { warn: jest.fn(), error: jest.fn(), log: jest.fn() },
      payoutRepo: {
        find: jest.fn().mockResolvedValue([
          queuedPayout({ status: PayoutStatus.PENDING_VERIFICATION, verifiedAt: null }),
        ]),
      },
      verificationRepo: { findOne: jest.fn().mockResolvedValue({ expiresAt: new Date(Date.now() - 1000) }) },
      dataSource: {
        transaction: (fn: (e: unknown) => unknown) => fn({ update: jest.fn().mockResolvedValue({ affected }) }),
      },
      auditService: { log: jest.fn().mockResolvedValue(undefined) },
      publisher,
    });
    return { svc, publisher };
  }

  it('cancels without publishing payout.failed, which would credit a hold that never existed', async () => {
    const { svc, publisher } = makeMagicLink(1);
    await svc.cancelExpiredVerifications();
    expect(publisher.publishPayoutFailed).not.toHaveBeenCalled();
    expect(publisher.publishPayoutCancelled).toHaveBeenCalledWith(
      expect.objectContaining({ payoutRequestId: PAYOUT_ID, reason: 'magic_link_expired' }),
    );
  });

  it('leaves a payout alone if it was confirmed while the job ran', async () => {
    const { svc, publisher } = makeMagicLink(0);
    await svc.cancelExpiredVerifications();
    expect(publisher.publishPayoutCancelled).not.toHaveBeenCalled();
  });
});
