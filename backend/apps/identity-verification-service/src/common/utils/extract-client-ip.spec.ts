import { Request } from 'express';
import { extractClientIp } from './extract-client-ip';

function buildRequest(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    socket: {} as any,
    ...overrides,
  } as Request;
}

describe('extractClientIp (trusted CF-Connecting-IP only)', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  afterEach(() => {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  });

  describe.each(['production', 'staging', 'test', ''])('NODE_ENV=%p', (nodeEnv) => {
    beforeEach(() => {
      process.env.NODE_ENV = nodeEnv;
    });

    it('returns the validated CF-Connecting-IP', () => {
      expect(extractClientIp(buildRequest({ headers: { 'cf-connecting-ip': '203.0.113.5' } }))).toBe('203.0.113.5');
    });

    it('a fake clean x-forwarded-for cannot replace a VPN-classified trusted IP', () => {
      const req = buildRequest({
        headers: { 'x-forwarded-for': '8.8.8.8', 'cf-connecting-ip': '185.59.221.75' },
      });
      expect(extractClientIp(req)).toBe('185.59.221.75');
    });

    it('a fake VPN x-forwarded-for cannot replace a clean trusted IP', () => {
      const req = buildRequest({
        headers: { 'x-forwarded-for': '185.59.221.75', 'cf-connecting-ip': '8.8.8.8' },
      });
      expect(extractClientIp(req)).toBe('8.8.8.8');
    });

    it('ignores multiple supplied x-forwarded-for values and x-real-ip', () => {
      const req = buildRequest({
        headers: {
          'x-forwarded-for': ['1.1.1.1, 2.2.2.2', '3.3.3.3'] as any,
          'x-real-ip': '4.4.4.4',
          'cf-connecting-ip': '8.8.4.4',
        },
      });
      expect(extractClientIp(req)).toBe('8.8.4.4');
    });

    it('is null with only x-forwarded-for / x-real-ip / req.ip (never trusted)', () => {
      const req = buildRequest({
        headers: { 'x-forwarded-for': '8.8.8.8', 'x-real-ip': '8.8.8.8' },
        ip: '8.8.8.8',
      });
      expect(extractClientIp(req)).toBeNull();
    });

    it('never substitutes the socket peer (Render load balancer) for the client', () => {
      expect(extractClientIp(buildRequest({ socket: { remoteAddress: '10.20.30.40' } as any }))).toBeNull();
      expect(extractClientIp(buildRequest({ socket: { remoteAddress: '::1' } as any }))).toBeNull();
    });
  });

  describe('invalid or ambiguous CF-Connecting-IP fails safely (no fallback)', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it.each([
      '',
      'unknown',
      'not-an-ip',
      '999.1.1.1',
      '8.8.8',
      '8.8.8.8, 1.1.1.1',
      '8.8.8.8 1.1.1.1',
      '8.8.8.8:443',
      '[2606:4700::1111]',
      '[2606:4700::1111]:443',
      'fe80::1%eth0',
      '8.8.8.8/24',
      'http://8.8.8.8',
    ])('%p -> null even in development with a good socket', (value) => {
      const req = buildRequest({
        headers: { 'cf-connecting-ip': value },
        socket: { remoteAddress: '8.8.4.4' } as any,
      });
      expect(extractClientIp(req)).toBeNull();
    });

    it('a repeated header (array) -> null', () => {
      const req = buildRequest({
        headers: { 'cf-connecting-ip': ['8.8.8.8', '1.1.1.1'] as any },
        socket: { remoteAddress: '8.8.4.4' } as any,
      });
      expect(extractClientIp(req)).toBeNull();
    });
  });

  describe('normalization', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });
    const run = (v: string) => extractClientIp(buildRequest({ headers: { 'cf-connecting-ip': v } }));

    it('keeps IPv4', () => expect(run('203.0.113.5')).toBe('203.0.113.5'));
    it('trims whitespace', () => expect(run('  203.0.113.5 ')).toBe('203.0.113.5'));
    it('keeps and lowercases IPv6', () => {
      expect(run('2606:4700:4700::1111')).toBe('2606:4700:4700::1111');
      expect(run('2606:4700:4700::ABCD')).toBe('2606:4700:4700::abcd');
    });
    it('unwraps IPv4-mapped IPv6 (dotted)', () => {
      expect(run('::ffff:203.0.113.5')).toBe('203.0.113.5');
      expect(run('::FFFF:203.0.113.5')).toBe('203.0.113.5');
    });
    it('unwraps IPv4-mapped IPv6 (hex)', () => expect(run('::ffff:cb00:7105')).toBe('203.0.113.5'));
  });

  describe('local development socket fallback (header absent only)', () => {
    it.each([
      ['127.0.0.1', '127.0.0.1'],
      ['::1', '::1'],
      ['::ffff:127.0.0.1', '127.0.0.1'],
    ])('NODE_ENV=development uses the socket %s', (remoteAddress, expected) => {
      process.env.NODE_ENV = 'development';
      expect(extractClientIp(buildRequest({ socket: { remoteAddress } as any }))).toBe(expected);
    });

    it('is null in development when the socket is missing', () => {
      process.env.NODE_ENV = 'development';
      expect(extractClientIp(buildRequest())).toBeNull();
    });

    it.each(['Development', ' development', 'production', 'staging', 'test'])(
      'is NOT used when NODE_ENV=%p',
      (nodeEnv) => {
        process.env.NODE_ENV = nodeEnv;
        expect(extractClientIp(buildRequest({ socket: { remoteAddress: '127.0.0.1' } as any }))).toBeNull();
      },
    );
  });
});
