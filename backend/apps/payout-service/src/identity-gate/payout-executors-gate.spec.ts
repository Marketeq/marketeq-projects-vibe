import { PayoutStatus } from '../entities/payout-request.entity';
import { MethodType, VerificationStatus } from '../entities/deposit-method.entity';
import { BankPayoutExecutorService } from '../bank/bank-payout-executor.service';
import { CardPayoutExecutorService } from '../card/card-payout-executor.service';
import { CryptoPayoutExecutorService } from '../execution/crypto-payout-executor.service';
import { PayoutExecutionGate } from './payout-execution-gate.service';

const OPEN = { gateOpen: true, missingRequirements: 'none' };
const CLOSED = { gateOpen: false, missingRequirements: 'identity' };

// checkGate answers from a script: each call takes the next answer (the last repeats).
function scripted(...answers: any[]) {
  let i = 0;
  return jest.fn(async () => {
    const a = answers[Math.min(i++, answers.length - 1)];
    if (a instanceof Error) throw a;
    return a;
  });
}

function world(payoutOver: any, methodOver: any) {
  const method = {
    id: 'm1', methodType: MethodType.BANK_STRIPE, verificationStatus: VerificationStatus.VERIFIED,
    bankCountry: 'US', stripeConnectAccountId: 'acct_real', stripeExternalAccountId: 'ba_1', connectPayoutsEnabled: true,
    cardStatus: 'active', stripeCardId: 'ic_real', cardLast4: '4242', cardBalanceCap: '10000',
    cryptoProvider: 'X', cryptoNetwork: 'eth', cryptoCurrency: 'USDC', cryptoAddress: '0xabc', ...methodOver,
  };
  const payout: any = {
    id: 'p1', contractorId: 'c1', amountUsd: '100', netAmountUsd: '100', currency: 'USD', status: PayoutStatus.QUEUED,
    providerReference: null, externalTransactionId: null, retryCount: 0, depositMethod: method, ...payoutOver,
  };
  const rows: any = { status: payout.status };
  const payoutRepo = {
    findOne: jest.fn(async () => payout),
    update: jest.fn(async (_c: any, patch: any) => { Object.assign(rows, patch); return { affected: 1 }; }),
  };
  const methodRepo = { update: jest.fn(async () => ({ affected: 1 })) };
  const audit = { log: jest.fn(async () => undefined) };
  const publisher = { publishPayoutFailed: jest.fn(async () => undefined), publishPayoutCompleted: jest.fn(async () => undefined) };
  const stripe = {
    transfers: { create: jest.fn(async () => ({ id: 'tr_1' })), createReversal: jest.fn(async () => ({})) },
    payouts: { create: jest.fn(async () => ({ id: 'po_1' })) },
    testHelpers: { issuing: { cards: { fundCard: jest.fn(async () => ({ id: 'ftx_1' })) } } },
  };
  const makeGate = (check: jest.Mock) =>
    new PayoutExecutionGate({ checkGate: check } as any, payoutRepo as any, audit as any, publisher as any);
  return { payout, payoutRepo, methodRepo, audit, publisher, stripe, rows, makeGate };
}

const config = { get: (_k: string, d?: any) => d ?? '' };

function bank(w: ReturnType<typeof world>, check: jest.Mock) {
  const wise = { executeTransfer: jest.fn(async () => 'wt_1'), getQuote: jest.fn(async () => ({ quoteId: 'q' })), getWisePlatformBalanceUsd: jest.fn(async () => 1e9) };
  const exec = new BankPayoutExecutorService(
    w.payoutRepo as any, w.methodRepo as any, config as any, w.audit as any, w.publisher as any,
    wise as any, { isStripeCrossBorderCountry: () => true } as any, {} as any, w.makeGate(check),
  );
  (exec as any).stripe = w.stripe;
  (exec as any).getStripePlatformBalanceUsd = jest.fn(async () => 1e9);
  return { exec, wise };
}

