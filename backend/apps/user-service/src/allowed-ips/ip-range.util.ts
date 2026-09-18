import { isIP } from 'net';

/**
 * Address comparison shared by the allow-list validator and the lockout
 * guards. Kept in one place so "is this a valid range" and "does this range
 * cover the caller" can never disagree about what an address means — a
 * disagreement there either rejects a legitimate entry or locks somebody out.
 */

/** A single integer for an address, so ranges can be compared numerically. */
export function toComparable(addr: string, version: number): bigint {
  if (version === 4) {
    return addr
      .split('.')
      .reduce((acc, octet) => (acc << 8n) + BigInt(Number(octet)), 0n);
  }
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

/**
 * Splits a stored entry into its endpoints. The screen writes ranges with an
 * en dash rather than a hyphen, so every dash a range plausibly arrives with is
 * accepted; a single address is returned as a range of one.
 */
export function parseEntry(
  entry: string,
): { from: string; to: string; version: number } | null {
  const trimmed = entry.trim();
  if (!trimmed) return null;

  const parts = trimmed.split(/[-–—]/).map((p) => p.trim());
  if (parts.length === 1) {
    const version = isIP(parts[0]);
    return version === 0 ? null : { from: parts[0], to: parts[0], version };
  }
  if (parts.length !== 2) return null;

  const [from, to] = parts;
  const version = isIP(from);
  if (version === 0 || version !== isIP(to)) return null;
  if (toComparable(from, version) > toComparable(to, version)) return null;

  return { from, to, version };
}

/**
 * Whether an allow-list entry covers a given address.
 *
 * Returns false rather than throwing on anything unparseable: this decides
 * whether someone is about to be locked out, and an entry nobody can interpret
 * is not protection.
 */
export function coversAddress(entry: string, candidate: string): boolean {
  const candidateVersion = isIP(candidate);
  if (candidateVersion === 0) return false;

  const parsed = parseEntry(entry);
  if (!parsed || parsed.version !== candidateVersion) return false;

  const value = toComparable(candidate, candidateVersion);
  return (
    value >= toComparable(parsed.from, parsed.version) &&
    value <= toComparable(parsed.to, parsed.version)
  );
}
