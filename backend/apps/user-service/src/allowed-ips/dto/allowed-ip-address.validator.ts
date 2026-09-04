import {
  ValidationOptions,
  registerDecorator,
  ValidationArguments,
} from 'class-validator';
import { isIP } from 'net';

/**
 * The two shapes the IP Restrictions screen can produce: a single address, or a
 * range typed as "from - to". Both sides of a range must be the same IP
 * version, and the range has to run forwards — "203.0.113.9 - 203.0.113.4"
 * allows nothing, and silently storing it would look like a working rule.
 */
export function isAllowedIpAddress(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > 255) return false;

  // The screen writes ranges with an en dash, not a hyphen. Accept every dash a
  // range plausibly arrives with rather than rewriting the value: entries are
  // shown back exactly as they were saved.
  const parts = trimmed.split(/[-\u2013\u2014]/).map((p) => p.trim());
  if (parts.length === 1) return isIP(parts[0]) !== 0;
  if (parts.length !== 2) return false;

  const [from, to] = parts;
  const fromVersion = isIP(from);
  const toVersion = isIP(to);
  if (fromVersion === 0 || fromVersion !== toVersion) return false;

  return compareAddresses(from, to, fromVersion) <= 0;
}

/** -1, 0 or 1, comparing two same-version addresses numerically. */
function compareAddresses(from: string, to: string, version: number): number {
  const expand = (addr: string): bigint =>
    version === 4
      ? addr
          .split('.')
          .reduce((acc, octet) => (acc << 8n) + BigInt(Number(octet)), 0n)
      : expandIpv6(addr);

  const a = expand(from);
  const b = expand(to);
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Expands an IPv6 address, "::" shorthand included, to a single integer. */
function expandIpv6(addr: string): bigint {
  const [head, tail] = addr.split('::');
  const headGroups = head ? head.split(':').filter(Boolean) : [];
  const tailGroups = tail ? tail.split(':').filter(Boolean) : [];
  const missing = 8 - headGroups.length - tailGroups.length;
  const groups = [
    ...headGroups,
    ...Array<string>(addr.includes('::') ? missing : 0).fill('0'),
    ...tailGroups,
  ];
  return groups.reduce(
    (acc, group) => (acc << 16n) + BigInt(parseInt(group || '0', 16)),
    0n,
  );
}

export function IsAllowedIpAddress(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isAllowedIpAddress',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate: (value: unknown) => isAllowedIpAddress(value),
        defaultMessage: (args: ValidationArguments) =>
          `${args.property} must be an IP address or a range written "from - to", with both sides the same version and the range running forwards`,
      },
    });
  };
}
