import { Injectable, Logger } from '@nestjs/common';
import { ConfigService }      from '@nestjs/config';
import * as geoip             from 'geoip-lite';

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

export interface TalentCurrencyResolution {
  currency: string;
  fallback: boolean;
}

@Injectable()
export class GeoService {
  private readonly logger = new Logger(GeoService.name);
  private readonly defaultCurrency: string;
  private readonly userServiceUrl: string;
  private readonly internalToken: string;

  constructor(private readonly config: ConfigService) {
    this.defaultCurrency = this.config.get('DEFAULT_CURRENCY', 'USD');
    this.userServiceUrl = this.config.get('earnings.userServiceUrl', 'http://localhost:3002');
    this.internalToken = this.config.get('earnings.internalServiceToken', '');
  }

  // ES-06 §4/§8: resolves the talent's display currency.
  // Priority: explicit preference (Currency Settings) → IP-derived region
  // (geoip-lite, real lookup, not a stub) → USD. Any failure at the
  // preference-lookup tier — service down, timeout — falls through to the
  // IP tier rather than going straight to USD, since that's still a
  // resolvable region signal; only "neither resolved anything" sets the
  // fallback flag that surfaces the Currency Settings prompt (EC-13).
  // One retry on timeout/network failure per the edge-case spec, each
  // attempt capped at 3s so a dead user-service can't stall earnings load.
  async resolveTalentCurrency(contractorId: string, ip?: string | null): Promise<TalentCurrencyResolution> {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const currency = await this.fetchPreferredCurrency(contractorId);
        if (currency && /^[A-Z]{3}$/.test(currency)) {
          return { currency, fallback: false };
        }
        break; // reached user-service fine, no preference saved — try IP next
      } catch (err) {
        if (attempt === 0) {
          this.logger.warn(`Currency lookup for ${contractorId} failed, retrying once: ${(err as Error).message}`);
          continue;
        }
        this.logger.warn(`Currency lookup for ${contractorId} failed after retry, falling back to IP detection: ${(err as Error).message}`);
      }
    }

    const ipCurrency = ip ? await this.detectCurrency(ip) : null;
    if (ipCurrency) return { currency: ipCurrency, fallback: false };

    return { currency: this.defaultCurrency, fallback: true };
  }

  private async fetchPreferredCurrency(contractorId: string): Promise<string | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    try {
      const res = await fetch(
        `${this.userServiceUrl}/internal/users/${contractorId}/currency-profile`,
        { headers: { 'x-internal-token': this.internalToken }, signal: controller.signal },
      );
      if (!res.ok) throw new Error(`user-service responded ${res.status}`);
      const body = await res.json();
      return body?.preferredCurrency ?? null;
    } finally {
      clearTimeout(timeout);
    }
  }

  // Real IP → country → currency lookup via geoip-lite (same library
  // timezone-resolution.service.ts already uses for IP → timezone). Returns
  // null — not a default — when the IP is unroutable/local or the country
  // isn't in the currency table, so callers can tell "genuinely unresolved"
  // apart from "resolved to USD because the region uses USD".
  async detectCurrency(ip: string): Promise<string | null> {
    if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('10.') || ip.startsWith('192.168.'))
      return null;

    try {
      const geo = geoip.lookup(ip);
      if (!geo?.country) return null;
      const currency = COUNTRY_CURRENCY[geo.country.toUpperCase()];
      if (!currency) {
        this.logger.debug(`GeoService: ${ip} → country ${geo.country} has no mapped currency`);
        return null;
      }
      return currency;
    } catch (err) {
      this.logger.warn(`GeoService: IP currency lookup failed for ${ip}: ${(err as Error).message}`);
      return null;
    }
  }

  // Static lookup for testing
  getCurrencyForCountry(countryCode: string): string {
    return COUNTRY_CURRENCY[countryCode.toUpperCase()] ?? this.defaultCurrency;
  }

  // Mirrors user-service's timezone-resolution.service.ts extractIp — same
  // x-forwarded-for-first convention, now meaningful now that the gateway
  // actually forwards that header (see proxy.service.ts).
  extractClientIp(req: { headers: Record<string, string | string[] | undefined>; socket?: { remoteAddress?: string } }): string | null {
    const xff = req.headers['x-forwarded-for'];
    const candidates = (Array.isArray(xff) ? xff.join(',') : xff || '')
      .split(',').map(s => s.trim()).filter(Boolean);
    for (const candidate of candidates) {
      const ip = candidate.startsWith('::ffff:') ? candidate.slice(7) : candidate;
      if (ip) return ip;
    }
    return req.socket?.remoteAddress ?? null;
  }
}
