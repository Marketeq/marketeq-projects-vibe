import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';

const normalizeKey = (value?: string) =>
  value ? value.replace(/\\n/g, '\n') : value;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    const publicKey = normalizeKey(
      configService.get<string>('AUTH_JWT_PUBLIC_KEY'),
    );

    if (!publicKey) {
      throw new Error('AUTH_JWT_PUBLIC_KEY is required for RS256 validation');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: publicKey,
      algorithms: ['RS256'],
    });
  }

  async validate(payload: any) {
    return { id: payload.sub, sub: payload.sub, email: payload.email };
  }
}
