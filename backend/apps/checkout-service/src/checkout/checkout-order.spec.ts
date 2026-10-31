import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CheckoutDraftSessionService } from './checkout-draft-session.service';
import { CheckoutSession } from './entities/checkout-session.entity';
import { Order } from './entities/order.entity';

const PAID_AT = new Date('2026-10-30T12:11:22.278Z');
const CREATED_AT = new Date('2026-10-30T12:11:20.000Z');

const ORDER = {
  orderId: 'C01-10000-0002',
  sessionId: 'session-1',
  clientId: 'client-1',
  listingId: 'listing-1',
  status: 'paid',
  orderCost: '24160.00',
  confirmationEmail: 'client001@gmail.com',
  paidAt: PAID_AT,
  createdAt: CREATED_AT,
  paymentSnapshot: [
    {
      paymentId: 'pay-1',
      phase: 'initial',
      method: 'card',
      amount: 24160,
      card: {
        brand: 'visa',
        funding: 'credit',
        last4: '4242',
        expMonth: 10,
        expYear: 2027,
      },
      billingAddress: null,
      capturedAt: '2026-10-30T12:11:22.000Z',
    },
  ],
  paymentDetailsSnapshot: {
    projectCost: 32400,
    tax: 0,
    promo: { code: 'TEST10', type: 'percent', value: 10, amount: 3240 },
    giftCards: [{ code: 'A', amount: 2000 }],
    balanceApplied: 3000,
    total: 24160,
    capturedAt: '2026-10-30T12:11:20.000Z',
  },
};

const SESSION = {
  id: 'session-1',
  status: 'success',
  projectCost: '32400.00',
  walletAmountUsed: '0.00',
  appliedGiftCards: null,
  appliedPromoCode: null,
  contractId: null,
};

const buildService = (order: Record<string, unknown> | null) => {
  const findOne = jest.fn().mockImplementation(
    async (
      entity: unknown,
      options?: { where?: Record<string, unknown> },
    ) => {
      if (entity === CheckoutSession) return SESSION;
      if (entity === Order) {
        const where = options?.where ?? {};
        if (!order) return null;
        const matches = Object.entries(where).every(
          ([key, value]) => order[key] === value,
        );
        return matches ? order : null;
      }
      return null;
    },
  );
  const manager = {
    findOne,
    query: jest.fn().mockResolvedValue([{ expired: false }]),
  };
  const dataSource = { manager };
  const draftService = {
    getSessionSummary: jest.fn().mockResolvedValue({
      draftId: 'draft-1',
      listingId: 'listing-1',
      title: 'Pixel Quest',
      mediaUrl: null,
      teamMemberCount: 3,
      durationDays: 14,
    }),
  };
  const summaryService = {
    fetchProject: jest.fn().mockResolvedValue({ slug: 'pixel-quest' }),
  };
  const codeService = {
    listCodes: jest.fn().mockResolvedValue({ promo: null }),
    getGiftCardLock: jest.fn().mockResolvedValue({ lockedUntil: null }),
  };
  const service = new CheckoutDraftSessionService(
    dataSource as never,
    {} as never,
    summaryService as never,
    draftService as never,
    codeService as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );
  return { service, findOne };
};

