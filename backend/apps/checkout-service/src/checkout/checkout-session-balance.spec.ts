import { ConflictException, UnprocessableEntityException } from '@nestjs/common';
import { CheckoutDraftSessionService } from './checkout-draft-session.service';
import { CheckoutSession } from './entities/checkout-session.entity';
import { Wallet } from './entities/wallet.entity';

const buildService = (
  session: Record<string, unknown> | null,
  options: { balance?: number | null; expired?: boolean; promo?: unknown } = {},
) => {
  const update = jest.fn().mockResolvedValue(undefined);
  const manager = {
    findOne: jest.fn().mockImplementation(async (entity: unknown) => {
      if (entity === CheckoutSession) return session;
      if (entity === Wallet) {
        return options.balance === null
          ? null
          : { balance: options.balance ?? 0 };
      }
      return null;
    }),
    update,
    query: jest.fn().mockResolvedValue([{ expired: options.expired ?? false }]),
  };
  const codeService = {
    listCodes: jest.fn().mockResolvedValue({ promo: options.promo ?? null }),
  };
  const service = new CheckoutDraftSessionService(
    { manager } as never,
    {} as never,
    {} as never,
    {} as never,
    codeService as never,
    {} as never,
    {} as never,
    {} as never,
  );
  return { service, update };
};

const pending = {
  id: 'session-1',
  status: 'pending',
  projectCost: '10000.00',
  appliedGiftCards: null,
  appliedPromoCode: null,
};

describe('session applied balance', () => {
  it('saves the amount on the session', async () => {
    const { service, update } = buildService(pending, { balance: 8000 });
    const result = await service.setBalanceApplied('client-1', 'session-1', {
      amount: 4000,
    });
    expect(update).toHaveBeenCalledWith(CheckoutSession, 'session-1', {
      walletAmountUsed: 4000,
    });
    expect(result).toEqual({ walletAmountUsed: 4000 });
  });

  it('clears the amount with 0 without reading the wallet', async () => {
    const { service, update } = buildService(pending, { balance: null });
    await service.setBalanceApplied('client-1', 'session-1', { amount: 0 });
    expect(update).toHaveBeenCalledWith(CheckoutSession, 'session-1', {
      walletAmountUsed: 0,
    });
  });

  it('refuses more than the available balance', async () => {
    const { service, update } = buildService(pending, { balance: 2000 });
    await expect(
      service.setBalanceApplied('client-1', 'session-1', { amount: 2000.01 }),
    ).rejects.toMatchObject({
      response: { code: 'BALANCE_EXCEEDS_AVAILABLE' },
    });
    expect(update).not.toHaveBeenCalled();
  });

  it('refuses any amount when the client has no wallet', async () => {
    const { service } = buildService(pending, { balance: null });
    await expect(
      service.setBalanceApplied('client-1', 'session-1', { amount: 1 }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('refuses more than the amount due after gift cards', async () => {
    const { service, update } = buildService(
      {
        ...pending,
        appliedGiftCards: [{ code: 'A', amountUsed: 7000 }],
      },
      { balance: 8000 },
    );
    await expect(
      service.setBalanceApplied('client-1', 'session-1', { amount: 3000.01 }),
    ).rejects.toMatchObject({
      response: { code: 'BALANCE_EXCEEDS_AMOUNT_DUE' },
    });
    await service.setBalanceApplied('client-1', 'session-1', { amount: 3000 });
    expect(update).toHaveBeenCalledWith(CheckoutSession, 'session-1', {
      walletAmountUsed: 3000,
    });
  });

  it('refuses a session that is no longer active', async () => {
    const { service, update } = buildService(
      { ...pending, status: 'expired' },
      { balance: 8000 },
    );
    await expect(
      service.setBalanceApplied('client-1', 'session-1', { amount: 100 }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(update).not.toHaveBeenCalled();
  });
});
