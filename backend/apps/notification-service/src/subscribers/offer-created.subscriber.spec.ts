import { OfferCreatedSubscriber } from './offer-created.subscriber';

function fakeConfig(url = 'amqp://unused') {
  return { get: jest.fn(() => url) } as any;
}

function fakeChannel() {
  return {
    ack: jest.fn(),
    nack: jest.fn(),
  } as any;
}

function fakeUsers(summary: Record<string, unknown> | null = {
  id: 'client-1',
  email: 'client@example.com',
  firstName: 'Jane',
  lastName: 'Doe',
  username: 'janedoe',
  avatarUrl: 'https://cdn.example.com/janedoe.png',
}) {
  const getUserSummary = summary
    ? jest.fn().mockResolvedValue(summary)
    : jest.fn().mockRejectedValue(new Error('user-service unreachable'));
  return { getUserSummary } as any;
}

function fakeMsg(
  body: unknown,
  overrides: { routingKey?: string; redelivered?: boolean; timestamp?: number } = {},
) {
  return {
    content: Buffer.from(JSON.stringify(body)),
    fields: {
      routingKey: overrides.routingKey ?? 'offer.created',
      redelivered: overrides.redelivered ?? false,
    },
    properties: {
      timestamp: overrides.timestamp,
    },
  } as any;
}

const NOW = new Date('2026-02-10T00:00:00.000Z');

const validPayload = (over: Record<string, unknown> = {}) => ({
  eventType: 'offer.created',
  occurredAt: NOW.toISOString(),
  offerId: 'offer-1',
  clientId: 'client-1',
  talentId: 'talent-1',
  jobListingId: null,
  contractType: 'PROJECT',
  contractTitle: 'Web Development',
  terms: {
    rate: 70,
    currencyCode: 'USD',
    durationMonths: 3,
    workSchedule: { type: 'FULL_TIME' },
    startDate: '2026-02-05',
    message: null,
  },
  expiresAt: '2026-02-12T00:00:00.000Z',
  ...over,
});

