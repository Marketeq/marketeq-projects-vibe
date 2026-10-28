const create = jest.fn().mockResolvedValue({ id: 'pi_1' });

jest.mock('stripe', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({ paymentIntents: { create } })),
}));

import { StripeService } from './stripe.service';

describe('StripeService.createPaymentIntent', () => {
  let service: StripeService;

  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_placeholder';
    create.mockClear();
    service = new StripeService();
  });

  it('sends no request options and no off_session flag when none are given', async () => {
    await service.createPaymentIntent({ amount: 10.5, customerId: 'cus_1' });
    expect(create).toHaveBeenCalledTimes(1);
    const [body, options] = create.mock.calls[0];
    expect(body.amount).toBe(1050);
    expect(body.off_session).toBeUndefined();
    expect(options).toBeUndefined();
  });

  it('charges a saved card off session', async () => {
    await service.createPaymentIntent({
      amount: 24400,
      customerId: 'cus_1',
      paymentMethodId: 'pm_1',
      confirm: true,
      offSession: true,
    });
    const [body] = create.mock.calls[0];
    expect(body).toMatchObject({
      amount: 2440000,
      customer: 'cus_1',
      payment_method: 'pm_1',
      confirm: true,
      off_session: true,
    });
  });

  it('passes the idempotency key and the timeout as request options', async () => {
    await service.createPaymentIntent({
      amount: 100,
      idempotencyKey: 'line-1-attempt-1',
      timeoutMs: 25000,
    });
    const [, options] = create.mock.calls[0];
    expect(options).toEqual({
      idempotencyKey: 'line-1-attempt-1',
      timeout: 25000,
    });
  });

  it('passes only the idempotency key when there is no timeout', async () => {
    await service.createPaymentIntent({
      amount: 100,
      idempotencyKey: 'line-1-attempt-2',
    });
    const [, options] = create.mock.calls[0];
    expect(options).toEqual({ idempotencyKey: 'line-1-attempt-2' });
  });
});
