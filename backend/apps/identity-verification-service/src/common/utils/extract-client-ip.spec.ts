import { Request } from 'express';
import { extractClientIp } from './extract-client-ip';

function buildRequest(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    socket: {} as any,
    ...overrides,
  } as Request;
}

describe('extractClientIp', () => {
  it('returns the first IP from a single-value x-forwarded-for header', () => {
    const req = buildRequest({ headers: { 'x-forwarded-for': '203.0.113.5' } });
    expect(extractClientIp(req)).toBe('203.0.113.5');
  });

  it('returns the first IP from a comma-separated x-forwarded-for chain', () => {
    const req = buildRequest({
      headers: { 'x-forwarded-for': '203.0.113.5, 70.41.3.18, 150.172.238.178' },
    });
    expect(extractClientIp(req)).toBe('203.0.113.5');
  });

  it('skips invalid entries in the forwarded chain and uses the next valid one', () => {
    const req = buildRequest({ headers: { 'x-forwarded-for': 'unknown, 203.0.113.5' } });
    expect(extractClientIp(req)).toBe('203.0.113.5');
  });

  it('falls back to x-real-ip when x-forwarded-for is absent', () => {
    const req = buildRequest({ headers: { 'x-real-ip': '198.51.100.7' } });
    expect(extractClientIp(req)).toBe('198.51.100.7');
  });

  it('falls back to the socket remote address', () => {
    const req = buildRequest({ socket: { remoteAddress: '192.0.2.10' } as any });
    expect(extractClientIp(req)).toBe('192.0.2.10');
  });

  it('falls back to req.ip when nothing else is available', () => {
    const req = buildRequest({ ip: '192.0.2.20' });
    expect(extractClientIp(req)).toBe('192.0.2.20');
  });

  it('strips the IPv4-mapped IPv6 prefix', () => {
    const req = buildRequest({ headers: { 'x-forwarded-for': '::ffff:203.0.113.5' } });
    expect(extractClientIp(req)).toBe('203.0.113.5');
  });

  it('strips a trailing port from an IPv4 address', () => {
    const req = buildRequest({ headers: { 'x-forwarded-for': '203.0.113.5:54321' } });
    expect(extractClientIp(req)).toBe('203.0.113.5');
  });

  it('returns null when every candidate is invalid', () => {
    const req = buildRequest({ headers: { 'x-forwarded-for': 'unknown' } });
    expect(extractClientIp(req)).toBeNull();
  });

  it('returns null when there is no usable signal anywhere', () => {
    const req = buildRequest();
    expect(extractClientIp(req)).toBeNull();
  });
});
