import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const publicKey = (process.env.AUTH_JWT_PUBLIC_KEY || process.env.JWT_PUBLIC_KEY || '')
      .replace(/\\n/g, '\n');
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: publicKey || process.env.JWT_SECRET || 'fallback-secret',
      algorithms: [publicKey ? 'RS256' : 'HS256'],
    });
  }

  async validate(payload: any) {
    return { userId: payload.sub, role: payload.role };
  }
}
