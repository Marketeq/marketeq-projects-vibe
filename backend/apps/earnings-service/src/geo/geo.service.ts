import { Injectable, Logger } from '@nestjs/common';
import { ConfigService }      from '@nestjs/config';

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
  private readonly locationServiceUrl: string;

  constructor(private readonly config: ConfigService) {
    this.defaultCurrency = this.config.get('DEFAULT_CURRENCY', 'USD');
    this.userServiceUrl = this.config.get('earnings.userServiceUrl', 'http://localhost:3002');
    this.internalToken = this.config.get('earnings.internalServiceToken', '');
    this.locationServiceUrl = this.config.get('LOCATION_SERVICE_URL') || 'http://localhost:3036';
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

  // IP → currency via location-service. Returns null when unresolvable so
  // callers can tell "genuinely unresolved" apart from "resolved to USD."
  async detectCurrency(ip: string): Promise<string | null> {
    if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('10.') || ip.startsWith('192.168.'))
      return null;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(
        `${this.locationServiceUrl}/location/resolve-ip?ip=${encodeURIComponent(ip)}`,
        { signal: controller.signal },
      );
      clearTimeout(timeout);

      if (!res.ok) return null;
      const data = await res.json();
      return data?.currency ?? null;
    } catch (err) {
      this.logger.warn(`GeoService: location-service currency lookup failed for ${ip}: ${(err as Error).message}`);
      return null;
    }
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
