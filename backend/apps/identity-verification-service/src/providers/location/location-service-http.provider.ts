import { Injectable, Logger } from '@nestjs/common';
import { LocationLookupUnavailableException } from '../../common/errors/domain-exceptions';
import {
  DetectedLocation,
  DetectLocationInput,
  LocationProvider,
} from './location-provider.interface';

// Real location-service integration (LS-00 — Service Overview & Architecture,
// confirmed by Christopher: HTTP-only, no RabbitMQ transport exists on
// location-service today). Replaces the previous GeoIpLiteLocationProvider,
// which ran its own separate geoip-lite/MaxMind lookup — this now reuses the
// single, canonical instance location-service already owns.
//
// Passes the already-correctly-extracted real client IP via the documented
// `?ip=` override so location-service resolves the real user's IP, never
// this service's own request IP (location-service falls back to extracting
// the caller's IP only when `ip` is omitted).
//
// Known, flagged gap: location-service's GET /location/resolve-ip response
// today is `{ip, country, currency, timezone, coordinates}` — no `region`/
// `city` fields (confirmed by reading location.service.ts directly). Country
// detection — this service's actual, documented requirement (LS-00 §2: "IP-
// based... sufficient for... country verification") — is fully preserved.
// regionState/city are returned honestly as null rather than guessed or
// left stale. Extending location-service to also surface region/city is a
// separate, larger change to another service, reported separately rather
// than folded into this one silently.
//
// TWO SECURITY GAPS DELIBERATELY LEFT OPEN — flagged, not fixed, this pass:
//   1. Client-IP trust: `input.ipAddress` traces back to this service's own
//      extractClientIp(req), which trusts the first hop of an incoming
//      x-forwarded-for chain. api-gateway's proxy.service.ts forwards
//      whatever x-forwarded-for chain arrived on the inbound request
//      (`existingXff`) and only APPENDS its own view of the client after it
//      — it never strips or overwrites a client-supplied prefix. X-Forwarded-
//      For is not a forbidden header in the Fetch spec, so a browser (or any
//      direct API caller) can set an arbitrary value and have it accepted as
//      the "real" client IP by every extractClientIp() in this repo,
//      including location-service's own. Not verified fixed anywhere in this
//      chain. A production deployment needs a trusted edge (the actual LB/
//      CDN hop) that overwrites rather than appends, or a proxy that only
//      trusts a fixed number of hops — neither exists today.
//   2. location-service access protection: GET /location/resolve-ip and
//      /resolve-coordinates have no auth at all (confirmed by reading
//      location.controller.ts) — any caller that can reach the service,
//      gateway or direct, can query it unauthenticated. Matches today's
//      status quo for this endpoint; not introduced or fixed here.
// Both remain unresolved. Do not treat either as fixed until explicitly
// verified and closed.
interface LocationServiceIpResolution {
  ip: string;
  country: string | null;
  currency: string | null;
  timezone: string | null;
  coordinates: [number, number] | null;
}

// Content validation, distinct from JSON-parse validation above: a response
// that parses as JSON can still be structurally wrong (wrong type, a
// truncated/proxied error body that happens to be valid JSON, a future
// location-service change that renames/removes a field) and this service's
// own `detectedCountry` feeds directly into confirmHomeCountry's eligibility
// check, so a bad value silently accepted here becomes a bad value in a
// persisted, verification-relevant field. Only the two fields this provider
// actually reads (country, coordinates) are checked — currency/timezone are
// intentionally not this provider's concern.
function isValidIpResolutionShape(value: unknown): value is LocationServiceIpResolution {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const body = value as Record<string, unknown>;

  const country = body.country;
  if (country !== null && country !== undefined) {
    if (typeof country !== 'string' || !/^[A-Z]{2}$/.test(country)) return false;
  }

  const coordinates = body.coordinates;
  if (coordinates !== null && coordinates !== undefined) {
    if (!Array.isArray(coordinates) || coordinates.length !== 2) return false;
    const [lat, lon] = coordinates;
    if (typeof lat !== 'number' || typeof lon !== 'number') return false;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return false;
  }

  return true;
}

@Injectable()
export class LocationServiceHttpProvider implements LocationProvider {
  private readonly logger = new Logger(LocationServiceHttpProvider.name);
  // No env file was edited to add this — falls back to location-service's
  // own documented local port (LS-00 §7 / ecosystem.config.js), matching the
  // same "config.get(...) || local default" convention already used for
  // every other inter-service URL in this repo (e.g. api-gateway's
  // proxy.service.ts serviceMap). Set LOCATION_SERVICE_URL to override.
  private readonly baseUrl =
    process.env.LOCATION_SERVICE_URL || 'http://localhost:3030';
  private readonly timeoutMs = 5000;

  async resolve(input: DetectLocationInput): Promise<DetectedLocation | null> {
    if (!input.ipAddress) {
      // Nothing to look up — matches GeoIpLiteLocationProvider's own
      // behavior for an empty input (a genuine "nothing found", not a
      // service failure).
      return null;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await fetch(
        `${this.baseUrl}/location/resolve-ip?ip=${encodeURIComponent(input.ipAddress)}`,
        { signal: controller.signal },
      );
    } catch (err) {
      this.logger.warn(`location-service request failed: ${(err as Error).message}`);
      throw new LocationLookupUnavailableException({ reason: 'request_failed' });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new LocationLookupUnavailableException({
        reason: 'http_error',
        httpStatus: response.status,
      });
    }

    let parsed: unknown;
    try {
      parsed = await response.json();
    } catch {
      throw new LocationLookupUnavailableException({ reason: 'malformed_json' });
    }

    if (!isValidIpResolutionShape(parsed)) {
      this.logger.warn('location-service resolve-ip returned an unexpected response shape');
      throw new LocationLookupUnavailableException({ reason: 'invalid_response_shape' });
    }
    const body = parsed;

    // Private/loopback IPs and IPs with no MaxMind entry both resolve with
    // country: null per location-service's own documented contract — a
    // genuine "nothing found", never a transport failure.
    if (!body.country) {
      return null;
    }

    return {
      countryCode: body.country,
      regionState: null,
      city: null,
    };
  }
}
