import { deriveLoginSessionKey, readLoginSessionKey } from './login-session-key';

describe('loginSessionKey', () => {
  const SID_A = '7f3c1d9e-1b2a-4c3d-8e4f-5a6b7c8d9e0f';
  const SID_B = '0a1b2c3d-1b2a-4c3d-8e4f-5a6b7c8d9e0f';

  it('is a 64-character lowercase hex digest that contains neither the sid nor the user id', () => {
    const key = deriveLoginSessionKey('user-1', SID_A);
    expect(key).toMatch(/^[0-9a-f]{64}$/);
    expect(key).not.toContain(SID_A);
    expect(key).not.toContain('user-1');
  });

  it('is stable for the same login (a refresh keeps the sid)', () => {
    expect(deriveLoginSessionKey('user-1', SID_A)).toBe(deriveLoginSessionKey('user-1', SID_A));
    expect(readLoginSessionKey({ sub: 'user-1', sid: SID_A }, 'user-1')).toBe(deriveLoginSessionKey('user-1', SID_A));
  });

  it('differs for a different login and for a different account', () => {
    expect(deriveLoginSessionKey('user-1', SID_A)).not.toBe(deriveLoginSessionKey('user-1', SID_B));
    expect(deriveLoginSessionKey('user-1', SID_A)).not.toBe(deriveLoginSessionKey('user-2', SID_A));
  });

  it('does not depend on auth_time or any other claim', () => {
    const base = readLoginSessionKey({ sid: SID_A }, 'user-1');
    expect(readLoginSessionKey({ sid: SID_A, auth_time: 1_700_000_000, email: 'a@b.c', extra: 1 }, 'user-1')).toBe(base);
  });

  it.each([
    ['an older token without a sid', { sub: 'user-1', auth_time: 1_700_000_000 }],
    ['a non-string sid', { sid: 12345 }],
    ['an empty sid', { sid: '' }],
    ['a malformed sid', { sid: "x'; DROP TABLE y;--" }],
    ['an over-long sid', { sid: 'a'.repeat(129) }],
    ['no payload', undefined],
    ['a non-object payload', 'sid'],
    ['an array payload', [SID_A]],
  ])('%s: no key', (_label, user) => {
    expect(readLoginSessionKey(user, 'user-1')).toBeNull();
  });

  it.each([[undefined], [null], [''], [42]])('an unusable account id (%p): no key', (userId) => {
    expect(readLoginSessionKey({ sid: SID_A }, userId)).toBeNull();
  });
});
