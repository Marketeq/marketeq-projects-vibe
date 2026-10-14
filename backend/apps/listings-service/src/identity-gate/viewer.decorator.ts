import { createParamDecorator, ExecutionContext } from '@nestjs/common';
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
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
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
