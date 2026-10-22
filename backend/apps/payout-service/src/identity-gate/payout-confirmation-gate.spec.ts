import { PayoutStatus } from '../entities/payout-request.entity';

const redisStore = new Map<string, string>();
jest.mock('ioredis', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    get: jest.fn(async (k: string) => redisStore.get(k) ?? null),
    del: jest.fn(async (k: string) => (redisStore.delete(k) ? 1 : 0)),
    set: jest.fn(),
  })),
}));

import * as crypto from 'crypto';
import { MagicLinkService } from '../magic-link/magic-link.service';
import { PayoutExecutionGate } from './payout-execution-gate.service';
import { IdentityVerificationUnavailableException, VerificationRequiredException } from './identity-gate.exceptions';

const OPEN = { gateOpen: true, missingRequirements: 'none' };
const CLOSED = { gateOpen: false, missingRequirements: 'identity' };
const TOKEN = 'raw-token';
const hash = crypto.createHash('sha256').update(TOKEN).digest('hex');

function build(check: jest.Mock) {
  redisStore.clear();
  redisStore.set(`magiclink:${hash}`, JSON.stringify({ payoutRequestId: 'p1' }));
  const payout = {
    id: 'p1', contractorId: 'c1', status: PayoutStatus.PENDING_VERIFICATION, amountUsd: '100', netAmountUsd: '100', feeUsd: '0',
    currency: 'USD', depositMethod: { methodType: 'BANK_STRIPE', displayLabel: 'Bank' },
  };
  const payoutRepo = { findOne: jest.fn(async () => payout) };
  const verificationRepo = { update: jest.fn(async () => ({})), findOne: jest.fn(async () => null) };
  const audit = { log: jest.fn(async () => undefined) };
  const earnings = { holdBalance: jest.fn(async () => true) };
  const dataSource = { transaction: jest.fn(async (fn: any) => fn({ update: jest.fn() })) };
  const gate = new PayoutExecutionGate({ checkGate: check } as any, {} as any, audit as any, {} as any);
  const svc = new MagicLinkService(
    verificationRepo as any, payoutRepo as any, {} as any, dataSource as any,
    { get: (_k: string, d?: any) => d } as any, audit as any, {} as any, {} as any, earnings as any, gate,
  );
  return { svc, earnings, verificationRepo, audit, dataSource };
}

describe('email confirmation re-checks the gate (G9)', () => {
  it('open at creation, closed at confirmation: blocked, balance never held, link stays valid', async () => {
    const { svc, earnings, verificationRepo, dataSource } = build(jest.fn(async () => CLOSED));
    await expect(svc.verifyEmailToken(TOKEN, 'p1')).rejects.toBeInstanceOf(VerificationRequiredException);
    expect(earnings.holdBalance).not.toHaveBeenCalled();
    expect(dataSource.transaction).not.toHaveBeenCalled();
    expect(verificationRepo.update).not.toHaveBeenCalled(); // not marked used
    expect(redisStore.has(`magiclink:${hash}`)).toBe(true); // not consumed: usable once verified
  });

  it('blocked confirmation is audited, with no status change', async () => {
    const { svc, audit } = build(jest.fn(async () => CLOSED));
    await expect(svc.verifyEmailToken(TOKEN, 'p1')).rejects.toBeDefined();
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'payout.verification_blocked', previousStatus: PayoutStatus.PENDING_VERIFICATION, newStatus: PayoutStatus.PENDING_VERIFICATION }));
  });

  it.each([['timeout', new Error('Timeout has occurred')], ['no consumer', new Error('no consumer')], ['malformed', new IdentityVerificationUnavailableException()]])(
    'unanswered gate (%s): fails closed, no hold, token not consumed',
    async (_n, err) => {
      const { svc, earnings } = build(jest.fn(async () => { throw err; }));
      await expect(svc.verifyEmailToken(TOKEN, 'p1')).rejects.toBeInstanceOf(IdentityVerificationUnavailableException);
      expect(earnings.holdBalance).not.toHaveBeenCalled();
      expect(redisStore.has(`magiclink:${hash}`)).toBe(true);
    },
  );

  it('verified / grace-period account: confirmed, balance held, queued', async () => {
    const { svc, earnings } = build(jest.fn(async () => OPEN));
    const res = await svc.verifyEmailToken(TOKEN, 'p1');
    expect(res.status).toBe('verified');
    expect(earnings.holdBalance).toHaveBeenCalledWith('c1', '100');
    expect(redisStore.has(`magiclink:${hash}`)).toBe(false);
  });

  it('uses the contractor stored on the payout record, never request data', async () => {
    const check = jest.fn(async () => OPEN);
    const { svc } = build(check);
    await svc.verifyEmailToken(TOKEN, 'p1');
    expect(check).toHaveBeenCalledWith('c1');
  });
});
