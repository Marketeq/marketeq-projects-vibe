import { InternalServerErrorException } from '@nestjs/common'
import { PayoutStatus } from '../entities/payout-request.entity';
import { PayoutExecutionGate, VERIFICATION_REQUIRED_AT_EXECUTION } from './payout-execution-gate.service';
import { IdentityVerificationUnavailableException, VerificationRequiredException } from './identity-gate.exceptions';
import { PayoutQueueProcessor } from '../payout/payout-queue.processor';
import { MethodType } from '../entities/deposit-method.entity';

const OPEN = { gateOpen: true, missingRequirements: 'none' };
const CLOSED = { gateOpen: false, missingRequirements: 'identity' };

function makeGate(check: jest.Mock) {
  const repo = { update: jest.fn(async () => ({ affected: 1 })) };
  const audit = { log: jest.fn(async () => undefined) };
  const publisher = { publishPayoutFailed: jest.fn(async () => undefined) };
  const gate = new PayoutExecutionGate({ checkGate: check } as any, repo as any, audit as any, publisher as any);
  return { gate, repo, audit, publisher };
}

const queued = (over: any = {}) => ({
  id: 'p1', contractorId: 'c1', amountUsd: '100', currency: 'USD', status: PayoutStatus.QUEUED,
  providerReference: null, externalTransactionId: null, depositMethod: { methodType: MethodType.BANK_STRIPE }, ...over,
});

describe('PayoutExecutionGate (G9)', () => {
  it('open (verified or grace): proceeds, nothing written', async () => {
    const { gate, repo, publisher } = makeGate(jest.fn(async () => OPEN));
    expect(await gate.guardBeforeProvider(queued() as any, 'dequeue')).toBe(true);
    expect(repo.update).not.toHaveBeenCalled();
    expect(publisher.publishPayoutFailed).not.toHaveBeenCalled();
  });

  it('closed before any provider contact: FAILED with a reason, audited, reservation released once', async () => {
    const { gate, repo, audit, publisher } = makeGate(jest.fn(async () => CLOSED));
    expect(await gate.guardBeforeProvider(queued() as any, 'dequeue')).toBe(false);
    expect(repo.update).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ status: PayoutStatus.FAILED, failureReason: VERIFICATION_REQUIRED_AT_EXECUTION }));
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'payout.verification_blocked', newStatus: PayoutStatus.FAILED }));
    expect(publisher.publishPayoutFailed).toHaveBeenCalledTimes(1);
  });

  it('a redelivered job cannot publish the release twice', async () => {
    const { gate, repo, publisher } = makeGate(jest.fn(async () => CLOSED));
    repo.update.mockResolvedValueOnce({ affected: 1 }).mockResolvedValueOnce({ affected: 0 });
    await gate.guardBeforeProvider(queued() as any, 'dequeue');
    await gate.guardBeforeProvider(queued() as any, 'dequeue');
    expect(publisher.publishPayoutFailed).toHaveBeenCalledTimes(1);
  });

  it('closed on a re-run (a provider call may have happened): never fails or releases', async () => {
    const { gate, repo, audit, publisher } = makeGate(jest.fn(async () => CLOSED));
    for (const p of [queued({ status: PayoutStatus.PROCESSING }), queued({ providerReference: 'po_1' }), queued({ externalTransactionId: 'tx' })]) {
      expect(await gate.guardBeforeProvider(p as any, 'bank.start')).toBe(false);
    }
    expect(repo.update).not.toHaveBeenCalled();
    expect(publisher.publishPayoutFailed).not.toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'payout.verification_blocked_on_retry' }));
  });

  it.each([
    ['timeout', new Error('Timeout has occurred')],
    ['no consumer', new Error('no consumer')],
    ['malformed reply', new IdentityVerificationUnavailableException()],
  ])('unanswered gate (%s): throws unavailable, no state change, no provider', async (_n, err) => {
    const { gate, repo, publisher } = makeGate(jest.fn(async () => { throw err; }));
    await expect(gate.guardBeforeProvider(queued() as any, 'dequeue')).rejects.toBeInstanceOf(IdentityVerificationUnavailableException);
    await expect(gate.assertOpen('c1')).rejects.toBeInstanceOf(IdentityVerificationUnavailableException);
    expect(repo.update).not.toHaveBeenCalled();
    expect(publisher.publishPayoutFailed).not.toHaveBeenCalled();
  });

  it('assertOpen: closed throws the verification-required error the popup expects', async () => {
    const { gate } = makeGate(jest.fn(async () => CLOSED));
    await expect(gate.assertOpen('c1')).rejects.toBeInstanceOf(VerificationRequiredException);
  });

  it('allowProviderCall: first run throws (executor fails + releases), re-run stops quietly', async () => {
    const { gate, repo } = makeGate(jest.fn(async () => CLOSED));
    await expect(gate.allowProviderCall(queued() as any, 'bank.transfer', false)).rejects.toMatchObject({ errorCode: VERIFICATION_REQUIRED_AT_EXECUTION });
    expect(await gate.allowProviderCall(queued() as any, 'bank.transfer', true)).toBe(false);
    expect(repo.update).not.toHaveBeenCalled();
  });
});