describe('OfferCreatedSubscriber', () => {
  let nowSpy: jest.SpyInstance;

  beforeEach(() => {
    nowSpy = jest.spyOn(Date, 'now').mockReturnValue(NOW.getTime());
  });

  afterEach(() => {
    nowSpy.mockRestore();
  });

  it('stores the talent notification with the expected mapping, the offer.received event name, and an offer-scoped idempotency key', async () => {
    const dispatch = jest.fn().mockResolvedValue({ id: 'n1' });
    const subscriber = new OfferCreatedSubscriber(fakeConfig(), { dispatch } as any, fakeUsers());
    const channel = fakeChannel();
    const msg = fakeMsg(validPayload());

    await (subscriber as any).handle(channel, msg);

    expect(dispatch).toHaveBeenCalledTimes(1);
    const call = dispatch.mock.calls[0][0];
    expect(call.recipientId).toBe('talent-1');
    expect(call.category).toBe('offers');
    // F1: 'offer.received', matching the seeded notifications that already
    // render correctly (qa-seed-sakshi-offers.js / qa-seed-demo1-offers.js),
    // not the raw RabbitMQ routing key 'offer.created'.
    expect(call.event).toBe('offer.received');
    expect(call.idempotencyKey).toBe('offer.created:offer-1');
    expect(call.delivery).toEqual({ inApp: true, email: false });
    expect(call.body).toBe('Jane Doe sent you a new offer at $70/hr.');
    expect(call.metadata).toMatchObject({
      offerId: 'offer-1',
      clientPerspective: false,
      actorId: 'client-1',
      senderDisplayName: 'Jane Doe',
      senderUsername: '@janedoe',
      senderAvatarUrl: 'https://cdn.example.com/janedoe.png',
      avatarUrl: 'https://cdn.example.com/janedoe.png',
      jobListingId: null,
      offerType: 'PROJECT',
      contractTitle: 'Web Development',
      offerRate: '$70/hr',
      duration: '3 Months',
      schedule: 'Full Time',
      startDate: '2026-02-05',
      expiresAt: '2026-02-12T00:00:00.000Z',
      contractId: null,
    });
    expect(channel.ack).toHaveBeenCalledWith(msg);
    expect(channel.nack).not.toHaveBeenCalled();
  });

  it('F2: falls back to "A client" with no username/avatar when the user-service lookup fails, and still stores the notification', async () => {
    const dispatch = jest.fn().mockResolvedValue({ id: 'n1' });
    const subscriber = new OfferCreatedSubscriber(fakeConfig(), { dispatch } as any, fakeUsers(null));
    const channel = fakeChannel();
    const msg = fakeMsg(validPayload());

    await (subscriber as any).handle(channel, msg);

    expect(dispatch).toHaveBeenCalledTimes(1);
    const call = dispatch.mock.calls[0][0];
    expect(call.body).toBe('A client sent you a new offer at $70/hr.');
    expect(call.metadata).toMatchObject({
      senderDisplayName: 'A client',
      senderUsername: undefined,
      senderAvatarUrl: undefined,
    });
    expect(channel.ack).toHaveBeenCalledWith(msg);
    expect(channel.nack).not.toHaveBeenCalled();
  });

  it('F2: falls back to the username when the user-service summary has no first/last name', async () => {
    const dispatch = jest.fn().mockResolvedValue({ id: 'n1' });
    const users = fakeUsers({ id: 'client-1', email: 'c@x.com', username: 'justausername' });
    const subscriber = new OfferCreatedSubscriber(fakeConfig(), { dispatch } as any, users);
    const channel = fakeChannel();

    await (subscriber as any).handle(channel, fakeMsg(validPayload()));

    expect(dispatch.mock.calls[0][0].metadata).toMatchObject({
      senderDisplayName: 'justausername',
      senderUsername: '@justausername',
    });
  });

  it('builds the same idempotency key on a redelivery of the same offer', async () => {
    const dispatch = jest.fn().mockResolvedValue({ id: 'n1' });
    const subscriber = new OfferCreatedSubscriber(fakeConfig(), { dispatch } as any, fakeUsers());
    const channel = fakeChannel();

    await (subscriber as any).handle(channel, fakeMsg(validPayload(), { redelivered: false }));
    await (subscriber as any).handle(channel, fakeMsg(validPayload(), { redelivered: true }));

    expect(dispatch).toHaveBeenCalledTimes(2);
    expect(dispatch.mock.calls[0][0].idempotencyKey).toBe('offer.created:offer-1');
    expect(dispatch.mock.calls[1][0].idempotencyKey).toBe('offer.created:offer-1');
  });

  it('acks and skips every other offer.* event without calling dispatch', async () => {
    const dispatch = jest.fn();
    const subscriber = new OfferCreatedSubscriber(fakeConfig(), { dispatch } as any, fakeUsers());
    const channel = fakeChannel();

    const msg = fakeMsg(
      { eventType: 'offer.accepted', offerId: 'offer-2', clientId: 'c', talentId: 't' },
      { routingKey: 'offer.accepted' },
    );
    await (subscriber as any).handle(channel, msg);

    expect(dispatch).not.toHaveBeenCalled();
    expect(channel.ack).toHaveBeenCalledWith(msg);
    expect(channel.nack).not.toHaveBeenCalled();
  });

  it('dead-letters a malformed offer.created (missing terms) without calling dispatch', async () => {
    const dispatch = jest.fn();
    const subscriber = new OfferCreatedSubscriber(fakeConfig(), { dispatch } as any, fakeUsers());
    const channel = fakeChannel();

    const msg = fakeMsg(validPayload({ terms: undefined }));
    await (subscriber as any).handle(channel, msg);

    expect(dispatch).not.toHaveBeenCalled();
    expect(channel.nack).toHaveBeenCalledWith(msg, false, false);
    expect(channel.ack).not.toHaveBeenCalled();
  });

  it('dead-letters unparseable message content', async () => {
    const dispatch = jest.fn();
    const subscriber = new OfferCreatedSubscriber(fakeConfig(), { dispatch } as any, fakeUsers());
    const channel = fakeChannel();

    const msg = { content: Buffer.from('not json'), fields: { routingKey: 'offer.created', redelivered: false } } as any;
    await (subscriber as any).handle(channel, msg);

    expect(dispatch).not.toHaveBeenCalled();
    expect(channel.nack).toHaveBeenCalledWith(msg, false, false);
  });

  it('nacks with requeue on a transient dispatch failure, then dead-letters on redelivery', async () => {
    const dispatch = jest.fn().mockRejectedValue(new Error('db unavailable'));
    const subscriber = new OfferCreatedSubscriber(fakeConfig(), { dispatch } as any, fakeUsers());
    const channel = fakeChannel();

    const firstMsg = fakeMsg(validPayload(), { redelivered: false });
    await (subscriber as any).handle(channel, firstMsg);
    expect(channel.nack).toHaveBeenCalledWith(firstMsg, false, true);

    const redeliveredMsg = fakeMsg(validPayload(), { redelivered: true });
    await (subscriber as any).handle(channel, redeliveredMsg);
    expect(channel.nack).toHaveBeenCalledWith(redeliveredMsg, false, false);
  });

  describe('F3: backlog guard', () => {
    it('acks and skips a payload.occurredAt older than 7 days without calling dispatch', async () => {
      const dispatch = jest.fn();
      const subscriber = new OfferCreatedSubscriber(fakeConfig(), { dispatch } as any, fakeUsers());
      const channel = fakeChannel();
      const eightDaysAgo = new Date(NOW.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString();

      const msg = fakeMsg(validPayload({ occurredAt: eightDaysAgo }));
      await (subscriber as any).handle(channel, msg);

      expect(dispatch).not.toHaveBeenCalled();
      expect(channel.ack).toHaveBeenCalledWith(msg);
      expect(channel.nack).not.toHaveBeenCalled();
      expect((subscriber as any).backlogSkippedCount).toBe(1);
    });

    it('does not skip a payload.occurredAt within 7 days', async () => {
      const dispatch = jest.fn().mockResolvedValue({ id: 'n1' });
      const subscriber = new OfferCreatedSubscriber(fakeConfig(), { dispatch } as any, fakeUsers());
      const channel = fakeChannel();
      const sixDaysAgo = new Date(NOW.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString();

      await (subscriber as any).handle(channel, fakeMsg(validPayload({ occurredAt: sixDaysAgo })));

      expect(dispatch).toHaveBeenCalledTimes(1);
    });

    it('falls back to the AMQP message timestamp property when occurredAt is missing, and skips a stale one', async () => {
      const dispatch = jest.fn();
      const subscriber = new OfferCreatedSubscriber(fakeConfig(), { dispatch } as any, fakeUsers());
      const channel = fakeChannel();
      const eightDaysAgoSeconds = Math.floor((NOW.getTime() - 8 * 24 * 60 * 60 * 1000) / 1000);

      const msg = fakeMsg(validPayload({ occurredAt: undefined }), { timestamp: eightDaysAgoSeconds });
      await (subscriber as any).handle(channel, msg);

      expect(dispatch).not.toHaveBeenCalled();
      expect(channel.ack).toHaveBeenCalledWith(msg);
    });

    it('processes normally (does not guess/skip) when neither occurredAt nor an AMQP timestamp exists', async () => {
      const dispatch = jest.fn().mockResolvedValue({ id: 'n1' });
      const subscriber = new OfferCreatedSubscriber(fakeConfig(), { dispatch } as any, fakeUsers());
      const channel = fakeChannel();

      const msg = fakeMsg(validPayload({ occurredAt: undefined }));
      await (subscriber as any).handle(channel, msg);

      expect(dispatch).toHaveBeenCalledTimes(1);
      expect(channel.ack).toHaveBeenCalledWith(msg);
    });

    it('increments backlogSkippedCount across multiple stale events in the same run', async () => {
      const dispatch = jest.fn();
      const subscriber = new OfferCreatedSubscriber(fakeConfig(), { dispatch } as any, fakeUsers());
      const channel = fakeChannel();
      const staleIso = new Date(NOW.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

      await (subscriber as any).handle(channel, fakeMsg(validPayload({ offerId: 'offer-a', occurredAt: staleIso })));
      await (subscriber as any).handle(channel, fakeMsg(validPayload({ offerId: 'offer-b', occurredAt: staleIso })));

      expect(dispatch).not.toHaveBeenCalled();
      expect((subscriber as any).backlogSkippedCount).toBe(2);
    });
  });
});
