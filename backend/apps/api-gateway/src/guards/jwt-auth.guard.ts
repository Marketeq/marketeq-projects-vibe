import { Injectable, UnauthorizedException } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { Injectable as Inj } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any) {
    if (err || !user) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Your session has expired. Please log in again to continue.',
      })
    }
    return user
  }
}

@Inj()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    const rawKey = config.get<string>('AUTH_JWT_PUBLIC_KEY')
    const publicKey = rawKey?.replace(/\\n/g, '\n')
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: any) => req?.cookies?.access_token ?? null,
      ]),
      ignoreExpiration: false,
      algorithms: publicKey ? ['RS256'] : ['HS256'],
      secretOrKey: publicKey || config.get<string>('JWT_SECRET'),
    })
  }

  async validate(payload: { sub: string; email: string; role?: string }) {
    return { userId: payload.sub, email: payload.email, role: payload.role }
  }
}
