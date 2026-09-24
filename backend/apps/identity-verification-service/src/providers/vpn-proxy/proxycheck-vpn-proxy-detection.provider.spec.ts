import { ProxyCheckVpnProxyDetectionProvider } from './proxycheck-vpn-proxy-detection.provider';
import { ConnectionCheckUnavailableException } from '../../common/errors/domain-exceptions';
import { VpnProxyDetectionResult } from '../../entities/enums/identity-verification.enums';

// Mocks global fetch directly rather than jest.mock-ing a package, since
// this provider calls proxycheck.io via the runtime's built-in fetch (the
// same pattern DiditDocumentVerificationProvider already uses elsewhere in
// this service). Response shapes here mirror the real, live-verified
// proxycheck.io v3 structure — not invented — see the provider file's own
// header for how that was confirmed.
describe('ProxyCheckVpnProxyDetectionProvider', () => {
  const ip = '203.0.113.5';
  let provider: ProxyCheckVpnProxyDetectionProvider;
  let fetchMock: jest.Mock;

  const jsonResponse = (body: unknown, ok = true, status = 200) => ({
    ok,
    status,
    json: async () => body,
  });

  const detections = (vpn: boolean, proxy: boolean) => ({
    status: 'ok',
    [ip]: { detections: { vpn, proxy } },
  });

  beforeEach(() => {
    process.env.PROXYCHECK_API_KEY = 'test-key';
    provider = new ProxyCheckVpnProxyDetectionProvider();
    fetchMock = jest.fn();
    (global as unknown as { fetch: jest.Mock }).fetch = fetchMock;
  });

  afterEach(() => {
    jest.resetAllMocks();
    delete process.env.PROXYCHECK_API_KEY;
  });

  describe('the four clean detection states', () => {
    it('maps vpn: false, proxy: false to NONE', async () => {
      fetchMock.mockResolvedValue(jsonResponse(detections(false, false)));
      await expect(provider.detect({ ipAddress: ip })).resolves.toBe(
        VpnProxyDetectionResult.NONE,
      );
    });

    it('maps vpn: true, proxy: false to VPN_DETECTED', async () => {
      fetchMock.mockResolvedValue(jsonResponse(detections(true, false)));
      await expect(provider.detect({ ipAddress: ip })).resolves.toBe(
        VpnProxyDetectionResult.VPN_DETECTED,
      );
    });

    it('maps vpn: false, proxy: true to PROXY_DETECTED', async () => {
      fetchMock.mockResolvedValue(jsonResponse(detections(false, true)));
      await expect(provider.detect({ ipAddress: ip })).resolves.toBe(
        VpnProxyDetectionResult.PROXY_DETECTED,
      );
    });

    it('maps vpn: true, proxy: true to VPN_AND_PROXY_DETECTED', async () => {
      fetchMock.mockResolvedValue(jsonResponse(detections(true, true)));
      await expect(provider.detect({ ipAddress: ip })).resolves.toBe(
        VpnProxyDetectionResult.VPN_AND_PROXY_DETECTED,
      );
    });
  });

  describe('failures never become a clean result', () => {
    it('throws on a network-level failure (timeout/DNS/connection reset)', async () => {
      fetchMock.mockRejectedValue(new Error('network error'));
      await expect(provider.detect({ ipAddress: ip })).rejects.toBeInstanceOf(
        ConnectionCheckUnavailableException,
      );
    });

    it('throws on a non-2xx HTTP response', async () => {
      fetchMock.mockResolvedValue(jsonResponse({}, false, 500));
      await expect(provider.detect({ ipAddress: ip })).rejects.toBeInstanceOf(
        ConnectionCheckUnavailableException,
      );
    });

    it('throws when the body is not valid JSON', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('not json');
        },
      });
      await expect(provider.detect({ ipAddress: ip })).rejects.toBeInstanceOf(
        ConnectionCheckUnavailableException,
      );
    });

    it('throws on a non-"ok" provider status (denied/quota exhausted/blocked)', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({ status: 'denied', message: 'quota exhausted' }),
      );
      await expect(provider.detect({ ipAddress: ip })).rejects.toBeInstanceOf(
        ConnectionCheckUnavailableException,
      );
    });

    it('throws when detections.vpn/proxy are missing (malformed response)', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ status: 'ok', [ip]: {} }));
      await expect(provider.detect({ ipAddress: ip })).rejects.toBeInstanceOf(
        ConnectionCheckUnavailableException,
      );
    });

    it('throws when detections.vpn/proxy are the wrong type (e.g. strings)', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({ status: 'ok', [ip]: { detections: { vpn: 'yes', proxy: 'no' } } }),
      );
      await expect(provider.detect({ ipAddress: ip })).rejects.toBeInstanceOf(
        ConnectionCheckUnavailableException,
      );
    });

    it('throws when no client IP could be resolved, without calling the provider', async () => {
      await expect(provider.detect({ ipAddress: '' })).rejects.toBeInstanceOf(
        ConnectionCheckUnavailableException,
      );
      expect(fetchMock).not.toHaveBeenCalled();
    });

    // proxycheck.io itself was confirmed live to return status "ok" with
    // vpn:false, proxy:false for IPv6 loopback (::1) rather than erroring
    // — these unusable IPs must never reach the provider at all, so a
    // real response is never in play regardless of what it says.
    it.each([
      ['::1', 'IPv6 loopback'],
      ['0.0.0.0', 'unspecified'],
      ['127.0.0.1', 'IPv4 loopback'],
      ['10.0.0.5', 'RFC1918 (10.x)'],
      ['172.20.0.5', 'RFC1918 (172.16-31.x)'],
      ['192.168.1.1', 'RFC1918 (192.168.x)'],
      ['169.254.1.1', 'IPv4 link-local'],
      ['fe80::1', 'IPv6 link-local'],
      ['fd00::1', 'IPv6 unique-local'],
    ])('throws for %s (%s) without calling the provider', async (unusableIp) => {
      await expect(provider.detect({ ipAddress: unusableIp })).rejects.toBeInstanceOf(
        ConnectionCheckUnavailableException,
      );
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('still calls the provider for a normal public IP', async () => {
      fetchMock.mockResolvedValue(jsonResponse(detections(false, false)));
      await provider.detect({ ipAddress: ip });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('throws when PROXYCHECK_API_KEY is not configured, without calling the provider', async () => {
      delete process.env.PROXYCHECK_API_KEY;
      provider = new ProxyCheckVpnProxyDetectionProvider();
      await expect(provider.detect({ ipAddress: ip })).rejects.toBeInstanceOf(
        ConnectionCheckUnavailableException,
      );
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
