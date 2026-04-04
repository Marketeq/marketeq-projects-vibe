// Custom @Auth() decorator that applies the JwtAuthGuard to protect routes.
// Used to simplify route protection syntax in controllers.

import { applyDecorators, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

// Returns a decorator that applies the JwtAuthGuard to any route or controller
export function Auth() {
  return applyDecorators(UseGuards(JwtAuthGuard));
}
