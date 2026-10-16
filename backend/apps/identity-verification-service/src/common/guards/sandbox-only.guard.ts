import { CanActivate, ExecutionContext, Injectable, NotFoundException } from '@nestjs/common';

// Makes the routes it protects behave as if they don't exist (404) outside
// local development. This is the ONLY thing standing between a Sandbox
// diagnostic route (see identity-verification-sandbox.controller.ts) and
// staging/production traffic — there is no product-facing authorization on
// these routes, by design, so this check must never be relaxed to include
// any environment other than 'development'.
@Injectable()
export class SandboxOnlyGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    if (process.env.NODE_ENV !== 'development') {
      throw new NotFoundException();
    }
    return true;
  }
}
