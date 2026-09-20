import { Controller, Get, Query, Req, BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import { LocationService, IpResolution, CoordinateResolution } from './location.service';
import { extractClientIp } from './ip-extraction.util';

@Controller('location')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  // IP-based: country, currency, timezone.
  // Callers: earnings-service (currency), user-service (timezone).
  // Never used for profile display.
  @Get('resolve-ip')
  resolveIp(
    @Req() req: Request,
    @Query('ip') explicitIp?: string,
  ): IpResolution {
    const ip = explicitIp || extractClientIp(req);
    if (!ip) {
      return {
        ip: '',
        country: null,
        currency: null,
        timezone: null,
        coordinates: null,
      };
    }
    return this.locationService.resolveIp(ip);
  }

  // Coordinate-based: reverse geocode to municipality level.
  // Callers: talent profile (Phase 4).
  // Returns null if coordinates are missing — never falls back to IP.
  @Get('resolve-coordinates')
  async resolveCoordinates(
    @Query('lat') latStr?: string,
    @Query('lon') lonStr?: string,
  ): Promise<CoordinateResolution | null> {
    if (!latStr || !lonStr) {
      throw new BadRequestException('lat and lon query params are required');
    }
    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      throw new BadRequestException('lat and lon must be valid numbers');
    }
    return this.locationService.resolveCoordinates(lat, lon);
  }
}
