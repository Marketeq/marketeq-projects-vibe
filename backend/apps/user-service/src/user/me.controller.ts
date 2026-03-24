import {
  Controller, Get, Patch, Req, Body, UnauthorizedException, Logger, HttpCode, HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { UserService } from './user.service';
import * as geoip from 'geoip-lite';

/**
 * Handles /user/* routes — profile lookup and timezone/location sync.
 *
 * Location uses a hybrid approach:
 *   1. Client sends GPS lat/lng from browser Geolocation API
 *   2. Server detects region from IP (cannot be faked)
 *   3. Server validates GPS coordinates fall within the IP's country
 *   4. If valid → reverse-geocode GPS for precise city (like Tinder/Bumble)
 *   5. If invalid or no GPS → fall back to IP-based location
 */
@Controller('user')
export class MeController {
  private readonly logger = new Logger(MeController.name);
  constructor(private readonly userService: UserService) {}

  @Get('me')
  async me(@Req() req: Request) {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const token = auth.slice(7);
    const payload = this.decodeJwtPayload(token);
    if (!payload?.email && !payload?.sub) {
      throw new UnauthorizedException('Invalid token payload');
    }

    const email: string = payload.email;
    const sub: string | undefined = payload.sub;

    this.logger.log(`[me] JWT email=${email ?? 'none'}, sub=${sub ?? 'none'}`);

    // Find user by email first (fast, no relations), then load full profile once
    let user: any = null;

    if (email) {
      user = await this.userService.findByEmail(email);
    }

    // Fallback: try sub as user-service ID (only if email lookup failed)
    if (!user && sub) {
      try {
        user = await this.userService.findByEmail(sub); // not findById — avoid expensive relation load
      } catch {
        // sub might not be a valid user ID in this DB
      }
    }

    if (!user) {
      if (!email) {
        throw new UnauthorizedException('Token missing email claim');
      }
      user = await this.userService.create({
        email,
        firstName: payload.firstName ?? payload.given_name ?? null,
        lastName: payload.lastName ?? payload.family_name ?? null,
        userType: 'talent',
      });
    }

    // Single expensive query — load full profile with all relations only once
    return this.userService.findById(user.id);
  }

  @Patch('onboarding-dismissed')
  @HttpCode(HttpStatus.OK)
  async dismissOnboarding(
    @Req() req: Request,
    @Body() body: { role?: string },
  ) {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const payload = this.decodeJwtPayload(auth.slice(7));
    if (!payload?.sub && !payload?.email) {
      throw new UnauthorizedException('Invalid token payload');
    }

    let user: any = null;
    if (payload.sub) {
      try { user = await this.userService.findById(payload.sub); } catch {}
    }
    if (!user && payload.email) {
      user = await this.userService.findByEmail(payload.email);
    }
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Set the user's role/userType if provided and not already set
    if (body.role && !user.userType) {
      await this.userService.update(user.id, { userType: body.role } as any);
    }

    await this.userService.dismissOnboarding(user.id);

    return this.userService.findById(user.id);
  }

  @Patch('refresh-timezone')
  async refreshTimezone(
    @Req() req: Request,
    @Body() body: { timeZone?: string; lat?: number; lng?: number },
  ) {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const payload = this.decodeJwtPayload(auth.slice(7));
    if (!payload?.email) {
      throw new UnauthorizedException('Invalid token');
    }

    const user = await this.userService.findByEmail(payload.email);
    if (!user) throw new UnauthorizedException('User not found');

    const updates: Record<string, string> = {};

    // Accept timezone from browser Intl API (not security-sensitive)
    if (body.timeZone && body.timeZone !== user.timezone) {
      updates.timezone = body.timeZone;
    }

    // Step 1: Get IP-based location (authoritative region)
    let ip = this.extractClientIp(req);
    if (ip && this.isPrivateIp(ip)) {
      ip = await this.getPublicIp();
    }

    const ipGeo = ip ? await this.lookupIpLocation(ip) : null;

    // Step 2: If client sent GPS coordinates, validate against IP region
    let finalLocation: string | null = null;

    if (body.lat != null && body.lng != null && ipGeo?.countryCode) {
      // Reverse-geocode the GPS coordinates
      const gpsLocation = await this.reverseGeocode(body.lat, body.lng);

      if (gpsLocation && gpsLocation.countryCode === ipGeo.countryCode) {
        // GPS country matches IP country → trust the precise GPS location
        finalLocation = gpsLocation.location;
        this.logger.log(`GPS location validated: ${finalLocation} (matches IP region: ${ipGeo.countryCode})`);
      } else {
        // GPS doesn't match IP region → reject GPS, use IP location
        this.logger.warn(
          `GPS location rejected: GPS country=${gpsLocation?.countryCode}, IP country=${ipGeo.countryCode}. Using IP-based location.`,
        );
        finalLocation = ipGeo.location;
      }
    } else {
      // No GPS sent → use IP-based location
      finalLocation = ipGeo?.location || null;
    }

    if (finalLocation && finalLocation !== user.location) {
      updates.location = finalLocation;
    }

    // Derive timezone from IP geo if client didn't send one
    if (!body.timeZone && ipGeo?.timezone && ipGeo.timezone !== user.timezone) {
      updates.timezone = ipGeo.timezone;
    }

    if (Object.keys(updates).length > 0) {
      await this.userService.update(user.id, updates as any);
    }

    return {
      timeZone: updates.timezone || user.timezone,
      location: updates.location || user.location,
    };
  }

  /** Extract the real client IP, respecting proxy headers. */
  private extractClientIp(req: Request): string | null {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded).split(',')[0].trim();
      return ip || null;
    }
    const realIp = req.headers['x-real-ip'];
    if (realIp) {
      return (Array.isArray(realIp) ? realIp[0] : realIp).trim();
    }
    return req.socket?.remoteAddress || null;
  }

  /** Look up location + country from IP using ip-api.com, fallback to geoip-lite. */
  private async lookupIpLocation(ip: string): Promise<{
    location: string;
    timezone: string;
    countryCode: string;
    lat?: number;
    lng?: number;
  } | null> {
    // Primary: ip-api.com (free, no key, 45 req/min)
    try {
      const res = await fetch(
        `http://ip-api.com/json/${ip}?fields=city,regionName,country,countryCode,timezone,lat,lon,status`,
      );
      const data = await res.json();
      if (data.status === 'success') {
        // "City, State" for US, "City, Region, Country" for international
        const parts = data.countryCode === 'US'
          ? [data.city, data.regionName].filter(Boolean)
          : [data.city, data.regionName, data.country].filter(Boolean);
        return {
          location: parts.join(', '),
          timezone: data.timezone || '',
          countryCode: data.countryCode || '',
          lat: data.lat,
          lng: data.lon,
        };
      }
    } catch {
      this.logger.warn('ip-api.com lookup failed, falling back to geoip-lite');
    }

    // Fallback: local geoip-lite
    const geo = geoip.lookup(ip);
    if (geo) {
      const city = geo.city || '';
      const region = geo.region || '';
      const country = geo.country || '';
      let location = '';
      if (city && region) location = `${city}, ${region}, ${country}`;
      else if (city) location = `${city}, ${country}`;
      else if (region) location = `${region}, ${country}`;
      return {
        location,
        timezone: geo.timezone || '',
        countryCode: country,
        lat: geo.ll?.[0],
        lng: geo.ll?.[1],
      };
    }

    return null;
  }

  /** Reverse-geocode lat/lng to city using ip-api.com's companion or LocationIQ. */
  private async reverseGeocode(lat: number, lng: number): Promise<{
    location: string;
    countryCode: string;
  } | null> {
    try {
      const key = 'pk.8d6cd3795ace5efa9a0a3469b55d08cb';
      const res = await fetch(
        `https://us1.locationiq.com/v1/reverse?key=${key}&lat=${lat}&lon=${lng}&format=json`,
      );
      const data = await res.json();
      const addr = data.address;
      if (!addr) return null;

      const city = addr.city || addr.town || addr.village || addr.county || '';
      const state = addr.state || '';
      const countryCode = addr.country_code?.toUpperCase() || '';

      // Use "City, State" for US, "City, State, Country" for international
      const parts = countryCode === 'US'
        ? [city, state].filter(Boolean)
        : [city, state, addr.country || ''].filter(Boolean);
      return {
        location: parts.join(', '),
        countryCode,
      };
    } catch {
      this.logger.warn('Reverse geocode failed');
      return null;
    }
  }

  /** Check if an IP is private/localhost. */
  private isPrivateIp(ip: string): boolean {
    const clean = ip.replace(/^::ffff:/, '');
    return (
      clean === '127.0.0.1' ||
      clean === '::1' ||
      clean.startsWith('10.') ||
      clean.startsWith('192.168.') ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(clean)
    );
  }

  /** Fetch the server's public IP from a trusted service. */
  private async getPublicIp(): Promise<string | null> {
    try {
      const res = await fetch('https://api.ipify.org?format=json');
      const data = await res.json();
      return data.ip || null;
    } catch {
      this.logger.warn('Failed to resolve public IP');
      return null;
    }
  }

  /** Base64-decode the JWT payload (middle segment) without crypto verification. */
  private decodeJwtPayload(token: string): Record<string, any> | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payload = Buffer.from(parts[1], 'base64url').toString('utf8');
      return JSON.parse(payload);
    } catch {
      return null;
    }
  }
}
