import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CheckoutDraftSessionService } from './checkout-draft-session.service';
import { PaymentSelectionRegistry } from './payment-selection.registry';
import { CheckoutSession } from './entities/checkout-session.entity';
import { Payment } from './entities/payment.entity';

const CARD = {
  id: 'card-1',
  brand: 'unionpay',
  funding: 'credit',
  last4: '0005',
  expMonth: 12,
  expYear: 2040,
  billingAddressId: null,
  isDefault: false,
};

type Options = {
  expired?: boolean;
  findCard?: unknown;
  line?: Record<string, unknown> | null;
};

const buildService = (
  session: Record<string, unknown> | null,
  options: Options = {},
) => {
  const update = jest.fn().mockResolvedValue(undefined);
  const remove = jest.fn().mockResolvedValue(undefined);
  const insert = jest.fn().mockResolvedValue(undefined);
  const manager = {
    findOne: jest.fn().mockImplementation(async (entity: unknown) => {
      if (entity === CheckoutSession) return session;
      if (entity === Payment) return options.line ?? null;
      return null;
    }),
    update,
    delete: remove,
    insert,
    query: jest.fn().mockResolvedValue([{ expired: options.expired ?? false }]),
  };
  const dataSource = {
    manager,
    transaction: jest.fn(async (work: (m: typeof manager) => unknown) =>
      work(manager),
    ),
  };
  const codeService = {
    listCodes: jest.fn().mockResolvedValue({ promo: null }),
  };
  const savedCards = {
    getCardView: jest.fn().mockResolvedValue(CARD),
    findCardView: jest
      .fn()
      .mockResolvedValue(options.findCard === undefined ? CARD : options.findCard),
  };
  const registry = new PaymentSelectionRegistry(savedCards as never);
  const service = new CheckoutDraftSessionService(
    dataSource as never,
    {} as never,
    {} as never,
    {} as never,
    codeService as never,
    {} as never,
    {} as never,
    registry,
  );
  return { service, update, remove, insert, savedCards };
};

const pending = {
  id: 'session-1',
  status: 'pending',
  projectCost: '10000.00',
  walletAmountUsed: '0.00',
  appliedGiftCards: null,
  appliedPromoCode: null,
};

const CHOICE = { method: 'card' as const, id: 'card-1' };

const read = (service: CheckoutDraftSessionService, session: unknown) =>
  (
    service as unknown as {
      readPaymentSelection(c: string, s: unknown): Promise<unknown>;
    }
  ).readPaymentSelection('client-1', session);

describe('session payment selection', () => {
  it('saves the chosen card as a pending line for the amount due and returns its summary', async () => {
    const { service, remove, insert } = buildService(pending);
    const result = await service.setPaymentSelection(
      'client-1',
      'session-1',
      CHOICE,
    );
    expect(remove).toHaveBeenCalledWith(Payment, {
      sessionId: 'session-1',
      phase: 'initial',
      status: 'pending',
    });
    expect(insert).toHaveBeenCalledWith(Payment, {
      sessionId: 'session-1',
      phase: 'initial',
      status: 'pending',
      method: 'card',
      savedMethodId: 'card-1',
      amount: 10000,
    });
    expect(result).toMatchObject({ method: 'card', id: 'card-1', last4: '0005' });
  });

  it('sets the line amount after gift cards and the applied balance', async () => {
    const { service, insert } = buildService({
      ...pending,
      walletAmountUsed: '3000.00',
      appliedGiftCards: [{ code: 'A', amountUsed: 2000 }],
    });
    await service.setPaymentSelection('client-1', 'session-1', CHOICE);
    expect(insert).toHaveBeenCalledWith(
      Payment,
      expect.objectContaining({ amount: 5000 }),
    );
  });

  it('stores no line when the credits cover the whole total', async () => {
    const { service, remove, insert } = buildService({
      ...pending,
      appliedGiftCards: [{ code: 'A', amountUsed: 10000 }],
    });
    const result = await service.setPaymentSelection(
      'client-1',
      'session-1',
      CHOICE,
    );
    expect(remove).toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
    expect(result).toMatchObject({ method: 'card', id: 'card-1' });
  });

  it('refuses a card that is not the client own', async () => {
    const { service, savedCards, remove, insert } = buildService(pending);
    savedCards.getCardView.mockRejectedValue(new ForbiddenException());
    await expect(
      service.setPaymentSelection('client-1', 'session-1', {
        method: 'card',
        id: 'card-9',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(remove).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it('refuses a method that cannot be saved yet', async () => {
    const { service, remove, insert } = buildService(pending);
    await expect(
      service.setPaymentSelection('client-1', 'session-1', {
        method: 'ach',
        id: 'bank-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(remove).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it('returns 404 for a session that is not the client own', async () => {
    const { service } = buildService(null);
    await expect(
      service.setPaymentSelection('client-1', 'session-1', CHOICE),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('refuses a paid session', async () => {
    const { service } = buildService({ ...pending, status: 'success' });
    await expect(
      service.setPaymentSelection('client-1', 'session-1', CHOICE),
    ).rejects.toMatchObject({ response: { code: 'SESSION_ALREADY_PAID' } });
  });

  it('refuses an expired session', async () => {
    const { service } = buildService(pending, { expired: true });
    await expect(
      service.setPaymentSelection('client-1', 'session-1', CHOICE),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('clears the pending line and adds nothing', async () => {
    const { service, remove, insert } = buildService(pending);
    await service.clearPaymentSelection('client-1', 'session-1');
    expect(remove).toHaveBeenCalledWith(Payment, {
      sessionId: 'session-1',
      phase: 'initial',
      status: 'pending',
    });
    expect(insert).not.toHaveBeenCalled();
  });

  it('reads back the chosen card from the line', async () => {
    const { service } = buildService(pending, {
      line: { method: 'card', savedMethodId: 'card-1' },
    });
    await expect(read(service, pending)).resolves.toMatchObject({
      method: 'card',
      id: 'card-1',
      last4: '0005',
    });
  });

  it('reads back null when there is no line', async () => {
    const { service } = buildService(pending, { line: null });
    await expect(read(service, pending)).resolves.toBeNull();
  });

  it('reads back null when the saved card was deleted', async () => {
    const { service } = buildService(pending, {
      line: { method: 'card', savedMethodId: 'card-1' },
      findCard: null,
    });
    await expect(read(service, pending)).resolves.toBeNull();
  });
});

describe('session submit', () => {
  it('refuses a submit with nothing chosen while an amount is due', async () => {
    const { service } = buildService(pending, { line: null });
    await expect(
      service.submitPayment('client-1', 'session-1'),
    ).rejects.toMatchObject({
      response: { code: 'PAYMENT_SELECTION_REQUIRED' },
    });
  });

  it('accepts a submit with nothing chosen when the credits cover the total', async () => {
    const covered = {
      ...pending,
      appliedGiftCards: [{ code: 'A', amountUsed: 10000 }],
    };
    const { service, update } = buildService(covered, { line: null });
    jest.spyOn(service, 'getSession').mockResolvedValue({} as never);
    await service.submitPayment('client-1', 'session-1');
    expect(update).toHaveBeenCalledWith(CheckoutSession, 'session-1', {
      status: 'success',
    });
  });
});
