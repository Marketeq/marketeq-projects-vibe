import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as geoip from 'geoip-lite';
import { find as geoTz } from 'geo-tz';

// ── Country → Currency map (lifted from earnings-service/geo.service.ts) ──

const COUNTRY_CURRENCY: Record<string, string> = {
  US:'USD', GB:'GBP', IN:'INR', AU:'AUD', CA:'CAD',
  JP:'JPY', CN:'CNY', SG:'SGD', AE:'AED', PK:'PKR', NG:'NGN',
  PH:'PHP', BD:'BDT', ID:'IDR', VN:'VND', MX:'MXN', BR:'BRL',
  DE:'EUR', FR:'EUR', ES:'EUR', IT:'EUR', NL:'EUR', BE:'EUR',
  PL:'PLN', UA:'UAH', RO:'RON', HU:'HUF', CZ:'CZK', SE:'SEK',
  NO:'NOK', DK:'DKK', CH:'CHF', NZ:'NZD', ZA:'ZAR', KE:'KES',
  GH:'GHS', EG:'EGP', MA:'MAD', TZ:'TZS', ET:'ETB', UG:'UGX',
  KR:'KRW', TW:'TWD', HK:'HKD', TH:'THB', MY:'MYR', TR:'TRY',
  IL:'ILS', SA:'SAR', QA:'QAR', KW:'KWD', BH:'BHD', OM:'OMR',
  AR:'ARS', CL:'CLP', CO:'COP', PE:'PEN', VE:'VES',
  RU:'RUB', KZ:'KZT', UZ:'UZS', AZ:'AZN', GE:'GEL',
};

// ── Simple in-memory cache ──

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class SimpleCache<T> {
  private store = new Map<string, CacheEntry<T>>();
  constructor(private readonly ttlMs: number) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T): void {
    // Cap at 10k entries to prevent unbounded growth
    if (this.store.size > 10_000) {
      const oldest = this.store.keys().next().value;
      if (oldest) this.store.delete(oldest);
    }
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }
}

// ── Response types ──

export interface IpResolution {
  ip: string;
  country: string | null;
  currency: string | null;
  timezone: string | null;
  coordinates: [number, number] | null;
  // Additive, display-only. geoip-lite supplies city/region only for some IPs;
  // when it has neither it falls back to a COUNTRY centroid for `coordinates`,
  // which is not a location of the caller. coordinatePrecision says which:
  // 'city' | 'region' when the database had that level, 'country' when the
  // coordinates are only the country-level fallback, null when none.
  city: string | null;
  region: string | null;
  coordinatePrecision: 'city' | 'region' | 'country' | null;
}

export interface CoordinateResolution {
  location: string;       // "City, State, Country"
  city: string | null;
  state: string | null;
  country: string | null;
  // Additive. ISO 3166-1 alpha-2 (uppercase) and ISO 3166-2 subdivision code
  // when LocationIQ supplies them; null when it does not — never guessed.
  countryCode: string | null;
  regionCode: string | null;
}

// ── Service ──