describe('PayoutQueueProcessor gate at dequeue (G9)', () => {
  function build(check: jest.Mock, payout: any = queued()) {
    const { gate, repo, publisher } = makeGate(check);
    const payoutRepo = { findOne: jest.fn(async () => payout) };
    const exec = { executeBankPayout: jest.fn(), executeCryptoPayout: jest.fn(), executeCardPayout: jest.fn() };
    const svc = { recheckBalanceAtExecution: jest.fn(async () => true), recheckKycAtExecution: jest.fn(async () => true) };
    const proc = new PayoutQueueProcessor(payoutRepo as any, exec as any, exec as any, exec as any, publisher as any, svc as any, gate);
    return { proc, exec, svc, repo, publisher };
  }
  const job = (attemptsMade = 0) => ({ data: { payoutRequestId: 'p1' }, attemptsMade, opts: { attempts: 3 } }) as any;

  it('gate closed after confirmation but before dequeue: no executor, no balance recheck, reservation released', async () => {
    const { proc, exec, svc, publisher } = build(jest.fn(async () => CLOSED));
    await proc.handleProcessPayout(job());
    expect(exec.executeBankPayout).not.toHaveBeenCalled();
    expect(svc.recheckBalanceAtExecution).not.toHaveBeenCalled();
    expect(publisher.publishPayoutFailed).toHaveBeenCalledTimes(1);
  });

  it('verified or grace-period account proceeds to the executor', async () => {
    const { proc, exec } = build(jest.fn(async () => OPEN));
    await proc.handleProcessPayout(job());
    expect(exec.executeBankPayout).toHaveBeenCalledWith('p1');
  });

  it('unanswered gate: job is retried (throws) and nothing changes, until the last attempt', async () => {
    const check = jest.fn(async () => { throw new InternalServerErrorException('Timeout has occurred'); });
    const { proc, exec, repo, publisher } = build(check);
    await expect(proc.handleProcessPayout(job(0))).rejects.toBeInstanceOf(IdentityVerificationUnavailableException);
    await expect(proc.handleProcessPayout(job(1))).rejects.toBeInstanceOf(IdentityVerificationUnavailableException);
    expect(repo.update).not.toHaveBeenCalled();
    expect(exec.executeBankPayout).not.toHaveBeenCalled();
    // final attempt: failed + released, still no provider call
    await proc.handleProcessPayout(job(2));
    expect(repo.update).toHaveBeenCalledTimes(1);
    expect(publisher.publishPayoutFailed).toHaveBeenCalledTimes(1);
    expect(exec.executeBankPayout).not.toHaveBeenCalled();
  });

  it('queue redelivery of an already-settled payout does nothing (no second payout, no second release)', async () => {
    for (const status of [PayoutStatus.COMPLETED, PayoutStatus.FAILED]) {
      const { proc, exec, publisher } = build(jest.fn(async () => OPEN), queued({ status }));
      await proc.handleProcessPayout(job());
      expect(exec.executeBankPayout).not.toHaveBeenCalled();
      expect(publisher.publishPayoutFailed).not.toHaveBeenCalled();
    }
  });

  it('a payout already PROCESSING and now blocked is left alone (no release while money may be in flight)', async () => {
    const { proc, exec, repo, publisher } = build(jest.fn(async () => CLOSED), queued({ status: PayoutStatus.PROCESSING }));
    await proc.handleProcessPayout(job());
    expect(exec.executeBankPayout).not.toHaveBeenCalled();
    expect(repo.update).not.toHaveBeenCalled();
    expect(publisher.publishPayoutFailed).not.toHaveBeenCalled();
  });
});
