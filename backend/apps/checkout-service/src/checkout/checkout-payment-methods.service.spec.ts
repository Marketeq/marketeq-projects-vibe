import { BadRequestException, ConflictException } from '@nestjs/common';
import { CheckoutPaymentMethodsService } from './checkout-payment-methods.service';

type SessionOverrides = {
  status?: string;
  projectCost?: number;
  promoAmount?: number;
  giftCards?: { code: string; amountUsed: number }[];
};

const buildService = (overrides: SessionOverrides = {}) => {
  const getSession = jest.fn().mockResolvedValue({
    sessionId: 'session-1',
    status: overrides.status ?? 'pending',
    projectCost: overrides.projectCost ?? 27800,
    appliedGiftCards: overrides.giftCards ?? [],
    promo:
      overrides.promoAmount === undefined
        ? null
        : { amount: overrides.promoAmount },
  });
  const service = new CheckoutPaymentMethodsService({ getSession } as never);
  return { service, getSession };
};

const klarna = (result: { methods: { id: string; available: boolean }[] }) =>
  result.methods.find((method) => method.id === 'klarna')?.available;

describe('CheckoutPaymentMethodsService', () => {
  it('works out the amount due from the cost, promo and gift cards', async () => {
    const { service } = buildService({
      projectCost: 27800,
      promoAmount: 500,
      giftCards: [{ code: 'A', amountUsed: 1000 }],
    });
    const result = await service.getPaymentMethods('client-1', 'session-1');
    expect(result.amountDue).toBe(26300);
    expect(klarna(result)).toBe(false);
  });

  it('takes the applied balance off the amount due', async () => {
    const { service } = buildService({ projectCost: 12000 });
    const withoutBalance = await service.getPaymentMethods(
      'client-1',
      'session-1',
    );
    const withBalance = await service.getPaymentMethods(
      'client-1',
      'session-1',
      '2500.50',
    );
    expect(klarna(withoutBalance)).toBe(false);
    expect(withBalance.amountDue).toBe(9499.5);
    expect(klarna(withBalance)).toBe(true);
  });

  it('hides Klarna again when the balance leaves less than 1.00', async () => {
    const { service } = buildService({ projectCost: 5000 });
    const result = await service.getPaymentMethods(
      'client-1',
      'session-1',
      '4999.50',
    );
    expect(result.amountDue).toBe(0.5);
    expect(klarna(result)).toBe(false);
  });

  it('returns noPaymentNeeded when the balance covers everything', async () => {
    const { service } = buildService({ projectCost: 5000 });
    const result = await service.getPaymentMethods(
      'client-1',
      'session-1',
      '9000',
    );
    expect(result.amountDue).toBe(0);
    expect(result.noPaymentNeeded).toBe(true);
    expect(result.methods).toEqual([]);
  });

  it('treats an empty balance as none', async () => {
    const { service } = buildService({ projectCost: 5000 });
    const result = await service.getPaymentMethods('client-1', 'session-1', '');
    expect(result.amountDue).toBe(5000);
  });

  it('rejects a balance that is not a number', async () => {
    const { service } = buildService();
    await expect(
      service.getPaymentMethods('client-1', 'session-1', 'abc'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a negative balance', async () => {
    const { service } = buildService();
    await expect(
      service.getPaymentMethods('client-1', 'session-1', '-5'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a session that is already paid', async () => {
    const { service } = buildService({ status: 'success' });
    await expect(
      service.getPaymentMethods('client-1', 'session-1'),
    ).rejects.toMatchObject({
      response: { code: 'SESSION_ALREADY_PAID' },
    });
  });

  it('rejects a session that is expired or cancelled', async () => {
    const { service } = buildService({ status: 'expired' });
    await expect(
      service.getPaymentMethods('client-1', 'session-1'),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      service.getPaymentMethods('client-1', 'session-1'),
    ).rejects.toMatchObject({
      response: { code: 'SESSION_NOT_ACTIVE' },
    });
  });

  it('reads the session for the client who asked', async () => {
    const { service, getSession } = buildService();
    await service.getPaymentMethods('client-1', 'session-1');
    expect(getSession).toHaveBeenCalledWith('client-1', 'session-1');
  });
});
