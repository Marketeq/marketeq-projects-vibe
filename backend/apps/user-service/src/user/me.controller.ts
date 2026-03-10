import {
  Controller, Get, Req, UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { UserService } from './user.service';

/**
 * Handles GET /user/me — decodes the JWT from the Authorization header
 * and returns the full user profile (auto-creating the user if needed).
 */
@Controller('user')
export class MeController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  async me(@Req() req: Request) {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const token = auth.slice(7);
    const payload = this.decodeJwtPayload(token);
    if (!payload?.email && !payload?.sub) {
      throw new UnauthorizedException('Invalid token payload');
    }

    const email: string = payload.email;
    const sub: string | undefined = payload.sub;

    if (!email) {
      throw new UnauthorizedException('Token missing email claim');
    }

    // Find existing user or auto-create from token claims
    let user = await this.userService.findByEmail(email);
    if (!user) {
      user = await this.userService.create({
        email,
        firstName: payload.firstName ?? payload.given_name ?? null,
        lastName: payload.lastName ?? payload.family_name ?? null,
        userType: 'talent',
      });
    }

    // Return full profile with relations
    return this.userService.findById(user.id);
  }

  /** Base64-decode the JWT payload (middle segment) without crypto verification. */
  private decodeJwtPayload(token: string): Record<string, any> | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payload = Buffer.from(parts[1], 'base64url').toString('utf8');
      return JSON.parse(payload);
    } catch {
      return null;
    }
  }
}
