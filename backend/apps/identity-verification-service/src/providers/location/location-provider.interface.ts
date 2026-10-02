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
 * Display-only view of the same lookup, for the verification dialog's map.
 * Coordinates are approximate, come straight from the provider, are never
 * persisted, and carry no IP address.
 */
export interface DisplayLocation extends DetectedLocation {
  /** ISO 3166-2 subdivision code, when the provider supplies one (today: never). */
  regionCode: string | null;
  latitude: number | null;
  longitude: number | null;
}

/**
 * Reverse-geocoded place for browser-supplied coordinates (display only).
 * Everything here comes from the provider's response, never from the browser.
 */
export interface ReverseGeocodedPlace {
  countryCode: string | null;
  countryName: string | null;
  city: string | null;
  regionName: string | null;
  regionCode: string | null;
}

/**
 * LocationProvider boundary (Technical Architecture §11). This service does
 * not implement IP geolocation itself — it depends on this interface so the
 * concrete implementation can be swapped for the planned Location Service
 * once it ships, without this service's own domain logic changing.
 */
export interface LocationProvider {
  resolve(input: DetectLocationInput): Promise<DetectedLocation | null>;
  /** Same lookup as resolve(), plus the provider's approximate coordinates. */
  resolveDisplay(input: DetectLocationInput): Promise<DisplayLocation | null>;
  /**
   * Reverse-geocodes coordinates server-side. Returns null when the provider
   * is unavailable, unconfigured, or finds nothing (a soft failure: the caller
   * falls back to the server-derived country). Never logs the coordinates.
   */
  resolveCoordinates(input: { latitude: number; longitude: number }): Promise<ReverseGeocodedPlace | null>;
}

export const LOCATION_PROVIDER = Symbol('LOCATION_PROVIDER');
