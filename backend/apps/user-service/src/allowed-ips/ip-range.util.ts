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

/** The address width of each IP version, for CIDR prefix bounds. */
const ADDRESS_BITS: Record<number, number> = { 4: 32, 6: 128 };

/**
 * The inverse of toComparable: turns a numeric address back into text.
 *
 * IPv6 comes back fully expanded rather than `::`-compressed. It is only used
 * for the endpoints of a parsed range and for naming a conflicting entry in an
 * error message, and an expanded form still round-trips through toComparable —
 * compressing it would add a second notation for no gain.
 */
export function fromComparable(value: bigint, version: number): string {
  if (version === 4) {
    const octets: string[] = [];
    for (let i = 3; i >= 0; i--) {
      octets.push(String((value >> BigInt(i * 8)) & 0xffn));
    }
    return octets.join('.');
  }
  const groups: string[] = [];
  for (let i = 7; i >= 0; i--) {
    groups.push(((value >> BigInt(i * 16)) & 0xffffn).toString(16));
  }
  return groups.join(':');
}

/**
 * Splits a stored entry into its endpoints. The screen writes ranges with an
 * en dash rather than a hyphen, so every dash a range plausibly arrives with is
 * accepted; a single address is returned as a range of one.
 *
 * CIDR (`192.168.1.0/24`) is accepted as a third shape, because that is the
 * notation IT teams already have their networks written down in — being made
 * to convert a /24 into "from - to" by hand is where transcription mistakes
 * come from. The host bits are cleared, so `10.0.0.5/24` describes the same
 * block as `10.0.0.0/24`; the entry is still stored exactly as it was typed.
 */
export function parseEntry(
  entry: string,
): { from: string; to: string; version: number } | null {
  const trimmed = entry.trim();
  if (!trimmed) return null;

  if (trimmed.includes('/')) {
    const segments = trimmed.split('/');
    if (segments.length !== 2) return null;

    const base = segments[0].trim();
    const prefixText = segments[1].trim();
    const version = isIP(base);
    if (version === 0) return null;
    if (!/^\d{1,3}$/.test(prefixText)) return null;

    const bits = ADDRESS_BITS[version];
    const prefix = Number(prefixText);
    if (prefix > bits) return null;

    const hostBits = BigInt(bits - prefix);
    const network = (toComparable(base, version) >> hostBits) << hostBits;
    const broadcast = network | ((1n << hostBits) - 1n);

    return {
      from: fromComparable(network, version),
      to: fromComparable(broadcast, version),
      version,
    };
  }

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

/**
 * Whether two allow-list entries cover any address in common.
 *
 * The unique constraint on the stored text only catches an entry typed exactly
 * the same way twice, so `10.0.0.0 - 10.0.0.255` and `10.0.0.5` both saved
 * cleanly and neither one said anything about the other. Someone removing what
 * they believe is their last rule for a network then finds access unchanged,
 * because a second entry they had forgotten still covers it.
 *
 * Entries of different IP versions never overlap, and an unparseable entry
 * overlaps nothing — same reasoning as coversAddress: silence is safer than
 * guessing at something nobody can interpret.
 */
export function rangesOverlap(a: string, b: string): boolean {
  const left = parseEntry(a);
  const right = parseEntry(b);
  if (!left || !right || left.version !== right.version) return false;

  const leftFrom = toComparable(left.from, left.version);
  const leftTo = toComparable(left.to, left.version);
  const rightFrom = toComparable(right.from, right.version);
  const rightTo = toComparable(right.to, right.version);

  return leftFrom <= rightTo && rightFrom <= leftTo;
}
