import { Logger } from '@nestjs/common';
import { getDevClientIpOverride, getEffectiveClientIp, isUsablePublicIp } from './effective-client-ip';

const VAR = 'IDENTITY_VERIFICATION_DEV_CLIENT_IP';
const PUBLIC_IP = '8.8.4.4';

const req = (over: Record<string, unknown> = {}): any => ({
  headers: {},
  query: {},
  body: {},
  socket: { remoteAddress: '::1' },
  ...over,
});

describe('dev client-IP override', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  afterEach(() => {
    delete process.env[VAR];
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    jest.restoreAllMocks();
  });

  describe('only NODE_ENV=development honors it', () => {
    it('is honored in development', () => {
      process.env.NODE_ENV = 'development';
      process.env[VAR] = PUBLIC_IP;
      expect(getDevClientIpOverride()).toBe(PUBLIC_IP);
      expect(getEffectiveClientIp(req())).toBe(PUBLIC_IP);
    });

    it.each(['test', 'staging', 'production', 'Development', ' development', ''])(
      'is ignored completely when NODE_ENV=%p',
      (nodeEnv) => {
        process.env.NODE_ENV = nodeEnv;
        process.env[VAR] = PUBLIC_IP;
        expect(getDevClientIpOverride()).toBeNull();
        // Falls through to the normal extraction (loopback socket here).
        expect(getEffectiveClientIp(req())).toBe('::1');
      },
    );

    it('is ignored when NODE_ENV is unset', () => {
      delete process.env.NODE_ENV;
      process.env[VAR] = PUBLIC_IP;
      expect(getDevClientIpOverride()).toBeNull();
      expect(getEffectiveClientIp(req())).toBe('::1');
    });

    it('does nothing when the variable is unset or blank, even in development', () => {
      process.env.NODE_ENV = 'development';
      expect(getDevClientIpOverride()).toBeNull();
      process.env[VAR] = '   ';
      expect(getDevClientIpOverride()).toBeNull();
      expect(getEffectiveClientIp(req())).toBe('::1');
    });
  });

  describe('validation: only a usable public IP', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it.each([PUBLIC_IP, '1.1.1.1', '93.184.216.34', '2606:4700:4700::1111', '::ffff:8.8.8.8'])('accepts %s', (ip) => {
      process.env[VAR] = ip;
      expect(getDevClientIpOverride()).toBe(ip);
    });

    it.each([
      '127.0.0.1', '::1', '::', '0.0.0.0', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.1',
      '169.254.1.1', '100.64.0.1', '224.0.0.1', '255.255.255.255', '198.51.100.7', '203.0.113.9', '192.0.2.1',
      'fe80::1', 'fd00::1', 'fc00::1', 'ff02::1', '2001:db8::1', '::ffff:127.0.0.1', '::ffff:10.0.0.1',
      'not-an-ip', '999.1.1.1', '8.8.8', '8.8.8.8/24', '8.8.8.8, 1.1.1.1', 'localhost', 'https://8.8.8.8',
    ])('rejects %p and falls back to normal extraction', (ip) => {
      process.env[VAR] = ip;
      expect(getDevClientIpOverride()).toBeNull();
      expect(getEffectiveClientIp(req())).toBe('::1');
    });

    it('isUsablePublicIp boundaries', () => {
      expect(isUsablePublicIp('172.15.255.255')).toBe(true);
      expect(isUsablePublicIp('172.32.0.0')).toBe(true);
      expect(isUsablePublicIp('100.63.255.255')).toBe(true);
      expect(isUsablePublicIp('100.128.0.0')).toBe(true);
      expect(isUsablePublicIp('223.255.255.255')).toBe(true);
    });
  });

  describe('never taken from anything a client can send', () => {
    it.each([
      ['a header', { headers: { 'x-identity-verification-dev-client-ip': PUBLIC_IP, 'x-dev-client-ip': PUBLIC_IP } }],
      ['a query parameter', { query: { IDENTITY_VERIFICATION_DEV_CLIENT_IP: PUBLIC_IP, devClientIp: PUBLIC_IP } }],
      ['the body', { body: { IDENTITY_VERIFICATION_DEV_CLIENT_IP: PUBLIC_IP, clientIp: PUBLIC_IP } }],
    ])('ignores a value supplied in %s, even in development', (_n, over) => {
      process.env.NODE_ENV = 'development';
      delete process.env[VAR];
      expect(getEffectiveClientIp(req(over))).toBe('::1');
    });

    it('x-forwarded-for behaves exactly as before (normal extraction) when the server variable is absent', () => {
      process.env.NODE_ENV = 'development';
      expect(getEffectiveClientIp(req({ headers: { 'x-forwarded-for': '9.9.9.9' } }))).toBe('9.9.9.9');
    });

    it('the server variable wins over request-derived IPs only in development', () => {
      process.env[VAR] = PUBLIC_IP;
      process.env.NODE_ENV = 'development';
      expect(getEffectiveClientIp(req({ headers: { 'x-forwarded-for': '9.9.9.9' } }))).toBe(PUBLIC_IP);
      process.env.NODE_ENV = 'production';
      expect(getEffectiveClientIp(req({ headers: { 'x-forwarded-for': '9.9.9.9' } }))).toBe('9.9.9.9');
    });
  });

  describe('logging', () => {
    it('never logs the IP value, valid or invalid', () => {
      process.env.NODE_ENV = 'development';
      const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
      const log = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
      const debug = jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
      process.env[VAR] = PUBLIC_IP;
      getEffectiveClientIp(req());
      process.env[VAR] = '10.9.8.7';
      getEffectiveClientIp(req());
      const everything = JSON.stringify([warn.mock.calls, log.mock.calls, debug.mock.calls]);
      expect(everything).not.toContain(PUBLIC_IP);
      expect(everything).not.toContain('10.9.8.7');
    });
  });
});
