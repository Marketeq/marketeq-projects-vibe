import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import * as geoip from 'geoip-lite';
import { find as geoTz } from 'geo-tz';
import { isIP } from 'node:net';

export type TimeZoneSource = 'client' | 'ip' | 'stored' | 'default_utc';

export type TimeZoneResolution = {
  timeZone: string;
  source: TimeZoneSource;
};

@Injectable()
export class TimezoneResolutionService {
  resolve(
    req: Request,
    clientTimeZone?: string | null,
    storedTimeZone?: string | null,
  ): TimeZoneResolution {
    const normalizedClientTimeZone = this.normalizeTimeZone(clientTimeZone);
    if (normalizedClientTimeZone && this.isValidIanaTimeZone(normalizedClientTimeZone)) {
      return {
        timeZone: normalizedClientTimeZone,
        source: 'client',
      };
    }

    const ip = this.extractIp(req);
    const ipTimeZone = ip ? this.lookupTimeZoneFromIp(ip) : null;
    if (ipTimeZone) {
      return {
        timeZone: ipTimeZone,
        source: 'ip',
      };
    }

    const normalizedStoredTimeZone = this.normalizeTimeZone(storedTimeZone);
    if (normalizedStoredTimeZone && this.isValidIanaTimeZone(normalizedStoredTimeZone)) {
      return {
        timeZone: normalizedStoredTimeZone,
        source: 'stored',
      };
    }

    return {
      timeZone: 'UTC',
      source: 'default_utc',
    };
  }

  private lookupTimeZoneFromIp(ip: string): string | null {
    try {
      const geo = geoip.lookup(ip);
      if (!geo || !Array.isArray(geo.ll) || geo.ll.length < 2) {
        return null;
      }

      const [lat, lon] = geo.ll;
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        return null;
      }

      const candidates = geoTz(lat, lon);
      if (!Array.isArray(candidates) || candidates.length === 0) {
        return null;
      }

      const timeZone = this.normalizeTimeZone(candidates[0]);
      if (!timeZone || !this.isValidIanaTimeZone(timeZone)) {
        return null;
      }

      return timeZone;
    } catch {
      return null;
    }
  }

  private extractIp(req: Request): string | null {
    const xForwardedFor = req.headers['x-forwarded-for'];
    const forwardedIps = this.getHeaderValues(xForwardedFor)
      .flatMap((value) => value.split(','))
      .map((value) => value.trim())
      .filter(Boolean);

    for (const candidate of forwardedIps) {
      const normalized = this.normalizeIp(candidate);
      if (normalized) {
        return normalized;
      }
    }

    const xRealIp = this.getHeaderValues(req.headers['x-real-ip']);
    for (const candidate of xRealIp) {
      const normalized = this.normalizeIp(candidate);
      if (normalized) {
        return normalized;
      }
    }

    const socketIp = req.socket?.remoteAddress;
    const normalizedSocketIp = this.normalizeIp(socketIp ?? null);
    if (normalizedSocketIp) {
      return normalizedSocketIp;
    }

    const expressIp = this.normalizeIp(req.ip ?? null);
    if (expressIp) {
      return expressIp;
    }

    return null;
  }

  private getHeaderValues(value: string | string[] | undefined): string[] {
    if (!value) {
      return [];
    }

    if (Array.isArray(value)) {
      return value;
    }

    return [value];
  }

  private normalizeIp(raw: string | null): string | null {
    if (!raw) {
      return null;
    }

    let ip = raw.trim();
    if (!ip || ip.toLowerCase() === 'unknown') {
      return null;
    }

    if (ip.startsWith('::ffff:')) {
      ip = ip.slice('::ffff:'.length);
    }

    if (ip.startsWith('[')) {
      const closingBracket = ip.indexOf(']');
      if (closingBracket > 0) {
        ip = ip.slice(1, closingBracket);
      }
    }

    const hasPort = ip.includes(':') && ip.includes('.');
    if (hasPort) {
      const lastColon = ip.lastIndexOf(':');
      const maybePort = ip.slice(lastColon + 1);
      if (/^\d+$/.test(maybePort)) {
        ip = ip.slice(0, lastColon);
      }
    }

    return isIP(ip) ? ip : null;
  }

  private normalizeTimeZone(value?: string | null): string | null {
    if (!value) {
      return null;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  private isValidIanaTimeZone(timeZone: string): boolean {
    try {
      Intl.DateTimeFormat(undefined, { timeZone });
      return true;
    } catch {
      return false;
    }
  }
}