describe('BankPayoutExecutor gate (G9)', () => {
  it('closed when execution starts: no Stripe call, FAILED, reservation released', async () => {
    const w = world({}, {});
    const { exec } = bank(w, scripted(CLOSED));
    await exec.executeBankPayout('p1');
    expect(w.stripe.transfers.create).not.toHaveBeenCalled();
    expect(w.stripe.payouts.create).not.toHaveBeenCalled();
    expect(w.rows.status).toBe(PayoutStatus.FAILED);
    expect(w.publisher.publishPayoutFailed).toHaveBeenCalledTimes(1);
  });

  it('gate closes before the provider call (open at start, closed before the transfer): nothing sent, failed and released', async () => {
    const w = world({}, {});
    const { exec } = bank(w, scripted(OPEN, CLOSED));
    await exec.executeBankPayout('p1');
    expect(w.stripe.transfers.create).not.toHaveBeenCalled();
    expect(w.rows.status).toBe(PayoutStatus.FAILED);
    expect(w.rows.failureReason).toMatch(/verification is required/);
    expect(w.publisher.publishPayoutFailed).toHaveBeenCalledTimes(1);
    expect(w.publisher.publishPayoutCompleted).not.toHaveBeenCalled();
  });

  it('gate closes between the two Stripe legs: transfer reversed, nothing paid out, released', async () => {
    const w = world({}, {});
    const { exec } = bank(w, scripted(OPEN, OPEN, CLOSED));
    await exec.executeBankPayout('p1');
    expect(w.stripe.transfers.create).toHaveBeenCalledTimes(1);
    expect(w.stripe.transfers.createReversal).toHaveBeenCalledWith('tr_1', expect.anything());
    expect(w.stripe.payouts.create).not.toHaveBeenCalled();
    expect(w.rows.status).toBe(PayoutStatus.FAILED);
    expect(w.publisher.publishPayoutFailed).toHaveBeenCalledTimes(1);
  });

  it('retry of an in-flight payout that is now blocked: no provider call, never failed or released', async () => {
    const w = world({ status: PayoutStatus.PROCESSING, providerReference: 'tr_1' }, {});
    const { exec } = bank(w, scripted(CLOSED));
    await exec.executeBankPayout('p1');
    expect(w.stripe.transfers.create).not.toHaveBeenCalled();
    expect(w.stripe.payouts.create).not.toHaveBeenCalled();
    expect(w.publisher.publishPayoutFailed).not.toHaveBeenCalled();
    expect(w.rows.status).toBe(PayoutStatus.PROCESSING);
  });

  it.each([['timeout', new Error('Timeout has occurred')], ['no consumer', new Error('no consumer')]])(
    'unanswered gate (%s): no money movement, balance untouched, retried later',
    async (_n, err) => {
      const w = world({}, {});
      const { exec } = bank(w, scripted(err));
      await expect(exec.executeBankPayout('p1')).rejects.toBeDefined();
      expect(w.stripe.transfers.create).not.toHaveBeenCalled();
      expect(w.publisher.publishPayoutFailed).not.toHaveBeenCalled();
      expect(w.rows.status).toBe(PayoutStatus.QUEUED);
    },
  );

  it('verified / grace-period account: both legs run', async () => {
    const w = world({}, {});
    const { exec } = bank(w, scripted(OPEN));
    await exec.executeBankPayout('p1');
    expect(w.stripe.transfers.create).toHaveBeenCalledTimes(1);
    expect(w.stripe.payouts.create).toHaveBeenCalledTimes(1);
    expect(w.publisher.publishPayoutFailed).not.toHaveBeenCalled();
  });

  it('Wise Platform path: closed before the transfer is created/funded', async () => {
    const w = world({}, { methodType: MethodType.BANK_MANUAL, bankCountry: 'IN', wisePlatformRecipientId: 'r1' });
    const { exec, wise } = bank(w, scripted(OPEN, CLOSED));
    (exec as any).feeService = { isStripeCrossBorderCountry: () => false };
    await exec.executeBankPayout('p1');
    expect(wise.executeTransfer).not.toHaveBeenCalled();
    expect(w.rows.status).toBe(PayoutStatus.FAILED);
    expect(w.publisher.publishPayoutFailed).toHaveBeenCalledTimes(1);
  });
});

