import { LocationServiceHttpProvider } from './location-service-http.provider';
import { LocationLookupUnavailableException } from '../../common/errors/domain-exceptions';

// Mocks global fetch directly — same pattern as
// proxycheck-vpn-proxy-detection.provider.spec.ts. Response shapes mirror
// location-service's own documented resolve-ip contract (LS-00 §Endpoints /
// location.service.ts's IpResolution interface), not invented.
describe('LocationServiceHttpProvider', () => {
  const ip = '203.0.113.5';
  let provider: LocationServiceHttpProvider;
  let fetchMock: jest.Mock;

  const jsonResponse = (body: unknown, ok = true, status = 200) => ({
    ok,
    status,
    json: async () => body,
  });

  beforeEach(() => {
    provider = new LocationServiceHttpProvider();
    fetchMock = jest.fn();
    (global as unknown as { fetch: jest.Mock }).fetch = fetchMock;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('returns null without calling the provider when the IP is empty', async () => {
    await expect(provider.resolve({ ipAddress: '' })).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('maps a resolved country to DetectedLocation with region/city null', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        ip,
        country: 'US',
        currency: 'USD',
        timezone: 'America/Chicago',
        coordinates: [41.8781, -87.6298],
      }),
    );
    await expect(provider.resolve({ ipAddress: ip })).resolves.toEqual({
      countryCode: 'US',
      regionState: null,
      city: null,
    });
  });

  it('returns null (genuine no-result) when country is null, not a thrown error', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        ip,
        country: null,
        currency: null,
        timezone: null,
        coordinates: null,
      }),
    );
    await expect(provider.resolve({ ipAddress: ip })).resolves.toBeNull();
  });

  it('requests the explicit ip= override, not the caller-extraction fallback', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ip, country: 'CA' }));
    await provider.resolve({ ipAddress: ip });
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain(`ip=${encodeURIComponent(ip)}`);
    expect(calledUrl).toContain('/location/resolve-ip');
  });

  it('throws LocationLookupUnavailableException on a network-level failure', async () => {
    fetchMock.mockRejectedValue(new Error('network error'));
    await expect(provider.resolve({ ipAddress: ip })).rejects.toBeInstanceOf(
      LocationLookupUnavailableException,
    );
  });

  it('throws on a non-2xx HTTP response', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, false, 500));
    await expect(provider.resolve({ ipAddress: ip })).rejects.toBeInstanceOf(
      LocationLookupUnavailableException,
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
    await expect(provider.resolve({ ipAddress: ip })).rejects.toBeInstanceOf(
      LocationLookupUnavailableException,
    );
  });

  // Content validation, distinct from the JSON-parse cases above: a
  // structurally wrong body that still parses as JSON (wrong type, a
  // proxied error page that happens to be `{}`, a field a future
  // location-service change renames) must not be silently trusted, since
  // detectedCountry feeds directly into confirmHomeCountry eligibility.
  it('throws when the parsed body is not an object', async () => {
    fetchMock.mockResolvedValue(jsonResponse(['unexpected', 'array']));
    await expect(provider.resolve({ ipAddress: ip })).rejects.toBeInstanceOf(
      LocationLookupUnavailableException,
    );
  });

  it('throws when country is not a well-formed 2-letter code', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ip, country: 'USA', coordinates: null }));
    await expect(provider.resolve({ ipAddress: ip })).rejects.toBeInstanceOf(
      LocationLookupUnavailableException,
    );
  });

  it('throws when country is the wrong type', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ip, country: 12345, coordinates: null }));
    await expect(provider.resolve({ ipAddress: ip })).rejects.toBeInstanceOf(
      LocationLookupUnavailableException,
    );
  });

  it('throws when coordinates is malformed (wrong length)', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ip, country: 'US', coordinates: [41.87] }));
    await expect(provider.resolve({ ipAddress: ip })).rejects.toBeInstanceOf(
      LocationLookupUnavailableException,
    );
  });

  it('throws when coordinates contains non-finite values', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ ip, country: 'US', coordinates: [Number.NaN, -87.6298] }),
    );
    await expect(provider.resolve({ ipAddress: ip })).rejects.toBeInstanceOf(
      LocationLookupUnavailableException,
    );
  });

  it('throws when coordinates are out of valid lat/lon range', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ip, country: 'US', coordinates: [200, -87.6298] }));
    await expect(provider.resolve({ ipAddress: ip })).rejects.toBeInstanceOf(
      LocationLookupUnavailableException,
    );
  });

  it('accepts a response missing the coordinates key entirely', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ip, country: 'CA' }));
    await expect(provider.resolve({ ipAddress: ip })).resolves.toEqual({
      countryCode: 'CA',
      regionState: null,
      city: null,
    });
  });
});
