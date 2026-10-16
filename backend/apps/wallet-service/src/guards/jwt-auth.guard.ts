import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as jwt from 'jsonwebtoken'

const normalizeKey = (value?: string) => (value ? value.replace(/\\n/g, '\n') : value)

/**
 * Verifies the access token the gateway forwards, and puts the caller's own
 * user id on the request.
 *
 * wallet-service previously had no guard of any kind: every endpoint took the
 * user id from the request body or the URL, so any logged-in user could read
 * or spend another user's wallet. The gateway only proves that the caller is
 * *somebody*; proving *who* has to happen here.
 *
 * Same pattern as checkout-service's local guard (RS256 with
 * AUTH_JWT_PUBLIC_KEY, falling back to JWT_SECRET) rather than `@libs/auth`,
 * which is the convention in all but two services and avoids the build-path
 * problem that cross-service import has.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest()
    const authHeader = req.headers.authorization as string | undefined

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing auth token')
    }

    const publicKey = normalizeKey(this.config.get<string>('AUTH_JWT_PUBLIC_KEY'))
    const secret = this.config.get<string>('JWT_SECRET')

    try {
      const token = authHeader.slice(7)
      const payload = publicKey
        ? (jwt.verify(token, publicKey, { algorithms: ['RS256'] }) as any)
        : secret
          ? (jwt.verify(token, secret) as any)
          : (() => {
              throw new UnauthorizedException('JWT verifier is not configured')
            })()

      req.user = { userId: payload.sub, sub: payload.sub, email: payload.email }
      return true
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err
      throw new UnauthorizedException('Invalid or expired token')
    }
  }
}