describe('CardPayoutExecutor gate (G9)', () => {
  const card = (w: ReturnType<typeof world>, check: jest.Mock) => {
    const exec = new CardPayoutExecutorService(w.payoutRepo as any, w.methodRepo as any, config as any, w.audit as any, w.publisher as any, w.makeGate(check));
    (exec as any).stripe = w.stripe;
    return exec;
  };
  const m = { methodType: MethodType.MARKETEQ_DEBIT_CARD };

  it('closed: card is never funded, payout failed and released', async () => {
    const w = world({}, m);
    await card(w, scripted(CLOSED)).executeCardPayout('p1');
    expect(w.stripe.testHelpers.issuing.cards.fundCard).not.toHaveBeenCalled();
    expect(w.rows.status).toBe(PayoutStatus.FAILED);
    expect(w.publisher.publishPayoutFailed).toHaveBeenCalledTimes(1);
    expect(w.publisher.publishPayoutCompleted).not.toHaveBeenCalled();
  });

  it('closes between start and the funding call: not funded, failed, no success event', async () => {
    const w = world({}, m);
    await card(w, scripted(OPEN, CLOSED)).executeCardPayout('p1');
    expect(w.stripe.testHelpers.issuing.cards.fundCard).not.toHaveBeenCalled();
    expect(w.rows.status).toBe(PayoutStatus.FAILED);
    expect(w.publisher.publishPayoutCompleted).not.toHaveBeenCalled();
  });

  it('open: funded and completed', async () => {
    const w = world({}, m);
    await card(w, scripted(OPEN)).executeCardPayout('p1');
    expect(w.stripe.testHelpers.issuing.cards.fundCard).toHaveBeenCalledTimes(1);
    expect(w.publisher.publishPayoutCompleted).toHaveBeenCalledTimes(1);
  });
});

describe('CryptoPayoutExecutor gate (G9)', () => {
  const crypto = (w: ReturnType<typeof world>, check: jest.Mock) => {
    const provider = { initiateWithdrawal: jest.fn(async () => ({ providerTxId: 'tx1', status: 'pending' })) };
    const exec = new CryptoPayoutExecutorService(
      w.payoutRepo as any, w.methodRepo as any,
      { selectBridge: () => 'BRIDGE_X', getSettlementEstimate: () => '1 hour' } as any,
      {} as any,
      { executeWithRetry: (fn: any) => fn() } as any,
      { validateTokenSupported: jest.fn(), validateMinimum: jest.fn() } as any,
      provider as any,
      { getDisplayRate: async () => ({ rate: 1 }) } as any,
      { get: (_k: string, d?: any) => d ?? 'false' } as any,
      w.audit as any, w.publisher as any,
      { isConfigured: () => false } as any, {} as any, w.makeGate(check),
    );
    return { exec, provider };
  };
  const m = { methodType: MethodType.CRYPTO };

  it('closed at start: provider never asked to send', async () => {
    const w = world({}, m);
    const { exec, provider } = crypto(w, scripted(CLOSED));
    await exec.executeCryptoPayout('p1');
    expect(provider.initiateWithdrawal).not.toHaveBeenCalled();
    expect(w.rows.status).toBe(PayoutStatus.FAILED);
    expect(w.publisher.publishPayoutFailed).toHaveBeenCalledTimes(1);
  });

  it('closes before the (retried) provider attempt: not sent, failed, released', async () => {
    const w = world({}, m);
    const { exec, provider } = crypto(w, scripted(OPEN, CLOSED));
    await exec.executeCryptoPayout('p1');
    expect(provider.initiateWithdrawal).not.toHaveBeenCalled();
    expect(w.rows.status).toBe(PayoutStatus.FAILED);
    expect(w.publisher.publishPayoutFailed).toHaveBeenCalledTimes(1);
  });

  it('re-run blocked mid-way: no provider call, no failure, no release', async () => {
    const w = world({ status: PayoutStatus.PROCESSING, providerReference: 'x' }, m);
    const { exec, provider } = crypto(w, scripted(OPEN, CLOSED));
    await exec.executeCryptoPayout('p1');
    expect(provider.initiateWithdrawal).not.toHaveBeenCalled();
    expect(w.publisher.publishPayoutFailed).not.toHaveBeenCalled();
    expect(w.rows.status).toBe(PayoutStatus.PROCESSING);
  });

  it('open: provider asked once', async () => {
    const w = world({}, m);
    const { exec, provider } = crypto(w, scripted(OPEN));
    await exec.executeCryptoPayout('p1');
    expect(provider.initiateWithdrawal).toHaveBeenCalledTimes(1);
  });
});
