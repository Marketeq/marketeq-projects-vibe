import { ServiceUnavailableException } from '@nestjs/common';
import { CheckoutService } from './checkout.service';

const LEGACY = [
  'createSession',
  'createCardPaymentIntent',
  'processSplitPayment',
  'payWithACH',
  'initiateWireTransfer',
  'confirmWireTransfer',
] as const;

describe('old payment routes that are not available yet', () => {
  const service = Object.create(CheckoutService.prototype) as Record<
    string,
    (dto: unknown) => Promise<unknown>
  >;

  it.each(LEGACY)('%s refuses before touching anything', async (name) => {
    await expect(service[name]({})).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    await expect(service[name]({})).rejects.toMatchObject({
      response: { code: 'PAYMENT_METHOD_UNAVAILABLE' },
    });
  });
});
