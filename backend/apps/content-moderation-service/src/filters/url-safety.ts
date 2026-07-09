import { BadRequestException } from '@nestjs/common';
import { isIP } from 'net';
import { promises as dns } from 'dns';

/**
 * assertPublicHttpUrl — validates that a URL is safe to fetch from an
 * internet-facing media moderation pipeline. Rejects:
 *  - Non-http(s) schemes
 *  - IP literal hostnames (forces DNS lookup / name-based allowlisting)
 *  - Hostnames ending in `.local`, or equal to `localhost`
 *  - Any resolved IPv4/IPv6 that falls in a private / loopback /
 *    link-local / unique-local / reserved range (SSRF protection,
 *    including DNS rebinding defense)
 *
 * Throws BadRequestException on violation.
 */
export async function assertPublicHttpUrl(input: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    throw new BadRequestException('Invalid media URL');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new BadRequestException('Only http/https URLs are allowed');
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!hostname) {
    throw new BadRequestException('Media URL must have a hostname');
  }

  // Reject IP literals outright — force DNS lookups for name-based URLs.
  if (isIP(hostname) !== 0) {
    throw new BadRequestException('IP literal hosts are not allowed');
  }

  // Reject obvious local/internal names.
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.localhost')
  ) {
    throw new BadRequestException('Local/internal hostnames are not allowed');
  }

  // Resolve all A/AAAA records and reject if ANY is in a private range.
  // Uses dns.lookup with all=true to honor /etc/hosts as well.
  let addresses: { address: string; family: number }[];
  try {
    addresses = await dns.lookup(hostname, { all: true });
  } catch {
    throw new BadRequestException('Unable to resolve media URL hostname');
  }

  if (!addresses.length) {
    throw new BadRequestException('Media URL hostname has no DNS records');
  }

  for (const { address } of addresses) {
    if (isPrivateAddress(address)) {
      throw new BadRequestException(
        'Media URL resolves to a private/internal address',
      );
    }
  }
}

/** Returns true if the IP (v4 or v6) is in a private / loopback / reserved range. */
export function isPrivateAddress(ip: string): boolean {
  const kind = isIP(ip);
  if (kind === 4) return isPrivateIPv4(ip);
  if (kind === 6) return isPrivateIPv6(ip);
  return true; // treat unparseable as unsafe
}

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map((n) => Number(n));
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return true;
  const [a, b] = parts;

  // 0.0.0.0/8 — "this" network
  if (a === 0) return true;
  // 10.0.0.0/8 — private
  if (a === 10) return true;
  // 127.0.0.0/8 — loopback
  if (a === 127) return true;
  // 169.254.0.0/16 — link-local (AWS IMDS lives here)
  if (a === 169 && b === 254) return true;
  // 172.16.0.0/12 — private
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16 — private
  if (a === 192 && b === 168) return true;
  // 100.64.0.0/10 — CGNAT
  if (a === 100 && b >= 64 && b <= 127) return true;
  // 224.0.0.0/4 — multicast
  if (a >= 224 && a <= 239) return true;
  // 240.0.0.0/4 — reserved
  if (a >= 240) return true;

  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  // ::1 loopback
  if (lower === '::1') return true;
  // :: unspecified
  if (lower === '::') return true;
  // fe80::/10 link-local
  if (lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) {
    return true;
  }
  // fc00::/7 unique local (fc00 and fd00 prefixes)
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
  // ff00::/8 multicast
  if (lower.startsWith('ff')) return true;
  // ::ffff:0:0/96 IPv4-mapped — re-check as IPv4
  if (lower.startsWith('::ffff:')) {
    const v4 = lower.slice(7);
    if (isIP(v4) === 4) return isPrivateIPv4(v4);
  }
  return false;
}
