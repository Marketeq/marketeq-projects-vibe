import { Observable, of, throwError } from 'rxjs';
import {
  IDENTITY_GATE_TIMEOUT_MS,
  IdentityVerificationGateClient,
  MAX_GATE_CHECK_BATCH,
} from './identity-verification-gate.client';
import { IdentityVerificationUnavailableException } from './identity-gate.exceptions';

const A = 'a0000000-0000-4000-8000-000000000001';
const B = 'b0000000-0000-4000-8000-000000000002';
const C = 'c0000000-0000-4000-8000-000000000003';

const open = (userId: string) => ({ userId, gateOpen: true, missingRequirements: 'none' });
const closed = (userId: string, m = 'identity') => ({ userId, gateOpen: false, missingRequirements: m });

describe('IdentityVerificationGateClient.checkGateBatch (G5)', () => {
  const configWith = (vars: Record<string, string | undefined>) => ({ get: jest.fn((k: string) => vars[k]) }) as any;
  const build = (send: jest.Mock, vars: Record<string, string | undefined> = { RABBITMQ_URL: 'amqp://test-broker' }) =>
    new IdentityVerificationGateClient({ send } as any, configWith(vars));

  afterEach(() => jest.useRealTimers());

  it('sends one request with { userIds } on the batch pattern, TTL equal to the timeout', async () => {
    const send = jest.fn().mockReturnValue(of({ decisions: [open(A), closed(B)] }));
    const out = await build(send).checkGateBatch([A, B]);

    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toBe('identity_verification.gate_check_batch');
    expect(send.mock.calls[0][1].data).toEqual({ userIds: [A, B] });
    expect(send.mock.calls[0][1].options.expiration).toBe(IDENTITY_GATE_TIMEOUT_MS);
    expect(out.get(A)).toEqual({ gateOpen: true, missingRequirements: 'none' });
    expect(out.get(B)).toEqual({ gateOpen: false, missingRequirements: 'identity' });
  });

  it('de-duplicates ids and drops blanks before asking', async () => {
    const send = jest.fn().mockReturnValue(of({ decisions: [open(A)] }));
    await build(send).checkGateBatch([A, A, '', '  ', A]);
    expect(send.mock.calls[0][1].data).toEqual({ userIds: [A] });
  });

  it('makes no request at all for an empty roster', async () => {
    const send = jest.fn();
    await expect(build(send).checkGateBatch([])).resolves.toEqual(new Map());
    await expect(build(send).checkGateBatch(['', '  '])).resolves.toEqual(new Map());
    expect(send).not.toHaveBeenCalled();
  });

  it('chunks above the identity service limit: one request per 100 accounts, never one per member', async () => {
    const ids = Array.from({ length: 250 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`);
    const send = jest.fn((_p: string, record: any) =>
      of({ decisions: (record.data.userIds as string[]).map((id) => open(id)) }),
    );
    const out = await build(send as any).checkGateBatch(ids);

    expect(send).toHaveBeenCalledTimes(3);
    expect(send.mock.calls.map((c) => c[1].data.userIds.length)).toEqual([MAX_GATE_CHECK_BATCH, MAX_GATE_CHECK_BATCH, 50]);
    expect(out.size).toBe(250);
  });

  it('a member the reply does not mention is absent from the result, never open', async () => {
    const send = jest.fn().mockReturnValue(of({ decisions: [open(A)] }));
    const out = await build(send).checkGateBatch([A, B]);
    expect(out.has(A)).toBe(true);
    expect(out.has(B)).toBe(false);
  });

  it('keeps only the contract fields per entry', async () => {
    const send = jest.fn().mockReturnValue(of({ decisions: [{ ...open(A), inGrace: true, identityVerificationStatus: 'expired' }] }));
    const out = await build(send).checkGateBatch([A]);
    expect(Object.keys(out.get(A)!).sort()).toEqual(['gateOpen', 'missingRequirements']);
  });

  describe('fails closed (throws unavailable) - the whole batch, never a partial answer', () => {
    it.each([
      ['null reply', null],
      ['string reply', 'open'],
      ['array reply', []],
      ['empty object', {}],
      ['decisions not an array', { decisions: 'x' }],
      ['decisions object', { decisions: { [A]: open(A) } }],
      ['entry not an object', { decisions: [open(A), 'x'] }],
      ['entry null', { decisions: [null] }],
      ['entry without userId', { decisions: [{ gateOpen: true, missingRequirements: 'none' }] }],
      ['entry for an account nobody asked about', { decisions: [open(A), open(C)] }],
      ['duplicate account', { decisions: [open(A), open(A)] }],
      ['non-boolean gateOpen', { decisions: [{ userId: A, gateOpen: 'true', missingRequirements: 'none' }] }],
      ['numeric gateOpen', { decisions: [{ userId: A, gateOpen: 1, missingRequirements: 'none' }] }],
      ['missing requirements absent', { decisions: [{ userId: A, gateOpen: true }] }],
      ['unknown requirement', { decisions: [closed(A, 'banana')] }],
      ['open but something missing', { decisions: [{ userId: A, gateOpen: true, missingRequirements: 'identity' }] }],
      ['closed but nothing missing', { decisions: [{ userId: A, gateOpen: false, missingRequirements: 'none' }] }],
      ['one good entry, one bad entry', { decisions: [open(A), { userId: B, gateOpen: 'yes', missingRequirements: 'none' }] }],
    ])('%s', async (_label, wire) => {
      const send = jest.fn().mockReturnValue(of(wire));
      await expect(build(send).checkGateBatch([A, B])).rejects.toBeInstanceOf(IdentityVerificationUnavailableException);
    });

    it('RPC error', async () => {
      const send = jest.fn().mockReturnValue(throwError(() => new Error('no consumer')));
      await expect(build(send).checkGateBatch([A])).rejects.toBeInstanceOf(IdentityVerificationUnavailableException);
    });

    it('no reply within the bounded timeout', async () => {
      jest.useFakeTimers();
      const send = jest.fn().mockReturnValue(new Observable(() => undefined));
      const outcome = build(send).checkGateBatch([A]).then(
        () => 'resolved',
        (e) => e,
      );
      await jest.advanceTimersByTimeAsync(IDENTITY_GATE_TIMEOUT_MS + 1);
      await expect(outcome).resolves.toBeInstanceOf(IdentityVerificationUnavailableException);
    });

    it('no broker configured, including blank values - and nothing is sent', async () => {
      for (const vars of [{}, { RABBITMQ_URI: '  ', RABBITMQ_URL: '' }]) {
        const send = jest.fn().mockReturnValue(of({ decisions: [open(A)] }));
        await expect(build(send, vars).checkGateBatch([A])).rejects.toBeInstanceOf(
          IdentityVerificationUnavailableException,
        );
        expect(send).not.toHaveBeenCalled();
      }
    });

    it('one chunk of several failing fails the whole call', async () => {
      const ids = Array.from({ length: 150 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`);
      let n = 0;
      const send = jest.fn((_p: string, record: any) =>
        n++ === 0
          ? of({ decisions: (record.data.userIds as string[]).map((id) => open(id)) })
          : throwError(() => new Error('boom')),
      );
      await expect(build(send as any).checkGateBatch(ids)).rejects.toBeInstanceOf(IdentityVerificationUnavailableException);
    });
  });
});
