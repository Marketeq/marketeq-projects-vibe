import { ExecutionContext } from '@nestjs/common';
import { VpnProxyCheckGuard } from './vpn-proxy-check.guard';
import { ProxyCheckVpnProxyDetectionProvider } from '../../providers/vpn-proxy/proxycheck-vpn-proxy-detection.provider';
import { ConnectionCheckUnavailableException } from '../errors/domain-exceptions';

// End to end through the guard with the real provider: the request IP comes
// from the socket exactly as it does for a browser on the same machine going
// through the local gateway.
describe('VpnProxyCheckGuard — loopback callers by NODE_ENV', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalFetch = (global as unknown as { fetch: unknown }).fetch;
  let fetchMock: jest.Mock;

  const contextFor = (remoteAddress: string, headers: Record<string, string> = {}) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ headers, socket: { remoteAddress } }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    process.env.PROXYCHECK_API_KEY = 'test-key';
    fetchMock = jest.fn();
    (global as unknown as { fetch: jest.Mock }).fetch = fetchMock;
  });

  afterEach(() => {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    delete process.env.PROXYCHECK_API_KEY;
    (global as unknown as { fetch: unknown }).fetch = originalFetch;
  });

  it.each(['127.0.0.1', '::1', '::ffff:127.0.0.1'])(
    'lets a loopback caller (%s) through in development',
    async (remoteAddress) => {
      process.env.NODE_ENV = 'development';
      const guard = new VpnProxyCheckGuard(new ProxyCheckVpnProxyDetectionProvider());

      await expect(guard.canActivate(contextFor(remoteAddress))).resolves.toBe(true);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  describe.each(['production', 'staging', 'test'])('when NODE_ENV=%s', (nodeEnv) => {
    it.each(['127.0.0.1', '::1', '::ffff:127.0.0.1'])(
      'still rejects a loopback caller (%s) with CONNECTION_CHECK_UNAVAILABLE',
      async (remoteAddress) => {
        process.env.NODE_ENV = nodeEnv;
        const guard = new VpnProxyCheckGuard(new ProxyCheckVpnProxyDetectionProvider());

        await expect(guard.canActivate(contextFor(remoteAddress))).rejects.toBeInstanceOf(
          ConnectionCheckUnavailableException,
        );
        expect(fetchMock).not.toHaveBeenCalled();
      },
    );
  });

  it('uses the trusted CF-Connecting-IP, not the loopback socket, in development', async () => {
    process.env.NODE_ENV = 'development';
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: 'ok', '203.0.113.5': { detections: { vpn: true, proxy: false } } }),
    });
    const guard = new VpnProxyCheckGuard(new ProxyCheckVpnProxyDetectionProvider());

    await expect(
      guard.canActivate(contextFor('127.0.0.1', { 'cf-connecting-ip': '203.0.113.5' })),
    ).rejects.toMatchObject({ code: 'VPN_PROXY_DETECTED' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('a clean X-Forwarded-For cannot let a loopback socket in development hide a trusted VPN IP', async () => {
    process.env.NODE_ENV = 'development';
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: 'ok', '203.0.113.5': { detections: { vpn: true, proxy: false } } }),
    });
    const guard = new VpnProxyCheckGuard(new ProxyCheckVpnProxyDetectionProvider());

    await expect(
      guard.canActivate(
        contextFor('127.0.0.1', { 'x-forwarded-for': '8.8.8.8', 'cf-connecting-ip': '203.0.113.5' }),
      ),
    ).rejects.toMatchObject({ code: 'VPN_PROXY_DETECTED' });
  });
});
