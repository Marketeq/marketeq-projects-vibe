// apps/offer-service/src/auth/decorators/public.decorator.ts
// OS-36: Marks endpoints that skip JWT validation.
// Only use on /health and /ready. NEVER on offer endpoints.
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * @Public() — Exempts a route from JWT validation.
 *
 * JwtAuthGuard checks for this metadata and skips auth if present.
 *
 * @example
 * @Get('health')
 * @Public()
 * health() { return { status: 'ok' }; }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);