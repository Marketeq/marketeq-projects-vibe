import { GateStateConsumer, GATE_CHANGED_PATTERN } from './gate-state.consumer';
import { InMemoryGateState } from './testing/in-memory-gate-state.testing';

const A = '40000000-0000-4000-8000-000000000001';
const iso = (ms: number) => new Date(1_790_000_000_000 + ms).toISOString();

// identity-verification-service's `identity.gate_changed` (the G1 event format)
// keeps the local last-known state current. Manual ack: acknowledged only after
// the state is written.
describe('GateStateConsumer (identity.gate_changed)', () => {
  const ctx = () => {
    const channel = { ack: jest.fn(), nack: jest.fn() };
    const message = { content: 'x' };
    return { channel, message, context: { getChannelRef: () => channel, getMessage: () => message } as any };
  };

  it('listens for the same event name identity publishes', () => {
    expect(GATE_CHANGED_PATTERN).toBe('identity.gate_changed');
    expect(Reflect.getMetadata('microservices:pattern', GateStateConsumer.prototype.onGateChanged)).toBeDefined();
  });

  it('records the decision, then acknowledges', async () => {
    const state = new InMemoryGateState();
    const { channel, message, context } = ctx();
    await new GateStateConsumer(state.asService).onGateChanged({ userId: A, gateOpen: true, occurredAt: iso(0) }, context);
    expect(state.rows.get(A)?.gateOpen).toBe(true);
    expect(channel.ack).toHaveBeenCalledWith(message);
    expect(channel.nack).not.toHaveBeenCalled();
  });

  it('a close followed by an open follows the events (visibility returns automatically)', async () => {
    const state = new InMemoryGateState();
    const consumer = new GateStateConsumer(state.asService);
    await consumer.onGateChanged({ userId: A, gateOpen: false, occurredAt: iso(1000) }, ctx().context);
    expect((await state.knownOpen([A])).has(A)).toBe(false);
    await consumer.onGateChanged({ userId: A, gateOpen: true, occurredAt: iso(2000) }, ctx().context);
    expect((await state.knownOpen([A])).has(A)).toBe(true);
  });

  it('a redelivered or older event does not undo a newer decision', async () => {
    const state = new InMemoryGateState();
    const consumer = new GateStateConsumer(state.asService);
    await consumer.onGateChanged({ userId: A, gateOpen: true, occurredAt: iso(2000) }, ctx().context);
    const { channel, message, context } = ctx();
    await consumer.onGateChanged({ userId: A, gateOpen: false, occurredAt: iso(1000) }, context);
    expect(state.rows.get(A)?.gateOpen).toBe(true);
    expect(channel.ack).toHaveBeenCalledWith(message); // handled, not redelivered forever
  });

  it('a failed write is requeued (nack with requeue), not acknowledged', async () => {
    const state = new InMemoryGateState();
    jest.spyOn(state, 'apply').mockRejectedValue(new Error('db down'));
    const { channel, message, context } = ctx();
    await new GateStateConsumer(state.asService).onGateChanged({ userId: A, gateOpen: true, occurredAt: iso(0) }, context);
    expect(channel.nack).toHaveBeenCalledWith(message, false, true);
    expect(channel.ack).not.toHaveBeenCalled();
  });

  it.each([
    ['no payload', undefined],
    ['missing userId', { gateOpen: true, occurredAt: iso(0) }],
    ['non-boolean gateOpen', { userId: A, gateOpen: 'true', occurredAt: iso(0) }],
    ['bad timestamp', { userId: A, gateOpen: true, occurredAt: 'yesterday' }],
  ])('a malformed message (%s) is dropped and acknowledged, never recorded', async (_l, payload) => {
    const state = new InMemoryGateState();
    const { channel, message, context } = ctx();
    await new GateStateConsumer(state.asService).onGateChanged(payload as any, context);
    expect(state.rows.size).toBe(0);
    expect(channel.ack).toHaveBeenCalledWith(message);
  });
});
