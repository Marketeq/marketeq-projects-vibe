import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  BadGatewayException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CheckoutDraftSessionService } from './checkout-draft-session.service';
import { PaymentSelectionRegistry } from './payment-selection.registry';
import { CheckoutSession } from './entities/checkout-session.entity';
import { Payment } from './entities/payment.entity';
import { Order } from './entities/order.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';
import { GiftCardRedemption } from './entities/gift-card-redemption.entity';
import { PromoRedemption } from './entities/promo-redemption.entity';
import { SavedCard } from './entities/saved-card.entity';
import { StripeCustomer } from './entities/stripe-customer.entity';

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
  giftCards?: Record<string, Record<string, unknown> | null>;
  promo?: Record<string, unknown> | null;
  promoRow?: Record<string, unknown> | null;
  promoCounts?: { total: number; mine: number };
  draftId?: string | null;
  charge?: Record<string, unknown> | Error;
  customer?: null;
  savedCardRow?: null;
  claim?: number;
  lines?: Array<Record<string, unknown>>;
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
  listingId: 'listing-1',
};

const buildService = (
  session: Record<string, unknown> | null,
  options: Options = {},
) => {
  const state = session ? { ...session } : null;
  const orderState: Record<string, unknown> = { ...NEW_ORDER };
  const update = jest
    .fn()
    .mockImplementation(
      async (entity: unknown, id: unknown, patch: Record<string, unknown>) => {
        if (entity === CheckoutSession && state) Object.assign(state, patch);
        if (entity === Order) Object.assign(orderState, patch);
        return {
          affected:
            entity === Payment && typeof id === 'object' ? (options.claim ?? 1) : 1,
        };
      },
    );
  const remove = jest.fn().mockResolvedValue(undefined);
  const insert = jest.fn().mockImplementation(async (entity: unknown) => {
    if (entity === Order && options.insertError) throw options.insertError;
  });
  const manager = {
    findOne: jest.fn().mockImplementation(async (entity: unknown) => {
      if (entity === CheckoutSession) return state;
      if (entity === Payment) {
        return options.line
          ? { id: 'pay-1', phase: 'initial', method: 'card', savedMethodId: 'card-1', ...options.line }
          : null;
      }
      if (entity === Order) return options.order ?? null;
      if (entity === SavedCard) {
        return options.savedCardRow === null
          ? null
          : { id: 'card-1', stripePaymentMethodId: 'pm_test_1' };
      }
      if (entity === StripeCustomer) {
        return options.customer === null
          ? null
          : { userId: 'client-1', stripeCustomerId: 'cus_test_1' };
      }
      return null;
    }),
    find: jest.fn().mockImplementation(async (entity: unknown) => {
      if (entity !== Payment) return [];
      if (options.lines) return options.lines;
      return options.line
        ? [
            {
              id: 'pay-1',
              phase: 'initial',
              method: 'card',
              savedMethodId: 'card-1',
              amount: '10000.00',
              ...options.line,
            },
          ]
        : [];
    }),
    findOneOrFail: jest
      .fn()
      .mockImplementation(async (entity: unknown) =>
        entity === CheckoutSession ? state : orderState,
      ),
    update,
    delete: remove,
    insert,
    query: jest
      .fn()
      .mockImplementation(async (sql: string, params?: unknown[]) => {
        if (sql.includes('"gift_cards"') && sql.includes('SELECT')) {
          const keys = ((params ?? [])[0] ?? []) as string[];
          return keys
            .filter((key) => options.giftCards?.[key] !== null)
            .map((key) => ({
              id: `gc-${key}`,
              key,
              remainingAmount: '100000.00',
              isActive: true,
              expiresAt: null,
              redeemedByUserId: null,
              ...options.giftCards?.[key],
            }));
        }
        if (sql.includes('"promo_codes"') && sql.includes('SELECT')) {
          return options.promoRow === null
            ? []
            : [
                {
                  id: 'promo-1',
                  code: 'TEST10',
                  discount_type: 'percent',
                  discount_value: '10.00',
                  applies_to: 'project',
                  starts_at: null,
                  expires_at: null,
                  max_redemptions: null,
                  max_per_client: null,
                  active: true,
                  ...options.promoRow,
                },
              ];
        }
        if (sql.includes('"promo_redemptions"')) {
          return [
            {
              total: options.promoCounts?.total ?? 0,
              mine: options.promoCounts?.mine ?? 0,
            },
          ];
        }
        if (sql.includes('"drafts"') && sql.includes('SELECT')) {
          return options.draftId === null ? [] : [{ id: options.draftId ?? 'draft-1' }];
        }
        if (sql.includes('"wallets"') && sql.includes('SELECT')) {
          return options.walletBalance === null
            ? []
            : [{ balance: options.walletBalance ?? '100000.00' }];
        }
        return [{ expired: options.expired ?? false }];
      }),
  };
  const fetchBillingAddress = jest
    .fn()
    .mockResolvedValue(options.address === undefined ? ADDRESS : options.address);
  const transaction = jest.fn(async (work: (m: typeof manager) => unknown) =>
    work(manager),
  );
  const dataSource = { manager, transaction };
  const codeService = {
    listCodes: jest
      .fn()
      .mockImplementation(async ({ promoCode }: { promoCode?: string | null }) => ({
        promo: promoCode ? (options.promo ?? null) : null,
      })),
  };
  const savedCards = {
    getCardView: jest.fn().mockResolvedValue(CARD),
    findCardView: jest
      .fn()
      .mockResolvedValue(options.findCard === undefined ? CARD : options.findCard),
  };
  const stripe = {
    createPaymentIntent: jest.fn().mockImplementation(async () => {
      if (options.charge instanceof Error) throw options.charge;
      return options.charge ?? { id: 'pi_1', status: 'succeeded' };
    }),
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
    stripe as never,
  );
  return {
    service,
    update,
    remove,
    insert,
    savedCards,
    fetchBillingAddress,
    query: manager.query,
    transaction,
    stripe,
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
      order: { orderId: 'C01-00001-0001', status: 'paid' },
    });
  });

  it('creates one processing order for the amount due with the listing from the draft', async () => {
    const { service, insert } = buildService(
      {
        ...pending,
        walletAmountUsed: '3000.00',
        appliedGiftCards: [{ code: 'A', amountUsed: 2000 }],
      },
      {
        line: { method: 'card', savedMethodId: 'card-1', amount: '5000.00' },
      },
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
          amount: 5000,
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
            amount: 10000,
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

  it('stores the amount of the payment line as a number in the snapshot', async () => {
    const { service, insert } = buildService(pending, {
      line: { method: 'card', savedMethodId: 'card-1', amount: '10000.00' },
    });
    jest.spyOn(service, 'getSession').mockResolvedValue({} as never);
    await service.submitPayment('client-1', 'session-1', seen);
    const entry = insert.mock.calls.find(([entity]) => entity === Order)![1]
      .paymentSnapshot[0];
    expect(entry.amount).toBe(10000);
    expect(typeof entry.amount).toBe('number');
  });

  it('keeps the cents of the payment line amount in the snapshot', async () => {
    const { service, insert } = buildService(pending, {
      line: { method: 'card', savedMethodId: 'card-1', amount: '2500.50' },
    });
    jest.spyOn(service, 'getSession').mockResolvedValue({} as never);
    await service.submitPayment('client-1', 'session-1', seen);
    expect(insert).toHaveBeenCalledWith(
      Order,
      expect.objectContaining({
        paymentSnapshot: [expect.objectContaining({ amount: 2500.5 })],
      }),
    );
  });

  it('keeps one snapshot entry per payment line with its own amount and phase', async () => {
    const { service, insert } = buildService(pending, {
      line: { method: 'card', savedMethodId: 'card-1' },
      lines: [
        {
          id: 'pay-1',
          phase: 'initial',
          method: 'card',
          savedMethodId: 'card-1',
          amount: '6000.00',
        },
        {
          id: 'pay-2',
          phase: 'initial',
          method: 'card',
          savedMethodId: 'card-2',
          amount: '4000.00',
        },
        {
          id: 'pay-3',
          phase: 'recurring',
          method: 'card',
          savedMethodId: 'card-1',
          amount: '1500.25',
        },
      ],
    });
    jest.spyOn(service, 'getSession').mockResolvedValue({} as never);
    await service.submitPayment('client-1', 'session-1', seen);
    const snapshot = insert.mock.calls.find(([entity]) => entity === Order)![1]
      .paymentSnapshot;
    expect(
      snapshot.map(
        (entry: { paymentId: string; phase: string; amount: number }) => ({
          paymentId: entry.paymentId,
          phase: entry.phase,
          amount: entry.amount,
        }),
      ),
    ).toEqual([
      { paymentId: 'pay-1', phase: 'initial', amount: 6000 },
      { paymentId: 'pay-2', phase: 'initial', amount: 4000 },
      { paymentId: 'pay-3', phase: 'recurring', amount: 1500.25 },
    ]);
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

  describe('gift cards', () => {
    const card = { line: { method: 'card', savedMethodId: 'card-1' } };
    const gift = {
      ...pending,
      appliedGiftCards: [{ code: 'A', amountUsed: 2000 }],
    };
    const both = { ...gift, walletAmountUsed: '3000.00' };
    const submit = (
      service: CheckoutDraftSessionService,
      expectedTotal: number,
      meta?: { sourceIp?: string; userAgent?: string },
    ) =>
      service.submitPayment(
        'client-1',
        'session-1',
        { authorized: true, expectedTotal },
        undefined,
        meta,
      );
    const giftSpends = (insert: jest.Mock) =>
      insert.mock.calls.filter(([entity]) => entity === GiftCardRedemption);
    const touchedGiftCards = (query: jest.Mock) =>
      query.mock.calls.filter(([sql]: [string]) => sql.includes('"gift_cards"'));
    const giftUpdates = (query: jest.Mock) =>
      query.mock.calls.filter(([sql]: [string]) =>
        sql.includes('UPDATE "checkout"."gift_cards"'),
      );

    it('takes the applied amount from the gift card and writes a payment ledger row for the order', async () => {
      const { service, insert, query } = buildService(gift, card);
      jest.spyOn(service, 'getSession').mockResolvedValue({} as never);
      await submit(service, 8000, {
        sourceIp: '203.0.113.9',
        userAgent: 'Mozilla/5.0',
      });
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('FOR UPDATE'),
        [['A']],
      );
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE "checkout"."gift_cards"'),
        [200000, 'gc-A', 'client-1'],
      );
      expect(insert).toHaveBeenCalledWith(GiftCardRedemption, {
        id: expect.any(String),
        giftCardId: 'gc-A',
        userId: 'client-1',
        type: 'payment',
        amount: 2000,
        status: 'completed',
        orderId: 'C01-00001-0001',
        reason: 'Gift card applied to order C01-00001-0001',
        sourceIp: '203.0.113.9',
        userAgent: 'Mozilla/5.0',
        createdBy: 'client-1',
      });
    });

    it('lowers the card, marks it used up at zero and binds it to the client in one statement', async () => {
      const { service, query } = buildService(gift, card);
      jest.spyOn(service, 'getSession').mockResolvedValue({} as never);
      await submit(service, 8000);
      const sql = giftUpdates(query)[0][0] as string;
      expect(sql).toContain(
        '"remainingAmount" = "remainingAmount" - ($1::numeric / 100)',
      );
      expect(sql).toContain(
        '"isActive" = ("remainingAmount" - ($1::numeric / 100)) > 0',
      );
      expect(sql).toContain('"redeemedByUserId" = $3');
    });

    it('allows a card that holds exactly the applied amount', async () => {
      const { service, insert } = buildService(gift, {
        ...card,
        giftCards: { A: { remainingAmount: '2000.00' } },
      });
      jest.spyOn(service, 'getSession').mockResolvedValue({} as never);
      await submit(service, 8000);
      expect(giftSpends(insert)).toHaveLength(1);
    });

    it('spends several cards in code order with one ledger row each', async () => {
      const { service, insert, query } = buildService(
        {
          ...pending,
          appliedGiftCards: [
            { code: 'B', amountUsed: 2000 },
            { code: 'A', amountUsed: 500 },
          ],
        },
        card,
      );
      jest.spyOn(service, 'getSession').mockResolvedValue({} as never);
      await submit(service, 7500);
      expect(giftUpdates(query).map(([, params]) => params)).toEqual([
        [50000, 'gc-A', 'client-1'],
        [200000, 'gc-B', 'client-1'],
      ]);
      expect(giftSpends(insert).map(([, row]) => row.amount)).toEqual([
        500, 2000,
      ]);
    });

    it('matches a code typed with dashes', async () => {
      const { service, insert, query } = buildService(
        {
          ...pending,
          appliedGiftCards: [{ code: '0000-0000-0000-0001', amountUsed: 2000 }],
        },
        card,
      );
      jest.spyOn(service, 'getSession').mockResolvedValue({} as never);
      await submit(service, 8000);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('FOR UPDATE'),
        [['0000000000000001']],
      );
      expect(giftSpends(insert)).toHaveLength(1);
    });

    it('does not touch gift cards when none are applied', async () => {
      const { service, insert, query } = buildService(pending, card);
      jest.spyOn(service, 'getSession').mockResolvedValue({} as never);
      await submit(service, 10000);
      expect(touchedGiftCards(query)).toHaveLength(0);
      expect(giftSpends(insert)).toHaveLength(0);
    });

    it('skips an applied card with a zero amount', async () => {
      const { service, insert, query } = buildService(
        { ...pending, appliedGiftCards: [{ code: 'A', amountUsed: 0 }] },
        card,
      );
      jest.spyOn(service, 'getSession').mockResolvedValue({} as never);
      await submit(service, 10000);
      expect(touchedGiftCards(query)).toHaveLength(0);
      expect(giftSpends(insert)).toHaveLength(0);
    });

    it('keeps the ip and user agent null when none are sent and caps long ones', async () => {
      const first = buildService(gift, card);
      jest.spyOn(first.service, 'getSession').mockResolvedValue({} as never);
      await submit(first.service, 8000);
      expect(first.insert).toHaveBeenCalledWith(
        GiftCardRedemption,
        expect.objectContaining({ sourceIp: null, userAgent: null }),
      );
      const second = buildService(gift, card);
      jest.spyOn(second.service, 'getSession').mockResolvedValue({} as never);
      await submit(second.service, 8000, {
        sourceIp: '1'.repeat(100),
        userAgent: 'x'.repeat(900),
      });
      const row = giftSpends(second.insert)[0][1];
      expect(row.sourceIp).toHaveLength(64);
      expect(row.userAgent).toHaveLength(500);
    });

    it('spends a card that covers the whole total and needs no card payment', async () => {
      const { service, insert } = buildService(
        { ...pending, appliedGiftCards: [{ code: 'A', amountUsed: 10000 }] },
        { line: null },
      );
      jest.spyOn(service, 'getSession').mockResolvedValue({} as never);
      await submit(service, 0);
      expect(giftSpends(insert)[0][1]).toMatchObject({ amount: 10000 });
    });

    it('does not spend anything again on a repeat call', async () => {
      const { service, insert, query } = buildService(gift, {
        ...card,
        order: NEW_ORDER,
      });
      jest.spyOn(service, 'getSession').mockResolvedValue({} as never);
      await submit(service, 8000);
      expect(insert).not.toHaveBeenCalled();
      expect(touchedGiftCards(query)).toHaveLength(0);
    });

    describe('when a card no longer covers the applied amount', () => {
      it('answers AMOUNT_CHANGED with the new total and lowers the applied card to what is left', async () => {
        const built = buildService(gift, {
          ...card,
          giftCards: { A: { remainingAmount: '500.00' } },
        });
        await expect(submit(built.service, 8000)).rejects.toMatchObject({
          status: 409,
          response: { code: 'AMOUNT_CHANGED', currentTotal: 9500 },
        });
        expect(built.update).toHaveBeenCalledWith(CheckoutSession, 'session-1', {
          appliedGiftCards: [{ code: 'A', amountUsed: 500 }],
        });
        expect(giftSpends(built.insert)).toHaveLength(0);
        expect(giftUpdates(built.query)).toHaveLength(0);
      });

      it.each([
        ['used up', { isActive: false, remainingAmount: '0.00' }],
        ['expired', { expiresAt: new Date('2020-01-01') }],
        ['bound to another client', { redeemedByUserId: 'client-2' }],
        ['missing', null],
      ])('removes a card that is %s', async (_label, row) => {
        const built = buildService(gift, {
          ...card,
          giftCards: { A: row },
        });
        await expect(submit(built.service, 8000)).rejects.toMatchObject({
          status: 409,
          response: { code: 'AMOUNT_CHANGED', currentTotal: 10000 },
        });
        expect(built.update).toHaveBeenCalledWith(CheckoutSession, 'session-1', {
          appliedGiftCards: null,
        });
        expect(giftSpends(built.insert)).toHaveLength(0);
      });

      it('keeps the other card at its amount and spends nothing when only one is short', async () => {
        const built = buildService(
          {
            ...pending,
            appliedGiftCards: [
              { code: 'A', amountUsed: 2000 },
              { code: 'B', amountUsed: 1000 },
            ],
          },
          { ...card, giftCards: { B: { remainingAmount: '100.00' } } },
        );
        await expect(submit(built.service, 7000)).rejects.toMatchObject({
          status: 409,
          response: { currentTotal: 7900 },
        });
        expect(built.update).toHaveBeenCalledWith(CheckoutSession, 'session-1', {
          appliedGiftCards: [
            { code: 'A', amountUsed: 2000 },
            { code: 'B', amountUsed: 100 },
          ],
        });
        expect(giftSpends(built.insert)).toHaveLength(0);
        expect(giftUpdates(built.query)).toHaveLength(0);
      });

      it('accepts the same submit once the page shows the new total', async () => {
        const built = buildService(gift, {
          ...card,
          giftCards: { A: { remainingAmount: '500.00' } },
        });
        jest.spyOn(built.service, 'getSession').mockResolvedValue({} as never);
        await expect(submit(built.service, 8000)).rejects.toBeInstanceOf(
          ConflictException,
        );
        await submit(built.service, 9500);
        expect(giftSpends(built.insert)[0][1]).toMatchObject({ amount: 500 });
      });

      it('lets a card this client used before be used again', async () => {
        const { service, insert } = buildService(gift, {
          ...card,
          giftCards: { A: { redeemedByUserId: 'client-1' } },
        });
        jest.spyOn(service, 'getSession').mockResolvedValue({} as never);
        await submit(service, 8000);
        expect(giftSpends(insert)).toHaveLength(1);
      });
    });

    describe('together with the wallet balance', () => {
      it('spends both in one order with the same order id on both ledger rows', async () => {
        const { service, insert, query } = buildService(both, card);
        jest.spyOn(service, 'getSession').mockResolvedValue({} as never);
        await submit(service, 5000);
        expect(query).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE "checkout"."wallets"'),
          [300000, 'client-1'],
        );
        expect(insert).toHaveBeenCalledWith(
          WalletTransaction,
          expect.objectContaining({ amount: 3000, orderId: 'C01-00001-0001' }),
        );
        expect(giftSpends(insert)[0][1]).toMatchObject({
          amount: 2000,
          orderId: 'C01-00001-0001',
        });
      });

      it('takes the wallet first and the gift cards second', async () => {
        const { service, query } = buildService(both, card);
        jest.spyOn(service, 'getSession').mockResolvedValue({} as never);
        await submit(service, 5000);
        const updates = query.mock.calls
          .map(([sql]: [string]) => sql)
          .filter((sql: string) => sql.trimStart().startsWith('UPDATE'));
        expect(updates).toHaveLength(2);
        expect(updates[0]).toContain('"wallets"');
        expect(updates[1]).toContain('"gift_cards"');
      });

      it('wallet short: stops before touching any gift card and keeps the gift card applied', async () => {
        const built = buildService(both, { ...card, walletBalance: '1000.00' });
        await expect(submit(built.service, 5000)).rejects.toMatchObject({
          status: 409,
          response: { code: 'AMOUNT_CHANGED', currentTotal: 7000 },
        });
        expect(built.update).toHaveBeenCalledWith(CheckoutSession, 'session-1', {
          walletAmountUsed: 1000,
        });
        expect(touchedGiftCards(built.query)).toHaveLength(0);
        expect(giftSpends(built.insert)).toHaveLength(0);
      });

      it('gift card short after the wallet was taken: the whole order is rolled back', async () => {
        const built = buildService(both, {
          ...card,
          giftCards: { A: { remainingAmount: '500.00' } },
        });
        await expect(submit(built.service, 5000)).rejects.toMatchObject({
          status: 409,
          response: { code: 'AMOUNT_CHANGED', currentTotal: 6500 },
        });
        expect(built.query).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE "checkout"."wallets"'),
          [300000, 'client-1'],
        );
        await expect(built.transaction.mock.results[0].value).rejects.toThrow(
          'A gift card no longer covers the applied amount',
        );
        expect(giftSpends(built.insert)).toHaveLength(0);
        expect(built.update).not.toHaveBeenCalledWith(
          CheckoutSession,
          'session-1',
          expect.objectContaining({ walletAmountUsed: expect.anything() }),
        );
        expect(built.update).toHaveBeenCalledWith(CheckoutSession, 'session-1', {
          appliedGiftCards: [{ code: 'A', amountUsed: 500 }],
        });
      });

      it('both short: reports the wallet first, then the gift card, then goes through', async () => {
        const built = buildService(both, {
          ...card,
          walletBalance: '1000.00',
          giftCards: { A: { remainingAmount: '500.00' } },
        });
        jest.spyOn(built.service, 'getSession').mockResolvedValue({} as never);
        await expect(submit(built.service, 5000)).rejects.toMatchObject({
          response: { currentTotal: 7000 },
        });
        await expect(submit(built.service, 7000)).rejects.toMatchObject({
          response: { currentTotal: 8500 },
        });
        await submit(built.service, 8500);
        expect(giftSpends(built.insert)[0][1]).toMatchObject({ amount: 500 });
        expect(built.insert).toHaveBeenCalledWith(
          WalletTransaction,
          expect.objectContaining({ amount: 1000 }),
        );
      });

      it('wallet and gift cards together cover the whole total', async () => {
        const { service, insert } = buildService(
          {
            ...pending,
            walletAmountUsed: '6000.00',
            appliedGiftCards: [{ code: 'A', amountUsed: 4000 }],
          },
          { line: null },
        );
        jest.spyOn(service, 'getSession').mockResolvedValue({} as never);
        await submit(service, 0);
        expect(giftSpends(insert)[0][1]).toMatchObject({ amount: 4000 });
        expect(insert).toHaveBeenCalledWith(
          WalletTransaction,
          expect.objectContaining({ amount: 6000 }),
        );
      });
    });
  });

  describe('promo code', () => {
    const card = { line: { method: 'card', savedMethodId: 'card-1' } };
    const TEN = { code: 'TEST10', status: 'valid', discountType: 'percent', discountValue: 10 };
    const promoted = { ...pending, appliedPromoCode: 'promo-1' };
    const submit = (service: CheckoutDraftSessionService, expectedTotal: number) =>
      service.submitPayment('client-1', 'session-1', {
        authorized: true,
        expectedTotal,
      });
    const redemptions = (insert: jest.Mock) =>
      insert.mock.calls.filter(([entity]) => entity === PromoRedemption);
    const touchedPromo = (query: jest.Mock) =>
      query.mock.calls.filter(([sql]: [string]) => sql.includes('"promo_'));

    it('records the use with the order, the draft and the discount', async () => {
      const { service, insert, query } = buildService(promoted, {
        ...card,
        promo: TEN,
      });
      jest.spyOn(service, 'getSession').mockResolvedValue({} as never);
      await submit(service, 9000);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('FOR UPDATE'),
        ['promo-1'],
      );
      expect(insert).toHaveBeenCalledWith(PromoRedemption, {
        promoCodeId: 'promo-1',
        clientId: 'client-1',
        draftId: 'draft-1',
        orderId: 'C01-00001-0001',
        discountAmount: 1000,
      });
    });

    it('records a fixed discount as it is', async () => {
      const { service, insert } = buildService(promoted, {
        ...card,
        promo: { ...TEN, discountType: 'fixed', discountValue: 500 },
        promoRow: { discount_type: 'fixed', discount_value: '500.00' },
      });
      jest.spyOn(service, 'getSession').mockResolvedValue({} as never);
      await submit(service, 9500);
      expect(redemptions(insert)[0][1]).toMatchObject({ discountAmount: 500 });
    });

    it('does not touch the promo tables when no code is applied', async () => {
      const { service, insert, query } = buildService(pending, card);
      jest.spyOn(service, 'getSession').mockResolvedValue({} as never);
      await submit(service, 10000);
      expect(touchedPromo(query)).toHaveLength(0);
      expect(redemptions(insert)).toHaveLength(0);
    });

    it('records nothing and takes no discount when the code was already not valid when Submit started', async () => {
      const { service, insert, query } = buildService(promoted, {
        ...card,
        promo: { ...TEN, status: 'expired' },
      });
      jest.spyOn(service, 'getSession').mockResolvedValue({} as never);
      await submit(service, 10000);
      expect(touchedPromo(query)).toHaveLength(0);
      expect(redemptions(insert)).toHaveLength(0);
    });

    it('allows a code that still has uses left', async () => {
      const { service, insert } = buildService(promoted, {
        ...card,
        promo: TEN,
        promoRow: { max_redemptions: 2, max_per_client: 2 },
        promoCounts: { total: 1, mine: 1 },
      });
      jest.spyOn(service, 'getSession').mockResolvedValue({} as never);
      await submit(service, 9000);
      expect(redemptions(insert)).toHaveLength(1);
    });

    it('does not spend anything again on a repeat call', async () => {
      const { service, insert, query } = buildService(promoted, {
        ...card,
        promo: TEN,
        order: NEW_ORDER,
      });
      jest.spyOn(service, 'getSession').mockResolvedValue({} as never);
      await submit(service, 9000);
      expect(insert).not.toHaveBeenCalled();
      expect(touchedPromo(query)).toHaveLength(0);
    });

    it('fails with not found when the session has no draft', async () => {
      const { service, insert } = buildService(promoted, {
        ...card,
        promo: TEN,
        draftId: null,
      });
      await expect(submit(service, 9000)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(redemptions(insert)).toHaveLength(0);
    });

    describe('when the code can no longer be used', () => {
      it.each([
        ['all uses are taken', { max_redemptions: 1 }, { total: 1, mine: 0 }],
        ['this client used it up', { max_per_client: 1 }, { total: 1, mine: 1 }],
        ['it was switched off', { active: false }, undefined],
        ['it became service only', { applies_to: 'service' }, undefined],
        ['it expired', { expires_at: new Date('2020-01-01') }, undefined],
        ['it has not started', { starts_at: new Date('2099-01-01') }, undefined],
        ['its discount changed', { discount_value: '20.00' }, undefined],
        ['it was deleted', null, undefined],
      ])(
        'answers AMOUNT_CHANGED with the full price and drops the code when %s',
        async (_label, promoRow, promoCounts) => {
          const built = buildService(promoted, {
            ...card,
            promo: TEN,
            promoRow: promoRow as Record<string, unknown> | null,
            promoCounts,
          });
          await expect(submit(built.service, 9000)).rejects.toMatchObject({
            status: 409,
            response: { code: 'AMOUNT_CHANGED', currentTotal: 10000 },
          });
          expect(built.update).toHaveBeenCalledWith(
            CheckoutSession,
            'session-1',
            { appliedPromoCode: null },
          );
          expect(redemptions(built.insert)).toHaveLength(0);
        },
      );

      it('accepts the same submit once the page shows the new total', async () => {
        const built = buildService(promoted, {
          ...card,
          promo: TEN,
          promoRow: { max_redemptions: 1 },
          promoCounts: { total: 1, mine: 0 },
        });
        jest.spyOn(built.service, 'getSession').mockResolvedValue({} as never);
        await expect(submit(built.service, 9000)).rejects.toBeInstanceOf(
          ConflictException,
        );
        await submit(built.service, 10000);
        expect(redemptions(built.insert)).toHaveLength(0);
      });
    });

    describe('together with the wallet balance and gift cards', () => {
      const all = {
        ...promoted,
        walletAmountUsed: '3000.00',
        appliedGiftCards: [{ code: 'A', amountUsed: 2000 }],
      };

      it('spends all three in one order, wallet first, gift cards second, promo last', async () => {
        const { service, insert, query } = buildService(all, {
          ...card,
          promo: TEN,
        });
        jest.spyOn(service, 'getSession').mockResolvedValue({} as never);
        await submit(service, 4000);
        const writes = insert.mock.calls
          .map(([entity]) => entity)
          .filter((entity) =>
            [WalletTransaction, GiftCardRedemption, PromoRedemption].includes(
              entity,
            ),
          );
        expect(writes).toEqual([
          WalletTransaction,
          GiftCardRedemption,
          PromoRedemption,
        ]);
        expect(query).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE "checkout"."wallets"'),
          [300000, 'client-1'],
        );
        expect(redemptions(insert)[0][1]).toMatchObject({
          orderId: 'C01-00001-0001',
          discountAmount: 1000,
        });
      });

      it('promo no longer usable after the wallet and gift card were taken: the whole order is rolled back', async () => {
        const built = buildService(all, {
          ...card,
          promo: TEN,
          promoRow: { active: false },
        });
        await expect(submit(built.service, 4000)).rejects.toMatchObject({
          status: 409,
          response: { code: 'AMOUNT_CHANGED', currentTotal: 5000 },
        });
        expect(built.query).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE "checkout"."wallets"'),
          [300000, 'client-1'],
        );
        await expect(built.transaction.mock.results[0].value).rejects.toThrow(
          'The promo code can no longer be used',
        );
        expect(built.update).toHaveBeenCalledWith(CheckoutSession, 'session-1', {
          appliedPromoCode: null,
        });
        expect(built.update).not.toHaveBeenCalledWith(
          CheckoutSession,
          'session-1',
          expect.objectContaining({ walletAmountUsed: expect.anything() }),
        );
      });

      it('wallet short: stops before touching the gift cards or the promo', async () => {
        const built = buildService(all, {
          ...card,
          promo: TEN,
          walletBalance: '1000.00',
        });
        await expect(submit(built.service, 4000)).rejects.toMatchObject({
          status: 409,
        });
        expect(touchedPromo(built.query)).toHaveLength(0);
        expect(redemptions(built.insert)).toHaveLength(0);
      });

      it('gift card short: stops before the promo and keeps the code applied', async () => {
        const built = buildService(all, {
          ...card,
          promo: TEN,
          giftCards: { A: { remainingAmount: '500.00' } },
        });
        await expect(submit(built.service, 4000)).rejects.toMatchObject({
          status: 409,
        });
        expect(touchedPromo(built.query)).toHaveLength(0);
        expect(redemptions(built.insert)).toHaveLength(0);
        expect(built.update).not.toHaveBeenCalledWith(
          CheckoutSession,
          'session-1',
          { appliedPromoCode: null },
        );
      });

      it('the code and the gift card cover the whole total', async () => {
        const { service, insert } = buildService(
          {
            ...promoted,
            appliedGiftCards: [{ code: 'A', amountUsed: 9000 }],
          },
          { line: null, promo: TEN },
        );
        jest.spyOn(service, 'getSession').mockResolvedValue({} as never);
        await submit(service, 0);
        expect(redemptions(insert)[0][1]).toMatchObject({ discountAmount: 1000 });
      });
    });
  });

  describe('charge', () => {
    const card = { line: { method: 'card', savedMethodId: 'card-1' } };
    const submit = (service: CheckoutDraftSessionService, expectedTotal: number) =>
      service.submitPayment('client-1', 'session-1', {
        authorized: true,
        expectedTotal,
      });
    const withCredits = {
      ...pending,
      walletAmountUsed: '3000.00',
      appliedGiftCards: [{ code: 'A', amountUsed: 2000 }],
    };

    it('charges the saved card off session for the amount due with the order in the metadata', async () => {
      const { service, stripe } = buildService(pending, card);
      jest.spyOn(service, 'getSession').mockResolvedValue({} as never);
      await submit(service, 10000);
      expect(stripe.createPaymentIntent).toHaveBeenCalledTimes(1);
      expect(stripe.createPaymentIntent).toHaveBeenCalledWith({
        amount: 10000,
        customerId: 'cus_test_1',
        paymentMethodId: 'pm_test_1',
        paymentMethodTypes: ['card'],
        confirm: true,
        offSession: true,
        metadata: {
          clientId: 'client-1',
          listingId: 'listing-1',
          sessionId: 'session-1',
          orderId: 'C01-00001-0001',
          paymentId: 'pay-1',
        },
        idempotencyKey: 'payment-pay-1-1',
        timeoutMs: 25000,
      });
    });

    it('charges only what is left after the wallet and the gift cards', async () => {
      const { service, stripe } = buildService(withCredits, card);
      jest.spyOn(service, 'getSession').mockResolvedValue({} as never);
      await submit(service, 5000);
      expect(stripe.createPaymentIntent).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 5000 }),
      );
    });

    it('moves the payment row to processing, then paid with the payment intent id', async () => {
      const { service, update } = buildService(pending, card);
      jest.spyOn(service, 'getSession').mockResolvedValue({} as never);
      await submit(service, 10000);
      expect(update).toHaveBeenCalledWith(
        Payment,
        { id: 'pay-1', status: 'pending' },
        { status: 'processing' },
      );
      expect(update).toHaveBeenCalledWith(Payment, 'pay-1', {
        stripePaymentIntentId: 'pi_1',
        status: 'paid',
      });
    });

    it('marks the order paid with the time and the session success, and returns the paid order', async () => {
      const { service, update } = buildService(pending, card);
      jest.spyOn(service, 'getSession').mockResolvedValue({} as never);
      const result = await submit(service, 10000);
      expect(update).toHaveBeenCalledWith(Order, 'C01-00001-0001', {
        status: 'paid',
        paidAt: expect.any(Date),
      });
      expect(update).toHaveBeenCalledWith(CheckoutSession, 'session-1', {
        status: 'success',
      });
      expect(result).toMatchObject({
        order: { orderId: 'C01-00001-0001', status: 'paid' },
      });
    });

    it('charges after the credits were spent and the order was created', async () => {
      const { service, insert, stripe } = buildService(withCredits, card);
      jest.spyOn(service, 'getSession').mockResolvedValue({} as never);
      await submit(service, 5000);
      const charged = stripe.createPaymentIntent.mock.invocationCallOrder[0];
      const spent = insert.mock.calls
        .map(([entity], i) => ({ entity, at: insert.mock.invocationCallOrder[i] }))
        .filter(({ entity }) =>
          [Order, WalletTransaction, GiftCardRedemption].includes(entity),
        );
      expect(spent).toHaveLength(3);
      expect(spent.every(({ at }) => at < charged)).toBe(true);
    });

    it('does not call Stripe when the credits cover the whole total, and still marks the order paid', async () => {
      const { service, stripe, update } = buildService(
        { ...pending, appliedGiftCards: [{ code: 'A', amountUsed: 10000 }] },
        { line: null },
      );
      jest.spyOn(service, 'getSession').mockResolvedValue({} as never);
      await submit(service, 0);
      expect(stripe.createPaymentIntent).not.toHaveBeenCalled();
      expect(update).toHaveBeenCalledWith(Order, 'C01-00001-0001', {
        status: 'paid',
        paidAt: expect.any(Date),
      });
      expect(update).toHaveBeenCalledWith(CheckoutSession, 'session-1', {
        status: 'success',
      });
    });

    it('never charges again on a repeat call', async () => {
      const { service, stripe, update } = buildService(pending, {
        ...card,
        order: NEW_ORDER,
      });
      jest.spyOn(service, 'getSession').mockResolvedValue({} as never);
      await submit(service, 10000);
      expect(stripe.createPaymentIntent).not.toHaveBeenCalled();
      expect(update).not.toHaveBeenCalled();
    });

    it('does not charge or mark the session paid when another request already claimed the payment', async () => {
      const { service, stripe, update } = buildService(pending, {
        ...card,
        claim: 0,
      });
      jest.spyOn(service, 'getSession').mockResolvedValue({} as never);
      const result = await submit(service, 10000);
      expect(stripe.createPaymentIntent).not.toHaveBeenCalled();
      expect(update).not.toHaveBeenCalledWith(
        CheckoutSession,
        'session-1',
        expect.anything(),
      );
      expect(result).toMatchObject({ order: { status: 'processing' } });
    });

    describe('when Stripe does not complete the payment', () => {
      it('answers CHARGE_NOT_COMPLETED and leaves the order and the session unpaid when the call fails', async () => {
        const { service, update } = buildService(pending, {
          ...card,
          charge: new Error('Your card was declined.'),
        });
        await expect(submit(service, 10000)).rejects.toMatchObject({
          status: 502,
          response: { code: 'CHARGE_NOT_COMPLETED' },
        });
        expect(update).not.toHaveBeenCalledWith(
          Order,
          expect.anything(),
          expect.objectContaining({ status: 'paid' }),
        );
        expect(update).not.toHaveBeenCalledWith(
          CheckoutSession,
          'session-1',
          { status: 'success' },
        );
        expect(update).not.toHaveBeenCalledWith(
          Payment,
          'pay-1',
          expect.objectContaining({ status: 'paid' }),
        );
      });

      it('keeps the payment intent id Stripe puts on the error', async () => {
        const { service, update } = buildService(pending, {
          ...card,
          charge: Object.assign(new Error('declined'), {
            payment_intent: { id: 'pi_failed' },
          }),
        });
        await expect(submit(service, 10000)).rejects.toBeInstanceOf(
          BadGatewayException,
        );
        expect(update).toHaveBeenCalledWith(Payment, 'pay-1', {
          stripePaymentIntentId: 'pi_failed',
        });
      });

      it('treats any answer other than succeeded as not completed and keeps the intent id', async () => {
        const { service, update } = buildService(pending, {
          ...card,
          charge: { id: 'pi_2', status: 'requires_action' },
        });
        await expect(submit(service, 10000)).rejects.toMatchObject({
          response: { code: 'CHARGE_NOT_COMPLETED' },
        });
        expect(update).toHaveBeenCalledWith(Payment, 'pay-1', {
          stripePaymentIntentId: 'pi_2',
        });
        expect(update).not.toHaveBeenCalledWith(
          Order,
          expect.anything(),
          expect.objectContaining({ status: 'paid' }),
        );
      });
    });

    describe('when the card cannot be charged', () => {
      it.each([
        ['the Stripe customer is missing', { customer: null }],
        ['the saved card row is missing', { savedCardRow: null }],
        ['the line is not a card', { line: { method: 'ach', savedMethodId: 'card-1' } }],
      ])('answers 422 before anything is spent when %s', async (_label, extra) => {
        const { service, insert, stripe } = buildService(withCredits, {
          ...card,
          ...extra,
        });
        await expect(submit(service, 5000)).rejects.toBeInstanceOf(
          UnprocessableEntityException,
        );
        expect(insert).not.toHaveBeenCalled();
        expect(stripe.createPaymentIntent).not.toHaveBeenCalled();
      });
    });

    describe('when a credit is no longer usable', () => {
      it.each([
        ['the wallet is short', { walletBalance: '1000.00' }],
        ['a gift card is short', { giftCards: { A: { remainingAmount: '500.00' } } }],
      ])('does not call Stripe when %s', async (_label, extra) => {
        const { service, stripe } = buildService(withCredits, {
          ...card,
          ...extra,
        });
        await expect(submit(service, 5000)).rejects.toBeInstanceOf(
          ConflictException,
        );
        expect(stripe.createPaymentIntent).not.toHaveBeenCalled();
      });

      it('does not call Stripe when the promo code is no longer usable', async () => {
        const { service, stripe } = buildService(
          { ...pending, appliedPromoCode: 'promo-1' },
          {
            ...card,
            promo: {
              code: 'TEST10',
              status: 'valid',
              discountType: 'percent',
              discountValue: 10,
            },
            promoRow: { active: false },
          },
        );
        await expect(submit(service, 9000)).rejects.toBeInstanceOf(
          ConflictException,
        );
        expect(stripe.createPaymentIntent).not.toHaveBeenCalled();
      });
    });
  });

  describe('order snapshots', () => {
    const card = { line: { method: 'card', savedMethodId: 'card-1' } };
    const TEN = {
      code: 'TEST10',
      status: 'valid',
      discountType: 'percent',
      discountValue: 10,
    };
    const submit = (
      service: CheckoutDraftSessionService,
      expectedTotal: number,
    ) =>
      service.submitPayment('client-1', 'session-1', {
        authorized: true,
        expectedTotal,
      });
    const details = (update: jest.Mock) =>
      update.mock.calls
        .filter(
          ([entity, , patch]) => entity === Order && patch?.paymentDetailsSnapshot,
        )
        .map(([, , patch]) => patch.paymentDetailsSnapshot);

    it('writes the price breakdown of an order with no credits', async () => {
      const { service, update } = buildService(pending, card);
      jest.spyOn(service, 'getSession').mockResolvedValue({} as never);
      await submit(service, 10000);
      expect(details(update)).toEqual([
        {
          projectCost: 10000,
          tax: 0,
          promo: null,
          giftCards: [],
          balanceApplied: 0,
          total: 10000,
          capturedAt: expect.any(String),
        },
      ]);
    });

    it('writes the promo, gift card and balance amounts that were really spent', async () => {
      const { service, update, insert } = buildService(
        {
          ...pending,
          appliedPromoCode: 'promo-1',
          walletAmountUsed: '3000.00',
          appliedGiftCards: [{ code: 'A', amountUsed: 2000 }],
        },
        { ...card, promo: TEN },
      );
      jest.spyOn(service, 'getSession').mockResolvedValue({} as never);
      await submit(service, 4000);
      expect(details(update)).toEqual([
        {
          projectCost: 10000,
          tax: 0,
          promo: { code: 'TEST10', type: 'percent', value: 10, amount: 1000 },
          giftCards: [{ code: 'A', amount: 2000 }],
          balanceApplied: 3000,
          total: 4000,
          capturedAt: expect.any(String),
        },
      ]);
      expect(insert).toHaveBeenCalledWith(
        Order,
        expect.objectContaining({ orderCost: 4000 }),
      );
    });

    it('adds up: project cost minus promo, gift cards and balance is the total', async () => {
      const { service, update } = buildService(
        {
          ...pending,
          appliedPromoCode: 'promo-1',
          walletAmountUsed: '3000.00',
          appliedGiftCards: [{ code: 'A', amountUsed: 2000 }],
        },
        { ...card, promo: TEN },
      );
      jest.spyOn(service, 'getSession').mockResolvedValue({} as never);
      await submit(service, 4000);
      const [snapshot] = details(update);
      const giftTotal = snapshot.giftCards.reduce(
        (sum: number, entry: { amount: number }) => sum + entry.amount,
        0,
      );
      expect(
        snapshot.projectCost -
          snapshot.promo.amount -
          giftTotal -
          snapshot.balanceApplied,
      ).toBe(snapshot.total);
    });

    it('lists several gift cards by code with their own amounts', async () => {
      const { service, update } = buildService(
        {
          ...pending,
          appliedGiftCards: [
            { code: 'B', amountUsed: 2000 },
            { code: 'A', amountUsed: 500 },
          ],
        },
        card,
      );
      jest.spyOn(service, 'getSession').mockResolvedValue({} as never);
      await submit(service, 7500);
      expect(details(update)[0].giftCards).toEqual([
        { code: 'A', amount: 500 },
        { code: 'B', amount: 2000 },
      ]);
    });

    it('writes a fixed promo as it is', async () => {
      const { service, update } = buildService(
        { ...pending, appliedPromoCode: 'promo-1' },
        {
          ...card,
          promo: { ...TEN, discountType: 'fixed', discountValue: 500 },
          promoRow: { discount_type: 'fixed', discount_value: '500.00' },
        },
      );
      jest.spyOn(service, 'getSession').mockResolvedValue({} as never);
      await submit(service, 9500);
      expect(details(update)[0]).toMatchObject({
        promo: { code: 'TEST10', type: 'fixed', value: 500, amount: 500 },
        total: 9500,
      });
    });

    it('writes a total of 0 when the credits cover the whole price', async () => {
      const { service, update } = buildService(
        { ...pending, appliedGiftCards: [{ code: 'A', amountUsed: 10000 }] },
        { line: null },
      );
      jest.spyOn(service, 'getSession').mockResolvedValue({} as never);
      await submit(service, 0);
      expect(details(update)[0]).toMatchObject({
        giftCards: [{ code: 'A', amount: 10000 }],
        balanceApplied: 0,
        total: 0,
      });
    });

    it('writes the breakdown after the credits were spent, in the same transaction', async () => {
      const { service, update, insert, transaction } = buildService(
        {
          ...pending,
          appliedPromoCode: 'promo-1',
          walletAmountUsed: '3000.00',
          appliedGiftCards: [{ code: 'A', amountUsed: 2000 }],
        },
        { ...card, promo: TEN },
      );
      jest.spyOn(service, 'getSession').mockResolvedValue({} as never);
      await submit(service, 4000);
      const written = update.mock.calls
        .map(([entity, , patch], i) => ({
          entity,
          patch,
          at: update.mock.invocationCallOrder[i],
        }))
        .find(
          ({ entity, patch }) => entity === Order && patch?.paymentDetailsSnapshot,
        )!.at;
      const spendCalls = insert.mock.calls
        .map(([entity], i) => ({ entity, at: insert.mock.invocationCallOrder[i] }))
        .filter(({ entity }) =>
          [WalletTransaction, GiftCardRedemption, PromoRedemption].includes(
            entity,
          ),
        );
      expect(spendCalls).toHaveLength(3);
      expect(spendCalls.every(({ at }) => at < written)).toBe(true);
      expect(transaction).toHaveBeenCalledTimes(1);
    });

    it('writes no breakdown when a credit turns out to be short', async () => {
      const { service, update } = buildService(
        {
          ...pending,
          walletAmountUsed: '3000.00',
          appliedGiftCards: [{ code: 'A', amountUsed: 2000 }],
        },
        { ...card, walletBalance: '1000.00' },
      );
      await expect(submit(service, 5000)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(details(update)).toHaveLength(0);
    });

    it('writes nothing again on a repeat call', async () => {
      const { service, update } = buildService(pending, {
        ...card,
        order: NEW_ORDER,
      });
      jest.spyOn(service, 'getSession').mockResolvedValue({} as never);
      await submit(service, 10000);
      expect(details(update)).toHaveLength(0);
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
