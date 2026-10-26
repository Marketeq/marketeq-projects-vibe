import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CheckoutDraftSessionService } from './checkout-draft-session.service';
import { PaymentSelectionRegistry } from './payment-selection.registry';

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

const buildService = (
  session: Record<string, unknown> | null,
  options: { expired?: boolean; findCard?: unknown } = {},
) => {
  const update = jest.fn().mockResolvedValue(undefined);
  const manager = {
    findOne: jest.fn().mockResolvedValue(session),
    update,
    query: jest.fn().mockResolvedValue([{ expired: options.expired ?? false }]),
  };
  const savedCards = {
    getCardView: jest.fn().mockResolvedValue(CARD),
    findCardView: jest
      .fn()
      .mockResolvedValue(options.findCard === undefined ? CARD : options.findCard),
  };
  const registry = new PaymentSelectionRegistry(savedCards as never);
  const service = new CheckoutDraftSessionService(
    { manager } as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    registry,
  );
  return { service, update, savedCards };
};

const pending = { id: 'session-1', status: 'pending', paymentMethod: 'card' };

describe('session payment selection', () => {
  it('saves the chosen card on the session and returns its summary', async () => {
    const { service, update } = buildService(pending);
    const result = await service.setPaymentSelection('client-1', 'session-1', {
      method: 'card',
      id: 'card-1',
    });
    expect(update).toHaveBeenCalledWith(expect.anything(), 'session-1', {
      paymentMethod: 'card',
      paymentSelectionId: 'card-1',
    });
    expect(result).toMatchObject({ method: 'card', id: 'card-1', last4: '0005' });
  });

  it('refuses a card that is not the client own', async () => {
    const { service, savedCards, update } = buildService(pending);
    savedCards.getCardView.mockRejectedValue(new ForbiddenException());
    await expect(
      service.setPaymentSelection('client-1', 'session-1', {
        method: 'card',
        id: 'card-9',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(update).not.toHaveBeenCalled();
  });

  it('refuses a method that cannot be saved yet', async () => {
    const { service, update } = buildService(pending);
    await expect(
      service.setPaymentSelection('client-1', 'session-1', {
        method: 'ach',
        id: 'bank-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(update).not.toHaveBeenCalled();
  });

  it('returns 404 for a session that is not the client own', async () => {
    const { service } = buildService(null);
    await expect(
      service.setPaymentSelection('client-1', 'session-1', {
        method: 'card',
        id: 'card-1',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('refuses a paid session', async () => {
    const { service } = buildService({ ...pending, status: 'success' });
    await expect(
      service.setPaymentSelection('client-1', 'session-1', {
        method: 'card',
        id: 'card-1',
      }),
    ).rejects.toMatchObject({ response: { code: 'SESSION_ALREADY_PAID' } });
  });

  it('refuses an expired session', async () => {
    const { service } = buildService(pending, { expired: true });
    await expect(
      service.setPaymentSelection('client-1', 'session-1', {
        method: 'card',
        id: 'card-1',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('clears only the selection id', async () => {
    const { service, update } = buildService(pending);
    await service.clearPaymentSelection('client-1', 'session-1');
    expect(update).toHaveBeenCalledWith(expect.anything(), 'session-1', {
      paymentSelectionId: null,
    });
  });

  it('reads back null when the saved card was deleted', async () => {
    const { service } = buildService(
      { ...pending, paymentSelectionId: 'card-1' },
      { findCard: null },
    );
    const read = (
      service as unknown as {
        readPaymentSelection(c: string, s: unknown): Promise<unknown>;
      }
    ).readPaymentSelection.bind(service);
    await expect(
      read('client-1', { ...pending, paymentSelectionId: 'card-1' }),
    ).resolves.toBeNull();
  });
});
