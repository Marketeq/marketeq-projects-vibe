import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET || process.env.JWT_PUBLIC_KEY,
      algorithms: [process.env.JWT_PUBLIC_KEY ? 'RS256' : 'HS256'],
    });
  }

  async validate(payload: any) {
    return { userId: payload.sub, role: payload.role };
  }
}
