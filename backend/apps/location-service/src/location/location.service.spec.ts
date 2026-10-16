import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as geoip from 'geoip-lite';
import { LocationService } from './location.service';

jest.mock('geoip-lite', () => ({ lookup: jest.fn() }));

describe('LocationService.resolveIp — display fields and coordinate precision', () => {
  const lookup = geoip.lookup as unknown as jest.Mock;
  let service: LocationService;
  let n = 0;
  const freshIp = () => `198.51.100.${++n}`; // a new IP per test: results are cached by IP

  beforeEach(() => {
    lookup.mockReset();
    service = new LocationService(new ConfigService({}));
  });

  it('city-level data: city, region and city precision', () => {
    lookup.mockReturnValue({ country: 'US', region: 'IL', city: 'Chicago', ll: [41.88, -87.63], metro: 0, area: 0 });
    expect(service.resolveIp(freshIp())).toMatchObject({
      country: 'US', city: 'Chicago', region: 'IL', coordinates: [41.88, -87.63], coordinatePrecision: 'city',
    });
  });

  it('region-only data is region precision', () => {
    lookup.mockReturnValue({ country: 'US', region: 'IL', city: '', ll: [40, -89] });
    expect(service.resolveIp(freshIp())).toMatchObject({ city: null, region: 'IL', coordinatePrecision: 'region' });
  });

  it('country-only data keeps the coordinates but flags them as country precision, with no city or region', () => {
    lookup.mockReturnValue({ country: 'US', region: '', city: '', ll: [37.751, -97.822] });
    expect(service.resolveIp(freshIp())).toMatchObject({
      country: 'US', city: null, region: null, coordinates: [37.751, -97.822], coordinatePrecision: 'country',
    });
  });

  it('no coordinates means no precision', () => {
    lookup.mockReturnValue({ country: 'CA', region: '', city: '' });
    expect(service.resolveIp(freshIp())).toMatchObject({ coordinates: null, coordinatePrecision: null });
  });

  it('an unknown or loopback IP returns the empty result with no display fields', () => {
    lookup.mockReturnValue(null);
    expect(service.resolveIp(freshIp())).toMatchObject({ country: null, city: null, region: null, coordinatePrecision: null });
    expect(service.resolveIp('127.0.0.1')).toMatchObject({ country: null, city: null, region: null });
  });
});

describe('LocationService.resolveCoordinates — LocationIQ reverse geocoding', () => {
  const KEY = 'test-locationiq-key';
  let fetchMock: jest.Mock;
  let logged: string[];
  let n = 0;
  const coords = () => [10 + ++n / 100, 20 + n / 100] as const; // distinct per test (cached by coords)
  const ok = (address: Record<string, unknown>) => ({ ok: true, status: 200, json: async () => ({ address }) });

  beforeEach(() => {
    fetchMock = jest.fn();
    (global as unknown as { fetch: jest.Mock }).fetch = fetchMock;
    logged = [];
    for (const level of ['log', 'warn', 'error', 'debug', 'verbose'] as const) {
      jest.spyOn(Logger.prototype, level).mockImplementation((m: any) => void logged.push(String(m)));
    }
  });
  afterEach(() => jest.restoreAllMocks());

  const svc = (key = KEY) => new LocationService(new ConfigService({ LOCATIONIQ_API_KEY: key }));

  it('maps city, state, country, country code and region code from the provider response only', async () => {
    fetchMock.mockResolvedValue(
      ok({ city: 'Chicago', state: 'Illinois', country: 'United States', country_code: 'us', 'ISO3166-2-lvl4': 'US-IL' }),
    );
    const [lat, lon] = coords();
    await expect(svc().resolveCoordinates(lat, lon)).resolves.toEqual({
      location: 'Chicago, Illinois, United States',
      city: 'Chicago', state: 'Illinois', country: 'United States', countryCode: 'US', regionCode: 'IL',
    });
  });

  it('leaves absent or malformed optional fields null instead of guessing', async () => {
    fetchMock.mockResolvedValue(ok({ town: 'Springfield', country: 'United States', country_code: 'usa', 'ISO3166-2-lvl4': 'nonsense' }));
    const [lat, lon] = coords();
    await expect(svc().resolveCoordinates(lat, lon)).resolves.toMatchObject({
      city: 'Springfield', state: null, countryCode: null, regionCode: null,
    });
  });

  it('returns null without calling LocationIQ when no API key is configured', async () => {
    const [lat, lon] = coords();
    await expect(svc('').resolveCoordinates(lat, lon)).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns null on a non-OK response or a network failure', async () => {
    const [lat, lon] = coords();
    fetchMock.mockResolvedValueOnce({ ok: false, status: 429, json: async () => ({}) });
    await expect(svc().resolveCoordinates(lat, lon)).resolves.toBeNull();
    const [lat2, lon2] = coords();
    fetchMock.mockRejectedValueOnce(new Error(`fetch failed key=${KEY}`));
    await expect(svc().resolveCoordinates(lat2, lon2)).resolves.toBeNull();
  });

  it('never logs the coordinates or the API key', async () => {
    const [lat, lon] = coords();
    fetchMock.mockRejectedValueOnce(new Error(`fetch failed ${lat},${lon} key=${KEY}`));
    await svc().resolveCoordinates(lat, lon);
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });
    const [lat2, lon2] = coords();
    await svc().resolveCoordinates(lat2, lon2);
    const all = logged.join('\n');
    for (const secret of [String(lat), String(lon), String(lat2), String(lon2), KEY]) {
      expect(all).not.toContain(secret);
    }
  });
});
