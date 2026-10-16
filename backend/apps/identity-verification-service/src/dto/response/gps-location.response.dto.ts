export type GpsLocationStatus = 'resolved' | 'country_mismatch' | 'unavailable';

// Display-only. `countryCode`/`countryName` are ALWAYS the server-derived IP
// country (what home-country confirmation will use). City, region and the
// approximate coordinates are present only when status is 'resolved'. No IP and
// no precise browser coordinates are ever returned.
export class GpsLocationResponseDto {
  status!: GpsLocationStatus;
  countryCode!: string | null;
  countryName!: string | null;
  city!: string | null;
  regionCode!: string | null;
  regionName!: string | null;
  latitude!: number | null;
  longitude!: number | null;
}
