import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthUser {
  sub?: string;
  id?: string;
  email?: string;
  [key: string]: any;
}

export const User = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    return ctx.switchToHttp().getRequest().user;
  },
);
