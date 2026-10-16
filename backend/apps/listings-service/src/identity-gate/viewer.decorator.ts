import { applyDecorators, createParamDecorator, ExecutionContext, Header } from '@nestjs/common';
import { verifyAccessToken } from '../guards/jwt-auth.guard';

/**
 * Who is looking, taken ONLY from the verified bearer token. Routes that are
 * public for everyone (service details, listings) use this instead of
 * JwtAuthGuard: a missing, malformed or invalid token simply means "anonymous
 * viewer" (null) - never an error and never an elevated viewer.
 *
 * It reads nothing from the query string, the body, or any other header, so a
 * caller cannot name themselves (or the listing's owner) to see the full roster.
 */
export function viewerIdFromRequest(request: { headers?: Record<string, unknown> }): string | null {
  const header = request.headers?.authorization;
  if (typeof header !== 'string') return null;
  const [scheme, token] = header.trim().split(/\s+/);
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  try {
    const payload = verifyAccessToken(token);
    const id = payload.id ?? payload.sub ?? payload.userId;
    return typeof id === 'string' && id.length > 0 ? id : null;
  } catch {
    return null;
  }
}

export const ViewerId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string | null =>
  viewerIdFromRequest(ctx.switchToHttp().getRequest()),
);

/**
 * Whether two account ids are the same account. Ids are UUIDs, which are case-insensitive, and a
 * stored owner id can differ from the token's subject only in case or stray whitespace; an
 * owner must not be demoted to a stranger for that. Both sides must be non-empty.
 */
export function isSameAccount(a: unknown, b: unknown): boolean {
  if (a == null || b == null) return false;
  const x = String(a).trim().toLowerCase();
  const y = String(b).trim().toLowerCase();
  return x.length > 0 && x === y;
}

/**
 * Marks a route whose body depends on WHO is asking (the owner sees the full roster, everyone
 * else the filtered one). `Vary` tells any cache in front of the service - and the gateway passes
 * the header on - to keep the anonymous response and each signed-in response apart, so a public
 * response is never served as an owner's, or the other way round.
 */
export const ViewerDependent = () => applyDecorators(Header('Vary', 'Authorization, Cookie'));
