import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthUser {
  sub?: string;
  id?: string;
  email?: string;
  [key: string]: any;
}

/**
 * Pulls the caller's identity from the request set by JwtAuthGuard — never
 * from client-supplied input. This is what makes ownership scoping on every
 * record/list/remove/clear operation enforceable rather than trust-based.
 */
export const User = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    return ctx.switchToHttp().getRequest().user;
  },
);
