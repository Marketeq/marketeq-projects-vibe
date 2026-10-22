import { Observable, of, throwError } from 'rxjs';
import {
  IDENTITY_GATE_TIMEOUT_MS,
  IdentityVerificationGateClient,
  resolveBrokerUrl,
} from './identity-verification-gate.client';
import { IdentityVerificationUnavailableException } from './identity-gate.exceptions';

const OPEN = { gateOpen: true, missingRequirements: 'none' };

describe('payout-service IdentityVerificationGateClient (G9, same contract as G2/G4/G7/G8)', () => {
  const configWith = (vars: Record<string, string | undefined>) => ({ get: jest.fn((k: string) => vars[k]) }) as any;
  const build = (send: jest.Mock, vars: Record<string, string | undefined> = { RABBITMQ_URL: 'amqp://test-broker' }) =>
    new IdentityVerificationGateClient({ send } as any, configWith(vars));

  afterEach(() => jest.useRealTimers());

  it('sends only { userId } on the gate_check pattern with a message TTL equal to the timeout', async () => {
    const send = jest.fn().mockReturnValue(of(OPEN));
    await build(send).checkGate('talent-1');

    expect(send.mock.calls[0][0]).toBe('identity_verification.gate_check');
    const record = send.mock.calls[0][1];
    expect(record.data).toEqual({ userId: 'talent-1' });
    expect(record.options.expiration).toBe(IDENTITY_GATE_TIMEOUT_MS);
    expect(IDENTITY_GATE_TIMEOUT_MS).toBeLessThanOrEqual(5000);
  });

  it('returns only the two contract fields, dropping anything extra', async () => {
    const send = jest.fn().mockReturnValue(of({ ...OPEN, inGrace: true, identityVerificationStatus: 'expired' }));
    const decision = await build(send).checkGate('talent-1');
    expect(decision).toEqual(OPEN);
    expect(Object.keys(decision).sort()).toEqual(['gateOpen', 'missingRequirements']);
  });

  it.each([
    ['open + none', { gateOpen: true, missingRequirements: 'none' }, true],
    ['closed + identity', { gateOpen: false, missingRequirements: 'identity' }, true],
    ['closed + location', { gateOpen: false, missingRequirements: 'location' }, true],
    ['closed + both', { gateOpen: false, missingRequirements: 'both' }, true],
    ['open + identity (contradictory)', { gateOpen: true, missingRequirements: 'identity' }, false],
    ['closed + none (contradictory)', { gateOpen: false, missingRequirements: 'none' }, false],
    ['missing gateOpen', { missingRequirements: 'none' }, false],
    ['non-boolean gateOpen', { gateOpen: 'true', missingRequirements: 'none' }, false],
    ['unknown requirement', { gateOpen: false, missingRequirements: 'banana' }, false],
    ['null reply', null, false],
    ['string reply', 'open', false],
  ])('reply contract: %s', async (_l, wire, accepted) => {
    const outcome = build(jest.fn().mockReturnValue(of(wire))).checkGate('talent-1');
    if (accepted) await expect(outcome).resolves.toEqual(wire);
    else await expect(outcome).rejects.toBeInstanceOf(IdentityVerificationUnavailableException);
  });

  it('fails closed when the RPC errors', async () => {
    const send = jest.fn().mockReturnValue(throwError(() => new Error('no consumer')));
    await expect(build(send).checkGate('talent-1')).rejects.toBeInstanceOf(IdentityVerificationUnavailableException);
  });

  it('fails closed when no reply arrives within the bounded timeout', async () => {
    jest.useFakeTimers();
    const send = jest.fn().mockReturnValue(new Observable(() => undefined));
    const outcome = build(send).checkGate('talent-1').then(
      () => 'resolved',
      (e) => e,
    );
    await jest.advanceTimersByTimeAsync(IDENTITY_GATE_TIMEOUT_MS + 1);
    await expect(outcome).resolves.toBeInstanceOf(IdentityVerificationUnavailableException);
  });

  it('fails closed WITHOUT sending when no broker is configured, including blank values', async () => {
    for (const vars of [{}, { RABBITMQ_URI: '  ', RABBITMQ_URL: '' }]) {
      const send = jest.fn().mockReturnValue(of(OPEN));
      await expect(build(send, vars).checkGate('talent-1')).rejects.toBeInstanceOf(
        IdentityVerificationUnavailableException,
      );
      expect(send).not.toHaveBeenCalled();
    }
  });

  it('resolves RABBITMQ_URI first, then RABBITMQ_URL', () => {
    expect(resolveBrokerUrl(configWith({ RABBITMQ_URI: 'amqp://a', RABBITMQ_URL: 'amqp://b' }))).toBe('amqp://a');
    expect(resolveBrokerUrl(configWith({ RABBITMQ_URL: 'amqp://b' }))).toBe('amqp://b');
    expect(resolveBrokerUrl(configWith({}))).toBe('');
  });
});
