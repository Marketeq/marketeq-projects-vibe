import { Logger } from '@nestjs/common';
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

  describe('resolveDisplay (display-only view of the same lookup)', () => {
    const cityBody = {
      ip, country: 'US', currency: 'USD', timezone: 'America/Chicago',
      coordinates: [41.8781, -87.6298], city: 'Chicago', region: 'IL', coordinatePrecision: 'city',
    };
    // What the IP database returns when it only knows the country: coordinates
    // are a country-level fallback, not the caller's location.
    const countryOnlyBody = {
      ip, country: 'US', currency: 'USD', timezone: 'America/Chicago',
      coordinates: [37.751, -97.822], city: null, region: null, coordinatePrecision: 'country',
    };
    const state = { location: 'Chicago, Illinois, United States', city: 'Chicago', state: 'Illinois', country: 'United States' };

    it('maps complete city, region, country and coordinates', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(cityBody)).mockResolvedValueOnce(jsonResponse(state));
      const result = await provider.resolveDisplay({ ipAddress: ip });
      expect(result).toEqual({
        countryCode: 'US', regionState: 'Illinois', city: 'Chicago', regionCode: 'IL',
        latitude: 41.8781, longitude: -87.6298,
      });
      expect(fetchMock.mock.calls[1][0]).toContain('/location/resolve-coordinates');
    });

    it('region-level precision keeps the region code and coordinates, with no city', async () => {
      fetchMock
        .mockResolvedValueOnce(jsonResponse({ ...cityBody, city: null, coordinatePrecision: 'region' }))
        .mockResolvedValueOnce(jsonResponse({ ...state, city: null }));
      await expect(provider.resolveDisplay({ ipAddress: ip })).resolves.toMatchObject({
        city: null, regionCode: 'IL', regionState: 'Illinois', latitude: 41.8781, longitude: -87.6298,
      });
    });

    it('optional fields that are genuinely absent stay null; country-level coordinates are NOT shown and never reverse-geocoded', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(countryOnlyBody));
      const result = await provider.resolveDisplay({ ipAddress: ip });
      expect(result).toEqual({
        countryCode: 'US', regionState: null, city: null, regionCode: null, latitude: null, longitude: null,
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('an older location-service with no precision field is treated as country-level (no pin, no geocode)', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ ip, country: 'US', coordinates: [37.751, -97.822] }));
      await expect(provider.resolveDisplay({ ipAddress: ip })).resolves.toMatchObject({ latitude: null, longitude: null });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('never fabricates coordinates when none are supplied', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ ip, country: 'CA', coordinates: null }));
      await expect(provider.resolveDisplay({ ipAddress: ip })).resolves.toMatchObject({ latitude: null, longitude: null });
    });

    it('keeps city, region code and coordinates when the reverse geocoder fails', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(cityBody)).mockRejectedValueOnce(new Error('boom'));
      await expect(provider.resolveDisplay({ ipAddress: ip })).resolves.toEqual({
        countryCode: 'US', regionState: null, city: 'Chicago', regionCode: 'IL', latitude: 41.8781, longitude: -87.6298,
      });
    });

    it('rejects a malformed precision or non-string city as an unexpected response shape', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ ...cityBody, coordinatePrecision: 'street' }));
      await expect(provider.resolveDisplay({ ipAddress: ip })).rejects.toBeInstanceOf(LocationLookupUnavailableException);
      fetchMock.mockResolvedValueOnce(jsonResponse({ ...cityBody, city: 5 }));
      await expect(provider.resolveDisplay({ ipAddress: ip })).rejects.toBeInstanceOf(LocationLookupUnavailableException);
    });

    it('never includes the IP address in the result', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(cityBody)).mockResolvedValueOnce(jsonResponse(state));
      expect(JSON.stringify(await provider.resolveDisplay({ ipAddress: ip }))).not.toContain(ip);
    });

    it('returns null when no country is found, and propagates a location-service outage', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ ip, country: null, coordinates: null }));
      await expect(provider.resolveDisplay({ ipAddress: ip })).resolves.toBeNull();
      fetchMock.mockRejectedValueOnce(new Error('network error'));
      await expect(provider.resolveDisplay({ ipAddress: ip })).rejects.toBeInstanceOf(LocationLookupUnavailableException);
    });

    it('resolve() (used by home-country confirmation) stays country-only and never reverse-geocodes', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(cityBody));
      await expect(provider.resolve({ ipAddress: ip })).resolves.toEqual({ countryCode: 'US', regionState: null, city: null });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('resolveCoordinates (browser GPS reverse geocode, display only)', () => {
    const place = {
      location: 'Chicago, Illinois, United States', city: 'Chicago', state: 'Illinois',
      country: 'United States', countryCode: 'US', regionCode: 'IL',
    };

    it('maps the location-service response', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(place));
      await expect(provider.resolveCoordinates({ latitude: 41.88, longitude: -87.63 })).resolves.toEqual({
        countryCode: 'US', countryName: 'United States', city: 'Chicago', regionName: 'Illinois', regionCode: 'IL',
      });
      expect(fetchMock.mock.calls[0][0]).toContain('/location/resolve-coordinates');
    });

    it('treats absent fields as null and an invalid country code as absent', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ city: 'X', countryCode: 'usa' }));
      await expect(provider.resolveCoordinates({ latitude: 1, longitude: 2 })).resolves.toEqual({
        countryCode: null, countryName: null, city: 'X', regionName: null, regionCode: null,
      });
    });

    it('is a soft failure (null) on a non-OK response, null body or network error, and logs no coordinates', async () => {
      const logged: string[] = [];
      jest.spyOn(Logger.prototype, 'warn').mockImplementation((m: any) => void logged.push(String(m)));
      fetchMock.mockResolvedValueOnce(jsonResponse({}, false, 503));
      await expect(provider.resolveCoordinates({ latitude: 12.34, longitude: 56.78 })).resolves.toBeNull();
      fetchMock.mockResolvedValueOnce(jsonResponse(null));
      await expect(provider.resolveCoordinates({ latitude: 12.34, longitude: 56.78 })).resolves.toBeNull();
      fetchMock.mockRejectedValueOnce(new Error('network 12.34,56.78'));
      await expect(provider.resolveCoordinates({ latitude: 12.34, longitude: 56.78 })).resolves.toBeNull();
      expect(logged.join('\n')).not.toMatch(/12\.34|56\.78/);
    });
  });
});