describe('order read', () => {
  it('returns the header fields of the clients own order', async () => {
    const { service, findOne } = buildService(ORDER);
    await expect(service.getOrder('client-1', 'C01-10000-0002')).resolves.toEqual({
      orderId: 'C01-10000-0002',
      sessionId: 'session-1',
      status: 'paid',
      orderCost: 24160,
      createdAt: CREATED_AT,
      paidAt: PAID_AT,
      confirmationEmail: 'client001@gmail.com',
      paymentSnapshot: ORDER.paymentSnapshot,
      paymentDetailsSnapshot: ORDER.paymentDetailsSnapshot,
    });
    expect(findOne).toHaveBeenCalledWith(Order, {
      where: { orderId: 'C01-10000-0002', clientId: 'client-1' },
    });
  });

  it('does not leak fields the page does not need', async () => {
    const { service } = buildService(ORDER);
    const result = await service.getOrder('client-1', 'C01-10000-0002');
    expect(Object.keys(result).sort()).toEqual([
      'confirmationEmail',
      'createdAt',
      'orderCost',
      'orderId',
      'paidAt',
      'paymentDetailsSnapshot',
      'paymentSnapshot',
      'sessionId',
      'status',
    ]);
  });

  it('returns the cost of the order as a number', async () => {
    const { service } = buildService({ ...ORDER, orderCost: '2500.50' });
    await expect(
      service.getOrder('client-1', 'C01-10000-0002'),
    ).resolves.toMatchObject({ orderCost: 2500.5 });
  });

  it('returns the payment snapshot with the amount of every line', async () => {
    const snapshot = [
      { ...ORDER.paymentSnapshot[0], paymentId: 'pay-1', amount: 6000 },
      { ...ORDER.paymentSnapshot[0], paymentId: 'pay-2', amount: 4000 },
      {
        ...ORDER.paymentSnapshot[0],
        paymentId: 'pay-3',
        phase: 'recurring',
        amount: 1500.25,
      },
    ];
    const { service } = buildService({ ...ORDER, paymentSnapshot: snapshot });
    const result = await service.getOrder('client-1', 'C01-10000-0002');
    expect(result.paymentSnapshot).toEqual(snapshot);
  });

  it('returns an empty list when the credits covered the total and when the order has no snapshot', async () => {
    const covered = buildService({ ...ORDER, paymentSnapshot: [] });
    await expect(
      covered.service.getOrder('client-1', 'C01-10000-0002'),
    ).resolves.toMatchObject({ paymentSnapshot: [] });
    const older = buildService({ ...ORDER, paymentSnapshot: null });
    await expect(
      older.service.getOrder('client-1', 'C01-10000-0002'),
    ).resolves.toMatchObject({ paymentSnapshot: [] });
  });

  it('returns the price breakdown as it was stored', async () => {
    const { service } = buildService(ORDER);
    const result = await service.getOrder('client-1', 'C01-10000-0002');
    expect(result.paymentDetailsSnapshot).toEqual(ORDER.paymentDetailsSnapshot);
  });

  it('returns null when an older order has no price breakdown', async () => {
    const { service } = buildService({ ...ORDER, paymentDetailsSnapshot: null });
    await expect(
      service.getOrder('client-1', 'C01-10000-0002'),
    ).resolves.toMatchObject({ paymentDetailsSnapshot: null });
  });

  it('keeps a missing confirmation email as null', async () => {
    const { service } = buildService({ ...ORDER, confirmationEmail: null });
    await expect(
      service.getOrder('client-1', 'C01-10000-0002'),
    ).resolves.toMatchObject({ confirmationEmail: null });
  });

  it('returns no paid time for an order that is still processing', async () => {
    const { service } = buildService({
      ...ORDER,
      status: 'processing',
      paidAt: null,
    });
    await expect(
      service.getOrder('client-1', 'C01-10000-0002'),
    ).resolves.toMatchObject({ status: 'processing', paidAt: null });
  });

  it('answers 404 ORDER_NOT_FOUND for the order of another client', async () => {
    const { service } = buildService(ORDER);
    const attempt = service.getOrder('client-2', 'C01-10000-0002');
    await expect(attempt).rejects.toBeInstanceOf(NotFoundException);
    await expect(attempt).rejects.toMatchObject({
      response: { code: 'ORDER_NOT_FOUND' },
    });
  });

  it('answers the same 404 for an order that does not exist', async () => {
    const { service } = buildService(null);
    await expect(
      service.getOrder('client-1', 'C01-99999-9999'),
    ).rejects.toMatchObject({ status: 404, response: { code: 'ORDER_NOT_FOUND' } });
  });

  it.each([
    ['an empty id', ''],
    ['a session id', '98ae5359-79e4-43d8-8636-aecd7fe0d2f4'],
    ['the wrong prefix', 'C02-10000-0002'],
    ['too few digits', 'C01-1000-0002'],
    ['lower case', 'c01-10000-0002'],
    ['trailing text', 'C01-10000-0002x'],
    ['a sql fragment', "C01-10000-0002' OR '1'='1"],
  ])('answers 400 INVALID_ORDER_ID for %s without reading the database', async (_label, id) => {
    const { service, findOne } = buildService(ORDER);
    const attempt = service.getOrder('client-1', id);
    await expect(attempt).rejects.toBeInstanceOf(BadRequestException);
    await expect(attempt).rejects.toMatchObject({
      response: { code: 'INVALID_ORDER_ID' },
    });
    expect(findOne).not.toHaveBeenCalled();
  });
});

describe('session order id', () => {
  it('returns the order id once the session has an order', async () => {
    const { service } = buildService(ORDER);
    await expect(
      service.getSession('client-1', 'session-1'),
    ).resolves.toMatchObject({ sessionId: 'session-1', orderId: 'C01-10000-0002' });
  });

  it('returns the id of the draft the session was made from', async () => {
    const { service } = buildService(ORDER);
    await expect(
      service.getSession('client-1', 'session-1'),
    ).resolves.toMatchObject({ draftId: 'draft-1' });
  });

  it('returns null for the draft id when the draft is gone', async () => {
    const { service } = buildService(ORDER);
    jest
      .spyOn(
        (service as unknown as { draftService: { getSessionSummary: jest.Mock } })
          .draftService,
        'getSessionSummary',
      )
      .mockResolvedValue(null);
    await expect(
      service.getSession('client-1', 'session-1'),
    ).resolves.toMatchObject({ draftId: null, orderId: 'C01-10000-0002' });
  });

  it('returns null while the session has no order', async () => {
    const { service } = buildService(null);
    jest
      .spyOn(
        (service as unknown as { draftService: { getSessionSummary: jest.Mock } })
          .draftService,
        'getSessionSummary',
      )
      .mockResolvedValue({ listingId: 'listing-1' });
    await expect(
      service.getSession('client-1', 'session-1'),
    ).resolves.toMatchObject({ orderId: null });
  });
});
