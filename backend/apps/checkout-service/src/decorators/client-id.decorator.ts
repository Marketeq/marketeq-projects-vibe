import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';

export const ClientId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const clientId = context.switchToHttp().getRequest().headers['x-client-id'];
    if (typeof clientId !== 'string' || !clientId) {
      throw new BadRequestException('Missing client id');
    }
    return clientId;
  },
);
