import { HttpException, HttpStatus } from '@nestjs/common';

export class PayoutError extends HttpException {
  constructor(
    message: string,
    status: HttpStatus,
    public readonly errorCode: string,
    public readonly meta?: Record<string, unknown>,
  ) {
    super(
      {
        message,
        errorCode,
        ...(meta ?? {}),
      },
      status,
    );
  }
}