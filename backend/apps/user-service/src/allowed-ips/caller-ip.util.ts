import { Request } from 'express';

/**
 * The caller's own address, as this service can see it.
 *
 * The gateway appends its view of the client to `x-forwarded-for` before
 * proxying, so the chain reaches this service oldest-to-newest and the original
 * caller is the **leftmost** entry. Reading the last one instead would give the
 * gateway's address, which every request shares — a lockout guard built on that
 * would either pass for everyone or fail for everyone.
 *
 * Returns null when nothing can be determined. The guards treat null as "cannot
 * confirm you are covered", which is the safe direction: it refuses the action
 * rather than allowing one that might lock the caller out.
 */
export function resolveCallerIp(req: Request): string | null {
  const forwarded = req.headers['x-forwarded-for'];
  const chain = Array.isArray(forwarded) ? forwarded.join(',') : forwarded;

  const candidate =
    chain?.split(',')[0]?.trim() || req.ip || req.socket?.remoteAddress || '';

  const trimmed = candidate.trim();
  if (!trimmed) return null;

  // Node reports IPv4 clients on a dual-stack socket as ::ffff:127.0.0.1,
  // which would never match an IPv4 entry someone typed in.
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(trimmed);
  return mapped ? mapped[1] : trimmed;
}