@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);
  private readonly locationIqKey: string;

  // IP lookups are local (geoip-lite MaxMind DB) — 5 min cache is plenty
  private readonly ipCache = new SimpleCache<IpResolution>(5 * 60 * 1000);
  // Reverse geocode is a network call to LocationIQ — cache 30 min
  private readonly coordCache = new SimpleCache<CoordinateResolution>(30 * 60 * 1000);

  constructor(private readonly config: ConfigService) {
    this.locationIqKey = this.config.get('LOCATIONIQ_API_KEY', '');
  }

  // ── Endpoint 1: IP-based resolution ──
  // Returns country, currency, timezone from a geoip-lite lookup.
  // Used by earnings (currency) and user-service (timezone).
  // Never used for profile display.
  resolveIp(ip: string): IpResolution {
    const cached = this.ipCache.get(ip);
    if (cached) return cached;

    const result: IpResolution = {
      ip,
      country: null,
      currency: null,
      timezone: null,
      coordinates: null,
      city: null,
      region: null,
      coordinatePrecision: null,
    };

    if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('10.') || ip.startsWith('192.168.')) {
      return result;
    }

    try {
      const geo = geoip.lookup(ip);
      if (!geo) return result;

      const countryCode = geo.country?.toUpperCase() ?? null;
      result.country = countryCode;
      result.currency = countryCode ? (COUNTRY_CURRENCY[countryCode] ?? null) : null;

      result.city = geo.city || null;
      result.region = geo.region || null;

      if (Array.isArray(geo.ll) && geo.ll.length >= 2) {
        const [lat, lon] = geo.ll;
        if (Number.isFinite(lat) && Number.isFinite(lon)) {
          result.coordinates = [lat, lon];
          result.coordinatePrecision = result.city ? 'city' : result.region ? 'region' : 'country';
          const candidates = geoTz(lat, lon);
          if (Array.isArray(candidates) && candidates.length > 0) {
            const tz = candidates[0].trim();
            if (tz && this.isValidIanaTimeZone(tz)) {
              result.timezone = tz;
            }
          }
        }
      }
    } catch (err) {
      this.logger.warn(`IP resolution failed for ${ip}: ${(err as Error).message}`);
    }

    this.ipCache.set(ip, result);
    return result;
  }

  // ── Endpoint 2: Coordinate-based resolution ──
  // Reverse geocodes GPS coordinates via LocationIQ to municipality level.
  // Used exclusively for profile display.
  // Returns nothing if coordinates are unavailable — never falls back to IP.
  async resolveCoordinates(lat: number, lon: number): Promise<CoordinateResolution | null> {
    const cacheKey = `${lat.toFixed(4)},${lon.toFixed(4)}`;
    const cached = this.coordCache.get(cacheKey);
    if (cached) return cached;

    if (!this.locationIqKey) {
      this.logger.warn('LOCATIONIQ_API_KEY not configured, cannot reverse geocode');
      return null;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(
        `https://us1.locationiq.com/v1/reverse?key=${this.locationIqKey}&lat=${lat}&lon=${lon}&format=json&addressdetails=1`,
        { signal: controller.signal },
      );
      clearTimeout(timeout);

      if (!res.ok) {
        this.logger.warn(`LocationIQ reverse geocode failed: ${res.status}`);
        return null;
      }

      const data = await res.json();
      const address = data.address || {};

      const city = address.city || address.town || address.village || address.hamlet || null;
      const state = address.state || null;
      const country = address.country || null;

      const parts = [city, state, country].filter(Boolean);
      if (parts.length === 0) return null;

      const rawCountryCode = typeof address.country_code === 'string' ? address.country_code.toUpperCase() : '';
      const countryCode = /^[A-Z]{2}$/.test(rawCountryCode) ? rawCountryCode : null;
      // Nominatim-style "US-IL": keep only the subdivision part, if well-formed.
      const iso = typeof address['ISO3166-2-lvl4'] === 'string' ? address['ISO3166-2-lvl4'] : '';
      const regionMatch = /^[A-Z]{2}-([A-Z0-9]{1,3})$/.exec(iso);
      const regionCode = regionMatch ? regionMatch[1] : null;

      const result: CoordinateResolution = {
        location: parts.join(', '),
        city,
        state,
        country,
        countryCode,
        regionCode,
      };

      this.coordCache.set(cacheKey, result);
      return result;
    } catch (err) {
      // Fixed message only: neither the coordinates nor the request URL (which
      // carries the API key) may reach the logs.
      this.logger.warn('Reverse geocode failed');
      return null;
    }
  }

  // Static lookup for testing (lifted from earnings-service)
  getCurrencyForCountry(countryCode: string): string {
    return COUNTRY_CURRENCY[countryCode.toUpperCase()] ?? 'USD';
  }

  private isValidIanaTimeZone(timeZone: string): boolean {
    try {
      Intl.DateTimeFormat(undefined, { timeZone });
      return true;
    } catch {
      return false;
    }
  }
}
