export interface DetectLocationInput {
  ipAddress: string;
}

/**
 * Country-level resolution only — no lat/long, no street address.
 * Precise/coordinate-based location is explicitly out of scope for identity
 * verification (Technical Architecture §3, §11).
 */
export interface DetectedLocation {
  countryCode: string;
  regionState: string | null;
  city: string | null;
}

/**
 * LocationProvider boundary (Technical Architecture §11). This service does
 * not implement IP geolocation itself — it depends on this interface so the
 * concrete implementation can be swapped for the planned Location Service
 * once it ships, without this service's own domain logic changing.
 */
export interface LocationProvider {
  resolve(input: DetectLocationInput): Promise<DetectedLocation | null>;
}

export const LOCATION_PROVIDER = Symbol('LOCATION_PROVIDER');
