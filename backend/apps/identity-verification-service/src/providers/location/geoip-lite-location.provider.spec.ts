jest.mock('geoip-lite', () => ({ lookup: jest.fn() }));

import * as geoip from 'geoip-lite';
import { GeoIpLiteLocationProvider } from './geoip-lite-location.provider';

describe('GeoIpLiteLocationProvider', () => {
  let provider: GeoIpLiteLocationProvider;

  beforeEach(() => {
    provider = new GeoIpLiteLocationProvider();
    jest.resetAllMocks();
  });

  it('maps a full geoip-lite match to country/region/city', async () => {
    (geoip.lookup as jest.Mock).mockReturnValue({
      country: 'US',
      region: 'NY',
      city: 'New York',
    });

    const result = await provider.resolve({ ipAddress: '203.0.113.5' });

    expect(result).toEqual({
      countryCode: 'US',
      regionState: 'NY',
      city: 'New York',
    });
  });

  it('maps missing region/city to null rather than empty string', async () => {
    (geoip.lookup as jest.Mock).mockReturnValue({ country: 'US', region: '', city: '' });

    const result = await provider.resolve({ ipAddress: '203.0.113.5' });

    expect(result).toEqual({ countryCode: 'US', regionState: null, city: null });
  });

  it('returns null when geoip-lite has no match for the IP', async () => {
    (geoip.lookup as jest.Mock).mockReturnValue(null);

    const result = await provider.resolve({ ipAddress: '10.0.0.1' });

    expect(result).toBeNull();
  });

  it('returns null when the match has no country', async () => {
    (geoip.lookup as jest.Mock).mockReturnValue({ country: '', region: 'NY', city: 'New York' });

    const result = await provider.resolve({ ipAddress: '203.0.113.5' });

    expect(result).toBeNull();
  });
});
