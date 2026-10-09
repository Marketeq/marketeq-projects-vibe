import { Logger } from '@nestjs/common';
import { Request } from 'express';
import { isIP } from 'node:net';
import { extractClientIp } from './extract-client-ip';

// DEVELOPMENT-ONLY client-IP override, read from the SERVER's own environment
// (IDENTITY_VERIFICATION_DEV_CLIENT_IP) — never from a request header, query
// parameter, body or any frontend value.
//
// Why it exists: on a developer machine every request reaches this service
// from loopback, which location-service cannot resolve to a country, so the
// server-side home-country confirmation can never succeed locally. Setting
// the variable to the developer's real PUBLIC IP lets the normal location
// provider and the normal VPN/proxy check run against it, unchanged.
//
// Honored ONLY when NODE_ENV === 'development' (read at call time) and only
// for a usable public IP. In test, staging, production and unset NODE_ENV it is
// ignored completely. The normal extractClientIp is untouched and is what
// runs whenever this returns nothing. The IP value is never logged.

const logger = new Logger('EffectiveClientIp');
let warnedInvalid = false;

function ipv4ToInt(ip: string): number {
  return ip.split('.').reduce((acc, octet) => acc * 256 + Number(octet), 0);
}

function inV4Range(value: number, base: string, bits: number): boolean {
  const size = 2 ** (32 - bits);
  const start = ipv4ToInt(base);
  return value >= start && value < start + size;
}

// Ranges that can never be a device's public address.
const NON_PUBLIC_V4: Array<[string, number]> = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10], // CGNAT
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24], // documentation
  ['192.168.0.0', 16],
  ['198.18.0.0', 15], // benchmarking
  ['198.51.100.0', 24], // documentation
  ['203.0.113.0', 24], // documentation
  ['224.0.0.0', 4], // multicast
  ['240.0.0.0', 4], // reserved + broadcast
];

export function isUsablePublicIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) {
    const value = ipv4ToInt(ip);
    return !NON_PUBLIC_V4.some(([base, bits]) => inV4Range(value, base, bits));
  }
  if (version === 6) {
    const lower = ip.toLowerCase();
    const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(lower);
    if (mapped) return isUsablePublicIp(mapped[1]);
    if (lower === '::' || lower === '::1') return false;
    if (/^fe[89ab]/.test(lower)) return false; // link-local fe80::/10
    if (/^f[cd]/.test(lower)) return false; // unique-local fc00::/7
    if (lower.startsWith('ff')) return false; // multicast
    if (lower.startsWith('2001:db8:') || lower === '2001:db8::') return false; // documentation
    return true;
  }
  return false;
}

/** The override IP when (and only when) it is active and valid; otherwise null. */
export function getDevClientIpOverride(env: NodeJS.ProcessEnv = process.env): string | null {
  if (env.NODE_ENV !== 'development') return null;
  const raw = env.IDENTITY_VERIFICATION_DEV_CLIENT_IP?.trim();
  if (!raw) return null;
  if (!isUsablePublicIp(raw)) {
    if (!warnedInvalid) {
      warnedInvalid = true;
      // Fixed message — never the value.
      logger.warn('IDENTITY_VERIFICATION_DEV_CLIENT_IP is set but is not a usable public IP — ignored.');
    }
    return null;
  }
  return raw;
}

/** Client IP for location/VPN decisions: the dev override if active, else the normal extraction. */
export function getEffectiveClientIp(req: Request): string | null {
  return getDevClientIpOverride() ?? extractClientIp(req);
}
