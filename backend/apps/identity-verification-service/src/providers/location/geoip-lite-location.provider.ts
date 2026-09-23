import { Injectable } from '@nestjs/common';
import * as geoip from 'geoip-lite';
import {
  DetectedLocation,
  DetectLocationInput,
  LocationProvider,
} from './location-provider.interface';

/**
 * First concrete LocationProvider implementation (Technical Architecture
 * §11). No consolidated Location Service exists yet; the doc identifies two
 * existing IP-to-country implementations (user-service's and
 * earnings-service's), calls earnings-service's the weaker of the two, and
 * recommends the first concrete LocationProvider call into the stronger one
 * rather than adding a third copy. This mirrors user-service's
 * TimezoneResolutionService approach — same library (geoip-lite), same
 * offline/bundled lookup, no external API call or key needed at runtime.
 *
 * When the planned Location Service ships, only this class (and its DI
 * binding in app.module.ts) needs to change to call that service instead —
 * the LocationProvider interface and every caller stay the same.
 */
@Injectable()
export class GeoIpLiteLocationProvider implements LocationProvider {
  async resolve(input: DetectLocationInput): Promise<DetectedLocation | null> {
    const geo = geoip.lookup(input.ipAddress);
    if (!geo || !geo.country) {
      return null;
    }

    return {
      countryCode: geo.country,
      regionState: geo.region || null,
      city: geo.city || null,
    };
  }
}
