import { DisplayLocation } from '../../providers/location/location-provider.interface';

export function countryNameFromCode(code: string): string | null {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) ?? null;
  } catch {
    return null;
  }
}

// Sanitized, display-only view of the server-side IP lookup. It carries no IP
// address, nothing here is persisted, and only countryCode ever feeds identity
// logic (home-country confirmation). City, region and coordinates are
// approximate and are never identity proof.
export class DetectedLocationResponseDto {
  countryCode!: string | null;
  countryName!: string | null;
  city!: string | null;
  regionCode!: string | null;
  regionName!: string | null;
  latitude!: number | null;
  longitude!: number | null;

  static from(location: DisplayLocation | null): DetectedLocationResponseDto {
    const dto = new DetectedLocationResponseDto();
    dto.countryCode = location?.countryCode ?? null;
    dto.countryName = location ? countryNameFromCode(location.countryCode) : null;
    dto.city = location?.city ?? null;
    dto.regionCode = location?.regionCode ?? null;
    dto.regionName = location?.regionState ?? null;
    dto.latitude = location?.latitude ?? null;
    dto.longitude = location?.longitude ?? null;
    return dto;
  }
}
