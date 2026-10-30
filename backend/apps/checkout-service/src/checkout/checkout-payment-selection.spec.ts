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
import { Order } from './entities/order.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';

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
  order?: Record<string, unknown> | null;
  insertError?: unknown;
  address?: unknown;
  walletBalance?: string | null;
};

const ADDRESS = {
  fullName: 'Test Client',
  addressLine1: '1 Main St',
  addressLine2: null,
  city: 'Austin',
  state: 'TX',
  postalCode: '78701',
  country: 'US',
  phoneNumber: '5125550100',
};

const NEW_ORDER = {
  orderId: 'C01-00001-0001',
  status: 'processing',
  clientId: 'client-1',
};

const buildService = (
  session: Record<string, unknown> | null,
  options: Options = {},
) => {
  const state = session ? { ...session } : null;
  const update = jest
    .fn()
    .mockImplementation(
      async (entity: unknown, _id: unknown, patch: Record<string, unknown>) => {
        if (entity === CheckoutSession && state) Object.assign(state, patch);
      },
    );
  const remove = jest.fn().mockResolvedValue(undefined);
  const insert = jest.fn().mockImplementation(async (entity: unknown) => {
    if (entity === Order && options.insertError) throw options.insertError;
  });
  const manager = {
    findOne: jest.fn().mockImplementation(async (entity: unknown) => {
      if (entity === CheckoutSession) return state;
      if (entity === Payment) return options.line ?? null;
      if (entity === Order) return options.order ?? null;
      return null;
    }),
    find: jest.fn().mockImplementation(async (entity: unknown) =>
      entity === Payment && options.line
        ? [
            {
              id: 'pay-1',
              phase: 'initial',
              method: 'card',
              savedMethodId: 'card-1',
              ...options.line,
            },
          ]
        : [],
    ),
    findOneOrFail: jest
      .fn()
      .mockImplementation(async (entity: unknown) =>
        entity === CheckoutSession ? state : NEW_ORDER,
      ),
    update,
    delete: remove,
    insert,
    query: jest.fn().mockImplementation(async (sql: string) =>
      sql.includes('"wallets"') && sql.includes('SELECT')
        ? options.walletBalance === null
          ? []
          : [{ balance: options.walletBalance ?? '100000.00' }]
        : [{ expired: options.expired ?? false }],
    ),
  };
  const fetchBillingAddress = jest
    .fn()
    .mockResolvedValue(options.address === undefined ? ADDRESS : options.address);
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
    { fetchBillingAddress } as never,
    {
      getSessionSummary: jest.fn().mockResolvedValue({ listingId: 'listing-1' }),
    } as never,
    codeService as never,
    {} as never,
    {} as never,
    registry,
  );
  return {
    service,
    update,
    remove,
    insert,
    savedCards,
    fetchBillingAddress,
    query: manager.query,
  };
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
  const seen = { authorized: true, expectedTotal: 10000 };

  it('refuses a submit with nothing chosen while an amount is due', async () => {
    const { service } = buildService(pending, { line: null });
    await expect(
      service.submitPayment('client-1', 'session-1', seen),
    ).rejects.toMatchObject({
      response: { code: 'PAYMENT_SELECTION_REQUIRED' },
    });
  });

  it('refuses a submit without the authorization', async () => {
    const { service, update } = buildService(pending);
    for (const dto of [
      {},
      { expectedTotal: 10000 },
      { authorized: false, expectedTotal: 10000 },
    ]) {
      await expect(
        service.submitPayment('client-1', 'session-1', dto),
      ).rejects.toMatchObject({
        status: 400,
        response: { code: 'AUTHORIZATION_REQUIRED' },
      });
    }
    expect(update).not.toHaveBeenCalled();
  });

  it('refuses a submit without the total the client saw', async () => {
    const { service, update } = buildService(pending);
    await expect(
      service.submitPayment('client-1', 'session-1', { authorized: true }),
    ).rejects.toMatchObject({
      status: 400,
      response: { code: 'EXPECTED_TOTAL_REQUIRED' },
    });
    expect(update).not.toHaveBeenCalled();
  });

  it('refuses a submit when the total changed and returns the current total', async () => {
    const { service, update } = buildService(
      { ...pending, appliedGiftCards: [{ code: 'A', amountUsed: 2000 }] },
      { line: { method: 'card', savedMethodId: 'card-1' } },
    );
    await expect(
      service.submitPayment('client-1', 'session-1', seen),
    ).rejects.toMatchObject({
      status: 409,
      response: { code: 'AMOUNT_CHANGED', currentTotal: 8000 },
    });
    expect(update).not.toHaveBeenCalled();
  });

  it('accepts a submit when the total matches after gift cards and balance', async () => {
    const { service, update } = buildService(
      {
        ...pending,
        walletAmountUsed: '3000.00',
        appliedGiftCards: [{ code: 'A', amountUsed: 2000 }],
      },
      { line: { method: 'card', savedMethodId: 'card-1' } },
    );
    jest.spyOn(service, 'getSession').mockResolvedValue({} as never);
    const result = await service.submitPayment('client-1', 'session-1', {
      authorized: true,
      expectedTotal: 5000,
    });
    expect(update).toHaveBeenCalledWith(CheckoutSession, 'session-1', {
      status: 'success',
    });
    expect(result).toMatchObject({
      order: { orderId: 'C01-00001-0001', status: 'processing' },
    });
  });

  it('creates one processing order for the amount due with the listing from the draft', async () => {
    const { service, insert } = buildService(
      {
        ...pending,
        walletAmountUsed: '3000.00',
        appliedGiftCards: [{ code: 'A', amountUsed: 2000 }],
      },
      { line: { method: 'card', savedMethodId: 'card-1' } },
    );
    jest.spyOn(service, 'getSession').mockResolvedValue({} as never);
    await service.submitPayment('client-1', 'session-1', {
      authorized: true,
      expectedTotal: 5000,
    });
    expect(
      insert.mock.calls.filter(([entity]) => entity === Order),
    ).toHaveLength(1);
    expect(insert).toHaveBeenCalledWith(Order, {
      sessionId: 'session-1',
      clientId: 'client-1',
      listingId: 'listing-1',
      orderCost: 5000,
      status: 'processing',
      confirmationEmail: null,
      paymentSnapshot: [
        {
          paymentId: 'pay-1',
          phase: 'initial',
          method: 'card',
          card: {
            brand: 'unionpay',
            funding: 'credit',
            last4: '0005',
            expMonth: 12,
            expYear: 2040,
          },
          billingAddress: null,
          capturedAt: expect.any(String),
        },
      ],
    });
  });

  it('copies the card and the billing address into the order snapshot', async () => {
    const { service, insert, fetchBillingAddress } = buildService(pending, {
      line: { method: 'card', savedMethodId: 'card-1' },
      findCard: { ...CARD, billingAddressId: 'addr-1' },
    });
    jest.spyOn(service, 'getSession').mockResolvedValue({} as never);
    await service.submitPayment('client-1', 'session-1', seen);
    expect(fetchBillingAddress).toHaveBeenCalledWith('client-1', 'addr-1');
    expect(insert).toHaveBeenCalledWith(
      Order,
      expect.objectContaining({
        paymentSnapshot: [
          expect.objectContaining({
            paymentId: 'pay-1',
            phase: 'initial',
            card: expect.objectContaining({ last4: '0005' }),
            billingAddress: ADDRESS,
          }),
        ],
      }),
    );
  });

  it('still creates the order with a null address when the address lookup fails', async () => {
    const { service, insert } = buildService(pending, {
      line: { method: 'card', savedMethodId: 'card-1' },
      findCard: { ...CARD, billingAddressId: 'addr-1' },
      address: null,
    });
    jest.spyOn(service, 'getSession').mockResolvedValue({} as never);
    await service.submitPayment('client-1', 'session-1', seen);
    expect(insert).toHaveBeenCalledWith(
      Order,
      expect.objectContaining({
        paymentSnapshot: [expect.objectContaining({ billingAddress: null })],
      }),
    );
  });

  it('stores an empty snapshot when the credits cover the total', async () => {
    const { service, insert } = buildService(
      { ...pending, appliedGiftCards: [{ code: 'A', amountUsed: 10000 }] },
      { line: null },
    );
    jest.spyOn(service, 'getSession').mockResolvedValue({} as never);
    await service.submitPayment('client-1', 'session-1', {
      authorized: true,
      expectedTotal: 0,
    });
    expect(insert).toHaveBeenCalledWith(
      Order,
      expect.objectContaining({ paymentSnapshot: [] }),
    );
  });

  describe('balance', () => {
    const withBalance = {
      ...pending,
      walletAmountUsed: '3000.00',
      appliedGiftCards: [{ code: 'A', amountUsed: 2000 }],
    };
    const card = { line: { method: 'card', savedMethodId: 'card-1' } };

    it('takes the applied balance from the wallet and writes a payment ledger row for the order', async () => {
      const { service, insert, query } = buildService(withBalance, card);
      jest.spyOn(service, 'getSession').mockResolvedValue({} as never);
      await service.submitPayment(
        'client-1',
        'session-1',
        { authorized: true, expectedTotal: 5000 },
        undefined,
        { sourceIp: '203.0.113.9', userAgent: 'Mozilla/5.0' },
      );
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('FOR UPDATE'),
        ['client-1'],
      );
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE "checkout"."wallets"'),
        [300000, 'client-1'],
      );
      expect(insert).toHaveBeenCalledWith(WalletTransaction, {
        id: expect.stringMatching(/^[0-9a-f-]{36}$/),
        userId: 'client-1',
        type: 'payment',
        amount: 3000,
        status: 'completed',
        orderId: 'C01-00001-0001',
        reason: 'Balance applied to order C01-00001-0001',
        sourceIp: '203.0.113.9',
        userAgent: 'Mozilla/5.0',
        createdBy: 'client-1',
      });
    });

    it('does not touch the wallet when no balance is applied', async () => {
      const { service, insert, query } = buildService(pending, card);
      jest.spyOn(service, 'getSession').mockResolvedValue({} as never);
      await service.submitPayment('client-1', 'session-1', seen);
      expect(
        query.mock.calls.some(([sql]: [string]) => sql.includes('"wallets"')),
      ).toBe(false);
      expect(
        insert.mock.calls.some(([entity]) => entity === WalletTransaction),
      ).toBe(false);
    });

    it('takes only the amount due when the applied balance is larger', async () => {
      const { service, insert } = buildService(
        { ...pending, walletAmountUsed: '20000.00' },
        { line: null },
      );
      jest.spyOn(service, 'getSession').mockResolvedValue({} as never);
      await service.submitPayment('client-1', 'session-1', {
        authorized: true,
        expectedTotal: 0,
      });
      expect(insert).toHaveBeenCalledWith(
        WalletTransaction,
        expect.objectContaining({ amount: 10000 }),
      );
    });

    it('keeps the ip and user agent null when none are sent and caps long ones', async () => {
      const first = buildService(withBalance, card);
      jest.spyOn(first.service, 'getSession').mockResolvedValue({} as never);
      await first.service.submitPayment('client-1', 'session-1', {
        authorized: true,
        expectedTotal: 5000,
      });
      expect(first.insert).toHaveBeenCalledWith(
        WalletTransaction,
        expect.objectContaining({ sourceIp: null, userAgent: null }),
      );
      const second = buildService(withBalance, card);
      jest.spyOn(second.service, 'getSession').mockResolvedValue({} as never);
      await second.service.submitPayment(
        'client-1',
        'session-1',
        { authorized: true, expectedTotal: 5000 },
        undefined,
        { sourceIp: '1'.repeat(100), userAgent: 'x'.repeat(900) },
      );
      const ledger = second.insert.mock.calls.find(
        ([entity]) => entity === WalletTransaction,
      )![1];
      expect(ledger.sourceIp).toHaveLength(64);
      expect(ledger.userAgent).toHaveLength(500);
    });

    it('answers AMOUNT_CHANGED with the new total and lowers the applied balance when the wallet is short', async () => {
      const { service, update } = buildService(withBalance, {
        ...card,
        walletBalance: '1000.00',
      });
      await expect(
        service.submitPayment('client-1', 'session-1', {
          authorized: true,
          expectedTotal: 5000,
        }),
      ).rejects.toMatchObject({
        status: 409,
        response: { code: 'AMOUNT_CHANGED', currentTotal: 7000 },
      });
      expect(update).toHaveBeenCalledWith(CheckoutSession, 'session-1', {
        walletAmountUsed: 1000,
      });
    });

    it('treats a client with no wallet row as a zero balance', async () => {
      const { service, update } = buildService(withBalance, {
        ...card,
        walletBalance: null,
      });
      await expect(
        service.submitPayment('client-1', 'session-1', {
          authorized: true,
          expectedTotal: 5000,
        }),
      ).rejects.toMatchObject({
        status: 409,
        response: { code: 'AMOUNT_CHANGED', currentTotal: 8000 },
      });
      expect(update).toHaveBeenCalledWith(CheckoutSession, 'session-1', {
        walletAmountUsed: 0,
      });
    });

    it('does not spend anything again on a repeat call', async () => {
      const { service, insert, query } = buildService(withBalance, {
        ...card,
        order: NEW_ORDER,
      });
      jest.spyOn(service, 'getSession').mockResolvedValue({} as never);
      await service.submitPayment('client-1', 'session-1', {
        authorized: true,
        expectedTotal: 5000,
      });
      expect(insert).not.toHaveBeenCalled();
      expect(
        query.mock.calls.some(([sql]: [string]) => sql.includes('"wallets"')),
      ).toBe(false);
    });
  });

  it('stores the client email from the header on the order', async () => {
    const { service, insert } = buildService(pending, {
      line: { method: 'card', savedMethodId: 'card-1' },
    });
    jest.spyOn(service, 'getSession').mockResolvedValue({} as never);
    await service.submitPayment('client-1', 'session-1', seen, ' a@b.com ');
    expect(insert).toHaveBeenCalledWith(
      Order,
      expect.objectContaining({ confirmationEmail: 'a@b.com' }),
    );
  });

  it('stores no email when the header is missing or blank', async () => {
    const { service, insert } = buildService(pending, {
      line: { method: 'card', savedMethodId: 'card-1' },
    });
    jest.spyOn(service, 'getSession').mockResolvedValue({} as never);
    await service.submitPayment('client-1', 'session-1', seen, '  ');
    expect(insert).toHaveBeenCalledWith(
      Order,
      expect.objectContaining({ confirmationEmail: null }),
    );
  });

  it('returns the existing order and creates nothing on a second call', async () => {
    const { service, insert } = buildService(pending, {
      order: { ...NEW_ORDER, status: 'paid' },
    });
    jest.spyOn(service, 'getSession').mockResolvedValue({} as never);
    const result = await service.submitPayment('client-1', 'session-1', seen);
    expect(insert).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      order: { orderId: 'C01-00001-0001', status: 'paid' },
    });
  });

  it('returns the existing order even when the session is expired or paid', async () => {
    const { service, insert } = buildService(
      { ...pending, status: 'success' },
      { expired: true, order: NEW_ORDER },
    );
    jest.spyOn(service, 'getSession').mockResolvedValue({} as never);
    await expect(
      service.submitPayment('client-1', 'session-1', seen),
    ).resolves.toMatchObject({ order: { orderId: 'C01-00001-0001' } });
    expect(insert).not.toHaveBeenCalled();
  });

  it('returns 404 for the order of another client', async () => {
    const { service } = buildService(pending, {
      order: { ...NEW_ORDER, clientId: 'client-2' },
    });
    await expect(
      service.submitPayment('client-1', 'session-1', seen),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns the order that won the race when the unique key refuses the insert', async () => {
    const { service } = buildService(
      pending,
      {
        line: { method: 'card', savedMethodId: 'card-1' },
        insertError: { code: '23505' },
      },
    );
    jest.spyOn(service, 'getSession').mockResolvedValue({} as never);
    await expect(
      service.submitPayment('client-1', 'session-1', seen),
    ).resolves.toMatchObject({ order: { orderId: 'C01-00001-0001' } });
  });

  it('does not hide an insert error that is not the unique key', async () => {
    const { service } = buildService(pending, {
      line: { method: 'card', savedMethodId: 'card-1' },
      insertError: new Error('db down'),
    });
    await expect(
      service.submitPayment('client-1', 'session-1', seen),
    ).rejects.toThrow('db down');
  });

  it('accepts a submit with nothing chosen when the credits cover the total', async () => {
    const covered = {
      ...pending,
      appliedGiftCards: [{ code: 'A', amountUsed: 10000 }],
    };
    const { service, insert } = buildService(covered, { line: null });
    jest.spyOn(service, 'getSession').mockResolvedValue({} as never);
    await service.submitPayment('client-1', 'session-1', {
      authorized: true,
      expectedTotal: 0,
    });
    expect(insert).toHaveBeenCalledWith(
      Order,
      expect.objectContaining({ orderCost: 0, status: 'processing' }),
    );
  });
});
