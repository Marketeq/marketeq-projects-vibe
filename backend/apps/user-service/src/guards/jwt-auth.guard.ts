import {
  Injectable,
  CanActivate,
  ExecutionContext,
  OnModuleInit,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate, OnModuleInit {
  private readonly logger = new Logger(JwtAuthGuard.name);
  private publicKey!: string;

  constructor(private reflector: Reflector) {}

  onModuleInit(): void {
    const publicKey = process.env.AUTH_JWT_PUBLIC_KEY;
    if (!publicKey) {
      // Fatal — we refuse to start with a weak (HS256) fallback because the
      // auth-service now issues RS256 tokens. Missing key = misconfigured
      // deployment; fail loudly instead of silently trusting every request.
      this.logger.fatal(
        'AUTH_JWT_PUBLIC_KEY is not set. Refusing to start user-service with no public key (HS256 fallback removed).',
      );
      throw new Error('AUTH_JWT_PUBLIC_KEY is required');
    }
    this.publicKey = publicKey;
  }

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers['authorization'];
    if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or malformed Authorization header');
    }

    const token = authHeader.slice('Bearer '.length).trim();
    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    try {
      const payload = jwt.verify(token, this.publicKey, {
        algorithms: ['RS256'],
      });
      req.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
